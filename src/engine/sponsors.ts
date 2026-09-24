// Sponsorluklar: markalar popülerliğe ve kariyer aşamasına göre teklif verir, dövüş başına ödeme yapar.
import { chance, clamp, pick, randInt, shuffle, uid } from './rng';
import type { GameState, Stage } from './types';

const $ = (n: number) => `$${Math.round(n).toLocaleString('tr-TR')}`;
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
  { id: 'kuvvet', ad: 'Kuvvet Protein', kategori: 'Beslenme', ikon: 'bottle-tonic-plus', minPop: 0, minStage: 'amator', dovusBasi: 300, galibiyet: 150, bitiris: 100, imaj: true, aciklama: 'Yerel protein tozu markası. İlk sponsorun olabilir.' },
  { id: 'yildizdoner', ad: 'Yıldız Döner', kategori: 'Yemek', ikon: 'food-drumstick', minPop: 5, minStage: 'amator', dovusBasi: 250, galibiyet: 100, bitiris: 50, imaj: false, aciklama: 'Mahallenin dönercisi. Şortunda logosu, cebinde döner.' },
  { id: 'demirspor', ad: 'Demir Spor Ekipmanları', kategori: 'Ekipman', ikon: 'dumbbell', minPop: 8, minStage: 'amator', dovusBasi: 500, galibiyet: 200, bitiris: 150, imaj: false, aciklama: 'Spor salonu ekipmanları üreticisi.' },
  { id: 'arslan', ad: 'Arslan Enerji İçeceği', kategori: 'İçecek', ikon: 'lightning-bolt', minPop: 12, minStage: 'bolgesel', dovusBasi: 1200, galibiyet: 600, bitiris: 500, imaj: true, aciklama: 'Genç kitle, agresif reklam. Nakavtları sever.' },
  { id: 'kafesgiyim', ad: 'Kafes Giyim', kategori: 'Spor giyim', ikon: 'tshirt-crew', minPop: 15, minStage: 'bolgesel', dovusBasi: 1500, galibiyet: 700, bitiris: 300, imaj: false, aciklama: 'Dövüş şortu ve walkout tişörtleri.' },
  { id: 'titaneldiven', ad: 'Titan Eldiven', kategori: 'Ekipman', ikon: 'boxing-glove', minPop: 18, minStage: 'bolgesel', dovusBasi: 1800, galibiyet: 900, bitiris: 400, imaj: false, aciklama: 'Profesyonel eldiven üreticisi.' },
  { id: 'nokta', ad: 'Nokta Bahis', kategori: 'Bahis', ikon: 'cash-multiple', minPop: 15, minStage: 'bolgesel', dovusBasi: 3500, galibiyet: 1000, bitiris: 1000, imaj: false, bahis: true, aciklama: 'Çok para verir ama taraftarların bir kısmı tepki gösterir.' },
  { id: 'hizlikargo', ad: 'Hızlı Kargo', kategori: 'Lojistik', ikon: 'truck-fast', minPop: 20, minStage: 'bolgesel', dovusBasi: 2000, galibiyet: 800, bitiris: 400, imaj: true, aciklama: '“Rakibini hızlı teslim et.”' },
  { id: 'burgerking', ad: 'Burger Kral', kategori: 'Yemek', ikon: 'hamburger', minPop: 25, minStage: 'bolgesel', dovusBasi: 2800, galibiyet: 1000, bitiris: 800, imaj: false, aciklama: 'Fast food zinciri. Kilo verirken zor bir sponsor.' },
  { id: 'aura', ad: 'Aura Parfüm', kategori: 'Kozmetik', ikon: 'spray', minPop: 30, minStage: 'bolgesel', dovusBasi: 3500, galibiyet: 1200, bitiris: 600, imaj: true, aciklama: 'Kafesten sonra da güzel kok.' },
  { id: 'monster', ad: 'Canavar Enerji', kategori: 'İçecek', ikon: 'lightning-bolt-circle', minPop: 32, minStage: 'buyuk', dovusBasi: 9000, galibiyet: 4000, bitiris: 5000, imaj: true, aciklama: 'Dünyanın en büyük dövüş sponsorlarından.' },
  { id: 'venusx', ad: 'VNX Fightwear', kategori: 'Spor giyim', ikon: 'hanger', minPop: 35, minStage: 'buyuk', dovusBasi: 11000, galibiyet: 5000, bitiris: 2500, imaj: false, aciklama: 'Organizasyonların resmi kıyafet tedarikçisi.' },
  { id: 'telkom', ad: 'TelKom Mobil', kategori: 'Telekom', ikon: 'cellphone', minPop: 40, minStage: 'buyuk', dovusBasi: 14000, galibiyet: 5000, bitiris: 3000, imaj: true, aciklama: 'Televizyon reklamı ve reklam panoları.' },
  { id: 'kriptox', ad: 'KriptoX Borsası', kategori: 'Kripto', ikon: 'bitcoin', minPop: 38, minStage: 'buyuk', dovusBasi: 18000, galibiyet: 6000, bitiris: 6000, imaj: false, bahis: true, aciklama: 'Kripto borsası. Cömert ama itibarı tartışmalı.' },
  { id: 'gamerpro', ad: 'GamerPro Donanım', kategori: 'Oyun', ikon: 'controller-classic', minPop: 42, minStage: 'buyuk', dovusBasi: 12000, galibiyet: 4000, bitiris: 4000, imaj: false, aciklama: 'Oyuncu kitlesine ulaş, yayın yap.' },
  { id: 'anatolia', ad: 'Anatolia Bank', kategori: 'Banka', ikon: 'bank', minPop: 50, minStage: 'buyuk', dovusBasi: 25000, galibiyet: 8000, bitiris: 5000, imaj: true, aciklama: 'Aile imajı ister. Skandala tahammülü yok.' },
  { id: 'rolex', ad: 'Helvetia Saat', kategori: 'Lüks', ikon: 'watch', minPop: 60, minStage: 'buyuk', dovusBasi: 35000, galibiyet: 10000, bitiris: 5000, imaj: true, aciklama: 'İsviçre lüks saat markası. Sadece şampiyon adayları.' },
  { id: 'crypto2', ad: 'Moonbase Crypto', kategori: 'Kripto', ikon: 'rocket-launch', minPop: 55, minStage: 'ufc', dovusBasi: 60000, galibiyet: 20000, bitiris: 25000, imaj: false, bahis: true, aciklama: 'UFC’nin yeni kripto ortağı. Dev rakamlar.' },
  { id: 'reebot', ad: 'Rebound Sportswear', kategori: 'Spor giyim', ikon: 'shoe-sneaker', minPop: 45, minStage: 'ufc', dovusBasi: 40000, galibiyet: 15000, bitiris: 10000, imaj: false, aciklama: 'Global spor giyim devi.' },
  { id: 'bmw', ad: 'Bavaria Motors', kategori: 'Otomotiv', ikon: 'car-sports', minPop: 60, minStage: 'ufc', dovusBasi: 70000, galibiyet: 20000, bitiris: 10000, imaj: true, aciklama: 'Lüks otomobil. Yılda bir yeni araba hediye.' },
  { id: 'cola', ad: 'Kola Cola', kategori: 'İçecek', ikon: 'bottle-soda', minPop: 70, minStage: 'ufc', dovusBasi: 95000, galibiyet: 25000, bitiris: 15000, imaj: true, aciklama: 'Dünya markası. Reklam filmine çıkacaksın.' },
  { id: 'streamx', ad: 'StreamX', kategori: 'Yayın', ikon: 'television-play', minPop: 65, minStage: 'ufc', dovusBasi: 80000, galibiyet: 20000, bitiris: 20000, imaj: false, aciklama: 'Belgesel dizisi ve özel içerik anlaşması.' },
  { id: 'airtr', ad: 'Hilal Havayolları', kategori: 'Havayolu', ikon: 'airplane', minPop: 75, minStage: 'ufc', dovusBasi: 120000, galibiyet: 30000, bitiris: 15000, imaj: true, aciklama: 'Ulusal havayolu. Ülkenin yüzü olursun.' },
  { id: 'luxmoda', ad: 'Maison Lumière', kategori: 'Moda', ikon: 'diamond-stone', minPop: 85, minStage: 'ufc', dovusBasi: 180000, galibiyet: 40000, bitiris: 20000, imaj: true, aciklama: 'Paris moda evi. Sadece süperstarlar.' },
  { id: 'gym24', ad: 'Gym24 Zinciri', kategori: 'Fitness', ikon: 'weight-lifter', minPop: 28, minStage: 'bolgesel', dovusBasi: 2500, galibiyet: 1000, bitiris: 500, imaj: false, aciklama: 'Spor salonu zinciri. Kampanya yüzü ol.' },
  { id: 'energo', ad: 'Energo Elektrik', kategori: 'Enerji', ikon: 'flash', minPop: 45, minStage: 'buyuk', dovusBasi: 16000, galibiyet: 6000, bitiris: 3000, imaj: true, aciklama: 'Enerji şirketi. Kurumsal ve cömert.' },
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
  return `💼 Yeni sponsorluk teklifi: ${b.ad} (${b.kategori})`;
}

