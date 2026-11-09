// Sezon Kemeri durumu (cihazda, kariyerlerden bağımsız): bu sezonun puanı ve alınan ödüller. Yeni ay gelince sıfırlanır.
import { useSyncExternalStore } from 'react';
import { grantCosmetic } from './cosmetics';
import { SEASON_XP, seasonIndex, seasonRewards, tierOf, type SeasonReward } from './engine/season';
import { getPref, setPref } from './prefs';

const KEY = 'yol_sezon';
export type SeasonState = { idx: number; xp: number; alinan: string[] };

function fresh(): SeasonState {
  return { idx: seasonIndex(), xp: 0, alinan: [] };
}
function load(): SeasonState {
  try {
    const r = JSON.parse(getPref(KEY) || 'null') as SeasonState | null;
    return r && r.idx === seasonIndex() ? r : fresh();
  } catch {
    return fresh();
  }
}
let st = load();
const subs = new Set<() => void>();
function commit(next: SeasonState) {
  st = next;
  setPref(KEY, JSON.stringify(st));
  subs.forEach((f) => f());
}
/** Ay değiştiyse yeni sezon. */
function current() {
  if (st.idx !== seasonIndex()) commit(fresh());
  return st;
}

export function useSeason(): SeasonState {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => current(),
    () => st,
  );
}

export function addSeasonXp(kind: keyof typeof SEASON_XP, times = 1) {
  const s = current();
  commit({ ...s, xp: s.xp + SEASON_XP[kind] * times });
}

/** Ödül alınabilir mi: basamağa ulaşıldı, daha önce alınmadı, Şampiyon sırası için paket var. */
export const canClaim = (s: SeasonState, r: SeasonReward, pro: boolean) => tierOf(s.xp) >= r.basamak && !s.alinan.includes(r.id) && (!r.pro || pro);

export function claimReward(r: SeasonReward, pro: boolean) {
  const s = current();
  if (!canClaim(s, r, pro)) return;
  grantCosmetic(r.id);
  commit({ ...s, alinan: [...s.alinan, r.id] });
}

/** Alınabilecek bütün ödüller (Şampiyon Paketi sonradan alınınca geçmiş basamaklar da). */
export function claimAll(pro: boolean) {
  const s = current();
  const list = seasonRewards(s.idx).filter((r) => canClaim(s, r, pro));
  list.forEach((r) => grantCosmetic(r.id));
  if (list.length) commit({ ...s, alinan: [...s.alinan, ...list.map((r) => r.id)] });
  return list.length;
}

export const claimableCount = (s: SeasonState, pro: boolean) => seasonRewards(s.idx).filter((r) => canClaim(s, r, pro)).length;
