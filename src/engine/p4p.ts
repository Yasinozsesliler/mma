// Pound for Pound: UFC'nin tüm sıkletlerindeki en iyi 15 dövüşçü. Liste her UFC maçından sonra kıpırdar;
// oyuncu UFC başarılarıyla (galibiyet, bitiriş, kemer, savunma, seri) listeye girer ve yükselir.
import { L } from '../i18n';
import { WEIGHT_CLASSES } from './data';
import { generateOpponent } from './opponents';
import { chance, clamp, noise, pick, randInt } from './rng';
import type { GameState, P4PEntry, WeightClass } from './types';

export type { P4PEntry };

export const P4P_SIZE = 15;

// Sayılara Türkçe ek: 7'den, 6'ya, 3'e…
const ABL = ['dan', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
const DAT = ['a', 'e', 'ye', 'e', 'e', 'e', 'ya', 'ye', 'e', 'a'];
export const ablative = (n: number) => ABL[n % 10];
export const dative = (n: number) => DAT[n % 10];

function makeEntry(s: GameState, siklet: WeightClass, puan: number, sampiyon: boolean): P4PEntry {
  const o = generateOpponent(s, { zorluk: 0, org: 'ufc', rank: 1 });
  const g = randInt(14, 26) + Math.round((puan - 70) / 3);
  return { id: o.id, ad: o.ad, soyad: o.soyad, lakap: o.lakap, uyruk: o.uyruk, siklet, rekor: { g, m: randInt(0, 4), b: chance(0.15) ? 1 : 0 }, puan, sampiyon };
}

export function ensureP4P(s: GameState) {
  if (s.p4p?.liste.length) return;
  const classes = Object.keys(WEIGHT_CLASSES) as WeightClass[];
  const liste: P4PEntry[] = [];
  // Her sıkletin şampiyonu listede; kalanlar güçlü yarışmacılar.
  classes.forEach((w) => liste.push(makeEntry(s, w, randInt(80, 97), true)));
  while (liste.length < P4P_SIZE) liste.push(makeEntry(s, pick(classes), randInt(70, 88), false));
  liste.sort((a, b) => b.puan - a.puan);
  s.p4p = { liste, sira: null };
}

/** Oyuncunun P4P puanı: yalnızca UFC başarıları sayılır. */
export function playerP4PScore(s: GameState) {
  const ufc = s.gecmis.filter((g) => g.org === 'ufc');
  const w = ufc.filter((g) => g.sonuc === 'G').length;
  if (!w) return 0;
  const l = ufc.filter((g) => g.sonuc === 'M').length;
  const fin = ufc.filter((g) => g.sonuc === 'G' && /KO|TKO|Submission/.test(g.yontem)).length;
  const belts = (s.kemerler ?? []).filter((b) => b.org === 'ufc');
  const aktif = belts.filter((b) => b.aktif).length;
  const def = belts.reduce((a, b) => a + b.savunma, 0);
  return Math.round(45 + w * 2.2 + fin * 0.8 - l * 3 + aktif * 12 + def * 3 + Math.max(0, s.seri) * 1.2 + (aktif >= 2 ? 8 : 0));
}

export type P4PRow = (P4PEntry & { oyuncu?: false }) | { oyuncu: true; puan: number };

/** Oyuncu dahil sıralı liste (ilk 15). */
export function p4pRows(s: GameState): P4PRow[] {
  const list: P4PRow[] = [...(s.p4p?.liste ?? [])];
  const ps = playerP4PScore(s);
  if (ps > 0) list.push({ oyuncu: true, puan: ps });
  return list.sort((a, b) => b.puan - a.puan).slice(0, P4P_SIZE);
}

export function p4pRank(s: GameState): number | null {
  const i = p4pRows(s).findIndex((r) => r.oyuncu);
  return i >= 0 ? i + 1 : null;
}

/** UFC maçından sonra: liste kıpırdar, oyuncunun yeri değişirse haber olur. */
export function updateP4P(s: GameState): string | null {
  ensureP4P(s);
  const p = s.p4p!;
  p.liste.forEach((e) => {
    e.puan = clamp(e.puan + noise(1.5), 55, 100);
    if (chance(0.12)) {
      e.puan = clamp(e.puan + 3, 55, 100);
      e.rekor.g++;
    } else if (chance(0.06)) {
      e.puan = clamp(e.puan - 6, 55, 100);
      e.rekor.m++;
      if (e.sampiyon && chance(0.5)) e.sampiyon = false;
    }
  });
  // Emekli olanlar ve yükselen yıldızlar
  p.liste = p.liste.filter((e) => e.puan >= 66 || !chance(0.5));
  while (p.liste.length < P4P_SIZE) p.liste.push(makeEntry(s, pick(Object.keys(WEIGHT_CLASSES) as WeightClass[]), randInt(74, 82), false));
  p.liste.sort((a, b) => b.puan - a.puan);
  const once = p.sira;
  const simdi = p4pRank(s);
  p.sira = simdi;
  if (simdi == null) return once != null ? L("📉 Pound for Pound listesinden düştün.") : null;
  if (once == null) return L("🌍 POUND FOR POUND! Dünyanın en iyi {0} dövüşçüsü arasına girdin: #{1}", [P4P_SIZE, simdi]);
  if (simdi === 1 && once !== 1) return L("👑 POUND FOR POUND KRALI! Artık sıklet fark etmeksizin dünyanın en iyisisin.");
  if (simdi < once) return L("📈 P4P listesinde #{0}’{1} #{2}’{3} yükseldin.", [once, ablative(once), simdi, dative(simdi)]);
  if (simdi > once) return L("📉 P4P listesinde #{0}’{1} #{2}’{3} geriledin.", [once, ablative(once), simdi, dative(simdi)]);
  return null;
}
