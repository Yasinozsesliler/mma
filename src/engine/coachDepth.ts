// Antrenör Modu derinlik katmanı: hoca felsefesi, üç itibar (öğrenci sadakati, organizasyon ilişkisi, medya imajı),
// yardımcı ekip (maaşlı), maç kampı, beceri uzmanlıkları, ezeli rakip hoca, yeni salon olayları, emeklilik ve
// Antrenör Onur Listesi. Salon motoru (academy.ts) ve antrenör kariyeri (coachMode.ts) etkileri buradan okur;
// bu dosya onlardan yalnızca tür alır (döngüsel bağımlılık yok).
import { L, LOC } from '../i18n';
import { chance, clamp } from './rng';
import type { GameState, StatKey } from './types';
import type { Student, Tier } from './academy';
import type { CoachSkill } from './coachMode';

const $ = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;

// ---------- Hoca felsefesi ----------

export type Philosophy = 'savasci' | 'teknik' | 'aile' | 'yildiz';

export const PHILOSOPHIES: Record<Philosophy, { ad: () => string; slogan: () => string; arti: () => string; eksi: () => string; ikon: string; renk: string }> = {
  savasci: {
    ad: () => L("Savaşçı Okulu"),
    slogan: () => L("“Kafese bitirmeye gireriz.”"),
    arti: () => L("Bitiriş şansı yüksek, bitirişle gelen galibiyetler daha çok ün ve takipçi getirir."),
    eksi: () => L("Sert antrenman: sakatlık olayları daha sık, mağlubiyet morali biraz daha bozar."),
    ikon: 'fire',
    renk: '#e63946',
  },
  teknik: {
    ad: () => L("Teknik Okul"),
    slogan: () => L("“Önce doğru teknik, sonra zafer.”"),
    arti: () => L("Öğrenciler %12 daha hızlı gelişir, doğru oyun planı daha çok fark yaratır."),
    eksi: () => L("Medya sizi sıkıcı bulur: takipçi artışı biraz daha yavaş."),
    ikon: 'school',
    renk: '#3a86ff',
  },
  aile: {
    ad: () => L("Aile Salonu"),
    slogan: () => L("“Burası bir salon değil, bir aile.”"),
    arti: () => L("Öğrenci sadakati ve moral yüksek kalır; transfer tekliflerinde öğrencin daha kolay kalır."),
    eksi: () => L("Organizasyonlar pazarlıkta yumuşak bulur: maç payı biraz daha düşük."),
    ikon: 'home-heart',
    renk: '#3ecf7a',
  },
  yildiz: {
    ad: () => L("Yıldız Fabrikası"),
    slogan: () => L("“Kafeste de kamerada da parlarız.”"),
    arti: () => L("Takipçi ve sponsor geliri %50 fazla, maç payı daha yüksek."),
    eksi: () => L("Şöhret ego yapar: galibiyet sonrası moral artışı daha az, sadakat daha hızlı düşer."),
    ikon: 'star-shooting',
    renk: '#f2c14e',
  },
};
export const PHILOSOPHY_KEYS = Object.keys(PHILOSOPHIES) as Philosophy[];

const phil = (s: GameState) => s.antrenor?.felsefe;

/** Felsefe seçimi: ilk seçim ücretsiz; sonra yılda bir kez değiştirilebilir. */
export function setPhilosophy(s: GameState, f: Philosophy) {
  const r = s.antrenor;
  if (!r || !canChangePhilosophy(s)) return;
  const ilk = !r.felsefe;
  r.felsefe = f;
  r.felsefeYil = r.yil.no;
  if (!ilk) r.itibar = { ...itibar(s), sadakat: clamp(itibar(s).sadakat - 6, 0, 100) };
  s.haberler.unshift(L("🧭 {0} yeni yolunu seçti: {1}.", [s.salon?.ad ?? '', PHILOSOPHIES[f].ad()]));
}
export const canChangePhilosophy = (s: GameState) => {
  const r = s.antrenor;
  return !!r && (!r.felsefe || (r.felsefeYil ?? 0) < r.yil.no);
};

// ---------- Üç itibar ----------

export type Axis = 'sadakat' | 'iliski' | 'imaj';
export type Itibar = Record<Axis, number>;

export const AXES: Record<Axis, { ad: () => string; aciklama: () => string; renk: string; ikon: string }> = {
  sadakat: { ad: () => L("Öğrenci sadakati"), aciklama: () => L("Öğrencilerin sana bağlılığı: moral, transfer teklifleri, salondan ayrılma."), renk: '#3ecf7a', ikon: 'handshake' },
  iliski: { ad: () => L("Organizasyon ilişkisi"), aciklama: () => L("Organizatörlerin sana güveni: maç payı, ünvan maçı ve şampiyonluk şansı."), renk: '#3a86ff', ikon: 'domain' },
  imaj: { ad: () => L("Medya imajı"), aciklama: () => L("Basının ve taraftarın gözündeki salon: takipçi, sponsorlar, yetenekli adaylar."), renk: '#f2c14e', ikon: 'television-classic' },
};
export const AXIS_KEYS = Object.keys(AXES) as Axis[];

