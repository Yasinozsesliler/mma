import { addStat, advanceWeeks, currentOrg, growthMultiplier, fullName } from './character';
import { ORGS, WEIGHT_CLASSES } from './data';
import { PLANS, startFight } from './fight';
import { weakest } from './opponents';
import { siteById, CAMP_SITES, type CampSite } from './gyms';
import { campPoints } from './progression';
import { socialCampStart, socialTick } from './social';
import { dopingActive, DOPING_MODS } from './doping';
import { prAdjust, staffCampHealth, staffCampPoints, staffCutman, staffFreeCut, staffGrowth } from './staff';
import { petRunner } from './pets';
import { diseaseMods, untreated } from './nightlifeCore';
import { scandal } from './sponsors';
import { campMotivation, cutBonus, fightItemMods, injuryMultiplier, owns, restMultiplier } from './shop';
import { chance, clamp, pick, rand, randInt } from './rng';
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
  dusuk: { ad: 'Düşük', aciklama: 'Vücudunu dinle. Az gelişim, neredeyse sıfır risk, iyi toparlanma.', carpan: 0.6, risk: 0.03, saglik: 20 },
  orta: { ad: 'Orta', aciklama: 'Dengeli kamp. Makul gelişim, düşük risk.', carpan: 1, risk: 0.08, saglik: 12 },
  yuksek: { ad: 'Yüksek', aciklama: 'Günde iki idman, sert sparring. Hızlı gelişim ama sakatlık riski ciddi.', carpan: 1.55, risk: 0.2, saglik: 3 },
};

export const WEIGHT_CUTS: Record<WeightCut, { ad: string; aciklama: string }> = {
  kademeli: { ad: 'Kademeli ve disiplinli', aciklama: 'Diyetisyenle haftalara yayılmış kilo verme. Neredeyse garanti ama masraflı.' },
  normal: { ad: 'Normal', aciklama: 'Standart diyet ve son gün hafif su kesimi. Küçük bir risk var.' },
  sert: { ad: 'Son hafta sert su kesimi', aciklama: 'Kafeste rakipten iri olursun, ama tartıyı kaçırma ve kurumuş çıkma riski yüksek.' },
};

export const PRESS: Record<PressChoice, { ad: string; aciklama: string }> = {
  saygili: { ad: 'Saygılı ol', aciklama: 'Profesyonel görün. Az ama güvenli popülerlik.' },
  trash: { ad: 'Trash talk yap', aciklama: 'Ortalığı ateşle. Popülerlik patlayabilir… ya da ters teper. Rakibi de gaza getirir.' },
  sessiz: { ad: 'Kısa kes', aciklama: 'Konuşmayı kafese bırak. Etkisi yok.' },
};

