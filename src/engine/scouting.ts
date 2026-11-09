// Rakip analizi: üst basamaklarda rakipler senin son maçlarını izler. Hep aynı silaha yaslanırsan (ör. her raunt
// takedown) sıradaki rakip kampında ona karşı çalışmış gelir. Haber kamp başında verilir; oyuncu planını değiştirerek
// cevap verebilir. Zorluk gizli bir sayıdan değil, hikâyeden gelir.
import { L } from '../i18n';
import { chance, clamp } from './rng';
import type { FightState, GameState, Stats, Tactic } from './types';

export type Silah = 'gures' | 'vurus';

const VURUS: Tactic[] = ['baski', 'kontra', 'mesafe'];

/** Maç bittiğinde: oyuncunun hangi silaha ne kadar yaslandığı (son maçlara daha çok ağırlık verilir). */
export function noteStyle(s: GameState, fs: FightState) {
  const h = fs.oyuncuTaktikGecmisi ?? [];
  if (!h.length) return;
  const gures = h.filter((t) => t === 'takedown').length / h.length;
  const vurus = h.filter((t) => VURUS.includes(t)).length / h.length;
  const t = s.tarz ?? { gures, vurus };
  s.tarz = { gures: t.gures * 0.55 + gures * 0.45, vurus: t.vurus * 0.55 + vurus * 0.45 };
}

const STAGE_MUL = { amator: 0, bolgesel: 0.6, buyuk: 1, ufc: 1.2 } as const;
const IZLEME = { amator: 0, bolgesel: 0.45, buyuk: 0.65, ufc: 0.8 } as const;

/** Kamp başında: rakip seni çalıştı mı? */
export function scoutRival(s: GameState) {
  const k = s.pending.kamp;
  const o = s.pending.rakip;
  const t = s.tarz;
  if (!k || !o || !t || !STAGE_MUL[s.stage] || !chance(IZLEME[s.stage])) return;
  const ad = o.soyad;
  if (t.gures > 0.45) {
    const v = Math.round(clamp((t.gures - 0.3) * 14 * STAGE_MUL[s.stage], 2, 7));
    k.analiz = { silah: 'gures', v, metin: L("📼 {0} son maçlarını kare kare izledi: neredeyse her rauntta bacaklara daldığını fark etti. Kampında sprawl ve kafeste kalkış çalıştı (rakip güreş +{1}). Bu sefer ayakta da bir planın olsun.", [ad, v]) };
  } else if (t.vurus > 0.85) {
    const v = Math.round(clamp((t.vurus - 0.75) * 30 * STAGE_MUL[s.stage], 2, 4));
    k.analiz = { silah: 'vurus', v, metin: L("📼 {0} son maçlarını izledi: hiç yere gitmediğini fark etti. Kampında çene sertleştirdi ve seni indirmeye çalıştı (rakip çene ve güreş +{1}). Takedown savunmanı unutma.", [ad, v]) };
  } else return;
  s.haberler.unshift(k.analiz.metin);
}

/** Maç günü: analizin rakibe kattığı. */
export function scoutMods(s: GameState, oppMods: Partial<Stats>) {
  const a = s.pending.kamp?.analiz;
  if (!a) return;
  const add = (st: keyof Stats, d: number) => (oppMods[st] = (oppMods[st] ?? 0) + d);
  if (a.silah === 'gures') add('gures', a.v);
  else {
    add('cene', a.v);
    add('gures', a.v);
  }
}
