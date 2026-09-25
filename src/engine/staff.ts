// Kadro: fizyoterapist, masör, kondisyoner… Haftalık maaşla çalışırlar, etkileri seviyeye göre artar.
// Bilinçli olarak saf modül: yalnızca rng ve tiplere bağlı (ekonomi haftalık tikinden çağrılır).
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

export const TIER_NAMES = ['Çaylak', 'Deneyimli', 'Elit'];

export const STAFF: Record<StaffRole, StaffDef> = {
  fizyo: { ad: 'Fizyoterapist', ikon: 'medical-bag', aciklama: 'Sakatlıkları önler, iyileşmeyi hızlandırır.', etki: (l) => `+%${l * 15} iyileşme · -%${l * 10} sakatlık riski`, maas: [150, 450, 1400] },
  masor: { ad: 'Masör', ikon: 'hand-heart', aciklama: 'Kaslarını gevşetir, kamp sonrası toparlanmanı hızlandırır.', etki: (l) => `+%${l * 8} iyileşme · kamp sonu +${l * 3} sağlık`, maas: [80, 250, 700] },
  kondisyoner: { ad: 'Kondisyoner', ikon: 'weight-lifter', aciklama: 'Güç ve kondisyon planı. Kamplardan daha verimli çıkarsın.', etki: (l) => `+%${l * 4} kamp gelişimi · kondisyon odağında +%${l * 10}`, maas: [120, 380, 1100] },
  diyetisyen: { ad: 'Diyetisyen', ikon: 'food-apple', aciklama: 'Kilo verme artık kumar değil.', etki: (l) => `+%${l * 3} güvenli kilo${l >= 2 ? ' · kademeli kilo bedava' : ''}`, maas: [90, 280, 800] },
  psikolog: { ad: 'Spor Psikoloğu', ikon: 'brain', aciklama: 'Zihnin kampta ve kafeste net olur.', etki: (l) => `+${l >= 3 ? 2 : l >= 1 ? 1 : 0} kamp motivasyonu`, maas: [100, 320, 950] },
  cutman: { ad: 'Cutman', ikon: 'bandage', aciklama: 'Kesikleri kapatır, doktorun maçı durdurmasını engeller.', etki: (l) => `-%${l * 30} doktor durdurması · -%${l * 20} kesik`, maas: [60, 180, 500] },
  sparring: { ad: 'Sparring Partneri', ikon: 'boxing-glove', aciklama: 'Kaliteli sparring, kaliteli gelişim.', etki: (l) => `+%${l * 5} kamp gelişimi${l >= 2 ? ' · +1 kamp puanı' : ''}`, maas: [100, 300, 900] },
  pr: { ad: 'Basın Sorumlusu', ikon: 'microphone-variant', aciklama: 'İmajını yönetir. Skandallarda seni korur.', etki: (l) => `+%${l * 10} popülerlik kazancı · -%${l * 15} skandal kaybı`, maas: [110, 350, 1000] },
};

const FIRST = ['Deniz', 'Selin', 'Murat', 'Elif', 'Kerem', 'Ayşe', 'Barış', 'Zeynep', 'Hakan', 'Ece', 'Carlos', 'Anna', 'Mike', 'Yuki', 'Lena', 'Igor'];
const LAST = ['Aydın', 'Kaya', 'Şahin', 'Demir', 'Çelik', 'Yılmaz', 'Silva', 'Novak', 'Brooks', 'Tanaka', 'Petrov', 'Keller'];

export const staffLevel = (s: GameState, r: StaffRole) => (s.kadro ?? []).find((x) => x.rol === r)?.seviye ?? 0;
export const staffMember = (s: GameState, r: StaffRole) => (s.kadro ?? []).find((x) => x.rol === r);
export const signingFee = (r: StaffRole, lvl: number) => STAFF[r].maas[lvl - 1] * 4;

export function weeklyStaffCost(s: GameState) {
  return (s.kadro ?? []).reduce((a, x) => a + STAFF[x.rol as StaffRole].maas[x.seviye - 1], 0);
}

export function hireStaff(s: GameState, r: StaffRole, lvl: number): string {
  const fee = signingFee(r, lvl);
  if (s.para < fee) return `İmza ücreti $${fee.toLocaleString('tr-TR')}. Paran yetmiyor.`;
  s.para -= fee;
  const ad = `${pick(FIRST)} ${pick(LAST)}`;
  s.kadro = [...(s.kadro ?? []).filter((x) => x.rol !== r), { rol: r, seviye: lvl, ad }];
  s.haberler.unshift(`🧑‍⚕️ Kadro: ${ad} (${TIER_NAMES[lvl - 1]} ${STAFF[r].ad}) takıma katıldı.`);
  return `${ad} artık ${STAFF[r].ad.toLocaleLowerCase('tr-TR')}n. Haftalık maaş $${STAFF[r].maas[lvl - 1].toLocaleString('tr-TR')}.`;
}

export function fireStaff(s: GameState, r: StaffRole): string {
  const m = staffMember(s, r);
  if (!m) return 'Bu rolde kimse yok.';
  s.kadro = (s.kadro ?? []).filter((x) => x.rol !== r);
  return `${m.ad} ile yollarını ayırdın.`;
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
