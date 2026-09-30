// Antrenman mini oyunları: her kamp haftasında isteğe bağlı kısa bir seans.
// Oynamayan normal kamp sonucunu alır; iyi oynayan daha hızlı gelişir ve daha az sakatlanır.
import { L } from '../i18n';
import { clamp } from './rng';
import type { GameState, StatKey } from './types';

export type DrillId = 'pad' | 'refleks' | 'ritim';

export const DRILLS: Record<DrillId, { ad: string; aciklama: string; ikon: string }> = {
  pad: { ad: L("Pad çalışması"), aciklama: L("Halka hedefe oturduğu anda vur. Zamanlama her şey."), ikon: 'boxing-glove' },
  refleks: { ad: L("Takedown savunması"), aciklama: L("Rakip dalınca hemen dokun. Çalım atarsa sakın dokunma!"), ikon: 'run-fast' },
  ritim: { ad: L("İp atlama"), aciklama: L("İp yere değdiği anda dokun. Ritmi kaçırma."), ikon: 'jump-rope' },
};

/** Kamp odağına uygun oyun. */
export function drillFor(focus?: StatKey): DrillId {
  if (focus === 'gures' || focus === 'yer' || focus === 'hiz') return 'refleks';
  if (focus === 'kondisyon') return 'ritim';
  return 'pad';
}

/** Bu kamp haftasının seansı oynandı mı? */
export function drillDone(s: GameState) {
  const k = s.pending.kamp;
  return !!k?.idman?.some((x) => x.idx === (k.kampIdx ?? 0));
}

export function drillGrade(puan: number) {
  return puan >= 85 ? L("Kusursuz") : puan >= 65 ? L("Çok iyi") : puan >= 40 ? L("Fena değil") : L("Kötü gün");
}

/** Seans sonucu kaydedilir (haftada bir). */
export function recordDrill(s: GameState, puan: number) {
  const k = s.pending.kamp;
  if (!k || drillDone(s)) return;
  const oyun = drillFor(k.focus);
  const p = clamp(Math.round(puan), 0, 100);
  k.idman = [...(k.idman ?? []), { idx: k.kampIdx ?? 0, oyun, puan: p }];
  k.haftaLog = [...(k.haftaLog ?? []), L("🎯 {0}: {1} puan · {2}", [DRILLS[oyun].ad, p, drillGrade(p)])];
}

/** Kamp sonu etkisi: gelişim çarpanı (1–1.3) ve sakatlık riski çarpanı (0.8–1). */
export function drillBonus(s: GameState) {
  const k = s.pending.kamp;
  const list = k?.idman ?? [];
  if (!k || !list.length) return { gelisim: 1, risk: 1, ort: 0 };
  const pay = list.reduce((a, x) => a + clamp((x.puan - 40) / 60, 0, 1), 0) / Math.max(1, k.hafta);
  const ort = Math.round(list.reduce((a, x) => a + x.puan, 0) / list.length);
  return { gelisim: 1 + clamp(pay, 0, 1) * 0.3, risk: 1 - clamp(pay, 0, 1) * 0.2, ort };
}
