// Mağaza: ekipman (dövüş bonusu) ve yaşam (popülerlik, motivasyon, dinlenme) eşyaları.
import { clamp } from './rng';
import { addStat, advanceWeeks } from './character';
import { VACATIONS } from './gyms';
import { lifestylePost, socialTick } from './social';
import type { GameState, Stats } from './types';

export type ShopCategory = 'ekipman' | 'yasam';

export interface ShopItem {
  id: string;
  ad: string;
  kategori: ShopCategory;
  /** Aynı gruptan yalnızca en iyisinin etkisi geçerlidir (ör. eldivenler). */
  grup?: string;
  seviye?: number;
  fiyat: number;
  aciklama: string;
  ikon: string; // MaterialCommunityIcons adı
  /** Dövüşte kalıcı istatistik bonusu */
  dovus?: Partial<Stats>;
  /** Satın alınca bir kerelik popülerlik */
  populerlik?: number;
  /** Dinlenme ve kamp sonrası sağlık iyileşmesi çarpanı (+0.2 = %20 daha fazla) */
  dinlenme?: number;
  /** Kamp sakatlık riski çarpanı (0.7 = %30 daha az) */
  sakatlikRiski?: number;
  /** Her kamp başında motivasyon */
  motivasyon?: number;
  /** Kilo verme başarısına ek */
  kilo?: number;
  /** Her dövüşten popülerlik × bu kadar dolar gelir */
  merch?: number;
  /** Her dövüşten sabit pasif gelir (işletmeler) */
  gelir?: number;
}

