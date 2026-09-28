// Yerel (Android): AdMob ödüllü + geçiş reklamları ve Google Play satın alma (Şampiyon Paketi).
// Web sürümü reklamsızdır (index.web.tsx).
import { isUserCancelledError, useIAP } from 'expo-iap';
import { useEffect, useSyncExternalStore } from 'react';
import mobileAds, { AdEventType, AdsConsent, InterstitialAd, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { pushScene } from '../audio/engine';
import { AD_IDS, PREMIUM_SKU } from './ids';
import { isPremium, setPremium } from './premium';

export { isPremium, usePremium } from './premium';

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
  if (!isPremium()) loadInterstitial();
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
export async function maybeInterstitial(careerFights: number) {
  if (isPremium() || !canAds) return;
  fightsSinceAd++;
  if (careerFights < 3 || fightsSinceAd < 3 || Date.now() - lastAdAt < 180_000) return;
  const ad = interstitial;
  if (!ad || !interstitialReady) return;
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
}

// ---------- Satın alma (Google Play) ----------

type BuyResult = 'ok' | 'iptal' | 'hata';
let product: { price: string } | null = null;
const productSubs = new Set<() => void>();
let buyFn: (() => Promise<unknown>) | null = null;
let restoreFn: (() => Promise<unknown>) | null = null;
let pending: ((r: BuyResult) => void) | null = null;

const settle = (r: BuyResult) => {
  pending?.(r);
  pending = null;
};

export function usePremiumPrice(): string | null {
  return useSyncExternalStore(
    (f) => {
      productSubs.add(f);
      return () => void productSubs.delete(f);
    },
    () => product?.price ?? null,
    () => null,
  );
}

export function buyPremium(): Promise<BuyResult> {
  if (!buyFn) return Promise.resolve('hata');
  return new Promise((resolve) => {
    pending = resolve;
    buyFn!().catch(() => settle('hata'));
  });
}

export async function restorePremium(): Promise<boolean> {
  if (!restoreFn) return false;
  await restoreFn().catch(() => undefined);
  return isPremium();
}

/** Uygulama kökünde bir kez bulunur: mağaza bağlantısını, ürünü ve önceki satın alımları yönetir. */
export function PremiumManager() {
  const { connected, products, availablePurchases, fetchProducts, requestPurchase, finishTransaction, getAvailablePurchases } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      if (purchase.productId !== PREMIUM_SKU) return;
      setPremium(true);
      // Onaylanmayan satın alımlar 3 gün sonra iade edilir.
      await finishTransaction({ purchase, isConsumable: false }).catch(() => undefined);
      settle('ok');
    },
    onPurchaseError: (error) => settle(isUserCancelledError(error) ? 'iptal' : 'hata'),
  });

  useEffect(() => {
    if (!connected) return;
    void fetchProducts({ skus: [PREMIUM_SKU], type: 'in-app' }).catch(() => undefined);
    void getAvailablePurchases().catch(() => undefined);
  }, [connected, fetchProducts, getAvailablePurchases]);

  // Daha önce (bu ya da başka bir cihazda) satın alındıysa paketi geri ver.
  useEffect(() => {
    const owned = availablePurchases.find((p) => p.productId === PREMIUM_SKU);
    if (owned) {
      setPremium(true);
      void finishTransaction({ purchase: owned, isConsumable: false }).catch(() => undefined);
    }
  }, [availablePurchases, finishTransaction]);

  const price = products.find((p) => p.id === PREMIUM_SKU)?.displayPrice ?? null;
  useEffect(() => {
    product = price ? { price } : null;
    productSubs.forEach((f) => f());
  }, [price]);

  useEffect(() => {
    buyFn = connected ? () => requestPurchase({ request: { google: { skus: [PREMIUM_SKU] }, apple: { sku: PREMIUM_SKU } }, type: 'in-app' }) : null;
    restoreFn = connected ? () => getAvailablePurchases() : null;
  }, [connected, requestPurchase, getAvailablePurchases]);

  return null;
}
