// Basın toplantısı sahnesi: kamp bitince masada rakibinle yan yana oturursun, gazeteciler iki soru sorar.
// Alçakgönüllü, iddialı ya da esprili cevap; hype, popülerlik ve hocanla bağ değişir. İddialı konuşursan sözün
// maç gecesi seni takip eder: kazanırsan alkış, kaybedersen "sözünü yedi" manşetleri.
import { L, LOC } from '../i18n';
import { addHype } from './hype';
import { addFollowers, followers } from './fame';
import { legendPress, legendPressPayout } from './legendRun';
import { clamp, shuffle } from './rng';
import type { GameState, Opponent } from './types';
import { fresh, oneOf } from './variety';

export type PressStyle = 'mutevazi' | 'iddiali' | 'espri';
export interface PressQ {
  muhabir: string;
  soru: string;
  cevaplar: Record<PressStyle, string>;
  /** Efsane Yolu: tarihe sadık cevap */
  tarihi?: PressStyle;
}
export interface PressScene {
  sorular: PressQ[];
  secimler: PressStyle[];
  tepki?: string;
}

const MUHABIR = [L("Spor Dünyası"), L("MMA Kulis"), L("Kafes TV"), L("Fight Magazine"), L("Gece Bülteni"), L("Oktagon Gazetesi"), L("Dövüş Gecesi Podcast"), L("Yumruk Postası")];

type Q = { id: string; kosul?: (s: GameState, o: Opponent) => boolean; soru: (ad: string) => string; cevaplar: Record<PressStyle, string[]> };

const GRAPPLER = ['gures', 'bjj', 'judo', 'sambo'];
const STRIKER = ['boks', 'muaythai', 'kickboks', 'kyokushin'];

