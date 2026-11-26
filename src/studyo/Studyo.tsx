// Animasyon stüdyosu (yalnızca web, ?studyo): oyunun iskeletli dövüşçüleri ve sahne çizimleriyle hikâye sahneleri.
// Zaman dışarıdan sürülür: window.__T (sn) ve 'studyo-t' olayı; puppeteer her karede zamanı ayarlayıp ekran görüntüsü alır.
// Sahne: window.__SAHNE (SAHNELER anahtarı). Çıktı 1080×1920 (tarayıcıda 540×960 @2x).
import { Oswald_700Bold } from '@expo-google-fonts/oswald/700Bold';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Image as SvgImage, Line, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { Appearance } from '../engine/types';
import { Figure, HIP_H, lerpPose, POSES, type Kit, type Pose, type PoseName } from '../ui/rig';

const W = 1080;
const H = 1920;
const ART = {
  gym: require('../../assets/art/gym.jpg'),
  salon: require('../../assets/art/camp_salon.jpg'),
  sehir: require('../../assets/art/scene_sehir.jpg'),
  ev: require('../../assets/art/camp_ev.jpg'),
  oda: require('../../assets/art/office.jpg'),
};

// ---------- Karakterler ----------
type Kisi = { look: Appearance; kit: Kit; build: number; k: number };
const LOOK = (o: Partial<Appearance>): Appearance => ({ ten: 2, sac: 'kisa', sacRenk: 0, goz: 0, sakal: 'yok', yara: false, dovme: false, ...o });
export const KISI: Record<string, Kisi> = {
  // Can, 12 yaşında: küçük ve ince, lacivert tişört
  can: { look: LOOK({ ten: 2, sac: 'kisa', sacRenk: 1, goz: 0, yuz: 0, kas: 1 }), kit: { shorts: '#2c4f8a', trim: '#e9edf5', glove: '#000', ref: true }, build: -1.1, k: 6.4 },
  // Mert, 14: daha iri, kırmızı antrenman tişörtü, kendinden emin
  mert: { look: LOOK({ ten: 1, sac: 'yanayrik', sacRenk: 0, goz: 1, yuz: 1, kas: 2 }), kit: { shorts: '#b3262f', trim: '#ffffff', glove: '#b3262f', ust: 'rash', bare: true }, build: -0.55, k: 7.2 },
  // Antrenman kıyafetiyle (eldivenli) Can ve Mert
  canE: { look: LOOK({ ten: 2, sac: 'kisa', sacRenk: 1, goz: 0, yuz: 0, kas: 1 }), kit: { shorts: '#2c4f8a', trim: '#e9edf5', glove: '#b3262f', ust: 'rash' }, build: -1.1, k: 6.4 },
  mertE: { look: LOOK({ ten: 1, sac: 'yanayrik', sacRenk: 0, goz: 1, yuz: 1, kas: 2 }), kit: { shorts: '#b3262f', trim: '#ffffff', glove: '#1b1b1b', ust: 'rash' }, build: -0.55, k: 7.2 },
  // Can'ın annesi
  anne: { look: LOOK({ ten: 2, sac: 'topuz', sacRenk: 2, goz: 0, kadin: true, yuz: 0 }), kit: { shorts: '#6d3f5e', trim: '#ffffff', glove: '#000', ref: true }, build: 0, k: 7.3 },
  // Rıza Hoca: gri saç, bıyık, koyu eşofman
  hoca: { look: LOOK({ ten: 3, sac: 'kisa', sacRenk: 7, goz: 0, sakal: 'biyik', yuz: 1, kas: 2, burun: 2 }), kit: { shorts: '#22314d', trim: '#ffffff', glove: '#000', ref: true }, build: 0.5, k: 8.2 },
};

// ---------- Pozlar ----------
const base: Pose = POSES.stance as Pose;
const P = (o: Partial<Pose>): Pose => ({ ...base, ...o });
export const POZ: Record<string, Pose> = {
  ...(POSES as Record<PoseName, Pose>),
  dur: P({ torso: 2, head: 0, aL1: 8, aL2: 14, aR1: -6, aR2: 14, lL1: 6, lL2: 2, lR1: -6, lR2: 2 }),
  durBak: P({ torso: 0, head: -10, aL1: 8, aL2: 14, aR1: -6, aR2: 14, lL1: 6, lL2: 2, lR1: -6, lR2: 2 }),
  yuru1: P({ torso: 6, head: 0, aL1: -22, aL2: 20, aR1: 24, aR2: 24, lL1: 24, lL2: 6, lR1: -20, lR2: 26 }),
  yuru2: P({ torso: 6, head: 0, aL1: 24, aL2: 24, aR1: -22, aR2: 20, lL1: -20, lL2: 26, lR1: 24, lR2: 6 }),
  yumrukSik: P({ torso: 4, head: -4, aL1: 30, aL2: 120, aR1: 8, aR2: 14, lL1: 8, lL2: 2, lR1: -8, lR2: 2 }),
  gul: P({ torso: -10, head: -22, aL1: 30, aL2: 70, aR1: 20, aR2: 70, lL1: 8, lL2: 2, lR1: -8, lR2: 2 }),
  elBel: P({ torso: -2, head: -4, aL1: 34, aL2: -100, aR1: 30, aR2: -100, lL1: 10, lL2: 2, lR1: -10, lR2: 2 }),
  isaret: P({ torso: 2, head: -2, aL1: 92, aL2: 4, aR1: -4, aR2: 14, lL1: 8, lL2: 2, lR1: -8, lR2: 2 }),
  cagir: P({ torso: 4, head: 0, aL1: 70, aL2: 70, aR1: -4, aR2: 14, lL1: 8, lL2: 2, lR1: -8, lR2: 2 }),
  at: P({ torso: 14, head: 0, aL1: 120, aL2: 10, aR1: -10, aR2: 20, lL1: 16, lL2: 6, lR1: -12, lR2: 4, x: 4 }),
  atHazir: P({ torso: -6, head: -4, aL1: -40, aL2: 40, aR1: 0, aR2: 20, lL1: 6, lL2: 2, lR1: -10, lR2: 4 }),
  zipla: P({ y: -3, lL2: 18, lR2: 20 }),
};

