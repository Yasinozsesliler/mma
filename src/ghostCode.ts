// Hayalet Maç kodu: dövüşçü ↔ metin (saf; React Native'e bağlı değil, testlerde de çalışır).
// Kod kendi sağlamasını taşır; çözülürken her alan doğrulanır ve sınırlanır (elle oynanmış kod oyunu bozamaz).
import { BACKGROUNDS, WEIGHT_CLASSES } from './engine/data';
import type { DreamFighter } from './engine/dreamFight';
import type { Appearance, Background, Stats, WeightClass } from './engine/types';
import { STAT_KEYS } from './engine/types';
import { fromB64, fromUtf8, toB64, utf8 } from './b64';

const PREFIX = 'HYL1:';

export function ghostHash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

const SAC: Appearance['sac'][] = ['kazik', 'kisa', 'mohawk', 'uzun', 'topuz', 'afro', 'orgu', 'kel', 'atkuyrugu', 'yanayrik'];
const SAKAL: Appearance['sakal'][] = ['yok', 'kirli', 'tam', 'keci', 'biyik'];
const num = (v: unknown, lo: number, hi: number, d = lo) => (typeof v === 'number' && isFinite(v) ? Math.round(Math.min(hi, Math.max(lo, v))) : d);
const str = (v: unknown, max = 24) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Dövüşçü → paylaşılabilir kod. */
export function ghostCode(f: DreamFighter): string {
  const body = [f.ad, f.soyad, f.lakap, f.uyruk, f.memleket, f.gecmis, f.siklet, f.kadin ? 1 : 0, f.boy ?? 0, STAT_KEYS.map((k) => f.stats[k]), [f.rekor.g, f.rekor.m, f.rekor.b], f.gorunum];
  const json = JSON.stringify(body);
  return PREFIX + toB64(utf8(json + '|' + ghostHash(json)));
}

function sanitizeLook(v: unknown, kadin: boolean): Appearance {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const look: Appearance = {
    ten: num(o.ten, 0, 9),
    sac: SAC.includes(o.sac as Appearance['sac']) ? (o.sac as Appearance['sac']) : 'kisa',
    sacRenk: num(o.sacRenk, 0, 9),
    goz: num(o.goz, 0, 9),
    sakal: !kadin && SAKAL.includes(o.sakal as Appearance['sakal']) ? (o.sakal as Appearance['sakal']) : 'yok',
    yara: !!o.yara,
    dovme: !!o.dovme,
  };
  if (Array.isArray(o.dovmeler)) look.dovmeler = o.dovmeler.filter((x) => x === 'gogus' || x === 'kol' || x === 'boyun');
  if (kadin) look.kadin = true;
  (['yuz', 'burun', 'gozSekil', 'dudak', 'kas', 'kulak'] as const).forEach((k, i) => {
    if (o[k] != null) look[k] = num(o[k], 0, [4, 3, 2, 2, 2, 1][i]);
  });
  return look;
}

/** Metnin içindeki koddan dövüşçü; geçersiz ya da bozuksa null. */
export function parseGhost(text: string): DreamFighter | null {
  const i = text.indexOf(PREFIX);
  if (i < 0) return null;
  try {
    const raw = fromUtf8(fromB64(text.slice(i + PREFIX.length).split(/[\s&]/)[0].replace(/%2B/gi, '+').replace(/%2F/gi, '/').replace(/%3D/gi, '=')));
    const cut = raw.lastIndexOf('|');
    const json = raw.slice(0, cut);
    if (cut < 0 || ghostHash(json) !== raw.slice(cut + 1)) return null;
    const b = JSON.parse(json) as unknown[];
    const gecmis = b[5] as Background;
    const siklet = b[6] as WeightClass;
    if (!BACKGROUNDS[gecmis] || !WEIGHT_CLASSES[siklet] || !Array.isArray(b[9]) || !Array.isArray(b[10])) return null;
    const kadin = b[7] === 1;
    const stats = {} as Stats;
    STAT_KEYS.forEach((k, j) => (stats[k] = num((b[9] as unknown[])[j], 20, 99, 50)));
    const [g, m, d] = (b[10] as unknown[]).map((x) => num(x, 0, 999));
    const ad = str(b[0]);
    const soyad = str(b[1]);
    if (!ad && !soyad) return null;
    return {
      key: `ghost-${ghostHash(json)}`,
      ad,
      soyad,
      lakap: str(b[2]),
      uyruk: str(b[3], 4) || 'tr',
      memleket: str(b[4], 40),
      gecmis,
      siklet,
      kadin: kadin || undefined,
      boy: num(b[8], 0, 230) || undefined,
      stats,
      rekor: { g, m, b: d },
      gorunum: sanitizeLook(b[11], kadin),
    };
  } catch {
    return null;
  }
}