/** Bağlama özel sorular: koşulu tutanlardan biri ilk soru olur. */
const OZEL: Q[] = [
  {
    id: 'kemer',
    kosul: (s, o) => o.champion || s.sampiyon,
    soru: () => L("Kemer masada. Cumartesi gecesi kemerin kimin belinde olacak?"),
    cevaplar: {
      mutevazi: [L("“Kemer, daha çok çalışanın olur. Ben çalıştım.”"), L("“Kemer kimin olursa olsun, hak ederek alınacak.”")],
      iddiali: [L("“Benim. Bunu şimdiden yazabilirsiniz.”"), L("“Kemerin rengi bana daha çok yakışıyor.”")],
      espri: [L("“Kemeri tartıya getirsinler, ölçülerimi alayım.”"), L("“Evde yer açtım bile, perdeyi de ona göre seçtim.”")],
    },
  },
  {
    id: 'rovans_m',
    kosul: (_s, o) => o.sonSonuc === 'M',
    soru: (ad) => L("Geçen sefer {0} seni yendi. Bu sefer ne değişecek?", [ad]),
    cevaplar: {
      mutevazi: [L("“O gece o daha iyiydi. Hatalarımı çalıştım.”"), L("“O yenilgi bana çok şey öğretti. Bu sefer daha akıllıyım.”")],
      iddiali: [L("“O gece bir kazaydı. Bu sefer erken bitireceğim.”"), L("“Rövanş için gece gündüz çalıştım. Hesap kapanacak.”")],
      espri: [L("“Değişen tek şey saç modelim. Bir de sonuç.”"), L("“O maçın kaydını izlemeyi bıraktım, artık sonunu değiştireceğim.”")],
    },
  },
  {
    id: 'rovans_g',
    kosul: (_s, o) => o.sonSonuc === 'G',
    soru: (ad) => L("Daha önce yendiğin {0}, ilk maçın şans eseri olduğunu söylüyor.", [ad]),
    cevaplar: {
      mutevazi: [L("“İkinci maç her zaman zordur. Hafife almıyorum.”"), L("“Her maç yeni bir sayfa. Hazırım.”")],
      iddiali: [L("“Şans iki kez aynı yere düşmez. Bu sefer daha net olacak.”"), L("“İlk maçta merhamet ettim. Bu sefer yok.”")],
      espri: [L("“Şanssa, ben piyango da alayım o zaman.”"), L("“Tekrar izlemek isteyenler için ikinci bölüm geliyor.”")],
    },
  },
  {
    id: 'memleket',
    kosul: (_s, o) => !!o.memleket,
    soru: () => L("Kendi seyircinin önünde dövüşeceksin. Baskı hissediyor musun?"),
    cevaplar: {
      mutevazi: [L("“Onların önünde dövüşmek bir onur.”"), L("“Bu salon beni büyüttü. Onları utandırmayacağım.”")],
      iddiali: [L("“Baskıyı o hissetsin. Burası benim evim.”"), L("“Bu seyirci onu ilk rauntta yutar.”")],
      espri: [L("“Annem ön sırada olacak, asıl baskı o.”"), L("“Mahalleden herkes bilet istedi. Kaybedersem eve dönemem.”")],
    },
  },
  {
    id: 'yenilgi_serisi',
    kosul: (s) => s.seri <= -2,
    soru: () => L("Üst üste kaybettin. Bazıları bitti diyor. Ne diyorsun?"),
    cevaplar: {
      mutevazi: [L("“Eleştirileri hak ettim. Cevabımı kafeste vereceğim.”"), L("“Düştüm, kalkıyorum. Bu spor bu.”")],
      iddiali: [L("“Beni gömenler cumartesi tribünde olsun.”"), L("“Kötü dönem bitti. Bundan sonrası fırtına.”")],
      espri: [L("“Bitmedim, sadece uzun bir ısınma turundaydım.”"), L("“Ben de okudum o yazıları. Güzel yazmışlar, yanlış ama.”")],
    },
  },
  {
    id: 'galibiyet_serisi',
    kosul: (s) => s.seri >= 3,
    soru: () => L("Üst üste kazanıyorsun. Durdurulamaz mısın?"),
    cevaplar: {
      mutevazi: [L("“Her maç sıfırdan başlar. Seriye değil, bu maça bakıyorum.”"), L("“Seri güzel ama beni yalnızca sıradaki maç ilgilendiriyor.”")],
      iddiali: [L("“Durdurmaya çalışan çok oldu. Hepsi izliyor şimdi.”"), L("“Seri uzayacak. Liste kısalıyor.”")],
      espri: [L("“Durdurulabilirim: kırmızı ışıkta duruyorum mesela.”"), L("“Saymayı bıraktım, hesap makinesi aldım.”")],
    },
  },
  {
    id: 'yenilmez',
    kosul: (_s, o) => o.rekor.m === 0 && o.rekor.g >= 4,
    soru: (ad) => L("{0} hiç kaybetmedi. Onu ilk yenen sen mi olacaksın?", [ad]),
    cevaplar: {
      mutevazi: [L("“Yenilmez rekor saygıyı hak ediyor. Ama her seri bir gün biter.”"), L("“Hiç kaybetmemek kolay değil. Ona saygım var.”")],
      iddiali: [L("“Sıfırı ben bozacağım. Bu benim armağanım olsun.”"), L("“Rekorunun sonuna bir M eklemeye geldim.”")],
      espri: [L("“Hiç kaybetmemiş, yazık. Cumartesi yeni bir duyguyla tanışacak.”"), L("“İlkleri severim. Onun ilk yenilgisi olmak istiyorum.”")],
    },
  },
  {
    id: 'guresci',
    kosul: (_s, o) => GRAPPLER.includes(o.stil),
    soru: (ad) => L("{0} seni yere indirmek istiyor. Yerde kalırsan ne olacak?", [ad]),
    cevaplar: {
      mutevazi: [L("“Takedown savunmasına çok çalıştık. Hazırız.”"), L("“Yer de dövüşün parçası. Her yere hazırlandım.”")],
      iddiali: [L("“İndirebilirse indirsin. Önce yaklaşması lazım.”"), L("“Yerde de ayakta da onun kâbusu olacağım.”")],
      espri: [L("“Yere inersem şekerleme yaparım, o da yorulur.”"), L("“Mindere sarılmayı sever, ben sarılmam.”")],
    },
  },
  {
    id: 'vurucu',
    kosul: (_s, o) => STRIKER.includes(o.stil),
    soru: (ad) => L("{0} çok ağır vuruyor. Çenene güveniyor musun?", [ad]),
    cevaplar: {
      mutevazi: [L("“Ağır vuruyor, biliyorum. Savunmamı geliştirdim.”"), L("“Ona vurdurmamak için çalıştım, çeneme değil.”")],
      iddiali: [L("“Ağır el de isabet etmezse hafif kalır.”"), L("“O bana vurana kadar ben üç kez vurmuş olacağım.”")],
      espri: [L("“Çenem sigortalı, poliçeyi getirdim.”"), L("“Ağır eller mi? Ben de dün iki çanta taşıdım.”")],
    },
  },
  {
    id: 'yas',
    kosul: (s) => s.fighter.yas >= 33,
    soru: () => L("Yaşın ilerliyor. Hâlâ zirvede misin?"),
    cevaplar: {
      mutevazi: [L("“Vücudumu dinliyorum. Tecrübe de bir silah.”"), L("“Eskisi kadar hızlı değilim, ama çok daha akıllıyım.”")],
      iddiali: [L("“Yaş bir sayı. Cumartesi hepsine kimlik göstereceğim.”"), L("“Gençler hâlâ benden ders alıyor.”")],
      espri: [L("“Şarap gibiyim; yıllandıkça daha çok sersemletiyorum.”"), L("“Yaşlandım ama yumruklarım bunu duymadı.”")],
    },
  },
  {
    id: 'aile',
    kosul: (s) => (s.cocuklar ?? []).length > 0,
    soru: () => L("Çocukların seni tribünden izleyecek. Bu seni nasıl etkiliyor?"),
    cevaplar: {
      mutevazi: [L("“Her şeyi onlar için yapıyorum. Gurur duymalarını istiyorum.”"), L("“Onların yüzü aklıma gelince yorgunluk geçiyor.”")],
      iddiali: [L("“Kazandığımı görecekler. Başka seçenek yok.”"), L("“Çocuklarım ilk raunt bitmeden gülecek.”")],
      espri: [L("“Asıl korkum maçtan sonra ödev yaptırmak.”"), L("“Bana değil, rakibe acıyorlar zaten.”")],
    },
  },
  {
    id: 'ucc_ilk',
    kosul: (s) => s.stage === 'ufc' && s.rekor.g + s.rekor.m + s.rekor.b <= 1,
    soru: () => L("Büyük sahne, büyük ışıklar. İlk UCC haftan nasıl geçiyor?"),
    cevaplar: {
      mutevazi: [L("“Hayalimdi. Şimdi bu hayali hak etmem gerek.”"), L("“Heyecanlıyım ama odak tamam.”")],
      iddiali: [L("“Işıklar bana yeni değil. Sadece daha parlak.”"), L("“Uzun süre kalmak için geldim.”")],
      espri: [L("“Otel çok güzel, maçtan sonra da kalabilir miyim?”"), L("“Işıklar o kadar parlak ki rakibi göremiyorum. Şanslı.”")],
    },
  },
];

