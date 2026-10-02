// Sosyal medya krizi kartı: gündem ısısı, kriz metni, son tepkiler ve cevap seçenekleri; sonuçta özet.
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money } from '../engine/career';
import { answerCrisis, closeCrisis, crisisReplies, crisisText, crisisTitle, type CrisisReply } from '../engine/crisis';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Icon, SLANT, type IconName } from './components';
import { C, F } from './theme';

const ICON: Record<CrisisReply, IconName> = { ozur: 'hand-heart', espri: 'emoticon-lol-outline', sert: 'fire', sessiz: 'volume-off', kanit: 'file-check-outline', pr: 'briefcase-account' };
const RES = {
  firsat: { renk: C.green, baslik: () => L("KRİZİ FIRSATA ÇEVİRDİN") },
  kapandi: { renk: C.blue, baslik: () => L("KRİZ KAPANDI") },
  hasar: { renk: C.orange, baslik: () => L("KRİZ YARA BIRAKTI") },
  patladi: { renk: C.red, baslik: () => L("KRİZ PATLADI") },
};

export function CrisisCard({ s, act }: { s: GameState; act: (fn: (s: GameState) => void) => void }) {
  const c = s.kriz;
  if (!c) return null;
  const heatColor = c.isi >= 70 ? C.red : c.isi >= 45 ? C.orange : C.gold;
  if (c.sonuc) {
    const r = RES[c.sonuc];
    return (
      <View style={[st.box, { borderColor: r.renk }]}>
        <Text style={[st.resTitle, SLANT, { color: r.renk }]}>{r.baslik()}</Text>
        <Text style={st.sub}>{crisisTitle(c)}</Text>
        <Text style={st.text}>{c.ozet}</Text>
        <Pressable style={({ pressed }) => [st.close, pressed && { opacity: 0.7 }]} onPress={() => act(closeCrisis)}>
          <Text style={st.closeText}>{L("Tamam")}</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <LinearGradient colors={['#2a0a0c', '#120709']} style={[st.box, { borderColor: '#5a1a1f' }]}>
      <View style={st.head}>
        <Icon name="fire-alert" size={20} color={C.red} />
        <Text style={[st.kicker, SLANT]}>{L("SOSYAL MEDYA KRİZİ")}</Text>
        <Text style={st.round}>{L("Tur {0}/2", [c.cevaplar.length + 1])}</Text>
      </View>
      <Text style={st.title}>{crisisTitle(c)}</Text>
      <Text style={st.text}>{crisisText(s, c)}</Text>
      <View style={st.heatRow}>
        <Text style={st.heatLabel}>{L("GÜNDEM ISISI")}</Text>
        <View style={st.heatBar}>
          <View style={[st.heatFill, { width: `${c.isi}%`, backgroundColor: heatColor }]} />
          <View style={[st.mark, { left: '20%' }]} />
          <View style={[st.mark, { left: '85%' }]} />
        </View>
        <Text style={[st.heatVal, { color: heatColor }]}>{c.isi}</Text>
      </View>
      <Text style={st.legend}>{L("20'nin altına indir: fırsata dönsün · 85'i geçerse patlar · görmezden gelirsen her hafta büyür")}</Text>
      {c.yorumlar.map((y) => (
        <View key={y} style={st.comment}>
          <Icon name="comment-text-outline" size={14} color={C.dim} />
          <Text style={st.commentText}>{y}</Text>
        </View>
      ))}
      <View style={st.replies}>
        {crisisReplies(s, c).map((r) => {
          const off = r.maliyet != null && s.para < r.maliyet;
          return (
            <Pressable
              key={r.id}
              disabled={off}
              style={({ pressed }) => [st.reply, off && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
              onPress={() => {
                buzz('orta');
                act((x) => answerCrisis(x, r.id));
              }}
            >
              <Icon name={ICON[r.id]} size={16} color={r.id === 'sert' ? C.red : r.id === 'pr' ? C.gold : C.text} />
              <Text style={st.replyText}>{r.label}</Text>
              {r.maliyet != null ? <Text style={st.cost}>{money(r.maliyet)}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  box: { borderRadius: 14, borderWidth: 1.5, padding: 12, gap: 8, marginBottom: 12, backgroundColor: C.card },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kicker: { color: C.red, fontFamily: F.display, fontSize: 14, letterSpacing: 1.5, flex: 1 },
  round: { color: C.dim, fontFamily: F.semi, fontSize: 11 },
  title: { color: C.text, fontFamily: F.display, fontSize: 17 },
  text: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  sub: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  heatRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heatLabel: { color: C.dim, fontFamily: F.semi, fontSize: 10, letterSpacing: 1 },
  heatBar: { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#00000088', overflow: 'hidden' },
  heatFill: { height: '100%', borderRadius: 5 },
  mark: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#ffffff55' },
  heatVal: { fontFamily: F.display, fontSize: 15, minWidth: 28, textAlign: 'right' },
  legend: { color: C.faint, fontFamily: F.body, fontSize: 11, lineHeight: 15 },
  comment: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#00000055', borderRadius: 8, padding: 8 },
  commentText: { color: C.text, fontFamily: F.body, fontSize: 13, flex: 1 },
  replies: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  reply: { flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10 },
  replyText: { color: C.text, fontFamily: F.semi, fontSize: 13, flex: 1 },
  cost: { color: C.gold, fontFamily: F.semi, fontSize: 11 },
  resTitle: { fontFamily: F.display, fontSize: 18, letterSpacing: 1 },
  close: { alignSelf: 'flex-end', backgroundColor: C.cardAlt, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  closeText: { color: C.text, fontFamily: F.display, fontSize: 13 },
});
