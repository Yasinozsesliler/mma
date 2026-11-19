// Dövüş gecesi açılışı: arena, dönen spotlar, foto flaşları; dövüşçü rampadan kafese yürür, yayın bandı (lower third)
// ismini verir; sonunda iki köşe karşı karşıya (VS). Büyük maçlarda tam anons, diğerlerinde kısa sürüm. Dokununca geçilir.
import { isFarewellFight } from '../engine/farewell';
import { fanLevel, SONGS, UNLOCKS, walkoutCrowd } from '../engine/fanClub';
import { isAway } from '../engine/worldMap';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgLinear, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { announce, stopAnnounce } from '../announcer';
import { playWalkout, sfx, walkoutSeconds } from '../audio';
import { playerKit, walkoutFxNow, walkoutNow } from '../cosmetics';
import { WalkoutFx } from './WalkoutFx';
import { currentOrg } from '../engine/character';
import { COUNTRIES, ORGS, WEIGHT_CLASSES } from '../engine/data';
import { oppRecord } from '../engine/opponents';
import { lookFor } from '../engine/tale';
import type { Appearance, GameState } from '../engine/types';
import { L, LOC } from '../i18n';
import { Logo, upName } from './components';
import { DEFAULT_LOOK } from './FighterAvatar';
import { Figure, HIP_H, lerpPose, POSES, type Kit, type Pose } from './rig';
import { FLAGS } from './StatusPanel';
import { Belt } from './Belt';
import { chants, crowdMood, moodLine, walkoutTier } from '../engine/walkout';
import { C, F } from './theme';
import { useLook } from '../lookPref';
import { Barricades, FrontWalker } from './WalkoutFront';
import { arenaOrgText, flagOf } from './NewCareer';
import { ArenaBackdrop } from './ArenaBackdrop';

type Card = { kicker: string; lines: string[]; name?: string; nick?: string; side?: 'p' | 'o'; ms: number; say?: string; vs?: boolean; /** Kemeri taşıyan şampiyon girişi */ belt?: boolean; /** Hakem talimatı: iki köşe karşı karşıya, VS yok */ yuzyuze?: boolean };

/** Spikerin okuyacağı isim: ad, "lakap", soyad. */
const spoken = (x: { ad: string; soyad: string; lakap?: string }) => [x.ad, x.lakap ? `"${x.lakap}"` : '', x.soyad].filter(Boolean).join(', ');

const BLUE_KIT: Kit = { shorts: '#1f4fbf', trim: '#ffffff', glove: '#1740a8' };

