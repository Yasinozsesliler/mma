import { L as tL, LOC } from '../i18n';
import { addStat, advanceWeeks, currentOrg, fullName, statAverage } from './character';
import { campCost, randomInjury, startCamp } from './camp';
import { ORGS, WEIGHT_CLASSES, WEIGHT_MODS } from './data';
import { methodLabel } from './fight';
import { maybeEvent } from './events';
import { ensureDivision, syncDivision } from './division';
import { imposedOpponent, opponentChoices } from './matchmaking';
import { applyInterview, buildInterview, interviewTargets, type InterviewCtx } from './interview';
import { activeBelts, champLabel, checkAchievements, defendBelt, loseBelt, vacateOrg, winBelt } from './legacy';
import { fightPoints } from './progression';
import { istat } from './istat';
import { leadWeeks } from './calendar';
import { updateP4P } from './p4p';
import { addFollowers, fightFollowers, fmtDelta, fmtFollowers, followers } from './fame';
import { addTechXp, techById } from './techniques';
import { banLabel, banned, banWeeksLeft, dopingFallout, dopingTest } from './doping';
import { paySponsors, refreshSponsorOffers } from './sponsors';
import { prAdjust } from './staff';
import { OWNER_EVENTS, ownerReaction, ownerRel } from './owners';
import { socialAfterFight, socialTick } from './social';
import { merchIncome, restMultiplier } from './shop';
import { chance, clamp, pick, rand, randInt, uid } from './rng';
import type { GameState, Offer, Opponent, OrgId, StatKey, WeightClass } from './types';

export const STAGE_LABELS = {
  amator: tL("Aşama 1 · Amatör"),
  bolgesel: tL("Aşama 2 · Bölgesel"),
  buyuk: tL("Aşama 3 · Büyük Organizasyon"),
  ufc: tL("Aşama 5 · UCC"),
};

const money = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;
export { money };

export function rankLabel(s: GameState) {
  const org = currentOrg(s);
  if (s.sampiyon) return tL("🏆 {0} ŞAMPİYONU", [ORGS[org].kisa]);
  if (org === 'amator') return tL("Amatör ({0}-{1}-{2})", [s.amator.g, s.amator.m, s.amator.b]);
  if (s.rank == null) return tL("Sıralamasız");
  return `#${s.rank} ${WEIGHT_CLASSES[s.fighter.siklet].ad}`;
}

// ---------- Rakip seçimi ----------

export function findNextFight(s: GameState) {
  if (banned(s)) {
    s.haberler.unshift(tL("🚫 Men cezan sürüyor: {0} hafta kaldı.", [banWeeksLeft(s)]));
    return;
  }
  const org = ORGS[currentOrg(s)];
  if (org.rakipSecimi && !s.kisaHaber) {
    s.pending.secenekler = opponentChoices(s);
    s.pending.dayatma = false;
  } else {
    const o = imposedOpponent(s);
    if (s.kisaHaber) {
      o.etiket = tL("⏱️ KISA HABER");
      o.riskMetni = tL("Kamp süresi yok denecek kadar kısa, rakip hazır. Kazanırsan adını herkes öğrenir.");
    }
    s.pending.secenekler = [o];
    s.pending.dayatma = true;
  }
  s.pending.secenekler.forEach((o) => (o.macHafta = leadWeeks(s, o, s.kisaHaber)));
  s.phase = 'rakipSecimi';
}

export function pickOpponent(s: GameState, idx: number) {
  s.pending.rakip = s.pending.secenekler![idx];
  s.pending.secenekler = undefined;
  s.reddedilen = 0;
  startCamp(s);
}

export function rejectImposed(s: GameState) {
  s.reddedilen++;
  s.populerlik = clamp(s.populerlik - 3, 0, 100);
  advanceWeeks(s, 3);
  if (s.reddedilen >= 3) {
    s.haberler.unshift(tL("📉 {0}, üç teklifi reddeden {1} ile yollarını ayırdı.", [ORGS[currentOrg(s)].kisa, fullName(s.fighter)]));
    s.reddedilen = 0;
    s.contract = null;
    s.pending = {};
    openOffers(s, 'serbest', tL("Organizasyon, teklifleri reddettiğin için kontratını feshetti. Artık serbest oyuncusun."));
    return;
  }
  s.haberler.unshift(tL("Organizasyonun teklifini reddettin. Matchmaker memnun değil. (Popülerlik -3)"));
  findNextFight(s);
}

// ---------- Dinlenme ----------

export const REST_WEEKS = [1, 2, 4, 8] as const;
const REST_BASE: Record<number, number> = { 1: 8, 2: 15, 4: 28, 8: 50 };

/** Dinlenmeden önce oyuncuya gösterilen önizleme. */
export function restPreview(s: GameState, weeks: number) {
  const gain = Math.round(REST_BASE[weeks] * restMultiplier(s));
  const maliyet = weeks * { amator: 0, bolgesel: 100, buyuk: 300, ufc: 500 }[s.stage];
  return {
    gain,
    yeniSaglik: clamp(s.saglik + gain, 0, 100),
    maliyet,
    iyilesen: s.sakatliklar.filter((i) => i.hafta <= weeks).map((i) => i.ad),
    kalan: s.sakatliklar.filter((i) => i.hafta > weeks).map((i) => tL("{0} ({1} hf daha)", [i.ad, i.hafta - weeks])),
  };
}

