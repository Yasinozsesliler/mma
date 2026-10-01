// Dövüşte elle oynanan anlar (BİTİR!, KAÇ!, SIK!…): açık ya da otomatik. Menüden değiştirilir.
import { useSyncExternalStore } from 'react';
import { getPref, setPref } from './prefs';

const KEY = 'yol_qte';
let on = getPref(KEY) !== '0';
const subs = new Set<() => void>();

export const qteOn = () => on;

export function setQte(v: boolean) {
  on = v;
  setPref(KEY, v ? '1' : '0');
  subs.forEach((f) => f());
}

export function useQte() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => on,
    () => on,
  );
}
