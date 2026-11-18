// Portre çekirdeği: renk paletleri, seçenek listeleri ve yüz geometrisi. Klasik ve yeni (HD) portre aynı ölçüleri kullanır.
import { L as tL } from '../i18n';
import type { Appearance } from '../engine/types';

/** Sekizgen çerçeve noktaları (components.octPoints ile aynı). */
export const octPoints = (r: number, cx = 50, cy = 50) =>
  Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 8) * (2 * i + 1);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');

export const SKIN_TONES = ['#f6d7c3', '#ecc0a0', '#d9a07a', '#c68a5f', '#a86b43', '#8a5534', '#6b3f24', '#4a2a17'];
export const HAIR_COLORS = ['#0f0d0c', '#2e1d12', '#5a3a22', '#8a5a2b', '#c49a55', '#e3c587', '#9a2e1f', '#b8b8b8', '#ece6d6', '#2f8cff', '#ff5ca8', '#3ccf6e', '#8b5cf6'];
/** İlk 8 doğal renk (son doğal renk gri); sonrakiler Şampiyon Paketi'nin özel renkleri. */
export const NATURAL_HAIR = 8;
export const EYE_COLORS = ['#3b2314', '#6b4423', '#4f7a3a', '#3f6fa8', '#7a8a96', '#1d1d1d'];

export const HAIR_STYLES: { key: Appearance['sac']; ad: string }[] = [
  { key: 'kazik', ad: tL("Kazıma") },
  { key: 'kisa', ad: tL("Kısa") },
  { key: 'yanayrik', ad: tL("Yana taralı") },
  { key: 'mohawk', ad: tL("Mohawk") },
  { key: 'uzun', ad: tL("Uzun") },
  { key: 'topuz', ad: tL("Topuz") },
  { key: 'afro', ad: tL("Afro") },
  { key: 'orgu', ad: tL("Örgü") },
  { key: 'kel', ad: tL("Kel") },
  { key: 'atkuyrugu', ad: tL("At kuyruğu") },
];
export const BEARDS: { key: Appearance['sakal']; ad: string }[] = [
  { key: 'yok', ad: tL("Yok") },
  { key: 'kirli', ad: tL("Kirli sakal") },
  { key: 'tam', ad: tL("Gür sakal") },
  { key: 'keci', ad: tL("Keçi sakalı") },
  { key: 'biyik', ad: tL("Bıyık") },
];

export const FACE_SHAPES = [
  { key: '0', ad: tL("Oval") },
  { key: '1', ad: tL("Köşeli") },
  { key: '2', ad: tL("Yuvarlak") },
  { key: '3', ad: tL("Uzun") },
  { key: '4', ad: tL("Üçgen") },
];
export const NOSES = [
  { key: '0', ad: tL("Düz") },
  { key: '1', ad: tL("Geniş") },
  { key: '2', ad: tL("Kırık") },
  { key: '3', ad: tL("Kemerli") },
];
export const EYE_SHAPES = [
  { key: '0', ad: tL("Kısık") },
  { key: '1', ad: tL("Normal") },
  { key: '2', ad: tL("İri") },
];
export const LIPS = [
  { key: '0', ad: tL("İnce") },
  { key: '1', ad: tL("Normal") },
  { key: '2', ad: tL("Dolgun") },
];
export const BROWS = [
  { key: '0', ad: tL("İnce") },
  { key: '1', ad: tL("Normal") },
  { key: '2', ad: tL("Kalın, sert") },
];

/** Yüz hattı: [elmacık yarı genişliği, çene yarı genişliği, çene ucu y, çene köşesi keskinliği] */
export const FACE_GEO: [number, number, number, number][] = [
  [19, 16.5, 68.5, 0], // oval
  [19.5, 19, 67.5, 1], // köşeli
  [20, 18, 66.5, 0], // yuvarlak
  [18, 15.5, 71, 0], // uzun
  [19.5, 13.5, 69, 0], // üçgen
];

export function facePath(shape: number) {
  const [cw, jw, cy, sq] = FACE_GEO[shape] ?? FACE_GEO[0];
  const L = 50 - cw;
  const Rr = 50 + cw;
  const jy = sq ? 60 : 56.5;
  return tL("M{0} 41 Q{1} 21 50 19.5 Q{2} 21 {3} 41 Q{4} {5} {6} {7} Q{8} {9} 50 {10} Q{11} {12} {13} {14} Q{15} {16} {17} 41 Z", [L, L - 0.5, Rr + 0.5, Rr, Rr + 0.5, sq ? 56 : 50, 50 + jw, jy, 50 + jw * (sq ? 0.95 : 0.7), cy - (sq ? 1 : 2), cy, 50 - jw * (sq ? 0.95 : 0.7), cy - (sq ? 1 : 2), 50 - jw, jy, L - 0.5, sq ? 56 : 50, L]);
}

export const DEFAULT_LOOK: Appearance = { ten: 2, sac: 'kisa', sacRenk: 0, goz: 0, sakal: 'kirli', yara: false, dovme: false };

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  const r = c(n >> 16);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Kirli sakal dokusu için sabit nokta dizisi (her çizimde aynı)
export const STUBBLE = Array.from({ length: 70 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180;
  const r = 3 + ((i * 7) % 15);
  return { x: 50 + Math.cos(a) * r * 1.05, y: 60 + Math.sin(a) * r * 0.45 };
}).filter((p) => p.y > 54 && Math.abs(p.x - 50) > 3.5 - (p.y - 54) * 0.3);

