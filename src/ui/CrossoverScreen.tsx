// Crossover boks maçı ekranı: boks ringi, iki dövüşçü, raunt, hasar/kondisyon, boksörün beden dili ve plan seçimi.
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { money } from '../engine/career';
import { BOX_ROUNDS, boxRound, closeBox, type BoxPlan } from '../engine/crossover';
import { lookFor } from '../engine/tale';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { Button, Icon, Screen, SLANT, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { C, F } from './theme';

const PLANS: { id: BoxPlan; ad: () => string; aciklama: () => string; icon: IconName }[] = [
  { id: 'jab', ad: () => L("Jab ile mesafe"), aciklama: () => L("Sabırlı, kontracıya karşı iyi"), icon: 'arrow-expand-horizontal' },
  { id: 'kombo', ad: () => L("Kombinasyon"), aciklama: () => L("Kaçanı köşeye sıkıştır; kondisyon yer"), icon: 'flash' },
  { id: 'kontra', ad: () => L("Kontra bekle"), aciklama: () => L("Üstüne gelene cevap ver"), icon: 'shield-sword' },
  { id: 'klinc', ad: () => L("Klinçe gir"), aciklama: () => L("Hasarı azaltır, nefes aldırır"), icon: 'account-multiple' },
];

function Bar({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={st.barLabel}>{label}</Text>
      <View style={st.bar}>
        <View style={{ width: `${Math.max(0, Math.min(100, v))}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

export function CrossoverScreen({ s, act }: { s: GameState; act: Act }) {
  const b = s.boks;
  if (!b) {
    return (
      <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act(closeBox)} />}>
        <Text style={st.text}>{L("Maç sona erdi.")}</Text>
      </Screen>
    );
  }
  const opp = { id: `boksor-${b.boksor.ad}`, uyruk: L("ABD") };
  return (
    <Screen footer={b.bitti ? <Button label={L("Kariyere dön")} icon="arrow-left" tone="gold" onPress={() => act(closeBox)} /> : undefined}>
      <LinearGradient colors={['#0b1d3a', '#070b14']} style={st.ring}>
        <Text style={st.kicker}>{L("SÜPER MAÇ · BOKS KURALLARI")}</Text>
        <Text style={[st.round, SLANT]}>{b.bitti ? (b.bitti === 'G' ? L("KAZANDIN!") : L("KAYBETTİN")) : L("{0}. RAUNT / {1}", [b.raunt, BOX_ROUNDS])}</Text>
        <View style={st.ropes}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[st.rope, { backgroundColor: i === 1 ? '#e63946' : '#ffffff55' }]} />
          ))}
        </View>
        <View style={st.row}>
          <View style={st.side}>
            <FighterAvatar look={s.fighter.gorunum} size={70} ring={C.red} />
            <Text style={st.name} numberOfLines={1}>{s.fighter.soyad.toLocaleUpperCase(LOC)}</Text>
            <Bar label={L("Hasar")} v={b.pHasar} color={C.red} />
            <Bar label={L("Kondisyon")} v={b.pKondisyon} color={C.gold} />
          </View>
          <Text style={st.vs}>VS</Text>
          <View style={st.side}>
            <FighterAvatar look={lookFor(opp)} size={70} ring={C.blue} />
            <Text style={st.name} numberOfLines={1}>{b.boksor.ad.toLocaleUpperCase(LOC)}</Text>
            <Bar label={L("Hasar")} v={b.oHasar} color={C.red} />
            <Text style={st.rec}>“{b.boksor.lakap}” · {b.boksor.rekor}</Text>
          </View>
        </View>
        <Text style={st.score}>{L("Hakem kartı: {0} - {1}", [b.pPuan, b.oPuan])}</Text>
      </LinearGradient>
      {!b.bitti ? (
        <>
          <View style={st.hint}>
            <Icon name="eye" size={16} color={C.blue} />
            <Text style={st.hintText}>{b.ipucu}</Text>
          </View>
          {PLANS.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                sfx('punch');
                buzz('orta');
                act((x) => boxRound(x, p.id));
              }}
              style={({ pressed }) => [st.plan, pressed && { borderColor: C.gold }]}
            >
              <Icon name={p.icon} size={20} color={C.gold} />
              <View style={{ flex: 1 }}>
                <Text style={st.planName}>{p.ad()}</Text>
                <Text style={st.planDesc}>{p.aciklama()}</Text>
              </View>
            </Pressable>
          ))}
        </>
      ) : (
        <View style={[st.result, { borderColor: b.bitti === 'G' ? C.gold : C.border }]}>
          <Text style={[st.resTitle, SLANT, { color: b.bitti === 'G' ? C.gold : C.text }]}>
            {b.bitti === 'G' ? (b.yontem === 'KO' ? L("NAKAVT ZAFERİ!") : L("KARAR ZAFERİ!")) : b.yontem === 'KO' ? L("NAKAVT OLDUN") : L("KARARLA KAYBETTİN")}
          </Text>
          <Text style={st.text}>{L("Ücret: {0}", [money(Math.round(b.ucret * (b.bitti === 'G' ? 1.25 : 1)))])}</Text>
        </View>
      )}
      <View style={st.log}>
        {b.log.map((l, i) => (
          <Text key={i} style={[st.logText, i === 0 && { color: C.text }]}>
            {l}
          </Text>
        ))}
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  ring: { borderRadius: 14, borderWidth: 1, borderColor: '#24407a', padding: 14, gap: 10, marginBottom: 12 },
  kicker: { color: C.blue, fontFamily: F.semi, fontSize: 11, letterSpacing: 2, textAlign: 'center' },
  round: { color: C.text, fontFamily: F.display, fontSize: 22, textAlign: 'center' },
  ropes: { gap: 4 },
  rope: { height: 2, borderRadius: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  side: { flex: 1, alignItems: 'center', gap: 4, alignSelf: 'stretch' },
  name: { color: C.text, fontFamily: F.display, fontSize: 12 },
  vs: { color: C.gold, fontFamily: F.display, fontSize: 18 },
  rec: { color: C.dim, fontFamily: F.semi, fontSize: 10, textAlign: 'center' },
  barLabel: { color: C.dim, fontFamily: F.semi, fontSize: 9 },
  bar: { height: 6, width: 110, borderRadius: 3, backgroundColor: '#ffffff1a', overflow: 'hidden' },
  score: { color: C.gold, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  hint: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#101a33', borderRadius: 10, padding: 10, marginBottom: 8 },
  hintText: { color: C.text, fontFamily: F.semi, fontSize: 14, flex: 1 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  planName: { color: C.text, fontFamily: F.semi, fontSize: 15 },
  planDesc: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  result: { borderWidth: 1.5, borderRadius: 14, padding: 16, gap: 6, backgroundColor: C.card, alignItems: 'center', marginBottom: 8 },
  resTitle: { fontFamily: F.display, fontSize: 22 },
  text: { color: C.text, fontFamily: F.body, fontSize: 14 },
  log: { gap: 4, marginTop: 4 },
  logText: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
});
