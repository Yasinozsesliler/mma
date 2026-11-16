// Menajer Modu: dövüşçü değil, onların menajerisin. Kadro kurarsın, organizasyonlarla pazarlık yaparsın, maç seçersin
// ve kazançlarından komisyon alırsın. Oyun telefonun üzerinden akar: dövüşçüler, patronlar, gazeteciler ve rakip
// menajerler mesaj atar; kararlarını cevap seçerek verirsin. Her kararın birden çok makul cevabı vardır, sonuçları
// dövüşçünün kişiliğine, güvenine ve duruma göre değişir (tek doğru cevap yok).
import { L, L as Lx, LOC } from '../i18n';
import { NAME_POOLS, ORGS, femSurname } from './data';
import { chance, clamp, pick, rand, randInt, setSeed, uid, weighted } from './rng';
import type { Appearance, Background, Method, OrgId, WeightClass } from './types';
import { evrenPick, noteEvren } from './universe';

// ---------- Temel tipler ----------

export type MTier = 'amator' | 'bolgesel' | 'buyuk' | 'ucc';
export const M_TIERS: MTier[] = ['amator', 'bolgesel', 'buyuk', 'ucc'];
export const M_TIER_NAME: Record<MTier, () => string> = {
  amator: () => L("Amatör"),
  bolgesel: () => L("Bölgesel"),
  buyuk: () => L("Büyük lig"),
  ucc: () => L("UCC"),
};
const TIER_ORGS: Record<MTier, OrgId[]> = { amator: ['amator'], bolgesel: ['cfc', 'oktagon'], buyuk: ['pfl', 'one', 'mvp'], ucc: ['ufc'] };
/** Maç başı taban ücret (sıralama ve şampiyonlukla artar) */
const TIER_PAY: Record<MTier, number> = { amator: 900, bolgesel: 4000, buyuk: 15000, ucc: 32000 };
/** Rakiplerin ortalama gücü */
const TIER_LEVEL: Record<MTier, number> = { amator: 44, bolgesel: 56, buyuk: 67, ucc: 77 };
export const orgName = (o: OrgId) => (o === 'ufc' ? 'UCC' : ORGS[o].ad);
export const tierOfOrg = (o: OrgId): MTier => (M_TIERS.find((t) => TIER_ORGS[t].includes(o)) ?? 'amator');

export type Kisilik = 'hirsli' | 'sadik' | 'tembel' | 'medya' | 'paragoz';
export const KISILIK: Record<Kisilik, { ad: () => string; aciklama: () => string }> = {
  hirsli: { ad: () => L("Hırslı"), aciklama: () => L("Sürekli dövüşmek ister, zor maçlardan kaçmaz. Bekletilmekten nefret eder.") },
  sadik: { ad: () => L("Sadık"), aciklama: () => L("Sana güvenir, kolay kolay gitmez. Ama kırılırsa unutmaz.") },
  tembel: { ad: () => L("Rahat"), aciklama: () => L("Yetenekli ama kamptan kaytarır. Gelişimi yavaş, sürprizi bol.") },
  medya: { ad: () => L("Şov adamı"), aciklama: () => L("Kameraları sever. Takipçi ve sponsor getirir, başını da belaya sokar.") },
  paragoz: { ad: () => L("Paragöz"), aciklama: () => L("Önce para. Daha iyi teklifi duyunca kapıyı çalan ilk kişidir.") },
};

export type Madde = 'rovans' | 'cikis' | 'munhasir' | 'sakatlik';
export const MADDE: Record<Madde, { ad: () => string; aciklama: () => string; ikon: string }> = {
  rovans: { ad: () => L("Rövanş hakkı"), aciklama: () => L("Kaybedersen hemen rövanş istenebilir."), ikon: 'restore' },
  cikis: { ad: () => L("Çıkış maddesi"), aciklama: () => L("Daha üst ligden teklif gelirse bedelsiz ayrılırsın."), ikon: 'door-open' },
  munhasir: { ad: () => L("Münhasırlık"), aciklama: () => L("Organizasyon ister: ücret +%15, ama başka hiçbir teklife bakamazsın."), ikon: 'lock' },
  sakatlik: { ad: () => L("Sakatlık güvencesi"), aciklama: () => L("Sakatken kadrodan çıkarılamaz, maaşın yarısı ödenir."), ikon: 'medical-bag' },
};

export interface Sozlesme {
  org: OrgId;
  /** Maç başı ücret ve galibiyet bonusu */
  ucret: number;
  bonus: number;
  kalan: number;
  maddeler: Madde[];
}

export interface Rakip {
  ad: string;
  ulke: string;
  stil: Background;
  guc: number;
  rekor: string;
  /** YOL Evreni: kariyer modundaki dövüşçün (görünümüyle) */
  evren?: 'kariyer';
  look?: Appearance;
}

export interface Mac {
  hafta: number;
  org: OrgId;
  rakip: Rakip;
  ucret: number;
  bonus: number;
  unvan: boolean;
  /** Kadrodaki başka bir dövüşçüye karşı (çıkar çatışması) */
  ic?: string;
  rovans?: boolean;
  /** Dövüş haftası: ilgi (bilet/PPV satışını artırır) ve köşe notunun etkisi */
  hype?: number;
  kose?: number;
  /** Süper dövüş; ppv: sabit ücret yerine pay-per-view geliri payı */
  super?: boolean;
  ppv?: boolean;
}

export interface MFighter {
  id: string;
  ad: string;
  soyad: string;
  lakap?: string;
  ulke: string;
  kadin: boolean;
  siklet: WeightClass;
  stil: Background;
  yas: number;
  /** Güç (30-95) ve gizli potansiyel tavanı */
  guc: number;
  pot: number;
  g: number;
  m: number;
  b: number;
  /** +galibiyet / -mağlubiyet serisi */
  seri: number;
  tier: MTier;
  /** Ligdeki sıra (1 en iyi, 15 en alt) */
  sira: number;
  sampiyon: boolean;
  sozlesme?: Sozlesme;
  /** Sana güveni (0-100). 25'in altında gitmeye hazırdır. */
  guven: number;
  kisilik: Kisilik;
  /** Komisyon yüzdesi */
  kom: number;
  /** Birikmiş hasar (0-100): yüksekse doktor uyarır, nakavt riski artar */
  hasar: number;
  sakat: number;
  /** Bu sakatlıkta ödüllü fizyoterapi kullanıldı (iyileşince sıfırlanır) */
  fizyo?: boolean;
  mac?: Mac;
  katilis: number;
  /** Son maçından beri geçen hafta (bekletme şikâyeti için) */
  bosHafta: number;
  /** Toplam kazancı (dövüşçünün brüt geliri) */
  kazanc: number;
  /** Verilen söz: bu haftaya kadar maç ayarlanacak */
  soz?: number;
  /** Doktor uyarısından sonra dinlendirilmedi */
  riskli?: boolean;
  /** Şöhret (0-100): süper dövüş ve PPV satışını belirler */
  un: number;
  /** Son meydan okuma paylaşımı (haftası) */
  kiskirt?: number;
  /** Kişisel hikâye yayı */
  hikaye?: { tip: ArcKey; adim: number; bitis: number };
  /** Maç geçmişi (en yenisi başta, en fazla 20) */
  maclar?: MKayit[];
}

/** Bir maçın kaydı: dosyada listelenir, kafes sahnesi bu kayıttan yeniden oynatılır */
export interface MKayit {
  id: string;
  h: number;
  org: OrgId;
  rk: Rakip;
  w: boolean;
  /** Yöntem metni ve kodu, bitiş raundu, toplam raunt */
  y: string;
  kod: Method;
  ra: number;
  top: number;
  unvan?: boolean;
  sup?: boolean;
  /** Dövüşçünün maçtaki gücü, ajansın komisyonu, sonuç satırları */
  guc: number;
  kom: number;
  satir: string[];
}

/** Yetenek avı adayı: gerçek potansiyel gizli, menajerin tahmini yıldızla görünür */
export interface Aday extends MFighter {
  imza: number;
  tahmin: number;
}

/** Pazarlık masası (organizasyonun gizli tavanı ve sabrı) */
export interface Masa {
  tavan: number;
  sabir: number;
  sabirMax: number;
  uk: number;
  bk: number;
  baz: { ucret: number; bonus: number };
  mesaj: string;
  ruh: 'sicak' | 'gergin' | 'kizgin' | 'son';
  /** Piyasa araştırması (ödüllü reklam): ücret tavanı görünür */
  bilgi?: boolean;
}

export interface Teklif {
  id: string;
  fid: string;
  tip: 'mac' | 'sozlesme';
  org: OrgId;
  ucret: number;
  bonus: number;
  /** Sözleşme: maç sayısı ve istenen/eklenen maddeler */
  macSayisi?: number;
  maddeler?: Madde[];
  /** Organizasyonun istediği madde (münhasırlık) */
  orgIster?: Madde;
  rakip?: Rakip;
  unvan?: boolean;
  /** Bu haftaya kadar cevap verilmezse düşer */
  son: number;
  masa?: Masa;
  pazarlik?: boolean;
  /** Süper dövüş: sabit ücret ya da PPV payı seçilir */
  super?: boolean;
}

export type Rol = 'dovuscu' | 'org' | 'basin' | 'rakip' | 'doktor' | 'aile' | 'sponsor' | 'sistem' | 'ag';
export interface Secenek {
  ad: string;
  /** Seçince sonucu belirleyen anahtar */
  k: string;
}
export interface Mesaj {
  id: string;
  hafta: number;
  rol: Rol;
  kim: string;
  fid?: string;
  metin: string;
  tip?: string;
  veri?: Record<string, string | number>;
  secenekler?: Secenek[];
  cevap?: string;
  sonuc?: string;
  okundu?: boolean;
}

export type Senaryo = 'sifir' | 'yildiz' | 'batik' | 'yurtdisi';
export interface Hedef {
  metin: string;
  /** Hedefin bağlı olduğu dövüşçü */
  fid?: string;
  bitis: number;
  tamam?: boolean;
  basarisiz?: boolean;
}

export interface Ajans {
  ad: string;
  patron: string;
  puan: number;
}

export interface MgrRun {
  /** Yeni adaylar ödüllü teklifinin kullanıldığı hafta */
  rwAday?: number;
  ad: string;
  soyad: string;
  ajans: string;
  senaryo: Senaryo;
  hafta: number;
  para: number;
  itibar: number;
  ofis: number;
  kadro: MFighter[];
  adaylar: Aday[];
  adayHafta: number;
  teklifler: Teklif[];
  mesajlar: Mesaj[];
  iliski: Partial<Record<OrgId, number>>;
  rakipler: Ajans[];
  hedef?: Hedef;
  oduller: string[];
  gecmis: string[];
  /** Toplam komisyon geliri */
  gelir: number;
  sampiyonluk: number;
  deneme: boolean;
  emekli?: boolean;
  /** Bu hafta sonucu (son sonuç kartı) */
  rapor?: string[];
  ayrilan: number;
  /** Menajer tarzı eksenleri (kararlardan birikir) */
  tarz: Record<TarzKey, number>;
  /** Yaşayan pazar: organizasyon bütçe çarpanı / kapanış */
  pazar: Partial<Record<OrgId, { carpan: number; bitis: number; kapali?: boolean; ad?: string }>>;
  /** Haftalık meydan okuma */
  meydan?: { kod: string; bitis: number; skor?: number };
}

// ---------- Ofis ----------

export const OFIS = [
  { ad: () => L("Bodrum kat ofisi"), kapasite: 3, kira: 250, maliyet: 0 },
  { ad: () => L("Şehir merkezinde oda"), kapasite: 4, kira: 600, maliyet: 12_000 },
  { ad: () => L("Ajans katı"), kapasite: 5, kira: 1_400, maliyet: 45_000 },
  { ad: () => L("Gökdelende ajans"), kapasite: 6, kira: 3_000, maliyet: 140_000 },
];
export const ofisOf = (r: MgrRun) => OFIS[r.ofis];

export const MGR_TRIAL_WEEKS = 8;
export const trialOver = (r: MgrRun) => r.deneme && r.hafta > MGR_TRIAL_WEEKS;

export const unvanOf = (r: MgrRun) => (r.itibar >= 75 ? L("Süper ajan") : r.itibar >= 50 ? L("Ulusal menajer") : r.itibar >= 25 ? L("Bölgesel menajer") : L("Yerel menajer"));

const $ = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;
const r100 = (n: number) => Math.round(n / 100) * 100;

// ---------- Dövüşçü üretimi ----------

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
const SIKLETLER: WeightClass[] = ['sinek', 'horoz', 'tuy', 'hafif', 'welter', 'orta', 'yariagir', 'agir'];
const KISILIKLER: Kisilik[] = ['hirsli', 'sadik', 'tembel', 'medya', 'paragoz'];

function makeName(pool = pick(NAME_POOLS), kadin = false) {
  const soy = pick(pool.soyad);
  return { ad: pick(kadin ? pool.kadin : pool.ad), soyad: kadin && pool.slav ? femSurname(soy) : soy, ulke: pool.ulke };
}

export function makeFighter(o: { tier?: MTier; guc?: number; pot?: number; yas?: number; pool?: (typeof NAME_POOLS)[number]; kisilik?: Kisilik; siklet?: WeightClass; hafta?: number } = {}): MFighter {
  const kadin = chance(0.18);
  const n = makeName(o.pool, kadin);
  const tier = o.tier ?? 'amator';
  const guc = o.guc ?? clamp(Math.round(TIER_LEVEL[tier] - 4 + rand() * 8), 30, 92);
  const yas = o.yas ?? randInt(19, 27);
  const pot = o.pot ?? clamp(Math.round(guc + 6 + rand() * 30 - Math.max(0, yas - 25) * 2), guc, 96);
  const g = tier === 'amator' ? randInt(0, 4) : randInt(4, 14);
  return {
    id: uid(),
    ad: n.ad,
    soyad: n.soyad,
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
    tier,
    sira: randInt(8, 15),
    sampiyon: false,
    guven: 55,
    kisilik: o.kisilik ?? pick(KISILIKLER),
    kom: 15,
    hasar: randInt(0, 15),
    sakat: 0,
    katilis: o.hafta ?? 0,
    bosHafta: 0,
    kazanc: 0,
    un: UN0[tier] + randInt(0, 6),
  };
}

export const fullName = (f: Pick<MFighter, 'ad' | 'soyad'>) => `${f.ad} ${f.soyad}`;
export const rekorOf = (f: Pick<MFighter, 'g' | 'm' | 'b'>) => `${f.g}-${f.m}-${f.b}`;
/** Potansiyel yıldızı (menajerin tahmini, 1-5) */
export const starsOf = (pot: number) => clamp(Math.round((pot - 45) / 10), 1, 5);
/** Piyasa değeri: güç, sıra ve şampiyonluk */
export function valueOf(f: MFighter) {
  const t = M_TIERS.indexOf(f.tier);
  return Math.round(f.guc * (1 + t * 0.6) * (f.sampiyon ? 1.8 : 1) * (1 + (15 - f.sira) / 30));
}

function makeRakip(level: number): Rakip {
  const n = makeName();
  const g = randInt(3, 18);
  return { ad: `${n.ad} ${n.soyad}`, ulke: n.ulke, stil: weighted(STYLES), guc: clamp(Math.round(level), 30, 95), rekor: `${g}-${randInt(0, Math.round(g / 2))}-0` };
}

