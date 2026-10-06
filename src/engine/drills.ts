// Antrenman mini oyunları: her kamp haftasında isteğe bağlı kısa bir seans.
// Oynamayan normal kamp sonucunu alır; iyi oynayan daha hızlı gelişir ve daha az sakatlanır.
import { bump } from './istat';
import { L } from '../i18n';
import { clamp } from './rng';
import type { GameState } from './types';

export type DrillId = 'pad' | 'refleks' | 'ritim' | 'spar';

export const DRILLS: Record<DrillId, { ad: string; aciklama: string; ikon: string }> = {
  pad: { ad: L("Pad çalışması"), aciklama: L("Hoca kombinasyonu söyler. Sırası gelen pad yanar: halka pada oturduğu anda o pada vur."), ikon: 'boxing-glove' },
  refleks: { ad: L("Takedown savunması"), aciklama: L("Rakibi oku: gerçekten dalarsa hemen dokun ve sprawl yap. Eğilip doğrulursa ya da jab atarsa bekle. Sprawl'dan sonra giyotin fırsatını kaçırma!"), ikon: 'run-fast' },
  ritim: { ad: L("İp atlama"), aciklama: L("İp yere değdiği anda dokun. Ritmi kaçırma."), ikon: 'jump-rope' },
  spar: { ad: L("Canlı sparring"), aciklama: L("25 saniyelik gerçek zamanlı spar. Partner ⚠️ ile saldırı hazırlar: KAÇ ve hemen kontra vur. Hazırlık sırasında DİREKT vurursan saldırısını kesersin; 🛡️ gardına vurma."), ikon: 'karate' },
};

const DRILL_IDS: DrillId[] = ['pad', 'refleks', 'ritim', 'spar'];

const hashStr = (t: string) => {
  let h = [...t].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  // Son karıştırma: küçük farklar bütün bitlere yayılsın
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
};

/** Kampın oyun sırası: her kamp kendi karışık sırasıyla başlar (rakip ve kamp başı haftası tohum). */
function campOrder(s: GameState): DrillId[] {
  const k = s.pending.kamp;
  let seed = hashStr(`${s.pending.rakip?.id ?? ''}|${s.gecmis.length}|${k?.hafta ?? 0}|${s.fighter.soyad}`);
  const order = [...DRILL_IDS];
  for (let i = order.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = (seed >>> 16) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Bu kamp haftasının oyunu: kampın karışık sırasından; 4 haftada her oyun bir kez gelir, yeniden açınca değişmez. */
export function drillOfWeek(s: GameState): DrillId {
  const idx = s.pending.kamp?.kampIdx ?? 0;
  const order = campOrder(s);
  // Dört haftadan uzun kamplarda sıra her turda kayar (art arda aynı oyun gelmez)
  const round = Math.floor(idx / order.length);
  return order[(idx + round) % order.length];
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
  const oyun = drillOfWeek(s);
  const p = clamp(Math.round(puan), 0, 100);
  k.idman = [...(k.idman ?? []), { idx: k.kampIdx ?? 0, oyun, puan: p }];
  if (p >= 80) bump(s, 'idmanIyi');
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
