// Sosyal medya ana sayfası (Instagram akışı): hikâye şeridi, dövüşçülerin fotoğrafları, medya ve taraftar paylaşımları.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fmtFollowers } from '../engine/fame';
import { markStorySeen, storiesFor, storySeen, toggleLike, type Story } from '../engine/feed';
import { handleOf, REPLY_TONES, replyToPost } from '../engine/social';
import { lookFor } from '../engine/tale';
import type { Appearance, GameState, Opponent, Post } from '../engine/types';
import { L } from '../i18n';
import { Icon, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { PhotoArt } from './PhotoArt';
import { BLUE_TICK, Measure, StoryRing } from './SocialPhoto';
import { C, F } from './theme';

const ago = (s: GameState, h: number) => (s.hafta - h <= 0 ? L("bu hafta") : L("{0} hf", [s.hafta - h]));

/** Yazılı paylaşımlar Instagram'daki yazı gönderileri gibi renkli kare görsel olur. */
const TEXT_BG: Record<Post['tur'], [string, string, string]> = {
  oyuncu: ['#4a0c16', '#14050a', '#ffb3bd'],
  dovuscu: ['#0c2244', '#060a14', '#9cc4ff'],
  medya: ['#3a2a0a', '#100c04', C.gold],
  taraftar: ['#262a33', '#0d0f13', '#d9dbe0'],
  hikaye: ['#3a0c14', '#0a0b0e', C.gold],
  organizasyon: ['#2a1450', '#0a0812', '#d6b8ff'],
};
const TUR_ICON: Record<Post['tur'], IconName> = { oyuncu: 'account', dovuscu: 'boxing-glove', medya: 'newspaper-variant-outline', taraftar: 'account-group', hikaye: 'movie-open-star', organizasyon: 'office-building' };

/** Paylaşımı yapan dövüşçünün görünüşü (fotoğrafındaki, ya da sıralamadan bulunan). */
function authorLook(s: GameState, p: Post): Appearance | undefined {
  if (p.tur === 'oyuncu') return s.fighter.gorunum;
  if (p.foto?.look) return p.foto.look;
  if (p.tur !== 'dovuscu') return undefined;
  const pool: Opponent[] = [...(s.bolum?.liste ?? []), ...(s.bolum?.sampiyon ? [s.bolum.sampiyon] : []), ...s.rakipler, ...(s.pending.rakip ? [s.pending.rakip] : [])];
  const o = pool.find((x) => handleOf(x.ad, x.soyad) === p.kullanici);
  return o ? lookFor(o) : undefined;
}

function Avatar({ s, p, size = 32 }: { s: GameState; p: Post; size?: number }) {
  const look = authorLook(s, p);
  if (look) return <FighterAvatar look={look} size={size} />;
  const col = TEXT_BG[p.tur][2];
  return (
    <View style={[st.iconAv, { width: size, height: size, borderRadius: size / 2, borderColor: col + '88' }]}>
      <Icon name={TUR_ICON[p.tur]} size={size * 0.5} color={col} />
    </View>
  );
}

const verified = (s: GameState, p: Post) => p.tur === 'organizasyon' || p.tur === 'medya' || (!!s.bolum?.sampiyon && handleOf(s.bolum.sampiyon.ad, s.bolum.sampiyon.soyad) === p.kullanici);

function TextArt({ p, w }: { p: Post; w: number }) {
  const [a, b, col] = TEXT_BG[p.tur];
  const n = p.metin.length;
  const fs = n < 60 ? 24 : n < 120 ? 19 : n < 200 ? 16 : 14;
  return (
    <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: w, height: w, padding: 26, justifyContent: 'center' }}>
      <Icon name="format-quote-open" size={34} color={col + '88'} />
      <Text style={[st.textArt, { fontSize: fs, lineHeight: fs * 1.32 }]}>{p.metin}</Text>
      <Text style={[st.textArtBy, { color: col }]}>{p.kullanici}</Text>
    </LinearGradient>
  );
}

