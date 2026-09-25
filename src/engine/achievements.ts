// 100 başarım. Bazıları kolay, bazıları bir kariyer boyu sürer. 🏛 işaretliler Onur Listesi (Hall of Fame) eşikleridir.
import { MAX_LEVEL, weeklyBusinessIncome } from './economy';
import { readIstat } from './istat';
import { followers } from './fame';
import type { GameState, Istat } from './types';

export type AchCategory = 'dovus' | 'kemer' | 'kariyer' | 'servet' | 'yasam' | 'sohret';
export type AchTier = 'bronz' | 'gumus' | 'altin' | 'efsane';

export interface Achievement {
  id: string;
  ad: string;
  aciklama: string;
  ikon: string;
  kat: AchCategory;
  tier: AchTier;
  puan: number;
  /** Onur Listesi eşiği */
  hof?: boolean;
  /** Açılana kadar ??? görünür */
  gizli?: boolean;
  check: (s: GameState) => boolean;
  /** [şu an, hedef] */
  ilerleme?: (s: GameState) => [number, number];
}

export const CATEGORIES: { id: AchCategory; ad: string; ikon: string }[] = [
  { id: 'dovus', ad: 'DÖVÜŞ', ikon: 'boxing-glove' },
  { id: 'kemer', ad: 'KEMER', ikon: 'trophy' },
  { id: 'kariyer', ad: 'KARİYER', ikon: 'stairs-up' },
  { id: 'servet', ad: 'SERVET', ikon: 'cash-multiple' },
  { id: 'yasam', ad: 'YAŞAM', ikon: 'home-heart' },
  { id: 'sohret', ad: 'ŞÖHRET', ikon: 'star-shooting' },
];

export const TIERS: Record<AchTier, { ad: string; renk: string; puan: number }> = {
  bronz: { ad: 'BRONZ', renk: '#c9804a', puan: 5 },
  gumus: { ad: 'GÜMÜŞ', renk: '#b9c3cf', puan: 12 },
  altin: { ad: 'ALTIN', renk: '#f2c14e', puan: 25 },
  efsane: { ad: 'EFSANE', renk: '#b76cff', puan: 50 },
};

// ---------- Okuyucular ----------
const I = (s: GameState): Istat => readIstat(s);
const W = (s: GameState) => s.rekor.g;
const proFights = (s: GameState) => s.rekor.g + s.rekor.m + s.rekor.b;
const belts = (s: GameState) => s.kemerler ?? [];
const maxDef = (s: GameState) => Math.max(0, ...belts(s).map((b) => b.savunma));
const sumDef = (s: GameState) => belts(s).reduce((a, b) => a + b.savunma, 0);
const heldInOrg = (s: GameState) => {
  const m = new Map<string, number>();
  belts(s).filter((b) => b.aktif).forEach((b) => m.set(b.org, (m.get(b.org) ?? 0) + 1));
  return Math.max(0, ...m.values());
};
const inv = (s: GameState) => s.envanter ?? [];
const owned = (s: GameState, re: RegExp) => inv(s).filter((id) => re.test(id)).length;
const HOUSE = /^ev\d/;
const CAR = /^araba\d/;
const JEWEL = /^(saat\d?|zincir|kupe|yuzuk)$/;
const proOrgs = (s: GameState) => new Set(s.gecmis.filter((g) => g.org !== 'amator').map((g) => g.org)).size;
const minStat = (s: GameState) => Math.min(...Object.values(s.fighter.stats));
const maxStat = (s: GameState) => Math.max(...Object.values(s.fighter.stats));
const money = (s: GameState) => Math.max(s.para, I(s).maxPara);
const invest = (s: GameState) => (s.yatirimlar ?? []).reduce((a, y) => a + y.deger, 0);

type Def = Omit<Achievement, 'puan' | 'check' | 'ilerleme'> & { get?: (s: GameState) => number; hedef?: number; check?: (s: GameState) => boolean };

