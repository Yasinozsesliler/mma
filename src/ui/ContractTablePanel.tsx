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
import { useLook } from '../lookPref';
import { OrgPlate } from './NewOffers';

const RUH = { sicak: C.green, gergin: C.gold, kizgin: C.red, son: C.orange };
const RUH_AD = { sicak: () => L("Sıcak"), gergin: () => L("Gergin"), kizgin: () => L("Kızgın"), son: () => L("Son söz") };

export function ContractTablePanel({ s, o, act, setMsg }: { s: GameState; o: Offer; act: (fn: (s: GameState) => void) => void; setMsg: (m: string | null) => void }) {
  const t = o.masa!;
  const other = leverageOf(s, o);
  const ask = (ne: 'ucret' | 'bonus' | 'koz') =>
    act((x) => {
      const r = tableAsk(x, o.id, ne);
      buzz(r ? 'hata' : 'hafif');
      if (r) setMsg(r);
    });
  const yeni = useLook() === 'yeni';
  return (
    <View style={st.box}>
      {yeni ? (
        <>
          <View style={st.head}>
            <Icon name="handshake" size={16} color={C.gold} />
            <Text style={st.title}>{L("PAZARLIK MASASI")}</Text>
            <Text style={[st.mood, { color: RUH[t.ruh], borderColor: RUH[t.ruh] + '88' }]}>{RUH_AD[t.ruh]()}</Text>
          </View>
          <View style={st.patRow}>
            <Text style={st.patLabel}>{L("Sabır")}</Text>
            {Array.from({ length: t.sabirMax }, (_, i) => (
              <Icon key={i} name={i < t.sabir ? 'heart' : 'heart-outline'} size={14} color={i < t.sabir ? RUH[t.ruh] : C.border} />
            ))}
          </View>
          {/* Organizasyon temsilcisi solda, menajerin sağda konuşur */}
          <View style={st.chatRow}>
            <View style={st.who}>
              <OrgPlate org={o.org} size={0.62} />
              <Text style={st.whoName}>{L("Temsilci")}</Text>
            </View>
            <View style={[st.chatL, { borderColor: RUH[t.ruh] }]}>
              <Text style={st.bubbleText}>{t.mesaj}</Text>
            </View>
          </View>
          {t.ipucu ? (
            <View style={[st.chatRow, { flexDirection: 'row-reverse' }]}>
              <View style={st.who}>
                <View style={st.agent}>
                  <Icon name="account-tie" size={18} color={C.blue} />
                </View>
                <Text style={st.whoName} numberOfLines={1}>
                  {s.takim.menajer ?? L("Menajerin")}
                </Text>
              </View>
              <View style={st.chatR}>
                <Text style={[st.bubbleText, { color: '#cfe3ff' }]}>{t.ipucu}</Text>
              </View>
            </View>
          ) : null}
        </>
      ) : (
      <>
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
      </>
      )}
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
  mood: { fontFamily: F.black, fontSize: 9.5, letterSpacing: 1, borderWidth: 1, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  patRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  chatRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  who: { width: 64, alignItems: 'center', gap: 3 },
  whoName: { color: C.dim, fontFamily: F.semi, fontSize: 9.5, maxWidth: 64 },
  agent: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: C.blue, backgroundColor: '#0d1830', alignItems: 'center', justifyContent: 'center' },
  chatL: { flex: 1, borderWidth: 1, borderRadius: 12, borderTopLeftRadius: 2, padding: 10, backgroundColor: '#00000066' },
  chatR: { flex: 1, borderWidth: 1, borderColor: C.blue + '88', borderRadius: 12, borderTopRightRadius: 2, padding: 10, backgroundColor: '#0d18304d' },
  leaveText: { color: C.dim, fontFamily: F.semi, fontSize: 12, textDecorationLine: 'underline' },
});
