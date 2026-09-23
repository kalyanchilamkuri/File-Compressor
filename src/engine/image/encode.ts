export type EncodeFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export const MIME: Record<EncodeFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

export const EXT: Record<EncodeFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
};

const toBytes = (buf: ArrayBuffer | Uint8Array) =>
  buf instanceof Uint8Array ? buf : new Uint8Array(buf);

async function encodeJpeg(img: ImageData, quality: number) {
  const { default: encode } = await import('@jsquash/jpeg/encode.js');
  return toBytes(
    await encode(img, {
      quality,
      progressive: true,
      optimize_coding: true,
      auto_subsample: true,
      chroma_subsample: 2,
      trellis_multipass: false,
    }),
  );
}

async function encodeWebp(img: ImageData, quality: number) {
  const { default: encode } = await import('@jsquash/webp/encode.js');
  return toBytes(await encode(img, { quality, method: 4, use_sharp_yuv: 1 }));
}

async function encodeAvif(img: ImageData, quality: number) {
  const { default: encode } = await import('@jsquash/avif/encode.js');
  // AVIF's quality scale is harsher than JPEG's; this keeps "75" looking roughly alike.
  return toBytes(await encode(img, { quality: Math.round(quality * 0.8), speed: 7 }));
}

async function optimisePng(input: ImageData | Uint8Array) {
  const { default: optimise } = await import('@jsquash/oxipng/optimise.js');
  const data = input instanceof Uint8Array ? input.slice().buffer : input;
  return toBytes(await optimise(data, { level: 2, interlace: false, optimiseAlpha: true }));
}

let quantReady: Promise<typeof import('libimagequant-wasm/wasm/libimagequant_wasm.js')> | null =
  null;
function loadQuantizer() {
  quantReady ??= import('libimagequant-wasm/wasm/libimagequant_wasm.js').then(async (m) => {
    await m.default();
    return m;
  });
  return quantReady;
}

/** Lossy PNG: reduce to at most `colors` palette entries with dithering, then optimise losslessly. */
async function encodePalettePng(img: ImageData, colors: number) {
  const q = await loadQuantizer();
  const quantizer = new q.ImageQuantizer();
  try {
    quantizer.setMaxColors(Math.max(2, Math.min(256, Math.round(colors))));
    quantizer.setSpeed(4);
    quantizer.setQuality(0, 100);
    const result = quantizer.quantizeImage(img.data, img.width, img.height);
    try {
      result.setDithering(1.0);
      const indices = result.getPaletteIndices(img.data, img.width, img.height);
      const png = q.encode_palette_to_png(indices, result.getPalette(), img.width, img.height);
      return optimisePng(png);
    } finally {
      result.free();
    }
  } finally {
    quantizer.free();
  }
}

/** Maps the shared 5–95 quality scale onto a palette size for lossy PNG. */
export const paletteColorsFor = (quality: number) =>
  Math.round(8 + (Math.min(95, Math.max(5, quality)) - 5) * (248 / 90));

export async function encodeImage(
  img: ImageData,
  format: EncodeFormat,
  quality: number,
  pngMode: 'lossless' | 'palette' = 'lossless',
): Promise<Uint8Array> {
  switch (format) {
    case 'jpeg':
      return encodeJpeg(img, quality);
    case 'webp':
      return encodeWebp(img, quality);
    case 'avif':
      return encodeAvif(img, quality);
    case 'png':
      return pngMode === 'palette'
        ? encodePalettePng(img, paletteColorsFor(quality))
        : optimisePng(img);
  }
}

export async function resizeImage(img: ImageData, width: number, height: number) {
  if (width === img.width && height === img.height) return img;
  const { default: resize } = await import('@jsquash/resize');
  return resize(img, {
    width,
    height,
    method: 'lanczos3',
    fitMethod: 'stretch',
    premultiply: true,
    linearRGB: true,
  });
}
