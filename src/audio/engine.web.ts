// Web ses motoru: tüm efektler ve müzik Web Audio API ile anında sentezlenir.
// Ses dosyası yok: indirme boyutu artmaz, çevrimdışı çalışır, gecikme olmaz ve aynı ses üst üste çalabilir.
import type { Scene, Sfx, SoundSettings } from './types';

type AC = AudioContext;
const W = globalThis as unknown as {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
  addEventListener?: typeof addEventListener;
  document?: Document;
  localStorage?: Storage;
};

// ---------- Ayarlar ----------

const KEY = 'yol_ses';
let settings: SoundSettings = { muzik: true, efekt: true };
try {
  const raw = W.localStorage?.getItem(KEY);
  if (raw) settings = { ...settings, ...JSON.parse(raw) };
} catch {}
const listeners = new Set<() => void>();

export function getSoundSettings(): SoundSettings {
  return settings;
}
export function setSoundSettings(next: Partial<SoundSettings>) {
  settings = { ...settings, ...next };
  try {
    W.localStorage?.setItem(KEY, JSON.stringify(settings));
  } catch {}
  applyVolumes();
  if (settings.muzik) startMusicIfNeeded();
  listeners.forEach((l) => l());
}
export function subscribeSound(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

// ---------- Bağlam ve kanallar ----------

let ctx: AC | null = null;
let master: GainNode;
let musicBus: GainNode;
let sfxBus: GainNode;
let crowdBus: GainNode;
let reverb: ConvolverNode;
let reverbSend: GainNode;
let noise: AudioBuffer;
let unlocked = false;

function build(): AC | null {
  if (ctx) return ctx;
  const Ctor = W.AudioContext ?? W.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  const c = ctx;
  master = c.createGain();
  master.gain.value = 0.85;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master.connect(comp).connect(c.destination);

  reverb = c.createConvolver();
  reverb.buffer = impulse(c, 2.2);
  reverbSend = c.createGain();
  reverbSend.gain.value = 0.9;
  reverbSend.connect(reverb).connect(master);

  musicBus = c.createGain();
  sfxBus = c.createGain();
  crowdBus = c.createGain();
  musicBus.connect(master);
  sfxBus.connect(master);
  crowdBus.connect(master);

  // 2 saniyelik beyaz gürültü: vuruş, zil, seyirci hepsi buradan türetilir.
  noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  applyVolumes(true);
  return c;
}

function impulse(c: AC, sec: number) {
  const len = Math.floor(c.sampleRate * sec);
  const b = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  return b;
}

function applyVolumes(instant = false) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const set = (g: GainNode, v: number) => (instant ? (g.gain.value = v) : g.gain.setTargetAtTime(v, t, 0.15));
  set(musicBus, settings.muzik ? 0.32 : 0);
  set(sfxBus, settings.efekt ? 0.95 : 0);
  set(crowdBus, settings.efekt ? 0.55 : 0);
}

// Tarayıcılar sesi ancak bir dokunuştan sonra açar.
function unlock() {
  const c = build();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  if (!unlocked) {
    unlocked = true;
    startMusicIfNeeded();
    refreshCrowd();
  }
}
if (W.addEventListener) {
  for (const ev of ['pointerdown', 'touchend', 'keydown'] as const) W.addEventListener(ev, unlock, { passive: true } as AddEventListenerOptions);
}
// Uygulama arka plana geçince ses tamamen durur.
W.document?.addEventListener?.('visibilitychange', () => {
  if (!ctx || !unlocked) return;
  if (W.document?.hidden) void ctx.suspend();
  else void ctx.resume();
});

function ready(): AC | null {
  return ctx && unlocked ? ctx : null;
}

// ---------- Yapı taşları ----------

const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function noiseSrc(c: AC, t: number, dur: number) {
  const s = c.createBufferSource();
  s.buffer = noise;
  s.start(t, Math.random() * 1.5, dur + 0.05);
  return s;
}

function filt(c: AC, type: BiquadFilterType, f: number, q = 0.7) {
  const b = c.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  return b;
}

