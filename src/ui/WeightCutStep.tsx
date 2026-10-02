// Elle kilo verme ekranı: tartı göstergesi, enerji, zaman dilimleri ve eylemler.
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameState } from '../engine/types';
import { CUT_ACTIONS, CUT_SLOTS, cutLimit, slotName, type CutAction } from '../engine/weightCut';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Button, Icon, Screen, SLANT, type IconName } from './components';
import { C, F } from './theme';

export function WeightCutStep({ s, header, choose }: { s: GameState; header: ReactNode; choose: (v: string | number) => void }) {
  const c = s.pending.kamp!.kesim!;
  const limit = cutLimit(s);
  const done = c.dilim >= CUT_SLOTS;
  const over = c.fazla > 0;
  const enColor = c.enerji >= 75 ? C.green : c.enerji >= 50 ? C.gold : c.enerji >= 30 ? C.orange : C.red;
  return (
    <Screen footer={done ? <Button label={L("Tartıya çık")} icon="scale-bathroom" tone="gold" onPress={() => choose('tarti')} /> : undefined}>
      {header}
      <LinearGradient colors={['#14161c', '#0a0b0e']} style={st.scale}>
        <Text style={st.kicker}>{L("SON 48 SAAT · KİLO VERME")}</Text>
        <Text style={[st.kg, SLANT, { color: over ? C.red : C.green }]}>{(limit + c.fazla).toFixed(1)} kg</Text>
        <Text style={st.limit}>{over ? L("Limit {0} kg · {1} kg fazlan var", [limit, c.fazla.toFixed(1)]) : L("Limit {0} kg · tartıdasın ✅", [limit])}</Text>
        <View style={st.row}>
          <Text style={st.label}>{L("ENERJİ")}</Text>
          <View style={st.bar}>
            <View style={[st.fill, { width: `${c.enerji}%`, backgroundColor: enColor }]} />
          </View>
          <Text style={[st.val, { color: enColor }]}>{c.enerji}</Text>
        </View>
        <View style={st.slots}>
          {Array.from({ length: CUT_SLOTS }, (_, i) => (
            <View key={i} style={[st.slot, i < c.dilim && { backgroundColor: C.blue + '40', borderColor: C.blue }, i === c.dilim && !done && { borderColor: C.gold }]}>
              <Text style={[st.slotText, i === c.dilim && !done && { color: C.gold }]} numberOfLines={2}>
                {slotName(i)}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>
      {!done ? (
        <>
          <Text style={st.ask}>{L("{0}: ne yapacaksın?", [slotName(c.dilim)])}</Text>
          {(Object.keys(CUT_ACTIONS) as CutAction[]).map((a) => {
            const d = CUT_ACTIONS[a];
            const off = a === 'su' && c.suKesildi;
            return (
              <Pressable
                key={a}
                disabled={off}
                onPress={() => {
                  buzz(a === 'sauna' ? 'orta' : 'hafif');
                  choose(a);
                }}
                style={({ pressed }) => [st.act, off && { opacity: 0.35 }, pressed && { borderColor: C.gold }]}
              >
                <Icon name={d.icon as IconName} size={22} color={a === 'dinlen' ? C.green : a === 'sauna' ? C.red : C.blue} />
                <View style={{ flex: 1 }}>
                  <Text style={st.actName}>{d.ad()}</Text>
                  <Text style={st.actTip}>{d.ipucu()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={st.actKg}>{d.kg[0] > 0 ? `-${d.kg[0]}~${d.kg[1]} kg` : `+${-d.kg[1]}~${-d.kg[0]} kg`}</Text>
                  <Text style={[st.actEn, { color: d.enerji > 0 ? C.green : C.orange }]}>
                    {L("Enerji {0}", [d.enerji > 0 ? `+${d.enerji}` : d.enerji])}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </>
      ) : (
        <Text style={st.ask}>{over ? L("Süre doldu ve hâlâ fazlan var… Tartıda göreceğiz.") : L("Hazırsın. Tartıya çık!")}</Text>
      )}
      {c.log.length ? (
        <View style={st.log}>
          {c.log.map((l) => (
            <Text key={l} style={st.logText}>
              • {l}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={st.hint}>{L("Tartıyı geç ama enerjini de koru: 75+ enerjiyle taze çıkarsın, 30'un altı kafeste felaket.")}</Text>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  scale: { borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, alignItems: 'center', gap: 8, marginBottom: 12 },
  kicker: { color: C.gold, fontFamily: F.semi, fontSize: 11, letterSpacing: 2 },
  kg: { fontFamily: F.display, fontSize: 44 },
  limit: { color: C.dim, fontFamily: F.semi, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  label: { color: C.dim, fontFamily: F.semi, fontSize: 10, letterSpacing: 1 },
  bar: { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#1f2228', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  val: { fontFamily: F.display, fontSize: 15, minWidth: 30, textAlign: 'right' },
  slots: { flexDirection: 'row', gap: 6, alignSelf: 'stretch' },
  slot: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  slotText: { color: C.dim, fontFamily: F.semi, fontSize: 10, textAlign: 'center' },
  ask: { color: C.text, fontFamily: F.display, fontSize: 15, marginBottom: 8 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  actName: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  actTip: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  actKg: { color: C.text, fontFamily: F.display, fontSize: 12 },
  actEn: { fontFamily: F.semi, fontSize: 11 },
  log: { backgroundColor: C.card, borderRadius: 12, padding: 12, gap: 4, marginTop: 4 },
  logText: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  hint: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
});
