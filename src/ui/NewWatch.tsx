// Yeni görünüm: oynanmayan (izlenen) maçlar için kariyerle aynı görseller. Patron ve Menajer modunun maç
// izleme ekranı bunları kullanır: arena önünde tam boy dövüşçülerle yan yana karşılaştırma (VS), maç sonu
// kazanan/hakem/kaybeden sahnesi. Veriler düz alanlarla gelir; oyun durumu gerekmez.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, G } from 'react-native-svg';
import type { Appearance } from '../engine/types';
import { L, LOC } from '../i18n';
import { ArenaBackdrop } from './ArenaBackdrop';
import type { ArenaTier } from './arenaArt';
import { SLANT } from './components';
import { flagOf, Standing } from './NewCareer';
import { Figure, HIP_H, POSES, type Kit, type PoseName } from './rig';
import { C, F } from './theme';

export const RED_CORNER: Kit = { shorts: '#b5121b', trim: '#ffffff', glove: '#c1121f' };
export const BLUE_CORNER: Kit = { shorts: '#1c4fc4', trim: '#f1f2f5', glove: '#1c4fc4' };
const REF_LOOK: Appearance = { ten: 1, sac: 'kazik', sacRenk: 7, goz: 0, sakal: 'yok', yara: false, dovme: false };
const REF_KIT: Kit = { shorts: '#15161a', trim: '#fff', glove: '#000', ref: true };

export type Corner = { look: Appearance; name: string; country?: string; nick?: string; kit?: Kit; /** Gençlik Yolu: figür yaşa göre küçük */ genc?: number };
export type WatchArena = { tier: ArenaTier; org: string; sub?: string; tint?: string };

const split = (n: string) => {
  const p = n.trim().split(/\s+/);
  return p.length > 1 ? [p.slice(0, -1).join(' '), p[p.length - 1]] : ['', n];
};

