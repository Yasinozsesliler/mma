// Efsane Yolu kontrol noktaları: her bölümün başındaki kariyer durumu (yuva başına son iki bölüm) cihazda saklanır.
// "Bölümü yeniden oyna" (ödüllü reklam) bu noktaya döner; yıldız rekoru legendPrefs'te ayrıca tutulduğu için kaybolmaz.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import type { GameState } from './engine/types';

type Point = { sig: string; bolum: number; s: string };
type Store = { cur?: Point; prev?: Point };

const key = (slot: number) => `yol_efsane_cp_${slot}`;
const cache: Record<number, Store> = {};
let active = 1;
let ver = 0;
const subs = new Set<() => void>();
const emit = () => {
  ver++;
  subs.forEach((f) => f());
};

/** Aynı kariyer mi? (yuvaya yeni bir kariyer açıldıysa eski noktalar geçersiz) */
const sigOf = (s: GameState) => `${s.efsane?.id}|${s.fighter.ad}|${s.fighter.soyad}|${s.fighter.baslangicYasi}`;

export async function loadCheckpoints(slot: number) {
  active = slot;
  // Bellekteki kopya her zaman en yenisidir (bütün yazmalar buradan geçer)
  if (cache[slot]) return emit();
  try {
    cache[slot] = JSON.parse((await AsyncStorage.getItem(key(slot))) || '{}') as Store;
  } catch {
    cache[slot] = {};
  }
  emit();
}

/** Kariyer ekranına her dönüşte çağrılır: yeni bir bölüm başladıysa o anın kopyası alınır. */
export function noteCheckpoint(slot: number, s: GameState) {
  if (!s.efsane) return;
  const st = cache[slot] ?? {};
  const sig = sigOf(s);
  const b = s.efsane.bolum;
  if (st.cur?.sig === sig && st.cur.bolum === b) return;
  const point: Point = { sig, bolum: b, s: JSON.stringify(s) };
  const next: Store = st.cur?.sig === sig && st.cur.bolum < b ? { prev: st.cur, cur: point } : { cur: point };
  cache[slot] = next;
  AsyncStorage.setItem(key(slot), JSON.stringify(next)).catch(() => undefined);
  emit();
}

export function clearCheckpoints(slot: number) {
  cache[slot] = {};
  AsyncStorage.removeItem(key(slot)).catch(() => undefined);
  emit();
}

/** Bu kariyerin "şimdiki" (bu bölümün başı) ya da "önceki" (bir önceki bölümün başı) noktası. */
export function checkpointOf(s: GameState, which: 'cur' | 'prev'): { bolum: number; s: GameState } | null {
  const p = cache[active]?.[which];
  if (!p || p.sig !== sigOf(s) || !s.efsane || p.bolum > s.efsane.bolum) return null;
  try {
    return { bolum: p.bolum, s: JSON.parse(p.s) as GameState };
  } catch {
    return null;
  }
}

/** Kartın yeniden çizilmesi için (noktalar değişince). */
export function useCheckpoints() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => ver,
    () => ver,
  );
}

/** Durumu kontrol noktasıyla değiştirir (act içinde: yerinde). */
export function restoreInto(target: GameState, snap: GameState) {
  Object.keys(target).forEach((k) => delete (target as unknown as Record<string, unknown>)[k]);
  Object.assign(target, JSON.parse(JSON.stringify(snap)));
}
