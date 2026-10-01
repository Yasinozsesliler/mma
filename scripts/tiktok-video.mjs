// TikTok / Reels / Shorts videosu (dikey, ~25 sn, hızlı kesmeler, büyük yazılar, spiker sesi).
// Önce: CI=1 npm run build:web  ve  npx serve dist -s -l 8088
// Spiker sesleri: powershell -ExecutionPolicy Bypass -File scripts/tts-lines.ps1 <ses klasörü>
// Çalıştırma: node scripts/tiktok-video.mjs <ffmpeg.exe> <ses klasörü>
// Çıktı: store/video/tiktok-yakinda.mp4 (yayından önce) ve store/video/tiktok-yayinda.mp4 (yayından sonra)
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const FF = process.argv[2];
const VOX = process.argv[3];
if (!FF || !existsSync(FF)) throw new Error('ffmpeg yolu gerekli');
if (!VOX || !existsSync(`${VOX}/kirmizi.wav`)) throw new Error('spiker ses klasörü gerekli (scripts/tts-lines.ps1)');
const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = `${root}/store/video/tiktok-parca`;
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.evaluateOnNewDocument(() => {
  if (sessionStorage.getItem('hazir')) return;
  sessionStorage.setItem('hazir', '1');
  localStorage.clear();
  localStorage.setItem('yol_dil', 'tr');
  localStorage.setItem('yol_spiker', '0');
  localStorage.setItem('yol_satinalim', JSON.stringify(['paket_altin']));
  localStorage.setItem('yol_kozmetik', JSON.stringify({ equip: { sort: 'sort_altin', eldiven: 'eld_altin', cerceve: 'cer_altin', kemer: 'kem_altin', giris: 'gir_epik' }, acik: [], yeni: [] }));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const up = (s) => s.toLocaleUpperCase('tr');
const buttons = () => page.$$eval('[tabindex="0"]', (els) => els.map((e) => e.innerText.trim()));
const body = () => page.$eval('body', (b) => b.innerText);
async function click(k) {
  const b = await buttons();
  const i = b.findIndex((x) => up(x).includes(up(k)));
  if (i < 0) return false;
  await (await page.$$('[tabindex="0"]'))[i].click();
  await sleep(220);
  return true;
}
const mutate = (code) =>
  page.evaluate((code) => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('yol_kariyer'));
    const s = JSON.parse(localStorage.getItem(key));
    new Function('s', code)(s);
    localStorage.setItem(key, JSON.stringify(s));
  }, code);
const reloadContinue = async () => {
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(800);
  await click('DEVAM ET');
  await sleep(700);
};
const smoothScroll = (px, ms) =>
  page.evaluate(
    (px, ms) =>
      new Promise((res) => {
        const el = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 40 && getComputedStyle(d).overflowY !== 'visible').pop() ?? document.scrollingElement;
        const y0 = el.scrollTop;
        const t0 = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - t0) / ms);
          el.scrollTop = y0 + px * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
          if (k < 1) requestAnimationFrame(step);
          else res();
        };
        requestAnimationFrame(step);
      }),
    px,
    ms,
  );

// ---------- TikTok yazıları (ekranın üst-ortası: TikTok butonları sağda ve altta) ----------
const fontB64 = (f) => readFileSync(`${root}/node_modules/@expo-google-fonts/${f}`).toString('base64');
const OSWALD = fontB64('oswald/700Bold/Oswald_700Bold.ttf');
async function caption(main, sub = '', top = 15) {
  await page.evaluate(
    (main, sub, font, top) => {
      document.getElementById('tt-cap')?.remove();
      if (!document.getElementById('tt-font')) {
        const st = document.createElement('style');
        st.id = 'tt-font';
        st.textContent = `@font-face{font-family:TTOs;src:url(data:font/ttf;base64,${font})}
#tt-cap{position:fixed;left:0;right:0;top:15%;z-index:2147483647;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;animation:ttin .25s ease-out}
#tt-cap .m{font-family:TTOs;font-size:34px;line-height:40px;color:#fff;background:#e63946;padding:6px 16px;transform:skewX(-8deg);text-align:center;max-width:88%;box-shadow:0 6px 24px rgba(0,0,0,.55)}
#tt-cap .s{font-family:TTOs;font-size:22px;line-height:26px;color:#111;background:#f2c14e;padding:4px 12px;transform:skewX(-8deg);text-align:center;max-width:84%}
@keyframes ttin{from{transform:scale(1.25);opacity:0}to{transform:scale(1);opacity:1}}`;
        document.head.appendChild(st);
      }
      const d = document.createElement('div');
      d.id = 'tt-cap';
      d.innerHTML = `<div class="m">${main}</div>${sub ? `<div class="s">${sub}</div>` : ''}`;
      d.style.top = top + '%';
      document.body.appendChild(d);
    },
    main,
    sub,
    OSWALD,
    top,
  );
}
const noCaption = () => page.evaluate(() => document.getElementById('tt-cap')?.remove());