/** Bu dövüş için anons kartları (tam ya da kısa). */
function script(s: GameState): Card[] {
  const fs = s.pending.dovus!;
  const o = fs.opp;
  const f = s.fighter;
  const org = ORGS[currentOrg(s)];
  const pro = s.stage !== 'amator';
  const r = pro ? s.rekor : s.amator;
  const veda = isFarewellFight(s);
  const big = fs.unvanMaci || fs.anaMac || s.ezeli?.id === o.id || s.gecmis.length === 0 || veda;
  const pCard: Card = {
    kicker: big ? L("VE KIRMIZI KÖŞEDE…") : L("KIRMIZI KÖŞEDE…"),
    lines: [L("{0} galibiyet, {1} mağlubiyet", [r.g, r.m]), [FLAGS[f.uyruk], ...new Set([f.memleket, COUNTRIES[f.uyruk]?.ad].filter(Boolean))].filter(Boolean).join(' ')],
    nick: f.lakap,
    name: upName(`${f.ad} ${f.soyad}`, f.uyruk),
    side: 'p',
    ms: 4200,
    belt: s.sampiyon && !o.champion,
    say: s.sampiyon && big && !veda ? L("Ve kırmızı köşede! Hâlâ ve tartışmasız {0} sıklet şampiyonu… {1}!", [WEIGHT_CLASSES[f.siklet].ad, spoken(f)]) : veda ? L("Ve kırmızı köşede! Son kez… {0}!", [spoken(f)]) : !big ? L("Kırmızı köşede! {0}!", [spoken(f)]) : r.g + r.m === 0 ? L("Ve kırmızı köşede! İlk maçına çıkıyor… {0}!", [spoken(f)]) : L("Ve kırmızı köşede! {0} galibiyet, {1} mağlubiyet… {2}!", [r.g, r.m, spoken(f)]),
  };
  const crowd = walkoutCrowd(s, isAway(s, o.sehir));
  const fanCard: Card[] = crowd ? [{ kicker: L("TRİBÜNLER AYAKTA…"), lines: [crowd.baslik.toLocaleUpperCase(LOC), crowd.satirlar[crowd.satirlar.length - 1]], ms: 2400, say: crowd.soz }] : [];
  const kulup = s.kulup;
  if (kulup?.sarki != null && fanLevel(s) >= UNLOCKS.sarki) pCard.lines = [...pCard.lines, `🎵 ${SONGS()[kulup.sarki]}`];
  if (s.sampiyon && big) pCard.kicker = L("VE HÂLÂ ŞAMPİYON…");
  if (pro) pCard.lines = [...pCard.lines, moodLine(crowdMood(s, 'p'))];
  const tier = walkoutTier(s);
  const hakem: Card[] =
    tier >= 2 ? [{ kicker: L("HAKEM SON TALİMATLARI VERİYOR"), lines: [L("Kendinizi her an koruyun."), L("Eldivenlere dokunun… ve geri çekilin.")], ms: 2200, say: L("Kendinizi her an koruyun. Eldivenlere dokunun!"), yuzyuze: true }] : [];
  if (!big) return [...fanCard, pCard, { kicker: L("KURALLAR BELLİ. DÖVÜŞÜN!"), lines: [], ms: 1800, say: L("Kurallar belli. Dövüşün!"), vs: true }];
  const baslik = veda
    ? L("Veda maçı · {0} raunt", [fs.maxRaunt])
    : fs.unvanMaci
    ? L("{0} sıklet şampiyonluk maçı", [WEIGHT_CLASSES[f.siklet].ad])
    : s.ezeli?.id === o.id
      ? L("Ezeli rakipler yine karşı karşıya")
      : L("{0} sıklet · {1} raunt", [WEIGHT_CLASSES[f.siklet].ad, fs.maxRaunt]);
  return [
    { kicker: L("BAYANLAR VE BAYLAR…"), lines: [org.ad.toLocaleUpperCase(LOC), baslik], ms: 2600, say: L("Bayanlar ve baylar! {0}. {1}!", [org.ad, baslik.replace(/ · /g, ', ')]) },
    {
      kicker: o.champion ? L("MAVİ KÖŞEDE… ŞAMPİYON") : L("MAVİ KÖŞEDE…"),
      lines: [L("Rekor: {0}", [oppRecord(o)]), o.uyruk, moodLine(crowdMood(s, 'o'))],
      nick: o.lakap,
      name: upName(`${o.ad} ${o.soyad}`, o.uyruk),
      side: 'o',
      ms: 3200,
      belt: o.champion,
      say: o.champion ? L("Mavi köşede! {0} sıklet şampiyonu… {1}!", [WEIGHT_CLASSES[f.siklet].ad, spoken(o)]) : L("Mavi köşede! {0}!", [spoken(o)]),
    },
    ...fanCard,
    ...(veda
      ? [
          {
            kicker: L("BU GECE BİR VEDA VAR…"),
            lines: [L("{0} galibiyet · {1} kemer", [r.g, s.unvanlar.length]), L("{0} profesyonel maç, tek bir son", [r.g + r.m + r.b])],
            ms: 3400,
            say: L("Bayanlar ve baylar… bu gece bir savaşçı son kez kafese çıkıyor!"),
          },
        ]
      : []),
    pCard,
    ...hakem,
    { kicker: L("HAYDİ BAŞLAYALIM!"), lines: [], ms: 2000, say: L("Haydi başlayalım!"), vs: true },
  ];
}

// ---------- Arena ----------

const hash = (n: number) => {
  const x = Math.sin(n * 91.7 + 17.3) * 43758.5453;
  return x - Math.floor(x);
};
/** Tribün başları (sabit dizilim). */
const HEADS = Array.from({ length: 70 }, (_, i) => ({ u: hash(i), v: hash(i + 300), s: 0.7 + hash(i + 600) * 0.6, c: ['#15161b', '#1b1d24', '#121318', '#20222a'][i % 4] }));

