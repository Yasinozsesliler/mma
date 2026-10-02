import { L as tL } from '../i18n';
import { memo, useId } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Stop } from 'react-native-svg';
import type { Appearance } from '../engine/types';
import { octPoints } from './components';

export const SKIN_TONES = ['#f6d7c3', '#ecc0a0', '#d9a07a', '#c68a5f', '#a86b43', '#8a5534', '#6b3f24', '#4a2a17'];
export const HAIR_COLORS = ['#0f0d0c', '#2e1d12', '#5a3a22', '#8a5a2b', '#c49a55', '#e3c587', '#9a2e1f', '#b8b8b8'];
export const EYE_COLORS = ['#3b2314', '#6b4423', '#4f7a3a', '#3f6fa8', '#7a8a96', '#1d1d1d'];

export const HAIR_STYLES: { key: Appearance['sac']; ad: string }[] = [
  { key: 'kazik', ad: tL("Kazıma") },
  { key: 'kisa', ad: tL("Kısa") },
  { key: 'mohawk', ad: tL("Mohawk") },
  { key: 'uzun', ad: tL("Uzun") },
  { key: 'topuz', ad: tL("Topuz") },
  { key: 'afro', ad: tL("Afro") },
  { key: 'orgu', ad: tL("Örgü") },
  { key: 'kel', ad: tL("Kel") },
  { key: 'atkuyrugu', ad: tL("At kuyruğu") },
];
export const BEARDS: { key: Appearance['sakal']; ad: string }[] = [
  { key: 'yok', ad: tL("Yok") },
  { key: 'kirli', ad: tL("Kirli sakal") },
  { key: 'tam', ad: tL("Gür sakal") },
  { key: 'keci', ad: tL("Keçi sakalı") },
  { key: 'biyik', ad: tL("Bıyık") },
];

export const FACE_SHAPES = [
  { key: '0', ad: tL("Oval") },
  { key: '1', ad: tL("Köşeli") },
  { key: '2', ad: tL("Yuvarlak") },
  { key: '3', ad: tL("Uzun") },
  { key: '4', ad: tL("Üçgen") },
];
export const NOSES = [
  { key: '0', ad: tL("Düz") },
  { key: '1', ad: tL("Geniş") },
  { key: '2', ad: tL("Kırık") },
  { key: '3', ad: tL("Kemerli") },
];
export const EYE_SHAPES = [
  { key: '0', ad: tL("Kısık") },
  { key: '1', ad: tL("Normal") },
  { key: '2', ad: tL("İri") },
];
export const LIPS = [
  { key: '0', ad: tL("İnce") },
  { key: '1', ad: tL("Normal") },
  { key: '2', ad: tL("Dolgun") },
];
export const BROWS = [
  { key: '0', ad: tL("İnce") },
  { key: '1', ad: tL("Normal") },
  { key: '2', ad: tL("Kalın, sert") },
];

/** Yüz hattı: [elmacık yarı genişliği, çene yarı genişliği, çene ucu y, çene köşesi keskinliği] */
const FACE_GEO: [number, number, number, number][] = [
  [19, 16.5, 68.5, 0], // oval
  [19.5, 19, 67.5, 1], // köşeli
  [20, 18, 66.5, 0], // yuvarlak
  [18, 15.5, 71, 0], // uzun
  [19.5, 13.5, 69, 0], // üçgen
];

function facePath(shape: number) {
  const [cw, jw, cy, sq] = FACE_GEO[shape] ?? FACE_GEO[0];
  const L = 50 - cw;
  const Rr = 50 + cw;
  const jy = sq ? 60 : 56.5;
  return tL("M{0} 41 Q{1} 21 50 19.5 Q{2} 21 {3} 41 Q{4} {5} {6} {7} Q{8} {9} 50 {10} Q{11} {12} {13} {14} Q{15} {16} {17} 41 Z", [L, L - 0.5, Rr + 0.5, Rr, Rr + 0.5, sq ? 56 : 50, 50 + jw, jy, 50 + jw * (sq ? 0.95 : 0.7), cy - (sq ? 1 : 2), cy, 50 - jw * (sq ? 0.95 : 0.7), cy - (sq ? 1 : 2), 50 - jw, jy, L - 0.5, sq ? 56 : 50, L]);
}

