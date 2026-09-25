// Kafes sahnesi: eklemli dövüşçüler ve hakem, maç akışındaki her olayı koreografiyle canlandırır.
import { L as tL, LOC } from '../i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Polygon, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { Appearance, FightState } from '../engine/types';
import { DEFAULT_LOOK } from './FighterAvatar';
import { Figure, HIP_H, joints, lerpPose, POSES, type Pose, type PoseName } from './rig';
import { C, F, R } from './theme';

type Actor = 'p' | 'o' | 'r';
type Side = 'p' | 'o';
type Seg = [PoseName | Pose, number, Partial<Pose>?];
type Fx = { x: number; y: number; kind: 'hit' | 'big' | 'lock' | 'tap' | 'dust' | 'stars'; t0: number };

const H = 250;
const GAP = 72; // ayaktayken iki kalça arası (yerel birim)
const REF_LOOK: Appearance = { ten: 1, sac: 'kazik', sacRenk: 7, goz: 0, sakal: 'yok', yara: false, dovme: false };

const pose = (n: PoseName | Pose, ov?: Partial<Pose>): Pose => ({ ...(typeof n === 'string' ? POSES[n] : n), ...(ov ?? {}) });
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// ---------- Olay çözümleme ----------

type Ev = { tur: string; alt: string; kim: Side; miss: boolean; escape: boolean; tap: boolean };

