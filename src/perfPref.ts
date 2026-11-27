// Hafif görüntü modu: düşük donanımlı telefonlarda dövüş sahnesi daha seyrek çizilir, seyirci ve efektler sadeleşir.
// Oyuncu menüden açıp kapatabilir; kapatmadıysa canlı dövüşte kare hızı ölçülür, telefon zorlanıyorsa kendiliğinden açılır.
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { getPref, setPref } from './prefs';

// '1' açık (elle), 'oto' kendiliğinden açıldı, '0' oyuncu kapattı,
// 'iyi1' / 'iyi2' ölçüldü ve akıcı (ölçüm sürüyor), 'iyi' üç dövüşte akıcı çıktı (artık ölçülmez), yoksa ölçülmedi.
const KEY = 'yol_hafif2';
const OLD_KEY = 'yol_hafif';
let state = getPref(KEY);
if (state == null) {
  // Eski kayıtta '0' hem "oyuncu kapattı" hem "ölçüldü, akıcı" demekti; ayırt edilemediği için yeniden ölçülür.
  const old = getPref(OLD_KEY);
  if (old === '1' || old === 'oto') {
    state = old;
    setPref(KEY, old);
  }
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

const measuring = () => state == null || state === 'iyi1' || state === 'iyi2';

/**
 * Kare ölçer: canlı dövüşte yaklaşık 300 kare boyunca çerçeveler arası süreyi ölçer.
 * Kasma ortalamayı pek oynatmayan ani takılmalardır; bu yüzden ortalamanın yanında takılan kare oranına da bakılır.
 * Ortalama 34 ms'yi aşarsa ya da karelerin %8'inden fazlası 50 ms'yi geçerse hafif mod kendiliğinden açılır.
 * Telefon akıcı çıkarsa karar hemen kesinleşmez: üç ayrı dövüşte akıcı çıkana kadar her dövüşte yeniden ölçülür.
 */
export function frameMeter() {
  let last = 0;
  let n = 0;
  let sum = 0;
  let jank = 0;
  let decided = false;
  return (t: number) => {
    if (decided || !measuring() || Platform.OS === 'web') return;
    if (last) {
      const dt = t - last;
      // Duraklatma ya da arka plana gitme gibi çok uzun boşlukları sayma (takılmalar 1 sn'den kısa sayılır)
      if (dt < 1000) {
        sum += dt;
        n++;
        if (dt > 50) jank++;
      }
    }
    last = t;
    if (n >= 300) {
      decided = true;
      if (sum / n > 34 || jank / n > 0.08) set('oto');
      else set(state == null ? 'iyi1' : state === 'iyi1' ? 'iyi2' : 'iyi');
    }
  };
}
