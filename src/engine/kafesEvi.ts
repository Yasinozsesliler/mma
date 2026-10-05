// Kafes Evi: kariyerin başında bir kez gelen realite şovu daveti. 8 dövüşçü aynı evde yaşar; mutfak kavgaları,
// ittifaklar, itiraf odası ve koç oyunları arasında eleme maçları (çeyrek final, yarı final, final) yapılır.
// Maçlar gösteri maçıdır, karneye işlenmez. Ekran süresi takipçi getirir, odak dövüşü etkiler; şampiyona
// büyük organizasyonlardan kontrat teklifi.
import { L, LOC } from '../i18n';
import { advanceWeeks, statAverage } from './character';
import { addFollowers, fmtDelta, followers } from './fame';
import { PLANS, startFight } from './fight';
import { generateOpponent, weakest } from './opponents';
import { chance, clamp, pick, shuffle } from './rng';
import { STAT_LABELS, type FightState, type GameState, type Opponent, type PlanKey, type Stats } from './types';

export const KE_PLAYER = 'oyuncu';
export type SceneId = 'mutfak' | 'ittifak' | 'gece' | 'itiraf' | 'koc' | 'ozlem' | 'kavga' | 'sizinti';

export interface KafesEvi {
  durum: 'davet' | 'aktif' | 'bitti';
  /** Davetin geldiği dövüş sayısı: bir sonraki maça kadar geçerli */
  davetDovus: number;
  kisiler: { id: string; ad: string; soyad: string; lakap: string; guc: number }[];
  rakipler: Opponent[];
  /** Ev arkadaşlarıyla ilişki (-3 düşman … +3 dost) */
  iliski: Record<string, number>;
  muttefik?: string;
  /** Her tur sonunda turu geçenlerin id'leri */
  turlar: string[][];
  tur: number;
  adim: 'sahne' | 'plan' | 'dovus' | 'sonuc';
  sahneSay: number;
  sahne?: { id: SceneId; hedef: string };
  /** Son sahnenin sonucu (bir sonraki sahneye kadar gösterilir) */
  sonSahne?: string;
  /** Ekran süresi 0-100: şov bitince takipçi ve popülerlik */
  ekran: number;
  /** Odak -3…+3: dövüşte zihin ve kondisyon */
  odak: number;
  dovus?: FightState;
  sonNot?: string[];
  sonuc?: 'sampiyon' | 'final' | 'yari' | 'ceyrek';
  gorulen: SceneId[];
}

export const KE_ROUNDS = () => [L("ÇEYREK FİNAL"), L("YARI FİNAL"), L("FİNAL")];
const SCENES_PER_ROUND = 2;

const proFights = (s: GameState) => s.rekor.g + s.rekor.m + s.rekor.b;

/** Dövüş sonrası: kariyerin başında bir kez davet. Kabul edilmezse bir sonraki maçta düşer. */
export function maybeKafesEviInvite(s: GameState) {
  const k = s.kafesEvi;
  if (k?.durum === 'davet' && k.davetDovus !== s.gecmis.length) {
    s.kafesEvi = { ...k, durum: 'bitti' };
    return;
  }
  if (k) return;
  if (!['amator', 'bolgesel'].includes(s.stage) || proFights(s) > 8 || s.amator.g < 2 || !chance(0.22)) return;
  s.kafesEvi = { durum: 'davet', davetDovus: s.gecmis.length, kisiler: [], rakipler: [], iliski: {}, turlar: [], tur: 0, adim: 'sahne', sahneSay: 0, ekran: 20, odak: 0, gorulen: [] };
  s.haberler.unshift(L("📺 Kafes Evi yapımcıları aradı: yeni sezon için seni istiyorlar! 8 dövüşçü, tek ev, tek şampiyon."));
}

export const kafesEviInvite = (s: GameState) => s.kafesEvi?.durum === 'davet' && s.kafesEvi.davetDovus === s.gecmis.length;

