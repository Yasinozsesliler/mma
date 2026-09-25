// Gece hayatı: striptiz kulübü ve randevular. Eğlencenin bedeli: para, disiplin, skandal ve sağlık riski.
import { addStat } from './character';
import { riskyAct, treatmentCost } from './nightlifeCore';
import { chance, clamp, pick, randInt, uid } from './rng';
import { lifestylePost } from './social';
import { bump } from './istat';
import { prAdjust } from './staff';
import type { GameState } from './types';

const $ = (n: number) => `$${Math.round(n).toLocaleString('tr-TR')}`;
const pop = (s: GameState, d: number) => {
  const v = prAdjust(s, d);
  s.populerlik = clamp(s.populerlik + v, 0, 100);
  return v;
};
const disease = (ad: string | null) => (ad ? `\n\n⚠️ Birkaç gün sonra kendini iyi hissetmiyorsun… Doktor: ${ad}. Tedavi olman gerekiyor.` : '');

// ---------- Striptiz kulübü ----------

export const STRIP_OPTIONS = [
  { ad: 'Sadece izle', aciklama: 'Bir içki, birkaç saat. Az masraf, az risk.', ikon: 'glass-cocktail', fiyat: [300, 800, 2000, 4000] },
  { ad: 'VIP özel oda', aciklama: 'Kapalı kapılar ardında. Yüksek sağlık riski.', ikon: 'door-closed-lock', fiyat: [1500, 4000, 10000, 20000] },
  { ad: 'Şampanya gecesi', aciklama: 'Para yağmuru, ünlüler, kameralar. Popülerlik ya da skandal.', ikon: 'bottle-wine', fiyat: [3000, 10000, 30000, 60000] },
] as const;

const stageIdx = (s: GameState) => ['amator', 'bolgesel', 'buyuk', 'ufc'].indexOf(s.stage);
export const stripPrice = (s: GameState, i: number) => STRIP_OPTIONS[i].fiyat[stageIdx(s)];

export function visitStripClub(s: GameState, i: number): string {
  const cost = stripPrice(s, i);
  if (s.para < cost) return 'Paran yetmiyor.';
  s.para -= cost;
  s.motivasyon = Math.min(2, s.motivasyon + 1);
  let msg: string;
  let ad: string | null;
  if (i === 0) {
    ad = riskyAct(s, 0.3);
    msg = pick(['Loş ışıklar, yüksek müzik. Kafanı dağıttın.', 'Birkaç saat stres attın. Sabah kalkmak zor oldu.']);
  } else if (i === 1) {
    ad = riskyAct(s, 1.2);
    msg = pick(['VIP odada gece uzadı… Sabah salona geç kaldın.', 'Özel odada saatler geçti. Pahalı ve riskli bir geceydi.']);
  } else {
    ad = riskyAct(s, 1);
    if (chance(0.45)) {
      const v = pop(s, -3);
      lifestylePost(s, 'striptiz kulübünde para saçarken');
      msg = `Havaya para saçtın, kameralar her yerde. Magazin seni yerden yere vurdu. (Popülerlik ${v})`;
    } else {
      const v = pop(s, 2);
      msg = `Ünlülerle masadaydın, “parti kralı” etiketin viral oldu. (Popülerlik +${v})`;
    }
  }
  if (chance(i === 0 ? 0.25 : 0.5)) {
    addStat(s.fighter.stats, 'kondisyon', -1);
    msg += '\nUykusuzluk ve alkol: Kondisyon -1.';
  }
  return `${msg}${disease(ad)}`;
}

// ---------- Randevular ----------

export interface Candidate {
  id: string;
  ad: string;
  yas: number;
  meslek: string;
  emoji: string;
  uyum: number; // 0-100
  unlu: boolean;
  seviye: number; // ilişki puanı 0-100
  bio?: string;
  ilgi?: string[];
  renk?: [string, string];
  mesafe?: number;
  /** Profil fotoğrafı yerine geçen kişi emojisi */
  foto?: string;
}

