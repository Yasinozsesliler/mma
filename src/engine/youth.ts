// Gençlik Yolu: kariyer 12 yaşında bir dövüş sporunda başlar. Her yıl bir hayat olayı ve bir gençlik turnuvası
// (lig kurallarıyla canlı maç): il, ülke yıldızlar, milli takım seçmesi, gençler dünya. 18'de MMA'ya geçilir
// (ya da bir-iki yıl daha kalınır). Kazanımlar küçük: sporuna uygun istatistik artışları, biraz takipçi ve para.
// İsteğe bağlı: varsayılan başlangıç "hemen MMA" olarak kalır.
import { L } from '../i18n';
import { COUNTRIES } from './data';
import { addFollowers, fmtDelta } from './fame';
import { startFight } from './fight';
import { clamp, pick } from './rng';
import { sportOpponent, SPORTS, UNRANKED } from './sportLeague';
import type { Sport } from './sportRules';
import type { Background, FightState, GameState, Opponent, StatKey, Stats } from './types';

export const YOUTH_START = 12;
export const MMA_AGE = 18;
export const YOUTH_MAX_AGE = 20;

export type YouthEvent = { id: string; metin: () => string; secenekler: { ad: () => string; sonuc: () => string; etki: Partial<Stats>; /** Sporun ana istatistiğine eklenen */ spor?: number; takipci?: number; para?: number }[] };
export type YouthTitle = { yas: number; ad: string; madalya: 'altin' | 'gumus' };
export type Youth = {
  spor: Sport;
  yas: number;
  adim: 'olay' | 'hazir' | 'dovus' | 'sonuc' | 'karar';
  olay?: string;
  gorulen: string[];
  rakip?: Opponent;
  dovus?: FightState;
  bonus: Partial<Stats>;
  rekor: { g: number; m: number };
  unvanlar: YouthTitle[];
  notlar?: string[];
  kazandi?: boolean;
  /** Milli takıma girdi (gençler dünya şampiyonasına gider) */
  milli?: boolean;
};

const SPORT_OF: Partial<Record<Background, Sport>> = { boks: 'boks', sokak: 'boks', kickboks: 'muaythai', muaythai: 'muaythai', kyokushin: 'muaythai', bjj: 'grappling', judo: 'grappling', sambo: 'grappling', gures: 'gures' };
export const youthSport = (g: Background): Sport => SPORT_OF[g] ?? 'boks';

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

