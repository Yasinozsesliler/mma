// Çevrimdışı durumu: service worker'a oyunun tüm dosyalarının önbellekte olup olmadığını sorar (yalnızca web).
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type OfflineStatus = { durum: 'hazir' | 'iniyor' | 'guncelleniyor'; surum?: string; eksik?: number; toplam?: number } | null;

export function useOfflineStatus(): OfflineStatus {
  const [st, setSt] = useState<OfflineStatus>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const sw = navigator.serviceWorker;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    const ask = async () => {
      if (!alive) return;
      const reg = await sw.getRegistration().catch(() => undefined);
      if (!reg) return; // geliştirme sunucusunda service worker yok
      if (reg.installing) {
        setSt((p) => ({ ...(p ?? {}), durum: 'guncelleniyor' }));
        timer = setTimeout(ask, 1500);
      } else if (sw.controller) sw.controller.postMessage('durum');
      else {
        setSt({ durum: 'iniyor' });
        timer = setTimeout(ask, 1500);
      }
    };
    const onMsg = (e: MessageEvent) => {
      if (e.data?.tip !== 'durum') return;
      const { surum, eksik, toplam } = e.data as { surum: string; eksik: number; toplam: number };
      setSt({ durum: eksik === 0 ? 'hazir' : 'iniyor', surum, eksik, toplam });
      if (eksik > 0) timer = setTimeout(ask, 2000);
    };
    sw.addEventListener('message', onMsg);
    sw.addEventListener('controllerchange', ask);
    ask();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      sw.removeEventListener('message', onMsg);
      sw.removeEventListener('controllerchange', ask);
    };
  }, []);
  return st;
}
