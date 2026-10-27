// Antrenörünle bağ: güven puanı (0-100) maçlarla, kararlarla ve yıllarla değişir. Yüksek güven köşede küçük bir
// akıl desteği verir, düşük güven köşeyi soğutur. Eşiklerde sahneler gelir: kriz, "baba gibi" an, başka kampın
// teklifi, hocanın hastalığı ve vedası. Hoca değişince bağ sıfırdan kurulur.
import { L, LOC } from '../i18n';
import { addMemento } from './memories';
import { clamp, pick } from './rng';
import type { GameEventState, GameState, Stats } from './types';

export interface CoachBond {
  ad: string;
  bag: number;
  /** Hocayla çalışmaya başlanan hafta */
  basla: number;
  /** Görülen sahneler */
  an: string[];
  /** Son krizin dövüş sayısı */
  kriz?: number;
}

const NEW_COACHES = [L("Rıza Hoca"), L("Coach Marcus Bell"), L("Sergei Volkov"), L("Mestre Paulo Reis"), L("Kenji Arakawa"), L("Duncan McRae")];

/** Hoca değiştiyse bağı yeniden kur. */
export function ensureCoach(s: GameState): CoachBond {
  if (!s.hoca || s.hoca.ad !== s.takim.antrenor) s.hoca = { ad: s.takim.antrenor, bag: s.hoca ? 40 : 55, basla: s.hafta, an: [] };
  return s.hoca;
}

export function bondLabel(b: number) {
  if (b >= 85) return L("Baba-evlat gibi");
  if (b >= 65) return L("Sıkı bağ");
  if (b >= 40) return L("İyi gidiyor");
  if (b >= 25) return L("Gergin");
  return L("Kopma noktasında");
}
export const bondColor = (b: number) => (b >= 65 ? '#3ecf7a' : b >= 40 ? '#f2c14e' : b >= 25 ? '#ff8a5c' : '#ff4d5e');

/** Diğer sistemlerden (DM vb.) bağ değişimi */
export const bondAdd = (s: GameState, d: number) => add(s, d);

const add = (s: GameState, d: number) => {
  const h = ensureCoach(s);
  h.bag = clamp(Math.round(h.bag + d), 0, 100);
};

/** Maç sonrası: sonuç ve plana uyum bağı değiştirir. */
export function bondAfterFight(s: GameState, c: { won: boolean; finish: boolean; koLoss: boolean; planUyum: boolean }) {
  add(s, c.won ? (c.finish ? 4 : 2) : c.koLoss ? -7 : -4);
  if (c.planUyum) add(s, 1);
  // Güven kendiliğinden korunmaz: zirvede emek ister
  if (ensureCoach(s).bag > 60) add(s, -1);
}

/** Dövüş günü: güven köşeye yansır. */
export function coachMods(s: GameState, mods: Partial<Stats>) {
  const b = ensureCoach(s).bag;
  if (b >= 80) {
    mods.iq = (mods.iq ?? 0) + 1;
    s.haberler.unshift(L("🤝 {0} ile aranız çok iyi: köşedeki her sözü tam zamanında geliyor (IQ +1).", [s.takim.antrenor]));
  } else if (b < 25) {
    mods.iq = (mods.iq ?? 0) - 1;
    s.haberler.unshift(L("🧊 {0} ile aranız soğuk: köşede konuşmalar kısa ve gergin (IQ -1).", [s.takim.antrenor]));
  }
}

/** Kulis/köşe cümlesi: bağa göre değişir. */
export function coachLine(s: GameState) {
  const h = ensureCoach(s);
  if (h.bag >= 80) return L("{0}: “Seninle gurur duyuyorum. Şimdi git ve al şunu.”", [h.ad]);
  if (h.bag >= 40) return L("{0}: “Planına sadık kal. Gerisi kendiliğinden gelir.”", [h.ad]);
  return L("{0} yalnızca “Planı biliyorsun.” dedi. Sesi soğuktu.", [h.ad]);
}

const hafta = (s: GameState) => s.hafta - ensureCoach(s).basla;

