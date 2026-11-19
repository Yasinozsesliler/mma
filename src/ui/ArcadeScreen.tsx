// Oyun salonu: dart ve yumruk makinesi. Bahis yok; skor, rekor ve haftalık küçük bir sosyal medya anı.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';
import { sfx } from '../audio';
import { ARCADE, arcadeSpeed, dartPoints, finishArcade, punchPoints, type ArcadeGame } from '../engine/arcade';
import type { GameState } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { Button, Icon, Screen, Title, type IconName } from './components';
import type { Act } from './GameScreens';
import { C, F, R } from './theme';

/** Basit zaman sayacı (saniye). */
function useClock(on: boolean) {
  const [t, setT] = useState(0);
  const t0 = useRef(0);
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    t0.current = Date.now() - t * 1000;
    const loop = () => {
      setT((Date.now() - t0.current) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  return t;
}

function Dart({ s, onDone }: { s: GameState; onDone: (skor: number) => void }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width - 32, 340);
  const r = w / 2 - 8;
  const [oklar, setOklar] = useState<{ x: number; y: number; p: number }[]>([]);
  const bitti = oklar.length >= 3;
  const t = useClock(!bitti);
  const hiz = arcadeSpeed(s, 'dart');
  // Nişangâh tahtanın üzerinde yavaşça kayar (iki farklı frekans: öngörülebilir ama kolay değil)
  const x = Math.sin(t * 1.3 * hiz) * r * 0.85;
  const y = Math.sin(t * 1.9 * hiz + 1) * r * 0.85;
  const at = () => {
    if (bitti) return;
    const isabet = 1 - Math.hypot(x, y) / r;
    const p = dartPoints(isabet);
    sfx(p >= 50 ? 'flash' : 'chime', 0.5);
    buzz(p >= 50 ? 'basari' : 'hafif');
    const yeni = [...oklar, { x, y, p }];
    setOklar(yeni);
    if (yeni.length >= 3) setTimeout(() => onDone(yeni.reduce((a, o) => a + o.p, 0)), 700);
  };
  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <Svg width={w} height={w}>
        <G transform={`translate(${w / 2} ${w / 2})`}>
          {[1, 0.8, 0.6, 0.4, 0.2, 0.08].map((k, i) => (
            <Circle key={k} r={r * k} fill={['#1b1d24', '#e63946', '#f4ecd8', '#2a9d5c', '#f4ecd8', '#e63946'][i]} stroke="#0b0b0e" strokeWidth={1.5} />
          ))}
          {oklar.map((o, i) => (
            <G key={i}>
              <Circle cx={o.x} cy={o.y} r={5} fill={C.gold} stroke="#111" strokeWidth={1.5} />
            </G>
          ))}
          {!bitti ? (
            <G>
              <Circle cx={x} cy={y} r={14} fill="none" stroke="#fff" strokeWidth={2} />
              <Line x1={x - 20} y1={y} x2={x + 20} y2={y} stroke="#fff" strokeWidth={1.5} />
              <Line x1={x} y1={y - 20} x2={x} y2={y + 20} stroke="#fff" strokeWidth={1.5} />
            </G>
          ) : null}
        </G>
      </Svg>
      <Text style={st.score}>{L("Atış {0}/3 · {1} puan", [Math.min(3, oklar.length + (bitti ? 0 : 1)), oklar.reduce((a, o) => a + o.p, 0)])}</Text>
      {!bitti ? (
        <View style={{ alignSelf: 'stretch' }}>
          <Button label={L("AT")} icon="bullseye-arrow" tone="gold" onPress={at} />
        </View>
      ) : null}
    </View>
  );
}