const INJURIES: Omit<Injury, 'hafta'>[] = [
  { ad: 'Kaburga çatlağı', stat: 'kondisyon', ceza: 8 },
  { ad: 'Burkulmuş ayak bileği', stat: 'hiz', ceza: 8 },
  { ad: 'Elde kemik çatlağı', stat: 'vurus', ceza: 10 },
  { ad: 'Diz bağı zorlanması', stat: 'gures', ceza: 10 },
  { ad: 'Omuz zorlanması', stat: 'yer', ceza: 8 },
  { ad: 'Sparringde beyin sarsıntısı', stat: 'cene', ceza: 10 },
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

export function startCamp(s: GameState) {
  const kisa = s.kisaHaber;
  s.kisaHaber = false;
  const hafta = kisa ? 3 : s.stage === 'amator' ? 6 : s.pending.rakip?.champion || s.sampiyon ? 10 : 8;
  s.pending.kamp = {
    step: kisa ? 'plan' : 'yer',
    yer: kisa ? 'salon' : undefined,
    hafta,
    kisaHaber: kisa,
    ozet: [],
    mods: {},
    oppMods: {},
    ucretCeza: 0,
    rakipCeza: false,
    iptal: false,
  };
  s.phase = 'kamp';
  socialCampStart(s);
  socialTick(s, hafta);
}

const hasPress = (s: GameState) => s.stage !== 'amator';

/** Kampın bir adımında seçim yapar. value: adımın beklediği anahtar ya da seçenek indeksi. */
export function campChoose(s: GameState, value: string | number) {
  const k = s.pending.kamp!;
  switch (k.step) {
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
      k.step = k.kisaHaber ? 'kilo' : 'intensity';
      return;
    case 'intensity':
      k.intensity = value as Intensity;
      k.step = 'kilo';
      return;
    case 'kilo':
      k.kilo = value as WeightCut;
      if (hasPress(s)) k.step = 'basin';
      else runCamp(s);
      return;
    case 'basin':
      k.basin = value as PressChoice;
      runCamp(s);
      return;
    case 'sakatlik':
      if (value === 0) {
        k.ozet.push(`Sakatlığa rağmen dövüşmeye karar verdin. ${STAT_LABELS[k.sakatlik!.stat]} kafeste zayıf olacak.`);
        k.step = 'ozet';
      } else {
        withdraw(s);
      }
      return;
    case 'ozet':
      weighIn(s);
      return;
    case 'tarti':
      if (k.iptal) {
        s.pending = {};
        s.phase = 'hub';
      } else {
        k.step = 'yuzyuze';
      }
      return;
    case 'yuzyuze':
      if (!k.yuzyuze) faceOff(s, String(value));
      else beginFight(s);
      return;
  }
}

function runCamp(s: GameState) {
  const k = s.pending.kamp!;
  const f = s.fighter;
  const opp = s.pending.rakip!;
  const intensity = INTENSITY[k.intensity ?? 'orta'];
  const site = siteById(k.yer ?? 'salon');
  const coachQ = site.salonUcreti ? s.takim.antrenorKalite : (site.kalite ?? 5);
  const notes = advanceWeeks(s, k.hafta);
  k.ozet.push(`📍 Kamp yeri: ${site.ad}${site.salonUcreti ? ` (${s.takim.antrenor})` : ''}`);

  // Gelişim
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
      (1 + (s.motivasyon + campMotivation(s)) * 0.1);
    // Kamp odak alanı en kötü +2 gelişir; iyi koşullarda +5'e kadar.
    const d = addStat(f.stats, k.focus, clamp(Math.round(g), 2, 5), 2);
    k.ozet.push(`📈 ${STAT_LABELS[k.focus]} +${d} (${f.stats[k.focus]})`);
    if (k.focus === site.bonusStat) k.ozet.push(`🔥 ${site.ad} tam bu alanda uzman: gelişim arttı.`);
    else if (site.salonUcreti && k.focus === s.takim.uzmanlik) k.ozet.push(`🔥 ${s.takim.antrenor} bu alanın ustası: gelişim arttı.`);
  }
  s.motivasyon += campMotivation(s);
  const puan = clamp(campPoints(s, k.intensity ?? 'orta', !!k.kisaHaber) + site.puan + staffCampPoints(s), k.kisaHaber ? 1 : 2, 3);
  s.puan += puan;
  k.ozet.push(`⭐ +${puan} gelişim puanı (toplam ${s.puan}). Tartıdan önce harcayabilirsin.`);
  s.motivasyon = 0;
  s.saglik = clamp(s.saglik + (k.kisaHaber ? 0 : Math.round(intensity.saglik * restMultiplier(s)) + staffCampHealth(s)), 0, 100);

  // Masraf
  let cost = campQuote(s, site.id, k.hafta).toplam;
  if (k.kilo === 'kademeli') cost += cutCost(s);
  if (cost > 0) {
    s.para -= cost;
    k.ozet.push(`💸 Kamp masrafı: $${cost.toLocaleString('tr-TR')}`);
  }

  // Plan uyumu
  const weak = weakest(opp);
  const planUyum = !!k.plan && PLANS[k.plan].hedef.includes(weak);
  if (k.plan)
    k.ozet.push(
      planUyum
        ? `🎯 Oyun planın rakibin zaafına (${STAT_LABELS[weak]}) tam oturuyor. Kafeste bunun karşılığını alacaksın.`
        : `🎯 Oyun planı: ${PLANS[k.plan].ad}.`,
    );
  k.planUyum = planUyum;

  // Basın toplantısı
  if (k.basin === 'trash') {
    s.trashTalk = true;
    opp.rivalry = Math.max(opp.rivalry, 1);
    k.oppMods = { vurus: 2, kondisyon: 2 };
    if (chance(0.45 + f.stats.iq / 250 + s.populerlik / 300)) {
      s.populerlik = clamp(s.populerlik + 6, 0, 100);
      k.ozet.push(`🎤 Trash talk tuttu! Video milyonlarca izlendi. Popülerlik +6. ${opp.soyad} ise seni öldürmeye geliyor.`);
    } else {
      s.populerlik = clamp(s.populerlik - 2, 0, 100);
      k.ozet.push(`🎤 Sözlerin ters tepti, sosyal medyada alay konusu oldun. Popülerlik -2. ${opp.soyad} gaza geldi.`);
    }
  } else if (k.basin === 'saygili') {
    s.trashTalk = false;
    s.populerlik = clamp(s.populerlik + 1, 0, 100);
    k.ozet.push('🎤 Basın toplantısında saygılı ve kendinden emindin. Popülerlik +1.');
  } else if (k.basin === 'sessiz') {
    s.trashTalk = false;
    k.ozet.push('🎤 Az konuştun. "Kafeste görüşürüz."');
  }

  k.ozet.push(...notes);

  // Sakatlık zarı
  const risk = intensity.risk * (1.3 - s.saglik / 200) * (k.kisaHaber ? 0.5 : 1) * injuryMultiplier(s) * site.risk;
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
  s.haberler.unshift(`🚑 ${fullName(s.fighter)} sakatlık nedeniyle ${opp.soyad} maçından çekildi.`);
  s.pending = {};
  s.phase = 'hub';
}

