// Instagram mesaj kutusu: sohbet listesi ve sohbet ekranı. Her mesaja hazır cevaplardan biriyle yanıt verilir.
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playerHandle } from '../engine/social';
import { lookFor } from '../engine/tale';
import { useLook } from '../lookPref';
import { AvatarHD } from './avatarHD';
import { answerDm, dmExpired, readDm, type DmKind, type DmMsg } from '../engine/dm';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { useState } from 'react';
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
  const yeni = useLook() === 'yeni';
  if (yeni) return <IgInbox s={s} onOpen={onOpen} onBack={onBack} />;
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
  const yeni = useLook() === 'yeni';
  if (yeni) return <IgChat s={s} act={act} id={id} onBack={onBack} />;
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

// ---------- Yeni görünüm: Instagram mesaj kutusu ----------

const IG_RING = ['#feda75', '#fa7e1e', '#d62976', '#962fbf', '#4f5bd5'] as const;
const IG_ME = ['#a033ff', '#6b4cff', '#3b82f6'] as const;
const BLUE = '#3897f0';
/** Gerçek kişi gibi yüzü olanlar; marka ve bilinmeyen hesaplar ikonla görünür. */
const FACE: Partial<Record<DmKind, boolean>> = { rakip: true, hayran: true, troll: true, sevgili: true, aile: true, hoca: true, kanka: true, gazeteci: true, efsane: true, unlu: true };
const VERIFIED_KIND: Partial<Record<DmKind, boolean>> = { promotor: true, sponsor: true, efsane: true, unlu: true, gazeteci: true };
/** İstekler: tanımadığın hesaplar (Instagram'daki "İstekler" klasörü gibi ayrı listelenir). */
const REQUEST_KIND: Partial<Record<DmKind, boolean>> = { troll: true, dolandirici: true };

function IgAvatar({ s, m, size = 56, ring }: { s: GameState; m: DmMsg; size?: number; ring?: boolean }) {
  const k = KIND[m.kind];
  const yakin = m.kind === 'aile' || m.kind === 'hoca' || m.kind === 'kanka';
  const kadin = m.kind === 'sevgili' ? !s.fighter.kadin : undefined;
  const inner = size - (ring ? 6 : 0);
  const face = FACE[m.kind] ? (
    <View style={{ width: inner, height: inner, borderRadius: inner / 2, overflow: 'hidden', backgroundColor: '#1d1f25', alignItems: 'center', justifyContent: 'center' }}>
      <AvatarHD look={lookFor({ id: m.kullanici, uyruk: yakin ? s.fighter.uyruk : 'us', kadin })} size={inner * 1.12} frame="kare" ring="transparent" bg="#1d1f25" />
    </View>
  ) : (
    <LinearGradient colors={[k.color, k.color + '88']} style={{ width: inner, height: inner, borderRadius: inner / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={k.icon} size={inner * 0.46} color="#fff" />
    </LinearGradient>
  );
  if (!ring) return face;
  return (
    <LinearGradient colors={IG_RING} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ padding: 2, borderRadius: size / 2, backgroundColor: C.bg }}>{face}</View>
    </LinearGradient>
  );
}

function IgName({ m, style }: { m: DmMsg; style: object }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
      <Text style={style} numberOfLines={1}>
        {tx(m.kimden)}
      </Text>
      {VERIFIED_KIND[m.kind] ? <Icon name="check-decagram" size={14} color={BLUE} /> : null}
    </View>
  );
}

