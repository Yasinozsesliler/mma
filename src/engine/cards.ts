// Dövüşçü kartı albümü: yendiğin her dövüşçü bir kart olur. Nadirlik organizasyonun seviyesine ve rakibin
// konumuna göre (şampiyon, UCC ilk 3, ezeli rakip, eski antrenman ortağı) belirlenir. Albüm eşikleri ödül verir.
import { L, LOC } from '../i18n';
import { ORGS } from './data';
import type { GameState, Opponent, OrgId } from './types';

export type Rarity = 'bronz' | 'gumus' | 'altin' | 'efsane';

export interface FighterCard {
  id: string;
  ad: string;
  soyad: string;
  lakap?: string;
  uyruk: string;
  kadin?: boolean;
  org: OrgId;
  nadir: Rarity;
  yontem: string;
  yas: number;
  /** Kaç kez yenildi */
  sayi: number;
  ozel?: 'sampiyon' | 'ezeli' | 'kanka';
}

export const RARITY: Record<Rarity, { ad: () => string; renk: string; sira: number }> = {
  bronz: { ad: () => L("Bronz"), renk: '#c07a45', sira: 0 },
  gumus: { ad: () => L("Gümüş"), renk: '#b8c2cc', sira: 1 },
  altin: { ad: () => L("Altın"), renk: '#f2c14e', sira: 2 },
  efsane: { ad: () => L("Efsane"), renk: '#c86bff', sira: 3 },
};

export const ALBUM_MILESTONES = [10, 25, 50, 75];

function rarityOf(s: GameState, o: Opponent, org: OrgId): { nadir: Rarity; ozel?: FighterCard['ozel'] } {
  if (s.ezeli?.id === o.id) return { nadir: 'efsane', ozel: 'ezeli' };
  if (s.kanka?.o.id === o.id) return { nadir: 'efsane', ozel: 'kanka' };
  const st = ORGS[org]?.stage ?? 'amator';
  if (o.champion) return { nadir: st === 'ufc' ? 'efsane' : st === 'buyuk' ? 'altin' : 'gumus', ozel: 'sampiyon' };
  if (st === 'ufc') return { nadir: 'altin' };
  if (st === 'buyuk') return { nadir: 'gumus' };
  return { nadir: st === 'bolgesel' && o.rank != null && o.rank <= 2 ? 'gumus' : 'bronz' };
}

/** Galibiyetten sonra kartı albüme ekler (aynı rakip yeniden yenilirse sayı artar, nadirlik yükselebilir). */
export function addCard(s: GameState, o: Opponent, org: OrgId, yontem: string): string | null {
  s.kartlar ??= [];
  const r = rarityOf(s, o, org);
  const old = s.kartlar.find((c) => c.id === o.id);
  if (old) {
    old.sayi++;
    if (RARITY[r.nadir].sira > RARITY[old.nadir].sira) {
      old.nadir = r.nadir;
      old.ozel = r.ozel ?? old.ozel;
      return L("🃏 {0} kartı yükseldi: {1}!", [`${o.ad} ${o.soyad}`, RARITY[r.nadir].ad()]);
    }
    return null;
  }
  s.kartlar.push({ id: o.id, ad: o.ad, soyad: o.soyad, lakap: o.lakap, uyruk: o.uyruk, ...(o.kadin ? { kadin: true } : {}), org, nadir: r.nadir, yontem, yas: s.fighter.yas, sayi: 1, ozel: r.ozel });
  return L("🃏 Albüme yeni kart: {0} ({1})", [`${o.ad} ${o.soyad}`, RARITY[r.nadir].ad()]);
}

/** Eski kayıtlar: geçmişteki galibiyetlerden albümü kur (şampiyonluk bilgisi olmadığı için organizasyona göre). */
export function ensureAlbum(s: GameState) {
  if (s.kartlar) return;
  s.kartlar = [];
  [...s.gecmis].reverse().forEach((h) => {
    if (h.sonuc !== 'G') return;
    const id = h.rakipId ?? `eski-${h.rakip}`;
    const old = s.kartlar!.find((c) => c.id === id);
    if (old) return void old.sayi++;
    const [ad, ...rest] = h.rakip.split(' ');
    const st = ORGS[h.org]?.stage ?? 'amator';
    const nadir: Rarity = st === 'ufc' ? 'altin' : st === 'buyuk' ? 'gumus' : 'bronz';
    const known = s.rakipler.find((r) => r.id === id);
    s.kartlar!.push({ id, ad, soyad: rest.join(' '), lakap: known?.lakap, uyruk: known?.uyruk ?? s.fighter.uyruk, ...(s.fighter.kadin ? { kadin: true } : {}), org: h.org, nadir, yontem: h.yontem, yas: h.yas, sayi: 1 });
  });
}

const BASE: Record<GameState['stage'], number> = { amator: 500, bolgesel: 4_000, buyuk: 20_000, ufc: 60_000 };

export function milestoneReward(s: GameState, i: number) {
  return { para: Math.round((BASE[s.stage] * (1 + i)) / 50) * 50, puan: 1 + i };
}

export function claimMilestone(s: GameState, i: number) {
  const n = (s.kartlar ?? []).length;
  s.albumOdul ??= [];
  if (n < ALBUM_MILESTONES[i] || s.albumOdul.includes(i)) return;
  const r = milestoneReward(s, i);
  s.albumOdul.push(i);
  s.para += r.para;
  s.puan += r.puan;
  s.haberler.unshift(L("🃏 Albüm ödülü ({0} kart): ${1} ve +{2} gelişim puanı", [ALBUM_MILESTONES[i], r.para.toLocaleString(LOC), r.puan]));
}

export const unclaimedMilestones = (s: GameState) => ALBUM_MILESTONES.filter((m, i) => (s.kartlar ?? []).length >= m && !(s.albumOdul ?? []).includes(i)).length;
