// Memleketim: kasabanın görsel kartı. Aşamalar açıldıkça sahneye poster, salon tabelası, sokak tabelası,
// stadyum pankartı ve meydanda heykel eklenir. Memleket ziyareti ve mahalle salonunu yenileme buradan.
import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient as SvgLinear, Path, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { money } from '../engine/career';
import { canVisit, HOME_STEPS, homeOf, renovateCost, renovateGym, town, visitHome, type HomeStep } from '../engine/homeland';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { Button, Icon, Screen, Section, Title } from './components';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

function Town({ w, has, soyad }: { w: number; has: Set<HomeStep>; soyad: string }) {
  const h = w * 0.6;
  return (
    <Svg width={w} height={h} viewBox="0 0 360 216">
      <Defs>
        <SvgLinear id="tSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#f08a5d" />
          <Stop offset="1" stopColor="#3a1f3d" />
        </SvgLinear>
      </Defs>
      <Rect x={0} y={0} width={360} height={216} fill="url(#tSky)" />
      <Circle cx={290} cy={60} r={22} fill="#ffd28a" opacity={0.9} />
      {/* Uzak tepeler ve stadyum */}
      <Path d="M0 120 Q60 90 120 115 T240 108 T360 118 L360 216 L0 216 Z" fill="#2b1a33" />
      <G opacity={0.95}>
        <Path d="M250 112 Q290 92 330 112 L330 126 L250 126 Z" fill="#3b2a45" />
        {has.has('pankart') ? (
          <G>
            <Rect x={262} y={98} width={56} height={16} fill={C.red} />
            <SvgText x={290} y={110} fill="#fff" fontSize={9} fontWeight="bold" textAnchor="middle">
              {soyad.toLocaleUpperCase(LOC)}
            </SvgText>
          </G>
        ) : null}
      </G>
      {/* Evler */}
      {[0, 1, 2, 3].map((i) => (
        <G key={i} transform={`translate(${10 + i * 58} ${132 - (i % 2) * 6})`}>
          <Rect x={0} y={14} width={50} height={56} fill={['#5a3b3b', '#4a4255', '#5a4a3a', '#3f4a55'][i]} />
          <Polygon points="-4,16 25,0 54,16" fill="#2a1d24" />
          <Rect x={8} y={26} width={10} height={10} fill="#ffd28a" opacity={0.8} />
          <Rect x={32} y={26} width={10} height={10} fill="#ffd28a" opacity={i % 2 ? 0.3 : 0.8} />
        </G>
      ))}
      {/* Kahve ve poster */}
      <G transform="translate(14 178)">
        <Rect x={0} y={0} width={44} height={34} fill="#6b4a2a" />
        <SvgText x={22} y={-3} fill="#ffd28a" fontSize={7} textAnchor="middle">
          {L("KAHVE")}
        </SvgText>
        {has.has('poster') ? <Rect x={12} y={6} width={18} height={22} fill={C.red} stroke="#fff" strokeWidth={1} /> : null}
      </G>
      {/* Salon */}
      <G transform="translate(196 150)">
        <Rect x={0} y={0} width={64} height={62} fill="#2e3440" />
        <Rect x={22} y={36} width={20} height={26} fill="#1b1d24" />
        {has.has('salon') ? (
          <G>
            <Rect x={-4} y={-14} width={72} height={14} fill={C.gold} />
            <SvgText x={32} y={-4} fill="#111" fontSize={7} fontWeight="bold" textAnchor="middle">
              {`${soyad.toLocaleUpperCase(LOC)} GYM`}
            </SvgText>
          </G>
        ) : null}
      </G>
      {/* Sokak tabelası */}
      {has.has('sokak') ? (
        <G transform="translate(140 168)">
          <Rect x={-1} y={0} width={2} height={44} fill="#888" />
          <Rect x={-30} y={0} width={60} height={13} fill="#1d4ed8" stroke="#fff" strokeWidth={1} />
          <SvgText x={0} y={9} fill="#fff" fontSize={7} fontWeight="bold" textAnchor="middle">
            {L("{0} SK.", [soyad.toLocaleUpperCase(LOC)])}
          </SvgText>
        </G>
      ) : null}
      {/* Meydan ve heykel */}
      <Rect x={270} y={200} width={80} height={16} fill="#5a5048" />
      {has.has('heykel') ? (
        <G transform="translate(310 152)">
          <Rect x={-12} y={36} width={24} height={14} fill="#7a6a58" />
          <Circle cx={0} cy={6} r={6} fill="#b08d57" />
          <Path d="M-6 14 L6 14 L5 36 L-5 36 Z" fill="#b08d57" />
          <Path d="M-6 16 L-14 0 M6 16 L14 0" stroke="#b08d57" strokeWidth={4} />
          <Rect x={-8} y={24} width={16} height={4} fill={C.gold} />
        </G>
      ) : null}
      <Rect x={0} y={212} width={360} height={4} fill="#1b141f" />
    </Svg>
  );
}

export function HomelandScreen({ s, act }: { s: GameState; act: Act }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 520) - 32;
  const [msg, setMsg] = useState<string | null>(null);
  const h = homeOf(s);
  const has = new Set(h.asamalar);
  const cost = renovateCost(s);
  return (
    <Screen footer={<Button label={L("Kariyere dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'hub'))} />}>
      <Title art="sehir" kicker={L("YAŞAM")} sub={L("Ünlendikçe memleketin değişir. Her aşama kasabada iz bırakır.")}>
        {town(s)}
      </Title>
      <View style={ms.scene}>
        <Town w={w} has={has} soyad={s.fighter.soyad} />
      </View>
      {msg ? <Text style={ms.msg}>{msg}</Text> : null}
      <View style={{ gap: 8, marginTop: 4 }}>
        <Button
          label={canVisit(s) ? L("Memleketi ziyaret et") : L("Bu maçtan sonra ziyaret ettin")}
          icon="home-heart"
          tone="gold"
          disabled={!canVisit(s)}
          onPress={() => {
            buzz('hafif');
            act((x) => setMsg(visitHome(x)));
          }}
        />
        {!h.yenilendi ? (
          <Button
            label={L("Mahalle salonunu yenile · {0}", [money(cost)])}
            icon="hammer-wrench"
            tone="ghost"
            disabled={s.para < cost}
            onPress={() => {
              buzz('basari');
              act((x) => setMsg(renovateGym(x)));
            }}
          />
        ) : null}
      </View>
      <Section>{L("AŞAMALAR · {0}/{1}", [has.size, HOME_STEPS.length])}</Section>
      <View style={{ gap: 6 }}>
        {HOME_STEPS.map((st) => {
          const ok = has.has(st.id);
          return (
            <View key={st.id} style={[ms.step, !ok && { opacity: 0.55 }]}>
              <Icon name={ok ? 'check-circle' : 'lock-outline'} size={20} color={ok ? C.green : C.faint} />
              <View style={{ flex: 1 }}>
                <Text style={ms.stepT}>{st.ad()}</Text>
                {!ok ? <Text style={ms.stepH}>{st.ipucu()}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const ms = StyleSheet.create({
  scene: { borderRadius: R, overflow: 'hidden', borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  msg: { color: C.gold, fontFamily: F.semi, fontSize: 13, lineHeight: 19, textAlign: 'center', marginVertical: 6 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 12 },
  stepT: { color: C.text, fontFamily: F.bold, fontSize: 14 },
  stepH: { color: C.faint, fontFamily: F.body, fontSize: 12, marginTop: 1 },
});
