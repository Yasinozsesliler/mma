// Fotoğraf paylaşımı (sosyal medyanın Instagram tarafı): antrenman, zafer, kemer, afiş, lüks, aile, evcil hayvan…
// Her fotoğrafın çekiciliği kariyer anına göre değişir; takipçi bu çekiciliğe göre artar. Haftada bir fotoğraf
// (afiş hariç), aynı türü üst üste paylaşmak ilgiyi düşürür, profesyonel çekim parayla etkiyi büyütür.
import { L } from '../i18n';
import { fullName } from './character';
import { fmtDelta, fmtFollowers, followers, photoFollowers } from './fame';
import { addHype } from './hype';
import { petType } from './pets';
import { itemById, owns } from './shop';
import { addPost, playerHandle } from './social';
import { brandById } from './sponsors';
import { lookFor } from './tale';
import { chance, pick, rand, uid } from './rng';
import type { Appearance, GameState, OrgId, Stage, WeightClass } from './types';

export type PhotoKind = 'antrenman' | 'zafer' | 'kemer' | 'afis' | 'luks' | 'aile' | 'evcil' | 'taraftar' | 'sponsor';

export interface PhotoExtra {
  rakip?: string;
  rakipLook?: Appearance;
  org?: OrgId;
  siklet?: WeightClass;
  yontem?: string;
  araba?: { model: string; renk?: string };
  ev?: string;
  tasit?: string;
  emoji?: string;
  ad?: string;
  marka?: string;
}

export interface PhotoPost {
  id: string;
  tur: PhotoKind;
  hafta: number;
  aciklama: string;
  begeni: number;
  yorumSay: number;
  yorumlar: { yazar: string; metin: string }[];
  filtre: number;
  pro?: boolean;
  viral?: boolean;
  delta: number;
  look?: Appearance;
  ek?: PhotoExtra;
}

export interface PhotoState {
  liste: PhotoPost[];
  say: number;
  sonHafta?: number;
  /** Zafer fotoğrafı paylaşılan maç (geçmiş uzunluğu): her galibiyete bir kez */
  zaferMac?: number;
}

export const PHOTO_KINDS: { id: PhotoKind; ad: string; ikon: string }[] = [
  { id: 'antrenman', ad: L("Antrenman"), ikon: 'dumbbell' },
  { id: 'zafer', ad: L("Zafer pozu"), ikon: 'trophy' },
  { id: 'kemer', ad: L("Kemerle"), ikon: 'crown' },
  { id: 'afis', ad: L("Maç afişi"), ikon: 'image-frame' },
  { id: 'luks', ad: L("Lüks yaşam"), ikon: 'car-sports' },
  { id: 'aile', ad: L("Sevdiklerim"), ikon: 'heart' },
  { id: 'evcil', ad: L("Evcil dostum"), ikon: 'paw' },
  { id: 'taraftar', ad: L("Taraftarlarla"), ikon: 'account-group' },
  { id: 'sponsor', ad: L("Sponsor ürünü"), ikon: 'briefcase' },
];

export const PHOTO_FILTERS: { ad: string; renk: string | null; op: number }[] = [
  { ad: L("Doğal"), renk: null, op: 0 },
  { ad: L("Sıcak"), renk: '#ff8a3d', op: 0.18 },
  { ad: L("Soğuk"), renk: '#3aa8ff', op: 0.18 },
  { ad: L("Noir"), renk: '#808080', op: 0.42 },
  { ad: L("Altın"), renk: '#f2c14e', op: 0.22 },
];

const MAX_PHOTOS = 30;
const PRO_COST: Record<Stage, number> = { amator: 150, bolgesel: 400, buyuk: 1200, ufc: 3500 };
const SPONSOR_PAY: Record<Stage, number> = { amator: 150, bolgesel: 400, buyuk: 1500, ufc: 5000 };

export const photoState = (s: GameState): PhotoState => (s.foto ??= { liste: [], say: 0 });

/** Bu hafta fotoğraf hakkı kullanıldı mı (afiş sayılmaz)? */
export const photoUsedThisWeek = (s: GameState) => s.foto?.sonHafta === s.hafta;

/** Profesyonel çekimin bedeli: "Profesyonel Fotoğraf Çekimi" eşyası varsa bedava. */
export const proCost = (s: GameState) => (owns(s, 'fotograf') ? 0 : PRO_COST[s.stage]);

