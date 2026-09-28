// Google Play görselleri: oyunun web derlemesini oynayarak 1080×1920 ekran görüntüleri ve 1024×500 tanıtım görseli üretir.
// Önce: CI=1 npm run build:web  ve  npx serve dist -s -l 8088
// Çalıştırma: node scripts/store-shots.mjs [tr|en] [adres]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const lang = process.argv[2] ?? 'tr';
const URL_ = process.argv[3] ?? 'http://localhost:8088/';
const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}/store/graphics/${lang}`;
mkdirSync(out, { recursive: true });

const T = {
  tr: {
    yeni: 'YENİ KARİYER', dev: 'DEVAM', ad: ['Kerem', 'Aksoy', 'Demir Yumruk'], sehir: 'Erzurum', sik: 'Welter', bg: 'GÜREŞ\n', yaz: 'BENİM İÇİN YAZ', bas: 'KARİYERE BAŞLA',
    plan: 'OYUN PLANI', akis: 'MAÇ AKIYOR', sonra: 'KAFES İÇİ RÖPORTAJ', devamEt: 'DEVAM ET', anladim: 'İpuçlarını kapat',
    pri: ['ATLA', 'Yüz yüze gel', 'Soğukkanlı bak', 'aynı planla', 'DÖVÜŞ AYARLA', 'Hemen kampa gir', 'Standart kamp', 'Hızlı hazırlık', 'Kısa ve ucuz', 'Kendi salonunda', 'Bu rakibi seç', 'KABUL ET', 'Güreş\n', 'Güreşle indir', 'Orta\n', 'Normal\n', 'Saygılı ol', 'Yine de dövüş', 'Tüm kampı simüle et', 'Tartıya çık', 'Dövüş gecesi', 'Takedown dene', 'Bitirmeye git', 'Sık, bitir', 'Sabırla savun', 'Dövüş sonrası', '“', 'DEVAM'],
    grafikUst: 'KAFESTEN KEMERE', grafikAlt: 'Sokaktan dünya şampiyonluğuna. Her karar senin.',
  },
  en: {
    yeni: 'NEW CAREER', dev: 'CONTINUE', ad: ['Kerem', 'Aksoy', 'Iron Fist'], sehir: 'Istanbul', sik: 'Welterweight', bg: 'WRESTLING\n', yaz: 'WRITE IT FOR ME', bas: 'START CAREER',
    plan: 'GAME PLAN', akis: 'FIGHT IN PROGRESS', sonra: 'IN-CAGE INTERVIEW', devamEt: 'CONTINUE', anladim: 'Turn off tips',
    pri: ['SKIP', 'Face off', 'Stare coldly', 'with the same plan', 'SET UP A FIGHT', 'Go straight into camp', 'Standard camp', 'Quick preparation', 'Short and cheap', 'At your own gym', 'Pick this opponent', 'ACCEPT', 'Wrestling\n', 'Take them down', 'Medium\n', 'Normal\n', 'Be respectful', 'Fight anyway', 'Simulate the whole camp', 'Step on the scale', 'Fight night', 'Go for a takedown', 'Go for the finish', 'Squeeze, finish', 'Defend patiently', 'Post-fight', '“', 'CONTINUE'],
    grafikUst: 'FROM CAGE TO BELT', grafikAlt: 'From the streets to world champion. Every choice is yours.',
  },
}[lang];

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.evaluateOnNewDocument((l) => localStorage.setItem('yol_dil', l), lang);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const up = (s) => s.toLocaleUpperCase(lang === 'tr' ? 'tr' : 'en');
const buttons = () => page.$$eval('[tabindex="0"]', (els) => els.map((e) => e.innerText.trim()));
const body = () => page.$eval('body', (b) => b.innerText);
async function click(t) {
  const b = await buttons();
  const i = b.findIndex((x) => up(x).includes(up(t)));
  if (i < 0) return false;
  await (await page.$$('[tabindex="0"]'))[i].click();
  await sleep(160);
  return true;
}
let n = 0;
const shot = async (name) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` });
  console.log('📸', name);
};

await page.goto(URL_, { waitUntil: 'networkidle0' });
await sleep(900);

// Karakter oluşturma
await click(T.yeni);
const inp = await page.$$('input');
for (let i = 0; i < 3; i++) await inp[i].type(T.ad[i]);
await click(T.dev);
(await page.$$('input'))[0].type(T.sehir);
await sleep(100);
await click(T.dev);
await click(T.dev);
await click('24');
await click(T.dev);
await click(T.sik);
await click(T.dev);
await click(T.bg);
await click(T.dev);
await sleep(200);
await click('Mohawk');
await shot('karakter');
await click(T.dev);
await click(T.yaz);
await click(T.dev);
await click(T.bas);
await sleep(400);
await click(T.anladim);
await sleep(200);
await shot('kulup');

