// Canlı yayın ekranı: CANLI etiketi, izleyici sayacı, akan sohbet, sıradaki an ve seçenekler; sonunda özet.
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLook } from '../lookPref';
import { SCENE_ART } from './sceneArt';
import { money } from '../engine/career';
import { closeStream, currentMoment, streamChoice } from '../engine/stream';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { Button, Icon, Screen, SLANT } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { CoverImage } from './CoverImage';
import { C, F } from './theme';

const TWITCH = '#9146ff';

export function StreamScreen({ s, act }: { s: GameState; act: Act }) {
  const yeni = useLook() === 'yeni';
  const y = s.yayin;
  if (!y) {
    return (
      <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act(closeStream)} />}>
        <Text style={st.text}>{L("Yayın kapandı.")}</Text>
      </Screen>
    );
  }
  const m = currentMoment(s);
  return (
    <Screen footer={y.bitti ? <Button label={L("Yayını kapat")} icon="close" tone="gold" onPress={() => act(closeStream)} /> : undefined}>
      <LinearGradient colors={['#1d1036', '#0b0814']} style={st.studio}>
        {yeni ? (
          <>
            <CoverImage source={SCENE_ART.studyo.src} iw={SCENE_ART.studyo.w} ih={SCENE_ART.studyo.h} />
            <LinearGradient colors={['rgba(8,8,12,0.35)', 'rgba(8,8,12,0.9)']} locations={[0, 0.6]} style={StyleSheet.absoluteFill} />
          </>
        ) : null}
        <View style={st.top}>
          <View style={st.live}>
            <View style={st.dot} />
            <Text style={st.liveText}>{y.bitti ? L("BİTTİ") : L("CANLI")}</Text>
          </View>
          <View style={st.viewers}>
            <Icon name="eye" size={14} color={C.text} />
            <Text style={st.viewText}>{y.izleyici.toLocaleString(LOC)}</Text>
          </View>
          <Text style={st.don}>💸 {money(y.bagis)}</Text>
        </View>
        <View style={st.cam}>
          <FighterAvatar look={s.fighter.gorunum} size={80} ring={TWITCH} />
          <Text style={[st.name, SLANT]}>{s.fighter.lakap || s.fighter.soyad}</Text>
          <Text style={st.progress}>{L("An {0}/{1}", [Math.min(y.idx + 1, y.anlar.length), y.anlar.length])}</Text>
        </View>
        <View style={st.chat}>
          {y.sohbet.map((c, i) => (
            <Text key={`${c}${i}`} style={[st.chatLine, i === 0 && { color: C.text }]} numberOfLines={1}>
              <Text style={{ color: ['#ff6b6b', '#4dabf7', '#69db7c', '#ffd43b', '#da77f2', '#ffa94d'][i % 6] }}>{['kafes_fan', 'mma_tr', 'jab88', 'nakavtcı', 'grappler', 'tribün'][i % 6]}: </Text>
              {c}
            </Text>
          ))}
        </View>
      </LinearGradient>
      {m ? (
        <>
          <View style={st.moment}>
            <Text style={st.momentText}>{m.soru(s)}</Text>
          </View>
          {m.secenekler.map((o, i) => (
            <Pressable
              key={i}
              onPress={() => {
                buzz('hafif');
                act((x) => streamChoice(x, i));
              }}
              style={({ pressed }) => [st.opt, pressed && { borderColor: TWITCH }]}
            >
              <Text style={st.optText}>{o.metin()}</Text>
              <Icon name="chevron-right" size={18} color={C.dim} />
            </Pressable>
          ))}
        </>
      ) : (
        <View style={st.result}>
          <Text style={[st.resTitle, SLANT]}>{L("YAYIN ÖZETİ")}</Text>
          <Text style={st.text}>{y.ozet}</Text>
        </View>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  studio: { overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: '#3a2466', padding: 12, gap: 10, marginBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#e63946', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  viewers: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  viewText: { color: C.text, fontFamily: F.display, fontSize: 14 },
  don: { color: C.gold, fontFamily: F.display, fontSize: 13 },
  cam: { alignItems: 'center', gap: 4, paddingVertical: 6 },
  name: { color: C.text, fontFamily: F.display, fontSize: 18 },
  progress: { color: C.dim, fontFamily: F.semi, fontSize: 11 },
  chat: { backgroundColor: '#00000066', borderRadius: 10, padding: 8, gap: 3, minHeight: 110 },
  chatLine: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  moment: { backgroundColor: '#1a1030', borderWidth: 1, borderColor: '#3a2466', borderRadius: 12, padding: 12, marginBottom: 8 },
  momentText: { color: C.text, fontFamily: F.semi, fontSize: 15, lineHeight: 21 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, marginBottom: 8 },
  optText: { color: C.text, fontFamily: F.semi, fontSize: 14, flex: 1 },
  result: { borderWidth: 1.5, borderColor: TWITCH, borderRadius: 14, padding: 16, gap: 8, backgroundColor: C.card },
  resTitle: { color: TWITCH, fontFamily: F.display, fontSize: 20, textAlign: 'center' },
  text: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
