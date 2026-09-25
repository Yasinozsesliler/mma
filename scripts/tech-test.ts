// Teknik çalışması ustalık veriyor mu? Kamp takvimi üzerinden dener.
import { createGame, rollStartingStats } from '../src/engine/character';
import { findNextFight, pickOpponent } from '../src/engine/career';
import { campChoose } from '../src/engine/camp';
import { xpNeed } from '../src/engine/techniques';

const input = { ad: 'Test', soyad: 'Bot', lakap: 'Sim', uyruk: 'tr', memleket: '', yas: 24, siklet: 'hafif' as const, gecmis: 'bjj' as const, hikaye: '' };
const s = createGame(input, rollStartingStats(input));
s.stage = 'bolgesel';
console.log('Başlangıç:', JSON.stringify(s.teknik));
findNextFight(s);
pickOpponent(s, 0);
const k = s.pending.kamp!;
console.log('Maç', k.macHafta, 'hafta sonra, adım', k.step);
campChoose(s, 4);
console.log('Kamp 4 hafta, serbest', k.serbest, 'adım', k.step);
for (let i = 0; i < 6 && k.step === 'takvim'; i++) {
  const ev = (k.olaylar ?? []).find((e) => e.idx === (k.takvimIdx ?? 0) && !e.sonuc);
  campChoose(s, ev ? 'olay:0' : 'teknik:rnc');
  console.log(`hafta ${i + 1}: rnc`, JSON.stringify(s.teknik!.rnc), 'gerekli', xpNeed(s.teknik!.rnc.sv), '|', k.takvimLog![0]);
}
