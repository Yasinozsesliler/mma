// Tam Paket Fırsatı pencereleri ve Paket Mağazası'nın açık/kapalı durumu.
// Fırsat ayrı bir üründür (DEAL_SKU) ve yalnızca gerçek süreli pencerelerde satılır; sayaç gerçektir, pencere bitince kapanır:
//  • Hoş Geldin: oyuncu 3. maçını bitirince (oyunu tanıdıktan sonra) 72 saat, bir kez.
//  • Kara Cuma: Kara Cuma Gecesi etkinliği boyunca; etkinliğin penceresi şimdilik kapalı (specialEvent.ts).
//  • Şampiyon: ilk UCC kemerinden sonra 24 saat, bir kez (Hoş Geldin bittiyse).
//  • Deneme sonu: Patron ya da Menajer Modu'nun ücretsiz denemesi bitince 24 saat, bir kez (başka fırsat açık değilse).
import { useEffect, useState, useSyncExternalStore } from 'react';
import { track } from '../analytics';
import { activeSpecial } from '../engine/specialEvent';
import { L } from '../i18n';
import { getPref, setPref } from '../prefs';
import { hasAll } from './premium';

export type DealKind = 'hosgeldin' | 'karacuma' | 'kemer' | 'deneme';
export type Deal = { kind: DealKind; ends: number; key: string };

const KEY = 'yol_firsat';
const H = 3600 * 1000;
const WELCOME_H = 72;
const BELT_H = 24;

type St = { hos?: number; kemer?: number; deneme?: number; goruldu: string[] };

function load(): St {
  try {
    const r = JSON.parse(getPref(KEY) || '{}') as Partial<St>;
    return { hos: r.hos, kemer: r.kemer, deneme: r.deneme, goruldu: r.goruldu ?? [] };
  } catch {
    return { goruldu: [] };
  }
}

let st = load();
let shop: string | null = null;
let onStart: (() => void) | null = null;
/** Fırsat penceresi açılınca çağrılır (bildirimler yeniden planlansın). */
export const onDealStart = (f: () => void) => {
  onStart = f;
};
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());
function commit(next: St) {
  st = next;
  setPref(KEY, JSON.stringify(st));
  notify();
}
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

/** Şu an açık fırsat (Tam Paket sahibine hiç gösterilmez). */
export function currentDeal(now = Date.now()): Deal | null {
  if (hasAll()) return null;
  const sp = activeSpecial(new Date(now));
  if (sp?.id === 'karacuma') return { kind: 'karacuma', ends: sp.bitis, key: `karacuma-${sp.yil}` };
  if (st.hos && now < st.hos + WELCOME_H * H) return { kind: 'hosgeldin', ends: st.hos + WELCOME_H * H, key: `hos-${st.hos}` };
  if (st.kemer && now < st.kemer + BELT_H * H) return { kind: 'kemer', ends: st.kemer + BELT_H * H, key: `kemer-${st.kemer}` };
  if (st.deneme && now < st.deneme + BELT_H * H) return { kind: 'deneme', ends: st.deneme + BELT_H * H, key: `deneme-${st.deneme}` };
  return null;
}

/** 3. maçtan sonra Hoş Geldin penceresini bir kez açar. ready: fırsat ürünü mağazada bulundu (yoksa pencere boşa yanmaz). */
export function maybeStartWelcome(careerFights: number, ready: boolean) {
  if (!ready || st.hos || careerFights < 3 || hasAll()) return;
  commit({ ...st, hos: Date.now() });
  track('deal_start', { tur: 'hosgeldin' });
  onStart?.();
}

/** İlk UCC kemerinden sonra (Hoş Geldin bittiyse) 24 saatlik fırsat, bir kez. */
export function maybeStartBeltDeal(ready: boolean) {
  if (!ready || st.kemer || hasAll() || currentDeal()) return;
  commit({ ...st, kemer: Date.now() });
  track('deal_start', { tur: 'kemer' });
  onStart?.();
}

/** Patron ya da Menajer Modu denemesi bitince 24 saatlik fırsat, bir kez (başka fırsat açıksa beklemez, hiç açılmaz). */
export function maybeStartTrialDeal(ready: boolean, mod: string) {
  if (!ready || st.deneme || hasAll() || currentDeal()) return;
  commit({ ...st, deneme: Date.now() });
  track('deal_start', { tur: 'deneme', mod });
  onStart?.();
}

/** Fırsat penceresi açıldığında bir kez çıkan duyuru gösterildi. */
export function markDealSeen(key: string) {
  if (st.goruldu.includes(key)) return;
  commit({ ...st, goruldu: [...st.goruldu.slice(-9), key] });
}
export const dealSeen = (key: string) => st.goruldu.includes(key);

/** Saniyede bir yenilenen saat (geri sayım için). Fırsat bitince de yeniden çizilir. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Açık fırsat (dakikada bir ve durum değişince yeniden hesaplanır). */
export function useDeal(): Deal | null {
  useSyncExternalStore(subscribe, () => st, () => st);
  const now = useNow(30_000);
  return currentDeal(now);
}

/** Kalan süre: "2 gün 14:05:09" / "14:05:09" */
export function fmtLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${d > 0 ? `${L("{0} gün", [d])} ` : ''}${hh}:${mm}:${ss}`;
}

// ---------- Paket Mağazası (tek ekran, her yerden açılır) ----------

export function openShop(kaynak: string) {
  shop = kaynak;
  track('shop_open', { kaynak });
  notify();
}
export function closeShop() {
  shop = null;
  notify();
}
export function useShop(): string | null {
  return useSyncExternalStore(subscribe, () => shop, () => null);
}
