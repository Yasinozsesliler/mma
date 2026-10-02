// İmza hareketi: ustalığı 4+ olan bir tekniğe kendi adını verirsin. O hareketle bitirince anlatımda adıyla geçer,
// popülerlik ve takipçi getirir, kariyer kartında yer alır.
import { L } from '../i18n';
import { addFollowers, fmtDelta, followers } from './fame';
import { techById, techLevel } from './techniques';
import type { GameState } from './types';

export const SIGNATURE_LEVEL = 4;

export interface Signature {
  teknik: string;
  ad: string;
  sayi: number;
}

export const canSign = (s: GameState, id: string) => techLevel(s, id) >= SIGNATURE_LEVEL;

export const defaultSignatureName = (s: GameState, id: string) => `${s.fighter.soyad} ${techById(id)?.ad ?? ''}`.trim().slice(0, 32);

export function setSignature(s: GameState, id: string, ad: string) {
  if (!canSign(s, id)) return;
  const name = ad.trim().slice(0, 32) || defaultSignatureName(s, id);
  const same = s.imza?.teknik === id;
  s.imza = { teknik: id, ad: name, sayi: same ? s.imza!.sayi : 0 };
  s.haberler.unshift(L("✍️ İmza hareketin artık belli: “{0}”.", [name]));
}

/** Maç imza hareketiyle bittiyse ödül ve satır. */
export function signatureFinish(s: GameState, teknik: string | undefined): string[] {
  const m = s.imza;
  if (!m || !teknik || teknik !== m.teknik) return [];
  m.sayi++;
  s.populerlik = Math.min(100, s.populerlik + 2);
  const d = addFollowers(s, followers(s) * 0.03);
  return [L("🔥 İMZA HAREKETİ: “{0}”! Bu kariyerde {1}. kez. Popülerlik +2, {2} takipçi.", [m.ad, m.sayi, fmtDelta(d)])];
}
