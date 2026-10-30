// Efsane Yolları fragmanı v2 — Conor McGrath (dikey 1080×1920, ~21 sn, Reels/TikTok/Shorts).
// Kurgu "merak boşluğu" üzerine: 0–3,2 sn zıtlık kancası (haftada 188 euro → masada 100 milyon dolar), 3,2 sn "NASIL MI?",
// sonra hızlı kesimlerle hikâye ve açık uçlu soru ("Kabul eder misin?") + kapanış.
// Oyun telefon çerçevesi olmadan, yakın çekim: ilgili bölge büyütülür, arkada aynı görüntünün bulanık hâli.
// Önce: CI=1 npm run build:web  ve  npx serve dist -s -l 8088
// Çalıştırma: node scripts/fragman-efsane-v2.mjs [ffmpeg] [chrome] [--kurgu]
// Çıktı: store/video/fragman-efsane-v2.mp4
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const args0 = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const FF = args0[0] ?? 'ffmpeg';
const CHROME = args0[1] ?? (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome');
const ONLY_EDIT = process.argv.includes('--kurgu');
const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = `${root}/store/video/fragman-parca-efsane-v2`;
if (!ONLY_EDIT) rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const VW = 540;
const VH = 960;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const up = (s) => s.toLocaleUpperCase('tr');
const segs = ONLY_EDIT && existsSync(`${tmp}/segs.json`) ? JSON.parse(readFileSync(`${tmp}/segs.json`, 'utf8')) : {};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

// =====================================================================================
// 1) KAYIT
// =====================================================================================
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
  const TIPS = "s.ipuclari = ['hub','gelisim','rakip','kamp','plan','yuzyuze','dovus','macSonrasi'];";
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
    if (!box) return false;
    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    await sleep(40);
    await page.mouse.up();
    return true;
  };
  // Ekran akışından zaman damgalı kareler → sabit 30 fps video. Görünmez nabız, sayfa durgunken de kare gelmesini sağlar.
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

  // ---- Efsane Yolları → Conor McGrath ----
  await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
  await sleep(1000);
  await click('EFSANE YOLLARI');
  await sleep(700);
  await click('ÜCRETSİZ');
  await sleep(700);
  await click('HİKÂYEYİ BAŞLAT');
  await sleep(1200);
  const BASE = await page.evaluate((KEY) => localStorage.getItem(KEY), KEY);
  await click('BAŞLA');
  await sleep(500);
  await edit(TIPS);

  // ---- İlk maç: kamp → kulis ----
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
    if (has('Dövüş gecesi')) await edit(`Object.keys(s.fighter.stats).forEach((k) => (s.fighter.stats[k] = 95)); const r = s.pending.rakip; if (r) { r.stil = "boks"; Object.keys(r.stats).forEach((k) => (r.stats[k] = 22)); }`);
    let ok = false;
    for (const p of PRI) if (await click(p)) { ok = true; break; }
    if (ok) continue;
    const st = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY))?.pending?.kamp?.step, KEY);
    if (!(['focus', 'plan', 'intensity'].includes(st) && (await firstChoice()))) await sleep(400);
  }
  // Rakip yorgun ve hasarlı başlasın: canlı dövüşte birkaç temiz vuruşla sarsılıp nakavt olur
  const hasFight = await page.evaluate((KEY) => !!JSON.parse(localStorage.getItem(KEY))?.pending?.dovus, KEY);
  console.log('kulis: dövüş durumu kayıtlı mı?', hasFight);
  if (hasFight) await edit('s.pending.dovus.oHasar = 74; s.pending.dovus.oKondisyon = 35;');
  await sleep(2000);

  // ---- Kafese yürüyüş ve kırmızı köşe anonsu ----
  await rec('walk', async (now) => {
    await sleep(700);
    await click('KAFESE YÜRÜ');
    let ann = null;
    for (let i = 0; i < 140; i++) {
      if (!ann && /KIRMIZI KÖŞEDE/.test(up(await body()))) ann = now();
      if (ann && now() - ann > 3.2) break;
      await sleep(150);
    }
    return { ann };
  });
  await page.mouse.click(VW / 2, VH / 2);
  for (let i = 0; i < 30 && !(await body()).includes('CANLI DÖVÜŞ'); i++) await sleep(300);
  await click('Baskı kur');
  await sleep(1600);

  // ---- Canlı dövüş: sarsma ve nakavt anı ----
  await rec('ko', async (now) => {
    const m = {};
    const seq = ['DİREKT', 'JAB', 'DİREKT', 'DİREKT', 'TEKME', 'DİREKT', 'JAB', 'DİREKT'];
    const t0 = Date.now();
    let k = 0;
    while (Date.now() - t0 < 30000) {
      const txt = up(await body());
      if (m.sars == null && txt.includes('SARSILDI')) m.sars = now();
      if (m.ko == null && /NAKAVT!|TKO/.test(txt)) m.ko = now();
      if (m.ko != null) {
        if (now() - m.ko > 2.6) break;
        await sleep(120);
        continue;
      }
      await pressLive(seq[k++ % seq.length]);
      await sleep(m.sars != null ? 180 : 280);
    }
    return m;
  });

  // ---- Bölüm girişleri ----
  const IDS = ['cirak', 'ders', 'ikikemer', 'ucc', 'tur', 'onucsaniye', 'cifte', 'parabovusu', 'imparatorluk'];
  const load = async (code) => {
    await page.evaluate((BASE, code, KEY) => {
      const s = JSON.parse(BASE);
      new Function('s', code)(s);
      localStorage.setItem(KEY, JSON.stringify(s));
    }, BASE, `${TIPS} s.phase = 'hub'; ${code}`, KEY);
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(700);
    await click('DEVAM ET');
    await sleep(500);
  };
  const run = (n) => `s.efsane = { id: 'kral', bolum: ${n}, yildiz: ${JSON.stringify(Object.fromEntries(IDS.slice(0, n).map((id) => [id, [0, 1, 2]])))} };`;
  const pro = (g, ko, para, yas) => `s.stage = 'ufc'; s.rank = 1; s.rekor = { g: ${g}, m: 2, b: 0, ko: ${ko}, sub: 1, karar: ${g - ko - 1} }; s.amator = { g: 8, m: 0, b: 0, ko: 6, sub: 1, karar: 1 }; s.para = ${para}; s.populerlik = 96; s.fighter.yas = ${yas};`;
  for (const [name, n, code] of [
    ['b1', 0, ''],
    ['b4', 3, "s.stage = 'bolgesel'; s.rekor = { g: 12, m: 2, b: 0, ko: 9, sub: 1, karar: 2 }; s.para = 188; s.fighter.yas = 24;"],
    ['b6', 5, pro(17, 14, 2_400_000, 27)],
  ]) {
    await load(`${code} ${run(n)} s.efsane.giris = ${n};`);
    await rec(name, async () => sleep(2600));
  }

  // ---- 100 milyon dolarlık boks teklifi ve süper maç ekranı ----
  await load(`${pro(21, 18, 14_000_000, 29)} s.sampiyon = true; ${run(7)} s.boksTeklif = { boksor: { ad: 'Floyd Maywood', lakap: 'Money', rekor: '49-0', guc: 96 }, ucret: 100000000 };`);
  await rec('offer', async () => sleep(3000));
  await rec('vs', async (now) => {
    await sleep(300);
    const kabul = now();
    await click('Kabul et');
    await sleep(2400);
    const plan = now();
    await click('Kombinasyon');
    await sleep(2200);
    return { kabul, plan };
  });

  // ---- Kemer kutlaması ----
  await load(`${pro(19, 16, 5_800_000, 28)} ${run(6)} s.phase = 'kutlama'; s.pending = {}; s.kutlama = { tur: 'kemer', org: 'ufc', siklet: s.fighter.siklet };`);
  await rec('belt', async () => sleep(3600));

  if (errors.length) console.log('Sayfa hataları:', errors);
  writeFileSync(`${tmp}/segs.json`, JSON.stringify(segs));
}

