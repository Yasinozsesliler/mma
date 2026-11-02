// Hakem Modu kariyer katmanı: hakem karakteri, para/ün/takipçi, beceriler, maç teklifleri (takvim), sosyal medya,
// olaylar, hakem sıralaması ve Yılın Hakemi töreni. Motor (referee.ts) maçı yönetir; bu katman maçların arasındaki hayat.
import { L } from '../i18n';
import { NAME_POOLS, ORGS } from './data';
import { chance, clamp, pick, rand, randInt } from './rng';
import type { Appearance } from './types';
import { CITIES } from './worldMap';
import type { RefBout, RefRun, RefTier } from './referee';

// ---------- Beceriler ----------

export type RefSkill = 'okuma' | 'pozisyon' | 'sakinlik' | 'kural';
export const SKILL_MAX = 5;
export const REF_SKILLS: { key: RefSkill; icon: string; ad: () => string; acik: () => string }[] = [
  {
    key: 'okuma',
    icon: 'eye',
    ad: () => L("Okuma"),
    acik: () => L("Karar anlarında içgüdün konuşur: gerçeği gösteren ek bir ipucu gelir."),
  },
  {
    key: 'pozisyon',
    icon: 'run-fast',
    ad: () => L("Pozisyon"),
    acik: () => L("Doğru açıda durursun: geç kalan durdurma daha az zarar verir, gri anlarda beklemek daha çok tutar."),
  },
  {
    key: 'sakinlik',
    icon: 'meditation',
    ad: () => L("Sakinlik"),
    acik: () => L("Baskı altında soğukkanlısın: hatalar itibarını daha az düşürür, basının önünde daha iyi konuşursun."),
  },
  {
    key: 'kural',
    icon: 'book-open-variant',
    ad: () => L("Kural bilgisi"),
    acik: () => L("Puan kartında rauntun hesabını görürsün; faulde doğru yaptırımı bilirsin."),
  },
];
export const skillLvl = (r: Pick<RefRun, 'beceri'>, k: RefSkill) => r.beceri?.[k] ?? 0;
export const skillCost = (lvl: number) => lvl + 1;

export function upgradeSkill(r: RefRun, k: RefSkill) {
  const lv = skillLvl(r, k);
  const cost = skillCost(lv);
  if (lv >= SKILL_MAX || (r.bp ?? 0) < cost) return;
  r.bp = (r.bp ?? 0) - cost;
  r.beceri = { ...(r.beceri ?? {}), [k]: lv + 1 };
}

// ---------- Seminerler ----------

export const BASE_PAY: Record<RefTier, number> = { amator: 150, bolgesel: 600, buyuk: 2200, ucc: 7500 };
export const SEMINARS: { id: string; ad: () => string; acik: () => string; bp: number; carpan: number }[] = [
  { id: 'video', ad: () => L("Video analizi semineri"), acik: () => L("Geçmiş maçların kayıtlarını eğitmenlerle izle."), bp: 1, carpan: 0.6 },
  { id: 'kamp', ad: () => L("Uluslararası hakem kampı"), acik: () => L("Dünyanın en iyi hakemleriyle bir hafta: kural, pozisyon, iletişim."), bp: 2, carpan: 1.8 },
];
export const seminarCost = (r: RefRun, id: string) => Math.round((BASE_PAY[r.seviye] * (SEMINARS.find((s) => s.id === id)?.carpan ?? 1)) / 10) * 10;

/** Maçlar arasında bir seminer: para karşılığı beceri puanı (her maç arası bir kez). */
export function takeSeminar(r: RefRun, id: string) {
  const s = SEMINARS.find((x) => x.id === id);
  const cost = seminarCost(r, id);
  if (!s || r.seminer || (r.para ?? 0) < cost) return;
  r.para = (r.para ?? 0) - cost;
  r.bp = (r.bp ?? 0) + s.bp;
  r.seminer = true;
  r.sonMesaj = L("📚 {0} tamamlandı: +{1} beceri puanı.", [s.ad(), s.bp]);
}

