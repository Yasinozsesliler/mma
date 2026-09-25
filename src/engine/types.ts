import type { InterviewCtx } from './interview';
import type { SponsorDeal } from './sponsors';
import type { Pet } from './pets';
import type { Candidate } from './nightlife';

export type StatKey = 'vurus' | 'gures' | 'yer' | 'kondisyon' | 'cene' | 'hiz' | 'iq';
export type Stats = Record<StatKey, number>;

export const STAT_KEYS: StatKey[] = ['vurus', 'gures', 'yer', 'kondisyon', 'cene', 'hiz', 'iq'];
export const STAT_LABELS: Record<StatKey, string> = {
  vurus: 'Vuruş',
  gures: 'Güreş',
  yer: 'Yer',
  kondisyon: 'Kondisyon',
  cene: 'Çene',
  hiz: 'Hız',
  iq: 'IQ',
};

export type Background =
  | 'boks'
  | 'muaythai'
  | 'kickboks'
  | 'gures'
  | 'judo'
  | 'bjj'
  | 'sambo'
  | 'kyokushin'
  | 'sokak';

export type WeightClass = 'sinek' | 'horoz' | 'tuy' | 'hafif' | 'welter' | 'orta' | 'yariagir' | 'agir';
export type OrgId = 'amator' | 'cfc' | 'oktagon' | 'pfl' | 'one' | 'mvp' | 'dwcs' | 'ufc';
export type Stage = 'amator' | 'bolgesel' | 'buyuk' | 'ufc';

export interface Appearance {
  ten: number; // SKIN_TONES indeksi
  sac: 'kazik' | 'kisa' | 'mohawk' | 'uzun' | 'topuz' | 'afro' | 'orgu' | 'kel';
  sacRenk: number;
  goz: number;
  sakal: 'yok' | 'kirli' | 'tam' | 'keci' | 'biyik';
  yara: boolean;
  dovme: boolean;
}

export interface Belt {
  org: OrgId;
  siklet: WeightClass;
  hafta: number; // kazanıldığı hafta
  yas: number;
  savunma: number;
  aktif: boolean;
}

export interface Fighter {
  ad: string;
  soyad: string;
  lakap: string;
  uyruk: string; // COUNTRIES anahtarı
  memleket: string;
  baslangicYasi: number;
  yas: number;
  siklet: WeightClass;
  gecmis: Background;
  hikaye: string;
  hakkinda?: string;
  gorunum?: Appearance;
  /** Oluştururken bir kez seçilir, kariyer boyunca değişmez (cm) */
  boy?: number;
  uzanma?: number;
  stats: Stats;
}

export interface Opponent {
  id: string;
  ad: string;
  soyad: string;
  lakap: string;
  uyruk: string; // görünen ülke adı
  stil: Background;
  kisilik: string;
  stats: Stats;
  rekor: { g: number; m: number; b: number };
  rank: number | null;
  champion: boolean;
  /** 0 = sıradan, 1+ = kalıcı rakip, 3+ = ezeli rakip */
  rivalry: number;
  karsilasma: number;
  /** Oyuncunun kaçıncı dövüşünde en son karşılaştılar (tekrarı sınırlamak için) */
  sonDovus?: number;
  stage?: Stage;
  sonSonuc?: 'G' | 'M' | 'B'; // oyuncunun bakış açısından
  etiket?: string;
  riskMetni?: string;
  zorluk?: -1 | 0 | 1;
  /** Maçın kaç hafta sonra olacağı (teklif anında) */
  macHafta?: number;
}

export interface Record3 {
  g: number;
  m: number;
  b: number;
  ko: number;
  sub: number;
  karar: number;
}

export interface Post {
  id: string;
  yazar: string;
  kullanici: string; // @handle
  tur: 'oyuncu' | 'dovuscu' | 'medya' | 'taraftar' | 'hikaye' | 'organizasyon';
  metin: string;
  hafta: number;
  begeni: number;
  renk?: string;
  hedefId?: string; // ilgili dövüşçü (yanıt verilebilir)
  yanitlandi?: boolean;
  yanitlar?: { yazar: string; metin: string }[];
}

