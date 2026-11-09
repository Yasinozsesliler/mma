// Yürüyüş sahnesinin ölçüsü: maçın ağırlığı (sahne gücü 0-3) ve tribünün iki köşeye tepkisi. Sahne buna göre
// büyür: spot ve flaş sayısı, piroteknik, şampiyon girişi, hakem talimatları; tezahürat baloncukları tepkiye göre.
import { L, LOC } from '../i18n';
import { isFarewellFight } from './farewell';
import { isAway } from './worldMap';
import type { GameState } from './types';

/** 0 sıradan · 1 profesyonel · 2 büyük maç · 3 şampiyonluk, veda ya da dünyanın konuştuğu maç */
export function walkoutTier(s: GameState): 0 | 1 | 2 | 3 {
  const fs = s.pending.dovus;
  if (!fs) return 0;
  const hype = s.pending.kamp?.hype ?? 0;
  if (fs.unvanMaci || isFarewellFight(s) || hype >= 70) return 3;
  if (fs.anaMac || hype >= 35 || s.ezeli?.id === fs.opp.id) return 2;
  return s.stage === 'amator' ? 0 : 1;
}

export type Mood = 'cosku' | 'karisik' | 'yuh';

/** Tribünün tepkisi: memleket/popülerlik coşku getirir; deplasman ve "kötü adam" dönemi yuhalatır. */
export function crowdMood(s: GameState, side: 'p' | 'o'): Mood {
  const o = s.pending.dovus?.opp;
  const away = !!o && isAway(s, o.sehir);
  const kotu = s.donemler?.[s.donemler.length - 1]?.id === 'kotu';
  const pop = s.populerlik;
  // Oyuncunun puanı: yüksek → oyuncuya coşku, rakibe yuh.
  let v = pop / 25 + (away ? -2 : 1) + (kotu ? -2.5 : 0) + (o?.memleket ? 2 : 0);
  if (side === 'o') v = -v + (away ? 1 : 0);
  return v >= 1.5 ? 'cosku' : v <= -1 ? 'yuh' : 'karisik';
}

/** Tezahürat baloncukları (sahne gücü arttıkça daha çok). */
export function chants(s: GameState, side: 'p' | 'o'): string[] {
  const fs = s.pending.dovus!;
  const name = side === 'p' ? s.fighter.lakap || s.fighter.soyad : fs.opp.lakap || fs.opp.soyad;
  const ad = name.toLocaleUpperCase(LOC);
  const mood = crowdMood(s, side);
  const cosku = [`${ad}! ${ad}!`, '👏👏👏', '🔥🔥', L("Haydi {0}!", [name]), '📣', `${ad}!`];
  const yuh = [L("Yuuuh!"), '👎', L("Yuuuh!"), '😤', L("Defol!"), '👎👎'];
  const list = mood === 'cosku' ? cosku : mood === 'yuh' ? yuh : [...cosku.slice(0, 3), ...yuh.slice(0, 3)];
  const n = [3, 5, 8, 12][walkoutTier(s)];
  return Array.from({ length: n }, (_, i) => list[i % list.length]);
}

/** Bant satırında salonun hâli. */
export const moodLine = (m: Mood) => (m === 'cosku' ? L("Salon: 🔥 coşkulu") : m === 'yuh' ? L("Salon: 😠 yuhalıyor") : L("Salon: ikiye bölünmüş"));
