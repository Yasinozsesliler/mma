import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { fullName } from '../engine/character';
import { playerHandle, playerPost, REPLY_TONES, replyToPost } from '../engine/social';
import type { GameState, Post } from '../engine/types';
import { Button, Card, Icon, P, Screen, SLANT, Title, type IconName } from './components';
import type { Act } from './GameScreens';
import { FighterAvatar } from './FighterAvatar';
import { C, F, R } from './theme';

const TEMPLATES = [
  'Kampa başladım. Kimse beni durduramaz. 🥊',
  'Sıradaki kim? Sıklette korkan herkes kaçıyor.',
  'Taraftarlarıma teşekkür ederim, siz olmasanız bu yol yürünmezdi. 🙏',
  'Şampiyon, kemerini hazırla. Geliyorum.',
];

const TUR: Record<Post['tur'], { renk: string; ikon: IconName; etiket: string }> = {
  oyuncu: { renk: C.red, ikon: 'account', etiket: 'SEN' },
  dovuscu: { renk: C.blue, ikon: 'boxing-glove', etiket: 'DÖVÜŞÇÜ' },
  medya: { renk: C.gold, ikon: 'newspaper-variant-outline', etiket: 'MEDYA' },
  taraftar: { renk: C.dim, ikon: 'account-group', etiket: 'TARAFTAR' },
  hikaye: { renk: C.gold, ikon: 'movie-open-star', etiket: 'MAÇIN HİKÂYESİ' },
  organizasyon: { renk: '#b57bff', ikon: 'office-building', etiket: 'RESMİ' },
};

