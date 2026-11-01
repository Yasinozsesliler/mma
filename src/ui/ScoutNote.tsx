// Kamp planlarken: rakip son maçlarını izleyip senin silahına karşı çalıştıysa küçük bir uyarı kartı.
import { StyleSheet, Text, View } from 'react-native';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { Icon } from './components';
import { C, F } from './theme';

export function ScoutNote({ s }: { s: GameState }) {
  const a = s.pending.kamp?.analiz;
  if (!a) return null;
  return (
    <View style={st.box}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="video-vintage" size={14} color={C.orange} />
        <Text style={st.kicker}>{L("RAKİP SENİ ÇALIŞTI")}</Text>
      </View>
      <Text style={st.text}>{a.metin}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: C.card, borderWidth: 1, borderColor: C.orange, borderRadius: 12, padding: 10, gap: 6, marginBottom: 10 },
  kicker: { color: C.orange, fontFamily: F.semi, fontSize: 10, letterSpacing: 1.5 },
  text: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
});
