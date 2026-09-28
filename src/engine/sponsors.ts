// Sponsorluklar: markalar popülerliğe ve kariyer aşamasına göre teklif verir, dövüş başına ödeme yapar.
import { L, LOC } from '../i18n';
import { chance, clamp, pick, randInt, shuffle, uid } from './rng';
import type { GameState, Stage } from './types';

const $ = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;
const STAGE_ORDER: Stage[] = ['amator', 'bolgesel', 'buyuk', 'ufc'];

export interface Brand {
  id: string;
  ad: string;
  kategori: string;
  ikon: string;
  minPop: number;
  minStage: Stage;
  dovusBasi: number; // taban dövüş başı ödeme
  galibiyet: number; // galibiyet primi
  bitiris: number; // KO/SUB primi
  imaj: boolean; // skandal/doping olursa iptal
  bahis?: boolean; // imzalayınca popülerlik bedeli
  aciklama: string;
}

export const BRANDS: Brand[] = [
  { id: 'kuvvet', ad: L("Kuvvet Protein"), kategori: L("Beslenme"), ikon: 'bottle-tonic-plus', minPop: 0, minStage: 'amator', dovusBasi: 300, galibiyet: 150, bitiris: 100, imaj: true, aciklama: L("Yerel protein tozu markası. İlk sponsorun olabilir.") },
  { id: 'yildizdoner', ad: L("Yıldız Döner"), kategori: L("Yemek"), ikon: 'food-drumstick', minPop: 5, minStage: 'amator', dovusBasi: 250, galibiyet: 100, bitiris: 50, imaj: false, aciklama: L("Mahallenin dönercisi. Şortunda logosu, cebinde döner.") },
  { id: 'demirspor', ad: L("Demir Spor Ekipmanları"), kategori: L("Ekipman"), ikon: 'dumbbell', minPop: 8, minStage: 'amator', dovusBasi: 500, galibiyet: 200, bitiris: 150, imaj: false, aciklama: L("Spor salonu ekipmanları üreticisi.") },
  { id: 'arslan', ad: L("Arslan Enerji İçeceği"), kategori: L("İçecek"), ikon: 'lightning-bolt', minPop: 12, minStage: 'bolgesel', dovusBasi: 1200, galibiyet: 600, bitiris: 500, imaj: true, aciklama: L("Genç kitle, agresif reklam. Nakavtları sever.") },
  { id: 'kafesgiyim', ad: L("Kafes Giyim"), kategori: L("Spor giyim"), ikon: 'tshirt-crew', minPop: 15, minStage: 'bolgesel', dovusBasi: 1500, galibiyet: 700, bitiris: 300, imaj: false, aciklama: L("Dövüş şortu ve walkout tişörtleri.") },
  { id: 'titaneldiven', ad: L("Titan Eldiven"), kategori: L("Ekipman"), ikon: 'boxing-glove', minPop: 18, minStage: 'bolgesel', dovusBasi: 1800, galibiyet: 900, bitiris: 400, imaj: false, aciklama: L("Profesyonel eldiven üreticisi.") },
  { id: 'nokta', ad: L("Nokta Bahis"), kategori: L("Bahis"), ikon: 'cash-multiple', minPop: 15, minStage: 'bolgesel', dovusBasi: 3500, galibiyet: 1000, bitiris: 1000, imaj: false, bahis: true, aciklama: L("Çok para verir ama taraftarların bir kısmı tepki gösterir.") },
  { id: 'hizlikargo', ad: L("Hızlı Kargo"), kategori: L("Lojistik"), ikon: 'truck-fast', minPop: 20, minStage: 'bolgesel', dovusBasi: 2000, galibiyet: 800, bitiris: 400, imaj: true, aciklama: L("“Rakibini hızlı teslim et.”") },
  { id: 'burgerking', ad: L("Burger Kral"), kategori: L("Yemek"), ikon: 'hamburger', minPop: 25, minStage: 'bolgesel', dovusBasi: 2800, galibiyet: 1000, bitiris: 800, imaj: false, aciklama: L("Fast food zinciri. Kilo verirken zor bir sponsor.") },
  { id: 'aura', ad: L("Aura Parfüm"), kategori: L("Kozmetik"), ikon: 'spray', minPop: 30, minStage: 'bolgesel', dovusBasi: 3500, galibiyet: 1200, bitiris: 600, imaj: true, aciklama: L("Kafesten sonra da güzel kok.") },
  { id: 'monster', ad: L("Canavar Enerji"), kategori: L("İçecek"), ikon: 'lightning-bolt-circle', minPop: 32, minStage: 'buyuk', dovusBasi: 9000, galibiyet: 4000, bitiris: 5000, imaj: true, aciklama: L("Dünyanın en büyük dövüş sponsorlarından.") },
  { id: 'venusx', ad: L("VNX Fightwear"), kategori: L("Spor giyim"), ikon: 'hanger', minPop: 35, minStage: 'buyuk', dovusBasi: 11000, galibiyet: 5000, bitiris: 2500, imaj: false, aciklama: L("Organizasyonların resmi kıyafet tedarikçisi.") },
  { id: 'telkom', ad: L("TelKom Mobil"), kategori: L("Telekom"), ikon: 'cellphone', minPop: 40, minStage: 'buyuk', dovusBasi: 14000, galibiyet: 5000, bitiris: 3000, imaj: true, aciklama: L("Televizyon reklamı ve reklam panoları.") },
  { id: 'kriptox', ad: L("KriptoX Borsası"), kategori: L("Kripto"), ikon: 'bitcoin', minPop: 38, minStage: 'buyuk', dovusBasi: 18000, galibiyet: 6000, bitiris: 6000, imaj: false, bahis: true, aciklama: L("Kripto borsası. Cömert ama itibarı tartışmalı.") },
  { id: 'gamerpro', ad: L("GamerPro Donanım"), kategori: L("Oyun"), ikon: 'controller-classic', minPop: 42, minStage: 'buyuk', dovusBasi: 12000, galibiyet: 4000, bitiris: 4000, imaj: false, aciklama: L("Oyuncu kitlesine ulaş, yayın yap.") },
  { id: 'anatolia', ad: L("Anatolia Bank"), kategori: L("Banka"), ikon: 'bank', minPop: 50, minStage: 'buyuk', dovusBasi: 25000, galibiyet: 8000, bitiris: 5000, imaj: true, aciklama: L("Aile imajı ister. Skandala tahammülü yok.") },
  { id: 'rolex', ad: L("Helvetia Saat"), kategori: L("Lüks"), ikon: 'watch', minPop: 60, minStage: 'buyuk', dovusBasi: 35000, galibiyet: 10000, bitiris: 5000, imaj: true, aciklama: L("İsviçre lüks saat markası. Sadece şampiyon adayları.") },
  { id: 'crypto2', ad: L("Moonbase Crypto"), kategori: L("Kripto"), ikon: 'rocket-launch', minPop: 55, minStage: 'ufc', dovusBasi: 60000, galibiyet: 20000, bitiris: 25000, imaj: false, bahis: true, aciklama: L("UCC’nin yeni kripto ortağı. Dev rakamlar.") },
  { id: 'reebot', ad: L("Rebound Sportswear"), kategori: L("Spor giyim"), ikon: 'shoe-sneaker', minPop: 45, minStage: 'ufc', dovusBasi: 40000, galibiyet: 15000, bitiris: 10000, imaj: false, aciklama: L("Global spor giyim devi.") },
  { id: 'bmw', ad: L("Bavaria Motors"), kategori: L("Otomotiv"), ikon: 'car-sports', minPop: 60, minStage: 'ufc', dovusBasi: 70000, galibiyet: 20000, bitiris: 10000, imaj: true, aciklama: L("Lüks otomobil. Yılda bir yeni araba hediye.") },
  { id: 'cola', ad: L("Kola Cola"), kategori: L("İçecek"), ikon: 'bottle-soda', minPop: 70, minStage: 'ufc', dovusBasi: 95000, galibiyet: 25000, bitiris: 15000, imaj: true, aciklama: L("Dünya markası. Reklam filmine çıkacaksın.") },
  { id: 'streamx', ad: 'StreamX', kategori: L("Yayın"), ikon: 'television-play', minPop: 65, minStage: 'ufc', dovusBasi: 80000, galibiyet: 20000, bitiris: 20000, imaj: false, aciklama: L("Belgesel dizisi ve özel içerik anlaşması.") },
  { id: 'airtr', ad: L("Hilal Havayolları"), kategori: L("Havayolu"), ikon: 'airplane', minPop: 75, minStage: 'ufc', dovusBasi: 120000, galibiyet: 30000, bitiris: 15000, imaj: true, aciklama: L("Ulusal havayolu. Ülkenin yüzü olursun.") },
  { id: 'luxmoda', ad: L("Maison Lumière"), kategori: L("Moda"), ikon: 'diamond-stone', minPop: 85, minStage: 'ufc', dovusBasi: 180000, galibiyet: 40000, bitiris: 20000, imaj: true, aciklama: L("Paris moda evi. Sadece süperstarlar.") },
  { id: 'gym24', ad: L("Gym24 Zinciri"), kategori: L("Fitness"), ikon: 'weight-lifter', minPop: 28, minStage: 'bolgesel', dovusBasi: 2500, galibiyet: 1000, bitiris: 500, imaj: false, aciklama: L("Spor salonu zinciri. Kampanya yüzü ol.") },
  { id: 'energo', ad: L("Energo Elektrik"), kategori: L("Enerji"), ikon: 'flash', minPop: 45, minStage: 'buyuk', dovusBasi: 16000, galibiyet: 6000, bitiris: 3000, imaj: true, aciklama: L("Enerji şirketi. Kurumsal ve cömert.") },
];