export function declineKafesEvi(s: GameState) {
  if (s.kafesEvi) s.kafesEvi.durum = 'bitti';
  s.haberler.unshift(L("📺 Kafes Evi teklifini reddettin. Kamera yerine salonu seçtin."));
}

export function acceptKafesEvi(s: GameState) {
  const k = s.kafesEvi;
  if (!k) return;
  const rakipler: Opponent[] = [];
  for (let i = 0; i < 7; i++) rakipler.push(generateOpponent(s, { zorluk: i < 2 ? 1 : i < 5 ? 0 : -1 }, rakipler));
  const sirali = shuffle([...rakipler]);
  k.rakipler = sirali;
  k.kisiler = [
    { id: KE_PLAYER, ad: s.fighter.ad, soyad: s.fighter.soyad, lakap: s.fighter.lakap, guc: statAverage(s.fighter.stats) },
    ...sirali.map((o) => ({ id: o.id, ad: o.ad, soyad: o.soyad, lakap: o.lakap, guc: statAverage(o.stats) })),
  ];
  k.iliski = Object.fromEntries(sirali.map((o) => [o.id, 0]));
  k.durum = 'aktif';
  k.tur = 0;
  k.adim = 'sahne';
  k.sahneSay = 0;
  k.sahne = nextScene(s);
  s.phase = 'kafesEvi';
  s.haberler.unshift(L("📺 Kafes Evi'ne taşındın. Kameralar 7/24 açık."));
}

/** Bu turda hâlâ yarışan ev arkadaşları */
function alive(k: KafesEvi): string[] {
  return k.tur === 0 ? k.kisiler.map((x) => x.id) : k.turlar[k.tur - 1];
}

/** Oyuncunun bu turdaki rakibi (eşleşme: sıradaki komşu). */
export function keOpponent(k: KafesEvi): Opponent | undefined {
  const a = alive(k);
  const i = a.indexOf(KE_PLAYER);
  if (i < 0) return undefined;
  const id = a[i % 2 === 0 ? i + 1 : i - 1];
  return k.rakipler.find((o) => o.id === id);
}

export const keName = (k: KafesEvi, id: string) => {
  const p = k.kisiler.find((x) => x.id === id);
  return p ? `${p.ad} "${p.lakap}" ${p.soyad}` : '';
};
const shortName = (k: KafesEvi, id: string) => k.kisiler.find((x) => x.id === id)?.soyad ?? '';

function nextScene(s: GameState): { id: SceneId; hedef: string } {
  const k = s.kafesEvi!;
  const all: SceneId[] = ['mutfak', 'ittifak', 'gece', 'itiraf', 'koc', 'ozlem', 'kavga', 'sizinti'];
  const pool = all.filter((x) => !k.gorulen.includes(x) && (x !== 'ittifak' || !k.muttefik));
  const id = pick(pool.length ? pool : all);
  k.gorulen.push(id);
  const others = k.kisiler.filter((x) => x.id !== KE_PLAYER).map((x) => x.id);
  // Önce hâlâ evde olanlardan biri; rakip varsa itirafta ona laf atılır
  const live = alive(k).filter((x) => x !== KE_PLAYER);
  const opp = keOpponent(k);
  const hedef = id === 'itiraf' && opp ? opp.id : pick(live.length ? live : others);
  return { id, hedef };
}

interface Choice {
  ad: () => string;
  uygula: (s: GameState, k: KafesEvi, h: string) => string;
}

const rel = (k: KafesEvi, id: string, d: number) => (k.iliski[id] = clamp((k.iliski[id] ?? 0) + d, -3, 3));
const ekran = (k: KafesEvi, d: number) => (k.ekran = clamp(k.ekran + d, 0, 100));
const odak = (k: KafesEvi, d: number) => (k.odak = clamp(k.odak + d, -3, 3));

