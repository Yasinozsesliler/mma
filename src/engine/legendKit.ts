// Efsane Yolları: bölüm tipleri ve bölüm dosyalarının ortak yardımcıları (legendRun.ts ve legend*.ts).
import { L, LOC } from '../i18n';
import { activeBelts } from './legacy';
import type { PressStyle } from './pressConf';
import { brandById } from './sponsors';
import { uid } from './rng';
import type { Appearance, Background, GameState, Method, OrgId, StatKey, WeightClass } from './types';
import type { NewFighterInput } from './character';

export type LegendId = 'kral' | 'dahi' | 'profesor' | 'yenilmez' | 'kralice' | 'orumcek' | 'imparator';

export interface LegendRun {
  id: LegendId;
  /** Süren bölümün sırası (bitince bölüm sayısına eşit) */
  bolum: number;
  /** Bölüm id → kazanılan yıldızlar (0: ana hedef, 1-2: tarihe sadık ek yıldızlar) */
  yildiz: Record<string, number[]>;
  /** Gösterilecek bölüm girişi (hub'da açılır) */
  giris?: number;
  /** Bölüme özel işaretler ve sayaçlar */
  bayrak?: Record<string, boolean>;
  sayac?: Record<string, number>;
  /** Senaryolu boks maçının sonucu */
  boks?: 'G' | 'M' | 'KO' | 'red';
  bitti?: boolean;
  /** Paketsiz deneme: yalnızca 1. bölüm oynanır */
  deneme?: boolean;
  /** Deneme bitti: hikâye paket alınana kadar duraklatıldı (kariyer normal sürer) */
  bekle?: boolean;
  /** "Ya öyle olsaydı?" bonus bölümü başladı / bitti (hikâye sonrası, Şampiyon Paketi) */
  bonus?: boolean;
  bonusBitti?: boolean;
}

/** Bir dövüşün özeti (bölüm yıldızları için). Dövüş dışı kontrollerde null. */
export interface LegendFight {
  won: boolean;
  yontem: Method;
  raunt: number;
  org: OrgId;
  unvan: boolean;
  /** Rakibin tam adı */
  rakip?: string;
}

export interface Star {
  ad: () => string;
  kontrol: (s: GameState, f: LegendFight | null, r: LegendRun) => boolean;
  /** Yalnızca ana hedef tamamlandığı anda kontrol edilir */
  sonda?: boolean;
}

/** Bölüme özel basın toplantısı sorusu: tarihî cevap tutturulup maç kazanılırsa ek gelir. */
export interface LegendPress {
  soru: string;
  cevaplar: Record<PressStyle, string>;
  tarihi: PressStyle;
}

/** Bölümün tarihî rakibi: sıklette sahneye çıkar (şampiyon ya da 1 numaralı aday olarak). */
export interface ChapterRival {
  ad: string;
  soyad: string;
  lakap: string;
  uyruk: () => string;
  stil: Background;
  siklet: WeightClass;
  sampiyon?: boolean;
  /** Rakip UCC dışındaki büyük organizasyonlarda çıkar (varsayılan UCC) */
  disari?: boolean;
}

export interface Chapter {
  id: string;
  yil: string;
  yer: () => string;
  baslik: () => string;
  giris: () => string[];
  hedef: () => string;
  ilerleme?: (s: GameState) => string | null;
  ipucu?: () => string;
  tamam: (s: GameState, r: LegendRun) => boolean;
  /** Hedef artık imkânsızsa bölüm yıldızsız geçilir (ör. UCC'ye bölgesel kemersiz girildi) */
  atla?: (s: GameState) => boolean;
  yildizlar: [Star, Star];
  /** Bölüm başlarken (senaryolu anlar) */
  basla?: (s: GameState, r: LegendRun) => string[];
  /** Bölüm başladıktan sonraki ilk güvenli anda (dövüş sonrası akış): kemer alma, ceza gibi ağır olaylar */
  sonra?: (s: GameState, r: LegendRun) => string[];
  /** Ana hedef tamamlanınca ödül */
  bitir?: (s: GameState, r: LegendRun) => string[];
  /** Bölüm sürerken her dövüşten sonra (sayaçlar) */
  say?: (s: GameState, f: LegendFight, r: LegendRun) => void;
  /** Bu bölümde Challenger Series daveti gelmez (önce kemer) */
  uccKapali?: boolean;
  /** Bu bölümde bir galibiyetten sonra UCC teklifi doğrudan gelir */
  uccKapi?: boolean;
  rakip?: ChapterRival;
  basin?: () => LegendPress;
  /** Hocanın notu: yıldızlar için ayrıntılı taktik (reklamla açılır) */
  not?: () => string;
}