export const SHOP: ShopItem[] = [
  // ---- Ekipman ----
  { id: 'eldiven1', ad: 'Antrenman Eldiveni', kategori: 'ekipman', grup: 'eldiven', seviye: 1, fiyat: 900, ikon: 'boxing-glove', aciklama: 'Salonun yırtık eldivenlerinden kurtul.', dovus: { vurus: 1 } },
  { id: 'eldiven2', ad: 'Pro Sparring Eldiveni', kategori: 'ekipman', grup: 'eldiven', seviye: 2, fiyat: 7500, ikon: 'boxing-glove', aciklama: 'Deri, el yapımı dolgu. Yumruklarını sakınmadan çalışırsın.', dovus: { vurus: 1, hiz: 1 } },
  { id: 'eldiven3', ad: 'Elit Japon Eldiveni', kategori: 'ekipman', grup: 'eldiven', seviye: 3, fiyat: 48000, ikon: 'boxing-glove', aciklama: 'Şampiyonların tercihi. Kusursuz bilek desteği.', dovus: { vurus: 2, hiz: 1 } },
  { id: 'eldiven4', ad: 'Altın Kaplama İmza Eldiveni', kategori: 'ekipman', grup: 'eldiven', seviye: 4, fiyat: 280000, ikon: 'boxing-glove', aciklama: 'Senin adına özel üretim. Hem güç hem gösteriş.', dovus: { vurus: 3, hiz: 1 }, populerlik: 3 },
  { id: 'dislik', ad: 'Özel Kalıp Dişlik', kategori: 'ekipman', fiyat: 1800, ikon: 'shield-check', aciklama: 'Diş hekimi yapımı. Darbeyi daha iyi emer.', dovus: { cene: 1 } },
  { id: 'ayakkabi', ad: 'Güreş Ayakkabısı', kategori: 'ekipman', fiyat: 4200, ikon: 'shoe-sneaker', aciklama: 'Minderde kaymayan taban, daha iyi dalış.', dovus: { gures: 1 } },
  { id: 'kimono', ad: 'Premium BJJ Kimonosu', kategori: 'ekipman', fiyat: 5500, ikon: 'karate', aciklama: 'Gi’de daha çok saat = daha iyi yer oyunu.', dovus: { yer: 1 } },
  { id: 'maske', ad: 'İrtifa Antrenman Maskesi', kategori: 'ekipman', fiyat: 11000, ikon: 'gas-cylinder', aciklama: 'Nefesini zorlar, ciğerlerini genişletir.', dovus: { kondisyon: 2 } },
  { id: 'kask', ad: 'Sparring Kaskı ve Koruyucular', kategori: 'ekipman', fiyat: 3000, ikon: 'hard-hat', aciklama: 'Kampta sakatlanma riski %30 azalır.', sakatlikRiski: 0.7 },
  { id: 'analiz', ad: 'Video Analiz Yazılımı', kategori: 'ekipman', fiyat: 38000, ikon: 'monitor-eye', aciklama: 'Rakiplerini kare kare incele.', dovus: { iq: 2 } },
  { id: 'diyetisyen', ad: 'Kişisel Diyetisyen (yıllık)', kategori: 'ekipman', fiyat: 45000, ikon: 'food-apple', aciklama: 'Kilo verme çok daha güvenli olur.', kilo: 0.08 },
  { id: 'fizyo', ad: 'Kişisel Fizyoterapist', kategori: 'ekipman', fiyat: 120000, ikon: 'medical-bag', aciklama: 'Dinlenme ve kamplarda %40 daha hızlı iyileşirsin. Sakatlık riski de düşer.', dinlenme: 0.4, sakatlikRiski: 0.8 },
  { id: 'kriyo', ad: 'Kriyoterapi Kabini', kategori: 'ekipman', fiyat: 220000, ikon: 'snowflake', aciklama: 'Elit toparlanma. Kondisyon ve iyileşme artar.', dovus: { kondisyon: 1 }, dinlenme: 0.25 },

  // ---- Yaşam ----
  { id: 'konsol', ad: 'Oyun Konsolu', kategori: 'yasam', fiyat: 600, ikon: 'controller-classic', aciklama: 'Kamp arası kafa dağıtmak için. Dinlenme biraz daha verimli.', dinlenme: 0.08 },
  { id: 'pc', ad: 'Oyun Bilgisayarı ve Yayın Seti', kategori: 'yasam', fiyat: 3500, ikon: 'desktop-tower-monitor', aciklama: 'Twitch’te yayın aç, taraftarlarla oyna.', populerlik: 3, dinlenme: 0.05 },
  { id: 'kopek', ad: 'Pitbull Yavrusu', kategori: 'yasam', fiyat: 1500, ikon: 'dog', aciklama: 'Sabah koşularının yeni ortağı. Her kampta motivasyon.', motivasyon: 1 },
  { id: 'zincir', ad: 'Altın Zincir', kategori: 'yasam', fiyat: 8000, ikon: 'necklace', aciklama: 'Basın toplantılarında parlamak için.', populerlik: 3 },
  { id: 'saat', ad: 'İsviçre Lüks Saat', kategori: 'yasam', fiyat: 28000, ikon: 'watch', aciklama: 'Zaman senin tarafında.', populerlik: 4 },
  { id: 'merch', ad: 'Kendi Merch Serin', kategori: 'yasam', fiyat: 5000, ikon: 'tshirt-crew', aciklama: 'Tişört, şapka, sticker. Her dövüşte popülerliğine göre gelir getirir.', merch: 40 },
  { id: 'araba1', ad: 'İkinci El Hatchback', kategori: 'yasam', grup: 'araba', seviye: 1, fiyat: 6000, ikon: 'car-hatchback', aciklama: 'Salona otobüsle gitmeye son.', populerlik: 1, dinlenme: 0.03 },
  { id: 'araba2', ad: 'Alman Sedan', kategori: 'yasam', grup: 'araba', seviye: 2, fiyat: 55000, ikon: 'car-side', aciklama: 'Konforlu, güvenilir, prestijli.', populerlik: 3, dinlenme: 0.05 },
  { id: 'araba3', ad: 'İtalyan Süper Spor', kategori: 'yasam', grup: 'araba', seviye: 3, fiyat: 340000, ikon: 'car-sports', aciklama: 'Her paylaşımın viral olur.', populerlik: 9 },
  { id: 'ev1', ad: 'Kiralık 1+1 Daire', kategori: 'yasam', grup: 'ev', seviye: 1, fiyat: 2500, ikon: 'home-outline', aciklama: 'Salona yakın, sessiz bir oda. Uyku kalitesi artar.', dinlenme: 0.1, motivasyon: 1 },
  { id: 'ev2', ad: 'Şehir Merkezinde Daire', kategori: 'yasam', grup: 'ev', seviye: 2, fiyat: 90000, ikon: 'home-city', aciklama: 'Kendi evin. Aileni yanına alabilirsin.', dinlenme: 0.2, motivasyon: 1, populerlik: 2 },
  { id: 'ev3', ad: 'Deniz Manzaralı Villa', kategori: 'yasam', grup: 'ev', seviye: 3, fiyat: 850000, ikon: 'home-heart', aciklama: 'Özel spor salonu, havuz, sauna. Bir şampiyonun evi.', dinlenme: 0.35, motivasyon: 2, populerlik: 6 },
  { id: 'motor', ad: 'Naked Motosiklet', kategori: 'yasam', fiyat: 22000, ikon: 'motorbike', aciklama: 'Hafta sonu sahil yolu keyfi.', populerlik: 2, motivasyon: 1 },
  { id: 'giyim', ad: 'Tasarım Takım Elbise Koleksiyonu', kategori: 'yasam', fiyat: 15000, ikon: 'hanger', aciklama: 'Tartıya ve basın toplantılarına şık gir.', populerlik: 2 },
  { id: 'fotograf', ad: 'Profesyonel Fotoğraf Çekimi', kategori: 'yasam', fiyat: 4000, ikon: 'camera', aciklama: 'Sosyal medyan dergi kapağı gibi olur.', populerlik: 2 },
  { id: 'sanat', ad: 'Ünlü Ressamdan Portre', kategori: 'yasam', fiyat: 65000, ikon: 'palette', aciklama: 'Salonunun duvarında kemerli portren.', populerlik: 2, motivasyon: 1 },
  { id: 'vakif', ad: 'Hayır Vakfı', kategori: 'yasam', fiyat: 120000, ikon: 'hand-heart', aciklama: 'Yoksul çocuklara spor bursu. Taraftar sevgisi çok artar.', populerlik: 8, motivasyon: 1 },
  { id: 'yat', ad: 'Lüks Yat', kategori: 'yasam', fiyat: 2400000, ikon: 'ferry', aciklama: 'Kamp arası denizde sessizlik. Paparazziler de peşinde.', populerlik: 10, dinlenme: 0.2 },
  { id: 'jet', ad: 'Özel Jet', kategori: 'yasam', fiyat: 9000000, ikon: 'airplane', aciklama: 'Dünyanın her yerine kendi uçağınla. Efsane statüsü.', populerlik: 15, dinlenme: 0.15 },
];