export const itibar = (s: GameState): Itibar => s.antrenor?.itibar ?? { sadakat: 50, iliski: 30, imaj: 30 };

export function shiftAxes(s: GameState, d: Partial<Itibar>) {
  const r = s.antrenor;
  if (!r) return;
  const cur = itibar(s);
  r.itibar = {
    sadakat: clamp(cur.sadakat + (d.sadakat ?? 0), 0, 100),
    iliski: clamp(cur.iliski + (d.iliski ?? 0), 0, 100),
    imaj: clamp(cur.imaj + (d.imaj ?? 0), 0, 100),
  };
}

/** "+3 sadakat · −2 imaj" gibi kısa özet (olay sonuçlarında). */
export function axesNote(d: Partial<Itibar>) {
  const short: Record<Axis, () => string> = { sadakat: () => L("sadakat"), iliski: () => L("organizasyon"), imaj: () => L("imaj") };
  return AXIS_KEYS.filter((k) => d[k])
    .map((k) => `${d[k]! > 0 ? '+' : '−'}${Math.abs(d[k]!)} ${short[k]()}`)
    .join(' · ');
}

// ---------- Yardımcı ekip ----------

export type StaffRole = 'boks' | 'gures' | 'kondisyoner' | 'cutman' | 'analist';

export const STAFF: Record<StaffRole, { ad: () => string; aciklama: () => string; ikon: string; maas: number; imza: number; statlar?: StatKey[] }> = {
  boks: { ad: () => L("Boks hocası"), aciklama: () => L("Vuruş ve hız %50 daha hızlı gelişir."), ikon: 'boxing-glove', maas: 900, imza: 6_000, statlar: ['vurus', 'hiz'] },
  gures: { ad: () => L("Güreş hocası"), aciklama: () => L("Güreş ve yer oyunu %50 daha hızlı gelişir."), ikon: 'arm-flex', maas: 900, imza: 6_000, statlar: ['gures', 'yer'] },
  kondisyoner: { ad: () => L("Kondisyoner"), aciklama: () => L("Kondisyon ve çene gelişir; öğrencilerin maça daha dinç çıkar."), ikon: 'run-fast', maas: 800, imza: 5_000, statlar: ['kondisyon', 'cene'] },
  cutman: { ad: () => L("Cutman"), aciklama: () => L("Kesikler kapanır: doktorun maçı durdurma ihtimali üçte bire iner."), ikon: 'bandage', maas: 500, imza: 3_000 },
  analist: { ad: () => L("Video analisti"), aciklama: () => L("Keşif raporu neredeyse hep doğru, köşe talimatları daha etkili."), ikon: 'video-vintage', maas: 1_100, imza: 8_000 },
};
export const STAFF_KEYS = Object.keys(STAFF) as StaffRole[];

/** Ekip yeri salon seviyesine bağlı: garajda 1, sonra her seviyede bir fazla (en çok 5). */
export const staffSlots = (s: GameState) => clamp(s.salon?.seviye ?? 1, 1, 5);
export const hasStaff = (s: GameState, k: StaffRole) => !!s.antrenor?.ekip?.includes(k);
export const staffWages = (s: GameState) => (s.antrenor?.ekip ?? []).reduce((a, k) => a + STAFF[k].maas, 0);

export function hireStaff(s: GameState, k: StaffRole): string | null {
  const r = s.antrenor;
  if (!r || hasStaff(s, k)) return null;
  if ((r.ekip?.length ?? 0) >= staffSlots(s)) return L("Ekipte yer yok. Salonu büyüt ya da birini gönder.");
  if (s.para < STAFF[k].imza) return L("İmza parası için kasada yeterli para yok.");
  s.para -= STAFF[k].imza;
  r.ekip = [...(r.ekip ?? []), k];
  s.haberler.unshift(L("🤝 {0} ekibe katıldı.", [STAFF[k].ad()]));
  return null;
}

export function fireStaff(s: GameState, k: StaffRole) {
  const r = s.antrenor;
  if (!r) return;
  r.ekip = (r.ekip ?? []).filter((x) => x !== k);
  shiftAxes(s, { sadakat: -2 });
}

// ---------- Maç kampı ----------

export type CampKey = 'ozel' | 'kondisyon' | 'sert' | 'hafif';

