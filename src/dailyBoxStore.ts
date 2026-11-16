// Günlük Kutu durumu (cihaz başına, bütün kariyerler için ortak: aynı gün ikinci kariyerde yeniden açılmaz).
import { useSyncExternalStore } from 'react';
import type { BoxState } from './engine/dailyBox';
import { getPref, setPref } from './prefs';

const KEY = 'yol_kutu';

function load(): BoxState | undefined {
  try {
    const r = JSON.parse(getPref(KEY) || 'null') as BoxState | null;
    return r && typeof r.gun === 'number' ? r : undefined;
  } catch {
    return undefined;
  }
}

let st = load();
const subs = new Set<() => void>();

export const getBox = () => st;
export function setBox(next: BoxState) {
  st = next;
  setPref(KEY, JSON.stringify(st));
  subs.forEach((f) => f());
}

export function useBox(): BoxState | undefined {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => st,
    () => st,
  );
}
