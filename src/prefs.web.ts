// Küçük, eşzamanlı ayarlar (dil, ses, premium). Web: tarayıcının localStorage'ı.
const ls = () => (globalThis as { localStorage?: Storage }).localStorage;

export function getPref(key: string): string | null {
  try {
    return ls()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function setPref(key: string, value: string) {
  try {
    ls()?.setItem(key, value);
  } catch {}
}

/** Uygulamayı baştan başlatır (dil değişince). */
export function restartApp() {
  try {
    (globalThis as { location?: Location }).location?.reload();
  } catch {}
}
