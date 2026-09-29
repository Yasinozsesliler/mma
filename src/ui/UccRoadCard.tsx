// Büyük organizasyonda "UCC yolu": basamaklar, şu anki durum ve son hedef (DWCS daveti).
import { StyleSheet, Text, View } from 'react-native';
import { dwcsReady, UCC_STEPS } from '../engine/uccRoad';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { Icon } from './components';
import { C, F } from './theme';

export function UccRoadCard({ s }: { s: GameState }) {
  if (s.stage !== 'buyuk') return null;
  const done = new Set(s.uccYolu ?? []);
  const next = UCC_STEPS.findIndex((x) => !done.has(x.id) && !x.tamam(s));
  const ready = dwcsReady(s);
  return (
    <View style={st.box}>
      <View style={st.head}>
        <Icon name="road-variant" size={18} color={C.gold} />
        <Text style={st.title}>{L("UCC YOLU")}</Text>
        <Text style={st.now}>{L("Sıra {0} · Pop. {1} · Seri {2}", [s.sampiyon ? '🏆' : s.rank != null ? `#${s.rank}` : '—', s.populerlik, s.seri > 0 ? `+${s.seri}` : s.seri])}</Text>
      </View>
      {UCC_STEPS.map((x, i) => {
        const ok = done.has(x.id) || x.tamam(s);
        return (
          <View key={x.id} style={st.row}>
            <Icon name={ok ? 'check-circle' : i === next ? 'arrow-right-circle' : 'circle-outline'} size={16} color={ok ? C.green : i === next ? C.gold : C.faint} />
            <Text style={[st.step, ok && { color: C.dim, textDecorationLine: 'line-through' }, i === next && { color: C.text }]}>{x.ad(s)}</Text>
          </View>
        );
      })}
      <View style={st.row}>
        <Icon name="trophy" size={16} color={ready ? C.gold : C.faint} />
        <Text style={[st.step, { color: ready ? C.gold : C.faint }]}>
          {ready ? L("Dean Wyatt her an arayabilir: bir galibiyet daha ya da kontrat yenilemesi") : L("Son durak: Dean Wyatt's Challenger Series → UCC kontratı")}
        </Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: '#15120a', borderWidth: 1, borderColor: '#4a3810', borderRadius: 14, padding: 12, gap: 8, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 14, letterSpacing: 1.5, flex: 1 },
  now: { color: C.dim, fontFamily: F.semi, fontSize: 11 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  step: { flex: 1, color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
});