export interface Division {
  org: OrgId;
  siklet?: WeightClass;
  sampiyon: Opponent | null; // oyuncu şampiyonsa null
  liste: Opponent[];
}

export interface Contract {
  org: OrgId;
  kalan: number;
  ucret: number;
  bonus: number;
  munhasir: boolean;
  ozel?: string;
}

export interface Offer extends Contract {
  id: string;
  dovus: number;
  pazarlikYapildi: boolean;
  not: string;
  /** Mevcut kontratı feshetme cezası (kabul edilince ödenir) */
  fesih?: number;
  /** Mevcut kontrata aynen devam seçeneği */
  devam?: boolean;
}

export interface Injury {
  ad: string;
  hafta: number;
  stat: StatKey;
  ceza: number;
}

export interface Team {
  salon: string;
  antrenor: string;
  antrenorKalite: number; // 1-10
  salonId?: string;
  uzmanlik?: StatKey;
  menajer: string | null;
  menajerKalite: number; // 0-10
  menajerPay: number; // 0-0.2
}

export interface FightHistory {
  rakip: string;
  rakipId?: string;
  org: OrgId;
  sonuc: 'G' | 'M' | 'B';
  yontem: string;
  raunt: number;
  yas: number;
}

// ---------- Kamp ----------
export type PlanKey = 'ayakta' | 'gures' | 'yer' | 'tempo' | 'kontra' | 'govde' | 'kafes' | 'bacak' | 'blitz' | 'puan' | 'gnp';
export type Intensity = 'dusuk' | 'orta' | 'yuksek';
export type WeightCut = 'kademeli' | 'normal' | 'sert';
export type PressChoice = 'saygili' | 'trash' | 'sessiz';

export interface CampState {
  step: 'sure' | 'takvim' | 'yer' | 'focus' | 'plan' | 'intensity' | 'kilo' | 'basin' | 'haftalik' | 'sakatlik' | 'ozet' | 'tarti' | 'yuzyuze';
  pKilo?: number;
  oKilo?: number;
  kafesKilo?: number;
  yuzyuze?: string;
  /** Rakibin face to face'te ilk hamlesi (varsa) */
  rakipHamle?: string;
  /** Face to face sonucu: animasyon ve kimin üstün geldiği */
  yuzyuzeSonuc?: { anim: string; kazanan: 'p' | 'o' | null; baslik: string; etkiler: string[] };
  yer?: string;
  hafta: number;
  focus?: StatKey;
  plan?: PlanKey;
  intensity?: Intensity;
  kilo?: WeightCut;
  basin?: PressChoice;
  ozet: string[];
  tartiMetni?: string;
  sakatlik?: Injury;
  kisaHaber?: boolean;
  planUyum?: boolean;
  mods: Partial<Stats>;
  oppMods: Partial<Stats>;
  ucretCeza: number;
  rakipCeza: boolean;
  iptal: boolean;
  /** Teklif anında maça kalan hafta */
  macHafta?: number;
  /** Kamptan önce kalan serbest hafta */
  serbest?: number;
  /** Serbest haftalarda planlanmış etkinlikler (idx: kaçıncı serbest hafta) */
  olaylar?: CalEvent[];
  takvimLog?: string[];
  takvimIdx?: number;
  /** Kampta simüle edilen hafta sayısı ve hafta hafta günlük */
  kampIdx?: number;
  haftaLog?: string[];
  /** Kamp sonu ekranı için yapılandırılmış özet */
  sonuc?: {
    focus?: StatKey;
    artis: number;
    yeni: number;
    puan: number;
    maliyet: number;
    saglik: number;
    saglikDelta: number;
    planUyum: boolean;
    yer: string;
    teknik: string[];
  };
}

export interface CalEvent {
  idx: number;
  id: string;
  baslik: string;
  metin: string;
  ikon: string;
  secenekler: { ad: string; aciklama: string }[];
  sonuc?: string;
}

// ---------- Dövüş ----------
export type Tactic = 'baski' | 'kontra' | 'takedown' | 'clinch' | 'mesafe';
export type CriticalKind = 'rakipSersem' | 'sarsildin' | 'subFirsat' | 'subTehlike';
export type Method = 'KO' | 'TKO' | 'SUB' | 'UD' | 'SD' | 'MD' | 'DRAW';

