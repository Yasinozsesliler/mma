# App Store'a Yayın Rehberi — YOL: Kafesten Kemere

Mac gerekmez: iOS derlemesi EAS'te bulutta yapılır, yükleme de buradan gönderilir. Komutlar proje klasöründe çalıştırılır.

## Hazır olanlar

| Ne | Nerede |
|---|---|
| Paket kimliği (Bundle ID) | `com.yolmma.game` (`app.json` › `ios.bundleIdentifier`) |
| Yalnızca iPhone (iPad kapalı) | `ios.supportsTablet: false`; iPad ekran görüntüsü istenmez |
| Şifreleme beyanı | `ios.config.usesNonExemptEncryption: false`; her yüklemede soru sorulmaz |
| Reklam takibi (ATT) izin metni, 6 dil | `locales/*.json` + reklam eklentisinde `userTrackingUsageDescription` |
| Gizlilik bildirimi (Privacy Manifest) | `ios.privacyManifests` |
| Ana ekranda görünen ad | "YOL" (`locales/*.json` › `CFBundleDisplayName`) |
| Satın alımları geri yükle düğmesi (Apple zorunlu) | Dolap ekranı |
| Reklam izin formu (AB) | AdMob UMP, `src/monetization/` |
| Metinler (ad, alt başlık, tanıtım, anahtar kelime, açıklama), 6 dil | `store/appstore-metinleri/` (`node scripts/appstore-texts.mjs`) |
| iPhone ekran görüntüleri 1290×2796, 6 dil × 8 | `store/graphics-ios/<dil>` (`IOS=1 node scripts/store-shots.mjs <dil>`) |
| Uygulama ikonu 1024×1024, şeffaflık yok | `assets/icon.png` |

## 1. Apple Developer hesabı (yıllık 99 $)

1. developer.apple.com/programs → **Enroll**. Bireysel hesap için Apple ID ve kimlik doğrulaması yeterli; onay 1-2 gün sürebilir.
2. Hesap açılınca appstoreconnect.apple.com → **Uygulamalar → +  → Yeni Uygulama**:
   - Platform: iOS · Ad: `YOL: MMA Kariyer Simülasyonu` (ad başkası tarafından alınmışsa küçük bir değişiklik gerekir)
   - Birincil dil: Türkçe · Paket kimliği: `com.yolmma.game` · SKU: `yolmma`

## 2. Uygulama içi satın almalar

App Store Connect → uygulama → **Para Kazanma → Uygulama İçi Satın Almalar**. Play'dekiyle **aynı kimliklerle**, hepsi **Tüketilmeyen (Non-Consumable)**:

| Ürün kimliği | Ne | Önerilen fiyat |
|---|---|---|
| `sampiyon_paketi` | Reklamsız + 5 kariyer yuvası + Şampiyon çerçevesi | 2,99 $ |
| `reklamsiz` | Yalnızca geçiş reklamlarını kaldırır | 1,49 $ |
| `paket_altin`, `paket_sokak`, `paket_sultan` | Kozmetik paketler (güç vermez) | 0,99–1,49 $ |
| `paket_gece` | Kozmetik paket, epik (güç vermez) | 1,49 $ |
| `paket_ejder`, `paket_buz` | Kozmetik paketler, efsanevi (güç vermez) | 2,49 $ |
| `paket_efsane` | Efsane Koleksiyonu: bütün kozmetik paketleri | 5,99 $ |

Her ürüne bir ekran görüntüsü (Dolap ekranı yeterli) ve kısa açıklama eklenir. Ürünler ilk sürümle birlikte incelemeye gönderilir.

## 3. AdMob (iOS uygulaması)

