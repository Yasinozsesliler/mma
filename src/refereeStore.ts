// Hakem Modu kaydı (cihazda, kariyer yuvalarından bağımsız). Motor durumu değiştirir; burada saklanır ve yayınlanır.
import { useSyncExternalStore } from 'react';
import type { RefRun } from './engine/referee';
import { ensureCareer } from './engine/refereeCareer';
import { hallWorthy, type HallEntry } from './engine/refereeDepth';
import { getPref, setPref } from './prefs';

const KEY = 'yol_hakem';

function load(): RefRun | null {
  try {
    const r = JSON.parse(getPref(KEY) || 'null') as RefRun | null;
    // Eski kayıtlar: kariyer alanları (görünüm, para, beceriler, teklifler…) varsayılanlarla dolar
    return r ? ensureCareer(r) : null;
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

// ---------- Onur Listesi (emekli hakemler, cihazda) ----------

const HALL = 'yol_hakem_onur';
function loadHall(): HallEntry[] {
  try {
    return JSON.parse(getPref(HALL) || '[]') as HallEntry[];
  } catch {
    return [];
  }
}
let hall = loadHall();
const hallSubs = new Set<() => void>();

export function useHall(): HallEntry[] {
  return useSyncExternalStore(
    (f) => {
      hallSubs.add(f);
      return () => void hallSubs.delete(f);
    },
    () => hall,
    () => hall,
  );
}

/** Emekli ol: kariyer Onur Listesi'ne yazılır, hakem kaydı emekli olarak işaretlenir. */
export function retireRef(yol: HallEntry['yol']) {
  if (!run) return;
  const e: HallEntry = { ad: `${run.ad} ${run.soyad}`.trim(), ulke: run.ulke ?? 'tr', mac: run.mac, seviye: run.seviye, oduller: run.oduller.length, kusursuz: run.kusursuz, onur: hallWorthy(run), yol, tarih: Date.now() };
  hall = [e, ...hall].slice(0, 20);
  setPref(HALL, JSON.stringify(hall));
  hallSubs.forEach((f) => f());
  actRef((x) => (x.emekli = true));
}
