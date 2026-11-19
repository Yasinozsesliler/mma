// Yeni görünüm: çizilmiş arena görselleri. Kariyer büyüdükçe mekan büyür (0 amatör spor salonu, 1 bölgesel salon,
// 2 büyük arena, 3 dev arena + dev ekran); ünvan maçında altın ışıklı arena. Işık tonu maçın şehrine göre değişir.
// Görseller scripts/arena-art.html ile üretilir (tier ve tint parametreleri).
import { currentOrg } from '../engine/character';
import { ORGS } from '../engine/data';
import type { GameState, Stage } from '../engine/types';
import { CITIES } from '../engine/worldMap';
import { LOC } from '../i18n';

export type ArenaTier = 0 | 1 | 2 | 3;

export const ARENA_ART = [
  require('../../assets/art/arena_t0.jpg'),
  require('../../assets/art/arena_t1.jpg'),
  require('../../assets/art/arena_t2.jpg'),
  require('../../assets/art/arena_t3.jpg'),
] as const;
export const CROWD_ART = [
  require('../../assets/art/crowd_t0.jpg'),
  require('../../assets/art/crowd_t1.jpg'),
  require('../../assets/art/crowd_t2.jpg'),
  require('../../assets/art/crowd_t3.jpg'),
] as const;
export const LIGHTS_ART = [
  require('../../assets/art/lights_t0.jpg'),
  require('../../assets/art/lights_t1.jpg'),
  require('../../assets/art/lights_t2.jpg'),
  require('../../assets/art/lights_t3.jpg'),
] as const;
export const ARENA_GOLD = require('../../assets/art/arena_gold.jpg');

const STAGE_TIER: Record<Stage, ArenaTier> = { amator: 0, bolgesel: 1, buyuk: 2, ufc: 3 };

/** Oyuncunun dövüştüğü mekanın büyüklüğü. Profesyonelken sözleşme boşta olsa bile amatör salona düşmez. */
export function arenaTier(s: GameState): ArenaTier {
  const id = currentOrg(s);
  if (id === 'amator' && s.stage !== 'amator') return Math.max(1, STAGE_TIER[s.stage]) as ArenaTier;
  return STAGE_TIER[ORGS[id].stage];
}

/** Ünvan maçı mı (bekleyen ya da süren dövüş). */
export function isTitleFight(s: GameState): boolean {
  return !!(s.pending.dovus?.unvanMaci || s.pending.rakip?.champion);
}

/** Şehre özel ışık tonları; listede olmayan şehirde kıtanın tonu, bilinmeyen şehirde ton yok. */
const CITY_TINT: Record<string, string> = {
  vegas: '#ffc845',
  newyork: '#4d8dff',
  miami: '#ff4fa0',
  orlando: '#ff4fa0',
  tokyo: '#c64dff',
  sanghay: '#ff3b5c',
  singapur: '#ff6a3c',
  bangkok: '#ff6a3c',
  abudabi: '#e8b54a',
  dubai: '#e8b54a',
  riyad: '#e8b54a',
  istanbul: '#e63946',
  moskova: '#d9363e',
  londra: '#7aa2ff',
  manchester: '#d9363e',
  dublin: '#3ecf7a',
  paris: '#9f7aff',
  rio: '#2ed47a',
  saopaulo: '#2ed47a',
  mexico: '#2ed47a',
  sidney: '#36c5f0',
};
const KITA_TINT: Record<string, string> = { avrupa: '#e63946', kamerika: '#ffb340', gamerika: '#2ed47a', asya: '#b057ff', afrika: '#ff9f1c', okyanusya: '#36c5f0' };

export function cityTint(cityId?: string): string | undefined {
  if (!cityId) return undefined;
  if (CITY_TINT[cityId]) return CITY_TINT[cityId];
  const c = CITIES.find((x) => x.id === cityId);
  return c ? KITA_TINT[c.kita] : undefined;
}

/** Bu maçın şehri (rakip seçildiyse ya da dövüş sürüyorsa). */
export function fightCity(s: GameState): string | undefined {
  return s.pending.rakip?.sehir ?? s.pending.dovus?.opp?.sehir;
}

/** Bir sahne için tüm arena ayarları. */
export function arenaLook(s: GameState): { tier: ArenaTier; gold: boolean; tint?: string } {
  const tier = arenaTier(s);
  return { tier, gold: tier >= 2 && isTitleFight(s), tint: cityTint(fightCity(s)) };
}

/** Rozet için organizasyon kısaltması. Profesyonelken sözleşme boşta olsa bile asla "AMATÖR" yazmaz. */
export function orgShort(s: GameState): string {
  const id = currentOrg(s);
  if (id === 'amator' && s.stage !== 'amator') return 'PRO';
  return ORGS[id].kisa;
}

/** Zemine yazılacak organizasyon adı ve alt yazı. Profesyonelde asla "AMATÖR" yazmaz. */
export function arenaOrgText(s: GameState): { org: string; sub: string } {
  const kisa = orgShort(s);
  const id = currentOrg(s);
  const ad = ORGS[id].ad;
  return { org: kisa, sub: kisa === 'PRO' || ad.toLocaleUpperCase(LOC) === kisa.toLocaleUpperCase(LOC) ? '' : ad };
}

