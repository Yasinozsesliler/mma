// Kendi markan: tişört, eldiven, enerji içeceği. Her dövüşten sonra satış; talep takipçi, popülerlik, sonuç,
// fiyat seviyesi, kalite ve reklam kampanyasına bağlı. Süren sosyal medya krizi satışları düşürür.
import { L, LOC } from '../i18n';
import { followers } from './fame';
import { rand } from './rng';
import type { GameState } from './types';

export type Product = 'tisort' | 'eldiven' | 'icecek';
export type PriceTier = 'ucuz' | 'normal' | 'premium';

export interface MerchBrand {
  ad: string;
  urunler: Partial<Record<Product, PriceTier>>;
  kalite: number;
  kampanya: number;
  toplam: number;
  gecmis: { kazanc: number; adet: number }[];
}

export const MERCH_MIN_FOLLOWERS = 20_000;

export const PRODUCTS: Record<Product, { ad: () => string; icon: string; kurulum: number; kar: number; oran: number; minStage?: GameState['stage'] }> = {
  tisort: { ad: () => L("Tişört ve şapka"), icon: 'tshirt-crew', kurulum: 5_000, kar: 8, oran: 0.038 },
  eldiven: { ad: () => L("İmzalı eldiven"), icon: 'boxing-glove', kurulum: 15_000, kar: 22, oran: 0.015 },
  icecek: { ad: () => L("Enerji içeceği"), icon: 'bottle-soda', kurulum: 60_000, kar: 3, oran: 0.05, minStage: 'buyuk' },
};

export const TIERS: Record<PriceTier, { ad: () => string; kar: number; talep: (pop: number) => number }> = {
  ucuz: { ad: () => L("Ucuz"), kar: 0.6, talep: () => 1.4 },
  normal: { ad: () => L("Normal"), kar: 1, talep: () => 1 },
  premium: { ad: () => L("Premium"), kar: 1.7, talep: (pop) => (pop >= 60 ? 0.85 : pop >= 35 ? 0.6 : 0.4) },
};

const STAGES: GameState['stage'][] = ['amator', 'bolgesel', 'buyuk', 'ufc'];
export const productLocked = (s: GameState, p: Product) => !!PRODUCTS[p].minStage && STAGES.indexOf(s.stage) < STAGES.indexOf(PRODUCTS[p].minStage!);
export const canStartBrand = (s: GameState) => s.stage !== 'amator' && followers(s) >= MERCH_MIN_FOLLOWERS;

export function startBrand(s: GameState, ad: string) {
  if (s.marka || !canStartBrand(s)) return;
  const name = ad.trim().slice(0, 24) || `${s.fighter.lakap || s.fighter.soyad} Wear`;
  s.marka = { ad: name, urunler: {}, kalite: 1, kampanya: 0, toplam: 0, gecmis: [] };
  s.haberler.unshift(L("🧢 Kendi markanı kurdun: {0}!", [name]));
}

export function launchProduct(s: GameState, p: Product) {
  const m = s.marka;
  if (!m || m.urunler[p] || productLocked(s, p) || s.para < PRODUCTS[p].kurulum) return;
  s.para -= PRODUCTS[p].kurulum;
  m.urunler[p] = 'normal';
  s.haberler.unshift(L("🧢 {0}: {1} satışa çıktı.", [m.ad, PRODUCTS[p].ad()]));
}

export function setTier(s: GameState, p: Product, t: PriceTier) {
  if (s.marka?.urunler[p]) s.marka.urunler[p] = t;
}

export const qualityCost = (m: MerchBrand) => 10_000 * m.kalite;
export function upgradeQuality(s: GameState) {
  const m = s.marka;
  if (!m || m.kalite >= 3 || s.para < qualityCost(m)) return;
  s.para -= qualityCost(m);
  m.kalite++;
}

export const campaignCost = (s: GameState) => Math.round((5_000 + followers(s) * 0.01) / 500) * 500;
export function runCampaign(s: GameState) {
  const m = s.marka;
  const c = campaignCost(s);
  if (!m || m.kampanya > 0 || s.para < c) return;
  s.para -= c;
  m.kampanya = 3;
}

/** Bir sonraki dövüş için tahmini kazanç (galibiyet varsayımıyla). */
export function merchForecast(s: GameState) {
  return sell(s, true, false).kazanc;
}

function sell(s: GameState, won: boolean, real: boolean) {
  const m = s.marka!;
  const F = followers(s);
  let adet = 0;
  let kazanc = 0;
  (Object.keys(m.urunler) as Product[]).forEach((p) => {
    const t = TIERS[m.urunler[p]!];
    const d = (0.6 + s.populerlik / 100) * (won ? 1.2 : 0.8) * t.talep(s.populerlik) * (1 + 0.15 * (m.kalite - 1)) * (m.kampanya > 0 ? 1.5 : 1) * (s.kriz && !s.kriz.sonuc ? 0.6 : 1);
    // Talep takipçiyle doğrusal değil, azalan getiriyle büyür
    const n = Math.round(Math.pow(F, 0.7) * PRODUCTS[p].oran * d * (real ? 0.85 + rand() * 0.3 : 1));
    adet += n;
    kazanc += n * PRODUCTS[p].kar * t.kar * (1 + 0.1 * (m.kalite - 1));
  });
  return { adet, kazanc: Math.round(kazanc) };
}

/** Dövüş sonrası satış raporu. */
export function merchSales(s: GameState, won: boolean): string[] {
  const m = s.marka;
  if (!m || !Object.keys(m.urunler).length) return [];
  const r = sell(s, won, true);
  s.para += r.kazanc;
  m.toplam += r.kazanc;
  m.gecmis = [{ kazanc: r.kazanc, adet: r.adet }, ...m.gecmis].slice(0, 8);
  if (m.kampanya > 0) m.kampanya--;
  return [L("🧢 {0}: {1} ürün satıldı, kazanç ${2}.", [m.ad, r.adet.toLocaleString(LOC), r.kazanc.toLocaleString(LOC)])];
}