// ---------- Anahtar karelerle canlandırma ----------
type Key = { t: number; p: string | Pose; o?: Partial<Pose>; X?: number; Y?: number };
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const pz = (k: Key): Pose => ({ ...(typeof k.p === 'string' ? POZ[k.p] : k.p), ...(k.o ?? {}) });
function anim(keys: Key[], t: number) {
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const u = b === a || b.t <= a.t ? 0 : ease(Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))));
  // X/Y: tanımsızsa önceki tanımlı değer
  const val = (f: 'X' | 'Y') => {
    let va = 0, vb: number | undefined;
    for (let j = i; j >= 0; j--) if (keys[j][f] != null) { va = keys[j][f]!; break; }
    vb = b[f] ?? va;
    return va + (vb - va) * u;
  };
  return { pose: lerpPose(pz(a), pz(b), u), X: val('X'), Y: val('Y') };
}
/** Yürüme döngüsü: t0..t1 arasında X0→X1, adım süresi */
export function yuru(t0: number, t1: number, X0: number, X1: number, adim = 0.32): Key[] {
  const out: Key[] = [];
  const n = Math.max(2, Math.round((t1 - t0) / adim));
  for (let i = 0; i <= n; i++) out.push({ t: t0 + ((t1 - t0) * i) / n, p: i === n ? 'dur' : i % 2 ? 'yuru1' : 'yuru2', X: X0 + ((X1 - X0) * i) / n });
  return out;
}

const FLOOR = 1560;
function Aktor({ kim, keys, t, f = 1, floor = FLOOR, ol = 1, hasar = 0 }: { kim: string; keys: Key[]; t: number; f?: 1 | -1; floor?: number; ol?: number; hasar?: number }) {
  const c = KISI[kim];
  const { pose, X, Y } = anim(keys, t);
  const k = c.k * ol;
  const gx = X + f * k * pose.x;
  const gy = floor - HIP_H * k + k * pose.y + Y;
  return (
    <G>
      <Ellipse cx={X} cy={floor + 6} rx={24 * k} ry={5 * k} fill="#000" opacity={0.3} />
      <G transform={`translate(${gx} ${gy}) scale(${f * k} ${k}) rotate(${pose.rot})`}>
        <Figure p={{ ...pose, rot: 0 }} look={c.look} kit={c.kit} build={c.build} hasar={hasar} />
      </G>
    </G>
  );
}

// Konuşurken baş sallama (konuşma aralıkları)
const kon = (t: number, ar: [number, number][]) => (ar.some(([a, b]) => t >= a && t <= b) ? Math.sin(t * 19) * 3 + Math.sin(t * 7) * 2 : 0);

// ---------- Sahne parçaları ----------
const Arka = ({ src, iw, ih, x = 0, y = 0, s = 1, dim = 0 }: { src: number; iw: number; ih: number; x?: number; y?: number; s?: number; dim?: number }) => {
  const sc = (H / ih) * s;
  const w = iw * sc;
  return (
    <G>
      <SvgImage href={src} x={(W - w) / 2 + x} y={y} width={w} height={ih * sc} preserveAspectRatio="none" />
      {dim ? <Rect x={0} y={0} width={W} height={H} fill="#000" opacity={dim} /> : null}
    </G>
  );
};

