// İskelet matematiği ve poz kütüphanesi (çizimden bağımsız, testlerde de kullanılır).
export interface Pose {
  x: number; // kök kayması (ileri +)
  y: number; // kök yüksekliği (aşağı +)
  rot: number; // tüm vücut dönüşü (derece, pozitif = saat yönü)
  torso: number;
  head: number;
  aL1: number; // öndeki kol: omuz
  aL2: number; //   dirsek (üst kola göre)
  aR1: number; // arkadaki kol
  aR2: number;
  lL1: number; // öndeki bacak: kalça
  lL2: number; //   diz (pozitif = baldır geriye kıvrılır)
  lR1: number; // arkadaki bacak
  lR2: number;
}

export const LEN = { torso: 34, neck: 5, head: 10, ua: 16, fa: 15, th: 22, sh: 22 };
/** Ayakta dururken kalçadan yere mesafe (yaklaşık). */
export const HIP_H = 42;

export const rad = (d: number) => (d * Math.PI) / 180;
export const down = (a: number) => ({ x: Math.sin(rad(a)), y: Math.cos(rad(a)) });
export const add = (p: { x: number; y: number }, d: { x: number; y: number }, k: number) => ({ x: p.x + d.x * k, y: p.y + d.y * k });

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
}

/** İleri kinematik: eklem noktaları (kalça merkezi 0,0). */
export function joints(p: Pose) {
  const td = { x: Math.sin(rad(p.torso)), y: -Math.cos(rad(p.torso)) };
  const perp = { x: Math.cos(rad(p.torso)), y: Math.sin(rad(p.torso)) };
  const pelvis = { x: 0, y: 0 };
  const neck = add(pelvis, td, LEN.torso);
  const hd = { x: Math.sin(rad(p.torso + p.head)), y: -Math.cos(rad(p.torso + p.head)) };
  const head = add(neck, hd, LEN.neck + LEN.head);
  const shL = add(add(neck, td, -4), perp, 2.5);
  const shR = add(add(neck, td, -4), perp, -2.5);
  const elL = add(shL, down(p.aL1), LEN.ua);
  const wrL = add(elL, down(p.aL1 + p.aL2), LEN.fa);
  const elR = add(shR, down(p.aR1), LEN.ua);
  const wrR = add(elR, down(p.aR1 + p.aR2), LEN.fa);
  const hipL = add(pelvis, perp, 3);
  const hipR = add(pelvis, perp, -3);
  const knL = add(hipL, down(p.lL1), LEN.th);
  const anL = add(knL, down(p.lL1 - p.lL2), LEN.sh);
  const knR = add(hipR, down(p.lR1), LEN.th);
  const anR = add(knR, down(p.lR1 - p.lR2), LEN.sh);
  return { td, perp, pelvis, neck, head, shL, shR, elL, wrL, elR, wrR, hipL, hipR, knL, anL, knR, anR };
}

// ---------- Poz kütüphanesi ----------

const P = (o: Partial<Pose>): Pose => ({ x: 0, y: 0, rot: 0, torso: 8, head: 4, aL1: 38, aL2: 112, aR1: 22, aR2: 135, lL1: 18, lL2: 12, lR1: -18, lR2: 14, ...o });

