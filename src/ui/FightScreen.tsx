import { L } from '../i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { finishFight } from '../engine/career';
import { currentOrg, fullName } from '../engine/character';
import { ORGS } from '../engine/data';
import { chooseTactic, methodLabel, nextRound, resolveCritical, resolveDecision } from '../engine/fight';
import { CRITICAL_OPTIONS, TACTICS } from '../engine/narration';
import { oppRecord } from '../engine/opponents';
import type { CriticalKind, FightState, GameState, Tactic } from '../engine/types';
import type { Act } from './GameScreens';
import { CageView } from './CageView';
import { lookFor } from '../engine/tale';
import { Bar, Button, Card, Choice, Icon, P, Screen, Section, upName, type IconName } from './components';
import { C, F, G, R } from './theme';

const TACTIC_ICONS: Record<Tactic, IconName> = {
  baski: 'boxing-glove',
  kontra: 'shield-sword',
  takedown: 'arrow-collapse-down',
  clinch: 'hand-back-right',
  mesafe: 'arrow-expand-horizontal',
};

const CRIT_ICONS: Record<CriticalKind, IconName[]> = {
  rakipSersem: ['fire', 'target', 'arrow-collapse-down'],
  sarsildin: ['hand-back-right', 'run-fast', 'lightning-bolt'],
  subFirsat: ['lock', 'shield-check'],
  subTehlike: ['meditation', 'flash', 'hand-wave'],
};

function Corner({ side, name, sub }: { side: 'red' | 'blue'; name: string; sub: string }) {
  return (
    <LinearGradient
      colors={side === 'red' ? G.red : G.blue}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[sb.corner, side === 'red' ? { borderTopLeftRadius: R, borderBottomLeftRadius: R } : { borderTopRightRadius: R, borderBottomRightRadius: R }]}
    >
      <Text style={[sb.cornerSub, side === 'blue' && { textAlign: 'right' }]}>{sub}</Text>
      <Text style={[sb.cornerName, side === 'blue' && { textAlign: 'right' }, name.length > 11 && { fontSize: 15, lineHeight: 18 }]} numberOfLines={2}>
        {name}
      </Text>
    </LinearGradient>
  );
}

function Scoreboard({ fs, org, pUyruk }: { fs: FightState; org: string; pUyruk: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={sb.row}>
        <Corner side="red" name={upName(fs.pAd, pUyruk)} sub={L("KIRMIZI KÖŞE")} />
        <View style={sb.center}>
          <Text style={sb.org}>{org}</Text>
          <Text style={sb.round}>{fs.durum === 'bitti' ? L('SON') : `R${fs.raunt}`}</Text>
          <Text style={sb.org}>/ {fs.maxRaunt}</Text>
        </View>
        <Corner side="blue" name={upName(fs.oAd, fs.opp.uyruk)} sub={L("MAVİ KÖŞE")} />
      </View>
      <View style={sb.dots}>
        {Array.from({ length: fs.maxRaunt }, (_, i) => {
          const d = fs.rauntFarklari[i];
          const col = d == null ? C.border : d > 0 ? C.red : d < 0 ? C.blue : C.dim;
          return <View key={i} style={[sb.dot, { backgroundColor: col }]} />;
        })}
      </View>
      <View style={sb.bars}>
        <View style={{ flex: 1 }}>
          <Bar value={100 - fs.pHasar} color={fs.pHasar > 60 ? C.orange : C.green} label={L("Sağlık")} right={`${Math.round(100 - fs.pHasar)}`} />
          <Bar value={fs.pKondisyon} color={C.gold} label={L("Kondisyon")} right={`${Math.round(fs.pKondisyon)}`} />
          {fs.kesik ? <Text style={sb.cut}>{L("🩸 Kesik var")}</Text> : null}
        </View>
        <View style={{ width: 14 }} />
        <View style={{ flex: 1 }}>
          <Bar value={100 - fs.oHasar} color={fs.oHasar > 60 ? C.orange : C.green} label={L("Sağlık")} right={`${Math.round(100 - fs.oHasar)}`} />
          <Bar value={fs.oKondisyon} color={C.gold} label={L("Kondisyon")} right={`${Math.round(fs.oKondisyon)}`} />
        </View>
      </View>
    </View>
  );
}

