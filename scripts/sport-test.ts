// Dövüş Sporları Ligi (boks): npx tsx scripts/sport-test.ts
import { createGame, rollStartingStats } from '../src/engine/character';
import { applyLiveRound, nextRound, startLiveRound } from '../src/engine/fight';
import { liveCreate, liveInput, liveResult, liveStep, type LiveInput } from '../src/engine/liveFight';
import { oppStatsOf } from '../src/engine/fight';
import { setSeed } from '../src/engine/rng';
import { acceptSportInvite, canBook, closeSportBout, finishSportFight, maybeSportInvite, recOf, requestSportBout, startSportFight, withdrawSportBout } from '../src/engine/sportLeague';
import { legalTactic } from '../src/engine/sportRules';
import type { GameState } from '../src/engine/types';

let fail = 0;
const ok = (c: boolean, m: string) => {
  console.log((c ? '✓ ' : '✗ ') + m);
  if (!c) fail++;
};
setSeed(11);
const input = { ad: 'Test', soyad: 'Kişi', lakap: '', uyruk: 'tr', memleket: '', yas: 25, siklet: 'welter' as const, gecmis: 'gures' as const, hikaye: '' };
const fresh = (): GameState => {
  const s = createGame(input, rollStartingStats(input));
  s.stage = 'bolgesel';
  s.phase = 'hub';
  return s;
};

const s0 = createGame(input, rollStartingStats(input));
ok(!canBook(s0), 'amatörde lig kapalı');

const INPUTS: LiveInput[] = ['jab', 'direkt', 'tekme', 'kac', 'gard', 'indir', 'sub', 'kalk', 'ozel'];
let bad = 0;
let kicks = 0;
let wins = 0;
let knees = 0;
let mtKicks = 0;
const N = 40;
for (let n = 0; n < N * 2; n++) {
  const sp = n < N ? 'boks' : 'muaythai';
  const s = fresh();
  const rek = JSON.stringify(s.rekor);
  requestSportBout(s, sp);
  if (n === 0) ok((s.phase === 'sporLig' && !!s.sporMac), 'maç istendi, lig ekranına geçildi');
  startSportFight(s);
  let fs = s.sporMac!.dovus!;
  if (n === 0) ok(fs.mods.kural === 'boks' && fs.maxRaunt === 3, 'boks kuralı, 3 raunt');
  let guard = 0;
  while (fs.durum !== 'bitti' && guard++ < 10) {
    if (fs.durum === 'rauntSonu') fs = nextRound(fs);
    fs = startLiveRound(fs, (['takedown', 'clinch', 'baski', 'kontra', 'mesafe'] as const)[n % 5]);
    if (legalTactic(sp, fs.taktik!) !== fs.taktik || legalTactic(sp, fs.rakipTaktik!) !== fs.rakipTaktik) bad++;
    const sim = liveCreate(fs, oppStatsOf(fs), 0, undefined, { kind: 'suplex', imza: false });
    if (sim.special?.kind !== (sp === 'boks' ? 'kombo' : 'diz')) bad++;
    for (let t = 0; t < 32_000 && !sim.over; t += 50) {
      liveStep(sim, t);
      if (t % 300 === 0) liveInput(sim, INPUTS[(t / 300 + n) % INPUTS.length]);
      if (sim.ground || sim.kilit) bad++;
    }
    const kickEv = sim.events.filter((e) => (e.kind === 'oAttack' && e.alt === 'kick') || (e.kind === 'pAttack' && e.alt === 'tekme')).length;
    if (sp === 'boks') kicks += kickEv;
    else mtKicks += kickEv;
    knees += sim.events.filter((e) => e.kind === 'pAttack' && e.alt === 'diz').length;
    kicks += sim.events.filter((e) => e.kind === 'td' || e.kind === 'ground' || e.kind === 'sub').length;
    fs = applyLiveRound(fs, liveResult(sim));
  }
  if (n === 0) ok(fs.durum === 'bitti', 'maç bitti');
  s.sporMac!.dovus = fs;
  const para = s.para;
  finishSportFight(s);
  if (s.sporMac?.kazandi && sp === 'boks') wins++;
  if (n === 0) {
    ok(s.sporMac?.adim === 'sonuc' && (s.sporMac.notlar ?? []).length > 0, 'sonuç notları yazıldı');
    ok(s.para > para, 'ücret ödendi');
    const r = recOf(s, sp);
    ok(r.g + r.m + (fs.sonuc?.kazanan === 'berabere' ? 1 : 0) === 1, 'lig karnesine işlendi');
  }
  if (JSON.stringify(s.rekor) !== rek) bad++;
  closeSportBout(s);
  if (s.phase !== 'hub' || s.sporMac) bad++;
  if (n === 0) ok(!canBook(s), 'maçtan sonra bekleme süresi var');
}
ok(bad === 0, `kural ihlali / MMA karnesi değişmesi yok (${bad})`);
ok(kicks === 0, `boksta tekme yok; iki ligde de indirme, yer ve submission yok (${kicks})`);
ok(mtKicks > 0 && knees > 0, `Muay Thai'de tekme ve klinç dizi var (${mtKicks} tekme, ${knees} diz)`);
ok(wins < N - 3, `rastgele düğmeyle kolay kazanılmıyor: ${wins}/${N}`);

// Kemer yolu
const s = fresh();
for (let i = 0; i < 12; i++) {
  s.sporSon = -99;
  requestSportBout(s, 'boks');
  startSportFight(s);
  const fs = s.sporMac!.dovus!;
  fs.sonuc = { kazanan: 'p', yontem: 'KO', raunt: 1, sure: '1:00', aciklama: '' };
  fs.durum = 'bitti';
  finishSportFight(s);
  closeSportBout(s);
}
const r = recOf(s, 'boks');
ok(r.kemer && r.savunma > 0, `kemer kazanıldı ve savunuldu (${r.g}-${r.m}, savunma ${r.savunma})`);
ok(r.bonus === 8, 'gelişim puanı tavanı 8');
// Vazgeçme
s.sporSon = -99;
requestSportBout(s, 'boks');
withdrawSportBout(s);
ok(!s.sporMac && s.phase === 'hub', 'vazgeçince karne değişmeden çıkılır');
// Davet
let davet = 0;
for (let i = 0; i < 50; i++) {
  const g = fresh();
  maybeSportInvite(g);
  if (g.sporDavet) {
    davet++;
    acceptSportInvite(g);
    if (!g.sporMac) bad++;
  }
}
ok(davet > 5 && davet < 45 && bad === 0, `davetler geliyor ve kabul edilebiliyor (${davet}/50)`);
console.log(fail ? `${fail} HATA` : 'hepsi geçti');
process.exit(fail ? 1 : 0);
