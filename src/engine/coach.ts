// Hoca diyalogları: rakibin zaafına, güçlü yönüne, geçmişine ve hocanın kalitesine göre değişen cümleler.
// Aynı rakip için ekran yenilendikçe değişmesin diye rakip kimliğine göre sabit seçilir.
import type { GameState, Opponent, StatKey } from './types';
import { STAT_LABELS } from './types';

function seedOf(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return Math.abs(h);
}
const pickS = <T,>(arr: readonly T[], seed: number, salt: number) => arr[(seed + salt * 7919) % arr.length];

const WEAK: Record<StatKey, string[]> = {
  vurus: ['{o} ayakta pek tehlikeli değil, elleri yavaş.', 'Vuruşları hafif; onunla takas etmekten korkma.', 'Striking’i zayıf. Onu kafesin ortasında dövüşmeye zorla.', 'Kombinasyon atamıyor, tek tek vuruyor.'],
  cene: ['Çenesi cam gibi, iki temiz yumruk yeter.', 'Son maçlarında sarsıldı, çenesi güvenilmez.', 'Kafasına ne gelirse sallanıyor. Temiz vuruş ara.', 'Darbe yiyince gardı dağılıyor, orayı zorla.'],
  hiz: ['Ağır adam. Ayak işinle onu kovala.', 'Refleksleri yavaş, açıdan gir çık.', 'Hızın ondan fazla, bunu sonuna kadar kullan.', 'Geç reaksiyon veriyor; feint at, sonra vur.'],
  gures: ['Takedown savunması delik deşik.', 'Güreşte zayıf, sırtını yere yapıştırırız.', 'Bacaklarına dalınca ne yapacağını bilmiyor.', 'Kafes kenarında ayağa kalkamıyor.'],
  yer: ['Yerde balık gibi çırpınıyor.', 'Sırtı yere değince paniğe kapılıyor.', 'Jiu-jitsu’su zayıf, yerde onu boğarız.', 'Guard’dan hiçbir tehdit üretmiyor.'],
  kondisyon: ['İkinci rauntta nefesi kesiliyor.', 'Gazı çabuk bitiyor, tempoyu yüksek tut.', 'Uzun maçlara dayanamıyor, onu derin sulara çek.', 'Üçüncü raunt geldiğinde elleri düşüyor.'],
  iq: ['Oyun planı yok, sadece dalıyor.', 'Kafası çalışmıyor; ona bir şey göster, başka bir şey vur.', 'Tuzağa kolay düşüyor. Feint’lerle onu oyna.', 'Plan B’si yok. İlk planı bozulunca dağılıyor.'],
};

const STRONG: Record<StatKey, string[]> = {
  vurus: ['Ama sağ eli dinamit gibi, çeneni koru.', 'Yalnız elleri ağır; takasa uzun süre girme.'],
  cene: ['Yalnız çenesi taş gibi, tek yumrukla gitmez.', 'Dayanıklı adam; sabırlı ol, erken bitiremeyebiliriz.'],
  hiz: ['Dikkat et, çok hızlı. Kör takip etme.', 'Ayakları hızlı; köşeye sıkıştırmadan girme.'],
  gures: ['Ama güreşi çok iyi, sırtını kafese verme.', 'Takedown’ları sert; sprawl’ını hazırla.'],
  yer: ['Yerde tehlikeli; onun guard’ına düşme.', 'Submission avcısı, yerde kollarını sakla.'],
  kondisyon: ['Yalnız hiç yorulmuyor, 15 dakika koşar.', 'Kondisyon canavarı; kendi temponu kontrol et.'],
  iq: ['Akıllı dövüşçü; aynı şeyi iki kez yapma.', 'Seni okumaya çalışacak, sürekli değiştir.'],
};

const OPEN_LOW = ['Bak evlat,', 'Dinle beni,', 'Kafama göre konuşuyorum ama', 'Ben eski usul adamım:'];
const OPEN_MID = ['Videolarını izledim.', 'Son üç maçına baktım.', 'Adamı çözdüm sayılır.', 'Kâğıt üstünde şöyle:'];
const OPEN_HIGH = ['Analiz ekibi raporu hazırladı.', 'Verilere göre net bir tablo var.', 'Tüm dövüşlerini kare kare inceledik.', 'Scout raporu elimde.'];

const CLOSE = [
  '{plan} ile gidersek plan tam oturur.',
  'Planımız net: {plan}.',
  'Bence {plan}. Başka bir şey düşünmüyorum.',
  '{plan} diyorum, gerisini sen halledersin.',
  'Kafamda tek plan var: {plan}.',
  'Bu adamı {plan} ile yeneriz, yazıyorum.',
];

const INTRO = [
  '“Bu adamı nasıl yeneceğiz?”',
  '“Tahtaya planı çizelim.”',
  '“Otur, video izleyeceğiz.”',
  '“Kafes bir satranç tahtası. Hamlemizi seçelim.”',
  '“Kimse yenilmez değildir. Onun açığını bulduk.”',
  '“Kamp buna göre şekillenecek. İyi düşün.”',
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
  if (o.karsilasma > 0) parts.push(pickS(['Bu adamla daha önce dövüştük, onu tanıyoruz.', 'Geçen sefer ne yaptığını hatırlıyorsun, tekrarlamayacak.'], seed, 4));
  if (o.champion) parts.push(pickS(['Kemeri boşuna taşımıyor.', 'Şampiyon ama o da insan.'], seed, 5));
  else if (o.rekor.m === 0 && o.rekor.g >= 5) parts.push(pickS(['Hiç yenilmemiş; ilk yenilgisini biz verelim.', 'Yenilmezlik havası var, onu delmek bize düşer.'], seed, 5));
  if (strong !== weak) parts.push(pickS(STRONG[strong], seed, 6));
  const close = pickS(CLOSE, seed, 7).replace('{plan}', `«${planAd}»`);
  parts.push(ikinci ? `${close} ${pickS(['Gerekirse', 'B planı olarak'], seed, 8)} «${ikinci}» da işe yarar.` : close);
  return parts.join(' ');
}

/** Zaafa uyan plan yoksa: oyuncunun güçlü yönüne göre öneri. */
export function coachNoFit(s: GameState, o: Opponent, myBest: StatKey) {
  const seed = seedOf(o.id);
  return pickS(
    [
      `Belirgin bir açığı yok. O zaman kendi oyunumuzu oynarız: senin ${STAT_LABELS[myBest].toLocaleLowerCase('tr-TR')} farkın bizim silahımız.`,
      `Komple dövüşçü. Onu kendi alanımıza çekelim, ${STAT_LABELS[myBest].toLocaleLowerCase('tr-TR')} ile üstün gel.`,
      'Kâğıt üstünde denk. Maçı detaylar kazandıracak.',
    ],
    seed,
    9,
  );
}