export function FeedPost({ s, p, act, onMsg }: { s: GameState; p: Post; act: Act; onMsg: (m: string) => void }) {
  const [reply, setReply] = useState(false);
  const canReply = p.tur === 'dovuscu' && !!p.hedefId && !p.yanitlandi;
  const comments = p.foto ? [...p.foto.yorumlar, ...(p.yanitlar ?? []).filter((y) => !p.foto!.yorumlar.includes(y))] : (p.yanitlar ?? []);
  const total = Math.max(p.foto?.yorumSay ?? 0, comments.length);
  const caption = p.foto ? p.foto.aciklama || p.metin : '';
  return (
    <View style={st.post}>
      <View style={st.head}>
        <Avatar s={s} p={p} />
        <View style={{ flex: 1 }}>
          <View style={st.nameRow}>
            <Text style={st.author} numberOfLines={1}>
              {p.kullanici.replace(/^@/, '')}
            </Text>
            {verified(s, p) ? <Icon name="check-decagram" size={14} color={BLUE_TICK} /> : null}
          </View>
          {p.tur === 'dovuscu' || p.tur === 'oyuncu' ? null : (
            <Text style={st.sub} numberOfLines={1}>
              {p.yazar}
            </Text>
          )}
        </View>
        <Icon name="dots-horizontal" size={20} color={C.dim} />
      </View>
      <Measure>{(w) => (p.foto ? <PhotoArt p={p.foto} size={w} /> : <TextArt p={p} w={w} />)}</Measure>
      <View style={st.actions}>
        <Pressable onPress={() => act((x) => toggleLike(x, p.id))} hitSlop={8}>
          <Icon name={p.begendin ? 'heart' : 'heart-outline'} size={26} color={p.begendin ? C.red : C.text} />
        </Pressable>
        <Pressable onPress={() => canReply && setReply(!reply)} hitSlop={8} disabled={!canReply}>
          <Icon name="comment-outline" size={24} color={canReply ? C.text : C.faint} />
        </Pressable>
        <View style={{ flex: 1 }} />
        {canReply ? <Text style={st.replyCue}>{L("Cevap ver")}</Text> : null}
      </View>
      <View style={st.body}>
        <Text style={st.likes}>{L("{0} beğenme", [fmtFollowers(p.begeni + (p.begendin ? 1 : 0))])}</Text>
        {caption ? (
          <Text style={st.caption}>
            <Text style={{ fontFamily: F.bold }}>{p.kullanici.replace(/^@/, '')} </Text>
            {caption}
          </Text>
        ) : null}
        {total > 2 ? <Text style={st.sub}>{L("{0} yorumun tümünü gör", [fmtFollowers(total)])}</Text> : null}
        {comments.slice(-2).map((y, i) => (
          <Text key={i} style={st.caption} numberOfLines={2}>
            <Text style={{ fontFamily: F.bold }}>{y.yazar} </Text>
            {y.metin}
          </Text>
        ))}
        {reply && canReply ? (
          <View style={st.replyRow}>
            {REPLY_TONES.map((r) => (
              <Pressable
                key={r.key}
                onPress={() => {
                  setReply(false);
                  act((x) => onMsg(replyToPost(x, p.id, r.key)));
                }}
                style={({ pressed }) => [st.replyBtn, pressed && { opacity: 0.6 }]}
              >
                <Icon name={r.ikon as IconName} size={13} color={C.text} />
                <Text style={st.replyBtnText}>{r.ad}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Text style={st.when}>{ago(s, p.hafta)}</Text>
      </View>
    </View>
  );
}

function StoriesRow({ s, list, onOpen, onNew }: { s: GameState; list: Story[]; onOpen: (i: number) => void; onNew: () => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.stories}>
      <Pressable onPress={onNew} style={st.story}>
        <View>
          <View style={st.ownRing}>
            <FighterAvatar look={s.fighter.gorunum} size={58} />
          </View>
          <View style={st.plus}>
            <Icon name="plus" size={14} color="#fff" />
          </View>
        </View>
        <Text style={st.storyName} numberOfLines={1}>
          {L("Hikâyen")}
        </Text>
      </Pressable>
      {list.map((x, i) => {
        const seen = storySeen(s, x.id);
        const av = <FighterAvatar look={x.foto.look} size={58} />;
        return (
          <Pressable key={x.id} onPress={() => onOpen(i)} style={st.story}>
            {seen ? <View style={st.seenRing}>{av}</View> : <StoryRing size={58}>{av}</StoryRing>}
            <Text style={[st.storyName, x.etiket && !seen ? { color: C.gold } : null]} numberOfLines={1}>
              {x.etiket ?? x.kullanici.replace(/^@/, '')}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const STORY_MS = 5000;

function StoryViewer({ s, act, list, start, onClose }: { s: GameState; act: Act; list: Story[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const x = list[i];
  useEffect(() => {
    if (!x) return;
    act((g) => markStorySeen(g, x.id));
    const t = setTimeout(() => (i + 1 < list.length ? setI(i + 1) : onClose()), STORY_MS);
    return () => clearTimeout(t);
    // Her hikâye açıldığında bir kez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  if (!x) return null;
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={st.viewer}>
        <View style={st.bars}>
          {list.map((_, k) => (
            <View key={k} style={st.bar}>
              <View style={[st.barFill, { width: k < i ? '100%' : k === i ? '50%' : '0%' }]} />
            </View>
          ))}
        </View>
        <View style={st.vHead}>
          <FighterAvatar look={x.foto.look} size={32} />
          <Text style={st.vName} numberOfLines={1}>
            {x.kullanici.replace(/^@/, '')}
          </Text>
          <Text style={st.vWhen}>{x.etiket ?? L("bu hafta")}</Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={onClose} hitSlop={12}>
            <Icon name="close" size={28} color="#fff" />
          </Pressable>
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Measure max={560}>{(w) => <PhotoArt p={x.foto} size={w} />}</Measure>
          <Text style={st.vCaption}>{x.metin}</Text>
        </View>
        {/* Sol yarı: önceki, sağ yarı: sonraki */}
        <View style={st.taps}>
          <Pressable style={{ flex: 1 }} onPress={() => (i > 0 ? setI(i - 1) : undefined)} />
          <Pressable style={{ flex: 2 }} onPress={() => (i + 1 < list.length ? setI(i + 1) : onClose())} />
        </View>
      </View>
    </Modal>
  );
}

const PAGE = 12;

export function FeedHome({ s, act, onMsg, onNew, onDm, unread }: { s: GameState; act: Act; onMsg: (m: string) => void; onNew: () => void; onDm: () => void; unread: number }) {
  const [story, setStory] = useState<number | null>(null);
  const [n, setN] = useState(PAGE);
  const list = storiesFor(s);
  const posts = s.sosyal ?? [];
  return (
    <View>
      <View style={st.top}>
        <Text style={st.brand}>kafesgram</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onNew} hitSlop={8}>
          <Icon name="plus-box-outline" size={26} color={C.text} />
        </Pressable>
        <Pressable onPress={onDm} hitSlop={8}>
          <Icon name="send-outline" size={25} color={C.text} />
          {unread ? (
            <View style={st.badge}>
              <Text style={st.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      <StoriesRow s={s} list={list} onOpen={setStory} onNew={onNew} />
      <View style={st.divider} />
      {posts.length === 0 ? <Text style={st.empty}>{L("Akış henüz sessiz. İlk maçından sonra herkes seni konuşacak.")}</Text> : null}
      {posts.slice(0, n).map((p) => (
        <FeedPost key={p.id} s={s} p={p} act={act} onMsg={onMsg} />
      ))}
      {posts.length > n ? (
        <Pressable onPress={() => setN(n + PAGE)} style={st.more}>
          <Text style={st.moreText}>{L("Daha fazla göster")}</Text>
        </Pressable>
      ) : null}
      {story != null ? <StoryViewer s={s} act={act} list={list} start={story} onClose={() => setStory(null)} /> : null}
    </View>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 6 },
  brand: { color: C.text, fontFamily: F.black, fontSize: 26, fontStyle: 'italic', letterSpacing: -0.5 },
  badge: { position: 'absolute', top: -6, right: -8, backgroundColor: C.red, borderRadius: 9, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  badgeText: { color: '#fff', fontFamily: F.bold, fontSize: 10 },
  stories: { gap: 12, paddingVertical: 10, paddingRight: 8 },
  story: { width: 70, alignItems: 'center', gap: 4 },
  ownRing: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  plus: { position: 'absolute', right: 0, bottom: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: BLUE_TICK, borderWidth: 2, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  seenRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#3a3d45', alignItems: 'center', justifyContent: 'center' },
  storyName: { color: C.text, fontFamily: F.body, fontSize: 11, maxWidth: 70 },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: -16, marginBottom: 8 },
  empty: { color: C.dim, fontFamily: F.body, fontSize: 14, textAlign: 'center', paddingVertical: 30 },
  post: { marginHorizontal: -16, marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  author: { color: C.text, fontFamily: F.bold, fontSize: 14, flexShrink: 1 },
  sub: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  iconAv: { borderWidth: 1.5, backgroundColor: '#15161a', alignItems: 'center', justifyContent: 'center' },
  textArt: { color: '#fff', fontFamily: F.semi, marginTop: 4 },
  textArtBy: { fontFamily: F.bold, fontSize: 12, marginTop: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 12, paddingVertical: 10 },
  replyCue: { color: C.gold, fontFamily: F.semi, fontSize: 12 },
  body: { paddingHorizontal: 12, gap: 4 },
  likes: { color: C.text, fontFamily: F.bold, fontSize: 13 },
  caption: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  when: { color: C.faint, fontFamily: F.body, fontSize: 11, marginTop: 2 },
  replyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.cardAlt },
  replyBtnText: { color: C.text, fontFamily: F.semi, fontSize: 12 },
  more: { alignItems: 'center', paddingVertical: 14 },
  moreText: { color: BLUE_TICK, fontFamily: F.semi, fontSize: 14 },
  viewer: { flex: 1, backgroundColor: '#000', paddingTop: 36 },
  bars: { flexDirection: 'row', gap: 4, paddingHorizontal: 10 },
  bar: { flex: 1, height: 2.5, borderRadius: 2, backgroundColor: '#ffffff44', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#fff' },
  vHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, zIndex: 3 },
  vName: { color: '#fff', fontFamily: F.bold, fontSize: 14, flexShrink: 1 },
  vWhen: { color: '#ffffffaa', fontFamily: F.body, fontSize: 12 },
  vCaption: { color: '#fff', fontFamily: F.semi, fontSize: 17, textAlign: 'center', paddingHorizontal: 24, marginTop: 16, lineHeight: 23 },
  taps: { position: 'absolute', top: 90, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
});
