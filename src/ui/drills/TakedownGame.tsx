// Takedown savunması: rakip sallanır, eğilir; bazen gerçekten dalar, bazen çalım atıp doğrulur ya da jab sallar.
// Sadece gerçek dalışta dokun (sprawl). Erken davranırsan ya da çalıma gelirsen seni indirir.
// Başarılı sprawl'dan sonra "GİYOTİN!" fırsatı: hemen dokunursan bonus.
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, G, RadialGradient, Stop } from 'react-native-svg';
import { sfx } from '../../audio';
import { playerKit } from '../../cosmetics';
import type { Appearance } from '../../engine/types';
import { buzz } from '../../haptics';
import { L } from '../../i18n';
import { SLANT } from '../components';
import { DEFAULT_LOOK } from '../FighterAvatar';
import { Figure, HIP_H, lerpPose, POSES, type Pose, type PoseName } from '../rig';
import { C, F } from '../theme';
import { cm, INSTANT, ND, now, Progress, rnd, useFlash, wait, type Judge } from './common';

const ROUNDS = 8;
const BLUE = { shorts: '#1f4fbf', trim: '#ffffff', glove: '#1740a8' };
type Actor = 'p' | 'o';
type Phase = 'idle' | 'crouch' | 'shot' | 'feint' | 'jab' | 'gil' | 'result';

const P = (n: PoseName, ov: Partial<Pose> = {}): Pose => ({ ...POSES[n], ...ov });

