// Hoca diyalogları: rakibin zaafına, güçlü yönüne, geçmişine ve hocanın kalitesine göre değişen cümleler.
// Aynı rakip için ekran yenilendikçe değişmesin diye rakip kimliğine göre sabit seçilir.
import { L, LOC } from '../i18n';
import type { GameState, Opponent, StatKey } from './types';
import { STAT_LABELS } from './types';

function seedOf(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return Math.abs(h);
}
const pickS = <T,>(arr: readonly T[], seed: number, salt: number) => arr[(seed + salt * 7919) % arr.length];

const WEAK: Record<StatKey, string[]> = {
  vurus: [L("{o} ayakta pek tehlikeli değil, elleri yavaş."), L("Vuruşları hafif; onunla takas etmekten korkma."), L("Striking’i zayıf. Onu kafesin ortasında dövüşmeye zorla."), L("Kombinasyon atamıyor, tek tek vuruyor.")],
  cene: [L("Çenesi cam gibi, iki temiz yumruk yeter."), L("Son maçlarında sarsıldı, çenesi güvenilmez."), L("Kafasına ne gelirse sallanıyor. Temiz vuruş ara."), L("Darbe yiyince gardı dağılıyor, orayı zorla.")],
  hiz: [L("Ayakları ağır. Ayak işinle onu kovala."), L("Refleksleri yavaş, açıdan gir çık."), L("Hızın ondan fazla, bunu sonuna kadar kullan."), L("Geç reaksiyon veriyor; feint at, sonra vur.")],
  gures: [L("Takedown savunması delik deşik."), L("Güreşte zayıf, sırtını yere yapıştırırız."), L("Bacaklarına dalınca ne yapacağını bilmiyor."), L("Kafes kenarında ayağa kalkamıyor.")],
  yer: [L("Yerde balık gibi çırpınıyor."), L("Sırtı yere değince paniğe kapılıyor."), L("Jiu-jitsu’su zayıf, yerde onu boğarız."), L("Guard’dan hiçbir tehdit üretmiyor.")],
  kondisyon: [L("İkinci rauntta nefesi kesiliyor."), L("Gazı çabuk bitiyor, tempoyu yüksek tut."), L("Uzun maçlara dayanamıyor, onu derin sulara çek."), L("Üçüncü raunt geldiğinde elleri düşüyor.")],
  iq: [L("Oyun planı yok, sadece dalıyor."), L("Kafası çalışmıyor; ona bir şey göster, başka bir şey vur."), L("Tuzağa kolay düşüyor. Feint’lerle onu oyna."), L("Plan B’si yok. İlk planı bozulunca dağılıyor.")],
};

const STRONG: Record<StatKey, string[]> = {
  vurus: [L("Ama sağ eli dinamit gibi, çeneni koru."), L("Yalnız elleri ağır; takasa uzun süre girme.")],
  cene: [L("Yalnız çenesi taş gibi, tek yumrukla gitmez."), L("Çok dayanıklı; sabırlı ol, erken bitiremeyebiliriz.")],
  hiz: [L("Dikkat et, çok hızlı. Kör takip etme."), L("Ayakları hızlı; köşeye sıkıştırmadan girme.")],
  gures: [L("Ama güreşi çok iyi, sırtını kafese verme."), L("Takedown’ları sert; sprawl’ını hazırla.")],
  yer: [L("Yerde tehlikeli; onun guard’ına düşme."), L("Submission avcısı, yerde kollarını sakla.")],
  kondisyon: [L("Yalnız hiç yorulmuyor, 15 dakika koşar."), L("Kondisyon canavarı; kendi temponu kontrol et.")],
  iq: [L("Akıllı dövüşçü; aynı şeyi iki kez yapma."), L("Seni okumaya çalışacak, sürekli değiştir.")],
};

