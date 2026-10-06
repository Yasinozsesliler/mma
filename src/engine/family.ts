// Aile hayatı: sevgiliye evlilik teklifi (sade nikâh ya da büyük düğün), evlilikte çocuklar, tribündeki aile
// (dövüşte küçük destek), çocuk giderleri ve boşanmanın bedeli. Hanedan modunda büyük çocuk varis olur.
import { L, LOC } from '../i18n';
import { COUNTRIES, NAME_POOLS } from './data';
import { addFollowers, followers } from './fame';
import { chance, clamp, pick } from './rng';
import { addMemento } from './memories';
import type { GameEventState, GameState, Stats } from './types';

export interface Child {
  ad: string;
  kiz: boolean;
  hafta: number;
}

export const PROPOSE_WEEKS = 20;
const RING: Record<GameState['stage'], number> = { amator: 1_000, bolgesel: 4_000, buyuk: 15_000, ufc: 50_000 };
export const weddingCost = (s: GameState, buyuk: boolean) => RING[s.stage] * (buyuk ? 6 : 1.5);

export const canPropose = (s: GameState) => s.iliski?.durum === 'sevgili' && s.hafta - s.iliski.hafta >= PROPOSE_WEEKS;
export const weeksToPropose = (s: GameState) => (s.iliski?.durum === 'sevgili' ? Math.max(0, PROPOSE_WEEKS - (s.hafta - s.iliski.hafta)) : 0);

/** Evlilik teklifi: kabul olasılığı ilişki seviyesine bağlı. Ret olursa 20 hafta beklenir. */
export function propose(s: GameState, buyuk: boolean): string {
  const r = s.iliski;
  if (!r || !canPropose(s)) return '';
  const cost = weddingCost(s, buyuk);
  if (s.para < cost) return L("Bunun için paran yetmiyor.");
  const lvl = (s.eslesmeler ?? []).find((c) => c.id === r.id)?.seviye ?? 70;
  if (!chance(0.55 + lvl / 250)) {
    r.hafta = s.hafta;
    s.motivasyon = clamp(s.motivasyon - 1, -2, 2);
    return L("💔 {0} “Henüz hazır değilim,” dedi. Biraz zaman lazım. (Motivasyon -1)", [r.ad]);
  }
  s.para -= cost;
  r.durum = 'evli';
  r.hafta = s.hafta;
  s.motivasyon = 2;
  addMemento(s, { id: 'dugun', tur: 'aile', ad: L("{0} ile düğün günü", [r.ad]), metin: buyuk ? L("Bütün şehrin geldiği görkemli düğün") : L("Sade, sıcak bir nikâh"), nadir: 'efsane', kat: 'aile' });
  if (buyuk) {
    s.populerlik = clamp(s.populerlik + 3, 0, 100);
    addFollowers(s, followers(s) * 0.05);
    s.haberler.unshift(L("💍 {0} ve {1} görkemli bir düğünle evlendi! Magazin sayfaları bunu konuşuyor.", [s.fighter.soyad, r.ad]));
    return L("💍 EVET! Büyük düğün yapıldı, bütün şehir oradaydı. Popülerlik +3.");
  }
  s.haberler.unshift(L("💍 {0}, {1} ile sade bir törenle evlendi.", [s.fighter.soyad, r.ad]));
  return L("💍 EVET! Sade bir nikâhla evlendiniz. Motivasyon tavan.");
}

/** Boşanma: servetin %30'u gider. */
export function divorce(s: GameState): string {
  if (s.iliski?.durum !== 'evli') return '';
  const pay = Math.round((Math.max(0, s.para) * 0.3) / 100) * 100;
  s.para -= pay;
  const ad = s.iliski.ad;
  s.iliski = undefined;
  s.motivasyon = -2;
  s.haberler.unshift(L("💔 {0} ve {1} boşandı.", [s.fighter.soyad, ad]));
  return L("💔 {0} ile boşandınız. Nafaka ve avukatlar: ${1}. (Motivasyon -2)", [ad, pay.toLocaleString(LOC)]);
}

function childName(s: GameState, kiz: boolean) {
  const ulke = COUNTRIES[s.fighter.uyruk]?.ad;
  const pool = NAME_POOLS.find((p) => p.ulke === ulke) ?? pick(NAME_POOLS);
  const used = new Set((s.cocuklar ?? []).map((c) => c.ad));
  const list = (kiz ? pool.kadin : pool.ad).filter((n) => !used.has(n));
  return pick(list.length ? list : kiz ? pool.kadin : pool.ad);
}

