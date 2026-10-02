// Gerçek zamanlı sparring: 25 saniye. JAB (hızlı, hafif), DİREKT (ağır, kondisyon yer), KAÇ (sıyrıl).
// Partner "⚠️" ile saldırı hazırlar: doğru anda kaçarsan kontra penceresi açılır (yumruklar çift hasar);
// hazırlık sırasında vurursan saldırısını kesersin. "🛡️" gardında yumruklar etkisiz; bazen çalım atar.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, G, Text as SvgText } from 'react-native-svg';
import { sfx } from '../../audio';
import { playerKit } from '../../cosmetics';
import type { Appearance } from '../../engine/types';
import { buzz } from '../../haptics';
import { L } from '../../i18n';
import { DEFAULT_LOOK } from '../FighterAvatar';
import { Figure, HIP_H, lerpPose, POSES, type Pose, type PoseName } from '../rig';
import { C, F } from '../theme';
import { cm, INSTANT, ND, now, rnd, useFlash, wait } from './common';

const DURATION = 25_000;
const BLUE = { shorts: '#1f4fbf', trim: '#ffffff', glove: '#1740a8' };
type Actor = 'p' | 'o';
type OState = 'idle' | 'windup' | 'strike' | 'guard' | 'hurt';

const P = (n: PoseName, ov: Partial<Pose> = {}): Pose => ({ ...POSES[n], ...ov });

