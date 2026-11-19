// Vücudum: yaş evresi, vücut üzerinde sakatlıklar ve kronik izler, sakin haftalık rutin (beslenme ve uyku).
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { ageStage, BESLENME, BOLGE, rutinOf, UYKU, type Beslenme, type Uyku } from '../engine/body';
import { brainLabel, brainOf } from '../engine/brain';
import { growthMultiplier } from '../engine/character';
import type { GameState, StatKey } from '../engine/types';
import { L } from '../i18n';
import { Button, Icon, Screen, Section, Title, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

/** Vücut bölgelerinin silüet üzerindeki yeri (viewBox 120x220). */
const SPOT: Record<StatKey, [number, number]> = {
  cene: [60, 22],
  iq: [60, 22],
  yer: [36, 52],
  kondisyon: [70, 78],
  vurus: [18, 118],
  gures: [48, 160],
  hiz: [72, 204],
};

function Silhouette({ izler, aktif }: { izler: StatKey[]; aktif: StatKey[] }) {
  const fill = '#2a2d35';
  return (
    <Svg width={150} height={260} viewBox="0 0 120 220">
      <G>
        <Circle cx={60} cy={22} r={15} fill={fill} />
        <Rect x={54} y={36} width={12} height={8} fill={fill} />
        <Path d="M30 46 Q60 38 90 46 L94 110 Q60 118 26 110 Z" fill={fill} />
        <Path d="M30 48 L16 100 L20 124 L28 122 L28 102 L38 62 Z" fill={fill} />
        <Path d="M90 48 L104 100 L100 124 L92 122 L92 102 L82 62 Z" fill={fill} />
        <Path d="M30 108 L90 108 L86 214 L66 214 L60 140 L54 214 L34 214 Z" fill={fill} />
      </G>
      {izler.map((k) => (
        <G key={`i${k}`}>
          <Circle cx={SPOT[k][0]} cy={SPOT[k][1]} r={9} fill="#ff8a5c33" />
          <Path d={`M${SPOT[k][0] - 5} ${SPOT[k][1] - 3} l10 6 M${SPOT[k][0] - 5} ${SPOT[k][1] + 3} l10 -6`} stroke="#ff8a5c" strokeWidth={1.6} />
        </G>
      ))}
      {aktif.map((k) => (
        <G key={`a${k}`}>
          <Circle cx={SPOT[k][0]} cy={SPOT[k][1]} r={12} fill="#ff4d5e44" />
          <Circle cx={SPOT[k][0]} cy={SPOT[k][1]} r={5} fill="#ff4d5e" />
        </G>
      ))}
      <Ellipse cx={60} cy={216} rx={34} ry={3} fill="#00000066" />
    </Svg>
  );
}

function Opt({ on, ad, aciklama, ikon, onPress }: { on: boolean; ad: string; aciklama: string; ikon: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[bs.opt, on && bs.optOn]}>
      <Icon name={ikon as IconName} size={20} color={on ? C.gold : C.dim} />
      <View style={{ flex: 1 }}>
        <Text style={[bs.optT, on && { color: C.text }]}>{ad}</Text>
        <Text style={bs.optD}>{aciklama}</Text>
      </View>
      <Icon name={on ? 'radiobox-marked' : 'radiobox-blank'} size={18} color={on ? C.gold : C.faint} />
    </Pressable>
  );
}

