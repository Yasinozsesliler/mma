// Gelişim puanı: kamp ve dövüşlerden kazanılır, istatistik yükseltmeye harcanır.
import { ageCap, growthMultiplier } from './character';
import { clamp } from './rng';
import type { GameState, Intensity, StatKey } from './types';

export const START_POINTS = 3;

/** +1 için gereken puan; yükseldikçe pahalılaşır. */
export function statCost(v: number) {
  if (v < 60) return 1;
  if (v < 78) return 2;
  if (v < 90) return 3;
  return 4;
}

export function canSpend(s: GameState, k: StatKey) {
  const v = s.fighter.stats[k];
  return v < Math.min(99, ageCap(s.fighter.yas, k)) && s.puan >= statCost(v);
}

export function spendPoint(s: GameState, k: StatKey) {
  if (!canSpend(s, k)) return;
  s.puan -= statCost(s.fighter.stats[k]);
  s.fighter.stats[k]++;
  s.harcanan = (s.harcanan ?? 0) + 1;
}

const CAMP_BASE: Record<Intensity, number> = { dusuk: 0.8, orta: 1.4, yuksek: 2 };

/** Kamp puanı: yoğunluk, yaş, antrenör kalitesi ve motivasyona bağlı. */
export function campPoints(s: GameState, intensity: Intensity, kisaHaber: boolean) {
  if (kisaHaber) return 1;
  const p =
    CAMP_BASE[intensity] *
    growthMultiplier(s.fighter.yas) *
    (0.8 + s.takim.antrenorKalite * 0.04) *
    (1 + s.motivasyon * 0.1);
  return clamp(Math.round(p), 1, 2);
}

/** Dövüş puanı: kaybetmek de öğretir, ama kazanmak daha çok kazandırır. */
export function fightPoints(o: { won: boolean; draw: boolean; finish: boolean; bonus: number; title: boolean }) {
  if (o.draw || !o.won) return 1;
  return 2 + (o.finish ? 1 : 0) + (o.bonus > 0 ? 1 : 0) + (o.title ? 1 : 0);
}
