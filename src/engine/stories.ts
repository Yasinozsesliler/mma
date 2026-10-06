// Kariyer hikâyeleri: birkaç dövüşe yayılan, adım adım ilerleyen olay zincirleri (ihanet, sakatlıktan dönüş,
// menajer dolandırıcılığı, babanın ringe dönüşü). Her kariyerde her hikâye en fazla bir kez; aynı anda tek hikâye.
// Adımlar olay ekranında gösterilir (events.ts'teki olaylarla aynı akış); bir adımın seçimi sonraki adımı belirler.
import { L, LOC } from '../i18n';
import { addStat } from './character';
import { NAME_POOLS, femSurname } from './data';
import { chance, clamp, pick } from './rng';
import type { GameEventState, GameState, StatKey } from './types';

type Veri = Record<string, string | number>;
type Adim = {
  kur: (s: GameState, v: Veri) => { baslik: string; metin: string; secenekler: string[] };
  /** Sonuç metni; sonraki adıma geçiş `ileri` ile, bitiş varsayılan. */
  uygula: (s: GameState, secim: number, v: Veri, ileri: (dovus: number) => void) => string;
};
type Hikaye = { kosul: (s: GameState) => boolean; baslat?: (s: GameState) => Veri; adimlar: Adim[] };

const fights = (s: GameState) => s.gecmis.length;
const $ = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;
const pop = (s: GameState, d: number) => (s.populerlik = clamp(s.populerlik + d, 0, 100));
const mot = (s: GameState, d: number) => (s.motivasyon = clamp(s.motivasyon + d, -2, 2));
const olcek = (s: GameState) => ({ amator: 400, bolgesel: 2500, buyuk: 12000, ufc: 40000 })[s.stage];

function isim(s: GameState) {
  const p = pick(NAME_POOLS.filter((x) => s.fighter.uyruk === 'tr' ? x.ulke === L("Türkiye") : true));
  const kadin = !!s.fighter.kadin;
  return `${pick(kadin ? p.kadin : p.ad)} ${kadin && p.slav ? femSurname(pick(p.soyad)) : pick(p.soyad)}`;
}

