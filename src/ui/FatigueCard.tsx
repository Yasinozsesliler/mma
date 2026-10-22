// Kariyer ekranında yorgunluk kartı: gösterge, gelişime etkisi, toparlanma hizmetleri ve isteğe bağlı reklam.
// Yorgunluk 20'nin altındayken görünmez. Oynamayı hiçbir zaman engellemez.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { buyRecovery, canFatigueAd, claimFatigueAd, fatigue, fatigueGrowth, fatigueLabel, RECOVERY, recoveryCost, recoveryUsed, type Recovery } from '../engine/fatigue';
import type { GameState } from '../engine/types';
import { L, LOC } from '../i18n';
import { AdOffer } from './AdOffer';
import { Icon, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

export function FatigueCard({ s, act }: { s: GameState; act: Act }) {
  const [msg, setMsg] = useState('');
  const y = fatigue(s);
  if (y < 20) return null;
  const renk = y >= 70 ? C.red : y >= 45 ? C.orange : C.gold;
  const kayip = Math.round((1 - fatigueGrowth(s)) * 100);
  return (
    <View style={[st.box, { borderColor: renk + '55' }]}>
      <View style={st.head}>
        <Icon name="battery-low" size={18} color={renk} />
        <Text style={[st.title, { color: renk }]}>{L("YORGUNLUK").toLocaleUpperCase(LOC)}</Text>
        <Text style={st.label}>{fatigueLabel(s)}</Text>
        <Text style={[st.val, { color: renk }]}>{y}</Text>
      </View>
      <View style={st.bar}>
        <View style={[st.fill, { width: `${y}%`, backgroundColor: renk }]} />
      </View>
      <Text style={st.sub}>{L("Sonraki kampta gelişimin %{0} düşük olur. Oynamaya devam edebilirsin; haftalar geçtikçe kendiliğinden azalır.", [kayip])}</Text>
      <View style={st.row}>
        {(Object.keys(RECOVERY) as Recovery[]).map((r) => {
          const used = recoveryUsed(s, r);
          const c = recoveryCost(s, r);
          const yok = s.para < c;
          return (
            <Pressable
              key={r}
              disabled={used || yok}
              onPress={() => {
                sfx('click');
                act((x) => void setMsg(buyRecovery(x, r)));
              }}
              style={({ pressed }) => [st.svc, (used || yok) && { opacity: 0.45 }, pressed && { borderColor: C.gold }]}
            >
              <Icon name={RECOVERY[r].icon as IconName} size={18} color={C.text} />
              <Text style={st.svcName} numberOfLines={2}>
                {RECOVERY[r].ad()}
              </Text>
              <Text style={st.svcFx}>-{RECOVERY[r].dusus}</Text>
              <Text style={st.svcCost}>{used ? L("Yapıldı") : `$${c.toLocaleString(LOC)}`}</Text>
            </Pressable>
          );
        })}
      </View>
      {canFatigueAd(s) ? <AdOffer icon="lightning-bolt" title={L("Hızlı toparlanma")} desc={L("Kısa bir reklam izle, yorgunluğun 40 azalsın.")} onReward={() => act(claimFatigueAd)} /> : null}
      {msg ? <Text style={st.msg}>{msg}</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: '#14151a', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: F.display, fontSize: 13, letterSpacing: 1.2 },
  label: { flex: 1, color: C.dim, fontFamily: F.semi, fontSize: 12 },
  val: { fontFamily: F.display, fontSize: 18 },
  bar: { height: 6, borderRadius: 3, backgroundColor: '#ffffff12', overflow: 'hidden', marginTop: 6 },
  fill: { height: '100%', borderRadius: 3 },
  sub: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 16, marginTop: 6 },
  row: { flexDirection: 'row', gap: 6, marginTop: 10 },
  svc: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2, backgroundColor: '#1b1c22', borderWidth: 1, borderColor: '#2a2c33', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 4 },
  svcName: { color: C.text, fontFamily: F.semi, fontSize: 10.5, textAlign: 'center', minHeight: 26 },
  svcFx: { color: C.green, fontFamily: F.display, fontSize: 13 },
  svcCost: { color: C.gold, fontFamily: F.display, fontSize: 11 },
  msg: { color: C.dim, fontFamily: F.semi, fontSize: 12, textAlign: 'center', marginTop: 4 },
});
