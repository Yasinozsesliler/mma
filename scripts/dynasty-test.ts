// Nesil modu testi: emekli kariyerden miras, çocuğa uygulama, üç nesillik hanedan.
// Çalıştırma: npx tsx scripts/dynasty-test.ts
import { createGame, rollStartingStats } from '../src/engine/character';
import { applyHeritage, dynastyScore, heritageOf } from '../src/engine/dynasty';
import { setSeed } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';

setSeed(3);
const base = { ad: 'Kerem', soyad: 'Demir', lakap: 'Çelik', uyruk: 'tr', memleket: 'Trabzon', yas: 22, siklet: 'welter' as const, gecmis: 'gures' as const, hikaye: '' };
let fails = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) fails++;
};

let parent: GameState = createGame(base, rollStartingStats(base));
Object.assign(parent, { para: 5_000_000, populerlik: 90, hof: true, phase: 'emeklilik' });
parent.rekor = { ...parent.rekor, g: 28, m: 3, b: 0, ko: 14, sub: 6 };
parent.kemerler = [{ org: 'ufc', savunma: 4 } as never, { org: 'pfl', savunma: 1 } as never];
parent.isletmeler = [{ id: 'akademi', seviye: 3 } as never];

for (let n = 2; n <= 3; n++) {
  const h = heritageOf(parent);
  check(h.nesil === n, `nesil ${n}`);
  check(h.para <= 200_000, `miras üst sınırı (${h.para})`);
  check(h.hanedan.length === n - 1, `hanedan listesi ${h.hanedan.length}`);
  const inp = { ...base, ad: `Çocuk${n}`, soyad: h.soyad, uyruk: h.uyruk, memleket: h.memleket, gecmis: h.gecmis };
  const child = createGame(inp, rollStartingStats(inp));
  const before = { para: child.para, stat: child.fighter.stats[h.enIyi] };
  applyHeritage(child, h);
  check(child.para === before.para + h.para, 'para eklendi');
  check(child.fighter.stats[h.enIyi] === Math.min(95, before.stat + 3), `+3 ${h.enIyi}`);
  check(child.takim.antrenor === `${h.ebeveyn.ad} ${h.ebeveyn.soyad}`, `antrenör: ${child.takim.antrenor}`);
  check(child.takim.antrenorKalite >= 4 && child.takim.antrenorKalite <= 9, `antrenör kalitesi ${child.takim.antrenorKalite}`);
  check((child.isletmeler ?? []).some((x) => x.id === 'akademi'), `akademi devralındı · salon: ${child.takim.salon}`);
  check(child.haberler[0].includes(inp.ad), 'haber satırı');
  check(dynastyScore(child) >= h.hanedan.reduce((a, x) => a + x.efsane, 0), `hanedan puanı ${dynastyScore(child)}`);
  JSON.parse(JSON.stringify(child));
  Object.assign(child, { phase: 'emeklilik' });
  parent = child;
}
console.log(fails ? `${fails} HATA` : 'Tümü geçti');
process.exit(fails ? 1 : 0);
