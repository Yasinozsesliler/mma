// Pad çalışması: hoca kombinasyonu söyler ("1-2-3!"), sırası gelen pad yanar ve halkası daralır.
// Halka pada oturduğu anda o pada vur: eldiven uçar, pad geri teper. Kombinasyonlar giderek hızlanır.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { sfx } from '../../audio';
import { buzz } from '../../haptics';
import { L } from '../../i18n';
import { Icon, SLANT } from '../components';
import { DEFAULT_LOOK, FighterAvatar } from '../FighterAvatar';
import { C, F } from '../theme';
import { avg, cm, feedbackFx, INSTANT, judge, MISS, ND, now, Progress, rnd, useFlash } from './common';

type PadId = 'L' | 'R' | 'B';
type Hit = { pad: PadId; at: number; res?: number };

// Padlerin yeri (oyun alanına oranla) ve yarıçapı
const POS: Record<PadId, { x: number; y: number; r: number }> = {
  L: { x: 0.3, y: 0.42, r: 50 },
  R: { x: 0.7, y: 0.42, r: 50 },
  B: { x: 0.5, y: 0.7, r: 58 },
};

const COMBOS: { ad: string; seq: PadId[] }[] = [
  { ad: '1-2', seq: ['L', 'R'] },
  { ad: '1-1-2', seq: ['L', 'L', 'R'] },
  { ad: '1-2-3', seq: ['L', 'R', 'L'] },
  { ad: '2-3-2', seq: ['R', 'L', 'R'] },
  { ad: L("1-2-GÖVDE"), seq: ['L', 'R', 'B'] },
  { ad: L("GÖVDE-3-2"), seq: ['B', 'L', 'R'] },
  { ad: '1-2-3-2', seq: ['L', 'R', 'L', 'R'] },
];

const APPROACH = 700; // halkanın daralma süresi (ms)
const WINDOW = 240; // vuruş penceresi (± ms)

/** Kombinasyon programı: kısadan uzuna, giderek hızlanan 6 kombinasyon. */
function buildPlan() {
  const pool = [...COMBOS];
  const picks = [pool[0], pool[2], pool[4], pool[1 + Math.floor(rnd() * 2)], pool[5], pool[6]];
  const hits: Hit[] = [];
  const calls: { at: number; ad: string }[] = [];
  let t = 900;
  picks.forEach((c, i) => {
    const gap = 470 - i * 25;
    calls.push({ at: t, ad: c.ad });
    c.seq.forEach((pad, j) => hits.push({ pad, at: t + 750 + j * gap }));
    t += 750 + (c.seq.length - 1) * gap + 750;
  });
  return { hits, calls, end: t };
}

