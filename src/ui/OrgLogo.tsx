// Patron Modu: organizasyon logosu (renkli sekizgen ve kısa ad)
import Svg, { Polygon, Text as SvgText } from 'react-native-svg';
import type { PatronRun } from '../engine/patron';
import { octPoints } from './components';

/** Organizasyon logosu: renkli sekizgen ve kısa ad */
export function OrgLogo({ r, size = 44 }: { r: Pick<PatronRun, 'org'>; size?: number }) {
  const t = r.org.kisa.slice(0, 5);
  const dark = ['#f2c14e', '#e8e8e8', '#00b4d8'].includes(r.org.renk);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points={octPoints(48)} fill="#0b0c0f" stroke={r.org.renk} strokeWidth={6} />
      <Polygon points={octPoints(38)} fill={r.org.renk} />
      <SvgText x={50} y={50 + (t.length > 3 ? 8 : 11)} fontSize={t.length > 3 ? 22 : 30} fontWeight="bold" fill={dark ? '#111' : '#fff'} textAnchor="middle">
        {t}
      </SvgText>
    </Svg>
  );
}

