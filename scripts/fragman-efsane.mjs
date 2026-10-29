// Efsane Yolları tanıtım fragmanı (dikey 1080×1920, ~30 sn) — Conor McGrath hikâyesi.
// İlk 3,4 saniye kanca: hiçbir siyah kart yok, video doğrudan dövüşün ortasında açılır, yazı ilk karede ekranda.
// Önce: CI=1 npm run build:web  ve  npx serve dist -s -l 8088
// Çalıştırma: node scripts/fragman-efsane.mjs [ffmpeg] [chrome]
// Çıktı: store/video/fragman-efsane.mp4
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const FF = process.argv[2] ?? 'ffmpeg';
const CHROME = process.argv[3] ?? (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome');
const ONLY_EDIT = process.argv.includes('--kurgu'); // kayıtlar hazırsa yalnızca kurguyu yeniden yap
const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = `${root}/store/video/fragman-parca-efsane`;
if (!ONLY_EDIT) rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

// [ad, tür, başlık, alt başlık, süre, kaynak kayıt (yoksa ad), başlangıç sn (yoksa otomatik), kanca (yazı ilk karede)]
const SCENES = [
  // ---- KANCA (0–3,4 sn): ilk kare yumruk, ikinci sahne adın anons edildiği an ----
  ['h1', 'kayit', '13 SANİYEDE BİTTİ.', '', 1.5, 'fight', 0.5, true],
  ['h2', 'kayit', 'ŞİMDİ O SENSİN.', 'CONOR McGRATH · "THE INFAMOUS"', 2.2, 'walk', null, true],
  // ---- Hikâye ----
  ['b1', 'kayit', 'DUBLİN, 2006', 'TESİSATÇI ÇIRAĞI', 2.4],
  ['b4', 'kayit', 'HAFTADA 188 EURO', 'İŞSİZLİK KUYRUĞUNDAN KAFESE', 2.4],
  ['f2', 'kayit', 'SOL ELİN KONUŞSUN', 'CANLI DÖVÜŞ · GERÇEK ZAMANLI', 2.2, 'fight', 2.2],
  ['b6', 'kayit', '13 SANİYE', 'ŞAMPİYONU İLK RAUNTTA DEVİR', 2.4],
  ['b7', 'kayit', 'ÇİFTE ŞAMPİYON', 'İKİ KEMER, İKİ OMUZ', 2.3],
  ['b8', 'kayit', 'ASRIN BOKS MAÇI', "49-0'LIK EFSANEYE KARŞI", 2.4],
  ['c1', 'kart', '9 BÖLÜM. 27 YILDIZ.', '', 1.4],
  ['c2', 'kart', 'HİKÂYEYİ SEN YAZ.', '', 1.7],
  ['belt', 'kayit', 'TARİHE GEÇ', 'EFSANE YOLLARI · YENİ MOD', 3.0],
];
const END_SEC = 3.6;
const END_TXT = ['EFSANE YOLLARI', 'ŞİMDİ ÜCRETSİZ OYNA'];

const VW = 540;
const VH = 960;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const up = (s) => s.toLocaleUpperCase('tr');
const segs = existsSync(`${tmp}/segs.json`) && ONLY_EDIT ? JSON.parse(readFileSync(`${tmp}/segs.json`, 'utf8')) : {};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();

if (!ONLY_EDIT) {
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument(() => {
    if (sessionStorage.getItem('hazir')) return;
    sessionStorage.setItem('hazir', '1');
    localStorage.clear();
    localStorage.setItem('yol_dil', 'tr');
    localStorage.setItem('yol_spiker', '0');
    localStorage.setItem('yol_ipucu', '0');
    localStorage.setItem('yol_canli_rehber', '1');
    localStorage.setItem('yol_satinalim', JSON.stringify(['paket_altin']));
    localStorage.setItem('yol_kozmetik', JSON.stringify({ equip: { sort: 'sort_kral', eldiven: 'eld_altin', cerceve: 'cer_altin', kemer: 'kem_altin', giris: 'gir_epik' }, acik: ['sort_kral'], yeni: [] }));
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const buttons = () => page.$$eval('[tabindex="0"]', (els) => els.map((e) => e.innerText.trim()));
  const body = () => page.$eval('body', (b) => b.innerText);
  const click = async (k) => {
    const b = await buttons();
    const i = b.findIndex((x) => up(x).includes(up(k)));
    if (i < 0) return false;
    await (await page.$$('[tabindex="0"]'))[i].click();
    await sleep(220);
    return true;
  };
  const KEY = 'yol_kariyer_v1';
  const edit = async (code) => {
    await page.evaluate((KEY, code) => {
      const s = JSON.parse(localStorage.getItem(KEY));
      new Function('s', code)(s);
      localStorage.setItem(KEY, JSON.stringify(s));
    }, KEY, code);
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(800);
    await click('DEVAM ET');
    await sleep(700);
  };
  const pressLive = async (label) => {
    const box = await page.evaluate((label) => {
      const el = [...document.querySelectorAll('div')].filter((d) => d.innerText?.trim() === label).pop();
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, up(label));
    if (!box) return;
    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    await sleep(40);
    await page.mouse.up();
  };
  // Kayıt: ekran akışından zaman damgalı kareler → sabit 30 fps video
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
      d.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;pointer-events:none;z-index:99999;animation:kayitNabiz 0.5s linear infinite';
      const st = document.createElement('style');
      st.id = 'kayit-nabiz-css';
      st.textContent = '@keyframes kayitNabiz{from{background:#010101}to{background:#020202}}';
      document.head.appendChild(st);
      document.body.appendChild(d);
    });
    const t0 = Date.now();
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: VW * 2, maxHeight: VH * 2, everyNthFrame: 1 });
    const marks = (await fn(() => (Date.now() - t0) / 1000)) ?? {};
    const tEnd = Date.now() / 1000;
    await cdp.send('Page.stopScreencast').catch(() => undefined);
    await page.evaluate(() => ['kayit-nabiz', 'kayit-nabiz-css'].forEach((id) => document.getElementById(id)?.remove())).catch(() => undefined);
    await cdp.detach().catch(() => undefined);
    if (!frames.length) throw new Error(`${name}: kare gelmedi`);
    const shift = frames[0].t - t0 / 1000;
    for (const k of Object.keys(marks)) if (marks[k] != null) marks[k] = Math.max(0, marks[k] - shift);
    const dir = `${tmp}/${name}-kare`;
    mkdirSync(dir, { recursive: true });
    let list = '';
    frames.forEach((f, i) => {
      const file = `${dir}/${String(i).padStart(5, '0')}.jpg`;
      writeFileSync(file, Buffer.from(f.data, 'base64'));
      const d = (i + 1 < frames.length ? frames[i + 1].t : tEnd) - f.t;
      list += `file '${file.replace(/'/g, "'\\''")}'\nduration ${Math.max(0.001, d).toFixed(4)}\n`;
    });
    list += `file '${`${dir}/${String(frames.length - 1).padStart(5, '0')}.jpg`.replace(/'/g, "'\\''")}'\n`;
    writeFileSync(`${dir}/liste.txt`, list);
    execFileSync(FF, ['-y', '-f', 'concat', '-safe', '0', '-i', `${dir}/liste.txt`, '-vf', `fps=30,scale=${VW * 2}:${VH * 2}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', `${tmp}/${name}.mp4`], { stdio: 'ignore' });
    rmSync(dir, { recursive: true, force: true });
    segs[name] = { marks };
    console.log('🎬', name, ((Date.now() - t0) / 1000).toFixed(1), 'sn', frames.length, 'kare', JSON.stringify(marks));
  };

  // ---------- 1) Efsane Yolları'ndan Conor McGrath hikâyesini başlat ----------
  await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
  await sleep(1000);
  await click('EFSANE YOLLARI');
  await sleep(700);
  await click('ÜCRETSİZ');
  await sleep(700);
  await click('HİKÂYEYİ BAŞLAT');
  await sleep(1200);
  const BASE = await page.evaluate((KEY) => localStorage.getItem(KEY), KEY);
  await click('BAŞLA'); // bölüm girişini kapat
  await sleep(500);
  await edit("s.ipuclari = ['hub','gelisim','rakip','kamp','plan','yuzyuze','dovus','macSonrasi'];");

  // ---------- 2) İlk maç: kamp kendiliğinden akar, dövüş gecesi, kafese yürüyüş, canlı dövüş ----------
  const PRI = ['DÖVÜŞ AYARLA', 'Bu rakibi seç', 'Hocanın planıyla başla', 'KAMPA BAŞLA', 'Birkaç gün dinlen', 'Ekstra seansı ekle', 'Diyete şimdi başla', 'Ertesi gün sen de sert gir', 'Birlikte koş', 'Dinle', 'Kapı orada', 'Kardeşim benim 🤝', 'Devam', 'Son 48 saat: kilonu ver', 'Ter kıyafetiyle koşu', 'Tartıya çık', 'Yüz yüze gel', 'Soğukkanlı bak', 'Dövüş gecesi'];
  const firstChoice = async () => {
    const b = await buttons();
    const i = b.findIndex((x) => x.split('\n').length >= 2 && !/ANA MENÜ|HAFTANIN SEANSI|DOLAP|GÜNÜN|SIRADAKİ/.test(up(x)));
    if (i < 0) return false;
    await (await page.$$('[tabindex="0"]'))[i].click();
    await sleep(300);
    return true;
  };
  for (let i = 0; i < 160; i++) {
    const b = await buttons();
    const has = (k) => b.some((x) => up(x).includes(up(k)));
    if (has('KAFESE YÜRÜ')) break;
    if (has('Atla, kamp aksın')) { await click('Atla, kamp aksın'); continue; }
    if (has('Hızlandır')) { await click('Hızlandır'); continue; }
    if (has('Dövüş gecesi')) await edit(`Object.keys(s.fighter.stats).forEach((k) => (s.fighter.stats[k] = 92)); const r = s.pending.rakip; if (r) { r.stil = "boks"; Object.keys(r.stats).forEach((k) => (r.stats[k] = 25)); }`);
    let ok = false;
    for (const p of PRI) if (await click(p)) { ok = true; break; }
    if (ok) continue;
    const st = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY))?.pending?.kamp?.step, KEY);
    if (!(['focus', 'plan', 'intensity'].includes(st) && (await firstChoice()))) await sleep(400);
  }
  await sleep(2500);
  await rec('walk', async (now) => {
    await sleep(700);
    await click('KAFESE YÜRÜ');
    let ann = null;
    for (let i = 0; i < 140; i++) {
      const txt = up(await body());
      // Önce rakip anons edilir; kanca için Conor'un adının okunduğu an gerekir
      if (!ann && /KIRMIZI KÖŞEDE/.test(txt)) ann = now();
      if (ann && now() - ann > 3.0) break;
      await sleep(150);
    }
    return { ann };
  });
  await page.mouse.click(VW / 2, VH / 2);
  for (let i = 0; i < 30 && !(await body()).includes('CANLI DÖVÜŞ'); i++) await sleep(300);
  await click('Baskı kur');
  await sleep(2000);
  await rec('fight', async () => {
    for (const k of ['DİREKT', 'DİREKT', 'JAB', 'DİREKT', 'TEKME', 'DİREKT', 'JAB', 'DİREKT', 'DİREKT', 'TEKME', 'DİREKT', 'JAB', 'DİREKT', 'DİREKT']) {
      await pressLive(k);
      await sleep(300);
    }
  });

  // ---------- 3) Bölüm girişleri: hikâyenin dönüm noktaları ----------
  const showChapter = async (name, n, extra = '') => {
    await page.evaluate((BASE, n, extra, KEY) => {
      const s = JSON.parse(BASE);
      s.ipuclari = ['hub', 'gelisim', 'rakip', 'kamp', 'plan', 'yuzyuze', 'dovus', 'macSonrasi'];
      s.phase = 'hub';
      const ids = ['cirak', 'ders', 'ikikemer', 'ucc', 'tur', 'onucsaniye', 'cifte', 'parabovusu', 'imparatorluk'];
      s.efsane = { id: 'kral', bolum: n, giris: n, yildiz: Object.fromEntries(ids.slice(0, n).map((id) => [id, [0, 1, 2]])) };
      new Function('s', extra)(s);
      localStorage.setItem(KEY, JSON.stringify(s));
    }, BASE, n, extra, KEY);
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(700);
    await click('DEVAM ET');
    await sleep(250);
    await rec(name, async () => {
      await sleep(2900);
    });
  };
  const pro = (g, ko, para, pop, extra = '') =>
    `s.stage = 'ufc'; s.rekor = { g: ${g}, m: 2, b: 0, ko: ${ko}, sub: 1, karar: ${g - ko - 1} }; s.amator = { g: 8, m: 0, b: 0, ko: 6, sub: 1, karar: 1 }; s.para = ${para}; s.populerlik = ${pop}; s.rank = 3; ${extra}`;
  await showChapter('b1', 0);
  await showChapter('b4', 3, "s.stage = 'bolgesel'; s.rekor = { g: 12, m: 2, b: 0, ko: 9, sub: 1, karar: 2 }; s.amator = { g: 8, m: 0, b: 0, ko: 6, sub: 1, karar: 1 }; s.para = 188; s.populerlik = 40; s.fighter.yas = 24;");
  await showChapter('b6', 5, pro(17, 14, 2_400_000, 78, 's.fighter.yas = 27;'));
  await showChapter('b7', 6, pro(19, 16, 5_800_000, 88, 's.fighter.yas = 28;'));
  await showChapter('b8', 7, pro(21, 18, 14_000_000, 96, 's.fighter.yas = 29;'));

  // ---------- 4) Kemer kutlaması ----------
  await page.evaluate((BASE, KEY) => {
    const s = JSON.parse(BASE);
    s.ipuclari = ['hub', 'gelisim', 'rakip', 'kamp', 'plan', 'yuzyuze', 'dovus', 'macSonrasi'];
    s.stage = 'ufc';
    s.rekor = { g: 19, m: 2, b: 0, ko: 16, sub: 1, karar: 2 };
    s.phase = 'kutlama';
    s.pending = {};
    s.kutlama = { tur: 'kemer', org: 'ufc', siklet: s.fighter.siklet };
    s.efsane = { ...(s.efsane ?? {}), id: 'kral', bolum: 6, giris: undefined };
    localStorage.setItem(KEY, JSON.stringify(s));
  }, BASE, KEY);
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(600);
  await click('DEVAM ET');
  await sleep(150);
  await rec('belt', async () => sleep(3600));
  if (errors.length) console.log('Sayfa hataları:', errors);
  writeFileSync(`${tmp}/segs.json`, JSON.stringify(segs));
}

// ---------- Şablonlar ----------
const b64 = (p) => readFileSync(`${root}/${p}`).toString('base64');
const OS = b64('node_modules/@expo-google-fonts/oswald/700Bold/Oswald_700Bold.ttf');
const INTER = b64('node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf');
const ICON = b64('assets/splash-icon.png');
const FONTS = `@font-face{font-family:Os;src:url(data:font/ttf;base64,${OS})}@font-face{font-family:In;src:url(data:font/ttf;base64,${INTER})}`;
const GREEN = '#169b62';
const GOLD = '#f2c14e';
const PH = { x: 150, y: 420, w: 780, h: 1386 };
const CSS = `${FONTS}
*{box-sizing:border-box}body{margin:0;width:540px;height:960px;overflow:hidden;background:radial-gradient(120% 70% at 50% 30%,#0d3a24 0%,#07160e 55%,#050506 100%);font-family:Os;color:#fff}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:36px 36px}
.beam{position:absolute;top:0;left:120px;width:300px;height:960px;background:linear-gradient(180deg,rgba(255,227,163,.13),transparent 70%);clip-path:polygon(42% 0,58% 0,100% 100%,0 100%)}
.top{position:absolute;left:0;right:0;top:70px;display:flex;flex-direction:column;align-items:center;gap:10px}
.t{font-size:46px;line-height:50px;background:${GREEN};padding:4px 18px;transform:skewX(-8deg);text-align:center;max-width:94%;box-shadow:0 8px 30px rgba(22,155,98,.5)}
.t.h{font-size:54px;line-height:58px;background:#e63946;box-shadow:0 8px 34px rgba(230,57,70,.55)}
.s{font-size:20px;line-height:24px;color:#111;background:${GOLD};padding:3px 12px;transform:skewX(-8deg);letter-spacing:1px}
.ph{position:absolute;left:${PH.x / 2 - 6}px;top:${PH.y / 2 - 6}px;width:${PH.w / 2 + 12}px;height:${PH.h / 2 + 12}px;border-radius:30px;background:#000;box-shadow:0 0 0 2px #1a3a28,0 20px 60px rgba(0,0,0,.8),0 0 60px rgba(22,155,98,.4)}
.logo{position:absolute;left:18px;top:20px;display:flex;align-items:center;gap:8px;font-size:18px;letter-spacing:3px;color:${GOLD}}.logo img{width:30px}
.badge{position:absolute;right:18px;top:22px;font-size:15px;letter-spacing:2px;color:#111;background:${GOLD};padding:3px 10px;transform:skewX(-8deg)}`;
const shot = async (html, file, transparent = false) => {
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'load' });
  await sleep(150);
  await page.screenshot({ path: file, omitBackground: transparent });
};
for (const [name, tur, t, s, , , , hook] of SCENES) {
  if (tur === 'kart') {
    await shot(`<html><head><style>${CSS}
body{background:#030304}.k{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
.k b{font-size:62px;line-height:66px;letter-spacing:2px;transform:skewX(-8deg);text-align:center;padding:0 30px;text-shadow:0 0 40px rgba(22,155,98,.45)}
.k i{display:block;width:90px;height:5px;background:${GREEN}}</style></head><body><div class="k"><b>${t}</b><i></i></div></body></html>`, `${tmp}/card-${name}.png`);
    continue;
  }
  await shot(`<html><head><style>${CSS}</style></head><body><div class="grid"></div><div class="beam"></div><div class="logo"><img src="data:image/png;base64,${ICON}"/>YOL</div><div class="badge">EFSANE YOLLARI</div><div class="ph"></div></body></html>`, `${tmp}/bg-${name}.png`);
  await shot(`<html><head><style>${CSS} body{background:transparent!important}</style></head><body><div class="top"><div class="t${hook ? ' h' : ''}">${t}</div>${s ? `<div class="s">${s}</div>` : ''}</div></body></html>`, `${tmp}/title-${name}.png`, true);
}
await shot(`<html><head><style>*{margin:0}body{width:540px;height:960px;background:#000}div{position:absolute;left:${PH.x / 2}px;top:${PH.y / 2}px;width:${PH.w / 2}px;height:${PH.h / 2}px;border-radius:24px;background:#fff}</style></head><body><div></div></body></html>`, `${tmp}/mask-full.png`);
await shot(`<html><head><style>${CSS}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.c img{width:210px;filter:drop-shadow(0 0 40px rgba(22,155,98,.7))}.y{font-size:110px;color:#e63946;letter-spacing:14px;transform:skewX(-8deg);line-height:1;margin-top:4px}
.u{font-size:40px;color:#fff;transform:skewX(-8deg);margin-top:6px;letter-spacing:2px}.e{margin-top:34px;font-size:46px;color:#fff;background:${GREEN};padding:4px 22px;transform:skewX(-8deg);letter-spacing:2px}
.p{margin-top:14px;font-size:34px;color:#111;background:${GOLD};padding:5px 20px;transform:skewX(-8deg)}.m{margin-top:22px;font-family:In;font-size:17px;color:#d9dbe0;letter-spacing:2px}
</style></head><body><div class="grid"></div><div class="beam" style="left:120px"></div><div class="c"><img src="data:image/png;base64,${ICON}"/><div class="y">YOL</div><div class="u">KAFESTEN KEMERE</div><div class="e">🇮🇪 ${END_TXT[0]}</div><div class="p">${END_TXT[1]}</div><div class="m">YENİ MOD · İLK HİKÂYE: CONOR McGRATH</div></div></body></html>`, `${tmp}/end.png`);
await browser.close();

// ---------- Kurgu ----------
const dur = (f) => {
  const r = spawnSync(FF, ['-i', f, '-f', 'null', '-'], { encoding: 'utf8' });
  const m = [...(r.stderr ?? '').matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop();
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
};
for (const k of Object.keys(segs)) segs[k].sn = dur(`${tmp}/${k}.mp4`);
const startOf = (name, d) => {
  const sg = segs[name];
  if (name === 'walk') return Math.max(0, (sg.marks.ann ?? sg.sn - 1) + 0.6); // Conor'un girip adının okunduğu an
  return Math.max(0, Math.min(0.5, sg.sn - d));
};
const TB = { y: 110, h: 330 };
const enc = ['-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18'];
const parts = [];
for (const [name, tur, , , d, clip, st, hook] of SCENES) {
  const out = `${tmp}/scene-${name}.mp4`;
  const src = clip ?? name;
  if (tur === 'kart') {
    execFileSync(FF, ['-y', '-loop', '1', '-t', String(d), '-i', `${tmp}/card-${name}.png`, '-filter_complex', `[0:v]scale=1080:1920,scale=w='trunc(1080*(1.06+0.06*t/${d})/2)*2':h=-2:eval=frame,crop=1080:1920,format=yuv420p[v]`, '-map', '[v]', '-t', String(d), ...enc, out], { stdio: 'ignore' });
  } else {
    const ss = Math.min(st != null ? st : startOf(src, d), Math.max(0, segs[src].sn - d));
    // Kanca sahnelerinde yazı ilk karede tam boyda; diğerlerinde 0,28 sn'de "pop" ile gelir
    const POP_AT = hook ? 0 : 0.28;
    const POP = hook
      ? `if(lt(t,0.12),1.18-0.18*t/0.12,1)`
      : `if(lt(t,${POP_AT}),0.5,if(lt(t,${POP_AT + 0.13}),0.5+0.65*(t-${POP_AT})/0.13,if(lt(t,${POP_AT + 0.24}),1.15-0.15*(t-${POP_AT + 0.13})/0.11,1)))`;
    // Kancada telefon çerçevesi hafif sarsılır (darbe hissi)
    const shake = hook ? `,crop=1080:1920:'(iw-1080)/2+10*sin(t*55)*max(0,1-t/0.5)':'(ih-1920)/2+8*cos(t*47)*max(0,1-t/0.5)'` : ',crop=1080:1920';
    execFileSync(FF, [
      '-y', '-loop', '1', '-t', String(d), '-i', `${tmp}/bg-${name}.png`,
      '-ss', ss.toFixed(2), '-t', String(d), '-i', `${tmp}/${src}.mp4`,
      '-loop', '1', '-t', String(d), '-i', `${tmp}/mask-full.png`,
      '-loop', '1', '-t', String(d), '-i', `${tmp}/title-${name}.png`,
      '-filter_complex',
      `[1:v]fps=30,scale=${PH.w}:${PH.h}:flags=lanczos,setsar=1,pad=1080:1920:${PH.x}:${PH.y}:black,format=rgba[ph];[2:v]scale=1080:1920,format=gray[mk];[ph][mk]alphamerge[phm];[0:v]scale=1080:1920,format=rgba[bg];[bg][phm]overlay=0:0:shortest=1[base];` +
        `[3:v]scale=1080:1920,format=rgba,crop=1080:${TB.h}:0:${TB.y},scale=w='trunc(1080*(${POP})/2)*2':h=-2:eval=frame[tt];` +
        `[base][tt]overlay=x='(W-w)/2':y='${TB.y}+(${TB.h}-h)/2':eval=frame:enable='gte(t,${POP_AT})',` +
        `scale=w='trunc(1080*(1.04+0.035*t/${d})/2)*2':h=-2:eval=frame${shake},format=yuv420p[v]`,
      '-map', '[v]', '-t', String(d), ...enc, out,
    ], { stdio: 'ignore' });
  }
  parts.push(out);
}
const endOut = `${tmp}/scene-end.mp4`;
execFileSync(FF, ['-y', '-loop', '1', '-t', String(END_SEC), '-i', `${tmp}/end.png`, '-filter_complex', `[0:v]scale=1080:1920,scale=w='trunc(1080*(1+0.05*t/${END_SEC})/2)*2':h=-2:eval=frame,crop=1080:1920,format=yuv420p[v]`, '-map', '[v]', ...enc, endOut], { stdio: 'ignore' });
parts.push(endOut);

// Geçişler: kanca içinde sert kesme yerine çok kısa itme, kartlara karartma, kapanışa daire açılımı
const all = [...SCENES, ['end', 'son', '', '', END_SEC]];
const xf = (k) => (k <= 2 ? 0.12 : 0.26);
const trans = (k) => {
  const a = all[k - 1][1];
  const b = all[k][1];
  if (b === 'son') return 'circleopen';
  if (a === 'kart' || b === 'kart') return 'fadeblack';
  if (k <= 2) return 'slideleft';
  return ['slideleft', 'slideup', 'slideright', 'slidedown'][k % 4];
};
const at = [];
let t = 0;
all.forEach(([, , , , d], i) => {
  at.push(t);
  t += d - (i < all.length - 1 ? xf(i + 1) : 0);
});
const total = t;
const idx = (n) => all.findIndex((s) => s[0] === n);
const snd = (n) => `${root}/assets/sounds/${n}.wav`;
const audio = [];
const add = (file, startSec, vol = 1, loop = false) => audio.push({ file, startSec, vol, loop });
const cue = (name, off, file, vol = 1) => idx(name) >= 0 && add(snd(file), at[idx(name)] + off, vol);
// Kanca: ilk karede darbe + yumruklar + seyirci; anons anında kükreme
add(snd('heavy'), 0, 1);
add(snd('crowd_loop'), 0, 0.35, true);
[0.0, 0.3, 0.62, 0.95, 1.25].forEach((x, i) => cue('h1', x, ['punch2', 'punch1', 'punch3'][i % 3], 0.9));
cue('h2', 0.0, 'slam', 0.8);
cue('h2', 0.25, 'roar', 0.75);
add(snd('giris_epik'), at[idx('h2')], 0.85);
add(snd('music_menu'), at[idx('b4')] + 1.0, 0.6, true);
for (let i = 3; i < all.length; i++) if (all[i][1] === 'kayit' && all[i - 1][1] === 'kayit') add(snd('whoosh'), at[i] - 0.02, 0.5);
cue('b1', 0.3, 'tap', 0.5);
cue('b4', 0.4, 'cash', 0.5);
[0.25, 0.6, 0.95, 1.3, 1.65].forEach((x, i) => cue('f2', x, ['punch1', 'punch3', 'punch2'][i % 3], 0.75));
cue('b6', 0.3, 'bell2', 0.8);
cue('b7', 0.3, 'fanfare', 0.5);
cue('b8', 0.3, 'bell', 0.7);
cue('c1', 0.05, 'slam', 0.9);
cue('c2', 0.05, 'heavy', 1);
cue('belt', 0, 'fanfare', 0.85);
cue('belt', 0.5, 'applause', 0.7);
cue('end', 0.15, 'bell', 0.9);
const args = ['-y'];
parts.forEach((p) => args.push('-i', p));
audio.forEach((a) => args.push(...(a.loop ? ['-stream_loop', '-1'] : []), '-i', a.file));
const NV = parts.length;
const vprep = parts.map((_, i) => `[${i}:v]settb=AVTB,fps=30,format=yuv420p,setsar=1[s${i}]`).join(';');
let vchain = '';
let prev = 's0';
for (let k = 1; k < NV; k++) {
  const tag = k === NV - 1 ? 'vout' : `x${k}`;
  vchain += `;[${prev}][s${k}]xfade=transition=${trans(k)}:duration=${xf(k)}:offset=${at[k].toFixed(3)}[${tag}]`;
  prev = tag;
}
const duck0 = at[idx('c1')];
const duck1 = at[idx('belt')];
const duck = `volume='if(between(t,${duck0.toFixed(2)},${duck1.toFixed(2)}),0.15,1)':eval=frame`;
const af = audio
  .map((a, i) => {
    const ms = Math.round(a.startSec * 1000);
    const bed = a.loop || a.file.endsWith('giris_epik.wav');
    return `[${NV + i}:a]aresample=44100,aformat=channel_layouts=stereo,volume=${a.vol},adelay=${ms}|${ms}${bed ? `,${duck}` : ''}[a${i}]`;
  })
  .join(';');
const mix = `${audio.map((_, i) => `[a${i}]`).join('')}amix=inputs=${audio.length}:duration=longest:normalize=0,afade=t=out:st=${(total - 1).toFixed(2)}:d=1,alimiter=limit=0.95[aout]`;
const out = `${root}/store/video/fragman-efsane.mp4`;
writeFileSync(`${tmp}/filtre.txt`, `${vprep}${vchain};${af};${mix}`);
const r = spawnSync(FF, [...args, '-filter_complex_script', `${tmp}/filtre.txt`, '-map', '[vout]', '-map', '[aout]', '-t', total.toFixed(2), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '19', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { encoding: 'utf8' });
if (r.status !== 0) throw new Error('ffmpeg: ' + (r.stderr ?? '').split(String.fromCharCode(10)).slice(-8).join(' | '));
console.log('✅', out, `${total.toFixed(1)} sn`);
