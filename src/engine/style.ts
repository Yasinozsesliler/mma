// Berber ve dövmeci: kariyer içinde saç, saç rengi, sakal ve dövmeleri değiştir. Her değişikliğin ücreti var;
// yeni dövme sosyal medyada konuşulur. Görünüm yalnızca kozmetik, güç vermez.
import { L, LOC } from '../i18n';
import { lifestylePost } from './social';
import type { Appearance, GameState } from './types';

export type Tattoo = 'omuz' | 'gogus' | 'kol' | 'boyun';
export const TATTOOS: Tattoo[] = ['omuz', 'gogus', 'kol', 'boyun'];

const MULT: Record<GameState['stage'], number> = { amator: 1, bolgesel: 2, buyuk: 5, ufc: 12 };
export const STYLE_PRICES = { sac: 150, sacRenk: 200, sakal: 80, dovme: 900, lazer: 1800 };
export const stylePrice = (s: GameState, k: keyof typeof STYLE_PRICES) => STYLE_PRICES[k] * MULT[s.stage];

export const hasTattoo = (g: Appearance, t: Tattoo) => (t === 'omuz' ? g.dovme : (g.dovmeler ?? []).includes(t));

/** Taslak görünümün maliyeti (mevcut görünüme göre değişen her kalem). */
export function styleCost(s: GameState, draft: Appearance) {
  const cur = s.fighter.gorunum ?? draft;
  let c = 0;
  if (draft.sac !== cur.sac) c += stylePrice(s, 'sac');
  if (draft.sacRenk !== cur.sacRenk) c += stylePrice(s, 'sacRenk');
  if (draft.sakal !== cur.sakal) c += stylePrice(s, 'sakal');
  TATTOOS.forEach((t) => {
    const a = hasTattoo(cur, t);
    const b = hasTattoo(draft, t);
    if (!a && b) c += stylePrice(s, 'dovme');
    if (a && !b) c += stylePrice(s, 'lazer');
  });
  return c;
}

export function applyStyle(s: GameState, draft: Appearance): string {
  const cost = styleCost(s, draft);
  if (!cost) return '';
  if (s.para < cost) return L("Bunun için paran yetmiyor.");
  const cur = s.fighter.gorunum ?? draft;
  const yeniDovme = TATTOOS.some((t) => !hasTattoo(cur, t) && hasTattoo(draft, t));
  s.para -= cost;
  s.fighter.gorunum = { ...draft };
  if (yeniDovme) lifestylePost(s, L("yeni dövmesi"));
  else lifestylePost(s, L("yeni tarzı"));
  const m = L("💈 Yeni görünüm hazır! Ödenen: ${0}", [cost.toLocaleString(LOC)]);
  s.haberler.unshift(m);
  return m;
}
