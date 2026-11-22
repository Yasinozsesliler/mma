// Gençlik Yolu olayları: her yıl biri çıkar (yaş aralığına uygun, görülmemiş olanlardan). Etkiler küçüktür;
// toplam kazanım youth.ts'teki tavanla sınırlı. {r} içeren metinlerde genç ezeli rakibin adı geçer.
import { L } from '../i18n';
import type { Stats } from './types';

export type YouthOption = {
  ad: () => string;
  sonuc: () => string;
  etki: Partial<Stats>;
  /** Sporun ana istatistiğine eklenen */
  spor?: number;
  takipci?: number;
  para?: number;
  /** Genç ezeli rakiple ilişki (+ dostluk, − husumet); yalnızca anlatım */
  husumet?: number;
};
export type YouthEvent = { id: string; min: number; max: number; rakip?: boolean; metin: () => string; secenekler: YouthOption[] };

export const YOUTH_EVENTS: YouthEvent[] = [
  { id: 'ilkgun', min: 12, max: 12, metin: () => L("Salona ilk gün geldin. Eldivenler kocaman, herkes senden büyük. Hoca sana bakıp gülümsüyor."), secenekler: [
    { ad: () => L("Sessizce izle"), sonuc: () => L("Bir saat boyunca herkesi izledin; hocanın gözünden kaçmadı."), etki: { iq: 1 } },
    { ad: () => L("Hemen torbaya git"), sonuc: () => L("Torbaya vurmaktan ellerin kızardı ama ertesi gün yine geldin."), etki: {}, spor: 1 },
  ] },
  { id: 'okul', min: 12, max: 17, metin: () => L("Sınav haftası. Hocan aynı akşam ek antrenman koymuş."), secenekler: [
    { ad: () => L("Ders çalış"), sonuc: () => L("Karnen parladı; ailen gururlu, kafan rahat."), etki: { iq: 1 } },
    { ad: () => L("Antrenmana git"), sonuc: () => L("Salonda son çıkan sendin. Hocan fark etti."), etki: { kondisyon: 1 } },
  ] },
  { id: 'buyukler', min: 13, max: 16, metin: () => L("Hocan seni ilk kez büyüklerle çalıştırmak istiyor."), secenekler: [
    { ad: () => L("Kabul et"), sonuc: () => L("Çok dayak yedin ama korkmamayı öğrendin."), etki: { cene: 1 } },
    { ad: () => L("Yaşıtlarınla kal"), sonuc: () => L("Tekniğini sakin sakin oturttun."), etki: { iq: 1 } },
  ] },
  { id: 'is', min: 13, max: 17, metin: () => L("Evde para sıkıntısı var. Yaz için bir işe girmen isteniyor."), secenekler: [
    { ad: () => L("Çalış"), sonuc: () => L("Pazarda kasa taşıdın; hem cebine para girdi hem de kondisyonun arttı."), etki: { kondisyon: 1 }, para: 600 },
    { ad: () => L("Kampa git"), sonuc: () => L("Ailen idare etti; sen de yaz kampında bir üst seviyeye çıktın."), etki: {}, spor: 1 },
  ] },
  { id: 'video', min: 13, max: 17, metin: () => L("Antrenman videon okulda elden ele dolaşıyor."), secenekler: [
    { ad: () => L("Hesap aç, paylaş"), sonuc: () => L("İlk takipçilerin geldi. Mahallede tanınıyorsun."), etki: {}, takipci: 400 },
    { ad: () => L("Boş ver, çalış"), sonuc: () => L("Ekrana değil kum torbasına baktın."), etki: { hiz: 1 } },
  ] },
  { id: 'kulup', min: 14, max: 17, metin: () => L("Şehrin büyük kulübü seni transfer etmek istiyor."), secenekler: [
    { ad: () => L("Hocanla kal"), sonuc: () => L("Hocan seni hiç unutmayacak. Sadakat bir gün geri döner."), etki: { iq: 1 } },
    { ad: () => L("Büyük kulübe geç"), sonuc: () => L("Daha sert sparring, daha iyi ekipman."), etki: { cene: 1 } },
  ] },
  { id: 'mma', min: 12, max: 17, metin: () => L("Televizyonda ilk kez bir MMA gecesi izledin. Gözünü alamadın."), secenekler: [
    { ad: () => L("Güreşe de bak"), sonuc: () => L("Kulübün güreş köşesine gizlice girmeye başladın."), etki: { gures: 1 } },
    { ad: () => L("Ayakta vuruşa çalış"), sonuc: () => L("Gece yarısına kadar gölge boksu."), etki: { vurus: 1 } },
  ] },
  { id: 'sakat', min: 13, max: 17, metin: () => L("Antrenmanda bileğin burkuldu. Turnuvaya üç hafta var."), secenekler: [
    { ad: () => L("Dinlen"), sonuc: () => L("Sabırlı oldun; bilek tamamen iyileşti."), etki: { iq: 1 } },
    { ad: () => L("Sarıp devam et"), sonuc: () => L("Acıyla çalışmayı öğrendin."), etki: { cene: 1 } },
  ] },
  { id: 'arkadas', min: 13, max: 17, metin: () => L("Mahalledeki arkadaşların akşamları dışarı çağırıyor."), secenekler: [
    { ad: () => L("Bir akşam git"), sonuc: () => L("Güldün, eğlendin; kafan dağıldı."), etki: { iq: 1 } },
    { ad: () => L("Erken yat"), sonuc: () => L("Sabah koşusunda herkesten öndeydin."), etki: { kondisyon: 1 } },
  ] },
  { id: 'baba', min: 12, max: 15, metin: () => L("Baban ilk kez antrenmanını izlemeye geldi. Kenarda kollarını kavuşturmuş duruyor."), secenekler: [
    { ad: () => L("Ona göster"), sonuc: () => L("Sparringde her şeyini verdin. Çıkışta omzuna dokundu; bir şey demedi, gerek de yoktu."), etki: { cene: 1 } },
    { ad: () => L("Normal çalış"), sonuc: () => L("Heyecanlanmadın, tekniğine sadık kaldın. Hocan bunu daha çok beğendi."), etki: { iq: 1 } },
  ] },
  { id: 'kilo', min: 14, max: 17, metin: () => L("Turnuva tartısına iki kilo fazlan var. Hoca \"ya düşersin ya bir üst sıklete çıkarsın\" diyor."), secenekler: [
    { ad: () => L("Kilo düş"), sonuc: () => L("İki hafta sauna ve diyet. Zorlandın ama irade kası çalıştı."), etki: { kondisyon: 1 } },
    { ad: () => L("Üst sıklete çık"), sonuc: () => L("Kendinden ağırlarla eşleşmek seni sertleştirdi."), etki: { cene: 1 } },
  ] },
  { id: 'burs', min: 15, max: 17, metin: () => L("Spor lisesinden burs teklifi geldi; ama başka bir şehirde, yatılı."), secenekler: [
    { ad: () => L("Git"), sonuc: () => L("Sabah 6'da antrenman, gece etüt. Disiplin artık hayatının bir parçası."), etki: { kondisyon: 1 }, spor: 1 },
    { ad: () => L("Ailenin yanında kal"), sonuc: () => L("Annenin yemekleri, eski hocan, bildiğin sokaklar. Huzur da bir güç."), etki: { iq: 1 } },
  ] },
  { id: 'askim', min: 15, max: 17, metin: () => L("Sınıftan biriyle yakınlaştınız. Hafta sonu antrenman ve buluşma aynı saatte."), secenekler: [
    { ad: () => L("Buluşmaya git"), sonuc: () => L("Güzel bir gün geçirdin. Ertesi hafta antrenmana iki kat istekli geldin."), etki: { iq: 1 } },
    { ad: () => L("Antrenmanı kaçırma"), sonuc: () => L("Hocan \"bu çocuk ciddi\" dedi. Kalbin biraz kırık ama yumrukların sağlam."), etki: {}, spor: 1 },
  ] },
  { id: 'hile', min: 15, max: 17, metin: () => L("Soyunma odasında biri sana \"kilo için\" bir hap uzatıyor. \"Herkes kullanıyor\" diyor."), secenekler: [
    { ad: () => L("Reddet"), sonuc: () => L("Hayır dedin ve hocana anlattın. Temiz kalmanın gururu hiçbir madalyaya benzemez."), etki: { iq: 1 } },
    { ad: () => L("Hocana sor"), sonuc: () => L("Hocan hapı çöpe attı, sana uzun bir konuşma yaptı. O günü hiç unutmayacaksın."), etki: { iq: 1 } },
  ] },
  { id: 'kamp', min: 14, max: 17, metin: () => L("Yaz kampında ülkenin en iyi gençleriyle aynı mindesin."), secenekler: [
    { ad: () => L("En iyisiyle eşleş"), sonuc: () => L("Her gün dayak yedin, her gün biraz daha az yedin."), etki: {}, spor: 1 },
    { ad: () => L("Teknik çalış"), sonuc: () => L("Antrenörlerden birinin bir ayrıntısı oyununu baştan değiştirdi."), etki: { iq: 1 } },
  ] },
  { id: 'kardes', min: 12, max: 16, metin: () => L("Küçük kardeşin okulda zorbalığa uğruyor. Seni yardıma çağırıyor."), secenekler: [
    { ad: () => L("Konuşarak çöz"), sonuc: () => L("Zorbayla ve öğretmenle konuştun; kavga etmeden bitti. Gerçek güç buydu."), etki: { iq: 1 } },
    { ad: () => L("Kardeşine öğret"), sonuc: () => L("Onu salona getirdin. Şimdi iki kişi gidiyorsunuz."), etki: { kondisyon: 1 } },
  ] },
  { id: 'sokak', min: 14, max: 17, metin: () => L("Gece eve dönerken bir grup seni sıkıştırdı."), secenekler: [
    { ad: () => L("Kaç"), sonuc: () => L("Koşarak uzaklaştın. Hocan \"en iyi dövüş, yapılmayandır\" dedi."), etki: { hiz: 1 } },
    { ad: () => L("Kendini savun"), sonuc: () => L("Bir yumrukla geri çekildiler. Ama elin şişti ve hocan çok kızdı."), etki: { cene: 1 } },
  ] },
  { id: 'hoca', min: 15, max: 17, metin: () => L("Hocan hastalandı; birkaç ay salona gelemeyecek."), secenekler: [
    { ad: () => L("Kendi kendine çalış"), sonuc: () => L("Kendi antrenman planını yazdın. Kafan bir hoca gibi çalışmaya başladı."), etki: { iq: 1 } },
    { ad: () => L("Ziyaretine git"), sonuc: () => L("Hastane odasında sana bildiği her şeyi anlattı. Kâğıda not aldın."), etki: { iq: 1 } },
  ] },
  { id: 'reklam', min: 16, max: 17, metin: () => L("Yerel bir spor mağazası seni reklam yüzü yapmak istiyor."), secenekler: [
    { ad: () => L("Kabul et"), sonuc: () => L("Afişin semtin her köşesinde. Cebine de biraz para girdi."), etki: {}, takipci: 900, para: 1000 },
    { ad: () => L("Odaklan"), sonuc: () => L("Daha erken dedin. Hocan başını sallayarak onayladı."), etki: { kondisyon: 1 } },
  ] },
  // Genç ezeli rakiple olaylar
  { id: 'rakip1', min: 12, max: 14, rakip: true, metin: () => L("Turnuvada {r} diye biri var. Tartıda sana göz kırptı: \"Finalde görüşürüz, ufaklık.\""), secenekler: [
    { ad: () => L("Gülüp geç"), sonuc: () => L("Umursamadın. {r} bundan daha çok sinirlendi."), etki: { iq: 1 }, husumet: 1 },
    { ad: () => L("Cevap ver"), sonuc: () => L("\"Finalde sen ağlarsın.\" Salon güldü; artık aranızda bir şey var."), etki: { cene: 1 }, husumet: 2, takipci: 150 },
  ] },
  { id: 'rakip2', min: 14, max: 17, rakip: true, metin: () => L("{r} sosyal medyada sana laf atmış: \"Geçen sefer şanslıydı.\""), secenekler: [
    { ad: () => L("Video ile cevap ver"), sonuc: () => L("Antrenman videonu attın; yorumlar alev aldı."), etki: {}, takipci: 600, husumet: 2 },
    { ad: () => L("Sessiz kal"), sonuc: () => L("Cevabını minderde vereceksin."), etki: {}, spor: 1, husumet: 1 },
  ] },
  { id: 'rakip3', min: 15, max: 17, rakip: true, metin: () => L("Milli takım kampında {r} ile aynı odaya düştün."), secenekler: [
    { ad: () => L("Buzları erit"), sonuc: () => L("Gece geç saate kadar konuştunuz. Rakipsiniz ama birbirinizi anlıyorsunuz."), etki: { iq: 1 }, husumet: -2 },
    { ad: () => L("Mesafeni koru"), sonuc: () => L("Tek kelime etmediniz. Sabah antrenmanında sparring savaşa döndü."), etki: { cene: 1 }, husumet: 2 },
  ] },
];
export const eventById = (id?: string) => YOUTH_EVENTS.find((e) => e.id === id);
