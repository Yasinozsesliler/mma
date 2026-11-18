// Yeni görünüm portresi (HD): klasik portreyle aynı yüz ölçüleri, ama yönlü ışık, tel tel saç, kıl kıl sakal,
// tüylü kaş, kirpik ve daha derin gölgeler. Doku çizgileri birkaç birleşik path'te toplanır (telefonda hafif kalsın).
import { useId, useMemo } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Appearance } from '../engine/types';
import { DEFAULT_LOOK, EYE_COLORS, FACE_GEO, facePath, HAIR_COLORS, octPoints, shade, SKIN_TONES } from './avatarCore';

type Props = { look?: Appearance; size?: number; ring?: string; bg?: string; /** 'kare': çerçevesiz kare büst (hazır yüz ızgarası) */ frame?: 'oct' | 'kare' | 'bas' };

/** Sabit tohumlu sözde rastgele: her çizimde aynı doku. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f1 = (n: number) => n.toFixed(1);
type P = [number, number];
function inPoly(x: number, y: number, poly: P[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Bölge içine kısa kıl çizgileri (sakal dokusu, kazıma saç). */
function bristles(poly: P[], step: number, len: number, angle: number, seed: number, keep: (x: number, y: number) => number = () => 1) {
  const r = rng(seed);
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  let d = '';
  for (let y = Math.min(...ys); y <= Math.max(...ys); y += step) {
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += step) {
      const px = x + (r() - 0.5) * step;
      const py = y + (r() - 0.5) * step;
      if (!inPoly(px, py, poly) || r() > keep(px, py)) continue;
      const a = angle + (r() - 0.5) * 0.9;
      const l = len * (0.6 + r() * 0.6);
      d += `M${f1(px)} ${f1(py)}l${f1(Math.sin(a) * l)} ${f1(Math.cos(a) * l)}`;
    }
  }
  return d;
}

/** Bir eğri boyunca akan saç telleri: from(t) başlangıç, dir(t) yön; t 0..1. */
function flow(n: number, seed: number, from: (t: number) => P, to: (t: number, r: () => number) => P, bend = 2) {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < n; i++) {
    const t = (i + r() * 0.8) / n;
    const [x0, y0] = from(t);
    const [x1, y1] = to(t, r);
    const cx = (x0 + x1) / 2 + (r() - 0.5) * bend;
    const cy = (y0 + y1) / 2 + (r() - 0.5) * bend;
    d += `M${f1(x0)} ${f1(y0)}Q${f1(cx)} ${f1(cy)} ${f1(x1)} ${f1(y1)}`;
  }
  return d;
}

/** Kafatası üst eğrisi üzerinde nokta (t: 0 sol şakak … 1 sağ şakak). */
const skull = (t: number, rx = 20, ry = 24, cy = 41): P => {
  const a = Math.PI * (1 - t);
  return [50 + Math.cos(a) * rx, cy - Math.sin(a) * ry];
};

