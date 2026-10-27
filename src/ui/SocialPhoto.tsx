// Sosyal medyanın fotoğraf tarafı: paylaşım ekranı, akıştaki fotoğraf kartı ve profil ızgarası.
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { fullName } from '../engine/character';
import { fmtFollowers } from '../engine/fame';
import { PHOTO_FILTERS, PHOTO_KINDS, photoExtra, photoLock, photoPreview, photoUsedThisWeek, proCost, sharePhoto, type PhotoKind, type PhotoPost } from '../engine/gram';
import { postIdeas, type IdeaKat } from '../engine/postIdeas';
import { playerHandle } from '../engine/social';
import type { GameState, Post } from '../engine/types';
import { L, LOC } from '../i18n';
import { Icon, P, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { PhotoArt } from './PhotoArt';
import { C, F, R } from './theme';

const ago = (s: GameState, h: number) => (s.hafta - h <= 0 ? L("bu hafta") : L("{0} hf önce", [s.hafta - h]));

/** Kapsayıcının genişliğini ölçer (fotoğraflar kare ve ekrana sığar; geniş ekranda 520 ile sınırlı). */
function Measure({ children, max = 520 }: { children: (w: number) => ReactNode; max?: number }) {
  const [w, setW] = useState(0);
  return <View onLayout={(e: LayoutChangeEvent) => setW(Math.min(max, Math.floor(e.nativeEvent.layout.width)))}>{w > 0 ? children(w) : null}</View>;
}

export function StoryRing({ children, size }: { children: ReactNode; size: number }) {
  return (
    <LinearGradient colors={['#f2c14e', '#e63946', '#b57bff']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size + 2, height: size + 2, borderRadius: (size + 2) / 2, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </LinearGradient>
  );
}

export function PhotoCard({ s, p, foto }: { s: GameState; p: Pick<Post, 'kullanici' | 'hafta'>; foto: PhotoPost }) {
  const [liked, setLiked] = useState(false);
  const kind = PHOTO_KINDS.find((k) => k.id === foto.tur);
  return (
    <View style={st.post}>
      <View style={st.head}>
        <StoryRing size={30}>
          <FighterAvatar look={s.fighter.gorunum} size={30} />
        </StoryRing>
        <View style={{ flex: 1 }}>
          <Text style={st.author} numberOfLines={1}>
            {p.kullanici}
          </Text>
          <Text style={st.sub} numberOfLines={1}>
            {kind?.ad} · {ago(s, p.hafta)}
            {foto.pro ? L(" · Pro çekim") : ''}
          </Text>
        </View>
        {foto.viral ? (
          <View style={st.badge}>
            <Icon name="rocket-launch" size={10} color={C.gold} />
            <Text style={st.badgeText}>{L("KEŞFET")}</Text>
          </View>
        ) : null}
      </View>
      <Measure>{(w) => <PhotoArt p={foto} size={w} />}</Measure>
      <View style={st.actions}>
        <Pressable onPress={() => setLiked(!liked)} hitSlop={8}>
          <Icon name={liked ? 'heart' : 'heart-outline'} size={24} color={liked ? C.red : C.text} />
        </Pressable>
        <Icon name="comment-outline" size={22} color={C.text} />
        <Icon name="send-outline" size={22} color={C.text} />
        <View style={{ flex: 1 }} />
        <Text style={[st.delta, { color: foto.delta >= 0 ? '#3ecf7a' : C.red }]} numberOfLines={1}>
          {foto.delta >= 0 ? '+' : '-'}
          {fmtFollowers(Math.abs(foto.delta))} {L("takipçi")}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 4 }}>
        <Text style={st.likes}>{L("{0} beğenme", [fmtFollowers(foto.begeni + (liked ? 1 : 0))])}</Text>
        {foto.aciklama ? (
          <Text style={st.caption}>
            <Text style={{ fontFamily: F.bold }}>{p.kullanici} </Text>
            {foto.aciklama}
          </Text>
        ) : null}
        {foto.yorumSay > foto.yorumlar.length ? <Text style={st.sub}>{L("{0} yorumun tümünü gör", [fmtFollowers(foto.yorumSay)])}</Text> : null}
        {foto.yorumlar.map((y, i) => (
          <Text key={i} style={st.caption} numberOfLines={2}>
            <Text style={{ fontFamily: F.bold }}>{y.yazar} </Text>
            {y.metin}
          </Text>
        ))}
      </View>
    </View>
  );
}

const CAPTION_KAT: Record<PhotoKind, IdeaKat> = { antrenman: 'kamp', zafer: 'sonuc', kemer: 'yasam', afis: 'trash', luks: 'yasam', aile: 'yasam', evcil: 'yasam', taraftar: 'taraftar', sponsor: 'sponsor' };

