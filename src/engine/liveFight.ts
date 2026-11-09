// Canlı dövüş motoru: bir raunt gerçek zamanlı oynanır. Saf ve zaman adımlıdır (ekrandan bağımsız): ekran her
// karede liveStep çağırır, düğmeler liveInput'a gider; otomatik test oyuncuları da aynı motoru kullanır.
// Ayakta: jab/direkt/tekme, kaç (sprawl), gard, indir. Yerde (üstte): yumruk, dirsek, submission, kontrol, kalk;
// (altta): kurtul, gard, submission. İstatistikler belirleyicidir: vuruş/çene hasarı, güreş takedown ve sprawl'u,
// yer dövüşü submission'ları, kondisyon nefesi, rakibin hız ve zekâsı hazırlık süresini ve çalımları belirler.
import { chance, clamp, rand } from './rng';
import type { Background, FightState, Stats, Tactic } from './types';
import { pStatsOf, tacticEdge } from './fight';
import { habitEdge, hasHabit } from './habits';

export type LiveInput = 'jab' | 'direkt' | 'tekme' | 'kac' | 'gard' | 'indir' | 'sub' | 'kalk' | 'ozel';
/** Tarza özel hamle (geçmişe göre); imza hareketi varsa adı onunla gösterilir ve biraz daha güçlüdür. */
export type SpecialKind = 'kombo' | 'kafaTekmesi' | 'diz' | 'suplex' | 'guardCek' | 'savurma';
export const SPECIAL_FOR: Record<Background, SpecialKind> = {
  boks: 'kombo',
  kickboks: 'kafaTekmesi',
  kyokushin: 'kafaTekmesi',
  muaythai: 'diz',
  gures: 'suplex',
  sambo: 'suplex',
  judo: 'suplex',
  bjj: 'guardCek',
  sokak: 'savurma',
};
export const SPECIAL_COOLDOWN = 9000;
export type OState = 'idle' | 'windup' | 'strike' | 'guard' | 'hurt' | 'rocked';
/** Rakibin hazırladığı hamle: ayakta jab/power/kick/td; yerde (üstte) gnp/gsub, (altta) escape/gsub */
export type OAttack = 'jab' | 'power' | 'kick' | 'td' | 'gnp' | 'gsub' | 'escape';

export interface LiveSide {
  hp: number;
  sta: number;
  busyUntil: number;
  landed: number;
  thrown: number;
  dealt: number;
  kd: number;
  /** Yerde üstte geçen süre (ms) */
  ctrl: number;
  /** Bu rauntta gövde ve bacağa alınan hasar */
  govde: number;
  bacak: number;
}

export interface LiveEvent {
  t: number;
  kind:
    | 'pAttack' // oyuncu vuruş attı (alt: jab/direkt/tekme/yumruk/dirsek)
    | 'pDodge'
    | 'pGuard'
    | 'oWindup'
    | 'oFeint'
    | 'oGuard'
    | 'oAttack' // rakip vurdu (alt: jab/power/kick/gnp)
    | 'hit' // side: darbeyi yiyen
    | 'blocked'
    | 'dodged'
    | 'interrupt'
    | 'counter'
    | 'kd' // side: sarsılan
    | 'tired'
    | 'td' // side: deneyen, alt: ok/stuffed
    | 'sprawl'
    | 'ground' // side: üstteki
    | 'stand'
    | 'sub' // side: deneyen, alt: ok/fail
    | 'held' // oyuncu rakibin hamlesini bastırdı (kontrol/kurtul)
    | 'kilit' // submission mücadelesi başladı (side: kilitleyen, alt: teknik adı)
    | 'pozisyon' // üstte pozisyon yetersiz, kilide girilemedi
    | 'kivran' // rakip kilitte kıvrandı (alt: blok = oyuncu direndi, sert = büyük patlama, hafif)
    | 'end';
  side?: 'p' | 'o';
  alt?: string;
  dmg?: number;
}

export interface LiveCfg {
  pPow: number;
  oPow: number;
  pGnp: number;
  oGnp: number;
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
  tdRate: number;
  edge: number;
  /** Rakibin huyuna göre bölgesel hasar çarpanı */
  oBacakCarpan?: number;
  oGovdeCarpan?: number;
  /** Rakibin, oyuncu vururken araya kontra sokma ihtimali */
  oCounter: number;
  /** Oyuncunun vuruşunun boşa gitme ihtimali (hız farkı) */
  miss: number;
  /** Rakibin sert vuruştan sonra seri devam ettirme ihtimali */
  combo: number;
  /** Doğru zamanlanmış kaçışın yine de tutmama ihtimali (rakip daha hızlı/zekiyse yüksek) */
  dodgeFail: number;
  /** Güreş farkı (oyuncu − rakip) ve yer dövüşü farkı */
  wr: number;
  gr: number;
}

