// Dünya turu haritası: stilize kıtalar, dövüşülen şehirlerin iğneleri, kıta rozetleri ve kilometre taşları.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';
import { CITIES, cityPin, HOME_ID, homePin, KITALAR, nextCityStep, nextKitaStep, visitedCount, visitedKitalar, type Kita, type Pin } from '../engine/worldMap';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { Button, Card, Screen, Section, Title } from './components';
import type { Act } from './GameScreens';
import { C, F } from './theme';

// Kaba kıta hatları (boylam, enlem). Görüntü eşdikdörtgen: x = boylam + 180, y = 82 - enlem.
const LANDS: number[][] = [
  // Kuzey Amerika
  [-168, 66, -140, 70, -95, 72, -80, 63, -62, 56, -55, 48, -67, 45, -75, 38, -81, 31, -80, 25, -82, 29, -90, 30, -97, 26, -97, 21, -88, 21, -87, 15, -83, 9, -78, 8, -85, 11, -92, 15, -105, 20, -110, 24, -115, 30, -118, 34, -124, 40, -124, 48, -135, 58, -152, 60, -165, 62],
  // Grönland
  [-55, 60, -45, 60, -20, 70, -20, 80, -60, 82, -72, 77, -55, 68],
  // Güney Amerika
  [-78, 8, -60, 10, -50, 0, -35, -6, -39, -15, -48, -26, -58, -38, -65, -42, -68, -55, -74, -50, -72, -35, -71, -18, -81, -5, -80, 1],
  // Avrasya
  [-10, 36, -9, 43, -2, 44, -5, 48, 2, 51, 8, 54, 5, 58, 5, 62, 15, 69, 25, 71, 40, 67, 60, 70, 80, 73, 100, 77, 120, 73, 140, 72, 160, 70, 180, 68, 180, 64, 160, 60, 155, 57, 140, 54, 135, 43, 129, 35, 122, 31, 121, 25, 110, 20, 108, 11, 104, 1, 100, 7, 98, 16, 92, 22, 88, 22, 80, 15, 77, 8, 72, 20, 67, 25, 57, 25, 57, 22, 52, 16, 43, 13, 39, 21, 35, 28, 34, 31, 36, 36, 28, 36, 26, 40, 23, 37, 19, 41, 18, 40, 16, 38, 12, 44, 8, 44, 3, 43, -1, 37, -6, 36],
  // Britanya ve İrlanda
  [-5.7, 50, 1.5, 51, 0, 53, -2, 56, -3, 58.6, -5, 58.5, -6, 56, -4.8, 54.5, -3, 53.5, -4.5, 52],
  [-10, 51.5, -6, 52, -6, 54.5, -8, 55.3, -10, 54],
  // Afrika ve Madagaskar
  [-17, 21, -10, 30, -6, 36, 10, 37, 20, 32, 32, 31, 34, 28, 43, 12, 51, 12, 40, -2, 40, -15, 33, -26, 20, -35, 15, -28, 12, -15, 13, -5, 9, 4, -8, 4, -15, 10, -17, 15],
  [44, -16, 50, -15, 47, -25, 44, -23],
  // Avustralya ve Yeni Zelanda
  [114, -22, 122, -17, 131, -11, 137, -12, 142, -11, 146, -19, 153, -27, 150, -37, 141, -38, 131, -31, 115, -34],
  [172, -34, 178, -38, 174, -41, 167, -46, 171, -44],
  // Japonya, Borneo, Sumatra, Filipinler
  [130, 31, 135, 34, 140, 35, 141, 41, 140, 38, 133, 35],
  [109, 1, 117, 7, 119, -1, 116, -4, 110, -3],
  [95, 5, 106, -6, 102, -4],
  [120, 18, 122, 18, 126, 7, 122, 7, 120, 14],
];
const W = 360;
const H = 140;
const toXY = (lon: number, lat: number) => ({ x: lon + 180, y: 82 - lat });
const pts = (a: number[]) => {
  const out: string[] = [];
  for (let i = 0; i < a.length; i += 2) {
    const p = toXY(a[i], a[i + 1]);
    out.push(`${p.x},${p.y}`);
  }
  return out.join(' ');
};

function PinDot({ p, n, home, on, onPress }: { p: Pin; n: number; home: boolean; on: boolean; onPress: () => void }) {
  const { x, y } = toXY(p.lon, p.lat);
  const size = n ? Math.min(14, 7 + n) : 5;
  const color = home ? C.red : n ? C.gold : '#ffffff40';
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{ position: 'absolute', left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: size / 2, backgroundColor: color, borderWidth: on ? 2 : n ? 1 : 0, borderColor: on ? '#fff' : '#0008' }}
    />
  );
}

