// TikTok reklam görselleri (9:16, 1080×1920): yalnızca para göstermeyen ekranlar (dövüş, kemer, hakem, antrenör,
// yürüyüş, efsaneler). Metinlerde "kazan / para / ödül" yok (TikTok aldatıcı ödül kuralı).
// Yazılar TikTok arayüzünün kapatmadığı üst bölgede durur (alt %25 ve sağ kenar TikTok düğmeleriyle örtülür).
// Önce: node scripts/store-shots.mjs <dil> (ham ekranlar store/graphics/<dil>/ham altında olmalı)
// Çalıştırma: node scripts/tiktok-ads.mjs [tr en es pt pl]
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = fileURLToPath(new URL('..', import.meta.url));
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['tr', 'en', 'es', 'pt', 'pl'];
const W = 1080;
const H = 1920;

const CAP = {
  dovus: { tr: 'Kafeste kendi elinle dövüş', en: 'Fight with your own hands', es: 'Pelea con tus propias manos', pt: 'Lute com as próprias mãos', pl: 'Walcz własnymi rękami' },
  hakem: { tr: 'Sen hakem olsan durdurur muydun?', en: 'Would you stop the fight?', es: '¿Tú pararías la pelea?', pt: 'Você pararia a luta?', pl: 'Przerwałbyś tę walkę?' },
  kemer: { tr: 'Kemer için dövüş', en: 'Fight for the belt', es: 'Pelea por el cinturón', pt: 'Lute pelo cinturão', pl: 'Walcz o pas' },
  antrenor: { tr: 'Kendi şampiyonunu yetiştir', en: 'Raise your own champion', es: 'Forma a tu propio campeón', pt: 'Forme seu próprio campeão', pl: 'Wychowaj własnego mistrza' },
  yuruyus: { tr: 'Kafese yürü, adını haykırsınlar', en: 'Walk out. Hear your name.', es: 'Sal a la jaula, oye tu nombre', pt: 'Entre no octógono, ouça seu nome', pl: 'Wejdź do klatki, usłysz swoje imię' },
  efsane: { tr: 'Efsanelerin yolunu yürü', en: 'Walk the road of legends', es: 'Recorre el camino de las leyendas', pt: 'Trilhe o caminho das lendas', pl: 'Przejdź drogę legend' },
};
const CTA = { tr: 'MMA kariyer oyunu · Ücretsiz', en: 'MMA career game · Free', es: 'Juego de carrera MMA · Gratis', pt: 'Jogo de carreira MMA · Grátis', pl: 'Gra o karierze MMA · Za darmo' };
const ORDER = ['dovus', 'hakem', 'kemer', 'antrenor', 'yuruyus', 'efsane'];

const font = (f) => readFileSync(`${root}/node_modules/@expo-google-fonts/${f}`).toString('base64');
const OS = font('oswald/700Bold/Oswald_700Bold.ttf');
const INTER = font('inter/600SemiBold/Inter_600SemiBold.ttf');
const logo = readFileSync(`${root}/assets/splash-icon.png`).toString('base64');

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const g = await browser.newPage();
await g.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
for (const lang of langs) {
  const raw = `${root}/store/graphics/${lang}/ham`;
  const out = `${root}/store/tiktok/${lang}`;
  mkdirSync(out, { recursive: true });
  let n = 0;
  for (const name of ORDER) {
    const file = `${raw}/${name}.png`;
    if (!existsSync(file)) {
      console.log(lang, name, 'ham ekran yok, atlandı');
      continue;
    }
    const cap = CAP[name][lang];
    const img = readFileSync(file).toString('base64');
    await g.setContent(`<html><head><style>
@font-face{font-family:Os;src:url(data:font/ttf;base64,${OS})}
@font-face{font-family:In;src:url(data:font/ttf;base64,${INTER})}
body{margin:0;width:${W}px;height:${H}px;overflow:hidden;position:relative;background:linear-gradient(170deg,#3b0d14 0%,#12070a 40%,#060607 100%);font-family:In}
.s{position:absolute;top:-200px;width:24px;height:2600px;background:#e63946;opacity:.10;transform:rotate(28deg)}
.top{position:absolute;top:150px;left:70px;right:150px;display:flex;flex-direction:column;align-items:flex-start;gap:14px}
.logo{display:flex;align-items:center;gap:14px}
.logo img{width:74px;height:74px;filter:drop-shadow(0 0 18px rgba(230,57,70,.6))}
.logo span{font-family:Os;font-size:44px;letter-spacing:10px;color:#e63946}
.cap{font-family:Os;font-size:${cap.length > 26 ? 84 : 98}px;line-height:1.04;color:#fff;text-shadow:0 6px 24px rgba(0,0,0,.6)}
.cta{font-size:34px;color:#111;background:#f2c14e;border-radius:40px;padding:10px 26px;font-weight:600}
.ph{position:absolute;left:${(W - 760) / 2}px;top:${cap.length > 26 ? 640 : 560}px;width:760px;height:1351px;border-radius:52px;overflow:hidden;border:10px solid #1b1d22;box-shadow:0 40px 120px rgba(0,0,0,.7)}
.ph img{width:100%;height:100%;object-fit:cover;object-position:top}
</style></head><body>
${[0, 1, 2, 3].map((k) => `<div class="s" style="left:${280 + k * 180}px"></div>`).join('')}
<div class="top">
  <div class="logo"><img src="data:image/png;base64,${logo}"/><span>YOL</span></div>
  <div class="cap">${cap}</div>
  <div class="cta">${CTA[lang]}</div>
</div>
<div class="ph"><img src="data:image/png;base64,${img}"/></div>
</body></html>`);
    await new Promise((r) => setTimeout(r, 250));
    n++;
    await g.screenshot({ path: `${out}/${String(n).padStart(2, '0')}-${name}.png` });
  }
  console.log(lang, n, 'görsel');
}
await browser.close();
