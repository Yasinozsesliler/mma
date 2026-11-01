// Hakem Modu: kafesin içindeki üçüncü kişi sensin. Maç anlar hâlinde akar; sarsılan dövüşçü, sıkılan kilit, faul,
// kesik ve kafeste durgunluk anlarında kararı sen verirsin. Raunt sonlarında ekrandaki istatistiklerle puan kartını
// doldurursun. Doğruluk refleksten değil, okumaktan gelir: her anın ipuçları gerçeği yansıtır, "gri" anlarda iki
// karar da kabul edilir. İtibar yükseldikçe amatör gecelerden UCC şampiyonluk maçlarına çıkarsın.
import { L } from '../i18n';
import { BACKGROUNDS, femSurname, NAME_POOLS } from './data';
import { chance, clamp, noise, pick, rand, randInt } from './rng';
import type { Background } from './types';

export type RefTier = 'amator' | 'bolgesel' | 'buyuk' | 'ucc';
export const REF_TIERS: RefTier[] = ['amator', 'bolgesel', 'buyuk', 'ucc'];
export const TIER_NAME: Record<RefTier, () => string> = {
  amator: () => L("Amatör geceler"),
  bolgesel: () => L("Bölgesel organizasyonlar"),
  buyuk: () => L("Büyük organizasyonlar"),
  ucc: () => L("UCC"),
};
/** Terfi: itibar ve yönetilen maç sayısı */
const PROMOTE: Record<RefTier, [number, number] | null> = { amator: [30, 6], bolgesel: [55, 14], buyuk: [75, 24], ucc: null };
const BASE: Record<RefTier, number> = { amator: 48, bolgesel: 58, buyuk: 67, ucc: 76 };
/** Deneme: ilk bu kadar maç ücretsiz */
export const REF_TRIAL = 3;
export const YEAR_BOUTS = 10;

export type RefFighter = { ad: string; ulke: string; stil: Background; vurus: number; gures: number; yer: number; cene: number; kond: number; rekor: string };
type Side = 0 | 1;

export type MomentKind = 'sarsildi' | 'kilit' | 'faul' | 'kesik' | 'durgun';
/** Anın gerçeği: 'dur' durdurulmalı, 'devam' sürmeli, 'gri' ikisi de kabul; faulde doğru yaptırım */
export type Truth = 'dur' | 'devam' | 'gri' | 'uyar' | 'puan' | 'dq' | 'doktor' | 'ayir';
export type Moment = { kind: MomentKind; side: Side; truth: Truth; ipuclari: string[]; secenekler: { key: Truth | 'bekle'; ad: string }[]; metin: string };

export type RoundStats = { sig: [number, number]; td: [number, number]; ctrl: [number, number]; kd: [number, number] };
export type Card = '10-9a' | '10-9b' | '10-8a' | '10-8b' | '10-10';

export type RefBout = {
  a: RefFighter;
  b: RefFighter;
  maxRaunt: 3 | 5;
  unvan: boolean;
  raunt: number;
  beat: number;
  hp: [number, number];
  sta: [number, number];
  log: string[];
  stats: RoundStats;
  /** Bu rauntta yaşanan faul sayısı (tekrar eden faul daha ağır) */
  faul: [number, number];
  /** Raunttan düşülen puanlar */
  ceza: [number, number];
  an?: Moment;
  /** Raunt bitti, puan kartı bekleniyor */
  kart?: boolean;
  kartlar: { benim: Card; dogru: Card }[];
  kararlar: { kind: MomentKind; puan: number; not: string }[];
  /** Kesik var mı (doktor anı bir kez) */
  kesik?: Side;
  sonuc?: { kazanan: Side | null; yontem: string; raunt: number };
};

export type RefRun = {
  ad: string;
  soyad: string;
  itibar: number;
  seviye: RefTier;
  mac: number;
  /** Bu yılki maçlar ve puanları */
  yilMac: number;
  yilPuan: number;
  yil: number;
  dogru: number;
  yanlis: number;
  kusursuz: number;
  unvanMaci: number;
  oduller: string[];
  gecmis: { a: string; b: string; not: string; puan: number; tier: RefTier }[];
  /** Deneme bittiyse ve paket yoksa sıradaki maç kilitli */
  deneme: boolean;
  aktif?: RefBout;
  /** Biten maçın özeti (sonuç ekranı) */
  son?: { puan: number; not: string; itibar: number; terfi?: RefTier; kararlar: { kind: MomentKind; puan: number; not: string }[]; kartlar: { benim: Card; dogru: Card }[]; sonuc: string };
  yilSonu?: { yil: number; ort: number; odul: boolean };
};

