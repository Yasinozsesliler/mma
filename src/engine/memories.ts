// Hatıralar: kariyerin büyük anlarından kalan eşyalar (müze), tatillerden kartpostallar, aile fotoğrafları ve
// dövüştüğün şehirlerden pasaport damgaları ile hediyelik eşyalar. Hepsi yalnızca anı; güç vermez.
import { L, LOC } from '../i18n';
import { ORGS } from './data';
import { cityPin, HOME_ID } from './worldMap';
import type { GameState, Hatira, HatiraTur, OrgId } from './types';

/** Müzede yeri önceden belli olan hatıralar (kilitliyken ipucu gösterilir). */
export const MUSEUM: { id: string; tur: HatiraTur; ad: () => string; ipucu: () => string; nadir: Hatira['nadir'] }[] = [
  { id: 'ilk_galibiyet', tur: 'eldiven', ad: () => L("İlk galibiyetin eldivenleri"), ipucu: () => L("İlk galibiyetini al."), nadir: 'siradan' },
  { id: 'ilk_nakavt', tur: 'sort', ad: () => L("İlk nakavtının şortu"), ipucu: () => L("Rakibini nakavtla yen."), nadir: 'siradan' },
  { id: 'ilk_sub', tur: 'foto', ad: () => L("Tap attığı an"), ipucu: () => L("Submission ile kazan."), nadir: 'siradan' },
  { id: 'ilk_pro', tur: 'poster', ad: () => L("İlk profesyonel afişin"), ipucu: () => L("İlk profesyonel galibiyetini al."), nadir: 'siradan' },
  { id: 'bonus', tur: 'cek', ad: () => L("Gecenin Performansı çeki"), ipucu: () => L("Bir performans bonusu kazan."), nadir: 'ozel' },
  { id: 'geri_donus', tur: 'bandaj', ad: () => L("Geri dönüş gecesinin bandajları"), ipucu: () => L("Puanda gerideyken maçı çevir."), nadir: 'ozel' },
  { id: 'surpriz', tur: 'foto', ad: () => L("Kimsenin inanmadığı gece"), ipucu: () => L("Senden çok daha güçlü bir rakibi yen."), nadir: 'ozel' },
  { id: 'savas', tur: 'sort', ad: () => L("Savaş gecesinin kanlı şortu"), ipucu: () => L("İki tarafın da çok hasar aldığı bir savaşı kazan."), nadir: 'ozel' },
  { id: 'ezeli', tur: 'poster', ad: () => L("İki imzalı ezeli rakip afişi"), ipucu: () => L("Ezeli rakibini yen."), nadir: 'efsane' },
  { id: 'hikaye', tur: 'poster', ad: () => L("Hesaplaşma gecesinin afişi"), ipucu: () => L("Bir hikâye maçını kazan."), nadir: 'ozel' },
  { id: 'ilk_kemer', tur: 'kemer', ad: () => L("İlk şampiyonluk kemerin"), ipucu: () => L("Bir şampiyonluk kemeri kazan."), nadir: 'efsane' },
  { id: 'ucc_kemer', tur: 'kemer', ad: () => L("UCC şampiyonluk kemeri"), ipucu: () => L("UCC şampiyonu ol."), nadir: 'efsane' },
  { id: 'savunma1', tur: 'kupa', ad: () => L("İlk unvan savunmasının kupası"), ipucu: () => L("Kemerini bir kez savun."), nadir: 'ozel' },
  { id: 'savunma3', tur: 'kupa', ad: () => L("Üç savunmanın altın eldiveni"), ipucu: () => L("Kemerini üç kez savun."), nadir: 'efsane' },
  { id: 'gp', tur: 'madalya', ad: () => L("Grand Prix madalyası"), ipucu: () => L("Bir Grand Prix kazan."), nadir: 'efsane' },
];

export const HATIRA_ICON: Record<HatiraTur, string> = {
  eldiven: 'boxing-glove',
  sort: 'tshirt-crew',
  foto: 'camera-iris',
  poster: 'image-frame',
  cek: 'cash-check',
  bandaj: 'bandage',
  kemer: 'crown',
  kupa: 'trophy',
  madalya: 'medal',
  kartpostal: 'email-newsletter',
  aile: 'heart',
  hediye: 'gift',
};

export const NADIR_RENK: Record<Hatira['nadir'], string> = { siradan: '#9aa1ad', ozel: '#3aa8ff', efsane: '#f2c14e' };

const tarih = (s: GameState) => L("{0} yaşında · {1}. hafta", [s.fighter.yas, s.hafta]);

