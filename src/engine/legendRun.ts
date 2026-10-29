// Efsane Yolları: gerçek kariyer kalıplarından esinlenen hazır dövüşçülerle bölüm bölüm hikâye modu.
// Her bölümün bir ana hedefi (1 yıldız) ve tarihe sadık iki ek yıldızı var. Hikâye, oyunun kendi sistemleriyle
// (organizasyonlar, sıklet değiştirme, crossover boks, sponsorlar, marka) oynanır; senaryolu anlar bölüm başında gelir.
// İsimler kurgusaldır (mağaza kuralları); oyuncu başlarken dövüşçünün adını değiştirebilir.
import { L, LOC } from '../i18n';
import { createGame, rollStartingStats, type NewFighterInput } from './character';
import { addFollowers, followers, initialFollowers } from './fame';
import { activeBelts } from './legacy';
import { brandById } from './sponsors';
import { clamp, uid } from './rng';
import type { Appearance, GameState, Method, OrgId, StatKey, WeightClass } from './types';

export type LegendId = 'kral' | 'dahi' | 'profesor' | 'yenilmez';

export interface LegendRun {
  id: LegendId;
  /** Süren bölümün sırası (bitince bölüm sayısına eşit) */
  bolum: number;
  /** Bölüm id → kazanılan yıldızlar (0: ana hedef, 1-2: tarihe sadık ek yıldızlar) */
  yildiz: Record<string, number[]>;
  /** Gösterilecek bölüm girişi (hub'da açılır) */
  giris?: number;
  /** Bölüme özel işaretler ve sayaçlar */
  bayrak?: Record<string, boolean>;
  sayac?: Record<string, number>;
  /** Senaryolu boks maçının sonucu */
  boks?: 'G' | 'M' | 'KO' | 'red';
  bitti?: boolean;
}

/** Bir dövüşün özeti (bölüm yıldızları için). Dövüş dışı kontrollerde null. */
export interface LegendFight {
  won: boolean;
  yontem: Method;
  raunt: number;
  org: OrgId;
  unvan: boolean;
}

interface Star {
  ad: () => string;
  kontrol: (s: GameState, f: LegendFight | null, r: LegendRun) => boolean;
  /** Yalnızca ana hedef tamamlandığı anda kontrol edilir */
  sonda?: boolean;
}

export interface Chapter {
  id: string;
  yil: string;
  yer: () => string;
  baslik: () => string;
  giris: () => string[];
  hedef: () => string;
  ilerleme?: (s: GameState) => string | null;
  ipucu?: () => string;
  tamam: (s: GameState, r: LegendRun) => boolean;
  /** Hedef artık imkânsızsa bölüm yıldızsız geçilir (ör. UCC'ye bölgesel kemersiz girildi) */
  atla?: (s: GameState) => boolean;
  yildizlar: [Star, Star];
  /** Bölüm başlarken (senaryolu anlar) */
  basla?: (s: GameState, r: LegendRun) => string[];
  /** Ana hedef tamamlanınca ödül */
  bitir?: (s: GameState, r: LegendRun) => string[];
}

export interface LegendDef {
  id: LegendId;
  ad: string;
  soyad: string;
  lakap: () => string;
  uyruk: string;
  memleket: () => string;
  bayrak: string;
  renk: string;
  ozet: () => string;
  /** Kart üstündeki kısa unvanlar */
  etiketler: () => string[];
  /** false: menüde "yakında" */
  oynanabilir: boolean;
  /** Ücretsiz mi (sonra paket ürününe bağlanacak) */
  ucretsiz: boolean;
  yas: number;
  siklet: WeightClass;
  gecmis: NewFighterInput['gecmis'];
  boy: number;
  gorunum: Appearance;
  statMod: Partial<Record<StatKey, number>>;
  para: number;
  populerlik: number;
  bolumler: Chapter[];
  odulKozmetik?: string;
  /** Hikâye bitince kapanış metni */
  final?: () => string;
}

const $ = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;
const ufcBelts = (s: GameState) => activeBelts(s).filter((b) => b.org === 'ufc');
const finish = (m: Method) => m === 'KO' || m === 'TKO' || m === 'SUB';
const ko = (m: Method) => m === 'KO' || m === 'TKO';