export function PadMitts({ onEnd }: { onEnd: (p: number) => void }) {
  const [plan] = useState(buildPlan);
  const start = useRef(0);
  const [t, setT] = useState(0);
  const [size, setSize] = useState({ w: 320, h: 460 });
  const stray = useRef(0);
  const ended = useRef(false);
  const comboOk = useRef<number[]>([]);
  const flash = useFlash(150);
  // Pad tepkisi, eldiven uçuşu, darbe patlaması, sarsıntı
  const [recoil] = useState(() => ({ L: new Animated.Value(0), R: new Animated.Value(0), B: new Animated.Value(0) }));
  const [glove] = useState(() => new Animated.Value(0));
  const [gloveTo, setGloveTo] = useState<PadId>('L');
  const [burst] = useState(() => new Animated.Value(0));
  const [burstAt, setBurstAt] = useState<PadId>('L');
  const [shake] = useState(() => new Animated.Value(0));

  useEffect(() => {
    start.current = now();
    let raf = 0;
    const loop = () => {
      const tt = now() - start.current;
      // Kaçırılan vuruşlar
      plan.hits.forEach((h) => {
        if (h.res == null && tt > h.at + WINDOW) {
          h.res = 0;
          flash.show(MISS());
          sfx('whoosh');
        }
      });
      setT(tt);
      if (!ended.current && plan.hits.every((h) => h.res != null)) {
        ended.current = true;
        const base = avg(plan.hits.map((h) => h.res ?? 0));
        const bonus = comboOk.current.length * 2;
        setTimeout(() => onEnd(Math.max(0, Math.min(100, base + bonus - stray.current * 4))), 600);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // Oyun bir kez başlar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const punchFx = (pad: PadId, strong: boolean) => {
    setGloveTo(pad);
    glove.setValue(0);
    Animated.timing(glove, { toValue: 1, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start(() => glove.setValue(0));
    setBurstAt(pad);
    burst.setValue(0);
    Animated.timing(burst, { toValue: 1, duration: 320, delay: 90, useNativeDriver: ND }).start();
    recoil[pad].setValue(1);
    Animated.spring(recoil[pad], { toValue: 0, speed: 30, bounciness: 14, useNativeDriver: ND }).start();
    if (strong) {
      shake.setValue(0);
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 40, useNativeDriver: ND }),
        Animated.timing(shake, { toValue: -1, duration: 40, useNativeDriver: ND }),
        Animated.timing(shake, { toValue: 0, duration: 40, useNativeDriver: ND }),
      ]).start();
    }
  };

  const hitPad = (pad: PadId) => {
    if (ended.current) return;
    const tt = now() - start.current;
    let best: Hit | null = null;
    for (const h of plan.hits) if (h.res == null && h.pad === pad && Math.abs(tt - h.at) <= WINDOW && (!best || Math.abs(tt - h.at) < Math.abs(tt - best.at))) best = h;
    if (!best) {
      stray.current++;
      flash.show({ puan: 0, metin: L("YANLIŞ PED"), renk: C.orange });
      buzz('hata');
      return;
    }
    const j = judge(Math.abs(tt - best.at), [70, 140, WINDOW]);
    best.res = j.puan;
    flash.show(j);
    feedbackFx(j);
    punchFx(pad, j.puan >= 100);
    // Kombinasyon tamamlandı mı? (aynı çağrıya ait vuruşların hepsi iyi)
    const callIdx = plan.calls.filter((c) => c.at <= best!.at - 700).length - 1;
    const group = plan.hits.filter((h) => plan.calls.filter((c) => c.at <= h.at - 700).length - 1 === callIdx);
    if (group.every((h) => (h.res ?? 0) >= 70) && !comboOk.current.includes(callIdx)) {
      comboOk.current.push(callIdx);
      setTimeout(() => flash.show({ puan: 100, metin: L("KOMBO!"), renk: C.gold }), 220);
      sfx('applause', 0.3);
    }
  };

  const call = [...plan.calls].reverse().find((c) => t >= c.at && t < c.at + 1600);
  const done = plan.hits.filter((h) => h.res != null).length;
  const px = (p: PadId) => ({ cx: POS[p].x * size.w, cy: POS[p].y * size.h, r: POS[p].r });
  // Her pad için sıradaki aktif vuruş
  const active = (p: PadId) => plan.hits.find((h) => h.pad === p && h.res == null && t >= h.at - APPROACH && t <= h.at + WINDOW);
  const gp = px(gloveTo);
  const fromX = gloveTo === 'R' ? size.w * 0.85 : gloveTo === 'L' ? size.w * 0.15 : size.w * 0.5;
  const bp = px(burstAt);

  return (
    <Animated.View
      style={[cm.area, { transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) }] }]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <Progress done={done} total={plan.hits.length} />
      {/* Hoca ve kombinasyon çağrısı */}
      <View style={pm.coach} pointerEvents="none">
        <FighterAvatar look={DEFAULT_LOOK} size={46} ring={C.gold} />
        <View style={[pm.bubble, !call && { opacity: 0.35 }]}>
          <Text style={[pm.call, SLANT]}>{call ? `${call.ad}!` : L("Hazır ol…")}</Text>
        </View>
      </View>

      {(['L', 'R', 'B'] as PadId[]).map((p) => {
        const { cx, cy, r } = px(p);
        const a = active(p);
        const k = a ? Math.max(1, 1 + 1.5 * ((a.at - t) / APPROACH)) : 0;
        return (
          <View key={p} style={{ position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2 }}>
            <Animated.View
              style={{
                flex: 1,
                transform: [
                  { scale: recoil[p].interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }) },
                  { translateY: recoil[p].interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
                  { rotate: p === 'L' ? '-12deg' : p === 'R' ? '12deg' : '0deg' },
                ],
              }}
            >
              <Pressable testID={`pad-${p}`} {...INSTANT} onPressIn={() => hitPad(p)} style={{ flex: 1 }}>
                <LinearGradient
                  colors={a ? ['#ff5a66', '#b0101f'] : ['#7a1a22', '#3a0b10']}
                  style={[pm.pad, { borderRadius: p === 'B' ? 22 : r }, a && pm.padOn]}
                >
                  <View style={[pm.target, p === 'B' && { borderRadius: 14 }]} />
                  <Text style={pm.padLabel}>{p === 'L' ? L("SOL") : p === 'R' ? L("SAĞ") : L("GÖVDE")}</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
            {a ? <View testID={`ring-${p}`} pointerEvents="none" style={[pm.ring, { borderRadius: p === 'B' ? 26 : r, transform: [{ scale: k }] }]} /> : null}
          </View>
        );
      })}

      {/* Eldiven pada uçar */}
      <Animated.View
        pointerEvents="none"
        style={[
          pm.glove,
          {
            opacity: glove.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateX: glove.interpolate({ inputRange: [0, 1], outputRange: [fromX - 30, gp.cx - 30] }) },
              { translateY: glove.interpolate({ inputRange: [0, 1], outputRange: [size.h + 10, gp.cy - 30] }) },
              { scale: glove.interpolate({ inputRange: [0, 1], outputRange: [1.4, 0.9] }) },
              { rotate: gloveTo === 'R' ? '-20deg' : '20deg' },
            ],
          },
        ]}
      >
        <Icon name="boxing-glove" size={60} color={C.gold} />
      </Animated.View>
      {/* Darbe patlaması */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: bp.cx - 40,
          top: bp.cy - 40,
          opacity: burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
          transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }],
        }}
      >
        <Icon name="flare" size={80} color="#fff3c4" />
      </Animated.View>

      {flash.node}
      <Text style={cm.hint}>{L("Halka pada oturunca o pada vur")}</Text>
    </Animated.View>
  );
}

const pm = StyleSheet.create({
  coach: { position: 'absolute', top: 40, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  bubble: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6 },
  call: { color: '#111', fontFamily: F.display, fontSize: 24 },
  pad: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#2a0508' },
  padOn: { borderColor: C.gold, shadowColor: C.gold, shadowOpacity: 0.8, shadowRadius: 16 },
  target: { width: '46%', height: '46%', borderRadius: 999, borderWidth: 3, borderColor: 'rgba(255,255,255,0.75)', backgroundColor: 'rgba(255,255,255,0.12)' },
  padLabel: { position: 'absolute', bottom: 8, color: 'rgba(255,255,255,0.75)', fontFamily: F.display, fontSize: 10, letterSpacing: 1.5 },
  ring: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderWidth: 4, borderColor: C.gold },
  glove: { position: 'absolute', left: 0, top: 0 },
});
