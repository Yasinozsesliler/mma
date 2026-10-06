// Kilit mücadelesi ölçümü: üstte iyi pozisyondayken SUB'a basılır, ardından bot belirli hızla SIK'a basar.
// "DİREN" uyarısını gören bot (diren olasılığıyla) bırakıp yeniden basar ve basılı tutar; "tut" botu hiç bırakmaz.
// Çalıştır: npx tsx scripts/kilit-test.ts
import { startFight, startLiveRound, oppStatsOf } from '../src/engine/fight';
import { liveCreate, liveHold, liveInput, liveStep, WARN_MS, type LiveSim } from '../src/engine/liveFight';
import { setSeed, rand } from '../src/engine/rng';
import { STAT_KEYS, type Opponent, type Stats } from '../src/engine/types';

const flat = (v: number) => Object.fromEntries(STAT_KEYS.map((k) => [k, v])) as Stats;

type Bot = { tps: number; diren: number; hold?: boolean };

function trial(oHp: number, bot: Bot, fails: number, yerFark: number, guard = false): boolean {
  const ps = flat(55);
  ps.yer += yerFark;
  const op = { id: 'x', ad: 'R', soyad: 'T', lakap: 'T', uyruk: 'ABD', stil: 'boks', kisilik: '', stats: flat(55), rekor: { g: 1, m: 1, b: 0 }, rank: null, champion: false, rivalry: 0 } as unknown as Opponent;
  let fs = startFight({ pStats: ps, pAd: 'Sen', koseAdi: 'H', opp: op, mods: { stats: {}, plan: 'ayakta', planUyum: false, oppStats: {} }, maxRaunt: 3, unvanMaci: false, anaMac: false });
  fs = startLiveRound(fs, 'takedown');
  fs.oHasar = 100 - oHp;
  fs.oKondisyon = 40 + oHp * 0.5;
  fs.pSubFail = fails;
  const s: LiveSim = liveCreate(fs, oppStatsOf(fs), 0, undefined, guard ? { kind: 'guardCek', imza: true } : undefined);
  let t = s.start + 10;
  liveStep(s, t);
  s.p.busyUntil = 0;
  if (guard) {
    // İmza hareketi: guard çek ve hemen kilit
    s.special!.readyAt = 0;
    liveInput(s, 'ozel');
  } else {
    s.ground = { top: 'p', since: t, pos: 0.6 };
    liveInput(s, 'sub');
  }
  if (!s.kilit) return false;
  let next = t;
  let upAt = -1;
  let holdUntil = -1;
  let seenJolt = -1;
  // Arayüzde her basış hem bir basış sayılır hem basılı tutmayı başlatır
  if (bot.hold) {
    liveHold(s, true);
    liveInput(s, 'sub');
  }
  while (s.kilit && !s.over && t < s.start + 20000) {
    t += 16;
    liveStep(s, t);
    const k = s.kilit;
    if (!k) break;
    // Uyarıyı gör: tepki süresi sonra (diren olasılığıyla) yeniden bas ve kıvranma bitene kadar basılı tut
    const nj = k.nextJolt ?? 1e12;
    if (nj !== seenJolt && t >= nj - WARN_MS + 220) {
      seenJolt = nj;
      if (rand() < bot.diren) {
        liveHold(s, false);
        liveStep(s, t + 1);
        liveHold(s, true);
        liveInput(s, 'sub');
        holdUntil = nj + 60;
        continue;
      }
    }
    if (t < holdUntil) continue;
    if (holdUntil > 0 && t >= holdUntil) {
      holdUntil = -1;
      if (!bot.hold) liveHold(s, false);
    }
    if (bot.hold) continue;
    // Normal basış: parmak ~60 ms basılı kalır
    if (upAt > 0 && t >= upAt) {
      liveHold(s, false);
      upAt = -1;
    }
    if (t >= next) {
      liveHold(s, true);
      liveInput(s, 'sub');
      upAt = t + 60;
      next = t + (1000 / bot.tps) * (0.85 + rand() * 0.3);
    }
  }
  return s.over?.yontem === 'SUB';
}

setSeed(7);
const N = 400;
// Ölçüt sıradan oyuncu: saniyede 6 basar, uyarıyı önemsemez
const COLS: [string, Bot, number, number, boolean?][] = [
  ['5/sn', { tps: 5, diren: 0 }, 0, 0],
  ['6/sn', { tps: 6, diren: 0 }, 0, 0],
  ['tut', { tps: 0, diren: 0, hold: true }, 0, 0],
  ['+15 yer', { tps: 6, diren: 0 }, 0, 15],
  ['+30 yer', { tps: 6, diren: 0 }, 0, 30],
  ['-15 yer', { tps: 6, diren: 0 }, 0, -15],
  ['1 kaçmış', { tps: 6, diren: 0 }, 1, 0],
  ['6/sn+diren', { tps: 6, diren: 0.85 }, 0, 0],
  ['imza guard', { tps: 6, diren: 0 }, 0, 0, true],
];
console.log('Kilit başarısı % (pozisyon 0.6, eşit yer becerisi; "diren" = uyarıyı %85 karşılayan oyuncu)');
console.log('rakip canı'.padEnd(12) + COLS.map((c) => c[0].padStart(12)).join(''));
for (const hp of [100, 75, 50, 30]) {
  const cells = COLS.map(([, bot, f, y, g]) => {
    let w = 0;
    for (let i = 0; i < N; i++) if (trial(hp, bot, f, y, !!g)) w++;
    return `${Math.round((w / N) * 100)}%`.padStart(12);
  });
  console.log(String(hp).padEnd(12) + cells.join(''));
}
