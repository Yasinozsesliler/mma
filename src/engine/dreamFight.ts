// Hayalî Maçlar: efsaneler zirvedeki halleriyle birbirine karşı. Her gün herkes için aynı eşleşme (tarihten tohumlanır);
// günde bir hak, ödüllü reklamla bir hak daha. Kazanılan eşleşmeler albumde toplanır. Kariyerden bağımsızdır.
import { L } from '../i18n';
import { createGame } from './character';
import { baseStatsFor, COUNTRIES } from './data';
import { PLANS, startFight } from './fight';
import { LEGEND_IDS, LEGENDS, legendName, type LegendId } from './legendRun';
import { weakest } from './opponents';
import { clamp, pick, setSeed } from './rng';
import type { GameState, Opponent, PlanKey, Stats, WeightClass } from './types';
import { STAT_KEYS } from './types';
import { dayNumber } from './daily';

export { dayNumber };

const WEIGHT_ORDER: WeightClass[] = ['sinek', 'horoz', 'tuy', 'hafif', 'welter', 'orta', 'yariagir', 'agir'];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Bütün eşleşmeler (kadın ve erkek efsaneler kendi aralarında). Anahtar sıralı: "a-b". */
export function dreamPairs(): [LegendId, LegendId][] {
  const ids = LEGEND_IDS;
  const out: [LegendId, LegendId][] = [];
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) if (!!LEGENDS[ids[i]].gorunum.kadin === !!LEGENDS[ids[j]].gorunum.kadin) out.push([ids[i], ids[j]]);
  return out;
}
export const pairKey = (a: LegendId, b: LegendId) => [a, b].sort().join('-');

/** Bazı eşleşmelerin kendi başlığı var; diğerleri genel başlık alır. */
const TITLES: Record<string, () => string> = {
  'kral-yenilmez': () => L("Asrın Gecesi: Rövanş"),
  'dahi-profesor': () => L("Dahi ile Profesör"),
  'kral-profesor': () => L("Şovmen ile Taktisyen"),
  'dahi-yenilmez': () => L("Yenilmezler Çarpışıyor"),
  'kral-dahi': () => L("İki Yıldız, Tek Kafes"),
  'profesor-yenilmez': () => L("Disiplin ile Dağ"),
};
export const dreamTitle = (a: LegendId, b: LegendId) => TITLES[pairKey(a, b)]?.() ?? L("Tarihin Hiç Görmediği Maç");

export type DreamSpec = { gun: number; ben: LegendId; rakip: LegendId; siklet: WeightClass };

/** Zirvedeki hali: branşının temeli + efsanenin karakteri (iki katı vurgu). */
export function primeStats(id: LegendId): Stats {
  const d = LEGENDS[id];
  const st = baseStatsFor(d.gecmis, 84);
  STAT_KEYS.forEach((k) => (st[k] = Math.round(clamp(st[k] + (d.statMod[k] ?? 0) * 2, 40, 96))));
  return st;
}

function asOpponent(id: LegendId): Opponent {
  const d = LEGENDS[id];
  return {
    id: `efsane-${id}`,
    ad: d.ad,
    soyad: d.soyad,
    lakap: d.lakap(),
    uyruk: COUNTRIES[d.uyruk]?.ad ?? d.uyruk,
    stil: d.gecmis,
    kisilik: '',
    stats: primeStats(id),
    rekor: { g: 25, m: 1, b: 0 },
    rank: null,
    champion: true,
    rivalry: 0,
    karsilasma: 0,
    kadin: d.gorunum.kadin,
    gorunum: d.gorunum,
  };
}

/** Günün eşleşmesi: herkes için aynı. Sıklet, ağır olanın sıkleti (sıklet üstü maç). */
export function dreamSpec(gun: number): DreamSpec {
  setSeed(hash(`yol-hayali-${gun}`));
  const [a, b] = pick(dreamPairs());
  const [ben, rakip] = pick([0, 1]) ? [a, b] : [b, a];
  const siklet = WEIGHT_ORDER[Math.max(WEIGHT_ORDER.indexOf(LEGENDS[a].siklet), WEIGHT_ORDER.indexOf(LEGENDS[b].siklet))];
  setSeed(Date.now() >>> 0);
  return { gun, ben, rakip, siklet };
}

