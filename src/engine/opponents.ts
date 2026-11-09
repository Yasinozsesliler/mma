import { L } from '../i18n';
import { diffOf } from './challenges';
import { pickStar } from './uccRoster';
import { BACKGROUNDS, NAME_POOLS, NICKNAMES, ORGS, PERSONALITIES, baseStatsFor, femSurname } from './data';
import { currentOrg, statAverage } from './character';
import { chance, clamp, noise, pick, randInt, uid, weighted } from './rng';
import type { Background, GameState, Opponent, OrgId, Stage, StatKey } from './types';
import { STAT_KEYS, STAT_LABELS } from './types';

const TIER_BASE: Record<OrgId, number> = {
  amator: 35,
  cfc: 45,
  oktagon: 46,
  pfl: 61,
  one: 60,
  mvp: 59,
  dwcs: 64,
  ufc: 69,
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

// Rakip gücünde oyuncunun payı: üst basamaklarda rakipler oyuncuya daha yakın (zirvede kolay maç olmaz).
const PLAYER_W: Record<Stage, number> = { amator: 0.45, bolgesel: 0.45, buyuk: 0.5, ufc: 0.62 };
// Şampiyonun fazladan gücü: bölgesel kemer ulaşılabilir bir sınav, UCC kemeri en zoru.
const CHAMP_BONUS: Record<Stage, number> = { amator: 12, bolgesel: 11, buyuk: 18, ufc: 19 };

/** Oyuncunun referans gücü: kariyerindeki en yüksek güç. Yaşlanan oyuncuya göre rakipler zayıflamaz. */
export function refPower(s: GameState) {
  const pa = statAverage(s.fighter.stats);
  if (pa > (s.zirveGuc ?? 0)) {
    s.zirveGuc = pa;
    s.zirveStats = { ...s.fighter.stats };
  }
  return Math.max(pa, s.zirveGuc ?? 0);
}

/** Tek yanını fulleyen oyuncu: en güçlü istatistiği ortalamasının çok üstündeyse rakipler o ölçüde sert gelir. */
export function specBonus(s: GameState) {
  const st = s.fighter.stats;
  const top = Math.max(...STAT_KEYS.map((k) => st[k]));
  return Math.max(0, top - statAverage(st) - 10) * 0.2;
}

/** Form: uzun galibiyet serisinde rakipler hafifçe sertleşir, üst üste yenilgide hafifçe yumuşar (hissettirmeden). */
export function formBonus(s: GameState) {
  let w = 0;
  let l = 0;
  for (const h of s.gecmis) {
    if (h.sonuc === 'G' && !l) w++;
    else if (h.sonuc === 'M' && !w) l++;
    else break;
  }
  if (w >= 4) return Math.min(3, (w - 3) * 0.75);
  if (l >= 2) return -Math.min(3.5, (l - 1) * 1.5);
  return 0;
}

/** Kemer savunması: her savunmada sıradaki nesil biraz daha güçlü gelir (kemeri almak bir sınav, tutmak başka). */
export const defenseBonus = (s: GameState, org: OrgId) => (s.sampiyon && currentOrg(s) === org ? Math.min(6, (s.savunma ?? 0) * 1.2) : 0);

/** Bu basamaktaki rakibin hedef gücü (rastgelelik olmadan). Sıralamadaki dövüşçüler de buna doğru gelişir. */
export function targetLevel(s: GameState, org: OrgId, zorluk: number, rank: number | null, champion: boolean) {
  const stage = ORGS[org].stage;
  let tb = TIER_BASE[org];
  const L = ORGS[org].merdiven;
  if (rank != null && L > 0) tb += ((L - rank) / L) * 14;
  if (champion) tb += CHAMP_BONUS[stage];
  const w = PLAYER_W[stage];
  const ref = refPower(s);
  // Oyuncu güçlendikçe rakipler de güçlenir: rekabet hep canlı kalır.
  let lvl = tb * (1 - w) + ref * w;
  // UCC dünyanın zirvesi: oyuncu ne kadar güçlenirse güçlensin sıralamanın üstü ve şampiyon ona denk kalır.
  if (stage === 'ufc') lvl = Math.max(lvl, champion ? ref + 6.5 : rank != null && L > 0 ? ref - 1.5 + ((L - rank) / L) * 3 : ref - 3);
  return lvl - 2.5 + zorluk * 5 + diffOf(s).rakip + specBonus(s) + formBonus(s) + defenseBonus(s, org);
}

function levelFor(s: GameState, org: OrgId, zorluk: number, rank: number | null, champion: boolean) {
  return targetLevel(s, org, zorluk, rank, champion) + noise(2);
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

/** Bu kariyerde kullanılmış isimler: aynı isim, soyad ya da lakapla yeni rakip çıkmasın (havuz biterse yalnızca tam isim korunur). */
function usedNames(s: GameState, extra: Opponent[] = []) {
  const known = [...s.rakipler, ...(s.bolum?.liste ?? []), ...(s.bolum?.sampiyon ? [s.bolum.sampiyon] : []), ...extra];
  const names = new Set(s.gecmis.map((h) => h.rakip));
  known.forEach((r) => names.add(`${r.ad} ${r.soyad}`));
  const surnames = new Set([...names].map((n) => n.split(' ').pop()));
  const nicks = new Set(known.map((r) => r.lakap));
  s.gecmis.forEach((h) => h.rakipLakap && nicks.add(h.rakipLakap));
  // Rakip, oyuncunun kendi lakabını ve ezeli rakibin lakabını taşımasın.
  if (s.fighter.lakap) nicks.add(s.fighter.lakap);
  if (s.ezeli) nicks.add(s.ezeli.lakap);
  return { names, surnames, nicks };
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
  // Kadın kariyerinde bütün rakipler kadın dövüşçüler.
  const kadin = !!s.fighter.kadin;
  const nameOf = (p: (typeof NAME_POOLS)[number]) => ({ ad: pick(kadin ? p.kadin : p.ad), soyad: kadin && p.slav ? femSurname(pick(p.soyad)) : pick(p.soyad) });
  let pool = pick(NAME_POOLS);
  let { ad, soyad } = nameOf(pool);
  for (let i = 0; i < 60 && (used.names.has(`${ad} ${soyad}`) || (i < 40 && used.surnames.has(soyad))); i++) {
    pool = pick(NAME_POOLS);
    ({ ad, soyad } = nameOf(pool));
  }
  let lakap = pick(NICKNAMES);
  for (let i = 0; i < 40 && used.nicks.has(lakap); i++) lakap = pick(NICKNAMES);
  let stil = weighted(STYLE_WEIGHTS);
  let uyruk = pool.ulke;
  // UCC: kadrodaki yıldızlar (şampiyon ve üst sıralar en tanınmışlar)
  const star = org === 'ufc' ? pickStar(s, s.fighter.siklet, kadin, rank, champion, used.names) : null;
  if (star) ({ ad, soyad, lakap, uyruk, stil } = star);
  const level = levelFor(s, org, opts.zorluk, rank, champion);
  const stats = baseStatsFor(stil, level);
  STAT_KEYS.forEach((k) => (stats[k] = Math.round(clamp(stats[k] + noise(4), 12, 96))));
  return {
    // Kadro yıldızlarının kimliği sabit: sıralamaya geri dönen aynı kişi sayılır.
    id: star ? `ucc-${star.ad}-${star.soyad}`.toLowerCase().replace(/[^a-z0-9-]/g, '') : uid(),
    ad,
    soyad,
    lakap,
    uyruk,
    stil,
    kisilik: pick(PERSONALITIES).ad,
    stats,
    rekor: recordFor(org, rank, champion),
    rank,
    champion,
    rivalry: 0,
    karsilasma: 0,
    zorluk: opts.zorluk,
    ...(kadin ? { kadin: true } : {}),
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
      ? L("Düşük risk. Kazanman beklenir, fazla ses getirmez.")
      : L("Düşük risk, düşük getiri. Kazanırsan sıralamada az ilerlersin, kaybedersen ciddi düşersin.");
  if (zorluk === 0) return L("Dengeli eşleşme. Kazanan bir basamak yukarı çıkar.");
  return L("Yüksek risk! Kazanırsan büyük sıçrama yaparsın, kaybedersen kimse şaşırmaz.");
}

/** Kalıcı rakibi oyuncunun güncel seviyesine taşır. */
export function refreshRival(s: GameState, r: Opponent): Opponent {
  const exPartner = s.kanka?.durum === 'rakip' && s.kanka.o.id === r.id;
  const org = currentOrg(s);
  const target = Math.max(statAverage(r.stats) + randInt(1, 3), levelFor(s, org, 0, r.rank, false));
  const shift = target - statAverage(r.stats);
  const stats = { ...r.stats };
  STAT_KEYS.forEach((k) => (stats[k] = Math.round(clamp(stats[k] + shift, 12, 96))));
  return {
    ...r,
    stats,
    rekor: { ...r.rekor, g: r.rekor.g + randInt(1, 3), m: r.rekor.m + randInt(0, 1) },
    etiket: exPartner && !r.sonSonuc
      ? L("💔 ESKİ ANTRENMAN ORTAĞIN")
      : r.rivalry >= 3 ? L("⚔️ EZELİ RAKİP") : r.sonSonuc === 'M' ? L("🔁 RÖVANŞ FIRSATI") : L("🔁 RÖVANŞ İSTİYOR"),
    riskMetni: exPartner && !r.sonSonuc
      ? L("Yıllarca seninle ter döktü: bütün hareketlerini biliyor. Bu dövüş çok kişisel.")
      : r.sonSonuc === 'M'
        ? L("Seni yenen dövüşçü. İntikam, taraftarı ve basını ateşler.")
        : L("Seni unutmadı. Bu dövüş kişisel ve çok konuşulacak."),
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