// ---------- Maç teklifleri (takvim) ----------

export type RefOffer = { org: string; sehir: string; ucret: number; unvan: boolean; anaKart: boolean };

const TIER_ORGS: Record<RefTier, (() => string)[]> = {
  amator: [() => ORGS.amator.ad, () => L("Kulüpler Kupası"), () => L("Gençler Turnuvası")],
  bolgesel: [() => ORGS.cfc.ad, () => ORGS.oktagon.ad],
  buyuk: [() => ORGS.pfl.ad, () => ORGS.one.ad, () => ORGS.mvp.ad, () => ORGS.dwcs.ad],
  ucc: [() => ORGS.ufc.ad],
};
const r10 = (n: number) => Math.round(n / 10) * 10;

export function canTitle(r: RefRun) {
  return r.seviye === 'ucc' ? r.itibar >= 85 : r.seviye !== 'amator' && r.itibar >= 45;
}

/** Sıradaki maç için üç teklif: alt kart, (itibar yetiyorsa) ana kart, (yetiyorsa) ünvan maçı. */
export function makeOffers(r: RefRun): RefOffer[] {
  const base = BASE_PAY[r.seviye] * (1 + (r.un ?? 0) / 200);
  const one = (carpan: number, anaKart = false, unvan = false): RefOffer => ({ org: pick(TIER_ORGS[r.seviye])(), sehir: pick(CITIES).ad, ucret: r10(base * carpan), anaKart, unvan });
  const list = [one(0.8)];
  list.push(r.itibar >= 25 || r.seviye !== 'amator' ? one(1.6, true) : one(1.0));
  list.push(canTitle(r) && chance(0.65) ? one(2.6, true, true) : one(1.1));
  return list;
}

// ---------- Sosyal medya ----------

export type RefPost = { kim: string; kul: string; metin: string; ton: 'iyi' | 'kotu' | 'notr'; begeni: number };

const tag = (r: RefRun) => (r.soyad || r.ad).replace(/\s+/g, '');

function makePosts(r: RefRun, b: RefBout, puan: number, hata: boolean): RefPost[] {
  const ref = `${r.ad} ${r.soyad}`.trim();
  const fan = (pick([L("MMA Gündem"), L("Kafes Haber"), L("Hakem İzleme"), L("Dövüş Gecesi TV")]) as string);
  const kul = (s: string) => '@' + s.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9ğüşıöç]/g, '');
  const like = () => Math.round((50 + (r.takipci ?? 0) * 0.04) * (0.6 + rand() * 1.2));
  const out: RefPost[] = [];
  const ton: RefPost['ton'] = puan >= 5 && !hata ? 'iyi' : puan >= -4 ? 'notr' : 'kotu';
  const metin =
    puan >= 12 && !hata
      ? pick([L("Bu gece {0} hakemliğin nasıl yapılacağını gösterdi. Tek hata yok. 👏", [ref]), L("{0} doğru anda girdi, dövüşçüyü korudu. Saygı.", [ref]), L("Puan kartları birebir. {0} şu an sporun en iyilerinden.", [ref])])
      : puan >= 5
        ? pick([L("Sağlam bir yönetim. {0} maçın önüne geçmedi.", [ref]), L("{0} sakin ve net. Böyle hakem görmek güzel.", [ref])])
        : puan >= -4
          ? pick([L("{0} bu gece biraz kararsızdı ama büyük hata yok.", [ref]), L("O karar doğru muydu? Yorumlar ikiye bölündü. 🤔")])
          : pick([L("SKANDAL! {0} bu maçı yönetmemeliydi. 😡", [ref]), L("{0} için komisyon soruşturma açmalı. Dövüşçü sağlığı şaka değil.", [ref]), L("Bu kararı izleyip inanamadım. #{0}İstifa", [tag(r)])]);
  out.push({ kim: fan, kul: kul(fan), metin, ton, begeni: like() * (ton === 'kotu' ? 3 : 1) });
  // Dövüşçülerden biri konuşur
  const w = b.sonuc?.kazanan;
  if (w != null) {
    const win = w === 0 ? b.a : b.b;
    const los = w === 0 ? b.b : b.a;
    const erken = b.kararlar.some((k) => k.tip === 'erken');
    const korudu = b.kararlar.some((k) => k.tip === 'koruma');
    if (erken) out.push({ kim: los.ad, kul: kul(los.ad), metin: L("Daha savaşıyordum. Bu durdurma bana haksızlıktı. 😤"), ton: 'kotu', begeni: like() * 2 });
    else if (korudu && b.sonuc && b.sonuc.yontem !== 'UD') out.push({ kim: los.ad, kul: kul(los.ad), metin: L("Hakem doğru olanı yaptı. Ailemin yanına sağlıklı dönüyorum. Geri döneceğim. 🙏"), ton: 'iyi', begeni: like() * 2 });
    else out.push({ kim: win.ad, kul: kul(win.ad), metin: pick([L("Zafer benim! Herkese teşekkürler. 🏆"), L("Bu gece kafeste en iyisi bendim. Sıradaki gelsin!")]), ton: 'notr', begeni: like() * 2 });
  }
  if (b.unvan) out.push({ kim: L("Kafes Haber"), kul: '@kafeshaber', metin: L("Ünvan maçında hakem: {0}. Büyük sahne, büyük sorumluluk.", [ref]), ton: 'notr', begeni: like() });
  return out;
}

