// Gece hayatının saf çekirdeği: risk sayacı ve hastalık ilerlemesi (ekonomi haftalık tikinden çağrılır).
import { L } from '../i18n';
import { chance, clamp, pick } from './rng';
import type { GameState, Stats } from './types';

export interface Disease {
  ad: string;
  tedaviHafta: number;
  maliyet: number; // amatör taban; aşamaya göre artar
}

export const DISEASES: Disease[] = [
  // Uykusuzluk ve kalabalık mekânlardan kapılan rahatsızlıklar
  { ad: L("Ağır grip"), tedaviHafta: 2, maliyet: 400 },
  { ad: L("Bronşit"), tedaviHafta: 3, maliyet: 600 },
  { ad: L("Bademcik iltihabı"), tedaviHafta: 2, maliyet: 350 },
  { ad: L("Mide enfeksiyonu"), tedaviHafta: 2, maliyet: 450 },
  { ad: L("Sinüzit"), tedaviHafta: 3, maliyet: 500 },
];

export const infected = (s: GameState) => !!s.hastalik;
export const untreated = (s: GameState) => !!s.hastalik && !s.hastalik.tedaviBitis;

/** Riskli davranış: risk sayacını artırır ve enfeksiyon zarı atar. Kapılırsa hastalığın adını döner. */
export function riskyAct(s: GameState, risk: number): string | null {
  s.gece = s.gece ?? { risk: 0, ziyaret: 0 };
  s.gece.risk = clamp(s.gece.risk + risk, 0, 12);
  s.gece.ziyaret++;
  if (s.hastalik) return null;
  const p = clamp(0.004 + s.gece.risk * 0.005, 0, 0.12) * Math.min(1, risk);
  if (!chance(p)) return null;
  const d = pick(DISEASES);
  s.hastalik = { ad: d.ad, hafta: s.hafta };
  return d.ad;
}

export function treatmentCost(s: GameState) {
  const d = DISEASES.find((x) => x.ad === s.hastalik?.ad) ?? DISEASES[0];
  return Math.round(d.maliyet * { amator: 1, bolgesel: 2, buyuk: 4, ufc: 6 }[s.stage]);
}

/** Haftalık: risk sayacı yavaşça düşer; tedavisiz hastalık sağlığı aşındırır; tedavi süresi dolunca iyileşir. */
export function nightTick(s: GameState, weeks: number): string[] {
  const notes: string[] = [];
  // Risk her hafta %20 azalır: düzenli ziyaretlerde bir dengeye oturur, sık ziyaretlerde yükselir.
  if (s.gece) s.gece.risk = s.gece.risk * Math.pow(0.8, weeks);
  // Eski kayıtlar: listede olmayan eski hastalık adları yeni listeden birine çevrilir
  if (s.hastalik && !DISEASES.some((d) => d.ad === s.hastalik!.ad)) s.hastalik.ad = DISEASES[0].ad;
  if (s.hastalik) {
    if (s.hastalik.tedaviBitis && s.hafta >= s.hastalik.tedaviBitis) {
      notes.push(L("💊 {0} tedavisi tamamlandı. Temizsin.", [s.hastalik.ad]));
      s.hastalik = undefined;
    } else if (!s.hastalik.tedaviBitis) {
      s.saglik = clamp(s.saglik - 3 * weeks, 5, 100);
    }
  }
  return notes;
}

/** Tedavisiz hastalık dövüşte kondisyonu ve odağı düşürür. */
export function diseaseMods(s: GameState): Partial<Stats> {
  if (!s.hastalik) return {};
  return untreated(s) ? { kondisyon: -6, iq: -2 } : { kondisyon: -2 };
}

/** Sevgili motivasyon verir. */
export const partnerMotivation = (s: GameState) => (s.iliski ? 1 : 0);
