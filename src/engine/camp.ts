import { brainMods } from './brain';
import { scoutMods, scoutRival } from './scouting';
import { L, LOC } from '../i18n';
import { addHype, initHype } from './hype';
import { perkCamp, perkFightMods } from './perks';
import { familyMods } from './family';
import { hometownMods } from './hometown';
import { cutAction, CUT_SLOTS, manualCutResult, startManualCut, type CutAction } from './weightCut';
import { choosePartner, closePartnerMoment, ensurePartner, partnerCorner } from './partner';
import { addStat, currentOrg, growthMultiplier, fullName } from './character';
import { ORGS, WEIGHT_CLASSES } from './data';
import { PLANS, startFight } from './fight';
import { weakest } from './opponents';
import { siteById, CAMP_SITES, type CampSite } from './gyms';
import { campPoints } from './progression';
import { autoFreeWeek, autoFreeWeeks, campLengthsFor, campWeek, CAMP_LENGTH_INFO, freeWeek, setCampLength } from './calendar';
import { techLevels } from './techniques';
import { addFollowers, fmtDelta, followers, trashTalkFollowers } from './fame';
import { socialCampStart } from './social';
import { dopingActive, DOPING_MODS } from './doping';
import { prAdjust, staffCampHealth, staffCampPoints, staffCutman, staffFreeCut, staffGrowth } from './staff';
import { petRunner } from './pets';
import { diseaseMods, untreated } from './nightlifeCore';
import { scandal } from './sponsors';
import { campMotivation, cutBonus, fightItemMods, injuryMultiplier, owns, restMultiplier } from './shop';
import { chance, clamp, pick, rand, randInt } from './rng';
import { drillBonus, recordDrill } from './drills';
import { bump } from './istat';
import { buildNight } from './fightNight';
import { coachMods } from './coachBond';
import { campMomentOpen, chooseCampMoment, closeCampMoment } from './campMoments';
import { answerPress, pressDone, startPress, type PressStyle } from './pressConf';
import { chooseRivalNews, closeRivalNews, rivalNewsMods, rivalNewsOpen } from './rivalCamp';
import { mediaFatigue } from './media';
import { fatigue, growthAt } from './fatigue';
import { answerDuel, autoAnswer, createDuel, duelOutcome, type DuelAnswer } from './trashTalk';
import { isFarewellFight } from './farewell';
import type {
  GameState,
  Injury,
  Intensity,
  PlanKey,
  PressChoice,
  Stats,
  StatKey,
  WeightCut,
} from './types';
import { STAT_KEYS, STAT_LABELS } from './types';

export const INTENSITY: Record<Intensity, { ad: string; aciklama: string; carpan: number; risk: number; saglik: number }> = {
  dusuk: { ad: L("Düşük"), aciklama: L("Vücudunu dinle. Az gelişim, neredeyse sıfır risk, iyi toparlanma."), carpan: 0.6, risk: 0.03, saglik: 20 },
  orta: { ad: L("Orta"), aciklama: L("Dengeli kamp. Makul gelişim, düşük risk."), carpan: 1, risk: 0.08, saglik: 12 },
  yuksek: { ad: L("Yüksek"), aciklama: L("Günde iki idman, sert sparring. Hızlı gelişim ama sakatlık riski ciddi."), carpan: 1.55, risk: 0.2, saglik: 3 },
};

export const WEIGHT_CUTS: Record<WeightCut, { ad: string; aciklama: string }> = {
  kademeli: { ad: L("Kademeli ve disiplinli"), aciklama: L("Diyetisyenle haftalara yayılmış kilo verme. Neredeyse garanti ama masraflı.") },
  normal: { ad: L("Normal"), aciklama: L("Standart diyet ve son gün hafif su kesimi. Küçük bir risk var.") },
  sert: { ad: L("Son hafta sert su kesimi"), aciklama: L("Kafeste rakipten iri olursun, ama tartıyı kaçırma ve kurumuş çıkma riski yüksek.") },
};

export const PRESS: Record<PressChoice, { ad: string; aciklama: string }> = {
  saygili: { ad: L("Saygılı ol"), aciklama: L("Profesyonel görün. Az ama güvenli popülerlik.") },
  trash: { ad: L("Trash talk yap"), aciklama: L("Basın toplantısında rakiple canlı laf düellosuna gir. Kazanırsan popülerlik patlar, kaybedersen alay konusu olursun.") },
  sessiz: { ad: L("Kısa kes"), aciklama: L("Konuşmayı kafese bırak. Etkisi yok.") },
};

const INJURIES: Omit<Injury, 'hafta'>[] = [
  { ad: L("Kaburga çatlağı"), stat: 'kondisyon', ceza: 8 },
  { ad: L("Burkulmuş ayak bileği"), stat: 'hiz', ceza: 8 },
  { ad: L("Elde kemik çatlağı"), stat: 'vurus', ceza: 10 },
  { ad: L("Diz bağı zorlanması"), stat: 'gures', ceza: 10 },
  { ad: L("Omuz zorlanması"), stat: 'yer', ceza: 8 },
  { ad: L("Sparringde beyin sarsıntısı"), stat: 'cene', ceza: 10 },
];

export function randomInjury(minW: number, maxW: number): Injury {
  return { ...pick(INJURIES), hafta: randInt(minW, maxW) };
}

const STAGE_ORDER = ['amator', 'bolgesel', 'buyuk', 'ufc'];

export function cutCost(s: GameState) {
  return owns(s, 'diyetisyen') || staffFreeCut(s) ? 0 : { amator: 150, bolgesel: 800, buyuk: 2500, ufc: 4000 }[s.stage];
}

/** Kamp masrafı dökümü: salon ücreti + kamp yeri ücreti. Oyuncu seçmeden önce görür. */
export function campQuote(s: GameState, siteId: string, weeks: number) {
  const site = siteById(siteId);
  const salon = site.salonUcreti && s.stage !== 'amator' ? weeks * 40 * s.takim.antrenorKalite : 0;
  const yer = weeks * site.haftalik;
  return { salon, yer, toplam: salon + yer };
}

