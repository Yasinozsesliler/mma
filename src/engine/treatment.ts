// Ciddi sakatlıkta tedavi kararı: ameliyat (pahalı, hızlı, temiz), fizik tedavi (bedava, tam süre),
// deneysel tedavi (çok pahalı, çok hızlı ama işe yaramayabilir), iğneyle devam (hemen dön, kalıcı hasar riski).
import { L, LOC } from '../i18n';
import { addStat } from './character';
import { chance } from './rng';
import type { GameState, Injury } from './types';
import { STAT_LABELS } from './types';

export type TreatKey = 'ameliyat' | 'fizik' | 'deneysel' | 'igne';

const COST: Record<GameState['stage'], number> = { amator: 800, bolgesel: 4_000, buyuk: 15_000, ufc: 40_000 };

/** Dövüş sonrası ciddi sakatlıkta karar bekler. */
export function needsTreatment(inj: Injury) {
  return inj.hafta >= 5;
}

export function treatmentOptions(s: GameState) {
  const t = s.tedavi;
  if (!t) return [];
  const c = COST[s.stage];
  return [
    { key: 'ameliyat' as const, ad: L("Ameliyat ol"), aciklama: L("{0} hafta yerine {1} hafta. Temiz iyileşme.", [t.hafta, Math.max(1, Math.round(t.hafta * 0.6))]), maliyet: c, icon: 'hospital-box' },
    { key: 'fizik' as const, ad: L("Fizik tedavi ve dinlenme"), aciklama: L("{0} hafta sürer, risk yok.", [t.hafta]), maliyet: 0, icon: 'bed' },
    { key: 'deneysel' as const, ad: L("Yurt dışında deneysel tedavi"), aciklama: L("{0} haftada dönebilirsin ama tutmayabilir.", [Math.max(1, Math.round(t.hafta * 0.35))]), maliyet: c * 2, icon: 'airplane' },
    { key: 'igne' as const, ad: L("Ağrı kesici iğneyle devam"), aciklama: L("1 haftada dönersin ama %40 ihtimalle kronik ağrı ({0} kalıcı -2).", [STAT_LABELS[t.stat]]), maliyet: 0, icon: 'needle' },
  ];
}

export function chooseTreatment(s: GameState, key: TreatKey): string {
  const t = s.tedavi;
  if (!t) return '';
  const inj = s.sakatliklar.find((i) => i.ad === t.ad);
  // Karar verilmeden iyileştiyse tedaviye gerek kalmadı
  if (!inj) {
    s.tedavi = undefined;
    return '';
  }
  const opt = treatmentOptions(s).find((o) => o.key === key)!;
  if (s.para < opt.maliyet) return L("Bunun için paran yetmiyor.");
  s.para -= opt.maliyet;
  let msg: string;
  if (key === 'ameliyat') {
    inj.hafta = Math.max(1, Math.round(inj.hafta * 0.6));
    msg = L("🏥 Ameliyat başarılı geçti. {0} hafta sonra antrenmana dönebilirsin.", [inj.hafta]);
  } else if (key === 'fizik') {
    msg = L("🛏️ Fizik tedavi programı başladı. Sabırla iyileşeceksin.");
  } else if (key === 'deneysel') {
    if (chance(0.75)) {
      inj.hafta = Math.max(1, Math.round(inj.hafta * 0.35));
      msg = L("✈️ Deneysel tedavi işe yaradı! {0} haftada dönüyorsun.", [inj.hafta]);
    } else msg = L("✈️ Deneysel tedavi tutmadı. Para gitti, iyileşme süresi aynı.");
  } else {
    inj.hafta = 1;
    if (chance(0.4)) {
      addStat(s.fighter.stats, t.stat, -2);
      msg = L("💉 İğneyle hemen döndün ama sakatlık kronikleşti: {0} kalıcı olarak -2.", [STAT_LABELS[t.stat]]);
    } else msg = L("💉 İğneyle hemen döndün ve şansın yaver gitti, kalıcı hasar yok.");
  }
  s.haberler.unshift(msg);
  s.tedavi = undefined;
  return msg;
}

export const treatmentCostText = (n: number) => (n ? `$${n.toLocaleString(LOC)}` : L("Ücretsiz"));
