// Kendi organizasyonun: dövüşçü imzala, gece düzenle (mekân, bilet fiyatı, kart), gelir-gider ve itibar.
// Yalnızca kariyer bittikten sonra (emeklilik ekranından) kurulur; her gece 4 hafta sürer.
// Eski rakiplerin de keşif listesinde çıkabilir (canlı dünya).
import { L, LOC } from '../i18n';
import { NAME_POOLS, WEIGHT_CLASSES, femSurname } from './data';
import { advanceWeeks } from './character';
import { chance, clamp, pick, rand, randInt, uid } from './rng';
import type { GameState, WeightClass } from './types';

export interface LigFighter {
  id: string;
  ad: string;
  uyruk: string;
  siklet: WeightClass;
  ovr: number;
  pop: number;
  g: number;
  m: number;
  /** Maç başı ücret */
  ucret: number;
  /** Kontratta kalan maç */
  kalan: number;
  yas: number;
  /** Eski rakip mi (canlı dünyadan) */
  eski?: boolean;
}
export type MekanId = 'salon' | 'arena' | 'stadyum';
export type Bilet = 'ucuz' | 'normal' | 'pahali';
export interface LigResult {
  a: string;
  b: string;
  kazanan: string;
  kaybeden: string;
  yontem: 'KO' | 'SUB' | 'KARAR';
  raunt: number;
  ana: boolean;
}
export interface LigNight {
  no: number;
  mekan: MekanId;
  bilet: Bilet;
  seyirci: number;
  kapasite: number;
  bilet$: number;
  tv$: number;
  sponsor$: number;
  mekan$: number;
  ucret$: number;
  bonus$: number;
  kar: number;
  sonuclar: LigResult[];
  gecePerf?: string;
  itibarDelta: number;
}
export interface Lig {
  ad: string;
  kurulus: number;
  itibar: number;
  kadro: LigFighter[];
  aday: LigFighter[];
  geceler: number;
  toplamKar: number;
  son?: LigNight;
}

export const MEKAN: Record<MekanId, { ad: () => string; kap: number; maliyet: number; itibar: number; ikon: string; mac: number }> = {
  salon: { ad: () => L("Spor salonu"), kap: 900, maliyet: 5_000, itibar: 0, ikon: 'warehouse', mac: 3 },
  arena: { ad: () => L("Arena"), kap: 7_000, maliyet: 140_000, itibar: 30, ikon: 'stadium-variant', mac: 4 },
  stadyum: { ad: () => L("Stadyum"), kap: 30_000, maliyet: 600_000, itibar: 60, ikon: 'stadium', mac: 5 },
};
export const BILET: Record<Bilet, { ad: () => string; fiyat: number; talep: number }> = {
  ucuz: { ad: () => L("Ucuz"), fiyat: 20, talep: 1.35 },
  normal: { ad: () => L("Normal"), fiyat: 35, talep: 1 },
  pahali: { ad: () => L("Pahalı"), fiyat: 75, talep: 0.62 },
};

export const foundCost = () => 250_000;
export const tvLevel = (it: number) => (it >= 75 ? 3 : it >= 50 ? 2 : it >= 25 ? 1 : 0);

function randomFighter(itibar: number, kadin: boolean): LigFighter {
  const p = pick(NAME_POOLS);
  const ad = `${pick(kadin ? p.kadin : p.ad)} ${kadin && p.slav ? femSurname(pick(p.soyad)) : pick(p.soyad)}`;
  const ovr = clamp(Math.round(42 + itibar * 0.3 + rand() * 22), 40, 92);
  const pop = clamp(Math.round(4 + itibar * 0.25 + rand() * 25), 1, 90);
  const yas = randInt(20, 33);
  return { id: uid(), ad, uyruk: p.ulke, siklet: pick(Object.keys(WEIGHT_CLASSES) as WeightClass[]), ovr, pop, g: randInt(0, 12), m: randInt(0, 6), ucret: feeOf(ovr, pop), kalan: 4, yas };
}

export const feeOf = (ovr: number, pop: number) => Math.round(((ovr - 35) ** 2 * 4 * (1 + pop / 50)) / 100) * 100 + 500;
export const signFee = (f: LigFighter) => f.ucret * 2;