export function campCost(s: GameState, weeks: number) {
  return campQuote(s, 'salon', weeks).toplam;
}

/** Kariyer aşamasına göre açık kamp yerleri. */
export function availableSites(s: GameState): CampSite[] {
  return CAMP_SITES.filter((x) => !x.minStage || STAGE_ORDER.indexOf(s.stage) >= STAGE_ORDER.indexOf(x.minStage));
}

/** Kariyerin ilk kampı mı? (Hiç amatör maç yapılmadı.) */
export const isFirstCamp = (s: GameState) => s.stage === 'amator' && s.amator.g + s.amator.m + s.amator.b === 0;

// Hocanın plan seçimi: senin üstün olduğun ve rakibin zayıf kaldığı alan.
const COACH_PLANS: [StatKey, PlanKey][] = [
  ['vurus', 'ayakta'],
  ['gures', 'gures'],
  ['yer', 'yer'],
  ['kondisyon', 'tempo'],
];

/** İlk kamp için hocanın hazırladığı plan: 4 hafta, kendi salonun, hocanın uzmanlığı, orta tempo, normal kilo. */
export function coachCampPlan(s: GameState) {
  const o = s.pending.rakip!;
  const f = s.fighter.stats;
  const [stat, plan] = COACH_PLANS.reduce((a, x) => (f[x[0]] - o.stats[x[0]] > f[a[0]] - o.stats[a[0]] ? x : a));
  const focus: StatKey = s.takim.uzmanlik ?? stat;
  return { hafta: Math.min(4, s.pending.kamp?.macHafta ?? 4), focus, plan, stat };
}

function applyCoachPlan(s: GameState) {
  const k = s.pending.kamp!;
  const c = coachCampPlan(s);
  setCampLength(s, c.hafta);
  if (k.step === 'takvim') autoFreeWeeks(s);
  k.yer = 'salon';
  k.focus = c.focus;
  k.plan = c.plan;
  k.intensity = 'orta';
  k.kilo = 'normal';
  if (hasPress(s)) k.basin = 'saygili';
  startCampWeeks(s);
}

export interface CampPlan {
  hafta: number;
  yer: string;
  focus: StatKey;
  plan: PlanKey;
  intensity: Intensity;
  kilo: WeightCut;
  basin?: PressChoice;
}

/** Tek ekranlık kamp planının varsayılanı: son kampta seçtiklerin; ilk kezse hocanın önerisi. Oyun planı her rakibe göre hocadan gelir. */
export function defaultCampPlan(s: GameState): CampPlan {
  const k = s.pending.kamp!;
  const c = coachCampPlan(s);
  const last = s.sonKamp;
  const lengths = campLengthsFor(k.macHafta ?? 8);
  const hafta = last && lengths.includes(last.hafta) ? last.hafta : lengths.includes(8) ? 8 : lengths[lengths.length - 1];
  const open = availableSites(s).map((x) => x.id);
  const yer = last && open.includes(last.yer) ? last.yer : 'salon';
  return {
    hafta,
    yer,
    focus: last?.focus ?? c.focus,
    plan: c.plan,
    intensity: last?.intensity ?? 'orta',
    kilo: last?.kilo ?? 'normal',
    basin: hasPress(s) ? last?.basin ?? 'saygili' : undefined,
  };
}

/** Hocanın önerisi (tek dokunuş): rakibe göre plan ve odak, güvenli tempo ve kilo. */
export function coachPlanFull(s: GameState): CampPlan {
  const k = s.pending.kamp!;
  const c = coachCampPlan(s);
  const lengths = campLengthsFor(k.macHafta ?? 8);
  return { hafta: lengths.includes(8) ? 8 : lengths[lengths.length - 1], yer: 'salon', focus: c.focus, plan: c.plan, intensity: 'orta', kilo: 'normal', basin: hasPress(s) ? 'saygili' : undefined };
}

/** Tek ekranda seçilen planı uygular; serbest hafta varsa takvime, yoksa doğrudan kamp haftalarına geçilir. */
export function applyCampPlan(s: GameState, p: CampPlan) {
  const k = s.pending.kamp;
  if (!k || k.step !== 'planla') return;
  const lengths = campLengthsFor(k.macHafta ?? 8);
  const open = availableSites(s).map((x) => x.id);
  k.planli = true;
  k.yer = open.includes(p.yer) ? p.yer : 'salon';
  k.focus = STAT_KEYS.includes(p.focus) ? p.focus : coachCampPlan(s).focus;
  k.plan = p.plan in PLANS ? p.plan : coachCampPlan(s).plan;
  k.intensity = p.intensity in INTENSITY ? p.intensity : 'orta';
  k.kilo = 'normal';
  if (hasPress(s)) k.basin = p.basin && p.basin in PRESS ? p.basin : 'saygili';
  s.sonKamp = { hafta: p.hafta, yer: k.yer, focus: k.focus, intensity: k.intensity, kilo: k.kilo, basin: k.basin };
  setCampLength(s, lengths.includes(p.hafta) ? p.hafta : lengths[lengths.length - 1]);
}

export function startCamp(s: GameState) {
  const kisa = s.kisaHaber;
  s.kisaHaber = false;
  // Maç tarihi teklifte belirlenmişti; kamp süresini oyuncu seçer, kalan haftalar serbest takvimdir.
  const mac = s.pending.rakip?.macHafta ?? (kisa ? 3 : s.stage === 'amator' ? 6 : 9);
  const hafta = kisa ? mac : Math.min(8, mac);
  s.pending.kamp = {
    // Kampa girerkenki yorgunluk sabitlenir (kamp haftaları boyunca toparlanma gelişimi kurtarmaz)
    yorgunBas: fatigue(s),
    step: kisa ? 'plan' : isFirstCamp(s) ? 'hoca' : 'planla',
    yer: kisa ? 'salon' : undefined,
    hafta,
    macHafta: mac,
    serbest: 0,
    kisaHaber: kisa,
    ozet: [],
    mods: {},
    oppMods: {},
    ucretCeza: 0,
    rakipCeza: false,
    iptal: false,
  };
  s.phase = 'kamp';
  initHype(s);
  scoutRival(s);
  ensurePartner(s);
  socialCampStart(s);
}

