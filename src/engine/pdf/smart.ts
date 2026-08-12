import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFStream,
  decodePDFRawStream,
  type PDFObject,
} from 'pdf-lib';

export interface SmartSettings {
  dpi: number;
  quality: number;
}

export interface SmartStats {
  images: number;
  recompressed: number;
  imageBytes: number;
  pages: number;
}

const name = (dict: PDFDict, key: string) => {
  const v = dict.get(PDFName.of(key));
  return v instanceof PDFName ? v.asString() : undefined;
};
const num = (dict: PDFDict, key: string) => {
  const v = dict.get(PDFName.of(key));
  return v instanceof PDFNumber ? v.asNumber() : undefined;
};

function filters(dict: PDFDict): string[] {
  const f = dict.lookup(PDFName.of('Filter'));
  if (f instanceof PDFName) return [f.asString()];
  if (f instanceof PDFArray) {
    return f.asArray().map((x) => (x instanceof PDFName ? x.asString() : '?'));
  }
  return [];
}

/** Component count for colour spaces we can safely re-encode as JPEG (1 = gray, 3 = RGB). */
function components(doc: PDFDocument, dict: PDFDict): 1 | 3 | null {
  const cs = dict.lookup(PDFName.of('ColorSpace'));
  if (cs instanceof PDFName) {
    if (cs.asString() === '/DeviceRGB') return 3;
    if (cs.asString() === '/DeviceGray') return 1;
    return null;
  }
  if (cs instanceof PDFArray && cs.size() === 2) {
    const kind = cs.lookup(0);
    const profile = doc.context.lookup(cs.get(1));
    if (
      kind instanceof PDFName &&
      kind.asString() === '/ICCBased' &&
      profile instanceof PDFStream
    ) {
      const n = num(profile.dict, 'N');
      if (n === 3) return 3;
      if (n === 1) return 1;
    }
  }
  return null;
}

/** Reverses PNG row predictors (Predictor ≥ 10) used by some Flate-compressed images. */
function unpredict(data: Uint8Array, width: number, bpp: number): Uint8Array | null {
  const stride = width * bpp;
  const rows = Math.floor(data.length / (stride + 1));
  const out = new Uint8Array(rows * stride);
  for (let r = 0; r < rows; r++) {
    const type = data[r * (stride + 1)];
    const src = r * (stride + 1) + 1;
    const dst = r * stride;
    for (let i = 0; i < stride; i++) {
      const raw = data[src + i]!;
      const left = i >= bpp ? out[dst + i - bpp]! : 0;
      const up = r > 0 ? out[dst - stride + i]! : 0;
      const ul = r > 0 && i >= bpp ? out[dst - stride + i - bpp]! : 0;
      let v: number;
      switch (type) {
        case 0:
          v = raw;
          break;
        case 1:
          v = raw + left;
          break;
        case 2:
          v = raw + up;
          break;
        case 3:
          v = raw + ((left + up) >> 1);
          break;
        case 4: {
          const p = left + up - ul;
          const pa = Math.abs(p - left),
            pb = Math.abs(p - up),
            pc = Math.abs(p - ul);
          v = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : ul);
          break;
        }
        default:
          return null;
      }
      out[dst + i] = v & 0xff;
    }
  }
  return out;
}

async function decodeToImageData(
  stream: PDFRawStream,
  comps: 1 | 3,
  width: number,
  height: number,
): Promise<ImageData | null> {
  const f = filters(stream.dict);
  if (f.length === 1 && f[0] === '/DCTDecode') {
    const bitmap = await createImageBitmap(
      new Blob([stream.getContents() as BlobPart], { type: 'image/jpeg' }),
    );
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
  if (f.length === 1 && f[0] === '/FlateDecode') {
    if (num(stream.dict, 'BitsPerComponent') !== 8) return null;
    let raw = decodePDFRawStream(stream).decode();
    const parms = stream.dict.lookup(PDFName.of('DecodeParms'));
    const predictor = parms instanceof PDFDict ? (num(parms, 'Predictor') ?? 1) : 1;
    if (predictor >= 10) {
      const un = unpredict(raw, width, comps);
      if (!un) return null;
      raw = un;
    } else if (predictor !== 1) {
      return null;
    }
    if (raw.length < width * height * comps) return null;
    const img = new ImageData(width, height);
    const d = img.data;
    for (let p = 0, s = 0; p < width * height; p++, s += comps) {
      d[p * 4] = raw[s]!;
      d[p * 4 + 1] = raw[s + (comps === 3 ? 1 : 0)]!;
      d[p * 4 + 2] = raw[s + (comps === 3 ? 2 : 0)]!;
      d[p * 4 + 3] = 255;
    }
    return img;
  }
  return null;
}

/** Largest page side in inches; images are never kept sharper than `dpi` at this size. */
function maxPageInches(doc: PDFDocument): number {
  let max = 0;
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    max = Math.max(max, width / 72, height / 72);
  }
  return max || 11.7;
}

