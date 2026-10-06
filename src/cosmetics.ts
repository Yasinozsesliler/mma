// Kozmetik durumu: kuşanılanlar ve oynayarak açılanlar (cihazda, tüm kariyerler için ortak).
import { useSyncExternalStore } from 'react';
import { cosmeticById, COSMETICS, DEFAULT_EQUIP, earnedNow, isUnlocked, type Cosmetic, type CosSlot, type UnlockCtx } from './engine/cosmetics';
import { owns, useOwned } from './monetization/premium';
import { ALL_SKUS } from './monetization/skus';
import { getPref, setPref } from './prefs';

const KEY = 'yol_kozmetik';
type CosState = { equip: Record<CosSlot, string>; acik: string[]; yeni: string[] };

function load(): CosState {
  try {
    const raw = JSON.parse(getPref(KEY) || '{}') as Partial<CosState>;
    return { equip: { ...DEFAULT_EQUIP, ...(raw.equip ?? {}) }, acik: raw.acik ?? [], yeni: raw.yeni ?? [] };
  } catch {
    return { equip: { ...DEFAULT_EQUIP }, acik: [], yeni: [] };
  }
}

let state = load();
const subs = new Set<() => void>();
function commit(next: CosState) {
  state = next;
  setPref(KEY, JSON.stringify(state));
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};
const snap = () => state;

export function useCosmetics() {
  return useSyncExternalStore(subscribe, snap, snap);
}

const ownedSet = () => new Set(ALL_SKUS.filter(owns));

/** Açılma koşullarını yeniden değerlendirir; yeni açılanlar "yeni" rozetine eklenir. */
export function refreshUnlocks(c: UnlockCtx) {
  const fresh = earnedNow(c).filter((id) => !state.acik.includes(id));
  if (fresh.length) commit({ ...state, acik: [...state.acik, ...fresh], yeni: [...state.yeni, ...fresh] });
}

export function clearNew() {
  if (state.yeni.length) commit({ ...state, yeni: [] });
}

export function equip(x: Cosmetic) {
  if (!isUnlocked(x, new Set(state.acik), ownedSet())) return;
  commit({ ...state, equip: { ...state.equip, [x.slot]: x.id } });
}

/** Kuşanılan eşya; artık sahip olunmuyorsa (ör. iade) varsayılan. */
function equipped(slot: CosSlot, owned: ReadonlySet<string>): Cosmetic {
  const x = cosmeticById(state.equip[slot]);
  if (x && isUnlocked(x, new Set(state.acik), owned)) return x;
  return cosmeticById(DEFAULT_EQUIP[slot])!;
}

export function useUnlocked() {
  const st = useCosmetics();
  const owned = useOwned();
  const earned = new Set(st.acik);
  return (x: Cosmetic) => isUnlocked(x, earned, owned);
}

/** Kafesteki dövüşçünün kıyafeti. */
export function playerKit() {
  const o = ownedSet();
  const s = equipped('sort', o);
  return { shorts: s.renk[0], trim: s.renk[1], glove: equipped('eldiven', o).renk[0], desen: s.desen, desenRenk: s.desenRenk };
}

/** Kafese giriş efekti (yoksa null). */
export function walkoutFxNow() {
  return equipped('efekt', ownedSet()).fx ?? null;
}

/** Oyuncunun avatar çerçevesi (klasik için null: ekran kendi rengini kullanır). */
export function useFrame(): string | null {
  useCosmetics();
  const x = equipped('cerceve', useOwned());
  return x.renk[0] ?? null;
}

/** Oyuncunun kemer kaplaması: [metal açık, metal koyu, kayış, taş] ya da null. */
export function useBeltSkin(): string[] | null {
  useCosmetics();
  const x = equipped('kemer', useOwned());
  return x.renk.length ? x.renk : null;
}

export function walkoutNow() {
  return equipped('giris', ownedSet()).giris ?? null;
}

export const newCount = () => state.yeni.length;
export const ALL_COSMETICS = COSMETICS;
