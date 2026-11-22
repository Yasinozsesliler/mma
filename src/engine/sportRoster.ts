// Dövüş sporları liglerinde kalıcı kadro: 10 kişi, isimleri ve karneleri kalıcı. Oyuncu kemer sahibi değilse
// kadro[0] şampiyondur, gerisi sıralamadır; oyuncu kemer sahibiyse kadro[0] 1 numaralı yarışmacıdır.
// Oyuncunun her maçında rakibin karnesi işlenir ve diğer yarışmacılar da kendi aralarında dövüşür (sıralama oynar).
import { L } from '../i18n';
import { COUNTRIES, femSurname, NAME_POOLS, NICKNAMES } from './data';
import { chance, clamp, pick, rand, randInt } from './rng';
import type { Sport } from './sportRules';
import type { GameState } from './types';

export type LigKisi = { id: string; ad: string; soyad: string; lakap: string; uyruk: string; g: number; m: number; ko: number; /** 0-1 göreli güç (rakip istatistiklerini hafifçe kaydırır) */ guc: number };
export const ROSTER_N = 10;

/** Ligin uzman milletleri: isimler çoğunlukla buradan */
const HOME: Record<Sport, string[]> = {
  boks: ['Meksika', 'ABD', 'Kazakistan', 'Birleşik Krallık', 'Küba', 'Filipinler'],
  muaythai: ['Tayland', 'Hollanda', 'Brezilya', 'Japonya'],
  grappling: ['Brezilya', 'ABD', 'Japonya', 'Rusya'],
  gures: ['Türkiye', 'İran', 'Rusya', 'Gürcistan', 'ABD'],
};

function person(s: GameState, sp: Sport, i: number, used: Set<string>): LigKisi {
  const want = HOME[sp];
  const pools = NAME_POOLS.filter((p) => want.includes(p.ulke));
  let pool = pools.length && chance(0.75) ? pick(pools) : pick(NAME_POOLS);
  const kadin = !!s.fighter.kadin;
  let ad = '';
  let soyad = '';
  for (let k = 0; k < 30; k++) {
    pool = k ? pick(pools.length && chance(0.75) ? pools : NAME_POOLS) : pool;
    ad = pick(kadin ? pool.kadin : pool.ad);
    soyad = pick(pool.soyad);
    if (kadin && pool.slav) soyad = femSurname(soyad);
    if (!used.has(`${ad} ${soyad}`) && soyad !== s.fighter.soyad) break;
  }
  used.add(`${ad} ${soyad}`);
  // Üst sıralar daha deneyimli ve güçlü
  const top = 1 - i / ROSTER_N;
  const g = randInt(10, 18) + Math.round(top * 14);
  return { id: `lig_${sp}_${i}_${randInt(1000, 9999)}`, ad, soyad, lakap: pick(NICKNAMES), uyruk: pool.ulke, g, m: randInt(0, 3) + Math.round((1 - top) * 4), ko: Math.round(g * rand() * 0.6), guc: clamp(0.35 + top * 0.6 + (rand() - 0.5) * 0.1, 0, 1) };
}

/** Kadro yoksa kurulur (ilk lig maçında) */
export function ensureRoster(s: GameState, sp: Sport, kadro?: LigKisi[]): LigKisi[] {
  if (kadro && kadro.length >= ROSTER_N) return kadro;
  const used = new Set<string>([`${s.fighter.ad} ${s.fighter.soyad}`]);
  return Array.from({ length: ROSTER_N }, (_, i) => person(s, sp, i, used));
}

