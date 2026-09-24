// Miras: kemerler, başarımlar ve efsane puanı. Uzun vadeli hedefler buradan gelir.
import { ORGS, WEIGHT_CLASSES } from './data';
import { weeklyBusinessIncome } from './economy';
import type { Belt, GameState, OrgId, WeightClass } from './types';

export const beltTitle = (b: Pick<Belt, 'org' | 'siklet'>) => `${ORGS[b.org].ad} ${WEIGHT_CLASSES[b.siklet].ad} Sıklet Şampiyonu`;

export const activeBelts = (s: GameState) => (s.kemerler ?? []).filter((b) => b.aktif);

/** Kemer kazanıldı. Aynı organizasyonda başka aktif kemer varsa çift şampiyonluk. */
export function winBelt(s: GameState, org: OrgId, siklet: WeightClass): 'kemer' | 'cift' {
  s.kemerler = s.kemerler ?? [];
  const cift = s.kemerler.some((b) => b.aktif && b.org === org && b.siklet !== siklet);
  s.kemerler.push({ org, siklet, hafta: s.hafta, yas: s.fighter.yas, savunma: 0, aktif: true });
  s.kutlama = { tur: cift ? 'cift' : 'kemer', org, siklet };
  return cift ? 'cift' : 'kemer';
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

export interface Achievement {
  id: string;
  ad: string;
  aciklama: string;
  ikon: string;
  puan: number;
  check: (s: GameState) => boolean;
}

const wins = (s: GameState) => s.rekor.g;
const maxDef = (s: GameState) => Math.max(0, ...(s.kemerler ?? []).map((b) => b.savunma));

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'ilk_pro', ad: 'Profesyonel', aciklama: 'İlk profesyonel galibiyet.', ikon: 'hand-okay', puan: 5, check: (s) => wins(s) >= 1 },
  { id: 'ko5', ad: 'Ağır Eller', aciklama: '5 profesyonel KO/TKO.', ikon: 'boxing-glove', puan: 10, check: (s) => s.rekor.ko >= 5 },
  { id: 'ko15', ad: 'Nakavt Sanatçısı', aciklama: '15 profesyonel KO/TKO.', ikon: 'fire', puan: 25, check: (s) => s.rekor.ko >= 15 },
  { id: 'sub5', ad: 'Kilit Ustası', aciklama: '5 submission galibiyeti.', ikon: 'lock', puan: 10, check: (s) => s.rekor.sub >= 5 },
  { id: 'sub12', ad: 'Anakonda', aciklama: '12 submission galibiyeti.', ikon: 'snake', puan: 25, check: (s) => s.rekor.sub >= 12 },
  { id: 'seri5', ad: 'Durdurulamaz', aciklama: '5 maçlık galibiyet serisi.', ikon: 'trending-up', puan: 10, check: (s) => s.seri >= 5 },
  { id: 'seri10', ad: 'Yenilmezlik Efsanesi', aciklama: '10 maçlık galibiyet serisi.', ikon: 'shield-star', puan: 30, check: (s) => s.seri >= 10 },
  { id: 'yenilmez', ad: 'Kusursuz Başlangıç', aciklama: 'Profesyonel kariyere 10-0 başla.', ikon: 'star-circle', puan: 30, check: (s) => s.rekor.g >= 10 && s.rekor.m === 0 },
  { id: 'kemer1', ad: 'Kemer Sahibi', aciklama: 'İlk şampiyonluk kemeri.', ikon: 'trophy', puan: 20, check: (s) => (s.kemerler ?? []).length >= 1 },
  { id: 'cift', ad: 'Double Champ', aciklama: 'Aynı anda iki sıklette şampiyon ol.', ikon: 'trophy-variant', puan: 60, check: (s) => new Set(activeBelts(s).filter((b) => b.org === activeBelts(s)[0]?.org).map((b) => b.siklet)).size >= 2 },
  { id: 'savunma3', ad: 'Tahtın Bekçisi', aciklama: 'Bir kemeri 3 kez savun.', ikon: 'shield-check', puan: 20, check: (s) => maxDef(s) >= 3 },
  { id: 'savunma5', ad: 'Hükümdar', aciklama: 'Bir kemeri 5 kez savun.', ikon: 'crown', puan: 35, check: (s) => maxDef(s) >= 5 },
  { id: 'savunma10', ad: 'Ölümsüz Kral', aciklama: 'Bir kemeri 10 kez savun.', ikon: 'crown-circle', puan: 80, check: (s) => maxDef(s) >= 10 },
  { id: 'dwcs', ad: 'Dana’nın Seçimi', aciklama: 'UFC kontratı kazan.', ikon: 'ticket', puan: 20, check: (s) => s.stage === 'ufc' || (s.kemerler ?? []).some((b) => b.org === 'ufc') },
  { id: 'ufc_kemer', ad: 'UFC Şampiyonu', aciklama: 'UFC kemerini kazan.', ikon: 'trophy-award', puan: 60, check: (s) => (s.kemerler ?? []).some((b) => b.org === 'ufc') },
  { id: 'uc_org', ad: 'Gezgin Şampiyon', aciklama: 'Üç farklı organizasyonda kemer kazan.', ikon: 'earth', puan: 35, check: (s) => new Set((s.kemerler ?? []).map((b) => b.org)).size >= 3 },
  { id: 'dovus50', ad: 'Savaş Gazisi', aciklama: '50 profesyonel dövüş.', ikon: 'medal', puan: 25, check: (s) => s.rekor.g + s.rekor.m + s.rekor.b >= 50 },
  { id: 'veteran', ad: 'Yaşlı Kurt', aciklama: '38 yaşında hâlâ kazanıyor.', ikon: 'account-clock', puan: 20, check: (s) => s.fighter.yas >= 38 && s.seri >= 1 && s.stage !== 'amator' },
  { id: 'intikam', ad: 'İntikam', aciklama: 'Seni yenen bir rakibi rövanşta yen.', ikon: 'sword-cross', puan: 15, check: (s) => s.rakipler.some((r) => r.karsilasma >= 2 && r.sonSonuc === 'G') },
  { id: 'pop100', ad: 'Süperstar', aciklama: 'Popülerlik 100.', ikon: 'star-shooting', puan: 30, check: (s) => s.populerlik >= 100 },
  { id: 'milyoner', ad: 'Milyoner', aciklama: '1 milyon dolar biriktir.', ikon: 'cash-multiple', puan: 15, check: (s) => s.para >= 1_000_000 },
  { id: 'onmilyon', ad: 'İmparator', aciklama: '10 milyon dolar biriktir.', ikon: 'diamond-stone', puan: 40, check: (s) => s.para >= 10_000_000 },
  { id: 'patron', ad: 'Patron', aciklama: 'Haftada 20.000$ işletme geliri.', ikon: 'store', puan: 25, check: (s) => weeklyBusinessIncome(s) >= 20000 },
  { id: 'otuz', ad: 'Otuzluk', aciklama: '30 profesyonel galibiyet.', ikon: 'numeric-3-box', puan: 30, check: (s) => wins(s) >= 30 },
];

