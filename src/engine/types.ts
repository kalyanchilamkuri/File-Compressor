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

export type ProgressFn = (fraction: number) => void;

export class UserFacingError extends Error {
  override name = 'UserFacingError';
}