function Arena({ w, h, color }: { w: number; h: number; color: string }) {
  const horizon = h * 0.36;
  const rampTop = w * 0.09;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="aGlow" cx="50%" cy="34%" r="60%">
          <Stop offset="0" stopColor={color} stopOpacity={0.28} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </RadialGradient>
        <SvgLinear id="aRamp" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1c1e25" />
          <Stop offset="1" stopColor="#0a0b0e" />
        </SvgLinear>
        <SvgLinear id="aEdge" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.2} />
          <Stop offset="1" stopColor={color} stopOpacity={0.9} />
        </SvgLinear>
        <RadialGradient id="aHaze" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.09} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill="#040406" />
      <Rect x={0} y={0} width={w} height={h} fill="url(#aGlow)" />
      {/* Uzakta kafes ve LED ekran */}
      <Rect x={w * 0.22} y={horizon - h * 0.16} width={w * 0.56} height={h * 0.05} rx={3} fill="#0d0e12" stroke={color} strokeOpacity={0.6} strokeWidth={1} />
      <Polygon
        points={[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `${w / 2 + Math.cos((i / 8) * Math.PI * 2 + Math.PI / 8) * w * 0.12},${horizon - 6 + Math.sin((i / 8) * Math.PI * 2 + Math.PI / 8) * h * 0.025}`).join(' ')}
        fill="#1a1c22"
        stroke="#3a3d47"
        strokeWidth={1.5}
      />
      {/* Tribünler: rampanın iki yanında karanlık siluetler, kenarlarında ışık */}
      {HEADS.map((p, i) => {
        const left = i % 2 === 0;
        const y = horizon + p.v * (h - horizon) * 0.92;
        const edge = w / 2 - rampTop - ((y - horizon) / (h - horizon)) * (w / 2 - rampTop - w * 0.14);
        const r = (3 + ((y - horizon) / (h - horizon)) * 11) * p.s;
        const span = Math.max(0, edge - r * 2.2);
        const x = left ? p.u * span : w - p.u * span;
        return (
          <G key={i}>
            <Ellipse cx={x} cy={y + r * 1.55} rx={r * 1.85} ry={r * 1.35} fill={color} opacity={0.1} />
            <Circle cx={x} cy={y - 0.8} r={r + 0.8} fill={color} opacity={0.14} />
            <Ellipse cx={x} cy={y + r * 1.7} rx={r * 1.8} ry={r * 1.3} fill="#060608" />
            <Circle cx={x} cy={y} r={r} fill="#07070a" />
          </G>
        );
      })}
      {/* Rampa (perspektif) */}
      <Polygon points={`${w / 2 - rampTop},${horizon} ${w / 2 + rampTop},${horizon} ${w * 0.86},${h} ${w * 0.14},${h}`} fill="url(#aRamp)" />
      <Polygon points={`${w / 2 - rampTop},${horizon} ${w / 2 - rampTop + 2},${horizon} ${w * 0.14 + 6},${h} ${w * 0.14},${h}`} fill="url(#aEdge)" />
      <Polygon points={`${w / 2 + rampTop - 2},${horizon} ${w / 2 + rampTop},${horizon} ${w * 0.86},${h} ${w * 0.86 - 6},${h}`} fill="url(#aEdge)" />
      <Ellipse cx={w / 2} cy={h * 0.55} rx={w * 0.6} ry={h * 0.2} fill="url(#aHaze)" />
    </Svg>
  );
}

/** Tepeden sarkan, sağa sola salınan spot. */
function Spot({ x, h, color, delay, wide }: { x: number; h: number; color: string; delay: number; wide: number }) {
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 2600, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a, delay]);
  const rot = a.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '16deg'] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -10, left: x - wide / 2, width: wide, height: h, transformOrigin: 'top', transform: [{ rotate: rot }] }}>
      <Svg width={wide} height={h}>
        <Defs>
          <SvgLinear id={`sp${delay}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.4} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </SvgLinear>
        </Defs>
        <Polygon points={`${wide / 2 - 6},0 ${wide / 2 + 6},0 ${wide},${h} 0,${h}`} fill={`url(#sp${delay})`} />
      </Svg>
    </Animated.View>
  );
}

