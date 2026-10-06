// Kariyer belgeseli: kariyerin sahne sahne akar. Başlangıç hikâyesi, ilk maçlar, kemerler, ödüller, aile anları,
// medya projeleri ve sonunda paylaşılabilir kariyer kartı. Sahne kendiliğinden ilerler; dokununca sonrakine geçer.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { fullName } from '../engine/character';
import { COUNTRIES } from '../engine/data';
import { legacyScore, legacyTier } from '../engine/legacy';
import { MEDIA_ICON, MEDIA_LABEL } from '../engine/media';
import { HATIRA_ICON } from '../engine/memories';
import { careerTimeline, MOMENT_ICON, type MomentKind } from '../engine/timeline';
import type { GameState } from '../engine/types';
import { L, LOC } from '../i18n';
import { careerCard } from '../share/build';
import { ShareButton } from '../share/ShareButton';
import { Button, Icon, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { C, F } from './theme';

type Scene = { yas?: number; kicker: string; baslik: string; alt: string; ikon: string; renk: string };

const KEEP: MomentKind[] = ['ilk', 'galibiyet', 'ko', 'sub', 'maglubiyet', 'pro', 'org', 'kemer', 'kilometre', 'seri', 'odul', 'salon', 'hof'];
const RENK: Partial<Record<MomentKind, string>> = { kemer: '#f2c14e', hof: '#f2c14e', odul: '#f2c14e', maglubiyet: '#7a8aa6', ko: '#e63946', sub: '#3aa8ff' };

export function buildScenes(s: GameState): Scene[] {
  const f = s.fighter;
  const out: (Scene & { sira: number })[] = [];
  careerTimeline(s)
    .filter((m) => KEEP.includes(m.tur))
    .forEach((m) => out.push({ yas: m.yas, sira: m.sira, kicker: L("{0} YAŞINDA", [m.yas]), baslik: m.baslik, alt: m.alt, ikon: MOMENT_ICON[m.tur], renk: RENK[m.tur] ?? C.red }));
  (s.hatiralar ?? [])
    .filter((h) => h.kat === 'aile' || h.nadir === 'efsane')
    .forEach((h) => out.push({ yas: h.yas, sira: 9999, kicker: L("{0} YAŞINDA", [h.yas]), baslik: h.ad, alt: h.metin.split('\n')[0], ikon: HATIRA_ICON[h.tur], renk: h.kat === 'aile' ? '#ff5c8a' : '#f2c14e' }));
  (s.medya ?? []).forEach((m) => out.push({ yas: m.yas, sira: 9998, kicker: L("{0} YAŞINDA", [m.yas]), baslik: `${MEDIA_LABEL[m.tur]()}: ${m.ad}`, alt: L("Kafesin dışında da bir yıldız"), ikon: MEDIA_ICON[m.tur], renk: '#c86bff' }));
  out.sort((a, b) => (a.yas ?? 0) - (b.yas ?? 0) || a.sira - b.sira);
  const story = (f.hikaye || '').split(/(?<=\.)\s/)[0];
  const ulke = COUNTRIES[f.uyruk]?.ad ?? '';
  const open: Scene = { kicker: L("BİR DÖVÜŞÇÜNÜN HİKÂYESİ"), baslik: fullName(f), alt: story || L("{0}, {1}. Her şey bir hayalle başladı.", [f.memleket || ulke, f.baslangicYasi ?? f.yas]), ikon: 'movie-open-star', renk: C.gold };
  return [open, ...out.slice(0, 18)];
}

export function DocumentaryScreen({ s, act }: { s: GameState; act: Act }) {
  const [scenes] = useState(() => buildScenes(s));
  const [i, setI] = useState(0);
  const [fade] = useState(() => new Animated.Value(0));
  const done = i >= scenes.length;
  useEffect(() => {
    sfx('swell', 0.3);
  }, []);
  useEffect(() => {
    if (done) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    const t = setTimeout(() => setI((x) => x + 1), i === 0 ? 5200 : 3800);
    return () => clearTimeout(t);
  }, [i, done, fade]);
  const exit = () => act((x) => (x.phase = x.pending.sonrakiFaz === 'emeklilik' ? 'emeklilik' : 'hub'));
  const r = s.stage === 'amator' ? s.amator : s.rekor;
  const score = legacyScore(s);

  if (done)
    return (
      <View style={ds.back}>
        <LinearGradient colors={['#2a2108', '#07080a']} style={StyleSheet.absoluteFill} />
        <View style={ds.end}>
          <Text style={ds.kicker}>{L("SON")}</Text>
          <FighterAvatar look={s.fighter.gorunum} size={110} ring={C.gold} />
          <Text style={ds.endName}>{fullName(s.fighter)}</Text>
          <Text style={ds.endRec}>
            {r.g}-{r.m}-{r.b}
          </Text>
          <Text style={ds.endSub}>
            {L("{0} kemer · {1} ödül · efsane puanı {2}", [(s.kemerler ?? []).length, (s.oduller ?? []).length, score.toLocaleString(LOC)])}
          </Text>
          <Text style={[ds.endTier, { color: C.gold }]}>{legacyTier(score).ad}</Text>
        </View>
        <View style={ds.foot}>
          <ShareButton data={careerCard(s)} label={L("Belgeseli paylaş")} />
          <Button label={L("Baştan izle")} icon="replay" tone="ghost" onPress={() => setI(0)} />
          <Button label={L("Kapat")} icon="close" tone="ghost" onPress={exit} />
        </View>
      </View>
    );

  const sc = scenes[i];
  return (
    <Pressable style={ds.back} onPress={() => setI(i + 1)}>
      <LinearGradient colors={[sc.renk + '40', '#07080a', '#07080a']} style={StyleSheet.absoluteFill} />
      <View style={ds.bars}>
        {scenes.map((_, k) => (
          <View key={k} style={[ds.bar, k < i && { backgroundColor: '#ffffffaa' }, k === i && { backgroundColor: sc.renk }]} />
        ))}
      </View>
      <Animated.View style={[ds.center, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
        {i === 0 ? (
          <FighterAvatar look={s.fighter.gorunum} size={120} ring={C.gold} />
        ) : (
          <View style={[ds.icon, { borderColor: sc.renk }]}>
            <Icon name={sc.ikon as IconName} size={44} color={sc.renk} />
          </View>
        )}
        <Text style={[ds.kicker, { color: sc.renk }]}>{sc.kicker}</Text>
        <Text style={ds.title}>{sc.baslik}</Text>
        <Text style={ds.alt}>{sc.alt}</Text>
      </Animated.View>
      <View style={ds.skipRow}>
        <Text style={ds.hint}>{L("Dokun: sonraki sahne")}</Text>
        <Pressable onPress={() => setI(scenes.length)} hitSlop={10}>
          <Text style={ds.skip}>{L("Sona atla")}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const ds = StyleSheet.create({
  back: { flex: 1, backgroundColor: '#07080a', minHeight: 600 },
  bars: { flexDirection: 'row', gap: 3, paddingHorizontal: 12, paddingTop: 12 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#ffffff22' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 10 },
  icon: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000066' },
  kicker: { color: C.gold, fontFamily: F.display, fontSize: 13, letterSpacing: 4, marginTop: 8 },
  title: { color: '#fff', fontFamily: F.display, fontSize: 32, textAlign: 'center', letterSpacing: 0.5, transform: [{ skewX: '-6deg' }] },
  alt: { color: C.dim, fontFamily: F.body, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  skipRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  hint: { color: C.faint, fontFamily: F.semi, fontSize: 12 },
  skip: { color: C.text, fontFamily: F.semi, fontSize: 12 },
  end: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  endName: { color: '#fff', fontFamily: F.display, fontSize: 30, textAlign: 'center', marginTop: 6 },
  endRec: { color: C.gold, fontFamily: F.display, fontSize: 26, letterSpacing: 2 },
  endSub: { color: C.dim, fontFamily: F.body, fontSize: 13, textAlign: 'center' },
  endTier: { fontFamily: F.display, fontSize: 16, letterSpacing: 2 },
  foot: { padding: 16, gap: 8 },
});
