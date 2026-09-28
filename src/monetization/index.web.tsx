// Web: reklam ve satın alma yok (web sürümü tamamen ücretsiz ve reklamsız). Arayüz yerel sürümle aynıdır.
export { isPremium, usePremium } from './premium';

export const MONETIZATION = false;

export async function initMonetization() {}
export function showRewarded(): Promise<'odul' | 'iptal' | 'yok'> {
  return Promise.resolve('yok');
}
export const rewardedAvailable = () => false;
export const adPrivacyRequired = () => false;
export async function showAdPrivacyOptions() {}
export async function maybeInterstitial(_careerFights: number) {}
export function usePremiumPrice(): string | null {
  return null;
}
export function buyPremium(): Promise<'ok' | 'iptal' | 'hata'> {
  return Promise.resolve('hata');
}
export async function restorePremium(): Promise<boolean> {
  return false;
}
export function PremiumManager() {
  return null;
}
