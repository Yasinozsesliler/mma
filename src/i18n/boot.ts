// Uygulama açılırken (kökteki index.ts'in ilk satırı) dili seçer: kayıtlı tercih, yoksa cihaz dili, yoksa İngilizce.
// Seçim, çeviri çekirdeği (./index) yüklenmeden önce hazır olmalı; Node betikleri bu dosyayı yüklemez (Türkçe kalır).
import { getLocales } from 'expo-localization';
import { getPref, restartApp, setPref } from '../prefs';
import { isLang, LANG_KEY, type Lang } from './langs';

function pick(): Lang {
  const saved = getPref(LANG_KEY);
  if (isLang(saved)) return saved;
  try {
    for (const loc of getLocales()) if (isLang(loc.languageCode)) return loc.languageCode;
  } catch {}
  return 'en';
}

(globalThis as { __YOL_LANG__?: Lang }).__YOL_LANG__ = pick();

/** Dili değiştirir ve uygulamayı yeniden başlatır. */
export function setLang(l: Lang) {
  setPref(LANG_KEY, l);
  restartApp();
}
