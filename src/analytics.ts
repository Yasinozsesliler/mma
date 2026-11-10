// Firebase Analytics (Google Analytics 4): oyuncu davranışını anlık izlemek için olay kaydı.
// Firebase yapılandırma dosyaları (google-services.json / GoogleService-Info.plist) projede yoksa yerel modül
// derlemeye girmez; bu durumda her çağrı sessizce hiçbir şey yapmaz, oyun etkilenmez.
// Oyuncu Ayarlar › Gizlilik'ten istatistik paylaşımını kapatabilir.
import { useSyncExternalStore } from 'react';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import { getPref, setPref } from './prefs';

type Params = Record<string, string | number | boolean | undefined>;
type FA = typeof import('@react-native-firebase/analytics');

let mod: FA | null = null;
let inst: ReturnType<FA['getAnalytics']> | null = null;
let triedLoad = false;

/** Firebase'in yerel modülü uygulamaya bağlı mı? Bağlı değilse JS paketine hiç dokunulmaz (yüklemek açılışta çöktürebiliyor). */
function nativeLinked() {
  try {
    return !!(NativeModules?.RNFBAppModule || TurboModuleRegistry?.get?.('RNFBAppModule'));
  } catch {
    return false;
  }
}

function fa() {
  if (!triedLoad) {
    triedLoad = true;
    // Android'de modül bağlıyken bile bu kontrol yanlış "yok" diyebiliyor (Analytics'te Android'den hiç özel olay gelmedi).
    // Android derlemesine Firebase her zaman giriyor (google-services.json depoda); yükleme hatası aşağıda yakalanır.
    if (Platform.OS !== 'android' && !nativeLinked()) return null;
    try {
      mod = require('@react-native-firebase/analytics') as FA;
      inst = mod.getAnalytics();
    } catch {
      mod = null;
      inst = null;
    }
  }
  return mod && inst ? { m: mod, a: inst } : null;
}

const KEY = 'yol_istatistik';
let on = getPref(KEY) !== '0';
const subs = new Set<() => void>();

/** Açılışta bir kez: tercih ve izin durumu Firebase'e bildirilir. */
export function initAnalytics(lang: string) {
  const f = fa();
  if (!f) return;
  void f.m.setAnalyticsCollectionEnabled(f.a, on).catch(() => undefined);
  // Ölçüm (analytics_storage) açık; reklam sinyalleri Analytics üzerinden paylaşılmaz (AdMob kendi iznini yönetir).
  void f.m
    .setConsent(f.a, { analytics_storage: on, ad_storage: false, ad_user_data: false, ad_personalization: false })
    .catch(() => undefined);
  setUserProp('dil', lang);
}

export function setAnalyticsEnabled(v: boolean) {
  on = v;
  setPref(KEY, v ? '1' : '0');
  const f = fa();
  if (f) {
    void f.m.setAnalyticsCollectionEnabled(f.a, v).catch(() => undefined);
    void f.m.setConsent(f.a, { analytics_storage: v, ad_storage: false, ad_user_data: false, ad_personalization: false }).catch(() => undefined);
  }
  subs.forEach((fn) => fn());
}

export function useAnalyticsEnabled() {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    () => on,
    () => on,
  );
}

/** GA4 kuralları: olay/parametre adı en çok 40 karakter, metin değerleri en çok 100 karakter. */
function clean(p?: Params) {
  if (!p) return undefined;
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined) continue;
    out[k.slice(0, 40)] = typeof v === 'boolean' ? (v ? 1 : 0) : typeof v === 'string' ? v.slice(0, 100) : v;
  }
  return out;
}

export function track(name: string, params?: Params) {
  if (!on) return;
  const f = fa();
  if (!f) return;
  try {
    void Promise.resolve(f.m.logEvent(f.a, name.slice(0, 40), clean(params))).catch(() => undefined);
  } catch {}
}

let lastScreen = '';
export function trackScreen(screen: string) {
  if (!on || screen === lastScreen) return;
  lastScreen = screen;
  const f = fa();
  if (!f) return;
  void f.m.logScreenView(f.a, { screen_name: screen, screen_class: screen }).catch(() => undefined);
}

export function setUserProp(name: string, value: string | null) {
  const f = fa();
  if (!f) return;
  void f.m.setUserProperty(f.a, name.slice(0, 24), value ? value.slice(0, 36) : null).catch(() => undefined);
}
