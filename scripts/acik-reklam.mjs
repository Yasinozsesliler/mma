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
// tiktok: viral fragmanın 15 sn'lik reklam kesiti (aynı malzeme, TikTok güvenli alanına göre yazılar)
const src = `${root}/store/video/acik-${VIDEO === 'tiktok' ? 'viral' : VIDEO}`;
const tmp = `${src}/parca${VIDEO === 'tiktok' ? '-tiktok' : ''}`;
if (!process.env.SADECE_KURGU) rmSync(tmp, { recursive: true, force: true }); // SADECE_KURGU=1: sahneleri yeniden çizmeden sadece birleştir/sesle
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
// Ortak sahne parçaları (antrenör, menajer)
const GREEN = '#1f9d55';
const OCT = 'polygon(29.3% 0,70.7% 0,100% 29.3%,100% 70.7%,70.7% 100%,29.3% 100%,0 70.7%,0 29.3%)';
// Kafes kartı: oyunun gerçek köşe maçı kaydı
const cage = (top, w, start, t0 = 0, rate = 1, extra = '', inner = '', KAF = `${src}/kafes`) => {
  const KMAX = readdirSync(KAF).length;
  const h = Math.round(((w - 24) * 504) / 1016) + 24;
  return `<div class="card" style="left:${(1080 - w) / 2}px;top:${top}px;width:${w}px;height:${h}px;background:#000;${extra}"><img data-seq="${KAF}" data-start="${start}" data-t0="${t0}" data-rate="${rate}" data-max="${KMAX}" style="width:100%;height:100%;object-fit:cover"/>${inner}</div>`;
};
const av = (file, size, ring) => `<div style="width:${size}px;height:${size}px;clip-path:${OCT};background:${ring};padding:${Math.round(size * 0.05)}px"><div style="width:100%;height:100%;clip-path:${OCT};overflow:hidden;background:#1d2733"><img src="file://${src}/${file}" style="width:118%;margin:-9%"/></div></div>`;
// Parmakla dokunuş: belirip basar, halka yayılır
const tapAt = (x, y, at) => `<div style="position:absolute;left:${x - 60}px;top:${y - 60}px;width:120px;height:120px;border-radius:50%;border:6px solid ${RED};opacity:0;z-index:45;animation:ripple .55s ${at + 0.18}s ease-out both"></div>
  <div style="position:absolute;left:${x - 22}px;top:${y - (VIDEO === 'antrenor' ? 8 : 60)}px;font-size:110px;z-index:46;opacity:0;animation:finger .7s ${at - 0.3}s ease-out both">👆</div>`;
const TAPCSS = `@keyframes ripple{0%{opacity:.9;transform:scale(.3)}100%{opacity:0;transform:scale(1.6)}}
  @keyframes finger{0%{opacity:0;transform:translate(60px,90px)}45%{opacity:1;transform:translate(0,0)}60%{transform:translate(0,0) scale(.88)}80%,100%{opacity:1;transform:translate(0,0) scale(1)}}
  @keyframes pick{0%,40%{background:#fff;transform:none}55%{transform:scale(.96)}75%,100%{background:#fff3c4;transform:scale(1.03);border-color:${RED}}}
  @keyframes stamp{0%{opacity:0;transform:scale(2.6) rotate(-12deg)}55%{opacity:1;transform:scale(.92) rotate(-8deg)}100%{opacity:1;transform:scale(1) rotate(-8deg)}}
  @keyframes slam{0%{opacity:0;transform:scale(3) skewX(-7deg)}50%{opacity:1;transform:scale(.94) skewX(-7deg)}100%{opacity:1;transform:scale(1) skewX(-7deg)}}
  @keyframes shake{0%,100%{transform:none}20%{transform:translate(-14px,6px)}40%{transform:translate(12px,-8px)}60%{transform:translate(-8px,4px)}80%{transform:translate(5px,-3px)}}
  .opt{position:absolute;left:70px;right:70px;height:150px;border-radius:30px;background:#fff;border:5px solid #e3d6bd;display:flex;align-items:center;gap:30px;padding:0 40px;box-shadow:0 18px 40px rgba(60,30,10,.12)}
  .opt b{font-family:InB;font-weight:normal;font-size:46px;color:${INK}}.opt s{text-decoration:none;font-family:In;font-size:28px;color:#8a7a66;display:block;margin-top:6px}
  .ic{width:84px;height:84px;border-radius:24px;display:flex;align-items:center;justify-content:center;font-size:48px;flex:none}`;