export const POSES = {
  stance: P({}),
  stanceLow: P({ torso: 12, y: 2, lL2: 22, lR2: 24 }),
  jab: P({ torso: 14, aL1: 90, aL2: 2, x: 6 }),
  cross: P({ torso: 22, aR1: 90, aR2: 2, aL1: 30, aL2: 120, x: 8 }),
  hook: P({ torso: 18, aL1: 100, aL2: 80, x: 6 }),
  upper: P({ torso: 20, y: 3, aR1: 40, aR2: 135, lL2: 26, lR2: 26, x: 5 }),
  elbow: P({ torso: 22, aL1: 115, aL2: 150, x: 8 }),
  lowKick: P({ torso: -6, lR1: 55, lR2: -5, aL1: 30, aR1: 10, aR2: 150 }),
  bodyKick: P({ torso: -14, lR1: 85, lR2: 0, aL1: 60, aL2: 100, aR1: -20, aR2: 30 }),
  headKick: P({ torso: -26, lR1: 125, lR2: -10, aL1: 70, aL2: 90, aR1: -30, aR2: 20 }),
  knee: P({ torso: 18, lR1: 95, lR2: 110, aL1: 85, aL2: 90, aR1: 85, aR2: 100, x: 10 }),
  spin: P({ torso: -20, rot: 0, lR1: 110, lR2: 0, aL1: -40, aL2: 20, aR1: 80, aR2: 5 }),
  shot: P({ torso: 62, y: 16, head: -10, aL1: 85, aL2: 15, aR1: 80, aR2: 20, lL1: 75, lL2: 105, lR1: -45, lR2: 5, x: 14 }),
  sprawl: P({ torso: 70, y: 5, aL1: 60, aL2: 40, aR1: 50, aR2: 50, lL1: -40, lL2: 0, lR1: -55, lR2: 0 }),
  clinch: P({ torso: 26, head: 12, aL1: 115, aL2: 70, aR1: 105, aR2: 80, x: 14 }),
  clinchHeld: P({ torso: 40, head: 20, aL1: 75, aL2: 50, aR1: 65, aR2: 60, x: 12, lL2: 20, lR2: 20 }),
  hurt: P({ torso: -12, head: -14, aL1: 10, aL2: 30, aR1: -5, aR2: 20, lL2: 30, lR2: 30, y: 4 }),
  reel: P({ torso: -24, head: -22, aL1: -20, aL2: 30, aR1: -35, aR2: 30, lL1: 10, lL2: 10, lR1: -30, lR2: 4, x: -10 }),
  // Yer
  kneelTop: P({ torso: 34, head: 16, y: HIP_H - LEN.th + 2, lL1: 90, lL2: 90, lR1: 0, lR2: 90, aL1: 70, aL2: 60, aR1: 55, aR2: 70 }),
  gnp: P({ torso: 40, head: 20, y: HIP_H - LEN.th + 2, lL1: 90, lL2: 90, lR1: 0, lR2: 90, aL1: 150, aL2: 10, aR1: 40, aR2: 40 }),
  gnpHit: P({ torso: 46, head: 22, y: HIP_H - LEN.th + 2, lL1: 90, lL2: 90, lR1: 0, lR2: 90, aL1: 60, aL2: 5, aR1: 40, aR2: 40 }),
  onBack: P({ rot: -90, y: HIP_H - 8, torso: 0, head: 10, aL1: 150, aL2: 40, aR1: 170, aR2: 30, lL1: 140, lL2: 70, lR1: 120, lR2: 80 }),
  guardUp: P({ rot: -90, y: HIP_H, torso: 0, head: 12, aL1: 120, aL2: 60, aR1: 140, aR2: 50, lL1: 160, lL2: 95, lR1: 150, lR2: 100 }),
  sitUp: P({ y: HIP_H - 11, torso: 10, head: 6, lL1: 88, lL2: 5, lR1: 84, lR2: 20, aL1: 70, aL2: 60, aR1: 40, aR2: 40 }),
  knockedOut: P({ rot: -90, y: HIP_H - 6, torso: 0, head: -20, aL1: 175, aL2: 20, aR1: 150, aR2: 10, lL1: 20, lL2: 10, lR1: 10, lR2: 30 }),
  // Submission'lar
  rncBack: P({ y: HIP_H - 22, torso: 6, head: 8, lL1: 70, lL2: 20, lR1: 80, lR2: 30, aL1: 100, aL2: 150, aR1: 90, aR2: 160 }),
  rncVictim: P({ y: HIP_H - 4, torso: -8, head: -18, lL1: 88, lL2: 5, lR1: 84, lR2: 10, aL1: 150, aL2: 40, aR1: 140, aR2: 50 }),
  armbar: P({ rot: -90, y: HIP_H, torso: 0, head: 6, aL1: 175, aL2: 0, aR1: 170, aR2: 10, lL1: 170, lL2: 5, lR1: 150, lR2: 20 }),
  armbarVictim: P({ rot: -90, y: HIP_H - 8, torso: 0, head: 14, aL1: 180, aL2: 0, aR1: 120, aR2: 60, lL1: 60, lL2: 80, lR1: 40, lR2: 90 }),
  triangle: P({ rot: -90, y: HIP_H, torso: 0, head: 10, aL1: 140, aL2: 60, aR1: 150, aR2: 50, lL1: 160, lL2: 120, lR1: 170, lR2: 100 }),
  triangleVictim: P({ torso: 78, head: 40, y: HIP_H - LEN.th + 2, lL1: 90, lL2: 90, lR1: 0, lR2: 90, aL1: 110, aL2: 20, aR1: 70, aR2: 60 }),
  guillotine: P({ torso: -12, head: 18, y: 4, aL1: 80, aL2: 125, aR1: 70, aR2: 135, lL2: 22, lR2: 22, x: 10 }),
  guillotineVictim: P({ torso: 88, head: 40, y: -3, aL1: 60, aL2: 20, aR1: 40, aR2: 30, lL1: 10, lL2: 30, lR1: -35, lR2: 10, x: 16 }),
  // Sonuç
  win: P({ torso: -4, head: -10, aL1: 172, aL2: 6, aR1: 165, aR2: 10 }),
  winHeld: P({ torso: -4, head: -8, aL1: 176, aL2: 2, aR1: 40, aR2: 110 }),
  dejected: P({ torso: 14, head: 28, aL1: 5, aL2: 10, aR1: -5, aR2: 10 }),
  touch: P({ torso: 12, aL1: 88, aL2: 4, x: 14 }),
  // Hakem
  refIdle: P({ torso: 4, head: 0, aL1: 20, aL2: 30, aR1: 10, aR2: 30, lL1: 8, lL2: 2, lR1: -8, lR2: 2 }),
  refSeparate: P({ torso: 6, aL1: 90, aL2: 10, aR1: 80, aR2: 20, lL1: 12, lR1: -12 }),
  refRaise: P({ torso: 0, head: -6, aL1: 170, aL2: 4, aR1: 10, aR2: 20, lL1: 8, lR1: -8 }),
  refBoth: P({ torso: 0, aL1: 170, aL2: 4, aR1: 170, aR2: 4 }),
  refStop: P({ torso: 20, aL1: 100, aL2: 10, aR1: 95, aR2: 15, x: 0 }),
} satisfies Record<string, Pose>;

export type PoseName = keyof typeof POSES;

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const o = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => (o[k] = a[k] + (b[k] - a[k]) * t));
  return o;
}
