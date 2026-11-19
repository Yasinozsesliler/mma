// Yeni görünüm: kamp ekranlarının ortak parçaları. Klasik görünümde hiç çizilmez; yalnızca okur.
// Aşama şeridi (Plan / Kamp / Tartı), iki portreli eşleşme kartı, haftalık takvim ve canlı kamp satırı.
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { siteById } from '../engine/gyms';
import { statAverage } from '../engine/character';
import { describeOpponent } from '../engine/opponents';
import { lookFor } from '../engine/tale';
import type { CampState, GameState } from '../engine/types';
import { L, LOC } from '../i18n';
import { Icon, SLANT, upName, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import { flagOf } from './NewCareer';
import { C, F } from './theme';

const STAGES: { keys: CampState['step'][]; ad: () => string; icon: IconName }[] = [
  { keys: ['hoca', 'planla', 'sure', 'yer', 'focus', 'plan', 'intensity', 'kilo', 'basin'], ad: () => L("Plan"), icon: 'clipboard-text-outline' },
  { keys: ['takvim', 'haftalik', 'basinsahne', 'duello', 'sakatlik', 'ozet'], ad: () => L("Kamp"), icon: 'dumbbell' },
  { keys: ['kesim', 'tarti', 'yuzyuze'], ad: () => L("Tartı"), icon: 'scale-bathroom' },
];

/** Aşama şeridi: geçilen kırmızı ✓, şimdiki altın ve parlak, sonraki sönük. */
export function CampStages({ k }: { k: CampState }) {
  const cur = STAGES.findIndex((x) => x.keys.includes(k.step));
  return (
    <View style={c.stages}>
      {STAGES.map((st, i) => {
        const done = i < cur;
        const on = i === cur;
        return (
          <View key={i} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <View style={[c.stage, done && c.stageDone, on && c.stageOn]}>
              <Icon name={done ? 'check-bold' : st.icon} size={13} color={on ? '#1f1605' : done ? '#fff' : '#6b7280'} />
              <Text style={[c.stageText, on && { color: '#1f1605' }, done && { color: '#fff' }]} numberOfLines={1}>
                {st.ad().toLocaleUpperCase(LOC)}
              </Text>
            </View>
            {i < STAGES.length - 1 ? <View style={[c.link, done && { backgroundColor: C.red }]} /> : null}
          </View>
        );
      })}
    </View>
  );
}

/** Eşleşme kartı: kırmızı/mavi bölünmüş zemin, iki portre, güç ve rakibin zayıf yanı. */
export function CampMatchCard({ s, kicker, right }: { s: GameState; kicker: string; right?: ReactNode }) {
  const o = s.pending.rakip!;
  const f = s.fighter;
  const d = describeOpponent(o);
  const me = Math.round(statAverage(f.stats));
  return (
    <View style={c.match}>
      <LinearGradient colors={['#6a0812', '#1a0306']} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }} style={[StyleSheet.absoluteFill, { right: '50%' }]} />
      <LinearGradient colors={['#0d2257', '#050a1a']} start={{ x: 1, y: 0 }} end={{ x: 0.5, y: 1 }} style={[StyleSheet.absoluteFill, { left: '50%' }]} />
      <View style={c.matchSlash} />
      <Text style={c.matchKicker} numberOfLines={1}>
        {kicker}
      </Text>
      <View style={c.matchRow}>
        <View style={c.side}>
          <FighterAvatar look={f.gorunum} size={54} ring={C.red} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={c.sideName} numberOfLines={1}>
              {upName(f.soyad, f.uyruk)}
            </Text>
            <Text style={c.sidePow}>
              {L("GÜÇ")} <Text style={{ color: C.text }}>{me}</Text>
            </Text>
          </View>
        </View>
        <Text style={[c.vs, SLANT]}>VS</Text>
        <View style={[c.side, { flexDirection: 'row-reverse' }]}>
          <FighterAvatar look={lookFor(o)} size={54} ring={C.blue} />
          <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
            <Text style={[c.sideName, { textAlign: 'right' }]} numberOfLines={1}>
              {upName(o.soyad, o.uyruk)}
            </Text>
            <Text style={c.sidePow}>
              {flagOf(o.uyruk)} {L("GÜÇ")} <Text style={{ color: d.guc > me ? '#ff6b7a' : d.guc < me ? C.green : C.text }}>{d.guc}</Text>
            </Text>
          </View>
        </View>
      </View>
      <View style={c.chips}>
        <View style={c.chip}>
          <Icon name="karate" size={12} color="#9fb0d4" />
          <Text style={c.chipText} numberOfLines={1}>
            {d.stil}
          </Text>
        </View>
        <View style={[c.chip, { borderColor: '#ff4d5e66' }]}>
          <Icon name="target" size={12} color="#ff6b7a" />
          <Text style={[c.chipText, { color: '#ffb3ba' }]} numberOfLines={1}>
            {L("Zayıf:")} {d.zayif}
          </Text>
        </View>
        {right}
      </View>
    </View>
  );
}

