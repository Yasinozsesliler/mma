// Dövüşçü kartı albümü: nadirliğe göre kartlar, filtre ve albüm eşik ödülleri.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ALBUM_MILESTONES, ALBUM_SETS, claimMilestone, claimSet, milestoneReward, RARITY, setReward, type FighterCard, type Rarity } from '../engine/cards';
import { money } from '../engine/career';
import { ORGS } from '../engine/data';
import { lookFor } from '../engine/tale';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { Button, Icon, Screen, Section, Title, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import type { Act } from './GameScreens';
import { C, F } from './theme';

const OZEL: Record<NonNullable<FighterCard['ozel']>, () => string> = {
  sampiyon: () => L("ŞAMPİYON"),
  ezeli: () => L("EZELİ RAKİP"),
  kanka: () => L("ESKİ ORTAK"),
};

function Card({ c }: { c: FighterCard }) {
  const r = RARITY[c.nadir];
  return (
    <LinearGradient colors={c.parlak ? ['#7fdbff', '#c86bff', '#f2c14e', '#39ff14'] : [r.renk, '#0b0c0f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.cardBorder}>
      <View style={[st.card, c.parlak && { backgroundColor: '#121122' }]}>
        <View style={st.cardTop}>
          <Text style={[st.rar, { color: c.parlak ? '#7fdbff' : r.renk }]}>{c.parlak ? `✨ ${r.ad().toLocaleUpperCase(LOC)}` : r.ad().toLocaleUpperCase(LOC)}</Text>
          {c.sayi > 1 ? <Text style={st.count}>×{c.sayi}</Text> : null}
        </View>
        <FighterAvatar look={lookFor({ id: c.id, uyruk: c.uyruk, kadin: c.kadin })} size={58} ring={r.renk} />
        <Text style={st.name} numberOfLines={1}>
          {c.ad}
        </Text>
        <Text style={st.surname} numberOfLines={1}>
          {c.soyad.toLocaleUpperCase(LOC)}
        </Text>
        {c.ozel ? <Text style={[st.special, { backgroundColor: r.renk }]}>{OZEL[c.ozel]()}</Text> : <Text style={st.org}>{ORGS[c.org]?.kisa ?? c.org}</Text>}
        <Text style={st.method} numberOfLines={1}>
          {c.yontem} · {c.yas}
        </Text>
      </View>
    </LinearGradient>
  );
}

export function AlbumScreen({ s, act }: { s: GameState; act: Act }) {
  const [filter, setFilter] = useState<Rarity | 'hepsi'>('hepsi');
  const cards = [...(s.kartlar ?? [])].sort((a, b) => RARITY[b.nadir].sira - RARITY[a.nadir].sira || b.yas - a.yas);
  const shown = filter === 'hepsi' ? cards : cards.filter((c) => c.nadir === filter);
  const count = (r: Rarity) => cards.filter((c) => c.nadir === r).length;
  const n = cards.length;
  return (
    <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <Title kicker={L("KOLEKSİYON")} sub={L("Yendiğin her dövüşçü albüme bir kart olarak girer. UCC şampiyonu, ezeli rakibin ve eski antrenman ortağın efsane kart olur.")}>
        {L("Kart Albümü")}
      </Title>
      <View style={st.stats}>
        {(['efsane', 'altin', 'gumus', 'bronz'] as Rarity[]).map((r) => (
          <Pressable key={r} onPress={() => setFilter(filter === r ? 'hepsi' : r)} style={[st.stat, filter === r && { borderColor: RARITY[r].renk }]}>
            <Text style={[st.statVal, { color: RARITY[r].renk }]}>{count(r)}</Text>
            <Text style={st.statLabel}>{RARITY[r].ad()}</Text>
          </Pressable>
        ))}
      </View>
      <Section>{L("ALBÜM ÖDÜLLERİ")}</Section>
      <View style={st.miles}>
        {ALBUM_MILESTONES.map((m, i) => {
          const got = (s.albumOdul ?? []).includes(i);
          const ready = n >= m && !got;
          const r = milestoneReward(s, i);
          return (
            <Pressable
              key={m}
              disabled={!ready}
              onPress={() => {
                buzz('basari');
                act((x) => claimMilestone(x, i));
              }}
              style={[st.mile, ready && { borderColor: C.gold, backgroundColor: '#2a2108' }, got && { opacity: 0.5 }]}
            >
              <Icon name={got ? 'check-circle' : ready ? 'gift' : 'lock-outline'} size={18} color={got ? C.green : ready ? C.gold : C.faint} />
              <Text style={st.mileN}>{L("{0} kart", [m])}</Text>
              <Text style={st.mileR}>{money(r.para)}</Text>
              <Text style={st.mileP}>+{r.puan}P</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={st.progress}>
        <View style={[st.progressFill, { width: `${Math.min(100, (n / 75) * 100)}%` }]} />
      </View>
      <Text style={st.progressText}>{L("{0}/75 kart", [n])}</Text>
      <Section>{L("SETLER · {0}/{1}", [(s.albumSet ?? []).length, ALBUM_SETS.length])}</Section>
      <View style={{ gap: 6 }}>
        {ALBUM_SETS.map((d, i) => {
          const got = (s.albumSet ?? []).includes(d.id);
          const have = Math.min(d.hedef, d.say(s.kartlar ?? []));
          const ready = have >= d.hedef && !got;
          return (
            <Pressable
              key={d.id}
              disabled={!ready}
              onPress={() => {
                buzz('basari');
                act((x) => claimSet(x, d.id));
              }}
              style={[st.set, ready && { borderColor: C.gold, backgroundColor: '#2a2108' }, got && { opacity: 0.55 }]}
            >
              <Icon name={(got ? 'check-circle' : d.ikon) as IconName} size={20} color={got ? C.green : ready ? C.gold : C.dim} />
              <View style={{ flex: 1 }}>
                <Text style={st.setName}>{d.ad()}</Text>
                <Text style={st.setDesc}>{d.aciklama()}</Text>
                <View style={st.setBar}>
                  <View style={[st.setFill, { width: `${(have / d.hedef) * 100}%`, backgroundColor: got ? C.green : C.gold }]} />
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={st.setN}>
                  {have}/{d.hedef}
                </Text>
                <Text style={st.setR}>{ready ? L("AL") : money(setReward(s, i))}</Text>
                {d.kozmetik ? <Text style={st.setK}>{L("+ dolap eşyası")}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Section>{filter === 'hepsi' ? L("KARTLAR · {0}", [n]) : `${RARITY[filter].ad().toLocaleUpperCase(LOC)} · ${shown.length}`}</Section>
      {shown.length ? (
        <View style={st.grid}>
          {shown.map((c) => (
            <Card key={c.id} c={c} />
          ))}
        </View>
      ) : (
        <Text style={st.empty}>{L("Henüz kart yok. İlk galibiyetinle albüm açılır.")}</Text>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingVertical: 10 },
  statVal: { fontFamily: F.display, fontSize: 22 },
  statLabel: { color: C.dim, fontFamily: F.semi, fontSize: 11 },
  miles: { flexDirection: 'row', gap: 6 },
  mile: { flex: 1, alignItems: 'center', gap: 2, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 8 },
  mileN: { color: C.text, fontFamily: F.display, fontSize: 12 },
  mileR: { color: C.gold, fontFamily: F.semi, fontSize: 10 },
  mileP: { color: C.dim, fontFamily: F.semi, fontSize: 10 },
  progress: { height: 6, borderRadius: 3, backgroundColor: '#1f2228', overflow: 'hidden', marginTop: 10 },
  progressFill: { height: '100%', backgroundColor: C.gold, borderRadius: 3 },
  progressText: { color: C.dim, fontFamily: F.semi, fontSize: 11, textAlign: 'right', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardBorder: { width: '31.5%', borderRadius: 12, padding: 1.5 },
  card: { backgroundColor: '#0d0e12', borderRadius: 11, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, gap: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 4 },
  rar: { fontFamily: F.display, fontSize: 9, letterSpacing: 1 },
  count: { color: C.text, fontFamily: F.display, fontSize: 10 },
  name: { color: C.dim, fontFamily: F.semi, fontSize: 11, marginTop: 2 },
  surname: { color: C.text, fontFamily: F.display, fontSize: 12 },
  org: { color: C.blue, fontFamily: F.display, fontSize: 9, letterSpacing: 1 },
  special: { color: '#0b0b0e', fontFamily: F.display, fontSize: 8, letterSpacing: 0.5, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  method: { color: C.faint, fontFamily: F.body, fontSize: 9 },
  set: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10 },
  setName: { color: C.text, fontFamily: F.bold, fontSize: 13 },
  setDesc: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  setBar: { height: 4, borderRadius: 2, backgroundColor: '#1f2228', marginTop: 5, overflow: 'hidden' },
  setFill: { height: 4, borderRadius: 2 },
  setN: { color: C.text, fontFamily: F.display, fontSize: 13 },
  setR: { color: C.gold, fontFamily: F.display, fontSize: 11 },
  setK: { color: '#c86bff', fontFamily: F.semi, fontSize: 9 },
  empty: { color: C.dim, fontFamily: F.body, fontSize: 13, textAlign: 'center', marginTop: 10 },
});
