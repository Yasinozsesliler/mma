// Mağaza görselleri (1.3.x) için yeni ham çekimler: kartlı ana menü, Gençlik Yolu, dövüş sporları ligi ve ringi,
// Menajer Modu, Patron Modu. iPhone oranında (390×844 @3x), seçilen dilde.
// Önce: CI=1 npm run build:web ; npx serve dist -s -l 8088 ; npx tsx scripts/store-saves.ts <kariyer.json> <kayit klasörü>
// Çalıştırma: CHROME_PATH=... node scripts/store-shots-yeni.mjs <dil> <kayit klasörü> <kariyer.json> <menajer.json>
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const [lang, KAYIT, KARIYER, MENAJER] = process.argv.slice(2);
const root = fileURLToPath(new URL('..', import.meta.url));
const raw = `${root}/store/graphics-ios/${lang}/ham`;
mkdirSync(raw, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true, args: ['--no-sandbox'] });
const read = (f) => readFileSync(f, 'utf8');
let page;
// Temiz bir oturum: dil, satın alımlar, istenen kayıtlar
const open = async ({ kariyer, menajer } = {}) => {
  if (page) await page.browserContext().close().catch(() => undefined);
  const ctx = await browser.createBrowserContext();
  page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument((l, K, M) => {
    if (sessionStorage.getItem('hazir')) return;
    sessionStorage.setItem('hazir', '1');
    localStorage.clear();
    localStorage.setItem('yol_dil', l);
    localStorage.setItem('yol_ipucu', '0');
    localStorage.setItem('yol_ses', '0');
    localStorage.setItem('yol_spiker', '0');
    localStorage.setItem('yol_gorunum_tanitim', '1');
    localStorage.setItem('yol_satinalim', JSON.stringify(['paket_altin', 'hakem_modu', 'antrenor_modu', 'menajer_modu', 'patron_modu', 'paket_efsane']));
    if (K) localStorage.setItem('yol_kariyer_v1', K);
    if (M) localStorage.setItem('yol_menajer', M);
  }, lang, kariyer ?? null, menajer ?? null);
  await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
  await sleep(1500);
};
const body = async () => { try { return await page.$eval('body', (b) => b.innerText); } catch { return ''; } };
// Konumla dokun (dile bağlı olmayan)
const tapXY = async (x, y, ms = 1200) => { await page.mouse.click(x, y); await sleep(ms); };
// Metinle dokun: verilen düzenli ifadeye uyan en küçük dokunulabilir öğe
const tapRe = async (re, ms = 1000) => {
  const b = await page.evaluate((src) => {
    const r = new RegExp(src, 'iu');
    const el = [...document.querySelectorAll('[tabindex="0"]')].filter((e) => r.test(e.innerText) && e.getBoundingClientRect().width > 0).sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height)[0];
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const q = el.getBoundingClientRect();
    return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
  }, re);
  if (!b) return false;
  await sleep(200);
  await page.mouse.click(b.x, b.y);
  await sleep(ms);
  return true;
};
const devam = async () => { await page.evaluate(() => { const e = [...document.querySelectorAll('[tabindex="0"]')][0]; return e; }); };
const shot = async (name) => { await page.screenshot({ path: `${raw}/${name}.png` }); console.log('📸', lang, name); };
// Ana menüden kariyere dön (kayıt varsa ilk kart "Devam et")
const toCareer = async () => { await tapXY(195, 260, 1600); };

// 1) Kartlı ana menü (kariyer kaydı ile: kahraman kartta dövüşçü ve rekor)
await open({ kariyer: read(KARIYER) });
await shot('menu');
// 2) Gençlik Yolu
await open({ kariyer: read(`${KAYIT}/genclik.json`) });
await toCareer();
await shot('genclik');
// 3) Dövüş sporları ligi ve maç öncesi
await open({ kariyer: read(`${KAYIT}/spor-lig.json`) });
await toCareer();
await shot('lig');
await open({ kariyer: read(`${KAYIT}/spor-mac.json`) });
await toCareer();
await shot('lig-mac');
// Ringde canlı Muay Thai maçı (alttaki büyük düğme: ringe çık)
await tapXY(195, 738, 2600);
await shot('lig-ring');
// 4) Menajer Modu: menüden aç, telefon ekranı
await open({ menajer: read(MENAJER) });
// Diğer modlar şeridinin ilk kartı: Menajer Modu
await tapXY(85, 700, 1500);
// Devam et (kayıtlı ajans)
console.log('menajer giriş:', (await body()).slice(0, 200).replace(/\n/g, ' | '));
await tapRe('^\\S*\\s*(DEVAM|CONTINUE|CONTINUAR|ПРОДОЛЖ|KONTYNUUJ|LANJUT|CONTINUA)', 1500);
await shot('menajer');
console.log('menajer:', (await body()).slice(0, 160).replace(/\n/g, ' | '));
// 5) Patron Modu: menüdeki lacivert kart (sağ üstteki ikili kartın ikincisi)
await open();
await tapXY(290, 430, 1500);
await shot('patron-giris');
// Organizasyonu kur: ad alanları varsa doldur
await tapXY(195, 738, 1500);
// Ofisteki büyük sarı düğme: gece planlamaya başla (kart kurma ekranı)
await tapXY(195, 598, 1500);
await shot('patron');
console.log('patron:', (await body()).slice(0, 400).replace(/\n/g, ' | '));
await browser.close();
