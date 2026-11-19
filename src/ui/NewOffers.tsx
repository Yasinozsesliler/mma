// Yeni görünüm: kontrat teklifleri. Her teklifin üstünde o organizasyonun arenası ve renginde metal logo plakası,
// teklifleri karşılaştıran rozetler, kabulde kısa bir imza sahnesi. Kontratı kabul eden/reddeden oyun kodu
// değişmez: bu dosya yalnızca görünümdür, düğmeler OffersScreen'in verdiği işlevleri çağırır.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { sfx } from '../audio';
import { money } from '../engine/career';
import { currentOrg, fullName } from '../engine/character';
import { ORGS } from '../engine/data';
import type { GameState, Offer, OrgId, Stage } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { lowPerf } from '../perfPref';
import { ORG_RENK } from './arena';
import { ARENA_ART, LIGHTS_ART, type ArenaTier } from './arenaArt';
import { Icon, SLANT, type IconName } from './components';
import { CoverImage } from './CoverImage';
import { C, F } from './theme';

const STAGE_TIER: Record<Stage, ArenaTier> = { amator: 0, bolgesel: 1, buyuk: 2, ufc: 3 };
const tierOf = (org: OrgId): ArenaTier => (org === 'dwcs' ? 2 : STAGE_TIER[ORGS[org].stage]);
const colorOf = (org: OrgId) => ORG_RENK[org] ?? C.red;
const shortOf = (org: OrgId) => (org === 'ufc' ? 'UCC' : ORGS[org].kisa);

/** Kemer plakası gibi metal logo plakası. */
export function OrgPlate({ org, size = 1 }: { org: OrgId; size?: number }) {
  const col = colorOf(org);
  const gold = org === 'ufc' || org === 'one';
  return (
    <LinearGradient colors={gold ? ['#fff3b0', '#c9a227', '#7a5c0e'] : ['#f1f2f5', '#9aa3ad', '#4a4f58']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[o.plate, { paddingHorizontal: 8 * size, paddingVertical: 4 * size, borderRadius: 5 * size }]}>
      <View style={[o.plateInner, { borderRadius: 3 * size, paddingHorizontal: 8 * size, paddingVertical: 3 * size }]}>
        <Text style={[o.plateText, { color: col, fontSize: 17 * size }]} numberOfLines={1}>
          {shortOf(org)}
        </Text>
      </View>
    </LinearGradient>
  );
}

type Badge = { text: string; color: string; icon: IconName };

/** Teklifleri birbirine göre etiketler: en yüksek ücret/bonus, UCC kapısı, mevcut organizasyon. */
function badgesFor(s: GameState, o: Offer, all: Offer[]): Badge[] {
  const out: Badge[] = [];
  const real = all.filter((x) => !x.devam);
  if (o.org === 'dwcs') out.push({ text: L("UCC'YE KAPI"), color: C.gold, icon: 'door-open' });
  if (o.org === 'ufc') out.push({ text: L("ZİRVE"), color: C.gold, icon: 'crown' });
  if (real.length > 1 && !o.devam) {
    const maxU = Math.max(...real.map((x) => x.ucret));
    const maxB = Math.max(...real.map((x) => x.bonus));
    if (o.ucret === maxU) out.push({ text: L("EN YÜKSEK ÜCRET"), color: C.green, icon: 'cash-multiple' });
    else if (o.bonus === maxB) out.push({ text: L("EN YÜKSEK BONUS"), color: C.green, icon: 'trophy-outline' });
  }
  if (currentOrg(s) === o.org && s.stage !== 'amator') out.push({ text: L("MEVCUT ORGANİZASYON"), color: '#9aa3b2', icon: 'home-outline' });
  return out;
}

