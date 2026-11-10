// Çeviri parçasını (JSON dizi: her öğe bir çeviri, iş parçasıyla aynı sırada) <dil>-extra.json'a ekler; yer tutucuları denetler.
// Kullanım: node scripts/i18n-add.cjs <dil> <iş-parçası.json> <çeviriler.json>
const fs = require('fs');
const path = require('path');
const [lang, partF, trF] = process.argv.slice(2);
const part = JSON.parse(fs.readFileSync(partF, 'utf8'));
const tr = JSON.parse(fs.readFileSync(trF, 'utf8'));
if (part.length !== tr.length) throw new Error(`sayı uyuşmuyor: ${part.length} metin, ${tr.length} çeviri`);
const doneF = path.join(__dirname, 'i18n', `${lang}-extra.json`);
const done = fs.existsSync(doneF) ? JSON.parse(fs.readFileSync(doneF, 'utf8')) : {};
let warn = 0;
part.forEach(({ k }, i) => {
  const a = (k.match(/\{\w+\}/g) ?? []).sort().join();
  const b = (tr[i].match(/\{\w+\}/g) ?? []).sort().join();
  if (a !== b) {
    warn++;
    console.warn(`⚠ yer tutucu farkı [${i}]: ${k.slice(0, 60)} → ${tr[i].slice(0, 60)}`);
    return;
  }
  done[k] = tr[i];
});
fs.writeFileSync(doneF, JSON.stringify(done, null, 0));
console.log(`eklendi ${part.length - warn}, uyarı ${warn}, toplam ${Object.keys(done).length}`);