// ---------- Kurulum ve senaryolar ----------

const RIVAL_NAMES: [string, string][] = [
  ['Apex Yönetim', 'Victor Kane'],
  ['Kırmızı Köşe Ajansı', 'Selim Baykal'],
  ['Iron Gate Mgmt', 'Dana Whitlock'],
  ['Kartal Sports', 'Murat Önal'],
  ['Northstar Fighters', 'Ivan Petrov'],
];

export const SENARYO: Record<Senaryo, { ad: () => string; aciklama: () => string; zorluk: () => string; ikon: string }> = {
  sifir: { ad: () => L("Sıfırdan"), aciklama: () => L("Elinde tek bir sokak dövüşçüsü ve kirası ödenmemiş bir bodrum ofis var. Her şey sana bağlı."), zorluk: () => L("Kolay"), ikon: 'sprout' },
  yildiz: { ad: () => L("Tek yıldız"), aciklama: () => L("Kadronda bir UCC şampiyonu var, ama sözleşmesi bitmek üzere ve rakip ajanslar kapıda. Onu kaybetme."), zorluk: () => L("Orta"), ikon: 'star-circle' },
  batik: { ad: () => L("Batık ajansı kurtar"), aciklama: () => L("Önceki menajerden borç ve sana küskün üç dövüşçü devraldın. Bir yılda borcu kapat."), zorluk: () => L("Zor"), ikon: 'cash-remove' },
  yurtdisi: { ad: () => L("Yurt dışı yetenekleri"), aciklama: () => L("Brezilya ve Dağıstan'dan iki genç yetenek getirdin. Vize, dil ve gurbet sorunlarıyla yıldız yap."), zorluk: () => L("Orta"), ikon: 'airplane' },
};

export function createMgrRun(ad: string, soyad: string, ajans: string, senaryo: Senaryo, deneme: boolean): MgrRun {
  const rivals = [...RIVAL_NAMES].sort(() => rand() - 0.5).slice(0, 4).map(([a, p], i) => ({ ad: a, patron: p, puan: 200 + i * 120 + randInt(0, 80) }));
  const r: MgrRun = {
    ad: ad.trim() || L("Menajer"),
    soyad: soyad.trim(),
    ajans: ajans.trim() || L("{0} Yönetim", [ad.trim() || L("Yeni")]),
    senaryo,
    hafta: 1,
    para: 15_000,
    itibar: 10,
    ofis: 0,
    kadro: [],
    adaylar: [],
    adayHafta: 1,
    teklifler: [],
    mesajlar: [],
    iliski: {},
    rakipler: rivals,
    oduller: [],
    gecmis: [],
    gelir: 0,
    sampiyonluk: 0,
    deneme,
    ayrilan: 0,
    tarz: { kopek: 0, baba: 0, mimar: 0 },
    pazar: {},
  };
  const pool = (u: string) => NAME_POOLS.find((p) => p.ulke === u);
  if (senaryo === 'sifir') {
    const f = makeFighter({ tier: 'amator', guc: 46, pot: 80, yas: 21, kisilik: 'hirsli' });
    f.guven = 70;
    f.stil = 'sokak';
    r.kadro.push(f);
    r.hedef = { metin: L("İlk yılında bir dövüşçünü bölgesel lige taşı."), bitis: 52 };
    msg(r, { rol: 'dovuscu', kim: fullName(f), fid: f.id, metin: L("Abi, otoparktaki dövüşleri bırakıp gerçek bir kafese çıkmak istiyorum. Sana güveniyorum. Beni bir yere götür.") });
  } else if (senaryo === 'yildiz') {
    r.para = 40_000;
    r.itibar = 35;
    const star = makeFighter({ tier: 'ucc', guc: 86, pot: 88, yas: 32, kisilik: 'paragoz' });
    star.sampiyon = true;
    star.sira = 1;
    star.g = 22;
    star.m = 3;
    star.guven = 45;
    star.sozlesme = { org: 'ufc', ucret: 90_000, bonus: 50_000, kalan: 1, maddeler: [] };
    const genc = makeFighter({ tier: 'bolgesel', guc: 58, pot: 82, yas: 22 });
    r.kadro.push(star, genc);
    r.hedef = { metin: L("{0} ile yeni sözleşme imzala, onu rakip ajanslara kaptırma.", [fullName(star)]), bitis: 30, fid: star.id };
    msg(r, { rol: 'dovuscu', kim: fullName(star), fid: star.id, metin: L("Sözleşmem bir maç sonra bitiyor. Telefonum susmuyor, herkes beni istiyor. Sen beni neden tutmalıyım, onu düşünüyorum.") });
  } else if (senaryo === 'batik') {
    r.para = -25_000;
    r.itibar = 18;
    for (let i = 0; i < 3; i++) {
      const f = makeFighter({ tier: i === 0 ? 'buyuk' : 'bolgesel', guc: i === 0 ? 66 : 57, pot: 74 + i * 4 });
      f.guven = 32;
      r.kadro.push(f);
    }
    r.hedef = { metin: L("Bir yıl içinde borcu kapat (para sıfırın üstüne çıksın)."), bitis: 52 };
    msg(r, { rol: 'sistem', kim: L("Banka"), metin: L("Ajansınızın {0} borcu bulunmaktadır. Kira ödemeleri devam ettikçe borç büyüyecektir.", [$(25_000)]) });
    msg(r, { rol: 'dovuscu', kim: fullName(r.kadro[0]), fid: r.kadro[0].id, metin: L("Eski menajer paramızı yedi. Sen farklı mısın, göreceğiz.") });
  } else {
    r.para = 25_000;
    r.itibar = 15;
    const br = makeFighter({ tier: 'bolgesel', guc: 55, pot: 86, yas: 20, pool: pool(L("Brezilya")) });
    br.stil = 'bjj';
    const ru = makeFighter({ tier: 'bolgesel', guc: 57, pot: 84, yas: 21, pool: pool(L("Rusya")) });
    ru.stil = 'gures';
    ru.kadin = false;
    br.kadin = false;
    br.ad = pick(pool(L("Brezilya"))!.ad);
    ru.ad = pick(pool(L("Rusya"))!.ad);
    r.kadro.push(br, ru);
    r.hedef = { metin: L("İki yeteneğinden birini büyük lige taşı."), bitis: 60 };
    msg(r, { rol: 'dovuscu', kim: fullName(br), fid: br.id, metin: L("Burası çok soğuk, abi. Annem her gün arıyor. Ama söz verdim, kemerle döneceğim.") });
  }
  for (const f of r.kadro) {
    if (!f.sozlesme && f.tier !== 'amator') f.sozlesme = { org: pick(TIER_ORGS[f.tier]), ucret: payFor(f), bonus: r100(payFor(f) * 0.6), kalan: randInt(2, 4), maddeler: [] };
  }
  for (const f of r.kadro) assignArc(r, f, senaryo === 'yildiz' && f.sampiyon ? 'son_sans' : undefined);
  refreshCandidates(r, true);
  weeklyOffers(r);
  return r;
}

// ---------- Para ve ücret ----------

export function payFor(f: MFighter) {
  const base = TIER_PAY[f.tier] * (1 + (15 - f.sira) / 20) * (f.sampiyon ? 2.4 : 1) * (1 + Math.max(0, f.seri) * 0.05);
  return r100(base);
}

const iliskiOf = (r: MgrRun, o: OrgId) => r.iliski[o] ?? 0;
export function bumpOrg(r: MgrRun, o: OrgId, d: number) {
  r.iliski[o] = clamp(iliskiOf(r, o) + d, -50, 50);
}
export const karaListe = (r: MgrRun, o: OrgId) => iliskiOf(r, o) <= -30;

function addTrust(r: MgrRun, f: MFighter, d: number) {
  // Sadık dövüşçü iyiye hızlı, kötüye yavaş tepki verir; paragöz tersine. Tarz: Baba'ya kırgınlık az, Köpekbalığı'na ısınma yavaş.
  const tarz = tarzOf(r);
  const k = (d > 0 ? (f.kisilik === 'sadik' ? 1.3 : f.kisilik === 'paragoz' ? 0.7 : 1) : f.kisilik === 'sadik' ? 0.7 : f.kisilik === 'paragoz' ? 1.3 : 1) * (d < 0 && tarz === 'baba' ? 0.7 : d > 0 && tarz === 'kopek' ? 0.8 : 1);
  f.guven = clamp(Math.round(f.guven + d * k), 0, 100);
}

function earn(r: MgrRun, f: MFighter, brut: number) {
  f.kazanc += brut;
  const pay = Math.round((brut * f.kom) / 100);
  r.para += pay;
  r.gelir += pay;
  return pay;
}

// ---------- Mesajlar ----------

function msg(r: MgrRun, m: Omit<Mesaj, 'id' | 'hafta'>) {
  r.mesajlar.unshift({ id: uid(), hafta: r.hafta, ...m });
  r.mesajlar = r.mesajlar.slice(0, 60);
}
export const bekleyen = (r: MgrRun) => r.mesajlar.filter((m) => m.secenekler && !m.cevap);
export const okunmamis = (r: MgrRun) => r.mesajlar.filter((m) => !m.okundu).length;
export function markRead(r: MgrRun) {
  for (const m of r.mesajlar) m.okundu = true;
}

// ---------- Yetenek avı ----------

const SIGN_BASE: Record<MTier, number> = { amator: 1_500, bolgesel: 6_000, buyuk: 20_000, ucc: 60_000 };

export function refreshCandidates(r: MgrRun, force = false) {
  if (!force && r.hafta - r.adayHafta < 4) return;
  r.adayHafta = r.hafta;
  const n = 3;
  const tiers: MTier[] = r.itibar >= 55 ? ['bolgesel', 'buyuk', 'amator'] : r.itibar >= 30 ? ['amator', 'bolgesel', 'bolgesel'] : ['amator', 'amator', 'bolgesel'];
  r.adaylar = Array.from({ length: n }, (_, i) => {
    const f = makeFighter({ tier: tiers[i], hafta: r.hafta });
    // Menajerin gözü: itibar arttıkça tahmin netleşir
    const err = Math.round((rand() - 0.5) * (30 - r.itibar / 4) * (tarzOf(r) === 'mimar' ? 0.5 : 1));
    const imza = r100(SIGN_BASE[f.tier] * (0.6 + (f.pot - 50) / 50));
    return { ...f, imza, tahmin: clamp(f.pot + err, 40, 98) };
  });
}

/** Komisyon teklifiyle imza: düşük komisyon kolay kabul edilir. Dönüş: mesaj. */
export function signCandidate(r: MgrRun, id: string, kom: number): string {
  const a = r.adaylar.find((x) => x.id === id);
  if (!a) return '';
  if (r.kadro.length >= ofisOf(r).kapasite) return L("Ofis dolu. Yeni dövüşçü için ofisi büyüt ya da birini bırak.");
  if (r.para < a.imza) return L("İmza parası için yeterli paran yok.");
  const p = clamp(0.95 - (kom - 10) * 0.07 + r.itibar / 250 + (a.kisilik === 'paragoz' ? -0.15 : 0), 0.08, 0.97);
  if (!chance(p)) {
    r.adaylar = r.adaylar.filter((x) => x.id !== id);
    const riv = pick(r.rakipler);
    riv.puan += 15;
    return L("{0} teklifini reddetti ve {1} ile anlaştı.", [fullName(a), riv.ad]);
  }
  r.para -= a.imza;
  r.adaylar = r.adaylar.filter((x) => x.id !== id);
  const f: MFighter = { ...a, kom, katilis: r.hafta, guven: clamp(70 - (kom - 10) * 2, 35, 80) };
  delete (f as Partial<Aday>).imza;
  delete (f as Partial<Aday>).tahmin;
  r.kadro.push(f);
  if (kom >= 20) tz(r, 'kopek', 3);
  if (kom <= 10) tz(r, 'baba', 2);
  if (f.tier === 'amator') tz(r, 'mimar', 2);
  assignArc(r, f);
  r.gecmis.unshift(L("Hafta {0}: {1} kadroya katıldı (%{2}).", [r.hafta, fullName(f), kom]));
  return L("✍️ {0} ajansına katıldı!", [fullName(f)]);
}

export function releaseFighter(r: MgrRun, id: string) {
  const f = r.kadro.find((x) => x.id === id);
  if (!f) return;
  r.kadro = r.kadro.filter((x) => x.id !== id);
  r.teklifler = r.teklifler.filter((t) => t.fid !== id);
  for (const o of r.kadro) addTrust(r, o, -3);
  r.gecmis.unshift(L("Hafta {0}: {1} ile yollar ayrıldı.", [r.hafta, fullName(f)]));
}

export function upgradeOffice(r: MgrRun) {
  const next = OFIS[r.ofis + 1];
  if (!next || r.para < next.maliyet) return;
  r.para -= next.maliyet;
  r.ofis++;
  r.itibar = clamp(r.itibar + 2, 0, 100);
}

// ---------- Teklifler ----------

function offerFight(r: MgrRun, f: MFighter, kind: 'kolay' | 'denk' | 'zor' | 'unvan') {
  const org = f.sozlesme?.org ?? pick(TIER_ORGS[f.tier]);
  if (karaListe(r, org) || kapali(r, org)) return;
  const d = { kolay: -7, denk: 0, zor: 6, unvan: 8 }[kind];
  const rakip = makeRakip(f.guc + d + (rand() - 0.5) * 6);
  // YOL Evreni: kariyer modundaki dövüşçün bu sıklette rakip olarak teklif edilebilir (güç maçın seviyesinde kalır)
  const ev = kind !== 'kolay' ? evrenPick('kariyer', f.siklet, f.kadin, 0.12) : null;
  if (ev) Object.assign(rakip, { ad: `${ev.ad} ${ev.soyad}`, ulke: ev.uyruk, stil: ev.stil, rekor: ev.rekor, evren: 'kariyer', look: ev.look });
  const base = f.sozlesme?.ucret ?? payFor(f) * carpanOf(r, org);
  const k = { kolay: 0.85, denk: 1, zor: 1.25, unvan: 1.8 }[kind];
  r.teklifler.push({
    id: uid(),
    fid: f.id,
    tip: 'mac',
    org,
    ucret: r100(base * k),
    bonus: r100((f.sozlesme?.bonus ?? base * 0.6) * k),
    rakip,
    unvan: kind === 'unvan',
    son: r.hafta + 2,
  });
}

function offerContract(r: MgrRun, f: MFighter, tier: MTier, org?: OrgId) {
  const o = org ?? pick(TIER_ORGS[tier].filter((x) => !karaListe(r, x)).concat(TIER_ORGS[tier]));
  if (karaListe(r, o) || kapali(r, o)) return;
  const tmp = { ...f, tier, sira: tier === f.tier ? f.sira : 12 };
  const ucret = r100(payFor(tmp) * (1 + iliskiOf(r, o) / 150) * carpanOf(r, o));
  r.teklifler.push({ id: uid(), fid: f.id, tip: 'sozlesme', org: o, ucret, bonus: r100(ucret * 0.6), macSayisi: randInt(3, 5), maddeler: [], orgIster: chance(0.35) ? 'munhasir' : undefined, son: r.hafta + 3 });
}

