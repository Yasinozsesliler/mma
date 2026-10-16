// Efsane ustadan ders: emekli efsanelerle 2 haftalık özel kamp. Pahalı; her usta kariyerde bir kez ders verir
// ve iki ders arasında en az 6 dövüş olmalı. Ustanın tekniği +2 seviye, uzmanlık istatistiği +1.
import { L, LOC } from '../i18n';
import { addStat, advanceWeeks } from './character';
import { MAX_TECH, techById } from './techniques';
import type { GameState, StatKey } from './types';
import { STAT_LABELS } from './types';

export interface Legend {
  id: string;
  ad: string;
  lakap: string;
  uyruk: string;
  teknik: string;
  stat: StatKey;
  minPop: number;
  carpan: number;
  soz: () => string;
}

export const LEGENDS: Legend[] = [
  { id: 'fyodor', ad: 'Viktor Zaytsev', lakap: L("Sessiz Dev"), uyruk: L("Rusya"), teknik: 'kimura', stat: 'gures', minPop: 30, carpan: 1.3, soz: () => L("“Sakin ol. Sakin olan kazanır.”") },
  { id: 'anderson', ad: 'Rodrigo Valente', lakap: L("Gölge"), uyruk: L("Brezilya"), teknik: 'ucandiz', stat: 'hiz', minPop: 25, carpan: 1.2, soz: () => L("“Rakibin vurmaya çalışırken sen dans et.”") },
  { id: 'gsp', ad: 'Étienne Laroche', lakap: L("Profesör"), uyruk: L("Kanada"), teknik: 'suplex', stat: 'gures', minPop: 35, carpan: 1.4, soz: () => L("“Disiplin, yetenekten daha uzun yaşar.”") },
  { id: 'royce', ad: 'Caio Mendonça', lakap: L("Ustaların Ustası"), uyruk: L("Brezilya"), teknik: 'ucgen', stat: 'yer', minPop: 20, carpan: 1.1, soz: () => L("“Küçük adam büyük adamı yenebilir. Kaldıraç her şeydir.”") },
  { id: 'mirko', ad: 'Dragan Petrović', lakap: L("Balyoz Bacak"), uyruk: L("Hırvatistan"), teknik: 'headkick', stat: 'vurus', minPop: 30, carpan: 1.3, soz: () => L("“Tekmeyi görmezsin; yalnızca sonrasını hatırlarsın.”") },
];

const BASE: Record<GameState['stage'], number> = { amator: 3_000, bolgesel: 12_000, buyuk: 40_000, ufc: 120_000 };
export const legendCost = (s: GameState, l: Legend) => Math.round((BASE[s.stage] * l.carpan) / 500) * 500;
export const LEGEND_GAP = 6;

export function legendStatus(s: GameState, l: Legend): { ok: boolean; neden?: string } {
  if ((s.ustalar ?? []).includes(l.id)) return { ok: false, neden: L("Bu ustanın dersini aldın.") };
  if (s.stage === 'amator') return { ok: false, neden: L("Efsaneler yalnızca profesyonellerle çalışır.") };
  if (s.populerlik < l.minPop) return { ok: false, neden: L("Seni tanımıyor. Popülerlik {0} gerekli.", [l.minPop]) };
  const gap = s.gecmis.length - (s.ustaSon ?? -99);
  if (gap < LEGEND_GAP) return { ok: false, neden: L("Yeni bir ders için {0} dövüş daha bekle.", [LEGEND_GAP - gap]) };
  if (s.pending.kamp || s.pending.rakip) return { ok: false, neden: L("Önce sıradaki maçını bitir.") };
  if (s.para < legendCost(s, l)) return { ok: false, neden: L("Paran yetmiyor.") };
  return { ok: true };
}

export function trainWithLegend(s: GameState, id: string): string {
  const l = LEGENDS.find((x) => x.id === id);
  if (!l || !legendStatus(s, l).ok) return '';
  s.para -= legendCost(s, l);
  s.ustalar = [...(s.ustalar ?? []), l.id];
  s.ustaSon = s.gecmis.length;
  advanceWeeks(s, 2);
  s.teknik ??= {};
  const cur = s.teknik[l.teknik] ?? { sv: 0, xp: 0 };
  const yeni = Math.min(MAX_TECH, cur.sv + 2);
  s.teknik[l.teknik] = { sv: yeni, xp: 0 };
  const d = addStat(s.fighter.stats, l.stat, 1, 1);
  const msg = L("🥋 {0} ile iki hafta çalıştın. {1} seviye {2}, {3} +{4}. {5}", [l.ad, techById(l.teknik)?.ad ?? '', yeni, STAT_LABELS[l.stat], d, l.soz()]);
  s.haberler.unshift(msg);
  return msg;
}

export const legendCostText = (s: GameState, l: Legend) => `$${legendCost(s, l).toLocaleString(LOC)}`;
