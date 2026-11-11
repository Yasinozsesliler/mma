// App Store sayfa testi (Product Page Optimization) için B seti: ilk 3 görsel.
// Mevcut ham çekimleri (store/graphics-ios/<dil>/ham) kullanır; oyunu yeniden oynatmaz.
// Farklar: oyun türünü ilk bakışta söyleyen kahraman görsel, ekranlar büyük ve kırpılmış (boşluk yok),
// alt başlık, daha parlak arka plan, özellik etiketleri.
// Çalıştırma: node scripts/store-shots-b.mjs [tr|en|es|pt|ru|pl]  → store/graphics-ios-b/<dil>/01..03
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const lang = process.argv[2] ?? 'en';
const root = fileURLToPath(new URL('..', import.meta.url));
const raw = `${root}/store/graphics-ios/${lang}/ham`;
const out = `${root}/store/graphics-ios-b/${lang}`;
mkdirSync(out, { recursive: true });
const FW = 1290;
const FH = 2796;

const TX = {
  en: {
    quote: "Coach: “He’s dancing on the outside. Apply pressure!”",
    hero: ['MMA CAREER', 'SIMULATOR'],
    heroSub: 'From street fights to world champion',
    chips: ['Fight live', 'Plan every round', 'No pay-to-win'],
    belt: ['WIN THE BELT', 'Climb the rankings, beat the champ, make history'],
    plan: ['OUTSMART THEM', 'Read your opponent and change the plan between rounds'],
  },
  tr: {
    quote: "Hoca: “Dışarıda dans ediyor. Baskı kur!”",
    hero: ['MMA KARİYER', 'SİMÜLASYONU'],
    heroSub: 'Sokak dövüşlerinden dünya şampiyonluğuna',
    chips: ['Canlı dövüş', 'Her raundu planla', 'Güç satılmaz'],
    belt: ['KEMERİ AL', 'Sıralamada yüksel, şampiyonu yen, tarihe geç'],
    plan: ['RAKİBİNİ OKU', 'Raunt aralarında taktiği değiştir, rakibini şaşırt'],
  },
  es: {
    quote: "Entrenador: “Baila por fuera. ¡Presiona!”",
    hero: ['SIMULADOR DE', 'CARRERA MMA'],
    heroSub: 'De peleas callejeras a campeón del mundo',
    chips: ['Pelea en vivo', 'Planea cada asalto', 'Sin pagar para ganar'],
    belt: ['GANA EL CINTURÓN', 'Sube en el ranking, vence al campeón, haz historia'],
    plan: ['SUPERA A TU RIVAL', 'Lee a tu rival y cambia el plan entre asaltos'],
  },
  pt: {
    quote: "Treinador: “Ele dança por fora. Pressiona!”",
    hero: ['SIMULADOR DE', 'CARREIRA MMA'],
    heroSub: 'Das brigas de rua a campeão mundial',
    chips: ['Luta ao vivo', 'Planeje cada round', 'Sem pagar para ganhar'],
    belt: ['CONQUISTE O CINTURÃO', 'Suba no ranking, vença o campeão, faça história'],
    plan: ['SUPERE O RIVAL', 'Leia o adversário e mude o plano entre os rounds'],
  },
  ru: {
    quote: "Тренер: «Он танцует на дистанции. Дави!»",
    hero: ['СИМУЛЯТОР', 'КАРЬЕРЫ ММА'],
    heroSub: 'От уличных боёв до чемпиона мира',
    chips: ['Бои вживую', 'План на каждый раунд', 'Без pay-to-win'],
    belt: ['ЗАБЕРИ ПОЯС', 'Поднимись в рейтинге, победи чемпиона, войди в историю'],
    plan: ['ПЕРЕХИТРИ СОПЕРНИКА', 'Читай соперника и меняй план между раундами'],
  },
  pl: {
    quote: "Trener: „Tańczy na dystansie. Naciskaj!”",
    hero: ['SYMULATOR', 'KARIERY MMA'],
    heroSub: 'Od walk ulicznych do mistrza świata',
    chips: ['Walka na żywo', 'Plan na każdą rundę', 'Bez pay-to-win'],
    belt: ['ZDOBĄDŹ PAS', 'Wspinaj się w rankingu, pokonaj mistrza, zapisz się w historii'],
    plan: ['PRZECHYTRZ RYWALA', 'Czytaj rywala i zmieniaj plan między rundami'],
  },
}[lang];
if (!TX) throw new Error('dil yok: ' + lang);

const font = (f) => readFileSync(`${root}/node_modules/@expo-google-fonts/${f}`).toString('base64');
const OS = font('oswald/700Bold/Oswald_700Bold.ttf');
const INTER = font('inter/600SemiBold/Inter_600SemiBold.ttf');
const img = (n) => `data:image/png;base64,${readFileSync(`${raw}/${n}.png`).toString('base64')}`;

