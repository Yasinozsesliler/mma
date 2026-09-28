// Web: reklam ve satın alma yok (web sürümü tamamen ücretsiz ve reklamsız). Arayüz yerel sürümle aynıdır.
export { isAdFree, isPremium, owns, useAdFree, useOwned, usePremium } from './premium';

export const MONETIZATION = false;

export async function initMonetization() {}
export function showRewarded(): Promise<'odul' | 'iptal' | 'yok'> {
  return Promise.resolve('yok');
}
export const rewardedAvailable = () => false;
export const adPrivacyRequired = () => false;
export async function showAdPrivacyOptions() {}
export async function maybeInterstitial(_careerFights: number): Promise<boolean> {
  return false;
}
export function usePrice(_sku: string): string | null {
  return null;
}
export const usePremiumPrice = () => null;
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
