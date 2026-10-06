// Kilit mücadelesi ölçümü: üstte iyi pozisyondayken SUB'a basılır, ardından bot belirli hızla SIK'a basar.
// Çalıştır: npx tsx scripts/kilit-test.ts
import { startFight, startLiveRound, oppStatsOf } from '../src/engine/fight';
import { liveCreate, liveInput, liveStep, type LiveSim } from '../src/engine/liveFight';
import { setSeed, rand } from '../src/engine/rng';
import { STAT_KEYS, type Opponent, type Stats } from '../src/engine/types';

const flat = (v: number) => Object.fromEntries(STAT_KEYS.map((k) => [k, v])) as Stats;

function trial(oHp: number, tps: number, fails: number, yerFark: number): boolean {
  const ps = flat(55);
  ps.yer += yerFark;
  const op = { id: 'x', ad: 'R', soyad: 'T', lakap: 'T', uyruk: 'ABD', stil: 'boks', kisilik: '', stats: flat(55), rekor: { g: 1, m: 1, b: 0 }, rank: null, champion: false, rivalry: 0 } as unknown as Opponent;
  let fs = startFight({ pStats: ps, pAd: 'Sen', koseAdi: 'H', opp: op, mods: { stats: {}, plan: 'ayakta', planUyum: false, oppStats: {} }, maxRaunt: 3, unvanMaci: false, anaMac: false });
  fs = startLiveRound(fs, 'takedown');
  fs.oHasar = 100 - oHp;
  fs.oKondisyon = 40 + oHp * 0.5;
  fs.pSubFail = fails;
  const s: LiveSim = liveCreate(fs, oppStatsOf(fs), 0);
  let t = s.start + 10;
  liveStep(s, t);
  s.ground = { top: 'p', since: t, pos: 0.6 };
  s.p.busyUntil = 0;
  liveInput(s, 'sub');
  if (!s.kilit) return false;
  let next = t;
  while (s.kilit && !s.over && t < s.start + 20000) {
    t += 16;
    if (t >= next) {
      liveInput(s, 'sub');
      next = t + (1000 / tps) * (0.85 + rand() * 0.3);
    }
    liveStep(s, t);
  }
  return s.over?.yontem === 'SUB';
}

setSeed(7);
const N = 400;
console.log('Kilit başarısı % (pozisyon 0.6, eşit yer becerisi)');
console.log('rakip canı'.padEnd(14) + ['6/sn', '8/sn', '12/sn', '8/sn 1 kaçmış', '8/sn 2 kaçmış', '8/sn +15 yer'].map((x) => x.padStart(15)).join(''));
for (const hp of [100, 75, 50, 30]) {
  const cells = [
    [6, 0, 0],
    [8, 0, 0],
    [12, 0, 0],
    [8, 1, 0],
    [8, 2, 0],
    [8, 0, 15],
  ].map(([tps, f, y]) => {
    let w = 0;
    for (let i = 0; i < N; i++) if (trial(hp, tps, f, y)) w++;
    return `${Math.round((w / N) * 100)}%`.padStart(15);
  });
  console.log(String(hp).padEnd(14) + cells.join(''));
}
