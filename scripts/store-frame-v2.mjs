// Mağaza görselleri v2 (1.3.x): açık krem zemin, büyük başlık, "YENİ" etiketleri, büyük telefon.
// Ham çekimler: store/graphics-ios/<dil>/ham (store-shots.mjs IOS=1 ve store-shots-yeni.mjs)
// Çıktı: App Store 1290×2796 → store/graphics-ios/<dil>/01..10 ; Google Play 1080×1920 → store/graphics/<dil>/01..10 + tanıtım 1024×500
// Çalıştırma: CHROME_PATH=... node scripts/store-frame-v2.mjs <dil>
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const lang = process.argv[2] ?? 'tr';
const root = fileURLToPath(new URL('..', import.meta.url));
const raw = `${root}/store/graphics-ios/${lang}/ham`;

// Sıra: ilk üç görsel türü ve yeniliği anlatır
const ORDER = ['dovus', 'menu', 'kemer', 'genclik', 'lig-ring', 'menajer', 'patron-giris', 'antrenor', 'efsane', 'hakem'];
// [etiket, başlık, yeni mi]
const TX = {
  tr: {
    dovus: ['CANLI DÖVÜŞ', 'Kafeste kendi elinle dövüş'],
    menu: ['YENİ GÖRÜNÜM', '11 mod, tek oyun', 1],
    kemer: ['KARİYER MODU', 'Kemeri kaldır, tarihe geç'],
    genclik: ['GENÇLİK YOLU', '12 yaşında başla, efsane ol', 1],
    'lig-ring': ['4 DÖVÜŞ SPORU LİGİ', 'Boks, Muay Thai, Grappling, Güreş', 1],
    menajer: ['MENAJER MODU', 'Pazarlığı yap, kemeri birlikte kazanın', 1],
    'patron-giris': ['PATRON MODU', 'Kendi organizasyonunu kur', 1],
    antrenor: ['ANTRENÖR MODU', 'Salonunu aç, şampiyon yetiştir'],
    efsane: ['EFSANE YOLLARI', 'Efsanelerin yolunu yürü'],
    hakem: ['HAKEM MODU', 'Kafesin içinde, kararı sen ver'],
    yeni: 'YENİ',
    banner: ['MMA KARİYER OYUNU', 'Canlı dövüş · 11 mod · Güç satılmaz'],
  },
  en: {
    dovus: ['LIVE FIGHTS', 'Fight in the cage with your own hands'],
    menu: ['NEW LOOK', '11 modes, one game', 1],
    kemer: ['CAREER MODE', 'Raise the belt, make history'],
    genclik: ['YOUTH ROAD', 'Start at 12, become a legend', 1],
    'lig-ring': ['4 COMBAT SPORTS LEAGUES', 'Boxing, Muay Thai, Grappling, Wrestling', 1],
    menajer: ['MANAGER MODE', 'Cut the deals, win the belt together', 1],
    'patron-giris': ['PROMOTER MODE', 'Build your own promotion', 1],
    antrenor: ['COACH MODE', 'Open your gym, raise a champion'],
    efsane: ['LEGEND ROADS', 'Walk the road of legends'],
    hakem: ['REFEREE MODE', 'Inside the cage, you make the call'],
    yeni: 'NEW',
    banner: ['MMA CAREER GAME', 'Live fights · 11 modes · No pay-to-win'],
  },
  es: {
    dovus: ['PELEAS EN VIVO', 'Pelea en la jaula con tus propias manos'],
    menu: ['NUEVO DISEÑO', '11 modos, un solo juego', 1],
    kemer: ['MODO CARRERA', 'Alza el cinturón, haz historia'],
    genclik: ['CAMINO JUVENIL', 'Empieza a los 12, conviértete en leyenda', 1],
    'lig-ring': ['4 LIGAS DE DEPORTES DE COMBATE', 'Boxeo, Muay Thai, Grappling, Lucha', 1],
    menajer: ['MODO MÁNAGER', 'Negocia y ganad el cinturón juntos', 1],
    'patron-giris': ['MODO PROMOTOR', 'Crea tu propia promotora', 1],
    antrenor: ['MODO ENTRENADOR', 'Abre tu gimnasio, forma un campeón'],
    efsane: ['CAMINOS DE LEYENDA', 'Recorre el camino de las leyendas'],
    hakem: ['MODO ÁRBITRO', 'Dentro de la jaula, tú decides'],
    yeni: 'NUEVO',
    banner: ['JUEGO DE CARRERA MMA', 'Peleas en vivo · 11 modos · Sin pagar para ganar'],
  },
  pt: {
    dovus: ['LUTAS AO VIVO', 'Lute no octógono com as próprias mãos'],
    menu: ['NOVO VISUAL', '11 modos, um só jogo', 1],
    kemer: ['MODO CARREIRA', 'Erga o cinturão, faça história'],
    genclik: ['CAMINHO JOVEM', 'Comece aos 12, vire uma lenda', 1],
    'lig-ring': ['4 LIGAS DE ESPORTES DE COMBATE', 'Boxe, Muay Thai, Grappling, Luta Livre', 1],
    menajer: ['MODO EMPRESÁRIO', 'Negocie e conquistem o cinturão juntos', 1],
    'patron-giris': ['MODO PROMOTOR', 'Crie sua própria organização', 1],
    antrenor: ['MODO TREINADOR', 'Abra sua academia, forme um campeão'],
    efsane: ['CAMINHOS DAS LENDAS', 'Trilhe o caminho das lendas'],
    hakem: ['MODO ÁRBITRO', 'Dentro do octógono, você decide'],
    yeni: 'NOVO',
    banner: ['JOGO DE CARREIRA MMA', 'Lutas ao vivo · 11 modos · Sem pagar para ganhar'],
  },
  ru: {
    dovus: ['БОИ В РЕАЛЬНОМ ВРЕМЕНИ', 'Дерись в клетке своими руками'],
    menu: ['НОВЫЙ ДИЗАЙН', '11 режимов в одной игре', 1],
    kemer: ['РЕЖИМ КАРЬЕРЫ', 'Подними пояс, войди в историю'],
    genclik: ['ПУТЬ ЮНОСТИ', 'Начни в 12 лет, стань легендой', 1],
    'lig-ring': ['4 ЛИГИ ЕДИНОБОРСТВ', 'Бокс, Муай-тай, Грэпплинг, Борьба', 1],
    menajer: ['РЕЖИМ МЕНЕДЖЕРА', 'Веди переговоры и берите пояс вместе', 1],
    'patron-giris': ['РЕЖИМ ПРОМОУТЕРА', 'Создай свою организацию', 1],
    antrenor: ['РЕЖИМ ТРЕНЕРА', 'Открой зал, вырасти чемпиона'],
    efsane: ['ПУТИ ЛЕГЕНД', 'Пройди путь легенд'],
    hakem: ['РЕЖИМ РЕФЕРИ', 'В клетке решаешь ты'],
    yeni: 'НОВОЕ',
    banner: ['MMA: КАРЬЕРА БОЙЦА', 'Живые бои · 11 режимов · Без pay-to-win'],
  },
  pl: {
    dovus: ['WALKI NA ŻYWO', 'Walcz w klatce własnymi rękami'],
    menu: ['NOWY WYGLĄD', '11 trybów, jedna gra', 1],
    kemer: ['TRYB KARIERY', 'Unieś pas, zapisz się w historii'],
    genclik: ['DROGA MŁODZIKA', 'Zacznij w wieku 12 lat, zostań legendą', 1],
    'lig-ring': ['4 LIGI SPORTÓW WALKI', 'Boks, Muay Thai, Grappling, Zapasy', 1],
    menajer: ['TRYB MENEDŻERA', 'Negocjuj i zdobądźcie pas razem', 1],
    'patron-giris': ['TRYB PROMOTORA', 'Zbuduj własną federację', 1],
    antrenor: ['TRYB TRENERA', 'Otwórz klub, wychowaj mistrza'],
    efsane: ['DROGI LEGEND', 'Przejdź drogę legend'],
    hakem: ['TRYB SĘDZIEGO', 'W klatce to ty decydujesz'],
    yeni: 'NOWOŚĆ',
    banner: ['GRA O KARIERZE MMA', 'Walki na żywo · 11 trybów · Bez pay-to-win'],
  },
  it: {
    dovus: ['COMBATTIMENTI DAL VIVO', 'Combatti nella gabbia con le tue mani'],
    menu: ['NUOVO LOOK', '11 modalità, un solo gioco', 1],
    kemer: ['MODALITÀ CARRIERA', 'Alza la cintura, fai la storia'],
    genclik: ['STRADA GIOVANILE', 'Inizia a 12 anni, diventa leggenda', 1],
    'lig-ring': ['4 LEGHE DI SPORT DA COMBATTIMENTO', 'Boxe, Muay Thai, Grappling, Lotta', 1],
    menajer: ['MODALITÀ MANAGER', 'Tratta e vincete la cintura insieme', 1],
    'patron-giris': ['MODALITÀ PROMOTER', 'Fonda la tua organizzazione', 1],
    antrenor: ['MODALITÀ ALLENATORE', 'Apri la palestra, crea un campione'],
    efsane: ['STRADE DELLE LEGGENDE', 'Percorri la strada delle leggende'],
    hakem: ['MODALITÀ ARBITRO', "Dentro la gabbia, decidi tu"],
    yeni: 'NOVITÀ',
    banner: ['GIOCO DI CARRIERA MMA', 'Lotta dal vivo · 11 modalità · Niente pay-to-win'],
  },
  id: {
    dovus: ['PERTARUNGAN LANGSUNG', 'Bertarung di kandang dengan tanganmu sendiri'],
    menu: ['TAMPILAN BARU', '11 mode, satu game', 1],
    kemer: ['MODE KARIER', 'Angkat sabuk, cetak sejarah'],
    genclik: ['JALAN MUDA', 'Mulai di usia 12, jadilah legenda', 1],
    'lig-ring': ['4 LIGA OLAHRAGA TARUNG', 'Tinju, Muay Thai, Grappling, Gulat', 1],
    menajer: ['MODE MANAJER', 'Negosiasi dan rebut sabuk bersama', 1],
    'patron-giris': ['MODE PROMOTOR', 'Bangun organisasimu sendiri', 1],
    antrenor: ['MODE PELATIH', 'Buka sasana, cetak juara'],
    efsane: ['JALAN LEGENDA', 'Tempuh jalan para legenda'],
    hakem: ['MODE WASIT', 'Di dalam kandang, kamu yang memutuskan'],
    yeni: 'BARU',
    banner: ['GAME KARIER MMA', 'Tarung langsung · 11 mode · Tanpa pay-to-win'],
  },
}[lang];

