// Ekonomi: yükseltilebilir işletmeler (haftalık gelir) ve dalgalanan yatırımlar.
// Bilinçli olarak character.ts'i içe aktarmaz; advanceWeeks buradan beslenir.
import { clamp, noise } from './rng';
import { nightTick } from './nightlifeCore';
import { petTick, weeklyPetCost } from './pets';
import { weeklyStaffCost } from './staff';
import type { GameState } from './types';

const $ = (n: number) => `$${Math.round(n).toLocaleString('tr-TR')}`;

export interface BusinessDef {
  id: string;
  ad: string;
  aciklama: string;
  ikon: string;
  fiyat: number;
  haftalik: number; // 1. seviyede haftalık net gelir
  populerlikEtkisi: boolean; // true: gelir popülerlikle artar
  seviyeAdlari: string[];
}

export const BUSINESSES: BusinessDef[] = [
  { id: 'doner', ad: 'Döner Dükkânı', aciklama: 'Memleketinde küçük bir dükkân. Adın tabelada.', ikon: 'food-drumstick', fiyat: 8000, haftalik: 180, populerlikEtkisi: false, seviyeAdlari: ['Tezgâh', 'Dükkân', 'Salonlu dükkân', 'Şube', 'Zincir'] },
  { id: 'kafe', ad: 'Dövüşçü Kafesi', aciklama: 'Duvarlarda eldivenlerin, ekranda maçlar.', ikon: 'coffee', fiyat: 35000, haftalik: 650, populerlikEtkisi: true, seviyeAdlari: ['Köşe kafe', 'Kafe', 'Kafe & bar', 'Konsept mekân', 'Franchise'] },
  { id: 'supplement', ad: 'Supplement Markası', aciklama: 'Protein tozu ve enerji içeceği. Yüzün kutularda.', ikon: 'bottle-tonic-plus', fiyat: 90000, haftalik: 1500, populerlikEtkisi: true, seviyeAdlari: ['Online satış', 'Market rafları', 'Ulusal dağıtım', 'İhracat', 'Global marka'] },
  { id: 'akademi', ad: 'Dövüş Akademisi', aciklama: 'Senin adını taşıyan salon. Öğrenciler ve prestij.', ikon: 'domain', fiyat: 150000, haftalik: 2200, populerlikEtkisi: true, seviyeAdlari: ['Tek salon', 'İki şube', 'Şehir zinciri', 'Ulusal ağ', 'Dünya akademisi'] },
  { id: 'giyim', ad: 'Giyim Markası', aciklama: 'Tişört, şort, eşofman. Taraftarlar senin logonu giyer.', ikon: 'tshirt-crew', fiyat: 60000, haftalik: 900, populerlikEtkisi: true, seviyeAdlari: ['Online mağaza', 'Butik', 'AVM mağazası', 'Ülke çapı', 'Uluslararası'] },
  { id: 'galeri', ad: 'Oto Galeri', aciklama: 'Lüks ikinci el araçlar. Ünlüler senden alır.', ikon: 'car-estate', fiyat: 250000, haftalik: 3000, populerlikEtkisi: false, seviyeAdlari: ['Küçük galeri', 'Galeri', 'Plaza', 'Bayilik', 'Otomotiv grubu'] },
  { id: 'restoran', ad: 'Steakhouse Restoran', aciklama: 'Dövüş gecelerinde dolup taşan bir et restoranı.', ikon: 'silverware-fork-knife', fiyat: 400000, haftalik: 4800, populerlikEtkisi: true, seviyeAdlari: ['Tek restoran', 'İkinci şube', 'Şehir zinciri', 'Ülke zinciri', 'Uluslararası zincir'] },
  { id: 'otel', ad: 'Butik Otel', aciklama: 'Sahilde bir otel. Yaz sezonunda para basar.', ikon: 'bed-king', fiyat: 1500000, haftalik: 16000, populerlikEtkisi: false, seviyeAdlari: ['Butik otel', 'Resort', 'Otel zinciri', 'Tatil köyü', 'Otel imparatorluğu'] },
];

export const MAX_LEVEL = 5;
const LEVEL_MULT = [1, 1.9, 2.9, 4.1, 5.5];

export const businessDef = (id: string) => BUSINESSES.find((b) => b.id === id);
export const upgradeCost = (b: BusinessDef, seviye: number) => Math.round((b.fiyat * (0.7 + seviye * 0.45)) / 100) * 100;

export function businessIncome(s: GameState, b: BusinessDef, seviye: number) {
  const popBoost = b.populerlikEtkisi ? 0.6 + s.populerlik / 60 : 1;
  return Math.round(b.haftalik * LEVEL_MULT[seviye - 1] * popBoost);
}

export function weeklyBusinessIncome(s: GameState) {
  return (s.isletmeler ?? []).reduce((a, x) => {
    const b = businessDef(x.id);
    return b ? a + businessIncome(s, b, x.seviye) : a;
  }, 0);
}

export function buyBusiness(s: GameState, id: string): string {
  const b = businessDef(id);
  if (!b) return 'İşletme bulunamadı.';
  if ((s.isletmeler ?? []).some((x) => x.id === id)) return 'Bu işletmeye zaten sahipsin.';
  if (s.para < b.fiyat) return 'Paran yetmiyor.';
  s.para -= b.fiyat;
  s.isletmeler = [...(s.isletmeler ?? []), { id, seviye: 1 }];
  s.haberler.unshift(`🛍️ Yatırım: ${s.fighter.soyad}, ${b.ad} açtı.`);
  return `${b.ad} artık senin! Haftalık yaklaşık ${$(businessIncome(s, b, 1))} gelir.`;
}

