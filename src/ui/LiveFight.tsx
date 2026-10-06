// Canlı dövüş ekranı: bir raunt gerçek zamanlı oynanır (motor: engine/liveFight.ts). Rakip ⚠️ ile saldırı hazırlar;
// küçülen halka vuruş anını gösterir. KAÇ ile sıyrıl ve kontra penceresinde vur, DİREKT/TEKME ile hazırlığı kes,
// GARD ile hasarı azalt. Raunt bitince sonuç dövüşe işlenir.
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient as SvgLinear, Path, Pattern, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { sfx } from '../audio';
import { playerKit } from '../cosmetics';
import { oppStatsOf } from '../engine/fight';
import { liveCreate, liveElapsed, liveHold, liveInput, livePos, liveResult, liveShift, liveStep, SPECIAL_COOLDOWN, type SpecialKind, type LiveEvent, type LiveInput, type LiveRoundResult, type LiveSim, WARN_MS } from '../engine/liveFight';
import type { Appearance, FightState } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { INSTANT, ND, useFlash } from './drills/common';
import { getPref, setPref } from '../prefs';
import { DEFAULT_LOOK } from './FighterAvatar';
import { Figure, HIP_H, lerpPose, POSES, type Pose, type PoseName } from './rig';
import { C, F } from './theme';

type Actor = 'p' | 'o';
type Frame = { t: number; p: Pose; o: Pose; pHp: number; pSta: number; oHp: number; oSta: number; left: number; ring: { r: number; gold: boolean } | null; icon: string | null; pos: 'ayakta' | 'ustte' | 'altta'; special: { ready: boolean; pct: number } | null; kilit: { by: 'p' | 'o'; prog: number; left: number; ad: string; /** Rakip kıvranmak üzere: DİREN! */ uyari: boolean; /** Kaçırılan kilitlerle rakibin uyanıklığı */ uyanik: number } | null; gpos: number; guard: boolean; counter: boolean; fx: { x: number; y: number; t0: number; big: boolean }[]; sx: number; zoom: number; flash: number };
const BLUE = { shorts: '#1f4fbf', trim: '#ffffff', glove: '#1740a8' };
const P = (n: PoseName, ov: Partial<Pose> = {}): Pose => ({ ...POSES[n], ...ov });
type Btn = [LiveInput, () => string, string];
const PURPLE = '#b77dff';
/** Konuma göre düğmeler: üst sıra savunma/özel, alt sıra vuruşlar */
const BUTTONS: Record<'ayakta' | 'ustte' | 'altta', Btn[][]> = {
  ayakta: [
    [['kac', () => L("KAÇ"), C.blue], ['gard', () => L("GARD"), '#9aa3b2'], ['indir', () => L("İNDİR"), PURPLE]],
    [['jab', () => L("JAB"), C.green], ['direkt', () => L("DİREKT"), C.red], ['tekme', () => L("TEKME"), C.orange]],
  ],
  ustte: [
    [['kalk', () => L("KALK"), '#9aa3b2'], ['gard', () => L("KONTROL"), C.blue], ['sub', () => L("SUB"), PURPLE]],
    [['jab', () => L("YUMRUK"), C.green], ['direkt', () => L("DİRSEK"), C.red]],
  ],
  altta: [
    [['gard', () => L("GARD"), '#9aa3b2'], ['sub', () => L("SUB"), PURPLE]],
    [['kac', () => L("KURTUL"), C.blue]],
  ],
};
const GUARD: Partial<Pose> = { aL1: 70, aL2: 145, aR1: 62, aR2: 150, torso: 4, head: -4 };
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
/** Rakibin hazırladığı hamlenin uyarı ikonu */
const ICONS: Record<string, string> = { td: '⬇️', gsub: '🔒', escape: '⤴️', gnp: '👊' };
const TUTORIAL_KEY = 'yol_canli_rehber';
const VB_W = 200;
const VB_H = 130;
const FLOOR = 118;
/** Görünen alan: dövüşçülere yakın, yanlardan kırpmadan */
const VIEW = '28 4 144 128';
const ASPECT = 144 / 128;

/** Sabit arka plan: tribün siluetleri, kafes, spot ve kanvas (her karede yeniden çizilmez). */
/** Seyirci başları (sabit sözde-rastgele dizilim) ve yanan telefon ışıkları */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const FANS = Array.from({ length: 90 }, (_, i) => ({ row: i % 3, u: hash(i), s: 0.8 + hash(i + 40) * 0.4, c: ['#14151b', '#1a1c23', '#111217', '#1f2129'][i % 4], lit: hash(i + 99) < 0.07 }));