/** Haftalık teklif üretimi */
function weeklyOffers(r: MgrRun) {
  r.teklifler = r.teklifler.filter((t) => t.son >= r.hafta && r.kadro.some((f) => f.id === t.fid));
  for (const f of r.kadro) {
    if (f.mac || f.sakat > 0) continue;
    const has = r.teklifler.filter((t) => t.fid === f.id);
    if (!f.sozlesme) {
      // Serbest: sözleşme teklifleri (amatörde maç teklifi de)
      if (f.tier === 'amator' && !has.some((t) => t.tip === 'mac') && chance(0.7)) offerFight(r, f, pick(['kolay', 'denk', 'denk', 'zor']));
      const up = f.tier !== 'ucc' && ((f.sira <= 2 && f.seri >= 2) || f.guc >= TIER_LEVEL[M_TIERS[M_TIERS.indexOf(f.tier) + 1]] + 1);
      if (!has.some((t) => t.tip === 'sozlesme') && chance(0.45 + r.itibar / 300)) offerContract(r, f, up ? M_TIERS[M_TIERS.indexOf(f.tier) + 1] : f.tier === 'amator' ? 'bolgesel' : f.tier);
      continue;
    }
    if ((f.tier === 'buyuk' || f.tier === 'ucc') && (f.sampiyon || f.un >= 60) && chance(0.012 + f.un / 2500)) superOffer(r, f);
    if (has.some((t) => t.tip === 'mac') || f.bosHafta < 1) continue;
    if (!chance(0.5 + f.bosHafta * 0.12)) continue;
    if (f.sira <= 2 && !f.sampiyon && chance(0.45)) offerFight(r, f, 'unvan');
    else if (f.sampiyon) offerFight(r, f, 'unvan');
    else {
      offerFight(r, f, pick(['kolay', 'denk', 'zor']));
      if (chance(0.4)) offerFight(r, f, pick(['denk', 'zor']));
    }
  }
}

/** Teklifi kabul et: maç ayarlanır ya da sözleşme imzalanır. */
export function acceptOffer(r: MgrRun, id: string, mod?: 'ppv'): string {
  const t = r.teklifler.find((x) => x.id === id);
  const f = t && r.kadro.find((x) => x.id === t.fid);
  if (!t || !f) return '';
  // Sözleşme imzalanınca o dövüşçünün bütün teklifleri düşer; maç kabul edilince yalnızca maç teklifleri
  r.teklifler = r.teklifler.filter((x) => x.fid !== f.id || (t.tip === 'mac' && x.tip === 'sozlesme'));
  if (t.tip === 'sozlesme') {
    const eski = f.sozlesme;
    if (eski && eski.kalan > 0 && eski.org !== t.org) {
      // Sözleşme bitmeden ayrılmak: çıkış maddesi yoksa bedel ödenir
      if (eski.maddeler.includes('cikis') && tierOfOrg(t.org) !== tierOfOrg(eski.org)) {
        r.gecmis.unshift(L("Hafta {0}: Çıkış maddesi işledi, {1} bedelsiz ayrıldı.", [r.hafta, fullName(f)]));
      } else {
        const bedel = r100(eski.ucret * 1.5);
        r.para -= Math.round(bedel / 2);
        bumpOrg(r, eski.org, -12);
        r.gecmis.unshift(L("Hafta {0}: {1} sözleşmesini {2} bedelle feshetti.", [r.hafta, orgName(eski.org), $(bedel)]));
      }
    }
    const ust = M_TIERS.indexOf(tierOfOrg(t.org)) > M_TIERS.indexOf(f.tier);
    const maddeler = [...(t.maddeler ?? [])];
    if (t.orgIster && !maddeler.includes(t.orgIster)) maddeler.push(t.orgIster);
    const carp = maddeler.includes('munhasir') ? 1.15 : 1;
    f.sozlesme = { org: t.org, ucret: r100(t.ucret * carp), bonus: r100(t.bonus * carp), kalan: t.macSayisi ?? 3, maddeler };
    if (ust) {
      f.tier = tierOfOrg(t.org);
      f.sira = randInt(10, 14);
      f.sampiyon = false;
      addTrust(r, f, 10);
      r.itibar = clamp(r.itibar + 2, 0, 100);
      msg(r, { rol: 'dovuscu', kim: fullName(f), fid: f.id, metin: pick([L("{0}! Rüya gibi. Bunu sana borçluyum.", [orgName(t.org)]), L("Annemi aradım, ağladı. {0} sözleşmesi, inanamıyorum.", [orgName(t.org)]), L("Daha yeni başlıyoruz. {0}'de herkes adımı öğrenecek.", [orgName(t.org)])]) });
    } else addTrust(r, f, 4);
    bumpOrg(r, t.org, 3);
    r.gecmis.unshift(L("Hafta {0}: {1} için {2} ile {3} maçlık sözleşme ({4}/maç).", [r.hafta, fullName(f), orgName(t.org), f.sozlesme.kalan, $(f.sozlesme.ucret)]));
    return L("📝 {0} artık {1} dövüşçüsü.", [fullName(f), orgName(t.org)]);
  }
  const ppv = !!t.super && mod === 'ppv';
  f.mac = { hafta: r.hafta + randInt(2, 4), org: t.org, rakip: t.rakip!, ucret: ppv ? r100(t.ucret * 0.25) : t.ucret, bonus: t.bonus, unvan: !!t.unvan, super: t.super, ppv };
  if (ppv) tz(r, 'kopek', 2);
  f.soz = undefined;
  bumpOrg(r, t.org, 1);
  // Kişilik: hırslı zor maçı sever, paragöz parayı
  const zor = t.rakip!.guc - f.guc;
  if (f.kisilik === 'hirsli' && zor > 3) addTrust(r, f, 3);
  if (f.kisilik === 'paragoz' && t.ucret > payFor(f) * 1.1) addTrust(r, f, 3);
  return L("🗓️ {0} – {1} maçı {2}. haftada.", [fullName(f), t.rakip!.ad, f.mac.hafta]);
}

export function declineOffer(r: MgrRun, id: string) {
  const t = r.teklifler.find((x) => x.id === id);
  if (!t) return;
  r.teklifler = r.teklifler.filter((x) => x.id !== id);
  if (t.unvan) {
    bumpOrg(r, t.org, -6);
    const f = r.kadro.find((x) => x.id === t.fid);
    if (f?.kisilik === 'hirsli') addTrust(r, f, -8);
  } else bumpOrg(r, t.org, -1);
}

// ---------- Pazarlık masası ----------

export function openTable(r: MgrRun, id: string) {
  const t = r.teklifler.find((x) => x.id === id);
  if (!t || t.masa || t.pazarlik) return;
  const f = r.kadro.find((x) => x.id === t.fid);
  const deger = f ? (f.sampiyon ? 0.15 : 0) + (15 - f.sira) / 100 : 0;
  const tavan = 1.06 + r.itibar / 400 + iliskiOf(r, t.org) / 250 + deger + rand() * 0.16 + (tarzOf(r) === 'kopek' ? 0.07 : 0);
  const sabir = 3 + (r.itibar >= 50 ? 1 : 0);
  t.masa = { tavan, sabir, sabirMax: sabir, uk: 1, bk: 1, baz: { ucret: t.ucret, bonus: t.bonus }, mesaj: L("{0}: “Teklifimiz ortada. Dinliyoruz.”", [orgName(t.org)]), ruh: 'sicak' };
}

function applyTable(t: Teklif) {
  const m = t.masa!;
  t.ucret = r100(m.baz.ucret * m.uk);
  t.bonus = r100(m.baz.bonus * m.bk);
}

function loseTable(r: MgrRun, t: Teklif, sert: boolean): string | null {
  const m = t.masa!;
  m.sabir -= sert ? 2 : 1;
  if (m.sabir > 0) return null;
  bumpOrg(r, t.org, -4);
  if (chance(0.35)) {
    r.teklifler = r.teklifler.filter((x) => x.id !== t.id);
    return L("❌ {0} masadan kalktı: “Başka dövüşçülerle devam ederiz.”", [orgName(t.org)]);
  }
  m.uk += (m.tavan - m.uk) * 0.6;
  applyTable(t);
  m.ruh = 'son';
  m.mesaj = L("{0}: “Son teklifimiz {1}. İmzala ya da yolumuza bakalım.”", [orgName(t.org), $(t.ucret)]);
  return null;
}

/** 'ucret' (+%15), 'bonus' (+%30) ya da bir madde iste. Dönüş: üstte gösterilecek mesaj (varsa). */
export function tableAsk(r: MgrRun, id: string, ne: 'ucret' | 'bonus' | Madde): string | null {
  const t = r.teklifler.find((x) => x.id === id);
  const m = t?.masa;
  if (!t || !m || m.ruh === 'son') return null;
  const org = orgName(t.org);
  if (ne === 'ucret') {
    tz(r, 'kopek', 1);
    const ask = m.uk + 0.15;
    if (ask <= m.tavan) {
      m.uk = ask;
      applyTable(t);
      m.ruh = 'sicak';
      m.mesaj = pick([L("{0}: “Tamam, {1} olsun.”", [org, $(t.ucret)]), L("{0}: “Peki. Maç başı {1}.”", [org, $(t.ucret)]), L("{0}: “Zorluyorsun ama olur: {1}.”", [org, $(t.ucret)])]);
      return null;
    }
    const sert = ask / m.tavan > 1.2;
    m.uk += (m.tavan - m.uk) * 0.4;
    applyTable(t);
    m.ruh = sert ? 'kizgin' : 'gergin';
    m.mesaj = sert ? L("{0}: “Bu rakam gerçekçi değil. En fazla {1}.”", [org, $(t.ucret)]) : L("{0}: “Bütçeyi zorluyorsun. {1} yapabiliriz.”", [org, $(t.ucret)]);
    return loseTable(r, t, sert);
  }
  if (ne === 'bonus') {
    const ask = m.bk + 0.3;
    if (ask <= m.tavan + 0.35) {
      m.bk = ask;
      applyTable(t);
      m.ruh = 'sicak';
      m.mesaj = L("{0}: “Kazanırsa hak eder. Bonus {1}.”", [org, $(t.bonus)]);
      return null;
    }
    m.ruh = 'gergin';
    m.mesaj = L("{0}: “Bonusta da sınırımız var.”", [org]);
    return loseTable(r, t, false);
  }
  // Madde isteği (yalnızca sözleşmede)
  if (t.tip !== 'sozlesme' || t.maddeler?.includes(ne)) return null;
  if (ne === 'munhasir') {
    t.maddeler = [...(t.maddeler ?? []), ne];
    m.ruh = 'sicak';
    m.mesaj = L("{0}: “Münhasırlık mı? Seve seve. Ücrete %15 ekliyoruz.”", [org]);
    return null;
  }
  const zorluk = { rovans: 0.55, cikis: 0.35, sakatlik: 0.6 }[ne];
  if (chance(zorluk + r.itibar / 300 + iliskiOf(r, t.org) / 200)) {
    t.maddeler = [...(t.maddeler ?? []), ne];
    m.ruh = 'sicak';
    m.mesaj = L("{0}: “{1}, kabul. Sözleşmeye yazıyoruz.”", [org, MADDE[ne].ad()]);
    return null;
  }
  m.ruh = 'gergin';
  m.mesaj = ne === 'cikis' ? L("{0}: “Çıkış maddesi mi? Dövüşçüne yatırım yapıyoruz, kaçmasına izin vermeyiz.”", [org]) : L("{0}: “{1} olmaz. Başka bir şey?”", [org, MADDE[ne].ad()]);
  return loseTable(r, t, false);
}

export function leaveTable(r: MgrRun, id: string) {
  const t = r.teklifler.find((x) => x.id === id);
  if (!t?.masa) return;
  t.masa = undefined;
  t.pazarlik = true;
}

// ---------- Maç sonucu ----------

const YONTEM_KO = [() => L("nakavt"), () => L("teknik nakavt"), () => L("yerde yumruklarla TKO")];
const YONTEM_SUB = [() => L("boğaz kilidi"), () => L("kol kilidi"), () => L("diz bağı")];
const GRAPPLE: Background[] = ['gures', 'bjj', 'judo', 'sambo'];

function fightLines(f: MFighter, rk: Rakip, won: boolean, yontem: string, raunt: number): string[] {
  const n = f.ad;
  const a = won
    ? [
        L("{0} ilk dakikadan merkezi aldı.", [n]),
        L("{0} rakibinin ritmini çözdü.", [n]),
        L("{0} zor anlardan sakin çıktı.", [n]),
      ]
    : [
        L("{0} erken tempoya yetişemedi.", [n]),
        L("{0}, {1}'in oyununa düştü.", [n, rk.ad]),
        L("{0} köşesinin uyarılarını duymadı.", [n]),
      ];
  return [pick(a), won ? L("Sonuç: {0}. rauntta {1} ile galibiyet.", [raunt, yontem]) : L("Sonuç: {0}. rauntta {1} ile mağlubiyet.", [raunt, yontem])];
}

