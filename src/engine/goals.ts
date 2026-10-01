// Kariyer hedefleri: her zaman 3 hedef (kısa, orta, uzun). Tamamlanınca "Ödülü al" ile para ve gelişim puanı.
// Ödüller kariyer aşamasına göre ölçeklenir; reklamla ya da satın almayla ilgisi yoktur.
import { L, LOC } from '../i18n';
import { statAverage } from './character';
import { ORGS } from './data';
import { followers, fmtFollowers } from './fame';
import { readIstat } from './istat';
import { pick, randInt } from './rng';
import type { GameState } from './types';

export type GoalType = 'win' | 'finish' | 'ko' | 'sub' | 'r1' | 'streak' | 'rank' | 'power' | 'followers' | 'money' | 'title' | 'gym';
export type GoalTier = 'kisa' | 'orta' | 'uzun';

export interface Goal {
  id: string;
  tur: GoalType;
  kat: GoalTier;
  /** Sayaç hedefleri için başlangıç değeri (ilerleme = şimdiki - başlangıç) */
  bas: number;
  hedef: number;
  odul: { para: number; puan: number };
}

const wins = (s: GameState) => s.rekor.g + s.amator.g;
const kos = (s: GameState) => s.rekor.ko + s.amator.ko;
const subs = (s: GameState) => s.rekor.sub + s.amator.sub;
const hasRanking = (s: GameState) => {
  const org = s.contract?.org;
  return !!org && (ORGS[org]?.merdiven ?? 0) > 0 && !s.sampiyon;
};

/** Sayaç türleri: ilerleme = değer - başlangıç. Mutlak türler: ilerleme = değerin kendisi. */
const COUNTERS: Partial<Record<GoalType, (s: GameState) => number>> = {
  win: wins,
  finish: (s) => kos(s) + subs(s),
  ko: kos,
  sub: subs,
  r1: (s) => readIstat(s).r1,
  title: (s) => s.unvanlar.length,
  gym: (s) => s.salon?.galibiyet ?? 0,
};

export function goalProgress(s: GameState, g: Goal): [number, number] {
  const c = COUNTERS[g.tur];
  if (c) return [Math.min(g.hedef, Math.max(0, c(s) - g.bas)), g.hedef];
  if (g.tur === 'streak') return [Math.min(g.hedef, Math.max(0, s.seri)), g.hedef];
  if (g.tur === 'power') return [Math.min(g.hedef, Math.round(statAverage(s.fighter.stats))), g.hedef];
  if (g.tur === 'followers') return [Math.min(g.hedef, followers(s)), g.hedef];
  if (g.tur === 'money') return [Math.min(g.hedef, Math.max(0, s.para)), g.hedef];
  if (g.tur === 'rank') {
    // Sıralama: hedef sıraya ya da daha iyisine gelince tamam (ilerleme ters ölçülür)
    const r = s.sampiyon ? 0 : s.rank;
    return r != null && r <= g.hedef ? [1, 1] : [0, 1];
  }
  return [0, 1];
}

export const goalDone = (s: GameState, g: Goal) => {
  const [a, b] = goalProgress(s, g);
  return a >= b;
};

export function goalText(g: Goal): string {
  switch (g.tur) {
    case 'win':
      return g.hedef === 1 ? L("Bir maç kazan") : L("{0} maç kazan", [g.hedef]);
    case 'finish':
      return L("{0} maçı bitirerek kazan (KO ya da submission)", [g.hedef]);
    case 'ko':
      return g.hedef === 1 ? L("Bir maçı nakavtla kazan") : L("{0} maçı nakavtla kazan", [g.hedef]);
    case 'sub':
      return L("Bir maçı submission ile kazan");
    case 'r1':
      return L("Bir maçı 1. rauntta bitir");
    case 'streak':
      return L("{0} maçlık galibiyet serisi yap", [g.hedef]);
    case 'rank':
      return g.hedef === 0 ? L("Şampiyon ol") : g.hedef === 1 ? L("Sıralamada 1 numara ol") : L("Sıralamada ilk {0} içine gir", [g.hedef]);
    case 'power':
      return L("Güç ortalamanı {0} seviyesine çıkar", [g.hedef]);
    case 'followers':
      return L("{0} takipçiye ulaş", [fmtFollowers(g.hedef)]);
    case 'money':
      return L("Bakiyeni ${0} yap", [g.hedef.toLocaleString(LOC)]);
    case 'title':
      return L("Bir kemer kazan");
    case 'gym':
      return L("Öğrencilerin {0} maç kazansın", [g.hedef]);
  }
}

export const GOAL_ICONS: Record<GoalType, string> = {
  win: 'trophy-outline',
  finish: 'flash',
  ko: 'boxing-glove',
  sub: 'lock',
  r1: 'timer-sand',
  streak: 'fire',
  rank: 'podium',
  power: 'arm-flex',
  followers: 'account-group',
  money: 'cash-multiple',
  title: 'crown',
  gym: 'weight-lifter',
};