const ago = (s: GameState, h: number) => (s.hafta - h <= 0 ? 'bu hafta' : `${s.hafta - h} hf önce`);
const kfmt = (n: number) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}B` : `${n}`);

function Avatar({ name, color }: { name: string; color: string }) {
  const ini = name
    .split(' ')
    .filter((w) => /^\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toLocaleUpperCase('tr-TR');
  return (
    <View style={[so.avatar, { borderColor: color, backgroundColor: color + '22' }]}>
      <Text style={[so.avatarText, { color }]}>{ini}</Text>
    </View>
  );
}

function PostCard({ s, p, act, onMsg }: { s: GameState; p: Post; act: Act; onMsg: (m: string) => void }) {
  const t = TUR[p.tur];
  const color = p.renk ?? t.renk;
  const story = p.tur === 'hikaye';
  const canReply = p.tur === 'dovuscu' && !!p.hedefId && !p.yanitlandi;
  return (
    <View style={[so.post, story && so.story]}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {p.tur === 'oyuncu' ? <FighterAvatar look={s.fighter.gorunum} size={42} /> : <Avatar name={p.yazar} color={color} />}
        <View style={{ flex: 1 }}>
          <View style={so.head}>
            <Text style={so.author} numberOfLines={1}>
              {p.yazar}
            </Text>
            <View style={[so.badge, { borderColor: color }]}>
              <Icon name={t.ikon} size={10} color={color} />
              <Text style={[so.badgeText, { color }]}>{t.etiket}</Text>
            </View>
          </View>
          <Text style={so.handle}>
            {p.kullanici} · {ago(s, p.hafta)}
          </Text>
          <Text style={[so.text, story && { fontFamily: F.semi }]}>{p.metin}</Text>
          <View style={so.stats}>
            <Icon name="heart" size={13} color={C.red} />
            <Text style={so.statText}>{kfmt(p.begeni)}</Text>
            <Icon name="message-reply-text" size={13} color={C.faint} />
            <Text style={so.statText}>{p.yanitlar?.length ?? 0}</Text>
          </View>
          {p.yanitlar?.map((y, i) => (
            <View key={i} style={so.reply}>
              <Text style={so.replyAuthor}>{y.yazar}</Text>
              <Text style={so.replyText}>{y.metin}</Text>
            </View>
          ))}
          {canReply ? (
            <View style={so.replyRow}>
              {REPLY_TONES.map((r) => (
                <Pressable key={r.key} onPress={() => act((x) => onMsg(replyToPost(x, p.id, r.key)))} style={({ pressed }) => [so.replyBtn, pressed && { opacity: 0.6 }]}>
                  <Icon name={r.ikon as IconName} size={13} color={C.text} />
                  <Text style={so.replyBtnText}>{r.ad}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function SocialScreen({ s, act }: { s: GameState; act: Act }) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<'hepsi' | 'dovuscu' | 'hikaye'>('hepsi');
  const posts = (s.sosyal ?? []).filter((p) => filter === 'hepsi' || p.tur === filter || (filter === 'dovuscu' && p.tur === 'oyuncu'));
  const takipci = Math.round(200 + s.populerlik * s.populerlik * 45);
  const send = () => {
    if (!text.trim()) return;
    act((x) => setMsg(playerPost(x, text)));
    setText('');
  };
  return (
    <Screen footer={<Button label="Kariyere dön" icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <Title kicker="KAFES · SOSYAL" sub="Rakiplerin burada konuşur. Sen de konuş ama sözlerinin bedeli var.">
        Sosyal Medya
      </Title>
      <View style={so.profile}>
        <FighterAvatar look={s.fighter.gorunum} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={[so.author, SLANT]}>{fullName(s.fighter)}</Text>
          <Text style={so.handle}>{playerHandle(s)}</Text>
          {s.fighter.hakkinda ? <Text style={[so.replyText, { marginTop: 4 }]} numberOfLines={3}>{s.fighter.hakkinda}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[so.follow, SLANT]}>{kfmt(takipci)}</Text>
          <Text style={so.handle}>takipçi</Text>
        </View>
      </View>

      <View style={so.compose}>
        <TextInput
          style={so.input}
          value={text}
          onChangeText={setText}
          placeholder="Ne düşünüyorsun? Bir rakibi etiketle (@isim ya da soyadı)…"
          placeholderTextColor={C.faint}
          multiline
          maxLength={280}
        />
        <View style={so.tpls}>
          {TEMPLATES.map((t) => (
            <Pressable key={t} onPress={() => setText(t)} style={so.tpl}>
              <Text style={so.tplText} numberOfLines={1}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={so.handle}>{text.length}/280</Text>
          <Pressable onPress={send} disabled={!text.trim()} style={({ pressed }) => [so.send, { opacity: !text.trim() ? 0.35 : pressed ? 0.7 : 1 }]}>
            <Icon name="send" size={14} color="#fff" />
            <Text style={so.sendText}>PAYLAŞ</Text>
          </Pressable>
        </View>
      </View>
      {msg ? (
        <Card accent={C.gold}>
          <P style={{ marginBottom: 0 }}>{msg}</P>
        </Card>
      ) : null}

      <View style={so.filters}>
        {(
          [
            ['hepsi', 'AKIŞ'],
            ['dovuscu', 'DÖVÜŞÇÜLER'],
            ['hikaye', 'HİKÂYELER'],
          ] as const
        ).map(([k, l]) => (
          <Pressable key={k} onPress={() => setFilter(k)} style={[so.filter, filter === k && so.filterOn]}>
            <Text style={[so.filterText, filter === k && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      {posts.length === 0 ? <P dim>Henüz paylaşım yok. İlk dövüşünden sonra ortalık hareketlenecek.</P> : null}
      {posts.map((p) => (
        <PostCard key={p.id} s={s} p={p} act={act} onMsg={setMsg} />
      ))}
    </Screen>
  );
}

const so = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10 },
  follow: { color: C.text, fontFamily: F.display, fontSize: 22 },
  compose: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.red + '66', padding: 12, marginBottom: 12, gap: 10 },
  input: { color: C.text, fontFamily: F.body, fontSize: 15, minHeight: 70, textAlignVertical: 'top', backgroundColor: '#060607', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: C.border },
  tpls: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tpl: { maxWidth: '100%', borderWidth: 1, borderColor: C.border, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: C.cardAlt },
  tplText: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  send: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.red, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 3, transform: [{ skewX: '-10deg' }] },
  sendText: { color: '#fff', fontFamily: F.display, fontSize: 14, letterSpacing: 1 },
  filters: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  filter: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 3, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, transform: [{ skewX: '-8deg' }] },
  filterOn: { backgroundColor: C.red, borderColor: C.red },
  filterText: { color: C.dim, fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  post: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 8 },
  story: { borderColor: C.goldDeep, backgroundColor: '#140f05' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  author: { color: C.text, fontFamily: F.bold, fontSize: 14, flexShrink: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontFamily: F.display, fontSize: 9, letterSpacing: 0.8 },
  handle: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  text: { color: C.text, fontFamily: F.body, fontSize: 15, lineHeight: 21, marginTop: 6 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  statText: { color: C.faint, fontFamily: F.semi, fontSize: 12, marginRight: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: F.display, fontSize: 15 },
  reply: { marginTop: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: C.border },
  replyAuthor: { color: C.dim, fontFamily: F.bold, fontSize: 12 },
  replyText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  replyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.border, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: C.cardAlt },
  replyBtnText: { color: C.text, fontFamily: F.semi, fontSize: 12 },
});
