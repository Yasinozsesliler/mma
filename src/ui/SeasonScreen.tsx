// Sezon Kemeri: bu ayın 20 basamaklı ödül yolu. Ücretsiz sırada 4, Şampiyon sırasında 6 kozmetik; oynadıkça puan.
import { claimWeeklyTask, seasonBadges, weeklyTasks } from '../season';
import type { GorevKind } from '../engine/season';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { cosmeticById, RARITY, rarityOf } from '../engine/cosmetics';
import { SEASON_TIERS, SEASON_XP, seasonDaysLeft, seasonName, seasonRewards, seasonTheme, TIER_XP, tierOf } from '../engine/season';
import type { Appearance } from '../engine/types';
import { L, LOC } from '../i18n';
import { PURCHASES, usePremium } from '../monetization';
import { canClaim, claimableCount, claimAll, claimReward, useSeason } from '../season';
import { Button, Icon, Screen, SLANT } from './components';
import { DEFAULT_LOOK } from './FighterAvatar';
import { Swatch } from './LockerScreen';
import { BuyPremium } from './PremiumCard';
import { C, F } from './theme';
import { useLook } from '../lookPref';
import { CoverImage } from './CoverImage';
import { SCENE_ART } from './sceneArt';

const GOREV_METIN: Record<GorevKind, (n: number) => string> = {
  mac: (n) => L("{0} maç yap", [n]),
  galibiyet: (n) => L("{0} galibiyet al", [n]),
  bitiris: (n) => L("{0} maçı bitirişle kazan", [n]),
  gunluk: (n) => L("{0} kez Günün Dövüşü oyna", [n]),
  hayali: (n) => L("{0} Hayalî Maç tahmin et", [n]),
};

const useProTrack = () => {
  const premium = usePremium();
  return premium || !PURCHASES;
};

