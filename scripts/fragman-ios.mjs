// Sosyal medya fragmanları (dikey 1080×1920, ~30 sn): siyah kartlarla merak uyandıran açılış, oyundan gerçek kayıtlar,
// gerilim kartları ve kapanış. Reels / TikTok / Shorts için; YouTube'a yüklenip Play Console'a da bağlanabilir.
//   ana    : dövüş gecesi, canlı dövüş, kamp, zafer, pasaport, ev, organizasyon, kemer
//   taktik : rakip analizi, oyun planı, taktik modunda raunt planı, kritik an, köşe, nakavt
//   yasam  : sosyal medya, gece hayatı, flört, oyun salonu, marka, sponsorlar, lüks, kemer
// Önce: CI=1 npm run build:web  ve  npx serve dist -s -l 8088
// Çalıştırma: node scripts/fragman.mjs <ffmpeg.exe> <zengin-kayit.json> [ana|taktik|yasam] [yakinda|yayinda]
//   zengin-kayit.json: ev, pasaport damgaları, organizasyon ve kemerleri olan bir kariyer kaydı (oyun içinden ya da simülasyondan).
// Çıktı: store/video/fragman-<video>-<yakinda|yayinda>.mp4
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const FF = process.argv[2];
const RICH = process.argv[3];
const VIDEO = ['taktik', 'yasam', 'insta', 'modlar', 'pedia'].includes(process.argv[4]) ? process.argv[4] : 'ana';
const MODE = process.argv.slice(4).includes('yayinda') ? 'yayinda' : 'yakinda';
if (!FF || !existsSync(FF)) throw new Error('ffmpeg yolu gerekli');
if (!RICH || !existsSync(RICH)) throw new Error('zengin kariyer kaydı (json) gerekli');
const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = `${root}/store/video/fragman-parca-${VIDEO}`;
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

// Sahne listesi: kart (siyah ekranda yazı) ya da kayıt (telefon çerçevesinde oyun + üstte başlık).
// [ad, tür, başlık, alt başlık, süre, kaynak kayıt (yoksa ad), başlangıç(işaretler) (yoksa otomatik)]
// Başlangıcı bir işarete bağlı sahne, o an kayıtta yaşanmadıysa (ör. kritik an çıkmadı) videodan çıkarılır.
const VIDEOS = {
  ana: [
    ['c1', 'kart', 'HER EFSANE', '', 1.5],
    ['c2', 'kart', 'BİR YERDEN BAŞLAR.', '', 1.7],
    ['walk', 'kayit', 'ADIN ANONS EDİLSİN', 'DÖVÜŞ GECESİ', 3.4],
    ['fight', 'kayit', 'KAFESTE SEN DÖVÜŞÜRSÜN', 'CANLI · GERÇEK ZAMANLI', 3.0],
    ['camp', 'kayit', 'KAMPINI YÖNET', 'HER KARAR İZ BIRAKIR', 2.6],
    ['win', 'kayit', 'ZAFERİ TAT', 'AMATÖRDEN DÜNYA SAHNESİNE', 2.6],
    ['world', 'kayit', 'DÜNYAYI DOLAŞ', '46 ŞEHİR · 6 KITA', 2.4],
    ['home', 'kayit', 'KAFESİN DIŞINDA BİR HAYAT', 'EV · AİLE · KOLEKSİYON', 2.3],
    ['league', 'kayit', 'EMEKLİ OL, PATRON OL', 'KENDİ ORGANİZASYONUN', 2.4],
    ['c3', 'kart', 'AMA KEMER…', '', 1.4],
    ['c4', 'kart', 'HERKESE NASİP OLMAZ.', '', 1.7],
    ['belt', 'kayit', 'TARİHE GEÇ', 'DÜNYA ŞAMPİYONU', 3.3],
  ],
  taktik: [
    ['c1', 'kart', 'GÜÇLÜ OLAN DEĞİL', '', 1.5],
    ['c2', 'kart', 'AKILLI OLAN KAZANIR.', '', 1.7],
    ['scout', 'kayit', 'RAKİBİNİ OKU', 'ZAYIF YÖNÜNÜ BUL', 2.6],
    ['plan', 'kayit', 'OYUN PLANINI KUR', 'ODAK · TAKTİK · YOĞUNLUK', 2.6],
    ['tac1', 'kayit', 'HER RAUNDA BİR PLAN', 'BASKI · GÜREŞ · SUBMISSION', 2.6, 'mac', (m) => m.plan1],
    ['flow', 'kayit', 'MAÇ GÖZÜNÜN ÖNÜNDE AKAR', 'HER HAMLE CANLI ANLATIMLA', 2.6, 'mac', (m) => m.akis],
    ['qte', 'kayit', 'KRİTİK ANDA DEVREYE GİR', 'SIK! · VUR! · KAÇ!', 2.6, 'mac', (m) => m.qte],
    ['corner', 'kayit', 'KÖŞENİ DİNLE', 'RAUNT ARASI 60 SANİYE', 2.6, 'mac', (m) => m.kose],
    ['c3', 'kart', 'BİR HAMLE', '', 1.3],
    ['c4', 'kart', 'HER ŞEYİ DEĞİŞTİRİR.', '', 1.7],
    ['ko', 'kayit', 'PLAN İŞLEDİ', 'NAKAVT', 3.0, 'mac', (m) => (m.son == null ? null : m.son - 0.4)],
    ['finish', 'kayit', 'ZAFER SENİN', 'KAFES İÇİ RÖPORTAJ', 2.6, 'win', () => 0.2],
  ],
  yasam: [
    ['c1', 'kart', 'ŞÖHRET', '', 1.4],
    ['c2', 'kart', 'KAFESTE BİTMEZ.', '', 1.7],
    ['social', 'kayit', 'SOSYAL MEDYAYI YÖNET', 'KRİZİ FIRSATA ÇEVİR', 2.8],
    ['night', 'kayit', 'ŞEHRİN IŞIKLARI', 'EĞLENCELİ, PAHALI, RİSKLİ', 2.6],
    ['date', 'kayit', 'AŞKI BUL', 'EŞLEŞ · EVLEN · AİLE KUR', 2.6],
    ['dart', 'kayit', 'OYUN SALONU', 'DART · YUMRUK MAKİNESİ', 2.8],
    ['brand', 'kayit', 'KENDİ MARKANI KUR', 'TİŞÖRT · ELDİVEN · İÇECEK', 2.4],
    ['team', 'kayit', 'SPONSORLAR KAPINDA', 'TAKIM · MENAJER · SPONSOR', 2.4],
    ['lux', 'kayit', 'LÜKSÜN TADINI ÇIKAR', 'SAAT · ARABA · SANAT', 2.3],
    ['c3', 'kart', 'AMA UNUTMA:', '', 1.3],
    ['c4', 'kart', 'KEMER KAFESTE KAZANILIR.', '', 1.8],
    ['belt', 'kayit', 'TARİHE GEÇ', 'DÜNYA ŞAMPİYONU', 3.3],
  ],
  insta: [
    ['c1', 'kart', 'KAFESTE DÖVÜŞ.', '', 1.5],
    ['c2', 'kart', "KAFESGRAM'DA PARLA.", '', 1.7],
    ['feed', 'kayit', 'AKIŞINI TAKİP ET', 'RAKİPLER · MEDYA · TARAFTAR', 3.0],
    ['story', 'kayit', 'HİKÂYELERİ İZLE', 'ŞAMPİYONLAR NE PAYLAŞIYOR?', 2.6],
    ['photo', 'kayit', 'FOTOĞRAFINI PAYLAŞ', 'FİLTRE · AÇIKLAMA · PRO ÇEKİM', 3.7],
    ['profile', 'kayit', 'PROFİLİNİ BÜYÜT', 'TAKİPÇİ · BEĞENİ · ÖNE ÇIKANLAR', 2.8],
    ['dm', 'kayit', "DM'LERE CEVAP VER", 'RAKİP · SPONSOR · HAYRAN', 3.3],
    ['trash', 'kayit', 'RAKİBİNİ ETİKETLE', 'TRASH TALK · MEYDAN OKU', 3.2],
    ['board', 'kayit', 'ZİRVEYE TIRMAN', 'EN ÇOK TAKİP EDİLENLER', 2.6],
    ['c3', 'kart', 'TAKİPÇİ GÜÇTÜR.', '', 1.4],
    ['c4', 'kart', 'AMA KEMER KAFESTE KAZANILIR.', '', 1.8],
    ['belt', 'kayit', 'TARİHE GEÇ', 'DÜNYA ŞAMPİYONU', 3.0],
  ],
  // 1.1.0 güncellemesi: Hakem Modu ve Antrenör Modu
  modlar: [
    ['c1', 'kart', 'YOL GÜNCELLENDİ!', '', 1.4],
    ['c2', 'kart', 'ARTIK SADECE DÖVÜŞÇÜ DEĞİLSİN.', '', 1.9],
    ['hakem1', 'kayit', 'YENİ: HAKEM MODU', 'KAFESİN İÇİNDEKİ ÜÇÜNCÜ KİŞİ SENSİN', 3.0],
    ['hakem2', 'kayit', 'FAULDE KARARI SEN VER', 'UYARI · PUAN DÜŞ · DİSKALİFİYE', 3.2],
    ['hakem3', 'kayit', 'PUAN KARTINI DOLDUR', '10-9 MU, 10-8 Mİ?', 2.7],
    ['coach1', 'kayit', 'YENİ: ANTRENÖR MODU', 'KENDİ SALONUNU KUR', 2.8],
    ['coach2', 'kayit', 'ŞAMPİYONUNU YETİŞTİR', 'ÖĞRENCİ SEÇ · KAMP KUR', 2.8],
    ['coach3', 'kayit', 'OYUN PLANINI ÇİZ', 'KEŞİF RAPORU · RAKİBİ OKU', 3.0],
    ['coach4', 'kayit', 'KÖŞEDE SEN VARSIN', 'RAUNT ARASI TALİMAT VER', 3.3],
    ['c3', 'kart', 'DÖVÜŞ. YARGILA. YETİŞTİR.', '', 1.7],
    ['c4', 'kart', 'İKİ YENİ MOD · ÜCRETSİZ DENE', '', 1.9],
  ],
  // Kafespedia: "bu sayfa bir dövüşçüye ait… o dövüşçü sensin" (tam ekran açılış, belgesel, lüks, Kafesgram, stil)
  // 'tam' sahne: telefon çerçevesi yok; t = alttaki büyük yazı ("üst|alt"), s = üstteki sarı etiket
  pedia: [
    ['hook1', 'tam', 'BU SAYFA|BİR DÖVÜŞÇÜYE AİT', '', 2.0, 'wiki', () => 0.2],
    ['hook2', 'tam', 'O DÖVÜŞÇÜ|SENSİN', '', 1.7, 'wiki', (m) => m.kay ?? 2.2],
    ['pedia', 'kayit', 'KARİYERİN SATIR SATIR YAZILIYOR', 'KAFESPEDIA', 2.7, 'wiki2', () => 0.2],
    ['doc', 'tam', '', 'KARİYER BELGESELİN', 5.6, 'doc', () => 0.15],
    ['lux', 'kayit', 'SÜPER ARABA, YAT, JET', 'ŞAMPİYON GİBİ YAŞA', 2.6],
    ['gram', 'kayit', 'MİLYONLARCA TAKİPÇİ', 'KAFESGRAM PROFİLİN', 2.5],
    ['stil', 'kayit', 'SAÇ, SAKAL, DÖVME', 'TARZINI SEN SEÇ', 2.7],
  ],
};
let SCENES = VIDEOS[VIDEO];
const END_SEC = 3.8;
const END_TXT = VIDEO === 'pedia' ? ['APP STORE · GOOGLE PLAY', 'ÜCRETSİZ İNDİR'] : ["APP STORE'DA ŞİMDİ", 'ÜCRETSİZ İNDİR'];

