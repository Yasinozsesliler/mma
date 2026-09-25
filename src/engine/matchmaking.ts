// Eşleştirme: sıradaki dövüşün rakibini belirler. Sıralamadaki rakipler gerçek sıralama listesinden gelir.
import { currentOrg } from './character';
import { ORGS } from './data';
import { divisionChampion, ensureDivision, rankedOpponent } from './division';
import { generateOpponent, riskText } from './opponents';
import { chance, clamp, randInt } from './rng';
import type { GameState, Opponent } from './types';

/** Sıralamadaki r. dövüşçü; liste yoksa aynı seviyede yeni bir rakip üretilir. */
function ranked(s: GameState, r: number | null, z: -1 | 0 | 1, exclude: Opponent[] = []): Opponent {
  if (r != null) {
    const o = rankedOpponent(s, r);
    if (o && !exclude.some((x) => x.id === o.id)) return { ...o, zorluk: z };
  }
  return generateOpponent(s, { zorluk: z, rank: r }, exclude);
}

function titleFight(s: GameState): Opponent {
  const o = divisionChampion(s) ?? generateOpponent(s, { zorluk: 1, champion: true });
  o.zorluk = 1;
  o.etiket = '🏆 ŞAMPİYONLUK MAÇI';
  o.riskMetni = 'Kemer bu gece el değiştirebilir. 5 raunt.';
  return o;
}

/** Röportajda meydan okunan dövüşçü hâlâ sıralamadaysa ve organizasyon ikna olursa gelir. */
function calledOut(s: GameState): Opponent | null {
  const id = s.cagri;
  s.cagri = null;
  if (!id || !s.bolum || !chance(0.4 + s.populerlik / 200)) return null;
  if (s.bolum.sampiyon?.id === id) return titleBlocked(s) ? null : titleFight(s);
  const idx = s.bolum.liste.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  const o = rankedOpponent(s, idx + 1 + (s.rank != null && s.rank <= idx + 1 ? 1 : 0));
  if (!o || o.id !== id) return null;
  return { ...o, zorluk: 1, etiket: '🎤 MEYDAN OKUDUĞUN İSİM', riskMetni: 'Mikrofonu aldın ve adını söyledin. Organizasyon bu maçı yaptı. Şimdi sözlerinin arkasında dur.' };
}

/** Aynı şampiyonla 3 kez karşılaşıldıysa önce eleme maçı gerekir (sonsuz rövanş olmasın). */
function titleBlocked(s: GameState) {
  const c = s.bolum?.sampiyon;
  if (!c) return false;
  const n = s.gecmis.filter((h) => h.rakipId === c.id).length;
  const since = s.gecmis.findIndex((h) => h.rakipId === c.id); // son karşılaşmadan bu yana dövüş sayısı
  if (n >= 4) return true;
  return n >= 2 && since >= 0 && since < 2;
}

const avoid = (s: GameState, r: number) => (s.rank != null && r === s.rank ? (r > 1 ? r - 1 : r + 1) : r);

/** Bölgesel ve amatör aşama: oyuncu 3 rakipten birini seçer. */
export function opponentChoices(s: GameState): Opponent[] {
  ensureDivision(s);
  const org = currentOrg(s);
  const L = ORGS[org].merdiven;
  const r = s.rank;
  const rankFor = (z: -1 | 0 | 1): number | null => {
    if (!L) return null;
    if (s.sampiyon) return z === 1 ? 1 : randInt(2, 5);
    if (r == null) return z === 1 ? randInt(L - 3, L) : z === 0 && chance(0.4) ? L : null;
    if (z === -1) return r + 2 > L ? null : r + randInt(2, 4) > L ? L : r + randInt(2, 4);
    if (z === 0) return avoid(s, clamp(r + randInt(-1, 1), 1, L));
    return avoid(s, Math.max(1, r - randInt(2, 4)));
  };
  const opts: Opponent[] = [];
  ([-1, 0, 1] as const).forEach((z) => {
    const o = ranked(s, rankFor(z), z, opts);
    o.etiket = z < 0 ? '🟢 KOLAY' : z === 0 ? '🟡 DENGELİ' : '🔴 RİSKLİ';
    o.riskMetni = riskText(z, s.stage);
    opts.push(o);
  });
  if (L && !s.sampiyon && r != null && (r === 1 || (r <= 2 && s.seri >= 2)) && !titleBlocked(s)) opts[2] = titleFight(s);
  else {
    const special = calledOut(s);
    if (special) opts[2] = special;
  }
  if (s.sampiyon) {
    opts[2].etiket = '🏆 UNVAN SAVUNMASI';
    opts[2].riskMetni = 'Kemerin masada. Kaybedersen tahtın gider.';
  }
  return opts;
}

/** Büyük organizasyonlar rakibi kendileri belirler. */
export function imposedOpponent(s: GameState): Opponent {
  ensureDivision(s);
  const org = currentOrg(s);
  const L = ORGS[org].merdiven;
  if (org === 'dwcs') {
    const o = generateOpponent(s, { zorluk: 0, org });
    o.etiket = '🎟️ DWCS';
    o.riskMetni = 'Dana White tribünde. Sadece kazanmak yetmez, bitirmen gerekebilir.';
    return o;
  }
  if (s.sampiyon) {
    const o = ranked(s, randInt(1, 3), 1);
    o.etiket = '🏆 UNVAN SAVUNMASI';
    o.riskMetni = 'Kemerin masada. Kaybedersen tahtın gider.';
    return o;
  }
  if (s.rank != null && (s.rank === 1 || (s.rank <= 2 && s.seri >= 3)) && !titleBlocked(s)) return titleFight(s);
  const special = calledOut(s);
  if (special) return special;
  let rank: number | null;
  if (s.rank == null) rank = chance(0.5) ? null : randInt(L - 3, L);
  else rank = avoid(s, Math.max(1, s.rank - randInt(0, 3)));
  const z: -1 | 0 | 1 = rank != null && s.rank != null && rank < s.rank - 1 ? 1 : 0;
  const o = ranked(s, rank, z);
  o.etiket = '📜 ORGANİZASYON TEKLİFİ';
  o.riskMetni = riskText(z, s.stage);
  return o;
}
