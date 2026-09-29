// Oyun durumundan paylaşım kartı içeriği üretir (seçili dilde).
import { currentOrg } from '../engine/character';
import { ORGS, WEIGHT_CLASSES } from '../engine/data';
import { activeBelts, champLabel, legacyScore } from '../engine/legacy';
import type { GameState } from '../engine/types';
import { wikiOf } from '../engine/wiki';
import { L, LOC } from '../i18n';
import { upName } from '../ui/components';
import type { ShareCardData } from './types';

const up = (s: string) => s.toLocaleUpperCase(LOC);
const rec = (s: GameState) => `${s.rekor.g}-${s.rekor.m}-${s.rekor.b}`;
const MESAJ = () => L("Kafesten Kemere · Kendi dövüş efsaneni yaz");

function base(s: GameState) {
  const f = s.fighter;
  return { ad: `${f.ad} ${f.soyad}`, adBuyuk: upName(`${f.ad} ${f.soyad}`, f.uyruk), lakap: f.lakap, look: f.gorunum, mesaj: MESAJ() };
}

/** Kemer kazanma / savunma / çift kemer anı. */
export function beltCard(s: GameState): ShareCardData | null {
  const k = s.kutlama;
  if (!k) return null;
  const sayi = activeBelts(s).filter((b) => b.org === k.org).length;
  const belt = (s.kemerler ?? []).find((b) => b.org === k.org && b.siklet === k.siklet);
  const baslik = k.tur === 'cift' ? `🏆🏆 ${champLabel(sayi).en}!` : k.tur === 'savunma' ? `🏆 ${L("KEMER KORUNDU!")}` : `🏆 ${L("YENİ ŞAMPİYON!")}`;
  const yil = Math.max(1, Math.round(s.hafta / 52));
  return {
    ...base(s),
    tur: 'kemer',
    baslik,
    ust: up(L("{0} {1} Sıklet Şampiyonu", [ORGS[k.org].kisa, WEIGHT_CLASSES[k.siklet].ad])),
    kutular: [
      [L("REKOR"), rec(s)],
      [L("YAŞ"), String(s.fighter.yas)],
      [L("SAVUNMA"), String(belt?.savunma ?? 0)],
    ],
    alt: L("{0} sokaklarından çıktı, {1} yılda kemere uzandı. Sıradaki kim?", [s.fighter.memleket, yil]),
    kemer: { org: k.org, siklet: k.siklet },
  };
}

/** Kazanılan dövüş (bitirişse daha gösterişli başlık). */
export function winCard(s: GameState): ShareCardData | null {
  const ps = s.pending.sonrasi;
  const o = ps?.ozet;
  if (!ps || !o || !ps.kazandi) return null;
  const kod = o.kod.toUpperCase();
  const baslik = kod === 'KO' || kod === 'TKO' ? `💥 ${L("NAKAVT!")}` : kod === 'SUB' ? `🔒 ${L("SUBMISSION!")}` : `✅ ${L("ZAFER!")}`;
  return {
    ...base(s),
    tur: kod === 'KO' || kod === 'TKO' || kod === 'SUB' ? 'bitiris' : 'galibiyet',
    baslik,
    ust: up(L("{0} · {1}. RAUNT · {2}", [ORGS[o.org].kisa, o.raunt, o.sure])),
    kutular: [
      [L("REKOR"), o.rekor],
      [L("RAKİP"), o.rakip.split(' ').slice(-1)[0]],
      [L("YAŞ"), String(s.fighter.yas)],
    ],
    alt: L("{0} karşısında: {1}.", [o.rakip, o.yontem]),
  };
}

/** Kariyer özeti: profil, emeklilik ve Hall of Fame. */
export function careerCard(s: GameState): ShareCardData {
  const kemer = (s.kemerler ?? []).length;
  const org = ORGS[currentOrg(s)];
  const baslik = s.hof ? `🏛 ${L("HALL OF FAME")}` : s.phase === 'emeklilik' ? L("SON GONG") : L("KARİYER KARTI");
  return {
    ...base(s),
    tur: 'kariyer',
    baslik,
    ust: up(`${org.kisa} · ${L("{0} Sıklet", [WEIGHT_CLASSES[s.fighter.siklet].ad])}`),
    kutular: [
      [L("REKOR"), rec(s)],
      [L("KEMER"), String(kemer)],
      [L("EFSANE PUANI"), String(legacyScore(s))],
    ],
    alt: L("{0} sokaklarından çıktı; {1} yaşında {2} galibiyete ulaştı, {3} bitiriş.", [s.fighter.memleket, s.fighter.yas, s.rekor.g, s.rekor.ko + s.rekor.sub]),
  };
}

/** Kafespedia sayfasının paylaşım kartı. */
export function wikiCard(s: GameState): ShareCardData {
  const w = wikiOf(s);
  return {
    ...base(s),
    tur: 'wiki',
    baslik: w.baslik,
    ust: '',
    kutular: [],
    alt: '',
    mesaj: L("Kafespedia · Kendi dövüş efsaneni yaz"),
    wiki: { ozet: w.ozet, bilgi: w.bilgi.slice(0, 9) },
  };
}