const browser = await puppeteer.launch({ executablePath: process.env.CHROME, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const VW = 540;
const VH = 960;
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
// Çevrimdışı önbellek (service worker) güncellenince sayfayı yeniler; kayıt sırasında devre dışı
await page.setBypassServiceWorker(true);
page.on('framenavigated', (f) => f === page.mainFrame() && console.log('↻ sayfa yüklendi'));
await page.evaluateOnNewDocument((taktik) => {
  if (sessionStorage.getItem('hazir')) return;
  sessionStorage.setItem('hazir', '1');
  localStorage.clear();
  localStorage.setItem('yol_dil', 'tr');
  localStorage.setItem('yol_spiker', '0');
  localStorage.setItem('yol_ipucu', '0');
  localStorage.setItem('yol_canli_rehber', '1'); // canlı dövüş öğreticisi görülmüş
  localStorage.setItem('yol_satinalim', JSON.stringify(['paket_altin', 'hakem_modu', 'antrenor_modu']));
  localStorage.setItem('yol_kozmetik', JSON.stringify({ equip: { sort: 'sort_altin', eldiven: 'eld_altin', cerceve: 'cer_altin', kemer: 'kem_altin', giris: 'gir_epik' }, acik: [], yeni: [] }));
  if (taktik) localStorage.setItem('yol_canli', '0'); // dövüş taktik modunda: raunt planı, akış, kritik anlar
}, VIDEO === 'taktik');
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const up = (s) => s.toLocaleUpperCase('tr');
const buttons = () => page.$$eval('[tabindex="0"]', (els) => els.map((e) => e.innerText.trim()));
const body = () => page.$eval('body', (b) => b.innerText);
async function click(k) {
  const b = await buttons();
  const i = b.findIndex((x) => up(x).includes(up(k)));
  if (i < 0) return false;
  try { await (await page.$$('[tabindex="0"]'))[i].click(); } catch { await sleep(200); return false; }
  await sleep(220);
  return true;
}
const KEY = 'yol_kariyer_v1';
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
// Canlı dövüş düğmeleri yalnızca gerçek fare basışına tepki verir
const pressLive = async (label) => {
  const box = await page.evaluate((label) => {
    const el = [...document.querySelectorAll('div')].filter((d) => d.innerText?.trim() === label).pop();
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, up(label));
  if (!box) return;
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await sleep(40);
  await page.mouse.up();
};

// Kayıt: Chrome ekran akışından kareler (zaman damgalı) alınır, ffmpeg ile sabit 30 fps videoya çevrilir.
// (page.screencast ardışık kayıtlarda durup sayfayı dondurabiliyordu.)
const segs = {};
const rec = async (name, fn) => {
  const cdp = await page.createCDPSession();
  const frames = [];
  cdp.on('Page.screencastFrame', (f) => {
    frames.push({ data: f.data, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => undefined);
  });
  // Görünmez sürekli animasyon: tarayıcı her karede çizer, ekran akışı kare kaçırmaz
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.id = 'kayit-nabiz';
    d.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:99999;animation:kayitNabiz 0.5s linear infinite';
    const st = document.createElement('style');
    st.id = 'kayit-nabiz-css';
    st.textContent = '@keyframes kayitNabiz{from{transform:translateX(0)}to{transform:translateX(1px)}}';
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
  // Video zamanı ilk karede başlar: işaretleri ona göre kaydır
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

// ---------- Ortak adımlar ----------
const SAVE = readFileSync(RICH, 'utf8');
const show = async (phase, extra = '') => {
  await page.evaluate((SAVE, phase, extra, KEY) => {
    const s = JSON.parse(SAVE);
    s.ipuclari = ['hub', 'gelisim', 'rakip', 'kamp', 'plan', 'yuzyuze', 'dovus', 'macSonrasi'];
    s.phase = phase;
    new Function('s', extra)(s);
    localStorage.setItem(KEY, JSON.stringify(s));
  }, SAVE, phase, extra, KEY);
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(900);
  await click('DEVAM ET');
  await sleep(1300);
};
const recBelt = async () => {
  await show('kutlama', "s.pending = {}; s.kutlama = { tur: 'kemer', org: 'ufc', siklet: s.fighter.siklet };");
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(600);
  await click('DEVAM ET');
  await sleep(150);
  await rec('belt', async () => sleep(3600));
};
const newCareer = async () => {
  await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
  // Önceki denemenin kariyeri silinir: her deneme boş menüden başlar
  await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('yol_kariyer') || k === 'yol_aktif_yuva').forEach((k) => localStorage.removeItem(k)));
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(900);
  await click('YENİ KARİYER');
  await click('Hemen başla');
  await sleep(500);
  await edit("s.ipuclari = ['hub','gelisim','rakip','kamp','plan','yuzyuze','dovus','macSonrasi'];");
};
/** İlk çok satırlı seçenek kartı (menü düğmeleri hariç). */
const firstChoice = async () => {
  const b = await buttons();
  const i = b.findIndex((x) => x.split('\n').length >= 2 && !/ANA MENÜ|HAFTANIN SEANSI|DOLAP|GÜNÜN/.test(up(x)));
  if (i < 0) return false;
  try { await (await page.$$('[tabindex="0"]'))[i].click(); } catch { return false; }
  await sleep(300);
  return true;
};
const PRI = ['DÖVÜŞ AYARLA', 'Bu rakibi seç', 'Hocanın planıyla başla', 'KAMPA BAŞLA', 'Birkaç gün dinlen', 'Ekstra seansı ekle', 'Diyete şimdi başla', 'Ertesi gün sen de sert gir', 'Birlikte koş', 'Dinle', 'Kapı orada', 'Kardeşim benim 🤝', 'Devam', 'Son 48 saat: kilonu ver', 'Ter kıyafetiyle koşu', 'Tartıya çık', 'Yüz yüze gel', 'Soğukkanlı bak', 'Dövüş gecesi'];
/** Kamptan kulise: karar kartlarında ilk seçenek; dövüş gecesinden önce güçler ayarlanır. */
const toKulis = async ({ recCamp = false, pStat = 88, oStat = 28 } = {}) => {
  let campDone = !recCamp;
  for (let i = 0; i < 140; i++) {
    const b = await buttons();
    const has = (k) => b.some((x) => up(x).includes(up(k)));
    if (has('KAFESE YÜRÜ')) break;
    // Kamp kendiliğinden akarken kaydet (haftalar ilerler, karar kartı belirir)
    if (!campDone && has('Hızlandır')) {
      campDone = true;
      // Haftalar akar; karar kartı çıkınca seçilir, sonuç görünür, kamp akmaya devam eder
      await rec('camp', async () => {
        for (let k = 0; k < 5; k++) {
          await sleep(1000);
          for (const p of PRI.slice(4, 13)) if (await click(p)) break;
        }
      });
      continue;
    }
    if (has('Atla, kamp aksın')) {
      await click('Atla, kamp aksın');
      continue;
    }
    if (has('Hızlandır')) {
      await click('Hızlandır');
      continue;
    }
    // Dövüş gecesinden önce: anonsta görünecek rekor ve güç dengesi
    if (has('Dövüş gecesi')) await edit(`s.amator = { g: 9, m: 1, b: 0 }; Object.keys(s.fighter.stats).forEach((k) => (s.fighter.stats[k] = ${pStat})); const r = s.pending.rakip; if (r) { r.stil = "boks"; Object.keys(r.stats).forEach((k) => (r.stats[k] = ${oStat})); }`);
    let ok = false;
    for (const p of PRI) if (await click(p)) { ok = true; break; }
    if (ok) continue;
    // Kendi planladığın kamp: odak, plan ve yoğunlukta ilk seçenek
    const st = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY))?.pending?.kamp?.step, KEY);
    if (!(['focus', 'plan', 'intensity'].includes(st) && (await firstChoice()))) await sleep(400);
  }
};

