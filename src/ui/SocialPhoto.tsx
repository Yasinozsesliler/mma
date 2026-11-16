// Sosyal medyanın fotoğraf tarafı: paylaşım ekranı, akıştaki fotoğraf kartı ve profil ızgarası.
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { fullName } from '../engine/character';
import { fmtFollowers } from '../engine/fame';
import { WEIGHT_CLASSES } from '../engine/data';
import { PHOTO_FILTERS, PHOTO_KINDS, photoExtra, photoLock, photoPreview, photoUsedThisWeek, proCost, sharePhoto, type PhotoKind, type PhotoPost } from '../engine/gram';
import { postIdeas, type IdeaKat } from '../engine/postIdeas';
import { playerHandle } from '../engine/social';
import type { GameState, Post } from '../engine/types';
import { L, LOC } from '../i18n';
import { Icon, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { PhotoArt } from './PhotoArt';
import { C, F, R } from './theme';

const ago = (s: GameState, h: number) => (s.hafta - h <= 0 ? L("bu hafta") : L("{0} hf önce", [s.hafta - h]));

/** Kapsayıcının genişliğini ölçer (fotoğraflar kare ve ekrana sığar; geniş ekranda 520 ile sınırlı). */
export function Measure({ children, max = 520 }: { children: (w: number) => ReactNode; max?: number }) {
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
            {foto.oneCikan ? L(" · Sponsorlu") : ''}
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
      <Measure max={240}>
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

export const VERIFIED = 100_000;
export const BLUE_TICK = '#3897f0';

/** Instagram üst çubuğu: kullanıcı adı, mavi tik (100B takipçiden sonra), yeni gönderi ve sıralama. */
export function IgTopBar({ s, takipci, onNew, onBoard, onDm, unread }: { s: GameState; takipci: number; onNew: () => void; onBoard: () => void; onDm: () => void; unread: number }) {
  return (
    <View style={st.top}>
      <Icon name="lock-outline" size={16} color={C.text} />
      <Text style={st.topName} numberOfLines={1}>
        {playerHandle(s).slice(1)}
      </Text>
      {takipci >= VERIFIED ? <Icon name="check-decagram" size={18} color={BLUE_TICK} /> : null}
      <Icon name="chevron-down" size={18} color={C.text} />
      <View style={{ flex: 1 }} />
      <Pressable onPress={onNew} hitSlop={8}>
        <Icon name="plus-box-outline" size={26} color={C.text} />
      </Pressable>
      <Pressable onPress={onDm} hitSlop={8}>
        <Icon name="send-outline" size={25} color={C.text} />
        {unread ? (
          <View style={st.dmBadge}>
            <Text style={st.dmBadgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        ) : null}
      </Pressable>
      <Pressable onPress={onBoard} hitSlop={8}>
        <Icon name="menu" size={26} color={C.text} />
      </Pressable>
    </View>
  );
}

/** Instagram profil başlığı: halkalı avatar, gönderi/takipçi/takip, ad, "Sporcu", biyografi ve düğmeler. */
export function ProfileHeader({ s, takipci, tier, onEdit, onNew, editing }: { s: GameState; takipci: number; tier: string; onEdit: () => void; onNew: () => void; editing: boolean }) {
  const gonderi = (s.foto?.say ?? 0) + (s.istat?.gonderi ?? 0);
  const takip = 120 + ((s.gecmis.length * 7 + s.rakipler.length * 3) % 400);
  const salon = s.takim?.salon;
  const satir = [WEIGHT_CLASSES[s.fighter.siklet]?.ad, salon, s.rank != null ? `#${s.rank}` : null, s.sampiyon ? '👑' : null].filter(Boolean).join(' · ');
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <StoryRing size={78}>
          <FighterAvatar look={s.fighter.gorunum} size={78} />
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
              <Text style={st.statLbl} numberOfLines={1}>
                {l}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={[st.author, { marginTop: 10 }]}>{fullName(s.fighter)}</Text>
      <Text style={st.sub}>{L("Sporcu")}</Text>
      <Text style={st.caption} numberOfLines={1}>
        {L("MMA dövüşçüsü")} · {satir}
      </Text>
      {s.fighter.hakkinda ? (
        <Text style={st.caption} numberOfLines={3}>
          {s.fighter.hakkinda}
        </Text>
      ) : null}
      <Text style={[st.sub, { color: C.gold, marginTop: 2 }]}>{tier}</Text>
      <View style={st.btnRow}>
        <Pressable onPress={onEdit} style={({ pressed }) => [st.igBtn, (pressed || editing) && { backgroundColor: '#2a2d35' }]}>
          <Text style={st.igBtnText} numberOfLines={1}>
            {L("Profili düzenle")}
          </Text>
        </Pressable>
        <Pressable onPress={onNew} style={({ pressed }) => [st.igBtn, pressed && { backgroundColor: '#2a2d35' }]}>
          <Text style={st.igBtnText} numberOfLines={1}>
            {L("Yeni gönderi")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Biyografi düzenleme (150 karakter). */
export function BioEditor({ s, act, onDone }: { s: GameState; act: Act; onDone: () => void }) {
  const [v, setV] = useState(s.fighter.hakkinda ?? '');
  return (
    <View style={{ gap: 8, marginTop: 10 }}>
      <TextInput style={st.input} value={v} onChangeText={setV} placeholder={L("Biyografi yaz…")} placeholderTextColor={C.faint} maxLength={150} multiline />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={st.sub}>{v.length}/150</Text>
        <Pressable
          onPress={() => {
            act((x) => {
              x.fighter.hakkinda = v.trim().slice(0, 150);
            });
            onDone();
          }}
          style={[st.igBtn, { flex: 0, paddingHorizontal: 18, backgroundColor: BLUE_TICK }]}
        >
          <Text style={[st.igBtnText, { color: '#fff' }]}>{L("Kaydet")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const HL_NAME: Record<PhotoKind, string> = { antrenman: L("Kamp"), zafer: L("Zafer"), kemer: L("Kemer"), afis: L("Afiş"), luks: L("Lüks"), aile: L("Aile"), evcil: L("Dostum"), taraftar: L("Taraftar"), sponsor: L("Sponsor") };
const HL_ICON: Record<PhotoKind, IconName> = { antrenman: 'dumbbell', zafer: 'trophy', kemer: 'crown', afis: 'image-frame', luks: 'car-sports', aile: 'heart', evcil: 'paw', taraftar: 'account-group', sponsor: 'briefcase' };

/** Öne çıkanlar: paylaşılmış türler yuvarlak simge olarak; dokununca ızgara o türe süzülür. */
export function Highlights({ s, selected, onSelect, onNew }: { s: GameState; selected: PhotoKind | null; onSelect: (k: PhotoKind) => void; onNew: () => void }) {
  const kinds = PHOTO_KINDS.filter((k) => (s.foto?.liste ?? []).some((p) => p.tur === k.id));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 12 }}>
      {kinds.map((k) => (
        <Pressable key={k.id} onPress={() => onSelect(k.id)} style={{ alignItems: 'center', width: 64 }}>
          <View style={[st.hl, selected === k.id && { borderColor: C.text }]}>
            <View style={st.hlIn}>
              <Icon name={HL_ICON[k.id]} size={24} color={selected === k.id ? C.gold : C.text} />
            </View>
          </View>
          <Text style={st.hlText} numberOfLines={1}>
            {HL_NAME[k.id]}
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
  );
}

/** Profil ızgarası: kenardan kenara 3 sütun, 4:5 kareler, beğeni sayısı ve çoklu fotoğraf simgesi. */
export function ProfileGrid({ s, filter, onNew }: { s: GameState; filter: PhotoKind | null; onNew: () => void }) {
  const all = s.foto?.liste ?? [];
  const list = filter ? all.filter((p) => p.tur === filter) : all;
  const [open, setOpen] = useState<string | null>(null);
  if (!all.length)
    return (
      <Pressable onPress={onNew} style={st.empty}>
        <View style={st.emptyIcon}>
          <Icon name="camera-outline" size={36} color={C.text} />
        </View>
        <Text style={st.emptyTitle}>{L("İlk fotoğrafını paylaş")}</Text>
        <Text style={[st.sub, { textAlign: 'center' }]}>{L("Henüz fotoğraf yok. İlk fotoğrafını paylaş, profilin dolmaya başlasın.")}</Text>
      </Pressable>
    );
  const sel = list.find((p) => p.id === open);
  return (
    <View style={{ marginHorizontal: -16 }}>
      {sel ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <PhotoCard s={s} p={{ kullanici: playerHandle(s), hafta: sel.hafta }} foto={sel} />
          <Pressable onPress={() => setOpen(null)} style={st.shuffle}>
            <Icon name="grid" size={14} color={C.gold} />
            <Text style={st.shuffleText}>{L("IZGARAYA DÖN")}</Text>
          </Pressable>
        </View>
      ) : null}
      <Measure max={720}>
        {(w) => {
          const cell = Math.floor((w - 4) / 3);
          const u = cell / 100;
          return (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingTop: 2 }}>
              {list.map((p) => (
                <Pressable key={p.id} onPress={() => setOpen(open === p.id ? null : p.id)} style={({ pressed }) => ({ opacity: pressed || open === p.id ? 0.55 : 1 })}>
                  <PhotoArt p={p} size={cell} />
                  {p.pro || p.viral ? (
                    <View style={{ position: 'absolute', top: 5, right: 5 }}>
                      <Icon name={p.viral ? 'fire' : 'checkbox-multiple-blank'} size={Math.max(14, 13 * u)} color="#fff" />
                    </View>
                  ) : null}
                  <View style={st.cellLikes}>
                    <Icon name="heart" size={Math.max(12, 11 * u)} color="#fff" />
                    <Text style={[st.cellLikesText, { fontSize: Math.max(11, 10 * u) }]}>{fmtFollowers(p.begeni)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          );
        }}
      </Measure>
    </View>
  );
}

const st = StyleSheet.create({
  dmBadge: { position: 'absolute', top: -5, right: -7, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ff3040', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.bg },
  dmBadgeText: { color: '#fff', fontFamily: F.bold, fontSize: 10 },
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
  stats: { flex: 1, flexDirection: 'row' },
  statVal: { color: C.text, fontFamily: F.bold, fontSize: 18 },
  statLbl: { color: C.text, fontFamily: F.body, fontSize: 13 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  topName: { color: C.text, fontFamily: F.bold, fontSize: 20, flexShrink: 1 },
  btnRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  igBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1f2127', borderRadius: 8, paddingVertical: 8 },
  igBtnText: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  hl: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: '#3a3d45', alignItems: 'center', justifyContent: 'center' },
  hlIn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#15171c', alignItems: 'center', justifyContent: 'center' },
  hlText: { color: C.text, fontFamily: F.body, fontSize: 12, marginTop: 4 },
  cellLikes: { position: 'absolute', left: 5, bottom: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  cellLikesText: { color: '#fff', fontFamily: F.bold, textShadowColor: '#000', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 32, paddingHorizontal: 24 },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: C.text, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: C.text, fontFamily: F.bold, fontSize: 20 },
});
