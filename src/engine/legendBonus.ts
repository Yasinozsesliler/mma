// "Ya öyle olsaydı?" bonus bölümleri (Şampiyon Paketi): efsanenin hikâyesi bittikten sonra açılan alternatif tarih.
// Yıldızları ana hikâyenin rekoruna sayılmaz (id'ler alt_ ile başlar). Kişiler kurgusaldır.
import { L } from '../i18n';
import { beatCount, bump, count, decision, finish, ko, pay, ufcBeltIn, ufcBelts, type Chapter } from './legendKit';
import type { LegendId } from './legendKit';

export const BONUS: Partial<Record<LegendId, Chapter>> = {
  kral: {
    id: 'alt_rovans',
    yil: '20XX',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("Rövanşı Kazansaydı"),
    giris: () => [
      L("O gece bir türlü aklından çıkmadı. Boyun kilidi, susan salon, kafesin üstünden atlayanlar."),
      L("Ama ya her şey başka türlü olsaydı? Ya rövanş gerçekten yapılsaydı?"),
      L("Khabir Nurmagaliev hâlâ kemerin sahibi. Bu kez onu ayakta tutacak, mesafeyi sen belirleyeceksin."),
    ],
    hedef: () => L("Khabir Nurmagaliev'i yen"),
    ipucu: () => L("Hafif sıklete dön: Nurmagaliev kemerin sahibi olarak orada bekliyor."),
    tamam: (s) => beatCount(s, 'Nurmagaliev') >= 1,
    rakip: { ad: 'Khabir', soyad: 'Nurmagaliev', lakap: 'The Falcon', uyruk: () => L("Rusya"), stil: 'sambo', siklet: 'hafif', sampiyon: true },
    yildizlar: [
      { ad: () => L("Onu nakavtla yen"), kontrol: (_s, f) => !!f && f.won && ko(f.yontem) && !!f.rakip?.includes('Nurmagaliev') },
      { ad: () => L("Hafif sıklet kemerini al"), kontrol: (s) => ufcBeltIn(s, 'hafif'), sonda: true },
    ],
    bitir: (s) => [pay(s, 5_000_000, L("Rövanş PPV payı")), L("🔀 Tarih yeniden yazıldı: rövanşı kazanan sensin.")],
  },
  dahi: {
    id: 'alt_temiz',
    yil: '20XX',
    yer: () => L("Albuquerque, ABD"),
    baslik: () => L("Hiç Sorun Çıkarmasaydı"),
    giris: () => [
      L("Cezalar, kayıp yıllar, manşetlere düşen gece yarısı haberleri… Hiçbiri yaşanmasaydı?"),
      L("Bu kez erken yatıyorsun, salona ilk sen giriyorsun, telefonunu kapatıyorsun."),
      L("Soru basit: en iyi hâlin, kesintisiz bir seri yapsa nereye kadar gider?"),
    ],
    hedef: () => L("Üst üste 4 UCC maçı kazan"),
    ilerleme: (s) => L("Seri {0}/4", [Math.min(4, count(s.efsane!, 'seri'))]),
    tamam: (_s, r) => count(r, 'seri') >= 4,
    yildizlar: [
      { ad: () => L("Bu seride 2 maçı bitirişle kazan"), kontrol: (_s, _f, r) => count(r, 'bitiris') >= 2 },
      { ad: () => L("Bir UCC kemerini savun"), kontrol: (s) => ufcBelts(s).some((b) => b.savunma >= 1) },
    ],
    say: (_s, f, r) => {
      if (f.org !== 'ufc') return;
      if (f.won) {
        bump(r, 'seri');
        if (finish(f.yontem)) bump(r, 'bitiris');
      } else r.sayac = { ...r.sayac, seri: 0 };
    },
    bitir: (s) => [pay(s, 3_000_000, L("Temiz sezon bonusu")), L("🔀 Kesintisiz bir dahi: kimse onu durduramadı.")],
  },
  profesor: {
    id: 'alt_devam',
    yil: '20XX',
    yer: () => L("Montreal, Kanada"),
    baslik: () => L("Hiç Emekli Olmasaydı"),
    giris: () => [
      L("Herkes zirvede bıraktığını söyledi. Ama ya bırakmasaydın?"),
      L("Welter sıklette yeni bir kral var: Kamaru Usmanov. Güçlü, sabırlı, durdurulamaz."),
      L("Profesör son bir dersi daha vermek için salona dönüyor."),
    ],
    hedef: () => L("Kamaru Usmanov'u yen"),
    ipucu: () => L("Welter sıkletinde ol: Usmanov kemerin sahibi."),
    tamam: (s) => beatCount(s, 'Usmanov') >= 1,
    rakip: { ad: 'Kamaru', soyad: 'Usmanov', lakap: 'The Nigerian Nightmare', uyruk: () => L("Nijerya"), stil: 'gures', siklet: 'welter', sampiyon: true },
    yildizlar: [
      { ad: () => L("Onu hakem kararıyla, puanla yen"), kontrol: (_s, f) => !!f && f.won && decision(f.yontem) && !!f.rakip?.includes('Usmanov') },
      { ad: () => L("Welter sıklet kemerini geri al"), kontrol: (s) => ufcBeltIn(s, 'welter'), sonda: true },
    ],
    bitir: (s) => [pay(s, 3_500_000, L("Dönüş maçı payı")), L("🔀 Profesör son dersini de verdi.")],
  },
  yenilmez: {
    id: 'alt_elli',
    yil: '20XX',
    yer: () => L("Mahaçkale, Dağıstan"),
    baslik: () => L("Elli Sıfır"),
    giris: () => [
      L("Babana verdiğin sözü tuttun ve bıraktın. Ama ya devam etseydin?"),
      L("Herkes merak ediyor: o rekor nereye kadar uzardı?"),
      L("Karşında Justin Gaethers var: her maçı bir aksiyon filmine çeviren adam."),
    ],
    hedef: () => L("3 UCC maçı kazan"),
    ilerleme: (s) => L("Galibiyet {0}/3", [Math.min(3, count(s.efsane!, 'g'))]),
    tamam: (_s, r) => count(r, 'g') >= 3,
    rakip: { ad: 'Justin', soyad: 'Gaethers', lakap: 'The Highlight', uyruk: () => 'ABD', stil: 'gures', siklet: 'hafif' },
    yildizlar: [
      { ad: () => L("Bu üç maçta hiç kaybetme"), kontrol: (_s, _f, r) => count(r, 'm') === 0, sonda: true },
      { ad: () => L("Justin Gaethers'ı submission ile yen"), kontrol: (_s, f) => !!f && f.won && f.yontem === 'SUB' && !!f.rakip?.includes('Gaethers') },
    ],
    say: (_s, f, r) => {
      if (f.org !== 'ufc') return;
      bump(r, f.won ? 'g' : 'm');
    },
    bitir: (s) => [pay(s, 3_000_000, L("Yenilmezlik bonusu")), L("🔀 Rekor uzadı. Dağ hâlâ yerinde.")],
  },
  kralice: {
    id: 'alt_tekme',
    yil: '20XX',
    yer: () => L("Melbourne, Avustralya"),
    baslik: () => L("O Tekme Hiç Gelmeseydi"),
    giris: () => [
      L("Melbourne'deki o gece. İkinci raunt, o tek kafa tekmesi."),
      L("Ya o tekmeyi görseydin? Ya eğilseydin?"),
      L("Holli Holmes yeniden karşında. Bu kez mesafeyi kapatacak, onu yere götüreceksin."),
    ],
    hedef: () => L("Holli Holmes'u yen"),
    ipucu: () => L("Horoz sıklette ol: Holmes sıralamanın başında."),
    tamam: (s) => beatCount(s, 'Holmes') >= 1,
    rakip: { ad: 'Holli', soyad: 'Holmes', lakap: 'Preacher Girl', uyruk: () => 'ABD', stil: 'boks', siklet: 'horoz', sampiyon: true },
    yildizlar: [
      { ad: () => L("Onu kol kilidiyle (submission) yen"), kontrol: (_s, f) => !!f && f.won && f.yontem === 'SUB' && !!f.rakip?.includes('Holmes') },
      { ad: () => L("1. rauntta bitir"), kontrol: (_s, f) => !!f && f.won && finish(f.yontem) && f.raunt === 1 && !!f.rakip?.includes('Holmes') },
    ],
    bitir: (s) => [pay(s, 2_500_000, L("Rövanş PPV payı")), L("🔀 Kraliçe tahtını hiç bırakmadı.")],
  },
  orumcek: {
    id: 'alt_saltanat',
    yil: '20XX',
    yer: () => L("Rio de Janeiro, Brezilya"),
    baslik: () => L("Kemeri Hiç Kaybetmeseydi"),
    giris: () => [
      L("O gece dalga geçmeseydin, ellerini indirmeseydin?"),
      L("Saltanat hiç bitmeseydi, rekorlar nereye kadar uzardı?"),
      L("Örümcek ağını yeniden örüyor."),
    ],
    hedef: () => L("2 kemer maçı kazan"),
    ilerleme: (s) => L("Kemer maçı {0}/2", [Math.min(2, count(s.efsane!, 'unvan'))]),
    ipucu: () => L("Kemerin yoksa önce sıralamada yüksel. 6 maçta 2 kemer maçı kazanamazsan bölüm yine geçer."),
    tamam: (_s, r) => count(r, 'unvan') >= 2 || count(r, 'mac') >= 6,
    yildizlar: [
      { ad: () => L("Bir kemer maçını nakavtla kazan"), kontrol: (_s, f) => !!f && f.won && f.unvan && ko(f.yontem) },
      { ad: () => L("Chad Sorensen'i bir kez daha yen"), kontrol: (s) => beatCount(s, 'Sorensen') >= 2 },
    ],
    rakip: { ad: 'Chad', soyad: 'Sorensen', lakap: 'The American Gangster', uyruk: () => 'ABD', stil: 'gures', siklet: 'orta' },
    say: (_s, f, r) => {
      bump(r, 'mac');
      if (f.won && f.unvan) bump(r, 'unvan');
    },
    bitir: (s) => [pay(s, 3_000_000, L("Saltanat bonusu")), L("🔀 Saltanat hiç bitmedi.")],
  },
  imparator: {
    id: 'alt_ucc',
    yil: '20XX',
    yer: () => L("Las Vegas, ABD"),
    baslik: () => L("UCC'ye Gelseydi"),
    giris: () => [
      L("Yıllarca herkes aynı soruyu sordu: Fyodor UCC'ye gelseydi ne olurdu?"),
      L("Bu kez sözleşmeyi imzalıyorsun. Ağır sıklette bir şampiyon var: Cain Velasco."),
      L("Son İmparator dünyanın en büyük sahnesinde."),
    ],
    hedef: () => L("2 UCC maçı kazan"),
    ilerleme: (s) => L("UCC galibiyeti {0}/2", [Math.min(2, count(s.efsane!, 'ucc'))]),
    tamam: (_s, r) => count(r, 'ucc') >= 2,
    uccKapi: true,
    rakip: { ad: 'Cain', soyad: 'Velasco', lakap: 'Caín', uyruk: () => 'ABD', stil: 'gures', siklet: 'agir', sampiyon: true },
    yildizlar: [
      { ad: () => L("Cain Velasco'yu yen"), kontrol: (s) => beatCount(s, 'Velasco') >= 1 },
      { ad: () => L("UCC ağır sıklet kemerini al"), kontrol: (s) => ufcBeltIn(s, 'agir'), sonda: true },
    ],
    say: (_s, f, r) => {
      if (f.won && f.org === 'ufc') bump(r, 'ucc');
    },
    bitir: (s) => [pay(s, 4_000_000, L("UCC ilk maç payı")), L("🔀 Soru cevaplandı: İmparator her yerde imparator.")],
  },
};