export const itemById = (id: string) => SHOP.find((i) => i.id === id);

/** Sahip olunan eşyalar; gruplu olanlardan yalnızca en yüksek seviyeli olanı. */
export function activeItems(s: GameState): ShopItem[] {
  const owned = (s.envanter ?? []).map(itemById).filter((x): x is ShopItem => !!x);
  const best = new Map<string, ShopItem>();
  const out: ShopItem[] = [];
  owned.forEach((it) => {
    if (!it.grup) out.push(it);
    else if (!best.has(it.grup) || (best.get(it.grup)!.seviye ?? 0) < (it.seviye ?? 0)) best.set(it.grup, it);
  });
  return [...out, ...best.values()];
}

export const owns = (s: GameState, id: string) => (s.envanter ?? []).includes(id);

/** Aynı gruptan daha iyisi zaten varsa almaya gerek yok. */
export function outclassed(s: GameState, it: ShopItem) {
  if (!it.grup) return false;
  return activeItems(s).some((x) => x.grup === it.grup && (x.seviye ?? 0) >= (it.seviye ?? 0));
}

export function buy(s: GameState, id: string): string {
  const it = itemById(id);
  if (!it) return 'Ürün bulunamadı.';
  if (owns(s, id) || outclassed(s, it)) return 'Buna zaten sahipsin.';
  if (s.para < it.fiyat) return 'Paran yetmiyor.';
  s.para -= it.fiyat;
  s.envanter = [...(s.envanter ?? []), id];
  const popGain = itemPopGain(s, it);
  if (popGain) s.populerlik = clamp(s.populerlik + popGain, 0, 100);
  if (it.fiyat >= 5000) lifestylePost(s, `yeni ${it.ad.toLocaleLowerCase('tr-TR')} ile`);
  s.haberler.unshift(`🛍️ ${it.ad} satın aldın.${popGain ? ` Popülerlik +${popGain}.` : ''}`);
  return `${it.ad} artık senin!`;
}

/** Ekipman bonus sınırları: istatistik başına en fazla +3, toplamda en fazla +8. Her şey doldurulamaz. */
export const ITEM_STAT_CAP = 3;
export const ITEM_TOTAL_CAP = 8;

export function fightItemMods(s: GameState): Partial<Stats> {
  const raw: Partial<Stats> = {};
  activeItems(s).forEach((it) =>
    Object.entries(it.dovus ?? {}).forEach(([k, v]) => {
      const key = k as keyof Stats;
      raw[key] = (raw[key] ?? 0) + (v ?? 0);
    }),
  );
  const out: Partial<Stats> = {};
  let total = 0;
  (Object.entries(raw) as [keyof Stats, number][])
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => {
      const add = Math.min(v, ITEM_STAT_CAP, ITEM_TOTAL_CAP - total);
      if (add > 0) {
        out[k] = add;
        total += add;
      }
    });
  return out;
}

