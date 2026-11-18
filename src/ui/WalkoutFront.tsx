// Yeni görünüm: kafese yürüyüş. Dövüşçü kameraya doğru önden yürür (HD yüz + önden gövde), arkasında siyah
// tişörtlü ekibi; yanlarda koridor bariyerleri. Klasik görünümde hiç çizilmez. Hafif kalsın diye yalnızca
// birkaç path ve tek bir sallanma animasyonu (native driver) kullanılır.
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Appearance } from '../engine/types';
import { HAIR_COLORS, shade, SKIN_TONES } from './avatarCore';
import { AvatarHD } from './avatarHD';
import type { Kit } from './rig';

/** Ekip üyesi: karanlıkta kalan yüz, siyah tişört. */
function Mate({ x, y, k, skin, hair, id }: { x: number; y: number; k: number; skin: string; hair: string; id: string }) {
  const d = shade(skin, -45);
  return (
    <G transform={`translate(${x} ${y}) scale(${k})`}>
      {/* gövde: siyah tişört, kollar */}
      <Path d="M-22 60 Q-24 30 -12 24 Q0 20 12 24 Q24 30 22 60 Z" fill="#101114" />
      <Path d="M-22 30 Q-30 44 -28 62 L-20 62 Q-20 46 -14 34 Z M22 30 Q30 44 28 62 L20 62 Q20 46 14 34 Z" fill="#0b0c0e" />
      <Path d="M-27 58 Q-29 70 -25 78 L-20 78 Q-21 68 -20 58 Z M27 58 Q29 70 25 78 L20 78 Q21 68 20 58 Z" fill={d} />
      <Path d="M-6 21 L6 21 L5 26 Q0 28 -5 26 Z" fill={d} />
      <Path d="M-12 24 Q0 30 12 24" stroke="#1f2126" strokeWidth={1.2} fill="none" />
      {/* baş */}
      <Ellipse cx={0} cy={8} rx={8} ry={10} fill={d} />
      <Ellipse cx={-8} cy={9} rx={1.6} ry={2.6} fill={shade(d, -10)} />
      <Ellipse cx={8} cy={9} rx={1.6} ry={2.6} fill={shade(d, -10)} />
      <Path d="M-8.2 6 Q-8 -3 0 -3 Q8 -3 8.2 6 Q6 1 0 1.5 Q-6 1 -8.2 6 Z" fill={hair} />
      <Path d="M-3.5 8 h2 M1.5 8 h2" stroke="#050505" strokeWidth={1} strokeLinecap="round" opacity={0.7} />
      <Ellipse cx={-3} cy={4} rx={3} ry={1.6} fill={`url(#${id})`} />
    </G>
  );
}

