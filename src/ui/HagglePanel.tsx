// Sponsor pazarlık masası: markanın sözü, sabır göstergesi, masadaki teklif ve artırma seçenekleri.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import { haggleAccept, haggleAsk, haggleLeave, type SponsorDeal } from '../engine/sponsors';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Icon } from './components';
import { C, F } from './theme';

const RUH = { sicak: C.green, gergin: C.gold, kizgin: C.red, son: C.orange };
const ASKS: [number, () => string][] = [
  [0.1, () => L("+%10 iste")],
  [0.25, () => L("+%25 iste")],
  [0.5, () => L("+%50 iste")],
];

export function HagglePanel({ d, act, setMsg }: { d: SponsorDeal; act: (fn: (s: GameState) => void) => void; setMsg: (m: string | null) => void }) {
  const pz = d.pz!;
  const artis = Math.round((pz.carpan - 1) * 100);
  return (
    <View style={st.box}>
      <View style={st.head}>
        <Icon name="handshake" size={16} color={C.gold} />
        <Text style={st.title}>{L("PAZARLIK MASASI")}</Text>
        <View style={st.patience}>
          <Text style={st.patLabel}>{L("Sabır")}</Text>
          {Array.from({ length: pz.sabirMax }, (_, i) => (
            <View key={i} style={[st.pat, { backgroundColor: i < pz.sabir ? RUH[pz.ruh] : C.border }]} />
          ))}
        </View>
      </View>
      <View style={[st.bubble, { borderColor: RUH[pz.ruh] }]}>
        <Text style={st.bubbleText}>{pz.mesaj}</Text>
      </View>
      {pz.ipucu ? <Text style={st.hint}>{pz.ipucu}</Text> : null}
      <View style={st.offer}>
        <Text style={st.offerLabel}>{L("Masadaki teklif")}</Text>
        <Text style={st.offerVal}>{L("Dövüş başı {0}", [money(d.dovusBasi)])}</Text>
        {artis > 0 ? <Text style={st.up}>{`+%${artis}`}</Text> : null}
      </View>
      {pz.ruh !== 'son' ? (
        <View style={st.asks}>
          {ASKS.map(([k, label]) => (
            <Pressable
              key={k}
              style={({ pressed }) => [st.ask, pressed && { opacity: 0.7 }]}
              onPress={() =>
                act((x) => {
                  const r = haggleAsk(x, d.id, k);
                  if (r) {
                    buzz(r.startsWith('❌') ? 'hata' : 'basari');
                    setMsg(r);
                  } else buzz('hafif');
                })
              }
            >
              <Text style={st.askText}>{label()}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={st.asks}>
        <Pressable
          style={({ pressed }) => [st.ask, { backgroundColor: C.green, borderColor: C.green }, pressed && { opacity: 0.7 }]}
          onPress={() => {
            buzz('basari');
            act((x) => setMsg(haggleAccept(x, d.id)));
          }}
        >
          <Text style={[st.askText, { color: '#04140a' }]}>{L("KABUL ET VE İMZALA")}</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [st.ask, pressed && { opacity: 0.7 }]} onPress={() => act((x) => haggleLeave(x, d.id))}>
          <Text style={[st.askText, { color: C.dim }]}>{L("Masadan kalk")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  box: { marginTop: 10, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5, flex: 1 },
  patience: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  patLabel: { color: C.dim, fontFamily: F.semi, fontSize: 10, marginRight: 2 },
  pat: { width: 14, height: 6, borderRadius: 3 },
  bubble: { borderWidth: 1, borderRadius: 10, padding: 10, backgroundColor: '#101216' },
  bubbleText: { color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 18 },
  hint: { color: C.blue, fontFamily: F.body, fontSize: 12, lineHeight: 16 },
  offer: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  offerLabel: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  offerVal: { color: C.green, fontFamily: F.display, fontSize: 15, flex: 1 },
  up: { color: C.gold, fontFamily: F.display, fontSize: 13 },
  asks: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  ask: { flexGrow: 1, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardAlt, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  askText: { color: C.text, fontFamily: F.display, fontSize: 12, letterSpacing: 0.5 },
});
