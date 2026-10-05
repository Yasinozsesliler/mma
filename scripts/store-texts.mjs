// Play Console metinleri: store/listing.json'dan dil başına kopyala-yapıştır dosyası üretir (karakter sayılarıyla).
// Çalıştırma: node scripts/store-texts.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const j = JSON.parse(readFileSync(`${root}/store/listing.json`, 'utf8'));
const NAMES = { 'tr-TR': 'Türkçe', 'en-US': 'English (US)', 'es-ES': 'Español', 'pt-BR': 'Português (BR)', 'ru-RU': 'Русский', 'pl-PL': 'Polski' };
const len = (s) => [...s].length;
for (const [k, x] of Object.entries(j)) {
  const g = k.slice(0, 2);
  const txt = [
    `PLAY CONSOLE · ${k} · ${NAMES[k] ?? k}`,
    `Görseller: store\\graphics\\${g}   ·   Simge: public\\icon-512.png`,
    '',
    `=== UYGULAMA ADI (${len(x.title)}/30) ===`,
    x.title,
    '',
    `=== KISA AÇIKLAMA (${len(x.short)}/80) ===`,
    x.short,
    '',
    `=== TAM AÇIKLAMA (${len(x.full)}/4000) ===`,
    x.full,
    '',
    '=== SÜRÜM NOTU ===',
    x.releaseNotes,
    '',
  ].join('\r\n');
  writeFileSync(`${root}/store/play-metinleri/${k}.txt`, '\ufeff' + txt, 'utf8');
  console.log(k, len(x.title), len(x.short), len(x.full));
}
