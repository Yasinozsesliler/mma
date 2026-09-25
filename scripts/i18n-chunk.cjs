// Katalogdan n. parçayı (250'lik) JSON dizisi olarak yazdırır.
const k = require('./i18n-catalog.json');
const n = Number(process.argv[2] ?? 0);
const S = 250;
const part = k.slice(n * S, (n + 1) * S);
console.log(`// parça ${n}: ${n * S}-${n * S + part.length - 1} / ${k.length}`);
console.log(JSON.stringify(part, null, 0).replace(/","/g, '",\n"'));
