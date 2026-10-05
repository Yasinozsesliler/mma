// Canlı dövüş denge testi: farklı beceride otomatik oyuncular, farklı güç farkındaki rakiplere karşı tam maç oynar.
// Çalıştır: npx tsx scripts/live-test.ts
import { applyLiveRound, nextRound, oppStatsOf, startFight, startLiveRound } from '../src/engine/fight';
import { liveCreate, liveInput, livePos, liveResult, liveRunning, liveStep, SPECIAL_FOR, type LiveInput, type LiveSim, type SpecialKind } from '../src/engine/liveFight';
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
function playRound(sim: LiveSim, bot: Bot, wrestler: boolean) {
  let t = sim.t;
  let plan: { at: number; k: LiveInput } | null = null;
  let seen = -1;
  let nextAtk = t;
  while (!sim.over && (t < sim.start || liveRunning(sim))) {
    t += 16;
    liveStep(sim, t);
    if (!liveRunning(sim)) continue;
    const pos = livePos(sim);
    if (bot.mash) {
      if (t >= nextAtk) {
        const r = rand();
        const opts: LiveInput[] = pos === 'ayakta' ? ['jab', 'jab', 'direkt', 'direkt', 'tekme', 'kac', 'indir'] : pos === 'ustte' ? ['jab', 'direkt', 'sub', 'gard'] : ['kac', 'gard', 'sub'];
        liveInput(sim, opts[Math.floor(r * opts.length)]);
        nextAtk = t + 200 + rand() * 250;
      }
      continue;
    }
    const o = sim.o;
    // Hazırlığı gör, tepki planla
    if (o.state === 'windup' && seen !== o.stateUntil) {
      seen = o.stateUntil;
      const reactAt = t + bot.react * (0.8 + rand() * 0.5);
      if (pos === 'ustte') plan = rand() < bot.dodge && o.attack !== 'gnp' ? { at: reactAt, k: 'gard' } : null;
      else if (pos === 'altta') plan = rand() < bot.dodge ? { at: reactAt, k: o.attack === 'gsub' ? 'kac' : 'gard' } : null;
      else if (o.attack === 'td') plan = rand() < bot.dodge ? { at: Math.max(reactAt, o.stateUntil - sim.cfg.dodgeMs * 0.5 - (1 - bot.timing) * rand() * 400), k: 'kac' } : null;
      else if (wrestler && rand() < 0.3 && sim.p.sta > 30) plan = { at: reactAt, k: 'indir' };
      else if (rand() < bot.interrupt && o.stateUntil - reactAt > 120 && sim.p.sta > 25) plan = { at: reactAt, k: 'direkt' };
      else if (rand() < bot.dodge) {
        const ideal = o.stateUntil - sim.cfg.dodgeMs * 0.5;
        plan = { at: Math.max(reactAt, ideal - (1 - bot.timing) * (rand() * 500)), k: 'kac' };
      } else plan = null;
    }
    if (plan && t >= plan.at) {
      liveInput(sim, plan.k);
      plan = null;
      continue;
    }
    if (o.state === 'windup' || o.state === 'strike') continue;
    if (pos === 'ustte') {
      if (t >= nextAtk) {
        liveInput(sim, o.hp < 45 && rand() < 0.25 ? 'sub' : rand() < 0.6 ? 'jab' : 'direkt');
        nextAtk = t + 450 + rand() * 400;
      }
      continue;
    }
    if (pos === 'altta') {
      if (t >= nextAtk) {
        liveInput(sim, 'kac');
        nextAtk = t + 900 + rand() * 600;
      }
      continue;
    }
    // Kontra penceresi ya da sarsılmış rakip: sert vur
    if ((t < sim.p.counterUntil || o.state === 'rocked') && sim.p.sta > 20) {
      liveInput(sim, 'direkt');
      continue;
    }
    if (o.state === 'guard') continue;
    if (sim.special && t >= sim.special.readyAt && sim.p.sta > 40 && rand() < 0.02) {
      liveInput(sim, 'ozel');
      continue;
    }
    if (t >= nextAtk && sim.p.sta > 35) {
      liveInput(sim, wrestler && rand() < 0.15 ? 'indir' : rand() < 0.65 ? 'jab' : rand() < 0.7 ? 'direkt' : 'tekme');
      nextAtk = t + 450 + rand() * 500;
    }
  }
}

function fight(bot: Bot, pLv: number, oLv: number, profile: 'denk' | 'gurescivsvurus' | 'vurusvsgurescl' = 'denk', special?: SpecialKind) {
  const ps = statsAt(pLv);
  const op = opp(oLv);
  if (profile === 'gurescivsvurus') {
    ps.gures += 15;
    ps.yer += 12;
    ps.vurus -= 12;
    op.stats.gures -= 12;
    op.stats.vurus += 10;
  } else if (profile === 'vurusvsgurescl') {
    ps.vurus += 12;
    ps.gures -= 12;
    ps.yer -= 10;
    op.stats.gures += 15;
    op.stats.yer += 12;
    op.stil = 'gures';
  }
  let fs: FightState = startFight({ pStats: ps, pAd: 'Sen', koseAdi: 'Hoca', opp: op, mods: { stats: {}, plan: 'ayakta', planUyum: false, oppStats: {} }, maxRaunt: 3, unvanMaci: false, anaMac: false });
  let guard = 0;
  while (fs.durum !== 'bitti' && guard++ < 10) {
    if (fs.durum === 'rauntSonu') fs = nextRound(fs);
    fs = startLiveRound(fs, profile === 'gurescivsvurus' ? 'takedown' : TACS[Math.floor(rand() * TACS.length)]);
    const sim = liveCreate(fs, oppStatsOf(fs), 0, undefined, special ? { kind: special, imza: false } : undefined);
    playRound(sim, bot, profile === 'gurescivsvurus');
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

console.log('');
console.log('Tarz eşleşmeleri (eşit güç, "iyi" oyuncu): galibiyet % · KO/TKO % · SUB %');
for (const profile of ['denk', 'gurescivsvurus', 'vurusvsgurescl'] as const) {
  let w = 0;
  let ko = 0;
  let sub = 0;
  for (let i = 0; i < N; i++) {
    const fs = fight(BOTS[2], 55, 55, profile);
    if (fs.sonuc?.kazanan === 'p') w++;
    if (['KO', 'TKO'].includes(fs.sonuc?.yontem ?? '')) ko++;
    if (fs.sonuc?.yontem === 'SUB') sub++;
  }
  console.log(`${profile.padEnd(16)} ${Math.round((w / N) * 100)}% · ${Math.round((ko / N) * 100)}% · ${Math.round((sub / N) * 100)}%`);
}

console.log('');
console.log('Özel hamle etkisi (eşit güç, "iyi" oyuncu): galibiyet %');
const base0 = (() => { let w = 0; for (let i = 0; i < N; i++) if (fight(BOTS[2], 55, 55).sonuc?.kazanan === 'p') w++; return Math.round((w / N) * 100); })();
console.log(`özel yok        ${base0}%`);
for (const k of [...new Set(Object.values(SPECIAL_FOR))]) {
  let w = 0;
  for (let i = 0; i < N; i++) if (fight(BOTS[2], 55, 55, 'denk', k).sonuc?.kazanan === 'p') w++;
  console.log(`${k.padEnd(15)} ${Math.round((w / N) * 100)}%`);
}
