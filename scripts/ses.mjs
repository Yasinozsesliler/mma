// ElevenLabs seslendirme (GitHub Actions'ta çalışır; anahtar: ELEVENLABS_API_KEY).
// İstek: store/ses-istek.json
//   {"islem":"ornek","metin":"...","adet":5}  → Türkçe erkek fragman sesleri bulur, her biriyle aynı metni okutur
//   {"islem":"uret","ses":"<voice_id>","parcalar":[{"ad":"01","metin":"..."}], "model":"eleven_multilingual_v2"}
// Çıktı: ses/ klasörü (mp3 + bilgi.json); iş akışı bunları taslak bir sürüme ekler.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error('ELEVENLABS_API_KEY eksik');
const REQ = JSON.parse(readFileSync('store/ses-istek.json', 'utf8'));
const OUT = 'ses';
mkdirSync(OUT, { recursive: true });
const H = { 'xi-api-key': KEY };
const get = async (p) => {
  const r = await fetch('https://api.elevenlabs.io' + p, { headers: H });
  if (!r.ok) throw new Error(`GET ${p} → ${r.status}: ${(await r.text()).slice(0, 400)}`);
  return r.json();
};
const post = async (p, body) => {
  const r = await fetch('https://api.elevenlabs.io' + p, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`POST ${p} → ${r.status}: ${(await r.text()).slice(0, 400)}`);
  return r;
};
const MODEL = REQ.model || 'eleven_multilingual_v2';
const tts = async (voice, text, file, settings = {}) => {
  const r = await post(`/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    text,
    model_id: MODEL,
    voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true, ...settings },
  });
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
};

// Hesap bilgisi anahtarın izni varsa yazılır
const kalan = async () => { try { const x = await get('/v1/user/subscription'); return `${x.tier} · kalan karakter ${x.character_limit - x.character_count}`; } catch { return '(hesap bilgisi izni yok)'; } };
console.log('Plan:', await kalan());

if (REQ.islem === 'ornek') {
  // Kütüphanede Türkçe erkek sesler: önce reklam/anlatım için olanlar, çok kullanılanlar
  const seen = new Set();
  const adaylar = [];
  for (const q of ['use_cases=advertisement', 'use_cases=narrative_story', 'use_cases=characters', '']) {
    const j = await get(`/v1/shared-voices?page_size=30&language=tr&gender=male&sort=usage_character_count_1y&${q}`);
    for (const v of j.voices ?? []) if (!seen.has(v.voice_id)) { seen.add(v.voice_id); adaylar.push(v); }
  }
  const sec = adaylar.slice(0, REQ.adet ?? 5);
  const bilgi = [];
  for (const [i, v] of sec.entries()) {
    // Kütüphane sesini hesaba ekle (API ile okutmak için gerekli)
    let id = v.voice_id;
    try {
      const r = await post(`/v1/voices/add/${v.public_owner_id}/${v.voice_id}`, { new_name: `YOL ${i + 1} ${v.name}`.slice(0, 40) });
      id = (await r.json()).voice_id ?? id;
    } catch (e) { console.log(' ! eklenemedi:', v.name, e.message.slice(0, 160)); }
    const f = `${OUT}/ornek-${i + 1}.mp3`;
    try {
      await tts(id, REQ.metin, f);
      bilgi.push({ no: i + 1, ad: v.name, voice_id: id, aciklama: (v.description ?? '').slice(0, 160), aksan: v.accent, yas: v.age, kullanim: v.use_case });
      console.log(` ✓ ${i + 1}. ${v.name} (${v.accent ?? ''}, ${v.age ?? ''}, ${v.use_case ?? ''})`);
    } catch (e) { console.log(' ! okutulamadı:', v.name, e.message.slice(0, 200)); }
  }
  // Karşılaştırma için hazır seslerden derin bir anlatıcı (çok dilli modelle Türkçe okur)
  const hazir = (await get('/v1/voices')).voices.filter((v) => v.category === 'premade' && /Brian|Adam|Bill/.test(v.name)).slice(0, 2);
  for (const [k, v] of hazir.entries()) {
    const no = bilgi.length + 1;
    await tts(v.voice_id, REQ.metin, `${OUT}/ornek-${no}.mp3`);
    bilgi.push({ no, ad: v.name + ' (hazır ses)', voice_id: v.voice_id, aciklama: v.labels ? JSON.stringify(v.labels) : '' });
    console.log(` ✓ ${no}. ${v.name} (hazır)`);
  }
  writeFileSync(`${OUT}/bilgi.json`, JSON.stringify(bilgi, null, 1));
} else if (REQ.islem === 'uret') {
  for (const p of REQ.parcalar) {
    await tts(REQ.ses, p.metin, `${OUT}/${p.ad}.mp3`, p.ayar ?? REQ.ayar ?? {});
    console.log(` ✓ ${p.ad}: ${p.metin.slice(0, 60)}`);
  }
  writeFileSync(`${OUT}/bilgi.json`, JSON.stringify(REQ, null, 1));
}
console.log('Sonra:', await kalan());
