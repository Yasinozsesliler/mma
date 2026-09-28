// ─────────────────────────────────────────────────────────────────────────────
// YAYIN AYARLARI: mağaza öncesi doldurulacak (bkz. STORE.md).
// WEB_URL: oyunun web adresi (Vercel), örn. 'https://yol-mma.vercel.app' (sonunda / olmadan).
// Gizlilik politikası bu adreste /gizlilik.html olarak yayınlanır; Google Play'de de bu bağlantı verilir.
// ─────────────────────────────────────────────────────────────────────────────
export const WEB_URL = '';

export const PRIVACY_PATH = '/gizlilik.html';

/** Gizlilik politikası bağlantısı (web'de göreli; mağaza sürümünde WEB_URL doluysa tam adres). */
export function privacyUrl(isWeb: boolean): string | null {
  if (isWeb) return PRIVACY_PATH;
  return WEB_URL ? WEB_URL + PRIVACY_PATH : null;
}