/** Önden dövüşçü gövdesi (viewBox içinde 0..100 genişlik, 0..150 yükseklik; baş ayrı bindirilir). */
function FrontBody({ look, kit, id }: { look: Appearance; kit: Kit; id: string }) {
  const skin = SKIN_TONES[look.ten] ?? SKIN_TONES[2];
  const L = shade(skin, 22);
  const D = shade(skin, -30);
  const DD = shade(skin, -58);
  const g = (n: string) => `url(#${id}${n})`;
  return (
    <G>
      <Defs>
        <LinearGradient id={`${id}skin`} x1="0" y1="0" x2="1" y2="0.4">
          <Stop offset="0" stopColor={L} />
          <Stop offset="0.45" stopColor={skin} />
          <Stop offset="1" stopColor={DD} />
        </LinearGradient>
        <LinearGradient id={`${id}arm`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={D} />
          <Stop offset="0.45" stopColor={skin} />
          <Stop offset="1" stopColor={DD} />
        </LinearGradient>
        <LinearGradient id={`${id}shorts`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={shade(kit.shorts, 30)} />
          <Stop offset="0.5" stopColor={kit.shorts} />
          <Stop offset="1" stopColor={shade(kit.shorts, -55)} />
        </LinearGradient>
        <RadialGradient id={`${id}glove`} cx="35%" cy="30%" r="70%">
          <Stop offset="0" stopColor={shade(kit.glove, 45)} />
          <Stop offset="1" stopColor={shade(kit.glove, -40)} />
        </RadialGradient>
      </Defs>
      {/* Kollar (gövdenin arkasından iner) */}
      <Path d="M23 46 Q13 60 14.5 80 Q13.5 93 16.5 106 L25.5 106 Q25 93 25.5 82 Q28.5 66 30 55 Z" fill={g('arm')} />
      <Path d="M77 46 Q87 60 85.5 80 Q86.5 93 83.5 106 L74.5 106 Q75 93 74.5 82 Q71.5 66 70 55 Z" fill={g('arm')} />
      <Path d="M17 64 Q19 72 18.5 80 M83 64 Q81 72 81.5 80" stroke={L} strokeWidth={1.6} fill="none" opacity={0.35} strokeLinecap="round" />
      <Path d="M16 82 Q19 84 24.5 82 M84 82 Q81 84 75.5 82" stroke={DD} strokeWidth={0.9} fill="none" opacity={0.45} />
      {/* Gövde */}
      <Path d="M41.5 36 L58.5 36 Q66 40.5 74 42.5 Q80.5 45 79.5 54 L72 62 Q70 80 66.5 98 L33.5 98 Q30 80 28 62 L20.5 54 Q19.5 45 26 42.5 Q34 40.5 41.5 36 Z" fill={g('skin')} />
      {/* Omuz başı ışığı, trapez gölgesi */}
      <Ellipse cx={25.5} cy={48} rx={5} ry={3.4} fill="#ffffff" opacity={0.13} />
      <Path d="M41.5 36 Q36 41 28 43 M58.5 36 Q64 41 72 43" stroke={DD} strokeWidth={1.2} fill="none" opacity={0.35} />
      {look.kadin ? (
        <>
          <Path d="M29.5 50 Q40 46.5 50 51 Q60 46.5 70.5 50 L69.5 64 Q50 70.5 30.5 64 Z" fill="#16181d" />
          <Path d="M33 50 L38 38.5 M67 50 L62 38.5" stroke="#16181d" strokeWidth={2.6} strokeLinecap="round" />
          <Path d="M30.5 64 Q50 70.5 69.5 64" stroke={kit.trim} strokeWidth={1.2} fill="none" opacity={0.8} />
        </>
      ) : (
        <>
          {/* Göğüs kası */}
          <Path d="M30.5 52 Q40 48.5 49 52.5 L49.2 62 Q40 66.5 31 61.5 Z" fill={L} opacity={0.18} />
          <Path d="M69.5 52 Q60 48.5 51 52.5 L50.8 62 Q60 66.5 69 61.5 Z" fill={DD} opacity={0.12} />
          <Path d="M31 61.5 Q40 66.8 49.2 62.2 M69 61.5 Q60 66.8 50.8 62.2" stroke={DD} strokeWidth={1.4} fill="none" opacity={0.45} strokeLinecap="round" />
          <Circle cx={40} cy={60.5} r={0.9} fill={shade(skin, -65)} opacity={0.6} />
          <Circle cx={60} cy={60.5} r={0.9} fill={shade(skin, -65)} opacity={0.6} />
        </>
      )}
      {/* Karın kasları: üç sıra, yumuşak gölge ve üst ışık */}
      {[69, 77.5, 86].map((y) => (
        <G key={y}>
          <Path d={`M42 ${y} q3.5 -1.2 7 0 l0 6.4 q-3.5 1 -7 0 Z M51 ${y} q3.5 -1.2 7 0 l0 6.4 q-3.5 1 -7 0 Z`} fill={L} opacity={0.12} />
          <Path d={`M42 ${y + 6.6} q3.5 1 7 0 M51 ${y + 6.6} q3.5 1 7 0`} stroke={DD} strokeWidth={0.9} fill="none" opacity={0.42} />
        </G>
      ))}
      <Path d="M50 64 L50 96" stroke={DD} strokeWidth={1} opacity={0.4} />
      <Path d="M34 70 Q38 82 40 96 M66 70 Q62 82 60 96" stroke={DD} strokeWidth={1.1} fill="none" opacity={0.35} />
      <Ellipse cx={50} cy={94} rx={0.9} ry={1.3} fill={DD} opacity={0.6} />
      {look.dovmeler?.includes('gogus') ? <Path d="M50 56 q-8 -6 -15 -2 q6 1 8 5 q3 -2 7 -3 Z M50 56 q8 -6 15 -2 q-6 1 -8 5 q-3 -2 -7 -3 Z" fill="#141418" opacity={0.7} /> : null}
      {look.dovmeler?.includes('kol') || look.dovme ? <Path d="M78 56 q4 8 3 18 M80 62 q2 3 1.5 7 M76 70 q3 2 3 6" stroke="#141418" strokeWidth={1.4} fill="none" opacity={0.7} /> : null}
      {/* Şort ve bel bandı */}
      <Path d="M33 99 L67 99 L71 150 L52 150 L50 128 L48 150 L29 150 Z" fill={g('shorts')} />
      <Rect x={32.6} y={95.5} width={34.8} height={5.4} rx={1} fill={kit.trim} />
      <Rect x={32.6} y={95.5} width={34.8} height={1.4} fill="#ffffff" opacity={0.25} />
      <Path d="M67 101 L71 150" stroke={shade(kit.shorts, -70)} strokeWidth={1.2} opacity={0.5} />
      {/* Eldivenler: bilek bandı ve yumruk */}
      {[21, 79].map((x) => (
        <G key={x}>
          <Rect x={x - 5.2} y={103} width={10.4} height={5} rx={1.2} fill="#f2f2f2" opacity={0.9} />
          <Rect x={x - 6.2} y={107.5} width={12.4} height={12} rx={4.5} fill={g('glove')} />
          <Path d={`M${x - 4.5} 111.5 h9 M${x - 4.5} 114.5 h9`} stroke={shade(kit.glove, -60)} strokeWidth={0.7} opacity={0.6} />
          <Ellipse cx={x - 2} cy={110} rx={2.4} ry={1.2} fill="#ffffff" opacity={0.25} />
        </G>
      ))}
    </G>
  );
}

/** Kameraya yürüyen dövüşçü ve ekibi. size: dövüşçünün genişliği (sahne genişliği bunun ~1.7 katı). */
export function FrontWalker({ look, kit, walking, size, seed = 1 }: { look: Appearance; kit: Kit; walking: boolean; size: number; seed?: number }) {
  const [bob] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!walking) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [walking, bob]);
  const VW = 170;
  const VH = 150;
  const w = (size * VW) / 100;
  const h = (size * VH) / 100;
  const id = `fw${seed}`;
  // Ekip: farklı ten ve saç tonları (sabit, tohuma göre)
  const mates = [
    { x: 16, y: 34, k: 0.95, t: (seed + 3) % SKIN_TONES.length, hc: (seed + 1) % 4 },
    { x: 154, y: 30, k: 1, t: (seed + 6) % SKIN_TONES.length, hc: (seed + 2) % 4 },
    { x: 124, y: 22, k: 0.8, t: (seed + 1) % SKIN_TONES.length, hc: seed % 4 },
    { x: 46, y: 20, k: 0.75, t: (seed + 4) % SKIN_TONES.length, hc: (seed + 3) % 4 },
  ];
  const headSize = (size * 58) / 100;
  return (
    <Animated.View style={{ width: w, height: h, transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.025] }) }] }}>
      <Svg width={w} height={h} viewBox={`0 0 ${VW} ${VH}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`${id}mate`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.12} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={`${id}fade`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#050506" stopOpacity={0} />
            <Stop offset="1" stopColor="#050506" stopOpacity={0.95} />
          </LinearGradient>
          <RadialGradient id={`${id}floor`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#000000" stopOpacity={0.7} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* ekip biraz karanlıkta kalsın */}
        <G opacity={0.78}>
          {mates.map((m, i) => (
            <Mate key={i} x={m.x} y={m.y} k={m.k} skin={SKIN_TONES[m.t]} hair={HAIR_COLORS[m.hc]} id={`${id}mate`} />
          ))}
        </G>
        <Ellipse cx={85} cy={146} rx={44} ry={6} fill={`url(#${id}floor)`} />
        <G transform="translate(35 0)">
          <FrontBody look={look} kit={kit} id={id} />
        </G>
        {/* alt kenar: kadraj dışına doğru kararır (keskin kesik görünmesin) */}
        <Rect x={0} y={118} width={VW} height={32} fill={`url(#${id}fade)`} />
      </Svg>
      {/* HD baş: boyun gövdeye oturacak şekilde */}
      <View style={{ position: 'absolute', left: (w - headSize) / 2, top: -headSize * 0.065 }} pointerEvents="none">
        <AvatarHD look={look} size={headSize} frame="bas" />
      </View>
    </Animated.View>
  );
}

/** Koridor bariyerleri: iki yanda metal korkuluk (perspektifli). */
export function Barricades({ w, h }: { w: number; h: number }) {
  const y = h * 0.5;
  const rail = (x0: number, x1: number, y0: number, y1: number, key: string) => (
    <G key={key}>
      <Path d={`M${x0} ${y0} L${x1} ${y1}`} stroke="#6b7280" strokeWidth={3} opacity={0.7} />
      <Path d={`M${x0} ${y0 + 26} L${x1} ${y1 + 12}`} stroke="#4b5563" strokeWidth={2.4} opacity={0.7} />
      {Array.from({ length: 9 }, (_, i) => {
        const t = i / 8;
        const x = x0 + (x1 - x0) * t;
        const yy = y0 + (y1 - y0) * t;
        const len = 26 + (12 - 26) * t;
        return <Path key={i} d={`M${x} ${yy} L${x} ${yy + len}`} stroke="#5b6170" strokeWidth={1.6 - t * 0.8} opacity={0.6} />;
      })}
    </G>
  );
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      {rail(-10, w * 0.3, y + 70, y - 10, 'l')}
      {rail(w + 10, w * 0.7, y + 70, y - 10, 'r')}
    </Svg>
  );
}
