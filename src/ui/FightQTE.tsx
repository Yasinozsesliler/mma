// Dövüşün kritik anlarında elle oynanan kısa anlar (3–4 sn). Sonuç 0–1 performanstır; motor buna göre şansı ayarlar.
// BİTİR! / HEDEF SEÇ! / KONTRA!: rakibin üstünde yanan hedeflere vur. KAÇ! / ELLERİ KONTROL ET!: yön oku.
// SIK! / SARIL! / VUR! / KÖPRÜ!: güç çekişmesi, hızlı dokun.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { sfx } from '../audio';
import type { Appearance, CriticalKind } from '../engine/types';
import { buzz } from '../haptics';
import { L } from '../i18n';
import { Icon, SLANT } from './components';
import { avg, INSTANT, ND, now, rnd, useFlash, wait } from './drills/common';
import { DEFAULT_LOOK, FighterAvatar } from './FighterAvatar';
import { C, F } from './theme';

export type QteKind = 'combo' | 'kontrol' | 'kontra' | 'kac' | 'eller' | 'mash';
export interface QteSpec {
  kind: QteKind;
  title: string;
  sub: string;
  /** Güç çekişmesinde rakibin direnci (saniyede çubuktan düşürdüğü pay) */
  resist?: number;
}

/** Kritik an ve seçime göre elle oynanan an (yoksa null: seçim doğrudan çözülür). */
export function qteFor(kritik: CriticalKind, choice: number, resist = 0.3): QteSpec | null {
  if (kritik === 'rakipSersem') {
    if (choice === 0) return { kind: 'combo', title: L("BİTİR!"), sub: L("Yanan hedeflere hızla vur") };
    if (choice === 1) return { kind: 'kontrol', title: L("HEDEF SEÇ!"), sub: L("Açık veren yere temiz vur") };
    return { kind: 'mash', title: L("VUR!"), sub: L("Ground & pound: hızla dokun, hakem durdursun"), resist };
  }
  if (kritik === 'sarsildin') {
    if (choice === 0) return { kind: 'mash', title: L("SARIL!"), sub: L("Clinch'e yapış, bırakma: hızla dokun"), resist };
    if (choice === 1) return { kind: 'kac', title: L("KAÇ!"), sub: L("Yumruk hangi yandan geliyorsa diğer tarafa eğil") };
    return { kind: 'kontra', title: L("KONTRA!"), sub: L("Hedef yandığı an tek ve sert vur") };
  }
  if (kritik === 'subFirsat') return choice === 0 ? { kind: 'mash', title: L("SIK!"), sub: L("Kilidi sık, kaçmasına izin verme"), resist } : null;
  if (choice === 0) return { kind: 'eller', title: L("ELLERİ KONTROL ET!"), sub: L("Kolun hangi yandan zorlanıyorsa o tarafa dokun") };
  if (choice === 1) return { kind: 'mash', title: L("KÖPRÜ!"), sub: L("Patlayıcı köprü: hızla dokun ve sıyrıl"), resist };
  return null;
}

// ---------- Hedef vuruşu ----------

const SPOTS = [
  { x: -0.17, y: -0.1 },
  { x: 0.17, y: -0.1 },
  { x: 0, y: 0.04 },
  { x: -0.24, y: 0.3 },
  { x: 0.24, y: 0.3 },
  { x: 0, y: -0.26 },
];

