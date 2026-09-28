// Şampiyon Paketi durumu (tüm platformlar). Satın alma yerelde doğrulanır ve cihazda saklanır.
import { useSyncExternalStore } from 'react';
import { getPref, setPref } from '../prefs';

const KEY = 'yol_premium';
let premium = getPref(KEY) === '1';
const subs = new Set<() => void>();

export const isPremium = () => premium;

export function setPremium(v: boolean) {
  if (premium === v) return;
  premium = v;
  setPref(KEY, v ? '1' : '0');
  subs.forEach((f) => f());
}

export function usePremium(): boolean {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    isPremium,
    isPremium,
  );
}