/** Tribünlerde patlayan foto flaşları. */
function Flashes({ w, h, n = 10 }: { w: number; h: number; n?: number }) {
  const [vals] = useState(() => Array.from({ length: n }, () => new Animated.Value(0)));
  useEffect(() => {
    const loops = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(300 + hash(i + 40) * 2400),
          Animated.timing(v, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [vals]);
  return (
    <>
      {vals.map((v, i) => {
        const left = i % 2 === 0;
        const x = left ? hash(i + 7) * w * 0.34 : w - hash(i + 7) * w * 0.34;
        const y = h * 0.34 + hash(i + 77) * h * 0.45;
        return <Animated.View key={i} pointerEvents="none" style={[st.flash, { left: x - 7, top: y - 7, opacity: v }]} />;
      })}
    </>
  );
}

/** Rampanın iki yanında yükselen ateş sütunları (büyük maçlarda, oyuncu girerken). */
function Pyro({ w, h }: { w: number; h: number }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const burst = () => Animated.sequence([Animated.timing(v, { toValue: 1, duration: 160, useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 650, easing: Easing.in(Easing.quad), useNativeDriver: true })]);
    const a = Animated.sequence([burst(), Animated.delay(250), burst(), Animated.delay(900), burst()]);
    a.start();
    return () => a.stop();
  }, [v]);
  const colH = h * 0.32;
  const base = h * 0.62;
  return (
    <>
      {[0.16, 0.84].map((x) => (
        <Animated.View
          key={x}
          pointerEvents="none"
          style={{ position: 'absolute', left: w * x - 18, top: base - colH, width: 36, height: colH, opacity: v, transformOrigin: 'bottom', transform: [{ scaleY: v }] }}
        >
          <LinearGradient colors={['rgba(255,240,180,0)', 'rgba(255,170,60,0.85)', '#ffdf8a']} style={{ flex: 1, borderRadius: 18 }} />
        </Animated.View>
      ))}
    </>
  );
}

/** Tribünden yükselen tezahürat baloncukları. */
function Chants({ items, w, h, color }: { items: string[]; w: number; h: number; color: string }) {
  const [vals] = useState(() => items.map(() => new Animated.Value(0)));
  useEffect(() => {
    // Kart ekranda kaldıkça tezahürat sürer: her baloncuk kendi aralığıyla yeniden yükselir.
    const a = Animated.parallel(
      vals.map((v, i) =>
        Animated.sequence([
          Animated.delay(i * 260),
          Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 1900, easing: Easing.out(Easing.quad), useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }), Animated.delay(400 + hash(i + 33) * 1400)])),
        ]),
      ),
    );
    a.start();
    return () => a.stop();
  }, [vals]);
  return (
    <>
      {items.map((t, i) => {
        const left = i % 2 === 0;
        const x = left ? 8 + hash(i + 900) * w * 0.26 : w - 8 - w * 0.26 + hash(i + 900) * w * 0.26 - 70;
        const y = h * (0.5 + hash(i + 950) * 0.25);
        const v = vals[i];
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              st.chant,
              { left: Math.max(4, Math.min(w - 120, x)), top: y, borderColor: color, opacity: v.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -h * 0.14] }) }] },
            ]}
          >
            <Text style={st.chantT} numberOfLines={1}>
              {t}
            </Text>
          </Animated.View>
        );
      })}
    </>
  );
}

/** Şampiyon kemeri havaya kaldırır (hafifçe sallanarak). */
function RaisedBelt({ s, width }: { s: GameState; width: number }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View pointerEvents="none" style={{ alignItems: 'center', marginBottom: -width * 0.12, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) }] }}>
      <Belt org={currentOrg(s)} siklet={s.fighter.siklet} width={width} />
    </Animated.View>
  );
}

// ---------- Dövüşçü ----------

const WALK_A: Partial<Pose> = { lL1: 24, lL2: 8, lR1: -20, lR2: 26, aL1: -10, aL2: 40, aR1: 18, aR2: 40, torso: 4, head: 0 };
const WALK_B: Partial<Pose> = { lL1: -20, lL2: 26, lR1: 24, lR2: 8, aL1: 18, aL2: 40, aR1: -10, aR2: 40, torso: 4, head: 0 };

