// Açık renkli reklam serisi (dikey 1080×1920): krem zemin, siyah-kırmızı tipografi, oyundan net görseller.
// Oyunun koyu arayüzü yerine oyunun aydınlık görselleri (pasaport, memleket çizimi) büyük ve temiz gösterilir.
// Önce: node scripts/acik-yakala.mjs <kayit.json> store/video/acik-<video>
// Çalıştırma: CHROME=... node scripts/acik-reklam.mjs <ffmpeg> <video>      (video: dunya)
// Çıktı: store/video/reklam-<video>.mp4
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const FF = process.argv[2];
const VIDEO = process.argv[3] ?? 'dunya';
const root = fileURLToPath(new URL('..', import.meta.url));
const src = `${root}/store/video/acik-${VIDEO}`;
const tmp = `${src}/parca`;
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
const FPS = 30;

// ---------- Ortak görünüm ----------
const b64 = (p) => readFileSync(`${root}/${p}`).toString('base64');
const font = (n, p) => `@font-face{font-family:${n};src:url(data:font/ttf;base64,${b64(`node_modules/@expo-google-fonts/${p}`)})}`;
const FONTS = font('Os', 'oswald/700Bold/Oswald_700Bold.ttf') + font('OsM', 'oswald/500Medium/Oswald_500Medium.ttf') + font('In', 'inter/600SemiBold/Inter_600SemiBold.ttf') + font('InB', 'inter/800ExtraBold/Inter_800ExtraBold.ttf');
const ICON = `data:image/png;base64,${b64('assets/splash-icon.png')}`;
const RED = '#e63946';
const INK = '#16120f';
const CREAM = '#f4ecdc';
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.3 0 0 0 0 0.2 0 0 0 0 0.1 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='260' height='260' filter='url(%23n)'/%3E%3C/svg%3E")`;
const CSS = `${FONTS}
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:1920px;overflow:hidden;position:relative;background:${CREAM};font-family:Os;color:${INK}}
.paper{position:absolute;inset:0;background:radial-gradient(90% 60% at 50% 42%,#fffaf0 0%,${CREAM} 60%,#e9dcc4 100%)}
.grain{position:absolute;inset:0;background-image:${GRAIN};opacity:.35;mix-blend-mode:multiply;pointer-events:none;z-index:50}
.logo{position:absolute;left:44px;top:46px;display:flex;align-items:center;gap:14px;font-size:34px;letter-spacing:6px;color:${RED};z-index:40}.logo img{width:54px}
.bar{position:absolute;left:0;right:0;height:14px;background:${RED};z-index:40}
.h{position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center;text-align:center;z-index:30}
.tag{font-family:InB;font-size:30px;letter-spacing:4px;color:#fff;background:${RED};padding:10px 26px;border-radius:40px;margin-bottom:22px;box-shadow:0 10px 30px rgba(230,57,70,.3)}
.l1{font-size:118px;line-height:1.02;letter-spacing:1px;transform:skewX(-7deg)}
.l2{font-size:104px;line-height:1.05;color:${RED};transform:skewX(-7deg);white-space:nowrap}
.card{position:absolute;border-radius:34px;overflow:hidden;background:#fff;border:12px solid #fff;box-shadow:0 40px 90px rgba(60,30,10,.28),0 8px 20px rgba(60,30,10,.18)}
.card img{display:block;width:100%}
@keyframes pop{0%{opacity:0;transform:translateY(40px) scale(.86)}60%{opacity:1;transform:translateY(-6px) scale(1.03)}100%{opacity:1;transform:none}}
@keyframes fadeUp{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:none}}
`;
const page0 = (body, extra = '', opts = {}) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}${extra}</style></head><body><div class="paper"></div>${body}${opts.logo === false ? '' : `<div class="logo"><img src="${ICON}"/>YOL</div>`}<div class="grain"></div></body></html>`;
const head = (top, tag, l1, l2, delay = 0.05) =>
  `<div class="h" style="top:${top}px">${tag ? `<div class="tag" style="animation:pop .45s ${delay}s both">${tag}</div>` : ''}<div class="l1" style="animation:pop .5s ${delay + 0.08}s both">${l1}</div>${l2 ? `<div class="l2" style="animation:pop .5s ${delay + 0.2}s both">${l2}</div>` : ''}</div>`;

// ---------- Videolar ----------
const CITY = { vegas: 'LAS VEGAS', lagos: 'LAGOS', houston: 'HOUSTON', baku: 'BAKÜ', saopaulo: 'SÃO PAULO', dublin: 'DUBLİN', riyad: 'RİYAD', istanbul: 'İSTANBUL', orlando: 'ORLANDO', miami: 'MIAMI', paris: 'PARİS', bratislava: 'BRATİSLAVA', koln: 'KÖLN', amsterdam: 'AMSTERDAM', dubai: 'DUBAİ', sanjuan: 'SAN JUAN' };
const SCENES = [];
let END_TAG = 'APP STORE · GOOGLE PLAY';
if (VIDEO === 'dunya') {
  const info = JSON.parse(readFileSync(`${src}/bilgi.json`, 'utf8'));
  // Pasaport: krem damga sayfası tam ekran, yavaş kaydırma
  const PAS = `${src}/pasaport.png`;
  const pas = (y0, y1, s0, s1, d) => `<img src="file://${PAS}" style="position:absolute;left:0;top:0;width:1080px;transform-origin:50% 0%;animation:pan ${d}s linear both"/><style>@keyframes pan{from{transform:translateY(${y0}px) scale(${s0})}to{transform:translateY(${y1}px) scale(${s1})}}</style>`;
  const fadeTop = `<div style="position:absolute;left:0;right:0;top:0;height:760px;background:linear-gradient(180deg,${CREAM} 0%,${CREAM} 55%,rgba(244,236,220,0) 100%);z-index:20"></div>`;
  const fadeBot = `<div style="position:absolute;left:0;right:0;bottom:0;height:820px;background:linear-gradient(0deg,${CREAM} 0%,${CREAM} 52%,rgba(244,236,220,0) 100%);z-index:20"></div>`;
  SCENES.push({ name: 'pas1', d: 2.3, html: page0(pas(-60, -330, 1.15, 1.19, 2.3) + fadeTop + head(170, 'PASAPORT', 'HER MAÇ', 'BAŞKA BİR ŞEHİRDE', 0)) });
  SCENES.push({ name: 'pas2', d: 2.2, html: page0(pas(-600, -840, 1.15, 1.22, 2.2) + fadeBot + head(1270, '', 'PASAPORTUN', 'DAMGALARLA DOLSUN', 0.1)) });
  // Şehirler: oyundaki kariyerin gerçek durakları, kayan isimler, sonunda sayaç
  const names = info.sehirler.filter((c) => CITY[c] && c !== 'istanbul').map((c) => CITY[c]);
  const rows = [...names, ...names].map((n, i) => `<div style="font-size:${i % 3 === 1 ? 128 : 104}px;line-height:1.12;color:${i % 2 ? RED : INK};opacity:${i % 3 === 1 ? 1 : 0.88};transform:skewX(-7deg);white-space:nowrap">${i % 2 ? '📍 ' : ''}${n}</div>`).join('');
  SCENES.push({
    name: 'sehir', d: 2.5,
    html: page0(
      `<div style="position:absolute;left:0;right:0;top:0;display:flex;flex-direction:column;align-items:center;animation:roll 2.5s cubic-bezier(.3,.1,.2,1) both">${rows}</div>
      <div style="position:absolute;left:0;right:0;top:0;height:420px;background:linear-gradient(180deg,${CREAM},rgba(244,236,220,0));z-index:5"></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:420px;background:linear-gradient(0deg,${CREAM},rgba(244,236,220,0));z-index:5"></div>
      <div style="position:absolute;left:0;right:0;top:820px;display:flex;justify-content:center;z-index:10"><div style="background:${RED};color:#fff;font-size:92px;padding:18px 54px;transform:skewX(-7deg) rotate(-3deg);box-shadow:0 30px 70px rgba(230,57,70,.35);animation:pop .5s 1.25s both">16 ŞEHİR · 5 KITA</div></div>`,
      `@keyframes roll{from{transform:translateY(240px)}to{transform:translateY(-1500px)}}`,
    ),
  });
  // Memleket: aşama aşama değişen kasaba
  const CW = 1000;
  const CH = Math.round((CW - 24) * 879 / 1464) + 24;
  const cardTop = 880;
  const memCard = (inner, extraStyle = '') => `<div class="card" style="left:${(1080 - CW) / 2}px;top:${cardTop}px;width:${CW}px;height:${CH}px;${extraStyle}">${inner}</div>`;
  const town = `<div style="position:absolute;left:0;right:0;top:${cardTop + CH + 48}px;text-align:center;font-family:InB;font-size:34px;letter-spacing:10px;color:#8a7a66;z-index:5">📍 ${info.memleket.toLocaleUpperCase('tr')}</div>`;
  SCENES.push({
    name: 'mem0', d: 2.2,
    html: page0(head(400, 'MEMLEKETİM', 'PEKİ YA', 'MEMLEKETİN?', 0.05) + memCard(`<img src="file://${src}/memleket-0.png" style="animation:zin 2.2s ease-out both"/>`, 'animation:fadeUp .55s .15s both;transform:rotate(-1.5deg)') + town, `@keyframes zin{from{transform:scale(1.12)}to{transform:scale(1)}}`),
  });
  // Değişen ayrıntıya yakınlaşma: [aşama, etiket, x, y] (görsel içinde oran)
  const STEPS = [
    [1, 'KAHVEDE POSTERİN', 0.096, 0.9],
    [2, 'SALONUNA ADIN', 0.632, 0.66],
    [3, 'SOKAĞINA ADIN', 0.388, 0.81],
    [4, 'STADYUMDA PANKART', 0.806, 0.49],
    [5, 'MEYDANDA HEYKELİN', 0.86, 0.8],
  ];
  const SD = 1.05;
  const iw = CW - 24;
  const ih = CH - 24;
  const layers = STEPS.map(([i, , x, y], k) => {
    const st = k * SD;
    // Yakınlaşma odağı görselin kenarına yapışmasın
    const ox = Math.min(0.85, Math.max(0.15, x));
    const oy = Math.min(0.85, Math.max(0.2, y));
    return `<div style="position:absolute;inset:0;opacity:0;animation:show${k} ${STEPS.length * SD}s linear both"><img src="file://${src}/memleket-${i}.png" style="width:100%;transform-origin:${ox * 100}% ${oy * 100}%;animation:zm${k} ${STEPS.length * SD}s linear both"/>
      <div style="position:absolute;left:${x * iw - 70}px;top:${y * ih - 70}px;width:140px;height:140px;border-radius:50%;border:8px solid #ffd23f;box-shadow:0 0 30px rgba(255,210,63,.8);opacity:0;animation:ring${k} ${STEPS.length * SD}s linear both;transform-origin:50% 50%"></div></div>
      <style>
      @keyframes show${k}{0%,${((st / (STEPS.length * SD)) * 100).toFixed(2)}%{opacity:0}${(((st + 0.001) / (STEPS.length * SD)) * 100).toFixed(2)}%,100%{opacity:1}}
      @keyframes zm${k}{0%,${((st / (STEPS.length * SD)) * 100).toFixed(2)}%{transform:scale(1)}${(((st + 0.55) / (STEPS.length * SD)) * 100).toFixed(2)}%{transform:scale(1.55)}${(((st + SD) / (STEPS.length * SD)) * 100).toFixed(2)}%,100%{transform:scale(1.62)}}
      @keyframes ring${k}{0%,${(((st + 0.05) / (STEPS.length * SD)) * 100).toFixed(2)}%{opacity:0;transform:scale(2.2)}${(((st + 0.3) / (STEPS.length * SD)) * 100).toFixed(2)}%{opacity:1;transform:scale(1)}${(((st + 0.7) / (STEPS.length * SD)) * 100).toFixed(2)}%{opacity:1;transform:scale(1.08)}${(((st + SD) / (STEPS.length * SD)) * 100).toFixed(2)}%,100%{opacity:0;transform:scale(1.08)}}
      </style>`;
  }).join('');
  const labels = STEPS.map(([, t], k) => {
    const st = k * SD;
    const T = STEPS.length * SD;
    return `<div style="position:absolute;left:0;right:0;top:0;display:flex;justify-content:center;opacity:0;animation:lb${k} ${T}s linear both"><div style="display:flex;align-items:center;gap:22px;background:${INK};color:#fff;font-size:76px;padding:12px 40px 14px;transform:skewX(-7deg);box-shadow:0 20px 50px rgba(0,0,0,.25)"><span style="font-size:52px;color:#ffd23f">${k + 1}/5</span>${t}</div></div>
      <style>@keyframes lb${k}{0%,${((st / T) * 100).toFixed(2)}%{opacity:0;transform:translateY(40px)}${(((st + 0.18) / T) * 100).toFixed(2)}%{opacity:1;transform:none}${(((st + SD - 0.02) / T) * 100).toFixed(2)}%{opacity:1;transform:none}${(((st + SD) / T) * 100).toFixed(2)}%,100%{opacity:0}}</style>`;
  }).join('');
  SCENES.push({
    name: 'evr', d: STEPS.length * SD,
    html: page0(
      head(400, '', 'ÜNLENDİKÇE', 'MEMLEKETİN DEĞİŞİR', -1) +
        memCard(`<img src="file://${src}/memleket-0.png" style="width:100%"/>${layers}`, 'transform:rotate(-1.5deg)') +
        `<div style="position:absolute;left:0;right:0;top:${cardTop + CH + 50}px;z-index:10">${labels}</div>` +
        `<div style="position:absolute;left:0;right:0;top:${cardTop + CH + 200}px;display:flex;justify-content:center;gap:18px;z-index:10">${STEPS.map((_, k) => `<i style="width:70px;height:12px;border-radius:6px;background:#d8c9ae;overflow:hidden;position:relative"><b style="position:absolute;inset:0;background:${RED};transform-origin:0 50%;animation:pg${k} ${STEPS.length * SD}s linear both"></b></i><style>@keyframes pg${k}{0%,${((k * SD / (STEPS.length * SD)) * 100).toFixed(2)}%{transform:scaleX(0)}${((((k + 1) * SD) / (STEPS.length * SD)) * 100).toFixed(2)}%,100%{transform:scaleX(1)}}</style>`).join('')}</div>`,
    ),
  });
  SCENES.push({
    name: 'heykel', d: 2.4,
    html: page0(
      head(400, '', 'MAHALLEDEN', 'MEYDANDAKİ HEYKELE', 0.05) +
        memCard(`<img src="file://${src}/memleket-5.png" style="transform-origin:86% 80%;animation:zo 2.4s cubic-bezier(.2,.7,.2,1) both"/>`, 'transform:rotate(-1.5deg)') +
        `<div style="position:absolute;left:0;right:0;top:${cardTop + CH + 70}px;text-align:center;font-family:InB;font-size:46px;line-height:1.35;color:${INK};animation:fadeUp .5s .5s both;z-index:5">Senin hikâyen, <span style="color:${RED}">senin memleketin.</span></div>`,
      `@keyframes zo{from{transform:scale(1.7)}to{transform:scale(1)}}`,
    ),
  });
}

// Antrenör Modu: köşedeki hoca. Malzeme: scripts/acik-antrenor-kayit.mjs (kafes kareleri: kose.mp4'ten kırpılmış)
let END_KICK = '';
if (VIDEO === 'antrenor') {
  END_KICK = 'ANTRENÖR MODU';
  const KAF = `${src}/kafes`;
  const KMAX = readdirSync(KAF).length;
  const GREEN = '#1f9d55';
  const OCT = 'polygon(29.3% 0,70.7% 0,100% 29.3%,100% 70.7%,70.7% 100%,29.3% 100%,0 70.7%,0 29.3%)';
  // Kafes kartı: oyunun gerçek köşe maçı kaydı
  const cage = (top, w, start, t0 = 0, rate = 1, extra = '', inner = '') => {
    const h = Math.round(((w - 24) * 504) / 1016) + 24;
    return `<div class="card" style="left:${(1080 - w) / 2}px;top:${top}px;width:${w}px;height:${h}px;background:#000;${extra}"><img data-seq="${KAF}" data-start="${start}" data-t0="${t0}" data-rate="${rate}" data-max="${KMAX}" style="width:100%;height:100%;object-fit:cover"/>${inner}</div>`;
  };
  const av = (file, size, ring) => `<div style="width:${size}px;height:${size}px;clip-path:${OCT};background:${ring};padding:${Math.round(size * 0.05)}px"><div style="width:100%;height:100%;clip-path:${OCT};overflow:hidden;background:#1d2733"><img src="file://${src}/${file}" style="width:118%;margin:-9%"/></div></div>`;
  // Parmakla dokunuş: belirip basar, halka yayılır
  const tapAt = (x, y, at) => `<div style="position:absolute;left:${x - 60}px;top:${y - 60}px;width:120px;height:120px;border-radius:50%;border:6px solid ${RED};opacity:0;z-index:45;animation:ripple .55s ${at + 0.18}s ease-out both"></div>
    <div style="position:absolute;left:${x - 22}px;top:${y - 8}px;font-size:110px;z-index:46;opacity:0;animation:finger .7s ${at - 0.3}s ease-out both">👆</div>`;
  const TAPCSS = `@keyframes ripple{0%{opacity:.9;transform:scale(.3)}100%{opacity:0;transform:scale(1.6)}}
    @keyframes finger{0%{opacity:0;transform:translate(60px,90px)}45%{opacity:1;transform:translate(0,0)}60%{transform:translate(0,0) scale(.88)}80%,100%{opacity:1;transform:translate(0,0) scale(1)}}
    @keyframes pick{0%,40%{background:#fff;transform:none}55%{transform:scale(.96)}75%,100%{background:#fff3c4;transform:scale(1.03);border-color:${RED}}}
    @keyframes stamp{0%{opacity:0;transform:scale(2.6) rotate(-12deg)}55%{opacity:1;transform:scale(.92) rotate(-8deg)}100%{opacity:1;transform:scale(1) rotate(-8deg)}}
    @keyframes slam{0%{opacity:0;transform:scale(3) skewX(-7deg)}50%{opacity:1;transform:scale(.94) skewX(-7deg)}100%{opacity:1;transform:scale(1) skewX(-7deg)}}
    @keyframes shake{0%,100%{transform:none}20%{transform:translate(-14px,6px)}40%{transform:translate(12px,-8px)}60%{transform:translate(-8px,4px)}80%{transform:translate(5px,-3px)}}
    .opt{position:absolute;left:70px;right:70px;height:150px;border-radius:30px;background:#fff;border:5px solid #e3d6bd;display:flex;align-items:center;gap:30px;padding:0 40px;box-shadow:0 18px 40px rgba(60,30,10,.12)}
    .opt b{font-family:InB;font-weight:normal;font-size:46px;color:${INK}}.opt s{text-decoration:none;font-family:In;font-size:28px;color:#8a7a66;display:block;margin-top:6px}
    .ic{width:84px;height:84px;border-radius:24px;display:flex;align-items:center;justify-content:center;font-size:48px;flex:none}`;

  // 1-2) Kanca: kafes, sonra "köşedesin"
  SCENES.push({ name: 'hook', d: 2.3, html: page0(head(300, 'ANTRENÖR MODU', 'BU SEFER', 'KAFESTE DEĞİLSİN', -0.35) + cage(840, 1000, 1.0, 0, 1, 'transform:rotate(-1.5deg)'), TAPCSS) });
  SCENES.push({
    name: 'kose', d: 1.9,
    html: page0(
      `<div class="h" style="top:330px"><div class="l1" style="font-size:190px;color:${RED};animation:slam .45s .05s both">KÖŞEDESİN.</div></div>` +
        `<div style="position:absolute;inset:0;animation:shake .35s .3s both">${cage(780, 1040, 3.3, 0, 1, 'transform:rotate(1.5deg) scale(1.02)')}</div>` +
        `<div style="position:absolute;left:0;right:0;top:1420px;text-align:center;font-family:InB;font-size:48px;color:${INK};animation:fadeUp .4s .5s both">Hocası <span style="color:${RED}">sensin.</span></div>`,
      TAPCSS,
    ),
  });
  // 3) Salonunu aç + felsefe
  const PH = [['🔥', 'SAVAŞÇI OKULU', '“Kafese bitirmeye gireriz.”', '#ffe1d6'], ['🎯', 'TEKNİK OKUL', '“Önce doğru teknik.”', '#dbe9ff'], ['🏠', 'AİLE SALONU', '“Burası bir aile.”', '#dff3e4']];
  SCENES.push({
    name: 'salon', d: 2.5,
    html: page0(
      head(250, '', 'KENDİ SALONUNU', 'AÇ', 0.0) +
        `<div style="position:absolute;left:90px;right:90px;top:620px;border-radius:34px;padding:34px 30px 30px;text-align:center;background:linear-gradient(160deg,#ffd76a,#f2b233 60%,#d9921c);box-shadow:0 30px 70px rgba(200,130,20,.35);animation:pop .5s .1s both;z-index:5">
          <div style="font-family:InB;font-size:28px;letter-spacing:8px;color:#7a4a05">GARAJ SALONU</div>
          <div style="font-size:84px;line-height:1.05;color:${INK};transform:skewX(-7deg);margin-top:8px">DEMİR DÖVÜŞ AKADEMİSİ</div>
          <div style="font-size:40px;color:#7a4a05;margin-top:6px">★ ☆ ☆ ☆ ☆</div></div>` +
        PH.map(([ic, ad, q, bg], i) => `<div class="opt" style="top:${1000 + i * 175}px;animation:fadeUp .4s ${0.35 + i * 0.12}s both${i === 0 ? `,pick .6s 1.35s both` : ''}"><div class="ic" style="background:${bg}">${ic}</div><div><b>${ad}</b><s>${q}</s></div></div>`).join('') +
        tapAt(820, 1080, 1.35) +
        `<div style="position:absolute;left:0;right:0;top:1560px;text-align:center;font-family:InB;font-size:40px;color:${RED};animation:fadeUp .35s 1.6s both">Felsefeni seç.</div>`,
      TAPCSS,
    ),
  });
  // 4) Yetenek avı: gerçek adaylar
  const AD = [['aday-1.png', 'Volkan Karakaya', '19 · Yarı Ağır · Sambo', 32, 2], ['aday-2.png', 'Emre Demirtaş', '21 · Ağır · Güreş', 35, 2], ['aday-3.png', 'Kaan Yıldırım', '22 · Welter · Boks', 31, 1]];
  SCENES.push({
    name: 'ogrenci', d: 2.6,
    html: page0(
      head(250, 'YETENEK AVI', 'GELECEĞİN ŞAMPİYONUNU', 'SEN BUL', 0.0) +
        AD.map(([f, ad, alt, pw, st], i) => `<div class="opt" style="top:${700 + i * 245}px;height:215px;animation:fadeUp .4s ${0.25 + i * 0.12}s both${i === 0 ? `,pick .6s 1.3s both` : ''}">
          ${av(f, 150, i === 0 ? RED : '#c9b99b')}
          <div style="flex:1"><b>${ad}</b><s>${alt}</s>
            <div style="display:flex;align-items:center;gap:14px;margin-top:12px"><div style="flex:1;height:14px;border-radius:7px;background:#eadfca;overflow:hidden"><div style="width:${pw * 2}%;height:100%;background:${GREEN}"></div></div><span style="font-family:InB;font-size:28px;color:${GREEN}">GÜÇ ${pw}</span></div>
            <div style="font-size:30px;color:#f2b233;margin-top:6px">${'★'.repeat(st)}${'☆'.repeat(5 - st)} <span style="font-family:In;font-size:24px;color:#8a7a66">potansiyel</span></div></div></div>`).join('') +
        tapAt(820, 820, 1.3) +
        `<div style="position:absolute;left:560px;top:760px;z-index:47;font-size:62px;color:${GREEN};border:7px solid ${GREEN};border-radius:18px;padding:4px 24px;background:rgba(255,255,255,.9);opacity:0;animation:stamp .4s 1.55s both">KAYDEDİLDİ</div>`,
      TAPCSS,
    ),
  });
  // 5) İlk maç: VS
  SCENES.push({
    name: 'vs', d: 2.2,
    html: page0(
      head(250, 'MAÇ GÜNÜ', 'İLK MAÇI', 'SENİN ELİNDE', -0.2) +
        `<div style="position:absolute;left:0;right:0;top:760px;display:flex;justify-content:center;align-items:center;gap:40px;z-index:5">
          <div style="text-align:center;animation:inL .45s .1s both">${av('vs-biz.png', 300, RED)}<div style="font-size:76px;margin-top:20px;transform:skewX(-7deg)">KARAKAYA</div><div style="font-family:InB;font-size:30px;color:#8a7a66">SENİN ÖĞRENCİN</div></div>
          <div style="font-size:150px;color:#f2b233;transform:skewX(-10deg);animation:slam .4s .45s both;text-shadow:0 10px 30px rgba(242,193,78,.4)">VS</div>
          <div style="text-align:center;animation:inR .45s .1s both">${av('vs-rakip.png', 300, '#2f6fdf')}<div style="font-size:76px;margin-top:20px;transform:skewX(-7deg)">HOLM</div><div style="font-family:InB;font-size:30px;color:#8a7a66">RAKİP</div></div></div>
        <div style="position:absolute;left:0;right:0;top:1330px;text-align:center;font-family:InB;font-size:34px;letter-spacing:10px;color:#8a7a66;animation:fadeUp .4s .7s both">AMATÖR · YARI AĞIR</div>`,
      `${TAPCSS}@keyframes inL{from{opacity:0;transform:translateX(-300px)}to{opacity:1;transform:none}}@keyframes inR{from{opacity:0;transform:translateX(300px)}to{opacity:1;transform:none}}`,
    ),
  });
  // 6) Oyun planı
  const PL = [['🤼', 'Yere götür, submission ara', 'Pozisyon al, boyna ve kollara git.', '#dbe9ff'], ['🛡️', 'Puanla kazan, riske girme', 'Temiz vuruş, iyi savunma.', '#dff3e4'], ['🥊', 'Sabırlı ol, kontra dövüş', 'Onun gelmesini bekle.', '#ffe1d6']];
  SCENES.push({
    name: 'plan', d: 2.4,
    html: page0(
      head(250, 'KEŞİF RAPORU HAZIR', 'OYUN PLANINI', 'SEN BELİRLE', 0.0) +
        PL.map(([ic, ad, q, bg], i) => `<div class="opt" style="top:${720 + i * 190}px;height:165px;animation:fadeUp .4s ${0.25 + i * 0.12}s both${i === 1 ? `,pick .6s 1.25s both` : ''}"><div class="ic" style="background:${bg}">${ic}</div><div><b style="font-size:42px">${ad}</b><s>${q}</s></div></div>`).join('') +
        tapAt(860, 990, 1.25),
      TAPCSS,
    ),
  });
  // 7) Raunt arası talimat: oyunun gerçek seçenekleri
  const CO = [['🔥', 'Baskıyı artır', 'Üstüne yürü, ritmi sen belirle.', '#ffe1d6'], ['🛡️', 'Sakin kal, puan topla', 'Temiz vuruş, hata yapma.', '#dff3e4'], ['⚔️', 'Bekle, kontra at', 'Açığını yakala.', '#dbe9ff']];
  SCENES.push({
    name: 'talimat', d: 3.0,
    html: page0(
      cage(150, 860, 3.85, 0, 0.25, 'transform:rotate(-1deg)') +
        `<div style="position:absolute;left:80px;right:80px;top:640px;background:${INK};color:#fff;border-radius:36px;padding:30px 40px;font-family:InB;font-size:46px;line-height:1.3;box-shadow:0 24px 60px rgba(0,0,0,.25);animation:pop .45s .15s both;z-index:6">
          <div style="font-family:Os;font-size:30px;letter-spacing:6px;color:#f2c14e;margin-bottom:8px">RAUNT ARASI · 2/3</div>Volkan köşede sana bakıyor.<br/><span style="color:#ffd23f">Talimatın ne?</span>
          <div style="position:absolute;left:90px;bottom:-30px;width:60px;height:60px;background:${INK};transform:rotate(45deg)"></div></div>` +
        CO.map(([ic, ad, q, bg], i) => `<div class="opt" style="top:${1010 + i * 185}px;height:160px;animation:fadeUp .35s ${0.5 + i * 0.1}s both${i === 0 ? `,pick .6s 1.75s both` : ''}"><div class="ic" style="background:${bg}">${ic}</div><div><b>${ad}</b><s>${q}</s></div></div>`).join('') +
        tapAt(860, 1090, 1.75),
      TAPCSS,
    ),
  });
  // 8) Son raunt ve zafer
  SCENES.push({
    name: 'zafer', d: 3.0,
    html: page0(
      head(230, '3. RAUNT', 'SÖZ SENDE', '', -0.3) +
        cage(560, 1020, 12.2, 0, 1.25, 'transform:rotate(1deg)') +
        `<div style="position:absolute;left:0;right:0;top:1150px;display:flex;justify-content:center;z-index:30"><div style="font-size:170px;color:#fff;background:${GREEN};padding:0 60px 10px;border-radius:24px;box-shadow:0 30px 80px rgba(31,157,85,.45);opacity:0;animation:stamp .45s 2.0s both">KAZANDI!</div></div>
        <div style="position:absolute;left:0;right:0;top:1440px;text-align:center;font-family:InB;font-size:44px;color:${INK};opacity:0;animation:fadeUp .35s 2.3s both">🏆 Hakem kararı · Volkan Karakaya</div>`,
      TAPCSS,
    ),
  });
  // 9) Sıralama: 41 salon, tek zirve (oyundaki gerçek salon adları)
  const RK = [['Altitude MMA (Denver)', 'ABD'], ['Kaspiy Elite (Mahaçkala)', 'Rusya'], ['Summit Combat Center', 'ABD'], ['Ataque BJJ Global', 'Brezilya'], ['Tigris Kamp (Phuket)', 'Tayland']];
  const rowH = 150;
  SCENES.push({
    name: 'sira', d: 2.8,
    html: page0(
      head(220, 'SALON SIRALAMASI', '41 SALON', 'TEK ZİRVE', 0.0) +
        RK.map(([ad, ul], i) => `<div class="opt" style="top:${640 + i * (rowH + 18)}px;height:${rowH}px;animation:fadeUp .35s ${0.15 + i * 0.07}s both,down${i} .5s 1.3s both"><div style="font-size:64px;width:80px;position:relative;color:${['#e0a800', '#9aa3ad', '#c77c34', '#b9aa8f', '#b9aa8f'][i]}"><span style="position:absolute;left:0;animation:out1 .15s 1.7s both">${i + 1}</span><span style="opacity:0;animation:in1 .25s 1.85s both">${i + 2}</span></div><div><b style="font-size:42px">${ad}</b><s>${ul}</s></div></div><style>@keyframes down${i}{from{transform:none}to{transform:translateY(${rowH + 18}px)}}</style>`).join('') +
        `<div class="opt" style="top:${640 + 5 * (rowH + 18) + 60}px;height:${rowH}px;background:#fff3c4;border-color:${RED};z-index:20;animation:fadeUp .35s .5s both,climb .8s 1.2s cubic-bezier(.3,.1,.2,1) both"><div style="font-size:64px;width:120px;color:${RED};position:relative"><span style="position:absolute;left:0;animation:out1 .15s 1.7s both">41</span><span style="opacity:0;animation:in1 .25s 1.85s both">1</span></div><div><b style="font-size:42px">Demir Dövüş Akademisi</b><s style="color:${RED}">SEN · Türkiye</s></div><div style="margin-left:auto;font-size:80px;color:${GREEN};animation:fadeUp .3s 1.2s both">▲</div></div>
        <style>@keyframes climb{from{transform:none}to{transform:translateY(-${5 * (rowH + 18) + 60}px)}}
        @keyframes out1{to{opacity:0}}@keyframes in1{0%{opacity:0;transform:scale(2)}100%{opacity:1;transform:none}}</style>` +
        `<div style="position:absolute;left:0;right:0;top:1650px;text-align:center;font-family:InB;font-size:40px;color:${INK};animation:fadeUp .35s 1.9s both">Öğrencilerin kazandıkça <span style="color:${RED}">salonun yükselir.</span></div>`,
      TAPCSS,
    ),
  });
}

// Kapanış: krem zemin, logo, mağazalar, düşen konfeti
const CONF = (() => {
  let r = 11;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const cols = [RED, '#f2c14e', INK, '#ffd98a', RED];
  let h = '';
  let k = '';
  for (let i = 0; i < 90; i++) {
    const x = Math.round(rnd() * 1080);
    const y0 = -Math.round(rnd() * 1200) - 40;
    const dur = 2.6 + rnd() * 2;
    const rot = Math.round(rnd() * 720 - 360);
    h += `<i style="position:absolute;left:${x}px;top:0;width:${12 + Math.round(rnd() * 12)}px;height:${22 + Math.round(rnd() * 16)}px;background:${cols[i % 5]};animation:cf${i} ${dur.toFixed(2)}s linear both;z-index:3"></i>`;
    k += `@keyframes cf${i}{from{transform:translateY(${y0}px) rotate(0)}to{transform:translateY(${y0 + 2300}px) rotate(${rot}deg)}}`;
  }
  return { h, k };
})();
const END_D = 3.8;
SCENES.push({
  name: 'end', d: END_D,
  html: page0(
    `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10">
      ${END_KICK ? `<div class="tag" style="font-size:40px;margin-bottom:40px;animation:pop .45s .0s both">${END_KICK}</div>` : ''}
      <img src="${ICON}" style="width:400px;filter:drop-shadow(0 30px 50px rgba(230,57,70,.35));animation:pop .6s .05s both"/>
      <div style="font-size:230px;line-height:1;color:${RED};letter-spacing:26px;transform:skewX(-8deg);margin-top:6px;animation:pop .55s .2s both">YOL</div>
      <div style="font-size:78px;letter-spacing:4px;transform:skewX(-8deg);margin-top:6px;animation:pop .55s .3s both">KAFESTEN KEMERE</div>
      <div style="margin-top:80px;font-size:70px;color:#fff;background:${INK};padding:14px 44px;transform:skewX(-8deg);animation:pop .55s .45s both">${END_TAG}</div>
      <div style="margin-top:34px;font-size:52px;color:${RED};border:5px solid ${RED};border-radius:26px;padding:12px 40px;background:#fff;animation:pop .55s .6s both">ÜCRETSİZ İNDİR</div>
      <div style="margin-top:40px;font-family:In;font-size:32px;letter-spacing:6px;color:#8a7a66;animation:pop .55s .7s both">MMA KARİYER OYUNU</div>
    </div>${CONF.h}`,
    CONF.k,
    { logo: false },
  ),
});

// Oyun kaydı katmanı: <img data-seq="klasör" data-start="kayıttaki sn" data-t0="sahnedeki sn" data-rate="hız">
// her karede kayıttan doğru kareyi gösterir (kareler klasörde 00001.jpg… 30 fps).
const seqFrame = (pg, t) =>
  pg.evaluate(async (t) => {
    const imgs = [...document.querySelectorAll('img[data-seq]')];
    await Promise.all(imgs.map((im) => {
      const ct = +im.dataset.start + Math.max(0, t - +(im.dataset.t0 ?? 0)) * +(im.dataset.rate ?? 1);
      const i = Math.min(+im.dataset.max, Math.max(1, Math.round(ct * 30) + 1));
      const src = `file://${im.dataset.seq}/${String(i).padStart(5, '0')}.jpg`;
      if (im.src === src) return undefined;
      im.src = src;
      return im.decode().catch(() => undefined);
    }));
  }, t);