const recentLoss = (s: GameState) => s.gecmis[0]?.sonuc === 'M' && s.sonMacHafta != null && s.hafta - s.sonMacHafta <= 4;

function bestOwned(s: GameState, grup: string) {
  return (s.envanter ?? [])
    .map(itemById)
    .filter((i) => i?.grup === grup)
    .sort((a, b) => (b!.seviye ?? 0) - (a!.seviye ?? 0))[0];
}

/** Paylaşılabilirlik: kilitliyse neden kilitli olduğu yazılır. */
export function photoLock(s: GameState, k: PhotoKind): string | null {
  const last = s.gecmis[0];
  switch (k) {
    case 'zafer':
      if (!last || last.sonuc !== 'G') return L("Son maçını kazanınca açılır.");
      return s.foto?.zaferMac === s.gecmis.length ? L("Bu galibiyetin fotoğrafını zaten paylaştın.") : null;
    case 'kemer':
      return (s.kemerler ?? []).some((b) => b.aktif) ? null : L("Bir kemer kazanınca açılır.");
    case 'afis':
      if (!s.pending.rakip || !s.pending.kamp) return L("Maç kampındayken açılır.");
      return s.pending.kamp.afis ? L("Bu maçın afişini zaten paylaştın.") : null;
    case 'luks':
      return bestOwned(s, 'araba') || bestOwned(s, 'ev') || owns(s, 'yat') || owns(s, 'jet') || owns(s, 'motor') ? null : L("Araba, ev ya da başka bir lüks alınca açılır.");
    case 'evcil':
      return (s.hayvanlar ?? []).length ? null : L("Bir evcil hayvan sahiplenince açılır.");
    case 'sponsor':
      return (s.sponsorlar ?? []).length ? null : L("Bir sponsorla anlaşınca açılır.");
    default:
      return null;
  }
}

/** Fotoğrafın ham çekiciliği (1 = sıradan). Negatifse tepki çeker. */
function baseAppeal(s: GameState, k: PhotoKind): number {
  const finish = /KO|SUB|Nakavt|Submission/i.test(s.gecmis[0]?.yontem ?? '');
  switch (k) {
    case 'antrenman':
      return s.pending.kamp ? 1.15 : 0.95;
    case 'zafer':
      return 1.6 + (finish ? 0.4 : 0);
    case 'kemer':
      return 1.5;
    case 'afis':
      return 1.3 + (s.pending.kamp?.hype != null ? 0.4 : 0);
    case 'luks':
      return recentLoss(s) ? -1 : 1.3;
    case 'aile':
      return s.iliski ? 1.3 : 1.1;
    case 'evcil':
      return 1.5;
    case 'taraftar':
      return 1.05;
    case 'sponsor':
      return 0.7;
  }
}

/** Ekrana yazılan tahmin ve uyarılar (sürpriz olmasın). */
export function photoPreview(s: GameState, k: PhotoKind, pro: boolean, caption: string) {
  const a = baseAppeal(s, k);
  const notes: string[] = [];
  if (a < 0) notes.push(L("Son maçını yeni kaybettin: şimdi lüks paylaşmak tepki çeker."));
  const tekrar = repeats(s, k);
  if (tekrar) notes.push(L("Bu türü yakın zamanda paylaştın, ilgi yarıya düşer."));
  if (k === 'sponsor') notes.push(L("Sponsor bu paylaşım için ${0} öder.", [SPONSOR_PAY[s.stage].toLocaleString()]));
  if (k === 'afis' && s.pending.kamp?.hype != null) notes.push(L("Büyük maç: hype +4"));
  const m = a < 0 ? a : a * (tekrar ? 0.5 : 1) * (pro ? 1.4 : 1) * (caption.trim() ? 1.1 : 1);
  const seviye = m < 0 ? L("Tepki") : m >= 1.6 ? L("Çok yüksek") : m >= 1.2 ? L("Yüksek") : m >= 0.8 ? L("Orta") : L("Düşük");
  return { seviye, risk: m < 0, notes };
}

const repeats = (s: GameState, k: PhotoKind) => k !== 'afis' && (s.foto?.liste ?? []).slice(0, 3).some((p) => p.tur === k);