function resolveFight(r: MgrRun, f: MFighter, rapor: string[], forced?: boolean) {
  const mc = f.mac!;
  const rk = mc.rakip;
  let edge = (mc.kose ?? 0) + (f.guc - rk.guc) / 7 - f.hasar / 60 - (f.riskli ? 0.6 : 0) + (f.kisilik === 'tembel' ? (rand() - 0.5) * 1.5 : 0);
  const p = 1 / (1 + Math.exp(-edge));
  const won = forced ?? chance(p);
  const fin = chance(0.45);
  const grap = GRAPPLE.includes(won ? f.stil : rk.stil);
  const yontem = fin ? (grap && chance(0.6) ? pick(YONTEM_SUB)() : pick(YONTEM_KO)()) : chance(0.75) ? L("oybirliğiyle karar") : L("ayrık karar");
  const raunt = fin ? randInt(1, mc.unvan ? 5 : 3) : mc.unvan ? 5 : 3;
  const koLoss = !won && fin && !YONTEM_SUB.some((y) => y() === yontem);
  const hype = mc.hype ?? 0;
  let brut = mc.ucret + (won ? mc.bonus : 0);
  let ppvLine = '';
  if (mc.ppv) {
    const satis = ppvSales(f, hype);
    const gelir = r100(satis * PPV_FIYAT * PPV_PAY);
    brut += gelir;
    ppvLine = L("📺 PPV: {0} satış · dövüşçünün payı {1}", [satis.toLocaleString(LOC), $(gelir)]);
  } else if (hype > 0) brut += r100((mc.ucret * hype) / 200);
  const pay = earn(r, f, brut);
  const gucOnce = f.guc;
  if (rk.evren) noteEvren(L("Menajer: {0}, kariyer modundaki dövüşçün {1} ile karşılaştı ve {2}.", [fullName(f), rk.ad, won ? L("kazandı") : L("kaybetti")]), won);
  f.un = clamp(f.un + (won ? (mc.unvan ? 6 : mc.super ? 5 : 2) : -2) + Math.round(hype / 12), 0, 100);
  f.hasar = clamp(f.hasar + (koLoss ? 22 : won ? randInt(3, 9) : randInt(8, 15)) + (f.riskli ? 10 : 0), 0, 100);
  f.bosHafta = 0;
  if (f.sozlesme) f.sozlesme.kalan = Math.max(0, f.sozlesme.kalan - 1);
  const lines = fightLines(f, rk, won, yontem, raunt);
  if (ppvLine) lines.push(ppvLine);
  if (won) {
    f.g++;
    f.seri = Math.max(1, f.seri + 1);
    f.sira = Math.max(1, f.sira - randInt(2, 4) - (rk.guc > f.guc ? 1 : 0));
    f.guc = clamp(f.guc + (f.guc < f.pot ? 1 : 0), 30, 96);
    addTrust(r, f, 4);
    // Kemer savunması da itibar getirir ama yeni şampiyonluk kadar değil
    r.itibar = clamp(r.itibar + (mc.unvan ? (f.sampiyon ? 1 : 3) : chance(0.3) ? 1 : 0), 0, 100);
    if (mc.unvan) {
      if (!f.sampiyon) {
        f.sampiyon = true;
        r.sampiyonluk++;
        r.itibar = clamp(r.itibar + 4, 0, 100);
        lines.push(L("🏆 {0} yeni {1} şampiyonu!", [fullName(f), orgName(mc.org)]));
        msg(r, { rol: 'dovuscu', kim: fullName(f), fid: f.id, metin: pick([L("KEMER BİZİM! Bu gece ikimizin. Teşekkürler, ortak."), L("Çocukken hayalini kurduğum kemer belimde. Bunu sen mümkün kıldın."), L("Şimdi herkes bizi arayacak. Hazır ol.")]) });
        r.gecmis.unshift(L("Hafta {0}: 🏆 {1} {2} şampiyonu oldu.", [r.hafta, fullName(f), orgName(mc.org)]));
      } else lines.push(L("🏆 {0} kemerini korudu.", [fullName(f)]));
    }
  } else {
    f.m++;
    f.seri = Math.min(-1, f.seri - 1);
    f.sira = Math.min(15, f.sira + randInt(2, 3));
    if (f.sampiyon && mc.unvan) {
      f.sampiyon = false;
      lines.push(L("💔 {0} kemerini kaybetti.", [fullName(f)]));
    }
    addTrust(r, f, mc.ic ? -12 : -3);
    if (koLoss && chance(0.35)) {
      f.sakat = randInt(3, 8);
      lines.push(L("🩹 {0} hafta sahalardan uzak.", [f.sakat]));
    }
    if (f.sozlesme?.maddeler.includes('rovans') && !mc.rovans && !mc.ic) {
      r.teklifler.push({ id: uid(), fid: f.id, tip: 'mac', org: mc.org, ucret: r100(mc.ucret * 1.2), bonus: r100(mc.bonus * 1.2), rakip: rk, unvan: mc.unvan, son: r.hafta + 3 });
      lines.push(L("📜 Rövanş maddesi: {0} ile rövanş teklifi masada.", [rk.ad]));
    }
  }
  const kod: Method = fin ? (YONTEM_SUB.some((y) => y() === yontem) ? 'SUB' : yontem === L("nakavt") ? 'KO' : 'TKO') : yontem === L("oybirliğiyle karar") ? 'UD' : 'SD';
  f.maclar = [{ id: uid(), h: r.hafta, org: mc.org, rk, w: won, y: yontem, kod, ra: raunt, top: mc.unvan ? 5 : 3, unvan: mc.unvan || undefined, sup: mc.super || undefined, guc: gucOnce, kom: pay, satir: lines }, ...(f.maclar ?? [])].slice(0, 20);
  rapor.push(`${won ? '✅' : '❌'} ${fullName(f)} – ${rk.ad} (${orgName(mc.org)}) · ${L("komisyon")} ${$(pay)}`, ...lines.map((l) => '   ' + l));
  f.riskli = false;
  f.mac = undefined;
  // Ligde zirve: terfi ve sözleşme bitişi
  if (f.sozlesme && f.sozlesme.kalan === 0) {
    msg(r, { rol: 'sistem', kim: orgName(f.sozlesme.org), metin: L("{0} ile sözleşme sona erdi. Organizasyon yenilemek isterse teklif gönderecek.", [fullName(f)]) });
    const eskiOrg = f.sozlesme.org;
    f.sozlesme = undefined;
    if (won || f.sampiyon || chance(0.5)) offerContract(r, f, f.tier, eskiOrg);
  } else if (won && f.sira <= 2 && f.tier !== 'ucc' && f.seri >= 3) {
    const up = M_TIERS[M_TIERS.indexOf(f.tier) + 1];
    const mun = f.sozlesme?.maddeler.includes('munhasir');
    if (!mun) {
      offerContract(r, f, up);
      lines.push(L("📈 {0} üst ligin radarında.", [fullName(f)]));
    }
  }
}

// ---------- Olaylar (telefon) ----------

type EventDef = {
  /** Bu hafta tetiklenir mi? (dövüşçü seçimi dahil) */
  make: (r: MgrRun) => Omit<Mesaj, 'id' | 'hafta'> | null;
  /** Cevap: sonucu uygular ve sonucu anlatan metni döndürür */
  resolve: (r: MgrRun, m: Mesaj, k: string, f?: MFighter) => string;
};

const pickF = (r: MgrRun, pred: (f: MFighter) => boolean) => {
  const c = r.kadro.filter(pred);
  return c.length ? pick(c) : undefined;
};