export function WorldMapScreen({ s, act }: { s: GameState; act: Act }) {
  const visited = s.sehirler ?? {};
  const [sel, setSel] = useState<string | null>(null);
  const home = homePin(s);
  const kitalar = visitedKitalar(s);
  const nc = nextCityStep(s);
  const nk = nextKitaStep(s);
  const list = Object.entries(visited)
    .map(([id, n]) => ({ p: cityPin(s, id), n, id }))
    .filter((x): x is { p: Pin; n: number; id: string } => !!x.p)
    .sort((a, b) => b.n - a.n);
  const selPin = sel ? cityPin(s, sel) : undefined;
  const selFights = sel ? s.gecmis.filter((g) => g.sehir === sel) : [];
  // Son maçların rotası: şehirden şehre çizgiler
  const route = s.gecmis
    .slice(0, 12)
    .map((g) => (g.sehir ? cityPin(s, g.sehir) : undefined))
    .filter((p): p is Pin => !!p)
    .reverse();
  return (
    <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <Title art="sehir" kicker={L("DÜNYA TURU")} sub={L("Her maç bir şehirde. Yeni şehirler ve kıtalar kilometre taşı ödülleri getirir.")}>
        {L("{0} şehir · {1} kıta", [visitedCount(s), kitalar.length])}
      </Title>
      <View style={st.map}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {LANDS.map((a, i) => (
            <Polygon key={i} points={pts(a)} fill="#1d2430" stroke="#2c3646" strokeWidth={0.6} />
          ))}
          {route.slice(1).map((p, i) => {
            const a = toXY(route[i].lon, route[i].lat);
            const b = toXY(p.lon, p.lat);
            return <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.gold} strokeOpacity={0.35} strokeWidth={0.7} strokeDasharray="2,2" />;
          })}
        </Svg>
        {CITIES.map((p) => (
          <PinDot key={p.id} p={p} n={visited[p.id] ?? 0} home={false} on={sel === p.id} onPress={() => setSel(p.id)} />
        ))}
        <PinDot p={home} n={visited[HOME_ID] ?? 1} home on={sel === HOME_ID} onPress={() => setSel(HOME_ID)} />
      </View>
      {selPin ? (
        <Card>
          <Text style={st.selTitle}>
            {sel === HOME_ID ? '🏠 ' : visited[selPin.id] ? '📍 ' : '◌ '}
            {selPin.ad} · {KITALAR[selPin.kita]()}
          </Text>
          <Text style={st.dim}>
            {selFights.length
              ? selFights.slice(0, 4).map((g) => `${g.sonuc} · ${g.rakip} (${g.yontem})`).join('\n')
              : visited[selPin.id]
                ? L("{0} maç", [visited[selPin.id]])
                : L("Burada henüz dövüşmedin.")}
          </Text>
        </Card>
      ) : null}
      <Section>{L("KITALAR")}</Section>
      <View style={st.chips}>
        {(Object.keys(KITALAR) as Kita[]).map((k) => {
          const on = kitalar.includes(k);
          return (
            <View key={k} style={[st.chip, on && st.chipOn]}>
              <Text style={[st.chipText, on && { color: '#111' }]}>{on ? '✓ ' : ''}{KITALAR[k]()}</Text>
            </View>
          );
        })}
      </View>
      <Text style={st.dim}>
        {nc ? L("Sonraki şehir ödülü: {0}/{1}", [visitedCount(s), nc]) : L("Bütün şehir ödülleri alındı.")}
        {'  ·  '}
        {nk ? L("Sonraki kıta ödülü: {0}/{1}", [kitalar.length, nk]) : L("Bütün kıta ödülleri alındı.")}
      </Text>
      <Section>{L("ŞEHİRLER")}</Section>
      {list.length ? (
        list.map(({ p, n, id }) => (
          <Pressable key={id} onPress={() => setSel(id)} style={st.row}>
            <Text style={st.rowName}>
              {id === HOME_ID ? '🏠 ' : '📍 '}
              {p.ad}
            </Text>
            <Text style={st.rowCount}>{L("{0} maç", [n])}</Text>
          </Pressable>
        ))
      ) : (
        <Text style={st.dim}>{L("İlk maçından sonra harita dolmaya başlar.")}</Text>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  map: { width: '100%', aspectRatio: W / H, backgroundColor: '#0d1117', borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 10 },
  selTitle: { color: C.text, fontFamily: F.bold, fontSize: 15, marginBottom: 4 },
  dim: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 18, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.card },
  chipOn: { backgroundColor: C.gold, borderColor: C.gold },
  chipText: { color: C.dim, fontFamily: F.semi, fontSize: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border },
  rowName: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  rowCount: { color: C.gold, fontFamily: F.bold, fontSize: 13 },
});
