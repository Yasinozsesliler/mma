// Sezon Kemeri durumu (cihazda, kariyerlerden bağımsız): bu sezonun puanı ve alınan ödüller. Yeni ay gelince sıfırlanır.
import { useSyncExternalStore } from 'react';
import { grantCosmetic } from './cosmetics';
import { gorevlerOf, SEASON_TIERS, SEASON_XP, seasonIndex, seasonRewards, tierOf, type GorevKind, type SeasonReward } from './engine/season';
import { weekNumber } from './engine/weeklyEvent';
import { getPref, setPref } from './prefs';

const KEY = 'yol_sezon';
/** hf: bu haftanın görev sayaçları ve alınan görevler */
export type SeasonState = { idx: number; xp: number; alinan: string[]; hf?: { w: number; say: Partial<Record<GorevKind, number>>; alinan: number[] } };
const ROZET_KEY = 'yol_sezon_rozet';

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

export const currentSeasonXp = () => current().xp;

const haftaOf = (s: SeasonState) => (s.hf && s.hf.w === weekNumber() ? s.hf : { w: weekNumber(), say: {}, alinan: [] });

/** Kalıcı Sezon Şampiyonu rozetleri: 20. basamağa ulaşılan sezonlar (sezon sıfırlansa da kalır). */
export function seasonBadges(): number[] {
  try {
    return JSON.parse(getPref(ROZET_KEY) || '[]') as number[];
  } catch {
    return [];
  }
}

function withXp(s: SeasonState, xp: number): SeasonState {
  if (tierOf(s.xp) < SEASON_TIERS && tierOf(xp) >= SEASON_TIERS && !seasonBadges().includes(s.idx)) setPref(ROZET_KEY, JSON.stringify([...seasonBadges(), s.idx]));
  return { ...s, xp };
}

export function addSeasonXp(kind: keyof typeof SEASON_XP, times = 1) {
  const s = current();
  const hf = haftaOf(s);
  const next = { ...s, hf: kind === 'gorev' || kind === 'bolum' ? hf : { ...hf, say: { ...hf.say, [kind]: (hf.say[kind as GorevKind] ?? 0) + times } } };
  commit(withXp(next, s.xp + SEASON_XP[kind] * times));
}

/** Bu haftanın görevleri ve ilerlemesi. */
export function weeklyTasks(s: SeasonState) {
  const hf = haftaOf(s);
  return gorevlerOf(hf.w).map((g, i) => ({ ...g, i, say: Math.min(g.n, hf.say[g.k] ?? 0), alindi: hf.alinan.includes(i) }));
}

export function claimWeeklyTask(i: number) {
  const s = current();
  const hf = haftaOf(s);
  const g = gorevlerOf(hf.w)[i];
  if (!g || hf.alinan.includes(i) || (hf.say[g.k] ?? 0) < g.n) return;
  commit(withXp({ ...s, hf: { ...hf, alinan: [...hf.alinan, i] } }, s.xp + SEASON_XP.gorev));
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