export function upgradeBusiness(s: GameState, id: string): string {
  const b = businessDef(id);
  const own = (s.isletmeler ?? []).find((x) => x.id === id);
  if (!b || !own) return 'Önce işletmeyi satın almalısın.';
  if (own.seviye >= MAX_LEVEL) return 'Zaten en üst seviyede.';
  const cost = upgradeCost(b, own.seviye);
  if (s.para < cost) return `Yükseltme ${$(cost)}. Paran yetmiyor.`;
  s.para -= cost;
  own.seviye++;
  s.haberler.unshift(`🛍️ ${b.ad} büyüdü: ${b.seviyeAdlari[own.seviye - 1]}.`);
  return `${b.ad} → ${b.seviyeAdlari[own.seviye - 1]}! Haftalık gelir ${$(businessIncome(s, b, own.seviye))}.`;
}

// ---------- Yatırımlar ----------

export interface InvestDef {
  id: string;
  ad: string;
  aciklama: string;
  ikon: string;
  ortalama: number; // haftalık ortalama getiri
  oynaklik: number; // haftalık standart sapma
  risk: 'Düşük' | 'Orta' | 'Yüksek' | 'Çok yüksek';
}

export const INVESTMENTS: InvestDef[] = [
  { id: 'tahvil', ad: 'Devlet Tahvili', aciklama: 'Sıkıcı ama güvenli. Kaybetmezsin, çok da kazanmazsın.', ikon: 'bank', ortalama: 0.0012, oynaklik: 0, risk: 'Düşük' },
  { id: 'gayrimenkul', ad: 'Gayrimenkul Fonu', aciklama: 'Kira gelirleri ve yavaş değer artışı.', ikon: 'home-city', ortalama: 0.0022, oynaklik: 0.006, risk: 'Düşük' },
  { id: 'borsa', ad: 'Borsa Endeksi', aciklama: 'Uzun vadede büyür, kısa vadede sallanır.', ikon: 'chart-line', ortalama: 0.0028, oynaklik: 0.025, risk: 'Orta' },
  { id: 'teknoloji', ad: 'Teknoloji Hisseleri', aciklama: 'Büyük kazanç potansiyeli, sert düşüşler.', ikon: 'chip', ortalama: 0.004, oynaklik: 0.05, risk: 'Yüksek' },
  { id: 'kripto', ad: 'Kripto Para', aciklama: 'Bir gecede ikiye katlanır… ya da yarıya iner.', ikon: 'bitcoin', ortalama: 0.004, oynaklik: 0.12, risk: 'Çok yüksek' },
];

export const investDef = (id: string) => INVESTMENTS.find((i) => i.id === id);
export const investValue = (s: GameState, id: string) => (s.yatirimlar ?? []).find((x) => x.id === id)?.deger ?? 0;
export const portfolioValue = (s: GameState) => (s.yatirimlar ?? []).reduce((a, x) => a + x.deger, 0);

export function invest(s: GameState, id: string, tutar: number): string {
  const d = investDef(id);
  if (!d) return 'Yatırım bulunamadı.';
  if (tutar <= 0 || s.para < tutar) return 'Bakiye yetersiz.';
  s.para -= tutar;
  s.yatirimlar = s.yatirimlar ?? [];
  const cur = s.yatirimlar.find((x) => x.id === id);
  if (cur) {
    cur.deger += tutar;
    cur.anapara += tutar;
  } else s.yatirimlar.push({ id, deger: tutar, anapara: tutar });
  return `${d.ad} için ${$(tutar)} yatırdın.`;
}

export function withdraw(s: GameState, id: string): string {
  const cur = (s.yatirimlar ?? []).find((x) => x.id === id);
  if (!cur) return 'Bu yatırımda paran yok.';
  const kar = cur.deger - cur.anapara;
  s.para += Math.round(cur.deger);
  s.yatirimlar = s.yatirimlar!.filter((x) => x.id !== id);
  return `${$(cur.deger)} çektin. ${kar >= 0 ? `Kâr: +${$(kar)}` : `Zarar: -${$(-kar)}`}.`;
}

/** Haftalar geçerken işletme geliri toplanır, yatırımlar dalgalanır. */
export function economyTick(s: GameState, weeks: number): string[] {
  const notes: string[] = [];
  const gelir = weeklyBusinessIncome(s) * weeks;
  if (gelir > 0) {
    s.para += gelir;
    notes.push(`🏪 İşletme gelirleri: +${$(gelir)}`);
  }
  const kadro = weeklyStaffCost(s) * weeks;
  if (kadro > 0) {
    s.para -= kadro;
    notes.push(`🧑‍⚕️ Kadro maaşları: -${$(kadro)}`);
  }
  const bakim = weeklyPetCost(s) * weeks;
  if (bakim > 0) {
    s.para -= bakim;
    notes.push(`🐾 Hayvan bakımı: -${$(bakim)}`);
  }
  notes.push(...petTick(s, weeks, s.para < 0), ...nightTick(s, weeks));
  (s.yatirimlar ?? []).forEach((y) => {
    const d = investDef(y.id);
    if (!d) return;
    for (let w = 0; w < weeks; w++) y.deger = Math.max(0, y.deger * (1 + d.ortalama + noise(d.oynaklik)));
    y.deger = Math.round(y.deger);
  });
  if (weeks >= 4 && (s.yatirimlar ?? []).length) {
    const t = portfolioValue(s);
    const a = (s.yatirimlar ?? []).reduce((x, y) => x + y.anapara, 0);
    notes.push(`📈 Portföy: ${$(t)} (${t >= a ? '+' : ''}${(((t - a) / Math.max(1, a)) * 100).toFixed(1)}%)`);
  }
  return notes;
}

export const pctChange = (deger: number, anapara: number) => clamp(((deger - anapara) / Math.max(1, anapara)) * 100, -100, 10000);
