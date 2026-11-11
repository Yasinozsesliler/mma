// Menajer Modu kaydı (cihazda, kariyer yuvalarından bağımsız). Motor durumu değiştirir; burada saklanır ve yayınlanır.
import { useSyncExternalStore } from 'react';
import type { MgrHall, MgrRun } from './engine/manager';
import { getPref, setPref } from './prefs';

const KEY = 'yol_menajer';

function load(): MgrRun | null {
  try {
    return JSON.parse(getPref(KEY) || 'null') as MgrRun | null;
  } catch {
    return null;
  }
}
let run = load();
const subs = new Set<() => void>();

export function useMgrRun(): MgrRun | null {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => run,
    () => run,
  );
}

/** Motor fonksiyonunu kopya üzerinde çalıştırır, kaydeder ve ekranı yeniler. Fonksiyonun dönüşünü geri verir. */
export function actMgr<T>(fn: (r: MgrRun) => T): T | undefined {
  if (!run) return undefined;
  const next = JSON.parse(JSON.stringify(run)) as MgrRun;
  const out = fn(next);
  setMgrRun(next);
  return out;
}

export function setMgrRun(next: MgrRun | null) {
  run = next;
  setPref(KEY, next ? JSON.stringify(next) : '');
  subs.forEach((f) => f());
}

// ---------- Onur Listesi (kapanan ajanslar) ----------

const HALL = 'yol_menajer_onur';
function loadHall(): MgrHall[] {
  try {
    return JSON.parse(getPref(HALL) || '[]') as MgrHall[];
  } catch {
    return [];
  }
}
let hall = loadHall();
const hallSubs = new Set<() => void>();

export function useMgrHall(): MgrHall[] {
  return useSyncExternalStore(
    (f) => {
      hallSubs.add(f);
      return () => void hallSubs.delete(f);
    },
    () => hall,
    () => hall,
  );
}

/** Ajansı kapat: Onur Listesi'ne yazılır, kayıt silinir. */
export function closeAgency() {
  if (!run) return;
  const e: MgrHall = { ad: `${run.ad} ${run.soyad}`.trim(), ajans: run.ajans, hafta: run.hafta, sampiyonluk: run.sampiyonluk, gelir: run.gelir, oduller: run.oduller.length, tarih: Date.now() };
  hall = [e, ...hall].slice(0, 20);
  setPref(HALL, JSON.stringify(hall));
  hallSubs.forEach((f) => f());
  setMgrRun(null);
}
