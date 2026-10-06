// Dövüş gecesi: kafese yürümeden önce kulis (afiş, önceki maçların akan sonuçları, ekipten son sözler) ve
// maç sonunda gecenin geri kalanı ile "Gecenin Performansı" yarışı.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Ellipse, Polygon, RadialGradient, LinearGradient as SvgLinear, Stop } from 'react-native-svg';
import { sfx } from '../audio';
import { ORGS, WEIGHT_CLASSES } from '../engine/data';
import { SLOT_LABEL } from '../engine/fightNight';
import { coachLine } from '../engine/coachBond';
import { methodLabel } from '../engine/fight';
import type { FightNight, GameState, NightBout } from '../engine/types';
import { L, LOC } from '../i18n';
import { Button, Icon, Section } from './components';
import { C, F, R } from './theme';

const short = (n: string) => {
  const p = n.split(' ');
  return p.length > 1 ? `${p[0][0]}. ${p.slice(1).join(' ')}` : n;
};

function BoutRow({ b, shown, dim }: { b: NightBout; shown: boolean; dim?: boolean }) {
  const win = (i: 0 | 1) => shown && b.kazanan === i;
  return (
    <View style={[fn.row, dim && { opacity: 0.55 }]}>
      <Text style={[fn.name, win(0) && fn.winner, shown && b.kazanan === 1 && fn.loser]} numberOfLines={1}>
        {short(b.a)}
      </Text>
      <View style={fn.mid}>
        {shown ? (
          <Text style={fn.res}>
            {methodLabel(b.yontem).toLocaleUpperCase(LOC)} · R{b.raunt}
          </Text>
        ) : (
          <Text style={fn.wc}>{WEIGHT_CLASSES[b.siklet].ad.toLocaleUpperCase(LOC)}</Text>
        )}
      </View>
      <Text style={[fn.name, { textAlign: 'right' }, win(1) && fn.winner, shown && b.kazanan === 0 && fn.loser]} numberOfLines={1}>
        {short(b.b)}
      </Text>
    </View>
  );
}

function Spot({ w }: { w: number }) {
  return (
    <Svg width={w} height={230} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <SvgLinear id="fnBeam" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffe3a3" stopOpacity={0.32} />
          <Stop offset="1" stopColor="#ffe3a3" stopOpacity={0} />
        </SvgLinear>
        <RadialGradient id="fnGlow" cx="50%" cy="100%" r="60%">
          <Stop offset="0" stopColor={C.red} stopOpacity={0.35} />
          <Stop offset="1" stopColor={C.red} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={w / 2} cy={230} rx={w * 0.7} ry={120} fill="url(#fnGlow)" />
      <Polygon points={`${w * 0.42},0 ${w * 0.58},0 ${w * 0.85},230 ${w * 0.15},230`} fill="url(#fnBeam)" />
    </Svg>
  );
}

