// Ana ekranda kariyer hedefleri: kısa/orta/uzun vadeli üç hedef, ilerleme çubuğu ve "Ödülü al".
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import { claimGoal, goalDone, goalProgress, goalText, GOAL_ICONS, type GoalTier } from '../engine/goals';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Icon, type IconName } from './components';
import { C, F } from './theme';

const TIER: Record<GoalTier, { ad: () => string; renk: string }> = {
  kisa: { ad: () => L("KISA"), renk: C.green },
  orta: { ad: () => L("ORTA"), renk: C.blue },
  uzun: { ad: () => L("UZUN"), renk: C.orange },
};

export function GoalsCard({ s, act }: { s: GameState; act: (fn: (s: GameState) => void) => void }) {
  const list = s.hedefler?.list ?? [];
  if (!list.length) return null;
  return (
    <View style={st.box}>
      <View style={st.head}>
        <Icon name="bullseye-arrow" size={18} color={C.gold} />
        <Text style={st.title}>{L("HEDEFLER")}</Text>
        {s.hedefler!.tamam ? <Text style={st.count}>{L("{0} tamamlandı", [s.hedefler!.tamam])}</Text> : null}
      </View>
      {list.map((g) => {
        const [a, b] = goalProgress(s, g);
        const done = goalDone(s, g);
        const t = TIER[g.kat];
        const pct = Math.max(0, Math.min(1, b ? a / b : 0));
        const showNum = b > 1 && g.tur !== 'money' && g.tur !== 'followers';
        return (
          <View key={g.id} style={[st.row, done && st.rowDone]}>
            <View style={[st.ic, { borderColor: done ? C.gold : t.renk }]}>
              <Icon name={GOAL_ICONS[g.tur] as IconName} size={16} color={done ? C.gold : t.renk} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={st.line}>
                <Text style={[st.tier, { color: t.renk }]}>{t.ad()}</Text>
                <Text style={st.text} numberOfLines={2}>
                  {goalText(g)}
                </Text>
              </View>
              <View style={st.barRow}>
                <View style={st.bar}>
                  <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: done ? C.gold : t.renk, borderRadius: 3 }} />
                </View>
                {showNum ? <Text style={st.num}>{`${a}/${b}`}</Text> : null}
              </View>
              {!done ? (
                <Text style={st.reward}>
                  {L("Ödül: {0}", [money(g.odul.para)])}
                  {g.odul.puan ? L(" + {0} gelişim puanı", [g.odul.puan]) : ''}
                </Text>
              ) : null}
            </View>
            {done ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [st.claim, pressed && { opacity: 0.75 }]}
                onPress={() => {
                  buzz('basari');
                  act((x) => claimGoal(x, g.id));
                }}
              >
                <Text style={st.claimTxt}>{L("ÖDÜLÜ AL")}</Text>
                <Text style={st.claimSub}>{money(g.odul.para)}{g.odul.puan ? ` +${g.odul.puan}P` : ''}</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, gap: 10, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 14, letterSpacing: 1.5, flex: 1 },
  count: { color: C.dim, fontFamily: F.semi, fontSize: 11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowDone: { backgroundColor: '#1a150a', borderRadius: 10, marginHorizontal: -6, paddingHorizontal: 6, paddingVertical: 6 },
  ic: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  tier: { fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
  text: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 17 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { flex: 1, height: 6, backgroundColor: '#1f2228', borderRadius: 3, overflow: 'hidden' },
  num: { color: C.dim, fontFamily: F.semi, fontSize: 11, minWidth: 30, textAlign: 'right' },
  reward: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  claim: { backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, alignItems: 'center' },
  claimTxt: { color: '#1a1205', fontFamily: F.display, fontSize: 12, letterSpacing: 0.8 },
  claimSub: { color: '#3a2a08', fontFamily: F.semi, fontSize: 10 },
});
