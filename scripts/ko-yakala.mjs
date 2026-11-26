// Reklam kancası için kafes maçında nakavt anı: Menajer Modu kaydından maçı izler, NAKAVT görünene kadar kaydeder.
// Çalıştırma: CHROME=... node scripts/ko-yakala.mjs <ffmpeg> <menajer.json> [deneme=4]   (önce: npx serve dist -s -l 8088)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const [FF, MEN, DENEME = '4'] = process.argv.slice(2);
const root = fileURLToPath(new URL('..', import.meta.url));
const OUT = `${root}/store/video/acik-reklamko`;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME, headless: true, args: ['--no-sandbox'] });
let page;
const open = async ({ kariyer, menajer }) => {
  const ctx = await browser.createBrowserContext();
  page = await ctx.newPage();
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument((K, M) => {
    if (sessionStorage.getItem('hazir')) return;
    sessionStorage.setItem('hazir', '1');
    localStorage.clear();
    localStorage.setItem('yol_dil', 'tr');
    localStorage.setItem('yol_ipucu', '0');
    localStorage.setItem('yol_ses', '0');
    localStorage.setItem('yol_spiker', '0');
    localStorage.setItem('yol_gorunum_tanitim', '1');
    localStorage.setItem('yol_satinalim', JSON.stringify(['paket_altin', 'hakem_modu', 'antrenor_modu', 'menajer_modu', 'patron_modu', 'paket_efsane']));
    if (K) localStorage.setItem('yol_kariyer_v1', K);
    if (M) localStorage.setItem('yol_menajer', M);
  }, kariyer ?? null, menajer ?? null);
  await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
  await sleep(1500);
};
const body = async () => { try { return await page.$eval('body', (b) => b.innerText); } catch { return ''; } };
const tapRe = async (re, ms = 900) => {
  const b = await page.evaluate((src) => {
    const r = new RegExp(src, 'iu');
    const el = [...document.querySelectorAll('[tabindex="0"]')].filter((e) => r.test(e.innerText) && e.getBoundingClientRect().width > 0).sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height)[0];
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const q = el.getBoundingClientRect();
    return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
  }, re);
  if (!b) return false;
  await sleep(150);
  await page.mouse.click(b.x, b.y);
  await sleep(ms);
  return true;
};
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.jpg`, type: 'jpeg', quality: 85 });
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
for (let d = 1; d <= +DENEME; d++) {
  await open({ menajer: readFileSync(MEN, 'utf8') });
  await tapRe('^\\S*\\s*MENAJER\\s*MODU', 1500);
  await tapRe('İzle', 5600);
  await tapRe('Maça geç', 600);
  let sonuc = '';
  await rec(`mac${d}`, async () => {
    const t0 = Date.now();
    let bitis = 0;
    while (Date.now() - t0 < 80000) {
      await sleep(250);
      const b = await body();
      const m = b.match(/NAKAVT|HAKEM KARARI|SUBMISSION|BERABERE|TEKNİK NAKAVT/);
      if (m && !bitis) { bitis = Date.now(); sonuc = m[0]; console.log(`deneme ${d}: ${m[0]} @ ${((bitis - t0) / 1000).toFixed(1)} sn`); }
      if (bitis && Date.now() - bitis > 3500) break;
    }
  });
  if (/NAKAVT/.test(sonuc)) { console.log('✅ nakavt:', `mac${d}`); break; }
}
await browser.close();
