import { BACKGROUNDS, NAME_POOLS, NICKNAMES, ORGS, PERSONALITIES, baseStatsFor } from './data';
import { currentOrg, statAverage } from './character';
import { chance, clamp, noise, pick, randInt, uid, weighted } from './rng';
import type { Background, GameState, Opponent, OrgId, StatKey } from './types';
import { STAT_KEYS, STAT_LABELS } from './types';

const TIER_BASE: Record<OrgId, number> = {
  amator: 35,
  cfc: 45,
  oktagon: 46,
  pfl: 57,
  one: 56,
  mvp: 55,
  dwcs: 61,
  ufc: 64,
};

const STYLE_WEIGHTS: [Background, number][] = [
  ['boks', 3],
  ['muaythai', 3],
  ['kickboks', 3],
  ['gures', 4],
  ['judo', 1],
  ['bjj', 3],
  ['sambo', 2],
  ['kyokushin', 1],
  ['sokak', 1],
];

function levelFor(s: GameState, org: OrgId, zorluk: number, rank: number | null, champion: boolean) {
  let tb = TIER_BASE[org];
  const L = ORGS[org].merdiven;
  if (rank != null && L > 0) tb += ((L - rank) / L) * 14;
  if (champion) tb += 17;
  const pa = statAverage(s.fighter.stats);
  // Oyuncu güçlendikçe rakipler de güçlenir: rekabet hep canlı kalır.
  return tb * 0.55 + pa * 0.45 + zorluk * 5 + noise(2);
}

function recordFor(org: OrgId, rank: number | null, champion: boolean) {
  const st = ORGS[org].stage;
  const rankBoost = rank != null ? Math.max(0, 8 - rank) : 0;
  const ranges: Record<string, [number, number, number, number]> = {
    amator: [0, 4, 0, 3],
    bolgesel: [3, 11, 0, 5],
    buyuk: [9, 18, 1, 6],
    ufc: [12, 22, 1, 7],
  };
  const [gl, gh, ml, mh] = ranges[st];
  return {
    g: randInt(gl, gh) + rankBoost + (champion ? 3 : 0),
    m: champion ? randInt(0, 2) : randInt(ml, mh),
    b: chance(0.1) ? 1 : 0,
  };
}

/** Bu kariyerde kullanılmış isimler: aynı isimli iki farklı rakip çıkmasın. */
function usedNames(s: GameState, extra: Opponent[] = []) {
  const names = new Set(s.gecmis.map((h) => h.rakip));
  s.rakipler.forEach((r) => names.add(`${r.ad} ${r.soyad}`));
  extra.forEach((r) => names.add(`${r.ad} ${r.soyad}`));
  const nicks = new Set([...s.rakipler, ...extra].map((r) => r.lakap));
  return { names, nicks };
}

export function generateOpponent(
  s: GameState,
  opts: { zorluk: -1 | 0 | 1; rank?: number | null; champion?: boolean; org?: OrgId },
  exclude: Opponent[] = [],
): Opponent {
  const org = opts.org ?? currentOrg(s);
  const rank = opts.rank ?? null;
  const champion = !!opts.champion;
  const used = usedNames(s, exclude);
  let pool = pick(NAME_POOLS);
  let ad = pick(pool.ad);
  let soyad = pick(pool.soyad);
  for (let i = 0; i < 30 && used.names.has(`${ad} ${soyad}`); i++) {
    pool = pick(NAME_POOLS);
    ad = pick(pool.ad);
    soyad = pick(pool.soyad);
  }
  let lakap = pick(NICKNAMES);
  for (let i = 0; i < 10 && used.nicks.has(lakap); i++) lakap = pick(NICKNAMES);
  const stil = weighted(STYLE_WEIGHTS);
  const level = levelFor(s, org, opts.zorluk, rank, champion);
  const stats = baseStatsFor(stil, level);
  STAT_KEYS.forEach((k) => (stats[k] = Math.round(clamp(stats[k] + noise(4), 12, 96))));
  return {
    id: uid(),
    ad,
    soyad,
    lakap,
    uyruk: pool.ulke,
    stil,
    kisilik: pick(PERSONALITIES).ad,
    stats,
    rekor: recordFor(org, rank, champion),
    rank,
    champion,
    rivalry: 0,
    karsilasma: 0,
    zorluk: opts.zorluk,
  };
}

