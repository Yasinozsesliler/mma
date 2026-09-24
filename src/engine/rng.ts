// Oyunun zar sistemi. Tohumlanabilir (mulberry32), böylece testler tekrarlanabilir olur.
let seed = Date.now() >>> 0;

export function setSeed(s: number) {
  seed = s >>> 0;
}

export function rand(): number {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
export const chance = (p: number) => rand() < p;
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const uid = () => rand().toString(36).slice(2, 10);

/** Ortalaması 0 olan yaklaşık normal dağılımlı gürültü. */
export function noise(sigma: number) {
  return (rand() + rand() + rand() - 1.5) * sigma * 2;
}

export function weighted<T>(items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r <= 0) return item;
  }
  return items[items.length - 1][0];
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Şablondaki {anahtar} alanlarını doldurur. */
export function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