const COMMENTS: Record<PhotoKind, string[]> = {
  antrenman: [L("Bu tempo korkutucu 🔥"), L("Kampın en iyi hâli bu"), L("Rakip bunu görünce uyuyamaz 😅"), L("Disiplin 💯"), L("Hangi saatte çalışıyorsun, ben de geleyim!")],
  zafer: [L("Şampiyon gibi dövüştün 👑"), L("Bu gece senindi!"), L("Tekrar tekrar izledim o anı 🔁"), L("Gurur duyuyoruz ❤️"), L("Sıradaki kim? 👀")],
  kemer: [L("O kemer sana çok yakışıyor 🏆"), L("Kral kim? Belli 👑"), L("Kimse elinden alamaz"), L("Tarih yazıyorsun"), L("Kemeri memlekete getir!")],
  afis: [L("Biletleri aldım bile 🎟️"), L("Bu maçı kaçırmam"), L("Afiş efsane olmuş 🔥"), L("Sen kazanırsın, eminim"), L("Kim kazanır sizce? 👇")],
  luks: [L("Emeğin karşılığı 👏"), L("Bir tur da bize 😄"), L("Çocukken hayalini kuruyordun, helal"), L("Gösteriş değil, ilham bu"), L("Biraz da salona dön ama 😅")],
  aile: [L("Ne güzel bir kare ❤️"), L("Arkandaki güç belli"), L("Mutluluklar dileriz"), L("Bu fotoğraf bambaşka 🥹"), L("En güzel kemer bu")],
  evcil: [L("O kim öyle 😍"), L("Kampın gerçek şampiyonu"), L("Benim de böyle bir dostum olsun istiyorum"), L("Asıl yıldız bu 🐾"), L("Daha fazla fotoğrafını isteriz!")],
  taraftar: [L("Ben de oradaydım! 🙌"), L("Çok samimisin, bu yüzden seviyoruz"), L("Bir gün benimle de fotoğraf çektir 🙏"), L("Taraftarını unutmayan dövüşçü ❤️"), L("Gelecek maçta tribündeyiz")],
  sponsor: [L("Reklam ama tamam 😄"), L("Bu üründen ben de aldım"), L("Para kazanmak da sporun parçası"), L("İndirim kodu var mı?"), L("Sponsorlar sırada bekliyor 👀")],
};
const FAN_NAMES = [L("Kafes Aşığı"), L("MMA Ultras"), L("Tribün Kaplanı"), L("Nakavt Avcısı"), L("Yer Oyunu Sever"), L("Sabah Koşucusu"), L("Kemer Peşinde")];
const RIVAL_LINES = [L("Kafeste görüşürüz 👊"), L("Afişte güzel çıkmışsın, maç gecesi çıkamayacaksın 😏"), L("Hazırım."), L("Saygılar, ama bu gece benim.")];

/** Fotoğrafın sahne bilgisi (önizlemede evcil hayvan sabit, paylaşımda rastgele). */
export function photoExtra(s: GameState, k: PhotoKind, preview = false): PhotoExtra | undefined {
  const last = s.gecmis[0];
  switch (k) {
    case 'zafer':
      return { rakip: last?.rakip, yontem: last?.yontem };
    case 'kemer': {
      const b = (s.kemerler ?? []).find((x) => x.aktif)!;
      return { org: b.org, siklet: b.siklet };
    }
    case 'afis': {
      const o = s.pending.rakip!;
      return { rakip: `${o.ad} ${o.soyad}`, rakipLook: lookFor({ id: o.id, uyruk: o.uyruk, kadin: s.fighter.kadin }) };
    }
    case 'luks': {
      const car = bestOwned(s, 'araba');
      if (car?.art) return { araba: { model: car.art.model, renk: car.art.color } };
      const ev = bestOwned(s, 'ev');
      if (ev?.art) return { ev: ev.art.model };
      return { tasit: owns(s, 'jet') ? 'airplane' : owns(s, 'yat') ? 'ferry' : 'motorbike' };
    }
    case 'aile':
      return s.iliski ? { emoji: s.iliski.emoji, ad: s.iliski.ad } : { emoji: '👨‍👩‍👦', ad: L("Ailem") };
    case 'evcil': {
      const p = preview ? (s.hayvanlar ?? [])[0] : pick(s.hayvanlar ?? []);
      if (!p) return undefined;
      return { emoji: petType(p.tur)?.emoji ?? '🐾', ad: p.ad };
    }
    case 'sponsor': {
      const d = (s.sponsorlar ?? [])[0];
      return { marka: (d && brandById(d.marka)?.ad) || L("Sponsor") };
    }
    default:
      return undefined;
  }
}

