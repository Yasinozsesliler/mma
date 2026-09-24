// Kumarhane: slot, blackjack, rulet. Uzun vadede kasa kazanır.
import { chance, clamp, pick, rand, weighted } from './rng';
import { lifestylePost } from './social';
import type { GameState } from './types';

const $ = (n: number) => `$${Math.round(n).toLocaleString('tr-TR')}`;

/** Bahsi düşer. Yetersiz bakiye varsa false. */
export function placeBet(s: GameState, bet: number): boolean {
  if (bet <= 0 || s.para < bet) return false;
  s.para -= bet;
  s.kumar = s.kumar ?? { oynanan: 0, net: 0 };
  s.kumar.oynanan += bet;
  s.kumar.net -= bet;
  return true;
}

/** Kazancı öder ve büyük bahislerin yan etkilerini uygular. Dönen metin varsa ekranda gösterilir. */
export function payout(s: GameState, bet: number, win: number): string | null {
  s.para += win;
  s.kumar!.net += win;
  if (bet >= 20000 && chance(0.12)) {
    s.populerlik = clamp(s.populerlik - 2, 0, 100);
    s.haberler.unshift(`📉 ${s.fighter.soyad} kumarhanede ${$(bet)}’lık bahis oynarken görüntülendi. Taraftarlar tepkili.`);
    return '📸 Paparazziler yüksek bahsini görüntüledi! Popülerlik -2.';
  }
  if (s.kumar!.net < -100000 && chance(0.15)) {
    s.motivasyon = Math.max(-2, s.motivasyon - 1);
    return '😞 Kayıplar birikiyor. Kafan kampta değil, kumarda. (Motivasyon -1)';
  }
  return null;
}

/** Kumarhaneye giriş: haftada bir kez disiplin bedeli (gece hayatı, uykusuzluk). */
export function enterCasino(s: GameState) {
  s.kumar = s.kumar ?? { oynanan: 0, net: 0 };
  if (s.kumar.sonHafta === s.hafta) return;
  s.kumar.sonHafta = s.hafta;
  s.motivasyon = Math.max(-2, s.motivasyon - 1);
  const kondisyon = chance(0.35);
  if (kondisyon) s.fighter.stats.kondisyon = Math.max(1, s.fighter.stats.kondisyon - 1);
  if (chance(0.4)) lifestylePost(s, 'gece yarısı kumarhanede');
  s.kumar.uyari = `Gece hayatı disiplinini bozuyor: motivasyon -1${kondisyon ? ', uykusuz gecelerden kondisyon -1' : ''}.`;
}

// ---------- Slot ----------

export const SLOT_SYMBOLS = ['🥊', '🥋', '🔥', '💰', '🏆', '7️⃣'] as const;
const SLOT_WEIGHTS: [string, number][] = [
  ['🥊', 6],
  ['🥋', 6],
  ['🔥', 4],
  ['💰', 3],
  ['🏆', 2],
  ['7️⃣', 1],
];
const TRIPLE: Record<string, number> = { '🥊': 6, '🥋': 6, '🔥': 12, '💰': 20, '🏆': 50, '7️⃣': 150 };

export function spinSlot(): { reels: string[]; carpan: number } {
  const reels = [0, 1, 2].map(() => weighted(SLOT_WEIGHTS));
  let carpan = 0;
  if (reels[0] === reels[1] && reels[1] === reels[2]) carpan = TRIPLE[reels[0]];
  else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) carpan = 1;
  if (carpan === 0 && reels.includes('7️⃣')) carpan = 0.3;
  return { reels, carpan };
}

// ---------- Rulet (Avrupa, tek sıfır) ----------

export const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export type RouletteBet = 'kirmizi' | 'siyah' | 'tek' | 'cift' | 'dusuk' | 'yuksek' | number;

export function spinRoulette(bet: RouletteBet): { sayi: number; carpan: number } {
  const sayi = Math.floor(rand() * 37);
  let win = false;
  if (typeof bet === 'number') return { sayi, carpan: sayi === bet ? 36 : 0 };
  if (sayi !== 0) {
    if (bet === 'kirmizi') win = RED.has(sayi);
    if (bet === 'siyah') win = !RED.has(sayi);
    if (bet === 'tek') win = sayi % 2 === 1;
    if (bet === 'cift') win = sayi % 2 === 0;
    if (bet === 'dusuk') win = sayi <= 18;
    if (bet === 'yuksek') win = sayi >= 19;
  }
  return { sayi, carpan: win ? 2 : 0 };
}

// ---------- Blackjack ----------

export interface Card {
  r: string;
  s: string;
}

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];
export const drawCard = (): Card => ({ r: pick(RANKS), s: pick(SUITS) });

export function handValue(h: Card[]): number {
  let v = 0;
  let aces = 0;
  h.forEach((c) => {
    if (c.r === 'A') {
      aces++;
      v += 11;
    } else v += ['J', 'Q', 'K'].includes(c.r) ? 10 : Number(c.r);
  });
  while (v > 21 && aces > 0) {
    v -= 10;
    aces--;
  }
  return v;
}

export const isBlackjack = (h: Card[]) => h.length === 2 && handValue(h) === 21;

/** Krupiye 17’ye kadar çeker. */
export function dealerPlay(d: Card[]): Card[] {
  const out = [...d];
  while (handValue(out) < 17) out.push(drawCard());
  return out;
}

export type BJResult = 'blackjack' | 'kazandin' | 'kaybettin' | 'berabere';

/** Sonuç ve ödeme çarpanı (bahsin kaç katı geri döner). */
export function settleBlackjack(p: Card[], d: Card[]): { sonuc: BJResult; carpan: number } {
  const pv = handValue(p);
  const dv = handValue(d);
  if (pv > 21) return { sonuc: 'kaybettin', carpan: 0 };
  if (isBlackjack(p) && !isBlackjack(d)) return { sonuc: 'blackjack', carpan: 2.5 };
  if (isBlackjack(d) && !isBlackjack(p)) return { sonuc: 'kaybettin', carpan: 0 };
  if (dv > 21 || pv > dv) return { sonuc: 'kazandin', carpan: 2 };
  if (pv === dv) return { sonuc: 'berabere', carpan: 1 };
  return { sonuc: 'kaybettin', carpan: 0 };
}
