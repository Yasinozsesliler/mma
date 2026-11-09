// Şampiyon Paketi tasarımcısı: oyuncunun kendi şortu (renk, şerit, desen) ve kemeri (metal, kayış, taş).
// Dolaptaki 'sort_ozel' ve 'kem_ozel' eşyaları bu renklerle çizilir; seçimler cihazda saklanır.
import { useSyncExternalStore } from 'react';
import { cosmeticById, type Pattern } from './engine/cosmetics';
import { getPref, setPref } from './prefs';

const KEY = 'yol_ozel_kit';
export type CustomKit = { sort: [string, string]; desen: Pattern | null; desenRenk: string; kemer: [string, string, string, string] };

export const KIT_COLORS = ['#c1121f', '#e63946', '#f77f00', '#f2c14e', '#2ec4b6', '#169b62', '#1d4ed8', '#3aa8ff', '#8b5cf6', '#ff5ca8', '#111111', '#f4f8ff', '#7b1e2b', '#4b5320'];
/** Kemer metali: [açık, koyu] */
export const BELT_METALS: { ad: string; renk: [string, string] }[] = [
  { ad: 'gold', renk: ['#fff3b0', '#c9a227'] },
  { ad: 'silver', renk: ['#ffffff', '#9aa3ad'] },
  { ad: 'bronze', renk: ['#f3c9a0', '#a86b43'] },
  { ad: 'chrome', renk: ['#d0d4da', '#2a2d33'] },
  { ad: 'rose', renk: ['#ffd6d6', '#c47a7a'] },
];

const DEF: CustomKit = { sort: ['#111111', '#f2c14e'], desen: null, desenRenk: '#f2c14e', kemer: ['#fff3b0', '#c9a227', '#111111', '#e63946'] };

function load(): CustomKit {
  try {
    return { ...DEF, ...(JSON.parse(getPref(KEY) || '{}') as Partial<CustomKit>) };
  } catch {
    return DEF;
  }
}

let kit = load();
const subs = new Set<() => void>();

/** Tasarımı dolaptaki eşyalara uygular (çizim bu nesnelerden okur). */
function apply() {
  const s = cosmeticById('sort_ozel');
  if (s) {
    s.renk = [...kit.sort];
    s.desen = kit.desen ?? undefined;
    s.desenRenk = kit.desenRenk;
  }
  const k = cosmeticById('kem_ozel');
  if (k) k.renk = [...kit.kemer];
}
apply();

export function setCustomKit(p: Partial<CustomKit>) {
  kit = { ...kit, ...p };
  setPref(KEY, JSON.stringify(kit));
  apply();
  subs.forEach((f) => f());
}

export function useCustomKit(): CustomKit {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => kit,
    () => kit,
  );
}
