// AdMob arabuluculuğu (mediation): Unity Ads ve Liftoff Monetize (Vungle) adaptörleri. Reklamları yine AdMob gösterir;
// AdMob panelindeki arabuluculuk grubunda bu kaynaklar varsa onların reklamları da yarışır. Oyun kodunda değişiklik gerekmez.
//  • Android: ağ SDK'ları + Google'ın adaptörleri (app/build.gradle bağımlılıkları)
//  • iOS: GoogleMobileAdsMediation* pod'ları ve ağların SKAdNetwork kimlikleri (Info.plist)
// Sürümler: https://developers.google.com/admob/android/mediation/unity · .../mediation/liftoff-monetize
// Android adaptörleri play-services-ads 25.4.0 isteyen sürümlerde (react-native-google-mobile-ads ile aynı): 25.5.0 isteyenler
// daha yeni Kotlin ile derlendiği için :app:compileReleaseKotlin hata veriyor.
const { withAppBuildGradle, withInfoPlist, withPodfile } = require('expo/config-plugins');

const NETWORKS = [
  {
    ad: 'Unity Ads',
    android: ['com.unity3d.ads:unity-ads:4.20.1', 'com.google.ads.mediation:unity:4.20.1.0'],
    pod: ['GoogleMobileAdsMediationUnity', '4.21.0.0'],
    skan: require('./unity-skadnetworks.json'),
  },
  {
    // Adaptör Liftoff SDK'sını (com.vungle:vungle-ads) kendisi getirir.
    ad: 'Liftoff Monetize',
    android: ['com.google.ads.mediation:vungle:7.7.8.1'],
    pod: ['GoogleMobileAdsMediationVungle', '7.7.8.0'],
    skan: require('./liftoff-skadnetworks.json'),
  },
];
const MARK = '// AdMob mediation (withAdMediation)';

const withAndroid = (config) =>
  withAppBuildGradle(config, (c) => {
    if (c.modResults.contents.includes(MARK)) return c;
    const lines = NETWORKS.flatMap((n) => n.android.map((d) => `    implementation("${d}")`)).join('\n');
    c.modResults.contents = c.modResults.contents.replace(/dependencies\s*\{/, `dependencies {\n    ${MARK}\n${lines}`);
    // play-services-ads 25.x Kotlin 2.3 ile derlendi, React Native Kotlin 2.1 kullanıyor: sürüm denetimi atlanmazsa
    // :app:compileReleaseKotlin "incompatible version of Kotlin" hatasıyla durur (bayt kodu uyumlu, yalnızca üst veri yeni).
    c.modResults.contents += `\n${MARK}\ntasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {\n    compilerOptions.freeCompilerArgs.add("-Xskip-metadata-version-check")\n}\n`;
    return c;
  });

const withIosPods = (config) =>
  withPodfile(config, (c) => {
    if (c.modResults.contents.includes(NETWORKS[0].pod[0])) return c;
    const pods = NETWORKS.map((n) => `  pod '${n.pod[0]}', '${n.pod[1]}'\n`).join('');
    // Uygulama hedefinin içine, use_expo_modules! satırının hemen altına eklenir.
    const next = c.modResults.contents.replace(/(\n\s*use_expo_modules!.*\n)/, `$1${pods}`);
    // Şablon değişip satır bulunamazsa sessizce geçmesin: derleme açık bir hatayla dursun.
    if (next === c.modResults.contents) throw new Error('withAdMediation: Podfile içinde use_expo_modules! bulunamadı');
    c.modResults.contents = next;
    return c;
  });

const withIosSkan = (config) =>
  withInfoPlist(config, (c) => {
    const items = Array.isArray(c.modResults.SKAdNetworkItems) ? c.modResults.SKAdNetworkItems : [];
    const have = new Set(items.map((x) => String(x.SKAdNetworkIdentifier).toLowerCase()));
    NETWORKS.flatMap((n) => n.skan).forEach((id) => {
      if (!have.has(id)) {
        have.add(id);
        items.push({ SKAdNetworkIdentifier: id });
      }
    });
    c.modResults.SKAdNetworkItems = items;
    return c;
  });

module.exports = (config) => withIosSkan(withIosPods(withAndroid(config)));
