// Yeni görünüm: rakip seçimi ve dövüş teklifi. Klasik görünümde hiç çizilmez.
// Seçili rakip arena sahnesinde tam boy; isim levhası, ölçüler, "Eğilimler" kutusu ve karşılaştırma.
// Kabul / seçim / reddetme mevcut motor fonksiyonlarıyla yapılır (pickOpponent, rejectImposed); kurallar aynı.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { pickOpponent, rejectImposed } from '../engine/career';
import { statAverage } from '../engine/character';
import { BACKGROUNDS, WEIGHT_CLASSES } from '../engine/data';
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
import { arenaOrgText, flagOf, orgShort, Standing } from './NewCareer';
import { ArenaBackdrop } from './ArenaBackdrop';
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


/** Bölge yıldızı: iki özelliğin ortalaması, 5 üzerinden. */
const zone = (o: Opponent, a: keyof Opponent['stats'], b: keyof Opponent['stats']) => Math.round(((o.stats[a] + o.stats[b]) / 2 / 20) * 2) / 2;

function MiniStars({ n: v }: { n: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {Array.from({ length: 5 }, (_, k) => (
        <Icon key={k} name={v - k >= 1 ? 'star' : v - k >= 0.5 ? 'star-half-full' : 'star'} size={10} color={v - k >= 0.5 ? C.text : '#3a3d44'} />
      ))}
    </View>
  );
}

