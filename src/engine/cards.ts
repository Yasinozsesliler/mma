// Dövüşçü kartı albümü: yendiğin her dövüşçü bir kart olur. Nadirlik organizasyonun seviyesine ve rakibin
// konumuna göre (şampiyon, UCC ilk 3, ezeli rakip, eski antrenman ortağı) belirlenir. Albüm eşikleri ödül verir.
import { L, LOC } from '../i18n';
import { ORGS } from './data';
import { methodLabel } from './fight';
import { chance } from './rng';
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
  /** Parlak (hologram) kart: yeni kartların küçük bir kısmı */
  parlak?: boolean;
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
  const parlak = chance(0.1);
  s.kartlar.push({ id: o.id, ad: o.ad, soyad: o.soyad, lakap: o.lakap, uyruk: o.uyruk, ...(o.kadin ? { kadin: true } : {}), org, nadir: r.nadir, yontem, yas: s.fighter.yas, sayi: 1, ozel: r.ozel, ...(parlak ? { parlak } : {}) });
  return parlak
    ? L("✨ Albüme PARLAK kart: {0} ({1})!", [`${o.ad} ${o.soyad}`, RARITY[r.nadir].ad()])
    : L("🃏 Albüme yeni kart: {0} ({1})", [`${o.ad} ${o.soyad}`, RARITY[r.nadir].ad()]);
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

// ---------- Setler ----------
// Belirli kart gruplarını toplamak set ödülü verir (para ve bazılarında kozmetik). Güç vermez.
type SetDef = { id: string; ad: () => string; aciklama: () => string; hedef: number; say: (k: FighterCard[]) => number; kozmetik?: string; ikon: string };

const ulkeSay = (ulke: string) => (k: FighterCard[]) => k.filter((c) => c.uyruk === ulke).length;
const isKo = (y: string) => y === methodLabel('KO') || y === methodLabel('TKO');

export const ALBUM_SETS: SetDef[] = [
  { id: 'dunya', ad: () => L("Dünya Karması"), aciklama: () => L("6 farklı ülkeden dövüşçü"), hedef: 6, say: (k) => new Set(k.map((c) => c.uyruk)).size, ikon: 'earth' },
  { id: 'nakavt', ad: () => L("Nakavt Sanatı"), aciklama: () => L("Nakavtla yendiğin 8 dövüşçü"), hedef: 8, say: (k) => k.filter((c) => isKo(c.yontem)).length, ikon: 'flash' },
  { id: 'kilit', ad: () => L("Kilit Ustası"), aciklama: () => L("Submission ile yendiğin 5 dövüşçü"), hedef: 5, say: (k) => k.filter((c) => c.yontem === methodLabel('SUB')).length, ikon: 'lock' },
  { id: 'brezilya', ad: () => L("Brezilya Ekolü"), aciklama: () => L("4 Brezilyalı dövüşçü"), hedef: 4, say: ulkeSay(L("Brezilya")), ikon: 'flag' },
  { id: 'rus', ad: () => L("Rus Okulu"), aciklama: () => L("4 Rus dövüşçü"), hedef: 4, say: ulkeSay(L("Rusya")), ikon: 'flag' },
  { id: 'abd', ad: () => L("Amerikan Rüyası"), aciklama: () => L("4 Amerikalı dövüşçü"), hedef: 4, say: ulkeSay('ABD'), ikon: 'flag' },
  { id: 'rovans', ad: () => L("Rövanş Ustası"), aciklama: () => L("Aynı rakibi iki kez yendiğin 3 kart"), hedef: 3, say: (k) => k.filter((c) => c.sayi >= 2).length, ikon: 'repeat' },
  { id: 'altin', ad: () => L("Altın Çağ"), aciklama: () => L("Altın ya da efsane 8 kart"), hedef: 8, say: (k) => k.filter((c) => RARITY[c.nadir].sira >= 2).length, ikon: 'star' },
  { id: 'sampiyon', ad: () => L("Şampiyon Avcısı"), aciklama: () => L("3 şampiyon kartı"), hedef: 3, say: (k) => k.filter((c) => c.ozel === 'sampiyon').length, kozmetik: 'eld_avci', ikon: 'crown' },
  { id: 'parlak', ad: () => L("Parlak Kartlar"), aciklama: () => L("3 parlak kart"), hedef: 3, say: (k) => k.filter((c) => c.parlak).length, kozmetik: 'sort_parlak', ikon: 'shimmer' },
  { id: 'efsane', ad: () => L("Efsaneler"), aciklama: () => L("3 efsane kart"), hedef: 3, say: (k) => k.filter((c) => c.nadir === 'efsane').length, ikon: 'diamond-stone' },
];

export const setReward = (s: GameState, i: number) => Math.round((BASE[s.stage] * (1.5 + i * 0.3)) / 50) * 50;
export const setDone = (s: GameState, d: SetDef) => d.say(s.kartlar ?? []) >= d.hedef;
export const unclaimedSets = (s: GameState) => ALBUM_SETS.filter((d) => setDone(s, d) && !(s.albumSet ?? []).includes(d.id)).length;

export function claimSet(s: GameState, id: string) {
  const i = ALBUM_SETS.findIndex((d) => d.id === id);
  const d = ALBUM_SETS[i];
  if (!d || !setDone(s, d) || (s.albumSet ?? []).includes(id)) return;
  s.albumSet = [...(s.albumSet ?? []), id];
  const para = setReward(s, i);
  s.para += para;
  const koz = [d.kozmetik, s.albumSet.length >= 3 ? 'cer_koleksiyoncu' : undefined].filter((x): x is string => !!x && !(s.ozelKozmetik ?? []).includes(x));
  if (koz.length) s.ozelKozmetik = [...(s.ozelKozmetik ?? []), ...koz];
  s.haberler.unshift(L("🃏 Set tamamlandı: {0}! +${1}{2}", [d.ad(), para.toLocaleString(LOC), koz.length ? L(" ve dolaba yeni eşya") : '']));
}
