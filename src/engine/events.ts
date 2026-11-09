import { L, LOC } from '../i18n';
import { addStat } from './character';
import { ligAcik } from './amateurLeague';
import { randomInjury } from './camp';
import { AGENTS, JOURNALISTS } from './data';
import { gymsFor } from './gyms';
import { applyGym } from './team';
import { OWNER_EVENTS } from './owners';
import { chooseStory, storyEvent } from './stories';
import { chooseFamily, familyMoment } from './family';
import { chooseCoach, coachScene } from './coachBond';
import { chooseMedia, mediaOffer } from './media';
import { chooseEra, eraDecision } from './eras';
import { chooseLetter, maybeLetter } from './letters';
import { banned, dopingActive, dopingCost, DOPING_FIGHTS, takeDoping } from './doping';
import { chance, clamp, fill, pick, rand, weighted } from './rng';
import type { GameState } from './types';

type Params = Record<string, string | number>;

interface EventDef {
  kosul: (s: GameState) => boolean;
  agirlik: number;
  kur: (s: GameState) => { baslik: string; metin: string; secenekler: string[]; params: Params };
  uygula: (s: GameState, secim: number, p: Params) => string;
}

const $ = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;
const pop = (s: GameState, d: number) => (s.populerlik = clamp(s.populerlik + d, 0, 100));

const BRANDS = [L("Kuvvet Protein"), L("Arslan Enerji İçeceği"), L("Kafes Giyim"), L("Nokta Bahis (!)"), L("Demir Spor Ekipmanları"), L("Yıldız Döner")];

