// Bitiriş teknikleri: submission'lar, vuruşlar ve özel hareketler. Her birinin 0-5 seviyesi ve ustalık (XP) çubuğu var.
// Puanla geliştirilir, antrenmanda/sparda çalışılır; bir maçı hangi hareketle bitirirsen o hareket ustalık kazanır.
import { pick, weighted } from './rng';
import type { Background, GameState, StatKey } from './types';

export type TechKind = 'sub' | 'vurus' | 'ozel';

export interface TechDef {
  id: string;
  ad: string;
  tur: TechKind;
  ikon: string;
  stat: StatKey;
  aciklama: string;
  /** Özel hareket yerde mi uygulanır (Imanari roll, suplex) */
  yer?: boolean;
}

export const TECHNIQUES: TechDef[] = [
  // Submission
  { id: 'rnc', ad: 'Arkadan boğma (RNC)', tur: 'sub', ikon: 'account-arrow-left', stat: 'yer', aciklama: 'Sırtı aldığında en güvenilir bitiriş.' },
  { id: 'giyotin', ad: 'Giyotin', tur: 'sub', ikon: 'account-alert', stat: 'yer', aciklama: 'Takedown’a dalan rakibin boynunu yakala.' },
  { id: 'armbar', ad: 'Armbar', tur: 'sub', ikon: 'arm-flex', stat: 'yer', aciklama: 'Guard’dan ya da mount’tan dirseği ters çevir.' },
  { id: 'ucgen', ad: 'Üçgen boğma', tur: 'sub', ikon: 'triangle-outline', stat: 'yer', aciklama: 'Alttayken bacaklarınla kurulan tuzak.' },
  { id: 'kimura', ad: 'Kimura', tur: 'sub', ikon: 'rotate-3d-variant', stat: 'yer', aciklama: 'Omzu kilitleyen güçlü bir anahtar.' },
  { id: 'darce', ad: "D'arce boğma", tur: 'sub', ikon: 'vector-curve', stat: 'yer', aciklama: 'Sprawl sonrası kolun altından boğma.' },
  { id: 'anakonda', ad: 'Anakonda', tur: 'sub', ikon: 'snake', stat: 'yer', aciklama: 'Önden sarıp yuvarlanarak sıkan boğma.' },
  { id: 'heelhook', ad: 'Heel hook', tur: 'sub', ikon: 'shoe-sneaker', stat: 'yer', aciklama: 'En tehlikeli bacak kilidi. Tap atmayan diz bağlarını kaybeder.' },
  { id: 'kneebar', ad: 'Kneebar', tur: 'sub', ikon: 'human-male-height', stat: 'yer', aciklama: 'Dizi ters yöne büken bacak kilidi.' },
  { id: 'armtriangle', ad: 'Arm-triangle', tur: 'sub', ikon: 'triangle', stat: 'gures', aciklama: 'Üstten, omuz baskısıyla boğma. Güreşçilerin favorisi.' },
  // Vuruş
  { id: 'overhand', ad: 'Overhand sağ', tur: 'vurus', ikon: 'boxing-glove', stat: 'vurus', aciklama: 'Yukarıdan kavis çizen nakavt yumruğu.' },
  { id: 'krose', ad: 'Sol kroşe', tur: 'vurus', ikon: 'hand-back-left', stat: 'vurus', aciklama: 'Kısa mesafede çeneye giden kroşe.' },
  { id: 'aparkat', ad: 'Aparkat', tur: 'vurus', ikon: 'arrow-up-bold', stat: 'vurus', aciklama: 'Eğilen rakibe aşağıdan yukarı.' },
  { id: 'headkick', ad: 'Kafaya yüksek tekme', tur: 'vurus', ikon: 'karate', stat: 'vurus', aciklama: 'İsabet ederse ışıklar söner.' },
  { id: 'karaciger', ad: 'Karaciğere tekme', tur: 'vurus', ikon: 'target', stat: 'vurus', aciklama: 'Gövdeye giden, rakibi dizüstü çöktüren tekme.' },
  { id: 'dirsek', ad: 'Dirsek', tur: 'vurus', ikon: 'arm-flex-outline', stat: 'vurus', aciklama: 'Clinch ve yerde kesen, bitiren silah.' },
  // Özel hareketler
  { id: 'ucandiz', ad: 'Uçan diz', tur: 'ozel', ikon: 'rocket-launch', stat: 'hiz', aciklama: 'Dalan rakibe havadan diz. Tarihe geçen nakavtlar.' },
  { id: 'spinning', ad: 'Dönerek yumruk', tur: 'ozel', ikon: 'rotate-right', stat: 'hiz', aciklama: 'Spinning backfist: beklenmedik açıdan gelir.' },
  { id: 'superman', ad: 'Superman yumruğu', tur: 'ozel', ikon: 'flash', stat: 'hiz', aciklama: 'Tekme çalımıyla havalanıp yumruk.' },
  { id: 'donertopuk', ad: 'Dönerek topuk tekmesi', tur: 'ozel', ikon: 'autorenew', stat: 'vurus', aciklama: 'Spinning heel kick: en riskli, en görkemli.' },
  { id: 'suplex', ad: 'Suplex slam', tur: 'ozel', ikon: 'weight-lifter', stat: 'gures', aciklama: 'Rakibi kaldırıp kafesin zeminine çarp.', yer: true },
  { id: 'imanari', ad: 'Imanari roll', tur: 'ozel', ikon: 'sync', stat: 'yer', aciklama: 'Yuvarlanarak bacağa dal, heel hook’a bağla.', yer: true },
];

