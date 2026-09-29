// Kariyer hikâyeleri testi: her hikâye adım adım ilerler, dövüş aralıklarına uyar ve biter.
// Çalıştırma: npx tsx scripts/stories-test.ts
import { createGame, rollStartingStats } from '../src/engine/character';
import { setSeed } from '../src/engine/rng';
import { chooseStory, STORY_IDS, storyEvent } from '../src/engine/stories';
import type { GameState } from '../src/engine/types';

setSeed(8);
let fails = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) fails++;
};
const input = { ad: 'Kerem', soyad: 'Demir', lakap: '', uyruk: 'tr', memleket: 'Trabzon', yas: 24, siklet: 'welter' as const, gecmis: 'gures' as const, hikaye: '' };
const fresh = (): GameState => {
  const s = createGame(input, rollStartingStats(input));
  s.para = 100000;
  s.stage = 'bolgesel';
  s.takim.menajer = 'Marty Feld';
  s.takim.menajerPay = 0.1;
  s.sakatliklar = [{ ad: 'Diz bağı', stat: 'hiz', ceza: 4, hafta: 8 }];
  for (let i = 0; i < 6; i++) s.gecmis.unshift({ rakip: 'X', org: 'cfc', sonuc: 'G', yontem: 'KO', raunt: 1, yas: 24 });
  return s;
};
const fight = (s: GameState, won = true) => s.gecmis.unshift({ rakip: 'Y', org: 'cfc', sonuc: won ? 'G' : 'M', yontem: 'UD', raunt: 3, yas: 24 });

for (const id of STORY_IDS) {
  for (const secim of [0, 1]) {
    const s = fresh();
    s.hikaye = { id, adim: 0, zaman: s.gecmis.length, veri: id === 'ihanet' ? { ad: 'Emre Kaya' } : id === 'menajer' ? { m: 'Marty Feld' } : {} };
    const seen: string[] = [];
    for (let guard = 0; guard < 12 && s.hikaye; guard++) {
      const ev = storyEvent(s);
      if (!ev) {
        fight(s, guard % 2 === 0);
        continue;
      }
      seen.push(ev.id);
      check(ev.secenekler.length >= 1 && ev.metin.length > 20, `${ev.id} (seçim ${secim}): “${ev.baslik}” · ${ev.secenekler.length} seçenek`);
      const res = chooseStory(s, Math.min(secim, ev.secenekler.length - 1));
      check(typeof res === 'string' && res.length > 5, `  → ${res.slice(0, 70)}`);
    }
    check(!s.hikaye && (s.hikayeler ?? []).includes(id), `${id} (seçim ${secim}) bitti: ${seen.length} adım`);
    check(!storyEvent(s), '  hemen yeni hikâye başlamaz (en az 4 dövüş ara)');
  }
}
console.log(fails ? `${fails} HATA` : 'Tümü geçti');
process.exit(fails ? 1 : 0);