// =====================================================================================
// 2) GRAFİKLER (altyazılar, kartlar, kapanış)
// =====================================================================================
const b64 = (p) => readFileSync(`${root}/${p}`).toString('base64');
const OS = b64('node_modules/@expo-google-fonts/oswald/700Bold/Oswald_700Bold.ttf');
const INTER = b64('node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf');
const ICON = b64('assets/splash-icon.png');
const FONTS = `@font-face{font-family:Os;src:url(data:font/ttf;base64,${OS})}@font-face{font-family:In;src:url(data:font/ttf;base64,${INTER})}`;
const GREEN = '#169b62';
const GOLD = '#f2c14e';
const RED = '#e63946';

// Sahne: [ad, kaynak, başlangıç (sn ya da işaret fonksiyonu), süre, kırpma [x,y,w,h] (540'lık ekranda), altyazı (HTML), seçenekler]
// Altyazıda <em> vurgulu (sarı) kelimedir. Seçenekler: kanca (yazı ilk karede), sars (sarsıntı anları, sahne içi sn), cy (görüntü merkezi)
const CROP = {
  fight: [10, 38, 520, 620],
  walk: [40, 120, 460, 800],
  chapter: [24, 262, 340, 84],
  offer: [26, 314, 490, 66],
  vs: [24, 100, 492, 250],
  belt: [0, 74, 540, 420],
};
const koAt = (m, before) => (m.ko != null ? Math.max(0, m.ko - before) : null);
const SCENES = [
  // ---------- KANCA ----------
  ['h1', 'ko', (m) => Math.max(0, (m.ko ?? 3) - 2.95), 1.55, CROP.fight, 'BU ADAM HAFTADA<br><em>188 EURO</em> İLE YAŞIYORDU', { kanca: true, sars: [0, 0.75] }],
  ['h2', 'offer', 0.2, 1.75, CROP.offer, '4 YIL SONRA MASADA<br><em>100 MİLYON DOLAR</em> VAR', { kanca: true, zoom: 0.12, sayac: true }],
  ['h3', 'kart', null, 0.85, null, 'NASIL MI?', { kanca: true }],
  // ---------- HİKÂYE ----------
  ['s1', 'b1', 0.35, 1.7, CROP.chapter, 'DUBLİN, 2006.<br>BİR <em>TESİSATÇI ÇIRAĞI</em>'],
  ['s2', 'walk', (m) => (m.ann ?? 3) + 0.4, 1.9, CROP.walk, 'BİR GECE ADI<br><em>KAFESTE</em> YANKILANDI'],
  ['s3', 'ko', (m) => koAt(m, 1.0), 2.3, CROP.fight, 'SOL ELİ <em>KONUŞTU.</em>', { sars: [1.0, 1.25] }],
  ['s4', 'b6', 0.35, 1.6, CROP.chapter, 'ŞAMPİYONU<br><em>13 SANİYEDE</em> DEVİRDİ'],
  ['s5', 'belt', 0.3, 1.9, CROP.belt, 'TARİH YAZDI.<br><em>KEMER ONUN.</em>'],
  ['s6', 'vs', (m) => (m.kabul ?? 0.3) + 0.6, 2.0, CROP.vs, 'SONRA KAPIYI ÇALDI:<br><em>49-0</em> BOKS EFSANESİ'],
  ['c1', 'kart', null, 1.2, null, 'KABUL EDER<br>MİSİN?'],
  ['c2', 'kart', null, 1.25, null, 'HİKÂYEYİ<br><em>SEN</em> YAZ.'],
];
const END_SEC = 3.0;

