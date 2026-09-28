// Play puan penceresi: yalnızca mutlu anlarda (kemer, galibiyet serisi, iyi günlük skor), en fazla 3 kez ve 45 günde bir.
// Google kendi kotasını da uygular; pencere çıkmasa bile oyun akışı etkilenmez.
import * as StoreReview from 'expo-store-review';
import { getPref, setPref } from '../prefs';

const KEY = 'yol_puanla';
const GAP = 45 * 24 * 3600 * 1000;

export async function askReview() {
  let st = { n: 0, t: 0 };
  try {
    st = { ...st, ...JSON.parse(getPref(KEY) || '{}') };
  } catch {}
  if (st.n >= 3 || Date.now() - st.t < GAP) return;
  try {
    if (!(await StoreReview.isAvailableAsync())) return;
    setPref(KEY, JSON.stringify({ n: st.n + 1, t: Date.now() }));
    // Ekran geçişi bitsin, sonra pencere.
    setTimeout(() => void StoreReview.requestReview().catch(() => undefined), 1200);
  } catch {}
}
