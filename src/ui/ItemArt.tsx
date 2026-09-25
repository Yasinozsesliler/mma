import { L } from '../i18n';
import { useId, type ReactNode } from 'react';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { CarArt, HouseArt } from './VisualArt';

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
}

const GOLD = '#f2c14e';
const SILVER = '#c9ced6';

/** Tüm nesneler 200×110 alanda, koyu vitrin zemini üzerinde çizilir. */
function Stage({ children, tint = '#e63946', width }: { children: ReactNode; tint?: string; width: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg width={width} height={(width * 110) / 200} viewBox="0 0 200 110">
      <Defs>
        <RadialGradient id={`g${id}`} cx="50%" cy="45%" r="65%">
          <Stop offset="0" stopColor={tint} stopOpacity={0.28} />
          <Stop offset="1" stopColor="#07080b" stopOpacity={1} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={200} height={110} rx={8} fill={`url(#g${id})`} />
      <Ellipse cx={100} cy={98} rx={60} ry={5} fill="#000" opacity={0.5} />
      {children}
    </Svg>
  );
}

/** Metal/renk gradyanı tanımı döndürür (id ile kullanılır). */
function Grad({ id, c }: { id: string; c: string }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={shade(c, 55)} />
        <Stop offset="0.5" stopColor={c} />
        <Stop offset="1" stopColor={shade(c, -55)} />
      </LinearGradient>
    </Defs>
  );
}

function Watch({ strap, face, band = 'metal', diamonds = false, smart = false, digital = false }: { strap: string; face: string; band?: 'metal' | 'rubber'; diamonds?: boolean; smart?: boolean; digital?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <G>
      <Grad id={`w${id}`} c={strap} />
      {/* Kayış */}
      <Rect x={86} y={4} width={28} height={30} rx={4} fill={`url(#w${id})`} />
      <Rect x={86} y={76} width={28} height={30} rx={4} fill={`url(#w${id})`} />
      {band === 'metal'
        ? [8, 16, 24, 80, 88, 96].map((y) => <Line key={y} x1={87} y1={y} x2={113} y2={y} stroke={shade(strap, -40)} strokeWidth={1} />)
        : [12, 20, 86, 94].map((y) => <Circle key={y} cx={100} cy={y} r={1.6} fill={shade(strap, -50)} />)}
      {/* Kasa */}
      {smart ? (
        <>
          <Rect x={76} y={28} width={48} height={54} rx={12} fill={`url(#w${id})`} />
          <Rect x={81} y={33} width={38} height={44} rx={8} fill="#05070a" />
          <SvgText x={100} y={55} fill="#3ecf7a" fontSize={12} fontWeight="bold" textAnchor="middle">
            142
          </SvgText>
          <SvgText x={100} y={67} fill="#e63946" fontSize={7} textAnchor="middle">
            
            {L("♥ BPM")}
          </SvgText>
        </>
      ) : (
        <>
          <Circle cx={100} cy={55} r={28} fill={`url(#w${id})`} />
          <Circle cx={100} cy={55} r={23} fill={face} />
          {digital ? (
            <SvgText x={100} y={59} fill="#9be3f5" fontSize={11} fontWeight="bold" textAnchor="middle">
              05:30
            </SvgText>
          ) : (
            <>
              {Array.from({ length: 12 }, (_, i) => {
                const a = (i * Math.PI) / 6;
                return <Line key={i} x1={100 + Math.sin(a) * 18} y1={55 - Math.cos(a) * 18} x2={100 + Math.sin(a) * 21} y2={55 - Math.cos(a) * 21} stroke={diamonds ? '#fff' : shade(face, 120)} strokeWidth={i % 3 === 0 ? 2 : 1} />;
              })}
              <Line x1={100} y1={55} x2={100} y2={40} stroke={shade(face, 150)} strokeWidth={2} strokeLinecap="round" />
              <Line x1={100} y1={55} x2={111} y2={60} stroke={shade(face, 150)} strokeWidth={2} strokeLinecap="round" />
              <Circle cx={100} cy={55} r={2} fill={GOLD} />
            </>
          )}
          {diamonds
            ? Array.from({ length: 16 }, (_, i) => {
                const a = (i * Math.PI) / 8;
                return <Circle key={i} cx={100 + Math.sin(a) * 25.5} cy={55 - Math.cos(a) * 25.5} r={1.8} fill="#e8f7ff" />;
              })
            : null}
          <Rect x={127} y={51} width={5} height={8} rx={1.5} fill={shade(strap, 20)} />
        </>
      )}
      <Path d="M82 40 Q92 30 106 32" stroke="#fff" strokeWidth={2} opacity={0.25} fill="none" />
    </G>
  );
}