export const EVENTS: Record<string, EventDef> = {
  bekletme: {
    make: (r) => {
      const f = pickF(r, (x) => !x.mac && x.sakat === 0 && x.bosHafta >= 4 && !x.soz && (x.kisilik === 'hirsli' || x.bosHafta >= 7));
      if (!f) return null;
      return {
        rol: 'dovuscu',
        kim: fullName(f),
        fid: f.id,
        metin: pick([L("Ne zaman dövüşüyorum? Salonda çürüyorum. Başka menajerler dövüşçülerine her ay maç buluyor."), L("{0} haftadır bekliyorum. Antrenörüm bile soruyor, ‘menajerin nerede?’ diye.", [f.bosHafta]), L("Bak, açık konuşayım: bu ay maç yoksa başka seçeneklere bakacağım.")]),
        secenekler: [
          { ad: L("3 hafta içinde maçın olacak, söz."), k: 'soz' },
          { ad: L("Sabret. Doğru maç gelecek, ucuz harcanmayacaksın."), k: 'sabir' },
          { ad: L("Bekleme süresini kampa çevir, daha güçlü döneceksin."), k: 'kamp' },
        ],
      };
    },
    resolve: (r, m, k, f) => {
      if (!f) return '';
      if (k === 'soz') {
        f.soz = r.hafta + 3;
        addTrust(r, f, 4);
        return L("Söz verdin. 3 hafta içinde maç ayarlanmazsa güveni sarsılacak.");
      }
      if (k === 'sabir') {
        addTrust(r, f, f.kisilik === 'hirsli' ? -7 : f.kisilik === 'sadik' ? 3 : -2);
        return f.kisilik === 'hirsli' ? L("“Sabır sabır… Hep aynı şey.” Hiç hoşuna gitmedi.") : L("“Tamam. Sana güveniyorum.”");
      }
      tz(r, 'mimar', 1);
      const gelis = f.kisilik === 'tembel' ? 0 : 1;
      f.guc = clamp(f.guc + gelis, 30, Math.max(f.guc, f.pot));
      addTrust(r, f, f.kisilik === 'tembel' ? -4 : 1);
      return f.kisilik === 'tembel' ? L("Kampa gitti ama ilk gün kaytardı. Antrenör seni aradı, sinirli.") : L("Kampa gömüldü. Antrenörü ‘formunun zirvesinde’ diyor. (Güç +1)");
    },
  },
  kilo: {
    make: (r) => {
      const f = pickF(r, (x) => !!x.mac && x.mac.hafta === r.hafta + 1 && !x.mac.ic);
      if (!f || !chance(0.35)) return null;
      return {
        rol: 'dovuscu',
        kim: fullName(f),
        fid: f.id,
        metin: pick([L("Abi tartıya bir gün kaldı, hâlâ 2 kilo fazlam var. Saunada bayılacak gibiyim."), L("Kilo inmiyor. Antrenör su kesmemi istiyor, ama başım dönüyor."), L("Gece 3. Uyuyamıyorum, açlıktan midem kramp girdi. 1,5 kilo daha var.")]),
        secenekler: [
          { ad: L("Son kiloları ver, maçı kaçıramayız."), k: 'zorla' },
          { ad: L("Organizasyondan ara kiloda dövüş iste."), k: 'arakilo' },
          { ad: L("Sağlığın önemli. Maçı iptal ediyorum."), k: 'iptal' },
        ],
      };
    },
    resolve: (r, m, k, f) => {
      if (!f?.mac) return '';
      if (k === 'zorla') {
        if (chance(0.7)) {
          f.hasar = clamp(f.hasar + 6, 0, 100);
          addTrust(r, f, -2);
          return L("Kiloyu son anda verdi, ama tükenmiş görünüyor. Maçta kondisyonu düşük olabilir.");
        }
        const ceza = r100(f.mac.ucret * 0.2);
        f.mac.ucret -= ceza;
        f.hasar = clamp(f.hasar + 8, 0, 100);
        addTrust(r, f, -6);
        bumpOrg(r, f.mac.org, -3);
        return L("Tartıyı geçemedi. Ücretinden {0} ceza kesildi, maç yine de yapılacak.", [$(ceza)]);
      }
      if (k === 'arakilo') {
        f.mac.ucret = r100(f.mac.ucret * 0.85);
        bumpOrg(r, f.mac.org, -3);
        addTrust(r, f, 4);
        return L("Organizasyon kabul etti ama ücret %15 düştü. Dövüşçün sana minnettar.");
      }
      const org = f.mac.org;
      tz(r, 'baba', 2);
      bumpOrg(r, org, -9);
      addTrust(r, f, f.kisilik === 'hirsli' ? -4 : 8);
      f.mac = undefined;
      return L("Maç iptal. {0} çok kızgın, ama dövüşçün sağlığını önemsediğini gördü.", [orgName(org)]);
    },
  },
  rakip_menajer: {
    make: (r) => {
      const f = pickF(r, (x) => x.guven < 55 && (x.sampiyon || x.sira <= 6 || x.tier === 'ucc' || x.tier === 'buyuk'));
      if (!f || !chance(0.5)) return null;
      const riv = pick(r.rakipler);
      return {
        rol: 'ag',
        kim: L("Salondan bir dost"),
        fid: f.id,
        veri: { riv: riv.ad },
        metin: pick([L("Haberin olsun: {0}'den {1}, dün akşam {2} ile yemekteydi. Komisyonu %8'e indireceklermiş.", [riv.ad, riv.patron, fullName(f)]), L("{0} adamları {1}'i arıyor. Sana söylediğimi söyleme.", [riv.ad, fullName(f)])]),
        secenekler: [
          { ad: L("Komisyonunu 3 puan düşür, hemen ara."), k: 'indir' },
          { ad: L("Yüz yüze konuş, neden gitmek istediğini sor."), k: 'konus' },
          { ad: L("Gitmek isteyen gitsin. Ben kimseyi zorla tutmam."), k: 'birak' },
        ],
      };
    },
    resolve: (r, m, k, f) => {
      if (!f) return '';
      const riv = r.rakipler.find((x) => x.ad === m.veri?.riv) ?? r.rakipler[0];
      if (k === 'indir') {
        tz(r, 'baba', 3);
        f.kom = Math.max(5, f.kom - 3);
        addTrust(r, f, 14);
        return L("Komisyon %{0}. “Bunu yapmana gerek yoktu… ama sağ ol.” Kaldı.", [f.kom]);
      }
      if (k === 'konus') {
        const p = f.guven / 100 + (f.kisilik === 'sadik' ? 0.3 : f.kisilik === 'paragoz' ? -0.25 : 0);
        if (chance(p + 0.2)) {
          addTrust(r, f, 10);
          return L("Saatlerce konuştunuz. “Sen beni kimse tanımazken buldun.” Kaldı.");
        }
        return leave(r, f, riv);
      }
      tz(r, 'kopek', 1);
      if (f.guven < 40 || f.kisilik === 'paragoz') return leave(r, f, riv);
      addTrust(r, f, 6);
      return L("Bu duruşun hoşuna gitti. “Kimse beni satın alamaz” dedi ve kaldı.");
    },
  },
  basin: {
    make: (r) => {
      const f = pickF(r, (x) => !!x.mac && x.hasar >= 30);
      if (!f || !chance(0.3)) return null;
      return {
        rol: 'basin',
        kim: pick([L("MMA Gündem muhabiri"), L("Kafes Dergisi"), L("Fight Hattı podcast")]),
        fid: f.id,
        metin: L("{0}'in kampta sakatlandığı konuşuluyor. Doğru mu? Yarın haber çıkacak, yorumunuzu almak istiyoruz.", [fullName(f)]),
        secenekler: [
          { ad: L("“Asılsız. Hiç bu kadar hazır olmamıştı.”"), k: 'yalanla' },
          { ad: L("“Ufak tefek ağrılar var, her dövüşçüde olduğu gibi.”"), k: 'yumusak' },
          { ad: L("“Yorum yok.”"), k: 'yorumyok' },
        ],
      };
    },
    resolve: (r, m, k, f) => {
      if (!f) return '';
      if (k === 'yalanla') {
        if (f.hasar >= 50 && chance(0.4)) {
          r.itibar = clamp(r.itibar - 4, 0, 100);
          return L("Ertesi gün antrenmandan bandajlı fotoğrafları sızdı. Basın seni yalancılıkla suçluyor. (İtibar -4)");
        }
        addTrust(r, f, 3);
        return L("Haber sönük kaldı. Dövüşçün arkasında durduğun için memnun.");
      }
      if (k === 'yumusak') return L("Dürüst ama sakin bir cevap. Kimse üstünde durmadı.");
      return L("“Yorum yok” her şeyi söyledi: bahis oranları rakip lehine kaydı. Ama dövüşçün umursamadı.");
    },
  },
  doktor: {
    make: (r) => {
      const f = pickF(r, (x) => x.hasar >= 60 && x.sakat === 0 && !x.riskli);
      if (!f || !chance(0.6)) return null;
      return {
        rol: 'doktor',
        kim: L("Dr. Selin Aras"),
        fid: f.id,
        metin: pick([L("Gizli konuşmam gerek. {0}'in son taramaları iyi değil. En az 3 ay kafa darbesi almamalı. Ama karar sizin.", [fullName(f)]), L("{0} son maçtan sonra baş ağrısından şikâyetçi. Bu birikimle bir nakavt daha almasını istemem.", [fullName(f)])]),
        secenekler: [
          { ad: L("Dinlenecek. 3 ay maç yok."), k: 'dinlen' },
          { ad: L("Bir maç daha, sonra uzun bir ara."), k: 'devam' },
          { ad: L("Ona anlat, kararı kendisi versin."), k: 'kendisi' },
        ],
      };
    },
    resolve: (r, m, k, f) => {
      if (!f) return '';
      if (k === 'dinlen') {
        tz(r, 'baba', 3);
        f.sakat = 12;
        f.hasar = clamp(f.hasar - 35, 0, 100);
        r.teklifler = r.teklifler.filter((t) => t.fid !== f.id || t.tip !== 'mac');
        if (f.mac) {
          bumpOrg(r, f.mac.org, -6);
          f.mac = undefined;
        }
        addTrust(r, f, f.kisilik === 'hirsli' ? -3 : 8);
        return f.kisilik === 'hirsli' ? L("Çok kızdı, ama yıllar sonra bu kararına teşekkür edecek.") : L("“Beni para makinesi gibi görmediğin için sağ ol.”");
      }
      if (k === 'devam') {
        tz(r, 'kopek', 3);
        f.riskli = true;
        r.gecmis.unshift(L("Hafta {0}: Doktor uyarısına rağmen {1} dövüşmeye devam etti.", [r.hafta, fullName(f)]));
        return L("Doktor başını iki yana salladı. Bir sonraki maçta nakavt riski çok yüksek.");
      }
      if (f.kisilik === 'hirsli' || f.kisilik === 'paragoz') {
        f.riskli = true;
        addTrust(r, f, 5);
        return L("“Ben iyiyim, dövüşeceğim.” Kararı o verdi, ama sorumluluk hâlâ sende.");
      }
      f.sakat = 10;
      f.hasar = clamp(f.hasar - 30, 0, 100);
      addTrust(r, f, 6);
      return L("Uzun süre sessiz kaldı, sonra “dinleneceğim” dedi. Sana dürüst olduğun için teşekkür etti.");
    },
  },
  aile: {
    make: (r) => {
      const f = pickF(r, (x) => x.guven >= 30);
      if (!f || !chance(0.12)) return null;
      const n = r100(1_500 + rand() * 4_000);
      return {
        rol: 'dovuscu',
        kim: fullName(f),
        fid: f.id,
        veri: { n },
        metin: pick([L("Babam hastanede. Ameliyat parası lazım, {0}. Bir sonraki maçımdan kesersin, söz.", [$(n)]), L("Ev sahibi kirayı artırdı, çocuklarla sokakta kalacağız. {0} avans verebilir misin?", [$(n)])]),
        secenekler: [
          { ad: L("Avansı gönderiyorum, geri ödemeyi sonra konuşuruz."), k: 'ver' },
          { ad: L("Yarısını verebilirim."), k: 'yari' },
          { ad: L("Şu an ajansın durumu buna izin vermiyor."), k: 'hayir' },
        ],
      };
    },
    resolve: (r, m, k, f) => {
      if (!f) return '';
      const n = Number(m.veri?.n ?? 2000);
      if (k === 'ver') {
        tz(r, 'baba', 3);
        r.para -= n;
        addTrust(r, f, 16);
        return L("{0} gönderildi. “Bunu hiç unutmayacağım.”", [$(n)]);
      }
      if (k === 'yari') {
        r.para -= Math.round(n / 2);
        addTrust(r, f, 7);
        return L("Yarısını gönderdin. Kalanını başka yerden buldu, sana minnettar.");
      }
      addTrust(r, f, f.kisilik === 'sadik' ? -4 : -9);
      return L("“Anlıyorum.” Ama sesi soğudu.");
    },
  },
  sponsor: {
    make: (r) => {
      const f = pickF(r, (x) => x.g >= 5 && (x.kisilik === 'medya' || x.sampiyon || x.tier !== 'amator'));
      if (!f || !chance(0.22)) return null;
      const big = r100((f.sampiyon ? 25_000 : 5_000) * (1 + M_TIERS.indexOf(f.tier) * 0.6));
      return {
        rol: 'sponsor',
        kim: pick([L("Turbo Enerji İçeceği"), L("Kıyma Burger Zinciri"), L("Delta Spor Giyim")]),
        fid: f.id,
        veri: { big },
        metin: L("{0} ile bir yıllık sponsorluk teklif ediyoruz: {1}. Reklam çekimi kamp haftasına denk geliyor.", [fullName(f), $(big)]),
        secenekler: [
          { ad: L("Kabul. Para paradır."), k: 'kabul' },
          { ad: L("Çekimi kamptan sonraya alırsanız kabul."), k: 'sart' },
          { ad: L("Teşekkürler, şimdilik odaklanmamız lazım."), k: 'red' },
        ],
      };
    },
    resolve: (r, m, k, f) => {
      if (!f) return '';
      const big = Number(m.veri?.big ?? 5000);
      if (k === 'kabul') {
        tz(r, 'kopek', 1);
        earn(r, f, big);
        if (f.mac) f.hasar = clamp(f.hasar + 3, 0, 100);
        addTrust(r, f, f.kisilik === 'tembel' ? 2 : f.kisilik === 'medya' || f.kisilik === 'paragoz' ? 6 : 1);
        return L("Anlaşma tamam. Komisyonun hesabına geçti. Kamp biraz aksadı.");
      }
      if (k === 'sart') {
        if (chance(0.6)) {
          earn(r, f, r100(big * 0.85));
          addTrust(r, f, 4);
          return L("Kabul ettiler, ücret biraz düştü ama kamp bozulmadı.");
        }
        return L("“Takvimimiz esnek değil.” Teklifi geri çektiler.");
      }
      addTrust(r, f, f.kisilik === 'paragoz' || f.kisilik === 'medya' ? -6 : 3);
      return f.kisilik === 'paragoz' ? L("“O para bizimdi!” Hiç memnun değil.") : L("Dövüşçün odaklanmaya değer verdiğin için memnun.");
    },
  },
  sosyal: {
    make: (r) => {
      const f = pickF(r, (x) => x.kisilik === 'medya' || (x.sampiyon && chance(0.3)));
      if (!f || !chance(0.15)) return null;
      const org = f.sozlesme?.org ?? 'amator';
      return {
        rol: 'basin',
        kim: L("Sosyal medya ekibin"),
        fid: f.id,
        veri: { org },
        metin: L("{0} organizasyon patronunu hedef alan sert bir video paylaştı. 2 milyon izlenme, herkes konuşuyor. Ne yapalım?", [fullName(f)]),
        secenekler: [
          { ad: L("Videoyu sildir, özür diletelim."), k: 'sil' },
          { ad: L("Arkasında dur. Konuşulmak iyidir."), k: 'arka' },
          { ad: L("Patronu ara, durumu kapalı kapılar ardında yumuşat."), k: 'ara' },
        ],
      };
    },
    resolve: (r, m, k, f) => {
      if (!f) return '';
      const org = (m.veri?.org as OrgId) ?? 'amator';
      if (k === 'sil') {
        addTrust(r, f, f.kisilik === 'medya' ? -8 : -2);
        bumpOrg(r, org, 3);
        return L("Video silindi. Patron memnun, dövüşçün susturulduğunu düşünüyor.");
      }
      if (k === 'arka') {
        addTrust(r, f, 8);
        bumpOrg(r, org, -8);
        f.sira = Math.max(1, f.sira - 1);
        return L("Gündem oldu! Taraftarlar onu seviyor, sıralamada bir basamak yükseldi. Patron ise seni artık sevmiyor.");
      }
      if (chance(0.5 + r.itibar / 200)) {
        bumpOrg(r, org, 2);
        addTrust(r, f, 2);
        return L("Patronla güldünüz: “Şov iyidir, ama ölçüyü kaçırmasın.” Kriz çözüldü.");
      }
      bumpOrg(r, org, -3);
      return L("Patron telefonu yüzüne kapattı.");
    },
  },
  patron: {
    make: (r) => {
      const orgs = (Object.keys(r.iliski) as OrgId[]).filter((o) => iliskiOf(r, o) >= 20);
      if (!orgs.length || !chance(0.12)) return null;
      const org = pick(orgs);
      const f = pickF(r, (x) => x.sozlesme?.org === org && !x.mac);
      if (!f) return null;
      return {
        rol: 'org',
        kim: L("{0} patronu", [orgName(org)]),
        fid: f.id,
        veri: { org },
        metin: L("Seninle çalışmak keyifli. Bir iyilik borçluyum. Ne istersin?"),
        secenekler: [
          { ad: L("{0}'e daha büyük bir maç ver.", [fullName(f)]), k: 'mac' },
          { ad: L("Sıralamada öne alın."), k: 'sira' },
          { ad: L("Şimdilik sende kalsın, ileride isterim."), k: 'sakla' },
        ],
      };
    },
    resolve: (r, m, k, f) => {
      if (!f) return '';
      const org = (m.veri?.org as OrgId) ?? 'amator';
      if (k === 'mac') {
        offerFight(r, f, f.sira <= 4 ? 'unvan' : 'zor');
        return L("Teklifler sekmesine bak. Büyük bir maç masada.");
      }
      if (k === 'sira') {
        f.sira = Math.max(1, f.sira - 3);
        bumpOrg(r, org, -5);
        return L("{0} üç basamak yükseldi.", [fullName(f)]);
      }
      bumpOrg(r, org, 6);
      return L("“Akıllı adamsın.” İlişkiniz daha da güçlendi.");
    },
  },
  ipucu: {
    make: (r) => {
      if (!chance(0.1) || r.adaylar.length > 4) return null;
      return {
        rol: 'ag',
        kim: pick([L("Eski bir antrenör"), L("Taksici Remzi"), L("Kulüp hademesi")]),
        metin: pick([L("Mahalledeki amatör turnuvada bir çocuk var, kimse adını bilmiyor. Ama gözlerimle gördüm, yumrukları taş gibi."), L("Kasabada bir güreşçi kız var, ulusal takımdan kesilmiş. Bence dünya şampiyonu olur.")]),
        secenekler: [
          { ad: L("Hemen gidip göreyim ({0}).", [$(800)]), k: 'git' },
          { ad: L("Sağ ol, şimdilik vaktim yok."), k: 'yok' },
        ],
      };
    },
    resolve: (r, m, k) => {
      if (k !== 'git') return L("Belki bir dahaki sefere.");
      tz(r, 'mimar', 2);
      r.para -= 800;
      const f = makeFighter({ tier: 'amator', guc: randInt(42, 50), pot: chance(0.6) ? randInt(82, 94) : randInt(60, 72), yas: randInt(18, 21), hafta: r.hafta });
      r.adaylar.unshift({ ...f, imza: 500, tahmin: clamp(f.pot + randInt(-6, 6), 40, 98) });
      return L("{0} yetenek avı listene eklendi. İmza parası sadece {1}.", [fullName(f), $(500)]);
    },
  },
  veda: {
    make: (r) => {
      const f = pickF(r, (x) => (x.yas >= 35 || x.hasar >= 85) && !x.mac);
      if (!f || !chance(0.25)) return null;
      return {
        rol: 'dovuscu',
        kim: fullName(f),
        fid: f.id,
        metin: pick([L("Sabah kalkınca dizlerim artık beni dinlemiyor. Bıraksam mı diye düşünüyorum."), L("Çocuklarım babalarının yüzünü tanıyamayacak hale gelmesin istiyorum. Sence bırakmalı mıyım?")]),
        secenekler: [
          { ad: L("Onurlu bir veda maçı ayarlayalım."), k: 'veda' },
          { ad: L("Daha birkaç yılın var, devam."), k: 'devam' },
          { ad: L("Bugün bırak. Sağlığın her şeyden önemli."), k: 'birak' },
        ],
      };
    },
    resolve: (r, m, k, f) => {
      if (!f) return '';
      if (k === 'devam') {
        addTrust(r, f, f.kisilik === 'hirsli' ? 6 : -4);
        f.riskli = f.hasar >= 70;
        return L("“Tamam. Bir sezon daha.”");
      }
      if (k === 'veda') {
        offerFight(r, f, 'kolay');
        addTrust(r, f, 10);
        r.itibar = clamp(r.itibar + 2, 0, 100);
        return L("Veda maçı teklifi masada. Herkes onu son kez görmek isteyecek.");
      }
      retireFighter(r, f);
      return L("{0} eldivenleri astı. Yıllarca seni iyilikle anacak.", [fullName(f)]);
    },
  },
};

function leave(r: MgrRun, f: MFighter, riv: Ajans): string {
  r.kadro = r.kadro.filter((x) => x.id !== f.id);
  r.teklifler = r.teklifler.filter((t) => t.fid !== f.id);
  riv.puan += Math.round(valueOf(f) / 2);
  r.ayrilan++;
  r.itibar = clamp(r.itibar - (f.sampiyon ? 6 : 2), 0, 100);
  r.gecmis.unshift(L("Hafta {0}: 💔 {1}, {2} ajansına geçti.", [r.hafta, fullName(f), riv.ad]));
  return L("{0} gitti. {1} imzayı attı bile.", [fullName(f), riv.ad]);
}

function retireFighter(r: MgrRun, f: MFighter) {
  r.kadro = r.kadro.filter((x) => x.id !== f.id);
  r.teklifler = r.teklifler.filter((t) => t.fid !== f.id);
  r.itibar = clamp(r.itibar + (f.sampiyon ? 4 : 1), 0, 100);
  r.gecmis.unshift(L("Hafta {0}: 🥊 {1} emekli oldu ({2}).", [r.hafta, fullName(f), rekorOf(f)]));
}

// ---------- Çıkar çatışması ----------

function conflictCheck(r: MgrRun) {
  if (r.mesajlar.some((m) => m.tip === 'catisma' && !m.cevap)) return;
  for (const a of r.kadro)
    for (const b of r.kadro) {
      if (a.id >= b.id || a.siklet !== b.siklet || !a.sozlesme || a.sozlesme.org !== b.sozlesme?.org) continue;
      if (a.mac || b.mac || a.sakat || b.sakat || a.sira > 6 || b.sira > 6 || !chance(0.5)) continue;
      const org = a.sozlesme.org;
      const ucret = r100(Math.max(payFor(a), payFor(b)) * 1.8);
      msg(r, {
        rol: 'org',
        kim: L("{0} eşleştirme ofisi", [orgName(org)]),
        tip: 'catisma',
        veri: { a: a.id, b: b.id, org, ucret, unvan: a.sampiyon || b.sampiyon ? 1 : 0 },
        metin: L("Taraftar bu maçı istiyor: {0} – {1}. İkisi de senin, biliyoruz. Kazanana bonus dahil, ikisine de {2}. Cevabını bekliyoruz.", [fullName(a), fullName(b), $(ucret)]),
        secenekler: [
          { ad: L("Kabul. Bu işin doğası bu."), k: 'kabul' },
          { ad: L("Önce ikisine soracağım."), k: 'sor' },
          { ad: L("Asla. Kendi dövüşçülerimi birbirine kırdırmam."), k: 'red' },
        ],
      });
      return;
    }
}

