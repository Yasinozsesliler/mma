// Patron Modu: kendi MMA organizasyonunu sıfırdan kur. Kartı sen kurarsın (kim kiminle, hangi şehirde, hangi mekânda,
// bilet kaça), tanıtımı sen yaparsın, kemerleri ve sıralamaları sen yönetirsin. Yayın ve sponsor anlaşmaları, rakip
// organizasyonlarla dövüşçü savaşı, kriz anları ve organizasyonun Kafesgram hesabı. Hedef: UCC'yi geçmek.
// Saf motor: durum (PatronRun) üzerinde çalışır, kaydetme src/patronStore.ts'te.
import { L, LOC } from '../i18n';
import { COUNTRIES, NAME_POOLS, ORGS, WEIGHT_CLASSES, femSurname } from './data';
import { CITIES, type City } from './worldMap';
import { chance, clamp, pick, rand, randInt, shuffle, uid, weighted } from './rng';
import type { Background, Method, OrgId, Post, WeightClass } from './types';
import type { PhotoKind, PhotoPost } from './gram';
import { lookFor } from './tale';

/** Dövüşçünün görünümü (kimlikten; Menajer Modu ile aynı) */
export const pLook = (f: Pick<PFighter, 'id' | 'ulke' | 'kadin'>) => lookFor({ id: f.id, uyruk: f.ulke, kadin: f.kadin });

// ---------- Türler ----------

export type PKisilik = 'yildiz' | 'kavgaci' | 'sessiz' | 'paragoz' | 'sadik';
export const P_KISILIK: Record<PKisilik, { ad: () => string; aciklama: () => string }> = {
  yildiz: { ad: () => L("Yıldız"), aciklama: () => L("Ana maç ister, kamerayı sever. Tanıtımda altın değerinde.") },
  kavgaci: { ad: () => L("Kavgacı"), aciklama: () => L("Laf atar, ateşi yükseltir. Basın toplantısında olay çıkarabilir.") },
  sessiz: { ad: () => L("Sessiz"), aciklama: () => L("Az konuşur, çok çalışır. Bilet sattırmaz ama sorun da çıkarmaz.") },
  paragoz: { ad: () => L("Paragöz"), aciklama: () => L("Her imzada zam ister, rakip teklife en açık olan odur.") },
  sadik: { ad: () => L("Sadık"), aciklama: () => L("Organizasyonuna bağlıdır, rakip teklifleri çoğunlukla geri çevirir.") },
};
const KISILIKLER: PKisilik[] = ['yildiz', 'kavgaci', 'sessiz', 'paragoz', 'sadik'];

export type Istek = 'unvan' | 'para' | 'aktif' | 'rovans' | 'ana';
export const ISTEK: Record<Istek, () => string> = {
  unvan: () => L("Kemer maçı istiyor"),
  para: () => L("Daha çok para istiyor"),
  aktif: () => L("Sık dövüşmek istiyor"),
  rovans: () => L("Rövanş istiyor"),
  ana: () => L("Ana maç istiyor"),
};

export interface PRakip {
  id: string;
  ad: string;
  ulke: string;
  stil: Background;
  rekor: string;
  kadin: boolean;
  guc: number;
}

/** Bir maçın kaydı: dövüşçünün dosyasında listelenir, kafes sahnesi bu kayıttan oynatılır */
export interface PKayit {
  id: string;
  h: number;
  gece: number;
  rk: PRakip;
  w: boolean;
  y: string;
  kod: Method;
  ra: number;
  top: number;
  unvan?: boolean;
  ana?: boolean;
  perf: number;
}

export interface PFighter {
  id: string;
  ad: string;
  soyad: string;
  lakap?: string;
  ulke: string;
  kadin: boolean;
  siklet: WeightClass;
  stil: Background;
  yas: number;
  guc: number;
  pot: number;
  g: number;
  m: number;
  b: number;
  seri: number;
  /** Şöhret (0-100): bilet ve PPV sattırır */
  un: number;
  /** Sıralama puanı */
  elo: number;
  /** Maç başı ücret ve sözleşmede kalan maç */
  ucret: number;
  kalan: number;
  /** Mutluluk (0-100): düşükse rakip teklife açık, şikâyet eder */
  mutlu: number;
  kisilik: PKisilik;
  istek: Istek;
  sakat: number;
  hasar: number;
  bosHafta: number;
  sampiyon?: boolean;
  maclar: PKayit[];
  katilis: number;
  /** Kendisini en son yenen (rövanş) */
  intikam?: string;
  eskiUcc?: boolean;
  akademi?: boolean;
  /** Bir sonraki kartta maç sözü verildi (haftası) */
  soz?: number;
  /** Veda maçı bekliyor */
  veda?: boolean;
}

export interface PAday extends PFighter {
  /** İmza parası ve organizasyona ilgisi (0-1) */
  imza: number;
  ilgi: number;
  /** Bu dövüşçüye teklif veren rakip organizasyon */
  rakipOrg?: OrgId;
}

export interface Bolum {
  key: string;
  siklet: WeightClass;
  kadin: boolean;
  sampiyon?: string;
  savunma: number;
  acilis: number;
  /** Son unvan maçının haftası */
  sonUnvan: number;
}

export type MekanId = 'salon' | 'spor' | 'arena' | 'stadyum';
export const MEKAN: Record<MekanId, { ad: () => string; kap: number; maliyet: number; itibar: number; ikon: string }> = {
  salon: { ad: () => L("Depo salonu"), kap: 1500, maliyet: 6_000, itibar: 0, ikon: 'warehouse' },
  spor: { ad: () => L("Spor salonu"), kap: 5000, maliyet: 28_000, itibar: 15, ikon: 'stadium-variant' },
  arena: { ad: () => L("Arena"), kap: 14000, maliyet: 95_000, itibar: 40, ikon: 'stadium' },
  stadyum: { ad: () => L("Stadyum"), kap: 40000, maliyet: 320_000, itibar: 70, ikon: 'soccer-field' },
};
export const MEKANLAR: MekanId[] = ['salon', 'spor', 'arena', 'stadyum'];

export type BiletId = 0 | 1 | 2;
export const BILET: { ad: () => string; fiyat: number; talep: number }[] = [
  { ad: () => L("Ucuz"), fiyat: 0.7, talep: 1.25 },
  { ad: () => L("Normal"), fiyat: 1, talep: 1 },
  { ad: () => L("Pahalı"), fiyat: 1.5, talep: 0.72 },
];

export type TanitimId = 'basin' | 'faceoff' | 'acik' | 'reklam' | 'belgesel';
export const TANITIM: Record<TanitimId, { ad: () => string; aciklama: () => string; maliyet: number; ilgi: number; ates: number; ikon: string; itibar: number }> = {
  acik: { ad: () => L("Açık antrenman"), aciklama: () => L("Taraftar dövüşçüleri yakından görür. Ucuz, takipçi getirir."), maliyet: 1_500, ilgi: 0.04, ates: 0, ikon: 'arm-flex', itibar: 0 },
  faceoff: { ad: () => L("Tartı ve face-off şovu"), aciklama: () => L("Burun buruna fotoğraflar. Ana maçın ateşini yükseltir."), maliyet: 3_000, ilgi: 0.06, ates: 10, ikon: 'account-switch', itibar: 0 },
  basin: { ad: () => L("Basın toplantısı"), aciklama: () => L("Mikrofonlar açılır. Satış artar ama kavga çıkabilir."), maliyet: 5_000, ilgi: 0.09, ates: 16, ikon: 'microphone', itibar: 0 },
  reklam: { ad: () => L("Reklam panoları ve TV"), aciklama: () => L("Şehrin her yerinde afiş. Pahalı ama güvenli satış."), maliyet: 18_000, ilgi: 0.16, ates: 0, ikon: 'billboard', itibar: 0 },
  belgesel: { ad: () => L("Geri sayım belgeseli"), aciklama: () => L("Kampların içinden çekim. Çok takipçi ve itibar getirir."), maliyet: 35_000, ilgi: 0.12, ates: 12, ikon: 'movie-open', itibar: 1 },
};
export const TANITIMLAR: TanitimId[] = ['acik', 'faceoff', 'basin', 'reklam', 'belgesel'];

export interface Mac {
  a: string;
  b: string;
  unvan?: boolean;
}

export interface Plan {
  hafta: number;
  sehir: string;
  mekan: MekanId;
  bilet: BiletId;
  maclar: Mac[];
  tanitim: TanitimId[];
  bonus: 'standart' | 'comert';
  /** Kafesgram'da kart duyuruldu (ilgi +) */
  duyuru?: boolean;
  /** Şehir teşvik parası ve aynı hafta rakip organizasyon gecesi */
  tesvik?: number;
  rakipGece?: OrgId;
  karsiReklam?: boolean;
  /** Kazanana kemer olmadan devam eden (kilo kaçırılan) maçlar: a kimliği */
  unvansiz?: string[];
}

export interface PSonuc {
  a: string;
  b: string;
  aAd: string;
  bAd: string;
  w: 'a' | 'b';
  y: string;
  kod: Method;
  ra: number;
  top: number;
  unvan?: boolean;
  perf: number;
  yeniSampiyon?: boolean;
  bonus?: 'mac' | 'perf';
}

export interface GeceRapor {
  no: number;
  hafta: number;
  ad: string;
  sehir: string;
  mekan: MekanId;
  seyirci: number;
  kapasite: number;
  gelir: { bilet: number; tv: number; ppv: number; sponsor: number; merch: number; tesvik: number };
  gider: { mekan: number; ucret: number; bonus: number; tanitim: number; produksiyon: number };
  kar: number;
  itibarD: number;
  takipciD: number;
  sonuclar: PSonuc[];
  notlar: string[];
}

export type YayinId = 'yerel' | 'ulusal' | 'global' | 'ppv';
export const YAYIN: Record<YayinId, { ad: () => string; gece: number; min: number; itibar: number; ppv?: boolean }> = {
  yerel: { ad: () => L("Yerel spor kanalı"), gece: 12_000, min: 5, itibar: 10 },
  ulusal: { ad: () => L("Ulusal TV kanalı"), gece: 48_000, min: 7, itibar: 30 },
  global: { ad: () => L("Küresel yayın platformu"), gece: 150_000, min: 8, itibar: 52 },
  ppv: { ad: () => L("PPV ortaklığı"), gece: 110_000, min: 9, itibar: 72, ppv: true },
};
export const YAYINLAR: YayinId[] = ['yerel', 'ulusal', 'global', 'ppv'];
export interface Yayin {
  id: YayinId;
  gece: number;
  min: number;
  basla: number;
  bitis: number;
  yapilan: number;
}

export type SponsorSart = 'yok' | 'ko' | 'dolu' | 'unvan';
export interface Sponsor {
  id: string;
  marka: string;
  gece: number;
  kalan: number;
  sart: SponsorSart;
  ek: number;
}
const MARKALAR = ['Kızıl Enerji', 'TitanFit', 'Apex Saat', 'Volt Spor', 'Demir Protein', 'Kuzey Otomotiv', 'Atlas Telekom', 'Pusula Sigorta', 'Nova Kulaklık', 'Orkan Lastik', 'Zirve Su', 'Bora Giyim'];
export const SPONSOR_SART: Record<SponsorSart, () => string> = {
  yok: () => L("Şartsız"),
  ko: () => L("Gecede en az bir nakavt olursa ek ödeme"),
  dolu: () => L("Salon dolarsa ek ödeme"),
  unvan: () => L("Gecede kemer maçı varsa ek ödeme"),
};

export type TesisId = 'produksiyon' | 'performans' | 'medya' | 'scout' | 'akademi';
export const TESIS: Record<TesisId, { ad: () => string; aciklama: () => string; ikon: string; maliyet: number[] }> = {
  produksiyon: { ad: () => L("Yayın prodüksiyonu"), aciklama: () => L("Kamera, ışık, grafik. Yayın ve PPV geliri ile itibar artar."), ikon: 'video-vintage', maliyet: [60_000, 180_000, 450_000] },
  performans: { ad: () => L("Performans merkezi"), aciklama: () => L("Dövüşçüler daha hızlı gelişir, daha az sakatlanır, mutluluk artar."), ikon: 'dumbbell', maliyet: [50_000, 150_000, 380_000] },
  medya: { ad: () => L("Medya ekibi"), aciklama: () => L("Kafesgram daha hızlı büyür, profesyonel çekimler ücretsiz."), ikon: 'cellphone-text', maliyet: [30_000, 90_000, 240_000] },
  scout: { ad: () => L("Gözlemci ağı"), aciklama: () => L("Serbest piyasada daha iyi ve daha çok aday, gizli potansiyel görünür."), ikon: 'account-search', maliyet: [35_000, 110_000, 280_000] },
  akademi: { ad: () => L("Gençlik akademisi"), aciklama: () => L("Her 10 haftada bir akademiden genç bir yetenek kadroya katılır."), ikon: 'school', maliyet: [80_000, 220_000, 520_000] },
};
export const TESISLER: TesisId[] = ['produksiyon', 'performans', 'medya', 'scout', 'akademi'];

export interface RakipOrg {
  id: OrgId;
  itibar: number;
}

export type PRol = 'dovuscu' | 'menajer' | 'yayin' | 'sponsor' | 'basin' | 'rakip' | 'yatirimci' | 'sistem' | 'doktor' | 'sehir';
export interface PSecenek {
  k: string;
  t: string;
  ipucu?: string;
}
export interface PMesaj {
  id: string;
  hafta: number;
  rol: PRol;
  kimden: string;
  metin: string;
  olay?: string;
  p?: Record<string, string | number>;
  secenekler?: PSecenek[];
  cevap?: string;
  sonuc?: string;
  okundu?: boolean;
  son?: number;
}

export type PDmRol = 'dovuscu' | 'hayran' | 'gazeteci' | 'unlu' | 'troll' | 'menajer';
export interface PDm {
  id: string;
  hafta: number;
  rol: PDmRol;
  kimden: string;
  metin: string;
  olay: string;
  p?: Record<string, string | number>;
  secenekler: string[];
  cevap?: number;
  sonuc?: string;
  okundu?: boolean;
}

export interface PGram {
  takipci: number;
  posts: Post[];
  say: number;
  sonFoto?: number;
  bio?: string;
  dm: PDm[];
  /** Hikâye halkası görüldü mü (hafta) */
  hikaye?: number;
}

export type PSenaryo = 'garaj' | 'yatirimci' | 'kurtarma';
export const P_SENARYO: Record<PSenaryo, { ad: () => string; aciklama: () => string; zorluk: () => string; ikon: string }> = {
  garaj: { ad: () => L("Garajdan zirveye"), aciklama: () => L("Biriktirdiğin 150.000 $ ve 8 yerel dövüşçü. Kimse adını bilmiyor."), zorluk: () => L("Normal"), ikon: 'garage' },
  yatirimci: { ad: () => L("Yatırımcı parası"), aciklama: () => L("Kasada 600.000 $ var ama yönetim kurulu her yıl hedef koyar. İki yıl üst üste tutturamazsan kovulursun."), zorluk: () => L("Baskılı"), ikon: 'cash-multiple' },
  kurtarma: { ad: () => L("Batan geminin kaptanı"), aciklama: () => L("İflasın eşiğindeki bir organizasyonu devraldın: bilinen isimler, pahalı ve mutsuz kadro, 40.000 $ kasa."), zorluk: () => L("Zor"), ikon: 'lifebuoy' },
};

export interface PHedef {
  yil: number;
  gelir: number;
  itibar: number;
  gece: number;
}

export interface PatronRun {
  v: 1;
  ad: string;
  org: { ad: string; kisa: string; renk: string };
  sehir: string;
  senaryo: PSenaryo;
  deneme: boolean;
  hafta: number;
  para: number;
  itibar: number;
  kadro: PFighter[];
  bolumler: Bolum[];
  adaylar: PAday[];
  adayHafta: number;
  plan?: Plan;
  geceNo: number;
  geceler: GeceRapor[];
  ates: Record<string, number>;
  yayin?: Yayin;
  sponsorlar: Sponsor[];
  tesis: Record<TesisId, number>;
  rakipler: RakipOrg[];
  mesajlar: PMesaj[];
  gram: PGram;
  hedef?: PHedef;
  hedefKacti: number;
  yil: { gelir: number; gider: number; gece: number };
  toplam: { gelir: number; gece: number; seyirci: number; unvan: number; kar: number };
  kapandi?: 'iflas' | 'satis' | 'kapat' | 'kovuldu';
  satis?: number;
  kayipHafta: number;
  /** Geçen haftanın özeti */
  rapor: string[];
  /** UCC satın alma teklifi bu yıl yapıldı mı */
  uccTeklif?: number;
  /** Rakip organizasyonları geçme bildirimleri */
  gecilen: OrgId[];
  akademiHafta: number;
}

