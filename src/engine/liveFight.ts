// Canlı dövüş motoru: bir raunt gerçek zamanlı oynanır. Saf ve zaman adımlıdır (ekrandan bağımsız): ekran her
// karede liveStep çağırır, düğmeler liveInput'a gider; otomatik test oyuncuları da aynı motoru kullanır.
// İstatistikler belirleyicidir: vuruş gücü / çene hasarı, kondisyon nefesi, rakibin hızı ve zekâsı saldırı
// hazırlığının süresini ve çalım sıklığını belirler. Refleks farkı yaratır ama çok güçlü rakibi tek başına yenemez.
import { chance, clamp, rand } from './rng';
import type { FightState, Stats, Tactic } from './types';
import { tacticEdge } from './fight';

export type LiveInput = 'jab' | 'direkt' | 'tekme' | 'kac' | 'gard';
export type OState = 'idle' | 'windup' | 'strike' | 'guard' | 'hurt' | 'rocked';
export type OAttack = 'jab' | 'power' | 'kick';

export interface LiveSide {
  hp: number;
  sta: number;
  busyUntil: number;
  landed: number;
  thrown: number;
  dealt: number;
  kd: number;
}

export interface LiveEvent {
  t: number;
  kind:
    | 'pAttack' // oyuncu vuruş attı (alt: jab/direkt/tekme)
    | 'pDodge'
    | 'pGuard'
    | 'oWindup'
    | 'oFeint'
    | 'oGuard'
    | 'oAttack' // rakip vurdu (alt: jab/power/kick)
    | 'hit' // side: darbeyi yiyen
    | 'blocked'
    | 'dodged'
    | 'interrupt'
    | 'counter'
    | 'kd' // side: yere düşen / sarsılan
    | 'tired'
    | 'end';
  side?: 'p' | 'o';
  alt?: string;
  dmg?: number;
}

export interface LiveCfg {
  pPow: number;
  oPow: number;
  pRegen: number;
  oRegen: number;
  windup: number;
  dodgeMs: number;
  feint: number;
  oBlock: number;
  idle: [number, number];
  guardRate: number;
  jabRate: number;
  kickRate: number;
  edge: number;
  /** Rakibin, oyuncu vururken araya kontra sokma ihtimali */
  oCounter: number;
  /** Oyuncunun vuruşunun boşa gitme ihtimali (hız farkı) */
  miss: number;
  /** Rakibin sert vuruştan sonra seri devam ettirme ihtimali */
  combo: number;
  /** Doğru zamanlanmış kaçışın yine de tutmama ihtimali (rakip daha hızlı/zekiyse yüksek) */
  dodgeFail: number;
}

export interface LiveSim {
  t: number;
  dur: number;
  start: number;
  p: LiveSide & { dodgeUntil: number; guardUntil: number; counterUntil: number; lastAtk?: number };
  o: LiveSide & { state: OState; stateUntil: number; attack: OAttack; feint: boolean; comboNext?: boolean };
  /** Sarsılan taraf ve bitiş anı (o sırada saldıramaz, aldığı hasar artar) */
  rocked: { side: 'p' | 'o'; until: number } | null;
  cfg: LiveCfg;
  events: LiveEvent[];
  over: { kazanan: 'p' | 'o'; yontem: 'KO' | 'TKO'; t: number } | null;
}

export const ROUND_MS = 30_000;
const COUNTDOWN = 1200;
const COST = { jab: 7, direkt: 18, tekme: 24, kac: 6, gard: 0 };
const BASE = { jab: 0.65, direkt: 1.7, tekme: 2 };
const O_BASE: Record<OAttack, number> = { jab: 1.3, power: 3.3, kick: 3.7 };

