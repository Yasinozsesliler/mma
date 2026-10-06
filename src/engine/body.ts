// Vücut ve yaşlanma: yaş evreleri (gelişim çağı, zirve, tecrübe, gün batımı), ağır sakatlıklardan kalan kronik izler
// (kampta küçük ek sakatlık riski) ve sakin bir haftalık rutin (beslenme ve uyku). Rutin bir kez seçilir, istenince değişir.
import { L, LOC } from '../i18n';
import { chance } from './rng';
import type { GameState, Injury, StatKey } from './types';

export type Beslenme = 'serbest' | 'dengeli' | 'temiz';
export type Uyku = 'degisken' | 'duzenli';
export interface Rutin {
  beslenme: Beslenme;
  uyku: Uyku;
}
export interface Iz {
  bolge: StatKey;
  ad: string;
  yas: number;
}

export const DEFAULT_RUTIN: Rutin = { beslenme: 'dengeli', uyku: 'degisken' };
export const rutinOf = (s: GameState) => s.rutin ?? DEFAULT_RUTIN;

const DIYET: Record<GameState['stage'], number> = { amator: 50, bolgesel: 300, buyuk: 1_500, ufc: 5_000 };

export const BESLENME: Record<Beslenme, { ad: () => string; aciklama: (s: GameState) => string; ikon: string }> = {
  serbest: { ad: () => L("Serbest"), aciklama: () => L("Ne canın isterse. Kilo vermek zorlaşır, iyileşme biraz yavaşlar."), ikon: 'food' },
  dengeli: { ad: () => L("Dengeli"), aciklama: () => L("Ev yemekleri, ölçülü porsiyon. Etkisi yok."), ikon: 'food-apple' },
  temiz: { ad: () => L("Temiz"), aciklama: (s) => L("Hazır diyet menüsü: maç başı ${0}. Kilo vermek kolaylaşır, iyileşme hızlanır.", [DIYET[s.stage].toLocaleString(LOC)]), ikon: 'leaf' },
};
export const UYKU: Record<Uyku, { ad: () => string; aciklama: () => string; ikon: string }> = {
  degisken: { ad: () => L("Değişken"), aciklama: () => L("Geç saatlere kadar sosyal hayat: maç başı popülerlik +1, iyileşme normal."), ikon: 'weather-night' },
  duzenli: { ad: () => L("Düzenli"), aciklama: () => L("Her gece 8 saat, telefon yatak odasına girmiyor: iyileşme hızlanır."), ikon: 'sleep' },
};

/** İyileşme çarpanına rutin katkısı (restMultiplier'a eklenir). */
export function rutinRest(s: GameState) {
  const r = rutinOf(s);
  return (r.beslenme === 'temiz' ? 0.1 : r.beslenme === 'serbest' ? -0.05 : 0) + (r.uyku === 'duzenli' ? 0.1 : 0);
}
/** Kilo verme başarısına rutin katkısı (cutBonus'a eklenir). */
export function rutinCut(s: GameState) {
  const r = rutinOf(s).beslenme;
  return r === 'temiz' ? 0.06 : r === 'serbest' ? -0.06 : 0;
}
/** Maç sonu: diyet gideri ve sosyal hayatın popülerliği. */
export function rutinAfterFight(s: GameState): string[] {
  const r = rutinOf(s);
  const out: string[] = [];
  if (r.beslenme === 'temiz') {
    s.para -= DIYET[s.stage];
    out.push(L("🥗 Diyet menüsü: -${0}", [DIYET[s.stage].toLocaleString(LOC)]));
  }
  if (r.uyku === 'degisken') s.populerlik = Math.min(100, s.populerlik + 1);
  return out;
}

// ---------- Kronik izler ----------

export const BOLGE: Record<StatKey, () => string> = {
  vurus: () => L("El"),
  gures: () => L("Diz"),
  yer: () => L("Omuz"),
  kondisyon: () => L("Kaburga"),
  cene: () => L("Kafa"),
  hiz: () => L("Ayak bileği"),
  iq: () => L("Kafa"),
};

/** Ağır bir sakatlık iyileşirken kalıcı bir iz bırakabilir (en fazla 4 iz). */
export function scarOnHeal(s: GameState, inj: Injury): string | null {
  if (inj.ceza < 8 || !chance(0.2)) return null;
  const izler = s.izler ?? [];
  if (izler.length >= 4 || izler.some((x) => x.bolge === inj.stat)) return null;
  s.izler = [...izler, { bolge: inj.stat, ad: inj.ad, yas: s.fighter.yas }];
  return L("🦴 {0} iyileşti ama izi kaldı: {1} bölgesi artık hassas.", [inj.ad, BOLGE[inj.stat]()]);
}
/** Kampta sakatlık riski çarpanı: her iz %8. */
export const scarRisk = (s: GameState) => 1 + (s.izler ?? []).length * 0.08;

// ---------- Yaş evreleri ----------

export function ageStage(yas: number): { ad: string; aciklama: string; renk: string } {
  if (yas <= 24) return { ad: L("Gelişim çağı"), aciklama: L("Vücudun hızla öğreniyor: kamptan en çok gelişimi bu yaşlarda alırsın."), renk: '#3ecf7a' };
  if (yas <= 30) return { ad: L("Zirve yılları"), aciklama: L("Hız, güç ve kondisyon en iyi hâlinde. Kemer için en doğru zaman."), renk: '#f2c14e' };
  if (yas <= 33) return { ad: L("Tecrübe"), aciklama: L("Gelişim yavaşlıyor ama kafes zekân her maçla artıyor."), renk: '#3aa8ff' };
  return { ad: L("Gün batımı"), aciklama: L("Her yıl hız ve çene biraz düşer, IQ artar. Akıllı dövüşmek zorundasın."), renk: '#ff8a5c' };
}