export const SCENES: Record<SceneId, { baslik: () => string; metin: (h: string) => string; secenekler: Choice[] }> = {
  mutfak: {
    baslik: () => L("Mutfak krizi"),
    metin: (h) => L("Kampa özel hazırladığın tavuk göğsü yok. Buzdolabının önünde {0} ağzı dolu sırıtıyor.", [h]),
    secenekler: [
      { ad: () => L("Yüzüne söyle"), uygula: (s, k, h) => (rel(k, h, -2), ekran(k, 12), odak(k, -1), L("Bağırış çağırış, kameralar bayram etti. Ekran süresi +12, ama sinirin bozuldu.")) },
      { ad: () => L("Gülüp geç, yenisini yap"), uygula: (s, k, h) => (rel(k, h, 1), ekran(k, 2), L("Olgun davrandın. {0} sonradan özür diledi.", [shortName(k, h)])) },
      { ad: () => L("Şakayla intikam al"), uygula: (s, k, h) => (chance(0.6) ? (ekran(k, 9), rel(k, h, -1), L("Proteinine tuz kattın. Bütün ev kahkahaya boğuldu. Ekran süresi +9.")) : (ekran(k, 5), odak(k, -1), rel(k, h, -2), L("Şaka ters tepti, bütün ev sana kızdı."))) },
    ],
  },
  ittifak: {
    baslik: () => L("Gizli ittifak"),
    metin: (h) => L("Gece yarısı {0} yanına geldi: \"Birbirimizi kollayalım. Rakiplerin bütün açıklarını sana anlatırım.\"", [h]),
    secenekler: [
      { ad: () => L("Anlaştık"), uygula: (s, k, h) => ((k.muttefik = h), rel(k, h, 2), L("El sıkıştınız. Bundan sonra rakiplerin hakkında içeriden bilgi alacaksın.")) },
      { ad: () => L("Ben yalnız çalışırım"), uygula: (s, k, h) => (odak(k, 1), rel(k, h, -1), L("Reddettin. Kafan rahat, odağın yerinde.")) },
      { ad: () => L("Kabul et gibi yap"), uygula: (s, k, h) => (chance(0.5) ? ((k.muttefik = h), ekran(k, 6), L("Hem bilgiyi aldın hem de elini göstermedin. Yapımcılar bayıldı.")) : (rel(k, h, -3), ekran(k, 10), L("İkili oyunun itiraf odasında ortaya çıktı! {0} artık en büyük düşmanın.", [shortName(k, h)]))) },
    ],
  },
  gece: {
    baslik: () => L("Evde parti"),
    metin: () => L("Yapımcılar eve müzik ve pizza soktu. Ev arkadaşların dans ediyor, kameralar seni arıyor."),
    secenekler: [
      { ad: () => L("Partinin yıldızı ol"), uygula: (s, k) => (ekran(k, 10), odak(k, -1), alive(k).forEach((id) => id !== KE_PLAYER && rel(k, id, 1)), L("Sabaha kadar dans ettin. Herkes seni seviyor ama sabah antrenmanında ölüyordun.")) },
      { ad: () => L("Erkenden yat"), uygula: (s, k) => (odak(k, 1), L("Gürültüye rağmen uyudun. Sabah taptazesin.")) },
      { ad: () => L("Gizlice idman yap"), uygula: (s, k) => (odak(k, 2), ekran(k, -2), L("Herkes eğlenirken bodrumda ip atladın. Kimse görmedi ama vücudun gördü.")) },
    ],
  },
  itiraf: {
    baslik: () => L("İtiraf odası"),
    metin: (h) => L("Kırmızı ışık yandı. Yapımcı soruyor: \"Rakibin {0} hakkında ne düşünüyorsun?\"", [h]),
    secenekler: [
      { ad: () => L("Ateş püskür"), uygula: (s, k, h) => (ekran(k, 12), rel(k, h, -2), L("\"Onu kafeste uyutacağım.\" Bölüm bu sözle tanıtıldı. Ama rakibin de bunu izledi.")) },
      { ad: () => L("Saygılı ol"), uygula: (s, k, h) => (ekran(k, 3), odak(k, 1), rel(k, h, 1), L("\"İyi dövüşçü, ama hazırım.\" Sakin ve kendinden emin.")) },
      { ad: () => L("Hikâyeni anlat"), uygula: (s, k) => (ekran(k, 9), L("Mahallende başlayan yolculuğunu anlattın. İzleyiciler gözyaşlarını tutamadı.")) },
    ],
  },
  koc: {
    baslik: () => L("Koç oyunu"),
    metin: () => L("Haftanın koç oyunu: halat tırmanma, lastik devirme ve sprint. Kazanan takıma $5.000 ve bir gece serbest."),
    secenekler: [
      { ad: () => L("Tüm gücünle yüklen"), uygula: (s, k) => koachGame(s, k, 0.15) },
      { ad: () => L("Takımı yönet, taktik ver"), uygula: (s, k) => (s.fighter.stats.iq >= 50 || chance(0.5) ? (ekran(k, 6), (s.para += 2500), L("Takımını dakikası dakikasına yönettin ve kazandınız! Payına $2.500.")) : (ekran(k, 2), L("Taktiğin tutmadı, ikinci oldunuz."))) },
      { ad: () => L("Sakatlanmamak için yavaş git"), uygula: (s, k) => (odak(k, 1), ekran(k, -3), L("Takım arkadaşların sana surat astı ama vücudun maça sağlam.")) },
    ],
  },
  ozlem: {
    baslik: () => L("Eve özlem"),
    metin: () => L("Üç haftadır telefon yok. Yapımcılar ailenden gelen bir mektup getirdi."),
    secenekler: [
      { ad: () => L("Kameraların önünde oku"), uygula: (s, k) => (ekran(k, 10), odak(k, 1), L("Sesin titredi, bütün ev sana sarıldı. Bölümün en çok izlenen anı.")) },
      { ad: () => L("Yalnızken oku"), uygula: (s, k) => (odak(k, 2), L("Mektubu yastığının altına koydun. Kimin için dövüştüğünü hatırladın.")) },
      { ad: () => L("Okuma, aklın dağılmasın"), uygula: (s, k) => (odak(k, -1), ekran(k, 3), L("Mektubu açmadın. Ama her gece aklına geldi.")) },
    ],
  },
  kavga: {
    baslik: () => L("Salonda kavga"),
    metin: (h) => L("{0} ile başka bir ev arkadaşı antrenmanda birbirine girdi. Herkes sana bakıyor.", [h]),
    secenekler: [
      { ad: () => L("Araya gir, ayır"), uygula: (s, k, h) => (rel(k, h, 1), ekran(k, 6), L("İkisini de ayırdın. Ev sana lider gözüyle bakıyor.")) },
      { ad: () => L("Telefonla çek"), uygula: (s, k, h) => (ekran(k, 4), rel(k, h, -1), L("Görüntü bölüm fragmanına girdi. {0} bunu unutmayacak.", [shortName(k, h)])) },
      { ad: () => L("Gaz ver"), uygula: (s, k, h) => (ekran(k, 9), rel(k, h, -1), odak(k, -1), L("\"Vur! Vur!\" Yapımcılar sevindi, ev karıştı.")) },
    ],
  },
  sizinti: {
    baslik: () => L("Sızıntı"),
    metin: (h) => L("Biri senin antrenman notlarını bulup {0} adlı ev arkadaşına vermiş. Kim yaptı?", [h]),
    secenekler: [
      { ad: () => L("Bütün evi topla, hesap sor"), uygula: (s, k) => (ekran(k, 11), odak(k, -1), L("Toplantı kavgaya döndü, kimse suçu üstlenmedi. Bölümün finali buydu.")) },
      { ad: () => L("Planını değiştir"), uygula: (s, k) => (odak(k, 1), L("Notları değiştirdin. Artık onlar yanlış bilgiyle hazırlanıyor.")) },
      { ad: () => L("Sahte not bırak"), uygula: (s, k, h) => (ekran(k, 7), rel(k, h, -1), L("Masaya \"sol kroşem zayıf\" yazan bir kâğıt bıraktın. Yem atıldı.")) },
    ],
  },
};

