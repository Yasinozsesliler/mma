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
import {
  acceptOffer,
  afterPostFight,
  findNextFight,
  finishFight,
  interview,
  negotiateOffer,
  pickOpponent,
  rest,
} from '../src/engine/career';
import { createGame, rollStartingStats } from '../src/engine/character';
import { chooseEvent, closeEvent } from '../src/engine/events';
import { chooseTactic, nextRound, resolveCritical, resolveDecision } from '../src/engine/fight';
import { weakest } from '../src/engine/opponents';
import { canSpend, spendPoint } from '../src/engine/progression';
import { chance, pick, randInt, setSeed } from '../src/engine/rng';
import type { Background, GameState, PlanKey, Tactic } from '../src/engine/types';
import { STAT_KEYS } from '../src/engine/types';
const krizStat: Record<string, number> = {};
const podcastStat = { n: 0 };
const hypeStat = { n: 0, top: 0 };
const meydanStat: Record<string, number> = {};
const startStreak: number[] = [];
const itirazStat = { n: 0, kabul: 0 };
const imzaStat = { n: 0, sayi: 0 };
const markaStat = { n: 0, toplam: 0, maxPara: 0 };
const odulStat: Record<string, number> = {};
const gpStat = { katilim: 0, sampiyon: 0, tur: {} as Record<number, number> };
const kankaStat = { kanka: 0, rakip: 0 };
const kartStat: Record<string, number> = { toplam: 0 };
const mapStat = { sehir: 0, kita: 0, odul: 0 };
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
};

const PLAN_FOR: Record<string, PlanKey> = { vurus: 'ayakta', cene: 'ayakta', hiz: 'ayakta', gures: 'gures', yer: 'yer', kondisyon: 'tempo', iq: 'kontra' };

