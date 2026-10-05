// Beyin sağlığı: yenilen ağır darbeler, nakavtlar ve yere düşmeler kalıcı bir hasar sayacına (0-100) işler.
// Eşiklerde (30 / 55 / 75 / 90) doktor raporu gelir ve oyuncu karar verir. Yüksek hasar kafeste çeneyi zayıflatır;
// emeklilikte sonraki hayatın anlatımı buna göre değişir. Hasar iyileşmez, yalnızca küçük kısımlar dinlenmeyle toparlanır.
import { L, LOC } from '../i18n';
import { addStat, advanceWeeks } from './character';
import { clamp } from './rng';
import type { FightState, GameState, Stats } from './types';

export const BRAIN_STEPS = [30, 55, 75, 90] as const;
export type BrainStep = (typeof BRAIN_STEPS)[number];
export type BrainChoice = 'koruma' | 'norolog' | 'devam' | 'dinlen' | 'emekli' | 'lisans';

export const brainOf = (s: GameState) => s.beyin ?? 0;

export function brainLabel(b: number) {
  return b >= 90 ? L("Kritik") : b >= 75 ? L("Ciddi hasar") : b >= 55 ? L("Belirgin hasar") : b >= 30 ? L("Hafif hasar") : L("Sağlıklı");
}
export const brainColor = (b: number) => (b >= 75 ? '#e63946' : b >= 55 ? '#f08a3c' : b >= 30 ? '#f2c14e' : '#3ecf7a');

/** Dövüş sonrası hasar: yenilen vuruşlar, yere düşmeler ve nakavt. */
export function brainAfterFight(s: GameState, fs: FightState, koLoss: boolean): string[] {
  const mult = s.beyinKoruma ? 0.75 : 1;
  const raw = fs.pHasar * 0.02 + fs.pKnockdown * 1.2 + (koLoss ? 4 : 0);
  const d = Math.round(raw * mult);
  if (d <= 0) return [];
  const once = brainOf(s);
  s.beyin = clamp(once + d, 0, 100);
  const lines: string[] = [];
  if (d >= 4) lines.push(L("🧠 Ağır darbeler aldın. Beyin hasarı +{0} ({1}/100).", [d, s.beyin]));
  // Birden fazla eşik aşıldıysa en yükseğinin raporu gelir; alttakiler okunmuş sayılır.
  const crossed = BRAIN_STEPS.filter((t) => once < t && s.beyin! >= t && !(s.beyinEsik ?? []).includes(t));
  if (crossed.length) {
    const prev = s.beyinUyari ? [s.beyinUyari] : [];
    s.beyinEsik = [...(s.beyinEsik ?? []), ...prev, ...crossed.slice(0, -1)];
    s.beyinUyari = crossed[crossed.length - 1];
    lines.push(L("🩺 Doktor seni muayeneye çağırıyor. Sonuçlar kariyer ekranında."));
  }
  return lines;
}

/** Kafes etkisi: hasar 35'i geçince çene zayıflar (en fazla -8). */
export function brainMods(s: GameState, mods: Partial<Stats>) {
  const p = Math.min(8, Math.floor(Math.max(0, brainOf(s) - 45) / 7));
  if (p) mods.cene = (mods.cene ?? 0) - p;
}
export const brainChinPenalty = (s: GameState) => Math.min(8, Math.floor(Math.max(0, brainOf(s) - 45) / 7));

const NEURO_COST: Record<GameState['stage'], number> = { amator: 800, bolgesel: 2500, buyuk: 8000, ufc: 25000 };
const LICENSE_COST: Record<GameState['stage'], number> = { amator: 2000, bolgesel: 6000, buyuk: 20000, ufc: 60000 };

export interface BrainReport {
  baslik: string;
  metin: string;
  secenekler: { key: BrainChoice; ad: string; aciklama: string; maliyet?: number }[];
}

