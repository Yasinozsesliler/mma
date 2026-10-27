// Ring spikeri: girişte isim anonsu, maç sonunda sonuç. Telefonun kendi seslendirmesi (expo-speech) kullanılır,
// ek ses dosyası yok. Cihazda oyunun dilinde ses yoksa hiç konuşmaz (yanlış aksanla okumaktansa sessizlik).
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
  if (!v) Speech.stop();
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

// Bu dilde ses var mı? (tek sefer sorulur)
let voiceOk: Promise<boolean> | null = null;
function hasVoice(): Promise<boolean> {
  if (!voiceOk) {
    const lang = LOC.slice(0, 2).toLowerCase();
    voiceOk = (async () => {
      for (let i = 0; i < 4; i++) {
        try {
          // Web'de ses listesi hiç gelmezse istek asılı kalır: kısa bir süre sonra boş sayılır.
          const v = await Promise.race([Speech.getAvailableVoicesAsync(), new Promise<Speech.Voice[]>((r) => setTimeout(() => r([]), 1200))]);
          // Tarayıcılar ses listesini geç doldurur: boşsa biraz bekleyip yeniden sorulur.
          if (v.length) return v.some((x) => (x.language ?? '').toLowerCase().replace('_', '-').startsWith(lang));
        } catch {
          return false;
        }
        await new Promise((r) => setTimeout(r, 400));
      }
      return false;
    })();
  }
  return voiceOk;
}

/** Uygulama açılırken ses listesini ısıt (ilk anonsta gecikme olmasın). */
export function warmAnnouncer() {
  if (on) void hasVoice();
}

/**
 * Anons eder; konuşma bitince (ya da en geç `maxMs` sonra) çözülür.
 * Kapalıysa ya da ses yoksa hemen çözülür.
 */
export async function announce(text: string, maxMs = 7000, voice: { pitch: number; rate: number } = { pitch: 0.8, rate: 0.95 }): Promise<void> {
  if (!on || !text) return;
  // Ses kontrolü henüz bitmediyse bu cümle atlanır: sahne spiker yüzünden beklemez.
  const ok = await Promise.race([hasVoice(), new Promise<boolean>((r) => setTimeout(() => r(false), 300))]);
  if (!ok) return;
  Speech.stop();
  await new Promise<void>((resolve) => {
    const t = setTimeout(resolve, maxMs);
    const done = () => {
      clearTimeout(t);
      resolve();
    };
    Speech.speak(text, { language: LOC, rate: voice.rate, pitch: voice.pitch, onDone: done, onStopped: done, onError: done });
  });
}

/** Raunt arası hocanın sesi: spikerden farklı tonda, emojisiz ve kısa (ilk iki cümle). */
export function speakCoach(text: string) {
  const clean = text
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}➤•]/gu, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join('. ');
  void announce(clean, 12000, { pitch: 1.05, rate: 1.05 });
}

export function stopAnnounce() {
  Speech.stop();
}