export function acceptSponsor(s: GameState, id: string): string {
  const d = (s.sponsorTeklif ?? []).find((x) => x.id === id);
  const b = d && brandById(d.marka);
  if (!d || !b) return 'Teklif bulunamadı.';
  if ((s.sponsorlar ?? []).length >= sponsorSlots(s)) return 'Sponsor slotların dolu. Önce bir anlaşmayı bitir ya da daha iyi bir menajer bul.';
  if ((s.sponsorlar ?? []).some((x) => brandById(x.marka)?.kategori === b.kategori)) return `${b.kategori} kategorisinde zaten bir sponsorun var (münhasırlık).`;
  s.sponsorTeklif = s.sponsorTeklif!.filter((x) => x.id !== id);
  s.sponsorlar = [...(s.sponsorlar ?? []), d];
  let extra = '';
  if (b.bahis) {
    s.populerlik = clamp(s.populerlik - 3, 0, 100);
    extra = ' Bazı taraftarlar bahis/kripto anlaşmasına tepkili (popülerlik -3).';
  }
  s.haberler.unshift(`💼 ${s.fighter.soyad}, ${b.ad} ile ${d.dovus} dövüşlük sponsorluk anlaşması imzaladı.`);
  return `${b.ad} ile anlaştın! Dövüş başı ${$(d.dovusBasi)}.${extra}`;
}

