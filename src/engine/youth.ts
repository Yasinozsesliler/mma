// Gençlik Yolu: kariyer 12 yaşında bir dövüş sporunda başlar. Her yıl bir hayat olayı (youthEvents.ts) ve bir
// gençlik turnuvası: yarı final (oyna ya da hızlı geç) ve final, lig kurallarıyla canlı maç. Seviyeler: il/bölge,
// ülke yıldızlar, milli takım seçmesi, gençler dünya. Aynı yaşta bir genç ezeli rakip doğar; bazı finallerde karşına
// çıkar ve MMA'ya geçince ezeli rakibin olur. 18'de MMA'ya geçilir (ya da 20'ye kadar kalınır). Kazanımlar küçük:
// altın madalya sporun iki istatistiğine +1, olaylar küçük artış (toplam tavanlı); madalyalar hatıralara girer.
// İsteğe bağlı: varsayılan başlangıç "hemen MMA" olarak kalır.
import { L } from '../i18n';
import { COUNTRIES, femSurname, NAME_POOLS } from './data';
import { addFollowers, fmtDelta } from './fame';
import { startFight } from './fight';
import { generateOpponent } from './opponents';
import { chance, clamp, pick, randInt } from './rng';
import { sportOpponent, SPORTS, UNRANKED } from './sportLeague';
import type { Sport } from './sportRules';
import type { Background, FightState, GameState, Hatira, Opponent, StatKey, Stats } from './types';
import { eventById, YOUTH_EVENTS, type YouthEvent } from './youthEvents';

export const YOUTH_START = 12;
export const MMA_AGE = 18;
export const YOUTH_MAX_AGE = 20;
/** Genç ezeli rakibin finalde karşına çıktığı yaşlar */
const RIVAL_FINALS = [13, 15, 16, 18];

export type Medal = 'altin' | 'gumus' | 'bronz';
export type YouthTitle = { yas: number; ad: string; madalya: Medal; rakip?: boolean };
export type YouthRival = { id: string; ad: string; soyad: string; lakap: string; uyruk: string; stil: Background; kisilik: string; kadin?: boolean; ilk: boolean };
export type Youth = {
  spor: Sport;
  yas: number;
  adim: 'olay' | 'hazir' | 'dovus' | 'sonuc' | 'karar';
  /** Turnuvada hangi tur */
  tur?: 'yari' | 'final';
  olay?: string;
  gorulen: string[];
  rakip?: Opponent;
  dovus?: FightState;
  bonus: Partial<Stats>;
  rekor: { g: number; m: number };
  unvanlar: YouthTitle[];
  notlar?: string[];
  kazandi?: boolean;
  /** Bu yılın madalyası (sonuç ekranı) */
  madalya?: Medal;
  /** Milli takıma girdi (gençler dünya şampiyonasına gider) */
  milli?: boolean;
  /** Genç ezeli rakip, aranızdaki seri (g = senin, m = onun) ve husumet */
  kisi?: YouthRival;
  seri?: { g: number; m: number };
  husumet?: number;
  /** Bu yılın madalya töreninde gelen takipçi; ödüllü reklamla ikiye katlandı mı */
  torenFans?: number;
  katlandi?: boolean;
  /** MMA'ya geçişte sponsorlu başlangıç alındı mı */
  sponsor?: boolean;
};

const SPORT_OF: Partial<Record<Background, Sport>> = { boks: 'boks', sokak: 'boks', kickboks: 'muaythai', muaythai: 'muaythai', kyokushin: 'muaythai', bjj: 'grappling', judo: 'grappling', sambo: 'grappling', gures: 'gures' };
export const youthSport = (g: Background): Sport => SPORT_OF[g] ?? 'boks';
const STIL: Record<Sport, Background> = { boks: 'boks', muaythai: 'muaythai', grappling: 'bjj', gures: 'gures' };

/** Sporun geliştirdiği iki istatistik */
const SPORT_STATS: Record<Sport, [StatKey, StatKey]> = { boks: ['vurus', 'hiz'], muaythai: ['vurus', 'kondisyon'], grappling: ['yer', 'gures'], gures: ['gures', 'kondisyon'] };
/** Toplam bonus tavanı (dengeli: yaşla gelen tecrübe bonusundan az) */
export const YOUTH_BONUS_MAX = 12;
const bonusTotal = (y: Youth) => Object.values(y.bonus).reduce((a, b) => a + (b ?? 0), 0);
function addBonus(y: Youth, b: Partial<Stats>) {
  for (const [k, v] of Object.entries(b) as [StatKey, number][]) {
    const room = YOUTH_BONUS_MAX - bonusTotal(y);
    if (room <= 0 || v <= 0) continue;
    y.bonus[k] = (y.bonus[k] ?? 0) + Math.min(v, room);
  }
}