export interface LegendDef {
  id: LegendId;
  ad: string;
  soyad: string;
  lakap: () => string;
  uyruk: string;
  memleket: () => string;
  bayrak: string;
  renk: string;
  ozet: () => string;
  /** Kart üstündeki kısa unvanlar */
  etiketler: () => string[];
  /** false: menüde "yakında" */
  oynanabilir: boolean;
  /** Ücretsiz mi (sonra paket ürününe bağlanacak) */
  ucretsiz: boolean;
  yas: number;
  siklet: WeightClass;
  gecmis: NewFighterInput['gecmis'];
  boy: number;
  gorunum: Appearance;
  statMod: Partial<Record<StatKey, number>>;
  para: number;
  populerlik: number;
  /** Hikâyedeki hoca ve salon (yoksa ülkenin varsayılanı) */
  hoca?: () => string;
  salon?: () => string;
  bolumler: Chapter[];
  odulKozmetik?: string;
  /** Hikâye bitince kapanış metni */
  final?: () => string;
}

export const $ = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;
export const ufcBelts = (s: GameState) => activeBelts(s).filter((b) => b.org === 'ufc');
export const ufcBeltIn = (s: GameState, w: WeightClass) => ufcBelts(s).some((b) => b.siklet === w);
export const finish = (m: Method) => m === 'KO' || m === 'TKO' || m === 'SUB';
export const ko = (m: Method) => m === 'KO' || m === 'TKO';
export const decision = (m: Method) => m === 'UD' || m === 'SD' || m === 'MD';
export const nonUccBelt = (s: GameState) => (s.kemerler ?? []).some((b) => b.org !== 'ufc' && b.org !== 'amator');
export const uccWin = (s: GameState) => s.gecmis.some((h) => h.org === 'ufc' && h.sonuc === 'G');
export const uccFights = (s: GameState) => s.gecmis.filter((h) => h.org === 'ufc').length;

/** Soyadı geçen rakiplere karşı galibiyet sayısı. */
export const beatCount = (s: GameState, soyad: string) => s.gecmis.filter((h) => h.sonuc === 'G' && h.rakip.includes(soyad)).length;

/** Son dövüş bir rövanş galibiyeti mi (daha önce aynı rakibe yenilmiştin)? */
export function revengeWin(s: GameState) {
  // Geçmiş en yeniden eskiye sıralı
  const [last, ...once] = s.gecmis;
  if (!last || last.sonuc !== 'G') return false;
  return once.some((h) => h.rakip === last.rakip && h.sonuc === 'M');
}

export const count = (r: LegendRun, k: string) => r.sayac?.[k] ?? 0;
export function bump(r: LegendRun, k: string, n = 1) {
  r.sayac = { ...r.sayac, [k]: (r.sayac?.[k] ?? 0) + n };
}

/** Senaryolu sponsor teklifi: gerçek markaların yerine oyundaki karşılıkları, normalden cömert şartlarla. */
export function legendSponsor(s: GameState, marka: string, carpan: number): string[] {
  const b = brandById(marka);
  if (!b || (s.sponsorlar ?? []).some((d) => d.marka === marka) || (s.sponsorTeklif ?? []).some((d) => d.marka === marka)) return [];
  const r = (n: number) => Math.round((n * carpan) / 50) * 50;
  s.sponsorTeklif = [{ id: uid(), marka, dovus: 5, dovusBasi: r(b.dovusBasi), galibiyet: r(b.galibiyet), bitiris: r(b.bitiris) }, ...(s.sponsorTeklif ?? [])].slice(0, 4);
  return [L("💼 {0} kapında: dev bir sponsorluk teklifi Takım ekranında seni bekliyor.", [b.ad])];
}

export function pay(s: GameState, n: number, neden: string): string {
  s.para += n;
  return L("💰 {0}: {1}", [neden, $(n)]);
}
