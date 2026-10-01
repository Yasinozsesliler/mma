// Antrenman mini oyunlarının ortak parçaları: değerlendirme, geri bildirim, kısa ekran yazısı, ilerleme noktaları.
import { useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { sfx } from '../../audio';
import { buzz } from '../../haptics';
import { L } from '../../i18n';
import { SLANT } from '../components';
import { C, F } from '../theme';

export const ND = Platform.OS !== 'web';
// react-native-web dokunuşu varsayılan olarak 50 ms geciktirir; oyunda zamanlama için anında algılanmalı.
export const INSTANT = { delayPressIn: 0 } as object;
export const now = () => Date.now();
export const rnd = () => Math.random();
export const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type Judge = { puan: number; metin: string; renk: string };
export const judge = (ms: number, [a, b, c]: [number, number, number]): Judge =>
  ms <= a ? { puan: 100, metin: L("MÜKEMMEL"), renk: C.gold } : ms <= b ? { puan: 70, metin: L("İYİ"), renk: C.green } : ms <= c ? { puan: 40, metin: L("OLUR"), renk: C.blue } : { puan: 0, metin: L("KAÇTI"), renk: C.red };

export function feedbackFx(j: Judge) {
  if (j.puan >= 100) {
    sfx('heavy');
    buzz('guclu');
  } else if (j.puan > 0) {
    sfx('punch');
    buzz('hafif');
  } else {
    sfx('whoosh');
    buzz('hata');
  }
}

/** Yukarıda beliren kısa değerlendirme yazısı. */
export function useFlash(top = 48) {
  const [j, setJ] = useState<Judge | null>(null);
  const [v] = useState(() => new Animated.Value(0));
  const show = (x: Judge) => {
    setJ(x);
    v.setValue(1);
    Animated.timing(v, { toValue: 0, duration: 650, delay: 150, useNativeDriver: ND }).start();
  };
  const node = j ? (
    <Animated.Text pointerEvents="none" style={[cm.flash, SLANT, { top, color: j.renk, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] }) }] }]}>
      {j.metin}
    </Animated.Text>
  ) : null;
  return { show, node };
}

export function Progress({ done, total }: { done: number; total: number }) {
  return (
    <View style={cm.progress} pointerEvents="none">
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[cm.progDot, i < done && { backgroundColor: C.gold }]} />
      ))}
    </View>
  );
}

export const cm = StyleSheet.create({
  area: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: '#0b0c10', overflow: 'hidden', userSelect: 'none' } as object,
  flash: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontFamily: F.display, fontSize: 34, letterSpacing: 1, zIndex: 5 },
  hint: { position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', color: C.faint, fontFamily: F.body, fontSize: 12 },
  progress: { position: 'absolute', top: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5, zIndex: 4 },
  progDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#23252c' },
});

export const MISS = (): Judge => ({ puan: 0, metin: L("KAÇTI"), renk: C.red });