/** Keys we rewrite; everything else on the image dict (SMask, Interpolate, …) is carried over. */
const REWRITTEN = new Set([
  '/Filter',
  '/DecodeParms',
  '/Length',
  '/Width',
  '/Height',
  '/ColorSpace',
  '/BitsPerComponent',
  '/Decode',
]);

/** Deletes indirect objects that nothing references any more (e.g. replaced images). */
function collectGarbage(doc: PDFDocument) {
  const ctx = doc.context;
  const reachable = new Set<string>();
  const stack: PDFObject[] = [ctx.trailerInfo.Root, ctx.trailerInfo.Info].filter(
    (x): x is PDFObject => !!x,
  );
  while (stack.length) {
    const obj = stack.pop()!;
    if (obj instanceof PDFRef) {
      const key = obj.toString();
      if (reachable.has(key)) continue;
      reachable.add(key);
      const target = ctx.lookup(obj);
      if (target) stack.push(target);
    } else if (obj instanceof PDFDict) {
      for (const [, v] of obj.entries()) stack.push(v);
    } else if (obj instanceof PDFArray) {
      for (const v of obj.asArray()) stack.push(v);
    } else if (obj instanceof PDFStream) {
      stack.push(obj.dict);
    }
  }
  for (const [ref] of ctx.enumerateIndirectObjects()) {
    if (!reachable.has(ref.toString())) ctx.delete(ref);
  }
}

export async function smartCompress(
  bytes: Uint8Array,
  settings: SmartSettings,
  stripMetadata: boolean,
  onProgress: (f: number) => void,
): Promise<{ bytes: Uint8Array; stats: SmartStats }> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const { default: encodeJpeg } = await import('@jsquash/jpeg/encode.js');
  const { default: resize } = await import('@jsquash/resize');

  const maxLong = Math.ceil(maxPageInches(doc) * settings.dpi);
  const stats: SmartStats = {
    images: 0,
    recompressed: 0,
    imageBytes: 0,
    pages: doc.getPageCount(),
  };

  const images = doc.context
    .enumerateIndirectObjects()
    .filter(
      (e): e is [PDFRef, PDFRawStream] =>
        e[1] instanceof PDFRawStream && name(e[1].dict, 'Subtype') === '/Image',
    );

  for (let i = 0; i < images.length; i++) {
    const [ref, stream] = images[i]!;
    onProgress(0.05 + 0.85 * (i / Math.max(1, images.length)));
    stats.images++;
    const size = stream.getContentsSize();
    stats.imageBytes += size;
    const dict = stream.dict;
    const width = num(dict, 'Width');
    const height = num(dict, 'Height');
    if (!width || !height || size < 8 * 1024) continue;
    if (dict.get(PDFName.of('ImageMask')) || dict.get(PDFName.of('Mask'))) continue;
    if (dict.get(PDFName.of('Decode'))) continue;
    const comps = components(doc, dict);
    if (!comps) continue;

    let img: ImageData | null;
    try {
      img = await decodeToImageData(stream, comps, width, height);
    } catch {
      continue;
    }
    if (!img) continue;

    const long = Math.max(img.width, img.height);
    if (long > maxLong) {
      const s = maxLong / long;
      img = await resize(img, {
        width: Math.max(1, Math.round(img.width * s)),
        height: Math.max(1, Math.round(img.height * s)),
        method: 'lanczos3',
        fitMethod: 'stretch',
        premultiply: false,
        linearRGB: true,
      });
    }
    const jpeg = new Uint8Array(
      await encodeJpeg(img, {
        quality: settings.quality,
        progressive: true,
        optimize_coding: true,
        color_space: comps === 1 ? 1 : 3,
        auto_subsample: true,
        chroma_subsample: 2,
      }),
    );
    if (jpeg.byteLength >= size * 0.95) continue;

    const newDict: Record<string, PDFObject> = {};
    for (const [k, v] of dict.entries()) {
      if (!REWRITTEN.has(k.asString())) newDict[k.asString().slice(1)] = v;
    }
    const replacement = doc.context.stream(jpeg, {
      ...newDict,
      Type: 'XObject',
      Subtype: 'Image',
      Width: img.width,
      Height: img.height,
      ColorSpace: comps === 1 ? 'DeviceGray' : 'DeviceRGB',
      BitsPerComponent: 8,
      Filter: 'DCTDecode',
    });
    doc.context.assign(ref, replacement);
    stats.recompressed++;
  }

  if (stripMetadata) {
    doc.catalog.delete(PDFName.of('Metadata'));
    doc.setProducer('');
    doc.setCreator('');
  }
  collectGarbage(doc);
  onProgress(0.93);
  const out = await doc.save({ useObjectStreams: true, updateFieldAppearances: false });
  return { bytes: out, stats };
}
