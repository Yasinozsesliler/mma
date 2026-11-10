// Açık renkli reklam serisi için oyundan net görseller: pasaport damga sayfası ve memleket çizimi (her aşama).
// Önce: CI=1 npm run build:web  ve  npx serve dist -s -l 8088
// Çalıştırma: CHROME=... node scripts/acik-yakala.mjs <kayit.json> <çıktı klasörü>
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const [SAVEF, OUT] = process.argv.slice(2);
const SAVE = readFileSync(SAVEF, 'utf8');
const b = await puppeteer.launch({ executablePath: process.env.CHROME, headless: true, args: ['--no-sandbox'] });
const page = await b.newPage();
await page.setViewport({ width: 540, height: 1200, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.setBypassServiceWorker(true);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
const show = async (ph, extra = '') => {
  await page.evaluate((SAVE, ph, extra) => {
    localStorage.clear(); localStorage.setItem('yol_dil', 'tr'); localStorage.setItem('yol_ipucu', '0');
    const s = JSON.parse(SAVE); s.ipuclari = ['hub', 'gelisim', 'rakip', 'kamp', 'plan', 'yuzyuze', 'dovus', 'macSonrasi']; s.phase = ph;
    new Function('s', extra)(s);
    localStorage.setItem('yol_kariyer_v1', JSON.stringify(s));
  }, SAVE, ph, extra);
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(900);
  await page.evaluate(() => { const e = [...document.querySelectorAll('[tabindex="0"]')].find((x) => /DEVAM ET/i.test(x.innerText)); e && e.click(); });
  await sleep(1600);
};
// Pasaport: krem damga sayfasının tamamı
await show('pasaport');
const pas = await page.evaluateHandle(() => [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).backgroundColor === 'rgb(239, 230, 210)' && d.getBoundingClientRect().width > 300));
await pas.screenshot({ path: `${OUT}/pasaport.png`, captureBeyondViewport: true });
// Pasaport kapağı (kırmızı kart)
// Memleket: aşama aşama
const ST = ['poster', 'salon', 'sokak', 'pankart', 'heykel'];
for (let i = 0; i <= ST.length; i++) {
  await show('memleket', `s.memleketKart = { asamalar: ${JSON.stringify(ST.slice(0, i))}, galibiyet: 1 };`);
  const svg = await page.$('svg[width="488"], svg');
  const h = await page.evaluateHandle(() => [...document.querySelectorAll('svg')].sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0]);
  await h.screenshot({ path: `${OUT}/memleket-${i}.png` });
}
const s = JSON.parse(SAVE);
writeFileSync(`${OUT}/bilgi.json`, JSON.stringify({ ad: `${s.fighter.ad} ${s.fighter.soyad}`, memleket: s.fighter.memleket, sehirler: [...new Set((s.gecmis ?? []).map((g) => g.sehir).filter(Boolean))] }));
await b.close();