const hasPress = (s: GameState) => s.stage !== 'amator';

/** Kampın bir adımında seçim yapar. value: adımın beklediği anahtar ya da seçenek indeksi. */
export function campChoose(s: GameState, value: string | number) {
  const k = s.pending.kamp!;
  switch (k.step) {
    case 'hoca':
      if (value === 'kabul') applyCoachPlan(s);
      else k.step = 'planla';
      return;
    case 'planla':
      if (typeof value === 'string' && value.startsWith('plan:')) applyCampPlan(s, JSON.parse(value.slice(5)) as CampPlan);
      return;
    case 'sure':
      setCampLength(s, Number(value));
      return;
    case 'takvim':
      if (value === 'hizli') autoFreeWeeks(s);
      else if (value === 'oto1') autoFreeWeek(s);
      else freeWeek(s, String(value));
      return;
    case 'haftalik':
      if (typeof value === 'string' && value.startsWith('idman:')) return recordDrill(s, Number(value.slice(6)));
      if (typeof value === 'string' && value.startsWith('kanka:')) return choosePartner(s, Number(value.slice(6)));
      if (value === 'kankaKapat') return closePartnerMoment(s);
      if (typeof value === 'string' && value.startsWith('rakip:')) return chooseRivalNews(s, Number(value.slice(6)));
      if (value === 'rakipKapat') return closeRivalNews(s);
      if (typeof value === 'string' && value.startsWith('an:')) return chooseCampMoment(s, Number(value.slice(3)));
      if (value === 'anKapat') return closeCampMoment(s);
      if (value === 'seansAtla') return void (k.seansKarar = true);
      // Bir karar anı bekliyorsa (ortak, rakip kampı, kamp anı) hafta ilerlemez
      if (campPaused(s)) return;
      if (value === 'hepsi') while ((k.kampIdx ?? 0) < k.hafta && !campPaused(s)) campWeek(s);
      else campWeek(s);
      if (campPaused(s)) return;
      if ((k.kampIdx ?? 0) >= k.hafta) {
        // Profesyonelde kamp basın toplantısı sahnesiyle biter
        if (hasPress(s) && !k.basinSahne) {
          startPress(s);
          k.step = 'basinsahne';
        } else afterPress(s);
      }
      return;
    case 'basinsahne':
      if (typeof value === 'string' && value.startsWith('cevap:')) answerPress(s, value.slice(6) as PressStyle);
      else if (value === 'devam' && pressDone(s)) afterPress(s);
      return;
    case 'duello': {
      const d = k.duello!;
      if (value === 'oto') while (!d.bitti) answerDuel(s, d, autoAnswer(s, d));
      else if (value === 'devam') {
        if (d.bitti) runCamp(s);
      } else answerDuel(s, d, String(value) as DuelAnswer);
      return;
    }
    case 'yer':
      k.yer = String(value);
      k.step = 'focus';
      return;
    case 'focus':
      k.focus = value as StatKey;
      k.step = 'plan';
      return;
    case 'plan':
      k.plan = value as PlanKey;
      if (k.kisaHaber) afterPlan(s);
      else k.step = 'intensity';
      return;
    case 'intensity':
      k.intensity = value as Intensity;
      afterPlan(s);
      return;
    case 'kilo':
      k.kilo = value as WeightCut;
      if (hasPress(s)) k.step = 'basin';
      else startCampWeeks(s);
      return;
    case 'basin':
      k.basin = value as PressChoice;
      startCampWeeks(s);
      return;
    case 'sakatlik':
      if (value === 0) {
        k.ozet.push(L("Sakatlığa rağmen dövüşmeye karar verdin. {0} kafeste zayıf olacak.", [STAT_LABELS[k.sakatlik!.stat]]));
        k.step = 'ozet';
      } else {
        withdraw(s);
      }
      return;
    case 'ozet':
      // İlk maçta kiloyu hoca halleder (yeni oyuncu ilk dövüşe hızlı ulaşsın); sonrasında son 48 saati oyuncu yönetir
      if (!s.gecmis.length && !k.kesim) {
        k.kilo = 'kademeli';
        weighIn(s);
        k.tartiMetni = `${k.tartiMetni}\n${L("İlk maçın olduğu için kiloyu hocan yönetti. Bir sonraki maçta son 48 saat senin elinde.")}`;
        return;
      }
      startManualCut(s);
      return;
    case 'kesim':
      if (value === 'tarti') {
        if ((k.kesim?.dilim ?? 0) >= CUT_SLOTS) weighIn(s);
      } else cutAction(s, value as CutAction);
      return;
    case 'tarti':
      if (k.iptal) {
        s.pending = {};
        s.phase = 'hub';
      } else {
        k.step = 'yuzyuze';
        k.rakipHamle = planRivalMove(s);
      }
      return;
    case 'yuzyuze':
      if (!k.yuzyuze) faceOff(s, String(value));
      else if (typeof value === 'string' && value.startsWith('giris:')) k.giris = value.slice(6);
      else beginFight(s);
      return;
  }
}

/** Kamp akışı bir karar bekliyor mu */
export const campPaused = (s: GameState) => !!s.pending.kamp?.kankaAn || rivalNewsOpen(s) || campMomentOpen(s);

/** Basın toplantısından sonra: trash talk seçildiyse düello, yoksa kamp sonucu. */
function afterPress(s: GameState) {
  const k = s.pending.kamp!;
  if (k.basin === 'trash' && !k.duello) {
    k.duello = createDuel(s);
    k.step = 'duello';
  } else runCamp(s);
}

