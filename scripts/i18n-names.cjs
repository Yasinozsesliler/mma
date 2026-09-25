// İsim ağırlıklı bir parçayı üretir: listedeki anahtarlar çevrilir, geri kalanı aynen kalır.
const fs = require('fs');
const k = require('./i18n-catalog.json');
const [n, mapFile] = [Number(process.argv[2]), process.argv[3]];
const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const part = k.slice(n * 250, (n + 1) * 250);
const out = part.map((s) => map[s] ?? s);
const miss = Object.keys(map).filter((x) => !part.includes(x));
if (miss.length) console.warn('Parçada olmayan anahtarlar:', miss);
fs.writeFileSync(`scripts/i18n/en-${n}.json`, JSON.stringify(out, null, 0));
console.log(`en-${n}.json yazıldı (${out.length})`);
