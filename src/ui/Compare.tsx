import { StyleSheet, Text, View } from 'react-native';
import type { Stats } from '../engine/types';
import { STAT_KEYS, STAT_LABELS } from '../engine/types';
import { C, F } from './theme';

/** Oyuncu (kırmızı) ile rakibin (mavi) istatistiklerini yan yana gösterir. */
export function Compare({ me, opp, oppLabel = 'RAKİP' }: { me: Stats; opp: Stats; oppLabel?: string }) {
  return (
    <View style={{ marginTop: 10 }}>
      <View style={cm.head}>
        <Text style={[cm.headText, { color: C.red }]}>SEN</Text>
        <Text style={[cm.headText, { color: C.blue }]}>{oppLabel}</Text>
      </View>
      {STAT_KEYS.map((k) => {
        const a = me[k];
        const b = opp[k];
        return (
          <View key={k} style={cm.row}>
            <Text style={[cm.val, a > b && { color: C.text }]}>{a}</Text>
            <View style={[cm.track, { alignItems: 'flex-end' }]}>
              <View style={{ width: `${a}%`, height: '100%', backgroundColor: a >= b ? C.red : C.red + '55', borderRadius: 3 }} />
            </View>
            <Text style={cm.label}>{STAT_LABELS[k]}</Text>
            <View style={cm.track}>
              <View style={{ width: `${b}%`, height: '100%', backgroundColor: b >= a ? C.blue : C.blue + '55', borderRadius: 3 }} />
            </View>
            <Text style={[cm.val, { textAlign: 'right' }, b > a && { color: C.text }]}>{b}</Text>
          </View>
        );
      })}
    </View>
  );
}

const cm = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  headText: { fontFamily: F.display, fontSize: 11, letterSpacing: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 },
  val: { width: 24, color: C.faint, fontFamily: F.display, fontSize: 14 },
  track: { flex: 1, height: 6, backgroundColor: '#050506', borderRadius: 3, overflow: 'hidden' },
  label: { width: 70, textAlign: 'center', color: C.dim, fontFamily: F.semi, fontSize: 11 },
});
