// Hata günlüğü: yakalanmayan JS hataları ve ekran çökmeleri cihazda saklanır (son 8), geri bildirim e-postasına eklenir.
// Sunucuya kendiliğinden hiçbir şey gönderilmez; oyuncu "Hatayı bildir" deyince e-postada görür ve kendisi yollar.
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { getPref, setPref } from './prefs';

const KEY = 'yol_hatalar';
const MAX = 8;

export type HataKaydi = { t: number; yer: string; m: string; s?: string; v: string };

export function errorList(): HataKaydi[] {
  try {
    const v = JSON.parse(getPref(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function logError(e: unknown, yer: string) {
  try {
    const err = e instanceof Error ? e : new Error(String(e));
    const kayit: HataKaydi = {
      t: Date.now(),
      yer,
      m: String(err.message ?? err).slice(0, 200),
      s: err.stack?.split('\n').slice(0, 4).join(' | ').slice(0, 400),
      v: `${Application.nativeApplicationVersion ?? 'web'}(${Application.nativeBuildVersion ?? '-'})`,
    };
    const list = errorList();
    // Aynı hata art arda tekrarlanıyorsa günlüğü doldurmasın
    if (list[0]?.m === kayit.m && list[0]?.yer === kayit.yer) list[0] = kayit;
    else list.unshift(kayit);
    setPref(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {}
}

export function clearErrors() {
  setPref(KEY, '[]');
}

/** E-postaya eklenecek kısa özet (mailto sınırı için kırpılır). */
export function errorReport(max = 1500): string {
  const list = errorList();
  if (!list.length) return '';
  const lines = list.map((h) => `[${new Date(h.t).toISOString().slice(0, 16)}] ${h.yer} · ${h.v}\n${h.m}${h.s ? `\n${h.s}` : ''}`);
  return lines.join('\n\n').slice(0, max);
}

let kuruldu = false;
/** Yakalanmayan hataları günlüğe yazar; önceki işleyiciyi (kırmızı ekran, çökme raporu) bozmaz. */
export function installErrorLog() {
  if (kuruldu) return;
  kuruldu = true;
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.addEventListener('error', (ev) => logError(ev.error ?? ev.message, 'js'));
    window.addEventListener('unhandledrejection', (ev) => logError(ev.reason, 'promise'));
    return;
  }
  const g = globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (f: (e: unknown, fatal?: boolean) => void) => void } };
  const eu = g.ErrorUtils;
  if (!eu) return;
  const prev = eu.getGlobalHandler();
  eu.setGlobalHandler((e, fatal) => {
    logError(e, fatal ? 'fatal' : 'js');
    prev(e, fatal);
  });
}
