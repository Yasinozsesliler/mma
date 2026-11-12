// YOL Evreni (uygulama tarafı): kariyer kayıtları ve Menajer ajansından evren listesini kurar,
// modlar arası maçların kaydını cihazda tutar.
import { useSyncExternalStore } from 'react';
import { power } from './engine/academy';
import { COUNTRIES } from './engine/data';
import { fullName, type MgrRun } from './engine/manager';
import { lookFor } from './engine/tale';
import type { GameState } from './engine/types';
import { setEvren, setEvrenListener, type EvrenDovuscu, type EvrenOlay } from './engine/universe';
import { L } from './i18n';
import { getPref, setPref } from './prefs';

/** Kariyer yuvaları + Menajer ajansı → evren listesi */
export function buildEvren(saves: (GameState | null)[], mgr: MgrRun | null): EvrenDovuscu[] {
  const out: EvrenDovuscu[] = [];
  saves.forEach((s, i) => {
    if (!s) return;
    const f = s.fighter;
    const uyruk = COUNTRIES[f.uyruk]?.ad ?? f.uyruk;
    out.push({
      id: `k${i + 1}`,
      kaynak: 'kariyer',
      ad: f.ad,
      soyad: f.soyad,
      lakap: f.lakap || undefined,
      uyruk,
      kadin: !!f.kadin,
      siklet: f.siklet,
      stil: f.gecmis,
      guc: power(f.stats),
      rekor: `${s.rekor.g}-${s.rekor.m}-${s.rekor.b}`,
      kemer: (s.kemerler ?? []).length,
      emekli: s.phase === 'emeklilik',
      look: f.gorunum,
      nerede: L("Kariyer yuvası {0}", [i + 1]),
    });
    // Nesil modunda emekli atalar (yalnızca Evren ekranında görünür)
    for (const a of s.hanedan ?? []) {
      out.push({
        id: `k${i + 1}-n${a.nesil}`,
        kaynak: 'kariyer',
        ad: a.ad,
        soyad: a.soyad,
        lakap: a.lakap || undefined,
        uyruk,
        kadin: !!f.kadin,
        siklet: f.siklet,
        stil: f.gecmis,
        guc: 0,
        rekor: `${a.rekor.g}-${a.rekor.m}-${a.rekor.b}`,
        kemer: a.kemer,
        emekli: true,
        look: a.gorunum,
        nerede: L("{0}. nesil", [a.nesil]),
      });
    }
  });
  if (mgr && !mgr.emekli) {
    for (const f of mgr.kadro) {
      out.push({
        id: `m-${f.id}`,
        kaynak: 'menajer',
        ad: f.ad,
        soyad: f.soyad,
        lakap: f.lakap,
        uyruk: L(f.ulke),
        kadin: f.kadin,
        siklet: f.siklet,
        stil: f.stil,
        guc: f.guc,
        rekor: `${f.g}-${f.m}-${f.b}`,
        kemer: f.sampiyon ? 1 : 0,
        look: lookFor({ id: f.id, uyruk: f.ulke, kadin: f.kadin }),
        nerede: mgr.ajans,
      });
    }
  }
  return out;
}

let current: EvrenDovuscu[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function refreshEvren(saves: (GameState | null)[], mgr: MgrRun | null) {
  current = buildEvren(saves, mgr);
  setEvren(current);
  emit();
}
export const useEvren = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => current,
    () => current,
  );

// ---------- Çapraz maç kaydı ----------

const KEY = 'yol_evren_olay';
function loadLog(): EvrenOlay[] {
  try {
    return JSON.parse(getPref(KEY) || '[]') as EvrenOlay[];
  } catch {
    return [];
  }
}
let log = loadLog();
setEvrenListener((o) => {
  log = [o, ...log].slice(0, 40);
  setPref(KEY, JSON.stringify(log));
  emit();
});
export const useEvrenLog = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => log,
    () => log,
  );

/** Menajer dövüşçüsünün tam adı (Evren ekranı için) */
export const evrenName = (x: Pick<EvrenDovuscu, 'ad' | 'soyad'>) => fullName(x);
