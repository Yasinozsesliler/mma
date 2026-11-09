// Hayalet Maç: dövüşçün bir koda çevrilir, arkadaşın kodu oyununa yapıştırınca dövüşçün onun listesine "hayalet"
// olarak girer ve yapay zekâyla dövüşür. Sunucu yok: kod dövüşçünün kendisidir. Ödül yok; yalnızca aradaki karne.
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { WEB_URL } from './appConfig';
import type { DreamFighter } from './engine/dreamFight';
import { parseGhost } from './ghostCode';
import { getPref, setPref } from './prefs';

export { ghostCode, parseGhost } from './ghostCode';
const KEY = 'yol_hayaletler';
const PENDING = 'yol_hayalet_bekleyen';
const PARAM = 'hayalet';
export const GHOST_LIMIT = 30;

export type Ghost = DreamFighter & { /** Aradaki karne (senin açından) */ g: number; m: number; b: number; eklendi: number };

/** Kodun web bağlantısı (açınca hayalet otomatik eklenir). */
export function ghostLink(code: string): string | null {
  const base = WEB_URL || (Platform.OS === 'web' && typeof location !== 'undefined' ? location.origin : '');
  return base ? `${base}/?${PARAM}=${encodeURIComponent(code)}` : null;
}

/** Web: açılış adresindeki hayalet kodunu bekleyenlere alır ve adresi temizler. */
export function readGhostFromUrl() {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return;
  try {
    const u = new URL(location.href);
    const v = u.searchParams.get(PARAM);
    if (!v) return;
    if (parseGhost(v)) setPref(PENDING, v);
    u.searchParams.delete(PARAM);
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  } catch {}
}

/** Bağlantıyla gelen, henüz eklenmemiş meydan okuma. */
export const pendingGhost = () => {
  const v = getPref(PENDING);
  return v ? parseGhost(v) : null;
};
export const clearPendingGhost = () => setPref(PENDING, '');

// ---------- Hayalet listesi (cihazda) ----------

function load(): Ghost[] {
  try {
    return JSON.parse(getPref(KEY) || '[]') as Ghost[];
  } catch {
    return [];
  }
}
let list = load();
const subs = new Set<() => void>();
function commit(next: Ghost[]) {
  list = next;
  setPref(KEY, JSON.stringify(list));
  subs.forEach((f) => f());
}

export function useGhosts(): Ghost[] {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => list,
    () => list,
  );
}

/** 'ok' · 'var' (zaten listede) · 'dolu' */
export function addGhost(f: DreamFighter): 'ok' | 'var' | 'dolu' {
  if (list.some((x) => x.key === f.key)) return 'var';
  if (list.length >= GHOST_LIMIT) return 'dolu';
  commit([{ ...f, g: 0, m: 0, b: 0, eklendi: Date.now() }, ...list]);
  return 'ok';
}

export const removeGhost = (key: string) => commit(list.filter((x) => x.key !== key));

export function recordGhost(key: string, sonuc: 'G' | 'M' | 'B') {
  commit(list.map((x) => (x.key === key ? { ...x, g: x.g + (sonuc === 'G' ? 1 : 0), m: x.m + (sonuc === 'M' ? 1 : 0), b: x.b + (sonuc === 'B' ? 1 : 0) } : x)));
}
