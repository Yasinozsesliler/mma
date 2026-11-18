// TV yayını havası: raunt sonunda kafesin alt kısmında istatistik bandı (verilen hasar, kondisyon, knockdown, jüri).
// Sabit bir katman: yalnızca raunt arasında bir kez belirir (yerel sürücüyle solarak), her karede yeniden çizilmez.
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { FightState } from '../engine/types';
import { L, LOC } from '../i18n';
import { lowPerf } from '../perfPref';
import { SLANT } from './components';
import { C, F } from './theme';

function Row({ label, p, o, max = 100, suffix = '' }: { label: string; p: number; o: number; max?: number; suffix?: string }) {
  const pw = Math.max(0.04, Math.min(1, p / max));
  const ow = Math.max(0.04, Math.min(1, o / max));
  return (
    <View style={b.row}>
      <Text style={[b.val, { color: C.red, textAlign: 'left' }]}>
        {Math.round(p)}
        {suffix}
      </Text>
      <View style={[b.bar, { alignItems: 'flex-end' }]}>
        <View style={[b.fill, { width: `${pw * 100}%`, backgroundColor: C.red }]} />
      </View>
      <Text style={b.label}>{label}</Text>
      <View style={b.bar}>
        <View style={[b.fill, { width: `${ow * 100}%`, backgroundColor: C.blue }]} />
      </View>
      <Text style={[b.val, { color: C.blue, textAlign: 'right' }]}>
        {Math.round(o)}
        {suffix}
      </Text>
    </View>
  );
}

export function BroadcastBar({ fs, org }: { fs: FightState; org: string }) {
  const [op] = useState(() => new Animated.Value(lowPerf() ? 1 : 0));
  useEffect(() => {
    if (lowPerf()) return;
    Animated.timing(op, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [op]);
  return (
    <Animated.View pointerEvents="none" style={[b.wrap, { opacity: op }]}>
      <View style={b.head}>
        <View style={[b.tag, SLANT]}>
          <Text style={b.tagText}>{org.toLocaleUpperCase(LOC)}</Text>
        </View>
        <Text style={b.title}>{L("{0}. RAUNT SONU", [fs.raunt])}</Text>
        <View style={b.rounds}>
          {fs.rauntFarklari.map((d, i) => (
            <View key={i} style={[b.chip, { backgroundColor: d > 0 ? C.red : d < 0 ? C.blue : '#3a3d45' }]}>
              <Text style={b.chipText}>{`R${i + 1}`}</Text>
            </View>
          ))}
        </View>
      </View>
      <Row label={L("Verilen hasar")} p={fs.oHasar} o={fs.pHasar} />
      <Row label={L("Kondisyon")} p={fs.pKondisyon} o={fs.oKondisyon} />
      {fs.pKnockdown || fs.oKnockdown ? <Row label={L("Knockdown")} p={fs.pKnockdown} o={fs.oKnockdown} max={3} /> : null}
    </Animated.View>
  );
}

const b = StyleSheet.create({
  wrap: { position: 'absolute', left: 6, right: 6, bottom: 6, backgroundColor: 'rgba(5,6,9,0.86)', borderRadius: 6, borderWidth: 1, borderColor: '#2a2d35', paddingHorizontal: 10, paddingVertical: 7, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  tag: { backgroundColor: C.red, paddingHorizontal: 6, paddingVertical: 1 },
  tagText: { color: '#fff', fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
  title: { flex: 1, color: '#fff', fontFamily: F.display, fontSize: 12, letterSpacing: 1.2 },
  rounds: { flexDirection: 'row', gap: 3 },
  chip: { borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  chipText: { color: '#fff', fontFamily: F.display, fontSize: 9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  val: { width: 30, fontFamily: F.display, fontSize: 12 },
  bar: { flex: 1, height: 5, backgroundColor: '#1a1c22', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  label: { width: 92, textAlign: 'center', color: C.dim, fontFamily: F.semi, fontSize: 10.5 },
});
