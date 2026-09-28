import { L } from '../i18n';
import { sfx } from '../audio';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Icon } from './components';
import { C, F, R } from './theme';

/** Yeni açılan başarımlar için üstten kayan kısa bildirim. */
export function AchievementToast({ items, onDone }: { items: string[]; onDone: () => void }) {
  const y = useRef(new Animated.Value(-120)).current;
  const key = items.join('|');
  useEffect(() => {
    if (!items.length) return;
    sfx('chime');
    y.setValue(-120);
    const anim = Animated.sequence([
      Animated.spring(y, { toValue: 0, friction: 7, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(y, { toValue: -140, duration: 260, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => finished && onDone());
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!items.length) return null;
  const hof = items.includes(L("HALL OF FAME"));
  return (
    <Animated.View pointerEvents="none" style={[ts.wrap, { transform: [{ translateY: y }] }]}>
      <LinearGradient colors={hof ? ['#f7d57a', '#c8902e'] : ['#231a07', '#0c0d10']} style={ts.box}>
        <Icon name={hof ? 'pillar' : 'trophy'} size={26} color={hof ? '#000' : C.gold} />
        <View style={{ flex: 1 }}>
          <Text style={[ts.kicker, hof && { color: '#3a2a07' }]}>{hof ? L("ONUR LİSTESİ") : items.length > 1 ? L("{0} BAŞARIM AÇILDI", [items.length]) : L("BAŞARIM AÇILDI")}</Text>
          <Text style={[ts.text, hof && { color: '#000' }]} numberOfLines={2}>
            {hof ? L("Hall of Fame’e seçildin!") : items.join(' · ')}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const ts = StyleSheet.create({
  wrap: { position: 'absolute', top: 58, left: 12, right: 12, zIndex: 50 },
  box: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R, borderWidth: 1, borderColor: C.gold, padding: 12, shadowColor: C.gold, shadowOpacity: 0.4, shadowRadius: 16 },
  kicker: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 1.5 },
  text: { color: C.text, fontFamily: F.display, fontSize: 16 },
});
