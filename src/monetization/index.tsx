// Yerel (Android): AdMob ödüllü + geçiş reklamları ve Google Play satın alma (Şampiyon Paketi).
// Web sürümü reklamsızdır (index.web.tsx).
import { isUserCancelledError, useIAP } from 'expo-iap';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import mobileAds, { AdEventType, AdsConsent, InterstitialAd, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { track } from '../analytics';
import { pushScene } from '../audio/engine';
import { AD_IDS } from './ids';
import { grant, isAdFree, isPremium, owns } from './premium';
import { ALL_SKUS, PREMIUM_SKU } from './skus';

import { initRevenueCat, rcRecordPurchase, rcSync } from './revenuecat';
import { noteRewardedWatched } from './offers';
import { noteAdShown } from './upsell';
import { hourActive } from './hour';
export { hasAll, isAdFree, isPremium, owns, useAdFree, useOwned, usePremium } from './premium';

/** Bu platformda reklam ve satın alma var mı? */
export const MONETIZATION = true;
/** Uygulama içi satın almalar (Şampiyon Paketi, Reklamsız Paket): her iki platformda açık. */
export const PURCHASES = true;
/** Dolaptaki tek tek kozmetik paket mağazası kapalı; kozmetikler Şampiyon + Koleksiyon ile gelir (iPhone ve Android aynı). */
export const PACK_STORE = false;
/** Efsaneler Paketi, Şampiyon + Koleksiyon ve kilitli efsanelerin 1. bölüm denemesi (iPhone ve Android). */
export const LEGENDS_STORE = true;
/** Antrenör Modu (antrenor_modu) — iPhone ve Android. */
export const COACH_STORE = true;
/** Hakem Modu (hakem_modu) — iPhone ve Android. */
export const REF_STORE = true;
/** Menajer Modu (menajer_modu): mağaza ürünleri açılana kadar mobilde kapalı (web'de açık). */
export const MGR_STORE = true;
export { dismissUpsell, useUpsellDue } from './upsell';
export { HOUR_GOAL, hourActive, startHour, takeHourEndOffer, useHour } from './hour';
export { closeShop, currentDeal, dealSeen, fmtLeft, markDealSeen, maybeStartBeltDeal, maybeStartWelcome, openShop, useDeal, useNow, useShop, type Deal, type DealKind } from './deals';
export { closeNudge, closeOffer, milestoneOffer, noteInterstitialShown, openOffer, rewardedCount, useNudge, useOffer, type OfferReason } from './offers';

// ---------- Reklamlar ----------

let started = false;
let canAds = false;
let privacyRequired = false;
let rewarded: RewardedAd | null = null;
let rewardedReady = false;
let interstitial: InterstitialAd | null = null;
let interstitialReady = false;

/** Uygulama açılışında: gerekiyorsa (AB/İngiltere) izin formu, ardından reklam SDK'sı ve ilk reklamların yüklenmesi. */
export async function initMonetization() {
  if (started) return;
  started = true;
  try {
    const info = await AdsConsent.gatherConsent();
    canAds = info.canRequestAds;
    privacyRequired = info.privacyOptionsRequirementStatus === 'REQUIRED';
  } catch {
    try {
      canAds = (await AdsConsent.getConsentInfo()).canRequestAds;
    } catch {
      canAds = false;
    }
  }
  if (!canAds) return;
  // iPhone: reklam kimliği yalnızca Apple'ın izin penceresiyle (ATT). AdMob'daki açıklama mesajı pencereyi zaten
  // açtıysa bu çağrı yalnızca durumu döndürür; açmadıysa pencere burada, reklamlar istenmeden önce çıkar.
  if (Platform.OS === 'ios') await requestTrackingPermissionsAsync().catch(() => undefined);
  await mobileAds()
    .initialize()
    .catch(() => undefined);
  loadRewarded();
  if (!isAdFree()) loadInterstitial();
}

// Yükleme: aynı anda tek istek; başarısız olursa bekleme her seferinde ikiye katlanır (1 → 2 → 4 … en fazla 10 dk),
// başarıda sıfırlanır. Oyuncu uygulamaya dönünce ya da reklam anı gelip reklam hazır değilse bekleme atlanır.
type Slot = { loading: boolean; fails: number; timer: ReturnType<typeof setTimeout> | null };
const rSlot: Slot = { loading: false, fails: 0, timer: null };
const iSlot: Slot = { loading: false, fails: 0, timer: null };
const backoff = (fails: number) => Math.min(600_000, 60_000 * 2 ** Math.max(0, fails - 1));

function retryLater(slot: Slot, load: () => void) {
  slot.loading = false;
  slot.fails++;
  if (slot.timer) clearTimeout(slot.timer);
  slot.timer = setTimeout(() => {
    slot.timer = null;
    load();
  }, backoff(slot.fails));
}

/** Bekleyen denemeyi iptal edip hemen yükler (hazır değilse ve şu an yüklenmiyorsa). */
function loadNow(slot: Slot, ready: boolean, load: () => void) {
  if (ready || slot.loading || !started || !canAds) return;
  if (slot.timer) clearTimeout(slot.timer);
  slot.timer = null;
  load();
}

function loadRewarded() {
  if (rSlot.loading) return;
  try {
    rSlot.loading = true;
    const ad = RewardedAd.createForAdRequest(AD_IDS.rewarded);
    rewarded = ad;
    rewardedReady = false;
    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewardedReady = true;
      rSlot.loading = false;
      rSlot.fails = 0;
    });
    ad.addAdEventListener(AdEventType.ERROR, () => {
      // Gösterim sırasındaki hata showRewarded'da ele alınır; burada yalnızca yükleme hatası yeniden denenir
      if (rewardedReady) return;
      retryLater(rSlot, loadRewarded);
    });
    ad.load();
  } catch {
    retryLater(rSlot, loadRewarded);
  }
}

