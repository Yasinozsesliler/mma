// App Store Connect API ile iOS sürümünü incelemeye gönderir (GitHub Actions'ta, ios-submit iş akışında çalışır).
// 1) app.json'daki sürüm için App Store sürümünü bulur ya da oluşturur
// 2) Aynı sürümün TestFlight derlemesi işlenene kadar bekler ve sürüme bağlar
// 3) store/whatsnew-<sürüm>.json'daki "Yenilikler" ve "Tanıtım Metni"ni her dile yazar
// 4) store/appstore.json'da olup App Store'da sayfası olmayan dilleri açar: ad, alt başlık, açıklama, anahtar kelimeler,
//    tanıtım metni ve store/graphics-ios/<dil> altındaki 6,7" ekran görüntüleri (örn. İtalyanca)
// 5) İnceleme gönderimini oluşturup gönderir
// Anahtar bilgileri eas.json'daki submit.production.ios'tan okunur; .p8 dosyası credentials/ altında olmalı.
// DRY_RUN=1 ile hiçbir şey değiştirmeden ne yapacağını yazar.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createSign, createHash } from 'node:crypto';

const eas = JSON.parse(readFileSync('eas.json', 'utf8')).submit.production.ios;
const VERSION = JSON.parse(readFileSync('app.json', 'utf8')).expo.version;
const APP = eas.ascAppId;
const DRY = process.env.DRY_RUN === '1';
const notesPath = `store/whatsnew-${VERSION}.json`;
if (!existsSync(notesPath)) throw new Error(`${notesPath} yok`);
const NOTES = JSON.parse(readFileSync(notesPath, 'utf8'));
const KEY = readFileSync(eas.ascApiKeyPath, 'utf8');

