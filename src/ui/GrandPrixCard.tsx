// Ana ekranda Grand Prix: davet ya da süren turnuvanın eşleşme tablosu (çeyrek final → yarı final → final).
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import { ORGS } from '../engine/data';
import { acceptGp, closeGp, declineGp, GP_PLAYER, ROUND_NAME, type GrandPrix } from '../engine/grandPrix';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { Button, Icon, SLANT } from './components';
import { C, F } from './theme';

function Slot({ gp, id, win }: { gp: GrandPrix; id?: string; win?: boolean }) {
  const k = gp.kisiler.find((x) => x.id === id);
  const me = id === GP_PLAYER;
  return (
    <View style={[st.slot, me && { borderColor: C.red, backgroundColor: '#2a0a0f' }, win === false && { opacity: 0.4 }]}>
      <Text style={[st.slotText, me && { color: C.text }]} numberOfLines={1}>
        {k ? (me ? L("SEN") : k.soyad) : '—'}
      </Text>
    </View>
  );
}

export function GrandPrixCard({ s, act }: { s: GameState; act: (fn: (s: GameState) => void) => void }) {
  if (s.gpDavet && !s.gp) {
    const org = ORGS[s.contract?.org ?? 'amator'];
    return (
      <LinearGradient colors={['#2e2206', '#0e0c07']} style={st.box}>
        <View style={st.head}>
          <Icon name="tournament" size={20} color={C.gold} />
          <Text style={[st.title, SLANT]}>{L("{0} GRAND PRIX DAVETİ", [org.kisa])}</Text>
        </View>
        <Text style={st.text}>{L("8 dövüşçü, üç maç: çeyrek final, yarı final, final. Kaybeden elenir. Şampiyona {0} ve unvan.", [money(s.gpDavet.odul)])}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button label={L("Katıl")} icon="check-bold" tone="gold" onPress={() => act(acceptGp)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={L("Reddet")} icon="close" tone="ghost" onPress={() => act(declineGp)} />
          </View>
        </View>
      </LinearGradient>
    );
  }
  const gp = s.gp;
  if (!gp) return null;
  const r0 = gp.kisiler.map((k) => k.id);
  const cols = [r0, gp.turlar[0], gp.turlar[1]];
  const champ = gp.turlar[2]?.[0];
  return (
    <LinearGradient colors={['#2e2206', '#0e0c07']} style={st.box}>
      <View style={st.head}>
        <Icon name="tournament" size={20} color={C.gold} />
        <Text style={[st.title, SLANT]}>{L("{0} GRAND PRIX", [ORGS[gp.org].kisa])}</Text>
        <Text style={st.prize}>{money(gp.odul)}</Text>
      </View>
      <View style={st.bracket}>
        {cols.map((ids, c) => (
          <View key={c} style={st.col}>
            <Text style={st.round}>{ROUND_NAME()[c]}</Text>
            <View style={[st.colInner, { justifyContent: 'space-around' }]}>
              {Array.from({ length: 8 / 2 ** c }, (_, i) => {
                const id = ids?.[i];
                const next = cols[c + 1] ?? (champ ? [champ] : undefined);
                const win = next && id ? next.includes(id) : undefined;
                return <Slot key={i} gp={gp} id={id} win={next ? win : undefined} />;
              })}
            </View>
          </View>
        ))}
        <View style={[st.col, { flex: 0.8 }]}>
          <Text style={st.round}>🏆</Text>
          <View style={[st.colInner, { justifyContent: 'center' }]}>
            <Slot gp={gp} id={champ} />
          </View>
        </View>
      </View>
      {gp.bitti ? (
        <>
          <Text style={[st.text, { color: gp.sampiyon === GP_PLAYER ? C.gold : C.dim }]}>
            {gp.sampiyon === GP_PLAYER ? L("Kupa senin! Grand Prix şampiyonusun.") : L("Turnuva bitti.")}
          </Text>
          <Button label={L("Kapat")} icon="close" tone="ghost" onPress={() => act(closeGp)} />
        </>
      ) : (
        <Text style={st.text}>{L("Sıradaki maçın turnuva maçı: “Dövüş ayarla” ile başla. Reddedersen turnuvadan çekilirsin.")}</Text>
      )}
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  box: { borderRadius: 14, borderWidth: 1, borderColor: '#4a3810', padding: 12, gap: 10, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 15, letterSpacing: 1, flex: 1 },
  prize: { color: C.gold, fontFamily: F.display, fontSize: 13 },
  text: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  bracket: { flexDirection: 'row', gap: 4, minHeight: 210 },
  col: { flex: 1, gap: 4 },
  colInner: { flex: 1, gap: 4 },
  round: { color: C.dim, fontFamily: F.semi, fontSize: 8, letterSpacing: 0.5, textAlign: 'center' },
  slot: { borderWidth: 1, borderColor: '#4a3810', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 3, backgroundColor: '#00000055' },
  slotText: { color: C.dim, fontFamily: F.semi, fontSize: 10, textAlign: 'center' },
});
