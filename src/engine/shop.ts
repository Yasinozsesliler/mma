// Mağaza: ekipman (dövüş bonusu) ve yaşam (popülerlik, motivasyon, dinlenme) eşyaları.
import { diffOf } from './challenges';
import { perkCut, perkInjury, perkRest } from './perks';
import { L, LOC } from '../i18n';
import { clamp } from './rng';
import { addStat, advanceWeeks } from './character';
import { VACATIONS } from './gyms';
import { vacationMemento } from './memories';
import { bump } from './istat';
import { lifestylePost, socialTick } from './social';
import { staffCut, staffInjury, staffMotivation, staffRest } from './staff';
import { petMotivation } from './pets';
import { partnerMotivation } from './nightlifeCore';
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
  /** Görsel: araba modeli ya da ev tipi */
  art?: { kind: 'car' | 'house' | 'obj' | 'watch'; model: string; color?: string };
  /** Yaşam alt kategorisi */
  alt?: 'ev' | 'araba' | 'saat' | 'teknoloji' | 'moda' | 'tasit' | 'diger';
}

export const SHOP: ShopItem[] = [
  // ---- Ekipman ----
  { id: 'eldiven1', ad: L("Antrenman Eldiveni"), kategori: 'ekipman', grup: 'eldiven', seviye: 1, fiyat: 900, ikon: 'boxing-glove', aciklama: L("Salonun yırtık eldivenlerinden kurtul."), dovus: { vurus: 1 } , art: { kind: 'obj', model: 'eldiven', color: '#8a8f99' } },
  { id: 'eldiven2', ad: L("Pro Sparring Eldiveni"), kategori: 'ekipman', grup: 'eldiven', seviye: 2, fiyat: 7500, ikon: 'boxing-glove', aciklama: L("Deri, el yapımı dolgu. Yumruklarını sakınmadan çalışırsın."), dovus: { vurus: 1, hiz: 1 } , art: { kind: 'obj', model: 'eldiven', color: '#e63946' } },
  { id: 'eldiven3', ad: L("Elit Japon Eldiveni"), kategori: 'ekipman', grup: 'eldiven', seviye: 3, fiyat: 48000, ikon: 'boxing-glove', aciklama: L("Şampiyonların tercihi. Kusursuz bilek desteği."), dovus: { vurus: 2, hiz: 1 } , art: { kind: 'obj', model: 'eldiven', color: '#1b1e24' } },
  { id: 'eldiven4', ad: L("Altın Kaplama İmza Eldiveni"), kategori: 'ekipman', grup: 'eldiven', seviye: 4, fiyat: 280000, ikon: 'boxing-glove', aciklama: L("Senin adına özel üretim. Hem güç hem gösteriş."), dovus: { vurus: 3, hiz: 1 }, populerlik: 3 , art: { kind: 'obj', model: 'eldiven', color: '#f2c14e' } },
  { id: 'dislik', ad: L("Özel Kalıp Dişlik"), kategori: 'ekipman', fiyat: 1800, ikon: 'shield-check', aciklama: L("Diş hekimi yapımı. Darbeyi daha iyi emer."), dovus: { cene: 1 } , art: { kind: 'obj', model: 'dislik', color: '#3a86ff' } },
  { id: 'ayakkabi', ad: L("Güreş Ayakkabısı"), kategori: 'ekipman', fiyat: 4200, ikon: 'shoe-sneaker', aciklama: L("Minderde kaymayan taban, daha iyi dalış."), dovus: { gures: 1 } , art: { kind: 'obj', model: 'ayakkabi', color: '#e63946' } },
  { id: 'kimono', ad: L("Premium BJJ Kimonosu"), kategori: 'ekipman', fiyat: 5500, ikon: 'karate', aciklama: L("Gi’de daha çok saat = daha iyi yer oyunu."), dovus: { yer: 1 } , art: { kind: 'obj', model: 'kimono', color: '#f4f1ea' } },
  { id: 'maske', ad: L("İrtifa Antrenman Maskesi"), kategori: 'ekipman', fiyat: 11000, ikon: 'gas-cylinder', aciklama: L("Nefesini zorlar, ciğerlerini genişletir."), dovus: { kondisyon: 2 } , art: { kind: 'obj', model: 'maske', color: '#e63946' } },
  { id: 'kask', ad: L("Sparring Kaskı ve Koruyucular"), kategori: 'ekipman', fiyat: 3000, ikon: 'hard-hat', aciklama: L("Kampta sakatlanma riski %30 azalır."), sakatlikRiski: 0.7 , art: { kind: 'obj', model: 'kask', color: '#e63946' } },
  { id: 'analiz', ad: L("Video Analiz Yazılımı"), kategori: 'ekipman', fiyat: 38000, ikon: 'monitor-eye', aciklama: L("Rakiplerini kare kare incele."), dovus: { iq: 2 } , art: { kind: 'obj', model: 'analiz', color: '#3ecf7a' } },
  { id: 'kriyo', ad: L("Kriyoterapi Kabini"), kategori: 'ekipman', fiyat: 220000, ikon: 'snowflake', aciklama: L("Elit toparlanma. Kondisyon ve iyileşme artar."), dovus: { kondisyon: 1 }, dinlenme: 0.25 , art: { kind: 'obj', model: 'kriyo', color: '#9be3f5' } },

  // ---- Yaşam ----
  { id: 'konsol', ad: L("Oyun Konsolu"), kategori: 'yasam', fiyat: 600, ikon: 'controller-classic', aciklama: L("Kamp arası kafa dağıtmak için. Dinlenme biraz daha verimli."), dinlenme: 0.08 , art: { kind: 'obj', model: 'konsol', color: '#3a86ff' }, alt: 'teknoloji' },
  { id: 'pc', ad: L("Oyun Bilgisayarı ve Yayın Seti"), kategori: 'yasam', fiyat: 3500, ikon: 'desktop-tower-monitor', aciklama: L("Twitch’te yayın aç, taraftarlarla oyna."), populerlik: 3, dinlenme: 0.05 , art: { kind: 'obj', model: 'pc', color: '#b57bff' }, alt: 'teknoloji' },
  { id: 'zincir', ad: L("Altın Zincir"), kategori: 'yasam', fiyat: 8000, ikon: 'necklace', aciklama: L("Basın toplantılarında parlamak için."), populerlik: 3 , art: { kind: 'obj', model: 'zincir', color: '#f2c14e' }, alt: 'saat' },
  { id: 'saat', ad: L("İsviçre Lüks Saat"), kategori: 'yasam', fiyat: 28000, ikon: 'watch', aciklama: L("Zaman senin tarafında."), populerlik: 4 , art: { kind: 'watch', model: 'altin', color: '#f2c14e' }, alt: 'saat' },
  { id: 'merch', ad: L("Kendi Merch Serin"), kategori: 'yasam', fiyat: 5000, ikon: 'tshirt-crew', aciklama: L("Tişört, şapka, sticker. Her dövüşte popülerliğine göre gelir getirir."), merch: 40 , art: { kind: 'obj', model: 'tisort', color: '#e63946' }, alt: 'moda' },
  { id: 'motor', ad: L("Naked Motosiklet"), kategori: 'yasam', fiyat: 22000, ikon: 'motorbike', aciklama: L("Hafta sonu sahil yolu keyfi."), populerlik: 2, motivasyon: 1 , art: { kind: 'obj', model: 'moto', color: '#e63946' }, alt: 'tasit' },
  { id: 'giyim', ad: L("Tasarım Takım Elbise Koleksiyonu"), kategori: 'yasam', fiyat: 15000, ikon: 'hanger', aciklama: L("Tartıya ve basın toplantılarına şık gir."), populerlik: 2 , art: { kind: 'obj', model: 'takim', color: '#9aa1ad' }, alt: 'moda' },
  { id: 'fotograf', ad: L("Profesyonel Fotoğraf Çekimi"), kategori: 'yasam', fiyat: 4000, ikon: 'camera', aciklama: L("Sosyal medyan dergi kapağı gibi olur."), populerlik: 2 , art: { kind: 'obj', model: 'fotograf', color: '#b57bff' }, alt: 'diger' },
  { id: 'sanat', ad: L("Ünlü Ressamdan Portre"), kategori: 'yasam', fiyat: 65000, ikon: 'palette', aciklama: L("Salonunun duvarında kemerli portren."), populerlik: 2, motivasyon: 1 , art: { kind: 'obj', model: 'sanat', color: '#f2c14e' }, alt: 'diger' },
  { id: 'vakif', ad: L("Hayır Vakfı"), kategori: 'yasam', fiyat: 120000, ikon: 'hand-heart', aciklama: L("Yoksul çocuklara spor bursu. Taraftar sevgisi çok artar."), populerlik: 8, motivasyon: 1 , art: { kind: 'obj', model: 'vakif', color: '#e63946' }, alt: 'diger' },
  { id: 'yat', ad: L("Lüks Yat"), kategori: 'yasam', fiyat: 2400000, ikon: 'ferry', aciklama: L("Kamp arası denizde sessizlik. Paparazziler de peşinde."), populerlik: 10, dinlenme: 0.2 , art: { kind: 'obj', model: 'yat', color: '#3a86ff' }, alt: 'tasit' },
  { id: 'jet', ad: L("Özel Jet"), kategori: 'yasam', fiyat: 9000000, ikon: 'airplane', aciklama: L("Dünyanın her yerine kendi uçağınla. Efsane statüsü."), populerlik: 15, dinlenme: 0.15 , art: { kind: 'obj', model: 'jet', color: '#9aa1ad' }, alt: 'tasit' },
  // ---- Garaj (koleksiyon: hepsini alabilirsin, etkiyi en iyisi verir) ----
  { id: 'araba1', ad: L("İkinci El Hatchback"), kategori: 'yasam', grup: 'araba', seviye: 1, fiyat: 6000, ikon: 'car-hatchback', aciklama: L("Salona otobüsle gitmeye son."), populerlik: 1, dinlenme: 0.03, art: { kind: 'car', model: 'hatch', color: '#8a8f99' } , alt: 'araba' },
  { id: 'araba4', ad: L("Kompakt Sedan"), kategori: 'yasam', grup: 'araba', seviye: 2, fiyat: 22000, ikon: 'car', aciklama: L("Güvenilir, ekonomik, yeni."), populerlik: 1, dinlenme: 0.04, art: { kind: 'car', model: 'sedan', color: '#3a86ff' } , alt: 'araba' },
  { id: 'araba2', ad: L("Alman Sedan"), kategori: 'yasam', grup: 'araba', seviye: 3, fiyat: 55000, ikon: 'car-side', aciklama: L("Konforlu, güvenilir, prestijli."), populerlik: 3, dinlenme: 0.05, art: { kind: 'car', model: 'sedan', color: '#1b1e24' } , alt: 'araba' },
  { id: 'araba5', ad: L("Lüks SUV"), kategori: 'yasam', grup: 'araba', seviye: 4, fiyat: 95000, ikon: 'car-estate', aciklama: L("Yüksek sürüş, geniş bagaj, tüm ekipman sığar."), populerlik: 3, dinlenme: 0.06, art: { kind: 'car', model: 'suv', color: '#2d6a4f' } , alt: 'araba' },
  { id: 'araba6', ad: L("Amerikan Muscle Car"), kategori: 'yasam', grup: 'araba', seviye: 5, fiyat: 120000, ikon: 'car-sports', aciklama: L("V8 kükremesi. Walkout müziği gibi."), populerlik: 4, art: { kind: 'car', model: 'muscle', color: '#e63946' } , alt: 'araba' },
  { id: 'araba7', ad: L("Elektrikli Spor Sedan"), kategori: 'yasam', grup: 'araba', seviye: 6, fiyat: 180000, ikon: 'car-electric', aciklama: L("Sessiz ama 0-100 üç saniye."), populerlik: 4, dinlenme: 0.06, art: { kind: 'car', model: 'electric', color: '#e9ecef' } , alt: 'araba' },
  { id: 'araba3', ad: L("İtalyan Süper Spor"), kategori: 'yasam', grup: 'araba', seviye: 7, fiyat: 340000, ikon: 'car-sports', aciklama: L("Her paylaşımın viral olur."), populerlik: 9, art: { kind: 'car', model: 'super', color: '#f2c14e' } , alt: 'araba' },
  { id: 'araba8', ad: L("Hiper Otomobil"), kategori: 'yasam', grup: 'araba', seviye: 8, fiyat: 2200000, ikon: 'car-sports', aciklama: L("Dünyada sadece 99 tane var. Biri senin."), populerlik: 14, art: { kind: 'car', model: 'hyper', color: '#0b0b0c' } , alt: 'araba' },
  // ---- Emlak ----
  { id: 'ev1', ad: L("Kiralık 1+1 Daire"), kategori: 'yasam', grup: 'ev', seviye: 1, fiyat: 2500, ikon: 'home-outline', aciklama: L("Salona yakın, sessiz bir oda."), dinlenme: 0.1, motivasyon: 1, art: { kind: 'house', model: 'flat' } , alt: 'ev' },
  { id: 'ev4', ad: L("Stüdyo Loft"), kategori: 'yasam', grup: 'ev', seviye: 2, fiyat: 25000, ikon: 'home-variant', aciklama: L("Tuğla duvarlar, büyük pencereler, köşede bir torba."), dinlenme: 0.13, motivasyon: 1, art: { kind: 'house', model: 'loft' } , alt: 'ev' },
  { id: 'ev2', ad: L("Şehir Merkezinde Daire"), kategori: 'yasam', grup: 'ev', seviye: 3, fiyat: 90000, ikon: 'home-city', aciklama: L("Kendi evin. Aileni yanına alabilirsin."), dinlenme: 0.2, motivasyon: 1, populerlik: 2, art: { kind: 'house', model: 'apartment' } , alt: 'ev' },
  { id: 'ev5', ad: L("Bahçeli Müstakil Ev"), kategori: 'yasam', grup: 'ev', seviye: 4, fiyat: 220000, ikon: 'home-group', aciklama: L("Bahçede antrenman alanı, garajda salon."), dinlenme: 0.25, motivasyon: 1, populerlik: 2, art: { kind: 'house', model: 'house' } , alt: 'ev' },
  { id: 'ev6', ad: L("Deniz Kenarı Bungalov"), kategori: 'yasam', grup: 'ev', seviye: 5, fiyat: 400000, ikon: 'beach', aciklama: L("Sabah koşuları kumda, akşamları dalga sesi."), dinlenme: 0.3, motivasyon: 2, populerlik: 3, art: { kind: 'house', model: 'bungalow' } , alt: 'ev' },
  { id: 'ev3', ad: L("Deniz Manzaralı Villa"), kategori: 'yasam', grup: 'ev', seviye: 6, fiyat: 850000, ikon: 'home-heart', aciklama: L("Özel salon, havuz, sauna. Bir şampiyonun evi."), dinlenme: 0.35, motivasyon: 2, populerlik: 6, art: { kind: 'house', model: 'villa' } , alt: 'ev' },
  { id: 'ev7', ad: L("Gökdelen Penthouse"), kategori: 'yasam', grup: 'ev', seviye: 7, fiyat: 2500000, ikon: 'office-building', aciklama: L("Şehir ayaklarının altında. Terasta helikopter pisti."), dinlenme: 0.38, motivasyon: 2, populerlik: 8, art: { kind: 'house', model: 'penthouse' } , alt: 'ev' },
  { id: 'ev8', ad: 'Malikâne', kategori: 'yasam', grup: 'ev', seviye: 8, fiyat: 6000000, ikon: 'castle', aciklama: L("Kapılar, havuzlar, at ahırı. Efsanelere yakışır."), dinlenme: 0.42, motivasyon: 2, populerlik: 12, art: { kind: 'house', model: 'mansion' } , alt: 'ev' },
  // ---- Saat ve takı ----
  { id: 'saat1', ad: L("Spor Dijital Saat"), kategori: 'yasam', fiyat: 250, ikon: 'watch', aciklama: L("Antrenman süresi, nabız, alarm. Her dövüşçünün ilk saati."), populerlik: 1, art: { kind: 'watch', model: 'spor', color: '#3a86ff' }, alt: 'saat' },
  { id: 'saat2', ad: L("Akıllı Saat"), kategori: 'yasam', fiyat: 700, ikon: 'watch', aciklama: L("Uyku ve nabız takibi. Dinlenmeni optimize eder."), dinlenme: 0.03, art: { kind: 'watch', model: 'akilli', color: '#3ecf7a' }, alt: 'saat' },
  { id: 'saat3', ad: L("Çelik Kronograf"), kategori: 'yasam', fiyat: 6500, ikon: 'watch', aciklama: L("Klasik bir erkek saati. Basın toplantılarında şık."), populerlik: 2, art: { kind: 'watch', model: 'celik', color: '#c9ced6' }, alt: 'saat' },
  { id: 'saat5', ad: L("Elmaslı Altın Saat"), kategori: 'yasam', fiyat: 160000, ikon: 'watch', aciklama: L("Kadranında 16 pırlanta. Tartıda herkes bileğine bakar."), populerlik: 7, art: { kind: 'watch', model: 'elmas', color: '#f2c14e' }, alt: 'saat' },
  { id: 'kupe', ad: L("Pırlanta Küpe"), kategori: 'yasam', fiyat: 18000, ikon: 'diamond-stone', aciklama: L("Kameralar ışıkta parlamasını sever."), populerlik: 2, art: { kind: 'obj', model: 'kupe', color: '#9ad0f5' }, alt: 'saat' },
  { id: 'yuzuk', ad: L("Şampiyon Yüzüğü"), kategori: 'yasam', fiyat: 45000, ikon: 'ring', aciklama: L("Kırmızı taşlı, altın, ismin kazılı. Motivasyon her baktığında."), populerlik: 3, motivasyon: 1, art: { kind: 'obj', model: 'yuzuk', color: '#f2c14e' }, alt: 'saat' },
  // ---- Teknoloji ----
  { id: 'telefon', ad: L("Son Model Telefon"), kategori: 'yasam', fiyat: 1500, ikon: 'cellphone', aciklama: L("Sosyal medya için en iyi kamera."), populerlik: 1, art: { kind: 'obj', model: 'telefon', color: '#e63946' }, alt: 'teknoloji' },
  { id: 'vr', ad: L("VR Seti"), kategori: 'yasam', fiyat: 900, ikon: 'virtual-reality', aciklama: L("Kamp arası sanal dünyalara kaç."), dinlenme: 0.03, art: { kind: 'obj', model: 'vr', color: '#3a86ff' }, alt: 'teknoloji' },
  { id: 'kamera', ad: L("Vlog Kamerası"), kategori: 'yasam', fiyat: 3000, ikon: 'camera', aciklama: L("Kamp günlüklerini paylaş, taraftarını büyüt."), populerlik: 2, art: { kind: 'obj', model: 'kamera', color: '#e63946' }, alt: 'teknoloji' },
  // ---- Moda ----
  { id: 'ceket', ad: L("Deri Ceket"), kategori: 'yasam', fiyat: 2500, ikon: 'hanger', aciklama: L("Walkout’a girerken havalı görün."), populerlik: 1, art: { kind: 'obj', model: 'ceket', color: '#a86b43' }, alt: 'moda' },
  { id: 'gozluk', ad: L("Tasarım Güneş Gözlüğü"), kategori: 'yasam', fiyat: 900, ikon: 'sunglasses', aciklama: L("Face-off’ta gözlerini kimse göremez."), populerlik: 1, art: { kind: 'obj', model: 'gozluk', color: '#f2c14e' }, alt: 'moda' },
  { id: 'sneaker', ad: L("Sınırlı Seri Sneaker Koleksiyonu"), kategori: 'yasam', fiyat: 12000, ikon: 'shoe-sneaker', aciklama: L("Dünyada 500 çift. Sende 5’i var."), populerlik: 3, art: { kind: 'obj', model: 'sneaker', color: '#e63946' }, alt: 'moda' },
  // ---- Taşıt ----
  { id: 'tekne', ad: L("Sürat Teknesi"), kategori: 'yasam', fiyat: 180000, ikon: 'ferry', aciklama: L("Hafta sonu Boğaz’da rüzgâr."), populerlik: 5, dinlenme: 0.08, art: { kind: 'obj', model: 'tekne', color: '#3a86ff' }, alt: 'tasit' },
  { id: 'heli', ad: L("Helikopter"), kategori: 'yasam', fiyat: 4500000, ikon: 'helicopter', aciklama: L("Trafik mi? O ne?"), populerlik: 12, dinlenme: 0.1, art: { kind: 'obj', model: 'heli', color: '#f2c14e' }, alt: 'tasit' },
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
  if (!it.grup || it.grup === 'araba' || it.grup === 'ev') return false;
  return activeItems(s).some((x) => x.grup === it.grup && (x.seviye ?? 0) >= (it.seviye ?? 0));
}