// ---------- Kare kare çekim (animasyonlar her kareye sarılır) ----------
const browser = await puppeteer.launch({ executablePath: process.env.CHROME, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
const enc = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS)];
for (const sc of SCENES) {
  const file = `${tmp}/${sc.name}.html`;
  writeFileSync(file, sc.html);
  await page.goto(`file://${file}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => undefined))));
  const dir = `${tmp}/${sc.name}-kare`;
  mkdirSync(dir, { recursive: true });
  if (process.env.ONIZLEME) {
    // Ön izleme: her sahneden birkaç kare
    for (const k of [0.15, 0.5, 0.9]) {
      await page.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), k * sc.d * 1000);
      await seqFrame(page, k * sc.d);
      await page.screenshot({ path: `${tmp}/onizleme-${sc.name}-${k}.jpg`, type: 'jpeg', quality: 80 });
    }
    continue;
  }
  const n = Math.round(sc.d * FPS);
  for (let f = 0; f < n; f++) {
    await page.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), (f * 1000) / FPS);
    await seqFrame(page, f / FPS);
    await page.screenshot({ path: `${dir}/${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
  }
  execFileSync(FF, ['-y', '-framerate', String(FPS), '-i', `${dir}/%05d.jpg`, ...enc, `${tmp}/${sc.name}.tmp.mp4`], { stdio: 'ignore' });
  execFileSync('mv', [`${tmp}/${sc.name}.tmp.mp4`, `${tmp}/${sc.name}.mp4`]);
  rmSync(dir, { recursive: true, force: true });
  console.log('🎬', sc.name, sc.d, 'sn');
}
await browser.close();
if (process.env.ONIZLEME) process.exit(0);

// ---------- Kurgu ----------
const XF = 0.28;
const at = [];
let t = 0;
SCENES.forEach((s, i) => { at.push(t); t += s.d - (i < SCENES.length - 1 ? XF : 0); });
const total = t;
const idx = (n) => SCENES.findIndex((s) => s.name === n);
const TR = { pas2: 'smoothup', sehir: 'slideleft', mem0: 'fade', evr: 'fade', heykel: 'fade', end: 'circleopen', kose: 'fade', salon: 'slideleft', ogrenci: 'slideleft', vs: 'zoomin', plan: 'slideleft', talimat: 'slideup', zafer: 'fade', sira: 'slideleft' };
const snd = (n) => `${root}/assets/sounds/${n}.wav`;
const audio = [];
const add = (file, startSec, vol = 1, loop = false) => audio.push({ file, startSec, vol, loop });
const cue = (name, off, file, vol = 1) => idx(name) >= 0 && add(snd(file), at[idx(name)] + off, vol);
if (VIDEO === 'antrenor') {
  add(snd('giris_rock'), 0, 0.75);
  add(snd('music_hub'), 9.5, 0.45, true);
  add(snd('crowd_loop'), 0, 0.25);
  cue('hook', 0.05, 'bell', 0.7);
  cue('hook', 0.7, 'punch1', 0.6);
  cue('hook', 1.4, 'punch3', 0.6);
  cue('kose', 0.05, 'slam', 0.9);
  cue('kose', 0.3, 'heavy', 0.6);
  cue('salon', 1.35, 'tap', 0.8);
  cue('salon', 1.4, 'chime', 0.4);
  cue('ogrenci', 1.3, 'tap', 0.8);
  cue('ogrenci', 1.55, 'cash', 0.6);
  cue('vs', 0.45, 'slam', 0.7);
  cue('vs', 0.1, 'whoosh', 0.5);
  cue('plan', 1.25, 'tap', 0.8);
  cue('talimat', 0.15, 'ooh', 0.4);
  cue('talimat', 1.75, 'tap', 0.8);
  cue('zafer', 0.1, 'bell2', 0.6);
  cue('zafer', 0.5, 'punch2', 0.6);
  cue('zafer', 1.1, 'body', 0.6);
  cue('zafer', 2.0, 'win', 0.8);
  cue('zafer', 2.05, 'roar', 0.6);
  cue('sira', 1.2, 'whoosh', 0.6);
  cue('sira', 1.85, 'fanfare', 0.5);
} else {
  add(snd('giris_epik'), 0, 0.8);
  add(snd('music_menu'), 6.4, 0.55, true);
}
cue('pas1', 0.1, 'heavy', 0.7);
cue('pas2', 0.0, 'whoosh', 0.5);
cue('sehir', 0.0, 'whoosh', 0.5);
cue('sehir', 1.3, 'slam', 0.7);
cue('mem0', 0.1, 'swell', 0.5);
if (VIDEO === 'dunya') for (let k = 0; k < 5; k++) { cue('evr', k * 1.05 + 0.05, 'tap', 0.7); cue('evr', k * 1.05 + 0.25, 'chime', 0.35); }
cue('heykel', 0.2, 'roar', 0.45);
cue('end', 0.15, 'bell', 0.85);
cue('end', 0.35, 'applause', 0.55);
const args = ['-y'];
SCENES.forEach((s) => args.push('-i', `${tmp}/${s.name}.mp4`));
audio.forEach((a) => args.push(...(a.loop ? ['-stream_loop', '-1'] : []), '-i', a.file));
const NV = SCENES.length;
let fc = SCENES.map((_, i) => `[${i}:v]settb=AVTB,fps=${FPS},format=yuv420p,setsar=1[s${i}]`).join(';');
let prev = 's0';
for (let k = 1; k < NV; k++) {
  const tag = k === NV - 1 ? 'vout' : `x${k}`;
  fc += `;[${prev}][s${k}]xfade=transition=${TR[SCENES[k].name] ?? 'fade'}:duration=${XF}:offset=${at[k].toFixed(3)}[${tag}]`;
  prev = tag;
}
fc += ';' + audio.map((a, i) => { const ms = Math.round(a.startSec * 1000); return `[${NV + i}:a]aresample=44100,aformat=channel_layouts=stereo,volume=${a.vol},adelay=${ms}|${ms}[a${i}]`; }).join(';');
fc += `;${audio.map((_, i) => `[a${i}]`).join('')}amix=inputs=${audio.length}:duration=longest:normalize=0,afade=t=out:st=${(total - 1).toFixed(2)}:d=1,alimiter=limit=0.95[aout]`;
writeFileSync(`${tmp}/filtre.txt`, fc);
const out = `${root}/store/video/reklam-${VIDEO}.mp4`;
const r = spawnSync(FF, [...args, '-filter_complex_script', `${tmp}/filtre.txt`, '-map', '[vout]', '-map', '[aout]', '-t', total.toFixed(2), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '19', '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', `${out}.tmp.mp4`], { encoding: 'utf8' });
if (r.status !== 0) throw new Error('ffmpeg: ' + (r.stderr ?? '').split('\n').slice(-8).join(' | '));
execFileSync('mv', [`${out}.tmp.mp4`, out]);
console.log('✅', out, total.toFixed(1), 'sn');
