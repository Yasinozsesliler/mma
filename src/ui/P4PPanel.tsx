// Sıralama sekmesi: kendi sıkletin ve UFC Pound for Pound listesi.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WEIGHT_CLASSES } from '../engine/data';
import { ensureP4P, p4pRows, playerP4PScore } from '../engine/p4p';
import type { GameState } from '../engine/types';
import { Icon, SLANT, upName } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { RankingList } from './HubParts';
import { C, F, R } from './theme';

function P4PList({ s, act }: { s: GameState; act: Act }) {
  useEffect(() => {
    if (!s.p4p?.liste.length) act((x) => ensureP4P(x));
  }, [s.p4p, act]);
  const rows = s.p4p ? p4pRows(s) : [];
  const ufc = s.stage === 'ufc';
  const myScore = playerP4PScore(s);
  return (
    <>
      <LinearGradient colors={['#3a2a07', '#120d04', '#08090b']} style={pw.hero}>
        <Text style={pw.kicker}>UFC · TÜM SIKLETLER</Text>
        <Text style={[pw.title, SLANT]}>POUND FOR POUND</Text>
        <Text style={pw.sub}>Sıklet fark etmeksizin dünyanın en iyi {rows.length || 15} dövüşçüsü</Text>
        <View style={pw.status}>
          <Icon name={ufc ? 'earth' : 'lock'} size={14} color={ufc ? C.gold : C.faint} />
          <Text style={[pw.statusText, !ufc && { color: C.faint }]}>
            {!ufc
              ? 'UFC’ye özel. UFC’de kazanmaya başlayınca listeye girebilirsin.'
              : myScore
                ? s.p4p?.sira
                  ? `Sıran: #${s.p4p.sira} · P4P puanın ${myScore}`
                  : `P4P puanın ${myScore}. Listeye girmek için ${Math.max(1, (rows[rows.length - 1]?.puan ?? 70) - myScore + 1)} puan daha.`
                : 'İlk UFC galibiyetinle P4P puanın oluşur.'}
          </Text>
        </View>
      </LinearGradient>
      {rows.map((r, i) => {
        const me = r.oyuncu;
        const top3 = i < 3;
        return (
          <View key={me ? 'me' : r.id} style={[pw.row, me && pw.meRow, top3 && !me && { borderColor: '#4a3810' }]}>
            <Text style={[pw.rank, top3 && { color: C.gold }, me && { color: '#fff' }]}>{i + 1}</Text>
            {me ? <FighterAvatar look={s.fighter.gorunum} size={38} ring={C.red} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={[pw.name, SLANT]} numberOfLines={1}>
                {me ? `${s.fighter.ad} ${s.fighter.soyad}`.toLocaleUpperCase('tr-TR') : upName(`${r.ad} ${r.soyad}`, r.uyruk)}
                {me ? <Text style={pw.you}>  SEN</Text> : null}
              </Text>
              <Text style={pw.meta} numberOfLines={1}>
                {me
                  ? `${WEIGHT_CLASSES[s.fighter.siklet].ad} · ${s.rekor.g}-${s.rekor.m}-${s.rekor.b}`
                  : `${WEIGHT_CLASSES[r.siklet].ad} · ${r.rekor.g}-${r.rekor.m}-${r.rekor.b} · ${r.uyruk}`}
              </Text>
            </View>
            {(me ? (s.kemerler ?? []).some((b) => b.aktif && b.org === 'ufc') : r.sampiyon) ? <Icon name="crown" size={18} color={C.gold} /> : null}
            <Text style={[pw.score, top3 && { color: C.gold }]}>{Math.round(r.puan)}</Text>
          </View>
        );
      })}
    </>
  );
}

export function RankingsTab({ s, act }: { s: GameState; act: Act }) {
  const [tab, setTab] = useState<'siklet' | 'p4p'>('siklet');
  return (
    <>
      <View style={pw.switch}>
        {(
          [
            ['siklet', 'SIKLETİM', 'podium'],
            ['p4p', 'POUND FOR POUND', 'earth'],
          ] as const
        ).map(([k, l, ic]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[pw.swBtn, tab === k && (k === 'p4p' ? pw.swGold : pw.swRed)]}>
            <Icon name={ic} size={14} color={tab === k ? (k === 'p4p' ? '#000' : '#fff') : C.dim} />
            <Text style={[pw.swText, tab === k && { color: k === 'p4p' ? '#000' : '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'siklet' ? <RankingList s={s} /> : <P4PList s={s} act={act} />}
    </>
  );
}

const pw = StyleSheet.create({
  switch: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 10 },
  swBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, transform: [{ skewX: '-8deg' }] },
  swRed: { backgroundColor: C.red, borderColor: C.red },
  swGold: { backgroundColor: C.gold, borderColor: C.gold },
  swText: { color: C.dim, fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  hero: { borderRadius: R + 4, borderWidth: 1, borderColor: '#4a3810', padding: 16, alignItems: 'center', marginBottom: 10 },
  kicker: { color: C.faint, fontFamily: F.display, fontSize: 11, letterSpacing: 3 },
  title: { color: C.gold, fontFamily: F.display, fontSize: 34, lineHeight: 40, textShadowColor: 'rgba(242,193,78,0.4)', textShadowRadius: 16 },
  sub: { color: C.dim, fontFamily: F.body, fontSize: 12, textAlign: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, borderWidth: 1, borderColor: '#4a3810', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { color: C.gold, fontFamily: F.semi, fontSize: 12, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 6 },
  meRow: { backgroundColor: '#2a0a10', borderColor: C.red },
  rank: { width: 28, color: C.dim, fontFamily: F.display, fontSize: 22, textAlign: 'center' },
  name: { color: C.text, fontFamily: F.display, fontSize: 15 },
  you: { color: C.red, fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  meta: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  score: { color: C.dim, fontFamily: F.display, fontSize: 16, minWidth: 28, textAlign: 'right' },
});
