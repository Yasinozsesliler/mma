// Doping: kısa vadeli güç, uzun vadeli risk. Yakalanırsan men, popülerlik kaybı ve sponsor iptali.
import { advanceWeeks } from './character';
import { chance, clamp, randInt, weighted } from './rng';
import { lifestylePost } from './social';
import { scandal } from './sponsors';
import type { GameState, Stats } from './types';

export const DOPING_FIGHTS = 3;

export const dopingActive = (s: GameState) => (s.doping?.kalan ?? 0) > 0;
export const banned = (s: GameState) => !!s.ceza && s.hafta < s.ceza.bitis;
export const banWeeksLeft = (s: GameState) => (s.ceza ? Math.max(0, s.ceza.bitis - s.hafta) : 0);

export function dopingCost(s: GameState) {
  return { amator: 500, bolgesel: 2500, buyuk: 9000, ufc: 25000 }[s.stage];
}

/** Doping dövüşte ciddi güç verir. */
export const DOPING_MODS: Partial<Stats> = { vurus: 4, kondisyon: 6, hiz: 2, cene: 3 };

export function takeDoping(s: GameState) {
  s.para -= dopingCost(s);
  s.doping = { kalan: DOPING_FIGHTS };
}

/** Dövüş sonrası test ihtimali: organizasyon büyüdükçe denetim sıkılaşır, her ihlal riski artırır. */
export function testChance(s: GameState) {
  return clamp({ amator: 0.12, bolgesel: 0.18, buyuk: 0.28, ufc: 0.42 }[s.stage] + (s.dopingSayisi ?? 0) * 0.06, 0, 0.8);
}

function banLength(s: GameState): number {
  const n = s.dopingSayisi ?? 0;
  const ufc = s.stage === 'ufc';
  const weights: [number, number][] =
    n >= 1
      ? [
          [52, 0.3],
          [104, 0.7],
        ]
      : [
          [26, ufc ? 0.3 : 0.5],
          [52, ufc ? 0.45 : 0.35],
          [104, ufc ? 0.25 : 0.15],
        ];
  return weighted(weights);
}

/** Dövüşten sonra çağrılır: dopingliysen test edilirsin. Yakalanırsan cezanın hafta sayısını döner. */
export function dopingTest(s: GameState): number | null {
  if (!dopingActive(s)) return null;
  s.doping!.kalan--;
  if (!chance(testChance(s))) return null;
  const weeks = banLength(s);
  s.dopingSayisi = (s.dopingSayisi ?? 0) + 1;
  s.doping = undefined;
  s.ceza = { bitis: s.hafta + weeks, sebep: 'Doping testi pozitif' };
  return weeks;
}

export const banLabel = (w: number) => (w >= 104 ? '2 yıl' : w >= 52 ? '1 yıl' : '6 ay');

/** Yakalanma sonrası itibar ve sponsor bedeli. */
export function dopingFallout(s: GameState, weeks: number): string[] {
  const pop = randInt(8, 14);
  s.populerlik = clamp(s.populerlik - pop, 0, 100);
  s.motivasyon = -2;
  const lines = [`🚫 DOPİNG TESTİ POZİTİF! ${banLabel(weeks)} men cezası.`, `📉 Popülerlik -${pop}`, ...scandal(s)];
  s.haberler.unshift(`🚫 SKANDAL: ${s.fighter.ad} ${s.fighter.soyad} doping testinde yakalandı! ${banLabel(weeks)} men cezası aldı.`);
  lifestylePost(s, 'doping skandalıyla manşetlerde');
  return lines;
}

/** Cezanın kalanını tek seferde çek: zaman geçer, sağlık dolar, ama kafesten uzak kalmak paslandırır. */
export function serveBan(s: GameState): string {
  const w = banWeeksLeft(s);
  if (!w) return 'Cezan yok.';
  const notes = advanceWeeks(s, w);
  s.saglik = 100;
  s.sakatliklar = [];
  const pas = Math.max(1, Math.round(w / 26));
  s.fighter.stats.kondisyon = Math.max(1, s.fighter.stats.kondisyon - pas);
  s.fighter.stats.iq = Math.max(1, s.fighter.stats.iq - Math.floor(pas / 2));
  s.ceza = undefined;
  s.haberler.unshift(`⏳ ${s.fighter.soyad} cezasını tamamladı ve kafese dönmeye hazır.`);
  return `${w} hafta sonra ceza bitti. Kafesten uzak kalmak seni paslandırdı (Kondisyon -${pas}). ${notes.join(' ')}`.trim();
}
