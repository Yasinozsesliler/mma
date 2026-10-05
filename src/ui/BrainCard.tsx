// Doktor raporu: beyin hasarı eşiği aşılınca ana ekranda karar kartı.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { brainColor, brainLabel, brainOf, brainReport, chooseBrain } from '../engine/brain';
import { money } from '../engine/career';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { Button, Card, Icon } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

export function BrainCard({ s, act }: { s: GameState; act: Act }) {
  const [msg, setMsg] = useState<string | null>(null);
  const rep = brainReport(s);
  if (!rep) return msg ? <Text style={st.msg}>{msg}</Text> : null;
  const b = brainOf(s);
  return (
    <Card accent={brainColor(b)}>
      <View style={st.head}>
        <Icon name="brain" size={22} color={brainColor(b)} />
        <Text style={st.title}>{rep.baslik}</Text>
        <Text style={[st.level, { color: brainColor(b) }]}>
          {b}/100 · {brainLabel(b)}
        </Text>
      </View>
      <Text style={st.text}>{rep.metin}</Text>
      {rep.secenekler.map((o) => (
        <View key={o.key} style={{ marginTop: 8 }}>
          <Button
            label={o.maliyet ? `${o.ad} · ${money(o.maliyet)}` : o.ad}
            tone={o.key === 'devam' || o.key === 'lisans' ? 'ghost' : o.key === 'emekli' ? 'red' : 'gold'}
            disabled={!!o.maliyet && s.para < o.maliyet}
            onPress={() => act((x) => setMsg(chooseBrain(x, o.key)))}
          />
          <Text style={st.desc}>{o.aciklama}</Text>
        </View>
      ))}
    </Card>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  title: { flex: 1, color: C.text, fontFamily: F.display, fontSize: 18 },
  level: { fontFamily: F.bold, fontSize: 12 },
  text: { color: C.dim, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  desc: { color: C.faint, fontFamily: F.body, fontSize: 12, marginTop: 3, lineHeight: 16 },
  msg: { color: C.gold, fontFamily: F.semi, fontSize: 13, marginBottom: 8 },
});
