// Profil sekmesi: efsane şeridi ve hızlı işlemler, ardından dört alt sekme
// (Kart: dövüşçü kartı ve istatistikler · Vitrin: kemerler, ödüller, başarımlar · Geçmiş: yolculuk, ezeli rakip, dövüş geçmişi · Yaşam: hakkında, aile, koleksiyon, hanedan).
import { L } from '../i18n';
import { TrophyCabinet } from './TrophyCabinet';
import { DynastySection } from './DynastyPanel';
import { NemesisCard } from './NemesisCard';
import { StoryJournal } from './StoryChapter';
import { TimelinePanel } from './TimelinePanel';
import { WikiButton } from './WikiPage';
import { careerCard } from '../share/build';
import { ShareButton } from '../share/ShareButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ACHIEVEMENTS, legacyScore, legacyTier } from '../engine/legacy';
import type { GameState } from '../engine/types';
import { BeltShowcase } from './BeltShowcase';
import { Card, Icon, OctIcon, Section, SLANT, type IconName } from './components';
import { FightHistoryPanel } from './FightHistoryPanel';
import { StatusPanel } from './StatusPanel';
import { PetBadge } from './PetPanel';
import { ItemArt } from './ItemArt';
import { itemById } from '../engine/shop';
import { petType } from '../engine/pets';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

type Tab = 'kart' | 'vitrin' | 'kariyer' | 'yasam';

