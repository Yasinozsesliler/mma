// Fragman için zengin kariyer kaydı üretir: yeni kariyer açar, store-shots'taki zengin durumu uygular, JSON'a yazar.
// Çalıştırma: CHROME=<chrome> node scripts/zengin-kayit.mjs <çıktı.json>
import { writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = process.argv[2];
const browser = await puppeteer.launch({ executablePath: process.env.CHROME, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.setBypassServiceWorker(true);
await page.evaluateOnNewDocument(() => {
  if (sessionStorage.getItem('hazir')) return;
  sessionStorage.setItem('hazir', '1');
  localStorage.clear();
  localStorage.setItem('yol_dil', 'tr');
  localStorage.setItem('yol_ipucu', '0');
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const up = (s) => s.toLocaleUpperCase('tr');
const click = async (k) => {
  const b = await page.$$eval('[tabindex="0"]', (els) => els.map((e) => e.innerText.trim()));
  const i = b.findIndex((x) => up(x).includes(up(k)));
  if (i < 0) return false;
  try { await (await page.$$('[tabindex="0"]'))[i].click(); } catch { return false; }
  await sleep(300);
  return true;
};
await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
await sleep(900);
await click('YENİ KARİYER');
await click('Hemen başla');
await sleep(800);
const save = await page.evaluate(() => {
  const key = 'yol_kariyer_v1';
  const s = JSON.parse(localStorage.getItem(key));
  const R = ['Diego Alvarez', 'Timur Bekov', 'Jake Morrison', 'Luka Novak', 'Rafael Costa', 'Sean Doyle', 'Arman Petrosyan', 'Marcus Pruitt', 'Dmitri Volkov', 'Caio Moraes', 'Tyler Boone', 'Wei Li', 'Kenji Mori', 'Ivan Sorokin', 'Brody Stroud', 'Luan Farias'];
  const Y = ['KO', 'TKO', 'SUB', 'UD', 'KO', 'SD', 'TKO', 'UD'];
  const orgs = ['amator', 'amator', 'amator', 'cfc', 'cfc', 'cfc', 'cfc', 'pfl', 'pfl', 'pfl', 'pfl', 'pfl', 'pfl', 'pfl', 'pfl', 'pfl'];
  const C = ['vegas', 'tokyo', 'londra', 'prag', 'abudabi', 'rio', 'sidney', 'chicago', 'singapur', 'prag', 'ev', 'ev'];
  s.gecmis = orgs.map((org, i) => ({ rakip: R[i], rakipId: 'r' + i, org, sonuc: i === 4 || i === 9 ? 'M' : 'G', yontem: Y[i % Y.length], raunt: 1 + (i % 3), yas: 21 + Math.floor(i / 3), sehir: C[i % C.length] })).reverse();
  s.stage = 'ufc';
  s.phase = 'hub';
  s.pending = {};
  s.contract = { org: 'ufc', kalan: 4, ucret: 250000, bonus: 250000, munhasir: true };
  s.rank = 2;
  s.populerlik = 85;
  s.seri = 5;
  s.para = 4850000;
  s.amator = { g: 3, m: 0, b: 0 };
  s.rekor = { ...s.rekor, g: 18, m: 2, b: 0, ko: 9, sub: 5, karar: 4 };
  s.fighter.yas = 27;
  s.sehirler = { ev: 4, chicago: 2, londra: 2, prag: 3, tokyo: 1, vegas: 3, rio: 1, sidney: 1, abudabi: 1, singapur: 1 };
  s.haritaOdul = ['c3', 'c6', 'c10', 'k2', 'k3', 'k4', 'k5'];
  s.kemerler = [{ org: 'cfc', siklet: s.fighter.siklet, hafta: 120, yas: 23, savunma: 2, aktif: false }];
  s.marka = { ad: 'Kobra Wear', urunler: { tisort: 'normal', eldiven: 'premium', icecek: 'normal' }, kalite: 4, kampanya: 2, toplam: 1240000, gecmis: [{ kazanc: 180000, adet: 9200 }, { kazanc: 240000, adet: 11800 }, { kazanc: 310000, adet: 14500 }, { kazanc: 510000, adet: 21000 }] };
  s.sponsorlar = [
    { id: 'sp1', marka: 'energo', dovus: 4, dovusBasi: 32000, galibiyet: 12000, bitiris: 6000 },
    { id: 'sp2', marka: 'titaneldiven', dovus: 3, dovusBasi: 4200, galibiyet: 2000, bitiris: 900 },
    { id: 'sp3', marka: 'arslan', dovus: 5, dovusBasi: 2800, galibiyet: 1400, bitiris: 1100 },
  ];
  s.basarimlar =(s.basarimlar ?? []).concat(['ilk', 'pro', 'ilkko', 'seri3', 'seri5', 'kemer1']);
  return s;
});
writeFileSync(OUT, JSON.stringify(save));
console.log('✅ kayıt', Object.keys(save).length, 'alan');
await browser.close();
