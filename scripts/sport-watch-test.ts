// Dövüş sporları liglerinde TAKTİK İZLE modu: kurala aykırı anlatım, bitiriş ve seçenek çıkmıyor mu?
// Kullanım: npx tsx scripts/sport-watch-test.ts
import { createGame, rollStartingStats } from '../src/engine/character';
import { chooseTactic, nextRound, resolveCritical, resolveDecision } from '../src/engine/fight';
import { criticalChoices, criticalLabel } from '../src/engine/narration';
import { pick, setSeed } from '../src/engine/rng';
import { requestSportBout, startSportFight } from '../src/engine/sportLeague';
import { SPORT_TACTICS, type Sport } from '../src/engine/sportRules';
import type { FightState } from '../src/engine/types';

let fail = 0;
const ok = (c: boolean, m: string) => {
  console.log((c ? '✓ ' : '✗ ') + m);
  if (!c) fail++;
};
setSeed(21);
const input = { ad: 'Test', soyad: 'Kişi', lakap: '', uyruk: 'tr', memleket: '', yas: 25, siklet: 'welter' as const, gecmis: 'gures' as const, hikaye: '' };
// Anlatımda o sporda geçmemesi gereken ifadeler
const BAD: Record<Sport, RegExp> = {
  boks: /tekme|low kick|takedown|yere indir|bacaklara dal|çift bacak|tek bacağı|mount|guard|submission|kilid|tap att|clinch|klinç|dirsek|kafese|diz(?!ler)/i,
  muaythai: /takedown|yere indir|bacaklara dal|çift bacak|tek bacağı|mount|guard|ground|submission|kilid|tap att|kafese/i,
  grappling: /yumruk|jab|(?<!heel )hook|kros|tekme|dirsek|diz |dizle|nakavt|ground and pound|ground & pound|sağ el|sol el|kombinasyon|kafese/i,
  gures: /yumruk|jab|(?<!heel )hook|kros|tekme|dirsek|diz |dizle|nakavt|ground and pound|ground & pound|sağ el|sol el|kombinasyon|submission|kilid|kafese|guard/i,
};
const BAD_OPT: Record<Sport, RegExp> = {
  boks: /takedown|yere indir|bacağa|clinch|dirsek ve diz|ground/i,
  muaythai: /takedown|yere indir|ground/i,
  grappling: /ground|pound|bas! şimdi|kapışma|jab/i,
  gures: /ground|pound|bas! şimdi|kapışma|jab|kilit/i,
};
const N = 120;
for (const sp of ['boks', 'muaythai', 'grappling', 'gures'] as Sport[]) {
  const bad: string[] = [];
  const badOpt: string[] = [];
  const methods: Record<string, number> = {};
  let decisions = 0;
  let crits = 0;
  for (let n = 0; n < N; n++) {
    const s = createGame(input, rollStartingStats(input));
    s.stage = 'bolgesel';
    s.phase = 'hub';
    requestSportBout(s, sp);
    startSportFight(s);
    let fs: FightState = s.sporMac!.dovus!;
    const seen = new Set<string>();
    const grab = () => fs.log.forEach((l) => seen.add(l));
    for (let g = 0; g < 200 && fs.durum !== 'bitti'; g++) {
      grab();
      if (fs.durum === 'taktik') fs = chooseTactic(fs, pick(SPORT_TACTICS[sp]));
      else if (fs.durum === 'rauntSonu') fs = nextRound(fs, pick(SPORT_TACTICS[sp]));
      else if (fs.durum === 'karar') {
        decisions++;
        for (const o of fs.karar!.secenekler) if (BAD_OPT[sp].test(o.ad + ' ' + o.aciklama)) badOpt.push(o.ad);
        fs = resolveDecision(fs, Math.floor(Math.random() * fs.karar!.secenekler.length));
      } else if (fs.durum === 'kritik') {
        crits++;
        const ch = criticalChoices(fs.kritik!, sp);
        for (const i of ch) if (BAD_OPT[sp].test(criticalLabel(fs.kritik!, i, sp).ad)) badOpt.push(criticalLabel(fs.kritik!, i, sp).ad);
        fs = resolveCritical(fs, pick(ch));
      } else break;
    }
    grab();
    for (const l of seen) if (BAD[sp].test(l)) bad.push(l);
    const m = fs.sonuc?.yontem ?? 'yok';
    methods[m] = (methods[m] ?? 0) + 1;
  }
  console.log(`  ${sp}:`, JSON.stringify(methods), `karar ${decisions}, kritik ${crits}`);
  if (bad.length) console.log('   örnek:', [...new Set(bad)].slice(0, 4));
  if (badOpt.length) console.log('   seçenek:', [...new Set(badOpt)].slice(0, 4));
  ok(!methods.yok, `${sp}: bütün maçlar bitti`);
  ok(bad.length === 0, `${sp}: anlatımda kural dışı hamle yok (${bad.length})`);
  ok(badOpt.length === 0, `${sp}: karar ve kritik anlarda kural dışı seçenek yok`);
  if (sp === 'boks' || sp === 'muaythai') ok(!methods.SUB, `${sp}: submission ile bitiş yok`);
  if (sp === 'grappling' || sp === 'gures') ok(!methods.KO && !methods.TKO, `${sp}: nakavt yok`);
  if (sp === 'gures') ok((methods.SUB ?? 0) > 0, `güreş: tuş oluyor (${methods.SUB ?? 0})`);
  if (sp === 'grappling') ok((methods.SUB ?? 0) > 0, `grappling: submission oluyor (${methods.SUB ?? 0})`);
  if (sp === 'boks') ok((methods.KO ?? 0) + (methods.TKO ?? 0) > 0, `boks: nakavt oluyor`);
}
console.log(fail ? `${fail} HATA` : 'hepsi geçti');
process.exit(fail ? 1 : 0);
