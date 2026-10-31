// Basın toplantısı düellosu: rakip üç laf atar (hakaret, övünme, alay), oyuncu süre dolmadan cevap verir.
// En iyi karşılık rakibin mizacına göre değişir: alıngan biri espriyle yıkılır, buz gibi biri sert çıkışla,
// şovmen biri sahneyi kaptırınca. Mizaç ekranda tarif edilir ama tablo verilmez; oyuncu rakibini okur.
import { L } from '../i18n';
import { pick, rand, shuffle } from './rng';
import type { GameState } from './types';

export type JabType = 'hakaret' | 'ovunme' | 'alay';
export type Reply = 'sert' | 'komik' | 'soguk';
export type DuelAnswer = Reply | 'sus';
export type Temper = 'klasik' | 'alingan' | 'buz' | 'sovmen';

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
  /** Rakibin mizacı (eski kayıtlarda yok: klasik) ve ekrandaki tarifi */
  mizac?: Temper;
  tarif?: string;
}

/** Mizaca ve laf türüne göre [en iyi, orta] cevap. Üçüncüsü kötüdür. */
const TABLE: Record<Temper, Record<JabType, [Reply, Reply]>> = {
  klasik: { hakaret: ['komik', 'soguk'], ovunme: ['sert', 'komik'], alay: ['soguk', 'sert'] },
  alingan: { hakaret: ['komik', 'sert'], ovunme: ['komik', 'soguk'], alay: ['sert', 'komik'] },
  buz: { hakaret: ['sert', 'komik'], ovunme: ['komik', 'sert'], alay: ['komik', 'soguk'] },
  sovmen: { hakaret: ['soguk', 'komik'], ovunme: ['soguk', 'sert'], alay: ['komik', 'soguk'] },
};

export const TEMPER_INFO: Record<Temper, { tarif: (ad: string) => string[]; ipucu: () => string }> = {
  klasik: {
    tarif: (ad) => [L("{0} klasik bir laf ustası: bildiği numaraları yapıyor.", [ad]), L("{0} her basında aynı tavırda: biraz ukala, biraz şakacı.", [ad])],
    ipucu: () => L("Klasik laf ustası: hakarete espri, övünmeye sert, alaya soğukkanlı cevap genelde işler."),
  },
  alingan: {
    tarif: (ad) => [L("{0} sert görünüyor ama gülünce yüzü kızarıyor; alıngan biri.", [ad]), L("{0} her espride kaşlarını çatıyor. Dalga geçilmekten hiç hoşlanmıyor.", [ad])],
    ipucu: () => L("Alıngan rakip: onunla dalga geçmek en çok koyan şey. Alaylarına ise sert dur."),
  },
  buz: {
    tarif: (ad) => [L("{0} buz gibi: yüzünde tek bir ifade yok, sakinliğinle onu etkileyemezsin.", [ad]), L("{0} hiç kıpırdamıyor; soğukkanlılığı onu değil seni sıkar.", [ad])],
    ipucu: () => L("Buz gibi rakip: soğukkanlılık ona işlemez. Onu ya sertlikle ya espriyle çöz."),
  },
  sovmen: {
    tarif: (ad) => [L("{0} kameraları seviyor; mikrofonu kimseye bırakmıyor, bir şovmen.", [ad]), L("{0} sahnede oynamaya gelmiş. Ne kadar tepki verirsen o kadar besleniyor.", [ad])],
    ipucu: () => L("Şovmen rakip: tepki onu besler. Sakin kalıp sahneyi elinden al; alayına espriyle karşılık ver."),
  },
};

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
/** Yanlış cevaptan sonra gösterilen ipucu: rakibin mizacına göre. */
export const DUEL_TIP = (d?: Duel) => TEMPER_INFO[d?.mizac ?? 'klasik'].ipucu();

const JABS: Record<JabType, ((ad: string) => string)[]> = {
  hakaret: [
    (ad) => L("{0} mi? Bu kafese değil, kreşe gitmeli.", [ad]),
    () => L("Şu surata bakın: daha önce çok dayak yediği belli."),
    () => L("Onun antrenmanlarını izledim. Annem daha sert vuruyor."),
    () => L("Tek yeteneği basın toplantısında uyumamak."),
    () => L("Bu sporda en parlak yanı ayakkabıları. Gerisi karanlık."),
    (ad) => L("{0} dövüşçü değil, figüran. Ben de başrolüm.", [ad]),
    () => L("Salonunda temizlikçi bile ondan iyi vuruyor, sordum."),
    () => L("Onun için ‘yetenek’ diye bir kelime yok, sadece ‘deneme’ var."),
  ],
  ovunme: [
    () => L("Ben bu sıkletin kralıyım. Onu ilk rauntta uyutacağım, yazın bir kenara."),
    () => L("Bana rakip bulamıyorlar, o yüzden bunu getirdiler."),
    () => L("Kemeri şimdiden evime astım. Bu maç sadece formalite."),
    () => L("Benim ısınmam onun bütün kariyeri kadar sürüyor."),
    () => L("Benim antrenörüm bile beni yenemiyor, bu mu yenecek?"),
    () => L("Organizasyon bu maçı bana tatil olsun diye ayarladı."),
    () => L("Sponsorlarım maçtan sonraki partiyi şimdiden ayarladı."),
    () => L("Tarih kitaplarında adım olacak. Onunki dipnotta bile olmayacak."),
  ],
  alay: [
    (ad) => L("Hahaha! {0} titriyor bakın, ellerine bakın!", [ad]),
    () => L("Kilo verirken ağladığını duydum. Çok tatlı."),
    () => L("Gözlerime bakamıyor bile. Daha şimdiden kaybetti."),
    () => L("Hocası bile onun yerine utanıyor, şu hâline bakın."),
    () => L("Şu kıyafete bakın, düğüne mi geldi dövüşe mi?"),
    () => L("Sesi titriyor. Mikrofonu tutmak bile zor geliyor ona."),
    () => L("Annesi onu buraya bıraktı, maçtan sonra da gelip alacak."),
    () => L("Terlemeye başladı, daha soru bile sormadılar."),
  ],
};

