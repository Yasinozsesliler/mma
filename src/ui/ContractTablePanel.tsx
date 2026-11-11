// Kontrat pazarlık masası paneli: organizasyonun sözü, sabır, ücret/bonus artırma ve rakip teklif kozu.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { leaveTable, leverageOf, tableAsk } from '../engine/contractTable';
import { ORGS } from '../engine/data';
import { canMarketResearch, claimMarketResearch } from '../engine/rewards';
import type { GameState, Offer } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { AdOffer } from './AdOffer';
import { Icon } from './components';
import { C, F } from './theme';

const RUH = { sicak: C.green, gergin: C.gold, kizgin: C.red, son: C.orange };

export function ContractTablePanel({ s, o, act, setMsg }: { s: GameState; o: Offer; act: (fn: (s: GameState) => void) => void; setMsg: (m: string | null) => void }) {
  const t = o.masa!;
  const other = leverageOf(s, o);
  const ask = (ne: 'ucret' | 'bonus' | 'koz') =>
    act((x) => {
      const r = tableAsk(x, o.id, ne);
      buzz(r ? 'hata' : 'hafif');
      if (r) setMsg(r);
    });
  return (
    <View style={st.box}>
      <View style={st.head}>
        <Icon name="handshake" size={16} color={C.gold} />
        <Text style={st.title}>{L("PAZARLIK MASASI")}</Text>
        <Text style={st.patLabel}>{L("Sabır")}</Text>
        {Array.from({ length: t.sabirMax }, (_, i) => (
          <View key={i} style={[st.pat, { backgroundColor: i < t.sabir ? RUH[t.ruh] : C.border }]} />
        ))}
      </View>
      <View style={[st.bubble, { borderColor: RUH[t.ruh] }]}>
        <Text style={st.bubbleText}>{t.mesaj}</Text>
      </View>
      {t.ipucu ? <Text style={st.hint}>{t.ipucu}</Text> : null}
      {canMarketResearch(o) ? (
        <AdOffer yer="piyasa" icon="chart-box-outline" title={L("Piyasa araştırması")} desc={L("Menajerin piyasayı tarasın: ücrette ve bonusta nereye kadar esneyeceklerini kesin öğren.")} onReward={() => act((x) => claimMarketResearch(x, o.id))} />
      ) : null}
      {t.ruh !== 'son' ? (
        <View style={st.row}>
          <Pressable style={({ pressed }) => [st.btn, pressed && { opacity: 0.7 }]} onPress={() => ask('ucret')}>
            <Text style={st.btnText}>{L("Ücret +%15")}</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [st.btn, pressed && { opacity: 0.7 }]} onPress={() => ask('bonus')}>
            <Text style={st.btnText}>{L("Bonus +%30")}</Text>
          </Pressable>
          {other && !t.kozKullanildi ? (
            <Pressable style={({ pressed }) => [st.btn, { borderColor: C.gold }, pressed && { opacity: 0.7 }]} onPress={() => ask('koz')}>
              <Text style={[st.btnText, { color: C.gold }]}>{L("{0} teklifini göster", [ORGS[other.org].kisa])}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Pressable style={({ pressed }) => [st.leave, pressed && { opacity: 0.7 }]} onPress={() => act((x) => leaveTable(x, o.id))}>
        <Text style={st.leaveText}>{L("Masadan kalk (teklif bu haliyle kalır)")}</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  box: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#ffffff1a', paddingTop: 10, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5, flex: 1 },
  patLabel: { color: C.dim, fontFamily: F.semi, fontSize: 10, marginRight: 2 },
  pat: { width: 14, height: 6, borderRadius: 3 },
  bubble: { borderWidth: 1, borderRadius: 10, padding: 10, backgroundColor: '#00000066' },
  bubbleText: { color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 18 },
  hint: { color: C.blue, fontFamily: F.body, fontSize: 12, lineHeight: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btn: { flexGrow: 1, borderWidth: 1, borderColor: C.border, backgroundColor: '#ffffff0d', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  btnText: { color: C.text, fontFamily: F.display, fontSize: 12 },
  leave: { alignSelf: 'center', padding: 6 },
  leaveText: { color: C.dim, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline' },
});