export interface LiveSim {
  t: number;
  dur: number;
  start: number;
  p: LiveSide & { dodgeUntil: number; guardUntil: number; counterUntil: number; lastAtk?: number };
  o: LiveSide & { state: OState; stateUntil: number; attack: OAttack; feint: boolean; comboNext?: boolean };
  /** Sarsılan taraf ve bitiş anı (o sırada saldıramaz, aldığı hasar artar) */
  rocked: { side: 'p' | 'o'; until: number } | null;
  /** Rehberli ilk raunt: hocanın söylediği anda basılan KAÇ bir kez kesin tutar (öğretirken şans faktörü yok). */
  kesinKac?: boolean;
  /** Yer dövüşü: üstteki taraf */
  ground: { top: 'p' | 'o'; since: number; /** Üstteki tarafın pozisyon hâkimiyeti 0-1 */ pos: number } | null;
  /** Submission mücadelesi: kilitleyen taraf, kilidin sıkılığı (0 kaçtı … 1 tap), bitiş anı */
  kilit: {
    by: 'p' | 'o';
    prog: number;
    until: number;
    ad: string;
    lastTap?: number;
    /** Rakibin bir sonraki kıvranma anı; ondan WARN_MS önce "DİREN!" uyarısı yanar */
    nextJolt?: number;
    /** Ulaşılan en yüksek sıkılık */
    max?: number;
    /** İmza hareketiyle girildi */
    imza?: boolean;
    /** Düğme basılı mı ve en son ne zaman basıldı */
    down?: boolean;
    pressAt?: number;
  } | null;
  /** Oyuncunun maç boyunca kaçırdığı kilitler: rakip her seferinde daha uyanık */
  subFails: number;
  /** Bu rauntta denenen takedown sayısı: tekrarlandıkça rakip sprawl'a hazır bekler */
  tdN?: number;
  cfg: LiveCfg;
  events: LiveEvent[];
  over: { kazanan: 'p' | 'o'; yontem: 'KO' | 'TKO' | 'SUB'; t: number } | null;
  /** Özel hamle: tür, imza mı, bir sonraki kullanılabilir an */
  special: { kind: SpecialKind; imza: boolean; readyAt: number } | null;
}

export const ROUND_MS = 30_000;
const COUNTDOWN = 1200;
const COST: Record<LiveInput, number> = { jab: 7, direkt: 18, tekme: 24, kac: 6, gard: 0, indir: 20, sub: 22, kalk: 4, ozel: 30 };
const BASE = { jab: 0.65, direkt: 1.7, tekme: 2, yumruk: 0.7, dirsek: 1.6 };
const O_BASE: Record<OAttack, number> = { jab: 1.3, power: 3.3, kick: 3.7, td: 0, gnp: 1.5, gsub: 0, escape: 0 };

/** İstatistik ve taktiklerden canlı ayarlar. */
export function liveConfig(p: Stats, o: Stats, pt: Tactic, ot: Tactic): LiveCfg {
  const pow = (a: Stats, b: Stats) => clamp(1 + (a.vurus - b.cene) / 45 + (a.vurus - 55) / 120, 0.4, 2);
  const gnp = (a: Stats, b: Stats) => clamp(1 + ((a.vurus + a.yer) / 2 - b.cene) / 50, 0.4, 1.9);
  const aggressive = ot === 'baski' || ot === 'takedown' || ot === 'clinch';
  return {
    pPow: pow(p, o),
    oPow: pow(o, p),
    pGnp: gnp(p, o),
    oGnp: gnp(o, p),
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
    tdRate: clamp((ot === 'takedown' ? 0.32 : ot === 'clinch' ? 0.16 : 0.06) * (0.5 + o.gures / 90), 0.02, 0.45),
    edge: tacticEdge(pt, ot),
    oCounter: clamp(0.1 + o.iq / 600 + (ot === 'kontra' ? 0.15 : 0) + (o.iq - p.iq) / 400, 0.05, 0.45),
    miss: clamp(0.12 + (o.hiz - p.hiz) / 160, 0.04, 0.35),
    combo: clamp(0.18 + o.hiz / 400 + (ot === 'baski' ? 0.12 : 0), 0.1, 0.5),
    dodgeFail: clamp(0.08 + (o.hiz - p.hiz) / 80 + (o.iq - p.iq) / 200, 0.03, 0.45),
    wr: p.gures - o.gures,
    gr: p.yer - o.yer,
  };
}

const side = (hp: number): LiveSide => ({ hp, sta: 100, busyUntil: 0, landed: 0, thrown: 0, dealt: 0, kd: 0, ctrl: 0, govde: 0, bacak: 0 });

