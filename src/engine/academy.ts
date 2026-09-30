// Kendi salonun: üyelerden gelir, yetiştirdiğin öğrenciler ve onların köşesinde durduğun maçlar.
// Profesyonel olunca açılır; salon büyüdükçe daha çok üye, daha çok öğrenci, daha hızlı gelişim.
import { L, LOC } from '../i18n';
import { growthMultiplier, statAverage } from './character';
import { BACKGROUNDS, baseStatsFor, COUNTRIES, femSurname, NAME_POOLS, NICKNAMES, WEIGHT_CLASSES } from './data';
import { PLANS } from './fight';
import { chance, clamp, noise, pick, rand, randInt, shuffle, uid, weighted } from './rng';
import type { Background, GameState, PlanKey, Stats, StatKey, WeightClass } from './types';
import { STAT_KEYS, STAT_LABELS } from './types';

export type Tier = 'amator' | 'bolgesel' | 'buyuk' | 'ucc';

export interface BoutState {
  rakip: { ad: string; soyad: string; lakap: string; uyruk: string; kadin?: boolean; stil: Background; stats: Stats; rekor: { g: number; m: number } };
  /** Maçın açıldığı hafta: BEKLEME hafta içinde köşeye gelinmezse ekip köşede durur. */
  hafta: number;
  /** Plan seçilince 1. raunt bir kez oynanır; köşe kararı bu duruma göre verilir. */
  r1?: RoundOne;
}

export interface RoundOne {
  plan: PlanKey;
  edge: number;
  onde: boolean;
  dogru: CornerCall;
  uyum: boolean;
  metin: string;
}

export interface Student {
  id: string;
  ad: string;
  soyad: string;
  lakap: string;
  uyruk: string;
  kadin?: boolean;
  stil: Background;
  siklet: WeightClass;
  yas: number;
  /** Salona katıldığı yaş (yaş buradan hesaplanır) */
  yas0: number;
  stats: Stats;
  /** Ulaşabileceği en yüksek güç ortalaması */
  potansiyel: number;
  rekor: { g: number; m: number; b: number };
  seviye: Tier;
  /** Bulunduğu ligdeki galibiyet ve mağlubiyetler (terfi için) */
  lig?: { g: number; m: number };
  moral: number;
  /** Sıradaki maçın haftası */
  macHafta: number;
  mac?: BoutState;
  katilis: number;
  sampiyon?: boolean;
}

export interface GymResult {
  hafta: number;
  ogrenci: string;
  rakip: string;
  kazandi: boolean;
  yontem: string;
  kose: boolean;
}

export interface Gym {
  ad: string;
  seviye: number;
  un: number;
  uye: number;
  acilis: number;
  ogrenciler: Student[];
  adaylar?: { hafta: number; list: Student[] };
  sonuclar: GymResult[];
  /** Salonun toplam kazancı (aidat + maç payları − kira) */
  kasa: number;
  /** Sıralamaya giren / UCC'ye çıkan / şampiyon olan öğrenci sayıları */
  uccSayisi?: number;
  sampiyonSayisi?: number;
}

export const GYM_LEVELS = [
  { ad: L("Garaj salonu"), maliyet: 25_000, kapasite: 2, maxUye: 60, kira: 350, gelisim: 1 },
  { ad: L("Mahalle salonu"), maliyet: 60_000, kapasite: 3, maxUye: 120, kira: 900, gelisim: 1.15 },
  { ad: L("Profesyonel akademi"), maliyet: 150_000, kapasite: 4, maxUye: 300, kira: 2_000, gelisim: 1.3 },
  { ad: L("Elit merkez"), maliyet: 350_000, kapasite: 5, maxUye: 700, kira: 4_500, gelisim: 1.45 },
  { ad: L("Efsane akademisi"), maliyet: 800_000, kapasite: 6, maxUye: 1_200, kira: 9_000, gelisim: 1.6 },
];

export const AIDAT = 20;

