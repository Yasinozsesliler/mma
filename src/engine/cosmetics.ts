// Kozmetikler: yalnızca görünüm (şort, eldiven, avatar çerçevesi, kemer kaplaması, kafese giriş müziği ve efekti). Oyun gücü vermez.
// Bir kısmı oynayarak açılır, bir kısmı paketlerle satın alınır. Açılanlar tüm kariyerlerde geçerlidir.
import { L } from '../i18n';
import type { Walkout } from '../audio/types';
import type { CosmeticSku } from '../monetization/skus';
import { BUNDLE_SKU, PREMIUM_SKU } from '../monetization/skus';
import type { DailyStore } from './daily';
import { nemesisBeaten } from './nemesis';
import type { GameState } from './types';

export type CosSlot = 'sort' | 'eldiven' | 'cerceve' | 'kemer' | 'giris' | 'efekt';
export const COS_SLOTS: CosSlot[] = ['sort', 'eldiven', 'cerceve', 'kemer', 'giris', 'efekt'];

/** Nadirlik: dolapta çerçeve rengi ve sıralama */
export type Rarity = 'siradan' | 'nadir' | 'epik' | 'efsane';
export const RARITY: Record<Rarity, { ad: () => string; renk: string; sira: number }> = {
  siradan: { ad: () => L("Sıradan"), renk: '#9aa3b2', sira: 0 },
  nadir: { ad: () => L("Nadir"), renk: '#3aa8ff', sira: 1 },
  epik: { ad: () => L("Epik"), renk: '#b388ff', sira: 2 },
  efsane: { ad: () => L("Efsanevi"), renk: '#f2c14e', sira: 3 },
};
export type Pattern = 'alev' | 'simsek' | 'kaplan' | 'yildiz';
export type FxKind = 'ates' | 'duman' | 'konfeti' | 'simsek' | 'kar';

/** Açılma koşullarının okunduğu özet: bütün kariyerlerin ve günlük dövüşün en iyileri. */
export type UnlockCtx = { galibiyet: number; ko: number; sub: number; kemer: number; savunma: number; hof: boolean; nesil: number; gunlukSeri: number; intikam: boolean; ozel: string[] };

type Source = { tur: 'hazir' } | { tur: 'basari'; aciklama: string; kosul: (c: UnlockCtx) => boolean } | { tur: 'paket'; sku: CosmeticSku } | { tur: 'sampiyon' };

export type Cosmetic = {
  id: string;
  slot: CosSlot;
  ad: string;
  /** sort: [şort, şerit] · eldiven: [eldiven] · cerceve: [halka] · kemer: [metal açık, metal koyu, kayış, taş] */
  renk: string[];
  giris?: Walkout;
  /** Şort deseni ve rengi */
  desen?: Pattern;
  desenRenk?: string;
  /** Kafese giriş efekti */
  fx?: FxKind;
  /** Belirtilmezse kaynağa göre: hazır sıradan, başarı nadir, paket epik */
  nadir?: Rarity;
  kaynak: Source;
};

export const rarityOf = (x: Cosmetic): Rarity => x.nadir ?? (x.kaynak.tur === 'hazir' ? 'siradan' : x.kaynak.tur === 'basari' ? 'nadir' : 'epik');

const hazir: Source = { tur: 'hazir' };
const paket = (sku: CosmeticSku): Source => ({ tur: 'paket', sku });
const basari = (aciklama: string, kosul: (c: UnlockCtx) => boolean): Source => ({ tur: 'basari', aciklama, kosul });