export const CAMPS: Record<CampKey, { ad: () => string; aciklama: () => string; ikon: string; ucret: (t: Tier) => number }> = {
  ozel: { ad: () => L("Rakibe özel kamp"), aciklama: () => L("Rakibin bütün maçları izlenir: keşif raporu kesin doğru, maça hafif üstün başlar."), ikon: 'target-account', ucret: (t) => ({ amator: 1_000, bolgesel: 2_500, buyuk: 6_000, ucc: 15_000 })[t] },
  kondisyon: { ad: () => L("Kondisyon kampı"), aciklama: () => L("Dağ kampı: öğrencin maça çok daha dinç çıkar, geç rauntlarda nefesi bitmez."), ikon: 'image-filter-hdr', ucret: (t) => ({ amator: 800, bolgesel: 2_000, buyuk: 5_000, ucc: 12_000 })[t] },
  sert: { ad: () => L("Sert sparring kampı"), aciklama: () => L("Ücretsiz ve etkili: maça daha keskin girer. Ama sakatlanıp maçtan çekilme riski var."), ikon: 'fire', ucret: () => 0 },
  hafif: { ad: () => L("Normal hazırlık"), aciklama: () => L("Salonda olağan haftalar. Ücretsiz, risksiz, ekstrası yok."), ikon: 'calendar-check', ucret: () => 0 },
};
export const CAMP_KEYS = Object.keys(CAMPS) as CampKey[];

/** Maç kampını seç (köşeye geçmeden önce, maç başına bir kez). Dönüş: sonuç satırı (sakatlık / para yetmedi). */
export function chooseCamp(s: GameState, st: Student, k: CampKey): string {
  const b = st.mac;
  if (!b || b.kose || b.kamp) return '';
  const ucret = CAMPS[k].ucret(st.seviye);
  if (s.para < ucret) return L("Kampın ücreti için kasada yeterli para yok.");
  s.para -= ucret;
  b.kamp = k;
  if (k === 'ozel' && b.tip) b.tipRapor = b.tip;
  if (k === 'sert') {
    // Savaşçı Okulu'nda sert kamp daha olağan: risk biraz daha az ama hiç yok değil
    const risk = phil(s) === 'savasci' ? 0.12 : 0.18;
    if (chance(risk)) {
      st.mac = undefined;
      st.macHafta = s.hafta + 5;
      st.moral = clamp(st.moral - 8, 0, 100);
      shiftAxes(s, { iliski: -4 });
      const t = L("🤕 {0} sert sparring'de sakatlandı ve maçtan çekildi. Organizasyon memnun değil.", [st.soyad]);
      s.haberler.unshift(t);
      return t;
    }
  }
  return k === 'hafif' ? '' : L("🏕️ {0}: {1}.", [st.soyad, CAMPS[k].ad()]);
}

// ---------- Uzmanlıklar (beceri en üst seviyedeyken iki seçenekten biri) ----------

export type Perk = 'a' | 'b';
export const PERKS: Record<CoachSkill, Record<Perk, { ad: () => string; aciklama: () => string }>> = {
  taktik: {
    a: { ad: () => L("Raunt Okuyucu"), aciklama: () => L("Her raunt arası talimat biraz daha etkili.") },
    b: { ad: () => L("Son Raunt Ustası"), aciklama: () => L("Son rauntta verdiğin talimat çok daha etkili.") },
  },
  gelisim: {
    a: { ad: () => L("Eksiksiz Atölye"), aciklama: () => L("Odak dışındaki özellikler yavaşlamaz.") },
    b: { ad: () => L("Genç Yetenek Uzmanı"), aciklama: () => L("24 yaşından küçük öğrenciler %20 daha hızlı gelişir.") },
  },
  gozcu: {
    a: { ad: () => L("Elmas Avcısı"), aciklama: () => L("Yetenek avında adayların potansiyeli daha yüksek.") },
    b: { ad: () => L("Rakip Dosyası"), aciklama: () => L("Keşif raporları çok daha isabetli.") },
  },
  motivasyon: {
    a: { ad: () => L("Taş Gibi"), aciklama: () => L("Mağlubiyetten sonra moral yarı yarıya az düşer.") },
    b: { ad: () => L("Ateşleyici"), aciklama: () => L("Köşede kazanılan maçlardan sonra moral ve sadakat ekstra artar.") },
  },
  menajer: {
    a: { ad: () => L("Pazarlıkçı"), aciklama: () => L("Maç ücretlerinden salona ekstra pay.") },
    b: { ad: () => L("Sponsor Ağı"), aciklama: () => L("Sponsor teklifleri ve tören ödülleri %60 daha büyük.") },
  },
};

export const perk = (s: GameState, k: CoachSkill) => s.antrenor?.uzman?.[k];
export const hasPerk = (s: GameState, k: CoachSkill, p: Perk) => perk(s, k) === p;

