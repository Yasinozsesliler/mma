// Efsane Yolu: Andre Silvano (Brezilya). Curitiba'nın yoksul mahallelerinden Japonya ve İngiltere sahnelerine,
// UCC'de rekor bir hükümdarlığa, bir sıklet yukarıdaki gösterilere, ezeli bir rakibe ve kırk yaşında hâlâ kafese.
import { L } from '../i18n';
import { beatCount, bump, count, ko, legendSponsor, nonUccBelt, pay, ufcBelts, uccFights, uccWin, type Chapter } from './legendKit';
import { clamp } from './rng';

export const ORUMCEK: Chapter[] = [
  {
    id: 'favela',
    yil: '1997',
    yer: () => L("Curitiba, Brezilya"),
    baslik: () => L("Mahallenin Çocuğu"),
    giris: () => [
      L("Curitiba'nın yoksul bir mahallesinde, teyzenin yanında büyüdün. Spor salonuna yazılacak paran yoktu."),
      L("Duvarın arkasından ders izleyerek, kung fu filmlerindeki hareketleri tekrar ederek öğrendin."),
      L("Şimdi bir Muay Thai salonunda temizlik yaparak antrenman parası ödüyorsun. Hocan bir gün durup seni izliyor: \"Sen dans ediyorsun. Ama yumruğun gerçek.\""),
    ],
    hedef: () => L("Profesyonel ol"),
    ipucu: () => L("Amatör maçlar kazan; teklifler kendiliğinden gelir."),
    tamam: (s) => s.stage !== 'amator',
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Amatörde hiç kaybetme"), kontrol: (s) => s.amator.m === 0, sonda: true },
      { ad: () => L("Amatörde 2 nakavt galibiyeti al"), kontrol: (s) => s.amator.ko >= 2, sonda: true },
    ],
    not: () => L("Silahın hassasiyet ve zamanlama: oyun planında karşı vuruşu seç, kamp odağını Vuruş ve Hız'a ver. Güreşi ihmal etme; yere inersen zorlanırsın."),
    bitir: (s) => {
      s.populerlik = clamp(s.populerlik + 2, 0, 100);
      return [L("🕷️ Salonun temizlik bezini bıraktın. Artık profesyonel bir dövüşçüsün.")];
    },
  },
  {
    id: 'japonya',
    yil: '2002',
    yer: () => L("Tokyo, Japonya"),
    baslik: () => L("Doğunun Sahneleri"),
    giris: () => [
      L("Japonya'nın dev arenalarında yabancı bir isimsin. Seyirci sessizce izliyor, her hareketi alkışlıyor."),
      L("Uçan dizlerin, dönen tekmelerin Tokyo'da konuşuluyor."),
      L("Ama bir gece yerde yakalanıyorsun. Bir yenilgi, bir ders."),
    ],
    hedef: () => L("Profesyonelde 8 galibiyet al"),
    ilerleme: (s) => `${Math.min(8, s.rekor.g)}/8`,
    tamam: (s) => s.rekor.g >= 8,
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Bu galibiyetlerin en az 4'ü nakavt olsun"), kontrol: (s) => s.rekor.ko >= 4, sonda: true },
      { ad: () => L("Bir maçı 1. rauntta nakavtla bitir"), kontrol: (_s, f) => !!f && f.won && ko(f.yontem) && f.raunt === 1 },
    ],
    not: () => L("Nakavt yıldızları için kamp odağını Vuruş'a ver ve oyun planında karşı vuruşu seç. Güreşçilere karşı mesafeyi koru; yerde yakalanma."),
    basin: () => ({
      soru: L("Japon seyirci seni çok seviyor. Burada kalacak mısın?"),
      cevaplar: { mutevazi: L("“Japonya bana çok şey öğretti. Her maçta saygımı göstereceğim.”"), iddiali: L("“Burası sadece bir durak. Hedefim dünyanın en iyisi olmak.”"), espri: L("“Suşi bitene kadar buradayım.”") },
      tarihi: 'mutevazi',
    }),
  },
  {
    id: 'londra',
    yil: '2005',
    yer: () => L("Londra, İngiltere"),
    baslik: () => L("Kafes Öfkesi"),
    giris: () => [
      L("Londra'nın en sert kafes organizasyonunda kemer için sıradasın."),
      L("Rakiplerin seni duvara sıkıştırmaya çalışıyor; sen kollarını indirip onları davet ediyorsun."),
      L("İngiliz basını ilk kez o kelimeyi kullanıyor: \"Matrix.\""),
    ],
    hedef: () => L("UCC dışındaki bir organizasyonda şampiyon ol"),
    ipucu: () => L("Bu bölümde UCC seni beklemez: kemer senin biletin."),
    tamam: (s) => nonUccBelt(s),
    atla: (s) => s.stage === 'ufc',
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Kemer maçını nakavtla kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && ko(f.yontem) },
      { ad: () => L("Kemeri 31 yaşına girmeden al"), kontrol: (s) => s.fighter.yas < 31, sonda: true },
    ],
    not: () => L("Kemer maçında keşif raporu al ve rakibin vuruş savunmasına bak. Oyun planında karşı vuruşu seç; rakip öne atıldıkça açık verir."),
    basin: () => ({
      soru: L("Kollarını indirip rakibi davet ediyorsun. Bu kibir değil mi?"),
      cevaplar: { mutevazi: L("“Kibir değil, güven. Ama rakibime saygım var.”"), iddiali: L("“Beni vuramıyorlarsa kollarıma neden ihtiyacım olsun?”"), espri: L("“Kollarım yoruluyor, biraz dinlendiriyorum.”") },
      tarihi: 'iddiali',
    }),
  },
  {
    id: 'ucc',
    yil: '2006',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("Kırk Dokuz Saniye"),
    giris: () => [
      L("UCC seni nihayet çağırıyor. İlk rakibin, kimsenin yıkamadığı bir sert çene."),
      L("Basın soruyor: \"Bu Brezilyalı kim?\""),
      L("Kafeste kırk dokuz saniye geçiyor ve herkes cevabı öğreniyor."),
    ],
    hedef: () => L("UCC'ye gir ve ilk maçını kazan"),
    ipucu: () => L("Bir galibiyet daha getir: UCC teklifi doğrudan gelir."),
    tamam: (s) => uccWin(s),
    uccKapi: true,
    yildizlar: [
      { ad: () => L("UCC'deki ilk maçını nakavtla kazan"), kontrol: (s, f) => !!f && f.won && f.org === 'ufc' && ko(f.yontem) && uccFights(s) === 1 },
      { ad: () => L("Hem de 1. rauntta"), kontrol: (s, f) => !!f && f.won && f.org === 'ufc' && ko(f.yontem) && f.raunt === 1 && uccFights(s) === 1 },
    ],
    not: () => L("Çıkış maçında erken baskı yapma, karşı vuruş bekle: rakip saldırdıkça açık verir. Vuruş ve Hız odaklı kamp yap."),
    basin: () => ({
      soru: L("UCC'de kimse seni tanımıyor. Kendini nasıl tanıtırsın?"),
      cevaplar: { mutevazi: L("“Ben sadece işini yapmaya gelen bir dövüşçüyüm.”"), iddiali: L("“Cumartesi gecesinden sonra herkes beni tanıyacak.”"), espri: L("“Adım zor değil: Silvano. Bir de örümcek gibi düşünün.”") },
      tarihi: 'mutevazi',
    }),
    bitir: (s) => [pay(s, 40_000, L("Gecenin Nakavtı bonusu")), L("🕷️ Kırk dokuz saniye. Bütün salon ayakta.")],
  },
  {
    id: 'kemer',
    yil: '2006',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("Örümceğin Ağı"),
    giris: () => [
      L("Orta sıklet şampiyonu Rich Franks, organizasyonun yüzü. Çok sevilen, çok saygı duyulan bir dövüşçü."),
      L("Sen ise onu klinçte yakalayıp dizlerinle yıkmayı planlıyorsun."),
      L("Hocan son kez fısıldıyor: \"Acele etme. O sana gelecek.\""),
    ],
    hedef: () => L("UCC şampiyonu ol"),
    tamam: (s) => ufcBelts(s).length > 0,
    rakip: { ad: 'Rich', soyad: 'Franks', lakap: 'Ace', uyruk: () => 'ABD', stil: 'kickboks', siklet: 'orta', sampiyon: true },
    yildizlar: [
      { ad: () => L("Unvan maçını nakavtla kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && ko(f.yontem) },
      { ad: () => L("Hem de 1. rauntta"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && ko(f.yontem) && f.raunt === 1 },
    ],
    not: () => L("Franks ayakta iyi ama klinçte savunması zayıf: oyun planında klinç ve diz seç, kamp odağını Vuruş'a ver. İlk rauntta klinçi yakalarsan maç erken biter."),
    basin: () => ({
      soru: L("Franks herkesin sevdiği bir şampiyon. Onu yenmek seni kötü adam yapar mı?"),
      cevaplar: { mutevazi: L("“O büyük bir şampiyon. Ben sadece en iyisi olmak istiyorum.”"), iddiali: L("“Cumartesi gecesi yeni bir şampiyon olacak. Kötü adam ya da değil.”"), espri: L("“Ben kötü adam değilim, sadece ağımı örüyorum.”") },
      tarihi: 'mutevazi',
    }),
    bitir: (s) => [pay(s, 600_000, L("PPV gelir payı")), ...legendSponsor(s, 'monster', 1.4), L("🕷️ Orta sıklette yeni bir çağ başlıyor.")],
  },
  {
    id: 'saltanat',
    yil: '2008',
    yer: () => L("Las Vegas, Rio de Janeiro"),
    baslik: () => L("Rekor Saltanat"),
    giris: () => [
      L("Rakiplerin geliyor ve gidiyor. Kimse sana dokunamıyor."),
      L("Bazı geceler kollarını indiriyor, rakibini alay ederek davet ediyorsun. Eleştiriler de geliyor, alkışlar da."),
      L("Spor yazarları tartışıyor: tüm zamanların en iyisi mi?"),
    ],
    hedef: () => L("UCC kemerini 2 kez savun"),
    ilerleme: (s) => `${Math.min(2, Math.max(0, ...ufcBelts(s).map((b) => b.savunma)))}/2`,
    tamam: (s) => ufcBelts(s).some((b) => b.savunma >= 2),
    yildizlar: [
      { ad: () => L("Bu bölümde 2 savunmayı nakavtla kazan"), kontrol: (_s, _f, r) => count(r, 'savKo') >= 2 },
      { ad: () => L("7 maçlık galibiyet serisi yakala"), kontrol: (s) => s.seri >= 7 },
    ],
    say: (s, f, r) => {
      if (f.won && f.unvan && f.org === 'ufc' && ko(f.yontem) && s.sampiyon) bump(r, 'savKo');
    },
    not: () => L("Nakavt savunmaları için her rakibe keşif raporu al ve karşı vuruşu seç. Seri için yorgunken asla dövüşme."),
    basin: () => ({
      soru: L("Kollarını indirip rakibine alay ediyorsun. Bu saygısızlık değil mi?"),
      cevaplar: { mutevazi: L("“Rakibime saygım var. Bu sadece benim tarzım.”"), iddiali: L("“Kafes benim sahnem. Ben de gösteri yapıyorum.”"), espri: L("“Kollarım ağır, arada bir indiriyorum.”") },
      tarihi: 'iddiali',
    }),
    bitir: (s) => [pay(s, 3_000_000, L("PPV gelir payı"))],
  },
  {
    id: 'yukari',
    yil: '2009',
    yer: () => L("Philadelphia, ABD"),
    baslik: () => L("Bir Sıklet Yukarı"),
    giris: () => [
      L("Orta sıklette rakip kalmadı. Bir sıklet yukarıda, yarı ağırda gösteri maçları teklif ediliyor."),
      L("Eski bir yarı ağır şampiyonunun karşısındasın. Herkes iri rakibin seni ezeceğini düşünüyor."),
      L("Sen ise geri geri giderek, kollarını sallayarak, gülümseyerek kafese çıkıyorsun."),
    ],
    hedef: () => L("Yarı ağır sıklette bir UCC maçı kazan"),
    ipucu: () => L("Sıklet düğmesiyle yarı ağıra çık. Orta sıklet kemerin aktif kalır; sonra geri dönebilirsin."),
    tamam: (s, r) => count(r, 'yariG') > 0,
    yildizlar: [
      { ad: () => L("Yarı ağırdaki galibiyeti nakavtla al"), kontrol: (s, f) => !!f && f.won && f.org === 'ufc' && ko(f.yontem) && s.fighter.siklet === 'yariagir' },
      { ad: () => L("Hem de 1. rauntta"), kontrol: (s, f) => !!f && f.won && f.org === 'ufc' && ko(f.yontem) && f.raunt === 1 && s.fighter.siklet === 'yariagir' },
    ],
    say: (s, f, r) => {
      if (f.won && f.org === 'ufc' && s.fighter.siklet === 'yariagir') bump(r, 'yariG');
    },
    not: () => L("Yarı ağırda rakipler senden iri ama yavaş: oyun planında mesafe ve karşı vuruşu seç, Hız odaklı kamp yap. Klinçe girme, ağırlığın dezavantaj."),
    basin: () => ({
      soru: L("Bir sıklet yukarıda, senden iri biriyle. Korkmuyor musun?"),
      cevaplar: { mutevazi: L("“Ona saygım var. Ama kafeste beden değil, akıl kazanır.”"), iddiali: L("“Büyük olanlar daha sert düşer.”"), espri: L("“Ben küçük değilim, o büyük.”") },
      tarihi: 'iddiali',
    }),
  },
  {
    id: 'rovans',
    yil: '2012',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("Ezeli Rakip"),
    giris: () => [
      L("Amerikalı güreşçi Chad Sorensen dört raunt boyunca seni yerde ezdi. Beşinci rauntta bir üçgen boğma ile kurtuldun."),
      L("O günden beri seni, ülkeni ve aileni aşağılıyor. Rövanş istiyor."),
      L("Bu kez kimse yerde ezilmeyecek."),
    ],
    hedef: () => L("Chad Sorensen ile hesaplaş"),
    ipucu: () => L("Orta sıklete dön: Sorensen sıralamanın başında. Dört maçta karşılaşmazsan bölüm yine geçer."),
    tamam: (s, r) => s.stage === 'ufc' && (s.gecmis.some((h) => h.rakip.includes('Sorensen')) || count(r, 'mac') >= 4),
    rakip: { ad: 'Chad', soyad: 'Sorensen', lakap: 'The American Gangster', uyruk: () => 'ABD', stil: 'gures', siklet: 'orta' },
    yildizlar: [
      { ad: () => L("Chad Sorensen'i yen"), kontrol: (s) => beatCount(s, 'Sorensen') >= 1 },
      { ad: () => L("Onu nakavtla yen"), kontrol: (_s, f) => !!f && f.won && ko(f.yontem) && !!f.rakip?.includes('Sorensen') },
    ],
    say: (_s, _f, r) => bump(r, 'mac'),
    not: () => L("Sorensen'in tek silahı güreş: Güreş odaklı kamp yap ve oyun planında indirme savunmasıyla mesafeyi seç. Duvara yaslanma; ilk indirmeyi savunursan diz ve yumruk için açık verir."),
    basin: () => ({
      soru: L("Sorensen ülkeni ve aileni aşağıladı. Ne diyorsun?"),
      cevaplar: { mutevazi: L("“Konuşmalara cevap vermiyorum. Cevabımı kafeste vereceğim.”"), iddiali: L("“Bu kez onu kafesten sedyeyle çıkaracağım.”"), espri: L("“Çok konuşuyor. Belki bir gün bir kitap yazar.”") },
      tarihi: 'mutevazi',
    }),
    bitir: (s) => [pay(s, 4_000_000, L("PPV gelir payı")), L("🕷️ Rekabet bitti. Saygı geri döndü.")],
  },
  {
    id: 'kirk',
    yil: '2015',
    yer: () => L("Curitiba, Brezilya"),
    baslik: () => L("Kırk Yaşında Kafeste"),
    giris: () => [
      L("Kırk yaşına yaklaşıyorsun. Bir bacak kırığı, aylar süren tedavi; herkes bırakmanı söylüyor."),
      L("Ama kafes hâlâ evin. Curitiba'da, büyüdüğün mahallenin yakınında bir maç teklif ediliyor."),
      L("\"Ben bırakmayacağım,\" diyorsun. \"Sevdiğim şeyi yapıyorum.\""),
    ],
    hedef: () => L("38 yaşından sonra bir UCC maçı kazan"),
    ilerleme: (s) => L("Yaş {0}", [s.fighter.yas]),
    tamam: (s, r) => count(r, 'yasliG') > 0,
    yildizlar: [
      { ad: () => L("Toplam 6 UCC kemer savunmasına ulaş"), kontrol: (s) => (s.kemerler ?? []).filter((b) => b.org === 'ufc').reduce((a, b) => a + b.savunma, 0) >= 6, sonda: true },
      { ad: () => L("Kariyerinde 15 nakavt galibiyetine ulaş"), kontrol: (s) => s.rekor.ko >= 15, sonda: true },
    ],
    say: (s, f, r) => {
      if (f.won && f.org === 'ufc' && s.fighter.yas >= 38) bump(r, 'yasliG');
    },
    not: () => L("Yaş ilerledikçe hız düşer: oyun planında karşı vuruş ve sabır seç, sakatlıktan kaçmak için kampları düşük yoğunlukta tut. Yorgunken asla dövüşme."),
    basin: () => ({
      soru: L("Kırk yaşındasın. Neden hâlâ dövüşüyorsun?"),
      cevaplar: { mutevazi: L("“Çünkü seviyorum. Kafes benim hayatım.”"), iddiali: L("“Çünkü hâlâ en iyilerden biriyim.”"), espri: L("“Emekli olunca ne yapacağımı bilmiyorum. Bahçıvanlık sıkıcı.”") },
      tarihi: 'mutevazi',
    }),
  },
];
