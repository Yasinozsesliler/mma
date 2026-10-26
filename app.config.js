// app.json'u temel alır; Firebase yalnızca o platformun yapılandırma dosyası proje kökündeyken derlemeye eklenir.
//   Android: ./google-services.json      iOS: ./GoogleService-Info.plist   (Firebase konsolundan indirilir)
// Her platform kendi dosyasına bakar (EAS derlemesi EAS_BUILD_PLATFORM ile hangisi olduğunu bildirir): yalnızca Android
// dosyası varken Android derlemesi Firebase'li, iOS derlemesi eskisi gibi Firebase'siz çıkar. Dosya yoksa analitik
// sessizce kapalı kalır (bkz. src/analytics.ts ve react-native.config.js).
const fs = require('fs');
const path = require('path');

const has = (f) => fs.existsSync(path.join(__dirname, f));

module.exports = ({ config }) => {
  const platform = process.env.EAS_BUILD_PLATFORM; // 'android' | 'ios' | undefined (yerel geliştirme)
  const android = has('google-services.json') && platform !== 'ios';
  const ios = has('GoogleService-Info.plist') && platform !== 'android';
  // Platform bilinmiyorsa (expo start, prebuild) ikisi birden gerekir; yoksa Firebase eklentisi eksik olanı durdurur
  const on = platform ? (platform === 'android' ? android : ios) : android && ios;
  if (!on) return config;

  const plugins = [...(config.plugins ?? [])].filter((p) => (Array.isArray(p) ? p[0] : p) !== 'expo-build-properties');
  plugins.push('@react-native-firebase/app', '@react-native-firebase/analytics');
  if (ios) plugins.push(['expo-build-properties', { ios: { useFrameworks: 'dynamic' } }]);

  return {
    ...config,
    android: android ? { ...config.android, googleServicesFile: './google-services.json' } : config.android,
    ios: ios ? { ...config.ios, googleServicesFile: './GoogleService-Info.plist' } : config.ios,
    plugins,
  };
};
