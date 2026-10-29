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
export type LegendNote = { bolum: number; baslik: string };
export async function rescheduleNotifications(_daily: DailyStore, _fighter?: string, _efsane?: LegendNote | null) {}
export function onNotificationOpen(_fn: (hedef: 'gunluk' | 'kariyer' | 'hayali') => void) {
  return () => {};
}
