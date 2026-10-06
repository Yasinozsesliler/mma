import { L, LOC } from '../i18n';
import { closeCrisis } from '../engine/crisis';
import { CrisisCard } from './CrisisCard';
import { fmtFollowers, followerBoard, followers } from '../engine/fame';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { IDEA_KATS, postIdeas, type IdeaKat } from '../engine/postIdeas';
import { fullName } from '../engine/character';
import { playerHandle, playerPost, REPLY_TONES, replyToPost } from '../engine/social';
import type { GameState, Post } from '../engine/types';
import { Button, Card, Icon, P, Screen, SLANT, Title, type IconName } from './components';
import type { Act } from './GameScreens';
import { FighterAvatar } from './FighterAvatar';
import { C, F, R } from './theme';


const TUR: Record<Post['tur'], { renk: string; ikon: IconName; etiket: string }> = {
  oyuncu: { renk: C.red, ikon: 'account', etiket: L('SEN') },
  dovuscu: { renk: C.blue, ikon: 'boxing-glove', etiket: L("DÖVÜŞÇÜ") },
  medya: { renk: C.gold, ikon: 'newspaper-variant-outline', etiket: L("MEDYA") },
  taraftar: { renk: C.dim, ikon: 'account-group', etiket: L("TARAFTAR") },
  hikaye: { renk: C.gold, ikon: 'movie-open-star', etiket: L("MAÇIN HİKÂYESİ") },
  organizasyon: { renk: '#b57bff', ikon: 'office-building', etiket: L("RESMİ") },
};

const ago = (s: GameState, h: number) => (s.hafta - h <= 0 ? L("bu hafta") : L("{0} hf önce", [s.hafta - h]));

