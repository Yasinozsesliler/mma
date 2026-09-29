// Google Play görselleri: oyunun web derlemesini oynayarak ve zengin bir kariyer kaydı kurarak 1080×1920 ekran görüntüleri üretir,
// her birini pazarlama başlığıyla çerçeveler; ayrıca 1024×500 tanıtım görseli.
// Önce: CI=1 npm run build:web  ve  npx serve dist -s -l 8088
// Çalıştırma: node scripts/store-shots.mjs [tr|en|es|pt|ru|pl] [adres]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const lang = process.argv[2] ?? 'tr';
const URL_ = process.argv[3] ?? 'http://localhost:8088/';
const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}/store/graphics/${lang}`;
const raw = `${out}/ham`;
mkdirSync(raw, { recursive: true });

// Düğme yazıları oyunun kendi sözlüğünden (Türkçe anahtar → seçili dil).
const dictFile = `${root}/src/i18n/${lang}.ts`;
const D = lang !== 'tr' && existsSync(dictFile) ? JSON.parse('{' + readFileSync(dictFile, 'utf8').split('\n').filter((l) => l.startsWith('  "')).map((l) => l.trim().replace(/,$/, '')).join(',') + '}') : {};
const t = (k) => D[k] ?? k;
const LOC = { tr: 'tr', en: 'en', es: 'es', pt: 'pt', ru: 'ru', pl: 'pl' }[lang];

// Pazarlama başlıkları (sırayla: yürüyüş, dövüş, maç sonu, kariyer, ezeli rakip, Kafespedia, dolap, kemer)
const CAP = {
  tr: ['Kafese yürü, adını haykırsınlar', 'Her raunt senin kararın', 'Zaferini dünyaya göster', "Sokaktan UCC'ye uzanan yol", 'Ezeli rakibin seni bekliyor', 'Efsaneni ansiklopedi yazsın', 'Tarzını yarat · Güç satılmaz', 'Kemeri kaldır, tarihe geç'],
  en: ['Walk out. Hear your name.', 'Every round is your call', 'Show the world your win', 'From the streets to the UCC', 'Your nemesis is waiting', 'Your legend, written for you', 'Your style · No pay-to-win', 'Raise the belt. Make history.'],
  es: ['Sal a la jaula. Oye tu nombre.', 'Cada asalto lo decides tú', 'Enseña tu victoria al mundo', 'De la calle a la UCC', 'Tu némesis te espera', 'Tu leyenda, escrita para ti', 'Tu estilo · Sin pagar para ganar', 'Alza el cinturón. Haz historia.'],
  pt: ['Entre no octógono. Ouça seu nome.', 'Cada round é decisão sua', 'Mostre sua vitória ao mundo', 'Das ruas ao UCC', 'Seu arquirrival te espera', 'Sua lenda, escrita para você', 'Seu estilo · Sem pagar para ganhar', 'Erga o cinturão. Faça história.'],
  ru: ['Выходи в клетку. Услышь своё имя.', 'Каждый раунд решаешь ты', 'Покажи миру свою победу', 'С улицы до UCC', 'Заклятый соперник ждёт', 'Твоя легенда уже написана', 'Твой стиль · Без pay-to-win', 'Подними пояс. Войди в историю.'],
  pl: ['Wejdź do klatki. Usłysz swoje imię.', 'Każda runda to twoja decyzja', 'Pokaż światu swoje zwycięstwo', 'Z ulicy do UCC', 'Arcyrywal na ciebie czeka', 'Twoja legenda, spisana dla ciebie', 'Twój styl · Bez pay-to-win', 'Unieś pas. Zapisz się w historii.'],
}[lang];
const BANNER = {
  tr: ['KAFESTEN KEMERE', 'Sokaktan dünya şampiyonluğuna. Her karar senin.'],
  en: ['FROM CAGE TO BELT', 'From the streets to world champion. Every choice is yours.'],
  es: ['DE LA JAULA AL CINTURÓN', 'De la calle a campeón del mundo. Cada decisión es tuya.'],
  pt: ['DO OCTÓGONO AO CINTURÃO', 'Das ruas a campeão mundial. Cada escolha é sua.'],
  ru: ['ИЗ КЛЕТКИ К ПОЯСУ', 'С улицы до чемпиона мира. Каждое решение за тобой.'],
  pl: ['Z KLATKI DO PASA', 'Z ulicy do mistrzostwa świata. Każdy wybór należy do ciebie.'],
}[lang];

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.evaluateOnNewDocument((l) => {
  if (sessionStorage.getItem('hazir')) return;
  sessionStorage.setItem('hazir', '1');
  localStorage.clear();
  localStorage.setItem('yol_dil', l);
  localStorage.setItem('yol_ipucu', '1');
  // Vitrin için Altın Seri kuşanılmış
  localStorage.setItem('yol_satinalim', JSON.stringify(['paket_altin']));
  localStorage.setItem('yol_kozmetik', JSON.stringify({ equip: { sort: 'sort_altin', eldiven: 'eld_altin', cerceve: 'cer_altin', kemer: 'kem_altin', giris: 'gir_epik' }, acik: ['sort_gece', 'eld_siyah', 'gir_rock'], yeni: [] }));
}, lang);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const up = (s) => s.toLocaleUpperCase(LOC);
const buttons = () => page.$$eval('[tabindex="0"]', (els) => els.map((e) => e.innerText.trim()));
const body = () => page.$eval('body', (b) => b.innerText);
async function click(k, raw_ = false) {
  const want = up(raw_ ? k : t(k));
  const b = await buttons();
  const i = b.findIndex((x) => up(x).includes(want));
  if (i < 0) return false;
  await (await page.$$('[tabindex="0"]'))[i].click();
  await sleep(220);
  return true;
}
const shots = [];
const shot = async (name, scrollTo = null) => {
  if (scrollTo) await page.evaluate((s) => [...document.querySelectorAll('div')].find((d) => d.innerText?.startsWith(s))?.scrollIntoView({ block: 'center' }), scrollTo);
  await sleep(250);
  const p = `${raw}/${name}.png`;
  await page.screenshot({ path: p });
  shots.push(name);
  console.log('📸', name);
};

await page.goto(URL_, { waitUntil: 'networkidle0' });
await sleep(900);

// 1) Hızlı başla → ilk dövüş gecesi: yürüyüş ve anons
await click('YENİ KARİYER');
await click('Hemen başla');
await sleep(500);
// Kayıt düzenleme yardımcısı: kaydı değiştir, yeniden yükle, kariyere dön.
const edit = async (fn) => {
  await page.evaluate((src) => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('yol_kariyer'));
    const s = JSON.parse(localStorage.getItem(key));
    new Function('s', src)(s);
    localStorage.setItem(key, JSON.stringify(s));
  }, fn);
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(800);
  await click('DEVAM ET');
  await sleep(700);
};
await edit("s.ipuclari = ['hub','gelisim','rakip','kamp','plan','yuzyuze','dovus','macSonrasi'];");
const PRI = ['DÖVÜŞ AYARLA', 'Bu rakibi seç', 'Hocanın planıyla başla', 'Tüm kampı simüle et', 'Tartıya çık', 'Yüz yüze gel', 'Soğukkanlı bak', 'Dövüş gecesi'];
for (let i = 0; i < 40; i++) {
  if ((await body()).includes(t('BAYANLAR VE BAYLAR…'))) break;
  // Dövüş gecesinden hemen önce: anonsta görünecek amatör rekor
  if ((await buttons()).some((b) => up(b).includes(up(t('Dövüş gecesi'))))) await edit('s.amator = { g: 9, m: 1, b: 0 };');
  let ok = false;
  for (const p of PRI) if (await click(p)) { ok = true; break; }
  if (!ok) await sleep(400);
}
await sleep(6400); // mavi köşe → kırmızı köşe
await shot('01-yuruyus');
await page.mouse.click(180, 320); // anonsu geç
await sleep(900);

// 2) Canlı dövüş ve 3) maç sonu
const FIGHT = ['ATLA', 'Aynı planla', 'Bitirmeye git', 'Sık, bitir', 'Sabırla savun', 'Takedown dene', 'Baskı kur'];
let fightShot = false;
for (let i = 0; i < 300; i++) {
  const txt = await body();
  if (!fightShot && txt.includes(t('MAÇ AKIYOR'))) {
    await sleep(2200);
    await shot('02-dovus');
    fightShot = true;
  }
  if (txt.includes(t('KAFES İÇİ RÖPORTAJ'))) break;
  if (await click('Dövüş sonrası')) { await sleep(700); continue; }
  let ok = false;
  for (const p of FIGHT) if (await click(p)) { ok = true; break; }
  if (!ok) {
    const b = await buttons();
    let j = b.findIndex((x) => /^1\n/.test(x));
    if (j < 0) j = b.findIndex((x) => x.split('\n').length >= 3);
    if (j >= 0) { await (await page.$$('[tabindex="0"]'))[j].click(); await sleep(250); } else await sleep(500);
  }
}
await sleep(900);
await shot('03-mac-sonrasi');

// Zengin kariyer: büyük organizasyon, ezeli rakip, hanedan, UCC yolu
await page.evaluate(() => {
  const key = Object.keys(localStorage).find((k) => k.startsWith('yol_kariyer'));
  const s = JSON.parse(localStorage.getItem(key));
  const R = ['Diego Alvarez', 'Timur Bekov', 'Jake Morrison', 'Luka Novak', 'Rafael Costa', 'Sean Doyle', 'Arman Petrosyan', 'Marcus Pruitt', 'Dmitri Volkov', 'Caio Moraes', 'Tyler Boone', 'Wei Li', 'Kenji Mori', 'Ivan Sorokin', 'Brody Stroud', 'Luan Farias'];
  const Y = ['KO', 'TKO', 'SUB', 'UD', 'KO', 'SD', 'TKO', 'UD'];
  const orgs = ['amator', 'amator', 'amator', 'cfc', 'cfc', 'cfc', 'cfc', 'pfl', 'pfl', 'pfl', 'pfl', 'pfl', 'pfl', 'pfl', 'pfl', 'pfl'];
  s.gecmis = orgs.map((org, i) => ({ rakip: R[i], rakipId: 'r' + i, org, sonuc: i === 4 || i === 9 ? 'M' : 'G', yontem: Y[i % Y.length], raunt: 1 + (i % 3), yas: 21 + Math.floor(i / 3) })).reverse();
  s.stage = 'buyuk';
  s.phase = 'hub';
  s.pending = {};
  s.contract = { org: 'pfl', kalan: 3, ucret: 60000, bonus: 60000, munhasir: true };
  s.rank = 4;
  s.populerlik = 22;
  s.seri = 2;
  s.para = 1850000;
  s.amator = { g: 3, m: 0, b: 0 };
  s.rekor = { ...s.rekor, g: 11, m: 2, b: 0, ko: 6, sub: 2, karar: 3 };
  s.uccYolu = ['siralama', 'ilk5'];
  s.ipuclari = ['hub', 'gelisim', 'rakip', 'kamp', 'plan', 'yuzyuze', 'dovus', 'macSonrasi'];
  s.fighter.yas = 26;
  s.ezeli = { id: 'nem1', ad: 'Dmitri', soyad: 'Volkov', lakap: 'Buz', uyruk: 'Rusya', stil: 'sambo', kisilik: '', g: 2, m: 1, b: 0, son: 12, kaynak: 'yenilgi' };
  s.nesil = 2;
  s.hanedan = [{ ad: 'Hasan', soyad: s.fighter.soyad, lakap: 'Demir', nesil: 1, rekor: { g: 31, m: 6, b: 1 }, kemer: 2, efsane: 540, hof: true, yas: 39 }];
  s.kemerler = [{ org: 'cfc', siklet: s.fighter.siklet, hafta: 120, yas: 23, savunma: 2, aktif: false }];
  s.basarimlar = (s.basarimlar ?? []).concat(['ilk', 'pro', 'ilkko', 'seri3', 'seri5', 'kemer1']);
  localStorage.setItem(key, JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle0' });
await sleep(900);
await click('DEVAM ET');
await sleep(900);
await shot('04-kariyer', up(t('UCC YOLU')));
await click('PROFİL');
await sleep(700);
await shot('05-ezeli-rakip', t('⚔️ EZELİ RAKİP'));
await click('Kafespedia sayfan');
await sleep(1000);
await shot('06-kafespedia');
await page.mouse.click(335, 30); // kapat (×)
await sleep(600);
await click('ANA MENÜ');
await sleep(700);
await click('DOLAP');
await sleep(900);
await shot('07-dolap');

// Kemer kutlaması
await page.evaluate(() => {
  const key = Object.keys(localStorage).find((k) => k.startsWith('yol_kariyer'));
  const s = JSON.parse(localStorage.getItem(key));
  s.stage = 'ufc';
  s.contract = { org: 'ufc', kalan: 4, ucret: 250000, bonus: 250000, munhasir: true };
  s.phase = 'kutlama';
  s.pending = {};
  s.kutlama = { tur: 'kemer', org: 'ufc', siklet: s.fighter.siklet };
  s.kemerler = [...(s.kemerler ?? []), { org: 'ufc', siklet: s.fighter.siklet, savunma: 0, hafta: s.hafta, yas: 27, aktif: true }];
  s.rekor = { ...s.rekor, g: 18, m: 2, b: 0, ko: 9, sub: 5, karar: 4 };
  localStorage.setItem(key, JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle0' });
await sleep(800);
await click('DEVAM ET');
await sleep(1600);
await shot('08-kemer');

// Çerçeveli mağaza görselleri: başlık + telefon ekranı
const font = (f) => readFileSync(`${root}/node_modules/@expo-google-fonts/${f}`).toString('base64');
const OS = font('oswald/700Bold/Oswald_700Bold.ttf');
const INTER = font('inter/600SemiBold/Inter_600SemiBold.ttf');
const g = await browser.newPage();
await g.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
const ORDER = ['01-yuruyus', '02-dovus', '03-mac-sonrasi', '04-kariyer', '05-ezeli-rakip', '06-kafespedia', '07-dolap', '08-kemer'];
for (const name of shots) {
  const i = ORDER.indexOf(name);
  const img = readFileSync(`${raw}/${name}.png`).toString('base64');
  await g.setContent(`<html><head><style>
