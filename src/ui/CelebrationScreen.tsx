import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { endCelebration } from '../engine/career';
import { fullName } from '../engine/character';
import { ORGS, WEIGHT_CLASSES } from '../engine/data';
import { activeBelts } from '../engine/legacy';
import type { GameState } from '../engine/types';
import { Belt } from './Belt';
import { Button, Screen, SLANT } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { C, F } from './theme';

const CONFETTI = ['#f2c14e', '#e63946', '#ffffff', '#3a86ff', '#f7d57a'];

function Confetti() {
  const { width } = Dimensions.get('window');
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        x: Math.random() * Math.min(width, 560),
        delay: Math.random() * 1400,
        dur: 2200 + Math.random() * 1800,
        color: CONFETTI[i % CONFETTI.length],
        size: 6 + Math.random() * 6,
        rot: Math.random() * 360,
      })),
    [width],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Piece key={i} {...p} />
      ))}
    </View>
  );
}

function Piece({ x, delay, dur, color, size, rot }: { x: number; delay: number; dur: number; color: string; size: number; rot: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(y, { toValue: 1, duration: dur, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [y, delay, dur]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: -20,
        width: size,
        height: size * 1.6,
        backgroundColor: color,
        opacity: 0.9,
        transform: [
          { translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, 900] }) },
          { rotate: y.interpolate({ inputRange: [0, 1], outputRange: [`${rot}deg`, `${rot + 540}deg`] }) },
        ],
      }}
    />
  );
}

export function CelebrationScreen({ s, act }: { s: GameState; act: Act }) {
  const k = s.kutlama!;
  const scale = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
  }, [scale]);
  const belts = k.tur === 'cift' ? activeBelts(s).filter((b) => b.org === k.org) : activeBelts(s).filter((b) => b.org === k.org && b.siklet === k.siklet);
  const belt = belts.find((b) => b.siklet === k.siklet);
  const baslik = k.tur === 'cift' ? 'DOUBLE CHAMP!' : k.tur === 'savunma' ? 'KEMER KORUNDU!' : 'YENİ ŞAMPİYON!';
  const alt =
    k.tur === 'cift'
      ? `${ORGS[k.org].ad} tarihine geçtin: aynı anda iki sıklette şampiyon!`
      : k.tur === 'savunma'
        ? `${belt?.savunma ?? 1}. kemer savunması. Hükümdarlığın sürüyor.`
        : `${ORGS[k.org].ad} ${WEIGHT_CLASSES[k.siklet].ad} Sıklet Şampiyonu`;
  return (
    <Screen footer={<Button label="Kutlamayı bitir" icon="arrow-right" tone="gold" onPress={() => act(endCelebration)} />}>
      <Confetti />
      <LinearGradient colors={['#4a3508', '#140f04', 'rgba(4,4,5,0)']} style={cl.hero}>
        <Text style={cl.kicker}>{ORGS[k.org].kisa} · {WEIGHT_CLASSES[k.siklet].ad.toLocaleUpperCase('tr-TR')} SIKLET</Text>
        <Text style={[cl.title, SLANT]}>{baslik}</Text>
        <Text style={cl.sub}>{alt}</Text>
        <View style={{ marginVertical: 16 }}>
          <FighterAvatar look={s.fighter.gorunum} size={150} ring={C.gold} />
        </View>
        <Text style={[cl.name, SLANT]}>{fullName(s.fighter).toLocaleUpperCase('tr-TR')}</Text>
        <Animated.View style={{ transform: [{ scale }], marginTop: 18, alignItems: 'center', gap: 10 }}>
          {belts.map((b) => (
            <Belt key={`${b.org}-${b.siklet}`} org={b.org} siklet={b.siklet} width={320} />
          ))}
        </Animated.View>
        <Text style={cl.record}>
          Profesyonel karne: {s.rekor.g}-{s.rekor.m}-{s.rekor.b} · {s.fighter.yas} yaş
        </Text>
      </LinearGradient>
    </Screen>
  );
}

const cl = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 24, marginHorizontal: -16, marginTop: -16, paddingHorizontal: 16 },
  kicker: { color: C.gold, fontFamily: F.display, fontSize: 13, letterSpacing: 3 },
  title: { color: '#fff', fontFamily: F.display, fontSize: 46, letterSpacing: 1, textAlign: 'center', textShadowColor: C.gold, textShadowRadius: 18 },
  sub: { color: C.text, fontFamily: F.semi, fontSize: 15, textAlign: 'center', marginTop: 4, lineHeight: 21 },
  name: { color: C.gold, fontFamily: F.display, fontSize: 24, textAlign: 'center' },
  record: { color: C.dim, fontFamily: F.semi, fontSize: 13, marginTop: 16 },
});