export function TakedownGame({ onEnd, pLook, oLook }: { onEnd: (p: number) => void; pLook?: Appearance; oLook?: Appearance }) {
  const [kit] = useState(playerKit);
  const [poses, setPoses] = useState<Record<Actor, Pose>>({ p: POSES.stance, o: POSES.stance });
  const [scores, setScores] = useState<number[]>([]);
  const [gilOn, setGilOn] = useState(false);
  const flash = useFlash(30);
  const [gilPulse] = useState(() => new Animated.Value(0));
  // Pozlar: başlangıç → hedef geçişi
  const tw = useRef<Record<Actor, { from: Pose; to: Pose; t0: number; ms: number }>>({
    p: { from: P('stance'), to: P('stance'), t0: 0, ms: 1 },
    o: { from: P('stance'), to: P('stance'), t0: 0, ms: 1 },
  });
  const phase = useRef<Phase>('idle');
  const shotAt = useRef(0);
  const tapped = useRef<{ at: number } | null>(null);
  const alive = useRef(true);
  // Dokunuş beklerken asenkron değişir: her okuma güncel değeri alsın.
  const tapNow = (): { at: number } | null => tapped.current;

  const cur = (a: Actor) => {
    const x = tw.current[a];
    return lerpPose(x.from, x.to, Math.min(1, (now() - x.t0) / x.ms));
  };
  const go = (a: Actor, to: Pose, ms: number) => {
    tw.current[a] = { from: cur(a), to, t0: now(), ms: Math.max(1, ms) };
  };


  const results = useRef<number[]>([]);
  const finishRound = async (j: Judge, outcome: 'sprawl' | 'takedown' | 'feint' | 'calm') => {
    phase.current = 'result';
    flash.show(j);
    if (outcome === 'takedown') {
      go('o', P('kneelTop', { x: 46 }), 260);
      go('p', P('onBack', { x: 4 }), 260);
      setTimeout(() => sfx('slam'), 180);
      buzz('guclu');
    } else if (outcome === 'feint') {
      go('p', P('sprawl', { x: 12 }), 160);
      go('o', P('jab', { x: 14 }), 160);
      sfx('ooh', 0.6);
      buzz('hata');
    } else if (outcome === 'calm') {
      sfx('click');
    }
    results.current.push(j.puan);
    setScores([...results.current]);
    await wait(outcome === 'takedown' ? 1100 : 750);
    go('p', P('stance'), 280);
    go('o', P('stance'), 280);
    await wait(380);
  };

  async function run() {
    await wait(500);
    for (let r = 0; r < ROUNDS && alive.current; r++) {
      tapped.current = null;
      phase.current = 'idle';
      // Sallanma: rakip ritimli şekilde hafifçe iner kalkar
      const idle = 650 + rnd() * 1000;
      const t0 = now();
      let up = true;
      while (now() - t0 < idle && alive.current) {
        go('o', P('stance', { y: up ? 0 : 2.2, x: up ? 0 : 2 }), 260);
        up = !up;
        await wait(280);
        if (tapNow()) break;
      }
      if (tapNow()) {
        // Hiçbir şey yokken atıldın: denge kaybı
        await finishRound({ puan: 0, metin: L("ERKEN KALKTIN"), renk: C.red }, 'feint');
        continue;
      }
      // Tür: ilk iki tur gerçek dalış (öğretir), sonra çalımlar karışır
      const roll = rnd();
      const kind: 'shot' | 'feint' | 'jab' = r < 2 ? 'shot' : roll < 0.55 ? 'shot' : roll < 0.8 ? 'feint' : 'jab';
      const speed = 1 - r * 0.05; // giderek hızlanır
      if (kind === 'jab') {
        phase.current = 'jab';
        go('o', P('jab', { x: 8 }), 110 * speed);
        await wait(160 * speed);
        go('o', P('stance'), 160);
        await wait(420);
        if (tapNow()) await finishRound({ puan: 0, metin: L("ÇALIMA GELDİN"), renk: C.red }, 'feint');
        else await finishRound({ puan: 100, metin: L("SAKİN KALDIN"), renk: C.green }, 'calm');
        continue;
      }
      // Eğilme (telegraf)
      phase.current = 'crouch';
      go('o', P('stanceLow', { y: 6, torso: 24, x: 3 }), 150 * speed);
      await wait((230 + rnd() * 260) * speed);
      if (tapNow()) {
        // Erken sprawl: o da bunu bekliyordu
        if (kind === 'feint') await finishRound({ puan: 0, metin: L("ÇALIMA GELDİN"), renk: C.red }, 'feint');
        else await finishRound({ puan: 0, metin: L("ERKEN"), renk: C.red }, 'takedown');
        continue;
      }
      if (kind === 'feint') {
        phase.current = 'feint';
        go('o', P('stance'), 180);
        await wait(520);
        if (tapNow()) await finishRound({ puan: 0, metin: L("ÇALIMA GELDİN"), renk: C.red }, 'feint');
        else await finishRound({ puan: 100, metin: L("SAKİN KALDIN"), renk: C.green }, 'calm');
        continue;
      }
      // Gerçek dalış
      phase.current = 'shot';
      shotAt.current = now();
      go('o', P('shot', { x: 46 }), 240 * speed);
      sfx('whoosh', 0.7);
      const deadline = shotAt.current + 430 * speed;
      while (!tapNow() && now() < deadline && alive.current) await wait(16);
      if (!tapNow()) {
        await finishRound({ puan: 0, metin: L("YAKALANDIN"), renk: C.red }, 'takedown');
        continue;
      }
      // Sprawl
      const rt = (tapNow()?.at ?? now()) - shotAt.current;
      const base = rt <= 210 ? 100 : rt <= 320 ? 75 : 50;
      go('p', P('sprawl', { x: 18 }), 120);
      go('o', P('shot', { x: 40, y: 22, torso: 78 }), 140);
      sfx('slam', 0.8);
      buzz('guclu');
      flash.show({ puan: base, metin: base >= 100 ? L("SPRAWL!") : base >= 75 ? L("İYİ SPRAWL") : L("ZAR ZOR"), renk: base >= 100 ? C.gold : C.green });
      // Giyotin fırsatı
      await wait(260);
      phase.current = 'gil';
      tapped.current = null;
      setGilOn(true);
      gilPulse.setValue(0);
      Animated.loop(Animated.sequence([Animated.timing(gilPulse, { toValue: 1, duration: 180, useNativeDriver: ND }), Animated.timing(gilPulse, { toValue: 0, duration: 180, useNativeDriver: ND })])).start();
      const gilEnd = now() + 650;
      while (!tapNow() && now() < gilEnd && alive.current) await wait(16);
      setGilOn(false);
      gilPulse.stopAnimation();
      if (tapNow()) {
        go('p', P('guillotine', { x: 24 }), 160);
        go('o', P('guillotineVictim', { x: 40 }), 160);
        sfx('lock');
        buzz('basari');
        results.current.push(Math.min(100, base + 25));
        setScores([...results.current]);
        flash.show({ puan: 100, metin: L("GİYOTİN! +BONUS"), renk: C.gold });
        phase.current = 'result';
        await wait(900);
        go('p', P('stance'), 280);
        go('o', P('stance'), 280);
        await wait(380);
      } else {
        results.current.push(base);
        setScores([...results.current]);
        phase.current = 'result';
        await wait(500);
        go('p', P('stance'), 280);
        go('o', P('stance'), 280);
        await wait(380);
      }
    }
    if (alive.current) setTimeout(() => onEnd(results.current.reduce((a, b) => a + b, 0) / Math.max(1, results.current.length)), 400);
  }

  useEffect(() => {
    let raf = 0;
    let odd = false;
    const loop = () => {
      // Telefonda iki dövüşçüyü saniyede 30 kez çizmek yeter (maç sahnesiyle aynı).
      odd = !odd;
      if (!ND || odd) setPoses({ p: cur('p'), o: cur('o') });
      if (alive.current) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const starter = setTimeout(() => void run(), 0);
    return () => {
      clearTimeout(starter);
      alive.current = false;
      cancelAnimationFrame(raf);
    };
    // Oyun bir kez başlar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    const ph = phase.current;
    if (ph === 'result' || tapped.current) return;
    tapped.current = { at: now() };
  };

  // Sahne (viewBox 200×150): oyuncu solda, rakip sağda karşılıklı
  const floorY = 128;
  const actor = (a: Actor) => {
    const ps = poses[a];
    const face = a === 'p' ? 1 : -1;
    const X = (a === 'p' ? 56 : 144) + face * ps.x;
    const Y = floorY - HIP_H + ps.y;
    return (
      <G key={a}>
        <Ellipse cx={X} cy={floorY + 3} rx={20} ry={4} fill="#000" opacity={0.3} />
        <G transform={`translate(${X} ${Y}) scale(${face} 1) rotate(${ps.rot})`}>
          <Figure p={{ ...ps, rot: 0 }} look={(a === 'p' ? pLook : oLook) ?? DEFAULT_LOOK} kit={a === 'p' ? kit : BLUE} />
        </G>
      </G>
    );
  };
  const order: Actor[] = poses.p.rot < -45 ? ['p', 'o'] : ['o', 'p'];

  return (
    <Pressable testID="drill-area" {...INSTANT} onPressIn={tap} style={cm.area}>
      <Progress done={scores.length} total={ROUNDS} />
      <View style={td.stage} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="10 22 180 122" preserveAspectRatio="xMidYMid meet">
          <Defs>
            <RadialGradient id="tdspot" cx="50%" cy="60%" r="60%">
              <Stop offset="0" stopColor="#3a1a20" stopOpacity={0.9} />
              <Stop offset="1" stopColor="#0b0c10" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={100} cy={floorY + 2} rx={96} ry={14} fill="url(#tdspot)" />
          <Ellipse cx={100} cy={floorY + 2} rx={90} ry={11} fill="none" stroke="#e63946" strokeOpacity={0.35} strokeWidth={0.8} />
          {order.map(actor)}
        </Svg>
      </View>
      {gilOn ? (
        <Animated.View pointerEvents="none" style={[td.gil, { transform: [{ scale: gilPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }]}>
          <Text style={[td.gilText, SLANT]}>{L("GİYOTİN! DOKUN!")}</Text>
        </Animated.View>
      ) : null}
      {flash.node}
      <Text style={cm.hint}>{L("Sadece gerçek dalışta dokun. Eğilip doğrulursa ya da jab atarsa bekle.")}</Text>
    </Pressable>
  );
}

const td = StyleSheet.create({
  stage: { position: 'absolute', left: 0, right: 0, top: 90, bottom: 70 },
  gil: { position: 'absolute', top: '22%', alignSelf: 'center', backgroundColor: C.gold, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10, zIndex: 6 },
  gilText: { color: '#111', fontFamily: F.display, fontSize: 26, letterSpacing: 1 },
});
