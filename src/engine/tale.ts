// "Tale of the tape": boy, uzanma, duruş ve rakip görünümü. İsimden türetilir, hep aynı kalır.
import { L } from '../i18n';
import type { Appearance, Opponent, WeightClass } from './types';

function hash(t: string) {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const BASE_BOY: Record<WeightClass, number> = { sinek: 165, horoz: 170, tuy: 173, hafif: 177, welter: 181, orta: 185, yariagir: 189, agir: 193 };

/** Karakter oluştururken seçilebilecek boylar (sıklete göre). */
export const heightOptions = (siklet: WeightClass) => [-8, -4, 0, 4, 8].map((d) => BASE_BOY[siklet] + d);

/** Boyun etkisi: uzun boy uzanma = vuruş; kısa boy düşük ağırlık merkezi = güreş. */
export function heightMods(boy: number, siklet: WeightClass): { vurus?: number; gures?: number } {
  const d = Math.round((boy - BASE_BOY[siklet]) / 4);
  return d === 0 ? {} : { vurus: d, gures: -d };
}

/** Uzanma: boya bağlı, isme göre sabit küçük fark. */
export const reachFor = (boy: number, seed: string) => boy + ((hash(seed) >>> 5) % 9) - 2;

/** Oyuncunun fiziği: kayıtlı boy/uzanma kullanılır, maçtan maça değişmez. */
export function playerPhysique(f: { ad: string; soyad: string; siklet: WeightClass; boy?: number; uzanma?: number }) {
  const base = physique(f.ad + f.soyad, f.siklet);
  const boy = f.boy ?? base.boy;
  return { ...base, boy, uzanma: f.uzanma ?? reachFor(boy, f.ad + f.soyad) };
}

export function physique(seed: string, siklet: WeightClass) {
  const h = hash(seed);
  const boy = BASE_BOY[siklet] + ((h % 11) - 5);
  const uzanma = boy + (((h >>> 5) % 13) - 4);
  const durus = (h >>> 9) % 5 === 0 ? L("Southpaw (solak)") : (h >>> 9) % 7 === 0 ? L("Switch") : L("Orthodox");
  return { boy, uzanma, durus };
}

/** Rakibin yüzü: kimliğinden ve uyruğundan deterministik olarak üretilir. */
export function lookFor(o: Pick<Opponent, 'id' | 'uyruk'>): Appearance {
  // İki bağımsız hash: her özellik farklı bitlerden gelsin (işaretsiz kaydırma; negatif indeks yok).
  const h = hash(o.id + o.uyruk);
  const h2 = hash(o.uyruk + o.id + '#yuz');
  const bits = (x: number, sh: number, n: number) => (x >>> sh) % n;
  const darkSkin = [L("Nijerya"), L("Kamerun"), L("Küba")].includes(o.uyruk);
  const midSkin = [L("Brezilya"), L("Meksika"), L("Şili"), L("Azerbaycan"), L("Türkiye"), L("Kazakistan"), L("Tayland")].includes(o.uyruk);
  const ten = darkSkin ? 5 + bits(h, 0, 3) : midSkin ? 2 + bits(h, 0, 3) : bits(h, 0, 4);
  const saclar: Appearance['sac'][] = ['kazik', 'kisa', 'mohawk', 'uzun', 'topuz', 'afro', 'orgu', 'kel'];
  const sakallar: Appearance['sakal'][] = ['yok', 'kirli', 'tam', 'keci', 'biyik'];
  return {
    ten,
    sac: darkSkin ? saclar[[0, 5, 6, 7][bits(h, 3, 4)]] : saclar[bits(h, 3, 8)],
    sacRenk: darkSkin ? bits(h, 6, 2) : bits(h, 6, 8),
    goz: darkSkin || midSkin ? bits(h, 9, 2) : bits(h, 9, 6),
    sakal: sakallar[bits(h, 12, 5)],
    yara: bits(h, 15, 4) === 0,
    dovme: bits(h, 17, 3) === 0,
    yuz: bits(h2, 0, 5),
    burun: bits(h2, 3, 4),
    gozSekil: bits(h2, 6, 3),
    dudak: bits(h2, 9, 3),
    kas: bits(h2, 12, 3),
    kulak: bits(h2, 15, 3) === 0 ? 1 : 0,
  };
}
