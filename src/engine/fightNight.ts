// Dövüş gecesi: oyuncunun maçı tek başına değil, bir organizasyon gecesinin parçası. Afişte kaçıncı sırada
// olduğu (açılış, ön eleme, ana kart, co-main, ana maç) ün ve sıralamaya göre belirlenir; diğer maçların
// sonuçları kulis ekranında akar, gecenin sonunda "Gecenin Performansı" yarışı açıklanır.
import { L } from '../i18n';
import { currentOrg } from './character';
import { BACKGROUNDS, NAME_POOLS, ORGS, WEIGHT_CLASSES, femSurname } from './data';
import { chance, clamp, pick, rand, randInt, weighted } from './rng';
import { cityPin } from './worldMap';
import type { Background, FightNight, FightState, GameState, Method, NightBout, Stage, WeightClass } from './types';

const SIKLETLER = Object.keys(WEIGHT_CLASSES) as WeightClass[];

function randomName(kadin: boolean) {
  const p = pick(NAME_POOLS);
  return { ad: `${pick(kadin ? p.kadin : p.ad)} ${kadin && p.slav ? femSurname(pick(p.soyad)) : pick(p.soyad)}`, ulke: p.ulke };
}

const FINISH: Method[] = ['KO', 'TKO', 'SUB'];

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/** Bir maçın performans puanı: erken ve net bitiriş yüksek. */
function perfScore(yontem: Method, raunt: number, sec: number, extra = 0) {
  if (!FINISH.includes(yontem)) return 10 + rand() * 25 + extra;
  return 82 - (raunt - 1) * 11 - (sec / 60) * 1.6 + extra;
}

const STILLER = Object.keys(BACKGROUNDS) as Background[];
const VURUSCU: Background[] = ['boks', 'muaythai', 'kickboks', 'kyokushin', 'sokak'];
const KARNE: Record<Stage, [number, number]> = { amator: [1, 5], bolgesel: [4, 11], buyuk: [9, 18], ufc: [12, 22] };

/** Kazananın tarzına göre yöntem: vurucular nakavtla, güreşçi ve yer dövüşçüleri submission ve kararla bitirir. */
function methodFor(stil: Background, ezici: boolean): Method {
  const v = VURUSCU.includes(stil);
  const w: [Method, number][] = v
    ? [['KO', 38], ['TKO', 15], ['SUB', 5], ['UD', 30], ['SD', 9], ['MD', 3]]
    : [['KO', 10], ['TKO', 14], ['SUB', 32], ['UD', 33], ['SD', 8], ['MD', 3]];
  // Fark büyükse bitiriş daha olası.
  if (ezici) w.forEach((x) => FINISH.includes(x[0]) && (x[1] *= 1.4));
  return weighted(w);
}

function simBout(siklet: WeightClass, maxRaunt: number, stage: Stage = 'buyuk'): NightBout {
  const kadin = chance(0.22);
  const a = randomName(kadin);
  const b = randomName(kadin);
  const sa = pick(STILLER);
  const sb = pick(STILLER);
  // Güç farkı (logit): A'nın kazanma olasılığı %17-83 arası. Karneler bu farkı yansıtır, yani bilgi gerçek.
  const d = (rand() * 2 - 1) * 1.6;
  const pa = 1 / (1 + Math.exp(-d));
  const [lo, hi] = KARNE[stage];
  const rec = (x: number) => `${Math.max(0, randInt(lo, hi) + Math.round(x * 3))}-${Math.max(0, randInt(0, 4) - Math.round(x * 1.5))}`;
  const kazanan: 0 | 1 = chance(pa) ? 0 : 1;
  const yontem = methodFor(kazanan === 0 ? sa : sb, Math.abs(d) > 1 && (kazanan === 0) === d > 0);
  const fin = FINISH.includes(yontem);
  const raunt = !fin ? maxRaunt : weighted<number>(Array.from({ length: maxRaunt }, (_, i) => [i + 1, maxRaunt - i + 1] as [number, number]));
  const sec = !fin ? 300 : randInt(12, 295);
  return {
    a: a.ad,
    b: b.ad,
    ua: a.ulke,
    ub: b.ulke,
    siklet,
    kazanan,
    yontem,
    raunt,
    sure: mmss(sec),
    puan: Math.round(perfScore(yontem, raunt, sec, rand() * 14)),
    ra: rec(d),
    rb: rec(-d),
    sa,
    sb,
    pa: Math.round(pa * 100) / 100,
  };
}

