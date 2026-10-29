// Efsane Yolu: Conor McGrath (İrlanda). Tesisatçı çıraklığından çifte şampiyonluğa, asrın boks maçına ve kendi markasına.
import { L } from '../i18n';
import { followers } from './fame';
import { $, bump, count, finish, ko, legendSponsor, pay, ufcBelts, type Chapter } from './legendKit';
import { clamp } from './rng';

// Normal oyundaki UCC kadrosu gibi: gerçeği çağrıştıran ama birebir aynı olmayan isimler
const BOXER = { ad: 'Floyd Maywood', lakap: 'Money', rekor: '49-0', guc: 96 };

export const KRAL: Chapter[] = [
  {
    id: 'cirak',
    uccKapali: true,
    not: () => L("Amatörde yenilmemek için rakip seçerken en dengeli olanı al ve kampta Kondisyon'u ihmal etme. 20 yaş yıldızı için amatörde oyalanma: ilk profesyonel teklifi kabul et."),
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
    uccKapali: true,
    not: () => L("Nakavt yıldızları için kamp odağını Vuruş'a ver, oyun planında erken baskıyı seç. 1. raunt nakavtı için güreşçilerden uzak dur, çenesi zayıf rakipleri tercih et."),
    basin: () => ({
      soru: L("İlk yenilgilerin yerde geldi. Güreşçilerden korkuyor musun?"),
      cevaplar: { mutevazi: L("“Eksiklerim var. Her gün minderdeyim.”"), iddiali: L("“Beni yere indirecek adam önce sol elimden geçmek zorunda.”"), espri: L("“Yerde değil, zirvede olmayı seviyorum.”") },
      tarihi: 'iddiali',
    }),
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
    uccKapali: true,
    not: () => L("Kemer maçında bitiriş için önce keşif raporuyla rakibin zayıf yanını öğren. 25 yaşından önce kemer için kampları kısa tut ve sakatlıktan kaçın: dinlenmeyi atlama."),
    basin: () => ({
      soru: L("Tek kemer yetmiyor mu sana?"),
      cevaplar: { mutevazi: L("“Önce bu kemeri hak etmem gerek.”"), iddiali: L("“İki kemer alacağım: biri sol omzuma, biri sağ omzuma.”"), espri: L("“Bir kemer pantolonu tutar, ikincisi stil için.”") },
      tarihi: 'iddiali',
    }),
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
    uccKapi: true,
    not: () => L("İkinci kemer yıldızı için şampiyonken Sıklet düğmesiyle bir üst sıklete çık; ilk maçın unvan maçıdır. UCC teklifi gelmeden önce organizasyonunda kal. Çıkış maçında nakavt için Vuruş odaklı kamp yap."),
    basin: () => ({
      soru: L("İşsizlik yardımından UCC'ye geliyorsun. Bu sahne sana büyük değil mi?"),
      cevaplar: { mutevazi: L("“Burada olmak bir onur. Fırsatı değerlendireceğim.”"), iddiali: L("“Sahne bana küçük. Buraya katılmaya değil, devralmaya geldim.”"), espri: L("“Yardım kuyruğundan çıktım, şimdi rakiplerimi kuyruğa sokacağım.”") },
      tarihi: 'iddiali',
    }),
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
    not: () => L("Seri yıldızı için her maçtan önce tam dinlen, yorgunken dövüşme. Nakavt sayacı yalnızca bu bölümdeki UCC nakavtlarını sayar: güreşçi olmayan rakipleri seç."),
    basin: () => ({
      soru: L("Yine raundu tahmin edecek misin?"),
      cevaplar: { mutevazi: L("“Tahmin yok. Kafeste konuşacağım.”"), iddiali: L("“Birinci raunt. Yazın bir kenara.”"), espri: L("“Tahminim tutmazsa saçımı keserim. Tutar.”") },
      tarihi: 'iddiali',
    }),
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
      { ad: () => L("Bu bölümde UCC'de 3 nakavt galibiyeti al"), kontrol: (_s, _f, r) => count(r, 'turKo') >= 3 },
    ],
    basla: (s) => {
      s.populerlik = clamp(s.populerlik + 5, 0, 100);
      return legendSponsor(s, 'reebot', 1.4);
    },
    say: (_s, f, r) => {
      if (f.won && f.org === 'ufc' && ko(f.yontem)) bump(r, 'turKo');
    },
  },
  {
    id: 'onucsaniye',
    not: () => L("Şampiyon güçlü ama ilk saniyelerde öne atılır. Oyun planında karşı vuruşu seç, kamp odağını Hız ve Vuruş'a ver: erken nakavtın en yakın olduğu an ilk rauntun başıdır."),
    basin: () => ({
      soru: L("Şampiyon on yıldır yenilmiyor. Neden sen?"),
      cevaplar: { mutevazi: L("“O bir efsane. Ama ben de hazırım.”"), iddiali: L("“Hassasiyet gücü yener, zamanlama hızı yener. İlk rauntta düşecek.”"), espri: L("“On yıl uzun zaman. Biraz dinlenmeyi hak etti.”") },
      tarihi: 'iddiali',
    }),
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
    not: () => L("Şampiyonken komşu sıklete geç: ilk maçın unvan maçıdır ve eski kemerin aktif kalır. Bitiriş yıldızı için keşif raporu al ve yorgunluğunu sıfırla."),
    basin: () => ({
      soru: L("Aynı anda iki kemer mi? Patronlar buna ne diyor?"),
      cevaplar: { mutevazi: L("“İzin verirlerse tarihe geçmek isterim.”"), iddiali: L("“Önce izin isterdim. Artık özür bile dilemiyorum.”"), espri: L("“Patronlar bilet satışlarına bakıyor. Gülümsüyorlar.”") },
      tarihi: 'iddiali',
    }),
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
    not: () => L("Boks maçında güreş yok: ilk rauntlarda gardı yüksek tut ve puan topla, son rauntlarda yorulacağını unutma. Nakavt olmamak için savunma planlarını tercih et."),
    yil: '2017',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("Para Dövüşü"),
    giris: () => [
      L("Boks dünyasının kusursuz adamı, 49 maçta hiç yenilmemiş {0}, emekliliğinden senin için dönüyor.", [BOXER.ad]),
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
      s.boksTeklif = { boksor: { ...BOXER }, ucret: 100_000_000 };
      return [L("🥊 Asrın teklifi geldi: {0} (49-0) ile boks maçı. Ücret {1}.", [BOXER.ad, $(100_000_000)])];
    },
  },
  {
    id: 'imparatorluk',
    not: () => L("Markam bölümünde önce markayı kur, sonra içecek ürününü çıkar; servet yıldızı ortaklık satışı eklendikten sonra kontrol edilir. Takipçi için paylaşımlar ve medya projeleri en hızlı yol."),
    basin: () => ({
      soru: L("Artık bir iş adamısın. Kafese dönecek misin?"),
      cevaplar: { mutevazi: L("“Kafes her zaman evim olacak.”"), iddiali: L("“Ben sadece bir dövüşçü değilim, bir imparatorluğum.”"), espri: L("“Döneceğim. Ama önce bir kadeh, benim markamdan.”") },
      tarihi: 'iddiali',
    }),
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