// ---------- Kayıt ----------
const segs = {};
const rec = async (name, fn) => {
  const r = await page.screencast({ path: `${tmp}/${name}.webm`, ffmpegPath: FF, fps: 30 });
  const t0 = Date.now();
  const marks = (await fn(() => (Date.now() - t0) / 1000)) ?? {};
  await r.stop();
  segs[name] = { marks };
  console.log('🎬', name, ((Date.now() - t0) / 1000).toFixed(1), 'sn', JSON.stringify(marks));
};

// Mini oyun botu: halka hedefe oturunca gerçek dokunuş.
const taps = [];
let tapClock = null;
await page.exposeFunction('nodeTap', async () => {
  const el = await page.$('[data-testid="drill-area"]');
  const b = el && (await el.boundingBox());
  if (b) {
    if (tapClock) taps.push(tapClock());
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height - 60);
  }
});

await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
await sleep(900);
await click('YENİ KARİYER');
await sleep(700);
await click('Hemen başla');
await sleep(1500);
await mutate("s.ipuclari = ['hub','gelisim','rakip','kamp','plan','yuzyuze','dovus','macSonrasi']; Object.assign(s.fighter, { ad: 'Kerem', soyad: 'Aslan', lakap: 'Çelik' });");
await reloadContinue();
for (let i = 0; i < 30 && !up(await body()).includes('HAFTANIN SEANSI'); i++) {
  let ok = false;
  for (const p of ['DÖVÜŞ AYARLA', 'Bu rakibi seç', 'Hocanın planıyla başla']) if (await click(p)) { ok = true; break; }
  if (!ok) await sleep(400);
}