/** Ağır torba: zincirle asılı, vuruşla sallanır */
function Torba({ x, y, aci, renk = '#7a1f1f' }: { x: number; y: number; aci: number; renk?: string }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${aci})`}>
      <Line x1={0} y1={-420} x2={0} y2={0} stroke="#2a2a2a" strokeWidth={10} />
      <Rect x={-95} y={0} width={190} height={560} rx={70} fill={renk} />
      <Rect x={-95} y={0} width={60} height={560} rx={40} fill="#000" opacity={0.18} />
      <Rect x={-98} y={70} width={196} height={26} fill="#1b1b1b" opacity={0.6} />
      <Rect x={-98} y={460} width={196} height={26} fill="#1b1b1b" opacity={0.6} />
    </G>
  );
}

/** Mini kafes maçı (vitrindeki televizyonda): küçük iki figür döngüde vuruşuyor */
function TvMac({ t }: { t: number }) {
  const cyc = (t * 1.4) % 2;
  const a = cyc < 0.35 ? 'cross' : cyc < 0.7 ? 'stance' : cyc < 1.05 ? 'hook' : cyc < 1.4 ? 'stance' : cyc < 1.7 ? 'bodyKick' : 'stance';
  const b = cyc < 0.35 ? 'hurt' : cyc < 1.05 && cyc > 0.7 ? 'reel' : 'stance';
  const k = 2.1;
  const mk = (p: string, X: number, f: number, look: Appearance, kit: Kit) => (
    <G transform={`translate(${X} ${150 - HIP_H * k}) scale(${f * k} ${k})`}>
      <Figure p={POZ[p]} look={look} kit={kit} build={0.2} />
    </G>
  );
  return (
    <G>
      <Rect x={0} y={0} width={360} height={220} fill="#0d1220" />
      <Ellipse cx={180} cy={170} rx={190} ry={40} fill="#e8e8e8" opacity={0.9} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <Line key={i} x1={i * 60} y1={0} x2={i * 60} y2={170} stroke="#556" strokeWidth={2} opacity={0.6} />)}
      {mk(a, 140, 1, LOOK({ ten: 2, sac: 'kazik', sakal: 'kirli' }), { shorts: '#c0392b', trim: '#fff', glove: '#c0392b' })}
      {mk(b, 225, -1, LOOK({ ten: 5, sac: 'kel', sakal: 'tam' }), { shorts: '#1f4fbf', trim: '#fff', glove: '#1740a8' })}
      <Rect x={0} y={0} width={360} height={220} fill="url(#tvParla)" />
    </G>
  );
}

function Yagmur({ t, op = 0.35 }: { t: number; op?: number }) {
  return (
    <G opacity={op}>
      {Array.from({ length: 90 }, (_, i) => {
        const x = (i * 137.5) % W;
        const sp = 1500 + (i % 7) * 120;
        const y = ((i * 211 + t * sp) % (H + 200)) - 100;
        return <Line key={i} x1={x} y1={y} x2={x - 10} y2={y + 46} stroke="#cfe3ff" strokeWidth={3} />;
      })}
    </G>
  );
}

const Defsler = () => (
  <Defs>
    <LinearGradient id="tvParla" x1="0" y1="0" x2="1" y2="1">
      <Stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
      <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
    </LinearGradient>
    <RadialGradient id="tvIsik" cx="0.5" cy="0.5" r="0.5">
      <Stop offset="0" stopColor="#8fb4ff" stopOpacity="0.55" />
      <Stop offset="1" stopColor="#8fb4ff" stopOpacity="0" />
    </RadialGradient>
    <LinearGradient id="sabah" x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0" stopColor="#f6c48a" />
      <Stop offset="1" stopColor="#e9e0cf" />
    </LinearGradient>
    <LinearGradient id="kaldirim" x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0" stopColor="#2a2d36" />
      <Stop offset="1" stopColor="#14161b" />
    </LinearGradient>
    <RadialGradient id="spot" cx="0.5" cy="0.5" r="0.5">
      <Stop offset="0" stopColor="#ffe2a8" stopOpacity="0.5" />
      <Stop offset="1" stopColor="#ffe2a8" stopOpacity="0" />
    </RadialGradient>
  </Defs>
);

// ---------- Yazılar (altyazı, başlık, karar kartı) ----------
const fade = (t: number, a: number, b: number, f = 0.18) => Math.max(0, Math.min(1, (t - a) / f, (b - t) / f));
const RENK: Record<string, string> = { can: '#6fa8ff', mert: '#ff6b6b', hoca: '#f2c14e', anne: '#e59bd0', '': '#ffffff' };
const AD: Record<string, string> = { can: 'CAN', mert: 'MERT', hoca: 'RIZA HOCA', anne: 'ANNESİ', '': '' };
/** Altyazı: [başlangıç, bitiş, konuşan, metin] (sahne içi saniye) */
type Alt = [number, number, string, string];
function Altyazi({ t, list, y = 1330 }: { t: number; list: Alt[]; y?: number }) {
  const a = list.find(([s, e]) => t >= s - 0.05 && t <= e + 0.25);
  if (!a) return null;
  const [s, e, kim, metin] = a;
  const op = fade(t, s - 0.05, e + 0.25, 0.12);
  // satırlara böl (yaklaşık 26 karakter)
  const sat: string[] = [];
  for (const w of metin.split(' ')) {
    if (!sat.length || (sat[sat.length - 1] + ' ' + w).length > 26) sat.push(w);
    else sat[sat.length - 1] += ' ' + w;
  }
  const h = 40 + sat.length * 74 + (kim ? 50 : 0);
  return (
    <G opacity={op}>
      <Rect x={70} y={y} width={940} height={h} rx={28} fill="#0b0c10" opacity={0.78} />
      {kim ? <SvgText x={110} y={y + 62} fontFamily="Oswald_700Bold" fontSize={40} fill={RENK[kim]} letterSpacing={4}>{AD[kim]}</SvgText> : null}
      {sat.map((l, i) => (
        <SvgText key={i} x={540} y={y + (kim ? 50 : 0) + 92 + i * 74} fontFamily="Oswald_700Bold" fontSize={60} fill={kim ? '#ffffff' : '#ffe7b0'} textAnchor="middle">{l}</SvgText>
      ))}
    </G>
  );
}
function Baslik({ t, a, b, metin }: { t: number; a: number; b: number; metin: string }) {
  const op = fade(t, a, b, 0.3);
  if (!op) return null;
  return (
    <G opacity={op}>
      <Rect x={0} y={190} width={W} height={300} fill="#000" opacity={0.45} />
      <SvgText x={540} y={300} fontFamily="Oswald_700Bold" fontSize={70} fill="#e63946" textAnchor="middle" letterSpacing={30}>YOL</SvgText>
      <SvgText x={540} y={420} fontFamily="Oswald_700Bold" fontSize={96} fill="#ffffff" textAnchor="middle" letterSpacing={4}>{metin}</SvgText>
    </G>
  );
}
function KararKart({ t, a, k }: { t: number; a: number; k: [string, string][] }) {
  if (t < a) return null;
  const u = (d: number) => ease(Math.max(0, Math.min(1, (t - a - d) / 0.35)));
  const kart = (i: number, ust: string, alt: string, y: number, d: number) => (
    <G opacity={u(d)} transform={`translate(${(1 - u(d)) * -200} 0)`}>
      <Rect x={90} y={y} width={900} height={170} rx={26} fill="#15161c" stroke="#f2c14e" strokeWidth={6} />
      <Circle cx={185} cy={y + 85} r={52} fill="none" stroke="#f2c14e" strokeWidth={6} />
      <SvgText x={185} y={y + 108} fontFamily="Oswald_700Bold" fontSize={64} fill="#f2c14e" textAnchor="middle">{i}</SvgText>
      <SvgText x={270} y={y + 82} fontFamily="Oswald_700Bold" fontSize={62} fill="#ffffff" letterSpacing={2}>{ust}</SvgText>
      <SvgText x={272} y={y + 132} fontFamily="Oswald_700Bold" fontSize={34} fill="#b9b2a6" letterSpacing={1}>{alt}</SvgText>
    </G>
  );
  return (
    <G>
      <Rect x={0} y={0} width={W} height={H} fill="#000" opacity={0.5 * u(0)} />
      <G opacity={u(0)}>
        <Rect x={330} y={300} width={420} height={70} rx={14} fill="#f2c14e" />
        <SvgText x={540} y={352} fontFamily="Oswald_700Bold" fontSize={44} fill="#111" textAnchor="middle" letterSpacing={6}>KARAR ANI</SvgText>
        <SvgText x={540} y={490} fontFamily="Oswald_700Bold" fontSize={92} fill="#ffffff" textAnchor="middle">SEN OLSAN</SvgText>
        <SvgText x={540} y={600} fontFamily="Oswald_700Bold" fontSize={92} fill="#f2c14e" textAnchor="middle">NE YAPARDIN?</SvgText>
      </G>
      {kart(1, k[0][0], k[0][1], 700, 0.9)}
      {kart(2, k[1][0], k[1][1], 900, 1.5)}
    </G>
  );
}
function Son({ t, a, sonraki }: { t: number; a: number; sonraki: number }) {
  if (t < a) return null;
  const u = ease(Math.max(0, Math.min(1, (t - a) / 0.4)));
  return (
    <G opacity={u}>
      <Rect x={90} y={1120} width={900} height={150} rx={26} fill="#e63946" />
      <SvgText x={540} y={1222} fontFamily="Oswald_700Bold" fontSize={66} fill="#fff" textAnchor="middle" letterSpacing={1}>YORUMLARA YAZ: 1 Mİ, 2 Mİ?</SvgText>
      <SvgText x={540} y={1360} fontFamily="Oswald_700Bold" fontSize={46} fill="#ffe7b0" textAnchor="middle" letterSpacing={3}>{`ÇOĞUNLUK NE DERSE BÖLÜM ${sonraki} ÖYLE BAŞLAR`}</SvgText>
      <G opacity={ease(Math.max(0, Math.min(1, (t - a - 2.2) / 0.4)))}>
        <SvgText x={540} y={1450} fontFamily="Oswald_700Bold" fontSize={40} fill="#ffffff" opacity={0.85} textAnchor="middle" letterSpacing={2}>OYUNDA KARARLARI SEN VER · YOL: KAFESTEN KEMERE</SvgText>
      </G>
    </G>
  );
}
/** Atılan eldivenler (kırmızı, bağcıklı çift) */
function Eldiven({ x, y, aci }: { x: number; y: number; aci: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${aci})`}>
      <Ellipse cx={-34} cy={0} rx={44} ry={36} fill="#b3262f" />
      <Ellipse cx={-34} cy={-8} rx={30} ry={18} fill="#d1404a" />
      <Rect x={-58} y={26} width={48} height={28} rx={8} fill="#f2f2f2" />
      <Ellipse cx={40} cy={10} rx={44} ry={36} fill="#a01f28" />
      <Rect x={18} y={36} width={48} height={28} rx={8} fill="#e6e6e6" />
    </G>
  );
}

