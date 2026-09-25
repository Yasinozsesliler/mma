// Tinder destesi ve başarım sisteminin hızlı doğrulaması.
import { createGame, rollStartingStats } from '../src/engine/character';
import { deck, goOnDate, makePartner, matches, swipe } from '../src/engine/nightlife';
import { ACHIEVEMENTS, checkAchievements, HOF_ACHIEVEMENTS } from '../src/engine/legacy';

const input = { ad: 'Test', soyad: 'Bot', lakap: 'Sim', uyruk: 'tr', memleket: '', yas: 22, siklet: 'hafif' as const, gecmis: 'boks' as const, hikaye: '' };
const s = createGame(input, rollStartingStats(input));
s.para = 1_000_000;
let m = 0, right = 0;
for (let w = 0; w < 20; w++) {
  s.hafta = w;
  const d = deck(s);
  if (d.length !== 10) throw new Error('deste 10 olmalı');
  d.slice().forEach((c, i) => {
    const dir = i === 0 ? 'super' : i % 2 ? 'sag' : 'sol';
    if (dir !== 'sol') right++;
    if (swipe(s, c.id, dir).eslesme) m++;
  });
  if (deck(s).length !== 0) throw new Error('deste boşalmalı');
}
console.log(`Sağa kaydırma: ${right}, eşleşme: ${m} (%${((m / right) * 100).toFixed(0)}), listede: ${matches(s).length}`);
const c = matches(s)[0];
for (let i = 0; i < 10; i++) goOnDate(s, c.id, 2);
console.log(`${c.ad} ilişki: ${matches(s)[0].seviye}`, makePartner(s, c.id) || '(henüz sevgili değil)');
checkAchievements(s);
console.log(`Başarım sayısı: ${ACHIEVEMENTS.length}, benzersiz id: ${new Set(ACHIEVEMENTS.map((a) => a.id)).size}, HOF eşiği: ${HOF_ACHIEVEMENTS.length}`);
console.log('Açılanlar:', (s.basarimlar ?? []).join(', '));
