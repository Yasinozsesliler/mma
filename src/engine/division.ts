// Sıklet sıralaması: her organizasyonda kalıcı bir şampiyon ve sıralı dövüşçüler.
// Liste oyuncuyu içermez; oyuncunun görünen yeri s.rank ile belirlenir ve araya eklenir.
import { L as tL } from '../i18n';
import { currentOrg } from './character';
import { ORGS } from './data';
import { statAverage } from './character';
import { generateOpponent, targetLevel } from './opponents';
import { STAT_KEYS } from './types';
import { chance, noise, randInt } from './rng';
import type { GameState, Opponent } from './types';

export function ensureDivision(s: GameState) {
  const org = currentOrg(s);
  const L = ORGS[org].merdiven;
  if (!L) {
    s.bolum = null;
    return;
  }
  if (s.bolum && s.bolum.org === org && (s.bolum.siklet ?? s.fighter.siklet) === s.fighter.siklet) return;
  const liste: Opponent[] = [];
  for (let r = 1; r <= L; r++) {
    const o = generateOpponent(s, { zorluk: 0, rank: r, org }, liste);
    o.zorluk = undefined;
    liste.push(o);
  }
  const sampiyon = s.sampiyon ? null : generateOpponent(s, { zorluk: 1, champion: true, org }, liste);
  s.bolum = { org, siklet: s.fighter.siklet, sampiyon, liste };
}

export interface RankRow {
  rank: number | 'C';
  opp?: Opponent;
  player?: boolean;
}

/** Görünen sıralama: şampiyon + 1..L, oyuncu kendi sırasına yerleştirilir. */
export function rankingRows(s: GameState): RankRow[] {
  const b = s.bolum;
  if (!b) return [];
  const L = ORGS[b.org].merdiven;
  const rows: RankRow[] = [s.sampiyon ? { rank: 'C', player: true } : { rank: 'C', opp: b.sampiyon ?? undefined }];
  let i = 0;
  for (let r = 1; r <= L; r++) {
    if (!s.sampiyon && s.rank === r) rows.push({ rank: r, player: true });
    else rows.push({ rank: r, opp: b.liste[i++] });
  }
  return rows;
}

/** Görünen r. sıradaki dövüşçü (oyuncu değil). */
function atRank(s: GameState, r: number): Opponent | null {
  const b = s.bolum;
  if (!b) return null;
  const p = s.sampiyon ? null : s.rank;
  if (p != null && r === p) return null;
  const idx = p != null && r > p ? r - 2 : r - 1;
  return b.liste[idx] ?? null;
}

/** r'ye en yakın sıradaki, daha önce dövüşülmemiş dövüşçü (önce bir önceki teklifte de olmayan). Rövanşlar ayrı sistemlerden gelir. */
export function rankedOpponent(s: GameState, r: number, exclude: Opponent[] = []): Opponent | null {
  const b = s.bolum;
  if (!b) return null;
  const L = ORGS[b.org].merdiven;
  const fought = new Set(s.gecmis.map((h) => h.rakipId));
  const offered = new Set(s.sonTeklif ?? []);
  const skip = new Set(exclude.map((x) => x.id));
  for (const yeni of [true, false]) {
    for (const d of [0, 1, -1, 2, -2, 3, -3]) {
      const rr = r + d;
      if (rr < 1 || rr > L) continue;
      const o = atRank(s, rr);
      if (o && !skip.has(o.id) && !fought.has(o.id) && (!yeni || !offered.has(o.id))) return { ...o, rank: rr, champion: false, rivalry: o.rivalry ?? 0 };
    }
  }
  return null;
}

/** Sıradaki herkesle dövüşüldüyse yeni isim o sırayı devralır: sıralama kendini yeniler. */
export function freshenRank(s: GameState, r: number, o: Opponent) {
  const b = s.bolum;
  const cur = atRank(s, r);
  if (!b || !cur || !s.gecmis.some((h) => h.rakipId === cur.id)) return;
  const i = b.liste.indexOf(cur);
  if (i >= 0) b.liste[i] = { ...o, stats: { ...o.stats }, rekor: { ...o.rekor }, zorluk: undefined };
}

export function divisionChampion(s: GameState): Opponent | null {
  const c = s.bolum?.sampiyon;
  return c ? { ...c, champion: true, rank: null } : null;
}

