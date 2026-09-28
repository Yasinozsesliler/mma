// Desteklenen diller (bağımlılıksız; hem uygulama hem Node betikleri kullanır).
export type Lang = 'tr' | 'en' | 'es' | 'pt' | 'ru';

export const LANGS: { id: Lang; ad: string; bayrak: string; hazir: boolean }[] = [
  { id: 'tr', ad: 'Türkçe', bayrak: '🇹🇷', hazir: true },
  { id: 'en', ad: 'English', bayrak: '🇬🇧', hazir: true },
  { id: 'es', ad: 'Español', bayrak: '🇪🇸', hazir: true },
  { id: 'pt', ad: 'Português', bayrak: '🇧🇷', hazir: true },
  { id: 'ru', ad: 'Русский', bayrak: '🇷🇺', hazir: true },
];

export const LANG_KEY = 'yol_dil';
export const isLang = (v: string | null | undefined): v is Lang => !!v && LANGS.some((l) => l.id === v && l.hazir);