function koachGame(s: GameState, k: KafesEvi, bonus: number): string {
  const p = (s.fighter.stats.kondisyon + s.fighter.stats.hiz) / 200 + bonus;
  if (chance(p)) {
    s.para += 5000;
    ekran(k, 8);
    return L("Halatın tepesine ilk sen çıktın! Takımın kazandı: +$5.000, ekran süresi +8.");
  }
  ekran(k, 3);
  if (chance(0.2)) {
    s.saglik = clamp(s.saglik - 6, 5, 100);
    return L("Sprintte arka adalen çekti. Kaybettiniz ve sağlık -6.");
  }
  return L("Son ana kadar zorladın ama diğer takım kazandı.");
}

export function chooseScene(s: GameState, idx: number) {
  const k = s.kafesEvi;
  if (!k?.sahne || k.adim !== 'sahne') return;
  const sc = SCENES[k.sahne.id];
  k.sonSahne = sc.secenekler[idx].uygula(s, k, k.sahne.hedef);
  k.sahneSay++;
  if (k.sahneSay >= SCENES_PER_ROUND) {
    k.sahne = undefined;
    k.adim = 'plan';
  } else k.sahne = nextScene(s);
}

/** Dövüş önü özet: odak, ittifak ve husumet etkileri. */
export function keFightNotes(k: KafesEvi, o: Opponent): string[] {
  const n: string[] = [];
  if (k.odak) n.push(L("Odak {0}{1}: zihin ve kondisyon", [k.odak > 0 ? '+' : '', k.odak]));
  if (k.muttefik && k.muttefik !== o.id) n.push(L("🤝 Müttefikin {0}, rakibin zayıf yanını anlattı: {1}", [shortName(k, k.muttefik), STAT_LABELS[weakest(o)]]));
  if ((k.iliski[o.id] ?? 0) <= -2) n.push(L("😤 {0} sana kin bağladı: daha hırslı gelecek", [o.soyad]));
  if (k.muttefik === o.id) n.push(L("💔 Müttefikinle karşı karşıyasın. Dostluk kafes kapısında biter."));
  return n;
}

