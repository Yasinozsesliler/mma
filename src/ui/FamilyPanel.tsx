// Aile paneli: evlilik teklifi (sade nikâh / büyük düğün), eş ve çocuklar.
import { StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import { canPropose, propose, weddingCost, weeksToPropose } from '../engine/family';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Button } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

export function FamilyPanel({ s, act, onMsg }: { s: GameState; act: Act; onMsg: (m: string) => void }) {
  const r = s.iliski;
  if (!r) return null;
  const kids = s.cocuklar ?? [];
  return (
    <View style={st.box}>
      {r.durum === 'sevgili' ? (
        canPropose(s) ? (
          <>
            <Text style={st.title}>{L("💍 Evlenme teklif etme zamanı mı?")}</Text>
            <Button
              label={L("Sade nikâh · {0}", [money(weddingCost(s, false))])}
              icon="ring"
              tone="gold"
              disabled={s.para < weddingCost(s, false)}
              onPress={() => {
                buzz('orta');
                act((x) => onMsg(propose(x, false)));
              }}
            />
            <Button
              label={L("Büyük düğün · {0}", [money(weddingCost(s, true))])}
              icon="party-popper"
              tone="ghost"
              disabled={s.para < weddingCost(s, true)}
              onPress={() => {
                buzz('orta');
                act((x) => onMsg(propose(x, true)));
              }}
            />
          </>
        ) : (
          <Text style={st.hint}>{L("💍 {0} hafta sonra evlenme teklif edebilirsin.", [weeksToPropose(s)])}</Text>
        )
      ) : (
        <>
          <Text style={st.title}>{L("💍 Evlisin · {0}", [r.ad])}</Text>
          {kids.length ? (
            kids.map((k) => (
              <Text key={k.ad} style={st.kid}>
                {k.kiz ? '👧' : '👦'} {k.ad}
              </Text>
            ))
          ) : (
            <Text style={st.hint}>{L("Henüz çocuğunuz yok. Belki yakında…")}</Text>
          )}
          {kids.length ? <Text style={st.hint}>{L("Ailen tribündeyken dövüşte kondisyon +1. Her maçtan sonra aile giderleri ödenir.")}</Text> : null}
        </>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: C.card, borderWidth: 1, borderColor: '#5a1a3a', borderRadius: 12, padding: 12, gap: 8, marginBottom: 8 },
  title: { color: C.text, fontFamily: F.display, fontSize: 15 },
  hint: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  kid: { color: C.text, fontFamily: F.semi, fontSize: 14 },
});