function Bar({ v, color }: { v: number; color: string }) {
  return (
    <View style={sp.bar}>
      <View style={{ width: `${v}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

export function SparGame({ onEnd, pLook, oLook }: { onEnd: (p: number) => void; pLook?: Appearance; oLook?: Appearance }) {
  const [kit] = useState(playerKit);
  const [poses, setPoses] = useState<Record<Actor, Pose>>({ p: POSES.stance, o: POSES.stance });
  const [hud, setHud] = useState({ pHp: 100, oHp: 100, sta: 100, left: DURATION, o: 'idle' as OState, counter: false });
  const flash = useFlash(30);
  const tw = useRef<Record<Actor, { from: Pose; to: Pose; t0: number; ms: number }>>({
    p: { from: P('stance'), to: P('stance'), t0: 0, ms: 1 },
    o: { from: P('stance'), to: P('stance'), t0: 0, ms: 1 },
  });
  const g = useRef({ pHp: 100, oHp: 100, sta: 100, o: 'idle' as OState, busyUntil: 0, dodgeUntil: 0, counterUntil: 0, dealt: 0, taken: 0, dodges: 0, interrupts: 0, t0: 0 });
  const alive = useRef(true);

  const cur = (a: Actor) => {
    const x = tw.current[a];
    return lerpPose(x.from, x.to, Math.min(1, (now() - x.t0) / x.ms));
  };
  const go = (a: Actor, to: Pose, ms: number) => {
    tw.current[a] = { from: cur(a), to, t0: now(), ms: Math.max(1, ms) };
  };

  const hitPartner = (base: number, label: string, heavy = false) => {
    const s = g.current;
    const state = s.o;
    const counter = now() < s.counterUntil;
    let dmg = base * (counter ? 2 : 1) * (s.sta < 25 ? 0.5 : 1);
    if (s.o === 'guard') dmg *= 0.25;
    if (s.o === 'windup' && !heavy) {
      // Hazırlıktaki rakibe jab yarım işler; saldırıyı sadece direkt keser
      dmg *= 0.5;
      flash.show({ puan: 40, metin: label, renk: C.dim });
    } else if (s.o === 'windup') {
      // Hazırlığı kestin
      s.interrupts++;
      s.o = 'hurt';
      dmg += 6;
      flash.show({ puan: 100, metin: L("KESTİN!"), renk: C.gold });
      go('o', P('hurt', { x: -4 }), 120);
    } else if (counter) flash.show({ puan: 100, metin: L("KONTRA!"), renk: C.gold });
    else if (s.o === 'guard') flash.show({ puan: 40, metin: L("GARDA"), renk: C.dim });
    else flash.show({ puan: 70, metin: label, renk: C.green });
    s.oHp = Math.max(0, s.oHp - dmg);
    s.dealt += dmg;
    sfx(dmg > 10 ? 'heavy' : s.o === 'guard' ? 'body' : 'punch');
    buzz(dmg > 10 ? 'orta' : 'hafif');
    if (state === 'idle' || state === 'strike' || state === 'hurt') go('o', P('stance', { torso: -10, head: -14, x: -5 }), 90);
  };

  const act = (kind: 'jab' | 'direkt' | 'kac') => {
    const s = g.current;
    const t = now();
    if (t < s.busyUntil || !alive.current) return;
    if (kind === 'kac') {
      s.busyUntil = t + 320;
      s.dodgeUntil = t + 340;
      go('p', P('stance', { torso: -20, head: -16, x: -10, y: 3 }), 90);
      setTimeout(() => go('p', P('stance'), 160), 300);
      return;
    }
    const cost = kind === 'jab' ? 8 : 20;
    if (s.sta < cost) {
      flash.show({ puan: 0, metin: L("NEFESİN YOK"), renk: C.red });
      return;
    }
    s.sta -= cost;
    s.busyUntil = t + (kind === 'jab' ? 240 : 430);
    const reach = 14;
    if (kind === 'jab') {
      go('p', P('jab', { x: reach }), 90);
      setTimeout(() => hitPartner(3, L("JAB")), 90);
      setTimeout(() => go('p', P('stance'), 140), 180);
    } else {
      go('p', P('stance', { torso: 8, x: 2 }), 120);
      setTimeout(() => go('p', P('cross', { x: reach + 2 }), 100), 140);
      setTimeout(() => hitPartner(10, L("DİREKT!"), true), 230);
      setTimeout(() => go('p', P('stance'), 160), 340);
    }
  };

  async function partnerAI() {
    const s = g.current;
    await wait(700);
    let n = 0;
    while (alive.current && now() - s.t0 < DURATION && s.oHp > 0 && s.pHp > 0) {
      s.o = 'idle';
      const idle = 500 + rnd() * 700;
      const t0 = now();
      let up = true;
      while (now() - t0 < idle && alive.current) {
        go('o', P('stance', { y: up ? 0 : 2, x: up ? 0 : 2 }), 240);
        up = !up;
        await wait(250);
      }
      const roll = rnd();
      n++;
      if (roll < 0.25) {
        s.o = 'guard';
        go('o', P('stance', { aL1: 70, aL2: 145, aR1: 62, aR2: 150, torso: 4, head: -4 }), 140);
        await wait(1100);
        continue;
      }
      // Hazırlık (telegraf)
      s.o = 'windup';
      go('o', P('stance', { torso: -12, x: -6, y: 2 }), 160);
      const windup = Math.max(380, 650 - n * 12) * (0.85 + rnd() * 0.3);
      await wait(windup);
      if (s.o !== 'windup') {
        // Kesildi
        await wait(500);
        continue;
      }
      if (roll < 0.38) {
        // Çalım: geri çekilir
        s.o = 'idle';
        go('o', P('stance'), 160);
        await wait(300);
        continue;
      }
      // Vuruş
      s.o = 'strike';
      go('o', P(rnd() < 0.5 ? 'cross' : 'hook', { x: 14 }), 110);
      sfx('whoosh', 0.6);
      await wait(120);
      if (now() < s.dodgeUntil) {
        s.dodges++;
        s.counterUntil = now() + 950;
        flash.show({ puan: 100, metin: L("KAÇTIN! ŞİMDİ KONTRA!"), renk: C.gold });
        buzz('basari');
      } else {
        const dmg = 11;
        s.pHp = Math.max(0, s.pHp - dmg);
        s.taken += dmg;
        flash.show({ puan: 0, metin: L("YEDİN"), renk: C.red });
        go('p', P('stance', { torso: -12, head: -22, x: -7 }), 90);
        setTimeout(() => go('p', P('stance'), 200), 220);
        sfx('punch');
        buzz('guclu');
      }
      await wait(260);
      go('o', P('stance'), 180);
    }
  }

  const finish = () => {
    const s = g.current;
    const score = Math.max(0, Math.min(100, Math.round(45 + (s.dealt - s.taken) * 0.45 + s.dodges * 4 + s.interrupts * 3 + (s.oHp <= 0 ? 15 : 0) - (s.pHp <= 0 ? 15 : 0))));
    onEnd(score);
  };

  useEffect(() => {
    const s = g.current;
    s.t0 = now();
    let raf = 0;
    let odd = false;
    let ended = false;
    let last = now();
    const loop = () => {
      odd = !odd;
      const t = now();
      // Kondisyon zamanla dolar (saniyede ~12, kare hızından bağımsız)
      s.sta = Math.min(100, s.sta + (t - last) * 0.012);
      last = t;
      if (!ND || odd) {
        setPoses({ p: cur('p'), o: cur('o') });
        setHud({ pHp: s.pHp, oHp: s.oHp, sta: s.sta, left: Math.max(0, DURATION - (t - s.t0)), o: s.o, counter: t < s.counterUntil });
      }
      if (!ended && (t - s.t0 >= DURATION || s.oHp <= 0 || s.pHp <= 0)) {
        ended = true;
        alive.current = false;
        setTimeout(finish, 600);
      }
      if (!ended) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const starter = setTimeout(() => void partnerAI(), 0);
    return () => {
      clearTimeout(starter);
      alive.current = false;
      cancelAnimationFrame(raf);
    };
    // Oyun bir kez başlar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const floorY = 128;
  const actor = (a: Actor) => {
    const ps = poses[a];
    const face = a === 'p' ? 1 : -1;
    const X = (a === 'p' ? 68 : 132) + face * ps.x;
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
  return (
    <View style={cm.area}>
      <View style={sp.hud}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={sp.label}>{L("SEN")}</Text>
          <Bar v={hud.pHp} color={C.red} />
          <Bar v={hud.sta} color={C.gold} />
        </View>
        <Text style={sp.time}>{Math.ceil(hud.left / 1000)}</Text>
        <View style={{ flex: 1, gap: 3, alignItems: 'flex-end' }}>
          <Text style={sp.label}>{L("PARTNER")}</Text>
          <Bar v={hud.oHp} color={C.blue} />
        </View>
      </View>
      <View style={sp.stage} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="10 22 180 122" preserveAspectRatio="xMidYMid meet">
          <Ellipse cx={100} cy={floorY + 2} rx={90} ry={11} fill="none" stroke="#e63946" strokeOpacity={0.35} strokeWidth={0.8} />
          {['o', 'p'].map((a) => actor(a as Actor))}
          {hud.o === 'windup' ? (
            <SvgText x={132} y={52} fontSize={16} textAnchor="middle">
              ⚠️
            </SvgText>
          ) : hud.o === 'guard' ? (
            <SvgText x={132} y={52} fontSize={16} textAnchor="middle">
              🛡️
            </SvgText>
          ) : null}
        </Svg>
      </View>
      {hud.counter ? <Text style={sp.counter}>{L("KONTRA PENCERESİ!")}</Text> : null}
      {flash.node}
      <View style={sp.btns}>
        {(
          [
            ['kac', L("KAÇ"), C.blue],
            ['jab', L("JAB"), C.green],
            ['direkt', L("DİREKT"), C.red],
          ] as const
        ).map(([k, label, col]) => (
          <Pressable key={k} testID={`spar-${k}`} {...INSTANT} onPressIn={() => act(k)} style={({ pressed }) => [sp.btn, { borderColor: col }, pressed && { backgroundColor: col + '40' }]}>
            <Text style={[sp.btnText, { color: col }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={cm.hint}>{L("⚠️ görünce KAÇ, sonra hemen vur. 🛡️ gardına vurma.")}</Text>
    </View>
  );
}

const sp = StyleSheet.create({
  hud: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  label: { color: C.dim, fontFamily: F.semi, fontSize: 10, letterSpacing: 1 },
  bar: { width: '100%', height: 7, borderRadius: 3, backgroundColor: '#ffffff1a', overflow: 'hidden' },
  time: { color: C.text, fontFamily: F.display, fontSize: 24, width: 40, textAlign: 'center' },
  stage: { position: 'absolute', left: 0, right: 0, top: 70, bottom: 150 },
  counter: { position: 'absolute', top: '30%', alignSelf: 'center', color: '#111', backgroundColor: C.gold, fontFamily: F.display, fontSize: 18, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  btns: { position: 'absolute', left: 0, right: 0, bottom: 34, flexDirection: 'row', gap: 10, paddingHorizontal: 6 },
  btn: { flex: 1, borderWidth: 2, borderRadius: 14, paddingVertical: 20, alignItems: 'center', backgroundColor: '#0d0e12' },
  btnText: { fontFamily: F.display, fontSize: 16, letterSpacing: 1 },
});