const REPLIES: Record<JabType, Record<Reply, (() => string)[]>> = {
  hakaret: {
    komik: [() => L("Kreş mi? Doğru, cumartesi seni orada bebek gibi uyutacağım."), () => L("Annenle antrenman yapıyorsan bana da numarasını ver, belki bir şey öğrenirim."), () => L("Bu hakaretleri annen mi yazdı? Çok sevimli olmuş."), () => L("Senin espri yazarın kim? Kovulmalı.")],
    soguk: [() => L("Konuş, konuş. Cumartesi gecesi konuşamayacaksın."), () => L("Laflar ucuz. Kafeste görüşürüz."), () => L("Bitirdin mi? Tamam. Cumartesi görüşürüz."), () => L("Bu sözleri kafese kadar taşı bakalım.")],
    sert: [() => L("Bir daha ağzını açarsan burada dağıtırım seni!"), () => L("Kapa çeneni yoksa ben kapatırım!"), () => L("Gel buraya da yüzüme söyle bakalım!"), () => L("O ağız cumartesi kanlı olacak.")],
  },
  ovunme: {
    sert: [() => L("Kral mı? Son üç maçında yere kaç kez düştüğünü sayalım mı?"), () => L("Kemeri evine asmışsın, güzel. Ben gelip alacağım."), () => L("Tatil diyorsun ha? Hastanede güzel bir tatil olur."), () => L("Bu kadar övünen biri kaybedince ne der, merak ediyorum.")],
    komik: [() => L("İlk rauntta uyutacakmış… herhalde bu konuşmasıyla."), () => L("Tarih kitabı mı? Senin adın ancak hatalar sayfasında olur."), () => L("Partiyi iptal et, para iadesini ben öderim."), () => L("Bu kadar övünmek yorucu olmalı, otur biraz.")],
    soguk: [() => L("Tamam. Görürüz."), () => L("Saygı duyuyorum, iyi şanslar."), () => L("Herkes konuşur. Cumartesi kim konuşacak, göreceğiz."), () => L("Hıhı. Devam et.")],
  },
  alay: {
    soguk: [() => L("Gülmeye devam et. Son gülen iyi güler."), () => L("Ellerim titremiyor, sadece seni beklemekten sıkıldılar."), () => L("Gül bakalım. Cumartesi gülecek bir şeyin kalmayacak."), () => L("Tamamdır. Başka?")],
    sert: [() => L("Gülüyor musun? Cumartesi gülemeyeceksin!"), () => L("Bir daha bana gülersen sahnede kavga çıkar!"), () => L("Gülmeyi bırak, dişlerini cumartesi toplayacaksın."), () => L("Yüzümdeki ifadeyi cumartesi sen taşıyacaksın.")],
    komik: [() => L("Hahaha, evet çok komiksin… dur, bunu anneme de anlatayım."), () => L("Titriyorum çünkü burası çok soğuk, senin kariyerin gibi."), () => L("Kıyafetimi beğenmedin mi? Senin cenazen için seçtim."), () => L("Sesim mi titriyor? Seni düşünüp kahkahamı tutuyorum.")],
  },
};

export function createDuel(s: GameState): Duel {
  const ad = s.fighter.soyad;
  const tipler = shuffle<JabType>(['hakaret', 'ovunme', 'alay']);
  const laflar = tipler.map((tip) => ({ tip, metin: pick(JABS[tip])(ad) }));
  const secenekler = laflar.map((l) => shuffle<Reply>(['sert', 'komik', 'soguk']).map((tarz) => ({ tarz, metin: pick(REPLIES[l.tip][tarz])() })));
  const mizac = pick<Temper>(['klasik', 'alingan', 'buz', 'sovmen']);
  const tarif = pick(TEMPER_INFO[mizac].tarif(s.pending.rakip?.soyad ?? L("Rakip")));
  return { laflar, secenekler, cevaplar: [], hava: 0, mizac, tarif };
}

/** Bir turun cevabı. IQ ve popülerlik etkiyi biraz artırır. */
export function answerDuel(s: GameState, d: Duel, a: DuelAnswer) {
  if (d.bitti) return;
  const tip = d.laflar[d.cevaplar.length].tip;
  const [best, mid] = TABLE[d.mizac ?? 'klasik'][tip];
  const karizma = 1 + s.fighter.stats.iq / 400 + s.populerlik / 500;
  let puan: number;
  let derece: 'iyi' | 'orta' | 'kotu' | 'sus';
  if (a === 'sus') {
    puan = -30;
    derece = 'sus';
  } else if (a === best) {
    puan = Math.round(38 * karizma);
    derece = 'iyi';
  } else if (a === mid) {
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
  const [best, mid] = TABLE[d.mizac ?? 'klasik'][tip];
  const r = rand();
  const p = 0.35 + s.fighter.stats.iq / 250;
  return r < p ? best : r < p + (1 - p) / 2 ? mid : (['sert', 'komik', 'soguk'] as Reply[]).find((x) => x !== best && x !== mid)!;
}
