// Canlı dünya: yendiğin dövüşçülerin kariyerleri de ilerler. Biri büyük organizasyona imza atar, biri şampiyon
// olur, biri düşüşe geçer ya da emekli olur. Haberler akışa düşer; sonradan şampiyon olan rakibin kartı yükselir.
import { L } from '../i18n';
import { RARITY } from './cards';
import { ORGS } from './data';
import { chance, pick, randInt } from './rng';
import type { GameState, OrgId } from './types';

export type WorldState = 'yukselen' | 'imza' | 'sampiyon' | 'dusus' | 'emekli';
export interface WorldEntry {
  d: WorldState;
  org: OrgId;
  hafta: number;
}

/** Organizasyon merdiveni: imza atınca bir üst basamağa çıkar. */
const UP: Partial<Record<OrgId, OrgId[]>> = {
  amator: ['cfc', 'oktagon'],
  cfc: ['pfl', 'one', 'mvp'],
  oktagon: ['pfl', 'one'],
  pfl: ['ufc'],
  one: ['ufc'],
  mvp: ['ufc'],
  dwcs: ['ufc'],
};

export const WORLD_LABEL: Record<WorldState, (org: string) => string> = {
  yukselen: (o) => L("Yükselişte · {0}", [o]),
  imza: (o) => L("{0} kadrosunda", [o]),
  sampiyon: (o) => L("{0} şampiyonu", [o]),
  dusus: (o) => L("Düşüşte · {0}", [o]),
  emekli: () => L("Emekli"),
};
export const WORLD_COLOR: Record<WorldState, string> = { yukselen: '#3ecf7a', imza: '#3aa8ff', sampiyon: '#f2c14e', dusus: '#ff8a5c', emekli: '#8a8f99' };

export const worldOf = (s: GameState, id: string) => s.dunya?.[id];

/** Maç sonrası: eski rakiplerden birinin kariyeri ilerler (her maçta en fazla bir haber). */
export function worldTick(s: GameState, currentOppId?: string): string[] {
  const kartlar = (s.kartlar ?? []).filter((c) => c.id !== currentOppId && !c.id.startsWith('hikaye-') && !c.id.startsWith('eski-') && worldOf(s, c.id)?.d !== 'emekli');
  if (kartlar.length < 3 || !chance(0.35)) return [];
  const c = pick(kartlar);
  s.dunya ??= {};
  const cur = s.dunya[c.id];
  const org: OrgId = cur?.org ?? c.org;
  const ad = `${c.ad} ${c.soyad}`;
  const yasFarki = s.fighter.yas - c.yas;
  const set = (d: WorldState, o: OrgId = org) => (s.dunya![c.id] = { d, org: o, hafta: s.hafta });
  const kisa = (o: OrgId) => ORGS[o]?.kisa ?? o;
  let line: string;
  if (yasFarki >= 6 && chance(0.35)) {
    set('emekli');
    line = cur?.d === 'sampiyon' ? L("🌍 Eski rakibin {0}, şampiyon olarak eldivenlerini astı.", [ad]) : L("🌍 Bir zamanlar yendiğin {0} emekli oldu.", [ad]);
  } else if (!cur || cur.d === 'dusus') {
    if (chance(0.55)) {
      set('yukselen');
      line = L("🌍 Yendiğin {0} toparlandı: {1} maçtır kazanıyor.", [ad, randInt(2, 4)]);
    } else {
      set('dusus');
      line = L("🌍 {0} senden sonra bir türlü toparlanamadı, üst üste kaybediyor.", [ad]);
    }
  } else if (cur.d === 'yukselen') {
    const ups = UP[org];
    if (ups?.length && chance(0.6)) {
      const o = pick(ups);
      set('imza', o);
      line = L("🌍 Bir zamanlar yendiğin {0}, {1} ile sözleşme imzaladı!", [ad, kisa(o)]);
    } else {
      set('sampiyon');
      line = L("🌍 Yendiğin {0}, {1} şampiyonu oldu!", [ad, kisa(org)]);
    }
  } else if (cur.d === 'imza') {
    if (chance(0.45)) {
      set('sampiyon');
      line = L("🌍 Yendiğin {0}, {1} şampiyonu oldu!", [ad, kisa(org)]);
    } else {
      set('dusus');
      line = L("🌍 {0}, {1} sahnesinde zorlanıyor.", [ad, kisa(org)]);
    }
  } else {
    // şampiyon: kemeri kaybeder
    set('dusus');
    line = L("🌍 {0}, {1} kemerini kaybetti.", [ad, kisa(org)]);
  }
  // Sonradan şampiyon: kart en az altına yükselir
  if (s.dunya[c.id].d === 'sampiyon') {
    c.sonradan = true;
    if (RARITY[c.nadir].sira < 2) {
      c.nadir = 'altin';
      line += ' ' + L("Albümündeki kartı altına yükseldi.");
    }
  }
  s.haberler.unshift(line);
  return [line];
}
