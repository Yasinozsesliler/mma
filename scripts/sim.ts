import { ORGS } from '../src/engine/data';
import { announceFarewell, canAnnounceFarewell, isFarewellFight } from '../src/engine/farewell';
import { canActivity, canFoundClub, doActivity, fanLevel, foundClub } from '../src/engine/fanClub';
import { ALBUM_SETS } from '../src/engine/cards';
import { acceptComeback, comebackOffer } from '../src/engine/comeback';
import { chooseBrain } from '../src/engine/brain';
import { acceptKafesEvi, chooseScene, finishKeFight, kafesEviInvite, keOpponent, startKeFight } from '../src/engine/kafesEvi';
import { visitedCount, visitedKitalar } from '../src/engine/worldMap';
// Motor denge testi: botlar tam kariyerleri otomatik oynar.
// Çalıştırma: npx tsx scripts/sim.ts [kariyerSayisi]
import { legacyScore } from '../src/engine/legacy';
import { claimGoal, goalDone, refreshStaleGoals } from '../src/engine/goals';
import { answerCrisis, closeCrisis } from '../src/engine/crisis';
import { podcastAnswer } from '../src/engine/podcast';
import { acceptGp, closeGp, declineGp } from '../src/engine/grandPrix';
import { awardsDue, prepareAwards } from '../src/engine/awards';
import { chooseTreatment } from '../src/engine/treatment';
import { canStartBrand, launchProduct, startBrand } from '../src/engine/merch';
import { BRANCHES, canTakePerk, perkPointsFree, takePerk, type PerkId } from '../src/engine/perks';
import { canSign, setSignature } from '../src/engine/signature';
import { appeal } from '../src/engine/appeal';
import { watchCountdown } from '../src/engine/hype';
import { campChoose } from '../src/engine/camp';
import { CUT_SLOTS, type ManualCut } from '../src/engine/weightCut';
import {
  acceptOffer,
  afterPostFight,
  findNextFight,
  finishFight,
  interview,
  negotiateOffer,
  pickOpponent,
  rest,
  nextKafesEvi,
} from '../src/engine/career';
import { createGame, rollStartingStats } from '../src/engine/character';
import { changeWeight } from '../src/engine/career';
import { banned, serveBan } from '../src/engine/doping';
import { openGym, refreshCandidates, signCost, signStudent, upgradeGym } from '../src/engine/academy';
import { acceptCrossover, boxRound, closeBox } from '../src/engine/crossover';
import { createLegendGame, currentChapter, LEGENDS, legendStars, startBonus, unlockLegendRun, type LegendId } from '../src/engine/legendRun';
import { chooseEvent, closeEvent } from '../src/engine/events';
import { chooseTactic, nextRound, resolveCritical, resolveDecision } from '../src/engine/fight';
import { weakest } from '../src/engine/opponents';
import { habitEdge } from '../src/engine/habits';
import { canSpend, spendPoint } from '../src/engine/progression';
import { chance, pick, randInt, setSeed } from '../src/engine/rng';
import type { Background, GameState, PlanKey, Tactic } from '../src/engine/types';
import { STAT_KEYS } from '../src/engine/types';
const krizStat: Record<string, number> = {};
const rekorStat = { n: 0, gecilen: 0, bir: 0, bos: 0, kimlik: {} as Record<string, number> };
const amStat = { n: 0, para: [] as number[], mac: [] as number[], yas: [] as number[], madalya: [] as number[] };
const cesit = { teklif: 0, tekrarTeklif: 0, oncekiListe: 0, dovus: {} as Record<string, number>, tekrar: {} as Record<string, number>, soyad: 0, lakap: 0, kisi: 0 };
const podcastStat = { n: 0 };
const hypeStat = { n: 0, top: 0 };
const cutStat = { n: 0, kacti: 0, iri: 0 };
const tartiSeen = new WeakSet<object>();
/** Botun kilo verme kararı: önce su kesimi, sonra kalan fazlaya göre; fazla kalmadıysa dinlen. */
function cutPick(c: ManualCut): string {
  if (c.dilim >= CUT_SLOTS) return 'tarti';
  const left = CUT_SLOTS - c.dilim;
  if (c.fazla <= -0.3) return 'dinlen';
  if (!c.suKesildi) return 'su';
  const need = c.fazla / left;
  return need > 0.9 ? 'sauna' : need > 0.55 ? 'kosu' : 'banyo';
}
const meydanStat: Record<string, number> = {};
const efsaneStat = { bolum: {} as Record<number, number>, yildiz: 0, y: {} as Record<string, number>, bitti: 0, yas: [] as number[], para: [] as number[], bonus: 0, bonusBitti: 0, bonusY: 0 };
const startStreak: number[] = [];
const itirazStat = { n: 0, kabul: 0 };
const imzaStat = { n: 0, sayi: 0 };
const markaStat = { n: 0, toplam: 0, maxPara: 0 };
const odulStat: Record<string, number> = {};
const gpStat = { katilim: 0, sampiyon: 0, tur: {} as Record<number, number> };
const kankaStat = { kanka: 0, rakip: 0 };
const kayit = { boyut: [] as number[], alan: {} as Record<string, number> };
const kartStat: Record<string, number> = { toplam: 0 };
const mapStat = { sehir: 0, kita: 0, odul: 0 };
const cbStat = { n: 0, g: 0 };
const fanStat: Record<string, number> = { kurulan: 0, sadakat: 0 };
const vedaStat = { ilan: 0, oynanan: 0, g: 0, emekli: 0, hata: 0, donus: 0, diger: 0 };
const dwStat = { kariyer: 0, ulasan: 0, dwcs: 0, dwcsG: 0, buyuk: 0, ilkDwcs: 0 };
const brainStat: Record<string, number> = { toplam: 0, emekli: 0 };
const keStat: Record<string, number> = { davet: 0, kabul: 0, ekran: 0 };
const goalStat = { n: 0, para: 0, puan: 0, tur: {} as Record<string, number> };