/** Senaryolu sponsor teklifi: gerçek markaların yerine oyundaki karşılıkları, normalden cömert şartlarla. */
function legendSponsor(s: GameState, marka: string, carpan: number): string[] {
  const b = brandById(marka);
  if (!b || (s.sponsorlar ?? []).some((d) => d.marka === marka) || (s.sponsorTeklif ?? []).some((d) => d.marka === marka)) return [];
  const r = (n: number) => Math.round((n * carpan) / 50) * 50;
  s.sponsorTeklif = [{ id: uid(), marka, dovus: 5, dovusBasi: r(b.dovusBasi), galibiyet: r(b.galibiyet), bitiris: r(b.bitiris) }, ...(s.sponsorTeklif ?? [])].slice(0, 4);
  return [L("💼 {0} kapında: dev bir sponsorluk teklifi Takım ekranında seni bekliyor.", [b.ad])];
}

function pay(s: GameState, n: number, neden: string): string {
  s.para += n;
  return L("💰 {0}: {1}", [neden, $(n)]);
}

// ---------- Kral (İrlanda) ----------

const KRAL: Chapter[] = [
  {
    id: 'cirak',
    yil: '2006',
    yer: () => L("Dublin, İrlanda"),
    baslik: () => L("Tesisatçı Çırak"),
    giris: () => [
      L("Dublin'in işçi mahallelerinden birinde, on sekiz yaşında bir tesisatçı çırağısın. Gün boyu boru taşıyor, akşamları salona koşuyorsun."),
      L("Çocukken boks kulübünde öğrendiğin sol el hâlâ seninle. Hocan Seamus Doyle ilk gün sadece şunu söyledi: \"Yeteneğin var. Ama kafes yetenekten fazlasını ister.\""),
      L("Annen çıraklığı bırakmana karşı. Sen ise tek bir şeyden eminsin: bir gün bütün dünya adını bilecek."),
    ],
    hedef: () => L("Profesyonel ol"),
    ipucu: () => L("Amatör maçlar kazan; teklifler kendiliğinden gelir."),
    tamam: (s) => s.stage !== 'amator',
    yildizlar: [
      { ad: () => L("Amatörde hiç kaybetme"), kontrol: (s) => s.amator.m === 0, sonda: true },
      { ad: () => L("20 yaşına girmeden profesyonel ol"), kontrol: (s) => s.fighter.yas < 20, sonda: true },
    ],
    bitir: (s) => {
      s.populerlik = clamp(s.populerlik + 3, 0, 100);
      return [L("🔧 Çıraklık defteri çekmecede kaldı. Artık profesyonel bir dövüşçüsün.")];
    },
  },
  {
    id: 'ders',
    yil: '2008',
    yer: () => L("Dublin, İrlanda"),
    baslik: () => L("Acı Dersler"),
    giris: () => [
      L("Profesyonel kafes acımasız. Ayakta kimse sana dokunamıyor ama ilk yenilgilerin yerde, kilitlerle geliyor."),
      L("Bir ara her şeyi bırakmayı düşünüyorsun. Seamus kapını çalıyor: \"Yerde ne kadar kötüysen, o kadar çok çalışacağız. Kaçmak yok.\""),
      L("Geri dönüyorsun. Bu kez her gün güreş minderindesin ve sol elin her zamankinden keskin."),
    ],
    hedef: () => L("Profesyonelde 6 galibiyet al"),
    ilerleme: (s) => `${Math.min(6, s.rekor.g)}/6`,
    tamam: (s) => s.rekor.g >= 6,
    yildizlar: [
      { ad: () => L("Bu galibiyetlerin en az 4'ü nakavt olsun"), kontrol: (s) => s.rekor.ko >= 4, sonda: true },
      { ad: () => L("Bir maçı 1. rauntta nakavtla bitir"), kontrol: (_s, f) => !!f && f.won && ko(f.yontem) && f.raunt === 1 },
    ],
  },
  {
    id: 'ikikemer',
    yil: '2012',
    yer: () => L("Dublin, İrlanda"),
    baslik: () => L("İki Kemer, Bir Kafes"),
    giris: () => [
      L("Avrupa'nın en sert bölgesel sahnesindesin. Basın toplantılarında söylediğin her söz ertesi gün manşette."),
      L("Kimsenin denemediği bir şey istiyorsun: aynı organizasyonda iki ayrı sıklette şampiyon olmak."),
      L("\"Bir kemer yetmez,\" diyorsun mikrofona. \"İkisini de alacağım. Sonra da büyük sahneye gideceğim.\""),
    ],
    hedef: () => L("UCC dışındaki bir organizasyonda şampiyon ol"),
    ipucu: () => L("Bu bölümde UCC seni beklemez: kemer senin biletin. Organizasyonunda zirveye tırman."),
    tamam: (s) => (s.kemerler ?? []).some((b) => b.org !== 'ufc' && b.org !== 'amator'),
    atla: (s) => s.stage === 'ufc',
    yildizlar: [
      { ad: () => L("Kemer maçını bitirişle kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && finish(f.yontem) },
      { ad: () => L("25 yaşına girmeden şampiyon ol"), kontrol: (s) => s.fighter.yas < 25, sonda: true },
    ],
    bitir: (s) => {
      s.populerlik = clamp(s.populerlik + 6, 0, 100);
      return [L("🏆 Avrupa seni konuşuyor. Büyük sahnenin matchmaker'ları telefonlarını açtı.")];
    },
  },
  {
    id: 'ucc',
    yil: '2013',
    yer: () => L("Stockholm, İsveç"),
    baslik: () => L("Haftada 188 Euro"),
    giris: () => [
      L("Kemerlerin var ama cebin boş. Haftada 188 euroluk işsizlik yardımıyla geçiniyorsun; kira, salon, otobüs bileti… hepsi o paradan."),
      L("Bir sabah telefon çalıyor. Arayan UCC: \"Seni kadroya istiyoruz. İlk maçın İsveç'te.\""),
      L("Kapattıktan sonra annene sarılıyorsun. \"Yardım kuyruğunda son haftam,\" diyorsun. \"Bir daha oraya dönmeyeceğiz.\""),
    ],
    hedef: () => L("UCC'ye gir ve çıkış maçını kazan"),
    ipucu: () => L("Bir galibiyet daha getir: UCC teklifi doğrudan gelir. Önce Sıklet düğmesiyle bir üst sıklete çıkıp ikinci kemeri de alabilirsin."),
    tamam: (s) => s.gecmis.some((h) => h.org === 'ufc' && h.sonuc === 'G'),
    yildizlar: [
      { ad: () => L("UCC'den önce ikinci bir sıklette de kemer al"), kontrol: (s) => s.stage !== 'ufc' && new Set((s.kemerler ?? []).filter((b) => b.org !== 'ufc' && b.org !== 'amator').map((b) => b.siklet)).size >= 2 },
      { ad: () => L("UCC'deki ilk maçını nakavtla kazan"), kontrol: (s, f) => !!f && f.won && f.org === 'ufc' && ko(f.yontem) && s.gecmis.filter((h) => h.org === 'ufc').length === 1 },
    ],
    // Kemeri getiren maçın hemen ardından değil, bir sonraki galibiyette arar (ikinci kemere de vakit kalsın)
    basla: (_s, r) => {
      r.bayrak = { ...r.bayrak, uccBekle: true };
      return [];
    },
    bitir: (s) => [pay(s, 60_000, L("Gecenin Performansı bonusu")), L("🎤 Mikrofonu aldın ve herkese bir sonraki rakibini sen seçtin. Salon çıldırdı.")],
  },
  {
    id: 'tur',
    yil: '2014',
    yer: () => L("Dublin, Boston, Las Vegas"),
    baslik: () => L("Dünya Turu"),
    giris: () => [
      L("Artık her basın toplantısı bir şov. Takım elbiselerin, kürk montların ve tahminlerin konuşuluyor: rakibini hangi rauntta yeneceğini önceden söylüyorsun."),
      L("Memleketinde kapalı salon tıklım tıklım. Binlerce kişi aynı marşı söylüyor."),
      L("Organizasyon seni bir dünya turuna çıkarıyor. Hedef belli: tüy sıklet şampiyonu."),
    ],
    hedef: () => L("UCC'de ilk 5'e gir"),
    ilerleme: (s) => (s.stage === 'ufc' && s.rank ? `#${s.rank}` : null),
    tamam: (s) => s.stage === 'ufc' && (s.sampiyon || (s.rank != null && s.rank <= 5)),
    yildizlar: [
      { ad: () => L("UCC'de 4 maçlık galibiyet serisi yakala"), kontrol: (s) => s.stage === 'ufc' && s.seri >= 4 },
      { ad: () => L("Bu bölümde UCC'de 3 nakavt galibiyeti al"), kontrol: (_s, _f, r) => (r.sayac?.turKo ?? 0) >= 3 },
    ],
    basla: (s) => {
      s.populerlik = clamp(s.populerlik + 5, 0, 100);
      return legendSponsor(s, 'reebot', 1.4);
    },
  },
  {
    id: 'onucsaniye',
    yil: '2015',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("13 Saniye"),
    giris: () => [
      L("Karşında on yıldır yenilmeyen şampiyon var. Herkes onun bir efsane olduğunu söylüyor."),
      L("Sen ise aylardır aynı cümleyi tekrarlıyorsun: \"İlk rauntta düşecek. Sol elim onu bulacak.\""),
      L("Las Vegas'ta salon dolu. Gong çalmak üzere."),
    ],
    hedef: () => L("UCC şampiyonu ol"),
    tamam: (s) => ufcBelts(s).length > 0,
    yildizlar: [
      { ad: () => L("Unvan maçını nakavtla kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && ko(f.yontem) },
      { ad: () => L("Hem de 1. rauntta"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && ko(f.yontem) && f.raunt === 1 },
    ],
    bitir: (s) => [pay(s, 3_000_000, L("PPV gelir payı")), ...legendSponsor(s, 'monster', 1.5), L("👑 Kemeri omzuna attın. \"Ben söylemiştim,\" dedin. Kimse itiraz edemedi.")],
  },
  {
    id: 'cifte',
    yil: '2016',
    yer: () => L("New York, ABD"),
    baslik: () => L("Çifte Şampiyon"),
    giris: () => [
      L("Bir kemer seni tatmin etmiyor. Organizasyonun tarihinde hiç kimse aynı anda iki kemer taşımadı."),
      L("\"Bana ikinci kemeri verin,\" diyorsun. \"New York'ta tarih yazacağım.\""),
      L("Patronlar önce gülüyor. Sonra bilet satışlarını görünce gülmeyi bırakıyorlar."),
    ],
    hedef: () => L("Aynı anda iki UCC kemeri taşı"),
    ipucu: () => L("Şampiyonken Sıklet düğmesiyle komşu bir sıklete geç: ilk maçın unvan maçı olur, eski kemerin aktif kalır."),
    tamam: (s) => ufcBelts(s).length >= 2,
    yildizlar: [
      { ad: () => L("İkinci kemeri bitirişle al"), kontrol: (s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && finish(f.yontem) && ufcBelts(s).length >= 2 },
      { ad: () => L("29 yaşına girmeden çifte şampiyon ol"), kontrol: (s) => s.fighter.yas < 29, sonda: true },
    ],
    bitir: (s) => [pay(s, 5_000_000, L("PPV gelir payı")), ...legendSponsor(s, 'bmw', 1.5), L("🏆🏆 İki kemer, iki omuz. \"Herkesten özür dilemek istiyorum… aslında hayır, dilemiyorum.\"")],
  },
  {
    id: 'parabovusu',
    yil: '2017',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("Para Dövüşü"),
    giris: () => [
      L("Boks dünyasının kusursuz adamı, 49 maçta hiç yenilmemiş Marcus Bell, emekliliğinden senin için dönüyor."),
      L("Herkes çıldırdığını söylüyor: hayatında tek profesyonel boks maçı yapmadın. Sen ise rakamlara bakıyorsun."),
      L("\"Kaybetsem de kazanırım,\" diyorsun. \"Ama kaybetmeye gitmiyorum.\""),
    ],
    hedef: () => L("Boks süper maçına çık"),
    ipucu: () => L("Teklif ana ekranda. Reddedersen bölüm yıldızsız geçer."),
    tamam: (_s, r) => !!r.boks,
    yildizlar: [
      { ad: () => L("Nakavt olmadan maçı tamamla"), kontrol: (_s, _f, r) => r.boks === 'G' || r.boks === 'M', sonda: true },
      { ad: () => L("Boks efsanesini yen"), kontrol: (_s, _f, r) => r.boks === 'G', sonda: true },
    ],
    basla: (s) => {
      s.boksTeklif = { boksor: { ad: 'Marcus Bell', lakap: L("Kusursuz"), rekor: '49-0', guc: 96 }, ucret: 100_000_000 };
      return [L("🥊 Asrın teklifi geldi: Marcus Bell (49-0) ile boks maçı. Ücret {0}.", [$(100_000_000)])];
    },
  },
  {
    id: 'imparatorluk',
    yil: '2018',
    yer: () => L("Dublin, İrlanda"),
    baslik: () => L("İmparatorluk"),
    giris: () => [
      L("Artık sadece bir dövüşçü değilsin; bir markasın. Takım elbiselerin, sözlerin, adın her yerde."),
      L("Bir içecek şirketi masaya oturuyor: \"Kendi markanı kur, biz büyütelim. Sonra birlikte satarız.\""),
      L("Kafeste yazdığın tarihi şimdi iş dünyasında yazma zamanı."),
    ],
    hedef: () => L("Kendi markanı kur ve içecek ürününü çıkar"),
    ipucu: () => L("Markam bölümünde önce markanı kur, sonra içecek ürününü satışa çıkar."),
    tamam: (s) => !!s.marka?.urunler.icecek,
    yildizlar: [
      { ad: () => L("Servetin 200 milyon doları geçsin"), kontrol: (s) => s.para >= 200_000_000, sonda: true },
      { ad: () => L("25 milyon takipçiye ulaş"), kontrol: (s) => followers(s) >= 25_000_000, sonda: true },
    ],
    bitir: (s) => [pay(s, 150_000_000, L("İçecek ortaklığının satışı")), L("🥃 Markanın çoğunluk hissesini sattın. Yılın en çok kazanan sporcusu listesinde zirvedesin.")],
  },
];

// ---------- Efsaneler ----------

export const LEGENDS: Record<LegendId, LegendDef> = {
  kral: {
    id: 'kral',
    ad: 'Cian',
    soyad: 'Rourke',
    lakap: () => L("Kral"),
    uyruk: 'ie',
    memleket: () => L("Dublin"),
    bayrak: '🇮🇪',
    renk: '#169b62',
    ozet: () => L("Tesisatçı çıraklığından işsizlik yardımına, oradan iki sıklette şampiyonluğa ve asrın boks maçına. Kafesin en büyük şovmeni."),
    etiketler: () => [L("Çifte şampiyon"), L("13 saniye"), L("Asrın boks maçı")],
    oynanabilir: true,
    ucretsiz: true,
    yas: 18,
    siklet: 'tuy',
    gecmis: 'boks',
    boy: 175,
    gorunum: { ten: 0, sac: 'kisa', sacRenk: 2, goz: 4, sakal: 'tam', yara: false, dovme: true, dovmeler: ['gogus', 'kol'] },
    statMod: { vurus: 6, hiz: 3, iq: 4, kondisyon: -3 },
    para: 400,
    populerlik: 14,
    bolumler: KRAL,
    odulKozmetik: 'sort_kral',
    final: () => L("Tesisatçı çıraklığından dünyanın en çok kazanan sporcusuna. Hikâyeyi kendi yumruklarınla yeniden yazdın."),
  },
  dahi: {
    id: 'dahi', ad: '', soyad: '', lakap: () => L("Dahi"), uyruk: 'us', memleket: () => L("New York"), bayrak: '🇺🇸', renk: '#3a86ff',
    ozet: () => L("23 yaşında en genç şampiyon. Kafeste kimsenin çözemediği bir bulmaca; kafes dışında kendi en büyük rakibi."),
    etiketler: () => [L("En genç şampiyon"), L("Yarı ağır kral")],
    oynanabilir: false, ucretsiz: false, yas: 20, siklet: 'yariagir', gecmis: 'gures', boy: 193,
    gorunum: { ten: 6, sac: 'kel', sacRenk: 0, goz: 0, sakal: 'kirli', yara: false, dovme: false }, statMod: {}, para: 1500, populerlik: 10, bolumler: [],
  },
  profesor: {
    id: 'profesor', ad: '', soyad: '', lakap: () => L("Profesör"), uyruk: 'fr', memleket: () => L("Montreal"), bayrak: '🇨🇦', renk: '#e63946',
    ozet: () => L("Karate ile başlayan, her yenilgiyi rövanşta silen kusursuz taktisyen. Welter'ın en uzun soluklu hükümdarı."),
    etiketler: () => [L("Rövanş ustası"), L("Welter hükümdarı")],
    oynanabilir: false, ucretsiz: false, yas: 21, siklet: 'welter', gecmis: 'kyokushin', boy: 178,
    gorunum: { ten: 1, sac: 'kisa', sacRenk: 0, goz: 1, sakal: 'yok', yara: false, dovme: false }, statMod: {}, para: 1500, populerlik: 10, bolumler: [],
  },
  yenilmez: {
    id: 'yenilmez', ad: '', soyad: '', lakap: () => L("Yenilmez"), uyruk: 'ru', memleket: () => L("Dağıstan"), bayrak: '🏔️', renk: '#f2c14e',
    ozet: () => L("Dağlarda ayılarla güreşerek büyüyen çocuk. Kimse onu yerde tutamadı, kimse onu yenemedi: 29-0."),
    etiketler: () => [L("29-0"), L("Hiç yenilmedi")],
    oynanabilir: false, ucretsiz: false, yas: 20, siklet: 'hafif', gecmis: 'sambo', boy: 178,
    gorunum: { ten: 1, sac: 'kisa', sacRenk: 0, goz: 0, sakal: 'tam', yara: false, dovme: false }, statMod: {}, para: 1500, populerlik: 10, bolumler: [],
  },
};

export const LEGEND_IDS = Object.keys(LEGENDS) as LegendId[];

// ---------- Başlatma ----------

/** Efsanenin hazır dövüşçüsüyle yeni kariyer. İsimler oyuncu tarafından değiştirilebilir. */
export function createLegendGame(id: LegendId, isim?: { ad?: string; soyad?: string; lakap?: string }): GameState {
  const d = LEGENDS[id];
  const input: NewFighterInput = {
    ad: isim?.ad?.trim() || d.ad,
    soyad: isim?.soyad?.trim() || d.soyad,
    lakap: isim?.lakap?.trim() || d.lakap(),
    uyruk: d.uyruk,
    memleket: d.memleket(),
    yas: d.yas,
    siklet: d.siklet,
    gecmis: d.gecmis,
    hikaye: d.ozet(),
    gorunum: d.gorunum,
    boy: d.boy,
  };
  const stats = rollStartingStats(input, false);
  Object.entries(d.statMod).forEach(([k, v]) => (stats[k as StatKey] = clamp(stats[k as StatKey] + (v ?? 0), 10, 72)));
  const s = createGame(input, stats);
  s.para = d.para;
  s.populerlik = d.populerlik;
  s.takipci = initialFollowers(d.populerlik);
  s.efsane = { id, bolum: 0, yildiz: {}, giris: 0 };
  s.haberler.unshift(L("📖 EFSANE YOLU: {0}. Bölüm 1 başlıyor.", [d.lakap()]));
  return s;
}

// ---------- İlerleme ----------

export const legendOf = (s: GameState) => (s.efsane ? LEGENDS[s.efsane.id] : null);
export const currentChapter = (s: GameState) => {
  const r = s.efsane;
  const d = legendOf(s);
  return r && d && r.bolum < d.bolumler.length ? d.bolumler[r.bolum] : null;
};
export const legendStars = (r: LegendRun) => Object.values(r.yildiz).reduce((a, x) => a + x.length, 0);
export const legendMaxStars = (id: LegendId) => LEGENDS[id].bolumler.length * 3;

function earn(r: LegendRun, ch: Chapter, i: number) {
  const list = (r.yildiz[ch.id] ??= []);
  if (!list.includes(i)) list.push(i);
}

/**
 * Bölüm kontrolü: dövüşten sonra (f ile), teklif kabulünde, boks maçından sonra ve maç sonrası akışta çağrılır.
 * Ek yıldızlar bölüm boyunca birikir; ana hedef tamamlanınca ödül verilir ve sonraki bölüm başlar.
 */
export function legendCheck(s: GameState, f: LegendFight | null = null): string[] {
  const r = s.efsane;
  const d = legendOf(s);
  if (!r || !d || r.bitti) return [];
  const lines: string[] = [];
  for (let guard = 0; guard < 3; guard++) {
    const ch = currentChapter(s);
    if (!ch) break;
    if (ch.id === 'tur' && f && f.won && f.org === 'ufc' && ko(f.yontem)) r.sayac = { ...r.sayac, turKo: (r.sayac?.turKo ?? 0) + 1 };
    ch.yildizlar.forEach((st, i) => {
      if (!st.sonda && st.kontrol(s, f, r)) earn(r, ch, i + 1);
    });
    const ok = ch.tamam(s, r);
    if (!ok && !ch.atla?.(s)) break;
    // Reddedilen boks maçı ya da atlanan bölüm: geçilir ama ana yıldız yok
    const odul = ok ? (ch.bitir?.(s, r) ?? []) : [];
    if (ok && !(ch.id === 'parabovusu' && r.boks === 'red')) {
      earn(r, ch, 0);
      // Bölüm sonu yıldızları ödülden sonra (ör. ortaklık satışı servete eklenmiş olsun)
      ch.yildizlar.forEach((st, i) => {
        if (st.sonda && st.kontrol(s, f, r)) earn(r, ch, i + 1);
      });
    }
    const n = r.yildiz[ch.id]?.length ?? 0;
    lines.push(L("📖 BÖLÜM TAMAM: {0} · {1}", [ch.baslik(), '★'.repeat(n) + '☆'.repeat(3 - n)]));
    lines.push(...odul);
    r.bolum++;
    f = null;
    const next = currentChapter(s);
    if (next) {
      r.giris = r.bolum;
      lines.push(...(next.basla?.(s, r) ?? []));
    } else {
      r.bitti = true;
      r.giris = r.bolum;
      if (d.odulKozmetik) s.ozelKozmetik = [...new Set([...(s.ozelKozmetik ?? []), d.odulKozmetik])];
      s.unvanlar.push(L("Efsane Yolu: {0}", [d.lakap()]));
      addFollowers(s, followers(s) * 0.1);
      lines.push(L("🏛️ EFSANE YOLU TAMAMLANDI: {0}! Toplam {1}/{2} yıldız.", [d.lakap(), legendStars(r), legendMaxStars(d.id)]));
      break;
    }
  }
  lines.forEach((l) => s.haberler.unshift(l));
  return lines;
}

/** Hikâye UCC bölümüne gelene kadar Challenger Series daveti gelmez (kemer önce). */
export function legendHoldsUcc(s: GameState) {
  const id = currentChapter(s)?.id;
  return id === 'cirak' || id === 'ders' || id === 'ikikemer';
}

/** Senaryolu UCC kapısı: bölüm gelince (bir galibiyetten sonra) Challenger Series beklenmeden teklif gelir. */
export function legendOffer(s: GameState, won: boolean): string | null {
  const ch = currentChapter(s);
  if (!ch || ch.id !== 'ucc' || !won || s.stage === 'ufc' || s.stage === 'amator') return null;
  const r = s.efsane!;
  if (r.bayrak?.uccBekle) {
    r.bayrak.uccBekle = false;
    return null;
  }
  return L("📞 Telefon çaldı: UCC. \"Kemerlerini izledik. Challenger Series'e gerek yok, doğrudan kadroya geliyorsun.\"");
}

/** Senaryolu boks maçının sonucu (crossover.ts). */
export function legendBoxResult(s: GameState, sonuc: 'G' | 'M' | 'red', yontem?: 'KO' | 'karar') {
  const r = s.efsane;
  if (!r || currentChapter(s)?.id !== 'parabovusu') return;
  r.boks = sonuc === 'M' && yontem === 'KO' ? 'KO' : sonuc;
  legendCheck(s);
}

export function dismissLegendIntro(s: GameState) {
  if (s.efsane) s.efsane.giris = undefined;
}