/** Yürüyen (ya da gelip duran) figür: yürürken bacaklar adım atar, gelince gard alır. */
function Walker({ look, kit, flip, walking, size }: { look: Appearance; kit: Kit; flip: boolean; walking: boolean; size: number }) {
  const [t, setT] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!walking) return;
    const t0 = Date.now();
    let last = 0;
    const tick = () => {
      const now = Date.now();
      if (now - last > 45) {
        last = now;
        setT((now - t0) / 1000);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => void (raf.current != null && cancelAnimationFrame(raf.current));
  }, [walking]);
  const ph = (Math.sin(t * 7) + 1) / 2;
  const base = POSES.stance;
  const p: Pose = walking ? lerpPose({ ...base, ...WALK_A }, { ...base, ...WALK_B }, ph) : base;
  const bob = walking ? Math.abs(Math.sin(t * 7)) * -1.5 : 0;
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 100 125">
      <Defs>
        <RadialGradient id="wsp" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={50} cy={117} rx={40} ry={8} fill="url(#wsp)" />
      <Ellipse cx={50} cy={118} rx={20} ry={3.2} fill="#000" opacity={0.6} />
      <G transform={`translate(50 ${118 - HIP_H * 1.1 + bob}) scale(${flip ? -1.1 : 1.1} 1.1)`}>
        <Figure p={p} look={look} kit={kit} />
      </G>
    </Svg>
  );
}

// ---------- Sahne ----------