/** İstatistik ve taktiklerden canlı ayarlar. */
export function liveConfig(p: Stats, o: Stats, pt: Tactic, ot: Tactic): LiveCfg {
  const pow = (a: Stats, b: Stats) => clamp(1 + (a.vurus - b.cene) / 45 + (a.vurus - 55) / 120, 0.4, 2);
  const aggressive = ot === 'baski' || ot === 'takedown' || ot === 'clinch';
  return {
    pPow: pow(p, o),
    oPow: pow(o, p),
    pRegen: 0.0055 + p.kondisyon * 0.00009,
    oRegen: 0.0055 + o.kondisyon * 0.00009,
    windup: clamp(760 - (o.hiz - p.hiz) * 5 - o.iq * 1.6, 300, 820),
    dodgeMs: clamp(200 + p.hiz * 1.9, 220, 440),
    feint: clamp(0.08 + o.iq / 450 + (o.iq - p.iq) / 300, 0.06, 0.35),
    oBlock: clamp(0.08 + o.iq / 520 + (ot === 'kontra' ? 0.12 : 0) + (ot === 'mesafe' ? 0.06 : 0), 0.05, 0.42),
    idle: aggressive ? [300, 700] : ot === 'kontra' ? [650, 1150] : [450, 900],
    guardRate: ot === 'kontra' ? 0.32 : ot === 'mesafe' ? 0.22 : 0.15,
    jabRate: ot === 'mesafe' ? 0.5 : ot === 'kontra' ? 0.3 : 0.28,
    kickRate: ot === 'mesafe' ? 0.12 : 0.18,
    edge: tacticEdge(pt, ot),
    oCounter: clamp(0.1 + o.iq / 600 + (ot === 'kontra' ? 0.15 : 0) + (o.iq - p.iq) / 400, 0.05, 0.45),
    miss: clamp(0.12 + (o.hiz - p.hiz) / 160, 0.04, 0.35),
    combo: clamp(0.18 + o.hiz / 400 + (ot === 'baski' ? 0.12 : 0), 0.1, 0.5),
    dodgeFail: clamp(0.08 + (o.hiz - p.hiz) / 80 + (o.iq - p.iq) / 200, 0.03, 0.45),
  };
}

const side = (hp: number): LiveSide => ({ hp, sta: 100, busyUntil: 0, landed: 0, thrown: 0, dealt: 0, kd: 0 });

export function liveCreate(fs: FightState, oStats: Stats, t0: number, dur = ROUND_MS): LiveSim {
  const cfg = liveConfig(fs.pStats, oStats, fs.taktik ?? 'mesafe', fs.rakipTaktik ?? 'mesafe');
  return {
    t: t0,
    dur,
    start: t0 + COUNTDOWN,
    p: { ...side(100 - fs.pHasar), sta: fs.pKondisyon, dodgeUntil: 0, guardUntil: 0, counterUntil: 0 },
    o: { ...side(100 - fs.oHasar), sta: fs.oKondisyon, state: 'idle', stateUntil: t0 + COUNTDOWN + 700, attack: 'power', feint: false },
    rocked: null,
    cfg,
    events: [],
    over: null,
  };
}

const ev = (s: LiveSim, e: Omit<LiveEvent, 't'>) => s.events.push({ t: s.t, ...e });
export const liveElapsed = (s: LiveSim) => clamp(s.t - s.start, 0, s.dur);
export const liveRunning = (s: LiveSim) => !s.over && s.t >= s.start && s.t - s.start < s.dur;

/** Darbe: yiyen tarafın canı düşer; düşük canda sert darbe yere düşürebilir, can biterse nakavt. */
function damage(s: LiveSim, victim: 'p' | 'o', dmg: number, heavy: boolean) {
  const v = victim === 'p' ? s.p : s.o;
  const a = victim === 'p' ? s.o : s.p;
  const rocked = s.rocked?.side === victim && s.t < s.rocked.until;
  const d = Math.round(dmg * (rocked ? 1.5 : 1) * 10) / 10;
  v.hp = clamp(v.hp - d, 0, 100);
  v.sta = clamp(v.sta - d * 0.5, 0, 100);
  a.landed++;
  a.dealt += d;
  ev(s, { kind: 'hit', side: victim, dmg: d });
  if (v.hp <= 0) {
    s.over = { kazanan: victim === 'p' ? 'o' : 'p', yontem: rocked || heavy ? 'KO' : 'TKO', t: s.t };
    ev(s, { kind: 'end', side: victim });
    return;
  }
  if (!rocked && heavy && v.hp < 42 && chance(clamp((d / 26) * (1.25 - v.hp / 42), 0, 0.6))) {
    v.kd++;
    s.rocked = { side: victim, until: s.t + 1900 };
    ev(s, { kind: 'kd', side: victim });
    if (victim === 'o') {
      s.o.state = 'rocked';
      s.o.stateUntil = s.t + 1900;
    }
    if (v.kd >= 3) {
      s.over = { kazanan: victim === 'p' ? 'o' : 'p', yontem: 'TKO', t: s.t };
      ev(s, { kind: 'end', side: victim });
    }
  }
}

