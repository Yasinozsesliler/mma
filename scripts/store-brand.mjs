// Premium mağaza görselleri: parlak metal kemerli ikon (512/1024) ve Google Play tanıtım görseli (1024x500, dil başına).
// Taslaktır; mevcut dosyaların üzerine yazmaz. Çıktı: store/brand/
// Çalıştırma: node scripts/store-brand.mjs
import { mkdirSync, readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = 'store/brand';
const font = (f) => readFileSync(`node_modules/@expo-google-fonts/${f}`).toString('base64');
const FONTS = `@font-face{font-family:Oswald;font-weight:700;src:url(data:font/ttf;base64,${font('oswald/700Bold/Oswald_700Bold.ttf')})}@font-face{font-family:Inter;font-weight:600;src:url(data:font/ttf;base64,${font('inter/600SemiBold/Inter_600SemiBold.ttf')})}`;
mkdirSync(OUT, { recursive: true });

const oct = (cx, cy, r) =>
  Array.from({ length: 8 }, (_, i) => {
    const a = ((22.5 + 45 * i) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

/** Amblem: kırmızı metal sekizgen kafes + altın şampiyonluk kemeri. 1024 birimlik kare içinde çizilir. */
function emblem(id = 'e', { bg = true } = {}) {
  const C = 512;
  const studs = [210, 270, 330, 694, 754, 814].map((x) => `<circle cx="${x}" cy="512" r="9" fill="url(#${id}stud)" stroke="#6b4a10" stroke-width="2"/>`).join('');
  return `
  <defs>
    <radialGradient id="${id}bg" cx="50%" cy="42%" r="70%">
      <stop offset="0" stop-color="#3a0d16"/><stop offset="0.45" stop-color="#170a0e"/><stop offset="1" stop-color="#070709"/>
    </radialGradient>
    <radialGradient id="${id}spot" cx="50%" cy="0%" r="75%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}red" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff6b78"/><stop offset="0.18" stop-color="#ef3346"/><stop offset="0.55" stop-color="#c8162c"/><stop offset="0.85" stop-color="#8e0a1b"/><stop offset="1" stop-color="#c41b2f"/>
    </linearGradient>
    <linearGradient id="${id}redIn" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#ff7d89"/><stop offset="0.5" stop-color="#7a0816"/><stop offset="1" stop-color="#3d040b"/>
    </linearGradient>
    <radialGradient id="${id}cage" cx="50%" cy="45%" r="60%">
      <stop offset="0" stop-color="#1d1f26"/><stop offset="1" stop-color="#08080b"/>
    </radialGradient>
    <pattern id="${id}mesh" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(45 512 512)">
      <path d="M0 0H44M0 0V44" stroke="#5b606e" stroke-width="3" fill="none"/>
    </pattern>
    <radialGradient id="${id}meshFade" cx="50%" cy="45%" r="55%">
      <stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0.08"/>
    </radialGradient>
    <mask id="${id}meshMask"><rect width="1024" height="1024" fill="url(#${id}meshFade)"/></mask>
    <clipPath id="${id}inner"><polygon points="${oct(C, C, 338)}"/></clipPath>
    <linearGradient id="${id}gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff6cf"/><stop offset="0.16" stop-color="#ffd86b"/><stop offset="0.42" stop-color="#e2a632"/><stop offset="0.58" stop-color="#9c6716"/><stop offset="0.78" stop-color="#e5b14a"/><stop offset="1" stop-color="#7a4f10"/>
    </linearGradient>
    <linearGradient id="${id}goldDiag" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff3c4"/><stop offset="0.3" stop-color="#f6c94f"/><stop offset="0.55" stop-color="#a9701a"/><stop offset="0.8" stop-color="#f0c35a"/><stop offset="1" stop-color="#6e450c"/>
    </linearGradient>
    <linearGradient id="${id}goldRim" x1="1" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#fff0b0"/><stop offset="0.5" stop-color="#8a5a12"/><stop offset="1" stop-color="#ffe08a"/>
    </linearGradient>
    <radialGradient id="${id}stud" cx="35%" cy="30%" r="70%">
      <stop offset="0" stop-color="#fffbe6"/><stop offset="0.5" stop-color="#e9b544"/><stop offset="1" stop-color="#7a4f10"/>
    </radialGradient>
    <radialGradient id="${id}gem" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#ffb3bc"/><stop offset="0.25" stop-color="#ff3b52"/><stop offset="0.7" stop-color="#b00d24"/><stop offset="1" stop-color="#4d0510"/>
    </radialGradient>
    <linearGradient id="${id}shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <filter id="${id}glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="28" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${id}shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity="0.75"/>
    </filter>
    <clipPath id="${id}plateClip"><polygon points="${oct(C, C, 150)}"/></clipPath>
  </defs>
  ${bg ? `<rect width="1024" height="1024" fill="url(#${id}bg)"/><rect width="1024" height="1024" fill="url(#${id}spot)"/>` : ''}
  <!-- Kafes: kırmızı metal çerçeve -->
  <polygon points="${oct(C, C, 420)}" fill="#e63946" opacity="0.35" filter="url(#${id}glow)"/>
  <polygon points="${oct(C, C, 420)}" fill="url(#${id}red)" filter="url(#${id}shadow)"/>
  <polygon points="${oct(C, C, 404)}" fill="none" stroke="#ff9aa4" stroke-opacity="0.45" stroke-width="4"/>
  <polygon points="${oct(C, C, 352)}" fill="url(#${id}redIn)"/>
  <polygon points="${oct(C, C, 338)}" fill="url(#${id}cage)"/>
  <g clip-path="url(#${id}inner)">
    <rect width="1024" height="1024" fill="url(#${id}mesh)" mask="url(#${id}meshMask)"/>
    <ellipse cx="512" cy="300" rx="300" ry="190" fill="#ffffff" opacity="0.05"/>
    <!-- Kemer kayışı -->
    <g filter="url(#${id}shadow)">
      <rect x="150" y="448" width="724" height="128" fill="url(#${id}gold)"/>
      <rect x="150" y="448" width="724" height="10" fill="#fff8d8" opacity="0.65"/>
      <rect x="150" y="566" width="724" height="10" fill="#5a3a08" opacity="0.7"/>
      <line x1="150" y1="472" x2="874" y2="472" stroke="#7a4f10" stroke-width="3" stroke-dasharray="14 10" opacity="0.7"/>
      <line x1="150" y1="552" x2="874" y2="552" stroke="#7a4f10" stroke-width="3" stroke-dasharray="14 10" opacity="0.7"/>
      ${studs}
    </g>
  </g>
  <!-- Orta plaka -->
  <g filter="url(#${id}shadow)">
    <polygon points="${oct(C, C, 182)}" fill="url(#${id}goldRim)"/>
    <polygon points="${oct(C, C, 168)}" fill="#5c3a09"/>
    <polygon points="${oct(C, C, 160)}" fill="url(#${id}goldDiag)"/>
    <polygon points="${oct(C, C, 118)}" fill="none" stroke="#7a4f10" stroke-width="5" opacity="0.8"/>
    <polygon points="${oct(C, C, 112)}" fill="none" stroke="#fff3c4" stroke-width="2" opacity="0.7"/>
    ${Array.from({ length: 8 }, (_, i) => {
      const a = ((45 * i) * Math.PI) / 180;
      return `<circle cx="${(C + 138 * Math.cos(a)).toFixed(1)}" cy="${(C + 138 * Math.sin(a)).toFixed(1)}" r="8" fill="url(#${id}stud)"/>`;
    }).join('')}
    <polygon points="${oct(C, C, 74)}" fill="#3d0309"/>
    <polygon points="${oct(C, C, 66)}" fill="url(#${id}gem)"/>
    <polygon points="${C - 30},${C - 40} ${C - 6},${C - 50} ${C - 16},${C - 22}" fill="#fff" opacity="0.75"/>
    <ellipse cx="${C + 22}" cy="${C + 30}" rx="16" ry="7" fill="#ff8090" opacity="0.5"/>
    <g clip-path="url(#${id}plateClip)">
      <rect x="300" y="300" width="70" height="420" fill="url(#${id}shine)" transform="rotate(28 512 512)" opacity="0.55"/>
    </g>
  </g>
  <!-- Parıltılar -->
  <g fill="#fff">
    <path d="M${C + 150} ${C - 150} l6 18 18 6 -18 6 -6 18 -6 -18 -18 -6 18 -6z" opacity="0.9"/>
    <path d="M${C - 260} ${C - 44} l4 12 12 4 -12 4 -4 12 -4 -12 -12 -4 12 -4z" opacity="0.7"/>
  </g>`;
}

const iconHtml = (size) => `<!doctype html><html><body style="margin:0;background:#000">
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${emblem('i')}</svg></body></html>`;

const BANNER = {
  tr: ['KAFESTEN KEMERE', 'Sokaktan dünya şampiyonluğuna.', 'Her karar senin.'],
  en: ['FROM CAGE TO BELT', 'From the streets to world champion.', 'Every choice is yours.'],
  es: ['DE LA JAULA AL CINTURÓN', 'De la calle a campeón del mundo.', 'Cada decisión es tuya.'],
  pt: ['DO OCTÓGONO AO CINTURÃO', 'Das ruas a campeão mundial.', 'Cada escolha é sua.'],
  ru: ['ИЗ КЛЕТКИ К ПОЯСУ', 'С улицы до чемпиона мира.', 'Каждое решение за тобой.'],
  pl: ['Z KLATKI DO PASA', 'Z ulicy do mistrzostwa świata.', 'Każdy wybór należy do ciebie.'],
  de: ['VOM KÄFIG ZUM GÜRTEL', 'Von der Straße zum Weltmeister.', 'Jede Entscheidung liegt bei dir.'],
  fr: ['DE LA CAGE À LA CEINTURE', 'De la rue au titre mondial.', 'Chaque choix t’appartient.'],
};

const featureHtml = (lang) => {
  const [title, l1, l2] = BANNER[lang];
  const crowd = Array.from({ length: 70 }, (_, i) => {
    const x = (i * 15.3 + (i % 3) * 5) % 1060 - 20;
    const h = 16 + ((i * 37) % 14);
    return `<ellipse cx="${x}" cy="${500 - h + 6}" rx="9" ry="10" fill="#120d10"/><rect x="${x - 13}" y="${500 - h + 12}" width="26" height="${h}" rx="10" fill="#120d10"/>`;
  }).join('');
  return `<!doctype html><html><head>
<style>${FONTS}
  body{margin:0;width:1024px;height:500px;overflow:hidden;background:#060607;font-family:Inter,sans-serif}
  .wrap{position:relative;width:1024px;height:500px}
  svg.bg{position:absolute;inset:0}
  .em{position:absolute;left:26px;top:22px;width:456px;height:456px}
  .txt{position:absolute;left:478px;right:34px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center}
  .yol{font-family:Oswald;font-weight:700;font-style:italic;font-size:150px;line-height:1;letter-spacing:18px;transform:skewX(-6deg);
       background:linear-gradient(180deg,#ff8a95 0%,#f0334a 38%,#a10f22 70%,#e8394c 100%);-webkit-background-clip:text;color:transparent;
       filter:drop-shadow(0 6px 10px rgba(0,0,0,.7)) drop-shadow(0 0 26px rgba(230,57,70,.35))}
  .title{font-family:Oswald;font-weight:700;font-size:${title.length > 18 ? 42 : 50}px;line-height:1.05;letter-spacing:2px;margin-top:6px;transform:skewX(-6deg);white-space:nowrap;
       background:linear-gradient(180deg,#fff6cf 0%,#ffd86b 30%,#d99a2b 58%,#9c6716 72%,#f2c14e 100%);-webkit-background-clip:text;color:transparent;
       filter:drop-shadow(0 4px 6px rgba(0,0,0,.8))}
  .rule{height:3px;width:120px;margin:18px 0 14px;background:linear-gradient(90deg,#f2c14e,rgba(242,193,78,0))}
  .tag{color:#e9e6df;font-weight:600;font-size:23px;line-height:1.35;text-shadow:0 2px 8px #000}
</style></head><body><div class="wrap">
<svg class="bg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <radialGradient id="g1" cx="25%" cy="50%" r="55%"><stop offset="0" stop-color="#4a0f19"/><stop offset="0.6" stop-color="#14080b"/><stop offset="1" stop-color="#060607"/></radialGradient>
    <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060607" stop-opacity="0"/><stop offset="1" stop-color="#060607"/></linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#g1)"/>
  <polygon points="560,0 640,0 860,500 380,500" fill="url(#cone)"/>
  <polygon points="820,0 880,0 1060,500 700,500" fill="url(#cone)" opacity="0.7"/>
  <polygon points="190,0 270,0 470,500 -20,500" fill="url(#cone)" opacity="0.8"/>
  ${Array.from({ length: 5 }, (_, i) => `<line x1="${700 + i * 90}" y1="-20" x2="${560 + i * 90}" y2="520" stroke="#e63946" stroke-opacity="${0.1 + i * 0.02}" stroke-width="10"/>`).join('')}
  ${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 1024}" cy="${(i * 53) % 260}" r="${1 + (i % 3)}" fill="#fff" opacity="${0.12 + (i % 4) * 0.08}"/>`).join('')}
  <g opacity="0.9">${crowd}</g>
  <rect y="380" width="1024" height="120" fill="url(#floor)"/>
</svg>
<svg class="em" viewBox="0 0 1024 1024">${emblem('f', { bg: false })}</svg>
<div class="txt"><div class="yol">YOL</div><div class="title">${title}</div><div class="rule"></div><div class="tag">${l1}<br>${l2}</div></div>
</div></body></html>`;
};

if (process.argv[2] === 'app') {
  await appIcons();
  process.exit(0);
}
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
for (const size of [512, 1024]) {
  await page.setViewport({ width: size, height: size });
  await page.setContent(iconHtml(size), { waitUntil: 'load' });
  await page.screenshot({ path: `${OUT}/icon-${size}.png`, clip: { x: 0, y: 0, width: size, height: size } });
}
const langs = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(BANNER);
for (const l of langs) {
  await page.setViewport({ width: 1024, height: 500 });
  await page.setContent(featureHtml(l), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Başlık kutuya sığana kadar küçülür (eğik yazı payı dahil)
  await page.evaluate(() => {
    const t = document.querySelector('.title');
    const max = document.querySelector('.txt').clientWidth - 14;
    let fs = parseFloat(getComputedStyle(t).fontSize);
    t.style.width = 'max-content';
    while (t.getBoundingClientRect().width > max && fs > 20) t.style.fontSize = `${(fs -= 1)}px`;
  });
  await page.screenshot({ path: `${OUT}/tanitim-${l}-1024x500.png`, clip: { x: 0, y: 0, width: 1024, height: 500 } });
}
await browser.close();
console.log('tamam:', OUT);

// ---------- Uygulama ikonları (node scripts/store-brand.mjs app) ----------
// Tek renkli ikonlar (android-icon-monochrome, notification-icon) make-icons.mjs'teki sade siluette kalır.
export async function appIcons() {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
  const pg = await b.newPage();
  // frac: amblemin kenardan kenara kapladığı oran; bg: koyu zemin
  const jobs = [
    ['assets/icon.png', 1024, 0.86, true],
    ['assets/android-icon-foreground.png', 1024, 0.6, false],
    ['assets/splash-icon.png', 1024, 0.9, false],
    ['assets/favicon.png', 48, 0.94, true],
    ['public/icon-192.png', 192, 0.92, true],
    ['public/icon-512.png', 512, 0.92, true],
    ['public/icon-maskable-512.png', 512, 0.7, true],
    ['public/apple-touch-icon.png', 180, 0.86, true],
  ];
  for (const [path, size, frac, bg] of jobs) {
    const k = frac / 0.82;
    const html = `<!doctype html><html><body style="margin:0;background:transparent">
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
${bg ? '<rect width="1024" height="1024" fill="url(#abg)"/><rect width="1024" height="1024" fill="url(#aspot)"/>' : ''}
<g transform="translate(512 512) scale(${k}) translate(-512 -512)">${emblem('a', { bg: false })}</g></svg></body></html>`;
    await pg.setViewport({ width: size, height: size });
    await pg.setContent(html, { waitUntil: 'load' });
    await pg.screenshot({ path, clip: { x: 0, y: 0, width: size, height: size }, omitBackground: !bg });
    console.log('ikon', path);
  }
  await b.close();
}