/** Ayarlar bitti: kamp hafta hafta oynanır. */
function startCampWeeks(s: GameState) {
  const k = s.pending.kamp!;
  k.kampIdx = 0;
  k.haftaLog = [];
  k.step = 'haftalik';
}

function runCamp(s: GameState) {
  const k = s.pending.kamp!;
  const f = s.fighter;
  const opp = s.pending.rakip!;
  const intensity = INTENSITY[k.intensity ?? 'orta'];
  const site = siteById(k.yer ?? 'salon');
  const coachQ = site.salonUcreti ? s.takim.antrenorKalite : (site.kalite ?? 5);
  // Haftalar zaten tek tek oynandı (campWeek).
  const notes: string[] = [];
  const saglikOnce = s.saglik;
  const len = CAMP_LENGTH_INFO[k.hafta] ?? { carpan: k.hafta / 8, risk: 1 };
  k.ozet.push(L("📍 Kamp yeri: {0}{1}", [site.ad, site.salonUcreti ? ` (${s.takim.antrenor})` : '']));

  // Gelişim
  const drill = drillBonus(s);
  const medya = mediaFatigue(s);
  if (medya < 1) k.ozet.push(L("🎬 Medya işleri kampı böldü: gelişim %{0} azaldı.", [Math.round((1 - medya) * 100)]));
  const yb = k.yorgunBas ?? 0;
  const yorgun = growthAt(yb);
  if (yb >= 20) k.ozet.push(L("🥱 Kampa yorgun girdin: gelişim %{0} azaldı.", [Math.round((1 - yorgun) * 100)]));
  let artis = 0;
  if (k.focus) {
    const g =
      (2 + rand() * 1.4) *
      intensity.carpan *
      growthMultiplier(f.yas) *
      (0.7 + coachQ * 0.06) *
      site.carpan *
      (k.focus === site.bonusStat ? 1.3 : 1) *
      (site.salonUcreti && k.focus === s.takim.uzmanlik ? 1.35 : 1) *
      staffGrowth(s, k.focus) *
      (k.focus === 'kondisyon' && petRunner(s) ? 1.1 : 1) *
      (1 + (s.motivasyon + campMotivation(s)) * 0.1) *
      (k.kisaHaber ? 1 : len.carpan) *
      drill.gelisim *
      perkCamp(s) *
      medya *
      yorgun *
      (1 + (k.anEtki?.gelisim ?? 0));
    // Kamp odak alanı en kötü +2 gelişir; iyi koşullarda +5'e kadar.
    const d = addStat(f.stats, k.focus, clamp(Math.round(g), 2, 5), 2);
    artis = d;
    k.ozet.push(`📈 ${STAT_LABELS[k.focus]} +${d} (${f.stats[k.focus]})`);
    if (k.focus === site.bonusStat) k.ozet.push(L("🔥 {0} tam bu alanda uzman: gelişim arttı.", [site.ad]));
    else if (site.salonUcreti && k.focus === s.takim.uzmanlik) k.ozet.push(L("🔥 {0} bu alanın ustası: gelişim arttı.", [s.takim.antrenor]));
  }
  if (drill.ort) k.ozet.push(L("🎯 Antrenman seansları: ortalama {0} puan · gelişim +%{1}, sakatlık riski -%{2}", [drill.ort, Math.round((drill.gelisim - 1) * 100), Math.round((1 - drill.risk) * 100)]));
  s.motivasyon += campMotivation(s);
  const puan = clamp(campPoints(s, k.intensity ?? 'orta', !!k.kisaHaber) + site.puan + staffCampPoints(s), k.kisaHaber ? 1 : 2, 3);
  s.puan += puan;
  k.ozet.push(L("⭐ +{0} gelişim puanı (toplam {1}). Tartıdan önce harcayabilirsin.", [puan, s.puan]));
  s.motivasyon = 0;
  s.saglik = clamp(s.saglik + (k.kisaHaber ? 0 : Math.round(intensity.saglik * restMultiplier(s)) + staffCampHealth(s)), 0, 100);

  // Masraf
  let cost = campQuote(s, site.id, k.hafta).toplam;
  if (k.kilo === 'kademeli') cost += cutCost(s);
  if (cost > 0) {
    s.para -= cost;
    k.ozet.push(L("💸 Kamp masrafı: ${0}", [cost.toLocaleString(LOC)]));
  }

  // Plan uyumu
  const weak = weakest(opp);
  const planUyum = !!k.plan && PLANS[k.plan].hedef.includes(weak);
  if (k.plan)
    k.ozet.push(
      planUyum
        ? L("🎯 Oyun planın rakibin zaafına ({0}) tam oturuyor. Kafeste bunun karşılığını alacaksın.", [STAT_LABELS[weak]])
        : L("🎯 Oyun planı: {0}.", [PLANS[k.plan].ad]),
    );
  k.planUyum = planUyum;
  k.sonuc = {
    focus: k.focus,
    artis,
    yeni: k.focus ? f.stats[k.focus] : 0,
    puan,
    maliyet: cost,
    saglik: s.saglik,
    saglikDelta: s.saglik - saglikOnce,
    planUyum,
    yer: site.ad,
    teknik: (k.haftaLog ?? []).filter((l) => /seviye atladı|ustalığı|leveled up|mastery \+|subió de nivel|Maestría de|subiu de nível|Maestria de|новый уровень|Мастерство/.test(l)).map((l) => l.replace(/^(\d+\. hafta|Week \d+|Semana \d+|Неделя \d+) · /, '')),
  };

  // Basın toplantısı
  if (k.basin === 'trash') {
    s.trashTalk = true;
    opp.rivalry = Math.max(opp.rivalry, 1);
    k.oppMods = { vurus: 2, kondisyon: 2 };
    const duel = k.duello ? duelOutcome(k.duello) : chance(0.45 + f.stats.iq / 250 + s.populerlik / 300) ? 'kazandi' : 'kaybetti';
    addHype(s, duel === 'kazandi' ? 18 : duel === 'berabere' ? 10 : 8, L("Basın toplantısı"));
    if (duel === 'berabere') {
      s.populerlik = clamp(s.populerlik + 2, 0, 100);
      k.ozet.push(L("🎤 Basın toplantısında laflar havada uçuştu, kimse üstün gelemedi. Popülerlik +2. {0} gaza geldi.", [opp.soyad]));
    } else if (duel === 'kazandi') {
      if (k.duello) {
        // Düelloyu kazandın: rakip sinirli, kafası karışık
        k.oppMods = { iq: -2 };
        bump(s, 'duelloG');
      }
      s.populerlik = clamp(s.populerlik + 6, 0, 100);
      const t = trashTalkFollowers(s, true, !!k.duello);
      k.ozet.push(
        k.duello
          ? L("🎤 Basın toplantısını sen kazandın! Video milyonlarca izlendi. {0}. {1} sinirden ne dediğini bilmiyordu (rakip IQ -2).", [t.metin, opp.soyad])
          : L("🎤 Trash talk tuttu! Video milyonlarca izlendi. {0}. {1} ise seni öldürmeye geliyor.", [t.metin, opp.soyad]),
      );
    } else {
      s.populerlik = clamp(s.populerlik - 2, 0, 100);
      const t = trashTalkFollowers(s, false);
      k.ozet.push(L("🎤 Dengeyi kaçırdın: sözlerin ters tepti, sosyal medyada alay konusu oldun. {0}. {1} gaza geldi.", [t.metin, opp.soyad]));
    }
  } else if (k.basin === 'saygili') {
    addHype(s, 2, L("Basın toplantısı"));
    s.trashTalk = false;
    s.populerlik = clamp(s.populerlik + 1, 0, 100);
    k.ozet.push(L("🎤 Basın toplantısında saygılı ve kendinden emindin. Popülerlik +1."));
  } else if (k.basin === 'sessiz') {
    s.trashTalk = false;
    k.ozet.push(L("🎤 Az konuştun. \"Kafeste görüşürüz.\""));
  }

  const corner = partnerCorner(s);
  if (corner) notes.push(corner);
  k.ozet.push(...notes);

  // Sakatlık zarı
  const risk = intensity.risk * (1.3 - s.saglik / 200) * (k.kisaHaber ? 0.5 : len.risk) * injuryMultiplier(s) * site.risk * drill.risk * (1 + (k.anEtki?.risk ?? 0));
  if (chance(risk)) {
    const inj = randomInjury(3, 8);
    s.sakatliklar.push(inj);
    k.sakatlik = inj;
    k.step = 'sakatlik';
    return;
  }
  k.step = 'ozet';
}