/** Oyuncu girdisi. Meşgulken, sarsılmışken ya da raunt dışında yok sayılır. */
export function liveInput(s: LiveSim, k: LiveInput) {
  const p = s.p;
  if (!liveRunning(s) || s.t < p.busyUntil) return;
  if (s.rocked?.side === 'p' && s.t < s.rocked.until && k !== 'kac' && k !== 'gard') return;
  if (k === 'kac') {
    p.busyUntil = s.t + 300;
    p.dodgeUntil = s.t + s.cfg.dodgeMs;
    p.sta = clamp(p.sta - COST.kac, 0, 100);
    ev(s, { kind: 'pDodge' });
    return;
  }
  if (k === 'gard') {
    p.busyUntil = s.t + 200;
    p.guardUntil = s.t + 700;
    ev(s, { kind: 'pGuard' });
    return;
  }
  if (p.sta < COST[k]) {
    ev(s, { kind: 'tired', side: 'p' });
    p.busyUntil = s.t + 250;
    return;
  }
  p.sta -= COST[k];
  p.thrown++;
  const spam = p.lastAtk != null && s.t - p.lastAtk < 520;
  p.lastAtk = s.t;
  p.busyUntil = s.t + (k === 'jab' ? 260 : k === 'direkt' ? 460 : 620);
  p.guardUntil = 0;
  ev(s, { kind: 'pAttack', alt: k });
  const o = s.o;
  const counter = s.t < p.counterUntil;
  const heavy = k !== 'jab';
  let dmg = BASE[k] * s.cfg.pPow * (1 + s.cfg.edge * 2) * (p.sta < 20 ? 0.6 : 1) * (counter ? 2 : 1);
  if (o.state === 'rocked') {
    damage(s, 'o', dmg, heavy);
    return;
  }
  if (o.state === 'windup') {
    if (heavy) {
      // Hazırlığı kestin
      o.state = 'hurt';
      o.stateUntil = s.t + 520;
      ev(s, { kind: 'interrupt' });
      damage(s, 'o', dmg + 3, true);
    } else damage(s, 'o', dmg * 0.5, false);
    return;
  }
  if (o.state === 'guard' || (o.state === 'idle' && !counter && chance(s.cfg.oBlock))) {
    dmg *= 0.22;
    ev(s, { kind: 'blocked', side: 'o' });
    o.sta = clamp(o.sta - (heavy ? 5 : 2), 0, 100);
    s.o.hp = clamp(s.o.hp - dmg, 0, 100);
    return;
  }
  // Hızlı rakip vuruşu boşa çıkarabilir
  if (!counter && chance(s.cfg.miss)) {
    ev(s, { kind: 'blocked', side: 'o', alt: 'miss' });
    return;
  }
  // Zeki rakip araya kontra sokar (yumruk yağdırmanın bedeli)
  if (!counter && o.state === 'idle' && o.sta > 15 && chance(s.cfg.oCounter + (spam ? 0.2 : 0))) {
    ev(s, { kind: 'oAttack', alt: 'jab' });
    o.thrown++;
    damage(s, 'p', O_BASE.jab * 1.4 * s.cfg.oPow, false);
    if (s.over) return;
  }
  if (counter) ev(s, { kind: 'counter' });
  if (k === 'tekme') o.sta = clamp(o.sta - 7, 0, 100);
  damage(s, 'o', dmg, heavy || counter);
  if (!s.over && (o.state as OState) !== 'rocked') {
    o.state = 'hurt';
    o.stateUntil = s.t + (heavy ? 380 : 180);
  }
}

