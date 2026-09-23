import { useEffect, useId, useRef, useState } from 'react';
import { createZip } from '../engine/archive/zip';
import type { ExtractedEntry, ListedEntry, OpenArchive } from '../engine/archive/extract';
import { downloadBlob } from '../lib/download';
import type { PickedFile } from '../lib/files';
import { formatBytes } from '../lib/format';
import { DownloadIcon, LockIcon, XIcon } from './icons';

interface Props {
  file: File | null;
  onClose: () => void;
  onCompress: (files: PickedFile[]) => void;
  compressLabel?: string;
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'password'; wrong: boolean }
  | { kind: 'list'; entries: ListedEntry[] }
  | { kind: 'extracting'; entries: ListedEntry[] }
  | { kind: 'extracted'; files: ExtractedEntry[] }
  | { kind: 'error'; message: string };

/** Stable identity for a file, used as the panel's `key`. */
export const archiveKey = (f: File | null) =>
  f ? `${f.name}:${f.size}:${f.lastModified}` : 'closed';

export default function ArchivePanel({
  file,
  onClose,
  onCompress,
  compressLabel = 'Compress these files',
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const archive = useRef<OpenArchive | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [password, setPassword] = useState('');
  const [zipping, setZipping] = useState(false);
  const pwId = useId();

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (file && !d.open) d.showModal();
    else if (!file && d.open) d.close();
    if (!file) return;

    // The parent remounts this panel (via `key`) for each archive, so state starts fresh.
    let cancelled = false;
    void (async () => {
      try {
        const { OpenArchive } = await import('../engine/archive/extract');
        const a = await OpenArchive.open(file);
        if (cancelled) return void a.close();
        archive.current = a;
        if (await a.isEncrypted()) return setPhase({ kind: 'password', wrong: false });
        setPhase({ kind: 'list', entries: await a.list() });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setPhase({
            kind: 'error',
            message:
              'This archive could not be opened. It may be damaged or use an unsupported format.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      void archive.current?.close();
      archive.current = null;
    };
  }, [file]);

  const extract = async (entries: ListedEntry[]) => {
    const a = archive.current;
    if (!a) return;
    setPhase({ kind: 'extracting', entries });
    try {
      setPhase({ kind: 'extracted', files: await a.extractAll() });
    } catch (err) {
      const { ArchivePasswordError } = await import('../engine/archive/extract');
      if (err instanceof ArchivePasswordError) setPhase({ kind: 'password', wrong: true });
      else
        setPhase({
          kind: 'error',
          message: 'Some files could not be extracted. The archive may be damaged.',
        });
    }
  };

  const submitPassword = async () => {
    if (!file || !password) return;
    try {
      // A failed extraction ends libarchive's worker, so each attempt starts from a fresh reader.
      await archive.current?.close();
      const { OpenArchive } = await import('../engine/archive/extract');
      const a = await OpenArchive.open(file);
      archive.current = a;
      await a.usePassword(password);
      setPhase({ kind: 'list', entries: await a.list() });
    } catch {
      setPhase({ kind: 'password', wrong: true });
    }
  };

  const zipAll = async (files: ExtractedEntry[]) => {
    setZipping(true);
    try {
      const zip = await createZip(
        files.map((f) => ({ name: f.path, blob: f.file, lastModified: f.file.lastModified })),
      );
      const base = file!.name.replace(/\.[^.]+$/, '');
      downloadBlob(zip, `${base}.zip`);
    } finally {
      setZipping(false);
    }
  };

  const total =
    phase.kind === 'list' || phase.kind === 'extracting'
      ? phase.entries.reduce((n, e) => n + e.size, 0)
      : 0;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="archive-title"
      className="m-auto w-[min(720px,calc(100vw-1rem))] max-w-none rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/70 dark:bg-slate-900 dark:text-slate-100"
    >
      {file && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            <div className="min-w-0">
              <h2 id="archive-title" className="truncate font-semibold">
                {file.name}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {formatBytes(file.size)} archive
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <XIcon />
            </button>
          </div>

          <div className="overflow-y-auto px-5 py-4" aria-live="polite">
            {phase.kind === 'loading' && <p className="text-sm text-slate-600">Opening archive…</p>}
            {phase.kind === 'error' && (
              <p className="text-sm text-red-700 dark:text-red-400" role="alert">
                {phase.message}
              </p>
            )}
            {phase.kind === 'password' && (
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitPassword();
                }}
              >
                <p className="flex items-center gap-2 font-medium">
                  <LockIcon className="h-4 w-4" /> Password required
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  This archive is encrypted. The password stays on your device and is only used to
                  open it.
                </p>
                <label htmlFor={pwId} className="text-sm font-medium">
                  Password
                </label>
                <input
                  id={pwId}
                  type="password"
                  autoComplete="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
                />
                {phase.wrong && (
                  <p className="text-sm text-red-700 dark:text-red-400" role="alert">
                    That password didn’t work. Please try again.
                  </p>
                )}
                <button
                  type="submit"
                  className="self-start rounded-full bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800"
                >
                  Unlock
                </button>
              </form>
            )}
            {(phase.kind === 'list' || phase.kind === 'extracting') && (
              <>
                <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
                  {phase.entries.length} file{phase.entries.length === 1 ? '' : 's'} ·{' '}
                  {formatBytes(total)} unpacked
                </p>
                <ul className="mb-4 max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
                  {phase.entries.map((e) => (
                    <li key={e.path} className="flex justify-between gap-3 px-3 py-1.5">
                      <span className="truncate">{e.path}</span>
                      <span className="shrink-0 text-slate-500">{formatBytes(e.size)}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={phase.kind === 'extracting'}
                  onClick={() => void extract(phase.entries)}
                  className="rounded-full bg-sky-700 px-5 py-2.5 font-medium text-white hover:bg-sky-800 disabled:opacity-70"
                >
                  {phase.kind === 'extracting' ? 'Extracting…' : 'Extract all'}
                </button>
              </>
            )}
            {phase.kind === 'extracted' && (
              <>
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onCompress(phase.files.map((f) => ({ file: f.file, path: f.path })));
                      onClose();
                    }}
                    className="rounded-full bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800"
                  >
                    {compressLabel}
                  </button>
                  <button
                    type="button"
                    disabled={zipping}
                    onClick={() => void zipAll(phase.files)}
                    className="rounded-full border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-800"
                  >
                    {zipping ? 'Zipping…' : 'Download all as ZIP'}
                  </button>
                </div>
                <ul
                  className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800"
                  data-testid="extracted-list"
                >
                  {phase.files.map((f) => (
                    <li
                      key={f.path}
                      className="flex items-center justify-between gap-3 px-3 py-1.5"
                    >
                      <span className="truncate">{f.path}</span>
                      <span className="flex shrink-0 items-center gap-2 text-slate-500">
                        {formatBytes(f.file.size)}
                        <button
                          type="button"
                          onClick={() => downloadBlob(f.file, f.file.name)}
                          aria-label={`Download ${f.path}`}
                          className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <DownloadIcon className="h-4 w-4" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
