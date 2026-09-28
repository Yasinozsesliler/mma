// Yerel (iOS/Android): sözlükler pakete gömülü, eşzamanlı yüklenir.
import { LANG, setDict } from './index';

export function loadLang(): Promise<void> | void {
  if (LANG === 'en') setDict(require('./en').EN);
  else if (LANG === 'es') setDict(require('./es').ES);
  else if (LANG === 'pt') setDict(require('./pt').PT);
  else if (LANG === 'ru') setDict(require('./ru').RU);
}