function loadInterstitial() {
  if (iSlot.loading || isAdFree()) return;
  try {
    iSlot.loading = true;
    const ad = InterstitialAd.createForAdRequest(AD_IDS.interstitial);
    interstitial = ad;
    interstitialReady = false;
    ad.addAdEventListener(AdEventType.LOADED, () => {
      interstitialReady = true;
      iSlot.loading = false;
      iSlot.fails = 0;
    });
    ad.addAdEventListener(AdEventType.ERROR, () => {
      if (interstitialReady) return;
      retryLater(iSlot, loadInterstitial);
    });
    ad.load();
  } catch {
    retryLater(iSlot, loadInterstitial);
  }
}

// Uygulamaya dönüldüğünde hazır olmayan reklamlar beklemeden yeniden istenir.
AppState.addEventListener('change', (st) => {
  if (st !== 'active') return;
  loadNow(rSlot, rewardedReady, loadRewarded);
  loadNow(iSlot, interstitialReady, loadInterstitial);
});

/**
 * Ödüllü reklam. Şampiyon Paketi sahiplerine ödül reklamsız ve anında verilir.
 * 'odul': ödül kazanıldı · 'iptal': reklam yarıda kapatıldı · 'yok': şu an reklam yok (internet/doluluk)
 */
/** Reklam hazır değilse yüklenmesini en fazla `ms` bekler (yükleme hata verirse erken bırakır). */
function waitRewarded(ms: number): Promise<boolean> {
  loadNow(rSlot, rewardedReady, loadRewarded);
  const end = Date.now() + ms;
  return new Promise((resolve) => {
    const tick = () => {
      if (rewardedReady) return resolve(true);
      if (!rSlot.loading || Date.now() > end) return resolve(false);
      setTimeout(tick, 250);
    };
    tick();
  });
}

/** Hangi teklifin sonuçlandığını olay adında taşır (GA'da özel boyut tanımlamadan kırılım). */
const rwTrack = (yer: string, r: 'odul' | 'iptal' | 'yok' | 'gor') => {
  const y = yer.replace(/[^a-z0-9]/gi, '_').slice(0, 24);
  track(`rw_${r}_${y}`);
};
const seenOffers = new Set<string>();
/** Teklif ekranda göründü (oturumda yer başına bir kez sayılır). */
export function noteRewardedOffer(yer: string) {
  if (!canAds || isPremium() || seenOffers.has(yer)) return;
  seenOffers.add(yer);
  rwTrack(yer, 'gor');
}

export async function showRewarded(yer = 'genel'): Promise<'odul' | 'iptal' | 'yok'> {
  if (isPremium() || hourActive()) return 'odul';
  // Hazır değilse hemen "reklam yok" demek yerine birkaç saniye yüklenmesini bekle
  if ((!rewarded || !rewardedReady) && canAds && started && !(await waitRewarded(8000))) {
    track('rewarded_ad', { sonuc: 'yok', yer });
    rwTrack(yer, 'yok');
    return 'yok';
  }
  const ad = rewarded;
  if (!ad || !rewardedReady) {
    track('rewarded_ad', { sonuc: 'yok', yer });
    rwTrack(yer, 'yok');
    return 'yok';
  }
  return new Promise((resolve) => {
    let earned = false;
    const unmute = pushScene('off'); // reklam sesi oyunun müziğiyle karışmasın
    const offs: (() => void)[] = [];
    const done = (r: 'odul' | 'iptal' | 'yok') => {
      offs.forEach((f) => f());
      unmute();
      rewardedReady = false;
      loadRewarded();
      track('rewarded_ad', { sonuc: r, yer });
      rwTrack(yer, r);
      if (r === 'odul') noteRewardedWatched();
      resolve(r);
    };
    offs.push(ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => (earned = true)));
    offs.push(ad.addAdEventListener(AdEventType.CLOSED, () => done(earned ? 'odul' : 'iptal')));
    offs.push(ad.addAdEventListener(AdEventType.ERROR, () => done(earned ? 'odul' : 'yok')));
    ad.show().catch(() => done('yok'));
  });
}

