// Kafespedia videosu için HD (4x) çekimler: dövüşçünün ansiklopedi sayfası, kariyerin iki döneminde (çaylak ve şampiyon),
// yumuşak kaydırma kare kare. Çalıştırma: CHROME=... node scripts/pedia-yakala.mjs <ffmpeg> <kariyer.json>  (önce: npx serve dist -s -l 8088)
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const [FF, KARIYER, SADECE = ''] = process.argv.slice(2);
const root = fileURLToPath(new URL('..', import.meta.url));
const OUT = `${root}/store/video/acik-pediahd`;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ZAMAN = () => {
  const oP = performance.now.bind(performance), oD = Date.now, oST = window.setTimeout.bind(window), oSI = window.setInterval.bind(window), oRAF = window.requestAnimationFrame.bind(window);
  let F = 1, rb = oP(), vb = rb;
  const v = () => vb + (oP() - rb) / F;
  const d0 = oD() - oP();
  window.__oyunSaati = v;
  window.__hizAyarla = (f) => { vb = v(); rb = oP(); F = f; };
  performance.now = v;
  Date.now = () => Math.round(d0 + v());
  window.setTimeout = (fn, ms = 0, ...a) => oST(fn, (ms || 0) * F, ...a);
  window.setInterval = (fn, ms = 0, ...a) => oSI(fn, (ms || 0) * F, ...a);
  window.requestAnimationFrame = (cb) => oRAF(() => cb(v()));
};

const browser = await puppeteer.launch({ executablePath: process.env.CHROME, headless: true, args: ['--no-sandbox'] });
let page;
const open = async ({ kariyer, menajer }) => {
  const ctx = await browser.createBrowserContext();
  page = await ctx.newPage();
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 4, isMobile: true, hasTouch: true });
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument(ZAMAN);
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
// Zaman genişletme: oyunun saati (performance.now, Date.now, setTimeout/Interval, requestAnimationFrame, CSS animasyonları)
// window.__F kat yavaşlatılır. Yavaş akan oyundan art arda 4x ekran görüntüsü alınır; her karenin oyun saati kaydedilir,
// sonra 30 fps'e oturtulur. Böylece gerçek zamanlı akış kaydından çok daha keskin ve akıcı kayıt çıkar.
const yavasla = async (f) => {
  await page.evaluate((f) => window.__hizAyarla(f), f);
  const c = await page.createCDPSession();
  await c.send('Animation.enable');
  await c.send('Animation.setPlaybackRate', { playbackRate: 1 / f });
};
/** sure sn (oyun saati) boyunca kayıt; clip (css px) verilirse sadece o bölge; sonra 30 fps karelere oturtur */
const hdKayit = async (ad, sure, { clip, F = 8 } = {}) => {
  const dir = `${OUT}/${ad}`;
  const ham = `${dir}-ham`;
  for (const d of [dir, ham]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }
  await yavasla(F);
  const t0 = await page.evaluate(() => window.__oyunSaati());
  const list = [];
  for (let i = 0; ; i++) {
    const t = (await page.evaluate(() => window.__oyunSaati())) - t0;
    const f = `${ham}/${String(i).padStart(5, '0')}.jpg`;
    await page.screenshot({ path: f, type: 'jpeg', quality: 93, ...(clip ? { clip } : {}) });
    list.push([t / 1000, f]);
    if (t / 1000 > sure) break;
  }
  await yavasla(1);
  // 30 fps: her kare için en yakın (önceki) görüntü
  let j = 0;
  for (let k = 0; k < Math.round(sure * 30); k++) {
    const tk = k / 30;
    while (j + 1 < list.length && list[j + 1][0] <= tk) j++;
    copyFileSync(list[j][1], `${dir}/${String(k + 1).padStart(5, '0')}.jpg`);
  }
  console.log('✓', ad, `${list.length} görüntü → ${Math.round(sure * 30)} kare`);
};
const tam = (ad) => page.screenshot({ path: `${OUT}/${ad}.jpg`, type: 'jpeg', quality: 94 });

