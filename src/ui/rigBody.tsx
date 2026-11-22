// Yeni görünümün anatomik dövüşçü çizimi. İskelet ve pozlar rigMath.ts ile aynı (bütün animasyonlar çalışır);
// yalnızca vücudun şekli değişir: kalçadan dize incelen uyluk ve ön bacak kası, baldır, ayak bileği ve ayak;
// trapez, deltoid, biceps, triceps ve ön kol; göğüs ve kanat kasıyla V gövde; diz ve dirsek eklemleri.
// Uzuvlar kapsül çizgi değil, iki yanı ayrı şişen kapalı şekiller. Hafif modda ışık ve kas çizgileri çizilmez.
import { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import type { Appearance } from '../engine/types';
import { lowPerf } from '../perfPref';
import { SKIN_TONES } from './FighterAvatar';
import { Glove, Head, Pattern, type Kit } from './rig';
import { add, down, joints, LEN, shade, type Pose } from './rigMath';

type V = { x: number; y: number };
const f1 = (n: number) => n.toFixed(1);
const pt = (v: V) => `${f1(v.x)} ${f1(v.y)}`;
const lerp = (a: V, b: V, t: number): V => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const unit = (a: V, b: V): V => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  return { x: dx / l, y: dy / l };
};

/**
 * Uzuv parçası a→b: a'da w1, b'de w2 genişlik. Bölüm boyunca `at` noktasında iki yan ayrı şişer:
 * arka = sol normal (+n) tarafı, ön = (−n) tarafı. Yandan bakan (sağa dönük) figürde dikey uzuvda +n arka, −n öndür.
 */
function seg(a: V, b: V, w1: number, w2: number, arka: number, on: number, at = 0.4): string {
  const d = unit(a, b);
  const n = { x: -d.y, y: d.x };
  const m = lerp(a, b, at);
  const wm = w1 + (w2 - w1) * at;
  const P1 = add(a, n, w1 / 2);
  const P2 = add(b, n, w2 / 2);
  const C1 = add(m, n, wm / 2 + arka);
  const P3 = add(b, n, -w2 / 2);
  const P4 = add(a, n, -w1 / 2);
  const C2 = add(m, n, -(wm / 2 + on));
  // Uçlar yuvarlak: eklemlerde boşluk kalmaz
  const E1 = add(b, d, w2 * 0.42);
  const E2 = add(a, d, -w1 * 0.42);
  return `M${pt(P1)} Q${pt(C1)} ${pt(P2)} Q${pt(E1)} ${pt(P3)} Q${pt(C2)} ${pt(P4)} Q${pt(E2)} ${pt(P1)} Z`;
}

/** Parçanın bir yanında ince ışık ya da gölge şeridi (kas hacmi) */
function rim(a: V, b: V, w1: number, w2: number, yan: 1 | -1, t0 = 0.15, t1 = 0.75, ic = 0.32): string {
  const d = unit(a, b);
  const n = { x: -d.y * yan, y: d.x * yan };
  const q0 = add(lerp(a, b, t0), n, (w1 + (w2 - w1) * t0) * ic);
  const q1 = add(lerp(a, b, t1), n, (w1 + (w2 - w1) * t1) * ic);
  const qm = add(lerp(a, b, (t0 + t1) / 2), n, (w1 + (w2 - w1) * ((t0 + t1) / 2)) * (ic + 0.1));
  return `M${pt(q0)} Q${pt(qm)} ${pt(q1)}`;
}

/** Ayak: topuk, taban ve parmak ucu; bilekten ileri bakar */
function footPath(an: V, shin: V, k = 1): string {
  const d = shin;
  const f = { x: d.y, y: -d.x };
  const heel = add(add(an, f, -2.6 * k), d, 2.4 * k);
  const toe = add(add(an, f, 7.6 * k), d, 2.9 * k);
  const ball = add(add(an, f, 5.2 * k), d, 3.4 * k);
  const instep = add(add(an, f, 3.6 * k), d, -0.2 * k);
  const top = add(add(an, f, -1.2 * k), d, -1.4 * k);
  return `M${pt(top)} Q${pt(add(an, f, 1.6 * k))} ${pt(instep)} Q${pt(add(toe, d, -2 * k))} ${pt(toe)} Q${pt(ball)} ${pt(add(ball, f, -2 * k))} L${pt(heel)} Q${pt(add(heel, f, -1.4 * k))} ${pt(top)} Z`;
}

