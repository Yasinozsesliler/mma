// Hakem Modu derinlik katmanı: üç itibar (komisyon güveni, dövüşçü saygısı, taraftar imajı), hakem tarzı,
// organizasyon ilişkileri ve sözleşmeler, yorgunluk, uzmanlıklar, lisans sınavları, mentor görevleri, maç analizi,
// hakem kıyafetleri, dövüşçü hafızası, rakip hakem ve emeklilik. Motor ve kariyer katmanı yalnızca buradan okur;
// bu dosya onlardan yalnızca tür alır (döngüsel bağımlılık yok).
import { L } from '../i18n';
import { NAME_POOLS } from './data';
import { chance, clamp, pick, rand, shuffle } from './rng';
import type { MomentKind, RefBout, RefRun, RefTier, Truth } from './referee';
import type { RefSkill } from './refereeCareer';

// ---------- Üç itibar ----------

/** Komisyon güveni = r.itibar (terfi ve ünvan maçları). Diğer ikisi: */
export const saygi = (r: Pick<RefRun, 'saygi'>) => r.saygi ?? 40;
export const imaj = (r: Pick<RefRun, 'imaj'>) => r.imaj ?? 30;

export type Axes = { itibar: number; saygi: number; imaj: number };

/** Bir maçın üç itibara etkisi (komisyon zaten motor tarafından hesaplanır; burada saygı ve imaj). */
export function axesFromBout(r: RefRun, b: RefBout, puan: number, hata: boolean): { saygi: number; imaj: number } {
  let s = 0;
  let i = 0;
  for (const k of b.kararlar) {
    if (k.tip === 'erken') {
      s -= 4;
      i -= b.evSahibi && k.taraf === 0 ? 5 : 3;
    } else if (k.tip === 'gec') {
      s -= 6;
      i -= 2;
    } else if (k.tip === 'koruma') s += 2;
    else if (k.kind === 'faul') s += k.puan > 0 ? 1 : -2;
    else if ((k.kind === 'sarsildi' || k.kind === 'kilit') && k.puan === 3 && !k.durdu) i += 3; // cesur karar, maç sürdü
  }
  for (const c of b.kartlar) if (c.benim !== c.dogru && (c.benim === '10-10' || c.dogru === '10-10' ? false : c.benim.slice(-1) !== c.dogru.slice(-1))) i -= 3;
  if (puan >= 12 && !hata) {
    s += 1;
    i += 2;
  }
  if (puan < -8) i -= 4;
  const yildiz = b.etiketler?.includes('yildiz') ? 1.5 : 1;
  const yayin = b.yayin ? 1.5 : 1;
  if (s > 0 && hasPerk(b, 'sakinlik5', 'b')) s *= 1.5;
  if (i < 0 && hasPerk(b, 'sakinlik3', 'b')) i /= yayin * yildiz; // soğukkanlı: büyük sahne cezayı büyütmez
  return { saygi: Math.round(s), imaj: Math.round(i * yildiz * yayin) };
}

/** Dövüşçü saygısı faul sıklığını belirler: saygılı hakemin maçında dövüşçüler daha temiz dövüşür. */
export function foulRate(b: RefBout) {
  let p = 0.06;
  const s = b.saygi ?? 40;
  if (s < 25) p *= 1.5;
  else if (s >= 65) p *= 0.6;
  if (b.etiketler?.includes('faulcu')) p *= 2;
  if (b.etiketler?.includes('rovans')) p *= 1.5;
  return p;
}
export const stallRate = (b: RefBout) => 0.04 * (b.etiketler?.includes('rovans') ? 1.5 : 1);

// ---------- Hakem tarzı ----------

export type Tarz = 'koruyucu' | 'dengeli' | 'serbest';
export const tarzOf = (r: Pick<RefRun, 'tarz'>): Tarz => ((r.tarz ?? 0) <= -30 ? 'koruyucu' : (r.tarz ?? 0) >= 30 ? 'serbest' : 'dengeli');
export const TARZ_NAME: Record<Tarz, () => string> = {
  koruyucu: () => L("Koruyucu"),
  dengeli: () => L("Dengeli"),
  serbest: () => L("Bırak dövüşsünler"),
};
export const TARZ_ACIK: Record<Tarz, () => string> = {
  koruyucu: () => L("Dövüşçünün sağlığı önce gelir; tereddüt edince durdurursun."),
  dengeli: () => L("Ne erken ne geç: her anı kendi içinde tartarsın."),
  serbest: () => L("Dövüşçülere şans tanırsın; maçı son ana kadar akıtırsın."),
};
/** Tarz yalnızca tercih gerektiren anlardan ölçülür: gri anlar ve hatalı kararlar. Net doğru kararlar tarzı
 *  değiştirmez; gri anda ya da hatada durdurmak koruyucuya, devam ettirmek serbeste çeker. */
