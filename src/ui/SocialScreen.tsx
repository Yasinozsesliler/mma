import { L, LOC } from '../i18n';
import { closeCrisis } from '../engine/crisis';
import { CrisisCard } from './CrisisCard';
import { fmtFollowers, followerBoard, followers, followerTier } from '../engine/fame';
import { BioEditor, Highlights, IgTopBar, PhotoCard, PhotoComposer, ProfileGrid, ProfileHeader } from './SocialPhoto';
import type { PhotoKind } from '../engine/gram';
import { dmUnread } from '../engine/dm';
import { DmChat, DmInbox, markRead } from './SocialDm';
import { FeedHome } from './SocialFeed';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { IDEA_KATS, postIdeas, type IdeaKat } from '../engine/postIdeas';
import { playerPost, REPLY_TONES, replyToPost } from '../engine/social';
import type { GameState, Post } from '../engine/types';
import { Icon, P, Screen, type IconName } from './components';
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
  if (p.foto) return <PhotoCard s={s} p={p} foto={p.foto} />;
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

/** Yazılı paylaşım (eski sosyal medya): rakibi etiketle, trash talk ya da saygı. */
function TextComposer({ s, act, onMsg }: { s: GameState; act: Act; onMsg: (m: string) => void }) {
  const [text, setText] = useState('');
  const [kat, setKat] = useState<IdeaKat>(s.pending.rakip ? 'trash' : s.gecmis.length ? 'sonuc' : 'kamp');
  const [tur, setTur] = useState(0);
  const ideas = postIdeas(s, kat, tur);
  const send = () => {
    if (!text.trim()) return;
    act((x) => onMsg(playerPost(x, text)));
    setText('');
  };
  return (
    <View style={{ gap: 10 }}>
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
  );
}

type Tab = 'grid' | 'akis' | 'etiket' | 'takipci';

