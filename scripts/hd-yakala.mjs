// HD oyun kaydı: sanal zamanla kare kare (her kare 1/30 sn ilerletilir), 4x piksel yoğunluğunda ekran görüntüsü.
// Gerçek zamanlı ekran akışından çok daha keskin; yakınlaştırılan sahneler için.
// Çalıştırma: CHROME=... node scripts/hd-yakala.mjs <ffmpeg> <menajer.json> <spor-mac.json>   (önce: npx serve dist -s -l 8088)
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const [FF, MEN, SPOR, SADECE = ''] = process.argv.slice(2);
const root = fileURLToPath(new URL('..', import.meta.url));
const OUT = `${root}/store/video/acik-oyunhd`;
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

const GENC = SPOR.replace('spor-mac', 'genclik');
const hedef = SADECE ? SADECE.split(',') : ['kafes', 'ring', 'kemer', 'genclik', 'menajer', 'patron'];
const kariyereGir = async () => {
  for (const re of ['^\\S*\\s*DEVAM ET', 'KARİYER MODU', '^\\S*\\s*Amatör']) if (await tapRe(re, 1800)) return;
};

// A) Menajer Modu kafes maçı: baştan nakavta kadar (oyun saatiyle 17.5 sn), kafes bölgesi 4x
if (hedef.includes('kafes')) {
  await open({ menajer: readFileSync(MEN, 'utf8') });
  await tapRe('^\\S*\\s*MENAJER\\s*MODU', 1500);
  await tapRe('İzle', 5600);
  await tapRe('Maça geç', 100);
  await hdKayit('kafesmac', 17.5, { clip: { x: 10, y: 105, width: 520, height: 270 } });
  await tam('kafes-son');
}
// B) Ringde Muay Thai: taktik → baskı kur, ring bölgesi 4x; sonra karar anı paneli tam ekran
if (hedef.includes('ring')) {
  await open({ kariyer: readFileSync(SPOR, 'utf8') });
  await kariyereGir();
  await tam('ring-giris');
  await tapRe('RİNGE ÇIK', 1600);
  await tapRe('TAKTİK İZLE', 700);
  await tam('ring-oncesi');
  await tapRe('BASKI KUR', 100);
  await hdKayit('ringmac', 5, { clip: { x: 10, y: 165, width: 520, height: 270 } });
  for (let i = 0; i < 40 && !/KARAR ANI/.test(await body()); i++) await sleep(500);
  await sleep(700);
  await tam('karar');
}
// C) Kemer kutlaması (lig kaydından şampiyonluk kutlamasına geçirilir)
if (hedef.includes('kemer')) {
  await open({ kariyer: readFileSync(SPOR, 'utf8') });
  await page.evaluate(() => {
    const key = 'yol_kariyer_v1';
    const s = JSON.parse(localStorage.getItem(key));
    s.stage = 'ufc';
    s.contract = { org: 'ufc', kalan: 4, ucret: 250000, bonus: 250000, munhasir: true };
    s.phase = 'kutlama';
    s.pending = {};
    s.kutlama = { tur: 'kemer', org: 'ufc', siklet: s.fighter.siklet };
    s.kemerler = [...(s.kemerler ?? []), { org: 'ufc', siklet: s.fighter.siklet, savunma: 0, hafta: s.hafta, yas: 27, aktif: true }];
    s.rekor = { ...s.rekor, g: 18, m: 2, b: 0, ko: 9, sub: 5, karar: 4 };
    localStorage.setItem(key, JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(900);
  await kariyereGir();
  await sleep(1200);
  await tam('kemer');
}
// D) Gençlik Yolu
if (hedef.includes('genclik')) {
  await open({ kariyer: readFileSync(GENC, 'utf8') });
  await kariyereGir();
  await sleep(600);
  await tam('genclik');
}
// E) Menajer Modu ana ekranı
if (hedef.includes('menajer')) {
  await open({ menajer: readFileSync(MEN, 'utf8') });
  await tapRe('^\\S*\\s*MENAJER\\s*MODU', 1500);
  await tapRe('^\\S*\\s*DEVAM', 1500);
  await tam('menajer');
}
// F) Patron Modu girişi
if (hedef.includes('patron')) {
  await open({});
  await tapRe('PATRON\\s*MODU', 1500);
  await tam('patron-giris');
}
await browser.close();