/** Her basında sorulabilen genel sorular. */
const GENEL: Q[] = [
  {
    id: 'kamp',
    soru: () => L("Kampın nasıl geçti? Bu maç için ne değiştirdin?"),
    cevaplar: {
      mutevazi: [L("“Her gün biraz daha iyi olmaya çalıştık. Gerisini kafeste göreceğiz.”"), L("“Ekibime güveniyorum. İşimizi yaptık.”")],
      iddiali: [L("“Bu kampta onu üç kez yendim, sparringde. Cumartesi dördüncüsü.”"), L("“Hiç bu kadar hazır olmadım. Şanssızlığı onun.”")],
      espri: [L("“Değişen tek şey diyetim. Özledim pideyi.”"), L("“Hocam bağırmaktan sesini kaybetti, demek ki iyi geçti.”")],
    },
  },
  {
    id: 'taraftar',
    soru: () => L("Taraftarlarına bir mesajın var mı?"),
    cevaplar: {
      mutevazi: [L("“Her şey sizin için. İyi ki varsınız.”"), L("“Desteğinizi hissediyorum. Sizi mahcup etmeyeceğim.”")],
      iddiali: [L("“Tribünleri doldurun, bir şov izleyeceksiniz.”"), L("“Bayramı şimdiden hazırlayın.”")],
      espri: [L("“Bilet alanlar arkada oturmasın, önde daha çok kan var.”"), L("“Cumartesiden sonra hepinize çay benden.”")],
    },
  },
  {
    id: 'zayif',
    soru: (ad) => L("{0} senin en zayıf yanını bulduğunu söylüyor. Ne diyeceksin?", [ad]),
    cevaplar: {
      mutevazi: [L("“Herkesin zayıf yanı vardır. Ben de kendiminkini çalıştım.”"), L("“Bulmuşsa iyi, ben de onunkini buldum.”")],
      iddiali: [L("“Zayıf yanım mı? Onu bulmak için önce ayakta kalması lazım.”"), L("“Bulsun. Cumartesi aramaya vakti olmayacak.”")],
      espri: [L("“Zayıf yanım tatlı. Kafeste tatlı yok, sorun yok.”"), L("“Bunu söylemesi bile bir zayıflık aslında.”")],
    },
  },
  {
    id: 'emeklilik',
    soru: () => L("Ne zaman emekli olmayı düşünüyorsun?"),
    cevaplar: {
      mutevazi: [L("“Vücudum söyleyecek. Şimdilik dinliyor.”"), L("“Daha yolun başındayım gibi hissediyorum.”")],
      iddiali: [L("“Bütün rekorları kırınca. Yani biraz daha var.”"), L("“Rakip kalmadığında. Takvimi ona göre ayarlayın.”")],
      espri: [L("“Emeklilik maaşı yeterse yarın. Yetmiyor, devam.”"), L("“Torunum beni yenince.”")],
    },
  },
  {
    id: 'para',
    soru: () => L("Bu maçtan ne kadar kazanacaksın?"),
    cevaplar: {
      mutevazi: [L("“Para önemli ama kemer daha önemli.”"), L("“Hak ettiğim kadar. Gerisi menajerin işi.”")],
      iddiali: [L("“Yetmez. Bir sonrakinde iki katını isteyeceğim.”"), L("“Onun bütün kariyerinde kazandığından fazla.”")],
      espri: [L("“Yeni bir araba alacak kadar. Park yeri bulamayacak kadar değil.”"), L("“Annem duyunca hemen fatura listesi yolladı.”")],
    },
  },
  {
    id: 'sosyal',
    soru: (ad) => L("Sosyal medyada {0} ile atışmanız gündem oldu. Bu iş kafeste mi bitecek?", [ad]),
    cevaplar: {
      mutevazi: [L("“Sosyal medya bir şey, kafes başka. Ben kafese bakarım.”"), L("“Klavye arkasında herkes cesur. Cumartesi göreceğiz.”")],
      iddiali: [L("“Paylaşımlarını silmesi için cumartesiye kadar vakti var.”"), L("“Yorumları kapatsın, maçtan sonra çok yorum gelecek.”")],
      espri: [L("“Takipçi sayıma bakın, cevabım orada.”"), L("“Ona bir emoji yolladım: 🪦.”")],
    },
  },
  {
    id: 'rakip',
    soru: (ad) => L("{0} hakkında ne düşünüyorsun?", [ad]),
    cevaplar: {
      mutevazi: [L("“Saygı duyduğum bir dövüşçü. Zor bir maç olacak.”"), L("“İyi bir sporcu. Onu hafife almıyorum.”")],
      iddiali: [L("“Abartılan bir isim. Cumartesi herkes görecek.”"), L("“Rakip listemde bir isim daha. Üstünü çizeceğim.”")],
      espri: [L("“Sakalı güzel. Gerisini kafeste konuşuruz.”"), L("“Hakkında çok şey düşünmedim açıkçası, uykum geldi.”")],
    },
  },
  {
    id: 'tahmin',
    soru: () => L("Maç nasıl biter? Bir tahmin ver."),
    cevaplar: {
      mutevazi: [L("“Kim daha iyi hazırlandıysa o kazanır.”"), L("“Tahmin yapmam. Planı uygularım.”")],
      iddiali: [L("“İkinci raunt, nakavt. Not alın.”"), L("“İlk raunt bitmeden hakem araya girecek.”"), L("“Submission. Tap atacak, emin olun.”")],
      espri: [L("“Ben kazanırım, o da güzel bir uyku çeker.”"), L("“Hakemler masada çay içmeye fırsat bulamayacak.”")],
    },
  },
  {
    id: 'kamp',
    soru: () => L("Kamp nasıl geçti?"),
    cevaplar: {
      mutevazi: [L("“Zor ama verimli. Ekibime teşekkür ederim.”"), L("“Her gün biraz daha iyiye gittik.”")],
      iddiali: [L("“Hayatımın en iyi kampı. Daha önce hiç bu kadar hazır olmadım.”"), L("“Kampta sparring partnerlerim zor dayandı.”")],
      espri: [L("“Hocam beni o kadar koşturdu ki ayakkabılarım istifa etti.”"), L("“Kampta o kadar tavuk yedim ki gıdaklamaya başladım.”")],
    },
  },
  {
    id: 'kilo',
    soru: () => L("Tartı nasıl gidiyor? Kilo sorunu var mı?"),
    cevaplar: {
      mutevazi: [L("“Disiplinliyim. Diyetisyenim harika iş çıkardı.”"), L("“Planlandığı gibi gidiyor.”")],
      iddiali: [L("“Ben kilomu veririm. Asıl o tartıya dikkat etsin.”"), L("“Tartıda bile ondan daha iyi görüneceğim.”")],
      espri: [L("“Su bile koklayarak içiyorum.”"), L("“Rüyamda hep lahmacun görüyorum, gerisi yolunda.”")],
    },
  },
  {
    id: 'hedef',
    soru: () => L("Bu maçtan sonra kimi istiyorsun?"),
    cevaplar: {
      mutevazi: [L("“Önce bu maç. Sonrasına ekibim karar verir.”"), L("“Organizasyon kimi uygun görürse.”")],
      iddiali: [L("“Kemeri tutan kimse, onu. Sıra bende.”"), L("“Listedeki en iyiyi. Kim olduğunu herkes biliyor.”")],
      espri: [L("“Bir tatil istiyorum açıkçası. Sonra bakarız.”"), L("“Önce bir pizza, sonra şampiyon.”")],
    },
  },
  {
    id: 'guclu',
    soru: () => L("Seni en çok ne güçlü kılıyor?"),
    cevaplar: {
      mutevazi: [L("“Ekibim ve sabrım.”"), L("“Hiç pes etmemem. Bunu ailemden öğrendim.”")],
      iddiali: [L("“Her şey. Zayıf yanımı arayan hâlâ arıyor.”"), L("“Kafesin içinde kimse benim kadar aç değil.”")],
      espri: [L("“Annemin köftesi. Bilimsel olarak kanıtlandı.”"), L("“Sabah kahvem. Onsuz ben de korkuyorum.”")],
    },
  },
  {
    id: 'hayran',
    soru: () => L("Taraftarlarına bir mesajın var mı?"),
    cevaplar: {
      mutevazi: [L("“Her zaman yanımdasınız. Sizin için dövüşeceğim.”"), L("“Teşekkürler. Sesinizi kafeste duyuyorum.”")],
      iddiali: [L("“Patlamış mısırınızı alın, kısa sürecek.”"), L("“Cumartesi tarih yazacağız, kaçırmayın.”")],
      espri: [L("“Bilet alan herkese teşekkürler, almayanlara da… gelecek sefer.”"), L("“Bağırmayı unutmayın, kulaklarım alıştı.”")],
    },
  },
  {
    id: 'korku',
    soru: () => L("Kafese girmeden önce korkuyor musun?"),
    cevaplar: {
      mutevazi: [L("“Herkes korkar. Önemli olan korkuyu yönetmek.”"), L("“Korku beni uyanık tutuyor.”")],
      iddiali: [L("“Korku mu? Onu rakibime bıraktım.”"), L("“Ben korkmam, korkuturum.”")],
      espri: [L("“Tek korkum dişçi. Kafes ondan kolay.”"), L("“Sadece annemin telefonlarından korkarım.”")],
    },
  },
  {
    id: 'kotu_gun',
    soru: () => L("Kötü bir gece geçirirsen planın ne?"),
    cevaplar: {
      mutevazi: [L("“Kalkarım, çalışırım, dönerim. Hep böyle oldu.”"), L("“Yenilgi de öğretir. Ama bu gece öyle olmayacak.”")],
      iddiali: [L("“Kötü gece mi? Takvimimde öyle bir gün yok.”"), L("“B planı yok. Plan kazanmak.”")],
      espri: [L("“Dondurma yerim, sonra yine kazanırım.”"), L("“O zaman sizinle burada daha uzun sohbet ederiz.”")],
    },
  },
  {
    id: 'hoca',
    soru: () => L("Hocan bu maç için sana ne dedi?"),
    cevaplar: {
      mutevazi: [L("“Sabırlı ol, planı uygula. Ona güveniyorum.”"), L("“Her gün aynı şeyi söylüyor: temel işler.”")],
      iddiali: [L("“‘Onu bitir’ dedi. Ben de bitireceğim.”"), L("“Hocam bu kadar emin olduğumu hiç görmedi.”")],
      espri: [L("“Söylediğinin yarısını anlamadım ama kafamı salladım.”"), L("“‘Yemeğini ye’ dedi. Gerisi detay.”")],
    },
  },
  {
    id: 'para',
    soru: () => L("Bu maçtan aldığın para sence yeterli mi?"),
    cevaplar: {
      mutevazi: [L("“Para için başlamadım. Ama çalışkan olan kazanır.”"), L("“Önce performans, para arkasından gelir.”")],
      iddiali: [L("“Hak ettiğimin yarısı. Cumartesiden sonra konuşuruz.”"), L("“Benden sonra fiyatlar artacak.”")],
      espri: [L("“Faturalarım bu soruya ‘hayır’ diyor.”"), L("“Yeterli değil ama annem memnun, bu yeter.”")],
    },
  },
  {
    id: 'sosyal',
    soru: () => L("Sosyal medyada seni eleştirenlere ne diyorsun?"),
    cevaplar: {
      mutevazi: [L("“Herkesin bir fikri var. Ben işime bakarım.”"), L("“Eleştiriler beni geliştiriyor.”")],
      iddiali: [L("“Klavyeyle kafes aynı yer değil.”"), L("“Yorum yazanlar cumartesi sessiz kalacak.”")],
      espri: [L("“Telefonu hocama verdim. O cevap veriyor.”"), L("“Yorumları okumuyorum, sadece kalpleri sayıyorum.”")],
    },
  },
  {
    id: 'gelecek',
    soru: () => L("Beş yıl sonra kendini nerede görüyorsun?"),
    cevaplar: {
      mutevazi: [L("“Hâlâ öğrenen biri olarak. Gerisi kader.”"), L("“Ailemle mutlu, sporuma faydalı biri olarak.”")],
      iddiali: [L("“Onur Listesi'nde. Adım orada olacak.”"), L("“Belimde iki kemer, birini nereye koyacağımı düşünürken.”")],
      espri: [L("“Bir sahil kasabasında balık tutarken.”"), L("“Burada, aynı soruya cevap verirken.”")],
    },
  },
  {
    id: 'yuzlesme',
    soru: (ad) => L("{0} burada, yanında. Ona doğrudan bir şey söylemek ister misin?", [ad]),
    cevaplar: {
      mutevazi: [L("“İyi şanslar dilerim. Güzel bir maç olsun.”"), L("“Sağlıkla çık kafesten. Gerisi bizim işimiz.”")],
      iddiali: [L("“Gözlerime bak. Cumartesi aynı yere bakamayacaksın.”"), L("“Bu son basın toplantın olabilir, tadını çıkar.”")],
      espri: [L("“Cumartesiye kadar bol bol fotoğraf çek, hatıra kalsın.”"), L("“Kolonyan güzelmiş, maçtan sonra lazım olur.”")],
    },
  },
];

