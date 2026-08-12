import {
  ALL_FORMATS,
  BlobSource,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  WebMOutputFormat,
  getEncodableAudioCodecs,
  getEncodableVideoCodecs,
  type InputAudioTrack,
  type InputVideoTrack,
  type VideoCodec,
} from 'mediabunny';
import { compressedName } from '../../lib/format';
import { planVideo } from '../targetSize';
import type { CompressOptions, CompressResult, DetectedType, ProgressFn } from '../types';
import { UserFacingError } from '../types';
import { createSink, ensureAudioEncoders, qualityLevel } from './common';

export interface MediaCompressResult extends CompressResult {
  tempName?: string;
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

interface Attempt {
  height: number | null;
  videoBitrate?: number;
  audioBitrate?: number;
}

async function convertOnce(
  file: File,
  opts: CompressOptions,
  attempt: Attempt,
  info: { srcW: number; srcH: number; fps: number },
  onProgress: ProgressFn,
): Promise<{ blob: Blob; tempName?: string; warnings: string[] }> {
  const warnings: string[] = [];
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const webm = opts.videoFormat === 'webm';
  // No fast start: moving the index to the front would need the whole file in memory.
  const format = webm ? new WebMOutputFormat() : new Mp4OutputFormat({ fastStart: false });
  const sink = await createSink();
  const output = new Output({ format, target: sink.target });

  let width: number | undefined;
  let height: number | undefined;
  if (attempt.height && attempt.height < info.srcH) {
    height = even(attempt.height);
    width = even((info.srcW * attempt.height) / info.srcH);
  }

  const preferred: VideoCodec[] = webm ? ['vp9', 'vp8', 'av1'] : ['avc', 'hevc', 'vp9', 'av1'];
  const [videoCodec] = await getEncodableVideoCodecs(preferred, {
    width: width ?? info.srcW,
    height: height ?? info.srcH,
  });
  if (!videoCodec) {
    throw new UserFacingError(
      'This browser can’t encode video. Try the latest Chrome, Edge, or Safari.',
    );
  }
  const [audioCodec] = await getEncodableAudioCodecs(webm ? ['opus', 'vorbis'] : ['aac', 'opus']);

  const videoQuality = attempt.videoBitrate
    ? new Quality({ bitrate: attempt.videoBitrate })
    : new Quality(qualityLevel(opts.quality ?? 60));
  const audioQuality = attempt.audioBitrate
    ? new Quality({ bitrate: attempt.audioBitrate })
    : new Quality(qualityLevel(opts.quality ?? 60));

  const conversion = await Conversion.init({
    input,
    output,
    tracks: 'primary',
    showWarnings: false,
    video: {
      codec: videoCodec,
      quality: videoQuality,
      width,
      height,
      fit: width && height ? 'fill' : undefined,
      frameRate:
        opts.maxFrameRate && info.fps > opts.maxFrameRate + 0.5 ? opts.maxFrameRate : undefined,
      forceTranscode: true,
    },
    audio:
      opts.removeAudio || !audioCodec
        ? { discard: true }
        : { codec: audioCodec, quality: audioQuality, forceTranscode: true },
    trim:
      opts.trimStart || opts.trimEnd
        ? { start: opts.trimStart || undefined, end: opts.trimEnd || undefined }
        : undefined,
    tags: opts.stripMetadata ? {} : undefined,
  });

  const videoDropped = conversion.discardedTracks.find((d) => d.track.type === 'video');
  if (!conversion.isValid || videoDropped) {
    const reason = videoDropped?.reason;
    throw new UserFacingError(
      reason === 'undecodable_source_codec' || reason === 'unknown_source_codec'
        ? 'This browser can’t read the video format inside this file. Try Chrome or Edge, or a different file.'
        : 'This video can’t be converted in this browser.',
    );
  }
  if (!opts.removeAudio && !audioCodec) {
    warnings.push('Audio was removed because this browser can’t encode it.');
  } else if (
    conversion.discardedTracks.some(
      (d) => d.track.type === 'audio' && d.reason !== 'discarded_by_user',
    )
  ) {
    warnings.push('Audio was removed because this browser can’t read its format.');
  }

  conversion.onProgress = (p) => onProgress(p);
  await conversion.execute();
  input.dispose?.();
  const mime = webm ? 'video/webm' : 'video/mp4';
  return { blob: await sink.result(mime), tempName: sink.tempName, warnings };
}

export async function probeVideo(file: File) {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    if (!(await input.canRead())) return null;
    const video: InputVideoTrack | null = await input.getPrimaryVideoTrack();
    const audio: InputAudioTrack | null = await input.getPrimaryAudioTrack();
    const duration = await input.computeDuration();
    if (!video) return { video: null, audio, duration, srcW: 0, srcH: 0, fps: 0, canDecode: false };
    const [srcW, srcH, canDecode, stats] = await Promise.all([
      video.getDisplayWidth(),
      video.getDisplayHeight(),
      video.canDecode(),
      video.computePacketStats(120).catch(() => ({ averagePacketRate: 30 })),
    ]);
    return { video, audio, duration, srcW, srcH, fps: stats.averagePacketRate, canDecode };
  } finally {
    input.dispose?.();
  }
}

