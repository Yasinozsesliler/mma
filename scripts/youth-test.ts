// Gençlik Yolu: npx tsx scripts/youth-test.ts
import { createGame, rollStartingStats } from '../src/engine/character';
import { applyLiveRound, nextRound, oppStatsOf, startLiveRound } from '../src/engine/fight';
import { liveCreate, liveInput, liveResult, liveStep, type LiveInput } from '../src/engine/liveFight';
import { setSeed } from '../src/engine/rng';
import { chooseYouthEvent, finishYouthFight, graduateYouth, nextYouthYear, startYouth, startYouthFight, stayOneMoreYear, YOUTH_BONUS_MAX, youthSport } from '../src/engine/youth';
import { STAT_KEYS, type Background, type FightState, type GameState } from '../src/engine/types';

let fail = 0;
const ok = (c: boolean, m: string) => {
  console.log((c ? '✓ ' : '✗ ') + m);
  if (!c) fail++;
};
setSeed(3);
const INPUTS: LiveInput[] = ['jab', 'direkt', 'kac', 'indir', 'direkt', 'tekme', 'gard', 'sub'];
function play(fs: FightState) {
  let g = 0;
  while (fs.durum !== 'bitti' && g++ < 10) {
    if (fs.durum === 'rauntSonu') fs = nextRound(fs);
    fs = startLiveRound(fs, 'mesafe');
    const sim = liveCreate(fs, oppStatsOf(fs), 0);
    for (let t = 0; t < 32_000 && !sim.over; t += 50) {
      liveStep(sim, t);
      if (t % 300 === 0) liveInput(sim, INPUTS[(t / 300) % INPUTS.length]);
    }
    fs = applyLiveRound(fs, liveResult(sim));
  }
  return fs;
}
ok(youthSport('boks') === 'boks' && youthSport('kickboks') === 'muaythai' && youthSport('judo') === 'grappling' && youthSport('gures') === 'gures' && youthSport('sokak') === 'boks', 'dövüş geçmişinden gençlik sporu');

for (const gecmis of ['boks', 'muaythai', 'bjj', 'gures'] as Background[]) {
  const input = { ad: 'Genç', soyad: 'Yetenek', lakap: '', uyruk: 'tr', memleket: 'İzmir', yas: 18, siklet: 'hafif' as const, gecmis, hikaye: '', genclik: true };
  const s: GameState = createGame(input, rollStartingStats(input));
  const before = { ...s.fighter.stats };
  startYouth(s);
  ok(s.phase === 'genclik' && s.genclik?.yas === 12, `${gecmis}: 12 yaşında ${s.genclik?.spor} ile başladı`);
  let years = 0;
  let guard = 0;
  while (s.genclik && s.genclik.adim !== 'karar' && guard++ < 20) {
    const y = s.genclik;
    chooseYouthEvent(s, years % 2);
    if (y.adim !== 'hazir' || !y.rakip) break;
    startYouthFight(s);
    if (y.dovus?.mods.kural !== y.spor) ok(false, 'turnuva lig kuralıyla oynanır');
    y.dovus = play(y.dovus!);
    finishYouthFight(s);
    if ((y.adim as string) !== 'sonuc') break;
    nextYouthYear(s);
    years++;
  }
  ok(years === 6 && s.genclik?.adim === 'karar' && s.genclik.yas === 18, `${gecmis}: 6 yıl (12-17) sonra 18'de karar (${years} yıl)`);
  const y = s.genclik!;
  ok(y.unvanlar.length === 6 && y.rekor.g + y.rekor.m === 6, `${gecmis}: 6 turnuva, karne ${y.rekor.g}-${y.rekor.m}`);
  stayOneMoreYear(s);
  chooseYouthEvent(s, 0);
  startYouthFight(s);
  y.dovus = play(y.dovus!);
  finishYouthFight(s);
  nextYouthYear(s);
  ok(y.adim === 'karar' && y.yas === 19, `${gecmis}: bir yıl daha kalınca 19'da karar`);
  const total = Object.values(y.bonus).reduce((a, b) => a + (b ?? 0), 0);
  graduateYouth(s);
  ok(s.phase === 'hub' && !s.genclik && s.fighter.yas === 19 && s.fighter.baslangicYasi === 19, `${gecmis}: MMA'ya 19 yaşında geçti`);
  const gain = STAT_KEYS.reduce((a, k) => a + (s.fighter.stats[k] - before[k]), 0);
  ok(gain === total && total >= 3 && total <= YOUTH_BONUS_MAX, `${gecmis}: kazanım ${total} puan (tavan ${YOUTH_BONUS_MAX}) istatistiklere işlendi`);
  ok(s.rekor.g + s.rekor.m === 0 && s.amator.g + s.amator.m === 0 && s.gecmis.length === 0, `${gecmis}: MMA ve amatör karnesi boş`);
  ok(!!s.gencGecmis && s.gencGecmis.unvanlar.length === 7, `${gecmis}: gençlik özeti kaldı`);
}
console.log(fail ? `${fail} HATA` : 'hepsi geçti');
process.exit(fail ? 1 : 0);