function TargetGame({ n, win, firstDelay, look, onEnd }: { n: number; win: number; firstDelay: number; look?: Appearance; onEnd: (q: number) => void }) {
  const [size, setSize] = useState({ w: 320, h: 420 });
  const [cur, setCur] = useState<{ i: number; spot: number } | null>(null);
  const [ring] = useState(() => new Animated.Value(0));
  const [shake] = useState(() => new Animated.Value(0));
  const shownAt = useRef(0);
  const hit = useRef<number | null>(null);
  const alive = useRef(true);
  const flash = useFlash(20);

  useEffect(() => {
    const scores: number[] = [];
    const run = async () => {
      await wait(firstDelay);
      let last = -1;
      for (let i = 0; i < n && alive.current; i++) {
        let spot = Math.floor(rnd() * SPOTS.length);
        if (spot === last) spot = (spot + 1) % SPOTS.length;
        last = spot;
        hit.current = null;
        shownAt.current = now();
        setCur({ i, spot });
        ring.setValue(0);
        Animated.timing(ring, { toValue: 1, duration: win, easing: Easing.linear, useNativeDriver: ND }).start();
        while (alive.current && hit.current == null && now() - shownAt.current < win) await wait(16);
        const rt = hit.current;
        scores.push(rt == null ? 0 : 1 - 0.5 * (rt / win));
        setCur(null);
        if (rt == null) {
          flash.show({ puan: 0, metin: L("KAÇIRDIN"), renk: C.red });
          sfx('whoosh');
        }
        await wait(110);
      }
      if (alive.current) onEnd(avg(scores));
    };
    const t = setTimeout(() => void run(), 0);
    return () => {
      alive.current = false;
      clearTimeout(t);
    };
    // Oyun bir kez başlar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    if (!cur || hit.current != null) return;
    hit.current = now() - shownAt.current;
    const good = hit.current < win * 0.45;
    flash.show({ puan: 100, metin: good ? L("TAM İSABET!") : L("İSABET"), renk: good ? C.gold : C.green });
    sfx(good ? 'heavy' : 'punch');
    buzz(good ? 'guclu' : 'orta');
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 45, useNativeDriver: ND }),
      Animated.timing(shake, { toValue: -1, duration: 45, useNativeDriver: ND }),
      Animated.timing(shake, { toValue: 0, duration: 45, useNativeDriver: ND }),
    ]).start();
  };

  const S = Math.min(size.w * 0.78, 280);
  const cx = size.w / 2;
  const cy = size.h * 0.45;
  const p = cur ? SPOTS[cur.spot] : null;
  const R = 34;
  return (
    <View style={q.area} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Animated.View style={{ position: 'absolute', left: cx - S / 2, top: cy - S / 2, transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-10, 10] }) }] }}>
        <FighterAvatar look={look ?? DEFAULT_LOOK} size={S} ring={C.blue} />
      </Animated.View>
      {p ? (
        <View style={{ position: 'absolute', left: cx + p.x * S - R, top: cy + p.y * S - R, width: R * 2, height: R * 2 }}>
          <Pressable testID="qte-target" {...INSTANT} onPressIn={tap} style={q.target}>
            <Icon name="target" size={34} color="#fff" />
          </Pressable>
          <Animated.View
            pointerEvents="none"
            style={[q.ring, { transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] }) }], opacity: ring.interpolate({ inputRange: [0, 0.9, 1], outputRange: [1, 1, 0.3] }) }]}
          />
        </View>
      ) : null}
      {flash.node}
    </View>
  );
}

// ---------- Yön okuma (KAÇ! / ELLERİ KONTROL ET!) ----------

function SideGame({ n, win, block, onEnd }: { n: number; win: number; block: boolean; onEnd: (q: number) => void }) {
  const [side, setSide] = useState<'L' | 'R' | null>(null);
  const [fly] = useState(() => new Animated.Value(0));
  const [red] = useState(() => new Animated.Value(0));
  const shownAt = useRef(0);
  const answer = useRef<{ side: 'L' | 'R'; at: number } | null>(null);
  const alive = useRef(true);
  const flash = useFlash(20);

  useEffect(() => {
    const scores: number[] = [];
    const run = async () => {
      await wait(350);
      for (let i = 0; i < n && alive.current; i++) {
        const sd: 'L' | 'R' = rnd() < 0.5 ? 'L' : 'R';
        answer.current = null;
        shownAt.current = now();
        setSide(sd);
        fly.setValue(0);
        Animated.timing(fly, { toValue: 1, duration: win, easing: Easing.in(Easing.quad), useNativeDriver: ND }).start();
        while (alive.current && !answer.current && now() - shownAt.current < win) await wait(16);
        const a = answer.current as { side: 'L' | 'R'; at: number } | null;
        // Kaçışta yumruğun tersine, savunmada aynı tarafa dokunulur.
        const want = block ? sd : sd === 'L' ? 'R' : 'L';
        const ok = !!a && a.side === want;
        scores.push(ok ? 1 - 0.4 * (a!.at / win) : 0);
        if (ok) {
          flash.show({ puan: 100, metin: block ? L("KONTROL!") : L("KAÇTIN!"), renk: C.green });
          sfx('whoosh');
          buzz('hafif');
        } else {
          flash.show({ puan: 0, metin: block ? L("KOLUN GİTTİ") : L("YEDİN!"), renk: C.red });
          sfx('heavy');
          buzz('guclu');
          red.setValue(1);
          Animated.timing(red, { toValue: 0, duration: 380, useNativeDriver: ND }).start();
        }
        setSide(null);
        await wait(260);
      }
      if (alive.current) onEnd(avg(scores));
    };
    const t = setTimeout(() => void run(), 0);
    return () => {
      alive.current = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const press = (s: 'L' | 'R') => {
    if (!side || answer.current) return;
    answer.current = { side: s, at: now() - shownAt.current };
  };

  return (
    <View style={q.area}>
      <View style={q.halves}>
        {(['L', 'R'] as const).map((s) => (
          <Pressable key={s} testID={`qte-${s}`} {...INSTANT} onPressIn={() => press(s)} style={({ pressed }) => [q.half, pressed && { backgroundColor: '#ffffff12' }]}>
            <Icon name={s === 'L' ? 'chevron-double-left' : 'chevron-double-right'} size={40} color={C.faint} />
            <Text style={q.halfText}>{block ? (s === 'L' ? L("SOL KOL") : L("SAĞ KOL")) : s === 'L' ? L("SOLA EĞİL") : L("SAĞA EĞİL")}</Text>
          </Pressable>
        ))}
      </View>
      {side ? (
        <Animated.View
          pointerEvents="none"
          style={[
            q.incoming,
            side === 'L' ? { left: 14 } : { right: 14 },
            {
              transform: [
                { translateX: fly.interpolate({ inputRange: [0, 1], outputRange: side === 'L' ? [0, 95] : [0, -95] }) },
                { scale: fly.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.5] }) },
              ],
            },
          ]}
        >
          <Icon name={block ? 'hand-back-left' : 'boxing-glove'} size={80} color={block ? C.orange : C.red} />
          <Text style={q.incomingText}>{side === 'L' ? L("◀ SOLDAN") : L("SAĞDAN ▶")}</Text>
        </Animated.View>
      ) : null}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#ff0022', opacity: red.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) }]} />
      {flash.node}
    </View>
  );
}