const VURUSCU: Background[] = ['boks', 'muaythai', 'kickboks', 'kyokushin', 'sokak'];
const STILLER = Object.keys(BACKGROUNDS) as Background[];

function fighter(tier: RefTier, kadin: boolean): RefFighter {
  const p = pick(NAME_POOLS);
  const ad = `${pick(kadin ? p.kadin : p.ad)} ${kadin && p.slav ? femSurname(pick(p.soyad)) : pick(p.soyad)}`;
  const stil = pick(STILLER);
  const b = BASE[tier] + noise(5);
  const v = VURUSCU.includes(stil);
  const st = (bias: number) => Math.round(clamp(b + bias + noise(6), 30, 96));
  const g = { amator: [1, 5], bolgesel: [4, 12], buyuk: [9, 18], ucc: [12, 24] }[tier];
  return { ad, ulke: p.ulke, stil, vurus: st(v ? 8 : -4), gures: st(v ? -6 : 8), yer: st(stil === 'bjj' || stil === 'judo' ? 10 : v ? -6 : 3), cene: st(0), kond: st(0), rekor: `${randInt(g[0], g[1])}-${randInt(0, 5)}` };
}

export function createRefRun(ad: string, soyad: string, deneme: boolean): RefRun {
  return { ad: ad.trim() || L("Hakem"), soyad: soyad.trim(), itibar: 10, seviye: 'amator', mac: 0, yilMac: 0, yilPuan: 0, yil: 1, dogru: 0, yanlis: 0, kusursuz: 0, unvanMaci: 0, oduller: [], gecmis: [], deneme };
}

/** Sıradaki görev: itibar yüksekse UCC'de şampiyonluk maçı. */
export function startBout(r: RefRun) {
  const kadin = chance(0.25);
  const unvan = r.seviye === 'ucc' ? r.itibar >= 85 && chance(0.4) : r.seviye !== 'amator' && chance(0.15);
  r.aktif = {
    a: fighter(r.seviye, kadin),
    b: fighter(r.seviye, kadin),
    maxRaunt: unvan ? 5 : 3,
    unvan,
    raunt: 1,
    beat: 0,
    hp: [100, 100],
    sta: [100, 100],
    log: [],
    stats: emptyStats(),
    faul: [0, 0],
    ceza: [0, 0],
    kartlar: [],
    kararlar: [],
  };
  r.son = undefined;
  advance(r.aktif);
}

const emptyStats = (): RoundStats => ({ sig: [0, 0], td: [0, 0], ctrl: [0, 0], kd: [0, 0] });
const nm = (b: RefBout, s: Side) => (s === 0 ? b.a : b.b).ad.split(' ').slice(-1)[0];
const F = (b: RefBout, s: Side) => (s === 0 ? b.a : b.b);
const BEATS = 5;

/** Maç bir sonraki karar anına, raunt sonuna ya da bitişe kadar akar. */
export function advance(b: RefBout) {
  while (!b.an && !b.kart && !b.sonuc) {
    if (b.beat >= BEATS) {
      b.kart = true;
      b.log.push(L("🔔 {0}. raunt bitti. Puan kartını doldur.", [b.raunt]));
      return;
    }
    b.beat++;
    beat(b);
  }
}

