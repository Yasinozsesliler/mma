// Crossover boks maçı: kariyerin zirvesinde dünyaca ünlü bir boksörden süper maç. Kendi mini oyunu var
// (6 raunt, tekme ve güreş yok); MMA karnesini etkilemez. Kariyerde bir kez; devasa ücret.
import { L, LOC } from '../i18n';
import { addFollowers, fmtDelta, followers } from './fame';
import { chance, clamp, pick, rand } from './rng';
import { legendBoxResult } from './legendRun';
import type { GameState } from './types';

export type BoxPlan = 'jab' | 'kombo' | 'kontra' | 'klinc';
export type BoxIntent = 'baski' | 'kontra' | 'mesafe';

export interface Boxer {
  ad: string;
  lakap: string;
  rekor: string;
  guc: number;
}

export interface BoxFight {
  boksor: Boxer;
  ucret: number;
  raunt: number;
  pHasar: number;
  oHasar: number;
  pKondisyon: number;
  pPuan: number;
  oPuan: number;
  niyet: BoxIntent;
  /** Son plan: aynı planı üst üste kullanırsan boksör okur */
  sonPlan?: BoxPlan;
  ipucu: string;
  log: string[];
  bitti?: 'G' | 'M';
  yontem?: 'KO' | 'karar';
}

export const BOX_ROUNDS = 6;
export const HINT_ACC = 0.6;

const BOXERS_LIGHT: Boxer[] = [{ ad: 'Marcus Bell', lakap: L("Kusursuz"), rekor: '47-0', guc: 94 }];
const BOXERS_MID: Boxer[] = [{ ad: 'Rafael Durán', lakap: L("Kartal"), rekor: '58-3-2', guc: 92 }];
const BOXERS_HEAVY: Boxer[] = [
  { ad: 'Liam Hollister', lakap: L("Kuzey Devi"), rekor: '33-0-1', guc: 91 },
  { ad: 'Darius Okafor', lakap: L("Kule"), rekor: '27-3', guc: 89 },
];

function boxerFor(s: GameState): Boxer {
  const w = s.fighter.siklet;
  if (['sinek', 'horoz', 'tuy', 'hafif'].includes(w)) return BOXERS_LIGHT[0];
  if (['welter', 'orta'].includes(w)) return BOXERS_MID[0];
  return pick(BOXERS_HEAVY);
}

const PURSE: Record<GameState['stage'], number> = { amator: 0, bolgesel: 0, buyuk: 2_000_000, ufc: 8_000_000 };

/** Dövüşten sonra teklif gelebilir: kariyerde bir kez. */
export function maybeCrossover(s: GameState) {
  // Efsane Yolu kendi boks maçını senaryoyla getirir
  if (s.boksYapildi || s.boksTeklif || s.boks || s.efsane) return;
  if (!['buyuk', 'ufc'].includes(s.stage)) return;
  // "Boks macerası" dönemi seçildiyse kapı aralık: şart aranmaz, teklif çabuk gelir
  if (s.boksKapi ? !chance(0.5) : s.populerlik < 55 || followers(s) < 500_000 || !chance(0.1)) return;
  const b = boxerFor(s);
  s.boksTeklif = { boksor: b, ucret: PURSE[s.stage] };
  s.haberler.unshift(L("🥊 Bomba teklif: Boks efsanesi {0} seninle süper maç istiyor! Ücret ${1}.", [b.ad, PURSE[s.stage].toLocaleString(LOC)]));
}

const INTENTS: BoxIntent[] = ['baski', 'kontra', 'mesafe'];
const HINT: Record<BoxIntent, () => string[]> = {
  baski: () => [L("İleri basıyor, omuzları gergin."), L("Mesafeyi kapatmak için bekleyemiyor."), L("Seni köşeye sıkıştırmaya çalışıyor.")],
  kontra: () => [L("Gardını kapatmış, gözleri seni takip ediyor."), L("Ağırlığı arka ayağında, saldırmanı bekliyor."), L("Sakin. Fazla sakin.")],
  mesafe: () => [L("Yan yan dans ediyor, jabını sallıyor."), L("Ringin ortasında çember çiziyor."), L("Uzaktan dokunup kaçıyor.")],
};

function newIntent(b: BoxFight) {
  b.niyet = pick(INTENTS);
  // İpucu her zaman doğru değil
  const shown = chance(HINT_ACC) ? b.niyet : pick(INTENTS.filter((x) => x !== b.niyet));
  b.ipucu = pick(HINT[shown]());
}

export function acceptCrossover(s: GameState) {
  const t = s.boksTeklif;
  if (!t) return;
  s.boksTeklif = undefined;
  s.boks = { boksor: t.boksor, ucret: t.ucret, raunt: 1, pHasar: 0, oHasar: 0, pKondisyon: 100, pPuan: 0, oPuan: 0, niyet: 'baski', ipucu: '', log: [] };
  newIntent(s.boks);
  s.phase = 'boks';
}

