// Web: yerel bildirim yok (arayüz Android sürümüyle aynı).
import type { DailyStore } from '../engine/daily';

export const NOTIFY = false;
export function useNotifyState(): 'acik' | 'kapali' | 'sorulmadi' {
  return 'kapali';
}
export async function enableNotifications(): Promise<boolean> {
  return false;
}
export async function disableNotifications() {}
export async function rescheduleNotifications(_daily: DailyStore, _fighter?: string) {}
export function onNotificationOpen(_fn: (hedef: 'gunluk' | 'kariyer') => void) {
  return () => {};
}
