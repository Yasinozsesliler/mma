// YOL Evreni: modlar arası bağ. Kariyer ve Menajer Modu dövüşçüleri birbirinin dünyasında rakip olarak çıkar.
// Motor kayıtları doğrudan okumaz: uygulama bu kaydı doldurur (setEvren). Boşken hiçbir şey değişmez (simülasyonlar etkilenmez).
import { chance, pick } from './rng';
import type { Appearance, Background, WeightClass } from './types';

export type EvrenKaynak = 'kariyer' | 'menajer';

export interface EvrenDovuscu {
  /** Kaynak içinde kalıcı kimlik (kariyer: yuva + ad, menajer: dövüşçü id) */
  id: string;
  kaynak: EvrenKaynak;
  ad: string;
  soyad: string;
  lakap?: string;
  /** Görünen ülke adı */
  uyruk: string;
  kadin: boolean;
  siklet: WeightClass;
  stil: Background;
  guc: number;
  rekor: string;
  kemer: number;
  /** Emekli ya da kariyeri bitmiş (rakip olarak çıkmaz, Evren ekranında görünür) */
  emekli?: boolean;
  look?: Appearance;
  /** Ek bilgi: kariyer yuvası ya da ajans adı */
  nerede?: string;
}

/** Modlar arası karşılaşma kaydı (Evren ekranındaki "Çapraz maçlar") */
export interface EvrenOlay {
  t: number;
  metin: string;
  kazandi: boolean;
}

let EVREN: EvrenDovuscu[] = [];
let onOlay: ((o: EvrenOlay) => void) | null = null;

export const setEvren = (list: EvrenDovuscu[]) => {
  EVREN = list;
};
export const evrenList = () => EVREN;
export const setEvrenListener = (f: ((o: EvrenOlay) => void) | null) => {
  onOlay = f;
};
export const noteEvren = (metin: string, kazandi: boolean) => onOlay?.({ t: Date.now(), metin, kazandi });

/**
 * Uygun bir evren dövüşçüsü seç (yoksa null). Zar yalnızca aday varsa atılır;
 * böylece evren boşken oyunun rastgele akışı hiç değişmez.
 */
export function evrenPick(kaynak: EvrenKaynak, siklet: WeightClass, kadin: boolean, p: number, used?: Set<string>): EvrenDovuscu | null {
  const c = EVREN.filter((x) => x.kaynak === kaynak && !x.emekli && x.siklet === siklet && x.kadin === kadin && !used?.has(`${x.ad} ${x.soyad}`));
  if (!c.length || !chance(p)) return null;
  return pick(c);
}