/** Salonun boks ringi: arka halatlar (figürlerden önce) ve ön halatlar (sonra) ayrı çizilir */
const RING_Y = 1470;
function RingArka() {
  return (
    <G>
      <Polygon points={`60,${RING_Y + 20} 1020,${RING_Y + 20} 900,${RING_Y - 120} 180,${RING_Y - 120}`} fill="#3d5a8a" />
      <Polygon points={`60,${RING_Y + 20} 1020,${RING_Y + 20} 1020,${RING_Y + 150} 60,${RING_Y + 150}`} fill="#1d2c4a" />
      <Rect x={60} y={RING_Y + 60} width={960} height={14} fill="#e63946" opacity={0.8} />
      {[180, 900].map((x) => <Rect key={x} x={x - 9} y={RING_Y - 560} width={18} height={440} fill="#c9c9c9" />)}
      {[0, 1, 2].map((i) => <Line key={i} x1={180} y1={RING_Y - 520 + i * 120} x2={900} y2={RING_Y - 520 + i * 120} stroke="#e63946" strokeWidth={7} />)}
    </G>
  );
}
function RingOn() {
  return (
    <G>
      {[60, 1020].map((x) => <Rect key={x} x={x - 14} y={RING_Y - 520} width={28} height={540} fill="#e5e5e5" />)}
      {[0, 1, 2].map((i) => <Line key={i} x1={60} y1={RING_Y - 440 + i * 140} x2={1020} y2={RING_Y - 440 + i * 140} stroke={i === 1 ? '#f5f5f5' : '#e63946'} strokeWidth={13} opacity={0.95} />)}
    </G>
  );
}
const flash = (t: number, a: number) => (t >= a && t < a + 0.25 ? 0.7 * (1 - (t - a) / 0.25) : 0);

// ---------- Sahneler (t: sahne içi saniye) ----------
type Sahne = (t: number) => { kam?: { x: number; y: number; s: number }; el: React.ReactNode };
const lin = (t: number, a: number, b: number, v0: number, v1: number) => v0 + (v1 - v0) * ease(Math.max(0, Math.min(1, (t - a) / (b - a))));