function withdraw(s: GameState) {
  const opp = s.pending.rakip!;
  s.populerlik = clamp(s.populerlik - 3, 0, 100);
  s.haberler.unshift(L("🚑 {0} sakatlık nedeniyle {1} maçından çekildi.", [fullName(s.fighter), opp.soyad]));
  s.pending = {};
  s.phase = 'hub';
}

/** Plan (ve yoğunluk) seçildi: basın toplantısı varsa ona, yoksa kampa. Kilo son 48 saatte elle verilir. */
function afterPlan(s: GameState) {
  if (hasPress(s)) s.pending.kamp!.step = 'basin';
  else startCampWeeks(s);
}

function weighIn(s: GameState) {
  const k = s.pending.kamp!;
  const org = ORGS[currentOrg(s)];
  const lines: string[] = [L("⚖️ TARTI GÜNÜ")];
  const cut = k.kilo ?? 'normal';
  if (k.kesim) manualCutResult(s, lines, !!org.hidrasyon);
  // Eski kayıtlar: elle kesim başlamadan tartıya gelindiyse hazır yöntemlerle sonuçlanır
  else if (cut === 'kademeli') {
    if (chance(0.97)) lines.push(L("Kilon tam. Taze ve güçlü hissediyorsun."));
    else {
      lines.push(L("Her şeyi doğru yapmana rağmen 200 gram fazlasın! Saunada son bir terleme ile zar zor geçtin."));
      k.mods.kondisyon = (k.mods.kondisyon ?? 0) - 3;
    }
  } else if (cut === 'normal') {
    if (chance(0.88 + cutBonus(s))) lines.push(L("Limitin tam altındasın. Sorun yok."));
    else {
      lines.push(L("❌ Tartıyı 1 kilo kaçırdın! Ücretinin %20’si rakibe gidiyor ve kafese yorgun çıkacaksın."));
      k.ucretCeza = 0.2;
      k.mods.kondisyon = (k.mods.kondisyon ?? 0) - 6;
      s.populerlik = clamp(s.populerlik - 2, 0, 100);
    }
  } else {
    if (org.hidrasyon && chance(0.45)) {
      lines.push(L("❌ HİDRASYON TESTİNDEN KALDIN! ZEN maçı iptal etti. Ücret yok, itibar zedelendi."));
      k.iptal = true;
      s.populerlik = clamp(s.populerlik - 5, 0, 100);
      s.haberler.unshift(L("❌ Hidrasyon testi başarısız: maç iptal edildi."));
    } else if (chance(0.68 + cutBonus(s) * 2)) {
      lines.push(L("Su kesimi işe yaradı: tartıda sınırdasın, rehidrasyon sonrası kafese rakibinden iri çıkacaksın. 💪"));
      k.mods.vurus = (k.mods.vurus ?? 0) + 3;
      k.mods.gures = (k.mods.gures ?? 0) + 3;
      k.mods.kondisyon = (k.mods.kondisyon ?? 0) - 2;
    } else {
      lines.push(L("❌ Vücudun pes etti. 1,5 kilo fazlasın, dudakların çatlamış. Ücretinin %20’si gidiyor ve kondisyonun çöktü."));
      k.ucretCeza = 0.2;
      k.mods.kondisyon = (k.mods.kondisyon ?? 0) - 12;
      k.mods.cene = (k.mods.cene ?? 0) - 4;
      s.populerlik = clamp(s.populerlik - 3, 0, 100);
    }
  }
  if (!k.iptal && untreated(s) && s.stage !== 'amator' && chance(0.6)) {
    const v = prAdjust(s, -4);
    s.populerlik = clamp(s.populerlik + v, 0, 100);
    lines.push(L("🩺 Maç öncesi sağlık kontrolünde {0} tespit edildi! Komisyon maçı iptal etti. (Popülerlik {1})", [s.hastalik!.ad, v]), ...scandal(s));
    s.haberler.unshift(L("🩺 {0}, sağlık kontrolünden geçemedi; maç iptal.", [s.fighter.soyad]));
    k.iptal = true;
  }
  if (!k.iptal && chance(0.05)) {
    lines.push(L("😏 {0} tartıyı kaçırdı! Ücretinin %20’si sana geliyor ve o yorgun çıkacak.", [s.pending.rakip!.soyad]));
    k.rakipCeza = true;
    k.oppMods.kondisyon = (k.oppMods.kondisyon ?? 0) - 8;
  }
  const limit = WEIGHT_CLASSES[s.fighter.siklet].kg;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const kacirdi = k.ucretCeza > 0;
  k.pKilo = r1(k.kesim ? limit + k.kesim.fazla : kacirdi ? limit + (cut === 'sert' ? 1.5 : 1) : cut === 'sert' ? limit - rand() * 0.1 : limit - 0.1 - rand() * 0.5);
  k.oKilo = r1(k.rakipCeza ? limit + 1.2 : limit - rand() * 0.4);
  k.kafesKilo = r1(k.pKilo * (k.kesim ? (k.kesim.suKesildi ? 1.08 : 1.04) : cut === 'sert' ? 1.09 : cut === 'normal' ? 1.05 : 1.03));
  k.tartiMetni = lines.join('\n');
  k.step = 'tarti';
}

