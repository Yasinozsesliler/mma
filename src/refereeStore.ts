// Hakem Modu kaydı (cihazda, kariyer yuvalarından bağımsız). Motor durumu değiştirir; burada saklanır ve yayınlanır.
import { useSyncExternalStore } from 'react';
import type { RefRun } from './engine/referee';
import { getPref, setPref } from './prefs';

const KEY = 'yol_hakem';

function load(): RefRun | null {
  try {
    return JSON.parse(getPref(KEY) || 'null') as RefRun | null;
  } catch {
    return null;
  }
}
let run = load();
const subs = new Set<() => void>();

export function useRefRun(): RefRun | null {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => run,
    () => run,
  );
}

/** Motor fonksiyonunu kopya üzerinde çalıştırır, kaydeder ve ekranı yeniler. */
export function actRef(fn: (r: RefRun) => void) {
  if (!run) return;
  const next = JSON.parse(JSON.stringify(run)) as RefRun;
  fn(next);
  setRun(next);
}

export function setRun(next: RefRun | null) {
  run = next;
  setPref(KEY, next ? JSON.stringify(next) : '');
  subs.forEach((f) => f());
}