export const brandById = (id: string) => BRANDS.find((b) => b.id === id);

export interface SponsorDeal {
  id: string;
  marka: string; // brand id
  dovus: number; // kalan dövüş
  dovusBasi: number;
  galibiyet: number;
  bitiris: number;
  pazarlik?: boolean;
}

export function sponsorSlots(s: GameState) {
  return 3 + (s.takim.menajerKalite >= 6 ? 1 : 0) + (s.populerlik >= 70 ? 1 : 0);
}

function scale(s: GameState) {
  return 0.8 + s.populerlik / 100 + (s.sampiyon ? 0.4 : 0);
}

function makeDeal(s: GameState, b: Brand): SponsorDeal {
  const k = scale(s) * (0.85 + Math.random() * 0.3);
  const r = (n: number) => Math.round((n * k) / 50) * 50;
  return { id: uid(), marka: b.id, dovus: randInt(2, 5), dovusBasi: r(b.dovusBasi), galibiyet: r(b.galibiyet), bitiris: r(b.bitiris) };
}

/** Uygun markalar: popülerlik ve aşama yeterli, aynı kategoride aktif anlaşma yok. */
export function eligibleBrands(s: GameState) {
  const active = new Set((s.sponsorlar ?? []).map((d) => brandById(d.marka)?.kategori));
  const offered = new Set((s.sponsorTeklif ?? []).map((d) => d.marka));
  return BRANDS.filter(
    (b) => s.populerlik >= b.minPop && STAGE_ORDER.indexOf(s.stage) >= STAGE_ORDER.indexOf(b.minStage) && !active.has(b.kategori) && !offered.has(b.id),
  );
}