export function liveCreate(fs: FightState, oStats: Stats, t0: number, dur = ROUND_MS, special?: { kind: SpecialKind; imza: boolean }): LiveSim {
  const cfg = liveConfig(pStatsOf(fs), oStats, fs.taktik ?? 'mesafe', fs.rakipTaktik ?? 'mesafe');
  cfg.edge += habitEdge(fs, fs.taktik ?? 'mesafe');
  cfg.oBacakCarpan = hasHabit(fs, 'bacakZayif') ? 1.5 : 1;
  cfg.oGovdeCarpan = hasHabit(fs, 'govdeHassas') ? 1.5 : 1;
  return {
    t: t0,
    dur,
    start: t0 + COUNTDOWN,
    p: { ...side(100 - fs.pHasar), sta: fs.pKondisyon, dodgeUntil: 0, guardUntil: 0, counterUntil: 0 },
    o: { ...side(100 - fs.oHasar), sta: fs.oKondisyon, state: 'idle', stateUntil: t0 + COUNTDOWN + 700, attack: 'power', feint: false },
    rocked: null,
    ground: null,
    cfg,
    events: [],
    over: null,
    kilit: null,
    subFails: fs.pSubFail ?? 0,
    special: special ? { ...special, readyAt: t0 + COUNTDOWN + 3000 } : null,
  };
}

const ev = (s: LiveSim, e: Omit<LiveEvent, 't'>) => s.events.push({ t: s.t, ...e });
export const liveElapsed = (s: LiveSim) => clamp(s.t - s.start, 0, s.dur);
export const liveRunning = (s: LiveSim) => !s.over && s.t >= s.start && s.t - s.start < s.dur;
/** Oyuncunun konumu: düğmeler buna göre değişir. */
export const livePos = (s: LiveSim): 'ayakta' | 'ustte' | 'altta' => (!s.ground ? 'ayakta' : s.ground.top === 'p' ? 'ustte' : 'altta');

function setGround(s: LiveSim, top: 'p' | 'o' | null) {
  if (top) {
    s.ground = { top, since: s.t, pos: 0 };
    ev(s, { kind: 'ground', side: top });
  } else {
    s.ground = null;
    ev(s, { kind: 'stand' });
  }
  s.rocked = null;
  s.o.state = 'idle';
  s.o.stateUntil = s.t + 500 + rand() * 300;
  s.p.busyUntil = Math.max(s.p.busyUntil, s.t + 250);
}

/** Darbe: yiyen tarafın canı düşer; düşük canda sert darbe sarsabilir, can biterse nakavt. */
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

const SUBS = ['Armbar', 'Rear-naked choke', 'Guillotine', 'Triangle', 'Kimura', "D'Arce"];
const KILIT_MS = 4000;
const RATE_BASE = 0.19;
/** Kıvranmadan önce uyarı süresi */
export const WARN_MS = 550;
/** Basılı tutmanın saniyedeki basış karşılığı */
const HOLD_TPS = 6;
/** Başarılı direnmede kıvranmanın kalan etkisi */
const DIREN_KALAN = 0.4;
const JOLT_MIN = 0.03;
const JOLT_VAR = 0.05;
const BIG_P = 0.42;

/** Kilit mücadelesini başlatır: tap için kilitleyen sıkar, savunan kurtulmaya çalışır. */
function startKilit(s: LiveSim, by: 'p' | 'o', prog: number, imza = false) {
  // İlk kıvranma kilit oturduktan sonra gelir: oyuncu basmaya başlamadan kilit çözülmez
  s.kilit = { by, prog: clamp(prog, 0.1, 0.7), until: s.t + KILIT_MS, ad: SUBS[Math.floor(rand() * SUBS.length)], nextJolt: s.t + 1400 + rand() * 500, max: prog, imza };
  s.o.state = 'idle';
  s.o.stateUntil = s.t + KILIT_MS;
  ev(s, { kind: 'kilit', side: by, alt: s.kilit.ad });
}

/** Rakibin kilidi saniyede ne kadar çözdüğü (oyuncu kilitliyorken) ya da sıktığı (oyuncu kilitteyken). */
function kilitRate(s: LiveSim) {
  const k = s.kilit!;
  const c = s.cfg;
  if (k.by === 'p') {
    // Sürekli gevşetme: taze, yer dövüşünde iyi ve nefesi yerinde rakip daha hızlı; asıl kurtulma kıvranmalarla gelir
    return clamp(RATE_BASE - c.gr / 500 - c.wr / 1000 + (s.o.sta - 60) / 600 - (1 - s.o.hp / 100) * 0.12 + s.subFails * 0.02, 0.03, 0.4);
  }
  return clamp(0.18 - c.gr / 300 + (1 - s.p.hp / 100) * 0.25 + (s.p.sta < 25 ? 0.08 : 0), 0.08, 0.5);
}