type Scene = {
  id: string;
  /** Tekrar edebilir mi (kriz) */
  tekrar?: boolean;
  kosul: (s: GameState, h: CoachBond) => boolean;
  kur: (s: GameState, h: CoachBond) => { baslik: string; metin: string; secenekler: string[] };
  uygula: (s: GameState, i: number, h: CoachBond) => string;
};

const zam = (s: GameState) => ({ amator: 300, bolgesel: 2_000, buyuk: 10_000, ufc: 40_000 })[s.stage];
const $ = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;
const mot = (s: GameState, d: number) => (s.motivasyon = clamp(s.motivasyon + d, -2, 2));

function newCoach(s: GameState, ad?: string) {
  const eski = s.takim.antrenor;
  s.takim.antrenor = ad ?? pick(NEW_COACHES.filter((x) => x !== eski));
  s.hoca = { ad: s.takim.antrenor, bag: 45, basla: s.hafta, an: [] };
  return s.takim.antrenor;
}

const SCENES: Scene[] = [
  {
    id: 'kriz',
    tekrar: true,
    kosul: (s, h) => h.bag < 25 && s.gecmis.length - (h.kriz ?? -99) >= 5,
    kur: (s, h) => ({
      baslik: L("💢 Hocanla Kriz"),
      metin: L("{0} antrenmandan sonra seni kenara çekti: “Beni dinlemiyorsun. Böyle devam edeceksek yollarımızı ayıralım.”", [h.ad]),
      secenekler: [L("Özür dile, yeniden başlayalım"), L("Maaşına zam yap ({0})", [$(zam(s))]), L("Yollarınızı ayırın")],
    }),
    uygula: (s, i, h) => {
      h.kriz = s.gecmis.length;
      if (i === 0) {
        h.bag = clamp(h.bag + 22, 0, 100);
        mot(s, -1);
        return L("Gururunu yuttun. {0} başını salladı: “Yarın sabah altıda.” Bağ toparlanıyor, motivasyon -1.", [h.ad]);
      }
      if (i === 1) {
        s.para -= zam(s);
        h.bag = clamp(h.bag + 30, 0, 100);
        return L("Zam iyi geldi ama asıl önemli olan oturup konuşmanızdı. Bağ güçlendi.");
      }
      const yeni = newCoach(s);
      mot(s, -1);
      return L("{0} ile yollarınız ayrıldı. Yeni hocan {1}. Sıfırdan bir güven kurmanız gerekecek. Motivasyon -1.", [h.ad, yeni]);
    },
  },
  {
    id: 'baba',
    kosul: (s, h) => h.bag >= 85 && hafta(s) >= 40,
    kur: (s, h) => ({
      baslik: L("🫂 Bir Baba Gibi"),
      metin: L("Gece salonda yalnız kaldınız. {0} eski bir fotoğraf çıkardı: ilk antrenmanın, eldivenler elinden büyük. “O gün kapıdan girdiğinde ne olacağını biliyordum,” dedi.", [h.ad]),
      secenekler: [L("Sarıl"), L("“Her şeyi sana borçluyum.”")],
    }),
    uygula: (s, i, h) => {
      mot(s, 2);
      addMemento(s, { id: 'hoca_foto', tur: 'foto', ad: L("{0} ile ilk antrenman fotoğrafı", [h.ad]), metin: L("Eldivenler elinden büyük. Arkasında hocanın el yazısı: “Bir gün.”"), nadir: 'ozel', kat: 'aile' });
      return i === 0 ? L("Uzun süre konuşmadınız. Gerek yoktu. Motivasyon +2.") : L("“Hayır,” dedi, “her şeyi kendine borçlusun. Ben sadece kapıyı açtım.” Motivasyon +2.");
    },
  },
  {
    id: 'transfer',
    kosul: (s, h) => (s.stage === 'buyuk' || s.stage === 'ufc') && h.bag >= 40 && h.bag < 80 && hafta(s) >= 60,
    kur: (s, h) => ({
      baslik: L("📨 Rakip Kampın Teklifi"),
      metin: L("Büyük bir salon {0} hocana baş antrenörlük teklif etmiş, maaşı iki katı. Sana söylemedi; sen başkasından duydun.", [h.ad]),
      secenekler: [L("Ona zam yap ve kalmasını iste ({0})", [$(zam(s) * 2)]), L("Onu tebrik et, gitmesine izin ver"), L("Sessiz kal, kararı ona bırak")],
    }),
    uygula: (s, i, h) => {
      if (i === 0) {
        s.para -= zam(s) * 2;
        h.bag = clamp(h.bag + 25, 0, 100);
        return L("{0} teklifi reddetti: “Benim dövüşçüm burada.” Bağ çok güçlendi.", [h.ad]);
      }
      if (i === 1) {
        const yeni = newCoach(s);
        mot(s, 1);
        return L("{0} gözleri dolu gitti, giderken seni yeni hocan {1} ile tanıştırdı. Motivasyon +1.", [h.ad, yeni]);
      }
      if (h.bag >= 60) {
        h.bag = clamp(h.bag + 15, 0, 100);
        return L("{0} kaldı. “Sana sormadan karar vermem gerekirdi, ama burası benim evim,” dedi.", [h.ad]);
      }
      const yeni = newCoach(s);
      return L("{0} teklifi kabul etti. Yeni hocan {1}.", [h.ad, yeni]);
    },
  },
  {
    id: 'hastalik',
    kosul: (s) => hafta(s) >= 160,
    kur: (s, h) => ({
      baslik: L("🏥 Hocanın Sağlığı"),
      metin: L("{0} birkaç haftadır öksürüyordu. Doktorlar dinlenmesini söyledi ama o kampı bırakmak istemiyor.", [h.ad]),
      secenekler: [L("Zorla tatile gönder, kampı asistan yönetsin"), L("Onun kararına saygı duy")],
    }),
    uygula: (s, i, h) => {
      if (i === 0) {
        h.bag = clamp(h.bag + 12, 0, 100);
        return L("Önce kızdı, sonra teşekkür etti. Bir ay sonra eskisinden dinç döndü. Bağ güçlendi.");
      }
      h.bag = clamp(h.bag + 4, 0, 100);
      mot(s, -1);
      return L("Kampı yönetti ama her gece onu merak ettin. Motivasyon -1.");
    },
  },
  {
    id: 'veda',
    kosul: (s) => hafta(s) >= 400 || (s.fighter.yas >= 36 && hafta(s) >= 200),
    kur: (s, h) => ({
      baslik: L("🕊️ Hocanın Vedası"),
      metin: L("{0} seni salonun ortasına çağırdı: “Yaşlandım evlat. Sana öğretebileceğim her şeyi öğrettim.” Yerine kendi asistanını önerdi.", [h.ad]),
      secenekler: [L("Son bir antrenman yapın"), L("Veda yemeği düzenle")],
    }),
    uygula: (s, i, h) => {
      const eski = h.ad;
      addMemento(s, { id: 'hoca_veda', tur: 'foto', ad: L("{0} ile son fotoğraf", [eski]), metin: i === 0 ? L("Son antrenmanın sonunda minderde yan yana") : L("Veda yemeğinde, bütün salon bir arada"), nadir: 'efsane', kat: 'aile' });
      const yeni = newCoach(s, L("Asistan {0}", [pick([L("Emre"), L("Diego"), L("Ivan"), L("Kaito"), L("Liam")])]));
      s.hoca!.bag = 55;
      mot(s, 1);
      return L("{0} emekli oldu ama her maçını tribünden izleyeceğine söz verdi. Yeni hocan {1}. Motivasyon +1.", [eski, yeni]);
    },
  },
];

/** Zamanı gelen hoca sahnesi varsa olay olarak döndürür. */
export function coachScene(s: GameState): GameEventState | null {
  if (!s.takim?.antrenor) return null;
  const h = ensureCoach(s);
  const sc = SCENES.find((x) => (x.tekrar || !h.an.includes(x.id)) && x.kosul(s, h));
  if (!sc) return null;
  return { id: `hoca:${sc.id}`, ...sc.kur(s, h), params: {} };
}

export function chooseCoach(s: GameState, idx: number): string {
  const id = s.pending.olay!.id.split(':')[1];
  const h = ensureCoach(s);
  const sc = SCENES.find((x) => x.id === id);
  if (!sc) return '';
  if (!sc.tekrar) h.an.push(id);
  return sc.uygula(s, idx, h);
}