/** Keşif listesi: 5 aday; zaman zaman eski rakiplerinden biri. */
function scout(s: GameState): LigFighter[] {
  const it = s.lig?.itibar ?? 10;
  const kadin = !!s.fighter.kadin;
  const list = Array.from({ length: 5 }, () => randomFighter(it, kadin));
  const eski = (s.kartlar ?? []).filter((c) => s.dunya?.[c.id]?.d !== 'emekli' && !c.id.startsWith('hikaye-') && !s.lig?.kadro.some((k) => k.id === c.id));
  if (eski.length && chance(0.5)) {
    const c = pick(eski);
    const f = randomFighter(it + 10, kadin);
    list[0] = { ...f, id: c.id, ad: `${c.ad} ${c.soyad}`, uyruk: c.uyruk, siklet: s.fighter.siklet, eski: true, ucret: feeOf(f.ovr, f.pop + 10) };
  }
  return list;
}

export function foundLeague(s: GameState, ad: string): string {
  const cost = foundCost();
  if (s.lig || s.para < cost) return '';
  s.para -= cost;
  s.lig = { ad, kurulus: s.hafta, itibar: 10, kadro: [], aday: [], geceler: 0, toplamKar: 0 };
  s.lig.aday = scout(s);
  s.haberler.unshift(L("🏢 {0} kendi organizasyonunu kurdu: {1}!", [s.fighter.soyad, ad]));
  return L("{0} kuruldu! İlk işin: en az 4 dövüşçü imzala.", [ad]);
}

export function signFighter(s: GameState, id: string): string {
  const lig = s.lig;
  const f = lig?.aday.find((x) => x.id === id);
  if (!lig || !f) return '';
  if (lig.kadro.length >= 16) return L("Kadron dolu (16 dövüşçü).");
  if (s.para < signFee(f)) return L("İmza parası yetmiyor.");
  s.para -= signFee(f);
  lig.kadro.push({ ...f, kalan: 4 });
  lig.aday = lig.aday.filter((x) => x.id !== id);
  return L("{0} imzaladı: 4 maçlık kontrat.", [f.ad]);
}

export function releaseFighter(s: GameState, id: string) {
  if (s.lig) s.lig.kadro = s.lig.kadro.filter((x) => x.id !== id);
}

/** Kontratı biten dövüşçüyle yeniden anlaş: ücret %30 artar. */
export function renewFighter(s: GameState, id: string): string {
  const f = s.lig?.kadro.find((x) => x.id === id);
  if (!f) return '';
  const fee = Math.round((f.ucret * 1.3) / 100) * 100;
  if (s.para < fee) return L("Yenileme parası yetmiyor.");
  s.para -= fee;
  f.ucret = fee;
  f.kalan = 4;
  return L("{0} ile yeniden anlaştın. Yeni ücret: ${1}", [f.ad, fee.toLocaleString(LOC)]);
}

export function rescout(s: GameState): string {
  if (!s.lig) return '';
  const fee = 2_000 + s.lig.itibar * 100;
  if (s.para < fee) return L("Keşif için paran yetmiyor.");
  s.para -= fee;
  s.lig.aday = scout(s);
  return L("Yeni adaylar geldi.");
}
export const rescoutFee = (s: GameState) => 2_000 + (s.lig?.itibar ?? 0) * 100;

/** Kartı otomatik kur: aynı sıklet öncelikli, en popüler eşleşme ana maç. Maç sayısı mekâna göre (3-5). */
export function buildCard(s: GameState, max = 5): [LigFighter, LigFighter][] {
  const pool = [...(s.lig?.kadro ?? [])].filter((f) => f.kalan > 0).sort((a, b) => b.pop - a.pop);
  const pairs: [LigFighter, LigFighter][] = [];
  const used = new Set<string>();
  for (const f of pool) {
    if (used.has(f.id) || pairs.length >= max) continue;
    const rakip = pool.filter((o) => o.id !== f.id && !used.has(o.id)).sort((x, y) => Number(y.siklet === f.siklet) - Number(x.siklet === f.siklet) || Math.abs(x.ovr - f.ovr) - Math.abs(y.ovr - f.ovr))[0];
    if (!rakip) continue;
    used.add(f.id);
    used.add(rakip.id);
    pairs.push([f, rakip]);
  }
  return pairs;
}

export const canRunNight = (s: GameState) => !!s.lig && buildCard(s).length >= 2;

/** Tahmini seyirci (ekranda göstermek için, rastgelelik olmadan). */
export function expectedCrowd(s: GameState, mekan: MekanId, bilet: Bilet) {
  const lig = s.lig!;
  const card = buildCard(s, MEKAN[mekan].mac);
  const ana = card[0] ? card[0][0].pop + card[0][1].pop : 0;
  const hepsi = card.reduce((a, [x, y]) => a + x.pop + y.pop, 0);
  const talep = (300 + lig.itibar * 60 + ana * 50 + hepsi * 8) * BILET[bilet].talep;
  return Math.round(Math.min(MEKAN[mekan].kap, talep));
}