function questions(s: GameState): PressQ[] {
  const o = s.pending.rakip!;
  const ad = o.soyad;
  const ozel = fresh(s, 'basin_ozel', OZEL.filter((q) => q.kosul?.(s, o)), 1);
  const buyuk = o.champion || s.sampiyon || s.stage === 'ufc';
  const genel = fresh(s, 'basin', GENEL, (buyuk ? 3 : 2) - Math.min(1, ozel.length));
  const muhabir = shuffle(MUHABIR);
  const efsane = legendPress(s);
  const make = (q: Q): Omit<PressQ, 'muhabir'> => ({ soru: q.soru(ad), cevaplar: { mutevazi: oneOf(q.cevaplar.mutevazi), iddiali: oneOf(q.cevaplar.iddiali), espri: oneOf(q.cevaplar.espri) } });
  const ilk = efsane ? [{ soru: efsane.soru, cevaplar: efsane.cevaplar, tarihi: efsane.tarihi }] : ozel.map(make);
  return [...ilk, ...genel.map(make)].map((q, i) => ({ ...q, muhabir: muhabir[i % muhabir.length] }));
}

export function startPress(s: GameState) {
  const k = s.pending.kamp!;
  k.basinSahne = { sorular: questions(s), secimler: [] };
}

const TEPKI: Record<PressStyle, () => string> = {
  mutevazi: () => oneOf([L("Arka sıradaki eski bir şampiyon onaylarcasına başını salladı."), L("Sakin bir cevap. Tribünlerde saygılı bir alkış koptu."), L("Salon saygıyla alkışladı. Hocan başını salladı."), L("Gazeteciler not aldı; olgun bir cevap."), L("Arka sıradan biri “İşte sporcu!” diye bağırdı."), L("Organizasyon yetkilisi memnun bir şekilde gülümsedi.")]),
  iddiali: () => oneOf([L("Moderatör mikrofonu almaya çalıştı ama geç kaldı."), L("Bahis siteleri oranları anında güncelledi."), L("Flaşlar patladı! Manşetler hazır; şimdi sözünü tutman gerek."), L("Salon uğuldadı. Bu söz yarın her yerde olacak."), L("Muhabirler ayağa kalktı; bu cümle manşet olur."), L("Hocan kaşlarını kaldırdı ama salon coştu.")]),
  espri: () => oneOf([L("Rakibin köşesindeki hoca bile güldü, sonra kendini tuttu."), L("Bu cevap birkaç dakika içinde milyonlarca izlenmeye gidiyor."), L("Salon kahkahaya boğuldu, klip şimdiden dolaşıyor."), L("Moderatör bile gülmeden duramadı."), L("Bu cevap kesin sosyal medyada caps olur."), L("Ön sıradaki gazeteciler kahkahadan not tutamadı.")]),
};