export function noteStyle(r: RefRun, kind: MomentKind, stop: boolean, truth: Truth) {
  if (kind !== 'sarsildi' && kind !== 'kilit') return;
  const dogru = truth === 'dur' ? stop : truth === 'devam' ? !stop : false;
  if (truth !== 'gri' && dogru) return;
  r.tarz = clamp((r.tarz ?? 0) + (stop ? -12 : 12), -100, 100);
}
/** Yükseldikçe artış yavaşlar: 90'ın üstü emek ister. */
export const ease = (cur: number, d: number) => (d > 0 ? Math.max(d > 0 ? 1 : 0, Math.round(d * (110 - cur) / 110)) : d);

// ---------- Organizasyonlar ----------

export type RefOrg = 'amator' | 'kulup' | 'genc' | 'cfc' | 'oktagon' | 'pfl' | 'one' | 'mvp' | 'dwcs' | 'ufc';
export const TIER_ORGS: Record<RefTier, RefOrg[]> = {
  amator: ['amator', 'kulup', 'genc'],
  bolgesel: ['cfc', 'oktagon'],
  buyuk: ['pfl', 'one', 'mvp', 'dwcs'],
  ucc: ['ufc'],
};
/** Organizasyonun sevdiği hakem tarzı */
export const ORG_TARZ: Record<RefOrg, Tarz> = { amator: 'koruyucu', kulup: 'dengeli', genc: 'koruyucu', cfc: 'dengeli', oktagon: 'serbest', pfl: 'dengeli', one: 'serbest', mvp: 'serbest', dwcs: 'dengeli', ufc: 'dengeli' };
export const iliski = (r: Pick<RefRun, 'iliski'>, o: string) => r.iliski?.[o] ?? 0;
export function bumpOrg(r: RefRun, o: string, d: number) {
  r.iliski = { ...(r.iliski ?? {}), [o]: clamp(iliski(r, o) + d, -50, 50) };
}
/** İlişkisi iyi olan organizasyon daha sık teklif yapar */
export function pickOrg(r: RefRun, tier: RefTier): RefOrg {
  const list = TIER_ORGS[tier];
  const w = list.map((o) => Math.max(0.15, 1 + iliski(r, o) / 25));
  let x = rand() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    x -= w[i];
    if (x <= 0) return list[i];
  }
  return list[0];
}

// ---------- Teklif etiketleri ----------

export type OfferTag = 'faulcu' | 'cene' | 'rovans' | 'yildiz';
export const TAG_INFO: Record<OfferTag, { icon: string; ad: () => string; acik: () => string }> = {
  faulcu: { icon: 'alert-octagon', ad: () => L("Faulcü dövüşçü"), acik: () => L("Kartta faulleriyle bilinen bir isim var: faul anları iki kat sık.") },
  cene: { icon: 'head-flash', ad: () => L("Zayıf çene"), acik: () => L("Dövüşçülerden biri çabuk sarsılır: durdurma kararları daha sık ve daha zor.") },
  rovans: { icon: 'sword-cross', ad: () => L("Gergin rövanş"), acik: () => L("Aralarında husumet var: faul ve kafeste kilitlenme daha sık. Ücret yüksek.") },
  yildiz: { icon: 'star', ad: () => L("Yıldız dövüşçü"), acik: () => L("Herkes bu maçı izliyor: taraftar imajına etkisi bir buçuk kat.") },
};
export function rollTags(): OfferTag[] {
  const all: OfferTag[] = ['faulcu', 'cene', 'rovans', 'yildiz'];
  const n = rand() < 0.45 ? 0 : rand() < 0.75 ? 1 : 2;
  return shuffle([...all]).slice(0, n);
}
export const yayinChance: Record<RefTier, number> = { amator: 0.1, bolgesel: 0.3, buyuk: 0.6, ucc: 0.9 };

// ---------- Sözleşme ----------

