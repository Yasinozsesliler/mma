// Evcil hayvanlar: isim ver, bak, besle. Mutlu hayvan motivasyon verir, ihmal edilen hasta olur.
// Saf modül: ekonomi haftalık tikinden çağrılır.
import { L, LOC } from '../i18n';
import { chance, clamp, uid } from './rng';
import type { GameState } from './types';

export interface PetType {
  id: string;
  ad: string;
  tur: string;
  emoji: string;
  renk: string;
  fiyat: number;
  haftalik: number; // bakım (mama, bakım, sigorta)
  aciklama: string;
  kondisyon?: boolean; // sabah koşusu ortağı
}

export const PET_TYPES: PetType[] = [
  { id: 'kangal', ad: L("Kangal"), tur: L("Köpek"), emoji: '🐕', renk: '#c9a36b', fiyat: 3500, haftalik: 70, aciklama: L("Sadık, dev ve korkusuz. Sabah koşularının bekçisi."), kondisyon: true },
  { id: 'pitbull', ad: L("Pitbull"), tur: L("Köpek"), emoji: '🐕', renk: '#8d99ae', fiyat: 2000, haftalik: 55, aciklama: L("Kaslı ve enerjik. Tam bir dövüşçü köpeği."), kondisyon: true },
  { id: 'golden', ad: L("Golden Retriever"), tur: L("Köpek"), emoji: '🦮', renk: '#e0b04a', fiyat: 2500, haftalik: 60, aciklama: L("Herkesin sevgilisi. Sosyal medyada yıldız olur.") },
  { id: 'husky', ad: L("Sibirya Husky"), tur: L("Köpek"), emoji: '🐺', renk: '#b8c4d6', fiyat: 3000, haftalik: 65, aciklama: L("Durmadan koşar. Kondisyon canavarı."), kondisyon: true },
  { id: 'doberman', ad: L("Doberman"), tur: L("Köpek"), emoji: '🐕', renk: '#3a2a22', fiyat: 3200, haftalik: 65, aciklama: L("Zeki ve disiplinli. Evinin bekçisi.") },
  { id: 'tekir', ad: L("Tekir Kedi"), tur: L("Kedi"), emoji: '🐈', renk: '#a47148', fiyat: 150, haftalik: 20, aciklama: L("Sokaktan kurtarılmış bir savaşçı.") },
  { id: 'van', ad: L("Van Kedisi"), tur: L("Kedi"), emoji: '🐈', renk: '#f4f1ea', fiyat: 1500, haftalik: 30, aciklama: L("İki farklı renk göz, efsanevi zarafet.") },
  { id: 'british', ad: L("British Shorthair"), tur: L("Kedi"), emoji: '🐈', renk: '#7d8591', fiyat: 2200, haftalik: 35, aciklama: L("Tombul, sakin ve asil.") },
  { id: 'papagan', ad: L("Ara Papağanı"), tur: L("Kuş"), emoji: '🦜', renk: '#e63946', fiyat: 4500, haftalik: 40, aciklama: L("Adını söylemeyi öğrenir. Maç günü bağırır.") },
  { id: 'tavsan', ad: L("Tavşan"), tur: L("Diğer"), emoji: '🐇', renk: '#e9ecef', fiyat: 200, haftalik: 15, aciklama: L("Sessiz ve sevimli bir ev arkadaşı.") },
  { id: 'kaplumbaga', ad: L("Kaplumbağa"), tur: L("Diğer"), emoji: '🐢', renk: '#52b788', fiyat: 300, haftalik: 10, aciklama: L("Senden uzun yaşayacak. Sabır öğretir.") },
  { id: 'at', ad: L("Arap Atı"), tur: L("Diğer"), emoji: '🐎', renk: '#7f4f24', fiyat: 60000, haftalik: 900, aciklama: L("Çiftlikte binicilik. Pahalı ama prestijli.") },
];

export const petType = (id: string) => PET_TYPES.find((p) => p.id === id);

export interface Pet {
  id: string;
  tur: string; // PetType id
  ad: string;
  mutluluk: number; // 0-100
  saglik: number; // 0-100
  hasta: boolean;
  sonOyun?: number; // hafta
  premium?: boolean; // premium mama: ekstra masraf, daha mutlu
}

