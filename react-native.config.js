// Firebase yerel modülleri her platformda yalnızca o platformun yapılandırma dosyası varken bağlanır (autolinking; bkz. app.config.js).
// Böylece dosyası eklenmeyen platformun derlemesi eskisi gibi Firebase'siz ve sorunsuz çıkar.
const fs = require('fs');
const path = require('path');

const android = fs.existsSync(path.join(__dirname, 'google-services.json'));
const ios = fs.existsSync(path.join(__dirname, 'GoogleService-Info.plist'));
const platforms = { ...(android ? {} : { android: null }), ...(ios ? {} : { ios: null }) };

module.exports = {
  dependencies: {
    '@react-native-firebase/app': { platforms },
    '@react-native-firebase/analytics': { platforms },
  },
};
