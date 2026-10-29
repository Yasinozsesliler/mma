// Efsane Yolu: Rhonda Rousseau (ABD). Judo şampiyonu bir annenin kızı, olimpiyat madalyası, kol kilidi kraliçesi,
// kadınların UCC'deki ilk şampiyonu, Hollywood, kafa tekmesiyle gelen yıkım ve kapıları açan miras.
import { L } from '../i18n';
import { beatCount, bump, count, finish, legendSponsor, nonUccBelt, pay, ufcBelts, uccWin, type Chapter } from './legendKit';
import { clamp } from './rng';

const TATE = { ad: 'Mischa', soyad: 'Tate', lakap: 'Sweet Cup', uyruk: () => 'ABD', stil: 'gures' as const };
const HOLMES = { ad: 'Holli', soyad: 'Holmes', lakap: 'Preacher Girl', uyruk: () => 'ABD', stil: 'boks' as const };
const r1Sub = (f: { won: boolean; yontem: string; raunt: number }) => f.won && f.yontem === 'SUB' && f.raunt === 1;

export const KRALICE: Chapter[] = [
  {
    id: 'judo',
    yil: '2008',
    yer: () => L("Riverside, Kaliforniya"),
    baslik: () => L("Judo Kızı"),
    giris: () => [
      L("Annen AnnMarie bir judo dünya şampiyonu. Sen dört yaşından beri tatamidesin; her sabah annenin yatağına kol kilidi atarak uyandırıyorsun."),
      L("Pekin'de olimpiyat bronzu kazandın ama eve döndüğünde parasızsın. Barda garsonluk yapıyor, arabanda uyuyorsun."),
      L("\"Judo bana madalya verdi,\" diyorsun. \"Kafes bana hayatımı verecek.\""),
    ],
    hedef: () => L("Profesyonel ol"),
    ipucu: () => L("Amatör maçlar kazan; teklifler kendiliğinden gelir."),
    tamam: (s) => s.stage !== 'amator',
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Amatörde hiç kaybetme"), kontrol: (s) => s.amator.m === 0, sonda: true },
      { ad: () => L("Amatörde 2 submission galibiyeti al"), kontrol: (s) => s.amator.sub >= 2, sonda: true },
    ],
    not: () => L("Judo temelin seni klinçte ve yerde öldürücü yapıyor: oyun planında klinçten fırlatma ve kol kilidini seç, kamp odağını Yer ve Güreş'e ver."),
    bitir: (s) => {
      s.populerlik = clamp(s.populerlik + 3, 0, 100);
      return [L("🥋 Olimpiyat madalyası çekmecede, eldivenler elinde. Artık profesyonelsin.")];
    },
  },
  {
    id: 'kollar',
    yil: '2011',
    yer: () => L("Los Angeles, ABD"),
    baslik: () => L("Kol Kilidi Kraliçesi"),
    giris: () => [
      L("Rakiplerin ne yapacağını biliyor: seni klinçte yakalayacak, yere fırlatacak ve kolunu alacaksın."),
      L("Bildikleri halde durduramıyorlar. Maçların çoğu ilk dakikada bitiyor."),
      L("Basın sana \"Rowdy\" diyor. Sen ise bir şampiyonluk kemeri istiyorsun."),
    ],
    hedef: () => L("Profesyonelde 5 galibiyet al"),
    ilerleme: (s) => `${Math.min(5, s.rekor.g)}/5`,
    tamam: (s) => s.rekor.g >= 5,
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Bu galibiyetlerin en az 3'ü submission olsun"), kontrol: (s) => s.rekor.sub >= 3, sonda: true },
      { ad: () => L("2 maçı 1. rauntta submission ile bitir"), kontrol: (_s, _f, r) => count(r, 'r1sub') >= 2 },
    ],
    say: (_s, f, r) => {
      if (r1Sub(f)) bump(r, 'r1sub');
    },
    not: () => L("1. raunt submission'ları için oyun planında erken klinç ve fırlatmayı seç; rakibe nefes alacak vakit verme. Güreşi zayıf rakipler en kolay hedef."),
    basin: () => ({
      soru: L("Herkes kol kilidi atacağını biliyor. Neden durduramıyorlar?"),
      cevaplar: { mutevazi: L("“Çok çalışıyorum. Tekniğimi her gün geliştiriyorum.”"), iddiali: L("“Bildikleri halde durduramıyorlar. Çünkü ben daha iyiyim.”"), espri: L("“Kollarını sigortalatsınlar.”") },
      tarihi: 'iddiali',
    }),
  },
  {
    id: 'ilkkemer',
    yil: '2012',
    yer: () => L("Columbus, ABD"),
    baslik: () => L("İlk Kemer"),
    giris: () => [
      L("Şampiyon Mischa Tate seni sevmiyor. Sen de onu. Basın toplantılarında gerginlik had safhada."),
      L("Organizasyon seni bir sıklet aşağıdan doğrudan unvan maçına çıkarıyor. Herkes \"hak etmedi\" diyor."),
      L("\"Hak etmek mi?\" diyorsun. \"Kafeste göstereceğim.\""),
    ],
    hedef: () => L("UCC dışındaki bir organizasyonda şampiyon ol"),
    ipucu: () => L("Bu bölümde UCC seni beklemez: kemer senin biletin."),
    tamam: (s) => nonUccBelt(s),
    atla: (s) => s.stage === 'ufc',
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Kemer maçını submission ile kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.yontem === 'SUB' },
      { ad: () => L("Kemeri 26 yaşına girmeden al"), kontrol: (s) => s.fighter.yas < 26, sonda: true },
    ],
    not: () => L("Kemer maçında keşif raporu al; şampiyon güreşçiyse klinçte kalma, onu ayakta yorduktan sonra fırlat. Submission için Yer odaklı kamp yap."),
    basin: () => ({
      soru: L("Herkes bu unvan maçını hak etmediğini söylüyor. Cevabın?"),
      cevaplar: { mutevazi: L("“Bu şansı aldığım için minnettarım. Hak ettiğimi kafeste göstereceğim.”"), iddiali: L("“Onun kolunu koparacağım. Sonra kim hak ediyormuş, görürüz.”"), espri: L("“Hak etmek mi? Ben kendi kapımı kendim çalarım.”") },
      tarihi: 'iddiali',
    }),
    bitir: (s) => [pay(s, 30_000, L("Unvan maçı primi")), L("👑 Kemer belinde ve kolunu tuttuğun rakip hâlâ bileğini ovuşturuyor.")],
  },
  {
    id: 'ilkkadin',
    yil: '2013',
    yer: () => L("Anaheim, ABD"),
    baslik: () => L("Kadınların İlk Gecesi"),
    giris: () => [
      L("UCC'nin patronu yıllarca \"kadınlar bu kafeste asla dövüşmeyecek\" dedi."),
      L("Sonra seni izledi. Ve fikrini değiştirdi: organizasyonun tarihindeki ilk kadın dövüşçü sensin."),
      L("Kadınların ilk maçı gecenin ana maçı. Bütün dünya izliyor."),
    ],
    hedef: () => L("UCC'ye gir ve ilk maçını kazan"),
    ipucu: () => L("Bir galibiyet daha getir: UCC teklifi doğrudan gelir."),
    tamam: (s) => uccWin(s),
    uccKapi: true,
    yildizlar: [
      { ad: () => L("UCC'deki ilk maçını submission ile kazan"), kontrol: (s, f) => !!f && f.won && f.org === 'ufc' && f.yontem === 'SUB' && s.gecmis.filter((h) => h.org === 'ufc').length === 1 },
      { ad: () => L("Hem de 1. rauntta"), kontrol: (s, f) => !!f && f.org === 'ufc' && r1Sub(f) && s.gecmis.filter((h) => h.org === 'ufc').length === 1 },
    ],
    not: () => L("Tarihî gecede heyecana kapılma: oyun planında klinç ve fırlatma, kamp odağında Yer. İlk dakikalarda kolu yakalarsan maç biter."),
    basin: () => ({
      soru: L("Patron kadınların asla dövüşmeyeceğini söylemişti. Bugün ne hissediyorsun?"),
      cevaplar: { mutevazi: L("“Bu gece benden önce gelen bütün kadınlar için.”"), iddiali: L("“Kapıyı ben açtım. Şimdi herkes içeri giriyor.”"), espri: L("“Patrona bir teşekkür kartı göndereceğim.”") },
      tarihi: 'iddiali',
    }),
    bitir: (s) => [pay(s, 50_000, L("Gecenin Performansı bonusu")), ...legendSponsor(s, 'reebot', 1.4), L("🌟 Tarih yazıldı. Kadınlar artık UCC'de.")],
  },
  {
    id: 'sampiyon',
    yil: '2013',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("Rövanş ve Taç"),
    giris: () => [
      L("Mischa Tate geri döndü ve UCC kemeri onun belinde. Bir reality şovda iki takımın koçu olarak aylarca karşı karşıya kaldınız."),
      L("Tokalaşmayı reddettin. Salon ikiye bölündü."),
      L("Şimdi kafeste ikinci kez karşılaşıyorsunuz ve bu sefer kemer UCC'nin."),
    ],
    hedef: () => L("UCC şampiyonu ol"),
    tamam: (s) => ufcBelts(s).length > 0,
    rakip: { ...TATE, siklet: 'horoz', sampiyon: true },
    yildizlar: [
      { ad: () => L("Mischa Tate'i yen"), kontrol: (s) => beatCount(s, 'Tate') >= 1 },
      { ad: () => L("Unvan maçını submission ile kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && f.yontem === 'SUB' },
    ],
    not: () => L("Tate dayanıklı ve inatçı bir güreşçi: ilk raundu kaybetsen de paniğe kapılma. Oyun planında klinç ve yerde kontrolü seç; yorulduğunda kol açılır."),
    basin: () => ({
      soru: L("Tate ile tokalaşmadın. Pişman mısın?"),
      cevaplar: { mutevazi: L("“Duygularım ağır bastı. Kafeste saygımı göstereceğim.”"), iddiali: L("“Saygıyı hak edene veririm. O hak etmedi.”"), espri: L("“Elimi yıkamıştım, kirlenmesin istedim.”") },
      tarihi: 'iddiali',
    }),
    bitir: (s) => [pay(s, 500_000, L("PPV gelir payı")), L("👑 UCC'nin ilk kadın şampiyonu sensin.")],
  },
  {
    id: 'hukumdar',
    yil: '2014',
    yer: () => L("Las Vegas, Rio de Janeiro"),
    baslik: () => L("On Dört Saniye"),
    giris: () => [
      L("Rakiplerin kafese girerken titriyor. Bir maçın on dört saniye sürdü, bir başkası otuz dört."),
      L("Kadın dövüşçüler artık ana maçlarda, PPV rekorları kırılıyor."),
      L("Sen ise bir soru soruyorsun: \"Sırada kim var?\""),
    ],
    hedef: () => L("UCC kemerini 2 kez savun"),
    ilerleme: (s) => `${Math.min(2, Math.max(0, ...ufcBelts(s).map((b) => b.savunma)))}/2`,
    tamam: (s) => ufcBelts(s).some((b) => b.savunma >= 2),
    yildizlar: [
      { ad: () => L("Bir savunmayı 1. rauntta kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && finish(f.yontem) && f.raunt === 1 },
      { ad: () => L("Bu bölümde 2 savunmayı bitirişle kazan"), kontrol: (_s, _f, r) => count(r, 'savBitir') >= 2 },
    ],
    say: (s, f, r) => {
      if (f.won && f.unvan && f.org === 'ufc' && finish(f.yontem) && s.sampiyon) bump(r, 'savBitir');
    },
    not: () => L("Erken bitiriş için her savunmadan önce yorgunluğunu sıfırla ve keşif raporu al. Oyun planında erken baskıyı seç: rakip ısınmadan yakala."),
    basin: () => ({
      soru: L("Maçların saniyeler sürüyor. Seyirciler biletlerini boşa mı alıyor?"),
      cevaplar: { mutevazi: L("“Elimden geleni yapıyorum. Rakiplerime saygım var.”"), iddiali: L("“Gelin, izleyin. Gözünüzü kırparsanız kaçırırsınız.”"), espri: L("“Erken biterse otoparktan önce siz çıkarsınız.”") },
      tarihi: 'iddiali',
    }),
    bitir: (s) => [pay(s, 2_000_000, L("PPV gelir payı")), ...legendSponsor(s, 'monster', 1.5)],
  },
  {
    id: 'hollywood',
    yil: '2015',
    yer: () => L("Hollywood, ABD"),
    baslik: () => L("Hollywood"),
    giris: () => [
      L("Film stüdyoları kapında. Aksiyon filmlerinde rol, talk show'lar, dergi kapakları."),
      L("Dünyanın en çok konuşulan sporcusu sensin. Bir anket seni \"dünyanın en tehlikeli kadını\" seçiyor."),
      L("Ama hocan endişeli: \"Kamera ışıkları kafesin ışığından daha parlak olmasın.\""),
    ],
    hedef: () => L("Bir medya projesinde yer al (film, dizi, talk show, dergi kapağı)"),
    ipucu: () => L("Medya teklifleri dövüş aralarında gelir; kabul et. Popülerliğin yükseldikçe film ve dizi teklifleri de açılır."),
    tamam: (s) => (s.medya ?? []).some((m) => m.tur !== 'belgesel' && m.tur !== 'reklam'),
    yildizlar: [
      { ad: () => L("Popülerliğin 85'i geçsin"), kontrol: (s) => s.populerlik >= 85 },
      { ad: () => L("Bu bölümde kemerini kaybetme"), kontrol: (s) => s.sampiyon, sonda: true },
    ],
    basla: (s) => {
      s.medyaSon = -99;
      return [];
    },
    not: () => L("Film teklifleri yüksek popülerlik ister: kazanmaya devam et ve medya tekliflerini kabul et. Ama dikkat: dizi çekimi kampı etkiler, savunmadan önce dinlen."),
    basin: () => ({
      soru: L("Hollywood seni kafesten uzaklaştırıyor mu?"),
      cevaplar: { mutevazi: L("“Önceliğim hâlâ kafes. Film sadece bir bonus.”"), iddiali: L("“Ben hem kafesin hem perdenin kraliçesiyim.”"), espri: L("“Dublör istemedim. Dövüş sahnelerini ben yaptım, dublör hastanede.”") },
      tarihi: 'iddiali',
    }),
    bitir: (s) => [pay(s, 3_000_000, L("Film ve reklam anlaşmaları"))],
  },
  {
    id: 'tekme',
    yil: '2015',
    yer: () => L("Melbourne, Avustralya"),
    baslik: () => L("Kafa Tekmesi"),
    giris: () => [
      L("Seksen bin kişilik bir stadyum. Karşında eski bir boks şampiyonu: Holli Holmes."),
      L("Herkes kolay bir gece bekliyor. Bahisler on üç bire bir."),
      L("Ama Holmes'un sol tekmesi hiç kimsenin hesaba katmadığı bir silah."),
    ],
    hedef: () => L("Holli Holmes ile karşılaş"),
    ipucu: () => L("Holmes sıralamanın başında: sıradaki unvan maçının rakibi o olabilir. Dört maçta karşılaşmazsan bölüm yine geçer."),
    tamam: (s, r) => s.gecmis.some((h) => h.rakip.includes('Holmes')) || count(r, 'mac') >= 4,
    rakip: { ...HOLMES, siklet: 'horoz' },
    yildizlar: [
      { ad: () => L("Holli Holmes'u yen"), kontrol: (s) => beatCount(s, 'Holmes') >= 1 },
      { ad: () => L("Onu ayakta değil, yerde yen (submission)"), kontrol: (_s, f) => !!f && f.won && f.yontem === 'SUB' && !!f.rakip?.includes('Holmes') },
    ],
    say: (_s, _f, r) => bump(r, 'mac'),
    not: () => L("Holmes ayakta senden çok daha iyi: onunla boks yapma. Oyun planında hemen klinç ve fırlatma seç, Güreş odaklı kamp yap. Sol tekmesine dikkat: mesafede kalırsan risk büyük."),
    basin: () => ({
      soru: L("Holmes bir boks şampiyonu. Ayakta onunla dövüşecek misin?"),
      cevaplar: { mutevazi: L("“Ona saygım var. Her yerde dövüşmeye hazırım.”"), iddiali: L("“Onu yere indireceğim ve kolunu alacağım. Her zamanki gibi.”"), espri: L("“Ayakta mı? Ben yere yatmayı daha çok seviyorum.”") },
      tarihi: 'iddiali',
    }),
  },
  {
    id: 'miras',
    yil: '2018',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("Kapıları Açan Kadın"),
    giris: () => [
      L("Kafeste ne olursa olsun, açtığın kapı artık kapanmayacak. Binlerce kız çocuğu senin yüzünden spor salonlarına koşuyor."),
      L("Organizasyon, Onur Listesi'ne girecek ilk kadın dövüşçüyü konuşuyor."),
      L("Ve herkes aynı ismi söylüyor."),
    ],
    hedef: () => L("MMA Onur Listesi'ne (Hall of Fame) gir"),
    ipucu: () => L("Efsane puanını yükselt ve Onur Listesi başarımlarını tamamla: Başarımlar ekranında eksikleri gör."),
    tamam: (s) => !!s.hof,
    yildizlar: [
      { ad: () => L("20 milyon takipçiye ulaş"), kontrol: (s) => (s.takipci ?? 0) >= 20_000_000, sonda: true },
      { ad: () => L("Toplam 5 UCC kemer savunmasına ulaş"), kontrol: (s) => (s.kemerler ?? []).filter((b) => b.org === 'ufc').reduce((a, b) => a + b.savunma, 0) >= 5, sonda: true },
    ],
    not: () => L("Onur Listesi için efsane puanı ve Onur Listesi başarımları gerekir: kemer savunmaları ve bitirişler en hızlı puanı verir. Takipçi için medya teklifleri ve paylaşımlar en hızlı yol."),
  },
];