export function runNight(s: GameState, mekan: MekanId, bilet: Bilet): string {
  const lig = s.lig;
  if (!lig || !canRunNight(s) || lig.itibar < MEKAN[mekan].itibar) return '';
  const card = buildCard(s, MEKAN[mekan].mac);
  const kap = MEKAN[mekan].kap;
  const seyirci = Math.round(Math.min(kap, expectedCrowd(s, mekan, bilet) * (0.85 + rand() * 0.3)));
  const fiyat = Math.round(BILET[bilet].fiyat * (1 + lig.itibar / 120));
  const bilet$ = seyirci * fiyat;
  const tv$ = tvLevel(lig.itibar) * (lig.itibar * 700);
  const sponsor$ = lig.itibar * 350;
  const mekan$ = MEKAN[mekan].maliyet;
  const ucret$ = card.reduce((a, [x, y]) => a + x.ucret + y.ucret, 0) + MEKAN[mekan].mac * 1_000;
  const sonuclar: LigResult[] = [];
  let enIyi = { id: '', puan: -1 };
  card.forEach(([x, y], i) => {
    const p = 1 / (1 + Math.exp(-(x.ovr - y.ovr) / 8));
    const [w, l] = chance(p) ? [x, y] : [y, x];
    const yontem = chance(0.32) ? 'KO' : chance(0.3) ? 'SUB' : 'KARAR';
    const raunt = yontem === 'KARAR' ? (i === 0 ? 5 : 3) : randInt(1, 3);
    w.g++;
    l.m++;
    w.pop = clamp(w.pop + (yontem === 'KARAR' ? 2 : 4) + (i === 0 ? 2 : 0), 0, 100);
    l.pop = clamp(l.pop - 1, 0, 100);
    if (w.yas < 29 && chance(0.4)) w.ovr = Math.min(95, w.ovr + 1);
    x.kalan--;
    y.kalan--;
    const puan = (yontem === 'KARAR' ? 20 : 70 - raunt * 10) + rand() * 25;
    if (puan > enIyi.puan) enIyi = { id: w.id, puan };
    sonuclar.push({ a: x.ad, b: y.ad, kazanan: w.ad, kaybeden: l.ad, yontem, raunt, ana: i === 0 });
  });
  const bonus$ = enIyi.id ? Math.round((3_000 + lig.itibar * 150) / 500) * 500 : 0;
  const kar = bilet$ + tv$ + sponsor$ - mekan$ - ucret$ - bonus$;
  // İtibar: dolu salon, kaliteli kart ve bitirişler artırır; zarar ve boş koltuk düşürür
  const doluluk = seyirci / kap;
  const kalite = card.reduce((a, [x, y]) => a + (x.ovr + y.ovr) / 2, 0) / card.length;
  const bitiris = sonuclar.filter((r) => r.yontem !== 'KARAR').length;
  const delta = Math.round(clamp((doluluk - 0.55) * 8 + (kalite - 55) / 8 + bitiris * 0.6 + (kar < 0 ? -2 : 1), -4, 8));
  lig.itibar = clamp(lig.itibar + delta, 0, 100);
  lig.geceler++;
  lig.toplamKar += kar;
  s.para += kar;
  const perf = card.flat().find((f) => f.id === enIyi.id);
  lig.son = { no: lig.geceler, mekan, bilet, seyirci, kapasite: kap, bilet$, tv$, sponsor$, mekan$, ucret$, bonus$, kar, sonuclar, gecePerf: perf?.ad, itibarDelta: delta };
  lig.aday = scout(s);
  advanceWeeks(s, 4);
  s.haberler.unshift(L("🏢 {0} {1}: {2} seyirci, {3}", [lig.ad, lig.geceler, seyirci.toLocaleString(LOC), kar >= 0 ? L("kâr ${0}", [kar.toLocaleString(LOC)]) : L("zarar ${0}", [Math.abs(kar).toLocaleString(LOC)])]));
  return '';
}

export const ITIBAR_LABEL = (it: number) => (it >= 80 ? L("Dünya devi") : it >= 60 ? L("Büyük organizasyon") : it >= 35 ? L("Yükselen lig") : it >= 15 ? L("Yerel organizasyon") : L("Yeni kurulmuş"));

export function leagueNames(s: GameState) {
  const sy = s.fighter.soyad.toLocaleUpperCase(LOC);
  return [`${sy} FC`, L("{0} Dövüş Ligi", [s.fighter.soyad]), 'YOL MMA', `${(s.fighter.memleket || 'Kafes').toLocaleUpperCase(LOC)} COMBAT`];
}