/** Arena önünde iki dövüşçü ve ortada karşılaştırma sütunu (kariyerdeki VS ekranının genel hâli). */
export function WatchVs({ w, a, b, rows, arena, title, tag }: { w: number; a: Corner; b: Corner; rows: [string, string, string][]; arena: WatchArena; title?: string; tag?: string }) {
  const H = 400;
  const colW = Math.min(132, Math.round(w * 0.36));
  const fh = 290;
  const [pa, pb] = split(a.name.toLocaleUpperCase(LOC));
  const [oa, ob] = split(b.name.toLocaleUpperCase(LOC));
  const [show] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(show, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [show]);
  return (
    <View style={[x.stage, { height: H }]}>
      <LinearGradient colors={['#14161c', '#0a0b0f', '#040405']} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
      <ArenaBackdrop w={w} h={H} tier={arena.tier} org={arena.org} sub={arena.sub} tint={arena.tint} />
      <LinearGradient colors={['rgba(193,18,31,0.35)', 'rgba(193,18,31,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 0.45, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(28,79,196,0)', 'rgba(28,79,196,0.35)']} start={{ x: 0.55, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={{ position: 'absolute', left: -w * 0.24, bottom: 18, opacity: show, transform: [{ translateX: show.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) }] }} pointerEvents="none">
        <Standing look={a.look} kit={a.kit ?? RED_CORNER} h={fh} genc={a.genc} />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', right: -w * 0.24, bottom: 18, opacity: show, transform: [{ translateX: show.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] }} pointerEvents="none">
        <Standing look={b.look} kit={b.kit ?? BLUE_CORNER} h={fh} flip genc={b.genc} />
      </Animated.View>
      <LinearGradient colors={['transparent', 'rgba(4,4,5,0.85)']} locations={[0.78, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={[x.col, { width: colW, left: (w - colW) / 2 }]}>
        <Text style={x.org} numberOfLines={1}>
          {arena.org}
        </Text>
        {title ? (
          <Text style={x.weight} numberOfLines={1} adjustsFontSizeToFit>
            {title}
          </Text>
        ) : null}
        {tag ? <Text style={x.tag}>{tag}</Text> : null}
        {rows.map(([l, label, r]) => (
          <View key={label} style={x.row}>
            <Text style={x.val} numberOfLines={1} adjustsFontSizeToFit>
              {l}
            </Text>
            <Text style={x.label} numberOfLines={1}>
              {label}
            </Text>
            <Text style={x.val} numberOfLines={1} adjustsFontSizeToFit>
              {r}
            </Text>
          </View>
        ))}
      </View>
      <View style={[x.name, { left: 10, maxWidth: (w - colW) / 2 + 14 }]}>
        {pa ? <Text style={x.nameTop} numberOfLines={1}>{pa}</Text> : null}
        <Text style={x.nameBig} numberOfLines={1} adjustsFontSizeToFit>
          {pb}
        </Text>
        <Text style={[x.nameSub, { color: '#ff6b6b' }]} numberOfLines={1}>
          {flagOf(a.country)} {a.nick ? `“${a.nick.toLocaleUpperCase(LOC)}”` : ''}
        </Text>
      </View>
      <View style={[x.name, { right: 10, alignItems: 'flex-end', maxWidth: (w - colW) / 2 + 14 }]}>
        {oa ? <Text style={[x.nameTop, { textAlign: 'right' }]} numberOfLines={1}>{oa}</Text> : null}
        <Text style={[x.nameBig, { textAlign: 'right' }]} numberOfLines={1} adjustsFontSizeToFit>
          {ob}
        </Text>
        <Text style={[x.nameSub, { color: '#7fb0ff', textAlign: 'right' }]} numberOfLines={1}>
          {b.nick ? `“${b.nick.toLocaleUpperCase(LOC)}” ` : ''}
          {flagOf(b.country)}
        </Text>
      </View>
    </View>
  );
}

function Fig({ x: px, pose, look, kit, flip, op = 1 }: { x: number; pose: PoseName; look: Appearance; kit: Kit; flip?: boolean; op?: number }) {
  return (
    <G opacity={op} transform={`translate(${px} ${118 - HIP_H * 1.05}) scale(${flip ? -1.05 : 1.05} 1.05)`}>
      <Figure p={POSES[pose]} look={look} kit={kit} />
    </G>
  );
}

/** Maç sonu sahnesi: hakem kazananın kolunu kaldırır, kaybeden yıkılmış; arkada arena, altta yayın bandı. */
export function WatchResult({ w, winner, loser, winnerRed, arena, title, method, extra }: { w: number; winner: Corner; loser: Corner; winnerRed: boolean; arena: WatchArena; title: string; method: string; extra?: string }) {
  const H = 330;
  const wKit = winner.kit ?? (winnerRed ? RED_CORNER : BLUE_CORNER);
  const lKit = loser.kit ?? (winnerRed ? BLUE_CORNER : RED_CORNER);
  const corner = winnerRed ? C.red : C.blue;
  return (
    <View style={[x.stage, { height: H + 74 }]}>
      <View style={{ height: H }}>
        <ArenaBackdrop w={w} h={H} tier={arena.tier} org={arena.org} sub={arena.sub} tint={arena.tint} dim={0.25} />
        <Text style={x.resTitle} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        <View style={x.resStage} pointerEvents="none">
          <Svg width="100%" height="100%" viewBox="0 0 200 125">
            <Ellipse cx={100} cy={119} rx={86} ry={6} fill="#000" opacity={0.5} />
            <Fig x={152} pose="dejected" look={loser.look} kit={lKit} flip op={0.55} />
            <Fig x={92} pose="refRaise" look={REF_LOOK} kit={REF_KIT} flip />
            <Fig x={58} pose="winHeld" look={winner.look} kit={wKit} />
          </Svg>
        </View>
      </View>
      <View style={[x.band, { borderLeftColor: corner }]}>
        <Text style={[x.bandKick, { backgroundColor: corner }]}>{L("KAZANAN")}</Text>
        <Text style={[x.bandName, SLANT]} numberOfLines={1} adjustsFontSizeToFit>
          {flagOf(winner.country)} {winner.name.toLocaleUpperCase(LOC)}
        </Text>
        <Text style={x.bandMethod} numberOfLines={1}>
          {method}
          {extra ? ` · ${extra}` : ''}
        </Text>
      </View>
    </View>
  );
}

const x = StyleSheet.create({
  stage: { borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#1c1f25', backgroundColor: '#050506' },
  col: { position: 'absolute', top: 10, bottom: 92, backgroundColor: 'rgba(16,20,34,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'stretch', paddingHorizontal: 4, paddingTop: 8, gap: 6 },
  org: { alignSelf: 'center', backgroundColor: C.red, color: '#fff', fontFamily: F.display, fontSize: 18, letterSpacing: 1, paddingHorizontal: 10, paddingVertical: 2, overflow: 'hidden', maxWidth: '100%' },
  weight: { color: C.text, fontFamily: F.display, fontSize: 14, letterSpacing: 1, textAlign: 'center' },
  tag: { alignSelf: 'center', color: C.gold, fontFamily: F.black, fontSize: 8.5, letterSpacing: 1.2, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 4, paddingHorizontal: 2, gap: 2 },
  val: { width: 38, color: C.text, fontFamily: F.display, fontSize: 12, textAlign: 'center' },
  label: { flex: 1, color: '#c3c8d1', fontFamily: F.black, fontSize: 7.5, letterSpacing: 0.2, textAlign: 'center' },
  name: { position: 'absolute', bottom: 10 },
  nameTop: { color: '#e4e6eb', fontFamily: F.display, fontSize: 15, letterSpacing: 1, textShadowColor: '#000', textShadowRadius: 6 },
  nameBig: { color: '#fff', fontFamily: F.display, fontSize: 30, lineHeight: 33, letterSpacing: 0.5, textShadowColor: '#000', textShadowRadius: 8 },
  nameSub: { fontFamily: F.black, fontSize: 10, letterSpacing: 1.2 },
  resTitle: { position: 'absolute', top: 12, left: 12, right: 12, color: '#fff', fontFamily: F.display, fontSize: 30, textAlign: 'center', letterSpacing: 1, textShadowColor: '#000', textShadowRadius: 10 },
  resStage: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 250 },
  band: { height: 74, backgroundColor: '#0b0c10', borderLeftWidth: 4, paddingHorizontal: 12, justifyContent: 'center', gap: 2 },
  bandKick: { alignSelf: 'flex-start', color: '#fff', fontFamily: F.black, fontSize: 9, letterSpacing: 1.4, paddingHorizontal: 6, paddingVertical: 1 },
  bandName: { color: '#fff', fontFamily: F.display, fontSize: 22 },
  bandMethod: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 0.6 },
});
