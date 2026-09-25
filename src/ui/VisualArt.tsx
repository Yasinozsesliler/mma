import { L } from '../i18n';
import { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
}

function Wheel({ x, y, r = 11 }: { x: number; y: number; r?: number }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={r} fill="#111" />
      <Circle cx={x} cy={y} r={r * 0.62} fill="#9aa1ad" />
      <Circle cx={x} cy={y} r={r * 0.25} fill="#2a2e37" />
      {[0, 72, 144, 216, 288].map((a) => (
        <Path key={a} d={L("M{0} {1} L{2} {3}", [x, y, x + Math.cos((a * Math.PI) / 180) * r * 0.58, y + Math.sin((a * Math.PI) / 180) * r * 0.58])} stroke="#2a2e37" strokeWidth={1.4} />
      ))}
    </G>
  );
}

/** Araba gövde şekilleri (200×100 alanda, yan görünüm). */
const BODIES: Record<string, { body: string; glass: string; wheels: [number, number]; low?: boolean }> = {
  hatch: { body: L("M18 72 L22 56 Q28 50 40 48 L64 36 Q72 32 92 32 L128 32 Q140 32 146 42 L150 50 L176 54 Q186 56 186 64 L186 74 Z"), glass: L("M70 38 Q76 35 92 35 L124 35 Q134 35 140 44 L142 48 L66 48 Z"), wheels: [50, 152] },
  sedan: { body: L("M10 72 L14 58 Q18 52 34 50 L62 36 Q70 32 88 32 L120 32 Q136 32 148 44 L154 50 L180 53 Q192 55 192 64 L192 74 Z"), glass: L("M68 38 Q74 35 90 35 L118 35 Q130 35 142 46 L64 48 Z"), wheels: [46, 160] },
  suv: { body: L("M12 76 L14 50 Q16 42 28 40 L50 26 Q56 22 70 22 L140 22 Q152 22 156 32 L164 44 L184 48 Q194 50 194 60 L194 78 Z"), glass: L("M56 28 Q60 25 70 25 L138 25 Q148 25 152 34 L156 42 L52 42 Z"), wheels: [48, 160] },
  muscle: { body: L("M8 72 L10 60 Q12 54 30 52 L70 42 Q78 38 94 38 L118 38 Q130 38 140 46 L148 52 L186 56 Q196 58 196 66 L196 74 Z"), glass: L("M78 43 Q84 40 96 40 L116 40 Q126 40 134 48 L76 50 Z"), wheels: [44, 162], low: true },
  electric: { body: L("M10 72 L14 60 Q18 52 34 50 L66 36 Q76 30 96 30 L122 30 Q140 30 156 46 L186 52 Q194 54 194 64 L194 74 Z"), glass: L("M72 37 Q80 33 96 33 L122 33 Q136 33 148 46 L68 49 Z"), wheels: [46, 160] },
  super: { body: L("M6 72 L10 64 Q16 56 40 54 L84 40 Q96 34 112 34 L126 34 Q140 36 156 48 L190 56 Q198 58 198 66 L198 72 Z"), glass: L("M90 41 Q100 37 112 37 L126 37 Q136 39 146 48 L86 50 Z"), wheels: [46, 164], low: true },
  hyper: { body: L("M4 72 L8 66 Q16 58 42 56 L90 38 Q104 32 118 32 L130 32 Q146 36 164 50 L194 58 Q200 60 200 68 L200 72 Z"), glass: L("M96 39 Q106 35 118 35 L130 35 Q142 38 152 48 L92 50 Z"), wheels: [46, 166], low: true },
};