function beat(b: RefBout) {
  const att: Side = chance(0.5 + (F(b, 0).kond - F(b, 1).kond) / 400 + (b.sta[0] - b.sta[1]) / 500) ? 0 : 1;
  const def: Side = att === 0 ? 1 : 0;
  const A = F(b, att);
  const D = F(b, def);
  // Durgunluk ve faul anları seyrek gelir (her raunt en fazla bir karar anı daha akıcı).
  const r0 = rand();
  if (r0 < 0.06) return foulMoment(b, att);
  if (r0 < 0.1 && b.beat >= 3) return stallMoment(b, att);
  const grappler = !VURUSCU.includes(A.stil);
  if (chance(grappler ? 0.45 : 0.15)) {
    // Takedown denemesi
    const ok = chance(clamp(0.4 + (A.gures - D.gures) / 80, 0.12, 0.82));
    if (!ok) {
      b.log.push(L("{0} bacaklara daldı, {1} sprawl ile savundu.", [nm(b, att), nm(b, def)]));
      b.sta[att] -= 5;
      return;
    }
    b.stats.td[att]++;
    const ctrl = randInt(25, 55);
    b.stats.ctrl[att] += ctrl;
    b.sta[def] -= 4;
    const dmg = (3 + A.vurus / 25) * (0.6 + rand() * 0.8) * (60 / D.cene);
    b.hp[def] -= dmg;
    b.stats.sig[att] += randInt(2, 6);
    b.log.push(L("{0} rakibini yere indirdi, üstten kontrol ediyor.", [nm(b, att)]));
    // Kilit fırsatı
    if (chance(clamp(0.12 + (A.yer - D.yer) / 120, 0.04, 0.4))) return lockMoment(b, att);
    if (b.hp[def] < 32) return rockedMoment(b, att);
    return;
  }
  // Ayakta değişim
  const landA = Math.round(clamp(3 + (A.vurus - D.vurus) / 12 + noise(2), 0, 11));
  const landD = Math.round(clamp(2 + (D.vurus - A.vurus) / 14 + noise(2), 0, 8));
  b.stats.sig[att] += landA;
  b.stats.sig[def] += landD;
  b.hp[def] -= landA * (0.9 + A.vurus / 110) * (62 / D.cene);
  b.hp[att] -= landD * (0.8 + D.vurus / 120) * (62 / A.cene);
  b.sta[att] -= 6;
  b.sta[def] -= 4;
  b.log.push(landA > landD + 2 ? L("{0} kombinasyonlarla öne geçti.", [nm(b, att)]) : L("Ortada sert bir değişim, ikisi de vurdu.", []));
  // Kesik (bir kez)
  if (b.kesik == null && landA >= 6 && chance(0.12)) return cutMoment(b, def);
  // Knockdown
  if (landA >= 5 && chance(clamp(0.05 + (A.vurus - D.cene) / 150 + (100 - b.hp[def]) / 300, 0.02, 0.4))) {
    b.stats.kd[att]++;
    b.hp[def] -= 10;
    b.log.push(L("💥 {0} yere düştü!", [nm(b, def)]));
    return rockedMoment(b, att);
  }
  if (b.hp[def] <= 0) natural(b, att, 'KO');
}

function natural(b: RefBout, w: Side, yontem: string) {
  b.sonuc = { kazanan: w, yontem, raunt: b.raunt };
  b.log.push(L("Bitti! {0} ayağa kalkamadı, hakem hemen araya girdi.", [nm(b, w === 0 ? 1 : 0)]));
}

// ---------- Karar anları ----------

const DUR = () => ({ key: 'dur' as const, ad: L("Maçı durdur") });
const DEVAM = () => ({ key: 'devam' as const, ad: L("Devam ettir") });

function rockedMoment(b: RefBout, att: Side) {
  const v: Side = att === 0 ? 1 : 0;
  const hp = b.hp[v];
  const truth: Truth = hp < 18 ? 'dur' : hp < 30 ? 'gri' : 'devam';
  const kalan = (BEATS - b.beat) * 60 + randInt(0, 50);
  const savunma =
    truth === 'dur'
      ? pick([L("Kollarını kaldırmıyor, gözleri boşlukta."), L("Yumruklara hiç tepki vermiyor, yüzü açık.")])
      : truth === 'gri'
        ? pick([L("Elleriyle kapatıyor ama karşılık vermiyor."), L("Dizlerinin üstünde, başını korumaya çalışıyor.")])
        : pick([L("Bacağa sarılıp kalkmaya çalışıyor."), L("Kafesi tutup doğruluyor, gözleri sana bakıyor.")]);
  const hasar = hp < 18 ? L("Hasar: çok ağır") : hp < 30 ? L("Hasar: ağır") : L("Hasar: orta");
  b.an = {
    kind: 'sarsildi',
    side: v,
    truth,
    metin: L("{0} sarsıldı! {1} üstüne yürüyor.", [nm(b, v), nm(b, att)]),
    ipuclari: [savunma, hasar, L("Rauntun bitmesine {0}:{1}", [Math.floor(kalan / 60), String(kalan % 60).padStart(2, '0')]), L("Seyirci ayakta, “durdur” diye bağıranlar var.")],
    secenekler: [DUR(), DEVAM()],
  };
}

