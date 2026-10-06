// Eklemli dövüşçü iskeleti (yandan görünüş, sağa bakar). Poz = açılar; çizim ileri kinematikle yapılır.
// Açı kuralları: kol/bacak açısı "aşağı"dan ölçülür, pozitif = ileri (rakibe doğru). Gövde açısı dikeyden, pozitif = öne eğilme.
import { L } from '../i18n';
import { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import type { Appearance } from '../engine/types';
import { HAIR_COLORS, SKIN_TONES } from './FighterAvatar';
import { add, down, joints, LEN, shade, type Pose } from './rigMath';
export { HIP_H, joints, lerpPose, POSES, type Pose, type PoseName } from './rigMath';

export type Kit = { shorts: string; trim: string; glove: string; ref?: boolean };

/** Uzuv: koyu dış hat, ortada kas şişkinliği, üstten gelen ışık ve spot kenar parlaması. */
function Limb({ a, b, w, color, muscle = 1.12 }: { a: { x: number; y: number }; b: { x: number; y: number }; w: number; color: string; muscle?: number }) {
  const at = (k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
  const m1 = at(0.22);
  const m2 = at(0.62);
  return (
    <>
      {/* Dış hat: hem uzuv hem kas şişkinliği için (yoksa uçlar koyu, orta açık kalır) */}
      <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={shade(color, -70)} strokeOpacity={0.55} strokeWidth={w + 1.4} strokeLinecap="round" />
      <Line x1={m1.x} y1={m1.y} x2={m2.x} y2={m2.y} stroke={shade(color, -70)} strokeOpacity={0.55} strokeWidth={w * muscle + 1.4} strokeLinecap="round" />
      <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <Line x1={m1.x} y1={m1.y} x2={m2.x} y2={m2.y} stroke={color} strokeWidth={w * muscle} strokeLinecap="round" />
      <Line x1={m1.x + 0.3} y1={m1.y + 0.9} x2={m2.x + 0.3} y2={m2.y + 0.9} stroke={shade(color, -30)} strokeOpacity={0.14} strokeWidth={w * 0.55} strokeLinecap="round" />
      {/* Üst kenarda ince ışık (uzvun içinde ikinci bir kapsül gibi görünmesin) */}
      <Line x1={m1.x + 0.6} y1={m1.y - w * 0.3} x2={m2.x + 0.6} y2={m2.y - w * 0.3} stroke="#ffffff" strokeOpacity={0.12} strokeWidth={w * 0.18} strokeLinecap="round" />
      <Line x1={m1.x - 0.2} y1={m1.y - w * 0.42} x2={m2.x - 0.2} y2={m2.y - w * 0.42} stroke="#ffe9c9" strokeOpacity={0.2} strokeWidth={0.6} strokeLinecap="round" />
    </>
  );
}

function Glove({ at, dir, color, bare, skin }: { at: { x: number; y: number }; dir: number; color: string; bare?: boolean; skin: string }) {
  if (bare) return <Circle cx={at.x} cy={at.y} r={3.4} fill={skin} />;
  const d = down(dir);
  const c = add(at, d, 2);
  const th = add(c, { x: -d.y, y: d.x }, 3.6);
  return (
    <G>
      <Line x1={at.x} y1={at.y} x2={at.x - d.x * 2.5} y2={at.y - d.y * 2.5} stroke={shade(color, -40)} strokeWidth={5} />
      <Line x1={at.x - d.x * 0.6} y1={at.y - d.y * 0.6} x2={at.x - d.x * 1.6} y2={at.y - d.y * 1.6} stroke="#f2f2f2" strokeOpacity={0.55} strokeWidth={5.2} />
      <Circle cx={c.x} cy={c.y} r={5.4} fill={shade(color, -45)} />
      <Circle cx={c.x - 0.3} cy={c.y - 0.3} r={5} fill={color} />
      <Ellipse cx={th.x} cy={th.y} rx={1.8} ry={2.4} fill={shade(color, -20)} />
      <Circle cx={c.x - 1.6} cy={c.y - 1.8} r={2} fill="#ffffff" opacity={0.32} />
      <Circle cx={c.x - 2.2} cy={c.y - 2.4} r={0.8} fill="#ffffff" opacity={0.7} />
    </G>
  );
}

function Head({ c, ang, look, skin, ref, hasar = 0 }: { c: { x: number; y: number }; ang: number; look: Appearance; skin: string; ref?: boolean; hasar?: number }) {
  const hair = HAIR_COLORS[look.sacRenk] ?? HAIR_COLORS[0];
  const dark = shade(skin, -35);
  const s = look.sac;
  return (
    <G transform={L("rotate({0} {1} {2})", [ang, c.x, c.y])}>
      {s === 'afro' ? <Circle cx={c.x - 1} cy={c.y - 3} r={12.5} fill={hair} /> : null}
      {s === 'topuz' ? <Circle cx={c.x - 8} cy={c.y - 7} r={4} fill={hair} /> : null}
      {s === 'uzun' || s === 'orgu' ? <Path d={L("M{0} {1} q-5 10 -2 18 l4 0 q-2 -8 2 -16 z", [c.x - 7, c.y - 6])} fill={hair} /> : null}
      {s === 'atkuyrugu' ? <Path d={`M${c.x - 6} ${c.y - 7} q-9 1 -9 10 q0 5 -3 9 q7 -2 8 -9 q1 -5 5 -6 z`} fill={hair} /> : null}
      {/* Boyun */}
      <Line x1={c.x - 1} y1={c.y + 6} x2={c.x - 2} y2={c.y + 13} stroke={dark} strokeWidth={7} strokeLinecap="round" />
      {/* Kafa ve çene */}
      <Ellipse cx={c.x} cy={c.y} rx={8.6} ry={10} fill={shade(skin, -60)} opacity={0.45} />
      <Ellipse cx={c.x} cy={c.y} rx={8.2} ry={9.6} fill={skin} />
      <Ellipse cx={c.x + 2.5} cy={c.y - 4.5} rx={4} ry={2.6} fill="#ffffff" opacity={0.1} />
      <Path d={L("M{0} {1} q6 8 13 2 l-1 -5 z", [c.x - 6, c.y + 4])} fill={dark} opacity={0.35} />
      {/* Kulak */}
      <Ellipse cx={c.x - 3} cy={c.y + 1} rx={2} ry={2.8} fill={dark} />
      {/* Saç */}
      {s === 'kisa' || s === 'topuz' || s === 'uzun' || s === 'orgu' || s === 'atkuyrugu' ? <Path d={L("M{0} {1} q1 -11 10 -10.5 q6 1 7 6 q-7 -3 -13 1 q-1 1 -4 3.5 z", [c.x - 8.4, c.y - 1])} fill={hair} /> : null}
      {s === 'kazik' ? <Path d={L("M{0} {1} q1 -9 9.5 -9.3 q6 0.5 7 5 q-8 -2 -16.5 4.3 z", [c.x - 8.2, c.y - 2])} fill={hair} opacity={0.55} /> : null}
      {s === 'mohawk' ? <Path d={L("M{0} {1} q5 -9 12 -4 l-2 3 q-5 -3 -10 1 z", [c.x - 6, c.y - 6])} fill={hair} /> : null}
      {/* Kaş, göz, burun */}
      <Line x1={c.x + 3} y1={c.y - 3.2} x2={c.x + 7.6} y2={c.y - 2.4} stroke={ref ? '#333' : hair} strokeWidth={1.4} strokeLinecap="round" />
      <Circle cx={c.x + 5.4} cy={c.y - 0.8} r={1.1} fill="#141414" />
      <Path d={L("M{0} {1} l1.8 3.6 l-2 0.6 z", [c.x + 7.6, c.y - 0.5])} fill={dark} />
      <Line x1={c.x + 4.4} y1={c.y + 5.2} x2={c.x + 7} y2={c.y + 4.8} stroke={shade(skin, -60)} strokeWidth={0.9} strokeLinecap="round" />
      {/* Sakal */}
      {!look.kadin && look.sakal === 'tam' ? <Path d={L("M{0} {1} q5 11 11 2 l-1 -3 q-4 4 -10 1 z", [c.x - 3, c.y + 2])} fill={hair} /> : null}
      {!look.kadin && look.sakal === 'kirli' ? <Path d={L("M{0} {1} q5 8 10 1", [c.x - 2, c.y + 3])} stroke={hair} strokeWidth={2.4} opacity={0.45} fill="none" /> : null}
      {!look.kadin && look.sakal === 'keci' ? <Path d={L("M{0} {1} q2 5 5 0", [c.x + 3, c.y + 6])} stroke={hair} strokeWidth={2.2} fill="none" /> : null}
      {!look.kadin && look.sakal === 'biyik' ? <Line x1={c.x + 4.4} y1={c.y + 3.6} x2={c.x + 8} y2={c.y + 3.4} stroke={hair} strokeWidth={1.6} strokeLinecap="round" /> : null}
      {look.yara ? <Line x1={c.x + 2} y1={c.y - 5} x2={c.x + 4} y2={c.y - 1} stroke="#b04a4a" strokeWidth={0.8} /> : null}
      {/* Hasar: göz altı morluğu, kaşta şişlik, ağır hasarda kaştan süzülen kan */}
      {hasar > 25 ? <Ellipse cx={c.x + 5.2} cy={c.y + 1.4} rx={2.6} ry={1.7} fill="#5b2a6e" opacity={Math.min(0.55, (hasar - 25) / 90)} /> : null}
      {hasar > 45 ? <Ellipse cx={c.x + 5} cy={c.y - 3.6} rx={2.8} ry={1.6} fill={shade(skin, -18)} opacity={0.9} /> : null}
      {hasar > 45 ? <Ellipse cx={c.x + 5} cy={c.y - 3.8} rx={1.8} ry={0.9} fill="#b0353a" opacity={Math.min(0.7, (hasar - 45) / 60)} /> : null}
      {hasar > 60 ? <Path d={`M${c.x + 6} ${c.y - 3} q0.6 3 -0.4 6 q-0.4 2 0.2 4`} stroke="#a3121b" strokeWidth={1.1} fill="none" opacity={Math.min(0.85, (hasar - 60) / 40)} strokeLinecap="round" /> : null}
      {hasar > 75 ? <Ellipse cx={c.x + 7.3} cy={c.y + 4.4} rx={1.3} ry={0.9} fill="#a3121b" opacity={0.7} /> : null}
    </G>
  );
}

/** Dövüşçü (ya da hakem) figürü. Koordinatlar: kalça merkezi (0,0). */
export function Figure({ p, look, kit, hasar = 0 }: { p: Pose; look: Appearance; kit: Kit; hasar?: number }) {
  const j = joints(p);
  const skin = SKIN_TONES[look.ten] ?? SKIN_TONES[2];
  const skinD = shade(skin, -26);
  const ref = !!kit.ref;
  const legC = ref ? '#2b2d33' : skin;
  const legCD = ref ? '#1c1d21' : skinD;
  const armC = skin;
  // Gövde: omuzlardan kalçaya daralan şekil
  const sC = add(j.neck, j.td, -3);
  const wC = add(j.pelvis, j.td, 8);
  const pt = (b: { x: number; y: number }, k: number) => add(b, j.perp, k);
  const torsoPath = L("M{0} {1} Q{2} {3} {4} {5} L{6} {7} Q{8} {9} {10} {11} Z", [pt(sC, 11).x, pt(sC, 11).y, pt(wC, 10).x, pt(wC, 10).y, pt(j.pelvis, 8.5).x, pt(j.pelvis, 8.5).y, pt(j.pelvis, -8.5).x, pt(j.pelvis, -8.5).y, pt(wC, -9).x, pt(wC, -9).y, pt(sC, -10).x, pt(sC, -10).y]);
  const backPath = L("M{0} {1} Q{2} {3} {4} {5} L{6} {7} L{8} {9} Z", [pt(sC, -10).x, pt(sC, -10).y, pt(wC, -9).x, pt(wC, -9).y, pt(j.pelvis, -8.5).x, pt(j.pelvis, -8.5).y, pt(j.pelvis, -2).x, pt(j.pelvis, -2).y, pt(sC, -3).x, pt(sC, -3).y]);
  const chest = add(sC, j.td, -7);
  const abs = add(j.pelvis, j.td, 12);
  const shortsTop = add(j.pelvis, j.td, 4);
  const thighMidL = add(j.hipL, down(p.lL1), LEN.th * 0.5);
  const thighMidR = add(j.hipR, down(p.lR1), LEN.th * 0.5);
  // Gradyan kimlikleri renge göre (aynı renk aynı tanımı paylaşır)
  const gT = `tg${skin.slice(1)}`;
  const gS = `sg${kit.shorts.slice(1)}`;

  return (
    <G>
      <Defs>
        <LinearGradient id={gT} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={shade(skin, 18)} />
          <Stop offset="0.55" stopColor={skin} />
          <Stop offset="1" stopColor={shade(skin, -34)} />
        </LinearGradient>
        <LinearGradient id={gS} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(kit.shorts, 22)} />
          <Stop offset="1" stopColor={shade(kit.shorts, -28)} />
        </LinearGradient>
        <RadialGradient id="sheen" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* Arka bacak ve kol */}
      <Limb a={j.hipR} b={j.knR} w={10} color={legCD} />
      <Limb a={j.knR} b={j.anR} w={8} color={legCD} />
      <Ellipse cx={j.anR.x + 2.5} cy={j.anR.y + 1} rx={5} ry={2.4} fill={ref ? '#111' : skinD} />
      <Limb a={j.shR} b={j.elR} w={7.5} color={shade(armC, -26)} />
      <Limb a={j.elR} b={j.wrR} w={6.5} color={shade(armC, -26)} />
      <Glove at={j.wrR} dir={p.aR1 + p.aR2} color={shade(kit.glove, -25)} bare={ref} skin={skinD} />

      {/* Gövde */}
      <Path d={torsoPath} fill={shade(ref ? '#15161a' : skin, -70)} opacity={0.5} transform="translate(0.6 0.6)" />
      <Path d={torsoPath} fill={ref ? '#15161a' : `url(#${gT})`} />
      <Path d={backPath} fill={ref ? '#000' : skinD} opacity={ref ? 0.4 : 0.55} />
      {!ref ? (
        <>
          <Path d={L("M{0} {1} Q{2} {3} {4} {5}", [pt(chest, 8).x, pt(chest, 8).y, pt(chest, 2).x, pt(chest, 2).y + 4, pt(chest, -3).x, pt(chest, -3).y])} stroke={skinD} strokeWidth={1} fill="none" opacity={0.7} />
          <Line x1={pt(abs, 4).x} y1={pt(abs, 4).y} x2={pt(abs, 4).x + j.td.x * 8} y2={pt(abs, 4).y + j.td.y * 8} stroke={skinD} strokeWidth={0.8} opacity={0.6} />
          {/* Karın kasları ve omuzda ter parlaması */}
          {[0, 3.4, 6.8].map((k) => (
            <Line key={k} x1={pt(add(abs, j.td, k), 1).x} y1={pt(add(abs, j.td, k), 1).y} x2={pt(add(abs, j.td, k), 7).x} y2={pt(add(abs, j.td, k), 7).y} stroke={skinD} strokeWidth={0.6} opacity={0.45} />
          ))}
          <Ellipse cx={pt(sC, 6).x} cy={pt(sC, 6).y + 2} rx={4} ry={2.4} fill="url(#sheen)" />
          <Ellipse cx={pt(chest, 5).x} cy={pt(chest, 5).y} rx={3} ry={1.8} fill="url(#sheen)" />
          {look.dovme ? <Path d={L("M{0} {1} q3 5 -1 9", [pt(chest, -6).x, pt(chest, -6).y])} stroke="#1d1d1d" strokeWidth={1.3} fill="none" opacity={0.55} /> : null}
          {look.dovmeler?.includes('gogus') ? <Path d={`M${pt(chest, 5).x} ${pt(chest, 5).y} q3 -3 6 0 q-3 2 -6 0 M${pt(chest, 2).x} ${pt(chest, 2).y} l0 3`} stroke="#1d1d1d" strokeWidth={1.2} fill="none" opacity={0.6} /> : null}
          {look.dovmeler?.includes('boyun') ? <Circle cx={pt(j.neck, 2.5).x} cy={pt(j.neck, 2.5).y} r={1.1} fill="#1d1d1d" opacity={0.6} /> : null}
          {look.kadin ? (
            <>
              <Line x1={pt(add(chest, j.td, 1.5), 10.5).x} y1={pt(add(chest, j.td, 1.5), 10.5).y} x2={pt(add(chest, j.td, 1.5), -9.5).x} y2={pt(add(chest, j.td, 1.5), -9.5).y} stroke={kit.shorts} strokeWidth={8} strokeLinecap="round" />
              <Line x1={pt(add(chest, j.td, 4.5), 10).x} y1={pt(add(chest, j.td, 4.5), 10).y} x2={pt(add(chest, j.td, 4.5), -9).x} y2={pt(add(chest, j.td, 4.5), -9).y} stroke={kit.trim} strokeWidth={1} opacity={0.7} />
            </>
          ) : null}
        </>
      ) : (
        <Line x1={pt(sC, 3).x} y1={pt(sC, 3).y} x2={pt(j.pelvis, 3).x} y2={pt(j.pelvis, 3).y} stroke="#ffffff" strokeWidth={0.8} opacity={0.35} />
      )}

      {/* Şort */}
      {!ref ? (
        <G>
          <Line x1={j.hipR.x} y1={j.hipR.y} x2={thighMidR.x} y2={thighMidR.y} stroke={shade(kit.shorts, -30)} strokeWidth={13} strokeLinecap="round" />
          <Line x1={pt(shortsTop, 9).x} y1={pt(shortsTop, 9).y} x2={pt(shortsTop, -9).x} y2={pt(shortsTop, -9).y} stroke={`url(#${gS})`} strokeWidth={9} strokeLinecap="round" />
          <Line x1={pt(shortsTop, 9).x} y1={pt(shortsTop, 9).y - 3} x2={pt(shortsTop, -9).x} y2={pt(shortsTop, -9).y - 3} stroke={shade(kit.shorts, -45)} strokeWidth={2.2} strokeLinecap="round" />
        </G>
      ) : null}

      {/* Baş */}
      <Head c={j.head} ang={p.torso + p.head} look={look} skin={skin} ref={ref} hasar={ref ? 0 : hasar} />

      {/* Ön bacak ve kol */}
      <Limb a={j.hipL} b={j.knL} w={10.5} color={legC} />
      <Limb a={j.knL} b={j.anL} w={8.2} color={legC} />
      <Ellipse cx={j.anL.x + 2.5} cy={j.anL.y + 1} rx={5.2} ry={2.5} fill={ref ? '#111' : skin} />
      {!ref ? (
        <>
          <Line x1={j.hipL.x} y1={j.hipL.y} x2={thighMidL.x} y2={thighMidL.y} stroke={shade(kit.shorts, -55)} strokeOpacity={0.6} strokeWidth={14.8} strokeLinecap="round" />
          <Line x1={j.hipL.x} y1={j.hipL.y} x2={thighMidL.x} y2={thighMidL.y} stroke={`url(#${gS})`} strokeWidth={13.5} strokeLinecap="round" />
          <Line x1={j.hipL.x + 1.2} y1={j.hipL.y - 1.2} x2={thighMidL.x + 1.2} y2={thighMidL.y - 1.2} stroke="#ffffff" strokeOpacity={0.13} strokeWidth={3.5} strokeLinecap="round" />
          <Line x1={pt(shortsTop, 9).x} y1={pt(shortsTop, 9).y + 3} x2={pt(shortsTop, -9).x} y2={pt(shortsTop, -9).y + 3} stroke={kit.trim} strokeWidth={1.2} opacity={0.8} />
        </>
      ) : null}
      <Limb a={j.shL} b={j.elL} w={8} color={ref ? '#15161a' : armC} />
      {!ref && look.dovmeler?.includes('kol') ? (
        <Line x1={j.shL.x + (j.elL.x - j.shL.x) * 0.2} y1={j.shL.y + (j.elL.y - j.shL.y) * 0.2} x2={j.shL.x + (j.elL.x - j.shL.x) * 0.85} y2={j.shL.y + (j.elL.y - j.shL.y) * 0.85} stroke="#1d1d1d" strokeWidth={2.6} strokeDasharray="2 1.5" opacity={0.5} />
      ) : null}
      <Limb a={j.elL} b={j.wrL} w={6.8} color={armC} />
      <Glove at={j.wrL} dir={p.aL1 + p.aL2} color={kit.glove} bare={ref} skin={skin} />
    </G>
  );
}