function Glove({ color, cuff }: { color: string; cuff: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <G>
      <Grad id={`gl${id}`} c={color} />
      <Path d="M70 70 Q58 40 76 22 Q96 6 120 16 Q140 26 136 52 Q134 70 122 76 L80 78 Z" fill={`url(#gl${id})`} stroke={shade(color, -60)} strokeWidth={1.5} />
      <Path d="M70 70 Q56 66 58 52 Q60 42 72 46" fill={`url(#gl${id})`} stroke={shade(color, -60)} strokeWidth={1.5} />
      <Path d="M80 78 L122 76 L124 100 L78 100 Z" fill={cuff} stroke={shade(cuff, -50)} strokeWidth={1.5} />
      <Rect x={78} y={84} width={46} height={5} fill="#fff" opacity={0.8} />
      <Path d="M84 26 Q100 16 118 22" stroke="#fff" strokeWidth={3} opacity={0.3} fill="none" strokeLinecap="round" />
    </G>
  );
}

function Diamond({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <G>
      <Polygon points={`${x - 8 * s},${y} ${x - 4 * s},${y - 6 * s} ${x + 4 * s},${y - 6 * s} ${x + 8 * s},${y} ${x},${y + 10 * s}`} fill="#dff4ff" stroke="#9ad0f5" strokeWidth={1} />
      <Path d={L("M{0} {1} L{2} {3} M{4} {5} L{6} {7} L{8} {9}", [x - 8 * s, y, x + 8 * s, y, x - 4 * s, y - 6 * s, x, y + 10 * s, x + 4 * s, y - 6 * s])} stroke="#9ad0f5" strokeWidth={0.8} />
      <Path d={L("M{0} {1} l2 -4 l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 Z", [x + 10 * s, y - 10 * s])} fill="#fff" opacity={0.9} />
    </G>
  );
}

