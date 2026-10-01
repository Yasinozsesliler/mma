// TikTok / Reels / Shorts özellik tanıtımı (dikey 1080×1920, ~31 sn).
// Her sahne: üstte büyük özellik başlığı, ortada telefon çerçevesinde oyun ekranı, beyaz flaşla hızlı geçiş.
// Önce: CI=1 npm run build:web  ve  npx serve dist -s -l 8088
// Çalıştırma: node scripts/tiktok-tanitim.mjs <ffmpeg.exe>  (seslendirme yok: müzik ve efektler)
// Çıktı: store/video/tiktok-tanitim.mp4
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const FF = process.argv[2];
if (!FF || !existsSync(FF)) throw new Error('ffmpeg yolu gerekli');
const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = `${root}/store/video/tanitim-parca`;
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

// Sahneler: [kayıt adı, başlık, alt başlık, süre, kayıttan başlangıç (sn; null = işaretten)]
const SCENES = [
  ['ko', 'BU NAKAVTI SEN YAPTIN 💥', 'MMA KARİYER OYUNU', 3.0],
  ['create', 'DÖVÜŞÇÜNÜ YARAT', 'YÜZ · SAÇ · DÖVME · DÖVÜŞ STİLİ', 2.4],
  ['rival', 'RAKİBİNİ SEÇ', 'ZAYIF YÖNÜNÜ BUL', 2.2],
  ['plan', 'OYUN PLANINI KUR', '11 FARKLI TAKTİK', 2.2],
  ['faceoff', 'TARTIDA GÖZDAĞI VER', 'YÜZ YÜZE GELME ANI', 2.4],
  ['tactic', 'HER RAUNTTA KARAR SENİN', 'BASKI · GÜREŞ · SUBMISSION', 2.2],
  ['interview', 'MİKROFON SENDE 🎤', 'MEYDAN OKU, TRASH TALK YAP', 2.2],
  ['shop', 'KAFES DIŞINDA HAYAT', 'LÜKS ARABALAR · EVLER · YATIRIM', 2.2],
  ['gym', 'KENDİ SALONUNU KUR', 'ŞAMPİYON YETİŞTİR', 2.4],
  ['profile', 'EFSANENİ YAZ', 'KARNE · MAÇ GEÇMİŞİ · KEMERLER', 2.4],
  ['hof', "HALL OF FAME'E GİR 🏛", 'ADIN ÖLÜMSÜZ OLSUN', 2.6],
  ['locker', 'TARZINI SEÇ', 'ŞORT · ELDİVEN · GİRİŞ MÜZİĞİ', 2.2],
  ['belt', 'DÜNYA ŞAMPİYONU OL 👑', 'AMATÖRDEN UCC KEMERİNE', 2.8],
];
const END_SEC = 3.2;

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
async function click(k, exact = false) {
  const b = await buttons();
  const i = b.findIndex((x) => (exact ? up(x).trim().endsWith(up(k)) : up(x).includes(up(k))));
  if (i < 0) return false;
  await (await page.$$('[tabindex="0"]'))[i].click();
  await sleep(250);
  return true;
}
/** İlk çok satırlı seçenek kartı (menü, ana menü ve haftalık seans hariç). */
async function firstChoice() {
  const b = await buttons();
  const i = b.findIndex((x) => x.split('\n').length >= 2 && !/ANA MENÜ|HAFTANIN SEANSI|DOLAP|GÜNÜN/.test(up(x)));
  if (i < 0) return false;
  await (await page.$$('[tabindex="0"]'))[i].click();
  await sleep(350);
  return true;
}
const state = () =>
  page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('yol_kariyer'));
    return key ? JSON.parse(localStorage.getItem(key)) : null;
  });
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
  await sleep(800);
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

const segs = {};
const rec = async (name, fn) => {
  const r = await page.screencast({ path: `${tmp}/${name}.webm`, ffmpegPath: FF, fps: 30 });
  const t0 = Date.now();
  const marks = (await fn(() => (Date.now() - t0) / 1000)) ?? {};
  await r.stop();
  segs[name] = { marks };
  console.log('🎬', name, ((Date.now() - t0) / 1000).toFixed(1), 'sn', JSON.stringify(marks));
};

await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
await sleep(900);

