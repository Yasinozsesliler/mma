// Amatör Ligi: Şehir Ligi → Bölge Şampiyonası → Ulusal Turnuva. Puan topla, finale çık, madalyayı al, bir üst basamağa geç.
// Hızlı akar: maçlar arası kısa, yenilgi birkaç puan götürür ama kariyeri durdurmaz; takılan oyuncuya tecrübe kapısı açılır.
// Efsane Yolları, Meydan Okumalar ve bu sistemden önce başlamış kayıtlar eski kurala bağlı kalır (amLig yok ya da kapalı).
import { L, LOC } from '../i18n';
import { generateOpponent, riskText } from './opponents';
import { chance, randInt } from './rng';
import type { GameState, Opponent } from './types';

export interface AmatorLig {
  basamak: number;
  puan: number;
  /** Kazanılan madalyalar (basamak numaraları) */
  madalya: number[];
  /** Bu basamakta alınan yenilgi ve bitiriş (basamak atlama için) */
  kayip: number;
  bitiris: number;
  liste: Opponent[];
  puanlar: Record<string, number>;
  tamam?: boolean;
  /** Bir kez çıkan sahneler */
  kulup?: boolean;
  milli?: boolean;
  isSon?: number;
  gazete?: boolean;
  tarti?: boolean;
}

export const newLig = (): AmatorLig => ({ basamak: 0, puan: 0, madalya: [], kayip: 0, bitiris: 0, liste: [], puanlar: {} });

export const LIG_BASAMAK = [
  { ad: () => L("Şehir Ligi"), hedef: 5, para: 500, puan: 1, pop: 2 },
  { ad: () => L("Bölge Şampiyonası"), hedef: 6, para: 1200, puan: 2, pop: 4 },
  { ad: () => L("Ulusal Turnuva"), hedef: 6, para: 3000, puan: 3, pop: 6 },
];
const LISTE = 5;
const MADALYA = ['🥉', '🥈', '🥇'];

/** Takılan oyuncu için tecrübe kapısı: bu kadar galibiyetten sonra final kazanmadan da profesyonel teklif gelir. */
const tecrube = (s: GameState) => (s.fighter.yas >= 32 ? 5 : 9);
/** Oyuncu amatörde sıkılmasın: bu kadar maçtan sonra karne ne olursa olsun kapı açılır. */
const AZAMI_MAC = 16;

export const ligAcik = (s: GameState) => !!s.amLig && s.stage === 'amator' && !s.efsane && !s.meydan && !s.antrenor;
export const madalyaEmoji = (i: number) => MADALYA[i] ?? '🏅';

const yeniIsim = (s: GameState, l: AmatorLig) => {
  const o = generateOpponent(s, { zorluk: 0, org: 'amator' }, l.liste);
  l.puanlar[o.id] = randInt(0, Math.max(0, LIG_BASAMAK[l.basamak].hedef - 3));
  return o;
};

function ensureListe(s: GameState, l: AmatorLig) {
  const fought = new Set(s.gecmis.map((h) => h.rakipId));
  // Dövüşülen isim tablodan çıkar, yerine yeni isim gelir: aynı rakip dönüp durmaz.
  l.liste = l.liste.filter((o) => !fought.has(o.id));
  while (l.liste.length < LISTE) l.liste.push(yeniIsim(s, l));
}

const siraliBotlar = (l: AmatorLig) => [...l.liste].sort((a, b) => (l.puanlar[b.id] ?? 0) - (l.puanlar[a.id] ?? 0));

/** Tablodaki kimliği bu maçın gücüyle eşleştirir (zorluk seçime göre, stil üretilen güce göre). */
function teklif(s: GameState, l: AmatorLig, o: Opponent, z: -1 | 0 | 1, sira: number): Opponent {
  const g = generateOpponent(s, { zorluk: z, org: 'amator' }, l.liste);
  return { ...g, id: o.id, ad: o.ad, soyad: o.soyad, lakap: o.lakap, uyruk: o.uyruk, kisilik: o.kisilik, rekor: o.rekor, ligSira: sira, zorluk: z };
}

export const finalHazir = (s: GameState) => {
  const l = s.amLig;
  return !!l && !l.tamam && l.puan >= LIG_BASAMAK[l.basamak].hedef;
};

/** Rakip listesi: tablonun altı, ortası ve üstü. Puan yeterliyse üstteki seçenek finaldir (oyuncu isterse önce puan da toplayabilir). */
export function ligChoices(s: GameState): Opponent[] {
  const l = s.amLig!;
  ensureListe(s, l);
  // Bir önceki listede olmayanlar öne: aynı üç isim üst üste gelmesin.
  const once = new Set(s.sonTeklif ?? []);
  const taze = siraliBotlar(l).filter((o) => !once.has(o.id));
  const bots = taze.length >= 3 ? taze : siraliBotlar(l);
  const sira = (o: Opponent) => [...tablo(s)].findIndex((r) => r.o?.id === o.id) + 1;
  const kur = (o: Opponent, z: -1 | 0 | 1) => {
    const t = teklif(s, l, o, z, sira(o));
    t.etiket = z < 0 ? L("🟢 KOLAY") : z === 0 ? L("🟡 DENGELİ") : L("🔴 RİSKLİ");
    t.riskMetni = riskText(z, s.stage);
    return t;
  };
  const opts = [kur(bots[bots.length - 1], -1), kur(bots[Math.floor(bots.length / 2)], 0), kur(bots[0], 1)];
  if (finalHazir(s)) {
    const b = LIG_BASAMAK[l.basamak];
    opts[2].amFinal = true;
    opts[2].etiket = L("🏅 {0} FİNALİ", [b.ad().toLocaleUpperCase(LOC)]);
    opts[2].riskMetni = L("Kazanırsan madalya senin ve bir üst basamağa çıkarsın. Kaybedersen 2 puan gider, yeniden denersin.");
  }
  return opts;
}

