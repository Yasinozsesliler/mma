// Ana ekranda haftalık etkinlik: tema, geri sayım, üç görev ve koleksiyon rozeti.
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import type { GameState } from '../engine/types';
import { claimTask, taskDone, taskProgress, taskReward, taskText, THEMES, timeLeft } from '../engine/weeklyEvent';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Icon, SLANT, type IconName } from './components';
import { C, F } from './theme';

export function EventCard({ s, act }: { s: GameState; act: (fn: (s: GameState) => void) => void }) {
  const ev = s.etkinlik;
  if (!ev) return null;
  const th = THEMES[ev.tema];
  const all = ev.alinan.every(Boolean);
  return (
    <LinearGradient colors={th.renk} style={st.box}>
      <View style={st.head}>
        <View style={st.badge}>
          <Text style={{ fontSize: 22 }}>{th.rozet}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.kicker}>{L("HAFTALIK ETKİNLİK")}</Text>
          <Text style={[st.title, SLANT]}>{th.ad()}</Text>
        </View>
        <View style={st.timer}>
          <Icon name="clock-outline" size={13} color={C.gold} />
          <Text style={st.timerText}>{timeLeft()}</Text>
        </View>
      </View>
      <Text style={st.sub}>{th.alt()}</Text>
      {th.gorevler.map((_, i) => {
        const [a, b] = taskProgress(s, ev, i);
        const done = taskDone(s, ev, i);
        const claimed = ev.alinan[i];
        const r = taskReward(s, i);
        return (
          <View key={i} style={st.row}>
            <Icon name={(claimed ? 'check-circle' : done ? 'gift' : i === 2 ? 'star-circle-outline' : 'circle-outline') as IconName} size={18} color={claimed ? C.green : done ? C.gold : C.dim} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[st.task, claimed && { color: C.dim, textDecorationLine: 'line-through' }]}>{taskText(ev, i)}</Text>
              {!claimed ? (
                <View style={st.barRow}>
                  <View style={st.bar}>
                    <View style={{ width: `${Math.min(1, b ? a / b : 0) * 100}%`, height: '100%', backgroundColor: done ? C.gold : '#ffffff99', borderRadius: 3 }} />
                  </View>
                  <Text style={st.num}>{b > 1 && b < 100 ? `${a}/${b}` : ''}</Text>
                </View>
              ) : null}
            </View>
            {done && !claimed ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [st.claim, pressed && { opacity: 0.75 }]}
                onPress={() => {
                  buzz('basari');
                  act((x) => claimTask(x, i));
                }}
              >
                <Text style={st.claimTxt}>{L("AL")}</Text>
                <Text style={st.claimSub}>{money(r.para)}{r.puan ? ` +${r.puan}P` : ''}</Text>
              </Pressable>
            ) : !claimed ? (
              <Text style={st.reward}>{money(r.para)}</Text>
            ) : null}
          </View>
        );
      })}
      <View style={st.foot}>
        <Text style={st.footText}>
          {all ? L("{0} Rozet kazanıldı! Gelecek hafta yeni etkinlik.", [th.rozet]) : L("Üç görevi bitir, bu haftanın {0} rozetini kap. Kaçarsa bir daha gelmez!", [th.rozet])}
        </Text>
        <Text style={st.coll}>{L("Koleksiyon: {0}", [(s.rozetler ?? []).length])}</Text>
      </View>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  box: { borderRadius: 14, borderWidth: 1, borderColor: '#ffffff1f', padding: 12, gap: 9, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffffff26' },
  kicker: { color: C.gold, fontFamily: F.semi, fontSize: 10, letterSpacing: 1.5 },
  title: { color: C.text, fontFamily: F.display, fontSize: 17, letterSpacing: 1 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00000066', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  timerText: { color: C.gold, fontFamily: F.semi, fontSize: 11 },
  sub: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: -2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  task: { color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 17 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { flex: 1, height: 5, backgroundColor: '#00000066', borderRadius: 3, overflow: 'hidden' },
  num: { color: C.dim, fontFamily: F.semi, fontSize: 11, minWidth: 26, textAlign: 'right' },
  reward: { color: C.dim, fontFamily: F.semi, fontSize: 11 },
  claim: { backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  claimTxt: { color: '#1a1205', fontFamily: F.display, fontSize: 13, letterSpacing: 1 },
  claimSub: { color: '#3a2a08', fontFamily: F.semi, fontSize: 10 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#ffffff14', paddingTop: 8 },
  footText: { flex: 1, color: C.dim, fontFamily: F.body, fontSize: 11, lineHeight: 15 },
  coll: { color: C.gold, fontFamily: F.semi, fontSize: 11 },
});
