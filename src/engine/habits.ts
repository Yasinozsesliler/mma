// Rakip alışkanlıkları: her rakibin bir iki gizli huyu vardır. Video, antrenman partneri ve köşe bunları açar.
// Doğru taktik küçük bir üstünlük verir; parmak hızı değil dikkat kazandırır.
import { L, LOC } from '../i18n';
import { pick } from './rng';
import type { FightState, GameState, Opponent, Tactic } from './types';

export type HabitId = 'gecYorulur' | 'hizliBaslar' | 'yavasIsinir' | 'kontraAcik' | 'kafesPanik' | 'yerdeZayif' | 'bacakZayif' | 'govdeHassas';

const IDS: HabitId[] = ['gecYorulur', 'hizliBaslar', 'yavasIsinir', 'kontraAcik', 'kafesPanik', 'yerdeZayif', 'bacakZayif', 'govdeHassas'];
/** Birbirini tutmayan huylar aynı rakipte çıkmaz. */
const ZIT: Partial<Record<HabitId, HabitId>> = { hizliBaslar: 'yavasIsinir', yavasIsinir: 'hizliBaslar' };

export const HABITS: Record<HabitId, { ad: () => string; ipucu: () => string }> = {
  gecYorulur: { ad: () => L("Geç rauntta yorulur"), ipucu: () => L("2. rauntla birlikte nefesi kesilir. O zaman bastır.") },
  hizliBaslar: { ad: () => L("Hızlı başlar, çabuk söner"), ipucu: () => L("İlk raunt mesafeyi koru, sonra üstüne yürü.") },
  yavasIsinir: { ad: () => L("Geç ısınır"), ipucu: () => L("İlk raunt henüz hazır değil: baskı ya da takedown ile erken vur.") },
  kontraAcik: { ad: () => L("Girişlerde gardı açılır"), ipucu: () => L("Üstüne geldiğinde kontra ile yakala.") },
  kafesPanik: { ad: () => L("Kafese sıkışınca panikler"), ipucu: () => L("Clinch ile kafese daya, orada bocalar.") },
  yerdeZayif: { ad: () => L("Sırtı yerdeyken çaresiz"), ipucu: () => L("Takedown ile indir, altta kilide açık kalır.") },
  bacakZayif: { ad: () => L("Ön bacağı zayıf"), ipucu: () => L("Low kick çok etkili: mesafeden bacağını kes.") },
  govdeHassas: { ad: () => L("Gövdesi hassas"), ipucu: () => L("Gövdeye vuruş nefesini keser: clinch ve baskıyla gövdeye git.") },
};

/** Rakibe huy verir (amatörde bir, profesyonelde iki). */
export function rollHabits(sayi: number): HabitId[] {
  const out: HabitId[] = [pick(IDS)];
  if (sayi > 1) {
    const ikinci = pick(IDS.filter((h) => h !== out[0] && ZIT[out[0]] !== h));
    out.push(ikinci);
  }
  return out;
}

export function ensureHabits(s: GameState, o: Opponent) {
  o.huylar ??= rollHabits(s.stage === 'amator' ? 1 : 2);
  o.huyBilinen ??= [];
}

/** Oyuncunun bu raunt, bu taktikle rakibin huylarından aldığı üstünlük (taktik tablosuyla aynı ölçekte). */
function edgeOf(h: HabitId, t: Tactic, raunt: number): number {
  switch (h) {
    case 'gecYorulur':
      return raunt >= 2 && t === 'baski' ? 0.05 : 0;
    case 'hizliBaslar':
      if (raunt === 1) return t === 'mesafe' ? 0.02 : t === 'baski' ? -0.03 : 0;
      return t === 'baski' ? 0.03 : 0;
    case 'yavasIsinir':
      return raunt === 1 && (t === 'baski' || t === 'takedown') ? 0.06 : 0;
    case 'kontraAcik':
      return t === 'kontra' ? 0.06 : 0;
    case 'kafesPanik':
      return t === 'clinch' ? 0.07 : 0;
    case 'yerdeZayif':
      return t === 'takedown' ? 0.09 : 0;
    case 'bacakZayif':
      return t === 'mesafe' ? 0.03 : 0;
    case 'govdeHassas':
      return t === 'clinch' || t === 'baski' ? 0.03 : 0;
  }
}

const TAKTIKLER: Tactic[] = ['baski', 'kontra', 'takedown', 'clinch', 'mesafe'];

/** Sıfır toplamlı üstünlük: rastgele taktik seçene avantaj yok, zaafı okuyan kazanır, ters giden biraz kaybeder. */
export const habitEdge = (fs: FightState, t: Tactic, raunt = fs.raunt) =>
  (fs.opp.huylar ?? []).reduce((a, h) => a + edgeOf(h, t, raunt) - TAKTIKLER.reduce((m, x) => m + edgeOf(h, x, raunt), 0) / TAKTIKLER.length, 0);

/** Yalnızca bilinen huylara göre taktik notu (taktik listesinde gösterilir). */
export function knownEdge(fs: FightState, t: Tactic, raunt = fs.raunt) {
  return (fs.opp.huyBilinen ?? []).reduce((a, h) => a + edgeOf(h, t, raunt), 0);
}

export const hasHabit = (fs: FightState, h: HabitId) => !!fs.opp.huylar?.includes(h);

/** Köşe bir huyu fark eder. Metni döner, açılacak huy yoksa null. */
export function revealInFight(fs: FightState, tercih?: HabitId): string | null {
  const gizli = (fs.opp.huylar ?? []).filter((h) => !fs.opp.huyBilinen?.includes(h));
  if (!gizli.length) return null;
  const h = tercih && gizli.includes(tercih) ? tercih : pick(gizli);
  fs.opp.huyBilinen = [...(fs.opp.huyBilinen ?? []), h];
  return L("\"Fark ettim: {0}. {1}\"", [HABITS[h].ad().toLocaleLowerCase(LOC), HABITS[h].ipucu()]);
}

/** Bu raunt oyuncunun taktiğine denk gelen huy (köşe önce bunu fark eder). */
export function exploited(fs: FightState): HabitId | undefined {
  const t = fs.taktik;
  if (!t) return undefined;
  return (fs.opp.huylar ?? []).find((h) => edgeOf(h, t, fs.raunt) > 0);
}

// ---------- Kampta hazırlık ----------

const PARTNER: Record<GameState['stage'], number> = { amator: 100, bolgesel: 400, buyuk: 1500, ufc: 4000 };
export const partnerCost = (s: GameState) => PARTNER[s.stage];

const gizliler = (o: Opponent) => (o.huylar ?? []).filter((h) => !o.huyBilinen?.includes(h));
export const canStudy = (o: Opponent) => !o.videoIzlendi && gizliler(o).length > 0;
export const canSpar = (s: GameState, o: Opponent) => !o.partnerTutuldu && gizliler(o).length > 0 && s.para >= partnerCost(s);

/** Maç videosu: ücretsiz, bir huy açar. */
export function studyVideo(s: GameState) {
  const o = s.pending.rakip;
  if (!o || !canStudy(o)) return;
  o.videoIzlendi = true;
  o.huyBilinen = [...(o.huyBilinen ?? []), pick(gizliler(o))];
}

/** Rakibe benzeyen partner: ücretli, bir huy daha açar. */
export function hireLookalike(s: GameState) {
  const o = s.pending.rakip;
  if (!o || !canSpar(s, o)) return;
  s.para -= partnerCost(s);
  o.partnerTutuldu = true;
  o.huyBilinen = [...(o.huyBilinen ?? []), pick(gizliler(o))];
}
