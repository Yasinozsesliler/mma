// Ana ekran kariyer kartının arka planı: kariyer aşamasına göre garaj salonu → bölgesel salon → büyük arena → dev arena.
// Sabit SVG (memo): yalnızca aşama değişince yeniden çizilir. Nefes alan dövüşçü yerel sürücüyle (JS iş parçacığını yormaz),
// hafif görüntü modunda kapalıdır.
import { memo, useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Polygon, Rect } from 'react-native-svg';
import type { Stage } from '../engine/types';
import { lowPerf } from '../perfPref';

export const StageBackdrop = memo(function StageBackdrop({ stage }: { stage: Stage }) {
  const cones = stage === 'amator' ? 0 : stage === 'bolgesel' ? 2 : 4;
  const gold = stage === 'ufc';
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 60" preserveAspectRatio="none" pointerEvents="none">
      {stage === 'amator' ? (
        <>
          {Array.from({ length: 6 }, (_, i) => (
            <Line key={i} x1={0} y1={8 + i * 8} x2={100} y2={8 + i * 8} stroke="#ffffff" strokeWidth={0.15} opacity={0.06} />
          ))}
          <Line x1={86} y1={0} x2={86} y2={7} stroke="#ffffff" strokeWidth={0.25} opacity={0.15} />
          <Circle cx={86} cy={8} r={6} fill="#ffd27a" opacity={0.06} />
          <Circle cx={86} cy={8} r={1.1} fill="#ffd27a" opacity={0.5} />
        </>
      ) : null}
      {Array.from({ length: cones }, (_, i) => {
        const x = 18 + (i * 64) / Math.max(1, cones - 1);
        return <Polygon key={i} points={`${x - 2},0 ${x + 2},0 ${x + 12},60 ${x - 12},60`} fill={gold && i % 2 === 0 ? '#f2c14e' : '#fff6dc'} opacity={gold ? 0.06 : 0.04} />;
      })}
      {stage === 'buyuk' || gold
        ? Array.from({ length: gold ? 22 : 12 }, (_, i) => <Circle key={`l${i}`} cx={(100 / (gold ? 22 : 12)) * i + 2} cy={2 + (i % 3)} r={0.45} fill={gold && i % 3 === 0 ? '#ffe08a' : '#ffffff'} opacity={0.35} />)
        : null}
      {gold ? <Rect x={0} y={0} width={100} height={60} fill="#f2c14e" opacity={0.025} /> : null}
    </Svg>
  );
});

/** Dövüşçü boşta nefes alır: hafifçe büyüyüp küçülür (yerel sürücü, hafif modda sabit). */
export function Breathe({ children }: { children: ReactNode }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (lowPerf()) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}
