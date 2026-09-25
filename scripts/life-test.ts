// Yaşam sistemleri testi: gece hayatı riski, tedavi, kadro maaşları ve hayvan bakımı.
// Çalıştırma: npx tsx scripts/life-test.ts
import { advanceWeeks, createGame, rollStartingStats } from '../src/engine/character';
import { treatDisease, visitStripClub } from '../src/engine/nightlife';
import { adoptPet } from '../src/engine/pets';
import { setSeed } from '../src/engine/rng';
import { hireStaff } from '../src/engine/staff';
import type { GameState } from '../src/engine/types';

setSeed(9);
const input = { ad: 'Test', soyad: 'Kişi', lakap: '', uyruk: 'tr', memleket: '', yas: 25, siklet: 'welter' as const, gecmis: 'boks' as const, hikaye: '' };
const fresh = (): GameState => {
  const s = createGame(input, rollStartingStats(input));
  s.para = 10_000_000;
  s.stage = 'bolgesel';
  return s;
};

// 1) Ziyaret sıklığı → hastalık oranı
for (const [label, perWeek] of [['Ayda bir (sadece izle)', 0.25], ['Haftada bir (VIP)', 1], ['Haftada üç (VIP)', 3]] as const) {
  let sick = 0;
  const N = 400;
  for (let i = 0; i < N; i++) {
    const s = fresh();
    for (let w = 0; w < 26; w++) {
      const visits = perWeek < 1 ? (w % 4 === 0 ? 1 : 0) : perWeek;
      for (let v = 0; v < visits; v++) visitStripClub(s, perWeek < 1 ? 0 : 1);
      advanceWeeks(s, 1);
      if (s.hastalik) {
        sick++;
        break;
      }
    }
  }
  console.log(`${label.padEnd(26)} → 6 ayda enfeksiyon: %${((sick / N) * 100).toFixed(1)}`);
}

// 2) Tedavi süreci
const s = fresh();
for (let i = 0; i < 30 && !s.hastalik; i++) visitStripClub(s, 1);
console.log('Hastalık:', s.hastalik?.ad ?? 'yok');
const h0 = s.saglik;
advanceWeeks(s, 2);
console.log(`Tedavisiz 2 hafta: sağlık ${h0} → ${s.saglik}`);
console.log(treatDisease(s));
advanceWeeks(s, 5);
console.log('Tedaviden 5 hafta sonra hastalık:', s.hastalik ? 'HÂLÂ VAR (hata!)' : 'geçti');

// 3) Kadro maaşı ve hayvan bakımı haftalık düşülüyor mu?
const t = fresh();
hireStaff(t, 'fizyo', 2);
adoptPet(t, 'kangal', 'Karabaş');
const para0 = t.para;
const notes = advanceWeeks(t, 4);
console.log(`4 hafta gider: ${(para0 - t.para).toLocaleString('tr-TR')} $ (beklenen ${(450 * 4 + 70 * 4).toLocaleString('tr-TR')} $)`);
console.log('Notlar:', notes.filter((n) => /Kadro|Hayvan/.test(n)).join(' | '));

// 4) İhmal: para yoksa hayvan mutsuz olur ve hastalanabilir
const u = fresh();
adoptPet(u, 'pitbull', 'Rocky');
u.para = -1000;
advanceWeeks(u, 6);
console.log(`İhmal (6 hafta, parasız): mutluluk ${u.hayvanlar![0].mutluluk}, hasta: ${u.hayvanlar![0].hasta}`);