1. admob.google.com → **Uygulama ekle → iOS** → "YOL: Kafesten Kemere".
2. Uygulama kimliğini `app.json` › `react-native-google-mobile-ads` › `iosAppId` alanına yaz (şu an Google'ın test kimliği duruyor).
3. iOS için "Ödüllü" ve "Geçiş" reklam birimi oluştur.
4. AdMob › Gizlilik ve mesajlaşma → **IDFA açıklama mesajı** oluştur; ATT izin penceresinden önce kısa bir açıklama gösterir.

> **Önemli (Android için de geçerli):** `src/monetization/ids.ts` içindeki gerçek reklam kimlikleri hâlâ boş. Boşken yayın sürümü de Google'ın **test** reklamlarını gösterir ve **gelir gelmez**. Gerçek kimlikleri girmeden mağazaya çıkma. iOS kimlikleri Android'den farklıdır; dosyaya iOS alanları eklenecek.

## 4. Derleme ve yükleme (EAS)

```bash
npx eas-cli@latest build -p ios --profile production
```

İlk seferde Apple ID ile giriş ister ve sertifikayı EAS kendisi oluşturur ("Generate a new Apple Distribution Certificate?" → Evet). Bu adım **etkileşimli** olduğu için ilk derlemeyi kendi bilgisayarından çalıştırman gerekir. Sonraki derlemeler otomatik gider.

```bash
npx eas-cli@latest submit -p ios --latest
```

Derlemeyi App Store Connect'e gönderir. 10-30 dakika içinde **TestFlight**'ta görünür: kendi iPhone'unda TestFlight uygulamasıyla dene, arkadaşlarını test kullanıcısı olarak ekle.

## 5. Mağaza sayfası (App Store Connect → Uygulama → Dağıtım)

- **Metinler:** `store/appstore-metinleri/<dil>.txt` dosyasından kopyala. Diller: Türkçe, İngilizce (ABD), İspanyolca (İspanya), Portekizce (Brezilya), Rusça, Lehçe.
- **Ekran görüntüleri:** `store/graphics-ios/<dil>` → "6,9 inç ekran" bölümüne sürükle (1290×2796 kabul edilir; küçük ekranlar bundan otomatik üretilir).
- **Gizlilik politikası URL'si:** `WEB_URL/gizlilik.html` · **Destek URL'si:** web sitesi adresi.
- **Kategori:** Oyunlar → Spor (ikincil: Simülasyon).
- **Telif:** `2026 Yasin Özsesliler`.

## 6. Uygulama gizliliği (Privacy Nutrition Label)

"Veri toplar mısınız?" → **Evet** (reklamlar yüzünden):
- **Tanımlayıcılar → Cihaz kimliği (IDFA):** Üçüncü taraf reklamcılık · İzleme için **kullanılır** (kullanıcı ATT'de izin verirse).
- **Kullanım verileri → Reklam verileri:** Üçüncü taraf reklamcılık.
- **Tanılama → Çökme verileri:** AdMob SDK'sı toplar · Uygulama işlevselliği.
- **Satın alımlar:** Apple yönetir; uygulama kendisi toplamaz.
- Hesap, konum, kişiler, sağlık: **toplanmaz**. Kariyer kayıtları yalnızca cihazda durur.

## 7. Yaş derecelendirmesi

Ankette dürüst cevap ver:
- **Gerçekçi şiddet:** Seyrek/Hafif (çizgi film tarzı dövüş, kan damlaları).
- **Simüle kumar:** Oyunda **kumarhane** var → "Seyrek/Hafif" bile seçilse yaş sınırı yükselir (yeni sistemde büyük olasılıkla 18+).
- **Alkol/Gece hayatı referansları:** Seyrek/Hafif.

**Karar senin:** Kumarhaneyi iOS'ta kapatırsak yaş sınırı muhtemelen 12+/13+ olur ve çok daha geniş bir kitleye ulaşırız. Play'de de benzer bir etki var. İstersen kumarhaneyi tek ayarla iOS'ta (ya da her yerde) kaldırabilirim.

## 8. İnceleme notu (App Review Information)

"Notlar" kutusuna:

> Oyundaki organizasyonlar, kişiler ve markalar kurgusaldır. Giriş/hesap gerekmez. Ödüllü reklamlar yalnızca oyun içi para veya bilgi verir; satın almalar kozmetik veya reklam kaldırma içindir, oyun gücü satılmaz. Satın alımları geri yükleme düğmesi Dolap ekranındadır.

Giriş gerektirmediği için demo hesap gerekmez. İlk inceleme genelde 1-3 gün sürer.
