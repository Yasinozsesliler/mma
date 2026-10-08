// Geri bildirim: e-posta uygulamasını, konu ve cihaz bilgisi hazır şekilde açar (testçiler ve oyuncular için).
import * as Application from 'expo-application';
import { Linking, Platform } from 'react-native';
import { errorReport } from './errorLog';
import { L, LANG } from './i18n';

export const FEEDBACK_EMAIL = 'yasinozsesliler2231@gmail.com';

function deviceLine() {
  const c = (Platform.constants ?? {}) as { Brand?: string; Manufacturer?: string; Model?: string; Release?: string; systemName?: string };
  const surum = `${Application.nativeApplicationVersion ?? 'web'} (${Application.nativeBuildVersion ?? '-'})`;
  const cihaz = Platform.OS === 'web' ? (typeof navigator !== 'undefined' ? navigator.userAgent : 'web') : `${c.Manufacturer ?? c.Brand ?? ''} ${c.Model ?? ''}`.trim();
  const os = Platform.OS === 'android' ? `Android ${c.Release ?? Platform.Version}` : Platform.OS === 'ios' ? `iOS ${Platform.Version}` : 'Web';
  return `YOL ${surum} · ${cihaz} · ${os} · ${LANG}`;
}

/** hata: ekran çökmesinden açıldıysa konu "hata raporu" olur. Cihazdaki son hatalar e-postanın sonuna eklenir. */
export async function sendFeedback(hata = false) {
  const subject = hata ? L("YOL hata raporu") : L("YOL geri bildirim");
  const log = errorReport();
  const body = `${hata ? L("Hata olmadan hemen önce ne yapıyordun?") : L("Ne oldu / ne önerirsin?")}\n\n\n\n—\n${deviceLine()}${log ? `\n\n${L("Son hatalar:")}\n${log}` : ''}`;
  const url = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