if (VIDEO === 'ana') {
  // ---------- A) Yeni kariyer: kamp, dövüş gecesi, canlı dövüş, zafer ----------
  await newCareer();
  await toKulis({ recCamp: true });
  // Kulis → kafese yürüyüş → kırmızı köşe anonsu
  await sleep(2500);
  await rec('walk', async (now) => {
    await sleep(900);
    const yuru = now();
    await click('KAFESE YÜRÜ');
    let ann = null;
    for (let i = 0; i < 80; i++) {
      if (!ann && /VE (KIRMIZI|MAVİ) KÖŞEDE/.test(await body())) ann = now();
      if (ann && now() - ann > 2.6) break;
      await sleep(150);
    }
    return { yuru, ann };
  });
  await page.mouse.click(VW / 2, VH / 2); // anonsu geç
  for (let i = 0; i < 30 && !(await body()).includes('CANLI DÖVÜŞ'); i++) await sleep(300);
  await click('Baskı kur');
  await sleep(2200);
  await rec('fight', async () => {
    // Direkt ve tekme rakibin hazırlığını keser: ayakta, vuran taraf biz olalım
    for (const k of ['DİREKT', 'JAB', 'TEKME', 'DİREKT', 'JAB', 'DİREKT', 'TEKME', 'JAB', 'DİREKT', 'TEKME', 'DİREKT', 'JAB']) {
      await pressLive(k);
      await sleep(330);
    }
  });
  // Maçın kalanı taktik modunda; maç sonu ekranı (KAZANDIN) kaydedilir
  for (let i = 0; i < 90 && !(await body()).includes('MAÇ AKIYOR'); i++) await sleep(500);
  const FIGHT = ['ATLA', 'Aynı planla', 'Bitirmeye git', 'Sık, bitir', 'Sabırla savun', 'Takedown dene', 'Baskı kur'];
  let tactic = false;
  for (let i = 0; i < 300; i++) {
    const txt = await body();
    if (!tactic && txt.includes('TAKTİK İZLE')) {
      await click('TAKTİK İZLE');
      tactic = true;
      continue;
    }
    if (await click('Dövüş sonrası')) {
      await sleep(150);
      break;
    }
    let ok = false;
    for (const p of FIGHT) if (await click(p)) { ok = true; break; }
    if (!ok) {
      const b = await buttons();
      let j = b.findIndex((x) => /^1\n/.test(x));
      if (j < 0) j = b.findIndex((x) => x.split('\n').length >= 3);
      if (j >= 0) try { await (await page.$$('[tabindex="0"]'))[j].click(); } catch {}
      await sleep(350);
    }
  }
  await rec('win', async () => sleep(3400));

  // ---------- B) Zengin kariyer kaydı: pasaport, ev, organizasyon, kemer ----------
  await show('pasaport');
  await rec('world', async () => {
    await sleep(250);
    await smoothScroll(760, 2300);
    await sleep(300);
  });
  await show('evim');
  await rec('home', async () => {
    await sleep(500);
    await smoothScroll(260, 1800);
    await sleep(300);
  });
  await show('lig', "s.pending = { ...(s.pending ?? {}), sonrakiFaz: 'emeklilik' };");
  await rec('league', async () => {
    await sleep(500);
    await smoothScroll(420, 2200);
    await sleep(300);
  });
  await recBelt();
} else if (VIDEO === 'taktik') {
  // Dövüş biraz şansa bağlı: kritik an ve nakavt yakalanana kadar (en fazla 3 kez) baştan kaydedilir
  for (let deneme = 1; deneme <= 3; deneme++) {
    // ---------- Taktik: rakip seçimi, oyun planı, taktik modunda tüm maç ----------
    await newCareer();
    await click('DÖVÜŞ AYARLA');
    await sleep(900);
    await rec('scout', async () => {
      await sleep(500);
      await smoothScroll(320, 1700);
      await sleep(500);
    });
    await click('Bu rakibi seç');
    await sleep(700);
    await rec('plan', async () => {
      await sleep(600);
      await click('Kendim planlayayım');
      // Plan ekranı: süre, kamp yeri ve odak; rakibin zayıf yönüne göre odak değiştirilir
      await sleep(1000);
      await click('Kondisyon');
      await sleep(700);
      await smoothScroll(360, 1300);
      await sleep(600);
    });
    // Uzun bir maç için dengeli güçler
    await toKulis({ pStat: 90, oStat: 50 });
    await click('KAFESE YÜRÜ');
    for (let i = 0; i < 40 && !/VE (KIRMIZI|MAVİ) KÖŞEDE/.test(await body()); i++) await sleep(250);
    await sleep(1500);
    await page.mouse.click(VW / 2, VH / 2); // anonsu geç
    await sleep(900);
    const pressAt = async (sel, n, gap) => {
      for (let k = 0; k < n; k++) {
        const box = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }, sel);
        if (!box) return;
        await page.mouse.move(box.x, box.y);
        await page.mouse.down();
        await sleep(30);
        await page.mouse.up();
        await sleep(gap);
      }
    };
    const TAKTIK = ['Bitirmeye git', 'Sık, bitir', 'Baskı kur', 'Aynı planla'];
    await rec('mac', async (now) => {
      const m = {};
      const t0 = Date.now();
      while (Date.now() - t0 < 120000) {
        const txt = await body();
        if (up(txt).includes('KAZANAN')) {
          m.son ??= now();
          if (now() - m.son > 2.5) break;
          await sleep(200);
          continue;
        }
        // Kritik an (mini oyun penceresi)
        if (await page.$('[data-testid="qte-mash"]')) {
          m.qte ??= now() - 0.9;
          await pressAt('[data-testid="qte-mash"]', 30, 70);
          continue;
        }
        if (await page.$('[data-testid="qte-target"]')) {
          m.qte ??= now() - 0.9;
          await pressAt('[data-testid="qte-target"]', 1, 120);
          continue;
        }
        if (await page.$('[data-testid="qte-L"]')) {
          m.qte ??= now() - 0.9;
          await pressAt(Math.random() < 0.5 ? '[data-testid="qte-L"]' : '[data-testid="qte-R"]', 1, 200);
          continue;
        }
        // Raunt arası köşe: hocayı dinle, sonra planı değiştir
        if (txt.includes('KÖŞE · 60 SANİYE')) {
          if (m.kose == null) {
            m.kose = now() - 0.2;
            await sleep(2600);
          }
          for (const p of TAKTIK) if (await click(p)) break;
          await sleep(400);
          continue;
        }
        // Raunt planı listesi (ilk raunt): bir an göster, sonra baskı
        const b = await buttons();
        if (b.some((x) => up(x).includes('BASKI KUR'))) {
          if (m.plan1 == null) {
            m.plan1 = Math.max(0, now() - 0.3);
            await sleep(1800);
            await click('Baskı kur');
            m.akis = now() + 0.4;
            // Akış sahnesi kaydedildikten sonra maç 2 kat hızlı aksın
            setTimeout(() => void click('2x'), 4200);
            continue;
          }
        }
        // Kritik karar kartları (bitirmeye git vb.)
        let ok = false;
        for (const p of TAKTIK) if (await click(p)) { ok = true; break; }
        if (!ok) await sleep(300);
      }
      return m;
    });
    await click('Dövüş sonrası');
    await sleep(150);
    await rec('win', async () => sleep(3600));
    const mk = segs.mac?.marks ?? {};
    if (mk.qte != null && mk.son != null) break;
    console.log('↺ kritik an ya da nakavt yok, yeniden deneniyor', deneme);
  }
} else if (VIDEO === 'pedia') {
  // ---------- Kafespedia, belgesel, lüks, Kafesgram, stil (tek bir şampiyonun kariyeri) ----------
  const tap = async (k, { exact = false } = {}) => {
    const box = await page.evaluate((k, exact) => {
      const up = (s) => (s || '').trim().toLocaleUpperCase('tr');
      const els = [...document.querySelectorAll('[tabindex="0"],[aria-label]')];
      let el = els.find((e) => up(e.getAttribute('aria-label')) === up(k));
      el ??= els.find((e) => (exact ? up(e.innerText).split('\n').includes(up(k)) : up(e.innerText).includes(up(k))));
      if (!el) return null;
      el.scrollIntoView({ block: 'nearest' });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, k, exact);
    if (!box) return console.log('⚠️ bulunamadı:', k), false;
    await page.mouse.click(box.x, box.y);
    return true;
  };
  // Kafespedia: önce tam ekran (bilgi kutusu → kayarak içerik), sonra telefonda dövüş kaydına kadar
  await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
  await sleep(700);
  await show('hub');
  await tap('Profil');
  await sleep(900);
  await tap('Kafespedia');
  await sleep(1300);
  await rec('wiki', async (now) => {
    await sleep(1900);
    const kay = now();
    await smoothScroll(520, 1800);
    await sleep(300);
    return { kay };
  });
  await rec('wiki2', async () => {
    await sleep(300);
    await smoothScroll(1700, 2700);
    await sleep(300);
  });
  // Belgesel: açılış sahnesi, sonra seçili bölümler (aradaki sahneler hızla geçilir)
  await show('belgesel', "s.pending.sonrakiFaz = 'hub';");
  const docTo = async (title) => {
    for (let i = 0; i < 30; i++) {
      if ((await body()).includes(title)) return true;
      await page.mouse.click(270, 520);
      await sleep(70);
    }
    return console.log('⚠️ belgesel sahnesi yok:', title), false;
  };
  await rec('doc', async () => {
    await sleep(800);
    for (const tt of ['Profesyonel oldu', 'Dergi kapağı', "UCC'ye ilk adım", '10 maçlık seri']) {
      await docTo(tt);
      await sleep(1050);
    }
  });
  await show('luks');
  await rec('lux', async () => {
    await sleep(350);
    await smoothScroll(560, 2000);
    await sleep(300);
  });
  await show('sosyal');
  await tap('Profil');
  await sleep(900);
  await rec('gram', async () => {
    await sleep(500);
    await smoothScroll(480, 2000);
    await sleep(300);
  });
  await show('stil');
  await rec('stil', async () => {
    await sleep(400);
    for (const k of ['Mohawk', 'Gür sakal', 'Kol (tribal)', 'Topuz', 'Keçi sakalı']) {
      await tap(k, { exact: true });
      await sleep(520);
    }
    await sleep(300);
  });
} else if (VIDEO === 'modlar') {
  // ---------- 1.1.0: Hakem Modu ve Antrenör Modu ----------
  const tap = async (k, { exact = false } = {}) => {
    const box = await page.evaluate((k, exact) => {
      const up = (s) => (s || '').trim().toLocaleUpperCase('tr');
      const els = [...document.querySelectorAll('[tabindex="0"],[aria-label]')];
      let el = els.find((e) => up(e.getAttribute('aria-label')) === up(k));
      el ??= els.find((e) => (exact ? up(e.innerText).split('\n').includes(up(k)) : up(e.innerText).includes(up(k))));
      if (!el) return null;
      el.scrollIntoView({ block: 'nearest' });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, k, exact);
    if (!box) return false;
    await page.mouse.click(box.x, box.y);
    await sleep(200);
    return true;
  };
  /** Ekrandaki ilk çok satırlı seçenek kartına gerçek dokunuş (menü/sekme düğmeleri hariç). */
  const tapChoice = async (after = '') => {
    const box = await page.evaluate((after) => {
      const up = (s) => (s || '').toLocaleUpperCase('tr');
      const els = [...document.querySelectorAll('[tabindex="0"]')];
      let start = 0;
      if (after) {
        const anchor = [...document.querySelectorAll('div')].filter((d) => up(d.innerText).includes(up(after))).pop();
        if (anchor) start = els.findIndex((e) => anchor.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING);
      }
      const el = els.slice(Math.max(0, start)).find((e) => e.innerText.trim().split('\n').length >= 2 && !/MENÜ|İLERLET|KÖŞEDE SENİ/.test(up(e.innerText)) && e.getBoundingClientRect().height > 30);
      if (!el) return null;
      el.scrollIntoView({ block: 'nearest' });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, after);
    if (!box) return false;
    await page.mouse.click(box.x, box.y);
    await sleep(250);
    return true;
  };
  const tapOffer = async () => {
    const box = await page.evaluate(() => {
      const el = [...document.querySelectorAll('[tabindex="0"]')].find((e) => /\$\s?\d/.test(e.innerText));
      if (!el) return null;
      el.scrollIntoView({ block: 'nearest' });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (!box) return false;
    await page.mouse.click(box.x, box.y);
    return true;
  };
  const fill = async (a, c) => {
    const inp = await page.$$('input');
    if (inp[0]) await inp[0].type(a);
    if (inp[1]) await inp[1].type(c);
  };
  const T = async () => up(await body());
  // Hakem Modu
  await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
  await sleep(1100);
  await tap('Hakem Modu');
  await sleep(900);
  await fill('Deniz', 'Kaya');
  if (!(await tap('Hakemliğe başla'))) await tap('Ücretsiz dene');
  await sleep(1300);
  await rec('hakem1', async () => {
    await sleep(1000);
    await tapOffer();
    await sleep(3400);
  });
  let gotK = false;
  let gotP = false;
  for (let i = 0; i < 1500 && !(gotK && gotP); i++) {
    const t = await T();
    const bs = await buttons();
    if (t.includes('KARAR ANI') && bs.some((x) => up(x).includes('PUAN DÜŞ'))) {
      if (!gotK) {
        await rec('hakem2', async () => {
          await sleep(1500);
          await tap('PUAN DÜŞ');
          await sleep(2200);
        });
        gotK = true;
      } else await tap('SÖZLÜ UYARI');
      await sleep(400);
      continue;
    }
    if (t.includes('KARAR ANI') && !bs.some((x) => /^10-/.test(x.trim()))) {
      // durdurma/doktor gibi başka karar anları: ilk seçenek
      const k = bs.findIndex((x, j) => j > 1 && x.trim() && !/MENÜ|HIZLI/.test(up(x)));
      if (k >= 0) await (await page.$$('[tabindex="0"]'))[k].click().catch(() => undefined);
      await sleep(400);
      continue;
    }
    if (bs.some((x) => /^10-9/.test(x.trim()))) {
      if (!gotP) {
        await rec('hakem3', async () => {
          await sleep(1300);
          await tap('10-9 Kırmızı');
          await sleep(1700);
        });
        gotP = true;
      } else await tap('10-9 Kırmızı');
      await sleep(300);
      continue;
    }
    if (await click('Maçı bitir')) { await sleep(900); continue; }
    if (await click('Hızlı geç')) { await sleep(250); continue; }
    if (bs.some((x) => /\$\s?\d/.test(x))) { await tapChoice('BASIN KAPIDA') || await tapChoice('KOMİSYON'); await tapOffer(); await sleep(900); continue; }
    if (!(await click('Devam'))) { await tapChoice(); await sleep(400); }
  }
  console.log('hakem: karar', gotK, 'puan', gotP);
  // Antrenör Modu
  await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
  await sleep(1100);
  await tap('Antrenör Modu');
  await sleep(900);
  await fill('Ali', 'Demir');
  await tap('Salonu aç');
  await sleep(1400);
  await rec('coach1', async () => {
    await sleep(1100);
    await tap('Savaşçı Okulu');
    await sleep(2200);
  });
  await rec('coach2', async () => {
    await sleep(400);
    await tap('Öğrenciler', { exact: true });
    await sleep(1300);
    await tap('Kaydet ·');
    await sleep(900);
    await tap('Kaydet ·');
    await sleep(1300);
  });
  await tap('Salon', { exact: true });
  await sleep(600);
  for (let w = 0; w < 90; w++) {
    if (await tap('KÖŞEDE SENİ BEKLİYOR')) break;
    if ((await T()).includes('SALONDA BİR DURUM VAR')) { await tapChoice('SALONDA BİR DURUM VAR'); await sleep(400); continue; }
    if (!(await tap('Haftayı ilerlet'))) await sleep(300);
    await sleep(250);
  }
  await sleep(1300);
  await rec('coach3', async () => {
    await sleep(1600);
    await tapChoice('Oyun planını sen belirle');
    await sleep(2600);
  });
  for (let i = 0; i < 200; i++) {
    const t = await T();
    if (t.includes('TALİMATIN NE')) break;
    if (!(await click('Hızlı geç'))) await sleep(300);
  }
  await rec('coach4', async () => {
    await sleep(1500);
    console.log('talimat:', await tapChoice('Talimatın ne'));
    await sleep(1700);
  });
} else if (VIDEO === 'insta') {
  // ---------- Kafesgram (Instagram modu): akış, hikâye, fotoğraf, profil, DM, trash talk, sıralama ----------
  // Dokunuş: etiket (aria-label) ya da yazıyla bulunur, ortasına gerçek fare tıklaması yapılır
  const tap = async (k, { exact = false, offset = 0 } = {}) => {
    const box = await page.evaluate((k, exact, offset) => {
      const up = (s) => (s || '').trim().toLocaleUpperCase('tr');
      const els = [...document.querySelectorAll('[tabindex="0"],[aria-label]')];
      let i = els.findIndex((e) => up(e.getAttribute('aria-label')) === up(k));
      if (i < 0) i = els.findIndex((e) => (exact ? up(e.innerText).split('\n').pop() === up(k) : up(e.innerText).includes(up(k))));
      const el = i >= 0 ? els[i + offset] : null;
      if (!el) return null;
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, k, exact, offset);
    if (!box) return console.log('⚠️ bulunamadı:', k), false;
    await page.mouse.click(box.x, box.y);
    return true;
  };
  await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
  await sleep(700);
  await show('sosyal');
  await rec('feed', async () => {
    await sleep(500);
    await smoothScroll(900, 2700);
    await sleep(200);
  });
  await show('sosyal');
  await rec('story', async () => {
    await sleep(450);
    await tap('Şampiyon');
    await sleep(2600);
  });
  await show('sosyal');
  await rec('photo', async () => {
    await sleep(350);
    await tap('Yeni gönderi');
    await sleep(600);
    await tap('Lüks yaşam');
    await sleep(550);
    await tap('Altın');
    await sleep(550);
    await tap('Yeni oyuncağımla');
    await sleep(500);
    await tap('Profesyonel çekim');
    await sleep(550);
    await tap('PAYLAŞ', { exact: true });
    await sleep(1100);
  });
  await show('sosyal');
  await tap('Profil');
  await sleep(900);
  await rec('profile', async () => {
    await sleep(500);
    await smoothScroll(520, 2200);
    await sleep(300);
  });
  await show('sosyal');
  await rec('dm', async () => {
    await sleep(400);
    await tap('9+');
    await sleep(1000);
    await tap('Colton Covey');
    await sleep(1000);
    await tap('Sıraya gir');
    await sleep(1300);
  });
  await show('sosyal');
  await rec('trash', async () => {
    await sleep(350);
    await tap('Yeni gönderi');
    await sleep(550);
    await tap('YAZI', { exact: true });
    await sleep(550);
    await tap('Trash talk', { exact: true });
    await sleep(650);
    await tap('kaçacak yer');
    await sleep(600);
    await tap('PAYLAŞ', { exact: true });
    await sleep(1100);
  });
  await show('sosyal');
  await tap('Profil');
  await sleep(900);
  await rec('board', async () => {
    await sleep(350);
    await tap('Yeni', { exact: true, offset: 4 });
    await sleep(1000);
    await smoothScroll(300, 1200);
    await sleep(300);
  });
  await recBelt();
} else {
  // ---------- Yaşam: zengin kayıttan kafes dışı ekranlar ----------
  await page.goto('http://localhost:8088/', { waitUntil: 'networkidle0' });
  await sleep(700);
  await show('sosyal');
  await rec('social', async () => {
    await sleep(1100);
    await click('Espriyle karşıla');
    await sleep(2000);
  });
  await show('gece', 'delete s.iliski; s.cocuklar = [];');
  await rec('night', async () => {
    await sleep(700);
    await click('GECE KULÜBÜ');
    await sleep(900);
    await smoothScroll(260, 1200);
    await sleep(400);
  });
  await show('gece', 'delete s.iliski; s.cocuklar = [];');
  await rec('date', async () => {
    await sleep(900);
    // Kaydırma destesi: kalp düğmesi ("EŞLEŞMELER"den sonra gelen üçüncü düğme)
    for (let k = 0; k < 2; k++) {
      const b = await buttons();
      const j = b.findIndex((x) => up(x).includes('EŞLEŞMELER'));
      if (j >= 0) await (await page.$$('[tabindex="0"]'))[j + 3]?.click();
      await sleep(1100);
    }
  });
  await show('kumarhane');
  await click('Dart');
  await sleep(700);
  await rec('dart', async () => {
    for (let k = 0; k < 3; k++) {
      await sleep(850);
      await click('AT');
    }
    await sleep(900);
  });
  await show('marka');
  await rec('brand', async () => {
    await sleep(400);
    await smoothScroll(360, 1800);
    await sleep(400);
  });
  await show('takim');
  await click('SPONSOR');
  await sleep(500);
  await rec('team', async () => {
    await sleep(400);
    await smoothScroll(360, 1800);
    await sleep(400);
  });
  await show('luks');
  await rec('lux', async () => {
    await sleep(300);
    await smoothScroll(520, 2000);
    await sleep(300);
  });
  await recBelt();
}

// Başlangıcı bir işarete bağlı olup o an yaşanmayan sahneler çıkarılır
SCENES = SCENES.filter(([name, tur, , , , clip, st]) => {
  if (tur !== 'kayit' && tur !== 'tam') return true;
  const sg = segs[clip ?? name];
  if (!sg) return console.log('⚠️ kayıt yok, sahne çıkarıldı:', name), false;
  if (st && st(sg.marks) == null) return console.log('⚠️ an yaşanmadı, sahne çıkarıldı:', name), false;
  return true;
});

// ---------- Şablonlar ----------
const b64 = (p) => readFileSync(`${root}/${p}`).toString('base64');
const OS = b64('node_modules/@expo-google-fonts/oswald/700Bold/Oswald_700Bold.ttf');
const INTER = b64('node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf');
const ICON = b64('assets/splash-icon.png');
const FONTS = `@font-face{font-family:Os;src:url(data:font/ttf;base64,${OS})}@font-face{font-family:In;src:url(data:font/ttf;base64,${INTER})}`;
// Telefon penceresi (1080×1920 tuvalde)
const PH = { x: 150, y: 420, w: 780, h: 1386 };
const CSS = `${FONTS}
*{box-sizing:border-box}body{margin:0;width:540px;height:960px;overflow:hidden;background:radial-gradient(120% 70% at 50% 30%,#4a0d16 0%,#16060a 55%,#050506 100%);font-family:Os;color:#fff}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:36px 36px}
.beam{position:absolute;top:0;left:120px;width:300px;height:960px;background:linear-gradient(180deg,rgba(255,227,163,.13),transparent 70%);clip-path:polygon(42% 0,58% 0,100% 100%,0 100%)}
.top{position:absolute;left:0;right:0;top:70px;display:flex;flex-direction:column;align-items:center;gap:10px}
.t{font-size:44px;line-height:48px;background:#e63946;padding:4px 18px;transform:skewX(-8deg);text-align:center;max-width:94%;box-shadow:0 8px 30px rgba(230,57,70,.45)}
.s{font-size:20px;line-height:24px;color:#111;background:#f2c14e;padding:3px 12px;transform:skewX(-8deg);letter-spacing:1px}
.ph{position:absolute;left:${PH.x / 2 - 6}px;top:${PH.y / 2 - 6}px;width:${PH.w / 2 + 12}px;height:${PH.h / 2 + 12}px;border-radius:30px;background:#000;box-shadow:0 0 0 2px #3a1a20,0 20px 60px rgba(0,0,0,.8),0 0 60px rgba(230,57,70,.35)}
.logo{position:absolute;left:18px;top:20px;display:flex;align-items:center;gap:8px;font-size:18px;letter-spacing:3px;color:#e63946}.logo img{width:30px}`;
// Kapanış konfetisi (sabit tohumlu dağılım: her çalıştırmada aynı)
const CONFETTI = (() => {
  let r = 7;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const cols = ['#f2c14e', '#e63946', '#ffffff', '#ffd98a'];
  let h = '';
  for (let i = 0; i < 70; i++) {
    const x = Math.round(rnd() * 540);
    const y = Math.round(rnd() * 960);
    if (y > 250 && y < 760 && x > 90 && x < 450) continue;
    h += `<i style="position:absolute;left:${x}px;top:${y}px;width:${4 + Math.round(rnd() * 5)}px;height:${8 + Math.round(rnd() * 8)}px;background:${cols[i % 4]};opacity:${(0.55 + rnd() * 0.45).toFixed(2)};transform:rotate(${Math.round(rnd() * 180)}deg)"></i>`;
  }
  return h;
})();
const shot = async (html, file, transparent = false) => {
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'load' });
  await sleep(150);
  await page.screenshot({ path: file, omitBackground: transparent });
};
for (const [name, tur, t, s] of SCENES) {
  if (tur === 'kart') {
    // Siyah kart: ortada büyük yazı, altında kırmızı çizgi
    await shot(`<html><head><style>${CSS}
body{background:#030304}.k{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
.k b{font-size:62px;line-height:66px;letter-spacing:2px;transform:skewX(-8deg);text-align:center;padding:0 30px;text-shadow:0 0 40px rgba(230,57,70,.35)}
.k i{display:block;width:90px;height:5px;background:#e63946}</style></head><body><div class="k"><b>${t}</b><i></i></div></body></html>`, `${tmp}/card-${name}.png`);
    continue;
  }
  if (tur === 'tam') {
    const [l1, l2] = (t || '').split('|');
    await shot(`<html><head><style>${CSS} body{background:transparent!important}
.g{position:absolute;left:0;right:0;bottom:0;height:470px;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.55) 40%,rgba(0,0,0,.88))}
.gt{position:absolute;left:0;right:0;top:0;height:160px;background:linear-gradient(0deg,rgba(0,0,0,0),rgba(0,0,0,.6))}
.c{position:absolute;left:0;right:0;bottom:150px;display:flex;flex-direction:column;align-items:center;transform:skewX(-8deg)}
.c b{font-size:48px;line-height:54px;color:#fff;text-shadow:0 4px 24px rgba(0,0,0,.8)}.c u{text-decoration:none;white-space:nowrap;font-size:56px;line-height:64px;color:#f2c14e;text-shadow:0 4px 30px rgba(0,0,0,.8),0 0 40px rgba(242,193,78,.35)}
.tag{position:absolute;left:0;right:0;top:92px;display:flex;justify-content:center}.tag span{font-size:22px;letter-spacing:2px;color:#111;background:#f2c14e;padding:4px 16px;border-radius:30px;box-shadow:0 6px 24px rgba(0,0,0,.6)}
</style></head><body>${l1 ? '<div class="g"></div>' : ''}${s ? `<div class="gt"></div><div class="tag"><span>${s}</span></div>` : ''}${l1 ? `<div class="c"><b>${l1}</b>${l2 ? `<u>${l2}</u>` : ''}</div>` : ''}</body></html>`, `${tmp}/title-${name}.png`, true);
    continue;
  }
  await shot(`<html><head><style>${CSS}</style></head><body><div class="grid"></div><div class="beam"></div><div class="logo"><img src="data:image/png;base64,${ICON}"/>YOL</div><div class="ph"></div></body></html>`, `${tmp}/bg-${name}.png`);
  await shot(`<html><head><style>${CSS} body{background:transparent!important}</style></head><body><div class="top"><div class="t">${t}</div>${s ? `<div class="s">${s}</div>` : ''}</div></body></html>`, `${tmp}/title-${name}.png`, true);
}
await shot(`<html><head><style>*{margin:0}body{width:540px;height:960px;background:#000}div{position:absolute;left:${PH.x / 2}px;top:${PH.y / 2}px;width:${PH.w / 2}px;height:${PH.h / 2}px;border-radius:24px;background:#fff}</style></head><body><div></div></body></html>`, `${tmp}/mask-full.png`);
await shot(`<html><head><style>${CSS}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.c img{width:230px;filter:drop-shadow(0 0 40px rgba(230,57,70,.7))}.y{font-size:110px;color:#e63946;letter-spacing:14px;transform:skewX(-8deg);line-height:1;margin-top:4px}
.u{font-size:40px;color:#fff;transform:skewX(-8deg);margin-top:6px;letter-spacing:2px}.p{margin-top:40px;font-size:44px;color:#111;background:#f2c14e;padding:6px 22px;transform:skewX(-8deg)}
.f{margin-top:16px;display:flex;align-items:center;gap:10px;font-size:24px;color:#fff;border:2px solid #fff;border-radius:14px;padding:8px 18px;background:#000}.m{margin-top:16px;font-family:In;font-size:17px;color:#d9dbe0;letter-spacing:2px}
</style></head><body><div class="grid"></div><div class="beam" style="left:120px"></div><div class="c"><img src="data:image/png;base64,${ICON}"/><div class="y">YOL</div><div class="u">KAFESTEN KEMERE</div><div class="p"${VIDEO === 'pedia' ? ' style="font-size:34px"' : ''}>${END_TXT[0]}</div><div class="f">${END_TXT[1]}</div><div class="m">MMA KARİYER OYUNU</div></div>${VIDEO === 'pedia' ? CONFETTI : ''}</body></html>`, `${tmp}/end.png`);
await browser.close();
if (errors.length) console.log('Sayfa hataları:', errors);

// ---------- Kurgu ----------
const dur = (f) => {
  const r = spawnSync(FF, ['-i', f, '-f', 'null', '-'], { encoding: 'utf8' });
  const m = [...(r.stderr ?? '').matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop();
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
};
for (const k of Object.keys(segs)) segs[k].sn = dur(`${tmp}/${k}.mp4`);
const startOf = (name, d) => {
  const sg = segs[name];
  if (name === 'walk') return Math.max(0, (sg.marks.ann ?? sg.sn - 1) - (d - 2.2)); // yürüyüş + adın okunduğu an
  if (name === 'fight') return 0.3;
  if (name === 'camp') return 0.6;
  return Math.max(0, Math.min(0.3, sg.sn - d));
};
const TB = { y: 110, h: 330 };
const POP_AT = 0.28;
const POP = `if(lt(t,${POP_AT}),0.5,if(lt(t,${POP_AT + 0.13}),0.5+0.65*(t-${POP_AT})/0.13,if(lt(t,${POP_AT + 0.24}),1.15-0.15*(t-${POP_AT + 0.13})/0.11,1)))`;
const enc = ['-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18'];
const parts = [];
for (const [name, tur, , , d, clip, st] of SCENES) {
  const out = `${tmp}/scene-${name}.mp4`;
  const src = clip ?? name;
  if (tur === 'kart') {
    // Yavaş yakınlaşma
    execFileSync(FF, ['-y', '-loop', '1', '-t', String(d), '-i', `${tmp}/card-${name}.png`, '-filter_complex', `[0:v]scale=1080:1920,scale=w='trunc(1080*(1.06+0.06*t/${d})/2)*2':h=-2:eval=frame,crop=1080:1920,format=yuv420p[v]`, '-map', '[v]', '-t', String(d), ...enc, out], { stdio: 'ignore' });
  } else if (tur === 'tam') {
    // Tam ekran kayıt: yavaş yakınlaşma, alttaki yazı kısa bir gecikmeyle belirir
    // Belgesel: tüm bölümler sahneye sığacak kadar hızlanır
    const ss = Math.min(st ? Math.max(0, st(segs[src].marks)) : 0.15, Math.max(0, segs[src].sn - d));
    const speed = name === 'doc' ? Math.max(1, (segs[src].sn - ss) / d) : 1;
    execFileSync(FF, [
      '-y', '-ss', ss.toFixed(2), '-t', String(d * speed), '-i', `${tmp}/${src}.mp4`,
      '-loop', '1', '-t', String(d), '-i', `${tmp}/title-${name}.png`,
      '-filter_complex',
      `[0:v]setpts=PTS/${speed.toFixed(3)},fps=30,scale=1080:1920:flags=lanczos,setsar=1,scale=w='trunc(1080*(1+0.05*t/${d})/2)*2':h=-2:eval=frame,crop=1080:1920,format=rgba[base];` +
        `[1:v]scale=1080:1920,format=rgba,fade=t=in:st=0.18:d=0.3:alpha=1[tt];[base][tt]overlay=0:0:shortest=1,format=yuv420p[v]`,
      '-map', '[v]', '-t', String(d), ...enc, out,
    ], { stdio: 'ignore' });
  } else {
    // Instagram videosu: kaydın tamamı sahneye sığacak kadar hızlandırılır (dokunuşlar arası bekleme kısalır)
    const fit = (VIDEO === 'insta' || VIDEO === 'modlar' || VIDEO === 'pedia') && name !== 'belt';
    const ss = fit ? 0.15 : Math.min(st ? Math.max(0, st(segs[src].marks)) : startOf(src, d), Math.max(0, segs[src].sn - d));
    const speed = fit ? Math.max(1, (segs[src].sn - ss) / d) : 1;
    execFileSync(FF, [
      '-y', '-loop', '1', '-t', String(d), '-i', `${tmp}/bg-${name}.png`,
      '-ss', ss.toFixed(2), '-t', String(d * speed), '-i', `${tmp}/${src}.mp4`,
      '-loop', '1', '-t', String(d), '-i', `${tmp}/mask-full.png`,
      '-loop', '1', '-t', String(d), '-i', `${tmp}/title-${name}.png`,
      '-filter_complex',
      `[1:v]setpts=PTS/${speed.toFixed(3)},fps=30,scale=${PH.w}:${PH.h}:flags=lanczos,setsar=1,pad=1080:1920:${PH.x}:${PH.y}:black,format=rgba[ph];[2:v]scale=1080:1920,format=gray[mk];[ph][mk]alphamerge[phm];[0:v]scale=1080:1920,format=rgba[bg];[bg][phm]overlay=0:0:shortest=1[base];` +
        `[3:v]scale=1080:1920,format=rgba,crop=1080:${TB.h}:0:${TB.y},scale=w='trunc(1080*(${POP})/2)*2':h=-2:eval=frame[tt];` +
        `[base][tt]overlay=x='(W-w)/2':y='${TB.y}+(${TB.h}-h)/2':eval=frame:enable='gte(t,${POP_AT})',` +
        `scale=w='trunc(1080*(1+0.06*max(0,1-(t-0.24)/0.22)*gte(t,0.24)+0.035*t/${d})/2)*2':h=-2:eval=frame,crop=1080:1920,format=yuv420p[v]`,
      '-map', '[v]', '-t', String(d), ...enc, out,
    ], { stdio: 'ignore' });
  }
  parts.push(out);
}
const endOut = `${tmp}/scene-end.mp4`;
execFileSync(FF, ['-y', '-loop', '1', '-t', String(END_SEC), '-i', `${tmp}/end.png`, '-filter_complex', `[0:v]scale=1080:1920,scale=w='trunc(1080*(1+0.05*t/${END_SEC})/2)*2':h=-2:eval=frame,crop=1080:1920,format=yuv420p[v]`, '-map', '[v]', ...enc, endOut], { stdio: 'ignore' });
parts.push(endOut);

// Geçişler: kartlara karartma, oyun sahneleri arasında itme, kapanışa daire açılımı
const XF = 0.26;
const all = [...SCENES, ['end', 'son', '', '', END_SEC]];
const trans = (k) => {
  const a = all[k - 1][1];
  const b = all[k][1];
  if (b === 'son') return 'circleopen';
  if (a === 'kart' || b === 'kart') return 'fadeblack';
  if (a === 'tam' && b === 'tam') return 'fade';
  if (a === 'tam' || b === 'tam') return 'zoomin';
  return ['slideleft', 'slideup', 'slideright', 'slidedown'][k % 4];
};
const at = [];
let t = 0;
all.forEach(([, , , , d], i) => {
  at.push(t);
  t += d - (i < all.length - 1 ? XF : 0);
});
const total = t;
const idx = (n) => all.findIndex((s) => s[0] === n);
const snd = (n) => `${root}/assets/sounds/${n}.wav`;
const audio = [];
const add = (file, startSec, vol = 1, loop = false) => audio.push({ file, startSec, vol, loop });
const cue = (name, off, file, vol = 1) => idx(name) >= 0 && add(snd(file), at[idx(name)] + off, vol);
const firstRec = all.findIndex((x) => x[1] === 'kayit' || x[1] === 'tam');
// Açılış: kartlarda darbeler; ilk oyun sahnesiyle giriş müziği, sonra tempolu müzik
add(snd('swell'), 0, 0.6);
cue('c1', 0.05, 'heavy', 0.8);
cue('c2', 0.05, 'heavy', 0.9);
add(snd('crowd_loop'), at[firstRec], 0.3, true);
add(snd('giris_epik'), at[firstRec], 0.85);
add(snd('music_menu'), at[firstRec] + 6.6, 0.6, true);
for (let i = 1; i < all.length; i++) if (all[i][1] === 'kayit' && all[i - 1][1] === 'kayit') add(snd('whoosh'), at[i] - 0.02, 0.5);
// Gerilim kartları: müzik kısılır, ağır darbe
cue('c3', 0.05, 'slam', 0.9);
cue('c4', 0.05, 'heavy', 1);
cue('end', 0.15, 'bell', 0.9);
if (VIDEO === 'ana') {
  [0.35, 0.75, 1.15, 1.55, 1.95, 2.35].forEach((x, i) => cue('fight', x, ['punch1', 'punch2', 'punch3'][i % 3], 0.8));
  cue('win', 0.1, 'roar', 0.7);
  cue('league', 0.9, 'cash', 0.6);
} else if (VIDEO === 'taktik') {
  cue('tac1', 0.2, 'bell2', 0.7);
  [0.5, 1.2, 1.9].forEach((x, i) => cue('flow', x, ['punch2', 'punch1', 'punch3'][i], 0.6));
  [0.3, 0.6, 0.9, 1.2, 1.5, 1.8].forEach((x) => cue('qte', x, 'tap', 0.7));
  cue('corner', 0.1, 'chime', 0.6);
  cue('ko', 0.05, 'heavy', 0.9);
  cue('ko', 0.3, 'roar', 0.8);
  cue('finish', 0.2, 'applause', 0.6);
} else if (VIDEO === 'pedia') {
  cue('hook2', 0.15, 'heavy', 0.9);
  [1.1, 2.15, 3.25, 4.35].forEach((x) => cue('doc', x, 'whoosh', 0.45));
  cue('lux', 0.5, 'cash', 0.5);
  cue('gram', 0.5, 'chime', 0.5);
  [0.45, 0.95, 1.45, 1.95].forEach((x) => cue('stil', x, 'tap', 0.7));
  cue('end', 0.3, 'applause', 0.5);
} else if (VIDEO === 'modlar') {
  cue('hakem1', 0.7, 'tap', 0.7);
  cue('hakem2', 1.0, 'slam', 0.6);
  cue('hakem3', 1.2, 'tap', 0.7);
  cue('coach1', 0.9, 'tap', 0.7);
  cue('coach1', 1.1, 'chime', 0.5);
  cue('coach2', 0.9, 'cash', 0.4);
  cue('coach3', 1.1, 'tap', 0.7);
  cue('coach4', 1.2, 'tap', 0.7);
  cue('coach4', 1.4, 'swell', 0.5);
} else if (VIDEO === 'insta') {
  cue('story', 0.45, 'whoosh', 0.5);
  [0.7, 1.25, 1.8, 2.3].forEach((x) => cue('photo', x, 'tap', 0.7));
  cue('photo', 2.85, 'chime', 0.7);
  cue('profile', 0.4, 'cash', 0.4);
  [0.4, 1.4, 2.4].forEach((x) => cue('dm', x, 'tap', 0.7));
  cue('dm', 2.5, 'chime', 0.5);
  cue('trash', 2.9, 'slam', 0.6);
  cue('board', 0.9, 'swell', 0.5);
} else {
  cue('social', 1.0, 'chime', 0.6);
  cue('date', 0.9, 'chime', 0.5);
  [0.85, 1.7, 2.55].forEach((x) => cue('dart', x, 'tap', 0.8));
  cue('brand', 0.6, 'cash', 0.6);
  cue('lux', 0.5, 'cash', 0.5);
}
cue('belt', 0, 'fanfare', 0.85);
cue('belt', 0.5, 'applause', 0.7);
const args = ['-y'];
parts.forEach((p) => args.push('-i', p));
audio.forEach((a) => args.push(...(a.loop ? ['-stream_loop', '-1'] : []), '-i', a.file));
const NV = parts.length;
const vprep = parts.map((_, i) => `[${i}:v]settb=AVTB,fps=30,format=yuv420p,setsar=1[s${i}]`).join(';');
let vchain = '';
let prev = 's0';
for (let k = 1; k < NV; k++) {
  const tag = k === NV - 1 ? 'vout' : `x${k}`;
  vchain += `;[${prev}][s${k}]xfade=transition=${trans(k)}:duration=${XF}:offset=${at[k].toFixed(3)}[${tag}]`;
  prev = tag;
}
// Müzik ve seyirci, gerilim kartlarında kısılır
const duck0 = idx('c3') >= 0 ? at[idx('c3')] : -1;
const afterC4 = all.findIndex((x, i) => i > idx('c4') && x[1] !== 'kart');
const duck1 = idx('c3') >= 0 ? at[afterC4] : -1;
const duck = `volume='if(between(t,${duck0.toFixed(2)},${duck1.toFixed(2)}),0.15,1)':eval=frame`;
const af = audio
  .map((a, i) => {
    const ms = Math.round(a.startSec * 1000);
    const bed = a.loop || a.file.endsWith('giris_epik.wav');
    return `[${NV + i}:a]aresample=44100,aformat=channel_layouts=stereo,volume=${a.vol},adelay=${ms}|${ms}${bed ? `,${duck}` : ''}[a${i}]`;
  })
  .join(';');
const mix = `${audio.map((_, i) => `[a${i}]`).join('')}amix=inputs=${audio.length}:duration=longest:normalize=0,afade=t=out:st=${(total - 1).toFixed(2)}:d=1,alimiter=limit=0.95[aout]`;
const out = VIDEO === 'pedia' ? `${root}/store/video/reklam-kafespedia.mp4` : `${root}/store/video/ios-reklam-${VIDEO}.mp4`;
writeFileSync(`${tmp}/filtre.txt`, `${vprep}${vchain};${af};${mix}`);
const r = spawnSync(FF, [...args, '-filter_complex_script', `${tmp}/filtre.txt`, '-map', '[vout]', '-map', '[aout]', '-t', total.toFixed(2), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '19', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { encoding: 'utf8' });
if (r.status !== 0) throw new Error('ffmpeg: ' + (r.stderr ?? '').split(String.fromCharCode(10)).slice(-8).join(' | '));
console.log('✅', out, `${total.toFixed(1)} sn`);
