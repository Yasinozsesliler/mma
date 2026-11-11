// Kontrat pazarlık masası: organizasyonun gizli bütçe tavanı ve sabrı var. Ücret ya da galibiyet bonusu için
// ayrı ayrı bastırılır; başka organizasyonun teklifi koz olarak masaya konabilir (transfer savaşı).
import { L, LOC } from '../i18n';
import { ORGS } from './data';
import { chance, rand } from './rng';
import type { GameState, Offer, OrgId } from './types';

export interface ContractTable {
  tavan: number;
  sabir: number;
  sabirMax: number;
  ucretK: number;
  bonusK: number;
  baz: { ucret: number; bonus: number };
  mesaj: string;
  ruh: 'sicak' | 'gergin' | 'kizgin' | 'son';
  kozKullanildi?: boolean;
  ipucu?: string;
  /** Ödüllü piyasa araştırması yapıldı (kesin tavan ipucu) */
  arastirma?: boolean;
}

const r100 = (n: number) => Math.round(n / 100) * 100;
const $ = (n: number) => `$${Math.round(n).toLocaleString(LOC)}`;

function apply(o: Offer) {
  const t = o.masa!;
  o.ucret = r100(t.baz.ucret * t.ucretK);
  o.bonus = r100(t.baz.bonus * t.bonusK);
}

/** Masadaki diğer organizasyonların en iyi ücreti (koz). */
export function leverageOf(s: GameState, o: Offer): Offer | null {
  const others = (s.pending.teklifler ?? []).filter((x) => x.id !== o.id && x.org !== o.org && !x.devam && x.org !== 'dwcs');
  if (!others.length) return null;
  return others.reduce((a, b) => (b.ucret > a.ucret ? b : a));
}

export function openTable(s: GameState, id: string) {
  const o = s.pending.teklifler?.find((x) => x.id === id);
  if (!o || o.pazarlikYapildi || o.masa) return;
  const mq = s.takim.menajerKalite;
  const tavan = 1.08 + mq * 0.022 + s.populerlik / 350 + (s.sampiyon ? 0.12 : 0) + rand() * 0.18;
  const sabir = 3 + (mq >= 6 ? 1 : 0);
  let ipucu: string | undefined;
  if (mq >= 5) {
    const guess = Math.round(((tavan - 1) * 100 + (rand() - 0.5) * (40 - mq * 3)) / 5) * 5;
    ipucu = L("Menajerin: “Ücrette %{0} civarına kadar esnerler. Bonus daha kolay.”", [Math.max(5, guess)]);
  }
  o.masa = { tavan, sabir, sabirMax: sabir, ucretK: 1, bonusK: 1, baz: { ucret: o.ucret, bonus: o.bonus }, mesaj: L("{0}: “Teklifimiz ortada. Sizi dinliyoruz.”", [ORGS[o.org].kisa]), ruh: 'sicak', ipucu };
}

function lose(s: GameState, o: Offer, t: ContractTable, fark: number): string | null {
  t.sabir -= fark > 1.25 ? 2 : 1;
  if (t.sabir > 0) return null;
  if (chance(0.4) && (s.pending.teklifler ?? []).length > 1) {
    s.pending.teklifler = s.pending.teklifler!.filter((x) => x.id !== o.id);
    return L("❌ {0} masadan kalktı: “Başka dövüşçülerle devam ederiz.”", [ORGS[o.org].kisa]);
  }
  t.ucretK += (t.tavan - t.ucretK) * 0.6;
  apply(o);
  t.ruh = 'son';
  t.mesaj = L("{0}: “Son teklifimiz: dövüş başı {1}. İmzala ya da yolumuza bakalım.”", [ORGS[o.org].kisa, $(o.ucret)]);
  return null;
}

/** 'ucret' (+%15), 'bonus' (+%30) ya da 'koz' (diğer teklifi masaya koy). Dönüş: üstte gösterilecek mesaj (varsa). */
export function tableAsk(s: GameState, id: string, ne: 'ucret' | 'bonus' | 'koz'): string | null {
  const o = s.pending.teklifler?.find((x) => x.id === id);
  const t = o?.masa;
  if (!o || !t || t.ruh === 'son') return null;
  const org = ORGS[o.org].kisa;
  if (ne === 'koz') {
    const other = leverageOf(s, o);
    if (!other || t.kozKullanildi) return null;
    t.kozKullanildi = true;
    const hedef = other.ucret / t.baz.ucret;
    if (hedef <= t.ucretK) {
      t.ruh = 'gergin';
      t.mesaj = L("{0}: “Bizim teklifimiz zaten daha iyi. Bunu neden gösteriyorsunuz?”", [org]);
      t.sabir -= 1;
      return null;
    }
    if (chance(0.55 + s.populerlik / 300)) {
      t.ucretK = Math.min(t.tavan + 0.12, hedef * 1.03);
      t.tavan = Math.max(t.tavan, t.ucretK);
      apply(o);
      t.ruh = 'sicak';
      t.mesaj = L("{0}: “{1} sana bunu mu veriyor? Biz daha fazlasını veririz: dövüş başı {2}.”", [org, ORGS[other.org].kisa, $(o.ucret)]);
      return null;
    }
    t.ruh = 'kizgin';
    t.mesaj = L("{0}: “Pazarlık kozu oynuyorsunuz. Gitmek istiyorsanız gidin.”", [org]);
    return lose(s, o, t, 1.3);
  }
  if (ne === 'ucret') {
    const ask = t.ucretK + 0.15;
    if (ask <= t.tavan) {
      t.ucretK = ask;
      apply(o);
      t.ruh = 'sicak';
      t.mesaj = L("{0}: “Tamam, dövüş başı {1} olsun.”", [org, $(o.ucret)]);
      return null;
    }
    const fark = ask / t.tavan;
    t.ucretK += (t.tavan - t.ucretK) * (0.35 + rand() * 0.15);
    apply(o);
    t.ruh = fark > 1.25 ? 'kizgin' : 'gergin';
    t.mesaj = fark > 1.25 ? L("{0}: “Bu rakam gerçekçi değil. En fazla {1}.”", [org, $(o.ucret)]) : L("{0}: “Bütçeyi zorluyorsunuz. {1} yapabiliriz.”", [org, $(o.ucret)]);
    return lose(s, o, t, fark);
  }
  // Bonus organizasyon için daha ucuz: tavan 0.35 daha yüksek
  const ask = t.bonusK + 0.3;
  if (ask <= t.tavan + 0.35) {
    t.bonusK = ask;
    apply(o);
    t.ruh = 'sicak';
    t.mesaj = L("{0}: “Kazanırsan hak edersin. Galibiyet bonusu {1}.”", [org, $(o.bonus)]);
    return null;
  }
  t.ruh = 'gergin';
  t.mesaj = L("{0}: “Bonusta da sınırımız var.”", [org]);
  return lose(s, o, t, ask / (t.tavan + 0.35));
}

/** Masadan kalk: teklif son haliyle kalır, bir daha pazarlık yok. */
export function leaveTable(s: GameState, id: string) {
  const o = s.pending.teklifler?.find((x) => x.id === id);
  if (!o?.masa) return;
  o.masa = undefined;
  o.pazarlikYapildi = true;
}

export const tableOrgName = (org: OrgId) => ORGS[org].kisa;
