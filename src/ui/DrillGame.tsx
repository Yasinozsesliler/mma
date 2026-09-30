// Antrenman mini oyunları: pad (zamanlama), takedown savunması (refleks), ip atlama (ritim).
// Her biri ~15 saniye; sonuç 0–100 puan olarak kampa yazılır.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import { DRILLS, drillGrade, type DrillId } from '../engine/drills';
import { L, LOC } from '../i18n';
import { buzz } from '../haptics';
import { Button, Icon, SLANT, type IconName } from './components';
import { C, F } from './theme';

const ND = Platform.OS !== 'web';
// react-native-web dokunuşu varsayılan olarak 50 ms geciktirir; oyunda zamanlama için anında algılanmalı.
const INSTANT = { delayPressIn: 0 } as object;
const now = () => Date.now();
const rnd = () => Math.random();
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

type Judge = { puan: number; metin: string; renk: string };
const judge = (ms: number, [a, b, c]: [number, number, number]): Judge =>
  ms <= a ? { puan: 100, metin: L("MÜKEMMEL"), renk: C.gold } : ms <= b ? { puan: 70, metin: L("İYİ"), renk: C.green } : ms <= c ? { puan: 40, metin: L("OLUR"), renk: C.blue } : { puan: 0, metin: L("KAÇTI"), renk: C.red };

function feedbackFx(j: Judge) {
  if (j.puan >= 100) {
    sfx('heavy');
    buzz('guclu');
  } else if (j.puan > 0) {
    sfx('punch');
    buzz('hafif');
  } else {
    sfx('whoosh');
    buzz('hata');
  }
}

/** Yukarıda beliren kısa değerlendirme yazısı. */
function useFlash() {
  const [j, setJ] = useState<Judge | null>(null);
  const [v] = useState(() => new Animated.Value(0));
  const show = (x: Judge) => {
    setJ(x);
    v.setValue(1);
    Animated.timing(v, { toValue: 0, duration: 650, delay: 150, useNativeDriver: ND }).start();
  };
  const node = j ? (
    <Animated.Text style={[g.flash, SLANT, { color: j.renk, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] }) }] }]}>{j.metin}</Animated.Text>
  ) : null;
  return { show, node };
}

// ---------- Pad: küçülen halka hedefe oturunca vur ----------

const PADS = 8;
const SPOTS = [
  { x: 0.25, y: 0.38 },
  { x: 0.75, y: 0.38 },
  { x: 0.5, y: 0.55 },
  { x: 0.3, y: 0.7 },
  { x: 0.7, y: 0.7 },
];

function PadGame({ onEnd }: { onEnd: (p: number) => void }) {
  const [i, setI] = useState(0);
  const [spot, setSpot] = useState(SPOTS[2]);
  const [ring] = useState(() => new Animated.Value(0));
  const [scores, setScores] = useState<number[]>([]);
  const hitAt = useRef(0);
  const live = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flash = useFlash();
  const [size, setSize] = useState({ w: 300, h: 420 });

  const next = (idx: number, sc: number[]) => {
    if (idx >= PADS) return onEnd(avg(sc));
    const dur = 1100 - idx * 45;
    setI(idx);
    setSpot(SPOTS[Math.floor(rnd() * SPOTS.length)]);
    ring.setValue(0);
    hitAt.current = now() + dur;
    live.current = true;
    Animated.timing(ring, { toValue: 1.3, duration: dur * 1.3, easing: Easing.linear, useNativeDriver: ND }).start();
    timer.current = setTimeout(() => {
      if (!live.current) return;
      live.current = false;
      const j = judge(999, [0, 0, 0]);
      flash.show(j);
      feedbackFx(j);
      const s2 = [...sc, 0];
      setScores(s2);
      timer.current = setTimeout(() => next(idx + 1, s2), 380);
    }, dur * 1.3);
  };

  useEffect(() => {
    timer.current = setTimeout(() => next(0, []), 300);
    return () => clearTimeout(timer.current);
    // Oyun bir kez başlar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    if (!live.current) return;
    live.current = false;
    clearTimeout(timer.current);
    ring.stopAnimation();
    const d = now() - hitAt.current;
    const j0 = judge(Math.abs(d), [75, 150, 260]);
    const j = !j0.puan && d < 0 ? { ...j0, metin: L("ERKEN") } : j0;
    flash.show(j);
    feedbackFx(j);
    const s2 = [...scores, j.puan];
    setScores(s2);
    timer.current = setTimeout(() => next(i + 1, s2), 380);
  };

  const R = 46;
  return (
    <Pressable testID="drill-area" {...INSTANT} onPressIn={tap} style={g.area} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Progress done={scores.length} total={PADS} />
      <View style={[g.pad, { left: spot.x * size.w - R, top: spot.y * size.h - R, width: R * 2, height: R * 2, borderRadius: R }]}>
        <Icon name="target" size={34} color={C.red} />
      </View>
      <Animated.View
        testID="drill-ring"
        pointerEvents="none"
        style={[
          g.ring,
          {
            left: spot.x * size.w - R,
            top: spot.y * size.h - R,
            width: R * 2,
            height: R * 2,
            borderRadius: R,
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1, 1.3], outputRange: [2.8, 1, 0.5] }) }],
          },
        ]}
      />
      {flash.node}
      <Text style={g.hint}>{L("Halka kırmızı hedefe oturunca dokun")}</Text>
    </Pressable>
  );
}