function burst(c: AC, out: AudioNode, t: number, type: BiquadFilterType, f: number, peak: number, decay: number, q = 0.7, attack = 0.002) {
  const g = c.createGain();
  env(g, t, peak, attack, decay);
  noiseSrc(c, t, attack + decay).connect(filt(c, type, f, q)).connect(g).connect(out);
}

function tone(c: AC, out: AudioNode, t: number, type: OscillatorType, f0: number, f1: number, peak: number, attack: number, decay: number, glide = decay) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
  const g = c.createGain();
  env(g, t, peak, attack, decay);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

function send(c: AC, amount: number) {
  const g = c.createGain();
  g.gain.value = amount;
  g.connect(sfxBus);
  const r = c.createGain();
  r.gain.value = amount * 0.35;
  g.connect(r).connect(reverbSend);
  return g;
}

// ---------- Efektler ----------

function punch(c: AC, t: number, amt: number, body: boolean) {
  const out = send(c, 1);
  tone(c, out, t, 'sine', body ? 120 : 160, 45, 0.9 * amt, 0.004, body ? 0.22 : 0.16);
  burst(c, out, t, 'bandpass', body ? 850 : 1700 + Math.random() * 500, 0.55 * amt, body ? 0.09 : 0.06, 0.9);
  burst(c, out, t, 'highpass', 4200, 0.25 * amt, 0.015);
}

function heavy(c: AC, t: number) {
  punch(c, t, 1, false);
  const out = send(c, 1.1);
  tone(c, out, t, 'sine', 90, 32, 1, 0.005, 0.45);
  burst(c, out, t, 'lowpass', 500, 0.8, 0.28);
  const sh = c.createWaveShaper();
  const k = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * 2 - 1;
    k[i] = Math.tanh(x * 3);
  }
  sh.curve = k;
  const g = c.createGain();
  env(g, t, 0.35, 0.003, 0.12);
  noiseSrc(c, t, 0.15).connect(filt(c, 'bandpass', 1200, 0.6)).connect(sh).connect(g).connect(out);
}

function whoosh(c: AC, t: number) {
  const out = send(c, 0.6);
  const f = filt(c, 'bandpass', 500, 1.4);
  f.frequency.setValueAtTime(450, t);
  f.frequency.exponentialRampToValueAtTime(2600, t + 0.16);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.5, t + 0.07);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  noiseSrc(c, t, 0.25).connect(f).connect(g).connect(out);
}

function slam(c: AC, t: number) {
  const out = send(c, 1);
  tone(c, out, t, 'sine', 110, 36, 1, 0.004, 0.4);
  burst(c, out, t, 'lowpass', 450, 0.9, 0.3);
  burst(c, out, t + 0.01, 'bandpass', 1400, 0.25, 0.12, 0.6);
}

function tapPats(c: AC, t: number) {
  const out = send(c, 0.8);
  for (let i = 0; i < 3; i++) burst(c, out, t + i * 0.14, 'lowpass', 1000, 0.6, 0.05);
}

function bell(c: AC, t: number, rings: number) {
  const out = send(c, 0.55);
  for (let r = 0; r < rings; r++) {
    const s = t + r * 0.42;
    const f = 720;
    [
      [1, 1, 2.4],
      [2.76, 0.5, 1.4],
      [5.4, 0.28, 0.7],
      [8.93, 0.14, 0.35],
    ].forEach(([m, a, d]) => tone(c, out, s, 'sine', f * m, f * m, a * 0.45, 0.002, d));
    burst(c, out, s, 'highpass', 3000, 0.2, 0.02);
  }
}

function chime(c: AC, t: number) {
  const out = send(c, 0.5);
  [84, 88, 91, 96].forEach((m, i) => {
    tone(c, out, t + i * 0.075, 'triangle', mtof(m), mtof(m), 0.35, 0.004, 0.7);
    tone(c, out, t + i * 0.075, 'sine', mtof(m) * 2, mtof(m) * 2, 0.12, 0.004, 0.4);
  });
}

