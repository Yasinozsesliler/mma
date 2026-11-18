// Canlı dövüş ekranı: bir raunt gerçek zamanlı oynanır (motor: engine/liveFight.ts). Rakip ⚠️ ile saldırı hazırlar;
// küçülen halka vuruş anını gösterir. KAÇ ile sıyrıl ve kontra penceresinde vur, DİREKT/TEKME ile hazırlığı kes,
// GARD ile hasarı azalt. Raunt bitince sonuç dövüşe işlenir.
import { cageTintNow } from '../cosmetics';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient as SvgLinear, Path, Pattern, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { sfx } from '../audio';
import { playerKit } from '../cosmetics';
import { oppStatsOf } from '../engine/fight';
import { liveCreate, liveElapsed, liveHold, liveInput, livePos, liveResult, liveShift, liveStep, SPECIAL_COOLDOWN, type SpecialKind, type LiveEvent, type LiveInput, type LiveRoundResult, type LiveSim, WARN_MS } from '../engine/liveFight';
import type { Appearance, FightState } from '../engine/types';
import { buzz } from '../haptics';
import { L, LOC } from '../i18n';
import { INSTANT, useFlash } from './drills/common';
import { getPref, setPref } from '../prefs';
import { frameMeter, lowPerf, paintMs } from '../perfPref';
import { DEFAULT_LOOK } from './FighterAvatar';
import { Figure, HIP_H, lerpPose, POSES, type Pose, type PoseName } from './rig';
import { C, F } from './theme';
import { Icon, type IconName } from './components';
import { useLook } from '../lookPref';

type Actor = 'p' | 'o';
type Frame = { t: number; p: Pose; o: Pose; pHp: number; pSta: number; oHp: number; oSta: number; left: number; ring: { r: number; gold: boolean } | null; icon: string | null; pos: 'ayakta' | 'ustte' | 'altta'; special: { ready: boolean; pct: number } | null; kilit: { by: 'p' | 'o'; prog: number; left: number; ad: string; /** Rakip kıvranmak üzere: DİREN! */ uyari: boolean; /** Kaçırılan kilitlerle rakibin uyanıklığı */ uyanik: number } | null; gpos: number; guard: boolean; counter: boolean; fx: { x: number; y: number; t0: number; big: boolean }[]; sx: number; zoom: number; flash: number };
const BLUE = { shorts: '#1f4fbf', trim: '#ffffff', glove: '#1740a8' };
const P = (n: PoseName, ov: Partial<Pose> = {}): Pose => ({ ...POSES[n], ...ov });
type Btn = [LiveInput, () => string, string];
const PURPLE = '#b77dff';
/** Yeni görünüm: düğme ikonları */
/** Yeni görünüm: düğme altı kısa açıklama (konum:girdi). Değerler liveFight.ts'deki maliyet ve hasara göre. */
const PAD_SUB: Record<string, () => string> = {
  'ayakta:kac': () => L("Sıyrıl"),
  'ayakta:gard': () => L("Hasarı azalt"),
  'ayakta:indir': () => L("Yere götür"),
  'ayakta:jab': () => L("Hızlı · az nefes"),
  'ayakta:direkt': () => L("Güçlü"),
  'ayakta:tekme': () => L("En güçlü · yavaş"),
  'ustte:kalk': () => L("Ayağa kalk"),
  'ustte:gard': () => L("Pozisyonu tut"),
  'ustte:sub': () => L("Kilit dene"),
  'ustte:jab': () => L("Hızlı"),
  'ustte:direkt': () => L("Güçlü"),
  'altta:gard': () => L("Hasarı azalt"),
  'altta:sub': () => L("Kilit dene"),
  'altta:kac': () => L("Altından çık"),
};
const PAD_ICON: Partial<Record<LiveInput, IconName>> = { kac: 'run-fast', gard: 'shield-half-full', indir: 'arrow-down-bold', jab: 'flash', direkt: 'boxing-glove', tekme: 'karate', kalk: 'arrow-up-bold', sub: 'lock' };
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
/** Yeni görünüm: halkanın ortasındaki rozet ikonu (rakibin hazırladığı hamle) */
const RING_ICON: Record<string, IconName> = { '⬇️': 'arrow-down-bold', '🔒': 'lock', '⤴️': 'arrow-up-bold', '👊': 'hand-back-right', '⚠️': 'alert', '🛡️': 'shield-half-full' };
const TUTORIAL_KEY = 'yol_canli_rehber';
/** Rehberde görülen anlar: raunda sığmazsa kalanı sonraki rauntta sürer. */
const GUIDE_SEEN_KEY = 'yol_canli_rehber_adim';
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
  const tint = cageTintNow();
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
      {tint ? <Rect x={0} y={0} width={VB_W} height={VB_H} fill={tint[0]} opacity={0.1} /> : null}
    </Svg>
  );
});