function weighIn(s: GameState) {
  const k = s.pending.kamp!;
  const org = ORGS[currentOrg(s)];
  const lines: string[] = ['⚖️ TARTI GÜNÜ'];
  const cut = k.kilo ?? 'normal';
  if (cut === 'kademeli') {
    if (chance(0.97)) lines.push('Kilon tam. Taze ve güçlü hissediyorsun.');
    else {
      lines.push('Her şeyi doğru yapmana rağmen 200 gram fazlasın! Saunada son bir terleme ile zar zor geçtin.');
      k.mods.kondisyon = (k.mods.kondisyon ?? 0) - 3;
    }
  } else if (cut === 'normal') {
    if (chance(0.88 + cutBonus(s))) lines.push('Limitin tam altındasın. Sorun yok.');
    else {
      lines.push('❌ Tartıyı 1 kilo kaçırdın! Ücretinin %20’si rakibe gidiyor ve kafese yorgun çıkacaksın.');
      k.ucretCeza = 0.2;
      k.mods.kondisyon = (k.mods.kondisyon ?? 0) - 6;
      s.populerlik = clamp(s.populerlik - 2, 0, 100);
    }
  } else {
    if (org.hidrasyon && chance(0.45)) {
      lines.push('❌ HİDRASYON TESTİNDEN KALDIN! ONE maçı iptal etti. Ücret yok, itibar zedelendi.');
      k.iptal = true;
      s.populerlik = clamp(s.populerlik - 5, 0, 100);
      s.haberler.unshift('❌ Hidrasyon testi başarısız: maç iptal edildi.');
    } else if (chance(0.68 + cutBonus(s) * 2)) {
      lines.push('Su kesimi işe yaradı: tartıda sınırdasın, rehidrasyon sonrası kafese rakibinden iri çıkacaksın. 💪');
      k.mods.vurus = (k.mods.vurus ?? 0) + 3;
      k.mods.gures = (k.mods.gures ?? 0) + 3;
      k.mods.kondisyon = (k.mods.kondisyon ?? 0) - 2;
    } else {
      lines.push('❌ Vücudun pes etti. 1,5 kilo fazlasın, dudakların çatlamış. Ücretinin %20’si gidiyor ve kondisyonun çöktü.');
      k.ucretCeza = 0.2;
      k.mods.kondisyon = (k.mods.kondisyon ?? 0) - 12;
      k.mods.cene = (k.mods.cene ?? 0) - 4;
      s.populerlik = clamp(s.populerlik - 3, 0, 100);
    }
  }
  if (!k.iptal && untreated(s) && s.stage !== 'amator' && chance(0.6)) {
    const v = prAdjust(s, -4);
    s.populerlik = clamp(s.populerlik + v, 0, 100);
    lines.push(`🩺 Maç öncesi sağlık kontrolünde ${s.hastalik!.ad} tespit edildi! Komisyon maçı iptal etti. (Popülerlik ${v})`, ...scandal(s));
    s.haberler.unshift(`🩺 ${s.fighter.soyad}, sağlık kontrolünden geçemedi; maç iptal.`);
    k.iptal = true;
  }
  if (!k.iptal && chance(0.05)) {
    lines.push(`😏 ${s.pending.rakip!.soyad} tartıyı kaçırdı! Ücretinin %20’si sana geliyor ve o yorgun çıkacak.`);
    k.rakipCeza = true;
    k.oppMods.kondisyon = (k.oppMods.kondisyon ?? 0) - 8;
  }
  const limit = WEIGHT_CLASSES[s.fighter.siklet].kg;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const kacirdi = k.ucretCeza > 0;
  k.pKilo = r1(kacirdi ? limit + (cut === 'sert' ? 1.5 : 1) : cut === 'sert' ? limit - rand() * 0.1 : limit - 0.1 - rand() * 0.5);
  k.oKilo = r1(k.rakipCeza ? limit + 1.2 : limit - rand() * 0.4);
  k.kafesKilo = r1(k.pKilo * (cut === 'sert' ? 1.09 : cut === 'normal' ? 1.05 : 1.03));
  k.tartiMetni = lines.join('\n');
  k.step = 'tarti';
}