export function rest(s: GameState, weeks = 4) {
  const p = restPreview(s, weeks);
  const notes = advanceWeeks(s, weeks);
  socialTick(s, weeks);
  s.para -= p.maliyet;
  s.saglik = p.yeniSaglik;
  s.haberler.unshift(
    tL("🛌 {0} hafta dinlendin. Sağlık {1}/100.{2} {3}", [weeks, s.saglik, p.maliyet ? tL(" Yaşam masrafı {0}.", [money(p.maliyet)]) : '', notes.join(' ')]).trim(),
  );
}

// ---------- Dövüş sonrası ----------

export function finishFight(s: GameState) {
  const fs = s.pending.dovus!;
  const r = fs.sonuc!;
  const opp = s.pending.rakip!;
  const kamp = s.pending.kamp!;
  const org = currentOrg(s);
  const orgInfo = ORGS[org];
  const won = r.kazanan === 'p';
  const draw = r.kazanan === 'berabere';
  const finishMethod = r.yontem === 'KO' || r.yontem === 'TKO' || r.yontem === 'SUB';
  const lines: string[] = [];
  const pro = org !== 'amator';

  lines.push(
    draw
      ? tL("⚖️ BERABERE: {0} vs {1}", [fs.pAd, opp.soyad])
      : won
        ? tL("🏆 GALİBİYET: {0} · {1}. raunt {2}", [methodLabel(r.yontem), r.raunt, r.sure])
        : tL("❌ MAĞLUBİYET: {0} · {1}. raunt {2}", [methodLabel(r.yontem), r.raunt, r.sure]),
  );

  // Rekor ve geçmiş
  // Doping testi: yakalanırsan galibiyet geçersiz (No Contest), ücret kesilir, men cezası.
  const banWeeks = dopingTest(s);
  const caught = banWeeks != null;
  if (caught && won) lines.push(tL("🚫 Galibiyet geçersiz sayıldı: NO CONTEST."));
  // Amatör ve profesyonel karneler ayrı tutulur; profesyonel kariyer 0-0 başlar.
  const karne = pro ? s.rekor : s.amator;
  if (caught && won) {
    // No Contest: karneye işlenmez
  } else if (won) {
    karne.g++;
    if (r.yontem === 'KO' || r.yontem === 'TKO') karne.ko++;
    else if (r.yontem === 'SUB') karne.sub++;
    else karne.karar++;
  } else if (draw) karne.b++;
  else karne.m++;
  s.gecmis.unshift({
    rakip: `${opp.ad} ${opp.soyad}`,
    rakipId: opp.id,
    org,
    sonuc: won ? 'G' : draw ? 'B' : 'M',
    yontem: methodLabel(r.yontem),
    raunt: r.raunt,
    yas: s.fighter.yas,
  });
  // Bitiren hareket ustalık kazanır (maçı hangi teknikle bitirdiysen).
  let teknikNot: string | undefined;
  if (won && !caught && finishMethod && r.teknik) {
    teknikNot = addTechXp(s, r.teknik, 2);
    lines.push(tL("🎯 Bitiren hareket: {0} · {1}", [techById(r.teknik)?.ad, teknikNot]));
  }
  const oldSeri = s.seri;
  s.seri = won ? Math.max(1, s.seri + 1) : draw ? 0 : Math.min(-1, s.seri - 1);

  // Para
  let kazanc = 0;
  if (pro && s.contract) {
    let purse = s.contract.ucret + (won && !caught ? s.contract.bonus : 0);
    if (caught) {
      purse *= 0.7;
      lines.push(tL("🚫 Doping cezası: ücretin %30’u kesildi."));
    }
    if (kamp.ucretCeza) {
      purse *= 1 - kamp.ucretCeza;
      lines.push(tL("⚖️ Kilo cezası: ücretinin %{0}’si rakibe gitti.", [kamp.ucretCeza * 100]));
    }
    if (kamp.rakipCeza) purse += s.contract.ucret * 0.2;
    kazanc += purse;
    lines.push(tL("💵 Ücret: {0}{1}", [money(purse), won && s.contract.bonus ? tL(" (galibiyet bonusu dahil)") : '']));
  } else if (won) {
    kazanc += 200;
    lines.push(tL("💵 Yerel bir kasap dükkânı sana $200 ödül verdi. Başlangıç böyle olur."));
  }
  const bonus = orgInfo.performansBonusu;
  let bonusSay = 0;
  if (bonus && won && finishMethod && chance(r.raunt === 1 ? 0.5 : 0.35)) {
    kazanc += bonus;
    bonusSay++;
    lines.push(tL("⭐ GECENİN PERFORMANSI! +{0}", [money(bonus)]));
  }
  if (bonus && fs.pHasar > 30 && fs.oHasar > 30 && (r.raunt >= 3 || !finishMethod) && chance(0.5)) {
    kazanc += bonus;
    bonusSay++;
    lines.push(tL("🔥 GECENİN DÖVÜŞÜ! Seyirci ayakta alkışladı. +{0}", [money(bonus)]));
  }
  const sp = paySponsors(s, won && !caught, finishMethod);
  kazanc += sp.toplam;
  lines.push(...sp.satirlar);
  if (kazanc > 0 && s.takim.menajer) {
    const pay = kazanc * s.takim.menajerPay;
    kazanc -= pay;
    lines.push(tL("🤝 Menajer payı ({0}): -{1}", [s.takim.menajer, money(pay)]));
  }
  const sponsor = Math.round(s.populerlik * s.populerlik * { amator: 0, bolgesel: 0.6, buyuk: 2.5, ufc: 12 }[s.stage]);
  if (sponsor > 0) {
    kazanc += sponsor;
    lines.push(tL("🤝 Sponsor gelirleri{0}: +{1}", [s.stage === 'ufc' ? tL(" (UCC vitrini)") : '', money(sponsor)]));
  }
  const merch = pro ? Math.round(merchIncome(s)) : 0;
  if (merch > 0) {
    kazanc += merch;
    lines.push(tL("👕 Merch ve işletme gelirleri: +{0}", [money(merch)]));
  }
  s.para += kazanc;

  // Popülerlik
  const exposure = { amator: 0.6, bolgesel: 1, buyuk: 1.3, ufc: 1.6 }[s.stage];
  let pop = draw ? 1 : won ? 3 + (finishMethod ? 3 : 0) + (opp.zorluk === 1 ? 2 : 0) : -3 - (s.trashTalk ? 3 : 0);
  pop += bonusSay * 2;
  if (won && opp.champion) pop += 10;
  if (won && opp.rivalry >= 2) pop += 3;
  pop += (fs.sov ?? 0) * (won ? 2 : -1);
  pop = prAdjust(s, Math.round(pop * exposure));
  s.populerlik = clamp(s.populerlik + pop, 0, 100);
  lines.push(tL("🔥 Popülerlik {0}{1} → {2}/100", [pop >= 0 ? '+' : '', pop, s.populerlik]));
  const tDelta = caught
    ? addFollowers(s, -followers(s) * 0.08)
    : fightFollowers(s, { won, draw, finish: finishMethod, bonus: bonusSay, title: won && opp.champion, koLoss: !won && !draw && (r.yontem === 'KO' || r.yontem === 'TKO'), trash: s.trashTalk });
  lines.push(tL("📲 Takipçi {0} → {1}", [fmtDelta(tDelta), fmtFollowers(followers(s))]));
  if (!won && s.trashTalk) lines.push(tL("Trash talk yaptıktan sonra kaybetmek… sosyal medya acımasız."));
  const trashOnce = s.trashTalk;
  s.trashTalk = false;

  // Sağlık ve sakatlık
  const hasar = Math.round(fs.pHasar * 0.35 + (!won && (r.yontem === 'KO' || r.yontem === 'TKO') ? 15 : 0));
  s.saglik = clamp(s.saglik - hasar, 5, 100);
  lines.push(hasar ? tL("🩹 Sağlık -{0} → {1}/100", [hasar, s.saglik]) : tL("🩹 Temiz çıktın, sağlık {0}/100", [s.saglik]));
  if (r.sakatlik) {
    const inj = { ad: tL("Kol bağları koptu"), stat: 'yer' as const, ceza: 12, hafta: 12 };
    s.sakatliklar.push(inj);
    lines.push(tL("🦴 {0}: {1} hafta sürecek. Tap atmamanın bedeli.", [inj.ad, inj.hafta]));
  } else if (chance(fs.pHasar / 260)) {
    const inj = randomInjury(3, 7);
    s.sakatliklar.push(inj);
    lines.push(tL("🩹 Dövüşten {0} ile çıktın ({1} hafta).", [inj.ad, inj.hafta]));
  }
  if (!won && r.yontem === 'KO') {
    addStat(s.fighter.stats, 'cene', -1);
    lines.push(tL("Nakavt olmak çenende iz bıraktı. Çene -1."));
  }

  // Tecrübe
  const iq = addStat(s.fighter.stats, 'iq', 1);
  if (iq) lines.push(tL("🧠 Kafes tecrübesi: IQ +{0}", [iq]));
  const puan = fightPoints({ won, draw, finish: finishMethod, bonus: bonusSay, title: won && opp.champion });
  s.puan += puan;
  lines.push(tL("⭐ +{0} gelişim puanı (toplam {1})", [puan, s.puan]));

  // Sıralama
  const wasChampion = s.sampiyon;
  const rankNote = caught ? null : updateRank(s, opp, won, draw);
  if (rankNote) lines.push(rankNote);
  const divNotes = syncDivision(s, opp, won, draw, won && opp.champion, wasChampion && !won && !draw);
  if (org === 'ufc') {
    const p4pNote = updateP4P(s);
    if (p4pNote) {
      lines.push(p4pNote);
      s.haberler.unshift(p4pNote);
    }
  }
  divNotes.forEach((n) => s.haberler.unshift(n));
  socialAfterFight(s, opp, won, draw, methodLabel(r.yontem), divNotes);
  if (s.seri >= 3) lines.push(tL("🔥 {0} maçlık galibiyet serisi!", [s.seri]));
  if (s.seri <= -2 && oldSeri <= -1) lines.push(tL("📉 {0} maçlık mağlubiyet serisi. Baskı artıyor.", [-s.seri]));

  // Kontrat
  if (s.contract) {
    s.contract.kalan--;
    lines.push(tL("📜 Kontratta {0} dövüş kaldı.", [s.contract.kalan]));
  }

  updateRival(s, opp, won, draw, r.yontem === 'SD' || finishMethod);
  if (!caught) {
    const st = istat(s);
    if (pro && !st.sikletler.includes(s.fighter.siklet)) st.sikletler.push(s.fighter.siklet);
    if (pro && (opp.champion || wasChampion)) st.unvanMaci++;
    if (pro && won) {
      st.enIyiSeri = Math.max(st.enIyiSeri, s.seri);
      if (s.rekor.m === 0) st.yenilmezZirve = Math.max(st.yenilmezZirve ?? 0, s.rekor.g);
      st.bonus += bonusSay;
      if (finishMethod && r.raunt === 1) st.r1++;
      if (finishMethod && r.raunt === fs.maxRaunt) st.sonNefes++;
      if (!finishMethod && fs.maxRaunt === 5) st.maraton++;
      if (fs.pHasar < 8) st.temiz++;
      if (fs.pKnockdown > 0) st.kdKalk++;
      if (opp.zorluk === 1) st.surpriz++;
      if (opp.champion) st.sampiyonYen++;
      if (opp.sonSonuc === 'M') st.rovans = (st.rovans ?? 0) + 1;
      if (fs.rauntFarklari.length > 1 && fs.rauntFarklari.slice(0, -1).filter((d) => d < 0).length >= Math.ceil((fs.rauntFarklari.length - 1) / 2)) st.donus++;
      st.bitirisSeri = finishMethod ? st.bitirisSeri + 1 : 0;
      st.enIyiBitirisSeri = Math.max(st.enIyiBitirisSeri, st.bitirisSeri);
    } else if (pro) st.bitirisSeri = 0;
    if (r.sakatlik) st.inat++;
  }
  checkAchievements(s).forEach((a) => lines.push(tL("⭐ Yeni başarım: {0}", [a])));
  if (caught) lines.push(...dopingFallout(s, banWeeks!));
  const teklif = refreshSponsorOffers(s, won && !caught);
  if (teklif) lines.push(teklif);
  // Toparlanma: maçtan sonra kısa bir ara. Sıradaki maçın tarihi teklifte belirlenir (toplam ~60-90 gün).
  let ara = 2;
  if (!won && (r.yontem === 'KO' || r.yontem === 'TKO')) {
    ara += 4;
    lines.push(tL("🩺 Nakavt sonrası zorunlu sağlık ertelemesi: +4 hafta kafese çıkamazsın."));
  }
  lines.push(tL("📅 Toparlanma: {0} hafta. Sıradaki maçın tarihi teklifle birlikte belirlenecek.", [ara]));
  advanceWeeks(s, ara);

  s.haberler.unshift(
    tL("{0} {1}: {2} {3}: {4} {5} · {6} (R{7})", [won ? '✅' : draw ? '➖' : '❌', orgInfo.kisa, fullName(s.fighter), won ? tL('yendi') : draw ? tL("berabere kaldı") : tL('kaybetti'), opp.ad, opp.soyad, methodLabel(r.yontem), r.raunt]),
  );

  const ctx: InterviewCtx = {
    won,
    draw,
    yontem: r.yontem,
    raunt: r.raunt,
    maxRaunt: fs.maxRaunt,
    org,
    oppId: opp.id,
    opp: opp.soyad,
    unvanKazandi: won && opp.champion,
    unvanSavundu: won && wasChampion,
    rovansKazandi: opp.sonSonuc === 'M',
    trashOnce,
    sakatDovustu: !!kamp.sakatlik,
    bonus: orgInfo.performansBonusu,
    pKd: fs.pKnockdown,
    oKd: fs.oKnockdown,
    geriDonus: won && fs.rauntFarklari.slice(0, -1).filter((d) => d < 0).length >= Math.ceil((fs.rauntFarklari.length - 1) / 2) && fs.rauntFarklari.length > 1,
    surpriz: statAverage(opp.stats) - statAverage(s.fighter.stats) >= 5,
    ilkPro: pro && won && s.rekor.g === 1,
    orgIlk: s.gecmis.filter((h) => h.org === org).length === 1,
    kiloKacirdi: kamp.ucretCeza > 0,
    kisilik: opp.kisilik,
    uyruk: opp.uyruk,
    seri: s.seri,
    savas: fs.pHasar > 45 && fs.oHasar > 45,
    cift: s.kutlama?.tur === 'cift',
    ...interviewTargets(s, won),
  };
  const roportaj = buildInterview(s, ctx);
  const karneSon = pro ? s.rekor : s.amator;
  s.pending.sonrasi = {
    satirlar: lines,
    kazandi: won,
    berabere: draw,
    ozet: {
      yontem: methodLabel(r.yontem),
      kod: r.yontem,
      raunt: r.raunt,
      sure: r.sure,
      kartlar: r.kartlar,
      org,
      rakip: `${opp.ad} ${opp.soyad}`,
      rakipLakap: opp.lakap,
      rakipUyruk: opp.uyruk,
      rakipRekor: `${opp.rekor.g}-${opp.rekor.m}-${opp.rekor.b}`,
      rekor: `${karneSon.g}-${karneSon.m}-${karneSon.b}`,
      amator: !pro,
      kazanc: Math.round(kazanc),
      populerlik: s.populerlik,
      popDelta: pop,
      puan,
      saglik: s.saglik,
      hasar,
      bonus: bonusSay,
      nc: caught && won,
      unvan: won && (opp.champion || wasChampion) && !caught,
      teknik: won && finishMethod && r.teknik ? techById(r.teknik)?.ad : undefined,
      teknikNot,
      takipci: followers(s),
      takipciDelta: tDelta,
    },
    roportajSecenekleri: roportaj.map((x) => x.text),
    roportaj,
    ctx,
  };
  s.phase = 'dovusSonrasi';
}