// ---------- Dövüşçü yarat ----------
await click('YENİ KARİYER');
await sleep(700);
const inputs = await page.$$('input');
for (const [i, v] of [[0, 'Kerem'], [1, 'Aslan'], [2, 'Çelik']]) {
  await inputs[i].click({ clickCount: 3 });
  await inputs[i].type(v);
}
for (let i = 0; i < 12 && !up(await body()).includes('GÖRÜNÜMÜN'); i++) {
  await click('DEVAM', true);
  await sleep(350);
}
await rec('create', async () => {
  await sleep(300);
  for (let i = 0; i < 4; i++) {
    await click('Rastgele', true);
    await sleep(520);
  }
});
for (let i = 0; i < 6 && !(await buttons()).some((b) => up(b).includes('KARİYERE BAŞLA')); i++) {
  if (up(await body()).includes('HİKÂYEN NE')) await click('BENİM İÇİN YAZ');
  await click('DEVAM', true);
  await sleep(400);
}
await click('KARİYERE BAŞLA');
await sleep(1500);
await mutate("s.ipuclari = ['hub','gelisim','rakip','kamp','plan','yuzyuze','dovus','macSonrasi'];");
await reloadContinue();

// ---------- Rakip seçimi ----------
await click('DÖVÜŞ AYARLA');
await sleep(900);
await rec('rival', async () => {
  await sleep(300);
  await smoothScroll(260, 1500);
  await sleep(500);
});
await click('Bu rakibi seç');
await sleep(700);
await click('Kendim planlayayım');
await sleep(500);

// ---------- Kamp adımları (oyun planı kaydedilir) ----------
for (let i = 0; i < 25; i++) {
  const st = (await state())?.pending?.kamp?.step;
  if (st === 'haftalik') break;
  if (st === 'plan') {
    await rec('plan', async () => {
      await sleep(300);
      await smoothScroll(420, 1600);
      await sleep(400);
    });
    await firstChoice();
    continue;
  }
  if (st === 'takvim') {
    await click('Kampa kadar otomatik geç');
    continue;
  }
  if (!(await firstChoice())) await sleep(400);
}

// ---------- Tartı ve yüz yüze ----------
for (let i = 0; i < 20; i++) {
  const st = (await state())?.pending?.kamp?.step;
  if (st === 'yuzyuze') break;
  let ok = false;
  for (const p of ['Tüm kampı simüle et', 'Tartıya çık', 'Yüz yüze gel']) if (await click(p)) { ok = true; break; }
  if (!ok) await sleep(400);
}
await sleep(600);
await rec('faceoff', async () => {
  await sleep(500);
  await click('Alın alına ver');
  await sleep(2200);
});
// Güçlü dövüşçü: nakavt için.
await mutate('for (const k in s.fighter.stats) s.fighter.stats[k] = 94;');
await reloadContinue();
for (let i = 0; i < 10; i++) {
  if ((await buttons()).some((b) => up(b).includes('DÖVÜŞ GECESİ'))) break;
  if (!(await click('Yüz yüze gel'))) if (!(await click('Soğukkanlı bak'))) await sleep(400);
}
await click('Dövüş gecesi');
await sleep(800);
// Giriş sahnesini geç
for (let i = 0; i < 12 && up(await body()).includes('GEÇMEK İÇİN DOKUN'); i++) {
  await page.mouse.click(270, 480);
  await sleep(500);
}
await sleep(800);

// ---------- Taktik seçimi ----------
await rec('tactic', async () => {
  await sleep(300);
  await smoothScroll(300, 1300);
  await sleep(300);
  await click('Baskı kur');
  await sleep(600);
});