export const itemBonusTotal = (s: GameState) => Object.values(fightItemMods(s)).reduce((a, v) => a + (v ?? 0), 0);

/** Popülerlik etkisi azalan verimli: zaten ünlüysen bir yat daha az ses getirir. */
export const itemPopGain = (s: GameState, it: ShopItem) => Math.max(it.populerlik ? 1 : 0, Math.round((it.populerlik ?? 0) * (1 - s.populerlik / 130)));

export const restMultiplier = (s: GameState) => 1 + activeItems(s).reduce((a, it) => a + (it.dinlenme ?? 0), 0);
export const injuryMultiplier = (s: GameState) => activeItems(s).reduce((a, it) => a * (it.sakatlikRiski ?? 1), 1);
export const campMotivation = (s: GameState) => activeItems(s).reduce((a, it) => a + (it.motivasyon ?? 0), 0);
export const cutBonus = (s: GameState) => activeItems(s).reduce((a, it) => a + (it.kilo ?? 0), 0);
export const merchIncome = (s: GameState) =>
  activeItems(s).reduce((a, it) => a + (it.merch ?? 0), 0) * s.populerlik + activeItems(s).reduce((a, it) => a + (it.gelir ?? 0), 0);

export function itemEffects(it: ShopItem): string[] {
  const out: string[] = [];
  const labels: Record<string, string> = { vurus: 'Vuruş', gures: 'Güreş', yer: 'Yer', kondisyon: 'Kondisyon', cene: 'Çene', hiz: 'Hız', iq: 'IQ' };
  Object.entries(it.dovus ?? {}).forEach(([k, v]) => out.push(`+${v} ${labels[k]} (dövüşte)`));
  if (it.populerlik) out.push(`+${it.populerlik} popülerlik`);
  if (it.dinlenme) out.push(`+%${Math.round(it.dinlenme * 100)} iyileşme`);
  if (it.sakatlikRiski) out.push(`-%${Math.round((1 - it.sakatlikRiski) * 100)} sakatlık riski`);
  if (it.motivasyon) out.push(`+${it.motivasyon} kamp motivasyonu`);
  if (it.kilo) out.push('Güvenli kilo verme');
  if (it.merch) out.push('Dövüş başı ek gelir');
  if (it.gelir) out.push(`Dövüş başı +$${it.gelir.toLocaleString('tr-TR')}`);
  return out;
}

/** Tatil: hafta geçer, sağlık ve motivasyon artar, sakatlıklar iyileşmeye devam eder. */
export function takeVacation(s: GameState, id: string): string {
  const v = VACATIONS.find((x) => x.id === id);
  if (!v) return 'Tatil bulunamadı.';
  if (s.para < v.fiyat) return 'Bu tatil için paran yetmiyor.';
  s.para -= v.fiyat;
  const notes = advanceWeeks(s, v.hafta);
  lifestylePost(s, `${v.ad.toLocaleLowerCase('tr-TR')} tatilinde`);
  socialTick(s, v.hafta);
  const gain = Math.round(v.saglik * restMultiplier(s));
  s.saglik = clamp(s.saglik + gain, 0, 100);
  s.motivasyon = Math.max(-2, Math.min(2, s.motivasyon + v.motivasyon));
  const kayip: string[] = [];
  Object.entries(v.disiplin).forEach(([k, d]) => {
    const got = addStat(s.fighter.stats, k as keyof Stats, d ?? 0);
    if (got) kayip.push(`${got} ${({ kondisyon: 'Kondisyon', hiz: 'Hız', iq: 'IQ' } as Record<string, string>)[k] ?? k}`);
  });
  s.populerlik = clamp(s.populerlik + v.populerlik, 0, 100);
  s.haberler.unshift(`🛍️ ${v.ad}: ${v.hafta} hafta tatil. Sağlık ${s.saglik}/100.${v.populerlik ? ` Popülerlik +${v.populerlik}.` : ''} ${notes.join(' ')}`.trim());
  const mot = v.motivasyon ? `, motivasyon ${v.motivasyon > 0 ? '+' : ''}${v.motivasyon}` : '';
  return `${v.ad} bitti. Sağlık +${gain}${mot}${v.populerlik ? `, popülerlik +${v.populerlik}` : ''}.${kayip.length ? `\n⚠️ Disiplin bozuldu, form kaybı: ${kayip.join(', ')}.` : ''}`;
}
