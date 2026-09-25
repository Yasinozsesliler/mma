// scripts/i18n/en-*.json parçalarını katalogla eşleştirip src/i18n/en.ts'e yazar; yer tutucuları denetler.
const fs = require('fs');
const path = require('path');
const k = require('./i18n-catalog.json');
const S = 250;
const dir = path.join(__dirname, 'i18n');
const out = {};
let warn = 0;
for (const f of fs.readdirSync(dir).filter((x) => /^en-\d+\.json$/.test(x)).sort((a, b) => parseInt(a.slice(3)) - parseInt(b.slice(3)))) {
  const n = parseInt(f.slice(3));
  const tr = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const keys = k.slice(n * S, (n + 1) * S);
  if (tr.length !== keys.length) {
    console.error(`${f}: ${tr.length} çeviri, ${keys.length} anahtar bekleniyordu!`);
    process.exitCode = 1;
    continue;
  }
  keys.forEach((key, i) => {
    if (tr[i] === null) tr[i] = key;
    const a = (key.match(/\{\w+\}/g) ?? []).sort().join();
    const b = (tr[i].match(/\{\w+\}/g) ?? []).sort().join();
    if (a !== b) {
      const missing = (key.match(/\{\w+\}/g) ?? []).filter((x) => !tr[i].includes(x));
      const extra = (tr[i].match(/\{\w+\}/g) ?? []).filter((x) => !key.includes(x));
      if (extra.length || !/’\{\d\}/.test(key)) {
        warn++;
        console.warn(`⚠ [${n * S + i}] yer tutucu farkı: eksik ${missing} fazla ${extra}\n   TR: ${key}\n   EN: ${tr[i]}`);
      }
    }
    if (tr[i] !== key) out[key] = tr[i];
  });
}
// Kod düzeltmeleriyle gelen, katalogda olmayan ek anahtarlar.
const extraF = path.join(dir, 'en-extra.json');
if (fs.existsSync(extraF)) Object.assign(out, JSON.parse(fs.readFileSync(extraF, 'utf8')));
const body = Object.entries(out).map(([a, b]) => `  ${JSON.stringify(a)}: ${JSON.stringify(b)},`).join('\n');
fs.writeFileSync(path.join(__dirname, '../src/i18n/en.ts'), `// İngilizce sözlük (anahtar: Türkçe kaynak metin). scripts/i18n-merge.cjs ile üretilir.\nexport const EN: Record<string, string> = {\n${body}\n};\n`);
console.log(`Çevrilen: ${Object.keys(out).length} / ${k.length} · uyarı: ${warn}`);