/** Efsane şeridinde kare hızlı işlem kutucuğu. */
function Quick({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pf.quick, pressed && { borderColor: C.gold, backgroundColor: '#1d1a12' }]}>
      <Icon name={icon} size={20} color={C.gold} />
      <Text style={pf.quickText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ProfilePanel({ s, act }: { s: GameState; act: Act }) {
  const [tab, setTab] = useState<Tab>('kart');
  const score = legacyScore(s);
  const tier = legacyTier(score);
  const earned = new Set(s.basarimlar ?? []);
  const kupa = (s.kemerler ?? []).length + (s.oduller ?? []).length;
  const TABS: { key: Tab; label: string; icon: IconName; badge?: number }[] = [
    { key: 'kart', label: L("Kart"), icon: 'card-account-details' },
    { key: 'vitrin', label: L("Vitrin"), icon: 'trophy-variant', badge: kupa || undefined },
    { key: 'kariyer', label: L("Geçmiş"), icon: 'timeline-text' },
    { key: 'yasam', label: L("Yaşam"), icon: 'home-heart' },
  ];

  return (
    <>
      {/* Efsane puanı ve hızlı işlemler */}
      <LinearGradient colors={['#1b1408', '#0d0d10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pf.strip}>
        <View style={pf.legacy}>
          <Text style={pf.legacyLabel}>{L("EFSANE PUANI")}</Text>
          <Text style={[pf.legacyVal, SLANT, { color: tier.renk }]}>{score}</Text>
          <Text style={[pf.tier, { color: tier.renk }]} numberOfLines={1}>
            {tier.ad}
          </Text>
        </View>
        <View style={pf.quicks}>
          <WikiButton s={s} render={(open) => <Quick icon="book-open-page-variant" label={L("Kafespedia")} onPress={open} />} />
          <Quick icon="content-cut" label={L("Stil")} onPress={() => act((x) => (x.phase = 'stil'))} />
          <ShareButton data={careerCard(s)} render={(open) => <Quick icon="share-variant" label={L("Paylaş")} onPress={open} />} />
        </View>
      </LinearGradient>

      {/* Alt sekmeler */}
      <View style={pf.tabs}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[pf.tab, on && pf.tabOn]}>
              <Icon name={t.icon} size={16} color={on ? '#111' : C.dim} />
              <Text style={[pf.tabText, on && { color: '#111' }]}>{t.label}</Text>
              {t.badge ? (
                <View style={[pf.badge, on && { backgroundColor: '#111' }]}>
                  <Text style={[pf.badgeText, on && { color: C.gold }]}>{t.badge}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {tab === 'kart' ? <StatusPanel s={s} /> : tab === 'vitrin' ? <Showcase s={s} act={act} earned={earned.size} /> : tab === 'kariyer' ? <CareerTab s={s} /> : <LifeTab s={s} act={act} />}
    </>
  );
}

function Showcase({ s, act, earned }: { s: GameState; act: Act; earned: number }) {
  return (
    <>
      <Pressable onPress={() => act((x) => (x.phase = 'basarimlar'))}>
        <LinearGradient colors={s.hof ? ['#3a2a07', '#140f04'] : ['#16110a', '#0c0d10']} style={pf.achLink}>
          <OctIcon name={s.hof ? 'pillar' : 'medal'} color={C.gold} size={42} />
          <View style={{ flex: 1 }}>
            <Text style={pf.achName}>{s.hof ? L("🏛 HALL OF FAME ÜYESİ") : L("BAŞARIMLAR VE HALL OF FAME")}</Text>
            <View style={pf.achBar}>
              <View style={[pf.achFill, { width: `${Math.round((earned / ACHIEVEMENTS.length) * 100)}%` }]} />
            </View>
            <Text style={pf.meta}>{L("{0}/{1} başarım", [earned, ACHIEVEMENTS.length])}</Text>
          </View>
          <Icon name="chevron-right" size={22} color={C.gold} />
        </LinearGradient>
      </Pressable>
      <TrophyCabinet s={s} />
      <Section>{L("KEMER VİTRİNİ")}</Section>
      <BeltShowcase s={s} />
    </>
  );
}

function CareerTab({ s }: { s: GameState }) {
  return (
    <>
      <NemesisCard s={s} />
      <StoryJournal s={s} />
      <TimelinePanel s={s} />
      <FightHistoryPanel s={s} />
    </>
  );
}

function LifeTab({ s, act }: { s: GameState; act: Act }) {
  const [bio, setBio] = useState(s.fighter.hakkinda ?? '');
  const [saved, setSaved] = useState(false);
  const [edit, setEdit] = useState(!s.fighter.hakkinda);
  const [showCol, setShowCol] = useState(false);
  const owned = (s.envanter ?? []).map(itemById).filter((x) => x?.art && x.kategori === 'yasam');
  const cars = owned.filter((x) => x!.art!.kind === 'car');
  const houses = owned.filter((x) => x!.art!.kind === 'house');
  return (
    <>
      <Section>{L("HİKÂYE")}</Section>
      <Card>
        <Text style={pf.story}>{s.fighter.hikaye || '—'}</Text>
        <View style={pf.rule} />
        <Text style={pf.bioLabel}>{L("HAKKINDA")}</Text>
        {edit ? (
          <>
            <TextInput
              style={pf.input}
              value={bio}
              onChangeText={(t) => {
                setBio(t);
                setSaved(false);
              }}
              multiline
              maxLength={500}
              placeholder={L("Kendini anlat: felsefen, hedeflerin, taraftarlarına mesajın…")}
              placeholderTextColor={C.faint}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <Text style={pf.meta}>{bio.length}/500</Text>
              <Pressable
                onPress={() => {
                  act((x) => (x.fighter.hakkinda = bio.trim()));
                  setSaved(true);
                  if (bio.trim()) setEdit(false);
                }}
                style={({ pressed }) => [pf.save, pressed && { opacity: 0.7 }]}
              >
                <Icon name={saved ? 'check' : 'content-save'} size={14} color="#fff" />
                <Text style={pf.saveText}>{saved ? L("KAYDEDİLDİ") : L("KAYDET")}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable onPress={() => setEdit(true)} style={pf.bioView}>
            <Text style={[pf.story, { fontStyle: 'normal', flex: 1 }]}>{s.fighter.hakkinda}</Text>
            <Icon name="pencil" size={16} color={C.dim} />
          </Pressable>
        )}
      </Card>

      {(s.hayvanlar ?? []).length || s.iliski ? (
        <>
          <Section>{L("AİLE")}</Section>
          <View style={pf.gallery}>
            {s.iliski ? (
              <View style={pf.petItem}>
                <Text style={{ fontSize: 34 }}>{s.iliski.emoji}</Text>
                <Text style={pf.galleryName}>💞 {s.iliski.ad}</Text>
                <Text style={pf.achDesc}>{s.iliski.meslek}</Text>
              </View>
            ) : null}
            {(s.hayvanlar ?? []).map((p) => (
              <View key={p.id} style={pf.petItem}>
                <PetBadge turId={p.tur} size={52} />
                <Text style={pf.galleryName}>{p.ad}</Text>
                <Text style={pf.achDesc}>{petType(p.tur)?.ad}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {owned.length ? (
        <>
          <Section>{L("KOLEKSİYON")}</Section>
          <Pressable onPress={() => setShowCol(!showCol)} style={pf.colHead}>
            <Icon name="garage-variant" size={20} color={C.gold} />
            <Text style={pf.colText}>
              {cars.length} {L("araba ·")} {houses.length} {L("mülk ·")} {owned.length - cars.length - houses.length} {L("eşya")}
            </Text>
            <Text style={pf.colBtn}>{showCol ? L("GİZLE") : L("GÖSTER")}</Text>
            <Icon name={showCol ? 'chevron-up' : 'chevron-down'} size={18} color={C.dim} />
          </Pressable>
          {showCol ? (
            <View style={pf.gallery}>
              {owned.map((it) => (
                <View key={it!.id} style={pf.galleryItem}>
                  <ItemArt art={it!.art!} width={150} />
                  <Text style={pf.galleryName} numberOfLines={1}>
                    {it!.ad}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      <DynastySection s={s} />
    </>
  );
}

const pf = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 12, marginBottom: 12 },
  legacy: { minWidth: 92 },
  legacyLabel: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1.5 },
  legacyVal: { fontFamily: F.display, fontSize: 32, lineHeight: 36 },
  tier: { fontFamily: F.display, fontSize: 11, letterSpacing: 0.5 },
  quicks: { flex: 1, flexDirection: 'row', gap: 6 },
  quick: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: C.border, backgroundColor: '#0a0a0c', borderRadius: 10, paddingVertical: 10 },
  quickText: { color: C.text, fontFamily: F.display, fontSize: 10, letterSpacing: 0.5 },
  tabs: { flexDirection: 'row', gap: 6, backgroundColor: '#0a0a0c', borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 4, marginBottom: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: 9 },
  tabOn: { backgroundColor: C.gold },
  tabText: { color: C.dim, fontFamily: F.display, fontSize: 12, letterSpacing: 0.5 },
  badge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#111', fontFamily: F.display, fontSize: 10 },
  meta: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  story: { color: C.dim, fontFamily: F.body, fontSize: 14, lineHeight: 21, fontStyle: 'italic' },
  rule: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  bioLabel: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, marginBottom: 6 },
  bioView: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  input: { color: C.text, fontFamily: F.body, fontSize: 14, minHeight: 80, textAlignVertical: 'top', backgroundColor: '#060607', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: C.border },
  save: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.red, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 3, transform: [{ skewX: '-10deg' }] },
  saveText: { color: '#fff', fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  galleryItem: { width: '48.5%', backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 6, alignItems: 'center' },
  galleryName: { color: C.text, fontFamily: F.semi, fontSize: 11, marginTop: 4, textAlign: 'center' },
  petItem: { width: '31.5%', backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 8, alignItems: 'center', gap: 2 },
  achName: { color: C.gold, fontFamily: F.display, fontSize: 15 },
  achBar: { height: 5, borderRadius: 3, backgroundColor: '#ffffff14', marginVertical: 5, overflow: 'hidden' },
  achFill: { height: '100%', backgroundColor: C.gold, borderRadius: 3 },
  colHead: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 8 },
  colText: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13 },
  colBtn: { color: C.dim, fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  achLink: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 12, marginBottom: 4 },
  achDesc: { color: C.faint, fontFamily: F.body, fontSize: 10, textAlign: 'center', lineHeight: 13 },
});
