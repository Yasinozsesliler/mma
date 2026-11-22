// Kariyer ana ekranında Günlük Hedefler: bugünün 3 hedefi, seri ateşi ve ödül sandığı. Sakin: sandık açıldıktan sonra
// tek satıra iner. Bir gün kaçtıysa seri haftada bir ödüllü reklamla kurtarılabilir (güç vermez).
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { track } from '../analytics';
import { milestoneOffer } from '../monetization';
import { grantCosmetic } from '../cosmetics';
import { getGoals, setGoals, useGoals } from '../dailyGoals';
import { cosmeticById } from '../engine/cosmetics';
import { dayNumber } from '../engine/daily';
import { allDone, canDoubleChest, canRescue, doubleChest, chestPara, claimChest, GOAL_INFO, goalRows, nextStreakReward, rescue, streakOf, today } from '../engine/dailyGoals';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { AdOffer } from './AdOffer';
import { Icon, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

const FIRE = '#ff7b00';

export function DailyGoals({ s, act }: { s: GameState; act: Act }) {
  const raw = useGoals();
  const [msg, setMsg] = useState('');
  if (s.efsane) return null;
  const gun = dayNumber();
  const st = today(raw, gun);
  const rows = goalRows(st, gun);
  const done = allDone(st, gun);
  const seri = streakOf(st, gun);
  const sonraki = nextStreakReward(seri);
  const odul = sonraki ? cosmeticById(sonraki.id) : undefined;

  const claim = () =>
    act((x) => {
      const r = claimChest(x, getGoals(), gun);
      if (!r) return;
      setGoals(r.st);
      r.kozmetik.forEach(grantCosmetic);
      const names = r.kozmetik.map((id) => cosmeticById(id)?.ad).filter(Boolean);
      setMsg(names.length ? `${r.metin}\n${L("🎽 Seri ödülü açıldı: {0} (Dolap)", [names.join(', ')])}` : r.metin);
      sfx('chime');
      track('daily_goals', { seri: r.seri });
      // 7 günlük seri: bir kez Şampiyon Paketi (ödüller reklamsız ve anında ikiye)
      if (r.seri >= 7) milestoneOffer('seri7', 'yol_teklif_seri7', 2200);
    });

  if (st.alindi) {
    return (
      <View>
        {msg ? (
          <Pressable onPress={() => setMsg('')} style={x.toast}>
            <Text style={x.toastText}>{msg}</Text>
          </Pressable>
        ) : null}
        {canDoubleChest(raw, gun) ? (
          <AdOffer
            yer="hedef_sandik"
            icon="treasure-chest"
            title={L("Sandığı ikiye katla")}
            desc={L("Bugünkü sandık bir kez daha: +${0}", [(raw?.sandik?.para ?? 0).toLocaleString()])}
            onReward={() =>
              act((xs) => {
                const cur = getGoals();
                if (!cur) return;
                const r = doubleChest(xs, cur, gun);
                if (!r) return;
                setGoals(r.st);
                setMsg(r.metin);
              })
            }
          />
        ) : null}
        <View style={x.slim}>
          <Text style={x.fire}>🔥</Text>
          <Text style={x.slimText} numberOfLines={1}>
            {L("{0} günlük seri · yarın yeni hedefler", [seri])}
            {sonraki && odul ? ` · ${L("{0}. gün: {1}", [sonraki.gun, odul.ad])}` : ''}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={x.card}>
      <LinearGradient colors={['#1f1206', '#0e0b08']} style={StyleSheet.absoluteFill} />
      <View style={x.head}>
        <Text style={x.title}>{L("GÜNLÜK HEDEFLER")}</Text>
        <View style={[x.streak, seri > 0 && { borderColor: FIRE }]}>
          <Text style={x.fireSmall}>🔥</Text>
          <Text style={[x.streakText, seri > 0 && { color: FIRE }]}>{seri}</Text>
        </View>
      </View>
      {rows.map((g) => (
        <View key={g.k} style={x.row}>
          <View style={[x.check, g.bitti && x.checkOn]}>{g.bitti ? <Icon name="check-bold" size={13} color="#1f1206" /> : <Icon name={GOAL_INFO[g.k].icon as IconName} size={13} color={C.dim} />}</View>
          <Text style={[x.rowText, g.bitti && x.rowDone]} numberOfLines={2}>
            {GOAL_INFO[g.k].metin(g.n)}
          </Text>
          {g.n > 1 ? <Text style={x.count}>{`${g.say}/${g.n}`}</Text> : null}
        </View>
      ))}
      {done ? (
        <Pressable onPress={claim} style={({ pressed }) => [x.claim, pressed && { opacity: 0.8 }]}>
          <Icon name="treasure-chest" size={18} color="#1f1206" />
          <Text style={x.claimText}>{L("SANDIĞI AÇ · +${0}", [chestPara(s.stage, seri + 1).toLocaleString()])}</Text>
        </Pressable>
      ) : (
        <Text style={x.hint} numberOfLines={2}>
          {L("Üçünü de bitir: para, takipçi ve seri.")}
          {sonraki && odul ? ` ${L("{0}. günde: {1}", [sonraki.gun, odul.ad])}` : ''}
        </Text>
      )}
      {canRescue(st, gun) ? (
        <View style={{ marginTop: 8 }}>
          <AdOffer
            yer="seri_kurtar"
            icon="fire"
            title={L("Serini kurtar")}
            desc={L("Dün kaçırdın: {0} günlük serin devam etsin (haftada bir).", [st.seri ?? 0])}
            onReward={() => {
              const cur = getGoals();
              if (!cur || !canRescue(today(cur, gun), gun)) return;
              setGoals(rescue(cur, gun));
              track('streak_rescue', { seri: cur.seri ?? 0 });
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const x = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, borderColor: '#4a2a0c', padding: 12, marginVertical: 6, overflow: 'hidden', gap: 7 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#ffb35c', fontFamily: F.bold, fontSize: 13, letterSpacing: 1 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: '#3a2a1a', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 2 },
  fireSmall: { fontSize: 12 },
  streakText: { color: C.dim, fontFamily: F.bold, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#4a3a2a', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  checkOn: { backgroundColor: FIRE, borderColor: FIRE },
  rowText: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 12.5 },
  rowDone: { color: C.dim, textDecorationLine: 'line-through' },
  count: { color: '#ffb35c', fontFamily: F.bold, fontSize: 12 },
  hint: { color: C.dim, fontFamily: F.body, fontSize: 11.5, marginTop: 2 },
  claim: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: FIRE, borderRadius: 22, paddingVertical: 9, marginTop: 4 },
  claimText: { color: '#1f1206', fontFamily: F.bold, fontSize: 13, letterSpacing: 0.5 },
  slim: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#140d07', borderWidth: 1, borderColor: '#3a2410', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginVertical: 4 },
  fire: { fontSize: 15 },
  slimText: { flex: 1, color: '#ffb35c', fontFamily: F.semi, fontSize: 12 },
  toast: { backgroundColor: '#14210f', borderRadius: 10, padding: 10, marginTop: 6 },
  toastText: { color: C.green, fontFamily: F.semi, fontSize: 12.5 },
});