const CSS = `${FONTS}*{box-sizing:border-box;margin:0}body{width:540px;height:960px;overflow:hidden;font-family:Os;color:#fff;background:transparent}`;
const shot = async (html, file, transparent = false) => {
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 });
  await page.setContent(`<html><head><style>${CSS}</style></head><body>${html}</body></html>`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await sleep(120);
  await page.screenshot({ path: file, omitBackground: transparent });
};
// Altyazı bandı: kalın, siyah konturlu, vurgu sarı (TikTok tarzı)
const CAP_BAND = { y: 150, h: 300 }; // 1080'lik tuvalde
for (const [name, src, , , , cap] of SCENES) {
  if (src === 'kart') {
    await shot(`<div style="position:absolute;inset:0;background:#030304;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px">
      <b style="font-size:78px;line-height:84px;letter-spacing:2px;transform:skewX(-8deg);text-align:center;text-shadow:0 0 50px rgba(230,57,70,.45)">${cap.replace(/<em>/g, `<span style="color:${GOLD}">`).replace(/<\/em>/g, '</span>')}</b>
      <i style="display:block;width:110px;height:6px;background:${RED}"></i></div>`, `${tmp}/card-${name}.png`);
    continue;
  }
  await shot(`<div style="position:absolute;left:0;right:0;top:${CAP_BAND.y / 2}px;height:${CAP_BAND.h / 2}px;display:flex;align-items:center;justify-content:center;padding:0 22px">
    <div style="font-size:40px;line-height:48px;text-align:center;letter-spacing:.5px;transform:skewX(-6deg);
      -webkit-text-stroke:7px #000;paint-order:stroke fill;text-shadow:0 4px 0 #000,0 8px 24px rgba(0,0,0,.9)">${cap.replace(/<em>/g, `<span style="color:${GOLD}">`).replace(/<\/em>/g, '</span>')}</div></div>`, `${tmp}/cap-${name}.png`, true);
}
// Üst köşe: logo + mod etiketi (bütün oyun sahnelerinde)
await shot(`<div style="position:absolute;left:18px;top:20px;display:flex;align-items:center;gap:8px;font-size:18px;letter-spacing:3px;color:${GOLD}"><img style="width:30px" src="data:image/png;base64,${ICON}"/>YOL</div>
  <div style="position:absolute;right:18px;top:22px;font-size:15px;letter-spacing:2px;color:#fff;background:${GREEN};padding:3px 10px;transform:skewX(-8deg)">🇮🇪 EFSANE YOLLARI</div>
  <div style="position:absolute;left:0;right:0;top:0;height:330px;background:linear-gradient(180deg,rgba(0,0,0,.75),rgba(0,0,0,.35) 70%,transparent)"></div>`, `${tmp}/chrome.png`, true);
