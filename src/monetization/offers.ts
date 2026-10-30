// Şampiyon Paketi teklif anları. Sakin kural: aynı oturumda en fazla bir pencere, iki pencere arası en az 3 gün;
// yenilgiden sonra hiç gösterilmez (çağıran taraflar yalnızca iyi/tarafsız anlarda çağırır).
import { useSyncExternalStore } from 'react';
import { getPref, setPref } from '../prefs';
import { isPremium } from './premium';

export type OfferReason = 'reklam' | 'yuva' | 'kemer';

const LAST_KEY = 'yol_teklif_son';
const GAP = 3 * 24 * 3600 * 1000;
let sessionAds = 0;
let shownThisSession = false;
let open: OfferReason | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

const due = () => !shownThisSession && !isPremium() && Date.now() - Number(getPref(LAST_KEY) || 0) > GAP;

export function openOffer(reason: OfferReason, force = false) {
  if (!force && !due()) return;
  shownThisSession = true;
  setPref(LAST_KEY, String(Date.now()));
  open = reason;
  notify();
}

export function closeOffer() {
  open = null;
  notify();
}

/** Ödüllü reklam izlendi: oturumdaki 3. reklamdan sonra (ödül ekranı kapanınca) bir kez teklif. */
export function noteRewardedWatched() {
  sessionAds++;
  if (sessionAds === 3) setTimeout(() => openOffer('reklam'), 1500);
}

export function useOffer(): OfferReason | null {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => open,
    () => null,
  );
}