export const TIERS: Record<Tier, { ad: string; seviye: number; kese: number; aralik: [number, number] }> = {
  amator: { ad: L("Amatör"), seviye: 30, kese: 0, aralik: [4, 6] },
  bolgesel: { ad: L("Bölgesel"), seviye: 44, kese: 3_000, aralik: [6, 9] },
  buyuk: { ad: L("Büyük organizasyon"), seviye: 57, kese: 12_000, aralik: [8, 11] },
  ucc: { ad: 'UCC', seviye: 69, kese: 60_000, aralik: [10, 14] },
};

/** Köşeye gelinmezse maçın ekiple oynanacağı süre (hafta). Kamp sırasında süre işlemez. */
export const BEKLEME = 4;

/** Menajerlik payı: öğrencinin maç ücretinden salona düşen oran. */
export const PAY = 0.1;

const $ = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;
const TIER_ORDER: Tier[] = ['amator', 'bolgesel', 'buyuk', 'ucc'];

export const gymLevel = (g: Gym) => GYM_LEVELS[g.seviye - 1];
export const canOpenGym = (s: GameState) => s.stage !== 'amator';
export const power = (st: Stats) => Math.round(statAverage(st));

export function weeklyGymNet(g: Gym) {
  return g.uye * AIDAT - gymLevel(g).kira;
}

/** Salonun adı: lakap ya da soyadla. */
export function gymName(s: GameState) {
  const f = s.fighter;
  return L("{0} Dövüş Akademisi", [f.lakap || f.soyad]);
}

export function openGym(s: GameState) {
  if (s.salon || !canOpenGym(s) || s.para < GYM_LEVELS[0].maliyet) return;
  s.para -= GYM_LEVELS[0].maliyet;
  s.salon = { ad: gymName(s), seviye: 1, un: 15 + Math.round(s.populerlik / 5), uye: 20, acilis: s.hafta, ogrenciler: [], sonuclar: [], kasa: 0 };
  refreshCandidates(s, true);
  s.haberler.unshift(L("🏠 {0} kapılarını açtı! İlk üyeler kayıt oldu.", [s.salon.ad]));
}

export function upgradeGym(s: GameState) {
  const g = s.salon;
  if (!g || g.seviye >= GYM_LEVELS.length) return;
  const next = GYM_LEVELS[g.seviye];
  if (s.para < next.maliyet) return;
  s.para -= next.maliyet;
  g.seviye++;
  g.un = clamp(g.un + 5, 0, 100);
  s.haberler.unshift(L("🏗️ Salon büyüdü: artık bir {0}.", [next.ad]));
}

// ---------- Öğrenci üretimi ----------

const STYLES: [Background, number][] = [
  ['boks', 3],
  ['muaythai', 3],
  ['kickboks', 2],
  ['gures', 3],
  ['judo', 1],
  ['bjj', 3],
  ['sambo', 1],
  ['kyokushin', 1],
  ['sokak', 2],
];

function namePool(s: GameState) {
  // Salonun yarısı memleketten gelir.
  const home = COUNTRIES[s.fighter.uyruk]?.ad;
  const local = NAME_POOLS.find((p) => p.ulke === home || (s.fighter.uyruk === 'us' && p.ulke === 'ABD'));
  return local && chance(0.5) ? local : pick(NAME_POOLS);
}

function makeStudent(s: GameState): Student {
  const g = s.salon!;
  const pool = namePool(s);
  const kadin = chance(0.3);
  const ad = pick(kadin ? pool.kadin : pool.ad);
  const soyad = kadin && pool.slav ? femSurname(pick(pool.soyad)) : pick(pool.soyad);
  const stil = weighted(STYLES);
  const level = 26 + rand() * 10 + g.seviye * 1.5;
  const stats = baseStatsFor(stil, level);
  STAT_KEYS.forEach((k) => (stats[k] = Math.round(clamp(stats[k] + noise(3), 8, 70))));
  // Ünlü, büyük salona daha yetenekli gençler gelir.
  const potansiyel = Math.round(clamp(52 + g.un * 0.12 + g.seviye * 2.5 + noise(7), 48, 90));
  const siklets = Object.keys(WEIGHT_CLASSES) as WeightClass[];
  const yas = randInt(18, 23);
  return {
    id: uid(),
    ad,
    soyad,
    lakap: pick(NICKNAMES),
    uyruk: pool.ulke,
    kadin: kadin || undefined,
    stil,
    siklet: pick(kadin ? siklets.slice(0, 4) : siklets),
    yas,
    yas0: yas,
    stats,
    potansiyel,
    rekor: { g: 0, m: 0, b: 0 },
    seviye: 'amator',
    moral: 70,
    macHafta: 0,
    katilis: 0,
  };
}

