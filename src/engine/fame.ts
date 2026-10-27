// Takipçi: sınırsız şöhret göstergesi. Kazandıkça artar, kaybettikçe erir; trash talk ile büyük kazanır ya da kaybedersin.
// (İç mekaniklerdeki 0-100 popülerlik ayrı tutulur; oyuncunun gördüğü ve kovaladığı sayı takipçidir.)
import { perkFollowers } from './perks';
import { L, LANG } from '../i18n';
import { chance, clamp, rand } from './rng';
import type { GameState, Opponent, P4PEntry } from './types';

/** Eski kayıtlarla uyumlu başlangıç: sosyal medya ekranının eski formülü. */
export const initialFollowers = (pop: number) => Math.round(200 + pop * pop * 45);

export const followers = (s: GameState) => s.takipci ?? initialFollowers(s.populerlik);

const STAGE_BASE: Record<GameState['stage'], number> = { amator: 20, bolgesel: 120, buyuk: 600, ufc: 2500 };
/** Aşamanın yumuşak tavanı: yaklaştıkça yüzde büyüme yavaşlar (katlanarak patlamasın), ama asla durmaz. */
const SOFT_CAP: Record<GameState['stage'], number> = { amator: 25_000, bolgesel: 200_000, buyuk: 2_000_000, ufc: 25_000_000 };
const damp = (s: GameState, F: number) => Math.max(0.08, 1 - F / SOFT_CAP[s.stage]);

