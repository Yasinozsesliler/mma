// YOL Evreni ekranı: bütün modlardaki dövüşçülerin ve modlar arası karşılaşmalar.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { WEIGHT_CLASSES } from '../engine/data';
import type { EvrenDovuscu } from '../engine/universe';
import { L, LOC } from '../i18n';
import { useEvren, useEvrenLog } from '../universe';
import { Button, CageBg, Icon, Screen, SLANT } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F, R } from './theme';

export function UniverseScreen({ onExit }: { onExit: () => void }) {
  const all = useEvren();
  const log = useEvrenLog();
  const kariyer = all.filter((x) => x.kaynak === 'kariyer');
  const menajer = all.filter((x) => x.kaynak === 'menajer');
  const aktifK = kariyer.filter((x) => !x.emekli).length;
  return (
    <Screen footer={<Button label={L("Menüye dön")} icon="arrow-left" tone="ghost" onPress={onExit} />}>
      <LinearGradient colors={['#0b1a2e', '#0e0f12', '#08090b']} locations={[0, 0.6, 1]} style={u.hero}>
        <CageBg opacity={0.05} />
        <Icon name="earth" size={34} color={C.blue} />
        <Text style={[u.title, SLANT]}>{L("YOL EVRENİ")}</Text>
        <Text style={u.lead}>{L("Bütün modların aynı dünyada geçiyor. Kariyerindeki dövüşçülerin Menajer Modu'nda rakip olarak teklif edilir; Menajer Modu'ndaki dövüşçülerin de büyük ligde ve UCC'de kariyerinin karşısına çıkar.")}</Text>
        <View style={u.stats}>
          <Stat n={kariyer.length} label={L("KARİYER")} />
          <Stat n={menajer.length} label={L("MENAJER")} />
          <Stat n={log.length} label={L("ÇAPRAZ MAÇ")} />
        </View>
      </LinearGradient>

      <Text style={u.section}>{L("ÇAPRAZ MAÇLAR")}</Text>
      {log.length ? (
        log.slice(0, 15).map((o, i) => (
          <View key={i} style={[u.logRow, { borderLeftColor: o.kazandi ? C.green : C.red }]}>
            <Text style={u.logText}>{o.metin}</Text>
            <Text style={u.faint}>{new Date(o.t).toLocaleDateString(LOC)}</Text>
          </View>
        ))
      ) : (
        <Text style={u.empty}>
          {aktifK && menajer.length
            ? L("Henüz modlar arası maç yok. Büyük lige çıktıkça ve Menajer Modu'nda teklifler geldikçe dövüşçülerin karşılaşacak.")
            : L("Bağlantı için iki tarafta da dövüşçü gerekir: aktif bir kariyer ve Menajer Modu'nda aynı sıklette bir dövüşçü.")}
        </Text>
      )}

      <Text style={u.section}>{L("KARİYER DÖVÜŞÇÜLERİN")}</Text>
      {kariyer.length ? kariyer.map((x) => <Row key={x.id} x={x} />) : <Text style={u.empty}>{L("Henüz kariyerin yok.")}</Text>}

      <Text style={u.section}>{L("MENAJER MODU DÖVÜŞÇÜLERİN")}</Text>
      {menajer.length ? menajer.map((x) => <Row key={x.id} x={x} />) : <Text style={u.empty}>{L("Menajer Modu'nda ajans kurup dövüşçü imzaladığında burada görünürler.")}</Text>}
    </Screen>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={u.statN}>{n}</Text>
      <Text style={u.statL}>{label}</Text>
    </View>
  );
}

function Row({ x }: { x: EvrenDovuscu }) {
  const ring = x.kemer ? C.gold : x.kaynak === 'kariyer' ? C.red : C.blue;
  return (
    <View style={[u.row, x.emekli && { opacity: 0.6 }]}>
      <FighterAvatar look={x.look} size={44} ring={ring} />
      <View style={{ flex: 1 }}>
        <Text style={u.name} numberOfLines={1}>
          {x.kemer ? '🏆 ' : ''}
          {x.ad} {x.soyad}
        </Text>
        <Text style={u.faint} numberOfLines={1}>
          {x.rekor} · {WEIGHT_CLASSES[x.siklet].ad} · {x.nerede}
        </Text>
      </View>
      <Text style={[u.badge, { color: x.emekli ? C.faint : x.kaynak === 'kariyer' ? C.red : C.blue }]}>{x.emekli ? L("EMEKLİ") : x.guc ? L("GÜÇ {0}", [x.guc]) : ''}</Text>
    </View>
  );
}

const u = StyleSheet.create({
  hero: { borderRadius: R + 4, borderWidth: 1, borderColor: '#1d3a5a', padding: 16, alignItems: 'center', gap: 6, marginBottom: 12, overflow: 'hidden' },
  title: { color: C.text, fontFamily: F.display, fontSize: 28 },
  lead: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  stats: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 10 },
  statN: { color: C.text, fontFamily: F.display, fontSize: 22 },
  statL: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.4 },
  section: { color: C.text, fontFamily: F.display, fontSize: 14, letterSpacing: 1.5, marginTop: 8, marginBottom: 8 },
  empty: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19, marginBottom: 8 },
  logRow: { borderLeftWidth: 3, backgroundColor: C.card, borderRadius: R, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 6, gap: 2 },
  logText: { color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border, borderRadius: R + 2, padding: 10, marginBottom: 8, backgroundColor: C.card },
  name: { color: C.text, fontFamily: F.bold, fontSize: 14 },
  faint: { color: C.faint, fontFamily: F.body, fontSize: 11.5 },
  badge: { fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
});
