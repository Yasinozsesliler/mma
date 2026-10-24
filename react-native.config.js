// Firebase yerel modülleri yalnızca iki yapılandırma dosyası da varken bağlanır (autolinking; bkz. app.config.js).
// Böylece dosya eklenmeden alınan iOS/Android derlemeleri eskisi gibi Firebase'siz ve sorunsuz çıkar.
const fs = require('fs');
const path = require('path');

const android = fs.existsSync(path.join(__dirname, 'google-services.json'));
const ios = fs.existsSync(path.join(__dirname, 'GoogleService-Info.plist'));
const platforms = android && ios ? {} : { android: null, ios: null };

module.exports = {
  dependencies: {
    '@react-native-firebase/app': { platforms },
    '@react-native-firebase/analytics': { platforms },
  },
};
