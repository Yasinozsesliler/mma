// Ana ekranda özel gün etkinliği: tema, kalan gün, üç görev ve etkinliğe özel kozmetik ödülü.
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import { cosmeticById } from '../engine/cosmetics';
import { claimSpecial, daysLeft, SPECIALS, specialDone, specialProgress, specialTaskText } from '../engine/specialEvent';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Icon, SLANT } from './components';
import { C, F } from './theme';

const BASE: Record<GameState['stage'], number> = { amator: 500, bolgesel: 3_000, buyuk: 15_000, ufc: 40_000 };

export function SpecialEventCard({ s, act }: { s: GameState; act: (fn: (s: GameState) => void) => void }) {
  const ev = s.ozelEtkinlik;
  if (!ev) return null;
  const sp = SPECIALS[ev.id];
  const koz = cosmeticById(sp.kozmetik);
  return (
    <LinearGradient colors={sp.renk} style={st.box}>
      <View style={st.head}>
        <Text style={{ fontSize: 30 }}>{sp.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={st.kicker}>{L("ÖZEL ETKİNLİK · SINIRLI SÜRE")}</Text>
          <Text style={[st.title, SLANT]}>{sp.ad()}</Text>
        </View>
        <View style={st.timer}>
          <Icon name="calendar-clock" size={13} color={C.gold} />
          <Text style={st.timerText}>{L("{0} gün", [daysLeft(ev)])}</Text>
        </View>
      </View>
      <Text style={st.sub}>{sp.alt()}</Text>
      {sp.gorevler.map((_, i) => {
        const [a, b] = specialProgress(s, ev, i);
        const done = specialDone(s, ev, i);
        const got = ev.alinan[i];
        const odul = i < 2 ? money(BASE[s.stage] * (i + 1)) : koz ? L("🎁 {0}", [koz.ad]) : '🎁';
        return (
          <View key={i} style={st.row}>
            <Icon name={got ? 'check-circle' : done ? 'gift' : 'circle-outline'} size={18} color={got ? C.green : done ? C.gold : C.dim} />
            <View style={{ flex: 1 }}>
              <Text style={[st.task, got && { color: C.dim, textDecorationLine: 'line-through' }]}>{specialTaskText(ev, i)}</Text>
              {!got && b > 1 ? <Text style={st.prog}>{`${a}/${b}`}</Text> : null}
            </View>
            {done && !got ? (
              <Pressable
                style={({ pressed }) => [st.claim, pressed && { opacity: 0.75 }]}
                onPress={() => {
                  buzz('basari');
                  act((x) => claimSpecial(x, i));
                }}
              >
                <Text style={st.claimTxt}>{L("AL")}</Text>
              </Pressable>
            ) : (
              <Text style={[st.reward, i === 2 && { color: C.gold }]}>{odul}</Text>
            )}
          </View>
        );
      })}
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  box: { borderRadius: 14, borderWidth: 1.5, borderColor: '#f2c14e55', padding: 12, gap: 9, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kicker: { color: C.gold, fontFamily: F.semi, fontSize: 10, letterSpacing: 1.5 },
  title: { color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: 1 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00000066', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  timerText: { color: C.gold, fontFamily: F.semi, fontSize: 11 },
  sub: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: -2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  task: { color: C.text, fontFamily: F.semi, fontSize: 13 },
  prog: { color: C.dim, fontFamily: F.semi, fontSize: 11 },
  reward: { color: C.dim, fontFamily: F.semi, fontSize: 11, maxWidth: 120, textAlign: 'right' },
  claim: { backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  claimTxt: { color: '#1a1205', fontFamily: F.display, fontSize: 13 },
});