// ---------- Olaylar ----------

type Effect = { itibar?: number; un?: number; para?: number; bp?: number; takipci?: number };
export type RefEvent = { id: string; baslik: string; metin: string; secenekler: { ad: string; etki: Effect; sonuc: string }[] };

type Ctx = { r: RefRun; b: RefBout; puan: number; hata: boolean };

const EVENTS: { id: string; w: number; when: (c: Ctx) => boolean; make: (c: Ctx) => RefEvent }[] = [
  {
    id: 'basin',
    w: 10,
    when: (c) => c.puan < -4,
    make: ({ r }) => {
      const sak = Math.floor(skillLvl(r, 'sakinlik') / 2);
      return {
        id: 'basin',
        baslik: L("BASIN KAPIDA"),
        metin: L("Maçtan sonra gazeteciler tartışmalı kararını soruyor. Kameralar sende."),
        secenekler: [
          { ad: L("Hatamı kabul ediyorum"), etki: { itibar: 3 + sak, un: -1 }, sonuc: L("Dürüstlüğün takdir gördü.") },
          { ad: L("Kararımın arkasındayım"), etki: { itibar: -2 + sak, un: 3, takipci: 400 }, sonuc: L("Tartışma büyüdü; adın her yerde.") },
          { ad: L("Yorum yapmayacağım"), etki: { itibar: sak }, sonuc: L("Sessizlik fırtınayı biraz dindirdi.") },
        ],
      };
    },
  },
  {
    id: 'tesekkur',
    w: 6,
    when: (c) => c.b.kararlar.some((k) => k.tip === 'koruma'),
    make: ({ b }) => {
      const w = b.sonuc?.kazanan;
      const los = w == null ? b.a : w === 0 ? b.b : b.a;
      return {
        id: 'tesekkur',
        baslik: L("BİR MESAJ VAR"),
        metin: L("{0} sana yazdı: “O gece beni korudun. Teşekkür ederim.”", [los.ad]),
        secenekler: [
          { ad: L("Mesajı paylaş"), etki: { un: 2, takipci: 600 }, sonuc: L("Paylaşım binlerce beğeni aldı.") },
          { ad: L("Özelden cevap ver"), etki: { itibar: 2 }, sonuc: L("Dövüşçülerin gözünde güvenilir bir isimsin.") },
        ],
      };
    },
  },
  {
    id: 'komisyon',
    w: 5,
    when: (c) => c.hata,
    make: ({ r }) => {
      const k = skillLvl(r, 'kural');
      return {
        id: 'komisyon',
        baslik: L("KOMİSYON İNCELEMESİ"),
        metin: L("Atletizm komisyonu son maçtaki bir kararını incelemeye aldı."),
        secenekler: [
          { ad: L("Kayıtlarla kendini savun"), etki: { itibar: k >= 2 ? 3 : -2 }, sonuc: k >= 2 ? L("Kural bilgin seni kurtardı: komisyon haklı buldu.") : L("Savunman zayıf kaldı; dosyana not düşüldü.") },
          { ad: L("Eğitim programına katıl"), etki: { bp: 1, para: -0.5 }, sonuc: L("Komisyon memnun; sen de bir şey öğrendin.") },
        ],
      };
    },
  },
  {
    id: 'sponsor',
    w: 4,
    when: (c) => (c.r.un ?? 0) >= 15,
    make: () => ({
      id: 'sponsor',
      baslik: L("SPONSOR TEKLİFİ"),
      metin: L("Bir spor ekipmanı markası seninle reklam çekmek istiyor."),
      secenekler: [
        { ad: L("Kabul et"), etki: { para: 3, itibar: -1, un: 2 }, sonuc: L("Reklam yayında; bazıları hakemin tarafsızlığını sorguladı.") },
        { ad: L("Reddet: hakem tarafsız kalır"), etki: { itibar: 2 }, sonuc: L("İlkelerin konuşuldu.") },
      ],
    }),
  },
  {
    id: 'antrenor',
    w: 5,
    when: (c) => c.puan < 5,
    make: ({ b, r }) => {
      const w = b.sonuc?.kazanan;
      const los = w == null ? b.b : w === 0 ? b.b : b.a;
      const sak = skillLvl(r, 'sakinlik');
      return {
        id: 'antrenor',
        baslik: L("KÖŞEDEN SALDIRI"),
        metin: L("{0} adlı dövüşçünün antrenörü sosyal medyada seni hedef aldı.", [los.ad.split(' ').slice(-1)[0]]),
        secenekler: [
          { ad: L("Cevap ver"), etki: { un: 2, itibar: sak >= 3 ? 0 : -2, takipci: 300 }, sonuc: sak >= 3 ? L("Soğukkanlı cevabın tartışmayı bitirdi.") : L("Atışma büyüdü; komisyon hoşnut değil.") },
          { ad: L("Görmezden gel"), etki: { itibar: 1 }, sonuc: L("Profesyonel duruşun dikkat çekti.") },
        ],
      };
    },
  },
  {
    id: 'mentor',
    w: 3,
    when: (c) => c.r.mac >= 4,
    make: () => ({
      id: 'mentor',
      baslik: L("GENÇ BİR HAKEM"),
      metin: L("Amatör bir hakem, sana mentorluk yapıp yapamayacağını soruyor."),
      secenekler: [
        { ad: L("Kabul et"), etki: { bp: 1, un: 1 }, sonuc: L("Öğretirken sen de öğrendin.") },
        { ad: L("Şu an vaktim yok"), etki: {}, sonuc: L("Belki ileride.") },
      ],
    }),
  },
  {
    id: 'podcast',
    w: 3,
    when: (c) => (c.r.un ?? 0) >= 10,
    make: () => ({
      id: 'podcast',
      baslik: L("PODCAST DAVETİ"),
      metin: L("Popüler bir MMA podcast'i seni konuk etmek istiyor."),
      secenekler: [
        { ad: L("Katıl, kafesin içini anlat"), etki: { un: 3, takipci: 900 }, sonuc: L("Bölüm çok dinlendi; hakemliği ilk kez bu kadar konuştular.") },
        { ad: L("Nazikçe reddet"), etki: {}, sonuc: L("Gizemini korudun.") },
      ],
    }),
  },
];

