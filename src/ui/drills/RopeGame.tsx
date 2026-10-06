// İp atlama: dövüşçü ipi çevirir; ip ayağının altına geldiği anda dokun ve zıpla. Her seans farklı tempoyla başlar,
// ortada "HIZLAN!" bölümü ve hızlı "çift geçiş"ler vardır. Kaçırırsan ipe takılırsın.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, G, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { sfx } from '../../audio';
import { playerKit } from '../../cosmetics';
import type { Appearance } from '../../engine/types';
import { buzz } from '../../haptics';
import { L } from '../../i18n';
import { DEFAULT_LOOK } from '../FighterAvatar';
import { Figure, HIP_H, joints, POSES, type Pose } from '../rig';
import { C, F } from '../theme';
import { avg, cm, INSTANT, judge, ND, now, Progress, rnd, useFlash } from './common';

type Beat = { at: number; tag?: string };

/** Seansın vuruş takvimi: rastgele taban tempo, hızlanma bölümü ve çift geçişler. */
function schedule(t0: number): Beat[] {
  const base = 500 + rnd() * 110;
  const out: Beat[] = [];
  let t = t0;
  const push = (gap: number, tag?: string) => {
    t += gap;
    out.push({ at: t, tag });
  };
  for (let i = 0; i < 5; i++) push(base);
  const fast = base * (0.76 + rnd() * 0.08);
  for (let i = 0; i < 6; i++) push(fast, i === 0 ? 'hizlan' : undefined);
  for (let i = 0; i < 2; i++) {
    push(base * 1.1, i === 0 ? 'cift' : undefined);
    push(base * 0.5);
  }
  for (let i = 0; i < 3; i++) push(base);
  return out;
}

// İp çevirme duruşu: eller kalçanın önünde, dirsekler bükük, ayaklar yakın
const ROPE: Pose = { ...POSES.stance, torso: 3, head: -2, aL1: 14, aL2: 38, aR1: 8, aR2: 40, lL1: 5, lL2: 8, lR1: -3, lR2: 10, x: 0, y: 0 };
const TUCK: Pose = { ...ROPE, lL1: 18, lL2: 40, lR1: 12, lR2: 44 };
const TRIP: Pose = { ...ROPE, torso: 16, head: 10, lL1: 22, lL2: 30, lR1: -14, lR2: 20, aL1: 40, aL2: 30, aR1: -6 };

const CX = 100;
const FLOOR = 112;