function resolveConflict(r: MgrRun, m: Mesaj, k: string): string {
  const a = r.kadro.find((x) => x.id === m.veri?.a);
  const b = r.kadro.find((x) => x.id === m.veri?.b);
  const org = (m.veri?.org as OrgId) ?? 'amator';
  if (!a || !b) return L("Eşleşme artık geçerli değil.");
  const ucret = Number(m.veri?.ucret ?? 10000);
  const book = () => {
    const unvan = !!m.veri?.unvan;
    const h = r.hafta + 3;
    a.mac = { hafta: h, org, ucret, bonus: r100(ucret * 0.4), unvan, ic: b.id, rakip: { ad: fullName(b), ulke: b.ulke, stil: b.stil, guc: b.guc, rekor: rekorOf(b) } };
    b.mac = { hafta: h, org, ucret, bonus: r100(ucret * 0.4), unvan, ic: a.id, rakip: { ad: fullName(a), ulke: a.ulke, stil: a.stil, guc: a.guc, rekor: rekorOf(a) } };
  };
  if (k === 'kabul') {
    tz(r, 'kopek', 3);
    book();
    addTrust(r, a, a.kisilik === 'hirsli' ? 2 : -8);
    addTrust(r, b, b.kisilik === 'hirsli' ? 2 : -8);
    bumpOrg(r, org, 6);
    return L("Maç {0}. haftada. Salonda ikisi artık birbirine selam vermiyor.", [r.hafta + 3]);
  }
  if (k === 'sor') {
    const evetA = a.kisilik === 'hirsli' || a.kisilik === 'paragoz' || (a.guc > b.guc && a.kisilik !== 'sadik');
    const evetB = b.kisilik === 'hirsli' || b.kisilik === 'paragoz' || (b.guc > a.guc && b.kisilik !== 'sadik');
    if (evetA && evetB) {
      book();
      bumpOrg(r, org, 4);
      return L("İkisi de “Varım” dedi. Kararı onlar verdi; güvenleri sağlam. Maç {0}. haftada.", [r.hafta + 3]);
    }
    const hayir = evetA ? b : a;
    addTrust(r, hayir, 6);
    bumpOrg(r, org, -6);
    return L("{0} “Arkadaşımla dövüşmem” dedi. Maç olmadı; organizasyon bozuldu ama dövüşçülerin sana daha çok güveniyor.", [fullName(hayir)]);
  }
  tz(r, 'baba', 3);
  addTrust(r, a, 6);
  addTrust(r, b, 6);
  bumpOrg(r, org, -12);
  return L("Reddettin. {0} öfkeli: “Bunu unutmayacağız.” Dövüşçülerin ise seninle gurur duyuyor.", [orgName(org)]);
}

/** Mesaja cevap */
export function answer(r: MgrRun, id: string, k: string) {
  const m = r.mesajlar.find((x) => x.id === id);
  if (!m || m.cevap || !m.secenekler) return;
  m.cevap = m.secenekler.find((s) => s.k === k)?.ad ?? k;
  m.okundu = true;
  const f = m.fid ? r.kadro.find((x) => x.id === m.fid) : undefined;
  if (m.tip === 'catisma') m.sonuc = resolveConflict(r, m, k);
  else if (m.tip && EVENTS[m.tip]) m.sonuc = EVENTS[m.tip].resolve(r, m, k, f);
}

// ---------- Hafta ----------

export const canAdvance = (r: MgrRun) => !trialOver(r) && !r.emekli;

/** Cevapsız kalan mesajlar hafta bitince kapanır: dövüşçü biraz kırılır, başka bir şey olmaz. */
function expirePending(r: MgrRun) {
  for (const m of bekleyen(r)) {
    m.cevap = L("(cevap vermedin)");
    m.okundu = true;
    const f = m.fid ? r.kadro.find((x) => x.id === m.fid) : undefined;
    if (m.tip === 'catisma') {
      const org = (m.veri?.org as OrgId) ?? 'amator';
      bumpOrg(r, org, -3);
      m.sonuc = L("Cevap gelmeyince organizasyon eşleşmeden vazgeçti.");
    } else if (f && m.rol === 'dovuscu' && m.tip !== 'kose_notu') {
      addTrust(r, f, -2);
      m.sonuc = L("Mesajı görüldü bıraktın. Biraz kırıldı.");
    } else m.sonuc = L("Fırsat kaçtı.");
  }
}

function weeklyEvents(r: MgrRun) {
  // Telefonu boğmamak için: haftada en fazla bir olay, dövüş haftasında ya da bekleyen mesaj varken daha seyrek
  const busy = r.kadro.some((f) => f.mac?.hafta === r.hafta) || bekleyen(r).length > 0;
  if (!chance(busy ? 0.35 : 0.7)) return;
  const keys = Object.keys(EVENTS).sort(() => rand() - 0.5);
  let n = 0;
  for (const k of keys) {
    if (n >= 1) break;
    const m = EVENTS[k].make(r);
    if (m) {
      msg(r, { ...m, tip: k });
      n++;
    }
  }
}

function rivalsTick(r: MgrRun) {
  // Rakipler güçlü bir ajansa karşı daha agresif büyür
  for (const a of r.rakipler) a.puan += Math.round(randInt(1, 6) * (1 + r.itibar / 120));
}

export function agencyScore(r: MgrRun) {
  return Math.round(r.kadro.reduce((a, f) => a + valueOf(f), 0) + r.itibar * 3 + r.sampiyonluk * 40);
}

export function agencyRanking(r: MgrRun) {
  const rows = [...r.rakipler.map((a) => ({ ad: a.ad, puan: a.puan, sen: false })), { ad: r.ajans, puan: agencyScore(r), sen: true }].sort((x, y) => y.puan - x.puan);
  return { rows, sira: rows.findIndex((x) => x.sen) + 1 };
}

function yearEnd(r: MgrRun, rapor: string[]) {
  const { sira } = agencyRanking(r);
  const yil = Math.floor((r.hafta - 1) / 52);
  if (sira === 1) {
    r.oduller.push(L("{0}. yıl: Yılın Menajeri", [yil]));
    r.itibar = clamp(r.itibar + 6, 0, 100);
    rapor.push(L("🏅 Yılın Menajeri ödülü senin! Sahneye çıkıp dövüşçülerine teşekkür ettin."));
    msg(r, { rol: 'sistem', kim: L("MMA Ödülleri"), metin: L("Tebrikler! {0}, {1}. yılın en iyi menajerlik ajansı seçildi.", [r.ajans, yil]) });
  } else rapor.push(L("📊 Yıl sonu: ajans sıralamasında {0}. oldun.", [sira]));
  for (const f of r.kadro) f.yas++;
}

function checkGoal(r: MgrRun, rapor: string[]) {
  const h = r.hedef;
  if (!h || h.tamam || h.basarisiz) return;
  let ok = false;
  if (r.senaryo === 'sifir') ok = r.kadro.some((f) => f.tier !== 'amator');
  else if (r.senaryo === 'yildiz') ok = r.kadro.some((f) => f.id === h.fid && !!f.sozlesme && f.sozlesme.kalan >= 2);
  else if (r.senaryo === 'batik') ok = r.para > 0;
  else ok = r.kadro.some((f) => f.tier === 'buyuk' || f.tier === 'ucc');
  if (ok) {
    h.tamam = true;
    r.itibar = clamp(r.itibar + 8, 0, 100);
    r.para += 10_000;
    rapor.push(L("🎯 Hedef tamam: {0} (+{1}, itibar +8)", [h.metin, $(10_000)]));
  } else if (r.hafta > h.bitis) {
    h.basarisiz = true;
    r.itibar = clamp(r.itibar - 5, 0, 100);
    rapor.push(L("⌛ Hedefe ulaşılamadı: {0}", [h.metin]));
  }
}

export function advanceWeek(r: MgrRun) {
  if (!canAdvance(r)) return;
  ensureMgr(r);
  expirePending(r);
  // Meydan okuma: her hafta herkes için aynı zar (sonuç yine de kararlara bağlı)
  if (r.meydan) setSeed(hashStr(`mnj-${r.meydan.kod}-${r.hafta}`));
  const rapor: string[] = [];
  // Maçlar (bu haftaya ayarlı olanlar); iç eşleşmede tek sonuç
  const done = new Set<string>();
  for (const f of [...r.kadro]) {
    if (!f.mac || f.mac.hafta !== r.hafta || done.has(f.id)) continue;
    if (f.mac.ic) {
      const o = r.kadro.find((x) => x.id === f.mac!.ic);
      done.add(f.id);
      if (!o || o.mac?.ic !== f.id) {
        // Karşı taraf ayrıldı ya da maçı iptal edildi
        f.mac = undefined;
        rapor.push(L("⚠️ {0}'in ajans içi maçı iptal oldu.", [fullName(f)]));
        continue;
      }
      {
        done.add(o.id);
        const p = 1 / (1 + Math.exp(-(f.guc - o.guc) / 7));
        const w = chance(p) ? f : o;
        const l = w === f ? o : f;
        resolveForced(r, w, true, rapor);
        resolveForced(r, l, false, rapor);
        rapor.push(L("⚔️ Ajansın içinde savaş bitti: {0} kazandı.", [fullName(w)]));
        continue;
      }
    }
    resolveFight(r, f, rapor);
  }
  // Haftalık bakım
  r.para -= ofisOf(r).kira;
  for (const f of r.kadro) {
    if (!f.mac) f.bosHafta++;
    if (f.sakat > 0) {
      f.sakat--;
      if (f.sakat === 0) {
        f.fizyo = undefined;
        rapor.push(L("💪 {0} sakatlığını atlattı.", [fullName(f)]));
      }
      if (f.sozlesme?.maddeler.includes('sakatlik')) earn(r, f, r100(f.sozlesme.ucret * 0.12));
    }
    f.hasar = clamp(f.hasar - (f.sakat > 0 ? 3 : 1), 0, 100);
    // Gelişim: genç ve potansiyelin altındaysa yavaşça büyür
    const gelisP = (f.kisilik === 'tembel' ? 0.06 : 0.11) * (f.yas <= 26 ? 1 : f.yas <= 31 ? 0.6 : 0.2) * (tarzOf(r) === 'mimar' ? 1.35 : 1);
    if (f.guc < f.pot && chance(gelisP)) f.guc++;
    if (f.yas >= 33 && chance(0.04)) f.guc = Math.max(30, f.guc - 1);
    // Söz tutulmadı
    if (f.soz && r.hafta > f.soz) {
      f.soz = undefined;
      if (!f.mac) {
        addTrust(r, f, -12);
        msg(r, { rol: 'dovuscu', kim: fullName(f), fid: f.id, metin: pick([L("Söz vermiştin. Maç yok. Senin sözüne bir daha nasıl güveneyim?"), L("3 hafta dedin. Takvime baktım, hiçbir şey yok.")]) });
      }
    }
    // Güveni dibe vuran dövüşçü gider
    if (f.guven < 15 && chance(0.4)) {
      rapor.push(leave(r, f, pick(r.rakipler)));
    }
  }
  if (r.para < -60_000) {
    r.emekli = true;
    rapor.push(L("🏦 Banka ajansın hesaplarını dondurdu. Ajans kapandı."));
  }
  rivalsTick(r);
  marketTick(r, rapor);
  arcTick(r, rapor);
  if (!r.meydan) checkGoal(r, rapor);
  if (r.hafta % 52 === 0) yearEnd(r, rapor);
  r.hafta++;
  if (r.meydan && r.hafta > r.meydan.bitis) {
    r.meydan.skor = meydanSkor(r);
    r.emekli = true;
    rapor.push(L("🏁 Meydan okuma bitti! Skorun: {0}", [r.meydan.skor]));
    r.rapor = rapor;
    setSeed(Date.now() >>> 0);
    return;
  }
  refreshCandidates(r);
  weeklyOffers(r);
  conflictCheck(r);
  fightWeekMessages(r);
  weeklyEvents(r);
  r.rapor = rapor;
  if (r.meydan) setSeed(Date.now() >>> 0);
}

/** İç eşleşme: sonucu önceden belirlenmiş maçı normal akışla işler (kazanan gerçekten kazanır). */
function resolveForced(r: MgrRun, f: MFighter, win: boolean, rapor: string[]) {
  resolveFight(r, f, rapor, win);
}

/** Emeklilik (ajansı kapat) */
export function retireMgr(r: MgrRun) {
  r.emekli = true;
}

export type MgrHall = { ad: string; ajans: string; hafta: number; sampiyonluk: number; gelir: number; oduller: number; tarih: number };

// =====================================================================================================
// 2. aşama: menajer tarzı, yaşayan pazar, dövüş haftası, süper dövüş + PPV, hikâye yayları, meydan okuma
// =====================================================================================================

// ---------- Eski kayıtlar ----------

const UN0: Record<MTier, number> = { amator: 4, bolgesel: 14, buyuk: 30, ucc: 48 };
export function ensureMgr(r: MgrRun): MgrRun {
  r.tarz ??= { kopek: 0, baba: 0, mimar: 0 };
  r.pazar ??= {};
  for (const f of r.kadro) f.un ??= UN0[f.tier] + (f.sampiyon ? 20 : 0);
  for (const a of r.adaylar) a.un ??= UN0[a.tier];
  return r;
}

// ---------- Menajer tarzı ----------

export type TarzKey = 'kopek' | 'baba' | 'mimar';
export const TARZ: Record<TarzKey, { ad: () => string; aciklama: () => string; ikon: string }> = {
  kopek: { ad: () => L("Köpekbalığı"), aciklama: () => L("Masada en sert sensin: organizasyonlar sana daha çok öder. Ama dövüşçülerin sana kolay ısınmaz."), ikon: 'shark-fin' },
  baba: { ad: () => L("Baba"), aciklama: () => L("Dövüşçülerin aileden biri: kötü kararlarını daha kolay affeder, rakip ajanslara kulak asmazlar."), ikon: 'account-heart' },
  mimar: { ad: () => L("Mimar"), aciklama: () => L("Ham yeteneği şekillendirirsin: gençler senin elinde daha hızlı gelişir, gözün daha keskindir."), ikon: 'chess-knight' },
};
export const TARZ_ESIK = 12;
export function tarzOf(r: MgrRun): TarzKey | null {
  const t = r.tarz ?? { kopek: 0, baba: 0, mimar: 0 };
  const sorted = (Object.entries(t) as [TarzKey, number][]).sort((a, b) => b[1] - a[1]);
  const [k, v] = sorted[0];
  return v >= TARZ_ESIK && v >= sorted[1][1] + 3 ? k : null;
}
function tz(r: MgrRun, k: TarzKey, n: number) {
  r.tarz ??= { kopek: 0, baba: 0, mimar: 0 };
  r.tarz[k] += n;
}

// ---------- Yaşayan pazar ----------

export const carpanOf = (r: MgrRun, o: OrgId) => {
  const p = r.pazar?.[o];
  return p && p.bitis >= r.hafta && !p.kapali ? p.carpan : 1;
};
export const kapali = (r: MgrRun, o: OrgId) => {
  const p = r.pazar?.[o];
  return !!p && !!p.kapali && p.bitis >= r.hafta;
};
const YATIRIMCI = [() => L("Körfez sermayeli bir fon"), () => L("Bir teknoloji milyarderi"), () => L("Bir yayın devi"), () => L("Bir enerji şirketi")];

