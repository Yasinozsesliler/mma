import { addStat } from './character';
import { randomInjury } from './camp';
import { AGENTS, JOURNALISTS } from './data';
import { gymsFor } from './gyms';
import { applyGym } from './team';
import { OWNER_EVENTS } from './owners';
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

const $ = (n: number) => `$${Math.round(n).toLocaleString('tr-TR')}`;
const pop = (s: GameState, d: number) => (s.populerlik = clamp(s.populerlik + d, 0, 100));

const BRANDS = ['Kuvvet Protein', 'Arslan Enerji İçeceği', 'Kafes Giyim', 'Nokta Bahis (!)', 'Demir Spor Ekipmanları', 'Yıldız Döner'];

const EVENTS: Record<string, EventDef> = {
  doping: {
    kosul: (s) => !dopingActive(s) && !banned(s) && s.para >= dopingCost(s),
    agirlik: 1.2,
    kur: (s) => {
      const tutar = dopingCost(s);
      const kim = pick([
        'Salonun karanlık köşesinde tanımadığın bir adam yanına yaklaştı',
        'Yeni tanıştığın bir “performans koçu” seni kenara çekti',
        'Takım arkadaşının kuzeni olduğunu söyleyen biri mesaj attı',
        'Kampta bir sağlık danışmanı fısıldayarak konuştu',
      ]);
      return {
        baslik: '💉 Karanlık Bir Teklif',
        metin: `${kim}: “Bu kür seni ${DOPING_FIGHTS} dövüş boyunca canavara çevirir. Testlerde çıkmaz… genelde.” Fiyatı ${$(tutar)}.\n\nKabul edersen vuruş, kondisyon, hız ve çene ciddi artar. Yakalanırsan 6 ay ile 2 yıl arası men, popülerlik kaybı ve sponsor iptali.`,
        secenekler: ['Kabul et', 'Reddet', 'Federasyona ihbar et'],
        params: { tutar },
      };
    },
    uygula: (s, i) => {
      if (i === 0) {
        takeDoping(s);
        return `Kürü aldın. Aynada başka biri var. Sonraki ${DOPING_FIGHTS} dövüşte çok güçlüsün… ama her dövüşten sonra test riski var.`;
      }
      if (i === 1) return 'Kibarca reddettin. Temiz bir kariyer, huzurlu bir uyku.';
      pop(s, 2);
      return 'Federasyona ihbar ettin. Basın seni “temiz sporun sesi” ilan etti. Popülerlik +2.';
    },
  },
  sponsor: {
    kosul: (s) => s.populerlik >= 8,
    agirlik: 1,
    kur: (s) => {
      const tutar = Math.round((500 + s.populerlik * 120 * { amator: 0.3, bolgesel: 1, buyuk: 3, ufc: 6 }[s.stage]) / 100) * 100;
      const marka = pick(BRANDS);
      return {
        baslik: '💼 Sponsorluk Teklifi',
        metin: `${marka} seninle çalışmak istiyor. Şortunda logoları olacak, karşılığında ${$(tutar)} ödeyecekler.${
          marka.includes('Bahis') ? '\n\nAma bir bahis şirketi… Bazı taraftarların hoşuna gitmeyebilir.' : ''
        }`,
        secenekler: ['Kabul et', 'Pazarlık yap (+%50 dene)', 'Reddet'],
        params: { tutar, marka },
      };
    },
    uygula: (s, i, p) => {
      const t = Number(p.tutar);
      const bahis = String(p.marka).includes('Bahis');
      if (i === 0) {
        s.para += t;
        if (bahis) pop(s, -2);
        return `${p.marka} ile anlaştın. +${$(t)}${bahis ? ' (Bazı taraftarlar tepkili: popülerlik -2)' : ''}`;
      }
      if (i === 1) {
        if (chance(0.35 + s.takim.menajerKalite * 0.05)) {
          s.para += t * 1.5;
          return `Sıkı pazarlık işe yaradı! +${$(t * 1.5)}`;
        }
        return `${p.marka} masadan kalktı. "Başka dövüşçüler de var."`;
      }
      return 'Teklifi reddettin. İmajın temiz kaldı.';
    },
  },
  viral: {
    kosul: () => true,
    agirlik: 2,
    kur: () => ({
      baslik: '📱 Viral Video',
      metin: 'Antrenmanda sparring partnerini uyuttuğun bir video 2 milyon izlendi. Yorumlar ikiye bölünmüş durumda. Ne paylaşırsın?',
      secenekler: ['Sıklettekilere laf at', 'Mütevazı bir teşekkür yaz', 'Görmezden gel'],
      params: {},
    }),
    uygula: (s, i) => {
      if (i === 0) {
        if (chance(0.6)) {
          pop(s, 5);
          return 'Paylaşımın ortalığı yıktı. Rakipler cevap yazıyor, gazeteciler seni arıyor. Popülerlik +5.';
        }
        pop(s, -3);
        return 'Kibirli buldular. "Önce bir kemer kazan" yorumları ağır bastı. Popülerlik -3.';
      }
      if (i === 1) {
        pop(s, 2);
        return 'Samimi mesajın sevildi. Popülerlik +2.';
      }
      return 'Hiçbir şey yazmadın. Video kendi kendine yayılmaya devam etti. Popülerlik +1.';
    },
  },
  salon: {
    kosul: (s) => s.stage !== 'amator' && gymsFor('elit').some((g) => g.kalite > s.takim.antrenorKalite),
    agirlik: 2,
    kur: (s) => {
      const gym = pick(gymsFor('elit').filter((g) => g.kalite > s.takim.antrenorKalite));
      return {
        baslik: '🏟️ Salon Değiştirme Fırsatı',
        metin: `${gym.salon} baş antrenörü ${gym.antrenor} seni takımında görmek istiyor (kalite ${gym.kalite}/10). Davetli olduğun için geçiş ücreti yarı fiyat: ${$(Math.round(gym.imza / 2))}.\n\nŞu anki hocan ${s.takim.antrenor} (kalite ${s.takim.antrenorKalite}/10) seni sıfırdan yetiştirdi.`,
        secenekler: ['Taşın', 'Kal, sadakat önemli'],
        params: { id: gym.id, salon: gym.salon, maliyet: Math.round(gym.imza / 2) },
      };
    },
    uygula: (s, i, p) => {
      if (i === 0) {
        if (s.para < Number(p.maliyet)) return `Paran yetmiyor (${$(Number(p.maliyet))} gerekli). Fırsat kaçtı.`;
        const eski = s.takim.antrenor;
        s.para -= Number(p.maliyet);
        const gym = gymsFor('elit').find((x) => x.id === p.id);
        if (gym) applyGym(s, gym);
        return `Yeni evin: ${p.salon}. ${eski} telefonda sessizce "Başarılar evlat" dedi ve kapattı.`;
      }
      s.motivasyon = 2;
      return 'Kaldın. Hocan gözleri dolarak sarıldı. Sonraki kampta ekstra motivasyonla çalışacaksın.';
    },
  },
  menajer: {
    kosul: (s) => s.stage !== 'amator' && !s.takim.menajer,
    agirlik: 3,
    kur: (s) => {
      const uygun = AGENTS.filter((a) => a.kalite <= 4 + Math.floor(s.populerlik / 12));
      const a = pick(uygun.length ? uygun : AGENTS.slice(0, 1));
      return {
        baslik: '🤝 Menajer Teklifi',
        metin: `Menajer ${a.ad} (kalite ${a.kalite}/10) seni temsil etmek istiyor. Tüm kazançlarından %${Math.round(a.pay * 100)} alacak. Karşılığında kontrat pazarlıkları ve sponsorluklar çok daha kolay olacak.`,
        secenekler: ['Anlaş', 'Kendi işimi kendim yaparım'],
        params: { ad: a.ad, kalite: a.kalite, pay: a.pay },
      };
    },
    uygula: (s, i, p) => {
      if (i === 0) {
        s.takim.menajer = String(p.ad);
        s.takim.menajerKalite = Number(p.kalite);
        s.takim.menajerPay = Number(p.pay);
        return `${p.ad} artık menajerin. İlk sözü: "Bir daha asla ucuza dövüşmeyeceksin."`;
      }
      return 'Tek başına devam ediyorsun. Kazancın tamamen senin, ama masada yalnızsın.';
    },
  },
  aile: {
    kosul: (s) => s.para > 1500,
    agirlik: 2,
    kur: (s) => {
      const tutar = Math.round((s.para * (0.2 + rand() * 0.15)) / 100) * 100;
      return {
        baslik: '🏠 Aileden Bir Telefon',
        metin: `Kardeşin arıyor. Babanın ameliyatı var ve ${$(tutar)} lazım. Sesi titriyor.`,
        secenekler: ['Hepsini gönder', 'Yarısını gönder', 'Şu an yapamam'],
        params: { tutar },
      };
    },
    uygula: (s, i, p) => {
      const t = Number(p.tutar);
      if (i === 0) {
        s.para -= t;
        s.motivasyon = 2;
        return 'Parayı gönderdin. Ameliyat başarılı geçti. Babanın mesajı: "Oğlumla gurur duyuyorum." Motivasyonun tavan.';
      }
      if (i === 1) {
        s.para -= t / 2;
        s.motivasyon = 1;
        return 'Yarısını gönderdin, gerisini akrabalar tamamladı. İçin rahat.';
      }
      s.motivasyon = -1;
      return 'Yapamadığını söyledin. Telefonu kapattıktan sonra uzun süre tavana baktın. Motivasyon düştü.';
    },
  },
  parti: {
    kosul: (s) => s.populerlik >= 20,
    agirlik: 1,
    kur: () => ({
      baslik: '🍾 Ünlüler Partisi',
      metin: 'Bir rapçinin partisine davetlisin. Kameralar, ünlüler, sabaha kadar eğlence. Kampa iki hafta var.',
      secenekler: ['Git, görün', 'Kibarca reddet'],
      params: {},
    }),
    uygula: (s, i) => {
      if (i === 1) return 'Evde kaldın, erkenden yattın. Sıkıcı ama profesyonel.';
      if (chance(0.35)) {
        pop(s, -4);
        s.saglik = clamp(s.saglik - 8, 0, 100);
        return 'Gece kontrolden çıktı: bir kavga videosu sızdı. Magazin manşetlerindesin. Popülerlik -4, sağlık -8.';
      }
      pop(s, 3);
      return 'Ünlülerle fotoğrafların her yerde. Yeni bir kitleye ulaştın. Popülerlik +3.';
    },
  },
  araba: {
    kosul: (s) => s.para > 20000,
    agirlik: 1,
    kur: (s) => {
      const fiyat = Math.round((s.para * 0.4) / 1000) * 1000;
      return {
        baslik: '🏎️ Hayalindeki Araba',
        metin: `Galeride o spor araba seni bekliyor: ${$(fiyat)}. Çocukken posterini duvarına asmıştın.`,
        secenekler: ['Al, bunu hak ettin', 'Parayı biriktir'],
        params: { fiyat },
      };
    },
    uygula: (s, i, p) => {
      if (i === 0) {
        s.para -= Number(p.fiyat);
        pop(s, 2);
        return 'Anahtarları aldın. Instagram paylaşımın patladı. Popülerlik +2. Banka hesabın ise ağlıyor.';
      }
      return 'Parayı biriktirdin. Kariyer uzun, sakatlık bir anda gelir.';
    },
  },
  sparring: {
    kosul: () => true,
    agirlik: 2,
    kur: () => ({
      baslik: '🥊 Sert Sparring',
      metin: 'Salona gelen deneyimli bir veteran seninle sert sparring yapmak istiyor. Çok şey öğrenebilirsin, ama adam hiç yavaşlamıyor.',
      secenekler: ['Kabul et, sonuna kadar git', 'Teknik sparring olsun de', 'Reddet'],
      params: {},
    }),
    uygula: (s, i) => {
      if (i === 0) {
        const g = addStat(s.fighter.stats, 'iq', 2);
        if (chance(0.25)) {
          const inj = randomInjury(2, 5);
          s.sakatliklar.push(inj);
          return `Çok şey öğrendin (IQ +${g}), ama bedeli ağır: ${inj.ad} (${inj.hafta} hafta).`;
        }
        return `Yıpratıcıydı ama paha biçilmez. IQ +${g}.`;
      }
      if (i === 1) {
        const g = addStat(s.fighter.stats, 'iq', 1);
        return `Kontrollü bir çalışma. Tecrübesinden faydalandın. IQ +${g}.`;
      }
      return 'Reddettin. Veteran omuz silkip gitti.';
    },
  },
  hayir: {
    kosul: (s) => s.para > 1000,
    agirlik: 1,
    kur: (s) => ({
      baslik: '❤️ Memleketten Davet',
      metin: `${s.fighter.memleket}’teki çocuklar için bir spor okulu açılıyor. Kurdele kesmen ve $500 bağış yapman isteniyor.`,
      secenekler: ['Git ve bağış yap', 'Maalesef vaktim yok'],
      params: {},
    }),
    uygula: (s, i) => {
      if (i === 0) {
        s.para -= 500;
        pop(s, 4);
        s.motivasyon = 1;
        return 'Çocukların gözlerindeki ışık her şeye değdi. Yerel basın seni manşet yaptı. Popülerlik +4.';
      }
      pop(s, -1);
      return 'Gidemedin. Bir yerel gazete bunu "unuttu köklerini" diye yazdı. Popülerlik -1.';
    },
  },
  gazeteci: {
    kosul: (s) => s.stage !== 'amator',
    agirlik: 2,
    kur: (s) => {
      const g = pick(JOURNALISTS);
      const rival = s.rakipler[0];
      return {
        baslik: '🎙️ Röportaj',
        metin: rival
          ? `${g} soruyor: "${rival.ad} ${rival.soyad} seninle ilgili ‘abartılmış’ dedi. Cevabın?"`
          : `${g} soruyor: "Sıklette kimse seni tanımıyor. Neden seni izlemeliyiz?"`,
        secenekler: ['Sert cevap ver', 'Esprili geç', 'Yorum yok'],
        params: { rival: rival?.id ?? '' },
      };
    },
    uygula: (s, i, p) => {
      const rival = s.rakipler.find((r) => r.id === p.rival);
      if (i === 0) {
        pop(s, 3);
        if (rival) rival.rivalry++;
        return `Sözlerin manşet oldu. ${rival ? `${rival.soyad} ile gerilim tırmanıyor. ` : ''}Popülerlik +3.`;
      }
      if (i === 1) {
        pop(s, 2);
        return 'Esprin kısa sürede meme oldu. Popülerlik +2.';
      }
      return 'Kısa kestin. Gazeteci hayal kırıklığına uğradı.';
    },
  },
  cagri: {
    kosul: (s) => s.rakipler.some((r) => r.rivalry >= 2),
    agirlik: 2,
    kur: (s) => {
      const r = pick(s.rakipler.filter((x) => x.rivalry >= 2));
      return {
        baslik: '⚔️ Rakipten Çağrı',
        metin: fill('{ad} "{lakap}" {soyad} sosyal medyada seni etiketledi: "Kaçıyor. Bir daha karşıma çıkmaya korkuyor."', {
          ad: r.ad,
          lakap: r.lakap,
          soyad: r.soyad,
        }),
        secenekler: ['Karşılık ver: "Tarih ver, oradayım."', 'Görmezden gel'],
        params: { id: r.id },
      };
    },
    uygula: (s, i, p) => {
      const r = s.rakipler.find((x) => x.id === p.id);
      if (i === 0) {
        pop(s, 4);
        if (r) r.rivalry++;
        return 'Taraftarlar bu maçı istiyor. Organizasyon dikkat kesildi. Popülerlik +4.';
      }
      if (r) r.rivalry = Math.max(1, r.rivalry - 1);
      return 'Cevap vermedin. Sessizlik de bir cevaptır.';
    },
  },
  dolandirici: {
    kosul: (s) => s.para > 5000,
    agirlik: 1,
    kur: (s) => {
      const tutar = Math.round((s.para * 0.3) / 100) * 100;
      return {
        baslik: '💰 “Kaçırılmayacak Yatırım”',
        metin: `Eski bir tanıdık, bir kripto projesine ${$(tutar)} yatırırsan bir yılda üçe katlanacağına yemin ediyor.`,
        secenekler: ['Yatır', 'Yatırma'],
        params: { tutar },
      };
    },
    uygula: (s, i, p) => {
      if (i === 1) return 'Kibarca reddettin. Üç ay sonra proje çöktü. İyi ki.';
      const t = Number(p.tutar);
      if (chance(0.2)) {
        s.para += t;
        return `İnanılmaz ama işe yaradı! Paranı ikiye katladın. +${$(t)}`;
      }
      s.para -= t;
      return `Proje bir gecede çöktü. Tanıdığına ulaşılamıyor. -${$(t)}`;
    },
  },
};

// Patron olayları da aynı sistemde çalışır (ağırlığı 0 olanlar yalnızca dövüş sonrası tetiklenir).
Object.assign(EVENTS, OWNER_EVENTS);

export function maybeEvent(s: GameState) {
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
  ev.sonuc = EVENTS[ev.id].uygula(s, idx, ev.params);
  s.haberler.unshift(`${ev.baslik}: ${ev.sonuc}`);
}

export function closeEvent(s: GameState) {
  s.pending = {};
  s.phase = 'hub';
}

