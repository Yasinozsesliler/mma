// Dövüş Sporları Ligleri: npx tsx scripts/sport-test.ts
import { createGame, rollStartingStats } from '../src/engine/character';
import { applyLiveRound, nextRound, oppStatsOf, startLiveRound } from '../src/engine/fight';
import { liveCreate, liveInput, liveResult, liveStep, type LiveInput } from '../src/engine/liveFight';
import { setSeed } from '../src/engine/rng';
import { ACHIEVEMENTS } from '../src/engine/achievements';
import { checkAchievements } from '../src/engine/legacy';
import { acceptSportInvite, SPORTS, canBook, closeSportBout, finishSportFight, maybeSportInvite, recOf, requestSportBout, startSportFight, withdrawSportBout } from '../src/engine/sportLeague';
import { legalTactic, type Sport } from '../src/engine/sportRules';
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
ok(!canBook(createGame(input, rollStartingStats(input))), 'amatörde ligler kapalı');

const INPUTS: LiveInput[] = ['jab', 'direkt', 'tekme', 'kac', 'gard', 'indir', 'sub', 'kalk', 'ozel', 'direkt', 'indir'];
const N = 30;
const SPECIAL: Record<Sport, string> = { boks: 'kombo', muaythai: 'diz', grappling: 'guardCek', gures: 'suplex' };
for (const sp of ['boks', 'muaythai', 'grappling', 'gures'] as Sport[]) {
  const say: Record<string, number> = {};
  const add = (k: string, n = 1) => (say[k] = (say[k] ?? 0) + n);
  let wins = 0;
  for (let n = 0; n < N; n++) {
    const s = fresh();
    const rek = JSON.stringify(s.rekor);
    requestSportBout(s, sp);
    if (s.phase !== 'sporLig' || !s.sporMac) add('akis');
    startSportFight(s);
    let fs = s.sporMac!.dovus!;
    if (fs.mods.kural !== sp) add('kural');
    let guard = 0;
    while (fs.durum !== 'bitti' && guard++ < 10) {
      if (fs.durum === 'rauntSonu') fs = nextRound(fs);
      fs = startLiveRound(fs, (['takedown', 'clinch', 'baski', 'kontra', 'mesafe'] as const)[n % 5]);
      if (legalTactic(sp, fs.taktik!) !== fs.taktik || legalTactic(sp, fs.rakipTaktik!) !== fs.rakipTaktik) add('taktik');
      const sim = liveCreate(fs, oppStatsOf(fs), 0, undefined, { kind: n % 2 ? 'suplex' : 'kafaTekmesi', imza: false });
      const sk = sim.special?.kind;
      if (sp === 'muaythai' ? sk === 'suplex' || sk === 'guardCek' : sp === 'grappling' ? sk !== 'suplex' && sk !== 'guardCek' : sk !== SPECIAL[sp]) add('ozel');
      for (let t = 0; t < 32_000 && !sim.over; t += 50) {
        liveStep(sim, t);
        if (t % 300 === 0) liveInput(sim, INPUTS[(t / 300 + n) % INPUTS.length]);
        if (sim.kilit) add('kilitAn');
      }
      for (const e of sim.events) {
        if (e.kind === 'oAttack') add(`o:${e.alt}`);
        if (e.kind === 'pAttack') add(`p:${e.alt}`);
        if (e.kind === 'td' && e.alt === 'ok') add('td');
        if (e.kind === 'ground') add('yer');
        if (e.kind === 'kilit') add('kilit');
        if (e.kind === 'sub' && e.alt === 'tus') add('tus');
      }
      fs = applyLiveRound(fs, liveResult(sim));
    }
    if (fs.durum !== 'bitti') add('bitmedi');
    s.sporMac!.dovus = fs;
    finishSportFight(s);
    if (s.sporMac?.kazandi) wins++;
    if (JSON.stringify(s.rekor) !== rek) add('mmaKarne');
    closeSportBout(s);
    if (s.phase !== 'hub' || s.sporMac) add('akis');
  }
  const r = (k: string) => say[k] ?? 0;
  const strikes = r('o:jab') + r('o:power') + r('o:kick') + r('o:gnp') + r('p:jab') + r('p:direkt') + r('p:tekme') + r('p:yumruk') + r('p:dirsek');
  console.log(`  ${sp}:`, JSON.stringify(say), `galibiyet ${wins}/${N}`);
  ok(!r('akis') && !r('kural') && !r('taktik') && !r('ozel') && !r('bitmedi') && !r('mmaKarne'), `${sp}: akış, kural, taktik, özel hamle doğru; MMA karnesi değişmedi`);
  if (sp === 'boks') ok(!r('o:kick') && !r('p:tekme') && !r('yer') && !r('kilit'), 'boks: tekme, yer ve kilit yok');
  if (sp === 'muaythai') ok(r('p:tekme') > 0 && r('p:diz') > 0 && !r('yer') && !r('kilit'), "muay thai: tekme ve diz var; yer ve kilit yok");
  if (sp === 'grappling') ok(strikes === 0 && r('yer') > 0 && r('kilit') > 0 && !r('tus'), 'grappling: vuruş yok; indirme ve kilit var; tuş yok');
  if (sp === 'gures') ok(strikes === 0 && r('yer') > 0 && !r('kilit') && !r('kilitAn'), 'güreş: vuruş ve kilit yok; indirme var');
  if (sp === 'gures') ok(r('tus') > 0 && r('tus') < N * 0.6, `güreş: tuş oluyor ama her maç değil (${r('tus')}/${N})`);
  ok(wins < N - 2, `${sp}: rastgele düğmeyle kolay kazanılmıyor (${wins}/${N})`);
}

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
ok((s.ozelKozmetik ?? []).includes('kem_lig_boks') && (r.kemerler ?? 0) === 1, 'lig kemeri dolaba eklendi, kemer sayacı 1');
ok((s.hatiralar ?? []).some((h) => h.id === 'lig_kemer'), 'müze vitrini: başka bir sporun kemeri');
ok((s.sosyal ?? []).some((p) => p.yazar === SPORTS.boks.ad()), "lig Kafesgram'da paylaştı");
const ach = checkAchievements(s);
ok(ACHIEVEMENTS.some((a) => a.id === 'lig_kemer') && ach.includes(ACHIEVEMENTS.find((a) => a.id === 'lig_kemer')!.ad), `kemer başarımı açıldı (${ach.join(', ')})`);
s.sporSon = -99;
requestSportBout(s, 'gures');
withdrawSportBout(s);
ok(!s.sporMac && s.phase === 'hub' && recOf(s, 'gures').g === 0, 'vazgeçince karne değişmeden çıkılır');
let davet = 0;
let bad = 0;
for (let i = 0; i < 50; i++) {
  const g = fresh();
  maybeSportInvite(g);
  if (g.sporDavet) {
    davet++;
    if (g.sporDavet.spor !== 'gures' && i % 2) bad += 0; // güreş kökenli: çoğunlukla güreş daveti
    acceptSportInvite(g);
    if (!g.sporMac) bad++;
  }
}
ok(davet > 5 && davet < 45 && bad === 0, `davetler geliyor ve kabul edilebiliyor (${davet}/50)`);
console.log(fail ? `${fail} HATA` : 'hepsi geçti');
process.exit(fail ? 1 : 0);
