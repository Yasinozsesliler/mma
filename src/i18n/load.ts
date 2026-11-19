// Yerel (iOS/Android): sözlükler pakete gömülü, eşzamanlı yüklenir.
import { LANG, setDict } from './index';

export function loadLang(): Promise<void> | void {
  if (LANG === 'en') setDict(require('./en').EN);
  else if (LANG === 'es') setDict(require('./es').ES);
  else if (LANG === 'pt') setDict(require('./pt').PT);
  else if (LANG === 'ru') setDict(require('./ru').RU);
  else if (LANG === 'pl') setDict(require('./pl').PL);
  // Yeni diller: çevrilmemiş metinler İngilizce kalır
  else if (LANG === 'de') setDict({ ...require('./en').EN, ...require('./de').DE });
  else if (LANG === 'fr') setDict({ ...require('./en').EN, ...require('./fr').FR });
  else if (LANG === 'it') setDict({ ...require('./en').EN, ...require('./it').IT });
  else if (LANG === 'id') setDict({ ...require('./en').EN, ...require('./id').ID });
  else if (LANG === 'ja') setDict({ ...require('./en').EN, ...require('./ja').JA });
}