if (VIDEO === 'antrenor') {
  END_KICK = 'ANTRENÖR MODU';
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

// Menajer Modu: telefonundaki şampiyon. Malzeme: scripts/menajer-kayit.ts + scripts/menajer-yakala.mjs
// Mesajlar, seçenekler, sözler ve sonuç oyunun o kayıttaki gerçek metinleridir.
if (VIDEO === 'menajer') {
  END_KICK = 'YENİ · MENAJER MODU';
  const KF = `${src}/kafesk`;
  const BLUE = '#2f7cf6';
  const PCSS = `.ph{position:absolute;left:110px;width:860px;border-radius:64px;background:#fff;border:14px solid #16120f;box-shadow:0 50px 100px rgba(60,30,10,.3);overflow:hidden}
    .ph .top{display:flex;align-items:center;gap:22px;padding:34px 36px 26px;border-bottom:2px solid #eee;background:#fafafa}
    .ph .top b{font-family:InB;font-weight:normal;font-size:40px;color:${INK};display:block}.ph .top s{text-decoration:none;font-family:In;font-size:26px;color:#8e8e93}
    .ph .chat{background:#f2f2f7;padding:30px 30px 34px;display:flex;flex-direction:column;gap:22px}
    .bub{align-self:flex-start;max-width:86%;background:#fff;border-radius:34px 34px 34px 10px;padding:24px 30px;font-family:In;font-size:37px;line-height:1.35;color:${INK};box-shadow:0 4px 12px rgba(0,0,0,.06)}
    .bub b{font-family:InB;font-weight:normal}.me{align-self:flex-end;background:${BLUE};color:#fff;border-radius:34px 34px 10px 34px}
    .rep{border:4px solid ${BLUE};color:${BLUE};background:#fff;border-radius:28px;padding:18px 26px;font-family:InB;font-size:32px}
    .typing{align-self:flex-start;background:#fff;border-radius:30px;padding:22px 30px;display:flex;gap:10px}.typing i{width:16px;height:16px;border-radius:50%;background:#b8b8bf;animation:dot .9s infinite}
    @keyframes dot{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
    @keyframes bub{0%{opacity:0;transform:translateY(30px) scale(.9)}100%{opacity:1;transform:none}}
    @keyframes gone{to{opacity:0;height:0;padding:0;margin:0}}
    @keyframes picked{0%,40%{background:#fff;color:${BLUE}}70%,100%{background:${BLUE};color:#fff}}`;
  const phTop = (who, sub) => `<div class="top">${av('vs-biz.png', 92, RED)}<div><b>${who}</b><s>${sub}</s></div><div style="margin-left:auto;font-size:44px">📞</div></div>`;
  const bub = (txt, at, cls = '') => `<div class="bub ${cls}" style="animation:bub .35s ${at}s both">${txt}</div>`;
  const typing = (from, to) => `<div class="typing" style="animation:bub .2s ${from}s both,gone .01s ${to}s forwards"><i></i><i style="animation-delay:.15s"></i><i style="animation-delay:.3s"></i></div>`;
  const WHO = 'Davit Lomidze 🏆';
  const SUB = 'UCC Horoz Sıklet Şampiyonu';
  const M1 = 'Sözleşmem bir maç sonra bitiyor. Telefonum susmuyor, herkes beni istiyor.';
  const M2 = 'Sana açık konuşayım: 32 yaşındayım. İki yıl içinde kemer yoksa eldivenleri asacağım. <b>Bu benim son şansım.</b>';
  // 1) Kanca: şampiyondan mesaj
  SCENES.push({
    name: 'hook', d: 2.5,
    html: page0(head(190, 'GECE 03:12', 'BU MESAJ', 'BİR ŞAMPİYONDAN GELDİ', -0.4) + `<div class="ph" style="top:620px">${phTop(WHO, SUB)}<div class="chat" style="min-height:560px">${typing(-0.2, 0.35)}${bub(M1, 0.35)}${typing(1.4, 1.95)}</div></div>`, PCSS + TAPCSS + '.l2{font-size:86px}'),
  });
  SCENES.push({
    name: 'hook2', d: 2.6,
    html: page0(
      `<div class="h" style="top:190px"><div class="l1" style="animation:pop .4s .0s both">ÇÜNKÜ MENAJERİ</div><div class="l2" style="font-size:150px;animation:slam .45s .25s both">SENSİN.</div></div>` +
        `<div class="ph" style="top:620px">${phTop(WHO, SUB)}<div class="chat" style="min-height:560px">${bub(M1, -1)}${bub(M2, 0.15)}</div></div>`,
      PCSS + TAPCSS,
    ),
  });
  // 2) Pazarlık masası: UCC ünvan maçı teklifi
  SCENES.push({
    name: 'masa', d: 2.7,
    html: page0(
      head(200, 'PAZARLIK MASASI', 'MAAŞINI', 'SEN KONUŞ', 0.0) +
        `<div class="card" style="left:90px;top:600px;width:900px;padding:34px 40px;border:none;animation:fadeUp .4s .1s both">
          <div style="font-family:InB;font-size:28px;letter-spacing:6px;color:#8a7a66">UCC · ÜNVAN MAÇI</div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:16px"><span style="font-family:In;font-size:34px;color:#8a7a66">Ücret</span>
            <span style="position:relative;font-size:96px;color:${INK}"><span style="position:absolute;right:0;animation:out1 .15s 1.25s both">$162.000</span><span style="opacity:0;color:${GREEN};animation:in1 .3s 1.35s both">$186.300</span></span></div>
          <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-family:In;font-size:34px;color:#8a7a66">Bonus</span><span style="font-size:64px">+$90.000</span></div>
          <div style="font-family:InB;font-size:26px;color:#8a7a66;margin-top:20px">SABIR</div>
          <div style="height:18px;border-radius:9px;background:#eadfca;overflow:hidden;margin-top:8px"><div style="height:100%;width:100%;background:#f2b233;transform-origin:0 50%;animation:sabir .4s 1.3s both"></div></div>
          <div style="margin-top:26px;background:#f2f2f7;border-radius:26px;padding:20px 26px;font-family:In;font-size:32px;color:${INK};position:relative;height:96px">
            <span style="position:absolute;animation:out1 .15s 1.3s both">UCC: “Teklifimiz ortada. Dinliyoruz.”</span><span style="opacity:0;animation:in1 .3s 1.45s both">UCC: “Kazanırsa hak eder.”</span></div></div>` +
        `<div class="opt" style="top:1250px;left:90px;right:560px;height:130px;justify-content:center;animation:fadeUp .3s .4s both,pick .6s 1.0s both"><b style="font-size:44px">Ücret +%15</b></div>
        <div class="opt" style="top:1250px;left:560px;right:90px;height:130px;justify-content:center;animation:fadeUp .3s .5s both"><b style="font-size:44px">Bonus +%30</b></div>
        <div class="opt" style="top:1410px;left:90px;right:90px;height:130px;justify-content:center;background:${INK};border-color:${INK};animation:fadeUp .3s .6s both"><b style="font-size:48px;color:#fff">İMZALA</b></div>` +
        tapAt(320, 1310, 1.0) + tapAt(540, 1470, 2.0) +
        `<div style="position:absolute;left:300px;top:840px;z-index:47;font-size:96px;color:${GREEN};border:9px solid ${GREEN};border-radius:22px;padding:4px 34px;background:rgba(255,255,255,.92);opacity:0;animation:stamp .4s 2.2s both">İMZALANDI</div>
        <style>@keyframes sabir{to{transform:scaleX(.62)}}@keyframes out1{to{opacity:0}}@keyframes in1{0%{opacity:0;transform:scale(1.4)}100%{opacity:1;transform:none}}</style>`,
      TAPCSS,
    ),
  });
  // 3) Basın toplantısı
  SCENES.push({
    name: 'basin', d: 2.4,
    html: page0(
      head(190, 'BASIN TOPLANTISI', 'MİKROFON', 'SENDE', 0.0) +
        `<div class="ph" style="top:600px"><div class="top"><div style="width:92px;height:92px;border-radius:50%;background:#ffe1d6;display:flex;align-items:center;justify-content:center;font-size:50px">🎙️</div><div><b>UCC basın toplantısı</b><s>8. hafta</s></div></div>
          <div class="chat">${bub('Bir muhabir soruyor: “Yerlan Tokayev senin için sadece bir basamak mı?” <b>Davit sana bakıyor.</b>', 0.15)}
          <div class="rep" style="animation:bub .3s .5s both,picked .5s 1.35s both">Sert konuş. Herkes bu maçı konuşsun.</div>
          <div class="rep" style="animation:bub .3s .6s both">Saygılı ol, profesyonel görün.</div>
          <div class="rep" style="animation:bub .3s .7s both">Az konuş. Cevabı kafeste verecek.</div></div></div>` +
        tapAt(760, 1080, 1.35),
      PCSS + TAPCSS,
    ),
  });
  // 4) Face-off (oyunun sinematik face-off'undaki gerçek bilgiler)
  const row = (a, k, b, hi = false) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:2px solid #efe5d2"><span style="font-size:52px;width:220px">${a}</span><span style="font-family:InB;font-size:26px;letter-spacing:6px;color:#8a7a66">${k}</span><span style="font-size:52px;width:220px;text-align:right;color:${hi ? RED : INK}">${b}</span></div>`;
  SCENES.push({
    name: 'face', d: 2.7,
    html: page0(
      head(170, 'UCC · ÜNVAN MAÇI', 'FACE-OFF', '', -0.2) +
        `<div style="position:absolute;left:0;right:0;top:470px;display:flex;justify-content:center;align-items:center;gap:30px;z-index:5">
          <div style="text-align:center;animation:inL .45s .05s both">${av('vs-biz.png', 290, RED)}<div style="font-size:70px;margin-top:16px;transform:skewX(-7deg)">LOMİDZE</div></div>
          <div style="font-size:140px;color:#f2b233;transform:skewX(-10deg);animation:slam .4s .35s both">VS</div>
          <div style="text-align:center;animation:inR .45s .05s both">${av('vs-rakip.png', 290, BLUE)}<div style="font-size:70px;margin-top:16px;transform:skewX(-7deg)">TOKAYEV</div></div></div>
        <div style="position:absolute;left:80px;top:960px;max-width:640px;background:#fff;border-left:10px solid ${RED};border-radius:20px;padding:20px 28px;font-family:In;font-size:34px;font-style:italic;box-shadow:0 14px 30px rgba(60,30,10,.12);animation:fadeUp .35s .7s both">“Bu maç benim maaşımı ikiye katlayacak.”</div>
        <div style="position:absolute;right:80px;top:1090px;max-width:640px;background:#fff;border-right:10px solid ${BLUE};border-radius:20px;padding:20px 28px;font-family:In;font-size:34px;font-style:italic;text-align:right;box-shadow:0 14px 30px rgba(60,30,10,.12);animation:fadeUp .35s 1.0s both">“Bu gece ışıkları söndüreceğim.”</div>
        <div style="position:absolute;left:110px;right:110px;top:1250px;animation:fadeUp .35s 1.3s both">${row('23-3-0', 'REKOR', '11-0-0')}${row('87', 'GÜÇ', '94', true)}${row('Muay Thai', 'STİL', 'Boks')}</div>
        <div style="position:absolute;left:0;right:0;top:1570px;display:flex;justify-content:center"><div style="font-family:InB;font-size:36px;color:#fff;background:${RED};padding:12px 30px;border-radius:40px;animation:pop .35s 1.8s both">⚠️ Rakip daha güçlü</div></div>`,
      `${TAPCSS}@keyframes inL{from{opacity:0;transform:translateX(-300px)}to{opacity:1;transform:none}}@keyframes inR{from{opacity:0;transform:translateX(300px)}to{opacity:1;transform:none}}`,
    ),
  });
  // 5) Soyunma odası: köşeye tek not
  SCENES.push({
    name: 'not', d: 2.4,
    html: page0(
      head(190, 'MAÇ GECESİ', 'KÖŞEYE', 'TEK NOT', 0.0) +
        `<div class="ph" style="top:600px">${phTop('Davit · maç gecesi', 'çevrimiçi')}<div class="chat">
          ${bub('Soyunma odasındayız. Rakip Yerlan Tokayev: boksör, elleri çok hızlı. <b>Ne diyelim?</b>', 0.15)}
          <div class="rep" style="animation:bub .3s .45s both,picked .5s 1.3s both">Ayakta kal, mesafeyi koru.</div>
          <div class="rep" style="animation:bub .3s .55s both">Onu yere indir.</div>
          <div class="rep" style="animation:bub .3s .65s both">Baskı kur, nefesini kes.</div></div></div>` +
        tapAt(700, 1020, 1.3),
      PCSS + TAPCSS,
    ),
  });
  // 6) Kafes: ünvan maçının gerçek kaydı
  SCENES.push({
    name: 'kafes', d: 2.9,
    html: page0(head(200, 'UCC · 5 RAUNT', 'KAFESTE', 'SÖZ ONUN', -0.2) + cage(620, 1030, 1.5, 0, 2.2, 'transform:rotate(-1deg)', '', KF) +
      `<div style="position:absolute;left:0;right:0;top:1230px;text-align:center;font-family:InB;font-size:40px;color:${INK};animation:fadeUp .35s 1.2s both">“Davit zor anlardan sakin çıktı.”</div>`, TAPCSS),
  });
  // 7) Sonuç
  SCENES.push({
    name: 'kemer', d: 2.6,
    html: page0(
      `<div style="position:absolute;left:0;right:0;top:260px;display:flex;flex-direction:column;align-items:center;z-index:5">
        <img src="${ICON}" style="width:420px;filter:drop-shadow(0 30px 50px rgba(242,178,51,.55));animation:pop .5s .05s both"/>
        <div style="font-size:150px;line-height:1;color:${INK};transform:skewX(-7deg);margin-top:20px;animation:slam .45s .3s both">KEMERİNİ</div>
        <div style="font-size:150px;line-height:1.05;color:${RED};transform:skewX(-7deg);animation:slam .45s .45s both">KORUDU!</div>
        <div style="font-family:InB;font-size:38px;color:#8a7a66;margin-top:20px;animation:fadeUp .35s .8s both">5. raunt · oybirliğiyle karar</div>
        <div style="margin-top:50px;font-size:96px;color:#fff;background:${GREEN};padding:6px 46px 14px;border-radius:26px;box-shadow:0 30px 70px rgba(31,157,85,.4);opacity:0;animation:stamp .4s 1.2s both">+$40.845</div>
        <div style="font-family:InB;font-size:34px;letter-spacing:6px;color:${GREEN};margin-top:22px;animation:fadeUp .3s 1.5s both">SENİN KOMİSYONUN</div></div>`,
      TAPCSS,
    ),
  });
  // 8) Duygusal kapanış mesajı
  SCENES.push({
    name: 'son', d: 2.7,
    html: page0(
      head(190, '', 'BU KEMER', 'İKİNİZİN', 0.05) +
        `<div class="ph" style="top:620px">${phTop(WHO, 'şimdi')}<div class="chat" style="min-height:460px">${typing(0.0, 0.5)}${bub('Yaptık. Kimse inanmazken sen inandın. <b>Bu kemer ikimizin, ortak.</b>', 0.5)}${bub('❤️🏆', 1.4, 'me')}</div></div>`,
      PCSS + TAPCSS,
    ),
  });
  // 9) Güncellemede daha fazlası
  SCENES.push({
    name: 'yeni', d: 2.6,
    html: page0(
      head(210, 'YENİ GÜNCELLEME', 'DAHA FAZLASI', 'GELDİ', 0.0) +
        [['💀', 'KABUS ZORLUĞU', 'Rakipler daha güçlü, sakatlıklar iz bırakır. Ödülleri satılmaz, kazanılır.', '#2a1414', '#fff'], ['🌐', 'YOL EVRENİ', "Menajerliğini yaptığın dövüşçü, kariyerinde karşına çıkar.", '#dbe9ff', INK], ['🎙️', 'MENAJER MODU', 'Telefon, pazarlık, basın, kemer. Hepsi sende.', '#ffe1d6', INK]]
          .map(([ic, ad, q, bg], i) => `<div class="opt" style="top:${620 + i * 270}px;height:240px;animation:fadeUp .4s ${0.25 + i * 0.25}s both"><div class="ic" style="background:${bg};width:120px;height:120px;font-size:68px">${ic}</div><div><b style="font-size:52px">${ad}</b><s style="font-size:30px;line-height:1.35">${q}</s></div></div>`).join(''),
      TAPCSS,
    ),
  });
}

// Yeni görünüm (1.1.8): kartlı ana menü ve modlar. Malzeme: scripts/yeni-gorunum-yakala.mjs
if (VIDEO === 'yeni') {
  END_KICK = 'YENİ GÖRÜNÜM';
  const MENU = `${src}/menu`;
  const EFS = `${src}/efsane`;
  const n = (d) => readdirSync(d).length;
  // Telefon çerçevesinde oyunun gerçek kaydı
  const phone = (top, w, dir, start, rate = 1, extra = '') => {
    const sw = w - 28;
    const sh = Math.round((sw * 1920) / 1080);
    return `<div style="position:absolute;left:${(1080 - w) / 2}px;top:${top}px;width:${w}px;height:${sh + 28}px;border-radius:64px;background:#111;padding:14px;box-shadow:0 50px 110px rgba(60,30,10,.35),0 0 0 3px #3a3a3a inset;${extra}">
      <div style="width:${sw}px;height:${sh}px;border-radius:50px;overflow:hidden;background:#000"><img data-seq="${dir}" data-start="${start}" data-rate="${rate}" data-max="${n(dir)}" style="width:100%;display:block"/></div>
      <div style="position:absolute;left:50%;top:26px;width:150px;height:34px;margin-left:-75px;border-radius:20px;background:#000"></div></div>`;
  };
  const pic = (file, left, top, w, extra = '') => `<img src="file://${src}/${file}" style="position:absolute;left:${left}px;top:${top}px;width:${w}px;border-radius:22px;box-shadow:0 40px 90px rgba(60,30,10,.35);${extra}"/>`;
  const YCSS = `${TAPCSS}@keyframes rise{from{opacity:0;transform:translateY(500px) rotate(4deg)}to{opacity:1;transform:none}}
    @keyframes popc{0%{opacity:0;transform:scale(.6) rotate(-6deg)}60%{opacity:1;transform:scale(1.04) rotate(-2.5deg)}100%{opacity:1;transform:rotate(-2deg)}}
    @keyframes float{from{transform:rotate(-2deg) translateY(0)}to{transform:rotate(-2deg) translateY(-18px)}}
    @keyframes tile{0%{opacity:0;transform:translateY(80px) scale(.7)}100%{opacity:1;transform:none}}`;
  // 1) Kanca: YOL yenilendi, telefon yükselir
  SCENES.push({
    name: 'hook', d: 2.6,
    html: page0(head(170, 'YENİ GÖRÜNÜM', 'YOL', 'YENİLENDİ.', -0.4).replace('class="l1"', 'class="l1" style="font-size:150px"') + phone(560, 720, MENU, 0, 1, 'animation:rise .7s cubic-bezier(.2,.8,.2,1) -.15s both'), YCSS + '.l2{font-size:150px}'),
  });
  // 2) Kariyer kahraman kartı
  SCENES.push({
    name: 'kariyer', d: 2.4,
    html: page0(
      head(200, 'KAHRAMAN KART', 'KARİYER', 'MODU', 0.0) +
        pic('kart-kariyer.png', 60, 640, 960, 'animation:popc .55s .1s both,float 2s .65s ease-in-out both') +
        `<div style="position:absolute;left:0;right:0;top:1270px;text-align:center;font-family:InB;font-size:46px;line-height:1.35;color:${INK};animation:fadeUp .4s .6s both">Sıfırdan UCC şampiyonluğuna.<br/><span style="color:${RED}">Her karar senin.</span></div>`,
      YCSS,
    ),
  });
  // 3) Efsane Yolları: kart + gerçek pencere kaydı
  SCENES.push({
    name: 'efsane', d: 2.9,
    html: page0(
      head(170, 'EFSANE YOLLARI', 'EFSANELERİ', 'YENİDEN YAZ', 0.0) +
        `<div class="card" style="left:70px;top:720px;width:940px;height:900px;border:10px solid #fff;animation:fadeUp .45s .35s both"><img data-seq="${EFS}" data-start="0.9" data-rate="1.15" data-max="${n(EFS)}" style="width:100%;display:block;margin-top:-150px"/></div>` +
        pic('kart-efsane.png', 300, 520, 620, 'z-index:20;animation:popc .5s .05s both'),
      YCSS,
    ),
  });
  // 4) Patron Modu (yeni)
  const PF = [['🃏', 'Kartı sen kur', 'Kim kiminle dövüşecek, sen seç.', '#dbe9ff'], ['🔥', 'Rakiplik ateşini yak', 'Basın, face-off, sosyal medya kavgaları.', '#ffe1d6'], ['🏆', 'Kendi kemerlerin', 'Şampiyonlar, unvan savunmaları, rövanşlar.', '#fff3c4'], ['🏟️', 'Depodan stadyuma', 'Yerel kanaldan PPV’ye, kasa senin.', '#dff3e4']];
  SCENES.push({
    name: 'patron', d: 3.0,
    html: page0(
      head(170, 'YENİ MOD', 'PATRON MODU', 'KENDİ ORGANİZASYONUNU KUR', 0.0).replace('class="l2"', 'class="l2" style="font-size:78px"') +
        pic('kart-patron.png', 230, 520, 620, 'animation:popc .5s .1s both') +
        PF.map(([ic, ad, q, bg], i) => `<div class="opt" style="top:${960 + i * 175}px;height:155px;animation:fadeUp .35s ${0.55 + i * 0.15}s both"><div class="ic" style="background:${bg}">${ic}</div><div><b>${ad}</b><s>${q}</s></div></div>`).join(''),
      YCSS,
    ),
  });
  // 5) Mod duvarı: diğer modların gerçek kartları
  const TW = 236;
  const TH = Math.round((TW * 312) / 272);
  SCENES.push({
    name: 'duvar', d: 3.0,
    html: page0(
      head(170, 'HEPSİ BİR ARADA', '11 MOD', 'TEK OYUN', 0.0) +
        [0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
          const c = k % 4;
          const r = Math.floor(k / 4);
          return `<img src="file://${src}/mod-${k}.png" style="position:absolute;left:${38 + c * (TW + 20)}px;top:${640 + r * (TH + 22)}px;width:${TW}px;border-radius:14px;box-shadow:0 24px 50px rgba(60,30,10,.3);animation:tile .4s ${0.25 + k * 0.12}s cubic-bezier(.2,.9,.3,1.3) both"/>`;
        }).join('') +
        `<div style="position:absolute;left:0;right:0;top:${640 + 2 * (TH + 22) + 40}px;text-align:center;font-family:InB;font-size:40px;line-height:1.4;color:${INK};animation:fadeUp .35s 1.4s both">Kariyer · Efsane Yolları · Patron · Menajer<br/>Antrenör · Hakem · Hayalet Maç <span style="color:${RED}">ve dahası</span></div>`,
      YCSS,
    ),
  });
  // 6) Gerçek kaydırma: telefon
  SCENES.push({
    name: 'kaydir', d: 3.0,
    html: page0(head(170, 'TEK DOKUNUŞ', 'HER ŞEY', 'ELİNİN ALTINDA', -0.2) + phone(560, 720, MENU, 1.8, 2.2), YCSS),
  });
}

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
// 20 sn seslendirmeli fragman (ElevenLabs, Brian): 12 yaşından kemere. Malzeme: scripts/viral-yakala.mjs + ses/ (01..06.mp3)
// Seslendirmeli fragmanlar (ElevenLabs, Brian): her sahne bir cümle; süreler ses/ klasöründeki mp3'lerden
const VO = { reklamko: [2.75, 2.7, 3.55, 2.65, 3.35, 4.05], oyunpov: [2.75, 2.7, 3.55, 2.65, 3.35, 4.05], oyunhd: [2.75, 2.7, 3.55, 2.65, 3.35, 4.05], pediahd: [2.45, 3.3, 2.95, 2.05, 2.75, 4.55, 2.85], viral: [3.24, 2.64, 2.69, 3.6, 3.58, 3.11], tiktok: [3.24, 2.64, 2.69, 3.6, 3.58, 3.11], efsaneyol: [2.74, 2.93, 3.24, 3.47, 3.37, 3.94] }[VIDEO] ?? [];
const VO_DOSYA = { reklamko: 'r0', oyunpov: 'r0', oyunhd: 'r0', pediahd: 'k', viral: '0', tiktok: '0', efsaneyol: 'e0' }[VIDEO];
// Telefon çerçevesinde ekran görüntüsü (oran: yükseklik/genişlik; varsayılan iPhone 1170×2532)
const phone = (file, left, top, w, extra = '', oran = 2532 / 1170) => {
  const sh = Math.round((w - 24) * oran);
  return `<div style="position:absolute;left:${left}px;top:${top}px;width:${w}px;height:${sh + 24}px;border-radius:56px;background:#111;padding:12px;box-shadow:0 50px 110px rgba(60,30,10,.35);${extra}"><img src="file://${src}/${file}" style="width:100%;display:block;border-radius:44px"/></div>`;
};
// Yuvarlak köşeli oyun kesiti: sabit görsel ya da kare dizisi (seq: klasör, kayıttaki başlangıç sn, sahnedeki başlangıç, hız)
const shotCard = (left, top, w, h, { file, seq, start = 0, t0 = 0, rate = 1 }, extra = '') => {
  const img = seq
    ? `<img data-seq="${src}/${seq}" data-start="${start}" data-t0="${t0}" data-rate="${rate}" data-max="${readdirSync(`${src}/${seq}`).length}" style="width:100%;height:100%;object-fit:cover;object-position:top"/>`
    : `<img src="file://${src}/${file}" style="width:100%;height:100%;object-fit:cover;object-position:top"/>`;
  return `<div style="position:absolute;left:${left}px;top:${top}px;width:${w}px;height:${h}px;border-radius:34px;overflow:hidden;background:#000;border:10px solid #111;box-shadow:0 50px 110px rgba(60,30,10,.35);${extra}">${img}</div>`;
};
// Seslendirmeyle eşzamanlı büyük altyazı: kelimeler sırayla patlar
// TikTok reklamı: üstteki sekme şeridinden aşağı, ekranın alt yarısında sağdaki simge sütunundan uzak dur
const TT = VIDEO === 'tiktok' || VIDEO === 'reklamko' || VIDEO === 'oyunpov' || VIDEO === 'oyunhd' || VIDEO === 'pediahd';
const sub = (top, words, t0, step, size = 112) =>
  `<div style="position:absolute;left:${TT && top > 650 ? 90 : 50}px;right:${TT && top > 650 ? 150 : 50}px;top:${TT && top < 420 ? top + 70 : top}px;display:flex;flex-wrap:wrap;justify-content:center;gap:0 26px;z-index:30">${words
    .map(([w, red], i) => `<span style="font-size:${size}px;line-height:1.08;transform:skewX(-7deg);color:${red ? RED : INK};animation:wpop .28s ${(t0 + i * step).toFixed(2)}s cubic-bezier(.2,.9,.3,1.4) both">${w}</span>`)
    .join('')}</div>`;
