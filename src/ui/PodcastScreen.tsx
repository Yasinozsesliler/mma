// Podcast stüdyosu: sunucunun sorusu, cevap seçenekleri, tepki ve bölüm sonucu.
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLook } from '../lookPref';
import { SCENE_ART } from './sceneArt';
import { closePodcast, podcastAnswer } from '../engine/podcast';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Button, Icon, Screen, SLANT } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { CoverImage } from './CoverImage';
import { C, F } from './theme';

const HOST_LOOK = { ten: 1, sac: 'kel', sacRenk: 0, goz: 1, sakal: 'tam', yara: false, dovme: false } as const;

export function PodcastScreen({ s, act }: { s: GameState; act: Act }) {
  const yeni = useLook() === 'yeni';
  const p = s.podcast;
  if (!p) {
    return (
      <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
        <Text style={st.q}>{L("Davet artık geçerli değil.")}</Text>
      </Screen>
    );
  }
  const q = p.sorular[p.idx];
  return (
    <Screen footer={p.sonuc ? <Button label={L("Stüdyodan çık")} icon="exit-run" tone="gold" onPress={() => act(closePodcast)} /> : undefined}>
      <LinearGradient colors={['#1d1406', '#0b0b0e']} style={st.studio}>
        {yeni ? (
          <>
            <CoverImage source={SCENE_ART.studyo.src} iw={SCENE_ART.studyo.w} ih={SCENE_ART.studyo.h} />
            <LinearGradient colors={['rgba(8,8,12,0.35)', 'rgba(8,8,12,0.9)']} locations={[0, 0.6]} style={StyleSheet.absoluteFill} />
          </>
        ) : null}
        <View style={st.onair}>
          <View style={st.dot} />
          <Text style={st.onairText}>{L("YAYINDA")}</Text>
        </View>
        <Text style={[st.show, SLANT]}>{p.show}</Text>
        <View style={st.row}>
          <View style={st.side}>
            <FighterAvatar look={HOST_LOOK} size={64} ring={C.gold} />
            <Text style={st.name}>{p.host}</Text>
          </View>
          <Icon name="microphone-variant" size={34} color={C.gold} />
          <View style={st.side}>
            <FighterAvatar look={s.fighter.gorunum} size={64} ring={C.red} />
            <Text style={st.name}>{s.fighter.soyad}</Text>
          </View>
        </View>
        <View style={st.meters}>
          <Text style={st.meter}>{L("Gündem {0}", [p.hype])}</Text>
          <Text style={st.meter}>{L("Saygı {0}", [p.saygi])}</Text>
          <Text style={st.meter}>{L("Soru {0}/{1}", [Math.min(p.idx + 1, p.sorular.length), p.sorular.length])}</Text>
        </View>
      </LinearGradient>
      {p.son ? (
        <View style={st.react}>
          <Icon name="comment-quote-outline" size={16} color={C.gold} />
          <Text style={st.reactText}>{p.son}</Text>
        </View>
      ) : null}
      {p.sonuc ? (
        <View style={st.result}>
          <Text style={[st.resTitle, SLANT]}>{L("BÖLÜM YAYINLANDI")}</Text>
          <Text style={st.resText}>{p.sonuc}</Text>
        </View>
      ) : q ? (
        <>
          <View style={st.bubble}>
            <Text style={st.host}>{p.host}</Text>
            <Text style={st.q}>“{q.metin}”</Text>
          </View>
          {q.cevaplar.map((a, i) => (
            <Pressable
              key={a.metin}
              onPress={() => {
                buzz('hafif');
                act((x) => podcastAnswer(x, i));
              }}
              style={({ pressed }) => [st.ans, pressed && { borderColor: C.gold }]}
            >
              <Text style={st.ansText}>{a.metin}</Text>
              <Icon name="chevron-right" size={18} color={C.dim} />
            </Pressable>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  studio: { overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: '#3a2a10', padding: 14, gap: 10, marginBottom: 12 },
  onair: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: '#3a0a0f', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
  onairText: { color: C.red, fontFamily: F.display, fontSize: 11, letterSpacing: 2 },
  show: { color: C.gold, fontFamily: F.display, fontSize: 18, textAlign: 'center', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  side: { alignItems: 'center', gap: 4 },
  name: { color: C.text, fontFamily: F.semi, fontSize: 12 },
  meters: { flexDirection: 'row', justifyContent: 'space-around' },
  meter: { color: C.dim, fontFamily: F.semi, fontSize: 11 },
  bubble: { backgroundColor: '#17140c', borderWidth: 1, borderColor: '#3a2a10', borderRadius: 14, borderTopLeftRadius: 2, padding: 14, marginBottom: 10, gap: 4 },
  host: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  q: { color: C.text, fontFamily: F.semi, fontSize: 16, lineHeight: 22 },
  ans: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, marginBottom: 8 },
  ansText: { color: C.text, fontFamily: F.semi, fontSize: 14, flex: 1, lineHeight: 19 },
  react: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#15140f', borderRadius: 10, padding: 10, marginBottom: 10 },
  reactText: { color: C.text, fontFamily: F.body, fontSize: 13, flex: 1, lineHeight: 18 },
  result: { borderWidth: 1.5, borderColor: C.gold, borderRadius: 14, padding: 16, gap: 8, backgroundColor: C.card },
  resTitle: { color: C.gold, fontFamily: F.display, fontSize: 20, textAlign: 'center' },
  resText: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
