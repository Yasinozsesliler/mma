import { L, LOC } from '../i18n';
import { SUBMISSIONS } from './data';
import { bestLevel, bestSpecial, pickTech, TECHNIQUES, techById, type TechDef } from './techniques';
import { CRITICAL_INTRO, evenLine, groundLine, strikeLine, TACTICS, tdLine } from './narration';
import { chance, clamp, fill, noise, pick, rand, randInt, weighted } from './rng';
import type {
  Background,
  CriticalKind,
  FightMods,
  FightResult,
  FightState,
  Method,
  Opponent,
  PlanKey,
  Stats,
  Tactic,
} from './types';
import { STAT_KEYS, STAT_LABELS } from './types';

type Side = 'p' | 'o';
const other = (s: Side): Side => (s === 'p' ? 'o' : 'p');

/** Taktik üstünlük tablosu: ADV[benim][rakibin]. Antisimetrik. */
const ADV: Record<Tactic, Record<Tactic, number>> = {
  baski: { baski: 0, kontra: -0.11, takedown: -0.05, clinch: 0.02, mesafe: 0.11 },
  kontra: { baski: 0.11, kontra: 0, takedown: -0.09, clinch: -0.04, mesafe: -0.05 },
  takedown: { baski: 0.05, kontra: 0.09, takedown: 0, clinch: 0.02, mesafe: -0.11 },
  clinch: { baski: -0.02, kontra: 0.04, takedown: -0.02, clinch: 0, mesafe: -0.07 },
  mesafe: { baski: -0.11, kontra: 0.05, takedown: 0.11, clinch: 0.07, mesafe: 0 },
};

/** Canlı akış: her raunt BEATS anda oynanır; anların etkisi BEAT_SCALE ile ölçeklenir. */
export const BEATS = 5;
const BEAT_SCALE = 3 / BEATS;
let SC = 1;

const DRAIN: Record<Tactic, number> = { baski: 12, kontra: 6, takedown: 11, clinch: 10, mesafe: 7 };

const STYLE_TACTICS: Record<Background, [Tactic, number][]> = {
  boks: [['baski', 3], ['kontra', 3], ['mesafe', 2], ['clinch', 0.5], ['takedown', 0.2]],
  muaythai: [['baski', 3], ['kontra', 2], ['mesafe', 1.5], ['clinch', 2.5], ['takedown', 0.3]],
  kickboks: [['baski', 2], ['kontra', 2], ['mesafe', 3.5], ['clinch', 0.5], ['takedown', 0.2]],
  gures: [['takedown', 4], ['baski', 2], ['clinch', 2], ['mesafe', 0.3], ['kontra', 0.3]],
  judo: [['clinch', 3.5], ['takedown', 2.5], ['baski', 1], ['kontra', 1], ['mesafe', 0.5]],
  bjj: [['takedown', 3], ['clinch', 2], ['kontra', 1.5], ['mesafe', 1], ['baski', 0.5]],
  sambo: [['takedown', 3], ['clinch', 2.5], ['baski', 1.5], ['kontra', 0.5], ['mesafe', 0.5]],
  kyokushin: [['baski', 4], ['kontra', 1], ['mesafe', 1.5], ['clinch', 1], ['takedown', 0.2]],
  sokak: [['baski', 5], ['kontra', 0.5], ['clinch', 1], ['mesafe', 0.3], ['takedown', 0.5]],
};

export type PlanGroup = 'ayakta' | 'yer' | 'strateji';

export interface PlanDef {
  ad: string;
  kisa: string;
  aciklama: string;
  avantaj: string;
  risk: string;
  ikon: string;
  grup: PlanGroup;
  /** Rakibin zayıf yönü bunlardan biriyse plan "zaafa uygun" olur ve etkisi ikiye katlanır. */
  hedef: string[];
}

export const PLANS: Record<PlanKey, PlanDef> = {
  ayakta: { ad: L("Ayakta kal, vuruşla boz"), kisa: L("Striking"), aciklama: L("Ayakta kal, kombinasyonlarla puan ve hasar topla."), avantaj: L("Baskı ve mesafe güçlenir"), risk: L("Güreşçi rakip seni indirirse plan çöker"), ikon: 'boxing-glove', grup: 'ayakta', hedef: ['vurus', 'cene', 'hiz'] },
  kontra: { ad: L("Sabırlı ol, kontra dövüş"), kisa: L("Kontra"), aciklama: L("Onun gelmesini bekle, açığını yakala."), avantaj: L("Kontra taktiği çok güçlenir"), risk: L("Rakip beklerse puan kaybedersin"), ikon: 'shield-sword', grup: 'ayakta', hedef: ['iq', 'hiz'] },
  bacak: { ad: L("Bacak tekmeleriyle kes"), kisa: L("Low kick"), aciklama: L("Ön bacağını sök, hareketini raunt raunt öldür."), avantaj: L("Rakibin hızı her raunt düşer"), risk: L("Etkisi geç gelir, ilk raunt zayıf"), ikon: 'shoe-sneaker', grup: 'ayakta', hedef: ['hiz'] },
  govde: { ad: L("Gövdeye çalış, sonra kafa"), kisa: L("Gövde"), aciklama: L("Karaciğere ve kaburgaya yüklen; eller düşünce kafaya çık."), avantaj: L("Rakip daha çok yorulur, geç rauntlarda sarsma şansı artar"), risk: L("Erken bitiriş beklenmez"), ikon: 'target', grup: 'ayakta', hedef: ['kondisyon', 'cene'] },
  blitz: { ad: L("İlk raunt blitz"), kisa: L("Blitz"), aciklama: L("Zil çalar çalmaz üstüne yürü, ilk rauntta bitir."), avantaj: L("1. rauntta baskı çok güçlü"), risk: L("Bitiremezsen nefesin erken tükenir"), ikon: 'flash', grup: 'ayakta', hedef: ['cene'] },
  gures: { ad: L("Güreşle indir, kontrol et"), kisa: L("Güreş"), aciklama: L("Takedown, kafes kenarı, üstte kontrol."), avantaj: L("Takedown ve clinch güçlenir"), risk: L("İyi sprawl yapan rakipte yorulursun"), ikon: 'arm-flex', grup: 'yer', hedef: ['gures'] },
  gnp: { ad: L("İndir ve ez (ground & pound)"), kisa: 'GnP', aciklama: L("Yere indir, üstten yumruk ve dirsek yağdır."), avantaj: L("Takedown güçlenir, yerde vuruş hasarı artar"), risk: L("Alttan submission riski"), ikon: 'hammer', grup: 'yer', hedef: ['yer', 'cene'] },
  yer: { ad: L("Yere götür, submission ara"), kisa: L("Submission"), aciklama: L("Pozisyon al, boyna ve kollara git."), avantaj: L("Yerde submission şansı artar"), risk: L("Ayakta kalırsa elin boş"), ikon: 'lock', grup: 'yer', hedef: ['yer'] },
  kafes: { ad: L("Kafese sıkıştır"), kisa: L("Kafes"), aciklama: L("Onu kafese daya, clinch’te yıprat, nefes aldırma."), avantaj: L("Clinch güçlenir, hareketli rakip kapana kısılır"), risk: L("Güçlü clinch’çiye karşı riskli"), ikon: 'fence', grup: 'strateji', hedef: ['hiz', 'kondisyon'] },
  tempo: { ad: L("Tempoyu yükselt"), kisa: L("Tempo"), aciklama: L("Durmadan bas, kondisyonuyla boğ."), avantaj: L("Rakip çok daha hızlı yorulur"), risk: L("Senin de kondisyonun iyi olmalı"), ikon: 'lungs', grup: 'strateji', hedef: ['kondisyon'] },
  puan: { ad: L("Puanla kazan, riske girme"), kisa: L("Puan"), aciklama: L("Temiz vuruş, iyi savunma, hakemlere oyna."), avantaj: L("Daha az hasar alırsın, mesafe ve kontra güçlenir"), risk: L("Bitiriş şansı düşer"), ikon: 'clipboard-check', grup: 'strateji', hedef: ['iq', 'vurus'] },
};

