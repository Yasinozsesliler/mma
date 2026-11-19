// Uygulama açılırken (kökteki index.ts'in ilk satırı) dili seçer: kayıtlı tercih, yoksa cihaz dili, yoksa İngilizce.
// Seçim, çeviri çekirdeği (./index) yüklenmeden önce hazır olmalı; Node betikleri bu dosyayı yüklemez (Türkçe kalır).
import { getLocales } from 'expo-localization';
import { getPref, restartApp, setPref } from '../prefs';
import { isLang, LANG_KEY, type Lang } from './langs';

function pick(): Lang {
  const saved = getPref(LANG_KEY);
  if (isLang(saved)) return saved;
  try {
    // Bazı Android sürümleri Endonezceyi eski 'in' koduyla bildirir
    for (const loc of getLocales()) {
      const code = loc.languageCode === 'in' ? 'id' : loc.languageCode;
      if (isLang(code)) return code;
    }
  } catch {}
  return 'en';
}

(globalThis as { __YOL_LANG__?: Lang }).__YOL_LANG__ = pick();

/** Dili değiştirir ve uygulamayı yeniden başlatır. */
export function setLang(l: Lang) {
  setPref(LANG_KEY, l);
  restartApp();
}
