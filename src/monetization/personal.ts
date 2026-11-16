// Kişisel teklifler: oyuncunun oynayış biçimine göre, henüz denemediği bir modu doğru anda önerir.
// Satın alma penceresi değil, ücretsiz denemeye davet: kariyer ana ekranında küçük bir kart.
// Sakin kurallar: günde en fazla bir kart; mağlubiyetten sonra hiç; "Şimdi değil" denen öneri 14 gün, denenen öneri bir daha çıkmaz.
import { useSyncExternalStore } from 'react';
import { getPref, setPref } from '../prefs';
import { hasAll, owns } from './premium';
import { LEGENDS_SKU, MGR_SKU, PATRON_SKU } from './skus';

export type PersonalId = 'patron' | 'menajer' | 'efsane';

const KEY = 'yol_kisisel';
const DAY = 24 * 3600 * 1000;
type St = { son?: number; ertele: Partial<Record<PersonalId, number>>; denendi: PersonalId[] };

function load(): St {
  try {
    const r = JSON.parse(getPref(KEY) || '{}') as Partial<St>;
    return { son: r.son, ertele: r.ertele ?? {}, denendi: r.denendi ?? [] };
  } catch {
    return { ertele: {}, denendi: [] };
  }
}

let st = load();
/** Bu oturumda gösterilen öneri (aynı oturumda sabit kalsın, ekranlar arasında değişmesin). */
let shown: PersonalId | null = null;
const subs = new Set<() => void>();
function commit(next: St) {
  st = next;
  setPref(KEY, JSON.stringify(st));
  subs.forEach((f) => f());
}

/** Oyuncu bu modu daha önce açmış mı (kaydı ya da onur listesi var mı)? */
const tried = (id: PersonalId) => {
  if (id === 'patron') return !!getPref('yol_patron') || !!getPref('yol_patron_onur');
  if (id === 'menajer') return !!getPref('yol_menajer') || !!getPref('yol_menajer_onur');
  const b = getPref('yol_efsane');
  return !!b && b !== '{}';
};
const ownsMode = (id: PersonalId) => hasAll() || owns(id === 'patron' ? PATRON_SKU : id === 'menajer' ? MGR_SKU : LEGENDS_SKU);

export type PersonalCtx = { fights: number; lostLast: boolean; champion: boolean; retired: boolean };

/** Bu bağlamda gösterilecek öneri (yoksa null). */
export function pickPersonal(c: PersonalCtx, now = Date.now()): PersonalId | null {
  if (shown) return st.denendi.includes(shown) || (st.ertele[shown] ?? 0) > now ? null : shown;
  if (c.lostLast) return null;
  if (st.son && now - st.son < DAY) return null;
  const ok = (id: PersonalId) => !ownsMode(id) && !tried(id) && !st.denendi.includes(id) && (st.ertele[id] ?? 0) <= now;
  // Öncelik: emekli / şampiyon → Patron; tecrübeli → Menajer; erken dönem → Efsane Yolları (Conor ücretsiz)
  const order: [PersonalId, boolean][] = [
    ['patron', c.retired || c.champion || c.fights >= 25],
    ['menajer', c.fights >= 12],
    ['efsane', c.fights >= 6],
  ];
  const id = order.find(([k, cond]) => cond && ok(k))?.[0] ?? null;
  if (id) {
    shown = id;
    // Ekran çizilirken çağrılır: kaydeder ama dinleyicileri uyandırmaz
    st = { ...st, son: now };
    setPref(KEY, JSON.stringify(st));
  }
  return id;
}

export function dismissPersonal(id: PersonalId) {
  shown = null;
  commit({ ...st, ertele: { ...st.ertele, [id]: Date.now() + 14 * DAY } });
}

export function acceptPersonal(id: PersonalId) {
  shown = null;
  commit({ ...st, denendi: [...st.denendi, id] });
}

/** Durum değişince kart yeniden çizilsin. */
export function usePersonalTick() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => st,
    () => st,
  );
}
