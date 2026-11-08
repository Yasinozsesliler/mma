// Kendi salonun: üyelerden gelir, yetiştirdiğin öğrenciler ve onların köşesinde durduğun maçlar.
// Profesyonel olunca açılır; salon büyüdükçe daha çok üye, daha çok öğrenci, daha hızlı gelişim.
import { L, LOC } from '../i18n';
import { growthMultiplier, statAverage } from './character';
import { followers } from './fame';
import { GYMS } from './gyms';
import { BACKGROUNDS, baseStatsFor, COUNTRIES, femSurname, NAME_POOLS, NICKNAMES, WEIGHT_CLASSES } from './data';
import { PLANS } from './fight';
import { chance, clamp, noise, pick, rand, randInt, shuffle, uid, weighted } from './rng';
import { noteCoachBout } from './coachMode';
import { callBonus, doctorChance, edgeBonus, finishBonus, growthMod, moraleMod, payMod, prospectBonus, rivalChance, scoutBonus, staminaBonus, titleBonus, type CampKey } from './coachDepth';
import type { Background, GameState, PlanKey, Stats, StatKey, WeightClass } from './types';
import { STAT_KEYS, STAT_LABELS } from './types';

export type Tier = 'amator' | 'bolgesel' | 'buyuk' | 'ucc';

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
  /** Köşe talimatlarına nasıl uyduğu (eski kayıtlarda kimlikten türetilir) */
  karakter?: Temper;
  /** Kısa süreli maç teklifini kabul etti: sıradaki maç iki kat ücretli */
  kisaSure?: boolean;
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
  /** Rakip salonların puanları (isimler gyms.ts'ten) ve bilinen son sıran */
  rakipler?: { id: string; puan: number }[];
  sira?: number;
  /** Ulaşılan en iyi sıra (eşik haberleri bir kez çıksın) */
  enIyiSira?: number;
  /** Öğrencilerin toplam galibiyeti ve köşede senin durduğun galibiyetler (başarımlar için) */
  galibiyet?: number;
  koseG?: number;
}

export interface RankRow {
  id: string;
  ad: string;
  ulke: string;
  puan: number;
  sen?: boolean;
}

export const GYM_LEVELS = [
  { ad: L("Garaj salonu"), maliyet: 150_000, kapasite: 2, maxUye: 100, kira: 1_500, gelisim: 1 },
  { ad: L("Mahalle salonu"), maliyet: 300_000, kapasite: 3, maxUye: 220, kira: 3_000, gelisim: 1.15 },
  { ad: L("Profesyonel akademi"), maliyet: 600_000, kapasite: 4, maxUye: 450, kira: 6_000, gelisim: 1.3 },
  { ad: L("Elit merkez"), maliyet: 1_200_000, kapasite: 5, maxUye: 800, kira: 11_000, gelisim: 1.45 },
  { ad: L("Efsane akademisi"), maliyet: 2_500_000, kapasite: 6, maxUye: 1_200, kira: 18_000, gelisim: 1.6 },
];

export const AIDAT = 50;

/** Salon açma şartları: büyük organizasyon ya da UCC ve yeterli şöhret. */
export const GYM_MIN_FOLLOWERS = 50_000;

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
/** Antrenör Modu becerisi (normal kariyerde 0). */
const skill = (s: GameState, k: import('./coachMode').CoachSkill) => s.antrenor?.beceri[k] ?? 0;
export const gymStageOk = (s: GameState) => s.stage === 'buyuk' || s.stage === 'ufc';
export const canOpenGym = (s: GameState) => gymStageOk(s) && followers(s) >= GYM_MIN_FOLLOWERS;
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
  s.salon = { ad: gymName(s), seviye: 1, un: 15 + Math.round(s.populerlik / 5), uye: 30, acilis: s.hafta, ogrenciler: [], sonuclar: [], kasa: 0 };
  refreshCandidates(s, true);
  ensureRivals(s.salon);
  s.salon.sira = gymRanking(s).sira;
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

// ---------- Salon sıralaması ----------

/** Dünya çapındaki elit salonların ülkesi (bayrak/ülke adı için). */
const ELITE_COUNTRY: Record<string, string> = { 'elit-summit': 'us', 'elit-kaspiyelit': 'ru', 'elit-tiger': '', 'elit-altitude': 'us', 'elit-atos': 'br' };

const RIVAL_GYMS = GYMS.filter((x) => x.kalite >= 4);
const rivalBase = (kalite: number) => kalite * kalite * 20;

/** Rakip salonlar ilk açılışta (ya da eski kayıtta ilk haftada) kurulur. */
function ensureRivals(g: Gym) {
  if (g.rakipler?.length) return;
  g.rakipler = RIVAL_GYMS.map((x) => ({ id: x.id, puan: Math.round(rivalBase(x.kalite) + noise(x.kalite * 8)) }));
}

/** Salon puanı: ün, seviye, üyeler, son maçlardaki galibiyetler, UCC'ye çıkan öğrenciler ve şampiyonlar. */
export function gymScore(g: Gym) {
  const wins = g.sonuclar.filter((r) => r.kazandi).length;
  return Math.round(g.un * 8 + g.seviye * 80 + g.uye / 5 + wins * 6 + (g.uccSayisi ?? 0) * 150 + (g.sampiyonSayisi ?? 0) * 300);
}