export function PhotoComposer({ s, act, onMsg }: { s: GameState; act: Act; onMsg: (m: string) => void }) {
  // Açılışta o an en anlamlı fotoğraf seçili gelir (zafer, afiş, kemer…); yoksa antrenman.
  const first = PHOTO_KINDS.find((k) => !photoLock(s, k.id) && !['antrenman', 'taraftar', 'sponsor'].includes(k.id))?.id ?? 'antrenman';
  const [kind, setKind] = useState<PhotoKind>(first);
  const [filtre, setFiltre] = useState(0);
  const [pro, setPro] = useState(false);
  const [caption, setCaption] = useState('');
  const [tur, setTur] = useState(0);
  const lock = photoLock(s, kind);
  const used = kind !== 'afis' && photoUsedThisWeek(s);
  const cost = proCost(s);
  const prev = photoPreview(s, kind, pro, caption);
  const ideas = postIdeas(s, CAPTION_KAT[kind], tur).slice(0, 3);
  const canPay = !pro || cost <= s.para;
  const disabled = !!lock || used || !canPay;
  const share = () => {
    act((x) => onMsg(sharePhoto(x, kind, { caption, filtre, pro })));
    setCaption('');
    setPro(false);
  };
  return (
    <View style={{ gap: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
        {PHOTO_KINDS.map((k) => {
          const locked = !!photoLock(s, k.id);
          const on = kind === k.id;
          return (
            <Pressable
              key={k.id}
              onPress={() => {
                setKind(k.id);
                setCaption('');
                setTur(0);
              }}
              style={[st.chip, on && st.chipOn, locked && !on && { opacity: 0.45 }]}
            >
              <Icon name={(locked ? 'lock' : k.ikon) as IconName} size={12} color={on ? '#fff' : C.dim} />
              <Text style={[st.chipText, on && { color: '#fff' }]}>{k.ad}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Measure max={300}>
        {(w) => (
          <View style={{ borderRadius: 8, overflow: 'hidden', alignSelf: 'center' }}>
            <PhotoArt p={{ tur: kind, filtre, look: s.fighter.gorunum, ek: lock ? undefined : photoExtra(s, kind, true) }} size={w} />
            {lock ? (
              <View style={st.lockOver}>
                <Icon name="lock" size={28} color="#fff" />
                <Text style={st.lockText}>{lock}</Text>
              </View>
            ) : null}
          </View>
        )}
      </Measure>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {PHOTO_FILTERS.map((f, i) => (
          <Pressable key={f.ad} onPress={() => setFiltre(i)} style={[st.chip, filtre === i && { borderColor: C.gold }]}>
            <View style={[st.dot, { backgroundColor: f.renk ?? '#ddd' }]} />
            <Text style={[st.chipText, filtre === i && { color: C.gold }]}>{f.ad}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <TextInput style={st.input} value={caption} onChangeText={setCaption} placeholder={L("Açıklama yaz…")} placeholderTextColor={C.faint} maxLength={200} multiline />
      <View style={{ gap: 6 }}>
        {ideas.map((t) => (
          <Pressable key={t} onPress={() => setCaption(t)} style={({ pressed }) => [st.tpl, pressed && { borderColor: C.red }]}>
            <Text style={st.tplText} numberOfLines={2}>
              {t}
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setTur(tur + 1)} style={st.shuffle}>
          <Icon name="shuffle-variant" size={14} color={C.gold} />
          <Text style={st.shuffleText}>{L("BAŞKA ÖNERİLER")}</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => setPro(!pro)} style={[st.proRow, pro && { borderColor: C.gold }]}>
        <Icon name={pro ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={pro ? C.gold : C.dim} />
        <View style={{ flex: 1 }}>
          <Text style={st.proTitle}>{L("Profesyonel çekim")}</Text>
          <Text style={st.sub}>{cost ? L("${0} · ilgi ×1,4", [cost.toLocaleString(LOC)]) : L("Fotoğrafçın var: bedava · ilgi ×1,4")}</Text>
        </View>
        <Icon name="camera-iris" size={20} color={C.gold} />
      </Pressable>
      {!lock ? (
        <View style={st.prevBox}>
          <Text style={st.sub}>
            {L("Beklenen ilgi:")} <Text style={{ color: prev.risk ? C.red : C.gold, fontFamily: F.bold }}>{prev.seviye}</Text>
          </Text>
          {prev.notes.map((n) => (
            <Text key={n} style={[st.sub, { color: C.dim }]}>
              • {n}
            </Text>
          ))}
        </View>
      ) : null}
      {used ? <Text style={[st.sub, { textAlign: 'center' }]}>{L("Bu hafta fotoğraf paylaştın. Gelecek hafta yeniden paylaşabilirsin.")}</Text> : null}
      {pro && !canPay ? <Text style={[st.sub, { textAlign: 'center', color: C.red }]}>{L("Profesyonel çekim için paran yetmiyor.")}</Text> : null}
      <Pressable onPress={share} disabled={disabled} style={({ pressed }) => [st.send, { opacity: disabled ? 0.35 : pressed ? 0.7 : 1 }]}>
        <Icon name="camera" size={14} color="#fff" />
        <Text style={st.sendText}>{L("PAYLAŞ")}</Text>
      </Pressable>
    </View>
  );
}

export function ProfileGrid({ s }: { s: GameState }) {
  const list = s.foto?.liste ?? [];
  const [open, setOpen] = useState<string | null>(null);
  if (!list.length) return <P dim>{L("Henüz fotoğraf yok. İlk fotoğrafını paylaş, profilin dolmaya başlasın.")}</P>;
  const sel = list.find((p) => p.id === open);
  return (
    <View style={{ gap: 10 }}>
      {sel ? (
        <View>
          <PhotoCard s={s} p={{ kullanici: playerHandle(s), hafta: sel.hafta }} foto={sel} />
          <Pressable onPress={() => setOpen(null)} style={st.shuffle}>
            <Icon name="view-grid" size={14} color={C.gold} />
            <Text style={st.shuffleText}>{L("IZGARAYA DÖN")}</Text>
          </Pressable>
        </View>
      ) : null}
      <Measure>
        {(w) => {
          const cell = Math.floor((w - 4) / 3);
          return (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
              {list.map((p) => (
                <Pressable key={p.id} onPress={() => setOpen(p.id)} style={({ pressed }) => ({ opacity: pressed || open === p.id ? 0.55 : 1 })}>
                  <PhotoArt p={p} size={cell} />
                </Pressable>
              ))}
            </View>
          );
        }}
      </Measure>
    </View>
  );
}

/** Instagram tarzı profil başlığı: halkalı avatar, gönderi/takipçi/takip, unvan ve biyografi. */
export function ProfileHeader({ s, takipci, tier }: { s: GameState; takipci: number; tier: string }) {
  const gonderi = (s.foto?.say ?? 0) + (s.istat?.gonderi ?? 0);
  const takip = 80 + Math.min(900, (s.gecmis.length * 7) % 400 + s.rakipler.length * 3);
  return (
    <View style={st.profile}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <StoryRing size={66}>
          <FighterAvatar look={s.fighter.gorunum} size={66} />
        </StoryRing>
        <View style={st.stats}>
          {(
            [
              [String(gonderi), L("gönderi")],
              [fmtFollowers(takipci), L("takipçi")],
              [String(takip), L("takip")],
            ] as const
          ).map(([v, l]) => (
            <View key={l} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={st.statVal} numberOfLines={1} adjustsFontSizeToFit>
                {v}
              </Text>
              <Text style={st.sub} numberOfLines={1}>
                {l}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={[st.author, { marginTop: 10 }]}>{fullName(s.fighter)}</Text>
      <Text style={[st.sub, { color: C.gold }]}>
        {playerHandle(s)} · {tier}
      </Text>
      {s.fighter.hakkinda ? (
        <Text style={[st.caption, { marginTop: 4 }]} numberOfLines={3}>
          {s.fighter.hakkinda}
        </Text>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  post: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  author: { color: C.text, fontFamily: F.bold, fontSize: 14, flexShrink: 1 },
  sub: { color: C.faint, fontFamily: F.body, fontSize: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: C.gold, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { color: C.gold, fontFamily: F.display, fontSize: 9, letterSpacing: 0.8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 12, paddingVertical: 10 },
  delta: { fontFamily: F.semi, fontSize: 12, flexShrink: 1 },
  likes: { color: C.text, fontFamily: F.bold, fontSize: 13 },
  caption: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  chips: { gap: 6, paddingVertical: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardAlt },
  chipOn: { backgroundColor: C.red, borderColor: C.red },
  chipText: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  lockOver: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  lockText: { color: '#fff', fontFamily: F.semi, fontSize: 14, textAlign: 'center' },
  input: { color: C.text, fontFamily: F.body, fontSize: 14, minHeight: 44, textAlignVertical: 'top', backgroundColor: '#060607', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: C.border },
  tpl: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: C.cardAlt },
  tplText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  shuffle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  shuffleText: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  proRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, backgroundColor: C.cardAlt },
  proTitle: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  prevBox: { gap: 2 },
  send: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.red, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 3, transform: [{ skewX: '-10deg' }] },
  sendText: { color: '#fff', fontFamily: F.display, fontSize: 14, letterSpacing: 1 },
  profile: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  stats: { flex: 1, flexDirection: 'row' },
  statVal: { color: C.text, fontFamily: F.display, fontSize: 20 },
});