/** Yetenek avı: her 8 haftada 3 yeni aday. */
export function refreshCandidates(s: GameState, force = false) {
  const g = s.salon;
  if (!g) return;
  if (!force && g.adaylar && s.hafta - g.adaylar.hafta < 8) return;
  g.adaylar = { hafta: s.hafta, list: [makeStudent(s), makeStudent(s), makeStudent(s)] };
}

/** Aday için kayıt ücreti (yetenekli olan pahalı). */
export const signCost = (st: Student) => Math.round((st.potansiyel - 40) * 60 / 50) * 50;

/** Potansiyel yıldızı (1-5): kesin sayı gizli, hoca gözüyle tahmin. */
export const potStars = (st: Student) => clamp(Math.round((st.potansiyel - 45) / 9), 1, 5);

export function signStudent(s: GameState, id: string) {
  const g = s.salon;
  const st = g?.adaylar?.list.find((x) => x.id === id);
  if (!g || !st || g.ogrenciler.length >= gymLevel(g).kapasite) return;
  const cost = signCost(st);
  if (s.para < cost) return;
  s.para -= cost;
  g.adaylar!.list = g.adaylar!.list.filter((x) => x.id !== id);
  st.katilis = s.hafta;
  st.yas0 = st.yas;
  st.macHafta = s.hafta + randInt(3, 5);
  g.ogrenciler.push(st);
  s.haberler.unshift(L("✍️ {0} {1} salonuna katıldı.", [st.ad, st.soyad]));
}

export function releaseStudent(s: GameState, id: string) {
  const g = s.salon;
  if (!g) return;
  const st = g.ogrenciler.find((x) => x.id === id);
  g.ogrenciler = g.ogrenciler.filter((x) => x.id !== id);
  if (st) s.haberler.unshift(L("👋 {0} {1} ile yollarınızı ayırdınız.", [st.ad, st.soyad]));
}

// ---------- Maçlar ----------

function makeBout(s: GameState, st: Student): BoutState {
  const pool = pick(NAME_POOLS);
  const stil = weighted(STYLES);
  // Adil eşleşme: rakip öğrencinin seviyesine yakın, ligin seviyesine doğru çekilir.
  const level = TIERS[st.seviye].seviye * 0.35 + (power(st.stats) + 4) * 0.65 + noise(3);
  const stats = baseStatsFor(stil, level);
  STAT_KEYS.forEach((k) => (stats[k] = Math.round(clamp(stats[k] + noise(4), 8, 96))));
  const tecrube = { amator: 2, bolgesel: 6, buyuk: 11, ucc: 16 }[st.seviye];
  return {
    hafta: s.hafta,
    rakip: {
      ad: pick(st.kadin ? pool.kadin : pool.ad),
      soyad: st.kadin && pool.slav ? femSurname(pick(pool.soyad)) : pick(pool.soyad),
      lakap: pick(NICKNAMES),
      uyruk: pool.ulke,
      kadin: st.kadin,
      stil,
      stats,
      rekor: { g: randInt(Math.max(0, tecrube - 3), tecrube + 3), m: randInt(0, Math.ceil(tecrube / 3)) },
    },
  };
}

export const weakOf = (st: Stats): StatKey => STAT_KEYS.reduce((a, b) => (st[b] < st[a] ? b : a));
export const strongOf = (st: Stats): StatKey => STAT_KEYS.reduce((a, b) => (st[b] > st[a] ? b : a));

/** Maç öncesi üç plan: biri rakibin zaafına oturur, ikisi değil. Sıra karışık. */
export function boutPlans(b: BoutState): PlanKey[] {
  const weak = weakOf(b.rakip.stats);
  const all = Object.keys(PLANS) as PlanKey[];
  const good = all.filter((p) => PLANS[p].hedef.includes(weak));
  const bad = all.filter((p) => !PLANS[p].hedef.includes(weak));
  const pickGood = good.length ? pick(good) : pick(all);
  return shuffle([pickGood, ...shuffle(bad.filter((p) => p !== pickGood)).slice(0, 2)]);
}

