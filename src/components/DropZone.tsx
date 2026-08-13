import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import {
  filesFromClipboard,
  filesFromDataTransfer,
  filesFromInput,
  type PickedFile,
} from '../lib/files';
import { FolderIcon, UploadIcon } from './icons';

interface Props {
  onFiles: (files: PickedFile[]) => void;
  accept?: string;
  compact?: boolean;
  hint?: string;
}

export default function DropZone({ onFiles, accept, compact = false, hint }: Props) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const hintId = useId();

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      const files = filesFromClipboard(e.clipboardData);
      if (files.length) {
        e.preventDefault();
        onFiles(files);
      }
    };
    // Files dropped outside the zone would otherwise open in the tab and leave the app.
    const stopNavigate = (e: globalThis.DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    window.addEventListener('paste', onPaste);
    window.addEventListener('dragover', stopNavigate);
    window.addEventListener('drop', stopNavigate);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('dragover', stopNavigate);
      window.removeEventListener('drop', stopNavigate);
    };
  }, [onFiles]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    // Must be called synchronously: the DataTransfer is emptied once the handler returns.
    void filesFromDataTransfer(e.dataTransfer).then(onFiles);
  };

  return (
    <div
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        depth.current++;
        setDragging(true);
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDragging(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={onDrop}
      data-testid="dropzone"
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition ${
        compact ? 'gap-2 px-4 py-6' : 'gap-4 px-6 py-12 sm:py-16'
      } ${
        dragging
          ? 'border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-950/40'
          : 'border-slate-300 bg-slate-50/60 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600'
      }`}
    >
      {!compact && (
        <div className="rounded-full bg-sky-100 p-4 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
          <UploadIcon className="h-8 w-8" />
        </div>
      )}
      <div>
        <p className={`font-semibold ${compact ? 'text-base' : 'text-xl'}`}>
          {dragging ? 'Drop to add' : 'Drop files or folders here'}
        </p>
        <p id={hintId} className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {hint ?? 'Images, PDFs, videos, audio and archives. Or paste with Ctrl+V.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          aria-describedby={hintId}
          className="rounded-full bg-sky-700 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          Choose files
        </button>
        <button
          type="button"
          onClick={() => folderInput.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <FolderIcon className="h-4 w-4" />
          Folder
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="file-input"
        onChange={(e) => {
          onFiles(filesFromInput(e.currentTarget.files));
          e.currentTarget.value = '';
        }}
      />
      <input
        ref={folderInput}
        type="file"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        {...{ webkitdirectory: '' }}
        onChange={(e) => {
          onFiles(filesFromInput(e.currentTarget.files));
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
}
