// Küçük, eşzamanlı ayarlar (dil, ses, premium). Yerel: expo-sqlite anahtar-değer deposu (eşzamanlı okunur,
// böylece dil gibi ayarlar modüller yüklenirken hazır olur).
import { reloadAppAsync } from 'expo';
import Storage from 'expo-sqlite/kv-store';

export function getPref(key: string): string | null {
  try {
    return Storage.getItemSync(key);
  } catch {
    return null;
  }
}

export function setPref(key: string, value: string) {
  try {
    Storage.setItemSync(key, value);
  } catch {}
}

/** Uygulamayı baştan başlatır (dil değişince). */
export function restartApp() {
  void reloadAppAsync('dil değişti');
}
