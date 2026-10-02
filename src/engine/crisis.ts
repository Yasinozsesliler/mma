// Sosyal medya krizleri: gündem ısısı yükselir, oyuncu iki tur cevap verir. Isıyı söndürürse kriz fırsata döner,
// patlarsa popülerlik, takipçi ve imaj maddeli sponsorlar gider. Görmezden gelinen kriz her hafta büyür.
import { L } from '../i18n';
import { addFollowers, fmtDelta, followers } from './fame';
import { chance, clamp, pick, rand, randInt } from './rng';
import { scandal } from './sponsors';
import type { GameState } from './types';

export type CrisisType = 'eskiPaylasim' | 'kesilmisVideo' | 'taraftarBaskini' | 'paparazzi' | 'sahteHaber';
export type CrisisReply = 'ozur' | 'espri' | 'sert' | 'sessiz' | 'kanit' | 'pr';
export type CrisisResult = 'firsat' | 'kapandi' | 'hasar' | 'patladi';

export interface Crisis {
  tur: CrisisType;
  isi: number;
  /** Verilen cevaplar (en fazla 2) */
  cevaplar: CrisisReply[];
  yorumlar: string[];
  hafta: number;
  sonuc?: CrisisResult;
  ozet?: string;
}

type Def = {
  baslik: () => string;
  metin: (s: GameState) => string;
  kanit: () => string;
  /** Cevabın ısıya etkisi (eksi söndürür) */
  etki: Record<CrisisReply, number>;
};

const DEFS: Record<CrisisType, Def> = {
  eskiPaylasim: {
    baslik: () => L("Eski paylaşımın ortaya çıktı"),
    metin: (s) => L("Yıllar önce attığın tartışmalı bir paylaşımı biri buldu. #{0}Özür etiketi gündemde.", [s.fighter.soyad.replace(/\s/g, '')]),
    kanit: () => L("Bağlamı açıkla"),
    etki: { ozur: -38, espri: 12, sert: 28, sessiz: 6, kanit: -12, pr: -40 },
  },
  kesilmisVideo: {
    baslik: () => L("Sözlerin bağlamından koparıldı"),
    metin: () => L("Bir röportajından kesilen 8 saniyelik video, taraftarlarını aşağıladığın şeklinde yayılıyor."),
    kanit: () => L("Videonun tamamını paylaş"),
    etki: { ozur: -18, espri: -12, sert: 18, sessiz: 8, kanit: -42, pr: -30 },
  },
  taraftarBaskini: {
    baslik: () => L("Rakip taraftarlar hesabını bastı"),
    metin: (s) => L("{0} taraftarları her paylaşımının altını palyaço emojisiyle dolduruyor. Caps'ler havada uçuşuyor.", [s.pending.rakip?.soyad ?? s.bolum?.liste[0]?.soyad ?? L("Rakip")]),
    kanit: () => L("Antrenman videosuyla cevap ver"),
    etki: { ozur: 10, espri: -36, sert: 22, sessiz: -14, kanit: -20, pr: -22 },
  },
  paparazzi: {
    baslik: () => L("Gece kulübünde görüntülendin"),
    metin: () => L("Dün gece kulüpte çekilen fotoğrafların yayıldı. “Kampa böyle mi hazırlanıyor?” diye soruluyor."),
    kanit: () => L("Sabah antrenmanının videosunu paylaş"),
    etki: { ozur: -24, espri: -16, sert: 22, sessiz: 2, kanit: -36, pr: -30 },
  },
  sahteHaber: {
    baslik: () => L("Hakkında yalan haber yayıldı"),
    metin: () => L("Bir sayfa doping testinden kaldığını iddia etti. Haber binlerce kez paylaşıldı."),
    kanit: () => L("Test sonuçlarını paylaş"),
    etki: { ozur: 26, espri: -8, sert: -12, sessiz: 16, kanit: -45, pr: -32 },
  },
};

export const crisisTitle = (c: Crisis) => DEFS[c.tur].baslik();
export const crisisText = (s: GameState, c: Crisis) => DEFS[c.tur].metin(s);

export function prCost(s: GameState) {
  return Math.max(500, Math.round((followers(s) * 0.03) / 100) * 100);
}

export function crisisReplies(s: GameState, c: Crisis): { id: CrisisReply; label: string; maliyet?: number }[] {
  const out: { id: CrisisReply; label: string; maliyet?: number }[] = [
    { id: 'ozur', label: L("Özür dile") },
    { id: 'espri', label: L("Espriyle karşıla") },
    { id: 'sert', label: L("Sert çık") },
    { id: 'sessiz', label: L("Sessiz kal") },
    { id: 'kanit', label: DEFS[c.tur].kanit() },
  ];
  if (!c.cevaplar.includes('pr')) out.push({ id: 'pr', label: L("PR ajansına bırak"), maliyet: prCost(s) });
  return out;
}

const UP = [L("Bu iş büyüyor… 😬"), L("Daha da kötü oldu, yorumlar alev alev."), L("Herkes ekran görüntüsü alıyor."), L("Gazeteciler aramaya başladı.")];
const DOWN = [L("Taraftarlar arkanda: “Doğru cevap!” 👏"), L("Gündem soğumaya başladı."), L("Yorumların çoğu artık senden yana."), L("Bunu iyi idare ettin, dediler.")];
const FLAT = [L("Kimse ikna olmadı, kimse de unutmadı."), L("Tartışma sürüyor.")];