function cash(c: AC, t: number) {
  const out = send(c, 0.5);
  tone(c, out, t, 'triangle', 2637, 2637, 0.35, 0.002, 0.35);
  tone(c, out, t + 0.08, 'triangle', 3136, 3136, 0.35, 0.002, 0.5);
  burst(c, out, t, 'highpass', 6000, 0.2, 0.2);
  burst(c, out, t - 0.02, 'bandpass', 900, 0.3, 0.04, 2);
}

function click(c: AC, t: number) {
  const out = send(c, 0.35);
  tone(c, out, t, 'sine', 950, 620, 0.25, 0.002, 0.045);
  burst(c, out, t, 'highpass', 2500, 0.08, 0.012);
}

function flash(c: AC, t: number) {
  const out = send(c, 0.4);
  const n = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const s = t + Math.random() * 0.7;
    burst(c, out, s, 'highpass', 3200, 0.3, 0.025);
    tone(c, out, s + 0.01, 'square', 3400, 3000, 0.04, 0.001, 0.02);
  }
}

function brass(c: AC, out: AudioNode, t: number, notes: number[], dur: number, peak: number) {
  notes.forEach((m) => {
    [-6, 6].forEach((det) => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(m);
      o.detune.value = det;
      const f = filt(c, 'lowpass', 400, 1.5);
      f.frequency.setValueAtTime(400, t);
      f.frequency.linearRampToValueAtTime(2400, t + 0.06);
      f.frequency.setTargetAtTime(1100, t + 0.08, 0.2);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak / notes.length, t + 0.04);
      g.gain.setValueAtTime(peak / notes.length, t + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f).connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  });
}

function taiko(c: AC, out: AudioNode, t: number, amt: number) {
  tone(c, out, t, 'sine', 95, 52, 0.9 * amt, 0.004, 0.5);
  burst(c, out, t, 'lowpass', 320, 0.6 * amt, 0.18);
}

function win(c: AC, t: number) {
  const out = send(c, 0.6);
  brass(c, out, t, [60, 64, 67], 0.3, 0.8);
  brass(c, out, t + 0.28, [62, 65, 69], 0.3, 0.8);
  brass(c, out, t + 0.56, [64, 67, 72, 76], 1.6, 0.95);
  taiko(c, out, t, 0.8);
  taiko(c, out, t + 0.56, 1);
}

function lose(c: AC, t: number) {
  const out = send(c, 0.55);
  [
    [57, 60, 64],
    [55, 58, 62],
  ].forEach((ch, i) =>
    ch.forEach((m) => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(m - 12);
      const f = filt(c, 'lowpass', 650, 0.8);
      const g = c.createGain();
      const s = t + i * 1.1;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.linearRampToValueAtTime(0.12, s + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 2.2);
      o.connect(f).connect(g).connect(out);
      o.start(s);
      o.stop(s + 2.3);
    }),
  );
  tone(c, out, t, 'sine', 55, 48, 0.5, 0.4, 2.6);
}

function fanfare(c: AC, t: number) {
  const out = send(c, 0.65);
  [67, 72, 76].forEach((m, i) => brass(c, out, t + i * 0.14, [m, m - 12], 0.16, 0.7));
  brass(c, out, t + 0.45, [79, 67], 0.35, 0.8);
  brass(c, out, t + 0.85, [72, 76, 79, 84], 2.2, 1);
  for (let i = 0; i < 10; i++) taiko(c, out, t + i * (0.09 - i * 0.004), 0.35 + i * 0.05);
  taiko(c, out, t + 0.85, 1.1);
  applause(c, t + 0.8, 4.5, 1);
}

// ---------- Seyirci ----------

let crowdNodes: { level: GainNode; murmur: GainNode; bright: BiquadFilterNode; src: AudioBufferSourceNode[] } | null = null;
let crowdBase = 0;
let murmurTimer: ReturnType<typeof setInterval> | null = null;

