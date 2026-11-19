// Web: yalnızca seçili dilin sözlüğü ayrı bir dosya olarak indirilir (Türkçe için hiçbir şey).
import { LANG, setDict } from './index';

export async function loadLang(): Promise<void> {
  try {
    if (LANG === 'en') setDict((await import('./en')).EN);
    else if (LANG === 'es') setDict((await import('./es')).ES);
    else if (LANG === 'pt') setDict((await import('./pt')).PT);
    else if (LANG === 'ru') setDict((await import('./ru')).RU);
    else if (LANG === 'pl') setDict((await import('./pl')).PL);
    else if (LANG === 'de') setDict({ ...(await import('./en')).EN, ...(await import('./de')).DE });
    else if (LANG === 'fr') setDict({ ...(await import('./en')).EN, ...(await import('./fr')).FR });
    else if (LANG === 'it') setDict({ ...(await import('./en')).EN, ...(await import('./it')).IT });
    else if (LANG === 'id') setDict({ ...(await import('./en')).EN, ...(await import('./id')).ID });
    else if (LANG === 'ja') setDict({ ...(await import('./en')).EN, ...(await import('./ja')).JA });
  } catch {
    // Sözlük inemezse (ör. çevrimdışı ve önbellekte yok) oyun Türkçe açılır.
  }
  // Service worker, bir sonraki güncellemede bu dilin dosyasını da çevrimdışı önbelleğe alsın.
  try {
    navigator.serviceWorker?.controller?.postMessage({ tip: 'dil', dil: LANG });
  } catch {}
}
