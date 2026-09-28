// Yerel (Android): AdMob ödüllü + geçiş reklamları ve Google Play satın alma (Şampiyon Paketi).
// Web sürümü reklamsızdır (index.web.tsx).
import { isUserCancelledError, useIAP } from 'expo-iap';
import { useEffect, useSyncExternalStore } from 'react';
import mobileAds, { AdEventType, AdsConsent, InterstitialAd, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { pushScene } from '../audio/engine';
import { AD_IDS } from './ids';
import { grant, isAdFree, isPremium, owns } from './premium';
import { ALL_SKUS, PREMIUM_SKU } from './skus';

export { isAdFree, isPremium, owns, useAdFree, useOwned, usePremium } from './premium';

/** Bu platformda reklam ve satın alma var mı? */
export const MONETIZATION = true;

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
  await mobileAds()
    .initialize()
    .catch(() => undefined);
  loadRewarded();
  if (!isAdFree()) loadInterstitial();
}

function loadRewarded() {
  try {
    const ad = RewardedAd.createForAdRequest(AD_IDS.rewarded);
    rewarded = ad;
    rewardedReady = false;
    ad.addAdEventListener(RewardedAdEventType.LOADED, () => (rewardedReady = true));
    ad.addAdEventListener(AdEventType.ERROR, () => {
      rewardedReady = false;
      setTimeout(loadRewarded, 45_000);
    });
    ad.load();
  } catch {}
}

function loadInterstitial() {
  try {
    const ad = InterstitialAd.createForAdRequest(AD_IDS.interstitial);
    interstitial = ad;
    interstitialReady = false;
    ad.addAdEventListener(AdEventType.LOADED, () => (interstitialReady = true));
    ad.addAdEventListener(AdEventType.ERROR, () => {
      interstitialReady = false;
      setTimeout(loadInterstitial, 60_000);
    });
    ad.load();
  } catch {}
}

/**
 * Ödüllü reklam. Şampiyon Paketi sahiplerine ödül reklamsız ve anında verilir.
 * 'odul': ödül kazanıldı · 'iptal': reklam yarıda kapatıldı · 'yok': şu an reklam yok (internet/doluluk)
 */
export function showRewarded(): Promise<'odul' | 'iptal' | 'yok'> {
  if (isPremium()) return Promise.resolve('odul');
  const ad = rewarded;
  if (!ad || !rewardedReady) {
    if (started && canAds && !rewardedReady) loadRewarded();
    return Promise.resolve('yok');
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

/** Maç sonrası geçiş reklamı: en erken kariyerin 3. dövüşünden sonra, en az 3 dövüşte ve 3 dakikada bir. */
export async function maybeInterstitial(careerFights: number): Promise<boolean> {
  if (isAdFree() || !canAds) return false;
  fightsSinceAd++;
  if (careerFights < 3 || fightsSinceAd < 3 || Date.now() - lastAdAt < 180_000) return false;
  const ad = interstitial;
  if (!ad || !interstitialReady) return false;
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
  loadInterstitial();
  return true;
}

// ---------- Satın alma (Google Play) ----------

type BuyResult = 'ok' | 'iptal' | 'hata';
let prices: Record<string, string> = {};
const priceSubs = new Set<() => void>();
let buyFn: ((sku: string) => Promise<unknown>) | null = null;
let restoreFn: (() => Promise<unknown>) | null = null;
let pending: { sku: string; resolve: (r: BuyResult) => void } | null = null;

const settle = (r: BuyResult) => {
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

export function buy(sku: string): Promise<BuyResult> {
  if (!buyFn) return Promise.resolve('hata');
  settle('iptal');
  return new Promise((resolve) => {
    pending = { sku, resolve };
    buyFn!(sku).catch(() => settle('hata'));
  });
}
export const buyPremium = () => buy(PREMIUM_SKU);

/** Önceki satın alımları mağazadan geri yükler; en az bir ürün bulunduysa true. */
export async function restorePurchases(): Promise<boolean> {
  if (!restoreFn) return false;
  await restoreFn().catch(() => undefined);
  // Liste durum güncellemesiyle gelir; bir sonraki çizimde işlenmesini bekle.
  await new Promise((r) => setTimeout(r, 400));
  return ALL_SKUS.some(owns);
}
export const restorePremium = restorePurchases;

/** Uygulama kökünde bir kez bulunur: mağaza bağlantısını, ürünleri ve önceki satın alımları yönetir. */
export function PremiumManager() {
  const { connected, products, availablePurchases, fetchProducts, requestPurchase, finishTransaction, getAvailablePurchases } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      if (!ALL_SKUS.includes(purchase.productId)) return;
      grant(purchase.productId);
      // Onaylanmayan satın alımlar 3 gün sonra iade edilir.
      await finishTransaction({ purchase, isConsumable: false }).catch(() => undefined);
      if (pending?.sku === purchase.productId) settle('ok');
    },
    onPurchaseError: (error) => settle(isUserCancelledError(error) ? 'iptal' : 'hata'),
  });

  useEffect(() => {
    if (!connected) return;
    void fetchProducts({ skus: ALL_SKUS, type: 'in-app' }).catch(() => undefined);
    void getAvailablePurchases().catch(() => undefined);
  }, [connected, fetchProducts, getAvailablePurchases]);

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
    priceSubs.forEach((f) => f());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    buyFn = connected ? (sku) => requestPurchase({ request: { google: { skus: [sku] }, apple: { sku } }, type: 'in-app' }) : null;
    restoreFn = connected ? () => getAvailablePurchases() : null;
  }, [connected, requestPurchase, getAvailablePurchases]);

  return null;
}