export function WalkoutScene({ s, onDone: finish }: { s: GameState; onDone: () => void }) {
  const onDone = () => {
    stopAnnounce();
    finish();
  };
  const { width: W, height: Hh } = useWindowDimensions();
  const [cards] = useState(() => script(s));
  const [i, setI] = useState(0);
  const [fade] = useState(() => new Animated.Value(0));
  const [walk] = useState(() => new Animated.Value(0));
  const [band] = useState(() => new Animated.Value(0));
  const [slam] = useState(() => new Animated.Value(0));
  const [arrived, setArrived] = useState(-1);
  const [pKit] = useState(playerKit);
  const [fx] = useState(walkoutFxNow);
  const [tier] = useState(() => walkoutTier(s));
  const [crowd] = useState(() => ({ p: chants(s, 'p'), o: chants(s, 'o') }));
  const card = cards[i];
  const walking = !!card.side && arrived !== i;

  useEffect(() => {
    fade.setValue(0);
    walk.setValue(0);
    band.setValue(0);
    slam.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }).start();
    if (card.side) {
      Animated.timing(walk, { toValue: 1, duration: 2300, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => setArrived(i));
      Animated.timing(band, { toValue: 1, duration: 520, delay: 900, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }).start();
    } else {
      Animated.spring(slam, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
    }
    if (card.side === 'p') {
      const w = walkoutNow();
      if (w) playWalkout(w);
      else sfx('roar');
    } else if (card.side === 'o') sfx('swell', 0.6);
    else if (card.vs) sfx('bell');
    else sfx('swell', 0.4);
    const w = card.side === 'p' ? walkoutNow() : null;
    const ms = w ? Math.max(card.ms, Math.min(6000, walkoutSeconds(w) * 1000)) : card.ms;
    // Kart en az kendi süresi kadar ekranda kalır; spiker cümlesini bitirmeden sonrakine geçilmez.
    let alive = true;
    let t: ReturnType<typeof setTimeout> | undefined;
    const wait = new Promise<void>((r) => (t = setTimeout(r, ms)));
    void Promise.all([wait, card.say ? announce(card.say, 9000) : null]).then(() => {
      if (!alive) return;
      if (i + 1 < cards.length) setI(i + 1);
      else onDone();
    });
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const oLook = lookFor(s.pending.dovus!.opp);
  const pLook = s.fighter.gorunum ?? DEFAULT_LOOK;
  const look = card.side === 'p' ? pLook : oLook;
  const kit = card.side === 'p' ? pKit : BLUE_KIT;
  const color = card.belt ? C.gold : card.side === 'p' ? C.red : card.side === 'o' ? C.blue : C.gold;
  // Sahne gücü arttıkça daha çok spot (0: iki spot … 3: yedi spot)
  const spots = [0.25, 0.75, ...(tier >= 1 ? [0.5] : []), ...(tier >= 2 ? [0.08, 0.92] : []), ...(tier >= 3 ? [0.37, 0.63] : [])];
  const org = ORGS[currentOrg(s)];
  const figSize = Math.min(W * 0.62, 260);
  const yeni = useLook() === 'yeni';
  const flag = card.side === 'p' ? flagOf(s.fighter.uyruk) : card.side === 'o' ? flagOf(s.pending.dovus!.opp.uyruk) : '';

  return (
    <Modal transparent animationType="fade" onRequestClose={onDone}>
      <Pressable style={st.back} onPress={onDone}>
        <Arena w={W} h={Hh} color={color} />
        {yeni ? <ArenaBackdrop w={W} h={Hh} {...arenaOrgText(s)} dim={0.2} /> : null}
        {yeni && card.side ? <Barricades w={W} h={Hh} /> : null}
        {spots.map((x, k) => (
          <Spot key={x} x={W * x} h={Hh * 0.8} color={card.belt ? '#ffe3a3' : card.side === 'o' && k % 2 === 0 ? '#9ec5ff' : card.side === 'p' && k % 2 === 1 ? '#ffb3b8' : '#fff1d6'} delay={(k * 650) % 2600} wide={W * (tier >= 2 ? 0.42 : 0.5)} />
        ))}
        <Flashes key={`fl${tier}`} w={W} h={Hh} n={[5, 10, 16, 26][tier]} />
        {card.side === 'p' && tier >= 2 ? <Pyro key={`py${i}`} w={W} h={Hh} /> : null}
        {card.side ? <Chants key={`ch${i}`} items={crowd[card.side]} w={W} h={Hh} color={crowdMood(s, card.side) === 'yuh' ? C.red : color} /> : null}
        {/* Oyuncunun kozmetik giriş efekti (yürürken) */}
        {card.side === 'p' && fx ? <WalkoutFx kind={fx} w={W} h={Hh} /> : null}
        <Text style={[st.led, { top: Hh * 0.36 - Hh * 0.16 + 4, color }]} numberOfLines={1}>
          {org.kisa.toLocaleUpperCase(LOC)}
        </Text>

        {card.side ? (
          <Animated.View
            style={[
              st.fighter,
              {
                top: Hh * 0.3,
                opacity: fade,
                transform: [
                  { translateY: walk.interpolate({ inputRange: [0, 1], outputRange: [-Hh * 0.06, Hh * 0.08] }) },
                  { scale: walk.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) },
                ],
              },
            ]}
          >
            {card.belt ? <RaisedBelt s={s} width={figSize * 0.62} /> : null}
            {yeni ? (
              <FrontWalker look={look} kit={kit} walking={walking} size={Math.min(W * 0.5, 230)} seed={card.side === 'p' ? 3 : 7} />
            ) : (
              <Walker look={look} kit={kit} flip={card.side === 'o'} walking={walking} size={figSize} />
            )}
          </Animated.View>
        ) : card.vs || card.yuzyuze ? (
          <Animated.View style={[st.vsRow, { top: Hh * 0.3, opacity: fade }]}>
            <Walker look={pLook} kit={pKit} flip={false} walking={false} size={W * 0.44} />
            <Walker look={oLook} kit={BLUE_KIT} flip walking={false} size={W * 0.44} />
            {card.vs ? <Animated.Text style={[st.vs, { transform: [{ scale: slam.interpolate({ inputRange: [0, 1], outputRange: [2.6, 1] }) }, { skewX: '-10deg' }], opacity: slam }]}>VS</Animated.Text> : null}
          </Animated.View>
        ) : (
          <Animated.View style={[st.center, { top: Hh * 0.38, opacity: slam, transform: [{ scale: slam.interpolate({ inputRange: [0, 1], outputRange: [1.8, 1] }) }] }]}>
            <Logo size={110} />
          </Animated.View>
        )}

        {/* Yayın bandı / başlık */}
        {card.side && yeni ? (
          <Animated.View style={[nb.wrap, { opacity: band, transform: [{ translateX: band.interpolate({ inputRange: [0, 1], outputRange: [-W, 0] }) }] }]}>
            <Text style={[nb.kicker, { color }]}>{card.kicker}</Text>
            <View style={nb.row}>
              <View style={[nb.flag, { borderColor: color }]}>
                <Text style={nb.flagText}>{flag || '🏳️'}</Text>
              </View>
              <View style={nb.nameBox}>
                {card.nick ? <Text style={nb.nick} numberOfLines={1}>“{card.nick.toLocaleUpperCase(LOC)}”</Text> : null}
                <Text style={nb.name} numberOfLines={1} adjustsFontSizeToFit>
                  {card.name}
                </Text>
              </View>
            </View>
            <View style={nb.lines}>
              {card.lines.map((l) => (
                <Text key={l} style={nb.line} numberOfLines={1}>
                  {l}
                </Text>
              ))}
            </View>
          </Animated.View>
        ) : card.side ? (
          <Animated.View style={[st.band, { opacity: band, transform: [{ translateX: band.interpolate({ inputRange: [0, 1], outputRange: [-W, 0] }) }] }]}>
            <View style={[st.bandAccent, { backgroundColor: color }]} />
            <View style={st.bandBody}>
              <Text style={[st.kicker, { color }]}>{card.kicker}</Text>
              {card.nick ? <Text style={st.nick}>“{card.nick.toLocaleUpperCase(LOC)}”</Text> : null}
              {card.name ? (
                <Text style={[st.name, { fontSize: card.name.length > 20 ? 26 : card.name.length > 14 ? 32 : 38 }]} numberOfLines={1} adjustsFontSizeToFit>
                  {card.name}
                </Text>
              ) : null}
              <View style={st.bandLines}>
                {card.lines.map((l) => (
                  <Text key={l} style={st.bandLine}>
                    {l}
                  </Text>
                ))}
              </View>
            </View>
          </Animated.View>
        ) : (
          <Animated.View style={[st.title, { opacity: fade }]}>
            <Text style={[st.bigKicker, { color }]}>{card.kicker}</Text>
            {card.lines.map((l) => (
              <Text key={l} style={st.line}>
                {l}
              </Text>
            ))}
          </Animated.View>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={st.bottomFade} pointerEvents="none" />
        <Text style={st.skip}>{L("Geçmek için dokun")}</Text>
      </Pressable>
    </Modal>
  );
}

const nb = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, bottom: 70, gap: 0 },
  kicker: { fontFamily: F.display, fontSize: 13, letterSpacing: 3, marginBottom: 4, textShadowColor: '#000', textShadowRadius: 6 },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  flag: { width: 48, backgroundColor: 'rgba(8,9,12,0.92)', borderLeftWidth: 4, alignItems: 'center', justifyContent: 'center' },
  flagText: { fontSize: 24 },
  nameBox: { flex: 1, backgroundColor: 'rgba(28,30,36,0.94)', paddingHorizontal: 12, paddingVertical: 6, justifyContent: 'center' },
  nick: { color: C.gold, fontFamily: F.displayMed, fontSize: 13, letterSpacing: 0.5 },
  name: { color: '#fff', fontFamily: F.display, fontSize: 30, lineHeight: 34, letterSpacing: 0.5 },
  lines: { backgroundColor: 'rgba(8,9,12,0.88)', paddingHorizontal: 12, paddingVertical: 6, gap: 1 },
  line: { color: '#cfd2d9', fontFamily: F.semi, fontSize: 12.5 },
});

