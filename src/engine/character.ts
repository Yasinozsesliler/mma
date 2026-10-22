import { L } from '../i18n';
import { fatigueTick } from './fatigue';
import { scarOnHeal } from './body';
import { BACKGROUNDS, COUNTRIES, WEIGHT_CLASSES, WEIGHT_MODS, baseStatsFor } from './data';
import { clamp, fill, noise, pick } from './rng';
import { economyTick } from './economy';
import { gymById, gymsFor } from './gyms';
import { START_POINTS } from './progression';
import { initialFollowers } from './fame';
import { startingTechniques } from './techniques';
import { BASE_BOY, heightMods, reachFor } from './tale';
import type { Appearance, Background, Fighter, GameState, OrgId, Stats, StatKey, WeightClass } from './types';
import { STAT_KEYS } from './types';

export interface NewFighterInput {
  ad: string;
  soyad: string;
  lakap: string;
  uyruk: string;
  memleket: string;
  yas: number;
  siklet: WeightClass;
  gecmis: Background;
  hikaye: string;
  salonId?: string;
  gorunum?: Appearance;
  boy?: number;
  kadin?: boolean;
  /** Zorluk ve meydan okuma (challenges.ts) */
  zorluk?: import('./challenges').Difficulty;
  meydan?: import('./challenges').ChallengeId;
}

/** noise=false: zar atmadan beklenen değerler (seçim ekranındaki önizleme için). */
export function rollStartingStats(input: Pick<NewFighterInput, 'uyruk' | 'yas' | 'siklet' | 'gecmis' | 'boy'>, withNoise = true): Stats {
  const country = COUNTRIES[input.uyruk];
  const level = 33 + country.egitim * 0.6 + (input.yas - 18) * 0.45;
  const stats = baseStatsFor(input.gecmis, level);
  const wm = WEIGHT_MODS[input.siklet];
  const hm: Partial<Stats> = input.boy ? heightMods(input.boy, input.siklet) : {};
  STAT_KEYS.forEach((k) => {
    stats[k] = Math.round(clamp(stats[k] + (wm[k] ?? 0) + (hm[k] ?? 0) + (withNoise ? noise(3) : 0), 10, 68));
  });
  return stats;
}

export function createGame(input: NewFighterInput, stats: Stats): GameState {
  const country = COUNTRIES[input.uyruk];
  const gym = (input.salonId && gymById(input.salonId)) || gymsFor(input.uyruk)[0];
  const fighter: Fighter = {
    ad: input.ad.trim(),
    soyad: input.soyad.trim(),
    lakap: input.lakap.trim(),
    uyruk: input.uyruk,
    memleket: input.memleket.trim() || country.ad,
    baslangicYasi: input.yas,
    yas: input.yas,
    siklet: input.siklet,
    gecmis: input.gecmis,
    hikaye: input.hikaye.trim(),
    gorunum: input.gorunum ? { ...input.gorunum, kadin: input.kadin || undefined, sakal: input.kadin ? 'yok' : input.gorunum.sakal } : input.gorunum,
    kadin: input.kadin || undefined,
    boy: input.boy ?? BASE_BOY[input.siklet],
    uzanma: reachFor(input.boy ?? BASE_BOY[input.siklet], input.ad.trim() + input.soyad.trim()),
    stats,
  };
  return {
    v: 1,
    phase: 'hub',
    fighter,
    rekor: { g: 0, m: 0, b: 0, ko: 0, sub: 0, karar: 0 },
    amator: { g: 0, m: 0, b: 0, ko: 0, sub: 0, karar: 0 },
    gecmis: [],
    stage: 'amator',
    contract: null,
    para: 1500,
    puan: START_POINTS,
    envanter: [],
    bolum: null,
    cagri: null,
    populerlik: Math.round(country.taraftar * 1.2),
    takipci: initialFollowers(Math.round(country.taraftar * 1.2)),
    teknik: startingTechniques(input.gecmis),
    rank: null,
    sampiyon: false,
    savunma: 0,
    unvanlar: [],
    ipuclari: [],
    saglik: 100,
    sakatliklar: [],
    takim: {
      salon: gym.salon,
      antrenor: gym.antrenor,
      antrenorKalite: gym.kalite,
      salonId: gym.id,
      uzmanlik: gym.uzmanlik,
      menajer: null,
      menajerKalite: 0,
      menajerPay: 0,
    },
    rakipler: [],
    hafta: 0,
    seri: 0,
    orgMaglubiyet: 0,
    reddedilen: 0,
    motivasyon: 0,
    trashTalk: false,
    kisaHaber: false,
    haberler: [
      L("⭐ {0} gelişim puanın var. “GELİŞİM” sekmesinden istatistiklerine harca.", [START_POINTS]),
      L("{0} {1}, {2} sokaklarından çıkıp {3} kapısını çaldı. Yol burada başlıyor.", [fighter.ad, fighter.soyad, fighter.memleket, country.salon]),
    ],
    pending: {},
  };
}

export function currentOrg(s: GameState): OrgId {
  return s.contract?.org ?? 'amator';
}

