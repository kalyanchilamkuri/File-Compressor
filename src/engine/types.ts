export type EngineId = 'image' | 'pdf' | 'video' | 'audio' | 'archive';

export type DetectedType =
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'avif'
  | 'heic'
  | 'gif'
  | 'bmp'
  | 'pdf'
  | 'mp4'
  | 'mov'
  | 'webm'
  | 'mkv'
  | 'mp3'
  | 'wav'
  | 'ogg'
  | 'm4a'
  | 'flac'
  | 'aac'
  | 'zip'
  | 'rar'
  | '7z'
  | 'tar'
  | 'gzip';

export type ImageFormat = 'keep' | 'jpeg' | 'png' | 'webp' | 'avif';
export type VideoFormat = 'keep' | 'mp4' | 'webm';
export type AudioFormat = 'keep' | 'aac' | 'opus' | 'mp3';
export type OutputFormat = ImageFormat | VideoFormat | AudioFormat;

export type PdfMode = 'smart' | 'scanned';
export type PdfLevel = 'light' | 'balanced' | 'strong';
export type VideoResolution = 'original' | 1080 | 720 | 480 | 360;

export interface CompressOptions {
  mode: 'quality' | 'targetSize';
  /** 0–100. Higher is better quality, bigger file. */
  quality?: number;
  targetBytes?: number;
  imageFormat?: ImageFormat;
  videoFormat?: VideoFormat;
  audioFormat?: AudioFormat;
  maxWidth?: number;
  maxHeight?: number;
  stripMetadata: boolean;
  /** Reduce PNGs to a 256-colour palette (lossy, much smaller). */
  pngPalette?: boolean;
  pdfMode?: PdfMode;
  pdfLevel?: PdfLevel;
  videoResolution?: VideoResolution;
  maxFrameRate?: number;
  removeAudio?: boolean;
  trimStart?: number;
  trimEnd?: number;
  audioBitrate?: number;
}

export interface CompressResult {
  blob: Blob;
  fileName: string;
  originalBytes: number;
  outputBytes: number;
  warnings: string[];
  /** Set when the output would have been bigger than the input and the original was kept. */
  keptOriginal?: boolean;
}

/** Shared by the tools that build one PDF out of several inputs (merge, images → PDF). */
export interface PdfBuildResult {
  blob: Blob;
  fileName: string;
  pageCount: number;
  /** Total bytes of all inputs. Deliberately not `originalBytes`: there is no single original. */
  inputBytes: number;
  outputBytes: number;
  warnings: string[];
}

export interface MergeOptions {
  stripMetadata: boolean;
  /** Document title written into the merged PDF. */
  title?: string;
}

export type MergeResult = PdfBuildResult;

export interface ImagesToPdfOptions {
  stripMetadata: boolean;
  title?: string;
  /** "fit" gives every page the image's own aspect ratio. */
  pageSize: 'fit' | 'a4' | 'letter';
  /** Page margin in points, ignored when pageSize is "fit". */
  margin: number;
  /** Quality (5-95) for images that have to be re-encoded as JPEG. */
  quality: number;
}

export type ImagesToPdfResult = PdfBuildResult;

export interface PdfToImagesOptions {
  format: 'jpeg' | 'png';
  dpi: number;
  quality: number;
}

export interface PdfPageImage {
  fileName: string;
  blob: Blob;
}

export interface PdfToImagesResult {
  pages: PdfPageImage[];
  inputBytes: number;
  outputBytes: number;
  warnings: string[];
}

export type ProgressFn = (fraction: number) => void;

export class UserFacingError extends Error {
  override name = 'UserFacingError';
}

/**
 * Checks the name rather than using `instanceof`. Engines are lazily imported into their own
 * chunks, and a chunk can end up with its own copy of the class, which makes `instanceof` quietly
 * false and turns a clear message like "this PDF is locked" into "something went wrong".
 */
export const isUserFacing = (err: unknown): err is Error =>
  err instanceof Error && err.name === 'UserFacingError';
