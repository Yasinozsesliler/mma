// Takipçi: sınırsız şöhret göstergesi. Kazandıkça artar, kaybettikçe erir; trash talk ile büyük kazanır ya da kaybedersin.
// (İç mekaniklerdeki 0-100 popülerlik ayrı tutulur; oyuncunun gördüğü ve kovaladığı sayı takipçidir.)
import { chance, clamp, rand } from './rng';
import type { GameState } from './types';

/** Eski kayıtlarla uyumlu başlangıç: sosyal medya ekranının eski formülü. */
export const initialFollowers = (pop: number) => Math.round(200 + pop * pop * 45);

export const followers = (s: GameState) => s.takipci ?? initialFollowers(s.populerlik);

const STAGE_BASE: Record<GameState['stage'], number> = { amator: 20, bolgesel: 120, buyuk: 600, ufc: 2500 };
/** Aşamanın yumuşak tavanı: yaklaştıkça yüzde büyüme yavaşlar (katlanarak patlamasın), ama asla durmaz. */
const SOFT_CAP: Record<GameState['stage'], number> = { amator: 25_000, bolgesel: 200_000, buyuk: 2_000_000, ufc: 25_000_000 };
const damp = (s: GameState, F: number) => Math.max(0.08, 1 - F / SOFT_CAP[s.stage]);

/** 12.400 → "12,4B", 1.250.000 → "1,3M" */
export function fmtFollowers(n: number) {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace('.', ',')}M`;
  if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace('.', ',')}B`;
  return `${sign}${Math.round(a)}`;
}

export const fmtDelta = (n: number) => `${n >= 0 ? '+' : ''}${fmtFollowers(n)}`;

export function addFollowers(s: GameState, n: number) {
  const before = followers(s);
  s.takipci = Math.max(50, Math.round(before + n));
  return s.takipci - before;
}

/** Popülerlik değişimini takipçiye çevirir (olaylar, sosyal medya, basın…). */
export function popToFollowers(s: GameState, dPop: number) {
  if (!dPop) return 0;
  const F = followers(s);
  return addFollowers(s, dPop * (F * 0.01 * (dPop > 0 ? damp(s, F) : 1) + STAGE_BASE[s.stage]) * (0.8 + rand() * 0.4));
}

/** Maç sonucu takipçi etkisi. */
export function fightFollowers(s: GameState, o: { won: boolean; draw: boolean; finish: boolean; bonus: number; title: boolean; koLoss: boolean; trash: boolean }) {
  const F = followers(s);
  const base = STAGE_BASE[s.stage];
  let d: number;
  if (o.won) d = F * (0.05 + (o.finish ? 0.04 : 0) + o.bonus * 0.03 + (o.title ? 0.3 : 0) + (o.trash ? 0.04 : 0)) * damp(s, F) + base * (o.finish ? 10 : 6);
  else if (o.draw) d = F * 0.005;
  else d = -F * (0.025 + (o.koLoss ? 0.025 : 0) + (o.trash ? 0.06 : 0));
  return addFollowers(s, d * (0.85 + rand() * 0.3));
}

/**
 * Trash talk: çoğu zaman kazandırır ama bazen dengeyi kaçırırsın.
 * Dönen metin ekrana yazılır, yüzde değişim takipçiye uygulanır.
 */
export function trashTalkFollowers(s: GameState, basari: boolean): { delta: number; metin: string } {
  const F = followers(s);
  if (basari && chance(0.15)) {
    // Çizgiyi aştı: konuşulan sensin ama bir kesim takibi bıraktı.
    const d = addFollowers(s, -F * (0.04 + rand() * 0.05));
    return { delta: d, metin: `Sözlerin çizgiyi aştı, bir kesim takibi bıraktı. (${fmtDelta(d)} takipçi)` };
  }
  const d = basari ? addFollowers(s, F * (0.06 + rand() * 0.08) * damp(s, F) + STAGE_BASE[s.stage] * 4) : addFollowers(s, -F * (0.03 + rand() * 0.05));
  return { delta: d, metin: `${fmtDelta(d)} takipçi` };
}

export const followerTier = (n: number) =>
  n >= 10e6 ? 'Küresel ikon' : n >= 1e6 ? 'Süperstar' : n >= 250e3 ? 'Yıldız' : n >= 50e3 ? 'Tanınan yüz' : n >= 10e3 ? 'Yükselen isim' : 'Yerel dövüşçü';

export const clampPop = (v: number) => clamp(v, 0, 100);