function updateRank(s: GameState, opp: Opponent, won: boolean, draw: boolean): string | null {
  const org = currentOrg(s);
  const L = ORGS[org].merdiven;
  if (!L || draw) return null;
  const before = s.rank;
  if (opp.champion && won) {
    s.sampiyon = true;
    s.rank = null;
    s.savunma = 0;
    const title = tL("{0} {1} Sıklet Şampiyonu", [ORGS[org].ad, WEIGHT_CLASSES[s.fighter.siklet].ad]);
    const sayi = winBelt(s, org, s.fighter.siklet);
    s.unvanlar.push(title);
    if (sayi >= 2) {
      const lbl = champLabel(sayi);
      const bonus = sayi >= 3 ? 15 : 10;
      s.populerlik = clamp(s.populerlik + bonus, 0, 100);
      s.haberler.unshift(tL("🏆🏆 TARİH YAZILDI! {0} artık {1} {2} ({3})!", [fullName(s.fighter), ORGS[org].kisa, lbl.tr, lbl.en]));
      return tL("🏆🏆 {0}! {1}! (Popülerlik +{2})", [lbl.en, title, bonus]);
    }
    s.haberler.unshift(tL("🏆🏆 YENİ ŞAMPİYON! {0} artık {1}!", [fullName(s.fighter), title]));
    return tL("🏆 KEMER SENİN! {0}!", [title]);
  }
  if (s.sampiyon) {
    if (won) {
      s.savunma++;
      defendBelt(s, org, s.fighter.siklet);
      return tL("🏆 Kemer savunması başarılı! ({0}. savunma)", [s.savunma]);
    }
    loseBelt(s, org, s.fighter.siklet);
    s.sampiyon = false;
    s.rank = randInt(1, 2);
    return tL("💔 Kemeri kaybettin. Yeni sıralaman #{0}.", [s.rank]);
  }
  if (won) {
    if (opp.rank != null) {
      const cur = s.rank ?? 99;
      s.rank = opp.rank < cur ? opp.rank : Math.max(1, cur - 1);
    } else if (s.rank == null) {
      if (s.seri >= 2 || chance(0.4)) s.rank = L - randInt(0, 2);
    } else {
      s.rank = Math.max(1, s.rank - 1);
    }
  } else if (s.rank != null) {
    s.rank += opp.rank == null || opp.rank > s.rank ? randInt(2, 4) : 1;
    if (s.rank > L) s.rank = null;
  }
  if (before === s.rank) return null;
  if (s.rank == null) return tL("📉 Sıralamadan düştün.");
  if (before == null) return tL("📈 Sıralamaya girdin: #{0}!", [s.rank]);
  return s.rank < before ? tL("📈 Sıralama: #{0} → #{1}", [before, s.rank]) : tL("📉 Sıralama: #{0} → #{1}", [before, s.rank]);
}

