// Hikâye bölümü: kariyer hikâyelerinin adımları sinematik bir "bölüm" ekranında gösterilir (bölüm numarası,
// ilerleme noktaları, yavaşça beliren metin). Sonuçtan sonra "Devamı gelecek" ya da "Hikâye tamamlandı".
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { chooseEvent, closeEvent } from '../engine/events';
import { STORY_META, storyLength } from '../engine/stories';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { Button, Icon, Screen, Section, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

function FadeIn({ delay, children }: { delay: number; children: ReactNode }) {
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 600, delay, useNativeDriver: true }).start();
  }, [a, delay]);
  return <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>{children}</Animated.View>;
}

export function StoryChapter({ s, act }: { s: GameState; act: Act }) {
  const ev = s.pending.olay!;
  const [, id, adimStr] = ev.id.split(':');
  const adim = Number(adimStr) || 0;
  const meta = STORY_META[id] ?? { ad: L("HİKÂYE"), ikon: 'book-open-variant', renk: C.gold };
  const toplam = storyLength(id);
  // Seçimden sonra hikâye devam ediyorsa s.hikaye hâlâ bu hikâyeyi gösterir.
  const devam = !!ev.sonuc && s.hikaye?.id === id;
  const baslik = ev.baslik.replace(/^\S+\s/, '');
  useEffect(() => {
    sfx('swell', 0.35);
  }, []);
  return (
    <Screen footer={ev.sonuc ? <Button label={L("Devam")} icon="arrow-right" tone={devam ? 'red' : 'gold'} onPress={() => act(closeEvent)} /> : undefined}>
      <LinearGradient colors={[meta.renk + '33', '#0b0c0f']} style={st.hero}>
        <View style={[st.icon, { borderColor: meta.renk }]}>
          <Icon name={meta.ikon as IconName} size={30} color={meta.renk} />
        </View>
        <Text style={[st.series, { color: meta.renk }]}>{L("HİKÂYE")} · {meta.ad}</Text>
        <Text style={st.chapter}>{L("BÖLÜM {0}", [adim + 1])}</Text>
        <View style={st.dots}>
          {Array.from({ length: toplam }, (_, i) => (
            <View key={i} style={[st.dot, i < adim && { backgroundColor: meta.renk + '88' }, i === adim && { backgroundColor: meta.renk, width: 22 }]} />
          ))}
        </View>
        <Text style={st.title}>{baslik}</Text>
      </LinearGradient>

      <FadeIn delay={250}>
        <Text style={st.body}>{ev.metin}</Text>
      </FadeIn>

      {ev.sonuc ? (
        <FadeIn delay={0}>
          <View style={[st.result, { borderLeftColor: meta.renk }]}>
            <Text style={st.resultText}>{ev.sonuc}</Text>
          </View>
          <View style={st.endRow}>
            <View style={[st.line, { backgroundColor: devam ? C.border : meta.renk }]} />
            <Text style={[st.end, { color: devam ? C.faint : meta.renk }]}>{devam ? L("DEVAMI GELECEK…") : L("HİKÂYE TAMAMLANDI")}</Text>
            <View style={[st.line, { backgroundColor: devam ? C.border : meta.renk }]} />
          </View>
        </FadeIn>
      ) : (
        <FadeIn delay={700}>
          <View style={{ gap: 8, marginTop: 6 }}>
            {ev.secenekler.map((o, i) => (
              <Pressable key={i} onPress={() => act((x) => chooseEvent(x, i))} style={({ pressed }) => [st.choice, pressed && { borderColor: meta.renk, backgroundColor: '#1b1c22' }]}>
                <Text style={[st.choiceN, { color: meta.renk }]}>{i + 1}</Text>
                <Text style={st.choiceText}>{o}</Text>
                <Icon name="chevron-right" size={18} color={C.faint} />
              </Pressable>
            ))}
          </View>
        </FadeIn>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { marginHorizontal: -16, marginTop: -16, paddingTop: 28, paddingBottom: 20, paddingHorizontal: 16, alignItems: 'center', marginBottom: 16 },
  icon: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000055', marginBottom: 12 },
  series: { fontFamily: F.display, fontSize: 12, letterSpacing: 3 },
  chapter: { color: '#fff', fontFamily: F.display, fontSize: 40, letterSpacing: 2, marginTop: 2, transform: [{ skewX: '-8deg' }] },
  dots: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { width: 10, height: 4, borderRadius: 2, backgroundColor: '#2a2c33' },
  title: { color: C.text, fontFamily: F.bold, fontSize: 18, marginTop: 14, textAlign: 'center' },
  body: { color: C.text, fontFamily: F.body, fontSize: 16, lineHeight: 25, marginBottom: 14 },
  result: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, padding: 14 },
  resultText: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 21 },
  endRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  line: { flex: 1, height: 1 },
  end: { fontFamily: F.display, fontSize: 12, letterSpacing: 2.5 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, paddingVertical: 14, paddingHorizontal: 14 },
  choiceN: { fontFamily: F.display, fontSize: 18, width: 18, textAlign: 'center' },
  choiceText: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 14, lineHeight: 20 },
  jCard: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, padding: 12 },
  jHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  jTitle: { color: C.text, fontFamily: F.display, fontSize: 14, letterSpacing: 1 },
  jSub: { color: C.faint, fontFamily: F.body, fontSize: 12, marginTop: 1 },
  jStep: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  jStepN: { fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  jChoice: { color: C.text, fontFamily: F.semi, fontSize: 13, marginTop: 4 },
  jResult: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 18, marginTop: 3 },
});

/** Profil › Geçmiş: oynanan hikâyeler ve her bölümde verilen kararlar. */
export function StoryJournal({ s }: { s: GameState }) {
  const kayit = s.hikayeKayit ?? {};
  const ids = Object.keys(kayit);
  const [acik, setAcik] = useState<string | null>(null);
  if (!ids.length) return null;
  return (
    <>
      <Section>{L("HİKÂYE GÜNLÜĞÜ")}</Section>
      <View style={{ gap: 8, marginBottom: 12 }}>
        {ids.map((id) => {
          const k = kayit[id];
          const meta = STORY_META[id] ?? { ad: L("HİKÂYE"), ikon: 'book-open-variant', renk: C.gold };
          const open = acik === id;
          return (
            <Pressable key={id} onPress={() => setAcik(open ? null : id)} style={[st.jCard, { borderLeftColor: meta.renk }]}>
              <View style={st.jHead}>
                <Icon name={meta.ikon as IconName} size={20} color={meta.renk} />
                <View style={{ flex: 1 }}>
                  <Text style={st.jTitle}>{meta.ad}</Text>
                  <Text style={st.jSub}>
                    {k.bitti ? L("Tamamlandı") : L("Devam ediyor")} · {L("{0}/{1} bölüm", [k.bolumler.length, storyLength(id)])}
                  </Text>
                </View>
                <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.faint} />
              </View>
              {open
                ? k.bolumler.map((b, i) => (
                    <View key={i} style={st.jStep}>
                      <Text style={[st.jStepN, { color: meta.renk }]}>{L("BÖLÜM {0}", [i + 1])} · {b.baslik.replace(/^\S+\s/, '')}</Text>
                      {b.secim ? <Text style={st.jChoice}>➜ {b.secim}</Text> : null}
                      <Text style={st.jResult}>{b.sonuc}</Text>
                    </View>
                  ))
                : null}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