export const rivalName = (y: Youth) => (y.kisi ? `${y.kisi.ad} ${y.kisi.soyad}` : '');
/** Olay metnindeki {r} yerine genç rakibin adı */
export const withRival = (y: Youth, t: string) => t.split('{r}').join(rivalName(y) || L("rakibin"));
export const eventOf = (id?: string): YouthEvent | undefined => eventById(id);

/** Yaşa göre turnuva adı ve zorluğu */
export function tournamentOf(s: GameState, y: Youth): { ad: string; seviye: 0 | 1 | 2 | 3; dunya: boolean } {
  const ulke = COUNTRIES[s.fighter.uyruk]?.ad ?? '';
  const il = s.fighter.memleket || ulke;
  if (y.yas >= MMA_AGE) return { ad: L("{0} Büyükler Şampiyonası", [ulke]), seviye: 3, dunya: false };
  if (y.yas >= 17 && y.milli) return { ad: L("Gençler Dünya Şampiyonası"), seviye: 3, dunya: true };
  if (y.yas >= 16) return { ad: L("Gençler Milli Takım Seçmesi"), seviye: 2, dunya: false };
  if (y.yas >= 14) return { ad: L("{0} Yıldızlar Şampiyonası", [ulke]), seviye: 1, dunya: false };
  return { ad: il && il !== ulke ? L("{0} Gençler Şampiyonası", [il]) : L("Bölge Gençler Şampiyonası"), seviye: 0, dunya: false };
}

/** Gençlik maçında iki tarafın gücü yaşa göre küçülür (oran korunur). */
const youthScale = (yas: number) => clamp(0.6 + (yas - YOUTH_START) * 0.065, 0.6, 1);
const scaled = (st: Stats, k: number): Stats => Object.fromEntries(Object.entries(st).map(([a, v]) => [a, Math.max(10, Math.round(v * k))])) as Stats;
export const youthGenc = (yas: number) => clamp((yas - YOUTH_START) / (MMA_AGE - YOUTH_START), 0, 1);

export function startYouth(s: GameState) {
  const spor = youthSport(s.fighter.gecmis);
  // Genç ezeli rakip: aynı ülkeden, aynı sporda, aynı yaşta
  const o = generateOpponent(s, { zorluk: 0, org: 'cfc' });
  // İsim memleketin isim havuzundan (yoksa rakip üreticisininki)
  const home = COUNTRIES[s.fighter.uyruk]?.ad;
  const pool = NAME_POOLS.find((p) => p.ulke === home || (s.fighter.uyruk === 'us' && p.ulke === 'ABD'));
  const ad = pool ? pick(s.fighter.kadin ? pool.kadin : pool.ad) : o.ad;
  let soyad = pool ? pick(pool.soyad) : o.soyad;
  if (pool && s.fighter.kadin && pool.slav) soyad = femSurname(soyad);
  if (soyad === s.fighter.soyad && pool) soyad = pick(pool.soyad.filter((x) => x !== s.fighter.soyad));
  const kisi: YouthRival = { id: `genc_${o.id}`, ad, soyad, lakap: o.lakap, uyruk: s.fighter.uyruk, stil: STIL[spor], kisilik: o.kisilik, kadin: s.fighter.kadin || undefined, ilk: false };
  s.genclik = { spor, yas: YOUTH_START, adim: 'olay', gorulen: [], bonus: {}, rekor: { g: 0, m: 0 }, unvanlar: [], kisi, seri: { g: 0, m: 0 }, husumet: 0 };
  nextEvent(s);
  s.phase = 'genclik';
}

function nextEvent(s: GameState) {
  const y = s.genclik!;
  // 18 yaşından sonra (bir yıl daha kalınca) yaş üst sınırı aranmaz
  const fits = (e: YouthEvent) => e.min <= y.yas && (y.yas >= MMA_AGE || y.yas <= e.max) && !y.gorulen.includes(e.id);
  // Rakip olayları önce: 12-14 arası tanışma, sonra laf atma ve kamp
  const pool = YOUTH_EVENTS.filter(fits);
  const rakip = pool.filter((e) => e.rakip);
  const e = rakip.length && (chance(0.45) || y.yas === 12) ? pick(rakip) : pick(pool.filter((x) => !x.rakip).length ? pool.filter((x) => !x.rakip) : YOUTH_EVENTS.filter((x) => !x.rakip));
  y.olay = e.id;
  y.gorulen.push(e.id);
  y.adim = 'olay';
}

