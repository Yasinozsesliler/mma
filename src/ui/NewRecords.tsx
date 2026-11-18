// Yeni görünüm: Rekorlar (Profil › Sıralama › Rekorlar). Klasik görünümde hiç çizilmez; yalnızca okur.
// Tüm zamanlar UCC rekorları rozet kutucuklarında (her rekorda geçilecek üç efsane), altta Efsanelik Yolu merdiveni.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { rekorSatirlari, type RekorId } from '../engine/records';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { Icon, SLANT, type IconName } from './components';
import { legacyGoals } from './LegacyPath';
import { C, F } from './theme';

const ICON: Record<RekorId, IconName> = { galibiyet: 'trophy', nakavt: 'flash', submission: 'lock', seri: 'trending-up', savunma: 'shield-crown', kemer: 'crown' };
const GROUPS: { ad: string; ids: RekorId[] }[] = [
  { ad: L("PERFORMANS"), ids: ['galibiyet', 'nakavt', 'submission', 'seri'] },
  { ad: L("KEMER"), ids: ['savunma', 'kemer'] },
];
const LADDER_ICON: IconName[] = ['shield-crown', 'scale-balance', 'earth', 'trophy', 'star-circle'];

export function NewRecords({ s }: { s: GameState }) {
  const [sel, setSel] = useState<RekorId | null>(null);
  const rows = rekorSatirlari(s);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const passed = rows.reduce((a, r) => a + r.gecilen, 0);
  const totalLegends = rows.length * 3;
  const ucc = s.stage === 'ufc';
  const goals = legacyGoals(s);
  const done = goals.filter((g) => g.ok).length;
  const selRow = sel ? byId.get(sel) : undefined;
  return (
    <View style={{ marginTop: 4 }}>
      <View style={r.head}>
        <Text style={[r.title, SLANT]}>{L("REKORLAR")}</Text>
        <Text style={r.count}>
          <Text style={{ color: C.gold, fontFamily: F.black }}>{passed}</Text> / {totalLegends} {L("efsane geçildi")}
        </Text>
      </View>
      <Text style={r.sub}>{ucc ? L("Yalnızca UCC maçları sayılır. Her efsaneyi geçince para ve popülerlik kazanırsın.") : L("UCC'ye çıktığında bu listede yarışmaya başlarsın.")}</Text>

      {GROUPS.map((g) => (
        <View key={g.ad}>
          <Text style={r.group}>{g.ad}</Text>
          <View style={r.grid}>
            {g.ids.map((id) => {
              const x = byId.get(id);
              if (!x) return null;
              const all = x.gecilen >= 3;
              const next = x.hedefler.find((h) => !h.gecildi);
              const goal = next ? next.hedef + 1 : x.hedefler[2].hedef + 1;
              const on = sel === id;
              return (
                <Pressable key={id} onPress={() => setSel(on ? null : id)} style={({ pressed }) => [r.tile, all && r.tileDone, on && { borderColor: C.red }, pressed && { opacity: 0.85 }]}>
                  <View style={[r.badge, all ? r.badgeDone : x.gecilen ? r.badgeHalf : null]}>
                    <Icon name={ICON[id]} size={20} color={all ? '#1f1605' : x.gecilen ? C.gold : '#8b919c'} />
                  </View>
                  <Text style={r.tileName} numberOfLines={3}>
                    {x.ad}
                  </Text>
                  <Text style={[r.tileProg, all && { color: C.gold }]}>{all ? x.deger : `${x.deger}/${goal}`}</Text>
                  <View style={r.pips}>
                    {[0, 1, 2].map((k) => (
                      <View key={k} style={[r.pip, k < x.gecilen && { backgroundColor: C.gold, borderColor: C.gold }]} />
                    ))}
                  </View>
                  {all ? (
                    <View style={r.check}>
                      <Icon name="check-bold" size={9} color="#040405" />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          {selRow && g.ids.includes(selRow.id) ? (
            <View style={r.detail}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={r.dTitle}>{selRow.ad}</Text>
                <Text style={r.dVal}>{selRow.deger}</Text>
              </View>
              {[...selRow.hedefler].reverse().map((h, k) => (
                <View key={h.ad} style={r.dRow}>
                  <Text style={[r.dRank, k === 0 && { color: C.gold }]}>#{k + 1}</Text>
                  <Text style={[r.dName, h.gecildi && r.dDone]} numberOfLines={1}>
                    {h.ad}
                  </Text>
                  <Text style={[r.dNum, h.gecildi && r.dDone]}>{h.hedef}</Text>
                  <Icon name={h.gecildi ? 'check-circle' : 'circle-outline'} size={15} color={h.gecildi ? C.green : '#3a3d44'} />
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ))}

      {/* Efsanelik Yolu */}
      <LinearGradient colors={['#15171c', '#1d1608']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={r.ladder}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={r.lTitle}>{L("EFSANELİK YOLU")}</Text>
          <Text style={r.lCount}>{L("{0} / {1} basamak", [done, goals.length])}</Text>
        </View>
        <View style={r.steps}>
          {goals.map((g, k) => [
            k > 0 ? <View key={`l${k}`} style={[r.link, g.ok && goals[k - 1].ok && { backgroundColor: C.gold }]} /> : null,
            <View key={g.ad} style={[r.step, g.ok && r.stepOn]}>
              <Icon name={LADDER_ICON[k] ?? 'trophy'} size={15} color={g.ok ? '#1f1605' : '#6b7280'} />
            </View>,
          ])}
        </View>
        <View style={{ gap: 6 }}>
          {goals.map((g) => (
            <View key={g.ad} style={r.gRow}>
              <Icon name={g.ok ? 'check-circle' : 'circle-outline'} size={15} color={g.ok ? C.gold : '#3a3d44'} />
              <Text style={[r.gName, g.ok && { color: C.gold }]}>{g.ad}</Text>
              <Text style={r.gVal}>{g.deger}</Text>
            </View>
          ))}
        </View>
        <View style={r.banner}>
          <Text style={r.bannerTitle} numberOfLines={1} adjustsFontSizeToFit>
            {L("TÜM ZAMANLARIN EN İYİSİ")}
          </Text>
          <Text style={r.bannerSub}>{done >= goals.length ? L("TAMAMLANDI") : L("{0} BASAMAK KALDI", [goals.length - done])}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const r = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 8 },
  title: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: 2 },
  count: { color: C.dim, fontFamily: F.body, fontSize: 12 },
  sub: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
  group: { color: C.dim, fontFamily: F.displayMed, fontSize: 12, letterSpacing: 3, marginTop: 16, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '48.5%', flexGrow: 1, minHeight: 124, backgroundColor: '#111317', borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 10, alignItems: 'center', gap: 5 },
  tileDone: { backgroundColor: '#1a1609', borderColor: '#5a4614' },
  badge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2a2d34', borderWidth: 2, borderColor: '#3a3d44', alignItems: 'center', justifyContent: 'center' },
  badgeHalf: { backgroundColor: '#1d170a', borderColor: C.goldDeep },
  badgeDone: { backgroundColor: C.gold, borderColor: '#ffe7a6' },
  tileName: { color: C.text, fontFamily: F.bold, fontSize: 10.5, lineHeight: 13, textAlign: 'center' },
  tileProg: { color: '#8b919c', fontFamily: F.display, fontSize: 13 },
  pips: { flexDirection: 'row', gap: 3 },
  pip: { width: 12, height: 4, borderWidth: 1, borderColor: '#3a3d44', backgroundColor: '#14161a' },
  check: { position: 'absolute', right: 5, top: 5, width: 16, height: 16, borderRadius: 8, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  detail: { marginTop: 8, backgroundColor: '#0d0f12', borderWidth: 1, borderColor: C.red, padding: 12, gap: 6 },
  dTitle: { flex: 1, color: C.text, fontFamily: F.display, fontSize: 15, letterSpacing: 0.5 },
  dVal: { color: C.gold, fontFamily: F.display, fontSize: 22 },
  dRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  dRank: { width: 24, color: '#8b919c', fontFamily: F.display, fontSize: 13 },
  dName: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 13 },
  dNum: { color: C.dim, fontFamily: F.display, fontSize: 13 },
  dDone: { color: C.faint, textDecorationLine: 'line-through' },
  ladder: { marginTop: 18, borderTopWidth: 1, borderColor: '#2a2d34', borderWidth: 1, borderRadius: 4, padding: 14, gap: 12 },
  lTitle: { color: C.text, fontFamily: F.display, fontSize: 15, letterSpacing: 1.5 },
  lCount: { color: C.dim, fontFamily: F.body, fontSize: 11 },
  steps: { flexDirection: 'row', alignItems: 'center' },
  step: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#14161a', borderWidth: 2, borderColor: '#3a3d44', alignItems: 'center', justifyContent: 'center' },
  stepOn: { backgroundColor: C.gold, borderColor: '#ffe7a6' },
  link: { flex: 1, height: 2, backgroundColor: '#3a3d44' },
  gRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gName: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 12.5 },
  gVal: { color: C.dim, fontFamily: F.display, fontSize: 13 },
  banner: { backgroundColor: C.gold, paddingHorizontal: 14, paddingVertical: 9, gap: 2, transform: [{ skewX: '-6deg' }] },
  bannerTitle: { color: '#1f1605', fontFamily: F.display, fontSize: 16, letterSpacing: 1 },
  bannerSub: { color: '#4a3708', fontFamily: F.black, fontSize: 10.5, letterSpacing: 1 },
});
