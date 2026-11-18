// Patron Modu: organizasyonun Kafesgram hesabı. Kariyerdeki Kafesgram ile aynı düzen: akış ve hikâyeler, profil,
// öne çıkanlar, ızgara, yeni gönderi (fotoğraf / yazı), dövüşçü paylaşımlarına cevap, DM'ler ve takipçi sıralaması.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { fmtFollowers } from '../engine/fame';
import { PHOTO_FILTERS } from '../engine/gram';
import {
  adExtraPhoto,
  answerDm,
  canAdExtraPhoto,
  dmUnread,
  fighterById,
  followerBoard,
  fotoLock,
  fotoPreview,
  fotoSubjects,
  fotoUsed,
  ORG_FOTO,
  orgFotoOf,
  orgHandle,
  pFullName,
  pLook,
  postYazi,
  proCost,
  readDm,
  replyFighterPost,
  shareOrgFoto,
  YANIT_TON,
  YAZI_KAT,
  yaziFikir,
  money,
  type OrgFoto,
  type PatronRun,
  type PDm,
  type PDmRol,
  type YanitTon,
  type YaziKat,
} from '../engine/patron';
import type { Post } from '../engine/types';
import { L } from '../i18n';
import { actPatron } from '../patronStore';
import { Icon, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import { AdOffer } from './AdOffer';
import { OrgLogo } from './OrgLogo';
import { PhotoArt } from './PhotoArt';
import { BLUE_TICK, Measure, StoryRing, VERIFIED } from './SocialPhoto';
import { C, F, R } from './theme';

const ago = (r: PatronRun, h: number) => (r.hafta - h <= 0 ? L("bu hafta") : L("{0} hf", [r.hafta - h]));

const TEXT_BG: Record<Post['tur'], [string, string, string]> = {
  oyuncu: ['#4a0c16', '#14050a', '#ffb3bd'],
  dovuscu: ['#0c2244', '#060a14', '#9cc4ff'],
  medya: ['#3a2a0a', '#100c04', C.gold],
  taraftar: ['#262a33', '#0d0f13', '#d9dbe0'],
  hikaye: ['#3a0c14', '#0a0b0e', C.gold],
  organizasyon: ['#2a1450', '#0a0812', '#d6b8ff'],
};
const TUR_ICON: Record<Post['tur'], IconName> = { oyuncu: 'account', dovuscu: 'boxing-glove', medya: 'newspaper-variant-outline', taraftar: 'account-group', hikaye: 'movie-open-star', organizasyon: 'office-building' };

function Avatar({ r, p, size = 32 }: { r: PatronRun; p: Post; size?: number }) {
  if (p.tur === 'organizasyon' || (p.tur === 'hikaye' && p.kullanici === orgHandle(r))) return <OrgLogo r={r} size={size} />;
  const f = p.hedefId ? fighterById(r, p.hedefId) : undefined;
  if (f) return <FighterAvatar look={pLook(f)} size={size} />;
  const col = TEXT_BG[p.tur][2];
  return (
    <View style={[st.iconAv, { width: size, height: size, borderRadius: size / 2, borderColor: col + '88' }]}>
      <Icon name={TUR_ICON[p.tur]} size={size * 0.5} color={col} />
    </View>
  );
}

function TextArt({ p, w, r }: { p: Post; w: number; r: PatronRun }) {
  const [a, b, col0] = TEXT_BG[p.tur];
  const own = p.tur === 'organizasyon';
  const col = own ? r.org.renk : col0;
  const n = p.metin.length;
  const fs = n < 60 ? 24 : n < 120 ? 19 : n < 200 ? 16 : 14;
  return (
    <LinearGradient colors={own ? [r.org.renk + '55', '#0a0812'] : [a, b]} style={{ width: w, height: w, padding: 26, justifyContent: 'center' }}>
      <Icon name="format-quote-open" size={34} color={col + '88'} />
      <Text style={[st.textArt, { fontSize: fs, lineHeight: fs * 1.32 }]}>{p.metin}</Text>
      <Text style={[st.textArtBy, { color: col }]}>{p.kullanici}</Text>
    </LinearGradient>
  );
}

function FeedPost({ r, p, onMsg }: { r: PatronRun; p: Post; onMsg: (m: string) => void }) {
  const [reply, setReply] = useState(false);
  const [liked, setLiked] = useState(false);
  const canReply = p.tur === 'dovuscu' && !!p.hedefId && !p.yanitlandi && !!fighterById(r, p.hedefId);
  const comments = p.foto ? [...p.foto.yorumlar, ...(p.yanitlar ?? [])] : (p.yanitlar ?? []);
  const total = Math.max(p.foto?.yorumSay ?? 0, comments.length);
  const caption = p.foto ? p.foto.aciklama || p.metin : '';
  const verified = p.tur === 'organizasyon' ? r.gram.takipci >= VERIFIED : p.tur === 'medya' || (p.hedefId ? !!fighterById(r, p.hedefId)?.sampiyon : false);
  return (
    <View style={st.post}>
      <View style={st.head}>
        <Avatar r={r} p={p} />
        <View style={{ flex: 1 }}>
          <View style={st.nameRow}>
            <Text style={st.author} numberOfLines={1}>
              {p.kullanici.replace(/^@/, '')}
            </Text>
            {verified ? <Icon name="check-decagram" size={14} color={BLUE_TICK} /> : null}
          </View>
          {p.tur === 'dovuscu' ? null : (
            <Text style={st.sub} numberOfLines={1}>
              {p.yazar}
            </Text>
          )}
        </View>
        <Icon name="dots-horizontal" size={20} color={C.dim} />
      </View>
      <Measure>{(w) => (p.foto ? <PhotoArt p={p.foto} size={w} /> : <TextArt p={p} w={w} r={r} />)}</Measure>
      <View style={st.actions}>
        <Pressable onPress={() => setLiked(!liked)} hitSlop={8}>
          <Icon name={liked ? 'heart' : 'heart-outline'} size={26} color={liked ? C.red : C.text} />
        </Pressable>
        <Pressable onPress={() => canReply && setReply(!reply)} hitSlop={8} disabled={!canReply}>
          <Icon name="comment-outline" size={24} color={canReply ? C.text : C.faint} />
        </Pressable>
        <View style={{ flex: 1 }} />
        {canReply ? <Text style={st.replyCue}>{L("Cevap ver")}</Text> : null}
        {p.foto ? (
          <Text style={[st.delta, { color: p.foto.delta >= 0 ? C.green : C.red }]}>
            +{fmtFollowers(p.foto.delta)} {L("takipçi")}
          </Text>
        ) : null}
      </View>
      <View style={st.body}>
        <Text style={st.likes}>{L("{0} beğenme", [fmtFollowers(p.begeni + (liked ? 1 : 0))])}</Text>
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
            {(Object.keys(YANIT_TON) as YanitTon[]).map((k) => (
              <Pressable
                key={k}
                onPress={() => {
                  setReply(false);
                  onMsg(actPatron((x) => replyFighterPost(x, p.id, k)) ?? '');
                }}
                style={({ pressed }) => [st.replyBtn, pressed && { opacity: 0.6 }]}
              >
                <Icon name={YANIT_TON[k].ikon as IconName} size={13} color={C.text} />
                <Text style={st.replyBtnText}>{YANIT_TON[k].ad()}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Text style={st.when}>{ago(r, p.hafta)}</Text>
      </View>
    </View>
  );
}

/** Hikâyeler: organizasyonun son fotoğrafları ve bu hafta paylaşım yapan dövüşçüler */
type Story = { id: string; ad: string; post: Post; own: boolean };
function storiesOf(r: PatronRun): Story[] {
  const out: Story[] = [];
  for (const p of r.gram.posts) {
    if (r.hafta - p.hafta > 2) continue;
    if (p.tur === 'organizasyon' && p.foto && !out.some((x) => x.own)) out.push({ id: p.id, ad: r.org.kisa, post: p, own: true });
    else if (p.tur === 'dovuscu' && p.hedefId && !out.some((x) => x.post.hedefId === p.hedefId)) out.push({ id: p.id, ad: p.yazar.split(' ').slice(-1)[0], post: p, own: false });
  }
  return out.slice(0, 10);
}

function StoryViewer({ r, list, start, onClose }: { r: PatronRun; list: Story[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const x = list[i];
  useEffect(() => {
    const t = setTimeout(() => (i + 1 < list.length ? setI(i + 1) : onClose()), 5000);
    return () => clearTimeout(t);
  }, [i, list.length, onClose]);
  if (!x) return null;
  const f = x.post.hedefId ? fighterById(r, x.post.hedefId) : undefined;
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
          {x.own ? <OrgLogo r={r} size={32} /> : f ? <FighterAvatar look={pLook(f)} size={32} /> : null}
          <Text style={st.vName} numberOfLines={1}>
            {x.post.kullanici.replace(/^@/, '')}
          </Text>
          <Text style={st.vWhen}>{ago(r, x.post.hafta)}</Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={onClose} hitSlop={12}>
            <Icon name="close" size={28} color="#fff" />
          </Pressable>
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Measure max={560}>{(w) => (x.post.foto ? <PhotoArt p={x.post.foto} size={w} /> : <TextArt p={x.post} w={w} r={r} />)}</Measure>
        </View>
        <View style={st.taps}>
          <Pressable style={{ flex: 1 }} onPress={() => (i > 0 ? setI(i - 1) : undefined)} />
          <Pressable style={{ flex: 2 }} onPress={() => (i + 1 < list.length ? setI(i + 1) : onClose())} />
        </View>
      </View>
    </Modal>
  );
}

const PAGE = 12;

function FeedHome({ r, onMsg, onNew, onDm }: { r: PatronRun; onMsg: (m: string) => void; onNew: () => void; onDm: () => void }) {
  const [story, setStory] = useState<number | null>(null);
  const [n, setN] = useState(PAGE);
  const list = storiesOf(r);
  const unread = dmUnread(r);
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.stories}>
        <Pressable onPress={onNew} style={st.story}>
          <View>
            <View style={st.ownRing}>
              <OrgLogo r={r} size={58} />
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
          const f = x.post.hedefId ? fighterById(r, x.post.hedefId) : undefined;
          return (
            <Pressable key={x.id} onPress={() => setStory(i)} style={st.story}>
              <StoryRing size={58}>{x.own ? <OrgLogo r={r} size={58} /> : f ? <FighterAvatar look={pLook(f)} size={58} /> : <View />}</StoryRing>
              <Text style={st.storyName} numberOfLines={1}>
                {x.ad}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={st.divider} />
      {r.gram.posts.length === 0 ? <Text style={st.empty}>{L("Akış henüz sessiz. İlk geceden sonra herkes organizasyonunu konuşacak.")}</Text> : null}
      {r.gram.posts.slice(0, n).map((p) => (
        <FeedPost key={p.id} r={r} p={p} onMsg={onMsg} />
      ))}
      {r.gram.posts.length > n ? (
        <Pressable onPress={() => setN(n + PAGE)} style={st.more}>
          <Text style={st.moreText}>{L("Daha fazla göster")}</Text>
        </Pressable>
      ) : null}
      {story != null ? <StoryViewer r={r} list={list} start={story} onClose={() => setStory(null)} /> : null}
    </View>
  );
}

// ---------- Profil ----------

const tierOf = (n: number) => (n >= 1_000_000 ? L("Dünya devi") : n >= 100_000 ? L("Ünlü organizasyon") : n >= 20_000 ? L("Yükselen hesap") : n >= 5_000 ? L("Yerel tanınırlık") : L("Yeni hesap"));

function Profile({ r, onNew, onDm, onMsg }: { r: PatronRun; onNew: () => void; onDm: () => void; onMsg: (m: string) => void }) {
  const [tab, setTab] = useState<'grid' | 'yazi' | 'sira'>('grid');
  const [hl, setHl] = useState<OrgFoto | null>(null);
  const [edit, setEdit] = useState(false);
  const [bio, setBio] = useState(r.gram.bio ?? '');
  const [open, setOpen] = useState<string | null>(null);
  const photos = r.gram.posts.filter((p) => p.tur === 'organizasyon' && p.foto);
  const kinds = ORG_FOTO.filter((k) => photos.some((p) => orgFotoOf(p.foto!.tur) === k.id));
  const grid = hl ? photos.filter((p) => orgFotoOf(p.foto!.tur) === hl) : photos;
  const texts = r.gram.posts.filter((p) => p.tur === 'organizasyon' && !p.foto);
  const unread = dmUnread(r);
  const sel = grid.find((p) => p.id === open);
  return (
    <View>
      <View style={st.ptop}>
        <Icon name="lock-outline" size={16} color={C.text} />
        <Text style={st.topName} numberOfLines={1}>
          {orgHandle(r).slice(1)}
        </Text>
        {r.gram.takipci >= VERIFIED ? <Icon name="check-decagram" size={18} color={BLUE_TICK} /> : null}
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
        <Pressable onPress={() => setTab('sira')} hitSlop={8}>
          <Icon name="menu" size={26} color={C.text} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 }}>
        <StoryRing size={78}>
          <OrgLogo r={r} size={78} />
        </StoryRing>
        <View style={st.stats}>
          {(
            [
              [String(r.gram.say + texts.length), L("gönderi")],
              [fmtFollowers(r.gram.takipci), L("takipçi")],
              [String(r.kadro.length + 12), L("takip")],
            ] as const
          ).map(([v, l]) => (
            <View key={l} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={st.statVal} numberOfLines={1} adjustsFontSizeToFit>
                {v}
              </Text>
              <Text style={st.statLbl} numberOfLines={1}>
                {l}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={[st.author, { marginTop: 10 }]}>{r.org.ad}</Text>
      <Text style={st.sub}>{L("Spor organizasyonu")}</Text>
      <Text style={st.caption} numberOfLines={1}>
        {L("MMA organizasyonu")} · {r.kadro.length} {L("dövüşçü")} · {r.toplam.gece} {L("gece")}
      </Text>
      {r.gram.bio ? (
        <Text style={st.caption} numberOfLines={3}>
          {r.gram.bio}
        </Text>
      ) : null}
      <Text style={[st.sub, { color: C.gold, marginTop: 2 }]}>{tierOf(r.gram.takipci)}</Text>
      <View style={st.btnRow}>
        <Pressable onPress={() => setEdit(!edit)} style={({ pressed }) => [st.igBtn, (pressed || edit) && { backgroundColor: '#2a2d35' }]}>
          <Text style={st.igBtnText}>{L("Profili düzenle")}</Text>
        </Pressable>
        <Pressable onPress={onNew} style={({ pressed }) => [st.igBtn, pressed && { backgroundColor: '#2a2d35' }]}>
          <Text style={st.igBtnText}>{L("Yeni gönderi")}</Text>
        </Pressable>
      </View>
      {edit ? (
        <View style={{ gap: 8, marginTop: 10 }}>
          <TextInput style={st.input} value={bio} onChangeText={setBio} placeholder={L("Biyografi yaz…")} placeholderTextColor={C.faint} maxLength={150} multiline />
          <Pressable
            onPress={() => {
              actPatron((x) => void (x.gram.bio = bio.trim()));
              setEdit(false);
              onMsg(L("Biyografi kaydedildi."));
            }}
            style={st.send}
          >
            <Text style={st.sendText}>{L("KAYDET")}</Text>
          </Pressable>
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 12 }}>
        {kinds.map((k) => (
          <Pressable key={k.id} onPress={() => (setHl(hl === k.id ? null : k.id), setTab('grid'))} style={{ alignItems: 'center', width: 64 }}>
            <View style={[st.hl, hl === k.id && { borderColor: C.text }]}>
              <View style={st.hlIn}>
                <Icon name={k.ikon as IconName} size={24} color={hl === k.id ? C.gold : C.text} />
              </View>
            </View>
            <Text style={st.hlText} numberOfLines={1}>
              {k.ad()}
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={onNew} style={{ alignItems: 'center', width: 64 }}>
          <View style={st.hl}>
            <View style={[st.hlIn, { backgroundColor: 'transparent' }]}>
              <Icon name="plus" size={28} color={C.text} />
            </View>
          </View>
          <Text style={st.hlText}>{L("Yeni")}</Text>
        </Pressable>
      </ScrollView>
      <View style={st.igTabs}>
        {(
          [
            ['grid', 'grid'],
            ['yazi', 'text-box-outline'],
            ['sira', 'trophy-outline'],
          ] as const
        ).map(([k, ikon]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[st.igTab, tab === k && st.igTabOn]}>
            <Icon name={ikon} size={24} color={tab === k ? C.text : C.faint} />
          </Pressable>
        ))}
      </View>
      {tab === 'grid' ? (
        photos.length === 0 ? (
          <Pressable onPress={onNew} style={st.emptyBox}>
            <View style={st.emptyIcon}>
              <Icon name="camera-outline" size={36} color={C.text} />
            </View>
            <Text style={st.emptyTitle}>{L("İlk fotoğrafını paylaş")}</Text>
            <Text style={[st.sub, { textAlign: 'center' }]}>{L("Gece afişleri, şampiyonlar ve yeni imzalar: profilin organizasyonun vitrini.")}</Text>
          </Pressable>
        ) : (
          <View style={{ marginHorizontal: -16 }}>
            {sel ? (
              <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                <FeedPost r={r} p={sel} onMsg={onMsg} />
              </View>
            ) : null}
            <Measure max={720}>
              {(w) => {
                const cell = Math.floor((w - 4) / 3);
                return (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingTop: 2 }}>
                    {grid.map((p) => (
                      <Pressable key={p.id} onPress={() => setOpen(open === p.id ? null : p.id)} style={({ pressed }) => ({ opacity: pressed || open === p.id ? 0.55 : 1 })}>
                        <PhotoArt p={p.foto!} size={cell} />
                        {p.foto!.viral ? (
                          <View style={{ position: 'absolute', top: 5, right: 5 }}>
                            <Icon name="fire" size={14} color="#fff" />
                          </View>
                        ) : null}
                        <View style={st.cellLikes}>
                          <Icon name="heart" size={12} color="#fff" />
                          <Text style={st.cellLikesText}>{fmtFollowers(p.begeni)}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                );
              }}
            </Measure>
          </View>
        )
      ) : tab === 'yazi' ? (
        <View style={{ marginTop: 10 }}>
          {texts.length === 0 ? <Text style={st.empty}>{L("Henüz yazı paylaşmadın.")}</Text> : null}
          {texts.map((p) => (
            <FeedPost key={p.id} r={r} p={p} onMsg={onMsg} />
          ))}
        </View>
      ) : (
        <Board r={r} />
      )}
    </View>
  );
}

function Board({ r }: { r: PatronRun }) {
  const rows = followerBoard(r);
  const max = rows[0]?.takipci || 1;
  return (
    <View style={st.board}>
      <Text style={st.boardTitle}>{L("TAKİPÇİ SIRALAMASI")}</Text>
      <Text style={st.sub}>{L("Organizasyonların Kafesgram hesapları")}</Text>
      {rows.map((x, i) => (
        <View key={x.ad} style={[st.boardRow, x.ben && st.boardMe]}>
          <Text style={st.boardRank}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[st.author, x.ben && { color: C.gold }]} numberOfLines={1}>
              {x.ad}
            </Text>
            <View style={st.boardBar}>
              <View style={{ width: `${(x.takipci / max) * 100}%`, height: '100%', backgroundColor: x.ben ? C.gold : C.dim }} />
            </View>
          </View>
          <Text style={st.boardVal}>{fmtFollowers(x.takipci)}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------- Yeni gönderi ----------

function Composer({ r, onDone }: { r: PatronRun; onDone: (m: string) => void }) {
  const [mode, setMode] = useState<'foto' | 'yazi'>('foto');
  const [k, setK] = useState<OrgFoto>(r.plan?.maclar.length ? 'afis' : 'taraftar');
  const [fid, setFid] = useState<string | undefined>();
  const [cap, setCap] = useState('');
  const [flt, setFlt] = useState(0);
  const [pro, setPro] = useState(false);
  const [yk, setYk] = useState<YaziKat>('duyuru');
  const [text, setText] = useState('');
  const subj = fotoSubjects(r, k);
  const lock = fotoLock(r, k) ?? (fotoUsed(r) && k !== 'afis' ? L("Bu hafta zaten fotoğraf paylaştın. Afiş hariç haftada bir fotoğraf.") : null);
  const f = (fid && subj.find((x) => x.id === fid)) || subj[0];
  const prev = fotoPreview(r, k, f?.id, pro);
  const rk = k === 'afis' && r.plan?.maclar[0] ? fighterById(r, r.plan.maclar[0].b) : undefined;
  const sample = { tur: (['afis', 'kemer', 'zafer', 'taraftar', 'sponsor'] as string[]).includes(k) ? k : 'antrenman', filtre: flt, look: f ? pLook(f) : undefined, sahip: f?.id, ek: { rakip: rk ? pFullName(rk) : undefined, rakipLook: rk ? pLook(rk) : undefined, marka: r.sponsorlar[0]?.marka } } as Parameters<typeof PhotoArt>[0]['p'];
  const pc = proCost(r);
  return (
    <View style={{ gap: 10 }}>
      <View style={st.modes}>
        {(
          [
            ['foto', 'camera', L("FOTOĞRAF")],
            ['yazi', 'pencil', L("YAZI")],
          ] as const
        ).map(([m, ikon, l]) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[st.mode, mode === m && st.modeOn]}>
            <Icon name={ikon} size={14} color={mode === m ? '#fff' : C.dim} />
            <Text style={[st.chipText, mode === m && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      {mode === 'foto' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
            {ORG_FOTO.map((o) => (
              <Pressable key={o.id} onPress={() => (setK(o.id), setFid(undefined))} style={[st.chip, k === o.id && st.chipOn]}>
                <Icon name={o.ikon as IconName} size={13} color={k === o.id ? '#fff' : C.dim} />
                <Text style={[st.chipText, k === o.id && { color: '#fff' }]}>{o.ad()}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {subj.length > 1 && k !== 'afis' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
              {subj.map((x) => (
                <Pressable key={x.id} onPress={() => setFid(x.id)} style={{ alignItems: 'center', width: 60, opacity: f?.id === x.id ? 1 : 0.55 }}>
                  <FighterAvatar look={pLook(x)} size={40} ring={f?.id === x.id ? C.gold : C.border} />
                  <Text style={st.hlText} numberOfLines={1}>
                    {x.soyad}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          {k !== 'afis' && canAdExtraPhoto(r) ? <AdOffer yer="patron_foto" icon="camera-plus" title={L("Sosyal medya ajansı")} desc={L("Bu hafta bir fotoğraf daha paylaşabilirsin.")} onReward={() => actPatron(adExtraPhoto)} /> : null}
          <View>
            <Measure max={420}>{(w) => <PhotoArt p={sample} size={w} />}</Measure>
            {lock ? (
              <View style={st.lockOver}>
                <Icon name="lock" size={28} color="#fff" />
                <Text style={st.lockText}>{lock}</Text>
              </View>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
            {PHOTO_FILTERS.map((x, i) => (
              <Pressable key={x.ad} onPress={() => setFlt(i)} style={[st.chip, flt === i && st.chipOn]}>
                <View style={[st.dot, { backgroundColor: x.renk ?? '#fff' }]} />
                <Text style={[st.chipText, flt === i && { color: '#fff' }]}>{x.ad}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput style={st.input} value={cap} onChangeText={setCap} placeholder={L("Açıklama yaz…")} placeholderTextColor={C.faint} maxLength={180} multiline />
          <Pressable onPress={() => setPro(!pro)} style={st.proRow}>
            <Icon name={pro ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={pro ? C.gold : C.dim} />
            <View style={{ flex: 1 }}>
              <Text style={st.proTitle}>{L("Profesyonel çekim")}</Text>
              <Text style={st.sub}>{pc ? L("Etkisi 1,5 kat · {0}", [money(pc)]) : L("Etkisi 1,5 kat · medya ekibinle ücretsiz")}</Text>
            </View>
          </Pressable>
          <Text style={st.sub}>{L("Çekicilik %{0} · tahmini +{1} takipçi", [prev.cekicilik, fmtFollowers(prev.tahmin)])}</Text>
          <Pressable disabled={!!lock} onPress={() => onDone(actPatron((x) => shareOrgFoto(x, k, { fid: f?.id, caption: cap, filtre: flt, pro })) ?? '')} style={[st.send, !!lock && { opacity: 0.4 }]}>
            <Icon name="send" size={14} color="#fff" />
            <Text style={st.sendText}>{L("PAYLAŞ")}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
            {(Object.keys(YAZI_KAT) as YaziKat[]).map((x) => (
              <Pressable key={x} onPress={() => setYk(x)} style={[st.chip, yk === x && st.chipOn]}>
                <Icon name={YAZI_KAT[x].ikon as IconName} size={13} color={yk === x ? '#fff' : C.dim} />
                <Text style={[st.chipText, yk === x && { color: '#fff' }]}>{YAZI_KAT[x].ad()}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {yaziFikir(r, yk).map((t) => (
            <Pressable key={t} onPress={() => setText(t)} style={st.tpl}>
              <Text style={st.tplText}>{t}</Text>
            </Pressable>
          ))}
          <TextInput style={[st.input, { minHeight: 80 }]} value={text} onChangeText={setText} placeholder={L("Ne paylaşmak istersin?")} placeholderTextColor={C.faint} maxLength={220} multiline />
          <Text style={st.sub}>{yk === 'duyuru' ? L("Kartı duyurmak gecenin ilgisini artırır.") : yk === 'kizistir' ? L("Ana maçın ateşini yükseltir. Fazlası taraftarı rahatsız edebilir.") : yk === 'soru' ? L("Taraftarla konuşmak en çok takipçi getirir.") : L("Dövüşçülerini tebrik etmek onları mutlu eder.")}</Text>
          <Pressable disabled={!text.trim()} onPress={() => onDone(actPatron((x) => postYazi(x, yk, text)) ?? '')} style={[st.send, !text.trim() && { opacity: 0.4 }]}>
            <Icon name="send" size={14} color="#fff" />
            <Text style={st.sendText}>{L("PAYLAŞ")}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

// ---------- DM ----------

const DM_ROL: Record<PDmRol, { ikon: IconName; renk: string; etiket: () => string }> = {
  dovuscu: { ikon: 'boxing-glove', renk: C.red, etiket: () => L("Dövüşçü") },
  hayran: { ikon: 'heart', renk: '#ff5c8a', etiket: () => L("Hayran") },
  gazeteci: { ikon: 'microphone', renk: C.orange, etiket: () => L("Gazeteci") },
  unlu: { ikon: 'star', renk: C.gold, etiket: () => L("Ünlü") },
  troll: { ikon: 'emoticon-devil', renk: C.dim, etiket: () => L("Trol") },
  menajer: { ikon: 'account-tie', renk: C.blue, etiket: () => L("Menajer") },
};

function DmInbox({ r, onOpen, onBack }: { r: PatronRun; onOpen: (id: string) => void; onBack: () => void }) {
  return (
    <View>
      <View style={st.ptop}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Icon name="arrow-left" size={24} color={C.text} />
        </Pressable>
        <Text style={st.topName}>{orgHandle(r).slice(1)}</Text>
      </View>
      <Text style={[st.author, { marginTop: 8, marginBottom: 6 }]}>{L("Mesajlar")}</Text>
      {r.gram.dm.length === 0 ? (
        <View style={st.emptyBox}>
          <Icon name="send-outline" size={40} color={C.text} />
          <Text style={st.emptyTitle}>{L("Mesaj yok")}</Text>
          <Text style={[st.sub, { textAlign: 'center' }]}>{L("Takipçin arttıkça dövüşçüler, gazeteciler ve ünlüler yazacak.")}</Text>
        </View>
      ) : null}
      {r.gram.dm.map((d) => (
        <Pressable key={d.id} onPress={() => onOpen(d.id)} style={({ pressed }) => [st.dmRow, pressed && { backgroundColor: C.cardAlt }]}>
          <DmAvatar r={r} d={d} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[st.author, !d.okundu && { color: '#fff' }]} numberOfLines={1}>
              {d.kimden}
            </Text>
            <Text style={[st.sub, !d.okundu && { color: C.text, fontFamily: F.semi }]} numberOfLines={1}>
              {d.cevap != null ? d.sonuc : d.metin}
            </Text>
          </View>
          <Text style={st.sub}>{ago(r, d.hafta)}</Text>
          {!d.okundu ? <View style={st.dmDot} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

function DmAvatar({ r, d, size = 46 }: { r: PatronRun; d: PDm; size?: number }) {
  const f = d.p?.id ? fighterById(r, String(d.p.id)) : undefined;
  if (f) return <FighterAvatar look={pLook(f)} size={size} />;
  const x = DM_ROL[d.rol];
  return (
    <View style={[st.iconAv, { width: size, height: size, borderRadius: size / 2, borderColor: x.renk }]}>
      <Icon name={x.ikon} size={size * 0.45} color={x.renk} />
    </View>
  );
}

function DmChat({ r, id, onBack, onMsg }: { r: PatronRun; id: string; onBack: () => void; onMsg: (m: string) => void }) {
  const d = r.gram.dm.find((x) => x.id === id);
  if (!d) return null;
  const expired = d.cevap == null && r.hafta - d.hafta > 6;
  return (
    <View>
      <View style={st.ptop}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Icon name="arrow-left" size={24} color={C.text} />
        </Pressable>
        <DmAvatar r={r} d={d} size={32} />
        <View style={{ flex: 1 }}>
          <Text style={st.author} numberOfLines={1}>
            {d.kimden}
          </Text>
          <Text style={st.sub}>{DM_ROL[d.rol].etiket()}</Text>
        </View>
      </View>
      <View style={{ gap: 10, marginTop: 14 }}>
        <View style={st.them}>
          <Text style={st.bubbleText}>{d.metin}</Text>
        </View>
        {d.cevap != null ? (
          <>
            <View style={st.me}>
              <Text style={[st.bubbleText, { color: '#fff' }]}>{d.secenekler[d.cevap]}</Text>
            </View>
            {d.sonuc ? <Text style={[st.sub, { color: C.gold, textAlign: 'center' }]}>{d.sonuc}</Text> : null}
          </>
        ) : expired ? (
          <Text style={[st.sub, { textAlign: 'center' }]}>{L("Bu mesajın zamanı geçti.")}</Text>
        ) : (
          <View style={{ gap: 6 }}>
            {d.secenekler.map((s, i) => (
              <Pressable key={i} onPress={() => onMsg(actPatron((x) => answerDm(x, d.id, i)) ?? '')} style={({ pressed }) => [st.tpl, pressed && { opacity: 0.6 }]}>
                <Text style={st.tplText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ---------- Ana bileşen ----------

export function PatronGram({ r }: { r: PatronRun }) {
  const [view, setView] = useState<'ana' | 'profil'>('ana');
  const [dm, setDm] = useState<null | 'list' | string>(null);
  const [compose, setCompose] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const done = (m: string) => {
    if (m) setMsg(m);
    setCompose(false);
  };
  return (
    <View style={{ marginTop: 4 }}>
      <View style={st.switch}>
        {(
          [
            ['ana', 'home-variant', L("Ana sayfa")],
            ['profil', 'account-circle', L("Profil")],
          ] as const
        ).map(([k, ikon, l]) => (
          <Pressable key={k} onPress={() => (setDm(null), setView(k))} style={[st.switchBtn, view === k && !dm && st.switchOn]}>
            <Icon name={ikon} size={18} color={view === k && !dm ? C.text : C.faint} />
            <Text style={[st.switchText, view === k && !dm && { color: C.text }]}>{l}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setCompose(true)} style={st.switchBtn}>
          <Icon name="plus-box-outline" size={18} color={C.faint} />
          <Text style={st.switchText}>{L("Yeni")}</Text>
        </Pressable>
      </View>
      {msg ? (
        <Pressable onPress={() => setMsg(null)} style={st.toast}>
          <Icon name="check-circle" size={16} color={C.gold} />
          <Text style={st.toastText}>{msg}</Text>
        </Pressable>
      ) : null}
      {dm === 'list' ? (
        <DmInbox
          r={r}
          onBack={() => setDm(null)}
          onOpen={(id) => {
            setDm(id);
            actPatron((x) => readDm(x, id));
          }}
        />
      ) : dm ? (
        <DmChat r={r} id={dm} onBack={() => setDm('list')} onMsg={(m) => m && setMsg(m)} />
      ) : view === 'ana' ? (
        <FeedHome r={r} onMsg={(m) => m && setMsg(m)} onNew={() => setCompose(true)} onDm={() => setDm('list')} />
      ) : (
        <Profile r={r} onNew={() => setCompose(true)} onDm={() => setDm('list')} onMsg={(m) => m && setMsg(m)} />
      )}
      <Modal visible={compose} transparent animationType="slide" onRequestClose={() => setCompose(false)}>
        <View style={st.sheetBack}>
          <View style={st.sheet}>
            <View style={st.sheetHead}>
              <Pressable onPress={() => setCompose(false)} hitSlop={10}>
                <Icon name="close" size={24} color={C.text} />
              </Pressable>
              <Text style={st.sheetTitle}>{L("Yeni gönderi")}</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              <Composer r={r} onDone={done} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 6 },
  ptop: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  brand: { color: C.text, fontFamily: F.black, fontSize: 26, fontStyle: 'italic', letterSpacing: -0.5 },
  badge: { position: 'absolute', top: -6, right: -8, backgroundColor: '#ff3040', borderRadius: 9, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  badgeText: { color: '#fff', fontFamily: F.bold, fontSize: 10 },
  stories: { gap: 12, paddingVertical: 10, paddingRight: 8 },
  story: { width: 70, alignItems: 'center', gap: 4 },
  ownRing: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  plus: { position: 'absolute', right: 0, bottom: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: BLUE_TICK, borderWidth: 2, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' },
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
  delta: { fontFamily: F.semi, fontSize: 12 },
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
  taps: { position: 'absolute', top: 90, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  stats: { flex: 1, flexDirection: 'row' },
  statVal: { color: C.text, fontFamily: F.bold, fontSize: 18 },
  statLbl: { color: C.text, fontFamily: F.body, fontSize: 13 },
  topName: { color: C.text, fontFamily: F.bold, fontSize: 20, flexShrink: 1 },
  btnRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  igBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1f2127', borderRadius: 8, paddingVertical: 8 },
  igBtnText: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  hl: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: '#3a3d45', alignItems: 'center', justifyContent: 'center' },
  hlIn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#15171c', alignItems: 'center', justifyContent: 'center' },
  hlText: { color: C.text, fontFamily: F.body, fontSize: 12, marginTop: 4 },
  igTabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, marginTop: 4, marginHorizontal: -16 },
  igTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1.5, borderBottomColor: 'transparent' },
  igTabOn: { borderBottomColor: C.text },
  cellLikes: { position: 'absolute', left: 5, bottom: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  cellLikesText: { color: '#fff', fontFamily: F.bold, fontSize: 11, textShadowColor: '#000', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 32, paddingHorizontal: 24 },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: C.text, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: C.text, fontFamily: F.bold, fontSize: 20 },
  board: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginTop: 10 },
  boardTitle: { color: C.gold, fontFamily: F.display, fontSize: 16, letterSpacing: 1.5 },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  boardMe: { backgroundColor: '#2a1d06', borderRadius: 6, paddingHorizontal: 6 },
  boardRank: { width: 24, color: C.dim, fontFamily: F.display, fontSize: 18, textAlign: 'center' },
  boardBar: { height: 4, backgroundColor: '#15161a', borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  boardVal: { color: C.text, fontFamily: F.display, fontSize: 16, minWidth: 56, textAlign: 'right' },
  input: { color: C.text, fontFamily: F.body, fontSize: 14, minHeight: 44, textAlignVertical: 'top', backgroundColor: '#060607', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: C.border },
  send: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.red, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 3, transform: [{ skewX: '-10deg' }] },
  sendText: { color: '#fff', fontFamily: F.display, fontSize: 14, letterSpacing: 1 },
  modes: { flexDirection: 'row', gap: 6 },
  mode: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 3, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardAlt },
  modeOn: { backgroundColor: C.red, borderColor: C.red },
  chips: { gap: 6, paddingVertical: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardAlt },
  chipOn: { backgroundColor: C.red, borderColor: C.red },
  chipText: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  lockOver: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  lockText: { color: '#fff', fontFamily: F.semi, fontSize: 14, textAlign: 'center' },
  proRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, backgroundColor: C.cardAlt },
  proTitle: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  tpl: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: C.cardAlt },
  tplText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  dmRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 6 },
  dmDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE_TICK },
  them: { alignSelf: 'flex-start', maxWidth: '85%', backgroundColor: '#262830', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  me: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: '#3797f0', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  switch: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  switchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  switchOn: { borderBottomColor: C.text },
  switchText: { color: C.faint, fontFamily: F.semi, fontSize: 13 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1a1408', borderWidth: 1, borderColor: C.goldDeep, borderRadius: 8, padding: 10, marginVertical: 8 },
  toastText: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 18 },
  sheetBack: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: C.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingTop: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { color: C.text, fontFamily: F.bold, fontSize: 16 },
});
