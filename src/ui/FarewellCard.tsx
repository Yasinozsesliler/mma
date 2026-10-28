// Veda maçı: 35 yaşından sonra ana ekranda "son maçını ilan et" kartı, emeklilik ekranında da maçın özeti.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { findNextFight } from '../engine/career';
import { announceFarewell, canAnnounceFarewell, coachFarewell } from '../engine/farewell';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { Button, Card, Icon, P } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

export function FarewellCard({ s, act }: { s: GameState; act: Act }) {
  const [sure, setSure] = useState(false);
  if (!canAnnounceFarewell(s)) return null;
  return (
    <Card accent={C.gold}>
      <View style={st.head}>
        <Icon name="hand-wave" size={18} color={C.gold} />
        <Text style={st.kicker}>{L("VEDA MAÇI")}</Text>
      </View>
      {!sure ? (
        <>
          <P>{L("{0} yaşındasın. İstersen son maçını ilan et: büyük bir rakip, gecenin ana maçı ve seni ayakta uğurlayan bir salon. Maçtan sonra eldivenleri asarsın.", [s.fighter.yas])}</P>
          <Button label={L("Veda maçını ilan et")} icon="hand-wave" tone="ghost" onPress={() => setSure(true)} />
        </>
      ) : (
        <>
          <P>{L("Emin misin? Bir sonraki maç kariyerinin son maçı olacak; sonucu ne olursa olsun ardından emekli olacaksın.")}</P>
          <View style={st.row}>
            <View style={{ flex: 1 }}>
              <Button label={L("Vazgeç")} tone="ghost" onPress={() => setSure(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={L("İlan et")}
                tone="gold"
                onPress={() =>
                  act((x) => {
                    announceFarewell(x);
                    findNextFight(x);
                  })
                }
              />
            </View>
          </View>
        </>
      )}
    </Card>
  );
}

/** Emeklilik ekranı: veda maçının sonucu ve hocanın son sözleri. */
export function FarewellSummary({ s }: { s: GameState }) {
  const v = s.veda;
  if (!v?.sonuc) return null;
  return (
    <Card accent={v.sonuc === 'G' ? C.gold : C.dim}>
      <View style={st.head}>
        <Icon name="hand-wave" size={18} color={C.gold} />
        <Text style={st.kicker}>{L("VEDA MAÇI")}</Text>
      </View>
      <Text style={st.result}>
        {v.sonuc === 'G'
          ? L("{0} karşısında {1} ile kazandın.", [v.rakip ?? '', v.yontem ?? ''])
          : v.sonuc === 'B'
            ? L("{0} ile berabere kaldın.", [v.rakip ?? ''])
            : L("{0} karşısında kaybettin.", [v.rakip ?? ''])}
      </Text>
      <P dim>{v.sonuc === 'G' ? L("Son zil çaldığında hakem kolunu kaldırdı. Salon dakikalarca ayakta alkışladı; kafesin ortasında eldivenlerini çıkarıp yere bıraktın.") : L("Kol senin için kalkmadı ama salonda oturan kimse kalmadı. Kafesin ortasında eldivenlerini çıkarıp yere bıraktın; alkışlar uzun süre dinmedi.")}</P>
      <P style={{ marginBottom: 0 }}>{coachFarewell(s)}</P>
    </Card>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  kicker: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5 },
  row: { flexDirection: 'row', gap: 8 },
  result: { color: C.text, fontFamily: F.bold, fontSize: 16, marginBottom: 6 },
});
