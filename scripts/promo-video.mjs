// Tanıtım videosu (dikey, ~35 sn): oyunu oynayarak sahne sahne kaydeder, birleştirir ve müzik ekler.
// Google Play video yüklemez; çıkan MP4 YouTube'a yüklenir, bağlantısı Play Console'a yapıştırılır.
// Önce: CI=1 npm run build:web  ve  npx serve dist -s -l 8088
// Çalıştırma: node scripts/promo-video.mjs <ffmpeg.exe yolu> [tr|en|es|pt|ru|pl]
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const FF = process.argv[2];
const lang = process.argv[3] ?? 'tr';
if (!FF || !existsSync(FF)) throw new Error('ffmpeg yolu gerekli (ör. npx ffmpeg-static ile kurulan ffmpeg.exe)');
const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = `${root}/store/video/${lang}-parca`;
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const dictFile = `${root}/src/i18n/${lang}.ts`;
const D = lang !== 'tr' && existsSync(dictFile) ? JSON.parse('{' + readFileSync(dictFile, 'utf8').split('\n').filter((l) => l.startsWith('  "')).map((l) => l.trim().replace(/,$/, '')).join(',') + '}') : {};
const t = (k) => D[k] ?? k;
const END = {
  tr: ['KAFESTEN KEMERE', "Google Play'de ücretsiz"],
  en: ['FROM CAGE TO BELT', 'Free on Google Play'],
  es: ['DE LA JAULA AL CINTURÓN', 'Gratis en Google Play'],
  pt: ['DO OCTÓGONO AO CINTURÃO', 'Grátis no Google Play'],
  ru: ['ИЗ КЛЕТКИ К ПОЯСУ', 'Бесплатно в Google Play'],
  pl: ['Z KLATKI DO PASA', 'Za darmo w Google Play'],
}[lang];

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
// Ekran kaydı CSS pikseliyle alınır: telefon düzeninde kalan en geniş görünüm (540), kodlamada 1080×1920'ye büyütülür.
await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.evaluateOnNewDocument((l) => {
  if (sessionStorage.getItem('hazir')) return;
  sessionStorage.setItem('hazir', '1');
  localStorage.clear();
  localStorage.setItem('yol_dil', l);
  localStorage.setItem('yol_satinalim', JSON.stringify(['paket_altin']));
  localStorage.setItem('yol_kozmetik', JSON.stringify({ equip: { sort: 'sort_altin', eldiven: 'eld_altin', cerceve: 'cer_altin', kemer: 'kem_altin', giris: 'gir_epik' }, acik: [], yeni: [] }));
}, lang);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const up = (s) => s.toLocaleUpperCase(lang);
const buttons = () => page.$$eval('[tabindex="0"]', (els) => els.map((e) => e.innerText.trim()));
const body = () => page.$eval('body', (b) => b.innerText);
async function click(k) {
  const want = up(t(k));
  const b = await buttons();
  const i = b.findIndex((x) => up(x).includes(want));
  if (i < 0) return false;
  await (await page.$$('[tabindex="0"]'))[i].click();
  await sleep(220);
  return true;
}
const edit = async (src) => {
  await page.evaluate((code) => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('yol_kariyer'));
    const s = JSON.parse(localStorage.getItem(key));
    new Function('s', code)(s);
    localStorage.setItem(key, JSON.stringify(s));
  }, src);
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

const segs = [];
const rec = async (name, fn) => {
  const r = await page.screencast({ path: `${tmp}/${name}.webm`, ffmpegPath: FF, fps: 30 });
  const t0 = Date.now();
  await fn();
  await r.stop();
  segs.push({ name, sn: (Date.now() - t0) / 1000 });
  console.log('🎬', name, segs[segs.length - 1].sn.toFixed(1), 'sn');
};