const kariyereGir = async () => {
  for (const re of ['^\\S*\\s*DEVAM ET', 'KARİYER MODU', '^\\S*\\s*Amatör']) if (await tapRe(re, 1800)) return;
};
const ana = JSON.parse(readFileSync(KARIYER, 'utf8'));
ana.phase = 'hub';
ana.pending = {};
const sayfaAc = async (s) => {
  await open({ kariyer: JSON.stringify(s) });
  await kariyereGir();
  console.log('hub:', (await body()).slice(0, 200).replace(/\n/g, ' | '));
  await tapRe('^\\S*\\s*Profil$', 900);
  await tapRe('Kafespedia', 1200);
};
// Sayfa açıkken: kaydırılabilir alanı bul
const kaydir = (y) => page.evaluate((y) => {
  const d = [...document.querySelectorAll('div')].filter((d) => /auto|scroll/.test(getComputedStyle(d).overflowY) && /Kafespedia/.test(d.innerText)).sort((a, b) => b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight))[0];
  d.scrollTop = y;
  return d.scrollHeight - d.clientHeight;
}, y);
// Önemli ifadeleri fosforlu kalemle işaretle (metin düğümlerini <mark> ile sarar)
const isaretle = async (ifadeler) => { for (const x of ifadeler) await isaretle1([x]); };
const isaretle1 = (ifadeler) => page.evaluate((ifadeler) => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const ns = [];
  while (w.nextNode()) ns.push(w.currentNode);
  for (const n of ns) for (const ifade of ifadeler) {
    const i = n.nodeValue.indexOf(ifade);
    if (i < 0) continue;
    const r = document.createRange();
    r.setStart(n, i); r.setEnd(n, i + ifade.length);
    const m = document.createElement('mark');
    m.style.cssText = 'background:linear-gradient(transparent 12%,#ffe14d 12%,#ffe14d 92%,transparent 92%);color:inherit;padding:0 2px';
    r.surroundContents(m);
    break;
  }
}, ifadeler);

// Dönem A: çaylak (22 yaş, 2-0 profesyonel)
const A = structuredClone(ana);
{
  const am = A.gecmis.filter((h) => h.org === 'amator');
  const pro = A.gecmis.filter((h) => h.org !== 'amator');
  A.gecmis = [...pro.slice(-2), ...am];
  A.fighter.yas = 22;
  A.hafta = 150;
  A.stage = 'bolgesel';
  A.contract = { org: 'oktagon', kalan: 3, ucret: 4000, bonus: 4000, munhasir: false };
  A.rekor = { g: 2, m: 0, b: 0, ko: 1, sub: 0, karar: 1 };
  A.kemerler = [];
  A.oduller = [];
  A.ezeli = null;
  A.donemler = [];
  A.sampiyon = false;
}
// Dönem C: efsane (38 yaş, iki sıklette kemer, Onur Listesi)
const C = structuredClone(ana);
C.fighter.yas = 38;
C.rekor = { g: 34, m: 4, b: 0, ko: 17, sub: 5, karar: 12 };
C.kemerler = [{ org: 'ufc', siklet: C.fighter.siklet, hafta: 479, yas: 29, savunma: 6, aktif: false }, { org: 'ufc', siklet: 'orta', hafta: 760, yas: 34, savunma: 2, aktif: false }];
C.oduller = [{ kat: 'dovuscu', yas: 30 }, { kat: 'nakavt', yas: 31 }, { kat: 'dovuscu', yas: 33 }];
C.hof = true;
if (C.ezeli) { C.ezeli.g = 3; C.ezeli.m = 2; C.ezeli.bitti = true; }

if (!SADECE || SADECE.includes('A')) { await sayfaAc(A); await tam('A-ust'); }
if (!SADECE || SADECE.includes('B')) {
  await sayfaAc(ana);
  await tam('B-ust');
  await isaretle(['Kariyerinde 1 şampiyonluk kemeri kazandı.']);
  await tam('B-ust-isaret');
}
if (!SADECE || SADECE.includes('C')) {
  await sayfaAc(C);
  await tam('C-ust');
  await isaretle(['Onur Listesi (Hall of Fame) üyesi.', '2 şampiyonluk kemeri kazandı.', 'kemeri 6 kez savundu', 'Rekabeti üstün tamamladı.']);
  await tam('C-ust-isaret');
  // Yumuşak kaydırma: 5 sn, 150 kare
  const max = await kaydir(0);
  const dir = `${OUT}/C-kaydir`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (let k = 0; k < 150; k++) {
    const u = k / 149;
    await kaydir(max * (0.5 - Math.cos(Math.PI * u) / 2));
    await sleep(30);
    await page.screenshot({ path: `${dir}/${String(k + 1).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 93 });
  }
  console.log('kaydırma', max);
}
await browser.close();
