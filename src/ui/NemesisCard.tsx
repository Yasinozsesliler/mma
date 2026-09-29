// Profilde ezeli rakip: kim, aranızdaki seri ve rekabetin durumu.
import { StyleSheet, Text, View } from 'react-native';
import { nemesisDue, nemesisScore } from '../engine/nemesis';
import { lookFor } from '../engine/tale';
import type { GameState } from '../engine/types';
import { L, LOC } from '../i18n';
import { SLANT } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F } from './theme';

const PURPLE = '#b388ff';

export function NemesisCard({ s }: { s: GameState }) {
  const n = s.ezeli;
  if (!n) return null;
  const met = n.g + n.m + n.b;
  const durum = n.bitti
    ? n.m > n.g
      ? L("Rekabet bitti · seriyi sen kazandın")
      : L("Rekabet bitti")
    : met === 0
      ? L("Sana meydan okudu, henüz karşılaşmadınız")
      : nemesisDue(s)
        ? L("Rövanş kapıda: teklif listesinde çıkabilir")
        : n.g > n.m
          ? L("Önde o. Seni izliyor.")
          : n.m > n.g
            ? L("Öndesin. Rövanş istiyor.")
            : L("Seri eşit. Kimse geri adım atmıyor.");
  return (
    <View style={[st.box, n.bitti && { opacity: 0.75 }]}>
      <Text style={st.kicker}>{L("⚔️ EZELİ RAKİP")}</Text>
      <View style={st.row}>
        <FighterAvatar look={lookFor({ id: n.id, uyruk: n.uyruk, kadin: s.fighter.kadin })} size={60} ring={PURPLE} />
        <View style={{ flex: 1 }}>
          <Text style={st.nick}>“{n.lakap.toLocaleUpperCase(LOC)}”</Text>
          <Text style={[st.name, SLANT]} numberOfLines={1}>
            {`${n.ad} ${n.soyad}`}
          </Text>
          <Text style={st.meta}>{n.uyruk}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={st.score}>{met ? nemesisScore(n) : '0-0'}</Text>
          <Text style={st.scoreLabel}>{L("SEN - O")}</Text>
        </View>
      </View>
      <Text style={st.durum}>{durum}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: '#120d1c', borderWidth: 1, borderColor: '#4a3470', borderRadius: 14, padding: 12, gap: 8, marginBottom: 12 },
  kicker: { color: PURPLE, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nick: { color: PURPLE, fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  name: { color: C.text, fontFamily: F.display, fontSize: 19 },
  meta: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  score: { color: C.text, fontFamily: F.display, fontSize: 24 },
  scoreLabel: { color: C.faint, fontFamily: F.semi, fontSize: 9, letterSpacing: 1 },
  durum: { color: C.dim, fontFamily: F.body, fontSize: 13 },
});