export function startKeFight(s: GameState, plan: PlanKey) {
  const k = s.kafesEvi;
  const o = k && keOpponent(k);
  if (!k || !o) return;
  const mods: Partial<Stats> = { iq: k.odak * 2, kondisyon: k.odak * 2 };
  const oppStats: Partial<Stats> = {};
  if (k.muttefik && k.muttefik !== o.id) oppStats.iq = -3;
  if ((k.iliski[o.id] ?? 0) <= -2) oppStats.kondisyon = 3;
  k.dovus = startFight({
    pStats: s.fighter.stats,
    pAd: s.fighter.lakap || s.fighter.soyad,
    koseAdi: L("Koçun"),
    opp: o,
    mods: { stats: mods, plan, planUyum: PLANS[plan].hedef.includes(weakest(o)), oppStats },
    maxRaunt: 3,
    unvanMaci: false,
    anaMac: k.tur === 2,
  });
  k.adim = 'dovus';
}

/** Diğer eşleşmeler güç ortalamasıyla simüle edilir. */
function simPair(k: KafesEvi, a: string, b: string): string {
  const ga = k.kisiler.find((x) => x.id === a)!.guc;
  const gb = k.kisiler.find((x) => x.id === b)!.guc;
  return chance(clamp(0.5 + (ga - gb) / 30, 0.15, 0.85)) ? a : b;
}

const ROUND_PAY = [3000, 4000, 6000];