/** Yeni görünüm teklif kartı. children: pazarlık masası ve düğmeler (OffersScreen'den). */
export function OfferCardNew({ s, o, all, children }: { s: GameState; o: Offer; all: Offer[]; children: ReactNode }) {
  const col = colorOf(o.org);
  const badges = badgesFor(s, o, all);
  return (
    <View style={[o2.card, { borderColor: col + '88' }]}>
      <View style={o2.band}>
        <CoverImage source={LIGHTS_ART[tierOf(o.org)]} iw={936} ih={468} />
        <LinearGradient colors={[col + '40', 'rgba(8,9,12,0.35)', '#0b0c10']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={[o2.edge, { backgroundColor: col }]} />
        <View style={o2.bandRow}>
          <OrgPlate org={o.org} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[o2.kicker, { color: col }]}>{o.devam ? L("MEVCUT KONTRAT") : L("KONTRAT TEKLİFİ")}</Text>
            <Text style={o2.org} numberOfLines={1} adjustsFontSizeToFit>
              {ORGS[o.org].ad.toLocaleUpperCase(LOC)}
            </Text>
          </View>
        </View>
      </View>
      <View style={o2.body}>
        {badges.length ? (
          <View style={o2.badges}>
            {badges.map((b) => (
              <View key={b.text} style={[o2.badge, { borderColor: b.color + '99', backgroundColor: b.color + '1a' }]}>
                <Icon name={b.icon} size={12} color={b.color} />
                <Text style={[o2.badgeText, { color: b.color }]}>{b.text}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={o2.note}>{o.not}</Text>
        <View style={o2.tiles}>
          <View style={o2.tile}>
            <Text style={o2.tileLabel}>{L("DÖVÜŞ")}</Text>
            <Text style={o2.tileVal}>{o.dovus}</Text>
          </View>
          <View style={[o2.tile, { borderColor: C.gold + '88', flex: 1.4 }]}>
            <Text style={[o2.tileLabel, { color: C.gold }]}>{L("MAÇ ÜCRETİ")}</Text>
            <Text style={[o2.tileVal, { color: C.gold }]} numberOfLines={1} adjustsFontSizeToFit>
              {money(o.ucret)}
            </Text>
          </View>
          <View style={[o2.tile, { flex: 1.3 }]}>
            <Text style={[o2.tileLabel, { color: C.green }]}>{L("GALİBİYET")}</Text>
            <Text style={[o2.tileVal, { color: C.green }]} numberOfLines={1} adjustsFontSizeToFit>
              +{money(o.bonus)}
            </Text>
          </View>
        </View>
        <View style={o2.terms}>
          <Icon name={o.munhasir ? 'lock' : 'lock-open-variant-outline'} size={14} color={o.munhasir ? C.orange : C.green} />
          <Text style={o2.termText}>{o.munhasir ? L("Münhasır: kontrat boyunca yalnızca bu organizasyonda dövüşürsün.") : L("Münhasır değil: başka organizasyonların tekliflerine açık kalırsın.")}</Text>
        </View>
        {o.ozel ? (
          <View style={o2.terms}>
            <Icon name="file-sign" size={14} color={o.fesih ? C.red : C.gold} />
            <Text style={[o2.termText, { color: o.fesih ? '#ffb3b8' : '#f3dc9a' }]}>{o.ozel}</Text>
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
}

/** İmza anı: kontrat kâğıdı, el yazısıyla imza, organizasyon renginde mühür ve flaşlar. Dokununca ya da kendiliğinden kapanır. */
export function SigningMoment({ s, o, onDone }: { s: GameState; o: Offer; onDone: () => void }) {
  const col = colorOf(o.org);
  const low = lowPerf();
  const [paper] = useState(() => new Animated.Value(0));
  const [ink] = useState(() => new Animated.Value(0));
  const [stamp] = useState(() => new Animated.Value(0));
  const [flash] = useState(() => new Animated.Value(0));
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };
  useEffect(() => {
    sfx('swell', 0.5);
    Animated.sequence([
      Animated.timing(paper, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ink, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.parallel([
        Animated.spring(stamp, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
        Animated.sequence([Animated.timing(flash, { toValue: 1, duration: 90, useNativeDriver: true }), Animated.timing(flash, { toValue: 0, duration: 420, useNativeDriver: true })]),
      ]),
    ]).start();
    const t1 = setTimeout(() => {
      sfx('bell');
      buzz('basari');
    }, 1350);
    const t2 = setTimeout(finish, 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sigLen = 520;
  const dash = ink.interpolate({ inputRange: [0, 1], outputRange: [sigLen, 0] });
  return (
    <Modal transparent animationType="fade" onRequestClose={finish}>
      <Pressable style={o3.back} onPress={finish}>
        <CoverImage source={ARENA_ART[tierOf(o.org)]} iw={1170} ih={1560} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4,4,6,0.72)' }]} />
        <LinearGradient colors={[col + '55', 'transparent']} locations={[0, 0.6]} style={StyleSheet.absoluteFill} />
        <Text style={[o3.kicker, { color: col }]}>{L("KONTRAT")}</Text>
        <Animated.View style={[o3.paper, { opacity: paper, transform: [{ translateY: paper.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }, { rotate: '-2deg' }] }]}>
          <View style={o3.paperHead}>
            <OrgPlate org={o.org} size={0.9} />
            <Text style={o3.paperTitle} numberOfLines={1} adjustsFontSizeToFit>
              {L("PROFESYONEL DÖVÜŞ KONTRATI")}
            </Text>
          </View>
          <View style={[o3.rule, { backgroundColor: col }]} />
          {[
            [L("Dövüşçü"), fullName(s.fighter)],
            [L("Organizasyon"), ORGS[o.org].ad],
            [L("Süre"), L("{0} dövüş", [o.dovus])],
            [L("Maç ücreti"), money(o.ucret)],
            [L("Galibiyet bonusu"), `+${money(o.bonus)}`],
          ].map(([k, v]) => (
            <View key={k} style={o3.line}>
              <Text style={o3.lineKey}>{k}</Text>
              <Text style={o3.lineVal} numberOfLines={1}>
                {v}
              </Text>
            </View>
          ))}
          <View style={o3.sigArea}>
            <Svg width={160} height={50} viewBox="0 0 230 70">
              <AnimatedPath
                d="M8 48 C 22 10, 34 66, 48 34 S 70 8, 82 40 S 104 62, 116 30 C 124 12, 138 16, 134 40 S 158 58, 170 32 S 196 20, 222 36"
                stroke="#14213d"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={`${sigLen} ${sigLen}`}
                strokeDashoffset={dash}
              />
            </Svg>
            <View style={o3.sigLine} />
            <Text style={o3.sigLabel}>{fullName(s.fighter)}</Text>
          </View>
          <Animated.View style={[o3.stamp, { borderColor: col, opacity: stamp, transform: [{ rotate: '-14deg' }, { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) }] }]}>
            <Text style={[o3.stampText, { color: col }]}>{L("İMZALANDI")}</Text>
          </Animated.View>
        </Animated.View>
        <Animated.Text style={[o3.head, SLANT, { opacity: stamp }]} numberOfLines={2}>
          {L("{0} ile {1} dövüşlük kontrat!", [shortOf(o.org), o.dovus])}
        </Animated.Text>
        <Text style={o3.tap}>{L("Devam etmek için dokun")}</Text>
        {low ? null : <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }]} />}
      </Pressable>
    </Modal>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

const o = StyleSheet.create({
  plate: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.5)', alignSelf: 'flex-start' },
  plateInner: { backgroundColor: '#0b0b0c', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  plateText: { fontFamily: F.display, fontStyle: 'italic', letterSpacing: 1 },
});

const o2 = StyleSheet.create({
  card: { borderWidth: 1.2, borderRadius: 6, overflow: 'hidden', marginBottom: 14, backgroundColor: '#0b0c10' },
  band: { height: 96, justifyContent: 'flex-end' },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingBottom: 10 },
  kicker: { fontFamily: F.black, fontSize: 9.5, letterSpacing: 1.6, textShadowColor: '#000', textShadowRadius: 4 },
  org: { color: '#fff', fontFamily: F.display, fontSize: 22, letterSpacing: 0.5, textShadowColor: '#000', textShadowRadius: 6 },
  body: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontFamily: F.black, fontSize: 10, letterSpacing: 1 },
  note: { color: C.dim, fontFamily: F.body, fontSize: 12.5, lineHeight: 17 },
  tiles: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  tile: { flex: 1, borderWidth: 1, borderColor: '#2a2d34', backgroundColor: 'rgba(4,4,5,0.55)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 7, gap: 2 },
  tileLabel: { color: '#8b919c', fontFamily: F.black, fontSize: 9, letterSpacing: 1.2 },
  tileVal: { color: C.text, fontFamily: F.display, fontSize: 18 },
  terms: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginBottom: 6 },
  termText: { flex: 1, color: '#c3c8d1', fontFamily: F.semi, fontSize: 12, lineHeight: 16 },
});

const o3 = StyleSheet.create({
  back: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: '#050506' },
  kicker: { fontFamily: F.display, fontSize: 14, letterSpacing: 4, marginBottom: 14 },
  paper: { width: '100%', maxWidth: 360, backgroundColor: '#f4efe3', borderRadius: 4, padding: 18, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 18, elevation: 12 },
  paperHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paperTitle: { flex: 1, color: '#14161c', fontFamily: F.display, fontSize: 15, letterSpacing: 1 },
  rule: { height: 3, marginVertical: 12 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#d8d0bd' },
  lineKey: { color: '#6b6457', fontFamily: F.semi, fontSize: 12 },
  lineVal: { flexShrink: 1, color: '#14161c', fontFamily: F.bold, fontSize: 13 },
  sigArea: { marginTop: 10, alignItems: 'flex-start' },
  sigLine: { width: 180, height: 1, backgroundColor: '#8a8272', marginTop: -6 },
  sigLabel: { color: '#6b6457', fontFamily: F.semi, fontSize: 10, marginTop: 3 },
  stamp: { position: 'absolute', right: 14, bottom: 22, borderWidth: 3, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(244,239,227,0.6)' },
  stampText: { fontFamily: F.display, fontSize: 22, letterSpacing: 2 },
  head: { color: '#fff', fontFamily: F.display, fontSize: 24, textAlign: 'center', marginTop: 22, textShadowColor: '#000', textShadowRadius: 8 },
  tap: { color: '#9aa3b2', fontFamily: F.semi, fontSize: 12, marginTop: 14 },
});