export function SocialScreen({ s, act }: { s: GameState; act: Act }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('grid');
  const [compose, setCompose] = useState<null | 'foto' | 'yazi'>(null);
  const [edit, setEdit] = useState(false);
  const [hl, setHl] = useState<PhotoKind | null>(null);
  const [dm, setDm] = useState<null | 'list' | string>(null);
  // Instagram gibi: açılışta ana sayfa (akış), alttaki çubukla profile geçilir
  const [view, setView] = useState<'ana' | 'profil'>('ana');
  const takipci = followers(s);
  const done = (m: string) => {
    setMsg(m);
    setCompose(null);
    setTab('grid');
    setHl(null);
    setView('profil');
  };
  const toCareer = () =>
    act((x) => {
      // Sonuçlanmış kriz bu ekranda görüldü: çıkarken kapanır, ana sayfada tekrar çıkmaz
      closeCrisis(x);
      x.phase = 'hub';
    });
  const navBtn = (on: boolean, onPress: () => void, node: React.ReactNode, label: string) => (
    <Pressable onPress={onPress} hitSlop={6} style={so.navBtn} accessibilityLabel={label}>
      {node}
      {on ? <View style={so.navDot} /> : null}
    </Pressable>
  );
  const posts = (s.sosyal ?? []).filter((p) => (tab === 'etiket' ? p.tur !== 'oyuncu' : true));
  return (
    <Screen
      footer={
        <View style={so.nav}>
          {navBtn(false, toCareer, <Icon name="arrow-left" size={26} color={C.text} />, L("Kariyere dön"))}
          {navBtn(view === 'ana' && !dm, () => (setDm(null), setView('ana')), <Icon name={view === 'ana' && !dm ? 'home-variant' : 'home-variant-outline'} size={28} color={C.text} />, L("Ana sayfa"))}
          {navBtn(false, () => setCompose('foto'), <Icon name="plus-box-outline" size={28} color={C.text} />, L("Yeni gönderi"))}
          {navBtn(view === 'profil' && !dm, () => (setDm(null), setView('profil')), <View style={[so.navAv, view === 'profil' && !dm && { borderColor: C.text }]}><FighterAvatar look={s.fighter.gorunum} size={26} /></View>, L("Profil"))}
        </View>
      }
    >
      {dm === 'list' ? (
        <DmInbox
          s={s}
          onBack={() => setDm(null)}
          onOpen={(id) => {
            setDm(id);
            markRead(act, id);
          }}
        />
      ) : dm ? (
        <DmChat s={s} act={act} id={dm} onBack={() => setDm('list')} />
      ) : view === 'ana' ? (
        <>
          <CrisisCard s={s} act={act} />
          {msg ? (
            <Pressable onPress={() => setMsg(null)} style={so.toast}>
              <Icon name="check-circle" size={16} color={C.gold} />
              <Text style={so.toastText}>{msg}</Text>
            </Pressable>
          ) : null}
          <FeedHome s={s} act={act} onMsg={setMsg} onNew={() => setCompose('foto')} onDm={() => setDm('list')} unread={dmUnread(s)} />
        </>
      ) : (
        <>
          <CrisisCard s={s} act={act} />
          <IgTopBar s={s} takipci={takipci} onNew={() => setCompose('foto')} onBoard={() => setTab('takipci')} onDm={() => setDm('list')} unread={dmUnread(s)} />
          <ProfileHeader s={s} takipci={takipci} tier={followerTier(takipci)} onEdit={() => setEdit(!edit)} onNew={() => setCompose('foto')} editing={edit} />
          {edit ? <BioEditor s={s} act={act} onDone={() => setEdit(false)} /> : null}
          <Highlights
            s={s}
            selected={hl}
            onSelect={(k) => {
              setHl(hl === k ? null : k);
              setTab('grid');
            }}
            onNew={() => setCompose('foto')}
          />
          {msg ? (
            <Pressable onPress={() => setMsg(null)} style={so.toast}>
              <Icon name="check-circle" size={16} color={C.gold} />
              <Text style={so.toastText}>{msg}</Text>
            </Pressable>
          ) : null}
          <View style={so.igTabs}>
            {(
              [
                ['grid', 'grid'],
                ['akis', 'play-box-multiple-outline'],
                ['etiket', 'account-box-outline'],
                ['takipci', 'trophy-outline'],
              ] as const
            ).map(([k, ikon]) => (
              <Pressable key={k} onPress={() => setTab(k)} style={[so.igTab, tab === k && so.igTabOn]}>
                <Icon name={ikon} size={24} color={tab === k ? C.text : C.faint} />
              </Pressable>
            ))}
          </View>
          {tab === 'grid' ? (
            <ProfileGrid s={s} filter={hl} onNew={() => setCompose('foto')} />
          ) : tab === 'takipci' ? (
            <FollowerBoard s={s} />
          ) : (
            <View style={{ marginTop: 10 }}>
              {posts.length === 0 ? <P dim>{L("Henüz paylaşım yok. İlk dövüşünden sonra ortalık hareketlenecek.")}</P> : null}
              {posts.map((p) => (
                <PostCard key={p.id} s={s} p={p} act={act} onMsg={setMsg} />
              ))}
            </View>
          )}
        </>
      )}
      <Modal visible={!!compose} transparent animationType="slide" onRequestClose={() => setCompose(null)}>
        <View style={so.sheetBack}>
          <View style={so.sheet}>
            <View style={so.sheetHead}>
              <Pressable onPress={() => setCompose(null)} hitSlop={10}>
                <Icon name="close" size={24} color={C.text} />
              </Pressable>
              <Text style={so.sheetTitle}>{L("Yeni gönderi")}</Text>
              <View style={{ width: 24 }} />
            </View>
            <View style={so.modes}>
              {(
                [
                  ['foto', 'camera', L("FOTOĞRAF")],
                  ['yazi', 'pencil', L("YAZI")],
                ] as const
              ).map(([k, ikon, l]) => (
                <Pressable key={k} onPress={() => setCompose(k)} style={[so.mode, compose === k && so.modeOn]}>
                  <Icon name={ikon} size={14} color={compose === k ? '#fff' : C.dim} />
                  <Text style={[so.filterText, compose === k && { color: '#fff' }]}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <ScrollView contentContainerStyle={{ paddingVertical: 12 }} keyboardShouldPersistTaps="handled">
              {compose === 'yazi' ? <TextComposer s={s} act={act} onMsg={done} /> : <PhotoComposer s={s} act={act} onMsg={done} />}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  modes: { flexDirection: 'row', gap: 6 },
  mode: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 3, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardAlt },
  modeOn: { backgroundColor: C.red, borderColor: C.red },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1a1408', borderWidth: 1, borderColor: C.goldDeep, borderRadius: 8, padding: 10, marginTop: 10 },
  toastText: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 18 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 4 },
  navBtn: { alignItems: 'center', justifyContent: 'center', minWidth: 48, minHeight: 40 },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.red, marginTop: 3 },
  navAv: { borderRadius: 16, borderWidth: 2, borderColor: 'transparent', padding: 1 },
  igTabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, marginTop: 12, marginHorizontal: -16 },
  igTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1.5, borderBottomColor: 'transparent' },
  igTabOn: { borderBottomColor: C.text },
  sheetBack: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: C.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingTop: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { color: C.text, fontFamily: F.bold, fontSize: 16 },
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
