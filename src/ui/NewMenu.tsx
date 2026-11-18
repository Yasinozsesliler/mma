// Yeni görünüm: ana menünün üst bölümü (kartlı düzen). Klasik görünümde hiç çizilmez.
// Kariyer büyük kahraman kartı, Efsane Yolları ve Patron yan yana, diğer modlar yana kaydırılan kartlar,
// "Önerilen" bölümünde süreli fırsat. Satın alma ve reklam akışı değişmez; kartlar mevcut ekranları açar.
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { STAGE_LABELS } from '../engine/career';
import { WEIGHT_CLASSES } from '../engine/data';
import type { GameState } from '../engine/types';
import { L, LOC } from '../i18n';
import { markLookIntro, setLook, useLookIntro } from '../lookPref';
import { fmtLeft, openShop, useDeal, useNow } from '../monetization';
import { Icon, SLANT, upName, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F } from './theme';

export type ModeCard = { key: string; title: string; sub: string; color: string; icon: IconName; badge?: string; onPress: () => void };

function Head({ text }: { text: string }) {
  return (
    <View style={s.head}>
      <Text style={s.headText}>{text}</Text>
      <View style={s.headLine} />
    </View>
  );
}

/** Güncellemeden sonra bir kez: yeni görünüm duyurusu ve tek dokunuşla klasiğe dönüş. */
function LookIntro() {
  const show = useLookIntro();
  if (!show) return null;
  return (
    <View style={s.intro}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="palette" size={18} color={C.gold} />
        <Text style={s.introTitle}>{L("Yeni görünüm geldi!")}</Text>
      </View>
      <Text style={s.introText}>{L("Eski görünümü mü seviyorsun? Tek dokunuşla klasik görünüme dönebilirsin. İstediğin zaman Ayarlar › Görünüm'den değiştirebilirsin.")}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={markLookIntro} style={({ pressed }) => [s.introOk, pressed && { opacity: 0.8 }]}>
          <Text style={s.introOkText}>{L("YENİSİ GÜZEL")}</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            markLookIntro();
            setLook('klasik');
          }}
          style={({ pressed }) => [s.introBack, pressed && { opacity: 0.8 }]}
        >
          <Text style={s.introBackText}>{L("KLASİĞE DÖN")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DealRow() {
  const deal = useDeal();
  const now = useNow();
  if (!deal) return null;
  return (
    <Pressable onPress={() => openShop('menu_onerilen')} style={({ pressed }) => [s.deal, pressed && { borderColor: C.gold }]}>
      <View style={s.dealIcon}>
        <Icon name="gift" size={26} color="#1f1605" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.dealTitle}>{L("TAM PAKET FIRSATI")}</Text>
        <Text style={s.dealSub}>{L("Bütün modlar ve kozmetikler · süreli")}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.dealTime}>{fmtLeft(deal.ends - now)}</Text>
        <Text style={s.dealLeft}>{L("kaldı")}</Text>
      </View>
    </Pressable>
  );
}

