// Ring spikeri: girişte isim anonsu, maç sonunda sonuç. Telefonun kendi seslendirmesi (expo-speech) kullanılır,
// ek ses dosyası yok; cihazdaki en doğal ses seçilir. Cihazda oyunun dilinde ses yoksa hiç konuşmaz (yanlış aksanla okumaktansa sessizlik).
import * as Speech from 'expo-speech';
import { useSyncExternalStore } from 'react';
import { LOC } from './i18n';
import { getPref, setPref } from './prefs';

const KEY = 'yol_spiker';
let on = getPref(KEY) !== '0';
const subs = new Set<() => void>();

export function setAnnouncer(v: boolean) {
  on = v;
  setPref(KEY, v ? '1' : '0');
  if (!v) {
    token++;
    Speech.stop();
  }
  subs.forEach((f) => f());
}

export function useAnnouncer() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => on,
    () => on,
  );
}

/** Sesin doğallık puanı: "doğal/premium/gelişmiş" sesler öne, eski robotik sesler (Eloquence, yenilik sesleri) arkaya. */
function voiceScore(v: Speech.Voice, loc: string): number {
  const id = `${v.identifier} ${v.name}`.toLowerCase();
  let p = 0;
  if ((v.language ?? '').toLowerCase().replace('_', '-') === loc) p += 2;
  if (v.quality === Speech.VoiceQuality.Enhanced) p += 4;
  if (id.includes('premium')) p += 6;
  if (id.includes('enhanced')) p += 3;
  if (id.includes('natural') || id.includes('neural') || id.includes('online')) p += 5;
  if (id.includes('google') || id.includes('network')) p += 2;
  if (id.includes('compact')) p -= 1;
  if (id.includes('eloquence') || id.includes('speech.synthesis.voice') || id.includes('espeak')) p -= 10;
  return p;
}

type Voices = { spiker?: string; hoca?: string };
// Bu dilde ses var mı, varsa en doğal iki ses hangisi? (tek sefer sorulur)
let voicesP: Promise<Voices | null> | null = null;
function voices(): Promise<Voices | null> {
  if (!voicesP) {
    const loc = LOC.toLowerCase().replace('_', '-');
    const lang = loc.slice(0, 2);
    voicesP = (async () => {
      for (let i = 0; i < 4; i++) {
        try {
          // Web'de ses listesi hiç gelmezse istek asılı kalır: kısa bir süre sonra boş sayılır.
          const v = await Promise.race([Speech.getAvailableVoicesAsync(), new Promise<Speech.Voice[]>((r) => setTimeout(() => r([]), 1200))]);
          // Tarayıcılar ses listesini geç doldurur: boşsa biraz bekleyip yeniden sorulur.
          if (v.length) {
            const mine = v
              .filter((x) => (x.language ?? '').toLowerCase().replace('_', '-').startsWith(lang))
              .sort((a, b) => voiceScore(b, loc) - voiceScore(a, loc));
            if (!mine.length) return null;
            return { spiker: mine[0].identifier, hoca: mine[1]?.identifier };
          }
        } catch {
          return null;
        }
        await new Promise((r) => setTimeout(r, 400));
      }
      return null;
    })();
  }
  return voicesP;
}

/** Uygulama açılırken ses listesini ısıt (ilk anonsta gecikme olmasın). */
export function warmAnnouncer() {
  if (on) void voices();
}

// Her yeni anons ya da susturma eskisini geçersiz kılar (parçalı anonsun kalanı okunmaz).
let token = 0;
// Seçilen ses hata verirse (ör. internetsiz "network" sesi) bir daha denenmez, telefonun varsayılanı kullanılır.
const broken = new Set<string>();

function say(text: string, my: number, opt: { voice?: string; pitch: number; rate: number }): Promise<void> {
  return new Promise<void>((resolve) => {
    const voice = opt.voice && !broken.has(opt.voice) ? opt.voice : undefined;
    const onError = () => {
      // Yeni anons ya da susturma yüzünden kesildiyse (web'de "interrupted" hatası) ses bozuk sayılmaz, tekrar okunmaz.
      if (!voice || my !== token) return resolve();
      broken.add(voice);
      Speech.speak(text, { language: LOC, rate: opt.rate, pitch: opt.pitch, onDone: () => resolve(), onStopped: () => resolve(), onError: () => resolve() });
    };
    Speech.speak(text, { language: LOC, voice, rate: opt.rate, pitch: opt.pitch, onDone: () => resolve(), onStopped: () => resolve(), onError });
  });
}

/**
 * Anons eder; konuşma bitince (ya da en geç `maxMs` sonra) çözülür. Kapalıysa ya da ses yoksa hemen çözülür.
 * "…" ile ayrılmış parçalar arasında gerçek bir duraksama yapılır; son parça (genelde isim) biraz daha ağır okunur.
 */
export async function announce(text: string, maxMs = 7000, who: 'spiker' | 'hoca' = 'spiker'): Promise<void> {
  if (!on || !text) return;
  // Ses kontrolü henüz bitmediyse bu cümle atlanır: sahne spiker yüzünden beklemez.
  const v = await Promise.race([voices(), new Promise<null>((r) => setTimeout(() => r(null), 300))]);
  if (!v) return;
  Speech.stop();
  const my = ++token;
  const voice = who === 'hoca' ? (v.hoca ?? v.spiker) : v.spiker;
  // Hocaya ayrı ses yoksa aynı ses biraz daha hızlı ve hafif tiz konuşur (fark edilsin ama bozulmasın).
  const base = who === 'hoca' ? { pitch: v.hoca ? 1 : 1.06, rate: 1.05 } : { pitch: 1, rate: 0.95 };
  const parts = text
    .split(/…|\.\.\./)
    .map((x) => x.trim())
    .filter((x) => x && /[\p{L}\p{N}]/u.test(x));
  const run = (async () => {
    for (let i = 0; i < parts.length; i++) {
      if (my !== token) return;
      const last = i === parts.length - 1 && parts.length > 1;
      await say(parts[i], my, { voice, pitch: base.pitch, rate: last ? base.rate * 0.9 : base.rate });
      if (i < parts.length - 1) await new Promise((r) => setTimeout(r, 260));
    }
  })();
  await Promise.race([run, new Promise((r) => setTimeout(r, maxMs))]);
}

/** Raunt arası hocanın sesi: spikerden farklı seste, emojisiz ve kısa (ilk iki cümle). */
export function speakCoach(text: string) {
  const clean = text
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}➤•]/gu, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join('. ');
  void announce(clean, 12000, 'hoca');
}

export function stopAnnounce() {
  token++;
  Speech.stop();
}