export const MAX_TECH = 5;
export const TECH_KINDS: { id: TechKind; ad: string; ikon: string }[] = [
  { id: 'sub', ad: 'SUBMISSION', ikon: 'lock' },
  { id: 'vurus', ad: 'VURUŞ', ikon: 'boxing-glove' },
  { id: 'ozel', ad: 'ÖZEL HAREKET', ikon: 'star-shooting' },
];

export const techById = (id: string) => TECHNIQUES.find((t) => t.id === id);

/** Branşa göre başlangıç teknikleri. */
const START: Record<Background, Record<string, number>> = {
  bjj: { rnc: 2, armbar: 2, ucgen: 2, giyotin: 1, kimura: 1 },
  judo: { kimura: 2, armbar: 1, suplex: 1, armtriangle: 1 },
  gures: { armtriangle: 1, giyotin: 1, darce: 1, suplex: 1, overhand: 1 },
  sambo: { kneebar: 2, heelhook: 1, armbar: 1, suplex: 1 },
  boks: { overhand: 2, krose: 2, aparkat: 1 },
  muaythai: { dirsek: 2, karaciger: 2, headkick: 1, ucandiz: 1 },
  kyokushin: { headkick: 2, karaciger: 1, donertopuk: 1 },
  kickboks: { headkick: 1, karaciger: 1, krose: 1, spinning: 1 },
  sokak: { overhand: 1, giyotin: 1, krose: 1 },
};

export function startingTechniques(bg: Background): Record<string, { sv: number; xp: number }> {
  const out: Record<string, { sv: number; xp: number }> = {};
  Object.entries(START[bg] ?? {}).forEach(([id, sv]) => (out[id] = { sv, xp: 0 }));
  return out;
}

export const techLevel = (s: GameState, id: string) => s.teknik?.[id]?.sv ?? 0;
/** Seviye atlamak için gereken ustalık. */
export const xpNeed = (sv: number) => (sv + 1) * 3;
/** Puanla geliştirme maliyeti: öğrenmek 2, sonra seviye+1. */
export const techCost = (sv: number) => (sv === 0 ? 2 : sv + 1);

export function canUpgradeTech(s: GameState, id: string) {
  const sv = techLevel(s, id);
  return sv < MAX_TECH && s.puan >= techCost(sv);
}

export function upgradeTech(s: GameState, id: string) {
  if (!canUpgradeTech(s, id)) return;
  s.teknik = s.teknik ?? {};
  const cur = s.teknik[id] ?? { sv: 0, xp: 0 };
  s.puan -= techCost(cur.sv);
  s.teknik[id] = { sv: cur.sv + 1, xp: 0 };
}

/** Ustalık ekler; eşik dolunca seviye atlar. Dönen metin ekrana/habere yazılabilir. */
export function addTechXp(s: GameState, id: string, n: number): string {
  const t = techById(id);
  if (!t) return '';
  s.teknik = s.teknik ?? {};
  const cur = s.teknik[id] ?? { sv: 0, xp: 0 };
  if (cur.sv >= MAX_TECH) {
    s.teknik[id] = cur;
    return `${t.ad} zaten ustalık seviyesinde.`;
  }
  cur.xp += n;
  let up = false;
  while (cur.sv < MAX_TECH && cur.xp >= xpNeed(cur.sv)) {
    cur.xp -= xpNeed(cur.sv);
    cur.sv++;
    up = true;
  }
  if (cur.sv >= MAX_TECH) cur.xp = 0;
  s.teknik[id] = cur;
  return up ? `${t.ad} seviye atladı → ${cur.sv}/${MAX_TECH}!` : `${t.ad} ustalığı +${n} (${cur.xp}/${xpNeed(cur.sv)})`;
}

/** Dövüş motoruna giden seviyeler. */
export function techLevels(s: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  Object.entries(s.teknik ?? {}).forEach(([id, v]) => v.sv > 0 && (out[id] = v.sv));
  return out;
}

/** Seviyeye göre ağırlıklı teknik seçimi; bilinen yoksa o türden rastgele biri (seviye 0). */
export function pickTech(levels: Record<string, number> | undefined, tur: TechKind): TechDef {
  const pool = TECHNIQUES.filter((t) => t.tur === tur);
  const known = pool.filter((t) => (levels?.[t.id] ?? 0) > 0);
  if (!known.length) return pick(pool);
  return weighted(known.map((t) => [t, (levels![t.id] + 1) ** 2] as [TechDef, number]));
}

export const bestLevel = (levels: Record<string, number> | undefined, tur: TechKind) =>
  Math.max(0, ...TECHNIQUES.filter((t) => t.tur === tur).map((t) => levels?.[t.id] ?? 0));

/** Oyuncunun en iyi özel hareketi (dövüşte fırsat anı çıkar). */
export function bestSpecial(levels: Record<string, number> | undefined): TechDef | null {
  const sp = TECHNIQUES.filter((t) => t.tur === 'ozel' && (levels?.[t.id] ?? 0) > 0);
  if (!sp.length) return null;
  return sp.reduce((a, b) => ((levels![b.id] ?? 0) > (levels![a.id] ?? 0) ? b : a));
}

/** Bilinen tekniklerden rastgele biri (spar/antrenman ustalığı için). */
export function randomKnown(s: GameState, tur?: TechKind): TechDef | null {
  const known = TECHNIQUES.filter((t) => (!tur || t.tur === tur) && techLevel(s, t.id) > 0 && techLevel(s, t.id) < MAX_TECH);
  return known.length ? pick(known) : null;
}
