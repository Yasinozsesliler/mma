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
import { banLabel, banned, banWeeksLeft, dopingFallout, dopingTest } from './doping';
import { paySponsors, refreshSponsorOffers } from './sponsors';
import { prAdjust } from './staff';
import { OWNER_EVENTS, ownerReaction, ownerRel } from './owners';
import { socialAfterFight, socialTick } from './social';
import { merchIncome, restMultiplier } from './shop';
import { chance, clamp, pick, rand, randInt, uid } from './rng';
import type { GameState, Offer, Opponent, OrgId, StatKey, WeightClass } from './types';

export const STAGE_LABELS = {
  amator: 'Aşama 1 · Amatör',
  bolgesel: 'Aşama 2 · Bölgesel',
  buyuk: 'Aşama 3 · Büyük Organizasyon',
  ufc: 'Aşama 5 · UFC',
};

const money = (n: number) => `$${Math.round(n).toLocaleString('tr-TR')}`;
export { money };

export function rankLabel(s: GameState) {
  const org = currentOrg(s);
  if (s.sampiyon) return `🏆 ${ORGS[org].kisa} ŞAMPİYONU`;
  if (org === 'amator') return `Amatör (${s.amator.g}-${s.amator.m}-${s.amator.b})`;
  if (s.rank == null) return 'Sıralamasız';
  return `#${s.rank} ${WEIGHT_CLASSES[s.fighter.siklet].ad}`;
}

// ---------- Rakip seçimi ----------

export function findNextFight(s: GameState) {
  if (banned(s)) {
    s.haberler.unshift(`🚫 Men cezan sürüyor: ${banWeeksLeft(s)} hafta kaldı.`);
    return;
  }
  const org = ORGS[currentOrg(s)];
  if (org.rakipSecimi && !s.kisaHaber) {
    s.pending.secenekler = opponentChoices(s);
    s.pending.dayatma = false;
  } else {
    const o = imposedOpponent(s);
    if (s.kisaHaber) {
      o.etiket = '⏱️ KISA HABER';
      o.riskMetni = 'Sadece 3 hafta var. Kamp kısa, rakip hazır. Kazanırsan adını herkes öğrenir.';
    }
    s.pending.secenekler = [o];
    s.pending.dayatma = true;
  }
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
    s.haberler.unshift(`📉 ${ORGS[currentOrg(s)].kisa}, üç teklifi reddeden ${fullName(s.fighter)} ile yollarını ayırdı.`);
    s.reddedilen = 0;
    s.contract = null;
    s.pending = {};
    openOffers(s, 'serbest', 'Organizasyon, teklifleri reddettiğin için kontratını feshetti. Artık serbest oyuncusun.');
    return;
  }
  s.haberler.unshift('Organizasyonun teklifini reddettin. Matchmaker memnun değil. (Popülerlik -3)');
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
    kalan: s.sakatliklar.filter((i) => i.hafta > weeks).map((i) => `${i.ad} (${i.hafta - weeks} hf daha)`),
  };
}

