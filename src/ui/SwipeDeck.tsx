import { L } from '../i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { swipe, type Candidate, type SwipeDir } from '../engine/nightlife';
import type { GameState } from '../engine/types';
import { Icon } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

const CARD_H = 400;
const THRESHOLD = 100;
export const TINDER = ['#fd267a', '#ff6036'] as const;

function ProfileCard({ c }: { c: Candidate }) {
  const renk = c.renk ?? ['#fd267a', '#ff6036'];
  return (
    <LinearGradient colors={renk} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={sw.card}>
      <View style={sw.photo}>
        <View style={sw.halo} />
        <Text style={sw.emoji}>{c.foto ?? c.emoji}</Text>
        {c.foto ? (
          <View style={sw.jobBadge}>
            <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
          </View>
        ) : null}
      </View>
      <View style={sw.uyum}>
        <Icon name="heart-pulse" size={13} color="#fff" />
        <Text style={sw.uyumText}>%{c.uyum} UYUM</Text>
      </View>
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']} style={sw.info}>
        <Text style={sw.name}>
          {c.ad} <Text style={sw.age}>{c.yas}</Text>
          {c.unlu ? <Text style={sw.star}> ✔︎</Text> : null}
        </Text>
        <View style={sw.metaRow}>
          <Icon name="briefcase-outline" size={14} color="#ddd" />
          <Text style={sw.meta}>
            {c.meslek}
            {c.unlu ? L(" · Ünlü") : ''}
          </Text>
        </View>
        <View style={sw.metaRow}>
          <Icon name="map-marker-outline" size={14} color="#ddd" />
          <Text style={sw.meta}>{c.mesafe ?? 5} {L("km uzakta")}</Text>
        </View>
        {c.bio ? <Text style={sw.bio}>{c.bio}</Text> : null}
        <View style={sw.chips}>
          {(c.ilgi ?? []).map((i) => (
            <View key={i} style={sw.chip}>
              <Text style={sw.chipText}>{i}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </LinearGradient>
  );
}

export function SwipeDeck({ s, act, onMatch }: { s: GameState; act: Act; onMatch: (c: Candidate) => void }) {
  const list = s.adaylar?.hafta === s.hafta ? s.adaylar.list : [];
  const top = list[0];
  const next = list[1];
  const superUsed = !!s.adaylar?.super;
  const pos = useRef(new Animated.ValueXY()).current;
  const busy = useRef(false);

  const fling = (dir: SwipeDir) => {
    const c = top;
    if (!c || busy.current) return;
    if (dir === 'super' && superUsed) return;
    busy.current = true;
    Animated.timing(pos, {
      toValue: { x: dir === 'sol' ? -520 : dir === 'sag' ? 520 : 0, y: dir === 'super' ? -700 : 30 },
      duration: 230,
      useNativeDriver: false,
    }).start(() => {
      let res: ReturnType<typeof swipe> = { eslesme: false };
      act((x) => {
        res = swipe(x, c.id, dir);
      });
      pos.setValue({ x: 0, y: 0 });
      busy.current = false;
      if (res.eslesme && res.aday) onMatch(res.aday);
    });
  };
  const flingRef = useRef(fling);
  flingRef.current = fling;

  const pan = useRef(
    PanResponder.create({
      // Yalnızca yatay sürüklemeler kartı oynatır; dikey kaydırma sayfayı kaydırmaya devam eder.
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => pos.setValue({ x: g.dx, y: g.dy * 0.3 }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > THRESHOLD || g.vx > 0.8) flingRef.current('sag');
        else if (g.dx < -THRESHOLD || g.vx < -0.8) flingRef.current('sol');
        else Animated.spring(pos, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () => Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(),
    }),
  ).current;

  const rotate = pos.x.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-14deg', '0deg', '14deg'] });
  const likeO = pos.x.interpolate({ inputRange: [0, THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeO = pos.x.interpolate({ inputRange: [-THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const superO = pos.y.interpolate({ inputRange: [-200, -40], outputRange: [1, 0], extrapolate: 'clamp' });
  const nextScale = pos.x.interpolate({ inputRange: [-300, 0, 300], outputRange: [1, 0.94, 1], extrapolate: 'clamp' });

  if (!top) {
    return (
      <View style={[sw.stack, sw.empty]}>
        <LinearGradient colors={TINDER} style={sw.emptyIcon}>
          <Icon name="fire" size={40} color="#fff" />
        </LinearGradient>
        <Text style={sw.emptyTitle}>{L("Bu haftalık profiller bitti")}</Text>
        <Text style={sw.emptyText}>{L("Çevrende yeni kimse kalmadı. Gelecek hafta yeni profiller gelecek. Bu arada eşleşmelerinle randevuya çıkabilirsin.")}</Text>
      </View>
    );
  }

  const webNoSelect = Platform.OS === 'web' ? ({ userSelect: 'none', touchAction: 'pan-y', cursor: 'grab' } as object) : {};

  return (
    <>
      <View style={sw.stack}>
        {next ? (
          <Animated.View style={[sw.layer, { transform: [{ scale: nextScale }] }]}>
            <ProfileCard c={next} />
          </Animated.View>
        ) : null}
        <Animated.View
          key={top.id}
          {...pan.panHandlers}
          style={[sw.layer, webNoSelect, { transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }]}
        >
          <ProfileCard c={top} />
          <Animated.View style={[sw.stamp, sw.stampLike, { opacity: likeO }]}>
            <Text style={[sw.stampText, { color: '#3ee07a' }]}>{L("BEĞEN")}</Text>
          </Animated.View>
          <Animated.View style={[sw.stamp, sw.stampNope, { opacity: nopeO }]}>
            <Text style={[sw.stampText, { color: '#ff4458' }]}>{L("GEÇ")}</Text>
          </Animated.View>
          <Animated.View style={[sw.stamp, sw.stampSuper, { opacity: superO }]}>
            <Text style={[sw.stampText, { color: '#3aa8ff' }]}>{L("SÜPER")}</Text>
          </Animated.View>
        </Animated.View>
      </View>

      <View style={sw.actions}>
        <Pressable onPress={() => fling('sol')} style={[sw.btn, { borderColor: '#ff4458' }]}>
          <Icon name="close" size={34} color="#ff4458" />
        </Pressable>
        <Pressable onPress={() => fling('super')} disabled={superUsed} style={[sw.btn, sw.btnSmall, { borderColor: '#3aa8ff' }, superUsed && { opacity: 0.3 }]}>
          <Icon name="star" size={24} color="#3aa8ff" />
        </Pressable>
        <Pressable onPress={() => fling('sag')} style={[sw.btn, { borderColor: '#3ee07a' }]}>
          <Icon name="heart" size={32} color="#3ee07a" />
        </Pressable>
      </View>
      <Text style={sw.hint}>
        
        {L("Sağa kaydır: beğen · Sola kaydır: geç · ⭐ Süper beğeni haftada 1 (")}{superUsed ? L("kullanıldı") : L("hazır")}{L(") · Bu hafta")}{' '}{list.length} {L("profil kaldı")}
      </Text>
    </>
  );
}

const sw = StyleSheet.create({
  stack: { height: CARD_H, marginBottom: 14 },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  card: { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  photo: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 34 },
  halo: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.14)', top: 26 },
  emoji: { fontSize: 104, lineHeight: 150 },
  jobBadge: { position: 'absolute', top: 140, left: '58%', width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  uyum: { position: 'absolute', top: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  uyumText: { color: '#fff', fontFamily: F.display, fontSize: 12, letterSpacing: 0.8 },
  info: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 36, paddingBottom: 14 },
  name: { color: '#fff', fontFamily: F.black, fontSize: 28 },
  age: { color: '#fff', fontFamily: F.body, fontSize: 26 },
  star: { color: '#3aa8ff', fontSize: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  meta: { color: '#e6e6e6', fontFamily: F.semi, fontSize: 14 },
  bio: { color: '#fff', fontFamily: F.body, fontSize: 13, lineHeight: 18, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  chipText: { color: '#fff', fontFamily: F.semi, fontSize: 12 },
  stamp: { position: 'absolute', top: 36, borderWidth: 4, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 2 },
  stampLike: { left: 22, borderColor: '#3ee07a', transform: [{ rotate: '-16deg' }] },
  stampNope: { right: 22, borderColor: '#ff4458', transform: [{ rotate: '16deg' }] },
  stampSuper: { alignSelf: 'center', left: '32%', top: 200, borderColor: '#3aa8ff', transform: [{ rotate: '-8deg' }] },
  stampText: { fontFamily: F.display, fontSize: 36, letterSpacing: 2 },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 22, marginBottom: 8 },
  btn: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111216' },
  btnSmall: { width: 52, height: 52, borderRadius: 26 },
  hint: { color: C.faint, fontFamily: F.body, fontSize: 12, textAlign: 'center', lineHeight: 17, marginBottom: 6 },
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 24, height: 320 },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { color: C.text, fontFamily: F.display, fontSize: 20, marginBottom: 6 },
  emptyText: { color: C.dim, fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
