// Yerel (iOS/Android) ses motoru: şimdilik sessiz. Mağaza sürümünde expo-audio ile bağlanacak;
// arayüz web motoruyla (engine.web.ts) birebir aynı kalmalı.
import type { Scene, Sfx, SoundSettings } from './types';

let settings: SoundSettings = { muzik: true, efekt: true };
const listeners = new Set<() => void>();

export function getSoundSettings(): SoundSettings {
  return settings;
}
export function setSoundSettings(next: Partial<SoundSettings>) {
  settings = { ...settings, ...next };
  listeners.forEach((l) => l());
}
export function subscribeSound(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
export function pushScene(_s: Scene) {
  return () => {};
}
export function sfx(_name: Sfx, _amount = 1) {}