const st = StyleSheet.create({
  back: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  flash: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', shadowColor: '#fff', shadowOpacity: 1, shadowRadius: 10 },
  led: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontFamily: F.display, fontSize: 18, letterSpacing: 6, textShadowColor: '#000', textShadowRadius: 6 },
  fighter: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  vsRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' },
  vs: { position: 'absolute', alignSelf: 'center', top: '30%', color: C.gold, fontFamily: F.display, fontSize: 84, textShadowColor: '#000', textShadowRadius: 20 },
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  band: { position: 'absolute', left: -14, right: 24, bottom: 92, flexDirection: 'row', transform: [{ skewX: '-8deg' }] },
  bandAccent: { width: 10 },
  bandBody: { flex: 1, backgroundColor: 'rgba(8,9,12,0.92)', paddingVertical: 12, paddingLeft: 34, paddingRight: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  kicker: { fontFamily: F.display, fontSize: 14, letterSpacing: 3 },
  nick: { color: C.gold, fontFamily: F.displayMed, fontSize: 15, marginTop: 4 },
  name: { color: '#fff', fontFamily: F.display, letterSpacing: 0.5 },
  bandLines: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, marginTop: 2 },
  bandLine: { color: '#cfd2d9', fontFamily: F.semi, fontSize: 13 },
  title: { position: 'absolute', left: 16, right: 16, bottom: 110, alignItems: 'center' },
  bigKicker: { fontFamily: F.display, fontSize: 30, letterSpacing: 3, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 14, transform: [{ skewX: '-8deg' }] },
  line: { color: '#e4e6eb', fontFamily: F.semi, fontSize: 16, textAlign: 'center', marginTop: 4 },
  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 },
  chant: { position: 'absolute', backgroundColor: 'rgba(8,9,12,0.8)', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 160 },
  chantT: { color: '#fff', fontFamily: F.display, fontSize: 13, letterSpacing: 0.5 },
  skip: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', color: C.faint, fontFamily: F.semi, fontSize: 12 },
});
