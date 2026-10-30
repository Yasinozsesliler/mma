// RevenueCat yalnızca gözlemci: satın almayı expo-iap yapar, RevenueCat satışları ve iadeleri raporlar.
// Hiçbir çağrı satın alma akışını bekletmez ya da bozmaz (hata ve zaman aşımı sessizce yutulur).
import { Platform } from 'react-native';
import Purchases, { PURCHASES_ARE_COMPLETED_BY_TYPE, STOREKIT_VERSION } from 'react-native-purchases';

/** RevenueCat açık SDK anahtarları (gizli değildir). Android, Play bağlanınca eklenecek. */
const KEYS: Partial<Record<typeof Platform.OS, string>> = {
  ios: 'appl_jGusUgWPbDcFyxaummHBfvWFtgO',
};

let ready = false;

export function initRevenueCat() {
  const apiKey = KEYS[Platform.OS];
  if (ready || !apiKey) return;
  try {
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
  if (!ready || Platform.OS !== 'ios') return;
  await quick(Purchases.recordPurchase(sku));
}

/** "Satın alımları geri yükle"de geçmiş satın almaları RevenueCat'e eşitler. */
export async function rcSync() {
  if (!ready) return;
  await quick(Purchases.syncPurchasesForResult());
}