/** Turnuva rakibi: yarı finalde biraz daha kolay; finalde (bazı yıllar) genç ezeli rakip */
function bracketOpponent(s: GameState, y: Youth, tur: 'yari' | 'final'): Opponent {
  const t = tournamentOf(s, y);
  const seviye = tur === 'yari' ? Math.max(0, t.seviye - 1) : t.seviye;
  const fake = { g: 0, m: 0, ko: 0, sira: [UNRANKED, 7, 4, 1][seviye], kemer: false, savunma: 0, bonus: 0 };
  const opp = sportOpponent(s, y.spor, fake, seviye === 3);
  const k = youthScale(y.yas) * [0.92, 0.96, 1, 1.02][seviye];
  const base: Opponent = { ...opp, stats: scaled(opp.stats, k), rekor: { g: (y.yas - YOUTH_START) * 2 + 1 + seviye + randInt(0, 2), m: randInt(0, Math.min(3, y.yas - YOUTH_START + 1)), b: 0 }, rank: null, champion: false };
  const r = y.kisi;
  if (tur === 'final' && r && RIVAL_FINALS.includes(y.yas) && !t.dunya) {
    // Rakip senin kadar gelişir: biraz daha güçlü (husumet onu hırslandırır)
    const st = scaled(opp.stats, k * (1.02 + Math.min(0.04, (y.husumet ?? 0) * 0.01)));
    return { ...base, id: r.id, ad: r.ad, soyad: r.soyad, lakap: r.lakap, uyruk: COUNTRIES[r.uyruk]?.ad ?? base.uyruk, stil: r.stil, kisilik: r.kisilik, stats: st, rivalry: 3, karsilasma: (y.seri?.g ?? 0) + (y.seri?.m ?? 0) };
  }
  return base;
}
export const isRivalBout = (y: Youth) => !!y.kisi && y.rakip?.id === y.kisi.id;

/** Yılın olayında seçim: etkiler uygulanır, sonra yarı final hazırlığı. */
export function chooseYouthEvent(s: GameState, i: number) {
  const y = s.genclik;
  const e = eventOf(y?.olay);
  const o = e?.secenekler[i];
  if (!y || !e || !o || y.adim !== 'olay') return;
  addBonus(y, o.spor ? { ...o.etki, [SPORT_STATS[y.spor][0]]: o.spor } : o.etki);
  if (o.takipci) addFollowers(s, o.takipci);
  if (o.para) s.para += o.para;
  if (o.husumet) y.husumet = (y.husumet ?? 0) + o.husumet;
  if (e.rakip && y.kisi) y.kisi.ilk = true;
  y.notlar = [withRival(y, o.sonuc())];
  y.tur = 'yari';
  y.rakip = bracketOpponent(s, y, 'yari');
  y.madalya = undefined;
  y.adim = 'hazir';
}

export function startYouthFight(s: GameState) {
  const y = s.genclik;
  if (!y || y.adim !== 'hazir' || !y.rakip) return;
  const base = { ...s.fighter.stats };
  for (const [k, v] of Object.entries(y.bonus) as [StatKey, number][]) base[k] += v;
  const t = tournamentOf(s, y);
  y.dovus = startFight({
    pStats: scaled(base, youthScale(y.yas)),
    pAd: s.fighter.lakap || s.fighter.soyad,
    koseAdi: s.takim.antrenor,
    opp: y.rakip,
    mods: { stats: {}, plan: 'ayakta', planUyum: false, oppStats: {}, kural: y.spor, ligAd: `${t.ad} · ${y.tur === 'yari' ? L("YARI FİNAL") : L("FİNAL")}`, genc: youthGenc(y.yas) },
    maxRaunt: 3,
    unvanMaci: false,
    anaMac: false,
  });
  y.adim = 'dovus';
}

/** Yarı finali oynamadan geç: güç farkına göre zar (yalnızca yarı final). */
export function simYouthSemi(s: GameState) {
  const y = s.genclik;
  if (!y || y.adim !== 'hazir' || y.tur !== 'yari' || !y.rakip) return;
  const [a, b] = SPORT_STATS[y.spor];
  const me = (s.fighter.stats[a] + (y.bonus[a] ?? 0) + s.fighter.stats[b] + (y.bonus[b] ?? 0)) / 2;
  const sc = youthScale(y.yas);
  const op = (y.rakip.stats[a] + y.rakip.stats[b]) / 2 / sc;
  const won = chance(clamp(0.55 + (me - op) / 45, 0.25, 0.85));
  resolveRound(s, won, null);
}

