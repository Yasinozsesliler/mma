// Kamp anları: kamp kendiliğinden ilerlerken her kampta bir kez küçük bir karar gelir (sert spar, ekstra seans,
// erken diyet, röportaj isteği, misafir antrenör). Seçim kamp sonucuna küçük bir artı ya da eksi olarak yansır.
import { L, LOC } from '../i18n';
import { clamp, pick } from './rng';
import type { GameState } from './types';

export type CampMomentId = 'darbe' | 'ekstra' | 'diyet' | 'roportaj' | 'misafir';
export interface CampMoment {
  id: CampMomentId;
  metin: string;
  secenekler: string[];
  sonuc?: string;
  kapandi?: boolean;
}
/** Kamp sonucuna etkiler */
export interface CampEffect {
  gelisim?: number;
  risk?: number;
  diyet?: boolean;
}

const fee = (s: GameState) => ({ amator: 200, bolgesel: 1_500, buyuk: 7_000, ufc: 25_000 })[s.stage];

export function maybeCampMoment(s: GameState) {
  const k = s.pending.kamp;
  if (!k || k.kampAn || k.kankaAn) return;
  const id = pick<CampMomentId>(s.stage === 'amator' ? ['darbe', 'ekstra', 'diyet'] : ['darbe', 'ekstra', 'diyet', 'roportaj', 'misafir']);
  const hoca = s.takim.antrenor;
  const m: Record<CampMomentId, Omit<CampMoment, 'id'>> = {
    darbe: { metin: L("Sparda sert bir darbe aldın; kaburgaların sızlıyor. {0} kararı sana bırakıyor.", [hoca]), secenekler: [L("Birkaç gün dinlen"), L("Dişini sık, devam et")] },
    ekstra: { metin: L("{0} kampın gidişatından memnun ve gece seansları eklemek istiyor.", [hoca]), secenekler: [L("Ekstra seansı ekle"), L("Dinlenmeyi tercih et")] },
    diyet: { metin: L("Diyetisyen tartıyı erken düşünmeni öneriyor: şimdiden kalori kesersen son 48 saat kolaylaşır."), secenekler: [L("Diyete şimdi başla"), L("Önce kampa odaklan")] },
    roportaj: { metin: L("Büyük bir spor kanalı kamptan röportaj istiyor. Bir gün sürer."), secenekler: [L("Röportajı ver"), L("Kampı koru")] },
    misafir: { metin: L("Ünlü bir antrenör bir haftalığına kampına katılabilir. Ücreti ${0}.", [fee(s).toLocaleString(LOC)]), secenekler: [L("Davet et (${0})", [fee(s).toLocaleString(LOC)]), L("Gerek yok")] },
  };
  k.kampAn = { id, ...m[id] };
}

export function chooseCampMoment(s: GameState, i: number) {
  const k = s.pending.kamp;
  const a = k?.kampAn;
  if (!k || !a || a.sonuc) return;
  const e: CampEffect = { ...(k.anEtki ?? {}) };
  if (a.id === 'darbe') {
    if (i === 0) {
      e.gelisim = (e.gelisim ?? 0) - 0.08;
      a.sonuc = L("İki gün buz ve masaj. Biraz yavaşladın ama vücudun teşekkür ediyor.");
    } else {
      e.risk = (e.risk ?? 0) + 0.4;
      a.sonuc = L("Devam ettin. Hocan seni izliyor; bir şey olursa erken fark edecek.");
    }
  } else if (a.id === 'ekstra') {
    if (i === 0) {
      e.gelisim = (e.gelisim ?? 0) + 0.12;
      s.saglik = clamp(s.saglik - 6, 0, 100);
      a.sonuc = L("Gece seansları zorladı ama verimli geçti (sağlık -6).");
    } else {
      s.saglik = clamp(s.saglik + 4, 0, 100);
      a.sonuc = L("Dinlenmeyi seçtin; enerjin yerinde (sağlık +4).");
    }
  } else if (a.id === 'diyet') {
    if (i === 0) {
      e.diyet = true;
      s.motivasyon = clamp(s.motivasyon - 1, -2, 2);
      a.sonuc = L("Tabağın küçüldü, keyfin biraz kaçtı (motivasyon -1) ama tartı haftası daha rahat geçecek.");
    } else a.sonuc = L("Kilo işini son haftaya bıraktın.");
  } else if (a.id === 'roportaj') {
    if (i === 0) {
      s.populerlik = clamp(s.populerlik + 2, 0, 100);
      e.gelisim = (e.gelisim ?? 0) - 0.04;
      a.sonuc = L("Röportaj çok izlendi (popülerlik +2); bir antrenman günü kaçtı.");
    } else a.sonuc = L("Kapıyı kapattın, odak tamamen kampta.");
  } else if (i === 0) {
    s.para -= fee(s);
    e.gelisim = (e.gelisim ?? 0) + 0.15;
    a.sonuc = L("Misafir antrenör bir haftada kafanda yeni kapılar açtı. Kamp daha verimli.");
  } else a.sonuc = L("Kendi ekibinle devam ettin.");
  k.anEtki = e;
}

export function closeCampMoment(s: GameState) {
  const a = s.pending.kamp?.kampAn;
  if (a?.sonuc) a.kapandi = true;
}
export const campMomentOpen = (s: GameState) => {
  const a = s.pending.kamp?.kampAn;
  return !!a && !a.kapandi;
};