function classify(line: string, fs: FightState): Ev {
  const t = line.toLocaleLowerCase(LOC);
  const pi = t.indexOf(fs.pAd.toLocaleLowerCase(LOC));
  const oi = t.indexOf(fs.oAd.toLocaleLowerCase(LOC));
  let kim: Side = pi >= 0 && (oi < 0 || pi < oi) ? 'p' : oi >= 0 ? 'o' : 'p';
  if (oi >= 0 && /seni |sana |gözlerini açtığında|tap attın|yığıldın|yakaladı seni|\byou |\byour |caught you|you tapped|you collapse|you open your eyes|\bte |\btu |abriste los ojos|te rendiste|te desplomaste/.test(t)) kim = 'o';
  const miss = /boşa|ıskal|savuştur|bloke|kaçtı|sıyrıl|okudu|savundu|kaçındı|miss|block|slip|dodge|parr|read it|defend|avoid|escape|sprawl|falló|bloque|esquiv|defendi|leyó|evit|escap/.test(t);
  const escape = /sıyrıl|kurtul|kilidinden çık|ayağa kalk|açıldı|kaçtı|escape|broke free|breaks free|got out|gets out|back up|to (his|her|their|your) feet|escap|se levant|zaf/.test(t);
  const tap = /tap att|tapped|taps out|se rindió|te rendiste/.test(t);
  const sub = /rnc|arkadan|sırtını al|rear-naked|the back|mataleón|la espalda/.test(t) ? 'rnc' : /üçgen|triangle|triángulo/.test(t) && !/arm-triangle/.test(t) ? 'triangle' : /giyotin|guillotine|guillotina|d'arce|anakonda|anaconda|arm-triangle/.test(t) ? 'guillotine' : 'armbar';
  const kick = /kafa(ya)? .*tekme|yüksek tekme|head kick|high kick|patada a la cabeza|patada alta/.test(t) ? 'headKick' : /bacağ|low kick|alçak|leg kick|calf|a la pierna/.test(t) ? 'lowKick' : 'bodyKick';
  const strike = /dönerek|spinning|giratori/.test(t) ? 'spin' : /aparkat|uppercut/.test(t) ? 'upper' : /kroşe|hook|gancho/.test(t) && !/heel hook/.test(t) ? 'hook' : /dirsek|elbow|codazo|codos/.test(t) ? 'elbow' : /jab/.test(t) ? 'jab' : /diz|knee|rodill/.test(t) ? 'knee' : 'cross';
  const E = (tur: string, alt = ''): Ev => ({ tur, alt, kim, miss, escape, tap });
  if (/^— \d+\. raunt|^— round \d+|^— asalto \d+/.test(t)) return E('round');
  if (/nakavt|uyuttu|bilinçsiz|yere yığıl|ışıklar söndü|hakem (araya|durdurdu|hemen)|havlu|tko|knockout|knocked out|to sleep|unconscious|lights (went|go) out|referee (jumps|steps|stops|waves)|towel|stoppage|nocaut|durmió|inconsciente|se apagaron las luces|árbitro (se lanza|intervien|lo detuvo)|toalla|tko/.test(t)) return E('ko', /tekme|kick|patada/.test(t) ? 'headKick' : strike);
  if (/tap att|kilidi|kilid|boğma|armbar|kimura|giyotin|heel hook|kneebar|üçgen|arm-triangle|anakonda|d'arce|submission|🔒|tapped|choke|guillotine|triangle|anaconda|lock|se rindió|llave|estrangula|guillotina|triángulo|palanca|mataleón/.test(t)) return E('sub', sub);
  if (/sarsıl|sendeled|bacakları titr|yere düştü|knockdown|yere gönderdi|dizleri|rocked|stagger|wobbl|legs shaking|dropped|goes down|went down|hurt|sacudido|tambale|le tiemblan|en la lona|derribado/.test(t)) return E('rock', /tekme|kick|patada/.test(t) ? 'headKick' : strike);
  if (/ground and pound|ground & pound|üstten|yerde (sert|vur|ağır)|mount|yağdır|from the top|on top|rains down|montada|desde arriba|llueve|lloviendo/.test(t)) return E('gnp');
  if (/yere indir|takedown|bacaklarına dal|seviye değiştir|suplex|yere çal|dalış|double-leg|single-leg|shoots|slam|to the mat|hip-toss|derrib|doble pierna|proyect|estrell|a la lona/.test(t)) return E('td');
  if (/yerde|guard|sırtüstü|yan kontrol|on the ground|side control|on their back|on the mat|en el suelo|control lateral|guardia/.test(t)) return E('gnp');
  if (/clinch|kafese daya|kafese yasl|ense|thai|against the cage|pins .* to the cage|contra la reja|clava/.test(t)) return E('clinch', /diz|knee|rodill/.test(t) ? 'knee' : /dirsek|elbow|codazo/.test(t) ? 'elbow' : '');
  if (/tekme|kick|patada/.test(t)) return E('kick', kick);
  if (/yumruk|jab|kroşe|aparkat|overhand|kombinasyon|isabet|vurdu|vuruş|sağ el|sol el|kontra|dirsek|💥|🎯|punch|hook|uppercut|cross|combo|combination|lands|right hand|left hand|counter|elbow|strike|landed|golpe|gancho|recto|combinación|conecta|derecha|izquierda|contragolpe|codazo/.test(t)) return E('strike', strike);
  return E('move');
}

// ---------- Sahne ----------

export function CageView({ fs, shown, pLook, oLook, speed = 1 }: { fs: FightState; shown: number; pLook?: Appearance; oLook: Appearance; speed?: number }) {
  const [w, setW] = useState(340);
  const k = Math.max(0.95, Math.min(1.3, w / 300));
  const cx = w / 2;
  const floorY = H * 0.84;
  const D = (GAP / 2) * k;

  const cur = useRef<Record<Actor, Pose>>({ p: POSES.stance, o: POSES.stance, r: POSES.refIdle });
  const face = useRef<Record<Actor, number>>({ p: 1, o: -1, r: 1 });
  const tracks = useRef<Partial<Record<Actor, { from: Pose; segs: { to: Pose; ms: number }[]; t0: number }>>>({});
  const fx = useRef<Fx[]>([]);
  const raf = useRef<number | null>(null);
  const [, setTick] = useState(0);
  const [caption, setCaption] = useState('');

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const loop = () => {
    const t = now();
    let active = false;
    (Object.keys(tracks.current) as Actor[]).forEach((a) => {
      const tr = tracks.current[a]!;
      let el = t - tr.t0;
      let from = tr.from;
      let done = true;
      for (const s of tr.segs) {
        if (el <= s.ms) {
          cur.current[a] = lerpPose(from, s.to, ease(Math.max(0, el / s.ms)));
          done = false;
          break;
        }
        el -= s.ms;
        from = s.to;
      }
      if (done) {
        cur.current[a] = tr.segs[tr.segs.length - 1].to;
        delete tracks.current[a];
      } else active = true;
    });
    fx.current = fx.current.filter((f) => t - f.t0 < 700);
    if (fx.current.length) active = true;
    setTick((n) => (n + 1) % 1e6);
    raf.current = active ? requestAnimationFrame(loop) : null;
  };
  const kick = () => {
    if (raf.current == null) raf.current = requestAnimationFrame(loop);
  };
  useEffect(() => () => void (raf.current != null && cancelAnimationFrame(raf.current)), []);

  const sp = 1 / Math.max(0.5, speed);
  const queue = (a: Actor, segs: Seg[]) => {
    tracks.current[a] = { from: { ...cur.current[a] }, segs: segs.map(([n, ms, ov]) => ({ to: pose(n, ov), ms: ms * sp })), t0: now() };
    kick();
  };

  // Dünya koordinatı: aktörün yerel noktası (kalçaya göre)
  const baseX = (a: Actor) => (a === 'p' ? cx - D : a === 'o' ? cx + D : cx);
  const world = (a: Actor, lp: { x: number; y: number }) => {
    const ps = cur.current[a];
    const f = face.current[a];
    const r = (ps.rot * Math.PI) / 180;
    const rx = lp.x * Math.cos(r) - lp.y * Math.sin(r);
    const ry = lp.x * Math.sin(r) + lp.y * Math.cos(r);
    return { x: baseX(a) + f * k * (ps.x + rx), y: floorY - HIP_H * k + k * (ps.y + ry) };
  };
  const hitAt = (a: Actor, part: 'head' | 'body' | 'leg', kind: Fx['kind'], delay: number) => {
    setTimeout(() => {
      const j = joints(cur.current[a]);
      const lp = part === 'head' ? j.head : part === 'body' ? { x: (j.neck.x + j.pelvis.x) / 2, y: (j.neck.y + j.pelvis.y) / 2 } : j.knL;
      fx.current.push({ ...world(a, lp), kind, t0: now() });
      kick();
    }, delay * sp);
  };

  const other = (s: Side): Side => (s === 'p' ? 'o' : 'p');
  const idleAfter = (a: Actor, ms: number) =>
    setTimeout(() => {
      if (!tracks.current[a] && (cur.current[a] === POSES.stance || Math.abs(cur.current[a].rot) < 1)) queue(a, [['stance', 260, { y: 1.5 }], ['stance', 260]]);
    }, ms * sp);

  const play = (ev: Ev, bitti: boolean) => {
    const A = ev.kim;
    const Dd = other(A);
    const reach = GAP - 40;
    face.current.p = 1;
    face.current.o = -1;
    switch (ev.tur) {
      case 'round':
        setCaption('');
        queue('p', [['stance', 300], ['touch', 350, { x: GAP / 2 - 24 }], ['touch', 150, { x: GAP / 2 - 24 }], ['stance', 350]]);
        queue('o', [['stance', 300], ['touch', 350, { x: GAP / 2 - 24 }], ['touch', 150, { x: GAP / 2 - 24 }], ['stance', 350]]);
        queue('r', [['refSeparate', 350], ['refSeparate', 300], ['refIdle', 400, { y: -6 }]]);
        return;
      case 'move':
        queue('p', [['stance', 400, { x: 4 - Math.random() * 10 }], ['stance', 300, { y: 1 }]]);
        queue('o', [['stance', 400, { x: 4 - Math.random() * 10 }], ['stance', 300, { y: 1 }]]);
        return;
      case 'strike': {
        const alt = ev.alt as PoseName;
        queue(A, [['stance', 170, { x: reach }], [alt, 130, { x: reach + 4 }], ['stance', 170, { x: reach }], ['stance', 320]]);
        if (ev.miss) queue(Dd, [['stance', 250], ['stance', 150, { torso: -16, head: -10, x: -8 }], ['stance', 300]]);
        else {
          queue(Dd, [['stance', 290], ['stance', 110, { torso: -10, head: alt === 'upper' ? -30 : -18, x: -6 }], ['stance', 300]]);
          hitAt(Dd, 'head', 'hit', 300);
        }
        idleAfter(A, 900);
        return;
      }
      case 'kick': {
        const alt = ev.alt as PoseName;
        queue(A, [['stance', 170, { x: reach - 4 }], [alt, 170, { x: reach - 2 }], ['stance', 200, { x: reach - 4 }], ['stance', 300]]);
        if (ev.miss) queue(Dd, [['stance', 250], ['stance', 150, { x: -12, torso: -10 }], ['stance', 300]]);
        else {
          queue(Dd, [['stance', 330], alt === 'lowKick' ? ['stance', 130, { lL2: 45, y: 4 }] : ['hurt', 130, { x: -6 }], ['stance', 320]]);
          hitAt(Dd, alt === 'headKick' ? 'head' : alt === 'lowKick' ? 'leg' : 'body', alt === 'headKick' ? 'big' : 'hit', 340);
        }
        return;
      }
      case 'clinch': {
        const cl = GAP / 2 - 12;
        const segs: Seg[] = [['clinch', 320, { x: cl }]];
        if (ev.alt === 'knee') segs.push(['knee', 150, { x: cl + 2 }], ['clinch', 150, { x: cl }], ['knee', 150, { x: cl + 2 }], ['clinch', 150, { x: cl }]);
        else if (ev.alt === 'elbow') segs.push(['elbow', 160, { x: cl + 4 }], ['clinch', 180, { x: cl }]);
        else segs.push(['clinch', 250, { x: cl + 6 }], ['clinch', 250, { x: cl + 2 }]);
        queue(A, segs);
        queue(Dd, [['clinchHeld', 320, { x: cl - 6 }], ['clinchHeld', 250, { x: cl - 10, y: 2 }], ['clinchHeld', 350, { x: cl - 8 }]]);
        if (ev.alt) {
          hitAt(Dd, ev.alt === 'knee' ? 'body' : 'head', 'hit', 470);
          if (ev.alt === 'knee') hitAt(Dd, 'body', 'hit', 770);
        }
        return;
      }
      case 'td':
        if (ev.miss) {
          queue(A, [['stance', 150, { x: 8 }], ['shot', 260, { x: GAP - 44 }], ['sprawl', 250, { x: GAP - 46 }], ['stance', 400]]);
          queue(Dd, [['stance', 260], ['sprawl', 220, { x: 6 }], ['stance', 400]]);
          return;
        }
        queue(A, [['stance', 150, { x: 10 }], ['shot', 260, { x: GAP - 36 }], ['kneelTop', 320, { x: GAP - 30 }]]);
        queue(Dd, [['stance', 300], ['reel', 140, { x: -4 }], ['onBack', 300, { x: -12 }]]);
        hitAt(Dd, 'body', 'dust', 700);
        return;
      case 'gnp':
        if (cur.current[Dd].rot > -60) {
          queue(Dd, [['onBack', 350, { x: -12 }]]);
          queue(A, [['kneelTop', 350, { x: GAP - 30 }], ['gnp', 150, { x: GAP - 30 }], ['gnpHit', 110, { x: GAP - 28 }], ['kneelTop', 250, { x: GAP - 30 }]]);
          hitAt(Dd, 'head', 'hit', 620);
          return;
        }
        queue(A, [['gnp', 150, { x: GAP - 30 }], ['gnpHit', 110, { x: GAP - 28 }], ['gnp', 130, { x: GAP - 30 }], ['gnpHit', 110, { x: GAP - 28 }], ['kneelTop', 250, { x: GAP - 30 }]]);
        queue(Dd, [['onBack', 250, { x: -12, head: 20 }], ['onBack', 130, { x: -12, head: -6 }], ['onBack', 250, { x: -12, head: 18 }], ['onBack', 200, { x: -12 }]]);
        hitAt(Dd, 'head', 'hit', 260);
        hitAt(Dd, 'head', 'hit', 500);
        return;
      case 'sub': {
        subScene(A, ev.alt, ev.escape && !bitti, ev.tap || bitti);
        return;
      }
      case 'rock': {
        const alt = ev.alt as PoseName;
        queue(A, [['stance', 150, { x: reach }], [alt, 130, { x: reach + 4 }], ['stance', 250, { x: reach - 6 }]]);
        queue(Dd, [['stance', 270], ['reel', 150], ['hurt', 160, { x: -4 }], ['reel', 160, { x: -8 }], ['hurt', 250, { x: -6 }]]);
        hitAt(Dd, 'head', 'big', 280);
        setTimeout(() => {
          fx.current.push({ ...world(Dd, joints(cur.current[Dd]).head), kind: 'stars', t0: now() });
          kick();
        }, 600 * sp);
        return;
      }
      case 'ko': {
        const alt = ev.alt as PoseName;
        queue(A, [['stance', 150, { x: reach }], [alt, 140, { x: reach + 6 }], ['stance', 300, { x: reach - 10 }], ['win', 500, { x: 0 }]]);
        queue(Dd, [['stance', 280], ['reel', 130, { x: -6 }], ['knockedOut', 420, { x: -16 }]]);
        queue('r', [['refIdle', 300], ['refStop', 350, { x: 0 }], ['refStop', 400, { x: 0 }]]);
        face.current.r = Dd === 'o' ? 1 : -1;
        hitAt(Dd, 'head', 'big', 290);
        return;
      }
    }
  };

  /** Submission koreografisi: pozisyona geç, sık, kurtul ya da tap. */
  const subScene = (A: Side, alt: string, escape: boolean, tap: boolean) => {
    const Dd = other(A);
    let aSeg: Seg[];
    let dSeg: Seg[];
    if (alt === 'rnc') {
      face.current[Dd] = face.current[A];
      aSeg = [['rncBack', 420, { x: GAP - 12 }], ['rncBack', 220, { x: GAP - 10, torso: 0 }], ['rncBack', 220, { x: GAP - 12, torso: 8 }], ['rncBack', 220, { x: GAP - 10, torso: 0 }]];
      dSeg = [['rncVictim', 420, { x: 0 }], ['rncVictim', 220, { head: -26 }], ['rncVictim', 220], ['rncVictim', 220, { head: -28 }]];
    } else if (alt === 'triangle') {
      aSeg = [['triangle', 420, { x: GAP - 44 }], ['triangle', 250, { x: GAP - 44, lL2: 135 }], ['triangle', 250, { x: GAP - 44 }], ['triangle', 250, { x: GAP - 44, lL2: 135 }]];
      dSeg = [['triangleVictim', 420, { x: 10 }], ['triangleVictim', 250, { x: 12, head: 48 }], ['triangleVictim', 250, { x: 10 }], ['triangleVictim', 250, { x: 12, head: 48 }]];
    } else if (alt === 'guillotine') {
      aSeg = [['guillotine', 380, { x: GAP - 44 }], ['guillotine', 220, { x: GAP - 46, torso: -20 }], ['guillotine', 220, { x: GAP - 44 }], ['guillotine', 220, { x: GAP - 46, torso: -22 }]];
      dSeg = [['guillotineVictim', 380, { x: 10 }], ['guillotineVictim', 220, { x: 12, y: 1 }], ['guillotineVictim', 220], ['guillotineVictim', 220, { x: 12, y: 1 }]];
    } else {
      aSeg = [['armbar', 420, { x: GAP + 16 }], ['armbar', 250, { x: GAP + 16, aL1: 160 }], ['armbar', 250, { x: GAP + 16 }], ['armbar', 250, { x: GAP + 16, aL1: 158 }]];
      dSeg = [['armbarVictim', 420, { x: -6 }], ['armbarVictim', 250, { x: -6, head: 24 }], ['armbarVictim', 250, { x: -6 }], ['armbarVictim', 250, { x: -6, head: 24 }]];
    }
    if (tap) dSeg.push([dSeg[dSeg.length - 1][0], 130, { aR1: 60, aR2: 10 }], [dSeg[dSeg.length - 1][0], 130, { aR1: 20, aR2: 10 }], [dSeg[dSeg.length - 1][0], 130, { aR1: 60, aR2: 10 }]);
    if (escape) {
      aSeg.push(['stance', 450, { x: 6 }]);
      dSeg.push(['stance', 450, { x: -4 }]);
      setTimeout(() => {
        face.current.p = 1;
        face.current.o = -1;
      }, 1350 * sp);
    }
    queue(A, aSeg);
    queue(Dd, dSeg);
    hitAt(Dd, 'head', 'lock', 450);
    if (tap) hitAt(Dd, 'body', 'tap', 1350);
  };

  // Her yeni satırda sahne oynar
  const last = shown > 0 ? fs.log[shown - 1] : '';
  const done = fs.durum === 'bitti' && shown >= fs.log.length;
  useEffect(() => {
    if (!last) {
      if (fs.raunt === 1) play({ tur: 'round', alt: '', kim: 'p', miss: false, escape: false, tap: false }, false);
      return;
    }
    play(classify(last, fs), done);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, fs.raunt]);

  // Akış bittiğinde: kritik an, raunt arası ya da hakemin el kaldırması
  useEffect(() => {
    if (shown < fs.log.length) return;
    const tm = setTimeout(() => {
      if (fs.durum === 'bitti' && fs.sonuc) {
        const kz = fs.sonuc.kazanan;
        const bitirme = ['KO', 'TKO', 'SUB'].includes(fs.sonuc.yontem);
        setCaption(kz === 'berabere' ? tL("BERABERE") : `KAZANAN: ${kz === 'p' ? fs.pAd : fs.oAd}`.toLocaleUpperCase(LOC));
        if (kz === 'berabere') {
          queue('r', [['refBoth', 600, { x: 0 }]]);
          queue('p', [['dejected', 500, { x: GAP / 2 - 30 }]]);
          queue('o', [['dejected', 500, { x: GAP / 2 - 30 }]]);
          return;
        }
        const W: Side = kz;
        const L = other(W);
        face.current.p = 1;
        face.current.o = -1;
        face.current.r = W === 'p' ? -1 : 1;
        // Hakem kazananın yanına gelir ve elini kaldırır
        queue('r', [['refIdle', 500, { x: 0 }], ['refIdle', 300, { x: 0 }], ['refRaise', 400, { x: 8 }]]);
        queue(W, [['stance', 500, { x: GAP / 2 - 22 }], ['stance', 300, { x: GAP / 2 - 22 }], ['winHeld', 400, { x: GAP / 2 - 20 }]]);
        if (!bitirme) queue(L, [['dejected', 700, { x: 4 }]]);
        else if (fs.sonuc.yontem === 'SUB') queue(L, [['sitUp', 700, { x: -8 }]]);
      } else if (fs.durum === 'rauntSonu') {
        face.current.p = 1;
        face.current.o = -1;
        setCaption(tL("{0}. RAUNT BİTTİ", [fs.raunt]));
        queue('p', [['stanceLow', 700, { x: -20, aL1: 10, aL2: 30, aR1: 5, aR2: 30 }]]);
        queue('o', [['stanceLow', 700, { x: -20, aL1: 10, aL2: 30, aR1: 5, aR2: 30 }]]);
        queue('r', [['refSeparate', 400, { x: 0 }], ['refIdle', 400]]);
      } else if (fs.durum === 'kritik' && fs.kritik) {
        setCaption('');
        const kr = fs.kritik;
        if (kr === 'rakipSersem' || kr === 'sarsildin') {
          const hurt: Side = kr === 'rakipSersem' ? 'o' : 'p';
          queue(hurt, [['reel', 250, { x: -8 }], ['hurt', 300, { x: -6 }], ['reel', 300, { x: -10 }]]);
          queue(other(hurt), [['stance', 300, { x: GAP - 44 }]]);
        } else {
          const t = (fs.subAdi ?? '').toLocaleLowerCase(LOC);
          const alt = /rnc|arkadan|rear-naked|the back|mataleón|la espalda/.test(t) ? 'rnc' : /üçgen|triangle|triángulo/.test(t) && !/arm-triangle/.test(t) ? 'triangle' : /giyotin|guillotine|guillotina|d'arce|anakonda|anaconda|arm-triangle/.test(t) ? 'guillotine' : 'armbar';
          subScene(kr === 'subFirsat' ? 'p' : 'o', alt, false, false);
        }
      } else setCaption('');
    }, 350);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, fs.durum, fs.log.length, fs.kritik]);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const tNow = now();
  const actor = (a: Actor) => {
    const ps = cur.current[a];
    const f = face.current[a];
    const X = baseX(a) + f * k * ps.x;
    const Y = floorY - HIP_H * k + k * ps.y;
    const look = a === 'p' ? pLook ?? DEFAULT_LOOK : a === 'o' ? oLook : REF_LOOK;
    const kit = a === 'p' ? { shorts: '#c1121f', trim: '#ffffff', glove: '#b8121f' } : a === 'o' ? { shorts: '#1f4fbf', trim: '#ffffff', glove: '#1740a8' } : { shorts: '#15161a', trim: '#fff', glove: '#000', ref: true };
    return (
      <G key={a}>
        <Ellipse cx={X} cy={floorY + 4} rx={20 * k} ry={4 * k} fill="#000" opacity={0.25} />
        <G transform={tL("translate({0} {1}) scale({2} {3}) rotate({4})", [X, Y, f * k, k, ps.rot])}>
          <Figure p={{ ...ps, rot: 0 }} look={look} kit={kit} />
        </G>
      </G>
    );
  };
  // Yerde olan önce çizilir (üstteki onun üstünde görünsün)
  const order: Actor[] = cur.current.p.rot < -45 ? ['r', 'p', 'o'] : ['r', 'o', 'p'];

  return (
    <View onLayout={onLayout} style={cv.wrap}>
      <LinearGradient colors={['#0a0a0d', '#111217', '#050506']} style={{ height: H }}>
        <Svg width={w} height={H} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="cspot" cx="50%" cy="70%" r="55%">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0.28} />
              <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {/* Tribün ışıkları */}
          {Array.from({ length: 18 }, (_, i) => (
            <Circle key={i} cx={(w / 18) * i + 8} cy={H * 0.06 + (i % 3) * 5} r={1.2} fill="#ffffff" opacity={0.15 + (i % 4) * 0.08} />
          ))}
          {/* Arka kafes */}
          <Polygon points={`${w * 0.08},${H * 0.72} ${w * 0.18},${H * 0.18} ${w * 0.82},${H * 0.18} ${w * 0.92},${H * 0.72}`} fill="none" stroke="#2c2f37" strokeWidth={2} />
          {Array.from({ length: 15 }, (_, i) => {
            const x = w * 0.18 + (w * 0.64 * i) / 14;
            return <Line key={i} x1={x} y1={H * 0.18} x2={x} y2={H * 0.68} stroke="#1d2027" strokeWidth={1} />;
          })}
          {Array.from({ length: 7 }, (_, i) => (
            <Line key={`h${i}`} x1={w * 0.16} y1={H * 0.22 + i * 15} x2={w * 0.84} y2={H * 0.22 + i * 15} stroke="#1a1c22" strokeWidth={1} />
          ))}
          {/* Kanvas */}
          <Ellipse cx={cx} cy={H * 0.8} rx={w * 0.49} ry={H * 0.17} fill="#d6d6d9" />
          <Ellipse cx={cx} cy={H * 0.8} rx={w * 0.49} ry={H * 0.17} fill="url(#cspot)" />
          <Ellipse cx={cx} cy={H * 0.8} rx={w * 0.13} ry={H * 0.045} fill="none" stroke={C.red} strokeWidth={2} opacity={0.6} />
          <SvgText x={cx} y={H * 0.81 + 3} fill={C.red} opacity={0.35} fontSize={9} fontWeight="bold" textAnchor="middle" letterSpacing={3}>
            YOL
          </SvgText>
          {/* Figürler */}
          {order.map(actor)}
          {/* Efektler */}
          {fx.current.map((f, i) => {
            const age = (tNow - f.t0) / 700;
            const s = (f.kind === 'big' ? 1.6 : 1) * (0.5 + age) * k;
            const op = Math.max(0, 1 - age);
            if (f.kind === 'lock' || f.kind === 'tap' || f.kind === 'stars')
              return (
                <SvgText key={i} x={f.x} y={f.y - 10 - age * 14} fontSize={16 * k} textAnchor="middle" opacity={op}>
                  {f.kind === 'lock' ? '🔒' : f.kind === 'tap' ? '✋' : '💫'}
                </SvgText>
              );
            if (f.kind === 'dust')
              return <Ellipse key={i} cx={f.x} cy={floorY} rx={30 * s} ry={5 * s} fill="#ffffff" opacity={op * 0.5} />;
            return (
              <G key={i} opacity={op}>
                {Array.from({ length: 8 }, (_, q) => {
                  const a = (q / 8) * Math.PI * 2;
                  return <Line key={q} x1={f.x + Math.cos(a) * 4 * s} y1={f.y + Math.sin(a) * 4 * s} x2={f.x + Math.cos(a) * 11 * s} y2={f.y + Math.sin(a) * 11 * s} stroke={f.kind === 'big' ? '#ffd23f' : '#ffffff'} strokeWidth={2} />;
                })}
                <Circle cx={f.x} cy={f.y} r={3.5 * s} fill={f.kind === 'big' ? '#ff5a2a' : '#ffffff'} />
              </G>
            );
          })}
          {/* Ön direkler */}
          <Line x1={w * 0.03} y1={H * 0.08} x2={w * 0.03} y2={H * 0.98} stroke="#3a3d45" strokeWidth={5} />
          <Line x1={w * 0.97} y1={H * 0.08} x2={w * 0.97} y2={H * 0.98} stroke="#3a3d45" strokeWidth={5} />
          <Rect x={w * 0.03 - 4} y={H * 0.08} width={8} height={20} fill={C.red} />
          <Rect x={w * 0.97 - 4} y={H * 0.08} width={8} height={20} fill={C.blue} />
        </Svg>
        {caption ? (
          <View style={cv.caption}>
            <Text style={[cv.captionText, done && { color: C.gold }]}>{caption}</Text>
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const cv = StyleSheet.create({
  wrap: { borderRadius: R + 2, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2d34', marginBottom: 10 },
  caption: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center' },
  captionText: { color: '#fff', fontFamily: F.display, fontSize: 16, letterSpacing: 2, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 3, overflow: 'hidden' },
});
