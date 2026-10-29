// Basın toplantısı sahnesi: logolu pano, masada iki dövüşçü ve mikrofonlar, önde flaş patlatan gazeteciler.
// Gazeteci sorar, oyuncu üç tarzdan birini seçer; salonun tepkisi ve ikinci soru gelir.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Rect, Text as SvgText } from 'react-native-svg';
import { sfx } from '../audio';
import { currentOrg } from '../engine/character';
import { ORGS } from '../engine/data';
import { claimViral, viralPay, type PressStyle } from '../engine/pressConf';
import { lookFor } from '../engine/tale';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { AdOffer } from './AdOffer';
import { Button, Icon, Screen, SLANT, upName, type IconName } from './components';
import { FighterAvatar } from './FighterAvatar';
import { C, F, R } from './theme';

const STYLE: Record<PressStyle, { ad: () => string; ikon: IconName; renk: string }> = {
  mutevazi: { ad: () => L("Alçakgönüllü"), ikon: 'hand-heart', renk: C.green },
  iddiali: { ad: () => L("İddialı"), ikon: 'fire', renk: C.red },
  espri: { ad: () => L("Esprili"), ikon: 'emoticon-lol-outline', renk: C.gold },
};

function Stage({ w, org }: { w: number; org: string }) {
  const h = 200;
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 260);
    return () => clearInterval(id);
  }, []);
  const flashes = [0.12, 0.3, 0.52, 0.7, 0.88].map((x, i) => ({ x, on: (t + i * 3) % 7 === 0 }));
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={w} height={h} fill="#14070a" />
      {/* Logolu pano */}
      {Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 6 }, (_, c) => (
          <SvgText key={`${r}-${c}`} x={(c + (r % 2) * 0.5) * (w / 5) - 20} y={18 + r * 22} fill="#ffffff14" fontSize={11} fontWeight="bold">
            {org}
          </SvgText>
        )),
      )}
      {/* Masa */}
      <Rect x={w * 0.08} y={118} width={w * 0.84} height={14} fill="#1c1d22" />
      <Rect x={w * 0.08} y={132} width={w * 0.84} height={30} fill={C.red} opacity={0.85} />
      <SvgText x={w / 2} y={152} fill="#fff" fontSize={13} fontWeight="bold" textAnchor="middle" letterSpacing={4}>
        {org}
      </SvgText>
      {/* Mikrofonlar */}
      {[0.3, 0.7].map((x) => (
        <G key={x}>
          <Rect x={w * x - 1.5} y={98} width={3} height={20} fill="#555" />
          <Ellipse cx={w * x} cy={96} rx={5} ry={7} fill="#2b2b2b" />
        </G>
      ))}
      {/* Gazeteciler ve flaşlar */}
      {flashes.map((f, i) => (
        <G key={i}>
          <Circle cx={w * f.x} cy={h + 4} r={22} fill="#0a0a0c" />
          <Rect x={w * f.x - 9} y={h - 30} width={18} height={11} rx={2} fill="#222" />
          {f.on ? <Circle cx={w * f.x} cy={h - 25} r={16} fill="#ffffff" opacity={0.85} /> : null}
        </G>
      ))}
    </Svg>
  );
}