await shot(`<div style="position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 35%,#0d3a24 0%,#07160e 55%,#050506 100%)"></div>
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:36px 36px"></div>
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
    <img style="width:190px;filter:drop-shadow(0 0 40px rgba(22,155,98,.7))" src="data:image/png;base64,${ICON}"/>
    <div style="font-size:108px;color:${RED};letter-spacing:14px;transform:skewX(-8deg);line-height:1;margin-top:4px">YOL</div>
    <div style="font-size:36px;transform:skewX(-8deg);margin-top:6px;letter-spacing:2px">KAFESTEN KEMERE</div>
    <div style="margin-top:34px;font-size:44px;background:${GREEN};padding:4px 22px;transform:skewX(-8deg);letter-spacing:2px">🇮🇪 EFSANE YOLLARI</div>
    <div style="margin-top:12px;font-size:25px;letter-spacing:1px;transform:skewX(-6deg)">CONOR McGRATH'IN HİKÂYESİNİ OYNA</div>
    <div style="margin-top:26px;font-size:38px;color:#111;background:${GOLD};padding:6px 26px;transform:skewX(-8deg)">ÜCRETSİZ İNDİR</div>
  </div>`, `${tmp}/end.png`);
await browser.close();

// =====================================================================================
// 3) KURGU
// =====================================================================================
const dur = (f) => {
  const r = spawnSync(FF, ['-i', f, '-f', 'null', '-'], { encoding: 'utf8' });
  const m = [...(r.stderr ?? '').matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop();
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
};
for (const k of Object.keys(segs)) segs[k].sn = dur(`${tmp}/${k}.mp4`);
const enc = ['-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18'];
const parts = [];
const FG_MAX_H = 1240; // büyütülen görüntünün en fazla yüksekliği (altyazıya yer kalsın)
for (const [name, src, st, d, crop, , o = {}] of SCENES) {
  const out = `${tmp}/scene-${name}.mp4`;
  if (src === 'kart') {
    // Kart: yazı ilk karede, hafif darbe-yakınlaşma
    execFileSync(FF, ['-y', '-loop', '1', '-t', String(d), '-i', `${tmp}/card-${name}.png`, '-filter_complex', `[0:v]scale=1080:1920,scale=w='trunc(1080*(1.10-0.10*min(1,t/0.14)+0.04*t/${d})/2)*2':h=-2:eval=frame,crop=1080:1920,format=yuv420p[v]`, '-map', '[v]', '-t', String(d), ...enc, out], { stdio: 'ignore' });
    parts.push(out);
    continue;
  }
  const sg = segs[src];
  if (!sg) throw new Error(`kayıt yok: ${src}`);
  let ss = typeof st === 'function' ? st(sg.marks ?? {}) : st;
  if (ss == null) ss = 0.3;
  ss = Math.max(0, Math.min(ss, sg.sn - d - 0.05));
  const [cx, cy, cw, ch] = crop.map((v) => v * 2);
  const k = Math.min(1080 / cw, FG_MAX_H / ch);
  const fw = Math.round((cw * k) / 2) * 2;
  const fh = Math.round((ch * k) / 2) * 2;
  // Altyazı ve görüntü tek blok hâlinde dikeyde ortalanır: göz yazıdan doğrudan görüntüye iner
  const extra = o.sayac ? 260 : 0; // görüntünün altındaki para sayacı
  const blockTop = Math.max(120, Math.round((1920 - (CAP_BAND.h + fh + extra)) / 2));
  const capY = blockTop;
  const centerY = o.cy ?? blockTop + CAP_BAND.h + fh / 2;
  const zoom = o.zoom ?? 0.06;
  // Sarsıntı: verilen anlarda 0,35 sn sönümlü titreme
  const sh = (o.sars ?? []).map((a) => `if(between(t,${a},${a + 0.35}),1-(t-${a})/0.35,0)`).join('+') || '0';
  const shakeX = `14*sin(t*61)*(${sh})`;
  const shakeY = `10*cos(t*53)*(${sh})`;
  // Kancada yazı ilk karede tam; diğerlerinde 0,12 sn'de "pop"
  const capIn = o.kanca ? 0 : 0.12;
  const p0 = o.kanca ? 1.07 : 1.18;
  const pop = `if(lt(t,${capIn}),0.01,if(lt(t,${capIn + 0.12}),${p0}-${(p0 - 1).toFixed(2)}*(t-${capIn})/0.12,1))`;
  // Para sayacı: 0'dan 100 milyon dolara 0,75 sn'de sayar (görüntünün hemen altında, büyük ve altın)
  const fontFile = `${root}/node_modules/@expo-google-fonts/oswald/700Bold/Oswald_700Bold.ttf`.replace(/\\/g, '/').replace(/:/g, '\\:');
  const counter = o.sayac
    ? `,drawtext=fontfile='${fontFile}':text='$%{eif\\:min(100,floor(100*min(1,t/0.75)))\\:d}.000.000':fontsize=158:fontcolor=#f2c14e:borderw=9:bordercolor=black:shadowcolor=black@0.6:shadowy=10:x=(w-tw)/2:y=${Math.round(centerY + fh / 2 + 50)}`
    : '';
  const fc =
    `[1:v]fps=30,crop=${cw}:${ch}:${cx}:${cy},setsar=1,split[a][b];` +
    // Arka plan: aynı görüntü ekranı kaplayacak kadar büyütülmüş, bulanık ve karartılmış
    `[a]scale=-2:1920,crop=1080:1920,boxblur=28:2,eq=brightness=-0.22:saturation=1.2[bg];` +
    // Ön plan: yakın çekim, yavaş yakınlaşma
    `[b]scale=w='trunc(${fw}*(1+${zoom}*t/${d})/2)*2':h=-2:eval=frame:flags=lanczos[fg];` +
    `[bg][fg]overlay=x='(W-w)/2+${shakeX}':y='${centerY}-h/2+${shakeY}':eval=frame[base];` +
    `[base][2:v]overlay=0:0[ch];` +
    `[3:v]crop=1080:${CAP_BAND.h}:0:${CAP_BAND.y},scale=w='trunc(1080*(${pop})/2)*2':h=-2:eval=frame[cp];` +
    `[ch][cp]overlay=x='(W-w)/2':y='${capY}+(${CAP_BAND.h}-h)/2':eval=frame:enable='gte(t,${capIn})'${counter},format=yuv420p[v]`;
  execFileSync(FF, [
    '-y', '-f', 'lavfi', '-t', String(d), '-i', 'color=c=black:s=1080x1920:r=30',
    '-ss', ss.toFixed(2), '-t', String(d), '-i', `${tmp}/${src}.mp4`,
    '-loop', '1', '-t', String(d), '-i', `${tmp}/chrome.png`,
    '-loop', '1', '-t', String(d), '-i', `${tmp}/cap-${name}.png`,
    '-filter_complex', fc, '-map', '[v]', '-t', String(d), ...enc, out,
  ], { stdio: 'ignore' });
  console.log('✂️', name, src, `ss=${ss.toFixed(2)}`, `d=${d}`);
  parts.push(out);
}
const endOut = `${tmp}/scene-end.mp4`;
execFileSync(FF, ['-y', '-loop', '1', '-t', String(END_SEC), '-i', `${tmp}/end.png`, '-filter_complex', `[0:v]scale=1080:1920,scale=w='trunc(1080*(1+0.05*t/${END_SEC})/2)*2':h=-2:eval=frame,crop=1080:1920,format=yuv420p[v]`, '-map', '[v]', ...enc, endOut], { stdio: 'ignore' });
parts.push(endOut);

// Geçişler: kancada ve hikâyede sert, hızlı kesimler (çok kısa geçiş); kartlara karartma; kapanışa daire açılımı
const all = [...SCENES, ['end', 'son', null, END_SEC]];
const XF = (k) => (all[k][1] === 'son' ? 0.3 : all[k][1] === 'kart' || all[k - 1][1] === 'kart' ? 0.1 : 0.08);
const trans = (k) => (all[k][1] === 'son' ? 'circleopen' : all[k][1] === 'kart' || all[k - 1][1] === 'kart' ? 'fadeblack' : ['slideleft', 'slideup', 'slideright', 'slidedown'][k % 4]);
const at = [];
let t = 0;
all.forEach(([, , , d], i) => {
  at.push(t);
  t += d - (i < all.length - 1 ? XF(i + 1) : 0);
});
const total = t;
const idx = (n) => all.findIndex((s) => s[0] === n);
const snd = (n) => `${root}/assets/sounds/${n}.wav`;
const audio = [];
const add = (file, startSec, vol = 1, loop = false, bed = false) => audio.push({ file, startSec, vol, loop, bed });
const cue = (name, off, file, vol = 1) => idx(name) >= 0 && add(snd(file), at[idx(name)] + off, vol);
// Kanca: ilk karede darbe, yumruklar, seyirci; 100 milyon dolarda kasa sesi; "NASIL MI?"da sessizliğe yakın ağır darbe
add(snd('heavy'), 0, 1);
add(snd('crowd_loop'), 0, 0.3, true, true);
[0.0, 0.32, 0.75, 1.1].forEach((x, i) => cue('h1', x, ['punch2', 'punch1', 'punch3', 'punch1'][i], 0.95));
[0.08, 0.2, 0.32, 0.44, 0.56, 0.66].forEach((x) => cue('h2', x, 'tap', 0.55));
cue('h2', 0.76, 'cash', 1);
cue('h2', 0.05, 'swell', 0.6);
cue('h3', 0.0, 'slam', 1);
// Hikâye: epik giriş müziği, kesimlerde whoosh, olaylarda efekt
add(snd('giris_epik'), at[idx('s1')], 0.85, false, true);
add(snd('music_menu'), at[idx('s1')] + 7.0, 0.55, true, true);
for (let i = idx('s1') + 1; i < all.length; i++) if (all[i][1] !== 'kart' && all[i][1] !== 'son' && all[i - 1][1] !== 'kart') add(snd('whoosh'), at[i] - 0.02, 0.45);
cue('s2', 0.2, 'roar', 0.55);
[0.15, 0.45, 0.75, 1.0].forEach((x, i) => cue('s3', x, ['punch1', 'punch3', 'punch2', 'heavy'][i], i === 3 ? 1 : 0.8));
cue('s3', 1.15, 'roar', 0.85);
cue('s4', 0.2, 'bell2', 0.8);
cue('s5', 0.0, 'fanfare', 0.75);
cue('s5', 0.4, 'applause', 0.6);
cue('s6', 0.15, 'bell', 0.8);
cue('c1', 0.02, 'slam', 0.95);
cue('c2', 0.02, 'heavy', 1);
cue('end', 0.2, 'bell', 0.9);
cue('end', 0.25, 'applause', 0.5);
const ffArgs = ['-y'];
parts.forEach((p) => ffArgs.push('-i', p));
audio.forEach((a) => ffArgs.push(...(a.loop ? ['-stream_loop', '-1'] : []), '-i', a.file));
const NV = parts.length;
const vprep = parts.map((_, i) => `[${i}:v]settb=AVTB,fps=30,format=yuv420p,setsar=1[s${i}]`).join(';');
let vchain = '';
let prev = 's0';
for (let k = 1; k < NV; k++) {
  const tag = k === NV - 1 ? 'vout' : `x${k}`;
  vchain += `;[${prev}][s${k}]xfade=transition=${trans(k)}:duration=${XF(k)}:offset=${at[k].toFixed(3)}[${tag}]`;
  prev = tag;
}
// Müzik yatağı: "NASIL MI?" ve soru kartlarında kısılır
const dk = [[at[idx('h3')], at[idx('s1')]], [at[idx('c1')], at[idx('end')]]];
const duck = `volume='if(${dk.map(([a, b]) => `between(t,${a.toFixed(2)},${b.toFixed(2)})`).join('+')},0.12,1)':eval=frame`;
const af = audio
  .map((a, i) => {
    const ms = Math.round(a.startSec * 1000);
    return `[${NV + i}:a]aresample=44100,aformat=channel_layouts=stereo,volume=${a.vol},adelay=${ms}|${ms}${a.bed ? `,${duck}` : ''}[a${i}]`;
  })
  .join(';');
const mix = `${audio.map((_, i) => `[a${i}]`).join('')}amix=inputs=${audio.length}:duration=longest:normalize=0,afade=t=out:st=${(total - 0.8).toFixed(2)}:d=0.8,alimiter=limit=0.95[aout]`;
const out = `${root}/store/video/fragman-efsane-v2.mp4`;
writeFileSync(`${tmp}/filtre.txt`, `${vprep}${vchain};${af};${mix}`);
const r = spawnSync(FF, [...ffArgs, '-filter_complex_script', `${tmp}/filtre.txt`, '-map', '[vout]', '-map', '[aout]', '-t', total.toFixed(2), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '19', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { encoding: 'utf8' });
if (r.status !== 0) throw new Error('ffmpeg: ' + (r.stderr ?? '').split(String.fromCharCode(10)).slice(-8).join(' | '));
console.log('✅', out, `${total.toFixed(1)} sn`);
