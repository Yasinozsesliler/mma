// Tekrar önleyici: soru/olay havuzlarından son görülenleri bir süre geri getirmez (basın, podcast, kamp anları…).
import { pick, shuffle } from './rng';
import type { GameState } from './types';

/** Havuzdan yakın zamanda görülmemiş n öğe seçer ve hafızaya yazar. `keep`: kaç tanesi hatırlanır. */
export function fresh<T extends { id: string }>(s: GameState, key: string, pool: T[], n: number, keep = Math.max(4, Math.floor(pool.length * 0.6))): T[] {
  if (!pool.length) return [];
  const seen = s.tekrar?.[key] ?? [];
  const yeni = shuffle(pool.filter((x) => !seen.includes(x.id)));
  const eski = shuffle(pool.filter((x) => seen.includes(x.id)));
  const out = [...yeni, ...eski].slice(0, n);
  s.tekrar = { ...(s.tekrar ?? {}), [key]: [...out.map((x) => x.id), ...seen.filter((id) => !out.some((x) => x.id === id))].slice(0, keep) };
  return out;
}

/** Varyantlardan biri (string ya da string dizisi). */
export const oneOf = (v: string | string[]) => (Array.isArray(v) ? pick(v) : v);
