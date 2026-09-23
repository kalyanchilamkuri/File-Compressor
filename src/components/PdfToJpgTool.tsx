import { useCallback, useId, useRef, useState } from 'react';
import { createZip } from '../engine/archive/zip';
import { pdfToImagesInWorker } from '../engine/pool';
import { sniffFile } from '../engine/router';
import type { PdfPageImage, PdfToImagesOptions } from '../engine/types';
import { isUserFacing } from '../engine/types';
import { downloadBlob } from '../lib/download';
import type { PickedFile } from '../lib/files';
import { formatBytes } from '../lib/format';
import DropZone from './DropZone';
import { AlertIcon, DownloadIcon, XIcon } from './icons';
import { useObjectUrl } from './useObjectUrl';
import { usePdfThumb } from './usePdfThumb';

const FORMATS: readonly { id: PdfToImagesOptions['format']; label: string }[] = [
  { id: 'jpeg', label: 'JPG' },
  { id: 'png', label: 'PNG' },
];

const QUALITIES: readonly { dpi: number; label: string; hint: string }[] = [
  { dpi: 100, label: 'Screen', hint: '100 DPI — smallest files' },
  { dpi: 150, label: 'Good', hint: '150 DPI — reading and sharing' },
  { dpi: 300, label: 'Print', hint: '300 DPI — large files' },
];

function PageCard({ page }: { page: PdfPageImage }) {
  const url = useObjectUrl(page.blob);
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-800">
      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
        {url && <img src={url} alt="" className="h-full w-full bg-white object-contain" />}
      </div>
      <button
        type="button"
        onClick={() => downloadBlob(page.blob, page.fileName)}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        {formatBytes(page.blob.size)}
      </button>
    </li>
  );
}

export default function PdfToJpgTool() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<PdfToImagesOptions['format']>('jpeg');
  const [dpi, setDpi] = useState(150);
  const [pages, setPages] = useState<PdfPageImage[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const formatLabelId = useId();
  const dpiLabelId = useId();
  const { thumb, pageCount } = usePdfThumb(file);
  const thumbUrl = useObjectUrl(thumb);

  const add = useCallback(async (picked: PickedFile[]) => {
    const first = picked[0];
    if (!first) return;
    const type = await sniffFile(first.file).catch(() => null);
    setPages(null);
    setWarnings([]);
    if (type !== 'pdf') {
      setError('That isn’t a PDF. Drop a PDF to turn its pages into images.');
      return;
    }
    setError(null);
    setFile(first.file);
  }, []);

  const convert = async () => {
    if (!file) return;
    abort.current = new AbortController();
    const signal = abort.current.signal;
    setError(null);
    setPages(null);
    setBusy('Rendering… 0%');
    let finished = false;
    try {
      const result = await pdfToImagesInWorker(
        file,
        { format, dpi, quality: 85 },
        // A trailing progress message can arrive after the result resolves, which would put
        // the button back into its busy state for good.
        (p) => !finished && setBusy(`Rendering… ${Math.round(p * 100)}%`),
        signal,
      );
      setPages(result.pages);
      setWarnings(result.warnings);
    } catch (err) {
      if (signal.aborted) return;
      setError(
        isUserFacing(err)
          ? err.message
          : 'Something went wrong while rendering this PDF. You can try again.',
      );
      if (!isUserFacing(err)) console.error(err);
    } finally {
      finished = true;
      setBusy(null);
    }
  };

  const downloadAll = async () => {
    if (!pages?.length) return;
    if (pages.length === 1) return downloadBlob(pages[0]!.blob, pages[0]!.fileName);
    abort.current = new AbortController();
    setBusy('Zipping… 0%');
    try {
      const zip = await createZip(
        pages.map((p) => ({ name: p.fileName, blob: p.blob })),
        (p) => setBusy(`Zipping… ${Math.round(p * 100)}%`),
        abort.current.signal,
      );
      downloadBlob(zip, `${file?.name.replace(/\.pdf$/i, '') ?? 'pages'}-pages.zip`);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const outputBytes = pages?.reduce((n, p) => n + p.blob.size, 0) ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <DropZone
        onFiles={(f) => void add(f)}
        accept="application/pdf,.pdf"
        compact={!!file}
        hint="One PDF. Every page becomes its own image."
      />

      {error && (
        <p
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {file && (
        <section
          className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
          aria-label="PDF to convert"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {thumbUrl ? (
                <img src={thumbUrl} alt="" className="h-full w-full bg-white object-contain" />
              ) : (
                <span className="text-xs font-bold">PDF</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {pageCount ? `${pageCount} page${pageCount === 1 ? '' : 's'} · ` : ''}
                {formatBytes(file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPages(null);
              }}
              aria-label={`Remove ${file.name}`}
              className="rounded-full p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p
                  id={formatLabelId}
                  className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Image format
                </p>
                <div role="radiogroup" aria-labelledby={formatLabelId} className="flex gap-2">
                  {FORMATS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      role="radio"
                      aria-checked={format === f.id}
                      tabIndex={format === f.id ? 0 : -1}
                      onClick={() => setFormat(f.id)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                        format === f.id
                          ? 'border-sky-700 bg-sky-700 text-white dark:border-sky-500 dark:bg-sky-500 dark:text-slate-950'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p
                  id={dpiLabelId}
                  className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Resolution
                </p>
                <div role="radiogroup" aria-labelledby={dpiLabelId} className="flex gap-2">
                  {QUALITIES.map((q) => (
                    <button
                      key={q.dpi}
                      type="button"
                      role="radio"
                      aria-checked={dpi === q.dpi}
                      tabIndex={dpi === q.dpi ? 0 : -1}
                      title={q.hint}
                      onClick={() => setDpi(q.dpi)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                        dpi === q.dpi
                          ? 'border-sky-700 bg-sky-700 text-white dark:border-sky-500 dark:bg-sky-500 dark:text-slate-950'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                      }`}
                    >
                      {q.label}
                      <span className="sr-only">{`, ${q.hint}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {busy && (
                <button
                  type="button"
                  onClick={() => abort.current?.abort()}
                  className="text-sm font-medium hover:underline"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void convert()}
                className="rounded-full bg-sky-700 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-sky-800 disabled:opacity-50"
                aria-live="polite"
              >
                {busy ?? 'Convert to images'}
              </button>
            </div>
          </div>
        </section>
      )}

      {pages && pages.length > 0 && (
        <section
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40"
          aria-label="Converted pages"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              {pages.length} image{pages.length === 1 ? '' : 's'} · {formatBytes(outputBytes)}
            </p>
            <button
              type="button"
              onClick={() => void downloadAll()}
              disabled={!!busy}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-70"
            >
              <DownloadIcon className="h-4 w-4" />
              {pages.length === 1 ? 'Download' : `Download all (${pages.length}) as ZIP`}
            </button>
          </div>
          {warnings.map((w) => (
            <p key={w} className="mb-2 text-sm text-amber-700 dark:text-amber-400">
              {w}
            </p>
          ))}
          <ul
            className="grid max-h-[32rem] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4"
            data-testid="page-list"
          >
            {pages.map((p) => (
              <PageCard key={p.fileName} page={p} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
