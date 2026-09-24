// Taktik dengesi testi: her taktik tüm maç boyunca tek başına kullanılırsa galibiyet oranı ne olur?
// Çalıştırma: npx tsx scripts/tactics.ts
import { createGame, rollStartingStats, statAverage } from '../src/engine/character';
import { chooseTactic, counterOf, nextRound, resolveCritical, resolveDecision, startFight } from '../src/engine/fight';
import { generateOpponent } from '../src/engine/opponents';
import { pick, setSeed } from '../src/engine/rng';
import type { Background, FightState, Tactic } from '../src/engine/types';
import { STAT_KEYS } from '../src/engine/types';

setSeed(777);
const BGS: Background[] = ['boks', 'muaythai', 'kickboks', 'gures', 'judo', 'bjj', 'sambo', 'kyokushin', 'sokak'];
const TACTICS: (Tactic | 'karisik' | 'akilli')[] = ['baski', 'kontra', 'takedown', 'clinch', 'mesafe', 'karisik', 'akilli'];
const ALL: Tactic[] = ['baski', 'kontra', 'takedown', 'clinch', 'mesafe'];

/** Köşenin tavsiyesine uyan oyuncu: rakibin sık kullandığı taktiğe karşılık verir, kendini tekrar etmez. */
function smart(fs: FightState): Tactic {
  const h = fs.rakipTaktikGecmisi;
  const last = fs.oyuncuTaktikGecmisi?.at(-1);
  let t: Tactic = h.length ? counterOf(h[h.length - 1]) : pick(ALL);
  if (t === last) t = pick(ALL.filter((x) => x !== last));
  return t;
}
const N = 3000;

for (const fark of [0, 6]) {
console.log(`--- Rakip gücü: oyuncu ${fark ? '+' + fark : 'ile eşit'} ---`);
for (const t of TACTICS) {
  let w = 0, l = 0, d = 0;
  for (let i = 0; i < N; i++) {
    const input = { ad: 'A', soyad: 'B', lakap: '', uyruk: 'us', memleket: '', yas: 25, siklet: 'welter' as const, gecmis: pick(BGS), hikaye: '' };
    const s = createGame(input, rollStartingStats(input));
    const opp = generateOpponent(s, { zorluk: 0 });
    const shift = statAverage(s.fighter.stats) + fark - statAverage(opp.stats);
    STAT_KEYS.forEach((k) => (opp.stats[k] = Math.round(opp.stats[k] + shift)));
    let fs: FightState = startFight({
      pStats: s.fighter.stats, pAd: 'Oyuncu', koseAdi: 'Hoca', opp,
      mods: { stats: {}, plan: 'ayakta', planUyum: false, oppStats: {} }, maxRaunt: 3, unvanMaci: false, anaMac: false,
    });
    for (let g = 0; g < 100 && fs.durum !== 'bitti'; g++) {
      if (fs.durum === 'taktik') fs = chooseTactic(fs, t === 'karisik' ? pick(ALL) : t === 'akilli' ? smart(fs) : t);
      else if (fs.durum === 'kritik') fs = resolveCritical(fs, 0);
      else if (fs.durum === 'karar') fs = resolveDecision(fs, t === 'akilli' ? 0 : fs.karar!.secenekler.length - 1);
      else fs = nextRound(fs);
    }
    const k = fs.sonuc!.kazanan;
    if (k === 'p') w++; else if (k === 'o') l++; else d++;
  }
  console.log(`${t.padEnd(9)} galibiyet ${((w / N) * 100).toFixed(1)}%  mağlubiyet ${((l / N) * 100).toFixed(1)}%`);
}
}