const EVENTS: YouthEvent[] = [
  { id: 'okul', metin: () => L("Sınav haftası. Hocan aynı akşam ek antrenman koymuş."), secenekler: [
    { ad: () => L("Ders çalış"), sonuc: () => L("Karnen parladı; ailen gururlu, kafan rahat."), etki: { iq: 1 } },
    { ad: () => L("Antrenmana git"), sonuc: () => L("Salonda son çıkan sendin. Hocan fark etti."), etki: { kondisyon: 1 } },
  ] },
  { id: 'buyukler', metin: () => L("Hocan seni ilk kez büyüklerle çalıştırmak istiyor."), secenekler: [
    { ad: () => L("Kabul et"), sonuc: () => L("Çok dayak yedin ama korkmamayı öğrendin."), etki: { cene: 1 } },
    { ad: () => L("Yaşıtlarınla kal"), sonuc: () => L("Tekniğini sakin sakin oturttun."), etki: { iq: 1 } },
  ] },
  { id: 'is', metin: () => L("Evde para sıkıntısı var. Yaz için bir işe girmen isteniyor."), secenekler: [
    { ad: () => L("Çalış"), sonuc: () => L("Pazarda kasa taşıdın; hem cebine para girdi hem de kondisyonun arttı."), etki: { kondisyon: 1 }, para: 600 },
    { ad: () => L("Kampa git"), sonuc: () => L("Ailen idare etti; sen de yaz kampında bir üst seviyeye çıktın."), etki: {}, spor: 1 },
  ] },
  { id: 'video', metin: () => L("Antrenman videon okulda elden ele dolaşıyor."), secenekler: [
    { ad: () => L("Hesap aç, paylaş"), sonuc: () => L("İlk takipçilerin geldi. Mahallede tanınıyorsun."), etki: {}, takipci: 400 },
    { ad: () => L("Boş ver, çalış"), sonuc: () => L("Ekrana değil kum torbasına baktın."), etki: { hiz: 1 } },
  ] },
  { id: 'kulup', metin: () => L("Şehrin büyük kulübü seni transfer etmek istiyor."), secenekler: [
    { ad: () => L("Hocanla kal"), sonuc: () => L("Hocan seni hiç unutmayacak. Sadakat bir gün geri döner."), etki: { iq: 1 } },
    { ad: () => L("Büyük kulübe geç"), sonuc: () => L("Daha sert sparring, daha iyi ekipman."), etki: { cene: 1 } },
  ] },
  { id: 'mma', metin: () => L("Televizyonda ilk kez bir MMA gecesi izledin. Gözünü alamadın."), secenekler: [
    { ad: () => L("Güreşe de bak"), sonuc: () => L("Kulübün güreş köşesine gizlice girmeye başladın."), etki: { gures: 1 } },
    { ad: () => L("Ayakta vuruşa çalış"), sonuc: () => L("Gece yarısına kadar gölge boksu."), etki: { vurus: 1 } },
  ] },
  { id: 'sakat', metin: () => L("Antrenmanda bileğin burkuldu. Turnuvaya üç hafta var."), secenekler: [
    { ad: () => L("Dinlen"), sonuc: () => L("Sabırlı oldun; bilek tamamen iyileşti."), etki: { iq: 1 } },
    { ad: () => L("Sarıp devam et"), sonuc: () => L("Acıyla çalışmayı öğrendin."), etki: { cene: 1 } },
  ] },
  { id: 'arkadas', metin: () => L("Mahalledeki arkadaşların akşamları dışarı çağırıyor."), secenekler: [
    { ad: () => L("Bir akşam git"), sonuc: () => L("Güldün, eğlendin; kafan dağıldı."), etki: { iq: 1 } },
    { ad: () => L("Erken yat"), sonuc: () => L("Sabah koşusunda herkesten öndeydin."), etki: { kondisyon: 1 } },
  ] },
];
export const eventOf = (id?: string) => EVENTS.find((e) => e.id === id);

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

export function startYouth(s: GameState) {
  s.genclik = { spor: youthSport(s.fighter.gecmis), yas: YOUTH_START, adim: 'olay', gorulen: [], bonus: {}, rekor: { g: 0, m: 0 }, unvanlar: [] };
  nextEvent(s);
  s.phase = 'genclik';
}

function nextEvent(s: GameState) {
  const y = s.genclik!;
  const pool = EVENTS.filter((e) => !y.gorulen.includes(e.id));
  const e = pick(pool.length ? pool : EVENTS);
  y.olay = e.id;
  y.gorulen.push(e.id);
  y.adim = 'olay';
}

/** Yılın olayında seçim: etkiler uygulanır, sonra turnuva hazırlığı. */
export function chooseYouthEvent(s: GameState, i: number) {
  const y = s.genclik;
  const e = eventOf(y?.olay);
  const o = e?.secenekler[i];
  if (!y || !e || !o || y.adim !== 'olay') return;
  addBonus(y, o.spor ? { ...o.etki, [SPORT_STATS[y.spor][0]]: o.spor } : o.etki);
  if (o.takipci) addFollowers(s, o.takipci);
  if (o.para) s.para += o.para;
  y.notlar = [o.sonuc()];
  const t = tournamentOf(s, y);
  const fake = { g: 0, m: 0, ko: 0, sira: [UNRANKED, 7, 4, 1][t.seviye], kemer: false, savunma: 0, bonus: 0 };
  const opp = sportOpponent(s, y.spor, fake, t.seviye === 3);
  // İlk turnuvalar biraz daha yumuşak: çocuk yeni başlıyor
  y.rakip = { ...opp, stats: scaled(opp.stats, youthScale(y.yas) * [0.92, 0.96, 1, 1.02][t.seviye]), rekor: { g: Math.max(1, Math.round(opp.rekor.g * youthScale(y.yas) * 0.6)), m: opp.rekor.m, b: 0 }, rank: null, champion: false };
  y.adim = 'hazir';
}