/** Oyuncunun afişteki yeri. */
function slotFor(s: GameState, fs: FightState): FightNight['konum'] {
  if (fs.unvanMaci || fs.anaMac) return 'anaMac';
  const pop = s.populerlik;
  const r = s.rank;
  if (s.stage === 'amator') return s.amator.g + s.amator.m === 0 ? 'acilis' : pop >= 30 ? 'anaKart' : 'onEleme';
  if (r != null && r <= 5) return 'coMain';
  if ((r != null && r <= 10) || pop >= 55) return 'anaKart';
  if (s.gecmis.filter((h) => h.org === currentOrg(s)).length === 0 && pop < 25) return 'acilis';
  return 'onEleme';
}

export const SLOT_LABEL: Record<FightNight['konum'], string> = {
  acilis: L("AÇILIŞ MAÇI"),
  onEleme: L("ÖN ELEME"),
  anaKart: L("ANA KART"),
  coMain: L("CO-MAIN EVENT"),
  anaMac: L("ANA MAÇ"),
};

/** Dövüş başlarken gecenin kartını kurar. Yalnızca kariyer maçlarında. */
export function buildNight(s: GameState) {
  const fs = s.pending.dovus;
  if (!fs) return;
  const org = currentOrg(s);
  const info = ORGS[org];
  const toplam = { amator: 5, bolgesel: 7, buyuk: 9, ufc: 12 }[s.stage];
  const konum = slotFor(s, fs);
  // Oyuncunun sıradaki yeri (0 = ilk maç, toplam-1 = ana maç)
  const sira =
    konum === 'anaMac'
      ? toplam - 1
      : konum === 'coMain'
        ? toplam - 2
        : konum === 'anaKart'
          ? randInt(toplam - 5, toplam - 3)
          : konum === 'acilis'
            ? 0
            : randInt(1, Math.max(1, toplam - 6));
  const bouts: NightBout[] = [];
  for (let i = 0; i < toplam - 1; i++) {
    const anaMi = i >= toplam - 2 && konum !== 'anaMac';
    bouts.push(simBout(pick(SIKLETLER), anaMi ? 5 : 3, s.stage));
  }
  const sehir = s.pending.rakip?.sehir ? cityPin(s, s.pending.rakip.sehir)?.ad : undefined;
  const no = (s.gecmis.length * 3 + randInt(40, 60)) * (org === 'ufc' ? 3 : 1) + (org === 'ufc' ? 120 : 0);
  const night: FightNight = {
    ad: org === 'amator' ? L("Amatör Dövüş Gecesi") : `${info.kisa} ${no}`,
    sehir,
    konum,
    once: bouts.slice(0, sira),
    sonra: bouts.slice(sira),
    seyirci: Math.round(({ amator: 600, bolgesel: 2500, buyuk: 8000, ufc: 16000 }[s.stage] * (0.8 + s.populerlik / 200) * (0.85 + rand() * 0.3)) / 50) * 50,
  };
  s.pending.gece = night;
}

/** Oyuncunun bu geceki performans puanı. */
function playerScore(s: GameState, fs: FightState) {
  const r = fs.sonuc!;
  const [m, sec] = r.sure.split(':').map(Number);
  let extra = fs.oKnockdown * 4;
  if (r.teknik && s.imza?.teknik === r.teknik) extra += 6;
  if (fs.anaMac || fs.unvanMaci) extra += 4;
  return perfScore(r.yontem, r.raunt, (m || 0) * 60 + (sec || 0), extra);
}