/** Tablo satırları: şampiyon ve 1-10 (oyuncu sırasına yerleşir) */
export type TableRow = { sira: number | 'C'; ad: string; uyruk: string; g: number; m: number; sen?: boolean };
export function tableOf(s: GameState, kadro: LigKisi[], rec: { g: number; m: number; sira: number; kemer: boolean }): TableRow[] {
  const me: TableRow = { sira: 0, ad: `${s.fighter.ad} ${s.fighter.soyad}`, uyruk: COUNTRIES[s.fighter.uyruk]?.ad ?? '', g: rec.g, m: rec.m, sen: true };
  const row = (k: LigKisi): TableRow => ({ sira: 0, ad: `${k.ad} ${k.soyad}`, uyruk: k.uyruk, g: k.g, m: k.m });
  if (rec.kemer) return [{ ...me, sira: 'C' }, ...kadro.slice(0, ROSTER_N).map((k, i) => ({ ...row(k), sira: i + 1 }))];
  const list = kadro.slice(1).map(row);
  if (rec.sira <= ROSTER_N) list.splice(rec.sira - 1, 0, me);
  const out: TableRow[] = [{ ...row(kadro[0]), sira: 'C' }, ...list.slice(0, ROSTER_N).map((x, i) => ({ ...x, sira: i + 1 }))];
  if (rec.sira > ROSTER_N) out.push({ ...me, sira: rec.sira > ROSTER_N ? ROSTER_N + 1 : rec.sira });
  return out;
}

/** Bu maçın rakibi (kadro içindeki yeri): kemer maçında şampiyon ya da 1 numara, değilse sıranın biraz üstü. */
export function pickRosterOpponent(kadro: LigKisi[], rec: { sira: number; kemer: boolean }, unvan: boolean): number {
  if (unvan) return 0;
  // Oyuncu kemer sahibi değilse yarışmacılar 1..9'dadır (0 şampiyon)
  const off = rec.kemer ? 0 : 1;
  const last = kadro.length - 1;
  if (rec.sira > ROSTER_N) return clamp(last - randInt(0, 2), off, last);
  const hedef = Math.max(1, rec.sira - 1 - randInt(0, 1));
  return clamp(off + hedef - 1, off, last);
}

const move = (a: LigKisi[], from: number, to: number) => {
  const [x] = a.splice(from, 1);
  a.splice(clamp(to, 0, a.length), 0, x);
};

/** Maç sonrası kadro: rakibin karnesi, kemer değişimi ve diğer yarışmacıların kendi maçları. Haber satırları döner. */
export function afterRosterBout(kadro: LigKisi[], idx: number, won: boolean, draw: boolean, fin: boolean, unvanOncesiKemer: boolean, unvan: boolean, ligAd: string): { kadro: LigKisi[]; haber: string[] } {
  const a = kadro.map((k) => ({ ...k }));
  const haber: string[] = [];
  const o = a[idx];
  if (o && !draw) {
    if (won) o.m++;
    else {
      o.g++;
      if (fin) o.ko++;
    }
    if (unvan && unvanOncesiKemer && !won) {
      // Kemeri oyuncudan alan yarışmacı şampiyon olur (kadro[0])
      move(a, idx, 0);
      haber.push(L("🏆 {0} {1} kemerini kazandı!", [`${o.ad} ${o.soyad}`, ligAd]));
    } else if (!unvan) {
      if (won) move(a, idx, idx + 2);
      else move(a, idx, idx - 1);
    }
  }
  // Diğer yarışmacılar: iki maç (şampiyon yerinden oynamaz); alttaki kazanırsa bir sıra yükselir
  for (let k = 0; k < 2; k++) {
    const i = randInt(1, a.length - 2);
    const j = i + 1;
    const x = a[i];
    const y = a[j];
    if (!x || !y || x.id === o?.id || y.id === o?.id) continue;
    const yWins = chance(clamp(0.5 + (y.guc - x.guc) * 0.8, 0.15, 0.85));
    (yWins ? y : x).g++;
    (yWins ? x : y).m++;
    if (yWins) {
      move(a, j, i);
      if (k === 0) haber.push(L("📊 {0}: {1}, {2} karşısında kazandı ve sıralamada yükseldi.", [ligAd, `${y.ad} ${y.soyad}`, `${x.ad} ${x.soyad}`]));
    }
  }
  return { kadro: a, haber };
}
