// Yıl sonu ödül töreni: kategori kategori adaylar okunur, zarf açılır, kazanan sahneye çağrılır.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinear, Polygon, Stop } from 'react-native-svg';
import { awardCard } from '../share/build';
import { ShareButton } from '../share/ShareButton';
import { AwardTrophy } from './AwardArt';
import { Confetti } from './FightFx';
import { FadeIn, PopIn } from './anim';
import { FighterAvatar } from './FighterAvatar';
import { lookFor } from '../engine/tale';
import { money } from '../engine/career';
import type { AwardCat } from '../engine/awards';
import { sfx } from '../audio';
import { AWARD_NAMES, closeAwards, openEnvelope } from '../engine/awards';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { Button, Icon, Screen, SLANT } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

/** Kazanma anı: spot ışığı altında kupa yükselir, konfeti patlar, ödül ve gerekçe okunur. */
function WinMoment({ s, kat, yil, not, onClose }: { s: GameState; kat: AwardCat; yil: number; not?: string; onClose: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const [a] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(a, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.sequence([Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [a, bob]);
  const kayit = [...(s.oduller ?? [])].reverse().find((o) => o.kat === kat && o.yil === yil);
  return (
    <Modal animationType="fade" onRequestClose={onClose}>
      <View style={wm.root}>
        <LinearGradient colors={['#1c1405', '#07070a', '#020203']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <SvgLinear id="wmCone" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fff1c9" stopOpacity={0.35} />
              <Stop offset="1" stopColor="#fff1c9" stopOpacity={0} />
            </SvgLinear>
          </Defs>
          <Polygon points={`${W / 2 - 30},0 ${W / 2 + 30},0 ${W / 2 + W * 0.42},${H * 0.62} ${W / 2 - W * 0.42},${H * 0.62}`} fill="url(#wmCone)" />
        </Svg>
        <Confetti width={W} />
        <Text style={wm.kicker}>{L("{0}. YIL ÖDÜL TÖRENİ", [yil])}</Text>
        <Animated.View style={{ opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }, { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }}>
          <AwardTrophy kat={kat} size={Math.min(W * 0.62, 260)} />
        </Animated.View>
        <Animated.Text style={[wm.award, SLANT, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
          {AWARD_NAMES[kat]().toLocaleUpperCase(LOC)}
        </Animated.Text>
        <Text style={wm.winner}>
          {L("KAZANAN")}: {`${s.fighter.ad} ${s.fighter.soyad}`.toLocaleUpperCase(LOC)}
        </Text>
        {not ? <Text style={wm.note}>{not}</Text> : null}
        <View style={wm.chips}>
          {kayit?.para ? <Text style={[wm.chip, { color: C.green }]}>+{money(kayit.para)}</Text> : null}
          <Text style={[wm.chip, { color: C.gold }]}>{L("Popülerlik +{0}", [kat === 'dovuscu' ? 4 : 2])}</Text>
        </View>
        <View style={wm.btns}>
          <ShareButton data={awardCard(s, kat, yil, not)} label={L("Ödülünü paylaş")} />
          <Button label={L("Devam")} icon="arrow-right" tone="gold" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

/** Gala sahnesi: kadife perde, iki yana süpürülen spot ışıkları ve ortada sıradaki ödülün kupası. */
function GalaStage({ yil, kat, children }: { yil: number; kat: AwardCat | null; children?: ReactNode }) {
  const { width } = useWindowDimensions();
  const W = Math.min(width, 560) - 32;
  const H = 230;
  const [sweep] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([Animated.timing(sweep, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(sweep, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    const b = Animated.loop(Animated.sequence([Animated.timing(bob, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(bob, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [sweep, bob]);
  const beam = (side: 1 | -1) => (
    <Animated.View
      pointerEvents="none"
      style={[
        gs.beamWrap,
        { left: side < 0 ? W * 0.12 : W * 0.88, transform: [{ rotate: sweep.interpolate({ inputRange: [0, 1], outputRange: side < 0 ? ['-28deg', '6deg'] : ['28deg', '-6deg'] }) }] },
      ]}
    >
      <Svg width={120} height={H + 40}>
        <Defs>
          <SvgLinear id={`beam${side}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fff1c9" stopOpacity={0.32} />
            <Stop offset="1" stopColor="#fff1c9" stopOpacity={0} />
          </SvgLinear>
        </Defs>
        <Polygon points={`54,0 66,0 120,${H + 40} 0,${H + 40}`} fill={`url(#beam${side})`} />
      </Svg>
    </Animated.View>
  );
  return (
    <View style={[gs.stage, { width: W, minHeight: H }]}>
      <LinearGradient colors={['#2a0710', '#12060a', '#060608']} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
      {/* Perde kenarları */}
      <LinearGradient colors={['#5a0d1c', '#2a0710', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[gs.curtain, { left: 0 }]} />
      <LinearGradient colors={['transparent', '#2a0710', '#5a0d1c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[gs.curtain, { right: 0 }]} />
      {beam(-1)}
      {beam(1)}
      <Text style={[gs.kicker, SLANT]}>{L("{0}. YIL ÖDÜL TÖRENİ", [yil])}</Text>
      {kat ? (
        <Animated.View style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }}>
          <AwardTrophy kat={kat} size={120} />
        </Animated.View>
      ) : (
        <Icon name="trophy-award" size={64} color={C.gold} />
      )}
      {kat ? <Text style={[gs.cat, SLANT]}>{AWARD_NAMES[kat]().toLocaleUpperCase(LOC)}</Text> : null}
      {children}
      <View style={gs.floor} />
    </View>
  );
}

/** "Ve kazanan…": zarf döner, salon susar, sonra isim okunur. */
function Envelope({ onDone }: { onDone: () => void }) {
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    sfx('swell', 0.5);
    Animated.sequence([Animated.timing(a, { toValue: 1, duration: 900, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }), Animated.delay(650)]).start(() => onDone());
  }, [a, onDone]);
  return (
    <View style={gs.envWrap} pointerEvents="none">
      <Animated.View style={{ opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }, { rotateY: a.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '0deg'] }) }] }}>
        <LinearGradient colors={['#f7e3a3', '#d9b45a', '#a37a22']} style={gs.env}>
          <Icon name="email-open" size={34} color="#3a2606" />
        </LinearGradient>
      </Animated.View>
      <Animated.Text style={[gs.andThe, SLANT, { opacity: a }]}>{L("VE KAZANAN…")}</Animated.Text>
    </View>
  );
}

function Nominee({ ad, me, delay }: { ad: string; me: boolean; delay: number }) {
  return (
    <FadeIn delay={delay} style={[gs.nom, me && gs.nomMe]}>
      <FighterAvatar look={lookFor({ id: ad, uyruk: 'tr' })} size={38} ring={me ? C.red : '#3a3d45'} />
      <Text style={[gs.nomText, me && { color: C.text, fontFamily: F.display }]} numberOfLines={1}>
        {me ? `${ad} (${L("sen")})` : ad}
      </Text>
      {me ? <Icon name="account-star" size={16} color={C.red} /> : null}
    </FadeIn>
  );
}

export function AwardsCeremony({ s, act }: { s: GameState; act: Act }) {
  const t = s.odulToren;
  const [kutlama, setKutlama] = useState<{ kat: AwardCat; yil: number; not?: string } | null>(null);
  const [zarf, setZarf] = useState(false);
  if (!t) {
    return (
      <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act(closeAwards)} />}>
        <Text style={st.text}>{L("Tören sona erdi.")}</Text>
      </Screen>
    );
  }
  const me = `${s.fighter.ad} ${s.fighter.soyad}`;
  const done = t.acilan >= t.sonuclar.length;
  const cur = t.sonuclar[Math.min(t.acilan, t.sonuclar.length - 1)];
  const last = t.acilan > 0 ? t.sonuclar[t.acilan - 1] : null;
  const kazanilan = t.sonuclar.slice(0, t.acilan).filter((r) => r.oyuncu);
  const reveal = () => {
    const r = t.sonuclar[t.acilan];
    setZarf(false);
    sfx(r.oyuncu ? 'fanfare' : 'applause', r.oyuncu ? 1 : 0.6);
    buzz(r.oyuncu ? 'basari' : 'hafif');
    act(openEnvelope);
    if (r.oyuncu) setKutlama({ kat: r.kat, yil: t.yil, not: r.not });
  };
  return (
    <Screen
      footer={
        done ? (
          <Button label={L("Törenden ayrıl")} icon="exit-run" tone="gold" onPress={() => act(closeAwards)} />
        ) : (
          <Button label={L("Zarfı aç")} icon="email-open" tone="gold" disabled={zarf} onPress={() => setZarf(true)} />
        )
      }
    >
      <GalaStage yil={t.yil} kat={done ? null : cur.kat}>
        <View style={st.dots}>
          {t.sonuclar.map((r, i) => (
            <View key={r.kat} style={[st.dot, i < t.acilan && { backgroundColor: r.oyuncu ? C.gold : C.dim }, i === t.acilan && !done && { borderColor: C.gold }]} />
          ))}
        </View>
        {zarf ? <Envelope onDone={reveal} /> : null}
      </GalaStage>
      {kutlama ? <WinMoment s={s} kat={kutlama.kat} yil={kutlama.yil} not={kutlama.not} onClose={() => setKutlama(null)} /> : null}
      {last && !zarf ? (
        <PopIn key={`son${t.acilan}`} style={[st.result, { borderColor: last.oyuncu ? C.gold : C.border }]}>
          <Text style={st.cat}>{AWARD_NAMES[last.kat]().toLocaleUpperCase(LOC)}</Text>
          <Text style={[st.winner, SLANT, { color: last.oyuncu ? C.gold : C.text }]}>{last.oyuncu ? L("🏆 KAZANAN: SEN!") : `${L("Kazanan")}: ${last.kazanan}`}</Text>
          {last.oyuncu && last.not ? <Text style={st.note}>{last.not}</Text> : null}
          {!last.oyuncu && last.adaylar.includes(me) ? <Text style={st.note}>{L("Aday oldun ama bu yıl olmadı.")}</Text> : null}
        </PopIn>
      ) : null}
      {!done ? (
        <View style={st.card}>
          <Text style={st.label}>{L("ADAYLAR")}</Text>
          {cur.adaylar.map((a, i) => (
            <Nominee key={`${t.acilan}-${a}`} ad={a} me={a === me} delay={i * 120} />
          ))}
          {cur.adaylar.includes(me) && cur.not ? <Text style={st.note}>{cur.not}</Text> : null}
        </View>
      ) : (
        <View style={st.card}>
          <Text style={[st.winner, SLANT, { color: kazanilan.length ? C.gold : C.text }]}>{kazanilan.length ? L("Bu yıl {0} ödül kazandın!", [kazanilan.length]) : L("Bu yıl ödül çıkmadı. Seneye!")}</Text>
          {kazanilan.length ? (
            <View style={gs.shelf}>
              {kazanilan.map((r, i) => (
                <PopIn key={r.kat} delay={i * 180} style={{ alignItems: 'center', width: 84 }}>
                  <AwardTrophy kat={r.kat} size={72} />
                  <Text style={gs.shelfT} numberOfLines={2}>
                    {AWARD_NAMES[r.kat]()}
                  </Text>
                </PopIn>
              ))}
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const gs = StyleSheet.create({
  stage: { alignSelf: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#5a3a10', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 6, marginBottom: 12 },
  curtain: { position: 'absolute', top: 0, bottom: 0, width: 46 },
  beamWrap: { position: 'absolute', top: -10, marginLeft: -60, width: 120, alignItems: 'center' },
  kicker: { color: '#e8d08f', fontFamily: F.display, fontSize: 14, letterSpacing: 3 },
  cat: { color: C.gold, fontFamily: F.display, fontSize: 22, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 12, paddingHorizontal: 40 },
  floor: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 26, backgroundColor: '#000', opacity: 0.35 },
  envWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000c0', gap: 12 },
  env: { width: 120, height: 80, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff1c9' },
  andThe: { color: '#fff', fontFamily: F.display, fontSize: 26, letterSpacing: 2 },
  nom: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
  nomMe: { backgroundColor: '#2a0a10', borderWidth: 1, borderColor: '#5a1a22' },
  nomText: { flex: 1, color: C.dim, fontFamily: F.semi, fontSize: 14 },
  shelf: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 6 },
  shelfT: { color: C.dim, fontFamily: F.semi, fontSize: 11, textAlign: 'center' },
});

const wm = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  kicker: { color: '#d9c38a', fontFamily: F.display, fontSize: 14, letterSpacing: 3 },
  award: { color: C.gold, fontFamily: F.display, fontSize: 38, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 18 },
  winner: { color: '#fff', fontFamily: F.display, fontSize: 18, letterSpacing: 1, textAlign: 'center' },
  note: { color: C.dim, fontFamily: F.body, fontSize: 14, textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: { fontFamily: F.display, fontSize: 15, borderWidth: 1, borderColor: '#3a3d45', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, overflow: 'hidden' },
  btns: { alignSelf: 'stretch', gap: 8, marginTop: 14 },
});

const st = StyleSheet.create({
  stage: { borderRadius: 14, borderWidth: 1, borderColor: '#4a3810', padding: 16, alignItems: 'center', gap: 6, marginBottom: 12 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 20, letterSpacing: 1, textAlign: 'center' },
  sub: { color: C.dim, fontFamily: F.body, fontSize: 13, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: C.border },
  result: { borderWidth: 1.5, borderRadius: 14, padding: 14, gap: 4, marginBottom: 12, backgroundColor: C.card, alignItems: 'center' },
  card: { borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, gap: 8, backgroundColor: C.card },
  cat: { color: C.gold, fontFamily: F.display, fontSize: 14, letterSpacing: 1.5, textAlign: 'center' },
  label: { color: C.dim, fontFamily: F.semi, fontSize: 11 },
  nom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nomText: { color: C.dim, fontFamily: F.semi, fontSize: 14 },
  winner: { fontFamily: F.display, fontSize: 18, textAlign: 'center' },
  note: { color: C.dim, fontFamily: F.body, fontSize: 12, textAlign: 'center' },
  text: { color: C.text, fontFamily: F.body, fontSize: 14 },
});
