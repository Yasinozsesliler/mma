// Evim: satın aldığın evin içi. Duvarda kemerlerin, rafta kupaların, çerçevelerde aile fotoğrafların ve sanat
// eserlerin; yerde evcil hayvanın. Ev büyüdükçe yeni odalar açılır. Koleksiyonlara buradan da gidilir.
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgLinear, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { luxById } from '../engine/luxury';
import { itemById, SHOP } from '../engine/shop';
import type { GameState } from '../engine/types';
import { L } from '../i18n';
import { Button, Icon, Screen, Section, Title, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

type Theme = { wall: [string, string]; floor: string; view: 'sehir' | 'bahce' | 'deniz' | 'gokyuzu'; brick?: boolean; trim: string };
const THEMES: Theme[] = [
  { wall: ['#2a2d35', '#1d1f25'], floor: '#3b2f25', view: 'sehir', trim: '#444852' }, // salon soyunma odası (ev yok)
  { wall: ['#3a3f4a', '#2a2e36'], floor: '#4a3a2c', view: 'sehir', trim: '#555b67' },
  { wall: ['#6b3326', '#4a2219'], floor: '#3d3129', view: 'sehir', brick: true, trim: '#2b2b2b' },
  { wall: ['#4c4f5a', '#363841'], floor: '#5a4632', view: 'sehir', trim: '#6c707c' },
  { wall: ['#3f5a4a', '#2b3f33'], floor: '#6b5236', view: 'bahce', trim: '#cfc6b3' },
  { wall: ['#4a6276', '#324555'], floor: '#b89a6e', view: 'deniz', trim: '#e9e1cf' },
  { wall: ['#d9d2c3', '#b9b09d'], floor: '#e7e2d8', view: 'deniz', trim: '#c9a227' },
  { wall: ['#1f2a3a', '#141c28'], floor: '#2a2a2e', view: 'gokyuzu', trim: '#c9a227' },
  { wall: ['#5a2330', '#3d1520'], floor: '#4a2a1c', view: 'bahce', trim: '#d4a017' },
];

/** Sahip olunan en iyi ev (0 = ev yok). */
export function houseLevel(s: GameState) {
  return Math.max(0, ...(s.envanter ?? []).map(itemById).filter((x) => x?.grup === 'ev').map((x) => x!.seviye ?? 0));
}

function View_({ kind, x, y, w, h }: { kind: Theme['view']; x: number; y: number; w: number; h: number }) {
  if (kind === 'bahce')
    return (
      <G>
        <Rect x={x} y={y} width={w} height={h} fill="#87b5d9" />
        <Rect x={x} y={y + h * 0.62} width={w} height={h * 0.38} fill="#4f8a3c" />
        <Circle cx={x + w * 0.25} cy={y + h * 0.55} r={h * 0.18} fill="#2f6b2a" />
        <Circle cx={x + w * 0.7} cy={y + h * 0.5} r={h * 0.22} fill="#3a7a32" />
      </G>
    );
  if (kind === 'deniz')
    return (
      <G>
        <Rect x={x} y={y} width={w} height={h} fill="#f3a35c" />
        <Rect x={x} y={y + h * 0.55} width={w} height={h * 0.45} fill="#2d6a9a" />
        <Circle cx={x + w * 0.62} cy={y + h * 0.52} r={h * 0.14} fill="#ffd28a" />
        <Rect x={x} y={y + h * 0.58} width={w} height={2} fill="#ffd28a" opacity={0.6} />
      </G>
    );
  if (kind === 'gokyuzu')
    return (
      <G>
        <Rect x={x} y={y} width={w} height={h} fill="#0b1630" />
        {[0.1, 0.3, 0.55, 0.8].map((k, i) => (
          <Circle key={i} cx={x + w * k} cy={y + h * (0.2 + (i % 2) * 0.15)} r={1.2} fill="#fff" />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Rect key={i} x={x + i * (w / 6)} y={y + h * (0.72 + (i % 3) * 0.06)} width={w / 6 - 2} height={h} fill="#1b2744" />
        ))}
      </G>
    );
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} fill="#141a2e" />
      <Circle cx={x + w * 0.8} cy={y + h * 0.2} r={h * 0.09} fill="#e8e3c8" />
      {[0, 1, 2, 3, 4].map((i) => (
        <G key={i}>
          <Rect x={x + i * (w / 5)} y={y + h * (0.35 + (i % 3) * 0.12)} width={w / 5 - 3} height={h} fill="#232b45" />
          <Rect x={x + i * (w / 5) + 4} y={y + h * (0.45 + (i % 3) * 0.12)} width={3} height={3} fill="#f2c14e" />
        </G>
      ))}
    </G>
  );
}