const HIKAYELER: Record<string, Hikaye> = {
  // 1) Hain antrenman ortağı
  ihanet: {
    kosul: (s) => s.gecmis.length >= 3,
    baslat: (s) => ({ ad: isim(s) }),
    adimlar: [
      {
        kur: (s, v) => ({
          baslik: L("🤝 Yeni Antrenman Ortağı"),
          metin: L("{0} adında genç ve aç bir dövüşçü salona geldi. Seninle antrenman yapmak, kampına girmek istiyor. Yetenekli ama onu pek tanımıyorsun.", [v.ad]),
          secenekler: [L("Kampına al"), L("Mesafeli dur")],
        }),
        uygula: (s, i, v, ileri) => {
          if (i === 1) return L("Nazikçe geri çevirdin. {0} başka bir salona gitti.", [v.ad]);
          addStat(s.fighter.stats, 'iq', 1);
          ileri(2);
          return L("{0} kampına katıldı. Sparringler sert ve verimli: IQ +1.", [v.ad]);
        },
      },
      {
        kur: (s, v) => ({
          baslik: L("🐍 Sırtından Bıçak"),
          metin: L("{0} sessizce salondan ayrıldı ve bir rakibinin kampına geçti. Oyun planlarını, zayıf yönlerini, her şeyi anlatıyor olabilir.", [v.ad]),
          secenekler: [L("Kampı baştan kur ({0})", [$(olcek(s))]), L("Basına anlat"), L("Önemseme")],
        }),
        uygula: (s, i, v, ileri) => {
          ileri(3);
          if (i === 0) {
            s.para -= olcek(s);
            addStat(s.fighter.stats, 'iq', 1);
            return L("Yeni bir sistem kurdun, bütün kombinasyonları değiştirdin. Masraflı ama sürpriz yine sende: IQ +1.");
          }
          if (i === 1) {
            pop(s, 3);
            s.haberler.unshift(L("📰 İhanet: {0}, {1} ile yollarını ayırıp rakip kampa geçti.", [v.ad, s.fighter.soyad]));
            return L("Hikâyeni herkes konuştu. Taraftar senin yanında: popülerlik +3.");
          }
          mot(s, 1);
          return L("Önemsemedin; bu öfkeyi antrenmana taşıdın. Sonraki kampta motivasyon +1.");
        },
      },
      {
        kur: (s, v) => ({
          baslik: L("🎤 Meydan Okuma"),
          metin: L("{0} bir röportajda adını andı: “Onun bütün sırlarını biliyorum. Kafeste karşılaşsak iki raunt dayanamaz.” Telefonun susmuyor.", [v.ad]),
          secenekler: [L("Kafeste hesaplaşalım"), L("Cevap verme")],
        }),
        uygula: (s, i, v, ileri) => {
          if (i === 1) {
            mot(s, 1);
            return L("Sustun. Bazen en sert cevap sessizliktir. Motivasyon +1.");
          }
          v.dovus = 1;
          ileri(0);
          pop(s, 2);
          return L("“Kafes kapısında görüşürüz.” Bir sonraki rakip seçiminde {0} karşına çıkacak. Popülerlik +2.", [v.ad]);
        },
      },
      {
        kur: (s, v) =>
          v.sonuc === 'G'
            ? { baslik: L("🏁 Hesap Kapandı"), metin: L("{0} yerde, sen ayaktasın. Soyunma odasının kapısında seni bekliyordu: “Haklıydın. Sırlar değil, emek kazanıyor.”", [v.ad]), secenekler: [L("Elini sık"), L("Arkanı dön")] }
            : v.sonuc === 'M' || v.sonuc === 'B'
              ? { baslik: L("🩸 Acı Gece"), metin: L("{0} bu gece güldü. Eski salonunun önünden geçerken duvarda senin posterinin üstüne yazı yazılmış: “Öğrenci hocayı geçti.”", [v.ad]), secenekler: [L("Rövanş yemini et"), L("Ders olarak al")] }
              : { baslik: L("📰 Sahipsiz Kavga"), metin: L("Maç bir türlü yapılmadı. {0} her yerde “benden kaçtı” diyor. Taraftarların bir kısmı ona inanıyor.", [v.ad]), secenekler: [L("Umursama")] },
        uygula: (s, i, v) => {
          if (v.sonuc === 'G') {
            if (i === 0) {
              pop(s, 4);
              addStat(s.fighter.stats, 'iq', 1);
              return L("Kafeste rakip, kafes dışında centilmen. Herkes bu fotoğrafı paylaştı. Popülerlik +4, IQ +1.");
            }
            pop(s, 2);
            mot(s, 1);
            return L("Sözün bitti. Taraftar bu soğukluğa bayıldı. Popülerlik +2, motivasyon +1.");
          }
          if (v.sonuc === 'M' || v.sonuc === 'B') {
            mot(s, 2);
            if (i === 0) {
              pop(s, 2);
              return L("“Bir gün yine karşılaşacağız.” Bu öfke kampa yakıt oldu. Motivasyon +2, popülerlik +2.");
            }
            addStat(s.fighter.stats, 'iq', 1);
            return L("Kaseti yüz kez izledin. Nerede hata yaptığını artık biliyorsun. Motivasyon +2, IQ +1.");
          }
          pop(s, -2);
          return L("Bir süre konuşuldu, sonra unutuldu. Popülerlik -2.");
        },
      },
    ],
  },

  // 2) Ciddi sakatlıktan dönüş
  sakatlik: {
    kosul: (s) => s.sakatliklar.some((x) => x.hafta >= 5),
    adimlar: [
      {
        kur: (s) => {
          const inj = [...s.sakatliklar].sort((a, b) => b.hafta - a.hafta)[0];
          return {
            baslik: L("🏥 Kritik Karar"),
            metin: L("{0} ciddi görünüyor ({1} hafta). Doktorun iki yol sunuyor: ameliyat ya da uzun fizik tedavi. Hocan ise “ağrı kesiciyle devam, zaman kaybetme” diyor.", [inj.ad, inj.hafta]),
            secenekler: [L("Ameliyat ({0})", [$(olcek(s) * 1.5)]), L("Fizik tedavi ({0})", [$(olcek(s) * 0.4)]), L("Ağrı kesiciyle devam")],
          };
        },
        uygula: (s, i, v, ileri) => {
          const inj = [...s.sakatliklar].sort((a, b) => b.hafta - a.hafta)[0];
          ileri(2);
          if (!inj) return L("Sakatlık kendiliğinden toparlandı.");
          if (i === 0) {
            s.para -= olcek(s) * 1.5;
            inj.hafta = Math.max(1, inj.hafta - 4);
            v.yol = 'ameliyat';
            return L("Ameliyat başarılı geçti. İyileşme {0} hafta kısaldı.", [4]);
          }
          if (i === 1) {
            s.para -= olcek(s) * 0.4;
            inj.hafta = Math.max(1, inj.hafta - 2);
            v.yol = 'fizik';
            return L("Uzun ve sabır isteyen bir süreç başladı. İyileşme 2 hafta kısaldı.");
          }
          s.sakatliklar = s.sakatliklar.filter((x) => x !== inj);
          addStat(s.fighter.stats, inj.stat as StatKey, -2);
          v.yol = 'agri';
          return L("Ağrıyı bastırıp devam ettin. Hemen kafese dönebilirsin ama {0} kalıcı olarak -2.", [inj.ad]);
        },
      },
      {
        kur: (s, v) => {
          const won = s.gecmis[0]?.sonuc === 'G';
          return won
            ? {
                baslik: L("🔥 Geri Dönüş Hikâyesi"),
                metin: L("Sakatlıktan sonraki ilk galibiyetin manşetlerde: “Bitti denilen dövüşçü geri döndü!” Mikrofonlar sende."),
                secenekler: [L("Ekibine teşekkür et"), L("Eleştirenlere cevap ver")],
              }
            : {
                baslik: L("🌧️ Zor Dönüş"),
                metin: L("Sakatlık sonrası dönüş istediğin gibi olmadı. Bazıları “eskisi gibi değil” diyor. {0}", [v.yol === 'agri' ? L("Ağrı kesicilerle geçen haftaların bedeli ağır.") : '']),
                secenekler: [L("Daha çok çalış"), L("Kendine zaman tanı")],
              };
        },
        uygula: (s, i) => {
          const won = s.gecmis[0]?.sonuc === 'G';
          if (won) {
            if (i === 0) {
              mot(s, 1);
              return L("Ekibinle kucaklaştığın fotoğraf haftanın en çok paylaşılanı oldu. Motivasyon +1.");
            }
            if (chance(0.6)) {
              pop(s, 4);
              return L("Sözlerin manşet oldu. Popülerlik +4.");
            }
            pop(s, -2);
            return L("Sert çıkışın ters tepti; kibirli bulundun. Popülerlik -2.");
          }
          if (i === 0) {
            s.puan += 1;
            return L("Salona herkesten önce gelip en son çıkıyorsun. +1 gelişim puanı.");
          }
          s.saglik = clamp(s.saglik + 20, 0, 100);
          return L("Birkaç hafta aileyle, telefonsuz. Vücudun toparlandı: sağlık +20.");
        },
      },
    ],
  },

  // 3) Menajerin dolandırıcılığı
  menajer: {
    kosul: (s) => !!s.takim.menajer && s.para > 5000,
    baslat: (s) => ({ m: s.takim.menajer ?? '' }),
    adimlar: [
      {
        kur: (s, v) => ({
          baslik: L("🧾 Muhasebeci Uyarıyor"),
          metin: L("Muhasebecin hesaplarda tutmayan rakamlar buldu. Menajerin {0} bazı ödemeleri kendi şirketi üzerinden geçiriyor olabilir.", [v.m]),
          secenekler: [L("Araştırt ({0})", [$(olcek(s) * 0.3)]), L("Menajerime güveniyorum")],
        }),
        uygula: (s, i, v, ileri) => {
          ileri(2);
          if (i === 0) {
            s.para -= olcek(s) * 0.3;
            v.arastir = 1;
            return L("Bir mali müşavir tuttun. Sonuçlar birkaç hafta içinde gelecek.");
          }
          v.arastir = 0;
          return L("Menajerine güvenmeyi seçtin. Muhasebeci omuz silkti.");
        },
      },
      {
        kur: (s, v) => {
          const kayip = Math.round(Math.min(s.para * 0.12, olcek(s) * 4) / 100) * 100;
          v.kayip = kayip;
          return v.arastir
            ? {
                baslik: L("⚖️ Gerçek Ortaya Çıktı"),
                metin: L("Rapor net: {0} yıllar içinde senden {1} çekmiş. Ne yapacaksın?", [v.m, $(kayip)]),
                secenekler: [L("Dava aç"), L("Sessizce anlaş"), L("Affet, devam et")],
              }
            : {
                baslik: L("💸 Hesap Boşaldı"),
                metin: L("{0} ortadan kayboldu, telefonları kapalı. Hesabından {1} eksik.", [v.m, $(kayip)]),
                secenekler: [L("Yeni bir sayfa aç")],
              };
        },
        uygula: (s, i, v) => {
          const kayip = Number(v.kayip);
          const kov = () => {
            s.takim.menajer = null;
            s.takim.menajerKalite = 0;
            s.takim.menajerPay = 0;
          };
          if (!v.arastir) {
            s.para -= kayip;
            kov();
            s.haberler.unshift(L("📰 {0} menajeri tarafından dolandırıldı.", [s.fighter.soyad]));
            return L("Ders pahalıya patladı: -{0}. Artık menajerin yok.", [$(kayip)]);
          }
          if (i === 0) {
            s.para += Math.round(kayip * 0.6);
            pop(s, 2);
            kov();
            return L("Mahkeme senden yana karar verdi: {0} geri geldi. Hikâyen herkese örnek oldu. Popülerlik +2.", [$(kayip * 0.6)]);
          }
          if (i === 1) {
            s.para += Math.round(kayip * 0.35);
            kov();
            return L("Sessiz bir anlaşma: {0} geri aldın ve yollarını ayırdın.", [$(kayip * 0.35)]);
          }
          mot(s, -1);
          return L("Affettin. Menajerin minnettar ama ekipte bir şey kırıldı. Motivasyon -1.");
        },
      },
    ],
  },

  // 4) Babanın ringe dönüş hayali
  baba: {
    kosul: (s) => s.gecmis.length >= 5 && s.para > 2000,
    adimlar: [
      {
        kur: () => ({
          baslik: L("🥊 Babanın Hayali"),
          metin: L("Baban gençliğinde amatör boksörmüş. Şimdi 58 yaşında, bir yardım gecesinde son bir kez ringe çıkmak istiyor. Senden destek bekliyor."),
          secenekler: [L("Destekle, onu çalıştır"), L("Vazgeçirmeye çalış")],
        }),
        uygula: (s, i, v, ileri) => {
          ileri(1);
          v.destek = i === 0 ? 1 : 0;
          if (i === 0) {
            mot(s, 1);
            return L("Sabah koşularına artık baban da geliyor. Salonda herkes ona “Usta” diyor. Motivasyon +1.");
          }
          return L("Ona riskleri anlattın. Sessizce dinledi, bir şey demedi.");
        },
      },
      {
        kur: (s, v) => {
          if (!v.destek)
            return {
              baslik: L("💔 Kırgın Bir Baba"),
              metin: L("Baban yardım gecesine çıkmadı ama sana kırgın: “Sen kendi yolunu seçtin, ben de bir kez seçmek istemiştim.”"),
              secenekler: [L("Özür dile, onu bir sonraki maçına davet et"), L("Zamanla geçer")],
            };
          v.iyi = chance(0.6) ? 1 : 0;
          return v.iyi
            ? {
                baslik: L("🎉 Babanın Gecesi"),
                metin: L("Baban üç raunt boyunca dimdik durdu ve salon ayağa kalktı! Onu ringte kucakladığın video her yerde."),
                secenekler: [L("Onunla gurur duy")],
              }
            : {
                baslik: L("🏥 Zor Bir Gece"),
                metin: L("Baban ikinci rauntta düştü. İyi, ama bir gece hastanede kalacak. Masraflar {0}.", [$(olcek(s) * 0.5)]),
                secenekler: [L("Yanında ol")],
              };
        },
        uygula: (s, i, v) => {
          if (!v.destek) {
            if (i === 0) {
              mot(s, 1);
              return L("Maç gecesi baban ilk sıradaydı. Aranızdaki buz eridi. Motivasyon +1.");
            }
            mot(s, -1);
            return L("Aranızdaki mesafe büyüdü. Motivasyon -1.");
          }
          if (v.iyi) {
            pop(s, 4);
            mot(s, 1);
            return L("Baba-evlat hikâyesi herkesin yüreğine dokundu. Popülerlik +4, motivasyon +1.");
          }
          s.para -= olcek(s) * 0.5;
          mot(s, 1);
          return L("Sabaha kadar yanındaydın. Taburcu olurken gülümsedi: “Değdi.” Motivasyon +1.");
        },
      },
    ],
  },

  // 5) Emekli efsanenin son öğrencisi
  efsane: {
    kosul: (s) => s.gecmis.length >= 6 && s.stage !== 'amator',
    baslat: (s) => ({ ad: isim(s) }),
    adimlar: [
      {
        kur: (s, v) => ({
          baslik: L("👴 Salondaki Yaşlı Adam"),
          metin: L("Bir haftadır her sabah salonun köşesinde biri seni izliyor. Sonunda öğreniyorsun: {0}, yıllar önce kemerini bırakmadan emekli olan efsane. Yanına gelip yalnızca “Ayakların yanlış.” diyor.", [v.ad]),
          secenekler: [L("Ondan ders iste"), L("Teşekkür et, yoluna devam et")],
        }),
        uygula: (s, i, v, ileri) => {
          if (i === 1) return L("{0} başını salladı ve bir daha gelmedi. Bazı kapılar bir kez açılır.", [v.ad]);
          addStat(s.fighter.stats, 'iq', 1);
          ileri(1);
          return L("İlk ders bir saat sürdü, tek bir yumruk bile atmadın. Sadece ayak. IQ +1.");
        },
      },
      {
        kur: (s, v) => ({
          baslik: L("⛰️ Dağ Kampı"),
          metin: L("{0} seni bir haftalığına köyündeki eski ahıra götürüyor. Telefon yok, ayna yok. “Neyi düzeltmek istiyorsun?” diye soruyor.", [v.ad]),
          secenekler: [L("Vuruşlarımı: odun ve kum torbası"), L("Güreşimi: köyün pehlivanlarıyla"), L("Kafamı: sessizlik ve nefes")],
        }),
        uygula: (s, i, v, ileri) => {
          ileri(2);
          const st: StatKey = (['vurus', 'gures', 'iq'] as const)[i];
          addStat(s.fighter.stats, st, 2);
          return [
            L("Bir hafta boyunca balta salladın. Yumrukların artık başka ses çıkarıyor. Vuruş +2."),
            L("Köyün pehlivanları seni her gün çimene gömdü. Sonra sen onları. Güreş +2."),
            L("Gün doğumunda nefes, gün batımında sessizlik. Kafes artık o kadar gürültülü gelmiyor. IQ +2."),
          ][i];
        },
      },
      {
        kur: (s, v) => ({
          baslik: L("🏥 Hastane Koridoru"),
          metin: L("{0} kalp krizi geçirdi. Durumu iyi ama yorgun. Elini tutup fısıldıyor: “Bir sonraki maçında köşende olmak istiyordum…”", [v.ad]),
          secenekler: [L("Maçı ona ada"), L("Kampı bırak, yanında kal")],
        }),
        uygula: (s, i, v, ileri) => {
          ileri(1);
          if (i === 0) {
            v.ada = 1;
            mot(s, 2);
            return L("Eldivenlerinin üstüne onun adını yazdırdın. Motivasyon +2.");
          }
          mot(s, 1);
          addStat(s.fighter.stats, 'kondisyon', -1);
          return L("Bir hafta hastane koridorunda uyudun. Antrenman aksadı ama içindeki bir şey yerine oturdu. Motivasyon +1, kondisyon -1.");
        },
      },
      {
        kur: (s, v) => ({
          baslik: L("✉️ Son Ders"),
          metin:
            s.gecmis[0]?.sonuc === 'G'
              ? L("O gece {0} hastane odasında maçını izlemiş. Hemşire, kazandığın anda yatağından doğrulduğunu anlatıyor. Sana bir zarf bırakmış.", [v.ad])
              : L("{0} maçını hastane odasında izlemiş. Kaybettin ama ertesi sabah sana bir zarf göndermiş.", [v.ad]),
          secenekler: [L("Zarfı aç")],
        }),
        uygula: (s, i, v) => {
          const n = v.ada ? 4 : 2;
          addStat(s.fighter.stats, 'iq', 1);
          pop(s, n);
          return s.gecmis[0]?.sonuc === 'G'
            ? L("“Ayakların artık doğru. Gerisi senin.” Mektubu çerçeveletip salonun duvarına astın. IQ +1, popülerlik +{0}.", [n])
            : L("“Kaybetmek, ayaklarını yeniden bulmaktır. Yarın sabah altıda salondayım.” Ve oradaydı. IQ +1, popülerlik +{0}.", [n]);
        },
      },
    ],
  },

  // 6) Mahalleden bir çocuk
  mahalle: {
    kosul: (s) => s.gecmis.length >= 4 && s.populerlik >= 20,
    // Metin bir oğlan çocuğunu anlatır: kadın kariyerinde de erkek adı.
    baslat: (s) => ({ ad: pick(pick(NAME_POOLS.filter((x) => (s.fighter.uyruk === 'tr' ? x.ulke === L("Türkiye") : true))).ad) }),
    adimlar: [
      {
        kur: (s, v) => ({
          baslik: L("✏️ Bir Mektup"),
          metin: L("Memleketinden on iki yaşında bir çocuk yazmış: “Adım {0}. Okulda bana vuruyorlar. Senin gibi olmak istiyorum. Bana bir şey öğretir misin?” Mektubun köşesinde senin bir çizimin var.", [v.ad]),
          secenekler: [L("Mahalleye git ({0})", [$(olcek(s) * 0.2)]), L("İmzalı eldiven gönder")],
        }),
        uygula: (s, i, v, ileri) => {
          if (i === 1) {
            pop(s, 1);
            return L("Eldiveni alınca annesi bir video gönderdi: {0} eldivenlerle uyuyor. Popülerlik +1.", [v.ad]);
          }
          s.para -= olcek(s) * 0.2;
          mot(s, 1);
          ileri(2);
          return L("Mahalle sahasında yüz çocuk seni bekliyordu. {0} en öndeydi, elini hiç bırakmadı. Motivasyon +1.", [v.ad]);
        },
      },
      {
        kur: (s, v) => ({
          baslik: L("🚨 Kötü Haber"),
          metin: L("{0} adlı çocuğun annesi aradı. Oğlu mahalledeki bir çeteyle takılmaya başlamış, dün gece karakoldan almışlar. “Seni dinler” diyor.", [v.ad]),
          secenekler: [L("Onu salona yazdır ({0})", [$(olcek(s) * 0.5)]), L("Telefonla konuş")],
        }),
        uygula: (s, i, v, ileri) => {
          ileri(3);
          if (i === 0) {
            s.para -= olcek(s) * 0.5;
            v.salon = 1;
            pop(s, 2);
            return L("Bir yıllık salon üyeliğini ödedin. Hocası “ilk hafta üç kez kustu ama bırakmadı” diyor. Popülerlik +2.");
          }
          return L("Bir saat konuştunuz. Sonunda “Tamam abi” dedi. Ne kadar sürer, bilinmez.");
        },
      },
      {
        kur: (s, v) =>
          v.salon
            ? { baslik: L("🥇 İlk Madalya"), metin: L("{0} bölge çocuk güreş turnuvasında finale çıktı. Maçtan önce sana bir ses kaydı gönderiyor: “Seni hep izledim, bugün sen beni izle.”", [v.ad]), secenekler: [L("Canlı izle, ekrana bağır")] }
            : { baslik: L("📸 Bir Fotoğraf"), metin: L("{0} adlı çocuğun annesi bir fotoğraf gönderdi: Oğlu okul takımına girmiş. Arkasında senin posterin.", [v.ad]), secenekler: [L("Kısa bir video mesajı çek")] },
        uygula: (s, i, v) => {
          if (v.salon) {
            pop(s, 4);
            mot(s, 1);
            s.haberler.unshift(L("📰 {0} adlı dövüşçünün desteklediği çocuk madalyayla döndü: “Abim gibi olacağım.”", [s.fighter.soyad]));
            return L("{0} altın madalyayı boynunda sana gösterdi. Video milyonlarca izlendi. Popülerlik +4, motivasyon +1.", [v.ad]);
          }
          pop(s, 2);
          return L("Videoyu bütün okul izlemiş. {0} artık “kafesteki abinin kardeşi”. Popülerlik +2.", [v.ad]);
        },
      },
    ],
  },
};

