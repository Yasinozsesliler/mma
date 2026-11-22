// Şampiyon Paketi teklif anları. Sakin kural: aynı oturumda en fazla bir pencere; sıradan teklifler arasında en az
// 20 saat; kilometre taşları (10. galibiyet, UCC, emeklilik, sezon sonu) bekleme süresine takılmaz ama her biri bir
// kez çıkar. Yenilgiden sonra hiç gösterilmez (çağıran taraflar yalnızca iyi/tarafsız anlarda çağırır).
import { useSyncExternalStore } from 'react';
import { getPref, setPref } from '../prefs';
import { isPremium } from './premium';
import { noteHourAd } from './hour';

export type OfferReason = 'reklam' | 'reklam10' | 'yuva' | 'yuva5' | 'kemer' | 'galibiyet10' | 'ucc' | 'emeklilik' | 'sezon' | 'ligKemer' | 'genclik' | 'seri7';

const LAST_KEY = 'yol_teklif_son';
const GAP = 20 * 3600 * 1000;
const DAY = 24 * 3600 * 1000;
let sessionAds = 0;
let shownThisSession = false;
let open: OfferReason | null = null;
/** Geçiş reklamından sonra ekranın altında beliren küçük not */
let nudge = false;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

const due = () => !shownThisSession && !isPremium() && Date.now() - Number(getPref(LAST_KEY) || 0) > GAP;

/** force: oyuncunun kendisi açtı (kilitli yuva gibi). milestone: bekleme süresi atlanır, oturum kuralı kalır. */
export function openOffer(reason: OfferReason, mode: boolean | 'milestone' = false) {
  if (isPremium()) return;
  if (mode === 'milestone' ? shownThisSession : !mode && !due()) return;
  shownThisSession = true;
  setPref(LAST_KEY, String(Date.now()));
  open = reason;
  nudge = false;
  notify();
}

export function closeOffer() {
  open = null;
  notify();
}

/** Bir kez çıkan kilometre taşı teklifi (anahtar daha önce kullanıldıysa sessizce geçer). */
export function milestoneOffer(reason: OfferReason, key: string, delay = 900) {
  if (isPremium() || getPref(key) === '1' || shownThisSession) return;
  setPref(key, '1');
  setTimeout(() => openOffer(reason, 'milestone'), delay);
}

/** Ödüllü reklam izlendi: oturumdaki 3. reklamdan sonra bir kez; ayrıca 10 reklamda bir (en fazla haftada bir). */
export function noteRewardedWatched() {
  sessionAds++;
  // Şampiyon Saati bu reklamla kazanıldıysa araya satış penceresi girmesin.
  if (noteHourAd()) return;
  const n = Number(getPref('yol_odullu_sayac') || 0) + 1;
  setPref('yol_odullu_sayac', String(n));
  const weekly = n >= 10 && Date.now() - Number(getPref('yol_teklif_reklam10') || 0) > 7 * DAY;
  if (weekly && !shownThisSession && !isPremium()) {
    setPref('yol_teklif_reklam10', String(Date.now()));
    setPref('yol_odullu_sayac', '0');
    setTimeout(() => openOffer('reklam10', 'milestone'), 1500);
  } else if (sessionAds === 3) setTimeout(() => openOffer('reklam'), 1500);
}

/** Kaç ödüllü reklam izlendi (haftalık teklif metninde). */
export const rewardedCount = () => Math.max(10, Number(getPref('yol_odullu_sayac') || 0));

/** Geçiş reklamı kapandı: günde en fazla bir kez küçük "reklamsız oyna" notu. */
export function noteInterstitialShown() {
  if (isPremium() || shownThisSession) return;
  if (Date.now() - Number(getPref('yol_teklif_gecis') || 0) < DAY) return;
  setPref('yol_teklif_gecis', String(Date.now()));
  nudge = true;
  notify();
}

export function closeNudge() {
  nudge = false;
  notify();
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

export function useOffer(): OfferReason | null {
  return useSyncExternalStore(subscribe, () => open, () => null);
}

export function useNudge(): boolean {
  return useSyncExternalStore(subscribe, () => nudge, () => false);
}
