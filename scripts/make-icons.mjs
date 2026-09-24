// PWA ikonlarını bağımlılıksız üretir: koyu zemin, kırmızı sekizgen kafes, altın kemer.
// Çalıştırma: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [13, 14, 17];
const RED = [215, 38, 61];
const GOLD = [224, 176, 74];
const GOLD_DARK = [150, 110, 30];

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

function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit derinliği
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Merkezden normalize uzaklık (sekizgen "yarıçapı"). */
function octDist(x, y) {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  return Math.max(ax, ay, (ax + ay) / Math.SQRT2);
}

function icon(size, scale) {
  // scale: tasarımın kapladığı oran (maskable için güvenli alan küçük tutulur)
  return png(size, (px, py) => {
    const x = ((px + 0.5) / size - 0.5) * 2 / scale;
    const y = ((py + 0.5) / size - 0.5) * 2 / scale;
    const d = octDist(x, y);
    // Kafes çerçevesi
    if (d > 0.78 && d < 0.9) return RED;
    // Kafes teli deseni (ince çapraz ızgara, sekizgen içinde)
    if (d <= 0.78) {
      // Kemer: yatay şerit + ortada plaka
      const plate = octDist(x / 0.36, y / 0.3) < 1;
      if (plate) {
        if (octDist(x / 0.26, y / 0.2) < 1) return octDist(x / 0.12, y / 0.09) < 1 ? RED : GOLD;
        return GOLD_DARK;
      }
      if (Math.abs(y) < 0.13) return Math.abs(y) < 0.1 ? GOLD : GOLD_DARK;
      const gx = (x + y) * 6;
      const gy = (x - y) * 6;
      const onWire = Math.abs(gx - Math.round(gx)) < 0.05 || Math.abs(gy - Math.round(gy)) < 0.05;
      return onWire ? [40, 42, 50] : BG;
    }
    return BG;
  });
}

const out = new URL('../public/', import.meta.url);
writeFileSync(new URL('icon-192.png', out), icon(192, 0.92));
writeFileSync(new URL('icon-512.png', out), icon(512, 0.92));
writeFileSync(new URL('icon-maskable-512.png', out), icon(512, 0.7));
writeFileSync(new URL('apple-touch-icon.png', out), icon(180, 0.8));
console.log('İkonlar public/ klasörüne yazıldı.');