export const SAHNELER: Record<string, Sahne> = {
  // Karakter tanıtım/deneme
  test: (t) => ({
    el: (
      <G>
        <Arka src={ART.gym} iw={1200} ih={1000} dim={0.15} />
        <Aktor kim="can" t={t} keys={[{ t: 0, p: 'dur', X: 230 }]} />
        <Aktor kim="mert" t={t} keys={[{ t: 0, p: 'elBel', X: 560 }]} f={-1} />
        <Aktor kim="hoca" t={t} keys={[{ t: 0, p: 'isaret', X: 870 }]} f={-1} />
      </G>
    ),
  }),

  // 1) Gece, yağmur: vitrindeki televizyonda kafes maçı; Can izliyor (6.0 sn; n1 0.7'de)
  vitrin: (t) => {
    const s = lin(t, 0, 6, 1, 1.22);
    return {
      kam: { x: lin(t, 0, 6, 0, -120), y: lin(t, 0, 6, 0, -160), s },
      el: (
        <G>
          <Arka src={ART.sehir} iw={1200} ih={1000} y={-260} />
          <Rect x={420} y={560} width={760} height={1020} fill="#1b1d24" />
          <Rect x={420} y={560} width={760} height={110} fill="#2a2f3b" />
          <SvgText x={800} y={645} fontSize={64} fontFamily="Oswald_700Bold" fill="#ffcf5a" textAnchor="middle" letterSpacing={6}>ELEKTRONİK</SvgText>
          <Rect x={470} y={720} width={640} height={640} fill="#0b0d12" stroke="#3a3f4c" strokeWidth={14} />
          <Ellipse cx={790} cy={980} rx={520} ry={420} fill="url(#tvIsik)" opacity={0.7 + Math.sin(t * 9) * 0.08} />
          <G transform="translate(540 820) scale(1.4)">
            <Rect x={-14} y={-14} width={388} height={248} rx={10} fill="#111" />
            <TvMac t={t} />
          </G>
          <Rect x={640} y={1160} width={300} height={20} fill="#222" />
          <Rect x={760} y={1180} width={60} height={60} fill="#222" />
          <Rect x={470} y={720} width={640} height={640} fill="url(#tvParla)" />
          <Rect x={0} y={1560} width={W} height={360} fill="url(#kaldirim)" />
          <Rect x={0} y={1556} width={W} height={10} fill="#3c404c" />
          <Ellipse cx={600} cy={1640} rx={420} ry={40} fill="#8fb4ff" opacity={0.12 + Math.sin(t * 9) * 0.03} />
          <Aktor kim="can" t={t} keys={[{ t: 0, p: 'durBak', o: { head: -14 + Math.sin(t * 1.3) * 2 }, X: 300 }, { t: 4.4, p: 'durBak', o: { head: -16 } }, { t: 5.1, p: 'yumrukSik' }]} />
          <Yagmur t={t} />
        </G>
      ),
    };
  },

  // 2) Sabah: salonun kapısı, Can yürüyerek gelir (3.9 sn)
  kapi: (t) => ({
    kam: { x: lin(t, 0, 3.9, 60, -40), y: 0, s: 1.02 },
    el: (
      <G>
        <Rect x={-200} y={0} width={W + 400} height={H} fill="url(#sabah)" />
        <Rect x={120} y={260} width={1000} height={1300} fill="#8c4a35" />
        {Array.from({ length: 26 }, (_, r) => (
          <G key={r}>
            {Array.from({ length: 12 }, (_, c) => <Rect key={c} x={120 + c * 86 + (r % 2 ? 43 : 0)} y={262 + r * 50} width={80} height={44} fill={(r * 7 + c * 3) % 5 ? '#9a553d' : '#7f4330'} />)}
          </G>
        ))}
        <Rect x={250} y={330} width={760} height={150} fill="#16181e" />
        <SvgText x={630} y={440} fontSize={92} fontFamily="Oswald_700Bold" fill="#f2c14e" textAnchor="middle" letterSpacing={8}>RIZA BOKS</SvgText>
        <Rect x={480} y={820} width={300} height={740} fill="#2b2f38" />
        <Rect x={505} y={850} width={250} height={330} fill="#c9d6e3" opacity={0.75} />
        <Circle cx={730} cy={1230} r={14} fill="#d9b24a" />
        <Rect x={180} y={620} width={230} height={230} fill="#2f3542" />
        <Rect x={850} y={620} width={230} height={230} fill="#2f3542" />
        <Rect x={190} y={630} width={210} height={210} fill="#ffe6b5" opacity={0.55} />
        <Rect x={860} y={630} width={210} height={210} fill="#ffe6b5" opacity={0.55} />
        <Rect x={-200} y={1560} width={W + 400} height={360} fill="#bdb3a3" />
        <Rect x={-200} y={1556} width={W + 400} height={12} fill="#8d8476" />
        <Aktor kim="can" t={t} keys={[...yuru(0, 2.6, -120, 420), { t: 3.0, p: 'durBak', o: { head: -20 }, X: 420 }]} />
      </G>
    ),
  }),

  // 3) Salon: Mert torbaya vurur, Can'ı görünce güler (3.0 sn; m1 1.7'de)
  salon: (t) => {
    const vur = [0.3, 0.7, 1.1];
    const son = vur.filter((v) => t >= v).pop();
    const aci = son != null ? Math.sin((t - son) * 9) * Math.exp(-(t - son) * 3) * 9 : 0;
    return {
      kam: { x: lin(t, 0, 3, -40, 30), y: 0, s: 1.05 },
      el: (
        <G>
          <Arka src={ART.gym} iw={1200} ih={1000} dim={0.05} />
          <Torba x={760} y={560} aci={aci} />
          <Aktor kim="mert" f={1} t={t} keys={[
            { t: 0, p: 'stance', X: 560 }, { t: 0.25, p: 'jab' }, { t: 0.4, p: 'stance' }, { t: 0.62, p: 'cross' }, { t: 0.78, p: 'stance' }, { t: 1.02, p: 'hook' }, { t: 1.2, p: 'stance' },
            { t: 1.45, p: 'dur' }, { t: 1.75, p: 'gul' }, { t: 2.9, p: 'gul', o: { torso: -14, head: -26 } },
          ]} />
          <Aktor kim="can" t={t} keys={[{ t: 0, p: 'dur', X: 130 }, { t: 2, p: 'dur', o: { head: 10 } }]} />
        </G>
      ),
    };
  },

  // 4) Rıza Hoca gelir: Mert'i susturur, Can'ı çağırır (3.0 sn; h1 0.25'te)
  hoca: (t) => ({
    kam: { x: lin(t, 0, 3, 40, -20), y: 0, s: 1.04 },
    el: (
      <G>
        <Arka src={ART.gym} iw={1200} ih={1000} dim={0.05} />
        <Torba x={760} y={560} aci={0} />
        <Aktor kim="can" t={t} keys={[{ t: 0, p: 'dur', o: { head: 10 }, X: 150 }, { t: 2.0, p: 'dur', o: { head: -4 } }]} />
        <Aktor kim="mert" f={-1} t={t} keys={[{ t: 0, p: 'gul', X: 560 }, { t: 0.9, p: 'dejected', o: { head: 10, torso: 4 } }]} />
        <Aktor kim="hoca" f={-1} t={t} keys={[...yuru(0, 0.9, 1260, 900, 0.3), { t: 1.1, p: 'isaret', o: { head: kon(t, [[0.25, 0.9]]) }, X: 900 }, { t: 1.8, p: 'cagir', o: { head: kon(t, [[1.1, 2.7]]) } }, { t: 2.4, p: 'cagir', o: { aL2: 110 } }, { t: 3, p: 'cagir', o: { aL2: 60 } }]} />
      </G>
    ),
  }),

  // 5) Can yakın plan: "Can. Bir gün şampiyon olacağım." (2.6 sn)
  can: (t) => ({
    kam: { x: 430, y: -60, s: lin(t, 0, 2.6, 1.75, 1.9) },
    el: (
      <G>
        <Arka src={ART.gym} iw={1200} ih={1000} dim={0.1} />
        <Aktor kim="can" t={t} keys={[{ t: 0, p: 'dur', o: { head: -2 }, X: 300 }, { t: 1.0, p: 'dur', o: { head: -6 } }, { t: 1.4, p: 'yumrukSik', o: { head: -8 + kon(t, [[1.3, 2.3]]) } }]} />
      </G>
    ),
  }),

  // 6) Mert eldivenleri Can'ın önüne atar, kafesi gösterir (3.1 sn; m2 0.35'te)
  meydan: (t) => {
    const u = Math.max(0, Math.min(1, (t - 0.95) / 0.5));
    const ex = 470 + (230 - 470) * u;
    const ey = 1040 + (1545 - 1040) * u - Math.sin(u * Math.PI) * 220;
    return {
      kam: { x: lin(t, 0, 3.1, 0, 40), y: lin(t, 0, 3.1, 0, 60), s: lin(t, 0, 3.1, 1.05, 1.15) },
      el: (
        <G>
          <Arka src={ART.gym} iw={1200} ih={1000} dim={0.05} />
          <Aktor kim="can" t={t} keys={[{ t: 0, p: 'dur', X: 150 }, { t: 1.4, p: 'dur', o: { head: 16, torso: 6 } }]} />
          <Aktor kim="mert" f={-1} t={t} keys={[{ t: 0, p: 'dur', X: 560 }, { t: 0.5, p: 'atHazir' }, { t: 1.0, p: 'at' }, { t: 1.5, p: 'dur' }, { t: 1.9, p: 'isaret', o: { aL1: 120, head: kon(t, [[1.6, 2.8]]) } }, { t: 3.1, p: 'isaret', o: { aL1: 124 } }]} />
          {t >= 0.95 ? <Eldiven x={ex} y={ey} aci={u * 380} /> : null}
        </G>
      ),
    };
  },

  // 7) Karar: Can kafese bakar, Mert içeride zıplar; donma, karar kartı, çağrı (15.2 sn)
  karar: (t0) => {
    const DON = 4.2;
    const t = Math.min(t0, DON);
    const zip = Math.abs(Math.sin(t * 6)) * -4;
    return {
      kam: { x: lin(t0, 0, 15.2, 0, -60), y: lin(t0, 0, 15.2, 0, -40), s: lin(t0, 0, 15.2, 1.05, 1.2) },
      el: (
        <G>
          <Arka src={ART.gym} iw={1200} ih={1000} dim={t0 > DON ? 0.2 : 0.05} />
          <Aktor kim="mert" f={-1} t={t} ol={0.82} floor={1430} keys={[{ t: 0, p: 'stance', o: { y: zip }, X: 640 }, { t: 2, p: 'stance', o: { y: zip, x: 4 } }, { t: 4.2, p: 'stance', o: { y: zip } }]} />
          <Aktor kim="can" t={t} keys={[{ t: 0, p: 'dur', o: { head: -6 }, X: 230 }, { t: 2.5, p: 'dur', o: { head: -10 } }, { t: 4.2, p: 'yumrukSik', o: { head: -10 } }]} />
          <Aktor kim="hoca" f={-1} t={t} ol={0.9} floor={1480} keys={[{ t: 0, p: 'elBel', X: 960 }]} />
        </G>
      ),
    };
  },

  // ===== BÖLÜM 2 (Ringe çık): İlk Dayak =====
  // 1) Can eldivenleri alır, Mert ringde bekler (5.6 sn; n1 0.4, m1 3.9)
  b2eldiven: (t) => {
    const ell = t >= 1.3;
    return {
      kam: { x: lin(t, 3.2, 3.9, 230, -330), y: 0, s: 1.12 },
      el: (
        <G>
          <Arka src={ART.gym} iw={1200} ih={1000} dim={0.08} />
          <G transform="translate(380 0)"><RingArka /></G>
          <Aktor kim="mertE" f={-1} t={t} floor={RING_Y} keys={[{ t: 0, p: 'stance', X: 1050 }, { t: 3.6, p: 'stance', o: { y: Math.abs(Math.sin(t * 5)) * -3 } }, { t: 4.0, p: 'elBel', o: { head: kon(t, [[3.9, 5.3]]) } }]} />
          <G transform="translate(380 0)"><RingOn /></G>
          {!ell ? <Eldiven x={300} y={1545} aci={10} /> : null}
          <Aktor kim={ell ? 'canE' : 'can'} t={t} keys={[{ t: 0, p: 'dur', X: 220 }, { t: 0.4, p: 'dur', o: { torso: 30, head: 24, aL1: 24, aR1: 14, lL1: 20, lL2: 34, lR1: -4, lR2: 30, y: 5 } }, { t: 1.2, p: 'dur', o: { torso: 30, head: 24, aL1: 24, aR1: 14, lL1: 20, lL2: 34, lR1: -4, lR2: 30, y: 5 } }, { t: 1.9, p: 'dur', o: { aL1: 60, aL2: 100, aR1: 50, aR2: 110, head: 14 } }, { t: 3.2, p: 'dur', o: { aL1: 60, aL2: 104, aR1: 52, aR2: 112, head: 16 } }, { t: 3.8, p: 'stance' }]} />
        </G>
      ),
    };
  },

  // 2) Rıza Hoca ringin ortasında: "Bir raunt." (3.2 sn; h1 0.3)
  b2hakem: (t) => ({
    kam: { x: 0, y: lin(t, 0, 3.2, 40, 0), s: lin(t, 0, 3.2, 1.08, 1.14) },
    el: (
      <G>
        <Arka src={ART.gym} iw={1200} ih={1000} dim={0.08} />
        <RingArka />
        <Aktor kim="hoca" f={1} t={t} floor={RING_Y - 40} ol={0.9} keys={[{ t: 0, p: 'refIdle', o: { head: kon(t, [[0.3, 2.8]]) }, X: 540 }, { t: 0.5, p: 'refSeparate', o: { head: kon(t, [[0.3, 2.8]]) } }, { t: 2.6, p: 'refSeparate' }, { t: 3.0, p: 'refIdle' }]} />
        <Aktor kim="canE" f={1} t={t} floor={RING_Y} keys={[{ t: 0, p: 'stance', o: { y: Math.abs(Math.sin(t * 4)) * -2 }, X: 270 }]} />
        <Aktor kim="mertE" f={-1} t={t} floor={RING_Y} keys={[{ t: 0, p: 'stance', o: { y: Math.abs(Math.sin(t * 5 + 1)) * -3 }, X: 820 }]} />
        <RingOn />
      </G>
    ),
  }),

  // 3) Dövüş: Mert oynar, kroşe, Can yere; "Herkes onun kalkmayacağını düşündü." Can kalkar; "Hâlâ kalkıyor musun?" (8.8 sn)
  b2dovus: (t) => {
    const sh = t >= 2.3 && t < 2.7 ? Math.sin(t * 80) * 14 * (1 - (t - 2.3) / 0.4) : 0;
    return {
      kam: t < 3.0 ? { x: sh, y: 0, s: 1.1 } : t < 6.6 ? { x: lin(t, 3.0, 5.4, 0, 440), y: lin(t, 3.0, 5.4, 0, -200), s: lin(t, 3.0, 5.4, 1.1, 1.4) } : { x: lin(t, 6.6, 7.3, 440, 0), y: lin(t, 6.6, 7.3, -200, 0), s: lin(t, 6.6, 7.3, 1.4, 1.1) },
      el: (
        <G>
          <Arka src={ART.gym} iw={1200} ih={1000} dim={t > 3 && t < 5.4 ? 0.3 : 0.08} />
          <RingArka />
          <Aktor kim="mertE" f={-1} t={t} floor={RING_Y} keys={[
            { t: 0, p: 'stance', X: 640 }, { t: 0.35, p: 'jab' }, { t: 0.55, p: 'stance' }, { t: 0.85, p: 'jab' }, { t: 1.05, p: 'stance' },
            { t: 1.4, p: 'sprawl', o: { torso: 30, head: 10, y: 4 } }, { t: 1.7, p: 'stance' }, { t: 2.15, p: 'hook' }, { t: 2.45, p: 'stance' },
            { t: 3.0, p: 'dur', o: { head: 16 } }, { t: 7.2, p: 'dur', o: { head: 16 } }, { t: 7.6, p: 'dur', o: { head: -6, torso: -4, aL1: 20, aR1: 10 } },
          ]} />
          <Aktor kim="canE" f={1} t={t} floor={RING_Y} hasar={t > 2.3 ? 0.5 : 0} keys={[
            { t: 0, p: 'stance', X: 420 }, { t: 0.4, p: 'hurt', o: { x: -3 } }, { t: 0.6, p: 'stance' }, { t: 0.9, p: 'hurt', o: { x: -5 } }, { t: 1.1, p: 'stance' },
            { t: 1.35, p: 'cross', o: { x: 4 } }, { t: 1.7, p: 'stance' }, { t: 2.3, p: 'reel', o: { x: -10 } }, { t: 2.6, p: 'hurt', o: { x: -16 } },
            { t: 3.0, p: 'knockedOut', o: { x: -20 } }, { t: 5.4, p: 'knockedOut', o: { x: -20 } }, { t: 6.2, p: 'sitUp', o: { x: -20 } },
            { t: 7.0, p: 'stanceLow', o: { x: -14 } }, { t: 7.4, p: 'stance', o: { x: -12 } },
          ]} />
          <RingOn />
          <Rect x={-300} y={-300} width={W + 600} height={H + 600} fill="#fff" opacity={flash(t, 2.3)} />
        </G>
      ),
    };
  },

  // 4) Can yakın plan, morarmış: "Daha gong çalmadı." (2.4 sn)
  b2kalk: (t) => ({
    kam: { x: 420, y: -40, s: lin(t, 0, 2.4, 1.8, 1.95) },
    el: (
      <G>
        <Arka src={ART.gym} iw={1200} ih={1000} dim={0.15} />
        <RingArka />
        <Aktor kim="canE" f={1} t={t} floor={RING_Y} hasar={0.6} keys={[{ t: 0, p: 'stance', o: { head: kon(t, [[0.25, 1.75]]) }, X: 300 }]} />
        <RingOn />
      </G>
    ),
  }),

  // 5) Gong; Rıza Hoca: "Yarın sabah altıda burada ol." (2.4 sn)
  b2gong: (t) => ({
    kam: { x: -40, y: 160, s: 1.25 },
    el: (
      <G>
        <Arka src={ART.gym} iw={1200} ih={1000} dim={0.1} />
        <RingArka />
        <Aktor kim="canE" f={1} t={t} floor={RING_Y} hasar={0.6} keys={[{ t: 0, p: 'dur', o: { head: 4 }, X: 360 }, { t: 1.2, p: 'dur', o: { head: -8 } }]} />
        <Aktor kim="hoca" f={-1} t={t} floor={RING_Y - 20} ol={0.95} keys={[{ t: 0, p: 'elBel', X: 700 }, { t: 0.4, p: 'elBel', o: { head: 6 + kon(t, [[0.3, 1.9]]) } }, { t: 2.4, p: 'elBel', o: { head: 8 } }]} />
        <RingOn />
      </G>
    ),
  }),

  // 6) Evde: annesi morluğu görür (4.3 sn; a1 0.3)
  b2ev: (t) => ({
    kam: { x: lin(t, 0, 4.3, 20, -20), y: 0, s: lin(t, 0, 4.3, 1.05, 1.12) },
    el: (
      <G>
        <Arka src={ART.ev} iw={1200} ih={1000} dim={0.1} />
        <Rect x={0} y={1560} width={W} height={360} fill="#2a1d14" />
        <Aktor kim="can" f={1} t={t} hasar={0.6} keys={[{ t: 0, p: 'dur', X: 280 }, { t: 1.0, p: 'dejected', o: { head: 20 } }]} />
        <Aktor kim="anne" f={-1} t={t} keys={[{ t: 0, p: 'dur', o: { head: kon(t, [[0.3, 3.9]]) }, X: 840 }, { t: 0.6, p: 'cagir', o: { aL1: 40, aL2: 90, head: kon(t, [[0.3, 3.9]]) } }, { t: 1.9, p: 'isaret', o: { aL1: 100, head: kon(t, [[0.3, 3.9]]) } }, { t: 3.9, p: 'isaret', o: { aL1: 104 } }]} />
      </G>
    ),
  }),

  // 7) Gece, odasında pencereden bakar; donma, karar (16 sn)
  b2karar: (t0) => {
    const DON = 3.6;
    const t = Math.min(t0, DON);
    return {
      kam: { x: lin(t0, 0, 16, 0, -40), y: lin(t0, 0, 16, 0, -40), s: lin(t0, 0, 16, 1.05, 1.18) },
      el: (
        <G>
          <Arka src={ART.oda} iw={1200} ih={1000} dim={t0 > DON ? 0.2 : 0.05} />
          <Aktor kim="can" f={1} t={t} hasar={0.6} keys={[{ t: 0, p: 'dur', o: { head: -10 }, X: 420 }, { t: 2.4, p: 'yumrukSik', o: { head: -12 } }]} />
        </G>
      ),
    };
  },
};