/** Seçenek kartı: zorluk şeridi, gövde portresi, isim, güç ve bölge yıldızları. */
function OppCard({ o, on, mine, onPress }: { o: Opponent; on: boolean; mine: number; onPress: () => void }) {
  const tone = TONE(o);
  const pow = Math.round(statAverage(o.stats));
  const label = (o.etiket ?? '').replace(/^\S+\s/, '').toLocaleUpperCase(LOC);
  return (
    <Pressable onPress={onPress} accessibilityLabel={`${o.ad} ${o.soyad}`} style={({ pressed }) => [n.card, on && n.cardOn, pressed && { opacity: 0.85 }]}>
      <LinearGradient colors={on ? ['#3a0d16', '#14080b'] : ['#1a1c22', '#0c0d10']} style={StyleSheet.absoluteFill} />
      <View style={[n.cardTop, { backgroundColor: tone }]}>
        <Text style={n.cardTopText} numberOfLines={1}>
          {label || L("RAKİP")}
        </Text>
      </View>
      <View style={n.portrait} pointerEvents="none">
        <View style={{ position: 'absolute', left: -14, top: 8 }}>
          <Standing look={lookFor(o)} kit={O_KIT} h={190} flip />
        </View>
        <LinearGradient colors={['transparent', on ? '#14080b' : '#0c0d10']} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
        <View style={[n.pow, { borderColor: pow > mine ? C.red : pow < mine ? C.green : C.gold }]}>
          <Text style={[n.powVal, { color: pow > mine ? C.red : pow < mine ? C.green : C.gold }]}>{pow}</Text>
        </View>
        {o.champion ? <Text style={n.champ}>👑</Text> : null}
      </View>
      <View style={n.cardBody}>
        <Text style={n.cardName} numberOfLines={1} adjustsFontSizeToFit>
          {upName(o.soyad, o.uyruk)}
        </Text>
        <Text style={n.cardSub} numberOfLines={1}>
          {flagOf(o.uyruk)} {oppRecord(o)}
          {o.rank ? ` · #${o.rank}` : ''}
        </Text>
        <View style={n.zones}>
          {[
            [L("AYAKTA"), zone(o, 'vurus', 'hiz')],
            [L("GÜREŞ"), zone(o, 'gures', 'yer')],
            [L("DAYANIKLILIK"), zone(o, 'kondisyon', 'cene')],
          ].map(([ad, v]) => (
            <View key={ad as string} style={n.zone}>
              <Text style={n.zoneLabel} numberOfLines={1}>
                {ad as string}
              </Text>
              <MiniStars n={v as number} />
            </View>
          ))}
        </View>
      </View>
      {on ? (
        <View style={n.selBar}>
          <Text style={n.selText}>{L("SEÇİLİ")}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function NewOpponentScreen({ s, act }: { s: GameState; act: Act }) {
  const list = s.pending.secenekler!;
  const imposed = !!s.pending.dayatma;
  const [i, setI] = useState(imposed ? 0 : Math.min(1, list.length - 1));
  const [ti, setTi] = useState(0);
  const o = list[i] ?? list[0];
  const f = s.fighter;
  const myOvr = Math.round(statAverage(f.stats));
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
      {/* Üst: başlık ve durum rozetleri */}
      <View style={n.top}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={n.kicker} numberOfLines={1}>
            {imposed ? L("Matchmaker telefonda") : L("Kiminle dövüşeceksin?")}
          </Text>
          <Text style={[n.title, SLANT]} numberOfLines={1} adjustsFontSizeToFit>
            {title}
          </Text>
          <View style={n.chips}>
            <Text style={n.org}>{orgShort(s)}</Text>
            <View style={n.chip}>
              <Text style={n.chipLabel}>{L("SIKLET")}</Text>
              <Text style={n.chipVal}>{WEIGHT_CLASSES[f.siklet].ad.toLocaleUpperCase(LOC)}</Text>
            </View>
            {s.sampiyon || s.rank ? (
              <View style={n.chip}>
                <Text style={n.chipLabel}>{s.sampiyon ? L("SAVUNMA") : L("SIRALAMA")}</Text>
                <Text style={[n.chipVal, s.sampiyon && { color: C.gold }]}>{s.sampiyon ? s.savunma : `#${s.rank}`}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={n.me}>
          <Text style={n.meLabel}>{L("SENİN GÜCÜN")}</Text>
          <Text style={n.meVal}>{myOvr}</Text>
        </View>
      </View>
      {imposed ? null : <CoachTip s={s} act={act} id="rakip" />}

      {/* Rakip kartları */}
      {list.length > 1 ? (
        <View style={n.cards}>
          {list.map((x, k) => (
            <OppCard key={x.id} o={x} on={k === i} mine={myOvr} onPress={() => select(k)} />
          ))}
        </View>
      ) : null}

      {/* Arena sahnesi */}
      <View style={n.stage}>
        <LinearGradient colors={['#3a2e14', '#120f08', '#040405']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <ArenaBackdrop {...arenaOrgText(s)} dim={0.15} />
        <LinearGradient colors={['rgba(58,46,20,0.35)', 'transparent', 'rgba(42,5,9,0.55)']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={n.figure} pointerEvents="none">
          <Standing look={lookFor(o)} kit={O_KIT} h={300} flip />
        </View>
        {o.champion ? (
          <View style={n.belt}>
            <View style={n.beltPlate}>
              <Text style={n.beltText}>{orgShort(s)}</Text>
            </View>
          </View>
        ) : null}
        {o.macHafta ? (
          <View style={n.date}>
            <Text style={n.dateLabel}>{L("MAÇ")}</Text>
            <Text style={n.dateVal}>{L("{0} HAFTA", [o.macHafta])}</Text>
            {city ? <Text style={n.dateCity}>📍 {city.ad}</Text> : null}
            <Text style={[n.dateLabel, { marginTop: 6 }]}>{L("KARNE")}</Text>
            <Text style={n.dateVal}>{oppRecord(o)}</Text>
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
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  kicker: { color: '#8b919c', fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.5 },
  title: { color: C.text, fontFamily: F.display, fontSize: 28, lineHeight: 32, letterSpacing: 1 },
  chips: { flexDirection: 'row', gap: 6, alignItems: 'stretch' },
  org: { backgroundColor: C.gold, color: '#1f1605', fontFamily: F.display, fontSize: 13, paddingHorizontal: 8, paddingVertical: 5, overflow: 'hidden', alignSelf: 'stretch', textAlignVertical: 'center' },
  chip: { borderWidth: 1, borderColor: '#2a2d34', backgroundColor: '#0c0d10', paddingHorizontal: 8, paddingVertical: 3 },
  chipLabel: { color: '#8b919c', fontFamily: F.black, fontSize: 8.5, letterSpacing: 1.2 },
  chipVal: { color: C.text, fontFamily: F.display, fontSize: 13 },
  me: { alignItems: 'center', borderWidth: 1, borderColor: '#2a2d34', backgroundColor: '#0c0d10', paddingHorizontal: 10, paddingVertical: 6 },
  meLabel: { color: '#8b919c', fontFamily: F.black, fontSize: 8.5, letterSpacing: 1.2 },
  meVal: { color: C.text, fontFamily: F.display, fontSize: 26, lineHeight: 30 },
  cards: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  card: { flex: 1, minWidth: 0, height: 280, borderWidth: 1, borderColor: '#2a2d34', borderRadius: 4, overflow: 'hidden' },
  cardOn: { borderWidth: 2, borderColor: '#ff3d6e', shadowColor: '#ff3d6e', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  cardTop: { height: 20, justifyContent: 'center', paddingHorizontal: 6 },
  cardTopText: { color: '#040405', fontFamily: F.black, fontSize: 9, letterSpacing: 1.2 },
  portrait: { height: 112, overflow: 'hidden' },
  pow: { position: 'absolute', right: 5, top: 5, minWidth: 30, paddingHorizontal: 4, paddingVertical: 1, borderWidth: 1.5, borderRadius: 3, backgroundColor: 'rgba(4,4,5,0.85)', alignItems: 'center' },
  powVal: { fontFamily: F.display, fontSize: 15 },
  champ: { position: 'absolute', left: 6, top: 4, fontSize: 16 },
  cardBody: { paddingHorizontal: 7, paddingTop: 4, gap: 2 },
  cardName: { color: C.text, fontFamily: F.display, fontSize: 15, letterSpacing: 0.5 },
  cardSub: { color: C.dim, fontFamily: F.semi, fontSize: 10 },
  zones: { gap: 3, marginTop: 4 },
  zone: { gap: 1 },
  zoneLabel: { color: '#8b919c', fontFamily: F.black, fontSize: 7.5, letterSpacing: 1 },
  selBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#ff3d6e', paddingVertical: 2, alignItems: 'center' },
  selText: { color: '#fff', fontFamily: F.black, fontSize: 9, letterSpacing: 1.5 },
  date: { position: 'absolute', right: 12, top: 12, alignItems: 'flex-end' },
  dateLabel: { color: '#8b919c', fontFamily: F.black, fontSize: 9, letterSpacing: 1.5 },
  dateVal: { color: C.text, fontFamily: F.display, fontSize: 20, lineHeight: 24 },
  dateCity: { color: C.dim, fontFamily: F.semi, fontSize: 11 },
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
