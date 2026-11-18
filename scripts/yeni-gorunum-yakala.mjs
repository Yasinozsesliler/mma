// "Yeni görünüm" reklamı için oyundan malzeme: kartlı ana menünün kaydı, kartların tek tek görüntüleri,
// Efsane Yolları penceresi ve Patron Modu giriş ekranı.
// Önce: CI=1 npm run build:web ; npx serve dist -s -l 8088
// Çalıştırma: CHROME=... node scripts/yeni-gorunum-yakala.mjs <ffmpeg> <kariyer.json>
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const [FF, SAVEF] = process.argv.slice(2);
const root = fileURLToPath(new URL('..', import.meta.url));
const OUT = `${root}/store/video/acik-yeni`;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME, headless: true, args: ['--no-sandbox'] });
let page;
const open = async () => {
  const ctx = await browser.createBrowserContext();
  page = await ctx.newPage();
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument((SAVE) => {
    if (sessionStorage.getItem('hazir')) return;
    sessionStorage.setItem('hazir', '1');
    localStorage.clear();
    localStorage.setItem('yol_dil', 'tr');
    localStorage.setItem('yol_ipucu', '0');
    localStorage.setItem('yol_ses', '0');
    localStorage.setItem('yol_gorunum_tanitim', '1');
    const s = JSON.parse(SAVE);
    s.phase = 'hub';
    localStorage.setItem('yol_kariyer_v1', JSON.stringify(s));
  }, readFileSync(SAVEF, 'utf8'));
  await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
  await sleep(1500);
};

// Ekran akışı kaydı (CDP): 1080×1920
const rec = async (name, fn) => {
  const cdp = await page.createCDPSession();
  const frames = [];
  cdp.on('Page.screencastFrame', (f) => {
    frames.push({ data: f.data, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => undefined);
  });
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:99999;animation:kn 0.5s linear infinite';
    const st = document.createElement('style');
    st.textContent = '@keyframes kn{from{transform:translateX(0)}to{transform:translateX(1px)}}';
    document.head.appendChild(st);
    document.body.appendChild(d);
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  await fn();
  const tEnd = Date.now() / 1000;
  await cdp.send('Page.stopScreencast').catch(() => undefined);
  await cdp.detach().catch(() => undefined);
  const dir = `${OUT}/${name}-kare`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let list = '';
  frames.forEach((f, i) => {
    const file = `${dir}/${String(i).padStart(5, '0')}.jpg`;
    writeFileSync(file, Buffer.from(f.data, 'base64'));
    const d = (i + 1 < frames.length ? frames[i + 1].t : tEnd) - f.t;
    list += `file '${file}'\nduration ${Math.max(0.001, d).toFixed(4)}\n`;
  });
  list += `file '${dir}/${String(frames.length - 1).padStart(5, '0')}.jpg'\n`;
  writeFileSync(`${dir}/liste.txt`, list);
  // Kare klasörü (30 fps) — reklam betiği bunları sırayla okur
  const seq = `${OUT}/${name}`;
  rmSync(seq, { recursive: true, force: true });
  mkdirSync(seq, { recursive: true });
  execFileSync(FF, ['-y', '-f', 'concat', '-safe', '0', '-i', `${dir}/liste.txt`, '-vf', 'fps=30,scale=1080:1920:flags=lanczos', '-q:v', '2', `${seq}/%05d.jpg`], { stdio: 'ignore' });
  rmSync(dir, { recursive: true, force: true });
};
// Kaydırılabilir öğeyi yumuşakça kaydır
const smooth = (sel, dx, dy, ms) =>
  page.evaluate(async (sel, dx, dy, ms) => {
    const els = [...document.querySelectorAll('div')].filter((d) => (dy ? d.scrollHeight > d.clientHeight + 40 && getComputedStyle(d).overflowY !== 'visible' : d.scrollWidth > d.clientWidth + 40 && getComputedStyle(d).overflowX !== 'visible'));
    const el = sel === 'last' ? els.pop() : els[0];
    if (!el) return;
    const x0 = el.scrollLeft;
    const y0 = el.scrollTop;
    const t0 = performance.now();
    await new Promise((res) => {
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        el.scrollLeft = x0 + dx * e;
        el.scrollTop = y0 + dy * e;
        if (k < 1) requestAnimationFrame(step);
        else res();
      };
      requestAnimationFrame(step);
    });
  }, sel, dx, dy, ms);
// Metne göre kart (dokunulabilir öğe) ekran görüntüsü
const card = async (match, file) => {
  const h = await page.evaluateHandle((match) => {
    const re = new RegExp(match);
    return [...document.querySelectorAll('[tabindex="0"]')].filter((e) => re.test(e.innerText) && e.getBoundingClientRect().width > 80).sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height)[0];
  }, match);
  const el = h.asElement();
  if (!el) return console.log('kart yok', match);
  await el.screenshot({ path: `${OUT}/${file}.png` });
};

await open();
// 1) Ana menü kaydı: dur, aşağı kaydır, modlar şeridini yana kaydır
await rec('menu', async () => {
  await sleep(1800);
  await smooth('last', 0, 560, 1400);
  await sleep(500);
  await smooth('first', 760, 0, 2200);
  await sleep(600);
  await smooth('first', 760, 0, 2200);
  await sleep(700);
});
// 2) Kartlar
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1500);
await card('KARİYER\\s*MODU', 'kart-kariyer');
await card('EFSANE\\s*YOLLARI', 'kart-efsane');
await card('PATRON\\s*MODU', 'kart-patron');
const MODS = ['MENAJER MODU', 'MEYDAN OKUMALAR', 'GÜNÜN DÖVÜŞÜ', 'HAYALÎ MAÇLAR', 'ANTRENÖR MODU', 'HAKEM MODU', 'HAYALET MAÇ', 'YOL EVRENİ', 'EDİTÖR', 'DOLAP', 'REHBER'];
for (const [i, m] of MODS.entries()) await card(m.replace(/ /g, '\\s*'), `mod-${i}`);
// 3) Efsane Yolları penceresi
const eb = await page.evaluate(() => { const e = [...document.querySelectorAll('[tabindex="0"]')].filter((x) => /EFSANE\s*YOLLARI/.test(x.innerText) && x.getBoundingClientRect().height < 250).pop(); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await page.mouse.click(eb.x, eb.y);
await sleep(1500);
await rec('efsane', async () => {
  await sleep(1300);
  await smooth('last', 0, 900, 2600);
  await sleep(500);
});
// 4) Patron Modu giriş
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1500);
const pb = await page.evaluate(() => { const e = [...document.querySelectorAll('[tabindex="0"]')].filter((x) => /PATRON\s*MODU/.test(x.innerText) && x.getBoundingClientRect().height < 250).pop(); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await page.mouse.click(pb.x, pb.y);
await sleep(1600);
await page.screenshot({ path: `${OUT}/patron.png` });
await browser.close();
console.log('✅', OUT);