type Bolum = { baslikSahne: string; baslik: string; kararSahne: string; kararAn: number; sonAn: number; kart: [string, string][]; sonraki: number };
const BOLUMLER: Bolum[] = [
  { baslikSahne: 'b2eldiven', baslik: 'BÖLÜM 2 · İLK DAYAK', kararSahne: 'b2karar', kararAn: 3.7, sonAn: 10.35, sonraki: 3, kart: [['GİZLİCE GİT', 'Annene yalan söyle, antrenmana kaç'], ['GERÇEĞİ ANLAT', 'Onu ikna etmeye çalış']] },
  { baslikSahne: 'vitrin', baslik: 'BÖLÜM 1 · İLK GÜN', kararSahne: 'karar', kararAn: 4.3, sonAn: 9.75, sonraki: 2, kart: [['RİNGE ÇIK', 'Korkmadığını hemen göster'], ['BEKLE, ÖNCE ÖĞREN', 'Sabret, zamanı gelince çık']] },
];

const ALT_Y: Record<string, number> = { b2dovus: 230 };
const ALT: Record<string, Alt[]> = {
  b2eldiven: [[0.4, 1.96, '', 'Can eldivenleri yerden aldı.'], [2.24, 3.25, '', 'Elleri titriyordu.'], [3.9, 5.3, 'mert', 'Merak etme, yavaş vuracağım.']],
  b2hakem: [[0.3, 1.02, 'hoca', 'Bir raunt.'], [1.55, 2.81, 'hoca', 'Ben durdurmadıkça devam.']],
  b2dovus: [[3.3, 5.06, '', 'Herkes onun kalkmayacağını düşündü.'], [7.4, 8.55, 'mert', 'Hâlâ kalkıyor musun?']],
  b2kalk: [[0.25, 1.74, 'can', 'Daha gong çalmadı.']],
  b2gong: [[0.3, 1.89, 'hoca', 'Yarın sabah altıda burada ol.']],
  b2ev: [[0.3, 0.69, 'anne', 'Can!'], [0.92, 1.84, 'anne', 'Yüzüne ne oldu?'], [2.24, 3.91, 'anne', 'Bir daha o salona gitmeyeceksin!']],
  b2karar: [[0.3, 1.36, '', 'Annesi yasakladı.'], [1.58, 3.42, '', "Ama Can'ın aklı hâlâ o ringde."]],
  vitrin: [[0.7, 2.68, '', 'İstanbul. On iki yaşında bir çocuk...'], [3.25, 5.77, '', '...ve bir vitrinde, hayatını değiştirecek bir maç.']],
  kapi: [[0.25, 3.61, '', 'Ertesi sabah, mahallenin eski boks salonunun kapısındaydı.']],
  salon: [[1.7, 2.75, 'mert', 'Hocam, kreş mi açtık?']],
  hoca: [[0.25, 2.68, 'hoca', 'Kes sesini Mert. Gel evlat. Adın ne?']],
  can: [[0.25, 0.55, 'can', 'Can.'], [1.3, 2.4, 'can', 'Can. Bir gün şampiyon olacağım.']],
  meydan: [[0.35, 2.79, 'mert', 'Öyle mi? Çık o zaman ringe. Hemen şimdi.']],
  karar: [[0.3, 0.9, '', 'İlk günü.'], [1.27, 4.05, '', 'Karşısında iki yaş büyük, bir yıldır çalışan biri.']],
};

