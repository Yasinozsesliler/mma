// Taraftar kulübü: takipçilerin bir kısmı resmi kulübe dönüşür. Üye sayısı arttıkça kulüp seviye atlar ve
// tribün marşı, koreografi, giriş şarkısı ve deplasman ordusu açılır (kozmetik: kafes girişinde görünür, güç vermez).
// Sadakat kazandıkça yükselir, kayıp ve ihmalle düşer; kulüp etkinlikleri her maç arası bir kez yapılabilir.
import { L, LOC } from '../i18n';
import { advanceWeeks, fullName } from './character';
import { followers } from './fame';
import { clamp } from './rng';
import { addPost } from './social';
import type { GameState } from './types';

export interface FanClub {
  ad: string;
  /** Takipçilerin kulübe üye olan oranı */
  oran: number;
  sadakat: number;
  /** Seçilen marş, koreografi ve giriş şarkısı (listelerdeki sıra) */
  mars?: number;
  koreo?: number;
  sarki?: number;
  /** Son etkinliğin yapıldığı dövüş sayısı */
  son?: number;
  kurulus: number;
}

export const FAN_MIN_FOLLOWERS = 3000;
export const LEVELS = [0, 500, 5000, 50000, 500000];
export const levelName = (n: number) => [L("Mahalle grubu"), L("Taraftar derneği"), L("Tribün grubu"), L("Ultras"), L("Taraftar ordusu")][n - 1];

export const members = (s: GameState) => (s.kulup ? Math.round(followers(s) * s.kulup.oran) : 0);
export function fanLevel(s: GameState) {
  const m = members(s);
  return LEVELS.filter((x) => m >= x).length;
}
export const nextLevelAt = (s: GameState) => LEVELS[fanLevel(s)];

/** Seviyeye göre açılan seçenekler */
export const UNLOCKS = { mars: 2, koreo: 3, sarki: 4, deplasman: 5 } as const;

export const CHANTS = () => [L("Yıkılmaz bu duvar!"), L("Kafes bizim, gece bizim!"), L("Bir daha, bir daha!"), L("Ayağa kalk, şampiyon!")];
export const CHOREOS = () => [L("Dev bayrak açılışı"), L("Kırmızı meşale şovu"), L("Tüm tribünde lakabının harfleri"), L("Altın konfeti yağmuru")];
export const SONGS = () => [L("Davul ve zurna"), L("Ağır rock riffi"), L("Sinematik orkestra"), L("Eski bir rap klasiği")];

export const canFoundClub = (s: GameState) => !s.kulup && s.stage !== 'amator' && followers(s) >= FAN_MIN_FOLLOWERS;
export const nameSuggestions = (s: GameState) => [
  L("{0} Ordusu", [s.fighter.lakap || s.fighter.soyad]),
  L("{0} Taraftarları", [s.fighter.soyad]),
  L("{0} Kartalları", [s.fighter.memleket || s.fighter.soyad]),
];

export function foundClub(s: GameState, ad: string): string {
  if (!canFoundClub(s)) return '';
  const name = ad.trim().slice(0, 32) || nameSuggestions(s)[0];
  s.kulup = { ad: name, oran: 0.01, sadakat: 60, kurulus: s.hafta };
  addPost(s, { yazar: name, kullanici: `@${name.toLocaleLowerCase(LOC).replace(/[^a-z0-9çğıöşü]/g, '')}`, tur: 'taraftar', metin: L("📣 Resmi taraftar kulübümüz kuruldu! {0} için tribünlerdeyiz. 💪", [fullName(s.fighter)]) });
  const m = L("📣 {0} kuruldu! {1} kurucu üye.", [name, members(s).toLocaleString(LOC)]);
  s.haberler.unshift(m);
  return m;
}

export function setFanChoice(s: GameState, key: 'mars' | 'koreo' | 'sarki', value: number) {
  if (!s.kulup || fanLevel(s) < UNLOCKS[key]) return;
  s.kulup[key] = value;
}

const COST: Record<GameState['stage'], number> = { amator: 300, bolgesel: 800, buyuk: 3000, ufc: 12000 };