/** Gecenin Performansı yarışı: oyuncu kazandıysa ve bitirdiyse gecenin en iyi diğer bitirişiyle karşılaştırılır. */
export function performanceRace(s: GameState): boolean {
  const g = s.pending.gece;
  const fs = s.pending.dovus;
  if (!g || !fs?.sonuc) return false;
  const r = fs.sonuc;
  const won = r.kazanan === 'p';
  const finish = r.yontem === 'KO' || r.yontem === 'TKO' || r.yontem === 'SUB';
  const diger = [...g.once, ...g.sonra].sort((a, b) => b.puan - a.puan)[0];
  // Rakip aday: kartın en iyi bitirişi; yarışın dengesi için 50-95 bandına çekilir.
  const adayPuan = diger ? clamp(diger.puan, 50, 95) : 70;
  const benim = won && finish ? Math.round(playerScore(s, fs)) : 0;
  const kazandi = won && finish && benim >= adayPuan;
  g.yaris = {
    aday: diger ? `${diger.kazanan === 0 ? diger.a : diger.b}` : '',
    adayYontem: diger ? `${diger.yontem} · R${diger.raunt} ${diger.sure}` : '',
    adayPuan: Math.round(adayPuan),
    benim,
    kazandi,
  };
  return kazandi;
}

// ---------- Tahmin kartı ----------

export type PredictionBout = { key: string; b: NightBout };

/** Kartın en üstündeki (oyuncunun maçı hariç) 3 maç; eski kayıtlarda bilgi yoksa boş. */
export function predictionBouts(g: FightNight): PredictionBout[] {
  const all = [...g.once.map((b, i) => ({ key: `o${i}`, b, pos: i })), ...g.sonra.map((b, i) => ({ key: `s${i}`, b, pos: g.once.length + 1 + i }))];
  return all
    .filter((x) => x.b.pa != null)
    .sort((x, y) => y.pos - x.pos)
    .slice(0, 3)
    .map(({ key, b }) => ({ key, b }));
}

const boutOf = (g: FightNight, key: string) => (key[0] === 'o' ? g.once : g.sonra)[Number(key.slice(1))];
export const isFinish = (m: Method) => FINISH.includes(m);
const TAHMIN_BIRIM: Record<Stage, number> = { amator: 100, bolgesel: 700, buyuk: 3000, ufc: 9000 };

/** Tahmin doğru mu: kazanan ve (kazanan doğruysa) bitiriş/karar. */
export function judgePick(b: NightBout, p: { k: 0 | 1; bit?: boolean }) {
  const dogru = b.kazanan === p.k;
  return { dogru, yontem: dogru && p.bit != null && isFinish(b.yontem) === p.bit };
}

/** Maç sonunda tahminler sonuçlanır: doğru kazanan (sürpriz seçim daha değerli) + doğru bitiriş/karar. */
export function settlePredictions(s: GameState): number {
  const g = s.pending.gece;
  if (!g?.tahmin || g.tahminSonuc) return 0;
  let birim = 0;
  let dogru = 0;
  let yontem = 0;
  const keys = Object.keys(g.tahmin);
  keys.forEach((key) => {
    const b = boutOf(g, key);
    const p = g.tahmin![key];
    if (!b || b.pa == null) return;
    const j = judgePick(b, p);
    if (!j.dogru) return;
    dogru++;
    const olasilik = p.k === 0 ? b.pa : 1 - b.pa;
    birim += clamp(0.55 / olasilik, 0.7, 2.6);
    if (j.yontem) {
      yontem++;
      birim += 0.5;
    }
  });
  const para = Math.round((birim * TAHMIN_BIRIM[s.stage]) / 50) * 50;
  const kahin = keys.length >= 3 && dogru === keys.length;
  if (kahin) s.populerlik = Math.min(100, s.populerlik + 1);
  g.tahminSonuc = { dogru, yontem, toplam: keys.length, para, kahin };
  return para;
}