/** Bölüm ekranı için hikâye adı, simgesi ve rengi. */
export const STORY_META: Record<string, { ad: string; ikon: string; renk: string }> = {
  ihanet: { ad: L("İHANET"), ikon: 'knife', renk: '#e63946' },
  sakatlik: { ad: L("DÖNÜŞ"), ikon: 'bandage', renk: '#3aa8ff' },
  menajer: { ad: L("KİRLİ HESAPLAR"), ikon: 'briefcase-variant', renk: '#f4a261' },
  baba: { ad: L("BABANIN HAYALİ"), ikon: 'account-heart', renk: '#c792ea' },
  efsane: { ad: L("SON ÖĞRENCİ"), ikon: 'account-star', renk: '#f2c14e' },
  mahalle: { ad: L("MAHALLEDEN BİR ÇOCUK"), ikon: 'human-child', renk: '#39d98a' },
};

export const storyLength = (id: string) => HIKAYELER[id]?.adimlar.length ?? 1;

const storyOppId = (id: string) => `hikaye-${id}`;

/** Hikâye maçı bekleniyorsa rakip bilgisi (career.findNextFight rakip listesine ekler). */
export function storyRival(s: GameState): { id: string; ad: string; soyad: string; etiket: string; risk: string } | null {
  const h = s.hikaye;
  if (!h || h.veri.dovus !== 1) return null;
  h.veri.teklif = Number(h.veri.teklif ?? 0) + 1;
  const [ad, ...rest] = String(h.veri.ad).split(' ');
  return {
    id: storyOppId(h.id),
    ad,
    soyad: rest.join(' ') || ad,
    etiket: L("📖 HİKÂYE MAÇI"),
    risk: L("Bu maç bir hikâyenin parçası. Sonucu hikâyenin sonunu belirleyecek."),
  };
}

