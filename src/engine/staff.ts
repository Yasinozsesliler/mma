// Kadro: fizyoterapist, masör, kondisyoner… Haftalık maaşla çalışırlar, etkileri seviyeye göre artar.
// Bilinçli olarak saf modül: yalnızca rng ve tiplere bağlı (ekonomi haftalık tikinden çağrılır).
import { L, LOC } from '../i18n';
import { pick } from './rng';
import type { GameState, StatKey } from './types';

export type StaffRole = 'fizyo' | 'masor' | 'kondisyoner' | 'diyetisyen' | 'psikolog' | 'cutman' | 'sparring' | 'pr';

export interface StaffDef {
  ad: string;
  ikon: string;
  aciklama: string;
  etki: (lvl: number) => string;
  maas: [number, number, number]; // haftalık maaş: çaylak, deneyimli, elit
}

export const TIER_NAMES = [L("Çaylak"), L("Deneyimli"), L("Elit")];

export const STAFF: Record<StaffRole, StaffDef> = {
  fizyo: { ad: L("Fizyoterapist"), ikon: 'medical-bag', aciklama: L("Sakatlıkları önler, iyileşmeyi hızlandırır."), etki: (l) => L("+%{0} iyileşme · -%{1} sakatlık riski", [l * 15, l * 10]), maas: [150, 450, 1400] },
  masor: { ad: L("Masör"), ikon: 'hand-heart', aciklama: L("Kaslarını gevşetir, kamp sonrası toparlanmanı hızlandırır."), etki: (l) => L("+%{0} iyileşme · kamp sonu +{1} sağlık", [l * 8, l * 3]), maas: [80, 250, 700] },
  kondisyoner: { ad: L("Kondisyoner"), ikon: 'weight-lifter', aciklama: L("Güç ve kondisyon planı. Kamplardan daha verimli çıkarsın."), etki: (l) => L("+%{0} kamp gelişimi · kondisyon odağında +%{1}", [l * 4, l * 10]), maas: [120, 380, 1100] },
  diyetisyen: { ad: L("Diyetisyen"), ikon: 'food-apple', aciklama: L("Kilo verme artık kumar değil."), etki: (l) => L("+%{0} güvenli kilo{1}", [l * 3, l >= 2 ? L(" · kademeli kilo bedava") : '']), maas: [90, 280, 800] },
  psikolog: { ad: L("Spor Psikoloğu"), ikon: 'brain', aciklama: L("Zihnin kampta ve kafeste net olur."), etki: (l) => L("+{0} kamp motivasyonu", [l >= 3 ? 2 : l >= 1 ? 1 : 0]), maas: [100, 320, 950] },
  cutman: { ad: L("Cutman"), ikon: 'bandage', aciklama: L("Kesikleri kapatır, doktorun maçı durdurmasını engeller."), etki: (l) => L("-%{0} doktor durdurması · -%{1} kesik", [l * 30, l * 20]), maas: [60, 180, 500] },
  sparring: { ad: L("Sparring Partneri"), ikon: 'boxing-glove', aciklama: L("Kaliteli sparring, kaliteli gelişim."), etki: (l) => L("+%{0} kamp gelişimi{1}", [l * 5, l >= 2 ? L(" · +1 kamp puanı") : '']), maas: [100, 300, 900] },
  pr: { ad: L("Basın Sorumlusu"), ikon: 'microphone-variant', aciklama: L("İmajını yönetir. Skandallarda seni korur."), etki: (l) => L("+%{0} popülerlik kazancı · -%{1} skandal kaybı", [l * 10, l * 15]), maas: [110, 350, 1000] },
};

const FIRST = [L("Deniz"), L("Selin"), L("Murat"), L("Elif"), L("Kerem"), L("Ayşe"), L("Barış"), L("Zeynep"), L("Hakan"), L("Ece"), L("Carlos"), L("Anna"), L("Mike"), L("Yuki"), L("Lena"), L("Igor")];
const LAST = [L("Aydın"), L("Kaya"), L("Şahin"), L("Demir"), L("Çelik"), L("Yılmaz"), L("Silva"), L("Novak"), L("Brooks"), L("Tanaka"), L("Petrov"), L("Keller")];

export const staffLevel = (s: GameState, r: StaffRole) => (s.kadro ?? []).find((x) => x.rol === r)?.seviye ?? 0;
export const staffMember = (s: GameState, r: StaffRole) => (s.kadro ?? []).find((x) => x.rol === r);
export const signingFee = (r: StaffRole, lvl: number) => STAFF[r].maas[lvl - 1] * 4;

export function weeklyStaffCost(s: GameState) {
  return (s.kadro ?? []).reduce((a, x) => a + STAFF[x.rol as StaffRole].maas[x.seviye - 1], 0);
}

export function hireStaff(s: GameState, r: StaffRole, lvl: number): string {
  const fee = signingFee(r, lvl);
  if (s.para < fee) return L("İmza ücreti ${0}. Paran yetmiyor.", [fee.toLocaleString(LOC)]);
  s.para -= fee;
  const ad = `${pick(FIRST)} ${pick(LAST)}`;
  s.kadro = [...(s.kadro ?? []).filter((x) => x.rol !== r), { rol: r, seviye: lvl, ad }];
  s.haberler.unshift(L("🧑‍⚕️ Kadro: {0} ({1} {2}) takıma katıldı.", [ad, TIER_NAMES[lvl - 1], STAFF[r].ad]));
  return L("{0} artık {1}n. Haftalık maaş ${2}.", [ad, STAFF[r].ad.toLocaleLowerCase(LOC), STAFF[r].maas[lvl - 1].toLocaleString(LOC)]);
}

export function fireStaff(s: GameState, r: StaffRole): string {
  const m = staffMember(s, r);
  if (!m) return L("Bu rolde kimse yok.");
  s.kadro = (s.kadro ?? []).filter((x) => x.rol !== r);
  return L("{0} ile yollarını ayırdın.", [m.ad]);
}

// ---------- Etkiler (diğer modüller buradan okur) ----------

export const staffRest = (s: GameState) => staffLevel(s, 'fizyo') * 0.15 + staffLevel(s, 'masor') * 0.08;
export const staffInjury = (s: GameState) => 1 - staffLevel(s, 'fizyo') * 0.1;
export const staffCut = (s: GameState) => staffLevel(s, 'diyetisyen') * 0.03;
export const staffFreeCut = (s: GameState) => staffLevel(s, 'diyetisyen') >= 2;
export const staffMotivation = (s: GameState) => (staffLevel(s, 'psikolog') >= 3 ? 2 : staffLevel(s, 'psikolog') >= 1 ? 1 : 0);
export const staffCampHealth = (s: GameState) => staffLevel(s, 'masor') * 3;
export const staffCampPoints = (s: GameState) => (staffLevel(s, 'sparring') >= 2 ? 1 : 0);
export const staffCutman = (s: GameState) => staffLevel(s, 'cutman');

export function staffGrowth(s: GameState, focus?: StatKey) {
  const k = staffLevel(s, 'kondisyoner');
  return 1 + k * 0.04 + (focus === 'kondisyon' ? k * 0.1 : 0) + staffLevel(s, 'sparring') * 0.05;
}

/** Basın sorumlusu: iyi haberleri büyütür, kötü haberleri küçültür. */
export function prAdjust(s: GameState, pop: number) {
  const l = staffLevel(s, 'pr');
  return Math.round(pop > 0 ? pop * (1 + l * 0.1) : pop * (1 - l * 0.15));
}