const BGS: Background[] = ['boks', 'muaythai', 'kickboks', 'gures', 'judo', 'bjj', 'sambo', 'kyokushin', 'sokak'];
const N = Number(process.argv[2] ?? 300);
setSeed(12345);

const stats = {
  careers: 0,
  fights: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  methods: {} as Record<string, number>,
  reachedPro: 0,
  reachedBig: 0,
  reachedUfc: 0,
  ufcChamp: 0,
  anyTitle: 0,
  fightsToUfc: [] as number[],
  byBg: {} as Record<string, { w: number; l: number }>,
  crashes: 0,
  stageFights: {} as Record<string, number>,
  rec25: [] as string[],
  fights25: [] as number[],
  totalFights: [] as number[],
  gaps: [] as number[],
  gap: {} as Record<string, number[]>,
  stageWins: {} as Record<string, [number, number]>,
  followers: [] as number[],
  retireAge: [] as number[],
  ageWins: {} as Record<string, [number, number]>,
  hof: 0,
  ach: [] as number[],
  legacy: [] as number[],
  stageCareers: {} as Record<string, number>,
  critAll: 0,
  repeatFights: 0,
  maxSame: 0,
  sameName: 0,
  nem: 0,
  nemYenilgi: 0,
  nemMac: [] as number[],
  nemBitti: 0,
  hikaye: {} as Record<string, number>,
  hikayeSayi: [] as number[],
  muze: [] as number[],
  hocaBag: [] as number[],
  medya: [] as number[],
  dunya: [] as number[],
  izler: [] as number[],
  aile: [] as number[],
  setler: [] as number[],
  parlak: [] as number[],
};

const PLAN_FOR: Record<string, PlanKey> = { vurus: 'ayakta', cene: 'ayakta', hiz: 'ayakta', gures: 'gures', yer: 'yer', kondisyon: 'tempo', iq: 'kontra' };

function smartTactic(s: GameState): Tactic {
  // EXPLOIT=1: bot, köşenin bulduğu huyu ve videoyu kullanan dikkatli oyuncu gibi oynar (zaaf üstünlüğünün üst sınırı)
  const fs = s.pending.dovus;
  if (process.env.EXPLOIT && fs) {
    const tum: Tactic[] = ['baski', 'kontra', 'takedown', 'clinch', 'mesafe'];
    const best = tum.reduce((a, b) => (habitEdge(fs, b) > habitEdge(fs, a) ? b : a));
    if (habitEdge(fs, best) > 0 && fs.oyuncuTaktikGecmisi?.at(-1) !== best) return best;
  }
  const st = s.fighter.stats;
  const best = st.vurus >= st.gures && st.vurus >= st.yer ? 'baski' : 'takedown';
  return pick<Tactic>([best, best, 'mesafe', 'kontra', 'clinch']);
}

