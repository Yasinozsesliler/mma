// Rakip kampını gözetle: kampın ortasında rakibin kampından bir haber gelir (sakatlık söylentisi, kilo sorunu,
// yeni hoca, bilgi satmak isteyen eski sparring ortağı). Haber doğru da olabilir, blöf de. Kararın maç gecesi
// küçük bir avantaj ya da sürpriz olarak döner; gerçek kafese çıkmadan önce ortaya çıkar.
import { L, LOC } from '../i18n';
import { chance, clamp, pick } from './rng';
import type { GameState, StatKey, Stats } from './types';

export type RivalNewsId = 'sakat' | 'kilo' | 'hoca' | 'casus';
export interface RivalNews {
  id: RivalNewsId;
  /** Haber gerçekten doğru mu (oyuncu bilmez) */
  dogru: boolean;
  metin: string;
  secenekler: string[];
  karar?: number;
  sonuc?: string;
  bedel?: number;
  stat?: StatKey;
  kapandi?: boolean;
}

const fee = (s: GameState) => ({ amator: 150, bolgesel: 1_200, buyuk: 6_000, ufc: 25_000 })[s.stage];

/** Kampın ortasında (bir kez) rakip kampından haber. */
export function maybeRivalNews(s: GameState) {
  const k = s.pending.kamp;
  const o = s.pending.rakip;
  if (!k || !o || k.rakipHaber || k.kankaAn || s.stage === 'amator' || !chance(0.55)) return;
  const id = pick<RivalNewsId>(['sakat', 'kilo', 'hoca', 'casus']);
  const ad = o.soyad;
  const stat = pick<StatKey>(['gures', 'vurus', 'kondisyon', 'yer']);
  const bolge: Record<StatKey, string> = { gures: L("dizini"), vurus: L("elini"), kondisyon: L("kaburgasını"), yer: L("omzunu"), cene: '', hiz: '', iq: '' };
  if (id === 'sakat')
    k.rakipHaber = { id, stat, dogru: chance(0.55), metin: L("Kulislerde bir söylenti: {0} kampta {1} sakatlamış ama saklıyormuş.", [ad, bolge[stat]]), secenekler: [L("İnan, planı oraya yüklen"), L("Şüphelen, planına sadık kal")] };
  else if (id === 'kilo')
    k.rakipHaber = { id, dogru: chance(0.6), metin: L("{0} kilo vermekte zorlanıyormuş. Kampından gelen fotoğraflarda hâlâ ağır görünüyor.", [ad]), secenekler: [L("Tempoyu artır, onu yor"), L("Söylentiye göre plan yapma")] };
  else if (id === 'hoca')
    k.rakipHaber = { id, dogru: chance(0.7), bedel: fee(s), metin: L("{0} ünlü bir taktik hocasıyla çalışmaya başlamış. Planını sana göre değiştiriyor olabilir.", [ad]), secenekler: [L("Video analizine yatırım yap ({0})", [`$${fee(s).toLocaleString(LOC)}`]), L("Önemseme")] };
  else
    k.rakipHaber = { id, dogru: chance(0.65), bedel: fee(s) * 2, metin: L("{0} kampından eski bir sparring ortağı aradı: rakibin oyun planını satmak istiyor.", [ad]), secenekler: [L("Satın al ({0})", [`$${(fee(s) * 2).toLocaleString(LOC)}`]), L("Reddet, böyle kazanmam")] };
}

export function chooseRivalNews(s: GameState, i: number) {
  const k = s.pending.kamp;
  const h = k?.rakipHaber;
  if (!k || !h || h.karar != null) return;
  h.karar = i;
  const ad = s.pending.rakip?.soyad ?? '';
  if (h.id === 'hoca' && i === 0) {
    s.para -= h.bedel ?? 0;
    h.sonuc = L("Analist ekibi rakibinin son üç maçını kare kare çözdü. Hazırlıklısın.");
  } else if (h.id === 'casus' && i === 0) {
    s.para -= h.bedel ?? 0;
    h.sonuc = L("Zarfı aldın. İçindekilerin ne kadar doğru olduğunu kafeste göreceksin.");
  } else if (h.id === 'casus') {
    s.motivasyon = clamp(s.motivasyon + 1, -2, 2);
    h.sonuc = L("Telefonu kapattın. Hocan bu kararı çok sevdi. Motivasyon +1.");
  } else h.sonuc = i === 0 ? L("Kararını verdin. Kampın bu bilgiye göre şekillendi.") : L("Söylentilere kulak asmadın, kendi işine baktın.");
}