/** Sayaç tabanlı başarımlarda ilerleme çubuğu kendiliğinden oluşur. */
function a(d: Def): Achievement {
  const { get, hedef, ...rest } = d;
  return {
    ...rest,
    puan: TIERS[d.tier].puan,
    check: d.check ?? ((s) => get!(s) >= hedef!),
    ilerleme: get && hedef ? (s) => [Math.min(get(s), hedef), hedef] : undefined,
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  // ---------------- DÖVÜŞ (34) ----------------
  a({ id: 'amator_ilk', ad: 'İlk Kan', aciklama: 'İlk amatör galibiyetini al.', ikon: 'water', kat: 'dovus', tier: 'bronz', get: (s) => s.amator.g, hedef: 1 }),
  a({ id: 'amator10', ad: 'Amatör Kral', aciklama: '10 amatör galibiyet.', ikon: 'chess-king', kat: 'dovus', tier: 'gumus', get: (s) => s.amator.g, hedef: 10 }),
  a({ id: 'ilk_pro', ad: 'Profesyonel', aciklama: 'İlk profesyonel galibiyet.', ikon: 'hand-okay', kat: 'dovus', tier: 'bronz', get: W, hedef: 1 }),
  a({ id: 'ko1', ad: 'İlk Nakavt', aciklama: 'İlk profesyonel KO/TKO.', ikon: 'flash', kat: 'dovus', tier: 'bronz', get: (s) => s.rekor.ko, hedef: 1 }),
  a({ id: 'ko5', ad: 'Ağır Eller', aciklama: '5 profesyonel KO/TKO.', ikon: 'boxing-glove', kat: 'dovus', tier: 'gumus', get: (s) => s.rekor.ko, hedef: 5 }),
  a({ id: 'ko15', ad: 'Nakavt Sanatçısı', aciklama: '15 profesyonel KO/TKO.', ikon: 'fire', kat: 'dovus', tier: 'altin', get: (s) => s.rekor.ko, hedef: 15 }),
  a({ id: 'ko25', ad: 'Dinamit', aciklama: '25 profesyonel KO/TKO.', ikon: 'bomb', kat: 'dovus', tier: 'efsane', hof: true, get: (s) => s.rekor.ko, hedef: 25 }),
  a({ id: 'sub1', ad: 'İlk Kilit', aciklama: 'İlk submission galibiyeti.', ikon: 'lock-outline', kat: 'dovus', tier: 'bronz', get: (s) => s.rekor.sub, hedef: 1 }),
  a({ id: 'sub5', ad: 'Kilit Ustası', aciklama: '5 submission galibiyeti.', ikon: 'lock', kat: 'dovus', tier: 'gumus', get: (s) => s.rekor.sub, hedef: 5 }),
  a({ id: 'sub12', ad: 'Anakonda', aciklama: '12 submission galibiyeti.', ikon: 'snake', kat: 'dovus', tier: 'altin', get: (s) => s.rekor.sub, hedef: 12 }),
  a({ id: 'sub20', ad: 'Jiu-Jitsu Tanrısı', aciklama: '20 submission galibiyeti.', ikon: 'infinity', kat: 'dovus', tier: 'efsane', hof: true, get: (s) => s.rekor.sub, hedef: 20 }),
  a({ id: 'karar5', ad: 'Puan Makinesi', aciklama: '5 hakem kararı galibiyeti.', ikon: 'clipboard-check', kat: 'dovus', tier: 'bronz', get: (s) => s.rekor.karar, hedef: 5 }),
  a({ id: 'karar15', ad: 'Satranç Ustası', aciklama: '15 hakem kararı galibiyeti.', ikon: 'chess-knight', kat: 'dovus', tier: 'gumus', get: (s) => s.rekor.karar, hedef: 15 }),
  a({ id: 'r1_3', ad: 'Erken Paydos', aciklama: '3 kez ilk rauntta bitir.', ikon: 'timer-sand', kat: 'dovus', tier: 'gumus', get: (s) => I(s).r1, hedef: 3 }),
  a({ id: 'r1_10', ad: 'Bir Raunt Yeter', aciklama: '10 kez ilk rauntta bitir.', ikon: 'timer-off', kat: 'dovus', tier: 'efsane', hof: true, get: (s) => I(s).r1, hedef: 10 }),
  a({ id: 'seri3', ad: 'Isınma Turları', aciklama: '3 maçlık galibiyet serisi.', ikon: 'chevron-triple-up', kat: 'dovus', tier: 'bronz', get: (s) => I(s).enIyiSeri, hedef: 3 }),
  a({ id: 'seri5', ad: 'Durdurulamaz', aciklama: '5 maçlık galibiyet serisi.', ikon: 'trending-up', kat: 'dovus', tier: 'gumus', get: (s) => I(s).enIyiSeri, hedef: 5 }),
  a({ id: 'seri10', ad: 'Yenilmezlik Efsanesi', aciklama: '10 maçlık galibiyet serisi.', ikon: 'shield-star', kat: 'dovus', tier: 'altin', get: (s) => I(s).enIyiSeri, hedef: 10 }),
  a({ id: 'seri15', ad: 'Kusursuz Makine', aciklama: '15 maçlık galibiyet serisi.', ikon: 'robot-angry', kat: 'dovus', tier: 'efsane', hof: true, get: (s) => I(s).enIyiSeri, hedef: 15 }),
  a({ id: 'yenilmez', ad: 'Kusursuz Başlangıç', aciklama: 'Profesyonel kariyere 10-0 başla.', ikon: 'star-circle', kat: 'dovus', tier: 'altin', check: (s) => I(s).yenilmezZirve! >= 10 || (s.rekor.g >= 10 && s.rekor.m === 0) }),
  a({ id: 'yenilmez20', ad: 'Mükemmel', aciklama: 'Profesyonel kariyere 20-0 başla.', ikon: 'star-four-points-circle', kat: 'dovus', tier: 'efsane', hof: true, check: (s) => I(s).yenilmezZirve! >= 20 || (s.rekor.g >= 20 && s.rekor.m === 0) }),
  a({ id: 'donus1', ad: 'Geri Dönüş', aciklama: 'Puanda gerideyken maçı çevir.', ikon: 'backup-restore', kat: 'dovus', tier: 'gumus', get: (s) => I(s).donus, hedef: 1 }),
  a({ id: 'donus3', ad: 'Anka Kuşu', aciklama: '3 kez geriden gelip kazan.', ikon: 'bird', kat: 'dovus', tier: 'altin', get: (s) => I(s).donus, hedef: 3 }),
  a({ id: 'kd_kazan', ad: 'Kalk ve Savaş', aciklama: 'Yere düştüğün bir maçı kazan.', ikon: 'human-handsup', kat: 'dovus', tier: 'gumus', get: (s) => I(s).kdKalk, hedef: 1 }),
  a({ id: 'surpriz1', ad: 'Sürpriz!', aciklama: 'Favori bir rakibi yen.', ikon: 'alert-decagram', kat: 'dovus', tier: 'bronz', get: (s) => I(s).surpriz, hedef: 1 }),
  a({ id: 'surpriz5', ad: 'Dev Avcısı', aciklama: '5 favori rakibi yen.', ikon: 'sword', kat: 'dovus', tier: 'altin', get: (s) => I(s).surpriz, hedef: 5 }),
  a({ id: 'sonNefes', ad: 'Son Nefes', aciklama: 'Son rauntta bitirişle kazan.', ikon: 'lungs', kat: 'dovus', tier: 'gumus', get: (s) => I(s).sonNefes, hedef: 1 }),
  a({ id: 'maraton', ad: 'Maratoncu', aciklama: '5 rauntluk maçı kararla kazan.', ikon: 'run-fast', kat: 'dovus', tier: 'gumus', get: (s) => I(s).maraton, hedef: 1 }),
  a({ id: 'temiz', ad: 'Tek Çizik Yok', aciklama: 'Neredeyse hiç hasar almadan kazan.', ikon: 'shield-check-outline', kat: 'dovus', tier: 'gumus', get: (s) => I(s).temiz, hedef: 1 }),
  a({ id: 'inat', ad: 'Asla Tap Atma', aciklama: 'Kolun kopsa da pes etme.', ikon: 'arm-flex', kat: 'dovus', tier: 'bronz', gizli: true, get: (s) => I(s).inat, hedef: 1 }),
  a({ id: 'bitiris5', ad: 'Katil İçgüdüsü', aciklama: 'Üst üste 5 maçı bitirişle kazan.', ikon: 'skull', kat: 'dovus', tier: 'altin', get: (s) => I(s).enIyiBitirisSeri, hedef: 5 }),
  a({ id: 'bonus1', ad: 'Gecenin Yıldızı', aciklama: 'İlk performans bonusu.', ikon: 'star', kat: 'dovus', tier: 'bronz', get: (s) => I(s).bonus, hedef: 1 }),
  a({ id: 'bonus5', ad: 'Bonus Avcısı', aciklama: '5 performans bonusu.', ikon: 'star-plus', kat: 'dovus', tier: 'gumus', get: (s) => I(s).bonus, hedef: 5 }),
  a({ id: 'bonus10', ad: 'Şov Adamı', aciklama: '10 performans bonusu.', ikon: 'movie-open-star', kat: 'dovus', tier: 'altin', get: (s) => I(s).bonus, hedef: 10 }),

  // ---------------- KEMER (18) ----------------
  a({ id: 'kemer1', ad: 'Kemer Sahibi', aciklama: 'İlk şampiyonluk kemeri.', ikon: 'trophy', kat: 'kemer', tier: 'gumus', get: (s) => belts(s).length, hedef: 1 }),
  a({ id: 'kemer3', ad: 'Kemer Koleksiyoncusu', aciklama: 'Toplam 3 kemer kazan.', ikon: 'trophy-outline', kat: 'kemer', tier: 'altin', get: (s) => belts(s).length, hedef: 3 }),
  a({ id: 'cift', ad: 'Double Champ', aciklama: 'Aynı anda iki sıklette şampiyon ol.', ikon: 'trophy-variant', kat: 'kemer', tier: 'altin', hof: true, get: heldInOrg, hedef: 2 }),
  a({ id: 'triple', ad: 'Triple Champ', aciklama: 'Aynı anda üç sıklette şampiyon ol.', ikon: 'podium-gold', kat: 'kemer', tier: 'efsane', hof: true, get: heldInOrg, hedef: 3 }),
  a({ id: 'savunma1', ad: 'İlk Savunma', aciklama: 'Kemerini bir kez savun.', ikon: 'shield', kat: 'kemer', tier: 'gumus', get: maxDef, hedef: 1 }),
  a({ id: 'savunma3', ad: 'Tahtın Bekçisi', aciklama: 'Bir kemeri 3 kez savun.', ikon: 'shield-check', kat: 'kemer', tier: 'altin', get: maxDef, hedef: 3 }),
  a({ id: 'savunma5', ad: 'Hükümdar', aciklama: 'Bir kemeri 5 kez savun.', ikon: 'crown', kat: 'kemer', tier: 'altin', hof: true, get: maxDef, hedef: 5 }),
  a({ id: 'savunma10', ad: 'Ölümsüz Kral', aciklama: 'Bir kemeri 10 kez savun.', ikon: 'crown-circle', kat: 'kemer', tier: 'efsane', hof: true, get: maxDef, hedef: 10 }),
  a({ id: 'hanedan', ad: 'Hanedan', aciklama: 'Toplam 12 kemer savunması.', ikon: 'castle', kat: 'kemer', tier: 'efsane', get: sumDef, hedef: 12 }),
  a({ id: 'uc_org', ad: 'Gezgin Şampiyon', aciklama: 'Üç farklı organizasyonda kemer kazan.', ikon: 'earth', kat: 'kemer', tier: 'altin', get: (s) => new Set(belts(s).map((b) => b.org)).size, hedef: 3 }),
  a({ id: 'ufc_kemer', ad: 'UFC Şampiyonu', aciklama: 'UFC kemerini kazan.', ikon: 'trophy-award', kat: 'kemer', tier: 'efsane', hof: true, check: (s) => belts(s).some((b) => b.org === 'ufc') }),
  a({ id: 'yerel_kemer', ad: 'Yerel Kahraman', aciklama: 'Bölgesel bir organizasyonda kemer kazan.', ikon: 'map-marker-star', kat: 'kemer', tier: 'bronz', check: (s) => belts(s).some((b) => b.org === 'cfc' || b.org === 'oktagon') }),
  a({ id: 'buyuk_kemer', ad: 'Dünya Sahnesi', aciklama: 'PFL, ONE ya da MVP kemeri kazan.', ikon: 'earth-arrow-right', kat: 'kemer', tier: 'gumus', check: (s) => belts(s).some((b) => ['pfl', 'one', 'mvp'].includes(b.org)) }),
  a({ id: 'unvan5', ad: 'Büyük Maç Oyuncusu', aciklama: '5 unvan maçına çık.', ikon: 'spotlight-beam', kat: 'kemer', tier: 'altin', get: (s) => I(s).unvanMaci, hedef: 5 }),
  a({ id: 'kral_katili', ad: 'Kral Katili', aciklama: 'Bir şampiyonu yen.', ikon: 'sword-cross', kat: 'kemer', tier: 'gumus', get: (s) => I(s).sampiyonYen, hedef: 1 }),
  a({ id: 'tac_avcisi', ad: 'Taç Avcısı', aciklama: '3 farklı maçta şampiyon devir.', ikon: 'crown-outline', kat: 'kemer', tier: 'altin', get: (s) => I(s).sampiyonYen, hedef: 3 }),
  a({ id: 'siklet2', ad: 'Sıklet Gezgini', aciklama: 'İki farklı sıklette dövüş.', ikon: 'scale-balance', kat: 'kemer', tier: 'bronz', get: (s) => I(s).sikletler.length, hedef: 2 }),
  a({ id: 'siklet3', ad: 'Her Yerde Tehlike', aciklama: 'Üç farklı sıklette dövüş.', ikon: 'weight', kat: 'kemer', tier: 'gumus', get: (s) => I(s).sikletler.length, hedef: 3 }),

  // ---------------- KARİYER (18) ----------------
  a({ id: 'bolgesel', ad: 'Profesyonel Sahne', aciklama: 'Profesyonel kontrat imzala.', ikon: 'file-sign', kat: 'kariyer', tier: 'bronz', check: (s) => s.stage !== 'amator' }),
  a({ id: 'buyuk', ad: 'Büyük Lig', aciklama: 'Büyük bir organizasyona yüksel.', ikon: 'stadium', kat: 'kariyer', tier: 'gumus', check: (s) => s.stage === 'buyuk' || s.stage === 'ufc' }),
  a({ id: 'dwcs', ad: 'Dana’nın Seçimi', aciklama: 'UFC kontratı kazan.', ikon: 'ticket', kat: 'kariyer', tier: 'gumus', check: (s) => s.stage === 'ufc' || belts(s).some((b) => b.org === 'ufc') }),
  a({ id: 'dovus10', ad: 'Tecrübe', aciklama: '10 profesyonel dövüş.', ikon: 'numeric-10-box', kat: 'kariyer', tier: 'bronz', get: proFights, hedef: 10 }),
  a({ id: 'dovus25', ad: 'Kafes Tozu', aciklama: '25 profesyonel dövüş.', ikon: 'octagon', kat: 'kariyer', tier: 'gumus', get: proFights, hedef: 25 }),
  a({ id: 'dovus50', ad: 'Savaş Gazisi', aciklama: '50 profesyonel dövüş.', ikon: 'medal', kat: 'kariyer', tier: 'altin', get: proFights, hedef: 50 }),
  a({ id: 'dovus75', ad: 'Demir Adam', aciklama: '75 profesyonel dövüş.', ikon: 'anvil', kat: 'kariyer', tier: 'efsane', hof: true, get: proFights, hedef: 75 }),
  a({ id: 'galibiyet20', ad: 'Yirmilik', aciklama: '20 profesyonel galibiyet.', ikon: 'numeric-2-box', kat: 'kariyer', tier: 'gumus', get: W, hedef: 20 }),
  a({ id: 'otuz', ad: 'Otuzluk', aciklama: '30 profesyonel galibiyet.', ikon: 'numeric-3-box', kat: 'kariyer', tier: 'altin', get: W, hedef: 30 }),
  a({ id: 'galibiyet50', ad: 'Ellilik', aciklama: '50 profesyonel galibiyet.', ikon: 'numeric-5-box', kat: 'kariyer', tier: 'efsane', hof: true, get: W, hedef: 50 }),
  a({ id: 'veteran', ad: 'Yaşlı Kurt', aciklama: '38 yaşında hâlâ kazan.', ikon: 'account-clock', kat: 'kariyer', tier: 'gumus', check: (s) => s.fighter.yas >= 38 && s.gecmis[0]?.sonuc === 'G' && s.stage !== 'amator' }),
  a({ id: 'yas40', ad: 'Zamanı Durduran Adam', aciklama: '40 yaşında profesyonel galibiyet.', ikon: 'clock-star-four-points', kat: 'kariyer', tier: 'altin', gizli: true, check: (s) => s.fighter.yas >= 40 && s.gecmis[0]?.sonuc === 'G' && s.gecmis[0]?.org !== 'amator' }),
  a({ id: 'intikam', ad: 'İntikam', aciklama: 'Seni yenen bir rakibi rövanşta yen.', ikon: 'sword-cross', kat: 'kariyer', tier: 'gumus', check: (s) => s.rakipler.some((r) => r.karsilasma >= 2 && r.sonSonuc === 'G') || I(s).rovans! > 0 }),
  a({ id: 'dunya_turu', ad: 'Dünya Turu', aciklama: '4 farklı profesyonel organizasyonda dövüş.', ikon: 'airplane-takeoff', kat: 'kariyer', tier: 'gumus', get: proOrgs, hedef: 4 }),
  a({ id: 'temiz_sicil', ad: 'Temiz Sporcu', aciklama: 'Hiç doping cezası almadan 25 galibiyet.', ikon: 'check-decagram', kat: 'kariyer', tier: 'altin', hof: true, check: (s) => W(s) >= 25 && !s.dopingSayisi }),
  a({ id: 'silah', ad: 'Kusursuz Silah', aciklama: 'Bir istatistiği 95’e çıkar.', ikon: 'target', kat: 'kariyer', tier: 'altin', get: maxStat, hedef: 95 }),
  a({ id: 'tam_donanim', ad: 'Eksiksiz Dövüşçü', aciklama: 'Tüm istatistikler en az 75.', ikon: 'account-star', kat: 'kariyer', tier: 'efsane', hof: true, get: minStat, hedef: 75 }),
  a({ id: 'iq90', ad: 'Kafes Dehası', aciklama: 'IQ 90.', ikon: 'brain', kat: 'kariyer', tier: 'gumus', get: (s) => s.fighter.stats.iq, hedef: 90 }),

  // ---------------- SERVET (13) ----------------
  a({ id: 'ilk10k', ad: 'İlk Maaş', aciklama: '10.000$ biriktir.', ikon: 'cash', kat: 'servet', tier: 'bronz', get: money, hedef: 10_000 }),
  a({ id: 'yuzbin', ad: 'Altı Haneli', aciklama: '100.000$ biriktir.', ikon: 'cash-100', kat: 'servet', tier: 'bronz', get: money, hedef: 100_000 }),
  a({ id: 'milyoner', ad: 'Milyoner', aciklama: '1 milyon dolar biriktir.', ikon: 'cash-multiple', kat: 'servet', tier: 'gumus', get: money, hedef: 1_000_000 }),
  a({ id: 'onmilyon', ad: 'İmparator', aciklama: '10 milyon dolar biriktir.', ikon: 'diamond-stone', kat: 'servet', tier: 'altin', get: money, hedef: 10_000_000 }),
  a({ id: 'ellimilyon', ad: 'Dövüş Baronu', aciklama: '50 milyon dolar biriktir.', ikon: 'bank', kat: 'servet', tier: 'efsane', get: money, hedef: 50_000_000 }),
  a({ id: 'isletme1', ad: 'Girişimci', aciklama: 'İlk işletmeni aç.', ikon: 'storefront-outline', kat: 'servet', tier: 'bronz', get: (s) => (s.isletmeler ?? []).length, hedef: 1 }),
  a({ id: 'isletme5', ad: 'Holding', aciklama: '5 işletmeye sahip ol.', ikon: 'office-building', kat: 'servet', tier: 'altin', get: (s) => (s.isletmeler ?? []).length, hedef: 5 }),
  a({ id: 'isletme_max', ad: 'Zirvedeki Marka', aciklama: 'Bir işletmeyi en üst seviyeye çıkar.', ikon: 'chart-line', kat: 'servet', tier: 'gumus', get: (s) => Math.max(0, ...(s.isletmeler ?? []).map((b) => b.seviye)), hedef: MAX_LEVEL }),
  a({ id: 'patron', ad: 'Patron', aciklama: 'Haftada 20.000$ işletme geliri.', ikon: 'store', kat: 'servet', tier: 'altin', get: weeklyBusinessIncome, hedef: 20_000 }),
  a({ id: 'borsa', ad: 'Borsa Kurdu', aciklama: 'Yatırımlarının değeri 1 milyon doları geçsin.', ikon: 'finance', kat: 'servet', tier: 'altin', get: invest, hedef: 1_000_000 }),
  a({ id: 'sponsor3', ad: 'Vitrin', aciklama: 'Aynı anda 3 sponsor.', ikon: 'handshake', kat: 'servet', tier: 'gumus', get: (s) => (s.sponsorlar ?? []).length, hedef: 3 }),
  a({ id: 'kasa', ad: 'Kasa Her Zaman Kazanmaz', aciklama: 'Kumarhaneden net 100.000$ kârla çık.', ikon: 'slot-machine', kat: 'servet', tier: 'gumus', gizli: true, check: (s) => (s.kumar?.net ?? 0) >= 100_000 }),
  a({ id: 'kumarbaz', ad: 'Kumarbaz', aciklama: 'Kumarhanede net 250.000$ kaybet.', ikon: 'cards-playing', kat: 'servet', tier: 'bronz', gizli: true, check: (s) => (s.kumar?.net ?? 0) <= -250_000 }),

  // ---------------- YAŞAM (13) ----------------
  a({ id: 'ev1', ad: 'Kendi Evim', aciklama: 'Bir ev satın al.', ikon: 'home', kat: 'yasam', tier: 'bronz', get: (s) => owned(s, HOUSE), hedef: 1 }),
  a({ id: 'ev3', ad: 'Emlak Kralı', aciklama: '3 mülke sahip ol.', ikon: 'home-city', kat: 'yasam', tier: 'altin', get: (s) => owned(s, HOUSE), hedef: 3 }),
  a({ id: 'araba1', ad: 'İlk Araba', aciklama: 'Bir araba satın al.', ikon: 'car', kat: 'yasam', tier: 'bronz', get: (s) => owned(s, CAR), hedef: 1 }),
  a({ id: 'araba5', ad: 'Garaj Dolusu', aciklama: '5 arabaya sahip ol.', ikon: 'garage', kat: 'yasam', tier: 'altin', get: (s) => owned(s, CAR), hedef: 5 }),
  a({ id: 'saat3', ad: 'Parıltı', aciklama: '3 saat ya da mücevher.', ikon: 'watch', kat: 'yasam', tier: 'gumus', get: (s) => owned(s, JEWEL), hedef: 3 }),
  a({ id: 'jet', ad: 'Özel Uçuş', aciklama: 'Özel jet satın al.', ikon: 'airplane', kat: 'yasam', tier: 'altin', check: (s) => inv(s).includes('jet') }),
  a({ id: 'filo', ad: 'Kara, Deniz, Hava', aciklama: 'Araba, tekne ya da yat ve uçan bir araca sahip ol.', ikon: 'ferry', kat: 'yasam', tier: 'altin', check: (s) => owned(s, CAR) > 0 && (inv(s).includes('yat') || inv(s).includes('tekne')) && (inv(s).includes('jet') || inv(s).includes('heli')) }),
  a({ id: 'hayvan1', ad: 'Can Dostu', aciklama: 'Bir evcil hayvan sahiplen.', ikon: 'paw', kat: 'yasam', tier: 'bronz', get: (s) => (s.hayvanlar ?? []).length, hedef: 1 }),
  a({ id: 'hayvan3', ad: 'Mini Hayvanat Bahçesi', aciklama: '3 evcil hayvan.', ikon: 'dog-side', kat: 'yasam', tier: 'gumus', get: (s) => (s.hayvanlar ?? []).length, hedef: 3 }),
  a({ id: 'kadro4', ad: 'Profesyonel Ekip', aciklama: 'Kadronda 4 uzman olsun.', ikon: 'account-group', kat: 'yasam', tier: 'gumus', get: (s) => (s.kadro ?? []).length, hedef: 4 }),
  a({ id: 'tatil3', ad: 'Gezgin', aciklama: '3 kez tatile çık.', ikon: 'island', kat: 'yasam', tier: 'bronz', get: (s) => I(s).tatil, hedef: 3 }),
  a({ id: 'sevgili', ad: 'Aşk Kafeste Bitmez', aciklama: 'Bir sevgili edin.', ikon: 'heart', kat: 'yasam', tier: 'bronz', get: (s) => I(s).sevgili, hedef: 1 }),
  a({ id: 'eslesme10', ad: 'Kalp Kırıcı', aciklama: '10 eşleşme yakala.', ikon: 'heart-multiple', kat: 'yasam', tier: 'gumus', get: (s) => I(s).eslesme, hedef: 10 }),

  // ---------------- ŞÖHRET (4) ----------------
  a({ id: 'pop50', ad: 'Tanınan Yüz', aciklama: '50 bin takipçi.', ikon: 'account-eye', kat: 'sohret', tier: 'bronz', get: followers, hedef: 50_000 }),
  a({ id: 'pop80', ad: 'Yıldız', aciklama: '1 milyon takipçi.', ikon: 'star-face', kat: 'sohret', tier: 'gumus', get: followers, hedef: 1_000_000 }),
  a({ id: 'pop100', ad: 'Süperstar', aciklama: '10 milyon takipçi.', ikon: 'star-shooting', kat: 'sohret', tier: 'altin', get: followers, hedef: 10_000_000 }),
  a({ id: 'gonderi20', ad: 'İçerik Üreticisi', aciklama: 'Sosyal medyada 20 paylaşım yap.', ikon: 'cellphone-text', kat: 'sohret', tier: 'bronz', get: (s) => I(s).gonderi, hedef: 20 }),
];

// ---------- Onur Listesi (Hall of Fame) ----------

export const HOF_SCORE = 950;
export const HOF_PILLARS = 6;
export const HOF_ACHIEVEMENTS = ACHIEVEMENTS.filter((x) => x.hof);
