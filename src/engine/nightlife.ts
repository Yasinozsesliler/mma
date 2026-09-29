// Gece hayatı: striptiz kulübü ve randevular. Eğlencenin bedeli: para, disiplin, skandal ve sağlık riski.
import { L, LOC } from '../i18n';
import { addStat } from './character';
import { riskyAct, treatmentCost } from './nightlifeCore';
import { chance, clamp, pick, randInt, uid } from './rng';
import { lifestylePost } from './social';
import { bump } from './istat';
import { prAdjust } from './staff';
import type { GameState } from './types';

const $ = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;
const pop = (s: GameState, d: number) => {
  const v = prAdjust(s, d);
  s.populerlik = clamp(s.populerlik + v, 0, 100);
  return v;
};
const disease = (ad: string | null) => (ad ? L("\n\n⚠️ Birkaç gün sonra kendini iyi hissetmiyorsun… Doktor: {0}. Tedavi olman gerekiyor.", [ad]) : '');

// ---------- Striptiz kulübü ----------

export const STRIP_OPTIONS = [
  { ad: L("Sadece izle"), aciklama: L("Bir içki, birkaç saat. Az masraf, az risk."), ikon: 'glass-cocktail', fiyat: [300, 800, 2000, 4000] },
  { ad: L("VIP özel oda"), aciklama: L("Kapalı kapılar ardında. Yüksek sağlık riski."), ikon: 'door-closed-lock', fiyat: [1500, 4000, 10000, 20000] },
  { ad: L("Şampanya gecesi"), aciklama: L("Para yağmuru, ünlüler, kameralar. Popülerlik ya da skandal."), ikon: 'bottle-wine', fiyat: [3000, 10000, 30000, 60000] },
] as const;

const stageIdx = (s: GameState) => ['amator', 'bolgesel', 'buyuk', 'ufc'].indexOf(s.stage);
export const stripPrice = (s: GameState, i: number) => STRIP_OPTIONS[i].fiyat[stageIdx(s)];