function marketTick(r: MgrRun, rapor: string[]) {
  r.pazar ??= {};
  for (const [o, p] of Object.entries(r.pazar) as [OrgId, { bitis: number; kapali?: boolean }][]) {
    if (p.bitis < r.hafta) {
      delete r.pazar[o];
      if (p.kapali) msg(r, { rol: 'basin', kim: L("MMA Gündem"), metin: L("{0} yeni sahipleriyle geri dönüyor! Kadro kurmak için menajerleri arıyorlar.", [orgName(o)]) });
    }
  }
  if (!chance(0.025)) return;
  const adaylar = (['cfc', 'oktagon', 'pfl', 'one', 'mvp'] as OrgId[]).filter((o) => !r.pazar[o]);
  if (!adaylar.length) return;
  const o = pick(adaylar);
  const kind = weighted<'batis' | 'zengin' | 'tv'>([
    ['batis', 1],
    ['zengin', 1.2],
    ['tv', 1.5],
  ]);
  if (kind === 'batis') {
    r.pazar[o] = { carpan: 0, bitis: r.hafta + 26, kapali: true };
    r.teklifler = r.teklifler.filter((t) => t.org !== o);
    const etk: string[] = [];
    for (const f of r.kadro) {
      if (f.mac?.org === o) f.mac = undefined;
      if (f.sozlesme?.org === o) {
        f.sozlesme = undefined;
        etk.push(fullName(f));
      }
    }
    msg(r, { rol: 'basin', kim: L("MMA Gündem"), metin: L("SON DAKİKA: {0} iflas etti! Bütün sözleşmeler feshedildi, etkinlikler iptal.", [orgName(o)]) + (etk.length ? ' ' + L("Senin dövüşçülerin artık serbest: {0}.", [etk.join(', ')]) : '') });
    rapor.push(L("📉 {0} battı.", [orgName(o)]));
  } else if (kind === 'zengin') {
    const kim = pick(YATIRIMCI)();
    r.pazar[o] = { carpan: 1.5, bitis: r.hafta + 30, ad: kim };
    msg(r, { rol: 'basin', kim: L("MMA Gündem"), metin: L("{0}, {1}'i satın aldı! Ücretler %50 artıyor, yıldız transferi için çek defterleri açık.", [kim, orgName(o)]) });
    rapor.push(L("💰 {0} zenginleşti: ücretler %50 yukarıda.", [orgName(o)]));
    // Transfer savaşı: münhasır olmayan iyi dövüşçülere teklif
    for (const f of r.kadro) if (tierOfOrg(o) === f.tier && f.sozlesme?.org !== o && !f.sozlesme?.maddeler.includes('munhasir') && f.sira <= 8 && chance(0.6)) offerContract(r, f, f.tier, o);
  } else {
    r.pazar[o] = { carpan: 1.2, bitis: r.hafta + 26 };
    msg(r, { rol: 'basin', kim: L("MMA Gündem"), metin: L("{0} yeni bir yayın anlaşması imzaladı. Dövüşçü ücretleri %20 artıyor.", [orgName(o)]) });
  }
}

// ---------- Dövüş haftası ----------

const GRAPPLERS: Background[] = ['gures', 'bjj', 'judo', 'sambo'];
const STIL_AD: Record<Background, () => string> = {
  boks: () => L("boksör, elleri çok hızlı"),
  muaythai: () => L("Muay Thai dövüşçüsü, dirsek ve dizleri tehlikeli"),
  kickboks: () => L("kick boksör, uzun mesafeden tekmeler"),
  gures: () => L("güreşçi, seni yere indirmek isteyecek"),
  judo: () => L("judocu, clinch'te fırlatır"),
  bjj: () => L("jiu-jitsucu, yerde boğaz kilidi arar"),
  sambo: () => L("sambocu, bacak kilitlerinde usta"),
  kyokushin: () => L("karateci, tek vuruşla bitirebilir"),
  sokak: () => L("sokak dövüşçüsü, ne yapacağı belli olmaz"),
};
const bestCall = (f: MFighter, rk: Rakip) => (GRAPPLERS.includes(rk.stil) ? 'ayakta' : GRAPPLERS.includes(f.stil) ? 'yer' : 'baski');

function fightWeekMessages(r: MgrRun) {
  for (const f of r.kadro) {
    const mc = f.mac;
    if (!mc || mc.hafta !== r.hafta || mc.ic) continue;
    const buyuk = !!mc.unvan || !!mc.super;
    if (buyuk && chance(0.8))
      msg(r, {
        rol: 'basin',
        kim: L("{0} basın toplantısı", [orgName(mc.org)]),
        fid: f.id,
        tip: 'basin_toplanti',
        metin: pick([
          L("Kameralar açık, salon dolu. {0} mikrofonu aldı, gözü {1} üzerinde. Ne konuşsun?", [fullName(f), mc.rakip.ad]),
          L("Bir muhabir soruyor: “{0} senin için sadece bir basamak mı?” {1} sana bakıyor.", [mc.rakip.ad, f.ad]),
        ]),
        secenekler: [
          { ad: L("Sert konuş. Herkes bu maçı konuşsun."), k: 'sert' },
          { ad: L("Saygılı ol, profesyonel görün."), k: 'saygi' },
          { ad: L("Az konuş. Cevabı kafeste verecek."), k: 'sessiz' },
        ],
      });
    if (buyuk && chance(0.3))
      msg(r, {
        rol: 'org',
        kim: L("Tartı salonu"),
        fid: f.id,
        tip: 'yuzyuze',
        metin: pick([L("Yüz yüze gelirken {0} ile {1} burun buruna geldi, biri ittirdi! Güvenlik bekliyor.", [f.ad, mc.rakip.ad]), L("{0}, {1} hakkında ağır bir laf etti. {1} kudurdu, sahneye doğru yürüyor.", [mc.rakip.ad, f.ad])]),
        secenekler: [
          { ad: L("Araya gir, ayır."), k: 'ayir' },
          { ad: L("Bırak, şov olsun."), k: 'birak' },
          { ad: L("Dövüşçünü kenara çek, sakinleştir."), k: 'sakin' },
        ],
      });
    msg(r, {
      rol: 'dovuscu',
      kim: L("{0} · maç gecesi", [f.ad]),
      fid: f.id,
      tip: 'kose_notu',
      metin: L("Soyunma odasındayız. Rakip {0}: {1}. Raunt arasında köşeye tek bir not iletebilirsin. Ne diyelim?", [mc.rakip.ad, STIL_AD[mc.rakip.stil]()]),
      secenekler: [
        { ad: L("Ayakta kal, mesafeyi koru."), k: 'ayakta' },
        { ad: L("Onu yere indir."), k: 'yer' },
        { ad: L("Baskı kur, nefesini kes."), k: 'baski' },
      ],
    });
  }
}

EVENTS.basin_toplanti = {
  make: () => null,
  resolve: (r, m, k, f) => {
    if (!f?.mac) return '';
    const mc = f.mac;
    if (k === 'sert') {
      mc.hype = (mc.hype ?? 0) + 25;
      mc.kose = (mc.kose ?? 0) - 0.15;
      if (f.kisilik === 'medya') addTrust(r, f, 5);
      tz(r, 'kopek', 1);
      return pick([L("Salon karıştı, klip milyonlarca izlendi. Bilet satışları uçtu, ama rakip artık çok hırslı."), L("Manşetlerdesiniz. Rakip kampı “onu susturacağız” dedi.")]);
    }
    if (k === 'saygi') {
      mc.hype = (mc.hype ?? 0) + 8;
      bumpOrg(r, mc.org, 2);
      return L("Patron memnun: “Böyle dövüşçüleri severiz.”");
    }
    mc.kose = (mc.kose ?? 0) + 0.12;
    if (f.kisilik === 'medya') addTrust(r, f, -3);
    return L("Kısa cevaplar, soğuk bakışlar. Dövüşçün tamamen maça odaklı.");
  },
};
EVENTS.yuzyuze = {
  make: () => null,
  resolve: (r, m, k, f) => {
    if (!f?.mac) return '';
    const mc = f.mac;
    if (k === 'ayir') return L("Araya girdin, kriz büyümedi. Fotoğraflar yine de olay oldu.");
    if (k === 'birak') {
      mc.hype = (mc.hype ?? 0) + 18;
      if (chance(0.3)) {
        const ceza = r100(mc.ucret * 0.1);
        mc.ucret -= ceza;
        bumpOrg(r, mc.org, -2);
        return L("Şov oldu, ama komisyon {0} para cezası kesti.", [$(ceza)]);
      }
      return L("Görüntüler her yerde. Herkes cumartesiyi bekliyor.");
    }
    mc.kose = (mc.kose ?? 0) + 0.1;
    mc.hype = Math.max(0, (mc.hype ?? 0) - 5);
    if (f.kisilik === 'medya' || f.kisilik === 'hirsli') addTrust(r, f, -3);
    return L("Omzundan tutup kenara çektin. Gözleri hâlâ yanıyor, ama artık kontrol sende.");
  },
};
EVENTS.kose_notu = {
  make: () => null,
  resolve: (r, m, k, f) => {
    if (!f?.mac) return '';
    const mc = f.mac;
    if (k === bestCall(f, mc.rakip)) {
      mc.kose = (mc.kose ?? 0) + 0.5;
      return pick([L("Köşe başını salladı: “Tam düşündüğümüz şey.”"), L("Antrenör notu okuyup gülümsedi. Plan net.")]);
    }
    if (k === 'yer' && GRAPPLERS.includes(mc.rakip.stil)) {
      mc.kose = (mc.kose ?? 0) - 0.3;
      return L("Antrenör kaşlarını çattı: “Onunla yerde mi? Emin misin?”");
    }
    return L("Köşe notu aldı. Fena bir plan değil, ama en iyisi de değil.");
  },
};

// ---------- Süper dövüş ----------

const SUPER_YILDIZ = [() => L("eski boks dünya şampiyonu"), () => L("bir üst sikletin şampiyonu"), () => L("sosyal medyanın en ünlü dövüşçüsü"), () => L("emeklilikten dönen efsane")];

function superOffer(r: MgrRun, f: MFighter) {
  if (f.mac || f.sakat || f.sozlesme?.maddeler.includes('munhasir') || r.teklifler.some((t) => t.fid === f.id && t.super)) return;
  const org: OrgId = f.tier === 'ucc' ? 'ufc' : (f.sozlesme?.org ?? 'mvp');
  if (kapali(r, org)) return;
  const n = makeName();
  const rakip: Rakip = { ad: `${n.ad} ${n.soyad}`, ulke: n.ulke, stil: chance(0.4) ? 'boks' : weighted(STYLES), guc: clamp(f.guc + randInt(-4, 6), 50, 95), rekor: `${randInt(18, 30)}-${randInt(1, 5)}-0` };
  const kim = pick(SUPER_YILDIZ)();
  r.teklifler.push({ id: uid(), fid: f.id, tip: 'mac', org, ucret: r100(payFor(f) * 2.2 * carpanOf(r, org)), bonus: r100(payFor(f) * 0.8 * carpanOf(r, org)), rakip, super: true, son: r.hafta + 3 });
  msg(r, { rol: 'org', kim: L("{0} patronu", [orgName(org)]), fid: f.id, metin: L("Büyük oynayalım: {0} karşısında {1} ({2}). Sabit ücret mi, yoksa PPV satışlarından pay mı? Teklifler sekmesinde.", [fullName(f), rakip.ad, kim]) });
}

export const PPV_FIYAT = 70;
export const PPV_PAY = 0.25;
/** PPV satışı: şöhret ve ilgiyle, geniş bir belirsizlikle */
export function ppvSales(f: MFighter, hype: number) {
  return Math.round((f.un * 300 + hype * 220) * (0.4 + rand() * 1.2));
}
/** PPV payının beklenen geliri (gösterim için) */
export const ppvEstimate = (f: MFighter) => r100((f.un * 300 + 20 * 220) * PPV_FIYAT * PPV_PAY);

/** Sosyal medyada meydan okut: şöhret ve maç ilgisi artar, süper dövüş şansı doğar. 4 haftada bir. */
export function provoke(r: MgrRun, id: string): string {
  const f = r.kadro.find((x) => x.id === id);
  if (!f || (f.kiskirt && r.hafta - f.kiskirt < 4)) return '';
  f.kiskirt = r.hafta;
  f.un = clamp(f.un + randInt(4, 9), 0, 100);
  if (f.mac) f.mac.hype = (f.mac.hype ?? 0) + 10;
  tz(r, 'kopek', 1);
  if (f.kisilik === 'medya') addTrust(r, f, 4);
  else if (f.kisilik === 'sadik') addTrust(r, f, -2);
  if (f.sozlesme && chance(0.25)) bumpOrg(r, f.sozlesme.org, -2);
  if ((f.tier === 'buyuk' || f.tier === 'ucc') && f.un >= 45 && chance(0.25 + f.un / 300)) {
    superOffer(r, f);
    return L("Paylaşım patladı! Telefonun çalıyor: süper dövüş teklifi geldi.");
  }
  return pick([L("Paylaşım gündem oldu. Şöhreti arttı."), L("Video yayıldı, yorumlar ikiye bölündü. Ama herkes onu konuşuyor.")]);
}

// ---------- Hikâye yayları ----------

export type ArcKey = 'son_sans' | 'baba' | 'dahi';
export const ARC: Record<ArcKey, { ad: () => string }> = {
  son_sans: { ad: () => L("Son şans") },
  baba: { ad: () => L("Kızı için kemer") },
  dahi: { ad: () => L("Sokaktan gelen dâhi") },
};

function assignArc(r: MgrRun, f: MFighter, force?: ArcKey) {
  if (f.hikaye) return;
  const k: ArcKey | null = force ?? (f.yas >= 30 && chance(0.5) ? 'son_sans' : f.yas <= 22 && f.pot >= 80 && chance(0.5) ? 'dahi' : f.yas >= 24 && !f.kadin && chance(0.25) ? 'baba' : null);
  if (!k) return;
  if (k === 'son_sans') {
    f.hikaye = { tip: k, adim: 0, bitis: r.hafta + 104 };
    msg(r, { rol: 'dovuscu', kim: fullName(f), fid: f.id, metin: L("Sana açık konuşayım: {0} yaşındayım. İki yıl içinde kemer yoksa eldivenleri asacağım. Bu benim son şansım.", [f.yas]) });
  } else if (k === 'baba') {
    f.hikaye = { tip: k, adim: 0, bitis: r.hafta + 60 };
    msg(r, { rol: 'dovuscu', kim: fullName(f), fid: f.id, metin: L("Kızım her gece soruyor: “Baba, kemer ne zaman?” Ona söz verdim. Bir yıl içinde bir kemer getireceğim, hangi ligde olursa olsun.") });
  } else f.hikaye = { tip: k, adim: 0, bitis: r.hafta + 120 };
}