function useTextures(look: Appearance, chinY: number) {
  return useMemo(() => {
    const out: Record<string, string> = {};
    const s = look.sac;
    // Saç çizgisi (alın): klasik "kısa" saçtaki alt kenarla aynı hat
    if (s === 'kisa' || s === 'uzun' || s === 'topuz' || s === 'atkuyrugu' || s === 'orgu' || s === 'yanayrik') {
      out.top = flow(70, 11, (t) => skull(0.04 + t * 0.92, 19, 23.5), (t, r) => {
        const [x, y] = skull(0.04 + t * 0.92, 19, 23.5);
        const pull = s === 'yanayrik' ? 7 : s === 'topuz' || s === 'atkuyrugu' || s === 'orgu' ? -6 : 2.5;
        return [x + pull * (0.6 + r() * 0.6) + (x - 50) * 0.08, y + 6 + r() * 5];
      }, 2.4);
    }
    if (s === 'kisa') {
      // Kısa saçta ön tarafta kalkık tutamlar
      out.tuft = flow(18, 21, (t) => [36 + t * 28, 27 + Math.abs(t - 0.5) * 6], (t, r) => [36 + t * 28 + (r() - 0.3) * 3, 20 + r() * 3 + Math.abs(t - 0.5) * 4], 1.6);
    }
    if (s === 'kazik' || s === 'mohawk') {
      const scalp: P[] = [[31.5, 38], [33, 27], [40, 21.5], [50, 20.5], [60, 21.5], [67, 27], [68.5, 38], [60, 30], [50, 29.5], [40, 30]];
      out.buzz = bristles(scalp, 0.95, 0.55, Math.PI * 0.95, 31, (x) => (s === 'mohawk' && Math.abs(x - 50) < 6 ? 0 : 0.85));
    }
    if (s === 'mohawk') {
      out.crest = flow(26, 41, (t) => [44.5 + t * 11, 30 - Math.sin(t * Math.PI) * 2], (t, r) => [46 + t * 8 + (r() - 0.5) * 2, 6 + Math.abs(t - 0.5) * 12 + r() * 3], 2);
    }
    if (s === 'uzun') {
      out.long = flow(34, 51, (t) => [30 + (t < 0.5 ? t * 6 : 34 + t * 6), 36 + (t < 0.5 ? t : 1 - t) * 4], (t, r) => [t < 0.5 ? 29 + r() * 7 : 64 + r() * 7, 74 + r() * 8], 5);
    }
    if (s === 'afro') {
      const r = rng(61);
      let d = '';
      for (let i = 0; i < 190; i++) {
        const a = r() * Math.PI * 2;
        const rad = Math.sqrt(r()) * 25;
        const x = 50 + Math.cos(a) * rad;
        const y = 35 + Math.sin(a) * rad * 0.95;
        if (y > 41 && Math.abs(x - 50) < 18) continue; // yüzün üstüne kıvrım çizme
        const k = 0.6 + r() * 0.7;
        d += `M${f1(x - k)} ${f1(y)}a${f1(k)} ${f1(k)} 0 1 1 ${f1(k * 2)} 0`;
      }
      out.curls = d;
    }
    if (s === 'orgu') {
      // Örgüler: alından geriye zincir halkaları
      let d = '';
      [-12, -6, 0, 6, 12].forEach((dx) => {
        for (let k = 0; k < 7; k++) {
          const y = 29 - k * 2.2;
          const x = 50 + dx * (1 - k * 0.04);
          d += `M${f1(x - 1.6)} ${f1(y)}Q${f1(x)} ${f1(y - 2.2)} ${f1(x + 1.6)} ${f1(y)}`;
        }
      });
      out.braids = d;
    }
    if (s === 'topuz') out.bun = flow(14, 71, (t) => [44 + t * 12, 13 + Math.sin(t * Math.PI) * -3], (t, r) => [50 + (t - 0.5) * 6 + (r() - 0.5) * 2, 6 + r() * 3], 3);
    if (s === 'atkuyrugu') out.tail = flow(26, 81, (t) => [62 + t * 6, 24 + t * 4], (t, r) => [70 + t * 8 + r() * 3, 66 + r() * 8], 6);

    // Sakal
    const jaw: P[] = [[31.2, 45], [32.5, 55], [37, 63], [43, chinY - 1.5], [50, chinY + 1.2], [57, chinY - 1.5], [63, 63], [67.5, 55], [68.8, 45], [66.5, 51.5], [61, 56], [55.5, 57.4], [50, 56.6], [44.5, 57.4], [39, 56], [33.5, 51.5]];
    const mouth = (x: number, y: number) => ((x - 50) / 5.6) ** 2 + ((y - 59.6) / 1.9) ** 2 < 1;
    if (!look.kadin && look.sakal === 'kirli') {
      out.stubble = bristles(jaw, 0.85, 0.5, 0.15, 91, (x, y) => (mouth(x, y) ? 0 : y < 50 && Math.abs(x - 50) > 12 ? 0.45 : 0.9));
    }
    if (!look.kadin && look.sakal === 'tam') {
      out.beard = flow(110, 101, (t) => {
        const [x, y] = [31.5 + t * 37, 0];
        return [x, Math.max(48, 64 - Math.cos((t - 0.5) * Math.PI) * 9) + y];
      }, (t, r) => [31.5 + t * 37 + (t - 0.5) * 3 + (r() - 0.5) * 2, Math.min(chinY + 4, 70) - Math.abs(t - 0.5) * 18 + r() * 5], 1.8);
      out.mous = flow(20, 111, (t) => [44 + t * 12, 56.2 - Math.sin(t * Math.PI) * 0.8], (t, r) => [44 + t * 12 + (t - 0.5) * 5, 58.6 + r() * 0.8], 0.8);
    }
    if (!look.kadin && (look.sakal === 'keci' || look.sakal === 'biyik')) {
      out.mous = flow(34, 121, (t) => [44 + t * 12, 56.6 - Math.sin(t * Math.PI) * 0.7], (t, r) => [44 + t * 12 + (t - 0.5) * 4.5 + (r() - 0.5) * 0.6, 57.9 + Math.abs(t - 0.5) * 1.8 + r() * 0.9], 0.6);
    }
    if (!look.kadin && look.sakal === 'keci') out.goatee = flow(18, 131, (t) => [45.5 + t * 9, 61.2], (t, r) => [46 + t * 8 + (r() - 0.5), Math.min(chinY + 2.5, 70) - Math.abs(t - 0.5) * 6 + r() * 1.5], 1);
    // Kaşlar: tüy tüy
    const kas = look.kas ?? 1;
    const brow = (x0: number, x1: number, y0: number, y1: number, ymid: number, seed: number) => {
      const r = rng(seed);
      let d = '';
      const n = 16 + kas * 5;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const x = x0 + (x1 - x0) * t;
        const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * ymid + t * t * y1 + (r() - 0.5) * (0.5 + kas * 0.25);
        const dir = x1 > x0 ? 1 : -1;
        const l = 1.2 + kas * 0.35 + r() * 0.5;
        d += `M${f1(x)} ${f1(y + 0.5)}l${f1(dir * l * 0.85)} ${f1(-l * 0.45)}`;
      }
      return d;
    };
    const tilt = kas === 2 ? 1.6 : 0;
    out.browL = brow(37.5, 47, 38.6, 37.9 + tilt, 35.6 + tilt * 0.3, 141);
    out.browR = brow(62.5, 53, 38.6, 37.9 + tilt, 35.6 + tilt * 0.3, 151);
    return out;
  }, [look.sac, look.sakal, look.kadin, look.kas, chinY]);
}