export function choosePerk(s: GameState, k: CoachSkill, p: Perk, max: number) {
  const r = s.antrenor;
  if (!r || r.beceri[k] < max || r.uzman?.[k]) return;
  r.uzman = { ...(r.uzman ?? {}), [k]: p };
  s.haberler.unshift(L("🎓 Uzmanlık: {0}.", [PERKS[k][p].ad()]));
}

// ---------- Salon motorunun okuduğu etkiler ----------

/** Haftalık gelişim çarpanı (öğrenci ve özellik başına). odakli: bu özellik öğrencinin odağı mı; odakVar: öğrencinin odağı var mı */
export function growthMod(s: GameState, st: Student, k: StatKey, odakli: boolean, odakVar: boolean): number {
  if (!s.antrenor) return odakVar ? (odakli ? 2 : 0.8) : 1;
  let m = odakVar ? (odakli ? 2 : hasPerk(s, 'gelisim', 'a') ? 1 : 0.8) : 1;
  if (phil(s) === 'teknik') m *= 1.12;
  if (phil(s) === 'aile') m *= 0.96;
  if (hasPerk(s, 'gelisim', 'b') && st.yas < 24) m *= 1.2;
  for (const role of s.antrenor.ekip ?? []) if (STAFF[role].statlar?.includes(k)) m *= 1.5;
  return m;
}

/** Köşe talimatına eklenen etki (taktik uzmanlığı ve analist). */
export function callBonus(s: GameState, raunt: number, toplam: number): number {
  let v = 0;
  if (hasPerk(s, 'taktik', 'a')) v += 0.4;
  if (hasPerk(s, 'taktik', 'b') && raunt === toplam) v += 1.2;
  if (hasStaff(s, 'analist')) v += 0.3;
  return v;
}

/** Raunt üstünlüğüne sabit katkı (kamp, felsefe ve ezeli rakip maçı). */
export function edgeBonus(s: GameState, b: NonNullable<Student['mac']>, raunt: number, uyum: boolean): number {
  let e = 0;
  if (b.kamp === 'ozel') e += raunt === 1 ? 1.5 : 0.6;
  if (b.kamp === 'sert') e += 1;
  if (phil(s) === 'teknik' && uyum) e += 0.6;
  if (phil(s) === 'savasci') e += 0.5; // baskı: her raunt öne çıkmaya oynar
  return e;
}

/** Maça çıkarken kondisyon (sağlık) bonusu. */
export const staminaBonus = (s: GameState, b: NonNullable<Student['mac']>) => (b.kamp === 'kondisyon' ? 14 : 0) + (hasStaff(s, 'kondisyoner') ? 6 : 0);

/** Bitiriş şansına ek (Savaşçı Okulu). */
export const finishBonus = (s: GameState) => (phil(s) === 'savasci' ? 0.09 : 0);

/** Kesik açıkken doktor durdurma ihtimali. */
export const doctorChance = (s: GameState) => (hasStaff(s, 'cutman') ? 0.07 : 0.22);

/** Keşif raporu doğruluğuna ek. */
export const scoutBonus = (s: GameState) => (hasStaff(s, 'analist') ? 0.3 : 0) + (hasPerk(s, 'gozcu', 'b') ? 0.2 : 0);

/** Aday potansiyeline ek (imaj ve Elmas Avcısı). */
export const prospectBonus = (s: GameState) => (s.antrenor ? (hasPerk(s, 'gozcu', 'a') ? 4 : 0) + Math.round((itibar(s).imaj - 30) / 20) : 0);

/** Maç payı çarpanı ve eki (organizasyon ilişkisi, felsefe, Pazarlıkçı). */
export function payMod(s: GameState): number {
  if (!s.antrenor) return 0;
  let p = (itibar(s).iliski - 30) / 1000; // ilişki 80 → +%5
  if (phil(s) === 'yildiz') p += 0.03;
  if (phil(s) === 'aile') p -= 0.02;
  if (hasPerk(s, 'menajer', 'a')) p += 0.04;
  return p;
}

/** UCC şampiyonluk ihtimaline ek (organizasyon ünvan maçını sana verir). */
export const titleBonus = (s: GameState) => (s.antrenor ? clamp((itibar(s).iliski - 50) / 250, -0.08, 0.15) : 0);

/** Maç sonrası moral değişimi düzeltmesi. */
export function moraleMod(s: GameState, kazandi: boolean, kose: boolean): number {
  if (!s.antrenor) return 0;
  let m = 0;
  const sad = itibar(s).sadakat;
  m += (sad - 50) / 25; // sadakat 100 → +2
  if (phil(s) === 'aile') m += 3;
  if (phil(s) === 'yildiz' && kazandi) m -= 3;
  if (phil(s) === 'savasci' && !kazandi) m -= 2;
  if (!kazandi && hasPerk(s, 'motivasyon', 'a')) m += 6;
  if (kazandi && kose && hasPerk(s, 'motivasyon', 'b')) m += 5;
  return m;
}

