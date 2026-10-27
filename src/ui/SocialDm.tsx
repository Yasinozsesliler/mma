// Instagram mesaj kutusu: sohbet listesi ve sohbet ekranı. Her mesaja hazır cevaplardan biriyle yanıt verilir.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { answerDm, dmExpired, readDm, type DmKind, type DmMsg } from '../engine/dm';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { Icon, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

const KIND: Record<DmKind, { icon: IconName; color: string; label: () => string }> = {
  rakip: { icon: 'sword-cross', color: '#e63946', label: () => L("Rakip") },
  promotor: { icon: 'briefcase', color: '#3a86ff', label: () => L("Promotör") },
  sponsor: { icon: 'handshake', color: '#f2c14e', label: () => L("Sponsor") },
  hayran: { icon: 'heart', color: '#ff8fb1', label: () => L("Hayran") },
  troll: { icon: 'emoticon-devil', color: '#8a8f98', label: () => L("Troll") },
  sevgili: { icon: 'heart-multiple', color: '#fd267a', label: () => L("Sevgilin") },
  aile: { icon: 'home-heart', color: '#f4a261', label: () => L("Aile") },
  hoca: { icon: 'whistle', color: '#3ecf7a', label: () => L("Hocan") },
  kanka: { icon: 'arm-flex', color: '#4cc9f0', label: () => L("Salon arkadaşı") },
  gazeteci: { icon: 'newspaper-variant', color: '#9aa0a6', label: () => L("Basın") },
  dolandirici: { icon: 'alert-octagon', color: '#ff8a5c', label: () => L("Bilinmeyen") },
  efsane: { icon: 'crown', color: '#f2c14e', label: () => L("Efsane") },
  unlu: { icon: 'star-four-points', color: '#c86bff', label: () => L("Ünlü") },
};

/** Mesaj metni oluştuğu dilde saklanır; dil değiştiyse ve sabit bir metinse yeni dilde gösterilir. */
const tx = (t: string) => L(t);

const ago = (s: GameState, m: DmMsg) => {
  const d = s.hafta - m.hafta;
  return d <= 0 ? L("bu hafta") : L("{0} hf", [d]);
};

function Avatar({ m, size = 52 }: { m: DmMsg; size?: number }) {
  const k = KIND[m.kind];
  return (
    <View style={[st.av, { width: size, height: size, borderRadius: size / 2, borderColor: k.color + '88', backgroundColor: k.color + '22' }]}>
      <Icon name={k.icon} size={size * 0.44} color={k.color} />
    </View>
  );
}

