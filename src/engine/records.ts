// Tarihin en iyileri: UCC'nin tüm zamanlar rekorları. Oyuncu her kategoride üç efsaneyi sırayla geçer.
// Ödül para ve popülerliktir, güç vermez. Yalnızca UCC maçları sayılır.
import { L, LOC } from '../i18n';
import { addPost } from './social';
import { rosterFor } from './uccRoster';
import type { GameState } from './types';

export type RekorId = 'galibiyet' | 'nakavt' | 'submission' | 'seri' | 'savunma' | 'kemer';

export interface UccIstat {
  g: number;
  ko: number;
  sub: number;
}

export interface RekorTablo {
  gecilen: Partial<Record<RekorId, number>>;
  yakin: string[];
  istat: UccIstat;
}

/** Hedefler artan sırada: 3., 2. ve 1. efsane. */
export const REKORLAR: { id: RekorId; ad: () => string; hedef: [number, number, number] }[] = [
  { id: 'galibiyet', ad: () => L("En çok UCC galibiyeti"), hedef: [12, 18, 25] },
  { id: 'nakavt', ad: () => L("En çok UCC nakavtı"), hedef: [5, 8, 12] },
  { id: 'submission', ad: () => L("En çok UCC submission'ı"), hedef: [3, 5, 8] },
  { id: 'seri', ad: () => L("En uzun UCC galibiyet serisi"), hedef: [6, 9, 13] },
  { id: 'savunma', ad: () => L("En çok kemer savunması"), hedef: [3, 6, 10] },
  { id: 'kemer', ad: () => L("En çok UCC şampiyonluğu"), hedef: [2, 3, 5] },
];
const ODUL = [
  { para: 10_000, pop: 2 },
  { para: 25_000, pop: 3 },
  { para: 75_000, pop: 5 },
];

const tablo = (s: GameState): RekorTablo => (s.rekorTablo ??= { gecilen: {}, yakin: [], istat: backfill(s) });

/** Bu sistemden önce oynanmış UCC maçlarını sayar (yöntem adı o anki dilde kaydedildiği için yaklaşık). */
function backfill(s: GameState): UccIstat {
  const out: UccIstat = { g: 0, ko: 0, sub: 0 };
  s.gecmis.forEach((h) => {
    if (h.org !== 'ufc' || h.sonuc !== 'G') return;
    out.g++;
    if (h.yontem === 'KO' || h.yontem === 'TKO') out.ko++;
    else if (/^sub|finali|sumis|сабмишн|поддан|болев/i.test(h.yontem)) out.sub++;
  });
  return out;
}

function enUzunSeri(s: GameState) {
  let best = 0;
  let cur = 0;
  for (let i = s.gecmis.length - 1; i >= 0; i--) {
    const h = s.gecmis[i];
    if (h.org !== 'ufc') continue;
    cur = h.sonuc === 'G' ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}

export function rekorDeger(s: GameState, id: RekorId): number {
  const i = s.rekorTablo?.istat ?? backfill(s);
  const kemer = (s.kemerler ?? []).filter((b) => b.org === 'ufc');
  switch (id) {
    case 'galibiyet':
      return i.g;
    case 'nakavt':
      return i.ko;
    case 'submission':
      return i.sub;
    case 'seri':
      return enUzunSeri(s);
    case 'savunma':
      return kemer.reduce((a, b) => a + b.savunma, 0);
    case 'kemer':
      return kemer.length;
  }
}

/** Efsanenin adı: oyuncunun sıkletindeki kadrodan, kategori ve sıraya göre sabit. */
export function efsaneAdi(s: GameState, katIdx: number, sira: number): string {
  const list = rosterFor(s.fighter.siklet, !!s.fighter.kadin);
  if (!list.length) return L("Efsane #{0}", [katIdx * 3 + sira + 1]);
  const x = list[(katIdx * 3 + sira + 3) % list.length];
  return `${x.ad} ${x.soyad}`;
}

export interface RekorSatir {
  id: RekorId;
  ad: string;
  deger: number;
  /** 0-3: geçilen efsane sayısı */
  gecilen: number;
  hedefler: { ad: string; hedef: number; gecildi: boolean }[];
}

export function rekorSatirlari(s: GameState): RekorSatir[] {
  return REKORLAR.map((r, k) => {
    const deger = rekorDeger(s, r.id);
    const gecilen = r.hedef.filter((h) => deger > h).length;
    return { id: r.id, ad: r.ad(), deger, gecilen, hedefler: r.hedef.map((hedef, i) => ({ ad: efsaneAdi(s, k, i), hedef, gecildi: deger > hedef })) };
  });
}

/** Geçmeye en yakın rekor (merkezdeki kart için). */
export function siradakiRekor(s: GameState) {
  let best: { ad: string; kalan: number; efsane: string; sira: number } | null = null;
  REKORLAR.forEach((r, k) => {
    const d = rekorDeger(s, r.id);
    const i = r.hedef.findIndex((h) => d <= h);
    if (i < 0) return;
    const kalan = r.hedef[i] + 1 - d;
    if (!best || kalan < best.kalan) best = { ad: r.ad(), kalan, efsane: efsaneAdi(s, k, i), sira: 3 - i };
  });
  return best as { ad: string; kalan: number; efsane: string; sira: number } | null;
}

/** Maç sonu: sayaçları işler, geçilen rekorları ödüllendirir. "🏛️" ile başlayan satırlar maç sonunda öne çıkar. */
export function recordsAfterFight(s: GameState, org: string, won: boolean, yontem: string): string[] {
  if (org !== 'ufc') return [];
  const t = tablo(s);
  if (won) {
    t.istat.g++;
    if (yontem === 'KO' || yontem === 'TKO') t.istat.ko++;
    else if (yontem === 'SUB') t.istat.sub++;
  }
  const out: string[] = [];
  REKORLAR.forEach((r, k) => {
    const d = rekorDeger(s, r.id);
    let g = t.gecilen[r.id] ?? 0;
    while (g < 3 && d > r.hedef[g]) {
      const o = ODUL[g];
      const ad = efsaneAdi(s, k, g);
      const sira = 3 - g;
      s.para += o.para;
      s.populerlik = Math.min(100, s.populerlik + o.pop);
      const msg =
        sira === 1
          ? L("🏛️ TARİH YAZILDI! {0}: artık tüm zamanların 1 numarası sensin, {1} geride kaldı. +${2}, popülerlik +{3}.", [r.ad(), ad, o.para.toLocaleString(LOC), o.pop])
          : L("🏛️ Rekor: {0} listesinde {1} dövüşçüsünü geçtin, sıran #{2}. +${3}, popülerlik +{4}.", [r.ad(), ad, sira, o.para.toLocaleString(LOC), o.pop]);
      out.push(msg);
      s.haberler.unshift(msg);
      if (sira === 1) addPost(s, { yazar: L("UCC Tarihi"), kullanici: '@ucctarihi', tur: 'hikaye', metin: L("{0} tarihin 1 numarası: {1}. Bu rekor uzun süre konuşulacak.", [r.ad(), `${s.fighter.ad} ${s.fighter.soyad}`]), renk: '#f2c14e' });
      g++;
      t.gecilen[r.id] = g;
    }
    // Rekora bir adım kala haber (her efsane için bir kez)
    if (g < 3 && r.hedef[g] + 1 - d === 1) {
      const key = `${r.id}${g}`;
      if (!t.yakin.includes(key)) {
        t.yakin.push(key);
        s.haberler.unshift(L("📰 {0}: {1} rekoruna bir adım kaldı!", [r.ad(), efsaneAdi(s, k, g)]));
      }
    }
  });
  return out;
}