/** Takipçi kazancı çarpanı. */
export function fanMod(s: GameState, finish: boolean): number {
  let m = 0.7 + itibar(s).imaj / 100; // imaj 30 → 1.0
  if (phil(s) === 'yildiz') m *= 1.5;
  if (phil(s) === 'teknik') m *= 0.85;
  if (phil(s) === 'savasci' && finish) m *= 1.4;
  return m;
}

/** Sponsor ve ödül çarpanı. */
export const sponsorMod = (s: GameState) => (phil(s) === 'yildiz' ? 1.5 : 1) * (hasPerk(s, 'menajer', 'b') ? 1.6 : 1) * (0.8 + itibar(s).imaj / 150);

// ---------- Maç sonucunun itibara etkisi ----------

export function axesFromBout(s: GameState, info: { kazandi: boolean; kose: boolean; finish: boolean; terfi: boolean; sampiyon: boolean; rakipHoca: boolean; iyi: number; kamp?: CampKey }): Partial<Itibar> {
  const d: Itibar = { sadakat: 0, iliski: 0, imaj: 0 };
  if (info.kose) d.sadakat += info.kazandi ? 2 : 1;
  else d.sadakat -= 2; // köşesine gelmedin
  if (info.kazandi) {
    d.iliski += 1;
    d.imaj += info.finish ? 2 : 1;
  } else d.imaj -= 1;
  if (info.kose && info.iyi >= 2) d.iliski += 1;
  if (info.terfi) d.iliski += 3;
  if (info.sampiyon) {
    d.iliski += 8;
    d.imaj += 10;
    d.sadakat += 5;
  }
  if (info.rakipHoca) d.imaj += info.kazandi ? 4 : -3;
  if (info.kamp === 'ozel' || info.kamp === 'kondisyon') d.sadakat += 1; // öğrencine yatırım yaptın
  if (phil(s) === 'yildiz') d.sadakat -= 1;
  return d;
}

/** Haftalık itibar akışı: ortaya doğru yavaş dönüş, ekip ve felsefe etkisi. */
export function weeklyAxes(s: GameState) {
  const r = s.antrenor;
  if (!r) return;
  const cur = itibar(s);
  const toward = (v: number, t: number, k: number) => v + (t - v) * k;
  r.itibar = {
    sadakat: Math.round(toward(cur.sadakat, phil(s) === 'aile' ? 65 : 50, 0.015) * 10) / 10,
    iliski: Math.round(toward(cur.iliski, 30, 0.01) * 10) / 10,
    imaj: Math.round(toward(cur.imaj, phil(s) === 'yildiz' ? 45 : 30, 0.012) * 10) / 10,
  };
  // Sadakat öğrencilerin moraline yansır
  const drift = (cur.sadakat - 50) / 400;
  s.salon?.ogrenciler.forEach((st) => (st.moral = clamp(st.moral + drift, 0, 100)));
}

// ---------- Ezeli rakip hoca ----------

export interface Rival {
  ad: string;
  salon: string;
  ulke: string;
  /** Rakip hocanın öğrencileriyle karşılaşmalar */
  g: number;
  m: number;
}

/** Ezeli rakibin öğrencisiyle eşleşme ihtimali (her yeni maçta). */
export const rivalChance = (s: GameState) => (s.antrenor?.rakip ? 0.14 : 0);

export function noteRivalBout(s: GameState, kazandi: boolean): string | null {
  const rv = s.antrenor?.rakip;
  if (!rv) return null;
  if (kazandi) rv.g++;
  else rv.m++;
  return kazandi
    ? L("⚔️ Ezeli rakibin {0}'in öğrencisini yendin! Seri: {1}-{2}.", [rv.ad, rv.g, rv.m])
    : L("⚔️ {0} bu turu aldı. Seri: {1}-{2}. Rövanş gelecek.", [rv.ad, rv.g, rv.m]);
}

// ---------- Yeni salon olayları (coachMode olay listesine eklenir) ----------

export type DepthEventId = 'kavga' | 'kisaSure' | 'tv' | 'kira' | 'takviye' | 'cocuk' | 'menajerKapma';

export const DEPTH_EVENT_IDS: DepthEventId[] = ['kavga', 'kisaSure', 'tv', 'kira', 'takviye', 'cocuk', 'menajerKapma'];

type Ev = { kosul: (s: GameState) => Student | true | null; kur: (s: GameState, st?: Student) => { metin: string; secenekler: string[] } };

