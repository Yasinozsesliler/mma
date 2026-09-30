// Ekonomi: yükseltilebilir işletmeler (haftalık gelir) ve dalgalanan yatırımlar.
// Bilinçli olarak character.ts'i içe aktarmaz; advanceWeeks buradan beslenir.
import { L, LOC } from '../i18n';
import { gymTick } from './academy';
import { clamp, noise } from './rng';
import { nightTick } from './nightlifeCore';
import { petTick, weeklyPetCost } from './pets';
import { weeklyStaffCost } from './staff';
import type { GameState } from './types';

const $ = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;

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
  { id: 'doner', ad: L("Döner Dükkânı"), aciklama: L("Memleketinde küçük bir dükkân. Adın tabelada."), ikon: 'food-drumstick', fiyat: 8000, haftalik: 180, populerlikEtkisi: false, seviyeAdlari: ['Tezgâh', L("Dükkân"), L("Salonlu dükkân"), L("Şube"), L("Zincir")] },
  { id: 'kafe', ad: L("Dövüşçü Kafesi"), aciklama: L("Duvarlarda eldivenlerin, ekranda maçlar."), ikon: 'coffee', fiyat: 35000, haftalik: 650, populerlikEtkisi: true, seviyeAdlari: [L("Köşe kafe"), L("Kafe"), L("Kafe & bar"), L("Konsept mekân"), L("Franchise")] },
  { id: 'supplement', ad: L("Supplement Markası"), aciklama: L("Protein tozu ve enerji içeceği. Yüzün kutularda."), ikon: 'bottle-tonic-plus', fiyat: 90000, haftalik: 1500, populerlikEtkisi: true, seviyeAdlari: [L("Online satış"), L("Market rafları"), L("Ulusal dağıtım"), L("İhracat"), L("Global marka")] },
  { id: 'akademi', ad: L("Dövüş Akademisi"), aciklama: L("Senin adını taşıyan salon. Öğrenciler ve prestij."), ikon: 'domain', fiyat: 150000, haftalik: 2200, populerlikEtkisi: true, seviyeAdlari: [L("Tek salon"), L("İki şube"), L("Şehir zinciri"), L("Ulusal ağ"), L("Dünya akademisi")] },
  { id: 'giyim', ad: L("Giyim Markası"), aciklama: L("Tişört, şort, eşofman. Taraftarlar senin logonu giyer."), ikon: 'tshirt-crew', fiyat: 60000, haftalik: 900, populerlikEtkisi: true, seviyeAdlari: [L("Online mağaza"), L("Butik"), L("AVM mağazası"), L("Ülke çapı"), L("Uluslararası")] },
  { id: 'galeri', ad: L("Oto Galeri"), aciklama: L("Lüks ikinci el araçlar. Ünlüler senden alır."), ikon: 'car-estate', fiyat: 250000, haftalik: 3000, populerlikEtkisi: false, seviyeAdlari: [L("Küçük galeri"), L("Galeri"), L("Plaza"), L("Bayilik"), L("Otomotiv grubu")] },
  { id: 'restoran', ad: L("Steakhouse Restoran"), aciklama: L("Dövüş gecelerinde dolup taşan bir et restoranı."), ikon: 'silverware-fork-knife', fiyat: 400000, haftalik: 4800, populerlikEtkisi: true, seviyeAdlari: [L("Tek restoran"), L("İkinci şube"), L("Şehir zinciri"), L("Ülke zinciri"), L("Uluslararası zincir")] },
  { id: 'otel', ad: L("Butik Otel"), aciklama: L("Sahilde bir otel. Yaz sezonunda para basar."), ikon: 'bed-king', fiyat: 1500000, haftalik: 16000, populerlikEtkisi: false, seviyeAdlari: [L("Butik otel"), L("Resort"), L("Otel zinciri"), L("Tatil köyü"), L("Otel imparatorluğu")] },
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
  if (!b) return L("İşletme bulunamadı.");
  if ((s.isletmeler ?? []).some((x) => x.id === id)) return L("Bu işletmeye zaten sahipsin.");
  if (s.para < b.fiyat) return L("Paran yetmiyor.");
  s.para -= b.fiyat;
  s.isletmeler = [...(s.isletmeler ?? []), { id, seviye: 1 }];
  s.haberler.unshift(L("🛍️ Yatırım: {0}, {1} açtı.", [s.fighter.soyad, b.ad]));
  return L("{0} artık senin! Haftalık yaklaşık {1} gelir.", [b.ad, $(businessIncome(s, b, 1))]);
}

export function upgradeBusiness(s: GameState, id: string): string {
  const b = businessDef(id);
  const own = (s.isletmeler ?? []).find((x) => x.id === id);
  if (!b || !own) return L("Önce işletmeyi satın almalısın.");
  if (own.seviye >= MAX_LEVEL) return L("Zaten en üst seviyede.");
  const cost = upgradeCost(b, own.seviye);
  if (s.para < cost) return L("Yükseltme {0}. Paran yetmiyor.", [$(cost)]);
  s.para -= cost;
  own.seviye++;
  s.haberler.unshift(L("🛍️ {0} büyüdü: {1}.", [b.ad, b.seviyeAdlari[own.seviye - 1]]));
  return L("{0} → {1}! Haftalık gelir {2}.", [b.ad, b.seviyeAdlari[own.seviye - 1], $(businessIncome(s, b, own.seviye))]);
}