export interface FightMods {
  stats: Partial<Stats>;
  plan: PlanKey;
  planUyum: boolean;
  oppStats: Partial<Stats>;
  cutman?: number;
  teknik?: Record<string, number>;
}

export interface FightResult {
  kazanan: 'p' | 'o' | 'berabere';
  yontem: Method;
  raunt: number;
  sure: string;
  aciklama: string;
  kartlar?: string;
  sakatlik?: boolean;
  teknik?: string;
}

export interface FightSnap {
  i: number; // bu fotoğraf log'un kaçıncı satırına kadar geçerli
  pP: number;
  oP: number;
  pH: number;
  oH: number;
  pK: number;
  oK: number;
  dk: number;
}

export interface FightState {
  opp: Opponent;
  pStats: Stats;
  pAd: string;
  oAd: string;
  koseAdi: string;
  maxRaunt: number;
  raunt: number;
  vurusSira: number; // raunt içindeki an
  pHasar: number;
  oHasar: number;
  pKondisyon: number;
  oKondisyon: number;
  pPuan: number;
  oPuan: number;
  rauntFarklari: number[];
  pKnockdown: number;
  oKnockdown: number;
  taktik: Tactic | null;
  rakipTaktik: Tactic | null;
  rakipTaktikGecmisi: Tactic[];
  /** Oyuncunun raunt raunt taktikleri; tekrar eden taktik rakip tarafından okunur. */
  oyuncuTaktikGecmisi?: Tactic[];
  /** Bu raunt için okunma cezası (0 = yok). */
  okunma?: number;
  taktikBasari: Partial<Record<Tactic, number>>;
  log: string[];
  kritik: CriticalKind | null;
  kritikMetni: string;
  subAdi: string;
  kose: string | null;
  durum: 'taktik' | 'kritik' | 'karar' | 'rauntSonu' | 'bitti';
  /** Maç akarken çıkan karar anı */
  karar?: { tip: string; metin: string; secenekler: { ad: string; aciklama: string }[] } | null;
  /** Karar anından gelen geçici üstünlük (sonraki birkaç an) */
  anlik?: { v: number; kalan: number };
  kararSayac?: number;
  sov?: number;
  /** Her andan sonraki durum fotoğrafı: ekran, akışın gösterildiği noktaya kadar olan durumu çizer (sonucu önceden göstermez). */
  anlar?: FightSnap[];
  kesik: boolean;
  yerde?: boolean;
  /** Oyuncunun bitirişte kullandığı teknik */
  pTeknik?: string;
  ozelKullanildi?: boolean;
  sonuc?: FightResult;
  mods: FightMods;
  unvanMaci: boolean;
  anaMac: boolean;
}

// ---------- Olaylar ----------
export interface GameEventState {
  id: string;
  baslik: string;
  metin: string;
  secenekler: string[];
  params: Record<string, string | number>;
  sonuc?: string;
}

export interface PostFight {
  satirlar: string[];
  roportajSecenekleri: string[];
  roportaj?: { id: string; text: string }[];
  ctx?: InterviewCtx;
  dwcsIkna?: boolean;
  roportajSonucu?: string;
  kazandi: boolean;
  berabere: boolean;
  /** Maç sonu ekranı için yapılandırılmış özet */
  ozet?: {
    yontem: string;
    kod: string;
    raunt: number;
    sure: string;
    kartlar?: string;
    org: OrgId;
    rakip: string;
    rakipLakap: string;
    rakipUyruk: string;
    rakipRekor: string;
    rekor: string;
    amator: boolean;
    kazanc: number;
    populerlik: number;
    popDelta: number;
    puan: number;
    saglik: number;
    hasar: number;
    bonus: number;
    nc: boolean;
    unvan: boolean;
    teknik?: string;
    teknikNot?: string;
    takipci?: number;
    takipciDelta?: number;
  };
}

export type Phase =
  | 'hub'
  | 'event'
  | 'rakipSecimi'
  | 'kamp'
  | 'dovus'
  | 'dovusSonrasi'
  | 'teklifler'
  | 'magaza'
  | 'takim'
  | 'kumarhane'
  | 'sosyal'
  | 'kutlama'
  | 'gece'
  | 'basarimlar'
  | 'emeklilik';

