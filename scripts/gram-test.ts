// Fotoğraf paylaşımı testi: haftalık sınır, kilitler, tekrar cezası ve bir yıllık takipçi etkisi.
// Çalıştırma: npx tsx scripts/gram-test.ts
import { advanceWeeks, createGame, rollStartingStats } from '../src/engine/character';
import { followers } from '../src/engine/fame';
import { photoLock, sharePhoto, type PhotoKind } from '../src/engine/gram';
import { setSeed } from '../src/engine/rng';
import type { GameState, Stage } from '../src/engine/types';

setSeed(5);
const input = { ad: 'Test', soyad: 'Kişi', lakap: '', uyruk: 'tr', memleket: '', yas: 25, siklet: 'welter' as const, gecmis: 'boks' as const, hikaye: '' };
const fresh = (stage: Stage, takipci: number): GameState => {
  const s = createGame(input, rollStartingStats(input));
  s.stage = stage;
  s.takipci = takipci;
  s.para = 1_000_000;
  return s;
};

const s = fresh('bolgesel', 20_000);
console.log('Kilitler:', (['zafer', 'kemer', 'afis', 'luks', 'evcil', 'sponsor'] as PhotoKind[]).map((k) => `${k}: ${photoLock(s, k) ?? 'açık'}`).join(' | '));
console.log('1.', sharePhoto(s, 'antrenman', { caption: 'Kamp' }));
console.log('2. (aynı hafta)', sharePhoto(s, 'taraftar'));
advanceWeeks(s, 1);
console.log('3.', sharePhoto(s, 'antrenman'));
advanceWeeks(s, 1);
console.log('4. (pro)', sharePhoto(s, 'aile', { pro: true }));
s.gecmis.unshift({ rakip: 'X Y', org: 'amator', sonuc: 'M', yontem: 'KO', raunt: 1, yas: 25 });
s.sonMacHafta = s.hafta;
s.envanter.push('araba2');
advanceWeeks(s, 1);
console.log('5. (yenilgi sonrası lüks)', sharePhoto(s, 'luks'));

// Bir yıl boyunca her hafta en iyi açık fotoğraf: takipçi kaç kat artıyor?
for (const [stage, start] of [['amator', 300], ['bolgesel', 20_000], ['buyuk', 300_000], ['ufc', 3_000_000]] as const) {
  const rows: number[] = [];
  for (let n = 0; n < 50; n++) {
    const x = fresh(stage, start);
    const kinds: PhotoKind[] = ['antrenman', 'aile', 'taraftar'];
    for (let w = 0; w < 52; w++) {
      sharePhoto(x, kinds[w % 3]);
      advanceWeeks(x, 1);
    }
    rows.push(followers(x) / start);
  }
  rows.sort((a, b) => a - b);
  console.log(`${stage.padEnd(9)} 52 haftalık fotoğrafla takipçi ×${rows[25].toFixed(2)} (min ×${rows[0].toFixed(2)}, max ×${rows[49].toFixed(2)})`);
}
