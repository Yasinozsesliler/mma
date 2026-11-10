// Şampiyon Saati: 10 ödüllü reklam izleyen oyuncu, istediği an başlatacağı 1 saatlik tadımlık hak kazanır.
// Geçiş reklamı çıkmaz, ödüller reklamsız alınır. Yuva ve efsane açmaz: süre bitince oyuncu kilitli içerikte kalmasın.
import { useSyncExternalStore } from 'react';
import { track } from '../analytics';
import { getPref, setPref } from '../prefs';

const KEY = 'yol_saat';
export const HOUR_GOAL = 10;
const SURE = 3600 * 1000;

type St = { n: number; hak: boolean; bitis?: number; teklif?: boolean };

function load(): St {
  try {
    const r = JSON.parse(getPref(KEY) || '{}') as Partial<St>;
    return { n: r.n ?? 0, hak: !!r.hak, bitis: r.bitis, teklif: r.teklif };
  } catch {
    return { n: 0, hak: false };
  }
}

let st = load();
const subs = new Set<() => void>();
function commit(next: St) {
  st = next;
  setPref(KEY, JSON.stringify(st));
  subs.forEach((f) => f());
}

export const hourActive = (now = Date.now()) => !!st.bitis && now < st.bitis;

/** İzlenen ödüllü reklamı sayar. Hak bu reklamla kazanıldıysa true döner. */
export function noteHourAd(): boolean {
  if (st.hak || hourActive()) return false;
  const n = st.n + 1;
  if (n < HOUR_GOAL) {
    commit({ ...st, n });
    return false;
  }
  commit({ ...st, n: 0, hak: true });
  track('hour_earned', {});
  return true;
}

export function startHour() {
  if (!st.hak || hourActive()) return;
  commit({ n: st.n, hak: false, bitis: Date.now() + SURE });
  track('hour_start', {});
}

/** Süre bitince bir kez gösterilecek sakin teklif hakkı. */
export function takeHourEndOffer(now = Date.now()) {
  if (!st.bitis || now < st.bitis || st.teklif) return false;
  commit({ ...st, teklif: true });
  return true;
}

export function useHour() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => st,
    () => st,
  );
}