export function PressConference({ s, header, choose, act }: { s: GameState; header: ReactNode; choose: (v: string | number) => void; act: (fn: (s: GameState) => void) => void }) {
  const p = s.pending.kamp!.basinSahne!;
  const o = s.pending.rakip!;
  const { width } = useWindowDimensions();
  const w = Math.min(width, 520) - 32;
  const n = p.secimler.length;
  const bitti = n >= p.sorular.length;
  const [goster, setGoster] = useState(false);
  const q = p.sorular[Math.min(n, p.sorular.length - 1)];
  const org = ORGS[currentOrg(s)].kisa.toLocaleUpperCase(LOC);
  useEffect(() => {
    sfx('swell', 0.3);
  }, []);
  const cevap = (st: PressStyle) => {
    buzz(st === 'iddiali' ? 'orta' : 'hafif');
    sfx(st === 'iddiali' ? 'roar' : st === 'espri' ? 'applause' : 'chime', 0.6);
    choose(`cevap:${st}`);
    setGoster(true);
  };
  const tepkiGoster = goster && n > 0;
  return (
    <Screen footer={bitti ? <Button label={L("Devam")} icon="arrow-right" tone="gold" onPress={() => choose('devam')} /> : undefined}>
      {header}
      <View style={[st.stage, { width: w }]}>
        <Stage w={w} org={org} />
        <Text style={[st.kicker, SLANT]}>{L("BASIN TOPLANTISI")}</Text>
        <View style={st.row}>
          <View style={st.side}>
            <FighterAvatar look={s.fighter.gorunum} size={70} ring={C.red} />
            <Text style={st.name} numberOfLines={1}>
              {upName(s.fighter.soyad, s.fighter.uyruk)}
            </Text>
          </View>
          <View style={st.side}>
            <FighterAvatar look={lookFor(o)} size={70} ring={C.blue} />
            <Text style={st.name} numberOfLines={1}>
              {upName(o.soyad, o.uyruk)}
            </Text>
          </View>
        </View>
      </View>

      {tepkiGoster && p.tepki ? (
        <View style={st.react}>
          <Icon name="account-voice" size={18} color={C.gold} />
          <Text style={st.reactT}>{p.tepki}</Text>
        </View>
      ) : null}

      {!bitti ? (
        <>
          <LinearGradient colors={['#1b1c22', '#121318']} style={st.q}>
            <Text style={st.muhabir}>
              🎤 {q.muhabir} · {L("Soru {0}/{1}", [n + 1, p.sorular.length])}
            </Text>
            {q.tarihi ? <Text style={st.efsane}>{L("📜 EFSANE SORUSU · Tarihteki cevabı bul, maçı kazan: ek gelir")}</Text> : null}
            <Text style={st.soru}>{q.soru}</Text>
          </LinearGradient>
          <View style={{ gap: 8 }}>
            {(Object.keys(STYLE) as PressStyle[]).map((k) => (
              <Pressable key={k} onPress={() => cevap(k)} style={({ pressed }) => [st.ans, { borderColor: STYLE[k].renk + '66' }, pressed && { backgroundColor: '#1b1c22' }]}>
                <Icon name={STYLE[k].ikon} size={20} color={STYLE[k].renk} />
                <View style={{ flex: 1 }}>
                  <Text style={[st.ansK, { color: STYLE[k].renk }]}>{STYLE[k].ad().toLocaleUpperCase(LOC)}</Text>
                  <Text style={st.ansT}>{q.cevaplar[k]}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          {!s.pending.kamp?.viral ? (
            <AdOffer icon="trending-up" title={L("Viral klip")} desc={L("Basın toplantısının en sert anını paylaş: takipçi kazan, bilet satışları artsın (+{0}).", [`$${viralPay(s).toLocaleString(LOC)}`])} onReward={() => act(claimViral)} />
          ) : null}
        <Text style={st.done}>
          {(s.pending.kamp?.iddia ?? 0) > 0 ? L("Büyük konuştun. Şimdi kafeste sözünü tutman gerek: kazanırsan alkış, kaybedersen manşetler acımaz.") : L("Basın toplantısı bitti. Gözler şimdi tartıda ve kafeste.")}
        </Text>
        </>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  stage: { height: 200, borderRadius: R, overflow: 'hidden', marginBottom: 12, alignSelf: 'center' },
  kicker: { position: 'absolute', top: 8, left: 12, color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 28 },
  side: { alignItems: 'center', gap: 2, width: 110 },
  name: { color: '#fff', fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  react: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1d1708', borderRadius: R, borderWidth: 1, borderColor: C.goldDeep, padding: 10, marginBottom: 10 },
  reactT: { flex: 1, color: C.text, fontFamily: F.semi, fontSize: 13, lineHeight: 18 },
  q: { borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  efsane: { color: C.gold, fontFamily: F.bold, fontSize: 11, marginTop: 4 },
  muhabir: { color: C.faint, fontFamily: F.semi, fontSize: 11, letterSpacing: 0.5 },
  soru: { color: C.text, fontFamily: F.bold, fontSize: 16, lineHeight: 22, marginTop: 4 },
  ans: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R, borderWidth: 1, padding: 12 },
  ansK: { fontFamily: F.display, fontSize: 11, letterSpacing: 1.2 },
  ansT: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18, marginTop: 1 },
  done: { color: C.dim, fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 },
});
