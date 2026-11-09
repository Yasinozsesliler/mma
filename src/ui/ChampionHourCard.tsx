// Şampiyon Saati kartı (menü ve merkez): ilerleme, başlatma ve geri sayım. Reklam izlemeyen oyuncuya görünmez.
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { L } from '../i18n';
import { fmtLeft, hourActive, HOUR_GOAL, MONETIZATION, openOffer, PURCHASES, startHour, takeHourEndOffer, useHour, useNow, usePremium } from '../monetization';
import { Bar, Button, Card, Icon } from './components';
import { C, F } from './theme';

export function ChampionHourCard() {
  const h = useHour();
  const premium = usePremium();
  const now = useNow(1000);
  const on = MONETIZATION && PURCHASES && !premium;
  const aktif = hourActive(now);
  useEffect(() => {
    // Süre bitti: bir kez, sakin bir teklif
    if (on && !aktif && takeHourEndOffer(now)) openOffer('reklam10', 'milestone');
  }, [on, aktif, now]);
  if (!on || (!aktif && !h.hak && h.n === 0)) return null;
  return (
    <Card accent={C.gold}>
      <View style={st.head}>
        <Icon name="crown" size={18} color={C.gold} />
        <Text style={st.title}>{L("ŞAMPİYON SAATİ")}</Text>
        {aktif ? <Text style={st.timer}>{fmtLeft((h.bitis ?? now) - now)}</Text> : null}
      </View>
      {aktif ? (
        <Text style={st.sub}>{L("Şu an geçiş reklamı yok, ödüller reklamsız geliyor. Tadını çıkar!")}</Text>
      ) : h.hak ? (
        <>
          <Text style={st.sub}>{L("10 reklam izledin, 1 saat senin: geçiş reklamı yok, ödüller reklamsız. İstediğin zaman başlat.")}</Text>
          <View style={{ marginTop: 8 }}>
            <Button label={L("1 saati başlat")} icon="play" tone="gold" onPress={startHour} />
          </View>
        </>
      ) : (
        <>
          <Bar value={(h.n / HOUR_GOAL) * 100} color={C.gold} />
          <Text style={st.sub}>{L("{0}/{1} ödüllü reklam · 10 reklamda 1 saat reklamsız oyun", [h.n, HOUR_GOAL])}</Text>
        </>
      )}
    </Card>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { flex: 1, color: C.gold, fontFamily: F.display, fontSize: 15, letterSpacing: 1 },
  timer: { color: C.text, fontFamily: F.display, fontSize: 15 },
  sub: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
});