/** Dövüşten sonra yeni teklifler gelir (popülerlik yükseldikçe daha sık ve daha büyük). */
export function refreshSponsorOffers(s: GameState, won: boolean): string | null {
  s.sponsorTeklif = (s.sponsorTeklif ?? []).slice(0, 4);
  if (!chance(0.3 + s.populerlik / 200 + (won ? 0.15 : 0))) return null;
  const pool = shuffle(eligibleBrands(s)).sort((a, b) => b.minPop - a.minPop);
  const pickB = pool.slice(0, Math.max(1, Math.ceil(pool.length / 2)));
  if (!pickB.length) return null;
  const b = pick(pickB);
  s.sponsorTeklif.unshift(makeDeal(s, b));
  s.sponsorTeklif = s.sponsorTeklif.slice(0, 4);
  return L("💼 Yeni sponsorluk teklifi: {0} ({1})", [b.ad, b.kategori]);
}

export function acceptSponsor(s: GameState, id: string): string {
  const d = (s.sponsorTeklif ?? []).find((x) => x.id === id);
  const b = d && brandById(d.marka);
  if (!d || !b) return L("Teklif bulunamadı.");
  if ((s.sponsorlar ?? []).length >= sponsorSlots(s)) return L("Sponsor slotların dolu. Önce bir anlaşmayı bitir ya da daha iyi bir menajer bul.");
  if ((s.sponsorlar ?? []).some((x) => brandById(x.marka)?.kategori === b.kategori)) return L("{0} kategorisinde zaten bir sponsorun var (münhasırlık).", [b.kategori]);
  s.sponsorTeklif = s.sponsorTeklif!.filter((x) => x.id !== id);
  s.sponsorlar = [...(s.sponsorlar ?? []), d];
  let extra = '';
  if (b.bahis) {
    s.populerlik = clamp(s.populerlik - 3, 0, 100);
    extra = L(" Bazı taraftarlar bahis/kripto anlaşmasına tepkili (popülerlik -3).");
  }
  s.haberler.unshift(L("💼 {0}, {1} ile {2} dövüşlük sponsorluk anlaşması imzaladı.", [s.fighter.soyad, b.ad, d.dovus]));
  return L("{0} ile anlaştın! Dövüş başı {1}.{2}", [b.ad, $(d.dovusBasi), extra]);
}