export function AvatarHD({ look = DEFAULT_LOOK, size = 72, ring = '#e63946', bg = '#0c0d10', frame = 'oct' }: Props) {
  const sq = frame === 'kare';
  /** Yalnızca baş ve boyun: önden gövdenin üstüne bindirmek için (arka plan ve gövde yok) */
  const head = frame === 'bas';
  const skin = SKIN_TONES[look.ten] ?? SKIN_TONES[2];
  const skinL = shade(skin, 24);
  const skinD = shade(skin, -30);
  const skinDD = shade(skin, -58);
  const hair = HAIR_COLORS[look.sacRenk] ?? HAIR_COLORS[0];
  const hairL = shade(hair, 42);
  const hairD = shade(hair, -28);
  const eye = EYE_COLORS[look.goz] ?? EYE_COLORS[0];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (n: string) => `${n}${uid}`;
  const url = (n: string) => `url(#${id(n)})`;
  const browC = look.sac === 'kel' ? shade(skin, -95) : shade(hair, -8);
  const yuz = look.yuz ?? 0;
  const burun = look.burun ?? 0;
  const gs = look.gozSekil ?? 1;
  const dudak = look.dudak ?? 1;
  const FACE = facePath(yuz);
  const chinY = (FACE_GEO[yuz] ?? FACE_GEO[0])[2];
  const cw = (FACE_GEO[yuz] ?? FACE_GEO[0])[0];
  const eyeW = [4.4, 4.2, 4.5][gs];
  const eyeH = [1.7, 2.6, 3.3][gs];
  const irisR = [1.6, 1.95, 2.25][gs];
  const eyePath = (cx: number) => `M${cx - eyeW} 44.2 Q${cx} ${44.2 - eyeH * 1.25} ${cx + eyeW} 44.2 Q${cx} ${44.2 + eyeH * 0.95} ${cx - eyeW} 44.2 Z`;
  const lid = (cx: number) => `M${cx - eyeW - 0.2} 44 Q${cx} ${44 - eyeH * 1.32} ${cx + eyeW + 0.2} 44`;
  const tx = useTextures(look, chinY);
  const s = look.sac;
  const capHair = s === 'kisa' || s === 'uzun' || s === 'topuz' || s === 'orgu' || s === 'atkuyrugu';
  const slick = s === 'topuz' || s === 'atkuyrugu' || s === 'orgu';
  const capD = slick ? 'M30.5 41 Q28.5 17 50 16 Q71.5 17 69.5 41 Q67.5 31 59 28.5 Q50 26.5 41 28.5 Q33 31 30.5 41 Z' : 'M30.5 41 Q28.5 17.5 50 16.5 Q71.5 17.5 69.5 41 Q67 30 58.5 27.5 Q52 31.5 44 28.5 Q35 30.5 30.5 41 Z';
  const sideD = 'M33 35 Q31.5 16.5 50 14 Q69 15 67.5 34 Q63 26 53 24.5 Q45 24 40 28.5 Q37.5 27 33 35 Z';
  const by = Math.min(chinY + 5.5, 75);
  const beardD = `M31 46 Q30.5 ${chinY - 1} 41 ${by - 2} L43 ${by - 0.6} L45 ${by - 1.4} L47.5 ${by + 0.2} L50 ${by - 0.8} L52.5 ${by + 0.2} L55 ${by - 1.4} L57 ${by - 0.6} L59 ${by - 2} Q69.5 ${chinY - 1} 69 46 Q67 57 59 60 Q54 58.4 50 60.6 Q46 58.4 41 60 Q33 57 31 46 Z`;
  const longD = 'M27.5 33 Q24 64 30 82 L40 82 Q35.5 58 37.5 38 Z M72.5 33 Q76 64 70 82 L60 82 Q64.5 58 62.5 38 Z';
  const crestD = 'M44 30.5 Q43.5 9 50 4.5 Q56.5 9 56 30.5 Q50 27.5 44 30.5 Z';
  const tailD = 'M60 20 Q84 22 82 48 Q81 64 71.5 74 Q75.5 55 69.5 40 Q66 30 60 26 Z';

  return (
    <Svg width={size} height={sq ? (size * 92) / 84 : size} viewBox={sq ? '8 6 84 92' : '0 0 100 100'}>
      <Defs>
        <RadialGradient id={id('bg')} cx="50%" cy="30%" r="78%">
          <Stop offset="0" stopColor={shade(ring, -30)} stopOpacity={0.9} />
          <Stop offset="0.5" stopColor={shade(bg, 12)} />
          <Stop offset="1" stopColor={shade(bg, -6)} />
        </RadialGradient>
        <RadialGradient id={id('face')} cx="42%" cy="38%" r="66%">
          <Stop offset="0" stopColor={skinL} />
          <Stop offset="0.55" stopColor={skin} />
          <Stop offset="1" stopColor={skinD} />
        </RadialGradient>
        {/* Yönlü ışık: sol üstten aydınlık, sağ alttan gölge */}
        <LinearGradient id={id('light')} x1="0.15" y1="0.1" x2="0.95" y2="0.9">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.16} />
          <Stop offset="0.45" stopColor="#ffffff" stopOpacity={0} />
          <Stop offset="0.7" stopColor="#000000" stopOpacity={0.05} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.32} />
        </LinearGradient>
        <LinearGradient id={id('body')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={skinL} />
          <Stop offset="0.5" stopColor={skin} />
          <Stop offset="1" stopColor={skinDD} />
        </LinearGradient>
        <LinearGradient id={id('neck')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={skinDD} />
          <Stop offset="0.45" stopColor={skinD} />
          <Stop offset="1" stopColor={skin} />
        </LinearGradient>
        <LinearGradient id={id('hair')} x1="0.2" y1="0" x2="0.6" y2="1">
          <Stop offset="0" stopColor={hairL} />
          <Stop offset="0.35" stopColor={hair} />
          <Stop offset="1" stopColor={hairD} />
        </LinearGradient>
        <RadialGradient id={id('sheen')} cx="40%" cy="25%" r="45%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.28} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={id('iris')} cx="45%" cy="38%" r="62%">
          <Stop offset="0" stopColor={shade(eye, 70)} />
          <Stop offset="0.6" stopColor={eye} />
          <Stop offset="1" stopColor={shade(eye, -40)} />
        </RadialGradient>
        <LinearGradient id={id('white')} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#d9d0c4" />
          <Stop offset="0.5" stopColor="#f4efe8" />
          <Stop offset="1" stopColor="#d4cabd" />
        </LinearGradient>
        <LinearGradient id={id('lipU')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(skin, -38)} />
          <Stop offset="1" stopColor={shade(skin, -60)} />
        </LinearGradient>
        <LinearGradient id={id('lipL')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(skin, -30)} />
          <Stop offset="1" stopColor={shade(skin, -12)} />
        </LinearGradient>
        <ClipPath id={id('clip')}>
          {sq ? <Rect x={0} y={0} width={100} height={100} /> : <Polygon points={octPoints(45)} />}
        </ClipPath>
        <ClipPath id={id('faceClip')}>
          <Path d={FACE} />
        </ClipPath>
        <ClipPath id={id('capClip')}>
          <Path d={s === 'yanayrik' ? sideD : capD} />
        </ClipPath>
        <ClipPath id={id('beardClip')}>
          <Path d={beardD} />
        </ClipPath>
        <ClipPath id={id('longClip')}>
          <Path d={longD} />
        </ClipPath>
        <ClipPath id={id('crestClip')}>
          <Path d={crestD} />
        </ClipPath>
        <ClipPath id={id('tailClip')}>
          <Path d={tailD} />
        </ClipPath>
        <ClipPath id={id('afroClip')}>
          <Circle cx={50} cy={35} r={26.5} />
        </ClipPath>
      </Defs>
      {head ? null : sq ? (
        <Rect x={0} y={0} width={100} height={100} fill={url('bg')} />
      ) : (
        <>
          <Polygon points={octPoints(49)} fill={ring} />
          <Polygon points={octPoints(45)} fill={url('bg')} />
        </>
      )}

      <G clipPath={head ? undefined : url('clip')}>
        {/* Arka saç kütleleri */}
        {s === 'afro' ? (
          <>
            <Circle cx={50} cy={35} r={26.5} fill={url('hair')} />
            <G clipPath={url('afroClip')}>
              <Path d={tx.curls} stroke={hairD} strokeWidth={0.8} fill="none" opacity={0.5} />
              <Path d={tx.curls} stroke={hairL} strokeWidth={0.35} fill="none" opacity={0.22} transform="translate(-0.5 -0.6)" />
              <Ellipse cx={42} cy={20} rx={12} ry={6} fill={url('sheen')} />
            </G>
          </>
        ) : null}
        {s === 'topuz' ? (
          <>
            <Circle cx={50} cy={11.5} r={8.5} fill={url('hair')} />
            <Path d={tx.bun} stroke={hairL} strokeWidth={0.45} fill="none" opacity={0.55} />
            <Path d="M44 15 Q50 18 56 15" stroke={hairD} strokeWidth={1.2} fill="none" opacity={0.8} />
          </>
        ) : null}
        {s === 'uzun' ? (
          <>
            <Path d={longD} fill={url('hair')} />
            <G clipPath={url('longClip')}>
              <Path d={tx.long} stroke={hairD} strokeWidth={0.6} fill="none" opacity={0.75} />
              <Path d={tx.long} stroke={hairL} strokeWidth={0.35} fill="none" opacity={0.4} transform="translate(0.7 0)" />
            </G>
          </>
        ) : null}
        {s === 'atkuyrugu' ? (
          <>
            <Path d={tailD} fill={url('hair')} />
            <G clipPath={url('tailClip')}>
              <Path d={tx.tail} stroke={hairD} strokeWidth={0.55} fill="none" opacity={0.7} />
              <Path d={tx.tail} stroke={hairL} strokeWidth={0.35} fill="none" opacity={0.45} transform="translate(-0.6 0)" />
            </G>
          </>
        ) : null}

        {head ? null : (
          <>
        {/* Gövde: trapez, omuz, köprücük ve göğüs */}
        <Path d="M4 100 Q6 79 25 74.5 Q36 71.5 41 65.5 L59 65.5 Q64 71.5 75 74.5 Q94 79 96 100 Z" fill={url('body')} />
        <Path d="M25 74.5 Q36 70.5 41 65.5 L43.5 70 Q36 75 27.5 78 Z M75 74.5 Q64 70.5 59 65.5 L56.5 70 Q64 75 72.5 78 Z" fill={skinDD} opacity={0.4} />
        <Path d="M14 84 Q20 77 28 78" stroke={skinL} strokeWidth={2.4} fill="none" opacity={0.28} strokeLinecap="round" />
        {look.kadin ? (
          <>
            <Path d="M18 100 Q20 86.5 32 81.5 Q41 88.5 50 88.5 Q59 88.5 68 81.5 Q80 86.5 82 100 Z" fill="#16181d" />
            <Path d="M32 81.5 L37.5 71 M68 81.5 L62.5 71" stroke="#16181d" strokeWidth={3.4} strokeLinecap="round" />
            <Path d="M32 82 Q41 88.6 50 88.6 Q59 88.6 68 82" stroke={ring} strokeWidth={1.2} fill="none" opacity={0.75} />
            <Path d="M24 94 Q37 90 50 92 Q63 90 76 94" stroke="#2a2d34" strokeWidth={0.8} fill="none" />
          </>
        ) : (
          <>
            {/* köprücük kemikleri: ince gölge, üstünde hafif ışık */}
            <Path d="M34 80.6 Q42 78.6 48.6 80.8 M51.4 80.8 Q58 78.6 66 80.6" stroke={skinDD} strokeWidth={0.9} fill="none" opacity={0.35} strokeLinecap="round" />
            <Path d="M35 79.6 Q42 77.6 48 79.6" stroke="#ffffff" strokeWidth={0.8} fill="none" opacity={0.12} strokeLinecap="round" />
            {/* göğüs kası: yumuşak alt gölge ve ışık */}
            <Path d="M27 99 Q38 89 50 92 Q62 89 73 99 L73 100 L27 100 Z" fill={skinDD} opacity={0.22} />
            <Ellipse cx={39} cy={88} rx={9} ry={4} fill="#ffffff" opacity={0.08} />
            <Path d="M50 85 L50 100" stroke={skinDD} strokeWidth={1.4} opacity={0.18} />
          </>
        )}
        {look.dovme ? (
          <G fill="#141418" opacity={0.78}>
            <Path d="M74 82 q7 -2 9 5 q-5 0 -7 5 q-2 -5 -7 -4 q2 -3 5 -6 Z" />
            <Path d="M78 93 l7 -3 l1 6 Z" />
            <Path d="M16 90 q4 -4 8 0 q-4 4 -8 0 Z" />
          </G>
        ) : null}
        {look.dovmeler?.includes('gogus') ? (
          <G fill="#141418" opacity={0.72}>
            <Path d="M50 90 q-8 -7 -16 -3 q6 1 9 5 q3 -2 7 -2 Z M50 90 q8 -7 16 -3 q-6 1 -9 5 q-3 -2 -7 -2 Z" />
            <Path d="M50 88 l-1.5 4 l1.5 3 l1.5 -3 Z" />
          </G>
        ) : null}
        {look.dovmeler?.includes('kol') ? <Path d="M19 98 q3 -8 10 -12 M21 93 q3 -4 8 -6 M24 88 q2 -2 5 -3" stroke="#141418" strokeWidth={1.6} fill="none" opacity={0.75} /> : null}
        {look.dovmeler?.includes('boyun') ? <Path d="M56 69 l1.5 -3 l1.5 3 l-3 -1.8 h3 Z" fill="#141418" opacity={0.75} /> : null}
        <Path d="M96 100 Q94 79 75 74.5" stroke={ring} strokeWidth={1.5} fill="none" opacity={0.6} />

          </>
        )}
        {/* Boyun: gradyan, kas çizgileri, çene altı gölgesi */}
        <Path d="M39.5 57 L60.5 57 L62 70 Q50 75.5 38 70 Z" fill={url('neck')} />
        <Path d="M43 61 L46.5 71.5 M57 61 L53.5 71.5" stroke={skinDD} strokeWidth={1.1} opacity={0.45} />
        <Path d="M47.5 66 Q50 67.5 52.5 66" stroke={skinDD} strokeWidth={0.8} fill="none" opacity={0.4} />

        {/* Kulaklar */}
        {[30.2, 69.8].map((cx, k) => (
          <G key={k}>
            <Ellipse cx={cx} cy={44} rx={look.kulak ? 4.8 : 3.9} ry={look.kulak ? 6.8 : 6.3} fill={k ? skinDD : skinD} />
            <Path d={k ? `M${cx} 39.5 q2 4.5 0 9` : `M${cx} 39.5 q-2 4.5 0 9`} stroke={skinDD} strokeWidth={1.1} fill="none" opacity={0.8} />
            <Path d={k ? `M${cx - 0.8} 41.5 q1 2.5 0 5` : `M${cx + 0.8} 41.5 q-1 2.5 0 5`} stroke={skinL} strokeWidth={0.6} fill="none" opacity={0.35} />
          </G>
        ))}
        {look.kulak ? (
          <G fill={skinDD} opacity={0.65}>
            <Circle cx={28.6} cy={41} r={1.4} />
            <Circle cx={29} cy={45.5} r={1.6} />
            <Circle cx={71.4} cy={42} r={1.5} />
            <Circle cx={71} cy={46.5} r={1.3} />
          </G>
        ) : null}

        {/* Yüz: taban, yönlü ışık ve hacim gölgeleri (yüz sınırına kırpılır) */}
        <Path d={FACE} fill={url('face')} />
        <G clipPath={url('faceClip')}>
          <Path d={FACE} fill={url('light')} />
          {/* şakak ve yanak çukuru */}
          <Path d={`M${50 - cw} 40 Q${50 - cw + 3} 47 ${50 - cw + 4} 55 Q${50 - cw + 1} 50 ${50 - cw - 1} 46 Z`} fill={skinDD} opacity={look.kadin ? 0.14 : 0.24} />
          <Path d={`M${50 + cw} 40 Q${50 + cw - 3} 47 ${50 + cw - 4} 55 Q${50 + cw - 1} 50 ${50 + cw + 1} 46 Z`} fill={skinDD} opacity={look.kadin ? 0.22 : 0.36} />
          {look.kadin ? null : (
            <>
              <Path d="M36 50.5 Q40 55 44.5 55.5" stroke={skinDD} strokeWidth={1.6} fill="none" opacity={0.1} strokeLinecap="round" />
              <Path d="M64 50.5 Q60 55 55.5 55.5" stroke={skinDD} strokeWidth={1.8} fill="none" opacity={0.16} strokeLinecap="round" />
            </>
          )}
          {/* elmacık ve alın ışığı */}
          <Ellipse cx={38.5} cy={49.5} rx={4.6} ry={2.1} fill="#ffffff" opacity={0.16} />
          <Ellipse cx={61.5} cy={49.5} rx={4} ry={1.8} fill="#ffffff" opacity={0.07} />
          <Ellipse cx={46} cy={28} rx={9} ry={4} fill="#ffffff" opacity={0.1} />
          {/* gülümseme hattı ve çene altı */}
          <Path d="M45 54.8 Q42.8 57.8 43.6 61" stroke={skinDD} strokeWidth={0.8} fill="none" opacity={look.kadin ? 0.08 : 0.2} />
          <Path d="M55 54.8 Q57.2 57.8 56.4 61" stroke={skinDD} strokeWidth={0.8} fill="none" opacity={look.kadin ? 0.1 : 0.26} />
          <Path d={`M33 57 Q38.5 ${chinY - 1.5} 50 ${chinY + 0.5} Q61.5 ${chinY - 1.5} 67 57 L67 75 L33 75 Z`} fill={skinDD} opacity={0.2} />
          <Ellipse cx={49} cy={chinY - 3.2} rx={3.2} ry={1.4} fill="#ffffff" opacity={0.12} />
        </G>
        <Path d={`M${50 + cw - 0.5} 41 Q${50 + cw} 50 ${50 + cw - 3.5} 56.5`} stroke={ring} strokeWidth={1} fill="none" opacity={0.55} />

        {/* Saç (ön) */}
        {s === 'kazik' || s === 'mohawk' ? (
          <>
            <Path d="M31.5 38.5 Q32 21.5 50 20.5 Q68 21.5 68.5 38.5 Q60 29.5 50 29.5 Q40 29.5 31.5 38.5 Z" fill={hair} opacity={0.32} />
            <Path d={tx.buzz} stroke={hairD} strokeWidth={0.42} strokeLinecap="round" fill="none" opacity={0.75} />
          </>
        ) : null}
        {s === 'mohawk' ? (
          <>
            <Path d={crestD} fill={url('hair')} />
            <G clipPath={url('crestClip')}>
              <Path d={tx.crest} stroke={hairL} strokeWidth={0.5} fill="none" opacity={0.55} />
              <Path d={tx.crest} stroke={hairD} strokeWidth={0.5} fill="none" opacity={0.6} transform="translate(0.8 0.6)" />
            </G>
          </>
        ) : null}
        {capHair ? (
          <>
            <Path d={capD} fill={url('hair')} />
            <G clipPath={url('capClip')}>
              <Path d={tx.top} stroke={hairD} strokeWidth={0.55} fill="none" opacity={0.7} />
              <Path d={tx.top} stroke={hairL} strokeWidth={0.35} fill="none" opacity={0.45} transform="translate(-0.6 -0.4)" />
              <Ellipse cx={44} cy={21.5} rx={9} ry={3.2} fill={url('sheen')} />
            </G>
            {tx.tuft ? <Path d={tx.tuft} stroke={hairL} strokeWidth={0.5} fill="none" opacity={0.5} /> : null}
          </>
        ) : null}
        {s === 'orgu' && tx.braids ? (
          <>
            <Path d={tx.braids} stroke={hairD} strokeWidth={1.1} fill="none" opacity={0.9} />
            <Path d={tx.braids} stroke={hairL} strokeWidth={0.45} fill="none" opacity={0.6} transform="translate(0 -0.5)" />
          </>
        ) : null}
        {s === 'yanayrik' ? (
          <>
            <Path d="M31.5 39 Q32 22 50 21 Q68 22 68.5 39 Q60 30.5 50 30.5 Q40 30.5 31.5 39 Z" fill={hair} opacity={0.45} />
            <Path d={sideD} fill={url('hair')} />
            <G clipPath={url('capClip')}>
              <Path d={tx.top} stroke={hairD} strokeWidth={0.55} fill="none" opacity={0.65} />
              <Path d={tx.top} stroke={hairL} strokeWidth={0.35} fill="none" opacity={0.5} transform="translate(-0.5 -0.5)" />
              <Ellipse cx={52} cy={19} rx={9} ry={3} fill={url('sheen')} />
            </G>
            <Path d="M40 28.5 Q41.5 21 47 15.5" stroke={hairD} strokeWidth={1} fill="none" opacity={0.9} />
          </>
        ) : null}
        {s === 'afro' ? <Path d="M31 39 Q30 21 50 20 Q70 21 69 39 Q62 30.5 50 31.5 Q38 30.5 31 39 Z" fill={hairD} opacity={0.45} /> : null}
        {s === 'kel' ? (
          <>
            <Ellipse cx={43} cy={26} rx={8} ry={3.6} fill="#ffffff" opacity={0.24} />
            <Ellipse cx={44} cy={25.5} rx={3.5} ry={1.3} fill="#ffffff" opacity={0.25} />
          </>
        ) : null}

        {/* Kaş kemeri gölgesi ve tüylü kaşlar */}
        <Path d="M36 40.8 Q43 38.2 48 41.2 M52 41.2 Q57 38.2 64 40.8" stroke={skinDD} strokeWidth={3.4} fill="none" opacity={0.24} strokeLinecap="round" />
        <Path d={`M37.6 38.4 Q42 ${35.5 + (look.kas === 2 ? 0.5 : 0)} 47 ${37.7 + (look.kas === 2 ? 1.6 : 0)} M53 ${37.7 + (look.kas === 2 ? 1.6 : 0)} Q58 ${35.5 + (look.kas === 2 ? 0.5 : 0)} 62.4 38.4`} stroke={browC} strokeWidth={[1, 1.5, 2.3][look.kas ?? 1]} strokeLinecap="round" fill="none" opacity={0.55} />
        <Path d={tx.browL + tx.browR} stroke={browC} strokeWidth={0.45} strokeLinecap="round" fill="none" opacity={0.95} />
        {look.yara ? (
          <>
            <Path d="M57 32 L61.5 43" stroke="#9e3a4a" strokeWidth={1.4} strokeLinecap="round" opacity={0.8} />
            <Path d="M57.4 32.2 L61.8 42.6" stroke="#ffffff" strokeWidth={0.4} strokeLinecap="round" opacity={0.3} />
          </>
        ) : null}

        {/* Gözler */}
        <Ellipse cx={42.5} cy={44} rx={6} ry={3.9} fill={skinDD} opacity={0.22} />
        <Ellipse cx={57.5} cy={44} rx={6} ry={3.9} fill={skinDD} opacity={0.3} />
        <Path d={eyePath(42.5)} fill={url('white')} />
        <Path d={eyePath(57.5)} fill={url('white')} />
        <Circle cx={42.7} cy={44} r={irisR} fill={url('iris')} stroke={shade(eye, -55)} strokeWidth={0.35} />
        <Circle cx={57.3} cy={44} r={irisR} fill={url('iris')} stroke={shade(eye, -55)} strokeWidth={0.35} />
        <Circle cx={42.7} cy={44} r={0.85} fill="#050505" />
        <Circle cx={57.3} cy={44} r={0.85} fill="#050505" />
        <Circle cx={42} cy={43.2} r={0.55} fill="#ffffff" />
        <Circle cx={56.6} cy={43.2} r={0.55} fill="#ffffff" />
        {/* üst kapak gölgesi, kapak çizgisi, kırışık ve alt kapak */}
        <Path d={`${lid(42.5)} ${lid(57.5)}`} stroke={shade(skin, -85)} strokeWidth={gs === 0 ? 1.5 : 1.15} fill="none" strokeLinecap="round" />
        <Path d={`M${42.5 - eyeW + 0.5} ${43.2 - eyeH} Q42.5 ${41.6 - eyeH} ${42.5 + eyeW - 0.3} ${43.3 - eyeH} M${57.5 - eyeW + 0.3} ${43.3 - eyeH} Q57.5 ${41.6 - eyeH} ${57.5 + eyeW - 0.5} ${43.2 - eyeH}`} stroke={skinDD} strokeWidth={0.55} fill="none" opacity={0.55} />
        <Path d={`M${42.5 - eyeW + 1} 45.3 Q42.5 ${45.3 + eyeH * 0.55} ${42.5 + eyeW - 0.6} 45.1 M${57.5 - eyeW + 0.6} 45.1 Q57.5 ${45.3 + eyeH * 0.55} ${57.5 + eyeW - 1} 45.3`} stroke={skinDD} strokeWidth={0.45} fill="none" opacity={0.45} />
        {look.kadin ? (
          <Path
            d={`${lid(42.5)} ${lid(57.5)} M${42.5 - eyeW - 0.2} 44 l-1.8 -1.1 M${57.5 + eyeW + 0.2} 44 l1.8 -1.1`}
            stroke="#120d0b"
            strokeWidth={0.95}
            strokeLinecap="round"
            fill="none"
          />
        ) : null}

        {/* Burun: köprü ışığı, yan gölge, uç ışığı, kanatlar */}
        <Path d={burun === 2 ? 'M49.5 43.5 L48.4 47.5 L50.2 50 L49 52.5' : 'M49.3 43.5 L48.6 51.5'} stroke="#ffffff" strokeWidth={1.1} opacity={0.22} fill="none" strokeLinecap="round" />
        {burun === 3 ? (
          <Path d="M51.2 44.5 Q54.6 48 53.7 53.4" stroke={skinDD} strokeWidth={1.4} fill="none" opacity={0.55} />
        ) : burun === 2 ? (
          <Path d="M51.5 45 L53 48 L51.8 50.5 L53.3 53" stroke={skinDD} strokeWidth={1.1} fill="none" opacity={0.55} />
        ) : (
          <Path d="M51.5 45 Q53 50.5 53.4 53" stroke={skinDD} strokeWidth={1.2} fill="none" opacity={0.5} />
        )}
        <Ellipse cx={49.6} cy={52.6} rx={burun === 1 ? 2.2 : 1.6} ry={1.1} fill="#ffffff" opacity={0.16} />
        <Path d={burun === 1 ? 'M45.2 53.4 Q46 55.6 48 55.4 M54.8 53.4 Q54 55.6 52 55.4' : 'M46.4 53.4 Q47 55.3 48.4 55.2 M53.6 53.4 Q53 55.3 51.6 55.2'} stroke={skinDD} strokeWidth={0.9} fill="none" opacity={0.6} />
        <Path d={burun === 1 ? 'M46.5 55.4 Q50 56.9 53.5 55.4' : 'M47.5 55.3 Q50 56.4 52.5 55.3'} stroke={skinDD} strokeWidth={1.1} fill="none" strokeLinecap="round" opacity={0.75} />
        <Ellipse cx={burun === 1 ? 47.4 : 48} cy={54.6} rx={burun === 1 ? 1.3 : 0.95} ry={0.6} fill={shade(skin, -80)} opacity={0.75} />
        <Ellipse cx={burun === 1 ? 52.6 : 52} cy={54.6} rx={burun === 1 ? 1.3 : 0.95} ry={0.6} fill={shade(skin, -80)} opacity={0.75} />

        {/* Ağız: filtrum, üst dudak (cupid yayı), alt dudak, köşeler */}
        <Path d="M49.2 56 L49.4 57.9 M50.8 56 L50.6 57.9" stroke={skinDD} strokeWidth={0.5} opacity={0.3} />
        <Path d={`M${45 - dudak * 0.4} 59 Q47 ${58 - dudak * 0.4} 48.7 ${58.1 - dudak * 0.3} Q50 ${58.7} 51.3 ${58.1 - dudak * 0.3} Q53 ${58 - dudak * 0.4} ${55 + dudak * 0.4} 59 Q50 60 ${45 - dudak * 0.4} 59 Z`} fill={url('lipU')} />
        <Path d={`M${45.6 - dudak * 0.3} 59.3 Q50 ${60.9 + dudak * 1.15} ${54.4 + dudak * 0.3} 59.3 Q50 60.4 ${45.6 - dudak * 0.3} 59.3 Z`} fill={url('lipL')} />
        {look.kadin ? <Path d={`M${45.6 - dudak * 0.3} 59.3 Q50 ${60.9 + dudak * 1.15} ${54.4 + dudak * 0.3} 59.3 Q50 60.4 ${45.6 - dudak * 0.3} 59.3 Z M${45 - dudak * 0.4} 59 Q47 ${58 - dudak * 0.4} 48.7 ${58.1 - dudak * 0.3} Q50 58.7 51.3 ${58.1 - dudak * 0.3} Q53 ${58 - dudak * 0.4} ${55 + dudak * 0.4} 59 Q50 60 ${45 - dudak * 0.4} 59 Z`} fill="#b84a63" opacity={0.32} /> : null}
        <Path d={`M${45 - dudak * 0.4} 59.05 Q50 60.1 ${55 + dudak * 0.4} 59.05`} stroke={shade(skin, -90)} strokeWidth={0.6} fill="none" strokeLinecap="round" />
        <Path d={`M47.6 ${60.5 + dudak * 0.4} Q50 ${61.2 + dudak * 0.5} 52.4 ${60.5 + dudak * 0.4}`} stroke="#ffffff" strokeWidth={0.55} opacity={0.28} fill="none" />
        <Path d={`M${50 - 2.5} ${62.6 + dudak * 0.6} Q50 ${63.3 + dudak * 0.6} ${50 + 2.5} ${62.6 + dudak * 0.6}`} stroke={skinDD} strokeWidth={0.8} opacity={0.3} fill="none" />

        {/* Sakal ve bıyık */}
        {tx.stubble ? (
          <>
            <Path d={`M31.5 45 Q32 56 37 62.5 Q43 ${chinY - 0.5} 50 ${chinY + 1} Q57 ${chinY - 0.5} 63 62.5 Q68 56 68.5 45 Q66.5 52 61 56 Q55.5 57.6 50 56.8 Q44.5 57.6 39 56 Q33.5 52 31.5 45 Z`} fill={hair} opacity={0.16} />
            <Path d={tx.stubble} stroke={hairD} strokeWidth={0.36} strokeLinecap="round" fill="none" opacity={0.62} />
          </>
        ) : null}
        {!look.kadin && look.sakal === 'tam' ? (
          <>
            <Path d={beardD} fill={url('hair')} />
            <G clipPath={url('beardClip')}>
              <Path d={tx.beard} stroke={hairD} strokeWidth={0.45} fill="none" opacity={0.55} />
              <Path d={tx.beard} stroke={hairL} strokeWidth={0.28} fill="none" opacity={0.22} transform="translate(-0.5 -0.3)" />
              <Ellipse cx={44} cy={63} rx={7} ry={3} fill={url('sheen')} opacity={0.6} />
            </G>
            <Path d="M43.8 58.4 Q50 55.2 56.2 58.4 Q53.5 57.4 50 58 Q46.5 57.4 43.8 58.4 Z" fill={hair} stroke={hair} strokeWidth={1.2} />
            <Path d={tx.mous} stroke={hairD} strokeWidth={0.3} fill="none" opacity={0.45} />
            <Path d={`M${45.6 - dudak * 0.3} 59.4 Q50 ${60.7 + dudak} ${54.4 + dudak * 0.3} 59.4 Q50 60.3 ${45.6 - dudak * 0.3} 59.4 Z`} fill={url('lipL')} />
          </>
        ) : null}
        {!look.kadin && (look.sakal === 'keci' || look.sakal === 'biyik') ? (
          <>
            <Path d="M43.4 58.3 Q46 56.4 50 56.9 Q54 56.4 56.6 58.3 Q57.4 59.6 56.8 60.4 Q54 58.6 50 58.6 Q46 58.6 43.2 60.4 Q42.6 59.6 43.4 58.3 Z" fill={url('hair')} />
            <Path d={tx.mous} stroke={hairD} strokeWidth={0.32} fill="none" opacity={0.5} />
            <Path d={tx.mous} stroke={hairL} strokeWidth={0.22} fill="none" opacity={0.22} transform="translate(-0.3 -0.3)" />
          </>
        ) : null}
        {!look.kadin && look.sakal === 'keci' ? (
          <>
            <Path d={`M45.2 61.4 Q46 ${Math.min(chinY + 3, 71)} 50 ${Math.min(chinY + 4, 72)} Q54 ${Math.min(chinY + 3, 71)} 54.8 61.4 Q52 62.6 50 62.6 Q48 62.6 45.2 61.4 Z`} fill={url('hair')} />
            <Path d={tx.goatee} stroke={hairD} strokeWidth={0.45} fill="none" opacity={0.75} />
            <Path d={tx.goatee} stroke={hairL} strokeWidth={0.28} fill="none" opacity={0.45} transform="translate(-0.3 -0.2)" />
          </>
        ) : null}
      </G>
    </Svg>
  );
}
