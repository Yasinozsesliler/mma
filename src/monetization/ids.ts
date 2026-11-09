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
    rewarded: 'ca-app-pub-6387108639379747/4985012523',
    interstitial: 'ca-app-pub-6387108639379747/3990283601',
  },
  ios: {
    rewarded: 'ca-app-pub-6387108639379747/5010528290',
    interstitial: 'ca-app-pub-6387108639379747/2084237195',
  },
};
const REAL = Platform.OS === 'ios' ? REAL_BY_OS.ios : REAL_BY_OS.android;

// Her birim ayrı: kimliği girilmemiş birim (ve geliştirme sürümü) test reklamı gösterir.
export const AD_IDS = {
  rewarded: __DEV__ || !REAL.rewarded ? TestIds.REWARDED : REAL.rewarded,
  interstitial: __DEV__ || !REAL.interstitial ? TestIds.INTERSTITIAL : REAL.interstitial,
};

export { PREMIUM_SKU } from './skus';