const NAMES = ['Derya', 'Melis', 'Aslı', 'Cansu', 'Buse', 'İrem', 'Ceren', 'Ezgi', 'Lara', 'Sofia', 'Mia', 'Elena', 'Nadia', 'Yasmin', 'Kaan', 'Deniz', 'Arda', 'Ege', 'Jade', 'Chloe'];
const JOBS: [string, string, boolean][] = [
  ['Model', '💃', true],
  ['Doktor', '🩺', false],
  ['Avukat', '⚖️', false],
  ['Fitness eğitmeni', '🏋️', false],
  ['Şarkıcı', '🎤', true],
  ['Oyuncu', '🎬', true],
  ['Influencer', '📱', true],
  ['Öğretmen', '📚', false],
  ['Mimar', '📐', false],
  ['Hemşire', '💉', false],
  ['Barmen', '🍸', false],
  ['Gazeteci', '📰', false],
];

export const DATE_TIERS = [
  { ad: 'Kahve', fiyat: 50, bonus: 0, ikon: 'coffee' },
  { ad: 'Akşam yemeği', fiyat: 400, bonus: 0.1, ikon: 'silverware-fork-knife' },
  { ad: 'Lüks restoran', fiyat: 2500, bonus: 0.2, ikon: 'glass-wine' },
  { ad: 'Yat turu', fiyat: 15000, bonus: 0.3, ikon: 'sail-boat' },
];

export const yatVar = (s: GameState) => (s.envanter ?? []).includes('yat');

const BIOS = [
  'Hafta sonları dağ yürüyüşü, hafta içi kahve bağımlısı ☕',
  'Dövüş izlemeyi severim ama ringe çıkmam 😅',
  'İyi bir pizza ve kötü bir film. Başka ne lazım?',
  'Kedim benden daha popüler. Onunla anlaşman şart 🐱',
  'Spontane geziler ve gün batımı fotoğrafları 🌅',
  'Sabah 6’da spor salonundayım. Sen de mi?',
  'Kitap önerisi ver, ben de sana şarkı önereyim 🎶',
  'Espri anlayışı olmayanlar sola kaydırsın lütfen',
  'Deniz kenarında büyüdüm, hâlâ denizsiz yapamam 🌊',
  'Yemek yapmayı severim, yemeyi daha çok 🍝',
  'Ciddi bir ilişki arıyorum. Oyun yok, dürüstlük var.',
  'Konserler, festivaller, kalabalık masalar 🎉',
  'Önce arkadaş olalım, sonrası kendiliğinden gelir.',
  'Gece kuşuyum. Saat 2’de mesaj atarsan cevap veririm 🦉',
  'Hayat kısa, tatlıyı önce ye 🍰',
  'Dünyanın 20 ülkesini gezdim, sıradaki rotayı birlikte seçelim ✈️',
  'Sakin bir akşam, iyi bir şarap ve uzun bir sohbet 🍷',
  'Sporcuları severim ama maç günü beni aramayın 😄',
];
const INTERESTS = ['🎵 Müzik', '✈️ Seyahat', '🍣 Suşi', '🐶 Köpekler', '🏖️ Plaj', '🎮 Oyun', '📚 Kitap', '🧘 Yoga', '🍷 Şarap', '⚽ Futbol', '🎨 Sanat', '🥊 MMA', '☕ Kahve', '🎬 Sinema', '🏋️ Spor', '📸 Fotoğraf', '🍳 Yemek', '💃 Dans'];
const PHOTO: [string, string][] = [
  ['#fd267a', '#ff6036'],
  ['#7b2ff7', '#f107a3'],
  ['#0f9b8e', '#1e3c72'],
  ['#f7971e', '#d4145a'],
  ['#4568dc', '#b06ab3'],
  ['#e65c00', '#8e0e00'],
  ['#11998e', '#38ef7d'],
  ['#c94b4b', '#4b134f'],
];
export const DECK_SIZE = 10;
const MALE = new Set(['Kaan', 'Arda', 'Ege']);
const FACES_F = ['👩', '👱‍♀️', '👩‍🦰', '👩‍🦱', '👩🏽', '👩🏻', '👩🏾‍🦱', '👩🏼‍🦰'];
const FACES_M = ['👨', '👱‍♂️', '👨‍🦱', '🧔', '👨🏽', '👨🏻‍🦰'];
const FACES_N = ['🧑', '🧑‍🦱', '🧑🏽', '👱'];
const faceFor = (ad: string) => pick(MALE.has(ad) ? FACES_M : ad === 'Deniz' ? FACES_N : FACES_F);

