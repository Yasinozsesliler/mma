// Kamp haftasında rakip kampından gelen haber: söylenti, karar ve sonuç. Gerçek maç gecesi ortaya çıkar.
import { StyleSheet, Text, View } from 'react-native';
import { lookFor } from '../engine/tale';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { Button, Icon } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F } from './theme';

export function RivalNewsCard({ s, choose }: { s: GameState; choose: (v: string | number) => void }) {
  const h = s.pending.kamp?.rakipHaber;
  const o = s.pending.rakip;
  if (!h || h.kapandi || !o) return null;
  return (
    <View style={st.box}>
      <View style={st.head}>
        <FighterAvatar look={lookFor(o)} size={52} ring={C.blue} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="incognito" size={14} color={C.orange} />
            <Text style={st.kicker}>{L("RAKİP KAMPINDAN HABER")}</Text>
          </View>
          <Text style={st.name}>
            {o.ad} “{o.lakap}” {o.soyad}
          </Text>
        </View>
      </View>
      <Text style={st.text}>{h.metin}</Text>
      {h.sonuc ? (
        <>
          <Text style={st.result}>{h.sonuc}</Text>
          <Text style={st.hint}>{L("Söylentinin doğru olup olmadığını maç gecesi göreceksin.")}</Text>
          <Button label={L("Devam")} icon="arrow-right" tone="ghost" onPress={() => choose('rakipKapat')} />
        </>
      ) : (
        <View style={{ gap: 8 }}>
          {h.secenekler.map((t, i) => (
            <Button key={t} label={t} tone={i === 0 ? 'gold' : 'ghost'} onPress={() => choose(`rakip:${i}`)} />
          ))}
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.orange, borderRadius: 14, padding: 12, gap: 10, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kicker: { color: C.orange, fontFamily: F.semi, fontSize: 10, letterSpacing: 1.5 },
  name: { color: C.text, fontFamily: F.display, fontSize: 15 },
  text: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  result: { color: C.gold, fontFamily: F.semi, fontSize: 13, lineHeight: 19 },
  hint: { color: C.faint, fontFamily: F.body, fontSize: 12 },
});