/** Kulis: kafese yürümeden önceki gece. */
export function FightNightIntro({ s, onDone }: { s: GameState; onDone: () => void }) {
  const g = s.pending.gece!;
  const opp = s.pending.dovus!.opp;
  const { width: W } = useWindowDimensions();
  const [n, setN] = useState(0);
  const bitti = n >= g.once.length;
  useEffect(() => {
    sfx('swell', 0.35);
  }, []);
  useEffect(() => {
    if (bitti) return;
    const t = setTimeout(() => setN((x) => x + 1), n === 0 ? 900 : 650);
    return () => clearTimeout(t);
  }, [n, bitti]);
  // Kart ana maçtan aşağı doğru listelenir (afiş düzeni).
  const toplam = g.once.length + 1 + g.sonra.length;
  const anaKartBas = Math.max(0, toplam - 5);
  const satirlar: { i: number; b?: NightBout }[] = [];
  for (let i = toplam - 1; i >= 0; i--) {
    if (i < g.once.length) satirlar.push({ i, b: g.once[i] });
    else if (i === g.once.length) satirlar.push({ i });
    else satirlar.push({ i, b: g.sonra[i - g.once.length - 1] });
  }
  const kulis = [
    L("Eller sarıldı, eldivenler hakemin imzasıyla mühürlendi."),
    coachLine(s),
    L("Koridordan bir görevli sesleniyor: “Hazırlan, sıradaki sizsiniz!”"),
  ];
  return (
    <Modal transparent animationType="fade" onRequestClose={onDone}>
      <View style={fn.back}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          <View style={fn.hero}>
            <Spot w={W - 32} />
            <Text style={fn.kicker}>{L("DÖVÜŞ GECESİ")}</Text>
            <Text style={[fn.title, { fontSize: g.ad.length > 16 ? 28 : g.ad.length > 11 ? 34 : 42 }]} numberOfLines={1} adjustsFontSizeToFit>
              {g.ad.toLocaleUpperCase(LOC)}
            </Text>
            <Text style={fn.meta}>
              {[g.sehir, L("{0} seyirci", [g.seyirci.toLocaleString(LOC)])].filter(Boolean).join(' · ')}
            </Text>
            <View style={fn.slot}>
              <Icon name="star-four-points" size={13} color="#111" />
              <Text style={fn.slotText}>{SLOT_LABEL[g.konum]}</Text>
            </View>
          </View>

          <View style={fn.card}>
            {satirlar.map(({ i, b }) => (
              <View key={i}>
                {i === toplam - 1 ? <Text style={fn.group}>{anaKartBas > 0 ? L("ANA KART") : L("GECENİN KARTI")}</Text> : null}
                {anaKartBas > 0 && i === anaKartBas - 1 ? <Text style={fn.group}>{L("ÖN ELEMELER")}</Text> : null}
                {b ? (
                  <BoutRow b={b} shown={i < n} dim={i >= g.once.length} />
                ) : (
                  <LinearGradient colors={['#3a0d12', '#1a0a0d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[fn.row, fn.me]}>
                    <Text style={[fn.name, { color: '#fff' }]} numberOfLines={1}>
                      {short(`${s.fighter.ad} ${s.fighter.soyad}`)}
                    </Text>
                    <View style={fn.mid}>
                      <Text style={[fn.res, { color: bitti ? C.gold : C.faint }]}>{bitti ? L("SIRA SENDE") : L("SEN")}</Text>
                    </View>
                    <Text style={[fn.name, { color: '#fff', textAlign: 'right' }]} numberOfLines={1}>
                      {short(`${opp.ad} ${opp.soyad}`)}
                    </Text>
                  </LinearGradient>
                )}
              </View>
            ))}
          </View>

          <View style={fn.backstage}>
            <Text style={fn.bsHead}>{L("KULİS")}</Text>
            {kulis.slice(0, bitti ? 3 : Math.min(2, 1 + Math.floor(n / 2))).map((t) => (
              <View key={t} style={fn.bsRow}>
                <View style={fn.bsDot} />
                <Text style={fn.bsText}>{t}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={fn.foot}>
          <Button label={bitti ? L("KAFESE YÜRÜ") : L("Sonuçları geç")} tone={bitti ? 'gold' : 'ghost'} icon={bitti ? 'walk' : 'fast-forward'} onPress={() => (bitti ? onDone() : setN(g.once.length))} />
        </View>
      </View>
    </Modal>
  );
}

/** Maç sonu: gecenin geri kalanı ve bonus yarışı. */
export function NightResults({ s }: { s: GameState }) {
  const g: FightNight | undefined = s.pending.gece;
  const [acik, setAcik] = useState(false);
  if (!g) return null;
  const org = ORGS[s.pending.sonrasi?.ozet?.org ?? 'amator'];
  const y = g.yaris;
  const yarisVar = !!y && org.performansBonusu > 0 && s.pending.sonrasi?.kazandi;
  const list = acik ? g.sonra : g.sonra.slice(-3);
  return (
    <>
      <Section>{L("GECENİN KARTI")}</Section>
      {yarisVar && y ? (
        <LinearGradient colors={y.kazandi ? ['#2a2108', '#121014'] : ['#17181d', '#0e0f12']} style={[fn.race, y.kazandi && { borderColor: C.gold }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="star-circle" size={18} color={y.kazandi ? C.gold : C.faint} />
            <Text style={fn.raceTitle}>{L("GECENİN PERFORMANSI")}</Text>
          </View>
          {y.benim > 0 ? (
            <>
              <RaceBar label={L("Sen")} sub="" v={y.benim} top={Math.max(y.benim, y.adayPuan)} gold={y.kazandi} />
              <RaceBar label={short(y.aday)} sub={y.adayYontem} v={y.adayPuan} top={Math.max(y.benim, y.adayPuan)} gold={!y.kazandi} />
            </>
          ) : null}
          <Text style={fn.raceVerdict}>
            {y.kazandi
              ? L("Bonus senin! Gecenin en etkileyici bitirişi sendeydi.")
              : y.benim > 0
                ? L("Bonus {0} adlı dövüşçüye gitti. Daha erken ve net bir bitiriş gerekiyordu.", [y.aday])
                : L("Bonus {0} adlı dövüşçüye gitti. Bonus yarışına yalnızca bitirişler girer.", [y.aday])}
          </Text>
        </LinearGradient>
      ) : null}
      {g.sonra.length ? (
        <View style={fn.panel}>
          <Text style={fn.panelHead}>{L("SENDEN SONRA")}</Text>
          {list.map((b, i) => (
            <BoutRow key={i} b={b} shown />
          ))}
          {g.sonra.length > 3 ? (
            <Pressable onPress={() => setAcik((v) => !v)} style={fn.more}>
              <Text style={fn.moreText}>{acik ? L("Daha az göster") : L("Tümünü göster (+{0})", [g.sonra.length - 3])}</Text>
              <Icon name={acik ? 'chevron-up' : 'chevron-down'} size={16} color={C.dim} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

function RaceBar({ label, sub, v, top, gold }: { label: string; sub: string; v: number; top: number; gold: boolean }) {
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={fn.barLabel} numberOfLines={1}>
          {label}
          {sub ? <Text style={fn.barSub}>{`  ${sub}`}</Text> : null}
        </Text>
        <Text style={[fn.barVal, gold && { color: C.gold }]}>{v}</Text>
      </View>
      <View style={fn.track}>
        <View style={[fn.fill, { width: `${Math.max(6, (v / Math.max(1, top)) * 100)}%`, backgroundColor: gold ? C.gold : '#4a4d57' }]} />
      </View>
    </View>
  );
}

const fn = StyleSheet.create({
  back: { flex: 1, backgroundColor: '#07080a' },
  hero: { height: 190, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 14, marginBottom: 10, overflow: 'hidden', borderRadius: R },
  kicker: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 4 },
  title: { color: '#fff', fontFamily: F.display, fontSize: 42, letterSpacing: 1, marginTop: 2, transform: [{ skewX: '-8deg' }], textShadowColor: '#000', textShadowRadius: 12 },
  meta: { color: C.dim, fontFamily: F.semi, fontSize: 13, marginTop: 2 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.gold, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 3, marginTop: 10, transform: [{ skewX: '-8deg' }] },
  slotText: { color: '#111', fontFamily: F.display, fontSize: 12, letterSpacing: 1.5 },
  card: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 6 },
  group: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 2, marginTop: 8, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 6, borderRadius: 6 },
  me: { borderWidth: 1, borderColor: C.red, marginVertical: 3 },
  name: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13 },
  winner: { color: '#fff', fontFamily: F.bold },
  loser: { color: C.faint, textDecorationLine: 'line-through' },
  mid: { width: 104, alignItems: 'center' },
  res: { color: C.gold, fontFamily: F.display, fontSize: 11, letterSpacing: 0.5 },
  wc: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
  backstage: { marginTop: 12, backgroundColor: '#0f1014', borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, gap: 8 },
  bsHead: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 3 },
  bsRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bsDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.red, marginTop: 7 },
  bsText: { flex: 1, color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  foot: { padding: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: '#07080a' },
  race: { borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10 },
  raceTitle: { color: C.text, fontFamily: F.display, fontSize: 14, letterSpacing: 1.5 },
  raceVerdict: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 18, marginTop: 10 },
  barLabel: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13 },
  barSub: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  barVal: { color: C.dim, fontFamily: F.display, fontSize: 14 },
  track: { height: 6, backgroundColor: '#22242b', borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  panel: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 12 },
  panelHead: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 2, marginTop: 4, marginBottom: 2, marginLeft: 6 },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  moreText: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
});