// ---------- Güç çekişmesi (SIK! / SARIL! / VUR! / KÖPRÜ!) ----------

const MASH_MS = 3200;

function MashGame({ label, resist, onEnd }: { label: string; resist: number; onEnd: (q: number) => void }) {
  const v = useRef(0.42);
  const [view, setView] = useState({ v: 0.42, left: 1 });
  const [pulse] = useState(() => new Animated.Value(0));
  const done = useRef(false);

  useEffect(() => {
    const t0 = now();
    let last = t0;
    let raf = 0;
    const loop = () => {
      const t = now();
      v.current = Math.max(0, v.current - (resist * (t - last)) / 1000);
      last = t;
      const left = 1 - (t - t0) / MASH_MS;
      setView({ v: v.current, left: Math.max(0, left) });
      if (!done.current && (left <= 0 || v.current >= 1 || v.current <= 0)) {
        done.current = true;
        setTimeout(() => onEnd(Math.min(1, v.current)), 150);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    if (done.current) return;
    v.current = Math.min(1, v.current + 0.055);
    pulse.setValue(1);
    Animated.timing(pulse, { toValue: 0, duration: 140, useNativeDriver: ND }).start();
    sfx('tap', 0.6);
    buzz('hafif');
  };

  const pct = Math.round(view.v * 100);
  return (
    <Pressable testID="qte-mash" {...INSTANT} onPressIn={tap} style={q.area}>
      <View style={q.timer}>
        <View style={[q.timerFill, { width: `${view.left * 100}%` }]} />
      </View>
      <View style={q.tug}>
        <View style={[q.tugFill, { width: `${pct}%`, backgroundColor: view.v > 0.7 ? C.gold : view.v > 0.35 ? C.orange : C.red }]} />
        <View style={q.tugMark} />
      </View>
      <Text style={q.tugText}>{pct >= 100 ? L("TAMAM!") : `${pct}%`}</Text>
      <View style={q.center}>
        <Animated.View style={[q.mashBtn, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }) }] }]}>
          <Text style={[q.mashText, SLANT]}>{label}</Text>
          <Text style={q.mashSub}>{L("HIZLA DOKUN")}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

// ---------- Kabuk ----------