export function hasMemento(s: GameState, id: string) {
  return (s.hatiralar ?? []).some((h) => h.id === id);
}

/** Bir hatıra ekler (aynı kimlik ikinci kez eklenmez). Haber satırı döndürür. */
export function addMemento(s: GameState, h: Omit<Hatira, 'hafta' | 'yas'>): string | null {
  if (hasMemento(s, h.id)) return null;
  s.hatiralar = [{ ...h, hafta: s.hafta, yas: s.fighter.yas }, ...(s.hatiralar ?? [])];
  return h.kat === 'muze' ? L("🏛️ Müzene yeni hatıra: {0}", [h.ad]) : null;
}

/** Maç sonu: kazanılan büyük anlardan müze hatıraları. */
export function fightMementos(
  s: GameState,
  c: { won: boolean; yontem: string; rakip: string; org: OrgId; pro: boolean; bonus: number; geriDonus: boolean; surpriz: boolean; savas: boolean; ezeli: boolean; hikaye: boolean; unvan: boolean; savunma: number },
): string[] {
  if (!c.won) return [];
  const yer = s.gecmis[0]?.sehir ? cityPin(s, s.gecmis[0].sehir)?.ad : undefined;
  const alt = [L("Rakip: {0}", [c.rakip]), ORGS[c.org]?.kisa, yer, tarih(s)].filter(Boolean).join(' · ');
  const out: (string | null)[] = [];
  const add = (id: string, metin: string) => {
    const d = MUSEUM.find((m) => m.id === id)!;
    out.push(addMemento(s, { id, tur: d.tur, ad: d.ad(), metin: `${metin}\n${alt}`, nadir: d.nadir, kat: 'muze' }));
  };
  const ko = c.yontem === 'KO' || c.yontem === 'TKO';
  add('ilk_galibiyet', L("Her şeyin başladığı gece. Eldivenler hâlâ terli kokuyor."));
  if (ko) add('ilk_nakavt', L("Rakip yere düştüğünde salonun nasıl patladığını hâlâ duyuyorsun."));
  if (c.yontem === 'SUB') add('ilk_sub', L("Fotoğrafçı tam o anı yakaladı: rakibin eli minderde, senin yüzünde sakinlik."));
  if (c.pro) add('ilk_pro', L("Adın ilk kez büyük harflerle bir afişteydi."));
  if (c.bonus > 0) add('bonus', L("Kocaman karton bir çek. Fotoğrafı annen çerçeveletti."));
  if (c.geriDonus) add('geri_donus', L("Kartlarda gerideydin. Bu bandajlarla maçı çevirdin."));
  if (c.surpriz) add('surpriz', L("Bahis şirketleri seni yazmamıştı bile. Gazete manşeti duvarında."));
  if (c.savas) add('savas', L("Doktorlar iki kez kontrol etti. Sen bırakmadın."));
  if (c.ezeli) add('ezeli', L("Yıllarca süren rekabet. Afişin altında ikinizin de imzası var."));
  if (c.hikaye) add('hikaye', L("Kafes dışında başlayan bir hikâye kafeste bitti."));
  if (c.unvan) {
    add('ilk_kemer', L("Altın ilk kez beline değdiğinde ağladın. Kameralar da gördü."));
    if (c.org === 'ufc') add('ucc_kemer', L("Dünyanın en büyük sahnesi. En tepedesin."));
  }
  if (c.savunma >= 1) add('savunma1', L("Kemeri almak bir şey, tutmak başka."));
  if (c.savunma >= 3) add('savunma3', L("Üç kez geldiler, üç kez gönderdin."));
  return out.filter((x): x is string => !!x);
}

/** Grand Prix şampiyonluğu (grandPrix.ts). */
export function gpMemento(s: GameState, ad: string) {
  const d = MUSEUM.find((m) => m.id === 'gp')!;
  return addMemento(s, { id: 'gp', tur: d.tur, ad: d.ad(), metin: `${ad}\n${tarih(s)}`, nadir: d.nadir, kat: 'muze' });
}

// ---------- Pasaport ----------