function planBonus(mods: FightMods, t: Tactic, raunt = 1): number {
  const m = mods.planUyum ? 2 : 1;
  switch (mods.plan) {
    case 'ayakta':
      return t === 'baski' || t === 'mesafe' ? 0.03 * m : 0;
    case 'kontra':
      return t === 'kontra' ? 0.045 * m : 0;
    case 'gures':
      return t === 'takedown' ? 0.05 * m : t === 'clinch' ? 0.025 * m : 0;
    case 'yer':
      return t === 'takedown' ? 0.025 * m : 0;
    case 'tempo':
      return t === 'baski' ? 0.02 * m : 0;
    case 'bacak':
      return t === 'mesafe' ? 0.02 * m : t === 'baski' ? 0.01 * m : 0;
    case 'govde':
      return t === 'baski' ? 0.02 * m : 0;
    case 'blitz':
      return t === 'baski' ? (raunt === 1 ? 0.09 * m : 0) : t === 'clinch' && raunt === 1 ? 0.03 * m : 0;
    case 'gnp':
      return t === 'takedown' ? 0.04 * m : 0;
    case 'kafes':
      return t === 'clinch' ? 0.028 * m : 0;
    case 'puan':
      return t === 'mesafe' || t === 'kontra' ? 0.025 * m : 0;
  }
  return 0;
}

function withMods(base: Stats, mods: Partial<Stats>): Stats {
  const out = { ...base };
  STAT_KEYS.forEach((k) => (out[k] = clamp(base[k] + (mods[k] ?? 0), 1, 110)));
  return out;
}

function domains(st: Stats, sta: number, dmg: number) {
  const f = (0.72 + (0.28 * sta) / 100) * (1 - dmg / 320);
  return {
    striking: (st.vurus * 0.6 + st.hiz * 0.25 + st.iq * 0.15) * f,
    wrestling: (st.gures * 0.7 + st.kondisyon * 0.1 + st.iq * 0.2) * f,
    grappling: (st.yer * 0.75 + st.iq * 0.25) * f,
    power: st.vurus * f,
    cene: st.cene,
    kondisyon: st.kondisyon,
  };
}

// ---------- Kurulum ----------

export function startFight(opts: {
  pStats: Stats;
  pAd: string;
  koseAdi: string;
  opp: Opponent;
  mods: FightMods;
  maxRaunt: 3 | 5;
  unvanMaci: boolean;
  anaMac: boolean;
}): FightState {
  return {
    opp: opts.opp,
    pStats: withMods(opts.pStats, opts.mods.stats),
    pAd: opts.pAd,
    oAd: opts.opp.soyad,
    koseAdi: opts.koseAdi,
    maxRaunt: opts.maxRaunt,
    raunt: 1,
    vurusSira: 0,
    pHasar: 0,
    oHasar: 0,
    pKondisyon: 100,
    oKondisyon: 100,
    pPuan: 0,
    oPuan: 0,
    rauntFarklari: [],
    pKnockdown: 0,
    oKnockdown: 0,
    taktik: null,
    rakipTaktik: null,
    rakipTaktikGecmisi: [],
    taktikBasari: {},
    log: [],
    kritik: null,
    kritikMetni: '',
    subAdi: '',
    kose: null,
    durum: 'taktik',
    kesik: false,
    mods: opts.mods,
    unvanMaci: opts.unvanMaci,
    anaMac: opts.anaMac,
  };
}

const oStats = (fs: FightState) => {
  const st = withMods(fs.opp.stats, fs.mods.oppStats);
  // Bacak tekmesi planı: rakibin hızı raunt raunt düşer.
  if (fs.mods.plan === 'bacak') st.hiz = Math.max(1, st.hiz - (fs.raunt - 1) * (fs.mods.planUyum ? 5 : 3));
  return st;
};
const names = (fs: FightState): Record<Side, string> => ({ p: fs.pAd, o: fs.oAd });
const clone = (fs: FightState): FightState => JSON.parse(JSON.stringify(fs));

function sideDom(fs: FightState, s: Side) {
  return s === 'p'
    ? domains(fs.pStats, fs.pKondisyon, fs.pHasar)
    : domains(oStats(fs), fs.oKondisyon, fs.oHasar);
}

function addDmg(fs: FightState, victim: Side, d0: number) {
  // Puan planı: savunmaya öncelik, daha az hasar.
  const d = d0 * SC * (victim === 'p' && fs.mods.plan === 'puan' ? (fs.mods.planUyum ? 0.85 : 0.92) : 1);
  if (victim === 'p') fs.pHasar = clamp(fs.pHasar + d, 0, 100);
  else fs.oHasar = clamp(fs.oHasar + d, 0, 100);
  // Darbe almak nefesi de keser (özellikle gövdeye).
  if (victim === 'p') fs.pKondisyon = clamp(fs.pKondisyon - d * 0.4, 5, 100);
  else fs.oKondisyon = clamp(fs.oKondisyon - d * 0.4, 5, 100);
  if (victim === 'p' && !fs.kesik && fs.pHasar > 35 && chance(0.06 * (1 - (fs.mods.cutman ?? 0) * 0.2))) {
    fs.kesik = true;
    fs.log.push(L("🩸 Kaşının üstünde kesik açıldı! Kan gözüne akıyor."));
  }
}

function addPts(fs: FightState, s: Side, v0: number) {
  const v = v0 * SC;
  if (s === 'p') fs.pPuan += v;
  else fs.oPuan += v;
}

function drain(fs: FightState, s: Side, t: Tactic, extra = 0) {
  const st = s === 'p' ? fs.pStats : oStats(fs);
  let d = (DRAIN[t] + extra) * (1.45 - st.kondisyon / 100) * SC;
  if (s === 'o' && fs.mods.plan === 'tempo') d *= fs.mods.planUyum ? 1.3 : 1.15;
  if (s === 'o' && fs.mods.plan === 'govde') d *= fs.mods.planUyum ? 1.18 : 1.08;
  if (s === 'o' && fs.mods.plan === 'kafes' && t === 'clinch') d *= 1.1;
  if (s === 'p' && fs.mods.plan === 'blitz' && fs.raunt === 1) d *= 1.15;
  if (s === 'p') fs.pKondisyon = clamp(fs.pKondisyon - d, 5, 100);
  else fs.oKondisyon = clamp(fs.oKondisyon - d, 5, 100);
}