export function FightQTE({ spec, oLook, onDone }: { spec: QteSpec; oLook?: Appearance; onDone: (q: number) => void }) {
  const [phase, setPhase] = useState<'hazir' | 'oyun' | 'son'>('hazir');
  const [score, setScore] = useState(0);
  const [zoom] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(zoom, { toValue: 1, useNativeDriver: ND, speed: 18, bounciness: 12 }).start();
    sfx('swell', 0.7);
    buzz('orta');
    const t = setTimeout(() => setPhase('oyun'), 750);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const end = (qv: number) => {
    setScore(qv);
    setPhase('son');
    buzz(qv >= 0.66 ? 'basari' : qv >= 0.35 ? 'hafif' : 'hata');
    setTimeout(() => onDone(qv), 850);
  };

  const grade = score >= 0.8 ? { t: L("MÜKEMMEL!"), c: C.gold } : score >= 0.55 ? { t: L("İYİ!"), c: C.green } : score >= 0.3 ? { t: L("ZORLANDIN"), c: C.orange } : { t: L("OLMADI…"), c: C.red };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onDone(0.5)}>
      <View style={q.back}>
        <View style={q.box}>
          <View style={q.head}>
            <Animated.Text numberOfLines={1} adjustsFontSizeToFit style={[q.title, SLANT, spec.title.length > 10 && { fontSize: 28 }, { transform: [{ scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1.6, 1] }) }] }]}>{spec.title}</Animated.Text>
            {phase !== 'son' ? (
              <Pressable onPress={() => onDone(0.5)} hitSlop={8} style={q.auto}>
                <Text style={q.autoText}>{L("OTOMATİK")}</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={q.sub}>{spec.sub}</Text>
          {phase === 'hazir' ? (
            <View style={q.center}>
              <Icon name="lightning-bolt" size={90} color={C.gold} />
            </View>
          ) : phase === 'oyun' ? (
            spec.kind === 'combo' ? (
              <TargetGame n={5} win={720} firstDelay={150} look={oLook} onEnd={end} />
            ) : spec.kind === 'kontrol' ? (
              <TargetGame n={4} win={950} firstDelay={150} look={oLook} onEnd={end} />
            ) : spec.kind === 'kontra' ? (
              <TargetGame n={1} win={460} firstDelay={500 + rnd() * 700} look={oLook} onEnd={end} />
            ) : spec.kind === 'kac' ? (
              <SideGame n={5} win={720} block={false} onEnd={end} />
            ) : spec.kind === 'eller' ? (
              <SideGame n={5} win={800} block onEnd={end} />
            ) : (
              <MashGame label={spec.title} resist={spec.resist ?? 0.3} onEnd={end} />
            )
          ) : (
            <View style={q.center}>
              <Text style={[q.grade, SLANT, { color: grade.c }]}>{grade.t}</Text>
              <Text style={q.sub}>{L("Performans: %{0}", [Math.round(score * 100)])}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const q = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  box: { width: '100%', maxWidth: 520, height: '86%', maxHeight: 720, backgroundColor: '#0b0c10', borderRadius: 20, borderWidth: 2, borderColor: C.red, padding: 14, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, color: C.red, fontFamily: F.display, fontSize: 40, letterSpacing: 1 },
  sub: { color: C.dim, fontFamily: F.semi, fontSize: 13, textAlign: 'center' },
  auto: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  autoText: { color: C.faint, fontFamily: F.display, fontSize: 10, letterSpacing: 1 },
  area: { flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: '#07080a', userSelect: 'none' } as object,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  target: { flex: 1, borderRadius: 999, backgroundColor: '#e63946', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: C.red, shadowOpacity: 0.9, shadowRadius: 14 },
  ring: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: 999, borderWidth: 4, borderColor: C.gold },
  halves: { flex: 1, flexDirection: 'row' },
  half: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 26, gap: 6, borderWidth: 1, borderColor: '#ffffff0d' },
  halfText: { color: C.faint, fontFamily: F.display, fontSize: 14, letterSpacing: 1 },
  incoming: { position: 'absolute', top: '30%', alignItems: 'center', gap: 4 },
  incomingText: { color: '#fff', fontFamily: F.display, fontSize: 16 },
  timer: { height: 6, backgroundColor: '#23252c', margin: 12, borderRadius: 3, overflow: 'hidden' },
  timerFill: { height: '100%', backgroundColor: C.gold },
  tug: { height: 26, marginHorizontal: 18, marginTop: 18, backgroundColor: '#2a0b10', borderRadius: 13, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  tugFill: { height: '100%' },
  tugMark: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#fff' },
  tugText: { color: '#fff', fontFamily: F.display, fontSize: 22, textAlign: 'center', marginTop: 8 },
  mashBtn: { width: 190, height: 190, borderRadius: 95, backgroundColor: C.red, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: C.red, shadowOpacity: 0.9, shadowRadius: 22 },
  mashText: { color: '#fff', fontFamily: F.display, fontSize: 34 },
  mashSub: { color: '#ffffffcc', fontFamily: F.display, fontSize: 11, letterSpacing: 1.5 },
  grade: { fontFamily: F.display, fontSize: 52 },
});
