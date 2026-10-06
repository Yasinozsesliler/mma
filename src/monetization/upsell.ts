// Nazik tam sürüm teklifi: oyuncu birkaç geçiş reklamı gördükten sonra maç sonunda bir kez küçük bir kart.
// "Şimdi değil" denirse uzun süre (8 reklam daha) görünmez. Açılır pencere yok, ısrar yok.
import { useSyncExternalStore } from 'react';
import { getPref, setPref } from '../prefs';

const KEY = 'yol_reklam_sayac';
type St = { gorulen: number; sonraki: number };

function load(): St {
  try {
    const r = JSON.parse(getPref(KEY) || '{}') as Partial<St>;
    return { gorulen: r.gorulen ?? 0, sonraki: r.sonraki ?? 3 };
  } catch {
    return { gorulen: 0, sonraki: 3 };
  }
}

let st = load();
const subs = new Set<() => void>();
function commit(next: St) {
  st = next;
  setPref(KEY, JSON.stringify(st));
  subs.forEach((f) => f());
}

/** Bir geçiş reklamı gösterildi. */
export function noteAdShown() {
  commit({ ...st, gorulen: st.gorulen + 1 });
}

/** Teklif kartı şimdi gösterilmeli mi? */
export function useUpsellDue() {
  const s = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => st,
    () => st,
  );
  return s.gorulen >= s.sonraki;
}

/** "Şimdi değil": 8 reklam daha görünmez. */
export function dismissUpsell() {
  commit({ ...st, sonraki: st.gorulen + 8 });
}
