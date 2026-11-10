// Tarihin en iyileri: tüm zamanlar rekor listesi ve merkezdeki kısa takip kartı.
import { StyleSheet, Text, View } from 'react-native';
import { rekorSatirlari, siradakiRekor } from '../engine/records';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { Card, Icon, SLANT } from './components';
import { C, F, R } from './theme';

export function RecordsList({ s }: { s: GameState }) {
  const rows = rekorSatirlari(s);
  return (
    <>
      <View style={st.head}>
        <Text style={[st.title, SLANT]}>{L("TARİHİN EN İYİLERİ")}</Text>
        <Text style={st.sub}>{s.stage === 'ufc' ? L("Yalnızca UCC maçları sayılır. Her efsaneyi geçince para ve popülerlik kazanırsın.") : L("UCC'ye çıktığında bu listede yarışmaya başlarsın.")}</Text>
      </View>
      {rows.map((r) => (
        <View key={r.id} style={st.card}>
          <View style={st.cardHead}>
            <Text style={st.cardTitle}>{r.ad}</Text>
            <Text style={st.value}>{r.deger}</Text>
          </View>
          {[...r.hedefler].reverse().map((h, i) => (
            <View key={h.ad} style={st.row}>
              <Text style={st.rank}>{i + 1}</Text>
              <Text style={[st.name, h.gecildi && st.done]} numberOfLines={1}>{h.ad}</Text>
              <Text style={[st.num, h.gecildi && st.done]}>{h.hedef}</Text>
              {h.gecildi ? <Icon name="check-circle" size={15} color={C.green} /> : <View style={{ width: 15 }} />}
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

/** Merkezde: geçmeye en yakın rekor (yalnızca UCC'de). */
export function RecordChase({ s }: { s: GameState }) {
  if (s.stage !== 'ufc') return null;
  const n = siradakiRekor(s);
  if (!n) return null;
  return (
    <Card>
      <Text style={st.kicker}>{L("SIRADAKİ REKOR")}</Text>
      <Text style={st.chase}>{n.ad}</Text>
      <Text style={st.sub}>{L("{0} geride kalsın diye {1} daha · Tüm zamanlar #{2}", [n.efsane, n.kalan, n.sira])}</Text>
    </Card>
  );
}

const st = StyleSheet.create({
  head: { marginBottom: 8 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 24 },
  sub: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  card: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 8 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 14 },
  value: { color: C.gold, fontFamily: F.display, fontSize: 22, marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  rank: { width: 16, color: C.faint, fontFamily: F.display, fontSize: 12 },
  name: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 13 },
  num: { color: C.dim, fontFamily: F.display, fontSize: 13 },
  done: { color: C.faint, textDecorationLine: 'line-through' },
  kicker: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 1.5 },
  chase: { color: C.gold, fontFamily: F.display, fontSize: 18, marginTop: 2 },
});