export const COSMETICS: Cosmetic[] = [
  // Şort
  { id: 'sort_klasik', slot: 'sort', ad: L("Kırmızı Köşe"), renk: ['#c1121f', '#ffffff'], kaynak: hazir },
  { id: 'sort_gece', slot: 'sort', ad: L("Gece"), renk: ['#15161a', '#e63946'], kaynak: basari(L("Profesyonel kariyerde 5 galibiyet"), (c) => c.galibiyet >= 5) },
  { id: 'sort_seri', slot: 'sort', ad: L("Seri Ustası"), renk: ['#f77f00', '#15161a'], kaynak: basari(L("Günün Dövüşü'nde 7 günlük seri"), (c) => c.gunlukSeri >= 7) },
  { id: 'sort_kaplan', slot: 'sort', ad: L("Beyaz Kaplan"), renk: ['#eeeeee', '#c1121f'], desen: 'kaplan', desenRenk: '#15161a', nadir: 'efsane', kaynak: basari(L("Onur Listesi'ne (Hall of Fame) gir"), (c) => c.hof) },
  { id: 'sort_yildirim', slot: 'sort', ad: L("Yıldırım"), renk: ['#1b1e24', '#f2c14e'], desen: 'simsek', desenRenk: '#f2c14e', nadir: 'epik', kaynak: basari(L("Profesyonel kariyerde 10 nakavt"), (c) => c.ko >= 10) },
  { id: 'sort_gece2', slot: 'sort', ad: L("Gece Yarısı"), renk: ['#2a0b4a', '#39ff14'], desen: 'yildiz', desenRenk: '#e0b0ff', kaynak: paket('paket_gece') },
  { id: 'sort_ejder', slot: 'sort', ad: L("Ejderha"), renk: ['#140404', '#ff4500'], desen: 'alev', desenRenk: '#ff7b00', nadir: 'efsane', kaynak: paket('paket_ejder') },
  { id: 'sort_buz', slot: 'sort', ad: L("Buz Kralı"), renk: ['#bfe6ff', '#1d4ed8'], desen: 'simsek', desenRenk: '#1d4ed8', nadir: 'efsane', kaynak: paket('paket_buz') },
  { id: 'sort_altin', slot: 'sort', ad: L("Altın"), renk: ['#d4a017', '#15161a'], kaynak: paket('paket_altin') },
  { id: 'sort_sokak', slot: 'sort', ad: L("Kamuflaj"), renk: ['#4b5320', '#c2b280'], kaynak: paket('paket_sokak') },
  { id: 'sort_sultan', slot: 'sort', ad: L("Sultan"), renk: ['#7b1e2b', '#f2c14e'], kaynak: paket('paket_sultan') },
  { id: 'sort_parlak', slot: 'sort', ad: L("Hologram"), renk: ['#7fdbff', '#c86bff'], desen: 'yildiz', desenRenk: '#ffffff', nadir: 'efsane', kaynak: basari(L("Kart Albümü: Parlak Kartlar setini tamamla"), (c) => c.ozel.includes('sort_parlak')) },
  { id: 'sort_kar', slot: 'sort', ad: L("Kar Beyazı"), renk: ['#f4f8ff', '#c1121f'], kaynak: basari(L("Yılbaşı Kupası etkinliği (sınırlı süre)"), (c) => c.ozel.includes('sort_kar')) },
  { id: 'sort_balkabagi', slot: 'sort', ad: L("Balkabağı"), renk: ['#f77f00', '#111111'], kaynak: basari(L("Korku Gecesi etkinliği (sınırlı süre)"), (c) => c.ozel.includes('sort_balkabagi')) },
  // Eldiven
  { id: 'eld_klasik', slot: 'eldiven', ad: L("Kırmızı"), renk: ['#b8121f'], kaynak: hazir },
  { id: 'eld_siyah', slot: 'eldiven', ad: L("Siyah"), renk: ['#1b1e24'], kaynak: basari(L("İlk nakavt galibiyeti"), (c) => c.ko >= 1) },
  { id: 'eld_beyaz', slot: 'eldiven', ad: L("Beyaz"), renk: ['#e8e8e8'], kaynak: basari(L("3 submission galibiyeti"), (c) => c.sub >= 3) },
  { id: 'eld_altin', slot: 'eldiven', ad: L("Altın"), renk: ['#f2c14e'], kaynak: paket('paket_altin') },
  { id: 'eld_neon', slot: 'eldiven', ad: L("Neon"), renk: ['#39ff14'], kaynak: paket('paket_sokak') },
  { id: 'eld_sultan', slot: 'eldiven', ad: L("Bordo"), renk: ['#7b1e2b'], kaynak: paket('paket_sultan') },
  { id: 'eld_mavi', slot: 'eldiven', ad: L("Mavi"), renk: ['#1d4ed8'], kaynak: basari(L("Profesyonel kariyerde 3 galibiyet"), (c) => c.galibiyet >= 3) },
  { id: 'eld_gece', slot: 'eldiven', ad: L("Mor Neon"), renk: ['#8b5cf6'], kaynak: paket('paket_gece') },
  { id: 'eld_ejder', slot: 'eldiven', ad: L("Ateş"), renk: ['#ff4500'], nadir: 'efsane', kaynak: paket('paket_ejder') },
  { id: 'eld_buz', slot: 'eldiven', ad: L("Buz"), renk: ['#9ad9ff'], nadir: 'efsane', kaynak: paket('paket_buz') },
  { id: 'eld_avci', slot: 'eldiven', ad: L("Şampiyon Avcısı"), renk: ['#d4a017'], nadir: 'epik', kaynak: basari(L("Kart Albümü: Şampiyon Avcısı setini tamamla"), (c) => c.ozel.includes('eld_avci')) },
  { id: 'eld_kalp', slot: 'eldiven', ad: L("Kalp"), renk: ['#ff5c8a'], kaynak: basari(L("Sevgililer Günü etkinliği (sınırlı süre)"), (c) => c.ozel.includes('eld_kalp')) },
  // Avatar çerçevesi (klasik: kemer varsa altın, yoksa kırmızı)
  { id: 'cer_klasik', slot: 'cerceve', ad: L("Klasik"), renk: [], kaynak: hazir },
  { id: 'cer_gumus', slot: 'cerceve', ad: L("Gümüş"), renk: ['#c0c7d1'], kaynak: basari(L("Profesyonel kariyerde 10 galibiyet"), (c) => c.galibiyet >= 10) },
  { id: 'cer_hanedan', slot: 'cerceve', ad: L("Hanedan"), renk: ['#2ec4b6'], kaynak: basari(L("Nesil modunda ikinci nesle geç"), (c) => c.nesil >= 2) },
  { id: 'cer_intikam', slot: 'cerceve', ad: L("İntikam"), renk: ['#b388ff'], kaynak: basari(L("Ezeli rakibinle seriyi kazan"), (c) => c.intikam) },
  { id: 'cer_sampiyon', slot: 'cerceve', ad: L("Şampiyon Paketi"), renk: ['#ffd166'], kaynak: { tur: 'sampiyon' } },
  { id: 'cer_altin', slot: 'cerceve', ad: L("Altın"), renk: ['#d4a017'], kaynak: paket('paket_altin') },
  { id: 'cer_neon', slot: 'cerceve', ad: L("Neon"), renk: ['#39ff14'], kaynak: paket('paket_sokak') },
  { id: 'cer_sultan', slot: 'cerceve', ad: L("Sultan"), renk: ['#9b2335'], kaynak: paket('paket_sultan') },
  { id: 'cer_gece', slot: 'cerceve', ad: L("Gece Yarısı"), renk: ['#b388ff'], kaynak: paket('paket_gece') },
  { id: 'cer_ejder', slot: 'cerceve', ad: L("Ejderha"), renk: ['#ff3d00'], nadir: 'efsane', kaynak: paket('paket_ejder') },
  { id: 'cer_buz', slot: 'cerceve', ad: L("Buz Kralı"), renk: ['#7fdbff'], nadir: 'efsane', kaynak: paket('paket_buz') },
  { id: 'cer_koleksiyoncu', slot: 'cerceve', ad: L("Koleksiyoncu"), renk: ['#c86bff'], nadir: 'epik', kaynak: basari(L("Kart Albümü'nde 3 set tamamla"), (c) => c.ozel.includes('cer_koleksiyoncu')) },
  { id: 'cer_gunes', slot: 'cerceve', ad: L("Güneş"), renk: ['#ffb703'], kaynak: basari(L("Yaz Festivali etkinliği (sınırlı süre)"), (c) => c.ozel.includes('cer_gunes')) },
  // Kemer kaplaması (klasik: organizasyonun kendi renkleri)
  { id: 'kem_klasik', slot: 'kemer', ad: L("Organizasyon rengi"), renk: [], kaynak: hazir },
  { id: 'kem_beyaz', slot: 'kemer', ad: L("Beyaz Altın"), renk: ['#ffffff', '#9aa3ad', '#0b0b0c', '#7fdbff'], kaynak: basari(L("Bir kemeri 3 kez savun"), (c) => c.savunma >= 3) },
  { id: 'kem_altin', slot: 'kemer', ad: L("Kraliyet"), renk: ['#fff3b0', '#c9a227', '#3b0a45', '#e0b0ff'], kaynak: paket('paket_altin') },
  { id: 'kem_sokak', slot: 'kemer', ad: L("Karbon"), renk: ['#d0d4da', '#50565f', '#1a1d22', '#39ff14'], kaynak: paket('paket_sokak') },
  { id: 'kem_sultan', slot: 'kemer', ad: L("Sultan"), renk: ['#ffe39a', '#c18f2a', '#5a0f16', '#2ec4b6'], kaynak: paket('paket_sultan') },
  { id: 'kem_gece', slot: 'kemer', ad: L("Gece Yarısı"), renk: ['#e9d5ff', '#6d28d9', '#12051f', '#39ff14'], kaynak: paket('paket_gece') },
  { id: 'kem_ejder', slot: 'kemer', ad: L("Ejderha"), renk: ['#ffd166', '#b5121b', '#1a0303', '#ff7b00'], nadir: 'efsane', kaynak: paket('paket_ejder') },
  { id: 'kem_buz', slot: 'kemer', ad: L("Buz Kralı"), renk: ['#f0faff', '#7fb8d8', '#0b2540', '#bfe6ff'], nadir: 'efsane', kaynak: paket('paket_buz') },
  { id: 'kem_bayram', slot: 'kemer', ad: L("Bayram"), renk: ['#e9f5db', '#2d6a4f', '#081c15', '#f2c14e'], kaynak: basari(L("Bayram etkinliği (sınırlı süre)"), (c) => c.ozel.includes('kem_bayram')) },
  // Kafese giriş müziği
  { id: 'gir_yok', slot: 'giris', ad: L("Seyirci uğultusu"), renk: [], kaynak: hazir },
  { id: 'gir_rock', slot: 'giris', ad: L("Rock"), renk: [], giris: 'rock', kaynak: basari(L("İlk şampiyonluk kemeri"), (c) => c.kemer >= 1) },
  { id: 'gir_epik', slot: 'giris', ad: L("Epik"), renk: [], giris: 'epik', kaynak: paket('paket_altin') },
  { id: 'gir_trap', slot: 'giris', ad: L("Trap"), renk: [], giris: 'trap', kaynak: paket('paket_sokak') },
  { id: 'gir_mehter', slot: 'giris', ad: L("Mehter"), renk: [], giris: 'mehter', kaynak: paket('paket_sultan') },
  // Kafese giriş efekti
  { id: 'ef_yok', slot: 'efekt', ad: L("Efektsiz"), renk: [], kaynak: hazir },
  { id: 'ef_duman', slot: 'efekt', ad: L("Duman"), renk: [], fx: 'duman', kaynak: basari(L("Profesyonel kariyerde 3 galibiyet"), (c) => c.galibiyet >= 3) },
  { id: 'ef_konfeti', slot: 'efekt', ad: L("Konfeti"), renk: [], fx: 'konfeti', nadir: 'epik', kaynak: basari(L("Bir kemeri savun"), (c) => c.savunma >= 1) },
  { id: 'ef_simsek', slot: 'efekt', ad: L("Şimşek"), renk: [], fx: 'simsek', kaynak: paket('paket_gece') },
  { id: 'ef_ates', slot: 'efekt', ad: L("Ateş"), renk: [], fx: 'ates', nadir: 'efsane', kaynak: paket('paket_ejder') },
  { id: 'ef_kar', slot: 'efekt', ad: L("Kar Fırtınası"), renk: [], fx: 'kar', nadir: 'efsane', kaynak: paket('paket_buz') },
];