function updateRival(s: GameState, opp: Opponent, won: boolean, draw: boolean, dramatic: boolean) {
  const existing = s.rakipler.find((r) => r.id === opp.id);
  const notable = !won || draw || dramatic || opp.rivalry > 0 || opp.champion;
  if (!existing && !notable) return;
  const r: Opponent = existing ?? { ...opp };
  r.stats = opp.stats;
  r.karsilasma++;
  r.sonDovus = s.gecmis.length;
  r.stage = s.stage;
  r.sonSonuc = won ? 'G' : draw ? 'B' : 'M';
  r.rivalry = Math.max(r.rivalry, opp.rivalry) + (won ? 1 : 2);
  if (won) r.rekor.m++;
  else if (draw) r.rekor.b++;
  else r.rekor.g++;
  if (won && r.champion) r.champion = false;
  r.etiket = undefined;
  if (!existing) s.rakipler.push(r);
  s.rakipler.sort((a, b) => b.rivalry - a.rivalry);
  s.rakipler = s.rakipler.slice(0, 8);
}

export function interview(s: GameState, idx: number) {
  const ps = s.pending.sonrasi!;
  const sec = ps.roportaj?.[idx];
  if (!sec || !ps.ctx) return;
  ps.roportajSonucu = `“${sec.text}”\n\n${applyInterview(s, sec.id, ps.ctx)}`;
}