export const CONTRACT_BOUTS = 5;
/** Sözleşme teklifi: ilişkisi 20+ olan organizasyon, sözleşme yokken bazen sunar */
export function contractCandidate(r: RefRun): RefOrg | null {
  if (r.sozlesme) return null;
  const good = TIER_ORGS[r.seviye].filter((o) => iliski(r, o) >= 20);
  return good.length && chance(0.35) ? pick(good) : null;
}

// ---------- Yorgunluk ----------

export const yorgun = (r: Pick<RefRun, 'yorgunluk'>) => r.yorgunluk ?? 0;
/** Maç başında beceriler yorgunluk ve seyahatle düşer */
export function fatigueSkills(r: RefRun, bec: Partial<Record<RefSkill, number>>, uzak: boolean) {
  const out = { ...bec };
  const dec = (k: RefSkill) => (out[k] = Math.max(0, (out[k] ?? 0) - 1));
  const y = yorgun(r);
  if (y >= 60) {
    dec('okuma');
    dec('pozisyon');
  }
  if (y >= 85 || (uzak && !hasPerk(r, 'sakinlik3', 'b'))) dec('sakinlik');
  return out;
}
export function addFatigue(r: RefRun, uzak: boolean) {
  r.yorgunluk = clamp(yorgun(r) + 14 + (uzak ? 10 : 0), 0, 100);
}
export function rest(r: RefRun) {
  r.yorgunluk = clamp(yorgun(r) - 45, 0, 100);
}

// ---------- Uzmanlıklar ----------

export type PerkSlot = 'okuma3' | 'okuma5' | 'pozisyon3' | 'pozisyon5' | 'sakinlik3' | 'sakinlik5' | 'kural3' | 'kural5';
type Perk = { ad: () => string; acik: () => string };
export const PERKS: Record<PerkSlot, { a: Perk; b: Perk }> = {
  okuma3: {
    a: { ad: () => L("Sarsılma radarı"), acik: () => L("Sarsılan dövüşçü anlarında içgüdün her zaman konuşur.") },
    b: { ad: () => L("Kilit gözü"), acik: () => L("Kilit anlarında içgüdün her zaman konuşur.") },
  },
  okuma5: {
    a: { ad: () => L("Faul dedektifi"), acik: () => L("Faul anlarında içgüdün her zaman doğru yaptırımı söyler.") },
    b: { ad: () => L("Kesik ve kafes uzmanı"), acik: () => L("Kesik ve kafeste kilitlenme anlarında içgüdün her zaman konuşur.") },
  },
  pozisyon3: {
    a: { ad: () => L("Hızlı adım"), acik: () => L("Geç durdurmanın puan cezası azalır.") },
    b: { ad: () => L("Sabırlı göz"), acik: () => L("Gri anlarda beklemek daha sık tutar.") },
  },
  pozisyon5: {
    a: { ad: () => L("Kurtarıcı"), acik: () => L("Geç kaldığında bile araya girip fazladan darbeyi önlersin; saygı kaybı yarıya iner.") },
    b: { ad: () => L("Sahne hakimi"), acik: () => L("Kafeste kilitlenme anlarında yanlış karar puan kaybettirmez.") },
  },
  sakinlik3: {
    a: { ad: () => L("Basın ustası"), acik: () => L("Basın ve komisyon olaylarında konuşman her zaman bir puan daha iyi gelir.") },
    b: { ad: () => L("Soğukkanlı"), acik: () => L("Canlı yayın, ev sahibi salon ve seyahat seni etkilemez.") },
  },
  sakinlik5: {
    a: { ad: () => L("Demir sinir"), acik: () => L("Hataların komisyon güvenine bedeli yarıya iner.") },
    b: { ad: () => L("Lider"), acik: () => L("Dövüşçülerin saygısını bir buçuk kat hızlı kazanırsın.") },
  },
  kural3: {
    a: { ad: () => L("Faul hukuku"), acik: () => L("Faulde bir derece yanlış yaptırım puan kaybettirmez.") },
    b: { ad: () => L("Kart ustası"), acik: () => L("Kazananı yanlış yazdığın puan kartının cezası azalır.") },
  },
  kural5: {
    a: { ad: () => L("Tekrar izleme"), acik: () => L("Maç başına bir kez, karar anında görüntüyü izleyip gerçeği görürsün.") },
    b: { ad: () => L("Komisyon üyesi"), acik: () => L("Hatasız yönettiğin her maç komisyon güvenine fazladan iki puan katar.") },
  },
};
export const hasPerk = (x: { uz?: RefRun['uzmanlik']; uzmanlik?: RefRun['uzmanlik'] }, slot: PerkSlot, v: 'a' | 'b') => (x.uz ?? x.uzmanlik)?.[slot] === v;
/** Seçim bekleyen uzmanlık yuvaları (beceri 3 ve 5'e ulaştığında) */
export function pendingPerks(r: RefRun): PerkSlot[] {
  const out: PerkSlot[] = [];
  for (const k of ['okuma', 'pozisyon', 'sakinlik', 'kural'] as RefSkill[]) {
    const lv = r.beceri?.[k] ?? 0;
    if (lv >= 3 && !r.uzmanlik?.[`${k}3` as PerkSlot]) out.push(`${k}3` as PerkSlot);
    if (lv >= 5 && !r.uzmanlik?.[`${k}5` as PerkSlot]) out.push(`${k}5` as PerkSlot);
  }
  return out;
}
export function choosePerk(r: RefRun, slot: PerkSlot, v: 'a' | 'b') {
  if (!pendingPerks(r).includes(slot)) return;
  r.uzmanlik = { ...(r.uzmanlik ?? {}), [slot]: v };
}
/** İçgüdü her zaman konuşur mu (uzmanlıkla) */
export function alwaysInstinct(b: RefBout, kind: MomentKind) {
  return (
    (kind === 'sarsildi' && hasPerk(b, 'okuma3', 'a')) ||
    (kind === 'kilit' && hasPerk(b, 'okuma3', 'b')) ||
    (kind === 'faul' && hasPerk(b, 'okuma5', 'a')) ||
    ((kind === 'kesik' || kind === 'durgun') && hasPerk(b, 'okuma5', 'b'))
  );
}