const nm = (st: Student) => `${st.ad} ${st.soyad}`;
const ogr = (s: GameState) => s.salon?.ogrenciler ?? [];
const rent = (s: GameState) => Math.round((1_500 + (s.salon?.seviye ?? 1) * 1_500) / 500) * 500;

export const DEPTH_EVENTS: Record<DepthEventId, Ev> = {
  kavga: {
    kosul: (s) => (ogr(s).length >= 2 ? ogr(s)[0] : null),
    kur: (s, st) => {
      const o = ogr(s).find((x) => x.id !== st!.id)!;
      return {
        metin: L("Sparring kontrolden çıktı: {0} ile {1} birbirine girdi. Bütün salon sana bakıyor.", [nm(st!), nm(o)]),
        secenekler: [L("İkisine de ceza: bir hafta ayrı çalışsınlar"), L("Haklı olanın yanında dur"), L("Ringe çıkarıp kontrollü sparring'le bitir")],
      };
    },
  },
  kisaSure: {
    kosul: (s) => ogr(s).find((x) => !x.mac && x.macHafta - s.hafta >= 3 && x.seviye !== 'amator') ?? null,
    kur: (s, st) => ({
      metin: L("Organizasyon arıyor: bir dövüşçü sakatlandı, {0} bir hafta sonra yerine çıkabilir mi? Para iki katı, hazırlık sıfır.", [nm(st!)]),
      secenekler: [L("Kabul: organizasyona iyilik"), L("Reddet: öğrencimi hazırlıksız sokmam")],
    }),
  },
  tv: {
    kosul: (s) => ((s.antrenor?.takipci ?? 0) >= 8_000 ? true : null),
    kur: (s) => ({
      metin: L("Bir spor kanalı büyük gecelerde yorumculuk teklif ediyor: {0}. Ama bazı maç günleri salonda olamayacaksın.", [$(tvPay(s))]),
      secenekler: [L("Kabul et"), L("Reddet: yerim köşe")],
    }),
  },
  kira: {
    kosul: (s) => ((s.salon?.seviye ?? 1) >= 2 ? true : null),
    kur: (s) => ({
      metin: L("Ev sahibi kirayı artırmak istiyor. Bir kerelik {0} ödersen sözleşme 5 yıl sabit kalacak.", [$(rent(s) * 4)]),
      secenekler: [L("Öde"), L("Pazarlık et"), L("Taşınmakla tehdit et")],
    }),
  },
  takviye: {
    kosul: (s) => ogr(s).find((x) => x.seviye !== 'amator') ?? null,
    kur: (s, st) => ({
      metin: L("{0} bir “mucize takviye” kullanmak istiyor. Etiketinde ne olduğu belli değil; testte sorun çıkabilir.", [nm(st!)]),
      secenekler: [L("Kesinlikle yasakla"), L("Göz yum")],
    }),
  },
  cocuk: {
    kosul: (s) => ((s.salon?.un ?? 0) >= 18 ? true : null),
    kur: () => ({
      metin: L("Mahalleden veliler çocuklar için hafta sonu kursu açmanı istiyor. Para az, ama salonun adı güzel duyulur."),
      secenekler: [L("Kursu aç"), L("Salon profesyonellere ait")],
    }),
  },
  menajerKapma: {
    kosul: (s) => ogr(s).find((x) => x.seviye === 'buyuk' || x.seviye === 'ucc') ?? null,
    kur: (s, st) => ({
      metin: L("Ünlü bir menajer {0} ile salonun arkasından görüşmüş: “Hocan seni küçük tutuyor.”", [nm(st!)]),
      secenekler: [L("Menajerle yüzleş"), L("Öğrencinle açık konuş"), L("Menajeri organizasyona şikâyet et")],
    }),
  },
};

const tvPay = (s: GameState) => Math.round((5_000 + (s.antrenor?.takipci ?? 0) * 0.15) / 500) * 500;