const BASE: Record<GameState['stage'], number> = { amator: 300, bolgesel: 2_500, buyuk: 12_000, ufc: 45_000 };
const MULT: Record<GoalTier, number> = { kisa: 1, orta: 1.8, uzun: 3.5 };
const PUAN: Record<GoalTier, number> = { kisa: 0, orta: 1, uzun: 2 };

let seq = 0;
const newId = () => `h${Date.now().toString(36)}${(seq++).toString(36)}`;

function make(s: GameState, kat: GoalTier, taken: Set<GoalType>): Goal | null {
  const pro = s.stage !== 'amator';
  const opts: (() => Omit<Goal, 'id' | 'kat' | 'odul'> | null)[] = [];
  const counter = (tur: GoalType, hedef: number) => () => ({ tur, bas: COUNTERS[tur]!(s), hedef });
  if (kat === 'kisa') {
    opts.push(counter('win', randInt(1, 2)), counter('ko', 1), counter('finish', 1));
    if (s.fighter.stats.yer >= 40) opts.push(counter('sub', 1));
    if (pro) opts.push(counter('r1', 1));
  } else if (kat === 'orta') {
    opts.push(counter('win', randInt(3, 4)), counter('finish', 2), () => ({ tur: 'streak', bas: 0, hedef: Math.max(2, Math.min(6, s.seri + randInt(2, 3))) }));
    const pw = Math.round(statAverage(s.fighter.stats));
    if (pw < 92) opts.push(() => ({ tur: 'power', bas: 0, hedef: pw + randInt(2, 4) }));
    if (hasRanking(s)) {
      const top = s.rank == null ? 10 : Math.max(1, s.rank - randInt(2, 4));
      opts.push(() => ({ tur: 'rank', bas: 0, hedef: top }));
    }
    if (s.salon) opts.push(counter('gym', randInt(2, 3)));
  } else {
    const f = followers(s);
    const nextF = [10_000, 50_000, 250_000, 1_000_000, 5_000_000, 25_000_000].find((x) => x > f * 1.5);
    if (nextF) opts.push(() => ({ tur: 'followers', bas: 0, hedef: nextF }));
    const nextM = [10_000, 50_000, 250_000, 1_000_000, 5_000_000, 20_000_000].find((x) => x > s.para * 1.5 && x > 0);
    if (nextM) opts.push(() => ({ tur: 'money', bas: 0, hedef: nextM }));
    if (pro) opts.push(counter('title', 1));
    if (hasRanking(s)) opts.push(() => ({ tur: 'rank', bas: 0, hedef: s.rank != null && s.rank <= 5 ? 0 : 3 }));
    opts.push(counter('win', randInt(6, 8)), counter('ko', 3));
  }
  for (let i = 0; i < 8; i++) {
    const g = pick(opts)();
    if (!g || taken.has(g.tur)) continue;
    const mult = MULT[kat] * (g.tur === 'title' || (g.tur === 'rank' && g.hedef === 0) ? 1.6 : 1);
    return { ...g, id: newId(), kat, odul: { para: Math.round((BASE[s.stage] * mult) / 50) * 50, puan: PUAN[kat] } };
  }
  return null;
}

/** 3 hedefi tamamlar (kısa, orta, uzun): eksik olan kategori doldurulur. */
export function ensureGoals(s: GameState) {
  s.hedefler ??= { list: [], tamam: 0 };
  const h = s.hedefler;
  for (const kat of ['kisa', 'orta', 'uzun'] as GoalTier[]) {
    if (h.list.some((g) => g.kat === kat)) continue;
    const g = make(s, kat, new Set(h.list.map((x) => x.tur)));
    if (g) h.list.push(g);
  }
  const order: Record<GoalTier, number> = { kisa: 0, orta: 1, uzun: 2 };
  h.list.sort((a, b) => order[a.kat] - order[b.kat]);
}

/** Tamamlanan hedefin ödülünü verir, yerine yenisini koyar. */
export function claimGoal(s: GameState, id: string) {
  const h = s.hedefler;
  const g = h?.list.find((x) => x.id === id);
  if (!h || !g || !goalDone(s, g)) return;
  s.para += g.odul.para;
  s.puan += g.odul.puan;
  h.tamam++;
  h.list = h.list.filter((x) => x.id !== id);
  s.haberler.unshift(L("🎯 Hedef tamamlandı: {0}. Ödül: ${1}{2}", [goalText(g), g.odul.para.toLocaleString(LOC), g.odul.puan ? L(" ve +{0} gelişim puanı", [g.odul.puan]) : '']));
  ensureGoals(s);
}

/** Yapılamaz hale gelen hedefleri yeniler (ör. emeklilik öncesi sıralama hedefi, organizasyon değişimi). */
export function refreshStaleGoals(s: GameState) {
  const h = s.hedefler;
  if (!h) return ensureGoals(s);
  h.list = h.list.filter((g) => g.tur !== 'rank' || hasRanking(s) || goalDone(s, g));
  ensureGoals(s);
}
