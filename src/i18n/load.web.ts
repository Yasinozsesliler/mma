// Web: yalnızca seçili dilin sözlüğü ayrı bir dosya olarak indirilir (Türkçe için hiçbir şey).
import { LANG, setDict } from './index';

export async function loadLang(): Promise<void> {
  try {
    if (LANG === 'en') setDict((await import('./en')).EN);
    else if (LANG === 'es') setDict((await import('./es')).ES);
    else if (LANG === 'pt') setDict((await import('./pt')).PT);
    else if (LANG === 'ru') setDict((await import('./ru')).RU);
    else if (LANG === 'pl') setDict((await import('./pl')).PL);
  } catch {
    // Sözlük inemezse (ör. çevrimdışı ve önbellekte yok) oyun Türkçe açılır.
  }
  // Service worker, bir sonraki güncellemede bu dilin dosyasını da çevrimdışı önbelleğe alsın.
  try {
    navigator.serviceWorker?.controller?.postMessage({ tip: 'dil', dil: LANG });
  } catch {}
}