/** Tüm salonlar puana göre sıralı; oyuncunun salonu `sen` ile işaretli. */
export function gymRanking(s: GameState): { rows: RankRow[]; sira: number } {
  const g = s.salon;
  if (!g) return { rows: [], sira: 0 };
  const rivals = g.rakipler?.length ? g.rakipler : RIVAL_GYMS.map((x) => ({ id: x.id, puan: rivalBase(x.kalite) }));
  const rows: RankRow[] = rivals.map((r) => {
    const def = GYMS.find((x) => x.id === r.id);
    const code = def ? (def.ulke === 'elit' ? ELITE_COUNTRY[def.id] ?? '' : def.ulke) : '';
    return { id: r.id, ad: def?.salon ?? r.id, ulke: COUNTRIES[code]?.ad ?? (r.id === 'elit-tiger' ? L("Tayland") : L("Dünya")), puan: r.puan };
  });
  rows.push({ id: 'sen', ad: g.ad, ulke: COUNTRIES[s.fighter.uyruk]?.ad ?? '', puan: gymScore(g), sen: true });
  rows.sort((a, b) => b.puan - a.puan);
  return { rows, sira: rows.findIndex((r) => r.sen) + 1 };
}

// Küçükten büyüğe: tek seferde birden çok eşik aşılırsa en iyisi duyurulur.
const RANK_MILESTONES = [1, 3, 5, 10, 20];