function Room({ s, w }: { s: GameState; w: number }) {
  const lvl = houseLevel(s);
  const t = THEMES[Math.min(lvl, THEMES.length - 1)];
  const H = w * 0.66;
  const belts = (s.kemerler ?? []).slice(0, 3);
  const kupa = Math.min(7, (s.oduller ?? []).length + (s.hatiralar ?? []).filter((h) => h.tur === 'kupa' || h.tur === 'madalya').length + (s.unvanlar ?? []).length);
  const aile = (s.hatiralar ?? []).filter((h) => h.kat === 'aile').length;
  const sanat = (s.luks ?? []).map((x) => luxById(x.id)).filter((x) => x?.kat === 'sanat');
  const frames = [...sanat.slice(0, 2).map((x) => ({ c: x!.renk, art: true })), ...Array.from({ length: Math.min(3, aile) }, () => ({ c: '#e8d9c0', art: false }))].slice(0, 4);
  const pet = (s.hayvanlar ?? [])[0];
  return (
    <Svg width={w} height={H} viewBox="0 0 360 238">
      <Defs>
        <SvgLinear id="hWall" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.wall[0]} />
          <Stop offset="1" stopColor={t.wall[1]} />
        </SvgLinear>
        <RadialGradient id="hLamp" cx="50%" cy="0%" r="80%">
          <Stop offset="0" stopColor="#ffe3a3" stopOpacity={0.28} />
          <Stop offset="1" stopColor="#ffe3a3" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={360} height={172} fill="url(#hWall)" />
      {t.brick
        ? Array.from({ length: 10 }, (_, r) => <Line key={r} x1={0} y1={r * 17} x2={360} y2={r * 17} stroke="#00000033" strokeWidth={1} />)
        : null}
      {/* Pencere */}
      <Rect x={18} y={26} width={104} height={92} rx={3} fill={t.trim} />
      <View_ kind={t.view} x={22} y={30} w={96} h={84} />
      <Line x1={70} y1={30} x2={70} y2={114} stroke={t.trim} strokeWidth={3} />
      <Line x1={22} y1={72} x2={118} y2={72} stroke={t.trim} strokeWidth={3} />
      {/* Kemerler */}
      {belts.length ? (
        belts.map((b, i) => (
          <G key={i} transform={`translate(${150 + i * 64} 34)`}>
            <Rect x={0} y={6} width={58} height={14} rx={6} fill="#141414" />
            <Ellipse cx={29} cy={13} rx={15} ry={12} fill="#d4a017" stroke="#8a6a0b" strokeWidth={1.5} />
            <Circle cx={29} cy={13} r={6} fill={b.aktif ? '#e63946' : '#3a86ff'} />
          </G>
        ))
      ) : (
        <Rect x={160} y={38} width={160} height={22} rx={4} fill="#00000033" />
      )}
      {/* Raf ve kupalar */}
      <Rect x={146} y={100} width={196} height={6} fill={t.trim} />
      {Array.from({ length: kupa }, (_, i) => (
        <G key={i} transform={`translate(${156 + i * 26} 78)`}>
          <Path d="M2 0 h14 v6 a7 7 0 0 1 -14 0 z" fill="#f2c14e" />
          <Rect x={7} y={12} width={4} height={6} fill="#c99a20" />
          <Rect x={3} y={18} width={12} height={4} fill="#8a6a0b" />
        </G>
      ))}
      {/* Çerçeveler: sanat eserleri ve aile fotoğrafları */}
      {frames.map((f, i) => (
        <G key={i} transform={`translate(${152 + i * 48} 118)`}>
          <Rect x={0} y={0} width={38} height={30} fill={f.art ? '#c9a227' : '#2b2b2b'} />
          <Rect x={3} y={3} width={32} height={24} fill={f.c} />
          {f.art ? <Path d="M5 25 L14 12 L22 20 L28 14 L33 25 Z" fill="#00000044" /> : <Circle cx={19} cy={14} r={6} fill="#c79a7a" />}
        </G>
      ))}
      {/* Zemin */}
      <Rect x={0} y={170} width={360} height={68} fill={t.floor} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <Line key={i} x1={i * 60} y1={170} x2={i * 60 - 20} y2={238} stroke="#00000022" strokeWidth={1} />
      ))}
      <Rect x={0} y={168} width={360} height={4} fill={t.trim} />
      {/* Kanepe ve sehpa */}
      <Ellipse cx={120} cy={214} rx={100} ry={8} fill="#00000040" />
      <Rect x={30} y={150} width={180} height={34} rx={10} fill={lvl >= 6 ? '#e8e2d4' : lvl >= 3 ? '#7a2e2e' : '#3e4452'} />
      <Rect x={22} y={170} width={196} height={34} rx={10} fill={lvl >= 6 ? '#d8d0bd' : lvl >= 3 ? '#8f3535' : '#4a5160'} />
      <Rect x={84} y={204} width={74} height={6} rx={3} fill="#2a1f17" />
      {/* Torba (ev salonu) */}
      {lvl >= 2 ? (
        <G>
          <Line x1={300} y1={0} x2={300} y2={120} stroke="#555" strokeWidth={2} />
          <Rect x={284} y={120} width={32} height={62} rx={12} fill="#b3261e" />
          <Rect x={284} y={140} width={32} height={6} fill="#00000033" />
        </G>
      ) : null}
      {/* Evcil hayvan */}
      {pet ? (
        <G transform="translate(236 196)">
          <Ellipse cx={14} cy={18} rx={16} ry={4} fill="#00000040" />
          <Ellipse cx={14} cy={10} rx={14} ry={8} fill="#c58b4f" />
          <Circle cx={26} cy={4} r={7} fill="#c58b4f" />
          <Circle cx={28} cy={3} r={1.3} fill="#111" />
          <Path d="M0 8 q-6 -6 -2 -10" stroke="#c58b4f" strokeWidth={3} fill="none" />
        </G>
      ) : null}
      <Rect x={0} y={0} width={360} height={238} fill="url(#hLamp)" />
      {lvl === 0 ? <Rect x={0} y={0} width={360} height={238} fill="#000" opacity={0.25} /> : null}
    </Svg>
  );
}