export function SeasonScreen({ look, onExit }: { look?: Appearance; onExit: () => void }) {
  const yeni = useLook() === 'yeni';
  const s = useSeason();
  const pro = useProTrack();
  const premium = usePremium();
  const t = seasonTheme(s.idx);
  const tier = tierOf(s.xp);
  const into = s.xp - tier * TIER_XP;
  const n = claimableCount(s, pro);
  const rewards = seasonRewards(s.idx);
  return (
    <Screen
      footer={
        n > 1 ? (
          <Button
            label={L("Hepsini al ({0})", [n])}
            icon="gift"
            tone="gold"
            onPress={() => {
              claimAll(pro);
              sfx('chime');
            }}
          />
        ) : (
          <Button label={L("Menüye dön")} icon="arrow-left" tone="ghost" onPress={onExit} />
        )
      }
    >
      <LinearGradient colors={[t.a, '#0c0d10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.hero, { borderColor: t.b + '88' }, yeni && { overflow: 'hidden' }]}>
        {yeni ? (
          <>
            <CoverImage source={SCENE_ART.altin.src} iw={SCENE_ART.altin.w} ih={SCENE_ART.altin.h} align="center" opacity={0.8} />
            <LinearGradient colors={[t.a + '99', 'rgba(12,13,16,0.82)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
          </>
        ) : null}
        <Text style={[st.kicker, { color: t.c }]}>{L("SEZON {0} · {1} GÜN KALDI", [s.idx, seasonDaysLeft()])}</Text>
        <Text style={[st.title, SLANT]}>{seasonName(s.idx).toLocaleUpperCase(LOC)}</Text>
        <View style={st.tierRow}>
          <Text style={[st.tierBig, { color: t.c }]}>{tier}</Text>
          <Text style={st.tierAll}>/{SEASON_TIERS}</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={st.bar}>
              <View style={[st.fill, { width: `${tier >= SEASON_TIERS ? 100 : Math.round((into / TIER_XP) * 100)}%`, backgroundColor: t.b }]} />
            </View>
            <Text style={st.barText}>{tier >= SEASON_TIERS ? L("Sezon tamamlandı!") : L("Sonraki basamak: {0}/{1} puan", [into, TIER_XP])}</Text>
          </View>
        </View>
        <Text style={st.how}>
          {L("Puan: maç +{0}, galibiyet +{1}, bitiriş +{2}, Günün Dövüşü +{3}, Hayalî Maç +{4}, efsane bölümü +{5}", [SEASON_XP.mac, SEASON_XP.galibiyet, SEASON_XP.bitiris, SEASON_XP.gunluk, SEASON_XP.hayali, SEASON_XP.bolum])}
        </Text>
      </LinearGradient>

      <View style={st.weekly}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={st.weeklyTitle}>{L("BU HAFTANIN GÖREVLERİ")}</Text>
          <Text style={st.weeklyNote}>{L("Her biri +{0} puan", [SEASON_XP.gorev])}</Text>
        </View>
        {weeklyTasks(s).map((g) => (
          <View key={g.i} style={st.task}>
            <Text style={[st.taskText, g.alindi && { color: C.faint, textDecorationLine: 'line-through' }]} numberOfLines={2}>
              {GOREV_METIN[g.k](g.n)} · {g.say}/{g.n}
            </Text>
            {g.alindi ? (
              <Icon name="check-circle" size={20} color={C.green} />
            ) : g.say >= g.n ? (
              <Pressable
                onPress={() => {
                  claimWeeklyTask(g.i);
                  sfx('chime');
                }}
                style={st.claim}
              >
                <Text style={st.claimText}>{L("AL")}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {seasonBadges().length ? <Text style={st.weeklyNote}>{L("🏅 Sezon Şampiyonu rozetlerin: {0}", [seasonBadges().length])}</Text> : <Text style={st.weeklyNote}>{L("20. basamağı bitiren kalıcı Sezon Şampiyonu rozeti kazanır.")}</Text>}
      </View>

      {PURCHASES && !premium ? (
        <LinearGradient colors={['#2a1d05', '#0c0d10']} style={st.pro}>
          <Text style={st.proTitle}>{L("👑 ŞAMPİYON SIRASI")}</Text>
          <Text style={st.proText}>{L("Şampiyon Paketi ile her sezon 6 ödül daha: efsanevi sezon şortu, kemer, giriş efekti… Ulaştığın basamakların ödülleri hemen açılır.")}</Text>
          <BuyPremium />
        </LinearGradient>
      ) : null}

      {rewards.map((r) => {
        const x = cosmeticById(r.id)!;
        const got = s.alinan.includes(r.id);
        const ok = canClaim(s, r, pro);
        const reached = tier >= r.basamak;
        const col = RARITY[rarityOf(x)].renk;
        return (
          <View key={r.id} style={[st.row, { borderColor: got ? C.green + '66' : reached ? col + '88' : C.border }, !reached && { opacity: 0.7 }]}>
            <View style={[st.step, reached && { backgroundColor: t.b, borderColor: t.b }]}>
              <Text style={[st.stepText, reached && { color: '#111' }]}>{r.basamak}</Text>
            </View>
            <View style={st.swatch}>
              <Swatch x={x} look={look ?? DEFAULT_LOOK} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[st.track, { color: r.pro ? C.gold : C.dim }]}>{r.pro ? L("👑 ŞAMPİYON") : L("ÜCRETSİZ")}</Text>
              <Text style={st.name} numberOfLines={2}>
                {x.ad}
              </Text>
              <Text style={[st.rarity, { color: col }]}>{RARITY[rarityOf(x)].ad()}</Text>
            </View>
            {got ? (
              <Icon name="check-circle" size={24} color={C.green} />
            ) : ok ? (
              <Pressable
                onPress={() => {
                  claimReward(r, pro);
                  sfx('chime');
                }}
                style={st.claim}
              >
                <Text style={st.claimText}>{L("AL")}</Text>
              </Pressable>
            ) : r.pro && !pro ? (
              <Text style={st.lock}>👑</Text>
            ) : (
              <Icon name="lock-outline" size={20} color={C.faint} />
            )}
          </View>
        );
      })}
      <Text style={st.foot}>{L("Her ay yeni sezon, yeni tema. Sezon bitince alınmayan ödüller kaybolur; aldıkların dolabında kalır.")}</Text>
    </Screen>
  );
}

/** Ana menüde Sezon Kemeri afişi. */
export function SeasonBanner({ onPress }: { onPress: () => void }) {
  const s = useSeason();
  const pro = useProTrack();
  const t = seasonTheme(s.idx);
  const tier = tierOf(s.xp);
  const n = claimableCount(s, pro);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.banner, { borderColor: t.b + '88' }, pressed && { transform: [{ scale: 0.99 }] }]}>
      <LinearGradient colors={[t.a, '#0c0d10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.bannerIn}>
        <View style={[st.bIcon, { borderColor: t.b + '88', backgroundColor: t.b + '22' }]}>
          <Icon name="trophy-variant" size={26} color={t.c} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[st.bTitle, SLANT]}>{L("Sezon Kemeri").toLocaleUpperCase(LOC)}</Text>
          <Text style={st.bSub} numberOfLines={1}>
            {L("Sezon {0}: {1} · {2} gün kaldı", [s.idx, seasonName(s.idx), seasonDaysLeft()])}
          </Text>
          <View style={st.bBar}>
            <View style={[st.fill, { width: `${Math.round((tier / SEASON_TIERS) * 100)}%`, backgroundColor: t.b }]} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {n ? <Text style={st.bBadge}>{L("🎁 {0}", [n])}</Text> : null}
          <Text style={[st.bTier, { color: t.c }]}>
            {tier}
            <Text style={st.tierAll}>/{SEASON_TIERS}</Text>
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const st = StyleSheet.create({
  weekly: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, gap: 8, marginBottom: 10 },
  weeklyTitle: { color: C.gold, fontFamily: F.display, fontSize: 13, letterSpacing: 1 },
  weeklyNote: { color: C.dim, fontFamily: F.body, fontSize: 11.5 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  taskText: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 13 },
  hero: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  kicker: { fontFamily: F.semi, fontSize: 11, letterSpacing: 1.5 },
  title: { color: C.text, fontFamily: F.display, fontSize: 26, marginTop: 4 },
  tierRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  tierBig: { fontFamily: F.display, fontSize: 40 },
  tierAll: { color: C.faint, fontFamily: F.display, fontSize: 16 },
  bar: { height: 8, borderRadius: 4, backgroundColor: '#ffffff18', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  barText: { color: C.dim, fontFamily: F.semi, fontSize: 11, marginTop: 4 },
  how: { color: C.dim, fontFamily: F.body, fontSize: 11.5, lineHeight: 16, marginTop: 10 },
  pro: { borderRadius: 14, borderWidth: 1, borderColor: C.gold + '66', padding: 14, marginBottom: 12, gap: 8 },
  proTitle: { color: C.gold, fontFamily: F.display, fontSize: 14, letterSpacing: 1 },
  proText: { color: C.text, fontFamily: F.body, fontSize: 12.5, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 8, marginBottom: 8, backgroundColor: C.card },
  step: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: C.dim, fontFamily: F.display, fontSize: 13 },
  swatch: { width: 72, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  track: { fontFamily: F.semi, fontSize: 9.5, letterSpacing: 1 },
  name: { color: C.text, fontFamily: F.bold, fontSize: 13, marginTop: 1 },
  rarity: { fontFamily: F.semi, fontSize: 10.5, marginTop: 1 },
  claim: { backgroundColor: C.gold, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  claimText: { color: '#1f1605', fontFamily: F.bold, fontSize: 12 },
  lock: { fontSize: 18 },
  foot: { color: C.faint, fontFamily: F.body, fontSize: 11.5, textAlign: 'center', marginTop: 6 },
  banner: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  bannerIn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  bIcon: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bTitle: { color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: 0.6 },
  bSub: { color: C.dim, fontFamily: F.body, fontSize: 11, marginTop: 1 },
  bBar: { height: 5, borderRadius: 3, backgroundColor: '#ffffff18', overflow: 'hidden', marginTop: 7 },
  bBadge: { color: '#111', backgroundColor: C.gold, fontFamily: F.bold, fontSize: 11, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden', marginBottom: 2 },
  bTier: { fontFamily: F.display, fontSize: 22 },
});