/** Krizi başlatır (zaten süren kriz varsa ya da yakın zamanda olduysa başlamaz). */
export function maybeCrisis(s: GameState, weeks = 1) {
  // Kampta başlayan kriz kamp bitene kadar büyümez; iki kriz arasında en az 20 hafta
  if (s.kriz || s.stage === 'amator' || followers(s) < 2000) return;
  if (s.krizSon != null && s.hafta - s.krizSon < 20) return;
  const p = 1 - Math.pow(1 - (0.012 + (s.gece?.risk ?? 0) / 1500 + (s.trashTalk ? 0.006 : 0)), weeks);
  if (!chance(p)) return;
  const pool: CrisisType[] = ['eskiPaylasim', 'kesilmisVideo', 'taraftarBaskini', 'sahteHaber'];
  if ((s.gece?.ziyaret ?? 0) > 0) pool.push('paparazzi', 'paparazzi');
  s.kriz = { tur: pick(pool), isi: randInt(45, 65), cevaplar: [], yorumlar: [], hafta: s.hafta };
  s.krizSon = s.hafta;
  s.haberler.unshift(L("🔥 Sosyal medya krizi: {0}", [crisisTitle(s.kriz)]));
}

/** Belirli bir krizi hemen başlat (ör. podcastte tartışmalı söz). Süren kriz varsa başlamaz. */
export function forceCrisis(s: GameState, tur: CrisisType): boolean {
  if (s.kriz) return false;
  s.kriz = { tur, isi: randInt(50, 68), cevaplar: [], yorumlar: [], hafta: s.hafta };
  s.krizSon = s.hafta;
  s.haberler.unshift(L("🔥 Sosyal medya krizi: {0}", [crisisTitle(s.kriz)]));
  return true;
}

/** Görmezden gelinen kriz büyür; ısı tavan yaparsa kendiliğinden patlar. */
export function crisisTick(s: GameState, weeks = 1) {
  const c = s.kriz;
  if (!c || c.sonuc || s.pending.kamp) return;
  c.isi = clamp(c.isi + Math.min(18, 6 * weeks), 0, 100);
  if (c.isi >= 100) finish(s, c, 'patladi');
}

export function answerCrisis(s: GameState, r: CrisisReply) {
  const c = s.kriz;
  if (!c || c.sonuc) return;
  if (r === 'pr') {
    const cost = prCost(s);
    if (s.para < cost) return;
    s.para -= cost;
  }
  let d = DEFS[c.tur].etki[r] + randInt(-8, 8);
  // Aynı cevabı tekrarlamak yarı etkili
  if (c.cevaplar.includes(r)) d = Math.round(d * 0.5);
  // Popüler dövüşçünün sesi daha çok duyulur (iyi de, kötü de)
  d = Math.round(d * (1 + s.populerlik / 300));
  c.isi = clamp(c.isi + d, 0, 100);
  c.cevaplar.push(r);
  c.yorumlar = [d < -10 ? pick(DOWN) : d > 8 ? pick(UP) : pick(FLAT)];
  if (c.isi <= 20) finish(s, c, 'firsat');
  else if (c.isi >= 85) finish(s, c, 'patladi');
  else if (c.cevaplar.length >= 2) finish(s, c, c.isi < 45 ? 'kapandi' : 'hasar');
}

function finish(s: GameState, c: Crisis, sonuc: CrisisResult) {
  c.sonuc = sonuc;
  const F = followers(s);
  const fmt = fmtDelta;
  if (sonuc === 'firsat') {
    const d = addFollowers(s, F * (0.03 + rand() * 0.03));
    s.populerlik = clamp(s.populerlik + 2, 0, 100);
    c.ozet = L("Krizi fırsata çevirdin! Cevabın viral oldu. Popülerlik +2, {0} takipçi.", [fmt(d)]);
  } else if (sonuc === 'kapandi') {
    c.ozet = L("Kriz kapandı. Kimse artık konuşmuyor.");
  } else if (sonuc === 'hasar') {
    const d = addFollowers(s, -F * (0.02 + rand() * 0.02));
    s.populerlik = clamp(s.populerlik - 2, 0, 100);
    c.ozet = L("Kriz yara bıraktı. Popülerlik -2, {0} takipçi.", [fmt(d)]);
  } else {
    const d = addFollowers(s, -F * (0.06 + rand() * 0.04));
    s.populerlik = clamp(s.populerlik - 5, 0, 100);
    s.motivasyon = clamp(s.motivasyon - 1, -2, 2);
    const sp = scandal(s);
    c.ozet = L("Kriz patladı! Popülerlik -5, {0} takipçi, motivasyon düştü.", [fmt(d)]) + (sp.length ? ` ${sp.join(' ')}` : '');
  }
  s.haberler.unshift(`📱 ${crisisTitle(c)}: ${c.ozet}`);
}

/** Sonuç görüldükten sonra kriz kartını kapat. */
export function closeCrisis(s: GameState) {
  if (s.kriz?.sonuc) s.kriz = undefined;
}