// ---------- Lisans sınavı ----------

type Q = { q: () => string; a: (() => string)[]; d: number };
export const EXAM_QUESTIONS: Q[] = [
  { q: () => L("Dövüşçü yere düştü, kollarıyla başını kapatıyor ama karşılık vermiyor. Rauntun bitmesine 10 saniye var. En doğru karar?"), a: [() => L("Hemen durdur"), () => L("İzle; savunmasız kalırsa durdur"), () => L("Raundu bitir, sonra karar ver")], d: 1 },
  { q: () => L("Bir dövüşçü rauntta iki kez yere düşürdü ve ezici üstünlük kurdu. Bu raunt için doğru puan?"), a: [() => L("10-9"), () => L("10-8"), () => L("10-10")], d: 1 },
  { q: () => L("İlk faul, kazara bel altına bir tekme. Rakip hemen devam etmek istiyor. Yaptırım?"), a: [() => L("Sözlü uyarı"), () => L("Puan düşme"), () => L("Diskalifiye")], d: 0 },
  { q: () => L("Yerdeki rakibin kafasına bilerek diz atıldı ve rakip devam edemiyor. Yaptırım?"), a: [() => L("Puan düşme"), () => L("Diskalifiye"), () => L("Sözlü uyarı")], d: 1 },
  { q: () => L("Kilitteki dövüşçü rakibinin sırtına iki kez hafifçe vurdu. Ne yaparsın?"), a: [() => L("Hemen araya girerim: teslim oldu"), () => L("Bir süre daha izlerim"), () => L("Raundun bitmesini beklerim")], d: 0 },
  { q: () => L("Kaştaki kesikten kan doğrudan göze akıyor, dövüşçü rakibini göremiyor. İlk adım?"), a: [() => L("Maçı hemen bitiririm"), () => L("Doktoru çağırırım"), () => L("Raunt arasına kadar beklerim")], d: 1 },
  { q: () => L("İki dövüşçü yarım dakikadır kafeste kenetli, kimse vuruş atmıyor. Ne yaparsın?"), a: [() => L("Ayırıp ortadan başlatırım"), () => L("İkisine de puan düşerim"), () => L("Hiçbir şey; kafes dövüşün parçası")], d: 0 },
  { q: () => L("Raunt çok dengeli geçti; iki taraf da benzer sayıda etkili vuruş attı, takedown yok. En savunulabilir puan?"), a: [() => L("10-9 daha saldırgana"), () => L("10-10"), () => L("10-8")], d: 1 },
  { q: () => L("Aynı dövüşçü bu maçta ikinci kez kafesi tutarak takedown savundu. Yaptırım?"), a: [() => L("Yine sözlü uyarı"), () => L("Puan düşme"), () => L("Diskalifiye")], d: 1 },
  { q: () => L("Sarsılan dövüşçü bacağa sarılıp kalkmaya çalışıyor, gözleri seni takip ediyor. Karar?"), a: [() => L("Devam ettiririm"), () => L("Durdururum"), () => L("Doktor çağırırım")], d: 0 },
  { q: () => L("Puan kartında hangisi rauntu en çok belirler?"), a: [() => L("Etkili vuruşlar ve hasar"), () => L("Kafes kontrolü süresi"), () => L("Seyircinin tepkisi")], d: 0 },
  { q: () => L("Bir köşe havluyu kafesin içine attı. Ne yaparsın?"), a: [() => L("Görmezden gelirim, karar benim"), () => L("Maçı durdururum: köşe teslim etti"), () => L("Raunt arasına kadar beklerim")], d: 1 },
];
export const EXAM_SIZE = 5;
export const EXAM_PASS = 4;
export function makeExam(tier: RefTier): NonNullable<RefRun['sinav']> {
  const idx = shuffle(EXAM_QUESTIONS.map((_, i) => i)).slice(0, EXAM_SIZE);
  return { tier, sorular: idx, cevap: idx.map(() => null) };
}

