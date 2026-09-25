// Kafes sahnesi: maç akışındaki her olay (yumruk, tekme, takedown, clinch, yer, submission, nakavt) iki dövüşçüyle canlandırılır.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G as SvgG, Line, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Appearance, FightState } from '../engine/types';
import { DEFAULT_LOOK, HAIR_COLORS, SKIN_TONES } from './FighterAvatar';
import { C, F, R } from './theme';

type Pose = 'stand' | 'punch' | 'kick' | 'clinch' | 'win' | 'down' | 'ground' | 'hurt';
type Side = 'p' | 'o';
type Ev = { tur: 'strike' | 'kick' | 'clinch' | 'ground' | 'sub' | 'rock' | 'ko' | 'round' | 'move'; kim: Side };

const H = 220;

// ---------- Dövüşçü figürü (sağa bakar; rakip aynalanır) ----------

function Figure({ look, pose, shorts, glove }: { look: Appearance; pose: Pose; shorts: string; glove: string }) {
  const skin = SKIN_TONES[look.ten] ?? SKIN_TONES[2];
  const hair = HAIR_COLORS[look.sacRenk] ?? HAIR_COLORS[0];
  const arms: Record<Pose, [number, number, number, number]> = {
    stand: [42, 34, 48, 28],
    punch: [42, 36, 62, 29],
    kick: [40, 30, 46, 24],
    clinch: [54, 30, 54, 38],
    win: [20, 2, 42, 2],
    down: [42, 34, 48, 28],
    ground: [50, 34, 56, 30],
    hurt: [38, 30, 44, 22],
  };
  const [rx, ry, lx, ly] = arms[pose];
  const kick = pose === 'kick';
  return (
    <Svg width={64} height={112} viewBox="0 0 64 112">
      {/* Bacaklar */}
      <Line x1={28} y1={66} x2={pose === 'hurt' ? 24 : 20} y2={106} stroke={skin} strokeWidth={8} strokeLinecap="round" />
      <Line x1={34} y1={66} x2={kick ? 62 : 42} y2={kick ? 50 : 106} stroke={skin} strokeWidth={8} strokeLinecap="round" />
      {/* Şort */}
      <Rect x={21} y={56} width={20} height={15} rx={3} fill={shorts} />
      {/* Gövde */}
      <Rect x={22} y={27} width={18} height={32} rx={7} fill={skin} />
      {look.dovme ? <Path d="M24 34 q4 4 0 9" stroke="#1d1d1d" strokeWidth={1.5} fill="none" opacity={0.6} /> : null}
      {/* Kollar ve eldivenler */}
      <Line x1={27} y1={31} x2={rx} y2={ry} stroke={skin} strokeWidth={6} strokeLinecap="round" />
      <Line x1={35} y1={31} x2={lx} y2={ly} stroke={skin} strokeWidth={6} strokeLinecap="round" />
      <Circle cx={rx} cy={ry} r={5.5} fill={glove} />
      <Circle cx={lx} cy={ly} r={5.5} fill={glove} />
      {/* Baş */}
      <Circle cx={32} cy={15} r={10} fill={skin} />
      {look.sac !== 'kel' ? <Path d={look.sac === 'mohawk' ? 'M29 4 h6 v6 h-6z' : look.sac === 'afro' ? 'M20 14 a12 12 0 0 1 24 0 z' : 'M22 13 a10 9 0 0 1 20 0 z'} fill={hair} /> : null}
      {look.sakal !== 'yok' ? <Path d="M25 19 q7 9 14 0" stroke={hair} strokeWidth={look.sakal === 'tam' ? 4 : 2} fill="none" /> : null}
      <Circle cx={37} cy={14} r={1.3} fill="#111" />
    </Svg>
  );
}

// ---------- Olay sınıflandırma ----------