const BASE = `
@font-face{font-family:Os;src:url(data:font/ttf;base64,${OS})}
@font-face{font-family:In;src:url(data:font/ttf;base64,${INTER})}
*{box-sizing:border-box}
body{margin:0;width:${FW}px;height:${FH}px;overflow:hidden;position:relative;font-family:In;color:#fff;
 background:radial-gradient(120% 70% at 50% 0%,#a3162a 0%,#5a0c18 38%,#1a0609 72%,#0a0506 100%)}
.glow{position:absolute;left:50%;width:1400px;height:1400px;margin-left:-700px;border-radius:50%;background:radial-gradient(circle,rgba(242,193,78,.28),rgba(242,193,78,0) 60%)}
.h1{position:absolute;left:60px;right:60px;text-align:center;font-family:Os;line-height:.98;transform:skewX(-8deg);text-shadow:0 8px 40px rgba(0,0,0,.55)}
.sub{position:absolute;left:90px;right:90px;text-align:center;font-size:54px;line-height:1.25;color:#ffe3a3}
.card{position:absolute;overflow:hidden;border-radius:48px;border:8px solid #f2c14e;box-shadow:0 50px 140px rgba(0,0,0,.7)}
.card img{position:absolute;left:0;width:100%}
.chips{position:absolute;left:60px;right:60px;display:flex;flex-wrap:wrap;justify-content:center;gap:22px}
.chip{background:rgba(0,0,0,.55);border:3px solid #f2c14e;border-radius:60px;padding:22px 38px;font-size:46px;color:#fff}
.quote{position:absolute;left:110px;right:110px;padding:40px 50px;border-radius:40px;background:#0d0f13;border:4px solid #f2c14e;font-size:56px;line-height:1.3;color:#fff;box-shadow:0 30px 90px rgba(0,0,0,.6)}
.yol{position:absolute;bottom:56px;left:0;right:0;text-align:center;font-family:Os;font-size:58px;letter-spacing:22px;color:#f2c14e}
`;

// Ham çekim 1170×2532. Kart içinde görüntüyü `top` kadar yukarı kaydırarak kırpar.
const crop = (src, { left, top, w, h, shift, rot = 0 }) =>
  `<div class="card" style="left:${left}px;top:${top}px;width:${w}px;height:${h}px;transform:rotate(${rot}deg)"><img src="${src}" style="top:${-shift}px"/></div>`;

const pages = {
  // 1) Kahraman: tür + vaat + gerçek dövüş ekranı
  '01-hero': `
<div class="glow" style="top:900px"></div>
<div class="h1" style="top:120px;font-size:${TX.hero[0].length > 11 ? 150 : 172}px;color:#fff">${TX.hero[0]}<br><span style="color:#f2c14e">${TX.hero[1]}</span></div>
<div class="sub" style="top:520px">${TX.heroSub}</div>
${crop(img('dovus'), { left: 95, top: 690, w: 1100, h: 1465, shift: 545 * (1100 / 1170) })}
<div class="chips" style="top:2250px">${TX.chips.map((c) => `<div class="chip">${c}</div>`).join('')}</div>
<div class="yol">YOL</div>`,
  // 2) Kemer
  '02-kemer': `
<div class="glow" style="top:1100px"></div>
<div class="h1" style="top:130px;font-size:${TX.belt[0].length > 14 ? 140 : 170}px;color:#f2c14e">${TX.belt[0]}</div>
<div class="sub" style="top:350px">${TX.belt[1]}</div>
${crop(img('kemer'), { left: 70, top: 600, w: 1150, h: 1935, shift: 330 * (1150 / 1170) })}
<div class="yol">YOL</div>`,
  // 3) Taktik
  '03-taktik': `
<div class="glow" style="top:1100px"></div>
<div class="h1" style="top:130px;font-size:${TX.plan[0].length > 14 ? 130 : 160}px;color:#fff">${TX.plan[0]}</div>
<div class="sub" style="top:350px">${TX.plan[1]}</div>
<div class="quote" style="top:560px">${TX.quote}</div>
${crop(img('taktik'), { left: 70, top: 900, w: 1150, h: 1520, shift: 1035 * (1150 / 1170) })}
<div class="yol">YOL</div>`,
};

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
const g = await browser.newPage();
await g.setViewport({ width: FW, height: FH, deviceScaleFactor: 1 });
for (const [name, html] of Object.entries(pages)) {
  await g.setContent(`<html><head><style>${BASE}</style></head><body>${html}</body></html>`);
  await new Promise((r) => setTimeout(r, 300));
  await g.screenshot({ path: `${out}/${name}.png` });
}
await browser.close();
console.log('B seti:', lang, Object.keys(pages).join(', '));