function ensureCrowd(c: AC) {
  if (crowdNodes) return crowdNodes;
  const level = c.createGain();
  level.gain.value = 0;
  level.connect(crowdBus);
  const r = c.createGain();
  r.gain.value = 0.3;
  level.connect(r).connect(reverbSend);
  const bright = filt(c, 'lowpass', 1400, 0.5);
  bright.connect(level);
  const src: AudioBufferSourceNode[] = [];
  // Gövde: kalabalığın uğultusu
  const s1 = c.createBufferSource();
  s1.buffer = noise;
  s1.loop = true;
  s1.connect(filt(c, 'bandpass', 520, 0.5)).connect(bright);
  // Konuşma katmanı: sesli harf formantlarına yakın bantlar, dalgalanan şiddetle
  const murmur = c.createGain();
  murmur.gain.value = 0.4;
  const s2 = c.createBufferSource();
  s2.buffer = noise;
  s2.loop = true;
  s2.playbackRate.value = 0.93;
  const f2 = filt(c, 'bandpass', 1100, 1.6);
  s2.connect(f2).connect(murmur).connect(bright);
  s1.start();
  s2.start(c.currentTime, 0.7);
  src.push(s1, s2);
  crowdNodes = { level, murmur, bright, src };
  if (!murmurTimer)
    murmurTimer = setInterval(() => {
      if (!ctx || !crowdNodes) return;
      crowdNodes.murmur.gain.setTargetAtTime(0.25 + Math.random() * 0.45, ctx.currentTime, 0.12);
      f2.frequency.setTargetAtTime(900 + Math.random() * 700, ctx.currentTime, 0.2);
    }, 220);
  return crowdNodes;
}

function crowdTo(c: AC, level: number, bright: number, tc: number) {
  const n = ensureCrowd(c);
  const t = c.currentTime;
  n.level.gain.cancelScheduledValues(t);
  n.level.gain.setTargetAtTime(level, t, tc);
  n.bright.frequency.cancelScheduledValues(t);
  n.bright.frequency.setTargetAtTime(bright, t, tc);
}

/** Heyecan: seyirci kısa süre coşar, sonra taban seviyesine döner. */
function swell(c: AC, amt: number, hold: number) {
  if (crowdBase <= 0) return;
  const n = ensureCrowd(c);
  const t = c.currentTime;
  n.level.gain.cancelScheduledValues(t);
  n.level.gain.setTargetAtTime(crowdBase + 0.9 * amt, t, 0.08);
  n.level.gain.setTargetAtTime(crowdBase, t + hold, 0.9);
  n.bright.frequency.cancelScheduledValues(t);
  n.bright.frequency.setTargetAtTime(1400 + 2200 * amt, t, 0.1);
  n.bright.frequency.setTargetAtTime(1400, t + hold, 1);
}

function ooh(c: AC, t: number, amt: number) {
  const out = c.createGain();
  out.gain.value = 1;
  out.connect(crowdBus);
  const r = c.createGain();
  r.gain.value = 0.4;
  out.connect(r).connect(reverbSend);
  [
    [380, 640, 3],
    [820, 1080, 4],
  ].forEach(([a, b, q]) => {
    const f = filt(c, 'bandpass', a, q);
    f.frequency.setValueAtTime(a, t);
    f.frequency.linearRampToValueAtTime(b, t + 0.35);
    f.frequency.linearRampToValueAtTime(a * 1.1, t + 1.1);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1.6 * amt, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    noiseSrc(c, t, 1.4).connect(f).connect(g).connect(out);
  });
}

function applause(c: AC, t: number, dur: number, amt: number) {
  const out = c.createGain();
  out.gain.value = 0.9;
  out.connect(crowdBus);
  const r = c.createGain();
  r.gain.value = 0.35;
  out.connect(r).connect(reverbSend);
  const n = Math.floor(dur * 55 * amt);
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const s = t + p * dur + Math.random() * 0.03;
    const fade = p < 0.15 ? p / 0.15 : 1 - Math.max(0, (p - 0.6) / 0.4);
    burst(c, out, s, 'bandpass', 900 + Math.random() * 1800, (0.25 + Math.random() * 0.35) * fade * amt, 0.025 + Math.random() * 0.02, 1.2);
  }
}

