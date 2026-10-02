// Özel gün etkinlikleri: gerçek takvimde sınırlı süreli temalar (yılbaşı, sevgililer günü, yaz, cadılar bayramı,
// bayramlar). Üç görev; ilk ikisi para, üçüncüsü yalnızca o etkinlikte kazanılabilen kozmetik verir.
import { L, LOC } from '../i18n';
import { count, type Counter } from './weeklyEvent';
import type { GameState } from './types';

export type SpecialId = 'yilbasi' | 'sevgililer' | 'yaz' | 'cadilar' | 'ramazan' | 'kurban';

type Task = { c: Counter; n: number };
type Window = [number, number, number, number]; // ay, gün → ay, gün (yıl dönümü sarabilir)

export const SPECIALS: Record<SpecialId, { ad: () => string; alt: () => string; emoji: string; renk: [string, string]; kozmetik: string; gorevler: Task[]; pencere?: Window; tarihler?: [string, string][] }> = {
  yilbasi: { ad: () => L("YILBAŞI KUPASI"), alt: () => L("Yeni yıla kemerle gir."), emoji: '🎄', renk: ['#0d3b2e', '#08130f'], kozmetik: 'sort_kar', gorevler: [{ c: 'win', n: 1 }, { c: 'gonderi', n: 3 }, { c: 'ko', n: 1 }], pencere: [12, 20, 1, 6] },
  sevgililer: { ad: () => L("SEVGİLİLER GÜNÜ"), alt: () => L("Taraftarlarına aşkını göster."), emoji: '💘', renk: ['#4a0d26', '#14060c'], kozmetik: 'eld_kalp', gorevler: [{ c: 'gonderi', n: 2 }, { c: 'win', n: 1 }, { c: 'finish', n: 1 }], pencere: [2, 10, 2, 16] },
  yaz: { ad: () => L("YAZ FESTİVALİ"), alt: () => L("Sıcak kamplar, sıcak maçlar."), emoji: '☀️', renk: ['#4a3206', '#140e05'], kozmetik: 'cer_gunes', gorevler: [{ c: 'idman', n: 2 }, { c: 'win', n: 2 }, { c: 'finish', n: 1 }], pencere: [7, 1, 7, 21] },
  cadilar: { ad: () => L("KORKU GECESİ"), alt: () => L("Cadılar bayramında rakiplerine kâbus yaşat."), emoji: '🎃', renk: ['#3a1a06', '#120804'], kozmetik: 'sort_balkabagi', gorevler: [{ c: 'win', n: 1 }, { c: 'ko', n: 1 }, { c: 'r1', n: 1 }], pencere: [10, 24, 11, 2] },
  ramazan: { ad: () => L("RAMAZAN BAYRAMI"), alt: () => L("Bayram ruhuyla kafese çık."), emoji: '🌙', renk: ['#0f2e24', '#07120e'], kozmetik: 'kem_bayram', gorevler: [{ c: 'gonderi', n: 2 }, { c: 'win', n: 1 }, { c: 'win', n: 2 }], tarihler: [['2027-03-08', '2027-03-14'], ['2028-02-25', '2028-03-02'], ['2029-02-13', '2029-02-19']] },
  kurban: { ad: () => L("KURBAN BAYRAMI"), alt: () => L("Bayram kartında ana maç senin."), emoji: '🕌', renk: ['#0f2e24', '#07120e'], kozmetik: 'kem_bayram', gorevler: [{ c: 'win', n: 1 }, { c: 'gonderi', n: 2 }, { c: 'finish', n: 1 }], tarihler: [['2027-05-15', '2027-05-21'], ['2028-05-03', '2028-05-09'], ['2029-04-22', '2029-04-28']] },
};

export interface SpecialEvent {
  id: SpecialId;
  /** Etkinliğin başladığı yıl (aynı etkinlik her yıl yeniden açılır) */
  yil: number;
  bas: Partial<Record<Counter, number>>;
  alinan: boolean[];
  bitis: number;
}

const ymd = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
const toNum = (s: string) => Number(s.replace(/-/g, ''));

