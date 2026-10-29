// Efsane Yolu: Khabir Nurmagaliev (Dağıstan). Dağlarda büyüyen güreşçiden 21 indirmeye, sabırla gelen kemere,
// asrın gecesine, babasına verdiği söze ve kendi salonuna.
import { L } from '../i18n';
import { beatCount, bump, count, decision, finish, legendSponsor, nonUccBelt, pay, ufcBelts, uccWin, type Chapter } from './legendKit';
import { clamp } from './rng';

export const YENILMEZ: Chapter[] = [
  {
    id: 'ayi',
    yil: '2008',
    yer: () => L("Sildi, Dağıstan"),
    baslik: () => L("Ayıyla Güreşen Çocuk"),
    giris: () => [
      L("Dağıstan'ın dağlarında, babanın açtığı küçük salonda büyüdün. Dokuz yaşındayken bir ayı yavrusuyla güreştiğin video hâlâ köyde konuşuluyor."),
      L("Baban Abdulmenaf bir güreş hocası. Ondan öğrendiğin tek kural var: \"Rakibini yere indir, orada tut, asla bırakma.\""),
      L("Şimdi yirmi yaşındasın ve sambo şampiyonlukların yetmiyor. Kafese çıkma zamanı."),
    ],
    hedef: () => L("Profesyonel ol"),
    ipucu: () => L("Amatör maçlar kazan; teklifler kendiliğinden gelir."),
    tamam: (s) => s.stage !== 'amator',
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Amatörde hiç kaybetme"), kontrol: (s) => s.amator.m === 0, sonda: true },
      { ad: () => L("Amatörde 2 submission galibiyeti al"), kontrol: (s) => s.amator.sub >= 2, sonda: true },
    ],
    not: () => L("Güreş ve yer senin silahın: oyun planında indirme ve yerde kontrolü seç, kamp odağını Yer'e ver. Submission için rakibi önce yorar, sonra kilitlersin."),
    bitir: (s) => {
      s.populerlik = clamp(s.populerlik + 2, 0, 100);
      return [L("🏔️ Baban elini omzuna koyuyor: \"Şimdi asıl iş başlıyor.\"")];
    },
  },
  {
    id: 'dag',
    yil: '2010',
    yer: () => L("Mahaçkale, Dağıstan"),
    baslik: () => L("Dağın Kanunu"),
    giris: () => [
      L("Rusya'nın küçük salonlarında, bazen bir ayda iki kez dövüşüyorsun. Para az, rakipler sert."),
      L("Ama kimse seni yerde tutamıyor. Kimse sana bir raunt bile kazandıramıyor."),
      L("Köyde herkes aynı şeyi söylüyor: \"Bu çocuk hiç kaybetmeyecek.\""),
    ],
    hedef: () => L("Profesyonelde 10 galibiyet al"),
    ilerleme: (s) => `${Math.min(10, s.rekor.g)}/10`,
    tamam: (s) => s.rekor.g >= 10,
    uccKapali: true,
    yildizlar: [
      { ad: () => L("En fazla 2 yenilgiyle 10 galibiyete ulaş"), kontrol: (s) => s.rekor.m <= 2, sonda: true },
      { ad: () => L("Bu galibiyetlerin en az 4'ü submission olsun"), kontrol: (s) => s.rekor.sub >= 4, sonda: true },
    ],
    not: () => L("Yenilmemek için yorgunken asla dövüşme ve her maçtan önce keşif raporu al. Submission için oyun planında yerde kontrolü seç ve Yer'i geliştir."),
    basin: () => ({
      soru: L("On maçta kimse sana bir raunt bile kazandıramadı. Sırrın ne?"),
      cevaplar: { mutevazi: L("“Babam ve Allah. Ben sadece çalışıyorum.”"), iddiali: L("“Kimse beni yerde tutamaz. Kimse.”"), espri: L("“Dağda ayılarla güreşen biri için bu adamlar küçük.”") },
      tarihi: 'mutevazi',
    }),
  },
  {
    id: 'bolge',
    yil: '2011',
    yer: () => L("Rostov, Rusya"),
    baslik: () => L("Bölgenin Hâkimi"),
    giris: () => [
      L("Rusya'nın en büyük bölgesel organizasyonunda kemer maçı için sıradasın."),
      L("Amerika'dan gelen izciler maçlarını izliyor. Bir kemer, okyanusun öbür yakasına bilet demek."),
      L("Baban köşende: \"Acele etme. Kemer kaçmaz.\""),
    ],
    hedef: () => L("UCC dışındaki bir organizasyonda şampiyon ol"),
    ipucu: () => L("Bu bölümde UCC seni beklemez: kemer senin biletin."),
    tamam: (s) => nonUccBelt(s),
    atla: (s) => s.stage === 'ufc',
    uccKapali: true,
    yildizlar: [
      { ad: () => L("Kemer maçını bitirişle kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && finish(f.yontem) },
      { ad: () => L("Kemeri 26 yaşına girmeden al"), kontrol: (s) => s.fighter.yas < 26, sonda: true },
    ],
    not: () => L("Kemer maçında keşif raporu al ve rakibin en zayıf olduğu alana göre plan seç. Yerde kontrol en güvenli yol: Güreş ve Yer odaklı kamp yap."),
    basin: () => ({
      soru: L("Amerika'dan izciler burada. Onlara bir mesajın var mı?"),
      cevaplar: { mutevazi: L("“Önce bu kemer. Sonra Allah ne yazdıysa.”"), iddiali: L("“Hazırım. Bana en iyisini getirin.”"), espri: L("“Mesajım şu: bana sıcak bir mont getirin, orada soğuk mu?”") },
      tarihi: 'mutevazi',
    }),
  },
  {
    id: 'amerika',
    yil: '2012',
    yer: () => L("Nashville, ABD"),
    baslik: () => L("Amerika'ya İlk Adım"),
    giris: () => [
      L("UCC'den teklif geldi. İlk kez okyanusu geçiyorsun; tercüman, yeni salon, yeni yemekler."),
      L("Amerikan basını adını telaffuz edemiyor. \"Kim bu Dağıstanlı?\" diye soruyorlar."),
      L("Sen ise sadece bir şey söylüyorsun: \"Göreceksiniz.\""),
    ],
    hedef: () => L("UCC'ye gir ve ilk maçını kazan"),
    ipucu: () => L("Bir galibiyet daha getir: UCC teklifi doğrudan gelir."),
    tamam: (s) => uccWin(s),
    uccKapi: true,
    yildizlar: [
      { ad: () => L("İlk UCC maçını submission ile kazan"), kontrol: (s, f) => !!f && f.won && f.org === 'ufc' && f.yontem === 'SUB' && s.gecmis.filter((h) => h.org === 'ufc').length === 1 },
      { ad: () => L("UCC'deki ilk galibiyetini 27 yaşına girmeden al"), kontrol: (s) => s.fighter.yas < 27, sonda: true },
    ],
    not: () => L("İlk UCC maçında heyecana kapılma: oyun planında indirme ve yerde kontrolü seç. Submission için rakibi önce iki raunt yor."),
    basin: () => ({
      soru: L("Amerika'da kimse seni tanımıyor. Bu seni rahatsız ediyor mu?"),
      cevaplar: { mutevazi: L("“Tanınmak için değil, kazanmak için buradayım.”"), iddiali: L("“Yakında herkes adımı öğrenecek.”"), espri: L("“Adımı söyleyemiyorlar. Sorun değil, rakibim de söyleyemeyecek.”") },
      tarihi: 'mutevazi',
    }),
  },
  {
    id: 'indirme',
    yil: '2014',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("21 İndirme"),
    giris: () => [
      L("Bir maçta rakibini tam yirmi bir kez yere indirdin. Rekor kitapları güncelleniyor."),
      L("Rakiplerin ne yapacağını biliyor ama seni durduramıyor. Seni izlemek bir bulmaca gibi: herkes nasıl olacağını biliyor, kimse önleyemiyor."),
      L("Sıralamada hızla yükseliyorsun."),
    ],
    hedef: () => L("UCC'de ilk 5'e gir"),
    ilerleme: (s) => (s.stage === 'ufc' && s.rank ? `#${s.rank}` : null),
    tamam: (s) => s.stage === 'ufc' && (s.sampiyon || (s.rank != null && s.rank <= 5)),
    yildizlar: [
      { ad: () => L("Bu bölümde 2 UCC maçını kararla kazan"), kontrol: (_s, _f, r) => count(r, 'karar') >= 2 },
      { ad: () => L("UCC'de 4 maçlık galibiyet serisi yakala"), kontrol: (s) => s.stage === 'ufc' && s.seri >= 4 },
    ],
    say: (_s, f, r) => {
      if (f.won && f.org === 'ufc' && decision(f.yontem)) bump(r, 'karar');
    },
    not: () => L("Karar galibiyeti için oyun planında indirme ve kontrolü seç: rakibi bitirmeye çalışma, raundu üstte bitir. Seri için yorgunluğunu sıfırla."),
    basin: () => ({
      soru: L("Yirmi bir indirme! Rakiplerin bunu nasıl durdurabilir?"),
      cevaplar: { mutevazi: L("“Herkes ne yapacağımı biliyor. Önemli olan, yine de yapabilmek.”"), iddiali: L("“Durduramazlar. Kimse beni durduramaz.”"), espri: L("“Yerde yatmayı seviyorlarsa ben ne yapayım?”") },
      tarihi: 'mutevazi',
    }),
  },
  {
    id: 'sabir',
    yil: '2017',
    yer: () => L("New York, ABD"),
    baslik: () => L("Sabır"),
    giris: () => [
      L("Diz sakatlıkları, iptal edilen maçlar. Unvan maçı tam dört kez elinden kayıp gitti."),
      L("Herkes lanetli olduğunu söylüyor. Baban ise başka bir şey söylüyor: \"Sabır. Her şeyin bir zamanı var.\""),
      L("Ve zaman sonunda geliyor. Unvan maçı Brooklyn'de."),
    ],
    hedef: () => L("UCC şampiyonu ol"),
    tamam: (s) => ufcBelts(s).length > 0,
    yildizlar: [
      { ad: () => L("Şampiyon olurken en fazla 3 yenilgin olsun"), kontrol: (s) => s.rekor.m <= 3, sonda: true },
      { ad: () => L("30 yaşına girmeden şampiyon ol"), kontrol: (s) => s.fighter.yas < 30, sonda: true },
    ],
    sonra: (s) => {
      s.sakatliklar.push({ ad: L("Diz bağı zorlanması"), stat: 'gures', ceza: 10, hafta: 6 });
      return [L("🩼 Kampta dizin sakatlandı: 6 hafta tedavi. Sabır zamanı.")];
    },
    not: () => L("Sakatlıktan döndüğünde aceleye gelme: tam iyileşmeden dövüşme ve Kondisyon odaklı kamp yap. Unvan maçında oyun planında baskı ve indirmeyi seç; şampiyonu beş raunt boyunca yor."),
    basin: () => ({
      soru: L("Unvan maçın dört kez iptal oldu. Lanetli olduğunu düşünüyor musun?"),
      cevaplar: { mutevazi: L("“Her şeyin bir zamanı var. Benim zamanım şimdi.”"), iddiali: L("“Lanet değil, rakiplerim benden korkuyor.”"), espri: L("“Dizlerime sordum, onlar da bilmiyor.”") },
      tarihi: 'mutevazi',
    }),
    bitir: (s) => [pay(s, 1_000_000, L("PPV gelir payı")), ...legendSponsor(s, 'reebot', 1.4), L("🦅 Dağıstan'ın ilk UCC şampiyonu. Mahaçkale sokaklarında bayram var.")],
  },
  {
    id: 'gece',
    yil: '2018',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("Asrın Gecesi"),
    giris: () => [
      L("İrlandalı yıldız Conor McGrath kemerine göz dikti. Basın toplantıları olay, sosyal medya alev alev."),
      L("O konuşuyor, sen susuyorsun. O dalga geçiyor, sen bekliyorsun."),
      L("Tarihin en çok satan gecesi geliyor. Sen sadece bir şey söylüyorsun: \"Kafeste konuşacağız.\""),
    ],
    hedef: () => L("Kemerini savun"),
    tamam: (s, r) => s.stage === 'ufc' && s.sampiyon && s.savunma > count(r, 'sv0'),
    rakip: { ad: 'Conor', soyad: 'McGrath', lakap: 'The Infamous', uyruk: () => L("İrlanda"), stil: 'boks', siklet: 'hafif' },
    yildizlar: [
      { ad: () => L("Conor McGrath'ı yen"), kontrol: (s) => beatCount(s, 'McGrath') >= 1 },
      { ad: () => L("Savunmayı submission ile kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && f.yontem === 'SUB' },
    ],
    basla: (s, r) => {
      bump(r, 'sv0', s.savunma);
      return [];
    },
    not: () => L("McGrath ayakta tehlikeli, ilk rauntta en sert vurur: oyun planında erken indirmeyi seç ve Güreş odaklı kamp yap. Yerde onu yorduktan sonra boyun kilidi için fırsat gelir."),
    basin: () => ({
      soru: L("McGrath ailene ve memleketine laf etti. Cevabın ne?"),
      cevaplar: { mutevazi: L("“Konuşmak kolay. Kafeste her şey ortaya çıkar.”"), iddiali: L("“Cumartesi gecesi ona yerde ders vereceğim.”"), espri: L("“Konuşsun. Ben onu yere indirince sessiz kalacak.”") },
      tarihi: 'mutevazi',
    }),
    bitir: (s) => [pay(s, 6_000_000, L("Tarihin en çok satan PPV gecesi")), L("🦅 Asrın gecesi senin oldu. Dünya artık adını biliyor.")],
  },
  {
    id: 'soz',
    yil: '2020',
    yer: () => L("Abu Dabi, BAE"),
    baslik: () => L("Babaya Verilen Söz"),
    giris: () => [
      L("Babanı kaybettin. Salonda onun yerinde kimse durmuyor; onun sesi artık sadece kulağında."),
      L("Annene söz verdin: babasız dövüşmeyeceksin, kariyerini zirvede bitireceksin."),
      L("Bir son kez kafese çıkıyorsun. Bu maç onun için."),
    ],
    hedef: () => L("Kemerini toplam 3 kez savun"),
    basla: (s, r) => {
      bump(r, 'm0', s.rekor.m);
      return [];
    },
    ilerleme: (s) => (s.sampiyon ? `${Math.min(3, s.savunma)}/3` : null),
    tamam: (s) => s.stage === 'ufc' && s.sampiyon && s.savunma >= 3,
    yildizlar: [
      { ad: () => L("Son savunmayı submission ile kazan"), kontrol: (s, f) => !!f && f.won && f.unvan && f.org === 'ufc' && f.yontem === 'SUB' && s.savunma >= 3 },
      { ad: () => L("Bu bölümde hiç kaybetme"), kontrol: (s, _f, r) => s.rekor.m <= count(r, 'm0'), sonda: true },
    ],
    not: () => L("Savunmalar arasında tam dinlen ve her rakibe keşif raporu al. Submission için oyun planında yerde kontrolü seç; üçgen boğma için rakibi önce ayakta yor."),
    basin: () => ({
      soru: L("Babanı kaybettikten sonraki ilk maçın. Nasıl hissediyorsun?"),
      cevaplar: { mutevazi: L("“Babam her zaman benimle. Bu maç onun için.”"), iddiali: L("“Kimse beni durduramaz. Bunu babam için kanıtlayacağım.”"), espri: L("“Babam şimdi bana yukarıdan bakıp ‘Elini kaldır!’ diyordur.”") },
      tarihi: 'mutevazi',
    }),
    bitir: (s) => [pay(s, 3_000_000, L("PPV gelir payı")), L("🙏 Kafesin ortasında diz çöküyorsun. Eldivenlerini yere bırakıyorsun. Babana verdiğin sözü tuttun.")],
  },
  {
    id: 'miras',
    yil: '2021',
    yer: () => L("Mahaçkale, Dağıstan"),
    baslik: () => L("Babanın Mirası"),
    giris: () => [
      L("Babanın açtığı küçük salon artık senin sorumluluğunda."),
      L("Dağıstan'ın dört bir yanından çocuklar kapıda bekliyor. Her biri bir gün senin gibi olmak istiyor."),
      L("Şimdi hoca sensin. Babanın sana öğrettiğini, sen onlara öğreteceksin."),
    ],
    hedef: () => L("Kendi salonunu aç"),
    ipucu: () => L("Salon ekranından kendi salonunu aç (takipçi ve para gerekir)."),
    tamam: (s) => !!s.salon,
    yildizlar: [
      { ad: () => L("Salonunda 3 öğrenci yetiştir"), kontrol: (s) => (s.salon?.ogrenciler.length ?? 0) >= 3 },
      { ad: () => L("29 profesyonel galibiyete ulaş"), kontrol: (s) => s.rekor.g >= 29, sonda: true },
    ],
    not: () => L("Salon için yeterli takipçi ve para lazım: maç gelirlerini biriktir, paylaşımlarla takipçi topla. Üç öğrenci için salonu bir seviye büyütmen gerekir; aday listesinden potansiyeli yüksek olanları seç."),
    bitir: (s) => {
      s.populerlik = clamp(s.populerlik + 5, 0, 100);
      return [L("🦅 Baban gurur duyardı. Yenilmez bir dövüşçü, şimdi yenilmez bir hoca.")];
    },
  },
];