@font-face{font-family:Os;src:url(data:font/ttf;base64,${OS})}
@font-face{font-family:In;src:url(data:font/ttf;base64,${INTER})}
body{margin:0;width:1080px;height:1920px;overflow:hidden;background:linear-gradient(165deg,#3b0d14 0%,#12070a 38%,#060607 100%);position:relative;font-family:In}
.s{position:absolute;top:-200px;width:22px;height:2600px;background:#e63946;opacity:.10;transform:rotate(28deg)}
.cap{position:absolute;top:92px;left:70px;right:70px;text-align:center;font-family:Os;font-size:${CAP[i].length > 30 ? 74 : 86}px;line-height:1.08;color:#fff;transform:skewX(-8deg);text-shadow:0 6px 30px rgba(0,0,0,.6)}
.bar{position:absolute;top:${CAP[i].length > 22 ? 330 : 250}px;left:470px;width:140px;height:8px;background:#f2c14e}
.ph{position:absolute;left:150px;top:${CAP[i].length > 22 ? 400 : 330}px;width:780px;height:1387px;border-radius:56px;overflow:hidden;border:10px solid #1b1d22;box-shadow:0 40px 120px rgba(0,0,0,.75),0 0 0 2px #2c2f37}
.ph img{width:100%;height:100%;object-fit:cover}
.yol{position:absolute;bottom:40px;left:0;right:0;text-align:center;font-family:Os;font-size:34px;letter-spacing:14px;color:#e63946}
</style></head><body>
${[0, 1, 2, 3].map((k) => `<div class="s" style="left:${300 + k * 170}px"></div>`).join('')}
<div class="cap">${CAP[i]}</div><div class="bar"></div>
<div class="ph"><img src="data:image/png;base64,${img}"/></div>
<div class="yol">YOL</div>
</body></html>`);
  await sleep(250);
  await g.screenshot({ path: `${out}/${name}.png` });
}
console.log('🖼️ çerçevelendi:', shots.length);

// Tanıtım görseli 1024×500
const icon = readFileSync(`${root}/assets/splash-icon.png`).toString('base64');
await g.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
await g.setContent(`<html><head><style>
@font-face{font-family:Os;src:url(data:font/ttf;base64,${OS})}
@font-face{font-family:In;src:url(data:font/ttf;base64,${INTER})}
body{margin:0;width:1024px;height:500px;overflow:hidden;background:linear-gradient(120deg,#2a0a10 0%,#0b0c10 55%,#050506 100%);font-family:In;color:#fff;position:relative}
.s{position:absolute;top:-50px;width:14px;height:700px;background:#e63946;opacity:.18;transform:rotate(28deg)}
.logo{position:absolute;left:70px;top:95px;width:310px;height:310px;filter:drop-shadow(0 0 40px rgba(230,57,70,.55))}
.t{position:absolute;left:430px;top:110px;right:40px}
.yol{font-family:Os;font-size:150px;line-height:1;color:#e63946;letter-spacing:18px;transform:skewX(-8deg)}
.ust{font-family:Os;font-size:${BANNER[0].length > 18 ? 44 : 52}px;line-height:1.1;color:#f2c14e;transform:skewX(-8deg);margin-top:6px}
.alt{font-size:24px;color:#c9ccd4;margin-top:18px;max-width:520px}
</style></head><body>
${[0, 1, 2, 3].map((k) => `<div class="s" style="left:${520 + k * 120}px"></div>`).join('')}
<img class="logo" src="data:image/png;base64,${icon}"/>
<div class="t"><div class="yol">YOL</div><div class="ust">${BANNER[0]}</div><div class="alt">${BANNER[1]}</div></div>
</body></html>`);
await sleep(300);
await g.screenshot({ path: `${out}/tanitim-1024x500.png` });
console.log('📸 tanitim-1024x500', errors.length ? `HATALAR: ${errors.join(' | ')}` : '');
await browser.close();
