// Dövüş sporları kuralları: hangi taktik ve hamle hangi sporda yasal. Bağımlılıksız (fight.ts ve liveFight.ts kullanır).
import type { Tactic } from './types';

export type Sport = 'boks' | 'muaythai' | 'grappling' | 'gures';

export const SPORT_TACTICS: Record<Sport, Tactic[]> = {
  boks: ['baski', 'kontra', 'mesafe'],
  muaythai: ['baski', 'kontra', 'mesafe', 'clinch'],
  grappling: ['takedown', 'clinch', 'kontra'],
  gures: ['takedown', 'clinch', 'kontra'],
};

/** Kurala aykırı taktiği yasal olana çevirir (MMA'da değişmez). */
export function legalTactic(kural: Sport | undefined, t: Tactic): Tactic {
  if (!kural) return t;
  const ok = SPORT_TACTICS[kural];
  return ok.includes(t) ? t : ok[0];
}

/** Ayakta yumruk dışı hamleler (tekme, indirme) serbest mi */
export const kicksAllowed = (k?: Sport) => !k || k === 'muaythai';
export const groundAllowed = (k?: Sport) => !k || k === 'grappling' || k === 'gures';
