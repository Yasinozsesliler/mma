// Yerel bildirimler (Android): Günün Dövüşü hatırlatması, seri uyarısı ve "geri dön" dürtüsü.
// Sunucu gerekmez; her uygulama açılışında ve günlük dövüş bitince yeniden planlanır.
import * as Notifications from 'expo-notifications';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { dayNumber, liveStreak, type DailyStore } from '../engine/daily';
import { L } from '../i18n';
import { getPref, setPref } from '../prefs';

export const NOTIFY = true;
const KEY = 'yol_bildirim'; // '1' açık, '0' kapalı, yoksa henüz sorulmadı
const CHANNEL = 'yol';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

let state = getPref(KEY);
const subs = new Set<() => void>();
const set = (v: '1' | '0') => {
  state = v;
  setPref(KEY, v);
  subs.forEach((f) => f());
};

/** 'acik' | 'kapali' | 'sorulmadi' */
export function useNotifyState(): 'acik' | 'kapali' | 'sorulmadi' {
  const v = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => state,
    () => state,
  );
  return v === '1' ? 'acik' : v === '0' ? 'kapali' : 'sorulmadi';
}

/** Kullanıcı açmak isterse izin istenir (Android 13+). */
export async function enableNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'android')
      await Notifications.setNotificationChannelAsync(CHANNEL, { name: L("Hatırlatmalar"), importance: Notifications.AndroidImportance.DEFAULT });
    const cur = await Notifications.getPermissionsAsync();
    const ok = cur.granted || (await Notifications.requestPermissionsAsync()).granted;
    set(ok ? '1' : '0');
    return ok;
  } catch {
    set('0');
    return false;
  }
}

export async function disableNotifications() {
  set('0');
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}

const at = (dayOffset: number, h: number, m: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
};

async function schedule(date: Date, title: string, body: string, hedef: 'gunluk' | 'kariyer') {
  if (date.getTime() <= Date.now() + 60_000) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { hedef } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
  });
}

/**
 * Bildirimleri baştan planlar. Bugün oynanan günlük dövüş için hatırlatma kurulmaz; seri varsa akşam uyarısı eklenir.
 * fighter: aktif kariyerdeki dövüşçünün adı (3 gün sonra "kafes seni bekliyor" için).
 */
export async function rescheduleNotifications(daily: DailyStore, fighter?: string) {
  if (state !== '1') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const gun = dayNumber();
    const playedToday = !!daily.kayit[gun];
    const seri = liveStreak(daily, gun);
    for (let i = playedToday ? 1 : 0; i < 7; i++)
      await schedule(at(i, 19, 0), L("🔥 Günün Dövüşü #{0} hazır", [gun + i]), L("Herkes aynı dövüşü oynuyor. Sen kaç puan alacaksın?"), 'gunluk');
    if (seri >= 2) {
      // Seri bugün oynanmadıysa bu akşam, oynandıysa yarın akşam bozulur.
      await schedule(at(playedToday ? 1 : 0, 21, 30), L("🔥 {0} günlük serin bozulmak üzere!", [seri]), L("Günün Dövüşü'nü oyna, serini koru."), 'gunluk');
    }
    if (fighter)
      await schedule(at(3, 18, 0), L("Kafes seni bekliyor"), L("{0} bir sonraki dövüşü için hazır. Kampı başlat!", [fighter]), 'kariyer');
  } catch {}
}

/** Bildirime dokunulunca hangi ekran açılsın. */
export function onNotificationOpen(fn: (hedef: 'gunluk' | 'kariyer') => void) {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const h = r.notification.request.content.data?.hedef;
    if (h === 'gunluk' || h === 'kariyer') fn(h);
  });
  return () => sub.remove();
}