const b64u = (b) => Buffer.from(b).toString('base64url');
function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'ES256', kid: eas.ascApiKeyId, typ: 'JWT' }));
  const body = b64u(JSON.stringify({ iss: eas.ascApiKeyIssuerId, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' }));
  const sig = createSign('SHA256').update(`${head}.${body}`).sign({ key: KEY, dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${b64u(sig)}`;
}

async function api(method, path, data) {
  if (DRY && method !== 'GET') { console.log('[DRY]', method, path, JSON.stringify(data ?? {}).slice(0, 200)); return { data: { id: 'dry' } }; }
  const r = await fetch('https://api.appstoreconnect.apple.com' + path, {
    method,
    headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' },
    body: data ? JSON.stringify({ data }) : undefined,
  });
  const txt = await r.text();
  if (!r.ok) {
    const e = new Error(`${method} ${path} → ${r.status}: ${txt.slice(0, 1500)}`);
    e.status = r.status;
    throw e;
  }
  return txt ? JSON.parse(txt) : {};
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const EDITABLE = ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY'];
const DONE = ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'PENDING_DEVELOPER_RELEASE', 'PENDING_APPLE_RELEASE', 'PROCESSING_FOR_APP_STORE', 'READY_FOR_SALE', 'READY_FOR_DISTRIBUTION'];

console.log(`Uygulama ${APP} · sürüm ${VERSION}${DRY ? ' · DENEME (değişiklik yok)' : ''}`);

// 1) Sürüm
const vers = (await api('GET', `/v1/apps/${APP}/appStoreVersions?filter[platform]=IOS&limit=20`)).data;
for (const v of vers.slice(0, 5)) console.log(' ·', v.attributes.versionString, v.attributes.appStoreState);
let ver = vers.find((v) => v.attributes.versionString === VERSION);
if (ver && DONE.includes(ver.attributes.appStoreState)) {
  console.log(`Sürüm ${VERSION} zaten "${ver.attributes.appStoreState}" durumunda, yapılacak bir şey yok.`);
  process.exit(0);
}
if (!ver) {
  const open = vers.find((v) => EDITABLE.includes(v.attributes.appStoreState));
  if (open) {
    console.log(`Düzenlenebilir ${open.attributes.versionString} sürümü ${VERSION} yapılıyor`);
    await api('PATCH', `/v1/appStoreVersions/${open.id}`, { type: 'appStoreVersions', id: open.id, attributes: { versionString: VERSION } });
    ver = open;
  } else {
    console.log(`Yeni App Store sürümü oluşturuluyor: ${VERSION}`);
    ver = (await api('POST', '/v1/appStoreVersions', {
      type: 'appStoreVersions',
      attributes: { platform: 'IOS', versionString: VERSION },
      relationships: { app: { data: { type: 'apps', id: APP } } },
    })).data;
  }
}
const VID = ver.id;

// 2) Derleme
let build = null;
for (let i = 0; i < 90; i++) {
  const b = (await api('GET', `/v1/builds?filter[app]=${APP}&filter[preReleaseVersion.version]=${VERSION}&sort=-uploadedDate&limit=1`)).data[0];
  if (b) {
    console.log(`Derleme ${b.attributes.version}: ${b.attributes.processingState}`);
    if (b.attributes.processingState === 'VALID') { build = b; break; }
    if (['FAILED', 'INVALID'].includes(b.attributes.processingState)) throw new Error('Derleme Apple tarafında işlenemedi');
  } else console.log(`${VERSION} derlemesi henüz görünmüyor, bekleniyor…`);
  await sleep(60_000);
}
if (!build) throw new Error('Derleme 90 dakikada hazır olmadı');
if (build.attributes.usesNonExemptEncryption == null) {
  await api('PATCH', `/v1/builds/${build.id}`, { type: 'builds', id: build.id, attributes: { usesNonExemptEncryption: false } });
}
await api('PATCH', `/v1/appStoreVersions/${VID}/relationships/build`, { type: 'builds', id: build.id });
console.log(`Derleme ${build.attributes.version} sürüme bağlandı`);

// 3) Yenilikler metni
const locs = DRY && VID === 'dry' ? [] : (await api('GET', `/v1/appStoreVersions/${VID}/appStoreVersionLocalizations?limit=50`)).data;
for (const l of locs) {
  const n = NOTES[l.attributes.locale];
  if (!n) { console.log(` ! ${l.attributes.locale} için not yok, atlandı`); continue; }
  await api('PATCH', `/v1/appStoreVersionLocalizations/${l.id}`, {
    type: 'appStoreVersionLocalizations', id: l.id, attributes: { whatsNew: n.whatsNew, promotionalText: n.promotionalText },
  });
  console.log(` ✓ ${l.attributes.locale}: yenilikler yazıldı`);
}

// 3b) Yeni diller: App Store'da sayfası olmayan, store/appstore.json'da metni hazır diller
const AS = JSON.parse(readFileSync('store/appstore.json', 'utf8'));
const PLAY = JSON.parse(readFileSync('store/listing.json', 'utf8'));
const SITE = 'https://mma-five-psi.vercel.app';
// Apple açıklamada emoji kabul etmez (scripts/appstore-texts.mjs ile aynı temizlik)
const noEmoji = (t) => t.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').split('\n').map((l) => l.trim()).join('\n');
const SHOT_DIR = { tr: 'tr', 'en-US': 'en', 'es-ES': 'es', 'pt-BR': 'pt', ru: 'ru', pl: 'pl', it: 'it', id: 'id', ja: 'ja' };
const have = new Set(locs.map((l) => l.attributes.locale));
const bos = new Set(locs.filter((l) => !l.attributes.description).map((l) => l.attributes.locale));
const yeni = Object.keys(AS).filter((loc) => !have.has(loc) || bos.has(loc));
if (yeni.length && VID !== 'dry') {
  const infos = (await api('GET', `/v1/apps/${APP}/appInfos`)).data;
  const info = infos.find((i) => ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'WAITING_FOR_REVIEW'].includes(i.attributes.appStoreState ?? i.attributes.state)) ?? infos[0];
  const infoLocs = new Set((await api('GET', `/v1/appInfos/${info.id}/appInfoLocalizations?limit=50`)).data.map((l) => l.attributes.locale));
  for (const loc of yeni) {
    const a = AS[loc];
    const p = PLAY[a.listing];
    if (!p) { console.log(` ! ${loc}: listing.json'da ${a.listing} yok, atlandı`); continue; }
    if (!infoLocs.has(loc)) {
      await api('POST', '/v1/appInfoLocalizations', {
        type: 'appInfoLocalizations',
        attributes: { locale: loc, name: a.name, subtitle: a.subtitle, privacyPolicyUrl: `${SITE}/gizlilik.html` },
        relationships: { appInfo: { data: { type: 'appInfos', id: info.id } } },
      });
    }
    const attrs = { description: noEmoji(p.full), keywords: a.keywords, promotionalText: NOTES[loc]?.promotionalText ?? a.promo, whatsNew: NOTES[loc]?.whatsNew ?? p.releaseNotes, supportUrl: SITE, marketingUrl: SITE };
    let vl = locs.find((l) => l.attributes.locale === loc);
    if (!vl) {
      try {
        vl = (await api('POST', '/v1/appStoreVersionLocalizations', {
          type: 'appStoreVersionLocalizations',
          attributes: { locale: loc, ...attrs },
          relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: VID } } },
        })).data;
        console.log(` ✓ ${loc}: yeni dil sayfası açıldı`);
      } catch (e) {
        // Sayfa bu arada açılmış olabilir (Apple'ın kopyası ya da önceki deneme): bul ve doldur
        if (e.status !== 409) throw e;
        vl = (await api('GET', `/v1/appStoreVersions/${VID}/appStoreVersionLocalizations?limit=50`)).data.find((l) => l.attributes.locale === loc);
        if (!vl) throw e;
      }
    }
    await api('PATCH', `/v1/appStoreVersionLocalizations/${vl.id}`, { type: 'appStoreVersionLocalizations', id: vl.id, attributes: attrs });
    console.log(` ✓ ${loc}: açıklama, anahtar kelimeler ve yenilikler yazıldı`);
    const sets = (await api('GET', `/v1/appStoreVersionLocalizations/${vl.id}/appScreenshotSets?include=appScreenshots`)).data;
    if (sets.some((x) => (x.relationships?.appScreenshots?.data ?? []).length > 0)) { console.log(`   · ${loc}: ekran görüntüleri zaten var`); continue; }
    const dir = `store/graphics-ios/${SHOT_DIR[loc] ?? loc}`;
    if (!existsSync(dir)) { console.log(`   ! ${dir} yok, ekran görüntüsü yüklenmedi`); continue; }
    const set = sets.find((x) => x.attributes.screenshotDisplayType === 'APP_IPHONE_67') ?? (await api('POST', '/v1/appScreenshotSets', {
      type: 'appScreenshotSets', attributes: { screenshotDisplayType: 'APP_IPHONE_67' },
      relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: vl.id } } },
    })).data;
    const files = readdirSync(dir).filter((f) => /^\d\d-.*\.png$/.test(f)).sort().slice(0, 10);
    for (const f of files) {
      const buf = readFileSync(`${dir}/${f}`);
      const shot = (await api('POST', '/v1/appScreenshots', {
        type: 'appScreenshots', attributes: { fileName: f, fileSize: buf.length },
        relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } },
      })).data;
      for (const op of shot.attributes.uploadOperations) {
        const r = await fetch(op.url, { method: op.method, headers: Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value])), body: buf.subarray(op.offset, op.offset + op.length) });
        if (!r.ok) throw new Error(`Ekran görüntüsü yüklenemedi ${f}: ${r.status}`);
      }
      await api('PATCH', `/v1/appScreenshots/${shot.id}`, {
        type: 'appScreenshots', id: shot.id, attributes: { uploaded: true, sourceFileChecksum: createHash('md5').update(buf).digest('hex') },
      });
    }
    console.log(`   ✓ ${files.length} ekran görüntüsü yüklendi`);
  }
}

