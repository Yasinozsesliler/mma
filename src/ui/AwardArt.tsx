// Yıl sonu ödüllerinin kupaları: her kategorinin kendi tasarımı (altın kupa, altın eldiven, gümüş kupa, kristal yıldız).
import { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { AwardCat } from '../engine/awards';

type Metal = { hi: string; mid: string; lo: string };
const GOLD: Metal = { hi: '#fff3b0', mid: '#f2c14e', lo: '#8a5d12' };
const SILVER: Metal = { hi: '#ffffff', mid: '#c5ccd6', lo: '#5f6875' };
const CRYSTAL: Metal = { hi: '#e9fbff', mid: '#8fd8ff', lo: '#2a6f99' };

/** Kaide: koyu ahşap blok ve altın plaka */
function Base({ id, plate }: { id: string; plate: string }) {
  return (
    <G>
      <Rect x={22} y={86} width={56} height={9} rx={2} fill={`url(#${id}wood)`} />
      <Rect x={28} y={77} width={44} height={10} rx={1.5} fill={`url(#${id}wood)`} />
      <Rect x={36} y={80} width={28} height={4.5} rx={1} fill={plate} opacity={0.9} />
      <Rect x={22} y={86} width={56} height={1.2} fill="#ffffff" opacity={0.12} />
    </G>
  );
}

export function AwardTrophy({ kat, size = 96 }: { kat: AwardCat; size?: number }) {
  const id = `aw${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const m = kat === 'dovus' ? SILVER : kat === 'yildiz' ? CRYSTAL : GOLD;
  const defs = (
    <Defs>
      <LinearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={m.hi} />
        <Stop offset="0.45" stopColor={m.mid} />
        <Stop offset="1" stopColor={m.lo} />
      </LinearGradient>
      <LinearGradient id={`${id}wood`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#3a2416" />
        <Stop offset="1" stopColor="#1a0f08" />
      </LinearGradient>
      <RadialGradient id={`${id}glow`} cx="50%" cy="45%" r="50%">
        <Stop offset="0" stopColor={m.mid} stopOpacity={0.45} />
        <Stop offset="1" stopColor={m.mid} stopOpacity={0} />
      </RadialGradient>
      <LinearGradient id={`${id}glove`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#ff6b74" />
        <Stop offset="1" stopColor="#8f0a17" />
      </LinearGradient>
    </Defs>
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {defs}
      <Circle cx={50} cy={44} r={44} fill={`url(#${id}glow)`} />
      {kat === 'dovuscu' ? (
        <G>
          {/* Altın kupa: kulplar, gövde, ayak, yıldız */}
          <Path d="M30 22 q-14 2 -11 16 q3 10 15 10" fill="none" stroke={`url(#${id}m)`} strokeWidth={4} />
          <Path d="M70 22 q14 2 11 16 q-3 10 -15 10" fill="none" stroke={`url(#${id}m)`} strokeWidth={4} />
          <Path d="M28 16 h44 q0 30 -22 38 q-22 -8 -22 -38 z" fill={`url(#${id}m)`} />
          <Ellipse cx={50} cy={16} rx={22} ry={4} fill={m.hi} opacity={0.7} />
          <Rect x={46} y={53} width={8} height={14} fill={`url(#${id}m)`} />
          <Path d="M38 76 q12 -10 24 0 z" fill={`url(#${id}m)`} />
          <Polygon points="50,25 53,33 61,33 55,38 57,46 50,41 43,46 45,38 39,33 47,33" fill="#fff8d6" opacity={0.85} />
          <Path d="M33 20 q2 18 10 26" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={2} fill="none" />
        </G>
      ) : kat === 'nakavt' ? (
        <G>
          {/* Kaide üzerinde altın kaplama eldiven */}
          <Rect x={42} y={58} width={16} height={19} rx={2} fill={`url(#${id}m)`} />
          <Path d="M30 40 q-2 -24 22 -26 q22 0 20 24 q-1 14 -12 20 h-18 q-11 -4 -12 -18 z" fill={`url(#${id}m)`} />
          <Ellipse cx={34} cy={40} rx={7} ry={9} fill={m.mid} stroke={m.lo} strokeWidth={0.8} />
          <Rect x={36} y={55} width={28} height={7} rx={2} fill={m.lo} />
          <Path d="M40 22 q8 -6 18 -2" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <SvgText x={50} y={44} fontSize={9} fontWeight="bold" fill={m.lo} textAnchor="middle">KO</SvgText>
        </G>
      ) : kat === 'dovus' ? (
        <G>
          {/* Gümüş kupa ve çapraz eldivenler */}
          <Path d="M34 14 h32 q0 26 -16 34 q-16 -8 -16 -34 z" fill={`url(#${id}m)`} />
          <Ellipse cx={50} cy={14} rx={16} ry={3} fill={m.hi} opacity={0.75} />
          <Rect x={47} y={47} width={6} height={18} fill={`url(#${id}m)`} />
          <Path d="M40 77 q10 -12 20 0 z" fill={`url(#${id}m)`} />
          <G transform="rotate(-28 30 56)">
            <Ellipse cx={30} cy={56} rx={9} ry={7} fill={`url(#${id}glove)`} />
            <Rect x={20} y={52} width={6} height={8} rx={1.5} fill="#f2f2f2" />
          </G>
          <G transform="rotate(28 70 56)">
            <Ellipse cx={70} cy={56} rx={9} ry={7} fill="#1f4fbf" />
            <Rect x={74} y={52} width={6} height={8} rx={1.5} fill="#f2f2f2" />
          </G>
          <Path d="M38 18 q2 14 8 22" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={1.8} fill="none" />
        </G>
      ) : (
        <G>
          {/* Kristal yıldız */}
          <Rect x={46} y={56} width={8} height={21} fill={`url(#${id}m)`} opacity={0.9} />
          <Polygon points="50,6 59,30 85,31 64,46 72,71 50,56 28,71 36,46 15,31 41,30" fill={`url(#${id}m)`} opacity={0.92} />
          <Polygon points="50,6 59,30 50,40 41,30" fill="#ffffff" opacity={0.45} />
          <Polygon points="50,40 64,46 72,71 50,56" fill={m.lo} opacity={0.35} />
          <Circle cx={44} cy={22} r={2} fill="#ffffff" opacity={0.9} />
        </G>
      )}
      <Base id={id} plate={kat === 'dovus' ? '#c5ccd6' : kat === 'yildiz' ? '#8fd8ff' : '#f2c14e'} />
    </Svg>
  );
}