/** 12.400 → "12,4B", 1.250.000 → "1,3M" */
export function fmtFollowers(n: number) {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const dec = LANG === 'en' ? '.' : ',';
  // Tam sayılarda gereksiz ",0" yazılmaz (50,0B değil 50B).
  const num = (v: number, d: number) => v.toFixed(d).replace(/\.0$/, '').replace('.', dec);
  if (a >= 1e6) return `${sign}${num(a / 1e6, a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `${sign}${num(a / 1e3, a >= 1e5 ? 0 : 1)}${LANG === 'tr' ? 'B' : 'K'}`;
  return `${sign}${Math.round(a)}`;
}

export const fmtDelta = (n: number) => `${n >= 0 ? '+' : ''}${fmtFollowers(n)}`;

export function addFollowers(s: GameState, n: number) {
  const before = followers(s);
  s.takipci = Math.max(50, Math.round(before + n));
  return s.takipci - before;
}

/** Popülerlik değişimini takipçiye çevirir (olaylar, sosyal medya, basın…). */
export function popToFollowers(s: GameState, dPop: number) {
  if (!dPop) return 0;
  const F = followers(s);
  return addFollowers(s, dPop * (F * 0.01 * (dPop > 0 ? damp(s, F) : 1) + STAGE_BASE[s.stage]) * (0.8 + rand() * 0.4));
}

/** Maç sonucu takipçi etkisi. */
export function fightFollowers(s: GameState, o: { won: boolean; draw: boolean; finish: boolean; bonus: number; title: boolean; koLoss: boolean; trash: boolean }) {
  const F = followers(s);
  const base = STAGE_BASE[s.stage];
  let d: number;
  if (o.won) d = F * (0.05 + (o.finish ? 0.04 : 0) + o.bonus * 0.03 + (o.title ? 0.3 : 0) + (o.trash ? 0.04 : 0)) * damp(s, F) + base * (o.finish ? 10 : 6);
  else if (o.draw) d = F * 0.005;
  else d = -F * (0.025 + (o.koLoss ? 0.025 : 0) + (o.trash ? 0.06 : 0));
  return addFollowers(s, d * (0.85 + rand() * 0.3) * (o.won ? perkFollowers(s) : 1));
}

/** Fotoğraf paylaşımı: çekicilik (1 = sıradan) kadar büyür; negatif çekicilik takipçi kaybettirir. */
export function photoFollowers(s: GameState, appeal: number) {
  const F = followers(s);
  if (appeal < 0) return addFollowers(s, F * appeal * 0.02 * (0.8 + rand() * 0.4));
  return addFollowers(s, (F * 0.004 * appeal * damp(s, F) + STAGE_BASE[s.stage] * 0.8 * appeal) * (0.8 + rand() * 0.4));
}

/**
 * Trash talk: çoğu zaman kazandırır ama bazen dengeyi kaçırırsın.
 * Dönen metin ekrana yazılır, yüzde değişim takipçiye uygulanır.
 */
export function trashTalkFollowers(s: GameState, basari: boolean, temiz = false): { delta: number; metin: string } {
  const F = followers(s);
  if (basari && !temiz && chance(0.15)) {
    // Çizgiyi aştı: konuşulan sensin ama bir kesim takibi bıraktı.
    const d = addFollowers(s, -F * (0.04 + rand() * 0.05));
    return { delta: d, metin: L("Sözlerin çizgiyi aştı, bir kesim takibi bıraktı. ({0} takipçi)", [fmtDelta(d)]) };
  }
  const d = basari ? addFollowers(s, F * (0.06 + rand() * 0.08) * damp(s, F) + STAGE_BASE[s.stage] * 4) : addFollowers(s, -F * (0.03 + rand() * 0.05));
  return { delta: d, metin: L("{0} takipçi", [fmtDelta(d)]) };
}

export const followerTier = (n: number) =>
  n >= 10e6 ? L("Küresel ikon") : n >= 1e6 ? L("Süperstar") : n >= 250e3 ? L("Yıldız") : n >= 50e3 ? L("Tanınan yüz") : n >= 10e3 ? L("Yükselen isim") : L("Yerel dövüşçü");

export const clampPop = (v: number) => clamp(v, 0, 100);

function hash01(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (Math.abs(h) % 1000) / 1000;
}

/** Diğer dövüşçülerin takipçisi: aşama, sıralama, rekor ve şampiyonluk; kişiye özel sabit bir çarpan. */
export function npcFollowers(s: GameState, o: Opponent) {
  const base = { amator: 8_000, bolgesel: 45_000, buyuk: 250_000, ufc: 900_000 }[s.stage];
  const L = 15;
  const rankF = o.rank != null ? 1 + ((L - Math.min(o.rank, L)) / L) * 2.5 : 0.8;
  const winF = 1 + o.rekor.g / 25;
  return Math.round(base * rankF * winF * (o.champion ? 3.5 : 1) * (0.45 + hash01(o.id) * 1.3));
}

export function p4pFollowers(e: P4PEntry) {
  return Math.round(1_500_000 * (1 + (e.puan - 70) / 10) * (e.sampiyon ? 2 : 1) * (0.5 + hash01(e.id) * 1.2));
}

export interface FollowerRow {
  id: string;
  ad: string;
  alt: string;
  takipci: number;
  oyuncu?: boolean;
  sampiyon?: boolean;
}

/** Takipçi sıralaması: sıkletindeki dövüşçüler, UCC'de P4P yıldızları ve sen. */
export function followerBoard(s: GameState): FollowerRow[] {
  const rows: FollowerRow[] = [];
  const seen = new Set<string>();
  const addOpp = (o: Opponent) => {
    if (seen.has(o.id)) return;
    seen.add(o.id);
    rows.push({ id: o.id, ad: `${o.ad} ${o.soyad}`, alt: o.champion ? L("Şampiyon") : o.rank != null ? `#${o.rank}` : L("Sıralamasız"), takipci: npcFollowers(s, o), sampiyon: o.champion });
  };
  if (s.bolum?.sampiyon) addOpp(s.bolum.sampiyon);
  (s.bolum?.liste ?? []).forEach(addOpp);
  // Amatörde sıralama yok: karşılaştığın ve önerilen rakipler de listede.
  s.rakipler.forEach(addOpp);
  (s.pending.secenekler ?? []).forEach(addOpp);
  if (s.stage === 'ufc')
    (s.p4p?.liste ?? []).forEach((e) => {
      if (seen.has(e.id)) return;
      seen.add(e.id);
      rows.push({ id: e.id, ad: `${e.ad} ${e.soyad}`, alt: L("P4P · {0}", [e.sampiyon ? L("Şampiyon") : L("Yıldız")]), takipci: p4pFollowers(e), sampiyon: e.sampiyon });
    });
  rows.push({ id: 'oyuncu', ad: `${s.fighter.ad} ${s.fighter.soyad}`, alt: L("Sen"), takipci: followers(s), oyuncu: true });
  return rows.sort((a, b) => b.takipci - a.takipci);
}
