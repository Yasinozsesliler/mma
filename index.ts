// Dil seçimi her şeyden önce yapılır (çeviri çekirdeği yüklenirken hazır olmalı).
import './src/i18n/boot';
import { registerRootComponent } from 'expo';

import { loadLang } from './src/i18n/load';

// Dil sözlüğü, oyun modülleri (sabit listeler dahil) yüklenmeden önce hazır olmalı; App bu yüzden sonra yüklenir.
// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
function start() {
  // Animasyon stüdyosu (yalnızca bu dalda, web ?studyo): seri sahneleri için
  const studyo = typeof window !== 'undefined' && /studyo/.test(window.location?.search ?? '');
  registerRootComponent(studyo ? require('./src/studyo/Studyo').default : require('./App').default);
}

const loading = loadLang();
if (loading) loading.then(start);
else start();
