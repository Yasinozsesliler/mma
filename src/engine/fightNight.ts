// Dövüş gecesi: oyuncunun maçı tek başına değil, bir organizasyon gecesinin parçası. Afişte kaçıncı sırada
// olduğu (açılış, ön eleme, ana kart, co-main, ana maç) ün ve sıralamaya göre belirlenir; diğer maçların
// sonuçları kulis ekranında akar, gecenin sonunda "Gecenin Performansı" yarışı açıklanır.
import { L } from '../i18n';
import { currentOrg } from './character';
import { NAME_POOLS, ORGS, WEIGHT_CLASSES, femSurname } from './data';
import { chance, clamp, pick, rand, randInt, weighted } from './rng';
import { cityPin } from './worldMap';
import type { FightNight, FightState, GameState, Method, NightBout, WeightClass } from './types';

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

function simBout(siklet: WeightClass, maxRaunt: number): NightBout {
  const kadin = chance(0.22);
  const a = randomName(kadin);
  const b = randomName(kadin);
  const yontem = weighted<Method>([['KO', 30], ['TKO', 12], ['SUB', 20], ['UD', 28], ['SD', 7], ['MD', 3]]);
  const fin = FINISH.includes(yontem);
  const raunt = !fin ? maxRaunt : weighted<number>(Array.from({ length: maxRaunt }, (_, i) => [i + 1, maxRaunt - i + 1] as [number, number]));
  const sec = !fin ? 300 : randInt(12, 295);
  return {
    a: a.ad,
    b: b.ad,
    ua: a.ulke,
    ub: b.ulke,
    siklet,
    kazanan: chance(0.5) ? 0 : 1,
    yontem,
    raunt,
    sure: mmss(sec),
    puan: Math.round(perfScore(yontem, raunt, sec, rand() * 14)),
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
    bouts.push(simBout(pick(SIKLETLER), anaMi ? 5 : 3));
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
