// App Store Connect metinleri: store/appstore.json (ad, alt başlık, tanıtım, anahtar kelimeler) + açıklama ve sürüm notu
// store/listing.json'dan. Dil başına kopyala-yapıştır dosyası üretir ve Apple sınırlarını denetler.
// Çalıştırma: node scripts/appstore-texts.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const as = JSON.parse(readFileSync(`${root}/store/appstore.json`, 'utf8'));
const play = JSON.parse(readFileSync(`${root}/store/listing.json`, 'utf8'));
const len = (s) => [...s].length;
const LIM = { name: 30, subtitle: 30, promo: 170, keywords: 100, description: 4000, whatsNew: 4000 };
mkdirSync(`${root}/store/appstore-metinleri`, { recursive: true });
let bad = 0;
for (const [k, x] of Object.entries(as)) {
  const p = play[x.listing];
  const f = { name: x.name, subtitle: x.subtitle, promo: x.promo, keywords: x.keywords, description: p.full, whatsNew: p.releaseNotes };
  for (const [key, v] of Object.entries(f)) if (len(v) > LIM[key]) (bad++, console.log(`⚠️ ${k} ${key}: ${len(v)}/${LIM[key]}`));
  const sec = (t, key) => [`=== ${t} (${len(f[key])}/${LIM[key]}) ===`, f[key], ''];
  const txt = [
    `APP STORE CONNECT · ${k}`,
    'Gizlilik politikası: https://mma-five-psi.vercel.app/gizlilik.html · Destek: https://mma-five-psi.vercel.app',
    '',
    ...sec('AD (Name)', 'name'),
    ...sec('ALT BAŞLIK (Subtitle)', 'subtitle'),
    ...sec('TANITIM METNİ (Promotional Text)', 'promo'),
    ...sec('ANAHTAR KELİMELER (Keywords)', 'keywords'),
    ...sec('AÇIKLAMA (Description)', 'description'),
    ...sec('YENİLİKLER (What’s New)', 'whatsNew'),
  ].join('\r\n');
  writeFileSync(`${root}/store/appstore-metinleri/${k}.txt`, '﻿' + txt, 'utf8');
  console.log(k, Object.fromEntries(Object.entries(f).map(([a, v]) => [a, len(v)])));
}
if (bad) process.exitCode = 1;