// ---------- Nakavt ----------
await rec('ko', async (now) => {
  let ko = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    const txt = up(await body());
    if (!ko && /KAZANAN:/.test(txt)) ko = now();
    if (ko && now() - ko > 6.5) break;
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
// Tekrar penceresini kapat, maç sonuna geç
for (let i = 0; i < 10 && !(await click('Dövüş sonrası')); i++) {
  await page.keyboard.press('Escape');
  await sleep(500);
}
await sleep(1200);

// ---------- Röportaj ----------
await rec('interview', async () => {
  await sleep(300);
  await smoothScroll(520, 1600);
  await sleep(500);
});

// ---------- Mağaza ----------
await mutate("Object.assign(s, { phase: 'magaza', pending: {}, para: 2500000, stage: 'buyuk' });");
await reloadContinue();
await click('YAŞAM');
await sleep(600);
// Lüks kısma (villalar, arabalar) önceden in, kayıtta oradan devam et.
await smoothScroll(1500, 300);
await sleep(500);
await rec('shop', async () => {
  await sleep(300);
  await smoothScroll(900, 1800);
  await sleep(300);
});

// ---------- Salon ----------
await mutate("Object.assign(s, { phase: 'hub', takipci: 240000, para: 3000000, populerlik: 70 }); s.contract = { org: 'pfl', kalan: 3, ucret: 90000, bonus: 90000, munhasir: true };");
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
await reloadContinue();
await rec('gym', async () => {
  await sleep(500);
  await smoothScroll(330, 1500);
  await sleep(500);
});

// ---------- Profil + Hall of Fame: efsane bir kariyer ----------
const achIds = [...readFileSync(`${root}/src/engine/achievements.ts`, 'utf8').matchAll(/id: '([^']+)'/g)].map((m) => m[1]).slice(0, 78);
await page.evaluate((achIds) => {
  const key = Object.keys(localStorage).find((k) => k.startsWith('yol_kariyer'));
  const s = JSON.parse(localStorage.getItem(key));
  const R = ['Diego Alvarez', 'Timur Bekov', 'Jake Morrison', 'Luka Novak', 'Rafael Costa', 'Sean Doyle', 'Arman Petrosyan', 'Marcus Pruitt', 'Dmitri Volkov', 'Caio Moraes', 'Tyler Boone', 'Wei Li', 'Kenji Mori', 'Ivan Sorokin', 'Brody Stroud', 'Luan Farias', 'Callum Tate', 'Zaur Omarov'];
  const Y = ['KO', 'TKO', 'SUB', 'UD', 'KO', 'SD', 'TKO', 'UD'];
  const orgs = ['amator', 'amator', 'cfc', 'cfc', 'cfc', 'pfl', 'pfl', 'pfl', 'pfl', 'dwcs', 'ufc', 'ufc', 'ufc', 'ufc', 'ufc', 'ufc', 'ufc', 'ufc'];
  s.gecmis = orgs.map((org, i) => ({ rakip: R[i], rakipId: 'r' + i, org, sonuc: i === 4 || i === 9 ? 'M' : 'G', yontem: Y[i % Y.length], raunt: 1 + (i % 3), yas: 21 + Math.floor(i / 2) })).reverse();
  Object.assign(s, { stage: 'ufc', phase: 'hub', pending: {}, rank: 1, sampiyon: true, savunma: 4, populerlik: 96, takipci: 12400000, para: 18500000 });
  s.contract = { org: 'ufc', kalan: 3, ucret: 750000, bonus: 750000, munhasir: true };
  s.rekor = { ...s.rekor, g: 27, m: 2, b: 0, ko: 15, sub: 6, karar: 6 };
  s.kemerler = [
    { org: 'cfc', siklet: s.fighter.siklet, hafta: 90, yas: 23, savunma: 2, aktif: false },
    { org: 'ufc', siklet: s.fighter.siklet, hafta: 300, yas: 29, savunma: 4, aktif: true },
  ];
  s.unvanlar = ['CFC', 'UCC'];
  s.hof = { hafta: s.hafta, yas: 34, skor: 1180, goruldu: false };
  s.basarimlar = achIds;
  s.fighter.yas = 34;
  localStorage.setItem(key, JSON.stringify(s));
}, achIds);
await reloadContinue();
await click('PROFİL');
await sleep(800);
await rec('profile', async () => {
  await sleep(300);
  await smoothScroll(520, 1700);
  await sleep(400);
});
await mutate("s.phase = 'basarimlar';");
await reloadContinue();
await sleep(400);
await rec('hof', async () => {
  await sleep(500);
  await smoothScroll(480, 1700);
  await sleep(500);
});

// ---------- Dolap ----------
await click('ANA MENÜ');
await sleep(700);
await click('DOLAP');
await sleep(900);
await rec('locker', async () => {
  await sleep(400);
  await click('Eldiven');
  await sleep(700);
  await click('Kemer');
  await sleep(800);
});

// ---------- Kemer ----------
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
await rec('belt', async () => sleep(3400));

// ---------- Şablonlar: arka plan + başlık, telefon maskesi, kapanış ----------
const b64 = (p) => readFileSync(`${root}/${p}`).toString('base64');
const OS = b64('node_modules/@expo-google-fonts/oswald/700Bold/Oswald_700Bold.ttf');
const INTER = b64('node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf');
const ICON = b64('assets/splash-icon.png');
const FONTS = `@font-face{font-family:Os;src:url(data:font/ttf;base64,${OS})}@font-face{font-family:In;src:url(data:font/ttf;base64,${INTER})}`;
// Telefon penceresi (1080×1920 tuvalde): x 225, y 400, 630×1120
const PH = { x: 160, y: 372, w: 760, h: 1352 };
const BADGE = `<div class="badge"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2.5v19l17-9.5z" fill="#fff"/></svg><span>GOOGLE PLAY'DE ŞİMDİ OYNA</span></div>`;
const CSS = `${FONTS}
*{box-sizing:border-box}body{margin:0;width:540px;height:960px;overflow:hidden;background:radial-gradient(120% 70% at 50% 30%,#4a0d16 0%,#16060a 55%,#050506 100%);font-family:Os;color:#fff}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:36px 36px}
.top{position:absolute;left:0;right:0;top:78px;display:flex;flex-direction:column;align-items:center;gap:8px}
.t{font-size:40px;line-height:44px;background:#e63946;padding:4px 16px;transform:skewX(-8deg);text-align:center;max-width:92%;box-shadow:0 8px 30px rgba(230,57,70,.45)}
.s{font-size:20px;line-height:24px;color:#111;background:#f2c14e;padding:3px 12px;transform:skewX(-8deg)}
.ph{position:absolute;left:${PH.x / 2 - 6}px;top:${PH.y / 2 - 6}px;width:${PH.w / 2 + 12}px;height:${PH.h / 2 + 12}px;border-radius:30px;background:#000;box-shadow:0 0 0 2px #3a1a20,0 20px 60px rgba(0,0,0,.8),0 0 50px rgba(230,57,70,.35)}
.badge{position:absolute;left:50%;top:${(PH.y + PH.h) / 2 + 10}px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;background:#000;border:2px solid #fff;border-radius:14px;padding:6px 14px;font-family:Os;font-size:18px;white-space:nowrap}
.logo{position:absolute;left:18px;top:24px;display:flex;align-items:center;gap:8px;font-size:20px;letter-spacing:3px;color:#e63946}.logo img{width:34px}`;
const shot = async (html, file, transparent = false) => {
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'load' });
  await sleep(150);
  await page.screenshot({ path: file, omitBackground: transparent });
};
for (const [name, t, s] of SCENES) {
  // Arka plan (başlıksız) ve başlık (saydam, ayrı katman: sahne başında zıplayarak girer)
  await shot(`<html><head><style>${CSS}</style></head><body><div class="grid"></div><div class="logo"><img src="data:image/png;base64,${ICON}"/>YOL</div><div class="ph"></div>${BADGE}</body></html>`, `${tmp}/bg-${name}.png`);
  await shot(`<html><head><style>${CSS} body{background:transparent!important}</style></head><body><div class="top"><div class="t">${t}</div><div class="s">${s}</div></div></body></html>`, `${tmp}/title-${name}.png`, true);
}
await shot(`<html><head><style>*{margin:0}body{width:540px;height:960px;background:#000}div{position:absolute;left:${PH.x / 2}px;top:${PH.y / 2}px;width:${PH.w / 2}px;height:${PH.h / 2}px;border-radius:24px;background:#fff}</style></head><body><div></div></body></html>`, `${tmp}/mask-full.png`);
await shot(`<html><head><style>${CSS}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.c img{width:230px;filter:drop-shadow(0 0 40px rgba(230,57,70,.7))}.y{font-size:110px;color:#e63946;letter-spacing:14px;transform:skewX(-8deg);line-height:1;margin-top:4px}
.u{font-size:38px;color:#f2c14e;transform:skewX(-8deg);margin-top:4px}.p{margin-top:34px;display:flex;align-items:center;gap:12px;background:#000;border:3px solid #fff;border-radius:22px;padding:14px 26px;font-size:30px}
.f{margin-top:16px;font-size:26px;color:#111;background:#f2c14e;padding:4px 16px;transform:skewX(-8deg)}.m{margin-top:14px;font-family:In;font-size:18px;color:#d9dbe0;letter-spacing:2px}
</style></head><body><div class="grid"></div><div class="c"><img src="data:image/png;base64,${ICON}"/><div class="y">YOL</div><div class="u">KAFESTEN KEMERE</div><div class="p"><svg viewBox="0 0 24 24" width="40" height="40"><path d="M4 2.5v19l17-9.5z" fill="#fff"/></svg>GOOGLE PLAY'DE ŞİMDİ OYNA</div><div class="f">ÜCRETSİZ</div><div class="m">MMA KARİYER OYUNU · 6 DİL</div></div></body></html>`, `${tmp}/end.png`);
await browser.close();