/** Mücadeleyi ilerletir: süre biter ya da kilit gevşerse kaçış, tam sıkılırsa tap. */
function stepKilit(s: LiveSim, dt: number) {
  const k = s.kilit!;
  const r = kilitRate(s);
  // Oyuncu kilitliyorsa rakip gevşetir (prog düşer); rakip kilitliyorsa sıkar (prog artar)
  k.prog = clamp(k.prog + (k.by === 'p' ? -r : r) * (dt / 1000), 0, 1);
  // Basılı tutmak da sıkar/kurtulur (saniyede ~6 basış kadar): isteyen basar, isteyen basılı tutar
  if (k.down && s.t - (k.pressAt ?? s.t) > 150 && dt > 0) {
    const g = tapGain(s) * HOLD_TPS * (dt / 1000);
    k.prog = clamp(k.prog + (k.by === 'p' ? g : -g), 0, 1);
    s.p.sta = clamp(s.p.sta - 3 * (dt / 1000), 0, 100);
  }
  // Rakip ara ara kıvranır: çoğu küçük, bazen sert bir patlama. Taze ve nefesi yerinde rakip daha sık patlar;
  // kaçırılan her kilit onu uyandırır
  if (k.by === 'p' && k.nextJolt != null && s.t >= k.nextJolt) {
    const big = chance(clamp(BIG_P * (0.15 + 0.85 * (s.o.hp / 100)) * (0.8 + s.o.sta / 250) * clamp(1 - s.cfg.gr / 70, 0.5, 1.4) * (1 + s.subFails * 0.3) * (k.imza ? 0.75 : 1), 0, 0.85));
    // DİREN: uyarıdan sonra basıp kıvranma anına kadar basılı tutan (kısa dokunuş sayılmaz) kıvranmanın çoğunu karşılar
    const pa = k.pressAt ?? -1e9;
    const blok = !!k.down && pa >= k.nextJolt - WARN_MS && pa <= k.nextJolt - 120;
    const size = big ? 0.26 + rand() * 0.18 : JOLT_MIN + rand() * JOLT_VAR;
    // Kıvranma kilidi tek başına açamaz (en az 0.05 kalır): oyuncunun basarak toparlama şansı hep vardır
    k.prog = Math.max(Math.min(k.prog, 0.05), k.prog - size * (blok ? DIREN_KALAN : 1));
    ev(s, { kind: 'kivran', alt: blok ? 'blok' : big ? 'sert' : 'hafif' });
    k.nextJolt = s.t + 1700 + rand() * 800;
  }
  k.max = Math.max(k.max ?? 0, k.prog);
  // Süre dolduğunda oyuncunun kilidi sıkılığı oranında tutar: çubuk ne kadar doluysa tap ihtimali o kadar yüksek
  const timeoutTap = k.by === 'p' && s.t >= k.until && k.prog > 0.3 && chance(Math.pow((k.prog - 0.3) / 0.7, 1.2));
  if (k.prog >= 1 || timeoutTap) {
    s.kilit = null;
    submit(s, k.by, 1);
    return;
  }
  if (k.prog <= 0 || s.t >= k.until) {
    s.kilit = null;
    // Tap'e çok yaklaşıldıysa oyuncuya bildirilir
    ev(s, { kind: 'sub', side: k.by, alt: k.by === 'p' && (k.max ?? 0) >= 0.75 ? 'yakin' : 'fail' });
    if (k.by === 'p') s.subFails++;
    // Pozisyonun bir kısmı korunur; kaçan taraf bazen ayağa kalkar
    if (s.ground) s.ground.pos *= 0.35;
    if (chance(0.4)) setGround(s, null);
    else {
      s.o.state = 'idle';
      s.o.stateUntil = s.t + 500;
    }
  }
}

/** Basış başına etki: yer dövüşü (ve kurtulurken güreş) ile güçlenir; nefes biterse zayıflar. */
function tapGain(s: LiveSim) {
  const c = s.cfg;
  return (s.kilit!.by === 'p' ? clamp(0.069 + c.gr / 2600, 0.05, 0.09) : clamp(0.07 + (c.gr + c.wr) / 3000, 0.05, 0.1)) * (s.p.sta < 15 ? 0.6 : 1);
}

/** Kilitte düğme basıldı/bırakıldı (DİREN ve basılı tutma modu için). */
export function liveHold(s: LiveSim, down: boolean) {
  const k = s.kilit;
  if (!k) return;
  k.down = down;
  if (down) k.pressAt = s.t;
}

/** Oyuncunun mücadele sırasındaki basışı: kilitliyorsa sıkar, kilitteyse kurtulmaya zorlar. */
function kilitTap(s: LiveSim) {
  const k = s.kilit!;
  // Saniyede ~6 basıştan hızlısı ek güç vermez: kilidi parmak hızı değil, ritim, pozisyon ve yıpratma kazandırır
  const pace = k.lastTap == null ? 1 : clamp((s.t - k.lastTap) / 150, 0, 1);
  k.lastTap = s.t;
  const g = tapGain(s) * pace;
  s.p.sta = clamp(s.p.sta - 0.6, 0, 100);
  k.prog = clamp(k.prog + (k.by === 'p' ? g : -g), 0, 1);
  // Basış kilidi tamamlarsa hemen tap; kurtulma basışı kilidi açarsa hemen kaçış
  if (k.prog >= 1 || k.prog <= 0) stepKilit(s, 0);
}

