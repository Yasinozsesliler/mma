import { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';
import type { Appearance } from '../engine/types';
import { octPoints } from './components';

export const SKIN_TONES = ['#f6d7c3', '#ecc0a0', '#d9a07a', '#c68a5f', '#a86b43', '#8a5534', '#6b3f24', '#4a2a17'];
export const HAIR_COLORS = ['#0f0d0c', '#2e1d12', '#5a3a22', '#8a5a2b', '#c49a55', '#e3c587', '#9a2e1f', '#b8b8b8'];
export const EYE_COLORS = ['#3b2314', '#6b4423', '#4f7a3a', '#3f6fa8', '#7a8a96', '#1d1d1d'];

export const HAIR_STYLES: { key: Appearance['sac']; ad: string }[] = [
  { key: 'kazik', ad: 'Kazıma' },
  { key: 'kisa', ad: 'Kısa' },
  { key: 'mohawk', ad: 'Mohawk' },
  { key: 'uzun', ad: 'Uzun' },
  { key: 'topuz', ad: 'Topuz' },
  { key: 'afro', ad: 'Afro' },
  { key: 'orgu', ad: 'Örgü' },
  { key: 'kel', ad: 'Kel' },
];
export const BEARDS: { key: Appearance['sakal']; ad: string }[] = [
  { key: 'yok', ad: 'Yok' },
  { key: 'kirli', ad: 'Kirli sakal' },
  { key: 'tam', ad: 'Gür sakal' },
  { key: 'keci', ad: 'Keçi sakalı' },
  { key: 'biyik', ad: 'Bıyık' },
];

export const DEFAULT_LOOK: Appearance = { ten: 2, sac: 'kisa', sacRenk: 0, goz: 0, sakal: 'kirli', yara: false, dovme: false };

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  const r = c(n >> 16);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** SVG dövüşçü portresi (100×100 koordinat). */
export function FighterAvatar({ look = DEFAULT_LOOK, size = 72, ring = '#e63946', bg = '#0c0d10' }: { look?: Appearance; size?: number; ring?: string; bg?: string }) {
  const skin = SKIN_TONES[look.ten] ?? SKIN_TONES[2];
  const skinD = shade(skin, -28);
  const hair = HAIR_COLORS[look.sacRenk] ?? HAIR_COLORS[0];
  const hairL = shade(hair, 25);
  const eye = EYE_COLORS[look.goz] ?? EYE_COLORS[0];
  const gid = `bg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(ring, -60)} stopOpacity={0.9} />
          <Stop offset="1" stopColor={bg} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Polygon points={octPoints(49)} fill={ring} />
      <Polygon points={octPoints(45)} fill={`url(#${gid})`} />

      {/* Afro ve topuz başın arkasında */}
      {look.sac === 'afro' ? <Circle cx={50} cy={36} r={25} fill={hair} /> : null}
      {look.sac === 'topuz' ? <Circle cx={50} cy={13} r={8} fill={hair} /> : null}
      {look.sac === 'uzun' ? <Path d="M28 34 Q26 62 31 76 L38 76 Q35 56 37 38 Z M72 34 Q74 62 69 76 L62 76 Q65 56 63 38 Z" fill={hair} /> : null}

      {/* Omuzlar ve boyun */}
      <Path d="M14 100 Q16 78 36 73 L64 73 Q84 78 86 100 Z" fill={skin} />
      <Path d="M41 62 L59 62 L60 76 Q50 80 40 76 Z" fill={skinD} />
      {look.dovme ? <Path d="M70 80 q6 -2 8 4 q-4 0 -6 4 q-2 -4 -6 -3 q2 -3 4 -5 Z M74 90 l6 -3 l1 5 Z" fill="#1b1b22" opacity={0.85} /> : null}
      <Path d="M14 100 Q16 88 24 83 L24 100 Z M86 100 Q84 88 76 83 L76 100 Z" fill="#0b0b0e" opacity={0.35} />

      {/* Kulaklar ve baş */}
      <Ellipse cx={30.5} cy={45} rx={3.6} ry={6} fill={skinD} />
      <Ellipse cx={69.5} cy={45} rx={3.6} ry={6} fill={skinD} />
      <Ellipse cx={50} cy={44} rx={19} ry={23} fill={skin} />
      <Path d="M33 50 Q35 64 50 67 Q65 64 67 50 Q64 60 50 62 Q36 60 33 50 Z" fill={skinD} opacity={0.35} />

      {/* Saç */}
      {look.sac === 'kazik' ? <Path d="M31.5 40 Q32 21 50 20 Q68 21 68.5 40 Q60 30 50 30 Q40 30 31.5 40 Z" fill={hair} opacity={0.55} /> : null}
      {look.sac === 'kisa' || look.sac === 'uzun' || look.sac === 'topuz' || look.sac === 'orgu' ? (
        <Path d="M30.5 42 Q29 18 50 17 Q71 18 69.5 42 Q66 30 58 28 Q52 32 44 29 Q35 31 30.5 42 Z" fill={hair} />
      ) : null}
      {look.sac === 'kisa' ? <Path d="M40 22 Q50 18 60 22" stroke={hairL} strokeWidth={1.2} fill="none" opacity={0.6} /> : null}
      {look.sac === 'orgu' ? (
        <G stroke={shade(hair, 35)} strokeWidth={1} opacity={0.8}>
          <Path d="M40 19 L38 36" />
          <Path d="M46 17.5 L45 34" />
          <Path d="M54 17.5 L55 34" />
          <Path d="M60 19 L62 36" />
        </G>
      ) : null}
      {look.sac === 'mohawk' ? (
        <>
          <Path d="M31.5 40 Q32 22 50 21 Q68 22 68.5 40 Q60 31 50 31 Q40 31 31.5 40 Z" fill={hair} opacity={0.35} />
          <Path d="M44 30 Q44 10 50 6 Q56 10 56 30 Q50 27 44 30 Z" fill={hair} />
        </>
      ) : null}
      {look.sac === 'afro' ? <Path d="M31 40 Q30 22 50 21 Q70 22 69 40 Q62 31 50 32 Q38 31 31 40 Z" fill={hairL} opacity={0.35} /> : null}
      {look.sac === 'kel' ? <Ellipse cx={43} cy={27} rx={6} ry={3} fill="#ffffff" opacity={0.18} /> : null}

      {/* Kaşlar */}
      <Path d="M38 38.5 Q42 36 46.5 38" stroke={look.sac === 'kel' ? '#2a1a10' : hair} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Path d="M53.5 38 Q58 36 62 38.5" stroke={look.sac === 'kel' ? '#2a1a10' : hair} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      {look.yara ? <Path d="M57 33 L61 43" stroke="#b5485a" strokeWidth={1.4} strokeLinecap="round" opacity={0.9} /> : null}

      {/* Gözler */}
      <Ellipse cx={42.5} cy={44} rx={4} ry={2.6} fill="#f4f1ea" />
      <Ellipse cx={57.5} cy={44} rx={4} ry={2.6} fill="#f4f1ea" />
      <Circle cx={42.8} cy={44.2} r={1.9} fill={eye} />
      <Circle cx={57.2} cy={44.2} r={1.9} fill={eye} />
      <Circle cx={42.8} cy={44.2} r={0.8} fill="#050505" />
      <Circle cx={57.2} cy={44.2} r={0.8} fill="#050505" />

      {/* Burun ve ağız */}
      <Path d="M50 46 L47.6 53.5 Q50 55 52.4 53.5" stroke={skinD} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      <Path d="M45 59 Q50 60.5 55 59" stroke={shade(skin, -60)} strokeWidth={1.6} fill="none" strokeLinecap="round" />

      {/* Sakal */}
      {look.sakal === 'kirli' ? <Path d="M33 50 Q34 65 50 67.5 Q66 65 67 50 Q64 61 56 62 Q50 64.5 44 62 Q36 61 33 50 Z" fill={hair} opacity={0.35} /> : null}
      {look.sakal === 'tam' ? <Path d="M32 48 Q32 70 50 72 Q68 70 68 48 Q66 58 58 60.5 Q50 57 42 60.5 Q34 58 32 48 Z M44 58 Q50 56 56 58 Q54 57 50 57.5 Q46 57 44 58 Z" fill={hair} /> : null}
      {look.sakal === 'keci' ? <Path d="M45 60.5 Q50 70 55 60.5 Q52 62 50 62 Q48 62 45 60.5 Z M45.5 57.5 Q50 56 54.5 57.5 L54 58.4 Q50 57.3 46 58.4 Z" fill={hair} /> : null}
      {look.sakal === 'biyik' ? <Path d="M43.5 57.8 Q50 54.5 56.5 57.8 Q50 56.8 43.5 57.8 Z" fill={hair} stroke={hair} strokeWidth={1.3} /> : null}

    </Svg>
  );
}
