// Ortak küçük animasyonlar: sayarak değişen sayı, değişimde yükselip kaybolan fark etiketi, ekran girişi.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { F } from './theme';

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Hedef değişince eski değerden yeni değere sayar (ilk çizimde sayım yok, delay ile gecikmeli başlatılabilir). */
export function useCountUp(target: number, ms = 700, delay = 0, fromZero = false) {
  const [val, setVal] = useState(fromZero ? 0 : target);
  const prev = useRef(fromZero ? 0 : target);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (from === target) return;
    let raf = 0;
    let t0 = 0;
    const timer = setTimeout(() => {
      const tick = (now: number) => {
        if (!t0) t0 = now;
        const k = Math.min(1, (now - t0) / ms);
        setVal(from + (target - from) * easeOut(k));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, ms, delay]);
  return val;
}

/** Sayarak değişen metin; değer artınca yeşil, azalınca kırmızı yükselen fark etiketi gösterir. */
export function CountText({
  value,
  format,
  style,
  delta,
  ms = 700,
  delay = 0,
  fromZero,
  numberOfLines,
}: {
  value: number;
  format: (n: number) => string;
  style?: StyleProp<TextStyle>;
  /** Fark etiketi biçimi (verilmezse etiket yok) */
  delta?: (d: number) => string;
  ms?: number;
  delay?: number;
  fromZero?: boolean;
  numberOfLines?: number;
}) {
  const shown = useCountUp(value, ms, delay, fromZero);
  const [tag, setTag] = useState<{ d: number; k: number } | null>(null);
  const [a] = useState(() => new Animated.Value(0));
  const last = useRef(value);
  useEffect(() => {
    const d = value - last.current;
    last.current = value;
    if (!delta || !d) return;
    const k = Date.now();
    const t = setTimeout(() => {
      setTag({ d, k });
      a.setValue(0);
      Animated.timing(a, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }, 0);
    return () => clearTimeout(t);
  }, [value, delta, a]);
  return (
    <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
      <Text style={style} numberOfLines={numberOfLines} adjustsFontSizeToFit={!!numberOfLines}>
        {format(Math.round(shown))}
      </Text>
      {tag && delta ? (
        <Animated.Text
          pointerEvents="none"
          style={[
            an.tag,
            { color: tag.d > 0 ? '#3ecf7a' : '#ff4d5e', opacity: a.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) }] },
          ]}
        >
          {delta(tag.d)}
        </Animated.Text>
      ) : null}
    </View>
  );
}

/** Ekran girişi: hafif yukarı kayarak belirir (anahtar değişince yeniden oynar). */
export function FadeIn({ children, style, delay = 0, dy = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; delay?: number; dy?: number }) {
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 260, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a, delay]);
  return <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }] }]}>{children}</Animated.View>;
}

/** Sırayla beliren kutucuk: küçükten büyüyerek gelir. */
export function PopIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(a, { toValue: 1, delay, friction: 6, tension: 90, useNativeDriver: true }).start();
  }, [a, delay]);
  return <Animated.View style={[style, { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>{children}</Animated.View>;
}

const an = StyleSheet.create({
  tag: { position: 'absolute', right: 0, top: -12, fontFamily: F.bold, fontSize: 11 },
});
