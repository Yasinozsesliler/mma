// Yeni görünüm: rakip seçimi ve dövüş teklifi. Klasik görünümde hiç çizilmez.
// Seçili rakip arena sahnesinde tam boy; isim levhası, ölçüler, "Eğilimler" kutusu ve karşılaştırma.
// Kabul / seçim / reddetme mevcut motor fonksiyonlarıyla yapılır (pickOpponent, rejectImposed); kurallar aynı.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { pickOpponent, rejectImposed } from '../engine/career';
import { currentOrg, statAverage } from '../engine/character';
import { BACKGROUNDS, ORGS, WEIGHT_CLASSES } from '../engine/data';
import { HABITS } from '../engine/habits';
import { describeOpponent, oppRecord } from '../engine/opponents';
import { lookFor, physique } from '../engine/tale';
import type { GameState, Opponent } from '../engine/types';
import { cityPin } from '../engine/worldMap';
import { L, LOC } from '../i18n';
import { CoachTip } from './CoachTip';
import { Compare } from './Compare';
import { Button, Icon, Screen, SLANT, upName } from './components';
import type { Act } from './GameScreens';
import { flagOf, Standing } from './NewCareer';
import type { Kit } from './rig';
import { C, F } from './theme';

const TONE = (o: Opponent) => (o.zorluk === 1 ? C.red : o.zorluk === -1 ? C.green : C.gold);
const O_KIT: Kit = { shorts: '#1c4fc4', trim: '#f1f2f5', glove: '#1c4fc4' };

/** Rakip hakkında okunabilir eğilimler: risk, güçlü/zayıf yan, tarz ve öğrenilmiş huylar. */
function tendencies(o: Opponent): { k: string; t: string; c: string }[] {
  const d = describeOpponent(o);
  const out: { k: string; t: string; c: string }[] = [];
  if (o.riskMetni) out.push({ k: L("RİSK"), t: o.riskMetni, c: TONE(o) });
  out.push({ k: L("GÜÇLÜ YANI"), t: d.guclu, c: C.green });
  out.push({ k: L("ZAYIF YANI"), t: d.zayif, c: C.red });
  out.push({ k: L("TARZ"), t: `${d.stil} · ${o.kisilik}`, c: C.blue });
  for (const h of o.huyBilinen ?? []) out.push({ k: L("HUY"), t: `${HABITS[h].ad()}. ${HABITS[h].ipucu()}`, c: C.orange });
  return out;
}

