// Yorgunluk: maçlardan sonra birikir, oynamayı hiç engellemez. Yüksekken kamp gelişimi biraz düşer.
// Haftalar geçtikçe kendiliğinden azalır; dinlenme, toparlanma hizmetleri (oyun parasıyla) ya da isteğe bağlı bir reklamla atılır.
import { L, LOC } from '../i18n';
import { clamp } from './rng';
import { restMultiplier } from './shop';
import type { GameState } from './types';

const money = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;

export const fatigue = (s: GameState) => s.yorgunluk ?? 0;

/** Kamp gelişim çarpanı: 0 yorgunlukta 1, 100'de 0,7 (gelişim en fazla %30 düşer). */
export const growthAt = (y: number) => 1 - y * 0.003;
export const fatigueGrowth = (s: GameState) => growthAt(fatigue(s));

export const fatigueLabel = (s: GameState) => {
  const y = fatigue(s);
  return y >= 70 ? L("Bitkin") : y >= 45 ? L("Yorgun") : y >= 20 ? L("Hafif yorgun") : L("Dinç");
};

/** Maç sonrası: süre ve yenen hasara göre yorgunluk eklenir. */
export function fatigueAfterFight(s: GameState, raunt: number, hasar: number) {
  const ek = Math.round(12 + raunt * 4 + hasar / 6);
  s.yorgunluk = clamp(fatigue(s) + ek, 0, 100);
  return ek;
}

/** Haftalık doğal toparlanma (iyileşme ekipmanları ve rutin hızlandırır). */
export function fatigueTick(s: GameState, weeks: number) {
  if (!fatigue(s)) return;
  s.yorgunluk = clamp(fatigue(s) - Math.round(weeks * 3 * restMultiplier(s)), 0, 100);
}

/** Toparlanma hizmetleri: oyun parasıyla, kademeye göre fiyatlanır. Maç başına her biri bir kez. */
export type Recovery = 'masaj' | 'sauna' | 'spa';
export const RECOVERY: Record<Recovery, { ad: () => string; aciklama: () => string; icon: string; dusus: number; fiyat: number }> = {
  masaj: { ad: () => L("Spor masajı"), aciklama: () => L("Kasları gevşetir."), icon: 'hand-heart', dusus: 15, fiyat: 1 },
  sauna: { ad: () => L("Sauna ve buz banyosu"), aciklama: () => L("Kan dolaşımını hızlandırır."), icon: 'snowflake-thermometer', dusus: 25, fiyat: 2.5 },
  spa: { ad: () => L("Spa ve uyku kampı"), aciklama: () => L("Üç günlük tam toparlanma."), icon: 'spa', dusus: 45, fiyat: 6 },
};
const BASE: Record<GameState['stage'], number> = { amator: 150, bolgesel: 400, buyuk: 1500, ufc: 5000 };
export const recoveryCost = (s: GameState, r: Recovery) => Math.round((BASE[s.stage] * RECOVERY[r].fiyat) / 50) * 50;

const fightNo = (s: GameState) => s.gecmis.length;
export const recoveryUsed = (s: GameState, r: Recovery) => s.toparlanma?.mac === fightNo(s) && (s.toparlanma.kullanilan ?? []).includes(r);

export function buyRecovery(s: GameState, r: Recovery): string {
  if (fatigue(s) <= 0) return L("Zaten dinçsin.");
  if (recoveryUsed(s, r)) return L("Bunu bu maçtan sonra zaten yaptın.");
  const c = recoveryCost(s, r);
  if (s.para < c) return L("Paran yetmiyor.");
  s.para -= c;
  const d = Math.min(fatigue(s), RECOVERY[r].dusus);
  s.yorgunluk = fatigue(s) - d;
  const used = s.toparlanma?.mac === fightNo(s) ? s.toparlanma.kullanilan ?? [] : [];
  s.toparlanma = { ...s.toparlanma, mac: fightNo(s), kullanilan: [...used, r] };
  return L("{0}: yorgunluk -{1} ({2}).", [RECOVERY[r].ad(), d, money(c)]);
}

/** İsteğe bağlı reklam: maç başına bir kez, büyük toparlanma (güç vermez, yalnızca zaman kazandırır). */
export const canFatigueAd = (s: GameState) => fatigue(s) >= 20 && s.toparlanma?.reklamMac !== fightNo(s);
export function claimFatigueAd(s: GameState) {
  s.yorgunluk = Math.max(0, fatigue(s) - 40);
  s.toparlanma = { ...s.toparlanma, reklamMac: fightNo(s) };
}