/** Rakibin karşılığı: oyuncunun tonuna göre değişir. */
const KARSILIK: Record<PressStyle, (o: string) => string[]> = {
  mutevazi: (o) => [L("{0}: “Böyle konuşan herkes kafeste başka biri olur.”", [o]), L("{0} yanındakine döndü: “Gördün mü, korkuyor.”", [o]), L("{0}: “Saygı güzel ama kafeste işe yaramaz.”", [o]), L("{0} başını salladı: “Ben de ona saygı duyuyorum. Cumartesiye kadar.”", [o]), L("{0} mikrofona eğildi: “Kibarlığı korkudan.”", [o]), L("{0} sessizce gülümsedi, cevap vermedi.", [o])],
  iddiali: (o) => [L("{0} ayağa kalktı, güvenlik araya girdi.", [o]), L("{0}: “Bu cümleyi çerçeveletip duvarına as, son kez söylüyorsun.”", [o]), L("{0}: “Bu sözleri cumartesi yutacak.”", [o]), L("{0} masaya vurdu: “Konuşmak kolay!”", [o]), L("{0}: “Böyle konuşanları çok uyuttum.”", [o]), L("{0} kahkaha attı: “Rüyasında kazanıyor.”", [o])],
  espri: (o) => [L("{0}: “Gülmek serbest, cumartesi ağlamak da.”", [o]), L("{0} kahkahayı bastıramadı, salon ikisine birden güldü.", [o]), L("{0} gülmedi: “Komedyen mi dövüşçü mü, karar versin.”", [o]), L("{0} bile gülümsedi, sonra toparlandı.", [o]), L("{0}: “Cumartesi gülmeyeceksin.”", [o]), L("{0} gözlerini devirdi: “Sahneye çıksın o zaman.”", [o])],
};