function Punch({ s, onDone }: { s: GameState; onDone: (skor: number) => void }) {
  const [skor, setSkor] = useState<number | null>(null);
  const t = useClock(skor == null);
  const hiz = arcadeSpeed(s, 'yumruk');
  const seviye = (Math.sin(t * 2.4 * hiz - Math.PI / 2) + 1) / 2;
  const vur = () => {
    if (skor != null) return;
    const p = punchPoints(s, seviye);
    setSkor(p);
    sfx(p >= 700 ? 'roar' : 'ooh', 0.7);
    buzz(p >= 700 ? 'guclu' : 'orta');
    setTimeout(() => onDone(p), 1200);
  };
  const h = 240;
  const g = skor != null ? Math.min(1, skor / 999) : seviye;
  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <Svg width={120} height={h + 20}>
        <Rect x={35} y={10} width={50} height={h} rx={10} fill="#1b1d24" stroke="#333" strokeWidth={2} />
        <Rect x={41} y={10 + h * (1 - g) + 6} width={38} height={Math.max(0, h * g - 12)} rx={6} fill={g > 0.85 ? C.gold : g > 0.6 ? C.orange : C.red} />
        <Rect x={30} y={10 + h * 0.06} width={60} height={3} fill="#fff" opacity={0.6} />
      </Svg>
      <Text style={st.big}>{skor != null ? skor.toLocaleString(LOC) : '—'}</Text>
      {skor == null ? (
        <View style={{ alignSelf: 'stretch' }}>
          <Button label={L("VUR")} icon="boxing-glove" tone="gold" onPress={vur} />
        </View>
      ) : null}
    </View>
  );
}

export function ArcadeScreen({ s, act }: { s: GameState; act: Act }) {
  const [oyun, setOyun] = useState<ArcadeGame | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [tur, setTur] = useState(0);
  const rekor = s.oyunSalonu?.rekor ?? {};
  const bitir = (g: ArcadeGame, skor: number) => {
    act((x) => setMsg(finishArcade(x, g, skor)));
    setOyun(null);
  };
  return (
    <Screen footer={<Button label={L("Gece hayatına dön")} icon="arrow-left" tone="ghost" onPress={() => act((x) => (x.phase = 'gece'))} />}>
      <Title art="dev" kicker={L("GECE HAYATI")} sub={L("Arkadaşlarınla dart ve yumruk makinesi. Bahis yok; sadece rekorlar ve eğlence.")}>
        {L("Oyun Salonu")}
      </Title>
      {msg ? <Text style={st.msg}>{msg}</Text> : null}
      {oyun === 'dart' ? (
        <Dart key={tur} s={s} onDone={(p) => bitir('dart', p)} />
      ) : oyun === 'yumruk' ? (
        <Punch key={tur} s={s} onDone={(p) => bitir('yumruk', p)} />
      ) : (
        <View style={{ gap: 10 }}>
          {(Object.keys(ARCADE) as ArcadeGame[]).map((g) => (
            <Pressable
              key={g}
              onPress={() => {
                setMsg(null);
                setTur((x) => x + 1);
                setOyun(g);
              }}
              style={({ pressed }) => [st.card, pressed && { borderColor: C.gold }]}
            >
              <View style={st.icon}>
                <Icon name={ARCADE[g].ikon as IconName} size={26} color={C.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{ARCADE[g].ad()}</Text>
                <Text style={st.desc}>{ARCADE[g].aciklama()}</Text>
                <Text style={st.rec}>{L("Rekor: {0} · Hedef: {1}", [rekor[g] ?? '—', ARCADE[g].esik])}</Text>
              </View>
              <Icon name="play-circle" size={30} color={C.gold} />
            </Pressable>
          ))}
          <Text style={st.note}>{L("Haftada her oyunda hedefi geçen ilk skorun videosu sosyal medyada dolaşır.")}</Text>
        </View>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  msg: { color: C.gold, fontFamily: F.semi, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R, borderWidth: 1, borderColor: C.border, padding: 14 },
  icon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: C.goldDeep, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1d1708' },
  name: { color: C.text, fontFamily: F.display, fontSize: 17, letterSpacing: 0.5 },
  desc: { color: C.dim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  rec: { color: C.gold, fontFamily: F.semi, fontSize: 12, marginTop: 4 },
  note: { color: C.faint, fontFamily: F.body, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  score: { color: C.text, fontFamily: F.display, fontSize: 18 },
  big: { color: C.gold, fontFamily: F.display, fontSize: 44 },
});
