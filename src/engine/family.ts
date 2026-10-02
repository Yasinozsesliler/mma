// Aile hayatı: sevgiliye evlilik teklifi (sade nikâh ya da büyük düğün), evlilikte çocuklar, tribündeki aile
// (dövüşte küçük destek), çocuk giderleri ve boşanmanın bedeli. Hanedan modunda büyük çocuk varis olur.
import { L, LOC } from '../i18n';
import { COUNTRIES, NAME_POOLS } from './data';
import { addFollowers, followers } from './fame';
import { chance, clamp, pick } from './rng';
import type { GameState, Stats } from './types';

export interface Child {
  ad: string;
  kiz: boolean;
  hafta: number;
}

export const PROPOSE_WEEKS = 20;
const RING: Record<GameState['stage'], number> = { amator: 1_000, bolgesel: 4_000, buyuk: 15_000, ufc: 50_000 };
export const weddingCost = (s: GameState, buyuk: boolean) => RING[s.stage] * (buyuk ? 6 : 1.5);

export const canPropose = (s: GameState) => s.iliski?.durum === 'sevgili' && s.hafta - s.iliski.hafta >= PROPOSE_WEEKS;
export const weeksToPropose = (s: GameState) => (s.iliski?.durum === 'sevgili' ? Math.max(0, PROPOSE_WEEKS - (s.hafta - s.iliski.hafta)) : 0);

/** Evlilik teklifi: kabul olasılığı ilişki seviyesine bağlı. Ret olursa 20 hafta beklenir. */
export function propose(s: GameState, buyuk: boolean): string {
  const r = s.iliski;
  if (!r || !canPropose(s)) return '';
  const cost = weddingCost(s, buyuk);
  if (s.para < cost) return L("Bunun için paran yetmiyor.");
  const lvl = (s.eslesmeler ?? []).find((c) => c.id === r.id)?.seviye ?? 70;
  if (!chance(0.55 + lvl / 250)) {
    r.hafta = s.hafta;
    s.motivasyon = clamp(s.motivasyon - 1, -2, 2);
    return L("💔 {0} “Henüz hazır değilim,” dedi. Biraz zaman lazım. (Motivasyon -1)", [r.ad]);
  }
  s.para -= cost;
  r.durum = 'evli';
  r.hafta = s.hafta;
  s.motivasyon = 2;
  if (buyuk) {
    s.populerlik = clamp(s.populerlik + 3, 0, 100);
    addFollowers(s, followers(s) * 0.05);
    s.haberler.unshift(L("💍 {0} ve {1} görkemli bir düğünle evlendi! Magazin sayfaları bunu konuşuyor.", [s.fighter.soyad, r.ad]));
    return L("💍 EVET! Büyük düğün yapıldı, bütün şehir oradaydı. Popülerlik +3.");
  }
  s.haberler.unshift(L("💍 {0}, {1} ile sade bir törenle evlendi.", [s.fighter.soyad, r.ad]));
  return L("💍 EVET! Sade bir nikâhla evlendiniz. Motivasyon tavan.");
}

/** Boşanma: servetin %30'u gider. */
export function divorce(s: GameState): string {
  if (s.iliski?.durum !== 'evli') return '';
  const pay = Math.round((Math.max(0, s.para) * 0.3) / 100) * 100;
  s.para -= pay;
  const ad = s.iliski.ad;
  s.iliski = undefined;
  s.motivasyon = -2;
  s.haberler.unshift(L("💔 {0} ve {1} boşandı.", [s.fighter.soyad, ad]));
  return L("💔 {0} ile boşandınız. Nafaka ve avukatlar: ${1}. (Motivasyon -2)", [ad, pay.toLocaleString(LOC)]);
}

function childName(s: GameState, kiz: boolean) {
  const ulke = COUNTRIES[s.fighter.uyruk]?.ad;
  const pool = NAME_POOLS.find((p) => p.ulke === ulke) ?? pick(NAME_POOLS);
  const used = new Set((s.cocuklar ?? []).map((c) => c.ad));
  const list = (kiz ? pool.kadin : pool.ad).filter((n) => !used.has(n));
  return pick(list.length ? list : kiz ? pool.kadin : pool.ad);
}

/** Haftalık: evlilikte çocuk haberi (en fazla 3, araları en az 40 hafta). */
export function familyTick(s: GameState, weeks: number) {
  if (s.iliski?.durum !== 'evli') return;
  const kids = s.cocuklar ?? [];
  if (kids.length >= 3) return;
  const last = kids.length ? kids[kids.length - 1].hafta : s.iliski.hafta;
  if (s.hafta - last < 40) return;
  if (!chance(1 - Math.pow(0.97, weeks))) return;
  const kiz = chance(0.5);
  const ad = childName(s, kiz);
  s.cocuklar = [...kids, { ad, kiz, hafta: s.hafta }];
  s.motivasyon = 2;
  s.haberler.unshift(kiz ? L("👶 Kızın {0} dünyaya geldi! Hayatının en güzel günü.", [ad]) : L("👶 Oğlun {0} dünyaya geldi! Hayatının en güzel günü.", [ad]));
}

/** Ailen tribündeyse dövüşte küçük destek. */
export function familyMods(s: GameState, mods: Partial<Stats>) {
  if (!(s.cocuklar ?? []).length) return;
  mods.kondisyon = (mods.kondisyon ?? 0) + 1;
  s.haberler.unshift(L("👨‍👩‍👧 Ailen tribünde. Onlar için dövüşüyorsun (kondisyon +1)."));
}

const KID_COST: Record<GameState['stage'], number> = { amator: 100, bolgesel: 300, buyuk: 1_200, ufc: 3_000 };
/** Dövüş başına aile giderleri. */
export function familyCosts(s: GameState): string[] {
  const n = (s.cocuklar ?? []).length;
  if (!n) return [];
  const c = n * KID_COST[s.stage];
  s.para -= c;
  return [L("👨‍👩‍👧 Aile giderleri: -${0}", [c.toLocaleString(LOC)])];
}

/** Hanedan: büyük çocuğun adı yeni kariyere önerilir. */
export const heirName = (s: GameState) => (s.cocuklar ?? [])[0]?.ad;