/** Sabit arka plan: tribün, LED pano, kafes teli, yastıklı ray, dokulu kanvas, spotlar (her karede yeniden çizilmez). */
const ArenaBg = memo(function ArenaBg() {
  return (
    <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet" style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgLinear id="lfSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0d0f16" />
          <Stop offset="1" stopColor="#05060a" />
        </SvgLinear>
        <RadialGradient id="lfSpot" cx="50%" cy="45%" r="60%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.3} />
          <Stop offset="0.7" stopColor="#ffffff" stopOpacity={0.04} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>
        <SvgLinear id="lfCone" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fff3d6" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#fff3d6" stopOpacity={0} />
        </SvgLinear>
        <SvgLinear id="lfMat" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#c9c9ce" />
          <Stop offset="1" stopColor="#e4e4e8" />
        </SvgLinear>
        <SvgLinear id="lfPad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2c2f38" />
          <Stop offset="1" stopColor="#121318" />
        </SvgLinear>
        <SvgLinear id="lfLed" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={C.red} stopOpacity={0.15} />
          <Stop offset="0.5" stopColor={C.red} stopOpacity={0.55} />
          <Stop offset="1" stopColor={C.red} stopOpacity={0.15} />
        </SvgLinear>
        {/* Kafes teli: baklava örgü */}
        <Pattern id="lfMesh" patternUnits="userSpaceOnUse" width={3.2} height={3.2}>
          <Path d="M0 1.6 L1.6 0 L3.2 1.6 L1.6 3.2 Z" fill="none" stroke="#8a8f99" strokeWidth={0.22} strokeOpacity={0.55} />
        </Pattern>
        {/* Kanvas dokusu: ince dokuma çizgileri */}
        <Pattern id="lfWeave" patternUnits="userSpaceOnUse" width={2} height={2}>
          <Line x1={0} y1={0.5} x2={2} y2={0.5} stroke="#000" strokeOpacity={0.05} strokeWidth={0.3} />
          <Line x1={0.5} y1={0} x2={0.5} y2={2} stroke="#fff" strokeOpacity={0.06} strokeWidth={0.3} />
        </Pattern>
        <RadialGradient id="lfVig" cx="50%" cy="55%" r="70%">
          <Stop offset="0.55" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.6} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#lfSky)" />
      {/* LED pano ve tribün */}
      <Rect x={20} y={12} width={160} height={5} fill="#07080b" />
      <Rect x={20} y={12} width={160} height={5} fill="url(#lfLed)" />
      {Array.from({ length: 40 }, (_, i) => (
        <Rect key={`l${i}`} x={21 + i * 4} y={13.6} width={2.2} height={1.8} fill="#ffd7d9" opacity={0.18 + (i % 5) * 0.05} />
      ))}
      {FANS.map((f, i) => {
        const y = 24 + f.row * 6.5;
        const x = 6 + f.u * 188;
        const r = (2.3 + f.row * 0.35) * f.s;
        return (
          <G key={i}>
            <Ellipse cx={x} cy={y + r * 1.6} rx={r * 1.7} ry={r * 1.3} fill={f.c} />
            <Circle cx={x} cy={y} r={r} fill={f.c} />
            {f.lit ? <Rect x={x + r * 0.6} y={y - r * 0.2} width={1.1} height={1.7} rx={0.2} fill="#cfe6ff" opacity={0.85} /> : null}
          </G>
        );
      })}
      {/* Spot konileri ve sis */}
      <Polygon points="66,0 80,0 122,118 26,118" fill="url(#lfCone)" />
      <Polygon points="120,0 134,0 174,118 78,118" fill="url(#lfCone)" />
      {/* Arka kafes: yastıklı ray, tel örgü, direkler */}
      <Polygon points="14,98 30,44 170,44 186,98" fill="url(#lfMesh)" />
      <Polygon points="14,98 30,44 170,44 186,98" fill="none" stroke="#2b2e36" strokeWidth={0.6} />
      <Rect x={29} y={41.5} width={142} height={3.4} rx={1.6} fill="url(#lfPad)" />
      {[30, 65, 100, 135, 170].map((x) => (
        <G key={x}>
          <Line x1={x} y1={44} x2={x + (x - 100) * 0.23} y2={96} stroke="#1a1c22" strokeWidth={1.4} />
          <Rect x={x - 1.6} y={40.5} width={3.2} height={4.6} rx={0.8} fill={x === 30 ? C.red : x === 170 ? C.blue : '#2c2f38'} />
        </G>
      ))}
      {/* Kanvas: dokulu mat, kenar gölgesi, logo halkası ve çıkartmalar */}
      <Ellipse cx={100} cy={FLOOR + 2} rx={98} ry={16} fill="url(#lfMat)" />
      <Ellipse cx={100} cy={FLOOR + 2} rx={98} ry={16} fill="url(#lfWeave)" />
      <Ellipse cx={100} cy={FLOOR + 2} rx={98} ry={16} fill="url(#lfSpot)" />
      <Ellipse cx={100} cy={FLOOR + 2} rx={98} ry={16} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={2.2} />
      <Ellipse cx={100} cy={FLOOR + 2} rx={30} ry={5.2} fill="none" stroke={C.red} strokeOpacity={0.55} strokeWidth={0.9} />
      <Ellipse cx={100} cy={FLOOR + 2} rx={26} ry={4.4} fill={C.red} opacity={0.08} />
      <Polygon points={`52,${FLOOR + 6} 66,${FLOOR + 6} 63,${FLOOR + 10} 48,${FLOOR + 10}`} fill="#1d2a52" opacity={0.25} />
      <Polygon points={`134,${FLOOR + 6} 148,${FLOOR + 6} 152,${FLOOR + 10} 137,${FLOOR + 10}`} fill="#52221d" opacity={0.25} />
      {/* Ön direkler */}
      <Line x1={3} y1={10} x2={3} y2={VB_H} stroke="#3a3d45" strokeWidth={2} />
      <Line x1={197} y1={10} x2={197} y2={VB_H} stroke="#3a3d45" strokeWidth={2} />
      <Rect x={1.5} y={10} width={3} height={8} fill={C.red} />
      <Rect x={195.5} y={10} width={3} height={8} fill={C.blue} />
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#lfVig)" />
    </Svg>
  );
});