/** Zamanı gelen hikâye adımı (ya da yeni başlayan bir hikâye) varsa olay olarak döndürür. */
export function storyEvent(s: GameState): GameEventState | null {
  const done = new Set(s.hikayeler ?? []);
  let h = s.hikaye;
  if (!h) {
    // Yeni hikâye: en az 3 dövüş, son hikâyeden sonra en az 4 dövüş; sakatlık hikâyesi öncelikli.
    const son = s.hikayeSon ?? -99;
    if (fights(s) < 3 || fights(s) - son < 4) return null;
    const uygun = Object.entries(HIKAYELER).filter(([id, x]) => !done.has(id) && x.kosul(s));
    if (!uygun.length) return null;
    const sak = uygun.find(([id]) => id === 'sakatlik');
    const [id, def] = sak && chance(0.7) ? sak : chance(0.18) ? pick(uygun) : [null, null];
    if (!id || !def) return null;
    h = s.hikaye = { id, adim: 0, zaman: fights(s), veri: def.baslat?.(s) ?? {} };
  }
  if (fights(s) < h.zaman) return null;
  if (h.veri.dovus === 1) {
    // Hikâye maçı: yapılana kadar (en fazla iki teklif) bekle; sonra sonuçla devam et.
    const fought = s.gecmis[0]?.rakipId === storyOppId(h.id);
    if (!fought && Number(h.veri.teklif ?? 0) < 2) return null;
    h.veri.dovus = 2;
    h.veri.sonuc = fought ? s.gecmis[0].sonuc : 'yok';
  }
  const def = HIKAYELER[h.id];
  const step = def?.adimlar[h.adim];
  if (!step) {
    s.hikaye = null;
    return null;
  }
  return { id: `hikaye:${h.id}:${h.adim}`, ...step.kur(s, h.veri), params: {} };
}

/** Hikâye adımında seçim: sonuç metni, sonraki adım ya da bitiş. */
export function chooseStory(s: GameState, secim: number): string {
  const h = s.hikaye!;
  const step = HIKAYELER[h.id].adimlar[h.adim];
  let sonraki: number | null = null;
  const sonuc = step.uygula(s, secim, h.veri, (d) => (sonraki = d));
  const kayit = (s.hikayeKayit ??= {});
  const k = (kayit[h.id] ??= { bolumler: [] });
  const ev = s.pending.olay;
  k.bolumler.push({ baslik: ev?.baslik ?? '', secim: ev?.secenekler[secim] ?? '', sonuc });
  if (sonraki != null && h.adim + 1 < HIKAYELER[h.id].adimlar.length) {
    h.adim += 1;
    h.zaman = fights(s) + sonraki;
  } else {
    s.hikayeler = [...(s.hikayeler ?? []), h.id];
    k.bitti = true;
    s.hikayeSon = fights(s);
    s.hikaye = null;
  }
  return sonuc;
}

export const STORY_IDS = Object.keys(HIKAYELER);
