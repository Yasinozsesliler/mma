import { L, LOC } from '../i18n';
import { askReview } from '../review';
import { beltCard } from '../share/build';
import { ShareButton } from '../share/ShareButton';
import { announce } from '../announcer';
import { sfx } from '../audio';
import { buzz } from '../haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { endCelebration } from '../engine/career';
import { fullName } from '../engine/character';
import { ORGS, WEIGHT_CLASSES } from '../engine/data';
import { activeBelts, champLabel } from '../engine/legacy';
import type { GameState } from '../engine/types';
import { Belt } from './Belt';
import { Button, Screen, SLANT } from './components';
import { BeltOffer } from './PremiumCard';
import { DEFAULT_LOOK, FighterAvatar } from './FighterAvatar';
import { FrontWalker } from './WalkoutFront';
import { ArenaBackdrop } from './ArenaBackdrop';
import { playerKit } from '../cosmetics';
import { useLook } from '../lookPref';
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
  const yeni = useLook() === 'yeni';
  const { width: W } = useWindowDimensions();
  const champSize = Math.min(W * 0.46, 210);
  const scale = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
    sfx('fanfare');
    buzz('basari');
    const ad = fullName(s.fighter);
    const kim = s.fighter.lakap ? `${s.fighter.ad}, "${s.fighter.lakap}", ${s.fighter.soyad}` : ad;
    const t = setTimeout(
      () =>
        void announce(
          k.tur === 'savunma'
            ? L("Ve hâlâ… {0} sıklet şampiyonu… {1}!", [WEIGHT_CLASSES[k.siklet].ad, kim])
            : L("Ve yeni… {0} sıklet şampiyonu… {1}!", [WEIGHT_CLASSES[k.siklet].ad, kim]),
          9000,
        ),
      700,
    );
    return () => clearTimeout(t);
    // Kutlama açılışında bir kez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);
  const found = k.tur === 'cift' ? activeBelts(s).filter((b) => b.org === k.org) : activeBelts(s).filter((b) => b.org === k.org && b.siklet === k.siklet);
  // Kayıtta bulunamasa bile kutlamada kemer mutlaka görünür (takılı kemer görünümüyle çizilir).
  const belts = found.length ? found : [{ org: k.org, siklet: k.siklet }];
  const belt = found.find((b) => b.siklet === k.siklet);
  const sayi = k.sayi ?? belts.length;
  const baslik = k.tur === 'cift' ? `${champLabel(sayi).en}!` : k.tur === 'savunma' ? L("KEMER KORUNDU!") : L("YENİ ŞAMPİYON!");
  const alt =
    k.tur === 'cift'
      ? L("{0} tarihine geçtin: aynı anda {1} sıklette şampiyon!", [ORGS[k.org].ad, sayi])
      : k.tur === 'savunma'
        ? L("{0}. kemer savunması. Hükümdarlığın sürüyor.", [belt?.savunma ?? 1])
        : L("{0} {1} Sıklet Şampiyonu", [ORGS[k.org].ad, WEIGHT_CLASSES[k.siklet].ad]);
  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          <ShareButton data={beltCard(s)} label={L("Kemerini paylaş")} tone="gold" />
          <Button label={L("Kutlamayı bitir")} icon="arrow-right" tone="ghost" onPress={() => {
            act(endCelebration);
            void askReview();
          }} />
        </View>
      }
    >
      <Confetti />
      <LinearGradient colors={['#4a3508', '#140f04', 'rgba(4,4,5,0)']} style={cl.hero}>
        {yeni ? <ArenaBackdrop gold tint={null} dim={0.45} /> : null}
        {yeni ? <LinearGradient colors={['rgba(74,53,8,0.85)', 'rgba(20,15,4,0.2)', 'rgba(4,4,5,0.6)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" /> : null}
        <Text style={cl.kicker}>{ORGS[k.org].kisa} · {L("{0} Sıklet", [WEIGHT_CLASSES[k.siklet].ad]).toLocaleUpperCase(LOC)}</Text>
        <Text style={[cl.title, SLANT]}>{baslik}</Text>
        <Text style={cl.sub}>{alt}</Text>
        {yeni ? (
          <View style={cl.champ}>
            <LinearGradient colors={['rgba(255,214,120,0.16)', 'rgba(255,214,120,0)']} locations={[0.2, 1]} style={cl.champGlow} />
            <FrontWalker look={s.fighter.gorunum ?? DEFAULT_LOOK} kit={playerKit()} walking={false} size={champSize} seed={11} />
            {/* Kazanılan kemer belinde (takılı kemer görünümüyle) */}
            <View pointerEvents="none" style={{ position: 'absolute', top: champSize * 0.98 - champSize * 0.5 * (64 / 300) }}>
              <Belt org={k.org} siklet={k.siklet} width={champSize * 0.5} />
            </View>
          </View>
        ) : (
          <View style={{ marginVertical: 16 }}>
            <FighterAvatar look={s.fighter.gorunum} size={150} ring={C.gold} />
          </View>
        )}
        <Text style={[cl.name, SLANT]}>{fullName(s.fighter).toLocaleUpperCase(LOC)}</Text>
        <Animated.View style={{ transform: [{ scale }], marginTop: 18, alignItems: 'center', gap: 10 }}>
          {belts.map((b) => (
            <Belt key={`${b.org}-${b.siklet}`} org={b.org} siklet={b.siklet} width={320} />
          ))}
        </Animated.View>
        <Text style={cl.record}>
          
          {L("Profesyonel karne:")}{' '}{s.rekor.g}-{s.rekor.m}-{s.rekor.b} · {s.fighter.yas} {L("yaş")}
        </Text>
      </LinearGradient>
      {k.org === 'ufc' && k.tur !== 'savunma' ? <BeltOffer /> : null}
    </Screen>
  );
}

const cl = StyleSheet.create({
  champ: { alignItems: 'center', marginVertical: 10 },
  champGlow: { position: 'absolute', top: 0, width: 260, height: 260, borderRadius: 130 },
  hero: { alignItems: 'center', paddingVertical: 24, marginHorizontal: -16, marginTop: -16, paddingHorizontal: 16 },
  kicker: { color: C.gold, fontFamily: F.display, fontSize: 13, letterSpacing: 3 },
  title: { color: '#fff', fontFamily: F.display, fontSize: 46, letterSpacing: 1, textAlign: 'center', textShadowColor: C.gold, textShadowRadius: 18 },
  sub: { color: C.text, fontFamily: F.semi, fontSize: 15, textAlign: 'center', marginTop: 4, lineHeight: 21 },
  name: { color: C.gold, fontFamily: F.display, fontSize: 24, textAlign: 'center' },
  record: { color: C.dim, fontFamily: F.semi, fontSize: 13, marginTop: 16 },
});