function arcTick(r: MgrRun, rapor: string[]) {
  for (const f of [...r.kadro]) {
    const h = f.hikaye;
    if (!h || h.adim < 0) continue;
    if (h.tip === 'son_sans' || h.tip === 'baba') {
      if (h.adim === 0 && f.seri >= 2) {
        h.adim = 1;
        msg(r, { rol: 'dovuscu', kim: fullName(f), fid: f.id, metin: h.tip === 'son_sans' ? L("Herkes beni bitti sanıyordu. Yaşlı kurt hâlâ ısırıyor, değil mi?") : L("Kızım son maçımı okulda arkadaşlarına izletmiş. Öğretmeni aradı, gülmekten öldük.") });
      }
      if (f.sampiyon) {
        h.adim = -1;
        addTrust(r, f, 30);
        r.itibar = clamp(r.itibar + 5, 0, 100);
        msg(r, { rol: 'dovuscu', kim: fullName(f), fid: f.id, metin: h.tip === 'son_sans' ? L("Yaptık. Kimse inanmazken sen inandın. Bu kemer ikimizin, ortak.") : L("Kemeri kızımın beline taktım. Ona bol geldi, ama gözleri… Bunu sana borçluyum.") });
        rapor.push(L("📖 Hikâye tamamlandı: {0} ({1}) · itibar +5", [fullName(f), ARC[h.tip].ad()]));
        r.gecmis.unshift(L("Hafta {0}: 📖 {1}: “{2}” hikâyesi mutlu sonla bitti.", [r.hafta, fullName(f), ARC[h.tip].ad()]));
      } else if (r.hafta > h.bitis) {
        h.adim = -1;
        if (h.tip === 'son_sans') {
          msg(r, { rol: 'dovuscu', kim: fullName(f), fid: f.id, metin: L("Söz sözdür. Eldivenleri asıyorum. Kemer olmadı, ama yanımda sen vardın. Teşekkürler.") });
          retireFighter(r, f);
          rapor.push(L("📖 {0} kemersiz veda etti.", [fullName(f)]));
        } else {
          addTrust(r, f, -10);
          msg(r, { rol: 'dovuscu', kim: fullName(f), fid: f.id, metin: L("Bir yıl geçti. Kızım artık sormuyor. Bu daha kötü.") });
        }
      }
    } else {
      if (h.adim === 0 && r.hafta - f.katilis >= 6 && chance(0.2)) {
        h.adim = 1;
        msg(r, {
          rol: 'ag',
          kim: L("{0} için antrenörü", [f.ad]),
          fid: f.id,
          tip: 'dahi_ev',
          metin: L("{0} yine antrenmana gelmedi. Mahalledeki eski arkadaşlarıyla takılıyor, evde kavga bitmiyor. Bu çocuk kaybolacak.", [f.ad]),
          secenekler: [
            { ad: L("Salonun yanına oda tut, oraya taşınsın ({0}).", [$(3_000)]), k: 'oda' },
            { ad: L("Oturup ailesiyle konuşacağım."), k: 'aile' },
            { ad: L("Bu onun özel hayatı, karışmam."), k: 'karisma' },
          ],
        });
      }
      if (h.adim === 1 && (f.tier === 'buyuk' || f.tier === 'ucc')) {
        h.adim = -1;
        r.itibar = clamp(r.itibar + 4, 0, 100);
        addTrust(r, f, 15);
        msg(r, { rol: 'dovuscu', kim: fullName(f), fid: f.id, metin: L("Sen olmasan o sokaklarda kaybolup giderdim. Şimdi büyük ligdeyim. Annem ilk kez maçımı izleyecek.") });
        rapor.push(L("📖 {0} sokaktan büyük lige uzandı · itibar +4", [fullName(f)]));
      }
    }
  }
}

EVENTS.dahi_ev = {
  make: () => null,
  resolve: (r, m, k, f) => {
    if (!f) return '';
    if (k === 'oda') {
      r.para -= 3_000;
      f.guc = clamp(f.guc + 2, 30, Math.max(f.guc, f.pot));
      addTrust(r, f, 12);
      tz(r, 'mimar', 2);
      tz(r, 'baba', 1);
      return L("Yeni odasına taşındı. İlk hafta her sabah ilk o geldi. (Güç +2)");
    }
    if (k === 'aile') {
      if (chance(0.6)) {
        addTrust(r, f, 8);
        tz(r, 'baba', 2);
        return L("Annesi ağladı, babası elini sıktı. Ev sakinleşti, çocuk salona döndü.");
      }
      addTrust(r, f, -2);
      return L("Babası kapıyı yüzüne kapattı. Çocuk arada kaldı.");
    }
    if (chance(0.45)) {
      f.guc = Math.max(30, f.guc - 3);
      f.pot = Math.max(f.guc, f.pot - 4);
      if (f.hikaye) f.hikaye.adim = -1;
      return L("İki hafta sonra bir gece kavgasından karakola düştü. Eskisi gibi değil artık.");
    }
    return L("Bir süre kayboldu, sonra kendiliğinden döndü. Şanslısın.");
  },
};

// ---------- Haftalık meydan okuma ----------

export const MEYDAN_HAFTA = 26;
function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
/** Bu takvim haftasının kodu (ISO hafta; herkes için aynı) */
export function meydanKodu(now = Date.now()) {
  const d = new Date(now);
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const day = (new Date(t).getUTCDay() + 6) % 7;
  const thu = t - day * 864e5 + 3 * 864e5;
  const y = new Date(thu).getUTCFullYear();
  const w = Math.floor((thu - Date.UTC(y, 0, 1)) / (7 * 864e5)) + 1;
  return `${y}-${String(w).padStart(2, '0')}`;
}
export const meydanSenaryo = (kod: string): Senaryo => (['sifir', 'yurtdisi', 'batik', 'yildiz'] as Senaryo[])[hashStr(kod) % 4];

export function createMeydan(ad: string, soyad: string, ajans: string): MgrRun {
  const kod = meydanKodu();
  setSeed(hashStr(`mnj-${kod}`));
  const r = createMgrRun(ad, soyad, ajans, meydanSenaryo(kod), false);
  r.meydan = { kod, bitis: MEYDAN_HAFTA };
  r.hedef = undefined;
  setSeed(Date.now() >>> 0);
  return r;
}

export function meydanSkor(r: MgrRun) {
  return Math.max(0, Math.round(agencyScore(r) + r.para / 500 + r.gelir / 1000));
}
const check = (kod: string, s: number) => (hashStr(`${kod}:${s}:yol`) % 1296).toString(36).toUpperCase().padStart(2, '0');
/** Paylaşım kodu: YOL-MNJ-<hafta>-<skor>-<kontrol> */
export function meydanPaylas(r: MgrRun) {
  const s = r.meydan?.skor ?? meydanSkor(r);
  const kod = r.meydan?.kod ?? meydanKodu();
  return `YOL-MNJ-${kod}-${s}-${check(kod, s)}`;
}
/** Arkadaşının kodunu doğrular */
export function readMeydan(code: string): { kod: string; skor: number } | null {
  const m = code.trim().toUpperCase().match(/^YOL-MNJ-(\d{4}-\d{2})-(\d+)-([0-9A-Z]{2})$/);
  if (!m) return null;
  return check(m[1], Number(m[2])) === m[3] ? { kod: m[1], skor: Number(m[2]) } : null;
}

// =====================================================================================================
// 3. aşama: maç kayıtları, izlenebilir maçlar, face-off
// =====================================================================================================

/** Rakibin soyadı (kafes sahnesi isimden aktörü bulur) */
export const rkSoyad = (rk: Rakip) => rk.ad.split(' ').slice(-1)[0];

/** Oyunun ana zarını bozmayan yerel zar: aynı kayıt her izlendiğinde aynı maç oynar */
function localRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Çeviri yapmadan yer tutucuları doldurur (kafes sahnesi Türkçe anlatımdan hareket okur; her dilde aynı animasyon) */
export const rawL = (t: string, v?: readonly unknown[]) => (v ? t.replace(/\{(\d+)\}/g, (m, i) => (v[Number(i)] !== undefined ? String(v[Number(i)]) : m)) : t);

/** Kayıttan raunt raunt maç anlatımı (kafes sahnesinin anladığı satırlar). Raunt başları "— N. raunt" ile başlar. tr verilirse o çevirmenle yazılır (aynı kayıt hep aynı anları üretir). */
export function fightBeats(f: Pick<MFighter, 'soyad' | 'stil'>, k: MKayit, L: (t: string, v?: readonly unknown[]) => string = Lx): string[] {
  const rnd = localRng(hashStr(`${k.id}-${k.h}`));
  const pk = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const P = f.soyad;
  const O = rkSoyad(k.rk);
  const W = k.w ? P : O;
  const Lo = k.w ? O : P;
  const gW = GRAPPLE.includes(k.w ? f.stil : k.rk.stil);
  const gL = GRAPPLE.includes(k.w ? k.rk.stil : f.stil);
  const strike = (X: string, Y: string) =>
    pk([
      L("{0} sert bir sağ el yerleştirdi.", [X]),
      L("{0} jab ile mesafeyi kontrol ediyor.", [X]),
      L("{0} kroşeyle isabet buldu.", [X]),
      L("{0} aparkatla {1}'in çenesini kaldırdı.", [X, Y]),
      L("{0} üçlü kombinasyon vurdu.", [X]),
      L("{0} kontra bir sol el ile karşılık verdi.", [X]),
    ]);
  const kick = (X: string, Y: string) =>
    pk([L("{0} bacağa sert bir low kick vurdu.", [X]), L("{0} gövdeye tekme gömdü.", [X]), L("{0} yüksek tekme denedi, {1} bloke etti.", [X, Y])]);
  const grap = (X: string, Y: string) =>
    pk([L("{0} bacaklarına daldı ve {1}'i yere indirdi.", [X, Y]), L("{0} üstten yumruk yağdırıyor.", [X]), L("{0} yere indirmeye çalıştı, {1} sprawl ile savundu.", [X, Y]), L("{0} rakibini kafese yasladı, dizler çalışıyor.", [X])]);
  const beat = (X: string, Y: string, g: boolean) => {
    const v = rnd();
    return g && v < 0.45 ? grap(X, Y) : v < 0.75 ? strike(X, Y) : v < 0.92 ? kick(X, Y) : L("{0} rakibini kafese yasladı.", [X]);
  };
  const out: string[] = [];
  for (let i = 1; i <= k.ra; i++) {
    out.push(L("— {0}. raunt", [i]));
    const last = i === k.ra;
    // Kazananın raundu mu? Kararla biten maçta kaybeden bir raunt alabilir.
    const winRound = last || rnd() < (k.kod === 'SD' ? 0.55 : 0.72);
    const A = winRound ? W : Lo;
    const D = winRound ? Lo : W;
    const gA = winRound ? gW : gL;
    const n = 3 + Math.floor(rnd() * 2);
    for (let j = 0; j < n; j++) out.push(rnd() < 0.72 ? beat(A, D, gA) : beat(D, A, winRound ? gL : gW));
    if (!last && rnd() < 0.25) out.push(L("{0} sarsıldı! {1} bastırıyor.", [D, A]));
    if (last) {
      if (k.kod === 'SUB') out.push(L("{0} sırtını aldı…", [W]), L("{0} {1} kilidini kapattı!", [W, k.y]), L("{0} tap attı! Bitti!", [Lo]));
      else if (k.kod === 'KO' || k.kod === 'TKO') {
        out.push(L("{0} sarsıldı! {1} bastırıyor.", [Lo, W]));
        out.push(k.kod === 'KO' ? L("{0} kroşeyi patlattı, {1} yere yığıldı! Nakavt!", [W, Lo]) : L("{0} üstten yumruk yağdırıyor, hakem durdurdu! TKO!", [W]));
      } else out.push(L("Gong çaldı. Karar jüri kartlarında."), L("Kartlar okundu: {0}. Kazanan {1}!", [k.y, W]));
    }
  }
  return out;
}

/** Face-off sahnesinde dövüşçünün ve rakibin cümlesi */
export function faceOffLines(f: MFighter, unvan: boolean): [string, string] {
  const rnd = localRng(hashStr(`${f.id}-${f.mac?.hafta ?? 0}-fo`));
  const pk = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const own: Record<Kisilik, string[]> = {
    hirsli: [L("Sıralamada adın vardı. Cumartesiden sonra olmayacak."), L("Senin için kimse ağlamayacak."), L("Bu gece senin kariyerini bitireceğim."), L("Herkes beni konuşacak, sen de dahil."), unvan ? L("O kemer zaten benim, sadece takacağım.") : L("Sen sadece bir basamaksın.")],
    sadik: [L("Annem tribünde. Onu utandırmayacağım."), L("Plan basit: çalıştığımı yapacağım."), L("Ekibim arkamda. Hazırım."), L("Saygım var ama o kafeste kardeş yok."), L("Köşemi dinleyeceğim, gerisi gelir.")],
    tembel: [L("İki raunt yeter de artar."), L("Kamp mı? Uyudum, dinlendim, hazırım."), L("Erken bitireceğim, akşam yemeğine yetişmem lazım."), L("Antrenman mı? Yeteneğim yeter."), L("Uzatmayalım şu işi.")],
    medya: [L("Bu face-off'un klibi yarın her yerde."), L("Takipçilerim seni yorumlarda bitirdi bile."), L("Kameralar hazır mı? Bu an viral olacak."), L("Seni yarın herkes benim videomdan tanıyacak."), L("Gülümse, bu fotoğraf manşette.")],
    paragoz: [L("Kazanınca yeni sözleşme masada."), L("Senin bonusun da benim olacak."), L("Bu maç benim maaşımı ikiye katlayacak."), L("Sponsorlarım bakıyor, iyi görünmem lazım."), L("Ödemeyi aldım, şimdi şovu izle.")],
  };
  const rk = [L("Menajerine söyle, yeni dövüşçü arasın."), L("Seni izledim. Hiçbir şey görmedim."), L("Bu gece eve yürüyerek dönmeyeceksin."), L("Ellerin titriyor, fark ettim."), L("Kemer yolu benden geçiyor, sen yoldan çekil."), L("Yanlış kapıyı çaldın."), L("Gözlerinde korku görüyorum."), L("Üçüncü raunda kalmazsın."), L("Menajerin seni kurbanlığa getirmiş."), L("Bu gece ışıkları söndüreceğim.")];
  return [pk(own[f.kisilik] ?? own.sadik), pk(rk)];
}

// ---------- Ödüllü reklam teklifleri (güç vermez: bilgi ve zaman) ----------

/** Piyasa araştırması: pazarlık masasında organizasyonun ücrette çıkabileceği üst sınır görünür */
export function masaArastir(r: MgrRun, id: string): string {
  const t = r.teklifler.find((x) => x.id === id);
  if (!t?.masa) return '';
  t.masa.bilgi = true;
  return L("Araştırma tamam: {0} ücrette en fazla yaklaşık {1} verir.", [orgName(t.org), $(masaTavan(t))]);
}
export const masaTavan = (t: Teklif) => r100((t.masa?.baz.ucret ?? t.ucret) * (t.masa?.tavan ?? 1));
/** Yeni adaylar: yetenek avı dört haftada bir kez erken yenilenir */
export const canAdCandidates = (r: MgrRun) => r.hafta - r.adayHafta >= 1 && r.hafta - (r.rwAday ?? -99) >= 4;
export function adNewCandidates(r: MgrRun): string {
  r.rwAday = r.hafta;
  refreshCandidates(r, true);
  return L("Gözcülerin bir tur daha attı: {0} yeni aday.", [r.adaylar.length]);
}
/** Fizyoterapi: sakatlık başına bir kez, dövüşçü 2 hafta erken döner (en az 1 hafta kalır) */
export const canAdPhysio = (f: MFighter) => f.sakat >= 2 && !f.fizyo;
export function adPhysio(r: MgrRun, id: string): string {
  const f = r.kadro.find((x) => x.id === id);
  if (!f || !canAdPhysio(f)) return '';
  f.sakat = Math.max(1, f.sakat - 2);
  f.fizyo = true;
  return L("🩺 Fizyoterapi işe yaradı: {0} {1} hafta sonra dönüyor.", [fullName(f), f.sakat]);
}