export function answerPress(s: GameState, st: PressStyle) {
  const k = s.pending.kamp!;
  const p = k.basinSahne;
  if (!p || p.secimler.length >= p.sorular.length) return;
  const q = p.sorular[p.secimler.length];
  p.secimler.push(st);
  const o = s.pending.rakip;
  p.tepki = TEPKI[st]() + (o ? ' ' + oneOf(KARSILIK[st](o.soyad)) : '');
  if (q?.tarihi === st) {
    k.efsaneSoz = true;
    p.tepki = L("📜 Tarihî söz! Salon bu cümleyi yıllarca hatırlayacak. Maçı kazanırsan manşetler senin.");
  }
  if (st === 'mutevazi') {
    s.populerlik = clamp(s.populerlik + 1, 0, 100);
    if (s.hoca) s.hoca.bag = clamp(s.hoca.bag + 2, 0, 100);
    addHype(s, 2, L("Saygılı basın"));
  } else if (st === 'iddiali') {
    s.populerlik = clamp(s.populerlik + 2, 0, 100);
    k.iddia = (k.iddia ?? 0) + 1;
    addHype(s, 7, L("İddialı sözler"));
  } else {
    addFollowers(s, Math.max(200, followers(s) * 0.01));
    addHype(s, 4, L("Basında espri"));
  }
}

