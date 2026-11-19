import type { Appearance, OrgId, WeightClass } from '../engine/types';

/** Paylaşım kartının içeriği (dile çevrilmiş metinlerle). */
export type ShareCardData = {
  /** Dosya adı ve vurgu rengi için */
  tur: 'kemer' | 'bitiris' | 'galibiyet' | 'kariyer' | 'wiki' | 'afis';
  /** En üstteki büyük başlık: "🏆 YENİ ŞAMPİYON" */
  baslik: string;
  ad: string;
  /** İsmin büyük harfli hali (uyruğa göre: Türkçe adlar İ ile, diğerleri standart) */
  adBuyuk?: string;
  lakap: string;
  /** İsmin altındaki satır: "UCC · HAFİF SIKLET ŞAMPİYONU" */
  ust: string;
  /** Üç kutu: etiket + değer */
  kutular: [string, string][];
  /** Alttaki hikâye cümlesi */
  alt: string;
  look?: Appearance;
  kemer?: { org: OrgId; siklet: WeightClass };
  /** Kart şablonu (Şampiyon Paketi şablonları; yoksa klasik) */
  tema?: import('./themes').CardThemeId;
  /** Kuşanılan sezon unvanı */
  unvan?: string;
  /** Yeni görünüm: kartın arkasındaki çizilmiş sahne (klasik görünümde yok) */
  sahne?: { kaynak: 'arena' | 'altin' | 'salon'; tier: 0 | 1 | 2 | 3; tint?: string };
  /** Paylaşım menüsünde gönderiye eklenecek metin */
  mesaj: string;
  /** Kafespedia kartı: giriş paragrafı ve bilgi kutusu satırları */
  wiki?: { ozet: string; bilgi: [string, string][] };
  /** Maç afişi: karşı köşe ve etkinlik bilgisi */
  afis?: {
    oAd: string;
    oSoyad: string;
    oLakap: string;
    oLook: Appearance;
    pSoyad: string;
    pRekor: string;
    oRekor: string;
    org: string;
    etiket: string;
    tarih: string;
    sehir: string;
    hype: string;
    altin: boolean;
  };
};

/** Önizleme hazır olunca paylaşım işlemleri (kaydetme yalnızca web'de). */
export type CardHandle = {
  share: (text: string) => Promise<'paylasildi' | 'indirildi' | 'iptal'>;
  save?: () => void;
};
