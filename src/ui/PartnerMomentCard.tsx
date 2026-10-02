// Kamp haftasında antrenman ortağıyla karar anı: ortağın portresi, bağ göstergesi, seçenekler ve sonuç.
import { StyleSheet, Text, View } from 'react-native';
import { bagLabel } from '../engine/partner';
import { lookFor } from '../engine/tale';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { Button } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F } from './theme';

export function PartnerMomentCard({ s, choose }: { s: GameState; choose: (v: string | number) => void }) {
  const p = s.kanka;
  const m = s.pending.kamp?.kankaAn;
  if (!p || !m) return null;
  const pct = (p.bag + 100) / 2;
  const renk = p.bag >= 60 ? C.green : p.bag >= 25 ? C.blue : p.bag > -15 ? C.dim : p.bag > -40 ? C.orange : C.red;
  return (
    <View style={[st.box, m.id === 'ihanet' && { borderColor: C.red }, m.id === 'koseci' && { borderColor: C.green }]}>
      <View style={st.head}>
        <FighterAvatar look={lookFor(p.o)} size={52} ring={renk} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={st.kicker}>{L("ANTRENMAN ORTAĞIN")}</Text>
          <Text style={st.name}>
            {p.o.ad} “{p.o.lakap}” {p.o.soyad}
          </Text>
          <View style={st.bagRow}>
            <View style={st.bar}>
              <View style={[st.fill, { width: `${pct}%`, backgroundColor: renk }]} />
            </View>
            <Text style={[st.bagText, { color: renk }]}>{bagLabel(p.bag)}</Text>
          </View>
        </View>
      </View>
      <Text style={st.text}>{m.metin}</Text>
      {m.sonuc ? (
        <>
          <Text style={st.result}>{m.sonuc}</Text>
          <Button label={L("Devam")} icon="arrow-right" tone="ghost" onPress={() => choose('kankaKapat')} />
        </>
      ) : (
        <View style={{ gap: 8 }}>
          {m.secenekler.map((o, i) => (
            <Button key={o} label={o} tone={i === 0 ? 'gold' : 'ghost'} onPress={() => choose(`kanka:${i}`)} />
          ))}
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.blue, borderRadius: 14, padding: 12, gap: 10, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kicker: { color: C.blue, fontFamily: F.semi, fontSize: 10, letterSpacing: 1.5 },
  name: { color: C.text, fontFamily: F.display, fontSize: 15 },
  bagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#1f2228', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  bagText: { fontFamily: F.semi, fontSize: 11, minWidth: 56, textAlign: 'right' },
  text: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  result: { color: C.gold, fontFamily: F.semi, fontSize: 13, lineHeight: 19 },
});
