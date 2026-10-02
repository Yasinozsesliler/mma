// Yıl sonu ödül töreni: kategori kategori adaylar okunur, zarf açılır, kazanan sahneye çağrılır.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { AWARD_NAMES, closeAwards, openEnvelope } from '../engine/awards';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { Button, Icon, Screen, SLANT } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

export function AwardsCeremony({ s, act }: { s: GameState; act: Act }) {
  const t = s.odulToren;
  if (!t) {
    return (
      <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act(closeAwards)} />}>
        <Text style={st.text}>{L("Tören sona erdi.")}</Text>
      </Screen>
    );
  }
  const me = `${s.fighter.ad} ${s.fighter.soyad}`;
  const done = t.acilan >= t.sonuclar.length;
  const cur = t.sonuclar[Math.min(t.acilan, t.sonuclar.length - 1)];
  const last = t.acilan > 0 ? t.sonuclar[t.acilan - 1] : null;
  const won = t.sonuclar.slice(0, t.acilan).filter((r) => r.oyuncu).length;
  return (
    <Screen
      footer={
        done ? (
          <Button label={L("Törenden ayrıl")} icon="exit-run" tone="gold" onPress={() => act(closeAwards)} />
        ) : (
          <Button
            label={L("Zarfı aç")}
            icon="email-open"
            tone="gold"
            onPress={() => {
              const r = t.sonuclar[t.acilan];
              sfx(r.oyuncu ? 'fanfare' : 'applause', r.oyuncu ? 1 : 0.6);
              buzz(r.oyuncu ? 'basari' : 'hafif');
              act(openEnvelope);
            }}
          />
        )
      }
    >
      <LinearGradient colors={['#2e2206', '#0b0b0e']} style={st.stage}>
        <Icon name="trophy-award" size={40} color={C.gold} />
        <Text style={[st.title, SLANT]}>{L("{0}. YIL ÖDÜL TÖRENİ", [t.yil])}</Text>
        <Text style={st.sub}>{L("Sezonun en iyileri ödüllerini alıyor. Bu yıl kaç kupa kaldıracaksın?")}</Text>
        <View style={st.dots}>
          {t.sonuclar.map((r, i) => (
            <View key={r.kat} style={[st.dot, i < t.acilan && { backgroundColor: r.oyuncu ? C.gold : C.dim }]} />
          ))}
        </View>
      </LinearGradient>
      {last ? (
        <View style={[st.result, { borderColor: last.oyuncu ? C.gold : C.border }]}>
          <Text style={st.cat}>{AWARD_NAMES[last.kat]().toLocaleUpperCase(LOC)}</Text>
          <Text style={[st.winner, SLANT, { color: last.oyuncu ? C.gold : C.text }]}>{last.oyuncu ? L("🏆 KAZANAN: SEN!") : `${L("Kazanan")}: ${last.kazanan}`}</Text>
          {last.oyuncu && last.not ? <Text style={st.note}>{last.not}</Text> : null}
          {!last.oyuncu && last.adaylar.includes(me) ? <Text style={st.note}>{L("Aday oldun ama bu yıl olmadı.")}</Text> : null}
        </View>
      ) : null}
      {!done ? (
        <View style={st.card}>
          <Text style={st.cat}>{AWARD_NAMES[cur.kat]().toLocaleUpperCase(LOC)}</Text>
          <Text style={st.label}>{L("Adaylar")}</Text>
          {cur.adaylar.map((a) => (
            <View key={a} style={st.nom}>
              <Icon name={a === me ? 'account-star' : 'account'} size={16} color={a === me ? C.red : C.dim} />
              <Text style={[st.nomText, a === me && { color: C.text, fontFamily: F.display }]}>{a === me ? `${a} (${L("sen")})` : a}</Text>
            </View>
          ))}
          {cur.adaylar.includes(me) && cur.not ? <Text style={st.note}>{cur.not}</Text> : null}
        </View>
      ) : (
        <View style={st.card}>
          <Text style={[st.winner, SLANT, { color: won ? C.gold : C.text }]}>{won ? L("Bu yıl {0} ödül kazandın!", [won]) : L("Bu yıl ödül çıkmadı. Seneye!")}</Text>
        </View>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  stage: { borderRadius: 14, borderWidth: 1, borderColor: '#4a3810', padding: 16, alignItems: 'center', gap: 6, marginBottom: 12 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 20, letterSpacing: 1, textAlign: 'center' },
  sub: { color: C.dim, fontFamily: F.body, fontSize: 13, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: C.border },
  result: { borderWidth: 1.5, borderRadius: 14, padding: 14, gap: 4, marginBottom: 12, backgroundColor: C.card, alignItems: 'center' },
  card: { borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, gap: 8, backgroundColor: C.card },
  cat: { color: C.gold, fontFamily: F.display, fontSize: 14, letterSpacing: 1.5, textAlign: 'center' },
  label: { color: C.dim, fontFamily: F.semi, fontSize: 11 },
  nom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nomText: { color: C.dim, fontFamily: F.semi, fontSize: 14 },
  winner: { fontFamily: F.display, fontSize: 18, textAlign: 'center' },
  note: { color: C.dim, fontFamily: F.body, fontSize: 12, textAlign: 'center' },
  text: { color: C.text, fontFamily: F.body, fontSize: 14 },
});
