// Efsane Yolu: Jonah Jonsby (ABD). Güreş minderinden en genç şampiyonluğa, kafes dışındaki fırtınaya, ezeli rakibe ve ağır sıklete.
import { L } from '../i18n';
import { loseBelt } from './legacy';
import { beatCount, bump, count, finish, ko, legendSponsor, pay, ufcBeltIn, ufcBelts, uccWin, type Chapter } from './legendKit';
import { clamp } from './rng';

const CORMACK = { ad: 'Danny', soyad: 'Cormack', lakap: 'Big Daddy', uyruk: () => 'ABD', stil: 'gures' as const };

export const DAHI: Chapter[] = [
  {
    id: 'minder',
    yil: '2007',
    yer: () => L("Rochester, New York"),
    baslik: () => L("Güreş Minderinden"),
    giris: () => [
      L("Rochester'da bir papazın oğlusun. İki ağabeyin de sporcu; evde rekabet hiç bitmiyor."),
      L("Kolejde güreş şampiyonu oldun ama okul bitmeden hayat değişti: kız arkadaşın hamile ve bir işe ihtiyacın var."),
      L("Bir MMA salonunun kapısından giriyorsun. Kollarının uzunluğunu gören hoca gülümsüyor: \"Bu kollarla kimse sana yaklaşamaz.\""),
    ],
    hedef: () => L("Profesyonel ol"),
    ipucu: () => L("Amatör maçlar kazan; teklifler kendiliğinden gelir."),
    tamam: (s) => s.stage !== 'amator',
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Amatörde hiç kaybetme"), kontrol: (s) => s.amator.m === 0, sonda: true },
      { ad: () => L("21 yaşına girmeden profesyonel ol"), kontrol: (s) => s.fighter.yas < 21, sonda: true },
    ],
    not: () => L("Güreşin en güçlü silahın: oyun planında indirme ve kontrolü seç. 21 yaş yıldızı için amatörde fazla oyalanma, ilk profesyonel teklifi kabul et."),
    bitir: (s) => {
      s.populerlik = clamp(s.populerlik + 3, 0, 100);
      return [L("🍼 Bebeğin yolda, ilk profesyonel kontratın cebinde. Artık geri dönüş yok.")];
    },
  },
  {
    id: 'yukselis',
    yil: '2008',
    yer: () => L("New York, ABD"),
    baslik: () => L("Üç Ayda Altı Galibiyet"),
    giris: () => [
      L("Profesyonel kafeste kimse senin gibisini görmedi. Dönen dirsekler, uçan dizler, akla gelmeyen açılardan vuruşlar."),
      L("Maçları o kadar hızlı bitiriyorsun ki menajerin takvimi yetiştiremiyor."),
      L("Salonda herkes aynı şeyi konuşuyor: \"Bu çocuk bir dahi.\""),
    ],
    hedef: () => L("Profesyonelde 6 galibiyet al"),
    ilerleme: (s) => `${Math.min(6, s.rekor.g)}/6`,
    tamam: (s) => s.rekor.g >= 6,
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Bu galibiyetlerin en az 4'ü bitiriş olsun"), kontrol: (s) => s.rekor.ko + s.rekor.sub >= 4, sonda: true },
      { ad: () => L("En fazla 1 yenilgiyle 6 galibiyete ulaş"), kontrol: (s) => s.rekor.m <= 1, sonda: true },
    ],
    not: () => L("Bitiriş yıldızı için kamp odağını Vuruş ve Yer'e böl; indirip yerde bitirmek en güvenli yol. Yenilmemek için rakip seçerken en sert olanı değil, en dengeli olanı al."),
    basin: () => ({
      soru: L("Bu kadar hızlı yükselmek seni korkutmuyor mu?"),
      cevaplar: { mutevazi: L("“Her gün öğreniyorum. Daha yolun başındayım.”"), iddiali: L("“Ben bu sporun geleceğiyim. Bunu herkes yakında görecek.”"), espri: L("“Korkutan tek şey bebek bezlerinin fiyatı.”") },
      tarihi: 'iddiali',
    }),
  },
  {
    id: 'yedek',
    yil: '2008',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("Son Dakika Yedeği"),
    giris: () => [
      L("Telefon çalıyor: UCC'de bir dövüşçü sakatlandı ve iki hafta sonraki maç için yedek arıyorlar."),
      L("Kampın yok, hazırlığın yok. Ama bu kapı bir daha açılmayabilir."),
      L("\"Geliyorum,\" diyorsun. Uçakta rakibinin videolarını izliyorsun."),
    ],
    hedef: () => L("UCC'ye gir ve ilk maçını kazan"),
    ipucu: () => L("Bir galibiyet daha getir: UCC teklifi doğrudan gelir."),
    tamam: (s) => uccWin(s),
    uccKapi: true,
    yildizlar: [
      { ad: () => L("UCC'deki ilk galibiyetini 25 yaşına girmeden al"), kontrol: (s) => s.fighter.yas < 25, sonda: true },
      { ad: () => L("UCC'deki ilk maçını bitirişle kazan"), kontrol: (s, f) => !!f && f.won && f.org === 'ufc' && finish(f.yontem) && s.gecmis.filter((h) => h.org === 'ufc').length === 1 },
    ],
    not: () => L("Kısa haber maçında yorgunluk en büyük düşman: teklif gelmeden önce tam dinlen. Çıkış maçında riske girme, güreşle kontrol et ve kazan."),
    basin: () => ({
      soru: L("İki hafta önce haber aldın. Hazır mısın?"),
      cevaplar: { mutevazi: L("“Hazırlık kısa ama fırsat büyük. Elimden geleni yapacağım.”"), iddiali: L("“Ben her zaman hazırım. İki hafta bile fazla.”"), espri: L("“Valizi açmaya vaktim olmadı, maçı da uzatmam.”") },
      tarihi: 'iddiali',
    }),
    bitir: (s) => [pay(s, 20_000, L("Galibiyet primi")), L("🦴 Dönen dirseklerin bütün salonu ayağa kaldırdı. Spikerler adını hecelemeyi öğrendi.")],
  },
  {
    id: 'yildiz',
    yil: '2009',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("Yükselen Yıldız"),
    giris: () => [
      L("Rakiplerini öyle kolay geçiyorsun ki maçlar birer gösteriye dönüşüyor."),
      L("Bir gece fazla ileri gidiyorsun: hakemin uyarısına rağmen yasak dirsekler. Kariyerinin tek lekesi o gece yazılıyor ve kimse onu gerçek bir yenilgi saymıyor."),
      L("Hocan Greg Jacks seni kenara çekiyor: \"Yeteneğin sınırsız. Disiplinin de öyle olmalı.\""),
    ],
    hedef: () => L("UCC'de ilk 10'a gir"),
    ilerleme: (s) => (s.stage === 'ufc' && s.rank ? `#${s.rank}` : null),
    tamam: (s) => s.stage === 'ufc' && (s.sampiyon || (s.rank != null && s.rank <= 10)),
    yildizlar: [
      { ad: () => L("UCC'de 3 maçlık galibiyet serisi yakala"), kontrol: (s) => s.stage === 'ufc' && s.seri >= 3 },
      { ad: () => L("Bir UCC maçını yerde vuruşlarla (TKO) bitir"), kontrol: (_s, f) => !!f && f.won && f.org === 'ufc' && f.yontem === 'TKO' },
    ],
    not: () => L("TKO yıldızı için oyun planında 'indir ve vur'u seç: üstte kalıp yumruk yağdırmak hakemin maçı durdurmasını sağlar. Seri için her maçtan önce yorgunluğunu sıfırla."),
    basin: () => ({
      soru: L("O yasak dirsekler kariyerine leke sürmedi mi?"),
      cevaplar: { mutevazi: L("“Hata yaptım. Ondan ders aldım, kurallara saygı duyuyorum.”"), iddiali: L("“O maçı herkes izledi. Kim kazandı, herkes biliyor.”"), espri: L("“Dirseklerim biraz heyecanlıydı. Onları da eğitiyorum.”") },
      tarihi: 'mutevazi',
    }),
  },
  {
    id: 'genc',
    yil: '2011',
    yer: () => L("Newark, ABD"),
    baslik: () => L("En Genç Şampiyon"),
    giris: () => [
      L("Unvan maçının sabahı hocalarınla parkta yürürken bir kadının çığlığını duyuyorsun. Bir hırsız çantasını kapıp kaçıyor."),
      L("Peşinden koşuyorsun, onu yere yatırıyor ve polise teslim ediyorsun. Akşam kafese çıkarken bütün salon hikâyeyi konuşuyor."),
      L("Karşında bir efsane var. Sen ise yirmi üç yaşındasın ve korkunun ne olduğunu bilmiyorsun."),
    ],
    hedef: () => L("UCC şampiyonu ol"),
    tamam: (s) => ufcBelts(s).length > 0,
    yildizlar: [
      { ad: () => L("Unvan maçını TKO ile kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && ko(f.yontem) },
      { ad: () => L("28 yaşına girmeden şampiyon ol"), kontrol: (s) => s.fighter.yas < 28, sonda: true },
    ],
    not: () => L("Şampiyon tecrübeli ama yaşlı: oyun planında yüksek tempo seç ve Kondisyon odaklı kamp yap; maç uzadıkça o yavaşlar, sen hızlanırsın. Erken şampiyonluk için kampları kısa tut."),
    basin: () => ({
      soru: L("Bu sabah bir hırsız yakaladığın doğru mu?"),
      cevaplar: { mutevazi: L("“Doğru olanı yaptım. Herkes yapardı.”"), iddiali: L("“Bu sabah bir hırsız yakaladım. Bu akşam bir kemer yakalayacağım.”"), espri: L("“Isınma turuydu. Asıl koşu bu akşam.”") },
      tarihi: 'iddiali',
    }),
    bitir: (s) => [pay(s, 500_000, L("PPV gelir payı")), ...legendSponsor(s, 'reebot', 1.4), L("👑 Organizasyonun tarihindeki en genç şampiyon sensin. Bir dahinin hükümdarlığı başlıyor.")],
  },
  {
    id: 'hanedan',
    yil: '2012',
    yer: () => L("Atlanta, Toronto, Las Vegas"),
    baslik: () => L("Efsaneleri Temizlemek"),
    giris: () => [
      L("Kemeri aldın, şimdi sıra koruma zamanı. Karşına teker teker eski şampiyonlar çıkıyor."),
      L("Her biri bir efsane, her biri seni deviren kişi olmak istiyor."),
      L("Sen ise her maçta yeni bir silah gösteriyorsun: ters dirsek, boğaz kilidi, kol kilidi."),
    ],
    hedef: () => L("UCC kemerini 2 kez savun"),
    ilerleme: (s) => `${Math.min(2, Math.max(0, ...ufcBelts(s).map((b) => b.savunma)))}/2`,
    tamam: (s) => ufcBelts(s).some((b) => b.savunma >= 2),
    yildizlar: [
      { ad: () => L("Bir savunmayı submission ile kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && f.yontem === 'SUB' },
      { ad: () => L("Bu bölümde 2 savunmayı bitirişle kazan"), kontrol: (_s, _f, r) => count(r, 'savBitir') >= 2 },
    ],
    say: (s, f, r) => {
      if (f.won && f.unvan && f.org === 'ufc' && finish(f.yontem) && s.sampiyon) bump(r, 'savBitir');
    },
    not: () => L("Submission yıldızı için kamp odağını Yer'e ver ve oyun planında yerde kontrolü seç. Bitirişler için her rakibe keşif raporu al: eski şampiyonların zayıf yanı çoğu zaman kondisyondur."),
    basin: () => ({
      soru: L("Karşına çıkan herkes bir eski şampiyon. Hangisi en zoruydu?"),
      cevaplar: { mutevazi: L("“Hepsi büyük dövüşçü. Hepsinden bir şey öğrendim.”"), iddiali: L("“Hiçbiri. Sırada kim varsa onu da temizleyeceğim.”"), espri: L("“En zoru maç sonrası fotoğraf çekimi. Çok uzun sürüyor.”") },
      tarihi: 'iddiali',
    }),
    bitir: (s) => [pay(s, 3_000_000, L("PPV gelir payı")), ...legendSponsor(s, 'cola', 1.5), L("🦴 Bir neslin bütün efsanelerini geçtin. Artık herkes seni tüm zamanların en iyisi olarak anıyor.")],
  },
  {
    id: 'firtina',
    yil: '2015',
    yer: () => L("Albuquerque, ABD"),
    baslik: () => L("Kendi En Büyük Rakibi"),
    giris: () => [
      L("Kafeste kimse seni yenemiyor. Ama kafes dışında kendi kendinin en büyük düşmanısın."),
      L("Bir gece yaptığın bir hata her şeyi değiştiriyor. Organizasyon kemerini elinden alıyor ve sana uzaklaştırma cezası veriyor."),
      L("Kemerin şimdi bir başkasının belinde: Danny Cormack. Seni hiç yenemeyen adam şampiyon olarak anılıyor."),
    ],
    hedef: () => L("Kemerini geri al"),
    ipucu: () => L("Ceza bitince kafese dön. Sıralamanın başındasın: unvan maçı yakın."),
    tamam: (s) => s.stage === 'ufc' && ufcBelts(s).length > 0 && !s.efsane?.bayrak?.sonra,
    rakip: { ...CORMACK, siklet: 'yariagir', sampiyon: true },
    yildizlar: [
      { ad: () => L("Kemeri bitirişle geri al"), kontrol: (s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && finish(f.yontem) && ufcBelts(s).length > 0 },
      { ad: () => L("Dönüşte hiç kaybetmeden kemere ulaş"), kontrol: (s, _f, r) => s.rekor.m <= count(r, 'm0'), sonda: true },
    ],
    sonra: (s, r) => {
      bump(r, 'm0', s.rekor.m);
      ufcBelts(s).forEach((b) => loseBelt(s, 'ufc', b.siklet));
      s.sampiyon = false;
      s.savunma = 0;
      s.rank = 1;
      s.bolum = null;
      s.ceza = { bitis: s.hafta + 26, sebep: L("Kafes dışı skandal") };
      s.populerlik = clamp(s.populerlik - 8, 0, 100);
      return [L("🚨 SKANDAL: Kemerin elinden alındı ve 6 ay uzaklaştırma cezası aldın. Popülerlik -8.")];
    },
    not: () => L("Ceza bitince paslanmış olacaksın: ilk maçtan önce Kondisyon odaklı uzun bir kamp yap. Cormack güçlü bir güreşçi; onu yerde değil, ayakta uzun kollarınla vur."),
    basin: () => ({
      soru: L("Kafes dışındaki sorunların bitti mi?"),
      cevaplar: { mutevazi: L("“Hata yaptım ve bedelini ödedim. Artık daha iyi bir insanım.”"), iddiali: L("“Kemer benim. Cormack sadece onu benim için ısıtıyor.”"), espri: L("“Tek sorunum Cormack'ın kemerimi çok sevmesi.”") },
      tarihi: 'iddiali',
    }),
    bitir: (s) => [pay(s, 2_000_000, L("PPV gelir payı")), L("🏆 Kemer yeniden belinde. \"Kimse benden almadı,\" diyorsun. \"Sadece ödünç verdim.\"")],
  },
  {
    id: 'ezeli',
    yil: '2017',
    yer: () => L("Anaheim, ABD"),
    baslik: () => L("Ezeli Rakip"),
    giris: () => [
      L("Cormack pes etmiyor. Basın toplantılarında masalar devriliyor, sosyal medyada savaş hiç bitmiyor."),
      L("\"Beni bir kez yendin,\" diyor. \"Bir daha olmayacak.\""),
      L("Sen ise rekabeti bir kez ve sonsuza dek bitirmek istiyorsun."),
    ],
    hedef: () => L("Kemerini savun"),
    tamam: (s) => s.stage === 'ufc' && s.sampiyon && s.savunma >= 1,
    rakip: { ...CORMACK, siklet: 'yariagir' },
    yildizlar: [
      { ad: () => L("Danny Cormack'ı ikinci kez yen"), kontrol: (s) => beatCount(s, 'Cormack') >= 2 },
      { ad: () => L("Bir savunmayı nakavtla kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && ko(f.yontem) },
    ],
    not: () => L("Cormack güreşte senden güçlü olabilir: oyun planında mesafeyi seç ve uzun kollarınla dışarıdan vur. Nakavt yıldızı için Vuruş odaklı kamp yap; tekme ile kafaya isabet en büyük şansın."),
    basin: () => ({
      soru: L("Cormack seninle bir kez daha karşılaşmak istiyor. Ne diyorsun?"),
      cevaplar: { mutevazi: L("“Saygı duyduğum bir rakip. Bir kez daha hazırım.”"), iddiali: L("“Beni hiç yenemedi, hiç yenemeyecek. Bu rekabet benim.”"), espri: L("“Onu o kadar çok yendim ki artık aile toplantısı gibi.”") },
      tarihi: 'iddiali',
    }),
    bitir: (s) => [pay(s, 4_000_000, L("PPV gelir payı")), L("🦴 Rekabet bitti. Yarı ağır sıklette senden başka kral yok.")],
  },
  {
    id: 'agir',
    yil: '2023',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("Ağır Sıklet"),
    giris: () => [
      L("Yarı ağır sıklette yenecek kimse kalmadı. Üç yıl boyunca kilo alıyor, yeni bir vücut inşa ediyorsun."),
      L("Ağır sıklet kemeri boşta. Karşında genç, hızlı ve teknik bir Fransız: Cyrille Gannet."),
      L("Herkes \"Bu kadar uzun aradan sonra, bu kilolarda olmaz,\" diyor. Sen ise sadece gülümsüyorsun."),
    ],
    hedef: () => L("UCC ağır sıklet şampiyonu ol"),
    ipucu: () => L("Şampiyonken Sıklet düğmesiyle ağır sıklete çık: ilk maçın unvan maçı olur."),
    tamam: (s) => ufcBeltIn(s, 'agir'),
    rakip: { ad: 'Cyrille', soyad: 'Gannet', lakap: 'Le Gamin', uyruk: () => L("Fransa"), stil: 'kickboks', siklet: 'agir', sampiyon: true },
    yildizlar: [
      { ad: () => L("Unvan maçını bitirişle kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && finish(f.yontem) },
      { ad: () => L("Hem de 1. rauntta"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && finish(f.yontem) && f.raunt === 1 },
    ],
    not: () => L("Gannet ayakta senden hızlı ama yerde savunması zayıf: oyun planında erken indirmeyi seç, kamp odağını Güreş ve Yer'e ver. İlk dakikalarda indirirsen boğaz kilidi yakındır."),
    basin: () => ({
      soru: L("Üç yıl aradan sonra ağır sıklette. Bu kilolarda hâlâ aynı adam mısın?"),
      cevaplar: { mutevazi: L("“Uzun bir yolculuktu. Kafeste göreceğiz.”"), iddiali: L("“Daha büyük, daha güçlü ve hâlâ tüm zamanların en iyisiyim.”"), espri: L("“Kilolarım arttı, egom aynı kaldı.”") },
      tarihi: 'iddiali',
    }),
    bitir: (s) => [pay(s, 10_000_000, L("PPV gelir payı")), L("🏆 İki sıklette şampiyonluk. Tartışma bitti: tüm zamanların en iyisi.")],
  },
];