/** Röportajdan sonra kariyer ilerlemesini kontrol eder. */
export function afterPostFight(s: GameState) {
  const dwcsIkna = !!s.pending.sonrasi?.dwcsIkna;
  const org = currentOrg(s);
  const won = !!s.pending.sonrasi?.kazandi;
  const finishMethod = ['KO', 'TKO', 'SUB'].includes(s.pending.dovus?.sonuc?.yontem ?? '');
  s.pending = {};
  s.phase = 'hub';

  if (s.fighter.yas >= 45) {
    s.phase = 'emeklilik';
    return;
  }
  if (org === 'amator') {
    if (s.amator.g >= 3 && s.amator.g > s.amator.m) {
      openOffers(s, 'profesyonel', tL("Amatörde adın duyuldu. İki bölgesel organizasyon seni profesyonel kadrosuna istiyor!"));
      return;
    }
  } else if (org === 'dwcs') {
    s.contract = null;
    if (won && chance(finishMethod ? 0.85 : dwcsIkna ? 0.6 : 0.4)) {
      openOffers(s, 'ufcGiris', tL("🎟️ Dean Wyatt ayağa kalktı: \"{0}, UCC’ye hoş geldin!\"", [s.fighter.soyad]));
    } else {
      openOffers(
        s,
        'serbest',
        won ? tL("Kazandın ama Dean etkilenmedi: \"Biraz daha gelişsin.\" Diğer kapılar açık.") : tL("DWCS kötü geçti. UCC kapısı şimdilik kapandı."),
      );
    }
    return;
  } else {
    const cut =
      ((org === 'ufc' && s.seri <= -2 && s.rank == null && !s.sampiyon) || (s.seri <= -3 && !s.sampiyon)) && ownerRel(s) < 25;
    if (cut) {
      s.haberler.unshift(tL("✂️ {0}, {1} ile kontratını feshetti.", [ORGS[org].kisa, fullName(s.fighter)]));
      s.contract = null;
      openOffers(s, 'kovuldu', tL("📉 {0} seni kadrodan çıkardı. Kariyer bitmedi, ama yeniden inşa etmen lazım.", [ORGS[org].ad]));
      return;
    }
    // UCC'de sıralama basamağı yükselince maaş yeniden düzenlenir.
    if (org === 'ufc' && s.contract && s.contract.kalan > 0 && ufcTier(s) > (s.ufcKademe ?? 0)) {
      s.ufcKademe = ufcTier(s);
      openOffers(s, 'ufcZam', tL("📈 Artık bir “{0}” dövüşçüsüsün. UCC maaşını yeniden düzenlemek istiyor.", [UFC_TIERS[s.ufcKademe].ad]));
      return;
    }
    if (s.contract && s.contract.kalan <= 0) {
      openOffers(s, 'yenileme', tL("📜 {0} kontratın bitti. Menajerinin telefonu susmuyor.", [ORGS[org].ad]));
      return;
    }
    // Dean Wyatt iyi bir galibiyetten sonra arayabilir (kontrat ortasında da).
    const dwcsHazir = s.sampiyon || (s.rank != null && ((s.rank <= 3 && s.populerlik >= 25) || (s.rank <= 5 && s.seri >= 3)));
    if (s.stage === 'buyuk' && won && dwcsHazir && s.contract && chance(0.35)) {
      openOffers(s, 'dwcsDavet', tL("📞 Telefon çaldı. Arayan: Dean Wyatt. “Seni izliyorum evlat. Challenger Series’e gel, kendini göster.”"));
      return;
    }
  }
  // Patron tepkisi: büyük galibiyetten sonra tebrik, mağlubiyet serisinde uyarı.
  const pe = ownerReaction(s, won, finishMethod);
  if (pe) {
    s.pending.olay = { id: pe, ...OWNER_EVENTS[pe].kur(s) };
    s.phase = 'event';
    return;
  }
  maybeEvent(s);
}

