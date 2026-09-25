// Face to face sahnesi: rakibin hamlesi ve senin seçimin animasyonla oynar, sonra kim üstün geldiği gösterilir.
import { L } from '../i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { RIVAL_MOVES } from '../engine/camp';
import { lookFor } from '../engine/tale';
import type { GameState } from '../engine/types';
import { Icon, SLANT, upName } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F, R } from './theme';

type Bubble = { emoji: string; side: 'p' | 'o' | 'mid' } | null;

const t = (v: Animated.Value, to: number, ms = 260, easing = Easing.out(Easing.cubic)) => Animated.timing(v, { toValue: to, duration: ms, easing, useNativeDriver: true });
const seq = Animated.sequence;
const par = Animated.parallel;
const wait = Animated.delay;

export function FaceOffStage({ s }: { s: GameState }) {
  const k = s.pending.kamp!;
  const o = s.pending.rakip!;
  const v = useRef({
    pX: new Animated.Value(0),
    oX: new Animated.Value(0),
    pR: new Animated.Value(0),
    oR: new Animated.Value(0),
    pS: new Animated.Value(1),
    oS: new Animated.Value(1),
    shake: new Animated.Value(0),
    flash: new Animated.Value(0),
    bub: new Animated.Value(0),
    pTint: new Animated.Value(0),
    oTint: new Animated.Value(0),
    banner: new Animated.Value(0),
  }).current;
  const [bubble, setBubble] = useState<Bubble>(null);

  const shakeIt = (n = 4, amp = 6) => seq(Array.from({ length: n }, (_, i) => t(v.shake, i % 2 ? -amp : amp, 50, Easing.linear)).concat(t(v.shake, 0, 50)));
  const pop = (b: Bubble) => {
    setBubble(b);
    v.bub.setValue(0);
    return Animated.spring(v.bub, { toValue: 1, friction: 5, useNativeDriver: true });
  };
  const flash = () => seq([t(v.flash, 1, 60), t(v.flash, 0, 400)]);
  const home = () => par([t(v.pX, 0, 500), t(v.oX, 0, 500), t(v.pR, 0, 500), t(v.oR, 0, 500), t(v.pS, 1, 500), t(v.oS, 1, 500)]);

  const play = (anim: string): Animated.CompositeAnimation => {
    switch (anim) {
      // Rakibin ilk hamleleri
      case 'oppush':
        return seq([t(v.oX, -60, 180), par([t(v.pX, -35, 160), t(v.pR, -10, 160), shakeIt(3, 5), flash()]), wait(250), home()]);
      case 'forehead':
        return seq([par([t(v.pX, 42, 420), t(v.oX, -42, 420)]), shakeIt(6, 2), wait(300)]);
      case 'smirk':
        return seq([pop({ emoji: '😏', side: 'o' }), t(v.oR, 6, 300)]);
      case 'oppwhisper':
        return seq([t(v.oX, -50, 350), pop({ emoji: '💬', side: 'o' }), wait(300), t(v.pTint, 0.45, 300), home()]);
      // Senin hamlelerin
      case 'stare':
        return seq([par([t(v.pS, 1.08, 800), t(v.oS, 1.08, 800), t(v.pX, 20, 800), t(v.oX, -20, 800)]), flash(), par([t(v.oR, -14, 300), t(v.oX, 10, 300)]), pop({ emoji: '👀', side: 'p' })]);
      case 'stareLose':
        return seq([par([t(v.pS, 1.08, 800), t(v.oS, 1.08, 800), t(v.pX, 20, 800), t(v.oX, -20, 800)]), par([t(v.pR, 14, 250), t(v.pX, 0, 300)]), pop({ emoji: '😬', side: 'p' })]);
      case 'pushed':
        return seq([par([t(v.pX, 42, 380), t(v.oX, -42, 380)]), shakeIt(4, 3), par([t(v.pX, -30, 180), t(v.pR, -12, 180), t(v.oX, -60, 180), flash()]), pop({ emoji: '💢', side: 'o' })]);
      case 'brawl':
        return seq([par([t(v.pX, 45, 300), t(v.oX, -45, 300)]), par([flash(), shakeIt(10, 9)]), pop({ emoji: '💥', side: 'mid' }), par([t(v.pX, -20, 250), t(v.oX, 20, 250)])]);
      case 'yell':
        return seq([t(v.pX, 30, 250), pop({ emoji: '💢', side: 'p' }), seq([t(v.pS, 1.18, 120), t(v.pS, 1, 120), t(v.pS, 1.18, 120), t(v.pS, 1, 120)]), par([t(v.oX, 30, 200), t(v.oR, 10, 200), shakeIt(3, 3)])]);
      case 'laughed':
        return seq([t(v.pX, 30, 250), seq([t(v.pS, 1.15, 120), t(v.pS, 1, 120)]), pop({ emoji: '😂', side: 'o' }), seq([t(v.oR, -6, 150), t(v.oR, 6, 150), t(v.oR, 0, 150)])]);
      case 'whisper':
        return seq([t(v.pX, 48, 400), pop({ emoji: '💬', side: 'p' }), wait(250), t(v.oTint, 0.5, 400), home()]);
      case 'whisperBack':
        return seq([t(v.pX, 48, 400), wait(150), t(v.oX, -48, 300), pop({ emoji: '💬', side: 'o' }), t(v.pTint, 0.5, 400), home()]);
      case 'refuse':
        return seq([t(v.pX, 35, 350), pop({ emoji: '✋', side: 'o' }), par([t(v.oR, -16, 300), t(v.oX, 20, 300)])]);
      case 'pulled':
        return seq([par([t(v.pX, 35, 300), t(v.oX, -35, 300)]), t(v.pX, 55, 150), pop({ emoji: '🤬', side: 'p' }), t(v.pTint, 0.5, 300), home()]);
      case 'handshake':
        return seq([par([t(v.pX, 38, 400), t(v.oX, -38, 400)]), pop({ emoji: '🤝', side: 'mid' }), wait(400), home()]);
    }
    return wait(1);
  };

  const hamle = k.rakipHamle ? RIVAL_MOVES[k.rakipHamle] : undefined;
  const sonuc = k.yuzyuzeSonuc;

  // Rakibin ilk hamlesi sahneye girişte oynar.
  useEffect(() => {
    if (hamle && !sonuc) play(hamle.anim).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Seçimin sonucu gelince oynar, ardından sonuç bandı açılır.
  useEffect(() => {
    if (!sonuc) return;
    v.banner.setValue(0);
    seq([play(sonuc.anim), Animated.spring(v.banner, { toValue: 1, friction: 6, useNativeDriver: true })]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sonuc?.anim, sonuc?.baslik]);

  const rot = (a: Animated.Value) => a.interpolate({ inputRange: [-30, 30], outputRange: ['-30deg', '30deg'] });
  const winCol = sonuc?.kazanan === 'p' ? C.green : sonuc?.kazanan === 'o' ? '#ff4d5e' : C.gold;
  const bubbleLeft = bubble?.side === 'p' ? '14%' : bubble?.side === 'o' ? '66%' : '42%';

  return (
    <>
      <Animated.View style={{ transform: [{ translateX: v.shake }] }}>
        <LinearGradient colors={['#1a0508', '#060607']} style={fo.stage}>
          {/* Flaşlar */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: v.flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) }]} />
          <Animated.View style={{ transform: [{ translateX: v.pX }, { rotate: rot(v.pR) }, { scale: v.pS }] }}>
            <FighterAvatar look={s.fighter.gorunum} size={124} ring={C.red} />
            <Animated.View pointerEvents="none" style={[fo.tint, { opacity: v.pTint }]} />
          </Animated.View>
          <Text style={[fo.vs, SLANT]}>⚡</Text>
          <Animated.View style={{ transform: [{ translateX: v.oX }, { rotate: rot(v.oR) }, { scale: v.oS }, { scaleX: -1 }] }}>
            <FighterAvatar look={lookFor(o)} size={124} ring={C.blue} />
            <Animated.View pointerEvents="none" style={[fo.tint, { opacity: v.oTint }]} />
          </Animated.View>
          {bubble ? (
            <Animated.View pointerEvents="none" style={[fo.bubble, { left: bubbleLeft, opacity: v.bub, transform: [{ scale: v.bub }, { translateY: v.bub.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
              <Text style={fo.bubbleText}>{bubble.emoji}</Text>
            </Animated.View>
          ) : null}
        </LinearGradient>
      </Animated.View>
      <Text style={[fo.names, SLANT]}>
        {upName(s.fighter.soyad, s.fighter.uyruk)} <Text style={{ color: C.gold }}>vs</Text> {upName(o.soyad, o.uyruk)}
      </Text>

      {hamle && !sonuc ? (
        <View style={fo.rival}>
          <Icon name="alert" size={16} color="#ff4d5e" />
          <Text style={fo.rivalText}>
            <Text style={{ color: '#ff4d5e', fontFamily: F.display }}>{L("RAKİBİN HAMLESİ ·")}{' '}</Text>
            {hamle.metin(o.soyad)} {L("Nasıl karşılık vereceksin?")}
          </Text>
        </View>
      ) : null}

      {sonuc ? (
        <Animated.View style={{ opacity: v.banner, transform: [{ scale: v.banner.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}>
          <LinearGradient colors={[winCol + '26', '#0c0d10']} style={[fo.result, { borderColor: winCol }]}>
            <Text style={[fo.resultKicker, { color: winCol }]}>{sonuc.kazanan === 'p' ? L("ÜSTÜNLÜK SENDE") : sonuc.kazanan === 'o' ? L("ÜSTÜNLÜK RAKİPTE") : L("KİMSE GERİ ADIM ATMADI")}</Text>
            <Text style={[fo.resultTitle, SLANT]}>{sonuc.baslik}</Text>
            <Text style={fo.resultText}>{k.yuzyuze}</Text>
            <View style={fo.chips}>
              {sonuc.etkiler.map((e) => {
                const bad = (/^(Senin|Your) .*-\d/.test(e) || /^(Rakip|Opponent)\S* .*\+\d/.test(e) || /^(Popülerlik|Popularity) -/.test(e));
                const good = !bad && /[+-]\d/.test(e);
                const col = bad ? '#ff4d5e' : good ? C.green : C.gold;
                return (
                  <View key={e} style={[fo.chip, { borderColor: col + '88', backgroundColor: col + '14' }]}>
                    <Text style={[fo.chipText, { color: col }]}>{e}</Text>
                  </View>
                );
              })}
            </View>
          </LinearGradient>
        </Animated.View>
      ) : null}
    </>
  );
}

const fo = StyleSheet.create({
  stage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 26, paddingHorizontal: 14, borderRadius: R + 4, borderWidth: 1, borderColor: '#3a1a20', overflow: 'hidden', marginBottom: 8 },
  vs: { color: C.gold, fontFamily: F.display, fontSize: 30 },
  tint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999, backgroundColor: '#ff2a2a' },
  bubble: { position: 'absolute', top: 8, width: 56, height: 56, borderRadius: 28, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 8 },
  bubbleText: { fontSize: 30 },
  names: { color: C.text, fontFamily: F.display, fontSize: 20, textAlign: 'center', marginBottom: 10 },
  rival: { flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: '#ff4d5e55', backgroundColor: '#ff4d5e10', borderRadius: R, padding: 12, marginBottom: 10 },
  rivalText: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  result: { borderRadius: R + 2, borderWidth: 1, padding: 14, marginBottom: 8, alignItems: 'center' },
  resultKicker: { fontFamily: F.display, fontSize: 12, letterSpacing: 2.5 },
  resultTitle: { color: '#fff', fontFamily: F.display, fontSize: 30, lineHeight: 36, textAlign: 'center' },
  resultText: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 10 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontFamily: F.semi, fontSize: 12 },
});
