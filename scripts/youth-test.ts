// Gençlik Yolu: npx tsx scripts/youth-test.ts
import { createGame, rollStartingStats } from '../src/engine/character';
import { applyLiveRound, nextRound, oppStatsOf, startLiveRound } from '../src/engine/fight';
import { liveCreate, liveInput, liveResult, liveStep, type LiveInput } from '../src/engine/liveFight';
import { setSeed } from '../src/engine/rng';
import { doubleYouthFans, youthSponsor, YOUTH_SPONSOR, chooseYouthEvent, finishYouthFight, graduateYouth, isRivalBout, nextYouthYear, simYouthSemi, startYouth, startYouthFight, stayOneMoreYear, YOUTH_BONUS_MAX, youthSport, type Youth } from '../src/engine/youth';
import { YOUTH_EVENTS } from '../src/engine/youthEvents';
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
  let rivalBouts = 0;
  let sims = 0;
  let tore = 0;
  const round = (y: Youth) => {
    let g2 = 0;
    while (y.adim === 'hazir' && g2++ < 3) {
      if (isRivalBout(y)) rivalBouts++;
      if (y.tur === 'yari' && years % 2) {
        sims++;
        simYouthSemi(s);
        continue;
      }
      startYouthFight(s);
      if (y.dovus?.mods.kural !== y.spor || y.dovus?.mods.genc == null) ok(false, 'turnuva lig kuralıyla ve genç figürle oynanır');
      y.dovus = play(y.dovus!);
      finishYouthFight(s);
    }
    if (y.adim === 'sonuc' && y.torenFans) {
      const st0 = JSON.stringify(s.fighter.stats);
      const t = doubleYouthFans(s);
      if (!t || doubleYouthFans(s) !== null || JSON.stringify(s.fighter.stats) !== st0) ok(false, 'madalya töreni takipçisi bir kez ve güç vermez');
      tore++;
    }
  };
  while (s.genclik && s.genclik.adim !== 'karar' && guard++ < 20) {
    const y = s.genclik;
    chooseYouthEvent(s, years % 2);
    if (y.adim !== 'hazir' || !y.rakip || y.tur !== 'yari') break;
    round(y);
    if ((y.adim as string) !== 'sonuc') break;
    nextYouthYear(s);
    years++;
  }
  ok(years === 6 && s.genclik?.adim === 'karar' && s.genclik.yas === 18, `${gecmis}: 6 yıl (12-17) sonra 18'de karar (${years} yıl)`);
  const y = s.genclik!;
  ok(y.unvanlar.length === 6, `${gecmis}: 6 turnuva madalyası (${y.unvanlar.map((u) => u.madalya[0]).join('')}), karne ${y.rekor.g}-${y.rekor.m}, hızlı geçilen yarı final ${sims}, rakip finali ${rivalBouts}`);
  ok(tore === 6, gecmis + ': her yıl madalya töreni ikiye katlanabildi (' + tore + ')');
  ok((s.hatiralar ?? []).filter((h) => h.kat === 'genclik').length === 6, `${gecmis}: madalyalar Hatıralar'ın Gençlik sekmesinde`);
  ok(new Set(y.gorulen).size === y.gorulen.length, `${gecmis}: olaylar tekrar etmedi`);
  {
    const para = s.para;
    const t1 = youthSponsor(s);
    ok(!!t1 && s.para === para + YOUTH_SPONSOR && youthSponsor(s) === null, gecmis + ': sponsorlu başlangıç bir kez');
  }
  stayOneMoreYear(s);
  chooseYouthEvent(s, 0);
  round(y);
  nextYouthYear(s);
  ok(y.adim === 'karar' && y.yas === 19, `${gecmis}: bir yıl daha kalınca 19'da karar`);
  const total = Object.values(y.bonus).reduce((a, b) => a + (b ?? 0), 0);
  graduateYouth(s);
  ok(s.phase === 'hub' && !s.genclik && s.fighter.yas === 19 && s.fighter.baslangicYasi === 19, `${gecmis}: MMA'ya 19 yaşında geçti`);
  const gain = STAT_KEYS.reduce((a, k) => a + (s.fighter.stats[k] - before[k]), 0);
  ok(gain === total && total >= 3 && total <= YOUTH_BONUS_MAX, `${gecmis}: kazanım ${total} puan (tavan ${YOUTH_BONUS_MAX}) istatistiklere işlendi`);
  ok(s.rekor.g + s.rekor.m === 0 && s.amator.g + s.amator.m === 0 && s.gecmis.length === 0, `${gecmis}: MMA ve amatör karnesi boş`);
  ok(!!s.gencGecmis && s.gencGecmis.unvanlar.length === 7, `${gecmis}: gençlik özeti kaldı`);
  const seri = s.gencGecmis?.rakip;
  ok(!seri || (s.ezeli?.kaynak === 'genclik' && s.ezeli.g === seri.m && s.ezeli.m === seri.g), `${gecmis}: genç rakip MMA'da ezeli rakip (${seri ? `${seri.g}-${seri.m}` : 'karşılaşmadınız'})`);
}
ok(YOUTH_EVENTS.length >= 20, `olay havuzu ${YOUTH_EVENTS.length}`);
console.log(fail ? `${fail} HATA` : 'hepsi geçti');
process.exit(fail ? 1 : 0);