/** Submission denemesi: tutarsa maç biter. */
function submit(s: LiveSim, who: 'p' | 'o', p: number) {
  if (chance(p)) {
    s.over = { kazanan: who, yontem: 'SUB', t: s.t };
    ev(s, { kind: 'sub', side: who, alt: 'ok' });
    ev(s, { kind: 'end', side: who === 'p' ? 'o' : 'p' });
    return true;
  }
  ev(s, { kind: 'sub', side: who, alt: 'fail' });
  return false;
}

/** Oyuncu girdisi. Meşgulken, sarsılmışken ya da raunt dışında yok sayılır. */
export function liveInput(s: LiveSim, k: LiveInput) {
  const p = s.p;
  if (!liveRunning(s)) return;
  if (s.kilit) {
    if ((s.kilit.by === 'p' && k === 'sub') || (s.kilit.by === 'o' && k === 'kac')) kilitTap(s);
    return;
  }
  if (s.t < p.busyUntil) return;
  if (s.rocked?.side === 'p' && s.t < s.rocked.until && k !== 'kac' && k !== 'gard') return;
  const pos = livePos(s);
  if (pos !== 'ayakta') return k === 'ozel' ? undefined : groundInput(s, k, pos);
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
  if (k === 'sub' || k === 'kalk') return;
  if (k === 'ozel') return special(s);
  if (p.sta < COST[k]) {
    ev(s, { kind: 'tired', side: 'p' });
    p.busyUntil = s.t + 250;
    return;
  }
  p.sta -= COST[k];
  const o = s.o;
  if (k === 'indir') {
    p.busyUntil = s.t + 650;
    p.guardUntil = 0;
    const open = o.state === 'windup' || o.state === 'strike' ? 0.25 : o.state === 'rocked' ? 0.3 : o.state === 'guard' ? 0.08 : 0;
    s.tdN = (s.tdN ?? 0) + 1;
    const okundu = Math.min(0.25, Math.max(0, s.tdN - 2) * 0.06);
    const ok = chance(clamp(0.3 + s.cfg.wr / 125 + open + s.cfg.edge - okundu, 0.08, 0.78));
    ev(s, { kind: 'td', side: 'p', alt: ok ? 'ok' : 'stuffed' });
    if (ok) setGround(s, 'p');
    else {
      p.busyUntil = s.t + 1000;
      // Boşa dalış: dize ya da aparkata yakalanabilirsin
      if (o.state !== 'rocked' && chance(0.45)) {
        ev(s, { kind: 'oAttack', alt: 'power' });
        damage(s, 'p', O_BASE.power * s.cfg.oPow * 0.8, true);
      }
    }
    return;
  }
  p.thrown++;
  const spam = p.lastAtk != null && s.t - p.lastAtk < 520;
  p.lastAtk = s.t;
  p.busyUntil = s.t + (k === 'jab' ? 260 : k === 'direkt' ? 460 : 620);
  p.guardUntil = 0;
  ev(s, { kind: 'pAttack', alt: k });
  const counter = s.t < p.counterUntil;
  const heavy = k !== 'jab';
  let dmg = BASE[k] * s.cfg.pPow * (1 + s.cfg.edge * 2) * (p.sta < 20 ? 0.6 : 1) * (counter ? 2 : 1);
  if (o.state === 'rocked') {
    damage(s, 'o', dmg, heavy);
    return;
  }
  if (o.state === 'windup') {
    if (heavy && o.attack !== 'td') {
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
    o.hp = clamp(o.hp - dmg, 0, 100);
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
  if (k === 'tekme') {
    o.sta = clamp(o.sta - 7, 0, 100);
    o.bacak += dmg * 2.4 * (s.cfg.oBacakCarpan ?? 1);
  } else if (k === 'direkt' && chance(0.3)) o.govde += dmg * 2 * (s.cfg.oGovdeCarpan ?? 1);
  damage(s, 'o', dmg, heavy || counter);
  if (!s.over && (o.state as OState) !== 'rocked') {
    o.state = 'hurt';
    o.stateUntil = s.t + (heavy ? 380 : 180);
  }
}

/** Tarza özel hamle: bekleme süresi ve yüksek kondisyon maliyeti var. */
function special(s: LiveSim) {
  const sp = s.special;
  const p = s.p;
  const o = s.o;
  if (!sp || s.t < sp.readyAt) return;
  if (p.sta < COST.ozel) {
    ev(s, { kind: 'tired', side: 'p' });
    p.busyUntil = s.t + 250;
    return;
  }
  p.sta -= COST.ozel;
  sp.readyAt = s.t + SPECIAL_COOLDOWN;
  p.busyUntil = s.t + 750;
  p.guardUntil = 0;
  p.thrown++;
  ev(s, { kind: 'pAttack', alt: sp.kind });
  const boost = (sp.imza ? 1.15 : 1) * s.cfg.pPow * (1 + s.cfg.edge * 2);
  const rocked = o.state === 'rocked';
  const guard = o.state === 'guard';
  // Hazırlıktaki rakibe özel hamle her zaman kesme sayılır
  if (o.state === 'windup' && o.attack !== 'td') {
    o.state = 'hurt';
    o.stateUntil = s.t + 520;
    ev(s, { kind: 'interrupt' });
  }
  switch (sp.kind) {
    case 'kombo': {
      // Üç vuruşluk seri: her biri ayrı tutar ya da gard/ıskaya takılır
      for (let i = 0; i < 3 && !s.over; i++) {
        if (!rocked && (guard || chance(s.cfg.miss * 0.8))) ev(s, { kind: 'blocked', side: 'o' });
        else damage(s, 'o', (i === 2 ? 1.8 : 1) * boost, i === 2);
      }
      break;
    }
    case 'kafaTekmesi':
      if (!rocked && (guard ? chance(0.6) : chance(0.3 + s.cfg.miss))) ev(s, { kind: 'blocked', side: 'o', alt: guard ? undefined : 'miss' });
      else damage(s, 'o', 4.6 * boost, true);
      break;
    case 'diz':
      // Clinch dizi: gard dışında bloklanamaz
      if (guard && chance(0.5)) ev(s, { kind: 'blocked', side: 'o' });
      else {
        damage(s, 'o', 3.4 * boost, true);
        o.sta = clamp(o.sta - 8, 0, 100);
      }
      break;
    case 'savurma':
      if (!rocked && chance(0.4 + s.cfg.miss)) {
        ev(s, { kind: 'blocked', side: 'o', alt: 'miss' });
        p.busyUntil = s.t + 1000;
      } else damage(s, 'o', 5.2 * boost, true);
      break;
    case 'suplex':
      if (chance(clamp(0.72 + s.cfg.wr / 150, 0.4, 0.95))) {
        ev(s, { kind: 'td', side: 'p', alt: 'ok' });
        damage(s, 'o', 2.6 * (sp.imza ? 1.15 : 1), true);
        if (!s.over) setGround(s, 'p');
      } else ev(s, { kind: 'td', side: 'p', alt: 'stuffed' });
      break;
    case 'guardCek': {
      // Rakibi guard'a çek ve hemen submission dene; tutmazsa altta kalırsın
      setGround(s, 'o');
      startKilit(s, 'p', 0.32 + (sp.imza ? 0.1 : 0) + (rocked ? 0.12 : 0) + (1 - o.hp / 100) * 0.15 - s.subFails * 0.05, sp.imza);
      break;
    }
  }
  if (!s.over && o.state !== 'rocked' && !s.ground) {
    o.state = 'hurt';
    o.stateUntil = s.t + 400;
  }
}

/** Yerdeki girdiler. Üstte: jab=yumruk, direkt=dirsek, sub, gard=kontrol, kalk. Altta: kac=kurtul, gard, sub. */
function groundInput(s: LiveSim, k: LiveInput, pos: 'ustte' | 'altta') {
  const p = s.p;
  const o = s.o;
  const cost = k === 'jab' ? 6 : k === 'direkt' ? 14 : k === 'kac' ? 15 : COST[k];
  if (k !== 'gard' && p.sta < cost) {
    ev(s, { kind: 'tired', side: 'p' });
    p.busyUntil = s.t + 250;
    return;
  }
  if (k === 'gard') {
    p.busyUntil = s.t + 200;
    p.guardUntil = s.t + 750;
    ev(s, { kind: 'pGuard' });
    // Üstte kontrol: rakibin hazırladığı kalkışı ya da submission'ı bastır
    if (pos === 'ustte' && o.state === 'windup') {
      o.state = 'idle';
      o.stateUntil = s.t + 700 + rand() * 500;
      ev(s, { kind: 'held', alt: o.attack });
    }
    return;
  }
  p.sta -= cost;
  if (pos === 'ustte') {
    if (k === 'kalk') {
      setGround(s, null);
      return;
    }
    if (k === 'sub') {
      const g = s.ground!;
      // Pozisyon sağlamlaşmadan kilide girilemez (kontrol süresi ve yerde vuruşlarla dolar)
      if (g.pos < 0.45 && o.state !== 'rocked') {
        p.sta += cost - 4;
        p.busyUntil = s.t + 350;
        ev(s, { kind: 'pozisyon' });
        return;
      }
      // Kilidin başlangıç sıkılığı: pozisyon ve rakibin yıpranmışlığı; her başarısız deneme rakibi uyarır
      startKilit(s, 'p', 0.22 + g.pos * 0.2 + (1 - o.hp / 100) * 0.15 + (o.state === 'rocked' ? 0.12 : 0) - s.subFails * 0.05);
      return;
    }
    if (k === 'jab' || k === 'direkt') {
      const heavy = k === 'direkt';
      p.thrown++;
      p.busyUntil = s.t + (heavy ? 520 : 300);
      ev(s, { kind: 'pAttack', alt: heavy ? 'dirsek' : 'yumruk' });
      let dmg = (heavy ? BASE.dirsek : BASE.yumruk) * s.cfg.pGnp * (p.sta < 20 ? 0.6 : 1);
      if (o.state === 'guard' || chance(0.22)) {
        dmg *= 0.3;
        ev(s, { kind: 'blocked', side: 'o' });
        o.hp = clamp(o.hp - dmg, 0, 100);
        return;
      }
      damage(s, 'o', dmg, heavy);
      if (s.ground) s.ground.pos = clamp(s.ground.pos + (heavy ? 0.1 : 0.06), 0, 1);
    }
    return;
  }
  // Altta
  if (k === 'kac') {
    p.busyUntil = s.t + 700;
    // Rakip hazırlanırken açıklık verir: o an kurtulmak daha kolay; submission hazırlığını da bozar
    const timing = o.state === 'windup' ? 0.25 : 0;
    if (o.state === 'windup' && o.attack === 'gsub') {
      o.state = 'idle';
      o.stateUntil = s.t + 600;
      ev(s, { kind: 'held', alt: 'gsub' });
    }
    if (chance(clamp(0.26 + (s.cfg.wr + s.cfg.gr) / 260 + timing, 0.08, 0.8))) setGround(s, null);
    else ev(s, { kind: 'blocked', side: 'p', alt: 'escape' });
    return;
  }
  if (k === 'sub') {
    // Alttan kilit: rakip üstte vururken açık verir; aksi hâlde zayıf başlar
    startKilit(s, 'p', 0.16 + (o.state === 'windup' ? 0.12 : 0) + (1 - o.hp / 100) * 0.15 - s.subFails * 0.05);
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
  if (s.ground) {
    (s.ground.top === 'p' ? s.p : s.o).ctrl += dt;
    // Üstte geçen süre pozisyonu sağlamlaştırır (~9 sn'de tam)
    s.ground.pos = clamp(s.ground.pos + dt / 9000, 0, 1);
  }
  if (s.rocked && t >= s.rocked.until) s.rocked = null;
  if (s.kilit) {
    stepKilit(s, dt);
    return;
  }
  const o = s.o;
  if (t < o.stateUntil) return;
  if (s.ground) {
    groundAI(s, t);
    return;
  }
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
      const c = s.cfg;
      const r = rand();
      o.attack = r < c.tdRate ? 'td' : r < c.tdRate + c.jabRate ? 'jab' : r < c.tdRate + c.jabRate + c.kickRate ? 'kick' : 'power';
      o.feint = o.attack !== 'jab' && o.attack !== 'td' && chance(c.feint);
      o.state = 'windup';
      const w = o.attack === 'jab' ? c.windup * 0.42 : o.attack === 'kick' ? c.windup * 1.15 : o.attack === 'td' ? c.windup * 1.1 : c.windup;
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
      const p = s.p;
      if (o.attack === 'td') {
        o.sta = clamp(o.sta - 10, 0, 100);
        o.state = 'strike';
        o.stateUntil = t + 300;
        // Sprawl: zamanında KAÇ
        if (t < p.dodgeUntil && chance(clamp(0.66 + s.cfg.wr / 110, 0.3, 0.92))) {
          ev(s, { kind: 'sprawl' });
          ev(s, { kind: 'td', side: 'o', alt: 'stuffed' });
          p.counterUntil = t + 800;
          return;
        }
        const ok = chance(clamp(0.6 - s.cfg.wr / 110, 0.25, 0.85));
        ev(s, { kind: 'td', side: 'o', alt: ok ? 'ok' : 'stuffed' });
        if (ok) setGround(s, 'o');
        return;
      }
      o.state = 'strike';
      o.stateUntil = t + 260;
      o.thrown++;
      o.sta = clamp(o.sta - (o.attack === 'jab' ? 4 : o.attack === 'kick' ? 12 : 9), 0, 100);
      ev(s, { kind: 'oAttack', alt: o.attack });
      const dmg = O_BASE[o.attack] * s.cfg.oPow * (1 - s.cfg.edge * 2) * (o.sta < 15 ? 0.6 : 1);
      if (t < p.dodgeUntil && (s.kesinKac || !chance(s.cfg.dodgeFail))) {
        s.kesinKac = undefined;
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
      if (o.attack === 'kick') p.bacak += dmg * 2.4;
      else if (o.attack === 'power' && chance(0.3)) p.govde += dmg * 2;
      damage(s, 'p', dmg, o.attack !== 'jab');
      return;
    }
    case 'strike':
      // Seri: sert vuruşun ardından kısa hazırlıklı ikinci vuruş
      if ((o.attack === 'power' || o.attack === 'kick') && !o.comboNext && o.sta > 20 && chance(s.cfg.combo)) {
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

/** Yerde rakip: üstteyse yumruk ve submission hazırlar; alttaysa kalkmaya ya da submission'a hazırlanır. */
function groundAI(s: LiveSim, t: number) {
  const o = s.o;
  const p = s.p;
  const top = s.ground!.top === 'o';
  if (o.state === 'windup') {
    o.state = 'idle';
    o.stateUntil = t + 500 + rand() * 600;
    if (o.attack === 'gnp') {
      o.thrown++;
      ev(s, { kind: 'oAttack', alt: 'gnp' });
      const dmg = O_BASE.gnp * s.cfg.oGnp;
      if (t < p.guardUntil) {
        p.hp = clamp(p.hp - dmg * 0.3, 0, 100);
        ev(s, { kind: 'blocked', side: 'p' });
      } else damage(s, 'p', dmg, chance(0.35));
      return;
    }
    if (o.attack === 'gsub') {
      // Oyuncu zamanında bastıramadı: kilit mücadelesi başlar (KURTUL'a hızlı bas)
      startKilit(s, 'o', (top ? 0.3 : 0.22) - s.cfg.gr / 300 + (1 - p.hp / 100) * 0.15);
      return;
    }
    if (o.attack === 'escape') {
      if (chance(clamp(0.45 - (s.cfg.wr + s.cfg.gr) / 200, 0.1, 0.85))) setGround(s, null);
      else ev(s, { kind: 'held', alt: 'escape' });
    }
    return;
  }
  if (o.state !== 'idle') {
    o.state = 'idle';
    o.stateUntil = t + 300;
    return;
  }
  // Uzun süre yerde: hakem ayağa kaldırır
  if (t - s.ground!.since > 9000 && chance(0.5)) {
    setGround(s, null);
    return;
  }
  if (top) {
    // Yerde zayıf kalan rakip ayağa kalkmayı tercih edebilir
    if (s.cfg.gr > 10 && chance(0.2)) {
      setGround(s, null);
      return;
    }
    o.attack = chance(clamp(0.1 - s.cfg.gr / 250, 0.04, 0.22)) ? 'gsub' : 'gnp';
    o.state = 'windup';
    o.stateUntil = t + (o.attack === 'gsub' ? 900 : 380) * (0.8 + rand() * 0.4);
  } else {
    o.attack = chance(clamp(0.08 - s.cfg.gr / 250, 0.03, 0.18)) ? 'gsub' : 'escape';
    o.state = 'windup';
    o.stateUntil = t + (o.attack === 'gsub' ? 900 : 700) * (0.8 + rand() * 0.4);
  }
  ev(s, { kind: 'oWindup', alt: o.attack });
}

/** Duraklatma: bütün mutlak zamanları dt kadar ileri kaydırır (raunt donmuş gibi devam eder). */
export function liveShift(s: LiveSim, dt: number) {
  s.t += dt;
  s.start += dt;
  s.p.busyUntil += dt;
  s.p.dodgeUntil += dt;
  s.p.guardUntil += dt;
  s.p.counterUntil += dt;
  s.o.busyUntil += dt;
  s.o.stateUntil += dt;
  if (s.rocked) s.rocked.until += dt;
  if (s.ground) s.ground.since += dt;
  if (s.special) s.special.readyAt += dt;
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
  /** Yerde üstte geçen süre (sn) */
  pCtrl: number;
  oCtrl: number;
  /** Raundun geçen süresi (0-1) */
  oran: number;
  bitis: { kazanan: 'p' | 'o'; yontem: 'KO' | 'TKO' | 'SUB' } | null;
  /** Maç boyunca kaçırılan kilitler (sonraki raunda taşınır) */
  subFails: number;
  pGovde: number;
  pBacak: number;
  oGovde: number;
  oBacak: number;
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
    pCtrl: s.p.ctrl / 1000,
    oCtrl: s.o.ctrl / 1000,
    oran: liveElapsed(s) / s.dur,
    bitis: s.over ? { kazanan: s.over.kazanan, yontem: s.over.yontem } : null,
    subFails: s.subFails,
    pGovde: s.p.govde,
    pBacak: s.p.bacak,
    oGovde: s.o.govde,
    oBacak: s.o.bacak,
  };
}
