// Büyük maçlarda hype ve PPV: maç öncesi yapılan her şey (basın düellosu, face-off, giriş şovu, kriz, belgesel)
// hype'ı yükseltir; dövüşten sonra hype ve takipçiye göre PPV satışı hesaplanır, oyuncu pay alır.
import { isComebackFight } from './comeback';
import { L, LOC } from '../i18n';
import { currentOrg } from './character';
import { diffOf } from './challenges';
import { followers } from './fame';
import type { GameState, Opponent } from './types';

/** Büyük maç mı? (unvan, UCC ilk 5, memleket, rekabet/ezeli rakip, Grand Prix finali) */
export function isBigFight(s: GameState, o: Opponent) {
  if (!['buyuk', 'ufc'].includes(s.stage)) return false;
  const gpFinal = !!s.gp && !s.gp.bitti && s.gp.turlar.length === 2;
  return o.champion || s.sampiyon || (currentOrg(s) === 'ufc' && s.rank != null && s.rank <= 5) || !!o.memleket || o.rivalry >= 2 || s.ezeli?.id === o.id || gpFinal || isComebackFight(s);
}

/** Kamp başında hype tabanı (büyük maç değilse hype yok). */
export function initHype(s: GameState) {
  const k = s.pending.kamp;
  const o = s.pending.rakip;
  if (!k || !o || !isBigFight(s, o)) return;
  k.hype = Math.min(55, Math.round(8 + s.populerlik / 5 + Math.min(3, o.rivalry) * 5 + (o.champion || s.sampiyon ? 12 : 0) + (o.memleket ? 8 : 0)));
  k.hypeLog = [L("Maç duyuruldu")];
}

export function addHype(s: GameState, n: number, neden: string) {
  const k = s.pending.kamp;
  if (!k || k.hype == null || !n) return;
  k.hype = Math.max(0, Math.min(100, k.hype + n));
  k.hypeLog = [...(k.hypeLog ?? []), `${neden} ${n > 0 ? '+' : ''}${n}`].slice(-6);
}

export const hypeLabel = (h: number) => (h >= 85 ? L("Dünya bu maçı konuşuyor") : h >= 65 ? L("Bilet bulmak zor") : h >= 40 ? L("İlgi yüksek") : L("Sıradan bir kart"));

/** Dövüş sonrası PPV payı (yalnızca büyük maçlarda). */
export function ppvPayout(s: GameState, opp: Opponent, hype: number | undefined): string[] {
  if (hype == null) return [];
  const ufc = s.stage === 'ufc';
  const buys = Math.round(((hype / 100) * Math.pow(Math.max(1000, followers(s)), 0.6) * (ufc ? 7 : 3)) / 100) * 100;
  const price = ufc ? 60 : 30;
  const share = (s.sampiyon || opp.champion ? 0.03 : 0.015) * diffOf(s).ucret;
  const pay = Math.round((buys * price * share) / 100) * 100;
  s.para += pay;
  return [L("📺 PPV: {0} satış (hype {1}). Payın: ${2}", [buys.toLocaleString(LOC), hype, pay.toLocaleString(LOC)])];
}

/** Maç öncesi belgesel izlendi: hype +10 (bir kez). */
export function watchCountdown(s: GameState) {
  const k = s.pending.kamp;
  if (!k || k.hype == null || k.belgesel) return;
  k.belgesel = true;
  addHype(s, 10, L("Countdown belgeseli"));
}
