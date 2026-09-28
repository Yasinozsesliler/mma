// Yerel (Android/iOS) ses motoru: web motorunun önceden kaydedilmiş sesleri (assets/sounds, scripts/render-sounds.mjs)
// expo-audio ile çalınır. Arayüz web motoruyla (engine.web.ts) birebir aynıdır.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AppState } from 'react-native';
import { getPref, setPref } from '../prefs';
import type { Scene, Sfx, SoundSettings } from './types';

// ---------- Ayarlar ----------

const KEY = 'yol_ses';
let settings: SoundSettings = { muzik: true, efekt: true };
try {
  const raw = getPref(KEY);
  if (raw) settings = { ...settings, ...JSON.parse(raw) };
} catch {}
const listeners = new Set<() => void>();

export function getSoundSettings(): SoundSettings {
  return settings;
}
export function setSoundSettings(next: Partial<SoundSettings>) {
  settings = { ...settings, ...next };
  setPref(KEY, JSON.stringify(settings));
  applyLoops();
  listeners.forEach((l) => l());
}
export function subscribeSound(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

// ---------- Ses dosyaları ----------

const FILES = {
  click: require('../../assets/sounds/click.wav'),
  punch1: require('../../assets/sounds/punch1.wav'),
  punch2: require('../../assets/sounds/punch2.wav'),
  punch3: require('../../assets/sounds/punch3.wav'),
  body: require('../../assets/sounds/body.wav'),
  heavy: require('../../assets/sounds/heavy.wav'),
  whoosh: require('../../assets/sounds/whoosh.wav'),
  slam: require('../../assets/sounds/slam.wav'),
  tap: require('../../assets/sounds/tap.wav'),
  bell: require('../../assets/sounds/bell.wav'),
  bell2: require('../../assets/sounds/bell2.wav'),
  chime: require('../../assets/sounds/chime.wav'),
  cash: require('../../assets/sounds/cash.wav'),
  win: require('../../assets/sounds/win.wav'),
  lose: require('../../assets/sounds/lose.wav'),
  fanfare: require('../../assets/sounds/fanfare.wav'),
  flash: require('../../assets/sounds/flash.wav'),
  ooh: require('../../assets/sounds/ooh.wav'),
  applause: require('../../assets/sounds/applause.wav'),
  roar: require('../../assets/sounds/roar.wav'),
  swell: require('../../assets/sounds/swell.wav'),
  lock: require('../../assets/sounds/lock.wav'),
  crowd: require('../../assets/sounds/crowd_loop.wav'),
  hub: require('../../assets/sounds/music_hub.wav'),
  menu: require('../../assets/sounds/music_menu.wav'),
} as const;
type FileKey = keyof typeof FILES;

// Aynı ses üst üste çalabilsin diye sık kullanılanlar için birkaç oynatıcı tutulur.
const POOL: Partial<Record<FileKey, number>> = { punch1: 2, punch2: 2, punch3: 2, body: 2, whoosh: 2, click: 2 };
const players = new Map<FileKey, { list: AudioPlayer[]; next: number }>();

function player(k: FileKey): AudioPlayer | null {
  try {
    let p = players.get(k);
    if (!p) {
      p = { list: Array.from({ length: POOL[k] ?? 1 }, () => createAudioPlayer(FILES[k])), next: 0 };
      players.set(k, p);
    }
    const pl = p.list[p.next];
    p.next = (p.next + 1) % p.list.length;
    return pl;
  } catch {
    return null;
  }
}

function play(k: FileKey, volume = 1) {
  if (!settings.efekt) return;
  const p = player(k);
  if (!p) return;
  p.volume = volume;
  void p.seekTo(0).then(() => p.play());
}

// Uygulama başlarken: diğer uygulamaların müziğiyle karışabilir, sessiz modda susar.
void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => undefined);

// ---------- Müzik ve seyirci döngüleri ----------

let scenes: Scene[] = [];
const MUSIC_VOL = 0.55;
const CROWD_VOL = 0.7;
let music: { key: FileKey; p: AudioPlayer } | null = null;
let crowd: AudioPlayer | null = null;
let active = AppState.currentState === 'active';
const fades = new Map<AudioPlayer, ReturnType<typeof setInterval>>();

function fade(p: AudioPlayer, to: number, ms: number, done?: () => void) {
  const old = fades.get(p);
  if (old) clearInterval(old);
  const from = p.volume;
  const steps = Math.max(1, Math.round(ms / 50));
  let i = 0;
  const t = setInterval(() => {
    i++;
    p.volume = from + ((to - from) * i) / steps;
    if (i >= steps) {
      clearInterval(t);
      fades.delete(p);
      done?.();
    }
  }, 50);
  fades.set(p, t);
}

function currentScene(): Scene {
  return scenes.length ? scenes[scenes.length - 1] : 'off';
}

function applyLoops() {
  const sc = currentScene();
  // Müzik
  const want: FileKey | null = settings.muzik && active ? (sc === 'menu' ? 'menu' : sc === 'hub' ? 'hub' : null) : null;
  if (music && music.key !== want) {
    const old = music.p;
    fade(old, 0, 600, () => old.pause());
    music = null;
  }
  if (want && !music) {
    try {
      const p = createAudioPlayer(FILES[want]);
      p.loop = true;
      p.volume = 0;
      p.play();
      fade(p, MUSIC_VOL, 900);
      music = { key: want, p };
    } catch {}
  }
  // Seyirci uğultusu (dövüş ve kutlama)
  const crowdOn = settings.efekt && active && (sc === 'fight' || sc === 'celebrate');
  if (crowdOn) {
    if (!crowd) {
      try {
        crowd = createAudioPlayer(FILES.crowd);
        crowd.loop = true;
        crowd.volume = 0;
      } catch {}
    }
    if (crowd) {
      if (!crowd.playing) crowd.play();
      fade(crowd, sc === 'fight' ? CROWD_VOL : CROWD_VOL * 0.8, 800);
    }
  } else if (crowd && crowd.playing) {
    const c = crowd;
    fade(c, 0, 600, () => c.pause());
  }
}

AppState.addEventListener('change', (st) => {
  active = st === 'active';
  if (!active) {
    music?.p.pause();
    crowd?.pause();
  } else if (music) {
    music.p.play();
  }
  applyLoops();
});

export function pushScene(s: Scene) {
  scenes.push(s);
  applyLoops();
  return () => {
    const i = scenes.lastIndexOf(s);
    if (i >= 0) scenes.splice(i, 1);
    applyLoops();
  };
}

// ---------- Efektler ----------

let punchN = 0;

export function sfx(name: Sfx, amount = 1) {
  if (!settings.efekt || !active) return;
  const inFight = currentScene() === 'fight';
  switch (name) {
    case 'punch':
      punchN = (punchN + 1) % 3;
      return play((['punch1', 'punch2', 'punch3'] as const)[punchN], 0.85 + Math.random() * 0.15);
    case 'heavy':
      play('heavy');
      if (inFight) play('swell', Math.min(1, 0.7 * amount));
      return;
    case 'slam':
      play('slam');
      if (inFight) play('swell', 0.4);
      return;
    case 'tap':
      play('tap');
      if (inFight) play('roar', 0.8);
      return;
    case 'lock':
      if (inFight) play('lock');
      return;
    case 'roar':
      return play('roar');
    case 'swell':
      if (inFight) play('swell', Math.min(1, amount));
      return;
    case 'applause':
      return play('applause', Math.min(1, 0.6 + 0.4 * amount));
    case 'ooh':
      return play('ooh', Math.min(1, amount));
    default:
      return play(name as FileKey);
  }
}