function playCareer() {
  const bg = pick(BGS);
  const input = {
    ad: 'Test', soyad: 'Bot', lakap: 'Sim', uyruk: pick(['tr', 'us', 'br', 'ru', 'ie']), memleket: '',
    yas: randInt(18, 30), siklet: pick(['hafif', 'welter', 'orta', 'agir'] as const), gecmis: bg, hikaye: '',
  };
  if (process.env.CH === 'sonsans') input.yas = 35;
  if (process.env.CH === 'sokak') (input as { gecmis: Background }).gecmis = 'sokak';
  const s = process.env.LEGEND ? createLegendGame(process.env.LEGEND as LegendId, undefined, !!process.env.TRIAL) : createGame(input, rollStartingStats(input));
  if (process.env.DIFF) s.zorluk = process.env.DIFF as 'kolay' | 'efsane' | 'kabus';
  if (process.env.CH) s.meydan = { id: process.env.CH as 'yenilmez', durum: 'devam' };
  stats.careers++;
  stats.byBg[bg] ??= { w: 0, l: 0 };
  let pro = false, big = false, ufc = false, fights = 0;
  let rec25 = '';
  let lastFightWeek: number | null = null;
  const seen = new Set<string>();
  const metIds = new Map<string, number>();
  const metNames = new Map<string, string>();
  const offered = new Set<string>();
  let lastOffer = new Set<string>();
  const metSur = new Map<string, string>();
  const metNick = new Map<string, string>();
  const spendAll = () => {
    for (;;) {
      const k = STAT_KEYS.filter((x) => canSpend(s, x)).sort((a, b) => s.fighter.stats[a] - s.fighter.stats[b])[0];
      if (!k) return;
      spendPoint(s, k);
    }
  };
  const tryComeback = () => {
    if (process.env.NODONUS || !comebackOffer(s) || !chance(0.5)) return false;
    acceptComeback(s);
    cbStat.n++;
    return true;
  };
  for (let step = 0; step < 4000 && (s.phase !== 'emeklilik' || tryComeback()); step++) {
    spendAll();
    switch (s.phase) {
      case 'hub':
        refreshStaleGoals(s);
        if (canFoundClub(s)) foundClub(s, '');
        if (canActivity(s)) doActivity(s, s.para > 50000 ? 'gece' : pick(['antrenman', 'roportaj'] as const));
        if (s.beyinUyari) {
          const t = s.beyinUyari;
          brainStat['u' + t] = (brainStat['u' + t] ?? 0) + 1;
          chooseBrain(s, t === 30 ? (chance(0.5) ? 'koruma' : 'devam') : t === 55 ? 'dinlen' : t === 75 ? (chance(0.3) ? 'emekli' : 'devam') : s.para > 100000 ? 'lisans' : 'emekli');
          if (s.phase !== 'hub') break;
        }
        if (kafesEviInvite(s)) { keStat.davet++; if (!process.env.NOKE) { keStat.kabul++; acceptKafesEvi(s); break; } }
        if (!process.env.NOMERCH && !s.marka && canStartBrand(s)) startBrand(s, '');
        if (s.marka) (['tisort', 'eldiven', 'icecek'] as const).forEach((p) => s.para > 100000 && launchProduct(s, p));
        if (!process.env.NOPERK) for (let q = 0; q < 3 && perkPointsFree(s) > 0; q++) {
          const opts = Object.values(BRANCHES).flatMap((b) => b.perkler).filter((p) => canTakePerk(s, p as PerkId));
          if (opts.length) takePerk(s, pick(opts) as PerkId);
        }
        if (!s.imza) { const tk = Object.keys(s.teknik ?? {}).find((id) => canSign(s, id)); if (tk) setSignature(s, tk, ''); }
        if (s.itiraz && s.itiraz.dovus === s.gecmis.length && chance(0.5)) { itirazStat.n++; const m0 = s.rekor.m; appeal(s); if (s.rekor.m < m0) itirazStat.kabul++; }
        if (s.tedavi) chooseTreatment(s, s.para > 50000 ? 'ameliyat' : pick(['fizik', 'fizik', 'igne'] as const));
        if (awardsDue(s) && prepareAwards(s)) {
          s.odulToren!.sonuclar.forEach((r) => r.oyuncu && (odulStat[r.kat] = (odulStat[r.kat] ?? 0) + 1));
          odulStat.toren = (odulStat.toren ?? 0) + 1;
          s.odulToren = undefined;
        }
        // Kriz: oyuncu cevap verir (rastgele, bazen hiç ilgilenmez)
        if (s.kriz && !s.kriz.sonuc && chance(0.7)) answerCrisis(s, pick(['ozur', 'espri', 'sert', 'sessiz', 'kanit'] as const));
        if (s.gpDavet && !s.gp) { if (chance(0.6)) { acceptGp(s); gpStat.katilim++; } else declineGp(s); }
        if (s.gp?.bitti) { if (s.gp.sampiyon === 'oyuncu') gpStat.sampiyon++; else { const r = s.gp.turlar.findIndex((x) => !x.includes('oyuncu')); gpStat.tur[r] = (gpStat.tur[r] ?? 0) + 1; } closeGp(s); }
        if (s.podcast && !s.podcast.sonuc && chance(0.6)) {
          while (s.podcast && !s.podcast.sonuc) podcastAnswer(s, randInt(0, s.podcast.sorular[s.podcast.idx].cevaplar.length - 1));
          podcastStat.n++;
          s.podcast = undefined;
        }
        if (s.kriz?.sonuc) { krizStat[s.kriz.sonuc] = (krizStat[s.kriz.sonuc] ?? 0) + 1; closeCrisis(s); }
        for (const g of [...s.hedefler!.list]) if (goalDone(s, g)) { goalStat.n++; goalStat.para += g.odul.para; goalStat.puan += g.odul.puan; goalStat.tur[g.tur] = (goalStat.tur[g.tur] ?? 0) + 1; claimGoal(s, g.id); }
        if (s.fighter.yas >= 25 && !rec25 && input.yas <= 20) { rec25 = `${s.rekor.g}-${s.rekor.m}`; stats.rec25.push(rec25); stats.fights25.push(s.rekor.g + s.rekor.m + s.rekor.b + s.amator.g + s.amator.m + s.amator.b); }
        if (s.gecmis.length >= 90) return finalize();
        if (canAnnounceFarewell(s) && s.fighter.yas >= 37 && chance(0.08)) { announceFarewell(s); vedaStat.ilan++; }
        if (s.efsane) {
          // Efsane botu: boks teklifini kabul eder, şampiyonken ikinci kemer için bir üst sıklete çıkar
          if (s.boksTeklif) { acceptCrossover(s); break; }
          const ch = currentChapter(s)?.id;
          if (s.sampiyon && s.fighter.siklet === 'tuy' && ch === 'ucc' && s.stage !== 'ufc') changeWeight(s, 'hafif');
          if (s.sampiyon && ch === 'cifte' && s.stage === 'ufc') changeWeight(s, s.fighter.siklet === 'tuy' ? 'hafif' : 'tuy');
          if (s.sampiyon && ch === 'agir' && s.fighter.siklet === 'yariagir') changeWeight(s, 'agir');
          if (s.sampiyon && ch === 'orta' && s.fighter.siklet === 'welter') changeWeight(s, 'orta');
          if (ch === 'hukumdar' && s.fighter.siklet !== 'welter' && s.stage === 'ufc') changeWeight(s, 'welter');
          if (banned(s)) serveBan(s);
          if (ch === 'yukari' && s.sampiyon && s.fighter.siklet === 'orta' && s.stage === 'ufc') changeWeight(s, 'yariagir');
          if (ch === 'rovans' && s.fighter.siklet === 'yariagir' && s.stage === 'ufc') changeWeight(s, 'orta');
          if (ch === 'miras' && !s.salon) openGym(s);
          if (ch === 'miras' && s.salon && s.salon.seviye < 2) upgradeGym(s);
          if (s.salon && s.salon.ogrenciler.length < 3) { refreshCandidates(s); const c = s.salon.adaylar?.list[0]; if (c && s.para > signCost(c) * 2) signStudent(s, c.id); }
        }
        if (s.saglik < 55 || s.sakatliklar.length) rest(s);
        else findNextFight(s);
        if ((s.phase as string) === 'rakipSecimi' && isFarewellFight(s) && !s.pending.secenekler?.[0]?.etiket?.includes('VEDA')) vedaStat.hata++;
        break;
      case 'event':
        if (!s.pending.olay!.sonuc) chooseEvent(s, randInt(0, s.pending.olay!.secenekler.length - 1));
        else closeEvent(s);
        break;
      case 'rakipSecimi':
        for (const o of s.pending.secenekler ?? []) {
          cesit.teklif++;
          if (offered.has(o.id)) cesit.tekrarTeklif++;
          if (lastOffer.has(o.id)) cesit.oncekiListe++;
          offered.add(o.id);
        }
        lastOffer = new Set((s.pending.secenekler ?? []).map((o) => o.id));
        { const fin = s.pending.secenekler?.findIndex((o) => o.amFinal) ?? -1; pickOpponent(s, s.pending.dayatma ? 0 : fin >= 0 ? fin : randInt(0, 2)); }
        break;
      case 'kamp': {
        const k = s.pending.kamp!;
        const focus = STAT_KEYS.reduce((a, b) => (s.fighter.stats[b] < s.fighter.stats[a] ? b : a));
        const basin = s.fighter.stats.iq > 55 ? 'trash' : 'saygili';
        if (k.hype != null) { if (!k.belgesel) { watchCountdown(s); hypeStat.n++; hypeStat.top += k.hype; } }
        const vals: Record<string, string | number> = {
          // Tek ekranlık kamp planı (pro kamplar)
          planla: 'plan:' + JSON.stringify({ hafta: Math.min(8, k.macHafta ?? 8), yer: s.para > 20000 ? 'irtifa' : 'salon', focus, plan: PLAN_FOR[weakest(s.pending.rakip!)], intensity: 'orta', kilo: 'normal', basin }),
          sure: Math.min(8, k.macHafta ?? 8),
          takvim: 'hizli',
          haftalik: k.kankaAn ? (k.kankaAn.sonuc ? 'kankaKapat' : `kanka:${randInt(0, k.kankaAn.secenekler.length - 1)}`) : k.rakipHaber && !k.rakipHaber.kapandi ? (k.rakipHaber.sonuc ? 'rakipKapat' : `rakip:${randInt(0, 1)}`) : k.kampAn && !k.kampAn.kapandi ? (k.kampAn.sonuc ? 'anKapat' : `an:${randInt(0, 1)}`) : 'hepsi',
          yer: s.para > 20000 ? 'irtifa' : 'salon',
          focus,
          plan: PLAN_FOR[weakest(s.pending.rakip!)],
          intensity: 'orta',
          kilo: 'normal',
          basin,
          duello: k.duello?.bitti ? 'devam' : 'oto',
          basinsahne: k.basinSahne && k.basinSahne.secimler.length >= k.basinSahne.sorular.length ? 'devam' : `cevap:${['mutevazi', 'iddiali', 'espri'][randInt(0, 2)]}`,
          sakatlik: 0,
          ozet: 0,
          // Elle kilo verme: önce su kesimi, sonra kalan fazlaya göre sauna/koşu/banyo; fazla yoksa dinlen
          kesim: k.kesim ? cutPick(k.kesim) : 0,
          tarti: 0,
          yuzyuze: 'sakin',
        };
        if (k.step === 'tarti' && k.tartiMetni && !tartiSeen.has(k)) {
          tartiSeen.add(k);
          cutStat.n++;
          if (k.ucretCeza > 0) cutStat.kacti++;
          if (/rakibinden iri/.test(k.tartiMetni)) cutStat.iri++;
        }
        campChoose(s, vals[k.step]);
        break;
      }
      case 'kafesEvi': {
        const k = s.kafesEvi!;
        if (k.adim === 'sahne') chooseScene(s, randInt(0, 2));
        else if (k.adim === 'plan') startKeFight(s, PLAN_FOR[weakest(keOpponent(k)!)] as PlanKey);
        else if (k.adim === 'dovus') {
          let fs = k.dovus!;
          let guard = 0;
          while (fs.durum !== 'bitti' && guard++ < 200) {
            if (fs.durum === 'taktik') fs = chooseTactic(fs, smartTactic(s));
            else if (fs.durum === 'kritik') fs = resolveCritical(fs, 0);
            else if (fs.durum === 'karar') fs = resolveDecision(fs, randInt(0, fs.karar!.secenekler.length - 1));
            else if (fs.durum === 'rauntSonu') fs = nextRound(fs);
          }
          k.dovus = fs;
          finishKeFight(s);
        } else {
          if (k.sonuc) { keStat[k.sonuc] = (keStat[k.sonuc] ?? 0) + 1; keStat.ekran += k.ekran; }
          nextKafesEvi(s);
        }
        break;
      }
      case 'dovus': {
        let fs = s.pending.dovus!;
        let guard = 0;
        while (fs.durum !== 'bitti' && guard++ < 200) {
          if (fs.durum === 'taktik') fs = chooseTactic(fs, smartTactic(s));
          else if (fs.durum === 'kritik') fs = resolveCritical(fs, 0);
          else if (fs.durum === 'karar') fs = resolveDecision(fs, randInt(0, fs.karar!.secenekler.length - 1));
          else if (fs.durum === 'rauntSonu') fs = nextRound(fs);
        }
        s.pending.dovus = fs;
        const r = fs.sonuc!;
        const o = s.pending.rakip!;
        const n = (metIds.get(o.id) ?? 0) + 1;
        metIds.set(o.id, n);
        if (n > 1) stats.repeatFights++;
        cesit.dovus[s.stage] = (cesit.dovus[s.stage] ?? 0) + 1;
        if (n > 1) cesit.tekrar[s.stage] = (cesit.tekrar[s.stage] ?? 0) + 1;
        if (n === 1) {
          cesit.kisi++;
          if (metSur.has(o.soyad)) cesit.soyad++;
          if (metNick.has(o.lakap)) cesit.lakap++;
          metSur.set(o.soyad, o.id);
          metNick.set(o.lakap, o.id);
        }
        if (n === 5 && process.env.DEBUG_REPEAT) console.log("5. karşılaşma:", o.etiket, "rank", o.rank, "champ", o.champion, "stage", s.stage, "rivalry", o.rivalry);
        stats.maxSame = Math.max(stats.maxSame, n);
        const full = `${o.ad} ${o.soyad}`;
        if (metNames.has(full) && metNames.get(full) !== o.id) stats.sameName++;
        metNames.set(full, o.id);
        stats.fights++;
        stats.stageFights[s.stage] = (stats.stageFights[s.stage] ?? 0) + 1;
        fights++;
        // TRIAL=1: paketsiz deneme · TRIAL=unlock: deneme bitince birkaç maç sonra paket alınır
        if (process.env.TRIAL === 'unlock' && s.efsane?.bekle && fights % 4 === 0) unlockLegendRun(s);
        // BONUS=1: hikâye bitince "Ya öyle olsaydı?" bölümü başlar
        if (process.env.BONUS && s.efsane?.bitti && !s.efsane.bonus) startBonus(s);
        stats.methods[r.yontem] = (stats.methods[r.yontem] ?? 0) + 1;
        if (r.kazanan === 'p') { stats.wins++; stats.byBg[bg].w++; }
        else if (r.kazanan === 'o') { stats.losses++; stats.byBg[bg].l++; }
        else stats.draws++;
        {
          const pa = STAT_KEYS.reduce((x, k) => x + s.fighter.stats[k], 0) / STAT_KEYS.length;
          const oa = STAT_KEYS.reduce((x, k) => x + o.stats[k], 0) / STAT_KEYS.length;
          const key = o.champion ? `${s.stage}-şampiyon` : s.stage;
          (stats.gap[key] ??= []).push(oa - pa);
          (stats.stageWins[key] ??= [0, 0])[r.kazanan === 'p' ? 0 : 1]++;
          const yb = s.fighter.yas < 30 ? '<30' : s.fighter.yas < 34 ? '30-33' : s.fighter.yas < 37 ? '34-36' : s.fighter.yas < 40 ? '37-39' : '40+';
          (stats.ageWins[yb] ??= [0, 0])[r.kazanan === 'p' ? 0 : 1]++;
        }
        const hafta0 = s.hafta;
        finishFight(s);
        if (lastFightWeek != null) stats.gaps.push((hafta0 - lastFightWeek) * 7);
        lastFightWeek = hafta0;
        break;
      }
      case 'boks':
        while (s.boks && !s.boks.bitti) boxRound(s, pick(['jab', 'kombo', 'kontra', 'klinc'] as const));
        closeBox(s);
        break;
      case 'dovusSonrasi':
        if (!s.pending.sonrasi!.roportajSonucu) interview(s, randInt(0, 2));
        else afterPostFight(s);
        break;
      case 'teklifler': {
        const offers = s.pending.teklifler!;
        const score = (o: (typeof offers)[number]) => (o.org === 'ufc' ? 2e9 : o.org === 'dwcs' ? 1e9 : o.ucret);
        // Efsane botu: UCC öncesi şampiyonken (ikinci kemer için) organizasyonunda kalır
        const stay = s.efsane && currentChapter(s)?.id === 'ucc' && s.sampiyon ? offers.find((o) => o.org === s.contract?.org) : undefined;
        // Son İmparator UCC'yi reddeder
        const disari = s.efsane?.id === 'imparator' ? offers.find((o) => o.org !== 'ufc' && o.org !== 'dwcs') : undefined;
        const best = stay ?? disari ?? [...offers].sort((a, b) => score(b) - score(a))[0];
        if (!best.pazarlikYapildi && Math.random() < 0.3) negotiateOffer(s, best.id);
        else acceptOffer(s, best.id);
        break;
      }
    }
    if (s.stage !== 'amator' && !pro) { amStat.n++; amStat.para.push(s.para); amStat.mac.push(s.amator.g + s.amator.m + s.amator.b); amStat.yas.push(s.fighter.yas - input.yas); amStat.madalya.push(s.amLig?.madalya.length ?? 0); }
    if (s.stage !== 'amator') pro = true;
    seen.add(s.stage);
    if (s.stage === 'buyuk') big = true;
    if (s.stage === 'ufc' && !ufc) { ufc = true; stats.fightsToUfc.push(fights); }
  }
  finalize();

  function finalize() {
    const kk = s.kimlik?.id ?? 'yok';
    rekorStat.kimlik[kk] = (rekorStat.kimlik[kk] ?? 0) + 1;
    if (s.rekorTablo) { const gg = Object.values(s.rekorTablo.gecilen) as number[]; const top = gg.reduce((x, y) => x + y, 0); rekorStat.n++; rekorStat.gecilen += top; rekorStat.bir += gg.filter((x) => x === 3).length; if (!top) rekorStat.bos++; }
    brainStat.toplam += s.beyin ?? 0; if (s.beyinEmekli) brainStat.emekli++;
    if (s.geriDonus?.sonuc === 'G') cbStat.g++;
    if (s.kulup) { fanStat.kurulan++; fanStat.sadakat += s.kulup.sadakat; fanStat['L' + fanLevel(s)] = (fanStat['L' + fanLevel(s)] ?? 0) + 1; }
    mapStat.sehir += visitedCount(s); mapStat.kita += visitedKitalar(s).length; mapStat.odul += (s.haritaOdul ?? []).length;
    (s.kartlar ?? []).forEach((c) => { kartStat[c.nadir] = (kartStat[c.nadir] ?? 0) + 1; kartStat.toplam++; });
    { const pro = [...s.gecmis].reverse().filter((h) => h.org !== 'amator'); let k = 0; while (k < pro.length && pro[k].sonuc === 'G') k++; startStreak.push(k); }
    if (s.meydan) meydanStat[s.meydan.durum] = (meydanStat[s.meydan.durum] ?? 0) + 1;
    if (s.efsane) {
      const r = s.efsane;
      efsaneStat.bolum[r.bolum] = (efsaneStat.bolum[r.bolum] ?? 0) + 1;
      efsaneStat.yildiz += legendStars(r);
      Object.entries(r.yildiz).forEach(([k, v]) => v.forEach((i) => (efsaneStat.y[`${k}${i}`] = (efsaneStat.y[`${k}${i}`] ?? 0) + 1)));
      if (r.bitti) { efsaneStat.bitti++; efsaneStat.yas.push(s.fighter.yas); efsaneStat.para.push(s.para); }
      if (r.bonus) efsaneStat.bonus++;
      if (r.bonusBitti) { efsaneStat.bonusBitti++; efsaneStat.bonusY += Object.entries(r.yildiz).filter(([k]) => k.startsWith('alt_')).reduce((a, [, v]) => a + v.length, 0); }
    }
    if (s.imza) { imzaStat.n++; imzaStat.sayi += s.imza.sayi; }
    if (s.marka) { markaStat.n++; markaStat.toplam += s.marka.toplam; }
    markaStat.maxPara += s.istat?.maxPara ?? 0;
    if (s.kanka?.durum === 'kanka') kankaStat.kanka++;
    if (s.kanka?.durum === 'rakip') kankaStat.rakip++;
    seen.forEach((x) => (stats.stageCareers[x] = (stats.stageCareers[x] ?? 0) + 1));
    if (pro) stats.reachedPro++;
    if (big) stats.reachedBig++;
    if (ufc) stats.reachedUfc++;
    if (s.unvanlar.length) stats.anyTitle++;
    if (s.hof) stats.hof++;
    stats.ach.push((s.basarimlar ?? []).length);
    stats.legacy.push(legacyScore(s));
    stats.totalFights.push(fights);
    stats.retireAge.push(s.fighter.yas);
    if (s.veda?.sonuc) { vedaStat.oynanan++; if (s.veda.sonuc === 'G') vedaStat.g++; if (s.phase === 'emeklilik' && s.gecmis.length - 1 === s.veda.dovus) vedaStat.emekli++; else if (s.geriDonus) vedaStat.donus++; else vedaStat.diger++; }
    {
      const kr = [...s.gecmis].reverse();
      const firstUfc = kr.findIndex((h) => h.org === 'ufc');
      const before = firstUfc < 0 ? kr : kr.slice(0, firstUfc);
      const dw = before.filter((h) => h.org === 'dwcs');
      dwStat.kariyer++;
      dwStat.dwcs += dw.length;
      dwStat.dwcsG += dw.filter((h) => h.sonuc === 'G').length;
      if (firstUfc >= 0) { dwStat.ulasan++; dwStat.buyuk += before.filter((h) => ORGS[h.org]?.stage === 'buyuk').length; dwStat.ilkDwcs += Math.max(0, before.findIndex((h) => h.org === 'dwcs') - before.findIndex((h) => ORGS[h.org]?.stage === 'buyuk')); }
    }
    stats.followers.push(s.takipci ?? 0);
    if (s.unvanlar.some((u) => /^U[FC]C/.test(u))) stats.ufcChamp++;
    (s.hikayeler ?? []).forEach((h) => (stats.hikaye[h] = (stats.hikaye[h] ?? 0) + 1));
    stats.hikayeSayi.push((s.hikayeler ?? []).length);
    {
      const j = JSON.stringify(s);
      kayit.boyut.push(j.length);
      for (const [k, v] of Object.entries(s)) kayit.alan[k] = (kayit.alan[k] ?? 0) + JSON.stringify(v ?? null).length;
    }
    stats.hocaBag.push(s.hoca?.bag ?? 0);
    stats.medya.push((s.medya ?? []).length);
    stats.dunya.push(Object.keys(s.dunya ?? {}).length);
    stats.izler.push((s.izler ?? []).length);
    stats.muze.push((s.hatiralar ?? []).filter((h) => h.kat === 'muze').length);
    stats.aile.push((s.hatiralar ?? []).filter((h) => h.kat === 'aile').length);
    stats.setler.push(ALBUM_SETS.filter((d) => d.say(s.kartlar ?? []) >= d.hedef).length);
    stats.parlak.push((s.kartlar ?? []).filter((c) => c.parlak).length);
    if (s.ezeli) {
      stats.nem++;
      if (s.ezeli.kaynak === 'yenilgi') stats.nemYenilgi++;
      stats.nemMac.push(s.ezeli.g + s.ezeli.m + s.ezeli.b);
      if (s.ezeli.bitti) stats.nemBitti++;
    }
  }
}

