// Müze: kariyerin büyük anlarından kalan hatıralar, tatil kartpostalları ve aile albümü.
// Kilitli müze vitrinleri ipucuyla görünür; dokununca hatıranın hikâyesi açılır.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HATIRA_ICON, MUSEUM, NADIR_RENK } from '../engine/memories';
import type { GameState, Hatira } from '../engine/types';
import { L, LOC } from '../i18n';
import { Button, Icon, Screen, Section, Title, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

type Tab = 'muze' | 'tatil' | 'aile';

function Vitrine({ h, locked, hint, open, onPress }: { h?: Hatira; locked?: { ad: string; tur: Hatira['tur'] }; hint?: string; open: boolean; onPress: () => void }) {
  const renk = h ? NADIR_RENK[h.nadir] : '#2a2c33';
  const tur = h?.tur ?? locked!.tur;
  return (
    <Pressable onPress={onPress} style={[ms.vitrine, open && { width: '100%' }]}>
      <LinearGradient colors={h ? [renk + '30', '#0b0c0f'] : ['#121318', '#0b0c0f']} style={[ms.glass, { borderColor: h ? renk + '88' : C.border }]}>
        <View style={[ms.glow, { backgroundColor: h ? renk + '22' : 'transparent' }]} />
        <Icon name={(h ? HATIRA_ICON[tur] : 'lock-outline') as IconName} size={open ? 44 : 34} color={h ? renk : '#3a3d46'} />
        <View style={[ms.plinth, { backgroundColor: h ? renk + '55' : '#1c1e24' }]} />
      </LinearGradient>
      <Text style={[ms.vName, !h && { color: C.faint }]} numberOfLines={open ? undefined : 2}>
        {h ? h.ad : '???'}
      </Text>
      {h ? <Text style={ms.vDate}>{L("{0} yaşında", [h.yas])}</Text> : <Text style={ms.vHint}>{hint}</Text>}
      {open && h ? <Text style={ms.story}>{h.metin}</Text> : null}
    </Pressable>
  );
}

export function MuseumScreen({ s, act }: { s: GameState; act: Act }) {
  const [tab, setTab] = useState<Tab>('muze');
  const [acik, setAcik] = useState<string | null>(null);
  const all = s.hatiralar ?? [];
  const list = all.filter((h) => h.kat === tab);
  const muzeHas = new Set(all.filter((h) => h.kat === 'muze').map((h) => h.id));
  const tabs: { k: Tab; ad: string; ikon: IconName; n: number }[] = [
    { k: 'muze', ad: L("Müze"), ikon: 'bank', n: muzeHas.size },
    { k: 'tatil', ad: L("Kartpostallar"), ikon: 'email-newsletter', n: all.filter((h) => h.kat === 'tatil').length },
    { k: 'aile', ad: L("Aile albümü"), ikon: 'heart', n: all.filter((h) => h.kat === 'aile').length },
  ];
  return (
    <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <Title kicker={L("KOLEKSİYON")} sub={L("Kariyerinin büyük anlarından kalanlar. Her eşyanın bir hikâyesi var.")}>
        {L("Hatıralar")}
      </Title>
      <View style={ms.tabs}>
        {tabs.map((t) => (
          <Pressable key={t.k} onPress={() => (setTab(t.k), setAcik(null))} style={[ms.tab, tab === t.k && ms.tabOn]}>
            <Icon name={t.ikon} size={16} color={tab === t.k ? C.gold : C.dim} />
            <Text style={[ms.tabText, tab === t.k && { color: C.text }]}>{t.ad}</Text>
            <Text style={ms.tabN}>{t.n}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'muze' ? (
        <>
          <View style={ms.progress}>
            <View style={[ms.progressFill, { width: `${(muzeHas.size / MUSEUM.length) * 100}%` }]} />
          </View>
          <Text style={ms.progressText}>{L("{0}/{1} vitrin dolu", [muzeHas.size, MUSEUM.length])}</Text>
          <View style={ms.grid}>
            {MUSEUM.map((m) => {
              const h = all.find((x) => x.id === m.id);
              return <Vitrine key={m.id} h={h} locked={{ ad: m.ad(), tur: m.tur }} hint={m.ipucu()} open={acik === m.id && !!h} onPress={() => setAcik(acik === m.id ? null : m.id)} />;
            })}
          </View>
        </>
      ) : list.length ? (
        <View style={{ gap: 10 }}>
          {list.map((h) => (
            <LinearGradient key={h.id} colors={tab === 'tatil' ? ['#f4ecd8', '#e6dcc3'] : ['#1a1214', '#0e0f12']} style={[ms.photo, tab === 'tatil' ? ms.postcard : { borderColor: '#ff5c8a55' }]}>
              <View style={ms.photoHead}>
                <Icon name={HATIRA_ICON[h.tur] as IconName} size={18} color={tab === 'tatil' ? '#8a5a2b' : '#ff5c8a'} />
                <Text style={[ms.photoTitle, tab === 'tatil' && { color: '#3b2a17' }]}>{h.ad}</Text>
                {tab === 'tatil' ? <View style={ms.stamp}><Icon name="airplane" size={14} color="#b23a48" /></View> : null}
              </View>
              <Text style={[ms.photoText, tab === 'tatil' && { color: '#5c4630', fontStyle: 'italic' }]}>{h.metin}</Text>
              <Text style={[ms.photoDate, tab === 'tatil' && { color: '#8a7358' }]}>{L("{0} yaşında · {1}. hafta", [h.yas, h.hafta.toLocaleString(LOC)])}</Text>
            </LinearGradient>
          ))}
        </View>
      ) : (
        <Text style={ms.empty}>
          {tab === 'tatil' ? L("Henüz kartpostal yok. Mağaza › Tatil'den bir yere git, dönüşte kartpostalın burada olsun.") : L("Aile albümü boş. Evlilik, çocukların ve onların ilk anları burada birikir.")}
        </Text>
      )}
      <Section>{L("NOT")}</Section>
      <Text style={ms.note}>{L("Hatıralar yalnızca anıdır; güç vermez. Evindeki duvarlarda da görünürler.")}</Text>
    </Screen>
  );
}

const ms = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: R, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  tabOn: { borderColor: C.gold, backgroundColor: '#1d1708' },
  tabText: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  tabN: { color: C.faint, fontFamily: F.display, fontSize: 11 },
  progress: { height: 6, borderRadius: 3, backgroundColor: '#1f2228', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: C.gold },
  progressText: { color: C.dim, fontFamily: F.semi, fontSize: 11, textAlign: 'right', marginTop: 4, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vitrine: { width: '47.5%', marginBottom: 4 },
  glass: { height: 110, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', width: 64, height: 64, borderRadius: 32, top: 22 },
  plinth: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 10 },
  vName: { color: C.text, fontFamily: F.bold, fontSize: 13, marginTop: 6, lineHeight: 17 },
  vDate: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  vHint: { color: C.faint, fontFamily: F.body, fontSize: 11, lineHeight: 15 },
  story: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19, marginTop: 6 },
  photo: { borderRadius: R, borderWidth: 1, padding: 14 },
  postcard: { borderColor: '#cbb994', transform: [{ rotate: '-0.6deg' }] },
  photoHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoTitle: { flex: 1, color: C.text, fontFamily: F.bold, fontSize: 14 },
  stamp: { borderWidth: 1.5, borderColor: '#b23a48', borderRadius: 4, padding: 3, transform: [{ rotate: '8deg' }] },
  photoText: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19, marginTop: 6 },
  photoDate: { color: C.faint, fontFamily: F.semi, fontSize: 11, marginTop: 6 },
  empty: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19, textAlign: 'center', marginVertical: 18 },
  note: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 18 },
});
