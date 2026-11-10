// Bildirim izni iyi bir anda istenir: ilk galibiyetten sonra, bir kez, oyuncu sorunca işletim sistemi penceresi açılır.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { enableNotifications, NOTIFY, rescheduleLast, useNotifyState } from '../notify';
import { getPref, setPref } from '../prefs';
import { Button, Card } from './components';
import { C, F } from './theme';

const KEY = 'yol_bildirim_soruldu';

export function NotifyAsk({ s }: { s: GameState }) {
  const state = useNotifyState();
  const [kapali, setKapali] = useState(() => getPref(KEY) === '1');
  if (!NOTIFY || state !== 'sorulmadi' || kapali || !s.gecmis.some((h) => h.sonuc === 'G')) return null;
  const bitir = () => {
    setPref(KEY, '1');
    setKapali(true);
  };
  return (
    <Card>
      <Text style={st.title}>{L("🔔 Hatırlatma ister misin?")}</Text>
      <Text style={st.sub}>{L("Günün Dövüşü, sezon sonu ve süreli fırsatlar için ara sıra haber verelim.")}</Text>
      <View style={st.row}>
        <View style={{ flex: 1 }}>
          <Button
            label={L("Hatırlat")}
            icon="bell-ring"
            tone="gold"
            onPress={async () => {
              bitir();
              if (await enableNotifications()) rescheduleLast();
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={L("Şimdi değil")} tone="ghost" onPress={bitir} />
        </View>
      </View>
    </Card>
  );
}

const st = StyleSheet.create({
  title: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  sub: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
});