// ---------- Takedown savunması: dalışa hızlı tepki, çalıma sabır ----------

const TRIALS = 10;
type RefState = 'bekle' | 'dalis' | 'calim';

function ReflexGame({ onEnd }: { onEnd: (p: number) => void }) {
  const [state, setState] = useState<RefState>('bekle');
  const [scores, setScores] = useState<number[]>([]);
  const shownAt = useRef(0);
  const st = useRef<RefState>('bekle');
  const sc = useRef<number[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flash = useFlash();
  const [pop] = useState(() => new Animated.Value(0));

  const set = (x: RefState) => {
    st.current = x;
    setState(x);
    if (x !== 'bekle') {
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, useNativeDriver: ND, speed: 30, bounciness: 8 }).start();
    }
  };

  const record = (j: Judge) => {
    clearTimeout(timer.current);
    flash.show(j);
    feedbackFx(j);
    sc.current = [...sc.current, j.puan];
    setScores(sc.current);
    set('bekle');
    if (sc.current.length >= TRIALS) timer.current = setTimeout(() => onEnd(avg(sc.current)), 500);
    else schedule();
  };

  const schedule = () => {
    timer.current = setTimeout(() => {
      const feint = sc.current.length > 1 && rnd() < 0.3;
      shownAt.current = now();
      set(feint ? 'calim' : 'dalis');
      timer.current = setTimeout(
        () => record(feint ? { puan: 100, metin: L("SAKİN KALDIN"), renk: C.green } : { puan: 0, metin: L("YAKALANDIN"), renk: C.red }),
        feint ? 750 : 900,
      );
    }, 700 + rnd() * 1200);
  };

  useEffect(() => {
    schedule();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    if (sc.current.length >= TRIALS) return;
    if (st.current === 'bekle') return record({ puan: 0, metin: L("ERKEN KALKTIN"), renk: C.red });
    if (st.current === 'calim') return record({ puan: 0, metin: L("ÇALIMA GELDİN"), renk: C.red });
    const j = judge(now() - shownAt.current, [330, 460, 620]);
    record(j.puan ? { ...j, metin: j.puan === 100 ? L("SPRAWL!") : j.metin } : { ...j, metin: L("YAKALANDIN") });
  };

  const color = state === 'dalis' ? C.red : state === 'calim' ? C.gold : C.border;
  const icon: IconName = state === 'dalis' ? 'run-fast' : state === 'calim' ? 'hand-back-right' : 'account';
  return (
    <Pressable testID="drill-area" {...INSTANT} onPressIn={tap} style={g.area}>
      <Progress done={scores.length} total={TRIALS} />
      <View style={g.center}>
        <Animated.View style={[g.bigCircle, { borderColor: color, transform: [{ scale: state === 'bekle' ? 1 : pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}>
          <Icon name={icon} size={72} color={state === 'bekle' ? C.faint : color} />
        </Animated.View>
        <Text testID="drill-prompt" style={[g.prompt, SLANT, { color: state === 'bekle' ? C.faint : color }]}>
          {state === 'dalis' ? L("DALIŞ! DOKUN!") : state === 'calim' ? L("ÇALIM… BEKLE") : L("Hazır ol…")}
        </Text>
      </View>
      {flash.node}
      <Text style={g.hint}>{L("Kırmızıda hemen dokun, sarıda dokunma")}</Text>
    </Pressable>
  );
}

// ---------- İp atlama: ip yere değdiği anda dokun ----------

const BEATS = 16;
const INTERVAL = 560;

function RhythmGame({ onEnd }: { onEnd: (p: number) => void }) {
  const [bounce] = useState(() => new Animated.Value(0));
  const [count, setCount] = useState(0);
  const start = useRef(0);
  const judged = useRef<(number | null)[]>(Array(BEATS).fill(null));
  const stray = useRef(0);
  const ended = useRef(false);
  const flash = useFlash();

  useEffect(() => {
    start.current = now() + 600;
    const anim = Animated.loop(Animated.timing(bounce, { toValue: 1, duration: INTERVAL, easing: Easing.linear, useNativeDriver: ND }), { iterations: BEATS + 1 });
    const t0 = setTimeout(() => anim.start(), 600);
    const tick = setInterval(() => {
      const t = now();
      for (let b = 0; b < BEATS; b++) {
        const at = start.current + (b + 1) * INTERVAL;
        if (judged.current[b] == null && t > at + 210) {
          judged.current[b] = 0;
          flash.show({ puan: 0, metin: L("KAÇTI"), renk: C.red });
          sfx('whoosh');
        }
      }
      setCount(judged.current.filter((x) => x != null).length);
      if (!ended.current && judged.current.every((x) => x != null)) {
        ended.current = true;
        const base = avg(judged.current as number[]);
        setTimeout(() => onEnd(Math.max(0, base - stray.current * 4)), 400);
      }
    }, 50);
    return () => {
      clearTimeout(t0);
      clearInterval(tick);
      anim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    if (ended.current) return;
    const t = now();
    let best = -1;
    let bestD = 1e9;
    for (let b = 0; b < BEATS; b++) {
      if (judged.current[b] != null) continue;
      const d = Math.abs(t - (start.current + (b + 1) * INTERVAL));
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    if (best < 0 || bestD > 210) {
      stray.current++;
      flash.show({ puan: 0, metin: L("TEMPO DIŞI"), renk: C.orange });
      buzz('hata');
      return;
    }
    const j = judge(bestD, [80, 140, 210]);
    judged.current[best] = j.puan;
    flash.show(j);
    if (j.puan > 0) {
      sfx('tap');
      buzz('hafif');
    }
  };

  // İp tepede (faz 0.5) en yüksekte, faz 0/1'de yerde: vuruş anı.
  const lift = bounce.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -70, -100, -70, 0] });
  return (
    <Pressable testID="drill-area" {...INSTANT} onPressIn={tap} style={g.area}>
      <Progress done={count} total={BEATS} />
      <View style={g.center}>
        <View style={g.ropeBox}>
          <Animated.View testID="drill-ball" style={[g.ball, { transform: [{ translateY: lift }] }]}>
            <Icon name="jump-rope" size={40} color={C.gold} />
          </Animated.View>
          <View style={g.ground} />
        </View>
      </View>
      {flash.node}
      <Text style={g.hint}>{L("İp yere değdiği anda dokun")}</Text>
    </Pressable>
  );
}

function Progress({ done, total }: { done: number; total: number }) {
  return (
    <View style={g.progress} pointerEvents="none">
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[g.progDot, i < done && { backgroundColor: C.gold }]} />
      ))}
    </View>
  );
}

