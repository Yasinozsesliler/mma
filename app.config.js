// app.json'u temel alır; Firebase yalnızca yapılandırma dosyaları proje kökündeyken derlemeye eklenir.
// İkisi birden gerekir (eksikse Firebase eklentisi o platformun derlemesini durdurur). Dosyalar yoksa derleme
// eskisi gibi çalışır, analitik sessizce kapalı kalır (bkz. src/analytics.ts ve react-native.config.js).
//   Android: ./google-services.json      iOS: ./GoogleService-Info.plist   (Firebase konsolundan indirilir)
const fs = require('fs');
const path = require('path');

const has = (f) => fs.existsSync(path.join(__dirname, f));

module.exports = ({ config }) => {
  const android = has('google-services.json');
  const ios = has('GoogleService-Info.plist');
  if (!android || !ios) return config;

  const plugins = [...(config.plugins ?? [])].filter((p) => (Array.isArray(p) ? p[0] : p) !== 'expo-build-properties');
  plugins.push('@react-native-firebase/app', '@react-native-firebase/analytics', ['expo-build-properties', { ios: { useFrameworks: 'dynamic' } }]);

  return {
    ...config,
    android: { ...config.android, googleServicesFile: './google-services.json' },
    ios: { ...config.ios, googleServicesFile: './GoogleService-Info.plist' },
    plugins,
  };
};
