// Profilde "Ödül Vitrini": yıl sonu ödüllerinin kupaları camlı rafta; kazanılmayanlar soluk silüet, kazanılanlarda
// kaç kez ve hangi yıllarda alındığı, altında ödüllerin listesi.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { AWARD_NAMES, type AwardCat } from '../engine/awards';
import type { GameState } from '../engine/types';
import { L, LOC } from '../i18n';
import { AwardTrophy } from './AwardArt';
import { Section } from './components';
import { C, F } from './theme';

const CATS: AwardCat[] = ['dovuscu', 'nakavt', 'dovus', 'yildiz'];

export function TrophyCabinet({ s }: { s: GameState }) {
  const list = s.oduller ?? [];
  return (
    <>
      <Section>{L("ÖDÜL VİTRİNİ")}</Section>
      <LinearGradient colors={['#17130b', '#0b0b0e']} style={st.case}>
        <View style={st.shelf}>
          {CATS.map((k) => {
            const won = list.filter((o) => o.kat === k);
            return (
              <View key={k} style={st.slot}>
                <View style={!won.length && st.ghost}>
                  <AwardTrophy kat={k} size={74} />
                </View>
                {won.length > 1 ? <Text style={st.count}>×{won.length}</Text> : null}
                <Text style={[st.name, !won.length && { color: C.faint }]} numberOfLines={2}>
                  {AWARD_NAMES[k]()}
                </Text>
                <Text style={st.years} numberOfLines={1}>
                  {won.length ? won.map((o) => (o.yil != null ? L("{0}. yıl", [o.yil]) : L("{0} yaş", [o.yas]))).join(', ') : L("Henüz yok")}
                </Text>
              </View>
            );
          })}
        </View>
        {/* Cam raf: parlak kenar ve yansıma */}
        <View style={st.glass} />
        {list.length ? (
          <View style={st.list}>
            {[...list].reverse().map((o, i) => (
              <View key={i} style={st.row}>
                <Text style={st.rowIcon}>🏆</Text>
                <View style={{ flex: 1 }}>
                  <Text style={st.rowTitle}>
                    {AWARD_NAMES[o.kat]().toLocaleUpperCase(LOC)} · {o.yil != null ? L("{0}. yıl", [o.yil]) : L("{0} yaş", [o.yas])}
                  </Text>
                  {o.not ? <Text style={st.rowNote}>{o.not}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={st.empty}>{L("Yıl sonu ödül törenlerinde kazandığın kupalar burada sergilenir. Bir yılda en az iki profesyonel maç yaparsan aday olabilirsin.")}</Text>
        )}
      </LinearGradient>
    </>
  );
}

const st = StyleSheet.create({
  case: { borderRadius: 14, borderWidth: 1, borderColor: '#3a2f17', padding: 12, marginBottom: 12 },
  shelf: { flexDirection: 'row', justifyContent: 'space-between' },
  slot: { width: '24%', alignItems: 'center' },
  ghost: { opacity: 0.18 },
  count: { position: 'absolute', top: 2, right: 2, color: '#111', backgroundColor: C.gold, fontFamily: F.display, fontSize: 11, paddingHorizontal: 5, borderRadius: 8, overflow: 'hidden' },
  name: { color: C.text, fontFamily: F.display, fontSize: 11, textAlign: 'center', marginTop: 2, letterSpacing: 0.3 },
  years: { color: C.gold, fontFamily: F.semi, fontSize: 10, textAlign: 'center', marginTop: 1 },
  glass: { height: 4, borderRadius: 2, backgroundColor: '#ffffff1f', marginTop: 8, borderTopWidth: 1, borderTopColor: '#ffffff40' },
  list: { marginTop: 10, gap: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  rowIcon: { fontSize: 15 },
  rowTitle: { color: C.text, fontFamily: F.display, fontSize: 13, letterSpacing: 0.5 },
  rowNote: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: 1 },
  empty: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: 'center' },
});