// ---------- Mentor görevleri ----------

export type MentorTask = { id: string; hedef: number; ilerleme: number };
type MentorCtx = { b: RefBout; puan: number; hata: boolean };
const MENTOR: { id: string; hedef: number; metin: (n: number) => string; step: (c: MentorCtx, cur: number) => number }[] = [
  { id: 'gec_yok', hedef: 3, metin: (n) => L("{0} maç üst üste geç durdurma yapmadan yönet", [n]), step: (c, cur) => (c.b.kararlar.some((k) => k.tip === 'gec') ? 0 : cur + 1) },
  { id: 'kart', hedef: 4, metin: (n) => L("Puan kartlarında {0} kez resmî kartı birebir tuttur", [n]), step: (c, cur) => cur + c.b.kartlar.filter((k) => k.benim === k.dogru).length },
  { id: 'faul', hedef: 2, metin: (n) => L("{0} faulde doğru yaptırımı ver", [n]), step: (c, cur) => cur + c.b.kararlar.filter((k) => k.kind === 'faul' && k.puan > 0).length },
  { id: 'kusursuz', hedef: 1, metin: () => L("Bir maçı hiç hata yapmadan yönet"), step: (c, cur) => cur + (!c.hata && c.b.kararlar.length + c.b.kartlar.length >= 2 ? 1 : 0) },
  { id: 'ana', hedef: 2, metin: (n) => L("{0} ana kart maçı yönet", [n]), step: (c, cur) => cur + (c.b.anaKart ? 1 : 0) },
  { id: 'koruma', hedef: 1, metin: () => L("Bir dövüşçüyü tam zamanında koru"), step: (c, cur) => cur + (c.b.kararlar.some((k) => k.tip === 'koruma') ? 1 : 0) },
];
export const mentorText = (t: MentorTask) => MENTOR.find((m) => m.id === t.id)?.metin(t.hedef) ?? '';
export function newMentorTask(prev?: string): MentorTask {
  const m = pick(MENTOR.filter((x) => x.id !== prev));
  return { id: m.id, hedef: m.hedef, ilerleme: 0 };
}
/** Görev ilerler; tamamlandıysa true döner (ödülü kariyer katmanı verir) */
export function stepMentor(r: RefRun, c: MentorCtx): boolean {
  const t = r.mentor;
  if (!t) return false;
  const m = MENTOR.find((x) => x.id === t.id);
  if (!m) return false;
  t.ilerleme = Math.min(t.hedef, m.step(c, t.ilerleme));
  return t.ilerleme >= t.hedef;
}
export function makeMentorName() {
  const p = pick(NAME_POOLS);
  return `${pick(p.ad)} ${pick(p.soyad)}`;
}

// ---------- Maç analizi ----------

