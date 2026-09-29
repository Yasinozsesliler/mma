// Kadın kariyeri testi: rakipler, isimler, görünüm ve sıkletler.
// Çalıştırma: npx tsx scripts/women-test.ts
import { weightOptions } from '../src/engine/career';
import { createGame, rollStartingStats } from '../src/engine/character';
import { femSurname, NAME_POOLS } from '../src/engine/data';
import { ensureDivision } from '../src/engine/division';
import { generateOpponent } from '../src/engine/opponents';
import { setSeed } from '../src/engine/rng';
import { lookFor } from '../src/engine/tale';

setSeed(4);
let fails = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) fails++;
};
const input = { ad: 'Elif', soyad: 'Yıldırım', lakap: 'Kobra', uyruk: 'tr', memleket: 'İzmir', yas: 22, siklet: 'horoz' as const, gecmis: 'boks' as const, hikaye: '', kadin: true, gorunum: { ten: 2, sac: 'atkuyrugu' as const, sacRenk: 1, goz: 0, sakal: 'kirli' as const, yara: false, dovme: false } };
const s = createGame(input, rollStartingStats(input));
check(s.fighter.kadin === true && s.fighter.gorunum?.kadin === true && s.fighter.gorunum?.sakal === 'yok', 'oyuncu kadın, sakal yok');
const female = new Set(NAME_POOLS.flatMap((p) => p.kadin));
const opps = Array.from({ length: 60 }, () => generateOpponent(s, { zorluk: 0 }));
check(opps.every((o) => o.kadin && female.has(o.ad)), `60 rakibin hepsi kadın adıyla (ör. ${opps.slice(0, 4).map((o) => `${o.ad} ${o.soyad}`).join(', ')})`);
const slav = opps.filter((o) => /ova$|eva$|ina$|ska$|cka$/.test(o.soyad));
check(!opps.some((o) => /(ov|ev|ski|cki)$/.test(o.soyad)), `slav soyadları kadın biçiminde (${slav.slice(0, 3).map((o) => o.soyad).join(', ') || 'örnek yok'})`);
check(femSurname('Volkov') === 'Volkova' && femSurname('Grabowski') === 'Grabowska' && femSurname('Волков') === 'Волкова' && femSurname('Nowak') === 'Nowak', 'femSurname kuralları');
const looks = opps.map((o) => lookFor(o));
check(looks.every((l) => l.kadin && l.sakal === 'yok' && l.sac !== 'kel' && l.sac !== 'mohawk'), 'rakip yüzleri kadın (sakalsız)');
s.stage = 'bolgesel';
s.contract = { org: 'cfc', kalan: 3, ucret: 5000, bonus: 5000, munhasir: true };
ensureDivision(s);
check(!!s.bolum && s.bolum.liste.every((o) => o.kadin) && (!s.bolum.sampiyon || s.bolum.sampiyon.kadin === true), 'sıralama ve şampiyon kadın');
const w = weightOptions(s).map((x) => x.siklet).sort().join(',');
check(w === 'sinek,tuy', `sıklet değişimi yalnızca kadın sıkletleri (${w})`);
s.fighter.siklet = 'tuy';
check(weightOptions(s).map((x) => x.siklet).join(',') === 'horoz', 'tüyden yukarı çıkış yok');
// Erkek kariyeri etkilenmiyor
const m = createGame({ ...input, kadin: false, gorunum: undefined }, rollStartingStats(input));
const mo = Array.from({ length: 20 }, () => generateOpponent(m, { zorluk: 0 }));
check(mo.every((o) => !o.kadin && !female.has(o.ad)), 'erkek kariyerinde rakipler erkek');
console.log(fails ? `${fails} HATA` : 'Tümü geçti');
process.exit(fails ? 1 : 0);