/** Maç akışı: en yeni olay en üstte (Football Manager tarzı yorum akışı). */
function Feed({ fs, shown }: { fs: FightState; shown: number }) {
  const lines = fs.log.slice(0, shown);
  return (
    <Card>
      {lines
        .map((l, i) => ({ l, i }))
        .reverse()
        .map(({ l, i }, k) => {
          if (l.startsWith('—')) {
            return (
              <View key={i} style={sb.roundChip}>
                <Text style={sb.roundChipText}>{l.replace(/—/g, '').trim()}</Text>
              </View>
            );
          }
          const decision = l.startsWith('➤');
          const oppMove = l.startsWith('🔄');
          const who = decision ? C.gold : oppMove ? C.blue : l.includes(fs.pAd) ? C.red : l.includes(fs.oAd) ? C.blue : C.faint;
          return (
            <View key={i} style={[sb.feedRow, k === 0 && sb.feedNew]}>
              <View style={[sb.feedDot, { backgroundColor: who }]} />
              <Text style={[sb.feedText, k === 0 && { color: C.text, fontFamily: F.semi }, decision && { color: C.gold }]}>{l}</Text>
            </View>
          );
        })}
    </Card>
  );
}

function Pulse({ children }: { children: ReactNode }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(a, { toValue: 0, duration: 700, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  const borderColor = a.interpolate({ inputRange: [0, 1], outputRange: [C.goldDeep, C.gold] });
  return <Animated.View style={[sb.crit, { borderColor }]}>{children}</Animated.View>;
}

/** Raundun kimde olduğunu gösteren kontrol çubuğu. */
function Momentum({ fs, shown, logLen }: { fs: FightState; shown: number; logLen: number }) {
  const dk = Math.min(5, fs.vurusSira);
  const total = fs.pPuan + fs.oPuan;
  const p = total > 0 ? fs.pPuan / total : 0.5;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[sb.momLabel, { color: C.red }]}>{L("KONTROL")}</Text>
        <Text style={sb.momLabel}>
          {fs.durum === 'bitti' && shown >= logLen ? L("MAÇ BİTTİ") : L("{0}. RAUNT · {1}:00", [fs.raunt, dk])}
        </Text>
        <Text style={[sb.momLabel, { color: C.blue }]}>{L("KONTROL")}</Text>
      </View>
      <View style={sb.momBar}>
        <View style={{ flex: Math.max(0.02, p), backgroundColor: C.red }} />
        <View style={{ width: 2, backgroundColor: '#fff' }} />
        <View style={{ flex: Math.max(0.02, 1 - p), backgroundColor: C.blue }} />
      </View>
    </View>
  );
}