function Avatar({ name, color }: { name: string; color: string }) {
  const ini = name
    .split(' ')
    .filter((w) => /^\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toLocaleUpperCase(LOC);
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
            <Text style={so.statText}>{fmtFollowers(p.begeni)}</Text>
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

function FollowerBoard({ s }: { s: GameState }) {
  const all = followerBoard(s);
  const myIdx = all.findIndex((r) => r.oyuncu);
  const top = all.slice(0, 10);
  const rows = myIdx >= 10 ? [...top, all[myIdx]] : top;
  const max = all[0]?.takipci || 1;
  return (
    <View style={so.board}>
      <Text style={so.boardTitle}>{L("EN ÇOK TAKİP EDİLENLER")}</Text>
      <Text style={so.boardSub}>
        {s.stage === 'ufc' ? L("Sıkletin ve UCC’nin P4P yıldızları") : L("Sıkletindeki dövüşçüler")} {L("· Sıran: #")}{myIdx + 1} / {all.length}
      </Text>
      {rows.map((r) => {
        const i = all.indexOf(r);
        return (
          <View key={r.id} style={[so.boardRow, r.oyuncu && so.boardMe]}>
            <Text style={[so.boardRank, i < 3 && { color: C.gold }]}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={so.boardName} numberOfLines={1}>
                {r.ad}
                {r.sampiyon ? ' 👑' : ''}
                {r.oyuncu ? <Text style={{ color: C.red }}>{L('  SEN')}</Text> : null}
              </Text>
              <View style={so.boardBar}>
                <View style={{ width: `${Math.max(3, (r.takipci / max) * 100)}%`, height: '100%', borderRadius: 2, backgroundColor: r.oyuncu ? C.red : i < 3 ? C.gold : '#3aa8ff' }} />
              </View>
              <Text style={so.boardAlt}>{r.alt}</Text>
            </View>
            <Text style={[so.boardVal, r.oyuncu && { color: C.red }]}>{fmtFollowers(r.takipci)}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function SocialScreen({ s, act }: { s: GameState; act: Act }) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<'hepsi' | 'dovuscu' | 'hikaye' | 'takipci'>('hepsi');
  const [kat, setKat] = useState<IdeaKat>(s.pending.rakip ? 'trash' : s.gecmis.length ? 'sonuc' : 'kamp');
  const [tur, setTur] = useState(0);
  const ideas = postIdeas(s, kat, tur);
  const posts = (s.sosyal ?? []).filter((p) => filter === 'hepsi' || p.tur === filter || (filter === 'dovuscu' && p.tur === 'oyuncu'));
  const takipci = followers(s);
  const send = () => {
    if (!text.trim()) return;
    act((x) => setMsg(playerPost(x, text)));
    setText('');
  };
  return (
    <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => {
            // Sonuçlanmış kriz bu ekranda görüldü: çıkarken kapanır, ana sayfada tekrar çıkmaz
            closeCrisis(x);
            x.phase = 'hub';
          })} />}>
      <Title kicker={L("KAFES · SOSYAL")} sub={L("Rakiplerin burada konuşur. Sen de konuş ama sözlerinin bedeli var.")}>
        
        {L("Sosyal Medya")}
      </Title>
      <CrisisCard s={s} act={act} />
      <View style={so.profile}>
        <FighterAvatar look={s.fighter.gorunum} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={[so.author, SLANT]}>{fullName(s.fighter)}</Text>
          <Text style={so.handle}>{playerHandle(s)}</Text>
          {s.fighter.hakkinda ? <Text style={[so.replyText, { marginTop: 4 }]} numberOfLines={3}>{s.fighter.hakkinda}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[so.follow, SLANT]}>{fmtFollowers(takipci)}</Text>
          <Text style={so.handle}>{L("takipçi")}</Text>
        </View>
      </View>

      <View style={so.compose}>
        <TextInput
          style={so.input}
          value={text}
          onChangeText={setText}
          placeholder={L("Ne düşünüyorsun? Bir rakibi etiketle (@isim ya da soyadı)…")}
          placeholderTextColor={C.faint}
          multiline
          maxLength={280}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={so.kats}>
          {IDEA_KATS.map((k) => (
            <Pressable key={k.id} onPress={() => { setKat(k.id); setTur(0); }} style={[so.kat, kat === k.id && so.katOn]}>
              <Icon name={k.ikon as IconName} size={12} color={kat === k.id ? '#fff' : C.dim} />
              <Text style={[so.katText, kat === k.id && { color: '#fff' }]}>{k.ad}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={so.tpls}>
          {ideas.map((t) => (
            <Pressable key={t} onPress={() => setText(t)} style={({ pressed }) => [so.tpl, pressed && { borderColor: C.red }]}>
              <Text style={so.tplText} numberOfLines={2}>
                {t}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setTur(tur + 1)} style={so.shuffle}>
            <Icon name="shuffle-variant" size={14} color={C.gold} />
            <Text style={so.shuffleText}>{L("BAŞKA ÖNERİLER")}</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={so.handle}>{text.length}/280</Text>
          <Pressable onPress={send} disabled={!text.trim()} style={({ pressed }) => [so.send, { opacity: !text.trim() ? 0.35 : pressed ? 0.7 : 1 }]}>
            <Icon name="send" size={14} color="#fff" />
            <Text style={so.sendText}>{L("PAYLAŞ")}</Text>
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
            ['hepsi', L("AKIŞ")],
            ['dovuscu', L("DÖVÜŞÇÜLER")],
            ['hikaye', L("HİKÂYELER")],
            ['takipci', L("TAKİPÇİ")],
          ] as const
        ).map(([k, l]) => (
          <Pressable key={k} onPress={() => setFilter(k)} style={[so.filter, filter === k && so.filterOn]}>
            <Text style={[so.filterText, filter === k && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      {filter === 'takipci' ? (
        <FollowerBoard s={s} />
      ) : (
        <>
          {posts.length === 0 ? <P dim>{L("Henüz paylaşım yok. İlk dövüşünden sonra ortalık hareketlenecek.")}</P> : null}
          {posts.map((p) => (
            <PostCard key={p.id} s={s} p={p} act={act} onMsg={setMsg} />
          ))}
        </>
      )}
    </Screen>
  );
}

const so = StyleSheet.create({
  board: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12 },
  boardTitle: { color: C.gold, fontFamily: F.display, fontSize: 16, letterSpacing: 1.5 },
  boardSub: { color: C.faint, fontFamily: F.body, fontSize: 12, marginBottom: 8 },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  boardMe: { backgroundColor: '#2a0a10', borderRadius: 6, paddingHorizontal: 6 },
  boardRank: { width: 24, color: C.dim, fontFamily: F.display, fontSize: 18, textAlign: 'center' },
  boardName: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  boardBar: { height: 4, backgroundColor: '#15161a', borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  boardAlt: { color: C.faint, fontFamily: F.body, fontSize: 11, marginTop: 2 },
  boardVal: { color: C.text, fontFamily: F.display, fontSize: 16, minWidth: 56, textAlign: 'right' },
  kats: { gap: 6, paddingVertical: 8 },
  kat: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardAlt },
  katOn: { backgroundColor: C.red, borderColor: C.red },
  katText: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  shuffle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  shuffleText: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10 },
  follow: { color: C.text, fontFamily: F.display, fontSize: 22 },
  compose: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.red + '66', padding: 12, marginBottom: 12, gap: 10 },
  input: { color: C.text, fontFamily: F.body, fontSize: 15, minHeight: 70, textAlignVertical: 'top', backgroundColor: '#060607', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: C.border },
  tpls: { gap: 6, marginBottom: 6 },
  tpl: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: C.cardAlt },
  tplText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
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
