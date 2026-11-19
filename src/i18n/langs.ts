// Desteklenen diller (bağımlılıksız; hem uygulama hem Node betikleri kullanır).
export type Lang = 'tr' | 'en' | 'es' | 'pt' | 'ru' | 'pl' | 'de' | 'fr' | 'it' | 'id' | 'ja';

export const LANGS: { id: Lang; ad: string; bayrak: string; hazir: boolean }[] = [
  { id: 'tr', ad: 'Türkçe', bayrak: '🇹🇷', hazir: true },
  { id: 'en', ad: 'English', bayrak: '🇬🇧', hazir: true },
  { id: 'es', ad: 'Español', bayrak: '🇪🇸', hazir: true },
  { id: 'pt', ad: 'Português', bayrak: '🇧🇷', hazir: true },
  { id: 'ru', ad: 'Русский', bayrak: '🇷🇺', hazir: true },
  { id: 'pl', ad: 'Polski', bayrak: '🇵🇱', hazir: true },
  { id: 'de', ad: 'Deutsch', bayrak: '🇩🇪', hazir: true },
  { id: 'fr', ad: 'Français', bayrak: '🇫🇷', hazir: true },
  // Çevirisi süren diller: hazir false iken seçilemez ve cihaz dili olarak da seçilmez
  { id: 'it', ad: 'Italiano', bayrak: '🇮🇹', hazir: false },
  { id: 'id', ad: 'Bahasa Indonesia', bayrak: '🇮🇩', hazir: false },
  { id: 'ja', ad: '日本語', bayrak: '🇯🇵', hazir: false },
];

export const LANG_KEY = 'yol_dil';
export const isLang = (v: string | null | undefined): v is Lang => !!v && LANGS.some((l) => l.id === v && l.hazir);