function newCandidate(s: GameState, taken: string[]): Candidate {
  const [meslek, emoji, unlu] = pick(JOBS);
  const free = NAMES.filter((n) => !taken.includes(n));
  const ilgi: string[] = [];
  while (ilgi.length < 3) {
    const i = pick(INTERESTS);
    if (!ilgi.includes(i)) ilgi.push(i);
  }
  const ad = pick(free.length ? free : NAMES);
  return {
    id: uid(),
    ad,
    foto: faceFor(ad),
    yas: randInt(21, 34),
    meslek,
    emoji,
    uyum: randInt(25, 95),
    unlu,
    seviye: 0,
    bio: pick(BIOS),
    ilgi,
    renk: pick(PHOTO),
    mesafe: randInt(1, 25),
  };
}

export const matches = (s: GameState) => s.eslesmeler ?? [];

/** Haftalık kaydırma destesi: her hafta yeni profiller. */
export function deck(s: GameState): Candidate[] {
  if (s.adaylar && s.adaylar.hafta === s.hafta) return s.adaylar.list;
  const taken = matches(s).map((c) => c.ad);
  const list: Candidate[] = [];
  while (list.length < DECK_SIZE) {
    const c = newCandidate(s, [...taken, ...list.map((x) => x.ad)]);
    list.push(c);
  }
  s.adaylar = { hafta: s.hafta, list, super: false };
  return list;
}
/** Eski adıyla da çağrılabilsin. */
export const candidates = deck;

/** Eşleşme ihtimali: uyum, popülerlik; ünlüler daha seçici. */
export function matchChance(s: GameState, c: Candidate, superLike = false) {
  return clamp(c.uyum / 130 + s.populerlik / 250 + (c.unlu ? -0.12 : 0.05) + (superLike ? 0.35 : 0), 0.1, 0.95);
}

export type SwipeDir = 'sol' | 'sag' | 'super';

/** Profili kaydır. Sağa (ya da süper beğeni) kaydırınca eşleşme şansı var. */
export function swipe(s: GameState, id: string, dir: SwipeDir): { eslesme: boolean; aday?: Candidate } {
  const d = deck(s);
  const c = d.find((x) => x.id === id);
  if (!c) return { eslesme: false };
  s.adaylar!.list = d.filter((x) => x.id !== id);
  if (dir === 'sol') return { eslesme: false };
  if (dir === 'super') {
    if (s.adaylar!.super) return { eslesme: false };
    s.adaylar!.super = true;
  }
  if (!chance(matchChance(s, c, dir === 'super'))) return { eslesme: false };
  const list = [c, ...matches(s)];
  // Liste şişmesin: en eski, ilerlemeyen eşleşmeler düşer.
  while (list.length > 12) {
    const drop = [...list].reverse().find((x) => x.seviye < 30 && x.id !== s.iliski?.id);
    if (!drop) break;
    list.splice(list.indexOf(drop), 1);
  }
  s.eslesmeler = list;
  bump(s, 'eslesme');
  return { eslesme: true, aday: c };
}

export function unmatch(s: GameState, id: string): string {
  const c = matches(s).find((x) => x.id === id);
  if (!c || s.iliski?.id === id) return '';
  s.eslesmeler = matches(s).filter((x) => x.id !== id);
  return `${c.ad} ile eşleşmeyi kaldırdın.`;
}

function cheatCheck(s: GameState, c: Candidate): string {
  if (!s.iliski || s.iliski.id === c.id) return '';
  if (!chance(0.3)) return '\n\n🤫 Sevgilin bir şeylerden şüpheleniyor…';
  const eski = s.iliski.ad;
  s.iliski = undefined;
  s.motivasyon = -2;
  const v = pop(s, -3);
  lifestylePost(s, 'başka biriyle yakalanırken');
  return `\n\n💔 YAKALANDIN! ${eski} seni ${c.ad} ile gördü ve ilişkiyi bitirdi. Magazin manşetleri hazır. (Popülerlik ${v}, motivasyon düştü)`;
}