/** Derinlik olayı kararı. Dönüş: sonuç satırı. */
export function chooseDepthEvent(s: GameState, id: DepthEventId, i: number, st?: Student): string {
  const g = s.salon!;
  const moral = (x: Student | undefined, n: number) => x && (x.moral = clamp(x.moral + n, 0, 100));
  let d: Partial<Itibar> = {};
  let out = '';
  switch (id) {
    case 'kavga': {
      const o = st ? g.ogrenciler.find((x) => x.id !== st.id) : undefined;
      if (i === 0) {
        moral(st, -4);
        moral(o, -4);
        d = { sadakat: -1, imaj: 1 };
        out = L("Salon sustu. Kural herkes için aynı.");
      } else if (i === 1) {
        moral(st, 8);
        moral(o, -12);
        d = { sadakat: -3 };
        out = L("{0} haklı çıktı; {1} küstü.", [st?.ad ?? '', o?.ad ?? '']);
      } else if (chance(0.7)) {
        [st, o].forEach((x) => x && (['vurus', 'gures'] as StatKey[]).forEach((k) => chance(0.5) && (x.stats[k] = Math.min(99, x.stats[k] + 1))));
        moral(st, 4);
        moral(o, 4);
        d = { sadakat: 3 };
        out = L("Sonunda sarıldılar. İkisi de bir şey öğrendi.");
      } else {
        moral(st, -10);
        if (st) st.macHafta += 3;
        d = { sadakat: -2 };
        out = L("Kontrol yine kaçtı: {0} sakatlandı, maçı ertelendi.", [st?.ad ?? '']);
      }
      break;
    }
    case 'kisaSure':
      if (!st) break;
      if (i === 0) {
        st.macHafta = s.hafta + 1;
        st.kisaSure = true;
        d = { iliski: 8, sadakat: -1 };
        out = L("{0} gelecek hafta kafeste. Organizasyon bunu unutmayacak.", [st.ad]);
      } else {
        d = { iliski: -4, sadakat: 3 };
        out = L("Organizasyon başka birini buldu. {0} sana minnettar.", [st.ad]);
      }
      break;
    case 'tv':
      if (i === 0) {
        const p = Math.round(tvPay(s) * sponsorMod(s));
        s.para += p;
        if (s.antrenor) s.antrenor.takipci = (s.antrenor.takipci ?? 0) + 2_500;
        d = { imaj: 7, sadakat: -4 };
        out = L("Ekrandasın: +{0}. Öğrenciler bazı geceler seni köşede arayacak.", [$(p)]);
      } else {
        d = { sadakat: 3 };
        out = L("“Benim yerim köşe.” Öğrencilerin bunu duydu.");
      }
      break;
    case 'kira':
      if (i === 0) {
        const c = rent(s) * 4;
        if (s.para >= c) {
          s.para -= c;
          out = L("Kira beş yıl sabit. Kafan rahat.");
        } else {
          g.un = clamp(g.un - 2, 0, 100);
          out = L("Kasada o kadar para yok; kira yine de arttı.");
        }
      } else if (i === 1) {
        if (chance(0.5 + itibar(s).imaj / 200)) out = L("Ev sahibi oğlunu salona yazdırdı; kira aynı kaldı.");
        else {
          s.para -= rent(s) * 2;
          out = L("Pazarlık tutmadı: −{0}.", [$(rent(s) * 2)]);
        }
      } else if (chance(0.4)) {
        out = L("Ev sahibi geri adım attı.");
        d = { imaj: 1 };
      } else {
        g.un = clamp(g.un - 4, 0, 100);
        d = { imaj: -2 };
        out = L("Ev sahibi inat etti; kavga mahallede duyuldu.");
      }
      break;
    case 'takviye':
      if (!st) break;
      if (i === 0) {
        moral(st, -4);
        d = { iliski: 3, imaj: 2, sadakat: -1 };
        out = L("Temiz salon, temiz sicil. {0} biraz bozuldu ama anladı.", [st.ad]);
      } else if (chance(0.35)) {
        st.mac = undefined;
        st.macHafta = s.hafta + 12;
        moral(st, -15);
        g.un = clamp(g.un - 6, 0, 100);
        d = { iliski: -12, imaj: -10 };
        out = L("🧪 Test pozitif! {0} 12 hafta men cezası aldı. Salonun adı manşetlerde.", [st.ad]);
      } else {
        moral(st, 5);
        out = L("Bu sefer bir şey çıkmadı. Bu sefer.");
      }
      break;
    case 'cocuk':
      if (i === 0) {
        g.uye += 10;
        g.un = clamp(g.un + 3, 0, 100);
        d = { imaj: 5 };
        out = L("Hafta sonları salon çocuk sesleriyle dolu. Ün +3, imaj +5.");
      } else {
        d = { imaj: -1 };
        out = L("Veliler biraz kırıldı.");
      }
      break;
    case 'menajerKapma':
      if (!st) break;
      if (i === 0) {
        if (chance(0.5)) {
          d = { imaj: 3, sadakat: 2 };
          out = L("Menajer geri çekildi. Salonda herkes kimin hoca olduğunu gördü.");
        } else {
          d = { imaj: -4 };
          out = L("Yüzleşme kameralara yansıdı. Hiç hoş görünmedi.");
        }
      } else if (i === 1) {
        if (chance(0.45 + itibar(s).sadakat / 200 + (phil(s) === 'aile' ? 0.15 : 0))) {
          moral(st, 8);
          d = { sadakat: 4 };
          out = L("“Hocam, ben bu salonun çocuğuyum.” {0} kalıyor.", [st.ad]);
        } else {
          g.ogrenciler = g.ogrenciler.filter((x) => x.id !== st.id);
          d = { sadakat: -5 };
          out = L("{0} menajerle imzaladı ve salondan ayrıldı.", [st.ad]);
        }
      } else {
        d = { iliski: 4, imaj: -2 };
        moral(st, -3);
        out = L("Organizasyon menajere uyarı verdi. Bazıları bunu ispiyon saydı.");
      }
      break;
  }
  shiftAxes(s, d);
  const note = axesNote(d);
  return out && note ? `${out} (${note})` : out;
}

