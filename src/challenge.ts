// Arkadaşına meydan oku: Günün Dövüşü skoru bir bağlantıyla paylaşılır (sunucu yok; bilgi bağlantının içinde).
// Bağlantıyı açan aynı günün dövüşünü oynar, sonunda iki skor yan yana çıkar.
import { Platform, Share } from 'react-native';
import { WEB_URL } from './appConfig';
import { getPref, setPref } from './prefs';

export type Challenge = { gun: number; skor: number };

const KEY = 'yol_meydan';
const PARAM = 'meydan';

/** Paylaşılacak bağlantı (web adresi bilinmiyorsa null). */
export function challengeLink(gun: number, skor: number): string | null {
  const base = WEB_URL || (Platform.OS === 'web' && typeof location !== 'undefined' ? location.origin : '');
  return base ? `${base}/?${PARAM}=${gun}-${skor}` : null;
}

/** Web: açılış adresindeki meydan okumayı saklar ve adresi temizler (yenilemede tekrar okunmasın). */
export function readChallengeFromUrl() {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return;
  try {
    const u = new URL(location.href);
    const v = u.searchParams.get(PARAM);
    if (!v) return;
    const m = /^(\d{1,5})-(\d{1,4})$/.exec(v);
    if (m) setPref(KEY, JSON.stringify({ gun: Number(m[1]), skor: Number(m[2]) }));
    u.searchParams.delete(PARAM);
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  } catch {}
}

/** Bugüne ait bekleyen meydan okuma (eskiyse yok sayılır). */
export function challengeFor(gun: number): Challenge | null {
  try {
    const c = JSON.parse(getPref(KEY) || 'null') as Challenge | null;
    return c && c.gun === gun ? c : null;
  } catch {
    return null;
  }
}

/** Metni paylaşır; paylaşım menüsü yoksa panoya kopyalar. 'kopyalandi' | 'paylasildi' | 'hata' */
export async function shareText(message: string): Promise<'paylasildi' | 'kopyalandi' | 'hata'> {
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    try {
      if (nav?.share) {
        await nav.share({ text: message });
        return 'paylasildi';
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'paylasildi';
    }
    try {
      await nav?.clipboard?.writeText(message);
      return 'kopyalandi';
    } catch {
      return 'hata';
    }
  }
  try {
    await Share.share({ message });
    return 'paylasildi';
  } catch {
    return 'hata';
  }
}