export const dreamOpponent = (spec: DreamSpec) => asOpponent(spec.rakip);
export const dreamMe = (spec: DreamSpec) => asOpponent(spec.ben);

/** Oynanabilir geçici oyun durumu (hiçbir yuvaya kaydedilmez). deneme: 0 ya da 1 (reklamla ikinci hak). */
export function dreamGame(spec: DreamSpec, plan: PlanKey, deneme: number): GameState {
  const d = LEGENDS[spec.ben];
  const me = asOpponent(spec.ben);
  const s = createGame(
    { ad: d.ad, soyad: d.soyad, lakap: d.lakap(), uyruk: d.uyruk, memleket: d.memleket(), yas: 29, siklet: spec.siklet, gecmis: d.gecmis, hikaye: '', gorunum: d.gorunum, boy: d.boy },
    me.stats,
  );
  s.contract = { org: 'ufc', kalan: 1, ucret: 0, bonus: 0, munhasir: true };
  s.stage = 'ufc';
  s.ipuclari = undefined;
  const opp = asOpponent(spec.rakip);
  s.pending.rakip = opp;
  setSeed(hash(`yol-hayali-dovus-${spec.gun}-${plan}-${deneme}`));
  s.pending.dovus = startFight({
    pStats: me.stats,
    pAd: d.lakap() || d.soyad,
    koseAdi: L("Köşen"),
    opp,
    mods: { stats: {}, plan, planUyum: PLANS[plan].hedef.includes(weakest(opp)), oppStats: {} },
    maxRaunt: 5,
    unvanMaci: true,
    anaMac: true,
  });
  s.phase = 'dovus';
  return s;
}

export const endDreamFight = () => setSeed(Date.now() >>> 0);

// ---------- Kayıt (cihazda) ----------

export type DreamResult = { sonuc: 'G' | 'M' | 'B'; yontem: string; raunt: number };
export type DreamStore = {
  /** Gün → denemeler (en fazla 2) */
  gunler: Record<number, DreamResult[]>;
  /** Reklamla ikinci hak alınan gün */
  ekHak?: number;
  /** Kazanılan eşleşmeler: "a-b" → kazanan efsane id'leri */
  album: Record<string, LegendId[]>;
};

export const emptyDream = (): DreamStore => ({ gunler: {}, album: {} });

export function recordDream(st: DreamStore, spec: DreamSpec, r: DreamResult): DreamStore {
  const gunler = { ...st.gunler, [spec.gun]: [...(st.gunler[spec.gun] ?? []), r] };
  Object.keys(gunler)
    .map(Number)
    .filter((g) => g < spec.gun - 30)
    .forEach((g) => delete gunler[g]);
  const k = pairKey(spec.ben, spec.rakip);
  const album = { ...st.album };
  if (r.sonuc === 'G') album[k] = [...new Set([...(album[k] ?? []), spec.ben])];
  return { ...st, gunler, album };
}

/** Bugün kaç hak kaldı: ilk hak + (reklamla alınmışsa) ikinci hak. Kazanınca biter. */
export function triesLeft(st: DreamStore, gun: number) {
  const list = st.gunler[gun] ?? [];
  if (list.some((x) => x.sonuc === 'G')) return 0;
  return (st.ekHak === gun ? 2 : 1) - list.length;
}

/** Albüm ilerlemesi: her eşleşmeyi iki taraftan da kazanmak (2 × eşleşme sayısı). */
export function albumProgress(st: DreamStore) {
  const pairs = dreamPairs();
  const got = pairs.reduce((a, [x, y]) => a + (st.album[pairKey(x, y)]?.length ?? 0), 0);
  return { got, max: pairs.length * 2 };
}

export const dreamName = (id: LegendId) => legendName(LEGENDS[id]);
