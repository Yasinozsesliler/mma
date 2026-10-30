// Sezon Kemeri: her ay yeni bir sezon (Ekim 2026 = Sezon 1), 20 basamak. Ücretsiz sırada 4, Şampiyon sırasında 6 ödül.
// Ödüller yalnızca kozmetik (oyun gücü yok). Her sezonun kendi teması ve renk paleti var; 12 tema yıl boyunca döner.
import { L } from '../i18n';
import type { Cosmetic, FxKind, Pattern, Rarity } from './cosmetics';

export const SEASON_TIERS = 20;
export const TIER_XP = 50;

/** Puan kaynakları (dengeli: düzenli oynayan ay sonuna kadar 20. basamağa ulaşır). */
export const SEASON_XP = { mac: 6, galibiyet: 6, bitiris: 3, gunluk: 15, hayali: 10, bolum: 25 } as const;

/** Ekim 2026 → 1, Kasım 2026 → 2 … */
export const seasonIndex = (d = new Date()) => Math.max(1, (d.getFullYear() - 2026) * 12 + d.getMonth() - 9 + 1);

export function seasonDaysLeft(d = new Date()) {
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return Math.max(1, Math.ceil((end.getTime() - d.getTime()) / 86_400_000));
}

type Theme = { ad: () => string; a: string; b: string; c: string; desen: Pattern; fx: FxKind };
const THEMES: Theme[] = [
  { ad: () => L("Sonbahar Fırtınası"), a: '#7a2e0e', b: '#f4a259', c: '#ffd166', desen: 'alev', fx: 'duman' },
  { ad: () => L("Kış Savaşçısı"), a: '#0b2540', b: '#bfe6ff', c: '#ffffff', desen: 'simsek', fx: 'kar' },
  { ad: () => L("Yeni Yıl"), a: '#111111', b: '#f2c14e', c: '#ffffff', desen: 'yildiz', fx: 'konfeti' },
  { ad: () => L("Kızıl Kalp"), a: '#5a0f1d', b: '#ff5c8a', c: '#ffd6e0', desen: 'yildiz', fx: 'konfeti' },
  { ad: () => L("Bahar Uyanışı"), a: '#1b4332', b: '#95d5b2', c: '#f2c14e', desen: 'kaplan', fx: 'duman' },
  { ad: () => L("Çöl Kartalı"), a: '#7f5539', b: '#e6ccb2', c: '#c9a227', desen: 'kaplan', fx: 'duman' },
  { ad: () => L("Okyanus"), a: '#03045e', b: '#00b4d8', c: '#caf0f8', desen: 'simsek', fx: 'simsek' },
  { ad: () => L("Yaz Ateşi"), a: '#9d0208', b: '#ffba08', c: '#fff3b0', desen: 'alev', fx: 'ates' },
  { ad: () => L("Neon Gece"), a: '#10002b', b: '#39ff14', c: '#e0aaff', desen: 'simsek', fx: 'simsek' },
  { ad: () => L("Altın Saat"), a: '#5c3d00', b: '#ffd166', c: '#fff8e1', desen: 'yildiz', fx: 'konfeti' },
  { ad: () => L("Demir Yumruk"), a: '#212529', b: '#adb5bd', c: '#e63946', desen: 'simsek', fx: 'duman' },
  { ad: () => L("Gece Yarısı Korkusu"), a: '#14001f', b: '#f77f00', c: '#9d4edd', desen: 'alev', fx: 'ates' },
];
/** Tema takvim ayına bağlı: liste Kasım'dan başlar (Sezon 1 = Ekim → son tema). */
export const seasonTheme = (idx: number) => THEMES[(((idx - 2) % 12) + 12) % 12];
export const seasonName = (idx: number) => seasonTheme(idx).ad();

export type SeasonReward = { basamak: number; pro: boolean; id: string };

/** Bir sezonun ödül kozmetikleri (kimlik: sz{sezon}_{basamak}). */
export function seasonCosmetics(idx: number): Cosmetic[] {
  const t = seasonTheme(idx);
  const n = t.ad();
  const src = (basamak: number, pro: boolean) => ({ tur: 'sezon' as const, sezon: idx, basamak, pro });
  const it = (basamak: number, pro: boolean, x: Omit<Cosmetic, 'id' | 'kaynak'> & { nadir: Rarity }): Cosmetic => ({ ...x, id: `sz${idx}_${basamak}`, kaynak: src(basamak, pro) });
  return [
    it(1, true, { slot: 'eldiven', ad: L("{0} Eldiveni", [n]), renk: [t.c], nadir: 'nadir' }),
    it(3, false, { slot: 'cerceve', ad: L("{0} Çerçevesi", [n]), renk: [t.b], nadir: 'siradan' }),
    it(5, true, { slot: 'sort', ad: L("{0} Şortu", [n]), renk: [t.b, t.a], nadir: 'nadir' }),
    it(7, false, { slot: 'eldiven', ad: L("{0} Bandajı", [n]), renk: [t.b], nadir: 'siradan' }),
    it(9, true, { slot: 'cerceve', ad: L("{0} Halesi", [n]), renk: [t.c], nadir: 'epik' }),
    it(12, false, { slot: 'sort', ad: L("{0} Antrenman Şortu", [n]), renk: [t.a, t.b], nadir: 'nadir' }),
    it(13, true, { slot: 'efekt', ad: L("{0} Girişi", [n]), renk: [], fx: t.fx, nadir: 'epik' }),
    it(16, true, { slot: 'kemer', ad: L("{0} Kemeri", [n]), renk: [t.c, t.b, '#0b0b0c', t.b], nadir: 'epik' }),
    it(17, false, { slot: 'kemer', ad: L("{0} Kayışı", [n]), renk: ['#f0f0f0', t.b, t.a, t.c], nadir: 'nadir' }),
    it(20, true, { slot: 'sort', ad: L("{0} Şampiyonu", [n]), renk: [t.a, t.c], desen: t.desen, desenRenk: t.b, nadir: 'efsane' }),
  ];
}

export const seasonRewards = (idx: number): SeasonReward[] =>
  seasonCosmetics(idx).map((x) => {
    const k = x.kaynak as { basamak: number; pro: boolean };
    return { basamak: k.basamak, pro: k.pro, id: x.id };
  });

/** Dolapta tanımlı olması gereken bütün sezonlar: ilk sezondan bir sonrakine kadar (geçmiş ödüller sahibinde kalır). */
export function allSeasonCosmetics(now = new Date()): Cosmetic[] {
  const last = Math.max(1, seasonIndex(now) + 1);
  const out: Cosmetic[] = [];
  for (let i = 1; i <= last; i++) out.push(...seasonCosmetics(i));
  return out;
}

export const tierOf = (xp: number) => Math.min(SEASON_TIERS, Math.floor(xp / TIER_XP));
