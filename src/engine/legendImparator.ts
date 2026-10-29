// Efsane Yolu: Fyodor Yemelyanov (Rusya). Soğuk bir sanayi şehrinden Japonya'nın dev arenalarına, on yıllık
// yenilmezliğe, UCC'yi reddetmeye, düşüşe ve memleketinde vedaya. Bütün hikâye UCC dışında geçer.
import { L } from '../i18n';
import { beatCount, bump, count, finish, ko, legendSponsor, nonUccBelt, pay, type Chapter } from './legendKit';
import { clamp } from './rng';
import type { GameState } from './types';

const nonUccDefs = (s: GameState) => Math.max(0, ...(s.kemerler ?? []).filter((b) => b.aktif && b.org !== 'ufc' && b.org !== 'amator').map((b) => b.savunma));
const allNonUccDefs = (s: GameState) => (s.kemerler ?? []).filter((b) => b.org !== 'ufc' && b.org !== 'amator').reduce((a, b) => a + b.savunma, 0);

export const IMPARATOR: Chapter[] = [
  {
    id: 'oskol',
    yil: '1998',
    yer: () => L("Stary Oskol, Rusya"),
    baslik: () => L("Demir Şehrin Çocuğu"),
    giris: () => [
      L("Demir fabrikalarının dumanı altında büyüdün. Kışlar uzun, salonlar soğuk, para hiç yok."),
      L("Askerde sambo ve judoyla tanıştın. Bir sabah tanklarla dolu bir kışlada, bir subay seni izliyor: \"Bu çocuk hiç yorulmuyor.\""),
      L("Az konuşuyorsun, hiç gülümsemiyorsun. Ama ellerin her şeyi anlatıyor."),
    ],
    hedef: () => L("Profesyonel ol"),
    ipucu: () => L("Amatör maçlar kazan; teklifler kendiliğinden gelir."),
    tamam: (s) => s.stage !== 'amator',
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Amatörde hiç kaybetme"), kontrol: (s) => s.amator.m === 0, sonda: true },
      { ad: () => L("Amatörde 2 submission galibiyeti al"), kontrol: (s) => s.amator.sub >= 2, sonda: true },
    ],
    not: () => L("Sambo seni hem ayakta hem yerde tehlikeli yapıyor: oyun planında dengeli bir baskı seç, kamp odağını Yer ve Kondisyon'a ver."),
    bitir: (s) => {
      s.populerlik = clamp(s.populerlik + 2, 0, 100);
      return [L("❄️ Eski bir spor çantası, iki eldiven ve bir tren bileti. Profesyonel yolculuk başlıyor.")];
    },
  },
  {
    id: 'ring',
    yil: '2001',
    yer: () => L("Yekaterinburg, Rusya"),
    baslik: () => L("Soğuk Ringler"),
    giris: () => [
      L("Rusya'nın küçük turnuvalarında, bazen bir gecede iki rakiple dövüşüyorsun."),
      L("Bir maçında kaşın açılıyor ve doktor maçı durduruyor. Kariyerinin tek lekesi bir kesik olacak."),
      L("Ertesi hafta yeniden kafestesin. Yüzünde tek bir ifade yok."),
    ],
    hedef: () => L("Profesyonelde 8 galibiyet al"),
    ilerleme: (s) => `${Math.min(8, s.rekor.g)}/8`,
    tamam: (s) => s.rekor.g >= 8,
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Bu galibiyetlerin en az 6'sı bitiriş olsun"), kontrol: (s) => s.rekor.ko + s.rekor.sub >= 6, sonda: true },
      { ad: () => L("En fazla 2 yenilgiyle 8 galibiyete ulaş"), kontrol: (s) => s.rekor.m <= 2, sonda: true },
    ],
    not: () => L("Bitiriş için oyun planında baskı ve yerde vuruş seç: indir, üstte kal, yumrukla bitir. Yenilmemek için her maçtan önce tam dinlen."),
    basin: () => ({
      soru: L("Hiç gülümsemiyorsun. Rakiplerini korkutmak için mi?"),
      cevaplar: { mutevazi: L("“Ben sadece işimi yapıyorum. Gülümsemek sonra.”"), iddiali: L("“Kafeste gülümsemeye gerek yok.”"), espri: L("“Gülümsedim. Fark etmediniz.”") },
      tarihi: 'mutevazi',
    }),
  },
  {
    id: 'taht',
    yil: '2003',
    yer: () => L("Saitama, Japonya"),
    baslik: () => L("İmparatorun Tahtı"),
    giris: () => [
      L("Japonya'nın en büyük organizasyonunda ağır sıklet şampiyonu Antonio Nogueras: yerde yenilmez sanılan bir Brezilyalı."),
      L("Kimse onu yerde yenmeyi düşünmüyor bile."),
      L("Sen ise yerde onun üstünde kalmayı ve yumruklarını yağdırmayı planlıyorsun."),
    ],
    hedef: () => L("UCC dışındaki bir organizasyonda şampiyon ol"),
    ipucu: () => L("Bu hikâye UCC dışında geçer. Büyük organizasyonunda zirveye tırman."),
    tamam: (s) => nonUccBelt(s),
    atla: (s) => s.stage === 'ufc',
    uccKapali: true,
    rakip: { ad: 'Antonio', soyad: 'Nogueras', lakap: 'Minotauro', uyruk: () => L("Brezilya"), stil: 'bjj', siklet: 'agir', sampiyon: true, disari: true },
    yildizlar: [
      { ad: () => L("Antonio Nogueras'ı yen"), kontrol: (s) => beatCount(s, 'Nogueras') >= 1 },
      { ad: () => L("Unvan maçını kararla kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && (f.yontem === 'UD' || f.yontem === 'SD' || f.yontem === 'MD') },
    ],
    not: () => L("Nogueras yerde çok tehlikeli ama üstte kalırsan zayıflar: oyun planında baskı ve yerde vuruş seç, Güreş odaklı kamp yap. Onun guard'ına girme; üstte kal, puan topla."),
    basin: () => ({
      soru: L("Nogueras yerde yenilmez diyorlar. Planın ne?"),
      cevaplar: { mutevazi: L("“O büyük bir şampiyon. Planımı kafeste göreceksiniz.”"), iddiali: L("“Yerde de en iyisi benim.”"), espri: L("“Planım mı? Kazanmak. Gerisi detay.”") },
      tarihi: 'mutevazi',
    }),
    bitir: (s) => [pay(s, 200_000, L("Şampiyonluk primi")), L("❄️ Japonya'da yeni bir lakap doğuyor: Son İmparator.")],
  },
  {
    id: 'saltanat',
    yil: '2005',
    yer: () => L("Tokyo, Japonya"),
    baslik: () => L("Buz Gibi Saltanat"),
    giris: () => [
      L("Hırvat kickboksçu Mirko Kroković'in sol tekmesi rakiplerini birer birer uyutuyor. Herkes onun seni yeneceğini söylüyor."),
      L("Basın toplantısında o konuşuyor, sen sadece başını sallıyorsun."),
      L("Japonya bu maçı yılın maçı ilan ediyor."),
    ],
    hedef: () => L("UCC dışındaki kemerini 2 kez savun"),
    ilerleme: (s) => `${Math.min(2, nonUccDefs(s))}/2`,
    tamam: (s) => nonUccDefs(s) >= 2,
    atla: (s) => s.stage === 'ufc',
    uccKapali: true,
    rakip: { ad: 'Mirko', soyad: 'Kroković', lakap: 'Cro Cop', uyruk: () => L("Hırvatistan"), stil: 'kickboks', siklet: 'agir', disari: true },
    yildizlar: [
      { ad: () => L("Mirko Kroković'i yen"), kontrol: (s) => beatCount(s, 'Kroković') >= 1 },
      { ad: () => L("Bir savunmayı submission ile kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.yontem === 'SUB' },
    ],
    not: () => L("Kroković ayakta öldürücü, özellikle sol tekmesi: oyun planında baskı ve indirme seç, mesafede durma. Yerde onu yorarsan bitiriş gelir."),
    basin: () => ({
      soru: L("Kroković senin için \"sol tekmemle uyuyacak\" diyor. Cevabın?"),
      cevaplar: { mutevazi: L("“Herkes konuşabilir. Kafeste göreceğiz.”"), iddiali: L("“Uyuyacak olan o.”"), espri: L("“Öğleden sonra uyumayı severim zaten.”") },
      tarihi: 'mutevazi',
    }),
    bitir: (s) => [pay(s, 1_000_000, L("Yılın maçı primi"))],
  },
  {
    id: 'yenilmez',
    yil: '2006',
    yer: () => L("Tokyo, Las Vegas"),
    baslik: () => L("On Yıllık Yenilmezlik"),
    giris: () => [
      L("Rakiplerin senden yirmi kilo ağır, yirmi santim uzun. Fark etmiyor."),
      L("Bir maçta rakibin seni kafa üstü yere çakıyor; birkaç saniye sonra onu kol kilidiyle bitiriyorsun."),
      L("Dünya basını seni tüm zamanların en iyi ağır sıkleti olarak anıyor."),
    ],
    hedef: () => L("8 maçlık galibiyet serisi yakala"),
    ilerleme: (s) => `${Math.min(8, Math.max(0, s.seri))}/8`,
    tamam: (s) => s.seri >= 8,
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Bu bölümde 2 nakavt galibiyeti al"), kontrol: (_s, _f, r) => count(r, 'ko') >= 2 },
      { ad: () => L("Bu bölümde 2 submission galibiyeti al"), kontrol: (_s, _f, r) => count(r, 'sub') >= 2 },
    ],
    say: (_s, f, r) => {
      if (f.won && ko(f.yontem)) bump(r, 'ko');
      if (f.won && f.yontem === 'SUB') bump(r, 'sub');
    },
    not: () => L("Seri için yorgunken asla dövüşme ve her rakibe keşif raporu al. Hem nakavt hem submission yıldızı için rakibin zayıf yanına göre planı değiştir: güreşçiye vuruş, vurucuya yer."),
    basin: () => ({
      soru: L("Rakiplerin senden çok daha iri. Bu seni endişelendirmiyor mu?"),
      cevaplar: { mutevazi: L("“Büyüklük önemli değil. Önemli olan hazırlık.”"), iddiali: L("“Büyük olanlar daha çok gürültüyle düşer.”"), espri: L("“Ben küçük değilim. Onlar fazla büyük.”") },
      tarihi: 'mutevazi',
    }),
    bitir: (s) => [pay(s, 1_500_000, L("Japonya'daki son gecenin primi")), ...legendSponsor(s, 'rolex', 1.4)],
  },
  {
    id: 'red',
    yil: '2008',
    yer: () => L("Moskova, Rusya"),
    baslik: () => L("Teklifi Reddetmek"),
    giris: () => [
      L("UCC'nin patronu Moskova'ya geldi. Masada rekor bir kontrat var."),
      L("Ama şartları ağır: kendi organizasyonunla bağlarını koparman, istediğin zaman memleketinde dövüşememen."),
      L("\"Para her şey değil,\" diyorsun ve masadan kalkıyorsun. Bütün dünya şaşkın."),
    ],
    hedef: () => L("UCC'ye girmeden 20 profesyonel galibiyete ulaş"),
    ilerleme: (s) => `${Math.min(20, s.rekor.g)}/20`,
    tamam: (s) => s.stage !== 'ufc' && s.rekor.g >= 20,
    atla: (s) => s.stage === 'ufc',
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Kariyerinde en fazla 5 yenilgi"), kontrol: (s) => s.rekor.m <= 5, sonda: true },
      { ad: () => L("Popülerliğin 70'i geçsin"), kontrol: (s) => s.populerlik >= 70 },
    ],
    basla: (s) => {
      s.populerlik = clamp(s.populerlik + 4, 0, 100);
      return [L("📰 Son İmparator UCC'nin rekor teklifini reddetti. Memleketinde bir kahraman gibi karşılanıyor. Popülerlik +4.")];
    },
    not: () => L("UCC dışında kalmak için gelen UCC tekliflerini kabul etme; kendi organizasyonunla sözleşme yenile. Yenilgi sayını düşük tutmak için riskli maçlardan kaçın."),
    basin: () => ({
      soru: L("UCC'nin rekor teklifini neden reddettin?"),
      cevaplar: { mutevazi: L("“Ailem ve memleketim her şeyden önce gelir.”"), iddiali: L("“UCC'ye ihtiyacım yok. Kemer zaten bende.”"), espri: L("“Kontratın yazıları çok küçüktü.”") },
      tarihi: 'mutevazi',
    }),
  },
  {
    id: 'agirlar',
    yil: '2009',
    yer: () => L("St. Petersburg, Rusya"),
    baslik: () => L("Ağırların Ağırı"),
    giris: () => [
      L("Memleketinde, kendi organizasyonunda kemer maçları yapıyorsun. Salonlar tıklım tıklım."),
      L("Devlet başkanı ön sırada. Rakiplerin Amerika'dan, Japonya'dan, Brezilya'dan geliyor."),
      L("Kimse kemeri senden alamıyor."),
    ],
    hedef: () => L("UCC dışındaki kemerini toplam 4 kez savun"),
    ilerleme: (s) => `${Math.min(4, nonUccDefs(s))}/4`,
    tamam: (s) => nonUccDefs(s) >= 4,
    atla: (s) => s.stage === 'ufc' || !nonUccBelt(s),
    yildizlar: [
      { ad: () => L("Bu bölümde 3 bitiriş galibiyeti al"), kontrol: (_s, _f, r) => count(r, 'bitir') >= 3 },
      { ad: () => L("Bir savunmayı 1. rauntta kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && finish(f.yontem) && f.raunt === 1 },
    ],
    say: (_s, f, r) => {
      if (f.won && finish(f.yontem)) bump(r, 'bitir');
    },
    not: () => L("Savunmalar arasında tam dinlen ve her rakibe keşif raporu al. İlk raunt bitirişi için oyun planında erken baskıyı seç."),
    basin: () => ({
      soru: L("Devlet başkanı seni izliyor. Baskı hissediyor musun?"),
      cevaplar: { mutevazi: L("“Memleketimin önünde dövüşmek bir onur.”"), iddiali: L("“Baskıyı rakibim hissetsin.”"), espri: L("“Ön sıradaki koltuk ondan önce benimdi.”") },
      tarihi: 'mutevazi',
    }),
    bitir: (s) => [pay(s, 2_000_000, L("Memleket gecesi primi"))],
  },
  {
    id: 'dusus',
    yil: '2010',
    yer: () => L("San Jose, ABD"),
    baslik: () => L("Düşüş ve Kalkış"),
    giris: () => [
      L("On yıl sonra ilk gerçek yenilgi. Bir triangle, bir doktor durdurması, bir nakavt."),
      L("Dünya basını \"İmparator düştü\" diye yazıyor."),
      L("Sen ise bir şey söylüyorsun: \"Kim düşmez ki? Önemli olan kalkmak.\""),
    ],
    hedef: () => L("Bu bölümde 3 galibiyet al"),
    tamam: (_s, r) => count(r, 'g') >= 3,
    yildizlar: [
      { ad: () => L("Bu bölümde hiç kaybetme"), kontrol: (s, _f, r) => s.rekor.m <= count(r, 'm0'), sonda: true },
      { ad: () => L("Bir maçı 1. rauntta bitir"), kontrol: (_s, f) => !!f && f.won && finish(f.yontem) && f.raunt === 1 },
    ],
    basla: (s, r) => {
      bump(r, 'm0', s.rekor.m);
      return [];
    },
    say: (_s, f, r) => {
      if (f.won) bump(r, 'g');
    },
    not: () => L("Geri dönüşte acele etme: yorgunluğunu sıfırla ve rakip seçerken sıralamada yakın olanı al. İlk raunt bitirişi için erken baskı."),
    basin: () => ({
      soru: L("İlk yenilgilerinden sonra bitti diyenler var. Ne diyorsun?"),
      cevaplar: { mutevazi: L("“Kim düşmez ki? Önemli olan kalkmak.”"), iddiali: L("“Beni gömenler yanılacak.”"), espri: L("“Ben düşmedim, biraz yere yakın durdum.”") },
      tarihi: 'mutevazi',
    }),
  },
  {
    id: 'veda',
    yil: '2012',
    yer: () => L("Moskova, Rusya"),
    baslik: () => L("Memleketinde Veda"),
    giris: () => [
      L("Moskova'da son bir gece. Salonda yirmi bin kişi, hepsi adını haykırıyor."),
      L("Kızların ön sırada. Annen dua ediyor."),
      L("\"Bu son,\" diyorsun. \"Ama son, en güzeli olsun.\""),
    ],
    hedef: () => L("35 yaşından sonra bir maç kazan"),
    ilerleme: (s) => L("Yaş {0}", [s.fighter.yas]),
    tamam: (_s, r) => count(r, 'vedaG') > 0,
    yildizlar: [
      { ad: () => L("Kariyerinde 30 profesyonel galibiyete ulaş"), kontrol: (s) => s.rekor.g >= 30, sonda: true },
      { ad: () => L("Toplam 5 kemer savunmasına ulaş (UCC dışı)"), kontrol: (s) => allNonUccDefs(s) >= 5, sonda: true },
    ],
    say: (s, f, r) => {
      if (f.won && s.fighter.yas >= 35) bump(r, 'vedaG');
    },
    not: () => L("Yaş ilerledikçe dikkatli ol: kampları düşük yoğunlukta tut, yorgunken dövüşme ve dengeli bir plan seç. Galibiyet sayısı için kariyeri uzun tut."),
    basin: () => ({
      soru: L("Bu gerçekten son maçın mı?"),
      cevaplar: { mutevazi: L("“Ailem için, memleketim için. Evet, son.”"), iddiali: L("“Son maç ama en iyi performans.”"), espri: L("“Bunu her seferinde söylüyorum, değil mi?”") },
      tarihi: 'mutevazi',
    }),
    bitir: (s) => [L("❄️ Kafesin ortasında eldivenlerini çıkarıp yere bırakıyorsun. Bir imparator tahtından iniyor.")],
  },
];