// ---------- Yardımcılar ----------

const $ = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString(LOC)}`;
export const money = $;
const r100 = (n: number) => Math.round(n / 100) * 100;
export const pFullName = (f: Pick<PFighter, 'ad' | 'soyad'>) => `${f.ad} ${f.soyad}`;
export const pRekor = (f: Pick<PFighter, 'g' | 'm' | 'b'>) => `${f.g}-${f.m}-${f.b}`;
export const bKey = (f: Pick<PFighter, 'siklet' | 'kadin'>) => `${f.siklet}${f.kadin ? '_k' : ''}`;
export const bolumAd = (b: Pick<Bolum, 'siklet' | 'kadin'>) => (b.kadin ? L("Kadınlar {0}", [WEIGHT_CLASSES[b.siklet].ad]) : WEIGHT_CLASSES[b.siklet].ad);
export const cityById = (id: string): City => CITIES.find((c) => c.id === id) ?? CITIES[0];
export const fighterById = (r: PatronRun, id: string) => r.kadro.find((f) => f.id === id);
export const yilOf = (r: PatronRun) => Math.floor((r.hafta - 1) / 52) + 1;
export const haftaOfYil = (r: PatronRun) => ((r.hafta - 1) % 52) + 1;
export const P_TRIAL_NIGHTS = 3;
export const trialOver = (r: PatronRun) => r.deneme && r.geceNo >= P_TRIAL_NIGHTS;
export const orgAdi = (o: OrgId) => (o === 'ufc' ? 'UCC' : ORGS[o].ad);
const atesKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
export const atesOf = (r: PatronRun, a: string, b: string) => r.ates[atesKey(a, b)] ?? 0;
function addAtes(r: PatronRun, a: string, b: string, d: number) {
  const k = atesKey(a, b);
  r.ates[k] = clamp((r.ates[k] ?? 0) + d, 0, 100);
}
export const unvanOf = (r: PatronRun) =>
  r.itibar >= 85 ? L("Dünya devi") : r.itibar >= 65 ? L("Küresel organizasyon") : r.itibar >= 45 ? L("Büyük lig") : r.itibar >= 25 ? L("Yükselen organizasyon") : r.itibar >= 10 ? L("Yerel organizasyon") : L("Bodrum katı organizasyonu");

const STYLES: [Background, number][] = [
  ['boks', 12],
  ['muaythai', 12],
  ['kickboks', 10],
  ['gures', 12],
  ['bjj', 12],
  ['judo', 6],
  ['sambo', 6],
  ['kyokushin', 6],
  ['sokak', 5],
];
const GRAPPLE: Background[] = ['gures', 'bjj', 'judo', 'sambo'];
const STRIKE: Background[] = ['boks', 'muaythai', 'kickboks', 'kyokushin', 'sokak'];
const SIKLETLER: WeightClass[] = ['sinek', 'horoz', 'tuy', 'hafif', 'welter', 'orta', 'yariagir', 'agir'];

function makeName(kadin: boolean, pool = pick(NAME_POOLS)) {
  const soy = pick(pool.soyad);
  return { ad: pick(kadin ? pool.kadin : pool.ad), soyad: kadin && pool.slav ? femSurname(soy) : soy, ulke: pool.ulke };
}
const LAKAP = ['Kasırga', 'Demir', 'Gölge', 'Kobra', 'Buldozer', 'Şimşek', 'Kurt', 'Profesör', 'Çelik', 'Kartal', 'Fırtına', 'Boğa', 'Yılan', 'Volkan', 'Tank', 'Hayalet'];

/** Ücret: güce ve şöhrete göre maç başı */
export const feeOf = (guc: number, un: number) => r100(600 + Math.max(0, guc - 35) ** 2 * 4 * (1 + un / 25) ** 1.5);

/** Büyük organizasyon daha çok öder: ücretler itibarla artar */
export const orgPay = (r: Pick<PatronRun, 'itibar'>) => 0.8 + r.itibar / 80;

/** İtibar tavanı: organizasyon kadrosunun kalitesinden büyük olamaz (en iyi 10 dövüşçünün gücü) */
export function itibarCap(r: PatronRun) {
  const top = [...r.kadro].sort((a, b) => b.guc - a.guc).slice(0, 10);
  const avg = top.length ? top.reduce((s, f) => s + f.guc, 0) / 10 : 30;
  return clamp(Math.round(avg * 1.6 - 50), 12, 100);
}

export function makePF(o: { guc?: number; pot?: number; yas?: number; siklet?: WeightClass; kadin?: boolean; un?: number; hafta?: number; kisilik?: PKisilik } = {}): PFighter {
  const kadin = o.kadin ?? chance(0.2);
  const n = makeName(kadin);
  const guc = clamp(Math.round(o.guc ?? randInt(40, 55)), 30, 95);
  const yas = o.yas ?? randInt(20, 31);
  const pot = clamp(Math.round(o.pot ?? guc + 4 + rand() * 24 - Math.max(0, yas - 26) * 2.5), guc, 97);
  const g = Math.max(0, Math.round((guc - 35) / 3 + randInt(-2, 4)));
  const un = clamp(Math.round(o.un ?? (guc - 30) * 0.55 + randInt(-4, 8)), 2, 100);
  return {
    id: uid(),
    ad: n.ad,
    soyad: n.soyad,
    lakap: chance(0.45) ? pick(LAKAP) : undefined,
    ulke: n.ulke,
    kadin,
    siklet: o.siklet ?? (kadin ? pick(SIKLETLER.slice(0, 4)) : pick(SIKLETLER)),
    stil: weighted(STYLES),
    yas,
    guc,
    pot,
    g,
    m: randInt(0, Math.max(1, Math.round(g / 3))),
    b: 0,
    seri: 0,
    un,
    elo: 1000 + (guc - 50) * 8 + randInt(-20, 20),
    ucret: feeOf(guc, un),
    kalan: randInt(3, 6),
    mutlu: randInt(55, 75),
    kisilik: o.kisilik ?? pick(KISILIKLER),
    istek: pick(['unvan', 'para', 'aktif', 'ana'] as Istek[]),
    sakat: 0,
    hasar: randInt(0, 12),
    bosHafta: randInt(0, 4),
    maclar: [],
    katilis: o.hafta ?? 0,
  };
}

// ---------- Kuruluş ----------

const RENKLER = ['#c1121f', '#f2c14e', '#1f6feb', '#0f9d58', '#8e44ad', '#ff7a1a', '#e8e8e8', '#00b4d8'];
export const ORG_RENKLER = RENKLER;
export const HOME_CITIES = ['istanbul', 'londra', 'vegas', 'saopaulo', 'varsova', 'paris', 'berlin', 'mexico', 'moskova', 'dublin', 'tokyo', 'newyork'].filter((id) => CITIES.some((c) => c.id === id));

export function createPatron(o: { ad: string; orgAd: string; kisa: string; renk: string; sehir: string; senaryo: PSenaryo; deneme: boolean }): PatronRun {
  const sen = o.senaryo;
  const city = cityById(o.sehir);
  const yerel = COUNTRIES[city.ulke]?.ad;
  const kadro: PFighter[] = [];
  const bolumler: Bolum[] = [];
  const open = (s: WeightClass, k = false) => bolumler.push({ key: `${s}${k ? '_k' : ''}`, siklet: s, kadin: k, savunma: 0, acilis: 1, sonUnvan: 0 });
  open('hafif');
  open('welter');
  const n = sen === 'kurtarma' ? 12 : 8;
  for (let i = 0; i < n; i++) {
    const siklet: WeightClass = i % 2 ? 'welter' : 'hafif';
    const guc = sen === 'kurtarma' ? randInt(50, 66) : randInt(38, 52);
    const f = makePF({ guc, siklet, kadin: false, hafta: 1 });
    if (yerel && i < 3) f.ulke = yerel;
    if (sen === 'kurtarma') {
      f.un = clamp(f.un + 15, 0, 100);
      f.ucret = r100(feeOf(f.guc, f.un) * 1.3);
      f.mutlu = randInt(30, 50);
      f.yas = randInt(27, 34);
    }
    kadro.push(f);
  }
  if (sen === 'kurtarma') {
    const champ = kadro.filter((f) => f.siklet === 'hafif').sort((a, b) => b.guc - a.guc)[0];
    champ.sampiyon = true;
    bolumler[0].sampiyon = champ.id;
  }
  const r: PatronRun = {
    v: 1,
    ad: o.ad.trim() || L("Patron"),
    org: { ad: o.orgAd.trim() || L("Yeni Organizasyon"), kisa: (o.kisa.trim() || o.orgAd.trim().slice(0, 4) || 'YO').toLocaleUpperCase(LOC).slice(0, 6), renk: o.renk },
    sehir: city.id,
    senaryo: sen,
    deneme: o.deneme,
    hafta: 1,
    para: sen === 'yatirimci' ? 600_000 : sen === 'kurtarma' ? 40_000 : 150_000,
    itibar: sen === 'kurtarma' ? 22 : sen === 'yatirimci' ? 8 : 4,
    kadro,
    bolumler,
    adaylar: [],
    adayHafta: 0,
    geceNo: 0,
    geceler: [],
    ates: {},
    sponsorlar: [],
    tesis: { produksiyon: 0, performans: 0, medya: 0, scout: 0, akademi: 0 },
    rakipler: [
      { id: 'cfc', itibar: 30 },
      { id: 'oktagon', itibar: 40 },
      { id: 'mvp', itibar: 48 },
      { id: 'pfl', itibar: 58 },
      { id: 'one', itibar: 66 },
      { id: 'ufc', itibar: 96 },
    ],
    mesajlar: [],
    gram: { takipci: sen === 'kurtarma' ? 42_000 : sen === 'yatirimci' ? 6_000 : 1_200, posts: [], say: 0, dm: [] },
    hedefKacti: 0,
    yil: { gelir: 0, gider: 0, gece: 0 },
    toplam: { gelir: 0, gece: 0, seyirci: 0, unvan: 0, kar: 0 },
    kayipHafta: 0,
    rapor: [],
    gecilen: [],
    akademiHafta: 0,
  };
  if (sen === 'kurtarma') r.yayin = { id: 'yerel', gece: YAYIN.yerel.gece, min: YAYIN.yerel.min, basla: 1, bitis: 52, yapilan: 0 };
  // Rakiplik ateşi: aynı sıklette iki dövüşçü arasında eski husumet
  const h = r.kadro.filter((f) => f.siklet === 'hafif');
  if (h.length >= 2) addAtes(r, h[0].id, h[1].id, 30);
  refreshCandidates(r, true);
  setGoal(r);
  msg(r, {
    rol: 'sistem',
    kimden: r.org.ad,
    metin:
      sen === 'kurtarma'
        ? L("Organizasyonu devraldın. Kasada {0} var, kadro mutsuz ve pahalı. İlk iş: ilk geceyi planla ve parayı döndür.", [$(r.para)])
        : L("{0} resmen kuruldu. İlk iş: Kart sekmesinden ilk geceni planla. İki dövüşçüyü eşle, şehri ve mekânı seç, biletleri sat.", [r.org.ad]),
  });
  welcomePosts(r);
  return r;
}

export function ensurePatron(r: PatronRun): PatronRun {
  r.gram ??= { takipci: 1000, posts: [], say: 0, dm: [] };
  r.gram.dm ??= [];
  r.gecilen ??= [];
  r.ates ??= {};
  r.akademiHafta ??= 0;
  for (const f of r.kadro) f.maclar ??= [];
  return r;
}

// ---------- Mesajlar ----------

function msg(r: PatronRun, m: Omit<PMesaj, 'id' | 'hafta'>) {
  r.mesajlar.unshift({ id: uid(), hafta: r.hafta, ...m });
  r.mesajlar = r.mesajlar.slice(0, 60);
}
export const bekleyen = (r: PatronRun) => r.mesajlar.filter((m) => m.secenekler && !m.cevap);
export const okunmamis = (r: PatronRun) => r.mesajlar.filter((m) => !m.okundu).length;
export function markRead(r: PatronRun) {
  for (const m of r.mesajlar) m.okundu = true;
}

// ---------- Hedefler ----------

function setGoal(r: PatronRun) {
  const y = yilOf(r);
  const base = r.senaryo === 'yatirimci' ? 1.3 : 1;
  const artis = r.itibar >= 80 ? 2 : r.itibar >= 60 ? 5 : r.senaryo === 'yatirimci' ? 12 : 9;
  r.hedef = { yil: y, gelir: r100((200_000 + r.itibar ** 1.5 * 2_500) * base), itibar: Math.min(clamp(r.itibar + artis, 15, 100), Math.max(r.itibar, itibarCap(r))), gece: 5 };
}

// ---------- Sıralama ----------

export function divisionOf(r: PatronRun, key: string) {
  return r.bolumler.find((b) => b.key === key);
}
/** Bölümün sıralaması: şampiyon hariç, puana göre */
export function ranking(r: PatronRun, key: string): PFighter[] {
  const b = divisionOf(r, key);
  return r.kadro.filter((f) => bKey(f) === key && f.id !== b?.sampiyon).sort((a, c) => c.elo - a.elo);
}
export function rankOf(r: PatronRun, f: PFighter): number | 'C' | null {
  const b = divisionOf(r, bKey(f));
  if (!b) return null;
  if (b.sampiyon === f.id) return 'C';
  const i = ranking(r, b.key).findIndex((x) => x.id === f.id);
  return i < 0 ? null : i + 1;
}
const rankNum = (r: PatronRun, f: PFighter) => {
  const x = rankOf(r, f);
  return x === 'C' ? 0 : (x ?? 20);
};

export const DIV_COST = 40_000;
export function openDivision(r: PatronRun, siklet: WeightClass, kadin: boolean): string {
  const key = `${siklet}${kadin ? '_k' : ''}`;
  if (divisionOf(r, key)) return L("Bu sıklet zaten açık.");
  if (r.para < DIV_COST) return L("Yeni sıklet açmak için {0} gerekiyor.", [$(DIV_COST)]);
  r.para -= DIV_COST;
  r.yil.gider += DIV_COST;
  r.bolumler.push({ key, siklet, kadin, savunma: 0, acilis: r.hafta, sonUnvan: 0 });
  // Sıklet açılınca piyasaya o sıkletten adaylar düşer
  for (let i = 0; i < 3; i++) r.adaylar.unshift(makeAday(r, { siklet, kadin }));
  r.adaylar = r.adaylar.slice(0, 12);
  r.itibar = clamp(r.itibar + 1, 0, 100);
  return L("{0} sıkleti açıldı. Serbest piyasada bu sıkletten yeni adaylar var.", [bolumAd({ siklet, kadin })]);
}

// ---------- Serbest piyasa ----------

function makeAday(r: PatronRun, o: { siklet?: WeightClass; kadin?: boolean } = {}): PAday {
  const b = o.siklet ? null : pick(r.bolumler);
  const siklet = o.siklet ?? b!.siklet;
  const kadin = o.kadin ?? b!.kadin;
  const lvl = 40 + r.itibar * 0.42 + r.tesis.scout * 2;
  const tip = weighted<'genc' | 'normal' | 'veteran' | 'yildiz'>([
    ['genc', 30],
    ['normal', 45],
    ['veteran', 15 + (r.itibar >= 30 ? 10 : 0)],
    ['yildiz', r.itibar >= 45 ? 10 : 2],
  ]);
  const f =
    tip === 'genc'
      ? makePF({ guc: lvl - randInt(8, 14), yas: randInt(19, 23), pot: lvl + randInt(5, 25) + r.tesis.scout * 3, siklet, kadin, hafta: r.hafta })
      : tip === 'veteran'
        ? makePF({ guc: lvl + randInt(2, 10), yas: randInt(32, 36), siklet, kadin, hafta: r.hafta, un: lvl * 0.7 + randInt(5, 20) })
        : tip === 'yildiz'
          ? makePF({ guc: Math.min(90, lvl + randInt(8, 16)), yas: randInt(25, 31), siklet, kadin, hafta: r.hafta, un: Math.min(95, lvl * 0.8 + randInt(15, 30)) })
          : makePF({ guc: lvl + randInt(-6, 5), siklet, kadin, hafta: r.hafta });
  if (tip === 'veteran' && chance(0.5)) f.eskiUcc = true;
  f.ucret = r100(feeOf(f.guc, f.un) * orgPay(r));
  const ilgi = clamp(0.55 + (r.itibar - (f.guc - 35) * 0.9) / 70 + (f.eskiUcc ? -0.1 : 0), 0.05, 0.95);
  return { ...f, imza: r100(f.ucret * (tip === 'yildiz' ? 3 : 1.5)), ilgi, kalan: 0, mutlu: 65 };
}

export function refreshCandidates(r: PatronRun, force = false) {
  if (!force && r.hafta - r.adayHafta < 4) return;
  r.adayHafta = r.hafta;
  const n = 6 + r.tesis.scout;
  r.adaylar = Array.from({ length: n }, () => makeAday(r));
}

export type TeklifTip = 'dusuk' | 'adil' | 'comert';
export const TEKLIF: Record<TeklifTip, { ad: () => string; carpan: number }> = {
  dusuk: { ad: () => L("Düşük teklif"), carpan: 0.85 },
  adil: { ad: () => L("Adil teklif"), carpan: 1 },
  comert: { ad: () => L("Cömert teklif"), carpan: 1.25 },
};
export const KADRO_MAX = 40;

export function signChance(r: PatronRun, a: PAday, t: TeklifTip) {
  const base = a.ilgi + (t === 'dusuk' ? -0.25 : t === 'comert' ? 0.25 : 0) + (a.kisilik === 'paragoz' && t !== 'comert' ? -0.12 : 0) - (a.rakipOrg ? 0.15 : 0);
  return clamp(base, 0.03, 0.97);
}

export function signCandidate(r: PatronRun, id: string, t: TeklifTip, mac: 3 | 6): string {
  const a = r.adaylar.find((x) => x.id === id);
  if (!a) return '';
  if (r.kadro.length >= KADRO_MAX) return L("Kadro dolu ({0}). Önce birini serbest bırak.", [KADRO_MAX]);
  if (!divisionOf(r, bKey(a))) return L("Bu dövüşçünün sıkleti organizasyonunda yok. Önce {0} sıkletini aç.", [bolumAd(a)]);
  const c = TEKLIF[t].carpan;
  const imza = r100(a.imza * c);
  if (r.para < imza) return L("İmza parası için kasada {0} gerekiyor.", [$(imza)]);
  const p = signChance(r, a, t) - (mac === 6 && a.yas < 24 ? 0.08 : 0);
  r.adaylar = r.adaylar.filter((x) => x.id !== id);
  if (!chance(p)) {
    return a.rakipOrg ? L("{0} teklifini reddetti ve {1} ile imzaladı.", [pFullName(a), orgAdi(a.rakipOrg)]) : L("{0} teklifini reddetti. Başka bir organizasyonla anlaştı.", [pFullName(a)]);
  }
  r.para -= imza;
  r.yil.gider += imza;
  const { imza: _i, ilgi: _l, rakipOrg: _o, ...f } = a;
  const yeni: PFighter = { ...f, ucret: r100(a.ucret * c), kalan: mac, mutlu: clamp(60 + (c - 1) * 80, 30, 90), katilis: r.hafta, bosHafta: 0 };
  r.kadro.push(yeni);
  r.itibar = clamp(r.itibar + (a.un >= 60 ? 2 : 0), 0, 100);
  if (a.un >= 50) gramPost(r, { tur: 'medya', yazar: 'MMA Gündem', kullanici: '@mmagundem', metin: L("SICAK: {0}, {1} ile {2} maçlık sözleşme imzaladı! 🖊️", [pFullName(a), r.org.ad, mac]) });
  return L("{0} imzaladı! {1} maç, maç başı {2}. İmza parası {3}.", [pFullName(a), mac, $(yeni.ucret), $(imza)]);
}

export function releaseFighter(r: PatronRun, id: string): string {
  const f = fighterById(r, id);
  if (!f) return '';
  if (r.plan?.maclar.some((m) => m.a === id || m.b === id)) return L("Bu dövüşçü planlanan kartta. Önce maçını karttan çıkar.");
  const tazminat = r100(f.ucret * Math.min(2, f.kalan) * 0.5);
  r.para -= tazminat;
  r.yil.gider += tazminat;
  dropFighter(r, f);
  return tazminat ? L("{0} serbest bırakıldı. Sözleşme tazminatı {1}.", [pFullName(f), $(tazminat)]) : L("{0} serbest bırakıldı.", [pFullName(f)]);
}

function dropFighter(r: PatronRun, f: PFighter) {
  r.kadro = r.kadro.filter((x) => x.id !== f.id);
  for (const b of r.bolumler)
    if (b.sampiyon === f.id) {
      b.sampiyon = undefined;
      b.savunma = 0;
    }
  if (r.plan) r.plan.maclar = r.plan.maclar.filter((m) => m.a !== f.id && m.b !== f.id);
}

// ---------- Tesisler ----------

export function upgradeTesis(r: PatronRun, id: TesisId): string {
  const lv = r.tesis[id];
  const cost = TESIS[id].maliyet[lv];
  if (cost == null) return L("Bu tesis zaten en üst seviyede.");
  if (r.para < cost) return L("Kasada {0} gerekiyor.", [$(cost)]);
  r.para -= cost;
  r.yil.gider += cost;
  r.tesis[id] = lv + 1;
  if (id === 'akademi' && lv === 0) r.akademiHafta = r.hafta;
  return L("{0} {1}. seviyeye çıktı.", [TESIS[id].ad(), lv + 1]);
}

// ---------- Kart planlama ----------

export const MIN_HAZIRLIK = 3;
export function newPlan(r: PatronRun): Plan {
  const mekan: MekanId = r.itibar >= MEKAN.arena.itibar ? 'arena' : r.itibar >= MEKAN.spor.itibar ? 'spor' : 'salon';
  return { hafta: r.hafta + 4, sehir: r.sehir, mekan, bilet: 1, maclar: [], tanitim: [], bonus: 'standart' };
}
export function ensurePlan(r: PatronRun): Plan {
  r.plan ??= newPlan(r);
  return r.plan;
}
export const busy = (r: PatronRun, id: string) => !!r.plan?.maclar.some((m) => m.a === id || m.b === id);

/** Eşleşmenin neden yapılamadığı (yapılabiliyorsa null) */
export function bookIssue(r: PatronRun, a: PFighter, b: PFighter, unvan: boolean): string | null {
  if (a.id === b.id) return L("Aynı dövüşçü.");
  if (bKey(a) !== bKey(b)) return L("İki dövüşçü aynı sıklette olmalı.");
  if (busy(r, a.id) || busy(r, b.id)) return L("Dövüşçülerden biri bu kartta zaten var.");
  const p = r.plan;
  if (p && (a.sakat > p.hafta - r.hafta || b.sakat > p.hafta - r.hafta)) return L("Dövüşçülerden biri gece tarihine kadar iyileşmiyor.");
  if (a.kalan <= 0 || b.kalan <= 0) return L("Sözleşmesi bitmiş dövüşçü dövüştürülemez. Önce sözleşmeyi yenile.");
  if (unvan) {
    const d = divisionOf(r, bKey(a));
    if (d?.sampiyon && d.sampiyon !== a.id && d.sampiyon !== b.id) return L("Kemer maçında şampiyon olmalı.");
    if (p?.maclar.some((m) => m.unvan && bKey(fighterById(r, m.a)!) === bKey(a))) return L("Bu sıklette kartta zaten bir kemer maçı var.");
  }
  return null;
}

export function addBout(r: PatronRun, a: string, b: string, unvan: boolean): string | null {
  const p = ensurePlan(r);
  const fa = fighterById(r, a);
  const fb = fighterById(r, b);
  if (!fa || !fb) return L("Dövüşçü bulunamadı.");
  const iss = bookIssue(r, fa, fb, unvan);
  if (iss) return iss;
  if (p.maclar.length >= 8) return L("Bir kartta en fazla 8 maç olabilir.");
  p.maclar.push({ a, b, unvan: unvan || undefined });
  return null;
}
export function removeBout(r: PatronRun, i: number) {
  r.plan?.maclar.splice(i, 1);
}
export function makeMain(r: PatronRun, i: number) {
  const p = r.plan;
  if (!p || !p.maclar[i]) return;
  const [m] = p.maclar.splice(i, 1);
  p.maclar.unshift(m);
}
export function toggleTanitim(r: PatronRun, t: TanitimId) {
  const p = ensurePlan(r);
  p.tanitim = p.tanitim.includes(t) ? p.tanitim.filter((x) => x !== t) : [...p.tanitim, t];
}

/** Eşleşmenin bilet çekiciliği (0-100+) */
export function boutDraw(r: PatronRun, m: Mac) {
  const a = fighterById(r, m.a);
  const b = fighterById(r, m.b);
  if (!a || !b) return 0;
  const heat = atesOf(r, a.id, b.id);
  const fark = Math.abs(rankNum(r, a) - rankNum(r, b));
  const close = 1 - Math.min(0.45, fark * 0.05);
  const rov = a.intikam === b.id || b.intikam === a.id ? 1.15 : 1;
  const star = (x: PFighter) => x.un * (x.kisilik === 'yildiz' ? 1.15 : 1);
  const veda = a.veda || b.veda ? 1.3 : 1;
  return ((star(a) + star(b)) / 2) * (1 + heat / 110) * (m.unvan ? 1.35 : 1) * close * rov * veda;
}

/** Eşleşmeye taraftarın ve dövüşçülerin bakışı (kısa açıklama) */
export function boutNote(r: PatronRun, m: Mac): { t: string; iyi: boolean }[] {
  const a = fighterById(r, m.a);
  const b = fighterById(r, m.b);
  if (!a || !b) return [];
  const out: { t: string; iyi: boolean }[] = [];
  const fark = Math.abs(rankNum(r, a) - rankNum(r, b));
  if (fark >= 6) out.push({ t: L("Sıralama farkı büyük: taraftar ilgilenmiyor, üstteki dövüşçü kırgın"), iyi: false });
  else if (fark <= 2) out.push({ t: L("Denk eşleşme: taraftar bunu görmek istiyor"), iyi: true });
  const h = atesOf(r, a.id, b.id);
  if (h >= 50) out.push({ t: L("Aralarında kan davası var (ateş {0})", [h]), iyi: true });
  else if (h >= 20) out.push({ t: L("Aralarında gerginlik var (ateş {0})", [h]), iyi: true });
  if (a.intikam === b.id || b.intikam === a.id) out.push({ t: L("Rövanş maçı"), iyi: true });
  if (GRAPPLE.includes(a.stil) && GRAPPLE.includes(b.stil)) out.push({ t: L("İki güreşçi: yerde sıkıcı geçebilir"), iyi: false });
  if (STRIKE.includes(a.stil) && STRIKE.includes(b.stil)) out.push({ t: L("İki vuruşçu: savaş çıkabilir"), iyi: true });
  return out;
}

export interface Proj {
  seyirci: number;
  kapasite: number;
  talep: number;
  fiyat: number;
  gelir: GeceRapor['gelir'];
  gider: GeceRapor['gider'];
  kar: number;
  guc: number;
}

const localBoost = (r: PatronRun, city: City, ids: string[]) => {
  const ad = COUNTRIES[city.ulke]?.ad ?? '';
  const loc = ids.map((id) => fighterById(r, id)).filter((f) => f && ad && (f.ulke === ad || ad.startsWith(f.ulke))).length;
  return 1 + Math.min(0.45, loc * 0.15) + (city.id === r.sehir ? 0.12 : 0);
};

/** Gecenin tahmini (kart ekranı her değişiklikte bunu gösterir) */
export function projectNight(r: PatronRun, p: Plan = ensurePlan(r)): Proj {
  const city = cityById(p.sehir);
  const mk = MEKAN[p.mekan];
  const draws = p.maclar.map((m) => boutDraw(r, m));
  const guc = draws.length ? draws[0] + draws.slice(1).reduce((s, x) => s + x * 0.22, 0) : 0;
  const fans = 700 + Math.pow(r.itibar, 1.75) * 18 + r.gram.takipci * 0.006;
  const ids = p.maclar.flatMap((m) => [m.a, m.b]);
  const tan = p.tanitim.reduce((s, t) => s + TANITIM[t].ilgi, 0) + (p.duyuru ? 0.05 : 0);
  const clash = p.rakipGece && !p.karsiReklam ? 0.82 : 1;
  const talep = Math.round(fans * (0.35 + guc / 38) * localBoost(r, city, ids) * BILET[p.bilet].talep * (1 + tan) * clash * (p.maclar.length ? 1 : 0));
  const seyirci = Math.min(mk.kap, talep);
  const fiyat = Math.round((25 + r.itibar * 0.85) * BILET[p.bilet].fiyat);
  const sp = r.sponsorlar.reduce((s, x) => s + x.gece, 0);
  const tv = r.yayin ? r.yayin.gece * (1 + r.tesis.produksiyon * 0.12) : r100(400 + r.gram.takipci * 0.004);
  const ppv = r.yayin && YAYIN[r.yayin.id].ppv ? r100(guc * guc * 14 * (1 + r.tesis.produksiyon * 0.15)) : 0;
  const gelir = { bilet: seyirci * fiyat, tv: r100(tv), ppv, sponsor: sp, merch: r100(seyirci * 3 + r.gram.takipci * 0.004), tesvik: p.tesvik ?? 0 };
  const ucret = p.maclar.reduce((s, m) => s + (fighterById(r, m.a)?.ucret ?? 0) + (fighterById(r, m.b)?.ucret ?? 0), 0);
  const bonusOne = r100(Math.max(1_000, ucret * 0.1) * (p.bonus === 'comert' ? 2 : 1));
  const cityCost = ['vegas', 'newyork', 'londra', 'tokyo', 'paris'].includes(city.id) ? 1.35 : 1;
  const gider = {
    mekan: r100(mk.maliyet * cityCost),
    ucret,
    bonus: p.maclar.length ? bonusOne * 2 : 0,
    tanitim: p.tanitim.reduce((s, t) => s + TANITIM[t].maliyet, 0) + (p.karsiReklam ? 10_000 : 0),
    produksiyon: 1_500 + r.tesis.produksiyon * 5_000,
  };
  const g = Object.values(gelir).reduce((s, x) => s + x, 0);
  const c = Object.values(gider).reduce((s, x) => s + x, 0);
  return { seyirci, kapasite: mk.kap, talep, fiyat, gelir, gider, kar: g - c, guc: Math.round(guc) };
}

export function canRun(r: PatronRun): string | null {
  const p = r.plan;
  if (!p || !p.maclar.length) return L("Kartta en az bir maç olmalı.");
  if (p.maclar.length < 2) return L("Bir gece için en az 2 maç gerekiyor.");
  if (MEKAN[p.mekan].itibar > r.itibar) return L("Bu mekân için itibarın yetmiyor.");
  return null;
}

export function setDate(r: PatronRun, hafta: number) {
  const p = ensurePlan(r);
  p.hafta = clamp(hafta, r.hafta + MIN_HAZIRLIK, r.hafta + 12);
}

// ---------- Maç simülasyonu ----------

const YONTEM_KO = [() => L("nakavt"), () => L("teknik nakavt"), () => L("yerde yumruklarla TKO")];
const YONTEM_SUB = [() => L("boğaz kilidi"), () => L("kol kilidi"), () => L("diz bağı")];

function simBout(a: PFighter, b: PFighter, top: number) {
  const ea = a.guc - a.hasar * 0.08 + (a.seri > 0 ? 1 : 0) - (a.sakat > 0 ? 6 : 0);
  const eb = b.guc - b.hasar * 0.08 + (b.seri > 0 ? 1 : 0) - (b.sakat > 0 ? 6 : 0);
  const pa = 1 / (1 + Math.exp(-(ea - eb) / 7));
  const wA = rand() < pa;
  const W = wA ? a : b;
  const Lo = wA ? b : a;
  const strikers = STRIKE.includes(a.stil) && STRIKE.includes(b.stil);
  const finP = clamp(0.4 + Math.abs(ea - eb) * 0.012 + (strikers ? 0.1 : 0) + Math.max(0, Lo.hasar - 40) * 0.004, 0.2, 0.82);
  const fin = chance(finP);
  const grap = GRAPPLE.includes(W.stil);
  let kod: Method;
  let y: string;
  if (fin) {
    if (grap && chance(0.55)) {
      kod = 'SUB';
      y = pick(YONTEM_SUB)();
    } else {
      kod = chance(0.5) ? 'KO' : 'TKO';
      y = kod === 'KO' ? YONTEM_KO[0]() : pick(YONTEM_KO.slice(1))();
    }
  } else {
    kod = chance(0.72) ? 'UD' : 'SD';
    y = kod === 'UD' ? L("oybirliğiyle karar") : L("ayrık karar");
  }
  const ra = fin ? Math.min(top, weighted([[1, 4], [2, 3], [3, 2], [4, 1], [5, 1]] as [number, number][])) : top;
  const upset = (wA ? pa : 1 - pa) < 0.35;
  const perf = clamp(Math.round(38 + (fin ? 24 + (ra === 1 ? 8 : 0) : 0) + 20 * (1 - Math.abs(pa - 0.5) * 2) + (strikers ? 10 : 0) + (upset ? 10 : 0) + (kod === 'SD' ? 6 : 0) + (rand() - 0.5) * 16), 5, 100);
  return { wA, kod, y, ra, perf, upset };
}

function elo(w: PFighter, l: PFighter) {
  const e = 1 / (1 + 10 ** ((l.elo - w.elo) / 400));
  const k = 28;
  w.elo = Math.round(w.elo + k * (1 - e));
  l.elo = Math.round(l.elo - k * (1 - e));
}

const rkOf = (f: PFighter): PRakip => ({ id: f.id, ad: pFullName(f), ulke: f.ulke, stil: f.stil, rekor: pRekor(f), kadin: f.kadin, guc: f.guc });

// ---------- Gece ----------

export function eventName(r: PatronRun, p: Plan, no = r.geceNo + 1) {
  const a = fighterById(r, p.maclar[0]?.a ?? '');
  const b = fighterById(r, p.maclar[0]?.b ?? '');
  return a && b ? `${r.org.kisa} ${no}: ${a.soyad} vs ${b.soyad}` : `${r.org.kisa} ${no}`;
}

function runNight(r: PatronRun): GeceRapor {
  const p = r.plan!;
  const pr = projectNight(r, p);
  const no = r.geceNo + 1;
  const ad = eventName(r, p, no);
  const sonuclar: PSonuc[] = [];
  const notlar: string[] = [];
  p.maclar.forEach((m, i) => {
    const a = fighterById(r, m.a);
    const b = fighterById(r, m.b);
    if (!a || !b) return;
    const unvan = !!m.unvan && !p.unvansiz?.includes(m.a);
    const top = unvan || i === 0 ? 5 : 3;
    const s = simBout(a, b, top);
    const W = s.wA ? a : b;
    const Lo = s.wA ? b : a;
    const d = divisionOf(r, bKey(a));
    let yeni = false;
    if (unvan && d) {
      if (d.sampiyon === W.id) {
        d.savunma++;
        notlar.push(L("🏆 {0} kemerini korudu ({1}. savunma).", [pFullName(W), d.savunma]));
      } else {
        const eski = d.sampiyon ? fighterById(r, d.sampiyon) : undefined;
        if (eski) eski.sampiyon = false;
        d.sampiyon = W.id;
        d.savunma = 0;
        W.sampiyon = true;
        yeni = true;
        r.toplam.unvan++;
        notlar.push(L("👑 YENİ ŞAMPİYON: {0}, {1} kemerini kazandı!", [pFullName(W), bolumAd(d)]));
      }
      d.sonUnvan = r.hafta;
    }
    // Kayıtlar
    const rec = (f: PFighter, o: PFighter, w: boolean): PKayit => ({ id: uid(), h: r.hafta, gece: no, rk: rkOf(o), w, y: s.y, kod: s.kod, ra: s.ra, top, unvan: unvan || undefined, ana: i === 0 || undefined, perf: s.perf });
    W.maclar = [rec(W, Lo, true), ...W.maclar].slice(0, 20);
    Lo.maclar = [rec(Lo, W, false), ...Lo.maclar].slice(0, 20);
    W.g++;
    Lo.m++;
    W.seri = Math.max(1, W.seri + 1);
    Lo.seri = Math.min(-1, Lo.seri - 1);
    elo(W, Lo);
    const fin = s.kod === 'KO' || s.kod === 'TKO' || s.kod === 'SUB';
    W.un = clamp(W.un + 2 + (fin ? 2 : 0) + (unvan ? 4 : 0) + (i === 0 ? 2 : 0) + Math.round(s.perf / 30), 0, 100);
    Lo.un = clamp(Lo.un - (s.perf >= 75 ? 0 : 2), 0, 100);
    W.mutlu = clamp(W.mutlu + 8 + (i === 0 && W.istek === 'ana' ? 6 : 0) + (unvan && W.istek === 'unvan' ? 8 : 0), 0, 100);
    Lo.mutlu = clamp(Lo.mutlu - 4, 0, 100);
    const koLoss = s.kod === 'KO' || s.kod === 'TKO';
    W.hasar = clamp(W.hasar + randInt(3, 8), 0, 100);
    Lo.hasar = clamp(Lo.hasar + (koLoss ? 20 : randInt(7, 13)), 0, 100);
    for (const f of [W, Lo]) {
      f.bosHafta = 0;
      f.kalan = Math.max(0, f.kalan - 1);
      f.soz = undefined;
      const sk = (f === Lo && koLoss ? 0.32 : 0.1) * (1 - r.tesis.performans * 0.15);
      if (chance(sk)) f.sakat = randInt(3, 12);
    }
    if (W.istek === 'aktif' || W.istek === 'ana') W.istek = chance(0.4) ? 'unvan' : W.istek;
    Lo.intikam = W.id;
    if (chance(0.45)) Lo.istek = 'rovans';
    W.intikam = W.intikam === Lo.id ? undefined : W.intikam;
    addAtes(r, W.id, Lo.id, -40);
    sonuclar.push({ a: a.id, b: b.id, aAd: pFullName(a), bAd: pFullName(b), w: s.wA ? 'a' : 'b', y: s.y, kod: s.kod, ra: s.ra, top, unvan: unvan || undefined, perf: s.perf, yeniSampiyon: yeni || undefined });
  });
  // Bonuslar: gecenin maçı (en yüksek performans) ve gecenin performansı (en iyi bitiriş)
  if (sonuclar.length) {
    const best = [...sonuclar].sort((x, y) => y.perf - x.perf)[0];
    best.bonus = 'mac';
    const fin = sonuclar.filter((x) => x !== best && ['KO', 'TKO', 'SUB'].includes(x.kod)).sort((x, y) => y.perf - x.perf)[0];
    if (fin) fin.bonus = 'perf';
    for (const x of sonuclar.filter((s) => s.bonus)) {
      for (const id of x.bonus === 'mac' ? [x.a, x.b] : [x.w === 'a' ? x.a : x.b]) {
        const f = fighterById(r, id);
        if (f) f.mutlu = clamp(f.mutlu + (p.bonus === 'comert' ? 10 : 5), 0, 100);
      }
    }
  }
  // Gelir: tahmin + sponsor şartları + PPV gerçek satış
  const gelir = { ...pr.gelir };
  const finisher = sonuclar.some((x) => x.kod === 'KO' || x.kod === 'TKO');
  for (const s of r.sponsorlar) {
    const ok = s.sart === 'ko' ? finisher : s.sart === 'dolu' ? pr.seyirci >= pr.kapasite * 0.95 : s.sart === 'unvan' ? sonuclar.some((x) => x.unvan) : false;
    if (ok) {
      gelir.sponsor += s.ek;
      notlar.push(L("💼 {0} şartı tuttu: +{1}", [s.marka, $(s.ek)]));
    }
    s.kalan--;
  }
  const ended = r.sponsorlar.filter((s) => s.kalan <= 0);
  for (const s of ended) msg(r, { rol: 'sponsor', kimden: s.marka, metin: L("Anlaşmamız sona erdi. Tekrar çalışmak isteriz, takipte kalın.") });
  r.sponsorlar = r.sponsorlar.filter((s) => s.kalan > 0);
  const avgPerf = sonuclar.reduce((s, x) => s + x.perf, 0) / Math.max(1, sonuclar.length);
  if (gelir.ppv) gelir.ppv = r100(gelir.ppv * (0.75 + avgPerf / 200));
  const gider = { ...pr.gider };
  const g = Object.values(gelir).reduce((s, x) => s + x, 0);
  const c = Object.values(gider).reduce((s, x) => s + x, 0);
  const kar = g - c;
  r.para += kar;
  r.yil.gelir += g;
  r.yil.gider += c;
  r.yil.gece++;
  r.toplam.gelir += g;
  r.toplam.gece++;
  r.toplam.seyirci += pr.seyirci;
  r.toplam.kar += kar;
  if (r.yayin) r.yayin.yapilan++;
  // İtibar
  const dolu = pr.seyirci / pr.kapasite;
  const mainR = sonuclar[0];
  let itD = (avgPerf - 55) / 12 + (dolu >= 0.95 ? 1 : dolu < 0.4 ? -1.5 : 0) + Math.min(1, sonuclar.filter((x) => x.unvan).length * 0.5) + (mainR && mainR.perf >= 75 ? 1 : 0) + p.tanitim.reduce((s, t) => s + TANITIM[t].itibar, 0) + r.tesis.produksiyon * 0.3;
  // Büyüdükçe yavaşlar; küsurat zarla tamamlanır (küçük kazançlar da birikir)
  itD = itD > 0 ? itD * 0.5 * (1 - r.itibar / 120) : itD;
  itD = clamp(Math.floor(itD) + (chance(itD - Math.floor(itD)) ? 1 : 0), -5, 4);
  const cap = itibarCap(r);
  if (itD > 0) itD = Math.min(itD, Math.max(0, cap - r.itibar));
  r.itibar = clamp(r.itibar + itD, 0, 100);
  // Takipçi
  const takD = Math.round(pr.seyirci * 0.35 + avgPerf * 40 + r.gram.takipci * (0.015 + (avgPerf - 50) / 2500) + (p.tanitim.includes('belgesel') ? r.gram.takipci * 0.05 + 1500 : 0));
  r.gram.takipci = Math.max(100, r.gram.takipci + takD);
  const rap: GeceRapor = { no, hafta: r.hafta, ad, sehir: p.sehir, mekan: p.mekan, seyirci: pr.seyirci, kapasite: pr.kapasite, gelir, gider, kar, itibarD: itD, takipciD: takD, sonuclar, notlar };
  r.geceler = [rap, ...r.geceler].slice(0, 12);
  r.geceNo = no;
  nightPosts(r, rap);
  // Doping testi (gecenin galiplerinden biri)
  if (chance(0.05) && sonuclar.length) {
    const x = pick(sonuclar);
    const w = fighterById(r, x.w === 'a' ? x.a : x.b);
    if (w) msg(r, { rol: 'doktor', kimden: L("Doping kontrol birimi"), olay: 'doping', p: { id: w.id, gece: no }, metin: L("Gece sonrası testte {0} pozitif çıktı. Sonucu açıklarsak galibiyeti iptal edilir. Ne yapıyoruz?", [pFullName(w)]), secenekler: [{ k: 'acikla', t: L("Açıkla, cezayı ver"), ipucu: L("İtibar korunur, dövüşçü öfkelenir") }, { k: 'ort', t: L("Sessiz kal"), ipucu: L("Risk: sızarsa büyük skandal") }], son: r.hafta + 2 });
  }
  // Veda maçına çıkanlar emekli olur
  for (const f of r.kadro.filter((x) => x.veda && x.maclar[0]?.gece === no)) {
    notlar.push(L("🧤 {0} eldivenlerini kafesin ortasına bıraktı. Veda.", [pFullName(f)]));
    gramPost(r, { tur: 'organizasyon', yazar: r.org.ad, kullanici: orgHandle(r), metin: L("Teşekkürler {0}. Bir efsane eldivenlerini astı. 🧤", [pFullName(f)]), begeni: likesOf(r, 1) });
    dropFighter(r, f);
  }
  r.plan = undefined;
  return rap;
}

// ---------- Kafesgram (organizasyon hesabı) ----------

export const orgHandle = (r: PatronRun) =>
  '@' +
  r.org.ad
    .toLocaleLowerCase(LOC)
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .normalize('NFD')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 18);
export const fHandle = (f: Pick<PFighter, 'ad' | 'soyad'>) =>
  '@' +
  `${f.ad}${f.soyad}`
    .toLocaleLowerCase(LOC)
    .normalize('NFD')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 18);

const likesOf = (r: PatronRun, k = 1) => Math.round((15 + r.gram.takipci * 0.03) * k * (0.6 + rand() * 0.8));

function gramPost(r: PatronRun, p: Omit<Post, 'id' | 'hafta' | 'begeni'> & { begeni?: number }) {
  r.gram.posts.unshift({ id: uid(), hafta: r.hafta, begeni: p.begeni ?? likesOf(r, 0.3), ...p });
  r.gram.posts = r.gram.posts.slice(0, 50);
}

const FANS = [L("Kafes Aşığı"), L("MMA Ultras"), L("Tribün Kaplanı"), L("Nakavt Avcısı"), L("Yer Oyunu Sever"), L("Kemer Peşinde")];

function welcomePosts(r: PatronRun) {
  gramPost(r, { tur: 'organizasyon', yazar: r.org.ad, kullanici: orgHandle(r), metin: L("Yeni bir organizasyon doğdu: {0}. Kafes hazır, ışıklar yakında yanıyor. 🔥", [r.org.ad]) });
  gramPost(r, { tur: 'taraftar', yazar: pick(FANS), kullanici: '@kafesasigi', metin: L("Yeni organizasyon mu? İlk geceyi görelim, sonra konuşuruz. 👀") });
}

function nightPosts(r: PatronRun, g: GeceRapor) {
  const main = g.sonuclar[0];
  if (main) {
    const w = main.w === 'a' ? main.aAd : main.bAd;
    const l = main.w === 'a' ? main.bAd : main.aAd;
    gramPost(r, { tur: 'hikaye', yazar: L("Gecenin hikâyesi"), kullanici: orgHandle(r), metin: L("🎬 {0}: {1}, {2} karşısında {3}. rauntta {4} ile kazandı. {5} seyirci ayaktaydı.", [g.ad, w, l, main.ra, main.y, g.seyirci.toLocaleString(LOC)]), begeni: likesOf(r, 1.2) });
  }
  for (const x of g.sonuclar.slice(0, 3)) {
    const wf = fighterById(r, x.w === 'a' ? x.a : x.b);
    if (wf && chance(0.7))
      gramPost(r, {
        tur: 'dovuscu',
        yazar: pFullName(wf),
        kullanici: fHandle(wf),
        hedefId: wf.id,
        metin: pick([L("Söylemiştim. Sıradaki kim? 😤"), L("Bu gece {0} kafesi benimdi. Teşekkürler {1}! 🙏", [r.org.kisa, r.org.ad]), L("Ekibime ve taraftara teşekkürler. Daha yeni başlıyoruz."), x.unvan ? L("KEMER EVE GELDİ! 👑") : L("Bir galibiyet daha. Kemer yolu açık.")]),
        begeni: likesOf(r, 0.8),
      });
  }
  gramPost(r, { tur: 'taraftar', yazar: pick(FANS), kullanici: '@tribun', metin: g.sonuclar.some((x) => x.perf >= 75) ? pick([L("Bu organizasyonun geceleri artık kaçmaz! 🔥🔥"), L("Bu kart efsaneydi, bir sonrakinin biletini şimdiden alıyorum!"), L("Ana maç yılın maçı adayı!!")]) : pick([L("Biraz sıkıcıydı açıkçası…"), L("Kart zayıftı, daha büyük isimler istiyoruz."), L("Fena değil ama daha iyisini bekliyoruz.")]), begeni: likesOf(r, 0.2) });
  if (g.itibarD >= 3) gramPost(r, { tur: 'medya', yazar: 'MMA Gündem', kullanici: '@mmagundem', metin: L("{0} yükselişte: {1} gecesi sosyal medyayı salladı.", [r.org.ad, g.ad]) });
}

/** Organizasyonun paylaşabileceği fotoğraf türleri */
export type OrgFoto = 'afis' | 'kemer' | 'zafer' | 'taraftar' | 'sponsor' | 'imza';
export const ORG_FOTO: { id: OrgFoto; ad: () => string; ikon: string }[] = [
  { id: 'afis', ad: () => L("Gece afişi"), ikon: 'image-frame' },
  { id: 'kemer', ad: () => L("Şampiyon"), ikon: 'crown' },
  { id: 'zafer', ad: () => L("Gecenin galibi"), ikon: 'trophy' },
  { id: 'imza', ad: () => L("Yeni imza"), ikon: 'draw-pen' },
  { id: 'taraftar', ad: () => L("Taraftarlar"), ikon: 'account-group' },
  { id: 'sponsor', ad: () => L("Sponsor"), ikon: 'briefcase' },
];
const FOTO_KIND: Record<OrgFoto, PhotoKind> = { afis: 'afis', kemer: 'kemer', zafer: 'zafer', taraftar: 'taraftar', sponsor: 'sponsor', imza: 'antrenman' };
export const kindOfOrgFoto = (k: OrgFoto) => FOTO_KIND[k];
export const orgFotoOf = (k: PhotoKind): OrgFoto => (k === 'antrenman' ? 'imza' : (k as OrgFoto));
export const fotoUsed = (r: PatronRun) => r.gram.sonFoto === r.hafta;
export const proCost = (r: PatronRun) => (r.tesis.medya >= 2 ? 0 : 2_500 + r.itibar * 150);

/** Fotoğrafın konusu olabilecek dövüşçüler */
export function fotoSubjects(r: PatronRun, k: OrgFoto): PFighter[] {
  if (k === 'kemer') return r.kadro.filter((f) => f.sampiyon);
  if (k === 'zafer') {
    const g = r.geceler[0];
    return g && r.hafta - g.hafta <= 2 ? g.sonuclar.map((x) => fighterById(r, x.w === 'a' ? x.a : x.b)).filter(Boolean) as PFighter[] : [];
  }
  if (k === 'imza') return r.kadro.filter((f) => r.hafta - f.katilis <= 3 && f.katilis > 1);
  if (k === 'afis') {
    const m = r.plan?.maclar[0];
    return m ? ([fighterById(r, m.a)].filter(Boolean) as PFighter[]) : [];
  }
  return [...r.kadro].sort((a, b) => b.un - a.un).slice(0, 6);
}
export function fotoLock(r: PatronRun, k: OrgFoto): string | null {
  if (k === 'afis' && !r.plan?.maclar.length) return L("Önce kartın ana maçını belirle.");
  if (k === 'sponsor' && !r.sponsorlar.length) return L("Henüz sponsorun yok.");
  if (k !== 'afis' && k !== 'sponsor' && !fotoSubjects(r, k).length) return k === 'kemer' ? L("Henüz şampiyonun yok.") : k === 'zafer' ? L("Son iki haftada gece yapılmadı.") : k === 'imza' ? L("Son üç haftada imza yok.") : L("Kadron boş.");
  return null;
}

/** Paylaşımın çekiciliği (0-1): türüne ve zamanlamasına göre */
function fotoAppeal(r: PatronRun, k: OrgFoto, f?: PFighter) {
  const son = r.gram.posts.find((p) => p.tur === 'organizasyon' && p.foto)?.foto;
  const tekrar = son && orgFotoOf(son.tur) === k ? 0.6 : 1;
  const star = f ? 0.6 + f.un / 160 : 0.8;
  const base: Record<OrgFoto, number> = {
    afis: r.plan ? clamp(0.55 + (3 - Math.min(3, r.plan.hafta - r.hafta)) * 0.12, 0.4, 0.95) : 0.3,
    kemer: f?.sampiyon && f.maclar[0]?.unvan && r.hafta - f.maclar[0].h <= 2 ? 0.95 : 0.6,
    zafer: 0.75,
    imza: 0.6,
    taraftar: 0.5,
    sponsor: 0.35,
  };
  return clamp(base[k] * star * tekrar, 0.05, 1);
}

export function fotoPreview(r: PatronRun, k: OrgFoto, fid: string | undefined, pro: boolean) {
  const f = fid ? fighterById(r, fid) : undefined;
  const a = fotoAppeal(r, k, f) * (pro ? 1.5 : 1);
  return { cekicilik: Math.round(a * 100), tahmin: Math.round((80 + r.gram.takipci * 0.012) * a * (1 + r.tesis.medya * 0.25)) };
}

export function shareOrgFoto(r: PatronRun, k: OrgFoto, o: { fid?: string; caption?: string; filtre?: number; pro?: boolean }): string {
  if (fotoUsed(r) && k !== 'afis') return L("Bu hafta zaten fotoğraf paylaştın. Afiş hariç haftada bir fotoğraf.");
  const lock = fotoLock(r, k);
  if (lock) return lock;
  const pc = o.pro ? proCost(r) : 0;
  if (r.para < pc) return L("Profesyonel çekim için kasada {0} gerekiyor.", [$(pc)]);
  r.para -= pc;
  r.yil.gider += pc;
  const subj = fotoSubjects(r, k);
  const f = (o.fid ? fighterById(r, o.fid) : undefined) ?? subj[0] ?? [...r.kadro].sort((a, b) => b.un - a.un)[0];
  const a = fotoAppeal(r, k, f) * (o.pro ? 1.5 : 1);
  const viral = chance(a * 0.12 + r.tesis.medya * 0.02);
  const delta = Math.round((80 + r.gram.takipci * 0.012) * a * (1 + r.tesis.medya * 0.25) * (viral ? 3 : 1) * (0.8 + rand() * 0.4));
  r.gram.takipci += delta;
  let rk: PFighter | undefined;
  let ek: PhotoPost['ek'] = {};
  if (k === 'afis' && r.plan?.maclar[0]) {
    rk = fighterById(r, r.plan.maclar[0].b);
    ek = { rakip: rk ? pFullName(rk) : undefined, rakipLook: rk ? pLook(rk) : undefined };
    if (r.plan) r.plan.duyuru = true;
  } else if (k === 'zafer') {
    const x = r.geceler[0]?.sonuclar.find((s) => (s.w === 'a' ? s.a : s.b) === f?.id);
    ek = { yontem: x?.y.toLocaleUpperCase(LOC), rakip: x ? (x.w === 'a' ? x.bAd : x.aAd) : undefined };
  } else if (k === 'sponsor') ek = { marka: r.sponsorlar[0]?.marka };
  const foto: PhotoPost = {
    id: uid(),
    tur: FOTO_KIND[k],
    hafta: r.hafta,
    aciklama: (o.caption ?? '').trim(),
    begeni: Math.round(delta * (2 + rand() * 2) + r.gram.takipci * 0.02),
    yorumSay: Math.round(delta * 0.15 + 3),
    yorumlar: [{ yazar: pick(FANS), metin: pick(COMMENT[k]) }],
    filtre: o.filtre ?? 0,
    pro: o.pro || undefined,
    viral: viral || undefined,
    delta,
    sahip: f?.id,
    look: f ? pLook(f) : undefined,
    ek,
  };
  r.gram.posts.unshift({ id: uid(), yazar: r.org.ad, kullanici: orgHandle(r), tur: 'organizasyon', metin: foto.aciklama, hafta: r.hafta, begeni: foto.begeni, foto });
  r.gram.posts = r.gram.posts.slice(0, 50);
  r.gram.say++;
  if (k !== 'afis') r.gram.sonFoto = r.hafta;
  if (f && (k === 'kemer' || k === 'zafer' || k === 'imza')) f.mutlu = clamp(f.mutlu + 3, 0, 100);
  return viral ? L("🚀 Paylaşım keşfete düştü! +{0} takipçi", [delta.toLocaleString(LOC)]) : L("Paylaşıldı: +{0} takipçi", [delta.toLocaleString(LOC)]);
}

const COMMENT: Record<OrgFoto, string[]> = {
  afis: [L("Bu kartı kaçırmam! 🔥"), L("Biletler ne zaman satışta?"), L("Ana maç efsane olacak.")],
  kemer: [L("Gerçek şampiyon 👑"), L("Bu kemer ona çok yakışıyor."), L("Kimse onu yenemez!")],
  zafer: [L("Ne nakavttı ama!"), L("Geri sar, geri sar!"), L("Bu adam/kadın bir makine.")],
  imza: [L("Harika transfer!"), L("Hoş geldin! 💪"), L("Bu imza her şeyi değiştirir.")],
  taraftar: [L("Ben de oradaydım! 🙌"), L("En iyi taraftar bizde."), L("Atmosfer inanılmazdı.")],
  sponsor: [L("Reklam mı bu? 😅"), L("Ürün iyiymiş."), L("Para lazım tabii.")],
};

export type YaziKat = 'duyuru' | 'kizistir' | 'tebrik' | 'soru';
export const YAZI_KAT: Record<YaziKat, { ad: () => string; ikon: string }> = {
  duyuru: { ad: () => L("Duyuru"), ikon: 'bullhorn' },
  kizistir: { ad: () => L("Ateşi yak"), ikon: 'fire' },
  tebrik: { ad: () => L("Tebrik"), ikon: 'hand-clap' },
  soru: { ad: () => L("Taraftara sor"), ikon: 'comment-question' },
};
export function yaziFikir(r: PatronRun, k: YaziKat): string[] {
  const m = r.plan?.maclar[0];
  const a = m ? fighterById(r, m.a) : undefined;
  const b = m ? fighterById(r, m.b) : undefined;
  const sehir = r.plan ? cityById(r.plan.sehir).ad : cityById(r.sehir).ad;
  const ch = r.kadro.find((f) => f.sampiyon);
  const last = r.geceler[0]?.sonuclar[0];
  switch (k) {
    case 'duyuru':
      return a && b
        ? [L("RESMİ: {0} vs {1}, {2} hafta sonra, {3}! Biletler satışta. 🎟️", [a.soyad, b.soyad, Math.max(0, r.plan!.hafta - r.hafta), sehir]), L("Ana maç belli oldu: {0} ile {1} kafeste karşılaşıyor. Kaçırma!", [pFullName(a), pFullName(b)])]
        : [L("Büyük bir duyuru geliyor… Takipte kalın. 👀"), L("Yeni gece için şehir seçildi: {0}. Kart çok yakında!", [sehir])];
    case 'kizistir':
      return a && b ? [L("{0}, {1} için “sıradan” dedi. {1}, cevabın?", [a.soyad, b.soyad]), L("Biri bu gece sözlerini yutacak. {0} mi {1} mi? 🔥", [a.soyad, b.soyad])] : [L("Kim kimi çağırıyor? Kafes konuşulanları kaldırmaz. 🔥")];
    case 'tebrik':
      return last ? [L("Tebrikler {0}! Bu gece kafesin sahibi sendin. 👏", [last.w === 'a' ? last.aAd : last.bAd]), ch ? L("Şampiyonumuz {0}: gurur duyuyoruz. 👑", [pFullName(ch)]) : L("Bütün dövüşçülerimize teşekkürler. 🙏")] : [L("Bütün dövüşçülerimize teşekkürler. 🙏")];
    case 'soru':
      return [L("Sıradaki ana maçı siz seçin: kimi görmek istersiniz? 👇"), L("Bir sonraki geceyi hangi şehirde yapalım? 🌍"), ch ? L("{0} kemerini kime karşı korumalı?", [ch.soyad]) : L("İlk kemer maçı hangi sıklette olmalı?")];
  }
}

export function postYazi(r: PatronRun, k: YaziKat, metin: string): string {
  const t = metin.trim();
  if (!t) return '';
  const sonYazi = r.gram.posts.find((p) => p.tur === 'organizasyon' && !p.foto);
  if (sonYazi && sonYazi.hafta === r.hafta && r.gram.posts.filter((p) => p.tur === 'organizasyon' && !p.foto && p.hafta === r.hafta).length >= 2) return L("Bu hafta yeterince yazı paylaştın. Takipçiler spam sevmez.");
  let d = Math.round((30 + r.gram.takipci * 0.004) * (0.7 + rand() * 0.6));
  let out = '';
  const m = r.plan?.maclar[0];
  if (k === 'duyuru' && r.plan && !r.plan.duyuru && m) {
    r.plan.duyuru = true;
    out = L("Kart duyuruldu: gece ilgisi arttı.");
  } else if (k === 'kizistir' && m) {
    addAtes(r, m.a, m.b, 8);
    d = Math.round(d * 1.4);
    out = L("Ateş yükseldi: ana maçın gerginliği arttı.");
    if (chance(0.15)) {
      r.itibar = clamp(r.itibar - 1, 0, 100);
      out += ' ' + L("Bazı taraftarlar fazla buldu (itibar -1).");
    }
  } else if (k === 'soru') d = Math.round(d * 1.6);
  r.gram.takipci += d;
  gramPost(r, { tur: 'organizasyon', yazar: r.org.ad, kullanici: orgHandle(r), metin: t, begeni: likesOf(r, 0.6) });
  const p = r.gram.posts[0];
  p.yanitlar = [{ yazar: pick(FANS), metin: pick([L("🔥🔥🔥"), L("Biletimi aldım!"), L("Bu organizasyon başka seviyede."), L("Sonunda!")]) }];
  return (out ? out + ' ' : '') + L("+{0} takipçi", [d.toLocaleString(LOC)]);
}

export type YanitTon = 'kizistir' | 'yatistir' | 'paylas';
export const YANIT_TON: Record<YanitTon, { ad: () => string; ikon: string }> = {
  kizistir: { ad: () => L("Kışkırt"), ikon: 'fire' },
  yatistir: { ad: () => L("Yatıştır"), ikon: 'hand-peace' },
  paylas: { ad: () => L("Hikâyende paylaş"), ikon: 'share' },
};
export function replyFighterPost(r: PatronRun, postId: string, ton: YanitTon): string {
  const p = r.gram.posts.find((x) => x.id === postId);
  if (!p || p.yanitlandi || !p.hedefId) return '';
  const f = fighterById(r, p.hedefId);
  p.yanitlandi = true;
  const target = (p as Post & { hedef2?: string }).hedef2;
  if (ton === 'kizistir') {
    if (f && target) addAtes(r, f.id, target, 12);
    if (f) f.mutlu = clamp(f.mutlu + (f.kisilik === 'kavgaci' || f.kisilik === 'yildiz' ? 4 : -2), 0, 100);
    p.yanitlar = [...(p.yanitlar ?? []), { yazar: r.org.ad, metin: L("Sözler ucuz. Kafeste görüşürüz. 🔥") }];
    r.gram.takipci += Math.round(60 + r.gram.takipci * 0.004);
    return target ? L("Ateş yükseldi (+12). Bu ikisinin maçı artık daha çok satar.") : L("Taraftar coştu, takipçi geldi.");
  }
  if (ton === 'yatistir') {
    if (f && target) addAtes(r, f.id, target, -10);
    if (f) f.mutlu = clamp(f.mutlu + 6, 0, 100);
    p.yanitlar = [...(p.yanitlar ?? []), { yazar: r.org.ad, metin: L("Saygı her şeyden önce gelir. 🤝") }];
    r.itibar = clamp(r.itibar + (chance(0.3) ? 1 : 0), 0, 100);
    return L("Ortam sakinleşti. Dövüşçü desteğini takdir etti.");
  }
  const d = Math.round(40 + r.gram.takipci * 0.006 + (f?.un ?? 0) * 8);
  r.gram.takipci += d;
  if (f) {
    f.un = clamp(f.un + 1, 0, 100);
    f.mutlu = clamp(f.mutlu + 3, 0, 100);
  }
  p.yanitlar = [...(p.yanitlar ?? []), { yazar: r.org.ad, metin: '💯' }];
  return L("Hikâyende paylaştın: +{0} takipçi, dövüşçünün şöhreti arttı.", [d.toLocaleString(LOC)]);
}

/** Rakip organizasyonların takipçi sayısı (sıralama tablosu için) */
export const rivalFollowers = (o: RakipOrg) => Math.round(Math.pow(o.itibar, 2.6) * 22);
export function followerBoard(r: PatronRun) {
  const rows = r.rakipler.map((o) => ({ ad: orgAdi(o.id), takipci: rivalFollowers(o), ben: false }));
  rows.push({ ad: r.org.ad, takipci: r.gram.takipci, ben: true });
  return rows.sort((a, b) => b.takipci - a.takipci);
}

function gramTick(r: PatronRun) {
  const g = r.gram;
  g.takipci = Math.max(100, Math.round(g.takipci + 10 + g.takipci * (0.002 + r.itibar / 40000) * (1 + r.tesis.medya * 0.3)));
  // Dövüşçü paylaşımları: meydan okuma, şikâyet, antrenman
  const k = r.kadro.filter((f) => !f.sakat);
  if (k.length >= 2 && chance(0.75)) {
    const f = pick(k);
    const rivals = r.kadro.filter((x) => x.id !== f.id && bKey(x) === bKey(f));
    const champ = rivals.find((x) => x.sampiyon);
    const t = f.sampiyon ? pick(rivals) : (champ && f.istek === 'unvan' ? champ : f.intikam ? fighterById(r, f.intikam) : pick(rivals));
    if (t && (f.kisilik === 'kavgaci' || f.kisilik === 'yildiz' || chance(0.4))) {
      const metin = f.sampiyon
        ? pick([L("Sıklette kimse kalmadı mı? {0}, sen de mi korkuyorsun? 👑", [fHandle(t)]), L("Kemer burada. Gelip almak isteyen {0} olsun.", [fHandle(t)])])
        : f.intikam === t.id
          ? pick([L("{0}, o gece şanslıydın. Rövanşı ver de görelim.", [fHandle(t)]), L("Hesap kapanmadı {0}. 😤", [fHandle(t)])])
          : pick([L("{0} abartılıyor. Kafeste 2 dakika dayanmaz.", [fHandle(t)]), L("{0}, kaçmayı bırak da şu maçı yapalım. {1} bu maçı ayarlasın!", [fHandle(t), orgHandle(r)]), L("Sıradaki kurban: {0} 🎯", [fHandle(t)])]);
      gramPost(r, { tur: 'dovuscu', yazar: pFullName(f), kullanici: fHandle(f), metin, hedefId: f.id, begeni: Math.round(30 + f.un * 40 * (0.6 + rand() * 0.8)) });
      (r.gram.posts[0] as Post & { hedef2?: string }).hedef2 = t.id;
      addAtes(r, f.id, t.id, 4);
    } else if (f.mutlu < 35 && chance(0.5)) {
      gramPost(r, { tur: 'dovuscu', yazar: pFullName(f), kullanici: fHandle(f), metin: pick([L("Bazı patronlar dövüşçüye değil paraya bakıyor… 🤐"), L("Aylardır maç bekliyorum. Hâlâ bekliyorum."), L("Başka yerlerden teklif alıyorum. Düşünüyorum.")]), hedefId: f.id });
      r.itibar = clamp(r.itibar - (chance(0.3) ? 1 : 0), 0, 100);
    } else if (chance(0.5)) {
      gramPost(r, { tur: 'dovuscu', yazar: pFullName(f), kullanici: fHandle(f), metin: pick([L("Kamp günü 🥊 Ter yalan söylemez."), L("Sabah 6, koşu bitti. Sıradaki?"), L("Hazırım. Patron, ara beni! 📞")]), hedefId: f.id });
    }
  }
  if (chance(0.35)) {
    const lider = [...r.rakipler].sort((a, b) => b.itibar - a.itibar).find((o) => o.itibar > r.itibar);
    gramPost(r, {
      tur: 'medya',
      yazar: 'MMA Gündem',
      kullanici: '@mmagundem',
      metin: pick([
        L("Kulis: {0} kadrosunu genişletmek için yeni yıldız arıyor.", [r.org.ad]),
        lider ? L("{0} mi {1} mi? Organizasyonlar savaşında son durum: {1} hâlâ önde.", [r.org.ad, orgAdi(lider.id)]) : L("{0} artık dünyanın bir numarası. Kim durduracak?", [r.org.ad]),
        L("Haftanın sorusu: {0} gelecek gece nereye gidecek?", [r.org.ad]),
      ]),
    });
  }
  if (chance(0.3)) newDm(r);
}

// DM'ler (organizasyon hesabına)
interface DmDef {
  rol: PDmRol;
  kosul?: (r: PatronRun) => boolean;
  yap: (r: PatronRun) => Omit<PDm, 'id' | 'hafta' | 'rol' | 'olay'> | null;
  cevap: (r: PatronRun, d: PDm, i: number) => string;
}
const DMS: Record<string, DmDef> = {
  unlu: {
    rol: 'unlu',
    kosul: (r) => r.gram.takipci > 20_000 && !!r.plan,
    yap: () => ({ kimden: pick(['Rap Kral', 'DJ Volkan', 'Influencer Selin', 'Oyuncu Kerem']), metin: L("Selam! Gelecek gecenizde kafes kenarında oturmak isterim. Hikâyemde paylaşırım, söz. 😎"), secenekler: [L("Ön sıra senin (5.000 $ ağırlama)"), L("Kusura bakma, yer yok")] }),
    cevap: (r, d, i) => {
      if (i === 0) {
        r.para -= 5_000;
        const t = Math.round(800 + r.gram.takipci * 0.04);
        r.gram.takipci += t;
        return L("{0} kafes kenarındaydı, herkes paylaştı: +{1} takipçi.", [d.kimden, t.toLocaleString(LOC)]);
      }
      return L("Nazikçe reddettin.");
    },
  },
  gazeteci: {
    rol: 'gazeteci',
    yap: (r) => ({ kimden: pick(['Arda Kılıç (MMA Gündem)', 'Sofia Reyes (Fight Daily)', 'Tom Hale (Cage Report)']), metin: L("{0} hakkında bir özel haber hazırlıyorum. Bana bir kulis bilgisi verir misin?", [r.org.ad]), secenekler: [L("Gelecek ana maçı ona özel ver"), L("Yorum yok")] }),
    cevap: (r, _d, i) => {
      if (i === 0 && r.plan) {
        r.plan.duyuru = true;
        r.itibar = clamp(r.itibar + 1, 0, 100);
        return L("Haber patladı: kart gündem oldu, itibar +1.");
      }
      return i === 0 ? L("Henüz planlanmış bir gece yok, haber çıkmadı.") : L("Gazeteci başka bir organizasyonu yazdı.");
    },
  },
  hayran: {
    rol: 'hayran',
    yap: () => ({ kimden: pick(FANS), metin: L("Bütün gecelerinizi izliyorum! Küçük bir hediye ya da imzalı eldiven mümkün mü? 🙏"), secenekler: [L("İmzalı eldiven gönder"), L("Teşekkür et")] }),
    cevap: (r, _d, i) => {
      if (i === 0) {
        r.para -= 300;
        r.gram.takipci += 150;
        return L("Hayran paylaştı, herkes organizasyonu konuştu: +150 takipçi.");
      }
      return L("Hayran teşekkürüne sevindi.");
    },
  },
  troll: {
    rol: 'troll',
    yap: (r) => ({ kimden: '@kafes_trolu', metin: L("{0} = amatör ligi 😂 Dövüşçüleriniz sokakta bile kaybeder.", [r.org.kisa]), secenekler: [L("Sert cevap ver"), L("Görmezden gel")] }),
    cevap: (r, _d, i) => {
      if (i === 0) {
        if (chance(0.5)) {
          r.gram.takipci += 400;
          return L("Cevabın viral oldu: +400 takipçi.");
        }
        r.itibar = clamp(r.itibar - 1, 0, 100);
        return L("Tartışma büyüdü, organizasyon kötü göründü (itibar -1).");
      }
      return L("Trol sıkılıp gitti.");
    },
  },
  dovuscu: {
    rol: 'dovuscu',
    kosul: (r) => r.kadro.some((f) => f.istek === 'unvan' && !f.sampiyon),
    yap: (r) => {
      const f = pick(r.kadro.filter((x) => x.istek === 'unvan' && !x.sampiyon));
      return { kimden: pFullName(f), metin: L("Patron, kemer şansımı ne zaman alacağım? Sıradaki büyük maç benim olmalı."), secenekler: [L("Söz, sıradaki kartta seni koyacağım"), L("Önce bir galibiyet daha")], p: { id: f.id } };
    },
    cevap: (r, d, i) => {
      const f = fighterById(r, String(d.p?.id));
      if (!f) return '';
      if (i === 0) {
        f.soz = r.hafta + 8;
        f.mutlu = clamp(f.mutlu + 10, 0, 100);
        return L("{0} sözüne güveniyor. 8 hafta içinde kartta olmazsa güveni sarsılır.", [f.soyad]);
      }
      f.mutlu = clamp(f.mutlu - 3, 0, 100);
      return L("{0} anladığını söyledi ama pek mutlu değil.", [f.soyad]);
    },
  },
};

function newDm(r: PatronRun) {
  const keys = Object.keys(DMS).filter((k) => DMS[k].kosul?.(r) ?? true);
  if (!keys.length) return;
  const k = pick(keys);
  const d = DMS[k].yap(r);
  if (!d) return;
  r.gram.dm.unshift({ id: uid(), hafta: r.hafta, rol: DMS[k].rol, olay: k, ...d });
  r.gram.dm = r.gram.dm.slice(0, 25);
}
export const dmUnread = (r: PatronRun) => r.gram.dm.filter((d) => !d.okundu).length;
export function answerDm(r: PatronRun, id: string, i: number): string {
  const d = r.gram.dm.find((x) => x.id === id);
  if (!d || d.cevap != null) return '';
  if (r.hafta - d.hafta > 6) return L("Bu mesajın zamanı geçti.");
  d.cevap = i;
  d.sonuc = DMS[d.olay]?.cevap(r, d, i) ?? '';
  return d.sonuc;
}
export function readDm(r: PatronRun, id: string) {
  const d = r.gram.dm.find((x) => x.id === id);
  if (d) d.okundu = true;
}

// ---------- Olaylar (Ofis) ----------

type Handler = (r: PatronRun, m: PMesaj, k: string) => string;
const H: Record<string, Handler> = {
  doping: (r, m, k) => {
    const f = fighterById(r, String(m.p?.id));
    if (!f) return '';
    if (k === 'acikla') {
      f.g = Math.max(0, f.g - 1);
      f.un = clamp(f.un - 12, 0, 100);
      f.mutlu = clamp(f.mutlu - 25, 0, 100);
      f.sakat = Math.max(f.sakat, 12);
      r.itibar = clamp(r.itibar + 2, 0, 100);
      gramPost(r, { tur: 'organizasyon', yazar: r.org.ad, kullanici: orgHandle(r), metin: L("Açıklama: {0} doping testinde pozitif çıktı, galibiyeti iptal edildi. Temiz spor her şeyden önce gelir.", [pFullName(f)]) });
      return L("Açıkladın: dövüşçü 12 hafta men edildi, şeffaflığın takdir gördü (itibar +2).");
    }
    if (chance(0.35)) {
      r.itibar = clamp(r.itibar - 12, 0, 100);
      r.gram.takipci = Math.round(r.gram.takipci * 0.9);
      gramPost(r, { tur: 'medya', yazar: 'MMA Gündem', kullanici: '@mmagundem', metin: L("SKANDAL: {0} bir doping testini gizledi! Testi pozitif çıkan isim: {1}.", [r.org.ad, pFullName(f)]) });
      return L("Haber sızdı! Büyük skandal: itibar -12, takipçiler gidiyor.");
    }
    return L("Şimdilik kimse duymadı…");
  },
  sakatlik: (r, m, k) => {
    const f = fighterById(r, String(m.p?.id));
    const p = r.plan;
    if (!f || !p) return L("Plan değişti, konu kapandı.");
    const i = p.maclar.findIndex((x) => x.a === f.id || x.b === f.id);
    if (i < 0) return L("Plan değişti, konu kapandı.");
    const mac = p.maclar[i];
    const rakipId = mac.a === f.id ? mac.b : mac.a;
    if (k === 'yedek') {
      const rakip = fighterById(r, rakipId)!;
      const yedek = ranking(r, bKey(f)).find((x) => x.id !== rakipId && !busy(r, x.id) && x.sakat <= 0 && x.kalan > 0);
      if (!yedek) {
        p.maclar.splice(i, 1);
        return L("Uygun yedek yok, maç karttan çıktı.");
      }
      p.maclar[i] = { a: rakipId, b: yedek.id, unvan: mac.unvan && !!divisionOf(r, bKey(f))?.sampiyon && divisionOf(r, bKey(f))!.sampiyon === rakipId ? true : undefined };
      yedek.mutlu = clamp(yedek.mutlu + 10, 0, 100);
      yedek.ucret = r100(yedek.ucret * 1.2);
      return L("{0} kısa sürede maçı kabul etti: {1} vs {2}. Kısa süre primi verildi.", [pFullName(yedek), rakip.soyad, yedek.soyad]);
    }
    p.maclar.splice(i, 1);
    const rk = fighterById(r, rakipId);
    if (rk) rk.mutlu = clamp(rk.mutlu - 8, 0, 100);
    return L("Maç karttan çıkarıldı.");
  },
  kilo: (r, m, k) => {
    const p = r.plan;
    const f = fighterById(r, String(m.p?.id));
    if (!p || !f) return '';
    const i = p.maclar.findIndex((x) => x.a === f.id || x.b === f.id);
    if (i < 0) return '';
    if (k === 'devam') {
      p.unvansiz = [...(p.unvansiz ?? []), p.maclar[i].a];
      f.ucret = r100(f.ucret * 0.8);
      f.mutlu = clamp(f.mutlu - 5, 0, 100);
      return L("Maç devam ediyor. Ücretinin %20'si rakibine verildi.");
    }
    p.maclar.splice(i, 1);
    r.itibar = clamp(r.itibar - 1, 0, 100);
    return L("Maç iptal. Taraftar hayal kırıklığında (itibar -1).");
  },
  zam: (r, m, k) => {
    const f = fighterById(r, String(m.p?.id));
    if (!f) return '';
    if (k === 'ver') {
      f.ucret = r100(f.ucret * 1.3);
      f.mutlu = clamp(f.mutlu + 10, 0, 100);
      return L("{0} mutlu, kampına döndü. Ücreti artık {1}.", [f.soyad, $(f.ucret)]);
    }
    if (chance(f.kisilik === 'paragoz' ? 0.6 : 0.35)) {
      if (r.plan) r.plan.maclar = r.plan.maclar.filter((x) => x.a !== f.id && x.b !== f.id);
      f.mutlu = clamp(f.mutlu - 20, 0, 100);
      return L("{0} maçtan çekildi! Kartını yeniden düzenle.", [f.soyad]);
    }
    f.mutlu = clamp(f.mutlu - 10, 0, 100);
    return L("{0} söylendi ama maça çıkacak.", [f.soyad]);
  },
  kavga: (r, m, k) => {
    const a = fighterById(r, String(m.p?.a));
    const b = fighterById(r, String(m.p?.b));
    if (!a || !b) return '';
    if (k === 'ceza') {
      a.mutlu = clamp(a.mutlu - 8, 0, 100);
      b.mutlu = clamp(b.mutlu - 8, 0, 100);
      r.itibar = clamp(r.itibar + 1, 0, 100);
      return L("İki dövüşçüye de para cezası kestin. Ciddiyetin takdir gördü.");
    }
    addAtes(r, a.id, b.id, 20);
    r.gram.takipci += Math.round(500 + r.gram.takipci * 0.03);
    r.itibar = clamp(r.itibar - 1, 0, 100);
    gramPost(r, { tur: 'organizasyon', yazar: r.org.ad, kullanici: orgHandle(r), metin: L("Görüntüler ortada. {0} vs {1}: bu iş kafeste bitecek. 🔥", [a.soyad, b.soyad]) });
    return L("Görüntüleri paylaştın: viral oldu, ateş tavan. Ama bazıları bunu ucuz buldu (itibar -1).");
  },
  rakipTeklif: (r, m, k) => {
    const f = fighterById(r, String(m.p?.id));
    if (!f) return '';
    const o = String(m.p?.org) as OrgId;
    if (k === 'esle') {
      const yeni = Number(m.p?.ucret);
      f.ucret = yeni;
      f.kalan += 4;
      f.mutlu = clamp(f.mutlu + 12, 0, 100);
      return L("Teklifi eşledin: {0} kaldı. Yeni ücreti {1}, sözleşmesine 4 maç eklendi.", [f.soyad, $(yeni)]);
    }
    dropFighter(r, f);
    const ro = r.rakipler.find((x) => x.id === o);
    if (ro) ro.itibar = clamp(ro.itibar + (f.un >= 50 ? 2 : 1), 0, 99);
    gramPost(r, { tur: 'medya', yazar: 'MMA Gündem', kullanici: '@mmagundem', metin: L("{0}, {1} kadrosundan ayrılıp {2} ile imzaladı.", [pFullName(f), r.org.ad, orgAdi(o)]) });
    return L("{0} gitti, yeni adresi {1}.", [pFullName(f), orgAdi(o)]);
  },
  yenile: (r, m, k) => {
    const f = fighterById(r, String(m.p?.id));
    if (!f) return '';
    const ist = Number(m.p?.ucret);
    if (k === 'kabul') {
      f.ucret = ist;
      f.kalan = 4;
      f.mutlu = clamp(f.mutlu + 8, 0, 100);
      return L("{0} 4 maçlık yeni sözleşme imzaladı: maç başı {1}.", [f.soyad, $(ist)]);
    }
    if (k === 'pazarlik') {
      if (chance(f.kisilik === 'sadik' ? 0.8 : f.kisilik === 'paragoz' ? 0.3 : 0.55)) {
        f.ucret = r100((ist + f.ucret) / 2);
        f.kalan = 4;
        f.mutlu = clamp(f.mutlu - 3, 0, 100);
        return L("Ortada buluştunuz: {0}, maç başı {1} ile 4 maç daha imzaladı.", [f.soyad, $(f.ucret)]);
      }
      dropFighter(r, f);
      return L("{0} pazarlığı kabul etmedi ve organizasyondan ayrıldı.", [pFullName(f)]);
    }
    dropFighter(r, f);
    return L("{0} ile yollar ayrıldı.", [pFullName(f)]);
  },
  yayinTeklif: (r, m, k) => {
    const id = String(m.p?.id) as YayinId;
    const d = YAYIN[id];
    if (k === 'red') return L("Teklifi reddettin.");
    let gece = d.gece;
    if (k === 'pazarlik') {
      if (chance(0.5 + r.itibar / 300)) gece = r100(gece * 1.2);
      else return L("{0} pazarlıktan çekildi. Teklif masadan kalktı.", [d.ad()]);
    }
    r.yayin = { id, gece, min: d.min, basla: r.hafta, bitis: r.hafta + 52, yapilan: 0 };
    r.itibar = clamp(r.itibar + 2, 0, 100);
    gramPost(r, { tur: 'organizasyon', yazar: r.org.ad, kullanici: orgHandle(r), metin: L("RESMİ: Gecelerimiz artık {0} ekranlarında! 📺", [d.ad()]) });
    return L("Anlaşma imzalandı: gece başı {0}, yılda en az {1} gece.", [$(gece), d.min]);
  },
  sponsorTeklif: (r, m, k) => {
    if (k === 'red') return L("Teklifi reddettin.");
    const s: Sponsor = { id: uid(), marka: String(m.p?.marka), gece: Number(m.p?.gece), kalan: Number(m.p?.kalan), sart: String(m.p?.sart) as SponsorSart, ek: Number(m.p?.ek) };
    if (r.sponsorlar.length >= 3) return L("En fazla 3 sponsorla çalışabilirsin.");
    r.sponsorlar.push(s);
    return L("{0} ile anlaşma: gece başı {1}, {2} gece.", [s.marka, $(s.gece), s.kalan]);
  },
  menajer: (r, m, k) => {
    if (k === 'red') return L("Teklifi geri çevirdin.");
    const a = r.adaylar.find((x) => x.id === String(m.p?.id));
    if (!a) return L("Dövüşçü çoktan başka yerle anlaşmış.");
    return signCandidate(r, a.id, 'adil', 3);
  },
  sikayet: (r, m, k) => {
    const f = fighterById(r, String(m.p?.id));
    if (!f) return '';
    if (k === 'soz') {
      f.soz = r.hafta + 6;
      f.mutlu = clamp(f.mutlu + 8, 0, 100);
      return L("Söz verdin: {0} 6 hafta içinde maç yapacak.", [f.soyad]);
    }
    if (k === 'serbest') return releaseFighter(r, f.id);
    f.mutlu = clamp(f.mutlu - 10, 0, 100);
    return L("{0} görmezden gelindiğini düşünüyor.", [f.soyad]);
  },
  sehirTeklif: (r, m, k) => {
    if (k === 'red') return L("Teşekkür edip reddettin.");
    const p = ensurePlan(r);
    p.sehir = String(m.p?.sehir);
    p.tesvik = Number(m.p?.para);
    return L("Gelecek gecenin şehri: {0}. Şehir {1} teşvik ödeyecek.", [cityById(p.sehir).ad, $(p.tesvik)]);
  },
  rakipGece: (r, m, k) => {
    const p = r.plan;
    if (!p) return '';
    if (k === 'kaydir') {
      p.hafta += 1;
      p.rakipGece = undefined;
      return L("Geceyi bir hafta kaydırdın. Çakışma yok.");
    }
    if (k === 'karsi') {
      p.karsiReklam = true;
      return L("Karşı reklam kampanyası: 10.000 $. Çakışmanın etkisi silinecek.");
    }
    return L("Aynı hafta savaş: satışlar biraz düşebilir.");
  },
  yatirimci: (r, m, k) => {
    if (k === 'red') return L("Organizasyonun tamamı hâlâ senin.");
    const para = Number(m.p?.para);
    r.para += para;
    r.hedefKacti = Math.max(0, r.hedefKacti - 1);
    return L("{0} kasaya girdi. Karşılığında yatırımcı yıllık hedeflerini daha yakından izleyecek.", [$(para)]);
  },
  ucc: (r, m, k) => {
    if (k === 'red') {
      r.itibar = clamp(r.itibar + 2, 0, 100);
      gramPost(r, { tur: 'medya', yazar: 'MMA Gündem', kullanici: '@mmagundem', metin: L("ŞOK: {0}, UCC'nin dev satın alma teklifini reddetti!", [r.org.ad]) });
      return L("Reddettin. Dünya senin cesaretini konuşuyor (itibar +2).");
    }
    r.satis = Number(m.p?.para);
    r.kapandi = 'satis';
    return L("Organizasyonu sattın: {0}. Efsane bir hikâye.", [$(r.satis)]);
  },
  emeklilik: (r, m, k) => {
    const f = fighterById(r, String(m.p?.id));
    if (!f) return '';
    if (k === 'veda') {
      f.kalan = Math.max(1, f.kalan);
      f.istek = 'ana';
      f.mutlu = 100;
      f.veda = true;
      return L("{0} son kez kafese çıkacak. Onu ana maça koy: veda gecesi bilet sattırır.", [f.soyad]);
    }
    dropFighter(r, f);
    return L("{0} eldivenlerini astı. Teşekkürler şampiyon.", [pFullName(f)]);
  },
  superMac: (r, m, k) => {
    if (k === 'red') return L("Süper maç fikri rafa kalktı.");
    const a = fighterById(r, String(m.p?.a));
    const b = fighterById(r, String(m.p?.b));
    if (!a || !b) return '';
    addAtes(r, a.id, b.id, 35);
    a.un = clamp(a.un + 3, 0, 100);
    b.un = clamp(b.un + 3, 0, 100);
    return L("Süper maç dedikodusu başladı. {0} ile {1} arasında ateş yükseldi. Biri sıklet değiştirirse büyük gece olur.", [a.soyad, b.soyad]);
  },
  unvanSavunma: (r, m, k) => {
    const d = divisionOf(r, String(m.p?.key));
    const f = d?.sampiyon ? fighterById(r, d.sampiyon) : undefined;
    if (!d || !f) return '';
    if (k === 'al') {
      f.sampiyon = false;
      d.sampiyon = undefined;
      d.savunma = 0;
      f.mutlu = clamp(f.mutlu - 30, 0, 100);
      return L("{0} artık şampiyon değil: kemer elinden alındı. İki üst sıradaki dövüşçüyü kemer maçında eşle.", [f.soyad]);
    }
    f.soz = r.hafta + 8;
    d.sonUnvan = r.hafta - 10;
    return L("Şampiyona 8 hafta süre verdin.");
  },
};

export function answer(r: PatronRun, id: string, k: string) {
  const m = r.mesajlar.find((x) => x.id === id);
  if (!m || m.cevap) return;
  m.cevap = k;
  m.okundu = true;
  m.sonuc = (m.olay && H[m.olay]?.(r, m, k)) || '';
}

function expireMessages(r: PatronRun) {
  for (const m of r.mesajlar)
    if (m.secenekler && !m.cevap && m.son != null && r.hafta > m.son) {
      const def = m.secenekler[m.secenekler.length - 1].k;
      answer(r, m.id, def);
      m.sonuc = L("Cevap vermedin: {0}", [m.sonuc ?? '']);
    }
}

// Haftalık olay üreticileri
function weeklyEvents(r: PatronRun) {
  const p = r.plan;
  // Kamp sakatlığı
  if (p && p.hafta - r.hafta >= 1 && chance(0.1)) {
    const ids = p.maclar.flatMap((m) => [m.a, m.b]);
    const f = ids.length ? fighterById(r, pick(ids)) : undefined;
    if (f && !bekleyen(r).some((x) => x.olay === 'sakatlik')) {
      f.sakat = randInt(4, 10);
      msg(r, { rol: 'doktor', kimden: L("Takım doktoru"), olay: 'sakatlik', p: { id: f.id }, metin: L("{0} kampta sakatlandı, {1} hafta yok. Kartı ne yapıyoruz?", [pFullName(f), f.sakat]), secenekler: [{ k: 'yedek', t: L("Sıralamadan yedek bul"), ipucu: L("Kısa süre primi") }, { k: 'iptal', t: L("Maçı karttan çıkar") }], son: p.hafta - 1 });
    }
  }
  // Tartı haftası: kilo
  if (p && p.hafta - r.hafta === 1)
    for (const m of p.maclar) {
      const f = fighterById(r, chance(0.5) ? m.a : m.b);
      if (f && chance(0.07)) {
        msg(r, { rol: 'dovuscu', kimden: pFullName(f), olay: 'kilo', p: { id: f.id }, metin: m.unvan ? L("Tartıda {0} kilo fazla geldim… Kemer maçı olmaz ama dövüşmek istiyorum.", [randInt(1, 3)]) : L("Tartıda {0} kilo fazla geldim… Yine de dövüşmeye hazırım.", [randInt(1, 3)]), secenekler: [{ k: 'devam', t: L("Ceza kes, maç devam"), ipucu: m.unvan ? L("Kemer ortaya konmaz") : undefined }, { k: 'iptal', t: L("Maçı iptal et") }], son: p.hafta });
        break;
      }
    }
  // Ana maç öncesi zam isteği
  if (p && p.hafta - r.hafta === 2 && p.maclar[0] && chance(0.12)) {
    const f = fighterById(r, chance(0.5) ? p.maclar[0].a : p.maclar[0].b);
    if (f && (f.kisilik === 'paragoz' || f.kisilik === 'yildiz' || f.mutlu < 45))
      msg(r, { rol: 'dovuscu', kimden: pFullName(f), olay: 'zam', p: { id: f.id }, metin: L("Ana maçtayım, afişte benim yüzüm var. Ücretim %30 artmazsa maça çıkmam."), secenekler: [{ k: 'ver', t: L("Zammı ver") }, { k: 'reddet', t: L("Sözleşme sözleşmedir") }], son: p.hafta - 1 });
  }
  // Basın toplantısında kavga
  if (p && p.tanitim.includes('basin') && p.hafta - r.hafta === 1 && p.maclar[0] && chance(0.3)) {
    const a = fighterById(r, p.maclar[0].a);
    const b = fighterById(r, p.maclar[0].b);
    if (a && b && (a.kisilik === 'kavgaci' || b.kisilik === 'kavgaci' || atesOf(r, a.id, b.id) > 40))
      msg(r, { rol: 'basin', kimden: L("Basın toplantısı"), olay: 'kavga', p: { a: a.id, b: b.id }, metin: L("{0} ve {1} basın toplantısında birbirine girdi! Görüntüler elimizde.", [a.soyad, b.soyad]), secenekler: [{ k: 'pazarla', t: L("Görüntüleri paylaş"), ipucu: L("Ateş ve takipçi, biraz itibar kaybı") }, { k: 'ceza', t: L("İkisine de ceza kes") }], son: p.hafta });
  }
  // Rakip organizasyon aynı hafta gece koyar
  if (p && p.hafta - r.hafta >= 2 && !p.rakipGece && chance(0.07)) {
    const o = pick(r.rakipler.filter((x) => x.id !== 'ufc'));
    p.rakipGece = o.id;
    msg(r, { rol: 'rakip', kimden: orgAdi(o.id), olay: 'rakipGece', metin: L("{0}, senin gecenle aynı haftaya bir gece koydu! Seyirciyi bölmek istiyorlar.", [orgAdi(o.id)]), secenekler: [{ k: 'kaydir', t: L("Geceyi bir hafta kaydır") }, { k: 'karsi', t: L("Karşı reklam (10.000 $)") }, { k: 'savas', t: L("Aynen devam") }], son: p.hafta - 1 });
  }
  // Rakip organizasyonun dövüşçüne teklifi
  const avlanan = r.kadro.filter((f) => (f.kalan <= 1 || f.mutlu < 40) && f.un >= 25 && !bekleyen(r).some((m) => m.p?.id === f.id));
  if (avlanan.length && chance(0.18)) {
    const f = pick(avlanan);
    const o = pick(r.rakipler.filter((x) => x.itibar >= r.itibar - 10));
    if (o) {
      const ucret = r100(f.ucret * (1.3 + rand() * 0.3));
      if (f.kisilik === 'sadik' && f.mutlu >= 50) msg(r, { rol: 'dovuscu', kimden: pFullName(f), metin: L("{0} bana {1} teklif etti. Reddettim, ben buradayım. 🤝", [orgAdi(o.id), $(ucret)]) });
      else
        msg(r, { rol: 'rakip', kimden: orgAdi(o.id), olay: 'rakipTeklif', p: { id: f.id, org: o.id, ucret }, metin: L("{0}, {1} organizasyonundan maç başı {2} teklif aldı. Eşlemezsen gidiyor.", [pFullName(f), orgAdi(o.id), $(ucret)]), secenekler: [{ k: 'esle', t: L("Teklifi eşle ({0})", [$(ucret)]) }, { k: 'birak', t: L("Gitsin") }], son: r.hafta + 2 });
    }
  }
  // Sözleşmesi biten dövüşçü
  for (const f of r.kadro.filter((x) => x.kalan === 0 && !busy(r, x.id) && !bekleyen(r).some((m) => m.olay === 'yenile' && m.p?.id === x.id))) {
    const ucret = r100(Math.max(f.ucret * 1.05, feeOf(f.guc, f.un) * orgPay(r)) * (1 + (f.kisilik === 'paragoz' ? 0.15 : 0) + (f.sampiyon ? 0.2 : 0)));
    msg(r, { rol: 'menajer', kimden: L("Menajer ({0})", [f.soyad]), olay: 'yenile', p: { id: f.id, ucret }, metin: L("Sözleşmesi bitti. 4 maçlık yeni sözleşme için maç başı {0} istiyoruz (şu an {1}).", [$(ucret), $(f.ucret)]), secenekler: [{ k: 'kabul', t: L("Kabul") }, { k: 'pazarlik', t: L("Ortada buluşalım") }, { k: 'birak', t: L("Yollar ayrılsın") }], son: r.hafta + 3 });
  }
  // Aktif olmayan dövüşçü şikâyeti
  const bekleyenF = r.kadro.filter((f) => f.bosHafta >= (f.istek === 'aktif' ? 10 : 16) && !busy(r, f.id) && !f.sakat && !f.soz && !bekleyen(r).some((m) => m.p?.id === f.id));
  if (bekleyenF.length && chance(0.4)) {
    const f = pick(bekleyenF);
    msg(r, { rol: 'dovuscu', kimden: pFullName(f), olay: 'sikayet', p: { id: f.id }, metin: L("{0} haftadır maç yapmadım. Beni neden tutuyorsun?", [f.bosHafta]), secenekler: [{ k: 'soz', t: L("Söz, yakında maç") }, { k: 'serbest', t: L("Serbest bırak") }, { k: 'gormezden', t: L("Sabret") }], son: r.hafta + 2 });
  }
  // Yayın teklifi
  const sonraki = YAYINLAR.find((id) => YAYIN[id].itibar <= r.itibar && (!r.yayin || YAYINLAR.indexOf(id) > YAYINLAR.indexOf(r.yayin.id)));
  if (sonraki && chance(0.12) && !bekleyen(r).some((m) => m.olay === 'yayinTeklif')) {
    const d = YAYIN[sonraki];
    msg(r, { rol: 'yayin', kimden: d.ad(), olay: 'yayinTeklif', p: { id: sonraki }, metin: L("Gecelerini yayınlamak istiyoruz: gece başı {0}. Şart: yılda en az {1} gece.", [$(d.gece), d.min]) + (d.ppv ? ' ' + L("Ana kartı PPV olarak satarız, gelir paylaşılır.") : ''), secenekler: [{ k: 'kabul', t: L("İmzala") }, { k: 'pazarlik', t: L("%20 fazla iste") }, { k: 'red', t: L("Reddet") }], son: r.hafta + 3 });
  }
  // Sponsor teklifi
  if (r.sponsorlar.length < 3 && chance(0.1 + r.itibar / 500) && !bekleyen(r).some((m) => m.olay === 'sponsorTeklif')) {
    const marka = pick(MARKALAR.filter((x) => !r.sponsorlar.some((s) => s.marka === x)));
    const gece = r100(1500 + r.itibar * 600 + r.gram.takipci * 0.02);
    const sart = pick(['yok', 'ko', 'dolu', 'unvan'] as SponsorSart[]);
    const ek = sart === 'yok' ? 0 : r100(gece * 0.8);
    const kalan = randInt(3, 6);
    msg(r, { rol: 'sponsor', kimden: marka, olay: 'sponsorTeklif', p: { marka, gece, sart, ek, kalan }, metin: L("Kafeste logomuzu görmek istiyoruz: {0} gece boyunca gece başı {1}.", [kalan, $(gece)]) + (sart !== 'yok' ? ' ' + L("Ek: {0} ({1}).", [SPONSOR_SART[sart](), $(ek)]) : ''), secenekler: [{ k: 'kabul', t: L("Anlaş") }, { k: 'red', t: L("Reddet") }], son: r.hafta + 3 });
  }
  // Şehir teşviki
  if (chance(0.06) && r.itibar >= 15) {
    const c = pick(CITIES.filter((x) => x.id !== r.sehir));
    const para = r100(10_000 + r.itibar * 900);
    msg(r, { rol: 'sehir', kimden: L("{0} turizm ofisi", [c.ad]), olay: 'sehirTeklif', p: { sehir: c.id, para }, metin: L("Bir sonraki geceniz şehrimizde olsun ({0}): {1} teşvik ödeyelim.", [c.ad, $(para)]), secenekler: [{ k: 'kabul', t: L("Gece: {0}", [c.ad]) }, { k: 'red', t: L("Reddet") }], son: r.hafta + 2 });
  }
  // Menajer yıldız getirir
  if (chance(0.05) && r.itibar >= 20) {
    const a = makeAday(r);
    a.un = clamp(a.un + 20, 0, 95);
    a.guc = clamp(a.guc + 6, 0, 92);
    a.ucret = r100(feeOf(a.guc, a.un) * orgPay(r));
    a.imza = r100(a.ucret * 2);
    a.ilgi = 0.9;
    if (divisionOf(r, bKey(a))) {
      r.adaylar.unshift(a);
      msg(r, { rol: 'menajer', kimden: pick(['Dom Alvarez', 'Lena Park', 'Murat Aksoy']), olay: 'menajer', p: { id: a.id }, metin: L("Elimde {0} var ({1}, {2}). Sizinle çalışmak istiyor: imza {3}, maç başı {4}.", [pFullName(a), bolumAd(a), pRekor(a), $(a.imza), $(a.ucret)]), secenekler: [{ k: 'kabul', t: L("İmzalayalım") }, { k: 'red', t: L("İlgilenmiyorum") }], son: r.hafta + 2 });
    }
  }
  // Uzun süredir savunmayan şampiyon
  for (const d of r.bolumler)
    if (d.sampiyon && r.hafta - Math.max(d.sonUnvan, d.acilis) > 30 && !r.plan?.maclar.some((m) => m.unvan && bKey(fighterById(r, m.a)!) === d.key) && !bekleyen(r).some((m) => m.olay === 'unvanSavunma')) {
      const f = fighterById(r, d.sampiyon);
      if (f && !(f.soz && f.soz > r.hafta))
        msg(r, { rol: 'basin', kimden: 'MMA Gündem', olay: 'unvanSavunma', p: { key: d.key }, metin: L("{0} şampiyonu {1} 30 haftadır kemerini korumadı. Sıklet tıkandı, taraftar tepkili.", [bolumAd(d), pFullName(f)]), secenekler: [{ k: 'sure', t: L("8 hafta süre ver") }, { k: 'al', t: L("Kemeri elinden al") }], son: r.hafta + 2 });
    }
  // Süper maç: iki şampiyon
  const champs = r.kadro.filter((f) => f.sampiyon && f.un >= 60);
  if (champs.length >= 2 && chance(0.05)) {
    const [a, b] = shuffle(champs);
    msg(r, { rol: 'basin', kimden: 'MMA Gündem', olay: 'superMac', p: { a: a.id, b: b.id }, metin: L("Herkes aynı şeyi soruyor: {0} vs {1}, şampiyon şampiyona!", [pFullName(a), pFullName(b)]), secenekler: [{ k: 'kabul', t: L("Dedikoduyu körükle") }, { k: 'red', t: L("Yorum yapma") }], son: r.hafta + 2 });
  }
}

// ---------- Hafta ----------

export const canAdvance = (r: PatronRun) => !trialOver(r) && !r.kapandi;

/** Haftayı bitirir. Gece haftasıysa geceyi oynatır ve raporu döndürür. */
export function advanceWeek(r: PatronRun): GeceRapor | null {
  if (!canAdvance(r)) return null;
  const rapor: string[] = [];
  expireMessages(r);
  let gece: GeceRapor | null = null;
  const p = r.plan;
  if (p && p.hafta <= r.hafta) {
    if (MEKAN[p.mekan].itibar > r.itibar) {
      p.mekan = [...MEKANLAR].reverse().find((m) => MEKAN[m].itibar <= r.itibar) ?? 'salon';
      rapor.push(L("İtibar yetmediği için gece {0} mekânına taşındı.", [MEKAN[p.mekan].ad()]));
    }
    if (canRun(r)) {
      // Gece yapılamıyor (maç kalmadı vb.): plan ertelenir
      p.hafta = r.hafta + 1;
      rapor.push(L("Gece ertelendi: {0}", [canRun(r) ?? '']));
      r.itibar = clamp(r.itibar - 2, 0, 100);
    } else {
      gece = runNight(r);
      rapor.push(L("🎟️ {0}: {1} seyirci, kâr {2}, itibar {3}", [gece.ad, gece.seyirci.toLocaleString(LOC), $(gece.kar), gece.itibarD >= 0 ? `+${gece.itibarD}` : gece.itibarD]));
    }
  }
  r.hafta++;
  // Haftalık giderler: ofis + kadro tutma
  const sabit = r100(1_500 + r.kadro.length * 150 + Object.values(r.tesis).reduce((s, x) => s + x, 0) * 1_200);
  r.para -= sabit;
  r.yil.gider += sabit;
  // Dövüşçüler
  for (const f of r.kadro) {
    f.bosHafta++;
    if (f.sakat > 0) f.sakat--;
    f.hasar = Math.max(0, f.hasar - 1);
    if (f.bosHafta > (f.istek === 'aktif' ? 8 : 14)) f.mutlu = clamp(f.mutlu - 2, 0, 100);
    if (f.soz && r.hafta > f.soz && !busy(r, f.id)) {
      f.mutlu = clamp(f.mutlu - 20, 0, 100);
      f.soz = undefined;
      rapor.push(L("😠 Sözün tutulmadı: {0} hâlâ maç bekliyor.", [f.soyad]));
    }
    if (f.yas <= 28 && f.guc < f.pot && chance(0.12 + r.tesis.performans * 0.04)) f.guc++;
    if (f.yas >= 33 && chance(0.06)) f.guc = Math.max(30, f.guc - 1);
    f.mutlu = clamp(f.mutlu + r.tesis.performans * 0.2, 0, 100);
  }
  // Yaşlanma ve emeklilik (yıl sonu)
  if (haftaOfYil(r) === 1 && r.hafta > 1) yearEnd(r, rapor);
  // Akademi
  if (r.tesis.akademi > 0 && r.hafta - r.akademiHafta >= 10 && r.kadro.length < KADRO_MAX) {
    r.akademiHafta = r.hafta;
    const d = pick(r.bolumler);
    const g = makePF({ guc: 38 + r.tesis.akademi * 4, yas: randInt(18, 21), pot: 70 + r.tesis.akademi * 7 + randInt(0, 10), siklet: d.siklet, kadin: d.kadin, hafta: r.hafta, un: 5 });
    g.akademi = true;
    g.ucret = feeOf(g.guc, g.un);
    g.kalan = 6;
    g.mutlu = 80;
    g.kisilik = chance(0.5) ? 'sadik' : g.kisilik;
    r.kadro.push(g);
    rapor.push(L("🎓 Akademiden yeni yetenek: {0} ({1}).", [pFullName(g), bolumAd(g)]));
  }
  refreshCandidates(r);
  // Rakip organizasyonlar piyasadan dövüşçü kapar
  for (const a of r.adaylar) if (!a.rakipOrg && chance(0.12)) a.rakipOrg = pick(r.rakipler).id;
  r.adaylar = r.adaylar.filter((a) => !(a.rakipOrg && chance(0.25)));
  if (r.hafta % 4 === 0 && r.itibar > itibarCap(r) + 3) {
    r.itibar--;
    rapor.push(L("📉 Kadron organizasyonun ününü taşımıyor: itibar -1. Daha güçlü dövüşçüler lazım."));
  }
  if (r.hafta % 4 === 0) for (const o of r.rakipler) o.itibar = clamp(o.itibar + (o.id === 'ufc' ? 0 : randInt(-1, 1)), 10, o.id === 'ufc' ? 97 : 92);
  // Rakipleri geçme
  for (const o of r.rakipler)
    if (r.itibar > o.itibar && !r.gecilen.includes(o.id)) {
      r.gecilen.push(o.id);
      rapor.push(L("📈 {0} artık {1} organizasyonundan daha büyük!", [r.org.ad, orgAdi(o.id)]));
      gramPost(r, { tur: 'medya', yazar: 'MMA Gündem', kullanici: '@mmagundem', metin: o.id === 'ufc' ? L("TARİHİ AN: {0}, UCC'yi geçerek dünyanın bir numaralı organizasyonu oldu! 🌍👑", [r.org.ad]) : L("{0}, {1} organizasyonunu geride bıraktı. Yükseliş sürüyor.", [r.org.ad, orgAdi(o.id)]) });
    }
  // UCC satın alma teklifi
  if (r.itibar >= 80 && r.uccTeklif !== yilOf(r) && chance(0.08)) {
    r.uccTeklif = yilOf(r);
    const para = r100(r.itibar * 250_000 + r.gram.takipci * 2);
    msg(r, { rol: 'rakip', kimden: 'UCC', olay: 'ucc', p: { para }, metin: L("UCC organizasyonunu satın almak istiyor: {0}. Kabul edersen hikâye burada biter, efsane olarak.", [$(para)]), secenekler: [{ k: 'sat', t: L("Sat ({0})", [$(para)]) }, { k: 'red', t: L("Satılık değil") }], son: r.hafta + 3 });
  }
  // Yatırımcı (zor dönemde)
  if (r.para < 20_000 && chance(0.25) && !bekleyen(r).some((m) => m.olay === 'yatirimci')) {
    const para = r100(80_000 + r.itibar * 3_000);
    msg(r, { rol: 'yatirimci', kimden: pick([L("Körfez sermayeli bir fon"), L("Bir teknoloji milyarderi"), L("Bir yayın devi")]), olay: 'yatirimci', p: { para }, metin: L("Kasanın zorlandığını duyduk. {0} yatırım yapmaya hazırız.", [$(para)]), secenekler: [{ k: 'kabul', t: L("Parayı al") }, { k: 'red', t: L("Kendi yolumu bulurum") }], son: r.hafta + 2 });
  }
  weeklyEvents(r);
  gramTick(r);
  // Yayın şartı
  if (r.yayin && r.hafta >= r.yayin.bitis) {
    const y = r.yayin;
    if (y.yapilan < y.min) {
      r.itibar = clamp(r.itibar - 4, 0, 100);
      msg(r, { rol: 'yayin', kimden: YAYIN[y.id].ad(), metin: L("Yılda {0} gece sözü verdin, {1} gece yaptın. Anlaşmayı yenilemiyoruz.", [y.min, y.yapilan]) });
      r.yayin = undefined;
    } else {
      y.basla = r.hafta;
      y.bitis = r.hafta + 52;
      y.yapilan = 0;
      msg(r, { rol: 'yayin', kimden: YAYIN[y.id].ad(), metin: L("Sözünü tuttun. Anlaşmamız bir yıl daha uzadı.") });
    }
  }
  // İflas
  if (r.para < 0) {
    r.kayipHafta++;
    if (r.kayipHafta === 1) rapor.push(L("⚠️ Kasa ekside! 6 hafta içinde düzelmezse organizasyon iflas eder."));
    if (r.kayipHafta >= 6) r.kapandi = 'iflas';
  } else r.kayipHafta = 0;
  r.rapor = rapor;
  return gece;
}

function yearEnd(r: PatronRun, rapor: string[]) {
  for (const f of r.kadro) f.yas++;
  const emekli = r.kadro.filter((f) => (f.yas >= 37 || f.hasar >= 85) && !bekleyen(r).some((m) => m.olay === 'emeklilik' && m.p?.id === f.id));
  for (const f of emekli)
    msg(r, { rol: 'dovuscu', kimden: pFullName(f), olay: 'emeklilik', p: { id: f.id }, metin: L("Patron, vücudum artık eskisi gibi değil. Eldivenleri asmak istiyorum."), secenekler: [{ k: 'veda', t: L("Son bir veda maçı") }, { k: 'emekli', t: L("Hakkını helal et") }], son: r.hafta + 4 });
  const h = r.hedef;
  if (h) {
    const ok = r.yil.gelir >= h.gelir && r.itibar >= h.itibar && r.yil.gece >= h.gece;
    if (ok) {
      const odul = r100(h.gelir * 0.08);
      r.para += odul;
      r.hedefKacti = 0;
      rapor.push(L("🎯 Yıllık hedefler tuttu! Yönetim kurulu primi: {0}", [$(odul)]));
    } else {
      r.hedefKacti++;
      rapor.push(L("❌ Yıllık hedefler tutmadı."));
      if (r.senaryo === 'yatirimci' && r.hedefKacti >= 2) {
        r.kapandi = 'kovuldu';
        return;
      }
    }
  }
  r.yil = { gelir: 0, gider: 0, gece: 0 };
  setGoal(r);
}

export function closeOrg(r: PatronRun) {
  r.kapandi = 'kapat';
}

/** Organizasyon puanı (Onur Listesi ve sıralama) */
export function orgScore(r: PatronRun) {
  return Math.round(r.itibar * 100 + r.toplam.gece * 50 + r.toplam.unvan * 120 + Math.max(0, r.toplam.kar) / 1000);
}
export function orgRanking(r: PatronRun) {
  return [...r.rakipler.map((o) => ({ id: o.id as string, ad: orgAdi(o.id), itibar: o.itibar, ben: false })), { id: 'ben', ad: r.org.ad, itibar: r.itibar, ben: true }].sort((a, b) => b.itibar - a.itibar);
}

export type PHall = { ad: string; org: string; hafta: number; gece: number; unvan: number; itibar: number; son: NonNullable<PatronRun['kapandi']>; satis?: number; tarih: number };