/** Çıplak yumruk (grappling, güreş, hakem): parmak boğumları ve başparmak */
function Fist({ at, dir, skin }: { at: V; dir: number; skin: string }) {
  const d = down(dir);
  const c = add(at, d, 2.4);
  const ang = (Math.atan2(d.y, d.x) * 180) / Math.PI;
  return (
    <G>
      <Ellipse cx={c.x} cy={c.y} rx={3.6} ry={3} fill={shade(skin, -40)} transform={`rotate(${f1(ang)} ${f1(c.x)} ${f1(c.y)})`} />
      <Ellipse cx={c.x - 0.2} cy={c.y - 0.2} rx={3.2} ry={2.6} fill={skin} transform={`rotate(${f1(ang)} ${f1(c.x)} ${f1(c.y)})`} />
      <Ellipse cx={add(c, { x: -d.y, y: d.x }, 2).x} cy={add(c, { x: -d.y, y: d.x }, 2).y} rx={1.3} ry={1.7} fill={shade(skin, -14)} />
    </G>
  );
}

export function FigureHD({ p, look, kit, hasar = 0, build = 0 }: { p: Pose; look: Appearance; kit: Kit; hasar?: number; build?: number }) {
  const j = joints(p);
  const lite = lowPerf();
  const kadin = !!look.kadin;
  const bw = (1 + build * 0.16) * (kadin ? 0.92 : 1);
  const lw = (1 + build * 0.12) * (kadin ? 0.94 : 1);
  const skin = SKIN_TONES[look.ten] ?? SKIN_TONES[2];
  const skinD = shade(skin, -28);
  const skinL = shade(skin, 22);
  const ref = !!kit.ref;
  // Hakemde pantolon (koyu, kassız), dövüşçüde çıplak bacak
  const legF = ref ? '#2b2d33' : skin;
  const legB = ref ? '#1c1d21' : skinD;
  const kas = ref ? 0.25 : 1;
  const rash = kit.ust === 'rash';
  const uaF = ref ? kit.shorts : rash ? kit.shorts : skin;
  const uaB = ref ? shade(kit.shorts, -30) : rash ? shade(kit.shorts, -30) : skinD;

  // Gövde ekseni: perp (+) = ön, td = yukarı
  const P = (b: V, k: number) => add(b, j.perp, k);
  const sC = add(j.neck, j.td, -3);
  const chest = add(j.neck, j.td, -9);
  const waist = add(j.pelvis, j.td, 10);
  const hip = add(j.pelvis, j.td, 2);
  const torso = `M${pt(P(sC, 11.5 * bw))} Q${pt(P(chest, 13.4 * bw))} ${pt(P(add(chest, j.td, -5), 11 * bw))} Q${pt(P(waist, 8.6 * bw))} ${pt(P(hip, 9.4 * bw))} L${pt(P(hip, -9.4 * bw))} Q${pt(P(waist, -9.6 * bw))} ${pt(P(add(chest, j.td, -3), -12.2 * bw))} Q${pt(P(chest, -13 * bw))} ${pt(P(sC, -10.5 * bw))} Q${pt(add(j.neck, j.td, 1.5))} ${pt(P(sC, 11.5 * bw))} Z`;
  // Sırt ve kanat kası gölgesi
  const back = `M${pt(P(sC, -10.5 * bw))} Q${pt(P(chest, -13 * bw))} ${pt(P(add(chest, j.td, -3), -12.2 * bw))} Q${pt(P(waist, -9.6 * bw))} ${pt(P(hip, -9.4 * bw))} L${pt(P(hip, -4 * bw))} Q${pt(P(waist, -5 * bw))} ${pt(P(chest, -6 * bw))} Z`;
  // Trapez: boyundan omuzlara inen eğim
  const trap = `M${pt(add(j.neck, j.perp, 3))} Q${pt(add(add(j.neck, j.td, -1.5), j.perp, 7 * bw))} ${pt(P(sC, 11 * bw))} L${pt(P(sC, -10 * bw))} Q${pt(add(add(j.neck, j.td, -1.5), j.perp, -6 * bw))} ${pt(add(j.neck, j.perp, -3))} Z`;
  const gT = `bt${skin.slice(1)}`;
  const gS = `bs${kit.shorts.slice(1)}`;

  // Bacak: uyluk kalçada kalın, dizde ince; ön bacak kası önde, hamstring arkada. Baldır arkada şişer.
  const leg = (hipJ: V, kn: V, an: V, near: boolean) => {
    const c = near ? legF : legB;
    const thW = 13 * lw;
    const knW = 8.4 * lw;
    const anW = 4.8 * lw;
    const shin = unit(kn, an);
    return (
      <G>
        <Path d={seg(hipJ, kn, thW, knW, 0.9 * kas, 1.9 * kas, 0.36)} fill={shade(c, -55)} opacity={0.5} transform="translate(0.5 0.5)" />
        <Path d={seg(hipJ, kn, thW, knW, 0.9 * kas, 1.9 * kas, 0.36)} fill={c} />
        <Path d={seg(kn, an, knW, anW, 2.9 * kas, 0.5 * kas, 0.3)} fill={c} />
        <Circle cx={kn.x} cy={kn.y} r={knW * 0.5} fill={c} />
        {!ref ? <Path d={footPath(an, shin, lw)} fill={near ? skin : skinD} /> : <Path d={footPath(an, shin, lw)} fill="#111" />}
        {!lite && !ref ? (
          <>
            <Path d={rim(hipJ, kn, thW, knW, -1, 0.12, 0.78, 0.3)} stroke={skinL} strokeOpacity={near ? 0.35 : 0.18} strokeWidth={1.4} fill="none" strokeLinecap="round" />
            <Path d={rim(kn, an, knW, anW, 1, 0.08, 0.55, 0.22)} stroke={shade(c, -40)} strokeOpacity={0.35} strokeWidth={1.2} fill="none" strokeLinecap="round" />
            <Path d={rim(hipJ, kn, thW, knW, 1, 0.3, 0.85, 0.18)} stroke={shade(c, -45)} strokeOpacity={0.3} strokeWidth={1} fill="none" strokeLinecap="round" />
            <Ellipse cx={add(kn, j.perp, 1.2).x} cy={kn.y} rx={2} ry={1.6} fill={skinL} opacity={near ? 0.22 : 0.1} />
          </>
        ) : null}
      </G>
    );
  };

  // Kol: deltoid omuzda, biceps önde, triceps arkada; ön kol dirsek yanında kalın, bileğe incelir.
  const arm = (sh: V, el: V, wr: V, a1: number, a2: number, near: boolean) => {
    const uc = near ? uaF : uaB;
    const fc = near ? skin : skinD;
    const shW = 8.4 * lw;
    const elW = 6 * lw;
    const wrW = 4.4 * lw;
    const delt = add(sh, down(a1), 2.6);
    return (
      <G>
        <Path d={seg(sh, el, shW, elW, 1.0 * kas, 1.4 * kas, 0.45)} fill={uc} />
        <Path d={seg(el, wr, elW + 0.6, wrW, 1.1 * kas, 0.8 * kas, 0.25)} fill={fc} />
        <Circle cx={el.x} cy={el.y} r={elW * 0.5} fill={fc} />
        {/* Deltoid: omuz başında yuvarlak kas */}
        <Ellipse cx={delt.x} cy={delt.y} rx={5.6 * bw} ry={5 * bw} fill={near ? (rash || ref ? uaF : skin) : uaB} />
        {!lite && !ref ? (
          <>
            <Path d={rim(sh, el, shW, elW, -1, 0.2, 0.8, 0.26)} stroke={near ? skinL : skin} strokeOpacity={near ? 0.32 : 0.15} strokeWidth={1.2} fill="none" strokeLinecap="round" />
            <Path d={rim(el, wr, elW, wrW, 1, 0.1, 0.6, 0.22)} stroke={shade(fc, -40)} strokeOpacity={0.3} strokeWidth={1} fill="none" strokeLinecap="round" />
            {near ? <Ellipse cx={delt.x - 1} cy={delt.y - 1.6} rx={2.6} ry={1.6} fill="#ffffff" opacity={0.13} /> : null}
          </>
        ) : null}
        {kit.bare || ref ? <Fist at={wr} dir={a1 + a2} skin={near ? skin : skinD} /> : <Glove at={wr} dir={a1 + a2} color={near ? kit.glove : shade(kit.glove, -25)} skin={skin} />}
      </G>
    );
  };

  const thighMidL = add(j.hipL, down(p.lL1), LEN.th * 0.56);
  const thighMidR = add(j.hipR, down(p.lR1), LEN.th * 0.56);
  const shortsTop = add(j.pelvis, j.td, 4);
  const abs = add(j.pelvis, j.td, 12);

  return (
    <G>
      <Defs>
        <LinearGradient id={gT} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={shade(skin, 20)} />
          <Stop offset="0.5" stopColor={skin} />
          <Stop offset="1" stopColor={shade(skin, -36)} />
        </LinearGradient>
        <LinearGradient id={gS} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(kit.shorts, 24)} />
          <Stop offset="1" stopColor={shade(kit.shorts, -30)} />
        </LinearGradient>
      </Defs>

      {/* Arka bacak ve arka kol */}
      {leg(j.hipR, j.knR, j.anR, false)}
      {arm(j.shR, j.elR, j.wrR, p.aR1, p.aR2, false)}

      {/* Gövde: V şekli, göğüs ve kanat kası */}
      <Path d={torso} fill={shade(ref ? kit.shorts : skin, -70)} opacity={0.45} transform="translate(0.6 0.6)" />
      <Path d={torso} fill={ref ? kit.shorts : `url(#${gT})`} />
      <Path d={back} fill={ref ? '#000' : skinD} opacity={ref ? 0.35 : 0.5} />
      <Path d={trap} fill={ref ? kit.shorts : skin} />
      {!ref && !lite ? (
        <>
          {/* Göğüs alt çizgisi, karın kasları, yan karın */}
          <Path d={`M${pt(P(chest, 12 * bw))} Q${pt(P(add(chest, j.td, -4), 8 * bw))} ${pt(P(add(chest, j.td, -2), 1 * bw))}`} stroke={shade(skin, -50)} strokeWidth={1.1} fill="none" opacity={0.6} />
          <Path d={`M${pt(P(add(chest, j.td, 3), 10 * bw))} Q${pt(P(add(chest, j.td, 2), 6 * bw))} ${pt(P(add(chest, j.td, 0.5), 2 * bw))}`} stroke={skinL} strokeWidth={1.4} fill="none" opacity={0.25} />
          {[0, 3.6, 7.2].map((k) => (
            <Path key={k} d={`M${pt(P(add(abs, j.td, k), 2.5 * bw))} Q${pt(P(add(abs, j.td, k - 0.6), 5.5 * bw))} ${pt(P(add(abs, j.td, k), 8 * bw))}`} stroke={shade(skin, -45)} strokeWidth={0.7} fill="none" opacity={0.45} />
          ))}
          <Line x1={P(add(abs, j.td, -2), 5.2 * bw).x} y1={P(add(abs, j.td, -2), 5.2 * bw).y} x2={P(add(abs, j.td, 10), 5.4 * bw).x} y2={P(add(abs, j.td, 10), 5.4 * bw).y} stroke={shade(skin, -45)} strokeWidth={0.6} opacity={0.4} />
          <Path d={`M${pt(P(waist, 8.6 * bw))} Q${pt(P(add(waist, j.td, 4), 6.4 * bw))} ${pt(P(add(chest, j.td, -6), 9.5 * bw))}`} stroke={shade(skin, -40)} strokeWidth={0.8} fill="none" opacity={0.4} />
          <Ellipse cx={P(chest, 7 * bw).x} cy={P(chest, 7 * bw).y} rx={3.6} ry={2.2} fill="#ffffff" opacity={0.12} />
          {look.dovme ? <Path d={`M${pt(P(chest, -6))} q3 5 -1 9`} stroke="#1d1d1d" strokeWidth={1.3} fill="none" opacity={0.55} /> : null}
          {look.dovmeler?.includes('gogus') ? <Path d={`M${pt(P(chest, 5))} q3 -3 6 0 q-3 2 -6 0`} stroke="#1d1d1d" strokeWidth={1.2} fill="none" opacity={0.6} /> : null}
          {look.dovmeler?.includes('boyun') ? <Circle cx={P(j.neck, 2.5).x} cy={P(j.neck, 2.5).y} r={1.1} fill="#1d1d1d" opacity={0.6} /> : null}
        </>
      ) : null}
      {ref ? <Line x1={P(sC, 3).x} y1={P(sC, 3).y} x2={P(j.pelvis, 3).x} y2={P(j.pelvis, 3).y} stroke="#ffffff" strokeWidth={0.8} opacity={0.35} /> : null}
      {kadin && !ref && !kit.ust ? (
        <>
          {/* Spor sütyeni: göğsü saran bant, önde hafif yuvarlak */}
          <Path d={`M${pt(P(add(chest, j.td, 5), 12.4 * bw))} Q${pt(P(add(chest, j.td, 1), 14.2 * bw))} ${pt(P(add(chest, j.td, -4.5), 12.2 * bw))} L${pt(P(add(chest, j.td, -4.5), -12.4 * bw))} L${pt(P(add(chest, j.td, 5), -12.6 * bw))} Z`} fill={`url(#${gS})`} />
          <Line x1={P(add(chest, j.td, 4.4), 12.2 * bw).x} y1={P(add(chest, j.td, 4.4), 12.2 * bw).y} x2={P(add(chest, j.td, 4.4), -12.4 * bw).x} y2={P(add(chest, j.td, 4.4), -12.4 * bw).y} stroke={kit.trim} strokeWidth={0.9} opacity={0.7} />
          <Line x1={P(sC, 4).x} y1={P(sC, 4).y} x2={P(add(chest, j.td, -4), 6).x} y2={P(add(chest, j.td, -4), 6).y} stroke={kit.shorts} strokeWidth={1.6} />
        </>
      ) : null}
      {/* Güreş mayosu / rashguard */}
      {!ref && kit.ust ? (
        <G>
          <Path d={torso} fill={`url(#${gS})`} />
          <Path d={back} fill="#000" opacity={0.22} />
          {kit.ust === 'singlet' ? (
            <>
              <Path d={trap} fill={skin} />
              <Ellipse cx={P(sC, 1).x} cy={P(sC, 1).y + 2} rx={6.8} ry={3.4} fill={skin} />
              <Line x1={P(sC, 7).x} y1={P(sC, 7).y} x2={P(chest, 7).x} y2={P(chest, 7).y + 3} stroke={kit.trim} strokeWidth={1.1} opacity={0.7} />
            </>
          ) : (
            <>
              <Path d={trap} fill={kit.shorts} />
              <Line x1={P(sC, 3).x} y1={P(sC, 3).y} x2={P(j.pelvis, 3).x} y2={P(j.pelvis, 3).y} stroke={kit.trim} strokeWidth={1.4} opacity={0.6} />
            </>
          )}
        </G>
      ) : null}

      {/* Şort: arka bacak payı ve bel */}
      {!ref ? (
        <G>
          <Path d={seg(j.hipR, thighMidR, 14 * lw, 12.6 * lw, 0.4, 0.4, 0.5)} fill={shade(kit.shorts, -32)} />
          {kit.desen ? <Pattern a={j.hipR} b={thighMidR} kind={kit.desen} color={shade(kit.desenRenk ?? kit.trim, -25)} op={0.7} /> : null}
          {/* Bel: kalçayı saran şort gövdesi, üstte lastik bant */}
          <Path d={`M${pt(P(add(shortsTop, j.td, 2.5), 9.6 * bw))} L${pt(P(add(shortsTop, j.td, 2.5), -9.8 * bw))} Q${pt(P(add(j.pelvis, j.td, -2), -11 * bw))} ${pt(P(add(j.pelvis, j.td, -4), -8 * bw))} L${pt(P(add(j.pelvis, j.td, -4), 8 * bw))} Q${pt(P(add(j.pelvis, j.td, -2), 11 * bw))} ${pt(P(add(shortsTop, j.td, 2.5), 9.6 * bw))} Z`} fill={`url(#${gS})`} />
          <Path d={`M${pt(P(add(shortsTop, j.td, 2.5), 9.6 * bw))} L${pt(P(add(shortsTop, j.td, 2.5), -9.8 * bw))} L${pt(P(add(shortsTop, j.td, 0.2), -9.9 * bw))} L${pt(P(add(shortsTop, j.td, 0.2), 9.7 * bw))} Z`} fill={shade(kit.shorts, -40)} />
        </G>
      ) : null}

      <Head c={j.head} ang={p.torso + p.head} look={look} skin={skin} ref={ref} hasar={ref ? 0 : hasar} />

      {/* Ön bacak ve şortun ön paçası */}
      {leg(j.hipL, j.knL, j.anL, true)}
      {!ref ? (
        <G>
          <Path d={seg(j.hipL, thighMidL, 14.6 * lw, 13.4 * lw, 0.6, 0.6, 0.5)} fill={shade(kit.shorts, -55)} opacity={0.55} transform="translate(0.5 0.6)" />
          <Path d={seg(j.hipL, thighMidL, 14.4 * lw, 13.2 * lw, 0.6, 0.6, 0.5)} fill={`url(#${gS})`} />
          {kit.desen ? <Pattern a={j.hipL} b={thighMidL} kind={kit.desen} color={kit.desenRenk ?? kit.trim} /> : null}
          <Path d={rim(j.hipL, thighMidL, 14.4, 13.2, -1, 0.1, 0.9, 0.3)} stroke="#ffffff" strokeOpacity={0.14} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <Line x1={P(add(shortsTop, j.td, 0.2), 9.6 * bw).x} y1={P(add(shortsTop, j.td, 0.2), 9.6 * bw).y} x2={P(add(shortsTop, j.td, 0.2), -9.8 * bw).x} y2={P(add(shortsTop, j.td, 0.2), -9.8 * bw).y} stroke={kit.trim} strokeWidth={1.1} opacity={0.75} />
          <Line x1={lerp(j.hipL, thighMidL, 0.55).x} y1={lerp(j.hipL, thighMidL, 0.55).y} x2={lerp(j.hipL, thighMidL, 0.82).x} y2={lerp(j.hipL, thighMidL, 0.82).y} stroke={kit.trim} strokeWidth={4.5} strokeLinecap="round" opacity={0.5} />
        </G>
      ) : null}

      {/* Ön kol en üstte */}
      {arm(j.shL, j.elL, j.wrL, p.aL1, p.aL2, true)}
      {!ref && look.dovmeler?.includes('kol') ? (
        <Line x1={lerp(j.shL, j.elL, 0.25).x} y1={lerp(j.shL, j.elL, 0.25).y} x2={lerp(j.shL, j.elL, 0.85).x} y2={lerp(j.shL, j.elL, 0.85).y} stroke="#1d1d1d" strokeWidth={2.6} strokeDasharray="2 1.5" opacity={0.5} />
      ) : null}
    </G>
  );
}