/** Kafese giriş şovu: dövüşün başında küçük etkiler. */
export const WALKOUT_STYLES = [
  { key: 'sakin', ad: L("Odaklı yürüyüş"), aciklama: L("Kulaklık, sakin yüz. Kafana odaklanırsın (IQ +1)."), ikon: 'headphones' },
  { key: 'bayrak', ad: L("Bayrakla gir"), aciklama: L("Bayrağın omzunda. Salon coşar (popülerlik +1, kondisyon +1)."), ikon: 'flag-variant' },
  { key: 'dans', ad: L("Şov yap"), aciklama: L("Dans et, kameralara oyna. Takipçi patlar ama rakip sinirlenebilir."), ikon: 'party-popper' },
  { key: 'bakis', ad: L("Rakibi süz"), aciklama: L("Kafeste ona kilitlen. Ya gözünü kaçırır ya da sen gerilirsin."), ikon: 'eye-circle' },
] as const;

function applyWalkout(s: GameState, mods: Partial<Stats>, oppMods: Partial<Stats>) {
  const k = s.pending.kamp!;
  const add = (m: Partial<Stats>, st: StatKey, n: number) => (m[st] = (m[st] ?? 0) + n);
  const g = k.giris ?? 'sakin';
  const o = s.pending.rakip!.soyad;
  addHype(s, g === 'dans' ? 6 : g === 'bayrak' ? 4 : g === 'bakis' ? 3 : 1, L("Kafese giriş"));
  if (s.kriz && !s.kriz.sonuc) addHype(s, 8, L("Gündemdeki kriz"));
  let line: string;
  if (g === 'bayrak') {
    s.populerlik = clamp(s.populerlik + 1, 0, 100);
    add(mods, 'kondisyon', 1);
    line = L("🚩 Bayrağınla kafese yürüdün, salon ayağa kalktı.");
  } else if (g === 'dans') {
    s.populerlik = clamp(s.populerlik + 2, 0, 100);
    const d = addFollowers(s, followers(s) * (0.02 + rand() * 0.02));
    if (chance(0.35)) {
      add(oppMods, 'vurus', 1);
      line = L("💃 Girişin viral oldu ({0} takipçi) ama {1} çok sinirlendi (rakip vuruş +1).", [fmtDelta(d), o]);
    } else line = L("💃 Girişin viral oldu: {0} takipçi.", [fmtDelta(d)]);
  } else if (g === 'bakis') {
    if (chance(0.5 + s.fighter.stats.iq / 400)) {
      add(oppMods, 'iq', -1);
      line = L("👁️ {0} gözünü kaçırdı (rakip IQ -1).", [o]);
    } else {
      add(mods, 'iq', -1);
      line = L("👁️ {0} sana gülümsedi; gerilen sen oldun (IQ -1).", [o]);
    }
  } else {
    add(mods, 'iq', 1);
    line = L("🎧 Kafana odaklanarak yürüdün (IQ +1).");
  }
  s.haberler.unshift(line);
}

