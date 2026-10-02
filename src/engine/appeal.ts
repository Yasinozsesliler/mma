// Karara itiraz: ayrık ya da çoğunluk kararıyla kaybedilen profesyonel maçta komisyona başvuru. Pahalı ve zor;
// kabul edilirse sonuç "No Contest" olur, mağlubiyet karneden silinir ve rövanş kapısı açılır.
import { L, LOC } from '../i18n';
import { chance, clamp } from './rng';
import type { GameState } from './types';

export interface Appeal {
  rakip: string;
  rakipId?: string;
  dovus: number;
}

const FEE: Record<GameState['stage'], number> = { amator: 0, bolgesel: 3_000, buyuk: 12_000, ufc: 40_000 };
export const appealFee = (s: GameState) => FEE[s.stage];
export const appealChance = (s: GameState) => clamp(0.22 + s.takim.menajerKalite * 0.015, 0.2, 0.38);

/** Dövüş sonrası: ayrık/çoğunluk kararıyla mağlubiyette itiraz hakkı doğar. */
export function offerAppeal(s: GameState, yontem: string, won: boolean, draw: boolean, rakip: string, rakipId?: string) {
  s.itiraz = undefined;
  if (won || draw || s.stage === 'amator' || (yontem !== 'SD' && yontem !== 'MD')) return;
  s.itiraz = { rakip, rakipId, dovus: s.gecmis.length };
}

export function appeal(s: GameState): string {
  const a = s.itiraz;
  if (!a || a.dovus !== s.gecmis.length) {
    s.itiraz = undefined;
    return '';
  }
  const fee = appealFee(s);
  if (s.para < fee) return L("Avukat ücreti için paran yetmiyor.");
  s.para -= fee;
  s.itiraz = undefined;
  if (!chance(appealChance(s))) {
    s.populerlik = clamp(s.populerlik - 1, 0, 100);
    const m = L("⚖️ Komisyon itirazını reddetti. Sonuç geçerli. Bazı taraftarlar “kötü kaybeden” diyor. (Popülerlik -1)");
    s.haberler.unshift(m);
    return m;
  }
  // Mağlubiyet karneden silinir, geçmişte No Contest olarak kalır
  s.rekor.m = Math.max(0, s.rekor.m - 1);
  const h = s.gecmis[0];
  if (h && h.sonuc === 'M') {
    h.sonuc = 'B';
    h.yontem = L("No Contest (itiraz)");
  }
  s.seri = Math.max(0, s.seri);
  s.populerlik = clamp(s.populerlik + 2, 0, 100);
  const r = a.rakipId ? s.rakipler.find((x) => x.id === a.rakipId) : undefined;
  if (r) {
    r.rivalry = Math.max(r.rivalry, 2);
    r.sonDovus = Math.max(0, s.gecmis.length - 4);
  }
  const m = L("⚖️ İTİRAZ KABUL EDİLDİ! {0} maçı No Contest oldu, mağlubiyet karnenden silindi. Rövanş masada.", [a.rakip]);
  s.haberler.unshift(m);
  return m;
}

export function dismissAppeal(s: GameState) {
  s.itiraz = undefined;
}

export const appealFeeText = (s: GameState) => `$${appealFee(s).toLocaleString(LOC)}`;
