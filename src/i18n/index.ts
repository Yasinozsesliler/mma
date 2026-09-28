// Dil desteği. Kaynak dil Türkçe: metinler Türkçe haliyle anahtar olur, sözlükte karşılığı varsa o dile çevrilir.
// Dil tercihi eşzamanlı okunur ki modüller yüklenirken (sabit listeler dahil) doğru dil hazır olsun.
// Dil değişince uygulama yeniden başlatılır.

import { isLang, type Lang } from './langs';

export { LANGS, type Lang } from './langs';

/** Açılışta boot.ts'in seçtiği dil (Node betiklerinde Türkçe). */
const booted = (globalThis as { __YOL_LANG__?: string }).__YOL_LANG__;
export const LANG: Lang = isLang(booted) ? booted : 'tr';

// CSS text-transform (büyük harf) belge diline göre çalışır: İngilizcede "i" → "I" olmalı, "İ" değil.
try {
  const d = (globalThis as { document?: Document }).document;
  if (d) d.documentElement.lang = LANG;
} catch {}

/** Büyük/küçük harf ve sayı biçimi için yerel ayar (Türkçede i→İ; İngilizcede i→I). */
export const LOC = ({ tr: 'tr-TR', en: 'en-US', es: 'es-ES', pt: 'pt-BR', ru: 'ru-RU' } as const)[LANG];

// Sözlük uygulama açılmadan önce yüklenir (bkz. load.ts / load.web.ts ve kökteki index.ts).
let DICT: Record<string, string> = {};
export function setDict(d: Record<string, string>) {
  DICT = d;
}

/** Çeviri: Türkçe metni (şablon) seçili dile çevirir ve {0}, {ad} gibi yer tutucuları doldurur. */
export function L(s: string, vars?: readonly unknown[] | Record<string, unknown>): string {
  let t = DICT[s] ?? s;
  if (vars) t = t.replace(/\{(\w+)\}/g, (m, k) => (vars as Record<string, unknown>)[k] !== undefined ? String((vars as Record<string, unknown>)[k]) : m);
  return t;
}