// ---------- Teklifler ----------

type OfferKind = 'profesyonel' | 'yenileme' | 'serbest' | 'kovuldu' | 'ufcGiris' | 'dwcsDavet' | 'ufcZam';

/** UCC maaş basamakları: sıralamada yükseldikçe maaş katlanır. */
export const UFC_TIERS = [
  { ad: tL("Sıralamasız"), carpan: 1 },
  { ad: tL("İlk 15"), carpan: 1.6 },
  { ad: tL("İlk 10"), carpan: 2.4 },
  { ad: tL("İlk 5"), carpan: 3.8 },
  { ad: tL("Şampiyon"), carpan: 6.5 },
];

export function ufcTier(s: GameState) {
  if (s.sampiyon) return 4;
  if (s.rank == null) return 0;
  return s.rank <= 5 ? 3 : s.rank <= 10 ? 2 : 1;
}

const CLAUSES: Partial<Record<OrgId, string[]>> = {
  cfc: [tL("Bölgesel TV yayını garantisi"), tL("Kazanırsan unvan eleminatörü önceliği")],
  oktagon: [tL("Stadyum kartında yer alma garantisi"), tL("Avrupa turnuvasına katılım hakkı")],
  pfl: [tL("Sezon playoff’una katılım hakkı, finalde büyük ödül"), tL("Sezon içi sponsorluk hakkı PFC’de")],
  one: [tL("Asya’da yayın ve reklam kampanyası"), tL("Kick boks/Muay Thai süper maçlarına çıkma hakkı")],
  mvp: [tL("PPV gelir payı %2"), tL("Sosyal medya içerik zorunluluğu")],
  ufc: [tL("Kısa haber maddesi: teklif edilen maçı reddedersen ücret %20 düşer"), tL("Vanta/UCC giyim kuralları")],
};

function makeOffer(s: GameState, org: OrgId, dovus: number, raise = 1, not = '', ozel?: string): Offer {
  const [lo, hi] = ORGS[org].ucret;
  const base = randInt(lo, hi) * (1 + s.populerlik / 150) * (1 + s.rekor.g * 0.015) * raise;
  const ucret = Math.round(base / 100) * 100;
  return {
    id: uid(),
    org,
    dovus,
    kalan: dovus,
    ucret,
    bonus: org === 'mvp' ? Math.round(ucret * 0.25 / 100) * 100 : org === 'dwcs' ? 0 : ucret,
    munhasir: org !== 'mvp',
    ozel: ozel ?? (CLAUSES[org] ? pick(CLAUSES[org]!) : undefined),
    not: not || ORGS[org].not,
    pazarlikYapildi: false,
  };
}

