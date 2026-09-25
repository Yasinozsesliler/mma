// Pozların geometrisi: en alçak nokta zemine göre (0 = tam yerde, + = zeminin altına batmış, - = havada).
import { HIP_H, joints, POSES, type Pose } from '../src/ui/rigMath';

const pts = (p: Pose) => {
  const j = joints(p);
  const r = (p.rot * Math.PI) / 180;
  const rot = (q: { x: number; y: number }) => ({ x: q.x * Math.cos(r) - q.y * Math.sin(r), y: q.x * Math.sin(r) + q.y * Math.cos(r) + p.y });
  const named: Record<string, { x: number; y: number }> = { kafa: j.head, boyun: j.neck, kalca: j.pelvis, dizOn: j.knL, dizArka: j.knR, ayakOn: j.anL, ayakArka: j.anR, elOn: j.wrL, elArka: j.wrR };
  return Object.fromEntries(Object.entries(named).map(([k, v]) => [k, rot(v)]));
};
for (const [name, p] of Object.entries(POSES)) {
  const q = pts(p);
  const low = Object.entries(q).reduce((a, b) => (b[1].y > a[1].y ? b : a));
  const gap = +(low[1].y - HIP_H).toFixed(1);
  const flag = gap > 6 ? '⚠ BATIYOR' : gap < -6 ? '⚠ HAVADA' : '';
  console.log(`${name.padEnd(16)} en alçak: ${low[0].padEnd(8)} ${String(gap).padStart(6)}  kafa y=${q.kafa.y.toFixed(0).padStart(4)} ${flag}`);
}
