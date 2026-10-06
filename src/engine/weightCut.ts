// Elle kilo verme: tartıdan önceki son 48 saat (4 zaman dilimi). Her eylem kilo düşürür ama enerjiyi tüketir.
// Tartıyı geçmek şart; enerjiyi koruyan taze çıkar, tükenen kafese bitik girer.
import { L } from '../i18n';
import { WEIGHT_CLASSES } from './data';
import { rand } from './rng';
import { cutBonus } from './shop';
import type { GameState } from './types';

export type CutAction = 'sauna' | 'su' | 'kosu' | 'banyo' | 'dinlen';

export interface ManualCut {
  /** Limitin üstündeki kilo */
  fazla: number;
  enerji: number;
  dilim: number;
  log: string[];
  suKesildi?: boolean;
}

export const CUT_SLOTS = 4;

export const CUT_ACTIONS: Record<CutAction, { ad: () => string; icon: string; kg: [number, number]; enerji: number; ipucu: () => string }> = {
  sauna: { ad: () => L("Sauna"), icon: 'fire', kg: [1.1, 1.6], enerji: -18, ipucu: () => L("En çok kilo, en çok yorgunluk") },
  su: { ad: () => L("Su kesimi"), icon: 'water-off', kg: [0.8, 1.1], enerji: -9, ipucu: () => L("Bir kez yapılabilir") },
  kosu: { ad: () => L("Ter kıyafetiyle koşu"), icon: 'run', kg: [0.6, 0.9], enerji: -9, ipucu: () => L("Dengeli") },
  banyo: { ad: () => L("Sıcak tuz banyosu"), icon: 'bathtub-outline', kg: [0.4, 0.7], enerji: -5, ipucu: () => L("Hafif ama yormaz") },
  dinlen: { ad: () => L("Dinlen, hafif ye"), icon: 'bed', kg: [-0.3, -0.1], enerji: 14, ipucu: () => L("Enerji toplar, kilo biraz artar") },
};

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Kesimi başlat: başlangıç fazlası amatörde az, kısa haberde fazla; diyetisyen, ekipman ve perkler azaltır. */
export function startManualCut(s: GameState) {
  const k = s.pending.kamp;
  if (!k || k.kesim) return;
  const [a, b] = s.stage === 'amator' ? [1.2, 2] : [2.4, 3.5];
  const fazla = a + rand() * (b - a) + (k.kisaHaber ? 1.2 : 0) - cutBonus(s) * 8;
  k.kesim = { fazla: r1(Math.max(0.6, fazla)), enerji: 100, dilim: 0, log: [] };
  k.step = 'kesim';
}

export const slotName = (i: number) => [L("Perşembe sabah"), L("Perşembe akşam"), L("Cuma sabah"), L("Cuma gece")][i] ?? L("Tartı");

export function cutAction(s: GameState, a: CutAction) {
  const c = s.pending.kamp?.kesim;
  if (!c || c.dilim >= CUT_SLOTS) return;
  if (a === 'su' && c.suKesildi) return;
  const d = CUT_ACTIONS[a];
  // Enerjisi düşükken vücut daha az su bırakır
  const eff = c.enerji < 35 ? 0.7 : 1;
  const kg = r1((d.kg[0] + rand() * (d.kg[1] - d.kg[0])) * (d.kg[0] > 0 ? eff : 1));
  c.fazla = r1(c.fazla - kg);
  c.enerji = Math.max(0, Math.min(100, c.enerji + d.enerji));
  if (a === 'su') c.suKesildi = true;
  c.log.push(L("{0} · {1}: {2} kg · enerji {3}", [slotName(c.dilim), d.ad(), kg > 0 ? `-${kg}` : `+${-kg}`, c.enerji]));
  c.dilim++;
}

/** Tartı sonucu (weighIn çağırır): satırlar ve kafes etkileri. */
export function manualCutResult(s: GameState, lines: string[], hidrasyon: boolean) {
  const k = s.pending.kamp!;
  const c = k.kesim!;
  const add = (st: 'kondisyon' | 'cene' | 'vurus' | 'gures', n: number) => (k.mods[st] = (k.mods[st] ?? 0) + n);
  if (hidrasyon && c.enerji < 40 && rand() < 0.5) {
    lines.push(L("❌ HİDRASYON TESTİNDEN KALDIN! Vücudun kurumuş, maç iptal. Ücret yok, itibar zedelendi."));
    k.iptal = true;
    s.populerlik = Math.max(0, s.populerlik - 5);
    return;
  }
  if (c.fazla > 0) {
    lines.push(L("❌ Tartıyı {0} kilo kaçırdın! Ücretinin %20’si rakibe gidiyor.", [c.fazla]));
    k.ucretCeza = 0.2;
    add('kondisyon', -4);
    s.populerlik = Math.max(0, s.populerlik - 2);
  } else lines.push(L("✅ Tartıdasın: limitin {0} kilo altı. Kesimi kendin yönettin.", [Math.abs(c.fazla)]));
  // Su kesimiyle limite tam inip (fazla kurumadan) enerjini korumak: rehidrasyon sonrası kafeste rakibinden iri
  if (c.suKesildi && c.fazla <= 0 && c.fazla >= -0.5 && c.enerji >= 70) {
    add('vurus', 3);
    add('gures', 3);
    add('kondisyon', 2);
    lines.push(L("💪 Enerjin yerinde ve rehidrasyon sonrası rakibinden iri çıkacaksın (vuruş +3, güreş +3, kondisyon +2)."));
  } else if (c.enerji >= 75) {
    add('kondisyon', 2);
    lines.push(L("🔋 Taze hissediyorsun (kondisyon +2)."));
  } else if (c.enerji >= 50) lines.push(L("Biraz yorgunsun ama idare eder."));
  else if (c.enerji >= 30) {
    add('kondisyon', -4);
    lines.push(L("🥵 Kesim seni yordu (kondisyon -4)."));
  } else {
    add('kondisyon', -8);
    add('cene', -3);
    lines.push(L("💀 Vücudun bitik: dudaklar çatlak, gözler çökük (kondisyon -8, çene -3)."));
  }
}

export const cutLimit = (s: GameState) => WEIGHT_CLASSES[s.fighter.siklet].kg;
