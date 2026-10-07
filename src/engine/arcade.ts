// Oyun salonu: gece hayatındaki eğlence köşesi. Dart ve yumruk makinesi; bahis yok, para kazanılmaz ya da kaybedilmez.
// Sonuç istatistiklere ve tek bir zamanlama dokunuşuna bağlıdır. Haftanın ilk iyi skoru küçük bir sosyal medya
// anı olur (popülerlik, takipçi); rekorlar saklanır.
import { L, LOC } from '../i18n';
import { addFollowers, followers } from './fame';
import { clamp } from './rng';
import type { GameState } from './types';

export type ArcadeGame = 'dart' | 'yumruk';
export interface ArcadeState {
  rekor: Partial<Record<ArcadeGame, number>>;
  /** Bu hafta ödül alınan oyunlar */
  odulHafta?: number;
  odullu?: ArcadeGame[];
  oynanan?: number;
}

export const ARCADE: Record<ArcadeGame, { ad: () => string; ikon: string; aciklama: () => string; esik: number; max: number }> = {
  dart: { ad: () => L("Dart"), ikon: 'bullseye-arrow', aciklama: () => L("Üç atış. Nişangâh kayarken tam ortaya geldiğinde dokun. Hızın ne kadar yüksekse nişangâh o kadar yavaş kayar."), esik: 120, max: 180 },
  yumruk: { ad: () => L("Yumruk makinesi"), ikon: 'boxing-glove', aciklama: () => L("Güç çubuğu dolup boşalırken zirvede vur. Vuruş gücün skoru büyütür."), esik: 700, max: 999 },
};

const of = (s: GameState): ArcadeState => (s.oyunSalonu ??= { rekor: {} });

/** Nişangâh/çubuk hızı: yüksek istatistik daha sakin bir hareket demek. */
export function arcadeSpeed(s: GameState, g: ArcadeGame) {
  const st = g === 'dart' ? s.fighter.stats.hiz : s.fighter.stats.vurus;
  return clamp(1.6 - st / 110, 0.6, 1.4);
}

/** Dart atışı: isabet 0-1 (1 = tam orta) → 0-60 puan. */
export const dartPoints = (isabet: number) => Math.round(clamp(isabet, 0, 1) ** 1.5 * 60);

/** Yumruk makinesi: zamanlama 0-1 ve vuruş istatistiği → 0-999. */
export const punchPoints = (s: GameState, zamanlama: number) => Math.round(clamp((0.35 + s.fighter.stats.vurus / 140) * (0.4 + 0.6 * clamp(zamanlama, 0, 1)) * 1000, 0, 999));

/** Oyun bitti: rekor ve haftanın ilk iyi skoruna küçük ödül. Dönen metin ekranda gösterilir. */
export function finishArcade(s: GameState, g: ArcadeGame, skor: number): string {
  const a = of(s);
  a.oynanan = (a.oynanan ?? 0) + 1;
  const eski = a.rekor[g] ?? 0;
  const rekor = skor > eski;
  if (rekor) a.rekor[g] = skor;
  if (a.odulHafta !== s.hafta) {
    a.odulHafta = s.hafta;
    a.odullu = [];
  }
  const parts: string[] = [L("Skor: {0}", [skor.toLocaleString(LOC)])];
  if (rekor && eski > 0) parts.push(L("Yeni rekor!"));
  if (skor >= ARCADE[g].esik && !(a.odullu ?? []).includes(g)) {
    a.odullu = [...(a.odullu ?? []), g];
    s.populerlik = clamp(s.populerlik + 1, 0, 100);
    const d = addFollowers(s, Math.max(100, followers(s) * 0.005));
    parts.push(L("Biri videoya çekti, klip dolaşıyor: popülerlik +1, +{0} takipçi.", [Math.round(d).toLocaleString(LOC)]));
  }
  return parts.join(' ');
}

export const arcadeOf = of;
