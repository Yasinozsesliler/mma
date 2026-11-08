// Antrenör Onur Listesi: emekli olan hocalar (bütün kariyer yuvalarından, cihazda saklanır).
import { useSyncExternalStore } from 'react';
import type { CoachLegacy } from './engine/coachDepth';
import { getPref, setPref } from './prefs';

const KEY = 'yol_hoca_onur';
let list: CoachLegacy[] = load();
const subs = new Set<() => void>();

function load(): CoachLegacy[] {
  try {
    return JSON.parse(getPref(KEY) || '[]') as CoachLegacy[];
  } catch {
    return [];
  }
}

export function addCoachLegacy(x: CoachLegacy) {
  if (list.some((y) => y.tarih === x.tarih)) return;
  list = [...list, x].sort((a, b) => b.puan - a.puan).slice(0, 20);
  setPref(KEY, JSON.stringify(list));
  subs.forEach((f) => f());
}

export function useCoachHof(): CoachLegacy[] {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => list,
    () => list,
  );
}
