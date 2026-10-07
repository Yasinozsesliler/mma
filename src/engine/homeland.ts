// Memleket kartı: ünlendikçe memleketin değişir. Kahvede posterin, salonuna adın, sokağına adın, stadyumda
// pankartın, meydanda heykelin. Aşamalar kendiliğinden gelir; mahalle salonunu yenilemek ve memleket ziyareti
// oyuncunun elinde. Görsel kart (HomelandScreen) aşamalara göre dolar.
import { L, LOC } from '../i18n';
import { clamp } from './rng';
import type { GameState } from './types';

export type HomeStep = 'poster' | 'salon' | 'sokak' | 'pankart' | 'heykel';
export interface Homeland {
  asamalar: HomeStep[];
  /** Mahalle salonu yenilendi mi */
  yenilendi?: boolean;
  /** Son ziyaretin dövüş sayısı */
  ziyaret?: number;
  /** Memlekette kazanılan maçlar */
  galibiyet?: number;
}

export const HOME_STEPS: { id: HomeStep; ad: () => string; kosul: (s: GameState) => boolean; ipucu: () => string; haber: (s: GameState) => string }[] = [
  { id: 'poster', ad: () => L("Kahvede posterin"), kosul: (s) => s.stage !== 'amator', ipucu: () => L("Profesyonel ol."), haber: (s) => L("🏠 Memleketin {0}: mahalle kahvesinin duvarına posterin asıldı.", [town(s)]) },
  { id: 'salon', ad: () => L("Salonuna adın"), kosul: (s) => s.populerlik >= 30 || !!homeOf(s).yenilendi, ipucu: () => L("Popülerlik 30 ya da mahalle salonunu yenile."), haber: (s) => L("🏠 Memleketin {0}: eski salonuna senin adın verildi.", [town(s)]) },
  { id: 'sokak', ad: () => L("Sokağına adın"), kosul: (s) => (s.kemerler ?? []).length > 0 || s.populerlik >= 55, ipucu: () => L("Bir kemer kazan ya da popülerlik 55."), haber: (s) => L("🏠 {0} belediyesi doğduğun sokağa adını verdi!", [town(s)]) },
  { id: 'pankart', ad: () => L("Stadyumda pankart"), kosul: (s) => (homeOf(s).galibiyet ?? 0) >= 1 || s.populerlik >= 70, ipucu: () => L("Memleketinde bir maç kazan ya da popülerlik 70."), haber: (s) => L("🏠 {0} takımının maçında dev bir pankart açıldı: senin yüzün.", [town(s)]) },
  { id: 'heykel', ad: () => L("Meydanda heykelin"), kosul: (s) => s.unvanlar.some((u) => u.startsWith('UCC')) || !!s.hof, ipucu: () => L("UCC şampiyonu ol ya da Hall of Fame'e gir."), haber: (s) => L("🏠 {0} meydanına bronz heykelin dikildi. Kemerli, kollar havada.", [town(s)]) },
];

export const town = (s: GameState) => s.fighter.memleket || L("Memleketin");
export const homeOf = (s: GameState): Homeland => s.memleketKart ?? { asamalar: [] };

/** Maç sonrası: yeni aşamalar. */
export function homelandTick(s: GameState): string[] {
  if (!s.fighter.memleket) return [];
  const h = (s.memleketKart ??= { asamalar: [] });
  const out: string[] = [];
  for (const st of HOME_STEPS) {
    if (h.asamalar.includes(st.id) || !st.kosul(s)) continue;
    h.asamalar.push(st.id);
    out.push(st.haber(s));
    s.haberler.unshift(st.haber(s));
    s.populerlik = clamp(s.populerlik + 1, 0, 100);
  }
  return out;
}

/** Memlekette kazanılan maç (hometown.ts). */
export function homelandWin(s: GameState) {
  const h = (s.memleketKart ??= { asamalar: [] });
  h.galibiyet = (h.galibiyet ?? 0) + 1;
}

export const renovateCost = (s: GameState) => ({ amator: 2_000, bolgesel: 10_000, buyuk: 40_000, ufc: 120_000 })[s.stage];

export function renovateGym(s: GameState): string {
  const h = (s.memleketKart ??= { asamalar: [] });
  if (h.yenilendi) return '';
  const c = renovateCost(s);
  if (s.para < c) return L("Bunun için paran yetmiyor.");
  s.para -= c;
  h.yenilendi = true;
  s.populerlik = clamp(s.populerlik + 3, 0, 100);
  s.motivasyon = clamp(s.motivasyon + 1, -2, 2);
  homelandTick(s);
  return L("Eski salonun yeni minderleri, yeni torbaları ve senin adını taşıyan tabelasıyla açıldı. Çocuklar sıraya girdi. Popülerlik +3, motivasyon +1 (${0}).", [c.toLocaleString(LOC)]);
}

export const canVisit = (s: GameState) => !!s.fighter.memleket && homeOf(s).ziyaret !== s.gecmis.length;

export function visitHome(s: GameState): string {
  if (!canVisit(s)) return '';
  const h = (s.memleketKart ??= { asamalar: [] });
  h.ziyaret = s.gecmis.length;
  s.motivasyon = clamp(s.motivasyon + 1, -2, 2);
  s.saglik = clamp(s.saglik + 5, 0, 100);
  const n = h.asamalar.length;
  if (n >= 3) s.populerlik = clamp(s.populerlik + 1, 0, 100);
  return n >= 4
    ? L("Meydanda yürüyemedin bile; herkes fotoğraf istedi. Annenin yemeği her şeye değdi. Motivasyon +1, sağlık +5, popülerlik +1.")
    : n >= 2
      ? L("Salonda çocuklara bir antrenman verdin, akşam ailenle sofraya oturdun. Motivasyon +1, sağlık +5.")
      : L("Eski sokaklarda dolaştın, annenin çorbası her şeyi iyileştirdi. Motivasyon +1, sağlık +5.");
}
