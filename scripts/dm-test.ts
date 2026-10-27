// Mesaj kutusu testi: bir yılda kaç mesaj gelir, her şablonun her cevabı çökmeden sonuç üretir mi,
// süre dolan mesaja cevap verilemez mi. Ayrıca profesyonel bölümlerin kademeli açılışı.
// Çalıştırma: npx tsx scripts/dm-test.ts
import { advanceWeeks, createGame, rollStartingStats } from '../src/engine/character';
import { answerDm, dmAfterFight, dmCampStart, dmExpired, dmTick, dmUnread } from '../src/engine/dm';
import { generateOpponent } from '../src/engine/opponents';
import { featureOpen } from '../src/engine/onboarding';
import { setSeed } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';

setSeed(7);
const input = { ad: 'Test', soyad: 'Kişi', lakap: '', uyruk: 'tr', memleket: '', yas: 25, siklet: 'welter' as const, gecmis: 'boks' as const, hikaye: '' };
const fresh = (): GameState => {
  const s = createGame(input, rollStartingStats(input));
  s.stage = 'buyuk';
  s.takipci = 80_000;
  s.para = 200_000;
  s.iliski = { id: 'x', ad: 'Elif', meslek: 'Doktor', emoji: '👩‍⚕️', durum: 'sevgili', hafta: 0 };
  s.gecmis = Array.from({ length: 6 }, () => ({ rakip: 'A B', org: 'pfl' as const, sonuc: 'G' as const, yontem: 'KO', raunt: 1, yas: 25 }));
  return s;
};

// 1) Bir yıl: haftalık mesajlar + 4 kamp + 4 maç sonrası
const s = fresh();
for (let w = 0; w < 52; w++) {
  advanceWeeks(s, 1);
  dmTick(s, 1);
  if (w % 13 === 0) {
    const o = generateOpponent(s, { zorluk: 0, org: 'pfl' });
    s.pending.rakip = o;
    s.pending.kamp = { hafta: 8, hype: 30 } as GameState['pending']['kamp'];
    dmCampStart(s);
    s.pending.kamp = undefined;
    dmAfterFight(s, { o, won: w % 26 === 0, draw: false, finish: true, title: w === 26 });
    s.pending.rakip = undefined;
  }
}
const kinds: Record<string, number> = {};
(s.dm?.liste ?? []).forEach((m) => (kinds[m.tpl] = (kinds[m.tpl] ?? 0) + 1));
console.log(`Bir yılda ${s.dm?.liste.length} mesaj (okunmamış ${dmUnread(s)}):`, kinds);

// 2) Her şablonun her cevabı
let bad = 0;
const seen = new Set<string>();
for (let round = 0; round < 40; round++) {
  const t = fresh();
  t.hafta = 100 + round * 30;
  const o = generateOpponent(t, { zorluk: 0, org: 'pfl' });
  t.rakipler.push(o);
  t.pending.rakip = o;
  t.pending.kamp = { hafta: 8, hype: 30 } as GameState['pending']['kamp'];
  dmCampStart(t);
  t.pending.kamp = undefined;
  dmAfterFight(t, { o, won: round % 2 === 0, draw: false, finish: true, title: round % 5 === 0 });
  t.pending.rakip = undefined;
  for (let i = 0; i < 6; i++) dmTick(t, 4);
  for (const m of t.dm?.liste ?? []) {
    const i = round % m.secenek.length;
    const r = answerDm(t, m.id, i);
    seen.add(`${m.tpl}#${i}`);
    if (!r || r.includes('{') || Number.isNaN(t.para) || Number.isNaN(t.motivasyon)) {
      bad++;
      console.log('SORUN', m.tpl, i, JSON.stringify(r));
    }
  }
}
console.log(`Denenen şablon/cevap: ${seen.size}, sorunlu: ${bad}`);

// 3) Süre dolumu
const e = fresh();
e.hafta = 10;
dmTick(e, 99);
const m = e.dm?.liste[0];
if (m) {
  e.hafta += 9;
  console.log('Süresi dolan mesaj:', dmExpired(e, m), '· cevap:', JSON.stringify(answerDm(e, m.id, 0)));
}

// 4) Kademeli açılış
const g = createGame(input, rollStartingStats(input));
const pro = (n: number) => {
  g.stage = n < 0 ? 'amator' : 'bolgesel';
  g.gecmis = [...Array.from({ length: 4 }, () => ({ rakip: 'A', org: 'amator' as const, sonuc: 'G' as const, yontem: 'KO', raunt: 1, yas: 25 })), ...Array.from({ length: Math.max(0, n) }, () => ({ rakip: 'B', org: 'cfc' as const, sonuc: 'G' as const, yontem: 'KO', raunt: 1, yas: 25 }))];
  return (['siklet', 'hayran', 'marka', 'kulup', 'yayin', 'luks', 'lig'] as const).filter((f) => featureOpen(g, f)).join(',') || '-';
};
console.log('Amatör:', pro(-1), '| pro 0:', pro(0), '| pro 1:', pro(1), '| pro 2:', pro(2), '| pro 3:', pro(3));
