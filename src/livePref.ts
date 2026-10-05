// Dövüş modu: canlı (raunt gerçek zamanlı oynanır) ya da taktik (izle ve karar ver). Menüden ve dövüş ekranından değişir.
import { useSyncExternalStore } from 'react';
import { getPref, setPref } from './prefs';

const KEY = 'yol_canli';
let on = getPref(KEY) !== '0';
const subs = new Set<() => void>();

export const liveOn = () => on;

export function setLive(v: boolean) {
  on = v;
  setPref(KEY, v ? '1' : '0');
  subs.forEach((f) => f());
}

export function useLive() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => on,
    () => on,
  );
}
