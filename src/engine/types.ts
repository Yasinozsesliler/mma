import { L } from '../i18n';
import type { InterviewCtx } from './interview';
import type { SponsorDeal } from './sponsors';
import type { Pet } from './pets';
import type { Candidate } from './nightlife';

export type StatKey = 'vurus' | 'gures' | 'yer' | 'kondisyon' | 'cene' | 'hiz' | 'iq';
export type Stats = Record<StatKey, number>;

export const STAT_KEYS: StatKey[] = ['vurus', 'gures', 'yer', 'kondisyon', 'cene', 'hiz', 'iq'];
export const STAT_LABELS: Record<StatKey, string> = {
  vurus: L("Vuruş"),
  gures: L("Güreş"),
  yer: L("Yer"),
  kondisyon: L("Kondisyon"),
  cene: L("Çene"),
  hiz: L("Hız"),
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
  sac: 'kazik' | 'kisa' | 'mohawk' | 'uzun' | 'topuz' | 'afro' | 'orgu' | 'kel' | 'atkuyrugu';
  sacRenk: number;
  goz: number;
  sakal: 'yok' | 'kirli' | 'tam' | 'keci' | 'biyik';
  yara: boolean;
  dovme: boolean;
  /** Ek dövmeler (berber ve dövmeci): göğüs, kol, boyun */
  dovmeler?: ('gogus' | 'kol' | 'boyun')[];
  /** Kadın dövüşçü görünümü (sakal yok, spor sütyeni) */
  kadin?: boolean;
  /** Yüz hatları (yoksa varsayılan): yüz şekli 0-4, burun 0-3, göz 0-2, dudak 0-2, kaş 0-2, dövüşçü kulağı 0-1 */
  yuz?: number;
  burun?: number;
  gozSekil?: number;
  dudak?: number;
  kas?: number;
  kulak?: number;
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
  /** Kadın dövüşçü: kariyerdeki bütün dünya (rakipler, şampiyonlar, sıralama) kadın dövüşçülerden oluşur. */
  kadin?: boolean;
  gorunum?: Appearance;
  /** Oluştururken bir kez seçilir, kariyer boyunca değişmez (cm) */
  boy?: number;
  uzanma?: number;
  stats: Stats;
}

