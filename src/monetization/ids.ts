// ─────────────────────────────────────────────────────────────────────────────
// REKLAM VE SATIN ALMA KİMLİKLERİ: hesaplar açılınca YALNIZCA bu dosya ve app.json güncellenir.
//
// 1) AdMob (admob.google.com) → Uygulama ekle (Android ve iOS ayrı ayrı, "YOL: Kafesten Kemere"); iOS kimliği app.json › iosAppId
//    • Uygulama kimliği (ca-app-pub-XXXX~YYYY) → app.json › plugins › react-native-google-mobile-ads › androidAppId
//      ve AYNI kimlik app.json'un en üstündeki "react-native-google-mobile-ads" › android_app_id alanına (kütüphanenin
//      Android derlemesi bu bloğu arar; yoksa derleme çöker).
//    • "Ödüllü" reklam birimi oluştur → aşağıdaki REAL.rewarded
//    • "Geçiş (interstitial)" reklam birimi oluştur → aşağıdaki REAL.interstitial
// 2) Google Play Console → Para kazanma › Ürünler › Uygulama içi ürünler → skus.ts'deki her kimlik için bir ürün
//    Hepsi tek seferlik (tüketilmeyen) ürün; önerilen fiyatlar skus.ts'de (Play her ülke için yerel fiyat önerir).
//
// Gerçek kimlikler boşken ve geliştirme sürümlerinde Google'ın TEST reklamları gösterilir (hesap askıya alınma riski yok).
// ─────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

// Android ve iOS reklam birimleri AdMob'da ayrı oluşturulur (kimlikleri farklıdır).
const REAL_BY_OS = {
  android: {
    rewarded: '', // örn. 'ca-app-pub-1234567890123456/1111111111'
    interstitial: '', // örn. 'ca-app-pub-1234567890123456/2222222222'
  },
  ios: {
    rewarded: '', // AdMob › iOS uygulaması › Ödüllü birim
    interstitial: '', // AdMob › iOS uygulaması › Geçiş birimi
  },
};
const REAL = Platform.OS === 'ios' ? REAL_BY_OS.ios : REAL_BY_OS.android;

const useTest = __DEV__ || !REAL.rewarded || !REAL.interstitial;

export const AD_IDS = {
  rewarded: useTest ? TestIds.REWARDED : REAL.rewarded,
  interstitial: useTest ? TestIds.INTERSTITIAL : REAL.interstitial,
};

export { PREMIUM_SKU } from './skus';