function smartTactic(s: GameState): Tactic {
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
  const s = createGame(input, rollStartingStats(input));
  if (process.env.DIFF) s.zorluk = process.env.DIFF as 'kolay' | 'efsane';
  if (process.env.CH) s.meydan = { id: process.env.CH as 'yenilmez', durum: 'devam' };
  stats.careers++;
  stats.byBg[bg] ??= { w: 0, l: 0 };
  let pro = false, big = false, ufc = false, fights = 0;
  let rec25 = '';
  let lastFightWeek: number | null = null;
  const seen = new Set<string>();
  const metIds = new Map<string, number>();
  const metNames = new Map<string, string>();
  const spendAll = () => {
    for (;;) {
      const k = STAT_KEYS.filter((x) => canSpend(s, x)).sort((a, b) => s.fighter.stats[a] - s.fighter.stats[b])[0];
      if (!k) return;
      spendPoint(s, k);
    }
  };
  for (let step = 0; step < 4000 && s.phase !== 'emeklilik'; step++) {
    spendAll();
    switch (s.phase) {
      case 'hub':
        refreshStaleGoals(s);
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
        if (s.saglik < 55 || s.sakatliklar.length) rest(s);
        else findNextFight(s);
        break;
      case 'event':
        if (!s.pending.olay!.sonuc) chooseEvent(s, randInt(0, s.pending.olay!.secenekler.length - 1));
        else closeEvent(s);
        break;
      case 'rakipSecimi':
        pickOpponent(s, s.pending.dayatma ? 0 : randInt(0, 2));
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
          haftalik: k.kankaAn ? (k.kankaAn.sonuc ? 'kankaKapat' : `kanka:${randInt(0, k.kankaAn.secenekler.length - 1)}`) : 'hepsi',
          yer: s.para > 20000 ? 'irtifa' : 'salon',
          focus,
          plan: PLAN_FOR[weakest(s.pending.rakip!)],
          intensity: 'orta',
          kilo: 'normal',
          basin,
          duello: k.duello?.bitti ? 'devam' : 'oto',
          sakatlik: 0,
          ozet: 0,
          tarti: 0,
          yuzyuze: 'sakin',
        };
        campChoose(s, vals[k.step]);
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
        if (n === 5 && process.env.DEBUG_REPEAT) console.log("5. karşılaşma:", o.etiket, "rank", o.rank, "champ", o.champion, "stage", s.stage, "rivalry", o.rivalry);
        stats.maxSame = Math.max(stats.maxSame, n);
        const full = `${o.ad} ${o.soyad}`;
        if (metNames.has(full) && metNames.get(full) !== o.id) stats.sameName++;
        metNames.set(full, o.id);
        stats.fights++;
        stats.stageFights[s.stage] = (stats.stageFights[s.stage] ?? 0) + 1;
        fights++;
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
        }
        const hafta0 = s.hafta;
        finishFight(s);
        if (lastFightWeek != null) stats.gaps.push((hafta0 - lastFightWeek) * 7);
        lastFightWeek = hafta0;
        break;
      }
      case 'dovusSonrasi':
        if (!s.pending.sonrasi!.roportajSonucu) interview(s, randInt(0, 2));
        else afterPostFight(s);
        break;
      case 'teklifler': {
        const offers = s.pending.teklifler!;
        const score = (o: (typeof offers)[number]) => (o.org === 'ufc' ? 2e9 : o.org === 'dwcs' ? 1e9 : o.ucret);
        const best = [...offers].sort((a, b) => score(b) - score(a))[0];
        if (!best.pazarlikYapildi && Math.random() < 0.3) negotiateOffer(s, best.id);
        else acceptOffer(s, best.id);
        break;
      }
    }
    if (s.stage !== 'amator') pro = true;
    seen.add(s.stage);
    if (s.stage === 'buyuk') big = true;
    if (s.stage === 'ufc' && !ufc) { ufc = true; stats.fightsToUfc.push(fights); }
  }
  finalize();

  function finalize() {
    mapStat.sehir += visitedCount(s); mapStat.kita += visitedKitalar(s).length; mapStat.odul += (s.haritaOdul ?? []).length;
    (s.kartlar ?? []).forEach((c) => { kartStat[c.nadir] = (kartStat[c.nadir] ?? 0) + 1; kartStat.toplam++; });
    { const pro = [...s.gecmis].reverse().filter((h) => h.org !== 'amator'); let k = 0; while (k < pro.length && pro[k].sonuc === 'G') k++; startStreak.push(k); }
    if (s.meydan) meydanStat[s.meydan.durum] = (meydanStat[s.meydan.durum] ?? 0) + 1;
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
    stats.followers.push(s.takipci ?? 0);
    if (s.unvanlar.some((u) => /^U[FC]C/.test(u))) stats.ufcChamp++;
    (s.hikayeler ?? []).forEach((h) => (stats.hikaye[h] = (stats.hikaye[h] ?? 0) + 1));
    stats.hikayeSayi.push((s.hikayeler ?? []).length);
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
console.log(`Büyük maç (hype): kariyer başına ${(hypeStat.n / N).toFixed(1)}, ort. başlangıç hype ${(hypeStat.top / Math.max(1, hypeStat.n)).toFixed(0)}`);
console.log(`Podcast (kariyer başına): ${(podcastStat.n / N).toFixed(1)}`);
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
console.log(`Tekrar rakip: ${pct(stats.repeatFights, stats.fights)} dövüş, aynı rakiple en fazla: ${stats.maxSame}, farklı kişi ama aynı isim: ${pct(stats.sameName, stats.fights)}`);
console.log(`Ezeli rakip: ${pct(stats.nem, N)} kariyerde (${pct(stats.nemYenilgi, stats.nem)} ilk yenilgiden), karşılaşma ort. ${mean(stats.nemMac)} (maks ${Math.max(0, ...stats.nemMac)}), rekabeti bitiren ${pct(stats.nemBitti, stats.nem)}`);
console.log(`Hikâyeler: kariyer başına ort. ${mean(stats.hikayeSayi)} · ${Object.entries(stats.hikaye).map(([k, v]) => `${k} ${pct(v, N)}`).join(', ')}`);
