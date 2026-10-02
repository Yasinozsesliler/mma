// Efsane ustalar: her biri bir teknik ve bir istatistik öğretir; pahalı, kariyerde bir kez.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LEGENDS, legendCostText, legendStatus, trainWithLegend } from '../engine/legends';
import { lookFor } from '../engine/tale';
import { techById } from '../engine/techniques';
import type { GameState } from '../engine/types';
import { STAT_LABELS } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Icon, Section } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { C, F } from './theme';

export function LegendPanel({ s, act }: { s: GameState; act: Act }) {
  const [msg, setMsg] = useState<string | null>(null);
  if (s.stage === 'amator') return null;
  return (
    <>
      <Section>{L("EFSANE USTALAR")}</Section>
      <Text style={st.hint}>{L("İki haftalık özel kamp: ustanın tekniği +2 seviye, uzmanlığı +1. Her usta kariyerde bir kez ders verir.")}</Text>
      {msg ? <Text style={st.msg}>{msg}</Text> : null}
      {LEGENDS.map((l) => {
        const done = (s.ustalar ?? []).includes(l.id);
        const stt = legendStatus(s, l);
        return (
          <View key={l.id} style={[st.card, done && { borderColor: C.green, opacity: 0.75 }]}>
            <FighterAvatar look={lookFor({ id: `efsane-${l.id}`, uyruk: l.uyruk })} size={52} ring={done ? C.green : C.gold} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={st.name}>
                {l.ad} <Text style={st.nick}>“{l.lakap}”</Text>
              </Text>
              <Text style={st.teach}>{L("Öğretir: {0} · {1} +1", [techById(l.teknik)?.ad ?? '', STAT_LABELS[l.stat]])}</Text>
              {!stt.ok && !done ? <Text style={st.why}>{stt.neden}</Text> : null}
            </View>
            {done ? (
              <Icon name="check-circle" size={22} color={C.green} />
            ) : (
              <Pressable
                disabled={!stt.ok}
                onPress={() => {
                  buzz('basari');
                  act((x) => setMsg(trainWithLegend(x, l.id)));
                }}
                style={[st.btn, !stt.ok && { opacity: 0.35 }]}
              >
                <Text style={st.btnText}>{L("DERS AL")}</Text>
                <Text style={st.cost}>{legendCostText(s, l)}</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </>
  );
}

const st = StyleSheet.create({
  hint: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginBottom: 8 },
  msg: { color: C.gold, fontFamily: F.semi, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, marginBottom: 8 },
  name: { color: C.text, fontFamily: F.display, fontSize: 14 },
  nick: { color: C.gold, fontFamily: F.semi, fontSize: 12 },
  teach: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  why: { color: C.orange, fontFamily: F.semi, fontSize: 11 },
  btn: { borderWidth: 1, borderColor: C.gold, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  btnText: { color: C.gold, fontFamily: F.display, fontSize: 12 },
  cost: { color: C.dim, fontFamily: F.semi, fontSize: 10 },
});
