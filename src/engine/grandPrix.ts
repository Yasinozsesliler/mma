// Yükseliş Grand Prix'i: amatörde 2. maçtan sonra (kariyerde bir kez) gelen 8 kişilik eleme turnuvası (çeyrek final,
// yarı final, final). Profesyonelliğe giden yolda vitrin: şampiyon ve finalist doğrudan profesyonel teklif alır.
// Oyuncunun maçları normal dövüş akışında oynanır; diğer eşleşmeler güç ortalamasına göre simüle edilir.
import { L as tL, LOC } from '../i18n';
import { currentOrg, statAverage } from './character';
import { ORGS, WEIGHT_CLASSES } from './data';
import { ensureDivision } from './division';
import { generateOpponent } from './opponents';
import { chance, shuffle } from './rng';
import type { GameState, Opponent, OrgId } from './types';

export const GP_PLAYER = 'oyuncu';

export interface GrandPrix {
  org: OrgId;
  /** 8 katılımcı (ilk sıra oyuncu: id 'oyuncu'); her tur sonunda kazananların id'leri */
  kisiler: { id: string; ad: string; soyad: string; guc: number }[];
  rakipler: Opponent[];
  turlar: string[][];
  elendi?: boolean;
  bitti?: boolean;
  sampiyon?: string;
  odul: number;
  /** Amatör Yükseliş Grand Prix'i (eski kayıtlarda profesyonel turnuvalar da olabilir) */
  yukselis?: boolean;
  /** Oyuncunun elendiği tur (0 çeyrek, 1 yarı, 2 final) */
  elendiTur?: number;
  /** Turnuva sonrası profesyonel teklifler açıldı */
  teklifVerildi?: boolean;
}

/** Yükseliş Grand Prix'i ödülü (amatörde ücret yok; kupa parası sabit) */
const YUKSELIS_ODUL = 5000;

export const ROUND_NAME = () => [tL("ÇEYREK FİNAL"), tL("YARI FİNAL"), tL("FİNAL")];

/** Dövüşten sonra: amatörde 2. maçtan sonra Yükseliş Grand Prix'i daveti (kariyerde bir kez; davet bir maç geçerli). */
export function maybeGpInvite(s: GameState) {
  if (s.gp && !s.gp.bitti) return;
  if (s.gpDavet && s.gpDavet.dovus === s.gecmis.length) return;
  s.gpDavet = undefined;
  if (s.stage !== 'amator' || s.gpTeklif || s.gpSon != null) return;
  if (s.amator.g + s.amator.m + s.amator.b < 2) return;
  s.gpTeklif = true;
  s.gpDavet = { dovus: s.gecmis.length, odul: YUKSELIS_ODUL };
  s.haberler.unshift(tL("🏆 Yükseliş Grand Prix'i daveti geldi! 8 amatör, tek kupa: şampiyon ve finalist profesyonel kapıyı açar."));
}

export function declineGp(s: GameState) {
  s.gpDavet = undefined;
}

export function acceptGp(s: GameState) {
  const d = s.gpDavet;
  if (!d) return;
  s.gpDavet = undefined;
  ensureDivision(s);
  const org = currentOrg(s);
  // Üst sıralar unvan yarışında; turnuvaya sıralamanın alt üçte ikisi katılır
  const liste = s.bolum?.liste ?? [];
  const pool = shuffle(liste.slice(Math.floor(liste.length / 3))).slice(0, 7);
  while (pool.length < 7) pool.push(generateOpponent(s, { zorluk: 0 }, pool));
  const rakipler = pool.map((o) => ({ ...o, stats: { ...o.stats } }));
  const kisiler = [
    { id: GP_PLAYER, ad: s.fighter.ad, soyad: s.fighter.soyad, guc: statAverage(s.fighter.stats) },
    ...rakipler.map((o) => ({ id: o.id, ad: o.ad, soyad: o.soyad, guc: statAverage(o.stats) })),
  ];
  const yukselis = org === 'amator';
  s.gp = { org, kisiler, rakipler, turlar: [], odul: d.odul, yukselis };
  s.gpSon = s.gecmis.length;
  s.haberler.unshift(yukselis ? tL("🏆 Yükseliş Grand Prix'ine katıldın: 8 amatör, üç maç. Profesyonel organizasyonlar izliyor.") : tL("🏆 Grand Prix'ye katıldın: 8 dövüşçü, tek kemer gibi tek kupa."));
}

/** Şu anki turda oyuncunun eşleşmesinin rakibi (sıra: tur başındaki listede yan yana olanlar). */
function bracket(gp: GrandPrix, tur: number): string[] {
  return tur === 0 ? gp.kisiler.map((k) => k.id) : gp.turlar[tur - 1];
}

