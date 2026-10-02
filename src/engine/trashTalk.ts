// Basın toplantısı düellosu: rakip üç laf atar (hakaret, övünme, alay), oyuncu süre dolmadan cevap verir.
// Her laf türünün en iyi karşılığı vardır: hakarete espri, övünmeye sert cevap, alaya soğukkanlılık.
import { L } from '../i18n';
import { pick, rand, shuffle } from './rng';
import type { GameState } from './types';

export type JabType = 'hakaret' | 'ovunme' | 'alay';
export type Reply = 'sert' | 'komik' | 'soguk';
export type DuelAnswer = Reply | 'sus';

export interface Duel {
  /** Rakibin sırayla attığı laflar */
  laflar: { tip: JabType; metin: string }[];
  /** Her tur için oyuncunun cevap seçenekleri (üç tarz, karışık sırada) */
  secenekler: { tarz: Reply; metin: string }[][];
  cevaplar: DuelAnswer[];
  /** Her turun derecesi (ekrandaki tur noktaları için) */
  dereceler?: ('iyi' | 'orta' | 'kotu' | 'sus')[];
  /** Salonun havası: -100 (rakip) … +100 (sen) */
  hava: number;
  /** Son cevabın etkisi (ekranda tepki) */
  son?: { puan: number; derece: 'iyi' | 'orta' | 'kotu' | 'sus' };
  bitti?: boolean;
}

/** Laf türüne göre en iyi ve orta cevap. Üçüncüsü kötüdür. */
const BEST: Record<JabType, Reply> = { hakaret: 'komik', ovunme: 'sert', alay: 'soguk' };
const MID: Record<JabType, Reply> = { hakaret: 'soguk', ovunme: 'komik', alay: 'sert' };

export const JAB_LABEL: Record<JabType, () => string> = {
  hakaret: () => L("Hakaret"),
  ovunme: () => L("Övünme"),
  alay: () => L("Alay"),
};
export const REPLY_LABEL: Record<Reply, () => string> = {
  sert: () => L("Sert"),
  komik: () => L("Komik"),
  soguk: () => L("Soğukkanlı"),
};
export const DUEL_TIP = () => L("İpucu: Hakarete espriyle, övünmeye sert, alaya soğukkanlı cevap ver.");

const JABS: Record<JabType, ((ad: string) => string)[]> = {
  hakaret: [
    (ad) => L("{0} mi? Bu kafese değil, kreşe gitmeli.", [ad]),
    () => L("Şu surata bakın: daha önce çok dayak yediği belli."),
    () => L("Onun antrenmanlarını izledim. Annem daha sert vuruyor."),
    () => L("Tek yeteneği basın toplantısında uyumamak."),
  ],
  ovunme: [
    () => L("Ben bu sıkletin kralıyım. Onu ilk rauntta uyutacağım, yazın bir kenara."),
    () => L("Bana rakip bulamıyorlar, o yüzden bunu getirdiler."),
    () => L("Kemeri şimdiden evime astım. Bu maç sadece formalite."),
    () => L("Benim ısınmam onun bütün kariyeri kadar sürüyor."),
  ],
  alay: [
    (ad) => L("Hahaha! {0} titriyor bakın, ellerine bakın!", [ad]),
    () => L("Kilo verirken ağladığını duydum. Çok tatlı."),
    () => L("Gözlerime bakamıyor bile. Daha şimdiden kaybetti."),
    () => L("Hocası bile onun yerine utanıyor, şu hâline bakın."),
  ],
};

const REPLIES: Record<JabType, Record<Reply, (() => string)[]>> = {
  hakaret: {
    komik: [() => L("Kreş mi? Doğru, cumartesi seni orada bebek gibi uyutacağım."), () => L("Annenle antrenman yapıyorsan bana da numarasını ver, belki bir şey öğrenirim.")],
    soguk: [() => L("Konuş, konuş. Cumartesi gecesi konuşamayacaksın."), () => L("Laflar ucuz. Kafeste görüşürüz.")],
    sert: [() => L("Bir daha ağzını açarsan burada dağıtırım seni!"), () => L("Kapa çeneni yoksa ben kapatırım!")],
  },
  ovunme: {
    sert: [() => L("Kral mı? Son üç maçında yere kaç kez düştüğünü sayalım mı?"), () => L("Kemeri evine asmışsın, güzel. Ben gelip alacağım.")],
    komik: [() => L("İlk rauntta uyutacakmış… herhalde bu konuşmasıyla.")],
    soguk: [() => L("Tamam. Görürüz."), () => L("Saygı duyuyorum, iyi şanslar.")],
  },
  alay: {
    soguk: [() => L("Gülmeye devam et. Son gülen iyi güler."), () => L("Ellerim titremiyor, sadece seni beklemekten sıkıldılar.")],
    sert: [() => L("Gülüyor musun? Cumartesi gülemeyeceksin!"), () => L("Bir daha bana gülersen sahnede kavga çıkar!")],
    komik: [() => L("Hahaha, evet çok komiksin… dur, bunu anneme de anlatayım."), () => L("Titriyorum çünkü burası çok soğuk, senin kariyerin gibi.")],
  },
};

export function createDuel(s: GameState): Duel {
  const ad = s.fighter.soyad;
  const tipler = shuffle<JabType>(['hakaret', 'ovunme', 'alay']);
  const laflar = tipler.map((tip) => ({ tip, metin: pick(JABS[tip])(ad) }));
  const secenekler = laflar.map((l) => shuffle<Reply>(['sert', 'komik', 'soguk']).map((tarz) => ({ tarz, metin: pick(REPLIES[l.tip][tarz])() })));
  return { laflar, secenekler, cevaplar: [], hava: 0 };
}

/** Bir turun cevabı. IQ ve popülerlik etkiyi biraz artırır. */
export function answerDuel(s: GameState, d: Duel, a: DuelAnswer) {
  if (d.bitti) return;
  const tip = d.laflar[d.cevaplar.length].tip;
  const karizma = 1 + s.fighter.stats.iq / 400 + s.populerlik / 500;
  let puan: number;
  let derece: 'iyi' | 'orta' | 'kotu' | 'sus';
  if (a === 'sus') {
    puan = -30;
    derece = 'sus';
  } else if (a === BEST[tip]) {
    puan = Math.round(38 * karizma);
    derece = 'iyi';
  } else if (a === MID[tip]) {
    puan = Math.round(10 * karizma);
    derece = 'orta';
  } else {
    puan = -24;
    derece = 'kotu';
  }
  d.hava = Math.max(-100, Math.min(100, d.hava + puan));
  d.son = { puan, derece };
  (d.dereceler ??= []).push(derece);
  d.cevaplar.push(a);
  if (d.cevaplar.length >= d.laflar.length) d.bitti = true;
}

export type DuelOutcome = 'kazandi' | 'berabere' | 'kaybetti';
export const duelOutcome = (d: Duel): DuelOutcome => (d.hava >= 30 ? 'kazandi' : d.hava <= -20 ? 'kaybetti' : 'berabere');

/** Simülasyon ve "otomatik" için: IQ'ya göre doğru cevabı bulma olasılığı. */
export function autoAnswer(s: GameState, d: Duel): Reply {
  const tip = d.laflar[d.cevaplar.length].tip;
  const r = rand();
  const p = 0.35 + s.fighter.stats.iq / 250;
  return r < p ? BEST[tip] : r < p + (1 - p) / 2 ? MID[tip] : (['sert', 'komik', 'soguk'] as Reply[]).find((x) => x !== BEST[tip] && x !== MID[tip])!;
}