type Oda = { ad: string; ikon: IconName; acik: boolean; metin: string; kilit: string };

export function HomeScreen({ s, act }: { s: GameState; act: Act }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 520) - 32;
  const lvl = houseLevel(s);
  const ev = SHOP.filter((x) => x.grup === 'ev').find((x) => x.seviye === lvl);
  const kids = s.cocuklar ?? [];
  const cars = (s.envanter ?? []).map(itemById).filter((x) => x?.alt === 'araba').length + (s.luks ?? []).filter((x) => luxById(x.id)?.kat === 'araba').length;
  const odalar: Oda[] = [
    { ad: L("Oturma odası"), ikon: 'sofa', acik: lvl >= 1, metin: L("Maç tekrarlarını izlediğin kanepe."), kilit: L("Bir ev kirala ya da satın al.") },
    { ad: L("Kupa duvarı"), ikon: 'trophy', acik: lvl >= 1, metin: L("{0} kemer · {1} ödül · {2} hatıra", [(s.kemerler ?? []).length, (s.oduller ?? []).length, (s.hatiralar ?? []).length]), kilit: L("Bir ev kirala ya da satın al.") },
    { ad: L("Ev salonu"), ikon: 'boxing-glove', acik: lvl >= 2, metin: L("Tavandan sarkan bir torba. Gece yarısı antrenmanları burada."), kilit: L("Stüdyo Loft ya da daha büyük bir ev.") },
    { ad: L("Çocuk odası"), ikon: 'teddy-bear', acik: kids.length > 0 && lvl >= 3, metin: kids.length ? kids.map((k) => k.ad).join(', ') : '', kilit: lvl >= 3 ? L("Çocuğun olunca açılır.") : L("Şehir merkezinde daire ya da daha büyük bir ev.") },
    { ad: L("Garaj"), ikon: 'garage-variant', acik: lvl >= 4, metin: L("{0} araç", [cars]), kilit: L("Bahçeli müstakil ev ya da daha büyük bir ev.") },
    { ad: L("Havuz ve sauna"), ikon: 'pool', acik: lvl >= 6, metin: L("Kamp sonrası toparlanmanın en keyifli hâli."), kilit: L("Deniz manzaralı villa ya da daha büyük bir ev.") },
  ];
  const go = (phase: GameState['phase']) => act((x) => (x.phase = phase));
  return (
    <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => go('hub')} />}>
      <Title art="sehir" kicker={L("YAŞAM")} sub={ev ? ev.aciklama : L("Henüz kendi evin yok; salonun soyunma odasında bir şiltede yatıyorsun.")}>
        {ev ? ev.ad : L("Evim")}
      </Title>
      <View style={hs.scene}>
        <Room s={s} w={w} />
      </View>
      {ev ? (
        <View style={hs.perks}>
          {ev.dinlenme ? <Text style={hs.perk}>{L("+%{0} iyileşme", [Math.round(ev.dinlenme * 100)])}</Text> : null}
          {ev.motivasyon ? <Text style={hs.perk}>{L("+{0} kamp motivasyonu", [ev.motivasyon])}</Text> : null}
        </View>
      ) : (
        <Button label={L("Ev bak")} icon="home-search" tone="gold" onPress={() => go('magaza')} />
      )}

      <Section>{L("ODALAR")}</Section>
      <View style={{ gap: 6 }}>
        {odalar.map((o) => (
          <View key={o.ad} style={[hs.room, !o.acik && { opacity: 0.55 }]}>
            <Icon name={o.acik ? o.ikon : 'lock-outline'} size={20} color={o.acik ? C.gold : C.faint} />
            <View style={{ flex: 1 }}>
              <Text style={hs.roomName}>{o.ad}</Text>
              <Text style={hs.roomText}>{o.acik ? o.metin : o.kilit}</Text>
            </View>
          </View>
        ))}
      </View>

      <Section>{L("KOLEKSİYONLARIN")}</Section>
      <View style={hs.links}>
        {(
          [
            { ad: L("Hatıralar"), ikon: 'bank', n: (s.hatiralar ?? []).length, p: 'muze' },
            { ad: L("Pasaport"), ikon: 'passport', n: Object.keys(s.damgalar ?? s.sehirler ?? {}).length, p: 'pasaport' },
            { ad: L("Lüks"), ikon: 'diamond-stone', n: (s.luks ?? []).length, p: 'luks' },
            { ad: L("Tatil"), ikon: 'beach', n: (s.hatiralar ?? []).filter((h) => h.kat === 'tatil').length, p: 'tatil' },
          ] as { ad: string; ikon: IconName; n: number; p: GameState['phase'] }[]
        ).map((l) => (
          <Pressable key={l.ad} onPress={() => go(l.p)} style={({ pressed }) => [hs.link, pressed && { borderColor: C.gold }]}>
            <Icon name={l.ikon} size={22} color={C.gold} />
            <Text style={hs.linkT}>{l.ad}</Text>
            <Text style={hs.linkN}>{l.n}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const hs = StyleSheet.create({
  scene: { borderRadius: R, overflow: 'hidden', borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  perks: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  perk: { color: C.green, fontFamily: F.semi, fontSize: 12, backgroundColor: '#0f2418', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  room: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12 },
  roomName: { color: C.text, fontFamily: F.bold, fontSize: 14 },
  roomText: { color: C.faint, fontFamily: F.body, fontSize: 12, marginTop: 1 },
  links: { flexDirection: 'row', gap: 8 },
  link: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, paddingVertical: 12 },
  linkT: { color: C.text, fontFamily: F.semi, fontSize: 12 },
  linkN: { color: C.faint, fontFamily: F.display, fontSize: 12 },
});