export function gpCurrentOpponent(s: GameState): Opponent | null {
  const gp = s.gp;
  if (!gp || gp.elendi || gp.bitti) return null;
  const tur = gp.turlar.length;
  const ids = bracket(gp, tur);
  const i = ids.indexOf(GP_PLAYER);
  if (i < 0) return null;
  const oppId = ids[i % 2 === 0 ? i + 1 : i - 1];
  const o = gp.rakipler.find((x) => x.id === oppId);
  if (!o) return null;
  return { ...o, stats: { ...o.stats }, zorluk: 1, etiket: `🏆 GRAND PRIX · ${ROUND_NAME()[tur]}`, riskMetni: tL("Kaybedersen turnuva biter. Kazanırsan kupaya bir adım daha yaklaşırsın.") };
}

const pickWinner = (gp: GrandPrix, a: string, b: string) => {
  const ga = gp.kisiler.find((k) => k.id === a)!.guc;
  const gb = gp.kisiler.find((k) => k.id === b)!.guc;
  return chance(0.5 + (ga - gb) / 40) ? a : b;
};

function simulateRound(gp: GrandPrix, playerWon: boolean | null) {
  const ids = bracket(gp, gp.turlar.length);
  const next: string[] = [];
  for (let i = 0; i < ids.length; i += 2) {
    const [a, b] = [ids[i], ids[i + 1]];
    if (a === GP_PLAYER || b === GP_PLAYER) {
      const other = a === GP_PLAYER ? b : a;
      next.push(playerWon ? GP_PLAYER : other);
    } else next.push(pickWinner(gp, a, b));
  }
  gp.turlar.push(next);
}

/** Dövüş sonucu turnuvaya işlenir (bu dövüş Grand Prix maçıysa). */
export function gpAfterFight(s: GameState, opp: Opponent, won: boolean): string[] {
  const gp = s.gp;
  if (!gp || gp.elendi || gp.bitti) return [];
  const ids = bracket(gp, gp.turlar.length);
  if (!ids.includes(opp.id) || !ids.includes(GP_PLAYER)) return [];
  const tur = gp.turlar.length;
  simulateRound(gp, won);
  const lines: string[] = [];
  if (!won) {
    gp.elendi = true;
    gp.elendiTur = tur;
    while (gp.turlar.length < 3) simulateRound(gp, null);
    gp.bitti = true;
    gp.sampiyon = gp.turlar[2][0];
    const ch = gp.kisiler.find((k) => k.id === gp.sampiyon);
    lines.push(tL("🏆 Grand Prix'de {0} turunda elendin. Kupayı {1} kaldırdı.", [ROUND_NAME()[tur].toLocaleLowerCase(LOC), ch ? `${ch.ad} ${ch.soyad}` : '?']));
    return lines;
  }
  if (gp.turlar.length >= 3) {
    gp.bitti = true;
    gp.sampiyon = GP_PLAYER;
    s.para += gp.odul;
    s.populerlik = Math.min(100, s.populerlik + 8);
    const title = gp.yukselis
      ? tL("Yükseliş Grand Prix'i Şampiyonu ({0})", [WEIGHT_CLASSES[s.fighter.siklet].ad])
      : tL("{0} {1} Grand Prix Şampiyonu", [ORGS[gp.org].kisa, WEIGHT_CLASSES[s.fighter.siklet].ad]);
    s.unvanlar.push(title);
    s.haberler.unshift(tL("🏆 {0}, {1} oldu! Ödül: ${2}", [s.fighter.soyad, title, gp.odul.toLocaleString(LOC)]));
    lines.push(tL("🏆 GRAND PRIX ŞAMPİYONU! Ödül ${0}, popülerlik +8.", [gp.odul.toLocaleString(LOC)]));
  } else lines.push(tL("🏆 Grand Prix: {0} kazanıldı! Sıradaki: {1}.", [ROUND_NAME()[tur].toLocaleLowerCase(LOC), ROUND_NAME()[tur + 1].toLocaleLowerCase(LOC)]));
  return lines;
}

/** Turnuva maçını reddetmek turnuvadan çekilmektir. */
export function withdrawGp(s: GameState) {
  const gp = s.gp;
  if (!gp || gp.bitti) return;
  gp.elendi = true;
  while (gp.turlar.length < 3) simulateRound(gp, false);
  gp.bitti = true;
  gp.sampiyon = gp.turlar[2][0];
  s.populerlik = Math.max(0, s.populerlik - 4);
  s.haberler.unshift(tL("🏳️ Grand Prix'den çekildin. Taraftarlar hayal kırıklığında (popülerlik -4)."));
}

/** Biten turnuvanın kartını ana ekrandan kaldır. */
export function closeGp(s: GameState) {
  if (s.gp?.bitti) s.gp = undefined;
}
