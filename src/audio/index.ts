// Ses: efektler, müzik ve ayarlar. Platforma göre motor seçilir (engine.web.ts / engine.ts).
import { useEffect, useSyncExternalStore } from 'react';
import { getSoundSettings, playWalkout, pushScene, setSoundSettings, sfx, subscribeSound, walkoutSeconds } from './engine';
import type { Scene, Sfx, SoundSettings, Walkout } from './types';

export { sfx, setSoundSettings, getSoundSettings, playWalkout, walkoutSeconds, pushScene };
export type { Scene, Sfx, SoundSettings, Walkout };

/** Bileşen ekrandayken ses ortamını belirler; en son açılan ekran geçerlidir. */
export function useSoundScene(scene: Scene) {
  useEffect(() => pushScene(scene), [scene]);
}

export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore(subscribeSound, getSoundSettings, getSoundSettings);
}