export function NewMenuTop({
  cur,
  canContinue,
  onContinue,
  onNewCareer,
  onSettings,
  onLegends,
  onPatron,
  modes,
}: {
  cur: GameState | null;
  canContinue: boolean;
  onContinue: () => void;
  onNewCareer?: () => void;
  onSettings: () => void;
  onLegends: () => void;
  onPatron: () => void;
  modes: ModeCard[];
}) {
  const f = cur?.fighter;
  const pro = cur ? cur.stage !== 'amator' : false;
  const r = cur ? (pro ? cur.rekor : cur.amator) : null;
  const belts = cur ? (cur.kemerler ?? []).filter((b) => b.aktif).length : 0;
  const go = canContinue ? onContinue : onNewCareer;
  return (
    <View>
      {/* Üst çubuk */}
      <View style={s.top}>
        <Text style={s.brand}>YOL</Text>
        <View style={s.brandSlash} />
        <Text style={s.brandSub}>{L("KAFESTEN KEMERE")}</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onSettings} accessibilityLabel={L("Ayarlar")} hitSlop={8} style={({ pressed }) => [s.gear, pressed && { borderColor: C.gold }]}>
          <Icon name="cog" size={20} color={C.text} />
        </Pressable>
      </View>

      <LookIntro />

      <Head text={L("OYNA")} />
      {/* Kariyer kahraman kartı */}
      <Pressable onPress={go} disabled={!go} style={({ pressed }) => [s.hero, pressed && { transform: [{ scale: 0.99 }] }]}>
        <LinearGradient colors={['#d42a37', '#8f0a17', '#3a0509']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={s.heroGlow} />
        {f ? (
          <View style={s.heroAvatar}>
            <FighterAvatar look={f.gorunum} size={150} ring={belts ? C.gold : '#ffffff55'} />
          </View>
        ) : (
          <View style={s.heroGlove} pointerEvents="none"><Icon name="boxing-glove" size={120} color="#ffffff22" /></View>
        )}
        <View style={s.heroChips}>
          {r ? <Text style={s.chip}>{`${pro ? '' : L("Amatör ")}${r.g}-${r.m}-${r.b}`}</Text> : null}
          {belts ? <Text style={[s.chip, s.chipGold]}>{L("🏆 {0} KEMER", [belts])}</Text> : null}
        </View>
        <View style={s.heroText}>
          <Text style={[s.heroTitle, SLANT]}>{L("KARİYER\nMODU")}</Text>
          <View style={s.heroBar} />
          {f && canContinue ? (
            <Text style={s.heroSub} numberOfLines={2}>
              {upName(`${f.ad} ${f.soyad}`, f.uyruk)}
              {'\n'}
              {WEIGHT_CLASSES[f.siklet].ad} · {STAGE_LABELS[cur!.stage].replace(/^Aşama \d · /, '')}
            </Text>
          ) : (
            <Text style={s.heroSub}>{L("Sıfırdan UCC şampiyonluğuna. Her karar senin.")}</Text>
          )}
          {go ? (
            <View style={s.heroBtn}>
              <Text style={s.heroBtnText}>{canContinue ? L("DEVAM ET") : L("YENİ KARİYER")}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      {/* Efsane Yolları + Patron */}
      <View style={s.pair}>
        <Pressable onPress={onLegends} style={({ pressed }) => [s.pairCard, pressed && { borderColor: C.gold }]}>
          <LinearGradient colors={['#3b2a0c', '#15110a']} style={StyleSheet.absoluteFill} />
          <View style={s.pairIcon} pointerEvents="none"><Icon name="trophy-outline" size={64} color={C.gold + '55'} /></View>
          <View style={s.pairText}>
            <Text style={[s.pairTitle, SLANT]}>{L("EFSANE\nYOLLARI")}</Text>
            <View style={[s.pairBar, { backgroundColor: C.gold }]} />
            <Text style={[s.pairSub, { color: '#d8c79c' }]}>{L("Büyük kariyerleri yeniden yaz")}</Text>
          </View>
        </Pressable>
        <Pressable onPress={onPatron} style={({ pressed }) => [s.pairCard, pressed && { borderColor: C.blue }]}>
          <LinearGradient colors={['#13284f', '#0a0f1c']} style={StyleSheet.absoluteFill} />
          <View style={s.pairIcon} pointerEvents="none"><Icon name="office-building" size={64} color={C.blue + '66'} /></View>
          <Text style={s.pairNew}>{L("YENİ")}</Text>
          <View style={s.pairText}>
            <Text style={[s.pairTitle, SLANT]}>{L("PATRON\nMODU")}</Text>
            <View style={[s.pairBar, { backgroundColor: C.blue }]} />
            <Text style={[s.pairSub, { color: '#b6c8ea' }]}>{L("Kendi organizasyonunu kur")}</Text>
          </View>
        </Pressable>
      </View>

      <Head text={L("DİĞER MODLAR")} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.modes} style={{ marginHorizontal: -16 }}>
        {modes.map((m) => (
          <Pressable key={m.key} onPress={m.onPress} style={({ pressed }) => [s.mode, pressed && { borderColor: m.color }]}>
            <View style={[s.modeTop, { backgroundColor: m.color }]} />
            <View style={[s.modeBlob, { backgroundColor: m.color }]} />
            <Icon name={m.icon} size={22} color={m.color} />
            {m.badge ? <Text style={[s.modeBadge, { color: m.color, borderColor: m.color + '66' }]}>{m.badge}</Text> : null}
            <View style={{ flex: 1 }} />
            <Text style={s.modeTitle} numberOfLines={2}>
              {m.title.toLocaleUpperCase(LOC)}
            </Text>
            <Text style={s.modeSub} numberOfLines={2}>
              {m.sub}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <DealRow />
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  brand: { color: C.text, fontFamily: F.display, fontSize: 30, letterSpacing: 2 },
  brandSlash: { width: 18, height: 4, backgroundColor: C.red, transform: [{ skewX: '-20deg' }], marginTop: 6 },
  brandSub: { color: C.dim, fontFamily: F.displayMed, fontSize: 11, letterSpacing: 2, marginTop: 6 },
  gear: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 10 },
  headText: { color: C.dim, fontFamily: F.displayMed, fontSize: 12, letterSpacing: 3 },
  headLine: { flex: 1, height: 1, backgroundColor: C.border },
  hero: { height: 300, borderRadius: 6, overflow: 'hidden' },
  heroGlow: { position: 'absolute', right: -30, top: 30, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,210,120,0.08)' },
  heroAvatar: { position: 'absolute', right: 14, top: 46 },
  heroGlove: { position: 'absolute', right: 20, top: 60 },
  heroChips: { position: 'absolute', left: 16, top: 16, flexDirection: 'row', gap: 6 },
  chip: { color: C.text, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', fontFamily: F.bold, fontSize: 11, letterSpacing: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, overflow: 'hidden' },
  chipGold: { backgroundColor: C.gold, color: '#1f1605', borderColor: C.gold },
  heroText: { position: 'absolute', left: 16, bottom: 18, width: '58%', gap: 8 },
  heroTitle: { color: C.text, fontFamily: F.display, fontSize: 36, lineHeight: 38, letterSpacing: 1 },
  heroBar: { width: 34, height: 4, backgroundColor: C.text },
  heroSub: { color: '#ffd9dc', fontFamily: F.medium, fontSize: 12, lineHeight: 17 },
  heroBtn: { alignSelf: 'flex-start', backgroundColor: C.text, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 3, marginTop: 4 },
  heroBtnText: { color: C.redDeep, fontFamily: F.display, fontSize: 15, letterSpacing: 1.5 },
  pair: { flexDirection: 'row', gap: 10, marginTop: 10 },
  pairCard: { flex: 1, height: 160, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'transparent' },
  pairIcon: { position: 'absolute', right: 8, top: 10 },
  pairNew: { position: 'absolute', right: 10, top: 10, backgroundColor: C.red, color: '#fff', fontFamily: F.black, fontSize: 10, letterSpacing: 1, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3, overflow: 'hidden' },
  pairText: { position: 'absolute', left: 12, right: 12, bottom: 12, gap: 5 },
  pairTitle: { color: C.text, fontFamily: F.display, fontSize: 21, lineHeight: 22, letterSpacing: 0.5 },
  pairBar: { width: 22, height: 3 },
  pairSub: { fontFamily: F.medium, fontSize: 11 },
  modes: { gap: 10, paddingHorizontal: 16 },
  mode: { width: 136, height: 156, borderRadius: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, padding: 12, overflow: 'hidden' },
  modeTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 4 },
  modeBlob: { position: 'absolute', right: -18, top: -18, width: 90, height: 90, borderRadius: 45, opacity: 0.14 },
  modeBadge: { position: 'absolute', right: 8, top: 12, fontFamily: F.display, fontSize: 10, borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  modeTitle: { color: C.text, fontFamily: F.display, fontSize: 16, lineHeight: 18, letterSpacing: 0.5 },
  modeSub: { color: C.dim, fontFamily: F.body, fontSize: 11, lineHeight: 14, marginTop: 4 },
  deal: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 12, borderRadius: 6, borderWidth: 1, borderColor: C.goldDeep, backgroundColor: '#1d170a' },
  dealIcon: { width: 50, height: 50, borderRadius: 4, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  dealTitle: { color: C.text, fontFamily: F.display, fontSize: 16, letterSpacing: 0.5 },
  dealSub: { color: '#d8c79c', fontFamily: F.body, fontSize: 12 },
  dealTime: { color: C.gold, fontFamily: F.display, fontSize: 15 },
  dealLeft: { color: C.dim, fontFamily: F.body, fontSize: 10 },
  intro: { marginTop: 8, marginBottom: 2, padding: 12, gap: 8, borderRadius: 8, borderWidth: 1, borderColor: C.goldDeep, backgroundColor: '#15110a' },
  introTitle: { color: C.gold, fontFamily: F.display, fontSize: 16, letterSpacing: 0.5 },
  introText: { color: C.dim, fontFamily: F.body, fontSize: 12.5, lineHeight: 18 },
  introOk: { flex: 1, backgroundColor: C.gold, borderRadius: 4, paddingVertical: 10, alignItems: 'center' },
  introOkText: { color: '#1f1605', fontFamily: F.display, fontSize: 13, letterSpacing: 1 },
  introBack: { flex: 1, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardAlt, borderRadius: 4, paddingVertical: 10, alignItems: 'center' },
  introBackText: { color: C.text, fontFamily: F.display, fontSize: 13, letterSpacing: 1 },
});