export const weeklyPetCost = (s: GameState) =>
  (s.hayvanlar ?? []).reduce((a, p) => a + (petType(p.tur)?.haftalik ?? 0) * (p.premium ? 2 : 1), 0);

export const vetCost = (p: Pet) => Math.max(150, Math.round((petType(p.tur)?.fiyat ?? 1000) * 0.12));

export function adoptPet(s: GameState, turId: string, ad: string): string {
  const t = petType(turId);
  if (!t) return L("Tür bulunamadı.");
  const isim = ad.trim().slice(0, 20);
  if (!isim) return L("Önce bir isim ver.");
  if (s.para < t.fiyat) return L("Paran yetmiyor.");
  if ((s.hayvanlar ?? []).length >= 6) return L("Daha fazla hayvana bakamazsın (en fazla 6).");
  s.para -= t.fiyat;
  s.hayvanlar = [...(s.hayvanlar ?? []), { id: uid(), tur: turId, ad: isim, mutluluk: 80, saglik: 100, hasta: false }];
  s.haberler.unshift(L("🛍️ Yeni aile üyesi: {0} {1} ({2})", [t.emoji, isim, t.ad]));
  return L("{0} {1} artık seninle! Haftalık bakım ${2}.", [t.emoji, isim, t.haftalik]);
}

export function playWithPet(s: GameState, id: string): string {
  const p = (s.hayvanlar ?? []).find((x) => x.id === id);
  if (!p) return '';
  if (p.sonOyun === s.hafta) return L("{0} bu hafta zaten doya doya oynadı.", [p.ad]);
  p.sonOyun = s.hafta;
  p.mutluluk = clamp(p.mutluluk + 20, 0, 100);
  return L("{0} ile oynadın. Kuyruğunu sallıyor! (Mutluluk +20)", [p.ad]);
}

export function vetVisit(s: GameState, id: string): string {
  const p = (s.hayvanlar ?? []).find((x) => x.id === id);
  if (!p) return '';
  const c = vetCost(p);
  if (s.para < c) return L("Veteriner için paran yetmiyor.");
  s.para -= c;
  p.saglik = 100;
  p.hasta = false;
  p.mutluluk = clamp(p.mutluluk + 5, 0, 100);
  return L("{0} veterinerden sapasağlam döndü. (-${1})", [p.ad, c.toLocaleString(LOC)]);
}

export function togglePremium(s: GameState, id: string) {
  const p = (s.hayvanlar ?? []).find((x) => x.id === id);
  if (p) p.premium = !p.premium;
}

/** Haftalık: mutluluk azalır (premium mama ve oyun yavaşlatır), ihmal hastalık getirir. */
export function petTick(s: GameState, weeks: number, parasiz: boolean): string[] {
  const notes: string[] = [];
  (s.hayvanlar ?? []).forEach((p) => {
    const decay = (p.premium ? 2 : 5) + (parasiz ? 12 : 0);
    p.mutluluk = clamp(p.mutluluk - decay * weeks, 0, 100);
    if (!p.hasta && chance(Math.min(0.6, (p.mutluluk < 30 ? 0.12 : 0.02) * weeks))) {
      p.hasta = true;
      notes.push(L("🐾 {0} hastalandı! Veterinere götürmen gerek.", [p.ad]));
    }
    if (p.hasta) p.saglik = clamp(p.saglik - 8 * weeks, 5, 100);
  });
  return notes;
}

/** Kamp motivasyonuna etkisi: mutlu bir hayvan +1, ihmal edilen hayvan -1. */
export function petMotivation(s: GameState) {
  const list = s.hayvanlar ?? [];
  if (!list.length) return 0;
  if (list.some((p) => p.mutluluk < 25 || p.hasta)) return -1;
  return list.some((p) => p.mutluluk >= 60) ? 1 : 0;
}

/** Köpekle sabah koşusu: kondisyon odağında küçük ek gelişim. */
export const petRunner = (s: GameState) => (s.hayvanlar ?? []).some((p) => petType(p.tur)?.kondisyon && p.mutluluk >= 50);