export default function Studyo() {
  const [fontOk] = useFonts({ Oswald_700Bold });
  const [t, setT] = useState<number>((globalThis as any).__T ?? 0);
  const [sahne, setSahne] = useState<string>((globalThis as any).__SAHNE ?? 'test');
  useEffect(() => {
    const on = () => {
      setT((globalThis as any).__T ?? 0);
      setSahne((globalThis as any).__SAHNE ?? 'test');
    };
    window.addEventListener('studyo-t', on);
    return () => window.removeEventListener('studyo-t', on);
  }, []);
  useEffect(() => {
    if (fontOk) (globalThis as any).__STUDYO_HAZIR = true;
  }, [fontOk]);
  const s = (SAHNELER[sahne] ?? SAHNELER.test)(t);
  const kam = s.kam ?? { x: 0, y: 0, s: 1 };
  return (
    <View style={{ width: 540, height: 960, overflow: 'hidden', backgroundColor: '#000' }}>
      <Svg width={540} height={960} viewBox={`0 0 ${W} ${H}`}>
        <Defsler />
        <G transform={`translate(${W / 2 + kam.x} ${H / 2 + kam.y}) scale(${kam.s}) translate(${-W / 2} ${-H / 2})`}>{s.el}</G>
        {BOLUMLER.map((b) => (
          <G key={b.baslikSahne}>
            {sahne === b.baslikSahne ? <Baslik t={t} a={0} b={2.4} metin={b.baslik} /> : null}
            {sahne === b.kararSahne ? <KararKart t={t} a={b.kararAn} k={b.kart} /> : null}
            {sahne === b.kararSahne ? <Son t={t} a={b.sonAn} sonraki={b.sonraki} /> : null}
          </G>
        ))}
        <Altyazi t={t} list={ALT[sahne] ?? []} y={ALT_Y[sahne] ?? 1330} />
      </Svg>
    </View>
  );
}
