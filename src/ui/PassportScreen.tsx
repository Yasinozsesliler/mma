// Pasaport: dövüştüğün her şehir bir damga (maç sonucuyla) ve oradan bir hediyelik eşya; yurt dışı tatiller de
// damga olur. Gidilmemiş şehirler soluk görünür, kıta sayacı dünya turunu tamamlamaya çağırır.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { COUNTRIES } from '../engine/data';
import { abroadName, SOUVENIRS } from '../engine/memories';
import type { GameState } from '../engine/types';
import { CITIES, KITALAR, visitedKitalar, type Kita } from '../engine/worldMap';
import { L, LOC } from '../i18n';
import { Button, Icon, Screen, Section, Title } from './components';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

const SONUC: Record<string, { t: () => string; c: string }> = {
  G: { t: () => L("ZAFER"), c: '#2a9d5c' },
  M: { t: () => L("YENİLGİ"), c: '#c1121f' },
  B: { t: () => L("BERABERE"), c: '#8a8f99' },
};
const KITA_SIRA: Kita[] = ['avrupa', 'kamerika', 'gamerika', 'asya', 'afrika', 'okyanusya'];

function Stamp({ ad, alt, renk, rot, ikon, sub }: { ad: string; alt: string; renk: string; rot: number; ikon: 'airplane' | 'palm-tree'; sub?: string }) {
  return (
    <View style={ps.stampWrap}>
      <View style={[ps.stamp, { borderColor: renk, transform: [{ rotate: `${rot}deg` }] }]}>
        <Icon name={ikon} size={14} color={renk} />
        <Text style={[ps.stampCity, { color: renk }]} numberOfLines={1}>
          {ad.toLocaleUpperCase(LOC)}
        </Text>
        <Text style={[ps.stampAlt, { color: renk }]}>{alt}</Text>
      </View>
      {sub ? (
        <Text style={ps.souv} numberOfLines={2}>
          🎁 {sub}
        </Text>
      ) : null}
    </View>
  );
}