export function rest(s: GameState, weeks = 4) {
  const p = restPreview(s, weeks);
  const notes = advanceWeeks(s, weeks);
  socialTick(s, weeks);
  s.para -= p.maliyet;
  s.saglik = p.yeniSaglik;
  s.haberler.unshift(
    `🛌 ${weeks} hafta dinlendin. Sağlık ${s.saglik}/100.${p.maliyet ? ` Yaşam masrafı ${money(p.maliyet)}.` : ''} ${notes.join(' ')}`.trim(),
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
      ? `⚖️ BERABERE: ${fs.pAd} vs ${opp.soyad}`
      : won
        ? `🏆 GALİBİYET: ${methodLabel(r.yontem)} · ${r.raunt}. raunt ${r.sure}`
        : `❌ MAĞLUBİYET: ${methodLabel(r.yontem)} · ${r.raunt}. raunt ${r.sure}`,
  );

  // Rekor ve geçmiş
  // Doping testi: yakalanırsan galibiyet geçersiz (No Contest), ücret kesilir, men cezası.
  const banWeeks = dopingTest(s);
  const caught = banWeeks != null;
  if (caught && won) lines.push('🚫 Galibiyet geçersiz sayıldı: NO CONTEST.');
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
  const oldSeri = s.seri;
  s.seri = won ? Math.max(1, s.seri + 1) : draw ? 0 : Math.min(-1, s.seri - 1);

  // Para
  let kazanc = 0;
  if (pro && s.contract) {
    let purse = s.contract.ucret + (won && !caught ? s.contract.bonus : 0);
    if (caught) {
      purse *= 0.7;
      lines.push('🚫 Doping cezası: ücretin %30’u kesildi.');
    }
    if (kamp.ucretCeza) {
      purse *= 1 - kamp.ucretCeza;
      lines.push(`⚖️ Kilo cezası: ücretinin %${kamp.ucretCeza * 100}’si rakibe gitti.`);
    }
    if (kamp.rakipCeza) purse += s.contract.ucret * 0.2;
    kazanc += purse;
    lines.push(`💵 Ücret: ${money(purse)}${won && s.contract.bonus ? ' (galibiyet bonusu dahil)' : ''}`);
  } else if (won) {
    kazanc += 200;
    lines.push('💵 Yerel bir kasap dükkânı sana $200 ödül verdi. Başlangıç böyle olur.');
  }
  const bonus = orgInfo.performansBonusu;
  let bonusSay = 0;
  if (bonus && won && finishMethod && chance(r.raunt === 1 ? 0.5 : 0.35)) {
    kazanc += bonus;
    bonusSay++;
    lines.push(`⭐ GECENİN PERFORMANSI! +${money(bonus)}`);
  }
  if (bonus && fs.pHasar > 30 && fs.oHasar > 30 && (r.raunt >= 3 || !finishMethod) && chance(0.5)) {
    kazanc += bonus;
    bonusSay++;
    lines.push(`🔥 GECENİN DÖVÜŞÜ! Seyirci ayakta alkışladı. +${money(bonus)}`);
  }
  const sp = paySponsors(s, won && !caught, finishMethod);
  kazanc += sp.toplam;
  lines.push(...sp.satirlar);
  if (kazanc > 0 && s.takim.menajer) {
    const pay = kazanc * s.takim.menajerPay;
    kazanc -= pay;
    lines.push(`🤝 Menajer payı (${s.takim.menajer}): -${money(pay)}`);
  }
  const sponsor = Math.round(s.populerlik * s.populerlik * { amator: 0, bolgesel: 0.6, buyuk: 2.5, ufc: 12 }[s.stage]);
  if (sponsor > 0) {
    kazanc += sponsor;
    lines.push(`🤝 Sponsor gelirleri${s.stage === 'ufc' ? ' (UFC vitrini)' : ''}: +${money(sponsor)}`);
  }
  const merch = pro ? Math.round(merchIncome(s)) : 0;
  if (merch > 0) {
    kazanc += merch;
    lines.push(`👕 Merch ve işletme gelirleri: +${money(merch)}`);
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
  lines.push(`🔥 Popülerlik ${pop >= 0 ? '+' : ''}${pop} → ${s.populerlik}/100`);
  if (!won && s.trashTalk) lines.push('Trash talk yaptıktan sonra kaybetmek… sosyal medya acımasız.');
  const trashOnce = s.trashTalk;
  s.trashTalk = false;

  // Sağlık ve sakatlık
  const hasar = Math.round(fs.pHasar * 0.35 + (!won && (r.yontem === 'KO' || r.yontem === 'TKO') ? 15 : 0));
  s.saglik = clamp(s.saglik - hasar, 5, 100);
  lines.push(hasar ? `🩹 Sağlık -${hasar} → ${s.saglik}/100` : `🩹 Temiz çıktın, sağlık ${s.saglik}/100`);
  if (r.sakatlik) {
    const inj = { ad: 'Kol bağları koptu', stat: 'yer' as const, ceza: 12, hafta: 12 };
    s.sakatliklar.push(inj);
    lines.push(`🦴 ${inj.ad}: ${inj.hafta} hafta sürecek. Tap atmamanın bedeli.`);
  } else if (chance(fs.pHasar / 260)) {
    const inj = randomInjury(3, 7);
    s.sakatliklar.push(inj);
    lines.push(`🩹 Dövüşten ${inj.ad} ile çıktın (${inj.hafta} hafta).`);
  }
  if (!won && r.yontem === 'KO') {
    addStat(s.fighter.stats, 'cene', -1);
    lines.push('Nakavt olmak çenende iz bıraktı. Çene -1.');
  }

  // Tecrübe
  const iq = addStat(s.fighter.stats, 'iq', 1);
  if (iq) lines.push(`🧠 Kafes tecrübesi: IQ +${iq}`);
  const puan = fightPoints({ won, draw, finish: finishMethod, bonus: bonusSay, title: won && opp.champion });
  s.puan += puan;
  lines.push(`⭐ +${puan} gelişim puanı (toplam ${s.puan})`);

  // Sıralama
  const wasChampion = s.sampiyon;
  const rankNote = caught ? null : updateRank(s, opp, won, draw);
  if (rankNote) lines.push(rankNote);
  const divNotes = syncDivision(s, opp, won, draw, won && opp.champion, wasChampion && !won && !draw);
  divNotes.forEach((n) => s.haberler.unshift(n));
  socialAfterFight(s, opp, won, draw, methodLabel(r.yontem), divNotes);
  if (s.seri >= 3) lines.push(`🔥 ${s.seri} maçlık galibiyet serisi!`);
  if (s.seri <= -2 && oldSeri <= -1) lines.push(`📉 ${-s.seri} maçlık mağlubiyet serisi. Baskı artıyor.`);

  // Kontrat
  if (s.contract) {
    s.contract.kalan--;
    lines.push(`📜 Kontratta ${s.contract.kalan} dövüş kaldı.`);
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
  checkAchievements(s).forEach((a) => lines.push(`⭐ Yeni başarım: ${a}`));
  if (caught) lines.push(...dopingFallout(s, banWeeks!));
  const teklif = refreshSponsorOffers(s, won && !caught);
  if (teklif) lines.push(teklif);
  // Toparlanma ve yeni maç görüşmeleri: kampla birlikte bir dövüş döngüsü yaklaşık 90-100 gün sürer.
  const kampHafta = kamp.hafta ?? 8;
  let ara = Math.max(pro ? 4 : 3, (pro ? randInt(13, 14) : randInt(10, 11)) - kampHafta);
  if (!won && (r.yontem === 'KO' || r.yontem === 'TKO')) {
    ara += 4;
    lines.push('🩺 Nakavt sonrası zorunlu sağlık ertelemesi: +4 hafta kafese çıkamazsın.');
  }
  lines.push(`📅 Toparlanma ve yeni maç görüşmeleri: ${ara} hafta. Son kamptan bu yana ${(kampHafta + ara) * 7} gün geçecek.`);
  advanceWeeks(s, ara);

  s.haberler.unshift(
    `${won ? '✅' : draw ? '➖' : '❌'} ${orgInfo.kisa}: ${fullName(s.fighter)} ${
      won ? 'yendi' : draw ? 'berabere kaldı' : 'kaybetti'
    }: ${opp.ad} ${opp.soyad} · ${methodLabel(r.yontem)} (R${r.raunt})`,
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
    const title = `${ORGS[org].ad} ${WEIGHT_CLASSES[s.fighter.siklet].ad} Sıklet Şampiyonu`;
    const sayi = winBelt(s, org, s.fighter.siklet);
    s.unvanlar.push(title);
    if (sayi >= 2) {
      const lbl = champLabel(sayi);
      const bonus = sayi >= 3 ? 15 : 10;
      s.populerlik = clamp(s.populerlik + bonus, 0, 100);
      s.haberler.unshift(`🏆🏆 TARİH YAZILDI! ${fullName(s.fighter)} artık ${ORGS[org].kisa} ${lbl.tr} (${lbl.en})!`);
      return `🏆🏆 ${lbl.en}! ${title}! (Popülerlik +${bonus})`;
    }
    s.haberler.unshift(`🏆🏆 YENİ ŞAMPİYON! ${fullName(s.fighter)} artık ${title}!`);
    return `🏆 KEMER SENİN! ${title}!`;
  }
  if (s.sampiyon) {
    if (won) {
      s.savunma++;
      defendBelt(s, org, s.fighter.siklet);
      return `🏆 Kemer savunması başarılı! (${s.savunma}. savunma)`;
    }
    loseBelt(s, org, s.fighter.siklet);
    s.sampiyon = false;
    s.rank = randInt(1, 2);
    return `💔 Kemeri kaybettin. Yeni sıralaman #${s.rank}.`;
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
  if (s.rank == null) return '📉 Sıralamadan düştün.';
  if (before == null) return `📈 Sıralamaya girdin: #${s.rank}!`;
  return s.rank < before ? `📈 Sıralama: #${before} → #${s.rank}` : `📉 Sıralama: #${before} → #${s.rank}`;
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
      openOffers(s, 'profesyonel', 'Amatörde adın duyuldu. İki bölgesel organizasyon seni profesyonel kadrosuna istiyor!');
      return;
    }
  } else if (org === 'dwcs') {
    s.contract = null;
    if (won && chance(finishMethod ? 0.85 : dwcsIkna ? 0.6 : 0.4)) {
      openOffers(s, 'ufcGiris', `🎟️ Dana White ayağa kalktı: "${s.fighter.soyad}, UFC’ye hoş geldin!"`);
    } else {
      openOffers(
        s,
        'serbest',
        won ? 'Kazandın ama Dana etkilenmedi: "Biraz daha gelişsin." Diğer kapılar açık.' : 'DWCS kötü geçti. UFC kapısı şimdilik kapandı.',
      );
    }
    return;
  } else {
    const cut =
      ((org === 'ufc' && s.seri <= -2 && s.rank == null && !s.sampiyon) || (s.seri <= -3 && !s.sampiyon)) && ownerRel(s) < 25;
    if (cut) {
      s.haberler.unshift(`✂️ ${ORGS[org].kisa}, ${fullName(s.fighter)} ile kontratını feshetti.`);
      s.contract = null;
      openOffers(s, 'kovuldu', `📉 ${ORGS[org].ad} seni kadrodan çıkardı. Kariyer bitmedi, ama yeniden inşa etmen lazım.`);
      return;
    }
    // UFC'de sıralama basamağı yükselince maaş yeniden düzenlenir.
    if (org === 'ufc' && s.contract && s.contract.kalan > 0 && ufcTier(s) > (s.ufcKademe ?? 0)) {
      s.ufcKademe = ufcTier(s);
      openOffers(s, 'ufcZam', `📈 Artık bir “${UFC_TIERS[s.ufcKademe].ad}” dövüşçüsüsün. UFC maaşını yeniden düzenlemek istiyor.`);
      return;
    }
    if (s.contract && s.contract.kalan <= 0) {
      openOffers(s, 'yenileme', `📜 ${ORGS[org].ad} kontratın bitti. Menajerinin telefonu susmuyor.`);
      return;
    }
    // Dana White iyi bir galibiyetten sonra arayabilir (kontrat ortasında da).
    const dwcsHazir = s.sampiyon || (s.rank != null && ((s.rank <= 3 && s.populerlik >= 25) || (s.rank <= 5 && s.seri >= 3)));
    if (s.stage === 'buyuk' && won && dwcsHazir && s.contract && chance(0.35)) {
      openOffers(s, 'dwcsDavet', `📞 Telefon çaldı. Arayan: Dana White. “Seni izliyorum evlat. Contender Series’e gel, kendini göster.”`);
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

/** UFC maaş basamakları: sıralamada yükseldikçe maaş katlanır. */
export const UFC_TIERS = [
  { ad: 'Sıralamasız', carpan: 1 },
  { ad: 'İlk 15', carpan: 1.6 },
  { ad: 'İlk 10', carpan: 2.4 },
  { ad: 'İlk 5', carpan: 3.8 },
  { ad: 'Şampiyon', carpan: 6.5 },
];

export function ufcTier(s: GameState) {
  if (s.sampiyon) return 4;
  if (s.rank == null) return 0;
  return s.rank <= 5 ? 3 : s.rank <= 10 ? 2 : 1;
}

const CLAUSES: Partial<Record<OrgId, string[]>> = {
  cfc: ['Bölgesel TV yayını garantisi', 'Kazanırsan unvan eleminatörü önceliği'],
  oktagon: ['Stadyum kartında yer alma garantisi', 'Avrupa turnuvasına katılım hakkı'],
  pfl: ['Sezon playoff’una katılım hakkı, finalde büyük ödül', 'Sezon içi sponsorluk hakkı PFL’de'],
  one: ['Asya’da yayın ve reklam kampanyası', 'Kick boks/Muay Thai süper maçlarına çıkma hakkı'],
  mvp: ['PPV gelir payı %2', 'Sosyal medya içerik zorunluluğu'],
  ufc: ['Kısa haber maddesi: teklif edilen maçı reddedersen ücret %20 düşer', 'Venum/UFC giyim kuralları'],
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
    const dw = makeOffer(s, 'dwcs', 1, 1, `Tek dövüş. Etkilersen UFC kontratı. Mevcut ${ORGS[c.org].kisa} kontratını feshetmen gerekiyor.`, `Kontrat fesih cezası: $${fesih.toLocaleString('tr-TR')}`);
    dw.fesih = fesih;
    dw.pazarlikYapildi = true;
    offers.push(dw, {
      ...c,
      id: uid(),
      dovus: c.kalan,
      not: `${ORGS[c.org].ad} ile kalan ${c.kalan} dövüşüne aynı şartlarla devam et.`,
      pazarlikYapildi: true,
      devam: true,
    });
  } else if (kind === 'ufcZam' && s.contract) {
    const t = ufcTier(s);
    offers.push(
      makeOffer(s, 'ufc', Math.max(3, s.contract.kalan), UFC_TIERS[t].carpan, `${UFC_TIERS[t].ad} basamağı için yeni kontrat.`, t === 4 ? 'Şampiyon maddesi: PPV gelir payı ve ana maç garantisi' : undefined),
    );
  } else if (kind === 'profesyonel') {
    offers.push(makeOffer(s, 'cfc', 3), makeOffer(s, 'oktagon', 3));
  } else if (kind === 'ufcGiris') {
    offers.push(makeOffer(s, 'ufc', 4, 1, 'Rüya gerçek oldu. Dünyanın en büyük sahnesi.'));
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
        metin += ' Büyük organizasyonlar kapıda!';
      }
      offers.push(makeOffer(s, org, 3, 1.25, 'Mevcut organizasyonun seni tutmak istiyor.'));
    } else if (s.stage === 'buyuk') {
      // UFC'ye tek kapı Dana White's Contender Series. Davet için şampiyonluk ya da zirvede popüler bir isim olmak gerekir.
      if (s.sampiyon) {
        offers.push(makeOffer(s, 'dwcs', 1, 1, 'Şampiyonluğun Dana White’ın dikkatini çekti. DWCS’ye davetlisin. Kazanırsan ve etkilersen UFC kapısı açılır.'));
      } else if (s.rank != null && ((s.rank <= 3 && s.populerlik >= 25) || (s.rank <= 5 && s.seri >= 3))) {
        offers.push(makeOffer(s, 'dwcs', 1, 1, 'Zirvedeki performansın izleniyor. Tek dövüş, tek şans: etkilersen UFC kontratı.'));
      }
      offers.push(makeOffer(s, org, 4, 1.3, 'Mevcut organizasyonun yeni bir kontrat sunuyor.'));
    } else {
      offers.push(makeOffer(s, 'ufc', 4, UFC_TIERS[ufcTier(s)].carpan * 1.1, `UFC yeni kontrat masaya koydu (${UFC_TIERS[ufcTier(s)].ad} maaş basamağı).`));
      if (!s.sampiyon && s.populerlik >= 50) offers.push(makeOffer(s, 'mvp', 3, 1.5, 'MVP MMA, UFC’den ayrılırsan büyük para vaat ediyor.'));
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
    s.haberler.unshift(`Dana White’ın davetini geri çevirdin. ${ORGS[o.org].kisa} kontratına sadık kaldın.`);
    return;
  }
  if (o.fesih) {
    s.para -= o.fesih;
    s.haberler.unshift(`💸 ${ORGS[currentOrg(s)].kisa} kontratı feshedildi. Ceza: ${money(o.fesih)}.`);
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
  s.kisaHaber = !!o.ozel?.startsWith('KISA HABER');
  if (s.kisaHaber) s.rank = 15;
  s.haberler.unshift(
    `✍️ ${fullName(s.fighter)}, ${ORGS[o.org].ad} ile ${o.dovus} dövüşlük kontrat imzaladı (${money(o.ucret)}/${money(o.bonus)}).`,
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
    return `✅ Pazarlık başarılı! Yeni ücret: ${money(o.ucret)} + ${money(o.bonus)} galibiyet bonusu.`;
  }
  if (chance(0.25)) {
    s.pending.teklifler = offers.filter((x) => x.id !== id);
    if (!s.pending.teklifler.length) {
      const fb = makeOffer(s, o.org, o.dovus, 0.8, 'Masadan kalktılar ama geri döndüler. Daha düşük bir teklifle.');
      fb.pazarlikYapildi = true;
      s.pending.teklifler.push(fb);
      return `❌ ${ORGS[o.org].kisa} masadan kalktı! Bir hafta sonra daha düşük bir teklifle geri döndüler.`;
    }
    return `❌ ${ORGS[o.org].kisa} fazla istediğini düşündü ve teklifi geri çekti!`;
  }
  return `🤝 "Son teklifimiz bu." ${ORGS[o.org].kisa} geri adım atmadı.`;
}

export function rejectOffer(s: GameState, id: string) {
  s.pending.teklifler = s.pending.teklifler!.filter((x) => x.id !== id);
}

export function stayAmateur(s: GameState) {
  s.pending = {};
  s.phase = 'hub';
  s.haberler.unshift('Profesyonel teklifleri geri çevirdin. Amatörde biraz daha pişmek istiyorsun.');
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
  const yon = WEIGHT_ORDER.indexOf(to) > WEIGHT_ORDER.indexOf(from) ? 'yükseldi' : 'düştü';
  const msg = wasChamp
    ? `${fullName(s.fighter)} kemerini bırakıp ${WEIGHT_CLASSES[to].ad} sıklete ${yon}! İlk dövüşü doğrudan ünvan maçı olacak.`
    : `${fullName(s.fighter)}, ${WEIGHT_CLASSES[to].ad} sıklete ${yon}. Yeni sıklette sıfırdan başlıyor.`;
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
