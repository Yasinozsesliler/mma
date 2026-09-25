// Motor denge testi: botlar tam kariyerleri otomatik oynar.
// Çalıştırma: npx tsx scripts/sim.ts [kariyerSayisi]
import { legacyScore } from '../src/engine/legacy';
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
import { pick, randInt, setSeed } from '../src/engine/rng';
import type { Background, GameState, PlanKey, Tactic } from '../src/engine/types';
import { STAT_KEYS } from '../src/engine/types';

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
  retireAge: [] as number[],
  hof: 0,
  ach: [] as number[],
  legacy: [] as number[],
  stageCareers: {} as Record<string, number>,
  critAll: 0,
  repeatFights: 0,
  maxSame: 0,
  sameName: 0,
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
  const s = createGame(input, rollStartingStats(input));
  stats.careers++;
  stats.byBg[bg] ??= { w: 0, l: 0 };
  let pro = false, big = false, ufc = false, fights = 0;
  let rec25 = '';
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
        const vals: Record<string, string | number> = {
          yer: s.para > 20000 ? 'irtifa' : 'salon',
          focus: STAT_KEYS.reduce((a, b) => (s.fighter.stats[b] < s.fighter.stats[a] ? b : a)),
          plan: PLAN_FOR[weakest(s.pending.rakip!)],
          intensity: 'orta',
          kilo: 'normal',
          basin: 'saygili',
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
        finishFight(s);
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
    if (s.unvanlar.some((u) => u.startsWith('UFC'))) stats.ufcChamp++;
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
console.log(`Kariyer boyu dövüş ort. ${mean(stats.totalFights)}, bitiş yaşı ort. ${mean(stats.retireAge)}`);
console.log(`Başarım ort. ${mean(stats.ach)}, maks ${Math.max(...stats.ach)} · Efsane puanı ort. ${mean(stats.legacy)}, maks ${Math.max(...stats.legacy)} · Hall of Fame: ${((stats.hof / N) * 100).toFixed(1)}%`);
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
