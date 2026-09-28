// Ödüllü detaylı keşif raporu: rakibin dövüş alışkanlıkları (motorun kullandığı gerçek eğilimler).
import { StyleSheet, Text, View } from 'react-native';
import { TACTICS } from '../engine/narration';
import { scoutReport } from '../engine/rewards';
import type { Opponent } from '../engine/types';
import { L } from '../i18n';
import { Icon, type IconName } from './components';
import { C, F } from './theme';

export function ScoutReportCard({ o }: { o: Opponent }) {
  const r = scoutReport(o);
  const okuma = r.okuma === 'yuksek' ? L("Yüksek: aynı taktiği iki raunt üst üste kullanırsan büyük ihtimalle okur.") : r.okuma === 'orta' ? L("Orta: aynı taktiği birkaç kez tekrarlarsan okumaya başlar.") : L("Düşük: aynı planı rahatça sürdürebilirsin.");
  const rows: [IconName, string, string][] = [
    ['target', L("En sık"), L("“{0}” (%{1})", [TACTICS[r.sik].ad, r.sikPay])],
    ['swap-horizontal', L("İkinci tercihi"), `“${TACTICS[r.ikinci].ad}”`],
    ['shield-sword', L("En etkili cevabın"), `“${TACTICS[r.karsi].ad}”`],
    ['lungs', L("Yorulunca"), L("Geri çekilir; mesafe ve kontra arar.")],
    ['timer-sand', L("Son rauntta gerideyse"), L("Baskıya geçer.")],
    ['brain', L("Seni okuma gücü"), okuma],
  ];
  return (
    <View style={st.box}>
      <Text style={st.title}>{L("📋 DETAYLI KEŞİF RAPORU")}</Text>
      {rows.map(([icon, k, v]) => (
        <View key={k} style={st.row}>
          <Icon name={icon} size={16} color={C.gold} />
          <Text style={st.key}>{k}</Text>
          <Text style={st.val}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: '#15120a', borderWidth: 1, borderColor: C.goldDeep, borderRadius: 12, padding: 12, gap: 8, marginVertical: 8 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 14, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  key: { color: C.dim, fontFamily: F.semi, fontSize: 12, width: 118 },
  val: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 12, lineHeight: 17 },
});
