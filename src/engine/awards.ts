// Yıl sonu ödül töreni: biten yılın dövüşlerine göre adaylıklar ve kazananlar (Yılın Dövüşçüsü, Yılın Nakavtı,
// Yılın Dövüşü, Yükselen Yıldız). Oyuncu her kategoride rakip adaylarla yarışır; ödüller vitrine ve yolculuğa girer.
import { L, LOC } from '../i18n';
import { currentOrg } from './character';
import { ORGS } from './data';
import { chance, clamp, pick, shuffle } from './rng';
import type { GameState } from './types';

export type AwardCat = 'dovuscu' | 'nakavt' | 'dovus' | 'yildiz';

export interface AwardResult {
  kat: AwardCat;
  adaylar: string[];
  kazanan: string;
  oyuncu: boolean;
  /** Oyuncunun aday olduğu maç ya da gerekçe */
  not?: string;
}

export interface AwardShow {
  yil: number;
  yas: number;
  sonuclar: AwardResult[];
  acilan: number;
}

export const AWARD_NAMES: Record<AwardCat, () => string> = {
  dovuscu: () => L("Yılın Dövüşçüsü"),
  nakavt: () => L("Yılın Nakavtı"),
  dovus: () => L("Yılın Dövüşü"),
  yildiz: () => L("Yükselen Yıldız"),
};

const yearOf = (s: GameState) => Math.floor(s.hafta / 52);

/** Yeni yıla girildiyse tören hazırlanır (amatörde ya da yılda 2'den az profesyonel maçta tören yok). */
export function awardsDue(s: GameState) {
  if (s.phase === 'emeklilik') return false;
  if (s.odulYil == null) {
    s.odulYil = yearOf(s);
    return false;
  }
  return yearOf(s) > s.odulYil;
}

export function prepareAwards(s: GameState): boolean {
  const yil = s.odulYil ?? 0;
  s.odulYil = yearOf(s);
  const yas = s.fighter.baslangicYasi + yil;
  const fights = s.gecmis.filter((h) => h.yas === yas && h.org !== 'amator');
  if (fights.length < 2) return false;
  const FALLBACK = ['Rafael Costa', 'Ivan Petrov', 'Lucas Moreau', 'Max Weber', 'Darragh Keane', 'Tomasz Nowak', 'Kenji Mori', 'Omar Haddad'];
  const npcs = [...new Set(shuffle([...(s.bolum?.liste ?? []).map((o) => `${o.ad} ${o.soyad}`), ...(s.p4p?.liste ?? []).map((o) => `${o.ad} ${o.soyad}`)]))];
  shuffle(FALLBACK).forEach((n) => npcs.length < 12 && !npcs.includes(n) && npcs.push(n));
  const me = `${s.fighter.ad} ${s.fighter.soyad}`;
  let ni = 0;
  const others = (n: number) => {
    const out: string[] = [];
    while (out.length < n) out.push(npcs[ni++ % Math.max(1, npcs.length)] ?? L("Bilinmeyen dövüşçü"));
    return [...new Set(out)];
  };
  const wins = fights.filter((h) => h.sonuc === 'G');
  const losses = fights.filter((h) => h.sonuc === 'M').length;
  const kos = wins.filter((h) => h.yontem === 'KO' || h.yontem === 'TKO');
  const big = ['buyuk', 'ufc'].includes(ORGS[currentOrg(s)].stage) ? 1 : 0.6;
  const res: AwardResult[] = [];
  const cat = (kat: AwardCat, aday: boolean, p: number, not?: string) => {
    const pool = others(3);
    const kazanirMi = aday && chance(clamp(p, 0, 0.9));
    const adaylar = shuffle(aday ? [me, ...pool.slice(0, 3)] : pool.slice(0, 3));
    res.push({ kat, adaylar, kazanan: kazanirMi ? me : pick(adaylar.filter((x) => x !== me)), oyuncu: kazanirMi, not: aday ? not : undefined });
  };
  const skor = wins.length * 10 + kos.length * 4 - losses * 12 + (s.sampiyon ? 15 : 0);
  cat('dovuscu', wins.length >= 3 && losses === 0, (skor / 120) * big, L("{0} galibiyet, {1} mağlubiyet", [wins.length, losses]));
  const ko = kos.find((h) => h.raunt === 1) ?? kos[0];
  cat('nakavt', !!ko, (0.1 + kos.length * 0.05) * big, ko ? L("{0} karşısında, {1}. raunt", [ko.rakip, ko.raunt]) : undefined);
  const war = fights.find((h) => h.sonuc === 'G' && h.raunt >= 3 && !(h.yontem === 'KO' || h.yontem === 'TKO')) ?? fights.find((h) => h.raunt >= 3);
  cat('dovus', !!war, 0.1 * big, war ? L("{0} ile savaş", [war.rakip]) : undefined);
  cat('yildiz', yas <= 27 && wins.length >= 2 && s.gecmis.filter((h) => h.org !== 'amator').length <= 12, 0.45, L("{0} yaşında yükselen isim", [yas]));
  s.odulToren = { yil: yil + 1, yas, sonuclar: res, acilan: 0 };
  return true;
}

/** Sıradaki zarfı aç. Oyuncu kazandıysa ödül anında verilir. */
export function openEnvelope(s: GameState) {
  const t = s.odulToren;
  if (!t || t.acilan >= t.sonuclar.length) return;
  const r = t.sonuclar[t.acilan];
  t.acilan++;
  if (r.oyuncu) {
    const para = { amator: 500, bolgesel: 5_000, buyuk: 25_000, ufc: 75_000 }[s.stage] * (r.kat === 'dovuscu' ? 2 : 1);
    s.para += para;
    s.populerlik = clamp(s.populerlik + (r.kat === 'dovuscu' ? 4 : 2), 0, 100);
    s.oduller = [...(s.oduller ?? []), { kat: r.kat, yas: t.yas }];
    s.haberler.unshift(L("🏅 {0} ödülünü {1} kazandı! Ödül: ${2}", [AWARD_NAMES[r.kat](), s.fighter.soyad, para.toLocaleString(LOC)]));
  }
}

export function closeAwards(s: GameState) {
  s.odulToren = undefined;
  s.phase = 'hub';
}

export const awardCount = (s: GameState) => (s.oduller ?? []).length;
