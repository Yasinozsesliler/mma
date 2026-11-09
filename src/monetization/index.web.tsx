// Web: reklam ve satın alma yok (web sürümü tamamen ücretsiz ve reklamsız). Arayüz yerel sürümle aynıdır.
export { hasAll, isAdFree, isPremium, owns, useAdFree, useOwned, usePremium } from './premium';

export const MONETIZATION = false;
export const PURCHASES = false;
export const PACK_STORE = false;
export const LEGENDS_STORE = true;
export const COACH_STORE = true;
/** Hakem Modu şimdilik yalnızca iPhone'da (Play'de ürünü yok). */
export const REF_STORE = true;
export { dismissUpsell, useUpsellDue } from './upsell';
export { closeShop, currentDeal, dealSeen, fmtLeft, markDealSeen, maybeStartBeltDeal, maybeStartWelcome, openShop, useDeal, useNow, useShop, type Deal, type DealKind } from './deals';
export { closeNudge, closeOffer, milestoneOffer, noteInterstitialShown, openOffer, rewardedCount, useNudge, useOffer, type OfferReason } from './offers';

export async function initMonetization() {}
export function showRewarded(): Promise<'odul' | 'iptal' | 'yok'> {
  return Promise.resolve('yok');
}
export const rewardedAvailable = () => false;
export const adPrivacyRequired = () => false;
export async function showAdPrivacyOptions() {}
export async function maybeInterstitial(_careerFights: number, _afterLoss = false): Promise<boolean> {
  return false;
}
export function usePrice(_sku: string): string | null {
  return null;
}
export const usePremiumPrice = () => null;
export function useAmounts(skus: string[]): ({ n: number; cur: string } | null)[] {
  return skus.map(() => null);
}
export function buy(_sku: string): Promise<'ok' | 'iptal' | 'hata'> {
  return Promise.resolve('hata');
}
export const buyPremium = () => buy('');
export async function restorePurchases(): Promise<boolean> {
  return false;
}
export const restorePremium = restorePurchases;
export function PremiumManager() {
  return null;
}