for (let i = 0; i < N; i++) {
  try {
    playCareer();
  } catch (e) {
    stats.crashes++;
    if (stats.crashes <= 3) console.error(e);
  }
}

const pct = (a: number, b: number) => `${((a / Math.max(1, b)) * 100).toFixed(1)}%`;
const mean = (a: number[]) => (a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(1);
console.log(`18-20 yaşında başlayanlar, 25 yaşında: toplam dövüş ort. ${mean(stats.fights25)}, pro karne örnekleri: ${stats.rec25.slice(0, 12).join(', ')}`);
console.log(`Maçlar arası gün ort. ${mean(stats.gaps)} (min ${Math.min(...stats.gaps)}, maks ${Math.max(...stats.gaps)}) · Kariyer sonu takipçi ort. ${Math.round(Number(mean(stats.followers))).toLocaleString('tr-TR')}, maks ${Math.max(...stats.followers).toLocaleString('tr-TR')}`);
console.log(`Veda maçı: ilan ${vedaStat.ilan}, oynanan ${vedaStat.oynanan}, galibiyet ${vedaStat.g}, ardından emekli ${vedaStat.emekli}, etiket hatası ${vedaStat.hata}, sonra dönen ${vedaStat.donus}, açıklanamayan ${vedaStat.diger}`);
console.log(`UCC yolu: büyük org'da UCC öncesi maç ort. ${(dwStat.buyuk / Math.max(1, dwStat.ulasan)).toFixed(1)}, ilk DWCS'ye kadar ${(dwStat.ilkDwcs / Math.max(1, dwStat.ulasan)).toFixed(1)}, kariyer başına DWCS ${(dwStat.dwcs / dwStat.kariyer).toFixed(2)} (galibiyet %${Math.round((dwStat.dwcsG / Math.max(1, dwStat.dwcs)) * 100)})`);
console.log('Yaşa göre galibiyet:', Object.entries(stats.ageWins).map(([k, [w, l]]) => `${k} %${Math.round((w / (w + l)) * 100)} (${w + l})`).join(' · '));
console.log('Rakip − oyuncu güç farkı / galibiyet oranı:', Object.entries(stats.gap).map(([k, v]) => `${k} ${mean(v)} (%${Math.round((stats.stageWins[k][0] / (stats.stageWins[k][0] + stats.stageWins[k][1])) * 100)})`).join(' · '));
console.log(`Kariyer boyu dövüş ort. ${mean(stats.totalFights)}, bitiş yaşı ort. ${mean(stats.retireAge)}`);
console.log(`Başarım ort. ${mean(stats.ach)}, maks ${Math.max(...stats.ach)} · Efsane puanı ort. ${mean(stats.legacy)}, maks ${Math.max(...stats.legacy)} · Hall of Fame: ${((stats.hof / N) * 100).toFixed(1)}%`);
console.log(`Hedefler: kariyer başına ${(goalStat.n / N).toFixed(1)} tamamlanan, ort. ödül $${Math.round(goalStat.para / N).toLocaleString('tr-TR')} + ${(goalStat.puan / N).toFixed(1)} puan ·`, Object.entries(goalStat.tur).map(([k, v]) => `${k} ${v}`).join(', '));
console.log(`Grand Prix: kariyer başına ${(gpStat.katilim / N).toFixed(2)} katılım, şampiyonluk oranı ${pct(gpStat.sampiyon, gpStat.katilim)}, elendiği tur ${JSON.stringify(gpStat.tur)}`);
console.log('Ödüller (kariyer başına):', Object.entries(odulStat).map(([k, v]) => `${k} ${(v / N).toFixed(2)}`).join(', '));
console.log(`Marka: ${pct(markaStat.n, N)} kariyerde, marka başına toplam kâr $${Math.round(markaStat.toplam / Math.max(1, markaStat.n)).toLocaleString('tr-TR')} · en yüksek bakiye ort. $${Math.round(markaStat.maxPara / N).toLocaleString('tr-TR')}`);
console.log(`İmza hareketi: ${pct(imzaStat.n, N)} kariyerde, imza ile bitiriş ort. ${(imzaStat.sayi / Math.max(1, imzaStat.n)).toFixed(1)}`);
console.log(`İtiraz: kariyer başına ${(itirazStat.n / N).toFixed(2)}, kabul ${pct(itirazStat.kabul, itirazStat.n)}`);
console.log('Pro başlangıç serisi dağılımı:', [0, 1, 2, 3, 5, 8, 10].map((n) => `≥${n}: ${pct(startStreak.filter((x) => x >= n).length, N)}`).join(' '));
if (process.env.CH) console.log('Meydan okuma:', process.env.CH, JSON.stringify(meydanStat));
if (process.env.LEGEND) {
  const d = LEGENDS[process.env.LEGEND as LegendId];
  console.log(`Efsane Yolu ${d.lakap()}: bitiren ${pct(efsaneStat.bitti, N)}, ort. yıldız ${(efsaneStat.yildiz / N).toFixed(1)}/${d.bolumler.length * 3}, bitiş yaşı ${mean(efsaneStat.yas)}, servet ort. $${Math.round(Number(mean(efsaneStat.para)) || 0).toLocaleString('tr-TR')}`);
  console.log('  Kalınan bölüm:', Object.entries(efsaneStat.bolum).map(([k, v]) => `${k === String(d.bolumler.length) ? 'bitti' : d.bolumler[Number(k)].id} ${pct(v, N)}`).join(' · '));
  if (process.env.BONUS) console.log(`  Ya öyle olsaydı?: başlayan ${efsaneStat.bonus}, biten ${pct(efsaneStat.bonusBitti, Math.max(1, efsaneStat.bonus))}, ort. yıldız ${(efsaneStat.bonusY / Math.max(1, efsaneStat.bonusBitti)).toFixed(1)}/3`);
  console.log('  Yıldız oranı:', d.bolumler.map((c) => `${c.id} ${[0, 1, 2].map((i) => pct(efsaneStat.y[`${c.id}${i}`] ?? 0, N)).join('/')}`).join(' · '));
}
console.log(`Tartı (elle kilo): ${cutStat.n} tartı · kaçırma ${pct(cutStat.kacti, cutStat.n)} · rakipten iri ${pct(cutStat.iri, cutStat.n)}`);
console.log(`Büyük maç (hype): kariyer başına ${(hypeStat.n / N).toFixed(1)}, ort. başlangıç hype ${(hypeStat.top / Math.max(1, hypeStat.n)).toFixed(0)}`);
console.log(`Podcast (kariyer başına): ${(podcastStat.n / N).toFixed(1)}`);
console.log(`Kafes Evi: davet ${pct(keStat.davet, N)}, sonuçlar ${JSON.stringify(keStat)}, ort. ekran ${(keStat.ekran / Math.max(1, keStat.kabul)).toFixed(0)}`);
console.log(`Beyin: kariyer sonu ort. ${(brainStat.toplam / N).toFixed(1)}, doktorla emekli ${pct(brainStat.emekli, N)}, raporlar ${['u30', 'u55', 'u75', 'u90'].map((k) => `${k} ${pct(brainStat[k] ?? 0, N)}`).join(' ')}`);
console.log(`Geri dönüş: ${pct(cbStat.n, N)} kariyer, dönüş maçı galibiyeti ${pct(cbStat.g, cbStat.n)}`);
console.log(`Taraftar kulübü: ${pct(fanStat.kurulan, N)} kuruldu, ort. sadakat ${(fanStat.sadakat / Math.max(1, fanStat.kurulan)).toFixed(0)}, seviyeler ${JSON.stringify(fanStat)}`);
console.log(`Harita: ort. ${(mapStat.sehir / N).toFixed(1)} şehir, ${(mapStat.kita / N).toFixed(1)} kıta, ${(mapStat.odul / N).toFixed(1)} ödül`);
console.log('Kartlar (kariyer başına):', Object.entries(kartStat).map(([k, v]) => `${k} ${(v / N).toFixed(1)}`).join(', '));
console.log(`Antrenman ortağı: kanka ${pct(kankaStat.kanka, N)}, rakip ${pct(kankaStat.rakip, N)}`);
console.log('Krizler (kariyer başına):', Object.entries(krizStat).map(([k, v]) => `${k} ${(v / N).toFixed(2)}`).join(', '));
console.log(`Kariyer: ${stats.careers}, dövüş: ${stats.fights}, çökme: ${stats.crashes}`);
console.log(`G/M/B: ${pct(stats.wins, stats.fights)} / ${pct(stats.losses, stats.fights)} / ${pct(stats.draws, stats.fights)}`);
console.log('Yöntemler:', Object.entries(stats.methods).map(([k, v]) => `${k} ${pct(v, stats.fights)}`).join(', '));
console.log(`Profesyonel: ${pct(stats.reachedPro, N)}, Büyük org: ${pct(stats.reachedBig, N)}, UFC: ${pct(stats.reachedUfc, N)}`);
console.log(`Herhangi bir kemer: ${pct(stats.anyTitle, N)}, UFC şampiyonu: ${pct(stats.ufcChamp, N)}`);
const avg = stats.fightsToUfc.reduce((a, b) => a + b, 0) / Math.max(1, stats.fightsToUfc.length);
console.log(`UFC'ye kadar ortalama dövüş: ${avg.toFixed(1)}`);
console.log('Geçmişe göre galibiyet:', Object.entries(stats.byBg).map(([k, v]) => `${k} ${pct(v.w, v.w + v.l)}`).join(', '));
console.log('Aşama başına ortalama dövüş:', Object.entries(stats.stageFights).map(([k, v]) => `${k} ${(v / (stats.stageCareers[k] ?? N)).toFixed(1)}`).join(', '));
console.log(`Amatör Ligi: profesyonele geçişte maç ort. ${mean(amStat.mac)} (min ${Math.min(...amStat.mac)}, maks ${Math.max(...amStat.mac)}, ≥16: ${pct(amStat.mac.filter((x) => x >= 16).length, amStat.n)}), yaş artışı ${mean(amStat.yas)}, madalya ${mean(amStat.madalya)}, para ort. ${mean(amStat.para)} (eksi: ${pct(amStat.para.filter((x) => x < 0).length, amStat.n)})`);
console.log(`Rekorlar (UCC'ye çıkan kariyer başına): geçilen ${(rekorStat.gecilen / Math.max(1, rekorStat.n)).toFixed(1)}/18, tüm zamanlar 1 numarası ${(rekorStat.bir / Math.max(1, rekorStat.n)).toFixed(2)}, hiç geçemeyen ${pct(rekorStat.bos, rekorStat.n)} · Kimlik: ${Object.entries(rekorStat.kimlik).map(([k, v]) => `${k} ${pct(v, N)}`).join(', ')}`);
console.log(`Rakip çeşitliliği: teklif edilenin ${pct(cesit.tekrarTeklif, cesit.teklif)} daha önce teklif edilmiş, ${pct(cesit.oncekiListe, cesit.teklif)} bir önceki listede · tekrar dövüş ${Object.entries(cesit.dovus).map(([k, v]) => `${k} ${pct(cesit.tekrar[k] ?? 0, v)}`).join(', ')} · yeni rakiplerde aynı soyad ${pct(cesit.soyad, cesit.kisi)}, aynı lakap ${pct(cesit.lakap, cesit.kisi)}`);
console.log(`Tekrar rakip: ${pct(stats.repeatFights, stats.fights)} dövüş, aynı rakiple en fazla: ${stats.maxSame}, farklı kişi ama aynı isim: ${pct(stats.sameName, stats.fights)}`);
console.log(`Ezeli rakip: ${pct(stats.nem, N)} kariyerde (${pct(stats.nemYenilgi, stats.nem)} ilk yenilgiden), karşılaşma ort. ${mean(stats.nemMac)} (maks ${Math.max(0, ...stats.nemMac)}), rekabeti bitiren ${pct(stats.nemBitti, stats.nem)}`);
console.log(`Kayıt boyutu (kariyer sonu): ort. ${Math.round(kayit.boyut.reduce((a, b) => a + b, 0) / kayit.boyut.length / 1024)} KB, maks ${Math.round(Math.max(...kayit.boyut) / 1024)} KB · en büyük alanlar: ${Object.entries(kayit.alan).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${Math.round(v / N / 1024)}KB`).join(', ')}`);
console.log(`Hoca bağı (kariyer sonu) ort. ${mean(stats.hocaBag)}, 80+ ${pct(stats.hocaBag.filter((b) => b >= 80).length, N)} · medya projesi ${mean(stats.medya)} · canlı dünyada takip edilen rakip ${mean(stats.dunya)} · kronik iz ${mean(stats.izler)}`);
console.log(`Hatıralar (kariyer başına): müze ${mean(stats.muze)}/15, aile ${mean(stats.aile)} · albüm setleri ${mean(stats.setler)}/11, parlak kart ${mean(stats.parlak)}`);
console.log(`Hikâyeler: kariyer başına ort. ${mean(stats.hikayeSayi)} · ${Object.entries(stats.hikaye).map(([k, v]) => `${k} ${pct(v, N)}`).join(', ')}`);
