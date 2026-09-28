// Ödüllü reklam karşılıkları. Kural: güç (istatistik/puan) değil; para, zaman, bilgi ve kolaylık verir.
// Her teklif yalnızca ilgili anda ve kendi döngüsünde bir kez alınabilir.
import { counterOf, STYLE_TACTICS } from './fight';
import { deck } from './nightlife';
import type { GameState, Opponent, Stage, Tactic } from './types';

// ---------- Sponsor reklam çekimi (maç sonrası) ----------

const MIN_SHOOT: Record<Stage, number> = { amator: 300, bolgesel: 1200, buyuk: 5000, ufc: 8000 };

/** Gecenin kazancının yaklaşık dörtte biri; aşamaya göre bir tabanı var (amatörde de anlamlı olsun). */
export function adShootAmount(s: GameState): number {
  const kazanc = s.pending.sonrasi?.ozet?.kazanc ?? 0;
  return Math.max(MIN_SHOOT[s.stage], Math.round((kazanc * 0.25) / 100) * 100);
}

export function claimAdShoot(s: GameState): number {
  const ps = s.pending.sonrasi;
  if (!ps || ps.reklamCekimi) return 0;
  const n = adShootAmount(s);
  s.para += n;
  ps.reklamCekimi = n;
  return n;
}

// ---------- Detaylı keşif raporu (kamp, plan seçimi) ----------

export type ScoutReport = {
  /** En sık kullandığı taktik ve payı (%) */
  sik: Tactic;
  sikPay: number;
  ikinci: Tactic;
  /** Buna karşı en etkili taktik */
  karsi: Tactic;
  /** Tekrarlanan taktikleri okuma becerisi */
  okuma: 'yuksek' | 'orta' | 'dusuk';
};

/** Rakibin dövüş alışkanlıkları: dövüş motorunun kullandığı eğilimlerin kendisi (tahmin değil). */
export function scoutReport(o: Opponent): ScoutReport {
  const w = [...STYLE_TACTICS[o.stil]].sort((a, b) => b[1] - a[1]);
  const total = w.reduce((a, [, v]) => a + v, 0);
  return {
    sik: w[0][0],
    sikPay: Math.round((w[0][1] / total) * 100),
    ikinci: w[1][0],
    karsi: counterOf(w[0][0]),
    okuma: o.stats.iq >= 70 ? 'yuksek' : o.stats.iq >= 50 ? 'orta' : 'dusuk',
  };
}

export function claimScout(s: GameState) {
  if (s.pending.kamp) s.pending.kamp.kesif = true;
}

// ---------- Fizyoterapi seansı (sakatken) ----------

/** Kariyerdeki toplam dövüş: "her dövüş arasında bir kez" teklifler için anahtar. */
export function careerFights(s: GameState) {
  return s.rekor.g + s.rekor.m + s.rekor.b + s.amator.g + s.amator.m + s.amator.b;
}

export const canHealFaster = (s: GameState) => s.sakatliklar.length > 0 && s.odul?.sakatlikMac !== careerFights(s);

export function claimHealFaster(s: GameState) {
  s.sakatliklar = s.sakatliklar.map((j) => ({ ...j, hafta: Math.max(1, j.hafta - 2) }));
  s.odul = { ...s.odul, sakatlikMac: careerFights(s) };
}

// ---------- Yeni flört profilleri (deste bitince, haftada bir) ----------

export const canRefreshProfiles = (s: GameState) => s.odul?.profilHafta !== s.hafta;

export function claimProfiles(s: GameState) {
  s.adaylar = undefined;
  deck(s);
  s.odul = { ...s.odul, profilHafta: s.hafta };
}
