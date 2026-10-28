// Sosyal medyadaki fotoğrafların görseli (4:5, Instagram oranı): tam boy dövüşçü, türüne göre sahne
// (kafeste zafer, salonda antrenman, kemer havada, afiş, araba yanında, aile/evcil, taraftarla özçekim, sponsor) ve filtre.
import { memo, useId, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { playerKit } from '../cosmetics';
import { PHOTO_FILTERS, type PhotoPost } from '../engine/gram';
import { L } from '../i18n';
import { DEFAULT_LOOK } from './FighterAvatar';
import { Figure, HIP_H, POSES, type Kit, type Pose } from './rig';
import { joints } from './rigMath';
import { C, F } from './theme';
import { CarArt, HouseArt } from './VisualArt';
import { Icon, type IconName } from './components';

type Props = { p: Pick<PhotoPost, 'tur' | 'filtre' | 'look' | 'ek' | 'viral' | 'sahip'> & { id?: string }; size: number };

const BLUE: Kit = { shorts: '#1f4fbf', trim: '#ffffff', glove: '#1740a8' };
/** Başka dövüşçülerin fotoğraflarında kimliğe bağlı sabit şort rengi (oyuncunun kırmızısı hariç). */
const NPC_KITS: Kit[] = [
  BLUE,
  { shorts: '#1d1f24', trim: '#f2c14e', glove: '#2a2d33' },
  { shorts: '#0f7a4a', trim: '#ffffff', glove: '#0b5c38' },
  { shorts: '#6b2fb3', trim: '#ffffff', glove: '#4e2185' },
  { shorts: '#e8e8e8', trim: '#1d1f24', glove: '#cfcfcf' },
  { shorts: '#c77d12', trim: '#1d1f24', glove: '#9a600c' },
  { shorts: '#0d8a8a', trim: '#ffffff', glove: '#0a6a6a' },
];
const npcKit = (id: string) => NPC_KITS[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % NPC_KITS.length];
const VB_H = 125;

/** Dövüşçüyü sahneye koyar: x merkez, ayak hizası yerde (y=116), ölçek. */
function Fighter({ pose, x, s, look, kit, flip }: { pose: Pose; x: number; s: number; look: PhotoPost['look']; kit: Kit; flip?: boolean }) {
  return (
    <G>
      <Ellipse cx={x} cy={116.5} rx={14 * s} ry={2.6 * s} fill="#000" opacity={0.45} />
      <G transform={`translate(${x} ${116 - HIP_H * s}) scale(${flip ? -s : s} ${s})`}>
        <Figure p={pose} look={look ?? DEFAULT_LOOK} kit={kit} />
      </G>
    </G>
  );
}

function Crowd({ y, rows = 3, seed = 1, tint = '#000' }: { y: number; rows?: number; seed?: number; tint?: string }) {
  const out = [];
  for (let r = 0; r < rows; r++)
    for (let i = 0; i < 16; i++) {
      const x = i * 6.6 + ((r * 3.3 + seed) % 6.6);
      const yy = y + r * 6 + (((i * 7 + r * 3 + seed) % 5) - 2) * 0.5;
      out.push(
        <G key={`${r}-${i}`} opacity={0.55 + r * 0.15}>
          <Circle cx={x} cy={yy} r={2.1} fill={tint} />
          <Rect x={x - 2.8} y={yy + 1.8} width={5.6} height={5} rx={2} fill={tint} />
        </G>,
      );
    }
  return <G>{out}</G>;
}

function Scene({ p }: { p: Props['p'] }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (n: string) => `${n}${uid}`;
  const sahip = p.sahip;
  const kit = useMemo(() => (sahip ? npcKit(sahip) : (playerKit() as Kit)), [sahip]);
  // Afişte karşı taraf: oyuncu ise kendi şortu, değilse mavi
  const rakipKit = useMemo(() => (p.ek?.rakipOyuncu ? (playerKit() as Kit) : sahip && npcKit(sahip) === BLUE ? NPC_KITS[1] : BLUE), [p.ek?.rakipOyuncu, sahip]);
  const ek = p.ek ?? {};
  const look = p.look;
  const spot = (cx: number, color = '#ffffff') => <Polygon points={`${cx - 3},0 ${cx + 3},0 ${cx + 22},${VB_H} ${cx - 22},${VB_H}`} fill={color} opacity={0.07} />;

  switch (p.tur) {
    case 'zafer': {
      return (
        <Svg width="100%" height="100%" viewBox={`0 0 100 ${VB_H}`}>
          <Defs>
            <LinearGradient id={id('bg')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#1a0b10" />
              <Stop offset="0.55" stopColor="#3a0f18" />
              <Stop offset="1" stopColor="#120507" />
            </LinearGradient>
            <RadialGradient id={id('mat')} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#d9dde6" />
              <Stop offset="1" stopColor="#8a909c" />
            </RadialGradient>
          </Defs>
          <Rect width={100} height={VB_H} fill={`url(#${id('bg')})`} />
          {spot(25)}
          {spot(75)}
          {spot(50, '#fff6d8')}
          <Crowd y={58} rows={3} tint="#0a0406" />
          <Ellipse cx={50} cy={116} rx={70} ry={14} fill={`url(#${id('mat')})`} />
          <Circle cx={50} cy={116} r={9} fill="none" stroke={C.red} strokeWidth={0.8} opacity={0.7} />
          {/* Kafes teli */}
          <G opacity={0.16}>
            {Array.from({ length: 18 }).map((_, i) => (
              <Line key={`a${i}`} x1={i * 8 - 40} y1={0} x2={i * 8 + 40} y2={104} stroke="#fff" strokeWidth={0.3} />
            ))}
            {Array.from({ length: 18 }).map((_, i) => (
              <Line key={`b${i}`} x1={i * 8 + 20} y1={0} x2={i * 8 - 60} y2={104} stroke="#fff" strokeWidth={0.3} />
            ))}
          </G>
          <Rect x={0} y={102} width={100} height={2.4} fill="#111" />
          {[8, 92].map((x) => (
            <Rect key={x} x={x - 1.2} y={20} width={2.4} height={84} fill="#1b1b1f" />
          ))}
          {/* Konfeti */}
          {Array.from({ length: 22 }).map((_, i) => (
            <Rect key={i} x={(i * 37) % 100} y={(i * 23) % 70} width={1.6} height={0.9} fill={['#f2c14e', '#e63946', '#ffffff'][i % 3]} transform={`rotate(${(i * 47) % 180} ${(i * 37) % 100} ${(i * 23) % 70})`} />
          ))}
          <Fighter pose={POSES.win} x={50} s={0.8} look={look} kit={kit} />
        </Svg>
      );
    }
    case 'antrenman': {
      return (
        <Svg width="100%" height="100%" viewBox={`0 0 100 ${VB_H}`}>
          <Defs>
            <LinearGradient id={id('bg')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#2f3540" />
              <Stop offset="1" stopColor="#181b21" />
            </LinearGradient>
          </Defs>
          <Rect width={100} height={VB_H} fill={`url(#${id('bg')})`} />
          {/* Pencere ışığı */}
          <Rect x={8} y={14} width={26} height={30} fill="#9fc4ff" opacity={0.18} />
          <Line x1={21} y1={14} x2={21} y2={44} stroke="#2f3540" strokeWidth={1} />
          <Line x1={8} y1={29} x2={34} y2={29} stroke="#2f3540" strokeWidth={1} />
          <Polygon points="8,44 34,44 52,104 22,104" fill="#9fc4ff" opacity={0.06} />
          {/* Ağırlık rafı */}
          <Rect x={4} y={74} width={18} height={1.4} fill="#555c68" />
          {[7, 12, 17].map((x) => (
            <Circle key={x} cx={x} cy={72} r={2.2} fill="#0e0f12" stroke="#3b414c" strokeWidth={0.5} />
          ))}
          {/* Minder */}
          <Rect x={0} y={104} width={100} height={21} fill="#1e3a6e" />
          {[0, 20, 40, 60, 80].map((x) => (
            <Line key={x} x1={x} y1={104} x2={x - 6} y2={125} stroke="#14294f" strokeWidth={0.8} />
          ))}
          {/* Torba */}
          <Line x1={78} y1={0} x2={78} y2={30} stroke="#777" strokeWidth={0.6} />
          <Rect x={71} y={30} width={14} height={46} rx={5} fill="#7a1d24" />
          <Rect x={71} y={36} width={14} height={2} fill="#5a1218" />
          <Rect x={71} y={68} width={14} height={2} fill="#5a1218" />
          <Fighter pose={POSES.cross} x={46} s={0.78} look={look} kit={kit} />
        </Svg>
      );
    }
    case 'kemer': {
      const j = joints(POSES.win);
      const s = 0.8;
      const toX = (x: number) => 50 + x * s;
      const toY = (y: number) => 116 - HIP_H * s + y * s;
      const ax = toX(j.wrR.x) - 2,
        bx = toX(j.wrL.x) + 2,
        by = Math.min(toY(j.wrL.y), toY(j.wrR.y)) - 1;
      return (
        <Svg width="100%" height="100%" viewBox={`0 0 100 ${VB_H}`}>
          <Defs>
            <RadialGradient id={id('bg')} cx="50%" cy="35%" r="70%">
              <Stop offset="0" stopColor="#8a6a1c" />
              <Stop offset="0.6" stopColor="#2a1e06" />
              <Stop offset="1" stopColor="#0d0902" />
            </RadialGradient>
            <LinearGradient id={id('gold')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ffe08a" />
              <Stop offset="1" stopColor="#b8861b" />
            </LinearGradient>
          </Defs>
          <Rect width={100} height={VB_H} fill={`url(#${id('bg')})`} />
          {Array.from({ length: 12 }).map((_, i) => (
            <Polygon key={i} points={`50,30 ${50 + Math.cos((i * Math.PI) / 6) * 120},${30 + Math.sin((i * Math.PI) / 6) * 120} ${50 + Math.cos((i * Math.PI) / 6 + 0.12) * 120},${30 + Math.sin((i * Math.PI) / 6 + 0.12) * 120}`} fill="#ffe08a" opacity={0.06} />
          ))}
          <Crowd y={70} rows={3} tint="#0a0702" />
          <Rect x={0} y={104} width={100} height={21} fill="#15110a" />
          <Fighter pose={POSES.win} x={50} s={s} look={look} kit={kit} />
          {/* Kemer, iki elin arasında havada */}
          <Rect x={ax} y={by - 2.6} width={bx - ax} height={5.2} rx={1.6} fill="#1a1a1a" stroke={`url(#${id('gold')})`} strokeWidth={0.6} />
          <Ellipse cx={(ax + bx) / 2} cy={by} rx={7.5} ry={6} fill={`url(#${id('gold')})`} stroke="#7a5a10" strokeWidth={0.5} />
          <Ellipse cx={(ax + bx) / 2} cy={by} rx={4.2} ry={3.3} fill="#c9a23a" stroke="#fff3c4" strokeWidth={0.4} />
          <Circle cx={(ax + bx) / 2} cy={by} r={1.3} fill={C.red} />
          {[-1, 1].map((d) => (
            <Rect key={d} x={(ax + bx) / 2 + d * 10.5 - 2} y={by - 2} width={4} height={4} rx={0.8} fill={`url(#${id('gold')})`} />
          ))}
        </Svg>
      );
    }
    case 'afis': {
      return (
        <Svg width="100%" height="100%" viewBox={`0 0 100 ${VB_H}`}>
          <Defs>
            <LinearGradient id={id('l')} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#7a0f1b" />
              <Stop offset="1" stopColor="#2a0509" />
            </LinearGradient>
            <LinearGradient id={id('r')} x1="1" y1="0" x2="0" y2="0">
              <Stop offset="0" stopColor="#0f2f7a" />
              <Stop offset="1" stopColor="#050f2a" />
            </LinearGradient>
          </Defs>
          <Polygon points={`0,0 58,0 42,${VB_H} 0,${VB_H}`} fill={`url(#${id('l')})`} />
          <Polygon points={`58,0 100,0 100,${VB_H} 42,${VB_H}`} fill={`url(#${id('r')})`} />
          <Line x1={58} y1={0} x2={42} y2={VB_H} stroke={C.gold} strokeWidth={0.8} />
          {spot(25)}
          {spot(75)}
          <Rect x={0} y={106} width={100} height={19} fill="#000" opacity={0.5} />
          <Fighter pose={POSES.stance} x={27} s={0.66} look={look} kit={kit} />
          <Fighter pose={POSES.stance} x={73} s={0.66} look={ek.rakipLook} kit={rakipKit} flip />
        </Svg>
      );
    }
    case 'luks': {
      return (
        <Svg width="100%" height="100%" viewBox={`0 0 100 ${VB_H}`}>
          <Defs>
            <LinearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ff9a5a" />
              <Stop offset="0.45" stopColor="#c2557a" />
              <Stop offset="1" stopColor="#2a2350" />
            </LinearGradient>
          </Defs>
          <Rect width={100} height={VB_H} fill={`url(#${id('sky')})`} />
          <Circle cx={70} cy={50} r={11} fill="#ffd27a" opacity={0.9} />
          <Rect x={0} y={60} width={100} height={30} fill="#3a3466" opacity={0.85} />
          {[4, 14, 22, 34, 46, 58, 82, 92].map((x, i) => (
            <Rect key={x} x={x} y={44 + (i % 3) * 5} width={8} height={30} fill="#1d1a3a" />
          ))}
          <Rect x={0} y={88} width={100} height={37} fill="#232028" />
          <Line x1={0} y1={104} x2={100} y2={104} stroke="#3a3640" strokeWidth={0.6} />
          <Fighter pose={POSES.stance} x={22} s={0.66} look={look} kit={kit} />
        </Svg>
      );
    }
    case 'aile':
    case 'evcil': {
      const warm = p.tur === 'aile';
      return (
        <Svg width="100%" height="100%" viewBox={`0 0 100 ${VB_H}`}>
          <Defs>
            <LinearGradient id={id('bg')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={warm ? '#7fb6e8' : '#9fd4f0'} />
              <Stop offset="0.7" stopColor={warm ? '#f2c9a0' : '#d8f0d0'} />
            </LinearGradient>
          </Defs>
          <Rect width={100} height={VB_H} fill={`url(#${id('bg')})`} />
          <Ellipse cx={20} cy={22} rx={12} ry={4} fill="#fff" opacity={0.7} />
          <Ellipse cx={74} cy={14} rx={10} ry={3.4} fill="#fff" opacity={0.6} />
          <Path d={`M0 92 Q25 80 50 90 T100 86 L100 ${VB_H} L0 ${VB_H} Z`} fill={warm ? '#5f8f4a' : '#4f9a52'} />
          <Rect x={0} y={104} width={100} height={21} fill={warm ? '#4b7a3a' : '#3f8443'} />
          {[10, 86].map((x) => (
            <G key={x}>
              <Rect x={x - 1} y={70} width={2} height={22} fill="#5a3a22" />
              <Circle cx={x} cy={66} r={9} fill="#3f7a3a" />
            </G>
          ))}
          <Fighter pose={POSES.refIdle} x={36} s={0.72} look={look} kit={kit} />
        </Svg>
      );
    }
    case 'taraftar': {
      return (
        <Svg width="100%" height="100%" viewBox={`0 0 100 ${VB_H}`}>
          <Defs>
            <LinearGradient id={id('bg')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#140c2a" />
              <Stop offset="1" stopColor="#3a1d5c" />
            </LinearGradient>
          </Defs>
          <Rect width={100} height={VB_H} fill={`url(#${id('bg')})`} />
          {spot(30, '#b57bff')}
          {spot(70, '#3aa8ff')}
          <Crowd y={44} rows={4} tint="#0a0614" />
          <Fighter pose={POSES.win} x={50} s={0.66} look={look} kit={kit} />
          {/* Ön sırada telefonlarını kaldırmış taraftarlar */}
          {[8, 24, 40, 60, 76, 92].map((x, i) => (
            <G key={x}>
              <Circle cx={x} cy={112 + (i % 2) * 2} r={5} fill="#05030a" />
              <Rect x={x - 7} y={116 + (i % 2) * 2} width={14} height={12} rx={4} fill="#05030a" />
              <Rect x={x + (i % 2 ? -8 : 4)} y={100 + (i % 3)} width={4} height={6.5} rx={0.8} fill="#05030a" stroke="#9fd0ff" strokeWidth={0.4} />
              <Rect x={x + (i % 2 ? -7.4 : 4.6)} y={100.8 + (i % 3)} width={2.8} height={4.8} fill="#9fd0ff" opacity={0.7} />
            </G>
          ))}
        </Svg>
      );
    }
    case 'sponsor': {
      return (
        <Svg width="100%" height="100%" viewBox={`0 0 100 ${VB_H}`}>
          <Defs>
            <LinearGradient id={id('bg')} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#e8ecf2" />
              <Stop offset="1" stopColor="#aab4c4" />
            </LinearGradient>
          </Defs>
          <Rect width={100} height={VB_H} fill={`url(#${id('bg')})`} />
          {Array.from({ length: 6 }).map((_, r) =>
            Array.from({ length: 4 }).map((__, c) => <Rect key={`${r}${c}`} x={4 + c * 25} y={6 + r * 15} width={18} height={8} rx={1} fill="#1d2b3a" opacity={0.08} />),
          )}
          <Rect x={0} y={104} width={100} height={21} fill="#8a94a6" />
          <Fighter pose={POSES.jab} x={44} s={0.76} look={look} kit={kit} />
        </Svg>
      );
    }
  }
}

function Base({ p, size }: Props) {
  const u = size / 100;
  const h = size * 1.25;
  const ek = p.ek ?? {};
  const tag = (t: string, color = '#fff', bg = '#000000aa') => (
    <View style={{ backgroundColor: bg, paddingHorizontal: 3 * u, paddingVertical: 1.2 * u, borderRadius: 2 * u, alignSelf: 'flex-start' }}>
      <Text style={{ color, fontFamily: F.display, fontSize: Math.max(7, 5.4 * u), letterSpacing: 0.3 * u }} numberOfLines={1}>
        {t}
      </Text>
    </View>
  );
  const at = (style: object, node: React.ReactNode) => <View style={[{ position: 'absolute' }, style]}>{node}</View>;
  const big = size >= 180;
  let over: React.ReactNode = null;
  switch (p.tur) {
    case 'zafer':
      over = big ? (
        <>
          {at({ left: 5 * u, top: 5 * u }, tag(ek.yontem || L("ZAFER"), '#fff', C.red))}
          {ek.rakip ? at({ right: 5 * u, top: 5 * u }, tag(`vs ${ek.rakip}`)) : null}
        </>
      ) : null;
      break;
    case 'afis':
      over = (
        <>
          <Text style={[st.center, { top: 6 * u, fontSize: 7 * u, color: '#fff', letterSpacing: 1 * u }]}>{L("DÖVÜŞ GECESİ")}</Text>
          <Text style={[st.center, { top: 16 * u, fontSize: 22 * u, color: C.gold }]}>VS</Text>
          {big && ek.rakip ? at({ left: 0, right: 0, bottom: 6 * u, alignItems: 'center' }, tag(ek.rakip.toLocaleUpperCase(), '#fff', '#1f4fbfcc')) : null}
        </>
      );
      break;
    case 'luks':
      over = at(
        { right: 0, bottom: 10 * u },
        ek.araba ? <CarArt model={ek.araba.model} color={ek.araba.renk} width={70 * u} /> : ek.ev ? <HouseArt model={ek.ev} width={62 * u} /> : <Icon name={(ek.tasit ?? 'ferry') as IconName} size={50 * u} color="#f4f1ea" />,
      );
      break;
    case 'aile':
    case 'evcil':
      over = (
        <>
          <Text style={{ position: 'absolute', right: 10 * u, bottom: (p.tur === 'evcil' ? 9 : 22) * u, fontSize: (p.tur === 'evcil' ? 26 : 34) * u }}>{ek.emoji ?? '❤️'}</Text>
          {big && ek.ad ? at({ right: 5 * u, top: 5 * u }, tag(ek.ad)) : null}
        </>
      );
      break;
    case 'sponsor':
      over = (
        <>
          {at(
            { left: 0, right: 0, top: 10 * u, alignItems: 'center' },
            <View style={{ borderWidth: Math.max(1, 0.6 * u), borderColor: '#1d2b3a', paddingHorizontal: 5 * u, paddingVertical: 1.5 * u, backgroundColor: '#ffffffcc' }}>
              <Text style={{ color: '#1d2b3a', fontFamily: F.display, fontSize: 7.5 * u, letterSpacing: 0.8 * u }} numberOfLines={1}>
                {(ek.marka ?? '').toLocaleUpperCase()}
              </Text>
            </View>,
          )}
          {at({ left: 70 * u, top: 60 * u }, <Icon name="bottle-soda-classic" size={14 * u} color="#e63946" />)}
        </>
      );
      break;
  }
  const flt = PHOTO_FILTERS[p.filtre] ?? PHOTO_FILTERS[0];
  return (
    <View style={{ width: size, height: h, overflow: 'hidden', backgroundColor: '#000' }}>
      <Scene p={p} />
      {over}
      {flt.renk ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: flt.renk, opacity: flt.op }]} /> : null}
    </View>
  );
}

export const PhotoArt = memo(Base, (a, b) => a.size === b.size && (a.p === b.p || (!!a.p.id && a.p.id === b.p.id)));

const st = StyleSheet.create({
  center: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontFamily: F.display },
});