export type FanActivity = 'gece' | 'antrenman' | 'cekilis' | 'roportaj';
export function activities(s: GameState) {
  const c = COST[s.stage];
  return [
    { key: 'gece' as const, ad: L("Kulüp gecesi düzenle"), aciklama: L("Yemek, fotoğraf, imza. Sadakat +8, üye artışı."), maliyet: c, icon: 'party-popper' },
    { key: 'antrenman' as const, ad: L("Açık antrenman"), aciklama: L("Taraftarlar salonda seni izler. 1 hafta sürer. Sadakat +5."), maliyet: 0, icon: 'whistle' },
    { key: 'cekilis' as const, ad: L("İmzalı eldiven çekilişi"), aciklama: L("Sosyal medyada patlar. Büyük üye artışı, sadakat +3."), maliyet: Math.round(c / 2), icon: 'gift' },
    { key: 'roportaj' as const, ad: L("Kulüp dergisine röportaj"), aciklama: L("Ücretsiz, sadakat +3."), maliyet: 0, icon: 'newspaper-variant' },
  ];
}
export const canActivity = (s: GameState) => !!s.kulup && s.kulup.son !== s.gecmis.length;

export function doActivity(s: GameState, key: FanActivity): string {
  const k = s.kulup;
  if (!k || !canActivity(s)) return '';
  const a = activities(s).find((x) => x.key === key)!;
  if (s.para < a.maliyet) return L("Bunun için paran yetmiyor.");
  s.para -= a.maliyet;
  k.son = s.gecmis.length;
  const before = members(s);
  const grow = (f: number, sad: number) => {
    k.oran = Math.min(0.08, k.oran * f);
    k.sadakat = clamp(k.sadakat + sad, 0, 100);
  };
  if (key === 'gece') grow(1.15, 8);
  else if (key === 'antrenman') {
    advanceWeeks(s, 1);
    grow(1.08, 5);
  } else if (key === 'cekilis') grow(1.22, 3);
  else grow(1.04, 3);
  const d = members(s) - before;
  const m = L("📣 {0}: {1} yeni üye, sadakat {2}/100.", [a.ad, `+${d.toLocaleString(LOC)}`, k.sadakat]);
  s.haberler.unshift(m);
  return m;
}

/** Dövüş sonrası: sonuç sadakati, sadakat de üye oranını etkiler. */
export function fanClubAfterFight(s: GameState, won: boolean, finish: boolean, koLoss: boolean, memleket: boolean): string[] {
  const k = s.kulup;
  if (!k) return [];
  const lvl0 = fanLevel(s);
  const dSad = won ? (finish ? 4 : 2) + (memleket ? 4 : 0) : koLoss ? -8 : -5;
  // İlgi zamanla söner: kulüp etkinlikleriyle beslenmezse sadakat ortalamaya döner
  k.sadakat = clamp(Math.round(k.sadakat + dSad - (k.sadakat - 40) * 0.2), 0, 100);
  k.oran = clamp(k.oran * (1 + (k.sadakat - 50) / 800) * (won ? 1.02 : 0.97), 0.003, 0.08);
  const lvl = fanLevel(s);
  if (lvl > lvl0) {
    const m = L("📣 {0} artık bir \"{1}\"! {2} üye.", [k.ad, levelName(lvl), members(s).toLocaleString(LOC)]);
    s.haberler.unshift(m);
    return [m];
  }
  if (k.sadakat < 25) return [L("📣 Taraftar kulübünde huzursuzluk: sadakat {0}/100. Üyeler kulübü terk ediyor.", [k.sadakat])];
  return [];
}

/** Kafes girişinde tribün (kozmetik). */
export function walkoutCrowd(s: GameState, away: boolean): { baslik: string; satirlar: string[]; soz: string } | null {
  const k = s.kulup;
  const lvl = fanLevel(s);
  if (!k || lvl < 2) return null;
  if (away && lvl < UNLOCKS.deplasman) return null;
  const satirlar = [L("{0} üye tribünde", [members(s).toLocaleString(LOC)])];
  const mars = k.mars != null ? CHANTS()[k.mars] : undefined;
  if (k.koreo != null) satirlar.push(`🎌 ${CHOREOS()[k.koreo]}`);
  if (mars) satirlar.push(`🎶 “${mars}”`);
  return { baslik: k.ad, satirlar: satirlar.slice(0, 2), soz: mars ? L("Tribünler inliyor: {0}", [mars]) : L("{0} tribünde!", [k.ad]) };
}
