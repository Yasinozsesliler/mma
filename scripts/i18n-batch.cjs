// Yeni dil çevirisi için iş parçaları: Türkçe anahtar + İngilizce karşılık, henüz çevrilmemiş olanlardan sırayla.
// Kullanım: node scripts/i18n-batch.cjs <dil> <adet> [çıktı.json]   → çevrilecek parçayı yazar
//           node scripts/i18n-batch.cjs <dil> durum                 → ilerleme
// Çevirmen çıktısı {anahtar: çeviri} biçiminde scripts/i18n/<dil>-extra.json'a eklenir (bkz. i18n-add.cjs).
const fs = require('fs');
const path = require('path');
const [lang, n, out] = process.argv.slice(2);
const en = (() => {
  const t = fs.readFileSync(path.join(__dirname, '../src/i18n/en.ts'), 'utf8');
  return JSON.parse('{' + t.slice(t.indexOf('{') + 1, t.lastIndexOf('}')).trim().replace(/,\s*$/, '') + '}');
})();
const doneF = path.join(__dirname, 'i18n', `${lang}-extra.json`);
const done = fs.existsSync(doneF) ? JSON.parse(fs.readFileSync(doneF, 'utf8')) : {};
const todo = Object.keys(en).filter((k) => !(k in done));
if (n === 'durum') {
  console.log(`${lang}: ${Object.keys(done).length} çevrildi, ${todo.length} kaldı (toplam ${Object.keys(en).length})`);
  process.exit(0);
}
const part = todo.slice(0, Number(n) || 200).map((k) => ({ k, e: en[k] }));
fs.writeFileSync(out || path.join(__dirname, `../.i18n-${lang}-todo.json`), JSON.stringify(part, null, 0));
console.log(`${part.length} metin yazıldı`);
