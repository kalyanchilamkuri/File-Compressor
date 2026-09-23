import {
  ALL_FORMATS,
  BlobSource,
  Conversion,
  Input,
  Mp3OutputFormat,
  Mp4OutputFormat,
  OggOutputFormat,
  Output,
  Quality,
  canEncodeAudio,
  type AudioCodec,
  type OutputFormat,
} from 'mediabunny';
import { compressedName } from '../../lib/format';
import { planAudioBitrate } from '../targetSize';
import type { AudioFormat, CompressOptions, DetectedType, ProgressFn } from '../types';
import { UserFacingError } from '../types';
import { createSink, ensureAudioEncoders } from './common';
import type { MediaCompressResult } from './video';

type Target = Exclude<AudioFormat, 'keep'>;

const OUTPUT: Record<
  Target,
  { codec: AudioCodec; ext: string; mime: string; make: () => OutputFormat }
> = {
  aac: {
    codec: 'aac',
    ext: 'm4a',
    mime: 'audio/mp4',
    make: () => new Mp4OutputFormat({ fastStart: false }),
  },
  opus: { codec: 'opus', ext: 'ogg', mime: 'audio/ogg', make: () => new OggOutputFormat() },
  mp3: { codec: 'mp3', ext: 'mp3', mime: 'audio/mpeg', make: () => new Mp3OutputFormat() },
};

/** "Keep" means keep the kind of file people expect; lossless sources become AAC. */
export function resolveAudioTarget(type: DetectedType, requested?: AudioFormat): Target {
  if (requested && requested !== 'keep') return requested;
  if (type === 'mp3') return 'mp3';
  if (type === 'ogg' || type === 'webm') return 'opus';
  return 'aac';
}

export async function compressAudio(
  file: File,
  type: DetectedType,
  opts: CompressOptions,
  onProgress: ProgressFn,
): Promise<MediaCompressResult> {
  await ensureAudioEncoders();
  const warnings: string[] = [];
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  if (!(await input.canRead())) {
    throw new UserFacingError('This audio file could not be read. It may be damaged.');
  }
  const track = await input.getPrimaryAudioTrack();
  if (!track) throw new UserFacingError('This file has no audio in it.');
  if (!(await track.canDecode())) {
    throw new UserFacingError('This browser can’t read the audio format inside this file.');
  }

  let target = resolveAudioTarget(type, opts.audioFormat);
  if (!(await canEncodeAudio(OUTPUT[target].codec))) {
    warnings.push(
      `This browser can’t create ${target.toUpperCase()} audio, so AAC (.m4a) was used.`,
    );
    target = 'aac';
  }
  const out = OUTPUT[target];

  const duration = await input.computeDuration();
  const clip = Math.max(0, (opts.trimEnd || duration) - (opts.trimStart || 0)) || duration;
  const bitrate =
    opts.mode === 'targetSize' && opts.targetBytes
      ? planAudioBitrate(opts.targetBytes, clip)
      : (opts.audioBitrate ?? 128_000);
  const channels = await track.getNumberOfChannels();

  const sink = await createSink();
  const output = new Output({ format: out.make(), target: sink.target });
  const conversion = await Conversion.init({
    input,
    output,
    tracks: 'primary',
    showWarnings: false,
    video: { discard: true },
    audio: {
      codec: out.codec,
      quality: new Quality({ bitrate }),
      // Very low bitrates sound better in mono.
      numberOfChannels: bitrate < 48_000 && channels > 1 ? 1 : undefined,
      forceTranscode: true,
    },
    trim:
      opts.trimStart || opts.trimEnd
        ? { start: opts.trimStart || undefined, end: opts.trimEnd || undefined }
        : undefined,
    tags: opts.stripMetadata ? {} : undefined,
  });
  if (!conversion.isValid) {
    throw new UserFacingError('This audio can’t be converted in this browser.');
  }
  conversion.onProgress = (p) => onProgress(p);
  await conversion.execute();
  input.dispose?.();
  const blob = await sink.result(out.mime);

  const sameKind = resolveAudioTarget(type, 'keep') === target && type !== 'wav' && type !== 'flac';
  if (blob.size >= file.size && sameKind && !opts.trimStart && !opts.trimEnd) {
    if (sink.tempName) (await import('../../lib/opfs')).deleteTempFile(sink.tempName);
    return {
      blob: file,
      fileName: file.name,
      originalBytes: file.size,
      outputBytes: file.size,
      warnings: [],
      keptOriginal: true,
    };
  }
  if (opts.mode === 'targetSize' && opts.targetBytes && blob.size > opts.targetBytes) {
    warnings.push('Could not quite reach the target size; this is the closest result.');
  }
  return {
    blob,
    fileName: compressedName(file.name, out.ext),
    originalBytes: file.size,
    outputBytes: blob.size,
    warnings,
    tempName: sink.tempName,
  };
}