export function brainReport(s: GameState): BrainReport | null {
  const t = s.beyinUyari;
  if (!t) return null;
  const neuro = { key: 'norolog' as const, ad: L("Nörologa git"), aciklama: L("Ayrıntılı tarama ve tedavi. Hasar -4."), maliyet: NEURO_COST[s.stage] };
  const devam = { key: 'devam' as const, ad: L("Boş ver, devam"), aciklama: L("Raporu çekmeceye kaldır. Hiçbir şey değişmez.") };
  if (t === 30)
    return {
      baslik: L("Doktor uyarısı"),
      metin: L("Rutin taramada küçük izler görüldü. \"Henüz endişelenecek bir şey yok, ama sparringde kafaya aldığın darbeleri azaltmalısın.\""),
      secenekler: [{ key: 'koruma', ad: L("Kafa sparringini bırak"), aciklama: L("Bundan sonra hasar %25 daha az birikir. Canlı sparring keskinliği gider: Hız kalıcı -1.") }, neuro, devam],
    };
  if (t === 55)
    return {
      baslik: L("Nörolog raporu"),
      metin: L("Tepki sürelerin yavaşlamış, baş ağrıların sık. Doktor ciddi: \"Çenen eskisi gibi değil. Kafeste daha çabuk sarsılacaksın.\""),
      secenekler: [{ key: 'dinlen', ad: L("8 hafta tam dinlenme"), aciklama: L("Hasar -5, sağlık tamamen dolar.") }, neuro, devam],
    };
  if (t === 75)
    return {
      baslik: L("Son uyarı"),
      metin: L("Doktor gözlerinin içine bakıyor: \"Bir ağır nakavt daha hayatını değiştirebilir. Ailen için düşün.\""),
      secenekler: [{ key: 'emekli', ad: L("Eldivenleri as"), aciklama: L("Sağlığın her şeyden önemli. Kariyer burada biter.") }, neuro, { ...devam, ad: L("Bir maç daha"), aciklama: L("Riski bilerek devam et.") }],
    };
  return {
    baslik: L("Lisans askıya alındı"),
    metin: L("Atletik komisyon tarama sonuçlarını gördü ve dövüş lisansını askıya aldı. Ya emekli olacaksın ya da lisansı başka bir yerden alacaksın."),
    secenekler: [
      { key: 'emekli', ad: L("Emekli ol"), aciklama: L("Onurlu bir veda.") },
      { key: 'lisans', ad: L("Başka bir eyaletten lisans al"), aciklama: L("Para ve itibar kaybı. Basın seni eleştirecek: popülerlik -8."), maliyet: LICENSE_COST[s.stage] },
    ],
  };
}

export function chooseBrain(s: GameState, key: BrainChoice): string {
  const t = s.beyinUyari;
  const rep = brainReport(s);
  if (!t || !rep) return '';
  const opt = rep.secenekler.find((o) => o.key === key);
  if (!opt) return '';
  if (opt.maliyet && s.para < opt.maliyet) return L("Bunun için paran yetmiyor.");
  if (opt.maliyet) s.para -= opt.maliyet;
  s.beyinEsik = [...(s.beyinEsik ?? []), t];
  s.beyinUyari = undefined;
  let msg: string;
  if (key === 'koruma') {
    s.beyinKoruma = true;
    addStat(s.fighter.stats, 'hiz', -1);
    msg = L("🧠 Kafa sparringini bıraktın. Daha az hasar alacaksın ama keskinliğin biraz azaldı.");
  } else if (key === 'norolog') {
    s.beyin = clamp(brainOf(s) - 4, 0, 100);
    msg = L("🧠 Nörolog tedavisi iyi geldi. Beyin hasarı {0}/100.", [s.beyin]);
  } else if (key === 'dinlen') {
    advanceWeeks(s, 8);
    s.beyin = clamp(brainOf(s) - 5, 0, 100);
    s.saglik = 100;
    msg = L("🛌 8 hafta tam dinlendin. Baş ağrıların azaldı. Beyin hasarı {0}/100.", [s.beyin]);
  } else if (key === 'emekli') {
    s.beyinEmekli = true;
    s.phase = 'emeklilik';
    msg = L("🧤 Doktorunu dinledin ve eldivenleri astın. Sağlığın için verilmiş en zor karar.");
  } else if (key === 'lisans') {
    s.populerlik = clamp(s.populerlik - 8, 0, 100);
    msg = L("📄 Başka bir eyaletten lisans aldın (${0}). Basın sert: \"Kim durduracak onu?\"", [opt.maliyet!.toLocaleString(LOC)]);
  } else msg = L("🩺 Raporu çekmeceye kaldırdın.");
  s.haberler.unshift(msg);
  return msg;
}

/** Emeklilik ekranında sonraki hayat. */
export function brainEpilogue(s: GameState): string {
  const b = brainOf(s);
  if (s.beyinEmekli) return L("Doktorunu dinleyip zamanında bıraktı. Yıllar sonra bile hafızası yerinde, çocuklarına bütün maçlarını tek tek anlatıyor.");
  if (b >= 75) return L("Kafeste aldığı darbelerin bedelini emeklilikte ödüyor: konuşması yavaşladı, isimleri unutuyor. Eski rakipleri onu ziyarete geliyor.");
  if (b >= 55) return L("Sık sık baş ağrısı çekiyor ve bazı günler kelimeleri bulmakta zorlanıyor. Yine de salona gelip gençlere ders veriyor.");
  if (b >= 30) return L("Kariyerin izleri hafif: arada bir baş ağrısı, soğuk havalarda eski nakavtları hatırlatan bir sızı.");
  return L("Kafesten sağlıklı çıktı. Zihni berrak, enerjisi yerinde; ikinci bir hayata hazır.");
}