/** Nesne çizimleri. */
const OBJ: Record<string, (c: string) => ReactNode> = {
  eldiven: (c) => <Glove color={c} cuff={c === GOLD ? '#1b1e24' : '#1b1e24'} />,
  dislik: () => (
    <G>
      <Path d="M60 40 Q60 86 100 86 Q140 86 140 40 L126 40 Q126 72 100 72 Q74 72 74 40 Z" fill="#3a86ff" stroke="#1740a8" strokeWidth={2} />
      {[78, 88, 100, 112, 122].map((x) => (
        <Rect key={x} x={x - 4} y={x === 100 ? 70 : 64} width={8} height={6} rx={2} fill="#9ec5ff" opacity={0.7} />
      ))}
    </G>
  ),
  ayakkabi: () => (
    <G>
      <Path d="M52 88 L56 34 Q58 24 72 24 L90 24 Q96 40 104 52 L140 62 Q156 66 156 80 L156 90 Z" fill="#e63946" stroke="#8f0a17" strokeWidth={1.5} />
      <Rect x={50} y={88} width={108} height={8} rx={3} fill="#f4f1ea" />
      {[34, 44, 54].map((y) => (
        <Line key={y} x1={68} y1={y} x2={88} y2={y + 4} stroke="#fff" strokeWidth={2} />
      ))}
    </G>
  ),
  kimono: () => (
    <G>
      <Path d="M60 20 L82 14 L100 40 L118 14 L140 20 L156 58 L138 64 L132 48 L132 100 L68 100 L68 48 L62 64 L44 58 Z" fill="#f4f1ea" stroke="#9aa1ad" strokeWidth={1.5} />
      <Path d="M82 14 L100 40 L100 100 M118 14 L100 40" stroke="#b8bec8" strokeWidth={2} fill="none" />
      <Rect x={68} y={64} width={64} height={8} fill="#111" />
      <Rect x={96} y={64} width={8} height={24} fill="#111" />
      <Rect x={96} y={78} width={8} height={4} fill="#e63946" />
    </G>
  ),
  maske: () => (
    <G>
      <Path d="M60 40 Q100 20 140 40 L136 76 Q100 96 64 76 Z" fill="#1b1e24" stroke="#3a3f4a" strokeWidth={2} />
      <Circle cx={84} cy={62} r={10} fill="#e63946" />
      <Circle cx={116} cy={62} r={10} fill="#e63946" />
      <Circle cx={100} cy={78} r={8} fill="#3a3f4a" />
      {[0, 60, 120].map((a) => (
        <Line key={a} x1={84} y1={62} x2={84 + Math.cos((a * Math.PI) / 180) * 7} y2={62 + Math.sin((a * Math.PI) / 180) * 7} stroke="#1b1e24" strokeWidth={2} />
      ))}
      <Path d="M60 44 L30 30 M140 44 L170 30" stroke="#3a3f4a" strokeWidth={5} strokeLinecap="round" />
    </G>
  ),
  kask: () => (
    <G>
      <Path d="M56 70 Q52 22 100 18 Q148 22 144 70 L132 92 L118 90 L118 70 L82 70 L82 90 L68 92 Z" fill="#e63946" stroke="#8f0a17" strokeWidth={2} />
      <Path d="M82 70 L118 70 L118 56 L82 56 Z" fill="#1b1e24" />
      <Path d="M70 30 Q100 22 128 30" stroke="#fff" strokeWidth={3} opacity={0.3} fill="none" />
    </G>
  ),
  analiz: () => (
    <G>
      <Rect x={46} y={14} width={108} height={66} rx={4} fill="#1b1e24" stroke="#3a3f4a" strokeWidth={2} />
      <Rect x={52} y={20} width={96} height={54} fill="#081018" />
      <Path d="M58 64 L74 50 L88 56 L104 36 L120 44 L142 26" stroke="#3ecf7a" strokeWidth={2.5} fill="none" />
      <Circle cx={104} cy={36} r={3} fill="#e63946" />
      <Path d="M36 86 L164 86 L154 94 L46 94 Z" fill="#3a3f4a" />
    </G>
  ),
  kriyo: () => (
    <G>
      <Rect x={72} y={8} width={56} height={92} rx={24} fill="#dfe9f2" stroke="#9ab" strokeWidth={2} />
      <Rect x={80} y={20} width={40} height={60} rx={16} fill="#9be3f5" opacity={0.6} />
      {[
        [90, 34],
        [110, 48],
        [94, 64],
      ].map(([x, y]) => (
        <Path key={x} d={L("M{0} {1} L{2} {3} M{4} {5} L{6} {7} M{8} {9} L{10} {11} M{12} {13} L{14} {15}", [x, y - 6, x, y + 6, x - 6, y, x + 6, y, x - 4, y - 4, x + 4, y + 4, x + 4, y - 4, x - 4, y + 4])} stroke="#fff" strokeWidth={1.5} />
      ))}
    </G>
  ),
  konsol: () => (
    <G>
      <Rect x={108} y={20} width={30} height={64} rx={4} fill="#f4f1ea" stroke="#9aa1ad" />
      <Rect x={112} y={24} width={22} height={4} fill="#3a86ff" />
      <Path d="M44 60 Q44 44 60 44 L104 44 Q120 44 120 60 Q124 86 108 88 Q98 88 94 78 L70 78 Q66 88 56 88 Q40 86 44 60 Z" fill="#1b1e24" stroke="#3a3f4a" strokeWidth={1.5} />
      <Circle cx={100} cy={58} r={3} fill="#3ecf7a" />
      <Circle cx={106} cy={64} r={3} fill="#e63946" />
      <Circle cx={94} cy={64} r={3} fill="#3a86ff" />
      <Path d="M58 60 L70 60 M64 54 L64 66" stroke="#9aa1ad" strokeWidth={3} />
    </G>
  ),
  pc: () => (
    <G>
      <Rect x={30} y={16} width={100} height={62} rx={3} fill="#0b0d12" stroke="#3a3f4a" strokeWidth={2} />
      <Rect x={36} y={22} width={88} height={50} fill="#2a1446" />
      <Path d="M36 72 L60 44 L80 60 L104 34 L124 52 L124 72 Z" fill="#b57bff" opacity={0.6} />
      <Rect x={74} y={78} width={12} height={12} fill="#3a3f4a" />
      <Rect x={60} y={90} width={40} height={4} fill="#3a3f4a" />
      <Rect x={140} y={24} width={32} height={70} rx={3} fill="#0b0d12" stroke="#3a3f4a" strokeWidth={2} />
      {['#e63946', '#3ecf7a', '#3a86ff'].map((c, i) => (
        <Circle key={c} cx={156} cy={40 + i * 16} r={5} fill="none" stroke={c} strokeWidth={2} />
      ))}
    </G>
  ),
  telefon: () => (
    <G>
      <Rect x={76} y={8} width={48} height={94} rx={8} fill="#1b1e24" stroke="#5a5f6a" strokeWidth={2} />
      <Rect x={80} y={16} width={40} height={76} rx={4} fill="#101828" />
      <Rect x={84} y={22} width={32} height={18} rx={3} fill="#e63946" opacity={0.8} />
      {[46, 58, 70].map((y) => (
        <Rect key={y} x={84} y={y} width={32} height={8} rx={2} fill="#3a86ff" opacity={0.5} />
      ))}
      <Rect x={92} y={11} width={16} height={3} rx={1.5} fill="#000" />
    </G>
  ),
  vr: () => (
    <G>
      <Rect x={50} y={36} width={100} height={46} rx={16} fill="#f4f1ea" stroke="#9aa1ad" strokeWidth={2} />
      <Rect x={58} y={44} width={84} height={30} rx={10} fill="#111" />
      <Path d="M58 60 Q100 40 142 60" stroke="#3a86ff" strokeWidth={2} opacity={0.6} fill="none" />
      <Path d="M50 56 Q30 56 30 44 Q30 30 60 28 M150 56 Q170 56 170 44 Q170 30 140 28" stroke="#3a3f4a" strokeWidth={5} fill="none" />
    </G>
  ),
  kamera: () => (
    <G>
      <Rect x={46} y={34} width={108} height={56} rx={8} fill="#1b1e24" stroke="#3a3f4a" strokeWidth={2} />
      <Rect x={60} y={24} width={30} height={12} rx={3} fill="#1b1e24" />
      <Circle cx={104} cy={62} r={22} fill="#0b0d12" stroke="#5a5f6a" strokeWidth={3} />
      <Circle cx={104} cy={62} r={13} fill="#1d3557" />
      <Circle cx={98} cy={56} r={4} fill="#fff" opacity={0.6} />
      <Circle cx={140} cy={44} r={4} fill="#e63946" />
    </G>
  ),
  zincir: () => (
    <G>
      <Path d="M44 14 Q100 110 156 14" stroke={GOLD} strokeWidth={6} fill="none" strokeDasharray="7 3" />
      <Polygon points="100,70 118,80 112,100 88,100 82,80" fill={GOLD} stroke="#b07d24" strokeWidth={2} />
      <SvgText x={100} y={94} fill="#6b4a12" fontSize={12} fontWeight="bold" textAnchor="middle">
        ★
      </SvgText>
    </G>
  ),
  yuzuk: () => (
    <G>
      <Ellipse cx={100} cy={70} rx={36} ry={26} fill="none" stroke={GOLD} strokeWidth={10} />
      <Rect x={76} y={22} width={48} height={30} rx={6} fill={GOLD} stroke="#b07d24" strokeWidth={2} />
      <Rect x={84} y={28} width={32} height={18} rx={3} fill="#e63946" />
      <Diamond x={100} y={34} s={0.8} />
    </G>
  ),
  kupe: () => (
    <G>
      <Diamond x={72} y={50} s={1.6} />
      <Diamond x={128} y={50} s={1.6} />
    </G>
  ),
  tisort: (c) => (
    <G>
      <Path d="M62 18 L84 12 Q100 24 116 12 L138 18 L160 42 L142 54 L136 46 L136 100 L64 100 L64 46 L58 54 L40 42 Z" fill={c} stroke={shade(c, -60)} strokeWidth={1.5} />
      <SvgText x={100} y={66} fill="#fff" fontSize={14} fontWeight="bold" textAnchor="middle">
        YOL
      </SvgText>
      <Path d="M86 74 L114 74" stroke={GOLD} strokeWidth={2} />
    </G>
  ),
  takim: () => (
    <G>
      <Path d="M62 16 L90 10 L100 30 L110 10 L138 16 L150 100 L50 100 Z" fill="#1b1e24" stroke="#3a3f4a" strokeWidth={1.5} />
      <Path d="M90 10 L100 30 L110 10 L106 10 L100 22 L94 10 Z" fill="#f4f1ea" />
      <Polygon points="100,24 104,32 100,64 96,32" fill="#e63946" />
      <Path d="M90 10 L84 56 L100 66 M110 10 L116 56 L100 66" stroke="#3a3f4a" strokeWidth={2} fill="none" />
    </G>
  ),
  ceket: () => (
    <G>
      <Path d="M58 18 L86 12 L100 26 L114 12 L142 18 L154 100 L46 100 Z" fill="#3a2418" stroke="#1a0e08" strokeWidth={1.5} />
      <Path d="M86 12 L96 44 L100 100 M114 12 L104 44" stroke="#1a0e08" strokeWidth={2} fill="none" />
      <Line x1={100} y1={30} x2={100} y2={96} stroke={SILVER} strokeWidth={2} strokeDasharray="3 2" />
      <Path d="M64 30 Q70 26 78 30" stroke="#fff" strokeWidth={2} opacity={0.2} fill="none" />
    </G>
  ),
  gozluk: () => (
    <G>
      <Path d="M36 44 L164 44" stroke={GOLD} strokeWidth={4} />
      <Path d="M44 44 Q44 78 72 78 Q94 78 96 50 L96 44 Z" fill="#101828" stroke={GOLD} strokeWidth={3} />
      <Path d="M104 44 L104 50 Q106 78 128 78 Q156 78 156 44 Z" fill="#101828" stroke={GOLD} strokeWidth={3} />
      <Path d="M54 52 L70 52 M114 52 L130 52" stroke="#fff" strokeWidth={3} opacity={0.35} />
    </G>
  ),
  sneaker: () => (
    <G>
      <Path d="M36 84 L40 56 Q42 44 56 46 Q80 52 96 44 Q114 62 150 66 Q166 70 166 82 L166 88 Z" fill="#f4f1ea" stroke="#9aa1ad" strokeWidth={1.5} />
      <Path d="M60 62 Q100 76 150 70" stroke="#e63946" strokeWidth={6} fill="none" />
      <Rect x={34} y={86} width={134} height={8} rx={3} fill="#e63946" />
      {[66, 76, 86].map((x) => (
        <Line key={x} x1={x} y1={50} x2={x + 8} y2={58} stroke="#3a3f4a" strokeWidth={2} />
      ))}
    </G>
  ),
  moto: () => (
    <G>
      <Circle cx={56} cy={80} r={16} fill="#111" stroke="#5a5f6a" strokeWidth={3} />
      <Circle cx={146} cy={80} r={16} fill="#111" stroke="#5a5f6a" strokeWidth={3} />
      <Path d="M56 80 L84 54 L124 54 L146 80 M100 54 L96 80 L124 80" stroke="#9aa1ad" strokeWidth={3} fill="none" />
      <Path d="M78 52 Q96 36 120 44 L128 54 L80 58 Z" fill="#e63946" stroke="#8f0a17" strokeWidth={1.5} />
      <Path d="M124 44 L138 36 L144 38" stroke="#111" strokeWidth={4} strokeLinecap="round" />
    </G>
  ),
  tekne: () => (
    <G>
      <Path d="M20 92 Q60 86 100 92 Q140 98 180 92 L180 110 L20 110 Z" fill="#1d4e89" />
      <Path d="M30 78 L170 72 L150 94 L44 94 Z" fill="#f4f1ea" stroke="#9aa1ad" strokeWidth={1.5} />
      <Path d="M30 78 L170 72 L166 78 L32 84 Z" fill="#e63946" />
      <Path d="M92 72 L112 52 L140 50 L144 70 Z" fill="#101828" stroke="#5a5f6a" strokeWidth={1.5} />
      <Path d="M170 88 Q182 84 192 90" stroke="#fff" strokeWidth={2} opacity={0.6} fill="none" />
    </G>
  ),
  yat: () => (
    <G>
      <Path d="M10 94 Q60 88 100 94 Q140 100 190 94 L190 110 L10 110 Z" fill="#1d4e89" />
      <Path d="M18 76 L182 70 L160 96 L36 96 Z" fill="#f4f1ea" stroke="#9aa1ad" strokeWidth={1.5} />
      <Path d="M44 70 L160 66 L150 52 L64 54 Z" fill="#e9ecef" stroke="#9aa1ad" strokeWidth={1.5} />
      <Path d="M76 52 L144 50 L136 38 L90 40 Z" fill="#e9ecef" stroke="#9aa1ad" strokeWidth={1.5} />
      {[56, 76, 96, 116, 136].map((x) => (
        <Rect key={x} x={x} y={58} width={14} height={6} fill="#101828" />
      ))}
      <Rect x={98} y={42} width={30} height={5} fill="#101828" />
      <Line x1={112} y1={38} x2={112} y2={18} stroke="#9aa1ad" strokeWidth={2} />
    </G>
  ),
  heli: () => (
    <G>
      <Line x1={30} y1={24} x2={170} y2={24} stroke="#3a3f4a" strokeWidth={4} strokeLinecap="round" />
      <Rect x={96} y={24} width={6} height={12} fill="#3a3f4a" />
      <Path d="M60 60 Q60 36 96 36 L118 36 Q140 38 140 62 Q140 78 116 78 L80 78 Q60 78 60 60 Z" fill="#1b1e24" stroke="#5a5f6a" strokeWidth={1.5} />
      <Path d="M68 58 Q70 42 96 42 L110 42 L110 60 Z" fill="#8fb3d9" opacity={0.7} />
      <Path d="M138 56 L184 50 L186 58 L140 66 Z" fill="#1b1e24" />
      <Circle cx={184} cy={50} r={8} fill="none" stroke="#5a5f6a" strokeWidth={2} />
      <Path d="M76 78 L72 90 M120 78 L124 90 M62 90 L134 90" stroke="#9aa1ad" strokeWidth={3} strokeLinecap="round" />
      <Rect x={60} y={64} width={80} height={4} fill={GOLD} />
    </G>
  ),
  jet: () => (
    <G>
      <Path d="M20 60 Q24 50 44 50 L160 48 Q184 50 188 58 Q184 66 160 66 L44 66 Q24 66 20 60 Z" fill="#f4f1ea" stroke="#9aa1ad" strokeWidth={1.5} />
      <Path d="M92 52 L128 20 L142 20 L116 52 Z" fill="#e9ecef" stroke="#9aa1ad" />
      <Path d="M92 64 L128 94 L142 94 L116 64 Z" fill="#e9ecef" stroke="#9aa1ad" />
      <Path d="M26 54 L16 32 L30 32 L44 52 Z" fill="#e63946" />
      {[60, 72, 84, 96, 108, 120, 132].map((x) => (
        <Circle key={x} cx={x} cy={56} r={2.6} fill="#101828" />
      ))}
      <Path d="M166 52 Q178 54 182 58 L166 58 Z" fill="#101828" />
      <Rect x={40} y={60} width={120} height={2} fill={GOLD} />
    </G>
  ),
  fotograf: () => (
    <G>
      <Rect x={50} y={14} width={100} height={80} fill="#f4f1ea" />
      <Rect x={56} y={20} width={88} height={60} fill="#2a1446" />
      <Circle cx={100} cy={46} r={14} fill="#c68a5f" />
      <Path d="M76 80 Q76 60 100 60 Q124 60 124 80 Z" fill="#e63946" />
      <Circle cx={128} cy={30} r={6} fill="#fff" opacity={0.8} />
    </G>
  ),
  sanat: () => (
    <G>
      <Rect x={44} y={8} width={112} height={94} fill="#b07d24" />
      <Rect x={52} y={16} width={96} height={78} fill="#3b2a1a" />
      <Circle cx={100} cy={44} r={14} fill="#d9a07a" />
      <Path d="M72 94 Q72 64 100 64 Q128 64 128 94 Z" fill="#1b1e24" />
      <Rect x={82} y={70} width={36} height={8} fill={GOLD} />
      <Path d="M52 16 L148 94" stroke="#fff" strokeWidth={1} opacity={0.08} />
    </G>
  ),
  vakif: () => (
    <G>
      <Path d="M50 76 Q70 60 100 72 Q130 60 150 76 L150 96 L50 96 Z" fill="#d9a07a" stroke="#a86b43" strokeWidth={1.5} />
      <Path d="M100 64 Q86 48 86 38 Q86 26 98 28 Q100 30 100 34 Q100 30 102 28 Q114 26 114 38 Q114 48 100 64 Z" fill="#e63946" />
      <Path d="M92 36 Q94 32 98 32" stroke="#fff" strokeWidth={2} opacity={0.5} fill="none" />
    </G>
  ),
};

