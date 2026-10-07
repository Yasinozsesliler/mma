// Memlekette ana maç: ara sıra sıradaki maç oyuncunun şehrinde düzenlenir. Tribün desteği (küçük bonus) ve
// %50 fazla ücret; ama kazanınca kahraman, kaybedince kendi seyircisi önünde yıkım.
import { homelandWin } from './homeland';
import { L as tL, LOC } from '../i18n';
import { addFollowers, fmtDelta, followers } from './fame';
import { chance, clamp } from './rng';
import type { GameState, Opponent, Stats } from './types';

/** Seçeneklerden birini memleket maçına çevirir (profesyonelde, en az 6 maç arayla). */
export function maybeHometown(s: GameState, opts: Opponent[]) {
  if (s.stage === 'amator' || !opts.length || !s.fighter.memleket) return;
  if (s.gecmis.length - (s.memleketSon ?? -99) < 6 || !chance(0.12)) return;
  const o = opts[0];
  o.memleket = true;
  o.etiket = tL("🏠 MEMLEKETTE ANA MAÇ · {0}", [s.fighter.memleket.toLocaleUpperCase(LOC)]);
  o.riskMetni = tL("Bütün şehir tribünde. Kazanırsan kahraman olursun, kaybedersen kendi insanının önünde düşersin. Ücret %50 fazla.");
}

/** Kafes etkisi: tribün desteği. */
export function hometownMods(s: GameState, opp: Opponent, mods: Partial<Stats>) {
  if (!opp.memleket) return;
  mods.iq = (mods.iq ?? 0) + 1;
  mods.kondisyon = (mods.kondisyon ?? 0) + 1;
  s.haberler.unshift(tL("🏠 {0} seni ayakta karşıladı. Tribün senin!", [s.fighter.memleket]));
}

/** Dövüş sonrası: ücret primi ve sonuç etkisi. */
export function hometownAfter(s: GameState, opp: Opponent, won: boolean, purse: number): string[] {
  if (!opp.memleket) return [];
  s.memleketSon = s.gecmis.length;
  const lines: string[] = [];
  if (purse > 0) {
    s.para += Math.round(purse * 0.5);
    lines.push(tL("🏠 Memleket primi: +${0}", [Math.round(purse * 0.5).toLocaleString(LOC)]));
  }
  if (won) {
    homelandWin(s);
    s.populerlik = clamp(s.populerlik + 6, 0, 100);
    const d = addFollowers(s, followers(s) * 0.08);
    lines.push(tL("🏠 {0} sokaklara döküldü! Şehrin kahramanısın. Popülerlik +6, {1} takipçi.", [s.fighter.memleket, fmtDelta(d)]));
  } else {
    s.populerlik = clamp(s.populerlik - 5, 0, 100);
    s.motivasyon = clamp(s.motivasyon - 1, -2, 2);
    lines.push(tL("🏠 Kendi seyircinin önünde kaybettin. Salon sessizliğe gömüldü. Popülerlik -5, motivasyon düştü."));
  }
  return lines;
}