// ---------- Yatırımlar ----------

export interface InvestDef {
  id: string;
  ad: string;
  aciklama: string;
  ikon: string;
  ortalama: number; // haftalık ortalama getiri
  oynaklik: number; // haftalık standart sapma
  risk: string;
}

export const INVESTMENTS: InvestDef[] = [
  { id: 'tahvil', ad: L("Devlet Tahvili"), aciklama: L("Sıkıcı ama güvenli. Kaybetmezsin, çok da kazanmazsın."), ikon: 'bank', ortalama: 0.0012, oynaklik: 0, risk: L("Düşük") },
  { id: 'gayrimenkul', ad: L("Gayrimenkul Fonu"), aciklama: L("Kira gelirleri ve yavaş değer artışı."), ikon: 'home-city', ortalama: 0.0022, oynaklik: 0.006, risk: L("Düşük") },
  { id: 'borsa', ad: L("Borsa Endeksi"), aciklama: L("Uzun vadede büyür, kısa vadede sallanır."), ikon: 'chart-line', ortalama: 0.0028, oynaklik: 0.025, risk: L("Orta") },
  { id: 'teknoloji', ad: L("Teknoloji Hisseleri"), aciklama: L("Büyük kazanç potansiyeli, sert düşüşler."), ikon: 'chip', ortalama: 0.004, oynaklik: 0.05, risk: L("Yüksek") },
  { id: 'kripto', ad: L("Kripto Para"), aciklama: L("Bir gecede ikiye katlanır… ya da yarıya iner."), ikon: 'bitcoin', ortalama: 0.004, oynaklik: 0.12, risk: L("Çok yüksek") },
];

export const investDef = (id: string) => INVESTMENTS.find((i) => i.id === id);
export const investValue = (s: GameState, id: string) => (s.yatirimlar ?? []).find((x) => x.id === id)?.deger ?? 0;
export const portfolioValue = (s: GameState) => (s.yatirimlar ?? []).reduce((a, x) => a + x.deger, 0);

export function invest(s: GameState, id: string, tutar: number): string {
  const d = investDef(id);
  if (!d) return L("Yatırım bulunamadı.");
  if (tutar <= 0 || s.para < tutar) return L("Bakiye yetersiz.");
  s.para -= tutar;
  s.yatirimlar = s.yatirimlar ?? [];
  const cur = s.yatirimlar.find((x) => x.id === id);
  if (cur) {
    cur.deger += tutar;
    cur.anapara += tutar;
  } else s.yatirimlar.push({ id, deger: tutar, anapara: tutar });
  return L("{0} için {1} yatırdın.", [d.ad, $(tutar)]);
}

export function withdraw(s: GameState, id: string): string {
  const cur = (s.yatirimlar ?? []).find((x) => x.id === id);
  if (!cur) return L("Bu yatırımda paran yok.");
  const kar = cur.deger - cur.anapara;
  s.para += Math.round(cur.deger);
  s.yatirimlar = s.yatirimlar!.filter((x) => x.id !== id);
  return L("{0} çektin. {1}.", [$(cur.deger), kar >= 0 ? L("Kâr: +{0}", [$(kar)]) : L("Zarar: -{0}", [$(-kar)])]);
}

/** Haftalar geçerken işletme geliri toplanır, yatırımlar dalgalanır. */
export function economyTick(s: GameState, weeks: number): string[] {
  const notes: string[] = [];
  const gelir = weeklyBusinessIncome(s) * weeks;
  if (gelir > 0) {
    s.para += gelir;
    notes.push(L("🏪 İşletme gelirleri: +{0}", [$(gelir)]));
  }
  const kadro = weeklyStaffCost(s) * weeks;
  if (kadro > 0) {
    s.para -= kadro;
    notes.push(L("🧑‍⚕️ Kadro maaşları: -{0}", [$(kadro)]));
  }
  const bakim = weeklyPetCost(s) * weeks;
  if (bakim > 0) {
    s.para -= bakim;
    notes.push(L("🐾 Hayvan bakımı: -{0}", [$(bakim)]));
  }
  notes.push(...petTick(s, weeks, s.para < 0), ...nightTick(s, weeks));
  notes.push(...gymTick(s, weeks));
  (s.yatirimlar ?? []).forEach((y) => {
    const d = investDef(y.id);
    if (!d) return;
    for (let w = 0; w < weeks; w++) y.deger = Math.max(0, y.deger * (1 + d.ortalama + noise(d.oynaklik)));
    y.deger = Math.round(y.deger);
  });
  if (weeks >= 4 && (s.yatirimlar ?? []).length) {
    const t = portfolioValue(s);
    const a = (s.yatirimlar ?? []).reduce((x, y) => x + y.anapara, 0);
    notes.push(L("📈 Portföy: {0} ({1}{2}%)", [$(t), t >= a ? '+' : '', (((t - a) / Math.max(1, a)) * 100).toFixed(1)]));
  }
  return notes;
}

export const pctChange = (deger: number, anapara: number) => clamp(((deger - anapara) / Math.max(1, anapara)) * 100, -100, 10000);