export function NewOpponentScreen({ s, act }: { s: GameState; act: Act }) {
  const list = s.pending.secenekler!;
  const imposed = !!s.pending.dayatma;
  const [i, setI] = useState(imposed ? 0 : Math.min(1, list.length - 1));
  const [ti, setTi] = useState(0);
  const o = list[i] ?? list[0];
  const org = ORGS[currentOrg(s)];
  const f = s.fighter;
  const myOvr = Math.round(statAverage(f.stats));
  const d = describeOpponent(o);
  const ph = physique(o.id, f.siklet);
  const yas = 22 + (o.id.charCodeAt(0) % 14);
  const tend = tendencies(o);
  const tc = tend[Math.min(ti, tend.length - 1)];
  const city = o.sehir ? cityPin(s, o.sehir) : undefined;
  const title = s.sampiyon ? L("ÜNVAN SAVUNMASI") : o.champion ? L("ÜNVAN MAÇI") : imposed ? L("DÖVÜŞ TEKLİFİ") : L("SIRADAKİ DÖVÜŞ");
  const select = (n: number) => {
    setI(n);
    setTi(0);
  };
  const footer = imposed ? (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 1.3 }}>
        <Button label={L("Reddet (popülerlik -3)")} tone="ghost" onPress={() => act(rejectImposed)} />
      </View>
      <View style={{ flex: 2 }}>
        <Button label={L("Kabul et")} icon="handshake" tone="gold" onPress={() => act((x) => pickOpponent(x, 0))} />
      </View>
    </View>
  ) : (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Button label={L("Geri")} tone="ghost" onPress={() => act((x) => { x.pending = {}; x.phase = 'hub'; })} />
      </View>
      <View style={{ flex: 2 }}>
        <Button label={L("Bu rakibi seç")} icon="sword-cross" tone="gold" onPress={() => act((x) => pickOpponent(x, i))} />
      </View>
    </View>
  );
  return (
    <Screen footer={footer}>
      {/* Üst */}
      <View style={n.top}>
        <Text style={n.org}>{org.kisa}</Text>
        <View style={{ flex: 1 }}>
          <Text style={n.title}>{title}</Text>
          <Text style={n.sub} numberOfLines={1}>
            {imposed ? L("Matchmaker telefonda") : L("Kiminle dövüşeceksin?")} · {WEIGHT_CLASSES[f.siklet].ad.toLocaleUpperCase(LOC)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={n.meLabel}>{L("SEN")}</Text>
          <Text style={n.meVal}>{myOvr}</Text>
        </View>
      </View>
      {imposed ? null : <CoachTip s={s} act={act} id="rakip" />}

      {/* Seçenekler */}
      {list.length > 1 ? (
        <View style={n.opts}>
          {list.map((x, k) => (
            <Pressable key={x.id} onPress={() => select(k)} style={({ pressed }) => [n.opt, k === i && { borderColor: TONE(x), backgroundColor: TONE(x) + '1a' }, pressed && { opacity: 0.8 }]}>
              <Text style={[n.optKicker, { color: TONE(x) }]} numberOfLines={1}>
                {(x.etiket ?? '').replace(/^\S+\s/, '').toLocaleUpperCase(LOC) || `#${k + 1}`}
              </Text>
              <Text style={[n.optName, k === i && { color: C.text }]} numberOfLines={1}>
                {upName(x.soyad, x.uyruk)}
              </Text>
              <Text style={n.optPow}>{L("GÜÇ")} {Math.round(statAverage(x.stats))}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Bilgi şeridi */}
      <View style={n.info}>
        <View>
          <Text style={[n.infoLabel, { color: C.red }]}>{L("GÜÇ")}</Text>
          <Text style={[n.infoVal, { color: d.guc > myOvr ? C.red : d.guc < myOvr ? C.green : C.text }]}>{d.guc}</Text>
        </View>
        <View>
          <Text style={[n.infoLabel, { color: C.gold }]}>{L("KARNE")}</Text>
          <Text style={n.infoVal}>{oppRecord(o)}</Text>
        </View>
        {o.macHafta ? (
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={[n.infoLabel, { color: C.green }]}>{L("MAÇ")}</Text>
            <Text style={n.infoVal} numberOfLines={1}>
              {L("{0} HAFTA", [o.macHafta])}
            </Text>
            {city ? <Text style={n.infoCity}>📍 {city.ad}</Text> : null}
          </View>
        ) : null}
      </View>

      {/* Arena sahnesi */}
      <View style={n.stage}>
        <LinearGradient colors={['#3a2e14', '#120f08', '#040405']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['transparent', '#5a0a1288', '#2a0509']} locations={[0.5, 0.85, 1]} style={StyleSheet.absoluteFill} />
        <View style={n.figure} pointerEvents="none">
          <Standing look={lookFor(o)} kit={O_KIT} h={300} flip />
        </View>
        {o.champion ? (
          <View style={n.belt}>
            <View style={n.beltPlate}>
              <Text style={n.beltText}>{org.kisa}</Text>
            </View>
          </View>
        ) : null}
        {o.rivalry >= 3 ? <Text style={n.rival}>{L("EZELİ RAKİP")}</Text> : o.rivalry >= 1 ? <Text style={[n.rival, { backgroundColor: C.orange }]}>{L("TANIDIK YÜZ")}</Text> : null}
        <View style={n.plate}>
          <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
            <View style={n.rankBox}>
              <Text style={n.rank}>{o.champion ? 'C' : o.rank ? `${o.rank}` : o.ligSira ? `${o.ligSira}` : '–'}</Text>
            </View>
            <View style={n.nameBox}>
              {o.lakap ? <Text style={n.nick}>“{o.lakap.toLocaleUpperCase(LOC)}”</Text> : null}
              <Text style={[n.name, SLANT]} numberOfLines={1} adjustsFontSizeToFit>
                {upName(`${o.ad} ${o.soyad}`, o.uyruk)}
              </Text>
              <Text style={n.country} numberOfLines={1}>
                {flagOf(o.uyruk)} {o.uyruk.toLocaleUpperCase(LOC)} · {BACKGROUNDS[o.stil].ad.toLocaleUpperCase(LOC)}
              </Text>
            </View>
          </View>
          <Text style={n.phys}>{L("Yaş {0} · Boy {1} · Uzanma {2}", [yas, ph.boy, ph.uzanma])}</Text>
        </View>
      </View>

      {/* Eğilimler */}
      <View style={n.tend}>
        <View style={n.tendHead}>
          <Pressable accessibilityLabel={L("Önceki")} hitSlop={8} onPress={() => setTi((ti - 1 + tend.length) % tend.length)} style={n.arrow}>
            <Icon name="chevron-left" size={24} color={C.text} />
          </Pressable>
          <Text style={n.tendTitle}>
            {L("EĞİLİMLER")} · {Math.min(ti, tend.length - 1) + 1}/{tend.length}
          </Text>
          <Pressable accessibilityLabel={L("Sonraki")} hitSlop={8} onPress={() => setTi((ti + 1) % tend.length)} style={[n.arrow, { alignItems: 'flex-end' }]}>
            <Icon name="chevron-right" size={24} color={C.text} />
          </Pressable>
        </View>
        <Text style={[n.tendKind, { color: tc.c }]}>{tc.k}</Text>
        <Text style={n.tendText}>{tc.t}</Text>
      </View>

      {o.evren ? <Text style={[n.warn, { color: C.blue }]}>{L("🌐 YOL Evreni: Menajer Modu'ndaki dövüşçün!")}</Text> : null}
      <View style={n.compare}>
        <Compare me={f.stats} opp={o.stats} />
      </View>
      {imposed && s.reddedilen > 0 ? (
        <Text style={n.warn}>
          {L("⚠️ Bu")} {s.reddedilen + 1}
          {L(". reddedişin olur. Üçüncüde kontratın feshedilir.")}
        </Text>
      ) : null}
    </Screen>
  );
}

const n = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  org: { minWidth: 44, backgroundColor: C.gold, color: '#1f1605', fontFamily: F.display, fontSize: 13, textAlign: 'center', paddingHorizontal: 6, paddingVertical: 10, overflow: 'hidden' },
  title: { color: C.gold, fontFamily: F.display, fontSize: 18, letterSpacing: 1.5 },
  sub: { color: '#c3c8d1', fontFamily: F.bold, fontSize: 11, letterSpacing: 1.2 },
  meLabel: { color: '#8b919c', fontFamily: F.bold, fontSize: 9, letterSpacing: 1.2 },
  meVal: { color: C.text, fontFamily: F.display, fontSize: 20 },
  opts: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  opt: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 4, padding: 8, gap: 1 },
  optKicker: { fontFamily: F.black, fontSize: 9, letterSpacing: 1 },
  optName: { color: C.dim, fontFamily: F.display, fontSize: 14 },
  optPow: { color: '#8b919c', fontFamily: F.bold, fontSize: 10 },
  info: { flexDirection: 'row', gap: 18, marginBottom: 10 },
  infoLabel: { fontFamily: F.black, fontSize: 9.5, letterSpacing: 1.5 },
  infoVal: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 28 },
  infoCity: { color: C.dim, fontFamily: F.semi, fontSize: 11 },
  stage: { height: 360, overflow: 'hidden', borderRadius: 4, marginBottom: 10 },
  figure: { position: 'absolute', left: '50%', marginLeft: -120, bottom: 20 },
  belt: { position: 'absolute', right: 14, top: 120, width: 84, height: 84, borderRadius: 42, backgroundColor: '#c8902e', borderWidth: 3, borderColor: '#ffe7a6', alignItems: 'center', justifyContent: 'center', shadowColor: C.gold, shadowOpacity: 0.6, shadowRadius: 20 },
  beltPlate: { width: 58, height: 36, backgroundColor: '#111317', borderWidth: 2, borderColor: '#ffe7a6', alignItems: 'center', justifyContent: 'center' },
  beltText: { color: C.gold, fontFamily: F.display, fontSize: 14, letterSpacing: 1 },
  rival: { position: 'absolute', left: 12, top: 12, backgroundColor: C.red, color: '#fff', fontFamily: F.black, fontSize: 10, letterSpacing: 1.2, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' },
  plate: { position: 'absolute', left: 0, bottom: 16, gap: 4, maxWidth: '88%' },
  rankBox: { backgroundColor: C.red, paddingHorizontal: 10, justifyContent: 'center' },
  rank: { color: '#fff', fontFamily: F.display, fontSize: 22 },
  nameBox: { backgroundColor: C.text, paddingLeft: 10, paddingRight: 18, paddingVertical: 4, flexShrink: 1 },
  nick: { color: C.red, fontFamily: F.black, fontSize: 9, letterSpacing: 1.2 },
  name: { color: '#040405', fontFamily: F.display, fontSize: 20, lineHeight: 24 },
  country: { color: '#1c4fc4', fontFamily: F.black, fontSize: 9.5, letterSpacing: 1.2 },
  phys: { alignSelf: 'flex-start', backgroundColor: 'rgba(4,4,5,0.85)', color: '#c3c8d1', fontFamily: F.body, fontSize: 10.5, paddingHorizontal: 10, paddingVertical: 5, letterSpacing: 0.5 },
  tend: { backgroundColor: 'rgba(10,11,14,0.94)', borderWidth: 1, borderColor: '#2a2d34', padding: 12, gap: 6, marginBottom: 10 },
  tendHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 44, height: 32, justifyContent: 'center' },
  tendTitle: { color: C.text, fontFamily: F.display, fontSize: 15, letterSpacing: 2 },
  tendKind: { fontFamily: F.black, fontSize: 10, letterSpacing: 1.5, textAlign: 'center' },
  tendText: { color: '#d6dae1', fontFamily: F.body, fontSize: 12.5, lineHeight: 19, textAlign: 'center', minHeight: 38 },
  compare: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 10, marginBottom: 8 },
  warn: { color: C.orange, fontFamily: F.semi, fontSize: 12.5, lineHeight: 18, marginBottom: 8 },
});