export function fullName(f: Fighter) {
  return f.lakap ? `${f.ad} "${f.lakap}" ${f.soyad}` : `${f.ad} ${f.soyad}`;
}

export function statAverage(st: Stats) {
  return STAT_KEYS.reduce((s, k) => s + st[k], 0) / STAT_KEYS.length;
}

/** Yaşa göre gelişim çarpanı: gençler hızlı gelişir, 33 sonrası zor. */
export function growthMultiplier(yas: number) {
  if (yas <= 22) return 1.3;
  if (yas <= 26) return 1.15;
  if (yas <= 30) return 1;
  if (yas <= 33) return 0.8;
  if (yas <= 36) return 0.55;
  return 0.35;
}

/** Yüksek seviyede gelişim yavaşlar. */
/** 70'in üstünde gelişim yavaşlar. `min` verilirse artış bundan aşağı düşmez (ör. kamp en az +2). */
export function addStat(stats: Stats, k: StatKey, amount: number, min = 0): number {
  const before = stats[k];
  let gain = amount;
  if (amount > 0 && before > 70) gain = Math.max(min, amount * ((100 - before) / 30));
  stats[k] = Math.round(clamp(before + gain, 1, 99));
  return stats[k] - before;
}

/** Haftalar ilerler, yaş güncellenir, 32 yaş sonrası fiziksel düşüş başlar. */
export function advanceWeeks(s: GameState, weeks: number): string[] {
  const notes: string[] = [];
  s.hafta += weeks;
  // Haber akışı sınırsız büyümesin (kayıt her dokunuşta kopyalanıp yazılıyor): ekran en fazla 12 gösterir, 60 yeter.
  if (s.haberler.length > 60) s.haberler.length = 60;
  // Haftalık tik (gelir, giderler, tedavi süresi) hafta ilerledikten sonra çalışır.
  const econ = economyTick(s, weeks);
  fatigueTick(s, weeks);
  const yeniYas = s.fighter.baslangicYasi + Math.floor(s.hafta / 52);
  while (s.fighter.yas < yeniYas) {
    s.fighter.yas++;
    notes.push(L("🎂 {0} yaşına girdin.", [s.fighter.yas]));
    if (s.fighter.yas >= 34) {
      const st = s.fighter.stats;
      const d = s.fighter.yas >= 38 ? 2 : 1;
      addStat(st, 'hiz', -d);
      addStat(st, 'cene', -d);
      addStat(st, 'kondisyon', -Math.ceil(d / 2));
      addStat(st, 'iq', 1);
      notes.push(L("Yıllar hissettiriyor: hız ve çene biraz düştü, ama tecrübe arttı."));
    }
  }
  s.sakatliklar = s.sakatliklar
    .map((i) => ({ ...i, hafta: i.hafta - weeks }))
    .filter((i) => {
      if (i.hafta <= 0) notes.push(scarOnHeal(s, i) ?? L("🩹 {0} iyileşti.", [i.ad]));
      return i.hafta > 0;
    });
  notes.push(...econ);
  return notes;
}

const STORY_TEMPLATES = [
  L("{memleket}’in arka sokaklarında büyüdün. Babanın tamirhanesinde çalışırken bir gün mahalledeki {gecmis} salonunun camından içeri baktın ve bir daha o camın önünden ayrılamadın. Paran yoktu, salonu temizleyerek antrenman parası ödedin. Şimdi {yas} yaşındasın ve herkesin sana \"hayal\" dediği şeyi gerçeğe çevirmek istiyorsun."),
  L("Ailende herkes sana üniversite okumanı söyledi. Sen ise gece gizlice {gecmis} antrenmanlarına gittin. {memleket}’te yerel turnuvalarda adını duyurdun, ama bu kafes başka bir dünya. {yas} yaşında, cebinde birkaç yüz dolar ve kafanda tek bir hedefle geldin: kemer."),
  L("Kardeşin bir zamanlar umut vadeden bir dövüşçüydü, ama sakatlık onun kariyerini bitirdi. Onun eldivenleri artık sende. {memleket}’ten çıktın, {gecmis} altyapınla bu sporda iz bırakmak ve onun yarım kalan hikâyesini tamamlamak istiyorsun."),
  L("{memleket}’te bir fabrikada vardiyalı çalışıyordun. Bir gece internette izlediğin bir UCC maçı her şeyi değiştirdi. Zaten yıllardır {gecmis} yapıyordun; şimdi {yas} yaşında, işinden istifa edip her şeyi bu yola koydun. Geri dönüş yok."),
];

export function generateBackstory(input: Pick<NewFighterInput, 'memleket' | 'gecmis' | 'yas' | 'uyruk'>) {
  return fill(pick(STORY_TEMPLATES), {
    memleket: input.memleket || COUNTRIES[input.uyruk]?.ad || 'memleketin',
    gecmis: BACKGROUNDS[input.gecmis].ad,
    yas: input.yas,
  });
}

export function weightLabel(w: WeightClass) {
  const c = WEIGHT_CLASSES[w];
  return L("{0} ({1} kg)", [c.ad, c.kg]);
}
