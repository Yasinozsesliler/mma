// Paylaşım kartı şablonları (afiş tasarımcısı): Klasik ücretsiz, diğerleri Şampiyon Paketi. Seçim cihazda hatırlanır.
import { L } from '../i18n';
import { getPref, setPref } from '../prefs';
import { seasonCardNow } from '../cosmetics';

export type CardThemeId = 'klasik' | 'altin' | 'gece' | 'zumrut' | 'neon' | 'sezon';
export type CardTheme = { ad: () => string; bg: [string, string, string]; serit: string; vurgu?: string; pro: boolean };

export const CARD_THEMES: Record<CardThemeId, CardTheme> = {
  klasik: { ad: () => L("Klasik"), bg: ['#1c070b', '#0b0c10', '#040405'], serit: '#e63946', pro: false },
  altin: { ad: () => L("Altın"), bg: ['#2a1d05', '#0f0c06', '#040405'], serit: '#f2c14e', vurgu: '#f2c14e', pro: true },
  gece: { ad: () => L("Gece"), bg: ['#06142e', '#0a0d18', '#040405'], serit: '#3aa8ff', vurgu: '#7cc4ff', pro: true },
  zumrut: { ad: () => L("Zümrüt"), bg: ['#062a1a', '#081410', '#040405'], serit: '#2ec4b6', vurgu: '#5ee6c4', pro: true },
  neon: { ad: () => L("Neon"), bg: ['#1c0630', '#0d0816', '#040405'], serit: '#c86bff', vurgu: '#e0aaff', pro: true },
  // Sezon Kemeri'nden kazanılan şablon: renkler kuşanılan karttan gelir (dolapta kuşanılmadıysa listede görünmez)
  get sezon(): CardTheme {
    const r = seasonCardNow();
    return r ? { ad: () => L("Sezon"), bg: [r[0], '#0b0c10', '#040405'], serit: r[1], vurgu: r[2], pro: false } : { ...CARD_THEMES.klasik, ad: () => L("Sezon") };
  },
};
export const CARD_THEME_IDS = Object.keys(CARD_THEMES) as CardThemeId[];

const KEY = 'yol_kart_tema';
export const savedCardTheme = (): CardThemeId => {
  const v = getPref(KEY) as CardThemeId | null;
  return v && v in CARD_THEMES ? v : 'klasik';
};
export const saveCardTheme = (t: CardThemeId) => setPref(KEY, t);
export const themeOf = (id?: CardThemeId) => CARD_THEMES[id ?? 'klasik'];
