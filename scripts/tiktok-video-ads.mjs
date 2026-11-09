// TikTok reklam videosu (9:16, 1080×1920, ~18 sn, sessiz: ses TikTok Reklam Yöneticisi'nde ticari müzikten eklenir).
// Kanca: hakem karar anı + soru; ardından dövüş, yürüyüş, antrenör köşesi, kemer ve kapanış kartı. Para gösteren ekran yok.
// Kaynak: store/video/<dil>-parca/*.webm (oyun klipleri) ve store/graphics/<dil>/ham/*.png (ham ekranlar).
// Çalıştırma: node scripts/tiktok-video-ads.mjs <ffmpeg.exe> [tr en es pt pl]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const FF = process.argv[2];
if (!FF || !existsSync(FF)) throw new Error('ffmpeg yolu gerekli');
const langs = process.argv.slice(3).length ? process.argv.slice(3) : ['tr', 'en', 'es', 'pt', 'pl'];
const root = fileURLToPath(new URL('..', import.meta.url));
const W = 1080;
const H = 1920;

const CAP = {
  hakem: { tr: 'Sen hakem olsan durdurur muydun?', en: 'Would you stop the fight?', es: '¿Tú pararías la pelea?', pt: 'Você pararia a luta?', pl: 'Przerwałbyś tę walkę?' },
  dovus: { tr: 'Kafeste kendi elinle dövüş', en: 'Fight with your own hands', es: 'Pelea con tus propias manos', pt: 'Lute com as próprias mãos', pl: 'Walcz własnymi rękami' },
  yuruyus: { tr: 'Kafese yürü, adını haykırsınlar', en: 'Walk out. Hear your name.', es: 'Sal a la jaula, oye tu nombre', pt: 'Entre no octógono, ouça seu nome', pl: 'Wejdź do klatki, usłysz swoje imię' },
  antrenor: { tr: 'Kendi şampiyonunu yetiştir', en: 'Raise your own champion', es: 'Forma a tu propio campeón', pt: 'Forme seu próprio campeão', pl: 'Wychowaj własnego mistrza' },
  kemer: { tr: 'Kemer için dövüş', en: 'Fight for the belt', es: 'Pelea por el cinturón', pt: 'Lute pelo cinturão', pl: 'Walcz o pas' },
};
// [ad, tür, kaynak, başlangıç sn, süre sn]
const SEGS = [
  ['hakem', 'still', 'hakem', 0, 3],
  ['dovus', 'clip', '03-dovus', 1.0, 3],
  ['yuruyus', 'clip', '02-yuruyus', 5.5, 3],
  ['antrenor', 'still', 'antrenor', 0, 2.5],
  ['kemer', 'clip', '07-kemer', 0.2, 3],
  ['son', 'clip', '08-son', 0, 3],
];

const font = (f) => readFileSync(`${root}/node_modules/@expo-google-fonts/${f}`).toString('base64');
const OS = font('oswald/700Bold/Oswald_700Bold.ttf');
const logo = readFileSync(`${root}/assets/splash-icon.png`).toString('base64');
const run = (args) => execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

for (const lang of langs) {
  const tmp = `${root}/store/tiktok/video-parca/${lang}`;
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const list = [];
  for (const [name, kind, src, ss, dur] of SEGS) {
    // Başlık katmanı (şeffaf PNG): üstte koyu geçiş + logo + büyük yazı
    const cap = CAP[name]?.[lang];
    const capPng = `${tmp}/${name}-cap.png`;
    if (cap) {
      await page.setContent(`<html><head><style>
@font-face{font-family:Os;src:url(data:font/ttf;base64,${OS})}
html,body{margin:0;background:transparent}
body{width:${W}px;height:${H}px;position:relative}
.band{position:absolute;left:0;right:0;top:0;height:640px;background:linear-gradient(180deg,rgba(6,6,7,.92) 0%,rgba(6,6,7,.78) 55%,rgba(6,6,7,0) 100%)}
.top{position:absolute;top:150px;left:70px;right:150px}
.logo{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.logo img{width:64px;height:64px}
.logo span{font-family:Os;font-size:40px;letter-spacing:9px;color:#e63946}
.cap{font-family:Os;font-size:${cap.length > 26 ? 86 : 100}px;line-height:1.04;color:#fff;text-shadow:0 6px 24px rgba(0,0,0,.7)}
</style></head><body><div class="band"></div><div class="top"><div class="logo"><img src="data:image/png;base64,${logo}"/><span>YOL</span></div><div class="cap">${cap}</div></div></body></html>`);
      await new Promise((r) => setTimeout(r, 150));
      await page.screenshot({ path: capPng, omitBackground: true });
    }
    const seg = `${tmp}/${String(list.length).padStart(2, '0')}-${name}.mp4`;
    const out = ['-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-an', seg];
    if (kind === 'clip') {
      const file = `${root}/store/video/${lang}-parca/${src}.webm`;
      if (!existsSync(file)) throw new Error(`klip yok: ${file}`);
      const base = `[0:v]scale=${W}:${H}:flags=lanczos,setsar=1,fps=30`;
      if (cap) run(['-ss', String(ss), '-t', String(dur), '-i', file, '-i', capPng, '-filter_complex', `${base}[v];[v][1:v]overlay=0:0`, ...out]);
      else run(['-ss', String(ss), '-t', String(dur), '-i', file, '-vf', base.replace('[0:v]', ''), ...out]);
    } else {
      const file = `${root}/store/graphics/${lang}/ham/${src}.png`;
      if (!existsSync(file)) throw new Error(`ham ekran yok: ${file}`);
      const frames = Math.round(dur * 30);
      // Yavaş yakınlaşma (titreşmesin diye önce iki kat büyütülür)
      // Tek kare girdi: zoompan bu kareden `frames` kadar çıktı üretir
      run(['-i', file, '-i', capPng, '-filter_complex', `[0:v]scale=${W * 2}:${H * 2},zoompan=z='min(zoom+0.0009,1.08)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/3-(ih/zoom/3)':s=${W}x${H}:fps=30,setsar=1[v];[v][1:v]overlay=0:0`, '-frames:v', String(frames), ...out]);
    }
    list.push(seg);
  }
  const listFile = `${tmp}/liste.txt`;
  writeFileSync(listFile, list.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
  const final = `${root}/store/tiktok/yol-tiktok-${lang}.mp4`;
  // Birleştir + sessiz ses izi (bazı platformlar ses izi bekler)
  run(['-f', 'concat', '-safe', '0', '-i', listFile, '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-shortest', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', final]);
  console.log(lang, '→', final.replace(root, ''));
}
await browser.close();