/** Bugün aktif etkinlik ve bitiş tarihi (yerel gece yarısı, ms). */
export function activeSpecial(d = new Date()): { id: SpecialId; yil: number; bitis: number } | null {
  const today = ymd(d);
  const y = d.getFullYear();
  for (const [id, sp] of Object.entries(SPECIALS) as [SpecialId, (typeof SPECIALS)[SpecialId]][]) {
    if (sp.pencere) {
      const [m1, d1, m2, d2] = sp.pencere;
      const wraps = m2 < m1;
      // Yıl dönümünü saran pencere (ör. 20 Aralık - 6 Ocak): ocak tarafında başlangıç geçen yıldır
      const startY = wraps && d.getMonth() + 1 <= m2 ? y - 1 : y;
      const start = startY * 10000 + m1 * 100 + d1;
      const endY = wraps ? startY + 1 : startY;
      const end = endY * 10000 + m2 * 100 + d2;
      if (today >= start && today <= end) return { id, yil: startY, bitis: new Date(endY, m2 - 1, d2 + 1).getTime() };
    }
    for (const [a, b] of sp.tarihler ?? []) {
      if (today >= toNum(a) && today <= toNum(b)) {
        const [by, bm, bd] = b.split('-').map(Number);
        return { id, yil: by, bitis: new Date(by, bm - 1, bd + 1).getTime() };
      }
    }
  }
  return null;
}

/** Aktif etkinliği kayda işler (yoksa kaldırır). */
export function ensureSpecial(s: GameState, d = new Date()) {
  const a = activeSpecial(d);
  if (!a) {
    if (s.ozelEtkinlik) s.ozelEtkinlik = undefined;
    return;
  }
  if (s.ozelEtkinlik?.id === a.id && s.ozelEtkinlik.yil === a.yil) return;
  const bas: SpecialEvent['bas'] = {};
  SPECIALS[a.id].gorevler.forEach((g) => (bas[g.c] = count(s, g.c)));
  s.ozelEtkinlik = { id: a.id, yil: a.yil, bas, alinan: [false, false, false], bitis: a.bitis };
}

export function specialProgress(s: GameState, ev: SpecialEvent, i: number): [number, number] {
  const g = SPECIALS[ev.id].gorevler[i];
  return [Math.max(0, Math.min(g.n, count(s, g.c) - (ev.bas[g.c] ?? 0))), g.n];
}

export const specialDone = (s: GameState, ev: SpecialEvent, i: number) => {
  const [a, b] = specialProgress(s, ev, i);
  return a >= b;
};

export function specialTaskText(ev: SpecialEvent, i: number) {
  const g = SPECIALS[ev.id].gorevler[i];
  switch (g.c) {
    case 'win':
      return g.n === 1 ? L("Bir maç kazan") : L("{0} maç kazan", [g.n]);
    case 'ko':
      return L("Bir maçı nakavtla kazan");
    case 'finish':
      return L("{0} maçı bitirerek kazan (KO ya da submission)", [g.n]);
    case 'r1':
      return L("Bir maçı 1. rauntta bitir");
    case 'gonderi':
      return L("Sosyal medyada {0} paylaşım yap", [g.n]);
    case 'idman':
      return L("Antrenman oyunlarında {0} kez 80+ puan al", [g.n]);
    default:
      return '';
  }
}

const BASE: Record<GameState['stage'], number> = { amator: 500, bolgesel: 3_000, buyuk: 15_000, ufc: 40_000 };

export function claimSpecial(s: GameState, i: number) {
  const ev = s.ozelEtkinlik;
  if (!ev || ev.alinan[i] || !specialDone(s, ev, i)) return;
  ev.alinan[i] = true;
  const sp = SPECIALS[ev.id];
  if (i < 2) {
    const para = BASE[s.stage] * (i + 1);
    s.para += para;
    s.haberler.unshift(L("{0} {1}: görev ödülü ${2}", [sp.emoji, sp.ad(), para.toLocaleString(LOC)]));
  } else {
    s.ozelKozmetik = [...new Set([...(s.ozelKozmetik ?? []), sp.kozmetik])];
    s.haberler.unshift(L("{0} {1} tamamlandı! Özel kozmetik açıldı: ana menüdeki DOLAP'a bak.", [sp.emoji, sp.ad()]));
  }
}

export function daysLeft(ev: SpecialEvent, now = Date.now()) {
  return Math.max(0, Math.ceil((ev.bitis - now) / 86_400_000));
}