export function openOffers(s: GameState, kind: OfferKind, metin: string) {
  const org = currentOrg(s);
  const offers: Offer[] = [];
  const bigOrgs: OrgId[] = ['pfl', 'one', 'mvp'];
  const winsInOrg = s.gecmis.filter((h) => h.org === org && h.sonuc === 'G').length;

  if (kind === 'dwcsDavet' && s.contract) {
    const c = s.contract;
    const fesih = Math.round((c.kalan * c.ucret * 0.5) / 1000) * 1000;
    const dw = makeOffer(s, 'dwcs', 1, 1, tL("Tek dövüş. Etkilersen UCC kontratı. Mevcut {0} kontratını feshetmen gerekiyor.", [ORGS[c.org].kisa]), tL("Kontrat fesih cezası: ${0}", [fesih.toLocaleString(LOC)]));
    dw.fesih = fesih;
    dw.pazarlikYapildi = true;
    offers.push(dw, {
      ...c,
      id: uid(),
      dovus: c.kalan,
      not: tL("{0} ile kalan {1} dövüşüne aynı şartlarla devam et.", [ORGS[c.org].ad, c.kalan]),
      pazarlikYapildi: true,
      devam: true,
    });
  } else if (kind === 'ufcZam' && s.contract) {
    const t = ufcTier(s);
    offers.push(
      makeOffer(s, 'ufc', Math.max(3, s.contract.kalan), UFC_TIERS[t].carpan, tL("{0} basamağı için yeni kontrat.", [UFC_TIERS[t].ad]), t === 4 ? tL("Şampiyon maddesi: PPV gelir payı ve ana maç garantisi") : undefined),
    );
  } else if (kind === 'profesyonel') {
    offers.push(makeOffer(s, 'cfc', 3), makeOffer(s, 'oktagon', 3));
  } else if (kind === 'ufcGiris') {
    offers.push(makeOffer(s, 'ufc', 4, 1, tL("Rüya gerçek oldu. Dünyanın en büyük sahnesi.")));
  } else if (kind === 'kovuldu' || kind === 'serbest') {
    if (s.stage === 'ufc' || s.stage === 'buyuk') {
      pickN(bigOrgs, 2).forEach((o) => offers.push(makeOffer(s, o, 3, 0.9)));
    } else {
      offers.push(makeOffer(s, 'cfc', 3, 0.95), makeOffer(s, 'oktagon', 3, 0.95));
    }
  } else if (kind === 'yenileme') {
    if (s.stage === 'bolgesel') {
      if (s.sampiyon || (s.rank != null && s.rank <= 3) || (winsInOrg >= 3 && s.populerlik >= 18)) {
        pickN(bigOrgs, 2).forEach((o) => offers.push(makeOffer(s, o, 4)));
        metin += tL(" Büyük organizasyonlar kapıda!");
      }
      offers.push(makeOffer(s, org, 3, 1.25, tL("Mevcut organizasyonun seni tutmak istiyor.")));
    } else if (s.stage === 'buyuk') {
      // UCC'ye tek kapı Dean Wyatt's Challenger Series. Davet için şampiyonluk ya da zirvede popüler bir isim olmak gerekir.
      if (s.sampiyon) {
        offers.push(makeOffer(s, 'dwcs', 1, 1, tL("Şampiyonluğun Dean Wyatt’ın dikkatini çekti. DWCS’ye davetlisin. Kazanırsan ve etkilersen UCC kapısı açılır.")));
      } else if (s.rank != null && ((s.rank <= 3 && s.populerlik >= 25) || (s.rank <= 5 && s.seri >= 3))) {
        offers.push(makeOffer(s, 'dwcs', 1, 1, tL("Zirvedeki performansın izleniyor. Tek dövüş, tek şans: etkilersen UCC kontratı.")));
      }
      offers.push(makeOffer(s, org, 4, 1.3, tL("Mevcut organizasyonun yeni bir kontrat sunuyor.")));
    } else {
      offers.push(makeOffer(s, 'ufc', 4, UFC_TIERS[ufcTier(s)].carpan * 1.1, tL("UCC yeni kontrat masaya koydu ({0} maaş basamağı).", [UFC_TIERS[ufcTier(s)].ad])));
      if (!s.sampiyon && s.populerlik >= 50) offers.push(makeOffer(s, 'mvp', 3, 1.5, tL("VIP MMA, UCC’den ayrılırsan büyük para vaat ediyor.")));
    }
  }
  s.pending.teklifler = offers;
  s.pending.teklifMetni = metin;
  s.phase = 'teklifler';
}

function pickN<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  const out: T[] = [];
  while (out.length < n && a.length) out.push(a.splice(randInt(0, a.length - 1), 1)[0]);
  return out;
}

export function acceptOffer(s: GameState, id: string) {
  const o = s.pending.teklifler!.find((x) => x.id === id)!;
  if (o.devam) {
    s.pending = {};
    s.phase = 'hub';
    s.haberler.unshift(tL("Dean Wyatt’ın davetini geri çevirdin. {0} kontratına sadık kaldın.", [ORGS[o.org].kisa]));
    return;
  }
  if (o.fesih) {
    s.para -= o.fesih;
    s.haberler.unshift(tL("💸 {0} kontratı feshedildi. Ceza: {1}.", [ORGS[currentOrg(s)].kisa, money(o.fesih)]));
  }
  const prevOrg = currentOrg(s);
  const sameOrg = prevOrg === o.org;
  s.contract = { org: o.org, kalan: o.dovus, ucret: o.ucret, bonus: o.bonus, munhasir: o.munhasir, ozel: o.ozel };
  if (!sameOrg) {
    vacateOrg(s, prevOrg);
    if (o.org === 'ufc') s.ufcKademe = 0;
    s.stage = ORGS[o.org].stage;
    s.rank = null;
    s.sampiyon = false;
    s.savunma = 0;
    s.seri = Math.max(0, s.seri);
    s.rakipler.forEach((r) => (r.champion = false));
    s.bolum = null;
  }
  ensureDivision(s);
  s.kisaHaber = !!o.ozel?.startsWith(tL("KISA HABER"));
  if (s.kisaHaber) s.rank = 15;
  s.haberler.unshift(
    tL("✍️ {0}, {1} ile {2} dövüşlük kontrat imzaladı ({3}/{4}).", [fullName(s.fighter), ORGS[o.org].ad, o.dovus, money(o.ucret), money(o.bonus)]),
  );
  s.pending = {};
  s.phase = 'hub';
  if (s.kisaHaber) findNextFight(s);
}

