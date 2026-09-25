// Dövüş içinde kondisyon ve sağlığın raunt raunt nasıl değiştiğini ölçer.
import { chooseTactic, nextRound, resolveCritical, resolveDecision, startFight } from '../src/engine/fight';
import { generateOpponent } from '../src/engine/opponents';
import { createGame, rollStartingStats } from '../src/engine/character';
import type { Tactic } from '../src/engine/types';

const input = { ad: 'T', soyad: 'B', lakap: 'S', uyruk: 'tr', memleket: '', yas: 24, siklet: 'hafif' as const, gecmis: 'boks' as const, hikaye: '' };
for (const tac of ['baski', 'mesafe', 'kontra'] as Tactic[]) {
  const rows: string[] = [];
  for (let n = 0; n < 200; n++) {
    const s = createGame(input, rollStartingStats(input));
    s.stage = 'bolgesel';
    const opp = generateOpponent(s, { zorluk: 0, org: 'cfc' });
    let fs = startFight({ pStats: s.fighter.stats, pAd: 'T', koseAdi: 'K', opp, mods: { stats: {}, plan: 'ayakta', planUyum: false, oppStats: {} }, maxRaunt: 3, unvanMaci: false, anaMac: false });
    const perRound: number[][] = [];
    for (let g = 0; g < 300 && fs.durum !== 'bitti'; g++) {
      if (fs.durum === 'taktik') fs = chooseTactic(fs, tac);
      else if (fs.durum === 'kritik') fs = resolveCritical(fs, 0);
      else if (fs.durum === 'karar') fs = resolveDecision(fs, 0);
      else if (fs.durum === 'rauntSonu') {
        perRound.push([fs.pKondisyon, 100 - fs.pHasar, fs.oKondisyon]);
        fs = nextRound(fs);
      }
    }
    if (n === 0) rows.push(perRound.map((r, i) => `R${i + 1} sonu: kondisyon ${r[0].toFixed(0)} sağlık ${r[1].toFixed(0)} rakip kond ${r[2].toFixed(0)}`).join(' | '));
    if (perRound.length) rows.push(String(perRound[0][0].toFixed(0)));
  }
  const r1 = rows.slice(1).map(Number);
  console.log(`${tac}: örnek → ${rows[0]}\n   1. raunt sonu kondisyon ort. ${(r1.reduce((a, b) => a + b, 0) / r1.length).toFixed(0)}`);
}