export const DEFAULT_EQUIP: Record<CosSlot, string> = { sort: 'sort_klasik', eldiven: 'eld_klasik', cerceve: 'cer_klasik', kemer: 'kem_klasik', giris: 'gir_yok', efekt: 'ef_yok' };

export const PACKS: { sku: CosmeticSku; ad: string; aciklama: string; renk: string; nadir: Rarity }[] = [
  { sku: 'paket_ejder', ad: L("Ejderha"), aciklama: L("Alev desenli şort, ateş eldiveni, Ejderha çerçevesi ve kemeri, kafese ATEŞ efektiyle giriş"), renk: '#ff4500', nadir: 'efsane' },
  { sku: 'paket_buz', ad: L("Buz Kralı"), aciklama: L("Şimşek desenli buz şortu, buz eldiveni, Buz Kralı çerçevesi ve kemeri, kafese KAR FIRTINASI ile giriş"), renk: '#7fdbff', nadir: 'efsane' },
  { sku: 'paket_gece', ad: L("Gece Yarısı"), aciklama: L("Yıldız desenli mor şort, mor neon eldiven, Gece Yarısı çerçevesi ve kemeri, ŞİMŞEK giriş efekti"), renk: '#b388ff', nadir: 'epik' },
  { sku: 'paket_altin', ad: L("Altın Seri"), aciklama: L("Altın şort ve eldiven, altın çerçeve, Kraliyet kemeri ve Epik giriş müziği"), renk: '#d4a017', nadir: 'epik' },
  { sku: 'paket_sokak', ad: L("Sokak Dövüşçüsü"), aciklama: L("Kamuflaj şort, neon eldiven ve çerçeve, Karbon kemer ve Trap giriş müziği"), renk: '#39ff14', nadir: 'epik' },
  { sku: 'paket_sultan', ad: L("Sultan"), aciklama: L("Bordo-altın şort, bordo eldiven, Sultan çerçevesi ve kemeri, Mehter giriş müziği"), renk: '#9b2335', nadir: 'epik' },
];