/** Her şehirden bir hediyelik eşya. */
export const SOUVENIRS: Record<string, () => string> = {
  vegas: () => L("Altın kaplama bir çift zar"),
  newyork: () => L("Özgürlük Heykeli kar küresi"),
  chicago: () => L("Derin pizza mıknatısı"),
  houston: () => L("Uzay merkezi rozeti"),
  miami: () => L("Pembe flamingo heykelciği"),
  denver: () => L("Kayalık Dağlar kartpostalı"),
  atlanta: () => L("Şeftali reçeli"),
  phoenix: () => L("Saksıda minik kaktüs"),
  orlando: () => L("Lunapark bileti"),
  toronto: () => L("Akçaağaç şurubu"),
  mexico: () => L("Lucha libre maskesi"),
  sanjuan: () => L("Renkli sokak tabelası"),
  rio: () => L("Kurtarıcı İsa biblosu"),
  saopaulo: () => L("Futbol forması"),
  buenosaires: () => L("Tango ayakkabısı"),
  manchester: () => L("Kırmızı atkı"),
  dublin: () => L("Yonca desenli şapka"),
  paris: () => L("Eyfel anahtarlığı"),
  berlin: () => L("Duvar parçası"),
  bratislava: () => L("Kale kartpostalı"),
  stockholm: () => L("Ahşap Dala atı"),
  amsterdam: () => L("Tahta takunya"),
  dubai: () => L("Kum şişesinde çöl manzarası"),
  bangkok: () => L("Muay Thai mongkolu"),
  manila: () => L("Jeepney maketi"),
  kualalumpur: () => L("İkiz kuleler maketi"),
  tokyo: () => L("Maneki-neko kedisi"),
  lagos: () => L("El dokuması kumaş"),
  johannesburg: () => L("Boncuklu bileklik"),
  perth: () => L("Kanguru peluşu"),
  auckland: () => L("Maori oyması kolye"),
  londra: () => L("Kırmızı telefon kulübesi maketi"),
  koln: () => L("Katedral kartpostalı"),
  prag: () => L("Kukla tiyatrosu kuklası"),
  varsova: () => L("Kehribar kolye"),
  istanbul: () => L("Nazar boncuğu"),
  moskova: () => L("Matruşka bebek"),
  abudabi: () => L("Altın varaklı hurma kutusu"),
  riyad: () => L("Bakır cezve"),
  baku: () => L("Minyatür halı"),
  tiflis: () => L("Boynuz şarap kadehi"),
  almati: () => L("Keçe kalpak"),
  singapur: () => L("Merlion biblosu"),
  cakarta: () => L("Batik desenli şal"),
  sanghay: () => L("İpek yelpaze"),
  sidney: () => L("Opera binası maketi"),
};

/** Pasaport damgası: şehre ilk gelişte maç sonucuyla birlikte. */
export function stampCity(s: GameState, id: string) {
  if (id === HOME_ID) return;
  s.damgalar ??= {};
  if (s.damgalar[id]) return;
  s.damgalar[id] = { hafta: s.hafta, sonuc: s.gecmis[0]?.sonuc };
}

// ---------- Tatil kartpostalları ----------

const POSTCARDS: Record<string, () => string> = {
  koy: () => L("Annenin bahçesinde çekilmiş bir fotoğraf. Arkasında “Her zaman buradayız.” yazıyor."),
  kapadokya: () => L("Gün doğumunda yüzlerce balon. Hayatında ilk kez kafan bu kadar sessizdi."),
  antalya: () => L("Açık büfeden bir tabak. Arkasına antrenörün “Bunu görmedim.” yazmış."),
  bali: () => L("Sörf tahtasıyla kumsalda. İlk dalgada düştün, onuncuda ayaktaydın."),
  dubai: () => L("Bir gökdelenin tepesinden şehir. Ünlülerle çekilmiş fotoğraflar telefonunda."),
  maldivler: () => L("Su üstü villanın terası. İki hafta boyunca telefona bakmadın."),
  monaco: () => L("Yarış pistinin kenarında bir yat. Kimin partisi olduğunu hâlâ bilmiyorsun."),
};
const ABROAD: Record<string, { ad: () => string }> = {
  bali: { ad: () => L("Bali") },
  dubai: { ad: () => L("Dubai") },
  maldivler: { ad: () => L("Maldivler") },
  monaco: { ad: () => L("Monako") },
};

/** Tatil dönüşü kartpostal (her tatil yeri için bir kez) ve yurt dışıysa pasaport damgası. */
export function vacationMemento(s: GameState, id: string, ad: string) {
  const metin = POSTCARDS[id]?.();
  if (metin) addMemento(s, { id: `tatil_${id}`, tur: 'kartpostal', ad, metin: `${metin}\n${tarih(s)}`, nadir: 'siradan', kat: 'tatil' });
  if (ABROAD[id]) {
    s.damgalar ??= {};
    s.damgalar[`tatil_${id}`] ??= { hafta: s.hafta, tatil: true };
  }
}
export const abroadName = (id: string) => ABROAD[id.replace(/^tatil_/, '')]?.ad();

export const fmtWeek = (h: number) => L("{0}. hafta", [h.toLocaleString(LOC)]);
