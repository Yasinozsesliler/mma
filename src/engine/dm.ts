// Mesaj kutusu (DM): rakipler, promotör, sponsorlar, hayranlar, sevgilin, ailen, hocan ve salon arkadaşın yazar.
// Her mesajın 2-3 cevabı var; seçilen cevap küçük ama gerçek bir sonuç doğurur (motivasyon, gündem, para, bağ).
// Mesajlar maç takvimine bağlı gelir: kamp başında rakip, maç sonrası hoca/rakip, aradaki haftalarda diğerleri.
import { L, LOC } from '../i18n';
import { bondAdd } from './coachBond';
import { addFollowers, clampPop, fmtDelta, followers } from './fame';
import { addHype } from './hype';
import { chance, clamp, pick, randInt, uid } from './rng';
import { handleOf } from './social';
import type { GameState, Opponent, Stage } from './types';

export type DmKind = 'rakip' | 'promotor' | 'sponsor' | 'hayran' | 'troll' | 'sevgili' | 'aile' | 'hoca' | 'kanka' | 'gazeteci' | 'dolandirici' | 'efsane' | 'unlu';

export interface DmMsg {
  id: string;
  tpl: string;
  kind: DmKind;
  kimden: string;
  kullanici: string;
  hafta: number;
  metin: string;
  secenek: string[];
  /** Seçilen cevabın sırası, oyuncunun cevabı ve sonucu */
  cevap?: number;
  cevapMetin?: string;
  sonuc?: string;
  okundu?: boolean;
  /** Para miktarı vb. şablon verisi */
  x?: number;
  hedefId?: string;
}

export interface DmState {
  liste: DmMsg[];
  /** Şablon → en son gönderildiği hafta (aynı mesaj sık gelmesin) */
  son: Record<string, number>;
}

const MAX = 30;
/** Bu kadar hafta cevapsız kalan mesajın cevap süresi dolar */
export const DM_EXPIRE = 8;

const STAGE_MONEY: Record<Stage, number> = { amator: 150, bolgesel: 600, buyuk: 2500, ufc: 9000 };
const money = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;

export function dmState(s: GameState): DmState {
  if (!s.dm) s.dm = { liste: [], son: {} };
  return s.dm;
}

export const dmUnread = (s: GameState) => (s.dm?.liste ?? []).filter((m) => !m.okundu).length;
export const dmPending = (s: GameState) => (s.dm?.liste ?? []).filter((m) => m.cevap == null && !dmExpired(s, m)).length;
export const dmExpired = (s: GameState, m: DmMsg) => m.cevap == null && s.hafta - m.hafta > DM_EXPIRE;

const motiv = (s: GameState, d: number) => (s.motivasyon = clamp(s.motivasyon + d, -2, 2));
const pop = (s: GameState, d: number) => (s.populerlik = clampPop(s.populerlik + d));
const fol = (s: GameState, oran: number, taban = 20) => fmtDelta(addFollowers(s, Math.max(taban, followers(s) * oran)));
const inCamp = (s: GameState) => !!s.pending.kamp && !!s.pending.rakip;
const oppName = (o: Opponent) => `${o.ad} ${o.soyad}`;
const findOpp = (s: GameState, id?: string) => (id ? s.rakipler.find((r) => r.id === id) ?? (s.pending.rakip?.id === id ? s.pending.rakip : undefined) : undefined);

interface Built {
  kimden: string;
  kullanici: string;
  metin: string;
  secenek: string[];
  x?: number;
  hedefId?: string;
}

interface Tpl {
  id: string;
  kind: DmKind;
  /** Ne zaman gelebilir: 'hafta' (boş haftalar), 'kamp' (kamp başı), 'mac' (maç sonrası) */
  an: 'hafta' | 'kamp' | 'mac';
  when: (s: GameState, c: Ctx) => boolean;
  /** Aynı şablonun tekrar gelmesi için gereken hafta */
  bekle: number;
  build: (s: GameState, c: Ctx) => Built;
  /** Cevabın sonucu (oyuncuya gösterilen kısa metin) */
  resolve: (s: GameState, m: DmMsg, i: number) => string;
}