/** Etkiyi uygular. Para etkisi taban maç ücretinin katı olarak yazılır. */
function apply(r: RefRun, e: Effect) {
  if (e.itibar) r.itibar = clamp(r.itibar + e.itibar, 0, 100);
  if (e.un) r.un = clamp((r.un ?? 0) + e.un, 0, 100);
  if (e.para) r.para = Math.max(0, (r.para ?? 0) + r10(BASE_PAY[r.seviye] * e.para));
  if (e.bp) r.bp = (r.bp ?? 0) + e.bp;
  if (e.takipci) r.takipci = (r.takipci ?? 0) + Math.round(e.takipci * (1 + (r.un ?? 0) / 25));
}

export function chooseEvent(r: RefRun, i: number) {
  const ev = r.olay;
  const o = ev?.secenekler[i];
  if (!ev || !o) return;
  apply(r, o.etki);
  r.olay = null;
  r.sonMesaj = o.sonuc;
}

function rollEvent(c: Ctx): RefEvent | null {
  if (c.puan >= -4 && !chance(0.45)) return null;
  const pool = EVENTS.filter((e) => e.when(c));
  if (!pool.length) return null;
  const forced = pool.find((e) => e.id === 'basin');
  if (forced) return forced.make(c);
  let x = rand() * pool.reduce((t, e) => t + e.w, 0);
  for (const e of pool) {
    x -= e.w;
    if (x <= 0) return e.make(c);
  }
  return pool[0].make(c);
}