export function goOnDate(s: GameState, id: string, tier: number): string {
  const c = matches(s).find((x) => x.id === id);
  if (!c) return '';
  const t = DATE_TIERS[tier];
  const cost = tier === 3 && yatVar(s) ? 1500 : t.fiyat;
  if (s.para < cost) return 'Paran yetmiyor.';
  s.para -= cost;
  const p = clamp(c.uyum / 150 + t.bonus + s.populerlik / 300, 0.1, 0.95);
  let msg: string;
  if (chance(p)) {
    const g = randInt(12, 22) + tier * 5;
    c.seviye = clamp(c.seviye + g, 0, 100);
    msg = pick([`${c.ad} ile harika bir ${t.ad.toLocaleLowerCase('tr-TR')}! Kahkahalar, uzun sohbetler.`, `${c.ad} seninle vakit geçirmekten çok keyif aldı.`, `Aranızda gerçek bir kıvılcım var. ${c.ad} tekrar görüşmek istiyor.`]) + ` (İlişki +${g})`;
    s.motivasyon = Math.min(2, s.motivasyon + (tier >= 2 ? 1 : 0));
  } else {
    c.seviye = clamp(c.seviye - 5, 0, 100);
    msg = pick([`${c.ad} telefonuyla ilgilendi durdu. Soğuk bir akşamdı.`, `Konu sürekli dövüşe geldi, ${c.ad} sıkıldı.`, `${c.ad} erken kalkmak zorunda olduğunu söyledi…`]);
  }
  if (c.unlu && chance(0.4)) {
    const v = pop(s, 2);
    lifestylePost(s, `ünlü ${c.meslek.toLocaleLowerCase('tr-TR')} ${c.ad} ile`);
    msg += `\n📸 Paparazziler sizi görüntüledi! (Popülerlik +${v})`;
  }
  return msg + cheatCheck(s, c);
}

export function spendNight(s: GameState, id: string): string {
  const c = matches(s).find((x) => x.id === id);
  if (!c || c.seviye < 30) return '';
  const partner = s.iliski?.id === c.id;
  const ad = riskyAct(s, partner ? 0.15 : 1.5);
  c.seviye = clamp(c.seviye + 8, 0, 100);
  s.motivasyon = Math.min(2, s.motivasyon + 1);
  return `${c.ad} ile geceyi birlikte geçirdiniz.${partner ? '' : ' Tek gecelik bir kaçamak mıydı, yoksa bir başlangıç mı?'}` + cheatCheck(s, c) + disease(ad);
}

export function makePartner(s: GameState, id: string): string {
  const c = matches(s).find((x) => x.id === id);
  if (!c || c.seviye < 70) return '';
  s.iliski = { id: c.id, ad: c.ad, meslek: c.meslek, emoji: c.foto ?? c.emoji, durum: 'sevgili', hafta: s.hafta };
  bump(s, 'sevgili');
  const v = pop(s, c.unlu ? 4 : 2);
  lifestylePost(s, `yeni sevgilisi ${c.ad} ile el ele`);
  return `💞 ${c.ad} artık sevgilin! Kamp motivasyonu +1. (Popülerlik +${v})`;
}

export function breakUp(s: GameState): string {
  if (!s.iliski) return '';
  const ad = s.iliski.ad;
  s.iliski = undefined;
  s.motivasyon = Math.max(-2, s.motivasyon - 1);
  return `${ad} ile yollarınızı ayırdınız. Zor bir veda. (Motivasyon -1)`;
}

export function treatDisease(s: GameState): string {
  if (!s.hastalik || s.hastalik.tedaviBitis) return '';
  const c = treatmentCost(s);
  if (s.para < c) return `Tedavi ${$(c)}. Paran yetmiyor.`;
  s.para -= c;
  const weeks = s.hastalik.ad.includes('Frengi') ? 4 : s.hastalik.ad.includes('HSV') ? 3 : 2;
  s.hastalik.tedaviBitis = s.hafta + weeks;
  return `Doktora gittin, tedavi başladı (${$(c)}). ${weeks} hafta içinde tamamen iyileşeceksin. Bu sürede riskli davranışlardan uzak dur.`;
}
