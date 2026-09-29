// Ana menüde Günün Dövüşü kartı: bugünün durumu ve seri.
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dayNumber, grade, liveStreak } from '../engine/daily';
import { L } from '../i18n';
import { challengeFor } from '../challenge';
import { loadDaily, resultText } from './DailyScreen';
import { Icon, SLANT } from './components';
import { C, F } from './theme';

export function DailyCard({ onPress }: { onPress: () => void }) {
  const gun = dayNumber();
  const st = loadDaily();
  const r = st.kayit[gun];
  const seri = liveStreak(st, gun);
  const ch = challengeFor(gun);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: 10 }]}>
      <LinearGradient colors={['#4a0d14', '#1a0a0c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.box}>
        <View style={s.icon}>
          <Icon name="fire" size={26} color={C.orange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>{L("GÜNÜN DÖVÜŞÜ #{0}", [gun])}</Text>
          <Text style={[s.title, SLANT]}>{r ? `${grade(r.skor)} ${resultText(r)}` : L("Bugünün dövüşü seni bekliyor")}</Text>
          <Text style={[s.sub, !r && ch && { color: C.gold }]}>
            {r ? L("Yarın yeni dövüş") : ch ? L("⚔️ Bir arkadaşın {0} puanla meydan okudu!", [ch.skor]) : L("Herkes aynı dövüşü oynuyor. Tek hakkın var.")}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.streak}>🔥 {seri}</Text>
          <Text style={s.streakLab}>{L("SERİ")}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: '#7a1c26', padding: 14 },
  icon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,140,50,0.12)', alignItems: 'center', justifyContent: 'center' },
  kicker: { color: C.orange, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5 },
  title: { color: C.text, fontFamily: F.display, fontSize: 17, marginTop: 2 },
  sub: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  streak: { color: C.orange, fontFamily: F.display, fontSize: 20 },
  streakLab: { color: C.faint, fontFamily: F.semi, fontSize: 9, letterSpacing: 1 },
});
