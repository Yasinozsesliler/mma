// Uygulama ikonlarını bağımlılıksız üretir: koyu zemin, kırmızı sekizgen kafes, altın kemer.
// PWA (public/) ve Android (assets/: tam ikon, uyarlanabilir ön plan, tek renk, açılış ekranı) için.
// Çalıştırma: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [13, 14, 17];
const RED = [215, 38, 61];
const GOLD = [224, 176, 74];
const GOLD_DARK = [150, 110, 30];
const WIRE = [40, 42, 50];

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** RGBA PNG; pixel() [r,g,b] ya da [r,g,b,a] döner. */
function png(size, pixel) {
  const row = size * 4 + 1;
  const raw = Buffer.alloc(row * size);
  for (let y = 0; y < size; y++) {
    raw[y * row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a = 255] = pixel(x, y);
      const i = y * row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit derinliği
  ihdr[9] = 6; // RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** Merkezden normalize uzaklık (sekizgen "yarıçapı"). */
function octDist(x, y) {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  return Math.max(ax, ay, (ax + ay) / Math.SQRT2);
}

/**
 * Logo pikseli. mode: 'full' (dolu zemin), 'fg' (şeffaf zemin, Android ön plan),
 * 'mono' (beyaz siluet, şeffaf zemin: Android tema ikonu).
 */
function logo(x, y, mode) {
  const d = octDist(x, y);
  const T = [0, 0, 0, 0];
  const W = [255, 255, 255, 255];
  const bg = mode === 'full' ? BG : T;
  if (d > 0.78 && d < 0.9) return mode === 'mono' ? W : RED;
  if (d <= 0.78) {
    const plate = octDist(x / 0.36, y / 0.3) < 1;
    if (plate) {
      if (mode === 'mono') return octDist(x / 0.26, y / 0.2) < 1 && octDist(x / 0.12, y / 0.09) >= 1 ? W : T;
      if (octDist(x / 0.26, y / 0.2) < 1) return octDist(x / 0.12, y / 0.09) < 1 ? RED : GOLD;
      return GOLD_DARK;
    }
    if (Math.abs(y) < 0.13) {
      if (mode === 'mono') return Math.abs(y) < 0.1 ? W : T;
      return Math.abs(y) < 0.1 ? GOLD : GOLD_DARK;
    }
    if (mode === 'mono') return T;
    const gx = (x + y) * 6;
    const gy = (x - y) * 6;
    const onWire = Math.abs(gx - Math.round(gx)) < 0.05 || Math.abs(gy - Math.round(gy)) < 0.05;
    return onWire ? WIRE : BG;
  }
  return bg;
}

function icon(size, scale, mode = 'full') {
  // scale: tasarımın kapladığı oran (uyarlanabilir ikonlar için güvenli alan küçük tutulur)
  return png(size, (px, py) => {
    const x = (((px + 0.5) / size - 0.5) * 2) / scale;
    const y = (((py + 0.5) / size - 0.5) * 2) / scale;
    return logo(x, y, mode);
  });
}

const pub = new URL('../public/', import.meta.url);
writeFileSync(new URL('icon-192.png', pub), icon(192, 0.92));
writeFileSync(new URL('icon-512.png', pub), icon(512, 0.92));
writeFileSync(new URL('icon-maskable-512.png', pub), icon(512, 0.7));
writeFileSync(new URL('apple-touch-icon.png', pub), icon(180, 0.8));

// Android: ön plan ikonun ortadaki %66'lık güvenli alanında kalmalı (maskeler kenarları keser).
const assets = new URL('../assets/', import.meta.url);
writeFileSync(new URL('icon.png', assets), icon(1024, 0.86));
writeFileSync(new URL('android-icon-foreground.png', assets), icon(1024, 0.6, 'fg'));
writeFileSync(new URL('android-icon-monochrome.png', assets), icon(1024, 0.6, 'mono'));
writeFileSync(new URL('splash-icon.png', assets), icon(1024, 0.9, 'fg'));
writeFileSync(new URL('favicon.png', assets), icon(48, 0.92));
console.log('İkonlar public/ ve assets/ klasörlerine yazıldı.');
