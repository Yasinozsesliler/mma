// Titreşim: sert darbede, nakavtta ve mini oyunlarda telefon hissettirir. Menüden kapatılabilir.
// Web'de tarayıcının titreşim desteği varsa çalışır (Android Chrome), yoksa sessizce hiçbir şey yapmaz.
import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';
import { getPref, setPref } from './prefs';

const KEY = 'yol_titresim';
let on = getPref(KEY) !== '0';
const subs = new Set<() => void>();

export function setHaptics(v: boolean) {
  on = v;
  setPref(KEY, v ? '1' : '0');
  subs.forEach((f) => f());
}

export function useHaptics() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => on,
    () => on,
  );
}

export type Buzz = 'hafif' | 'orta' | 'guclu' | 'hata' | 'basari' | 'nakavt';

let last = 0;

export function buzz(kind: Buzz) {
  if (!on) return;
  // Art arda gelen darbelerde telefonu sürekli titretmemek için kısa bir ara.
  const t = Date.now();
  if (kind !== 'nakavt' && t - last < 60) return;
  last = t;
  const p =
    kind === 'hafif'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : kind === 'orta'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        : kind === 'guclu'
          ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
          : kind === 'hata'
            ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            : kind === 'basari'
              ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).then(() => new Promise((r) => setTimeout(r, 120))).then(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  p.catch(() => {});
}