/** Bitiriş anında yukarıdan ve aşağıdan kayan siyah sinema bantları. */
function Letterbox() {
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [a]);
  const h = a.interpolate({ inputRange: [0, 1], outputRange: ['0%', '11%'] });
  return (
    <>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: h, backgroundColor: '#000' }} />
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h, backgroundColor: '#000' }} />
    </>
  );
}

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

/** İlk canlı maçta rehberli raunt: oyun doğru anda durur, hoca ne yapılacağını söyler, oyuncu o düğmeye basınca devam eder. */
type GuideId = 'jab' | 'kac' | 'kontra' | 'indir' | 'yer' | 'son';
type Guide = { id: GuideId; text: string; target?: LiveInput };
const GUIDE_TEXT: Record<GuideId, () => string> = {
  jab: () => L("Önce mesafeyi ölç. JAB hızlı ve ucuz: bas bakalım!"),
  kac: () => L("Rakip saldırıya hazırlanıyor, halka ALTIN oldu! Şimdi KAÇ!"),
  kontra: () => L("Kaçtın! Kontra penceresi açık, kontra vuruşlar çift hasar yapar. Hemen DİREKT!"),
  indir: () => L("Güzel. Şimdi yere götür: İNDİR'e bas. Rakip ⬇️ ile dalarsa sen de KAÇ ile savun."),
  yer: () => L("Üsttesin! YUMRUK ile puan topla. Pozisyon çubuğu dolunca SUB dene."),
  son: () => L("Gerisi sende! Sarı çubuk nefesin: bitince vuruşların zayıflar. DİREKT ve TEKME rakibin hazırlığını keser."),
};