export interface Opponent {
  /** Maçın yapılacağı şehir (worldMap.ts) */
  sehir?: string;
  /** Memlekette ana maç (hometown.ts) */
  memleket?: boolean;
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
  kadin?: boolean;
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
  /** Süren kontrat pazarlığı (contractTable.ts) */
  masa?: import('./contractTable').ContractTable;
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

// ---------- Hatıralar ----------
export type HatiraTur = 'eldiven' | 'sort' | 'foto' | 'poster' | 'cek' | 'bandaj' | 'kemer' | 'kupa' | 'madalya' | 'kartpostal' | 'aile' | 'hediye';
export interface Hatira {
  id: string;
  tur: HatiraTur;
  ad: string;
  metin: string;
  nadir: 'siradan' | 'ozel' | 'efsane';
  /** Müze (maç), tatil kartpostalı ya da aile albümü */
  kat: 'muze' | 'tatil' | 'aile';
  hafta: number;
  yas: number;
}

// ---------- Dövüş gecesi ----------
export interface NightBout {
  a: string;
  b: string;
  ua: string;
  ub: string;
  siklet: WeightClass;
  kazanan: 0 | 1;
  yontem: Method;
  raunt: number;
  sure: string;
  /** Gecenin Performansı için puan */
  puan: number;
}
export interface FightNight {
  ad: string;
  sehir?: string;
  konum: 'acilis' | 'onEleme' | 'anaKart' | 'coMain' | 'anaMac';
  /** Oyuncudan önceki maçlar (kulis ekranında sonuçlanır) */
  once: NightBout[];
  /** Oyuncudan sonraki maçlar (maç sonu ekranında) */
  sonra: NightBout[];
  seyirci: number;
  yaris?: { aday: string; adayYontem: string; adayPuan: number; benim: number; kazandi: boolean };
}

export interface FightHistory {
  rakip: string;
  rakipId?: string;
  org: OrgId;
  sonuc: 'G' | 'M' | 'B';
  yontem: string;
  raunt: number;
  yas: number;
  /** Maçın şehri (worldMap.ts) */
  sehir?: string;
}

// ---------- Kamp ----------
export type PlanKey = 'ayakta' | 'gures' | 'yer' | 'tempo' | 'kontra' | 'govde' | 'kafes' | 'bacak' | 'blitz' | 'puan' | 'gnp';
export type Intensity = 'dusuk' | 'orta' | 'yuksek';
export type WeightCut = 'kademeli' | 'normal' | 'sert';
export type PressChoice = 'saygili' | 'trash' | 'sessiz';

export interface CampState {
  /** Ödüllü detaylı keşif raporu açıldı mı */
  kesif?: boolean;
  /** Maç afişi oyun içinde paylaşıldı (bir kez) */
  afis?: boolean;
  /** Rakip kampından haber (rivalCamp.ts) */
  rakipHaber?: import('./rivalCamp').RivalNews;
  /** Basın toplantısı sahnesi (pressConf.ts) ve iddialı söz sayısı */
  basinSahne?: import('./pressConf').PressScene;
  iddia?: number;
  step: 'basinsahne' | 'hoca' | 'planla' | 'sure' | 'takvim' | 'yer' | 'focus' | 'plan' | 'intensity' | 'kilo' | 'basin' | 'haftalik' | 'sakatlik' | 'ozet' | 'tarti' | 'yuzyuze' | 'duello' | 'kesim';
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
  /** Trash talk seçildiyse basın toplantısı düellosu (trashTalk.ts) */
  duello?: import('./trashTalk').Duel;
  /** Antrenman ortağıyla karar anı (kamp başına en fazla bir) */
  kankaAn?: import('./partner').PartnerMoment;
  kankaBitti?: boolean;
  /** Elle kilo verme (weightCut.ts) */
  kesim?: import('./weightCut').ManualCut;
  /** Kafese giriş şovu (WALKOUT_STYLES) */
  giris?: string;
  /** Büyük maç hype'ı (hype.ts) ve son katkılar; belgesel izlendi mi */
  hype?: number;
  hypeLog?: string[];
  belgesel?: boolean;
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
  /** Kamp tek ekranda planlandı: serbest haftalardan sonra doğrudan kamp haftalarına geçilir. */
  planli?: boolean;
  /** Haftalık antrenman mini oyunları: hangi kamp haftasında, hangi oyun, kaç puan (0–100) */
  idman?: { idx: number; oyun: import('./drills').DrillId; puan: number }[];
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
  /** İmza hareketi: anlatımda kendi adıyla geçer */
  imza?: { id: string; ad: string };
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
  /** Canlı modda oyuncunun kaçırdığı kilit sayısı (raundlar arası taşınır) */
  pSubFail?: number;
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
  /** canli: raunt gerçek zamanlı oynanıyor (liveFight.ts) */
  durum: 'taktik' | 'canli' | 'kritik' | 'karar' | 'rauntSonu' | 'bitti';
  /** Maç akarken çıkan karar anı */
  karar?: { tip: string; metin: string; secenekler: { ad: string; aciklama: string }[] } | null;
  /** Karar anından gelen geçici üstünlük (sonraki birkaç an) */
  anlik?: { v: number; kalan: number };
  kararSayac?: number;
  sov?: number;
  /** Her andan sonraki durum fotoğrafı: ekran, akışın gösterildiği noktaya kadar olan durumu çizer (sonucu önceden göstermez). */
  anlar?: FightSnap[];
  kesik: boolean;
  /** Raunt arası köşe anı: nefes alınan raunt ve kesik bakımı (bir sonraki doktor kontrolünde risk yarıya iner) */
  nefesRaunt?: number;
  nefesQ?: number;
  kesikRaunt?: number;
  kesikBakim?: boolean;
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
  /** Ödüllü sponsor reklam çekiminden kazanılan (bir kez) */
  reklamCekimi?: number;
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
  | 'salon'
  | 'album'
  | 'podcast'
  | 'odul'
  | 'marka'
  | 'boks'
  | 'yayin'
  | 'stil'
  | 'harita'
  | 'kafesEvi'
  | 'kulup'
  | 'emeklilik'
  | 'evim'
  | 'muze'
  | 'pasaport'
  | 'luks'
  | 'tatil'
  | 'vucut'
  | 'belgesel'
  | 'lig'
  | 'memleket';

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
  /** 80+ puanlı antrenman oyunu ve kazanılan basın düellosu sayısı (haftalık etkinlik) */
  idmanIyi: number;
  duelloG: number;
}

export interface P4PEntry {
  kadin?: boolean;
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
  iliski?: { id: string; ad: string; meslek: string; emoji: string; durum: 'sevgili' | 'evli'; hafta: number };
  /** Çocuklar (family.ts) */
  cocuklar?: import('./family').Child[];
  /** Haftanın kaydırma destesi (Tinder) */
  adaylar?: { hafta: number; list: Candidate[]; super?: boolean };
  /** Sağa kaydırılıp eşleşilen kişiler */
  eslesmeler?: Candidate[];
  istat?: Istat;
  /** Sınırsız şöhret göstergesi (sosyal medya takipçisi) */
  takipci?: number;
  /** UCC Pound for Pound listesi (oyuncu hariç) ve oyuncunun son sırası */
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
  /** Görülen öğretici ipuçları. Tanımsızsa (eski kayıt) ipucu gösterilmez. */
  ipuclari?: string[];
  /** Nesil modu: kaçıncı nesil (1 = ilk dövüşçü) ve önceki nesillerin özeti. */
  nesil?: number;
  /** Ezeli rakip (kariyer boyunca peşini bırakmayan dövüşçü). */
  ezeli?: import('./nemesis').Nemesis;
  /** UCC yolunda geçilen basamaklar (büyük organizasyon). */
  uccYolu?: string[];
  /** Süren kariyer hikâyesi ve bitenler (stories.ts). */
  hikaye?: { id: string; adim: number; zaman: number; veri: Record<string, string | number> } | null;
  hikayeler?: string[];
  /** Müze hatıraları, tatil kartpostalları ve aile fotoğrafları (memories.ts) */
  hatiralar?: Hatira[];
  /** Pasaport damgaları: şehir (ya da tatil_*) → ilk ziyaret */
  damgalar?: Record<string, { hafta: number; sonuc?: 'G' | 'M' | 'B'; tatil?: boolean }>;
  /** Lüks koleksiyon (luxury.ts): alış fiyatı ve haftası */
  luks?: { id: string; alis: number; hafta: number }[];
  /** Ödülü alınmış albüm setleri */
  albumSet?: string[];
  /** Görülmüş aile anları (family.ts) */
  aileAn?: string[];
  /** Kontrat bitmeden gelen son erken teklif (maç sayısı) */
  erkenTeklif?: number;
  /** Eski rakiplerin kariyerleri (worldLife.ts) */
  dunya?: Record<string, import('./worldLife').WorldEntry>;
  /** Antrenörle bağ (coachBond.ts) */
  hoca?: import('./coachBond').CoachBond;
  /** Medya projeleri (media.ts) */
  medya?: import('./media').MediaWork[];
  medyaSon?: number;
  /** Sonraki kampta gelişim cezası (medya yorgunluğu) */
  medyaYorgun?: number;
  /** Haftalık rutin ve kronik izler (body.ts) */
  rutin?: import('./body').Rutin;
  izler?: import('./body').Iz[];
  /** Kendi organizasyonun (promoter.ts) */
  lig?: import('./promoter').Lig;
  /** Kariyer dönemleri (eras.ts) */
  donemler?: import('./eras').Era[];
  donemSon?: number;
  boksKapi?: boolean;
  /** Okunan taraftar mektupları (letters.ts) */
  mektuplar?: string[];
  /** Memleket kartı (homeland.ts) */
  memleketKart?: import('./homeland').Homeland;
  /** Hikâye bölümlerinde yapılan seçimler (profilde günlük olarak) */
  hikayeKayit?: Record<string, { bolumler: { baslik: string; secim: string; sonuc: string }[]; bitti?: boolean }>;
  hikayeSon?: number;
  hanedan?: import('./dynasty').Ancestor[];
  /** Son kampta seçilenler (bir sonraki kamp planının varsayılanı) */
  sonKamp?: { hafta: number; yer: string; focus: StatKey; intensity: Intensity; kilo: WeightCut; basin?: PressChoice };
  /** Kendi salonun (academy.ts) */
  salon?: import('./academy').Gym;
  /** Kariyer hedefleri (goals.ts): kısa/orta/uzun vadeli üç hedef ve tamamlanan sayısı */
  hedefler?: { list: import('./goals').Goal[]; tamam: number };
  /** Haftalık etkinlik (weeklyEvent.ts) ve kazanılan koleksiyon rozetleri ("tema:hafta") */
  etkinlik?: import('./weeklyEvent').WeeklyEvent;
  rozetler?: string[];
  /** Süren sosyal medya krizi (crisis.ts) ve son krizin haftası */
  kriz?: import('./crisis').Crisis;
  krizSon?: number;
  /** Salon arkadaşı / antrenman ortağı (partner.ts) */
  kanka?: import('./partner').Partner;
  /** Dövüşçü kartı albümü ve alınan albüm ödülleri (cards.ts) */
  kartlar?: import('./cards').FighterCard[];
  albumOdul?: number[];
  /** Podcast daveti (podcast.ts) ve son katılınan podcastin dövüş sayısı */
  podcast?: import('./podcast').Podcast;
  podcastSon?: number;
  /** Grand Prix turnuvası, daveti ve son katılım (grandPrix.ts) */
  gp?: import('./grandPrix').GrandPrix;
  gpDavet?: { dovus: number; odul: number };
  gpSon?: number;
  /** Yükseliş Grand Prix'i daveti geldi (kariyerde bir kez) */
  gpTeklif?: boolean;
  /** Son hayran buluşmasının dövüş sayısı (fanMeet.ts) */
  bulusmaSon?: number;
  /** Son memleket maçının dövüş sayısı */
  memleketSon?: number;
  /** Kendi markan (merch.ts) */
  marka?: import('./merch').MerchBrand;
  /** Özel gün etkinliği ve kazanılan etkinlik kozmetikleri (specialEvent.ts) */
  ozelEtkinlik?: import('./specialEvent').SpecialEvent;
  ozelKozmetik?: string[];
  /** Alınan perkler (perks.ts) */
  perkler?: string[];
  /** İmza hareketi (signature.ts) */
  imza?: import('./signature').Signature;
  /** Ders alınan efsane ustalar ve son dersin dövüş sayısı (legends.ts) */
  ustalar?: string[];
  ustaSon?: number;
  /** Dövüşülen şehirler: id → maç sayısı */
  sehirler?: Record<string, number>;
  /** Beyin hasarı 0-100 (brain.ts) */
  beyin?: number;
  /** Kafa sparringini bıraktı: hasar %25 az birikir */
  beyinKoruma?: boolean;
  /** Okunmuş doktor raporu eşikleri */
  beyinEsik?: number[];
  /** Bekleyen doktor raporu eşiği */
  beyinUyari?: 30 | 55 | 75 | 90;
  /** Doktor tavsiyesiyle emekli oldu */
  beyinEmekli?: boolean;
  /** Emeklilikten dönüş (comeback.ts): kaç yıl sonra, döndüğü andaki dövüş sayısı, dönüş maçı sonucu */
  geriDonus?: { yil: number; dovus: number; sonuc?: 'G' | 'M' };
  /** Taraftar kulübü (fanClub.ts) */
  kulup?: import('./fanClub').FanClub;
  /** İlk 10 dakika (onboarding.ts): görülen yeni özellikler, duyurulanlar, alınan ilk adım ödülleri, harcanan gelişim puanı */
  acilanlar?: string[];
  duyurulan?: string[];
  ilkAdim?: string[];
  harcanan?: number;
  /** Kafes Evi realite şovu (kafesEvi.ts) */
  kafesEvi?: import('./kafesEvi').KafesEvi;
  /** Alınan harita kilometre taşları (c5, k3...) */
  haritaOdul?: string[];
  /** Crossover boks maçı (crossover.ts) */
  boks?: import('./crossover').BoxFight;
  boksTeklif?: { boksor: import('./crossover').Boxer; ucret: number };
  boksYapildi?: boolean;
  /** Karara itiraz hakkı (appeal.ts) */
  itiraz?: import('./appeal').Appeal;
  /** Canlı yayın (stream.ts) */
  yayin?: import('./stream').Stream;
  yayinSon?: number;
  /** Zorluk seviyesi ve meydan okuma modu (challenges.ts) */
  zorluk?: import('./challenges').Difficulty;
  meydan?: import('./challenges').Challenge;
  meydanBitti?: boolean;
  /** Yıl sonu ödülleri (awards.ts): son işlenen yıl, süren tören, kazanılan ödüller */
  odulYil?: number;
  /** Tedavi kararı bekleyen ciddi sakatlık (treatment.ts) */
  tedavi?: Injury;
  odulToren?: import('./awards').AwardShow;
  oduller?: { kat: import('./awards').AwardCat; yas: number; yil?: number; not?: string; para?: number }[];
  /** Ödüllü reklam teklifleri: alındıkları dövüş sayısı (her dövüş arasında birer kez). */
  odul?: { sakatlikMac?: number; profilHafta?: number };
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
    /** Kariyer maçının dövüş gecesi (fightNight.ts) */
    gece?: FightNight;
  };
}