export const rewardedAvailable = () => isPremium() || (canAds && rewardedReady);

/** AB/İngiltere kullanıcıları reklam iznini sonradan değiştirebilmeli. */
export const adPrivacyRequired = () => privacyRequired;
export async function showAdPrivacyOptions() {
  try {
    const info = await AdsConsent.showPrivacyOptionsForm();
    canAds = info.canRequestAds;
  } catch {}
}

let fightsSinceAd = 0;
let lastAdAt = 0;

/** Maç sonrası geçiş reklamı (oyuncuyu bunaltmadan): ilk 5 dövüş reklamsız, sonra en az 4 dövüşte ve 6 dakikada bir;
 *  mağlubiyetten hemen sonra hiç gösterilmez (kötü anı reklamla bölmeyiz). */
export async function maybeInterstitial(careerFights: number, afterLoss = false): Promise<boolean> {
  if (isAdFree() || hourActive() || !canAds) return false;
  fightsSinceAd++;
  if (afterLoss || careerFights < 5 || fightsSinceAd < 4 || Date.now() - lastAdAt < 360_000) return false;
  const ad = interstitial;
  if (!ad || !interstitialReady) {
    // Reklam anı geldi ama hazır değil: bir sonraki an için hemen dene
    loadNow(iSlot, interstitialReady, loadInterstitial);
    return false;
  }
  await new Promise<void>((resolve) => {
    const unmute = pushScene('off');
    const offs: (() => void)[] = [];
    const done = () => {
      offs.forEach((f) => f());
      unmute();
      resolve();
    };
    offs.push(ad.addAdEventListener(AdEventType.CLOSED, done));
    offs.push(ad.addAdEventListener(AdEventType.ERROR, done));
    ad.show().catch(done);
  });
  fightsSinceAd = 0;
  lastAdAt = Date.now();
  noteAdShown();
  track('interstitial_shown', { mac_no: careerFights });
  loadInterstitial();
  return true;
}

// ---------- Satın alma (Google Play) ----------

type BuyResult = 'ok' | 'iptal' | 'hata';
let prices: Record<string, string> = {};
/** Sayısal fiyat ve para birimi ("ayrı ayrı alsan" toplamı ve indirim oranı için) */
let amounts: Record<string, { n: number; cur: string }> = {};
const priceSubs = new Set<() => void>();
let buyFn: ((sku: string) => Promise<unknown>) | null = null;
let fetchFn: (() => Promise<unknown>) | null = null;
let restoreFn: (() => Promise<unknown>) | null = null;
let pending: { sku: string; resolve: (r: BuyResult) => void } | null = null;

const settle = (r: BuyResult) => {
  // Sonuç olay adında: Analytics'te özel boyut tanımlamadan vazgeçme ile hatayı ve ürünü ayırabilmek için
  if (pending) {
    track(r === 'ok' ? 'iap_success' : 'iap_fail', { sku: pending.sku, sonuc: r });
    track(`iap_${r === 'ok' ? 'ok' : r === 'iptal' ? 'cancel' : 'error'}_${pending.sku}`.slice(0, 40));
  }
  pending?.resolve(r);
  pending = null;
};

/** Ürünün mağazadaki yerel fiyatı (yüklenmediyse null). */
export function usePrice(sku: string): string | null {
  return useSyncExternalStore(
    (f) => {
      priceSubs.add(f);
      return () => void priceSubs.delete(f);
    },
    () => prices[sku] ?? null,
    () => null,
  );
}
export const usePremiumPrice = () => usePrice(PREMIUM_SKU);

/** Ürünlerin sayısal fiyatı (yüklenmediyse null). Bileşen başına bir kez çağrılır: hepsi gelince dolar. */
export function useAmounts(skus: string[]): ({ n: number; cur: string } | null)[] {
  const key = useSyncExternalStore(
    (f) => {
      priceSubs.add(f);
      return () => void priceSubs.delete(f);
    },
    () => skus.map((k) => (amounts[k] ? `${amounts[k].n}${amounts[k].cur}` : '')).join('|'),
    () => '',
  );
  return key.split('|').map((_, i) => amounts[skus[i]] ?? null);
}

