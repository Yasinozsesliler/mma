// Lüks koleksiyon: nadir saatler, klasik arabalar ve sanat eserleri. Değerleri haftadan haftaya değişir
// (her eşyanın kendi dalgası var, rastgele değil; kayıt yenilemekle değişmez). Satarken %10 müzayede payı kesilir.
// Güç vermez; yalnızca servet, gösteriş ve evdeki koleksiyon.
import { L, LOC } from '../i18n';
import { clamp } from './rng';
import type { GameState } from './types';

export type LuxKat = 'saat' | 'araba' | 'sanat';

export interface LuxItem {
  id: string;
  kat: LuxKat;
  ad: () => string;
  aciklama: () => string;
  /** Taban değer ($) */
  fiyat: number;
  /** Dalgalanma genliği (0.1 = ±%10) */
  oynak: number;
  /** Yıllık eğilim (0.05 = yılda %5 değer kazanır) */
  egilim: number;
  renk: string;
}

export const LUX: LuxItem[] = [
  { id: 'l_saat_dalgic', kat: 'saat', ad: () => L("1960'lardan Dalgıç Saati"), aciklama: () => L("Bir deniz subayına aitmiş. Kadranı zamanla kahveye dönmüş."), fiyat: 18_000, oynak: 0.12, egilim: 0.06, renk: '#3a86ff' },
  { id: 'l_saat_kronograf', kat: 'saat', ad: () => L("Yarışçı Kronografı"), aciklama: () => L("Efsane bir pilotun bileğindeymiş. Koleksiyoncular peşinde."), fiyat: 65_000, oynak: 0.16, egilim: 0.07, renk: '#c9ced6' },
  { id: 'l_saat_tourbillon', kat: 'saat', ad: () => L("Tourbillon Platin Saat"), aciklama: () => L("Yılda yalnızca 12 tane üretiliyor. El işi, 300 parça."), fiyat: 420_000, oynak: 0.1, egilim: 0.05, renk: '#e5e4e2' },
  { id: 'l_saat_cep', kat: 'saat', ad: () => L("Osmanlı Dönemi Cep Saati"), aciklama: () => L("Kapağında tuğra işlemeli. Müzelerin bile istediği bir parça."), fiyat: 150_000, oynak: 0.2, egilim: 0.08, renk: '#f2c14e' },
  { id: 'l_araba_kupe', kat: 'araba', ad: () => L("1967 Klasik Kupe"), aciklama: () => L("Fabrika çıkışı kırmızı, orijinal motor. Pazar sabahları sahil yolu."), fiyat: 120_000, oynak: 0.14, egilim: 0.05, renk: '#e63946' },
  { id: 'l_araba_ralli', kat: 'araba', ad: () => L("Efsane Ralli Arabası"), aciklama: () => L("Üç şampiyonluk kazanmış. Çamur izleri bilerek temizlenmemiş."), fiyat: 380_000, oynak: 0.22, egilim: 0.06, renk: '#f4f1ea' },
  { id: 'l_araba_gullwing', kat: 'araba', ad: () => L("Martı Kapılı Gümüş Spor"), aciklama: () => L("Kapıları yukarı açılıyor. Dünyada çalışır durumda 40 tane kaldı."), fiyat: 1_400_000, oynak: 0.12, egilim: 0.07, renk: '#c0c7d1' },
  { id: 'l_araba_f1', kat: 'araba', ad: () => L("Şampiyon F1 Aracı"), aciklama: () => L("Bir dünya şampiyonluğu kazanmış şasi. Garajında değil, salonunda durur."), fiyat: 4_800_000, oynak: 0.25, egilim: 0.05, renk: '#d00000' },
  { id: 'l_sanat_eskiz', kat: 'sanat', ad: () => L("Genç Ressamın Boks Eskizi"), aciklama: () => L("Henüz tanınmıyor. Belki bir gün çok değerli olur, belki hiç olmaz."), fiyat: 4_000, oynak: 0.35, egilim: 0.12, renk: '#b57bff' },
  { id: 'l_sanat_heykel', kat: 'sanat', ad: () => L("Bronz Dövüşçü Heykeli"), aciklama: () => L("Kollarını kaldırmış bir şampiyon. Girişte misafirleri karşılar."), fiyat: 55_000, oynak: 0.15, egilim: 0.04, renk: '#c07a45' },
  { id: 'l_sanat_pop', kat: 'sanat', ad: () => L("Pop-Art Şampiyon Portresi"), aciklama: () => L("Ünlü bir sokak sanatçısının elinden, neon renklerde."), fiyat: 240_000, oynak: 0.28, egilim: 0.06, renk: '#ff5c8a' },
  { id: 'l_sanat_tablo', kat: 'sanat', ad: () => L("Empresyonist Tablo"), aciklama: () => L("Bir müzayedede on dakika süren bir savaş sonunda."), fiyat: 2_600_000, oynak: 0.12, egilim: 0.05, renk: '#2ec4b6' },
];