// 4) İncelemeye gönder
const subs = (await api('GET', `/v1/reviewSubmissions?filter[app]=${APP}&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW,UNRESOLVED_ISSUES&limit=5`)).data;
let sub = subs[0];
if (!sub) {
  sub = (await api('POST', '/v1/reviewSubmissions', {
    type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: { data: { type: 'apps', id: APP } } },
  })).data;
}
// Yeni yüklenen ekran görüntüleri Apple'da işlenirken sürüm "geçersiz durumda" görünür: birkaç dakika bekleyip yeniden dene
for (let i = 0; ; i++) {
  try {
    await api('POST', '/v1/reviewSubmissionItems', {
      type: 'reviewSubmissionItems',
      relationships: { reviewSubmission: { data: { type: 'reviewSubmissions', id: sub.id } }, appStoreVersion: { data: { type: 'appStoreVersions', id: VID } } },
    });
    break;
  } catch (e) {
    if (e.status !== 409) throw e;
    if (!/STATE_ERROR/.test(e.message)) { console.log('Sürüm zaten gönderimde: ' + e.message.slice(0, 300)); break; }
    if (i === 0) console.log(e.message);
    if (i >= 12) throw e;
    console.log(`Sürüm henüz gönderilmeye hazır değil, 1 dk sonra yeniden (${i + 1}/12)`);
    await sleep(60_000);
  }
}
await api('PATCH', `/v1/reviewSubmissions/${sub.id}`, { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } });
console.log(`✅ ${VERSION} (derleme ${build.attributes.version}) App Store incelemesine gönderildi`);
