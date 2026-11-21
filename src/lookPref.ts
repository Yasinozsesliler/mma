// Görünüm seçimi: yeni (kartlı) ana menü ya da klasik. Oyuncu Ayarlar'dan her an değiştirebilir.
// Güncellemeden sonra yeni görünüm ilk kez açıldığında bir kez "klasiğe dönebilirsin" kartı çıkar.
import { useSyncExternalStore } from 'react';
import { setUserProp, track } from './analytics';
import { getPref, setPref } from './prefs';

export type Look = 'yeni' | 'klasik';
const KEY = 'yol_gorunum';
const INTRO = 'yol_gorunum_tanitim';

let look: Look = getPref(KEY) === 'klasik' ? 'klasik' : 'yeni';
let introSeen = getPref(INTRO) === '1';
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

export function setLook(v: Look) {
  if (v === look) return;
  look = v;
  setPref(KEY, v);
  track('look_change', { gorunum: v });
  setUserProp('gorunum', v);
  notify();
}

export function markLookIntro() {
  introSeen = true;
  setPref(INTRO, '1');
  notify();
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

/** Hook olmadan anlık görünüm (animasyon karelerinde çizilen figürler için). */
export const currentLook = (): Look => look;
export const useLook = (): Look => useSyncExternalStore(subscribe, () => look, () => look);
export const useLookIntro = (): boolean => useSyncExternalStore(subscribe, () => !introSeen, () => false);