export function rejectSponsor(s: GameState, id: string) {
  s.sponsorTeklif = (s.sponsorTeklif ?? []).filter((x) => x.id !== id);
}

export function negotiateSponsor(s: GameState, id: string): string {
  const d = (s.sponsorTeklif ?? []).find((x) => x.id === id);
  const b = d && brandById(d.marka);
  if (!d || !b || d.pazarlik) return 'Bu teklifte pazarlık yapıldı.';
  d.pazarlik = true;
  if (chance(0.3 + s.takim.menajerKalite * 0.05 + s.populerlik / 300)) {
    const k = 1.2 + Math.random() * 0.2;
    d.dovusBasi = Math.round((d.dovusBasi * k) / 50) * 50;
    d.galibiyet = Math.round((d.galibiyet * k) / 50) * 50;
    return `✅ ${b.ad} geri adım attı: dövüş başı ${$(d.dovusBasi)}.`;
  }
  if (chance(0.3)) {
    rejectSponsor(s, id);
    return `❌ ${b.ad} teklifi geri çekti.`;
  }
  return `🤝 ${b.ad}: “Son teklifimiz bu.”`;
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
    if (d.dovus <= 0) s.haberler.unshift(`💼 ${b.ad} sponsorluğu sona erdi.`);
  });
  s.sponsorlar = (s.sponsorlar ?? []).filter((d) => d.dovus > 0);
  return { toplam, satirlar };
}

/** Skandal (doping vb.): imaj maddeli sponsorlar anlaşmayı iptal eder. */
export function scandal(s: GameState): string[] {
  const iptal = (s.sponsorlar ?? []).filter((d) => brandById(d.marka)?.imaj);
  s.sponsorlar = (s.sponsorlar ?? []).filter((d) => !brandById(d.marka)?.imaj);
  return iptal.map((d) => `💼 ${brandById(d.marka)!.ad} imaj maddesi gereği anlaşmayı iptal etti.`);
}