// 1) Mini oyun
await click('HAFTANIN SEANSI');
await sleep(500);
await rec('drill', async (now) => {
  tapClock = now;
  await caption('KAMPTA KENDİN ÇALIŞ 🥊', 'ZAMANLAMAN = GELİŞİMİN', 22);
  await click('Başla');
  const start = now();
  await page.evaluate(() => {
    let armed = true;
    const loop = () => {
      const ring = document.querySelector('[data-testid="drill-ring"]');
      if (ring) {
        const m = getComputedStyle(ring).transform.match(/matrix\(([-\d.]+)/);
        const sc = m ? parseFloat(m[1]) : null;
        if (sc != null) {
          if (sc > 2) armed = true;
          if (armed && sc <= 1.03) {
            armed = false;
            window.nodeTap();
          }
        }
      }
      if (!window.__ttStop) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  await sleep(9000);
  return { start };
});
tapClock = null;
await page.evaluate(() => (window.__ttStop = true));
await noCaption();
for (let i = 0; i < 20 && !up(await body()).includes('KAMPA DÖN'); i++) await sleep(500);
await click('Kampa dön');
await sleep(500);

// Kampı bitir, tartı ve yüz yüze
for (let i = 0; i < 30; i++) {
  if ((await buttons()).some((b) => up(b).includes('DÖVÜŞ GECESİ'))) break;
  let ok = false;
  for (const p of ['Tüm kampı simüle et', 'Tartıya çık', 'Yüz yüze gel', 'Soğukkanlı bak']) if (await click(p)) { ok = true; break; }
  if (!ok) await sleep(400);
}
// Güçlü dövüşçü: nakavt garanti olsun diye istatistikler yüksek.
await mutate("s.amator = { g: 9, m: 1, b: 0 }; for (const k in s.fighter.stats) s.fighter.stats[k] = 94;");
await reloadContinue();
for (let i = 0; i < 10; i++) {
  if ((await buttons()).some((b) => up(b).includes('DÖVÜŞ GECESİ'))) break;
  let ok = false;
  for (const p of ['Yüz yüze gel', 'Soğukkanlı bak']) if (await click(p)) { ok = true; break; }
  if (!ok) await sleep(400);
}

// 2) Kafese giriş (kanca)
await rec('walk', async (now) => {
  await click('Dövüş gecesi');
  await sleep(5600);
  const red = now();
  await caption('SOKAKTAN UCC ŞAMPİYONLUĞUNA', 'HER KARAR SENİN 👊');
  await sleep(4400);
  await noCaption();
  return { red };
});
await sleep(1200);

// 3) Dövüş: nakavt + ağır çekim tekrar
await rec('fight', async (now) => {
  let ko = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) {
    const txt = up(await body());
    // Maç bitti: kafeste "KAZANAN" yazısı. Tekrar penceresi ~2,6 sn sonra açılır.
    if (!ko && /KAZANAN:/.test(txt)) {
      ko = now();
      await caption('NAKAVT! 💥', 'AĞIR ÇEKİM TEKRAR');
    }
    if (ko && now() - ko > 7) break;
    if (!ko) {
      let ok = false;
      for (const p of ['Baskı kur', 'Bitirmeye git', 'Sık, bitir', 'Aynı planla']) if (await click(p)) { ok = true; break; }
      if (!ok) {
        const b = await buttons();
        const j = b.findIndex((x) => /^1\n/.test(x) || (x.split('\n').length >= 3 && !/ANA MENÜ/.test(x)));
        if (j >= 0) await (await page.$$('[tabindex="0"]'))[j].click();
      }
    }
    await sleep(350);
  }
  return { ko };
});
await noCaption();

// 4) Kendi salonun + dünya sıralaması
await page.evaluate(() => {
  const key = Object.keys(localStorage).find((k) => k.startsWith('yol_kariyer'));
  const s = JSON.parse(localStorage.getItem(key));
  Object.assign(s, { stage: 'buyuk', phase: 'hub', pending: {}, takipci: 240000, para: 3000000, populerlik: 70 });
  s.contract = { org: 'pfl', kalan: 3, ucret: 90000, bonus: 90000, munhasir: true };
  localStorage.setItem(key, JSON.stringify(s));
});
await reloadContinue();
await click('Salonum');
await sleep(500);
await click('Salonu aç');
await sleep(500);
await click('Kaydet');
await sleep(300);
await click('Kaydet');
await sleep(300);
await mutate('Object.assign(s.salon, { seviye: 3, un: 78, uye: 410, uccSayisi: 1, galibiyet: 34 }); s.salon.ogrenciler.forEach((o, i) => { o.seviye = i ? "buyuk" : "ucc"; o.rekor = { g: 14 + i * 3, m: 2, b: 0 }; for (const k in o.stats) o.stats[k] = 64 + i * 4; o.moral = 88; }); s.phase = "salon";');
await page.reload({ waitUntil: 'networkidle0' });
await sleep(800);
await click('DEVAM ET');
await sleep(900);
await rec('gym', async () => {
  await caption('KENDİ SALONUNU KUR 🏆', 'ŞAMPİYON YETİŞTİR');
  await sleep(900);
  await smoothScroll(330, 1700);
  await sleep(900);
});
await noCaption();

// 5) UCC kemeri
await page.evaluate(() => {
  const key = Object.keys(localStorage).find((k) => k.startsWith('yol_kariyer'));
  const s = JSON.parse(localStorage.getItem(key));
  Object.assign(s, { stage: 'ufc', phase: 'kutlama', pending: {} });
  s.contract = { org: 'ufc', kalan: 4, ucret: 250000, bonus: 250000, munhasir: true };
  s.kutlama = { tur: 'kemer', org: 'ufc', siklet: s.fighter.siklet };
  s.kemerler = [...(s.kemerler ?? []), { org: 'ufc', siklet: s.fighter.siklet, savunma: 0, hafta: s.hafta, yas: 27, aktif: true }];
  localStorage.setItem(key, JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle0' });
await sleep(700);
await click('DEVAM ET');
await sleep(250);
await rec('belt', async () => {
  await caption('VE YENİ… DÜNYA ŞAMPİYONU 👑');
  await sleep(4200);
});

// 6) Kapanış kartları
const icon = readFileSync(`${root}/assets/splash-icon.png`).toString('base64');
for (const [name, line] of [
  ['end-yakinda', "YAKINDA GOOGLE PLAY'DE"],
  ['end-yayinda', "GOOGLE PLAY'DE ÜCRETSİZ"],
]) {
  await page.setContent(`<html><head><style>
@font-face{font-family:Os;src:url(data:font/ttf;base64,${OSWALD})}
body{margin:0;width:540px;height:960px;background:radial-gradient(circle at 50% 40%,#5a1019,#060607 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:Os;overflow:hidden}
img{width:240px;filter:drop-shadow(0 0 40px rgba(230,57,70,.7));animation:p .6s ease-out}
.y{font-size:110px;color:#e63946;letter-spacing:14px;transform:skewX(-8deg);margin-top:6px;line-height:1}
.u{font-size:40px;color:#f2c14e;transform:skewX(-8deg);margin-top:6px}
.g{margin-top:40px;font-size:30px;color:#111;background:#fff;border-radius:40px;padding:12px 30px;animation:b 1s ease-in-out infinite alternate}
.t{margin-top:18px;font-size:22px;color:#d9dbe0;letter-spacing:2px}
@keyframes p{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes b{from{transform:scale(1)}to{transform:scale(1.06)}}
</style></head><body><img src="data:image/png;base64,${icon}"/><div class="y">YOL</div><div class="u">KAFESTEN KEMERE</div><div class="g">${line}</div><div class="t">MMA KARİYER OYUNU</div></body></html>`);
  await rec(name, async () => sleep(2900));
}
await browser.close();

// ---------- Kurgu ----------
const dur = (f) => {
  const r = spawnSync(FF, ['-i', f, '-f', 'null', '-'], { encoding: 'utf8' });
  const m = [...(r.stderr ?? '').matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop();
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
};
for (const k of Object.keys(segs)) segs[k].sn = dur(`${tmp}/${k}.webm`);
const ko = segs.fight.marks.ko ?? segs.fight.sn - 4.5;
const drill0 = (segs.drill.marks.start ?? 0) + 2.2; // geri sayımı atla
// [parça, başlangıç, süre]
const cutsFor = (end) => [
  ['walk', segs.walk.marks.red - 0.2, 4.4],
  ['drill', drill0, 4.6],
  ['fight', Math.max(0, ko - 1.2), 7.6],
  ['gym', 0.1, 3.4],
  ['belt', 0.2, 4.0],
  [end, 0, 2.8],
];
const snd = (n) => `${root}/assets/sounds/${n}.wav`;

for (const end of ['end-yakinda', 'end-yayinda']) {
  const cuts = cutsFor(end);
  const at = [];
  let t = 0;
  for (const c of cuts) {
    at.push(t);
    t += c[2];
  }
  const total = t;
  const args = ['-y'];
  cuts.forEach((c) => args.push('-i', `${tmp}/${c[0]}.webm`));
  const vf = cuts.map((c, i) => `[${i}:v]trim=start=${c[1].toFixed(2)}:duration=${c[2].toFixed(2)},setpts=PTS-STARTPTS,fps=30,scale=1080:1920:flags=lanczos,setsar=1[v${i}]`).join(';');
  // Sesler: altta giriş müziği, spiker anonsları, darbe efektleri, seyirci.
  const audio = [];
  const add = (file, startSec, vol = 1, loop = false) => audio.push({ file, startSec, vol, loop });
  // Altta baştan sona seyirci; ilk 6,8 sn giriş müziği, sonra oyun müziği döngüde.
  add(snd('crowd_loop'), 0, 0.35, true);
  add(snd('giris_epik'), 0, 0.75);
  add(snd('music_hub'), 6.5, 0.5, true);
  add(`${VOX}/kirmizi.wav`, 0.25, 1.6);
  add(snd('roar'), 2.6, 0.6);
  // Mini oyun vuruşları
  const di = cuts.findIndex((c) => c[0] === 'drill');
  taps.filter((x) => x >= cuts[di][1] && x < cuts[di][1] + cuts[di][2]).forEach((x, i) => add(snd(`punch${(i % 3) + 1}`), at[di] + (x - cuts[di][1]), 0.9));
  const fi = cuts.findIndex((c) => c[0] === 'fight');
  const koAt = at[fi] + (ko - cuts[fi][1]);
  add(snd('heavy'), koAt - 0.9, 1);
  add(snd('roar'), koAt - 0.6, 0.9);
  add(`${VOX}/nakavt.wav`, koAt - 0.3, 1.6);
  add(snd('swell'), koAt + 2.4, 0.7);
  add(snd('heavy'), koAt + 3.6, 0.8);
  const bi = cuts.findIndex((c) => c[0] === 'belt');
  add(snd('fanfare'), at[bi], 0.8);
  add(`${VOX}/sampiyon.wav`, at[bi] + 0.3, 1.6);
  add(snd('applause'), at[bi] + 1.2, 0.6);
  add(snd('bell'), at[bi + 1], 0.8);
  const base = cuts.length;
  audio.forEach((a) => args.push(...(a.loop ? ['-stream_loop', '-1'] : []), '-i', a.file));
  const af = audio.map((a, i) => `[${base + i}:a]aresample=44100,aformat=channel_layouts=stereo,volume=${a.vol},adelay=${Math.round(a.startSec * 1000)}|${Math.round(a.startSec * 1000)}[a${i}]`).join(';');
  const mix = `${audio.map((_, i) => `[a${i}]`).join('')}amix=inputs=${audio.length}:duration=longest:normalize=0,afade=t=out:st=${(total - 0.8).toFixed(2)}:d=0.8,alimiter=limit=0.95[aout]`;
  const concat = `${cuts.map((_, i) => `[v${i}]`).join('')}concat=n=${cuts.length}:v=1:a=0[vout]`;
  const out = `${root}/store/video/tiktok-${end.slice(4)}.mp4`;
  execFileSync(FF, [...args, '-filter_complex', `${vf};${concat};${af};${mix}`, '-map', '[vout]', '-map', '[aout]', '-t', total.toFixed(2), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '19', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { stdio: 'ignore' });
  console.log('✅', out, `${total.toFixed(1)} sn`);
}
