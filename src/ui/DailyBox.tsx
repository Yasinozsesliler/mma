// Kariyer ana ekranında Günlük Kutu: günde bir kez ücretsiz aç; açınca ödüllü reklamla parasını bir kez ikiye katla.
// Sakin: kutu açılıp katlandıktan (ya da kapatıldıktan) sonra o gün ekranda yer kaplamaz.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { track } from '../analytics';
import { dayNumber } from '../engine/daily';
import { BOX_DAYS, boxOpened, boxPara, boxStreak, canDoubleBox, doubleBox, openBox } from '../engine/dailyBox';
import type { GameState } from '../engine/types';
import { getBox, setBox, useBox } from '../dailyBoxStore';
import { noteGoal } from '../dailyGoals';
import { L } from '../i18n';
import { AdOffer } from './AdOffer';
import { Icon } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

export function DailyBox({ s, act }: { s: GameState; act: Act }) {
  const st = useBox();
  const [msg, setMsg] = useState('');
  const [hide, setHide] = useState(false);
  if (s.efsane) return null;
  const gun = dayNumber();
  const opened = boxOpened(st, gun);
  const seri = boxStreak(st, gun);

  if (!opened) {
    const open = () =>
      act((x) => {
        const r = openBox(x, getBox(), gun);
        if (!r) return;
        setBox(r.st);
        noteGoal('kutu');
        setMsg(r.metin);
        sfx('chime');
        track('daily_box', { gun: r.st.seri });
      });
    return (
      <Pressable onPress={open} style={({ pressed }) => [st_.box, pressed && { opacity: 0.8 }]}>
        <View style={st_.icon}>
          <Icon name="gift" size={22} color={C.gold} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={st_.title}>{L("GÜNLÜK KUTU")}</Text>
          <Text style={st_.sub}>{L("{0}. gün · içinde ${1}", [seri, boxPara(s.stage, seri).toLocaleString()])}</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: BOX_DAYS }, (_, i) => (
              <View key={i} style={[st_.dot, i < seri - 1 && { backgroundColor: C.gold }, i === seri - 1 && { borderColor: C.gold, borderWidth: 2 }]} />
            ))}
          </View>
        </View>
        <View style={st_.pill}>
          <Text style={st_.pillText}>{L("AÇ")}</Text>
        </View>
      </Pressable>
    );
  }

  if (hide) return null;
  const dbl = canDoubleBox(st, gun);
  if (!dbl && !msg) return null;
  return (
    <View>
      {msg ? (
        <Pressable onPress={() => (dbl ? setMsg('') : setHide(true))} style={st_.toast}>
          <Text style={st_.toastText}>{msg}</Text>
        </Pressable>
      ) : null}
      {dbl ? (
        <AdOffer
          yer="gunluk_kutu"
          icon="gift-open"
          title={L("Kutuyu ikiye katla")}
          desc={L("Bugünkü kutunun parası bir kez daha: +${0}", [(st?.para ?? 0).toLocaleString()])}
          onReward={() =>
            act((x) => {
              const cur = getBox();
              if (!cur || !canDoubleBox(cur, gun)) return;
              const r = doubleBox(x, cur);
              setBox(r.st);
              setMsg(r.metin);
            })
          }
        />
      ) : null}
    </View>
  );
}

const st_ = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#15120a', borderWidth: 1, borderColor: C.goldDeep, borderRadius: 12, padding: 10, marginVertical: 6 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2a2210', alignItems: 'center', justifyContent: 'center' },
  title: { color: C.gold, fontFamily: F.bold, fontSize: 13, letterSpacing: 1 },
  sub: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  dot: { width: 14, height: 6, borderRadius: 3, backgroundColor: '#3a3220', borderColor: 'transparent', borderWidth: 0 },
  pill: { backgroundColor: C.gold, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  pillText: { color: '#1f1605', fontFamily: F.bold, fontSize: 12 },
  toast: { backgroundColor: '#14210f', borderRadius: 10, padding: 10, marginTop: 6 },
  toastText: { color: C.green, fontFamily: F.semi, fontSize: 12.5 },
});
