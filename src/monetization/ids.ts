// ─────────────────────────────────────────────────────────────────────────────
// REKLAM VE SATIN ALMA KİMLİKLERİ: hesaplar açılınca YALNIZCA bu dosya ve app.json güncellenir.
//
// 1) AdMob (admob.google.com) → Uygulama ekle (Android, "YOL: Kafesten Kemere")
//    • Uygulama kimliği (ca-app-pub-XXXX~YYYY) → app.json › plugins › react-native-google-mobile-ads › androidAppId
//    • "Ödüllü" reklam birimi oluştur → aşağıdaki REAL.rewarded
//    • "Geçiş (interstitial)" reklam birimi oluştur → aşağıdaki REAL.interstitial
// 2) Google Play Console → Para kazanma › Ürünler › Uygulama içi ürünler → ürün kimliği: PREMIUM_SKU (aşağıda)
//    Tek seferlik (tüketilmeyen) ürün; önerilen fiyat ≈ 2,99 $ (Play her ülke için yerel fiyat önerir).
//
// Gerçek kimlikler boşken ve geliştirme sürümlerinde Google'ın TEST reklamları gösterilir (hesap askıya alınma riski yok).
// ─────────────────────────────────────────────────────────────────────────────
import { TestIds } from 'react-native-google-mobile-ads';

const REAL = {
  rewarded: '', // örn. 'ca-app-pub-1234567890123456/1111111111'
  interstitial: '', // örn. 'ca-app-pub-1234567890123456/2222222222'
};

const useTest = __DEV__ || !REAL.rewarded || !REAL.interstitial;

export const AD_IDS = {
  rewarded: useTest ? TestIds.REWARDED : REAL.rewarded,
  interstitial: useTest ? TestIds.INTERSTITIAL : REAL.interstitial,
};

/** Şampiyon Paketi: reklamsız oyun + ödüller reklamsız + 2 ekstra kariyer yuvası. */
export const PREMIUM_SKU = 'sampiyon_paketi';
