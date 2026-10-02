// Hayran buluşması: iki dövüş arasında bir kez düzenlenebilir. Mini oyunun puanı takipçi ve popülerliğe döner.
import { L } from '../i18n';
import { addFollowers, fmtDelta, followers } from './fame';
import { clamp, rand } from './rng';
import type { GameState } from './types';

export const canFanMeet = (s: GameState) => s.stage !== 'amator' && (s.bulusmaSon ?? -1) < s.gecmis.length;

export function fanMeet(s: GameState, puan: number): string {
  if (!canFanMeet(s)) return '';
  s.bulusmaSon = s.gecmis.length;
  const p = clamp(puan, 0, 100) / 100;
  const d = addFollowers(s, followers(s) * (0.008 + p * 0.035) * (0.85 + rand() * 0.3) + 150 * p);
  const pop = p >= 0.75 ? 2 : p >= 0.45 ? 1 : 0;
  s.populerlik = clamp(s.populerlik + pop, 0, 100);
  const line =
    p >= 0.75
      ? L("🖊️ Hayran buluşması efsaneydi! Herkes mutlu ayrıldı. {0} takipçi, popülerlik +{1}.", [fmtDelta(d), pop])
      : p >= 0.45
        ? L("🖊️ Hayran buluşması iyi geçti. {0} takipçi, popülerlik +{1}.", [fmtDelta(d), pop])
        : L("🖊️ Hayran buluşması biraz karışık geçti, bazı hayranlar küstü. {0} takipçi.", [fmtDelta(d)]);
  s.haberler.unshift(line);
  return line;
}