/** Oyuncunun dövüşü bitti: turu ilerlet, sonuç notlarını yaz. */
export function finishKeFight(s: GameState) {
  const k = s.kafesEvi;
  const fs = k?.dovus;
  const r = fs?.sonuc;
  if (!k || !fs || !r) return;
  const won = r.kazanan === 'p' || (r.kazanan === 'berabere' && fs.pPuan >= fs.oPuan);
  const notes: string[] = [];
  const a = alive(k);
  const winners: string[] = [];
  for (let i = 0; i < a.length; i += 2) {
    if (a[i] === KE_PLAYER || a[i + 1] === KE_PLAYER) winners.push(won ? KE_PLAYER : a[i] === KE_PLAYER ? a[i + 1] : a[i]);
    else winners.push(simPair(k, a[i], a[i + 1]));
  }
  k.turlar[k.tur] = winners;
  const hasar = Math.round(fs.pHasar * 0.25);
  s.saglik = clamp(s.saglik - hasar, 5, 100);
  advanceWeeks(s, 2);
  const pay = ROUND_PAY[k.tur] + (won ? 2500 : 0);
  s.para += pay;
  const fin = r.yontem === 'KO' || r.yontem === 'TKO' || r.yontem === 'SUB';
  if (won && fin) ekran(k, 8);
  notes.push(won ? L("🏆 {0} turunu geçtin!", [KE_ROUNDS()[k.tur]]) : L("❌ {0} turunda elendin.", [KE_ROUNDS()[k.tur]]));
  notes.push(L("💵 Bölüm ücreti: ${0}", [pay.toLocaleString(LOC)]));
  if (hasar) notes.push(L("🩹 Sağlık -{0} → {1}/100", [hasar, s.saglik]));
  k.dovus = undefined;
  if (won && k.tur === 2) {
    k.sonuc = 'sampiyon';
  } else if (!won) {
    k.sonuc = (['ceyrek', 'yari', 'final'] as const)[k.tur];
  }
  if (k.sonuc) notes.push(...wrapUp(s, k));
  else {
    k.tur++;
    k.sahneSay = 0;
    k.sahne = nextScene(s);
    notes.push(L("📺 Ev arkadaşlarından {0} kişi kaldı.", [winners.length]));
  }
  k.sonNot = notes;
  k.sonSahne = undefined;
  k.adim = 'sonuc';
}

function wrapUp(s: GameState, k: KafesEvi): string[] {
  const lines: string[] = [];
  const champ = k.sonuc === 'sampiyon';
  const d = addFollowers(s, Math.max(2000, followers(s) * (0.15 + k.ekran / 150)) * (champ ? 2 : 1));
  const pop = Math.round(k.ekran / 10) + (champ ? 8 : k.sonuc === 'final' ? 4 : 0);
  s.populerlik = clamp(s.populerlik + pop, 0, 100);
  lines.push(L("📲 Şov bitti. Ekran süresi {0}/100: {1} takipçi, popülerlik +{2}.", [k.ekran, fmtDelta(d), pop]));
  if (champ) {
    s.para += 20000;
    lines.push(L("🏆 KAFES EVİ ŞAMPİYONU! Kupa ve $20.000 ödül. Büyük organizasyonlar telefonda."));
    s.haberler.unshift(L("🏆 {0}, Kafes Evi'nin yeni sezon şampiyonu oldu!", [s.fighter.soyad]));
  } else s.haberler.unshift(L("📺 Kafes Evi maceran sona erdi ({0}).", [KE_ROUNDS()[k.tur]]));
  return lines;
}

/** Sonuç ekranından çıkış: ya sonraki bölüm ya da şovun sonu (şampiyona kontrat teklifleri App'te açılır). */
export function continueKafesEvi(s: GameState): 'devam' | 'bitti' {
  const k = s.kafesEvi;
  if (!k) return 'bitti';
  if (k.sonuc) {
    k.durum = 'bitti';
    s.phase = 'hub';
    return 'bitti';
  }
  k.sonNot = undefined;
  k.adim = 'sahne';
  return 'devam';
}

export const keBracket = (k: KafesEvi) => k.kisiler.map((p) => ({ ...p, tur: k.turlar.reduce((n, t) => (t.includes(p.id) ? n + 1 : n), 0) }));
