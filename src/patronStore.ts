// Patron Modu kaydı (cihazda, kariyer yuvalarından bağımsız) ve kapanan organizasyonların Onur Listesi.
import { useSyncExternalStore } from 'react';
import { ensurePatron, type GeceRapor, type PatronRun, type PHall } from './engine/patron';
import { getPref, setPref } from './prefs';

const KEY = 'yol_patron';
const HALL = 'yol_patron_onur';

function load(): PatronRun | null {
  try {
    const r = JSON.parse(getPref(KEY) || 'null') as PatronRun | null;
    return r ? ensurePatron(r) : null;
  } catch {
    return null;
  }
}
let run: PatronRun | null = load();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const sub = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

export function usePatron(): PatronRun | null {
  return useSyncExternalStore(sub, () => run, () => run);
}
export const peekPatron = () => run;

export function setPatron(next: PatronRun | null) {
  run = next;
  setPref(KEY, next ? JSON.stringify(next) : '');
  emit();
}

/** Motor fonksiyonunu kopya üzerinde çalıştırır, kaydeder ve ekranı yeniler. */
export function actPatron<T>(fn: (r: PatronRun) => T): T | undefined {
  if (!run) return undefined;
  const next = JSON.parse(JSON.stringify(run)) as PatronRun;
  const out = fn(next);
  setPatron(next);
  return out;
}

// ---------- Son gece (ekranda gösterilecek rapor) ----------

let night: GeceRapor | null = null;
const nSubs = new Set<() => void>();
export function useNightReport(): GeceRapor | null {
  return useSyncExternalStore(
    (f) => {
      nSubs.add(f);
      return () => void nSubs.delete(f);
    },
    () => night,
    () => night,
  );
}
export function setNightReport(g: GeceRapor | null) {
  night = g;
  nSubs.forEach((f) => f());
}

// ---------- Onur Listesi ----------

function loadHall(): PHall[] {
  try {
    return JSON.parse(getPref(HALL) || '[]') as PHall[];
  } catch {
    return [];
  }
}
let hall = loadHall();
const hSubs = new Set<() => void>();
export function usePatronHall(): PHall[] {
  return useSyncExternalStore(
    (f) => {
      hSubs.add(f);
      return () => void hSubs.delete(f);
    },
    () => hall,
    () => hall,
  );
}

/** Kapanan organizasyonu Onur Listesi'ne yazar ve kaydı siler. */
export function archivePatron() {
  const r = run;
  if (!r) return;
  const e: PHall = { ad: r.ad, org: r.org.ad, hafta: r.hafta, gece: r.toplam.gece, unvan: r.toplam.unvan, itibar: r.itibar, son: r.kapandi ?? 'kapat', satis: r.satis, tarih: Date.now() };
  hall = [e, ...hall].slice(0, 20);
  setPref(HALL, JSON.stringify(hall));
  hSubs.forEach((f) => f());
  setPatron(null);
}