// ---------- Kabuk: tanıtım → geri sayım → oyun → sonuç ----------

export function DrillGame({ oyun, onDone, onClose }: { oyun: DrillId; onDone: (puan: number) => void; onClose: () => void }) {
  const [phase, setPhase] = useState<'intro' | 'sayim' | 'oyun' | 'son'>('intro');
  const [n, setN] = useState(3);
  const [puan, setPuan] = useState(0);
  const d = DRILLS[oyun];

  useEffect(() => {
    if (phase !== 'sayim') return;
    if (n === 0) {
      const t = setTimeout(() => setPhase('oyun'), 0);
      return () => clearTimeout(t);
    }
    sfx('click');
    const t = setTimeout(() => setN((x) => x - 1), 650);
    return () => clearTimeout(t);
  }, [phase, n]);

  const end = (p: number) => {
    setPuan(Math.round(p));
    setPhase('son');
    sfx(p >= 65 ? 'applause' : 'bell');
    buzz(p >= 65 ? 'basari' : 'hafif');
  };

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} transparent={false}>
      <View style={g.root}>
        <View style={g.top}>
          <Icon name={d.ikon as IconName} size={20} color={C.gold} />
          <Text style={g.title}>{d.ad.toLocaleUpperCase(LOC)}</Text>
          {phase !== 'son' ? (
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={L("Kapat")}>
              <Icon name="close" size={22} color={C.faint} />
            </Pressable>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>
        {phase === 'intro' ? (
          <View style={g.intro}>
            <View style={g.introIcon}>
              <Icon name={d.ikon as IconName} size={64} color={C.gold} />
            </View>
            <Text style={g.introText}>{d.aciklama}</Text>
            <Text style={g.introSub}>{L("İyi oynarsan kamp daha verimli geçer ve sakatlık riski azalır. Oynamazsan kamp normal sonucunu verir.")}</Text>
            <Button label={L("Başla")} icon="play" tone="gold" onPress={() => setPhase('sayim')} />
          </View>
        ) : phase === 'sayim' ? (
          <View style={g.center}>
            <Text style={[g.count, SLANT]}>{n || L("BAŞLA")}</Text>
          </View>
        ) : phase === 'oyun' ? (
          oyun === 'pad' ? (
            <PadGame onEnd={end} />
          ) : oyun === 'refleks' ? (
            <ReflexGame onEnd={end} />
          ) : (
            <RhythmGame onEnd={end} />
          )
        ) : (
          <View style={g.intro}>
            <Text style={[g.score, SLANT, { color: puan >= 65 ? C.gold : puan >= 40 ? C.text : C.red }]}>{puan}</Text>
            <Text style={g.grade}>{drillGrade(puan).toLocaleUpperCase(LOC)}</Text>
            <Text style={g.introSub}>{L("Seans sonucu kamp raporuna eklendi.")}</Text>
            <Button label={L("Kampa dön")} icon="check" tone="gold" onPress={() => onDone(puan)} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const g = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060607', paddingTop: 18, paddingHorizontal: 16, paddingBottom: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { flex: 1, color: C.gold, fontFamily: F.display, fontSize: 18, letterSpacing: 1 },
  area: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: '#0b0c10', overflow: 'hidden', userSelect: 'none' } as object,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  pad: { position: 'absolute', backgroundColor: '#1a0c10', borderWidth: 3, borderColor: C.red, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 3, borderColor: C.gold },
  flash: { position: 'absolute', top: 48, left: 0, right: 0, textAlign: 'center', fontFamily: F.display, fontSize: 34, letterSpacing: 1 },
  hint: { position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', color: C.faint, fontFamily: F.body, fontSize: 12 },
  progress: { position: 'absolute', top: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  progDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#23252c' },
  bigCircle: { width: 170, height: 170, borderRadius: 85, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#101217' },
  prompt: { fontFamily: F.display, fontSize: 28, letterSpacing: 1 },
  ropeBox: { width: 180, height: 170, alignItems: 'center', justifyContent: 'flex-end' },
  ball: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1b170b', borderWidth: 2, borderColor: C.goldDeep, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  ground: { width: 180, height: 4, borderRadius: 2, backgroundColor: C.red },
  intro: { flex: 1, alignItems: 'stretch', justifyContent: 'center', gap: 16 },
  introIcon: { alignSelf: 'center', width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: C.goldDeep, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15120a' },
  introText: { color: C.text, fontFamily: F.semi, fontSize: 17, lineHeight: 24, textAlign: 'center' },
  introSub: { color: C.dim, fontFamily: F.body, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  count: { color: C.gold, fontFamily: F.display, fontSize: 96 },
  score: { fontFamily: F.display, fontSize: 96, textAlign: 'center', lineHeight: 104 },
  grade: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: 2, textAlign: 'center' },
});
