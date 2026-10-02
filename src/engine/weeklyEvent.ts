// Haftalık etkinlik: gerçek takvim haftasına bağlı tema ve üç görev. Her görev ayrı ödül verir; üçü bitince
// o haftanın koleksiyon rozeti kazanılır. Hafta değişince yeni tema başlar (kaçan rozet bir daha gelmez).
import { L, LOC } from '../i18n';
import { followers, fmtFollowers } from './fame';
import { readIstat } from './istat';
import type { GameState } from './types';

export type EventTheme = 'nakavt' | 'yer' | 'seri' | 'taraftar' | 'kamp';
export type Counter = 'ko' | 'sub' | 'finish' | 'win' | 'r1' | 'gonderi' | 'duello' | 'idman' | 'takipci' | 'seri';

export interface WeeklyEvent {
  hafta: number;
  tema: EventTheme;
  /** Görev sayaçlarının etkinlik başındaki değerleri */
  bas: Partial<Record<Counter, number>>;
  /** Görev hedefleri (tema tanımından, başlangıçta sabitlenir) */
  hedef: number[];
  alinan: boolean[];
}

const EPOCH = Date.UTC(2026, 8, 28); // Pazartesi
const WEEK = 7 * 86_400_000;

/** Yerel takvime göre hafta numarası (pazartesi başlar). */
export function weekNumber(d = new Date()) {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / WEEK);
}

/** Haftanın bitmesine kalan süre (ör. "3g 4s"). */
export function timeLeft(d = new Date()) {
  // Bir sonraki pazartesi yerel gece yarısı
  const days = (8 - d.getDay()) % 7 || 7;
  const ms = Math.max(0, new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime() - d.getTime());
  const g = Math.floor(ms / 86_400_000);
  const s = Math.floor((ms % 86_400_000) / 3_600_000);
  return g > 0 ? L("{0}g {1}s", [g, s]) : L("{0}s {1}dk", [s, Math.floor((ms % 3_600_000) / 60_000)]);
}

const ORDER: EventTheme[] = ['nakavt', 'taraftar', 'yer', 'kamp', 'seri'];
export const themeOf = (hafta: number): EventTheme => ORDER[((hafta % ORDER.length) + ORDER.length) % ORDER.length];

type Task = { c: Counter; n: (s: GameState) => number };
export const THEMES: Record<EventTheme, { ad: () => string; alt: () => string; icon: string; renk: [string, string]; rozet: string; gorevler: Task[] }> = {
  nakavt: {
    ad: () => L("NAKAVT HAFTASI"),
    alt: () => L("Bu hafta kafeste ışıkları söndür."),
    icon: 'lightning-bolt',
    renk: ['#3a0a0f', '#120709'],
    rozet: '💥',
    gorevler: [{ c: 'ko', n: () => 1 }, { c: 'ko', n: () => 2 }, { c: 'r1', n: () => 1 }],
  },
  yer: {
    ad: () => L("YER USTASI HAFTASI"),
    alt: () => L("Yere indir, kilidi tak, tap attır."),
    icon: 'lock',
    renk: ['#0c2a1c', '#07110c'],
    rozet: '🔒',
    gorevler: [{ c: 'sub', n: () => 1 }, { c: 'finish', n: () => 2 }, { c: 'sub', n: () => 2 }],
  },
  seri: {
    ad: () => L("SERİ HAFTASI"),
    alt: () => L("Durmak yok: galibiyetleri art arda diz."),
    icon: 'fire',
    renk: ['#3a2306', '#120c05'],
    rozet: '🔥',
    gorevler: [{ c: 'win', n: () => 1 }, { c: 'win', n: () => 3 }, { c: 'seri', n: (s) => Math.max(3, s.seri + 2) }],
  },
  taraftar: {
    ad: () => L("TARAFTAR HAFTASI"),
    alt: () => L("Sosyal medyayı salla, basında rakibini ez."),
    icon: 'account-group',
    renk: ['#0b1d3a', '#070b14'],
    rozet: '📣',
    gorevler: [{ c: 'gonderi', n: () => 3 }, { c: 'duello', n: () => 1 }, { c: 'takipci', n: (s) => Math.max(500, Math.round(followers(s) * 0.15)) }],
  },
  kamp: {
    ad: () => L("KAMP HAFTASI"),
    alt: () => L("Antrenman oyunlarında parla, kafeste kazan."),
    icon: 'weight-lifter',
    renk: ['#26123a', '#0d0814'],
    rozet: '🥊',
    gorevler: [{ c: 'idman', n: () => 1 }, { c: 'idman', n: () => 3 }, { c: 'win', n: () => 2 }],
  },
};