// ---------- Kurgu ----------
const dur = (f) => {
  const r = spawnSync(FF, ['-i', f, '-f', 'null', '-'], { encoding: 'utf8' });
  const m = [...(r.stderr ?? '').matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop();
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
};
for (const k of Object.keys(segs)) segs[k].sn = dur(`${tmp}/${k}.webm`);
const startOf = (name, d) => {
  const sg = segs[name];
  if (name === 'ko') return Math.max(0, (sg.marks.ko ?? sg.sn - 6) - 1.7); // son yumruk, düşüş ve KAZANDIN
  return Math.max(0, Math.min(0.25, sg.sn - d));
};
// Başlık bandı (1080×1920'de) ve zıplama: küçükten %115'e, sonra yerine oturur.
const TB = { y: 120, h: 340 };
const POP_AT = 0.3; // geçiş bittikten hemen sonra
const POP = `if(lt(t,${POP_AT}),0.5,if(lt(t,${POP_AT + 0.13}),0.5+0.65*(t-${POP_AT})/0.13,if(lt(t,${POP_AT + 0.24}),1.15-0.15*(t-${POP_AT + 0.13})/0.11,1)))`;
const parts = [];
for (const [name, , , d] of SCENES) {
  const ss = Math.min(startOf(name, d), Math.max(0, segs[name].sn - d));
  const out = `${tmp}/scene-${name}.mp4`;
  execFileSync(FF, [
    '-y', '-loop', '1', '-t', String(d), '-i', `${tmp}/bg-${name}.png`,
    '-ss', ss.toFixed(2), '-t', String(d), '-i', `${tmp}/${name}.webm`,
    '-loop', '1', '-t', String(d), '-i', `${tmp}/mask-full.png`,
    '-loop', '1', '-t', String(d), '-i', `${tmp}/title-${name}.png`,
    '-filter_complex',
    `[1:v]fps=30,scale=${PH.w}:${PH.h}:flags=lanczos,setsar=1,pad=1080:1920:${PH.x}:${PH.y}:black,format=rgba[ph];[2:v]scale=1080:1920,format=gray[mk];[ph][mk]alphamerge[phm];[0:v]scale=1080:1920,format=rgba[bg];[bg][phm]overlay=0:0:shortest=1[base];` +
      `[3:v]scale=1080:1920,format=rgba,crop=1080:${TB.h}:0:${TB.y},scale=w='trunc(1080*(${POP})/2)*2':h=-2:eval=frame[tt];` +
      `[base][tt]overlay=x='(W-w)/2':y='${TB.y}+(${TB.h}-h)/2':eval=frame:enable='gte(t,${POP_AT})',` +
      `scale=w='trunc(1080*(1+0.07*max(0,1-(t-0.26)/0.22)*gte(t,0.26)+0.035*t/${d})/2)*2':h=-2:eval=frame,crop=1080:1920,format=yuv420p[v]`,
    '-map', '[v]', '-t', String(d), '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', out,
  ], { stdio: 'ignore' });
  parts.push(out);
}
const endOut = `${tmp}/scene-end.mp4`;
execFileSync(FF, ['-y', '-loop', '1', '-t', String(END_SEC), '-i', `${tmp}/end.png`, '-filter_complex', `[0:v]scale=1080:1920,scale=w='trunc(1080*(1+0.05*t/${END_SEC})/2)*2':h=-2:eval=frame,crop=1080:1920,format=yuv420p[v]`, '-map', '[v]', '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', endOut], { stdio: 'ignore' });
parts.push(endOut);

// Ses: seyirci + müzik, her kesmede whoosh, mini oyun vuruşları, nakavt ve şampiyon anonsu.
// Geçişler: her biri XF sn üst üste biner; sırayla farklı hareketli geçişler.
const XF = 0.26;
// Temiz itme geçişleri (yeni sahne eskisini iterek girer); kapanışa daire açılımı.
const TRANS = ['slideleft', 'slideup', 'slideleft', 'slidedown', 'slideright', 'slideup', 'slideleft', 'slideup', 'slideright', 'slidedown', 'slideleft', 'slideup', 'circleopen'];
const durs = [...SCENES.map((x) => x[3]), END_SEC];
const at = [];
let t = 0;
durs.forEach((d, i) => {
  at.push(t);
  t += d - (i < durs.length - 1 ? XF : 0);
});
const endAt = at[at.length - 1];
const total = t;
const snd = (n) => `${root}/assets/sounds/${n}.wav`;
const audio = [];
const add = (file, startSec, vol = 1, loop = false) => audio.push({ file, startSec, vol, loop });
add(snd('crowd_loop'), 0, 0.3, true);
add(snd('giris_epik'), 0, 0.8);
add(snd('music_hub'), 6.4, 0.55, true);
// Her geçişin başında whoosh
at.forEach((x, i) => i > 0 && add(snd('whoosh'), x - 0.02, 0.55));
// Nakavt (ilk sahne): tekrar penceresi ağır çekim
add(snd('heavy'), 0.35, 1);
add(snd('roar'), 0.9, 0.9);
const fo = SCENES.findIndex((s) => s[0] === 'faceoff');
add(snd('ooh'), at[fo] + 1.0, 0.7);
const bi = SCENES.findIndex((s) => s[0] === 'belt');
add(snd('fanfare'), at[bi], 0.8);
add(snd('applause'), at[bi] + 0.6, 0.7);
const hi = SCENES.findIndex((s) => s[0] === 'hof');
add(snd('swell'), at[hi] + 0.1, 0.7);
add(snd('applause'), at[hi] + 0.8, 0.5);
add(snd('bell'), endAt + 0.1, 0.9);
const args = ['-y'];
parts.forEach((p) => args.push('-i', p));
audio.forEach((a) => args.push(...(a.loop ? ['-stream_loop', '-1'] : []), '-i', a.file));
const NV = parts.length;
const vprep = parts.map((_, i) => `[${i}:v]settb=AVTB,fps=30,format=yuv420p,setsar=1[s${i}]`).join(';');
let vchain = '';
let prev = 's0';
for (let k = 1; k < NV; k++) {
  const tag = k === NV - 1 ? 'vout' : `x${k}`;
  vchain += `;[${prev}][s${k}]xfade=transition=${TRANS[(k - 1) % TRANS.length]}:duration=${XF}:offset=${at[k].toFixed(3)}[${tag}]`;
  prev = tag;
}
const af = audio.map((a, i) => `[${NV + i}:a]aresample=44100,aformat=channel_layouts=stereo,volume=${a.vol},adelay=${Math.round(a.startSec * 1000)}|${Math.round(a.startSec * 1000)}[a${i}]`).join(';');
const mix = `${audio.map((_, i) => `[a${i}]`).join('')}amix=inputs=${audio.length}:duration=longest:normalize=0,afade=t=out:st=${(total - 0.9).toFixed(2)}:d=0.9,alimiter=limit=0.95[aout]`;
const out = `${root}/store/video/tiktok-tanitim.mp4`;
writeFileSync(`${tmp}/filtre.txt`, `${vprep}${vchain};${af};${mix}`);
const r = spawnSync(FF, [...args, '-filter_complex_script', `${tmp}/filtre.txt`, '-map', '[vout]', '-map', '[aout]', '-t', total.toFixed(2), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '19', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { encoding: 'utf8' });
if (r.status !== 0) throw new Error('ffmpeg: ' + (r.stderr ?? '').split(String.fromCharCode(10)).slice(-8).join(' | '));
console.log('✅', out, `${total.toFixed(1)} sn`);