export async function compressVideo(
  file: File,
  type: DetectedType,
  opts: CompressOptions,
  onProgress: ProgressFn,
): Promise<MediaCompressResult> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoDecoder === 'undefined') {
    throw new UserFacingError(
      'Video compression needs a newer browser (WebCodecs). Try the latest Chrome, Edge, Firefox, or Safari.',
    );
  }
  await ensureAudioEncoders();
  const probe = await probeVideo(file);
  if (!probe) throw new UserFacingError('This video file could not be read. It may be damaged.');
  if (!probe.video) {
    // e.g. an .mp4 that only contains audio.
    const { compressAudio } = await import('./audio');
    return compressAudio(file, type, opts, onProgress);
  }
  if (!probe.canDecode) {
    throw new UserFacingError(
      'This browser can’t read the video format inside this file. Try Chrome or Edge, or a different file.',
    );
  }

  const info = { srcW: probe.srcW, srcH: probe.srcH, fps: probe.fps };
  const requestedHeight = typeof opts.videoResolution === 'number' ? opts.videoResolution : null;
  const warnings: string[] = [];
  const clip =
    Math.max(0, (opts.trimEnd || probe.duration) - (opts.trimStart || 0)) || probe.duration;

  let result: { blob: Blob; tempName?: string; warnings: string[] };
  if (opts.mode === 'targetSize' && opts.targetBytes) {
    const hasAudio = !!probe.audio && !opts.removeAudio;
    const plan = planVideo(opts.targetBytes, clip, info.srcH, hasAudio);
    warnings.push(...plan.warnings);
    let attempt: Attempt = {
      height:
        requestedHeight && plan.height
          ? Math.min(requestedHeight, plan.height)
          : (requestedHeight ?? plan.height),
      videoBitrate: plan.videoBitrate,
      audioBitrate: plan.audioBitrate || undefined,
    };
    // Encoders overshoot their bitrate a little; retry smaller if the result misses the target.
    for (let tries = 0; ; tries++) {
      const span = 1 / 3;
      result = await convertOnce(file, opts, attempt, info, (p) =>
        onProgress(Math.min(0.99, tries * span + p * span)),
      );
      if (result.blob.size <= opts.targetBytes || tries === 2) break;
      const ratio = (opts.targetBytes / result.blob.size) * 0.93;
      attempt = {
        ...attempt,
        videoBitrate: Math.max(40_000, Math.round(attempt.videoBitrate! * ratio)),
      };
      if (result.tempName) {
        const { deleteTempFile } = await import('../../lib/opfs');
        await deleteTempFile(result.tempName);
      }
    }
    if (result.blob.size > opts.targetBytes) {
      warnings.push('Could not quite reach the target size; this is the closest result.');
    }
  } else {
    result = await convertOnce(file, opts, { height: requestedHeight }, info, onProgress);
  }
  warnings.push(...result.warnings);

  const webm = opts.videoFormat === 'webm';
  const sameContainer = webm ? type === 'webm' : type === 'mp4' || type === 'mov';
  const noChangesRequested =
    !requestedHeight && !opts.trimStart && !opts.trimEnd && !opts.removeAudio;
  if (result.blob.size >= file.size && sameContainer && noChangesRequested) {
    if (result.tempName) {
      const { deleteTempFile } = await import('../../lib/opfs');
      await deleteTempFile(result.tempName);
    }
    return {
      blob: file,
      fileName: file.name,
      originalBytes: file.size,
      outputBytes: file.size,
      warnings: [],
      keptOriginal: true,
    };
  }
  return {
    blob: result.blob,
    fileName: compressedName(file.name, webm ? 'webm' : 'mp4'),
    originalBytes: file.size,
    outputBytes: result.blob.size,
    warnings,
    tempName: result.tempName,
  };
}