/** Canlı maç bitti */
export function finishYouthFight(s: GameState) {
  const y = s.genclik;
  const res = y?.dovus?.sonuc;
  if (!y || !res) return;
  const won = res.kazanan === 'p' || (res.kazanan === 'berabere' && (y.dovus?.pPuan ?? 0) >= (y.dovus?.oPuan ?? 0));
  y.dovus = undefined;
  resolveRound(s, won, res.yontem);
}

const NADIR = (seviye: number, dunya: boolean, m: Medal): Hatira['nadir'] => (m === 'altin' && dunya ? 'efsane' : m === 'altin' && seviye >= 2 ? 'ozel' : 'siradan');

function medal(s: GameState, y: Youth, m: Medal, rakip: boolean) {
  const t = tournamentOf(s, y);
  y.unvanlar.push({ yas: y.yas, ad: t.ad, madalya: m, rakip: rakip || undefined });
  y.madalya = m;
  const ad = m === 'altin' ? L("{0} altın madalyası", [t.ad]) : m === 'gumus' ? L("{0} gümüş madalyası", [t.ad]) : L("{0} bronz madalyası", [t.ad]);
  const metin = m === 'altin' ? L("{0} yaşında boynuna asılan altın. {1}.", [y.yas, SPORTS[y.spor].spor()]) : m === 'gumus' ? L("{0} yaşında finalde kaybettin; ama madalyayı hâlâ saklıyorsun.", [y.yas]) : L("{0} yaşında yarı finalde kaldın. Bu bronz sana çalışmayı öğretti.", [y.yas]);
  const h: Hatira = { id: `genc_${y.yas}_${m}`, tur: 'madalya', ad, metin, nadir: NADIR(t.seviye, t.dunya, m), kat: 'genclik', hafta: 0, yas: y.yas };
  s.hatiralar = [h, ...(s.hatiralar ?? []).filter((x) => x.id !== h.id)];
}

/** Turun sonucu: yarı final kazanılınca final; aksi hâlde yılın madalyası. */
function resolveRound(s: GameState, won: boolean, yontem: string | null) {
  const y = s.genclik!;
  const t = tournamentOf(s, y);
  const [a, b] = SPORT_STATS[y.spor];
  const fin = yontem === 'KO' || yontem === 'TKO' || yontem === 'SUB';
  const notes: string[] = [];
  const rakip = isRivalBout(y);
  if (yontem) {
    if (won) y.rekor.g++;
    else y.rekor.m++;
  }
  if (y.tur === 'yari') {
    if (won) {
      notes.push(yontem ? (fin ? L("✅ Yarı finali bitirişle kazandın!") : L("✅ Yarı finali kazandın.")) : L("✅ Yarı finali geçtin."));
      y.tur = 'final';
      y.rakip = bracketOpponent(s, y, 'final');
      if (isRivalBout(y)) notes.push(y.kisi!.ilk ? L("⚔️ Finalde karşında yine {0} var.", [rivalName(y)]) : L("⚔️ Finalde seni {0} bekliyor. Aynı yaştasınız, aynı hırstasınız.", [rivalName(y)]));
      if (y.kisi && isRivalBout(y)) y.kisi.ilk = true;
      y.notlar = notes;
      y.adim = 'hazir';
      return;
    }
    notes.push(L("🥉 {0} yarı finalinde elendin: bronz madalya.", [t.ad]));
    medal(s, y, 'bronz', false);
    y.torenFans = addFollowers(s, [20, 50, 120, 300][t.seviye]);
    notes.push(L("{0} takipçi", [fmtDelta(y.torenFans)]));
  } else if (won) {
    notes.push(L("🥇 {0} şampiyonu oldun!", [t.ad]));
    medal(s, y, 'altin', rakip);
    addBonus(y, { [a]: 1, [b]: 1 });
    if (t.seviye === 2) {
      y.milli = true;
      notes.push(L("🎽 Milli takıma seçildin! Sıradaki durak: Gençler Dünya Şampiyonası."));
    }
    y.torenFans = addFollowers(s, [150, 400, 1200, 4000][t.seviye]);
    notes.push(L("{0} takipçi", [fmtDelta(y.torenFans)]));
    s.haberler.unshift(L("🥇 {0} yaşındaki {1}, {2} şampiyonu!", [y.yas, `${s.fighter.ad} ${s.fighter.soyad}`, t.ad]));
  } else {
    notes.push(L("🥈 {0} finalinde kaybettin: gümüş madalya.", [t.ad]));
    medal(s, y, 'gumus', rakip);
    y.torenFans = addFollowers(s, [50, 120, 300, 900][t.seviye]);
    notes.push(L("{0} takipçi", [fmtDelta(y.torenFans)]));
  }
  if (rakip && y.seri) {
    if (won) y.seri.g++;
    else y.seri.m++;
    notes.push(won ? L("⚔️ {0} karşısında kazandın. Aranızdaki seri: {1}-{2}.", [rivalName(y), y.seri.g, y.seri.m]) : L("⚔️ {0} bu sefer kazandı. Aranızdaki seri: {1}-{2}.", [rivalName(y), y.seri.g, y.seri.m]));
  }
  y.kazandi = won;
  y.notlar = notes;
  y.adim = 'sonuc';
}