const EVENTS: Record<string, EventDef> = {
  amKulup: {
    kosul: (s) => ligAcik(s) && s.gecmis.length >= 1 && !s.amLig!.kulup,
    agirlik: 6,
    kur: () => ({
      baslik: L("🥋 Hangi Kulüp?"),
      metin: L("Şehir Ligi'nde adın duyuldu. Üç kulüp seni antrenmana çağırıyor. Yerin belli olsun, sonrası kolay."),
      secenekler: [L("Mahalle salonu: herkes tanır"), L("Güreş kulübü: minderde ter"), L("Kick boks kulübü: ayakta keskinlik")],
      params: {},
    }),
    uygula: (s, i) => {
      s.amLig!.kulup = true;
      if (i === 0) {
        pop(s, 3);
        return L("Mahalle arkana geçti. Popülerlik +3.");
      }
      const k = i === 1 ? 'gures' : 'vurus';
      addStat(s.fighter.stats, k, 2);
      return i === 1 ? L("Her gün minderdesin. Güreş +2.") : L("Eller hızlandı. Vuruş +2.");
    },
  },
  amIs: {
    kosul: (s) => ligAcik(s) && s.gecmis.length >= 2 && s.gecmis.length - (s.amLig!.isSon ?? -9) >= 4 && s.para < 2500,
    agirlik: 3,
    kur: () => ({
      baslik: L("🧰 Yarı Zamanlı İş"),
      metin: L("Amatörde para yok, fatura var. Bir tanıdık bu ay gece vardiyası öneriyor."),
      secenekler: [L("Vardiyayı al: +$700, biraz yorgunluk"), L("Antrenmanda kal: +1 gelişim puanı")],
      params: {},
    }),
    uygula: (s, i) => {
      s.amLig!.isSon = s.gecmis.length;
      if (i === 0) {
        s.para += 700;
        s.saglik = clamp(s.saglik - 6, 0, 100);
        return L("Vardiyalar zor ama kasa doldu. +$700, sağlık -6.");
      }
      s.puan += 1;
      return L("Salondan çıkmadın. +1 gelişim puanı.");
    },
  },
  amMilli: {
    kosul: (s) => ligAcik(s) && s.amLig!.basamak >= 1 && !s.amLig!.milli,
    agirlik: 4,
    kur: () => ({
      baslik: L("🎽 Milli Takım Daveti"),
      metin: L("Federasyon seni milli takım kampına çağırdı. Sert bir hafta, ama herkesin gözü üstünde olacak."),
      secenekler: [L("Kampa git: popülerlik ve tecrübe"), L("Lige odaklan: dinlen")],
      params: {},
    }),
    uygula: (s, i) => {
      s.amLig!.milli = true;
      if (i === 0) {
        pop(s, 4);
        addStat(s.fighter.stats, 'iq', 2);
        s.saglik = clamp(s.saglik - 8, 0, 100);
        return L("Forma sırtında! Popülerlik +4, IQ +2, sağlık -8.");
      }
      s.saglik = clamp(s.saglik + 8, 0, 100);
      return L("Daveti kibarca geri çevirdin. Sağlık +8.");
    },
  },
  amTarti: {
    kosul: (s) => ligAcik(s) && s.gecmis.length >= 3 && !s.amLig!.tarti,
    agirlik: 2,
    kur: () => ({
      baslik: L("⚖️ Lig Tartısı"),
      metin: L("Lig hakemi habersiz tartı yaptı: 600 gram fazlan var. Saunaya mı girersin, cezayı mı ödersin?"),
      secenekler: [L("Sauna: sağlık -5"), L("Ceza öde: -$200")],
      params: {},
    }),
    uygula: (s, i) => {
      s.amLig!.tarti = true;
      if (i === 0) {
        s.saglik = clamp(s.saglik - 5, 0, 100);
        return L("Terledin ve kiloyu verdin. Sağlık -5.");
      }
      s.para -= 200;
      return L("Cezayı ödedin, kiloyu da unutmadın. -$200.");
    },
  },
  amGazete: {
    kosul: (s) => ligAcik(s) && s.amator.g >= 2 && !s.amLig!.gazete,
    agirlik: 2,
    kur: () => ({
      baslik: L("📰 Yerel Gazete"),
      metin: L("Şehrin gazetesi seni yazmak istiyor. Fotoğrafçı kapıda."),
      secenekler: [L("Kendinden emin konuş"), L("Alçakgönüllü kal")],
      params: {},
    }),
    uygula: (s, i) => {
      s.amLig!.gazete = true;
      pop(s, i === 0 ? 3 : 2);
      return i === 0 ? L("Manşet: \"Hedefim UCC.\" Popülerlik +3.") : L("Herkes seni sevdi. Popülerlik +2.");
    },
  },
  doping: {
    kosul: (s) => !dopingActive(s) && !banned(s) && s.para >= dopingCost(s),
    agirlik: 1.2,
    kur: (s) => {
      const tutar = dopingCost(s);
      const kim = pick([
        L("Salonun karanlık köşesinde tanımadığın bir adam yanına yaklaştı"),
        L("Yeni tanıştığın bir “performans koçu” seni kenara çekti"),
        L("Takım arkadaşının kuzeni olduğunu söyleyen biri mesaj attı"),
        L("Kampta bir sağlık danışmanı fısıldayarak konuştu"),
      ]);
      return {
        baslik: L("💉 Karanlık Bir Teklif"),
        metin: L("{0}: “Bu kür seni {1} dövüş boyunca canavara çevirir. Testlerde çıkmaz… genelde.” Fiyatı {2}.\n\nKabul edersen vuruş, kondisyon, hız ve çene ciddi artar. Yakalanırsan 6 ay ile 2 yıl arası men, popülerlik kaybı ve sponsor iptali.", [kim, DOPING_FIGHTS, $(tutar)]),
        secenekler: [L("Kabul et"), L("Reddet"), L("Federasyona ihbar et")],
        params: { tutar },
      };
    },
    uygula: (s, i) => {
      if (i === 0) {
        takeDoping(s);
        return L("Kürü aldın. Aynada başka biri var. Sonraki {0} dövüşte çok güçlüsün… ama her dövüşten sonra test riski var.", [DOPING_FIGHTS]);
      }
      if (i === 1) return L("Kibarca reddettin. Temiz bir kariyer, huzurlu bir uyku.");
      pop(s, 2);
      return L("Federasyona ihbar ettin. Basın seni “temiz sporun sesi” ilan etti. Popülerlik +2.");
    },
  },
  sponsor: {
    kosul: (s) => s.populerlik >= 8,
    agirlik: 1,
    kur: (s) => {
      const tutar = Math.round((500 + s.populerlik * 120 * { amator: 0.3, bolgesel: 1, buyuk: 3, ufc: 6 }[s.stage]) / 100) * 100;
      const marka = pick(BRANDS);
      return {
        baslik: L("💼 Sponsorluk Teklifi"),
        metin: L("{0} seninle çalışmak istiyor. Şortunda logoları olacak, karşılığında {1} ödeyecekler.{2}", [marka, $(tutar), marka.includes(L("Bahis")) ? L("\n\nAma bir bahis şirketi… Bazı taraftarların hoşuna gitmeyebilir.") : '']),
        secenekler: [L("Kabul et"), L("Pazarlık yap (+%50 dene)"), L("Reddet")],
        params: { tutar, marka },
      };
    },
    uygula: (s, i, p) => {
      const t = Number(p.tutar);
      const bahis = String(p.marka).includes(L("Bahis"));
      if (i === 0) {
        s.para += t;
        if (bahis) pop(s, -2);
        return L("{0} ile anlaştın. +{1}{2}", [p.marka, $(t), bahis ? L(" (Bazı taraftarlar tepkili: popülerlik -2)") : '']);
      }
      if (i === 1) {
        if (chance(0.35 + s.takim.menajerKalite * 0.05)) {
          s.para += t * 1.5;
          return L("Sıkı pazarlık işe yaradı! +{0}", [$(t * 1.5)]);
        }
        return L("{0} masadan kalktı. \"Başka dövüşçüler de var.\"", [p.marka]);
      }
      return L("Teklifi reddettin. İmajın temiz kaldı.");
    },
  },
  viral: {
    kosul: () => true,
    agirlik: 2,
    kur: () => ({
      baslik: L("📱 Viral Video"),
      metin: L("Antrenmanda sparring partnerini uyuttuğun bir video 2 milyon izlendi. Yorumlar ikiye bölünmüş durumda. Ne paylaşırsın?"),
      secenekler: [L("Sıklettekilere laf at"), L("Mütevazı bir teşekkür yaz"), L("Görmezden gel")],
      params: {},
    }),
    uygula: (s, i) => {
      if (i === 0) {
        if (chance(0.6)) {
          pop(s, 5);
          return L("Paylaşımın ortalığı yıktı. Rakipler cevap yazıyor, gazeteciler seni arıyor. Popülerlik +5.");
        }
        pop(s, -3);
        return L("Kibirli buldular. \"Önce bir kemer kazan\" yorumları ağır bastı. Popülerlik -3.");
      }
      if (i === 1) {
        pop(s, 2);
        return L("Samimi mesajın sevildi. Popülerlik +2.");
      }
      return L("Hiçbir şey yazmadın. Video kendi kendine yayılmaya devam etti. Popülerlik +1.");
    },
  },
  salon: {
    kosul: (s) => s.stage !== 'amator' && gymsFor('elit').some((g) => g.kalite > s.takim.antrenorKalite),
    agirlik: 2,
    kur: (s) => {
      const gym = pick(gymsFor('elit').filter((g) => g.kalite > s.takim.antrenorKalite));
      return {
        baslik: L("🏟️ Salon Değiştirme Fırsatı"),
        metin: L("{0} baş antrenörü {1} seni takımında görmek istiyor (kalite {2}/10). Davetli olduğun için geçiş ücreti yarı fiyat: {3}.\n\nŞu anki hocan {4} (kalite {5}/10) seni sıfırdan yetiştirdi.", [gym.salon, gym.antrenor, gym.kalite, $(Math.round(gym.imza / 2)), s.takim.antrenor, s.takim.antrenorKalite]),
        secenekler: [L("Taşın"), L("Kal, sadakat önemli")],
        params: { id: gym.id, salon: gym.salon, maliyet: Math.round(gym.imza / 2) },
      };
    },
    uygula: (s, i, p) => {
      if (i === 0) {
        if (s.para < Number(p.maliyet)) return L("Paran yetmiyor ({0} gerekli). Fırsat kaçtı.", [$(Number(p.maliyet))]);
        const eski = s.takim.antrenor;
        s.para -= Number(p.maliyet);
        const gym = gymsFor('elit').find((x) => x.id === p.id);
        if (gym) applyGym(s, gym);
        return L("Yeni evin: {0}. {1} telefonda sessizce \"Başarılar evlat\" dedi ve kapattı.", [p.salon, eski]);
      }
      s.motivasyon = 2;
      return L("Kaldın. Hocan gözleri dolarak sarıldı. Sonraki kampta ekstra motivasyonla çalışacaksın.");
    },
  },
  menajer: {
    kosul: (s) => s.stage !== 'amator' && !s.takim.menajer,
    agirlik: 3,
    kur: (s) => {
      const uygun = AGENTS.filter((a) => a.kalite <= 4 + Math.floor(s.populerlik / 12));
      const a = pick(uygun.length ? uygun : AGENTS.slice(0, 1));
      return {
        baslik: L("🤝 Menajer Teklifi"),
        metin: L("Menajer {0} (kalite {1}/10) seni temsil etmek istiyor. Tüm kazançlarından %{2} alacak. Karşılığında kontrat pazarlıkları ve sponsorluklar çok daha kolay olacak.", [a.ad, a.kalite, Math.round(a.pay * 100)]),
        secenekler: [L("Anlaş"), L("Kendi işimi kendim yaparım")],
        params: { ad: a.ad, kalite: a.kalite, pay: a.pay },
      };
    },
    uygula: (s, i, p) => {
      if (i === 0) {
        s.takim.menajer = String(p.ad);
        s.takim.menajerKalite = Number(p.kalite);
        s.takim.menajerPay = Number(p.pay);
        return L("{0} artık menajerin. İlk sözü: \"Bir daha asla ucuza dövüşmeyeceksin.\"", [p.ad]);
      }
      return L("Tek başına devam ediyorsun. Kazancın tamamen senin, ama masada yalnızsın.");
    },
  },
  aile: {
    kosul: (s) => s.para > 1500,
    agirlik: 2,
    kur: (s) => {
      const tutar = Math.round((s.para * (0.2 + rand() * 0.15)) / 100) * 100;
      return {
        baslik: L("🏠 Aileden Bir Telefon"),
        metin: L("Kardeşin arıyor. Babanın ameliyatı var ve {0} lazım. Sesi titriyor.", [$(tutar)]),
        secenekler: [L("Hepsini gönder"), L("Yarısını gönder"), L("Şu an yapamam")],
        params: { tutar },
      };
    },
    uygula: (s, i, p) => {
      const t = Number(p.tutar);
      if (i === 0) {
        s.para -= t;
        s.motivasyon = 2;
        return L("Parayı gönderdin. Ameliyat başarılı geçti. Babanın mesajı: \"Oğlumla gurur duyuyorum.\" Motivasyonun tavan.");
      }
      if (i === 1) {
        s.para -= t / 2;
        s.motivasyon = 1;
        return L("Yarısını gönderdin, gerisini akrabalar tamamladı. İçin rahat.");
      }
      s.motivasyon = -1;
      return L("Yapamadığını söyledin. Telefonu kapattıktan sonra uzun süre tavana baktın. Motivasyon düştü.");
    },
  },
  dogumgunu: {
    kosul: (s) => (s.cocuklar ?? []).length > 0,
    agirlik: 1.5,
    kur: (s) => {
      const c = pick(s.cocuklar!);
      return {
        baslik: L("🎂 Doğum Günü"),
        metin: L("{0} bugün bir yaş daha büyüdü. Ama aynı saatte sponsorun açık antrenmanı var, kameralar seni bekliyor.", [c.ad]),
        secenekler: [L("Doğum gününe git"), L("Açık antrenmana git")],
        params: { ad: c.ad },
      };
    },
    uygula: (s, i, p) => {
      if (i === 0) {
        s.motivasyon = Math.min(2, s.motivasyon + 1);
        pop(s, -1);
        return L("Pastayı {0} ile birlikte kestiniz. O gözlerdeki ışık her şeye değdi. (Motivasyon +1, popülerlik -1)", [p.ad]);
      }
      s.motivasyon = Math.max(-2, s.motivasyon - 1);
      pop(s, 2);
      return L("Kameralar mutluydu, sponsor da. Ama eve döndüğünde parti bitmişti. (Popülerlik +2, motivasyon -1)");
    },
  },
  parti: {
    kosul: (s) => s.populerlik >= 20,
    agirlik: 1,
    kur: () => ({
      baslik: L("🍾 Ünlüler Partisi"),
      metin: L("Bir rapçinin partisine davetlisin. Kameralar, ünlüler, sabaha kadar eğlence. Kampa iki hafta var."),
      secenekler: [L("Git, görün"), L("Kibarca reddet")],
      params: {},
    }),
    uygula: (s, i) => {
      if (i === 1) return L("Evde kaldın, erkenden yattın. Sıkıcı ama profesyonel.");
      if (chance(0.35)) {
        pop(s, -4);
        s.saglik = clamp(s.saglik - 8, 0, 100);
        return L("Gece kontrolden çıktı: bir kavga videosu sızdı. Magazin manşetlerindesin. Popülerlik -4, sağlık -8.");
      }
      pop(s, 3);
      return L("Ünlülerle fotoğrafların her yerde. Yeni bir kitleye ulaştın. Popülerlik +3.");
    },
  },
  araba: {
    kosul: (s) => s.para > 20000,
    agirlik: 1,
    kur: (s) => {
      const fiyat = Math.round((s.para * 0.4) / 1000) * 1000;
      return {
        baslik: L("🏎️ Hayalindeki Araba"),
        metin: L("Galeride o spor araba seni bekliyor: {0}. Çocukken posterini duvarına asmıştın.", [$(fiyat)]),
        secenekler: [L("Al, bunu hak ettin"), L("Parayı biriktir")],
        params: { fiyat },
      };
    },
    uygula: (s, i, p) => {
      if (i === 0) {
        s.para -= Number(p.fiyat);
        pop(s, 2);
        return L("Anahtarları aldın. Instagram paylaşımın patladı. Popülerlik +2. Banka hesabın ise ağlıyor.");
      }
      return L("Parayı biriktirdin. Kariyer uzun, sakatlık bir anda gelir.");
    },
  },
  sparring: {
    kosul: () => true,
    agirlik: 2,
    kur: () => ({
      baslik: L("🥊 Sert Sparring"),
      metin: L("Salona gelen deneyimli bir veteran seninle sert sparring yapmak istiyor. Çok şey öğrenebilirsin, ama hiç yavaşlamıyor."),
      secenekler: [L("Kabul et, sonuna kadar git"), L("Teknik sparring olsun de"), L("Reddet")],
      params: {},
    }),
    uygula: (s, i) => {
      if (i === 0) {
        const g = addStat(s.fighter.stats, 'iq', 2);
        if (chance(0.25)) {
          const inj = randomInjury(2, 5);
          s.sakatliklar.push(inj);
          return L("Çok şey öğrendin (IQ +{0}), ama bedeli ağır: {1} ({2} hafta).", [g, inj.ad, inj.hafta]);
        }
        return L("Yıpratıcıydı ama paha biçilmez. IQ +{0}.", [g]);
      }
      if (i === 1) {
        const g = addStat(s.fighter.stats, 'iq', 1);
        return L("Kontrollü bir çalışma. Tecrübesinden faydalandın. IQ +{0}.", [g]);
      }
      return L("Reddettin. Veteran omuz silkip gitti.");
    },
  },
  hayir: {
    kosul: (s) => s.para > 1000,
    agirlik: 1,
    kur: (s) => ({
      baslik: L("❤️ Memleketten Davet"),
      metin: L("{0}’teki çocuklar için bir spor okulu açılıyor. Kurdele kesmen ve $500 bağış yapman isteniyor.", [s.fighter.memleket]),
      secenekler: [L("Git ve bağış yap"), L("Maalesef vaktim yok")],
      params: {},
    }),
    uygula: (s, i) => {
      if (i === 0) {
        s.para -= 500;
        pop(s, 4);
        s.motivasyon = 1;
        return L("Çocukların gözlerindeki ışık her şeye değdi. Yerel basın seni manşet yaptı. Popülerlik +4.");
      }
      pop(s, -1);
      return L("Gidemedin. Bir yerel gazete bunu \"unuttu köklerini\" diye yazdı. Popülerlik -1.");
    },
  },
  gazeteci: {
    kosul: (s) => s.stage !== 'amator',
    agirlik: 2,
    kur: (s) => {
      const g = pick(JOURNALISTS);
      const rival = s.rakipler[0];
      return {
        baslik: L("🎙️ Röportaj"),
        metin: rival
          ? L("{0} soruyor: \"{1} {2} seninle ilgili ‘abartılmış’ dedi. Cevabın?\"", [g, rival.ad, rival.soyad])
          : L("{0} soruyor: \"Sıklette kimse seni tanımıyor. Neden seni izlemeliyiz?\"", [g]),
        secenekler: [L("Sert cevap ver"), L("Esprili geç"), L("Yorum yok")],
        params: { rival: rival?.id ?? '' },
      };
    },
    uygula: (s, i, p) => {
      const rival = s.rakipler.find((r) => r.id === p.rival);
      if (i === 0) {
        pop(s, 3);
        if (rival) rival.rivalry++;
        return L("Sözlerin manşet oldu. {0}Popülerlik +3.", [rival ? L("{0} ile gerilim tırmanıyor. ", [rival.soyad]) : '']);
      }
      if (i === 1) {
        pop(s, 2);
        return L("Esprin kısa sürede meme oldu. Popülerlik +2.");
      }
      return L("Kısa kestin. Gazeteci hayal kırıklığına uğradı.");
    },
  },
  cagri: {
    // Kalıcı rakipler kaldırıldı: bu olay artık havuza girmez.
    kosul: () => false,
    agirlik: 2,
    kur: (s) => {
      const r = pick(s.rakipler.filter((x) => x.rivalry >= 2));
      return {
        baslik: L("⚔️ Rakipten Çağrı"),
        metin: fill(L("{ad} \"{lakap}\" {soyad} sosyal medyada seni etiketledi: \"Kaçıyor. Bir daha karşıma çıkmaya korkuyor.\""), {
          ad: r.ad,
          lakap: r.lakap,
          soyad: r.soyad,
        }),
        secenekler: [L("Karşılık ver: \"Tarih ver, oradayım.\""), L("Görmezden gel")],
        params: { id: r.id },
      };
    },
    uygula: (s, i, p) => {
      const r = s.rakipler.find((x) => x.id === p.id);
      if (i === 0) {
        pop(s, 4);
        if (r) r.rivalry++;
        return L("Taraftarlar bu maçı istiyor. Organizasyon dikkat kesildi. Popülerlik +4.");
      }
      if (r) r.rivalry = Math.max(1, r.rivalry - 1);
      return L("Cevap vermedin. Sessizlik de bir cevaptır.");
    },
  },
  dolandirici: {
    kosul: (s) => s.para > 5000,
    agirlik: 1,
    kur: (s) => {
      const tutar = Math.round((s.para * 0.3) / 100) * 100;
      return {
        baslik: L("💰 “Kaçırılmayacak Yatırım”"),
        metin: L("Eski bir tanıdık, bir kripto projesine {0} yatırırsan bir yılda üçe katlanacağına yemin ediyor.", [$(tutar)]),
        secenekler: [L("Yatır"), L("Yatırma")],
        params: { tutar },
      };
    },
    uygula: (s, i, p) => {
      if (i === 1) return L("Kibarca reddettin. Üç ay sonra proje çöktü. İyi ki.");
      const t = Number(p.tutar);
      if (chance(0.2)) {
        s.para += t;
        return L("İnanılmaz ama işe yaradı! Paranı ikiye katladın. +{0}", [$(t)]);
      }
      s.para -= t;
      return L("Proje bir gecede çöktü. Tanıdığına ulaşılamıyor. -{0}", [$(t)]);
    },
  },
};