/** Haftalık: evlilikte çocuk haberi (en fazla 3, araları en az 40 hafta). */
export function familyTick(s: GameState, weeks: number) {
  if (s.iliski?.durum !== 'evli') return;
  const kids = s.cocuklar ?? [];
  if (kids.length >= 3) return;
  const last = kids.length ? kids[kids.length - 1].hafta : s.iliski.hafta;
  if (s.hafta - last < 40) return;
  if (!chance(1 - Math.pow(0.97, weeks))) return;
  const kiz = chance(0.5);
  const ad = childName(s, kiz);
  s.cocuklar = [...kids, { ad, kiz, hafta: s.hafta }];
  addMemento(s, { id: `aile_dogum_${kids.length}`, tur: 'aile', ad: kiz ? L("Kızın {0} dünyaya geldi", [ad]) : L("Oğlun {0} dünyaya geldi", [ad]), metin: L("Hayatının en güzel günü"), nadir: 'efsane', kat: 'aile' });
  s.motivasyon = 2;
  s.haberler.unshift(kiz ? L("👶 Kızın {0} dünyaya geldi! Hayatının en güzel günü.", [ad]) : L("👶 Oğlun {0} dünyaya geldi! Hayatının en güzel günü.", [ad]));
}

/** Ailen tribündeyse dövüşte küçük destek. */
export function familyMods(s: GameState, mods: Partial<Stats>) {
  if (!(s.cocuklar ?? []).length) return;
  mods.kondisyon = (mods.kondisyon ?? 0) + 1;
  s.haberler.unshift(L("👨‍👩‍👧 Ailen tribünde. Onlar için dövüşüyorsun (kondisyon +1)."));
}

const KID_COST: Record<GameState['stage'], number> = { amator: 100, bolgesel: 300, buyuk: 1_200, ufc: 3_000 };
/** Dövüş başına aile giderleri. */
export function familyCosts(s: GameState): string[] {
  const n = (s.cocuklar ?? []).length;
  if (!n) return [];
  const c = n * KID_COST[s.stage];
  s.para -= c;
  return [L("👨‍👩‍👧 Aile giderleri: -${0}", [c.toLocaleString(LOC)])];
}

/** Hanedan: büyük çocuğun adı yeni kariyere önerilir. */
export const heirName = (s: GameState) => (s.cocuklar ?? [])[0]?.ad;

// ---------- Aile anları ----------
// Çocuklar büyüdükçe kısa sahneler: ilk adım, ilk kelime, tribünde ilk maç, okulun ilk günü, ilk kuşak.
// Her an bir kez gelir ve aile albümüne fotoğraf olarak düşer.
type An = {
  id: string;
  /** Çocuğun en az kaç haftalık olması gerektiği */
  yas: number;
  baslik: () => string;
  metin: (ad: string, s: GameState) => string;
  secenekler: () => string[];
  uygula: (s: GameState, i: number, ad: string) => string;
  foto: (ad: string) => string;
};

const mot = (s: GameState, d: number) => (s.motivasyon = clamp(s.motivasyon + d, -2, 2));
const pop = (s: GameState, d: number) => (s.populerlik = clamp(s.populerlik + d, 0, 100));