/** Viral klip (reklam ödülü): basın toplantısının en sert anı paylaşılır; takipçi ve maçın bilet/PPV satışı artar. */
export const viralPay = (s: GameState) => (s.stage === 'ufc' ? 40_000 : s.stage === 'buyuk' ? 6_000 : 800);
export function claimViral(s: GameState) {
  const k = s.pending.kamp;
  if (!k?.basinSahne || k.viral) return;
  k.viral = true;
  const n = viralPay(s);
  s.para += n;
  addFollowers(s, Math.max(500, followers(s) * 0.03));
  addHype(s, 5, L("Viral klip"));
  k.basinSahne.tepki = L("📈 Klip patladı: milyonlarca izlenme. Bilet satışları arttı (+{0}).", [`$${n.toLocaleString(LOC)}`]);
}

export const pressDone = (s: GameState) => {
  const p = s.pending.kamp?.basinSahne;
  return !!p && p.secimler.length >= p.sorular.length;
};

/** Maç sonu: iddialı sözlerin hesabı. */
export function pressAfterFight(s: GameState, won: boolean): string[] {
  const efsane = won && s.pending.kamp?.efsaneSoz ? [legendPressPayout(s)] : [];
  const n = s.pending.kamp?.iddia ?? 0;
  if (!n) return efsane;
  if (won) {
    s.populerlik = clamp(s.populerlik + 2 * n, 0, 100);
    return [L("🎤 Basın toplantısındaki sözlerini tuttun! Manşet: “Dediğini yaptı.” Popülerlik +{0}", [2 * n]), ...efsane];
  }
  s.populerlik = clamp(s.populerlik - 3 * n, 0, 100);
  return [L("🎤 Basın toplantısında büyük konuştun ama kaybettin. Manşet: “Sözünü yedi.” Popülerlik -{0}", [3 * n])];
}