// ---------- Müzik ----------

type Theme = {
  bpm: number;
  chords: number[][];
  bass: number[];
  kick: string;
  snare: string;
  hat: string;
  taiko?: string;
  arp?: boolean;
  brassHits?: boolean;
  padCut: number;
};

// Kulüp/antrenman havası: hip-hop davulu, 808 bas, karanlık pad (La minör: Am–F–C–G)
const HUB: Theme = {
  bpm: 86,
  chords: [
    [57, 60, 64],
    [57, 60, 65],
    [55, 60, 64],
    [55, 59, 62],
  ],
  bass: [45, 41, 48, 43],
  kick: 'x......x..x.....',
  snare: '....x.......x...',
  hat: 'x.x.x.x.x.x.xxx.',
  arp: true,
  padCut: 1000,
};
// Ana menü: sinematik, taiko davulları ve bakır nefesliler (Am–F–Dm–E)
const MENU: Theme = {
  bpm: 72,
  chords: [
    [57, 60, 64],
    [57, 60, 65],
    [57, 62, 65],
    [56, 59, 64],
  ],
  bass: [33, 29, 38, 28],
  kick: '................',
  snare: '................',
  hat: '................',
  taiko: 'x.....x.x..x..x.',
  brassHits: true,
  padCut: 1400,
};

let scenes: Scene[] = [];
let theme: Theme | null = null;
let seqTimer: ReturnType<typeof setInterval> | null = null;
let nextT = 0;
let step = 0;

function currentScene(): Scene {
  return scenes.length ? scenes[scenes.length - 1] : 'off';
}

function stepVoice(c: AC, th: Theme, s: number, t: number) {
  const bar = Math.floor(s / 16) % th.chords.length;
  const i = s % 16;
  const out = musicBus;
  const sp = 60 / th.bpm / 4;
  if (th.kick[i] === 'x') tone(c, out, t, 'sine', 150, 42, 0.9, 0.003, 0.32, 0.12);
  if (th.snare[i] === 'x') {
    burst(c, out, t, 'bandpass', 1900, 0.5, 0.16, 0.7);
    tone(c, out, t, 'triangle', 190, 160, 0.3, 0.002, 0.08);
    const r = c.createGain();
    r.gain.value = 0.25;
    r.connect(reverbSend);
    burst(c, r, t, 'bandpass', 1900, 0.5, 0.16, 0.7);
  }
  if (th.hat[i] === 'x') burst(c, out, t + (i % 4 === 2 ? sp * 0.12 : 0), 'highpass', 7500, i === 14 && bar % 2 ? 0.14 : 0.08, i === 14 && bar % 2 ? 0.22 : 0.035);
  if (th.taiko && th.taiko[i] === 'x') taiko(c, out, t, i === 0 ? 0.9 : 0.55);
  // Bas: her ölçünün başında ve kayık vuruşlarda
  if (i === 0 || (!th.taiko && (i === 10 || i === 7))) {
    const m = th.bass[bar];
    const dur = th.taiko ? sp * 16 : sp * (i === 0 ? 6 : 3);
    const o = c.createOscillator();
    o.type = th.taiko ? 'sawtooth' : 'sine';
    o.frequency.value = mtof(m);
    const g = c.createGain();
    const peak = th.taiko ? 0.16 : 0.55;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = filt(c, 'lowpass', th.taiko ? 220 : 400, 1);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  // Pad: ölçü boyunca yumuşak akor
  if (i === 0) {
    const dur = sp * 16;
    th.chords[bar].forEach((m) =>
      [-7, 7].forEach((det) => {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(m);
        o.detune.value = det;
        const f = filt(c, 'lowpass', th.padCut, 0.6);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.028, t + dur * 0.3);
        g.gain.setValueAtTime(0.028, t + dur * 0.8);
        g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.05);
        o.connect(f).connect(g).connect(out);
        const r = c.createGain();
        r.gain.value = 0.5;
        g.connect(r).connect(reverbSend);
        o.start(t);
        o.stop(t + dur * 1.1);
      }),
    );
    if (th.brassHits && bar % 2 === 0) brass(c, out, t, th.chords[bar].map((m) => m - 12), sp * 3, 0.35);
  }
  // Arpej: 3. ve 4. ölçüde tınılı notalar
  if (th.arp && bar >= 2 && i % 2 === 0) {
    const ch = th.chords[bar];
    const m = ch[(i / 2) % ch.length] + 12;
    tone(c, out, t, 'triangle', mtof(m), mtof(m), 0.07, 0.004, sp * 1.6);
  }
}