export type CornerCall = 'bas' | 'sakin' | 'indir';

export const CORNER_CALLS: Record<CornerCall, { ad: string; aciklama: string; ikon: string }> = {
  bas: { ad: L("Baskıyı artır"), aciklama: L("Geride kaldıysan riski göze al."), ikon: 'fire' },
  sakin: { ad: L("Sakin kal, puan topla"), aciklama: L("Öndeysen hata yapma."), ikon: 'shield-check' },
  indir: { ad: L("Yere götür"), aciklama: L("Rakip yerde zayıfsa oyunu değiştir."), ikon: 'arrow-collapse-down' },
};

/** 1. raunt nasıl geçti? Maç açılınca bir kez hesaplanır ve köşe kararı için ipucu verir. */
function roundOne(st: Student, b: BoutState, plan: PlanKey): RoundOne {
  const uyum = PLANS[plan].hedef.includes(weakOf(b.rakip.stats));
  const edge = power(st.stats) - power(b.rakip.stats) + (uyum ? 3 : -1) + (st.moral - 50) / 15 + noise(4);
  const onde = edge >= 0;
  const yerZayif = ['yer', 'gures'].includes(weakOf(b.rakip.stats));
  const dogru: CornerCall = !onde ? (yerZayif ? 'indir' : 'bas') : 'sakin';
  const o = b.rakip.soyad;
  const metin = onde
    ? uyum
      ? L("1. raunt: plan işliyor. {0} rakibinin zaafına yükleniyor, raundu açık ara aldı.", [st.soyad])
      : L("1. raunt: {0} raundu önde kapattı ama {1} hâlâ tehlikeli.", [st.soyad, o])
    : yerZayif
      ? L("1. raunt: {0} ayakta zorlandı. Ama {1} takedown'larda bocalıyor gibi.", [st.soyad, o])
      : L("1. raunt: {0} geride. {1} ritmi ele geçirdi, bir şeyler değişmeli.", [st.soyad, o]);
  return { plan, edge, onde, dogru, uyum, metin };
}

/** Köşeye geçildi, plan seçildi: 1. raunt oynanır. */
export function startBout(s: GameState, id: string, plan: PlanKey) {
  const st = s.salon?.ogrenciler.find((x) => x.id === id);
  if (!st?.mac || st.mac.r1) return;
  st.mac.r1 = roundOne(st, st.mac, plan);
}

export interface BoutOutcome {
  kazandi: boolean;
  yontem: string;
  satirlar: string[];
  kese: number;
  un: number;
  terfi?: string;
}

