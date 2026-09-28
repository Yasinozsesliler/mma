// Satın alınan ürünler (tüm platformlar). Satın alma yerelde doğrulanır ve cihazda saklanır; mağazadan geri yüklenebilir.
import { useSyncExternalStore } from 'react';
import { getPref, setPref } from '../prefs';
import { ADFREE_SKU, PREMIUM_SKU } from './skus';

const LEGACY_KEY = 'yol_premium';
const KEY = 'yol_satinalim';

function load(): ReadonlySet<string> {
  const set = new Set<string>();
  try {
    for (const x of JSON.parse(getPref(KEY) || '[]') as string[]) set.add(x);
  } catch {}
  if (getPref(LEGACY_KEY) === '1') set.add(PREMIUM_SKU);
  return set;
}

let owned = load();
const subs = new Set<() => void>();

export const owns = (sku: string) => owned.has(sku);
export const isPremium = () => owned.has(PREMIUM_SKU);
/** Geçiş reklamları kapalı mı? (Şampiyon Paketi ya da Reklamsız Paket) */
export const isAdFree = () => owned.has(PREMIUM_SKU) || owned.has(ADFREE_SKU);

export function grant(sku: string) {
  if (owned.has(sku)) return;
  owned = new Set([...owned, sku]);
  setPref(KEY, JSON.stringify([...owned]));
  if (sku === PREMIUM_SKU) setPref(LEGACY_KEY, '1');
  subs.forEach((f) => f());
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};
const snap = () => owned;

export function useOwned(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, snap, snap);
}
export const usePremium = () => useOwned().has(PREMIUM_SKU);
export const useAdFree = () => {
  const o = useOwned();
  return o.has(PREMIUM_SKU) || o.has(ADFREE_SKU);
};
