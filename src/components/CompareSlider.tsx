import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
} from 'react';
import { formatBytes } from '../lib/format';
import { useObjectUrl } from './useObjectUrl';
import { XIcon, ZoomInIcon, ZoomOutIcon } from './icons';
import type { Item } from './useCompressor';

interface Props {
  item: Item | null;
  onClose: () => void;
}

async function pdfFirstPage(blob: Blob): Promise<Blob> {
  const { pdfPreview } = await import('../engine/pdf/preview');
  return (await pdfPreview(blob, 110)).png;
}

/** Browsers other than Safari can't show HEIC, so convert the "before" image for display only. */
async function displayable(item: Item, blob: Blob, isOriginal: boolean): Promise<Blob> {
  if (item.engine === 'pdf') return pdfFirstPage(blob);
  if (isOriginal && item.type === 'heic') {
    try {
      await createImageBitmap(blob);
      return blob;
    } catch {
      const { heicTo } = await import('heic-to/csp');
      return heicTo({ blob, type: 'image/jpeg', quality: 0.92 });
    }
  }
  return blob;
}

interface Preview {
  item: Item;
  urls: { before: string; after: string } | null;
  failed: boolean;
}

function useUrls(item: Item | null) {
  const [preview, setPreview] = useState<Preview | null>(null);
  useEffect(() => {
    if (!item?.result || (item.engine !== 'image' && item.engine !== 'pdf')) return;
    let cancelled = false;
    let made: string[] = [];
    void Promise.all([
      displayable(item, item.file, true),
      displayable(item, item.result.blob, false),
    ])
      .then(([b, a]) => {
        if (cancelled) return;
        made = [URL.createObjectURL(b), URL.createObjectURL(a)];
        setPreview({ item, urls: { before: made[0]!, after: made[1]! }, failed: false });
      })
      .catch(() => !cancelled && setPreview({ item, urls: null, failed: true }));
    return () => {
      cancelled = true;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [item]);
  // A preview made for a previously opened file is ignored while the new one loads.
  const current = preview?.item === item ? preview : null;
  return { urls: current?.urls ?? null, failed: current?.failed ?? false };
}

function MediaPreview({ item }: { item: Item }) {
  const url = useObjectUrl(item.result!.blob);
  if (!url) return null;
  return item.engine === 'video' ? (
    // eslint-disable-next-line jsx-a11y/media-has-caption -- user's own file; no captions exist.
    <video src={url} controls className="max-h-[70vh] w-full rounded-lg bg-black" />
  ) : (
    // eslint-disable-next-line jsx-a11y/media-has-caption -- user's own file; no captions exist.
    <audio src={url} controls className="w-full" />
  );
}

export default function CompareSlider({ item, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ kind: 'split' | 'pan' | 'pinch'; dist?: number; zoom?: number } | null>(
    null,
  );
  const { urls, failed } = useUrls(item);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (item && !d.open) d.showModal();
    else if (!item && d.open) d.close();
  }, [item]);

  const handleClose = () => {
    setSplit(50);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    onClose();
  };

  const clampZoom = (z: number) => Math.min(8, Math.max(1, z));
  const applyZoom = useCallback((z: number) => {
    const next = clampZoom(z);
    setZoom(next);
    if (next === 1) setPan({ x: 0, y: 0 });
  }, []);

  const splitFromEvent = (clientX: number) => {
    const rect = stage.current!.getBoundingClientRect();
    setSplit(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: 'pinch', dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), zoom };
      return;
    }
    const onHandle = (e.target as HTMLElement).closest('[data-handle]');
    gesture.current = { kind: onHandle || zoom === 1 ? 'split' : 'pan' };
    if (gesture.current.kind === 'split') splitFromEvent(e.clientX);
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (g.kind === 'pinch' && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      applyZoom(g.zoom! * (Math.hypot(a!.x - b!.x, a!.y - b!.y) / g.dist!));
    } else if (g.kind === 'split') {
      splitFromEvent(e.clientX);
    } else if (g.kind === 'pan') {
      setPan((p) => ({ x: p.x + (e.clientX - prev.x), y: p.y + (e.clientY - prev.y) }));
    }
  };

  const onPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
  };

  const r = item?.result;
  const media = item && (item.engine === 'video' || item.engine === 'audio');
  const layer = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: 'center center',
  };

  return (
    <dialog
      ref={dialog}
      onClose={handleClose}
      aria-labelledby="compare-title"
      className="m-auto w-[min(1100px,calc(100vw-1rem))] max-w-none rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/70 dark:bg-slate-900 dark:text-slate-100"
    >
      {item && r && (
        <div className="flex max-h-[calc(100dvh-1rem)] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div className="min-w-0">
              <h2 id="compare-title" className="truncate font-semibold">
                {item.file.name}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Before {formatBytes(r.originalBytes)} · After {formatBytes(r.outputBytes)}
                {item.engine === 'pdf' && ' · first page'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {!media && (
                <>
                  <button
                    type="button"
                    onClick={() => applyZoom(zoom / 1.5)}
                    aria-label="Zoom out"
                    className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ZoomOutIcon />
                  </button>
                  <span className="w-12 text-center text-sm tabular-nums">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => applyZoom(zoom * 1.5)}
                    aria-label="Zoom in"
                    className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ZoomInIcon />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                aria-label="Close"
                className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XIcon />
              </button>
            </div>
          </div>

          {media ? (
            <div className="p-4">
              <MediaPreview item={item} />
            </div>
          ) : (
            <div
              ref={stage}
              className="relative h-[70dvh] touch-none overflow-hidden bg-[repeating-conic-gradient(#e2e8f0_0_25%,#fff_0_50%)] bg-[length:20px_20px] select-none dark:bg-[repeating-conic-gradient(#1e293b_0_25%,#0f172a_0_50%)]"
              style={{ cursor: zoom > 1 ? 'grab' : 'ew-resize' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={(e) => applyZoom(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))}
              data-testid="compare-stage"
            >
              {!urls && (
                <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                  {failed ? 'Preview isn’t available for this file.' : 'Loading preview…'}
                </p>
              )}
              {urls && (
                <>
                  <div className="absolute inset-0" style={layer}>
                    <img
                      src={urls.before}
                      alt="Original"
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  </div>
                  <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
                    <div className="absolute inset-0" style={layer}>
                      <img
                        src={urls.after}
                        alt="Compressed"
                        className="h-full w-full object-contain"
                        draggable={false}
                      />
                    </div>
                  </div>
                  <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-slate-900/75 px-2.5 py-1 text-xs font-medium text-white">
                    Before
                  </span>
                  <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-slate-900/75 px-2.5 py-1 text-xs font-medium text-white">
                    After
                  </span>
                  <div
                    data-handle
                    role="slider"
                    tabIndex={0}
                    aria-label="Before and after divider"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(split)}
                    onKeyDown={(e) => {
                      const step = e.shiftKey ? 10 : 2;
                      if (e.key === 'ArrowLeft') setSplit((s) => Math.max(0, s - step));
                      else if (e.key === 'ArrowRight') setSplit((s) => Math.min(100, s + step));
                      else return;
                      e.preventDefault();
                    }}
                    className="absolute top-0 bottom-0 w-10 -translate-x-1/2 cursor-ew-resize focus-visible:outline-none [&:focus-visible>span]:ring-4 [&:focus-visible>span]:ring-sky-400"
                    style={{ left: `${split}%` }}
                  >
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]" />
                    <span className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg">
                      ⇆
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
          {!media && (
            <p className="px-4 py-2 text-xs text-slate-500">
              Drag the divider to compare. Scroll or pinch to zoom; drag to move around when zoomed.
            </p>
          )}
        </div>
      )}
    </dialog>
  );
}