await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
await sleep(900);
// Açılış kaydedilmez: video doğrudan ring anonsuyla başlar (ilk 3 saniye kanca).
await click('YENİ KARİYER');
await sleep(700);
await click('Hemen başla');
await sleep(1500);
await edit("s.ipuclari = ['hub','gelisim','rakip','kamp','plan','yuzyuze','dovus','macSonrasi'];");
const PRI = ['DÖVÜŞ AYARLA', 'Bu rakibi seç', 'Hocanın planıyla başla', 'Tüm kampı simüle et', 'Tartıya çık', 'Yüz yüze gel', 'Soğukkanlı bak'];
for (let i = 0; i < 40; i++) {
  if ((await buttons()).some((b) => up(b).includes(up(t('Dövüş gecesi'))))) break;
  let ok = false;
  for (const p of PRI) if (await click(p)) { ok = true; break; }
  if (!ok) await sleep(400);
}
await edit('s.amator = { g: 9, m: 1, b: 0 };');
let walkAt = 0;
await rec('02-yuruyus', async () => {
  await click('Dövüş gecesi');
  walkAt = 5.8; // kırmızı köşe (giriş müziği) bu sahnenin başından ~5.8 sn sonra
  await sleep(10800);
});
await sleep(1500);
await rec('03-dovus', async () => {
  const FIGHT = ['Baskı kur', 'Takedown dene', 'Bitirmeye git', 'Sık, bitir', 'Aynı planla'];
  const t0 = Date.now();
  while (Date.now() - t0 < 6500) {
    let ok = false;
    for (const p of FIGHT) if (await click(p)) { ok = true; break; }
    if (!ok) {
      const b = await buttons();
      const j = b.findIndex((x) => /^1\n/.test(x));
      if (j >= 0) await (await page.$$('[tabindex="0"]'))[j].click();
    }
    await sleep(700);
  }
});

