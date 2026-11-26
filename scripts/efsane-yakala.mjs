// Efsane Yolları fragmanı için oyundan kayıtlar: efsane listesi (kaydırma), Conor McGrath bölümleri, bölüm girişleri
// (1. bölüm, "13 Saniye", "Ya öyle olsaydı?"), maç öncesi karşılaştırma ve kafesteki ilk maçtan canlı kayıt.
// Çalıştırma: CHROME=... node scripts/efsane-yakala.mjs <ffmpeg>   (önce: npx serve dist -s -l 8088)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const [FF] = process.argv.slice(2);
const root = fileURLToPath(new URL('..', import.meta.url));
const OUT = `${root}/store/video/acik-efsaneyol`;
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
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const q = el.getBoundingClientRect();
    return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
  }, re);
  if (!b) return false;
  await sleep(700);
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
const bts = async () => (await page.evaluate(() => [...document.querySelectorAll('[tabindex="0"]')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 40)).filter(Boolean))).join(' | ');
// Açık penceredeki kaydırılabilir alan (Efsane Yolları listesi)
const scroller = () => page.evaluateHandle(() => {
  let e = [...document.querySelectorAll('div')].find((d) => /^\S*\s*CONOR MCGRATH/.test(d.innerText) && d.getAttribute('tabindex') === '0');
  while (e && !(e.scrollHeight > e.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(e).overflowY))) e = e.parentElement;
  return e;
});
const karrier = () => page.evaluate(() => localStorage.getItem('yol_kariyer_v1'));
// Oyun kapanırken kaydı yeniden yazdığı için yeni kayıt sayfa yüklenmeden (ilk betikte) yerleştirilir
let zorlaKurulu = false;
const kayitYukle = async (k) => {
  if (!zorlaKurulu) {
    zorlaKurulu = true;
    await page.evaluateOnNewDocument(() => {
      const z = sessionStorage.getItem('zorla');
      if (z) { localStorage.setItem('yol_kariyer_v1', z); sessionStorage.removeItem('zorla'); }
    });
  }
  await page.evaluate((v) => sessionStorage.setItem('zorla', v), k);
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1500);
  await tapRe('^\\S*\\s*Amatör', 2400); // menüden kariyere (kariyer kartı)
};
const efsaneAyarla = (fn, temel) => {
  const s = JSON.parse(temel);
  new Function('s', fn)(s);
  return kayitYukle(JSON.stringify(s));
};

// 1) Menü → Efsane Yolları: liste ve yavaş kaydırma
await open({});
await tapRe('EFSANE YOLLARI', 1400);
await shot('liste');
const sc = await scroller();
await rec('liste', async () => {
  await sleep(400);
  await page.evaluate(async (el) => {
    const max = el.scrollHeight - el.clientHeight;
    const t0 = performance.now();
    await new Promise((res) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / 4200);
        el.scrollTop = max * 0.85 * (0.5 - Math.cos(Math.PI * k) / 2);
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }, sc);
  await sleep(500);
});
await page.evaluate((el) => { el.scrollTop = 0; }, sc);
await sleep(600);

// 2) Conor McGrath: bölümler, sonra hikâyeyi başlat ve 1. bölüm girişi
await tapRe('^\\S*\\s*CONOR MCGRATH', 1300);
await page.evaluate((el) => { el.scrollTop = 85; }, sc);
await sleep(700);
await shot('bolumler');
await tapRe('HİKÂYEYİ BAŞLAT', 2600);
await shot('giris1');
const ilk = await karrier();
// 3) "13 Saniye" girişi ve "Ya öyle olsaydı?" bonus bölümü (kayda bölüm bilgisi yazılarak)
const yildiz = "s.efsane.yildiz = { cirak: [0, 1, 2], ders: [0, 1, 2], ikikemer: [0, 1], ucc: [0, 1, 2], tur: [0, 2] };";
await efsaneAyarla(`${yildiz} s.efsane.bolum = 5; s.efsane.giris = 5;`, ilk);
await shot('giris6');
await efsaneAyarla(`${yildiz} Object.assign(s.efsane.yildiz, { onucsaniye: [0, 1, 2], cifte: [0, 1, 2], parabovusu: [0, 1], imparatorluk: [0, 1, 2] }); s.efsane.bolum = 9; s.efsane.bitti = true; s.efsane.bonus = true; s.efsane.giris = 9;`, ilk);
await shot('bonus');
await kayitYukle(ilk);

// 4) İlk maça kadar ilerle (kamp, tartı, yüz yüze, yürüyüş)
await tapRe('BAŞLA', 1500);
await tapRe('ANLADIM', 800);
await tapRe('DÖVÜŞ AYARLA', 1500);
await page.evaluate(() => { const e = [...document.querySelectorAll('[tabindex="0"]')].filter((e) => /\d+-\d+-\d+/.test(e.innerText) && e.getBoundingClientRect().width > 0)[1]; e?.click(); });
await sleep(1200);
await tapRe('BU RAKİBİ SEÇ', 1500);
await tapRe('HOCANIN PLANIYLA', 1500);
await tapRe('ATLA, KAMP', 1500);
let last = '';
for (let w = 0; w < 80; w++) {
  const b = await bts();
  if (b !== last) { console.log('·', b.slice(0, 160)); last = b; }
  if (/TAKTİK İZLE/.test(b)) break;
  if (/HIZLANDIR/.test(b)) { await sleep(1500); continue; }
  if (await tapRe('^\\S*\\s*(ŞOV YAP|GÖZDAĞI|DEVAM|BAŞLA|SON 48|HAZIRIM|YİNE DE|ANLADIM|YÜZ YÜZE|KAPILARI|DÖVÜŞ GECESİ)', 1500)) continue;
  const ok = await page.evaluate(() => { const e = [...document.querySelectorAll('[tabindex="0"]')].filter((e) => e.getBoundingClientRect().width > 0 && e.innerText.trim().length > 3 && !/ANA MENÜ|MAÇ AFİŞİ|İpuçlarını|ÇEKİL|ÖZELLİK|TEKNİK|YETENEK|İMZA|GÖSTER|Kariyer|Gelişim|Hayat|Profil|GERİ/.test(e.innerText)).pop(); if (!e) return null; e.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (!ok) throw new Error('maça ulaşılamadı: ' + b);
  if (w > 70) throw new Error('maça ulaşılamadı (döngü): ' + b);
  await sleep(500);
  await page.mouse.click(ok.x, ok.y);
  await sleep(1500);
}
await sleep(800);
await shot('vs');
await tapRe('TAHMİN YAPMADAN GEÇ', 1200);
await rec('yuruyus', async () => {
  await tapRe('KAFESE YÜRÜ', 300);
  await sleep(7000);
});
for (let w = 0; w < 30; w++) {
  if (await tapRe('^\\S*\\s*TAKTİK İZLE', 700)) break;
  await tapRe('^\\S*\\s*(ANLADIM|ATLA|DEVAM|GONG)', 600);
  await sleep(600);
}
await shot('kafes-oncesi');
await rec('kafes', async () => {
  await tapRe('BASKI KUR', 300);
  await sleep(9500);
});
await shot('kafes-sonra');
await browser.close();
console.log('✅', OUT);