function lockMoment(b: RefBout, att: Side) {
  const v: Side = att === 0 ? 1 : 0;
  const roll = rand() + (F(b, att).yer - F(b, v).yer) / 120;
  const truth: Truth = roll > 0.75 ? 'dur' : roll > 0.5 ? 'gri' : 'devam';
  const ipucu =
    truth === 'dur'
      ? pick([L("Eli rakibinin sırtına iki kez hafifçe dokundu."), L("Kolları gevşedi, artık savaşmıyor.")])
      : truth === 'gri'
        ? pick([L("Yüzü kızarmış, elleri yavaşlıyor."), L("Kol açısı tehlikeli, yüzünü buruşturuyor.")])
        : pick([L("Ellerini kenetledi, kilidi açmaya çalışıyor."), L("Kalçasını kaydırıp boynunu kurtarmaya uğraşıyor.")]);
  b.an = {
    kind: 'kilit',
    side: v,
    truth,
    metin: L("{0} kilidi kapattı!", [nm(b, att)]),
    ipuclari: [ipucu, L("Köşesinden “dayan!” diye bağırıyorlar."), L("Kilit {0} saniyedir sürüyor.", [randInt(4, 15)])],
    secenekler: [DUR(), { key: 'bekle', ad: L("Bekle, izle") }],
  };
}

function foulMoment(b: RefBout, att: Side) {
  const v: Side = att === 0 ? 1 : 0;
  b.faul[att]++;
  const tekrar = b.faul[att] > 1 || b.kararlar.some((k) => k.kind === 'faul');
  const tur = pick(['alt', 'goz', 'kafes', 'diz'] as const);
  const agir = tur === 'diz' || chance(0.25);
  const devamEdemez = agir && chance(0.35);
  const kasit = tur === 'diz' || tur === 'kafes' ? chance(0.6) : chance(0.2);
  const truth: Truth = devamEdemez && kasit ? 'dq' : tekrar || (kasit && agir) ? 'puan' : 'uyar';
  const ne = { alt: L("Bel altına bir tekme girdi."), goz: L("Açık eldivenle göze parmak girdi."), kafes: L("Takedown'ı savunurken kafesi tuttu."), diz: L("Yerdeki rakibin kafasına diz attı.") }[tur];
  b.an = {
    kind: 'faul',
    side: att,
    truth,
    metin: L("Faul! {0}: {1}", [nm(b, att), ne]),
    ipuclari: [
      kasit ? L("Tekrar izlemede hareket bilinçli görünüyor.") : L("Tekrar izlemede kazara olmuş gibi."),
      tekrar ? L("Bu maçta daha önce de faul yaptı.") : L("Bu maçtaki ilk faulü."),
      devamEdemez ? L("{0} yerde kıvranıyor, doktor devam edemeyeceğini söylüyor.", [nm(b, v)]) : agir ? L("{0} toparlanmak için zaman istiyor.", [nm(b, v)]) : L("{0} hemen devam etmek istiyor.", [nm(b, v)]),
    ],
    secenekler: [
      { key: 'uyar', ad: L("Sözlü uyarı") },
      { key: 'puan', ad: L("Puan düş") },
      { key: 'dq', ad: L("Diskalifiye et") },
    ],
  };
}

function cutMoment(b: RefBout, v: Side) {
  b.kesik = v;
  const agir = chance(0.45);
  b.an = {
    kind: 'kesik',
    side: v,
    truth: agir ? 'doktor' : 'devam',
    metin: L("{0} kaşından kanıyor.", [nm(b, v)]),
    ipuclari: [agir ? L("Kan doğrudan gözüne akıyor, sürekli siliyor.") : L("Kaşta küçük bir kesik, kan yanağa sızıyor."), agir ? L("Rakibin vuruşlarını göremiyor gibi.") : L("Görüşü yerinde, rakibini takip ediyor.")],
    secenekler: [{ key: 'doktor', ad: L("Doktoru çağır") }, DEVAM()],
  };
}