const font = (f) => readFileSync(`${root}/node_modules/@expo-google-fonts/${f}`).toString('base64');
const FONTS = `@font-face{font-family:Os;src:url(data:font/ttf;base64,${font('oswald/700Bold/Oswald_700Bold.ttf')})}
@font-face{font-family:InB;src:url(data:font/ttf;base64,${font('inter/800ExtraBold/Inter_800ExtraBold.ttf')})}
@font-face{font-family:In;src:url(data:font/ttf;base64,${font('inter/600SemiBold/Inter_600SemiBold.ttf')})}`;
const ICON = readFileSync(`${root}/assets/splash-icon.png`).toString('base64');
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true, args: ['--no-sandbox'] });
const g = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// FW×FH tuval; telefon ekranı 390×844 oranında
const frame = async (FW, FH, out) => {
  mkdirSync(out, { recursive: true });
  for (const f of readdirSync(out)) if (/^\d\d-.*\.png$/.test(f)) unlinkSync(`${out}/${f}`);
  await g.setViewport({ width: FW, height: FH, deviceScaleFactor: 1 });
  const K = FW / 1290;
  // Başlığa ayrılan yükseklik; telefon kalan alana sığar
  const capH = Math.round(FH * 0.255);
  const ph = FH - capH - Math.round(70 * K);
  const pw = Math.round((ph * 390) / 844);
  for (const [i, name] of ORDER.entries()) {
    const file = `${raw}/${name}.png`;
    if (!existsSync(file)) { console.log('  ! yok:', name); continue; }
    const [tag, cap, isNew] = TX[name];
    const img = readFileSync(file).toString('base64');
    const big = cap.length > 30 ? 108 : cap.length > 22 ? 124 : 144;
    await g.setContent(`<html><head><style>${FONTS}
*{margin:0;box-sizing:border-box}
body{width:${FW}px;height:${FH}px;overflow:hidden;position:relative;background:radial-gradient(90% 55% at 50% 30%,#fffaf0 0%,#f4ecdc 60%,#e7d8bd 100%);font-family:In}
.st{position:absolute;top:-300px;width:${Math.round(60 * K)}px;height:${FH + 600}px;background:#e63946;opacity:.07;transform:rotate(24deg)}
.top{position:absolute;left:${Math.round(70 * K)}px;right:${Math.round(70 * K)}px;top:${Math.round(110 * K)}px;height:${capH - Math.round(110 * K)}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.tag{display:flex;align-items:center;gap:${Math.round(16 * K)}px;font-family:InB;font-size:${Math.round(54 * K)}px;letter-spacing:${Math.round(5 * K)}px;color:#e63946;margin-bottom:${Math.round(18 * K)}px}
.new{background:#e63946;color:#fff;border-radius:${Math.round(40 * K)}px;padding:${Math.round(8 * K)}px ${Math.round(24 * K)}px;letter-spacing:${Math.round(4 * K)}px}
.cap{font-family:Os;font-size:${Math.round(big * K)}px;line-height:1.06;color:#16120f;transform:skewX(-7deg)}
.ph{position:absolute;left:${Math.round((FW - pw) / 2)}px;top:${capH}px;width:${pw}px;height:${ph}px;border-radius:${Math.round(78 * K)}px;padding:${Math.round(16 * K)}px;background:#111;box-shadow:0 ${Math.round(50 * K)}px ${Math.round(120 * K)}px rgba(60,30,10,.35)}
.ph img{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:${Math.round(62 * K)}px;display:block}
</style></head><body>
${[0, 1, 2].map((k) => `<div class="st" style="left:${Math.round((420 + k * 260) * K)}px"></div>`).join('')}
<div class="top"><div class="tag">${isNew ? `<span class="new">${TX.yeni}</span>` : ''}<span>${tag}</span></div><div class="cap">${cap}</div></div>
<div class="ph"><img src="data:image/png;base64,${img}"/></div>
</body></html>`);
    await sleep(200);
    await g.screenshot({ path: `${out}/${String(i + 1).padStart(2, '0')}-${name}.png` });
  }
};
await frame(1290, 2796, `${root}/store/graphics-ios/${lang}`);
await frame(1080, 1920, `${root}/store/graphics/${lang}`);

