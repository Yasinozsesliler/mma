// Tam ekran (Android): alttaki gezinme çubuğu gizlenir; oyuncu ekranın altından kaydırınca kısa süreliğine görünür.
// Bazı telefonlar uygulama arka plandan dönünce ya da bir pencere kapanınca çubuğu geri getirir; o yüzden her dönüşte yeniden gizlenir.
import { NavigationBar } from 'expo-navigation-bar';
import { AppState, Platform } from 'react-native';

export function hideNavBar() {
  if (Platform.OS !== 'android') return;
  try {
    NavigationBar.setHidden(true);
  } catch {}
}

let kuruldu = false;
export function installImmersive() {
  if (kuruldu || Platform.OS !== 'android') return;
  kuruldu = true;
  // Açılış ekranı sırasında değil, uygulama çizildikten sonra (erken çağrı bazı telefonlarda yerel tarafta sorun çıkarabiliyor)
  setTimeout(hideNavBar, 1500);
  AppState.addEventListener('change', (s) => s === 'active' && setTimeout(hideNavBar, 300));
}
