import { L } from './i18n';
import { ensureAlbum } from './engine/cards';
import { ensureGoals } from './engine/goals';
import { ensureEvent } from './engine/weeklyEvent';
import { ensureSpecial } from './engine/specialEvent';
import { istat } from './engine/istat';
import { startingTechniques } from './engine/techniques';
import { playerPhysique } from './engine/tale';
import { initialFollowers } from './engine/fame';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { ensureDivision } from './engine/division';
import { gymsFor } from './engine/gyms';
import { ORGS, WEIGHT_CLASSES } from './engine/data';
import { checkAchievements } from './engine/legacy';
import type { OrgId, WeightClass } from './engine/types';
import type { GameState } from './engine/types';

// 3 kayıt yuvası. 1. yuva eski tek kaydın anahtarını kullanır: güncellemeden önceki kariyer kaybolmaz.
export type Slot = 1 | 2 | 3 | 4 | 5;
/** Tüm yuvalar yüklenir; ücretsiz sürümde ilk 3'ü, Şampiyon Paketi ile 5'i kullanılır. */
export const SLOTS: Slot[] = [1, 2, 3, 4, 5];
export const slotsFor = (premium: boolean): Slot[] => SLOTS.slice(0, premium ? 5 : 3);
const keyOf = (slot: Slot) => (slot === 1 ? 'yol_kariyer_v1' : `yol_kariyer_s${slot}`);
const ACTIVE_KEY = 'yol_aktif_yuva';

export async function getActiveSlot(): Promise<Slot> {
  try {
    const v = Number(await AsyncStorage.getItem(ACTIVE_KEY));
    return v >= 2 && v <= 5 ? (v as Slot) : 1;
  } catch {
    return 1;
  }
}

export async function setActiveSlot(slot: Slot) {
  try {
    await AsyncStorage.setItem(ACTIVE_KEY, String(slot));
  } catch {}
}

export async function loadAllSlots(): Promise<(GameState | null)[]> {
  return Promise.all(SLOTS.map((x) => loadGame(x)));
}

// Eski kayıtlardaki gerçek organizasyon/kişi adlarını kurgusal karşılıklarına çevirir (unvanlar, haberler, geçmiş).
const LEGACY: [RegExp, string][] = [
  [/Dana White's Contender Series/g, "Dean Wyatt's Challenger Series"],
  [/Dana White/g, 'Dean Wyatt'],
  [/(?<![\p{L}\p{N}])UFC(?![\p{L}\p{N}])/gu, 'UCC'],
  [/(?<![\p{L}\p{N}])PFL(?![\p{L}\p{N}])/gu, 'PFC'],
  [/ONE Championship/g, 'ZEN Championship'],
  [/(?<![\p{L}\p{N}])MVP MMA/gu, 'VIP MMA'],
  [/Oktagon MMA/g, 'Hexagon MMA'],
  [/Cage Fury/g, 'Cage Force'],
];
function renameLegacy(raw: string) {
  return LEGACY.reduce((t, [re, to]) => t.replace(re, to), raw);
}

const backupKey = (slot: Slot) => `${keyOf(slot)}_yedek`;

/** Kayıt okunamazsa (bozuk veri ya da taşıma hatası) son sağlam yedekten açılır; yuva asla "boş" görünmez. */
export async function loadGame(slot: Slot = 1): Promise<GameState | null> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(keyOf(slot));
  } catch {}
  const main = raw ? parseSave(raw) : null;
  if (main) return main;
  let yedek: string | null = null;
  try {
    yedek = await AsyncStorage.getItem(backupKey(slot));
  } catch {}
  const b = yedek ? parseSave(yedek) : null;
  if (b) {
    b.haberler.unshift('🛟 ' + L("Kayıt okunamadı; son sağlam yedekten geri yüklendi."));
    await saveGame(b, slot);
  }
  return b;
}