export function visitStripClub(s: GameState, i: number): string {
  const cost = stripPrice(s, i);
  if (s.para < cost) return L("Paran yetmiyor.");
  s.para -= cost;
  s.motivasyon = Math.min(2, s.motivasyon + 1);
  let msg: string;
  let ad: string | null;
  if (i === 0) {
    ad = riskyAct(s, 0.3);
    msg = pick([L("Loş ışıklar, yüksek müzik. Kafanı dağıttın."), L("Birkaç saat stres attın. Sabah kalkmak zor oldu.")]);
  } else if (i === 1) {
    ad = riskyAct(s, 1.2);
    msg = pick([L("VIP odada gece uzadı… Sabah salona geç kaldın."), L("Özel odada saatler geçti. Pahalı ve riskli bir geceydi.")]);
  } else {
    ad = riskyAct(s, 1);
    if (chance(0.45)) {
      const v = pop(s, -3);
      lifestylePost(s, L("striptiz kulübünde para saçarken"));
      msg = L("Havaya para saçtın, kameralar her yerde. Magazin seni yerden yere vurdu. (Popülerlik {0})", [v]);
    } else {
      const v = pop(s, 2);
      msg = L("Ünlülerle masadaydın, “parti kralı” etiketin viral oldu. (Popülerlik +{0})", [v]);
    }
  }
  if (chance(i === 0 ? 0.25 : 0.5)) {
    addStat(s.fighter.stats, 'kondisyon', -1);
    msg += L("\nUykusuzluk ve alkol: Kondisyon -1.");
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

const NAMES = [L("Derya"), L("Melis"), L("Aslı"), L("Cansu"), L("Buse"), L("İrem"), L("Ceren"), L("Ezgi"), L("Lara"), L("Sofia"), L("Mia"), L("Elena"), L("Nadia"), L("Yasmin"), L("Kaan"), L("Deniz"), L("Arda"), L("Ege"), L("Jade"), L("Chloe")];
/** Kadın dövüşçünün randevu destesi. */
const NAMES_M = [L("Kaan"), L("Arda"), L("Ege"), L("Deniz"), L("Mert"), L("Can"), L("Emir"), L("Onur"), L("Luca"), L("Mateo"), L("Adam"), L("Noah"), L("Leo"), L("Marco"), L("Yusuf"), L("Alex")];
const JOBS: [string, string, boolean][] = [
  [L("Model"), '💃', true],
  [L("Doktor"), '🩺', false],
  [L("Avukat"), '⚖️', false],
  [L("Fitness eğitmeni"), '🏋️', false],
  [L("Şarkıcı"), '🎤', true],
  [L("Oyuncu"), '🎬', true],
  [L("Influencer"), '📱', true],
  [L("Öğretmen"), '📚', false],
  [L("Mimar"), '📐', false],
  [L("Hemşire"), '💉', false],
  [L("Barmen"), '🍸', false],
  [L("Gazeteci"), '📰', false],
];

export const DATE_TIERS = [
  { ad: L("Kahve"), fiyat: 50, bonus: 0, ikon: 'coffee' },
  { ad: L("Akşam yemeği"), fiyat: 400, bonus: 0.1, ikon: 'silverware-fork-knife' },
  { ad: L("Lüks restoran"), fiyat: 2500, bonus: 0.2, ikon: 'glass-wine' },
  { ad: L("Yat turu"), fiyat: 15000, bonus: 0.3, ikon: 'sail-boat' },
];

export const yatVar = (s: GameState) => (s.envanter ?? []).includes('yat');

const BIOS = [
  L("Hafta sonları dağ yürüyüşü, hafta içi kahve bağımlısı ☕"),
  L("Dövüş izlemeyi severim ama ringe çıkmam 😅"),
  L("İyi bir pizza ve kötü bir film. Başka ne lazım?"),
  L("Kedim benden daha popüler. Onunla anlaşman şart 🐱"),
  L("Spontane geziler ve gün batımı fotoğrafları 🌅"),
  L("Sabah 6’da spor salonundayım. Sen de mi?"),
  L("Kitap önerisi ver, ben de sana şarkı önereyim 🎶"),
  L("Espri anlayışı olmayanlar sola kaydırsın lütfen"),
  L("Deniz kenarında büyüdüm, hâlâ denizsiz yapamam 🌊"),
  L("Yemek yapmayı severim, yemeyi daha çok 🍝"),
  L("Ciddi bir ilişki arıyorum. Oyun yok, dürüstlük var."),
  L("Konserler, festivaller, kalabalık masalar 🎉"),
  L("Önce arkadaş olalım, sonrası kendiliğinden gelir."),
  L("Gece kuşuyum. Saat 2’de mesaj atarsan cevap veririm 🦉"),
  L("Hayat kısa, tatlıyı önce ye 🍰"),
  L("Dünyanın 20 ülkesini gezdim, sıradaki rotayı birlikte seçelim ✈️"),
  L("Sakin bir akşam, iyi bir şarap ve uzun bir sohbet 🍷"),
  L("Sporcuları severim ama maç günü beni aramayın 😄"),
];
const INTERESTS = [L("🎵 Müzik"), L("✈️ Seyahat"), L("🍣 Suşi"), L("🐶 Köpekler"), L("🏖️ Plaj"), L("🎮 Oyun"), L("📚 Kitap"), L("🧘 Yoga"), L("🍷 Şarap"), L("⚽ Futbol"), L("🎨 Sanat"), L("🥊 MMA"), L("☕ Kahve"), L("🎬 Sinema"), L("🏋️ Spor"), L("📸 Fotoğraf"), L("🍳 Yemek"), L("💃 Dans")];
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
const MALE = new Set([L("Kaan"), L("Arda"), L("Ege"), ...NAMES_M.filter((n) => n !== L("Deniz"))]);
const FACES_F = ['👩', '👱‍♀️', '👩‍🦰', '👩‍🦱', '👩🏽', '👩🏻', '👩🏾‍🦱', '👩🏼‍🦰'];
const FACES_M = ['👨', '👱‍♂️', '👨‍🦱', '🧔', '👨🏽', '👨🏻‍🦰'];
const FACES_N = ['🧑', '🧑‍🦱', '🧑🏽', '👱'];
const faceFor = (ad: string) => pick(MALE.has(ad) ? FACES_M : ad === L("Deniz") ? FACES_N : FACES_F);

function newCandidate(s: GameState, taken: string[]): Candidate {
  const [meslek, emoji, unlu] = pick(JOBS);
  const pool = s.fighter.kadin ? NAMES_M : NAMES;
  const free = pool.filter((n) => !taken.includes(n));
  const ilgi: string[] = [];
  while (ilgi.length < 3) {
    const i = pick(INTERESTS);
    if (!ilgi.includes(i)) ilgi.push(i);
  }
  const ad = pick(free.length ? free : pool);
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
  return L("{0} ile eşleşmeyi kaldırdın.", [c.ad]);
}

function cheatCheck(s: GameState, c: Candidate): string {
  if (!s.iliski || s.iliski.id === c.id) return '';
  if (!chance(0.3)) return L("\n\n🤫 Sevgilin bir şeylerden şüpheleniyor…");
  const eski = s.iliski.ad;
  s.iliski = undefined;
  s.motivasyon = -2;
  const v = pop(s, -3);
  lifestylePost(s, L("başka biriyle yakalanırken"));
  return L("\n\n💔 YAKALANDIN! {0} seni {1} ile gördü ve ilişkiyi bitirdi. Magazin manşetleri hazır. (Popülerlik {2}, motivasyon düştü)", [eski, c.ad, v]);
}

export function goOnDate(s: GameState, id: string, tier: number): string {
  const c = matches(s).find((x) => x.id === id);
  if (!c) return '';
  const t = DATE_TIERS[tier];
  const cost = tier === 3 && yatVar(s) ? 1500 : t.fiyat;
  if (s.para < cost) return L("Paran yetmiyor.");
  s.para -= cost;
  const p = clamp(c.uyum / 150 + t.bonus + s.populerlik / 300, 0.1, 0.95);
  let msg: string;
  if (chance(p)) {
    const g = randInt(12, 22) + tier * 5;
    c.seviye = clamp(c.seviye + g, 0, 100);
    msg = pick([L("{0} ile harika bir {1}! Kahkahalar, uzun sohbetler.", [c.ad, t.ad.toLocaleLowerCase(LOC)]), L("{0} seninle vakit geçirmekten çok keyif aldı.", [c.ad]), L("Aranızda gerçek bir kıvılcım var. {0} tekrar görüşmek istiyor.", [c.ad])]) + L(" (İlişki +{0})", [g]);
    s.motivasyon = Math.min(2, s.motivasyon + (tier >= 2 ? 1 : 0));
  } else {
    c.seviye = clamp(c.seviye - 5, 0, 100);
    msg = pick([L("{0} telefonuyla ilgilendi durdu. Soğuk bir akşamdı.", [c.ad]), L("Konu sürekli dövüşe geldi, {0} sıkıldı.", [c.ad]), L("{0} erken kalkmak zorunda olduğunu söyledi…", [c.ad])]);
  }
  if (c.unlu && chance(0.4)) {
    const v = pop(s, 2);
    lifestylePost(s, L("ünlü {0} {1} ile", [c.meslek.toLocaleLowerCase(LOC), c.ad]));
    msg += L("\n📸 Paparazziler sizi görüntüledi! (Popülerlik +{0})", [v]);
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
  return L("{0} ile geceyi birlikte geçirdiniz.{1}", [c.ad, partner ? '' : L(" Tek gecelik bir kaçamak mıydı, yoksa bir başlangıç mı?")]) + cheatCheck(s, c) + disease(ad);
}

export function makePartner(s: GameState, id: string): string {
  const c = matches(s).find((x) => x.id === id);
  if (!c || c.seviye < 70) return '';
  s.iliski = { id: c.id, ad: c.ad, meslek: c.meslek, emoji: c.foto ?? c.emoji, durum: 'sevgili', hafta: s.hafta };
  bump(s, 'sevgili');
  const v = pop(s, c.unlu ? 4 : 2);
  lifestylePost(s, L("yeni sevgilisi {0} ile el ele", [c.ad]));
  return L("💞 {0} artık sevgilin! Kamp motivasyonu +1. (Popülerlik +{1})", [c.ad, v]);
}

export function breakUp(s: GameState): string {
  if (!s.iliski) return '';
  const ad = s.iliski.ad;
  s.iliski = undefined;
  s.motivasyon = Math.max(-2, s.motivasyon - 1);
  return L("{0} ile yollarınızı ayırdınız. Zor bir veda. (Motivasyon -1)", [ad]);
}

export function treatDisease(s: GameState): string {
  if (!s.hastalik || s.hastalik.tedaviBitis) return '';
  const c = treatmentCost(s);
  if (s.para < c) return L("Tedavi {0}. Paran yetmiyor.", [$(c)]);
  s.para -= c;
  const weeks = s.hastalik.ad.includes(L("Frengi")) ? 4 : s.hastalik.ad.includes('HSV') ? 3 : 2;
  s.hastalik.tedaviBitis = s.hafta + weeks;
  return L("Doktora gittin, tedavi başladı ({0}). {1} hafta içinde tamamen iyileşeceksin. Bu sürede riskli davranışlardan uzak dur.", [$(c), weeks]);
}