export interface Istat {
  enIyiSeri: number;
  r1: number;
  bonus: number;
  unvanMaci: number;
  donus: number;
  kdKalk: number;
  surpriz: number;
  sampiyonYen: number;
  sonNefes: number;
  maraton: number;
  temiz: number;
  inat: number;
  bitirisSeri: number;
  enIyiBitirisSeri: number;
  tatil: number;
  gonderi: number;
  eslesme: number;
  sevgili: number;
  maxPara: number;
  sikletler: string[];
  yenilmezZirve?: number;
  rovans?: number;
}

export interface P4PEntry {
  id: string;
  ad: string;
  soyad: string;
  lakap: string;
  uyruk: string;
  siklet: WeightClass;
  rekor: { g: number; m: number; b: number };
  puan: number;
  sampiyon: boolean;
}

export interface GameState {
  v: 1;
  phase: Phase;
  fighter: Fighter;
  rekor: Record3;
  amator: Record3;
  gecmis: FightHistory[];
  stage: Stage;
  contract: Contract | null;
  para: number;
  puan: number;
  envanter: string[];
  isletmeler?: { id: string; seviye: number }[];
  yatirimlar?: { id: string; deger: number; anapara: number }[];
  kemerler?: Belt[];
  basarimlar?: string[];
  ufcKademe?: number;
  sponsorlar?: SponsorDeal[];
  sponsorTeklif?: SponsorDeal[];
  doping?: { kalan: number };
  dopingSayisi?: number;
  ceza?: { bitis: number; sebep: string };
  kadro?: { rol: string; seviye: number; ad: string }[];
  hayvanlar?: Pet[];
  gece?: { risk: number; ziyaret: number };
  hastalik?: { ad: string; hafta: number; tedaviBitis?: number };
  iliski?: { id: string; ad: string; meslek: string; emoji: string; durum: 'sevgili'; hafta: number };
  /** Haftanın kaydırma destesi (Tinder) */
  adaylar?: { hafta: number; list: Candidate[]; super?: boolean };
  /** Sağa kaydırılıp eşleşilen kişiler */
  eslesmeler?: Candidate[];
  istat?: Istat;
  /** Sınırsız şöhret göstergesi (sosyal medya takipçisi) */
  takipci?: number;
  /** UFC Pound for Pound listesi (oyuncu hariç) ve oyuncunun son sırası */
  p4p?: { liste: P4PEntry[]; sira: number | null };
  /** Bitiriş teknikleri: seviye (0-5) ve ustalık */
  teknik?: Record<string, { sv: number; xp: number }>;
  /** Onur Listesi'ne (Hall of Fame) seçilme */
  hof?: { hafta: number; yas: number; skor: number; goruldu?: boolean };
  patron?: Partial<Record<OrgId, number>>;
  kutlama?: { tur: 'kemer' | 'cift' | 'savunma'; org: OrgId; siklet: WeightClass; sayi?: number };
  kumar?: { oynanan: number; net: number; sonHafta?: number; uyari?: string };
  sosyal?: Post[];
  /** Organizasyonun sıklet sıralaması (oyuncu hariç). */
  bolum: Division | null;
  /** Röportajda meydan okunan dövüşçünün id'si */
  cagri: string | null;
  populerlik: number;
  rank: number | null;
  sampiyon: boolean;
  savunma: number;
  unvanlar: string[];
  saglik: number;
  sakatliklar: Injury[];
  takim: Team;
  rakipler: Opponent[]; // kalıcı rakipler
  hafta: number;
  seri: number; // + galibiyet serisi, - mağlubiyet serisi
  orgMaglubiyet: number;
  reddedilen: number;
  motivasyon: number; // -2..+2, bir sonraki kampı etkiler
  trashTalk: boolean;
  kisaHaber: boolean;
  haberler: string[];
  pending: {
    secenekler?: Opponent[];
    dayatma?: boolean;
    rakip?: Opponent;
    kamp?: CampState;
    dovus?: FightState;
    sonrasi?: PostFight;
    teklifler?: Offer[];
    teklifMetni?: string;
    olay?: GameEventState;
    sonrakiFaz?: Phase;
  };
}