export function CarArt({ model, color = '#e63946', width = 200 }: { model: string; color?: string; width?: number }) {
  const b = BODIES[model] ?? BODIES.sedan;
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const wy = b.low ? 74 : 76;
  return (
    <Svg width={width} height={width / 2} viewBox="0 0 200 100">
      <Defs>
        <LinearGradient id={`c${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(color, 40)} />
          <Stop offset="0.55" stopColor={color} />
          <Stop offset="1" stopColor={shade(color, -50)} />
        </LinearGradient>
      </Defs>
      <Ellipse cx={100} cy={88} rx={92} ry={6} fill="#000" opacity={0.45} />
      <Path d={b.body} fill={`url(#c${id})`} stroke={shade(color, -70)} strokeWidth={1} />
      <Path d={b.glass} fill="#1c2733" opacity={0.92} />
      <Path d={b.glass} fill="#8fb3d9" opacity={0.18} />
      {model === 'hyper' || model === 'super' ? <Path d="M120 56 L176 60" stroke={shade(color, 60)} strokeWidth={1.2} opacity={0.6} /> : <Path d="M60 58 L170 58" stroke={shade(color, -40)} strokeWidth={1} opacity={0.6} />}
      {model === 'hyper' ? <Path d="M150 40 L176 38 L178 42 L152 46 Z" fill="#e63946" /> : null}
      {model === 'muscle' ? <Rect x={96} y={38} width={10} height={36} fill="#fff" opacity={0.85} /> : null}
      <Rect x={184} y={60} width={10} height={5} rx={2} fill="#ffe7a3" />
      <Rect x={8} y={62} width={7} height={5} rx={2} fill="#e63946" />
      <Wheel x={b.wheels[0]} y={wy} r={b.low ? 11 : 12} />
      <Wheel x={b.wheels[1]} y={wy} r={b.low ? 11 : 12} />
    </Svg>
  );
}

function Windows({ x, y, cols, rows, w = 10, h = 12, gx = 6, gy = 6, lit = 0.6 }: { x: number; y: number; cols: number; rows: number; w?: number; h?: number; gx?: number; gy?: number; lit?: number }) {
  const out = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const on = ((r * 7 + c * 13) % 10) / 10 < lit;
      out.push(<Rect key={`${r}-${c}`} x={x + c * (w + gx)} y={y + r * (h + gy)} width={w} height={h} fill={on ? '#ffd98a' : '#233044'} />);
    }
  return <G>{out}</G>;
}

/** Ev görselleri (200×120 alan, gece manzarası). */
export function HouseArt({ model, width = 200 }: { model: string; width?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const sky = (
    <>
      <Defs>
        <LinearGradient id={`k${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0b1430" />
          <Stop offset="1" stopColor="#1a2340" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={200} height={120} rx={8} fill={`url(#k${id})`} />
      <Circle cx={168} cy={22} r={9} fill="#f4f1ea" opacity={0.9} />
      <Rect x={0} y={104} width={200} height={16} fill="#101a12" />
    </>
  );
  let art;
  switch (model) {
    case 'flat':
      art = (
        <>
          <Rect x={50} y={30} width={100} height={76} fill="#5a4a42" />
          <Windows x={60} y={38} cols={5} rows={3} w={10} h={12} gx={9} gy={8} lit={0.3} />
          <Rect x={92} y={90} width={16} height={16} fill="#2a1d18" />
        </>
      );
      break;
    case 'loft':
      art = (
        <>
          <Rect x={40} y={40} width={120} height={66} fill="#8a3b2e" />
          <Path d="M40 40 L160 40 L160 36 L40 36 Z" fill="#5a2a22" />
          <Windows x={50} y={50} cols={4} rows={2} w={20} h={18} gx={8} gy={10} lit={0.7} />
        </>
      );
      break;
    case 'apartment':
      art = (
        <>
          <Rect x={30} y={20} width={60} height={86} fill="#3b4252" />
          <Rect x={100} y={34} width={70} height={72} fill="#4c566a" />
          <Windows x={38} y={28} cols={3} rows={5} w={10} h={10} gx={8} gy={6} lit={0.5} />
          <Windows x={108} y={42} cols={4} rows={4} w={10} h={10} gx={6} gy={6} lit={0.6} />
        </>
      );
      break;
    case 'house':
      art = (
        <>
          <Rect x={10} y={96} width={180} height={10} fill="#2d6a4f" />
          <Rect x={50} y={56} width={100} height={50} fill="#e9dcc9" />
          <Polygon points="40,58 100,24 160,58" fill="#9d3c2c" />
          <Rect x={62} y={70} width={20} height={16} fill="#ffd98a" />
          <Rect x={118} y={70} width={20} height={16} fill="#ffd98a" />
          <Rect x={92} y={80} width={16} height={26} fill="#5a3a22" />
          <Circle cx={24} cy={86} r={12} fill="#1b4332" />
          <Circle cx={176} cy={84} r={14} fill="#1b4332" />
        </>
      );
      break;
    case 'bungalow':
      art = (
        <>
          <Rect x={0} y={96} width={200} height={24} fill="#1d4e89" />
          <Rect x={0} y={92} width={200} height={6} fill="#e9d8a6" />
          <Rect x={46} y={60} width={108} height={34} fill="#c8a27a" />
          <Polygon points="36,62 100,36 164,62" fill="#6b4f2c" />
          <Rect x={60} y={70} width={24} height={16} fill="#ffd98a" />
          <Rect x={116} y={70} width={24} height={16} fill="#ffd98a" />
          <Path d="M178 92 Q176 70 184 56 M184 56 Q170 52 164 58 M184 56 Q196 50 200 58" stroke="#2d6a4f" strokeWidth={3} fill="none" />
        </>
      );
      break;
    case 'villa':
      art = (
        <>
          <Rect x={20} y={40} width={160} height={52} fill="#f4f1ea" />
          <Rect x={20} y={36} width={160} height={6} fill="#b8b8b8" />
          <Rect x={100} y={20} width={70} height={20} fill="#f4f1ea" />
          <Windows x={30} y={50} cols={5} rows={2} w={22} h={14} gx={8} gy={6} lit={0.8} />
          <Rect x={30} y={96} width={140} height={10} rx={3} fill="#3fb6d9" />
          <Rect x={30} y={96} width={140} height={3} fill="#9be3f5" opacity={0.7} />
        </>
      );
      break;
    case 'penthouse':
      art = (
        <>
          <Rect x={60} y={6} width={80} height={100} fill="#1f2a3a" />
          <Windows x={66} y={30} cols={5} rows={6} w={8} h={8} gx={6} gy={4} lit={0.45} />
          <Rect x={56} y={6} width={88} height={20} fill="#ffd98a" opacity={0.85} />
          <Rect x={56} y={4} width={88} height={3} fill="#e0b04a" />
          <Rect x={10} y={60} width={40} height={46} fill="#2b3648" />
          <Rect x={150} y={50} width={40} height={56} fill="#2b3648" />
          <Windows x={16} y={66} cols={3} rows={4} w={6} h={6} gx={6} gy={4} lit={0.4} />
          <Windows x={156} y={56} cols={3} rows={5} w={6} h={6} gx={6} gy={4} lit={0.4} />
        </>
      );
      break;
    default:
      // malikâne
      art = (
        <>
          <Rect x={0} y={98} width={200} height={10} fill="#2d6a4f" />
          <Rect x={30} y={46} width={140} height={54} fill="#e7dcc8" />
          <Rect x={80} y={30} width={40} height={70} fill="#efe6d4" />
          <Polygon points="76,32 100,12 124,32" fill="#6b4f2c" />
          <Polygon points="26,48 60,30 94,48" fill="#8a6a44" />
          <Polygon points="106,48 140,30 174,48" fill="#8a6a44" />
          {[36, 52, 136, 152].map((x) => (
            <Rect key={x} x={x} y={56} width={10} height={36} fill="#f4f1ea" stroke="#b8a888" />
          ))}
          <Windows x={86} y={40} cols={2} rows={2} w={10} h={12} gx={8} gy={8} lit={0.9} />
          <Rect x={92} y={80} width={16} height={20} fill="#5a3a22" />
          <Circle cx={14} cy={88} r={12} fill="#1b4332" />
          <Circle cx={186} cy={88} r={12} fill="#1b4332" />
        </>
      );
  }
  return (
    <Svg width={width} height={(width * 120) / 200} viewBox="0 0 200 120">
      {sky}
      {art}
    </Svg>
  );
}
