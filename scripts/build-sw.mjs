// Web derlemesinden sonra çalışır: dist/ içindeki tüm dosyaları service worker'ın ön-önbellek
// listesine yazar ve içerik değiştikçe değişen bir sürüm numarası verir.
// Çalıştırma: node scripts/build-sw.mjs  (npm run build:web bunu otomatik yapar)
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const SKIP = new Set(['sw.js', 'metadata.json']);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const all = walk(dist)
  .map((p) => relative(dist, p).split(sep).join('/'))
  .filter((p) => !SKIP.has(p) && !p.endsWith('.map'))
  .sort();

// Dil sözlükleri (en-*.js, es-*.js …) herkese indirilmez: SW yalnızca oyuncunun seçtiği dilinkini önbelleğe alır.
const LANG_RE = /^_expo\/static\/js\/web\/(en|es|pt|ru)-[0-9a-f]+\.js$/;
const langFiles = {};
for (const f of all) {
  const m = f.match(LANG_RE);
  if (m) langFiles[m[1]] = '/' + encodeURI(f);
}
const files = all.filter((f) => !LANG_RE.test(f));

const hash = createHash('sha256');
all.forEach((f) => hash.update(f).update(readFileSync(join(dist, f))));
const version = hash.digest('hex').slice(0, 12);

// index.html kök adres olarak da önbelleğe alınır ("/").
const urls = ['/', ...files.map((f) => '/' + encodeURI(f))];
const swPath = join(dist, 'sw.js');
const sw = readFileSync(swPath, 'utf8').replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(urls, null, 0)).replace('__LANG_FILES__', JSON.stringify(langFiles));
if (sw.includes('__PRECACHE__') || sw.includes('__VERSION__') || sw.includes('__LANG_FILES__')) throw new Error('sw.js şablonu bulunamadı');
writeFileSync(swPath, sw);

const size = files.reduce((a, f) => a + statSync(join(dist, f)).size, 0);
const langSize = Object.values(langFiles).map((u) => statSync(join(dist, decodeURI(u).slice(1))).size);
console.log(`Service worker: ${urls.length} dosya ön-önbellekte (${(size / 1024 / 1024).toFixed(1)} MB) + dil başına ${(Math.max(0, ...langSize) / 1024).toFixed(0)} KB'a kadar, sürüm ${version}`);
