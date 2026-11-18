// Efsanelik Yolu: UCC kemerinden sonra kariyerin yeni hedefleri (savunma serisi, iki sıklet, P4P zirvesi, galibiyet, rekor).
// Yalnızca UCC'de ve en az bir UCC kemeri kazanıldıysa görünür. Ödül vermez; kemerden sonra ne kovalanacağını gösterir.
import { StyleSheet, Text, View } from 'react-native';
import { p4pRank } from '../engine/p4p';
import { rekorSatirlari } from '../engine/records';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { Card, Icon } from './components';
import { C, F } from './theme';

export function LegacyPath({ s }: { s: GameState }) {
  if (s.stage !== 'ufc' || s.efsane) return null;
  const belts = (s.kemerler ?? []).filter((b) => b.org === 'ufc');
  if (!belts.length) return null;
  const sav = Math.max(...belts.map((b) => b.savunma));
  const siklet = new Set(belts.map((b) => b.siklet)).size;
  const wins = s.gecmis.filter((h) => h.org === 'ufc' && h.sonuc === 'G').length;
  let p4p: number | null = null;
  try {
    p4p = p4pRank(s);
  } catch {
    p4p = null;
  }
  const rekor = rekorSatirlari(s).reduce((t, r) => t + r.gecilen, 0);
  const goals: { ad: string; deger: string; ok: boolean }[] = [
    { ad: L("5 kemer savunması"), deger: `${Math.min(sav, 5)}/5`, ok: sav >= 5 },
    { ad: L("İki sıklette UCC şampiyonu"), deger: `${Math.min(siklet, 2)}/2`, ok: siklet >= 2 },
    { ad: L("P4P 1 numarası"), deger: p4p ? `#${p4p}` : '–', ok: p4p === 1 },
    { ad: L("UCC'de 20 galibiyet"), deger: `${Math.min(wins, 20)}/20`, ok: wins >= 20 },
    { ad: L("Tüm zamanların bir efsanesini geç"), deger: `${rekor}`, ok: rekor >= 1 },
  ];
  const done = goals.filter((g) => g.ok).length;
  return (
    <Card accent={C.gold}>
      <View style={st.head}>
        <Icon name="crown" size={16} color={C.gold} />
        <Text style={st.kicker}>{L("EFSANELİK YOLU")}</Text>
        <Text style={st.count}>{`${done}/${goals.length}`}</Text>
      </View>
      {goals.map((g) => (
        <View key={g.ad} style={st.row}>
          <Icon name={g.ok ? 'check-circle' : 'circle-outline'} size={16} color={g.ok ? C.gold : C.faint} />
          <Text style={[st.ad, g.ok && { color: C.gold }]}>{g.ad}</Text>
          <Text style={st.val}>{g.deger}</Text>
        </View>
      ))}
      {done === goals.length ? <Text style={st.sub}>{L("Hepsini tamamladın. Artık sen bir efsanesin.")}</Text> : <Text style={st.sub}>{L("Kemer bir başlangıç. Tarihe geçmek için bunları kovala.")}</Text>}
    </Card>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  kicker: { flex: 1, color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5 },
  count: { color: C.gold, fontFamily: F.display, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  ad: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 13 },
  val: { color: C.dim, fontFamily: F.display, fontSize: 13 },
  sub: { color: C.faint, fontFamily: F.body, fontSize: 12, marginTop: 6 },
});
