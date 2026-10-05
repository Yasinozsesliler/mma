// Yeni oyuncu için "İlk adımlar": temel döngüyü öğreten beş ödüllü adım (ilk maç, gelişim, mağaza, sosyal, profesyonel).
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import { claimStep, FIRST_STEPS, showFirstSteps, stepClaimable } from '../engine/onboarding';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Card, Icon } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

export function FirstStepsCard({ s, act }: { s: GameState; act: Act }) {
  const [msg, setMsg] = useState<string | null>(null);
  if (!showFirstSteps(s)) return msg ? <Text style={st.msg}>{msg}</Text> : null;
  const done = s.ilkAdim ?? [];
  // Sıradaki (alınmamış ve henüz yapılmamış) ilk adım vurgulanır
  const next = FIRST_STEPS.find((x) => !done.includes(x.id) && !x.ok(s));
  return (
    <Card accent={C.gold}>
      <View style={st.head}>
        <Icon name="flag-checkered" size={18} color={C.gold} />
        <Text style={st.title}>{L("İLK ADIMLAR")}</Text>
        <Text style={st.count}>
          {done.length}/{FIRST_STEPS.length}
        </Text>
      </View>
      {msg ? <Text style={st.msg}>{msg}</Text> : null}
      {FIRST_STEPS.map((x) => {
        const claimed = done.includes(x.id);
        const ready = stepClaimable(s, x);
        const focus = next?.id === x.id;
        return (
          <View key={x.id} style={[st.row, focus && st.rowFocus]}>
            <Icon name={claimed ? 'check-circle' : ready ? 'gift' : 'circle-outline'} size={18} color={claimed ? C.green : ready ? C.gold : C.faint} />
            <View style={{ flex: 1 }}>
              <Text style={[st.name, claimed && { color: C.faint, textDecorationLine: 'line-through' }]}>{x.ad()}</Text>
              {focus ? <Text style={st.tip}>{x.ipucu()}</Text> : null}
            </View>
            {ready ? (
              <Pressable
                onPress={() => {
                  buzz('basari');
                  act((g) => setMsg(claimStep(g, x.id)));
                }}
                style={st.claim}
              >
                <Text style={st.claimText}>{L("AL")}</Text>
              </Pressable>
            ) : (
              <Text style={st.reward}>{money(x.odul)}</Text>
            )}
          </View>
        );
      })}
    </Card>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  title: { flex: 1, color: C.gold, fontFamily: F.display, fontSize: 15, letterSpacing: 1 },
  count: { color: C.dim, fontFamily: F.bold, fontSize: 12 },
  msg: { color: C.gold, fontFamily: F.semi, fontSize: 13, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 6, borderRadius: 8 },
  rowFocus: { backgroundColor: 'rgba(242,193,78,0.08)' },
  name: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  tip: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: 1 },
  reward: { color: C.faint, fontFamily: F.bold, fontSize: 12 },
  claim: { backgroundColor: C.gold, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  claimText: { color: '#1f1605', fontFamily: F.display, fontSize: 13, letterSpacing: 1 },
});