/** Ham kaydı çözer ve eski sürümlerden gelen alanları tamamlar; geçersizse null. */
export function parseSave(raw: string): GameState | null {
  try {
    const s = JSON.parse(renameLegacy(raw)) as GameState;
    if (s.v !== 1 || !s.fighter?.ad) return null;
    // Eski sürümlerden gelen kayıtları tamamla
    s.puan ??= 0;
    s.envanter ??= [];
    s.bolum ??= null;
    s.cagri ??= null;
    s.amator.ko ??= 0;
    s.amator.sub ??= 0;
    s.amator.karar ??= 0;
    s.sosyal ??= [];
    if (!s.takim.salonId) {
      const g = gymsFor(s.fighter.uyruk).find((x) => x.salon === s.takim.salon) ?? gymsFor(s.fighter.uyruk)[0];
      s.takim.salonId = g?.id;
      s.takim.uzmanlik ??= g?.uzmanlik;
    }
    s.fighter.gorunum ??= { ten: 2, sac: 'kisa', sacRenk: 0, goz: 0, sakal: 'kirli', yara: false, dovme: false };
    // Eski unvan listesinden kemer vitrini oluştur
    if (!s.kemerler) {
      s.kemerler = s.unvanlar.map((u) => {
        const org = (Object.keys(ORGS) as OrgId[]).find((o) => u.startsWith(ORGS[o].ad)) ?? 'cfc';
        const siklet = (Object.keys(WEIGHT_CLASSES) as WeightClass[]).find((w) => u.includes(` ${WEIGHT_CLASSES[w].ad} Sıklet`)) ?? s.fighter.siklet;
        return { org, siklet, hafta: s.hafta, yas: s.fighter.yas, savunma: 0, aktif: false };
      });
      const son = s.kemerler[s.kemerler.length - 1];
      if (son && s.sampiyon) {
        son.aktif = true;
        son.savunma = s.savunma;
      }
    }
    s.isletmeler ??= [];
    // Eski mağaza ürünleri işletme sistemine taşınır
    const devir: Record<string, string> = { kafe: 'kafe', salonum: 'akademi' };
    Object.entries(devir).forEach(([eski, yeni]) => {
      if (s.envanter.includes(eski) && !s.isletmeler!.some((x) => x.id === yeni)) s.isletmeler!.push({ id: yeni, seviye: 1 });
    });
    s.envanter = s.envanter.filter((x) => !(x in devir));
    // Eski mağaza fizyoterapist/diyetisyen ürünleri kadroya (Deneyimli) taşınır.
    s.kadro ??= [];
    const kadroDevir: Record<string, string> = { fizyo: 'fizyo', diyetisyen: 'diyetisyen' };
    Object.entries(kadroDevir).forEach(([eski, rol]) => {
      if (s.envanter.includes(eski) && !s.kadro!.some((x) => x.rol === rol)) s.kadro!.push({ rol, seviye: 2, ad: rol === 'fizyo' ? 'Selin Aydın' : 'Murat Kaya' });
    });
    s.envanter = s.envanter.filter((x) => !(x in kadroDevir));
    // Eski mağaza "Pitbull Yavrusu" gerçek bir evcil hayvana dönüşür.
    s.hayvanlar ??= [];
    if (s.envanter.includes('kopek')) {
      s.hayvanlar.push({ id: 'rocky', tur: 'pitbull', ad: 'Rocky', mutluluk: 80, saglik: 100, hasta: false });
      s.envanter = s.envanter.filter((x) => x !== 'kopek');
    }
    s.yatirimlar ??= [];
    s.teknik ??= startingTechniques(s.fighter.gecmis);
    if (!s.fighter.boy) {
      // Boy artık sabit: eski kayıtta o anki değer kalıcı olur.
      const p = playerPhysique(s.fighter);
      s.fighter.boy = p.boy;
      s.fighter.uzanma = p.uzanma;
    }
    s.takipci ??= initialFollowers(s.populerlik);
    if (!s.eslesmeler && s.adaylar) {
      s.eslesmeler = s.adaylar.list.filter((c) => c.seviye > 0 || c.id === s.iliski?.id);
      s.adaylar = undefined;
    }
    if (!s.istat) {
      const st = istat(s);
      st.enIyiSeri = Math.max(0, s.seri);
      if (s.stage !== 'amator') st.sikletler = [s.fighter.siklet];
      st.maxPara = s.para;
    }
    checkAchievements(s, true);
    ensureDivision(s);
    if (s.phase !== 'emeklilik') {
      ensureGoals(s);
      ensureEvent(s);
      ensureAlbum(s);
      ensureSpecial(s);
    }
    return s;
  } catch {
    return null;
  }
}

const lastBackup: Partial<Record<Slot, number>> = {};

// Yazma birleştirme: hızlı art arda dokunuşlarda diske yalnızca sonuncusu yazılır (250 ms). Uygulama arka plana
// geçerken ya da sayfa kapanırken bekleyen kayıt hemen yazılır.
let pending: { s: GameState; slot: Slot } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
export function flushSave(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  const p = pending;
  pending = null;
  return p ? writeGame(p.s, p.slot) : Promise.resolve();
}
AppState.addEventListener('change', (st) => {
  if (st !== 'active') void flushSave();
});
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('pagehide', () => void flushSave());

export async function saveGame(s: GameState, slot: Slot = 1) {
  // Önemli anlar (kariyer ekranı, maç sonu) hemen yazılır; ara adımlar birleştirilir.
  if (pending && pending.slot !== slot) await flushSave();
  pending = { s, slot };
  if (s.phase === 'hub' || s.phase === 'dovusSonrasi' || s.phase === 'emeklilik') return flushSave();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flushSave(), 250);
}

async function writeGame(s: GameState, slot: Slot) {
  try {
    const json = JSON.stringify(s);
    await AsyncStorage.setItem(keyOf(slot), json);
    // Sağlam an: kariyer ekranındayken (en fazla 15 sn'de bir) yedek de güncellenir.
    if ((s.phase === 'hub' || s.phase === 'emeklilik') && Date.now() - (lastBackup[slot] ?? 0) > 15_000) {
      lastBackup[slot] = Date.now();
      await AsyncStorage.setItem(backupKey(slot), json);
    }
  } catch {
    // Kayıt başarısız olsa da oyun devam eder; bir sonraki hamlede tekrar denenir.
  }
}

/** Son sağlam yedeği ana kayda geri yükler (hata ekranındaki "son sağlam kayda dön"). */
export async function restoreBackup(slot: Slot): Promise<GameState | null> {
  try {
    const yedek = await AsyncStorage.getItem(backupKey(slot));
    const b = yedek ? parseSave(yedek) : null;
    if (b) await AsyncStorage.setItem(keyOf(slot), yedek!);
    return b;
  } catch {
    return null;
  }
}

export async function deleteGame(slot: Slot = 1) {
  try {
    await AsyncStorage.removeItem(keyOf(slot));
    await AsyncStorage.removeItem(backupKey(slot));
  } catch {}
}
