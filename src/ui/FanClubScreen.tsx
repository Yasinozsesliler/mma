// Taraftar kulübü: kuruluş (isim), seviye ve sadakat, açılan marş/koreografi/giriş şarkısı ve kulüp etkinlikleri.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { money } from '../engine/career';
import { fmtFollowers } from '../engine/fame';
import {
  activities,
  canActivity,
  canFoundClub,
  CHANTS,
  CHOREOS,
  doActivity,
  FAN_MIN_FOLLOWERS,
  fanLevel,
  foundClub,
  levelName,
  members,
  nameSuggestions,
  nextLevelAt,
  setFanChoice,
  SONGS,
  UNLOCKS,
} from '../engine/fanClub';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { Button, Card, Icon, Screen, Section, Title } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

const PINK = '#ff8fb1';

function Choices({ s, act, k, title, list }: { s: GameState; act: Act; k: 'mars' | 'koreo' | 'sarki'; title: string; list: string[] }) {
  const need = UNLOCKS[k];
  const open = fanLevel(s) >= need;
  const cur = s.kulup?.[k];
  return (
    <>
      <Section>{title}</Section>
      {open ? (
        <View style={st.chips}>
          {list.map((t, i) => (
            <Pressable key={t} onPress={() => act((x) => setFanChoice(x, k, i))} style={[st.chip, cur === i && st.chipOn]}>
              <Text style={[st.chipText, cur === i && { color: '#111' }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={st.locked}>
          🔒 {L("Seviye {0} ({1}) ile açılır", [need, levelName(need)])}
        </Text>
      )}
    </>
  );
}

export function FanClubScreen({ s, act }: { s: GameState; act: Act }) {
  const [name, setName] = useState(nameSuggestions(s)[0]);
  const [msg, setMsg] = useState<string | null>(null);
  const back = <Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />;
  const k = s.kulup;

  if (!k) {
    const ok = canFoundClub(s);
    return (
      <Screen footer={back}>
        <Title kicker={L("TARAFTAR KULÜBÜ")} sub={L("Takipçilerinden resmi bir kulüp kur. Kulüp büyüdükçe tribünde marşın, koreografin ve giriş şarkın olur.")}>
          {L("Kulübünü kur")}
        </Title>
        {ok ? (
          <Card>
            <Text style={st.label}>{L("Kulübün adı")}</Text>
            <TextInput style={st.input} value={name} onChangeText={setName} maxLength={32} placeholderTextColor={C.faint} />
            <View style={st.chips}>
              {nameSuggestions(s).map((n) => (
                <Pressable key={n} onPress={() => setName(n)} style={[st.chip, name === n && st.chipOn]}>
                  <Text style={[st.chipText, name === n && { color: '#111' }]}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <Button
              label={L("Kulübü kur")}
              icon="flag"
              tone="gold"
              onPress={() => {
                buzz('basari');
                act((x) => setMsg(foundClub(x, name)));
              }}
            />
          </Card>
        ) : (
          <Text style={st.locked}>🔒 {L("Profesyonel olunca ve {0} takipçiye ulaşınca açılır.", [fmtFollowers(FAN_MIN_FOLLOWERS)])}</Text>
        )}
      </Screen>
    );
  }

  const lvl = fanLevel(s);
  const next = nextLevelAt(s);
  const m = members(s);
  return (
    <Screen footer={back}>
      <Title kicker={L("TARAFTAR KULÜBÜ · SEVİYE {0}", [lvl])} sub={levelName(lvl)}>
        {k.ad}
      </Title>
      <View style={st.meters}>
        <View style={st.meter}>
          <Text style={st.meterLabel}>{L("ÜYE")}</Text>
          <Text style={[st.meterVal, { color: PINK }]}>{m.toLocaleString(LOC)}</Text>
          <Text style={st.meterSub}>{next ? L("Sonraki seviye: {0}", [next.toLocaleString(LOC)]) : L("Zirvede")}</Text>
        </View>
        <View style={st.meter}>
          <Text style={st.meterLabel}>{L("SADAKAT")}</Text>
          <Text style={[st.meterVal, { color: k.sadakat >= 50 ? C.green : k.sadakat >= 25 ? C.orange : C.red }]}>{k.sadakat}/100</Text>
          <Text style={st.meterSub}>{L("Kazandıkça artar")}</Text>
        </View>
      </View>
      {msg ? <Text style={st.msg}>{msg}</Text> : null}

      <Section>{L("KULÜP ETKİNLİĞİ")}</Section>
      {canActivity(s) ? (
        <View style={{ gap: 8 }}>
          {activities(s).map((a) => (
            <View key={a.key}>
              <Button
                label={a.maliyet ? `${a.ad} · ${money(a.maliyet)}` : a.ad}
                tone="ghost"
                disabled={s.para < a.maliyet}
                onPress={() => act((x) => setMsg(doActivity(x, a.key)))}
              />
              <Text style={st.desc}>{a.aciklama}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={st.locked}>{L("Bu maç arasındaki etkinliği yaptın. Sonraki maçtan sonra yeni etkinlik.")}</Text>
      )}

      <Choices s={s} act={act} k="mars" title={L("TRİBÜN MARŞI")} list={CHANTS()} />
      <Choices s={s} act={act} k="koreo" title={L("KOREOGRAFİ")} list={CHOREOS()} />
      <Choices s={s} act={act} k="sarki" title={L("GİRİŞ ŞARKISI")} list={SONGS()} />
      <Section>{L("DEPLASMAN ORDUSU")}</Section>
      <Text style={st.locked}>
        {lvl >= UNLOCKS.deplasman ? (
          <>
            <Icon name="bus" size={13} color={C.gold} /> {L("Kulübün yurt dışı maçlarında da tribünde.")}
          </>
        ) : (
          `🔒 ${L("Seviye {0} ({1}) ile açılır", [UNLOCKS.deplasman, levelName(UNLOCKS.deplasman)])}`
        )}
      </Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  label: { color: C.dim, fontFamily: F.semi, fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: C.text, fontFamily: F.semi, fontSize: 15, backgroundColor: C.cardAlt, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.card },
  chipOn: { backgroundColor: PINK, borderColor: PINK },
  chipText: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  locked: { color: C.faint, fontFamily: F.semi, fontSize: 12, marginBottom: 10, lineHeight: 18 },
  meters: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  meter: { flex: 1, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 10, alignItems: 'center' },
  meterLabel: { color: C.faint, fontFamily: F.semi, fontSize: 10 },
  meterVal: { fontFamily: F.display, fontSize: 22 },
  meterSub: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  msg: { color: C.gold, fontFamily: F.semi, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  desc: { color: C.faint, fontFamily: F.body, fontSize: 12, marginTop: 3 },
});