function Bar({ v, color, right }: { v: number; color: string; right?: boolean }) {
  return (
    <View style={[lf.bar, right && { transform: [{ scaleX: -1 }] }]}>
      <View style={{ width: `${Math.max(0, Math.min(100, v))}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

export type Special = { kind: SpecialKind; imza: boolean; ad: string };

/** Tarza özel hamlenin görünen adı */
export const SPECIAL_NAMES: Record<SpecialKind, () => string> = {
  kombo: () => L("Kombinasyon"),
  kafaTekmesi: () => L("Kafa tekmesi"),
  diz: () => L("Clinch dizi"),
  suplex: () => L("Suplex"),
  guardCek: () => L("Guard çek + kilit"),
  savurma: () => L("Savurma yumruk"),
};

const TUTORIAL = () => [
  { icon: '⚠️', baslik: L("Rakibi oku"), metin: L("Rakip saldırı hazırlarken başında küçülen bir halka çıkar. Halka ALTIN olunca KAÇ'a bas, sonra hemen vur: kontra vuruşların çift hasar yapar.") },
  { icon: '🥊', baslik: L("Vur ve kes"), metin: L("JAB hızlı ve ucuz, DİREKT ve TEKME ağırdır. Rakip hazırlanırken DİREKT ya da TEKME atarsan saldırısını kesersin. Sarı çubuk nefesin: bitince vuruşların zayıflar.") },
  { icon: '🤼', baslik: L("Yere götür"), metin: L("İNDİR ile takedown dene; rakip ⬇️ ile dalarsa KAÇ ile sprawl yap. Yerde düğmeler değişir: üstteyken vur ve submission ara, alttayken 🔒 görünce hemen KURTUL.") },
];

export function LiveFight({ fs, pLook, oLook, onEnd, ozel }: { fs: FightState; pLook?: Appearance; oLook: Appearance; onEnd: (r: LiveRoundResult) => void; ozel?: Special }) {
  const { width: W, height: H } = useWindowDimensions();
  const [kit] = useState(playerKit);
  const sim = useRef<LiveSim | null>(null);
  const seen = useRef(0);
  const tw = useRef<Record<Actor, { from: Pose; to: Pose; t0: number; ms: number }>>({
    p: { from: P('stance'), to: P('stance'), t0: 0, ms: 1 },
    o: { from: P('stance'), to: P('stance'), t0: 0, ms: 1 },
  });
  const fx = useRef<{ x: number; y: number; t0: number; big: boolean }[]>([]);
  const shake = useRef({ t0: 0, amp: 0 });
  const [frame, setFrame] = useState<Frame>(() => ({ t: 0, p: P('stance'), o: P('stance'), pHp: 100 - fs.pHasar, pSta: fs.pKondisyon, oHp: 100 - fs.oHasar, oSta: fs.oKondisyon, left: 30000, ring: null, icon: null, pos: 'ayakta', special: null, kilit: null, gpos: 0, guard: false, counter: false, fx: [], sx: 0, zoom: 1, flash: 0 }));
  /** Kamera yakınlaşması ve beyaz flaş (sert darbe, sarsılma, nakavt) */
  const punch = useRef({ t0: 0, zoom: 0, flash: 0 });
  const [banner, setBanner] = useState<string | null>(() => L("{0}. RAUNT", [fs.raunt]));
  // İlk canlı maçta kısa rehber; görüldükten sonra raunt hemen başlar
  const [started, setStarted] = useState(() => getPref(TUTORIAL_KEY) === '1');
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mid, setMid] = useState({ w: 0, h: 0 });
  const pausedAt = useRef<number | null>(null);
  const flash = useFlash(H * 0.3);
  const ended = useRef(false);

  const cur = (a: Actor) => {
    const x = tw.current[a];
    return lerpPose(x.from, x.to, Math.min(1, (now() - x.t0) / x.ms));
  };
  const go = (a: Actor, to: Pose, ms: number) => void (tw.current[a] = { from: cur(a), to, t0: now(), ms: Math.max(1, ms) });
  const seq = (a: Actor, steps: [Pose, number][]) => {
    let d = 0;
    steps.forEach(([p, ms]) => {
      setTimeout(() => go(a, p, ms), d);
      d += ms;
    });
  };
  const spark = (a: Actor, big: boolean) => {
    fx.current.push({ x: a === 'p' ? 72 : 128, y: FLOOR - HIP_H - 30, t0: now(), big });
    shake.current = { t0: now(), amp: big ? 3.2 : a === 'p' ? 1.6 : 0.8 };
    if (big) punch.current = { t0: now(), zoom: 0.06, flash: 0 };
  };

  /** Yer dövüşünde kim üstte (pozlar buna göre) */
  const ground = useRef<'p' | 'o' | null>(null);
  const base = (a: Actor, ov: Partial<Pose> = {}): Pose => {
    const g = ground.current;
    if (!g) return P('stance', ov);
    return g === a ? P('kneelTop', { x: 18, ...ov }) : P('onBack', { x: 24, ...ov });
  };

  const onEvent = (e: LiveEvent) => {
    switch (e.kind) {
      case 'pAttack':
        if (e.alt === 'yumruk' || e.alt === 'dirsek') seq('p', [[P('gnp', { x: 18 }), e.alt === 'dirsek' ? 150 : 100], [P('gnpHit', { x: 20 }), 90], [base('p'), 200]]);
        else if (e.alt === 'jab') seq('p', [[P('jab', { x: 14 }), 80], [base('p'), 150]]);
        else if (e.alt === 'direkt') seq('p', [[P('stance', { torso: 8, x: 2 }), 110], [P('cross', { x: 16 }), 100], [base('p'), 180]]);
        else seq('p', [[P('stance', { x: -2 }), 120], [P('bodyKick', { x: 10 }), 160], [base('p'), 220]]);
        sfx('whoosh', 0.4);
        return;
      case 'pDodge':
        seq('p', [[P('stance', { torso: -20, head: -16, x: -10, y: 3 }), 90], [base('p'), 220]]);
        return;
      case 'pGuard':
        if (ground.current) return;
        seq('p', [[P('stance', GUARD), 90], [P('stance', GUARD), 520], [base('p'), 160]]);
        return;
      case 'oWindup':
        if (ground.current === 'o') go('o', P('gnp', { x: 18 }), 150);
        else if (ground.current === 'p') go('o', P('onBack', { x: 24, head: 18 }), 150);
        else if (e.alt === 'td') go('o', P('stance', { torso: 30, y: 6, x: -2 }), 160);
        else go('o', P('stance', { torso: -14, x: -6, y: 2 }), 150);
        return;
      case 'oFeint':
        go('o', base('o'), 160);
        return;
      case 'oGuard':
        go('o', P('stance', GUARD), 140);
        return;
      case 'oAttack':
        if (e.alt === 'gnp') seq('o', [[P('gnpHit', { x: 20 }), 100], [base('o'), 220]]);
        else seq('o', [[P(e.alt === 'kick' ? 'bodyKick' : e.alt === 'jab' ? 'jab' : Math.random() < 0.5 ? 'cross' : 'hook', { x: 14 }), 110], [base('o'), 240]]);
        sfx('whoosh', 0.6);
        return;
      case 'hit': {
        const a = e.side as Actor;
        const big = (e.dmg ?? 0) >= 3;
        spark(a, big);
        seq(a, ground.current ? [[base(a, { head: ground.current === a ? -14 : 22 }), 90], [base(a), 200]] : [[P('stance', { torso: -12, head: -22, x: -7 }), 90], [P('stance'), 220]]);
        sfx(big ? 'heavy' : 'punch');
        if (a === 'p') buzz(big ? 'guclu' : 'orta');
        else buzz(big ? 'orta' : 'hafif');
        if (a === 'o' && big) flash.show({ puan: 70, metin: L("İSABET!"), renk: C.green });
        if (a === 'p') flash.show({ puan: 0, metin: L("YEDİN"), renk: C.red });
        return;
      }
      case 'blocked':
        if (e.alt === 'miss') flash.show({ puan: 30, metin: L("BOŞA"), renk: C.dim });
        else if (e.alt === 'escape') flash.show({ puan: 20, metin: L("KURTULAMADIN"), renk: C.dim });
        else flash.show({ puan: 40, metin: e.side === 'p' ? L("GARD!") : L("GARDA"), renk: C.dim });
        sfx('body', 0.6);
        return;
      case 'dodged':
        flash.show({ puan: 100, metin: L("KAÇTIN! ŞİMDİ KONTRA!"), renk: C.gold });
        buzz('basari');
        return;
      case 'interrupt':
        flash.show({ puan: 100, metin: L("KESTİN!"), renk: C.gold });
        return;
      case 'counter':
        flash.show({ puan: 100, metin: L("KONTRA!"), renk: C.gold });
        return;
      case 'td':
        if (e.alt === 'stuffed') {
          flash.show({ puan: e.side === 'o' ? 100 : 20, metin: e.side === 'o' ? L("TAKEDOWN SAVUNULDU!") : L("DALIŞ BOŞA ÇIKTI"), renk: e.side === 'o' ? C.gold : C.red });
          seq(e.side as Actor, [[P('shot', { x: 20 }), 200], [P('stance'), 350]]);
        } else seq(e.side as Actor, [[P('shot', { x: 24 }), 200]]);
        sfx('whoosh');
        return;
      case 'sprawl':
        seq('p', [[P('sprawl', { x: 6 }), 220], [P('stance'), 400]]);
        buzz('basari');
        return;
      case 'ground': {
        const top = e.side as Actor;
        ground.current = top;
        go(top, P('kneelTop', { x: 18 }), 280);
        go(top === 'p' ? 'o' : 'p', P('onBack', { x: 24 }), 280);
        shake.current = { t0: now(), amp: 3 };
        sfx('slam');
        buzz('orta');
        setBanner(top === 'p' ? L("YERE İNDİRDİN!") : L("YERE İNDİRİLDİN!"));
        setTimeout(() => setBanner(null), 1000);
        return;
      }
      case 'stand':
        ground.current = null;
        go('p', P('stance'), 350);
        go('o', P('stance'), 350);
        flash.show({ puan: 50, metin: L("AYAKTA"), renk: C.text });
        return;
      case 'held':
        flash.show({ puan: 100, metin: e.alt === 'gsub' ? L("KİLİDİ BOZDUN!") : L("BASTIRDIN!"), renk: C.gold });
        buzz('basari');
        return;
      case 'sub':
        if (e.alt === 'fail' || e.alt === 'yakin') {
          flash.show({ puan: 30, metin: e.side === 'p' ? (e.alt === 'yakin' ? L("ÇOK YAKLAŞTIN!") : L("KİLİT KAÇTI")) : L("KURTULDUN!"), renk: e.side === 'p' ? (e.alt === 'yakin' ? C.orange : C.dim) : C.gold });
          if (ground.current) {
            go('p', base('p'), 300);
            go('o', base('o'), 300);
          }
        } else sfx('lock');
        return;
      case 'kivran':
        // Sakin geri bildirim: yazı ya da sarsıntı yok, yalnızca titreşim
        buzz(e.alt === 'blok' ? 'basari' : e.alt === 'sert' ? 'orta' : 'hafif');
        return;
      case 'kilit': {
        // Kilit pozları: armbar, triangle ya da guillotine (teknik adına göre)
        const by = e.side as Actor;
        const vic: Actor = by === 'p' ? 'o' : 'p';
        const a = (e.alt ?? '').toLowerCase();
        const kind = /triangle/.test(a) ? 'triangle' : /guillotine|d'arce/.test(a) ? 'guillotine' : 'armbar';
        // Çift, iki dövüşçünün arasındaki mesafe korunarak sahnenin ortasına yerleşir
        if (kind === 'triangle') {
          go(by, P('triangle', { x: 36 }), 300);
          go(vic, P('triangleVictim', { x: -10 }), 300);
        } else if (kind === 'guillotine') {
          go(by, P('guillotine', { x: 16 }), 300);
          go(vic, P('guillotineVictim', { x: 10 }), 300);
        } else {
          go(by, P('armbar', { x: 46 }), 300);
          go(vic, P('armbarVictim', { x: 24 }), 300);
        }
        sfx('lock');
        buzz('orta');
        return;
      }
      case 'pozisyon':
        flash.show({ puan: 20, metin: L("ÖNCE POZİSYON AL"), renk: C.orange });
        return;
      case 'kd':
        if (e.side === 'o') {
          if (!ground.current) seq('o', [[P('reel', { x: -8 }), 150], [P('hurt', { x: -6 }), 300], [P('reel', { x: -10 }), 400], [P('stance'), 600]]);
          setBanner(L("SARSILDI! BİTİR!"));
          sfx('roar');
        } else {
          if (!ground.current) seq('p', [[P('reel', { x: -8 }), 150], [P('hurt', { x: -6 }), 400], [P('stance'), 800]]);
          setBanner(L("SARSILDIN! KAÇ, GARD AL!"));
          sfx('ooh');
        }
        buzz('nakavt');
        shake.current = { t0: now(), amp: 5 };
        punch.current = { t0: now(), zoom: 0.14, flash: 0.55 };
        setTimeout(() => setBanner(null), 1700);
        return;
      case 'tired':
        flash.show({ puan: 0, metin: L("NEFESİN YOK"), renk: C.red });
        return;
      case 'end': {
        const loser = e.side as Actor;
        const sub = sim.current?.over?.yontem === 'SUB';
        if (sub) {
          setBanner(loser === 'o' ? L("TAP! SUBMISSION!") : L("TAP ATTIN"));
          sfx('tap');
        } else {
          ground.current = null;
          seq(loser, [[P('reel', { x: -8 }), 150], [P('knockedOut', { x: -16 }), 450]]);
          seq(loser === 'p' ? 'o' : 'p', [[P('stance'), 400], [P('win', { x: 0 }), 500]]);
          setBanner(loser === 'o' ? L("NAKAVT!") : L("NAKAVT OLDUN"));
          sfx('roar');
        }
        buzz('nakavt');
        shake.current = { t0: now(), amp: 6 };
        punch.current = { t0: now(), zoom: 0.18, flash: 0.8 };
        return;
      }
    }
  };

  useEffect(() => {
    if (!started) return;
    const s = liveCreate(fs, oppStatsOf(fs), now(), undefined, ozel ? { kind: ozel.kind, imza: ozel.imza } : undefined);
    sim.current = s;
    sfx('bell');
    const t1 = setTimeout(() => setBanner(L("DÖVÜŞ!")), 700);
    const t2 = setTimeout(() => setBanner((b) => (b === L("DÖVÜŞ!") ? null : b)), 1400);
    let raf = 0;
    let last = 0;
    const loop = () => {
      const t = now();
      if (pausedAt.current != null) {
        raf = requestAnimationFrame(loop);
        return;
      }
      liveStep(s, t);
      while (seen.current < s.events.length) onEvent(s.events[seen.current++]);
      fx.current = fx.current.filter((f) => t - f.t0 < 400);
      if (!ND || t - last > 32) {
        last = t;
        const o = s.o;
        const rem = o.state === 'windup' ? Math.max(0, o.stateUntil - t) : -1;
        const shk = shake.current.amp * Math.max(0, 1 - (t - shake.current.t0) / 300);
        setFrame({
          t,
          p: cur('p'),
          o: cur('o'),
          pHp: s.p.hp,
          pSta: s.p.sta,
          oHp: o.hp,
          oSta: o.sta,
          left: Math.max(0, s.dur - liveElapsed(s)),
          // Zamanlama halkası: hazırlık süresince küçülür, kaçış penceresine girince altın olur.
          ring: rem >= 0 ? { r: 10 + Math.min(1, rem / 700) * 14, gold: rem < s.cfg.dodgeMs * 0.8 } : null,
          icon: rem >= 0 ? ICONS[o.attack] ?? '⚠️' : o.state === 'guard' ? '🛡️' : null,
          pos: livePos(s),
          kilit: s.kilit
            ? {
                by: s.kilit.by,
                prog: s.kilit.prog,
                left: Math.max(0, s.kilit.until - t) / 4000,
                ad: s.kilit.ad,
                uyari: s.kilit.by === 'p' && s.kilit.nextJolt != null && t >= s.kilit.nextJolt - WARN_MS && t < s.kilit.nextJolt,
                uyanik: s.subFails,
              }
            : null,
          gpos: s.ground?.top === 'p' ? s.ground.pos : 0,
          guard: o.state === 'guard',
          counter: t < s.p.counterUntil,
          fx: fx.current.map((f) => ({ ...f })),
          sx: shk ? Math.sin(t / 15) * shk : 0,
          // Yakınlaşma hızlı girer, yavaş çıkar; flaş kısa
          zoom: 1 + punch.current.zoom * Math.max(0, 1 - (t - punch.current.t0) / 700) * Math.min(1, (t - punch.current.t0) / 80),
          flash: punch.current.flash * Math.max(0, 1 - (t - punch.current.t0) / 260),
          special: s.special ? { ready: t >= s.special.readyAt && livePos(s) === 'ayakta', pct: Math.min(1, 1 - (s.special.readyAt - t) / SPECIAL_COOLDOWN) } : null,
        });
      }
      const done = s.over || (t >= s.start && liveElapsed(s) >= s.dur);
      if (done && !ended.current) {
        ended.current = true;
        if (!s.over) {
          setBanner(L("RAUNT BİTTİ"));
          sfx('bell2');
        }
        setTimeout(() => onEnd(liveResult(s)), s.over ? 2200 : 1300);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // Raunt bir kez başlar (rehber kapandığında).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const togglePause = () => {
    const sm = sim.current;
    if (!sm) return;
    if (pausedAt.current == null) {
      pausedAt.current = now();
      setPaused(true);
    } else {
      liveShift(sm, now() - pausedAt.current);
      pausedAt.current = null;
      setPaused(false);
    }
  };

  const press = (k: LiveInput) => {
    const sm = sim.current;
    if (!sm || pausedAt.current != null) return;
    liveStep(sm, now());
    liveInput(sm, k);
  };
  const { t, ring, counter, sx } = frame;
  const left = frame.left;
  const actor = (a: Actor) => {
    const ps = a === 'p' ? frame.p : frame.o;
    const face = a === 'p' ? 1 : -1;
    const X = (a === 'p' ? 70 : 130) + face * ps.x;
    const Y = FLOOR - HIP_H + ps.y;
    return (
      <G key={a}>
        <Ellipse cx={X} cy={FLOOR + 3} rx={18} ry={3.5} fill="#000" opacity={0.3} />
        <G transform={`translate(${X} ${Y}) scale(${face} 1) rotate(${ps.rot})`}>
          <Figure p={{ ...ps, rot: 0 }} look={(a === 'p' ? pLook : oLook) ?? DEFAULT_LOOK} kit={a === 'p' ? kit : BLUE} hasar={100 - (a === 'p' ? frame.pHp : frame.oHp)} />
        </G>
      </G>
    );
  };
  // Sahne, düğmelerden sonra kalan gerçek alana sığar (uzun çevirilerde düğmeler büyüse de skor tablosuna binmez)
  const stageW = Math.max(120, Math.min(W - 24, (mid.h || H - 330) * ASPECT, mid.w || W - 24));

  return (
    <Modal animationType="fade" onRequestClose={() => undefined}>
      <View style={lf.root}>
        <LinearGradient colors={['#0b0c10', '#050507']} style={StyleSheet.absoluteFill} />
        <Pressable onPress={togglePause} hitSlop={10} style={lf.pause}>
          <Text style={lf.pauseText}>{paused ? '▶' : 'II'}</Text>
        </Pressable>
        {/* Skor tablosu */}
        <View style={lf.hud}>
          <View style={{ flex: 1 }}>
            <Text style={[lf.name, { color: C.red }]} numberOfLines={1}>
              {fs.pAd.toLocaleUpperCase(LOC)}
            </Text>
            <Bar v={frame.pHp} color={frame.pHp < 35 ? C.orange : C.red} />
            <View style={{ height: 3 }} />
            <Bar v={frame.pSta} color={C.gold} />
          </View>
          <View style={lf.clock}>
            <Text style={lf.round}>R{fs.raunt}</Text>
            <Text style={lf.time}>
              {Math.floor(left / 60000)}:{String(Math.ceil((left % 60000) / 1000) % 60).padStart(2, '0')}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={[lf.name, { color: C.blue }]} numberOfLines={1}>
              {fs.oAd.toLocaleUpperCase(LOC)}
            </Text>
            <Bar v={frame.oHp} color={frame.oHp < 35 ? C.orange : C.blue} right />
            <View style={{ height: 3 }} />
            <Bar v={frame.oSta} color={C.gold} right />
          </View>
        </View>

        {/* Sahne */}
        <View style={lf.middle} onLayout={(e) => setMid({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height - 8 })}>
        <View style={[lf.stage, { width: stageW, height: stageW / ASPECT }]} pointerEvents="none">
          <ArenaBg />
          <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet" style={StyleSheet.absoluteFill}>
            <G transform={sx || frame.zoom !== 1 ? `translate(${sx} 0) translate(100 92) scale(${frame.zoom}) translate(-100 -92)` : undefined}>
              {actor('o')}
              {actor('p')}
              {frame.fx.map((f, i) => {
                const age = (t - f.t0) / 400;
                const r = (f.big ? 9 : 5) * (0.5 + age);
                return (
                  <G key={i} opacity={1 - age}>
                    {Array.from({ length: 8 }, (_, q) => {
                      const a = (q / 8) * Math.PI * 2;
                      return <Line key={q} x1={f.x + Math.cos(a) * r * 0.4} y1={f.y + Math.sin(a) * r * 0.4} x2={f.x + Math.cos(a) * r} y2={f.y + Math.sin(a) * r} stroke={f.big ? '#ffd23f' : '#fff'} strokeWidth={0.9} />;
                    })}
                    <Circle cx={f.x} cy={f.y} r={r * 0.3} fill={f.big ? '#ff5a2a' : '#fff'} />
                  </G>
                );
              })}
              {ring ? (
                <G>
                  <Circle cx={131} cy={30} r={ring.r} fill="none" stroke={ring.gold ? C.gold : '#ff4d5e'} strokeWidth={ring.gold ? 2.2 : 1.2} opacity={0.95} />
                  <Circle cx={131} cy={30} r={10} fill="none" stroke={ring.gold ? C.gold : '#ff4d5e'} strokeWidth={0.6} strokeDasharray="2,2" opacity={0.7} />
                </G>
              ) : frame.guard ? (
                <Circle cx={131} cy={30} r={12} fill="none" stroke="#9aa3b2" strokeWidth={1} opacity={0.8} />
              ) : null}
            </G>
          </Svg>
          {frame.flash > 0.01 ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: frame.flash }]} /> : null}
          {frame.icon ? <Text style={lf.icon}>{frame.icon}</Text> : null}
          {counter ? <Text style={lf.counter}>{L("KONTRA PENCERESİ!")}</Text> : null}
        </View>
        </View>
        {flash.node}
        {banner ? (
          <View style={lf.banner} pointerEvents="none">
            <Text style={lf.bannerText}>{banner}</Text>
          </View>
        ) : null}

        {/* Kilit mücadelesi: sıkılık çubuğu ve kalan süre */}
        {frame.kilit ? (
          <View style={lf.kilit} pointerEvents="none">
            <View style={lf.kilitHead}>
              <Text style={[lf.kilitTitle, { color: frame.kilit.by === 'p' ? C.gold : '#ff4d5e' }]}>
                🔒 {frame.kilit.ad.toLocaleUpperCase(LOC)}
              </Text>
              {frame.kilit.by === 'p' && frame.kilit.uyanik > 0 ? (
                <Text style={lf.uyanik}>{L("Rakip uyanık ×{0}", [frame.kilit.uyanik])}</Text>
              ) : null}
            </View>
            <View style={[lf.kilitBar, frame.kilit.uyari && lf.kilitBarWarn]}>
              <View style={[lf.kilitFill, { width: `${Math.round(frame.kilit.prog * 100)}%`, backgroundColor: frame.kilit.by === 'p' ? C.gold : '#ff4d5e' }]} />
              <Text style={lf.kilitTap}>TAP</Text>
            </View>
            <View style={lf.kilitTime}>
              <View style={{ width: `${Math.round(frame.kilit.left * 100)}%`, height: '100%', backgroundColor: '#ffffff55' }} />
            </View>
            <Text style={lf.kilitHint}>
              {frame.kilit.by === 'p' ? L("Bas ya da basılı tut. Çubuğun kenarı turuncu yanarsa bırakıp yeniden bas.") : L("Çubuk dolarsa tap atarsın! Bas ya da basılı tut, kurtul!")}
            </Text>
          </View>
        ) : null}

        {/* Kontroller: konuma göre değişir */}
        <View style={lf.controls}>
          {frame.kilit ? (
            <Pressable
              {...INSTANT}
              onPressIn={() => {
                press(frame.kilit!.by === 'p' ? 'sub' : 'kac');
                if (sim.current) liveHold(sim.current, true);
              }}
              onPressOut={() => {
                if (sim.current) liveHold(sim.current, false);
              }}
              style={({ pressed }) => {
                const col = frame.kilit!.by === 'p' ? C.gold : C.blue;
                return [lf.mash, { borderColor: col, backgroundColor: pressed ? col + '55' : '#0d0e12' }];
              }}
            >
              <Text style={[lf.mashText, { color: frame.kilit.by === 'p' ? C.gold : C.blue }]}>{frame.kilit.by === 'p' ? L("SIK!") : L("KURTUL!")}</Text>
            </Pressable>
          ) : null}
          {!frame.kilit && frame.pos === 'ustte' ? (
            <View style={lf.posRow}>
              <Text style={lf.posLabel}>{L("POZİSYON")}</Text>
              <View style={lf.posBar}>
                <View style={{ width: `${Math.round(frame.gpos * 100)}%`, height: '100%', backgroundColor: frame.gpos >= 0.45 ? '#b77dff' : '#6b5a85' }} />
                <View style={lf.posMark} />
              </View>
            </View>
          ) : null}
          {!frame.kilit && ozel && frame.pos === 'ayakta' ? (
            <Pressable {...INSTANT} onPressIn={() => press('ozel')} style={[lf.special, frame.special?.ready && lf.specialOn]}>
              <View style={[lf.specialFill, { width: `${Math.round((frame.special?.pct ?? 0) * 100)}%` }]} />
              <Text style={[lf.specialText, frame.special?.ready && { color: '#1f1605' }]} numberOfLines={1}>
                ⚡ {ozel.ad.toLocaleUpperCase(LOC)}
                {ozel.imza ? ' ★' : ''}
              </Text>
            </Pressable>
          ) : null}
          {frame.kilit ? null : BUTTONS[frame.pos].map((row, ri) => (
            <View key={`${frame.pos}${ri}`} style={lf.row}>
              {row.map(([k, label, col]) => (
                <Pressable key={k} {...INSTANT} onPressIn={() => press(k)} style={({ pressed }) => [lf.btn, ri === 1 && lf.btnBig, { borderColor: col }, pressed && { backgroundColor: col + '40' }, k === 'sub' && frame.pos === 'ustte' && frame.gpos < 0.45 && { opacity: 0.4 }]}>
                  <Text style={[lf.btnText, { color: col }, label().length > 8 && { fontSize: 13 }, label().length > 11 && { fontSize: 11 }]} numberOfLines={1}>
                    {label()}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
          <Text style={lf.hint}>
            {frame.kilit
              ? ''
              : frame.pos === 'ustte'
              ? L("🔒 ya da ⤴️ görünce KONTROL. Rakip yorulunca SUB dene.")
              : frame.pos === 'altta'
                ? L("🔒 görünce hemen KURTUL. 👊 gelirken GARD al.")
                : L("Halka altın olunca KAÇ (⬇️ takedown'a karşı da). DİREKT ve TEKME hazırlığı keser.")}
          </Text>
        </View>
        {paused ? (
          <View style={lf.overlay}>
            <Text style={lf.overlayTitle}>{L("DURAKLATILDI")}</Text>
            <Pressable onPress={togglePause} style={lf.overlayBtn}>
              <Text style={lf.overlayBtnText}>{L("Devam et")}</Text>
            </Pressable>
          </View>
        ) : null}
        {!started ? (
          <View style={lf.overlay}>
            <Text style={lf.tutIcon}>{TUTORIAL()[step].icon}</Text>
            <Text style={lf.overlayTitle}>{TUTORIAL()[step].baslik}</Text>
            <Text style={lf.tutText}>{TUTORIAL()[step].metin}</Text>
            <View style={lf.tutDots}>
              {TUTORIAL().map((_, i) => (
                <View key={i} style={[lf.tutDot, i === step && { backgroundColor: C.gold }]} />
              ))}
            </View>
            <Pressable
              onPress={() => {
                if (step < TUTORIAL().length - 1) setStep(step + 1);
                else {
                  setPref(TUTORIAL_KEY, '1');
                  setStarted(true);
                }
              }}
              style={lf.overlayBtn}
            >
              <Text style={lf.overlayBtnText}>{step < TUTORIAL().length - 1 ? L("Sonraki") : L("Anladım, dövüşelim!")}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const lf = StyleSheet.create({
  pause: { position: 'absolute', top: 8, right: 14, zIndex: 5, width: 30, height: 26, borderRadius: 6, borderWidth: 1, borderColor: '#2a2d34', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0e12' },
  pauseText: { color: C.dim, fontFamily: F.display, fontSize: 12 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center', padding: 28, zIndex: 10 },
  overlayTitle: { color: '#fff', fontFamily: F.display, fontSize: 30, letterSpacing: 1, textAlign: 'center', marginBottom: 10 },
  overlayBtn: { marginTop: 22, backgroundColor: C.gold, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  overlayBtnText: { color: '#1f1605', fontFamily: F.display, fontSize: 17, letterSpacing: 1 },
  tutIcon: { fontSize: 54, marginBottom: 8 },
  tutText: { color: '#d9dbe0', fontFamily: F.body, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  tutDots: { flexDirection: 'row', gap: 6, marginTop: 18 },
  tutDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#33363e' },
  special: { height: 40, borderRadius: 12, borderWidth: 2, borderColor: C.goldDeep, backgroundColor: '#14110a', justifyContent: 'center', overflow: 'hidden' },
  specialOn: { borderColor: C.gold, backgroundColor: C.gold },
  specialFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.gold + '33' },
  specialText: { color: C.gold, fontFamily: F.display, fontSize: 15, letterSpacing: 1, textAlign: 'center' },
  root: { flex: 1, paddingTop: 40, paddingHorizontal: 12, userSelect: 'none' } as object,
  hud: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#1c1f25' },
  name: { fontFamily: F.display, fontSize: 15, letterSpacing: 0.5, marginBottom: 4 },
  bar: { width: '100%', height: 8, borderRadius: 2, backgroundColor: '#ffffff14', overflow: 'hidden' },
  clock: { width: 64, alignItems: 'center', backgroundColor: '#000', borderRadius: 6, paddingVertical: 4, borderWidth: 1, borderColor: '#2a2d34' },
  round: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  time: { color: '#fff', fontFamily: F.display, fontSize: 22 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stage: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#22252c' },
  icon: { position: 'absolute', top: '4%', right: '22%', fontSize: 22 },
  counter: { position: 'absolute', top: '42%', alignSelf: 'center', color: '#111', backgroundColor: C.gold, fontFamily: F.display, fontSize: 16, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  banner: { position: 'absolute', top: '38%', left: 0, right: 0, alignItems: 'center' },
  kilit: { position: 'absolute', top: '22%', left: 24, right: 24, backgroundColor: 'rgba(5,5,7,0.88)', borderRadius: 14, borderWidth: 1, borderColor: '#2a2d34', padding: 14, alignItems: 'center', gap: 8 },
  kilitTitle: { fontFamily: F.display, fontSize: 22, letterSpacing: 1 },
  kilitHead: { alignItems: 'center', gap: 2 },
  kilitBarWarn: { borderWidth: 2, borderColor: C.orange },
  uyanik: { color: '#ff8a5c', fontFamily: F.display, fontSize: 11, letterSpacing: 1, borderWidth: 1, borderColor: '#ff8a5c66', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 1, overflow: 'hidden' },
  kilitBar: { width: '100%', height: 22, borderRadius: 11, backgroundColor: '#ffffff12', overflow: 'hidden', justifyContent: 'center' },
  kilitFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  kilitTap: { position: 'absolute', right: 10, color: '#ffffffaa', fontFamily: F.display, fontSize: 12, letterSpacing: 1 },
  kilitTime: { width: '100%', height: 4, borderRadius: 2, backgroundColor: '#ffffff12', overflow: 'hidden' },
  kilitHint: { color: C.dim, fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  mash: { borderWidth: 3, borderRadius: 18, paddingVertical: 34, alignItems: 'center' },
  mashText: { fontFamily: F.display, fontSize: 34, letterSpacing: 3 },
  posRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  posLabel: { color: '#b77dff', fontFamily: F.display, fontSize: 11, letterSpacing: 1 },
  posBar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#ffffff12', overflow: 'hidden' },
  posMark: { position: 'absolute', left: '45%', top: 0, bottom: 0, width: 2, backgroundColor: '#ffffff88' },
  bannerText: { color: '#fff', fontFamily: F.display, fontSize: 40, letterSpacing: 2, textShadowColor: '#000', textShadowRadius: 18, transform: [{ skewX: '-8deg' }], backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 18, paddingVertical: 2 },
  controls: { gap: 10, paddingBottom: 22 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, borderWidth: 2, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: '#0d0e12' },
  btnBig: { paddingVertical: 22 },
  btnText: { fontFamily: F.display, fontSize: 17, letterSpacing: 1, textAlign: 'center' },
  hint: { color: C.faint, fontFamily: F.body, fontSize: 11, textAlign: 'center' },
});
