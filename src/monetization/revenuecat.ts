// RevenueCat: satın almayı expo-iap yapar, RevenueCat satışları ve iadeleri raporlar.
// iOS'ta yalnızca gözlemci. Android'de ayrıca yedek satın alma yolu: expo-iap Play'e ulaşamazsa (query_product vb.)
// aynı satın alma RevenueCat'in kendi Play bağlantısıyla yapılır. Android ürünleri RevenueCat'te tüketilmez (non_consumable)
// olarak tanımlı; tanım değişirse RevenueCat satın alınan ürünü tüketir, oyuncu hakkını kaybeder.
// Gözlemci çağrıları satın alma akışını bekletmez ya da bozmaz (hata ve zaman aşımı sessizce yutulur).
import { Platform } from 'react-native';
import Purchases, { PRODUCT_CATEGORY, PURCHASES_ARE_COMPLETED_BY_TYPE, STOREKIT_VERSION } from 'react-native-purchases';

/** RevenueCat açık SDK anahtarları (gizli değildir). */
const KEYS: Partial<Record<typeof Platform.OS, string>> = {
  ios: 'appl_jGusUgWPbDcFyxaummHBfvWFtgO',
  android: 'goog_TobFiprBGsVTHmLZSIVBWFOTRgc',
};

let ready = false;

export function initRevenueCat() {
  const apiKey = KEYS[Platform.OS];
  if (ready || !apiKey) return;
  try {
    // Android'de RevenueCat kendi satın almasını tamamlayabilsin (yedek yol); iOS'ta yalnızca gözlemci.
    if (Platform.OS === 'android') Purchases.configure({ apiKey });
    else
      Purchases.configure({
        apiKey,
        purchasesAreCompletedBy: { type: PURCHASES_ARE_COMPLETED_BY_TYPE.MY_APP, storeKitVersion: STOREKIT_VERSION.STOREKIT_2 },
      });
    ready = true;
  } catch {}
}

const quick = <T>(p: Promise<T>) => Promise.race([p, new Promise<void>((r) => setTimeout(r, 4_000))]).catch(() => undefined);

/** Yeni satın almayı bildirir; işlem kapatılmadan (finishTransaction) önce çağrılmalı. */
export async function rcRecordPurchase(sku: string) {
  if (!ready) return;
  // iOS'ta tek işlem bildirilir; Android'de gözlemci modunda Play satın almaları eşitlenir
  if (Platform.OS === 'ios') await quick(Purchases.recordPurchase(sku));
  else await quick(Purchases.syncPurchasesForResult());
}

/** "Satın alımları geri yükle"de geçmiş satın almaları RevenueCat'e eşitler. */
export async function rcSync() {
  if (!ready) return;
  await quick(Purchases.syncPurchasesForResult());
}

/** Android yedek satın alma: ürünü RevenueCat'in Play bağlantısıyla çekip satın alır. */
export async function rcBuyAndroid(sku: string): Promise<'ok' | 'iptal' | 'hata'> {
  if (!ready || Platform.OS !== 'android') return 'hata';
  try {
    const [p] = await Purchases.getProducts([sku], PRODUCT_CATEGORY.NON_SUBSCRIPTION);
    if (!p) return 'hata';
    const r = await Purchases.purchaseStoreProduct(p);
    return r.productIdentifier === sku || r.customerInfo.allPurchasedProductIdentifiers.includes(sku) ? 'ok' : 'hata';
  } catch (e) {
    return (e as { userCancelled?: boolean | null } | null)?.userCancelled ? 'iptal' : 'hata';
  }
}

/** RevenueCat'in bildiği satın alınmış ürünler (Android geri yükleme yedeği; zaman aşımında boş). */
export async function rcOwnedAndroid(): Promise<string[]> {
  if (!ready || Platform.OS !== 'android') return [];
  const info = await quick(Purchases.getCustomerInfo());
  return info ? info.allPurchasedProductIdentifiers : [];
}
