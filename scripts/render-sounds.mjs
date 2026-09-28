// Android için ses dosyalarını üretir: web ses motoru (src/audio/engine.web.ts) başsız Chrome'da
// OfflineAudioContext'e çalınır ve her ses WAV olarak assets/sounds/ içine yazılır. Böylece iki platform aynı duyulur.
// Çalıştırma: node scripts/render-sounds.mjs   (ses motoru değişince yeniden çalıştır)
import { buildSync } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = new URL('../assets/sounds/', import.meta.url);
mkdirSync(out, { recursive: true });

const bundle = buildSync({
  entryPoints: [`${root}/src/audio/engine.web.ts`],
  bundle: true,
  format: 'iife',
  globalName: 'YolSes',
  write: false,
}).outputFiles[0].text;

const SFX = 24000;
const MUS = 32000;
// [dosya, iş, süre (sn), örnekleme, döngü uzunluğu (sn, varsa döngüsel)]
const JOBS = [
  ['click', { tur: 'sfx', ad: 'click' }, 0.15, SFX],
  ['punch1', { tur: 'sfx', ad: 'punch' }, 0.5, SFX],
  ['punch2', { tur: 'sfx', ad: 'punch' }, 0.5, SFX],
  ['punch3', { tur: 'sfx', ad: 'punch' }, 0.5, SFX],
  ['body', { tur: 'sfx', ad: 'body' }, 0.5, SFX],
  ['heavy', { tur: 'sfx', ad: 'heavy' }, 1.8, SFX],
  ['whoosh', { tur: 'sfx', ad: 'whoosh' }, 0.4, SFX],
  ['slam', { tur: 'sfx', ad: 'slam' }, 0.8, SFX],
  ['tap', { tur: 'sfx', ad: 'tap' }, 0.6, SFX],
  ['bell', { tur: 'sfx', ad: 'bell' }, 2.8, SFX],
  ['bell2', { tur: 'sfx', ad: 'bell2' }, 3.3, SFX],
  ['chime', { tur: 'sfx', ad: 'chime' }, 1.3, SFX],
  ['cash', { tur: 'sfx', ad: 'cash' }, 0.8, SFX],
  ['win', { tur: 'sfx', ad: 'win' }, 4.2, SFX],
  ['lose', { tur: 'sfx', ad: 'lose' }, 3.8, SFX],
  ['fanfare', { tur: 'sfx', ad: 'fanfare' }, 6.2, SFX],
  ['flash', { tur: 'sfx', ad: 'flash' }, 1.0, SFX],
  ['ooh', { tur: 'sfx', ad: 'ooh' }, 1.5, SFX],
  ['applause', { tur: 'sfx', ad: 'applause' }, 3.4, SFX],
  ['roar', { tur: 'cosku', amt: 1, hold: 3.5, alkis: 3.5 }, 7, SFX],
  ['swell', { tur: 'cosku', amt: 0.8, hold: 2 }, 5, SFX],
  ['lock', { tur: 'cosku', amt: 0.45, hold: 2.2 }, 5, SFX],
  ['crowd_loop', { tur: 'seyirci', sure: 13 }, 13, SFX, 12],
  ['music_hub', { tur: 'muzik', tema: 'hub' }, null, MUS, 'hub'],
  ['music_menu', { tur: 'muzik', tema: 'menu' }, null, MUS, 'menu'],
];

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');
await page.addScriptTag({ content: bundle });

let total = 0;
for (const [name, job, dur0, sr, loop] of JOBS) {
  const b64 = await page.evaluate(
    async (job, dur0, sr, loop) => {
      const S = window.YolSes;
      const loopLen = typeof loop === 'string' ? S.loopSeconds(loop) : loop ?? 0;
      const dur = dur0 ?? loopLen + 4;
      const oc = new OfflineAudioContext(1, Math.ceil(sr * dur), sr);
      S.__offlineRender(oc, job);
      const buf = await oc.startRendering();
      let d = buf.getChannelData(0);
      if (loopLen) {
        // Kusursuz döngü: döngü sonrasındaki kuyruk (yankı, uzayan notalar) başa eklenir.
        const L = Math.round(loopLen * sr);
        const o = d.slice(0, L);
        if (job.tur === 'seyirci') {
          // Gürültü tabanlı döngü: son 1 saniye başla çapraz geçişle birleşir.
          const X = sr;
          for (let i = 0; i < X; i++) {
            const a = i / X;
            o[i] = o[i] * a + d[L + i] * (1 - a);
          }
        } else for (let i = L; i < d.length; i++) o[i - L] += d[i];
        d = o;
      } else {
        // Sondaki sessizliği kırp
        let end = d.length;
        while (end > sr * 0.1 && Math.abs(d[end - 1]) < 0.0005) end--;
        d = d.slice(0, Math.min(d.length, end + Math.round(sr * 0.02)));
      }
      let peak = 0;
      for (const v of d) peak = Math.max(peak, Math.abs(v));
      // Oyundaki karışım oranı korunur, genel seviye yükseltilir (telefon hoparlörü); tepe kırpılmaz.
      const g = Math.min(2.4, 0.98 / Math.max(peak, 1e-6));
      // 16 bit mono WAV
      const bytes = new ArrayBuffer(44 + d.length * 2);
      const v = new DataView(bytes);
      const str = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
      str(0, 'RIFF');
      v.setUint32(4, 36 + d.length * 2, true);
      str(8, 'WAVE');
      str(12, 'fmt ');
      v.setUint32(16, 16, true);
      v.setUint16(20, 1, true);
      v.setUint16(22, 1, true);
      v.setUint32(24, sr, true);
      v.setUint32(28, sr * 2, true);
      v.setUint16(32, 2, true);
      v.setUint16(34, 16, true);
      str(36, 'data');
      v.setUint32(40, d.length * 2, true);
      for (let i = 0; i < d.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i] * g)) * 32767, true);
      let bin = '';
      const u8 = new Uint8Array(bytes);
      for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      return { b64: btoa(bin), peak, sn: d.length / sr };
    },
    job,
    dur0,
    sr,
    loop ?? null,
  );
  const buf = Buffer.from(b64.b64, 'base64');
  writeFileSync(new URL(`${name}.wav`, out), buf);
  total += buf.length;
  console.log(`${name.padEnd(12)} ${b64.sn.toFixed(2)} sn  tepe ${b64.peak.toFixed(2)}  ${(buf.length / 1024).toFixed(0)} KB`);
}
await browser.close();
console.log(`Toplam ${(total / 1024 / 1024).toFixed(2)} MB → assets/sounds/`);
