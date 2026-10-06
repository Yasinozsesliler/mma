// Kafese giriş efekti (kozmetik): ateş, duman, konfeti, şimşek ya da kar. Giriş sahnesinde ve dolap önizlemesinde
// aynı bileşen kullanılır. Parçacıklar zamana bağlı saf fonksiyonla çizilir (rastgelelik sabit tohumdan).
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { FxKind } from '../engine/cosmetics';
export type { FxKind };

/** 0-1 arası sabit sözde rastgele (parçacık i, alan k). */
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const CONFETTI = ['#f2c14e', '#e63946', '#3aa8ff', '#39ff14', '#ffffff', '#b388ff'];

export function WalkoutFx({ kind, w, h, dense = 1 }: { kind: FxKind; w: number; h: number; dense?: number }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = Date.now();
    let last = 0;
    const loop = () => {
      const now = Date.now();
      // ~30 fps yeterli; pil dostu
      if (now - last > 33) {
        last = now;
        setT((now - t0) / 1000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const n = (k: number) => Math.round(k * dense);
  let body: ReactNode = null;

  if (kind === 'ates') {
    // İki yandan periyodik alev fışkırması ve yükselen kıvılcımlar
    const burst = (side: number, i: number) => {
      const ph = (t * 0.7 + side * 0.35) % 1;
      const on = ph < 0.45;
      const k = on ? Math.sin((ph / 0.45) * Math.PI) : 0;
      const x = side ? w * 0.9 : w * 0.1;
      return (
        <G key={`b${i}`} opacity={k}>
          <Ellipse cx={x} cy={h - h * 0.18 * k} rx={w * 0.06} ry={h * 0.2 * k + 1} fill="url(#fxFire)" />
          <Ellipse cx={x} cy={h - h * 0.12 * k} rx={w * 0.035} ry={h * 0.13 * k + 1} fill="#fff3b0" opacity={0.85} />
        </G>
      );
    };
    body = (
      <>
        {burst(0, 0)}
        {burst(1, 1)}
        {Array.from({ length: n(26) }, (_, i) => {
          const life = (t * (0.5 + rnd(i, 1) * 0.6) + rnd(i, 2)) % 1;
          const side = i % 2;
          const x = (side ? w * 0.9 : w * 0.1) + (rnd(i, 3) - 0.5) * w * 0.18 + Math.sin(t * 3 + i) * 6;
          return <Circle key={i} cx={x} cy={h - life * h * 0.75} r={1.2 + rnd(i, 4) * 1.8} fill={rnd(i, 5) > 0.5 ? '#ffb703' : '#ff5400'} opacity={1 - life} />;
        })}
      </>
    );
  } else if (kind === 'duman') {
    body = (
      <>
        {Array.from({ length: n(14) }, (_, i) => {
          const life = (t * (0.12 + rnd(i, 1) * 0.08) + rnd(i, 2)) % 1;
          const x = rnd(i, 3) * w + Math.sin(t * 0.6 + i) * 14;
          const r = w * (0.12 + rnd(i, 4) * 0.12) * (0.6 + life);
          return <Circle key={i} cx={x} cy={h - life * h * 0.6} r={r} fill="#c9ced6" opacity={0.22 * (1 - life)} />;
        })}
      </>
    );
  } else if (kind === 'konfeti') {
    body = (
      <>
        {Array.from({ length: n(40) }, (_, i) => {
          const life = (t * (0.18 + rnd(i, 1) * 0.15) + rnd(i, 2)) % 1;
          const x = rnd(i, 3) * w + Math.sin(t * 2 + i) * 10;
          const y = life * (h + 20) - 10;
          const rot = (t * 200 * (rnd(i, 4) - 0.5) + i * 40) % 360;
          return <Rect key={i} x={x} y={y} width={5} height={8} fill={CONFETTI[i % CONFETTI.length]} transform={`rotate(${rot} ${x + 2.5} ${y + 4})`} opacity={0.95} />;
        })}
      </>
    );
  } else if (kind === 'simsek') {
    // Her ~1.4 sn'de bir çakan şimşek ve kısa beyaz parlama
    const cyc = Math.floor(t / 1.4);
    const ph = (t % 1.4) / 1.4;
    const on = ph < 0.12;
    const x0 = (0.2 + rnd(cyc, 1) * 0.6) * w;
    let x = x0;
    const pts = [`M${x0} 0`];
    for (let k = 1; k <= 7; k++) {
      x += (rnd(cyc, k + 2) - 0.5) * w * 0.12;
      pts.push(`L${x.toFixed(1)} ${((h * 0.75 * k) / 7).toFixed(1)}`);
    }
    body = on ? (
      <>
        <Rect x={0} y={0} width={w} height={h} fill="#dfe9ff" opacity={0.18 * (1 - ph / 0.12)} />
        <Path d={pts.join(' ')} stroke="#9ec5ff" strokeWidth={5} fill="none" opacity={0.5} strokeLinejoin="round" />
        <Path d={pts.join(' ')} stroke="#ffffff" strokeWidth={2} fill="none" strokeLinejoin="round" />
      </>
    ) : null;
  } else {
    // Kar: yavaşça düşen taneler ve zeminde buz parıltısı
    body = (
      <>
        <Ellipse cx={w / 2} cy={h} rx={w * 0.55} ry={h * 0.08} fill="#bfe6ff" opacity={0.18} />
        {Array.from({ length: n(45) }, (_, i) => {
          const life = (t * (0.07 + rnd(i, 1) * 0.07) + rnd(i, 2)) % 1;
          const x = rnd(i, 3) * w + Math.sin(t * 1.2 + i) * 8;
          return <Circle key={i} cx={x} cy={life * h} r={0.9 + rnd(i, 4) * 1.8} fill="#ffffff" opacity={0.85} />;
        })}
      </>
    );
  }

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="fxFire" cx="50%" cy="70%" r="60%">
          <Stop offset="0" stopColor="#ffd166" />
          <Stop offset="0.5" stopColor="#ff7b00" />
          <Stop offset="1" stopColor="#d00000" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {body}
    </Svg>
  );
}
