// Seyrek çeviri: {indeks: metin} JSON'unu 250'lik tam diziye çevirir (eksikler null = aynı kalır).
const fs = require('fs');
const [lang, ns, file] = process.argv.slice(2);
const n = Number(ns);
const k = require('./i18n-catalog.json');
const len = k.slice(n * 250, (n + 1) * 250).length;
const m = JSON.parse(fs.readFileSync(file, 'utf8'));
const arr = Array.from({ length: len }, (_, i) => m[i] ?? null);
fs.writeFileSync(`${__dirname}/i18n/${lang}-${n}.json`, JSON.stringify(arr, null, 0));