function Flowing({ speed, setSpeed, onSkip }: { speed: number; setSpeed: (n: number) => void; onSkip: () => void }) {
  const a = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 1, duration: 500, useNativeDriver: true }), Animated.timing(a, { toValue: 0.4, duration: 500, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [a]);
  return (
    <View style={sb.flow}>
      <Animated.View style={{ opacity: a, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={sb.liveDot} />
        <Text style={sb.flowText}>{L("MAÇ AKIYOR")}</Text>
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2].map((x) => (
          <Pressable key={x} onPress={() => setSpeed(x)} style={[sb.speed, speed === x && sb.speedOn]}>
            <Text style={[sb.speedText, speed === x && { color: '#fff' }]}>{x}x</Text>
          </Pressable>
        ))}
        <Pressable onPress={onSkip} style={sb.speed}>
          <Text style={sb.speedText}>{L("ATLA ⏭")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TacticList({ fs, onPick, title }: { fs: FightState; onPick: (t: Tactic) => void; title: string }) {
  const last = fs.oyuncuTaktikGecmisi?.at(-1);
  return (
    <>
      <Section>{title}</Section>
      {(Object.keys(TACTICS) as Tactic[]).map((t) => (
        <Choice
          key={t}
          icon={TACTIC_ICONS[t]}
          label={TACTICS[t].ad}
          desc={TACTICS[t].aciklama + (last === t ? L("\n⚠️ Geçen raunt bunu yaptın. Rakip bekliyor olabilir.") : '')}
          tone={last === t ? 'plain' : 'red'}
          onPress={() => onPick(t)}
        />
      ))}
    </>
  );
}

/** Akışta gösterilen son satıra karşılık gelen durum (yoksa güncel durum). */
function viewAt(fs: FightState, shown: number): FightState {
  if (shown >= fs.log.length || !fs.anlar?.length) return fs;
  const past = fs.anlar.filter((a) => a.i <= shown);
  const a = past[past.length - 1] ?? fs.anlar[0];
  return { ...fs, pPuan: a.pP, oPuan: a.oP, pHasar: a.pH, oHasar: a.oH, pKondisyon: a.pK, oKondisyon: a.oK, vurusSira: a.dk };
}

export function FightScreen({ s, act }: { s: GameState; act: Act }) {
  const fs = s.pending.dovus!;
  const setFs = (fn: (f: typeof fs) => typeof fs) => act((x) => (x.pending.dovus = fn(x.pending.dovus!)));
  const fresh = fs.raunt === 1 && fs.log.length === 0;
  const org = ORGS[currentOrg(s)].kisa + (fs.unvanMaci ? L(" · ÜNVAN") : fs.anaMac ? L(" · ANA MAÇ") : '');

  // Olaylar tek tek akar; kullanıcı hız seçebilir ya da atlayabilir.
  const [shown, setShown] = useState(fs.log.length);
  const [speed, setSpeed] = useState(1);
  const roundRef = useRef(fs.raunt);
  useEffect(() => {
    if (fs.raunt !== roundRef.current || fs.log.length < shown) {
      roundRef.current = fs.raunt;
      setShown(0);
    }
  }, [fs.raunt, fs.log.length, shown]);
  useEffect(() => {
    if (shown >= fs.log.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), 1100 / speed);
    return () => clearTimeout(t);
  }, [shown, fs.log.length, speed]);
  const flowing = shown < fs.log.length;
  const view = viewAt(fs, shown);

  let footer = null;
  if (!flowing && fs.durum === 'rauntSonu')
    footer = <Button label={L("Aynı planla {0}. raunda çık", [fs.raunt + 1])} icon="bell-ring" onPress={() => setFs((f) => nextRound(f, f.taktik ?? 'mesafe'))} />;
  if (!flowing && fs.durum === 'bitti') footer = <Button label={L("Dövüş sonrası")} tone="gold" icon="microphone-variant" onPress={() => act(finishFight)} />;

  return (
    <Screen footer={footer}>
      <Scoreboard fs={view} org={org} pUyruk={s.fighter.uyruk} />
      <CageView fs={fs} shown={shown} speed={speed} pLook={s.fighter.gorunum} oLook={lookFor(fs.opp)} />
      {!fresh ? <Momentum fs={view} shown={shown} logLen={fs.log.length} /> : null}

      {fresh ? (
        <Card>
          <View style={sb.faceoff}>
            <View style={{ flex: 1 }}>
              <Text style={[sb.foName, { color: C.red }]}>{upName(fullName(s.fighter), s.fighter.uyruk)}</Text>
              <Text style={sb.foRec}>
                {s.rekor.g}-{s.rekor.m}-{s.rekor.b}
              </Text>
            </View>
            <Text style={sb.vs}>VS</Text>
            <View style={{ flex: 1 }}>
              <Text style={[sb.foName, { color: C.blue, textAlign: 'right' }]}>
                {upName(`${fs.opp.ad} “${fs.opp.lakap}” ${fs.opp.soyad}`, fs.opp.uyruk)}
              </Text>
              <Text style={[sb.foRec, { textAlign: 'right' }]}>{oppRecord(fs.opp)}</Text>
            </View>
          </View>
          <P dim>{L("Işıklar kararıyor. Spiker mikrofonu kaldırıyor, salon uğulduyor. Kafes kapısı kapanıyor ve hakem ikinizin arasına giriyor.")}</P>
          <P style={{ fontFamily: F.semi }}>{L("“Kurallar belli. Kendinizi koruyun. Dövüşün!”")}</P>
        </Card>
      ) : null}

      {flowing ? <Flowing speed={speed} setSpeed={setSpeed} onSkip={() => setShown(fs.log.length)} /> : null}

      {!flowing && fs.durum === 'taktik' && <TacticList fs={fs} title={L("OYUN PLANIN: MAÇA NASIL BAŞLAYACAKSIN?")} onPick={(t) => setFs((f) => chooseTactic(f, t))} />}

      {!flowing && fs.durum === 'karar' && fs.karar && (
        <>
          <Pulse>
            <Text style={sb.critKicker}>{L("⏸ KARAR ANI")}</Text>
            <Text style={sb.critText}>{fs.karar.metin}</Text>
          </Pulse>
          {fs.karar.secenekler.map((o, i) => (
            <Choice key={i} n={i + 1} label={o.ad} desc={o.aciklama} tone="gold" onPress={() => setFs((f) => resolveDecision(f, i))} />
          ))}
        </>
      )}

      {!flowing && fs.durum === 'kritik' && fs.kritik && (
        <>
          <Pulse>
            <Text style={sb.critKicker}>{L("⚡ KRİTİK AN")}</Text>
            <Text style={sb.critText}>{fs.kritikMetni}</Text>
          </Pulse>
          <Section>{L("HIZLI KARAR!")}</Section>
          {CRITICAL_OPTIONS[fs.kritik].map((o, i) => (
            <Choice key={i} icon={CRIT_ICONS[fs.kritik!][i]} label={o.ad} desc={o.aciklama} tone="gold" onPress={() => setFs((f) => resolveCritical(f, i))} />
          ))}
        </>
      )}

      {!flowing && fs.durum === 'rauntSonu' && fs.kose && (
        <>
          <Section>{L("KÖŞE · 60 SANİYE")}</Section>
          <Card accent={C.gold}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Icon name="whistle" size={18} color={C.gold} />
              <Text style={{ color: C.gold, fontFamily: F.display, fontSize: 15, letterSpacing: 1 }}>{s.takim.antrenor.toUpperCase()}</Text>
            </View>
            {fs.kose.split('\n').map((l, i) => (
              <P key={i}>{l}</P>
            ))}
          </Card>
          <TacticList fs={fs} title={L("{0}. RAUNT İÇİN PLANI DEĞİŞTİR", [fs.raunt + 1])} onPick={(t) => setFs((f) => nextRound(f, t))} />
        </>
      )}

      {!flowing && fs.durum === 'bitti' && fs.sonuc && (
        <LinearGradient
          colors={fs.sonuc.kazanan === 'p' ? ['#1f6b3f', '#0f2a1b'] : fs.sonuc.kazanan === 'o' ? ['#7a1420', '#2a0b10'] : ['#7a5a14', '#2a200b']}
          style={sb.result}
        >
          <Text style={sb.resultKicker}>{methodLabel(fs.sonuc.yontem).toUpperCase()} {L("· R")}{fs.sonuc.raunt} {fs.sonuc.sure}</Text>
          <Text style={sb.resultTitle}>
            {fs.sonuc.kazanan === 'p' ? L("KAZANDIN") : fs.sonuc.kazanan === 'o' ? L("KAYBETTİN") : L("BERABERE")}
          </Text>
          {fs.sonuc.kartlar ? <Text style={sb.resultCards}>{L("Hakem kartları:")}{' '}{fs.sonuc.kartlar}</Text> : null}
        </LinearGradient>
      )}

      {!fresh && shown > 0 ? <Feed fs={fs} shown={shown} /> : null}
    </Screen>
  );
}

const sb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  corner: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, justifyContent: 'center' },
  cornerSub: { color: 'rgba(255,255,255,0.7)', fontFamily: F.display, fontSize: 9, letterSpacing: 1.5 },
  cornerName: { color: '#fff', fontFamily: F.display, fontSize: 19 },
  center: { width: 70, backgroundColor: '#050608', alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border },
  org: { color: C.faint, fontFamily: F.display, fontSize: 9, letterSpacing: 1 },
  round: { color: C.gold, fontFamily: F.display, fontSize: 26, lineHeight: 30 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot: { width: 22, height: 5, borderRadius: 3 },
  bars: { flexDirection: 'row', marginTop: 8 },
  cut: { color: C.red, fontFamily: F.semi, fontSize: 11, marginTop: 2 },
  roundChip: { alignSelf: 'flex-start', backgroundColor: C.gold + '1f', borderColor: C.gold + '66', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10 },
  roundChipText: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  feedRow: { flexDirection: 'row', gap: 10, marginBottom: 9 },
  feedNew: { backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: -8, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  momLabel: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.2, marginBottom: 3 },
  momBar: { flexDirection: 'row', height: 8, borderRadius: 2, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  flow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, marginBottom: 10 },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.red },
  flowText: { color: C.text, fontFamily: F.display, fontSize: 13, letterSpacing: 1.5 },
  speed: { borderWidth: 1, borderColor: C.border, borderRadius: 3, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: C.cardAlt },
  speedOn: { backgroundColor: C.red, borderColor: C.red },
  speedText: { color: C.dim, fontFamily: F.display, fontSize: 12, letterSpacing: 0.5 },
  feedDot: { width: 7, height: 7, borderRadius: 4, marginTop: 8 },
  feedText: { flex: 1, color: C.dim, fontFamily: F.body, fontSize: 15, lineHeight: 22 },
  crit: { borderWidth: 2, borderRadius: R, padding: 14, backgroundColor: '#1c1708', marginBottom: 6 },
  critKicker: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 2, marginBottom: 4 },
  critText: { color: C.text, fontFamily: F.bold, fontSize: 17, lineHeight: 24 },
  faceoff: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  foName: { fontFamily: F.display, fontSize: 18, lineHeight: 22 },
  foRec: { color: C.dim, fontFamily: F.semi, fontSize: 12, marginTop: 2 },
  vs: { color: C.gold, fontFamily: F.display, fontSize: 28 },
  result: { borderRadius: R, padding: 20, alignItems: 'center', marginTop: 4 },
  resultKicker: { color: 'rgba(255,255,255,0.75)', fontFamily: F.display, fontSize: 13, letterSpacing: 1.5 },
  resultTitle: { color: '#fff', fontFamily: F.display, fontSize: 44, letterSpacing: 2 },
  resultCards: { color: 'rgba(255,255,255,0.75)', fontFamily: F.body, fontSize: 13 },
});
