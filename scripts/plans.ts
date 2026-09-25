// Her oyun planının eşit rakibe karşı galibiyet oranı (uyumlu / uyumsuz). Hiçbiri aşırı güçlü olmamalı.
import { chooseTactic, nextRound, PLANS, resolveCritical, resolveDecision, startFight } from '../src/engine/fight';
import { generateOpponent } from '../src/engine/opponents';
import { createGame, rollStartingStats } from '../src/engine/character';
import { pick } from '../src/engine/rng';
import type { PlanKey, Tactic } from '../src/engine/types';

const input = { ad: 'T', soyad: 'B', lakap: 'S', uyruk: 'tr', memleket: '', yas: 26, siklet: 'hafif' as const, gecmis: 'boks' as const, hikaye: '' };
const TACS: Tactic[] = ['baski', 'kontra', 'takedown', 'clinch', 'mesafe'];
const N = 1500;
const rows: string[] = [];
for (const plan of Object.keys(PLANS) as PlanKey[]) {
  const res = [false, true].map((uyum) => {
    let w = 0;
    for (let n = 0; n < N; n++) {
      const s = createGame(input, rollStartingStats(input));
      s.stage = 'bolgesel';
      const opp = generateOpponent(s, { zorluk: 0, org: 'cfc' });
      opp.stats = { ...s.fighter.stats };
      let fs = startFight({ pStats: s.fighter.stats, pAd: 'T', koseAdi: 'K', opp, mods: { stats: {}, plan, planUyum: uyum, oppStats: {} }, maxRaunt: 3, unvanMaci: false, anaMac: false });
      for (let g = 0; g < 300 && fs.durum !== 'bitti'; g++) {
        if (fs.durum === 'taktik') fs = chooseTactic(fs, pick(TACS));
        else if (fs.durum === 'kritik') fs = resolveCritical(fs, 0);
        else if (fs.durum === 'karar') fs = resolveDecision(fs, 0);
        else if (fs.durum === 'rauntSonu') fs = nextRound(fs);
      }
      if (fs.sonuc?.kazanan === 'p') w++;
    }
    return ((w / N) * 100).toFixed(0);
  });
  rows.push(`${plan.padEnd(8)} uyumsuz %${res[0]}  uyumlu %${res[1]}`);
}
console.log(rows.join('\n'));
