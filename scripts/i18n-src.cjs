// Yeni dil çevirisi için n. parçayı İngilizce karşılıklarıyla yazdırır (İngilizcede aynı kalanlar null).
const k = require('./i18n-catalog.json');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../src/i18n/en.ts'), 'utf8');
const EN = JSON.parse('{' + src.split('\n').filter((l) => l.startsWith('  "')).map((l) => l.trim().replace(/,$/, '')).join(',') + '}');
const n = Number(process.argv[2] ?? 0);
const part = k.slice(n * 250, (n + 1) * 250);
console.log(`// parça ${n}: ${part.length}`);
console.log('[' + part.map((x) => (EN[x] === undefined ? 'null' : JSON.stringify(EN[x]))).join(',\n') + ']');
