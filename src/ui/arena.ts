// Kafes sahnesinin görünümü: organizasyonun seviyesine göre arena (ışık, seyirci, LED bant), kanvas logosu ve
// sıklete göre dövüşçü yapısı. Hepsi sabit katman: maç boyunca her karede yeniden çizilmez.
import { ORGS } from '../engine/data';
import type { OrgId, Stage, WeightClass } from '../engine/types';

/** tier: 0 depo/amatör salon · 1 bölgesel · 2 büyük lig · 3 dev arena */
export type Arena = { tier: 0 | 1 | 2 | 3; logo?: string; renk?: string };

const ORG_RENK: Record<OrgId, string> = {
  amator: '#8a8f99',
  cfc: '#e63946',
  oktagon: '#f08a3c',
  pfl: '#3a86ff',
  one: '#e8b84a',
  mvp: '#b57bff',
  dwcs: '#3ecf7a',
  ufc: '#f2c14e',
};
const STAGE_TIER: Record<Stage, Arena['tier']> = { amator: 0, bolgesel: 1, buyuk: 2, ufc: 3 };

export const arenaForOrg = (org: OrgId): Arena => ({ tier: STAGE_TIER[ORGS[org].stage], logo: org === 'ufc' ? 'UCC' : ORGS[org].kisa, renk: ORG_RENK[org] });

const BUILD: Record<WeightClass, number> = { sinek: -0.65, horoz: -0.5, tuy: -0.35, hafif: -0.2, welter: 0, orta: 0.2, yariagir: 0.4, agir: 0.75 };
/** Sıklete göre vücut yapısı (-1 ince … 1 iri); kadınlarda bir kademe ince */
export const buildOf = (siklet?: WeightClass, kadin?: boolean) => (siklet ? BUILD[siklet] - (kadin ? 0.2 : 0) : 0);
