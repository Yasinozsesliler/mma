// Zorluk seviyeleri ve meydan okuma modları. Zorluk: rakip gücü, ücret ve sakatlık riski.
// Meydan okuma: özel kurallı kariyer; her dövüşten sonra hedef ve başarısızlık koşulu kontrol edilir.
import { L } from '../i18n';
import { followers } from './fame';
import type { Background, GameState, WeightClass } from './types';

export type Difficulty = 'kolay' | 'normal' | 'efsane';

export const DIFFICULTIES: Record<Difficulty, { ad: () => string; aciklama: () => string; rakip: number; ucret: number; sakatlik: number }> = {
  kolay: { ad: () => L("Kolay"), aciklama: () => L("Rakipler biraz zayıf, ücretler %20 fazla, sakatlık nadir."), rakip: -4, ucret: 1.2, sakatlik: 0.7 },
  normal: { ad: () => L("Normal"), aciklama: () => L("Oyunun dengeli hâli."), rakip: 0, ucret: 1, sakatlik: 1 },
  efsane: { ad: () => L("Efsane"), aciklama: () => L("Rakipler güçlü, ücretler %20 az, sakatlıklar sık. Gerçek bir sınav."), rakip: 4, ucret: 0.8, sakatlik: 1.4 },
};

export const diffOf = (s: GameState) => DIFFICULTIES[s.zorluk ?? 'normal'];

export type ChallengeId =
  | 'sonsans' | 'sokak' | 'demir' | 'yenilmez' | 'hizli'
  | 'genc' | 'nakavt' | 'kilit' | 'granit' | 'devler' | 'kucuk' | 'muay' | 'koleksiyon' | 'hukumdar'
  | 'seri' | 'megastar' | 'servet' | 'efsane' | 'olumsuz' | 'temiz';

export interface Challenge {
  id: ChallengeId;
  durum: 'devam' | 'basarili' | 'basarisiz';
}

/** Menüde gruplama ve zorluk yıldızı (1-3). */
export type ChallengeKat = 'baslangic' | 'stil' | 'kemer' | 'hayatta' | 'sohret';
export const CHALLENGE_KAT: Record<ChallengeKat, { ad: () => string; icon: string; renk: string }> = {
  baslangic: { ad: () => L("Özel başlangıç"), icon: 'account-star', renk: '#f2c14e' },
  stil: { ad: () => L("Dövüş stili"), icon: 'karate', renk: '#e63946' },
  kemer: { ad: () => L("Kemer avı"), icon: 'trophy', renk: '#ffb02e' },
  hayatta: { ad: () => L("Tek hata yok"), icon: 'shield-alert', renk: '#8b5cf6' },
  sohret: { ad: () => L("Şöhret ve servet"), icon: 'star-shooting', renk: '#3ecf7a' },
};

type ChallengeDef = {
  ad: () => string;
  aciklama: () => string;
  icon: string;
  kat: ChallengeKat;
  zor: 1 | 2 | 3;
  yas?: number;
  gecmis?: Background;
  /** Zorunlu sıklet (erkek / kadın kariyeri için) */
  siklet?: { e: WeightClass; k: WeightClass };
  /** Zorunlu zorluk seviyesi */
  zorluk?: Difficulty;
};

