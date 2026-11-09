// Başka ekranlardan (Hayalî Maçlar, kariyer) menüdeki Efsane Yolları penceresini belirli bir efsaneyle açma isteği.
import type { LegendId } from './engine/legendRun';

let pending: LegendId | true | null = null;

/** Menüye dönüldüğünde Efsane Yolları açılsın (id verilirse o efsanenin ayrıntısıyla). */
export function requestLegend(id?: LegendId) {
  pending = id ?? true;
}

/** Menü açılırken bir kez okunur. */
export function takeLegendRequest(): LegendId | true | null {
  const p = pending;
  pending = null;
  return p;
}