function classify(line: string, fs: FightState): Ev {
  const t = line.toLocaleLowerCase('tr-TR');
  const pi = t.indexOf(fs.pAd.toLocaleLowerCase('tr-TR'));
  const oi = t.indexOf(fs.oAd.toLocaleLowerCase('tr-TR'));
  // Cümlenin öznesi: önce geçen isim. "Seni/sen" içeren cümlelerde saldıran rakiptir.
  let kim: Side = pi >= 0 && (oi < 0 || pi < oi) ? 'p' : oi >= 0 ? 'o' : /\bsen\b|seni|sana|attın|yaptın|vurdun|indirdin/.test(t) ? 'p' : 'p';
  if (oi >= 0 && /seni |sana |gözlerini açtığında|tap attın|yığıldın/.test(t)) kim = 'o';
  if (/^— \d+\. raunt/.test(t)) return { tur: 'round', kim };
  if (/nakavt|uyuttu|bilinçsiz|yere yığıl|ışıklar söndü|ko!|tko|hakem durdurdu|havlu/.test(t)) return { tur: 'ko', kim };
  if (/tap att|kilidi|boğma|armbar|kimura|giyotin|heel hook|kneebar|üçgen|arm-triangle|anakonda|d'arce|submission|🔒/.test(t)) return { tur: 'sub', kim };
  if (/sarsıl|sendeled|dizleri|bacakları titr|yere düştü|knockdown|yere gönderdi/.test(t)) return { tur: 'rock', kim };
  if (/yere indir|takedown|yerde|mount|ground|guard|üstte|sırtını al|suplex|yere çal|yere taşı/.test(t)) return { tur: 'ground', kim };
  if (/clinch|kafese daya|kafese yasl|dirsek|diz vur|thai/.test(t)) return { tur: 'clinch', kim };
  if (/tekme|kick/.test(t)) return { tur: 'kick', kim };
  if (/yumruk|jab|kroşe|aparkat|overhand|kombinasyon|isabet|vurdu|vuruş|sağ el|sol el|kontra|💥|🎯/.test(t)) return { tur: 'strike', kim };
  return { tur: 'move', kim };
}

// ---------- Sahne ----------

export function CageView({ fs, shown, pLook, oLook }: { fs: FightState; shown: number; pLook?: Appearance; oLook: Appearance }) {
  const [w, setW] = useState(340);
  const v = useRef({
    pX: new Animated.Value(0),
    oX: new Animated.Value(0),
    pY: new Animated.Value(0),
    oY: new Animated.Value(0),
    pR: new Animated.Value(0),
    oR: new Animated.Value(0),
    boom: new Animated.Value(0),
    shake: new Animated.Value(0),
    bob: new Animated.Value(0),
  }).current;
  const [pPose, setPPose] = useState<Pose>('stand');
  const [oPose, setOPose] = useState<Pose>('stand');
  const [boomAt, setBoomAt] = useState<{ side: Side; emoji: string } | null>(null);
  const [caption, setCaption] = useState('');
  const run = useRef<Animated.CompositeAnimation | null>(null);

  // Hafif zıplama (ayakta beklerken)
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(v.bob, { toValue: -3, duration: 380, useNativeDriver: true }), Animated.timing(v.bob, { toValue: 0, duration: 380, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [v.bob]);

  const gap = Math.max(60, w * 0.16); // merkezden uzaklık
  const t = (a: Animated.Value, to: number, ms = 220, e = Easing.out(Easing.cubic)) => Animated.timing(a, { toValue: to, duration: ms, easing: e, useNativeDriver: true });
  const seq = Animated.sequence;
  const par = Animated.parallel;
  const X = (s: Side) => (s === 'p' ? v.pX : v.oX);
  const Rot = (s: Side) => (s === 'p' ? v.pR : v.oR);
  const Y = (s: Side) => (s === 'p' ? v.pY : v.oY);
  const setPose = (s: Side, p: Pose) => (s === 'p' ? setPPose(p) : setOPose(p));
  const dir = (s: Side) => (s === 'p' ? 1 : -1);
  const other = (s: Side): Side => (s === 'p' ? 'o' : 'p');
  const boom = (side: Side, emoji: string) => {
    setBoomAt({ side, emoji });
    v.boom.setValue(0);
    return seq([t(v.boom, 1, 120), Animated.delay(250), t(v.boom, 0, 250)]);
  };
  const shake = (amp = 5) => seq([t(v.shake, amp, 40, Easing.linear), t(v.shake, -amp, 40, Easing.linear), t(v.shake, amp / 2, 40, Easing.linear), t(v.shake, 0, 40)]);
  const neutral = (ms = 400) => par([t(v.pX, 0, ms), t(v.oX, 0, ms), t(v.pY, 0, ms), t(v.oY, 0, ms), t(v.pR, 0, ms), t(v.oR, 0, ms)]);

  const play = (ev: Ev, finished: boolean) => {
    run.current?.stop();
    const a = ev.kim;
    const d = other(a);
    let anim: Animated.CompositeAnimation;
    switch (ev.tur) {
      case 'round':
        setPPose('stand');
        setOPose('stand');
        setCaption('');
        anim = neutral(500);
        break;
      case 'move':
        setPPose('stand');
        setOPose('stand');
        anim = par([t(v.pX, -10 + Math.random() * 20, 500), t(v.oX, -10 + Math.random() * 20, 500), t(v.pY, 0, 300), t(v.oY, 0, 300), t(v.pR, 0, 300), t(v.oR, 0, 300)]);
        break;
      case 'strike':
      case 'kick':
        setPose(d, 'stand');
        anim = seq([
          par([t(v.pY, 0, 150), t(v.oY, 0, 150), t(v.pR, 0, 150), t(v.oR, 0, 150)]),
          t(X(a), dir(a) * gap * 0.55, 160),
          par([boom(d, ev.tur === 'kick' ? '💥' : '👊'), seq([t(X(d), dir(a) * 10, 90), t(X(d), 0, 200)]), t(Rot(d), dir(a) * 8, 90)]),
          par([t(X(a), 0, 300), t(Rot(d), 0, 300)]),
        ]);
        setPose(a, ev.tur === 'kick' ? 'kick' : 'punch');
        setTimeout(() => setPose(a, 'stand'), 420);
        break;
      case 'clinch':
        setPose(a, 'clinch');
        setPose(d, 'clinch');
        anim = seq([par([t(v.pX, gap * 0.62, 350), t(v.oX, -gap * 0.62, 350), t(v.pY, 0, 200), t(v.oY, 0, 200)]), shake(3)]);
        break;
      case 'ground':
        setPose(a, 'ground');
        setPose(d, 'down');
        anim = seq([
          par([t(v.pX, gap * 0.55, 250), t(v.oX, -gap * 0.55, 250)]),
          par([t(Rot(d), dir(d) * -90, 300), t(Y(d), 30, 300), t(Rot(a), dir(a) * 70, 300), t(Y(a), 18, 300), shake(4)]),
        ]);
        break;
      case 'sub':
        setPose(a, 'ground');
        setPose(d, 'down');
        anim = seq([
          par([t(v.pX, gap * 0.6, 250), t(v.oX, -gap * 0.6, 250), t(Rot(d), dir(d) * -90, 300), t(Y(d), 30, 300), t(Rot(a), dir(a) * 70, 300), t(Y(a), 20, 300)]),
          boom(d, finished ? '🏳️' : '🔒'),
        ]);
        break;
      case 'rock':
        setPose(d, 'hurt');
        anim = seq([t(X(a), dir(a) * gap * 0.5, 150), par([boom(d, '💫'), shake(6)]), seq([t(Rot(d), dir(a) * 14, 120), t(Rot(d), dir(a) * -8, 160), t(Rot(d), dir(a) * 6, 160), t(Rot(d), 0, 160)]), t(X(a), 0, 300)]);
        break;
      case 'ko':
        setPose(a, 'punch');
        anim = seq([t(X(a), dir(a) * gap * 0.55, 140), par([boom(d, '💥'), shake(9)]), par([t(Rot(d), dir(a) * 90, 380, Easing.in(Easing.quad)), t(Y(d), 32, 380, Easing.bounce)]), t(X(a), dir(a) * -gap * 0.2, 400)]);
        setTimeout(() => {
          setPose(d, 'down');
          setPose(a, 'win');
        }, 700);
        break;
    }
    run.current = anim;
    anim.start();
  };

  // Her yeni satırda sahne oynar.
  const last = shown > 0 ? fs.log[shown - 1] : '';
  const done = fs.durum === 'bitti' && shown >= fs.log.length;
  useEffect(() => {
    if (!last) {
      play({ tur: 'round', kim: 'p' }, false);
      return;
    }
    const ev = classify(last, fs);
    play(ev, done);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, fs.raunt]);

  // Maç sonu: kazanan kollarını kaldırır. Raunt arası: köşeler.
  useEffect(() => {
    if (shown < fs.log.length) return;
    if (fs.durum === 'bitti' && fs.sonuc) {
      const k = fs.sonuc.kazanan;
      const bitirme = ['KO', 'TKO', 'SUB'].includes(fs.sonuc.yontem);
      setCaption(k === 'berabere' ? 'BERABERE' : `${k === 'p' ? fs.pAd : fs.oAd} KAZANDI`.toLocaleUpperCase('tr-TR'));
      if (k !== 'berabere') {
        const kaz: Side = k;
        setTimeout(() => {
          setPose(kaz, 'win');
          if (!bitirme) setPose(other(kaz), 'hurt');
          if (!bitirme) neutral(500).start();
          else par([t(X(kaz), 0, 500), t(Rot(kaz), 0, 300), t(Y(kaz), 0, 300)]).start();
        }, bitirme ? 1200 : 200);
      }
    } else if (fs.durum === 'rauntSonu') {
      setPPose('stand');
      setOPose('stand');
      setCaption(`${fs.raunt}. RAUNT BİTTİ`);
      par([t(v.pX, -gap * 0.9, 700), t(v.oX, gap * 0.9, 700), t(v.pY, 0, 300), t(v.oY, 0, 300), t(v.pR, 0, 300), t(v.oR, 0, 300)]).start();
    } else setCaption('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, fs.durum, fs.log.length]);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const baseP = w / 2 - gap - 32;
  const baseO = w / 2 + gap - 32;
  const floorY = H - 128;
  const rot = (a: Animated.Value) => a.interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] });
  const standing = pPose !== 'down' && pPose !== 'ground';
  const oStanding = oPose !== 'down' && oPose !== 'ground';
  const boomLeft = boomAt?.side === 'p' ? baseP + 20 : baseO + 20;

  return (
    <View onLayout={onLayout} style={cv.wrap}>
      <Animated.View style={{ transform: [{ translateX: v.shake }] }}>
        <LinearGradient colors={['#0a0a0d', '#101116', '#050506']} style={{ height: H }}>
          <Svg width={w} height={H} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="spot" cx="50%" cy="62%" r="55%">
                <Stop offset="0" stopColor="#ffffff" stopOpacity={0.22} />
                <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            {/* Arka kafes */}
            <Polygon points={`${w * 0.12},${H * 0.66} ${w * 0.22},${H * 0.2} ${w * 0.78},${H * 0.2} ${w * 0.88},${H * 0.66}`} fill="none" stroke="#2a2d34" strokeWidth={2} />
            {Array.from({ length: 13 }, (_, i) => {
              const x = w * 0.22 + (w * 0.56 * i) / 12;
              return <Line key={i} x1={x} y1={H * 0.2} x2={x} y2={H * 0.62} stroke="#1c1f25" strokeWidth={1} />;
            })}
            {Array.from({ length: 6 }, (_, i) => (
              <Line key={`h${i}`} x1={w * 0.2} y1={H * 0.24 + i * 14} x2={w * 0.8} y2={H * 0.24 + i * 14} stroke="#1a1c22" strokeWidth={1} />
            ))}
            {/* Zemin (kanvas) */}
            <Ellipse cx={w / 2} cy={H * 0.72} rx={w * 0.47} ry={H * 0.2} fill="#d9d9dc" opacity={0.9} />
            <Ellipse cx={w / 2} cy={H * 0.72} rx={w * 0.47} ry={H * 0.2} fill="url(#spot)" />
            <Ellipse cx={w / 2} cy={H * 0.72} rx={w * 0.12} ry={H * 0.05} fill="none" stroke={C.red} strokeWidth={2} opacity={0.7} />
            <SvgG opacity={0.5}>
              <Line x1={w * 0.2} y1={H * 0.72} x2={w * 0.35} y2={H * 0.72} stroke="#9a9aa0" strokeWidth={1} />
              <Line x1={w * 0.65} y1={H * 0.72} x2={w * 0.8} y2={H * 0.72} stroke="#9a9aa0" strokeWidth={1} />
            </SvgG>
            {/* Ön kafes direkleri */}
            <Line x1={w * 0.04} y1={H * 0.1} x2={w * 0.04} y2={H * 0.95} stroke="#3a3d45" strokeWidth={5} />
            <Line x1={w * 0.96} y1={H * 0.1} x2={w * 0.96} y2={H * 0.95} stroke="#3a3d45" strokeWidth={5} />
            <Line x1={w * 0.04} y1={H * 0.1} x2={w * 0.96} y2={H * 0.1} stroke="#2a2d34" strokeWidth={3} />
            {/* Köşe renkleri */}
            <Rect x={w * 0.04 - 4} y={H * 0.1} width={8} height={18} fill={C.red} />
            <Rect x={w * 0.96 - 4} y={H * 0.1} width={8} height={18} fill={C.blue} />
          </Svg>

          {/* Kırmızı köşe */}
          <Animated.View style={[cv.fighter, { left: baseP, top: floorY, zIndex: pPose === 'ground' ? 3 : 2, transform: [{ translateX: v.pX }, { translateY: Animated.add(v.pY, standing ? v.bob : 0) }, { rotate: rot(v.pR) }] }]}>
            <Figure look={pLook ?? DEFAULT_LOOK} pose={pPose} shorts={C.red} glove="#b8121f" />
          </Animated.View>
          {/* Mavi köşe (aynalı) */}
          <Animated.View style={[cv.fighter, { left: baseO, top: floorY, zIndex: oPose === 'ground' ? 3 : 2, transform: [{ translateX: v.oX }, { translateY: Animated.add(v.oY, oStanding ? v.bob : 0) }, { rotate: rot(v.oR) }, { scaleX: -1 }] }]}>
            <Figure look={oLook} pose={oPose} shorts={C.blue} glove="#1740a8" />
          </Animated.View>

          {boomAt ? (
            <Animated.Text style={[cv.boom, { left: boomLeft, top: floorY + 4, opacity: v.boom, transform: [{ scale: v.boom.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.4] }) }] }]}>{boomAt.emoji}</Animated.Text>
          ) : null}
          {caption ? (
            <View style={cv.caption}>
              <Text style={[cv.captionText, done && { color: C.gold }]}>{caption}</Text>
            </View>
          ) : null}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const cv = StyleSheet.create({
  wrap: { borderRadius: R + 2, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2d34', marginBottom: 10 },
  fighter: { position: 'absolute', width: 64, height: 112 },
  boom: { position: 'absolute', fontSize: 30 },
  caption: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center' },
  captionText: { color: '#fff', fontFamily: F.display, fontSize: 16, letterSpacing: 2, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 3, overflow: 'hidden' },
});
