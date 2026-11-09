// Ezeli rakip: seni ilk yenen (ya da yenilmezliğine meydan okuyan) dövüşçü kariyer boyunca peşini bırakmaz.
// Seninle birlikte güçlenir, sosyal medyada laf atar, belli aralıklarla karşına çıkar; seriyi 2 farkla alınca
// ya da onu unvan maçında yenince rekabet biter.
import { L } from '../i18n';
import { fullName } from './character';
import { generateOpponent } from './opponents';
import { chance, pick } from './rng';
import { addPost } from './social';
import type { Background, GameState, Opponent } from './types';

export type Nemesis = {
  id: string;
  ad: string;
  soyad: string;
  lakap: string;
  uyruk: string;
  stil: Background;
  kisilik: string;
  /** Aranızdaki seri, onun gözünden: g = seni yendiği, m = sana yenildiği maçlar. */
  g: number;
  m: number;
  b: number;
  /** Son karşılaşmanın (ya da doğuşun) oyuncu dövüş sayısı. */
  son: number;
  kaynak: 'yenilgi' | 'meydan';
  bitti?: boolean;
};

/** Karşılaşmalar arasında en az kaç dövüş olsun; toplam en fazla kaç karşılaşma. */
const ARA = 5;
const MAKS = 4;

const fights = (s: GameState) => s.gecmis.length;
const handle = (n: Nemesis) => `@${`${n.ad}${n.soyad}`.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'rakip'}`;
const name = (n: Nemesis) => `${n.ad} “${n.lakap}” ${n.soyad}`;
/** Rekabeti oyuncu kazanarak mı bitirdi? */
export const nemesisBeaten = (n?: Nemesis) => !!n?.bitti && n.m > n.g;
/** Seri, oyuncunun gözünden: "senin galibiyetlerin-onunkiler". */
export const nemesisScore = (n: Nemesis) => `${n.m}-${n.g}${n.b ? `-${n.b}` : ''}`;

export const activeNemesis = (s: GameState) => (s.ezeli && !s.ezeli.bitti ? s.ezeli : null);

/** Sıradaki teklif listesine girebilir mi? */
export const nemesisDue = (s: GameState) => {
  const n = activeNemesis(s);
  return !!n && fights(s) - n.son >= ARA;
};

function born(s: GameState, o: Opponent, kaynak: Nemesis['kaynak']): Nemesis {
  const n: Nemesis = { id: o.id, ad: o.ad, soyad: o.soyad, lakap: o.lakap, uyruk: o.uyruk, stil: o.stil, kisilik: o.kisilik, g: kaynak === 'yenilgi' ? 1 : 0, m: 0, b: 0, son: fights(s), kaynak };
  s.ezeli = n;
  return n;
}

function post(s: GameState, n: Nemesis, metin: string) {
  addPost(s, { yazar: `${n.ad} ${n.soyad}`, kullanici: handle(n), tur: 'dovuscu', metin, renk: '#b388ff', hedefId: n.id });
}