function stallMoment(b: RefBout, att: Side) {
  const v: Side = att === 0 ? 1 : 0;
  const durgun = chance(0.55);
  b.an = {
    kind: 'durgun',
    side: att,
    truth: durgun ? 'ayir' : 'devam',
    metin: L("{0} rakibini kafese yasladı.", [nm(b, att)]),
    ipuclari: durgun
      ? [L("Yarım dakikadır kimse vuruş atmıyor."), L("Seyirci ıslıklıyor.")]
      : [L("Kafeste kısa dirsekler ve dizlerle çalışıyor."), L("{0} dönüp kafesten çıkmaya uğraşıyor.", [nm(b, v)])],
    secenekler: [{ key: 'ayir', ad: L("Ayır, ortadan başlat") }, DEVAM()],
  };
}

// ---------- Kararın sonucu ----------

/** Karar puanı: doğru +6, kabul edilebilir +3, yanlış -6, tehlikeli (geç durdurma) -12 */
export function decide(b: RefBout, key: string) {
  const an = b.an!;
  b.an = undefined;
  const v = an.side;
  const other: Side = v === 0 ? 1 : 0;
  let puan = 0;
  let not = '';
  const stop = key === 'dur';
  if (an.kind === 'sarsildi' || an.kind === 'kilit') {
    const w = other;
    if (stop) {
      if (an.truth === 'devam') {
        puan = -6;
        not = an.kind === 'kilit' ? L("Erken durdurma: daha savaşıyordu. Salon yuhaladı.") : L("Erken durdurma: kalkmaya çalışıyordu. Salon yuhaladı.");
      } else {
        puan = an.truth === 'dur' ? 6 : 3;
        not = an.truth === 'dur' ? L("Tam zamanında. Dövüşçüyü korudun.") : L("Yerinde bir karar; bazıları biraz erken dedi.");
      }
      b.sonuc = { kazanan: w, yontem: an.kind === 'kilit' ? 'SUB' : 'TKO', raunt: b.raunt };
      b.log.push(L("✋ Hakem maçı durdurdu! Kazanan {0}.", [nm(b, w)]));
    } else {
      if (an.truth === 'dur') {
        puan = -12;
        not = an.kind === 'kilit' ? L("Geç kaldın: kilitte bilincini kaybetti. Doktorlar uzun süre başında kaldı.") : L("Geç durdurma: savunmasız dövüşçü fazladan darbe aldı.");
        b.hp[v] -= 15;
        b.sonuc = { kazanan: w, yontem: an.kind === 'kilit' ? 'SUB' : 'KO', raunt: b.raunt };
        b.log.push(L("Sonunda araya girdin ama çok geçti."));
      } else if (an.truth === 'gri') {
        if (chance(0.5)) {
          puan = 3;
          not = L("Cesur karar: toparlandı ve maç sürdü.");
          b.hp[v] += 8;
          b.log.push(L("{0} toparlandı!", [nm(b, v)]));
        } else {
          puan = -3;
          not = L("Biraz geç: birkaç darbe daha aldıktan sonra durdurmak zorunda kaldın.");
          b.sonuc = { kazanan: w, yontem: an.kind === 'kilit' ? 'SUB' : 'TKO', raunt: b.raunt };
          b.log.push(L("Birkaç saniye sonra durdurmak zorunda kaldın."));
        }
      } else {
        puan = 6;
        not = an.kind === 'kilit' ? L("Doğru: kilidi açtı ve kurtuldu.") : L("Doğru: kalktı ve dövüşe döndü.");
        b.hp[v] += 6;
        b.log.push(an.kind === 'kilit' ? L("{0} kilitten kurtuldu!", [nm(b, v)]) : L("{0} ayağa kalktı, maç sürüyor.", [nm(b, v)]));
      }
    }
  } else if (an.kind === 'faul') {
    const order: Truth[] = ['uyar', 'puan', 'dq'];
    const fark = order.indexOf(key as Truth) - order.indexOf(an.truth);
    puan = fark === 0 ? 6 : Math.abs(fark) === 1 ? -3 : -8;
    not = fark === 0 ? L("Doğru yaptırım.") : fark > 0 ? L("Fazla sert bir yaptırım, köşe itiraz etti.") : L("Fazla yumuşak kaldın; faul ödüllendirilmiş oldu.");
    if (key === 'puan') b.ceza[v]++;
    if (key === 'dq') {
      b.sonuc = { kazanan: v === 0 ? 1 : 0, yontem: 'DQ', raunt: b.raunt };
      b.log.push(L("🟥 {0} diskalifiye edildi!", [nm(b, v)]));
    } else b.log.push(key === 'puan' ? L("Hakem {0} adlı dövüşçüden bir puan düştü.", [nm(b, v)]) : L("Hakem {0} adlı dövüşçüyü uyardı.", [nm(b, v)]));
  } else if (an.kind === 'kesik') {
    const ok = (key === 'doktor') === (an.truth === 'doktor');
    puan = ok ? 5 : an.truth === 'doktor' ? -8 : -2;
    not = ok ? (key === 'doktor' ? L("Doğru: doktor kesiği inceledi.") : L("Doğru: küçük bir kesikti, maç aksamadı.")) : key === 'doktor' ? L("Gereksiz mola; ritmi bozdun.") : L("Gözü kanla dolu dövüşçüyü dövüştürdün; doktor sonradan tepki gösterdi.");
    if (key === 'doktor' && an.truth === 'doktor' && chance(0.4)) {
      b.sonuc = { kazanan: other, yontem: 'TKO', raunt: b.raunt };
      b.log.push(L("🩺 Doktor maçı durdurdu: kesik çok derin."));
    } else if (key === 'doktor') b.log.push(L("🩺 Doktor baktı, devam izni verdi."));
  } else {
    const ok = (key === 'ayir') === (an.truth === 'ayir');
    puan = ok ? 4 : -3;
    not = ok ? (key === 'ayir' ? L("Doğru: maçı yeniden hareketlendirdin.") : L("Doğru: kafeste çalışıyordu, sabrın yerindeydi.")) : key === 'ayir' ? L("Erken ayırdın; kafeste çalışıyordu.") : L("Durgunluğa göz yumdun, salon sıkıldı.");
    if (key === 'ayir') b.log.push(L("Hakem dövüşçüleri ayırdı, ortadan devam."));
  }
  b.kararlar.push({ kind: an.kind, puan, not });
  if (!b.sonuc) advance(b);
}

