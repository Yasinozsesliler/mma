// Yetenek ağacı (perkler): beş dal, her dalda üç kademe. Perk puanı profesyonel galibiyet eşiklerinde gelir
// (kariyer boyunca 8 puan, 15 perk): her kariyer farklı uzmanlaşır. Etkiler dövüşe, kampa, iyileşmeye ve şöhrete işler.
import { L } from '../i18n';
import type { GameState, Stats } from './types';

export type PerkBranch = 'kafes' | 'gures' | 'vucut' | 'zihin' | 'sohret';
export type PerkId =
  | 'agirEl' | 'demirCene' | 'bitirici'
  | 'guresMakinesi' | 'kafesKontrolu' | 'boga'
  | 'kondisyonCanavari' | 'cabukIyilesme' | 'kiloUstasi'
  | 'sogukkanli' | 'kampci' | 'hizUstasi'
  | 'sovmen' | 'isAdami' | 'yildiz';

export const PERK_MILESTONES = [2, 5, 10, 16, 24, 34, 46, 60];

export const BRANCHES: Record<PerkBranch, { ad: () => string; icon: string; renk: string; perkler: PerkId[] }> = {
  kafes: { ad: () => L("Kafes"), icon: 'boxing-glove', renk: '#e63946', perkler: ['agirEl', 'demirCene', 'bitirici'] },
  gures: { ad: () => L("Güreş"), icon: 'arm-flex', renk: '#3a86ff', perkler: ['guresMakinesi', 'kafesKontrolu', 'boga'] },
  vucut: { ad: () => L("Vücut"), icon: 'heart-pulse', renk: '#3ecf7a', perkler: ['kondisyonCanavari', 'cabukIyilesme', 'kiloUstasi'] },
  zihin: { ad: () => L("Zihin"), icon: 'brain', renk: '#b388ff', perkler: ['sogukkanli', 'kampci', 'hizUstasi'] },
  sohret: { ad: () => L("Şöhret"), icon: 'star-four-points', renk: '#f2c14e', perkler: ['sovmen', 'isAdami', 'yildiz'] },
};

export const PERKS: Record<PerkId, { ad: () => string; aciklama: () => string; stat?: Partial<Stats> }> = {
  agirEl: { ad: () => L("Ağır El"), aciklama: () => L("Dövüşte vuruş +2."), stat: { vurus: 2 } },
  demirCene: { ad: () => L("Demir Çene"), aciklama: () => L("Dövüşte çene +3."), stat: { cene: 3 } },
  bitirici: { ad: () => L("Bitirici"), aciklama: () => L("Dövüşte vuruş +1, IQ +1: açığı görür, bitirirsin."), stat: { vurus: 1, iq: 1 } },
  guresMakinesi: { ad: () => L("Güreş Makinesi"), aciklama: () => L("Dövüşte güreş +2."), stat: { gures: 2 } },
  kafesKontrolu: { ad: () => L("Kafes Kontrolü"), aciklama: () => L("Dövüşte yer dövüşü +2."), stat: { yer: 2 } },
  boga: { ad: () => L("Boğa"), aciklama: () => L("Dövüşte güreş +1, kondisyon +2: yorulmadan bastırırsın."), stat: { gures: 1, kondisyon: 2 } },
  kondisyonCanavari: { ad: () => L("Kondisyon Canavarı"), aciklama: () => L("Dövüşte kondisyon +3."), stat: { kondisyon: 3 } },
  cabukIyilesme: { ad: () => L("Çabuk İyileşme"), aciklama: () => L("Dinlenme %30 daha etkili, sakatlık riski %20 daha düşük.") },
  kiloUstasi: { ad: () => L("Kilo Ustası"), aciklama: () => L("Tartıyı kaçırma riski belirgin şekilde düşer.") },
  sogukkanli: { ad: () => L("Soğukkanlı"), aciklama: () => L("Dövüşte IQ +2."), stat: { iq: 2 } },
  kampci: { ad: () => L("Kampçı"), aciklama: () => L("Kamplardaki gelişim %12 daha fazla.") },
  hizUstasi: { ad: () => L("Hız Ustası"), aciklama: () => L("Dövüşte hız +2."), stat: { hiz: 2 } },
  sovmen: { ad: () => L("Şovmen"), aciklama: () => L("Maçlardan gelen takipçi %25 fazla.") },
  isAdami: { ad: () => L("İş Adamı"), aciklama: () => L("Sponsor ve marka gelirleri %20 fazla.") },
  yildiz: { ad: () => L("Yıldız"), aciklama: () => L("Her galibiyette fazladan popülerlik +1.") },
};

export const hasPerk = (s: GameState, p: PerkId) => (s.perkler ?? []).includes(p);
export const perkPointsEarned = (s: GameState) => PERK_MILESTONES.filter((m) => s.rekor.g >= m).length;
export const perkPointsFree = (s: GameState) => Math.max(0, perkPointsEarned(s) - (s.perkler ?? []).length);
export const nextPerkAt = (s: GameState) => PERK_MILESTONES.find((m) => s.rekor.g < m) ?? null;

/** Dalda sıradaki açılabilir perk (önceki kademe alınmış olmalı). */
export function canTakePerk(s: GameState, p: PerkId) {
  if (hasPerk(s, p) || perkPointsFree(s) <= 0) return false;
  const b = Object.values(BRANCHES).find((x) => x.perkler.includes(p))!;
  const i = b.perkler.indexOf(p);
  return i === 0 || hasPerk(s, b.perkler[i - 1]);
}

export function takePerk(s: GameState, p: PerkId) {
  if (!canTakePerk(s, p)) return;
  s.perkler = [...(s.perkler ?? []), p];
  s.haberler.unshift(L("🌟 Yeni perk: {0}. {1}", [PERKS[p].ad(), PERKS[p].aciklama()]));
}

/** Dövüş başında perklerin istatistik etkileri. */
export function perkFightMods(s: GameState, mods: Partial<Stats>) {
  for (const p of s.perkler ?? []) {
    const st = PERKS[p as PerkId]?.stat;
    if (!st) continue;
    (Object.keys(st) as (keyof Stats)[]).forEach((k) => (mods[k] = (mods[k] ?? 0) + (st[k] ?? 0)));
  }
}

export const perkRest = (s: GameState) => (hasPerk(s, 'cabukIyilesme') ? 0.3 : 0);
export const perkInjury = (s: GameState) => (hasPerk(s, 'cabukIyilesme') ? 0.8 : 1);
export const perkCut = (s: GameState) => (hasPerk(s, 'kiloUstasi') ? 0.08 : 0);
export const perkCamp = (s: GameState) => (hasPerk(s, 'kampci') ? 1.12 : 1);
export const perkFollowers = (s: GameState) => (hasPerk(s, 'sovmen') ? 1.25 : 1);
export const perkIncome = (s: GameState) => (hasPerk(s, 'isAdami') ? 1.2 : 1);
export const perkWinPop = (s: GameState) => (hasPerk(s, 'yildiz') ? 1 : 0);

/** Galibiyet sonrası yeni perk puanı geldiyse bildirim. */
export function perkPointNote(s: GameState, prevWins: number): string | null {
  const before = PERK_MILESTONES.filter((m) => prevWins >= m).length;
  return perkPointsEarned(s) > before ? L("🌟 Yeni perk puanı kazandın! Gelişim sekmesinden yetenek ağacına bak.") : null;
}