export const cosmeticById = (id: string) => COSMETICS.find((x) => x.id === id);

export function unlockCtx(saves: (GameState | null)[], daily: DailyStore): UnlockCtx {
  const c: UnlockCtx = { galibiyet: 0, ko: 0, sub: 0, kemer: 0, savunma: 0, hof: false, nesil: 1, gunlukSeri: daily.enIyiSeri ?? 0, intikam: false, ozel: [] };
  for (const s of saves) {
    if (!s) continue;
    const pro = s.stage !== 'amator';
    if (pro) {
      c.galibiyet = Math.max(c.galibiyet, s.rekor.g);
      c.ko = Math.max(c.ko, s.rekor.ko ?? 0);
      c.sub = Math.max(c.sub, s.rekor.sub ?? 0);
    }
    c.kemer = Math.max(c.kemer, (s.kemerler ?? []).length);
    c.savunma = Math.max(c.savunma, ...(s.kemerler ?? []).map((b) => b.savunma), 0);
    c.hof ||= !!s.hof || (s.hanedan ?? []).some((a) => a.hof);
    c.nesil = Math.max(c.nesil, s.nesil ?? 1);
    c.intikam ||= nemesisBeaten(s.ezeli);
    c.ozel = [...new Set([...c.ozel, ...(s.ozelKozmetik ?? [])])];
    for (const a of s.hanedan ?? []) {
      c.galibiyet = Math.max(c.galibiyet, a.rekor.g);
      c.kemer = Math.max(c.kemer, a.kemer);
    }
  }
  return c;
}

/** Oynayarak açılanlardan şu an koşulu sağlananlar. */
export const earnedNow = (c: UnlockCtx) => COSMETICS.filter((x) => x.kaynak.tur === 'basari' && x.kaynak.kosul(c)).map((x) => x.id);

export function isUnlocked(x: Cosmetic, earned: ReadonlySet<string>, owned: ReadonlySet<string>) {
  const k = x.kaynak;
  if (k.tur === 'hazir') return true;
  if (k.tur === 'basari') return earned.has(x.id);
  if (k.tur === 'sampiyon') return owned.has(PREMIUM_SKU);
  return packOwned(owned, k.sku);
}

/** Paket sende mi? Efsane Koleksiyonu bütün paketleri, Tam Sürüm (Şampiyon Paketi) Altın Seri'yi de açar. */
export const packOwned = (owned: ReadonlySet<string>, sku: string) =>
  owned.has(sku) || owned.has(BUNDLE_SKU) || (sku === 'paket_altin' && owned.has(PREMIUM_SKU));