export function DmInbox({ s, onOpen, onBack }: { s: GameState; onOpen: (id: string) => void; onBack: () => void }) {
  const list = s.dm?.liste ?? [];
  return (
    <View>
      <View style={st.head}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Icon name="arrow-left" size={26} color={C.text} />
        </Pressable>
        <Text style={st.headTitle}>{L("Mesajlar")}</Text>
        <View style={{ width: 26 }} />
      </View>
      {list.length === 0 ? (
        <View style={st.empty}>
          <Icon name="send-circle-outline" size={64} color={C.faint} />
          <Text style={st.emptyTitle}>{L("Henüz mesaj yok")}</Text>
          <Text style={st.emptySub}>{L("Rakiplerin, hayranların ve sponsorların maçlar yaklaştıkça yazmaya başlar.")}</Text>
        </View>
      ) : null}
      {list.map((m) => {
        const bekliyor = m.cevap == null && !dmExpired(s, m);
        return (
          <Pressable key={m.id} onPress={() => onOpen(m.id)} style={({ pressed }) => [st.row, pressed && { backgroundColor: '#ffffff08' }]}>
            <Avatar m={m} />
            <View style={{ flex: 1 }}>
              <Text style={[st.name, !m.okundu && { fontFamily: F.bold }]} numberOfLines={1}>
                {tx(m.kimden)}
              </Text>
              <Text style={[st.preview, !m.okundu && { color: C.text, fontFamily: F.semi }]} numberOfLines={1}>
                {m.cevapMetin ? L("Sen: {0}", [tx(m.cevapMetin)]) : tx(m.metin)} · {ago(s, m)}
              </Text>
            </View>
            {!m.okundu ? <View style={st.dot} /> : bekliyor ? <Icon name="reply" size={18} color={C.faint} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function DmChat({ s, act, id, onBack }: { s: GameState; act: Act; id: string; onBack: () => void }) {
  const m = s.dm?.liste.find((x) => x.id === id);
  if (!m) return null;
  const k = KIND[m.kind];
  const expired = dmExpired(s, m);
  return (
    <View>
      <View style={st.head}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Icon name="arrow-left" size={26} color={C.text} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginLeft: 14 }}>
          <Avatar m={m} size={34} />
          <View style={{ flex: 1 }}>
            <Text style={st.chatName} numberOfLines={1}>
              {tx(m.kimden)}
            </Text>
            <Text style={st.chatSub} numberOfLines={1}>
              {k.label()} · {m.kullanici}
            </Text>
          </View>
        </View>
      </View>
      <View style={st.chat}>
        <Text style={st.when}>{ago(s, m)}</Text>
        <View style={st.themRow}>
          <Avatar m={m} size={26} />
          <View style={st.them}>
            <Text style={st.bubbleText}>{tx(m.metin)}</Text>
          </View>
        </View>
        {m.cevapMetin ? (
          <View style={st.me}>
            <Icon name="reply" size={14} color="#8fb0ff" />
            <Text style={[st.bubbleText, { color: '#fff' }]}>{tx(m.cevapMetin)}</Text>
          </View>
        ) : null}
        {m.sonuc ? (
          <View style={st.result}>
            <Icon name="information-outline" size={14} color={C.gold} />
            <Text style={st.resultText}>{m.sonuc}</Text>
          </View>
        ) : null}
        {expired ? <Text style={st.expired}>{L("Bu mesajın cevap süresi geçti.")}</Text> : null}
      </View>
      {m.cevap == null && !expired ? (
        <View style={st.replies}>
          <Text style={st.replyHint}>{L("CEVAP SEÇ")}</Text>
          {m.secenek.map((o, i) => (
            <Pressable
              key={o}
              onPress={() =>
                act((x) => {
                  answerDm(x, m.id, i);
                })
              }
              style={({ pressed }) => [st.reply, pressed && { borderColor: '#3a86ff', backgroundColor: '#3a86ff22' }]}
            >
              <Text style={st.replyText}>{tx(o)}</Text>
              <Icon name="send" size={16} color="#3a86ff" />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Sohbet açılınca okundu işaretle. */
export const markRead = (act: Act, id: string) =>
  act((x) => {
    readDm(x, id);
  });

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, marginHorizontal: -16, paddingHorizontal: 16, marginBottom: 6 },
  headTitle: { color: C.text, fontFamily: F.bold, fontSize: 18 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { color: C.text, fontFamily: F.bold, fontSize: 18 },
  emptySub: { color: C.dim, fontFamily: F.body, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, marginHorizontal: -16, paddingHorizontal: 16 },
  av: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  name: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  preview: { color: C.dim, fontFamily: F.body, fontSize: 13, marginTop: 2 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#3a86ff' },
  chatName: { color: C.text, fontFamily: F.bold, fontSize: 15 },
  chatSub: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  chat: { paddingVertical: 12, gap: 10 },
  when: { color: C.faint, fontFamily: F.body, fontSize: 11, textAlign: 'center' },
  themRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '85%' },
  them: { backgroundColor: '#26272b', borderRadius: 18, borderBottomLeftRadius: 4, paddingVertical: 9, paddingHorizontal: 13, flexShrink: 1 },
  me: { alignSelf: 'flex-end', maxWidth: '80%', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1d2a52', borderWidth: 1, borderColor: '#3a5bff', borderRadius: 18, borderBottomRightRadius: 4, paddingVertical: 8, paddingHorizontal: 12 },
  bubbleText: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 19 },
  result: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#1a1408', borderWidth: 1, borderColor: C.goldDeep, borderRadius: 10, padding: 10, marginTop: 4 },
  resultText: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 18 },
  expired: { color: C.faint, fontFamily: F.body, fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
  replies: { gap: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  replyHint: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 1.5 },
  reply: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderWidth: 1, borderColor: C.border, borderRadius: 22, paddingVertical: 11, paddingHorizontal: 16, backgroundColor: C.card },
  replyText: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 14 },
});
