// Ses: efektler, müzik ve ayarlar. Platforma göre motor seçilir (engine.web.ts / engine.ts).
import { useEffect, useSyncExternalStore } from 'react';
import { getSoundSettings, pushScene, setSoundSettings, sfx, subscribeSound } from './engine';
import type { Scene, Sfx, SoundSettings } from './types';

export { sfx, setSoundSettings, getSoundSettings };
export type { Scene, Sfx, SoundSettings };

/** Bileşen ekrandayken ses ortamını belirler; en son açılan ekran geçerlidir. */
export function useSoundScene(scene: Scene) {
  useEffect(() => pushScene(scene), [scene]);
}

export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore(subscribeSound, getSoundSettings, getSoundSettings);
}