export function rejectSponsor(s: GameState, id: string) {
  s.sponsorTeklif = (s.sponsorTeklif ?? []).filter((x) => x.id !== id);
}

export function negotiateSponsor(s: GameState, id: string): string {
  const d = (s.sponsorTeklif ?? []).find((x) => x.id === id);
  const b = d && brandById(d.marka);
  if (!d || !b || d.pazarlik) return L("Bu teklifte pazarlık yapıldı.");
  d.pazarlik = true;
  if (chance(0.3 + s.takim.menajerKalite * 0.05 + s.populerlik / 300)) {
    const k = 1.2 + Math.random() * 0.2;
    d.dovusBasi = Math.round((d.dovusBasi * k) / 50) * 50;
    d.galibiyet = Math.round((d.galibiyet * k) / 50) * 50;
    return L("✅ {0} geri adım attı: dövüş başı {1}.", [b.ad, $(d.dovusBasi)]);
  }
  if (chance(0.3)) {
    rejectSponsor(s, id);
    return L("❌ {0} teklifi geri çekti.", [b.ad]);
  }
  return L("🤝 {0}: “Son teklifimiz bu.”", [b.ad]);
}

/** Dövüş sonrası sponsor ödemeleri. */
export function paySponsors(s: GameState, won: boolean, finish: boolean): { toplam: number; satirlar: string[] } {
  const satirlar: string[] = [];
  let toplam = 0;
  (s.sponsorlar ?? []).forEach((d) => {
    const b = brandById(d.marka);
    if (!b) return;
    const para = d.dovusBasi + (won ? d.galibiyet : 0) + (won && finish ? d.bitiris : 0);
    toplam += para;
    d.dovus--;
    satirlar.push(`💼 ${b.ad}: +${$(para)}`);
    if (d.dovus <= 0) s.haberler.unshift(L("💼 {0} sponsorluğu sona erdi.", [b.ad]));
  });
  s.sponsorlar = (s.sponsorlar ?? []).filter((d) => d.dovus > 0);
  return { toplam, satirlar };
}

/** Skandal (doping vb.): imaj maddeli sponsorlar anlaşmayı iptal eder. */
export function scandal(s: GameState): string[] {
  const iptal = (s.sponsorlar ?? []).filter((d) => brandById(d.marka)?.imaj);
  s.sponsorlar = (s.sponsorlar ?? []).filter((d) => !brandById(d.marka)?.imaj);
  return iptal.map((d) => L("💼 {0} imaj maddesi gereği anlaşmayı iptal etti.", [brandById(d.marka)!.ad]));
}
