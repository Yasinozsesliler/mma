// Miras: kemerler, başarımlar ve efsane puanı. Uzun vadeli hedefler buradan gelir.
import { L } from '../i18n';
import { ORGS, WEIGHT_CLASSES } from './data';
import { ACHIEVEMENTS, HOF_ACHIEVEMENTS, HOF_PILLARS, HOF_SCORE } from './achievements';
import { istat } from './istat';
import type { Belt, GameState, OrgId, WeightClass } from './types';

export const beltTitle = (b: Pick<Belt, 'org' | 'siklet'>) => L("{0} {1} Sıklet Şampiyonu", [ORGS[b.org].ad, WEIGHT_CLASSES[b.siklet].ad]);

export const activeBelts = (s: GameState) => (s.kemerler ?? []).filter((b) => b.aktif);

/** Aynı organizasyonda aynı anda tutulan kemer sayısına göre unvan. */
export function champLabel(n: number) {
  if (n >= 5) return { en: L("LEGENDARY CHAMP"), tr: L("EFSANE ŞAMPİYON") };
  if (n === 4) return { en: L("QUADRUPLE CHAMP"), tr: L("DÖRT SIKLET ŞAMPİYONU") };
  if (n === 3) return { en: L("TRIPLE CHAMP"), tr: L("ÜÇ SIKLET ŞAMPİYONU") };
  if (n === 2) return { en: L("DOUBLE CHAMP"), tr: L("ÇİFT SIKLET ŞAMPİYONU") };
  return { en: L("CHAMPION"), tr: L("ŞAMPİYON") };
}

/** Bir organizasyonda aynı anda tutulan en fazla kemer sayısı. */
export function maxHeldBelts(s: GameState) {
  const byOrg = new Map<string, number>();
  activeBelts(s).forEach((b) => byOrg.set(b.org, (byOrg.get(b.org) ?? 0) + 1));
  return Math.max(0, ...byOrg.values());
}

/** Kemer kazanıldı. Döner: aynı organizasyonda aynı anda tutulan kemer sayısı (2 = double, 3 = triple…). */
export function winBelt(s: GameState, org: OrgId, siklet: WeightClass): number {
  s.kemerler = s.kemerler ?? [];
  s.kemerler.push({ org, siklet, hafta: s.hafta, yas: s.fighter.yas, savunma: 0, aktif: true });
  const sayi = activeBelts(s).filter((b) => b.org === org).length;
  s.kutlama = { tur: sayi >= 2 ? 'cift' : 'kemer', org, siklet, sayi };
  return sayi;
}

export function defendBelt(s: GameState, org: OrgId, siklet: WeightClass) {
  const b = (s.kemerler ?? []).find((x) => x.aktif && x.org === org && x.siklet === siklet);
  if (!b) return;
  b.savunma++;
  if ([1, 3, 5, 10].includes(b.savunma)) s.kutlama = { tur: 'savunma', org, siklet };
}

export function loseBelt(s: GameState, org: OrgId, siklet: WeightClass) {
  (s.kemerler ?? []).forEach((b) => {
    if (b.aktif && b.org === org && b.siklet === siklet) b.aktif = false;
  });
}

/** Organizasyondan ayrılınca oradaki kemerler boşa düşer. */
export function vacateOrg(s: GameState, org: OrgId) {
  (s.kemerler ?? []).forEach((b) => {
    if (b.aktif && b.org === org) b.aktif = false;
  });
}

// ---------- Başarımlar ----------

export { ACHIEVEMENTS, CATEGORIES, TIERS, HOF_ACHIEVEMENTS, HOF_PILLARS, HOF_SCORE } from './achievements';
export type { Achievement, AchCategory, AchTier } from './achievements';

/** Yeni kazanılan başarımları işler ve haber olarak duyurur. */
export function checkAchievements(s: GameState, sessiz = false): string[] {
  s.basarimlar = s.basarimlar ?? [];
  const i = istat(s);
  i.maxPara = Math.max(i.maxPara, s.para);
  const yeni: string[] = [];
  ACHIEVEMENTS.forEach((a) => {
    if (!s.basarimlar!.includes(a.id) && a.check(s)) {
      s.basarimlar!.push(a.id);
      yeni.push(a.ad);
      if (!sessiz) s.haberler.unshift(L("⭐ BAŞARIM: {0} — {1}", [a.ad, a.aciklama]));
    }
  });
  if (!s.hof && hofStatus(s).hazir) {
    s.hof = { hafta: s.hafta, yas: s.fighter.yas, skor: legacyScore(s) };
    s.haberler.unshift(L("🏛️ ONUR LİSTESİ! {0} {1} MMA Hall of Fame’e seçildi. Adı artık ölümsüz.", [s.fighter.ad, s.fighter.soyad]));
    s.populerlik = Math.min(100, s.populerlik + 10);
    yeni.push(L("HALL OF FAME"));
  }
  return yeni;
}

/** Onur Listesi eşikleri: efsane puanı + yeterli sayıda 🏛 başarımı. */
export function hofStatus(s: GameState) {
  const skor = legacyScore(s);
  const acik = HOF_ACHIEVEMENTS.filter((x) => (s.basarimlar ?? []).includes(x.id));
  return { skor, acik, hazir: skor >= HOF_SCORE && acik.length >= HOF_PILLARS };
}

/** Efsane puanı: kariyerin tarihteki yeri. */
export function legacyScore(s: GameState) {
  const r = s.rekor;
  const kemer = (s.kemerler ?? []).reduce((a, b) => a + (b.org === 'ufc' ? 60 : 25) + b.savunma * (b.org === 'ufc' ? 15 : 6), 0);
  // 100 başarım var; toplam puanı dengelemek için yarısı sayılır.
  const bas = Math.round((s.basarimlar ?? []).reduce((a, id) => a + (ACHIEVEMENTS.find((x) => x.id === id)?.puan ?? 0), 0) * 0.5);
  return Math.max(0, r.g * 3 + (r.ko + r.sub) * 2 - r.m * 2 + kemer + bas + Math.round(s.populerlik / 2));
}

export function legacyTier(score: number) {
  if (score >= 900) return { ad: L("TÜM ZAMANLARIN EN İYİSİ (GOAT)"), renk: '#f2c14e' };
  if (score >= 600) return { ad: L("ONUR LİSTESİ EFSANESİ"), renk: '#f2c14e' };
  if (score >= 350) return { ad: L("DÖNEMİNİN YILDIZI"), renk: '#3ecf7a' };
  if (score >= 150) return { ad: L("SAYGIN BİR SAVAŞÇI"), renk: '#3a86ff' };
  return { ad: L("YOLUN BAŞINDA"), renk: '#a3a9b5' };
}
