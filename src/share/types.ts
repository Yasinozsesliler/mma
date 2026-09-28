import type { Appearance, OrgId, WeightClass } from '../engine/types';

/** Paylaşım kartının içeriği (dile çevrilmiş metinlerle). */
export type ShareCardData = {
  /** Dosya adı ve vurgu rengi için */
  tur: 'kemer' | 'bitiris' | 'galibiyet' | 'kariyer';
  /** En üstteki büyük başlık: "🏆 YENİ ŞAMPİYON" */
  baslik: string;
  ad: string;
  lakap: string;
  /** İsmin altındaki satır: "UCC · HAFİF SIKLET ŞAMPİYONU" */
  ust: string;
  /** Üç kutu: etiket + değer */
  kutular: [string, string][];
  /** Alttaki hikâye cümlesi */
  alt: string;
  look?: Appearance;
  kemer?: { org: OrgId; siklet: WeightClass };
  /** Paylaşım menüsünde gönderiye eklenecek metin */
  mesaj: string;
};

/** Önizleme hazır olunca paylaşım işlemleri (kaydetme yalnızca web'de). */
export type CardHandle = {
  share: (text: string) => Promise<'paylasildi' | 'indirildi' | 'iptal'>;
  save?: () => void;
};