/** Maçı bitirir. Talimat yoksa ekip köşede durur (plan rastgele, köşe bonusu yok). */
export function finishBout(s: GameState, id: string, call: CornerCall | null): BoutOutcome | null {
  const g = s.salon;
  const st = g?.ogrenciler.find((x) => x.id === id);
  if (!g || !st?.mac) return null;
  const b = st.mac;
  const kose = !!b.r1 && !!call;
  const r1 = b.r1 ?? roundOne(st, b, pick(Object.keys(PLANS) as PlanKey[]));
  const dogruKose = call === r1.dogru;
  const edge = r1.edge + (kose ? (dogruKose ? 4 : -2) : 0) + noise(3);
  const pWin = 1 / (1 + Math.exp(-edge / 6));
  const kazandi = rand() < pWin;
  const W = kazandi ? st : b.rakip;
  const Lo = kazandi ? b.rakip : st;
  const fark = Math.abs(power(W.stats) - power(Lo.stats)) + Math.abs(edge) / 2;
  const grappler = ['gures', 'bjj', 'judo', 'sambo'].includes(W.stil);
  const finish = chance(clamp(0.25 + fark / 40, 0.2, 0.7));
  const yontem = !finish ? L("Karar") : grappler && chance(0.6) ? L("Submission") : chance(0.5) ? 'KO' : 'TKO';
  const raunt = finish ? (call === 'bas' && kazandi ? 2 : randInt(2, 3)) : 3;
  const satirlar = [r1.metin];
  if (kose) satirlar.push(dogruKose ? L("🗣️ Köşeden doğru talimat: {0}. {1} anında uyguladı.", [CORNER_CALLS[call!].ad, st.soyad]) : L("🗣️ Talimat: {0}. Ama maçın gidişatına uymadı.", [CORNER_CALLS[call!].ad]));
  else satirlar.push(L("🧢 Sen yoktun; köşede ekip durdu."));
  satirlar.push(
    kazandi
      ? finish
        ? L("🏆 {0}. rauntta {1}! {2} {3} kazandı.", [raunt, yontem, st.ad, st.soyad])
        : L("🏆 Hakem kararı: {0} {1} kazandı.", [st.ad, st.soyad])
      : finish
        ? L("❌ {0}. rauntta {1}. {2} bu gece kaybetti.", [raunt, yontem, st.soyad])
        : L("❌ Hakem kararı rakipten yana. {0} kaybetti.", [st.soyad]),
  );

  // Sonuçlar
  const t = TIERS[st.seviye];
  const kese = t.kese * (kazandi ? 2 : 1);
  const pay = Math.round(kese * PAY);
  s.para += pay;
  g.kasa += pay;
  let un = kazandi ? (finish ? 3 : 2) + TIER_ORDER.indexOf(st.seviye) : -1;
  if (kazandi) st.rekor.g++;
  else st.rekor.m++;
  st.lig = { g: (st.lig?.g ?? 0) + (kazandi ? 1 : 0), m: (st.lig?.m ?? 0) + (kazandi ? 0 : 1) };
  st.moral = clamp(st.moral + (kazandi ? 10 : -12) + (kose ? 6 : -4), 0, 100);
  // Maç tecrübesi: kazanan da kaybeden de biraz gelişir.
  STAT_KEYS.forEach((k) => chance(0.3) && (st.stats[k] = Math.min(99, st.stats[k] + 1)));
  st.mac = undefined;
  st.macHafta = s.hafta + randInt(...t.aralik);

  // Terfi
  let terfi: string | undefined;
  const pw = power(st.stats);
  const next = TIER_ORDER[TIER_ORDER.indexOf(st.seviye) + 1] as Tier | undefined;
  const lg = st.lig;
  // Terfi: ligde yeterli galibiyet, galibiyetlerin mağlubiyetleri açıkça geçmesi ve gereken güç.
  const hazir =
    next &&
    ((st.seviye === 'amator' && lg.g >= 4 && lg.g >= lg.m * 2) ||
      (st.seviye === 'bolgesel' && lg.g >= 5 && lg.g >= lg.m * 2 && pw >= 50) ||
      (st.seviye === 'buyuk' && lg.g >= 6 && lg.g >= lg.m * 2 && pw >= 63));
  if (kazandi && hazir && next) {
    st.seviye = next;
    st.lig = { g: 0, m: 0 };
    un += next === 'ucc' ? 15 : 5;
    terfi =
      next === 'ucc'
        ? L("🚀 {0} {1} UCC ile sözleşme imzaladı! Salonun adı artık her yerde.", [st.ad, st.soyad])
        : L("📈 {0} {1} artık {2} seviyesinde dövüşecek.", [st.ad, st.soyad, TIERS[next].ad]);
    if (next === 'ucc') g.uccSayisi = (g.uccSayisi ?? 0) + 1;
  }
  if (kazandi && st.seviye === 'ucc' && !st.sampiyon && lg.g >= 5 && pw >= 74 && chance(0.35)) {
    st.sampiyon = true;
    un += 25;
    g.sampiyonSayisi = (g.sampiyonSayisi ?? 0) + 1;
    terfi = L("👑 {0} {1} UCC {2} şampiyonu oldu! Senin öğrencin!", [st.ad, st.soyad, WEIGHT_CLASSES[st.siklet].ad]);
  }
  g.un = clamp(g.un + un, 0, 100);
  if (terfi) {
    satirlar.push(terfi);
    s.haberler.unshift(terfi);
  }
  if (pay > 0) satirlar.push(L("💵 Menajerlik payı: +{0}", [$(pay)]));
  g.sonuclar = [{ hafta: s.hafta, ogrenci: `${st.ad} ${st.soyad}`, rakip: `${b.rakip.ad} ${b.rakip.soyad}`, kazandi, yontem, kose }, ...g.sonuclar].slice(0, 20);
  return { kazandi, yontem, satirlar, kese: pay, un, terfi };
}