/** Zamanı ilerletir: nefes dolar, rakip yapay zekâsı karar verir, saldırılar çözülür. */
export function liveStep(s: LiveSim, t: number) {
  const dt = Math.max(0, t - s.t);
  s.t = t;
  if (s.over || t < s.start) return;
  if (t - s.start >= s.dur) {
    s.t = s.start + s.dur;
    return;
  }
  s.p.sta = clamp(s.p.sta + dt * s.cfg.pRegen, 0, 100);
  s.o.sta = clamp(s.o.sta + dt * s.cfg.oRegen, 0, 100);
  if (s.rocked && t >= s.rocked.until) s.rocked = null;
  const o = s.o;
  if (t < o.stateUntil) return;
  switch (o.state) {
    case 'idle':
    case 'hurt':
    case 'rocked':
    case 'guard': {
      if (o.state !== 'idle') {
        o.state = 'idle';
        o.stateUntil = t + 250 + rand() * 250;
        return;
      }
      // Karar: gard, saldırı hazırlığı ya da biraz daha bekle
      const tired = o.sta < 25;
      if (chance(s.cfg.guardRate + (tired ? 0.25 : 0))) {
        o.state = 'guard';
        o.stateUntil = t + 800 + rand() * 500;
        ev(s, { kind: 'oGuard' });
        return;
      }
      if (tired && chance(0.5)) {
        o.stateUntil = t + 600;
        return;
      }
      const r = rand();
      o.attack = r < s.cfg.jabRate ? 'jab' : r < s.cfg.jabRate + s.cfg.kickRate ? 'kick' : 'power';
      o.feint = o.attack !== 'jab' && chance(s.cfg.feint);
      o.state = 'windup';
      const w = o.attack === 'jab' ? s.cfg.windup * 0.42 : o.attack === 'kick' ? s.cfg.windup * 1.15 : s.cfg.windup;
      o.stateUntil = t + w * (0.75 + rand() * 0.5);
      ev(s, { kind: 'oWindup', alt: o.attack });
      return;
    }
    case 'windup': {
      if (o.feint) {
        o.state = 'idle';
        o.stateUntil = t + 300;
        ev(s, { kind: 'oFeint' });
        return;
      }
      o.state = 'strike';
      o.stateUntil = t + 260;
      o.thrown++;
      o.sta = clamp(o.sta - (o.attack === 'jab' ? 4 : o.attack === 'kick' ? 12 : 9), 0, 100);
      ev(s, { kind: 'oAttack', alt: o.attack });
      const p = s.p;
      const dmg = O_BASE[o.attack] * s.cfg.oPow * (1 - s.cfg.edge * 2) * (o.sta < 15 ? 0.6 : 1);
      if (t < p.dodgeUntil && !chance(s.cfg.dodgeFail)) {
        p.counterUntil = t + 950;
        ev(s, { kind: 'dodged' });
        return;
      }
      if (t < p.guardUntil) {
        p.sta = clamp(p.sta - (o.attack === 'jab' ? 3 : 8), 0, 100);
        p.hp = clamp(p.hp - dmg * 0.25, 0, 100);
        ev(s, { kind: 'blocked', side: 'p' });
        return;
      }
      damage(s, 'p', dmg, o.attack !== 'jab');
      return;
    }
    case 'strike':
      // Seri: sert vuruşun ardından kısa hazırlıklı ikinci vuruş
      if (o.attack !== 'jab' && !o.comboNext && o.sta > 20 && chance(s.cfg.combo)) {
        o.comboNext = true;
        o.attack = 'power';
        o.feint = false;
        o.state = 'windup';
        o.stateUntil = t + s.cfg.windup * 0.45;
        ev(s, { kind: 'oWindup', alt: 'combo' });
        return;
      }
      o.comboNext = false;
      o.state = 'idle';
      o.stateUntil = t + s.cfg.idle[0] + rand() * (s.cfg.idle[1] - s.cfg.idle[0]);
      return;
  }
}

/** Raunt sonucu (FightState'e aktarılır). */
export interface LiveRoundResult {
  pHp: number;
  oHp: number;
  pSta: number;
  oSta: number;
  pLanded: number;
  oLanded: number;
  pDealt: number;
  oDealt: number;
  pKd: number;
  oKd: number;
  /** Raundun geçen süresi (0-1) */
  oran: number;
  bitis: { kazanan: 'p' | 'o'; yontem: 'KO' | 'TKO' } | null;
}

export function liveResult(s: LiveSim): LiveRoundResult {
  return {
    pHp: s.p.hp,
    oHp: s.o.hp,
    pSta: s.p.sta,
    oSta: s.o.sta,
    pLanded: s.p.landed,
    oLanded: s.o.landed,
    pDealt: s.p.dealt,
    oDealt: s.o.dealt,
    pKd: s.p.kd,
    oKd: s.o.kd,
    oran: liveElapsed(s) / s.dur,
    bitis: s.over ? { kazanan: s.over.kazanan, yontem: s.over.yontem } : null,
  };
}

