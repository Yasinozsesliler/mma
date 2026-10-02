// Tamamlanan meydan okumalar: cihazda tutulur (kariyer silinse de rozet kalır).
import { useSyncExternalStore } from 'react';
import { getPref, setPref } from './prefs';

const KEY = 'yol_meydan';
let done: string[] = (() => {
  try {
    return JSON.parse(getPref(KEY) || '[]') as string[];
  } catch {
    return [];
  }
})();
const subs = new Set<() => void>();

export function markChallenge(id: string) {
  if (done.includes(id)) return;
  done = [...done, id];
  setPref(KEY, JSON.stringify(done));
  subs.forEach((f) => f());
}

export function useCompletedChallenges() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => done,
    () => done,
  );
}
