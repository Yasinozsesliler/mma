// Kumarhane oyunlarının beklenen getirisi (1.0 = başa baş). Kasa avantajı için < 1 olmalı.
import { dealerPlay, drawCard, handValue, settleBlackjack, spinRoulette, spinSlot } from '../src/engine/casino';
import { setSeed } from '../src/engine/rng';

setSeed(42);
const N = 400000;
let slot = 0;
for (let i = 0; i < N; i++) slot += spinSlot().carpan;
let rul = 0;
for (let i = 0; i < N; i++) rul += spinRoulette('kirmizi').carpan;
let rulN = 0;
for (let i = 0; i < N; i++) rulN += spinRoulette(17).carpan;
// Blackjack: basit strateji (17'ye kadar çek)
let bj = 0;
for (let i = 0; i < N; i++) {
  const p = [drawCard(), drawCard()];
  const d = [drawCard(), drawCard()];
  while (handValue(p) < 17) p.push(drawCard());
  bj += settleBlackjack(p, handValue(p) > 21 ? d : dealerPlay(d)).carpan;
}
console.log(`Slot ${(slot / N).toFixed(3)} | Rulet renk ${(rul / N).toFixed(3)} | Rulet sayı ${(rulN / N).toFixed(3)} | Blackjack ${(bj / N).toFixed(3)}`);