const VCSS = `${TAPCSS}@keyframes wpop{0%{opacity:0;transform:scale(1.8) skewX(-7deg)}100%{opacity:1;transform:skewX(-7deg)}}
    @keyframes rise{from{opacity:0;transform:translateY(420px) rotate(5deg)}to{opacity:1;transform:rotate(-3deg)}}
    @keyframes zoomS{from{transform:scale(1)}to{transform:scale(1.12)}}
    @keyframes flash{0%{opacity:0}15%{opacity:.85}100%{opacity:0}}
    @keyframes chip{0%{opacity:0;transform:translateY(60px) scale(.6) rotate(-6deg)}100%{opacity:1;transform:rotate(-3deg)}}`;
const d = (i) => +(VO[i] + 0.55).toFixed(2);
if (VIDEO === 'viral' || VIDEO === 'tiktok') {
  END_KICK = 'ŞİMDİ ÜCRETSİZ';
  // 1) Kanca: 12 yaşındasın
  SCENES.push({
    name: 'v1', d: d(0),
    html: page0(
      sub(130, [['12', 1], ['YAŞINDASIN.']], -0.2, 0.3, 140) +
        sub(320, [['ELİNDE'], ['SADECE'], ['BİR', 1], ['HAYAL', 1], ['VAR.', 1]], 1.1, 0.28, 92) +
        phone('genclik.png', 250, 700, 580, 'animation:rise .6s cubic-bezier(.2,.8,.2,1) -.1s both'),
      VCSS,
    ),
  });
  // 2) Dövüş sporları: ring kaydı ve branşlar
  SCENES.push({
    name: 'v2', d: d(1),
    html: page0(
      cage(330, 1020, 0.6, 0, 1, 'transform:rotate(-1.5deg)', '', `${src}/ringk`) +
        [['BOKS', 0.25, 110], ['MUAY THAI', 0.75, 400], ['GÜREŞ', 1.35, 760]].map(([w, at, x], i) => `<div style="position:absolute;left:${x - 60}px;top:${920 + (i % 2) * 120}px;background:${i === 1 ? RED : INK};color:#fff;font-size:76px;padding:6px 30px 10px;border-radius:18px;transform:skewX(-7deg);box-shadow:0 20px 40px rgba(0,0,0,.25);animation:chip .3s ${at}s cubic-bezier(.2,.9,.3,1.4) both;z-index:20">${w}</div>`).join('') +
        sub(1260, [['KENDİNİ'], ['KANITLA.', 1]], 1.7, 0.25, 120),
      VCSS,
    ),
  });
  // 3) Kafes: canlı maç kaydı
  SCENES.push({
    name: 'v3', d: d(2),
    html: page0(sub(200, [['SONRA'], ['KAFES.', 1]], 0.05, 0.3, 150) + `<div style="position:absolute;inset:0;animation:zoomS 3.3s linear both">${cage(560, 1040, 1.2, 0, 1.4, 'transform:rotate(1.5deg)', '', `${src}/kafesk`)}</div>` + sub(1180, [['HER'], ['RAUNT,'], ['HER'], ['KARAR'], ['SENİN.', 1]], 1.0, 0.24, 100), VCSS),
  });
  // 4) Menajer ve Patron Modu
  SCENES.push({
    name: 'v4', d: d(3),
    html: page0(
      phone('menajer.png', 40, 600, 500, 'transform:rotate(-5deg);animation:chip .45s .05s both') +
        phone('patron-giris.png', 540, 680, 500, 'transform:rotate(5deg);animation:chip .45s 1.6s both') +
        `<div style="position:absolute;left:0;right:0;top:110px;z-index:30">${sub(0, [['MENAJERİNLE'], ['PAZARLIK', 1], ['ET.', 1]], 0.15, 0.3, 100)}</div>` +
        `<div style="position:absolute;left:0;right:0;top:370px;z-index:30">${sub(0, [['ORGANİZASYONUNU'], ['KUR.', 1]], 1.75, 0.35, 100)}</div>`,
      VCSS,
    ),
  });
  // 5) Kemer
  SCENES.push({
    name: 'v5', d: d(4),
    html: page0(
      `<div style="position:absolute;inset:0;animation:zoomS 4s ease-out both">${phone('kemer.png', 240, TT ? 650 : 600, 600, 'transform:rotate(-2deg)')}</div>` +
        sub(110, [['VE'], ['BİR'], ['GECE...']], 0.1, 0.3, 104) +
        sub(250, [['BÜTÜN'], ['DÜNYA'], ['ADINI', 1], ['HAYKIRIR.', 1]], 1.5, 0.32, 104) +
        `<div style="position:absolute;inset:0;background:#fff;opacity:0;animation:flash .6s 1.5s both;z-index:40"></div>${CONF.h}`,
      VCSS + CONF.k.replace(/@keyframes cf(\d+)\{from\{transform:translateY\((-?\d+)px\)/g, (m, i, y) => `@keyframes cf${i}{from{transform:translateY(${+y - 400}px)`),
    ),
  });
}

// TikTok reklamı: 9-15 sn önerisine göre sadece kanca, kafes ve kemer (+ kapanış)
if (VIDEO === 'tiktok') for (const n of ['v2', 'v4']) SCENES.splice(SCENES.findIndex((x) => x.name === n), 1);

// Hafta sonu reklamı (TikTok): ilk saniyede gerçek nakavt (ağır çekim), sonra kariyerin hikâyesi; Brian anlatır.
// Malzeme: scripts/ko-yakala.mjs (mac2 → kok/ ağır çekim kırpım), acik-viral ring/kafes kayıtları, ham ekranlar, ses/r01..r06
if (VIDEO === 'reklamko') {
  END_KICK = 'ÜCRETSİZ İNDİR';
  const KCSS = `${VCSS}@keyframes sars{0%,100%{transform:translate(0,0)}20%{transform:translate(-26px,14px)}40%{transform:translate(22px,-18px)}60%{transform:translate(-14px,10px)}80%{transform:translate(8px,-6px)}}
    @keyframes slam{0%{opacity:0;transform:scale(3) rotate(-8deg)}60%{opacity:1;transform:scale(.92) rotate(-6deg)}100%{opacity:1;transform:scale(1) rotate(-6deg)}}
    @keyframes swap{from{opacity:0;transform:translateX(500px) rotate(8deg)}to{opacity:1;transform:rotate(3deg)}}
    @keyframes cikis{to{opacity:0;transform:translateX(-500px) rotate(-8deg)}}`;
  // 1) KANCA: tek yumruk, ağır çekim düşüş, NAKAVT!
  SCENES.push({
    name: 'a1', d: 3.3,
    html: page0(
      `<div style="position:absolute;inset:0;animation:sars .45s .9s linear both">${shotCard(30, 640, 1020, 729, { seq: 'kok' }, 'transform:rotate(-1.5deg)')}</div>` +
        sub(120, [['TEK'], ['YUMRUK...', 1]], 0.0, 0.3, 130) +
        `<div style="position:absolute;left:0;right:0;top:1150px;text-align:center;font-size:250px;color:${RED};-webkit-text-stroke:10px #fff;paint-order:stroke;text-shadow:0 24px 50px rgba(0,0,0,.45);z-index:35;animation:slam .35s .92s cubic-bezier(.2,.9,.3,1.3) both">NAKAVT!</div>` +
        sub(300, [['VE'], ['BÜTÜN'], ['SALON'], ['AYAKTA!', 1]], 1.3, 0.28, 96) +
        `<div style="position:absolute;inset:0;background:#fff;opacity:0;animation:flash .5s .9s both;z-index:40"></div>`,
      KCSS,
    ),
  });
  // 2) Kemerden 12 yaşına
  SCENES.push({
    name: 'a2', d: d(1),
    html: page0(
      phone('kemer.png', 240, 640, 600, 'transform:rotate(-3deg);animation:rise .45s cubic-bezier(.2,.8,.2,1) -.05s both,cikis .4s 1.45s ease-in forwards') +
        phone('genclik.png', 240, 660, 600, 'animation:swap .45s 1.5s cubic-bezier(.2,.8,.2,1) both') +
        sub(120, [['KEMERE'], ['GİDEN'], ['YOL...', 1]], 0.05, 0.28, 110) +
        sub(300, [['12', 1], ['YAŞINDA'], ['BAŞLIYOR.']], 1.45, 0.28, 104),
      KCSS,
    ),
  });
  // 3) Dövüş sporları → kafes
  SCENES.push({
    name: 'a3', d: d(2),
    html: page0(
      cage(560, 1020, 0.8, 0, 1, 'transform:rotate(-1.5deg)', '', `${src}/ringk`) +
        `<div style="position:absolute;inset:0;opacity:0;animation:wpop .3s 2.0s both;z-index:15">${cage(560, 1040, 1.4, 2.0, 1.3, 'transform:rotate(1.5deg)', '', `${src}/kafesk`)}</div>` +
        [['BOKS', 0.1, 110], ['MUAY THAI', 0.55, 390], ['GÜREŞ', 1.1, 760]].map(([w, at, x], i) => `<div style="position:absolute;left:${x - 60}px;top:${190 + (i % 2) * 120}px;background:${i === 1 ? RED : INK};color:#fff;font-size:76px;padding:6px 30px 10px;border-radius:18px;transform:skewX(-7deg);box-shadow:0 20px 40px rgba(0,0,0,.25);animation:chip .3s ${at}s cubic-bezier(.2,.9,.3,1.4) both;z-index:20">${w}</div>`).join('') +
        sub(1150, [['SONRA'], ['KAFES.', 1]], 2.0, 0.3, 130),
      KCSS,
    ),
  });
  // 4) Karar anı: seçeneğe dokun
  SCENES.push({
    name: 'a4', d: d(3),
    html: page0(
      shotCard(110, 480, 860, 1180, { file: 'karar.jpg' }, 'transform:rotate(-1.5deg);animation:rise .45s cubic-bezier(.2,.8,.2,1) -.05s both') +
        sub(110, [['KRİTİK'], ['ANDA'], ['KARAR'], ['SENİN.', 1]], 0.05, 0.25, 108) +
        tapAt(520, 1435, 1.5),
      KCSS,
    ),
  });
  // 5) Menajer ve Patron Modu
  SCENES.push({
    name: 'a5', d: d(4),
    html: page0(
      phone('menajer.png', 40, 720, 500, 'transform:rotate(-5deg);animation:chip .45s .05s both') +
        phone('patron-giris.png', 540, 800, 500, 'transform:rotate(5deg);animation:chip .45s 1.4s both') +
        `<div style="position:absolute;left:0;right:0;top:70px;z-index:30">${sub(0, [['MENAJERİNLE'], ['PAZARLIK', 1], ['ET.', 1]], 0.15, 0.28, 100)}</div>` +
        `<div style="position:absolute;left:0;right:0;top:350px;z-index:30">${sub(0, [['ORGANİZASYONUNU'], ['KUR.', 1]], 1.45, 0.3, 100)}</div>`,
      KCSS,
    ),
  });
}

// Tam ekran oyun reklamı (krem/telefon çerçevesi yok): ekranın tamamı oyun, TikTok tarzı yazılar, Brian anlatır.
// Malzeme: acik-oyunpov/ (kotam: Menajer Modu maçından ağır çekim nakavt, ring/kafes tam kare kayıtlar, ham ekranlar), ses/r01..r06
if (VIDEO === 'oyunpov') {
  END_KICK = 'ÜCRETSİZ İNDİR';
  // Tam ekran katman: kayıt (seq) ya da görsel; yakınlaştırma odağı (fx, fy) ve ölçek s0→s1
  const tam = ({ seq, file, start = 0, t0 = 0, rate = 1, fx = 540, fy = 960, s0 = 1, s1 = 1.06, d = 4, ty0 = 0, ty1 = 0, extra = '' }) => {
    const id = `z${Math.random().toString(36).slice(2, 8)}`;
    const img = seq
      ? `<img data-seq="${src}/${seq}" data-start="${start}" data-t0="${t0}" data-rate="${rate}" data-max="${readdirSync(`${src}/${seq}`).length}" style="width:1080px;display:block"/>`
      : `<img src="file://${src}/${file}" style="width:1080px;display:block"/>`;
    return `<style>@keyframes ${id}{from{transform:translateY(${ty0}px) scale(${s0})}to{transform:translateY(${ty1}px) scale(${s1})}}</style><div style="position:absolute;left:0;top:0;width:1080px;transform-origin:${fx}px ${fy}px;animation:${id} ${d}s linear ${t0}s both;${extra}">${img}</div>`;
  };
  // TikTok tarzı yazı: beyaz, kalın siyah kontur
  const yaz = (top, words, t0, step, size = 104) =>
    `<div style="position:absolute;left:70px;right:${top > 650 ? 150 : 70}px;top:${top}px;display:flex;flex-wrap:wrap;justify-content:center;gap:0 24px;z-index:30">${words
      .map(([w, red], i) => `<span style="font-size:${size}px;line-height:1.08;color:${red ? '#ffd23f' : '#fff'};-webkit-text-stroke:${Math.round(size / 9)}px #000;paint-order:stroke;text-shadow:0 8px 24px rgba(0,0,0,.6);animation:wpop .26s ${(t0 + i * step).toFixed(2)}s cubic-bezier(.2,.9,.3,1.4) both">${w}</span>`)
      .join('')}</div>`;
  const PCSS = `${VCSS}.paper{background:#000!important}.grain,.logo{display:none}
    @keyframes sars{0%,100%{transform:translate(0,0)}20%{transform:translate(-26px,14px)}40%{transform:translate(22px,-18px)}60%{transform:translate(-14px,10px)}80%{transform:translate(8px,-6px)}}
    @keyframes slam{0%{opacity:0;transform:scale(3) rotate(-8deg)}60%{opacity:1;transform:scale(.92) rotate(-6deg)}100%{opacity:1;transform:scale(1) rotate(-6deg)}}
    @keyframes gir{from{opacity:0}to{opacity:1}}`;
  const ust = `<div style="position:absolute;left:0;right:0;top:0;height:760px;background:linear-gradient(#000e 0%,#000c 55%,#0000);z-index:20"></div>`;
  const sw = (t, inner) => `<div style="position:absolute;inset:0;opacity:0;animation:gir .12s ${t}s both">${inner}</div>`;
  // 1) KANCA: nakavt (kafese yakın, ağır çekim)
  SCENES.push({
    name: 'p1', d: 3.3,
    html: page0(
      `<div style="position:absolute;inset:0;animation:sars .45s .9s linear both">${tam({ seq: 'kotam', fx: 470, fy: 470, s0: 1.95, s1: 2.15, d: 3.3, ty0: 380, ty1: 380 })}</div>` + ust +
        yaz(170, [['TEK'], ['YUMRUK...', 1]], 0.0, 0.3, 124) +
        `<div style="position:absolute;left:0;right:0;top:1180px;text-align:center;font-size:240px;color:#ffd23f;-webkit-text-stroke:22px #000;paint-order:stroke;z-index:35;animation:slam .35s .92s cubic-bezier(.2,.9,.3,1.3) both">NAKAVT!</div>` +
        yaz(330, [['VE'], ['BÜTÜN'], ['SALON'], ['AYAKTA!', 1]], 1.3, 0.28, 96) +
        `<div style="position:absolute;inset:0;background:#fff;opacity:0;animation:flash .5s .9s both;z-index:40"></div>`,
      PCSS, { logo: false },
    ),
  });
  // 2) Kemer → 12 yaş (Gençlik Yolu ekranında seçime dokunuş)
  SCENES.push({
    name: 'p2', d: d(1),
    html: page0(
      tam({ file: 'kemer.png', fx: 540, fy: 700, s0: 1.05, s1: 1.2, d: 1.6, ty0: -80, ty1: -150 }) +
        sw(1.45, tam({ file: 'genclik.png', t0: 1.45, fx: 540, fy: 600, s0: 1.08, s1: 1.14, d: 2, ty0: -60, ty1: -90 }) + tapAt(560, 1270, 2.3)) + ust +
        yaz(170, [['KEMERE'], ['GİDEN'], ['YOL...', 1]], 0.05, 0.28, 108) +
        yaz(330, [['12', 1], ['YAŞINDA'], ['BAŞLIYOR.']], 1.45, 0.28, 104),
      PCSS, { logo: false },
    ),
  });
  // 3) Ring → kafes (tam ekran, ringe yakın)
  SCENES.push({
    name: 'p3', d: d(2),
    html: page0(
      tam({ seq: 'ring', start: 0.8, fx: 540, fy: 590, s0: 1.75, s1: 1.9, d: 2.1, ty0: 300, ty1: 300 }) +
        sw(2.0, tam({ seq: 'kafes', start: 1.4, t0: 2.0, rate: 1.3, fx: 540, fy: 470, s0: 1.8, s1: 1.95, d: 2.2, ty0: 420, ty1: 420 })) + ust +
        [['BOKS', 0.1, 120], ['MUAY THAI', 0.55, 400], ['GÜREŞ', 1.1, 760]].map(([w, at, x], i) => `<div style="position:absolute;left:${x - 60}px;top:${200 + (i % 2) * 120}px;background:${i === 1 ? '#ffd23f' : '#fff'};color:#000;font-size:76px;padding:6px 30px 10px;border-radius:18px;transform:skewX(-7deg);box-shadow:0 20px 40px rgba(0,0,0,.5);animation:chip .3s ${at}s cubic-bezier(.2,.9,.3,1.4) both;z-index:30">${w}</div>`).join('') +
        yaz(1250, [['SONRA'], ['KAFES.', 1]], 2.0, 0.3, 140),
      PCSS, { logo: false },
    ),
  });
  // 4) Karar anı: seçeneğe dokun
  SCENES.push({
    name: 'p4', d: d(3),
    html: page0(
      tam({ file: 'karar.jpg', fx: 540, fy: 1100, s0: 1.12, s1: 1.22, d: 3.2, ty0: -40, ty1: -60 }) + ust +
        yaz(170, [['KRİTİK'], ['ANDA'], ['KARAR'], ['SENİN.', 1]], 0.05, 0.25, 108) +
        tapAt(420, 1150, 1.5),
      PCSS, { logo: false },
    ),
  });
  // 5) Menajer → Patron Modu
  SCENES.push({
    name: 'p5', d: d(4),
    html: page0(
      tam({ file: 'menajer.png', fx: 540, fy: 600, s0: 1.06, s1: 1.14, d: 1.6, ty0: -40, ty1: -90 }) + tapAt(540, 1050, 0.8) +
        sw(1.45, tam({ file: 'patron-giris.png', t0: 1.45, fx: 540, fy: 600, s0: 1.08, s1: 1.16, d: 2.5, ty0: -30, ty1: -120 })) + ust +
        yaz(170, [['MENAJERİNLE'], ['PAZARLIK', 1], ['ET.', 1]], 0.15, 0.28, 100) +
        yaz(440, [['ORGANİZASYONUNU'], ['KUR.', 1]], 1.45, 0.3, 100),
      PCSS, { logo: false },
    ),
  });
}

// HD tam ekran oyun reklamı: görüntüler 4x yoğunlukta, oyun saati yavaşlatılarak kare kare çekildi (scripts/hd-yakala.mjs).
// Kayıtlar (kafes/ring bölgesi 2080×1080) doğal boyutunda, ekranlar (2160×3840) yarı boyutta gösterilir: hiçbir şey büyütülüp bulanıklaşmaz.
if (VIDEO === 'oyunhd') {
  END_KICK = 'ÜCRETSİZ İNDİR';
  // Kayıt bandı: doğal boyutta (2080×1080), merkez x'i ekrana ortalanır
  const bant = ({ seq, start = 0, t0 = 0, rate = 1, top = 420, cx = 1040, s0 = 1, s1 = 1.06, d = 4 }) => {
    const id = `b${Math.random().toString(36).slice(2, 8)}`;
    return `<style>@keyframes ${id}{from{transform:scale(${s0})}to{transform:scale(${s1})}}</style><div style="position:absolute;left:${540 - cx}px;top:${top}px;width:2080px;height:1080px;transform-origin:${cx}px 540px;animation:${id} ${d}s linear ${t0}s both"><img data-seq="${src}/${seq}" data-start="${start}" data-t0="${t0}" data-rate="${rate}" data-max="${readdirSync(`${src}/${seq}`).length}" style="width:2080px;height:1080px;display:block"/></div>`;
  };
  // Tam ekran oyun ekranı (2160×3840 → 1080×1920), yavaş yakınlaşma
  const ekran = ({ file, t0 = 0, fx = 540, fy = 960, s0 = 1, s1 = 1.08, d = 4 }) => {
    const id = `e${Math.random().toString(36).slice(2, 8)}`;
    return `<style>@keyframes ${id}{from{transform:scale(${s0})}to{transform:scale(${s1})}}</style><div style="position:absolute;left:0;top:0;width:1080px;height:1920px;transform-origin:${fx}px ${fy}px;animation:${id} ${d}s linear ${t0}s both"><img src="file://${src}/${file}" style="width:1080px;height:1920px;display:block"/></div>`;
  };
  const yaz = (top, words, t0, step, size = 104) =>
    `<div style="position:absolute;left:70px;right:${top > 650 ? 150 : 70}px;top:${top}px;display:flex;flex-wrap:wrap;justify-content:center;gap:0 24px;z-index:30">${words
      .map(([w, red], i) => `<span style="font-size:${size}px;line-height:1.08;color:${red ? '#ffd23f' : '#fff'};-webkit-text-stroke:${Math.round(size / 9)}px #000;paint-order:stroke;text-shadow:0 8px 24px rgba(0,0,0,.6);animation:wpop .26s ${(t0 + i * step).toFixed(2)}s cubic-bezier(.2,.9,.3,1.4) both">${w}</span>`)
      .join('')}</div>`;
  const PCSS = `${VCSS}.paper{background:radial-gradient(ellipse at 50% 50%,#1b1416 0%,#050505 70%)!important}.grain,.logo{display:none}
    @keyframes sars{0%,100%{transform:translate(0,0)}20%{transform:translate(-26px,14px)}40%{transform:translate(22px,-18px)}60%{transform:translate(-14px,10px)}80%{transform:translate(8px,-6px)}}
    @keyframes slam{0%{opacity:0;transform:scale(3) rotate(-8deg)}60%{opacity:1;transform:scale(.92) rotate(-6deg)}100%{opacity:1;transform:scale(1) rotate(-6deg)}}
    @keyframes gir{from{opacity:0}to{opacity:1}}`;
  const ust = `<div style="position:absolute;left:0;right:0;top:0;height:760px;background:linear-gradient(#000e 0%,#000c 55%,#0000);z-index:20"></div>`;
  const sw = (t, inner) => `<div style="position:absolute;inset:0;opacity:0;animation:gir .12s ${t}s both">${inner}</div>`;
  // 1) KANCA: nakavt (kafes bandı doğal boyutta, ağır çekim)
  SCENES.push({
    name: 'p1', d: 3.3,
    html: page0(
      `<div style="position:absolute;inset:0;animation:sars .45s .9s linear both">${bant({ seq: 'kotam', top: 400, cx: 900, s0: 1, s1: 1.08, d: 3.3 })}</div>` +
        `<div style="position:absolute;left:0;right:0;top:0;height:700px;background:linear-gradient(#000 0%,#000 82%,#0000);z-index:20"></div>` +
        yaz(140, [['TEK'], ['YUMRUK...', 1]], 0.0, 0.3, 124) +
        yaz(290, [['VE'], ['BÜTÜN'], ['SALON'], ['AYAKTA!', 1]], 1.3, 0.28, 92) +
        `<div style="position:absolute;left:0;right:0;top:1250px;text-align:center;font-size:240px;color:#ffd23f;-webkit-text-stroke:22px #000;paint-order:stroke;z-index:35;animation:slam .35s .92s cubic-bezier(.2,.9,.3,1.3) both">NAKAVT!</div>` +
        `<div style="position:absolute;inset:0;background:#fff;opacity:0;animation:flash .5s .9s both;z-index:40"></div>`,
      PCSS, { logo: false },
    ),
  });
  // 2) Kemer → 12 yaş
  SCENES.push({
    name: 'p2', d: d(1),
    html: page0(
      ekran({ file: 'kemer.jpg', fx: 540, fy: 900, s0: 1.0, s1: 1.12, d: 1.6 }) +
        sw(1.45, ekran({ file: 'genclik.jpg', t0: 1.45, fx: 540, fy: 1700, s0: 1.12, s1: 1.16, d: 2 }) + tapAt(480, 785, 2.3)) + ust +
        yaz(160, [['KEMERE'], ['GİDEN'], ['YOL...', 1]], 0.05, 0.28, 108) +
        yaz(320, [['12', 1], ['YAŞINDA'], ['BAŞLIYOR.']], 1.45, 0.28, 104),
      PCSS, { logo: false },
    ),
  });
  // 3) Ring → kafes
  SCENES.push({
    name: 'p3', d: d(2),
    html: page0(
      bant({ seq: 'ringmac', start: 0.3, top: 470, cx: 1040, s0: 1, s1: 1.05, d: 2.1 }) +
        sw(2.0, bant({ seq: 'kafesmac', start: 1.0, t0: 2.0, rate: 1.2, top: 470, cx: 1040, s0: 1, s1: 1.05, d: 2.2 })) +
        [['BOKS', 0.1, 120], ['MUAY THAI', 0.55, 400], ['GÜREŞ', 1.1, 760]].map(([w, at, x], i) => `<div style="position:absolute;left:${x - 60}px;top:${200 + (i % 2) * 120}px;background:${i === 1 ? '#ffd23f' : '#fff'};color:#000;font-size:76px;padding:6px 30px 10px;border-radius:18px;transform:skewX(-7deg);box-shadow:0 20px 40px rgba(0,0,0,.5);animation:chip .3s ${at}s cubic-bezier(.2,.9,.3,1.4) both;z-index:30">${w}</div>`).join('') +
        yaz(1300, [['SONRA'], ['KAFES.', 1]], 2.0, 0.3, 140),
      PCSS, { logo: false },
    ),
  });
  // 4) Karar anı
  SCENES.push({
    name: 'p4', d: d(3),
    html: page0(
      ekran({ file: 'karar.jpg', fx: 540, fy: 700, s0: 1.1, s1: 1.18, d: 3.2 }) + ust +
        yaz(150, [['KRİTİK'], ['ANDA'], ['KARAR'], ['SENİN.', 1]], 0.05, 0.25, 108) +
        tapAt(430, 1225, 1.5),
      PCSS, { logo: false },
    ),
  });
  // 5) Menajer → Patron Modu
  SCENES.push({
    name: 'p5', d: d(4),
    html: page0(
      ekran({ file: 'menajer.jpg', fx: 540, fy: 700, s0: 1.04, s1: 1.1, d: 1.6 }) + tapAt(540, 700, 0.8) +
        sw(1.45, ekran({ file: 'patron-giris.jpg', t0: 1.45, fx: 540, fy: 1750, s0: 1.12, s1: 1.17, d: 2.5 })) + ust +
        yaz(150, [['MENAJERİNLE'], ['PAZARLIK', 1], ['ET.', 1]], 0.15, 0.28, 100) +
        yaz(420, [['ORGANİZASYONUNU'], ['KUR.', 1]], 1.45, 0.3, 100),
      PCSS, { logo: false },
    ),
  });
}

// Kafespedia videosu (HD): oyunun ansiklopedi sayfası kariyerle büyür (22 yaş çaylak → 29 şampiyon → 38 efsane).
// Malzeme: scripts/pedia-yakala.mjs (4x sayfa çekimleri, kaydırma), acik-oyunhd'den nakavt ve kemer; ses/k1..k7 (Brian)
if (VIDEO === 'pediahd') {
  END_KICK = 'ÜCRETSİZ İNDİR';
  const ekran = ({ file, seq, start = 0, t0 = 0, rate = 1, fx = 540, fy = 960, s0 = 1, s1 = 1.06, d = 4, ease = 'linear' }) => {
    const id = `e${Math.random().toString(36).slice(2, 8)}`;
    const img = seq
      ? `<img data-seq="${src}/${seq}" data-start="${start}" data-t0="${t0}" data-rate="${rate}" data-max="${readdirSync(`${src}/${seq}`).length}" style="width:1080px;height:1920px;display:block"/>`
      : `<img src="file://${src}/${file}" style="width:1080px;height:1920px;display:block"/>`;
    return `<style>@keyframes ${id}{from{transform:scale(${s0})}to{transform:scale(${s1})}}</style><div style="position:absolute;left:0;top:0;width:1080px;height:1920px;transform-origin:${fx}px ${fy}px;animation:${id} ${d}s ${ease} ${t0}s both">${img}</div>`;
  };
  const bant = ({ seq, start = 0, t0 = 0, top = 420, cx = 1040, s0 = 1, s1 = 1.06, d = 4 }) => {
    const id = `b${Math.random().toString(36).slice(2, 8)}`;
    return `<style>@keyframes ${id}{from{transform:scale(${s0})}to{transform:scale(${s1})}}</style><div style="position:absolute;left:${540 - cx}px;top:${top}px;width:2080px;height:1080px;transform-origin:${cx}px 540px;animation:${id} ${d}s linear ${t0}s both"><img data-seq="${src}/${seq}" data-start="${start}" data-t0="${t0}" data-rate="1" data-max="${readdirSync(`${src}/${seq}`).length}" style="width:2080px;height:1080px;display:block"/></div>`;
  };
  const yaz = (top, words, t0, step, size = 104) =>
    `<div style="position:absolute;left:70px;right:${top > 650 ? 150 : 70}px;top:${top}px;display:flex;flex-wrap:wrap;justify-content:center;gap:0 24px;z-index:30">${words
      .map(([w, red], i) => `<span style="font-size:${size}px;line-height:1.08;color:${red ? '#ffd23f' : '#fff'};-webkit-text-stroke:${Math.round(size / 9)}px #000;paint-order:stroke;text-shadow:0 8px 24px rgba(0,0,0,.6);animation:wpop .26s ${(t0 + i * step).toFixed(2)}s cubic-bezier(.2,.9,.3,1.4) both">${w}</span>`)
      .join('')}</div>`;
  // Yaş/rekor rozeti
  const rozet = (top, ust, alt, t0, renk = '#e63946') =>
    `<div style="position:absolute;left:50%;top:${top}px;transform:translateX(-50%);z-index:32;animation:chip .35s ${t0}s cubic-bezier(.2,.9,.3,1.4) both"><div style="background:${renk};color:#fff;border:8px solid #000;border-radius:26px;padding:10px 46px 16px;text-align:center;box-shadow:0 24px 50px rgba(0,0,0,.45)"><div style="font-size:120px;line-height:1">${ust}</div><div style="font-size:52px;line-height:1.1;letter-spacing:3px">${alt}</div></div></div>`;
  const PCSS = `${VCSS}.paper{background:#050505!important}.grain,.logo{display:none}
    @keyframes gir{from{opacity:0}to{opacity:1}}
    @keyframes sayfa{0%{opacity:0;transform:translateX(160px) rotate(3deg)}100%{opacity:1;transform:none}}`;
  const golge = `<div style="position:absolute;left:0;right:0;top:0;height:620px;background:linear-gradient(#000d 0%,#0008 60%,#0000);z-index:20"></div>`;
  const sw = (t, inner, anim = 'gir .12s') => `<div style="position:absolute;inset:0;opacity:0;animation:${anim} ${t}s both">${inner}</div>`;
  // 1) KANCA: yüze yakın başlayıp sayfaya açılan çekim
  SCENES.push({
    name: 'q1', d: 2.95,
    html: page0(
      ekran({ file: 'C-ust.jpg', fx: 540, fy: 468, s0: 2.2, s1: 1.15, d: 2.95, ease: 'cubic-bezier(.5,0,.2,1)' }) +
        yaz(1180, [['BU'], ['DÖVÜŞÇÜ'], ['GERÇEK'], ['DEĞİL.', 1]], 0.05, 0.3, 118),
      PCSS, { logo: false },
    ),
  });
  // 2) Onu sen yarattın: nakavt + kemer
  SCENES.push({
    name: 'q2', d: d(1),
    html: page0(
      bant({ seq: 'kotam', start: 0.5, top: 470, cx: 900, s0: 1, s1: 1.06, d: 1.7 }) +
        `<div style="position:absolute;left:0;right:0;top:0;height:720px;background:linear-gradient(#050505 0%,#050505 84%,#0000);z-index:6"></div>` +
        sw(1.6, `<div style="position:absolute;inset:0;background:#050505"></div>` + ekran({ file: 'kemer.jpg', t0: 1.6, fx: 540, fy: 900, s0: 1.0, s1: 1.1, d: 2.3 })) + golge +
        yaz(170, [['ONU'], ['SEN', 1], ['YARATTIN.']], 0.05, 0.25, 116) +
        sw(1.25, yaz(330, [['HER'], ['SATIRI'], ['SEN', 1], ['YAZDIN.']], 1.25, 0.24, 100)),
      PCSS, { logo: false },
    ),
  });
  // 3) 22 yaş: çaylak sayfası
  SCENES.push({
    name: 'q3', d: d(2),
    html: page0(
      sw(0, ekran({ file: 'A-ust.jpg', fx: 150, fy: 1004, s0: 1.25, s1: 1.38, d: 3.5 }), 'sayfa .4s cubic-bezier(.2,.8,.2,1)') +
        rozet(1330, '22 YAŞ', 'ÇAYLAK · 2-0', 0.35, '#444'),
      PCSS, { logo: false },
    ),
  });
  // 4) 29 yaş: şampiyon (işaretli satır)
  SCENES.push({
    name: 'q4', d: d(3),
    html: page0(
      sw(0, ekran({ file: 'B-ust.jpg', fx: 150, fy: 1450, s0: 1.3, s1: 1.4, d: 2.6 }), 'sayfa .4s cubic-bezier(.2,.8,.2,1)') +
        sw(0.85, ekran({ file: 'B-ust-isaret.jpg', t0: 0, fx: 150, fy: 1450, s0: 1.3, s1: 1.4, d: 2.6 }), 'gir .3s') +
        rozet(260, '29 YAŞ', 'UCC ŞAMPİYONU · 25-2', 0.3),
      PCSS, { logo: false },
    ),
  });
  // 5) 38 yaş: efsane
  SCENES.push({
    name: 'q5', d: d(4),
    html: page0(
      sw(0, ekran({ file: 'C-ust-isaret.jpg', fx: 150, fy: 1500, s0: 1.3, s1: 1.42, d: 3.3 }), 'sayfa .4s cubic-bezier(.2,.8,.2,1)') +
        rozet(260, '38 YAŞ', 'EFSANE · 34-4 · 2 KEMER', 0.3, '#b8860b') +
        `<div style="position:absolute;inset:0;background:#fff;opacity:0;animation:flash .5s 1.3s both;z-index:40"></div>`,
      PCSS, { logo: false },
    ),
  });
  // 6) Sayfa akıyor: rekabetler, kemerler, dergi kapakları, dövüş kaydı
  SCENES.push({
    name: 'q6', d: d(5),
    html: page0(
      ekran({ seq: 'C-kaydir', start: 0.6, rate: 0.95, fx: 540, fy: 960, s0: 1.08, s1: 1.12, d: 5.1 }) + golge +
        [['RAKİPLER', 0.1, 0], ['KEMERLER', 0.65, 1], ['DERGİ KAPAKLARI', 1.3, 2]].map(([w, at, i]) => `<div style="position:absolute;left:50%;top:${150 + i * 125}px;transform:translateX(-50%) skewX(-7deg);background:${i === 1 ? '#ffd23f' : '#fff'};color:#000;font-size:68px;padding:4px 30px 10px;border:7px solid #000;border-radius:18px;white-space:nowrap;box-shadow:0 18px 40px rgba(0,0,0,.45);animation:chip .3s ${at}s cubic-bezier(.2,.9,.3,1.4) both;z-index:30">${w}</div>`).join('') +
        sw(3.0, yaz(1330, [['HEPSİ'], ['KENDİLİĞİNDEN'], ['YAZILIYOR.', 1]], 3.0, 0.25, 96)),
      PCSS, { logo: false },
    ),
  });
}

// Efsane Yolları fragmanı (seslendirmeli): efsaneler → sen olsaydın → bölümler → kafes → "ya öyle olsaydı?"
// Malzeme: scripts/efsane-yakala.mjs (+ kırpılmış listek/, yuruyusk/, kafesk/, vs-k.jpg) ve ses/e01..e06.mp3
if (VIDEO === 'efsaneyol') {
  END_KICK = 'EFSANE YOLLARI · İLKİ ÜCRETSİZ';
  const chip = (w, at, x, y, red) => `<div style="position:absolute;left:${x}px;top:${y}px;background:${red ? RED : INK};color:#fff;font-size:62px;padding:6px 28px 10px;border-radius:18px;transform:skewX(-7deg);box-shadow:0 20px 40px rgba(0,0,0,.25);animation:chip .3s ${at}s cubic-bezier(.2,.9,.3,1.4) both;z-index:20;white-space:nowrap">${w}</div>`;
  // 1) Efsane listesi kayarak
  SCENES.push({
    name: 'e1', d: d(0),
    html: page0(
      sub(130, [['KAFESİN'], ['EN'], ['BÜYÜK'], ['EFSANELERİ', 1]], 0.0, 0.25, 116) +
        shotCard(110, 470, 860, 1260, { seq: 'listek', start: 0.2, rate: 1.25 }, 'transform:rotate(-2deg);animation:rise .55s cubic-bezier(.2,.8,.2,1) -.1s both'),
      VCSS,
    ),
  });
  // 2) Kırmızı köşede... sen
  SCENES.push({
    name: 'e2', d: d(1),
    html: page0(
      `<div style="position:absolute;inset:0;animation:zoomS 3.6s ease-out both">${shotCard(60, 600, 960, 1150, { seq: 'yuruyusk', start: 5.6, rate: 0.9 }, 'transform:rotate(1.5deg)')}</div>` +
        sub(120, [['PEKİ'], ['YA'], ['ONLARIN'], ['YERİNDE'], ['SEN', 1], ['OLSAYDIN?', 1]], 0.05, 0.27, 104),
      VCSS,
    ),
  });
  // 3) Bölümler ve ilk bölümün hikâyesi
  SCENES.push({
    name: 'e3', d: d(2),
    html: page0(
      phone('bolumler.jpg', 40, 640, 520, 'transform:rotate(-5deg);animation:chip .45s .0s both', 1920 / 1080) +
        phone('giris1.jpg', 520, 720, 520, 'transform:rotate(5deg);animation:chip .45s 1.5s both', 1920 / 1080) +
        sub(120, [['HER'], ['BÖLÜM'], ['BİR'], ['DÖNEM.', 1]], 0.1, 0.24, 108) +
        sub(380, [['HER'], ['KARAR'], ['SENİN.', 1]], 1.75, 0.26, 108),
      VCSS,
    ),
  });
  // 4) Kafes: maç öncesi kart + canlı maç, bölüm adları
  SCENES.push({
    name: 'e4', d: d(3),
    html: page0(
      shotCard(90, 140, 900, 687, { file: 'vs-k.jpg' }, 'transform:rotate(-2deg);animation:chip .4s 0s both') +
        `<div style="position:absolute;left:0;top:0;width:1080px;height:1920px;animation:rise .5s .55s cubic-bezier(.2,.8,.2,1) both;z-index:5">${cage(760, 1040, 1.4, 0.55, 1.3, 'transform:rotate(1.5deg)', '', `${src}/kafesk`)}</div>` +
        chip('2006 · TESİSATÇI ÇIRAK', 1.3, 70, 1310, false) + chip('2015 · 13 SANİYE', 1.7, 380, 1420, true) +
        sub(1570, [['KAFESE'], ['ÇIK.'], ['TARİHİ'], ['YENİDEN'], ['YAZ.', 1]], 2.0, 0.22, 92),
      VCSS,
    ),
  });
  // 5) Ya öyle olsaydı?
  SCENES.push({
    name: 'e5', d: d(4),
    html: page0(
      `<div style="position:absolute;inset:0;animation:zoomS 4s ease-out both">${phone('bonus.jpg', 230, 710, 620, 'transform:rotate(-2deg)', 1920 / 1080)}</div>` +
        sub(110, [['YA'], ['DA'], ['TARİHİ'], ['DEĞİŞTİR.', 1]], 0.05, 0.27, 108) +
        sub(390, [['RÖVANŞI'], ['BU'], ['KEZ'], ['SEN', 1], ['KAZAN.', 1]], 1.6, 0.25, 108) +
        `<div style="position:absolute;inset:0;background:#fff;opacity:0;animation:flash .6s 1.55s both;z-index:40"></div>`,
      VCSS,
    ),
  });
}

// oyunpov: kapanış da karanlık (krem yok)
const KARANLIK = `.paper{background:radial-gradient(ellipse at 50% 42%,#3a0f14 0%,#0b0a0c 62%)!important}.grain{display:none}body{color:#fff}`;

// Kapanış: krem zemin, logo, mağazalar, düşen konfeti
const END_D = VIDEO === 'efsaneyol' ? 4.5 : VIDEO === 'reklamko' || VIDEO === 'oyunpov' || VIDEO === 'oyunhd' ? 4.6 : VIDEO === 'pediahd' ? 3.6 : 3.8;
SCENES.push({
  name: 'end', d: END_D,
  html: page0(
    `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;${TT ? 'transform:translate(-30px,-190px) scale(.86)' : ''}">
      ${END_KICK ? `<div class="tag" style="font-size:40px;margin-bottom:40px;animation:pop .45s .0s both">${END_KICK}</div>` : ''}
      <img src="${ICON}" style="width:400px;filter:drop-shadow(0 30px 50px rgba(230,57,70,.35));animation:pop .6s .05s both"/>
      <div style="font-size:230px;line-height:1;color:${RED};letter-spacing:26px;transform:skewX(-8deg);margin-top:6px;animation:pop .55s .2s both">YOL</div>
      <div style="font-size:78px;letter-spacing:4px;transform:skewX(-8deg);margin-top:6px;animation:pop .55s .3s both">KAFESTEN KEMERE</div>
      <div style="margin-top:80px;font-size:70px;color:#fff;background:${INK};padding:14px 44px;transform:skewX(-8deg);animation:pop .55s .45s both">${END_TAG}</div>
      <div style="margin-top:34px;font-size:52px;color:${RED};border:5px solid ${RED};border-radius:26px;padding:12px 40px;background:#fff;animation:pop .55s .6s both">ÜCRETSİZ İNDİR</div>
      <div style="margin-top:40px;font-family:In;font-size:32px;letter-spacing:6px;color:#8a7a66;animation:pop .55s .7s both">MMA KARİYER OYUNU</div>
    </div>${CONF.h}`,
    CONF.k + (VIDEO === 'oyunpov' || VIDEO === 'oyunhd' || VIDEO === 'pediahd' ? KARANLIK : ''),
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
const HD = VIDEO === 'oyunhd' || VIDEO === 'pediahd';
const enc = ['-c:v', 'libx264', '-preset', HD ? 'medium' : 'veryfast', '-crf', HD ? '13' : '17', '-pix_fmt', 'yuv420p', '-r', String(FPS)];
for (const sc of process.env.SADECE_KURGU ? [] : SCENES) {
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
    await page.screenshot({ path: `${dir}/${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: HD ? 97 : 92 });
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
const TR = { pas2: 'smoothup', sehir: 'slideleft', mem0: 'fade', evr: 'fade', heykel: 'fade', end: 'circleopen', kose: 'fade', salon: 'slideleft', ogrenci: 'slideleft', vs: 'zoomin', plan: 'slideleft', talimat: 'slideup', zafer: 'fade', sira: 'slideleft', hook2: 'fade', masa: 'slideleft', basin: 'slideleft', face: 'zoomin', not: 'slideleft', kafes: 'fade', kemer: 'fadewhite', son: 'fade', yeni: 'slideleft', kariyer: 'slideup', efsane: 'slideleft', patron: 'slideleft', duvar: 'zoomin', kaydir: 'slideleft' };
const snd = (n) => `${root}/assets/sounds/${n}.wav`;
const audio = [];
const add = (file, startSec, vol = 1, loop = false) => audio.push({ file, startSec, vol, loop });
const cue = (name, off, file, vol = 1) => idx(name) >= 0 && add(file.endsWith('.mp3') ? `${src}/ses/${file.split('/').pop()}` : snd(file), at[idx(name)] + off, vol);
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
} else if (VIDEO === 'menajer') {
  add(snd('giris_trap'), 0, 0.7);
  add(snd('music_hub'), 10, 0.45, true);
  cue('hook', 0.35, 'chime', 0.8);
  cue('hook2', 0.15, 'chime', 0.7);
  cue('hook2', 0.3, 'slam', 0.8);
  cue('masa', 1.0, 'tap', 0.8);
  cue('masa', 1.35, 'cash', 0.6);
  cue('masa', 2.0, 'tap', 0.8);
  cue('masa', 2.2, 'lock', 0.7);
  cue('basin', 0.1, 'flash', 0.6);
  cue('basin', 1.35, 'tap', 0.8);
  cue('basin', 1.5, 'ooh', 0.5);
  cue('face', 0.35, 'slam', 0.7);
  cue('face', 0.1, 'whoosh', 0.5);
  cue('not', 0.15, 'chime', 0.6);
  cue('not', 1.3, 'tap', 0.8);
  cue('kafes', 0.0, 'bell', 0.7);
  cue('kafes', 0.0, 'crowd_loop', 0.35);
  cue('kafes', 0.6, 'punch1', 0.6);
  cue('kafes', 1.3, 'punch3', 0.6);
  cue('kafes', 2.0, 'body', 0.6);
  cue('kemer', 0.3, 'win', 0.8);
  cue('kemer', 0.35, 'roar', 0.6);
  cue('kemer', 1.2, 'cash', 0.7);
  cue('son', 0.5, 'chime', 0.7);
  cue('son', 0.6, 'swell', 0.4);
  cue('yeni', 0.25, 'whoosh', 0.5);
} else if (VIDEO === 'yeni') {
  add(snd('giris_epik'), 0, 0.8);
  add(snd('music_menu'), 7, 0.5, true);
  cue('hook', 0.0, 'whoosh', 0.6);
  cue('hook', 0.3, 'slam', 0.7);
  cue('kariyer', 0.1, 'swell', 0.5);
  cue('kariyer', 0.35, 'heavy', 0.6);
  cue('efsane', 0.05, 'flash', 0.5);
  cue('efsane', 0.3, 'chime', 0.5);
  cue('patron', 0.1, 'slam', 0.6);
  for (let i = 0; i < 4; i++) cue('patron', 0.55 + i * 0.15, 'tap', 0.4);
  for (let k = 0; k < 8; k++) cue('duvar', 0.25 + k * 0.12, 'click', 0.45);
  cue('duvar', 0.05, 'whoosh', 0.5);
  cue('kaydir', 0.2, 'whoosh', 0.5);
  cue('kaydir', 1.6, 'whoosh', 0.4);
} else if (VIDEO === 'pediahd') {
  add(snd('music_hub'), 0, 0.2, true);
  add(snd('giris_epik'), 0, 0.0);
  ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'end'].forEach((n, i) => cue(n, i === 0 ? 0.05 : 0.12, `${VO_DOSYA}${i + 1}.mp3`, 1.55));
  cue('q1', 0.0, 'heavy', 0.5);
  cue('q2', 0.0, 'punch3', 0.7);
  cue('q2', 0.05, 'roar', 0.4);
  cue('q2', 1.6, 'fanfare', 0.35);
  cue('q3', 0.0, 'whoosh', 0.45);
  cue('q3', 0.35, 'tap', 0.5);
  cue('q4', 0.0, 'whoosh', 0.45);
  cue('q4', 0.3, 'slam', 0.45);
  cue('q4', 0.85, 'chime', 0.35);
  cue('q5', 0.0, 'whoosh', 0.45);
  cue('q5', 0.3, 'slam', 0.45);
  cue('q5', 1.3, 'roar', 0.5);
  cue('q6', 0.1, 'tap', 0.4);
  cue('q6', 0.65, 'tap', 0.4);
  cue('q6', 1.3, 'tap', 0.4);
} else if (VIDEO === 'reklamko' || VIDEO === 'oyunpov' || VIDEO === 'oyunhd') {
  add(snd('giris_rock'), 0, 0.3);
  add(snd('music_hub'), 8, 0.2, true);
  add(snd('crowd_loop'), 0, 0.16);
  const P = VIDEO === 'oyunpov' || VIDEO === 'oyunhd' ? 'p' : 'a';
  [`${P}1`, `${P}2`, `${P}3`, `${P}4`, `${P}5`, 'end'].forEach((n, i) => cue(n, i === 0 ? 0.05 : 0.12, `${VO_DOSYA}${i + 1}.mp3`, 1.55));
  cue(`${P}1`, 0.88, 'punch3', 0.8);
  cue(`${P}1`, 0.9, 'heavy', 0.7);
  cue(`${P}1`, 1.2, 'roar', 0.6);
  cue(`${P}1`, 1.9, 'slam', 0.5);
  cue(`${P}2`, 0.05, 'fanfare', 0.3);
  cue(`${P}2`, 1.45, 'whoosh', 0.45);
  cue(`${P}3`, 0.1, 'punch1', 0.45);
  cue(`${P}3`, 0.55, 'punch2', 0.45);
  cue(`${P}3`, 1.1, 'slam', 0.4);
  cue(`${P}3`, 2.0, 'bell', 0.55);
  cue(`${P}4`, 1.6, 'tap', 0.6);
  cue(`${P}5`, 0.1, 'cash', 0.5);
  cue(`${P}5`, 1.45, 'slam', 0.4);
} else if (VIDEO === 'efsaneyol') {
  add(snd('giris_epik'), 0, 0.3);
  add(snd('music_menu'), 8, 0.2, true);
  add(snd('crowd_loop'), 0, 0.1);
  ['e1', 'e2', 'e3', 'e4', 'e5', 'end'].forEach((n, i) => cue(n, 0.12, `${VO_DOSYA}${i + 1}.mp3`, 1.5));
  cue('e1', 0.0, 'whoosh', 0.45);
  cue('e2', 0.05, 'swell', 0.4);
  cue('e2', 0.9, 'roar', 0.35);
  cue('e3', 0.1, 'tap', 0.5);
  cue('e3', 1.5, 'slam', 0.4);
  cue('e4', 0.05, 'bell', 0.55);
  cue('e4', 1.3, 'punch1', 0.45);
  cue('e4', 1.7, 'punch3', 0.45);
  cue('e4', 2.6, 'body', 0.4);
  cue('e5', 0.05, 'whoosh', 0.45);
  cue('e5', 1.55, 'flash', 0.45);
  cue('e5', 1.6, 'fanfare', 0.35);
} else if (VIDEO === 'viral' || VIDEO === 'tiktok') {
  // Müzik sesin altında kısık; seslendirme her sahnenin başında
  add(snd('giris_rock'), 0, 0.32);
  add(snd('music_hub'), 8, 0.22, true);
  add(snd('crowd_loop'), 0, 0.12);
  ['v1', 'v2', 'v3', 'v4', 'v5', 'end'].forEach((n, i) => cue(n, 0.12, `${VO_DOSYA}${i + 1}.mp3`, 1.5));
  cue('v1', 0.0, 'heavy', 0.5);
  cue('v2', 0.3, 'punch1', 0.5);
  cue('v2', 0.8, 'punch3', 0.5);
  cue('v2', 1.4, 'slam', 0.45);
  cue('v3', 0.05, 'bell', 0.6);
  cue('v3', 1.6, 'body', 0.5);
  cue('v4', 0.1, 'cash', 0.5);
  cue('v4', 1.65, 'slam', 0.45);
  cue('v5', 1.5, 'roar', 0.55);
  cue('v5', 1.55, 'fanfare', 0.4);
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
cue('end', 0.15, 'bell', VO.length ? 0.4 : 0.85);
cue('end', 0.35, 'applause', VO.length ? 0.3 : 0.55);
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
fc += `;${audio.map((_, i) => `[a${i}]`).join('')}amix=inputs=${audio.length}:duration=longest:normalize=0,afade=t=out:st=${(total - (VO.length ? 0.4 : 1)).toFixed(2)}:d=${VO.length ? 0.4 : 1},alimiter=limit=0.95[aout]`;
writeFileSync(`${tmp}/filtre.txt`, fc);
const out = `${root}/store/video/reklam-${VIDEO}.mp4`;
const r = spawnSync(FF, [...args, '-filter_complex_script', `${tmp}/filtre.txt`, '-map', '[vout]', '-map', '[aout]', '-t', total.toFixed(2), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', HD ? 'slow' : 'medium', '-crf', HD ? '15' : '19', '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', `${out}.tmp.mp4`], { encoding: 'utf8' });
if (r.status !== 0) throw new Error('ffmpeg: ' + (r.stderr ?? '').split('\n').slice(-8).join(' | '));
execFileSync('mv', [`${out}.tmp.mp4`, out]);
console.log('✅', out, total.toFixed(1), 'sn');