/** Yeni kazanılan başarımları işler ve haber olarak duyurur. */
export function checkAchievements(s: GameState): string[] {
  s.basarimlar = s.basarimlar ?? [];
  const yeni: string[] = [];
  ACHIEVEMENTS.forEach((a) => {
    if (!s.basarimlar!.includes(a.id) && a.check(s)) {
      s.basarimlar!.push(a.id);
      yeni.push(a.ad);
      s.haberler.unshift(`⭐ BAŞARIM: ${a.ad} — ${a.aciklama}`);
    }
  });
  return yeni;
}

/** Efsane puanı: kariyerin tarihteki yeri. */
export function legacyScore(s: GameState) {
  const r = s.rekor;
  const kemer = (s.kemerler ?? []).reduce((a, b) => a + (b.org === 'ufc' ? 60 : 25) + b.savunma * (b.org === 'ufc' ? 15 : 6), 0);
  const bas = (s.basarimlar ?? []).reduce((a, id) => a + (ACHIEVEMENTS.find((x) => x.id === id)?.puan ?? 0), 0);
  return Math.max(0, r.g * 3 + (r.ko + r.sub) * 2 - r.m * 2 + kemer + bas + Math.round(s.populerlik / 2));
}

export function legacyTier(score: number) {
  if (score >= 900) return { ad: 'TÜM ZAMANLARIN EN İYİSİ (GOAT)', renk: '#f2c14e' };
  if (score >= 600) return { ad: 'ONUR LİSTESİ EFSANESİ', renk: '#f2c14e' };
  if (score >= 350) return { ad: 'DÖNEMİNİN YILDIZI', renk: '#3ecf7a' };
  if (score >= 150) return { ad: 'SAYGIN BİR SAVAŞÇI', renk: '#3a86ff' };
  return { ad: 'YOLUN BAŞINDA', renk: '#a3a9b5' };
}