/** Sonuçtan sonra: bir sonraki yaş (olay) ya da 18'den sonra MMA kararı. */
export function nextYouthYear(s: GameState) {
  const y = s.genclik;
  if (!y || y.adim !== 'sonuc') return;
  y.yas++;
  y.rakip = undefined;
  y.tur = undefined;
  y.torenFans = undefined;
  y.katlandi = undefined;
  if (y.yas >= MMA_AGE) {
    y.adim = 'karar';
    return;
  }
  nextEvent(s);
}

/** Bir yıl daha kal (en fazla 20 yaşa kadar): yeni olay ve büyükler turnuvası. */
export function stayOneMoreYear(s: GameState) {
  const y = s.genclik;
  if (!y || y.adim !== 'karar' || y.yas >= YOUTH_MAX_AGE) return;
  nextEvent(s);
}

/** MMA'ya geç: yaş, istatistik bonusu işlenir; genç ezeli rakip (karşılaştıysanız) MMA'da ezeli rakibin olur. */
export function graduateYouth(s: GameState) {
  const y = s.genclik;
  if (!y || y.adim !== 'karar') return;
  s.fighter.yas = y.yas;
  s.fighter.baslangicYasi = y.yas;
  for (const [k, v] of Object.entries(y.bonus) as [StatKey, number][]) s.fighter.stats[k] = clamp(s.fighter.stats[k] + v, 1, 99);
  const altin = y.unvanlar.filter((u) => u.madalya === 'altin').length;
  s.haberler.unshift(L("🌱 {0} yıllık {1} geçmişinden sonra MMA'ya geçiyorsun: {2} altın madalya.", [y.yas - YOUTH_START, SPORTS[y.spor].spor(), altin]));
  const r = y.kisi;
  if (r && y.seri && y.seri.g + y.seri.m > 0) {
    s.ezeli = { id: r.id, ad: r.ad, soyad: r.soyad, lakap: r.lakap, uyruk: COUNTRIES[r.uyruk]?.ad ?? r.uyruk, stil: r.stil, kisilik: r.kisilik, g: y.seri.m, m: y.seri.g, b: 0, son: 0, kaynak: 'genclik' };
    s.haberler.unshift(L("⚔️ Gençlikteki ezeli rakibin {0} de MMA'ya geçti. Aranızdaki seri: {1}-{2}. Bir gün kafeste karşılaşacaksınız.", [`${r.ad} ${r.soyad}`, y.seri.g, y.seri.m]));
  }
  s.gencGecmis = { spor: y.spor, rekor: y.rekor, unvanlar: y.unvanlar, rakip: r && y.seri && y.seri.g + y.seri.m > 0 ? { ad: `${r.ad} ${r.soyad}`, g: y.seri.g, m: y.seri.m } : undefined };
  s.genclik = undefined;
  s.phase = 'hub';
}

/** Ödüllü reklam (yılın madalya töreni, bir kez): törenden gelen takipçi bir kez daha. Güç vermez. */
export function doubleYouthFans(s: GameState): string | null {
  const y = s.genclik;
  if (!y || y.adim !== 'sonuc' || y.katlandi || !y.torenFans) return null;
  const n = addFollowers(s, y.torenFans);
  y.katlandi = true;
  const t = L("📣 Madalya töreni yayıldı: {0} takipçi", [fmtDelta(n)]);
  y.notlar = [...(y.notlar ?? []), t];
  return t;
}

export const YOUTH_SPONSOR = 1500;
/** Ödüllü reklam (MMA'ya geçiş kararında, bir kez): yerel sponsor başlangıç parası verir. Güç vermez. */
export function youthSponsor(s: GameState): string | null {
  const y = s.genclik;
  if (!y || y.adim !== 'karar' || y.sponsor) return null;
  s.para += YOUTH_SPONSOR;
  y.sponsor = true;
  return L("🤝 Yerel sponsor imzaladı: +${0}", [YOUTH_SPONSOR.toLocaleString()]);
}
