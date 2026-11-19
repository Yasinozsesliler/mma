import { L, LOC } from '../i18n';
import { useBeltSkin } from '../cosmetics';
import { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { ORGS } from '../engine/data';
import type { OrgId, WeightClass } from '../engine/types';
import { WEIGHT_CLASSES } from '../engine/data';

/** Organizasyona göre kemer renkleri: [metal açık, metal koyu, kayış, taş, logo]. */
const PALETTE: Record<OrgId, [string, string, string, string, string]> = {
  ufc: ['#ffe9a8', '#b8862b', '#0b0b0c', '#d7263d', '#d20a0a'],
  pfl: ['#f4f6f9', '#8a929e', '#0e1116', '#3a86ff', '#1c4fc4'],
  one: ['#ffe39a', '#c18f2a', '#4a080d', '#f2c14e', '#c8102e'],
  mvp: ['#ffd98a', '#9c6d1c', '#14110b', '#2ec4b6', '#0f8a80'],
  cfc: ['#e8ebf0', '#7d8591', '#2a080c', '#e63946', '#e63946'],
  oktagon: ['#ffe08a', '#b8862b', '#0a1a3a', '#e63946', '#e63946'],
  dwcs: ['#ffe9a8', '#b8862b', '#0b0b0c', '#d7263d', '#d20a0a'],
  amator: ['#d9d9d9', '#8a8a8a', '#222', '#e63946', '#e63946'],
};

const VB_W = 300;
const VB_H = 130;

/** UCC kemerini andıran şampiyonluk kemeri: deri kayış, oymalı yan plakalar, küreli büyük orta plaka. */
export function Belt({ org, siklet, width = 300, dim = false, skin }: { org: OrgId; siklet?: WeightClass; width?: number; dim?: boolean; skin?: string[] | null }) {
  const equipped = useBeltSkin();
  const sk = skin === undefined ? equipped : skin;
  const [hi, lo, strap, gem] = sk ?? PALETTE[org];
  const logo = PALETTE[org][4];
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gold = `g${id}`;
  const goldH = `h${id}`;
  const leather = `l${id}`;
  const globe = `o${id}`;
  const cx = 150;
  const cy = 64;
  // Kurdele yazısı kurdelenin içine sığacak kadar küçülür (uzun sıklet adları ve diğer diller için).
  const ribbonText = L("WORLD CHAMPION{0}", [siklet ? ' · ' + WEIGHT_CLASSES[siklet].ad.toLocaleUpperCase(LOC) : '']);
  const ribbonFs = Math.max(3.6, Math.min(6.5, 82 / (ribbonText.length * 0.82)));
  const ribbon = { text: ribbonText, fs: ribbonFs, ls: ribbonFs * 0.12 };

  /** Yan plaka: eğimli altın levha, oyma çerçeve, ortada taş ve dört perçin. */
  const sidePlate = (x: number, w: number) => (
    <G key={x}>
      <Rect x={x} y={38} width={w} height={52} rx={6} fill={`url(#${gold})`} stroke={lo} strokeWidth={1.4} />
      <Rect x={x + 4} y={42} width={w - 8} height={44} rx={4} fill="none" stroke={lo} strokeWidth={0.9} />
      <Path d={L("M{0} {1} Q{2} {3} {4} {5}", [x + 8, 50, x + w / 2, 44, x + w - 8, 50])} stroke={lo} strokeWidth={0.8} fill="none" />
      <Path d={L("M{0} {1} Q{2} {3} {4} {5}", [x + 8, 78, x + w / 2, 84, x + w - 8, 78])} stroke={lo} strokeWidth={0.8} fill="none" />
      <Circle cx={x + w / 2} cy={64} r={6.5} fill={strap} stroke={lo} strokeWidth={1} />
      <Circle cx={x + w / 2} cy={64} r={4.2} fill={gem} />
      <Ellipse cx={x + w / 2 - 1.3} cy={62.5} rx={1.3} ry={1.6} fill="#fff" opacity={0.7} />
      {[
        [x + 7, 46],
        [x + w - 7, 46],
        [x + 7, 82],
        [x + w - 7, 82],
      ].map(([px, py]) => (
        <Circle key={`${px}-${py}`} cx={px} cy={py} r={1.6} fill={hi} stroke={lo} strokeWidth={0.5} />
      ))}
    </G>
  );

  // Orta plakanın kenarındaki boncuk dizisi
  const beads = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    return <Circle key={i} cx={cx + Math.cos(a) * 66} cy={cy + Math.sin(a) * 58} r={2.3} fill={hi} stroke={lo} strokeWidth={0.5} />;
  });

  return (
    <Svg width={width} height={(width * VB_H) / VB_W} viewBox={`0 0 ${VB_W} ${VB_H}`} opacity={dim ? 0.35 : 1}>
      <Defs>
        <LinearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={hi} />
          <Stop offset="0.45" stopColor={lo} />
          <Stop offset="0.55" stopColor={lo} />
          <Stop offset="1" stopColor={hi} />
        </LinearGradient>
        <LinearGradient id={goldH} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={hi} />
          <Stop offset="0.5" stopColor={lo} />
          <Stop offset="1" stopColor={hi} />
        </LinearGradient>
        <LinearGradient id={leather} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2a2a2e" />
          <Stop offset="0.5" stopColor={strap} />
          <Stop offset="1" stopColor="#2a2a2e" />
        </LinearGradient>
        <RadialGradient id={globe} cx="42%" cy="38%" r="65%">
          <Stop offset="0" stopColor={hi} />
          <Stop offset="0.7" stopColor={lo} />
          <Stop offset="1" stopColor="#6b4a12" />
        </RadialGradient>
      </Defs>

      {/* Deri kayış ve altın dikiş rayları */}
      <Rect x={2} y={34} width={296} height={60} rx={14} fill={`url(#${leather})`} />
      <Rect x={8} y={39} width={284} height={50} rx={10} fill="none" stroke={hi} strokeWidth={0.9} strokeDasharray="3 2.5" opacity={0.7} />
      {[16, 284].map((x) => (
        <G key={x}>
          <Circle cx={x} cy={52} r={2.2} fill="#111" stroke={lo} strokeWidth={0.8} />
          <Circle cx={x} cy={76} r={2.2} fill="#111" stroke={lo} strokeWidth={0.8} />
        </G>
      ))}

      {/* Yan plakalar */}
      {sidePlate(24, 30)}
      {sidePlate(58, 26)}
      {sidePlate(216, 26)}
      {sidePlate(246, 30)}

      {/* Orta plaka: boncuklu kenar, eğimli altın gövde */}
      <Ellipse cx={cx} cy={cy} rx={70} ry={62} fill={`url(#${goldH})`} stroke={lo} strokeWidth={2} />
      {beads}
      <Ellipse cx={cx} cy={cy} rx={60} ry={52} fill={`url(#${gold})`} stroke={lo} strokeWidth={1.4} />
      <Ellipse cx={cx} cy={cy} rx={55} ry={47} fill="none" stroke={hi} strokeWidth={0.8} opacity={0.8} />

      {/* Yanlarda kırmızı taşlar */}
      {[cx - 64, cx + 64].map((x) => (
        <G key={x}>
          <Ellipse cx={x} cy={cy} rx={5} ry={7.5} fill={gem} stroke={lo} strokeWidth={1} />
          <Ellipse cx={x - 1.4} cy={cy - 2.5} rx={1.4} ry={2.2} fill="#fff" opacity={0.6} />
        </G>
      ))}

      {/* Dünya küresi */}
      <Circle cx={cx} cy={cy + 4} r={30} fill={`url(#${globe})`} stroke={lo} strokeWidth={1.4} />
      {[-18, -6, 6, 18].map((dy) => (
        <Ellipse key={dy} cx={cx} cy={cy + 4 + dy} rx={Math.sqrt(900 - dy * dy)} ry={2.5} fill="none" stroke={lo} strokeWidth={0.7} opacity={0.75} />
      ))}
      {[10, 20].map((rx) => (
        <Ellipse key={rx} cx={cx} cy={cy + 4} rx={rx} ry={30} fill="none" stroke={lo} strokeWidth={0.7} opacity={0.75} />
      ))}
      <Path d={L("M{0} {1} L{2} {3}", [cx, cy - 26, cx, cy + 34])} stroke={lo} strokeWidth={0.7} opacity={0.75} />
      <Path d={L("M{0} {1} q10 -6 18 2 q6 8 -4 14 q-10 2 -14 -6 z", [cx - 16, cy - 10])} fill={lo} opacity={0.5} />
      <Path d={L("M{0} {1} q10 -4 14 4 q-4 10 -14 8 z", [cx + 4, cy + 12])} fill={lo} opacity={0.5} />

      {/* Üstte logo plakası */}
      <Rect x={cx - 34} y={cy - 54} width={68} height={24} rx={6} fill="#0b0b0c" stroke={hi} strokeWidth={1.6} />
      <SvgText x={cx} y={cy - 36} fill={logo} fontSize={org === 'oktagon' ? 11 : 17} fontWeight="bold" fontStyle="italic" textAnchor="middle" letterSpacing={1}>
        {ORGS[org].kisa}
      </SvgText>

      {/* Altta kurdele */}
      <Path d={L("M{0} {1} L{2} {3} L{4} {5} L{6} {7} Z", [cx - 52, cy + 36, cx + 52, cy + 36, cx + 46, cy + 50, cx - 46, cy + 50])} fill="#0b0b0c" stroke={hi} strokeWidth={1.2} />
      <SvgText x={cx + ribbon.ls / 2} y={cy + 43 + ribbon.fs * 0.36} fill={hi} fontSize={ribbon.fs} fontWeight="bold" textAnchor="middle" letterSpacing={ribbon.ls}>
        {ribbon.text}
      </SvgText>

      {/* Parlama */}
      <Path d={L("M{0} {1} Q{2} {3} {4} {5}", [cx - 44, cy - 38, cx, cy - 58, cx + 44, cy - 38])} stroke="#ffffff" strokeWidth={2.4} opacity={0.3} fill="none" />
    </Svg>
  );
}