/** Oyuncunun dövüşünden sonra listeyi günceller ve diğer dövüşçüleri hareket ettirir. */
export function syncDivision(s: GameState, opp: Opponent, won: boolean, draw: boolean, titleWon: boolean, titleLost: boolean): string[] {
  const b = s.bolum;
  const notes: string[] = [];
  if (!b) return notes;
  const L = ORGS[b.org].merdiven;
  const inList = b.liste.find((x) => x.id === opp.id);
  const target = inList ?? (b.sampiyon?.id === opp.id ? b.sampiyon : null);
  if (target) {
    if (won) target.rekor.m++;
    else if (draw) target.rekor.b++;
    else target.rekor.g++;
  }
  if (titleWon && b.sampiyon) {
    // Eski şampiyon listenin başına iner.
    b.liste.unshift({ ...b.sampiyon, champion: false });
    b.sampiyon = null;
  } else if (titleLost) {
    const idx = b.liste.findIndex((x) => x.id === opp.id);
    const yeni = idx >= 0 ? b.liste.splice(idx, 1)[0] : { ...opp };
    b.sampiyon = { ...yeni, champion: true, rank: null };
  }

  // Diğer dövüşçüler de dövüşüyor: komşu sıralar yer değiştirir.
  for (let n = randInt(1, 2); n > 0; n--) {
    const i = randInt(0, b.liste.length - 2);
    const [a, c] = [b.liste[i], b.liste[i + 1]];
    if (chance(0.5)) {
      b.liste[i] = c;
      b.liste[i + 1] = a;
      c.rekor.g++;
      a.rekor.m++;
    } else {
      a.rekor.g++;
      c.rekor.m++;
    }
  }
  // Sıralamadakiler de kamp yapıyor: güçleri bulundukları sıranın seviyesine doğru yavaşça ilerler
  // (oyuncu yıllarca gelişirken liste yerinde saymasın).
  const train = (o: Opponent, rank: number | null, champ: boolean) => {
    const gap = targetLevel(s, b.org, 0, rank, champ) + (champ ? 2.5 : 0) - statAverage(o.stats);
    const step = Math.max(-1, Math.min(2, gap * 0.35));
    if (Math.abs(step) < 0.3) return;
    STAT_KEYS.forEach((k) => (o.stats[k] = Math.round(Math.max(12, Math.min(97, o.stats[k] + step + noise(0.6))))));
  };
  b.liste.forEach((o, i) => train(o, i + 1, false));
  if (b.sampiyon) train(b.sampiyon, null, true);
  // Yeni bir isim sıralamaya girer.
  if (chance(0.2)) {
    const giden = b.liste.pop()!;
    const yeni = generateOpponent(s, { zorluk: 0, rank: L, org: b.org }, b.sampiyon ? [...b.liste, b.sampiyon] : b.liste);
    yeni.zorluk = undefined;
    b.liste.push(yeni);
    notes.push(tL("📋 {0} {1}, {2} dövüşçüsünü yenerek sıralamaya girdi.", [yeni.ad, yeni.soyad, giden.soyad]));
  }
  // Şampiyonluk maçı: 1 numara şampiyona meydan okur.
  // Oyuncunun defalarca karşılaştığı şampiyon kemeri daha çabuk bırakır: zirvede de yeni yüz görünür.
  const sampMac = b.sampiyon ? s.gecmis.filter((h) => h.rakipId === b.sampiyon!.id).length : 0;
  if (b.sampiyon && !titleLost && chance(sampMac >= 2 ? 0.35 : 0.12)) {
    const aday = b.liste[0];
    if (chance(sampMac >= 2 ? 0.7 : 0.4)) {
      b.liste[0] = { ...b.sampiyon, champion: false };
      b.sampiyon = { ...aday, champion: true, rank: null };
      notes.push(tL("🏆 {0}’da yeni şampiyon: {1} “{2}” {3}!", [ORGS[b.org].kisa, aday.ad, aday.lakap, aday.soyad]));
    } else {
      aday.rekor.m++;
      b.sampiyon.rekor.g++;
      b.liste.splice(2, 0, b.liste.shift()!);
      notes.push(tL("🏆 {0} şampiyonu {1}, kemerini {2} karşısında korudu.", [ORGS[b.org].kisa, b.sampiyon.soyad, aday.soyad]));
    }
  }
  // Sıklettekiler de antrenman yapar: her dövüş döneminde gelişirler.
  const pAvg = statAverage(s.fighter.stats);
  const listAvg = b.liste.reduce((a, o) => a + statAverage(o.stats), 0) / Math.max(1, b.liste.length);
  const gap = pAvg - listAvg; // oyuncu sıkletten ne kadar önde
  b.liste.forEach((o) => {
    const boost = gap > 4 ? 1.2 : 0.5;
    STAT_KEYS.forEach((k) => {
      if (chance(0.35 * boost)) o.stats[k] = Math.min(96, o.stats[k] + 1);
    });
  });
  if (b.sampiyon) STAT_KEYS.forEach((k) => chance(0.3) && (b.sampiyon!.stats[k] = Math.min(97, b.sampiyon!.stats[k] + 1)));

  // Yükselen yıldız: oyuncu güçlendikçe sıklete tehlikeli gençler gelir.
  if (chance(gap > 3 ? 0.35 : 0.15)) {
    const pos = randInt(Math.floor(L / 2), L - 1);
    const yildiz = generateOpponent(s, { zorluk: 1, rank: pos + 1, org: b.org }, b.sampiyon ? [...b.liste, b.sampiyon] : b.liste);
    yildiz.zorluk = undefined;
    const shift = pAvg + randInt(-1, 3) - statAverage(yildiz.stats);
    if (shift > 0) STAT_KEYS.forEach((k) => (yildiz.stats[k] = Math.min(96, Math.round(yildiz.stats[k] + shift))));
    yildiz.rekor = { g: randInt(8, 14), m: 0, b: 0 };
    b.liste.splice(pos, 0, yildiz);
    notes.push(tL("🌟 Yükselen yıldız: yenilmez {0} “{1}” {2} ({3}-0) sıralamaya #{4}’den girdi!", [yildiz.ad, yildiz.lakap, yildiz.soyad, yildiz.rekor.g, pos + 1]));
  }
  // Veteran emekliliği: sıklette isimler değişir.
  if (chance(0.1) && b.liste.length > 4) {
    const i = randInt(0, b.liste.length - 1);
    const giden = b.liste.splice(i, 1)[0];
    const yeni = generateOpponent(s, { zorluk: 0, rank: L, org: b.org }, b.liste);
    yeni.zorluk = undefined;
    b.liste.push(yeni);
    notes.push(tL("👋 {0} {1} ({2}-{3}) eldivenlerini astı.", [giden.ad, giden.soyad, giden.rekor.g, giden.rekor.m]));
  }
  b.liste = b.liste.slice(0, L);
  return notes;
}