function beginFight(s: GameState) {
  const k = s.pending.kamp!;
  const opp = s.pending.rakip!;
  const mods: Partial<Stats> = { ...k.mods };
  Object.entries(fightItemMods(s)).forEach(([st, v]) => (mods[st as StatKey] = (mods[st as StatKey] ?? 0) + (v ?? 0)));
  Object.entries(diseaseMods(s)).forEach(([st, v]) => (mods[st as StatKey] = (mods[st as StatKey] ?? 0) + (v ?? 0)));
  if (dopingActive(s)) {
    Object.entries(DOPING_MODS).forEach(([st, v]) => (mods[st as StatKey] = (mods[st as StatKey] ?? 0) + (v ?? 0)));
    s.saglik = Math.max(5, s.saglik - 4);
  }
  s.sakatliklar.forEach((i) => (mods[i.stat] = (mods[i.stat] ?? 0) - i.ceza));
  if (s.saglik < 60) STAT_KEYS.forEach((st) => (mods[st] = (mods[st] ?? 0) - Math.round((60 - s.saglik) / 10)));
  const unvan = opp.champion || s.sampiyon;
  const anaMac = currentOrg(s) === 'ufc' && s.rank != null && s.rank <= 5;
  s.pending.dovus = startFight({
    pStats: s.fighter.stats,
    pAd: s.fighter.lakap || s.fighter.soyad,
    koseAdi: s.takim.antrenor,
    opp,
    mods: { stats: mods, plan: k.plan ?? 'ayakta', planUyum: !!k.planUyum, oppStats: k.oppMods, cutman: staffCutman(s) },
    maxRaunt: unvan || anaMac ? 5 : 3,
    unvanMaci: unvan,
    anaMac,
  });
  s.phase = 'dovus';
}

// ---------- Face to face ----------

export const FACEOFF = [
  { key: 'sakin', ad: 'Soğukkanlı bak', aciklama: 'Hiç kıpırdama. Zihnin net kalır.' },
  { key: 'alin', ad: 'Alın alına ver', aciklama: 'Gerilimi tırmandır. Popülerlik getirir, ortalık karışabilir.' },
  { key: 'el', ad: 'Elini uzat', aciklama: 'Sportmenlik göster.' },
  { key: 'laf', ad: 'Kulağına fısılda', aciklama: 'Kafasına gir… ya da senin kafan karışsın.' },
] as const;

const TRASHY = ['Trash talk ustası', 'Kibirli', 'Öfkeli', 'Şovmen'];

function faceOff(s: GameState, key: string) {
  const k = s.pending.kamp!;
  const o = s.pending.rakip!;
  const add = (m: Partial<Stats>, st: StatKey, v: number) => (m[st] = (m[st] ?? 0) + v);
  const pop = (d: number) => (s.populerlik = clamp(s.populerlik + d, 0, 100));
  if (key === 'sakin') {
    add(k.mods, 'iq', 1);
    k.yuzyuze = `Gözünü kırpmadan baktın. ${o.soyad} bakışlarını kaçırdı. Zihnin berrak. (Dövüşte IQ +1)`;
  } else if (key === 'alin') {
    pop(2);
    if (chance(0.35)) {
      pop(2);
      o.rivalry = Math.max(o.rivalry, 1) + 1;
      add(k.oppMods, 'vurus', 1);
      k.yuzyuze = `Alın alına geldiniz… ve ${o.soyad} seni itti! Güvenlik araya girdi, görüntüler viral. Rekabet kızıştı, rakip öfkeli. (Popülerlik +4)`;
    } else {
      add(k.oppMods, 'iq', -1);
      k.yuzyuze = `Alnını dayadın, ${o.soyad} geri adım attı. Psikolojik üstünlük sende. (Popülerlik +2, rakibin IQ -1)`;
    }
  } else if (key === 'el') {
    if (TRASHY.includes(o.kisilik) && chance(0.6)) {
      pop(1);
      k.yuzyuze = `Elini uzattın, ${o.soyad} elini itip güldü. Salon yuhaladı, taraftarlar senin tarafında. (Popülerlik +1)`;
    } else {
      pop(1);
      o.rivalry = Math.max(0, o.rivalry - 1);
      k.yuzyuze = `Tokalaştınız. Saygılı bir an. Kameralar bu kareyi sevdi. (Popülerlik +1)`;
    }
  } else {
    if (chance(0.5 + (s.fighter.stats.iq - o.stats.iq) / 200)) {
      add(k.oppMods, 'iq', -2);
      k.yuzyuze = `Kulağına bir şey fısıldadın. ${o.soyad}’ın yüzü kıpkırmızı oldu, sinirlendi. (Rakibin IQ -2)`;
    } else {
      add(k.mods, 'iq', -1);
      k.yuzyuze = `Fısıldadın ama ${o.soyad} gülüp cevap verdi. Bu kez aklını karıştıran o oldu. (IQ -1)`;
    }
  }
}
