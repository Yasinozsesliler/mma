// Kariyeri taşı: kayıt, telefon değiştirirken ya da web ↔ uygulama arasında taşınabilen bir metin koduna çevrilir.
// Sunucu yok: kod kaydın kendisidir (UTF-8 → base64). Büyük ve yeniden üretilebilen alanlar kırpılır.
import type { GameState } from './engine/types';
import { parseSave } from './storage';

const PREFIX = 'YOL1:';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function utf8(str: string): number[] {
  const out: number[] = [];
  for (const ch of str) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

function fromUtf8(b: number[]): string {
  let s = '';
  for (let i = 0; i < b.length; ) {
    const x = b[i++];
    let c: number;
    if (x < 0x80) c = x;
    else if (x < 0xe0) c = ((x & 31) << 6) | (b[i++] & 63);
    else if (x < 0xf0) c = ((x & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    else c = ((x & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    s += String.fromCodePoint(c);
  }
  return s;
}

function toB64(bytes: number[]): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return s;
}

function fromB64(s: string): number[] {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) | ((B64.indexOf(clean[i + 2]) & 63) << 6) | (B64.indexOf(clean[i + 3]) & 63);
    out.push((n >> 16) & 255);
    if (clean[i + 2] !== undefined) out.push((n >> 8) & 255);
    if (clean[i + 3] !== undefined) out.push(n & 255);
  }
  return out;
}

/** Kariyer kodu: sosyal akış, haberler ve randevu destesi kırpılır (oyun bunları yeniden üretir). */
export function exportCode(s: GameState): string {
  const slim: GameState = { ...s, sosyal: (s.sosyal ?? []).slice(0, 15), haberler: s.haberler.slice(0, 30), adaylar: undefined };
  return PREFIX + toB64(utf8(JSON.stringify(slim)));
}

/** Koddan kariyer; geçersizse null. Kayıt, eski sürümlerle aynı taşıma adımlarından geçer. */
export function importCode(code: string): GameState | null {
  // Kod bir mesajın içinde de gelebilir: önekten sonrası alınır.
  const i = code.indexOf(PREFIX);
  if (i < 0) return null;
  try {
    // Mesajlaşma uygulamaları uzun metne satır sonu ekleyebilir: çözücü boşlukları zaten atlar.
    return parseSave(fromUtf8(fromB64(code.slice(i + PREFIX.length))));
  } catch {
    return null;
  }
}
