// Generates the small sample files in tests/fixtures. Re-run after changing it:
//   node scripts/make-fixtures.mjs
// Images and video are made in Playwright's Chromium (canvas + MediaRecorder); PDFs, audio and
// archives are made in Node.
import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';
import { strToU8, zipSync } from 'fflate';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const out = new URL('../tests/fixtures/', import.meta.url);
await mkdir(out, { recursive: true });
const save = async (name, bytes) => {
  await writeFile(new URL(name, out), bytes);
  console.log(`${name.padEnd(22)} ${(bytes.length / 1024).toFixed(1)} KB`);
};

// ---------- Browser-made media ----------
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');

const media = await page.evaluate(async () => {
  const toB64 = async (blob) => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000)
      s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  // Deterministic pseudo-random so fixtures don't change on every run.
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  function photo(w, h) {
    const c = new OffscreenCanvas(w, h);
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#1e3a8a');
    g.addColorStop(0.5, '#f59e0b');
    g.addColorStop(1, '#10b981');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      x.fillStyle = `hsla(${rand() * 360},70%,50%,0.35)`;
      x.beginPath();
      x.arc(rand() * w, rand() * h, rand() * w * 0.06, 0, 7);
      x.fill();
    }
    const id = x.getImageData(0, 0, w, h);
    for (let i = 0; i < id.data.length; i += 4) {
      const n = (rand() - 0.5) * 24;
      id.data[i] += n;
      id.data[i + 1] += n;
      id.data[i + 2] += n;
    }
    x.putImageData(id, 0, 0);
    return c;
  }
  function graphic(w, h, alpha) {
    const c = new OffscreenCanvas(w, h);
    const x = c.getContext('2d');
    if (!alpha) {
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, w, h);
    }
    const colors = ['#0284c7', '#f43f5e', '#22c55e', '#eab308', '#0f172a'];
    for (let i = 0; i < 40; i++) {
      x.fillStyle = colors[i % colors.length];
      x.fillRect(rand() * w, rand() * h, rand() * w * 0.3, rand() * h * 0.3);
    }
    x.font = 'bold 48px sans-serif';
    x.fillStyle = '#0f172a';
    x.fillText('Squish test', 30, 80);
    return c;
  }

  const res = {};
  res['photo.jpg'] = await toB64(
    await photo(1600, 1067).convertToBlob({ type: 'image/jpeg', quality: 0.95 }),
  );
  res['photo-large.jpg'] = await toB64(
    await photo(2400, 1800).convertToBlob({ type: 'image/jpeg', quality: 0.95 }),
  );
  res['photo.webp'] = await toB64(
    await photo(1200, 800).convertToBlob({ type: 'image/webp', quality: 0.95 }),
  );
  res['graphic.png'] = await toB64(
    await graphic(900, 600, false).convertToBlob({ type: 'image/png' }),
  );
  res['alpha.png'] = await toB64(
    await graphic(500, 500, true).convertToBlob({ type: 'image/png' }),
  );
  res['page.jpg'] = await toB64(
    await photo(1700, 2200).convertToBlob({ type: 'image/jpeg', quality: 0.9 }),
  );

  // 2-second WebM with an animated canvas and a tone.
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const cx = canvas.getContext('2d');
  const stream = canvas.captureStream(30);
  const ac = new AudioContext();
  const osc = ac.createOscillator();
  const dest = ac.createMediaStreamDestination();
  osc.connect(dest);
  osc.start();
  stream.addTrack(dest.stream.getAudioTracks()[0]);
  const rec = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp8,opus',
    videoBitsPerSecond: 4_000_000,
  });
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  const stopped = new Promise((r) => (rec.onstop = r));
  rec.start();
  const t0 = performance.now();
  await new Promise((resolve) => {
    const draw = () => {
      const t = (performance.now() - t0) / 1000;
      cx.fillStyle = `hsl(${t * 120},60%,50%)`;
      cx.fillRect(0, 0, 640, 360);
      for (let i = 0; i < 30; i++) {
        cx.fillStyle = `hsl(${i * 12},80%,60%)`;
        cx.fillRect((i * 37 + t * 200) % 640, (i * 53) % 360, 40, 40);
      }
      if (t < 2) requestAnimationFrame(draw);
      else resolve();
    };
    draw();
  });
  rec.stop();
  await stopped;
  osc.stop();
  res['clip.webm'] = await toB64(new Blob(chunks, { type: 'video/webm' }));
  return res;
});
await browser.close();