export const CHALLENGES: Record<ChallengeId, ChallengeDef> = {
  sonsans: { ad: () => L("Son Şans"), aciklama: () => L("35 yaşında başla. Emekli olmadan bir kemer kazan."), icon: 'timer-sand', kat: 'baslangic', zor: 2, yas: 35 },
  genc: { ad: () => L("Harika Çocuk"), aciklama: () => L("18 yaşında başla. 26 yaşına girmeden bir kemer kazan."), icon: 'baby-face-outline', kat: 'baslangic', zor: 3, yas: 18 },
  sokak: { ad: () => L("Sokaktan Zirveye"), aciklama: () => L("Sokak dövüşçüsü olarak başla. 25 profesyonel maç içinde UCC'ye gir."), icon: 'road-variant', kat: 'baslangic', zor: 2, gecmis: 'sokak' },
  efsane: { ad: () => L("Gerçek Sınav"), aciklama: () => L("Efsane zorlukta başla. UCC şampiyonu ol."), icon: 'skull', kat: 'baslangic', zor: 3, zorluk: 'efsane' },
  nakavt: { ad: () => L("Nakavt Kralı"), aciklama: () => L("8 nakavt galibiyetine ulaş. Hakem kararıyla 3 kez kazanırsan biter."), icon: 'flash', kat: 'stil', zor: 3 },
  kilit: { ad: () => L("Kilit Ustası"), aciklama: () => L("30 profesyonel maç içinde 5 submission galibiyeti al."), icon: 'lock', kat: 'stil', zor: 2 },
  muay: { ad: () => L("Sekiz Uzuv"), aciklama: () => L("Muay thai ile başla. 6 nakavtla UCC'ye gir."), icon: 'shoe-print', kat: 'stil', zor: 2, gecmis: 'muaythai' },
  devler: { ad: () => L("Devler Arasında"), aciklama: () => L("En ağır sıklette başla. UCC şampiyonu ol."), icon: 'weight-lifter', kat: 'stil', zor: 2, siklet: { e: 'agir', k: 'tuy' } },
  kucuk: { ad: () => L("Küçük Dev"), aciklama: () => L("Sinek sıklette başla. UCC şampiyonu ol."), icon: 'feather', kat: 'stil', zor: 2, siklet: { e: 'sinek', k: 'sinek' } },
  koleksiyon: { ad: () => L("Kemer Koleksiyoncusu"), aciklama: () => L("İki farklı organizasyonun kemerini kazan."), icon: 'trophy-variant', kat: 'kemer', zor: 2 },
  hukumdar: { ad: () => L("Hükümdar"), aciklama: () => L("Bir kemeri üst üste 5 kez savun."), icon: 'crown', kat: 'kemer', zor: 3 },
  hizli: { ad: () => L("Hızlı Yükseliş"), aciklama: () => L("Toplam 40 maç içinde UCC şampiyonu ol."), icon: 'rocket-launch', kat: 'kemer', zor: 2 },
  olumsuz: { ad: () => L("Ölümsüz"), aciklama: () => L("Onur Listesi'ne (Hall of Fame) gir."), icon: 'pillar', kat: 'kemer', zor: 3 },
  demir: { ad: () => L("Demir Adam"), aciklama: () => L("İlk nakavt yenilgin kariyerini bitirir. UCC şampiyonu ol."), icon: 'shield-alert', kat: 'hayatta', zor: 3 },
  yenilmez: { ad: () => L("Yenilmez"), aciklama: () => L("İlk profesyonel mağlubiyet kariyerini bitirir. 7-0'a ulaş."), icon: 'infinity', kat: 'hayatta', zor: 2 },
  granit: { ad: () => L("Granit Çene"), aciklama: () => L("Hiç nakavt olmadan 20 profesyonel maça çık."), icon: 'shield-check', kat: 'hayatta', zor: 2 },
  temiz: { ad: () => L("Temiz Sayfa"), aciklama: () => L("Amatörlükte hiç kaybetmeden profesyonelliğe geç."), icon: 'file-check-outline', kat: 'hayatta', zor: 1 },
  seri: { ad: () => L("Durdurulamaz"), aciklama: () => L("Profesyonelde üst üste 12 galibiyet al."), icon: 'fire', kat: 'hayatta', zor: 3 },
  megastar: { ad: () => L("Megastar"), aciklama: () => L("10 milyon takipçiye ulaş ve UCC'de dövüş."), icon: 'star-shooting', kat: 'sohret', zor: 2 },
  servet: { ad: () => L("Servet"), aciklama: () => L("36 yaşına girmeden 10 milyon dolar biriktir."), icon: 'cash-multiple', kat: 'sohret', zor: 2 },
};

/** Sıklet zorunluluğu oyuncunun cinsiyetine göre. */
export const challengeWeight = (id: ChallengeId | null | undefined, kadin?: boolean) => {
  const w = id ? CHALLENGES[id].siklet : undefined;
  return w ? (kadin ? w.k : w.e) : undefined;
};

const proFights = (s: GameState) => s.rekor.g + s.rekor.m + s.rekor.b;
const total = (s: GameState) => proFights(s) + s.amator.g + s.amator.m + s.amator.b;
const uccChamp = (s: GameState) => (s.kemerler ?? []).some((b) => b.org === 'ufc');