export function PassportScreen({ s, act }: { s: GameState; act: Act }) {
  const d = s.damgalar ?? {};
  // Eski kayıtlar: damga yoksa ziyaret edilen şehirlerden tarihsiz damga
  const visited = new Set([...Object.keys(s.sehirler ?? {}), ...Object.keys(d).filter((k) => !k.startsWith('tatil_'))]);
  const cities = CITIES.filter((c) => visited.has(c.id));
  const tatiller = Object.keys(d).filter((k) => k.startsWith('tatil_'));
  const kitalar = visitedKitalar(s);
  const ulke = COUNTRIES[s.fighter.uyruk]?.ad ?? s.fighter.uyruk;
  return (
    <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <Title kicker={L("KOLEKSİYON")} sub={L("Dövüştüğün her şehir pasaportuna bir damga ve rafına bir hediyelik eşya bırakır.")}>
        {L("Pasaport")}
      </Title>
      <LinearGradient colors={['#5a1020', '#2b070f']} style={ps.cover}>
        <Text style={ps.coverK}>{L("PASAPORT")}</Text>
        <Icon name="earth" size={40} color="#d4a017" />
        <Text style={ps.coverName}>
          {s.fighter.ad} {s.fighter.soyad.toLocaleUpperCase(LOC)}
        </Text>
        <Text style={ps.coverSub}>{ulke}</Text>
        <View style={ps.coverStats}>
          <Text style={ps.coverStat}>{L("{0} şehir", [cities.length])}</Text>
          <Text style={ps.coverDot}>·</Text>
          <Text style={ps.coverStat}>{L("{0} kıta", [kitalar.length])}</Text>
          <Text style={ps.coverDot}>·</Text>
          <Text style={ps.coverStat}>{L("{0} tatil", [tatiller.length])}</Text>
        </View>
      </LinearGradient>

      <View style={ps.kitaRow}>
        {KITA_SIRA.map((k) => (
          <View key={k} style={[ps.kita, kitalar.includes(k) && { borderColor: C.gold, backgroundColor: '#1d1708' }]}>
            <Text style={[ps.kitaText, kitalar.includes(k) && { color: C.gold }]} numberOfLines={1}>
              {KITALAR[k]()}
            </Text>
          </View>
        ))}
      </View>

      <Section>{L("DAMGALAR · {0}/{1}", [cities.length, CITIES.length])}</Section>
      <View style={ps.page}>
        {cities.length ? (
          <View style={ps.grid}>
            {cities.map((c, i) => {
              const x = d[c.id];
              const r = x?.sonuc ? SONUC[x.sonuc] : undefined;
              return <Stamp key={c.id} ad={c.ad} alt={r ? r.t() : L("ZİYARET")} renk={r?.c ?? '#3a5a8c'} rot={((i * 37) % 13) - 6} ikon="airplane" sub={SOUVENIRS[c.id]?.()} />;
            })}
          </View>
        ) : (
          <Text style={ps.empty}>{L("Henüz yurt dışında dövüşmedin. İlk deplasman maçınla ilk damgan basılır.")}</Text>
        )}
      </View>

      {tatiller.length ? (
        <>
          <Section>{L("TATİL DAMGALARI")}</Section>
          <View style={ps.page}>
            <View style={ps.grid}>
              {tatiller.map((k, i) => (
                <Stamp key={k} ad={abroadName(k) ?? k} alt={L("TATİL")} renk="#2a7a8c" rot={((i * 29) % 11) - 5} ikon="palm-tree" />
              ))}
            </View>
          </View>
        </>
      ) : null}

      <Section>{L("GİDİLMEMİŞ ŞEHİRLER")}</Section>
      <Text style={ps.left}>
        {CITIES.filter((c) => !visited.has(c.id))
          .map((c) => c.ad)
          .join(' · ') || L("Hepsini gördün. Gerçek bir dünya vatandaşısın!")}
      </Text>
    </Screen>
  );
}

const ps = StyleSheet.create({
  cover: { borderRadius: R, padding: 18, alignItems: 'center', gap: 4, marginBottom: 12, borderWidth: 1, borderColor: '#7a2333' },
  coverK: { color: '#d4a017', fontFamily: F.display, fontSize: 16, letterSpacing: 6, marginBottom: 6 },
  coverName: { color: '#f4e6c8', fontFamily: F.display, fontSize: 20, letterSpacing: 1, marginTop: 8 },
  coverSub: { color: '#d9b98c', fontFamily: F.semi, fontSize: 12 },
  coverStats: { flexDirection: 'row', gap: 8, marginTop: 8 },
  coverStat: { color: '#f4e6c8', fontFamily: F.display, fontSize: 13, letterSpacing: 1 },
  coverDot: { color: '#d9b98c' },
  kitaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  kita: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  kitaText: { color: C.faint, fontFamily: F.semi, fontSize: 11 },
  page: { backgroundColor: '#efe6d2', borderRadius: R, padding: 12, borderWidth: 1, borderColor: '#d6c7a5' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  stampWrap: { width: '30%', alignItems: 'center', marginBottom: 6 },
  stamp: { width: '100%', aspectRatio: 1, borderWidth: 2.5, borderRadius: 999, alignItems: 'center', justifyContent: 'center', padding: 6, borderStyle: 'dashed' },
  stampCity: { fontFamily: F.display, fontSize: 11, letterSpacing: 0.5, textAlign: 'center', marginTop: 2 },
  stampAlt: { fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, marginTop: 1 },
  souv: { color: '#5c4630', fontFamily: F.body, fontSize: 10, textAlign: 'center', marginTop: 4, lineHeight: 13 },
  empty: { color: '#5c4630', fontFamily: F.body, fontSize: 13, textAlign: 'center', paddingVertical: 14 },
  left: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 19 },
});