export interface LigSatir {
  o?: Opponent;
  puan: number;
  sen?: boolean;
}

/** Görünen tablo: oyuncu puanına göre botların arasına yerleşir. */
export function tablo(s: GameState): LigSatir[] {
  const l = s.amLig;
  if (!l) return [];
  const rows: LigSatir[] = siraliBotlar(l).map((o) => ({ o, puan: l.puanlar[o.id] ?? 0 }));
  const i = rows.findIndex((r) => r.puan <= l.puan);
  rows.splice(i < 0 ? rows.length : i, 0, { puan: l.puan, sen: true });
  return rows;
}

/** Maç sonrası: puan, madalya, basamak geçişi. Maç sonu raporuna satır döner. */
export function ligAfterFight(s: GameState, opp: Opponent, won: boolean, draw: boolean, finish: boolean): string[] {
  if (!ligAcik(s) || (s.gp && !s.gp.bitti) || opp.ligSira == null) return [];
  const l = s.amLig!;
  const b = LIG_BASAMAK[l.basamak];
  const out: string[] = [];
  if (!won && !draw) l.kayip++;
  if (won && finish) l.bitiris++;
  if (opp.amFinal && won) {
    l.madalya.push(l.basamak);
    s.para += b.para;
    s.puan += b.puan;
    s.populerlik = Math.min(100, s.populerlik + b.pop);
    const msg = L("{0} {1} şampiyonu oldun! +${2}, +{3} gelişim puanı, popülerlik +{4}.", [madalyaEmoji(l.basamak), b.ad(), b.para.toLocaleString(LOC), b.puan, b.pop]);
    out.push(msg);
    s.haberler.unshift(msg);
    // Şehir Ligi'ni yenilgisiz ve iki bitirişle geçen Bölge Şampiyonası'nı atlar.
    const atla = l.basamak === 0 && l.kayip === 0 && l.bitiris >= 2;
    if (l.basamak >= LIG_BASAMAK.length - 1) l.tamam = true;
    else {
      l.basamak += atla ? 2 : 1;
      l.puan = 0;
      l.kayip = 0;
      l.bitiris = 0;
      l.liste = [];
      l.puanlar = {};
      out.push(atla ? L("⏩ Herkes konuşuyor: Bölge Şampiyonası'nı atladın, doğrudan {0}!", [LIG_BASAMAK[l.basamak].ad()]) : L("⬆️ Sıradaki basamak: {0}.", [LIG_BASAMAK[l.basamak].ad()]));
    }
    return out;
  }
  if (opp.amFinal && !draw) {
    l.puan = Math.max(0, l.puan - 2);
    out.push(L("Finali kaybettin. Yeniden denemek için {0}/{1} puan.", [l.puan, b.hedef]));
  } else if (!l.tamam) {
    const once = l.puan;
    const kaz = won ? (opp.zorluk === 1 ? 4 : opp.zorluk === -1 ? 2 : 3) + (finish ? 1 : 0) : draw ? 1 : -1;
    l.puan = Math.max(0, l.puan + kaz);
    if (l.puan !== once) out.push(L("🏅 {0}: {1}/{2} puan", [b.ad(), l.puan, b.hedef]));
    if (once < b.hedef && l.puan >= b.hedef) out.push(L("🔥 Finale çıkma hakkı kazandın! Sıradaki teklifte final var."));
  }
  // Tablodaki diğerleri de dövüşüyor
  l.liste.forEach((o) => {
    if (chance(0.5)) l.puanlar[o.id] = Math.min(b.hedef - 1, (l.puanlar[o.id] ?? 0) + randInt(1, 2));
  });
  return out;
}

/** Profesyonel kapısı açık mı? Bütün basamaklar ya da yeterli tecrübe. */
export const ligBitti = (s: GameState) => {
  const l = s.amLig;
  if (!l) return false;
  return !!l.tamam || (s.amator.g >= tecrube(s) && s.amator.g > s.amator.m) || s.amator.g + s.amator.m + s.amator.b >= AZAMI_MAC;
};

export const ligBitisMetni = (s: GameState) =>
  s.amLig?.tamam
    ? L("🥇 Ulusal şampiyonsun! Profesyonel organizasyonlar kapında sıraya girdi.")
    : L("Amatörde yeterince tecrübe kazandın. İki bölgesel organizasyon seni profesyonel kadrosuna istiyor!");

/** Yükseliş Grand Prix'i: ilk madalyadan sonra açılan kestirme yol. */
export const gpKapisi = (s: GameState) => (s.amLig?.madalya.length ?? 0) >= 1;
