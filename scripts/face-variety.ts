// Rakip yüzlerinin çeşitliliği: geçersiz alan sayısı ve farklı yüz kombinasyonları.
import { lookFor } from '../src/engine/tale';
import { uid, pick } from '../src/engine/rng';

const ulkeler = ['ABD', 'Brezilya', 'Rusya', 'Nijerya', 'Türkiye', 'İrlanda', 'Meksika', 'Japonya', 'Kazakistan', 'Polonya'];
const N = 300;
let bozuk = 0;
const yuzler = new Set<string>();
const sac = new Map<string, number>();
for (let i = 0; i < N; i++) {
  const l = lookFor({ id: uid(), uyruk: pick(ulkeler) });
  if (!l.sac || !l.sakal || l.sacRenk < 0 || l.goz < 0) bozuk++;
  sac.set(String(l.sac), (sac.get(String(l.sac)) ?? 0) + 1);
  yuzler.add([l.ten, l.sac, l.sacRenk, l.sakal, l.yuz, l.burun, l.gozSekil, l.dudak, l.kas, l.kulak].join('|'));
}
console.log(`${N} rakip: geçersiz alanlı ${bozuk}, farklı yüz ${yuzler.size}`);
console.log('Saç dağılımı:', Object.fromEntries(sac));