/** Fotoğrafı paylaş: takipçi, beğeni, yorumlar; gerekirse para (pro çekim) ve hype. */
export function sharePhoto(s: GameState, k: PhotoKind, opts: { caption?: string; filtre?: number; pro?: boolean } = {}): string {
  const lock = photoLock(s, k);
  if (lock) return lock;
  const st = photoState(s);
  if (k !== 'afis' && photoUsedThisWeek(s)) return L("Bu hafta zaten bir fotoğraf paylaştın. Takipçilerin gelecek haftayı bekliyor.");
  const cost = opts.pro ? proCost(s) : 0;
  if (cost > s.para) return L("Profesyonel çekim için paran yetmiyor.");
  s.para -= cost;

  const caption = (opts.caption ?? '').trim().slice(0, 200);
  const base = baseAppeal(s, k);
  const tekrar = repeats(s, k);
  let mult = base < 0 ? base : base * (tekrar ? 0.5 : 1) * (opts.pro ? 1.4 : 1) * (caption ? 1.1 : 1);
  const viral = mult > 0 && chance(0.03 + mult * 0.02);
  if (viral) mult *= 2.5;

  const delta = photoFollowers(s, mult);
  if (mult >= 1.5) s.populerlik = Math.min(100, s.populerlik + 1);
  if (mult < 0) s.populerlik = Math.max(0, s.populerlik - 1);
  const F = followers(s);
  const begeni = Math.round((15 + F * 0.03) * Math.max(0.15, Math.abs(mult)) * (0.6 + rand() * 0.8));
  const yorumSay = Math.max(1, Math.round(begeni * (mult < 0 ? 0.04 : 0.015)));

  const yorumlar: { yazar: string; metin: string }[] = [];
  const ek = photoExtra(s, k);
  if (k === 'afis' && ek?.rakip) yorumlar.push({ yazar: ek.rakip, metin: pick(RIVAL_LINES) });
  const pool = mult < 0 ? [L("Maçı kaybettin, şimdi bu mu? 🙄"), L("Önce salona dön"), L("Zamanlama çok kötü"), L("Taraftar bunu hak etmedi")] : COMMENTS[k];
  const names = [...FAN_NAMES].sort(() => rand() - 0.5);
  [...pool].sort(() => rand() - 0.5).slice(0, 2).forEach((m, i) => yorumlar.push({ yazar: names[i], metin: m }));

  const post: PhotoPost = { id: uid(), tur: k, hafta: s.hafta, aciklama: caption, begeni, yorumSay, yorumlar, filtre: opts.filtre ?? 0, pro: !!opts.pro, viral, delta, look: s.fighter.gorunum, ek };
  st.liste = [post, ...st.liste].slice(0, MAX_PHOTOS);
  st.say++;
  if (k !== 'afis') st.sonHafta = s.hafta;
  if (k === 'zafer') st.zaferMac = s.gecmis.length;
  addPost(s, { yazar: fullName(s.fighter), kullanici: playerHandle(s), tur: 'oyuncu', metin: caption, begeni, foto: post, yanitlar: yorumlar, renk: '#e63946' });

  const extra: string[] = [];
  if (k === 'afis') {
    s.pending.kamp!.afis = true;
    addHype(s, 4, L("Maç afişi"));
  }
  if (k === 'sponsor') {
    s.para += SPONSOR_PAY[s.stage];
    extra.push(L("Sponsor ödemesi: ${0}", [SPONSOR_PAY[s.stage].toLocaleString()]));
  }
  if (cost) extra.push(L("Çekim: -${0}", [cost.toLocaleString()]));
  const head = mult < 0 ? L("📸 Paylaşım tepki çekti.") : viral ? L("🚀 Keşfet'e düştün! Fotoğrafın patladı.") : L("📸 Fotoğrafın paylaşıldı.");
  return [head, L("{0} takipçi · {1} beğeni", [fmtDelta(delta), fmtFollowers(begeni)]), ...extra].join(' ');
}

