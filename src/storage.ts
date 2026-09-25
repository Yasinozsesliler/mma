import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureDivision } from './engine/division';
import { gymsFor } from './engine/gyms';
import { ORGS, WEIGHT_CLASSES } from './engine/data';
import { checkAchievements } from './engine/legacy';
import type { OrgId, WeightClass } from './engine/types';
import type { GameState } from './engine/types';

const KEY = 'yol_kariyer_v1';

export async function loadGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    if (s.v !== 1) return null;
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
    checkAchievements(s);
    ensureDivision(s);
    return s;
  } catch {
    return null;
  }
}

export async function saveGame(s: GameState) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Kayıt başarısız olsa da oyun devam eder; bir sonraki hamlede tekrar denenir.
  }
}

export async function deleteGame() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