function beginFight(s: GameState) {
  const k = s.pending.kamp!;
  const opp = s.pending.rakip!;
  const mods: Partial<Stats> = { ...k.mods };
  k.oppMods = { ...k.oppMods };
  applyWalkout(s, mods, k.oppMods);
  hometownMods(s, opp, mods);
  familyMods(s, mods);
  coachMods(s, mods);
  rivalNewsMods(s, mods, k.oppMods);
  scoutMods(s, k.oppMods);
  perkFightMods(s, mods);
  brainMods(s, mods);
  Object.entries(fightItemMods(s)).forEach(([st, v]) => (mods[st as StatKey] = (mods[st as StatKey] ?? 0) + (v ?? 0)));
  Object.entries(diseaseMods(s)).forEach(([st, v]) => (mods[st as StatKey] = (mods[st as StatKey] ?? 0) + (v ?? 0)));
  if (dopingActive(s)) {
    Object.entries(DOPING_MODS).forEach(([st, v]) => (mods[st as StatKey] = (mods[st as StatKey] ?? 0) + (v ?? 0)));
    s.saglik = Math.max(5, s.saglik - 4);
  }
  s.sakatliklar.forEach((i) => (mods[i.stat] = (mods[i.stat] ?? 0) - i.ceza));
  if (s.saglik < 60) STAT_KEYS.forEach((st) => (mods[st] = (mods[st] ?? 0) - Math.round((60 - s.saglik) / 10)));
  const unvan = opp.champion || s.sampiyon;
  // Veda maçı her organizasyonda gecenin ana maçıdır (5 raunt).
  const anaMac = (currentOrg(s) === 'ufc' && s.rank != null && s.rank <= 5) || isFarewellFight(s);
  s.pending.dovus = startFight({
    pStats: s.fighter.stats,
    pAd: s.fighter.lakap || s.fighter.soyad,
    koseAdi: s.takim.antrenor,
    opp,
    mods: { stats: mods, plan: k.plan ?? 'ayakta', planUyum: !!k.planUyum, oppStats: k.oppMods, kimlik: s.kimlik?.id, cutman: staffCutman(s), teknik: techLevels(s), imza: s.imza ? { id: s.imza.teknik, ad: s.imza.ad } : undefined },
    maxRaunt: unvan || anaMac ? 5 : 3,
    unvanMaci: unvan,
    anaMac,
  });
  buildNight(s);
  s.phase = 'dovus';
}

// ---------- Face to face ----------

export const FACEOFF = [
  { key: 'sakin', ad: L("Soğukkanlı bak"), aciklama: L("Hiç kıpırdama. Gözünü ilk o kaçırsın."), ikon: 'eye' },
  { key: 'alin', ad: L("Alın alına ver"), aciklama: L("Gerilimi tırmandır. Kim geri adım atacak?"), ikon: 'head-alert' },
  { key: 'bagir', ad: L("Gözdağı ver"), aciklama: L("Yüzüne bağır. Ya korkar ya da gülünç duruma düşersin."), ikon: 'bullhorn' },
  { key: 'laf', ad: L("Kulağına fısılda"), aciklama: L("Kafasına gir… ya da senin kafan karışsın."), ikon: 'message-text' },
  { key: 'el', ad: L("Elini uzat"), aciklama: L("Sportmenlik göster. Kabul eder mi?"), ikon: 'handshake' },
] as const;

const TRASHY = [L("Trash talk ustası"), L("Kibirli"), L("Öfkeli"), L("Şovmen")];

/** Rakip bazen ilk hamleyi yapar: seçimin bir tepkiye dönüşür. */
export const RIVAL_MOVES: Record<string, { metin: (o: string) => string; anim: string }> = {
  it: { metin: (o) => L("{0} yaklaşır yaklaşmaz göğsüne iki eliyle itti!", [o]), anim: 'oppush' },
  alin: { metin: (o) => L("{0} alnını senin alnına dayadı, geri çekilmiyor.", [o]), anim: 'forehead' },
  sirit: { metin: (o) => L("{0} sana bakıp alaycı bir şekilde sırıtıyor.", [o]), anim: 'smirk' },
  laf: { metin: (o) => L("{0} eğilip kulağına bir şeyler fısıldadı.", [o]), anim: 'oppwhisper' },
  parmak: { metin: (o) => L("{0} parmağını yüzüne doğru sallayıp bir şeyler bağırıyor.", [o]), anim: 'oppoint' },
  alkis: { metin: (o) => L("{0} alaycı bir şekilde seni alkışlıyor.", [o]), anim: 'oppclap' },
};

function planRivalMove(s: GameState): string | undefined {
  const o = s.pending.rakip!;
  const trashy = TRASHY.includes(o.kisilik);
  if (!chance(trashy ? 0.55 : 0.3)) return undefined;
  return pick(trashy ? ['it', 'alin', 'sirit', 'laf'] : ['alin', 'sirit', 'laf']);
}

type FaceResult = { anim: string; kazanan: 'p' | 'o' | null; baslik: string; metin: string; etkiler: string[] };