/** Maç sonrası: ezeli rakiple karşılaşma sonucu, doğuş ya da sosyal medyada laf atma. Satırlar maç sonu raporuna eklenir. */
export function nemesisAfterFight(s: GameState, opp: Opponent, won: boolean, draw: boolean, unvan: boolean): string[] {
  const lines: string[] = [];
  const n = activeNemesis(s);
  if (n && opp.id === n.id) {
    if (won) n.m++;
    else if (draw) n.b++;
    else n.g++;
    n.son = fights(s);
    if (won && (n.m - n.g >= 2 || unvan)) {
      n.bitti = true;
      s.populerlik = Math.min(100, s.populerlik + 5);
      const msg = L("🏁 Rekabet bitti! {0} sonunda kabul etti: \"Sen daha iyiydin, {1}.\" Aranızdaki seri: {2}. Popülerlik +5.", [name(n), s.fighter.ad, nemesisScore(n)]);
      lines.push(msg);
      s.haberler.unshift(msg);
      post(s, n, L("Bugün kafeste daha iyi olan kazandı. Saygılar {0}. Bu rekabet beni daha iyi bir dövüşçü yaptı.", [s.fighter.ad]));
    } else if (n.g + n.m + n.b >= MAKS) {
      // Son karşılaşma: ezeli rakip eldivenleri asar.
      n.bitti = true;
      const msg =
        n.m > n.g
          ? L("🏁 {0} emekliliğini açıkladı: \"Kariyerimdeki en zor rakip sendin, {1}.\" Seriyi sen kazandın: {2}.", [name(n), s.fighter.ad, nemesisScore(n)])
          : L("🏁 {0} emekliliğini açıkladı. Aranızdaki seri: {1}. Onu hiç tam geçemedin; bu hikâye böyle bitti.", [name(n), nemesisScore(n)]);
      lines.push(msg);
      s.haberler.unshift(msg);
    } else if (won) {
      lines.push(L("⚔️ Ezeli rakibin {0} karşısında kazandın! Aranızdaki seri: {1}.", [name(n), nemesisScore(n)]));
      post(s, n, pick([L("Bu gece senin gecendi. Ama bu iş bitmedi, {0}.", [s.fighter.ad]), L("Rövanş istiyorum. Organizasyon duysun!"), L("Şans bir kez güler. Üçüncü maçta görüşürüz.")]));
    } else if (draw) {
      lines.push(L("⚔️ Ezeli rakibinle berabere. Aranızdaki seri: {0}. Kimse tatmin olmadı.", [nemesisScore(n)]));
    } else {
      lines.push(L("⚔️ {0} yine kazandı. Aranızdaki seri: {1}. Bu iş bitmedi.", [name(n), nemesisScore(n)]));
      post(s, n, pick([L("Söylemiştim. Kafeste ne zaman karşılaşsak aynı son. 😏"), L("{0}, bir daha karşıma çıkmadan önce iki kere düşün.", [s.fighter.ad]), L("Bu kafesin sahibi benim. Anlaşıldı mı?")]));
    }
    return lines;
  }
  if (!s.ezeli && !won && !draw) {
    const m = born(s, opp, 'yenilgi');
    const msg = L("🗡️ {0} maçtan sonra mikrofonu aldı: \"Bu daha başlangıç. Kafeste her karşılaştığımızda aynı sonuç olacak.\" Bu isim peşini kolay bırakmayacak: artık bir ezeli rakibin var.", [name(m)]);
    lines.push(msg);
    s.haberler.unshift(msg);
    post(s, m, L("{0} iyi dövüşçü ama bana göre değil. Ne zaman isterse tekrar.", [fullName(s.fighter)]));
    return lines;
  }
  // Yenilmezliğe meydan okuma: profesyonelde 3 maç geçti ve hâlâ ezeli rakip yok.
  if (!s.ezeli && s.stage !== 'amator' && s.rekor.g + s.rekor.m + s.rekor.b >= 3) {
    const o = generateOpponent(s, { zorluk: 1 });
    const m = born(s, o, 'meydan');
    const msg = L("🗡️ {0} kameralara konuştu: \"{1} yenilmez sanılıyor. O balonu ben patlatacağım.\" Yeni bir ezeli rakibin var.", [name(m), fullName(s.fighter)]);
    lines.push(msg);
    s.haberler.unshift(msg);
    post(s, m, L("{0}, kaçamazsın. Sıra bende.", [s.fighter.ad]));
    return lines;
  }
  // Başka bir maç: ezeli rakip seni izliyor.
  if (n && chance(0.4)) {
    const vars = [s.fighter.ad, `${opp.ad} ${opp.soyad}`];
    const t = won
      ? n.g > n.m
        ? pick([L("{1} karşısında kazanmak mı? Onu ben de yenerdim. Asıl sınav benim, {0}.", vars), L("Herkes seni konuşuyor {0}. Ben hâlâ o geceyi hatırlıyorum. 😏", vars)])
        : pick([L("Güzel galibiyet {0}. Ama bir gün yine karşılaşacağız.", vars), L("{0} formda görünüyor. Ben de. Tarih verin.", vars)])
      : pick([L("{1} bile seni yendi. Ben sana söylemiştim, {0}.", vars), L("Kafeste yerin yok, {0}. Bunu en iyi ben biliyorum.", vars)]);
    post(s, n, t);
  }
  return lines;
}

/** Teklif için ezeli rakip: kimliği aynı, gücü senin seviyene göre (o da seninle birlikte gelişti). */
export function nemesisOpponent(s: GameState, title = false): Opponent {
  const n = s.ezeli!;
  const o = generateOpponent(s, { zorluk: 1 });
  const lead = n.g - n.m;
  return {
    ...o,
    id: n.id,
    ad: n.ad,
    soyad: n.soyad,
    lakap: n.lakap,
    uyruk: n.uyruk,
    stil: n.stil,
    kisilik: n.kisilik,
    rivalry: 3 + n.g + n.m,
    karsilasma: n.g + n.m + n.b,
    sonSonuc: n.g + n.m + n.b ? (lead > 0 ? 'M' : lead < 0 ? 'G' : 'B') : undefined,
    etiket: title ? L("🏆 UNVAN SAVUNMASI · EZELİ RAKİP") : L("⚔️ EZELİ RAKİP"),
    riskMetni:
      n.g + n.m + n.b === 0
        ? L("Sana meydan okudu. Kafeste cevap verme zamanı.")
        : L("Aranızdaki seri: {0}. Bu maç kişisel; kazanırsan popülerlik patlar.", [nemesisScore(n)]),
  };
}

/** Teklif listesinin riskli seçeneği yerine ezeli rakip (zamanı geldiyse, %40). */
export function maybeNemesisOffer(s: GameState, title: boolean): Opponent | null {
  if (!nemesisDue(s) || !chance(0.4)) return null;
  return nemesisOpponent(s, title);
}