export function buy(sku: string): Promise<BuyResult> {
  if (!buyFn) return Promise.resolve('hata');
  settle('iptal');
  track('iap_start', { sku });
  return new Promise((resolve) => {
    pending = { sku, resolve };
    // Ürün listesi henüz gelmediyse önce yeniden istenir (mağaza ilk açılışta geç cevap verebiliyor)
    const go = prices[sku] ? Promise.resolve() : (fetchFn?.() ?? Promise.resolve()).catch(() => undefined);
    void go.then(() => buyFn!(sku)).catch(() => settle('hata'));
  });
}
export const buyPremium = () => buy(PREMIUM_SKU);

/** Önceki satın alımları mağazadan geri yükler; en az bir ürün bulunduysa true. */
export async function restorePurchases(): Promise<boolean> {
  if (!restoreFn) return false;
  await restoreFn().catch(() => undefined);
  void rcSync();
  // Liste durum güncellemesiyle gelir; bir sonraki çizimde işlenmesini bekle.
  await new Promise((r) => setTimeout(r, 400));
  return ALL_SKUS.some(owns);
}
export const restorePremium = restorePurchases;

/** Uygulama kökünde bir kez bulunur: mağaza bağlantısını, ürünleri ve önceki satın alımları yönetir. */
export function PremiumManager() {
  return PURCHASES ? <StoreManager /> : null;
}

/** App Store'daki öne çıkan satın almaya dokunulduysa mağaza bağlanınca satın alma başlatılır (iOS). */
let promotedSku: string | null = null;
const startPromoted = () => {
  if (!promotedSku || !buyFn) return;
  const sku = promotedSku;
  promotedSku = null;
  if (ALL_SKUS.includes(sku)) void buyFn(sku).catch(() => undefined);
};

function StoreManager() {
  const { connected, products, availablePurchases, fetchProducts, requestPurchase, finishTransaction, getAvailablePurchases } = useIAP({
    onPromotedProductIOS: (product) => {
      promotedSku = product.id;
      startPromoted();
    },
    onPurchaseSuccess: async (purchase) => {
      if (!ALL_SKUS.includes(purchase.productId)) return;
      grant(purchase.productId);
      await rcRecordPurchase(purchase.productId);
      // Onaylanmayan satın alımlar 3 gün sonra iade edilir.
      await finishTransaction({ purchase, isConsumable: false }).catch(() => undefined);
      if (pending?.sku === purchase.productId) settle('ok');
    },
    onPurchaseError: (error) => settle(isUserCancelledError(error) ? 'iptal' : 'hata'),
  });

  // Ürünler gelene kadar artan aralıklarla yeniden istenir; uygulama öne gelince de tekrar denenir.
  // (Tek istek boş dönerse fiyatlar hiç görünmüyor, satın alma düğmeleri çalışmıyordu.)
  const loaded = products.length > 0;
  useEffect(initRevenueCat, []);
  useEffect(() => {
    if (!connected) return;
    void getAvailablePurchases().catch(() => undefined);
  }, [connected, getAvailablePurchases]);
  useEffect(() => {
    if (!connected || loaded) return;
    let n = 0;
    let t: ReturnType<typeof setTimeout> | undefined;
    const tryFetch = () => {
      void fetchProducts({ skus: ALL_SKUS, type: 'in-app' }).catch(() => undefined);
      n++;
      if (n < 8) t = setTimeout(tryFetch, Math.min(30_000, 2_000 * 2 ** n));
    };
    tryFetch();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && void fetchProducts({ skus: ALL_SKUS, type: 'in-app' }).catch(() => undefined));
    return () => {
      if (t) clearTimeout(t);
      sub.remove();
    };
  }, [connected, loaded, fetchProducts]);

  // Daha önce (bu ya da başka bir cihazda) satın alınanları geri ver.
  useEffect(() => {
    const found = new Set<string>();
    for (const p of availablePurchases) {
      if (!ALL_SKUS.includes(p.productId) || found.has(p.productId)) continue;
      found.add(p.productId);
      grant(p.productId);
      void finishTransaction({ purchase: p, isConsumable: false }).catch(() => undefined);
    }
  }, [availablePurchases, finishTransaction]);

  const key = products.map((p) => `${p.id}=${p.displayPrice}`).join('|');
  useEffect(() => {
    prices = Object.fromEntries(products.map((p) => [p.id, p.displayPrice]));
    amounts = Object.fromEntries(products.filter((p) => typeof p.price === 'number' && p.price > 0).map((p) => [p.id, { n: p.price as number, cur: p.currency }]));
    priceSubs.forEach((f) => f());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    buyFn = connected ? (sku) => requestPurchase({ request: { google: { skus: [sku] }, apple: { sku } }, type: 'in-app' }) : null;
    restoreFn = connected ? () => getAvailablePurchases() : null;
    fetchFn = connected ? () => fetchProducts({ skus: ALL_SKUS, type: 'in-app' }) : null;
    startPromoted();
  }, [connected, requestPurchase, getAvailablePurchases, fetchProducts]);

  return null;
}