/** Maç takvimi: kalan hafta sayacı ve hafta hücreleri (serbest, kamp, maç; şimdiki hafta parlar). */
export function CampCalendarHero({ s }: { s: GameState }) {
  const k = s.pending.kamp!;
  const o = s.pending.rakip!;
  const total = k.macHafta ?? k.hafta;
  const free = total - k.hafta;
  const doneFree = k.takvimIdx ?? 0;
  const doneCamp = k.kampIdx ?? 0;
  const left = total - doneFree - doneCamp;
  const cells = Array.from({ length: total }, (_, i) => {
    const camp = i >= free;
    const done = camp ? i - free < doneCamp : i < doneFree;
    const current = !done && (camp ? i - free === doneCamp && k.step === 'haftalik' : i === doneFree && k.step === 'takvim');
    const ev = !camp && (k.olaylar ?? []).some((e) => e.idx === i);
    return { camp, done, current, ev, last: i === total - 1 };
  });
  return (
    <LinearGradient colors={['#1d0a0e', '#0c0d10']} style={c.cal}>
      <View style={c.calHead}>
        <View>
          <Text style={c.calKicker}>{L("MAÇA KALAN")}</Text>
          <Text style={[c.calBig, SLANT]}>
            {left} <Text style={c.calUnit}>{L("HAFTA")}</Text>
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
          <Text style={c.calDays}>{L("{0} gün", [left * 7])}</Text>
          <Text style={c.calOpp} numberOfLines={1}>
            vs {upName(`${o.ad} ${o.soyad}`, o.uyruk)}
          </Text>
        </View>
      </View>
      <View style={c.cells}>
        {cells.map((x, i) => {
          const icon: IconName = x.last ? 'boxing-glove' : x.camp ? 'dumbbell' : x.ev ? 'star-four-points' : 'bed-outline';
          const col = x.last ? C.gold : x.camp ? '#f08a3c' : x.ev ? '#3aa8ff' : '#6b7280';
          return (
            <View key={i} style={[c.cell, { borderColor: col + (x.done ? '55' : 'aa') }, x.done && { backgroundColor: col + '22' }, x.current && { borderColor: C.text, backgroundColor: col + '40', transform: [{ scale: 1.08 }] }, x.last && { backgroundColor: '#3a2a07' }]}>
              <Text style={[c.cellNo, x.current && { color: C.text }]}>{L("H{0}", [i + 1])}</Text>
              <Icon name={x.done && !x.last ? 'check-bold' : icon} size={14} color={x.done && !x.last ? col + 'aa' : col} />
            </View>
          );
        })}
      </View>
      <View style={c.legend}>
        {(
          [
            ['bed-outline', L("Serbest"), '#6b7280'],
            ['dumbbell', L("Kamp"), '#f08a3c'],
            ['star-four-points', L("Etkinlik"), '#3aa8ff'],
            ['boxing-glove', L("Maç"), C.gold],
          ] as const
        ).map(([ic, ad, col]) => (
          <View key={ad} style={c.legendItem}>
            <Icon name={ic} size={11} color={col} />
            <Text style={[c.legendText, { color: col }]}>{ad}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

/** Kamp akışının canlı satırı: aşama, hafta ve son gelişme; altında ilerleme. */
export function CampLiveRow({ s, kicker, text, state }: { s: GameState; kicker: string; text: string; state: 'canli' | 'karar' | 'dur' }) {
  const col = state === 'karar' ? C.gold : state === 'dur' ? C.faint : C.red;
  return (
    <LinearGradient colors={state === 'karar' ? ['#2a2210', '#0c0d10'] : ['#17130a', '#0c0d10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[c.live, { borderColor: col + '88' }]}>
      <FighterAvatar look={s.fighter.gorunum} size={50} ring={col} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {state === 'canli' ? <View style={c.dot} /> : null}
          <Text style={[c.liveKicker, { color: col }]}>{kicker}</Text>
        </View>
        <Text style={c.liveText} numberOfLines={3}>
          {text}
        </Text>
      </View>
      {state === 'karar' ? <Icon name="gesture-tap" size={22} color={C.gold} /> : null}
    </LinearGradient>
  );
}

/** Karar kartı: renk bandı, ikonlu başlık, metin ve seçenekler. */
export function CampDecision({ kicker, renk, ikon, metin, children }: { kicker: string; renk: string; ikon: IconName; metin: string; children: ReactNode }) {
  return (
    <View style={[c.dec, { borderColor: renk + '99' }]}>
      <LinearGradient colors={[renk + '30', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={c.decBand}>
        <View style={[c.decIcon, { borderColor: renk, backgroundColor: renk + '26' }]}>
          <Icon name={ikon} size={16} color={renk} />
        </View>
        <Text style={[c.decKicker, { color: renk }]}>{kicker}</Text>
      </LinearGradient>
      <View style={{ padding: 12, paddingTop: 4, gap: 10 }}>
        <Text style={c.decText}>{metin}</Text>
        {children}
      </View>
    </View>
  );
}

/** Kamp yerine göre çizilmiş başlık bandı (scripts/camp-art.html). Bilinmeyen yer için kendi salonu. */
const CAMP_ART: Record<string, number> = {
  salon: require('../../assets/art/camp_salon.jpg'),
  ev: require('../../assets/art/camp_ev.jpg'),
  tayland: require('../../assets/art/camp_tayland.jpg'),
  dagistan: require('../../assets/art/camp_dagistan.jpg'),
  brezilya: require('../../assets/art/camp_brezilya.jpg'),
  irtifa: require('../../assets/art/camp_irtifa.jpg'),
  elit: require('../../assets/art/camp_elit.jpg'),
};

export function CampSiteBand({ k }: { k: CampState }) {
  const site = siteById(k.yer ?? 'salon');
  return (
    <View style={c.band}>
      <Image source={CAMP_ART[site.id] ?? CAMP_ART.salon} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={['rgba(5,5,7,0.75)', 'rgba(5,5,7,0.15)']} start={{ x: 0, y: 0 }} end={{ x: 0.75, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={c.bandRow}>
        <View style={c.bandIcon}>
          <Icon name={site.ikon as IconName} size={16} color={C.gold} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={c.bandKicker}>{L("KAMP YERİ")}</Text>
          <Text style={c.bandName} numberOfLines={1}>
            {site.ad.toLocaleUpperCase(LOC)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const c = StyleSheet.create({
  band: { height: 92, borderRadius: 6, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: '#24272e', justifyContent: 'flex-end' },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  bandIcon: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: C.gold, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  bandKicker: { color: C.gold, fontFamily: F.black, fontSize: 9, letterSpacing: 1.6, textShadowColor: '#000', textShadowRadius: 4 },
  bandName: { color: '#fff', fontFamily: F.display, fontSize: 16, letterSpacing: 0.8, textShadowColor: '#000', textShadowRadius: 6 },
  stages: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stage: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#2a2d34', backgroundColor: '#0c0d10' },
  stageDone: { backgroundColor: C.red, borderColor: C.red },
  stageOn: { backgroundColor: C.gold, borderColor: '#ffe7a6', shadowColor: C.gold, shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  stageText: { color: '#6b7280', fontFamily: F.display, fontSize: 11.5, letterSpacing: 1 },
  link: { flex: 1, height: 2, backgroundColor: '#2a2d34', marginHorizontal: 4 },
  match: { borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2d34', padding: 12, gap: 8, marginBottom: 10 },
  matchSlash: { position: 'absolute', left: '49.5%', top: 30, height: 62, width: 3, backgroundColor: '#f1f2f5', opacity: 0.85, transform: [{ rotate: '12deg' }] },
  matchKicker: { color: C.gold, fontFamily: F.black, fontSize: 10, letterSpacing: 1.8, textAlign: 'center' },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  sideName: { color: '#fff', fontFamily: F.display, fontSize: 16, letterSpacing: 0.5, textShadowColor: '#000', textShadowRadius: 4 },
  sidePow: { color: '#c3c8d1', fontFamily: F.bold, fontSize: 10, letterSpacing: 1 },
  vs: { color: '#fff', fontFamily: F.display, fontSize: 22, fontStyle: 'italic', textShadowColor: '#000', textShadowRadius: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#9fb0d455', backgroundColor: 'rgba(4,4,5,0.6)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, maxWidth: '100%' },
  chipText: { color: '#c7d3ee', fontFamily: F.semi, fontSize: 11 },
  cal: { borderRadius: 6, borderWidth: 1, borderColor: '#3a1a20', padding: 12, gap: 10, marginBottom: 10 },
  calHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 },
  calKicker: { color: '#8b919c', fontFamily: F.black, fontSize: 9.5, letterSpacing: 2 },
  calBig: { color: C.text, fontFamily: F.display, fontSize: 38, lineHeight: 42 },
  calUnit: { fontSize: 18, color: C.dim },
  calDays: { color: C.gold, fontFamily: F.display, fontSize: 16 },
  calOpp: { color: C.dim, fontFamily: F.semi, fontSize: 11.5 },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: 44, height: 46, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: '#101116' },
  cellNo: { color: '#8b919c', fontFamily: F.black, fontSize: 8.5, letterSpacing: 0.5 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontFamily: F.semi, fontSize: 10.5 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 6, borderWidth: 1, padding: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
  liveKicker: { fontFamily: F.display, fontSize: 11.5, letterSpacing: 1.5 },
  liveText: { color: C.text, fontFamily: F.semi, fontSize: 13.5, lineHeight: 19, marginTop: 2 },
  dec: { borderRadius: 6, borderWidth: 1.5, backgroundColor: '#0c0d10', overflow: 'hidden', marginBottom: 12 },
  decBand: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 },
  decIcon: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  decKicker: { fontFamily: F.display, fontSize: 13, letterSpacing: 1.5 },
  decText: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
});