function faceOff(s: GameState, key: string) {
  const k = s.pending.kamp!;
  const o = s.pending.rakip!;
  const f = s.fighter;
  const add = (m: Partial<Stats>, st: StatKey, v: number) => (m[st] = (m[st] ?? 0) + v);
  const pop = (d: number) => (s.populerlik = clamp(s.populerlik + d, 0, 100));
  const trashy = TRASHY.includes(o.kisilik);
  const edge = (f.stats.iq - o.stats.iq) / 200 + (s.populerlik - 50) / 500;
  const hamle = k.rakipHamle;
  // Rakip üstüne geldiyse sakin kalmak daha değerli, karşılık vermek daha riskli.
  const bonus = hamle === 'it' || hamle === 'alin' || hamle === 'parmak' ? (key === 'sakin' ? 0.12 : key === 'alin' ? -0.05 : 0) : hamle === 'alkis' ? (key === 'laf' || key === 'bagir' ? 0.08 : 0) : 0;
  const win = (base: number) => chance(clamp(base + edge + bonus, 0.15, 0.85));
  let r: FaceResult;

  if (key === 'sakin') {
    if (win(0.55)) {
      add(k.mods, 'iq', 1);
      r = { anim: 'stare', kazanan: 'p', baslik: L("GÖZÜNÜ O KAÇIRDI"), metin: L("Gözünü kırpmadan baktın. {0} bakışlarını ilk kaçıran oldu.", [o.soyad]), etkiler: [L("Senin IQ +1")] };
    } else {
      add(k.mods, 'iq', -1);
      add(k.oppMods, 'iq', 1);
      r = { anim: 'stareLose', kazanan: 'o', baslik: L("SEN KIRPTIN"), metin: L("{0} sabit baktı, sen istemsizce gözlerini kırptın. Kameralar yakaladı.", [o.soyad]), etkiler: [L("Senin IQ -1"), L("Rakip IQ +1")] };
    }
  } else if (key === 'alin') {
    pop(2);
    if (rand() < 0.3) {
      pop(2);
      o.rivalry = Math.max(o.rivalry, 1) + 1;
      add(k.oppMods, 'vurus', 1);
      add(k.mods, 'vurus', 1);
      r = { anim: 'brawl', kazanan: null, baslik: L("ORTALIK KARIŞTI"), metin: L("Alınlar çarpıştı, {0} itti, sen de ittin! Güvenlik araya girdi, görüntüler viral.", [o.soyad]), etkiler: [L("Popülerlik +4"), L("İki tarafın da vuruşu +1"), L("Rekabet kızıştı")] };
    } else if (win(0.5)) {
      add(k.oppMods, 'iq', -1);
      r = { anim: 'forehead', kazanan: 'p', baslik: L("GERİ ADIM ATTI"), metin: L("Alnını dayadın, bastırdın. {0} bir adım geri çekildi.", [o.soyad]), etkiler: [L("Popülerlik +2"), L("Rakip IQ -1")] };
    } else {
      add(k.mods, 'kondisyon', -2);
      add(k.oppMods, 'iq', 1);
      r = { anim: 'pushed', kazanan: 'o', baslik: L("SENİ GERİ İTTİ"), metin: L("{0} daha sert bastırdı, dengeni kaybedip geri sendeledin. Salon uğulduyor.", [o.soyad]), etkiler: [L("Popülerlik +2"), L("Senin kondisyon -2"), L("Rakip IQ +1")] };
    }
  } else if (key === 'bagir') {
    if (win(trashy ? 0.4 : 0.52)) {
      pop(2);
      add(k.oppMods, 'cene', -1);
      r = { anim: 'yell', kazanan: 'p', baslik: L("İRKİLDİ"), metin: L("Yüzüne öyle bir bağırdın ki {0} irkildi. Tribünler çıldırdı.", [o.soyad]), etkiler: [L("Popülerlik +2"), L("Rakip çene -1")] };
    } else {
      pop(-1);
      add(k.mods, 'iq', -1);
      r = { anim: 'laughed', kazanan: 'o', baslik: L("GÜLÜP GEÇTİ"), metin: L("Bağırdın ama {0} kahkaha attı. Sosyal medyada caps oldun.", [o.soyad]), etkiler: [L("Popülerlik -1"), L("Senin IQ -1")] };
    }
  } else if (key === 'laf') {
    if (win(0.5)) {
      add(k.oppMods, 'iq', -2);
      r = { anim: 'whisper', kazanan: 'p', baslik: L("KAFASINA GİRDİN"), metin: L("Kulağına bir şey fısıldadın. {0} kıpkırmızı oldu.", [o.soyad]), etkiler: [L("Rakip IQ -2")] };
    } else {
      add(k.mods, 'iq', -1);
      r = { anim: 'whisperBack', kazanan: 'o', baslik: L("CEVABI YAPIŞTIRDI"), metin: L("Fısıldadın ama {0} gülüp daha ağır bir cevap verdi. Bu kez kafası karışan sensin.", [o.soyad]), etkiler: [L("Senin IQ -1")] };
    }
  } else if (trashy && chance(0.6)) {
    if (chance(0.5)) {
      pop(2);
      r = { anim: 'refuse', kazanan: 'p', baslik: L("SALON SENİN TARAFINDA"), metin: L("Elini uzattın, {0} elini itip güldü. Salon onu yuhaladı.", [o.soyad]), etkiler: [L("Popülerlik +2")] };
    } else {
      add(k.mods, 'iq', -1);
      r = { anim: 'pulled', kazanan: 'o', baslik: L("TUZAĞA DÜŞTÜN"), metin: L("Elini sıktı, seni kendine çekip kulağına hakaret etti. Sinirlendin."), etkiler: [L("Senin IQ -1")] };
    }
  } else {
    pop(1);
    o.rivalry = Math.max(0, o.rivalry - 1);
    r = { anim: 'handshake', kazanan: null, baslik: L("SAYGI"), metin: L("Tokalaştınız. Saygılı bir an. Kameralar bu kareyi sevdi."), etkiler: [L("Popülerlik +1")] };
  }
  const pre = hamle ? `${RIVAL_MOVES[hamle].metin(o.soyad)} ` : '';
  addHype(s, r.anim === 'brawl' ? 15 : r.kazanan === 'p' ? 6 : r.kazanan === 'o' ? 3 : 1, L("Face to face"));
  const ilk = k.yuzyuzeIlk;
  // İlk tur: kavga ya da tokalaşma olmadıysa rakip çoğu zaman karşılık verir, ikinci tur gelir
  if (!ilk && r.anim !== 'brawl' && r.anim !== 'handshake' && chance(0.75)) {
    k.yuzyuzeIlk = { metin: `${pre}${r.metin}`, baslik: r.baslik, kazanan: r.kazanan, etkiler: r.etkiler, anim: r.anim };
    k.rakipHamle = r.kazanan === 'p' ? pick(['it', 'parmak', 'laf']) : pick(['sirit', 'alkis']);
    return;
  }
  // Sonuç iki turun toplamı: biri kazandı biri kaybettiyse kimse geri adım atmamış sayılır
  const puan = (x: 'p' | 'o' | null) => (x === 'p' ? 1 : x === 'o' ? -1 : 0);
  const top = puan(r.kazanan) + (ilk ? puan(ilk.kazanan) : 0);
  const kazanan = ilk ? (top > 0 ? 'p' : top < 0 ? 'o' : null) : r.kazanan;
  k.yuzyuze = ilk ? `${ilk.metin} ${pre}${r.metin}` : `${pre}${r.metin}`;
  k.yuzyuzeSonuc = { anim: r.anim, kazanan, baslik: r.baslik, etkiler: [...(ilk?.etkiler ?? []), ...r.etkiler] };
}