// ---------- Haftalık tik ----------

export function gymTick(s: GameState, weeks: number): string[] {
  const g = s.salon;
  if (!g) return [];
  const notes: string[] = [];
  const lv = gymLevel(g);
  let net = 0;
  for (let w = 0; w < weeks; w++) {
    // Üyeler: salonun ünü ve senin şöhretin çeker.
    const hedef = lv.maxUye * clamp(0.2 + g.un / 150 + s.populerlik / 400, 0.1, 1);
    g.uye = Math.max(0, Math.round(g.uye + (hedef - g.uye) * 0.12 + noise(1)));
    net += g.uye * AIDAT - lv.kira;
    // Ün yavaşça 20'ye doğru döner.
    g.un = clamp(g.un + (g.un > 20 ? -0.15 : 0.1), 0, 100);
    g.ogrenciler.forEach((st) => {
      // Salonda antrenman: potansiyeline kadar gelişir.
      const gap = st.potansiyel - statAverage(st.stats);
      if (gap > 0) {
        const hiz = 0.18 * lv.gelisim * growthMultiplier(st.yas) * (0.6 + st.moral / 125);
        STAT_KEYS.forEach((k) => {
          if (chance(hiz * clamp(gap / 12, 0.25, 1))) st.stats[k] = Math.min(99, st.stats[k] + 1);
        });
      }
      st.yas = (st.yas0 ?? st.yas) + Math.floor((s.hafta - st.katilis) / 52);
      if (!st.mac && s.hafta >= st.macHafta) {
        st.mac = makeBout(s, st);
        notes.push(L("🥊 Öğrencin {0} {1} dövüşüyor: rakip {2}. Köşesinde dur!", [st.ad, st.soyad, st.mac.rakip.soyad]));
      }
    });
  }
  g.un = Math.round(g.un * 10) / 10;
  s.para += net;
  g.kasa += net;
  if (net !== 0) notes.push(L("🏠 Salon: {0}{1} ({2} üye)", [net > 0 ? '+' : '-', $(Math.abs(net)), g.uye]));

  // Köşeye gelinmeyen maçlar BEKLEME hafta sonra ekiple oynanır; kamptayken (salona gidemezken) beklerler.
  if (s.phase === 'kamp') g.ogrenciler.forEach((st) => st.mac && (st.mac.hafta += weeks));
  g.ogrenciler.filter((st) => st.mac && s.hafta - st.mac.hafta >= BEKLEME).forEach((st) => {
    const r = finishBout(s, st.id, null);
    if (r) notes.push(L("🧢 {0} köşende sen yokken dövüştü: {1}.", [st.soyad, r.kazandi ? L("kazandı") : L("kaybetti")]));
  });
  // Morali dibe vuran ya da yaşlanan öğrenci ayrılır.
  g.ogrenciler = g.ogrenciler.filter((st) => {
    if (st.moral < 15 && !st.mac) {
      g.un = clamp(g.un - 3, 0, 100);
      notes.push(L("🚪 {0} {1} moral bozukluğuyla başka salona geçti.", [st.ad, st.soyad]));
      return false;
    }
    if (st.yas >= 35) {
      notes.push(L("🎖️ {0} {1} eldivenlerini astı. Rekor: {2}-{3}.", [st.ad, st.soyad, st.rekor.g, st.rekor.m]));
      return false;
    }
    return true;
  });
  refreshCandidates(s);
  return notes;
}

/** Köşesi bekleyen maç sayısı (ana ekran rozeti). */
export const pendingBouts = (s: GameState) => (s.salon?.ogrenciler ?? []).filter((x) => x.mac).length;

export function describeStyle(st: { stil: Background; stats: Stats }) {
  return L("{0} · Güçlü: {1} · Zayıf: {2}", [BACKGROUNDS[st.stil].ad, STAT_LABELS[strongOf(st.stats)], STAT_LABELS[weakOf(st.stats)]]);
}
