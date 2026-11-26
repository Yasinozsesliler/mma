// Stüdyo sahnelerini kare kare çeker: node scripts/studyo-cek.mjs <çıktı klasörü> <sahne> <süre sn> [fps=30] [tek kare sn...]
// Önce: stüdyo içeren web derlemesi http://localhost:8089 adresinde sunulmalı (?studyo).
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const [OUT, SAHNE, SURE, FPS0, ...TEK] = process.argv.slice(2);
const FPS = +(FPS0 ?? 30);
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox', '--force-device-scale-factor=2'] });
const page = await browser.newPage();
await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${process.env.PORT ?? 8089}/?studyo`, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => globalThis.__STUDYO_HAZIR, { timeout: 30000 });
const ciz = async (t) => {
  await page.evaluate(async (s, t) => {
    globalThis.__SAHNE = s;
    globalThis.__T = t;
    window.dispatchEvent(new Event('studyo-t'));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    // Görseller yüklenene kadar bekle
    await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))));
    // SVG <image> öğeleri (oyun görselleri): aynı adresi önceden yükle, sonra bir kare daha bekle
    const hrefs = [...document.querySelectorAll('image')].map((e) => e.getAttribute('href') || e.getAttribute('xlink:href')).filter(Boolean);
    await Promise.all(hrefs.map((h) => new Promise((r) => { const im = new Image(); im.onload = im.onerror = r; im.src = h; })));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, SAHNE, t);
};
const list = TEK.length ? TEK.map(Number) : Array.from({ length: Math.round(+SURE * FPS) }, (_, i) => i / FPS);
await ciz(0);
await new Promise((r) => setTimeout(r, 800));
for (const [i, t] of list.entries()) {
  await ciz(t);
  await page.screenshot({ path: `${OUT}/${TEK.length ? 'k-' + t : String(i + 1).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 });
}
await browser.close();
console.log('✓', SAHNE, list.length, 'kare');
