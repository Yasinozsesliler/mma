// Günlük Kutu: gerçek günde bir kez ücretsiz küçük ödül. Art arda gelinen günlerde 7 günlük döngüde büyür;
// bir gün kaçarsa 1. güne döner. 3. ve 7. günde takipçi de çıkar. Ödüllü reklamla kutunun parası bir kez ikiye katlanır.
// Kural (ödüllü reklam ilkesi): güç (istatistik/puan) vermez; yalnızca aşamaya uygun para ve takipçi.
import { addFollowers, fmtDelta, followers } from './fame';
import type { GameState, Stage } from './types';
import { L } from '../i18n';

export type BoxState = { gun: number; seri: number; para?: number; katlandi?: boolean };

const BASE: Record<Stage, number> = { amator: 250, bolgesel: 1_000, buyuk: 4_000, ufc: 7_000 };
export const BOX_DAYS = 7;

/** Bugün açılacak kutunun seri günü (1-7). */
export function boxStreak(st: BoxState | undefined, gun: number): number {
  if (!st) return 1;
  if (st.gun === gun) return st.seri;
  return st.gun === gun - 1 ? (st.seri % BOX_DAYS) + 1 : 1;
}

export const boxOpened = (st: BoxState | undefined, gun: number) => st?.gun === gun;

export const boxPara = (stage: Stage, seri: number) => Math.round((BASE[stage] * (1 + 0.15 * (seri - 1)) * (seri === BOX_DAYS ? 2 : 1)) / 50) * 50;

const boxFans = (s: GameState, seri: number) => {
  if (seri !== 3 && seri !== BOX_DAYS) return 0;
  const k = seri === BOX_DAYS ? 2 : 1;
  return Math.round((followers(s) * 0.01 + 25) * k);
};

/** Kutuyu açar: ödülü kariyere uygular, yeni kutu durumunu ve sonuç satırını döndürür. */
export function openBox(s: GameState, st: BoxState | undefined, gun: number): { st: BoxState; metin: string } | null {
  if (boxOpened(st, gun)) return null;
  const seri = boxStreak(st, gun);
  const para = boxPara(s.stage, seri);
  s.para += para;
  const parts = [`+$${para.toLocaleString()}`];
  const fans = boxFans(s, seri);
  if (fans) parts.push(L("{0} takipçi", [fmtDelta(addFollowers(s, fans))]));
  return { st: { gun, seri, para }, metin: L("🎁 Günlük kutu ({0}. gün): {1}", [seri, parts.join(' · ')]) };
}

export const canDoubleBox = (st: BoxState | undefined, gun: number) => boxOpened(st, gun) && !st!.katlandi && (st!.para ?? 0) > 0;

/** Ödüllü reklam: bugünkü kutunun parası bir kez daha. */
export function doubleBox(s: GameState, st: BoxState): { st: BoxState; metin: string } {
  const para = st.para ?? 0;
  s.para += para;
  return { st: { ...st, katlandi: true }, metin: L("🎁 Kutu ikiye katlandı: +${0}", [para.toLocaleString()]) };
}