function IgInbox({ s, onOpen, onBack }: { s: GameState; onOpen: (id: string) => void; onBack: () => void }) {
  const all = s.dm?.liste ?? [];
  const [req, setReq] = useState(false);
  const list = all.filter((m) => !!REQUEST_KIND[m.kind] === req);
  const reqCount = all.filter((m) => REQUEST_KIND[m.kind] && !m.okundu).length;
  return (
    <View>
      <View style={ig.head}>
        <Pressable onPress={req ? () => setReq(false) : onBack} hitSlop={10}>
          <Icon name="arrow-left" size={26} color={C.text} />
        </Pressable>
        <Text style={ig.handle} numberOfLines={1}>
          {req ? L("Mesaj istekleri") : playerHandle(s).slice(1)}
        </Text>
        {req ? null : <Icon name="chevron-down" size={18} color={C.text} />}
        <View style={{ flex: 1 }} />
        <Icon name="video-outline" size={27} color={C.text} />
        <Icon name="square-edit-outline" size={24} color={C.text} />
      </View>
      <View style={ig.search}>
        <Icon name="magnify" size={18} color="#8e8e8e" />
        <Text style={ig.searchText}>{L("Ara")}</Text>
      </View>
      {req ? null : (
        <View style={ig.sectionRow}>
          <Text style={ig.section}>{L("Mesajlar")}</Text>
          <Pressable onPress={() => setReq(true)} hitSlop={8}>
            <Text style={ig.requests}>
              {L("İstekler")}
              {reqCount ? ` (${reqCount})` : ''}
            </Text>
          </Pressable>
        </View>
      )}
      {list.length === 0 ? (
        <View style={st.empty}>
          <View style={ig.emptyIcon}>
            <Icon name="send-outline" size={40} color={C.text} />
          </View>
          <Text style={st.emptyTitle}>{req ? L("İstek yok") : L("Henüz mesaj yok")}</Text>
          <Text style={st.emptySub}>{req ? L("Tanımadığın hesapların mesajları burada görünür.") : L("Rakiplerin, hayranların ve sponsorların maçlar yaklaştıkça yazmaya başlar.")}</Text>
        </View>
      ) : null}
      {list.map((m) => {
        const bekliyor = m.cevap == null && !dmExpired(s, m);
        return (
          <Pressable key={m.id} onPress={() => onOpen(m.id)} style={({ pressed }) => [ig.row, pressed && { backgroundColor: '#ffffff08' }]}>
            <IgAvatar s={s} m={m} ring={!m.okundu} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <IgName m={m} style={[ig.name, !m.okundu && { fontFamily: F.bold }]} />
              <Text style={[ig.preview, !m.okundu && { color: C.text, fontFamily: F.semi }]} numberOfLines={1}>
                {m.cevapMetin ? L("Sen: {0}", [tx(m.cevapMetin)]) : tx(m.metin)}
                <Text style={ig.ago}> · {ago(s, m)}</Text>
              </Text>
            </View>
            {!m.okundu ? <View style={ig.dot} /> : bekliyor ? <Icon name="reply-outline" size={22} color="#8e8e8e" /> : <Icon name="camera-outline" size={24} color="#8e8e8e" />}
          </Pressable>
        );
      })}
    </View>
  );
}