/** Eski olayların itibara etkisi (coachMode.chooseEvent sonrası). */
export const LEGACY_EVENT_AXES: Record<string, Partial<Itibar>[]> = {
  transfer: [{ sadakat: 5 }, { sadakat: 2 }, { sadakat: -4, iliski: 2 }],
  gece: [{ sadakat: -2, imaj: 1 }, { sadakat: 2 }, { imaj: -3 }],
  sakatlik: [{ sadakat: 2, iliski: -2 }, { sadakat: -2 }],
  sponsor: [{ imaj: 2 }, { sadakat: 1 }],
  belgesel: [{ imaj: 5, sadakat: -1 }, {}],
  sokak: [{ sadakat: 2, imaj: 2 }, {}],
  kilo: [{ sadakat: 2, iliski: -1 }, { sadakat: 3 }, { sadakat: -3 }],
  rakipHoca: [{ sadakat: 2 }, { imaj: 2 }],
};

// ---------- Emeklilik ve Onur Listesi ----------

export const RETIRE_YEAR = 3;

export interface CoachLegacy {
  ad: string;
  salon: string;
  ulke: string;
  yil: number;
  g: number;
  m: number;
  ucc: number;
  sampiyon: number;
  odul: number;
  enIyiSira: number;
  puan: number;
  /** Unvan: puana göre */
  unvan: string;
  felsefe?: Philosophy;
  tarih: number;
}

export function legacyScore(s: GameState) {
  const r = s.antrenor!;
  const g = s.salon!;
  const top = r.toplam ?? { g: 0, m: 0, kose: 0 };
  const sira = g.enIyiSira ?? 99;
  return Math.round(top.g * 1 + top.kose * 0.5 + (g.uccSayisi ?? 0) * 15 + (g.sampiyonSayisi ?? 0) * 45 + r.oduller.length * 30 + (sira <= 1 ? 60 : sira <= 3 ? 35 : sira <= 10 ? 15 : 0) + itibar(s).imaj / 5);
}

export function legacyTitle(p: number) {
  if (p >= 600) return L("Efsane Hoca");
  if (p >= 350) return L("Şampiyon Yapan");
  if (p >= 180) return L("Saygın Usta");
  if (p >= 80) return L("Mahallenin Hocası");
  return L("Garaj Hocası");
}

export const canRetire = (s: GameState) => !!s.antrenor && !s.antrenor.emekli && (s.antrenor.yil.no > RETIRE_YEAR || (s.salon?.sampiyonSayisi ?? 0) > 0);

export function retireCoach(s: GameState): CoachLegacy | null {
  const r = s.antrenor;
  const g = s.salon;
  if (!r || !g || !canRetire(s)) return null;
  const puan = legacyScore(s);
  const top = r.toplam ?? { g: 0, m: 0, kose: 0 };
  const leg: CoachLegacy = {
    ad: `${s.fighter.ad} ${s.fighter.soyad}`,
    salon: g.ad,
    ulke: s.fighter.uyruk,
    yil: r.yil.no,
    g: top.g,
    m: top.m,
    ucc: g.uccSayisi ?? 0,
    sampiyon: g.sampiyonSayisi ?? 0,
    odul: r.oduller.length,
    enIyiSira: g.enIyiSira ?? 99,
    puan,
    unvan: legacyTitle(puan),
    felsefe: r.felsefe,
    tarih: Date.now(),
  };
  r.emekli = leg;
  s.haberler.unshift(L("🎖️ {0} düdüğü bıraktı. Miras: {1} puan, “{2}”.", [leg.ad, puan, leg.unvan]));
  return leg;
}

// ---------- Kayıt göçü ----------

/** Eski kayıtlar: itibar ve ezeli rakip alanları yoksa doldurulur. */
export function ensureCoachDepth(s: GameState, rivalFrom?: () => { ad: string; salon: string; ulke: string } | null) {
  const r = s.antrenor;
  if (!r) return;
  r.itibar ??= { sadakat: 50, iliski: 30, imaj: 30 };
  r.ekip ??= [];
  if (!r.rakip && rivalFrom) {
    const rv = rivalFrom();
    if (rv) r.rakip = { ...rv, g: 0, m: 0 };
  }
}