export function buy(s: GameState, id: string): string {
  const it = itemById(id);
  if (!it) return L("Ürün bulunamadı.");
  if (owns(s, id) || outclassed(s, it)) return L("Buna zaten sahipsin.");
  if (s.para < it.fiyat) return L("Paran yetmiyor.");
  s.para -= it.fiyat;
  s.envanter = [...(s.envanter ?? []), id];
  const popGain = itemPopGain(s, it);
  if (popGain) s.populerlik = clamp(s.populerlik + popGain, 0, 100);
  if (it.fiyat >= 5000) lifestylePost(s, L("yeni {0} ile", [it.ad.toLocaleLowerCase(LOC)]));
  s.haberler.unshift(L("🛍️ {0} satın aldın.{1}", [it.ad, popGain ? L(" Popülerlik +{0}.", [popGain]) : '']));
  return L("{0} artık senin!", [it.ad]);
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

export const restMultiplier = (s: GameState) => 1 + activeItems(s).reduce((a, it) => a + (it.dinlenme ?? 0), 0) + staffRest(s) + perkRest(s);
export const injuryMultiplier = (s: GameState) => activeItems(s).reduce((a, it) => a * (it.sakatlikRiski ?? 1), 1) * staffInjury(s) * perkInjury(s) * diffOf(s).sakatlik;
/** Kamp motivasyonu: eşyalar + kadro (psikolog) + evcil hayvan + sevgili. */
export const campMotivation = (s: GameState) =>
  activeItems(s).reduce((a, it) => a + (it.motivasyon ?? 0), 0) + staffMotivation(s) + petMotivation(s) + partnerMotivation(s);
export const cutBonus = (s: GameState) => activeItems(s).reduce((a, it) => a + (it.kilo ?? 0), 0) + staffCut(s) + perkCut(s);
export const merchIncome = (s: GameState) =>
  activeItems(s).reduce((a, it) => a + (it.merch ?? 0), 0) * s.populerlik + activeItems(s).reduce((a, it) => a + (it.gelir ?? 0), 0);

export function itemEffects(it: ShopItem): string[] {
  const out: string[] = [];
  const labels: Record<string, string> = { vurus: L("Vuruş"), gures: L("Güreş"), yer: L("Yer"), kondisyon: L("Kondisyon"), cene: L("Çene"), hiz: L("Hız"), iq: 'IQ' };
  Object.entries(it.dovus ?? {}).forEach(([k, v]) => out.push(L("+{0} {1} (dövüşte)", [v, labels[k]])));
  if (it.populerlik) out.push(L("+{0} popülerlik", [it.populerlik]));
  if (it.dinlenme) out.push(L("+%{0} iyileşme", [Math.round(it.dinlenme * 100)]));
  if (it.sakatlikRiski) out.push(L("-%{0} sakatlık riski", [Math.round((1 - it.sakatlikRiski) * 100)]));
  if (it.motivasyon) out.push(L("+{0} kamp motivasyonu", [it.motivasyon]));
  if (it.kilo) out.push(L("Güvenli kilo verme"));
  if (it.merch) out.push(L("Dövüş başı ek gelir"));
  if (it.gelir) out.push(L("Dövüş başı +${0}", [it.gelir.toLocaleString(LOC)]));
  return out;
}

/** Tatil: hafta geçer, sağlık ve motivasyon artar, sakatlıklar iyileşmeye devam eder. */
export function takeVacation(s: GameState, id: string): string {
  const v = VACATIONS.find((x) => x.id === id);
  if (!v) return L("Tatil bulunamadı.");
  if (s.para < v.fiyat) return L("Bu tatil için paran yetmiyor.");
  s.para -= v.fiyat;
  bump(s, 'tatil');
  const notes = advanceWeeks(s, v.hafta);
  lifestylePost(s, `${v.ad.toLocaleLowerCase(LOC)} tatilinde`);
  socialTick(s, v.hafta);
  const gain = Math.round(v.saglik * restMultiplier(s));
  s.saglik = clamp(s.saglik + gain, 0, 100);
  s.motivasyon = Math.max(-2, Math.min(2, s.motivasyon + v.motivasyon));
  const kayip: string[] = [];
  Object.entries(v.disiplin).forEach(([k, d]) => {
    const got = addStat(s.fighter.stats, k as keyof Stats, d ?? 0);
    if (got) kayip.push(`${got} ${({ kondisyon: L("Kondisyon"), hiz: L("Hız"), iq: 'IQ' } as Record<string, string>)[k] ?? k}`);
  });
  s.populerlik = clamp(s.populerlik + v.populerlik, 0, 100);
  vacationMemento(s, v.id, v.ad);
  s.haberler.unshift(L("🛍️ {0}: {1} hafta tatil. Sağlık {2}/100.{3} {4}", [v.ad, v.hafta, s.saglik, v.populerlik ? L(" Popülerlik +{0}.", [v.populerlik]) : '', notes.join(' ')]).trim());
  const mot = v.motivasyon ? L(", motivasyon {0}{1}", [v.motivasyon > 0 ? '+' : '', v.motivasyon]) : '';
  return L("{0} bitti. Sağlık +{1}{2}{3}.{4}", [v.ad, gain, mot, v.populerlik ? L(", popülerlik +{0}", [v.populerlik]) : '', kayip.length ? L("\n⚠️ Disiplin bozuldu, form kaybı: {0}.", [kayip.join(', ')]) : '']);
}