const buf = (name) => Buffer.from(media[name], 'base64');
for (const name of [
  'photo.jpg',
  'photo-large.jpg',
  'photo.webp',
  'graphic.png',
  'alpha.png',
  'clip.webm',
]) {
  await save(name, buf(name));
}

// ---------- JPEG with EXIF orientation 6 and a GPS position ----------
function exifSegment() {
  // Little-endian TIFF: IFD0 { Orientation=6, GPSInfo→GPS IFD }, GPS IFD { LatitudeRef='N', Latitude }
  const b = Buffer.alloc(100);
  b.write('II', 0);
  b.writeUInt16LE(42, 2);
  b.writeUInt32LE(8, 4);
  b.writeUInt16LE(2, 8); // IFD0 entries
  b.writeUInt16LE(0x0112, 10);
  b.writeUInt16LE(3, 12);
  b.writeUInt32LE(1, 14);
  b.writeUInt16LE(6, 18);
  b.writeUInt16LE(0x8825, 22);
  b.writeUInt16LE(4, 24);
  b.writeUInt32LE(1, 26);
  b.writeUInt32LE(38, 30);
  b.writeUInt32LE(0, 34); // next IFD
  b.writeUInt16LE(2, 38); // GPS entries
  b.writeUInt16LE(0x0001, 40);
  b.writeUInt16LE(2, 42);
  b.writeUInt32LE(2, 44);
  b.write('N\0', 48);
  b.writeUInt16LE(0x0002, 52);
  b.writeUInt16LE(5, 54);
  b.writeUInt32LE(3, 56);
  b.writeUInt32LE(68, 60);
  b.writeUInt32LE(0, 64);
  for (let i = 0; i < 3; i++) {
    b.writeUInt32LE([48, 51, 30][i], 68 + i * 8);
    b.writeUInt32LE(1, 72 + i * 8);
  }
  const tiff = b.subarray(0, 92);
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const head = Buffer.from([0xff, 0xe1, 0, 0]);
  head.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([head, payload]);
}
const photo = buf('photo.jpg');
await save(
  'photo-exif.jpg',
  Buffer.concat([photo.subarray(0, 2), exifSegment(), photo.subarray(2)]),
);

// ---------- PDFs ----------
const lorem =
  'Squish compresses files in your browser. Nothing is uploaded. This paragraph exists so the PDF has real, selectable text on every page. ';

async function textPdf(pages, saveOptions = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let p = 0; p < pages; p++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`Page ${p + 1}`, { x: 50, y: 790, size: 20, font });
    for (let l = 0; l < 40; l++) {
      page.drawText(lorem.slice(0, 90), {
        x: 50,
        y: 750 - l * 17,
        size: 10,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    }
  }
  return doc.save(saveOptions);
}
await save('text.pdf', await textPdf(3));
await save('long.pdf', await textPdf(120));

async function imagePdf(withText) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const img = await doc.embedJpg(buf('page.jpg'));
  for (let p = 0; p < 3; p++) {
    const page = doc.addPage([595, 842]);
    page.drawImage(img, { x: 0, y: 0, width: 595, height: 842 });
    if (withText)
      page.drawText(`Photo page ${p + 1}`, { x: 40, y: 40, size: 24, font, color: rgb(1, 1, 1) });
  }
  return doc.save();
}
await save('images.pdf', await imagePdf(true));
await save('scanned.pdf', await imagePdf(false));

// A PDF whose trailer declares encryption. Enough for the "locked" message; there's nothing to decrypt.
// A classic trailer (no object streams) so there's a `trailer` keyword to add /Encrypt to.
const plain = Buffer.from(await textPdf(1, { useObjectStreams: false })).toString('latin1');
const locked = plain.replace(
  /trailer\s*<</,
  'trailer\n<<\n/Encrypt << /Filter /Standard /V 1 /R 2 /O <00> /U <00> /P -4 >>\n',
);
await save('locked.pdf', Buffer.from(locked, 'latin1'));

