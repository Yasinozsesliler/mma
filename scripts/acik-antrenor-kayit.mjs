// Antrenör Modu reklamı için gerçek oyundan malzeme: salon kartı, öğrenci avatarları, VS, köşe maçı kaydı (kafes), sonuç, sıralama.
// Önce: CI=1 npm run build:web  ve  npx serve dist -s -l 8088
// Çalıştırma: CHROME=... node scripts/acik-antrenor-kayit.mjs <ffmpeg>
// Çıktı: store/video/acik-antrenor/ (png'ler, kose.mp4, bilgi.json)
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const FF = process.argv[2];
const root = fileURLToPath(new URL('..', import.meta.url));
const OUT = `${root}/store/video/acik-antrenor`;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const up = (s) => (s || '').toLocaleUpperCase('tr');

const browser = await puppeteer.launch({ executablePath: process.env.CHROME, headless: true, args: ['--no-sandbox'] });
let page;
const newPage = async () => {
  const ctx = await browser.createBrowserContext();
  page = await ctx.newPage();
await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.setBypassServiceWorker(true);
await page.evaluateOnNewDocument(() => {
  if (sessionStorage.getItem('hazir')) return;
  sessionStorage.setItem('hazir', '1');
  localStorage.clear();
  localStorage.setItem('yol_dil', 'tr');
  localStorage.setItem('yol_ipucu', '0');
  localStorage.setItem('yol_spiker', '0');
  localStorage.setItem('yol_ses', '0');
  localStorage.setItem('yol_satinalim', JSON.stringify(['paket_altin', 'hakem_modu', 'antrenor_modu']));
});
};
const body = async () => { for (let i = 0; i < 20; i++) { try { return await page.mainFrame().$eval('body', (x) => x.innerText); } catch { await sleep(300); } } return ''; };
// Metni içeren en içteki dokunulabilir öğeye gerçek dokunuş
const tap = async (k, { last = true, exact = false } = {}) => {
  const box = await page.evaluate((k, last, exact) => {
    const up = (s) => (s || '').toLocaleUpperCase('tr');
    const els = [...document.querySelectorAll('[tabindex="0"]')].filter((e) => (exact ? up(e.innerText.trim()) === up(k) : up(e.innerText).includes(up(k))) && e.getBoundingClientRect().width > 0);
    const el = last ? els.pop() : els[0];
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, k, last, exact);
  if (!box) return false;
  await sleep(150);
  await page.mouse.click(box.x, box.y);
  await sleep(450);
  return true;
};
// En büyük svg/öğe ekran görüntüsü
const shotEl = async (fnSrc, path) => {
  const h = await page.evaluateHandle(fnSrc);
  const el = h.asElement();
  if (!el) return false;
  await el.screenshot({ path, omitBackground: true });
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
for (let deneme = 1; deneme <= 8; deneme++) {
  console.log('— deneme', deneme);
  await newPage();
  await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
  await sleep(1200);
  await tap('Antrenör Modu');
  await sleep(800);
  const inp = await page.$$('input');
  if (inp[0]) await inp[0].type('Ali');
  if (inp[1]) await inp[1].type('Demir');
  await tap('Salonu aç');
  await sleep(1200);
  // Felsefe seçimi (metinleri sakla)
  info.felsefe = await page.evaluate(() => [...document.querySelectorAll('[tabindex="0"]')].map((e) => e.innerText.trim()).filter((t) => /Okulu|Okul|Salonu/.test(t) && t.includes('“')).map((t) => t.split('\n').slice(0, 2)));
  await tap('Savaşçı Okulu');
  await sleep(900);
  // Salon kartı (altın)
  await shotEl(() => [...document.querySelectorAll('div')].filter((d) => /DÖVÜŞ AKADEMİ/i.test(d.innerText) && /SALONU/.test(d.innerText) && /PUAN/i.test(d.innerText)).sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height)[0], `${OUT}/salon-kart.png`);
  // Öğrenciler: adayların avatarları
  await tap('Öğrenciler', { exact: false });
  await sleep(800);
  info.adaylar = await page.evaluate(() => [...document.querySelectorAll('[tabindex="0"]')].map((e) => e.innerText.trim()).filter((t) => t.startsWith('Kaydet')));
  info.ogrenciMetin = (await body()).slice(0, 1500);
  const avs = await page.$$('svg');
  let ai = 0;
  for (const a of avs) {
    const bb = await a.boundingBox();
    if (bb && bb.width >= 40 && bb.width <= 90 && Math.abs(bb.width - bb.height) < 4 && ai < 6) {
      await a.screenshot({ path: `${OUT}/aday-${ai++}.png`, omitBackground: true });
    }
  }
  for (let k = 0; k < 2; k++) await tap('Kaydet ·', { last: false });
  await sleep(500);
  // Haftaları ilerlet: köşe çağrısına kadar
  let kose = false;
  for (let w = 0; w < 90 && !kose; w++) {
    const t = up(await body());
    if (t.includes('KÖŞEDE SENİ BEKLİYOR')) { kose = true; break; }
    if (t.includes('SALONDA BİR DURUM VAR')) {
      await page.evaluate(() => { const b = [...document.querySelectorAll('[tabindex="0"]')].filter((x) => x.innerText.trim().split('\n').length >= 2 && !/MENÜ|KÖŞEDE/i.test(x.innerText)); b[0]?.click(); });
      await sleep(400);
      continue;
    }
    if (!(await tap('Haftayı ilerlet'))) await sleep(300);
  }
  if (!kose) continue;
  // Sıralama verisi
  await tap('Salon', { exact: true });
  await sleep(500);
  await tap('KÖŞEDE SENİ BEKLİYOR');
  await sleep(1300);
  info.vs = (await body()).slice(0, 900);
  // VS avatarları (64px)
  const vsav = [];
  for (const a of await page.$$('svg')) {
    const bb = await a.boundingBox();
    if (bb && bb.width > 55 && bb.width < 80 && Math.abs(bb.width - bb.height) < 4) vsav.push(a);
  }
  if (vsav[0]) await vsav[0].screenshot({ path: `${OUT}/vs-biz.png`, omitBackground: true });
  if (vsav[1]) await vsav[1].screenshot({ path: `${OUT}/vs-rakip.png`, omitBackground: true });
  info.planlar = await page.evaluate(() => [...document.querySelectorAll('[tabindex="0"]')].map((e) => e.innerText.trim().split('\n').filter((l) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(l))).filter((t) => t.length === 2 && !/SONRA|MENÜ|KÖŞEDE/i.test(t.join(' '))));
  // Köşe maçı kaydı
  const kayit = [];
  const marks = await rec('kose', async (now) => {
    const m = { plan: now() };
    const plan = info.planlar.find((p) => /Güreş|İndir/i.test(p[0])) ?? info.planlar[0];
    m.planAd = plan?.[0];
    if (plan) await tap(plan[0]);
    for (let i = 0; i < 260; i++) {
      await sleep(250);
      const t = await body();
      if (/KAZANDI!|KAYBETTİ/.test(t) && !m.sonuc) {
        m.sonuc = now();
        m.kazandi = t.includes('KAZANDI!');
        for (let w = 0; w < 60 && (await body()).includes('Hızlı geç'); w++) await sleep(200);
        m.sonAnim = now();
        await sleep(2500);
        kayit.push({ sonuc: t.slice(0, 1200) });
        break;
      }
      if (t.includes('Sonucu gör') && !m.son) { m.son = now(); for (let w = 0; w < 50 && (await body()).includes('Hızlı geç'); w++) await sleep(200); m.sonA = now(); await sleep(1500); await tap('Sonucu gör'); continue; }
      if (t.includes('Talimatın ne')) {
        // Kafes animasyonu bitsin diye kısa bekle, sonra talimat ver
        const r = (t.match(/RAUNT ARASI · (\d)/) ?? [])[1];
        if (r && !m[`r${r}`]) {
          m[`r${r}`] = now();
          for (let w = 0; w < 50 && (await body()).includes('Hızlı geç'); w++) await sleep(200);
          m[`a${r}`] = now();
          await sleep(1300);
          const opts = await page.evaluate(() => [...document.querySelectorAll('[tabindex="0"]')].map((e) => e.innerText.trim().split('\n').filter((l) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(l))).filter((x) => x.length === 2 && !/SONRA|MENÜ|KÖŞEDE/i.test(x.join(' '))).map((x) => x[0]));
          const pick = (+r >= 2 && opts.find((o) => /bitir/i.test(o))) || opts.find((o) => /Yere/i.test(o)) || opts.find((o) => /Baskı/i.test(o)) || opts.find((o) => !/bitir/i.test(o)) || opts[0];
          kayit.push({ raunt: +r, metin: t.slice(t.indexOf('RAUNT ARASI'), t.indexOf('RAUNT ARASI') + 260), opts, pick });
          m[`t${r}`] = now();
          m[`p${r}`] = pick;
          await tap(pick);
        }
      }
    }
    return m;
  });
  // Kafesin konumu (kırpmak için)
  info.kafes = await page.evaluate(() => {
    const c = [...document.querySelectorAll('div')].filter((d) => { const r = d.getBoundingClientRect(); return r.width > 450 && r.height > 200 && r.height < 300 && getComputedStyle(d).overflow === 'hidden'; }).pop();
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y + (document.scrollingElement?.scrollTop ?? 0), w: r.width, h: r.height };
  });
  info.marks = marks;
  info.kayit = kayit;
  console.log(JSON.stringify(marks), JSON.stringify(info.planlar).slice(0,300));
  if (marks.kazandi) {
    await page.screenshot({ path: `${OUT}/sonuc.png` });
    await tap('Salona dön');
    await sleep(900);
    await tap('Profil');
    await sleep(700);
    await tap('Tüm sıralamayı gör');
    await sleep(700);
    info.siralama = (await body()).slice(0, 4000);
    break;
  }
}
writeFileSync(`${OUT}/bilgi.json`, JSON.stringify(info, null, 1));
await browser.close();
console.log('✅', OUT);
