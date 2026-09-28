// Kulüpte, sakatken: ödüllü fizyoterapi seansı (sakatlık 2 hafta erken iyileşir). Dövüş başına bir kez.
import type { GameState } from '../engine/types';
import { canHealFaster, claimHealFaster } from '../engine/rewards';
import { L } from '../i18n';
import { AdOffer } from './AdOffer';
import type { Act } from './GameScreens';

export function RewardCard({ s, act }: { s: GameState; act: Act }) {
  if (!canHealFaster(s)) return null;
  return (
    <AdOffer
      icon="medical-bag"
      title={L("Fizyoterapi seansı")}
      desc={L("Sakatlığın 2 hafta erken iyileşir.")}
      onReward={() => act(claimHealFaster)}
    />
  );
}
