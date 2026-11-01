// Google Play uygulama içi ürün kimlikleri (hepsi tek seferlik, tüketilmeyen ürün). Play Console'da aynı kimliklerle oluşturulur.
// Platformdan bağımsızdır: kozmetik tanımları ve web sürümü de buradan okur.

/** Şampiyon Paketi: reklamsız oyun + ödüller reklamsız + 5 kariyer yuvası + Şampiyon çerçevesi. Play fiyatı 3,99 $ */
export const PREMIUM_SKU = 'sampiyon_paketi';
/** Yalnızca geçiş reklamlarını kaldırır (ödüllü reklamlar isteğe bağlı kalır). Önerilen ≈ 1,49 $ */
export const ADFREE_SKU = 'reklamsiz';
/** Kozmetik paketleri: yalnızca görünüm, oyun gücü yok. Önerilen: epik ≈ 0,99 $ – 1,49 $, efsanevi ≈ 2,49 $ */
export const COSMETIC_SKUS = ['paket_altin', 'paket_sokak', 'paket_sultan', 'paket_gece', 'paket_ejder', 'paket_buz'] as const;
export type CosmeticSku = (typeof COSMETIC_SKUS)[number];
/** Efsane Koleksiyonu: bütün kozmetik paketleri tek alımda. Önerilen ≈ 5,99 $ */
export const BUNDLE_SKU = 'paket_efsane';

/** Efsaneler Paketi: Conor dışındaki bütün Efsane Yolları hikâyeleri (ve sonra gelecek efsaneler). Önerilen ≈ 2,99 $ */
export const LEGENDS_SKU = 'efsaneler_paketi';

/** Şampiyon + Koleksiyon: Şampiyon Paketi'nin her şeyi + bütün kozmetik paketleri (Efsane Koleksiyonu). Önerilen ≈ 7,99 $ */
export const ULTIMATE_SKU = 'sampiyon_koleksiyon';

/** Antrenör Modu: ayrı kariyer modu (hoca olarak oyna). Şampiyon Paketi'ne dahil değil. Önerilen ≈ 1,99 $ */
export const COACH_SKU = 'antrenor_modu';

/** Hakem Modu: ayrı mod (kafesin içindeki hakem olarak oyna). Şampiyon Paketi'ne dahil değil. Önerilen ≈ 1,99 $ */
export const REF_SKU = 'hakem_modu';

export const ALL_SKUS: string[] = [PREMIUM_SKU, ADFREE_SKU, ...COSMETIC_SKUS, BUNDLE_SKU, LEGENDS_SKU, ULTIMATE_SKU, COACH_SKU, REF_SKU];