/** Dövüş sonrası meydan okuma kontrolü. Kariyeri bitiren başarısızlıklarda emeklilik. */
/** Profesyonel maçlarda baştan itibaren kesintisiz galibiyet sayısı (en yeni maç önde). */
const proStreak = (s: GameState) => {
  let n = 0;
  for (const h of s.gecmis) {
    if (h.org === 'amator') continue;
    if (h.sonuc !== 'G') break;
    n++;
  }
  return n;
};

/** method: maçın bitiş yöntemi (KO, TKO, SUB, UD…). */
export function challengeCheck(s: GameState, won: boolean, koLoss: boolean, method?: string): string[] {
  const m = s.meydan;
  if (!m || m.durum !== 'devam') return [];
  const ad = CHALLENGES[m.id].ad();
  let ok = false;
  let fail = false;
  let biter = false;
  switch (m.id) {
    case 'sonsans':
      ok = (s.kemerler ?? []).length > 0;
      break;
    case 'sokak':
      ok = s.stage === 'ufc';
      fail = !ok && proFights(s) >= 25;
      break;
    case 'demir':
      ok = uccChamp(s);
      fail = koLoss;
      biter = koLoss;
      break;
    case 'yenilmez':
      ok = s.rekor.g >= 7 && s.rekor.m === 0;
      fail = s.rekor.m > 0;
      biter = fail;
      break;
    case 'hizli':
      ok = uccChamp(s);
      fail = !ok && total(s) >= 40;
      break;
    case 'genc':
      ok = (s.kemerler ?? []).length > 0;
      fail = !ok && s.fighter.yas >= 26;
      break;
    case 'efsane':
      ok = uccChamp(s);
      break;
    case 'nakavt': {
      // Profesyonelde hakem kararıyla gelen 3. galibiyet kuralı bozar
      fail = s.rekor.karar >= 3 && s.rekor.ko < 8;
      ok = !fail && s.rekor.ko >= 8;
      break;
    }
    case 'kilit':
      ok = s.rekor.sub >= 5;
      fail = !ok && proFights(s) >= 30;
      break;
    case 'muay':
      ok = s.stage === 'ufc' && s.rekor.ko >= 6;
      fail = !ok && proFights(s) >= 30;
      break;
    case 'devler':
    case 'kucuk':
      ok = uccChamp(s);
      break;
    case 'koleksiyon':
      ok = new Set((s.kemerler ?? []).map((b) => b.org)).size >= 2;
      break;
    case 'hukumdar':
      ok = (s.kemerler ?? []).some((b) => b.savunma >= 5);
      break;
    case 'olumsuz':
      ok = !!s.hof;
      break;
    case 'granit':
      fail = koLoss;
      ok = !fail && proFights(s) >= 20;
      break;
    case 'temiz':
      fail = s.amator.m > 0;
      ok = !fail && s.stage !== 'amator';
      break;
    case 'seri':
      ok = proStreak(s) >= 12;
      break;
    case 'megastar':
      ok = followers(s) >= 10_000_000 && s.stage === 'ufc';
      break;
    case 'servet':
      ok = s.para >= 10_000_000;
      fail = !ok && s.fighter.yas >= 36;
      break;
  }
  if (ok) {
    m.durum = 'basarili';
    s.haberler.unshift(L("🏅 MEYDAN OKUMA TAMAMLANDI: {0}!", [ad]));
    return [L("🏅 MEYDAN OKUMA TAMAMLANDI: {0}! Ana menüde rozetin parlıyor.", [ad])];
  }
  if (fail) {
    m.durum = 'basarisiz';
    s.haberler.unshift(L("💔 Meydan okuma başarısız: {0}.", [ad]));
    if (biter) s.meydanBitti = true;
    return [biter ? L("💔 {0} sona erdi: kural bozuldu, kariyer burada bitiyor.", [ad]) : L("💔 Meydan okuma başarısız: {0}. Kariyerine normal devam edebilirsin.", [ad])];
  }
  return [];
}

/** Yaş sınırına gelindiyse "Son Şans" kaybedilir (emeklilikte çağrılır). */
export function challengeOnRetire(s: GameState) {
  const m = s.meydan;
  if (!m || m.durum !== 'devam') return;
  // Emeklilikte gelen Onur Listesi de sayılır
  m.durum = m.id === 'olumsuz' && s.hof ? 'basarili' : 'basarisiz';
}
