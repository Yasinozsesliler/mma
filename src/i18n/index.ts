// Dil desteği. Kaynak dil Türkçe: metinler Türkçe haliyle anahtar olur, sözlükte karşılığı varsa o dile çevrilir.
// Dil tercihi eşzamanlı okunur ki modüller yüklenirken (sabit listeler dahil) doğru dil hazır olsun.
// Dil değişince uygulama yeniden başlatılır.
import { EN } from './en';

export type Lang = 'tr' | 'en' | 'es' | 'pt' | 'ru';

export const LANGS: { id: Lang; ad: string; bayrak: string; hazir: boolean }[] = [
  { id: 'tr', ad: 'Türkçe', bayrak: '🇹🇷', hazir: true },
  { id: 'en', ad: 'English', bayrak: '🇬🇧', hazir: true },
  { id: 'es', ad: 'Español', bayrak: '🇪🇸', hazir: false },
  { id: 'pt', ad: 'Português', bayrak: '🇧🇷', hazir: false },
  { id: 'ru', ad: 'Русский', bayrak: '🇷🇺', hazir: false },
];

const KEY = 'yol_dil';

function readLang(): Lang {
  try {
    const v = (globalThis as { localStorage?: Storage }).localStorage?.getItem(KEY);
    if (v && LANGS.some((l) => l.id === v && l.hazir)) return v as Lang;
  } catch {}
  return 'tr';
}

export const LANG: Lang = readLang();

// CSS text-transform (büyük harf) belge diline göre çalışır: İngilizcede "i" → "I" olmalı, "İ" değil.
try {
  const d = (globalThis as { document?: Document }).document;
  if (d) d.documentElement.lang = LANG;
} catch {}

/** Büyük/küçük harf ve sayı biçimi için yerel ayar (Türkçede i→İ; İngilizcede i→I). */
export const LOC = ({ tr: 'tr-TR', en: 'en-US', es: 'es-ES', pt: 'pt-BR', ru: 'ru-RU' } as const)[LANG];

const DICT: Record<string, string> = LANG === 'en' ? EN : {};

/** Çeviri: Türkçe metni (şablon) seçili dile çevirir ve {0}, {ad} gibi yer tutucuları doldurur. */
export function L(s: string, vars?: readonly unknown[] | Record<string, unknown>): string {
  let t = DICT[s] ?? s;
  if (vars) t = t.replace(/\{(\w+)\}/g, (m, k) => (vars as Record<string, unknown>)[k] !== undefined ? String((vars as Record<string, unknown>)[k]) : m);
  return t;
}

export function setLang(l: Lang) {
  try {
    (globalThis as { localStorage?: Storage }).localStorage?.setItem(KEY, l);
  } catch {}
  try {
    (globalThis as { location?: Location }).location?.reload();
  } catch {}
}