function rankTick(s: GameState, weeks: number): string[] {
  const g = s.salon!;
  ensureRivals(g);
  for (let w = 0; w < weeks; w++)
    g.rakipler!.forEach((r) => {
      const def = RIVAL_GYMS.find((x) => x.id === r.id);
      const base = def ? rivalBase(def.kalite) : r.puan;
      // Rakipler kendi seviyeleri etrafında dalgalanır: iyi ve kötü sezonlar.
      r.puan = Math.max(50, Math.round(r.puan + (base - r.puan) * 0.03 + noise(base * 0.012)));
    });
  const { sira } = gymRanking(s);
  const once = g.enIyiSira ?? g.sira ?? sira;
  g.sira = sira;
  g.enIyiSira = Math.min(once, sira);
  const m = RANK_MILESTONES.find((x) => sira <= x && once > x);
  if (!m) return [];
  return [
    sira === 1
      ? L("🥇 {0} dünyanın 1 numaralı salonu oldu!", [g.ad])
      : L("📈 {0} artık dünyanın en iyi {1} salonu arasında ({2}. sıra).", [g.ad, m, sira]),
  ];
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
  const potansiyel = Math.round(clamp(52 + g.un * 0.12 + g.seviye * 2.5 + skill(s, 'gozcu') * 3 + prospectBonus(s) + noise(7), 48, 92));
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
    karakter: pick(TEMPER_KEYS),
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
export const signCost = (st: Student) => Math.round(((st.potansiyel - 40) * 600) / 500) * 500;

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
  const tip = oppTipFor(stil);
  const rakipHoca = chance(rivalChance(s));
  return {
    hafta: s.hafta,
    ...(rakipHoca ? { rakipHoca } : {}),
    tip,
    tipRapor: scoutTip(s, tip),
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

// ---------- Köşe: raunt raunt ----------
// Maç raunt raunt oynanır. Her raunt arası durum değişir (kim önde, kim yorgun, kesik, sarsılma, rakibin
// eğilimi) ve köşeye o duruma göre 4 talimat gelir. Doğru talimat tek değildir: öğrencinin karakteri, rakibin
// gizli eğilimi ve kondisyon da işin içinde. Aynı rakip tipi bile farklı rauntlarda farklı cevap ister.

export type CornerCall = 'bas' | 'sakin' | 'indir' | 'kalk' | 'govde' | 'bacak' | 'kontra' | 'nefes' | 'bitir' | 'kesik';

export const CORNER_CALLS: Record<CornerCall, { ad: string; aciklama: string; ikon: string }> = {
  bas: { ad: L("Baskıyı artır"), aciklama: L("Üstüne yürü, ritmi sen belirle. Nefes götürür."), ikon: 'fire' },
  sakin: { ad: L("Sakin kal, puan topla"), aciklama: L("Temiz vuruş, iyi savunma. Hata yapma."), ikon: 'shield-check' },
  indir: { ad: L("Yere götür"), aciklama: L("Takedown'a git, oyunu yere taşı."), ikon: 'arrow-collapse-down' },
  kalk: { ad: L("Ayakta kal, kalçayı kaçır"), aciklama: L("Takedown'ları savun, sırtını kafese verme."), ikon: 'arrow-expand-up' },
  govde: { ad: L("Gövdeye çalış"), aciklama: L("Karaciğer ve kaburga: nefesini kes, elleri düşsün."), ikon: 'target' },
  bacak: { ad: L("Ön bacağa tekme"), aciklama: L("Hareketini öldür, ayağını sök."), ikon: 'shoe-sneaker' },
  kontra: { ad: L("Bekle, kontra at"), aciklama: L("Onun gelmesine izin ver, açığını yakala."), ikon: 'shield-sword' },
  nefes: { ad: L("Tempoyu düşür, nefeslen"), aciklama: L("Bu raundu idareli geçir, sonrasına güç sakla."), ikon: 'lungs' },
  bitir: { ad: L("Şimdi bitir!"), aciklama: L("Sarsıldıysa üstüne çullan. Değilse pahalıya patlar."), ikon: 'lightning-bolt' },
  kesik: { ad: L("Kesiği kapat"), aciklama: L("Cutman'e öncelik ver: doktor maçı durdurmasın."), ikon: 'bandage' },
};

/** Rakibin gizli eğilimi: keşif raporunda (her zaman doğru olmayan) bir ipucu olarak görünür. */
export type OppTip = 'baskici' | 'kontraci' | 'guresci' | 'dayanikli' | 'vurucu';
export const OPP_TIPS: Record<OppTip, () => string> = {
  baskici: () => L("Erken baskıcı: ilk rauntta yüklenir, sonra düşer."),
  kontraci: () => L("Kontracı: üstüne gelinmesini bekler, açığı cezalandırır."),
  guresci: () => L("Güreşçi: indirmeye ve kafes kenarında boğmaya çalışır."),
  dayanikli: () => L("Geç açılan: yavaş başlar, son rauntlarda güçlenir."),
  vurucu: () => L("Ağır el: az atar ama tek vuruşla maçı bitirebilir."),
};

/** Öğrencinin karakteri talimatlara nasıl uyduğunu belirler. */
export type Temper = 'dinleyen' | 'inatci' | 'sinirli' | 'sakin';
export const TEMPERS: Record<Temper, { ad: () => string; aciklama: () => string }> = {
  dinleyen: { ad: () => L("Söz dinler"), aciklama: () => L("Talimatları harfiyen uygular.") },
  inatci: { ad: () => L("İnatçı"), aciklama: () => L("Bazen köşeyi duymaz, kendi bildiğini yapar.") },
  sinirli: { ad: () => L("Sinirli"), aciklama: () => L("Baskı ve bitiriş talimatlarında coşar, sabırda zorlanır.") },
  sakin: { ad: () => L("Soğukkanlı"), aciklama: () => L("Sabırlı oyunda ustadır, çılgın baskıda bocalar.") },
};
const TEMPER_KEYS = Object.keys(TEMPERS) as Temper[];
/** Eski kayıtlardaki öğrencilerin karakteri kimliklerinden türetilir. */
export const temperOf = (st: Pick<Student, 'id' | 'karakter'>): Temper => st.karakter ?? TEMPER_KEYS[[...st.id].reduce((a, c) => a + c.charCodeAt(0), 0) % TEMPER_KEYS.length];

export type Situation = 'onde' | 'geride' | 'yakin' | 'onde_yorgun' | 'rakip_yorgun' | 'kesik' | 'sarsildi' | 'rakip_sarsildi' | 'yerde' | 'rakip_ayak' | 'rakip_govde';

export interface BoutState {
  rakip: { ad: string; soyad: string; lakap: string; uyruk: string; kadin?: boolean; stil: Background; stats: Stats; rekor: { g: number; m: number } };
  /** Maçın açıldığı hafta: BEKLEME hafta içinde köşeye gelinmezse ekip köşede durur. */
  hafta: number;
  /** Rakibin gerçek eğilimi ve keşif raporunun söylediği (yanlış olabilir) */
  tip?: OppTip;
  tipRapor?: OppTip;
  /** Raunt raunt maç durumu (plan seçilince başlar) */
  kose?: CornerState;
  /** Eski kayıtlar: tek raunt + tek talimat düzeni */
  r1?: RoundOne;
  /** Antrenör Modu: seçilen maç kampı ve rakibin ezeli rakip hocanın öğrencisi olması */
  kamp?: CampKey;
  rakipHoca?: boolean;
}

export interface CornerState {
  plan: PlanKey;
  uyum: boolean;
  toplam: number;
  /** Raunt sonuçları: + öğrenci aldı, − rakip aldı */
  rauntlar: number[];
  sag: number;
  hasar: number;
  rSag: number;
  rHasar: number;
  durum: Situation;
  metin: string;
  secenek: CornerCall[];
  /** Verilen talimatlar ve uyulup uyulmadığı */
  talimat: { c: CornerCall; iyi: boolean; duymadi?: boolean }[];
  /** Yeni rauntta "kesik kapatılmadı" riski */
  kesikAcik?: boolean;
  /** 1. rauntta bitiş olduysa */
  bitis?: { kazandi: boolean; yontem: string; raunt: number };
  /** Son oynanan rauntun kafes sahnesi satırları (Antrenör Modu köşe ekranı) */
  anim?: string[];
}

export interface RoundOne {
  plan: PlanKey;
  edge: number;
  onde: boolean;
  dogru: CornerCall;
  uyum: boolean;
  metin: string;
}

const OPP_TIP_KEYS = Object.keys(OPP_TIPS) as OppTip[];

function oppTipFor(stil: Background): OppTip {
  if (['gures', 'sambo', 'judo', 'bjj'].includes(stil)) return chance(0.6) ? 'guresci' : pick(OPP_TIP_KEYS);
  if (['boks', 'kyokushin'].includes(stil)) return chance(0.4) ? 'vurucu' : pick(OPP_TIP_KEYS);
  return pick(OPP_TIP_KEYS);
}

/** Keşif raporu: salon seviyesi ve gözcülük arttıkça rakibin eğilimi daha doğru okunur. */
function scoutTip(s: GameState, tip: OppTip): OppTip {
  const ok = 0.55 + (s.salon?.seviye ?? 1) * 0.06 + skill(s, 'gozcu') * 0.1 + scoutBonus(s);
  return chance(ok) ? tip : pick(OPP_TIP_KEYS.filter((x) => x !== tip));
}

const T = (arr: string[]) => pick(arr);

function roundLine(st: Student, o: string, e: number, n: number): string {
  const s = st.soyad;
  if (e > 4) return T([L("{0}. raunt: {1} raundu açık ara aldı.", [n, s]), L("{0}. raunt: {1} her yerde üstündü, {2} cevap bulamadı.", [n, s, o]), L("{0}. raunt: kartlar net, raundu {1} aldı.", [n, s])]);
  if (e > 0) return T([L("{0}. raunt: çekişmeli ama son saniyelerde {1} öne geçti.", [n, s]), L("{0}. raunt: kıl payı, muhtemelen {1} aldı.", [n, s]), L("{0}. raunt: {1} biraz daha temizdi.", [n, s])]);
  if (e > -4) return T([L("{0}. raunt: yakın geçti, {1} biraz daha aktifti.", [n, o]), L("{0}. raunt: kartlarda {1} önde olabilir.", [n, o]), L("{0}. raunt: {1} raundu çaldı gibi.", [n, o])]);
  return T([L("{0}. raunt: {1} raundu domine etti.", [n, o]), L("{0}. raunt: zor raunt, {1} sürekli geri adım attı.", [n, s]), L("{0}. raunt: {1} ritmi tamamen ele geçirdi.", [n, o])]);
}

const SIT_LINES: Record<Situation, (s: string, o: string) => string[]> = {
  onde: (s, o) => [L("{0} önde. {1} çaresizleşmeye başladı.", [s, o]), L("Kartlarda öndeyiz. Şimdi akıllı olmak lazım.")],
  geride: (s, o) => [L("{0} geride. Bir şeyler değişmeli.", [s]), L("{0} ritmi buldu; böyle giderse kaybederiz.", [o])],
  yakin: (s, o) => [L("Başa baş gidiyor. Bu raunt maçı belirleyebilir."), L("{0} ile {1} arasında kılı kırk yaran bir maç.", [s, o])],
  onde_yorgun: (s) => [L("{0} önde ama nefes nefese. Ağzı açık, elleri düşük.", [s]), L("Puanda öndeyiz ama {0} nefesini kaybediyor.", [s])],
  rakip_yorgun: (s, o) => [L("{0} yoruldu: elleri düşüyor, ağzından nefes alıyor.", [o]), L("{0} bacaklarını zor taşıyor. Fırsat kapıda.", [o])],
  kesik: (s) => [L("Kesik var: {0} kaşından kanıyor, doktor köşeye bakıyor.", [s]), L("Kesik kötü: {0} sağ gözünü zor görüyor.", [s])],
  sarsildi: (s) => [L("{0} sarsıldı, bacakları titriyor. Köşeye zor geldi.", [s]), L("Son yumrukla {0} sallandı. Gözleri dalgın.", [s])],
  rakip_sarsildi: (s, o) => [L("{0} sarsıldı! Köşesine sendeleyerek gitti.", [o]), L("{0} ayakta zor duruyor, gözleri kaydı.", [o])],
  yerde: (s, o) => [L("{0} indirip kafese dayıyor; {1} altta eziliyor.", [o, s]), L("Raundun yarısı yerde geçti, {0} üstte kontrol etti.", [o])],
  rakip_ayak: (s, o) => [L("{0} ön bacağına basamıyor, topallıyor.", [o]), L("Tekmeler işledi: {0} artık rahat basamıyor.", [o])],
  rakip_govde: (s, o) => [L("Gövdeye gelen her vuruşta {0} eğiliyor, dirsekleri iniyor.", [o]), L("{0} karaciğerini korumak için elleri indiriyor.", [o])],
};

/** Durumun anahtar talimatı (seçeneklerde mutlaka bulunur) ve ikinci iyi seçenek. */
const SIT_KEY: Record<Situation, CornerCall[]> = {
  onde: ['sakin', 'kontra'],
  geride: ['bas', 'indir'],
  yakin: ['govde', 'bacak'],
  onde_yorgun: ['nefes', 'sakin'],
  rakip_yorgun: ['bas', 'govde'],
  kesik: ['kesik', 'sakin'],
  sarsildi: ['nefes', 'kalk'],
  rakip_sarsildi: ['bitir', 'bas'],
  yerde: ['kalk', 'kontra'],
  rakip_ayak: ['bacak', 'bas'],
  rakip_govde: ['govde', 'bitir'],
};

interface CallCtx {
  durum: Situation;
  tip: OppTip;
  raunt: number;
  toplam: number;
  onde: boolean;
  sag: number;
  rHasar: number;
  yerZayif: boolean;
  temper: Temper;
}

/** Talimatın bu raunda katkısı (raunt avantajına eklenir). */
function callValue(c: CornerCall, x: CallCtx): number {
  let v = SIT_KEY[x.durum][0] === c ? 4.5 : SIT_KEY[x.durum][1] === c ? 2 : 0;
  switch (c) {
    case 'bas':
      v += x.onde ? -0.5 : 1;
      if (x.tip === 'kontraci') v -= 2.5;
      if (x.tip === 'baskici' && x.raunt >= 3) v += 1.5;
      if (x.sag < 35) v -= 2;
      break;
    case 'sakin':
      v += x.onde ? 1 : -1.5;
      if (x.tip === 'vurucu') v += 1;
      break;
    case 'indir':
      v += x.yerZayif ? 2.5 : -1;
      if (x.tip === 'guresci') v -= 2;
      break;
    case 'kalk':
      v += x.tip === 'guresci' ? 2 : -0.5;
      break;
    case 'govde':
      v += x.tip === 'baskici' || x.tip === 'dayanikli' ? 1 : 0.5;
      break;
    case 'bacak':
      v += x.tip === 'kontraci' ? 1.5 : 0.3;
      break;
    case 'kontra':
      v += x.tip === 'baskici' ? 2.5 : x.tip === 'kontraci' ? -2 : 0;
      break;
    case 'nefes':
      v += x.sag < 45 ? 1.5 : -1.5;
      if (x.raunt >= x.toplam) v -= 1;
      break;
    case 'bitir':
      v += x.rHasar >= 45 ? 2 : -2.5;
      break;
    case 'kesik':
      v += x.durum === 'kesik' ? 0 : -1;
      break;
  }
  // Karakter: sinirli baskıda coşar, sabırda zorlanır; soğukkanlı tersi
  const aggro = c === 'bas' || c === 'bitir';
  const calm = c === 'sakin' || c === 'kontra' || c === 'nefes';
  if (x.temper === 'sinirli') v += aggro ? 1 : calm ? -1 : 0;
  if (x.temper === 'sakin') v += calm ? 1 : aggro ? -1 : 0;
  if (x.temper === 'dinleyen') v *= 1.2;
  return v;
}

function situationOf(k: CornerState, edge: number, tip: OppTip, b: BoutState): Situation {
  const lead = k.rauntlar.reduce((a, r) => a + Math.sign(r), 0);
  if (k.hasar > 25 && chance(0.12)) return 'kesik';
  if (edge < -3 && k.hasar >= 45) return 'sarsildi';
  if (edge > 3 && k.rHasar >= 45) return 'rakip_sarsildi';
  if (tip === 'guresci' && edge < 0 && chance(0.6)) return 'yerde';
  if (k.rSag < 40 && chance(0.7)) return 'rakip_yorgun';
  if (lead > 0 && k.sag < 45) return 'onde_yorgun';
  if ((k.plan === 'bacak' || k.talimat.some((t) => t.c === 'bacak')) && chance(0.5)) return 'rakip_ayak';
  if ((k.plan === 'govde' || k.talimat.some((t) => t.c === 'govde')) && chance(0.45)) return 'rakip_govde';
  if (Math.abs(edge) < 2.5 && chance(0.6)) return 'yakin';
  if (weakOf(b.rakip.stats) === 'kondisyon' && k.rauntlar.length >= 2 && chance(0.4)) return 'rakip_yorgun';
  return lead > 0 ? 'onde' : lead < 0 ? 'geride' : edge >= 0 ? 'onde' : 'geride';
}

const ALL_CALLS = (Object.keys(CORNER_CALLS) as CornerCall[]).filter((c) => c !== 'kesik');

function offerCalls(d: Situation): CornerCall[] {
  const keys = SIT_KEY[d];
  const rest = shuffle(ALL_CALLS.filter((c) => !keys.includes(c))).slice(0, 2);
  // İkinci iyi seçenek her zaman gelmez: bazen iki tuzak, bir anahtar
  const second = chance(0.7) ? [keys[1]] : shuffle(ALL_CALLS.filter((c) => !keys.includes(c) && !rest.includes(c))).slice(0, 1);
  return shuffle([keys[0], ...second, ...rest]);
}

/** Bir raundu oynatır. Dönüş: bitiriş olduysa sonucu. */
const GRAPPLE: Background[] = ['gures', 'bjj', 'judo', 'sambo'];

/** Rauntun kafes sahnesinde oynanacak anları: üstün taraf tarzına göre vurur ya da indirir; bitişte nakavt, tap ya da doktor. */
function roundBeats(st: Student, b: BoutState, edge: number, end: { kazandi: boolean; yontem: string } | null): string[] {
  const s = st.soyad;
  const o = b.rakip.soyad;
  const win = edge > 0;
  const A = win ? s : o;
  const D = win ? o : s;
  const gA = GRAPPLE.includes(win ? st.stil : b.rakip.stil);
  const out: string[] = [];
  const n = 3 + randInt(0, 1);
  for (let i = 0; i < n; i++) {
    const r = rand();
    if (Math.abs(edge) < 2 && r < 0.4) out.push(L("Ortada sert bir değişim, ikisi de vurdu.", []));
    else if (gA && r < 0.55) out.push(chance(0.7) ? L("{0} rakibini yere indirdi, üstten kontrol ediyor.", [A]) : L("{0} bacaklara daldı, {1} sprawl ile savundu.", [A, D]));
    else if (r < 0.8) out.push(L("{0} kombinasyonlarla öne geçti.", [A]));
    else out.push(chance(0.5) ? L("{0} rakibini kafese yasladı.", [A]) : L("Ortada sert bir değişim, ikisi de vurdu.", []));
  }
  if (!end && Math.abs(edge) > 5) out.push(L("💥 {0} yere düştü!", [D]), L("{0} ayağa kalktı, maç sürüyor.", [D]));
  if (end) {
    const W = end.kazandi ? s : o;
    const Lo = end.kazandi ? o : s;
    if (end.yontem === L("Submission")) out.push(L("{0} kilidi kapattı!", [W]), L("Tap attı! Bitti! Kazanan… {0}!", [W]));
    else if (end.yontem === L("Doktor durdurdu (TKO)")) out.push(L("🩺 Doktor maçı durdurdu: kesik çok derin."));
    else out.push(L("💥 {0} yere düştü!", [Lo]), L("Bitti! {0} ayağa kalkamadı, hakem hemen araya girdi.", [Lo]));
  }
  return out;
}

function playRound(s: GameState, st: Student, b: BoutState, call: CornerCall | null): { kazandi: boolean; yontem: string; raunt: number } | null {
  const end = playRoundInner(s, st, b, call);
  const k = b.kose!;
  k.anim = roundBeats(st, b, k.rauntlar[k.rauntlar.length - 1] ?? (end?.kazandi ? 1 : -1), end);
  return end;
}

function playRoundInner(s: GameState, st: Student, b: BoutState, call: CornerCall | null): { kazandi: boolean; yontem: string; raunt: number } | null {
  const k = b.kose!;
  const n = k.rauntlar.length + 1;
  const tip = b.tip ?? 'vurucu';
  const temper = temperOf(st);
  const yerZayif = ['yer', 'gures'].includes(weakOf(b.rakip.stats));
  let callV = 0;
  let duymadi = false;
  if (call) {
    const ctx: CallCtx = { durum: k.durum, tip, raunt: n, toplam: k.toplam, onde: k.rauntlar.reduce((a, r) => a + Math.sign(r), 0) > 0, sag: k.sag, rHasar: k.rHasar, yerZayif, temper };
    duymadi = temper === 'inatci' && chance(0.3);
    callV = duymadi ? 0 : callValue(call, ctx) + skill(s, 'taktik') * 0.4 + callBonus(s, n, k.toplam);
    k.talimat.push({ c: call, iyi: callV >= 2, duymadi: duymadi || undefined });
    // Kondisyon bedeli / kazancı
    if (!duymadi) {
      if (call === 'bas' || call === 'indir') k.sag -= 8;
      if (call === 'bitir') k.sag -= k.rHasar >= 45 ? 6 : 14;
      if (call === 'nefes') k.sag += 18;
      if (call === 'govde') k.rSag -= 9;
      if (call === 'bacak') k.rSag -= 5;
    }
  }
  // Kesik kapatılmadıysa doktor durdurabilir
  if (k.kesikAcik) {
    k.kesikAcik = false;
    if (call !== 'kesik' && chance(doctorChance(s))) return { kazandi: false, yontem: L("Doktor durdurdu (TKO)"), raunt: n };
  }
  const tipMod = tip === 'baskici' ? (n === 1 ? -2 : n >= 3 ? 1.5 : 0) : tip === 'dayanikli' ? (n === 1 ? 1 : n >= 3 ? -2 : 0) : 0;
  // Rauntlar ayrı ayrı oynandığı için favori çoğunlukla daha sık kazanır: sabit −2 ve geniş zar eski dengeyi korur
  const edge = power(st.stats) - power(b.rakip.stats) - 2 + (k.uyum ? (n === 1 ? 2.5 : 1) : -1) + (st.moral - 50) / 15 + (k.sag - k.rSag) / 22 + tipMod + callV + edgeBonus(s, b, n, k.uyum) + noise(6.5);
  k.rauntlar.push(Math.round(edge * 10) / 10 || 0.1);
  // Hasar ve kondisyon
  const dmg = 10 + Math.abs(edge) * 2 + noise(3);
  if (edge > 0) {
    k.rHasar = clamp(k.rHasar + dmg * (tip === 'vurucu' ? 0.9 : 1), 0, 100);
    k.hasar = clamp(k.hasar + 4 + (tip === 'vurucu' ? 4 : 0), 0, 100);
  } else {
    k.hasar = clamp(k.hasar + dmg * (tip === 'vurucu' ? 1.25 : 1), 0, 100);
    k.rHasar = clamp(k.rHasar + 4, 0, 100);
  }
  k.sag = clamp(k.sag - 10, 0, 100);
  k.rSag = clamp(k.rSag - (tip === 'baskici' ? 15 : 10), 0, 100);
  // Bitiriş
  const grappler = ['gures', 'bjj', 'judo', 'sambo'].includes(st.stil);
  if (edge > 0) {
    const p = clamp((k.rHasar - 50) / 60 + (call === 'bitir' && !duymadi && k.rHasar >= 45 ? 0.3 : 0) + finishBonus(s), 0, 0.8);
    if (chance(p)) return { kazandi: true, yontem: grappler && chance(0.55) ? L("Submission") : chance(0.5) ? 'KO' : 'TKO', raunt: n };
  } else {
    const rGrappler = ['gures', 'bjj', 'judo', 'sambo'].includes(b.rakip.stil);
    const p = clamp((k.hasar - 55) / 60 + (call === 'bas' && k.hasar >= 55 ? 0.12 : 0) + (tip === 'vurucu' ? 0.06 : 0), 0, 0.75);
    if (chance(p)) return { kazandi: false, yontem: rGrappler && chance(0.55) ? L("Submission") : chance(0.5) ? 'KO' : 'TKO', raunt: n };
  }
  // Bir sonraki raunt arası
  const o = b.rakip.soyad;
  k.durum = situationOf(k, edge, tip, b);
  if (k.durum === 'kesik') k.kesikAcik = true;
  const lines = [roundLine(st, o, edge, n)];
  if (call && duymadi) lines.push(L("🙉 {0} talimatı duymadı, kendi bildiğini yaptı.", [st.ad]));
  else if (call) lines.push(callV >= 2 ? L("🗣️ Talimat işledi: {0}.", [CORNER_CALLS[call].ad]) : callV < 0 ? L("🗣️ {0} bu raunda uymadı.", [CORNER_CALLS[call].ad]) : L("🗣️ {0}: fena değil ama fark yaratmadı.", [CORNER_CALLS[call].ad]));
  lines.push(T(SIT_LINES[k.durum](st.soyad, o)));
  k.metin = lines.join('\n');
  const secenek = offerCalls(k.durum);
  k.secenek = k.durum === 'kesik' ? ['kesik', ...secenek.filter((c) => c !== 'kesik').slice(0, 3)] : secenek;
  return null;
}

/** Maç öncesi üç plan: biri rakibin zaafına oturur, ikisi değil. Sıra karışık. */
export function boutPlans(b: BoutState): PlanKey[] {
  const weak = weakOf(b.rakip.stats);
  const all = Object.keys(PLANS) as PlanKey[];
  const good = all.filter((p) => PLANS[p].hedef.includes(weak));
  const bad = all.filter((p) => !PLANS[p].hedef.includes(weak));
  const pickGood = good.length ? pick(good) : pick(all);
  return shuffle([pickGood, ...shuffle(bad.filter((p) => p !== pickGood)).slice(0, 2)]);
}

/** Köşeye geçildi, plan seçildi: 1. raunt oynanır, raunt arası durum ve seçenekler gelir. */
export function startBout(s: GameState, id: string, plan: PlanKey) {
  const st = s.salon?.ogrenciler.find((x) => x.id === id);
  const b = st?.mac;
  if (!st || !b || b.kose) return;
  b.r1 = undefined;
  b.tip ??= oppTipFor(b.rakip.stil);
  b.kose = {
    plan,
    uyum: PLANS[plan].hedef.includes(weakOf(b.rakip.stats)),
    toplam: st.seviye === 'ucc' ? 5 : 3,
    rauntlar: [],
    sag: clamp(70 + (st.stats.kondisyon - 50) / 2 + staminaBonus(s, b), 45, 100),
    hasar: 0,
    rSag: clamp(70 + (b.rakip.stats.kondisyon - 50) / 2, 45, 100),
    rHasar: 0,
    durum: 'yakin',
    metin: '',
    secenek: [],
    talimat: [],
  };
  const end = playRound(s, st, b, null);
  if (end) b.kose.bitis = end;
}

export interface BoutOutcome {
  kazandi: boolean;
  yontem: string;
  satirlar: string[];
  kese: number;
  un: number;
  terfi?: string;
  /** Raunt sonuçları ve doğru talimat sayısı (sonuç ekranı için) */
  rauntlar?: number[];
  iyi?: number;
  /** Son rauntun kafes sahnesi satırları */
  anim?: string[];
}

/** Raunt arası talimat: bir sonraki raunt oynanır. Maç bittiyse sonucu döner. */
export function cornerCall(s: GameState, id: string, call: CornerCall): BoutOutcome | null {
  const st = s.salon?.ogrenciler.find((x) => x.id === id);
  const k = st?.mac?.kose;
  if (!st || !k) return null;
  if (k.bitis) return settle(s, st, k.bitis.kazandi, k.bitis.yontem, k.bitis.raunt, true);
  const end = playRound(s, st, st.mac!, call);
  if (end) return settle(s, st, end.kazandi, end.yontem, end.raunt, true);
  if (k.rauntlar.length >= k.toplam) return decide(s, st, true);
  return null;
}

function decide(s: GameState, st: Student, kose: boolean): BoutOutcome {
  const k = st.mac!.kose!;
  const won = k.rauntlar.filter((r) => r > 0).length;
  return settle(s, st, won * 2 > k.rauntlar.length, L("Karar"), k.rauntlar.length, kose);
}

/** Talimat yoksa ekip köşede durur: maç kendiliğinden sonuçlanır (köşe bonusu yok). */
export function finishBout(s: GameState, id: string, call: CornerCall | null = null): BoutOutcome | null {
  const st = s.salon?.ogrenciler.find((x) => x.id === id);
  const b = st?.mac;
  if (!st || !b) return null;
  if (call && b.kose) return cornerCall(s, id, call);
  const kose = !!b.kose?.talimat.length;
  if (!b.kose) startBout(s, id, pick(Object.keys(PLANS) as PlanKey[]));
  const k = b.kose!;
  if (k.bitis) return settle(s, st, k.bitis.kazandi, k.bitis.yontem, k.bitis.raunt, kose);
  while (k.rauntlar.length < k.toplam) {
    const end = playRound(s, st, b, null);
    if (end) return settle(s, st, end.kazandi, end.yontem, end.raunt, kose);
  }
  return decide(s, st, kose);
}

function settle(s: GameState, st: Student, kazandi: boolean, yontem: string, raunt: number, kose: boolean): BoutOutcome {
  const g = s.salon!;
  const b = st.mac!;
  const k = b.kose;
  const b0 = st.seviye;
  const sampiyon0 = !!st.sampiyon;
  const iyi = k?.talimat.filter((t) => t.iyi).length ?? 0;
  const finish = yontem !== L("Karar");
  const satirlar: string[] = [];
  if (k) satirlar.push(k.rauntlar.map((r, i) => `${i + 1}: ${r > 0 ? '✅' : '❌'}`).join('  '));
  if (kose && k) satirlar.push(L("🗣️ Köşeden {0} talimat, {1} tanesi maçı çevirdi.", [k.talimat.length, iyi]));
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
  if (k && b.tipRapor && b.tip && b.tipRapor !== b.tip) satirlar.push(L("🔎 Keşif raporu yanılmış: {0}", [OPP_TIPS[b.tip]()]));

  // Sonuçlar
  const t = TIERS[st.seviye];
  const kese = t.kese * (kazandi ? 2 : 1) * (st.kisaSure ? 2 : 1);
  delete st.kisaSure;
  const pay = Math.round(kese * (PAY + skill(s, 'menajer') * 0.04 + payMod(s)));
  s.para += pay;
  g.kasa += pay;
  let un = kazandi ? (finish ? 3 : 2) + TIER_ORDER.indexOf(st.seviye) : -1;
  if (kazandi) st.rekor.g++;
  else st.rekor.m++;
  if (kazandi) {
    g.galibiyet = (g.galibiyet ?? 0) + 1;
    if (kose) g.koseG = (g.koseG ?? 0) + 1;
  }
  st.lig = { g: (st.lig?.g ?? 0) + (kazandi ? 1 : 0), m: (st.lig?.m ?? 0) + (kazandi ? 0 : 1) };
  st.moral = clamp(st.moral + (kazandi ? 10 : -12 + skill(s, 'motivasyon') * 3) + (kose ? 6 : -4) + moraleMod(s, kazandi, kose), 0, 100);
  // Maç tecrübesi: kazanan da kaybeden de biraz gelişir.
  STAT_KEYS.forEach((k2) => chance(0.3) && (st.stats[k2] = Math.min(99, st.stats[k2] + 1)));
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
  if (kazandi && st.seviye === 'ucc' && !st.sampiyon && lg.g >= 5 && pw >= 74 && chance(0.35 + titleBonus(s))) {
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
  if (s.antrenor) satirlar.push(...noteCoachBout(s, kazandi, kose, terfi && st.seviye !== b0 ? st.seviye : null, !!st.sampiyon && !sampiyon0, { st, rakip: `${b.rakip.ad} ${b.rakip.soyad}`, yontem, iyi, finish, rakipHoca: !!b.rakipHoca, kamp: b.kamp }));
  g.sonuclar = [{ hafta: s.hafta, ogrenci: `${st.ad} ${st.soyad}`, rakip: `${b.rakip.ad} ${b.rakip.soyad}`, kazandi, yontem, kose }, ...g.sonuclar].slice(0, 20);
  return { kazandi, yontem, satirlar, kese: pay, un, terfi, rauntlar: k?.rauntlar, iyi, anim: k?.anim };
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
        const hiz = 0.18 * lv.gelisim * growthMultiplier(st.yas) * (0.6 + st.moral / 125) * (1 + skill(s, 'gelisim') * 0.12);
        // Antrenör Modu: odaklanılan özellik iki kat hızlı, diğerleri biraz yavaş
        const odak = s.antrenor?.odak[st.id];
        const odakVar = !!odak && odak !== 'denge';
        STAT_KEYS.forEach((k) => {
          const m = growthMod(s, st, k, k === odak, odakVar);
          if (chance(hiz * m * clamp(gap / 12, 0.25, 1))) st.stats[k] = Math.min(99, st.stats[k] + 1);
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
  notes.push(...rankTick(s, weeks));
  return notes;
}

/** Köşesi bekleyen maç sayısı (ana ekran rozeti). */
export const pendingBouts = (s: GameState) => (s.salon?.ogrenciler ?? []).filter((x) => x.mac).length;

export function describeStyle(st: { stil: Background; stats: Stats }) {
  return L("{0} · Güçlü: {1} · Zayıf: {2}", [BACKGROUNDS[st.stil].ad, STAT_LABELS[strongOf(st.stats)], STAT_LABELS[weakOf(st.stats)]]);
}
