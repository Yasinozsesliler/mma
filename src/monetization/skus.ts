// Google Play uygulama içi ürün kimlikleri (hepsi tek seferlik, tüketilmeyen ürün). Play Console'da aynı kimliklerle oluşturulur.
// Platformdan bağımsızdır: kozmetik tanımları ve web sürümü de buradan okur.

/** Şampiyon Paketi: reklamsız oyun + ödüller reklamsız + 5 kariyer yuvası + Şampiyon çerçevesi. Önerilen 3,99 $; bütün ülkelerde aynı (mağazanın otomatik kur karşılığı) */
export const PREMIUM_SKU = 'sampiyon_paketi';
/** Yalnızca geçiş reklamlarını kaldırır (ödüllü reklamlar isteğe bağlı kalır). Artık tek başına satılmıyor (Şampiyon ve
 *  Tam Paket'e dahil); mağazada satıştan kaldırılabilir, eski alıcıların hakkı ve geri yükleme geçerli kalır. */
export const ADFREE_SKU = 'reklamsiz';
/** Kozmetik paketleri: yalnızca görünüm, oyun gücü yok. Önerilen: epik ≈ 0,99 $ – 1,49 $, efsanevi ≈ 2,49 $ */
export const COSMETIC_SKUS = ['paket_altin', 'paket_sokak', 'paket_sultan', 'paket_gece', 'paket_ejder', 'paket_buz'] as const;
export type CosmeticSku = (typeof COSMETIC_SKUS)[number];
/** Efsane Koleksiyonu: bütün kozmetik paketleri tek alımda. Önerilen ≈ 5,99 $ */
export const BUNDLE_SKU = 'paket_efsane';

/** Efsaneler Paketi: Conor dışındaki bütün Efsane Yolları hikâyeleri (ve sonra gelecek efsaneler). Önerilen ≈ 2,99 $ */
export const LEGENDS_SKU = 'efsaneler_paketi_v2';

/** TAM PAKET (eski adı Şampiyon + Koleksiyon): Şampiyon Paketi'nin her şeyi + bütün kozmetik paketleri + Antrenör ve
 *  Hakem Modu. Mağazanın ana ürünü. Önerilen 5,99 $ (bütün ülkelerde aynı): Şampiyon'dan yalnızca 2 $ fazla,
 *  parçaların toplamının (≈ 13,96 $) yarısından ucuz. Oyuncuların çoğu bunu seçsin diye. */
export const ULTIMATE_SKU = 'sampiyon_koleksiyon_v2';

/** Antrenör Modu: ayrı kariyer modu (hoca olarak oyna). Şampiyon Paketi'ne dahil değil. Önerilen ≈ 1,99 $ */
export const COACH_SKU = 'antrenor_modu';

/** Hakem Modu: ayrı mod (kafesin içindeki hakem olarak oyna). Şampiyon Paketi'ne dahil değil. Önerilen ≈ 1,99 $ */
export const REF_SKU = 'hakem_modu';

/** Tam Paket Fırsatı: Tam Paket'in aynısı, indirimli fiyatla ayrı ürün. Yalnızca süreli pencerelerde satılır
 *  (Hoş Geldin 72 saat, Kara Cuma, ilk UCC kemerinden sonra 24 saat). Önerilen 2,99 $ (bütün ülkelerde aynı):
 *  ilk alım için 1-5 $ aralığının ortası. */
export const DEAL_SKU = 'tam_paket_firsat';

export const ALL_SKUS: string[] = [PREMIUM_SKU, ADFREE_SKU, ...COSMETIC_SKUS, BUNDLE_SKU, LEGENDS_SKU, ULTIMATE_SKU, COACH_SKU, REF_SKU, DEAL_SKU];