// Kariyer akışı: plan ekranı, canlı dövüş ve maç sonrası
let stuck = 0;
const want = new Set(['plan', 'dovus', 'sonra']);
for (let step = 0; step < 400 && want.size; step++) {
  const txt = await body();
  if (want.has('plan') && txt.includes(T.plan) && (await buttons()).some((b) => b.includes('\n'))) {
    want.delete('plan');
    await shot('oyun-plani');
  }
  if (want.has('dovus') && txt.includes(T.akis)) {
    await sleep(1600);
    want.delete('dovus');
    await shot('dovus');
  }
  if (want.has('sonra') && txt.includes(T.sonra)) {
    await sleep(600);
    want.delete('sonra');
    await shot('mac-sonrasi');
  }
  let done = false;
  for (const p of T.pri) if (await click(p)) { done = true; if (process.env.DEBUG && step < 25) console.log('tık', step, p); break; }
  if (!done) {
    const b = await buttons();
    const i = b.findIndex((x) => /^1\n/.test(x));
    if (i < 0) {
      // Ekran geçişi sürüyor olabilir: biraz bekleyip yeniden dene.
      if ((stuck = (stuck ?? 0) + 1) < 8) {
        await sleep(500);
        continue;
      }
      console.log('Akış durdu, butonlar:', b.join(' | ').slice(0, 500));
      break;
    }
    stuck = 0;
    await (await page.$$('[tabindex="0"]'))[i].click();
    await sleep(160);
  }
}

// Kemer kutlaması (kayıt kutlama anına çevrilir)
await page.evaluate(() => {
  const key = Object.keys(localStorage).find((k) => k.startsWith('yol_kariyer'));
  const s = JSON.parse(localStorage.getItem(key));
  s.phase = 'kutlama';
  s.pending = {};
  s.kutlama = { tur: 'kemer', org: 'ufc', siklet: s.fighter.siklet };
  s.kemerler = [{ org: 'ufc', siklet: s.fighter.siklet, savunma: 0, hafta: s.hafta, yas: s.fighter.yas, aktif: true }];
  s.rekor = { ...s.rekor, g: 18, m: 2, b: 0, ko: 9, sub: 5, karar: 4 };
  localStorage.setItem(key, JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle0' });
await sleep(800);
await click(T.devamEt);
await sleep(1500);
await shot('kemer');

// Paylaşım kartının kendisi (1080×1920 PNG)
const shareBtn = (await buttons()).findIndex((x) => /PAYLAŞ|SHARE/.test(x));
if (shareBtn >= 0) {
  await (await page.$$('[tabindex="0"]'))[shareBtn].click();
  await page.waitForFunction(() => [...document.querySelectorAll('img')].some((i) => i.src.startsWith('data:image/png')), { timeout: 15000 });
  const src = await page.$$eval('img', (els) => els.find((i) => i.src.startsWith('data:image/png')).src);
  writeFileSync(`${out}/${String(++n).padStart(2, '0')}-paylasim-karti.png`, Buffer.from(src.split(',')[1], 'base64'));
  console.log('📸 paylasim-karti');
}

// Tanıtım görseli 1024×500
const font = (f) => readFileSync(`${root}/node_modules/@expo-google-fonts/${f}`).toString('base64');
const icon = readFileSync(`${root}/assets/splash-icon.png`).toString('base64');
const g = await browser.newPage();
await g.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
await g.setContent(`<html><head><style>
@font-face{font-family:Os;src:url(data:font/ttf;base64,${font('oswald/700Bold/Oswald_700Bold.ttf')})}
@font-face{font-family:In;src:url(data:font/ttf;base64,${font('inter/600SemiBold/Inter_600SemiBold.ttf')})}
body{margin:0;width:1024px;height:500px;overflow:hidden;background:linear-gradient(120deg,#2a0a10 0%,#0b0c10 55%,#050506 100%);font-family:In;color:#fff;position:relative}
.s{position:absolute;top:-50px;width:14px;height:700px;background:#e63946;opacity:.18;transform:rotate(28deg)}
.logo{position:absolute;left:70px;top:95px;width:310px;height:310px;filter:drop-shadow(0 0 40px rgba(230,57,70,.55))}
.t{position:absolute;left:430px;top:110px;right:40px}
.yol{font-family:Os;font-size:150px;line-height:1;color:#e63946;letter-spacing:18px;transform:skewX(-8deg)}
.ust{font-family:Os;font-size:52px;line-height:1.1;color:#f2c14e;transform:skewX(-8deg);margin-top:6px}
.alt{font-size:24px;color:#c9ccd4;margin-top:18px;max-width:520px}
</style></head><body>
${[0, 1, 2, 3].map((i) => `<div class="s" style="left:${520 + i * 120}px"></div>`).join('')}
<img class="logo" src="data:image/png;base64,${icon}"/>
<div class="t"><div class="yol">YOL</div><div class="ust">${T.grafikUst}</div><div class="alt">${T.grafikAlt}</div></div>
</body></html>`);
await sleep(300);
await g.screenshot({ path: `${out}/tanitim-1024x500.png` });
console.log('📸 tanitim-1024x500');
await browser.close();