// Google Play tanıtım görseli 1024×500
const menu = existsSync(`${raw}/menu.png`) ? readFileSync(`${raw}/menu.png`).toString('base64') : null;
const fight = readFileSync(`${raw}/dovus.png`).toString('base64');
await g.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
await g.setContent(`<html><head><style>${FONTS}
*{margin:0;box-sizing:border-box}
body{width:1024px;height:500px;overflow:hidden;position:relative;background:radial-gradient(80% 90% at 30% 50%,#fffaf0 0%,#f4ecdc 60%,#e7d8bd 100%);font-family:In}
.st{position:absolute;top:-100px;width:26px;height:800px;background:#e63946;opacity:.08;transform:rotate(24deg)}
.l{position:absolute;left:56px;top:70px;width:520px}
.logo{width:120px;filter:drop-shadow(0 10px 24px rgba(230,57,70,.35))}
.yol{font-family:Os;font-size:120px;line-height:1;color:#e63946;letter-spacing:12px;transform:skewX(-8deg);margin-top:4px}
.b1{font-family:Os;font-size:46px;color:#16120f;transform:skewX(-8deg);margin-top:4px}
.b2{font-family:InB;font-size:21px;color:#6f5f4c;margin-top:14px}
.p{position:absolute;top:40px;width:206px;height:446px;border-radius:30px;padding:7px;background:#111;box-shadow:0 24px 50px rgba(60,30,10,.35)}
.p img{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:24px}
</style></head><body>
${[0, 1, 2].map((k) => `<div class="st" style="left:${520 + k * 140}px"></div>`).join('')}
<div class="l"><img class="logo" src="data:image/png;base64,${ICON}"/><div class="yol">YOL</div><div class="b1">${TX.banner[0]}</div><div class="b2">${TX.banner[1]}</div></div>
<div class="p" style="left:560px;transform:rotate(-4deg)"><img src="data:image/png;base64,${fight}"/></div>
${menu ? `<div class="p" style="left:780px;top:20px;transform:rotate(4deg)"><img src="data:image/png;base64,${menu}"/></div>` : ''}
</body></html>`);
await sleep(300);
await g.screenshot({ path: `${root}/store/graphics/${lang}/tanitim-1024x500.png` });
await browser.close();
console.log('🖼️', lang, 'hazır');