function tick() {
  if (!ctx || !theme) return;
  const sp = 60 / theme.bpm / 4;
  while (nextT < ctx.currentTime + 0.15) {
    stepVoice(ctx, theme, step, nextT);
    nextT += sp;
    step++;
  }
}

function startMusicIfNeeded() {
  const c = ctx;
  if (!c || !unlocked) return;
  const sc = currentScene();
  const want = sc === 'menu' ? MENU : sc === 'hub' ? HUB : null;
  if (want === theme) return;
  // Geçiş: eski tema kısılır, yenisi ölçü başından girer.
  const t = c.currentTime;
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setTargetAtTime(0, t, 0.25);
  theme = want;
  if (seqTimer) clearInterval(seqTimer);
  seqTimer = null;
  if (!want) return;
  setTimeout(() => {
    if (!ctx || theme !== want) return;
    applyVolumes();
    step = 0;
    nextT = ctx.currentTime + 0.05;
    seqTimer = setInterval(tick, 40);
    tick();
  }, 700);
}

function refreshCrowd() {
  const c = ctx;
  if (!c || !unlocked) return;
  const sc = currentScene();
  crowdBase = sc === 'fight' ? 0.32 : sc === 'celebrate' ? 0.25 : 0;
  if (crowdBase > 0 || crowdNodes) crowdTo(c, crowdBase, 1400, 0.8);
}

export function pushScene(s: Scene) {
  scenes.push(s);
  startMusicIfNeeded();
  refreshCrowd();
  return () => {
    const i = scenes.lastIndexOf(s);
    if (i >= 0) scenes.splice(i, 1);
    startMusicIfNeeded();
    refreshCrowd();
  };
}

// ---------- Dışa açık ----------

export function sfx(name: Sfx, amount = 1) {
  const c = ready();
  if (!c || !settings.efekt) return;
  const t = c.currentTime + 0.01;
  switch (name) {
    case 'click':
      return click(c, t);
    case 'punch':
      return punch(c, t, 0.75 + Math.random() * 0.25, false);
    case 'body':
      return punch(c, t, 0.8, true);
    case 'heavy':
      heavy(c, t);
      ooh(c, t + 0.1, 0.8);
      return swell(c, 0.7 * amount, 1.5);
    case 'whoosh':
      return whoosh(c, t);
    case 'slam':
      slam(c, t);
      return swell(c, 0.35, 1);
    case 'lock':
      return swell(c, 0.45, 2.2);
    case 'tap':
      tapPats(c, t);
      return swell(c, 1, 3);
    case 'ooh':
      return ooh(c, t, amount);
    case 'roar':
      swell(c, 1, 3.5);
      return applause(c, t + 0.3, 3.5, 0.8);
    case 'applause':
      return applause(c, t, 3 * amount, amount);
    case 'bell':
      return bell(c, t, 1);
    case 'bell2':
      return bell(c, t, 2);
    case 'chime':
      return chime(c, t);
    case 'cash':
      return cash(c, t);
    case 'win':
      win(c, t);
      return applause(c, t + 0.2, 3, 0.9);
    case 'lose':
      return lose(c, t);
    case 'fanfare':
      return fanfare(c, t);
    case 'flash':
      return flash(c, t);
    case 'swell':
      return swell(c, amount, 2);
  }
}
