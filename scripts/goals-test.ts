// Günlük Hedefler ve Seri: npx tsx scripts/goals-test.ts
import { addGoal, allDone, canRescue, claimChest, goalsOf, rescue, streakOf, type GoalState } from '../src/engine/dailyGoals';
import { COSMETICS } from '../src/engine/cosmetics';
import { createGame, rollStartingStats } from '../src/engine/character';

let fail = 0;
const ok = (c: boolean, m: string) => {
  console.log((c ? '✓ ' : '✗ ') + m);
  if (!c) fail++;
};

const input = { ad: 'Test', soyad: 'Kişi', lakap: '', uyruk: 'tr', memleket: '', yas: 25, siklet: 'welter' as const, gecmis: 'boks' as const, hikaye: '' };
const s = createGame(input, rollStartingStats(input));
const finish = (st: GoalState | undefined, gun: number) => {
  for (const g of goalsOf(gun)) st = addGoal(st, gun, g.k, g.n);
  return st!;
};

for (let d = 20000; d < 20030; d++) {
  const g = goalsOf(d);
  ok(g.length === 3 && new Set(g.map((x) => x.k)).size === 3, `gün ${d}: 3 farklı hedef`);
}
let st: GoalState | undefined;
const d0 = 20400;
ok(!allDone(st, d0), 'başta bitmemiş');
ok(claimChest(s, st, d0) === null, 'bitmeden sandık açılmaz');
st = finish(st, d0);
ok(allDone(st, d0), 'hedefler bitti');
const para0 = s.para;
const r1 = claimChest(s, st, d0)!;
ok(!!r1 && r1.seri === 1 && s.para > para0, '1. gün sandık: para verdi, seri 1');
ok(claimChest(s, r1.st, d0) === null, 'aynı gün ikinci kez açılmaz');
st = r1.st;
for (let d = d0 + 1; d <= d0 + 2; d++) st = claimChest(s, finish(st, d), d)!.st;
ok(streakOf(st, d0 + 2) === 3, 'üç gün üst üste: seri 3');
ok((st.verilen ?? []).includes(3), '3. gün ödülü verildi');
// bir gün kaçır
ok(streakOf(st, d0 + 4) === 0, 'bir gün kaçınca seri görünmez');
ok(canRescue(st, d0 + 4), 'tek gün kaçınca kurtarılabilir');
ok(!canRescue(st, d0 + 5), 'iki gün kaçınca kurtarılamaz');
st = rescue(st, d0 + 4);
ok(streakOf(st, d0 + 4) === 3, 'kurtarma sonrası seri sürüyor');
const r = claimChest(s, finish(st, d0 + 4), d0 + 4)!;
ok(r.seri === 4, 'kurtarma sonrası tamamlayınca seri 4');
st = r.st;
ok(!canRescue(st, d0 + 6), 'aynı hafta ikinci kurtarma yok');
for (const id of ['sort_alev', 'cer_alev', 'eld_alev', 'kem_alev']) ok(COSMETICS.some((c) => c.id === id), `kozmetik var: ${id}`);
console.log(fail ? `${fail} HATA` : 'hepsi geçti');
process.exit(fail ? 1 : 0);