function sure(beat: number) {
  const seg = 300 / BEATS;
  const b = Math.min(beat, BEATS - 1);
  const s = clamp(randInt(Math.round(b * seg), Math.round((b + 1) * seg) - 1), 8, 299);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Metinde adı geçen submission tekniğini bulur. */
const subFromText = (t: string) => TECHNIQUES.find((x) => x.tur === 'sub' && t.toLocaleLowerCase(LOC).includes(x.ad.toLocaleLowerCase(LOC)));
const techLv = (fs: FightState, id?: string) => (id ? fs.mods.teknik?.[id] ?? 0 : 0);

function finish(fs: FightState, kazanan: Side, yontem: Method, aciklama: string, beat: number, sakatlik = false) {
  fs.karar = null;
  fs.sonuc = { kazanan, yontem, raunt: fs.raunt, sure: sure(beat), aciklama, sakatlik };
  fs.durum = 'bitti';
  fs.kritik = null;
  fs.log.push(aciklama);
  // Oyuncunun bitirişi: hangi hareketle bitirdiğini kaydet (o hareket ustalık kazanır).
  if (kazanan === 'p' && (yontem === 'KO' || yontem === 'TKO' || yontem === 'SUB')) {
    const t =
      (fs.pTeknik ? techById(fs.pTeknik) : undefined) ??
      (yontem === 'SUB' ? subFromText(aciklama) ?? pickTech(fs.mods.teknik, 'sub') : pickTech(fs.mods.teknik, 'vurus'));
    if (t) {
      fs.sonuc.teknik = t.id;
      fs.log.push(L("🎯 Bitiren hareket: {0}", [t.ad]));
    }
  }
}

function setCritical(fs: FightState, kind: CriticalKind) {
  fs.kritik = kind;
  fs.durum = 'kritik';
  // Oyuncunun fırsatında bildiği (ve iyi olduğu) teknikler öne çıkar.
  if (kind === 'subFirsat') fs.subAdi = pickTech(fs.mods.teknik, 'sub').ad;
  else if (kind === 'subTehlike') fs.subAdi = pick(SUBMISSIONS);
  const introKey =
    fs.yerde && kind === 'rakipSersem' ? 'rakipSersemYerde' : fs.yerde && kind === 'sarsildin' ? 'sarsildinYerde' : kind;
  fs.kritikMetni = fill(pick(CRITICAL_INTRO[introKey]), { o: fs.oAd, sub: fs.subAdi });
}

/** Hasar sonrası sarsılma kontrolü. true dönerse kritik an oluştu ya da maç bitti. */
function rockCheck(fs: FightState, victim: Side, dmg: number, beat: number): boolean {
  const vHasar = victim === 'p' ? fs.pHasar : fs.oHasar;
  const cene = victim === 'p' ? fs.pStats.cene : oStats(fs).cene;
  let p = (dmg * SC * (1.5 - cene / 100) * (0.4 + vHasar / 80)) / 38;
  // Gövde planı: geç rauntlarda düşen eller, sarsılan rakip.
  if (victim === 'o' && fs.mods.plan === 'govde' && fs.raunt >= 2) p *= fs.mods.planUyum ? 1.25 : 1.12;
  if (victim === 'o' && fs.mods.plan === 'puan') p *= 0.85;
  if (!chance(p)) return false;
  const att = other(victim);
  const kd = chance(0.5);
  if (kd) {
    if (att === 'p') fs.oKnockdown++;
    else fs.pKnockdown++;
    addPts(fs, att, 2);
  }
  // Ani nakavt: çok hasar almış dövüşçü bazen hiç kalkamaz.
  if (vHasar > 70 && chance(0.22)) {
    finish(
      fs,
      att,
      'KO',
      att === 'p'
        ? L("💥💥 {0} temiz bir yumrukla {1} dövüşçüsünü uyuttu! Hakem hemen araya giriyor. NAKAVT!", [fs.pAd, fs.oAd])
        : L("💥💥 Işıklar söndü… {0} seni temiz yakaladı. Gözlerini açtığında doktor başındaydı.", [fs.oAd]),
      beat,
    );
    return true;
  }
  setCritical(fs, victim === 'o' ? 'rakipSersem' : 'sarsildin');
  return true;
}

function successRate(fs: FightState, t: Tactic, delta: number) {
  fs.taktikBasari[t] = (fs.taktikBasari[t] ?? 0) + delta;
}

// ---------- Raunt içi anlar ----------

function groundPhase(fs: FightState, top: Side, beat: number): boolean {
  const T = sideDom(fs, top);
  const B = sideDom(fs, other(top));
  fs.log.push(groundLine(top, names(fs)));
  fs.yerde = true;
  addPts(fs, top, 1);
  const gnp = (3 + T.power / 20) * (0.6 + rand() * 0.8) * (top === 'p' && fs.mods.plan === 'gnp' ? (fs.mods.planUyum ? 1.45 : 1.25) : 1);
  addDmg(fs, other(top), gnp);
  let subP = clamp(0.1 + (T.grappling - B.grappling) / 110, 0.03, 0.4);
  if (top === 'p' && fs.mods.plan === 'yer') subP += fs.mods.planUyum ? 0.14 : 0.08;
  if (top === 'p') subP += bestLevel(fs.mods.teknik, 'sub') * 0.006;
  if (chance(subP * SC)) {
    setCritical(fs, top === 'p' ? 'subFirsat' : 'subTehlike');
    return true;
  }
  // Alttaki usta bir BJJ'ci guard'dan submission arar.
  if (B.grappling > T.grappling + 8 && chance(0.15 * SC)) {
    fs.log.push(L("{0} alttan bacaklarını kilitledi, tehlikeli bir guard!", [names(fs)[other(top)]]));
    setCritical(fs, top === 'p' ? 'subTehlike' : 'subFirsat');
    return true;
  }
  return rockCheck(fs, other(top), gnp * 0.6, beat);
}

function takedownBeat(fs: FightState, shooter: Side, beat: number): boolean {
  const A = sideDom(fs, shooter);
  const D = sideDom(fs, other(shooter));
  const tA = shooter === 'p' ? fs.taktik! : fs.rakipTaktik!;
  const tD = shooter === 'p' ? fs.rakipTaktik! : fs.taktik!;
  let p = 0.38 + (A.wrestling - D.wrestling) / 55 + ADV[tA][tD] * 1.5;
  if (shooter === 'p') p += planBonus(fs.mods, 'takedown', fs.raunt) - (fs.okunma ?? 0) * 1.5 + anlik(fs) * 1.5;
  p = clamp(p, 0.08, 0.9);
  const ok = chance(p);
  fs.log.push(tdLine(shooter, ok, names(fs)));
  drain(fs, shooter, 'takedown', ok ? 0 : 4);
  if (shooter === 'p') successRate(fs, 'takedown', ok ? 2 : -1);
  if (!ok) {
    addPts(fs, other(shooter), 0.9);
    addDmg(fs, shooter, tD === 'kontra' || tD === 'mesafe' ? 4 : 2);
    return false;
  }
  addPts(fs, shooter, 1);
  return groundPhase(fs, shooter, beat);
}

function clinchBeat(fs: FightState, beat: number): boolean {
  const P = sideDom(fs, 'p');
  const O = sideDom(fs, 'o');
  const pc = P.striking * 0.5 + P.wrestling * 0.5;
  const oc = O.striking * 0.5 + O.wrestling * 0.5;
  let r = pc / (pc + oc) + ADV[fs.taktik!][fs.rakipTaktik!] - (fs.okunma ?? 0) + anlik(fs) + noise(0.09);
  if (fs.taktik === 'clinch') r += planBonus(fs.mods, 'clinch', fs.raunt);
  const w: Side = r >= 0.5 ? 'p' : 'o';
  drain(fs, 'p', 'clinch');
  drain(fs, 'o', 'clinch');
  if (fs.taktik === 'clinch') successRate(fs, 'clinch', w === 'p' ? 1 : -1);
  const W = w === 'p' ? P : O;
  if (chance(0.2) && W.wrestling > 35) {
    fs.log.push(L("{0} clinch’ten ayak çelmesiyle rakibini yere indirdi!", [names(fs)[w]]));
    addPts(fs, w, 1.5);
    return groundPhase(fs, w, beat);
  }
  fs.log.push(strikeLine(w, 'clinch', names(fs)));
  const dmg = (4 + W.power / 25) * (0.7 + Math.abs(r - 0.5) * 3);
  addDmg(fs, other(w), dmg);
  addPts(fs, w, 1 + dmg / 14);
  return rockCheck(fs, other(w), dmg, beat);
}

function strikeBeat(fs: FightState, beat: number): boolean {
  const P = sideDom(fs, 'p');
  const O = sideDom(fs, 'o');
  const pt = fs.taktik!;
  const ot = fs.rakipTaktik!;
  let r = P.striking / (P.striking + O.striking) + ADV[pt][ot] + planBonus(fs.mods, pt, fs.raunt) - (fs.okunma ?? 0) + anlik(fs) + noise(0.1);
  drain(fs, 'p', pt);
  drain(fs, 'o', ot);
  // Hakemler kafesi kontrol eden, ileri yürüyen tarafı ödüllendirir.
  if (pt === 'baski') addPts(fs, 'p', 0.25);
  if (ot === 'baski') addPts(fs, 'o', 0.25);
  const margin = Math.abs(r - 0.5);
  if (margin < 0.025) {
    fs.log.push(evenLine());
    addPts(fs, 'p', 0.4);
    addPts(fs, 'o', 0.4);
    return false;
  }
  const w: Side = r > 0.5 ? 'p' : 'o';
  const wt = w === 'p' ? pt : ot;
  const W = w === 'p' ? P : O;
  const L = w === 'p' ? O : P;
  const base = { baski: 9, kontra: 8.5, mesafe: 5, clinch: 6, takedown: 6 }[wt];
  const war = pt === 'baski' && ot === 'baski' ? 1.3 : 1;
  const dmg = base * war * (0.6 + (W.power / 100) * 0.8) * (0.7 + margin * 3);
  addDmg(fs, other(w), dmg);
  addDmg(fs, w, base * 0.3 * war * (0.6 + (L.power / 100) * 0.8));
  addPts(fs, w, 1 + dmg / 12);
  addPts(fs, other(w), 0.3);
  successRate(fs, pt, w === 'p' ? 1 : -1);
  fs.log.push(strikeLine(w, wt, names(fs)));
  return rockCheck(fs, other(w), dmg, beat);
}

function beat(fs: FightState, i: number): boolean {
  fs.yerde = false;
  const pt = fs.taktik!;
  const ot = fs.rakipTaktik!;
  if (pt === 'takedown' || ot === 'takedown') {
    let shooter: Side;
    if (pt === 'takedown' && ot === 'takedown')
      shooter = sideDom(fs, 'p').wrestling + noise(8) > sideDom(fs, 'o').wrestling ? 'p' : 'o';
    else shooter = pt === 'takedown' ? 'p' : 'o';
    // Rakip takedown'ı her an denemez; bazen ayakta kalınır.
    if (shooter === 'o' && pt !== 'takedown' && chance(0.35)) return strikeBeat(fs, i);
    return takedownBeat(fs, shooter, i);
  }
  if (pt === 'clinch' || ot === 'clinch') return clinchBeat(fs, i);
  return strikeBeat(fs, i);
}

// ---------- Rakip yapay zekâsı ----------

/** Listenin sonundan itibaren t taktiği art arda kaç kez kullanılmış. */
function streak(hist: Tactic[], t: Tactic) {
  let n = 0;
  for (let i = hist.length - 1; i >= 0 && hist[i] === t; i--) n++;
  return n;
}

export const counterOf = (t: Tactic) => (Object.keys(ADV) as Tactic[]).reduce((a, b) => (ADV[b][t] > ADV[a][t] ? b : a));

function oppTactic(fs: FightState): Tactic {
  const o = oStats(fs);
  const w = new Map<Tactic, number>(STYLE_TACTICS[fs.opp.stil]);
  const mul = (t: Tactic, m: number) => w.set(t, (w.get(t) ?? 0) * m);
  if (fs.oKondisyon < 45) {
    mul('mesafe', 2);
    mul('kontra', 1.8);
    mul('baski', 0.5);
  }
  const behind = fs.rauntFarklari.reduce((a, b) => a + b, 0) > 0;
  if (fs.raunt === fs.maxRaunt && behind) mul('baski', 2.2);
  // Rakip, oyuncunun önceki rauntlarını izler: aynı taktik tekrarlandıkça ve rakip zekileştikçe karşı taktiğe geçer.
  const hist = fs.oyuncuTaktikGecmisi ?? [];
  const last = hist[hist.length - 1];
  if (last) {
    const rep = streak(hist, last);
    const worked = (fs.taktikBasari[last] ?? 0) > 0 ? 0.1 : 0;
    if (chance(clamp(0.12 + 0.22 * rep + worked + o.iq / 300, 0, 0.85))) mul(counterOf(last), 6);
  }
  return weighted([...w.entries()].filter(([, v]) => v > 0));
}

// ---------- Akış ----------

/** Akış ekranı için durum fotoğrafı. */
function snap(fs: FightState) {
  fs.anlar = fs.anlar ?? [];
  fs.anlar.push({ i: fs.log.length, pP: fs.pPuan, oP: fs.oPuan, pH: fs.pHasar, oH: fs.oHasar, pK: fs.pKondisyon, oK: fs.oKondisyon, dk: fs.vurusSira });
}

const anlik = (fs: FightState) => (fs.anlik && fs.anlik.kalan > 0 ? fs.anlik.v : 0);

function runBeats(fs: FightState) {
  while (fs.vurusSira < BEATS) {
    const i = fs.vurusSira;
    fs.vurusSira++;
    SC = BEAT_SCALE;
    let stop: boolean;
    try {
      stop = beat(fs, i);
    } finally {
      SC = 1;
    }
    if (fs.anlik && fs.anlik.kalan > 0) fs.anlik.kalan--;
    fs.kararSayac = (fs.kararSayac ?? 0) + 1;
    snap(fs);
    if (stop) return;
    // Rakip de raunt içinde uyum sağlar: zeki rakip oyuncunun o anki taktiğine karşılık verir.
    if (i < BEATS - 1 && chance(0.18)) {
      const o = oStats(fs);
      const yeni = chance(0.25 + o.iq / 200) ? counterOf(fs.taktik!) : oppTactic(fs);
      if (yeni !== fs.rakipTaktik) {
        fs.rakipTaktik = yeni;
        fs.log.push(L("🔄 {0} oyununu değiştirdi: {1}.", [fs.oAd, TACTICS[yeni].ad.toLocaleLowerCase(LOC)]));
      }
    }
    if (i < BEATS - 1 && maybeDecision(fs)) return;
  }
  endRound(fs);
}

// ---------- Karar anları (maç akarken) ----------

interface DecOpt {
  ad: string;
  aciklama: string;
  apply: (fs: FightState) => string;
}
interface DecDef {
  tip: string;
  agirlik: (fs: FightState) => number;
  metin: (fs: FightState) => string;
  secenekler: (fs: FightState) => DecOpt[];
}

const setTac = (fs: FightState, t: Tactic) => {
  fs.taktik = t;
};
const boost = (fs: FightState, v: number, kalan: number) => {
  fs.anlik = { v, kalan };
};
const TRASHY = [L("Trash talk ustası"), L("Kibirli"), L("Öfkeli"), L("Şovmen")];

const pressing = (fs: FightState) => fs.rakipTaktik === 'baski' || fs.rakipTaktik === 'takedown';
const outWrestle = (fs: FightState) => sideDom(fs, 'p').wrestling + noise(6) > sideDom(fs, 'o').wrestling;
const tired = (fs: FightState, d: number) => (fs.pKondisyon = clamp(fs.pKondisyon + d, 5, 100));

/**
 * Karar anları. Seçenekler bedava değildir: bağlama uyan doğru seçim üstünlük verir,
 * yanlış okuma ceza getirir. Rastgele seçen oyuncu ortalamada kazanamaz.
 */
/** Oyuncunun bildiği teknikler: seviyeye göre sıralı, en fazla n tane (seçenek listesi sabit kalsın). */
const knownOf = (fs: FightState, tur: TechDef['tur'], n = 3) =>
  TECHNIQUES.filter((t) => t.tur === tur && techLv(fs, t.id) > 0)
    .sort((a, b) => techLv(fs, b.id) - techLv(fs, a.id) || a.id.localeCompare(b.id))
    .slice(0, n);

/** Ayakta açık yakalandı: seçilen vuruş tekniği denenir. */
function strikeMove(fs: FightState, t: TechDef): string {
  const lv = techLv(fs, t.id);
  const o = oStats(fs);
  const p = clamp(0.3 + lv * 0.055 + (fs.pStats.vurus - o.hiz) / 220, 0.18, 0.68);
  if (!chance(p)) {
    addDmg(fs, 'p', 4);
    addPts(fs, 'o', 1.5);
    return pick([L("{0} savuşturuldu, kontrayı sen yedin.", [t.ad]), L("{0} {1} hareketini gördü, geri çekildi ve cevap verdi.", [fs.oAd, t.ad.toLocaleLowerCase(LOC)])]);
  }
  addDmg(fs, 'o', 8 + lv * 2.5);
  addPts(fs, 'p', 2);
  if (chance(0.07 + lv * 0.03 + fs.oHasar / 350)) {
    fs.pTeknik = t.id;
    finish(fs, 'p', t.id === 'karaciger' ? 'TKO' : 'KO', L("💥 {0}! {1} yıkıldı, hakem hemen araya girdi!", [t.ad.toUpperCase(), fs.oAd]), fs.vurusSira);
    return L("{0} tam yerine oturdu!", [t.ad]);
  }
  if (fs.oHasar > 45 && chance(0.4)) setCritical(fs, 'rakipSersem');
  return pick([L("🎯 {0} temiz isabet! {1} sarsıldı.", [t.ad, fs.oAd]), L("🎯 {0}! Salon ayağa kalktı, {1} geri adım attı.", [t.ad, fs.oAd])]);
}

/** Yerde üstte: seçilen submission denenir. */
function subMove(fs: FightState, t: TechDef): string {
  const lv = techLv(fs, t.id);
  const P = sideDom(fs, 'p');
  const O = sideDom(fs, 'o');
  const p = clamp(0.12 + lv * 0.055 + (P.grappling - O.grappling) / 120 + (100 - fs.oKondisyon) / 500, 0.06, 0.6);
  drain(fs, 'p', 'clinch', 2);
  if (chance(p)) {
    fs.pTeknik = t.id;
    finish(fs, 'p', 'SUB', L("🔒 {0} {1} kilidini kurdu ve sıktı… {2} TAP ATTI!", [fs.pAd, t.ad, fs.oAd]), fs.vurusSira);
    return L("{0} tam oturdu!", [t.ad]);
  }
  addPts(fs, 'p', 1);
  if (chance(0.35)) {
    fs.yerde = false;
    addPts(fs, 'o', 1);
    return L("{0} {1} kilidinden sıyrılıp ayağa kalktı.", [fs.oAd, t.ad.toLocaleLowerCase(LOC)]);
  }
  return L("{0} denemesi savunuldu ama üstteki pozisyonu korudun.", [t.ad]);
}

/** Özel hareket denemesi: seviye ve hız farkı isabeti belirler. Iskalarsan ağır bedel. */
function specialMove(fs: FightState, t: TechDef): string {
  fs.ozelKullanildi = true;
  const lv = techLv(fs, t.id);
  const o = oStats(fs);
  const p = clamp(0.2 + lv * 0.06 + (fs.pStats[t.stat] - o.hiz) / 220, 0.12, 0.6);
  if (!chance(p)) {
    addDmg(fs, 'p', 5);
    addPts(fs, 'o', 2);
    tired(fs, -6);
    boost(fs, -0.04, 2);
    return pick([L("{0} boşa gitti! Dengeni kaybettin, {1} üstüne çullandı.", [t.ad, fs.oAd]), L("{0} {1} hareketini okudu, kontra yedin!", [fs.oAd, t.ad.toLocaleLowerCase(LOC)])]);
  }
  addPts(fs, 'p', 3);
  if (t.id === 'imanari') {
    setCritical(fs, 'subFirsat');
    fs.subAdi = L("Heel hook");
    return L("🌀 {0}! Yuvarlanıp bacağı yakaladın, heel hook kuruluyor!", [t.ad]);
  }
  if (t.id === 'suplex') {
    addDmg(fs, 'o', 14 + lv * 2);
    fs.yerde = true;
    boost(fs, 0.08, 2);
    return L("💥 {0}! {1} kafesin zeminine çakıldı, salon ayağa kalktı!", [t.ad, fs.oAd]);
  }
  addDmg(fs, 'o', 12 + lv * 3);
  if (chance(0.15 + lv * 0.04 + fs.oHasar / 300)) {
    fs.pTeknik = t.id;
    finish(fs, 'p', 'KO', L("⚡⚡ {0}! {1} bilinçsiz yere yığıldı! Bu gece haftanın, belki yılın nakavtı!", [t.ad.toUpperCase(), fs.oAd]), fs.vurusSira);
    return L("{0} tam isabet!", [t.ad]);
  }
  boost(fs, 0.08, 2);
  if (fs.oHasar > 40) setCritical(fs, 'rakipSersem');
  return L("⚡ {0} tam isabet! {1} sarsıldı, bacakları titriyor!", [t.ad, fs.oAd]);
}

const DECISIONS: DecDef[] = [
  {
    tip: 'ozel',
    agirlik: (fs) => (knownOf(fs, 'ozel').length && !fs.ozelKullanildi ? 1.4 + techLv(fs, bestSpecial(fs.mods.teknik)!.id) * 0.3 : 0),
    metin: (fs) =>
      pick([
        L("⚡ {0} başını düşürerek dalıyor… Özel bir hareket için tam zamanı!", [fs.oAd]),
        L("⚡ Mesafe tam, {0} dikkatini kaybetti. Gösteri zamanı!", [fs.oAd]),
        L("⚡ {0} ağırlığını öne verdi. Kusursuz bir an!", [fs.oAd]),
      ]),
    secenekler: (fs) => [
      ...knownOf(fs, 'ozel').map((t) => ({ ad: `${t.ad}!`, aciklama: L("Özel hareket · seviye {0}. Yüksek risk, yüksek ödül.", [techLv(fs, t.id)]), apply: (x: FightState) => specialMove(x, t) })),
      { ad: L("Riske girme"), aciklama: L("Temel tekniklere sadık kal."), apply: () => L("Sabırlı davranıyorsun, fırsatı geçtin.") },
    ],
  },
  {
    tip: 'vurus_firsat',
    agirlik: (fs) => (!fs.yerde && knownOf(fs, 'vurus').length ? 0.8 : 0),
    metin: (fs) =>
      pick([
        L("🎯 {0} gardını düşürdü, çenesi açıkta!", [fs.oAd]),
        L("🎯 {0} yorgun bir jab attı ve geri çekilmeyi unuttu.", [fs.oAd]),
        L("🎯 {0} kafesin kenarında sıkıştı, açık bir hedef var.", [fs.oAd]),
      ]),
    secenekler: (fs) => [
      ...knownOf(fs, 'vurus').map((t) => ({ ad: t.ad, aciklama: L("Seviye {0} · {1}", [techLv(fs, t.id), t.aciklama]), apply: (x: FightState) => strikeMove(x, t) })),
      { ad: L("Jab ile puan topla"), aciklama: L("Güvenli, küçük üstünlük."), apply: (x: FightState) => (addPts(x, 'p', 1), L("Jab’lerle puan topluyorsun.")) },
    ],
  },
  {
    tip: 'sub_karar',
    agirlik: (fs) => (fs.yerde && knownOf(fs, 'sub').length ? 1.0 : 0),
    metin: (fs) =>
      pick([
        L("🔒 Üstteyken {0} kolunu açıkta bıraktı. Hangi kilide gideceksin?", [fs.oAd]),
        L("🔒 {0} sırtını dönmek üzere, bir kilit fırsatı var!", [fs.oAd]),
        L("🔒 Yerde kontrol sende. {0} panikte, bitirme şansı!", [fs.oAd]),
      ]),
    secenekler: (fs) => [
      ...knownOf(fs, 'sub').map((t) => ({ ad: t.ad, aciklama: L("Seviye {0} · {1}", [techLv(fs, t.id), t.aciklama]), apply: (x: FightState) => subMove(x, t) })),
      { ad: L("Ground & pound"), aciklama: L("Kilide gitme, üstten vur."), apply: (x: FightState) => (addDmg(x, 'o', 6), addPts(x, 'p', 1.5), L("Üstten sert vuruşlar indiriyorsun.")) },
    ],
  },
  {
    tip: 'kontra_firsat',
    agirlik: (fs) => (pressing(fs) ? 3 : 0.8),
    metin: (fs) => pick([L("👀 {0} her girişinde sağ elini düşürüyor gibi…", [fs.oAd]), L("👀 {0} fazla hevesli görünüyor, açık bırakıyor olabilir.", [fs.oAd])]),
    secenekler: () => [
      { ad: L("Kontraya geç"), aciklama: L("O gelirken yakala. Gelmiyorsa boşa beklersin."), apply: (fs) => (setTac(fs, 'kontra'), pressing(fs) ? (boost(fs, 0.08, 2), L("Doğru okudun! Her girişinde kontrayı hazırladın.")) : (boost(fs, -0.05, 2), L("Beklediğin atak gelmiyor, puan kaybediyorsun."))) },
      { ad: L("Baskıyı sürdür"), aciklama: L("Planını bozma."), apply: () => L("Planına sadık kalıyorsun.") },
      { ad: L("Takedown ile şaşırt"), aciklama: L("Onun girişine bacaktan dal."), apply: (fs) => (setTac(fs, 'takedown'), fs.rakipTaktik === 'baski' ? (boost(fs, 0.05, 1), L("Tam girişinde seviye değiştirdin!")) : (boost(fs, -0.03, 1), L("Dalışın okundu."))) },
    ],
  },
  {
    tip: 'nefes',
    agirlik: (fs) => (fs.pKondisyon < 50 ? 4 : 0),
    metin: () => pick([L("🫁 Ciğerlerin yanıyor, kolların ağırlaştı."), L("🫁 Nefesin kesiliyor. Tribünler bile fark etti.")]),
    secenekler: () => [
      { ad: L("Tempoyu düşür"), aciklama: L("Nefeslenirsin ama kontrolü bırakırsın."), apply: (fs) => (setTac(fs, 'mesafe'), tired(fs, 10), boost(fs, -0.02, 2), L("Ayaklarını kullanıp nefesini topluyorsun.")) },
      { ad: L("Dişini sık!"), aciklama: L("Kısa süreli güç, bedeli ağır."), apply: (fs) => (boost(fs, 0.05, 2), tired(fs, -8), L("İradenle devam ediyorsun!")) },
      { ad: L("Clinch’te dinlen"), aciklama: L("Rakibe yaslan, saniye kazan."), apply: (fs) => (setTac(fs, 'clinch'), tired(fs, 5), L("Rakibe yaslanıp nefes alıyorsun.")) },
    ],
  },
  {
    tip: 'rakip_yorgun',
    agirlik: (fs) => (fs.oKondisyon < 50 ? 4 : 0),
    metin: (fs) => pick([L("😮‍💨 {0} ağzı açık nefes alıyor, elleri düştü!", [fs.oAd]), L("😮‍💨 {0} yavaşladı. Tank boşalıyor!", [fs.oAd])]),
    secenekler: () => [
      { ad: L("Bas! Şimdi!"), aciklama: L("Yorgun rakibi boğ. Sen de yorulursun."), apply: (fs) => (setTac(fs, 'baski'), boost(fs, 0.07, 2), tired(fs, -5), L("Üstüne yürüyorsun!")) },
      { ad: L("Yere indir"), aciklama: L("Güreşin iyiyse yorgun bacaklar dayanmaz."), apply: (fs) => (setTac(fs, 'takedown'), outWrestle(fs) ? (boost(fs, 0.07, 2), L("Bacaklarını kilitledin!")) : (boost(fs, -0.03, 1), L("Yorgun ama hâlâ güçlü, sprawl ile savundu."))) },
      { ad: L("Sabırla puan topla"), aciklama: L("Risk yok, küçük kazanç."), apply: (fs) => (setTac(fs, 'mesafe'), boost(fs, 0.02, 2), L("Jablarla puan topluyorsun.")) },
    ],
  },
  {
    tip: 'kose',
    agirlik: () => 1.5,
    metin: (fs) => L("📣 Köşenden {0} bağırıyor: “{1}!”", [fs.koseAdi, TACTICS[counterOf(fs.rakipTaktik!)].ad.toLocaleUpperCase(LOC)]),
    secenekler: (fs) => [
      { ad: L("Hocanı dinle"), aciklama: L("{0} taktiğine geç.", [TACTICS[counterOf(fs.rakipTaktik!)].ad]), apply: (fs2) => (setTac(fs2, counterOf(fs2.rakipTaktik!)), boost(fs2, 0.03, 2), L("Köşenin talimatını uyguluyorsun.")) },
      { ad: L("Kendi planına sadık kal"), aciklama: L("Hissine güven."), apply: () => L("Kendi oyununu oynamaya devam ediyorsun.") },
    ],
  },
  {
    tip: 'kafes',
    agirlik: (fs) => (fs.pPuan > fs.oPuan ? 2 : 0.3),
    metin: (fs) => pick([L("🔒 {0} sırtını kafese verdi, kaçacak yeri yok!", [fs.oAd]), L("🔒 {0} kafese sıkıştı!", [fs.oAd])]),
    secenekler: () => [
      { ad: L("Dirsek ve diz yağdır"), aciklama: L("Kısa mesafede acımasız ol. Çok yorar."), apply: (fs) => (setTac(fs, 'clinch'), boost(fs, 0.07, 1), tired(fs, -6), L("Clinch’te kısa mesafeden vuruyorsun!")) },
      { ad: L("Takedown’a dal"), aciklama: L("Güreşin iyiyse kafese yaslayıp indir."), apply: (fs) => (setTac(fs, 'takedown'), outWrestle(fs) ? (boost(fs, 0.07, 1), L("Kafese yaslayıp bacaklara indin!")) : (boost(fs, -0.04, 1), L("Kafeste döndü, sen açıkta kaldın."))) },
      { ad: L("Ortaya dön"), aciklama: L("Kontrolü koru."), apply: (fs) => (setTac(fs, 'mesafe'), boost(fs, 0.01, 2), L("Hexagonun ortasını alıyorsun.")) },
    ],
  },
  {
    tip: 'kesik',
    agirlik: (fs) => (fs.kesik ? 2.5 : 0),
    metin: () => L("🩸 Kan gözüne akıyor, görüşün bulanıklaşıyor!"),
    secenekler: () => [
      { ad: L("Savunmaya çekil"), aciklama: L("Kesik büyümesin. Puan kaybedersin."), apply: (fs) => (setTac(fs, 'mesafe'), boost(fs, -0.02, 2), L("Gardını yükseltip mesafe açıyorsun.")) },
      { ad: L("Kan seni coşturdu: saldır!"), aciklama: L("Doktor gelmeden bitir. Daha çok darbe alırsın."), apply: (fs) => (setTac(fs, 'baski'), boost(fs, 0.05, 1), (fs.pHasar = clamp(fs.pHasar + 4, 0, 100)), L("Kanlar içinde ileri yürüyorsun!")) },
      { ad: L("Clinch’e gir"), aciklama: L("Zaman kazan."), apply: (fs) => (setTac(fs, 'clinch'), L("Rakibe sarılıp zamanı öldürüyorsun.")) },
    ],
  },
  {
    tip: 'acik',
    agirlik: () => 1,
    metin: (fs) => pick([L("🎯 {0} vuruştan önce omzunu düşürüyor. Bir açık gördün… ya da bu bir yem.", [fs.oAd]), L("🎯 {0} sol tekmeden sonra hep aynı yere dönüyor.", [fs.oAd])]),
    secenekler: () => [
      { ad: L("Zamanla ve vur"), aciklama: L("Dövüş zekân yüksekse tuzağı çözersin."), apply: (fs) => (chance(0.45 + (fs.pStats.iq - oStats(fs).iq) / 150) ? (boost(fs, 0.1, 1), L("Tam zamanında! Açığı yakaladın.")) : (boost(fs, -0.07, 1), L("Yemdi! Kontraya yakalandın."))) },
      { ad: L("Riske girme"), aciklama: L("Belki de bir yem."), apply: () => L("Temkinli kalıyorsun.") },
    ],
  },
  {
    tip: 'seyirci',
    agirlik: (fs) => (fs.raunt >= 2 ? 0.8 : 0.2),
    metin: () => L("🏟️ Salon ayakta, adını bağırıyor!"),
    secenekler: () => [
      { ad: L("Şov yap"), aciklama: L("Ellerini indir, rakibi davet et. Popülerlik getirir, risklidir."), apply: (fs) => ((fs.sov = (fs.sov ?? 0) + 1), boost(fs, -0.05, 1), L("Ellerini indirip rakibini çağırdın! Salon yıkılıyor!")) },
      { ad: L("Odağını koru"), aciklama: L("Gürültüyü duyma."), apply: (fs) => (boost(fs, 0.01, 2), L("Sadece rakibine bakıyorsun.")) },
    ],
  },
  {
    tip: 'provokasyon',
    agirlik: (fs) => (TRASHY.includes(fs.opp.kisilik) ? 1.6 : 0),
    metin: (fs) => pick([L("😤 {0} kafeste sana laf atıyor, gülüyor!", [fs.oAd]), L("😤 {0} ellerini indirip seni çağırıyor!", [fs.oAd])]),
    secenekler: () => [
      { ad: L("Soğukkanlı kal"), aciklama: L("Onun oyununa gelme."), apply: (fs) => (boost(fs, 0.03, 2), L("Duygularını kontrol ettin, zekânla dövüşüyorsun.")) },
      { ad: L("Kapışmaya gir!"), aciklama: L("Göster ona. İki taraf da hasar alır."), apply: (fs) => (setTac(fs, 'baski'), (fs.pHasar = clamp(fs.pHasar + 3, 0, 100)), (fs.oHasar = clamp(fs.oHasar + 4, 0, 100)), L("Ortada kapışma başladı!")) },
    ],
  },
];

/** Anlar arasında, bekleme süresi dolduysa ~%30 ihtimalle bağlama uygun bir karar anı çıkar. */
function maybeDecision(fs: FightState): boolean {
  if ((fs.kararSayac ?? 0) < 2 || !chance(0.3)) return false;
  const pool = DECISIONS.map((d) => [d, d.agirlik(fs)] as [DecDef, number]).filter(([, w]) => w > 0);
  if (!pool.length) return false;
  const d = weighted(pool);
  fs.karar = { tip: d.tip, metin: d.metin(fs), secenekler: d.secenekler(fs).map(({ ad, aciklama }) => ({ ad, aciklama })) };
  fs.durum = 'karar';
  fs.kararSayac = 0;
  return true;
}

export function resolveDecision(prev: FightState, idx: number): FightState {
  const fs = clone(prev);
  const d = DECISIONS.find((x) => x.tip === fs.karar?.tip);
  const opt = d?.secenekler(fs)[idx];
  fs.karar = null;
  fs.durum = 'taktik';
  if (opt) fs.log.push(`➤ ${opt.apply(fs)}`);
  // Özel hareket maçı bitirmiş ya da kritik an açmış olabilir.
  if (fs.durum === 'taktik') runBeats(fs);
  return fs;
}

export function chooseTactic(prev: FightState, t: Tactic): FightState {
  const fs = clone(prev);
  // Rakip, oyuncunun bu raunt ne seçtiğini bilmeden (yalnızca geçmişe bakarak) kararını verir.
  fs.rakipTaktik = oppTactic(fs);
  const hist = fs.oyuncuTaktikGecmisi ?? [];
  const rep = streak(hist, t);
  fs.okunma = rep * 0.045;
  hist.push(t);
  fs.oyuncuTaktikGecmisi = hist;
  fs.taktik = t;
  fs.rakipTaktikGecmisi.push(fs.rakipTaktik);
  fs.log = [L("— {0}. RAUNT — Sen: {1}", [fs.raunt, TACTICS[t].ad])];
  fs.anlar = [{ i: 1, pP: 0, oP: 0, pH: fs.pHasar, oH: fs.oHasar, pK: fs.pKondisyon, oK: fs.oKondisyon, dk: 0 }];
  if (rep > 0) fs.log.push(L("🧠 {0} bu hamleyi bekliyordu. Aynı oyunu {1}. kez oynamak seni öngörülebilir yapıyor.", [fs.oAd, rep + 1]));
  runBeats(fs);
  return fs;
}

export function resolveCritical(prev: FightState, choice: number): FightState {
  const fs = clone(prev);
  const kind = fs.kritik!;
  const b = fs.vurusSira - 1;
  const P = sideDom(fs, 'p');
  const O = sideDom(fs, 'o');
  const o = oStats(fs);
  fs.kritik = null;
  fs.durum = 'taktik';

  if (kind === 'rakipSersem') {
    const fp = clamp(0.4 + (fs.pStats.vurus - o.cene) / 140 + fs.oHasar / 200 + bestLevel(fs.mods.teknik, 'vurus') * 0.012, 0.15, 0.86);
    if (choice === 0) {
      drain(fs, 'p', 'baski', 6);
      if (chance(fp)) {
        const ko = chance(0.4);
        finish(fs, 'p', ko ? 'KO' : 'TKO',
          ko
            ? L("🔥 {0} üstüne çullanıyor, son yumruk {1} dövüşçüsünü kafesin zeminine gömüyor! NAKAVT!", [fs.pAd, fs.oAd])
            : L("🔥 {0} yağmur gibi yumruk indiriyor, {1} karşılık veremiyor, hakem araya giriyor! TKO!", [fs.pAd, fs.oAd]),
          b);
        return fs;
      }
      if (chance(0.25 + O.power / 400)) {
        fs.log.push(L("😱 {0} umutsuz bir kontra savurdu ve TAM İSABET! Durum tersine döndü!", [fs.oAd]));
        addDmg(fs, 'p', 12);
        if (rockCheck(fs, 'p', 14, b)) return fs;
      } else {
        fs.log.push(L("{0} bir şekilde ayakta kaldı, zili bekliyor. Sen de çok yoruldun.", [fs.oAd]));
        addDmg(fs, 'o', 8);
        addPts(fs, 'p', 2);
      }
    } else if (choice === 1) {
      drain(fs, 'p', 'baski');
      if (chance(fp * 0.45)) {
        finish(fs, 'p', 'TKO', L("🎯 {0} hedef seçerek vuruyor, sağ-sol-sağ… hakem yeter diyor! TKO!", [fs.pAd]), b);
        return fs;
      }
      fs.log.push(L("{0} kontrollü vuruşlarla puan topluyor, rakip toparlanmaya çalışıyor.", [fs.pAd]));
      addDmg(fs, 'o', 10);
      addPts(fs, 'p', 2.5);
    } else {
      // Zaten yerdeyse takedown'a gerek yok, doğrudan ground & pound.
      const tdOk = fs.yerde || chance(clamp(0.55 + (P.wrestling - O.wrestling) / 80, 0.3, 0.92));
      if (!tdOk) {
        fs.log.push(L("{0} yere indirmek için daldı ama rakip son gücüyle savundu. Fırsat kaçtı.", [fs.pAd]));
        addPts(fs, 'p', 1);
      } else if (chance(fp * 0.85)) {
        finish(fs, 'p', 'TKO', L("🔨 {0} yerde mount aldı, ground and pound yağdırıyor, hakem durdurdu! TKO!", [fs.pAd]), b);
        return fs;
      } else if (chance(clamp(0.25 + (P.grappling - O.grappling) / 90, 0.08, 0.6))) {
        const sub = pickTech(fs.mods.teknik, 'sub').ad;
        finish(fs, 'p', 'SUB', L("🔒 {0} sersem rakibin sırtını aldı ve {1} ile tap attırdı!", [fs.pAd, sub]), b);
        return fs;
      } else {
        fs.log.push(L("{0} yerde ağır vuruyor ama {1} bir şekilde hayatta kalıyor.", [fs.pAd, fs.oAd]));
        addDmg(fs, 'o', 9);
        addPts(fs, 'p', 2.5);
      }
    }
  } else if (kind === 'sarsildin') {
    const fp = clamp(0.42 + (o.vurus - fs.pStats.cene) / 140 + fs.pHasar / 200, 0.15, 0.85);
    let survive: number;
    if (choice === 0) survive = 0.62 + (P.wrestling - O.striking) / 180 + fs.pStats.cene / 400;
    else if (choice === 1) survive = 0.55 + (fs.pStats.hiz - o.hiz) / 150 + fs.pKondisyon / 500;
    else survive = 0.4;
    if (choice === 2 && chance(0.3 + (P.power - O.power) / 250)) {
      fs.log.push(L("🔥 İnanılmaz! Sarsılmışken savurduğun sağ el {0} dövüşçüsünü de sarstı!", [fs.oAd]));
      addDmg(fs, 'o', 13);
      if (rockCheck(fs, 'o', 16, b)) return fs;
    } else if (chance(clamp(survive, 0.15, 0.9))) {
      fs.log.push(
        choice === 0
          ? L("Rakibine sarıldın, kafanı yasladın. Saniyeler geçiyor… toparlanıyorsun.")
          : choice === 1
            ? L("Ayakların seni taşıdı. Kafes boyunca dönüp mesafe açtın, kafan netleşiyor.")
            : L("Karşılık vermeye çalıştın, isabet etmedi ama o da bitiremedi. Hayattasın!"),
      );
      addPts(fs, 'o', 1.5);
      drain(fs, 'p', 'clinch');
    } else if (chance(fp)) {
      const ko = chance(0.45);
      finish(fs, 'o', ko ? 'KO' : 'TKO',
        ko
          ? L("💀 {0} son darbeyi indirdi. Bilinçsiz yere yığıldın. NAKAVT.", [fs.oAd])
          : L("💀 {0} yumruk yağdırıyor, kendini savunamıyorsun. Hakem durdurdu. TKO.", [fs.oAd]),
        b);
      return fs;
    } else {
      fs.log.push(L("Ağır darbeler aldın ama ayaktasın. Zil seni kurtarmak zorunda."));
      addDmg(fs, 'p', 10);
      addPts(fs, 'o', 2.5);
    }
  } else if (kind === 'subFirsat') {
    if (choice === 0) {
      const sp = clamp(0.32 + (P.grappling - O.grappling) / 90 + (100 - fs.oKondisyon) / 400 + techLv(fs, subFromText(fs.subAdi)?.id) * 0.03, 0.1, 0.88);
      drain(fs, 'p', 'clinch', 3);
      if (chance(sp)) {
        finish(fs, 'p', 'SUB', L("🔒 {0} {1} kilidini sonuna kadar sıktı… {2} TAP ATTI!", [fs.pAd, fs.subAdi, fs.oAd]), b);
        return fs;
      }
      fs.log.push(L("{0} son anda {1} kilidinden sıyrıldı ve ayağa kalktı!", [fs.oAd, fs.subAdi]));
      addPts(fs, 'p', 1);
    } else {
      fs.log.push(L("{0} riske girmiyor, üstte kalıp dirsek ve yumrukla puan topluyor.", [fs.pAd]));
      addPts(fs, 'p', 2);
      addDmg(fs, 'o', 5);
    }
  } else if (kind === 'subTehlike') {
    if (choice === 2) {
      finish(fs, 'o', 'SUB', L("Tap attın. {0} {1} ile kazandı. Acı ama sağlıklısın.", [fs.oAd, fs.subAdi]), b);
      return fs;
    }
    const ep =
      choice === 0
        ? 0.55 + (P.grappling - O.grappling) / 90 + fs.pStats.iq / 500
        : 0.48 + (P.wrestling - O.grappling) / 90 + fs.pKondisyon / 400;
    if (choice === 1) drain(fs, 'p', 'baski', 8);
    if (chance(clamp(ep, 0.12, 0.9))) {
      fs.log.push(
        choice === 0
          ? L("Elleri kontrol ettin, açıyı kırdın ve {0} kilidinden çıktın!", [fs.subAdi])
          : L("Patlayıcı bir köprüyle sıyrıldın ve üste geçtin! Seyirci çıldırıyor!"),
      );
      if (choice === 1) addPts(fs, 'p', 1.5);
    } else {
      const kirik = chance(0.4);
      finish(fs, 'o', 'SUB',
        kirik
          ? L("🦴 Tap atmayı reddettin… bir çıtırtı. Hakem durdurdu. {0} {1} ile kazandı.", [fs.oAd, fs.subAdi])
          : L("Kilidi açamadın. {0} {1} ile seni tap attırdı.", [fs.oAd, fs.subAdi]),
        b, kirik);
      return fs;
    }
  }
  runBeats(fs);
  return fs;
}

function endRound(fs: FightState) {
  const diff = fs.pPuan - fs.oPuan;
  fs.rauntFarklari.push(Math.round(diff * 10) / 10);
  fs.pPuan = 0;
  fs.oPuan = 0;
  fs.log.push(L("🔔 {0}. raunt bitti.", [fs.raunt]));
  if (fs.raunt >= fs.maxRaunt) {
    decision(fs);
    return;
  }
  // Köşe durdurmaları
  if (fs.kesik && fs.pHasar > 70 && chance(0.2 * (1 - (fs.mods.cutman ?? 0) * 0.3))) {
    finish(fs, 'o', 'TKO', L("🩺 Ringside doktoru kesiğe bakıp başını salladı. Maç durduruldu. Doktor kararıyla TKO."), 2);
    return;
  }
  if (fs.oHasar > 78 && chance(0.15)) {
    finish(fs, 'p', 'TKO', L("🏳️ {0} köşesi havlu attı! Rakip raunda çıkamıyor. TKO!", [fs.oAd]), 2);
    return;
  }
  // Raunt arası dinlenme: kısmi toparlanma. Yorgunluk birikir, her rauntta tavan düşer.
  const tavan = (k: number) => 100 - fs.raunt * (9 - k / 20);
  fs.pKondisyon = clamp(Math.min(fs.pKondisyon + 3 + fs.pStats.kondisyon * 0.08, tavan(fs.pStats.kondisyon)), 5, 100);
  fs.oKondisyon = clamp(Math.min(fs.oKondisyon + 3 + oStats(fs).kondisyon * 0.08, tavan(oStats(fs).kondisyon)), 5, 100);
  fs.kose = cornerAdvice(fs, diff);
  fs.durum = 'rauntSonu';
}

/** Sonraki raunda geç. Taktik verilirse raunt hemen o taktikle akmaya başlar. */
export function nextRound(prev: FightState, t?: Tactic): FightState {
  const fs = clone(prev);
  fs.raunt++;
  fs.vurusSira = 0;
  fs.kose = null;
  fs.log = [];
  fs.durum = 'taktik';
  fs.anlik = undefined;
  return t ? chooseTactic(fs, t) : fs;
}

function decision(fs: FightState) {
  const judges = [0, 1, 2].map(() => {
    let p = 0;
    let o = 0;
    fs.rauntFarklari.forEach((d) => {
      const seen = d + noise(1);
      if (Math.abs(seen) < 0.05) {
        p += 10;
        o += 10;
      } else if (seen > 0) {
        p += 10;
        o += seen > 9 ? 8 : 9;
      } else {
        o += 10;
        p += seen < -9 ? 8 : 9;
      }
    });
    return { p, o };
  });
  const pw = judges.filter((j) => j.p > j.o).length;
  const ow = judges.filter((j) => j.o > j.p).length;
  const kartlar = judges.map((j) => `${j.p}-${j.o}`).join(', ');
  let kazanan: FightResult['kazanan'];
  let yontem: Method;
  if (pw === 3 || ow === 3) {
    kazanan = pw === 3 ? 'p' : 'o';
    yontem = 'UD';
  } else if (pw === 2 || ow === 2) {
    kazanan = pw === 2 ? 'p' : 'o';
    yontem = pw + ow === 3 ? 'SD' : 'MD';
  } else {
    kazanan = 'berabere';
    yontem = 'DRAW';
  }
  const yontemAd = { UD: L("oybirliğiyle"), SD: L("ayrık kararla"), MD: L("çoğunluk kararıyla") } as Record<string, string>;
  const aciklama =
    kazanan === 'berabere'
      ? L("⚖️ Hakem kartları: {0}. BERABERE!", [kartlar])
      : kazanan === 'p'
        ? L("🏁 Hakem kartları: {0}. {1} {2} kazandı!", [kartlar, fs.pAd, yontemAd[yontem]])
        : L("🏁 Hakem kartları: {0}. {1} {2} kazandı.", [kartlar, fs.oAd, yontemAd[yontem]]);
  fs.sonuc = { kazanan, yontem, raunt: fs.maxRaunt, sure: '5:00', aciklama, kartlar };
  fs.durum = 'bitti';
  fs.log.push(aciklama);
}

// ---------- Köşe ----------

function cornerAdvice(fs: FightState, diff: number): string {
  const lines: string[] = [];
  const c = fs.koseAdi;
  const open =
    diff > 2
      ? [L("Bu raunt bizim, net! Aynen devam."), L("Harika gidiyorsun, bozma sakın!"), L("Onu kırdın, gözlerinden okunuyor!"), L("Temiz raunt. Nefesini topla, aynısı.")]
      : diff > 0
        ? [L("Raundu aldık gibi ama yakındı. Hakemlere bırakma."), L("Önündeyiz ama fark az, uyuma!"), L("İyi ama yeterli değil. Biraz daha bastır."), L("Kartlarda öndeyiz sanırım. Riske girme ama geri de durma.")]
        : diff > -2
          ? [L("Başa baş gidiyor. Bir şeyi değiştirmemiz lazım."), L("Çok yakın bir raunttu, kimin aldığı belli değil."), L("Ortada kaldık. Bu raunt farkı açmalısın."), L("Denk gidiyor, fark yaratacak olan sensin.")]
          : [L("Bu raundu kaybettik, dinle beni! Planı değiştiriyoruz."), L("Uyan! Bu gidişle kartlar onun!"), L("Kötü raunt. Unut onu, sıfırdan başla."), L("Onun oyununu oynuyoruz. Hemen değiştir!")];
  lines.push(`${c}: "${pick(open)}"`);

  const counts = new Map<Tactic, number>();
  fs.rakipTaktikGecmisi.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
  const fav = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (fav) {
    const counter = (Object.keys(ADV) as Tactic[]).reduce((a, b) => (ADV[b][fav] > ADV[a][fav] ? b : a));
    const favText: Record<Tactic, string> = {
      baski: L("sürekli üstüne yürüyor"),
      kontra: L("geri durup kontra bekliyor"),
      takedown: L("bacaklarına dalıyor"),
      clinch: L("clinch’e girmeye çalışıyor"),
      mesafe: L("dışarıda dans ediyor"),
    };
    lines.push(pick([L("\"Adam {0}. {1} ile cezalandır.\"", [favText[fav], TACTICS[counter].ad]), L("\"Gördün mü? {0}. Cevabı {1}.\"", [favText[fav], TACTICS[counter].ad.toLocaleLowerCase(LOC)]), L("\"Hep aynısını yapıyor, {0}. {1}!\"", [favText[fav], TACTICS[counter].ad])]));
  }
  const o = oStats(fs);
  const weak = STAT_KEYS.reduce((a, b) => (o[b] < o[a] ? b : a));
  if (chance(0.5)) lines.push(pick([L("\"Unutma, {0} konusunda zayıf. Oraya yüklen.\"", [STAT_LABELS[weak].toLocaleLowerCase(LOC)]), L("\"Zayıf noktası {0}. Oraya git!\"", [STAT_LABELS[weak].toLocaleLowerCase(LOC)]), L("\"{0} tarafını zorla, orada çöküyor.\"", [STAT_LABELS[weak]])]));
  const ph = fs.oyuncuTaktikGecmisi ?? [];
  const cur = ph[ph.length - 1];
  if (cur && streak(ph, cur) >= 2) lines.push(pick([L("\"Hep {0} yapıyorsun, adam seni okudu! Bu raunt başka bir şey dene.\"", [TACTICS[cur].ad.toLocaleLowerCase(LOC)]), L("\"Seni çözdü! Ritmi değiştir, başka bir şey göster.\""), L("\"Aynı kaseti çalıyorsun. Onu şaşırt!\"")]));
  else if (cur && streak(ph, cur) === 1 && chance(0.5)) lines.push(pick([L("\"Aynı şeyi tekrar yaparsan seni okur. Onu şaşırt.\""), L("\"Tahmin edilebilir olma. Karıştır.\"")]));
  if (fs.pKondisyon < 45) lines.push(pick([L("\"Nefesin gitmiş! Tempoyu düşür, akıllı dövüş.\""), L("\"Ağzın açık nefes alıyorsun, sakin! Ayaklarını kullan.\""), L("\"Gazın bitiyor, enerjini doğru yerde harca.\"")]));
  if (fs.oKondisyon < 45) lines.push(pick([L("\"O yoruldu! Şimdi bas, şimdi!\""), L("\"Elleri düştü, gördün mü? Şimdi zamanı!\""), L("\"Adam bitmek üzere. Tempoyu artır!\"")]));
  if (fs.pHasar > 55) lines.push(L("\"Çok darbe alıyorsun, ellerini kaldır. Çenen sonsuz değil.\""));
  if (fs.kesik) lines.push(L("Cutman kaşına vazelin sürüyor, kanamayı durdurmaya çalışıyor."));
  return lines.join('\n');
}

export function methodLabel(m: Method) {
  return { KO: 'KO', TKO: 'TKO', SUB: L("Submission"), UD: L("Oybirliği"), SD: L("Ayrık karar"), MD: L("Çoğunluk kararı"), DRAW: L("Beraberlik") }[m];
}