/** Maç sonrası bağlam */
interface Ctx {
  o?: Opponent;
  won?: boolean;
  draw?: boolean;
  finish?: boolean;
  title?: boolean;
}

const TRASH_DM = [
  L("Kamera yokken de bu kadar cesur musun? Kafeste göreceğiz."),
  L("Senin videolarını izledim. Açığını buldum bile. 😴"),
  L("Ailene söyle, maçı izlemesinler. Üzülmesinler."),
  L("Basın toplantısında gülüyordun. Kafeste gülemeyeceksin."),
  L("Bu maçtan sonra kimse adını hatırlamayacak."),
];
const RESPECT_DM = [
  L("Selam. Kampın iyi geçsin, sağlıklı gel. Kafeste en iyi hâllerimizle karşılaşalım. 🤝"),
  L("Kariyerini uzun zamandır izliyorum. Bu maç ikimiz için de büyük fırsat. Başarılar."),
  L("Basında ne derlerse desinler, sana saygım var. Maç günü görüşürüz."),
];

const TPLS: Tpl[] = [
  // ---------- Kamp başı ----------
  {
    id: 'rakip_tehdit',
    kind: 'rakip',
    an: 'kamp',
    bekle: 0,
    when: (s) => inCamp(s) && [L("Trash talk ustası"), L("Kibirli"), L("Öfkeli"), L("Şovmen")].includes(s.pending.rakip!.kisilik),
    build: (s) => {
      const o = s.pending.rakip!;
      return { kimden: oppName(o), kullanici: handleOf(o.ad, o.soyad), metin: pick(TRASH_DM), secenek: [L("Görüldü bırak"), L("Sert cevap ver 🔥"), L("Ekran görüntüsünü paylaş 📸")], hedefId: o.id };
    },
    resolve: (s, m, i) => {
      if (i === 0) {
        motiv(s, 1);
        return L("Cevap vermedin. Sinirini kampa sakladın: motivasyon +1.");
      }
      if (i === 1) {
        addHype(s, 6, L("DM kavgası"));
        return L("Mesajlaşma kızıştı, kulise sızdı. Maçın gündemi yükseldi. Takipçi {0}.", [fol(s, 0.004)]);
      }
      addHype(s, 3, L("İfşa"));
      pop(s, 1);
      return L("Ekran görüntüsü yayıldı, herkes rakibin tehdidini konuşuyor. Takipçi {0}.", [fol(s, 0.008)]);
    },
  },
  {
    id: 'rakip_saygi',
    kind: 'rakip',
    an: 'kamp',
    bekle: 0,
    when: (s) => inCamp(s) && ![L("Trash talk ustası"), L("Kibirli"), L("Öfkeli"), L("Şovmen")].includes(s.pending.rakip!.kisilik),
    build: (s) => {
      const o = s.pending.rakip!;
      return { kimden: oppName(o), kullanici: handleOf(o.ad, o.soyad), metin: pick(RESPECT_DM), secenek: [L("Saygıyla karşılık ver 🤝"), L("Alay et 😏")], hedefId: o.id };
    },
    resolve: (s, m, i) => {
      if (i === 0) {
        pop(s, 1);
        motiv(s, 1);
        return L("Karşılıklı saygı. İçin rahat, kampa odaklandın: motivasyon +1, popülerlik +1.");
      }
      addHype(s, 4, L("Alaycı DM"));
      pop(s, -1);
      return L("Rakip mesajı paylaştı: “Saygı gösterdim, karşılığı bu.” Gündem yükseldi ama bazı hayranlar soğudu. Takipçi {0}.", [fol(s, 0.003)]);
    },
  },
  {
    id: 'promotor_tur',
    kind: 'promotor',
    an: 'kamp',
    bekle: 6,
    when: (s) => inCamp(s) && s.stage !== 'amator' && s.pending.kamp!.hype != null,
    build: (s) => ({
      kimden: L("Promotör ofisi"),
      kullanici: '@matchmaker',
      metin: L("Maçı satmamız lazım. Önümüzdeki hafta 3 şehirde basın turu ayarlayabiliriz. Yorucu ama bilet satışını uçurur. Var mısın?"),
      secenek: [L("Varım, tura çıkalım"), L("Kampı bölmem")],
    }),
    resolve: (s, m, i) => {
      if (i === 0) {
        addHype(s, 8, L("Basın turu"));
        motiv(s, -1);
        return L("Tur olay oldu, biletler kapışılıyor. Ama yol yorgunluğu kampı biraz bozdu: motivasyon -1. Takipçi {0}.", [fol(s, 0.006)]);
      }
      motiv(s, 1);
      return L("Promotör homurdandı ama kampına dokunmadın: motivasyon +1.");
    },
  },
  {
    id: 'sevgili_kamp',
    kind: 'sevgili',
    an: 'kamp',
    bekle: 6,
    when: (s) => inCamp(s) && !!s.iliski,
    build: (s) => ({
      kimden: s.iliski!.ad,
      kullanici: `${s.iliski!.emoji}`,
      metin: L("Kamp başlamadan bu akşam baş başa bir yemek? Sonra haftalarca yüzünü göremeyeceğim. ❤️"),
      secenek: [L("Tabii, rezervasyon benden"), L("Maçtan sonra telafi ederim")],
      x: Math.round(STAGE_MONEY[s.stage] * 0.6),
    }),
    resolve: (s, m, i) => {
      if (i === 0) {
        s.para -= m.x ?? 0;
        motiv(s, 1);
        return L("Güzel bir akşamdı. Kafan rahat kampa girdin: motivasyon +1 (−{0}).", [money(m.x ?? 0)]);
      }
      return L("“Söz mü?” dedi. Söz verdin. Maçtan sonra unutma.");
    },
  },
  {
    id: 'aile_dua',
    kind: 'aile',
    an: 'kamp',
    bekle: 10,
    when: (s) => inCamp(s),
    build: (s) => ({
      kimden: L("Annem"),
      kullanici: '❤️',
      metin: pick([
        L("Oğlum yine maçın varmış, komşudan duydum. Yemeğini düzgün ye, kilo vereceğim diye kendini aç bırakma. Dua ediyorum."),
        L("Baban maçı büyük ekranda izleyecekmiş, bütün mahalleyi çağırdı. Dikkat et kendine yavrum."),
      ]),
      secenek: [L("Hemen ara 📞"), L("“Merak etme anne” yaz")],
    }),
    resolve: (s, m, i) => {
      if (i === 0) {
        motiv(s, 1);
        return L("Yarım saat konuştunuz. Sesini duymak iyi geldi: motivasyon +1.");
      }
      return L("“Tamam yavrum, Allah utandırmasın” yazdı. ❤️");
    },
  },
  {
    id: 'kanka_spar',
    kind: 'kanka',
    an: 'kamp',
    bekle: 6,
    when: (s) => inCamp(s) && !!s.kanka && s.kanka.durum !== 'rakip',
    build: (s) => ({
      kimden: oppName(s.kanka!.o),
      kullanici: handleOf(s.kanka!.o.ad, s.kanka!.o.soyad),
      metin: L("Rakibinin stilini taklit edebilirim. Bu akşam salon kapanınca ekstra spar yapalım mı? 🥊"),
      secenek: [L("Yapalım"), L("Bu akşam dinlenmem lazım")],
    }),
    resolve: (s, m, i) => {
      if (!s.kanka) return '';
      if (i === 0) {
        s.kanka.bag = clamp(s.kanka.bag + 6, -100, 100);
        s.saglik = Math.max(1, s.saglik - 3);
        return L("Sert ama faydalı bir spar. Bağınız güçlendi, biraz yıprandın (sağlık −3).");
      }
      s.kanka.bag = clamp(s.kanka.bag - 2, -100, 100);
      return L("“Peki kanka” yazdı. Biraz bozulmuş gibi.");
    },
  },

  // ---------- Maç sonrası ----------
  {
    id: 'rakip_rovans',
    kind: 'rakip',
    an: 'mac',
    bekle: 0,
    when: (s, c) => !!c.o && !!c.won,
    build: (s, c) => {
      const o = c.o!;
      const kotu = [L("Trash talk ustası"), L("Kibirli"), L("Öfkeli")].includes(o.kisilik);
      return {
        kimden: oppName(o),
        kullanici: handleOf(o.ad, o.soyad),
        metin: kotu ? L("Şanslıydın. Bunu ikimiz de biliyoruz. Rövanşta gerçeği göreceksin.") : L("Bu gece daha iyiydin, tebrik ederim. Bir gün rövanş isterim ama önce kendimi toparlayacağım. 🤝"),
        secenek: [L("Saygılar, iyi dövüştün"), L("Sıraya gir 😎"), L("Ne zaman istersen")],
        hedefId: o.id,
      };
    },
    resolve: (s, m, i) => {
      const o = findOpp(s, m.hedefId);
      if (i === 0) {
        pop(s, 1);
        return L("Mesajı paylaştı: “Gerçek bir şampiyon adayı.” Popülerlik +1.");
      }
      if (i === 1) return L("Ekran görüntüsü taraftar sayfalarında dolaşıyor. Takipçi {0}.", [fol(s, 0.006)]);
      if (o) o.rivalry = Math.min(5, o.rivalry + 1);
      return L("Rekabet kızışıyor. Bir gün yine karşılaşırsanız ortalık yanar.");
    },
  },
  {
    id: 'hoca_kayip',
    kind: 'hoca',
    an: 'mac',
    bekle: 0,
    when: (s, c) => !!c.o && !c.won && !c.draw,
    build: (s) => ({
      kimden: s.takim.antrenor,
      kullanici: L("Hocam"),
      metin: L("Kafana takma. Yarın sabah salona erken gel, maçı birlikte izleyelim. Neyi yanlış yaptığımızı ben de görmek istiyorum."),
      secenek: [L("Sabah oradayım"), L("Birkaç gün kafa dinleyeceğim")],
    }),
    resolve: (s, m, i) => {
      if (i === 0) {
        bondAdd(s, 5);
        return L("Maçı kare kare izlediniz. Hocanla bağın güçlendi.");
      }
      bondAdd(s, -2);
      motiv(s, 1);
      return L("Biraz uzaklaştın, iyi geldi: motivasyon +1. Hocan biraz kırıldı.");
    },
  },
  {
    id: 'hoca_galibiyet',
    kind: 'hoca',
    an: 'mac',
    bekle: 8,
    when: (s, c) => !!c.won && !!c.finish,
    build: (s) => ({
      kimden: s.takim.antrenor,
      kullanici: L("Hocam"),
      metin: L("Gurur duydum. Ama şımarmak yok, pazartesi idmandayız. 😄"),
      secenek: [L("Her şey senin sayende hocam"), L("Pazartesi ilk ben gelirim")],
    }),
    resolve: (s, m, i) => {
      bondAdd(s, i === 0 ? 4 : 2);
      if (i === 1) motiv(s, 1);
      return i === 0 ? L("Hocan duygulandı. Bağınız güçlendi.") : L("“Göreceğiz” dedi. Motivasyon +1.");
    },
  },
  {
    id: 'efsane_kemer',
    kind: 'efsane',
    an: 'mac',
    bekle: 0,
    when: (s, c) => !!c.title,
    build: () => ({
      kimden: pick([L("Efsane şampiyon"), L("Eski UCC şampiyonu"), L("Onur listesindeki usta")]),
      kullanici: '@legend',
      metin: L("Kemeri almak zor, tutmak daha zor. Hoş geldin şampiyon. Bir gün kahve içelim, anlatacak çok şeyim var."),
      secenek: [L("Benim için onur"), L("Teşekkürler usta")],
    }),
    resolve: (s) => {
      pop(s, 2);
      motiv(s, 1);
      return L("Mesajı paylaştın, herkes konuşuyor: popülerlik +2, motivasyon +1.");
    },
  },
  {
    id: 'hayran_cocuk',
    kind: 'hayran',
    an: 'mac',
    bekle: 10,
    when: (s, c) => !!c.won,
    build: (s) => ({
      kimden: pick([L("Emir (12)"), L("Zeynep (11)"), L("Kerem (13)"), L("Ayşe (10)")]),
      kullanici: `@kucukaslan${randInt(10, 99)}`,
      metin: L("Senin maçını izledikten sonra salona yazıldım! Annem bir sesli mesaj atarsan çok mutlu olacağımı söyledi. Lütfen 🥺"),
      secenek: [L("Sesli mesaj gönder 🎙️"), L("İmzalı eldiven yolla 🥊")],
      x: Math.round(STAGE_MONEY[s.stage] * 0.4),
    }),
    resolve: (s, m, i) => {
      if (i === 0) {
        motiv(s, 1);
        return L("Annesi videoyu paylaştı, çocuk sevinçten ağlıyor. Motivasyon +1. Takipçi {0}.", [fol(s, 0.004)]);
      }
      s.para -= m.x ?? 0;
      pop(s, 1);
      return L("Eldiveni odasının duvarına asmış. Haber oldu: popülerlik +1 (−{0}).", [money(m.x ?? 0)]);
    },
  },

  // ---------- Aradaki haftalar ----------
  {
    id: 'sponsor_story',
    kind: 'sponsor',
    an: 'hafta',
    bekle: 6,
    when: (s) => s.stage !== 'amator' || followers(s) > 3000,
    build: (s) => {
      const brand = pick([L("Kafes Enerji"), L("IronGrip"), L("FitSu"), L("ProteinX"), L("Yumruk Kahve")]);
      return {
        kimden: brand,
        kullanici: `@${brand.toLocaleLowerCase(LOC).replace(/\s/g, '')}`,
        metin: L("Merhaba! Ürünümüzü hikâyende paylaşırsan {0} ödemek istiyoruz. Tek paylaşım, 24 saat.", [money(STAGE_MONEY[s.stage] * 1.5)]),
        secenek: [L("Kabul"), L("Pazarlık et"), L("Reddet")],
        x: Math.round(STAGE_MONEY[s.stage] * 1.5),
      };
    },
    resolve: (s, m, i) => {
      const x = m.x ?? 0;
      if (i === 0) {
        s.para += x;
        return L("Paylaştın, ödeme geldi: +{0}.", [money(x)]);
      }
      if (i === 1) {
        if (chance(0.5)) {
          s.para += Math.round(x * 1.6);
          return L("Pazarlık tuttu! +{0}.", [money(x * 1.6)]);
        }
        return L("“Bütçemiz bu kadar” deyip başka bir dövüşçüyle anlaştılar.");
      }
      return L("Kibarca reddettin.");
    },
  },
  {
    id: 'gazeteci',
    kind: 'gazeteci',
    an: 'hafta',
    bekle: 8,
    when: (s) => s.gecmis.length >= 2,
    build: () => ({
      kimden: pick([L("Kafes Postası"), L("MMA Kulis"), L("Dövüş Dergisi")]),
      kullanici: '@kafespostasi',
      metin: L("Hayat hikâyeni anlatacağın özel bir röportaj yapmak istiyoruz. Çocukluğun, ilk salonun, hayallerin… Ne dersin?"),
      secenek: [L("Kabul, her şeyi anlatırım"), L("Sadece spordan konuşurum"), L("Şimdi değil")],
    }),
    resolve: (s, m, i) => {
      if (i === 0) {
        pop(s, 2);
        return L("Röportaj çok okundu, insanlar seni daha yakından tanıdı: popülerlik +2.");
      }
      if (i === 1) {
        pop(s, 1);
        return L("Kısa ve profesyonel bir röportaj oldu: popülerlik +1.");
      }
      return L("“Kapımız her zaman açık” dediler.");
    },
  },
  {
    id: 'troll',
    kind: 'troll',
    an: 'hafta',
    bekle: 5,
    when: (s) => s.gecmis.length >= 1,
    build: () => ({
      kimden: pick([L("Anonim Arif"), L("Keyboard Kaan"), L("Hater Hakan")]),
      kullanici: `@anonim${randInt(100, 9999)}`,
      metin: pick([L("Sen dövüşçü değilsin, Instagram fenomenisin. 🤡"), L("Bir sonraki maçında uyutulacaksın, hatırla bu mesajı."), L("Hocan bile sana inanmıyor, belli.")]),
      secenek: [L("Engelle"), L("Esprili cevap ver 😂")],
    }),
    resolve: (s, m, i) => {
      if (i === 0) return L("Engelledin. Sessizlik huzurdur.");
      if (chance(0.6)) return L("Cevabın viral oldu, herkes troll'e gülüyor. Takipçi {0}.", [fol(s, 0.006)]);
      pop(s, -1);
      return L("Troll ekran görüntüsünü çarpıtarak paylaştı. Bir süre tartışıldı: popülerlik −1.");
    },
  },
  {
    id: 'dolandirici',
    kind: 'dolandirici',
    an: 'hafta',
    bekle: 20,
    when: (s) => s.para > STAGE_MONEY[s.stage] * 4,
    build: (s) => ({
      kimden: pick([L("Kripto Kral 💎"), L("Yatırım Uzmanı Cem"), L("Bitkoin Hoca")]),
      kullanici: `@zengin_ol_${randInt(10, 99)}`,
      metin: L("Ünlü sporcular için özel coin ön satışı! {0} yatır, 1 ayda 10 katı garanti. 🚀🚀 Sadece bugün!", [money(STAGE_MONEY[s.stage] * 3)]),
      secenek: [L("Yatır 🚀"), L("Şikâyet et"), L("Sil")],
      x: STAGE_MONEY[s.stage] * 3,
    }),
    resolve: (s, m, i) => {
      if (i === 0) {
        s.para -= m.x ?? 0;
        return L("Hesap ertesi gün silindi. Para da gitti: −{0}. Ders oldu.", [money(m.x ?? 0)]);
      }
      if (i === 1) return L("Hesabı bildirdin ve takipçilerini uyardın. Takipçi {0}.", [fol(s, 0.002, 10)]);
      return L("Sildin. Doğru karar.");
    },
  },
  {
    id: 'unlu_bilet',
    kind: 'unlu',
    an: 'hafta',
    bekle: 15,
    when: (s) => s.stage !== 'amator' && followers(s) > 50_000,
    build: (s) => ({
      kimden: pick([L("Ünlü rapçi MC Kara"), L("Oyuncu Deniz Ak"), L("Futbolcu Burak Kaya"), L("Pop yıldızı Selin")]),
      kullanici: '@unlu',
      metin: L("Hey şampiyon, büyük hayranınım! Bir sonraki maçına gelmek istiyorum. Bilet ayarlayabilir misin? 🙏"),
      secenek: [L("Ön sıra benden 🎟️"), L("Menajerime yaz")],
      x: Math.round(STAGE_MONEY[s.stage] * 0.8),
    }),
    resolve: (s, m, i) => {
      if (i === 0) {
        s.para -= m.x ?? 0;
        pop(s, 1);
        return L("Kafes kenarında kameralar onu gösterecek, adın her yerde: popülerlik +1 (−{0}). Takipçi {1}.", [money(m.x ?? 0), fol(s, 0.006)]);
      }
      return L("Menajerin halletti. Kibar ama mesafeli.");
    },
  },
  {
    id: 'sevgili_hafta',
    kind: 'sevgili',
    an: 'hafta',
    bekle: 10,
    when: (s) => !inCamp(s) && !!s.iliski,
    build: (s) => ({
      kimden: s.iliski!.ad,
      kullanici: `${s.iliski!.emoji}`,
      metin: L("Hafta sonu kısa bir kaçamak? Sahil kasabası, telefonlar kapalı. 🌊"),
      secenek: [L("Gidelim!"), L("Bu hafta antrenman var")],
      x: Math.round(STAGE_MONEY[s.stage] * 1.2),
    }),
    resolve: (s, m, i) => {
      if (i === 0) {
        s.para -= m.x ?? 0;
        motiv(s, 1);
        s.saglik = Math.min(100, s.saglik + 4);
        return L("İki gün deniz, güneş ve sessizlik. Sağlık +4, motivasyon +1 (−{0}).", [money(m.x ?? 0)]);
      }
      return L("“Anlıyorum ama sıradaki tatil benden” yazdı.");
    },
  },
  {
    id: 'hayran_cizim',
    kind: 'hayran',
    an: 'hafta',
    bekle: 8,
    when: (s) => s.gecmis.length >= 1,
    build: () => ({
      kimden: pick([L("Çizer Ceren"), L("Fan Fatih"), L("Kafes Kızı Kübra")]),
      kullanici: `@fanart${randInt(10, 999)}`,
      metin: L("Senin portreni çizdim, üç gece uğraştım! 🎨 Beğenir misin?"),
      secenek: [L("Hikâyemde paylaşacağım ❤️"), L("Teşekkür et")],
    }),
    resolve: (s, m, i) => (i === 0 ? L("Çizim yayıldı, sanatçı da sen de kazandınız. Takipçi {0}.", [fol(s, 0.003)]) : L("“Cevap verdi!!” diye herkese göstermiş. 😊")),
  },
];