// ---------- Audio: 3 s stereo 44.1 kHz 16-bit WAV ----------
{
  const rate = 44100,
    secs = 3,
    ch = 2;
  const n = rate * secs;
  const wav = Buffer.alloc(44 + n * ch * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + n * ch * 2, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(ch, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * ch * 2, 28);
  wav.writeUInt16LE(ch * 2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(n * ch * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.round(
      Math.sin((2 * Math.PI * 440 * i) / rate) * 0.3 * 32767 +
        Math.sin((2 * Math.PI * 660 * i) / rate) * 0.1 * 32767,
    );
    wav.writeInt16LE(v, 44 + i * 4);
    wav.writeInt16LE(v, 46 + i * 4);
  }
  await save('tone.wav', wav);
}

// ---------- Archives ----------
const archiveFiles = {
  'readme.txt': strToU8('Hello from inside the archive.\n'.repeat(50)),
  'photos/photo.jpg': new Uint8Array(buf('photo.jpg')),
  'photos/graphic.png': new Uint8Array(buf('graphic.png')),
};
await save('archive.zip', Buffer.from(zipSync(archiveFiles)));

// Minimal USTAR writer: one 512-byte header per file, data padded to 512, two zero blocks at the end.
function tar(files) {
  const blocks = [];
  for (const [name, data] of Object.entries(files)) {
    const h = Buffer.alloc(512);
    h.write(name, 0, 100, 'utf8');
    h.write('0000644\0', 100);
    h.write('0000000\0', 108);
    h.write('0000000\0', 116);
    h.write(`${data.length.toString(8).padStart(11, '0')}\0`, 124);
    h.write(
      `${Math.floor(Date.UTC(2026, 0, 1) / 1000)
        .toString(8)
        .padStart(11, '0')}\0`,
      136,
    );
    h.write('        ', 148);
    h.write('0', 156);
    h.write('ustar\0', 257);
    h.write('00', 263);
    let sum = 0;
    for (const b of h) sum += b;
    h.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
    blocks.push(h, Buffer.from(data), Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}
await save('archive.tar.gz', gzipSync(tar(archiveFiles)));

// ZIP with traditional PKWARE ("ZipCrypto") encryption, stored entries. Password: "secret".
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crcByte = (crc, b) => (CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)) >>> 0;
const crc32 = (data) => {
  let c = 0xffffffff;
  for (const b of data) c = crcByte(c, b);
  return (c ^ 0xffffffff) >>> 0;
};
function zipCrypto(files, password) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const crc = crc32(data);
    let k0 = 0x12345678,
      k1 = 0x23456789,
      k2 = 0x34567890;
    const update = (b) => {
      k0 = crcByte(k0, b);
      k1 = (Math.imul((k1 + (k0 & 0xff)) >>> 0, 134775813) + 1) >>> 0;
      k2 = crcByte(k2, k1 >>> 24);
    };
    for (const ch of Buffer.from(password)) update(ch);
    const header = Buffer.alloc(12, 0x5a);
    header[11] = crc >>> 24;
    const plain = Buffer.concat([header, Buffer.from(data)]);
    const enc = Buffer.alloc(plain.length);
    for (let i = 0; i < plain.length; i++) {
      const t = (k2 | 2) & 0xffff;
      enc[i] = plain[i] ^ ((Math.imul(t, t ^ 1) >>> 8) & 0xff);
      update(plain[i]);
    }
    const fname = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(1, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(0, 10);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(enc.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(fname.length, 26);
    local.writeUInt16LE(0, 28);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(1, 8);
    cen.writeUInt16LE(0, 10);
    cen.writeUInt32LE(0, 12);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(enc.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(fname.length, 28);
    cen.writeUInt32LE(offset, 42);
    locals.push(local, fname, enc);
    central.push(cen, fname);
    offset += 30 + fname.length + enc.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}
await save(
  'locked.zip',
  zipCrypto({ 'secret.txt': strToU8('The password worked.\n'.repeat(20)) }, 'secret'),
);

// archive.7z isn't generated here (no Node 7z writer). It was made once with py7zr:
//   z.writestr(b'Hello from inside the archive.\n' * 50, 'readme.txt')
//   z.writestr(b'Nested file.\n' * 200, 'docs/notes.txt')
//   z.write('tests/fixtures/graphic.png', 'images/graphic.png')
process.exit(0);