const ANLAR: An[] = [
  {
    id: 'adim',
    yas: 52,
    baslik: () => L("👣 İlk Adım"),
    metin: (ad) => L("{0} salonun ortasında, kanepeden sana doğru üç adım attı ve kucağına düştü. Telefon kayıttaydı.", [ad]),
    secenekler: () => [L("Videoyu paylaş"), L("Aile arasında kalsın")],
    uygula: (s, i) => {
      if (i === 0) {
        const d = addFollowers(s, Math.max(300, followers(s) * 0.02));
        pop(s, 1);
        return L("Video bir gecede milyonlara ulaştı. Popülerlik +1, +{0} takipçi.", [Math.round(d).toLocaleString(LOC)]);
      }
      mot(s, 1);
      return L("Bu an yalnızca sizin. Videoyu her antrenmandan önce izliyorsun. Motivasyon +1.");
    },
    foto: (ad) => L("{0} ilk adımlarını atıyor", [ad]),
  },
  {
    id: 'kelime',
    yas: 78,
    baslik: () => L("🗣️ İlk Kelime"),
    metin: (ad, s) => L("Herkes “{0}” demesini bekliyordu. {1} televizyonda maçını görünce bağırdı: “Kafes!”", [s.fighter.kadin ? L("anne") : L("baba"), ad]),
    secenekler: () => [L("Gülmekten yerlere yat"), L("Bir de “kemer” demeyi öğret")],
    uygula: (s, i) => {
      mot(s, 1);
      return i === 0 ? L("Bütün aile gözyaşları içinde güldü. Motivasyon +1.") : L("İkinci kelime de geldi: “Kemer!” Motivasyon +1.");
    },
    foto: (ad) => L("{0} ve ilk kelimesi: “Kafes!”", [ad]),
  },
  {
    id: 'tribun',
    yas: 156,
    baslik: () => L("🏟️ Tribünde İlk Kez"),
    metin: (ad) => L("{0} artık üç yaşında ve bir sonraki maçını tribünden izlemek istiyor. Kulaklığı ve minik formasını şimdiden hazırlamış.", [ad]),
    secenekler: () => [L("Ön sıraya bilet al"), L("Daha küçük, evden izlesin")],
    uygula: (s, i, ad) => {
      if (i === 0) {
        mot(s, 2);
        pop(s, 1);
        return L("Kafese yürürken onu ön sırada gördün. Kulaklıkları kafasından büyüktü. Motivasyon +2, popülerlik +1.");
      }
      mot(s, 1);
      return L("{0} maçı evden izledi ve televizyonun önünde senin hareketlerini taklit etti. Motivasyon +1.", [ad]);
    },
    foto: (ad) => L("Tribündeki en küçük taraftar: {0}", [ad]),
  },
  {
    id: 'okul',
    yas: 312,
    baslik: () => L("🎒 Okulun İlk Günü"),
    metin: (ad) => L("{0} bugün okula başlıyor. Aynı sabah sponsorunun basın toplantısı var.", [ad]),
    secenekler: () => [L("Okula sen götür"), L("Basın toplantısına git")],
    uygula: (s, i, ad) => {
      if (i === 0) {
        mot(s, 2);
        return L("Kapıda elini bırakmak istemedi. Sonra arkasına bakmadan koştu. Motivasyon +2.");
      }
      pop(s, 2);
      mot(s, -1);
      return L("Toplantı iyi geçti ama akşam {0} sana bütün günü tek tek anlattı ve sen orada değildin. Popülerlik +2, motivasyon -1.", [ad]);
    },
    foto: (ad) => L("{0} okulun ilk gününde", [ad]),
  },
  {
    id: 'kusak',
    yas: 416,
    baslik: () => L("🥋 İlk Kuşak"),
    metin: (ad) => L("{0} çocuk judo kursunda ilk kuşağını aldı. Törende hocasına değil, tribündeki sana dönüp eğildi.", [ad]),
    secenekler: () => [L("Kuşağını sen bağla"), L("Kenardan alkışla")],
    uygula: (s, i) => {
      mot(s, 2);
      return i === 0 ? L("Kuşağı bağlarken ellerin titredi. Hiçbir kemer böyle hissettirmemişti. Motivasyon +2.") : L("Salonun en yüksek alkışı seninkiydi. Motivasyon +2.");
    },
    foto: (ad) => L("{0} ilk kuşağıyla", [ad]),
  },
];

/** Zamanı gelen bir aile anı varsa olay olarak döndürür. */
export function familyMoment(s: GameState): GameEventState | null {
  const kids = s.cocuklar ?? [];
  const done = new Set(s.aileAn ?? []);
  for (let i = 0; i < kids.length; i++) {
    const age = s.hafta - kids[i].hafta;
    // Zamanı çoktan geçmiş anlar (eski kayıtlar, uzun aralar) sessizce atlanır: 4 yaşındaki çocuğa "ilk adım" gelmesin.
    const gecmis = ANLAR.filter((a) => age > a.yas + 60 && !done.has(`${i}:${a.id}`));
    if (gecmis.length) s.aileAn = [...(s.aileAn ?? []), ...gecmis.map((a) => `${i}:${a.id}`)];
    const an = ANLAR.find((a) => age >= a.yas && age <= a.yas + 60 && !done.has(`${i}:${a.id}`));
    if (an) return { id: `aile:${i}:${an.id}`, baslik: an.baslik(), metin: an.metin(kids[i].ad, s), secenekler: an.secenekler(), params: {} };
  }
  return null;
}

/** Aile anında seçim: etkiler, albüme fotoğraf. */
export function chooseFamily(s: GameState, idx: number): string {
  const [, iStr, anId] = s.pending.olay!.id.split(':');
  const i = Number(iStr);
  const kid = (s.cocuklar ?? [])[i];
  const an = ANLAR.find((a) => a.id === anId);
  s.aileAn = [...(s.aileAn ?? []), `${i}:${anId}`];
  if (!kid || !an) return '';
  addMemento(s, { id: `aile_${i}_${anId}`, tur: 'aile', ad: an.foto(kid.ad), metin: an.baslik().replace(/^\S+\s/, ''), nadir: 'ozel', kat: 'aile' });
  return an.uygula(s, idx, kid.ad);
}
