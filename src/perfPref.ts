// Hafif görüntü modu: düşük donanımlı telefonlarda dövüş sahnesi daha seyrek çizilir, seyirci ve efektler sadeleşir.
// Oyuncu menüden açıp kapatabilir; kapatmadıysa canlı dövüşte kare hızı ölçülür, telefon zorlanıyorsa kendiliğinden açılır.
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { getPref, setPref } from './prefs';

const KEY = 'yol_hafif'; // '1' açık (elle), 'oto' kendiliğinden açıldı, '0' oyuncu kapattı, yoksa ölçülmedi
let state = getPref(KEY);
// Ölçülmemiş eski Android (9 ve altı) telefonlarda yeni görünümün çizilmiş sahneleri ve ayrıntılı figürleri ağır
// gelebilir: hafif mod baştan açılır ('oto'). Oyuncu ayarlardan kapatabilir; kapatırsa bir daha açılmaz.
if (state == null && Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version < 29) {
  state = 'oto';
  setPref(KEY, state);
}
const subs = new Set<() => void>();
const set = (v: string) => {
  state = v;
  setPref(KEY, v);
  subs.forEach((f) => f());
};

export const lowPerf = () => state === '1' || state === 'oto';

export function setLowPerf(on: boolean) {
  set(on ? '1' : '0');
}

export function useLowPerf(): boolean {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    lowPerf,
    lowPerf,
  );
}

/** Sahne yenileme aralığı (ms): normalde ~30 fps, hafif modda ~20 fps. Web'de her kare. */
export const paintMs = () => (Platform.OS === 'web' ? 0 : lowPerf() ? 50 : 32);

/**
 * Kare ölçer: canlı dövüşün ilk saniyelerinde çerçeveler arası süreyi ölçer. Ortalama 34 ms'yi (≈30 fps altı)
 * aşarsa ve oyuncu modu elle seçmediyse hafif mod kendiliğinden açılır. Bir kez karar verilir.
 */
export function frameMeter() {
  let last = 0;
  let n = 0;
  let sum = 0;
  return (t: number) => {
    if (state != null || Platform.OS === 'web') return;
    if (last) {
      const dt = t - last;
      // Duraklatma ya da arka plana gitme gibi uzun boşlukları sayma
      if (dt < 250) {
        sum += dt;
        n++;
      }
    }
    last = t;
    if (n >= 150) set(sum / n > 34 ? 'oto' : '0');
  };
}