function send(s: GameState, t: Tpl, c: Ctx) {
  const d = dmState(s);
  const b = t.build(s, c);
  d.liste.unshift({ id: uid(), tpl: t.id, kind: t.kind, hafta: s.hafta, ...b });
  d.liste = d.liste.slice(0, MAX);
  d.son[t.id] = s.hafta;
}

const ready = (s: GameState, t: Tpl) => {
  const son = s.dm?.son[t.id];
  return son == null || s.hafta - son >= t.bekle;
};

function sendFrom(s: GameState, an: Tpl['an'], c: Ctx, n: number) {
  const pool = TPLS.filter((t) => t.an === an && ready(s, t) && t.when(s, c));
  for (let i = 0; i < n && pool.length; i++) {
    const t = pick(pool);
    pool.splice(pool.indexOf(t), 1);
    send(s, t, c);
  }
}

/** Kamp başında: rakibin mesajı neredeyse kesin, yanında bir mesaj daha olabilir. */
export function dmCampStart(s: GameState) {
  const c: Ctx = {};
  const rakip = TPLS.filter((t) => t.an === 'kamp' && t.kind === 'rakip' && t.when(s, c));
  if (rakip.length && chance(0.8)) send(s, rakip[0], c);
  const diger = TPLS.filter((t) => t.an === 'kamp' && t.kind !== 'rakip' && ready(s, t) && t.when(s, c));
  if (diger.length && chance(0.6)) send(s, pick(diger), c);
}

/** Maç sonrası: rakip, hoca, hayran ya da efsane yazar. */
export function dmAfterFight(s: GameState, c: Ctx) {
  sendFrom(s, 'mac', c, c.title ? 3 : chance(0.5) ? 2 : 1);
}

/** Aradaki haftalar: ara sıra bir mesaj. */
export function dmTick(s: GameState, weeks = 1) {
  const p = Math.min(0.8, (s.stage === 'amator' ? 0.15 : 0.3) * weeks);
  if (chance(p)) sendFrom(s, 'hafta', {}, 1);
}

export function readDm(s: GameState, id: string) {
  const m = s.dm?.liste.find((x) => x.id === id);
  if (m) m.okundu = true;
}

export function answerDm(s: GameState, id: string, i: number): string {
  const m = s.dm?.liste.find((x) => x.id === id);
  if (!m || m.cevap != null || dmExpired(s, m)) return '';
  const t = TPLS.find((x) => x.id === m.tpl);
  m.cevap = i;
  m.cevapMetin = m.secenek[i];
  m.okundu = true;
  m.sonuc = t ? t.resolve(s, m, i) : '';
  return m.sonuc;
}
