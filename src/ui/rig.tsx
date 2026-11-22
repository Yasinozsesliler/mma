// Eklemli dövüşçü iskeleti (yandan görünüş, sağa bakar). Poz = açılar; çizim ileri kinematikle yapılır.
// Açı kuralları: kol/bacak açısı "aşağı"dan ölçülür, pozitif = ileri (rakibe doğru). Gövde açısı dikeyden, pozitif = öne eğilme.
import { L } from '../i18n';
import { currentLook } from '../lookPref';
import { lowPerf } from '../perfPref';
import { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import type { Appearance } from '../engine/types';
import { HAIR_COLORS, SKIN_TONES } from './FighterAvatar';
import { add, down, joints, LEN, shade, type Pose } from './rigMath';
import { FigureHD } from './rigBody';
export { HIP_H, joints, lerpPose, POSES, type Pose, type PoseName } from './rigMath';

/** bare: eldivensiz (ör. ip atlama); ref: hakem */
export type ShortsPattern = 'alev' | 'simsek' | 'kaplan' | 'yildiz';
export type Kit = { shorts: string; trim: string; glove: string; ref?: boolean; bare?: boolean; /** Şort deseni ve rengi */ desen?: ShortsPattern; desenRenk?: string; /** Üst giysi: güreş mayosu (singlet) ya da grappling rashguard'ı (şort renginde) */ ust?: 'singlet' | 'rash' };

type P2 = { x: number; y: number };
/** Şort bacağı (kalça a → uyluk ortası b) üzerine desen. */
export function Pattern({ a, b, kind, color, op = 1 }: { a: P2; b: P2; kind: ShortsPattern; color: string; op?: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const d = { x: dx / len, y: dy / len };
  const n = { x: -d.y, y: d.x };
  // Bacak boyunca t (0 kalça, 1 paça) ve enine k noktası
  const at = (t: number, k: number) => ({ x: a.x + dx * t + n.x * k, y: a.y + dy * t + n.y * k });
  const P = (pts: P2[]) => pts.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(2)} ${q.y.toFixed(2)}`).join(' ');
  if (kind === 'alev') {
    // Paçadan yukarı yükselen üç alev dili
    const tongues = [-4.6, 0, 4.6].map((k, i) => P([at(1.05, k - 2.4), at(0.45 - (i === 1 ? 0.18 : 0), k + 1.2), at(0.72, k + 0.4), at(0.6, k + 2.6), at(1.05, k + 2.4)]) + ' Z');
    return <Path d={tongues.join(' ')} fill={color} opacity={0.92 * op} />;
  }
  if (kind === 'simsek') return <Path d={P([at(0.15, 3.5), at(0.5, -2.5), at(0.55, 2), at(0.95, -3.5)])} stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" opacity={0.95 * op} />;
  if (kind === 'kaplan')
    return (
      <Path
        d={[0.3, 0.52, 0.74].map((t) => P([at(t - 0.06, -6.2), at(t + 0.05, -1.5), at(t + 0.02, 1)])).join(' ') + ' ' + [0.4, 0.64].map((t) => P([at(t + 0.06, 6.2), at(t - 0.04, 2)])).join(' ')}
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        fill="none"
        opacity={0.9 * op}
      />
    );
  // Yıldız
  const c = at(0.6, 0);
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 1.6 : 3.8;
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    return { x: c.x + Math.cos(ang) * r, y: c.y + Math.sin(ang) * r };
  });
  return <Path d={P(pts) + ' Z'} fill={color} opacity={0.95 * op} />;
}

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

export function Glove({ at, dir, color, bare, skin }: { at: { x: number; y: number }; dir: number; color: string; bare?: boolean; skin: string }) {
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

export function Head({ c, ang, look, skin, ref, hasar = 0 }: { c: { x: number; y: number }; ang: number; look: Appearance; skin: string; ref?: boolean; hasar?: number }) {
  const hair = HAIR_COLORS[look.sacRenk] ?? HAIR_COLORS[0];
  const dark = shade(skin, -35);
  const s = look.sac;
  // Hafif modda yüz ve saç ayrıntıları çizilmez: dövüş sahnesinde figürler her karede yeniden çizilir
  const hd = !ref && currentLook() === 'yeni' && !lowPerf();
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
      {s === 'kisa' || s === 'yanayrik' || s === 'topuz' || s === 'uzun' || s === 'orgu' || s === 'atkuyrugu' ? <Path d={L("M{0} {1} q1 -11 10 -10.5 q6 1 7 6 q-7 -3 -13 1 q-1 1 -4 3.5 z", [c.x - 8.4, c.y - 1])} fill={hair} /> : null}
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
      {hd ? (
        <>
          {/* Yeni görünüm: göz akı ve çukuru, elmacık ışığı, kulak kıvrımı */}
          <Ellipse cx={c.x + 5.2} cy={c.y - 1} rx={2.4} ry={1.6} fill={shade(skin, -55)} opacity={0.25} />
          <Ellipse cx={c.x + 5.7} cy={c.y - 0.8} rx={1.5} ry={0.95} fill="#efe9df" />
          <Circle cx={c.x + 6} cy={c.y - 0.8} r={0.75} fill="#141414" />
          <Circle cx={c.x + 5.8} cy={c.y - 1.05} r={0.25} fill="#ffffff" />
          <Path d={`M${c.x + 4} ${c.y - 2.1} q1.8 -0.8 3.4 0`} stroke={shade(skin, -80)} strokeWidth={0.5} fill="none" />
          <Ellipse cx={c.x + 3.6} cy={c.y + 1.8} rx={2.2} ry={1.2} fill="#ffffff" opacity={0.12} />
          <Path d={`M${c.x - 3.6} ${c.y - 0.6} q-0.8 1.6 0.2 3`} stroke={shade(skin, -70)} strokeWidth={0.5} fill="none" opacity={0.7} />
          {/* saç telleri */}
          {s === 'kisa' || s === 'yanayrik' || s === 'topuz' || s === 'uzun' || s === 'orgu' || s === 'atkuyrugu' ? (
            <Path d={`M${c.x - 6.5} ${c.y - 4} q3 -5 8 -6 M${c.x - 5} ${c.y - 2.5} q3 -5.5 9 -6.5 M${c.x - 7.4} ${c.y - 1.8} q2 -5 6 -7 M${c.x - 2} ${c.y - 8.6} q4 -1.6 7.5 0.6`} stroke={shade(hair, 45)} strokeWidth={0.45} fill="none" opacity={0.6} />
          ) : null}
          {s === 'kazik' || s === 'mohawk' ? <Path d={`M${c.x - 6} ${c.y - 4} l0.3 -0.6 M${c.x - 3.5} ${c.y - 6.5} l0.3 -0.6 M${c.x - 0.5} ${c.y - 8} l0.3 -0.6 M${c.x + 2.5} ${c.y - 8.2} l0.3 -0.6 M${c.x - 6.8} ${c.y - 1} l0.3 -0.6 M${c.x - 4.5} ${c.y - 3.6} l0.3 -0.6 M${c.x - 1.5} ${c.y - 5.6} l0.3 -0.6`} stroke={shade(hair, -20)} strokeWidth={0.5} strokeLinecap="round" opacity={0.7} /> : null}
          {/* sakal dokusu */}
          {!look.kadin && look.sakal === 'tam' ? <Path d={`M${c.x - 1} ${c.y + 4} l0.6 2.2 M${c.x + 1.5} ${c.y + 5} l0.5 2.4 M${c.x + 4} ${c.y + 5.6} l0.3 2.2 M${c.x + 6.5} ${c.y + 5} l-0.2 2`} stroke={shade(hair, 40)} strokeWidth={0.4} fill="none" opacity={0.5} /> : null}
          {!look.kadin && look.sakal === 'kirli' ? <Path d={`M${c.x - 1.5} ${c.y + 3.5} l0.2 0.5 M${c.x} ${c.y + 5} l0.2 0.5 M${c.x + 1.6} ${c.y + 6} l0.2 0.5 M${c.x + 3.4} ${c.y + 6.6} l0.2 0.5 M${c.x + 5.2} ${c.y + 6.4} l0.2 0.5 M${c.x + 6.8} ${c.y + 5.6} l0.2 0.5 M${c.x + 0.5} ${c.y + 3.4} l0.2 0.5 M${c.x + 2.4} ${c.y + 4.4} l0.2 0.5 M${c.x + 4.4} ${c.y + 4.8} l0.2 0.5`} stroke={shade(hair, -10)} strokeWidth={0.55} strokeLinecap="round" opacity={0.75} /> : null}
        </>
      ) : null}
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
/** build: vücut yapısı (-1 ince … 0 orta … 1 iri); sıklete göre gövde ve uzuv kalınlığı */
export function Figure(props: { p: Pose; look: Appearance; kit: Kit; hasar?: number; build?: number }) {
  // Yeni görünüm: anatomik vücut (rigBody.tsx). Klasik görünüm eski çizimi korur.
  return currentLook() === 'yeni' ? <FigureHD {...props} /> : <FigureClassic {...props} />;
}

function FigureClassic({ p, look, kit, hasar = 0, build = 0 }: { p: Pose; look: Appearance; kit: Kit; hasar?: number; build?: number }) {
  const j = joints(p);
  const bw = 1 + build * 0.16;
  const lw = 1 + build * 0.12;
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
  const torsoPath = L("M{0} {1} Q{2} {3} {4} {5} L{6} {7} Q{8} {9} {10} {11} Z", [pt(sC, 11 * bw).x, pt(sC, 11 * bw).y, pt(wC, 10 * bw).x, pt(wC, 10 * bw).y, pt(j.pelvis, 8.5 * bw).x, pt(j.pelvis, 8.5 * bw).y, pt(j.pelvis, -8.5 * bw).x, pt(j.pelvis, -8.5 * bw).y, pt(wC, -9 * bw).x, pt(wC, -9 * bw).y, pt(sC, -10 * bw).x, pt(sC, -10 * bw).y]);
  const backPath = L("M{0} {1} Q{2} {3} {4} {5} L{6} {7} L{8} {9} Z", [pt(sC, -10 * bw).x, pt(sC, -10 * bw).y, pt(wC, -9 * bw).x, pt(wC, -9 * bw).y, pt(j.pelvis, -8.5 * bw).x, pt(j.pelvis, -8.5 * bw).y, pt(j.pelvis, -2 * bw).x, pt(j.pelvis, -2 * bw).y, pt(sC, -3 * bw).x, pt(sC, -3 * bw).y]);
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
      <Limb a={j.hipR} b={j.knR} w={10 * lw} color={legCD} />
      <Limb a={j.knR} b={j.anR} w={8 * lw} color={legCD} />
      <Ellipse cx={j.anR.x + 2.5} cy={j.anR.y + 1} rx={5} ry={2.4} fill={ref ? '#111' : skinD} />
      <Limb a={j.shR} b={j.elR} w={7.5 * lw} color={kit.ust === 'rash' ? shade(kit.shorts, -30) : shade(armC, -26)} />
      <Limb a={j.elR} b={j.wrR} w={6.5 * lw} color={shade(armC, -26)} />
      <Glove at={j.wrR} dir={p.aR1 + p.aR2} color={shade(kit.glove, -25)} bare={ref || kit.bare} skin={skinD} />

      {/* Gövde */}
      <Path d={torsoPath} fill={shade(ref ? kit.shorts : skin, -70)} opacity={0.5} transform="translate(0.6 0.6)" />
      <Path d={torsoPath} fill={ref ? kit.shorts : `url(#${gT})`} />
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

      {/* Güreş mayosu / rashguard: gövde şort renginde; mayoda omuz askıları ve açık yaka */}
      {!ref && kit.ust ? (
        <G>
          <Path d={torsoPath} fill={`url(#${gS})`} />
          <Path d={backPath} fill="#000" opacity={0.25} />
          {kit.ust === 'singlet' ? (
            <>
              <Ellipse cx={pt(sC, 1).x} cy={pt(sC, 1).y + 1.5} rx={6.5} ry={3.2} fill={`url(#${gT})`} />
              <Line x1={pt(sC, 7).x} y1={pt(sC, 7).y} x2={pt(chest, 6).x} y2={pt(chest, 6).y + 3} stroke={kit.trim} strokeWidth={1} opacity={0.7} />
            </>
          ) : (
            <Line x1={pt(sC, 3).x} y1={pt(sC, 3).y} x2={pt(j.pelvis, 3).x} y2={pt(j.pelvis, 3).y} stroke={kit.trim} strokeWidth={1.4} opacity={0.6} />
          )}
        </G>
      ) : null}

      {/* Şort */}
      {!ref ? (
        <G>
          <Line x1={j.hipR.x} y1={j.hipR.y} x2={thighMidR.x} y2={thighMidR.y} stroke={shade(kit.shorts, -30)} strokeWidth={13} strokeLinecap="round" />
          {kit.desen ? <Pattern a={j.hipR} b={thighMidR} kind={kit.desen} color={shade(kit.desenRenk ?? kit.trim, -25)} op={0.7} /> : null}
          <Line x1={pt(shortsTop, 9).x} y1={pt(shortsTop, 9).y} x2={pt(shortsTop, -9).x} y2={pt(shortsTop, -9).y} stroke={`url(#${gS})`} strokeWidth={9} strokeLinecap="round" />
          <Line x1={pt(shortsTop, 9).x} y1={pt(shortsTop, 9).y - 3} x2={pt(shortsTop, -9).x} y2={pt(shortsTop, -9).y - 3} stroke={shade(kit.shorts, -45)} strokeWidth={2.2} strokeLinecap="round" />
        </G>
      ) : null}

      {/* Baş */}
      <Head c={j.head} ang={p.torso + p.head} look={look} skin={skin} ref={ref} hasar={ref ? 0 : hasar} />

      {/* Ön bacak ve kol */}
      <Limb a={j.hipL} b={j.knL} w={10.5 * lw} color={legC} />
      <Limb a={j.knL} b={j.anL} w={8.2 * lw} color={legC} />
      <Ellipse cx={j.anL.x + 2.5} cy={j.anL.y + 1} rx={5.2} ry={2.5} fill={ref ? '#111' : skin} />
      {!ref ? (
        <>
          <Line x1={j.hipL.x} y1={j.hipL.y} x2={thighMidL.x} y2={thighMidL.y} stroke={shade(kit.shorts, -55)} strokeOpacity={0.6} strokeWidth={14.8} strokeLinecap="round" />
          <Line x1={j.hipL.x} y1={j.hipL.y} x2={thighMidL.x} y2={thighMidL.y} stroke={`url(#${gS})`} strokeWidth={13.5} strokeLinecap="round" />
          {kit.desen ? <Pattern a={j.hipL} b={thighMidL} kind={kit.desen} color={kit.desenRenk ?? kit.trim} /> : null}
          <Line x1={j.hipL.x + 1.2} y1={j.hipL.y - 1.2} x2={thighMidL.x + 1.2} y2={thighMidL.y - 1.2} stroke="#ffffff" strokeOpacity={0.13} strokeWidth={3.5} strokeLinecap="round" />
          <Line x1={pt(shortsTop, 9).x} y1={pt(shortsTop, 9).y + 3} x2={pt(shortsTop, -9).x} y2={pt(shortsTop, -9).y + 3} stroke={kit.trim} strokeWidth={1.2} opacity={0.8} />
          {/* Sponsor yaması */}
          <Line x1={j.hipL.x + (thighMidL.x - j.hipL.x) * 0.55} y1={j.hipL.y + (thighMidL.y - j.hipL.y) * 0.55} x2={j.hipL.x + (thighMidL.x - j.hipL.x) * 0.8} y2={j.hipL.y + (thighMidL.y - j.hipL.y) * 0.8} stroke={kit.trim} strokeWidth={4.5} strokeLinecap="round" opacity={0.55} />
        </>
      ) : null}
      <Limb a={j.shL} b={j.elL} w={8 * lw} color={ref ? kit.shorts : kit.ust === 'rash' ? kit.shorts : armC} />
      {!ref && look.dovmeler?.includes('kol') ? (
        <Line x1={j.shL.x + (j.elL.x - j.shL.x) * 0.2} y1={j.shL.y + (j.elL.y - j.shL.y) * 0.2} x2={j.shL.x + (j.elL.x - j.shL.x) * 0.85} y2={j.shL.y + (j.elL.y - j.shL.y) * 0.85} stroke="#1d1d1d" strokeWidth={2.6} strokeDasharray="2 1.5" opacity={0.5} />
      ) : null}
      <Limb a={j.elL} b={j.wrL} w={6.8 * lw} color={armC} />
      <Glove at={j.wrL} dir={p.aL1 + p.aL2} color={kit.glove} bare={ref || kit.bare} skin={skin} />
    </G>
  );
}

