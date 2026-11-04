// ASO sıralama takibi: her ülkede, o ülkenin arama terimleriyle App Store'da kaçıncı sırada çıktığımızı ölçer.
// Apple'ın herkese açık arama servisini kullanır (iTunes Search API); App Store'daki gerçek sıralamaya yakındır, birebir değildir.
// Sonuç store/aso-rank/<tarih>.json dosyasına yazılır; önceki ölçümle karşılaştırma tablosu basılır.
// Çalıştırma: node scripts/aso-rank.mjs
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const APP = 6823537918;
const root = fileURLToPath(new URL('..', import.meta.url));
const dir = `${root}/store/aso-rank`;

// Ülke → arama terimleri (hem mevcut anahtar kelimeler hem 1.0.9 için yerel adaylar)
const TERMS = {
  us: ['mma', 'mma game', 'fighting game', 'mma manager', 'fighter career', 'boxing', 'ufc', 'cage fighting', 'martial arts', 'career sim'],
  gb: ['mma', 'mma game', 'fighting game', 'boxing game', 'cage fighting'],
  tr: ['mma', 'mma oyunu', 'dövüş oyunu', 'kafes dövüşü', 'boks oyunu', 'dövüş', 'kariyer simülasyonu', 'yol'],
  br: ['mma', 'jogo de luta', 'luta', 'vale tudo', 'jiu jitsu', 'lutador', 'jogo mma'],
  mx: ['mma', 'juego de peleas', 'peleas', 'box', 'lucha libre', 'boxeo'],
  es: ['mma', 'juego de peleas', 'lucha', 'boxeo', 'artes marciales'],
  ru: ['мма', 'бои без правил', 'бои', 'бокс', 'файтинг', 'симулятор бойца'],
  pl: ['mma', 'gra mma', 'walki', 'boks', 'walki w klatce'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function rank(country, term) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${country}&entity=software&limit=200`;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 403 || r.status === 429) {
        await sleep(4000 * (i + 1));
        continue;
      }
      const j = await r.json();
      const idx = j.results.findIndex((x) => x.trackId === APP);
      return idx < 0 ? null : idx + 1;
    } catch {
      await sleep(2000);
    }
  }
  return undefined; // ölçülemedi
}

const tarih = new Date().toISOString().slice(0, 10);
const sonuc = {};
for (const [c, terms] of Object.entries(TERMS)) {
  sonuc[c] = {};
  for (const t of terms) {
    sonuc[c][t] = await rank(c, t);
    await sleep(700); // servis dakikada ~20 istek sınırlı
  }
}
mkdirSync(dir, { recursive: true });
const onceki = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== `${tarih}.json`).sort().pop();
const eski = onceki ? JSON.parse(readFileSync(`${dir}/${onceki}`, 'utf8')) : null;
writeFileSync(`${dir}/${tarih}.json`, JSON.stringify(sonuc, null, 1) + '\n');

const fmt = (v) => (v === null ? '200+' : v === undefined ? '?' : `#${v}`);
console.log(`ASO sıralaması ${tarih}${eski ? ` · karşılaştırma: ${onceki.replace('.json', '')}` : ' · ilk ölçüm (başlangıç)'}`);
for (const [c, row] of Object.entries(sonuc)) {
  console.log(`\n[${c.toUpperCase()}]`);
  for (const [t, v] of Object.entries(row)) {
    const e = eski?.[c]?.[t];
    const fark = eski && typeof v === 'number' && typeof e === 'number' ? (e - v > 0 ? ` ▲${e - v}` : e - v < 0 ? ` ▼${v - e}` : ' =') : eski && typeof v === 'number' && e === null ? ' (yeni)' : '';
    console.log(`  ${t.padEnd(22)} ${fmt(v).padStart(5)}${eski ? `   önce ${fmt(e)}` : ''}${fark}`);
  }
}
if (!existsSync(`${dir}/README.md`))
  writeFileSync(`${dir}/README.md`, '# ASO sıralama ölçümleri\n\n`node scripts/aso-rank.mjs` her çalıştığında o günün sıralamasını buraya yazar ve öncekiyle karşılaştırır.\nApple\'ın herkese açık arama servisine dayanır: gerçek App Store sıralamasına yakındır, birebir değildir. "200+" ilk 200 sonuçta yok demektir.\n');
