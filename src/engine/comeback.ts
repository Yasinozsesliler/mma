// Emeklilikten dönüş: emekli olduktan bir-üç yıl sonra "son bir dans" teklifi gelir. Kabul edersen yaşlanmış ve
// paslanmış olarak, iki maçlık bir kontratla geri dönersin. İlk maç büyük maç sayılır (hype); kazanırsan efsane
// geri dönmüş olur, kaybedersen hüzünlü bir veda. Kariyerde yalnızca bir kez.
import { L, LOC } from '../i18n';
import { addStat, fullName } from './character';
import { ORGS } from './data';
import { ensureDivision } from './division';
import { vacateOrg } from './legacy';
import { clamp } from './rng';
import { STAT_KEYS, type GameState, type OrgId } from './types';

export interface ComebackOffer {
  yil: number;
  org: OrgId;
  ucret: number;
  metin: string;
}

const hash = (t: string) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const everIn = (s: GameState, org: OrgId) => s.gecmis.some((g) => g.org === org);

/** Emeklilik ekranındaki teklif (rastgelelik yok: aynı kariyer için hep aynı). */
export function comebackOffer(s: GameState): ComebackOffer | null {
  if (s.phase !== 'emeklilik' || s.geriDonus || s.meydanBitti) return null;
  if (s.gecmis.filter((g) => g.org !== 'amator').length < 5) return null;
  if ((s.beyin ?? 0) >= 90) return null;
  const yil = 1 + (hash(`${s.fighter.ad}${s.fighter.soyad}${s.gecmis.length}`) % 3);
  if (s.fighter.yas + yil > 44) return null;
  const org: OrgId = everIn(s, 'ufc') && s.populerlik >= 35 ? 'ufc' : s.populerlik >= 45 ? 'mvp' : everIn(s, 'pfl') || everIn(s, 'one') ? 'pfl' : 'cfc';
  const [lo, hi] = ORGS[org].ucret;
  const ucret = Math.round((((lo + hi) / 2) * (1 + s.populerlik / 200) * 1.3) / 100) * 100;
  const metin =
    org === 'ufc'
      ? L("Dean Wyatt bizzat aradı: \"Hayranlar seni özledi. Bir ana maç, büyük bir çek. Ne dersin?\"")
      : org === 'mvp'
        ? L("VIP MMA servet teklif ediyor: \"Efsanenin dönüşü\" diye bir gece kurmak istiyorlar.")
        : L("{0} arıyor: \"Seyircimiz seni bir kez daha görmek istiyor.\"", [ORGS[org].ad]);
  return { yil, org, ucret, metin };
}

export function acceptComeback(s: GameState) {
  const o = comebackOffer(s);
  if (!o) return;
  const f = s.fighter;
  f.yas += o.yil;
  s.hafta += o.yil * 52;
  // Pas: her şey biraz, hız ve kondisyon daha çok düşer
  STAT_KEYS.forEach((k) => addStat(f.stats, k, -Math.round(o.yil * (k === 'hiz' || k === 'kondisyon' ? 2.5 : 1.2))));
  s.saglik = 100;
  s.sakatliklar = [];
  s.beyin = clamp((s.beyin ?? 0) - 3 * o.yil, 0, 100);
  s.beyinUyari = undefined;
  (s.kemerler ?? []).forEach((b) => b.aktif && vacateOrg(s, b.org));
  s.contract = { org: o.org, kalan: 2, ucret: o.ucret, bonus: o.ucret, munhasir: true };
  s.stage = ORGS[o.org].stage;
  s.rank = null;
  s.sampiyon = false;
  s.savunma = 0;
  s.seri = 0;
  s.rakipler.forEach((r) => (r.champion = false));
  s.bolum = null;
  ensureDivision(s);
  s.geriDonus = { yil: o.yil, dovus: s.gecmis.length };
  s.pending = {};
  s.phase = 'hub';
  s.haberler.unshift(L("🔥 {0} yıl sonra {1} geri dönüyor! {2} ile 2 maçlık kontrat (${3}).", [o.yil, fullName(f), ORGS[o.org].kisa, o.ucret.toLocaleString(LOC)]));
}

/** Dönüş maçı: geri döndükten sonraki ilk maç mı? */
export const isComebackFight = (s: GameState) => !!s.geriDonus && s.geriDonus.dovus === s.gecmis.length;

/** Dövüş sonrası (finishFight'ta, karneye işlendikten sonra çağrılır). */
export function comebackAfter(s: GameState, won: boolean): string[] {
  const g = s.geriDonus;
  if (!g || g.dovus !== s.gecmis.length - 1 || g.sonuc) return [];
  g.sonuc = won ? 'G' : 'M';
  if (won) {
    s.populerlik = clamp(s.populerlik + 10, 0, 100);
    s.haberler.unshift(L("🔥 EFSANE GERİ DÖNDÜ! {0}, {1} yıllık aradan sonra kafese galibiyetle döndü.", [fullName(s.fighter), g.yil]));
    return [L("🔥 DÖNÜŞ ZAFERİ! Yıllar sonra hâlâ buradasın. Popülerlik +10.")];
  }
  s.haberler.unshift(L("💔 {0} dönüş maçını kaybetti. Seyirci yine de ayakta alkışladı.", [fullName(s.fighter)]));
  return [L("💔 Dönüş planladığın gibi gitmedi. Ama seyirci seni ayakta alkışladı.")];
}
