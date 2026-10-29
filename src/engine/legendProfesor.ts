// Efsane Yolu: Georges Saint-Pierron (Kanada). Karate çocuğundan çöp kamyonuna, idolünü yenmeye, rövanşlara,
// welter hükümdarlığına, dört yıl sonra orta sıklet kemerine ve Onur Listesi'ne.
import { L } from '../i18n';
import { beatCount, bump, count, decision, finish, ko, legendSponsor, nonUccBelt, pay, revengeWin, ufcBeltIn, ufcBelts, uccWin, type Chapter } from './legendKit';
import { clamp } from './rng';

const HUGHTON = { ad: 'Matt', soyad: 'Hughton', lakap: 'The Country Boy', uyruk: () => 'ABD', stil: 'gures' as const };

export const PROFESOR: Chapter[] = [
  {
    id: 'karate',
    yil: '2002',
    yer: () => L("Saint-Isidore, Kanada"),
    baslik: () => L("Karate Çocuğu"),
    giris: () => [
      L("Okulda zorbaların hedefiydin. Babanın sana öğrettiği karate, kendini korumanın tek yolu oldu."),
      L("Şimdi gündüzleri çöp kamyonunda çalışıyor, geceleri bir kulübün kapısında duruyorsun. Kalan her saat salonda."),
      L("Hocan Firas Zahir seni ilk izlediğinde not defterine tek bir kelime yazıyor: \"Disiplin.\""),
    ],
    hedef: () => L("Profesyonel ol"),
    ipucu: () => L("Amatör maçlar kazan; teklifler kendiliğinden gelir."),
    tamam: (s) => s.stage !== 'amator',
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Amatörde hiç kaybetme"), kontrol: (s) => s.amator.m === 0, sonda: true },
      { ad: () => L("22 yaşına girmeden profesyonel ol"), kontrol: (s) => s.fighter.yas < 22, sonda: true },
    ],
    not: () => L("Karate temelin ayakta mesafeyi sana veriyor, ama asıl gücün disiplin: kampta Güreş'i ihmal etme. Yenilmemek için her maçtan önce tam dinlen."),
    bitir: (s) => {
      s.populerlik = clamp(s.populerlik + 3, 0, 100);
      return [L("🗑️ Çöp kamyonundaki son vardiyan. Arkadaşların sana bir eldiven hediye ediyor.")];
    },
  },
  {
    id: 'copcu',
    yil: '2003',
    yer: () => L("Montreal, Kanada"),
    baslik: () => L("Çöp Kamyonundan Kafese"),
    giris: () => [
      L("Montreal'in bölgesel sahnesindesin. Rakiplerin senden iri, senden deneyimli."),
      L("Ama sen herkesten çok çalışıyorsun. Güreşi öğrenmek için olimpiyat takımının antrenmanlarına izinsiz giriyorsun."),
      L("Hedef açık: Kanada'nın kemeri ve ardından büyük sahne."),
    ],
    hedef: () => L("UCC dışındaki bir organizasyonda şampiyon ol"),
    ipucu: () => L("Bu bölümde UCC seni beklemez: kemer senin biletin."),
    tamam: (s) => nonUccBelt(s),
    atla: (s) => s.stage === 'ufc',
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Kemer maçını bitirişle kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && finish(f.yontem) },
      { ad: () => L("Kemeri 24 yaşına girmeden al"), kontrol: (s) => s.fighter.yas < 24, sonda: true },
    ],
    not: () => L("Kemer maçından önce keşif raporu al ve oyun planını rakibin zayıf yanına göre seç. Yenilgisiz kalmak için kampları uzun tut ve sakatlık riskini düşük yoğunlukla azalt."),
    basin: () => ({
      soru: L("Gündüz çöp topluyorsun, gece dövüşüyorsun. Nasıl yetişiyorsun?"),
      cevaplar: { mutevazi: L("“Çok çalışmaktan başka sırrım yok.”"), iddiali: L("“Bir gün bu şehrin her yerinde posterlerim olacak.”"), espri: L("“Çöp kamyonu en iyi kondisyon antrenmanı.”") },
      tarihi: 'mutevazi',
    }),
  },
  {
    id: 'ilkmac',
    yil: '2004',
    yer: () => L("Atlantic City, ABD"),
    baslik: () => L("İlk Sınav"),
    giris: () => [
      L("Kanada kemeri belinde, telefon çalıyor: UCC seni istiyor."),
      L("İlk rakibin sert bir judocu. Herkes senin için \"çok genç, çok erken\" diyor."),
      L("Soyunma odasında Firas'ın sesi kulağında: \"Plan. Sabır. Disiplin.\""),
    ],
    hedef: () => L("UCC'ye gir ve ilk maçını kazan"),
    ipucu: () => L("Bir galibiyet daha getir: UCC teklifi doğrudan gelir."),
    tamam: (s) => uccWin(s),
    uccKapi: true,
    yildizlar: [
      { ad: () => L("İlk UCC maçını kararla kazan"), kontrol: (s, f) => !!f && f.won && f.org === 'ufc' && decision(f.yontem) && s.gecmis.filter((h) => h.org === 'ufc').length === 1 },
      { ad: () => L("UCC'deki ilk galibiyetini 25 yaşına girmeden al"), kontrol: (s) => s.fighter.yas < 25, sonda: true },
    ],
    not: () => L("Çıkış maçında risk alma: oyun planında puan ve kontrolü seç, Kondisyon odaklı kamp yap. Üç raunt boyunca baskı kur, karar senin olur."),
    basin: () => ({
      soru: L("UCC'de ilk maçın. Ne bekliyorsun?"),
      cevaplar: { mutevazi: L("“Burada olmak bir rüya. Her şeyimi vereceğim.”"), iddiali: L("“Kısa sürede şampiyon olacağım.”"), espri: L("“Bir otel odası ve iyi bir uyku. Sonra galibiyet.”") },
      tarihi: 'mutevazi',
    }),
  },
  {
    id: 'idol',
    yil: '2004',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("İdolünün Karşısında"),
    giris: () => [
      L("Welter sıkletin şampiyonu Matt Hughton, çocukluğundan beri posterini duvarına astığın adam."),
      L("Onunla aynı kafeste olmayı hayal ettin. Şimdi o hayal gerçekleşmek üzere ve gözlerinin içine bakamıyorsun."),
      L("\"Önce saygıyı bırakman gerek,\" diyor Firas. \"Kafeste idol yoktur, sadece rakip vardır.\""),
    ],
    hedef: () => L("UCC'de ilk 5'e gir"),
    ilerleme: (s) => (s.stage === 'ufc' && s.rank ? `#${s.rank}` : null),
    tamam: (s) => s.stage === 'ufc' && (s.sampiyon || (s.rank != null && s.rank <= 5)),
    rakip: { ...HUGHTON, siklet: 'welter', sampiyon: true },
    yildizlar: [
      { ad: () => L("UCC'de 4 maçlık galibiyet serisi yakala"), kontrol: (s) => s.stage === 'ufc' && s.seri >= 4 },
      { ad: () => L("Bu bölümde bir UCC maçını submission ile kazan"), kontrol: (_s, f) => !!f && f.won && f.org === 'ufc' && f.yontem === 'SUB' },
    ],
    not: () => L("Seri için her maçtan önce yorgunluğunu sıfırla ve rakip seçerken sıralamada yakın olanı al. Submission yıldızı için kamp odağını Yer'e ver."),
    basin: () => ({
      soru: L("Matt Hughton senin idolün. Onunla dövüşmek seni korkutuyor mu?"),
      cevaplar: { mutevazi: L("“Ona büyük saygım var. Ama artık rakibiz.”"), iddiali: L("“İdollerimi yenmek için buradayım.”"), espri: L("“Posteri hâlâ odamda. Maçtan sonra imzalatırım.”") },
      tarihi: 'mutevazi',
    }),
  },
  {
    id: 'sampiyon',
    yil: '2006',
    yer: () => L("Sacramento, ABD"),
    baslik: () => L("Gözlerinin İçine Bak"),
    giris: () => [
      L("Bu kez korku yok. Hughton'ın gözlerinin içine bakıyorsun."),
      L("Kafeste geçirdiğin her yıl bu ana hazırlıktı: karate tekmesi, olimpiyat güreşi, kusursuz kondisyon."),
      L("Gong çalıyor. Kafeste artık sadece iki dövüşçü var ve biri şampiyon olacak."),
    ],
    hedef: () => L("UCC şampiyonu ol"),
    tamam: (s) => ufcBelts(s).length > 0,
    rakip: { ...HUGHTON, siklet: 'welter', sampiyon: true },
    yildizlar: [
      { ad: () => L("Unvan maçını nakavtla kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && ko(f.yontem) },
      { ad: () => L("Matt Hughton'ı yen"), kontrol: (s) => beatCount(s, 'Hughton') >= 1 },
    ],
    not: () => L("Hughton güreşçi: onu yere götürmeye çalışma, ayakta mesafeden vur. Oyun planında tekme ve karşı vuruşu seç; ikinci rauntta yorulduğu an kafa tekmesi için en iyi fırsattır."),
    basin: () => ({
      soru: L("Bu kez Hughton'ın gözlerinin içine bakabilecek misin?"),
      cevaplar: { mutevazi: L("“Ona hâlâ saygı duyuyorum. Ama bu gece kemer için buradayım.”"), iddiali: L("“Bu kez gözlerinin içine bakacağım ve kemeri alacağım.”"), espri: L("“Gözlük taktım, her şeyi net görüyorum.”") },
      tarihi: 'iddiali',
    }),
    bitir: (s) => [pay(s, 1_000_000, L("PPV gelir payı")), ...legendSponsor(s, 'reebot', 1.4), L("🍁 Kanada'nın ilk UCC şampiyonu. Montreal sokaklara döküldü.")],
  },
  {
    id: 'rovans',
    yil: '2007',
    yer: () => L("Houston, Montreal"),
    baslik: () => L("Şok ve Rövanş"),
    giris: () => [
      L("Kimsenin beklemediği bir gece. Herkesin kolay dediği bir maçta tek bir yumruk ve kemer gidiyor."),
      L("Spor dünyası tarihin en büyük sürprizlerinden birini konuşuyor. Sen ise bir spor psikoloğuyla çalışmaya başlıyorsun."),
      L("\"Kaybetmek seni tanımlamaz,\" diyor Firas. \"Nasıl geri döndüğün tanımlar.\""),
    ],
    hedef: () => L("Seni yenen bir rakipten rövanşı al ya da kemerini 2 kez savun"),
    tamam: (s, r) => count(r, 'rovans') > 0 || (s.stage === 'ufc' && s.sampiyon && s.savunma >= 2),
    yildizlar: [
      { ad: () => L("Bir rövanşı bitirişle kazan"), kontrol: (s, f) => !!f && f.won && finish(f.yontem) && revengeWin(s) },
      { ad: () => L("Bu bölümde hiç kaybetme"), kontrol: (s, _f, r) => s.rekor.m <= count(r, 'm0'), sonda: true },
    ],
    basla: (s, r) => {
      bump(r, 'm0', s.rekor.m);
      return [];
    },
    say: (s, f, r) => {
      if (f.won && revengeWin(s)) bump(r, 'rovans');
    },
    not: () => L("Rövanşta aynı hatayı yapma: keşif raporu al ve rakibin seni yendiği silahı oyun planınla kapat. Hiç yenilmediysen kemerini iki kez savunman yeterli."),
    basin: () => ({
      soru: L("O geceden sonra hâlâ aynı dövüşçü müsün?"),
      cevaplar: { mutevazi: L("“O gece ders aldım. Artık daha iyi bir dövüşçüyüm.”"), iddiali: L("“O gece bir kazaydı. Kemer bana geri dönecek.”"), espri: L("“O geceyi hatırlamıyorum. Gerçekten.”") },
      tarihi: 'mutevazi',
    }),
  },
  {
    id: 'hukumdar',
    yil: '2010',
    yer: () => L("Montreal, Toronto"),
    baslik: () => L("Welter Hükümdarı"),
    giris: () => [
      L("Toronto'da elli beş bin kişi adını haykırıyor. Organizasyonun tarihindeki en büyük seyirci."),
      L("Her maç bir satranç oyunu. Rakiplerin ne yapacaklarını biliyor, ama seni durduramıyorlar."),
      L("Eleştirmenler maçlarının karar ile bittiğini söylüyor. Sen ise sadece kazanmaya devam ediyorsun."),
    ],
    hedef: () => L("Welter sıklette UCC kemerini 2 kez savun"),
    ilerleme: (s) => `${Math.min(2, Math.max(0, ...ufcBelts(s).filter((b) => b.siklet === 'welter').map((b) => b.savunma)))}/2`,
    tamam: (s) => ufcBelts(s).some((b) => b.siklet === 'welter' && b.savunma >= 2),
    ipucu: () => L("Kemer başka sıklette mi? Sıklet düğmesiyle welter'e dön."),
    yildizlar: [
      { ad: () => L("Bir savunmayı kararla kazan"), kontrol: (_s, _f, r) => count(r, 'savKarar') >= 1 },
      { ad: () => L("6 maçlık galibiyet serisi yakala"), kontrol: (s) => s.seri >= 6 },
    ],
    say: (s, f, r) => {
      if (f.won && f.unvan && f.org === 'ufc' && decision(f.yontem) && s.sampiyon) bump(r, 'savKarar');
    },
    not: () => L("Karar yıldızı için oyun planında puan ve kontrolü seç: indir, üstte kal, raundu çal. Seri için her maçtan önce tam dinlen ve kampları uzun tut."),
    basin: () => ({
      soru: L("Eleştirmenler maçlarının hep kararla bittiğini söylüyor. Ne diyorsun?"),
      cevaplar: { mutevazi: L("“Kazanmak için en akıllı yolu seçiyorum. Önemli olan kazanmak.”"), iddiali: L("“Bu kez bitireceğim. Söz veriyorum.”"), espri: L("“Hakemler de maaş alsın diye.”") },
      tarihi: 'mutevazi',
    }),
    bitir: (s) => [pay(s, 4_000_000, L("PPV gelir payı")), ...legendSponsor(s, 'rolex', 1.5), L("🍁 Welter sıklette bir neslin hükümdarı. Kemeri boşa çıkarıp bir süre kafesten uzaklaşıyorsun.")],
  },
  {
    id: 'orta',
    yil: '2017',
    yer: () => L("New York, ABD"),
    baslik: () => L("Dört Yıl Sonra"),
    giris: () => [
      L("Dört yıl kafesten uzak kaldın. Herkes geri dönmeyeceğini düşünüyordu."),
      L("Ama sen bir sıklet yukarı, orta sıklete çıkıyorsun. Şampiyon İngiliz Mike Bisby, sözleriyle seni kışkırtıyor."),
      L("Madison Square Garden dolu. Profesör son dersini vermek için geri döndü."),
    ],
    hedef: () => L("UCC orta sıklet şampiyonu ol"),
    ipucu: () => L("Şampiyonken Sıklet düğmesiyle orta sıklete çık: ilk maçın unvan maçı olur."),
    tamam: (s) => ufcBeltIn(s, 'orta'),
    rakip: { ad: 'Mike', soyad: 'Bisby', lakap: 'The Earl', uyruk: () => L("Birleşik Krallık"), stil: 'kickboks', siklet: 'orta', sampiyon: true },
    yildizlar: [
      { ad: () => L("Unvan maçını bitirişle kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && finish(f.yontem) },
      { ad: () => L("Mike Bisby'yi yen"), kontrol: (s) => beatCount(s, 'Bisby') >= 1 },
    ],
    not: () => L("Bisby ayakta tecrübeli ve dayanıklı: oyun planında indirme ve yerde kontrol seç, kamp odağını Yer'e ver. Yorulduğunda boğma için en iyi anı yakalarsın."),
    basin: () => ({
      soru: L("Dört yıl aradan sonra bir sıklet yukarıda. Bisby seni yaşlı buluyor. Cevabın?"),
      cevaplar: { mutevazi: L("“Ona saygı duyuyorum. Cevabımı kafeste vereceğim.”"), iddiali: L("“Dört yıl dinlendim. O ise dört yıl beni bekledi.”"), espri: L("“Yaşlı değilim, olgunlaştım. Şarap gibi.”") },
      tarihi: 'mutevazi',
    }),
    bitir: (s) => [pay(s, 8_000_000, L("PPV gelir payı")), L("🏆 İki sıklette şampiyonluk. Profesör son dersini de verdi.")],
  },
  {
    id: 'onur',
    yil: '2019',
    yer: () => L("Montreal, Kanada"),
    baslik: () => L("Onur Listesi"),
    giris: () => [
      L("Kariyerinin sonuna yaklaşıyorsun. Vücudun yorgun ama mirasın sağlam."),
      L("Montreal'de bir çocuk karate salonunda senin posterine bakıyor, tıpkı senin bir zamanlar Hughton'a baktığın gibi."),
      L("Son bir hedef kaldı: adını tarihe yazdırmak."),
    ],
    hedef: () => L("MMA Onur Listesi'ne (Hall of Fame) gir"),
    ipucu: () => L("Efsane puanını yükselt ve Onur Listesi başarımlarını tamamla: Başarımlar ekranında eksikleri gör."),
    tamam: (s) => !!s.hof,
    yildizlar: [
      { ad: () => L("Kariyerinde en fazla 5 yenilgi"), kontrol: (s) => s.rekor.m <= 5, sonda: true },
      { ad: () => L("Toplam 6 UCC kemer savunmasına ulaş"), kontrol: (s) => (s.kemerler ?? []).filter((b) => b.org === 'ufc').reduce((a, b) => a + b.savunma, 0) >= 6, sonda: true },
    ],
    not: () => L("Onur Listesi için efsane puanı ve Onur Listesi başarımları gerekir: kemer savunmaları ve bitirişler en hızlı puanı verir. Yenilgi sayın puanını düşürür, riskli maçlardan kaçın."),
    basin: () => ({
      soru: L("Emeklilik yakın mı? Mirasın ne olacak?"),
      cevaplar: { mutevazi: L("“Çok çalışmanın her şeyi yenebileceğini göstermek istedim.”"), iddiali: L("“Tüm zamanların en iyisi olarak anılmak istiyorum.”"), espri: L("“Mirasım mı? Çöp kamyonundan Onur Listesi'ne bir yol haritası.”") },
      tarihi: 'mutevazi',
    }),
  },
];