// ---------- Hakem sıralaması ----------

export type RefRival = { ad: string; ulke: string; tier: RefTier; itibar: number };
const TIER_ORDER: RefTier[] = ['amator', 'bolgesel', 'buyuk', 'ucc'];

function makeRivals(): RefRival[] {
  const tiers: RefTier[] = ['ucc', 'ucc', 'buyuk', 'buyuk', 'bolgesel', 'bolgesel', 'amator'];
  return tiers.map((tier) => {
    const p = pick(NAME_POOLS);
    return { ad: `${pick(p.ad)} ${pick(p.soyad)}`, ulke: p.ulke, tier, itibar: randInt(25, 85) };
  });
}

export const refScore = (tier: RefTier, itibar: number) => TIER_ORDER.indexOf(tier) * 100 + itibar;

/** Sen ve rakip hakemler, puana göre sıralı. */
export function refRanking(r: RefRun) {
  const me = { ad: `${r.ad} ${r.soyad}`.trim(), ulke: r.ulke ?? 'tr', tier: r.seviye, itibar: r.itibar, sen: true };
  return [...(r.rakipler ?? []).map((x) => ({ ...x, sen: false })), me].sort((a, b) => refScore(b.tier, b.itibar) - refScore(a.tier, a.itibar));
}
export const myRank = (r: RefRun) => refRanking(r).findIndex((x) => x.sen) + 1;

function driftRivals(r: RefRun) {
  r.rakipler = (r.rakipler ?? []).map((x) => {
    let itibar = clamp(x.itibar + randInt(-3, 4), 5, 99);
    let tier = x.tier;
    if (itibar >= 80 && tier !== 'ucc' && chance(0.15)) {
      tier = TIER_ORDER[TIER_ORDER.indexOf(tier) + 1];
      itibar = 40;
    }
    return { ...x, itibar, tier };
  });
}

// ---------- Yılın Hakemi töreni ----------

export type RefCeremony = { yil: number; adaylar: { ad: string; ulke: string; ort: number; sen: boolean }[]; kazanan: number; odul: number };

export function makeCeremony(r: RefRun, yil: number, ort: number): RefCeremony {
  const rivals = [...(r.rakipler ?? [])].sort((a, b) => refScore(b.tier, b.itibar) - refScore(a.tier, a.itibar)).slice(0, 3);
  const adaylar = [
    ...rivals.map((x) => ({ ad: x.ad, ulke: x.ulke, ort: Math.round((5.5 + rand() * 3.4) * 10) / 10, sen: false })),
    { ad: `${r.ad} ${r.soyad}`.trim(), ulke: r.ulke ?? 'tr', ort, sen: true },
  ].sort(() => rand() - 0.5);
  let kazanan = 0;
  adaylar.forEach((a, i) => {
    if (a.ort > adaylar[kazanan].ort || (a.ort === adaylar[kazanan].ort && a.sen)) kazanan = i;
  });
  const odul = r10(BASE_PAY[r.seviye] * 8);
  return { yil, adaylar, kazanan, odul };
}