function IgChat({ s, act, id, onBack }: { s: GameState; act: Act; id: string; onBack: () => void }) {
  const m = s.dm?.liste.find((x) => x.id === id);
  if (!m) return null;
  const k = KIND[m.kind];
  const expired = dmExpired(s, m);
  const open = m.cevap == null && !expired;
  return (
    <View>
      <View style={ig.head}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Icon name="arrow-left" size={26} color={C.text} />
        </Pressable>
        <IgAvatar s={s} m={m} size={34} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <IgName m={m} style={ig.chatName} />
          <Text style={ig.chatSub} numberOfLines={1}>
            {m.kullanici}
          </Text>
        </View>
        <Icon name="phone-outline" size={25} color={C.text} />
        <Icon name="video-outline" size={28} color={C.text} />
      </View>
      {/* Sohbetin başında profil tanıtımı */}
      <View style={ig.intro}>
        <IgAvatar s={s} m={m} size={88} />
        <IgName m={m} style={ig.introName} />
        <Text style={ig.introSub}>
          {m.kullanici} · {k.label()}
        </Text>
        <View style={ig.introBtn}>
          <Text style={ig.introBtnText}>{L("Profili gör")}</Text>
        </View>
      </View>
      <Text style={st.when}>{ago(s, m)}</Text>
      <View style={[ig.themRow, { marginTop: 8 }]}>
        <IgAvatar s={s} m={m} size={28} />
        <View style={ig.them}>
          <Text style={ig.bubble}>{tx(m.metin)}</Text>
        </View>
      </View>
      {m.cevapMetin ? (
        <>
          <LinearGradient colors={IG_ME} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ig.me}>
            <Text style={[ig.bubble, { color: '#fff' }]}>{tx(m.cevapMetin)}</Text>
          </LinearGradient>
          <Text style={ig.seen}>{L("Görüldü")}</Text>
        </>
      ) : null}
      {m.sonuc ? (
        <View style={st.result}>
          <Icon name="information-outline" size={14} color={C.gold} />
          <Text style={st.resultText}>{m.sonuc}</Text>
        </View>
      ) : null}
      {expired ? <Text style={st.expired}>{L("Bu mesajın cevap süresi geçti.")}</Text> : null}
      {open ? (
        <View style={ig.quick}>
          {m.secenek.map((o, i) => (
            <Pressable key={o} onPress={() => act((x) => void answerDm(x, m.id, i))} style={({ pressed }) => [ig.pill, pressed && { backgroundColor: '#3897f033', borderColor: BLUE }]}>
              <Text style={ig.pillText}>{tx(o)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {/* Mesaj yazma çubuğu (görünüm): cevaplar yukarıdaki hazır seçeneklerden gönderilir */}
      <View style={[ig.composer, !open && { opacity: 0.5 }]}>
        <View style={ig.cam}>
          <Icon name="camera" size={20} color="#fff" />
        </View>
        <Text style={ig.composerText} numberOfLines={1}>
          {open ? L("Yukarıdan bir cevap seç…") : L("Mesaj…")}
        </Text>
        <Icon name="microphone-outline" size={22} color={C.text} />
        <Icon name="image-outline" size={22} color={C.text} />
        <Icon name="sticker-emoji" size={22} color={C.text} />
      </View>
    </View>
  );
}

const ig = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, marginHorizontal: -16, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#262626', marginBottom: 8 },
  handle: { color: C.text, fontFamily: F.bold, fontSize: 20, marginLeft: 4, flexShrink: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#262626', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 14 },
  searchText: { color: '#8e8e8e', fontFamily: F.body, fontSize: 15 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  section: { color: C.text, fontFamily: F.bold, fontSize: 16 },
  requests: { color: BLUE, fontFamily: F.semi, fontSize: 14 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: C.text, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, marginHorizontal: -16, paddingHorizontal: 16 },
  name: { color: C.text, fontFamily: F.body, fontSize: 14.5 },
  preview: { color: '#a8a8a8', fontFamily: F.body, fontSize: 13.5, marginTop: 2 },
  ago: { color: '#8e8e8e' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: BLUE },
  chatName: { color: C.text, fontFamily: F.bold, fontSize: 15.5 },
  chatSub: { color: '#a8a8a8', fontFamily: F.body, fontSize: 12 },
  intro: { alignItems: 'center', gap: 4, paddingVertical: 18 },
  introName: { color: C.text, fontFamily: F.bold, fontSize: 18, marginTop: 6 },
  introSub: { color: '#a8a8a8', fontFamily: F.body, fontSize: 13 },
  introBtn: { marginTop: 8, backgroundColor: '#262626', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  introBtnText: { color: C.text, fontFamily: F.semi, fontSize: 13 },
  themRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '85%' },
  them: { backgroundColor: '#262626', borderRadius: 22, paddingVertical: 10, paddingHorizontal: 14, flexShrink: 1 },
  me: { alignSelf: 'flex-end', maxWidth: '78%', borderRadius: 22, paddingVertical: 10, paddingHorizontal: 14, marginTop: 10 },
  bubble: { color: C.text, fontFamily: F.body, fontSize: 15, lineHeight: 20 },
  seen: { alignSelf: 'flex-end', color: '#8e8e8e', fontFamily: F.body, fontSize: 11.5, marginTop: 3, marginRight: 4 },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginTop: 18 },
  pill: { borderWidth: 1, borderColor: '#3a3a3a', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 14, maxWidth: '100%' },
  pillText: { color: BLUE, fontFamily: F.semi, fontSize: 14 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#262626', borderRadius: 24, paddingVertical: 6, paddingLeft: 6, paddingRight: 14, marginTop: 14 },
  cam: { width: 34, height: 34, borderRadius: 17, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  composerText: { flex: 1, color: '#8e8e8e', fontFamily: F.body, fontSize: 15 },
});

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