export const DEFAULT_LOOK: Appearance = { ten: 2, sac: 'kisa', sacRenk: 0, goz: 0, sakal: 'kirli', yara: false, dovme: false };

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  const r = c(n >> 16);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Kirli sakal dokusu için sabit nokta dizisi (her çizimde aynı)
const STUBBLE = Array.from({ length: 70 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180;
  const r = 3 + ((i * 7) % 15);
  return { x: 50 + Math.cos(a) * r * 1.05, y: 60 + Math.sin(a) * r * 0.45 };
}).filter((p) => p.y > 54 && Math.abs(p.x - 50) > 3.5 - (p.y - 54) * 0.3);

/** Gerçekçi SVG dövüşçü portresi (100×100 koordinat, sekizgen çerçeve). */
type AvatarProps = { look?: Appearance; size?: number; ring?: string; bg?: string };

/** Oyun durumu her dokunuşta kopyalandığı için görünüm nesnesi yeni gelir; içerik aynıysa yeniden çizilmez. */
export const FighterAvatar = memo(
  AvatarBase,
  (a: AvatarProps, b: AvatarProps) => a.size === b.size && a.ring === b.ring && a.bg === b.bg && (a.look === b.look || JSON.stringify(a.look) === JSON.stringify(b.look)),
);

function AvatarBase({ look = DEFAULT_LOOK, size = 72, ring = '#e63946', bg = '#0c0d10' }: AvatarProps) {
  const skin = SKIN_TONES[look.ten] ?? SKIN_TONES[2];
  const skinL = shade(skin, 22);
  const skinD = shade(skin, -30);
  const skinDD = shade(skin, -55);
  const hair = HAIR_COLORS[look.sacRenk] ?? HAIR_COLORS[0];
  const hairL = shade(hair, 35);
  const eye = EYE_COLORS[look.goz] ?? EYE_COLORS[0];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (n: string) => `${n}${uid}`;
  const brow = look.sac === 'kel' ? shade(skin, -90) : hair;
  // Yüz hatları: şekil, göz, burun, dudak, kaş, kulak
  const yuz = look.yuz ?? 0;
  const burun = look.burun ?? 0;
  const gs = look.gozSekil ?? 1;
  const dudak = look.dudak ?? 1;
  const kas = look.kas ?? 1;
  const FACE = facePath(yuz);
  const chinY = (FACE_GEO[yuz] ?? FACE_GEO[0])[2];
  const eyeW = [4.4, 4.2, 4.5][gs];
  const eyeH = [1.7, 2.6, 3.3][gs];
  const irisR = [1.6, 1.95, 2.25][gs];
  const browW = [1.5, 2.3, 3.3][kas];
  const browTilt = kas === 2 ? 1.6 : 0;
  const eyePath = (cx: number) => tL("M{0} 44.2 Q{1} {2} {3} 44.2 Q{4} {5} {6} 44.2 Z", [cx - eyeW, cx, 44.2 - eyeH * 1.25, cx + eyeW, cx, 44.2 + eyeH * 0.95, cx - eyeW]);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id('bg')} cx="50%" cy="32%" r="75%">
          <Stop offset="0" stopColor={shade(ring, -40)} stopOpacity={0.95} />
          <Stop offset="0.55" stopColor={shade(bg, 8)} />
          <Stop offset="1" stopColor={bg} />
        </RadialGradient>
        <RadialGradient id={id('face')} cx="44%" cy="40%" r="62%">
          <Stop offset="0" stopColor={skinL} />
          <Stop offset="0.6" stopColor={skin} />
          <Stop offset="1" stopColor={skinD} />
        </RadialGradient>
        <LinearGradient id={id('body')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={skinL} />
          <Stop offset="0.55" stopColor={skin} />
          <Stop offset="1" stopColor={skinDD} />
        </LinearGradient>
        <LinearGradient id={id('hair')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={hairL} />
          <Stop offset="1" stopColor={hair} />
        </LinearGradient>
        <RadialGradient id={id('iris')} cx="45%" cy="40%" r="60%">
          <Stop offset="0" stopColor={shade(eye, 60)} />
          <Stop offset="1" stopColor={eye} />
        </RadialGradient>
        <ClipPath id={id('clip')}>
          <Polygon points={octPoints(45)} />
        </ClipPath>
      </Defs>
      <Polygon points={octPoints(49)} fill={ring} />
      <Polygon points={octPoints(45)} fill={`url(#${id('bg')})`} />

      <G clipPath={`url(#${id('clip')})`}>
        {/* Başın arkasındaki saç kütleleri */}
        {look.sac === 'afro' ? <Circle cx={50} cy={35} r={26} fill={`url(#${id('hair')})`} /> : null}
        {look.sac === 'topuz' ? <Circle cx={50} cy={12} r={8} fill={`url(#${id('hair')})`} /> : null}
        {look.sac === 'uzun' ? <Path d="M28 34 Q25 64 31 80 L39 80 Q35 58 37 38 Z M72 34 Q75 64 69 80 L61 80 Q65 58 63 38 Z" fill={hair} /> : null}
        {look.sac === 'atkuyrugu' ? <Path d="M60 20 Q83 22 81 48 Q80 63 71 72 Q75 55 69 40 Q66 30 60 26 Z" fill={`url(#${id('hair')})`} /> : null}

        {/* Gövde: trapez, omuzlar, köprücük, göğüs */}
        <Path d="M6 100 Q8 80 26 75 Q36 72 41 66 L59 66 Q64 72 74 75 Q92 80 94 100 Z" fill={`url(#${id('body')})`} />
        <Path d="M26 75 Q36 71 41 66 L43 70 Q36 75 28 78 Z M74 75 Q64 71 59 66 L57 70 Q64 75 72 78 Z" fill={skinD} opacity={0.45} />
        {look.kadin ? (
          <>
            <Path d="M19 100 Q21 87 32 82 Q41 88.5 50 88.5 Q59 88.5 68 82 Q79 87 81 100 Z" fill="#1c1e24" />
            <Path d="M32 82.5 L37 71.5 M68 82.5 L63 71.5" stroke="#1c1e24" strokeWidth={3.2} strokeLinecap="round" />
            <Path d="M32 82 Q41 88.5 50 88.5 Q59 88.5 68 82" stroke={ring} strokeWidth={1.1} fill="none" opacity={0.7} />
          </>
        ) : (
          <>
            <Path d="M34 82 Q42 79 49 82 M51 82 Q58 79 66 82" stroke={skinL} strokeWidth={1.2} fill="none" opacity={0.7} />
            <Path d="M30 96 Q40 88 50 91 Q60 88 70 96" stroke={skinDD} strokeWidth={1} fill="none" opacity={0.45} />
            <Path d="M50 84 L50 100" stroke={skinDD} strokeWidth={0.8} opacity={0.35} />
          </>
        )}
        {look.dovme ? (
          <G fill="#16161c" opacity={0.8}>
            <Path d="M74 82 q7 -2 9 5 q-5 0 -7 5 q-2 -5 -7 -4 q2 -3 5 -6 Z" />
            <Path d="M78 93 l7 -3 l1 6 Z" />
            <Path d="M16 90 q4 -4 8 0 q-4 4 -8 0 Z" />
          </G>
        ) : null}
        {look.dovmeler?.includes('gogus') ? (
          <G fill="#16161c" opacity={0.75}>
            <Path d="M50 90 q-8 -7 -16 -3 q6 1 9 5 q3 -2 7 -2 Z M50 90 q8 -7 16 -3 q-6 1 -9 5 q-3 -2 -7 -2 Z" />
            <Path d="M50 88 l-1.5 4 l1.5 3 l1.5 -3 Z" />
          </G>
        ) : null}
        {look.dovmeler?.includes('kol') ? <Path d="M19 98 q3 -8 10 -12 M21 93 q3 -4 8 -6 M24 88 q2 -2 5 -3" stroke="#16161c" strokeWidth={1.6} fill="none" opacity={0.75} /> : null}
        {look.dovmeler?.includes('boyun') ? <Path d="M56 69 l1.5 -3 l1.5 3 l-3 -1.8 h3 Z" fill="#16161c" opacity={0.75} /> : null}
        {/* Omuz kenar ışığı */}
        <Path d="M94 100 Q92 80 74 75" stroke={ring} strokeWidth={1.4} fill="none" opacity={0.55} />

        {/* Boyun: kaslar ve gölge */}
        <Path d="M40 58 L60 58 L61.5 70 Q50 75 38.5 70 Z" fill={skin} />
        <Path d="M40 58 L60 58 L60 63 Q50 67 40 63 Z" fill={skinDD} opacity={0.5} />
        <Path d="M43 62 L46 71 M57 62 L54 71" stroke={skinD} strokeWidth={1} opacity={0.6} />

        {/* Kulaklar (dövüşçü kulağı) */}
        <Ellipse cx={30.2} cy={44} rx={look.kulak ? 4.8 : 3.8} ry={look.kulak ? 6.8 : 6.2} fill={skinD} />
        <Ellipse cx={69.8} cy={44} rx={look.kulak ? 4.8 : 3.8} ry={look.kulak ? 6.8 : 6.2} fill={skinD} />
        {look.kulak ? (
          <G fill={skinDD} opacity={0.7}>
            <Circle cx={28.6} cy={41} r={1.4} />
            <Circle cx={29} cy={45.5} r={1.6} />
            <Circle cx={71.4} cy={42} r={1.5} />
            <Circle cx={71} cy={46.5} r={1.3} />
          </G>
        ) : (
          <Path d="M30 40 q-1.6 4 0 8 M70 40 q1.6 4 0 8" stroke={skinDD} strokeWidth={1} fill="none" />
        )}

        {/* Yüz */}
        <Path d={FACE} fill={`url(#${id('face')})`} />
        {/* Elmacık ışığı, şakak ve çene gölgesi */}
        <Ellipse cx={39} cy={50} rx={4.5} ry={2.2} fill="#ffffff" opacity={0.12} />
        <Ellipse cx={61} cy={50} rx={4.5} ry={2.2} fill="#ffffff" opacity={0.08} />
        <Path d={tL("M34 57 Q38.5 {0} 50 {1} Q61.5 {2} 66 57 Q62 {3} 50 {4} Q38 {5} 34 57 Z", [chinY - 2, chinY, chinY - 2, chinY - 5, chinY - 4, chinY - 5])} fill={skinDD} opacity={0.3} />
        <Path d={tL("M49 {0} q1 -1.5 2 0", [chinY - 2])} stroke={skinDD} strokeWidth={0.7} fill="none" opacity={0.5} />
        <Path d="M69 41 Q69.5 50 66.5 56.5" stroke={ring} strokeWidth={1} fill="none" opacity={0.5} />

        {/* Saç (ön) */}
        {look.sac === 'kazik' ? <Path d="M31.5 38 Q32 21.5 50 20.5 Q68 21.5 68.5 38 Q60 29.5 50 29.5 Q40 29.5 31.5 38 Z" fill={hair} opacity={0.55} /> : null}
        {look.sac === 'kisa' || look.sac === 'uzun' || look.sac === 'topuz' || look.sac === 'orgu' || look.sac === 'atkuyrugu' ? (
          <Path d="M30.5 41 Q28.5 17.5 50 16.5 Q71.5 17.5 69.5 41 Q67 30 58.5 27.5 Q52 31.5 44 28.5 Q35 30.5 30.5 41 Z" fill={`url(#${id('hair')})`} />
        ) : null}
        {look.sac === 'kisa' || look.sac === 'uzun' ? (
          <G stroke={hairL} strokeWidth={0.8} fill="none" opacity={0.55}>
            <Path d="M38 22 Q44 19 50 21" />
            <Path d="M52 20 Q58 19 63 23" />
            <Path d="M34 30 Q38 25 43 24" />
          </G>
        ) : null}
        {look.sac === 'orgu' ? (
          <G stroke={shade(hair, 45)} strokeWidth={1} opacity={0.8}>
            <Path d="M40 19 L38 36" />
            <Path d="M46 17.5 L45 34" />
            <Path d="M54 17.5 L55 34" />
            <Path d="M60 19 L62 36" />
          </G>
        ) : null}
        {look.sac === 'mohawk' ? (
          <>
            <Path d="M31.5 39 Q32 22 50 21 Q68 22 68.5 39 Q60 30.5 50 30.5 Q40 30.5 31.5 39 Z" fill={hair} opacity={0.3} />
            <Path d="M44 30 Q44 9 50 5 Q56 9 56 30 Q50 27 44 30 Z" fill={`url(#${id('hair')})`} />
          </>
        ) : null}
        {look.sac === 'afro' ? <Path d="M31 39 Q30 21 50 20 Q70 21 69 39 Q62 30.5 50 31.5 Q38 30.5 31 39 Z" fill={hairL} opacity={0.35} /> : null}
        {look.sac === 'kel' ? <Ellipse cx={43} cy={26} rx={7} ry={3.2} fill="#ffffff" opacity={0.2} /> : null}

        {/* Kaş kemeri gölgesi ve kaşlar */}
        <Path d="M36 40.5 Q43 38 48 41 M52 41 Q57 38 64 40.5" stroke={skinDD} strokeWidth={3.2} fill="none" opacity={0.22} strokeLinecap="round" />
        <Path d={tL("M37.5 38.3 Q42 {0} 47 {1}", [35.3 + browTilt * 0.3, 37.6 + browTilt])} stroke={brow} strokeWidth={browW} strokeLinecap="round" fill="none" />
        <Path d={tL("M53 {0} Q58 {1} 62.5 38.3", [37.6 + browTilt, 35.3 + browTilt * 0.3])} stroke={brow} strokeWidth={browW} strokeLinecap="round" fill="none" />
        {look.yara ? <Path d="M57 32 L61.5 43" stroke="#b5485a" strokeWidth={1.3} strokeLinecap="round" opacity={0.85} /> : null}

        {/* Gözler: çukur, akı, iris, kapak, ışık */}
        <Ellipse cx={42.5} cy={44} rx={5.6} ry={3.6} fill={skinDD} opacity={0.2} />
        <Ellipse cx={57.5} cy={44} rx={5.6} ry={3.6} fill={skinDD} opacity={0.2} />
        <Path d={eyePath(42.5)} fill="#efe9df" />
        <Path d={eyePath(57.5)} fill="#efe9df" />
        <Circle cx={42.7} cy={44} r={irisR} fill={`url(#${id('iris')})`} />
        <Circle cx={57.3} cy={44} r={irisR} fill={`url(#${id('iris')})`} />
        <Circle cx={42.7} cy={44} r={0.85} fill="#050505" />
        <Circle cx={57.3} cy={44} r={0.85} fill="#050505" />
        <Circle cx={42.1} cy={43.3} r={0.5} fill="#ffffff" />
        <Circle cx={56.7} cy={43.3} r={0.5} fill="#ffffff" />
        <Path d={tL("M{0} 44 Q42.5 {1} {2} 44 M{3} 44 Q57.5 {4} {5} 44", [42.5 - eyeW - 0.2, 44 - eyeH * 1.3, 42.5 + eyeW + 0.2, 57.5 - eyeW - 0.2, 44 - eyeH * 1.3, 57.5 + eyeW + 0.2])} stroke={skinDD} strokeWidth={gs === 0 ? 1.5 : 1.1} fill="none" />

        {look.kadin ? (
          <Path
            d={`M${42.5 - eyeW - 0.2} 44 Q42.5 ${44 - eyeH * 1.3} ${42.5 + eyeW + 0.2} 44 M${57.5 - eyeW - 0.2} 44 Q57.5 ${44 - eyeH * 1.3} ${57.5 + eyeW + 0.2} 44 M${42.5 - eyeW - 0.2} 44 l-1.6 -1 M${57.5 + eyeW + 0.2} 44 l1.6 -1`}
            stroke="#17110e"
            strokeWidth={1.25}
            strokeLinecap="round"
            fill="none"
          />
        ) : null}

        {/* Burun */}
        {burun === 2 ? (
          <Path d="M49.5 44 L48.4 47.5 L50.2 50 L49 52.5" stroke="#ffffff" strokeWidth={1} opacity={0.2} fill="none" />
        ) : (
          <Path d="M49.2 44 L48.4 51.5" stroke="#ffffff" strokeWidth={1} opacity={0.18} />
        )}
        {burun === 3 ? (
          <Path d="M51.2 44.5 Q54.5 48 53.6 53.4" stroke={skinD} strokeWidth={1.5} fill="none" opacity={0.8} />
        ) : burun === 2 ? (
          <Path d="M51.5 45 L53 48 L51.8 50.5 L53.3 53" stroke={skinD} strokeWidth={1.2} fill="none" opacity={0.75} />
        ) : (
          <Path d="M51.5 45 Q52.8 50.5 53.3 53" stroke={skinD} strokeWidth={1.2} fill="none" opacity={0.7} />
        )}
        <Path d={burun === 1 ? tL("M45.3 53.6 Q50 57 54.7 53.6") : tL("M46.5 53.6 Q50 56.3 53.5 53.6")} stroke={skinDD} strokeWidth={1.3} fill="none" strokeLinecap="round" />
        <Ellipse cx={burun === 1 ? 47.1 : 47.8} cy={54.1} rx={burun === 1 ? 1.5 : 1.1} ry={burun === 1 ? 0.9 : 0.7} fill={skinDD} opacity={0.7} />
        <Ellipse cx={burun === 1 ? 52.9 : 52.2} cy={54.1} rx={burun === 1 ? 1.5 : 1.1} ry={burun === 1 ? 0.9 : 0.7} fill={skinDD} opacity={0.7} />

        {/* Dudaklar */}
        <Path d={tL("M{0} 59 Q47.5 {1} 50 58.8 Q52.5 {2} {3} 59 Q50 60.2 {4} 59 Z", [45 - dudak * 0.4, 58.2 - dudak * 0.4, 58.2 - dudak * 0.4, 55 + dudak * 0.4, 45 - dudak * 0.4])} fill={shade(skin, -45)} />
        <Path d={tL("M{0} 59.3 Q50 {1} {2} 59.3 Q50 60.6 {3} 59.3 Z", [45.6 - dudak * 0.3, 60.8 + dudak * 1.1, 54.4 + dudak * 0.3, 45.6 - dudak * 0.3])} fill={shade(skin, -18)} />
        {look.kadin ? <Path d={`M${45.6 - dudak * 0.3} 59.3 Q50 ${60.8 + dudak * 1.1} ${54.4 + dudak * 0.3} 59.3 Q50 60.6 ${45.6 - dudak * 0.3} 59.3 Z`} fill="#c0506a" opacity={0.35} /> : null}
        <Path d="M47.5 60.7 Q50 61.4 52.5 60.7" stroke="#ffffff" strokeWidth={0.5} opacity={0.25} fill="none" />

        {/* Sakal */}
        {!look.kadin && look.sakal === 'kirli' ? (
          <G fill={hair} opacity={0.55}>
            {STUBBLE.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={0.45} />
            ))}
            <Path d="M34 51 Q35 64 50 67.5 Q65 64 66 51 Q64 61 56 62.5 Q50 64.5 44 62.5 Q36 61 34 51 Z" opacity={0.28} />
          </G>
        ) : null}
        {!look.kadin && look.sakal === 'tam' ? (
          <>
            <Path d="M32 48 Q32 71 50 73 Q68 71 68 48 Q66 58 58 60.5 Q50 57 42 60.5 Q34 58 32 48 Z M44 57.8 Q50 55.8 56 57.8 Q54 56.8 50 57.3 Q46 56.8 44 57.8 Z" fill={`url(#${id('hair')})`} />
            <G stroke={hairL} strokeWidth={0.6} opacity={0.4}>
              <Path d="M40 64 l1 4 M46 66 l0.5 4 M54 66 l-0.5 4 M60 64 l-1 4" />
            </G>
          </>
        ) : null}
        {!look.kadin && look.sakal === 'keci' ? <Path d="M45 60.5 Q50 71 55 60.5 Q52 62 50 62 Q48 62 45 60.5 Z M45.5 57.5 Q50 56 54.5 57.5 L54 58.4 Q50 57.3 46 58.4 Z" fill={hair} /> : null}
        {!look.kadin && look.sakal === 'biyik' ? <Path d="M43.5 57.8 Q50 54.5 56.5 57.8 Q50 56.8 43.5 57.8 Z" fill={hair} stroke={hair} strokeWidth={1.3} /> : null}
      </G>
    </Svg>
  );
}