export function declineCrossover(s: GameState) {
  if (!s.boksTeklif) return;
  s.haberler.unshift(L("🥊 {0} teklifini geri çevirdin. “Kafes benim evim.”", [s.boksTeklif.boksor.ad]));
  s.boksTeklif = undefined;
  s.boksYapildi = true;
  legendBoxResult(s, 'red');
}

/** Plan x niyet: oyuncunun raunt avantajı (-1 kötü … +1 iyi). */
const EDGE: Record<BoxIntent, Record<BoxPlan, number>> = {
  baski: { kontra: 1, klinc: 0.3, jab: -0.2, kombo: -0.8 },
  kontra: { jab: 1, klinc: 0, kontra: -0.3, kombo: -0.9 },
  mesafe: { kombo: 1, jab: 0, klinc: 0.2, kontra: -0.7 },
};

export function boxRound(s: GameState, plan: BoxPlan) {
  const b = s.boks;
  if (!b || b.bitti) return;
  const st = s.fighter.stats;
  const me = st.vurus * 0.5 + st.hiz * 0.3 + st.iq * 0.2;
  const ratio = me / b.boksor.guc;
  // Aynı planı tekrarlayanı usta boksör okur
  const edge = EDGE[b.niyet][plan] - (b.sonPlan === plan ? 0.5 : 0);
  b.sonPlan = plan;
  const tired = b.pKondisyon < 40 ? 0.75 : 1;
  const myHit = Math.max(0, (4 + 10 * (edge + 0.2)) * ratio * tired * (0.8 + rand() * 0.4));
  const hisHit = Math.max(3, (20 - 10 * edge) * (1.15 - st.cene / 200) * (plan === 'klinc' ? 0.6 : 1) * (0.8 + rand() * 0.4));
  b.oHasar = clamp(b.oHasar + myHit, 0, 120);
  b.pHasar = clamp(b.pHasar + hisHit, 0, 120);
  b.pKondisyon = clamp(b.pKondisyon - (plan === 'kombo' ? 22 : plan === 'klinc' ? 6 : 12) + st.kondisyon / 12, 0, 100);
  // Raunt puanı (10-9 sistemi gibi)
  const iWon = myHit >= hisHit;
  b.pPuan += iWon ? 10 : 9;
  b.oPuan += iWon ? 9 : 10;
  const name = b.boksor.ad.split(' ')[1] ?? b.boksor.ad;
  const line =
    edge >= 0.9
      ? L("{0}. raunt: Onu okudun! Temiz vuruşlar, salon ayakta.", [b.raunt])
      : edge >= 0
        ? L("{0}. raunt: Dengeli bir raunt, ikiniz de vurdunuz.", [b.raunt])
        : L("{0}. raunt: {1} seni okudu, sert kontralar yedin.", [b.raunt, name]);
  b.log.unshift(line);
  if (b.oHasar >= 100 || (b.oHasar >= 75 && chance(0.25 * ratio))) return endBox(s, 'G', 'KO');
  if (b.pHasar >= 100 || (b.pHasar >= 80 && chance(0.3))) return endBox(s, 'M', 'KO');
  if (b.raunt >= BOX_ROUNDS) return endBox(s, b.pPuan > b.oPuan ? 'G' : 'M', 'karar');
  b.raunt++;
  newIntent(b);
}

function endBox(s: GameState, sonuc: 'G' | 'M', yontem: 'KO' | 'karar') {
  const b = s.boks!;
  b.bitti = sonuc;
  b.yontem = yontem;
  s.boksYapildi = true;
  const win = sonuc === 'G';
  const para = Math.round(b.ucret * (win ? 1.25 : 1));
  s.para += para;
  s.populerlik = clamp(s.populerlik + (win ? 15 : -2), 0, 100);
  const d = addFollowers(s, followers(s) * (win ? 0.25 : 0.05));
  if (win) s.unvanlar.push(L("Crossover zaferi: {0}", [b.boksor.ad]));
  const txt = win
    ? yontem === 'KO'
      ? L("🥊 TARİH YAZILDI! Boks ringinde {0} karşısında nakavtla kazandın!", [b.boksor.ad])
      : L("🥊 Hakemler senden yana! Boks efsanesi {0} karşısında kazandın.", [b.boksor.ad])
    : yontem === 'KO'
      ? L("🥊 {0} boks ringinde fazla geldi: nakavt oldun. Ama herkes cesaretini konuşuyor.", [b.boksor.ad])
      : L("🥊 Hakem kararıyla kazanan {0} oldu… ama sonuna kadar dayandın.", [b.boksor.ad]);
  b.log.unshift(txt);
  s.haberler.unshift(`${txt} ${L("Kazanç ${0}, {1} takipçi.", [para.toLocaleString(LOC), fmtDelta(d)])}`);
  legendBoxResult(s, sonuc, yontem);
}

export function closeBox(s: GameState) {
  s.boks = undefined;
  s.phase = 'hub';
}
