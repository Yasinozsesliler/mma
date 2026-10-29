// Efsane Yolları: her efsanenin en iyi yıldız sayısı ve tamamlanma durumu cihazda tutulur (kariyer silinse de kalır).
import { useSyncExternalStore } from 'react';
import { getPref, setPref } from './prefs';

const KEY = 'yol_efsane';
export type LegendBest = Record<string, { yildiz: number; bitti?: boolean }>;

let best: LegendBest = (() => {
  try {
    return JSON.parse(getPref(KEY) || '{}') as LegendBest;
  } catch {
    return {};
  }
})();
const subs = new Set<() => void>();

export function saveLegendBest(id: string, yildiz: number, bitti: boolean) {
  const cur = best[id];
  if (cur && cur.yildiz >= yildiz && (cur.bitti || !bitti)) return;
  best = { ...best, [id]: { yildiz: Math.max(cur?.yildiz ?? 0, yildiz), bitti: !!cur?.bitti || bitti } };
  setPref(KEY, JSON.stringify(best));
  subs.forEach((f) => f());
}

export function useLegendBest() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => best,
    () => best,
  );
}