/** Tören kapanınca ödül işlenir. */
export function closeCeremony(r: RefRun) {
  const t = r.toren;
  if (!t) return;
  if (t.adaylar[t.kazanan]?.sen) {
    r.para = (r.para ?? 0) + t.odul;
    r.un = clamp((r.un ?? 0) + 8, 0, 100);
    r.bp = (r.bp ?? 0) + 2;
    r.takipci = (r.takipci ?? 0) + 2500;
  }
  r.toren = null;
}

// ---------- Kayıt ----------

export const DEFAULT_REF_LOOK: Appearance = { ten: 1, sac: 'kisa', sacRenk: 0, goz: 0, sakal: 'yok', yara: false, dovme: false };

/** Eski kayıtlar ve yeni başlangıçlar için kariyer alanlarını doldurur. */
export function ensureCareer(r: RefRun): RefRun {
  r.gorunum ??= { ...DEFAULT_REF_LOOK };
  r.ulke ??= 'tr';
  r.para ??= 0;
  r.un ??= 3;
  r.takipci ??= 150;
  r.beceri ??= {};
  r.bp ??= 1;
  r.akis ??= [];
  r.rakipler ??= makeRivals();
  r.kazanc ??= 0;
  if (!r.aktif && !r.teklifler?.length) r.teklifler = makeOffers(r);
  return r;
}

// ---------- Maç sonu ----------

export type AfterBout = { para: number; bonus: boolean; takipci: number; bp: number };

/** Maç sonrası hayat: ücret, beceri puanı, ün ve takipçi, sosyal medya, olay, yeni teklifler. */
export function afterBout(r: RefRun, b: RefBout, puan: number, hata: boolean): AfterBout {
  ensureCareer(r);
  const kusursuz = puan >= 12 && !hata;
  const bonus = kusursuz && b.kararlar.length + b.kartlar.length >= 3;
  const para = r10((b.ucret ?? BASE_PAY[r.seviye]) * (bonus ? 1.5 : 1));
  r.para = (r.para ?? 0) + para;
  r.kazanc = (r.kazanc ?? 0) + para;
  const bp = kusursuz ? 2 : puan >= 5 ? 1 : 0;
  r.bp = (r.bp ?? 0) + bp;
  const unD = Math.round(clamp(puan / 4, -2, 3)) + (b.anaKart ? 1 : 0) + (b.unvan ? 2 : 0) + (puan < -8 ? 2 : 0);
  r.un = clamp((r.un ?? 0) + unD, 0, 100);
  const tierMul = { amator: 1, bolgesel: 2.5, buyuk: 6, ucc: 15 }[r.seviye];
  const takipci = Math.round((20 + (r.un ?? 0) * 6) * tierMul * (b.anaKart ? 1.5 : 1) * (b.unvan ? 2 : 1) * (puan < -8 ? 2.2 : kusursuz ? 1.4 : 1) * (0.7 + rand() * 0.6));
  r.takipci = (r.takipci ?? 0) + takipci;
  r.akis = [...makePosts(r, b, puan, hata), ...(r.akis ?? [])].slice(0, 30);
  r.olay = rollEvent({ r, b, puan, hata });
  r.seminer = false;
  driftRivals(r);
  r.teklifler = makeOffers(r);
  return { para, bonus, takipci, bp };
}

export const TIER_COLOR: Record<RefTier, string> = { amator: '#8a8f9c', bolgesel: '#3ccf6e', buyuk: '#4cc9f0', ucc: '#ffc22e' };
export const nextTier = (t: RefTier): RefTier | null => TIER_ORDER[TIER_ORDER.indexOf(t) + 1] ?? null;