export function RopeGame({ onEnd, pLook }: { onEnd: (p: number) => void; pLook?: Appearance }) {
  const [kit] = useState(() => ({ ...playerKit(), bare: true }));
  const beats = useRef<Beat[]>([]);
  const judged = useRef<(number | null)[]>([]);
  const stray = useRef(0);
  const ended = useRef(false);
  const jumpAt = useRef(-1e9);
  const tripAt = useRef(-1e9);
  const [view, setView] = useState({ done: 0, total: 18, tag: '' as string, ph: 0, ang: Math.PI / 2, hop: 0, tripping: false });
  const flash = useFlash();

  useEffect(() => {
    const t0 = now() + 700;
    beats.current = schedule(t0);
    judged.current = beats.current.map(() => null);
    let raf = 0;
    let last = 0;
    let lastTag = '';
    const loop = () => {
      const t = now();
      const bs = beats.current;
      // Kaçırılan geçişler: ipe takıldı
      bs.forEach((b, i) => {
        if (judged.current[i] == null && t > b.at + 200) {
          judged.current[i] = 0;
          tripAt.current = t;
          flash.show({ puan: 0, metin: L("TAKILDIN"), renk: C.red });
          sfx('whoosh');
          buzz('hata');
        }
      });
      // Bölüm başlıkları
      const cur = bs.find((b) => b.at > t - 300 && b.tag);
      const tag = cur?.tag ?? '';
      if (tag && tag !== lastTag) {
        lastTag = tag;
        sfx('swell', 0.5);
      }
      const done = judged.current.filter((x) => x != null).length;
      if (!ND || t - last > 30) {
        last = t;
        // İp açısı: iki geçiş arasında tam tur; geçiş anında ip ayağın altında (π/2)
        const ni = bs.findIndex((b) => b.at >= t);
        const next = ni >= 0 ? bs[ni].at : (bs[bs.length - 1]?.at ?? t) + 600;
        const prev = ni > 0 ? bs[ni - 1].at : next - 600;
        const ph = Math.min(1, Math.max(0, (t - prev) / Math.max(1, next - prev)));
        // Zıplama: dokununca kısa sıçrama, takılınca sendeleme
        const sj = t - jumpAt.current;
        setView({
          done,
          total: bs.length,
          tag: cur && t > cur.at - 1400 ? cur.tag! : '',
          ph,
          ang: Math.PI / 2 + ph * Math.PI * 2,
          hop: sj >= 0 && sj < 260 ? Math.sin((sj / 260) * Math.PI) * 9 : 0,
          tripping: t - tripAt.current < 380,
        });
      }
      if (!ended.current && judged.current.every((x) => x != null)) {
        ended.current = true;
        setTimeout(() => onEnd(Math.max(0, avg(judged.current as number[]) - stray.current * 4)), 400);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // Oyun bir kez başlar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    if (ended.current) return;
    const t = now();
    jumpAt.current = t;
    const bs = beats.current;
    let best = -1;
    let bestD = 1e9;
    bs.forEach((b, i) => {
      if (judged.current[i] != null) return;
      const d = Math.abs(t - b.at);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best < 0 || bestD > 200) {
      stray.current++;
      flash.show({ puan: 0, metin: L("TEMPO DIŞI"), renk: C.orange });
      buzz('hata');
      return;
    }
    const j = judge(bestD, [75, 135, 200]);
    judged.current[best] = j.puan;
    flash.show(j);
    if (j.puan > 0) {
      sfx('tap');
      buzz('hafif');
    }
  };

  const { ph, ang, hop, tripping } = view;
  const pose = tripping ? TRIP : hop > 3 ? TUCK : ROPE;
  const hipY = FLOOR - HIP_H - hop;
  // İp iki elden çıkar (yandan görünüşte eller üst üste)
  const jt = joints(pose);
  const hand = { x: CX + jt.wrL.x, y: hipY + jt.wrL.y };
  const hand2 = { x: CX + jt.wrR.x, y: hipY + jt.wrR.y };
  const rx = 30;
  const ry = 50;
  const cy = hipY - 12;
  const tip = { x: CX + Math.cos(ang) * rx, y: cy + Math.sin(ang) * ry };
  const front = Math.cos(ang) > 0;
  const ctrl = { x: hand.x + (tip.x - hand.x) * 0.5 + Math.cos(ang) * 14, y: hand.y + (tip.y - hand.y) * 0.5 + Math.sin(ang) * 14 };
  const rope = `M${hand.x} ${hand.y} Q${ctrl.x} ${ctrl.y} ${tip.x} ${tip.y} Q${ctrl.x - 2} ${ctrl.y + 2} ${hand2.x} ${hand2.y}`;
  const ropeEl = (
    <G>
      <Path d={rope} stroke="#000" strokeOpacity={0.35} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <Path d={rope} stroke={C.gold} strokeWidth={1.3} fill="none" strokeLinecap="round" />
    </G>
  );

  return (
    <Pressable testID="drill-area" {...INSTANT} onPressIn={tap} style={cm.area}>
      <Progress done={view.done} total={view.total} />
      <View style={st.stage} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="40 20 120 104" preserveAspectRatio="xMidYMid meet">
          <Defs>
            <RadialGradient id="ropeSpot" cx="50%" cy="85%" r="60%">
              <Stop offset="0" stopColor="#fff3d6" stopOpacity={0.25} />
              <Stop offset="1" stopColor="#fff3d6" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={40} y={20} width={120} height={104} fill="url(#ropeSpot)" />
          {/* Salon zemini ve ip izi */}
          <Rect x={40} y={FLOOR + 2} width={120} height={20} fill="#15161b" />
          <Line x1={40} y1={FLOOR + 2} x2={160} y2={FLOOR + 2} stroke="#2c2f37" strokeWidth={0.8} />
          <Ellipse cx={CX} cy={FLOOR + 3} rx={16 - hop * 0.8} ry={2.6} fill="#000" opacity={0.45} />
          <Ellipse cx={CX} cy={cy} rx={rx} ry={ry} fill="none" stroke={C.gold} strokeOpacity={0.08} strokeWidth={1} />
          {/* İp gövdenin arkasındaysa önce, önündeyse sonra çizilir */}
          {!front ? ropeEl : null}
          <G transform={`translate(${CX} ${hipY})`}>
            <Figure p={pose} look={pLook ?? DEFAULT_LOOK} kit={kit} />
          </G>
          {front ? ropeEl : null}
          {/* Geçiş anı işareti: ip ayağa yaklaşırken parlar */}
          {ph > 0.82 || ph < 0.06 ? <Ellipse cx={CX} cy={FLOOR + 1} rx={10} ry={1.6} fill={C.gold} opacity={0.5} /> : null}
        </Svg>
      </View>
      {view.tag ? <Text style={st.tag}>{view.tag === 'hizlan' ? L("HIZLAN!") : L("ÇİFT GEÇİŞ!")}</Text> : null}
      {flash.node}
      <Text style={cm.hint}>{L("İp ayağının altına geldiği anda dokun ve zıpla")}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  stage: { position: 'absolute', left: 0, right: 0, top: 70, bottom: 60 },
  tag: { position: 'absolute', bottom: 92, alignSelf: 'center', color: '#111', backgroundColor: C.gold, fontFamily: F.display, fontSize: 18, letterSpacing: 1, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
});
