// Zaaf okumanın değeri: eşit güçte dövüşçüler, aynı rakip. Rastgele taktik ile zaafa göre taktik karşılaştırılır.
// Çalıştırma: npx tsx scripts/habit-sim.ts [maç]
import { chooseTactic, nextRound, resolveCritical, resolveDecision, startFight } from '../src/engine/fight';
import { habitEdge, type HabitId } from '../src/engine/habits';
import { pick, setSeed } from '../src/engine/rng';
import type { FightMods, FightState, Opponent, Stats, Tactic } from '../src/engine/types';

const N = Number(process.argv[2] ?? 4000);
const TUM: Tactic[] = ['baski', 'kontra', 'takedown', 'clinch', 'mesafe'];
const IDS: HabitId[] = ['gecYorulur', 'hizliBaslar', 'yavasIsinir', 'kontraAcik', 'kafesPanik', 'yerdeZayif', 'bacakZayif', 'govdeHassas'];
const st = (v: number): Stats => ({ vurus: v, gures: v, yer: v, kondisyon: v, cene: v, hiz: v, iq: v });
const mods: FightMods = { stats: {}, plan: 'ayakta', planUyum: false, oppStats: {} };

function play(h: HabitId[], akilli: boolean) {
  const opp = { id: 'o', ad: 'A', soyad: 'B', lakap: 'C', uyruk: 'x', stil: pick(['boks', 'gures', 'kickboks', 'bjj'] as const), kisilik: 'x', stats: st(60), rekor: { g: 5, m: 2, b: 0 }, rank: null, champion: false, rivalry: 0, karsilasma: 0, huylar: h, huyBilinen: [] } as unknown as Opponent;
  let fs: FightState = startFight({ pStats: st(60), pAd: 'P', koseAdi: 'K', opp, mods, maxRaunt: 3, unvanMaci: false, anaMac: false });
  let guard = 0;
  while (fs.durum !== 'bitti' && guard++ < 300) {
    if (fs.durum === 'taktik') {
      const last = fs.oyuncuTaktikGecmisi?.at(-1);
      const adaylar = TUM.filter((t) => t !== last);
      const f = fs;
      const t = akilli ? adaylar.reduce((a, b) => (habitEdge(f, b) > habitEdge(f, a) ? b : a), adaylar[0]) : pick(adaylar);
      fs = chooseTactic(fs, habitEdge(fs, t) > 0 || !akilli ? t : pick(adaylar));
    } else if (fs.durum === 'kritik') fs = resolveCritical(fs, 0);
    else if (fs.durum === 'karar') fs = resolveDecision(fs, 0);
    else if (fs.durum === 'rauntSonu') fs = nextRound(fs);
    else break;
  }
  return fs.sonuc?.kazanan === 'p';
}

setSeed(7);
const oran = (h: HabitId[], ak: boolean) => {
  let w = 0;
  for (let i = 0; i < N; i++) if (play(h, ak)) w++;
  return (w / N) * 100;
};
console.log(`Huy yok: rastgele %${oran([], false).toFixed(1)}`);
for (const id of IDS) console.log(`${id.padEnd(13)} rastgele %${oran([id], false).toFixed(1)} · zaafa göre %${oran([id], true).toFixed(1)}`);
const iki: HabitId[] = ['kontraAcik', 'gecYorulur'];
console.log(`iki huy (${iki.join('+')}): rastgele %${oran(iki, false).toFixed(1)} · zaafa göre %${oran(iki, true).toFixed(1)}`);
