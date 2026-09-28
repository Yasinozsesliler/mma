// Nesil modu: emekli dövüşçünün çocuğu kariyere devam eder. Miras dengeli tutulur (oyunu kolaylaştırmadan başlangıcı
// hızlandırır); ebeveyn antrenör olur, aile akademisi devralınır, hanedan geçmişi profilde saklanır.
import { L } from '../i18n';
import { followers } from './fame';
import { activeBelts, legacyScore } from './legacy';
import { clamp } from './rng';
import type { Appearance, Background, GameState, StatKey } from './types';
import { STAT_KEYS } from './types';

export type Ancestor = {
  ad: string;
  soyad: string;
  lakap: string;
  nesil: number;
  rekor: { g: number; m: number; b: number };
  kemer: number;
  efsane: number;
  hof: boolean;
  yas: number;
  gorunum?: Appearance;
};

export type Heritage = {
  ebeveyn: Ancestor;
  nesil: number;
  soyad: string;
  uyruk: string;
  memleket: string;
  gecmis: Background;
  para: number;
  populerlik: number;
  takipci: number;
  enIyi: StatKey;
  antrenorKalite: number;
  akademi: number | null; // devralınan akademinin seviyesi
  hanedan: Ancestor[];
};

const MAX_PARA = 200_000;

export function ancestorOf(s: GameState): Ancestor {
  const f = s.fighter;
  return {
    ad: f.ad,
    soyad: f.soyad,
    lakap: f.lakap,
    nesil: s.nesil ?? 1,
    rekor: { g: s.rekor.g, m: s.rekor.m, b: s.rekor.b },
    kemer: (s.kemerler ?? []).length,
    efsane: legacyScore(s),
    hof: !!s.hof,
    yas: f.yas,
    gorunum: f.gorunum,
  };
}

/** Emekli kariyerden bir sonraki nesle kalacaklar. */
export function heritageOf(s: GameState): Heritage {
  const eb = ancestorOf(s);
  const enIyi = STAT_KEYS.reduce((a, k) => (s.fighter.stats[k] > s.fighter.stats[a] ? k : a), STAT_KEYS[0]);
  const akademi = (s.isletmeler ?? []).find((x) => x.id === 'akademi');
  return {
    ebeveyn: eb,
    nesil: eb.nesil + 1,
    soyad: s.fighter.soyad,
    uyruk: s.fighter.uyruk,
    memleket: s.fighter.memleket,
    gecmis: s.fighter.gecmis,
    para: Math.min(MAX_PARA, Math.round((s.para * 0.25) / 100) * 100),
    populerlik: clamp(Math.round(eb.efsane / 40), 3, 25),
    takipci: Math.round(followers(s) * 0.1),
    enIyi,
    antrenorKalite: clamp(4 + Math.round(eb.efsane / 180), 4, 9),
    akademi: akademi ? akademi.seviye : null,
    hanedan: [...(s.hanedan ?? []), eb],
  };
}

/** Yeni oluşturulan (çocuk) kariyere mirası uygular. */
export function applyHeritage(s: GameState, h: Heritage) {
  const eb = h.ebeveyn;
  s.nesil = h.nesil;
  s.hanedan = h.hanedan;
  s.para += h.para;
  s.populerlik = Math.min(100, s.populerlik + h.populerlik);
  s.takipci = (s.takipci ?? 0) + h.takipci;
  s.fighter.stats[h.enIyi] = Math.min(95, s.fighter.stats[h.enIyi] + 3);
  // Ebeveyn köşeye geçer.
  s.takim.antrenor = `${eb.ad} ${eb.soyad}`;
  s.takim.antrenorKalite = h.antrenorKalite;
  s.takim.uzmanlik = h.enIyi;
  if (h.akademi) {
    s.takim.salon = L("{0} Akademisi", [eb.soyad]);
    s.isletmeler = [...(s.isletmeler ?? []).filter((x) => x.id !== 'akademi'), { id: 'akademi', seviye: h.akademi }];
  }
  const efsane = eb.hof ? L("Hall of Fame üyesi") : eb.kemer ? L("{0} kemerli şampiyon", [eb.kemer]) : L("eski dövüşçü");
  s.haberler.unshift(
    L("📰 {0} {1} kafese adım attı! {2} ({3}, {4}-{5}) artık onun köşesinde: aile mirası sürüyor.", [s.fighter.ad, s.fighter.soyad, `${eb.ad} ${eb.soyad}`, efsane, eb.rekor.g, eb.rekor.m]),
  );
}

/** Hanedanın toplam gücü: bütün nesillerin efsane puanları. */
export const dynastyScore = (s: GameState) => (s.hanedan ?? []).reduce((a, x) => a + x.efsane, 0) + legacyScore(s);

/** Aktif kemer sayısını da hesaba katmak için (profil gösterimi). */
export const beltsNow = (s: GameState) => activeBelts(s).length;