export const closeRivalNews = (s: GameState) => {
  const h = s.pending.kamp?.rakipHaber;
  if (h?.sonuc) h.kapandi = true;
};
/** Karar bekleyen haber varsa kamp haftası ilerlemez. */
export const rivalNewsOpen = (s: GameState) => {
  const h = s.pending.kamp?.rakipHaber;
  return !!h && !h.kapandi;
};

const add = (m: Partial<Stats>, k: StatKey, d: number) => (m[k] = (m[k] ?? 0) + d);

/** Dövüş günü: gerçek ortaya çıkar, karar avantaj ya da sürpriz olur. */
export function rivalNewsMods(s: GameState, mods: Partial<Stats>, oppMods: Partial<Stats>) {
  const h = s.pending.kamp?.rakipHaber;
  if (!h || h.karar == null) return;
  const ad = s.pending.rakip?.soyad ?? '';
  let line = '';
  if (h.id === 'sakat') {
    if (h.dogru) add(oppMods, h.stat!, -4);
    if (h.karar === 0 && h.dogru) {
      add(mods, 'iq', 2);
      line = L("🕵️ Söylenti doğruydu: {0} sakat çıktı ve sen tam oraya hazırlandın (IQ +2).", [ad]);
    } else if (h.karar === 0) {
      add(mods, 'iq', -2);
      line = L("🕵️ Söylenti blöftü: {0} sapasağlam. Planın boşa çıktı (IQ -2).", [ad]);
    } else line = h.dogru ? L("🕵️ {0} gerçekten sakatmış ama sen planına sadık kaldın.", [ad]) : L("🕵️ Söylenti blöftü, kanmadın. Aferin.");
  } else if (h.id === 'kilo') {
    if (h.dogru) add(oppMods, 'kondisyon', -4);
    if (h.karar === 0 && h.dogru) {
      add(mods, 'kondisyon', 2);
      line = L("🕵️ {0} kiloyu zor vermiş; tempolu kampın meyvesini verecek (kondisyon +2).", [ad]);
    } else if (h.karar === 0) {
      add(mods, 'kondisyon', -1);
      line = L("🕵️ {0} formda geldi. Fazla tempolu kamp seni biraz yordu (kondisyon -1).", [ad]);
    } else line = h.dogru ? L("🕵️ {0} kiloyu zor vermiş, gözleri çökük.", [ad]) : L("🕵️ {0} formda görünüyor; söylenti boşmuş.", [ad]);
  } else if (h.id === 'hoca') {
    if (h.dogru) add(oppMods, 'iq', 2);
    if (h.karar === 0) {
      add(mods, 'iq', 2);
      line = h.dogru ? L("🕵️ {0} gerçekten yeni bir planla geldi ama analizin onu çözdü (IQ +2).", [ad]) : L("🕵️ Analiz pahalıydı ama boşa değil: rakibi ezbere biliyorsun (IQ +2).");
    } else if (h.dogru) line = L("🕵️ {0} yeni hocasıyla bambaşka bir plan getirdi (rakip IQ +2).", [ad]);
  } else if (h.karar === 0) {
    if (h.dogru) {
      add(mods, 'iq', 3);
      line = L("🕵️ Zarftaki plan doğruydu: rakibinin her hamlesini önceden biliyorsun (IQ +3).");
    } else {
      add(mods, 'iq', -1);
      line = L("🕵️ Zarftaki plan sahteydi; parayı da güveni de kaybettin (IQ -1).");
    }
    if (chance(0.25)) {
      s.populerlik = clamp(s.populerlik - 4, 0, 100);
      line += ' ' + L("Üstelik olay basına sızdı: popülerlik -4.");
    }
  } else line = L("🕵️ Casusluk teklifini reddettin; kafeste temiz bir vicdanla duruyorsun.");
  if (line) s.haberler.unshift(line);
}