export const LUX_KAT: Record<LuxKat, { ad: () => string; ikon: string }> = {
  saat: { ad: () => L("Saatler"), ikon: 'watch' },
  araba: { ad: () => L("Klasik arabalar"), ikon: 'car-sports' },
  sanat: { ad: () => L("Sanat eserleri"), ikon: 'palette' },
};

export const luxById = (id: string) => LUX.find((x) => x.id === id);
export const SELL_FEE = 0.1;

/** Eşyaya özgü sabit tohum. */
const seed = (id: string) => [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 9973, 7);

/** Eşyanın o haftaki piyasa değeri. */
export function luxValue(it: LuxItem, hafta: number) {
  const k = seed(it.id);
  const dalga = 0.6 * Math.sin(hafta / 7 + k) + 0.4 * Math.sin(hafta / 19 + k * 1.7);
  const f = (1 + it.oynak * dalga) * (1 + (it.egilim * hafta) / 52);
  return Math.round((it.fiyat * clamp(f, 0.4, 6)) / 100) * 100;
}

/** Geçen haftaya göre yüzde değişim. */
export function luxTrend(it: LuxItem, hafta: number) {
  const a = luxValue(it, hafta - 1);
  return a ? (luxValue(it, hafta) - a) / a : 0;
}

/** Müzayedede bu dönem satışta olanlar: her 6 haftada bir değişen 6 eşya (sahip olunanlar hariç). */
export function auctionNow(s: GameState): LuxItem[] {
  const owned = new Set((s.luks ?? []).map((x) => x.id));
  const donem = Math.floor(s.hafta / 6);
  return LUX.filter((x) => !owned.has(x.id))
    .map((x) => ({ x, r: Math.sin(seed(x.id) * 13.7 + donem * 3.1) }))
    .sort((a, b) => b.r - a.r)
    .slice(0, 6)
    .map((o) => o.x);
}
export const weeksToNextAuction = (s: GameState) => 6 - (s.hafta % 6);

export function buyLux(s: GameState, id: string): string {
  const it = luxById(id);
  if (!it || (s.luks ?? []).some((x) => x.id === id)) return '';
  const v = luxValue(it, s.hafta);
  if (s.para < v) return L("Bunun için paran yetmiyor.");
  s.para -= v;
  s.luks = [...(s.luks ?? []), { id, alis: v, hafta: s.hafta }];
  if (v >= 200_000) s.populerlik = clamp(s.populerlik + 1, 0, 100);
  s.haberler.unshift(L("🖼️ Müzayededen aldın: {0} (${1})", [it.ad(), v.toLocaleString(LOC)]));
  return L("{0} artık koleksiyonunda.", [it.ad()]);
}

export function sellLux(s: GameState, id: string): string {
  const own = (s.luks ?? []).find((x) => x.id === id);
  const it = luxById(id);
  if (!own || !it) return '';
  const net = Math.round((luxValue(it, s.hafta) * (1 - SELL_FEE)) / 100) * 100;
  s.para += net;
  s.luks = (s.luks ?? []).filter((x) => x.id !== id);
  const kar = net - own.alis;
  s.haberler.unshift(L("🔨 {0} satıldı: ${1} ({2})", [it.ad(), net.toLocaleString(LOC), `${kar >= 0 ? '+' : '-'}$${Math.abs(kar).toLocaleString(LOC)}`]));
  return kar >= 0 ? L("Sattın: ${0}. Kâr: ${1}.", [net.toLocaleString(LOC), kar.toLocaleString(LOC)]) : L("Sattın: ${0}. Zarar: ${1}.", [net.toLocaleString(LOC), Math.abs(kar).toLocaleString(LOC)]);
}

/** Koleksiyonun bugünkü toplam değeri. */
export const luxTotal = (s: GameState) => (s.luks ?? []).reduce((a, x) => a + (luxById(x.id) ? luxValue(luxById(x.id)!, s.hafta) : 0), 0);
