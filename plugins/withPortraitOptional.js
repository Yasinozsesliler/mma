// Android: oyun dikey çalışır, ama "dikey ekran" donanım özelliği zorunlu ilan edilmesin. Yoksa Play Console
// "Zorunlu donanım özelliği uygulamanın kullanılabilirliğini kısıtlıyor" uyarısı verir ve dikeyi desteklemeyen
// cihazlar (bazı tabletler, Chromebook, Play Games on PC) oyunu kuramaz. Ekran yönü yine app.json'daki "portrait".
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withPortraitOptional(config) {
  return withAndroidManifest(config, (c) => {
    const m = c.modResults.manifest;
    m['uses-feature'] = (m['uses-feature'] ?? []).filter((f) => f.$['android:name'] !== 'android.hardware.screen.portrait');
    m['uses-feature'].push({ $: { 'android:name': 'android.hardware.screen.portrait', 'android:required': 'false' } });
    if (!m.$['xmlns:tools']) m.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    return c;
  });
};