// ---------- Puan kartı ----------

/** Rauntun resmî skoru yalnızca ekranda gösterilen istatistiklerden hesaplanır (oyuncu aynı bilgiyi görür). */
export function trueCard(b: RefBout): Card {
  const s = b.stats;
  const p = (i: Side) => s.sig[i] + s.td[i] * 3 + (s.ctrl[i] / 60) * 2 + s.kd[i] * 9;
  const d = p(0) - p(1);
  if (Math.abs(d) < 1.5) return '10-10';
  const w = d > 0 ? 'a' : 'b';
  const big = Math.abs(d) >= 20 || (s.kd[d > 0 ? 0 : 1] >= 2 && Math.abs(d) >= 12);
  return `10-${big ? 8 : 9}${w}` as Card;
}

export const cardWinner = (c: Card) => (c === '10-10' ? null : c.endsWith('a') ? 0 : 1);

/** Kartın okunuşu: "10-9 Kırmızı" */
export function cardLabel(c: Card) {
  if (c === '10-10') return '10-10';
  return `${c.slice(0, 4)} ${c.endsWith('a') ? L("Kırmızı") : L("Mavi")}`;
}

export function scoreRound(b: RefBout, c: Card) {
  const dogru = trueCard(b);
  b.kartlar.push({ benim: c, dogru });
  b.kart = false;
  b.log.push(c === dogru ? L("📋 Kartın resmî kartla aynı: {0} ✓", [cardLabel(c)]) : L("📋 Senin kartın {0} · resmî kart {1}", [cardLabel(c), cardLabel(dogru)]));
  const kartLog = b.log[b.log.length - 1];
  if (b.raunt >= b.maxRaunt) return decision(b);
  b.raunt++;
  b.beat = 0;
  b.stats = emptyStats();
  b.faul = [0, 0];
  b.sta = [Math.min(100, b.sta[0] + 30), Math.min(100, b.sta[1] + 30)];
  b.log = [kartLog, L("— {0}. RAUNT —", [b.raunt])];
  advance(b);
}

const cardPts = (c: Card): [number, number] => (c === '10-10' ? [10, 10] : c === '10-9a' ? [10, 9] : c === '10-9b' ? [9, 10] : c === '10-8a' ? [10, 8] : [8, 10]);