export function LiveFight({ fs, pLook, oLook, onEnd, ozel, band }: { fs: FightState; pLook?: Appearance; oLook: Appearance; onEnd: (r: LiveRoundResult) => void; ozel?: Special; /** Yeni görünüm yayın bandı: organizasyon, alt yazı, sıralamalar */ band?: { org: string; caption: string; pRank: string; oRank: string } }) {
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
  const punch = useRef({ t0: 0, zoom: 0, flash: 0, ms: 700 });
  /** Bitiriş anı: ağır çekim ve sinema bantları */
  const [cine, setCine] = useState(false);
  const [banner, setBanner] = useState<string | null>(() => L("{0}. RAUNT", [fs.raunt]));
  // İlk canlı maçta rehberli raunt (bir kez)
  const guideOn = useRef(getPref(TUTORIAL_KEY) !== '1');
  const guideSeen = useRef(new Set<GuideId>((getPref(GUIDE_SEEN_KEY) ?? '').split(',').filter(Boolean) as GuideId[]));
  const guideAt = useRef(0);
  const [guide, setGuide] = useState<Guide | null>(null);
  const yeni = useLook() === 'yeni';
  const low = lowPerf();
  const guideRef = useRef<Guide | null>(null);
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
    if (big) punch.current = { t0: now(), zoom: 0.06, flash: 0, ms: 700 };
  };

  const finishGuide = () => {
    guideOn.current = false;
    setPref(TUTORIAL_KEY, '1');
  };
  /** Rehber anı: oyun durur, hoca konuşur; hedef düğmeye (ya da "Anladım"a) basınca devam eder. */
  const freeze = (id: GuideId, target?: LiveInput) => {
    const sm = sim.current;
    if (!guideOn.current || guideSeen.current.has(id) || pausedAt.current != null || !sm || sm.kilit) return;
    // Hocanın söylediği düğme o an ekranda yoksa (konum değişti) bu an atlanır: oyuncu asla takılı kalmaz.
    if (target && !BUTTONS[livePos(sm)].flat().some(([k]) => k === target)) return;
    guideSeen.current.add(id);
    pausedAt.current = now();
    const g = { id, text: GUIDE_TEXT[id](), target };
    guideRef.current = g;
    setGuide(g);
    buzz('hafif');
  };
  const unfreeze = () => {
    const sm = sim.current;
    if (sm && pausedAt.current != null) liveShift(sm, now() - pausedAt.current);
    pausedAt.current = null;
    guideAt.current = now();
    if (guideRef.current?.id === 'son') finishGuide();
    guideRef.current = null;
    setGuide(null);
  };
  /** Rehberin zamanlamaya bağlı anları (her karede, simülasyon adımından önce). */
  const guideTick = (s: LiveSim, t: number) => {
    const seen = guideSeen.current;
    const since = t - guideAt.current;
    const pos = livePos(s);
    if (!seen.has('jab')) {
      if (t - s.start > 1600) freeze('jab', 'jab');
      return;
    }
    const o = s.o;
    const rem = o.state === 'windup' ? o.stateUntil - t : -1;
    if (!seen.has('kac') && pos === 'ayakta' && rem > 60 && rem < s.cfg.dodgeMs * 0.7 && o.attack !== 'td' && !o.feint) return freeze('kac', 'kac');
    if (!seen.has('indir') && pos === 'ayakta' && o.state !== 'windup' && since > 2500 && (seen.has('kontra') || since > 12000)) return freeze('indir', 'indir');
    if (seen.has('indir') && !seen.has('son') && since > 3500 && !s.kilit) freeze('son');
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
        freeze('kontra', 'direkt');
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
        if (top === 'p') setTimeout(() => ground.current === 'p' && freeze('yer', 'jab'), 900);
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
        punch.current = { t0: now(), zoom: 0.14, flash: 0.55, ms: 700 };
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
          // Ağır çekim: düşüş ve zafer pozu normalin üç katı sürede oynar
          seq(loser, [[P('reel', { x: -8 }), 450], [P('knockedOut', { x: -16 }), 1400]]);
          seq(loser === 'p' ? 'o' : 'p', [[P('stance'), 1200], [P('win', { x: 0 }), 1100]]);
          setBanner(loser === 'o' ? L("NAKAVT!") : L("NAKAVT OLDUN"));
          sfx('roar');
        }
        buzz('nakavt');
        shake.current = { t0: now(), amp: 6 };
        punch.current = sub ? { t0: now(), zoom: 0.18, flash: 0.5, ms: 1400 } : { t0: now(), zoom: 0.3, flash: 0.85, ms: 2600 };
        setCine(true);
        return;
      }
    }
  };

  useEffect(() => {
    const s = liveCreate(fs, oppStatsOf(fs), now(), undefined, ozel ? { kind: ozel.kind, imza: ozel.imza } : undefined);
    sim.current = s;
    sfx('bell');
    const t1 = setTimeout(() => setBanner(L("DÖVÜŞ!")), 700);
    const t2 = setTimeout(() => setBanner((b) => (b === L("DÖVÜŞ!") ? null : b)), 1400);
    let raf = 0;
    let last = 0;
    const meter = frameMeter();
    const loop = () => {
      const t = now();
      meter(t);
      if (pausedAt.current == null && guideOn.current && !s.over) guideTick(s, t);
      if (pausedAt.current != null) {
        raf = requestAnimationFrame(loop);
        return;
      }
      liveStep(s, t);
      while (seen.current < s.events.length) onEvent(s.events[seen.current++]);
      fx.current = fx.current.filter((f) => t - f.t0 < 400);
      const pm = paintMs();
      if (!pm || t - last > pm) {
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
          zoom: 1 + punch.current.zoom * Math.max(0, 1 - (t - punch.current.t0) / punch.current.ms) * Math.min(1, (t - punch.current.t0) / 80),
          flash: punch.current.flash * Math.max(0, 1 - (t - punch.current.t0) / 260),
          special: s.special ? { ready: t >= s.special.readyAt && livePos(s) === 'ayakta', pct: Math.min(1, 1 - (s.special.readyAt - t) / SPECIAL_COOLDOWN) } : null,
        });
      }
      const done = s.over || (t >= s.start && liveElapsed(s) >= s.dur);
      if (done && !ended.current) {
        ended.current = true;
        // Temel dersler (vur, kaç, yere götür) bitmediyse kalanı sonraki raunda kalır; en geç 2. raunt sonunda kapanır.
        if (guideOn.current) {
          const g = guideSeen.current;
          if ((g.has('kac') && g.has('indir')) || fs.raunt >= 2 || s.over) finishGuide();
          else setPref(GUIDE_SEEN_KEY, [...g].join(','));
        }
        if (!s.over) {
          setBanner(L("RAUNT BİTTİ"));
          sfx('bell2');
        }
        setTimeout(() => onEnd(liveResult(s)), s.over ? (s.over.yontem === 'SUB' ? 2400 : 3200) : 1300);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // Raunt bir kez başlar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePause = () => {
    const sm = sim.current;
    if (!sm || guideRef.current) return;
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
    if (!sm) return;
    // Rehber anında yalnızca hocanın söylediği düğme oyunu sürdürür.
    if (guideRef.current) {
      if (guideRef.current.target !== k) return;
      // Rehber anında söylenen hamle kesin uygulanır: az önceki vuruşun bekleme süresi engel olmaz.
      sm.p.busyUntil = 0;
      if (guideRef.current.id === 'kac') sm.kesinKac = true;
      unfreeze();
    } else if (pausedAt.current != null) return;
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
  // Hafif modda isabet kıvılcımı daha az çizgiyle çizilir
  const sparks = lowPerf() ? 4 : 8;
  const stageW = Math.max(120, Math.min(W - 24, (mid.h || H - 330) * ASPECT, mid.w || W - 24));

  return (
    <Modal animationType="fade" onRequestClose={() => undefined}>
      <View style={lf.root}>
        <LinearGradient colors={['#0b0c10', '#050507']} style={StyleSheet.absoluteFill} />
        <Pressable onPress={togglePause} hitSlop={10} style={lf.pause}>
          <Text style={lf.pauseText}>{paused ? '▶' : 'II'}</Text>
        </Pressable>
        {/* Skor tablosu */}
        {yeni ? (
          <View style={sb2.wrap}>
            <View style={sb2.bar}>
              <View style={sb2.side}>
                <View style={[sb2.rank, { backgroundColor: C.red }]}>
                  <Text style={sb2.rankText}>{band?.pRank || '–'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={sb2.name} numberOfLines={1}>
                    {fs.pAd.toLocaleUpperCase(LOC)}
                  </Text>
                  <View style={sb2.hpTrack}>
                    <View style={{ width: `${Math.max(0, frame.pHp)}%`, height: '100%', backgroundColor: frame.pHp < 35 ? C.orange : C.red }} />
                  </View>
                  <View style={sb2.staTrack}>
                    <View style={{ width: `${Math.max(0, frame.pSta)}%`, height: '100%', backgroundColor: C.gold }} />
                  </View>
                </View>
              </View>
              <View style={sb2.mid}>
                <Text style={sb2.org} numberOfLines={1}>
                  {band?.org ?? ''}
                </Text>
                <Text style={sb2.time}>{Math.floor(left / 60000)}:{String(Math.ceil((left % 60000) / 1000) % 60).padStart(2, '0')}</Text>
                <View style={sb2.round}>
                  <Text style={sb2.roundText}>R{fs.raunt}</Text>
                </View>
              </View>
              <View style={[sb2.side, { flexDirection: 'row-reverse' }]}>
                <View style={[sb2.rank, { backgroundColor: C.blue }]}>
                  <Text style={sb2.rankText}>{band?.oRank || '–'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
                  <Text style={[sb2.name, { textAlign: 'right' }]} numberOfLines={1}>
                    {fs.oAd.toLocaleUpperCase(LOC)}
                  </Text>
                  <View style={[sb2.hpTrack, { alignItems: 'flex-end' }]}>
                    <View style={{ width: `${Math.max(0, frame.oHp)}%`, height: '100%', backgroundColor: frame.oHp < 35 ? C.orange : C.blue }} />
                  </View>
                  <View style={[sb2.staTrack, { alignItems: 'flex-end' }]}>
                    <View style={{ width: `${Math.max(0, frame.oSta)}%`, height: '100%', backgroundColor: C.gold }} />
                  </View>
                </View>
              </View>
            </View>
            {band?.caption ? (
              <View style={sb2.capWrap}>
                <Text style={sb2.cap} numberOfLines={1}>
                  {band.caption} · {fs.raunt}/{fs.maxRaunt}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
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
        )}

        {/* Sahne */}
        <View style={lf.middle} onLayout={(e) => setMid({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height - 8 })}>
        <View style={[lf.stage, { width: stageW, height: stageW / ASPECT }]} pointerEvents="none">
          <ArenaBg />
          <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet" style={StyleSheet.absoluteFill}>
            {yeni ? (
              <Defs>
                <RadialGradient id="ringRed" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#ff4d5e" stopOpacity={0.55} />
                  <Stop offset="1" stopColor="#ff4d5e" stopOpacity={0.05} />
                </RadialGradient>
                <RadialGradient id="ringGold" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#ffd45a" stopOpacity={0.85} />
                  <Stop offset="1" stopColor="#f2c14e" stopOpacity={0.1} />
                </RadialGradient>
                <RadialGradient id="ringGuard" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#c3c8d1" stopOpacity={0.4} />
                  <Stop offset="1" stopColor="#c3c8d1" stopOpacity={0.04} />
                </RadialGradient>
              </Defs>
            ) : null}
            <G transform={sx || frame.zoom !== 1 ? `translate(${sx} 0) translate(100 92) scale(${frame.zoom}) translate(-100 -92)` : undefined}>
              {actor('o')}
              {actor('p')}
              {frame.fx.map((f, i) => {
                const age = (t - f.t0) / 400;
                const r = (f.big ? 9 : 5) * (0.5 + age);
                return (
                  <G key={i} opacity={1 - age}>
                    {Array.from({ length: sparks }, (_, q) => {
                      const a = (q / sparks) * Math.PI * 2;
                      return <Line key={q} x1={f.x + Math.cos(a) * r * 0.4} y1={f.y + Math.sin(a) * r * 0.4} x2={f.x + Math.cos(a) * r} y2={f.y + Math.sin(a) * r} stroke={f.big ? '#ffd23f' : '#fff'} strokeWidth={0.9} />;
                    })}
                    <Circle cx={f.x} cy={f.y} r={r * 0.3} fill={f.big ? '#ff5a2a' : '#fff'} />
                  </G>
                );
              })}
              {ring && yeni ? (
                <G>
                  {/* Nişangâh: parlayan hedef, dört çentik, ışıltılı küçülen halka; altın anda dalga */}
                  <Circle cx={131} cy={30} r={11.5} fill={ring.gold ? 'url(#ringGold)' : 'url(#ringRed)'} />
                  <Circle cx={131} cy={30} r={10} fill="none" stroke={ring.gold ? C.gold : '#ff4d5e'} strokeWidth={0.7} opacity={0.85} />
                  <Path d="M131 18.2 V21 M131 39 V41.8 M119.2 30 H122 M140 30 H142.8" stroke={ring.gold ? '#ffe7a6' : '#ff8a94'} strokeWidth={1} strokeLinecap="round" />
                  {low ? null : <Circle cx={131} cy={30} r={ring.r} fill="none" stroke={ring.gold ? C.gold : '#ff4d5e'} strokeWidth={ring.gold ? 6 : 4} opacity={0.22} />}
                  <Circle cx={131} cy={30} r={ring.r} fill="none" stroke={ring.gold ? '#ffe08a' : '#ff5a66'} strokeWidth={ring.gold ? 2.6 : 1.6} />
                  {ring.gold ? <Circle cx={131} cy={30} r={ring.r + 3.5 + (t % 300) / 60} fill="none" stroke={C.gold} strokeWidth={0.8} opacity={0.5 - (t % 300) / 700} /> : null}
                </G>
              ) : ring ? (
                <G>
                  <Circle cx={131} cy={30} r={ring.r} fill="none" stroke={ring.gold ? C.gold : '#ff4d5e'} strokeWidth={ring.gold ? 2.2 : 1.2} opacity={0.95} />
                  <Circle cx={131} cy={30} r={10} fill="none" stroke={ring.gold ? C.gold : '#ff4d5e'} strokeWidth={0.6} strokeDasharray="2,2" opacity={0.7} />
                </G>
              ) : frame.guard && yeni ? (
                <G>
                  <Circle cx={131} cy={30} r={12} fill="url(#ringGuard)" />
                  <Circle cx={131} cy={30} r={12} fill="none" stroke="#c3c8d1" strokeWidth={1.1} opacity={0.9} />
                </G>
              ) : frame.guard ? (
                <Circle cx={131} cy={30} r={12} fill="none" stroke="#9aa3b2" strokeWidth={1} opacity={0.8} />
              ) : null}
            </G>
          </Svg>
          {frame.flash > 0.01 ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: frame.flash }]} /> : null}
          {cine ? <Letterbox /> : null}
          {frame.icon && yeni ? (
            <View pointerEvents="none" style={[rb.wrap, { left: `${((sx + 100 + 31 * frame.zoom - 28) / 144) * 100}%`, top: `${((92 - 62 * frame.zoom - 4) / 128) * 100}%` }]}>
              <View style={[rb.badge, { borderColor: ring?.gold ? C.gold : ring ? '#ff5a66' : '#c3c8d1', backgroundColor: ring?.gold ? C.gold : 'rgba(8,9,12,0.88)' }]}>
                <Icon name={RING_ICON[frame.icon] ?? 'alert'} size={15} color={ring?.gold ? '#1f1605' : ring ? '#ff8a94' : '#e4e6eb'} />
              </View>
              {ring?.gold ? <Text style={rb.now}>{L("ŞİMDİ KAÇ!")}</Text> : null}
            </View>
          ) : frame.icon ? <Text style={lf.icon}>{frame.icon}</Text> : null}
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
                // Basılıyken düz renk dolgu + koyu yazı: yarı saydam dolgu telefonda koyu ve okunmaz görünüyordu
                return [lf.mash, { borderColor: col, backgroundColor: pressed ? col : '#0d0e12' }];
              }}
            >
              {({ pressed }) => (
                <Text style={[lf.mashText, { color: pressed ? '#111' : frame.kilit!.by === 'p' ? C.gold : C.blue }]}>{frame.kilit!.by === 'p' ? L("SIK!") : L("KURTUL!")}</Text>
              )}
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
            <Pressable {...INSTANT} onPressIn={() => press('ozel')} style={[lf.special, frame.special?.ready && lf.specialOn, yeni && np.special, yeni && frame.special?.ready && np.specialOn]}>
              {yeni && !frame.special?.ready ? (
                <LinearGradient colors={[C.goldDeep, C.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[lf.specialFill, { width: `${Math.round((frame.special?.pct ?? 0) * 100)}%`, opacity: 0.45 }]} />
              ) : (
                <View style={[lf.specialFill, { width: `${Math.round((frame.special?.pct ?? 0) * 100)}%` }]} />
              )}
              <Text style={[lf.specialText, frame.special?.ready && { color: '#1f1605' }]} numberOfLines={1}>
                ⚡ {ozel.ad.toLocaleUpperCase(LOC)}
                {ozel.imza ? ' ★' : ''}
              </Text>
            </Pressable>
          ) : null}
          {frame.kilit ? null : BUTTONS[frame.pos].map((row, ri) => (
            <View key={`${frame.pos}${ri}`} style={lf.row}>
              {row.map(([k, label, col]) => yeni ? (
                <Pressable
                  key={k}
                  {...INSTANT}
                  onPressIn={() => press(k)}
                  style={({ pressed }) => [np.btn, ri === 1 ? np.big : np.small, { borderColor: pressed ? col : col + '66' }, pressed && { backgroundColor: col, transform: [{ skewX: '-8deg' }, { scale: 0.96 }], shadowColor: col, shadowOpacity: 0.9, shadowRadius: 14 }, k === 'sub' && frame.pos === 'ustte' && frame.gpos < 0.45 && { opacity: 0.4 }, guide && (guide.target === k ? lf.btnGuide : lf.btnDim)]}
                >
                  {({ pressed }) => (
                    <>
                      {!pressed && !low ? (
                        <>
                          <LinearGradient colors={['#20232b', '#101217', '#07080a']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
                          <LinearGradient colors={['transparent', col + '55']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
                        </>
                      ) : null}
                      {pressed ? null : <View style={np.gloss} pointerEvents="none" />}
                      {pressed ? null : <View style={[np.edge, { backgroundColor: col }]} pointerEvents="none" />}
                      <View style={[np.inner, ri === 1 ? np.innerBig : np.innerSmall]}>
                        {PAD_ICON[k] ? (
                          <View style={[ri === 1 ? np.badgeBig : np.badge, { borderColor: pressed ? '#0b0c0f' : col, backgroundColor: pressed ? '#0b0c0f22' : col + '24' }]}>
                            <Icon name={PAD_ICON[k]!} size={ri === 1 ? 20 : 14} color={pressed ? '#0b0c0f' : col} />
                          </View>
                        ) : null}
                        <View style={{ alignItems: ri === 1 ? 'center' : 'flex-start', flexShrink: 1 }}>
                          <Text style={[ri === 1 ? np.textBig : np.text, { color: pressed ? '#0b0c0f' : '#f6f7f9' }, label().length > 8 && { fontSize: 12 }]} numberOfLines={1}>
                            {label()}
                          </Text>
                          {PAD_SUB[`${frame.pos}:${k}`] ? (
                            <Text style={[np.sub, { color: pressed ? '#0b0c0fcc' : col }]} numberOfLines={1}>
                              {PAD_SUB[`${frame.pos}:${k}`]!()}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </>
                  )}
                </Pressable>
              ) : (
                <Pressable key={k} {...INSTANT} onPressIn={() => press(k)} style={({ pressed }) => [lf.btn, ri === 1 && lf.btnBig, { borderColor: col }, pressed && { backgroundColor: col + '40' }, k === 'sub' && frame.pos === 'ustte' && frame.gpos < 0.45 && { opacity: 0.4 }, guide && (guide.target === k ? lf.btnGuide : lf.btnDim)]}>
                  <Text style={[lf.btnText, { color: col }, label().length > 8 && { fontSize: 13 }, label().length > 11 && { fontSize: 11 }]} numberOfLines={1}>
                    {label()}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
          <Text style={[lf.hint, yeni && np.hint]}>
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
        {guide ? (
          <View style={lf.guide} pointerEvents="box-none">
            <View style={lf.guideBox}>
              <Text style={lf.guideWho}>{L("🥋 HOCA")}</Text>
              <Text style={lf.guideText}>{guide.text}</Text>
              {guide.target ? (
                <Text style={lf.guideHint}>{L("👇 Parlayan düğmeye bas")}</Text>
              ) : (
                <Pressable onPress={unfreeze} style={lf.guideBtn}>
                  <Text style={lf.overlayBtnText}>{L("Anladım, dövüşelim!")}</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const rb = StyleSheet.create({
  wrap: { position: 'absolute', width: 0, height: 0, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  badge: { position: 'absolute', width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  now: { position: 'absolute', top: 40, width: 120, textAlign: 'center', color: C.gold, fontFamily: F.display, fontSize: 14, letterSpacing: 1.5, textShadowColor: '#000', textShadowRadius: 6 },
});

const sb2 = StyleSheet.create({
  wrap: { marginRight: 38, alignItems: 'stretch' },
  bar: { flexDirection: 'row', alignItems: 'stretch', height: 44, backgroundColor: 'rgba(10,11,14,0.94)', borderWidth: 1, borderColor: '#23262d', borderRadius: 3, overflow: 'hidden' },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4, minWidth: 0 },
  rank: { width: 20, height: 20, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#fff', fontFamily: F.black, fontSize: 10 },
  name: { color: '#f1f2f5', fontFamily: F.display, fontSize: 12.5, letterSpacing: 0.3, lineHeight: 16 },
  hpTrack: { alignSelf: 'stretch', height: 4, backgroundColor: '#ffffff14', marginTop: 2, overflow: 'hidden' },
  staTrack: { alignSelf: 'stretch', height: 2, backgroundColor: '#ffffff0f', marginTop: 2, overflow: 'hidden' },
  mid: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 6, backgroundColor: '#000', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#23262d' },
  org: { color: '#fff', fontFamily: F.display, fontSize: 13, fontStyle: 'italic', letterSpacing: 0.5, maxWidth: 58 },
  time: { color: '#fff', fontFamily: F.display, fontSize: 19, letterSpacing: 0.5 },
  round: { borderWidth: 1, borderColor: '#5b6170', borderRadius: 2, paddingHorizontal: 3, paddingVertical: 0 },
  roundText: { color: '#c3c8d1', fontFamily: F.black, fontSize: 9.5 },
  capWrap: { alignSelf: 'center', backgroundColor: 'rgba(10,11,14,0.9)', borderWidth: 1, borderTopWidth: 0, borderColor: '#23262d', paddingHorizontal: 10, paddingVertical: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  cap: { color: '#e4e6eb', fontFamily: F.black, fontSize: 9, letterSpacing: 1.4 },
});

const np = StyleSheet.create({
  btn: { flex: 1, borderWidth: 1.2, borderRadius: 6, backgroundColor: '#0b0c0f', overflow: 'hidden', transform: [{ skewX: '-8deg' }], shadowOffset: { width: 0, height: 0 } },
  small: { minHeight: 50 },
  big: { minHeight: 78 },
  inner: { flex: 1, transform: [{ skewX: '8deg' }], alignItems: 'center', justifyContent: 'center' },
  innerSmall: { flexDirection: 'row', gap: 8, paddingHorizontal: 8 },
  innerBig: { gap: 4, paddingVertical: 8 },
  gloss: { position: 'absolute', left: 0, right: 0, top: 0, height: '42%', backgroundColor: 'rgba(255,255,255,0.05)' },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, opacity: 0.9 },
  badge: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.2, alignItems: 'center', justifyContent: 'center' },
  badgeBig: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: F.display, fontSize: 14, letterSpacing: 1.2, lineHeight: 17 },
  textBig: { fontFamily: F.display, fontSize: 17, letterSpacing: 1.6, lineHeight: 20 },
  sub: { fontFamily: F.bold, fontSize: 8.5, letterSpacing: 0.6, opacity: 0.95 },
  special: { borderRadius: 6, height: 46, borderWidth: 1.5, transform: [{ skewX: '-8deg' }] },
  specialOn: { shadowColor: C.gold, shadowOpacity: 0.8, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
  hint: { alignSelf: 'center', backgroundColor: 'rgba(20,22,26,0.9)', borderWidth: 1, borderColor: '#2a2d34', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden', color: '#a3a9b5' },
});

const lf = StyleSheet.create({
  pause: { position: 'absolute', top: 8, right: 14, zIndex: 5, width: 30, height: 26, borderRadius: 6, borderWidth: 1, borderColor: '#2a2d34', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0e12' },
  pauseText: { color: C.dim, fontFamily: F.display, fontSize: 12 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center', padding: 28, zIndex: 10 },
  overlayTitle: { color: '#fff', fontFamily: F.display, fontSize: 30, letterSpacing: 1, textAlign: 'center', marginBottom: 10 },
  overlayBtn: { marginTop: 22, backgroundColor: C.gold, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  overlayBtnText: { color: '#1f1605', fontFamily: F.display, fontSize: 17, letterSpacing: 1 },
  // Oyun dururken balon skor tablosunun üstüne gelir: sahnedeki halka ve dövüşçüler görünür kalsın
  guide: { position: 'absolute', top: 6, left: 12, right: 12, alignItems: 'center', zIndex: 10 },
  guideBox: { width: '100%', backgroundColor: 'rgba(8,8,10,0.94)', borderRadius: 14, borderWidth: 1, borderColor: C.goldDeep, padding: 16, gap: 8 },
  guideWho: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5 },
  guideText: { color: '#fff', fontFamily: F.semi, fontSize: 16, lineHeight: 22 },
  guideHint: { color: C.gold, fontFamily: F.display, fontSize: 12, letterSpacing: 1, textAlign: 'center' },
  guideBtn: { marginTop: 6, backgroundColor: C.gold, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnGuide: { borderColor: C.gold, borderWidth: 3, backgroundColor: C.gold + '33' },
  btnDim: { opacity: 0.3 },
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
  kilitBarWarn: { borderColor: C.orange },
  uyanik: { color: '#ff8a5c', fontFamily: F.display, fontSize: 11, letterSpacing: 1, borderWidth: 1, borderColor: '#ff8a5c66', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 1, overflow: 'hidden' },
  // Kenar hep 2px (uyarıda yalnızca rengi değişir): Android'de kalınlığın değişmesi kırpılan dolguyu bozabiliyor
  kilitBar: { width: '100%', height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#1d1f25', overflow: 'hidden', justifyContent: 'center' },
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
