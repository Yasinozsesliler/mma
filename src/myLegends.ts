// Efsanelerim: emekli olan dövüşçüler zirvedeki halleriyle kaydedilir; Hayalî Maç Stüdyosu'nda efsanelere karşı dövüşür.
// Ücretsiz sürümde 1 kayıt, Şampiyon Paketi (ve web) ile 10.
import { useSyncExternalStore } from 'react';
import type { DreamFighter } from './engine/dreamFight';
import { lookFor } from './engine/tale';
import type { GameState } from './engine/types';
import { STAT_KEYS } from './engine/types';
import { getPref, setPref } from './prefs';

const KEY = 'yol_efsanelerim';
export type MyLegend = DreamFighter & { kemer: number; tarih: number };

export const myLegendLimit = (premium: boolean) => (premium ? 10 : 1);

function load(): MyLegend[] {
  try {
    return JSON.parse(getPref(KEY) || '[]') as MyLegend[];
  } catch {
    return [];
  }
}
let list = load();
const subs = new Set<() => void>();
function commit(next: MyLegend[]) {
  list = next;
  setPref(KEY, JSON.stringify(list));
  subs.forEach((f) => f());
}

export function useMyLegends(): MyLegend[] {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => list,
    () => list,
  );
}

/** Kariyerin kimliği: aynı dövüşçü iki kez kaydedilmesin. */
const keyOf = (s: GameState) => `my-${s.fighter.ad}-${s.fighter.soyad}-${s.nesil ?? 1}-${s.rekor.g}-${s.rekor.m}-${s.rekor.b}`;

export const isMyLegend = (s: GameState) => list.some((x) => x.key === keyOf(s));

/** Zirve istatistikleri (eski kayıtlarda o an tutulmadıysa bugünkü hali). */
export function myLegendOf(s: GameState): MyLegend {
  const z = s.zirveStats ?? s.fighter.stats;
  const stats = { ...s.fighter.stats };
  STAT_KEYS.forEach((k) => (stats[k] = Math.max(stats[k], z[k] ?? 0)));
  return {
    key: keyOf(s),
    ad: s.fighter.ad,
    soyad: s.fighter.soyad,
    lakap: s.fighter.lakap,
    uyruk: s.fighter.uyruk,
    memleket: s.fighter.memleket,
    gecmis: s.fighter.gecmis,
    gorunum: lookFor({ id: s.fighter.ad + s.fighter.soyad, uyruk: s.fighter.uyruk, kadin: s.fighter.kadin, gorunum: s.fighter.gorunum }),
    boy: s.fighter.boy,
    siklet: s.fighter.siklet,
    stats,
    rekor: { g: s.rekor.g, m: s.rekor.m, b: s.rekor.b },
    kadin: s.fighter.kadin ?? s.fighter.gorunum?.kadin,
    kemer: (s.kemerler ?? []).length,
    tarih: Date.now(),
  };
}

/** 'ok' · 'var' (zaten kayıtlı) · 'dolu' (sınıra ulaşıldı) */
export function saveMyLegend(s: GameState, premium: boolean): 'ok' | 'var' | 'dolu' {
  if (isMyLegend(s)) return 'var';
  if (list.length >= myLegendLimit(premium)) return 'dolu';
  commit([...list, myLegendOf(s)]);
  return 'ok';
}

export function removeMyLegend(key: string) {
  commit(list.filter((x) => x.key !== key));
}
