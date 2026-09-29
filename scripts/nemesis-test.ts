// Ezeli rakip testi: doğuş, teklif sıklığı, seri takibi ve bitiş.
// Çalıştırma: npx tsx scripts/nemesis-test.ts
import { createGame, rollStartingStats } from '../src/engine/character';
import { opponentChoices } from '../src/engine/matchmaking';
import { nemesisAfterFight, nemesisDue, nemesisScore } from '../src/engine/nemesis';
import { generateOpponent } from '../src/engine/opponents';
import { setSeed } from '../src/engine/rng';

setSeed(7);
let fails = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) fails++;
};
const input = { ad: 'Test', soyad: 'Kişi', lakap: '', uyruk: 'tr', memleket: '', yas: 22, siklet: 'welter' as const, gecmis: 'boks' as const, hikaye: '' };
const s = createGame(input, rollStartingStats(input));
const fight = () => s.gecmis.push({ rakip: 'x', rakipId: 'x' } as never);

// Doğuş: ilk yenilgi
const o = generateOpponent(s, { zorluk: 0 });
fight();
const born = nemesisAfterFight(s, o, false, false, false);
check(!!s.ezeli && s.ezeli.id === o.id && s.ezeli.g === 1, `ilk yenilgiden doğdu: ${s.ezeli?.ad} ${s.ezeli?.soyad}`);
check(born.length === 1 && born[0].includes(o.soyad), 'maç sonu raporunda doğuş satırı');
check(!nemesisDue(s), 'hemen tekrar teklif edilmez');

// Başka bir yenilgi yeni ezeli rakip doğurmaz
const o2 = generateOpponent(s, { zorluk: 0 });
fight();
nemesisAfterFight(s, o2, false, false, false);
check(s.ezeli!.id === o.id, 'ikinci yenilgi ezeli rakibi değiştirmez');

// 5 dövüş sonra teklif listesinde ~%40
for (let i = 0; i < 5; i++) fight();
check(nemesisDue(s), '5 dövüş sonra zamanı geldi');
let hit = 0;
const N = 400;
for (let i = 0; i < N; i++) if (opponentChoices(s).some((x) => x.id === o.id)) hit++;
check(hit / N > 0.3 && hit / N < 0.5, `teklif listesinde görünme oranı %${Math.round((hit / N) * 100)}`);
const offer = opponentChoices(s).find((x) => x.id === o.id) ?? opponentChoices(s).find((x) => x.id === o.id);

// Karşılaşmalar (seri başta 0-1): yendin → 1-1, yendin → 2-1 (fark 1, sürer), yendin → 3-1 (bitti)
const n = s.ezeli!;
fight();
nemesisAfterFight(s, { ...o }, true, false, false);
check(nemesisScore(n) === '1-1' && !n.bitti, `seri ${nemesisScore(n)}`);
fight();
nemesisAfterFight(s, { ...o }, true, false, false);
check(nemesisScore(n) === '2-1' && !n.bitti, `1 fark sürer: ${nemesisScore(n)}`);
fight();
const end = nemesisAfterFight(s, { ...o }, true, false, false);
check(n.bitti === true && end[0].startsWith('🏁'), `2 farkla bitti: ${nemesisScore(n)}`);
check(!nemesisDue(s) && !opponentChoices(s).some((x) => x.id === o.id), 'bittikten sonra teklif edilmez');
void offer;
console.log(fails ? `${fails} HATA` : 'Tümü geçti');
process.exit(fails ? 1 : 0);