/** Mağaza ürünü görseli: araba/ev kendi çizimlerini, diğerleri nesne çizimini kullanır. */
export function ItemArt({ art, width = 260 }: { art: { kind: string; model: string; color?: string }; width?: number }) {
  if (art.kind === 'car') return <CarArt model={art.model} color={art.color} width={width} />;
  if (art.kind === 'house') return <HouseArt model={art.model} width={width} />;
  if (art.kind === 'watch') return <WatchArt {...(WATCH_STYLES[art.model] ?? WATCH_STYLES.celik)} width={width} tint={art.color} />;
  const draw = OBJ[art.model];
  return <Stage width={width} tint={art.color ?? '#e63946'}>{draw ? draw(art.color ?? '#e63946') : null}</Stage>;
}

export function WatchArt(props: Parameters<typeof Watch>[0] & { width?: number; tint?: string }) {
  const { width = 260, tint = GOLD, ...w } = props;
  return (
    <Stage width={width} tint={tint}>
      <Watch {...w} />
    </Stage>
  );
}

export const WATCH_STYLES: Record<string, Parameters<typeof Watch>[0]> = {
  spor: { strap: '#1b1e24', face: '#0b0d12', band: 'rubber', digital: true },
  akilli: { strap: '#2a2e37', face: '#05070a', band: 'rubber', smart: true },
  celik: { strap: SILVER, face: '#1d3557', band: 'metal' },
  altin: { strap: GOLD, face: '#0b3d2e', band: 'metal' },
  elmas: { strap: GOLD, face: '#0b0d12', band: 'metal', diamonds: true },
};
