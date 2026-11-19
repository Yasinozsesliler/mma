// Lüks koleksiyon: müzayededen saat, klasik araba ve sanat eseri al; değerleri haftadan haftaya değişir,
// istersen sat (%10 müzayede payı). Güç vermez, yalnızca servet ve gösteriş.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { money } from '../engine/career';
import { auctionNow, buyLux, LUX_KAT, luxById, luxTotal, luxTrend, luxValue, sellLux, SELL_FEE, weeksToNextAuction, type LuxItem } from '../engine/luxury';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Button, Icon, Screen, Section, Title, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

/** Son 12 haftanın değer çizgisi. */
function Spark({ it, hafta, w = 90, h = 28 }: { it: LuxItem; hafta: number; w?: number; h?: number }) {
  const vals = Array.from({ length: 12 }, (_, i) => luxValue(it, hafta - 11 + i));
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pts = vals.map((v, i) => `${(i / 11) * w},${h - 2 - ((v - lo) / Math.max(1, hi - lo)) * (h - 4)}`).join(' ');
  const up = vals[11] >= vals[10];
  return (
    <Svg width={w} height={h}>
      <Polyline points={pts} fill="none" stroke={up ? C.green : '#ff4d5e'} strokeWidth={2} />
    </Svg>
  );
}

function Trend({ v }: { v: number }) {
  const up = v >= 0;
  return <Text style={[ls.trend, { color: up ? C.green : '#ff4d5e' }]}>{`${up ? '▲' : '▼'} %${Math.abs(v * 100).toFixed(1)}`}</Text>;
}

export function LuxuryScreen({ s, act }: { s: GameState; act: Act }) {
  const [msg, setMsg] = useState<string | null>(null);
  const owned = (s.luks ?? []).map((o) => ({ o, it: luxById(o.id)! })).filter((x) => x.it);
  const auction = auctionNow(s);
  const total = luxTotal(s);
  const maliyet = owned.reduce((a, x) => a + x.o.alis, 0);
  return (
    <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <Title art="sehir" kicker={L("KOLEKSİYON")} sub={L("Nadir saatler, klasik arabalar ve sanat eserleri. Değerleri her hafta değişir; doğru zamanda al, doğru zamanda sat.")}>
        {L("Lüks Koleksiyon")}
      </Title>
      <View style={ls.summary}>
        <View style={ls.sumCol}>
          <Text style={ls.sumL}>{L("KOLEKSİYON DEĞERİ")}</Text>
          <Text style={ls.sumV}>{money(total)}</Text>
        </View>
        <View style={ls.sumCol}>
          <Text style={ls.sumL}>{L("KÂR / ZARAR")}</Text>
          <Text style={[ls.sumV, { color: total - maliyet >= 0 ? C.green : '#ff4d5e' }]}>{owned.length ? `${total - maliyet >= 0 ? '+' : '-'}${money(Math.abs(total - maliyet))}` : '—'}</Text>
        </View>
        <View style={ls.sumCol}>
          <Text style={ls.sumL}>{L("PARAN")}</Text>
          <Text style={ls.sumV}>{money(s.para)}</Text>
        </View>
      </View>
      {msg ? <Text style={ls.msg}>{msg}</Text> : null}

      <Section>{L("KOLEKSİYONUM · {0}", [owned.length])}</Section>
      {owned.length ? (
        <View style={{ gap: 8 }}>
          {owned.map(({ o, it }) => {
            const v = luxValue(it, s.hafta);
            const net = Math.round((v * (1 - SELL_FEE)) / 100) * 100;
            const kar = net - o.alis;
            return (
              <View key={it.id} style={[ls.item, { borderLeftColor: it.renk }]}>
                <View style={[ls.icon, { borderColor: it.renk }]}>
                  <Icon name={LUX_KAT[it.kat].ikon as IconName} size={20} color={it.renk} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ls.name}>{it.ad()}</Text>
                  <Text style={ls.sub}>{L("Alış {0} · Şimdi {1}", [money(o.alis), money(v)])}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Spark it={it} hafta={s.hafta} />
                    <Trend v={luxTrend(it, s.hafta)} />
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    buzz('hafif');
                    act((x) => setMsg(sellLux(x, it.id)));
                  }}
                  style={[ls.btn, { borderColor: kar >= 0 ? C.green : '#ff4d5e' }]}
                >
                  <Text style={ls.btnT}>{L("SAT")}</Text>
                  <Text style={[ls.btnS, { color: kar >= 0 ? C.green : '#ff4d5e' }]}>{money(net)}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={ls.empty}>{L("Koleksiyonun boş. Aşağıdaki müzayededen ilk parçanı seç.")}</Text>
      )}

      <Section>{L("MÜZAYEDE · {0} hafta sonra yenilenir", [weeksToNextAuction(s)])}</Section>
      <View style={{ gap: 8 }}>
        {auction.map((it) => {
          const v = luxValue(it, s.hafta);
          const can = s.para >= v;
          return (
            <View key={it.id} style={[ls.item, { borderLeftColor: it.renk }]}>
              <View style={[ls.icon, { borderColor: it.renk }]}>
                <Icon name={LUX_KAT[it.kat].ikon as IconName} size={20} color={it.renk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ls.kat}>{LUX_KAT[it.kat].ad().toLocaleUpperCase()}</Text>
                <Text style={ls.name}>{it.ad()}</Text>
                <Text style={ls.desc}>{it.aciklama()}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Spark it={it} hafta={s.hafta} />
                  <Trend v={luxTrend(it, s.hafta)} />
                </View>
              </View>
              <Pressable
                disabled={!can}
                onPress={() => {
                  buzz('basari');
                  act((x) => setMsg(buyLux(x, it.id)));
                }}
                style={[ls.btn, { borderColor: can ? C.gold : C.border, opacity: can ? 1 : 0.5 }]}
              >
                <Text style={ls.btnT}>{L("AL")}</Text>
                <Text style={[ls.btnS, { color: C.gold }]}>{money(v)}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <Text style={ls.note}>{L("Satışta %{0} müzayede payı kesilir. Koleksiyon güç vermez; evinde sergilenir.", [Math.round(SELL_FEE * 100)])}</Text>
    </Screen>
  );
}

const ls = StyleSheet.create({
  summary: { flexDirection: 'row', backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, paddingVertical: 12, marginBottom: 6 },
  sumCol: { flex: 1, alignItems: 'center' },
  sumL: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.2 },
  sumV: { color: C.text, fontFamily: F.display, fontSize: 16, marginTop: 3 },
  msg: { color: C.gold, fontFamily: F.semi, fontSize: 13, textAlign: 'center', marginVertical: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, padding: 10 },
  icon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0c0f' },
  kat: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.2 },
  name: { color: C.text, fontFamily: F.bold, fontSize: 13 },
  sub: { color: C.dim, fontFamily: F.semi, fontSize: 11, marginTop: 1 },
  desc: { color: C.faint, fontFamily: F.body, fontSize: 11, lineHeight: 15, marginTop: 1 },
  trend: { fontFamily: F.display, fontSize: 11 },
  btn: { alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 8, minWidth: 78 },
  btnT: { color: C.text, fontFamily: F.display, fontSize: 13, letterSpacing: 1 },
  btnS: { fontFamily: F.semi, fontSize: 10, marginTop: 1 },
  empty: { color: C.dim, fontFamily: F.body, fontSize: 13, textAlign: 'center', marginVertical: 10 },
  note: { color: C.faint, fontFamily: F.body, fontSize: 11, lineHeight: 16, marginTop: 12, textAlign: 'center' },
});