export function negotiateOffer(s: GameState, id: string): string {
  const offers = s.pending.teklifler!;
  const o = offers.find((x) => x.id === id)!;
  o.pazarlikYapildi = true;
  const p = 0.25 + s.takim.menajerKalite * 0.05 + s.populerlik / 250 + (offers.length > 1 ? 0.1 : 0) + ownerRel(s, o.org) / 200;
  if (chance(p)) {
    const inc = 1.15 + rand() * 0.2;
    o.ucret = Math.round((o.ucret * inc) / 100) * 100;
    o.bonus = Math.round((o.bonus * inc) / 100) * 100;
    return tL("✅ Pazarlık başarılı! Yeni ücret: {0} + {1} galibiyet bonusu.", [money(o.ucret), money(o.bonus)]);
  }
  if (chance(0.25)) {
    s.pending.teklifler = offers.filter((x) => x.id !== id);
    if (!s.pending.teklifler.length) {
      const fb = makeOffer(s, o.org, o.dovus, 0.8, tL("Masadan kalktılar ama geri döndüler. Daha düşük bir teklifle."));
      fb.pazarlikYapildi = true;
      s.pending.teklifler.push(fb);
      return tL("❌ {0} masadan kalktı! Bir hafta sonra daha düşük bir teklifle geri döndüler.", [ORGS[o.org].kisa]);
    }
    return tL("❌ {0} fazla istediğini düşündü ve teklifi geri çekti!", [ORGS[o.org].kisa]);
  }
  return tL("🤝 \"Son teklifimiz bu.\" {0} geri adım atmadı.", [ORGS[o.org].kisa]);
}

export function rejectOffer(s: GameState, id: string) {
  s.pending.teklifler = s.pending.teklifler!.filter((x) => x.id !== id);
}

export function stayAmateur(s: GameState) {
  s.pending = {};
  s.phase = 'hub';
  s.haberler.unshift(tL("Profesyonel teklifleri geri çevirdin. Amatörde biraz daha pişmek istiyorsun."));
}

export function campCostPreview(s: GameState) {
  return campCost(s, s.stage === 'amator' ? 6 : 8);
}

// ---------- Sıklet değiştirme ----------

const WEIGHT_ORDER: WeightClass[] = ['sinek', 'horoz', 'tuy', 'hafif', 'welter', 'orta', 'yariagir', 'agir'];

/** Bir üst ve bir alt sıklet (varsa). */
export function weightOptions(s: GameState): { siklet: WeightClass; yon: 'yukari' | 'asagi' }[] {
  const i = WEIGHT_ORDER.indexOf(s.fighter.siklet);
  const out: { siklet: WeightClass; yon: 'yukari' | 'asagi' }[] = [];
  if (i < WEIGHT_ORDER.length - 1) out.push({ siklet: WEIGHT_ORDER[i + 1], yon: 'yukari' });
  if (i > 0) out.push({ siklet: WEIGHT_ORDER[i - 1], yon: 'asagi' });
  return out;
}

/** Sıklet değişince istatistikler yeni sıkletin fiziksel özelliklerine uyarlanır. */
export function weightStatDelta(from: WeightClass, to: WeightClass): Partial<Record<StatKey, number>> {
  const a = WEIGHT_MODS[from];
  const b = WEIGHT_MODS[to];
  const out: Partial<Record<StatKey, number>> = {};
  (['vurus', 'gures', 'yer', 'kondisyon', 'cene', 'hiz', 'iq'] as StatKey[]).forEach((k) => {
    const d = (b[k] ?? 0) - (a[k] ?? 0);
    if (d) out[k] = d;
  });
  return out;
}

export function changeWeight(s: GameState, to: WeightClass): string {
  const from = s.fighter.siklet;
  const delta = weightStatDelta(from, to);
  Object.entries(delta).forEach(([k, v]) => addStat(s.fighter.stats, k as StatKey, v ?? 0));
  const wasChamp = s.sampiyon;
  // Aynı organizasyonda hedef sıklette hâlâ aktif bir kemerin varsa tahtına geri dönersin.
  const donus = activeBelts(s).some((b) => b.org === currentOrg(s) && b.siklet === to);
  s.fighter.siklet = to;
  s.sampiyon = donus;
  s.savunma = 0;
  // Şampiyon yeni sıklete gelince doğrudan ünvan sırasına alınır (kemeri aktif kalır: double champ şansı); diğerleri sıfırdan başlar.
  s.rank = donus ? null : wasChamp ? 1 : null;
  s.bolum = null;
  s.rakipler.forEach((r) => (r.champion = false));
  ensureDivision(s);
  const notes = advanceWeeks(s, 4);
  const yon = WEIGHT_ORDER.indexOf(to) > WEIGHT_ORDER.indexOf(from) ? tL("yükseldi") : tL("düştü");
  const msg = wasChamp
    ? tL("{0} kemerini bırakıp {1} sıklete {2}! İlk dövüşü doğrudan ünvan maçı olacak.", [fullName(s.fighter), WEIGHT_CLASSES[to].ad, yon])
    : tL("{0}, {1} sıklete {2}. Yeni sıklette sıfırdan başlıyor.", [fullName(s.fighter), WEIGHT_CLASSES[to].ad, yon]);
  s.haberler.unshift(`📋 ${msg}`);
  return `${msg} ${notes.join(' ')}`.trim();
}

// ---------- Kutlama ----------

/** Dövüş sonrası "Devam": kemer kazanıldıysa önce kutlama ekranı. */
export function continueAfterPost(s: GameState) {
  if (s.kutlama) {
    s.phase = 'kutlama';
    return;
  }
  afterPostFight(s);
}

export function endCelebration(s: GameState) {
  s.kutlama = undefined;
  afterPostFight(s);
}