export function BodyScreen({ s, act }: { s: GameState; act: Act }) {
  const yas = s.fighter.yas;
  const st = ageStage(yas);
  const r = rutinOf(s);
  const izler = (s.izler ?? []).map((x) => x.bolge);
  const aktif = s.sakatliklar.map((x) => x.stat);
  const pct = Math.min(1, Math.max(0, (yas - 18) / 27));
  const set = (patch: Partial<typeof r>) => act((x) => (x.rutin = { ...rutinOf(x), ...patch }));
  return (
    <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <Title art="elit" kicker={L("ANTRENMAN")} sub={L("Yaşın, izlerin ve günlük rutinin. Küçük seçimler, uzun bir kariyerde büyük fark yaratır.")}>
        {L("Vücudum")}
      </Title>
      <View style={bs.top}>
        <Silhouette izler={izler} aktif={aktif} />
        <View style={{ flex: 1, gap: 10 }}>
          <View>
            <Text style={bs.k}>{L("SAĞLIK")}</Text>
            <Text style={[bs.v, { color: s.saglik < 50 ? '#ff4d5e' : s.saglik < 75 ? C.orange : C.green }]}>{s.saglik}/100</Text>
          </View>
          <View>
            <Text style={bs.k}>{L("BEYİN SAĞLIĞI")}</Text>
            <Text style={bs.vs}>{brainLabel(brainOf(s))}</Text>
          </View>
          <View>
            <Text style={bs.k}>{L("GELİŞİM HIZI")}</Text>
            <Text style={bs.vs}>×{growthMultiplier(yas).toFixed(2)}</Text>
          </View>
          <View style={bs.legend}>
            <View style={[bs.dot, { backgroundColor: '#ff4d5e' }]} />
            <Text style={bs.legT}>{L("Sakatlık")}</Text>
            <View style={[bs.dot, { backgroundColor: '#ff8a5c' }]} />
            <Text style={bs.legT}>{L("Kronik iz")}</Text>
          </View>
        </View>
      </View>

      <Section>{L("YAŞ EVRESİ")}</Section>
      <View style={bs.card}>
        <Text style={[bs.stage, { color: st.renk }]}>
          {st.ad} · {L("{0} yaşında", [yas])}
        </Text>
        <View style={bs.curve}>
          <View style={[bs.seg, { flex: 7, backgroundColor: '#3ecf7a55' }]} />
          <View style={[bs.seg, { flex: 6, backgroundColor: '#f2c14e55' }]} />
          <View style={[bs.seg, { flex: 3, backgroundColor: '#3aa8ff55' }]} />
          <View style={[bs.seg, { flex: 11, backgroundColor: '#ff8a5c55' }]} />
          <View style={[bs.marker, { left: `${pct * 100}%` }]} />
        </View>
        <View style={bs.ages}>
          {[18, 25, 31, 34, 45].map((a) => (
            <Text key={a} style={bs.age}>
              {a}
            </Text>
          ))}
        </View>
        <Text style={bs.desc}>{st.aciklama}</Text>
      </View>

      <Section>{L("KRONİK İZLER · {0}", [(s.izler ?? []).length])}</Section>
      {(s.izler ?? []).length ? (
        <View style={{ gap: 6 }}>
          {s.izler!.map((x) => (
            <View key={x.bolge} style={bs.scar}>
              <Icon name="bandage" size={18} color="#ff8a5c" />
              <Text style={bs.scarT}>
                {BOLGE[x.bolge]()} · {x.ad}
              </Text>
              <Text style={bs.scarA}>{L("{0} yaşında", [x.yas])}</Text>
            </View>
          ))}
          <Text style={bs.note}>{L("Her iz kampta sakatlık riskini biraz artırır. Fizyoterapist bu riski azaltır.")}</Text>
        </View>
      ) : (
        <Text style={bs.note}>{L("Vücudunda kalıcı iz yok. Ağır sakatlıklar iyileşirken bazen iz bırakır.")}</Text>
      )}

      <Section>{L("BESLENME")}</Section>
      <View style={{ gap: 6 }}>
        {(Object.keys(BESLENME) as Beslenme[]).map((k) => (
          <Opt key={k} on={r.beslenme === k} ad={BESLENME[k].ad()} aciklama={BESLENME[k].aciklama(s)} ikon={BESLENME[k].ikon} onPress={() => set({ beslenme: k })} />
        ))}
      </View>
      <Section>{L("UYKU")}</Section>
      <View style={{ gap: 6 }}>
        {(Object.keys(UYKU) as Uyku[]).map((k) => (
          <Opt key={k} on={r.uyku === k} ad={UYKU[k].ad()} aciklama={UYKU[k].aciklama()} ikon={UYKU[k].ikon} onPress={() => set({ uyku: k })} />
        ))}
      </View>
    </Screen>
  );
}

const bs = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12 },
  k: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1.2 },
  v: { fontFamily: F.display, fontSize: 22 },
  vs: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legT: { color: C.faint, fontFamily: F.body, fontSize: 11, marginRight: 6 },
  card: { backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12 },
  stage: { fontFamily: F.display, fontSize: 16, letterSpacing: 0.5 },
  curve: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 10 },
  seg: { height: 10 },
  marker: { position: 'absolute', top: -3, width: 4, height: 16, marginLeft: -2, borderRadius: 2, backgroundColor: '#fff' },
  ages: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  age: { color: C.faint, fontFamily: F.semi, fontSize: 10 },
  desc: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 18, marginTop: 8 },
  scar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 10 },
  scarT: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13 },
  scarA: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  note: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 18 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12 },
  optOn: { borderColor: C.gold, backgroundColor: '#1d1708' },
  optT: { color: C.dim, fontFamily: F.bold, fontSize: 14 },
  optD: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 1 },
});
