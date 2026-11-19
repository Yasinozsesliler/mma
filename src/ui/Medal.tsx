// Yeni görünüm: başarım madalyası. Kurdele (iki renkli V), metal disk (madalya renginden parlak-koyu geçiş),
// iç halka ve ortada başarımın ikonu. Kilitli madalya koyu ve kilitli; gizli olanda soru işareti.
import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop, LinearGradient as SvgGrad } from 'react-native-svg';
import { Icon, type IconName } from './components';

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt / 100) * (amt > 0 ? 255 - v : v))));
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
};

export function Medal({ color, icon, ok, hidden, size = 48 }: { color: string; icon: IconName; ok: boolean; hidden?: boolean; size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const metal = ok ? color : '#3a3d45';
  const hi = shade(metal, 55);
  const lo = shade(metal, -55);
  const W = size;
  const H = size * 1.25;
  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H} viewBox="0 0 100 125">
        <Defs>
          <RadialGradient id={`d${id}`} cx="38%" cy="34%" r="70%">
            <Stop offset="0" stopColor={hi} />
            <Stop offset="0.55" stopColor={metal} />
            <Stop offset="1" stopColor={lo} />
          </RadialGradient>
          <SvgGrad id={`r${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={ok ? '#c1121f' : '#2a2c33'} />
            <Stop offset="1" stopColor={ok ? '#7a0a14' : '#1a1b20'} />
          </SvgGrad>
          <SvgGrad id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={ok ? '#1c4fc4' : '#25272d'} />
            <Stop offset="1" stopColor={ok ? '#0d2a72' : '#17181c'} />
          </SvgGrad>
        </Defs>
        {/* kurdele */}
        <Path d="M22 0 L48 0 L60 46 L40 52 Z" fill={`url(#r${id})`} />
        <Path d="M78 0 L52 0 L40 46 L60 52 Z" fill={`url(#b${id})`} />
        {/* disk */}
        <Circle cx={50} cy={80} r={42} fill={lo} />
        <Circle cx={50} cy={78} r={41} fill={`url(#d${id})`} />
        <Circle cx={50} cy={78} r={32} fill="none" stroke={lo} strokeWidth={2.2} opacity={0.8} />
        <Circle cx={50} cy={78} r={35.5} fill="none" stroke={hi} strokeWidth={1} opacity={0.6} />
        {ok ? <Path d="M24 62 Q50 38 76 62" stroke="#ffffff" strokeWidth={3} opacity={0.35} fill="none" strokeLinecap="round" /> : null}
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: H * 0.62 - size * 0.2, alignItems: 'center' }}>
        <Icon name={hidden ? 'help' : ok ? icon : 'lock'} size={size * 0.4} color={ok ? shade(metal, -70) : '#8b919c'} />
      </View>
    </View>
  );
}
