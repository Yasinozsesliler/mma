// Menajer Modu reklamı için oyundan malzeme: face-off (avatarlar, sözler) ve ünvan maçının kafes kaydı.
// Önce: npx tsx scripts/menajer-kayit.ts on.json son.json ; build:web ; serve dist -l 8088
// Çalıştırma: CHROME=... node scripts/menajer-yakala.mjs <ffmpeg> <on.json> <son.json>
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const [FF, ON, SON] = process.argv.slice(2);
const root = fileURLToPath(new URL('..', import.meta.url));
const OUT = `${root}/store/video/acik-menajer`;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME, headless: true, args: ['--no-sandbox'] });
let page;
const open = async (save) => {
  const ctx = await browser.createBrowserContext();
  page = await ctx.newPage();
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument((MS) => {
    if (sessionStorage.getItem('hazir')) return;
    sessionStorage.setItem('hazir', '1');
    localStorage.clear();
    localStorage.setItem('yol_dil', 'tr');
    localStorage.setItem('yol_ipucu', '0');
    localStorage.setItem('yol_ses', '0');
    localStorage.setItem('yol_satinalim', JSON.stringify(['paket_altin', 'hakem_modu', 'antrenor_modu', 'menajer_modu']));
    localStorage.setItem('yol_menajer', MS);
  }, readFileSync(save, 'utf8'));
  await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
  await sleep(1200);
  await tap('Menajer Modu');
  await sleep(600);
  await tap('Devam');
  await sleep(900);
};
const body = async () => { try { return await page.$eval('body', (x) => x.innerText); } catch { return ''; } };
const tap = async (k, first = false) => {
  const box = await page.evaluate((k, first) => {
    const up = (s) => (s || '').toLocaleUpperCase('tr');
    const els = [...document.querySelectorAll('[tabindex="0"]')].filter((e) => up(e.innerText).includes(up(k)) && e.getBoundingClientRect().width > 0);
    const el = first ? els[0] : els.pop();
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, k, first);
  if (!box) return false;
  await sleep(150);
  await page.mouse.click(box.x, box.y);
  await sleep(500);
  return true;
};
// Ekran akışı kaydı (CDP): tam ekran 1080×1920
const rec = async (name, fn) => {
  const cdp = await page.createCDPSession();
  const frames = [];
  cdp.on('Page.screencastFrame', (f) => {
    frames.push({ data: f.data, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => undefined);
  });
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.id = 'kayit-nabiz';
    d.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:99999;animation:kayitNabiz 0.5s linear infinite';
    const st = document.createElement('style');
    st.id = 'kayit-nabiz-css';
    st.textContent = '@keyframes kayitNabiz{from{transform:translateX(0)}to{transform:translateX(1px)}}';
    document.head.appendChild(st);
    document.body.appendChild(d);
  });
  const t0 = Date.now();
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  const marks = (await fn(() => (Date.now() - t0) / 1000)) ?? {};
  const tEnd = Date.now() / 1000;
  await cdp.send('Page.stopScreencast').catch(() => undefined);
  await cdp.detach().catch(() => undefined);
  const shift = frames[0].t - t0 / 1000;
  for (const k of Object.keys(marks)) if (typeof marks[k] === 'number') marks[k] = Math.max(0, marks[k] - shift);
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
  execFileSync(FF, ['-y', '-f', 'concat', '-safe', '0', '-i', `${dir}/liste.txt`, '-vf', 'fps=30,scale=1080:1920:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '15', `${OUT}/${name}.mp4`], { stdio: 'ignore' });
  rmSync(dir, { recursive: true, force: true });
  return marks;
};

const info = {};
// Ünvan maçı: "İzle" önce sinematik face-off'u, sonra kafesi oynatır
await open(SON);
info.ana = (await body()).slice(0, 1500);
await rec('kafes', async (now) => {
  const m = { izle: now() };
  await tap('İzle', true);
  await sleep(5600);
  await page.screenshot({ path: `${OUT}/faceoff.png` });
  info.faceoff = (await body()).slice(0, 900);
  await sleep(600);
  m.atla = now();
  if (!(await tap('Maça geç'))) { await tap('Atla'); await sleep(500); await tap('Maça geç'); }
  m.mac = now();
  const seen = [];
  for (let i = 0; i < 200; i++) {
    await sleep(250);
    const t = await body();
    const k = t.split('\n').slice(0, 40).join(' | ');
    if (seen[seen.length - 1] !== k) { seen.push(k); m['s' + seen.length] = now(); }
    if (/KAZANAN|kemerini korudu/i.test(t) && !m.son) { m.son = now(); await sleep(3000); break; }
  }
  info.akis = seen.map((x) => x.slice(0, 300));
  return m;
}).then((m) => { info.marks = m; });
info.kafesMetin = (await body()).slice(0, 1500);
info.kafes = await page.evaluate(() => {
  const c = [...document.querySelectorAll('div')].filter((d) => { const r = d.getBoundingClientRect(); return r.width > 450 && r.height > 200 && r.height < 320 && getComputedStyle(d).overflow === 'hidden'; }).pop();
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
writeFileSync(`${OUT}/bilgi.json`, JSON.stringify(info, null, 1));
await browser.close();
console.log('✅', JSON.stringify(info.marks), JSON.stringify(info.kafes));
