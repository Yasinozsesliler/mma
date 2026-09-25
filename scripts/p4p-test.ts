// P4P: liste oluşur, UFC başarılarıyla oyuncu listeye girer ve yükselir.
import { createGame, rollStartingStats } from '../src/engine/character';
import { ensureP4P, p4pRank, playerP4PScore, updateP4P } from '../src/engine/p4p';

const input = { ad: 'Test', soyad: 'Bot', lakap: 'Sim', uyruk: 'tr', memleket: '', yas: 26, siklet: 'hafif' as const, gecmis: 'boks' as const, hikaye: '' };
const s = createGame(input, rollStartingStats(input));
s.stage = 'ufc';
ensureP4P(s);
console.log('Liste:', s.p4p!.liste.length, 'kişi, en üst puan', s.p4p!.liste[0].puan, '· şampiyon sayısı', s.p4p!.liste.filter((e) => e.sampiyon).length);
for (let i = 0; i < 14; i++) {
  s.gecmis.unshift({ rakip: 'X', org: 'ufc', sonuc: 'G', yontem: i % 2 ? 'KO' : 'Oybirliği', raunt: 2, yas: 28 });
  s.seri = i + 1;
  if (i === 5) s.kemerler = [{ org: 'ufc', siklet: 'hafif', hafta: 1, yas: 28, savunma: 0, aktif: true }];
  if (i > 5) s.kemerler![0].savunma++;
  const note = updateP4P(s);
  if (note) console.log(`${i + 1}. UFC galibiyeti → puan ${playerP4PScore(s)}, sıra ${p4pRank(s)} · ${note}`);
}
