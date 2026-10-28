// AdMob arabuluculuğu (mediation) için Unity Ads adaptörü. Reklamları yine AdMob gösterir; AdMob panelindeki
// arabuluculuk grubunda Unity Ads kaynağı varsa Unity'nin reklamı da yarışır. Oyun kodunda değişiklik gerekmez.
//  • Android: Unity Ads SDK + Google'ın Unity adaptörü (app/build.gradle bağımlılıkları)
//  • iOS: GoogleMobileAdsMediationUnity pod'u ve Unity'nin SKAdNetwork kimlikleri (Info.plist)
// Sürümler birlikte güncellenmeli: https://developers.google.com/admob/android/mediation/unity
const { withAppBuildGradle, withInfoPlist, withPodfile } = require('expo/config-plugins');
const UNITY_SKAN = require('./unity-skadnetworks.json');

const ANDROID_UNITY_SDK = '4.21.0';
const ANDROID_ADAPTER = '4.21.0.0';
const IOS_ADAPTER = '4.21.0.0';
const MARK = '// Unity Ads mediation (withUnityAdsMediation)';

const withAndroid = (config) =>
  withAppBuildGradle(config, (c) => {
    if (c.modResults.contents.includes(MARK)) return c;
    c.modResults.contents = c.modResults.contents.replace(
      /dependencies\s*\{/,
      `dependencies {\n    ${MARK}\n    implementation("com.unity3d.ads:unity-ads:${ANDROID_UNITY_SDK}")\n    implementation("com.google.ads.mediation:unity:${ANDROID_ADAPTER}")`,
    );
    return c;
  });

const withIosPod = (config) =>
  withPodfile(config, (c) => {
    if (c.modResults.contents.includes('GoogleMobileAdsMediationUnity')) return c;
    // Uygulama hedefinin içine, use_expo_modules! satırının hemen altına eklenir.
    const next = c.modResults.contents.replace(/(\n\s*use_expo_modules!.*\n)/, `$1  pod 'GoogleMobileAdsMediationUnity', '${IOS_ADAPTER}'\n`);
    // Şablon değişip satır bulunamazsa sessizce geçmesin: derleme açık bir hatayla dursun.
    if (next === c.modResults.contents) throw new Error('withUnityAdsMediation: Podfile içinde use_expo_modules! bulunamadı');
    c.modResults.contents = next;
    return c;
  });

const withIosSkan = (config) =>
  withInfoPlist(config, (c) => {
    const items = Array.isArray(c.modResults.SKAdNetworkItems) ? c.modResults.SKAdNetworkItems : [];
    const have = new Set(items.map((x) => String(x.SKAdNetworkIdentifier).toLowerCase()));
    UNITY_SKAN.forEach((id) => have.has(id) || items.push({ SKAdNetworkIdentifier: id }));
    c.modResults.SKAdNetworkItems = items;
    return c;
  });

module.exports = (config) => withIosSkan(withIosPod(withAndroid(config)));