function decision(b: RefBout) {
  const total = (sel: (k: { benim: Card; dogru: Card }) => Card) =>
    b.kartlar.reduce((t, k) => {
      const p = cardPts(sel(k));
      return [t[0] + p[0], t[1] + p[1]];
    }, [-b.ceza[0], -b.ceza[1]]);
  const resmi = total((k) => k.dogru);
  const w: Side | null = resmi[0] === resmi[1] ? null : resmi[0] > resmi[1] ? 0 : 1;
  b.sonuc = { kazanan: w, yontem: w == null ? 'DRAW' : 'UD', raunt: b.maxRaunt };
  b.log.push(w == null ? L("Hakem kararı: berabere.") : L("Hakem kararı: kazanan {0} ({1}-{2}).", [nm(b, w), Math.max(resmi[0], resmi[1]), Math.min(resmi[0], resmi[1])]));
}

/** Kartın puanı: birebir +2, yalnızca kazanan doğru 0, kazanan yanlış -3 */
const cardScore = (k: { benim: Card; dogru: Card }) => (k.benim === k.dogru ? 2 : cardWinner(k.benim) === cardWinner(k.dogru) ? 0 : -3);

// ---------- Maç sonu ----------

export function finishBout(r: RefRun) {
  const b = r.aktif;
  if (!b?.sonuc) return;
  const karar = b.kararlar.reduce((t, k) => t + k.puan, 0);
  const kart = b.kartlar.reduce((t, k) => t + cardScore(k), 0);
  const puan = karar + kart;
  const hata = b.kararlar.some((k) => k.puan < 0) || b.kartlar.some((k) => cardScore(k) < 0);
  const tierMul = { amator: 1, bolgesel: 0.85, buyuk: 0.7, ucc: 0.6 }[r.seviye];
  const delta = Math.round(clamp(puan / 3, -10, 7) * (puan > 0 ? tierMul : 1) * (b.unvan ? 1.4 : 1));
  r.itibar = clamp(r.itibar + delta, 0, 100);
  r.mac++;
  r.yilMac++;
  r.yilPuan += puan;
  b.kararlar.forEach((k) => (k.puan > 0 ? r.dogru++ : k.puan < 0 && r.yanlis++));
  if (!hata && b.kararlar.length + b.kartlar.length >= 2) r.kusursuz++;
  if (b.unvan) r.unvanMaci++;
  const not = puan >= 12 && !hata ? L("Kusursuz yönetim") : puan >= 5 ? L("İyi bir gece") : puan >= -4 ? L("Tartışmalı anlar") : L("Skandal: herkes seni konuşuyor");
  const yontem = b.sonuc.kazanan == null ? L("Berabere") : `${nm(b, b.sonuc.kazanan)} · ${b.sonuc.yontem} · R${b.sonuc.raunt}`;
  r.gecmis = [{ a: b.a.ad, b: b.b.ad, not, puan, tier: r.seviye }, ...r.gecmis].slice(0, 30);
  // Terfi
  let terfi: RefTier | undefined;
  const req = PROMOTE[r.seviye];
  if (req && r.itibar >= req[0] && r.mac >= req[1]) {
    terfi = REF_TIERS[REF_TIERS.indexOf(r.seviye) + 1];
    r.seviye = terfi;
    r.itibar = Math.max(20, r.itibar - 25);
  }
  // Skandal üstüne skandal: bir alt lige düşebilirsin (yalnızca çok düşük itibarda)
  if (!terfi && r.itibar < 5 && r.seviye !== 'amator' && puan < -8) {
    r.seviye = REF_TIERS[REF_TIERS.indexOf(r.seviye) - 1];
    r.itibar = 20;
  }
  r.son = { puan, not, itibar: delta, terfi, kararlar: b.kararlar, kartlar: b.kartlar, sonuc: yontem };
  r.aktif = undefined;
  if (r.yilMac >= YEAR_BOUTS) {
    const ort = r.yilPuan / r.yilMac;
    const odul = ort >= 8;
    if (odul) r.oduller.push(L("Yılın Hakemi {0} · {1}", [r.yil, TIER_NAME[r.seviye]()]));
    r.yilSonu = { yil: r.yil, ort: Math.round(ort * 10) / 10, odul };
    r.yil++;
    r.yilMac = 0;
    r.yilPuan = 0;
  }
}

export const closeYearEnd = (r: RefRun) => (r.yilSonu = undefined);

/** Sıradaki terfinin şartı (yoksa null). */
export const promoteReq = (r: RefRun) => PROMOTE[r.seviye];

/** Deneme bitti mi (paket yoksa yeni maç başlamaz). */
export const trialOver = (r: RefRun) => r.deneme && r.mac >= REF_TRIAL;

export const fighterName = nm;