// Patron olayları da aynı sistemde çalışır (ağırlığı 0 olanlar yalnızca dövüş sonrası tetiklenir).
Object.assign(EVENTS, OWNER_EVENTS);

export function maybeEvent(s: GameState) {
  // Kariyer hikâyesi (zamanı gelen adım ya da yeni başlayan hikâye) rastgele olaylardan önce gelir.
  const st = storyEvent(s);
  if (st) {
    s.pending.olay = st;
    s.phase = 'event';
    return;
  }
  // Hocayla bağ sahnesi (kriz, veda…) ve aile anı (çocuğun ilk adımı, okulun ilk günü…)
  const fm = eraDecision(s) ?? coachScene(s) ?? familyMoment(s) ?? mediaOffer(s) ?? maybeLetter(s);
  if (fm) {
    s.pending.olay = fm;
    s.phase = 'event';
    return;
  }
  if (!chance(0.65)) {
    s.phase = 'hub';
    return;
  }
  const pool = Object.entries(EVENTS).filter(([, e]) => e.agirlik > 0 && e.kosul(s));
  if (!pool.length) {
    s.phase = 'hub';
    return;
  }
  const id = weighted(pool.map(([k, e]) => [k, e.agirlik] as [string, number]));
  const def = EVENTS[id];
  const built = def.kur(s);
  s.pending.olay = { id, ...built };
  s.phase = 'event';
}

export function chooseEvent(s: GameState, idx: number) {
  const ev = s.pending.olay!;
  ev.sonuc = ev.id.startsWith('hikaye:') ? chooseStory(s, idx) : ev.id.startsWith('aile:') ? chooseFamily(s, idx) : ev.id.startsWith('hoca:') ? chooseCoach(s, idx) : ev.id.startsWith('medya:') ? chooseMedia(s, idx) : ev.id.startsWith('donem:') ? chooseEra(s, idx) : ev.id.startsWith('mektup:') ? chooseLetter(s, idx) : EVENTS[ev.id].uygula(s, idx, ev.params);
  s.haberler.unshift(`${ev.baslik}: ${ev.sonuc}`);
}

export function closeEvent(s: GameState) {
  s.pending = {};
  s.phase = 'hub';
}

