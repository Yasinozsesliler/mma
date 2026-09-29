// Yeni dil çevirisi için kaynak: n. parçanın son İngilizce karşılıkları (en.ts; ek anahtarlar dahil), İngilizcede aynı kalanlar null.
// "extra" verilirse katalogda olmayan ek anahtarları {Türkçe: İngilizce} olarak yazdırır.
// Çalıştırma: node scripts/i18n-from-en.cjs <n|extra>
const fs = require('fs');
const path = require('path');
const k = require('./i18n-catalog.json');
const src = fs.readFileSync(path.join(__dirname, '../src/i18n/en.ts'), 'utf8');
const EN = JSON.parse('{' + src.split('\n').filter((l) => l.startsWith('  "')).map((l) => l.trim().replace(/,$/, '')).join(',') + '}');
const arg = process.argv[2] ?? '0';
if (arg === 'extra') {
  const cat = new Set(k);
  const extra = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n/en-extra.json'), 'utf8'));
  const out = Object.fromEntries(Object.keys(extra).filter((x) => !cat.has(x)).map((x) => [x, EN[x] ?? extra[x]]));
  console.log(JSON.stringify(out, null, 0));
} else {
  const n = Number(arg);
  const part = k.slice(n * 250, (n + 1) * 250);
  console.log(JSON.stringify(part.map((x) => EN[x] ?? null), null, 0));
}
