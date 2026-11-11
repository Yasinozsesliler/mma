// Menajer Modu kaydı (cihazda, kariyer yuvalarından bağımsız). İki yuva: kalıcı ajans kariyeri ve haftalık meydan okuma.
// Motor durumu değiştirir; burada saklanır ve yayınlanır.
import { useSyncExternalStore } from 'react';
import { ensureMgr, type MgrHall, type MgrRun } from './engine/manager';
import { getPref, setPref } from './prefs';

export type MgrSlot = 'kariyer' | 'meydan';
const KEYS: Record<MgrSlot, string> = { kariyer: 'yol_menajer', meydan: 'yol_menajer_meydan' };

function load(k: MgrSlot): MgrRun | null {
  try {
    const r = JSON.parse(getPref(KEYS[k]) || 'null') as MgrRun | null;
    return r ? ensureMgr(r) : null;
  } catch {
    return null;
  }
}
const runs: Record<MgrSlot, MgrRun | null> = { kariyer: load('kariyer'), meydan: load('meydan') };
let slot: MgrSlot = 'kariyer';
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const sub = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

export function useMgrRun(): MgrRun | null {
  return useSyncExternalStore(sub, () => runs[slot], () => runs[slot]);
}
export function useMgrSlot(): MgrSlot {
  return useSyncExternalStore(sub, () => slot, () => slot);
}
/** Kariyer yuvasındaki kayıt (meydan okumadayken başlangıç ekranı için) */
export const peekRun = (k: MgrSlot) => runs[k];

export function setMgrSlot(k: MgrSlot) {
  slot = k;
  emit();
}

/** Motor fonksiyonunu kopya üzerinde çalıştırır, kaydeder ve ekranı yeniler. Fonksiyonun dönüşünü geri verir. */
export function actMgr<T>(fn: (r: MgrRun) => T): T | undefined {
  const cur = runs[slot];
  if (!cur) return undefined;
  const next = JSON.parse(JSON.stringify(cur)) as MgrRun;
  const out = fn(next);
  setMgrRun(next);
  return out;
}

export function setMgrRun(next: MgrRun | null, k: MgrSlot = slot) {
  runs[k] = next;
  setPref(KEYS[k], next ? JSON.stringify(next) : '');
  emit();
}

// ---------- Meydan okuma rekoru (hafta kodu başına en iyi skor) ----------

const BEST = 'yol_menajer_meydan_rekor';
export function meydanBest(): { kod: string; skor: number } | null {
  try {
    return JSON.parse(getPref(BEST) || 'null');
  } catch {
    return null;
  }
}
export function saveMeydanBest(kod: string, skor: number) {
  const b = meydanBest();
  if (!b || b.kod !== kod || skor > b.skor) setPref(BEST, JSON.stringify({ kod, skor }));
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

/** Ajansı kapat: kariyer Onur Listesi'ne yazılır, kayıt silinir. Meydan okuma yalnızca silinir. */
export function closeAgency() {
  const run = runs[slot];
  if (!run) return;
  if (slot === 'kariyer') {
    const e: MgrHall = { ad: `${run.ad} ${run.soyad}`.trim(), ajans: run.ajans, hafta: run.hafta, sampiyonluk: run.sampiyonluk, gelir: run.gelir, oduller: run.oduller.length, tarih: Date.now() };
    hall = [e, ...hall].slice(0, 20);
    setPref(HALL, JSON.stringify(hall));
    hallSubs.forEach((f) => f());
  }
  setMgrRun(null);
}
