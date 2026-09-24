import { useId } from 'react';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { ORGS } from '../engine/data';
import type { OrgId, WeightClass } from '../engine/types';
import { WEIGHT_CLASSES } from '../engine/data';
import { octPoints } from './components';

/** Organizasyona göre kemer renkleri: [metal açık, metal koyu, kayış, taş]. */
const PALETTE: Record<OrgId, [string, string, string, string]> = {
  ufc: ['#ffe08a', '#b8862b', '#0b0b0c', '#d7263d'],
  pfl: ['#f0f2f5', '#8a929e', '#0e1116', '#3a86ff'],
  one: ['#ffe39a', '#c18f2a', '#5a0b10', '#f2c14e'],
  mvp: ['#ffd98a', '#9c6d1c', '#14110b', '#2ec4b6'],
  cfc: ['#e8ebf0', '#7d8591', '#3a0a0f', '#e63946'],
  oktagon: ['#ffe08a', '#b8862b', '#0a1a3a', '#e63946'],
  dwcs: ['#ffe08a', '#b8862b', '#0b0b0c', '#d7263d'],
  amator: ['#d9d9d9', '#8a8a8a', '#222', '#e63946'],
};

/** UFC tarzı şampiyonluk kemeri (300×120). */
export function Belt({ org, siklet, width = 300, dim = false }: { org: OrgId; siklet?: WeightClass; width?: number; dim?: boolean }) {
  const [hi, lo, strap, gem] = PALETTE[org];
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const g1 = `m${id}`;
  const g2 = `s${id}`;
  const plate = (x: number) => (
    <G key={x}>
      <Rect x={x} y={40} width={28} height={40} rx={5} fill={`url(#${g1})`} stroke={lo} strokeWidth={1.5} />
      <Rect x={x + 5} y={46} width={18} height={28} rx={3} fill="none" stroke={lo} strokeWidth={1} />
      <Ellipse cx={x + 14} cy={60} rx={5} ry={7} fill={gem} stroke={lo} strokeWidth={1} />
      <Ellipse cx={x + 12.5} cy={57} rx={1.6} ry={2.4} fill="#ffffff" opacity={0.6} />
    </G>
  );
  return (
    <Svg width={width} height={(width * 120) / 300} viewBox="0 0 300 120" opacity={dim ? 0.35 : 1}>
      <Defs>
        <LinearGradient id={g1} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={hi} />
          <Stop offset="0.5" stopColor={lo} />
          <Stop offset="1" stopColor={hi} />
        </LinearGradient>
        <LinearGradient id={g2} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={strap} />
          <Stop offset="0.5" stopColor="#2a2a2e" />
          <Stop offset="1" stopColor={strap} />
        </LinearGradient>
      </Defs>
      {/* Deri kayış */}
      <Rect x={4} y={36} width={292} height={48} rx={12} fill={`url(#${g2})`} />
      <Rect x={10} y={41} width={280} height={38} rx={9} fill="none" stroke={hi} strokeWidth={1} strokeDasharray="3 3" opacity={0.55} />
      {[22, 56, 216, 250].map(plate)}
      {/* Orta plaka */}
      <Path
        d="M150 4 L196 14 L214 40 L214 80 L196 106 L150 116 L104 106 L86 80 L86 40 L104 14 Z"
        fill={`url(#${g1})`}
        stroke={lo}
        strokeWidth={2}
      />
      <Path d="M150 12 L190 21 L205 43 L205 77 L190 99 L150 108 L110 99 L95 77 L95 43 L110 21 Z" fill="none" stroke={lo} strokeWidth={1.4} />
      <Polygon points={octPoints(30, 150, 60)} fill={strap} stroke={hi} strokeWidth={2.5} />
      <Polygon points={octPoints(25, 150, 60)} fill="none" stroke={gem} strokeWidth={1.2} />
      <SvgText x={150} y={58} fill={hi} fontSize={org === 'oktagon' ? 11 : 17} fontWeight="bold" textAnchor="middle" letterSpacing={1}>
        {ORGS[org].kisa}
      </SvgText>
      <SvgText x={150} y={72} fill={hi} fontSize={7} textAnchor="middle" letterSpacing={1.5}>
        {siklet ? WEIGHT_CLASSES[siklet].ad.toLocaleUpperCase('tr-TR') : 'CHAMPION'}
      </SvgText>
      <Ellipse cx={150} cy={17} rx={5} ry={4} fill={gem} />
      <Ellipse cx={150} cy={103} rx={5} ry={4} fill={gem} />
      <Ellipse cx={98} cy={60} rx={3} ry={5} fill={gem} />
      <Ellipse cx={202} cy={60} rx={3} ry={5} fill={gem} />
      <Path d="M112 22 L150 14 L188 22" stroke="#ffffff" strokeWidth={2} opacity={0.35} fill="none" />
    </Svg>
  );
}