export function count(s: GameState, c: Counter): number {
  const ist = readIstat(s);
  switch (c) {
    case 'ko':
      return s.rekor.ko + s.amator.ko;
    case 'sub':
      return s.rekor.sub + s.amator.sub;
    case 'finish':
      return s.rekor.ko + s.amator.ko + s.rekor.sub + s.amator.sub;
    case 'win':
      return s.rekor.g + s.amator.g;
    case 'r1':
      return ist.r1;
    case 'gonderi':
      return ist.gonderi;
    case 'duello':
      return ist.duelloG;
    case 'idman':
      return ist.idmanIyi;
    case 'takipci':
      return followers(s);
    case 'seri':
      return Math.max(0, s.seri);
  }
}

/** Etkinliği bu haftaya getirir (hafta değiştiyse yeni tema, yeni başlangıç değerleri). */
export function ensureEvent(s: GameState, d = new Date()) {
  const hafta = weekNumber(d);
  if (s.etkinlik?.hafta === hafta) return;
  const tema = themeOf(hafta);
  const gorevler = THEMES[tema].gorevler;
  const bas: WeeklyEvent['bas'] = {};
  // Seri mutlak ölçülür; diğerleri hafta başından itibaren sayılır
  gorevler.forEach((g) => (bas[g.c] = g.c === 'seri' ? 0 : count(s, g.c)));
  s.etkinlik = { hafta, tema, bas, hedef: gorevler.map((g) => g.n(s)), alinan: gorevler.map(() => false) };
}

export function taskProgress(s: GameState, ev: WeeklyEvent, i: number): [number, number] {
  const g = THEMES[ev.tema].gorevler[i];
  const v = count(s, g.c) - (ev.bas[g.c] ?? 0);
  return [Math.max(0, Math.min(ev.hedef[i], v)), ev.hedef[i]];
}

export const taskDone = (s: GameState, ev: WeeklyEvent, i: number) => {
  const [a, b] = taskProgress(s, ev, i);
  return a >= b;
};

export function taskText(ev: WeeklyEvent, i: number): string {
  const g = THEMES[ev.tema].gorevler[i];
  const n = ev.hedef[i];
  switch (g.c) {
    case 'ko':
      return n === 1 ? L("Bir maçı nakavtla kazan") : L("{0} maçı nakavtla kazan", [n]);
    case 'sub':
      return n === 1 ? L("Bir maçı submission ile kazan") : L("{0} maçı submission ile kazan", [n]);
    case 'finish':
      return L("{0} maçı bitirerek kazan (KO ya da submission)", [n]);
    case 'win':
      return n === 1 ? L("Bir maç kazan") : L("{0} maç kazan", [n]);
    case 'r1':
      return L("Bir maçı 1. rauntta bitir");
    case 'gonderi':
      return L("Sosyal medyada {0} paylaşım yap", [n]);
    case 'duello':
      return L("Basın toplantısında trash talk düellosu kazan");
    case 'idman':
      return n === 1 ? L("Antrenman oyununda 80+ puan al") : L("Antrenman oyunlarında {0} kez 80+ puan al", [n]);
    case 'takipci':
      return L("{0} yeni takipçi kazan", [fmtFollowers(n)]);
    case 'seri':
      return L("{0} maçlık galibiyet serisine ulaş", [n]);
  }
}

const BASE: Record<GameState['stage'], number> = { amator: 400, bolgesel: 3_000, buyuk: 15_000, ufc: 50_000 };
const MULT = [1.2, 2, 3.2];
const PUAN = [0, 1, 2];

export function taskReward(s: GameState, i: number) {
  return { para: Math.round((BASE[s.stage] * MULT[i]) / 50) * 50, puan: PUAN[i] };
}

export const badgeId = (ev: WeeklyEvent) => `${ev.tema}:${ev.hafta}`;

export function claimTask(s: GameState, i: number) {
  const ev = s.etkinlik;
  if (!ev || ev.alinan[i] || !taskDone(s, ev, i)) return;
  const r = taskReward(s, i);
  ev.alinan[i] = true;
  s.para += r.para;
  s.puan += r.puan;
  const th = THEMES[ev.tema];
  const all = ev.alinan.every(Boolean);
  if (all) {
    s.rozetler ??= [];
    if (!s.rozetler.includes(badgeId(ev))) s.rozetler.push(badgeId(ev));
  }
  s.haberler.unshift(
    all
      ? L("{0} {1} tamamlandı! Koleksiyonuna yeni rozet eklendi. Ödül: ${2}", [th.rozet, th.ad(), r.para.toLocaleString(LOC)])
      : L("🗓️ Etkinlik görevi tamamlandı: {0}. Ödül: ${1}", [taskText(ev, i), r.para.toLocaleString(LOC)]),
  );
}
