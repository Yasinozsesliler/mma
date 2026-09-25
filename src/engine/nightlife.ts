// Gece hayatı: striptiz kulübü ve randevular. Eğlencenin bedeli: para, disiplin, skandal ve sağlık riski.
import { addStat } from './character';
import { riskyAct, treatmentCost } from './nightlifeCore';
import { chance, clamp, pick, randInt, uid } from './rng';
import { lifestylePost } from './social';
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

/** Her hafta yeni tanışma adayları (sevgili listede kalır). */
export function candidates(s: GameState): Candidate[] {
  if (s.adaylar && s.adaylar.hafta === s.hafta) return s.adaylar.list;
  const keep = s.adaylar?.list.filter((c) => c.seviye >= 30 || c.id === s.iliski?.id) ?? [];
  const list = [...keep];
  while (list.length < keep.length + 3) {
    const [meslek, emoji, unlu] = pick(JOBS);
    list.push({ id: uid(), ad: pick(NAMES.filter((n) => !list.some((c) => c.ad === n))), yas: randInt(21, 34), meslek, emoji, uyum: randInt(25, 95), unlu, seviye: 0 });
  }
  s.adaylar = { hafta: s.hafta, list: list.slice(0, 6) };
  return s.adaylar.list;
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
  const c = candidates(s).find((x) => x.id === id);
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
  const c = candidates(s).find((x) => x.id === id);
  if (!c || c.seviye < 30) return '';
  const partner = s.iliski?.id === c.id;
  const ad = riskyAct(s, partner ? 0.15 : 1.5);
  c.seviye = clamp(c.seviye + 8, 0, 100);
  s.motivasyon = Math.min(2, s.motivasyon + 1);
  return `${c.ad} ile geceyi birlikte geçirdiniz.${partner ? '' : ' Tek gecelik bir kaçamak mıydı, yoksa bir başlangıç mı?'}` + cheatCheck(s, c) + disease(ad);
}

export function makePartner(s: GameState, id: string): string {
  const c = candidates(s).find((x) => x.id === id);
  if (!c || c.seviye < 70) return '';
  s.iliski = { id: c.id, ad: c.ad, meslek: c.meslek, emoji: c.emoji, durum: 'sevgili', hafta: s.hafta };
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