export const WHY: Record<Truth, (kind: MomentKind) => string> = {
  dur: (k) => (k === 'kilit' ? L("Kilitteki dövüşçü artık savaşmıyordu: hemen araya girmek gerekiyordu.") : L("Dövüşçü savunmasızdı, karşılık vermiyordu: korunması gerekiyordu.")),
  devam: (k) =>
    k === 'kesik' ? L("Kesik küçüktü ve görüşü etkilemiyordu: maç sürmeliydi.") : k === 'durgun' ? L("Kafeste kısa vuruşlarla iş yapılıyordu: ayırmak için erkendi.") : k === 'kilit' ? L("Kilitteki dövüşçü hâlâ kurtulmaya çalışıyordu: beklemek doğruydu.") : L("Dövüşçü hâlâ savaşıyordu: durdurmak için erkendi."),
  gri: () => L("İnce bir çizgiydi: iki karar da savunulabilirdi."),
  uyar: () => L("Kazara ve ilk faul: sözlü uyarı yeterliydi."),
  puan: () => L("Faul kasıtlıydı ya da tekrar ediyordu: puan düşmek gerekiyordu."),
  dq: () => L("Kasıtlı faul ve rakip devam edemiyor: diskalifiye gerekiyordu."),
  doktor: () => L("Kan gözüne akıyordu: doktorun bakması gerekiyordu."),
  ayir: () => L("Kafeste kimse iş yapmıyordu: ayırma zamanıydı."),
};

// ---------- Kıyafetler (yalnızca görünüm) ----------

export const KIYAFETLER: { id: string; renk: string; ad: () => string; kosul: () => string; acik: (r: RefRun) => boolean }[] = [
  { id: 'klasik', renk: '#15161a', ad: () => L("Klasik siyah"), kosul: () => L("Başlangıç"), acik: () => true },
  { id: 'gri', renk: '#4a4f5a', ad: () => L("Gece grisi"), kosul: () => L("10 maç yönet"), acik: (r) => r.mac >= 10 },
  { id: 'mavi', renk: '#1d3a6e', ad: () => L("Federasyon mavisi"), kosul: () => L("Bölgesel lisans"), acik: (r) => r.seviye !== 'amator' },
  { id: 'bordo', renk: '#5a1420', ad: () => L("Bordo"), kosul: () => L("5 kusursuz maç"), acik: (r) => r.kusursuz >= 5 },
  { id: 'yesil', renk: '#1f4a35', ad: () => L("Zümrüt"), kosul: () => L("Bir mentor görevini tamamla"), acik: (r) => (r.mentorTamam ?? 0) >= 1 },
  { id: 'altin', renk: '#6b5414', ad: () => L("Şampiyon altını"), kosul: () => L("Yılın Hakemi ol"), acik: (r) => r.oduller.length >= 1 },
  { id: 'beyaz', renk: '#c9ccd2', ad: () => L("UCC beyazı"), kosul: () => L("UCC lisansı"), acik: (r) => r.seviye === 'ucc' },
];
export const kiyafetRenk = (r: Pick<RefRun, 'kiyafet'>) => KIYAFETLER.find((k) => k.id === r.kiyafet)?.renk ?? KIYAFETLER[0].renk;

// ---------- Dövüşçü hafızası ----------

export type Hatira = { ad: string; ulke: string; neden: 'erken' | 'gec' | 'dq' };
export const HATIRA_METIN: Record<Hatira['neden'], () => string> = {
  erken: () => L("geçen sefer onu erken durdurmuştun"),
  gec: () => L("geçen sefer onu geç kurtarmıştın"),
  dq: () => L("geçen sefer onu diskalifiye etmiştin"),
};
export function remember(r: RefRun, h: Hatira) {
  r.hafiza = [h, ...(r.hafiza ?? []).filter((x) => x.ad !== h.ad)].slice(0, 12);
}
export const pickMemory = (r: RefRun): Hatira | null => (r.hafiza?.length && chance(0.2) ? pick(r.hafiza) : null);

// ---------- Rakip hakem ----------

export function pickRival(r: RefRun): string | undefined {
  const pool = (r.rakipler ?? []).filter((x) => x.tier === 'bolgesel' || x.tier === 'amator');
  return (pool.length ? pick(pool) : r.rakipler?.[0])?.ad;
}

// ---------- Emeklilik ----------

export const RETIRE_MIN = 30;
export type HallEntry = { ad: string; ulke: string; mac: number; seviye: RefTier; oduller: number; kusursuz: number; onur: boolean; yol: 'egitmen' | 'yorumcu'; tarih: number };
export function hallWorthy(r: RefRun) {
  return r.oduller.length >= 2 || (r.seviye === 'ucc' && r.itibar >= 80 && r.mac >= 60) || r.kusursuz >= 25;
}