export function startYouthFight(s: GameState) {
  const y = s.genclik;
  if (!y || y.adim !== 'hazir' || !y.rakip) return;
  const base = { ...s.fighter.stats };
  for (const [k, v] of Object.entries(y.bonus) as [StatKey, number][]) base[k] += v;
  y.dovus = startFight({
    pStats: scaled(base, youthScale(y.yas)),
    pAd: s.fighter.lakap || s.fighter.soyad,
    koseAdi: s.takim.antrenor,
    opp: y.rakip,
    mods: { stats: {}, plan: 'ayakta', planUyum: false, oppStats: {}, kural: y.spor, ligAd: tournamentOf(s, y).ad },
    maxRaunt: 3,
    unvanMaci: false,
    anaMac: false,
  });
  y.adim = 'dovus';
}

/** Turnuva finali bitti: madalya, bonus, takipçi; sonraki yıl ya da MMA kararı. */
export function finishYouthFight(s: GameState) {
  const y = s.genclik;
  const res = y?.dovus?.sonuc;
  if (!y || !res) return;
  const won = res.kazanan === 'p' || (res.kazanan === 'berabere' && (y.dovus?.pPuan ?? 0) >= (y.dovus?.oPuan ?? 0));
  const t = tournamentOf(s, y);
  const [a, b] = SPORT_STATS[y.spor];
  const notes: string[] = [];
  if (won) {
    y.rekor.g++;
    y.unvanlar.push({ yas: y.yas, ad: t.ad, madalya: 'altin' });
    notes.push(L("🥇 {0} şampiyonu oldun!", [t.ad]));
    addBonus(y, { [a]: 1, [b]: 1 });
    if (t.seviye === 2) {
      y.milli = true;
      notes.push(L("🎽 Milli takıma seçildin! Sıradaki durak: Gençler Dünya Şampiyonası."));
    }
    const fans = addFollowers(s, [150, 400, 1200, 4000][t.seviye]);
    notes.push(L("{0} takipçi", [fmtDelta(fans)]));
    s.haberler.unshift(L("🥇 {0} yaşındaki {1}, {2} şampiyonu!", [y.yas, `${s.fighter.ad} ${s.fighter.soyad}`, t.ad]));
  } else {
    y.rekor.m++;
    y.unvanlar.push({ yas: y.yas, ad: t.ad, madalya: 'gumus' });
    notes.push(L("🥈 {0} finalinde kaybettin: gümüş madalya.", [t.ad]));
    const fans = addFollowers(s, [50, 120, 300, 900][t.seviye]);
    notes.push(L("{0} takipçi", [fmtDelta(fans)]));
  }
  y.kazandi = won;
  y.notlar = notes;
  y.dovus = undefined;
  y.adim = 'sonuc';
}

/** Sonuçtan sonra: bir sonraki yaş (olay) ya da 18'den sonra MMA kararı. */
export function nextYouthYear(s: GameState) {
  const y = s.genclik;
  if (!y || y.adim !== 'sonuc') return;
  y.yas++;
  y.rakip = undefined;
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

export const youthBonusOf = (y: Youth) => y.bonus;

/** MMA'ya geç: yaş, istatistik bonusu ve geçmiş işlenir; kariyer ana ekrandan başlar. */
export function graduateYouth(s: GameState) {
  const y = s.genclik;
  if (!y || y.adim !== 'karar') return;
  s.fighter.yas = y.yas;
  s.fighter.baslangicYasi = y.yas;
  for (const [k, v] of Object.entries(y.bonus) as [StatKey, number][]) s.fighter.stats[k] = clamp(s.fighter.stats[k] + v, 1, 99);
  const altin = y.unvanlar.filter((u) => u.madalya === 'altin').length;
  s.haberler.unshift(L("🌱 {0} yıllık {1} geçmişinden sonra MMA'ya geçiyorsun: {2} altın madalya.", [y.yas - YOUTH_START, SPORTS[y.spor].spor(), altin]));
  s.gencGecmis = { spor: y.spor, rekor: y.rekor, unvanlar: y.unvanlar };
  s.genclik = undefined;
  s.phase = 'hub';
}
