// Dövüş ekranı efektleri: raunt başı yayın bandı ve maç sonucunun sinematik açılışı (konfeti, parlama, çarpma).
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { methodLabel } from '../engine/fight';
import type { FightResult } from '../engine/types';
import { L, LOC } from '../i18n';
import { C, F, R } from './theme';

/** Kafesin üstünden geçen "RAUNT 2" bandı; kendiliğinden kaybolur. */
export function RoundBanner({ raunt, max }: { raunt: number; max: number }) {
  const [a] = useState(() => new Animated.Value(0));
  const [gone, setGone] = useState(false);
  useEffect(() => {
    Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(a, { toValue: 2, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => setGone(true));
  }, [a]);
  if (gone) return null;
  const last = raunt === max && max > 1;
  const color = last ? C.red : C.gold;
  return (
    <View pointerEvents="none" style={rb.wrap}>
      <Animated.View style={[rb.flash, { opacity: a.interpolate({ inputRange: [0, 0.3, 1, 2], outputRange: [0, 0.35, 0, 0] }) }]} />
      <Animated.View
        style={[
          rb.band,
          {
            opacity: a.interpolate({ inputRange: [0, 0.4, 1.6, 2], outputRange: [0, 1, 1, 0] }),
            transform: [{ translateX: a.interpolate({ inputRange: [0, 1, 2], outputRange: [-420, 0, 420] }) }, { skewX: '-12deg' }],
          },
        ]}
      >
        <View style={[rb.stripe, { backgroundColor: color }]} />
        <Text style={rb.small}>{last ? L("SON RAUNT") : L("{0} / {1}", [raunt, max])}</Text>
        <Text style={[rb.big, { color }]}>{L("RAUNT {0}", [raunt])}</Text>
        <View style={[rb.stripe, { backgroundColor: color }]} />
      </Animated.View>
    </View>
  );
}

const CONFETTI = Array.from({ length: 26 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin((i + 1) * n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  return { x: (r(1) - 0.5) * 2, y: -0.4 - r(2) * 0.9, rot: r(3) * 720 - 360, c: [C.gold, '#ffffff', C.red, '#ffd98a'][i % 4], w: 5 + r(4) * 6, delay: r(5) * 160 };
});

export function Confetti({ width }: { width: number }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 1700, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [t]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {CONFETTI.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: width / 2,
            top: 70,
            width: p.w,
            height: p.w * 0.45,
            backgroundColor: p.c,
            opacity: t.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.x * width * 0.55] }) },
              { translateY: t.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, p.y * 140, p.y * 60 + 120] }) },
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/** Maç sonucu: yöntem başlığı çarparak gelir, kazanınca konfeti ve altın parlama. */
export function ResultReveal({ r }: { r: FightResult }) {
  const [a] = useState(() => new Animated.Value(0));
  const [shine] = useState(() => new Animated.Value(0));
  const [w, setW] = useState(340);
  useEffect(() => {
    Animated.spring(a, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([Animated.timing(shine, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.delay(1400), Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true })])).start();
  }, [a, shine]);
  const won = r.kazanan === 'p';
  const draw = r.kazanan === 'berabere';
  const finish = r.yontem === 'KO' || r.yontem === 'TKO';
  const headline = draw ? L("BERABERE") : finish ? L("NAKAVT!") : r.yontem === 'SUB' ? L("SUBMISSION!") : L("HAKEM KARARI");
  const colors: [string, string, string] = won ? ['#4a3508', '#1b1405', '#0a0805'] : draw ? ['#3a3a3a', '#151515', '#0a0a0a'] : ['#5a0d16', '#22070b', '#0a0405'];
  const accent = won ? C.gold : draw ? C.dim : C.red;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[rr.wrap, { borderColor: accent + '88' }]}>
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
      <Animated.View
        pointerEvents="none"
        style={[rr.shine, { transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-w, w * 1.2] }) }, { skewX: '-20deg' }] }]}
      >
        <LinearGradient colors={['transparent', 'rgba(255,255,255,0.12)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {won ? <Confetti width={w} /> : null}
      <Animated.Text numberOfLines={1} adjustsFontSizeToFit style={[rr.headline, { fontSize: headline.length > 9 ? 36 : 46, color: accent, opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) }, { skewX: '-8deg' }] }]}>
        {headline}
      </Animated.Text>
      <Animated.Text style={[rr.title, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
        {won ? L("KAZANDIN") : draw ? L("BERABERE") : L("KAYBETTİN")}
      </Animated.Text>
      <View style={[rr.meta, { borderColor: accent + '55' }]}>
        <Text style={rr.metaText}>
          {methodLabel(r.yontem).toLocaleUpperCase(LOC)} · R{r.raunt} · {r.sure}
        </Text>
      </View>
      {r.kartlar ? <Text style={rr.cards}>{L("Hakem kartları:")} {r.kartlar}</Text> : null}
    </View>
  );
}

const rb = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: R + 2 },
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff' },
  band: { width: '120%', alignItems: 'center', backgroundColor: 'rgba(5,5,7,0.88)', paddingVertical: 6 },
  stripe: { height: 3, alignSelf: 'stretch' },
  small: { color: '#cfd2d9', fontFamily: F.display, fontSize: 12, letterSpacing: 4, marginTop: 6 },
  big: { fontFamily: F.display, fontSize: 46, letterSpacing: 3, lineHeight: 52, marginBottom: 4 },
});

const rr = StyleSheet.create({
  wrap: { borderRadius: R + 2, borderWidth: 1, paddingVertical: 22, paddingHorizontal: 16, alignItems: 'center', marginTop: 4, marginBottom: 10, overflow: 'hidden' },
  shine: { position: 'absolute', top: 0, bottom: 0, width: 120 },
  headline: { fontFamily: F.display, fontSize: 46, letterSpacing: 2, lineHeight: 54, paddingHorizontal: 10, textShadowColor: '#000', textShadowRadius: 16 },
  title: { color: '#fff', fontFamily: F.display, fontSize: 22, letterSpacing: 6, marginTop: 2 },
  meta: { marginTop: 12, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,0.35)' },
  metaText: { color: '#e6e8ec', fontFamily: F.display, fontSize: 12, letterSpacing: 1.5 },
  cards: { color: 'rgba(255,255,255,0.7)', fontFamily: F.body, fontSize: 13, marginTop: 8 },
});