// Zengin kariyer (vitrin kaydıyla aynı)
await page.evaluate(() => {
  const key = Object.keys(localStorage).find((k) => k.startsWith('yol_kariyer'));
  const s = JSON.parse(localStorage.getItem(key));
  const R = ['Diego Alvarez', 'Timur Bekov', 'Jake Morrison', 'Luka Novak', 'Rafael Costa', 'Sean Doyle', 'Arman Petrosyan', 'Marcus Pruitt', 'Dmitri Volkov', 'Caio Moraes', 'Tyler Boone', 'Wei Li', 'Kenji Mori', 'Ivan Sorokin', 'Brody Stroud', 'Luan Farias'];
  const Y = ['KO', 'TKO', 'SUB', 'UD', 'KO', 'SD', 'TKO', 'UD'];
  const orgs = ['amator', 'amator', 'amator', 'cfc', 'cfc', 'cfc', 'cfc', 'pfl', 'pfl', 'pfl', 'pfl', 'pfl', 'pfl', 'pfl', 'pfl', 'pfl'];
  s.gecmis = orgs.map((org, i) => ({ rakip: R[i], rakipId: 'r' + i, org, sonuc: i === 4 || i === 9 ? 'M' : 'G', yontem: Y[i % Y.length], raunt: 1 + (i % 3), yas: 21 + Math.floor(i / 3) })).reverse();
  Object.assign(s, { stage: 'buyuk', phase: 'hub', pending: {}, rank: 4, populerlik: 22, seri: 2, para: 1850000, nesil: 2 });
  s.contract = { org: 'pfl', kalan: 3, ucret: 60000, bonus: 60000, munhasir: true };
  s.amator = { g: 3, m: 0, b: 0 };
  s.rekor = { ...s.rekor, g: 11, m: 2, b: 0, ko: 6, sub: 2, karar: 3 };
  s.uccYolu = ['siralama', 'ilk5'];
  s.ipuclari = ['hub', 'gelisim', 'rakip', 'kamp', 'plan', 'yuzyuze', 'dovus', 'macSonrasi'];
  s.ezeli = { id: 'nem1', ad: 'Dmitri', soyad: 'Volkov', lakap: 'Buz', uyruk: 'Rusya', stil: 'sambo', kisilik: '', g: 2, m: 1, b: 0, son: 12, kaynak: 'yenilgi' };
  s.hanedan = [{ ad: 'Hasan', soyad: s.fighter.soyad, lakap: 'Demir', nesil: 1, rekor: { g: 31, m: 6, b: 1 }, kemer: 2, efsane: 540, hof: true, yas: 39 }];
  s.kemerler = [{ org: 'cfc', siklet: s.fighter.siklet, hafta: 120, yas: 23, savunma: 2, aktif: false }];
  localStorage.setItem(key, JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle0' });
await sleep(800);
await click('DEVAM ET');
await sleep(900);
await rec('04-kariyer', async () => {
  await sleep(500);
  await smoothScroll(420, 1800);
  await sleep(900);
});
await click('PROFİL');
await sleep(600);
await click('Kafespedia sayfan');
await sleep(900);
await rec('05-kafespedia', async () => {
  await sleep(700);
  await smoothScroll(900, 2600);
  await sleep(600);
});
await page.keyboard.press('Escape');
await sleep(500);
await click('ANA MENÜ');
await sleep(600);
await click('DOLAP');
await sleep(800);
await rec('06-dolap', async () => {
  await sleep(900);
  await click('Eldiven');
  await sleep(900);
  await click('Kemer');
  await sleep(1100);
});
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
await sleep(300);
await rec('07-kemer', async () => sleep(4200));

// Kapanış kartı
const font = (f) => readFileSync(`${root}/node_modules/@expo-google-fonts/${f}`).toString('base64');
const icon = readFileSync(`${root}/assets/splash-icon.png`).toString('base64');
await page.setContent(`<html><head><style>
@font-face{font-family:Os;src:url(data:font/ttf;base64,${font('oswald/700Bold/Oswald_700Bold.ttf')})}
@font-face{font-family:In;src:url(data:font/ttf;base64,${font('inter/600SemiBold/Inter_600SemiBold.ttf')})}
body{margin:0;width:360px;height:640px;zoom:1.5;background:linear-gradient(165deg,#3b0d14,#060607 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:In;overflow:hidden}
img{width:170px;filter:drop-shadow(0 0 30px rgba(230,57,70,.6));animation:p 2.4s ease-out}
.y{font-family:Os;font-size:74px;color:#e63946;letter-spacing:10px;transform:skewX(-8deg);margin-top:8px}
.u{font-family:Os;font-size:${END[0].length > 18 ? 22 : 26}px;color:#f2c14e;transform:skewX(-8deg)}
.g{margin-top:26px;font-size:17px;color:#d9dbe0;border:1px solid #444;border-radius:24px;padding:10px 20px}
@keyframes p{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
</style></head><body><img src="data:image/png;base64,${icon}"/><div class="y">YOL</div><div class="u">${END[0]}</div><div class="g">${END[1]}</div></body></html>`);
await rec('08-son', async () => sleep(3000));
await browser.close();

// Parçaların gerçek süresi (kayıt durdurma gecikmesi hariç): dosya baştan sona çözülerek ölçülür.
for (const sg of segs) {
  const r = spawnSync(FF, ['-i', `${tmp}/${sg.name}.webm`, '-f', 'null', '-'], { encoding: 'utf8' });
  const m = [...(r.stderr ?? '').matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop();
  if (m) sg.sn = +m[1] * 3600 + +m[2] * 60 + +m[3];
}
console.log('Gerçek süreler:', segs.map((x) => `${x.name} ${x.sn.toFixed(1)}`).join(' · '));
// Birleştir + müzik: menü müziği altta, giriş müziği yürüyüş sahnesinde
const list = segs.map((s) => `file '${tmp.replace(/\\/g, '/')}/${s.name}.webm'`).join('\n');
writeFileSync(`${tmp}/liste.txt`, list);
const offset = segs.slice(0, segs.findIndex((s) => s.name === '02-yuruyus')).reduce((a, s) => a + s.sn, 0) + walkAt;
const total = segs.reduce((a, s) => a + s.sn, 0);
const outFile = `${root}/store/video/yol-tanitim-${lang}.mp4`;
const snd = (n) => `${root}/assets/sounds/${n}.wav`;
execFileSync(FF, [
  '-y', '-f', 'concat', '-safe', '0', '-i', `${tmp}/liste.txt`,
  '-stream_loop', '-1', '-i', snd('music_menu'),
  '-i', snd('giris_epik'),
  '-i', snd('roar'),
  '-filter_complex',
  `[1:a]volume=0.55,afade=t=out:st=${(total - 2).toFixed(2)}:d=2[bed];[2:a]adelay=${Math.round(offset * 1000)}|${Math.round(offset * 1000)},volume=1.1[wo];[3:a]adelay=${Math.round((offset + 3.5) * 1000)}|${Math.round((offset + 3.5) * 1000)},volume=0.7[ro];[bed][wo][ro]amix=inputs=3:duration=first:normalize=0[a]`,
  '-map', '0:v', '-map', '[a]', '-t', total.toFixed(2),
  '-vf', 'scale=1080:1920:flags=lanczos',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20', '-r', '30',
  '-c:a', 'aac', '-b:a', '160k', outFile,
], { stdio: 'ignore' });
console.log('✅', outFile, `${total.toFixed(1)} sn`);
