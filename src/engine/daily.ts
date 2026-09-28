// Günün Dövüşü: her gün herkes için aynı senaryo (tarihten tohumlanır). Dövüş de tohumlanır; aynı seçimler aynı
// sonucu verir, yani skorlar oyuncular arasında karşılaştırılabilir. Kariyerden bağımsızdır.
import { L } from '../i18n';
import { createGame } from './character';
import { BACKGROUNDS, baseStatsFor, COUNTRIES, NAME_POOLS, NICKNAMES } from './data';
import { PLANS, startFight } from './fight';
import { weakest } from './opponents';
import { clamp, noise, pick, randInt, setSeed } from './rng';
import { lookFor } from './tale';
import type { Background, FightResult, GameState, Opponent, PlanKey, Stats, WeightClass } from './types';
import { STAT_KEYS } from './types';

// ---------- Gün ----------

const EPOCH = Date.UTC(2026, 8, 28); // Günün Dövüşü #1

/** Bugünün numarası (yerel tarihe göre, #1'den başlar). */
export function dayNumber(d = new Date()) {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86_400_000) + 1;
}

/** Bir sonraki güne kalan milisaniye. */
export function msToNextDay(d = new Date()) {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return next.getTime() - d.getTime();
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ---------- Senaryo ----------

export type TwistId = 'kilo' | 'sakat' | 'unvan' | 'favori' | 'yorgun' | 'deplasman';

export const TWISTS: Record<TwistId, { baslik: string; aciklama: string; icon: string }> = {
  kilo: { baslik: L("Kiloyu zor verdin"), aciklama: L("Son gece sert kilo verdin: kondisyonun -10."), icon: 'scale-bathroom' },
  sakat: { baslik: L("Elin ağrıyor"), aciklama: L("Kampta sağ elini incittin: vuruşun -8."), icon: 'hand-back-right' },
  unvan: { baslik: L("Ünvan maçı"), aciklama: L("Kemer için 5 raunt. Kondisyon her şey."), icon: 'trophy' },
  favori: { baslik: L("Rakip favori"), aciklama: L("Bahisler onu gösteriyor: bütün istatistikleri +4."), icon: 'trending-up' },
  yorgun: { baslik: L("Kısa hazırlık"), aciklama: L("Rakip maça kısa sürede hazırlandı: kondisyonu -12."), icon: 'battery-low' },
  deplasman: { baslik: L("Deplasman"), aciklama: L("Onun şehrinde, seyirci karşında: dövüş IQ'n -6."), icon: 'account-group' },
};

export type DailySpec = {
  gun: number;
  siklet: WeightClass;
  ben: Opponent;
  rakip: Opponent;
  twist: TwistId;
};

const SIKLETLER: WeightClass[] = ['sinek', 'horoz', 'tuy', 'hafif', 'welter', 'orta', 'yariagir', 'agir'];

function fighter(level: number, stil: Background, id: string): Opponent {
  const pool = pick(NAME_POOLS);
  const stats = baseStatsFor(stil, level);
  STAT_KEYS.forEach((k) => (stats[k] = Math.round(clamp(stats[k] + noise(3), 20, 94))));
  return {
    id,
    ad: pick(pool.ad),
    soyad: pick(pool.soyad),
    lakap: pick(NICKNAMES),
    uyruk: pool.ulke,
    stil,
    kisilik: '',
    stats,
    rekor: { g: randInt(12, 22), m: randInt(1, 5), b: 0 },
    rank: randInt(3, 12),
    champion: false,
    rivalry: 0,
    karsilasma: 0,
  };
}

/** Günün senaryosu: herkes için aynı. */
export function dailySpec(gun: number): DailySpec {
  setSeed(hash(`yol-gunluk-${gun}`));
  const stils = Object.keys(BACKGROUNDS) as Background[];
  const stilBen = pick(stils);
  let stilO = pick(stils);
  if (stilO === stilBen) stilO = pick(stils);
  const level = randInt(62, 70);
  const ben = fighter(level, stilBen, `gunluk-ben-${gun}`);
  const rakip = fighter(level + 2, stilO, `gunluk-o-${gun}`);
  const twist = pick(Object.keys(TWISTS) as TwistId[]);
  const siklet = pick(SIKLETLER);
  reseed();
  return { gun, siklet, ben, rakip, twist };
}

const reseed = () => setSeed(Date.now() >>> 0);

/** Senaryonun oynanabilir (geçici) oyun durumu: dövüş ekranı bunu kullanır; hiçbir yuvaya kaydedilmez. */
export function dailyGame(spec: DailySpec, plan: PlanKey): GameState {
  const b = spec.ben;
  const uyruk = Object.keys(COUNTRIES).find((k) => COUNTRIES[k].ad === b.uyruk) ?? 'tr';
  const s = createGame(
    { ad: b.ad, soyad: b.soyad, lakap: b.lakap, uyruk, memleket: '', yas: 27, siklet: spec.siklet, gecmis: b.stil, hikaye: '', gorunum: lookFor(b) },
    b.stats,
  );
  s.contract = { org: 'ufc', kalan: 1, ucret: 0, bonus: 0, munhasir: true };
  s.stage = 'ufc';
  s.rekor = { ...s.rekor, g: b.rekor.g, m: b.rekor.m, b: b.rekor.b };
  s.ipuclari = undefined; // öğretici ipuçları burada görünmez
  const mods: Partial<Stats> = {};
  const oppMods: Partial<Stats> = {};
  if (spec.twist === 'kilo') mods.kondisyon = -10;
  if (spec.twist === 'sakat') mods.vurus = -8;
  if (spec.twist === 'deplasman') mods.iq = -6;
  if (spec.twist === 'yorgun') oppMods.kondisyon = -12;
  const opp: Opponent = spec.twist === 'favori' ? { ...spec.rakip, stats: Object.fromEntries(STAT_KEYS.map((k) => [k, Math.min(96, spec.rakip.stats[k] + 4)])) as Stats } : spec.rakip;
  s.pending.rakip = opp;
  const unvan = spec.twist === 'unvan';
  // Dövüşün kendisi de tohumlanır: aynı seçimler, aynı sonuç.
  setSeed(hash(`yol-gunluk-dovus-${spec.gun}-${plan}`));
  s.pending.dovus = startFight({
    pStats: b.stats,
    pAd: b.lakap || b.soyad,
    koseAdi: L("Köşen"),
    opp,
    mods: { stats: mods, plan, planUyum: PLANS[plan].hedef.includes(weakest(opp)), oppStats: oppMods },
    maxRaunt: unvan ? 5 : 3,
    unvanMaci: unvan,
    anaMac: true,
  });
  s.phase = 'dovus';
  return s;
}

export const endDailyFight = () => reseed();

// ---------- Skor ----------

export type DailyResult = { skor: number; sonuc: 'G' | 'M' | 'B'; yontem: FightResult['yontem']; raunt: number };

const FINISH = ['KO', 'TKO', 'SUB'];

export function dailyScore(r: FightResult, maxRaunt: number): DailyResult {
  const sonuc = r.kazanan === 'p' ? 'G' : r.kazanan === 'o' ? 'M' : 'B';
  let skor: number;
  if (sonuc === 'G') skor = FINISH.includes(r.yontem) ? 100 + (maxRaunt - r.raunt) * 25 : r.yontem === 'UD' ? 75 : 65;
  else if (sonuc === 'B') skor = 40;
  else skor = FINISH.includes(r.yontem) ? 5 + r.raunt * 5 : 25;
  return { skor, sonuc, yontem: r.yontem, raunt: r.raunt };
}

export function grade(skor: number) {
  return skor >= 125 ? '🏆' : skor >= 100 ? '🥇' : skor >= 65 ? '🥈' : skor >= 40 ? '🥉' : '💪';
}

// ---------- Kayıt (cihazda, kariyerlerden bağımsız) ----------

export type DailyStore = { son?: number; seri: number; enIyiSeri: number; toplam: number; kayit: Record<number, DailyResult> };

export const emptyDaily = (): DailyStore => ({ seri: 0, enIyiSeri: 0, toplam: 0, kayit: {} });

/** Seri: dün oynadıysan artar, bir gün atlarsan 1'den başlar. */
export function recordDaily(st: DailyStore, gun: number, r: DailyResult): DailyStore {
  if (st.kayit[gun]) return st;
  const seri = st.son === gun - 1 ? st.seri + 1 : 1;
  const kayit = { ...st.kayit, [gun]: r };
  // Yalnızca son 60 gün tutulur.
  Object.keys(kayit)
    .map(Number)
    .filter((g) => g < gun - 60)
    .forEach((g) => delete kayit[g]);
  return { son: gun, seri, enIyiSeri: Math.max(st.enIyiSeri, seri), toplam: st.toplam + 1, kayit };
}

/** Görünen seri: dün ya da bugün oynanmadıysa seri bozulmuştur. */
export const liveStreak = (st: DailyStore, gun: number) => (st.son === gun || st.son === gun - 1 ? st.seri : 0);
