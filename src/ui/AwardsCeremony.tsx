// Yıl sonu ödül töreni: kategori kategori adaylar okunur, zarf açılır, kazanan sahneye çağrılır.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinear, Polygon, Stop } from 'react-native-svg';
import { awardCard } from '../share/build';
import { ShareButton } from '../share/ShareButton';
import { AwardTrophy } from './AwardArt';
import { Confetti } from './FightFx';
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

export function AwardsCeremony({ s, act }: { s: GameState; act: Act }) {
  const t = s.odulToren;
  const [kutlama, setKutlama] = useState<{ kat: AwardCat; yil: number; not?: string } | null>(null);
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
  const won = t.sonuclar.slice(0, t.acilan).filter((r) => r.oyuncu).length;
  return (
    <Screen
      footer={
        done ? (
          <Button label={L("Törenden ayrıl")} icon="exit-run" tone="gold" onPress={() => act(closeAwards)} />
        ) : (
          <Button
            label={L("Zarfı aç")}
            icon="email-open"
            tone="gold"
            onPress={() => {
              const r = t.sonuclar[t.acilan];
              sfx(r.oyuncu ? 'fanfare' : 'applause', r.oyuncu ? 1 : 0.6);
              buzz(r.oyuncu ? 'basari' : 'hafif');
              act(openEnvelope);
              if (r.oyuncu) setKutlama({ kat: r.kat, yil: t.yil, not: r.not });
            }}
          />
        )
      }
    >
      <LinearGradient colors={['#2e2206', '#0b0b0e']} style={st.stage}>
        <Icon name="trophy-award" size={40} color={C.gold} />
        <Text style={[st.title, SLANT]}>{L("{0}. YIL ÖDÜL TÖRENİ", [t.yil])}</Text>
        <Text style={st.sub}>{L("Sezonun en iyileri ödüllerini alıyor. Bu yıl kaç kupa kaldıracaksın?")}</Text>
        <View style={st.dots}>
          {t.sonuclar.map((r, i) => (
            <View key={r.kat} style={[st.dot, i < t.acilan && { backgroundColor: r.oyuncu ? C.gold : C.dim }]} />
          ))}
        </View>
      </LinearGradient>
      {kutlama ? <WinMoment s={s} kat={kutlama.kat} yil={kutlama.yil} not={kutlama.not} onClose={() => setKutlama(null)} /> : null}
      {last ? (
        <View style={[st.result, { borderColor: last.oyuncu ? C.gold : C.border }]}>
          <Text style={st.cat}>{AWARD_NAMES[last.kat]().toLocaleUpperCase(LOC)}</Text>
          <Text style={[st.winner, SLANT, { color: last.oyuncu ? C.gold : C.text }]}>{last.oyuncu ? L("🏆 KAZANAN: SEN!") : `${L("Kazanan")}: ${last.kazanan}`}</Text>
          {last.oyuncu && last.not ? <Text style={st.note}>{last.not}</Text> : null}
          {!last.oyuncu && last.adaylar.includes(me) ? <Text style={st.note}>{L("Aday oldun ama bu yıl olmadı.")}</Text> : null}
        </View>
      ) : null}
      {!done ? (
        <View style={st.card}>
          <Text style={st.cat}>{AWARD_NAMES[cur.kat]().toLocaleUpperCase(LOC)}</Text>
          <Text style={st.label}>{L("Adaylar")}</Text>
          {cur.adaylar.map((a) => (
            <View key={a} style={st.nom}>
              <Icon name={a === me ? 'account-star' : 'account'} size={16} color={a === me ? C.red : C.dim} />
              <Text style={[st.nomText, a === me && { color: C.text, fontFamily: F.display }]}>{a === me ? `${a} (${L("sen")})` : a}</Text>
            </View>
          ))}
          {cur.adaylar.includes(me) && cur.not ? <Text style={st.note}>{cur.not}</Text> : null}
        </View>
      ) : (
        <View style={st.card}>
          <Text style={[st.winner, SLANT, { color: won ? C.gold : C.text }]}>{won ? L("Bu yıl {0} ödül kazandın!", [won]) : L("Bu yıl ödül çıkmadı. Seneye!")}</Text>
        </View>
      )}
    </Screen>
  );
}

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