const OPEN_LOW = [L("Bak evlat,"), L("Dinle beni,"), L("Kafama göre konuşuyorum ama"), L("Ben eski usul adamım:")];
const OPEN_MID = [L("Videolarını izledim."), L("Son üç maçına baktım."), L("Adamı çözdüm sayılır."), L("Kâğıt üstünde şöyle:")];
const OPEN_HIGH = [L("Analiz ekibi raporu hazırladı."), L("Verilere göre net bir tablo var."), L("Tüm dövüşlerini kare kare inceledik."), L("Scout raporu elimde.")];

const CLOSE = [
  L("{plan} ile gidersek plan tam oturur."),
  L("Planımız net: {plan}."),
  L("Bence {plan}. Başka bir şey düşünmüyorum."),
  L("{plan} diyorum, gerisini sen halledersin."),
  L("Kafamda tek plan var: {plan}."),
  L("Bu rakibi {plan} ile yeneriz, yazıyorum."),
];

const INTRO = [
  L("“Bu rakibi nasıl yeneceğiz?”"),
  L("“Tahtaya planı çizelim.”"),
  L("“Otur, video izleyeceğiz.”"),
  L("“Kafes bir satranç tahtası. Hamlemizi seçelim.”"),
  L("“Kimse yenilmez değildir. Onun açığını bulduk.”"),
  L("“Kamp buna göre şekillenecek. İyi düşün.”"),
];

export function coachIntro(s: GameState, o: Opponent) {
  return `${s.takim.antrenor}: ${pickS(INTRO, seedOf(o.id), 1)}`;
}

/** Plan önerisi: 2-4 cümlelik, rakibe özel hoca konuşması. */
export function coachPlanAdvice(s: GameState, o: Opponent, weak: StatKey, strong: StatKey, planAd: string, ikinci?: string) {
  const seed = seedOf(o.id);
  const q = s.takim.antrenorKalite;
  const open = pickS(q <= 3 ? OPEN_LOW : q >= 8 ? OPEN_HIGH : OPEN_MID, seed, 2);
  const parts = [open, pickS(WEAK[weak], seed, 3).replace('{o}', o.soyad)];
  if (o.karsilasma > 0) parts.push(pickS([L("Bu rakiple daha önce dövüştük, onu tanıyoruz."), L("Geçen sefer ne yaptığını hatırlıyorsun, tekrarlamayacak.")], seed, 4));
  if (o.champion) parts.push(pickS([L("Kemeri boşuna taşımıyor."), L("Şampiyon ama o da insan.")], seed, 5));
  else if (o.rekor.m === 0 && o.rekor.g >= 5) parts.push(pickS([L("Hiç yenilmemiş; ilk yenilgisini biz verelim."), L("Yenilmezlik havası var, onu delmek bize düşer.")], seed, 5));
  if (strong !== weak) parts.push(pickS(STRONG[strong], seed, 6));
  const close = pickS(CLOSE, seed, 7).replace('{plan}', `«${planAd}»`);
  parts.push(ikinci ? L("{0} {1} «{2}» da işe yarar.", [close, pickS([L("Gerekirse"), L("B planı olarak")], seed, 8), ikinci]) : close);
  return parts.join(' ');
}

/** Zaafa uyan plan yoksa: oyuncunun güçlü yönüne göre öneri. */
export function coachNoFit(s: GameState, o: Opponent, myBest: StatKey) {
  const seed = seedOf(o.id);
  return pickS(
    [
      L("Belirgin bir açığı yok. O zaman kendi oyunumuzu oynarız: senin {0} farkın bizim silahımız.", [STAT_LABELS[myBest].toLocaleLowerCase(LOC)]),
      L("Komple dövüşçü. Onu kendi alanımıza çekelim, {0} ile üstün gel.", [STAT_LABELS[myBest].toLocaleLowerCase(LOC)]),
      L("Kâğıt üstünde denk. Maçı detaylar kazandıracak."),
    ],
    seed,
    9,
  );
}
