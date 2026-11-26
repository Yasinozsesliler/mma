// Google Play'e otomatik yükleme (Google Play Developer API, hizmet hesabı anahtarıyla).
// Yapabildikleri (PLAY_ISLER virgüllü: metin, gorsel, aab):
//   metin  → her dilde ad, kısa ve tam açıklama (store/listing.json)
//   gorsel → her dilde telefon ekran görüntüleri (store/graphics/<dil>/01..08) ve tanıtım görseli (tanitim-1024x500.png)
//   aab    → PLAY_AAB dosyasını yükler, PLAY_KANAL kanalına (production, internal…) sürüm notlarıyla TASLAK sürüm açar
// Hepsi tek bir "düzenleme"de yapılır ve en sonda onaylanır; bir hata olursa Play'de hiçbir şey değişmez.
// Ortam: PLAY_SERVICE_ACCOUNT_JSON (anahtar dosyasının içeriği), PLAY_PAKET (varsayılan com.yolmma.game),
//        PLAY_ISLER, PLAY_AAB, PLAY_KANAL, PLAY_NOTLAR (store/play-whatsnew-<sürüm>.txt), PLAY_DENEME=1 (onaylamadan bırak)
import { createSign } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const SA = JSON.parse(process.env.PLAY_SERVICE_ACCOUNT_JSON ?? '{}');
if (!SA.client_email || !SA.private_key) throw new Error('PLAY_SERVICE_ACCOUNT_JSON eksik ya da geçersiz');
const PKG = process.env.PLAY_PAKET || 'com.yolmma.game';
const ISLER = (process.env.PLAY_ISLER || 'metin,gorsel').split(',').map((x) => x.trim()).filter(Boolean);
const KANAL = process.env.PLAY_KANAL || 'production';
const DENEME = process.env.PLAY_DENEME === '1';
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
const UP = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}`;
// Play dil kodu → görsel klasörü
const DIR = { 'tr-TR': 'tr', 'en-US': 'en', 'es-ES': 'es', 'pt-BR': 'pt', 'ru-RU': 'ru', 'pl-PL': 'pl', 'it-IT': 'it', id: 'id' };

const b64u = (b) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
async function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ iss: SA.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = b64u(createSign('RSA-SHA256').update(`${head}.${body}`).sign(SA.private_key));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${head}.${body}.${sig}` });
  const j = await r.json();
  if (!j.access_token) throw new Error('Google girişi başarısız: ' + JSON.stringify(j));
  return j.access_token;
}
const TOKEN = await token();
async function api(method, url, { json, bin, type } = {}) {
  const r = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(json ? { 'Content-Type': 'application/json' } : {}), ...(bin ? { 'Content-Type': type } : {}) },
    body: json ? JSON.stringify(json) : bin,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${url.replace(API, '').replace(UP, '')} → ${r.status}: ${t.slice(0, 800)}`);
  return t ? JSON.parse(t) : {};
}

console.log(`Paket ${PKG} · işler: ${ISLER.join(', ')}${DENEME ? ' · DENEME (onaylanmaz)' : ''}`);
const edit = await api('POST', `${API}/edits`, { json: {} });
const E = `${API}/edits/${edit.id}`;
const EU = `${UP}/edits/${edit.id}`;

if (ISLER.includes('metin') || ISLER.includes('gorsel')) {
  const L = JSON.parse(readFileSync('store/listing.json', 'utf8'));
  for (const [lang, v] of Object.entries(L)) {
    if (ISLER.includes('metin')) {
      await api('PUT', `${E}/listings/${lang}`, { json: { language: lang, title: v.title, shortDescription: v.short, fullDescription: v.full } });
    }
    if (ISLER.includes('gorsel')) {
      const dir = `store/graphics/${DIR[lang] ?? lang}`;
      if (!existsSync(dir)) { console.log(` ! ${lang}: ${dir} yok, görseller atlandı`); continue; }
      // Play en fazla 8 telefon görseli kabul eder
      const shots = readdirSync(dir).filter((f) => /^\d\d-.*\.png$/.test(f)).sort().slice(0, 8);
      await api('DELETE', `${E}/listings/${lang}/phoneScreenshots`);
      for (const f of shots) await api('POST', `${EU}/listings/${lang}/phoneScreenshots?uploadType=media`, { bin: readFileSync(`${dir}/${f}`), type: 'image/png' });
      if (existsSync(`${dir}/tanitim-1024x500.png`)) {
        await api('DELETE', `${E}/listings/${lang}/featureGraphic`);
        await api('POST', `${EU}/listings/${lang}/featureGraphic?uploadType=media`, { bin: readFileSync(`${dir}/tanitim-1024x500.png`), type: 'image/png' });
      }
    }
    console.log(` ✓ ${lang}${ISLER.includes('metin') ? ' · metinler' : ''}${ISLER.includes('gorsel') ? ' · görseller' : ''}`);
  }
}

if (ISLER.includes('aab')) {
  const file = process.env.PLAY_AAB;
  if (!file || !existsSync(file)) throw new Error('PLAY_AAB dosyası yok');
  const b = await api('POST', `${EU}/bundles?uploadType=media`, { bin: readFileSync(file), type: 'application/octet-stream' });
  console.log(` ✓ AAB yüklendi: sürüm kodu ${b.versionCode}`);
  // Sürüm notları: <tr-TR>…</tr-TR> biçimindeki dosyadan
  const notes = [];
  const nf = process.env.PLAY_NOTLAR;
  if (nf && existsSync(nf)) for (const m of readFileSync(nf, 'utf8').matchAll(/<([\w-]+)>\n?([\s\S]*?)\n?<\/\1>/g)) notes.push({ language: m[1], text: m[2].trim().slice(0, 500) });
  const app = JSON.parse(readFileSync('app.json', 'utf8')).expo;
  await api('PUT', `${E}/tracks/${KANAL}`, { json: { track: KANAL, releases: [{ name: `${app.version} (${b.versionCode})`, versionCodes: [String(b.versionCode)], status: 'draft', releaseNotes: notes }] } });
  console.log(` ✓ ${KANAL} kanalında taslak sürüm: ${app.version} (${b.versionCode}), ${notes.length} dilde not`);
}

if (DENEME) {
  await api('POST', `${E}:validate`);
  await api('DELETE', E);
  console.log('Deneme: değişiklikler geçerli, ama onaylanmadı (Play\'de hiçbir şey değişmedi)');
} else {
  await api('POST', `${E}:commit`);
  console.log('✅ Play\'e gönderildi' + (ISLER.includes('aab') ? ' (sürüm taslak: Play Console › Sürümler\'den yayına al)' : ' (mağaza sayfası değişiklikleri incelemeden sonra yayına girer)'));
}
