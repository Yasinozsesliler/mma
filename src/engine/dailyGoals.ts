// Günlük Hedefler ve Seri: her gerçek gün 3 küçük hedef. Üçü de bitince ödül sandığı (para + takipçi + Sezon Kemeri puanı)
// açılır ve seri bir gün uzar. Seri 3/7/14/30. günlerde kozmetik verir. Bir gün kaçarsa ödüllü reklamla seri haftada bir kez
// kurtarılabilir. Kural (ödüllü reklam ilkesi): güç (istatistik/puan) vermez; yalnızca para, takipçi ve görünüm.
// Durum cihazda tutulur (bütün kariyerler ortak); ödül, sandık açıldığı andaki kariyere uygulanır.
import { addFollowers, fmtDelta, followers } from './fame';
import type { GameState, Stage } from './types';
import { L } from '../i18n';

export type GoalKind = 'mac' | 'galibiyet' | 'bitiris' | 'gunluk' | 'hayali' | 'paylas' | 'puan' | 'kutu';
export type GoalState = {
  /** Sayaçların ait olduğu gün */
  gun: number;
  say: Partial<Record<GoalKind, number>>;
  /** Bugünün sandığı açıldı mı */
  alindi?: boolean;
  /** Serinin son tamamlanan günü ve uzunluğu */
  sonGun?: number;
  seri?: number;
  enIyi?: number;
  /** Son seri kurtarma günü (haftada bir) */
  kurtarma?: number;
  /** Bir kez verilen seri ödülleri */
  verilen?: number[];
};

export const GOAL_INFO: Record<GoalKind, { icon: string; metin: (n: number) => string }> = {
  mac: { icon: 'boxing-glove', metin: (n) => (n > 1 ? L("Kariyerinde {0} maç yap", [n]) : L("Kariyerinde bir maç yap")) },
  galibiyet: { icon: 'trophy', metin: () => L("Kariyerinde bir maç kazan") },
  bitiris: { icon: 'lightning-bolt', metin: () => L("Bir maçı nakavt ya da submission ile bitir") },
  gunluk: { icon: 'calendar-star', metin: () => L("Günün Dövüşü'nü oyna (ana menü)") },
  hayali: { icon: 'star-four-points', metin: () => L("Bir Hayalî Maç oyna (ana menü)") },
  paylas: { icon: 'camera', metin: (n) => (n > 1 ? L("Kafesgram'da {0} paylaşım yap", [n]) : L("Kafesgram'da bir paylaşım yap")) },
  puan: { icon: 'arrow-up-bold-circle', metin: () => L("Gelişim puanı harca") },
  kutu: { icon: 'gift', metin: () => L("Günlük Kutu'yu aç") },
};

/** Her gün: bir kariyer maçı hedefi, bir kolay hedef, bir mod hedefi. Gün numarasından belirlenir (herkes aynı). */
const A: [GoalKind, number][] = [['mac', 1], ['galibiyet', 1], ['mac', 2], ['bitiris', 1], ['galibiyet', 1], ['mac', 1], ['mac', 2]];
const B: [GoalKind, number][] = [['kutu', 1], ['paylas', 1], ['puan', 1], ['paylas', 2], ['kutu', 1]];
const Cx: [GoalKind, number][] = [['gunluk', 1], ['hayali', 1], ['gunluk', 1]];
const pick = <T,>(xs: T[], i: number) => xs[((i % xs.length) + xs.length) % xs.length];

export function goalsOf(gun: number): { k: GoalKind; n: number }[] {
  return [pick(A, gun), pick(B, gun * 3 + 1), pick(Cx, gun * 5 + 2)].map(([k, n]) => ({ k, n }));
}

/** Bugünün durumu (gün değiştiyse sayaçlar sıfır; seri bilgisi korunur). */
export function today(st: GoalState | undefined, gun: number): GoalState {
  if (st && st.gun === gun) return st;
  return { ...(st ?? {}), gun, say: {}, alindi: false };
}

export function addGoal(st: GoalState | undefined, gun: number, k: GoalKind, times = 1): GoalState {
  const t = today(st, gun);
  return { ...t, say: { ...t.say, [k]: (t.say[k] ?? 0) + times } };
}

export function goalRows(st: GoalState | undefined, gun: number) {
  const t = today(st, gun);
  return goalsOf(gun).map((g) => ({ ...g, say: Math.min(g.n, t.say[g.k] ?? 0), bitti: (t.say[g.k] ?? 0) >= g.n }));
}

export const allDone = (st: GoalState | undefined, gun: number) => goalRows(st, gun).every((g) => g.bitti);

/** Bugün itibarıyla süren seri (dün ya da bugün tamamlandıysa). */
export function streakOf(st: GoalState | undefined, gun: number): number {
  if (!st?.sonGun || !st.seri) return 0;
  return st.sonGun >= gun - 1 ? st.seri : 0;
}

/** Tek bir gün kaçtı ve bu hafta kurtarma yapılmadıysa seri ödüllü reklamla kurtarılabilir. */
export function canRescue(st: GoalState | undefined, gun: number): boolean {
  if (!st?.sonGun || !st.seri || st.seri < 2) return false;
  if (st.sonGun !== gun - 2) return false;
  return !st.kurtarma || gun - st.kurtarma >= 7;
}

export function rescue(st: GoalState, gun: number): GoalState {
  return { ...today(st, gun), sonGun: gun - 1, kurtarma: gun };
}

/** Seri ödülleri: kozmetikler (güç vermez). */
export const STREAK_REWARDS: { gun: number; id: string }[] = [
  { gun: 3, id: 'sort_alev' },
  { gun: 7, id: 'cer_alev' },
  { gun: 14, id: 'eld_alev' },
  { gun: 30, id: 'kem_alev' },
];
export const nextStreakReward = (seri: number) => STREAK_REWARDS.find((r) => r.gun > seri);

const BASE: Record<Stage, number> = { amator: 400, bolgesel: 1_500, buyuk: 5_000, ufc: 9_000 };
export const chestPara = (stage: Stage, seri: number) => Math.round((BASE[stage] * (1 + 0.05 * Math.min(10, seri - 1))) / 50) * 50;

/** Sandığı açar: ödülü kariyere uygular. Dönen `kozmetik` yeni verilecek seri ödülleridir. */
export function claimChest(s: GameState, st: GoalState | undefined, gun: number): { st: GoalState; metin: string; kozmetik: string[]; seri: number } | null {
  const t = today(st, gun);
  if (t.alindi || !allDone(t, gun)) return null;
  const seri = streakOf(t, gun) + 1;
  const para = chestPara(s.stage, seri);
  s.para += para;
  const fans = Math.round(followers(s) * 0.006 + 40);
  const parts = [`+$${para.toLocaleString()}`, L("{0} takipçi", [fmtDelta(addFollowers(s, fans))])];
  const verilen = t.verilen ?? [];
  const yeni = STREAK_REWARDS.filter((r) => r.gun <= seri && !verilen.includes(r.gun));
  return {
    st: { ...t, alindi: true, sonGun: gun, seri, enIyi: Math.max(t.enIyi ?? 0, seri), verilen: [...verilen, ...yeni.map((r) => r.gun)] },
    metin: L("🔥 Günlük hedefler tamam ({0}. gün): {1}", [seri, parts.join(' · ')]),
    kozmetik: yeni.map((r) => r.id),
    seri,
  };
}
