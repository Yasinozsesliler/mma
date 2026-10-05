// Canlı dövüş denge testi: farklı beceride otomatik oyuncular, farklı güç farkındaki rakiplere karşı tam maç oynar.
// Çalıştır: npx tsx scripts/live-test.ts
import { applyLiveRound, nextRound, oppStatsOf, startFight, startLiveRound } from '../src/engine/fight';
import { liveCreate, liveInput, liveResult, liveRunning, liveStep, type LiveSim } from '../src/engine/liveFight';
import { rand, setSeed } from '../src/engine/rng';
import { STAT_KEYS, type Background, type FightState, type Opponent, type Stats, type Tactic } from '../src/engine/types';

type Bot = { ad: string; react: number; dodge: number; interrupt: number; timing: number; mash?: boolean };
const BOTS: Bot[] = [
  { ad: 'rastgele', react: 0, dodge: 0, interrupt: 0, timing: 0, mash: true },
  { ad: 'sıradan', react: 420, dodge: 0.6, interrupt: 0.1, timing: 0.5 },
  { ad: 'iyi', react: 300, dodge: 0.85, interrupt: 0.25, timing: 0.75 },
  { ad: 'uzman', react: 220, dodge: 0.95, interrupt: 0.4, timing: 0.9 },
];

const statsAt = (lv: number): Stats => Object.fromEntries(STAT_KEYS.map((k) => [k, Math.round(lv + (rand() - 0.5) * 16)])) as Stats;
const TACS: Tactic[] = ['baski', 'kontra', 'mesafe', 'clinch', 'takedown'];

function opp(lv: number): Opponent {
  return {
    id: 'x',
    ad: 'Rakip',
    soyad: 'Test',
    lakap: 'T',
    uyruk: 'ABD',
    stil: (['boks', 'gures', 'muaythai', 'bjj', 'kickboks'] as Background[])[Math.floor(rand() * 5)],
    kisilik: '',
    stats: statsAt(lv),
    rekor: { g: 5, m: 2, b: 0 },
    rank: null,
    champion: false,
    rivalry: 0,
  } as unknown as Opponent;
}

/** Bir raundu bot ile oynar. */
function playRound(sim: LiveSim, bot: Bot) {
  let t = sim.t;
  let plan: { at: number; k: 'kac' | 'direkt' | 'jab' } | null = null;
  let seen = -1;
  let nextAtk = t;
  while (!sim.over && (t < sim.start || liveRunning(sim))) {
    t += 16;
    liveStep(sim, t);
    if (!liveRunning(sim)) continue;
    if (bot.mash) {
      if (t >= nextAtk) {
        const r = rand();
        liveInput(sim, r < 0.45 ? 'jab' : r < 0.8 ? 'direkt' : r < 0.9 ? 'tekme' : 'kac');
        nextAtk = t + 200 + rand() * 250;
      }
      continue;
    }
    const o = sim.o;
    // Hazırlığı gör, tepki planla
    if (o.state === 'windup' && seen !== o.stateUntil) {
      seen = o.stateUntil;
      const reactAt = t + bot.react * (0.8 + rand() * 0.5);
      if (rand() < bot.interrupt && o.stateUntil - reactAt > 120 && sim.p.sta > 25) plan = { at: reactAt, k: 'direkt' };
      else if (rand() < bot.dodge) {
        // Kaçışı darbeye yakın zamanla (iyi oyuncu daha isabetli)
        const ideal = o.stateUntil - sim.cfg.dodgeMs * 0.5;
        const at = Math.max(reactAt, ideal - (1 - bot.timing) * (rand() * 500));
        plan = { at, k: 'kac' };
      } else plan = null;
    }
    if (plan && t >= plan.at) {
      liveInput(sim, plan.k);
      plan = null;
      continue;
    }
    if (o.state === 'windup' || o.state === 'strike') continue;
    // Kontra penceresi ya da sarsılmış rakip: sert vur
    if ((t < sim.p.counterUntil || o.state === 'rocked') && sim.p.sta > 20) {
      liveInput(sim, 'direkt');
      continue;
    }
    if (o.state === 'guard') continue;
    if (t >= nextAtk && sim.p.sta > 35) {
      liveInput(sim, rand() < 0.65 ? 'jab' : rand() < 0.7 ? 'direkt' : 'tekme');
      nextAtk = t + 450 + rand() * 500;
    }
  }
}

function fight(bot: Bot, pLv: number, oLv: number) {
  let fs: FightState = startFight({ pStats: statsAt(pLv), pAd: 'Sen', koseAdi: 'Hoca', opp: opp(oLv), mods: { stats: {}, plan: 'ayakta', planUyum: false, oppStats: {} }, maxRaunt: 3, unvanMaci: false, anaMac: false });
  let guard = 0;
  while (fs.durum !== 'bitti' && guard++ < 10) {
    if (fs.durum === 'rauntSonu') fs = nextRound(fs);
    fs = startLiveRound(fs, TACS[Math.floor(rand() * TACS.length)]);
    const sim = liveCreate(fs, oppStatsOf(fs), 0);
    playRound(sim, bot);
    fs = applyLiveRound(fs, liveResult(sim));
  }
  return fs;
}

setSeed(12345);
const N = 300;
const DIFFS = [-15, -8, 0, 8, 15];
console.log('Satır: bot · sütun: rakip − oyuncu güç farkı. Değer: galibiyet % (bitiriş %)  [ort. verilen/alınan hasar]');
console.log('            ' + DIFFS.map((d) => `${d >= 0 ? '+' : ''}${d}`.padStart(18)).join(''));
for (const bot of BOTS) {
  const cells = DIFFS.map((d) => {
    let w = 0;
    let fin = 0;
    let dealt = 0;
    let taken = 0;
    for (let i = 0; i < N; i++) {
      const fs = fight(bot, 55, 55 + d);
      if (fs.sonuc?.kazanan === 'p') w++;
      if (['KO', 'TKO'].includes(fs.sonuc?.yontem ?? '')) fin++;
      dealt += fs.oHasar;
      taken += fs.pHasar;
    }
    return `${Math.round((w / N) * 100)}% (${Math.round((fin / N) * 100)}%) [${Math.round(dealt / N)}/${Math.round(taken / N)}]`.padStart(18);
  });
  console.log(bot.ad.padEnd(12) + cells.join(''));
}