export function strongest(o: Opponent): StatKey {
  return STAT_KEYS.reduce((a, b) => (o.stats[b] > o.stats[a] ? b : a));
}

export function weakest(o: Opponent): StatKey {
  return STAT_KEYS.reduce((a, b) => (o.stats[b] < o.stats[a] ? b : a));
}

export function oppName(o: Opponent) {
  return `${o.ad} "${o.lakap}" ${o.soyad}`;
}

export function oppRecord(o: Opponent) {
  return `${o.rekor.g}-${o.rekor.m}-${o.rekor.b}`;
}

export function describeOpponent(o: Opponent) {
  return {
    stil: BACKGROUNDS[o.stil].ad,
    guclu: `${STAT_LABELS[strongest(o)]} (${o.stats[strongest(o)]})`,
    zayif: `${STAT_LABELS[weakest(o)]} (${o.stats[weakest(o)]})`,
    guc: Math.round(statAverage(o.stats)),
  };
}

export function riskText(zorluk: number, stage: string) {
  if (zorluk < 0)
    return stage === 'amator'
      ? 'Düşük risk. Kazanman beklenir, fazla ses getirmez.'
      : 'Düşük risk, düşük getiri. Kazanırsan sıralamada az ilerlersin, kaybedersen ciddi düşersin.';
  if (zorluk === 0) return 'Dengeli eşleşme. Kazanan bir basamak yukarı çıkar.';
  return 'Yüksek risk! Kazanırsan büyük sıçrama yaparsın, kaybedersen kimse şaşırmaz.';
}

/** Kalıcı rakibi oyuncunun güncel seviyesine taşır. */
export function refreshRival(s: GameState, r: Opponent): Opponent {
  const org = currentOrg(s);
  const target = Math.max(statAverage(r.stats) + randInt(1, 3), levelFor(s, org, 0, r.rank, false));
  const shift = target - statAverage(r.stats);
  const stats = { ...r.stats };
  STAT_KEYS.forEach((k) => (stats[k] = Math.round(clamp(stats[k] + shift, 12, 96))));
  return {
    ...r,
    stats,
    rekor: { ...r.rekor, g: r.rekor.g + randInt(1, 3), m: r.rekor.m + randInt(0, 1) },
    etiket: r.rivalry >= 3 ? '⚔️ EZELİ RAKİP' : r.sonSonuc === 'M' ? '🔁 RÖVANŞ FIRSATI' : '🔁 RÖVANŞ İSTİYOR',
    riskMetni:
      r.sonSonuc === 'M'
        ? 'Seni yenen adam. İntikam, taraftarı ve basını ateşler.'
        : 'Seni unutmadı. Bu dövüş kişisel ve çok konuşulacak.',
    zorluk: 1,
    champion: false,
  };
}

/** Rövanşa uygun kalıcı rakipler: en fazla 3 karşılaşma (trilogy), arada en az 4 dövüş, aynı aşama (ezeli rakip hariç). */
export function eligibleRivals(s: GameState) {
  const n = s.gecmis.length;
  const fought = (id: string) => s.gecmis.filter((h) => h.rakipId === id).length;
  return s.rakipler.filter(
    (r) =>
      r.rivalry > 0 &&
      !r.champion &&
      Math.max(r.karsilasma, fought(r.id)) < 3 &&
      n - (r.sonDovus ?? 0) >= 4 &&
      (r.stage === s.stage || r.rivalry >= 3),
  );
}

export function rivalCandidate(s: GameState): Opponent | null {
  const avail = eligibleRivals(s);
  if (!avail.length) return null;
  const r = avail.reduce((a, b) => (b.rivalry > a.rivalry ? b : a));
  if (!chance(r.rivalry >= 3 ? 0.22 : 0.12)) return null;
  return refreshRival(s, r);
}
