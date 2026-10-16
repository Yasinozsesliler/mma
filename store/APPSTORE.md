# App Store'a Yayın Rehberi — YOL: Kafesten Kemere

Mac gerekmez: iOS derlemesi EAS'te bulutta yapılır, App Store Connect'e de buradan gönderilir. Komutlar proje klasöründe (`Desktop\MMA`) çalıştırılır.

## Hazır olanlar

| Ne | Nerede |
|---|---|
| Paket kimliği (Bundle ID) | `com.yolmma.game` (`app.json` › `ios.bundleIdentifier`) |
| Yalnızca iPhone (iPad kapalı) | `ios.supportsTablet: false`; iPad ekran görüntüsü istenmez |
| Şifreleme beyanı | `ios.config.usesNonExemptEncryption: false`; yüklemede soru sorulmaz |
| Reklam takibi (ATT) izin metni, 6 dil | `locales/*.json` + reklam eklentisinde `userTrackingUsageDescription` |
| Gizlilik bildirimi (Privacy Manifest) | `ios.privacyManifests` |
| Ana ekranda görünen ad | "YOL" (`locales/*.json` › `CFBundleDisplayName`) |
| Satın alma (Apple) ve **Satın alımları geri yükle** düğmesi (Apple zorunlu) | `src/monetization/`, Dolap ekranı |
| Reklam izin formu (AB) ve ATT penceresi | AdMob UMP (`src/monetization/`); ATT penceresi AdMob'daki IDFA mesajıyla açılır (3. bölüm) |
| Paylaşım kartlarında iOS'ta "App Store'da ücretsiz" | `src/share/storeLine.ts` (Apple, uygulamada başka mağaza adı görmek istemez) |
| Gerçek kişileri çağrıştıran isim yok | Efsane hocalar ve boksörler kurgusal isimlerde (Apple 5.2 fikri mülkiyet kuralı) |
| Gizlilik politikası (App Store ve ATT dahil, TR + EN) | https://mma-five-psi.vercel.app/gizlilik.html |
| Metinler (ad, alt başlık, tanıtım, anahtar kelime, açıklama), 6 dil | `store/appstore-metinleri/` (`node scripts/appstore-texts.mjs`) |
| iPhone ekran görüntüleri 1290×2796, 6 dil × 8 | `store/graphics-ios/<dil>` (`IOS=1 node scripts/store-shots.mjs <dil>`) |
| Uygulama ikonu 1024×1024, şeffaflık yok | `assets/icon.png` |

## 1. Apple Developer hesabı (yıllık 99 $)

1. developer.apple.com/programs → **Enroll**. Bireysel hesap için Apple ID (iki adımlı doğrulama açık) ve kimlik doğrulaması yeterli; onay 1-2 gün sürebilir.
2. Onay gelince **appstoreconnect.apple.com → Uygulamalar → + → Yeni Uygulama**:
   - Platform: **iOS**
   - Ad: `YOL: MMA Kariyer Simülasyonu` (alınmışsa küçük bir değişiklik gerekir, ör. `YOL: MMA Dövüşçü Kariyeri`)
   - Birincil dil: **Türkçe**
   - Paket kimliği: `com.yolmma.game` (listede yoksa önce developer.apple.com › Identifiers'tan ekle; EAS ilk derlemede kendisi de oluşturabilir)
   - SKU: `yolmma`
   - Kullanıcı erişimi: Tam erişim

## 2. Uygulama içi satın almalar

App Store Connect → uygulama → **Para Kazanma → Uygulama İçi Satın Almalar → +**. Play'dekiyle **aynı ürün kimlikleri**, hepsi **Tüketilmeyen (Non-Consumable)**:

| Ürün kimliği | Ne | Fiyat (Play ile aynı) |
|---|---|---|
| `sampiyon_paketi` | Reklamsız + 5 kariyer yuvası + Şampiyon çerçevesi | 3,99 $ |
| `reklamsiz` | Yalnızca geçiş reklamlarını kaldırır | 1,49 $ |
| `paket_altin`, `paket_sokak`, `paket_sultan` | Kozmetik paketler (güç vermez) | 0,99–1,49 $ |
| `paket_gece` | Kozmetik paket, epik (güç vermez) | 1,49 $ |
| `paket_ejder`, `paket_buz` | Kozmetik paketler, efsanevi (güç vermez) | 2,49 $ |
| `paket_efsane` | Efsane Koleksiyonu: bütün kozmetik paketleri | 5,99 $ |

Her ürün için: **Referans adı**, **Ürün kimliği**, **Fiyat**, en az bir dilde **Görünen ad + Açıklama** ve **İnceleme için ekran görüntüsü** (Dolap ekranı yeterli). Durum "Gönderime hazır" olmalı.

**Önemli:** İlk sürümü incelemeye gönderirken sürüm sayfasındaki **"Uygulama İçi Satın Almalar"** bölümünden bu ürünleri seçip sürümle **birlikte** gönder. Ürünler ayrı kalırsa Apple "satın alma çalışmıyor" diye reddeder (kural 2.1).

Ayrıca **Sözleşmeler, Vergi ve Bankacılık** bölümünde **Ücretli Uygulamalar** sözleşmesini imzala ve banka/vergi bilgilerini gir. Bu yapılmadan satın almalar test ortamında bile çalışmaz.

## 3. AdMob (iOS uygulaması)

1. admob.google.com → **Uygulamalar → Uygulama ekle → iOS**. "Uygulama App Store'da yayında mı?" → **Hayır** (yayın sonrası mağaza bağlantısını eklersin) → ad: "YOL: Kafesten Kemere".
2. Çıkan **uygulama kimliğini** (`ca-app-pub-6387108639379747~XXXXXXXXXX`) bana ver: `app.json` › `react-native-google-mobile-ads` › `iosAppId` alanına yazacağım (şu an Google'ın test kimliği duruyor).
3. Bu iOS uygulamasında iki reklam birimi oluştur ve kimliklerini bana ver (`src/monetization/ids.ts` › `ios`):
   - **Ödüllü** (Rewarded)
   - **Geçiş** (Interstitial)
4. **Gizlilik ve mesajlaşma**:
   - **Avrupa düzenlemeleri** mesajına iOS uygulamasını da ekle (Android için oluşturduğun mesaj; yoksa oluştur ve yayınla).
   - **IDFA açıklama mesajı** oluştur ve yayınla. Bu, iPhone'da Apple'ın "izlemeye izin ver" penceresinden (ATT) önce kısa bir açıklama gösterir ve **ATT penceresini açan budur**. Yapılmazsa pencere hiç çıkmaz; Apple da "izin metni var ama pencere yok" diye reddedebilir (kural 5.1.2).
5. **app-ads.txt**: Sitede hazır (`https://mma-five-psi.vercel.app/app-ads.txt`). App Store Connect'te pazarlama/destek URL'si olarak bu siteyi verince AdMob doğrular.

Kimlikler girilmeden derleme yapılırsa iOS'ta Google'ın **test** reklamları görünür ve gelir gelmez. Derlemeden önce 2. ve 3. adımdaki kimlikleri gönder.

## 4. Derleme ve yükleme (EAS)

```bash
npx eas-cli@latest build -p ios --profile production
```

İlk derleme **etkileşimli**: Apple ID ile giriş ister, sertifika ve provizyon profilini EAS kendisi oluşturur ("Generate a new Apple Distribution Certificate?" → **Y**, "Generate a new Provisioning Profile?" → **Y**). Bu yüzden ilk derlemeyi **kendi bilgisayarında** çalıştırman gerekir. Sonraki derlemeler otomatik gider; sürüm numarası (build) her seferinde kendiliğinden artar.

Derleme bitince (20-30 dk):

```bash
npx eas-cli@latest submit -p ios --latest
```

Bu komut derlemeyi (.ipa) App Store Connect'e yükler. Bir kez App Store Connect'teki uygulamayı seçmeni ister. 10-30 dakika sonra **TestFlight** sekmesinde görünür.

**İncelemeye göndermeden önce TestFlight'ta mutlaka dene:**
- Telefona **TestFlight** uygulamasını kur, derlemeyi aç.
- Yeni kariyer başlat, bir maç oyna, ödüllü reklam izle (izin penceresi ve reklam görünmeli).
- Dolap'ta bir paketi **test satın alımıyla** al (TestFlight'ta ücret alınmaz), uygulamayı silip yeniden kur, **Satın alımları geri yükle**'ye bas.
- Paylaş kartında "App Store'da ücretsiz" yazdığını gör.

## 5. Mağaza sayfası (App Store Connect → Uygulama → Dağıtım → iOS Uygulaması 1.0)

- **Metinler:** `store/appstore-metinleri/<dil>.txt` → Ad, Alt başlık, Tanıtım metni, Açıklama, Anahtar kelimeler. Diller: Türkçe, İngilizce (ABD), İspanyolca (İspanya), Portekizce (Brezilya), Rusça, Lehçe (sağ üstteki dil menüsünden eklenir).
- **Ekran görüntüleri:** `store/graphics-ios/<dil>` içindeki 8 görsel → **iPhone 6,9 inç** bölümüne sürükle (1290×2796 kabul edilir; küçük ekranlar otomatik üretilir).
- **Destek URL'si:** `https://mma-five-psi.vercel.app` · **Pazarlama URL'si:** aynı.
- **Telif hakkı:** `2026 Yasin Özsesliler`.
- **Derleme:** "Derleme ekle" → TestFlight'tan gelen derlemeyi seç.
- **Uygulama Bilgileri:** Kategori **Oyunlar › Spor**, ikincil **Oyunlar › Simülasyon**. **Gizlilik Politikası URL'si:** `https://mma-five-psi.vercel.app/gizlilik.html`.
- **Fiyatlandırma:** Ücretsiz, tüm ülkeler.

## 6. Uygulama gizliliği (Privacy Nutrition Label)

App Store Connect → **Uygulama Gizliliği → Başla**. "Veri topluyor musunuz?" → **Evet** (reklamlar nedeniyle). Seç:

| Veri türü | Kullanım | Kullanıcıya bağlı mı | İzleme için mi |
|---|---|---|---|
| **Tanımlayıcılar › Cihaz Kimliği** | Üçüncü taraf reklamcılık | Hayır | **Evet** |
| **Konum › Yaklaşık Konum** | Üçüncü taraf reklamcılık | Hayır | Evet |
| **Kullanım Verileri › Ürün Etkileşimi** | Üçüncü taraf reklamcılık, Analiz | Hayır | Evet |
| **Kullanım Verileri › Reklam Verileri** | Üçüncü taraf reklamcılık | Hayır | Evet |
| **Tanılama › Çökme Verileri, Performans Verileri** | Uygulama İşlevselliği | Hayır | Hayır |

Bunları AdMob SDK'sı toplar. **Satın alımlar** Apple'ın kendi sistemiyle yapılır, uygulama toplamaz. Hesap, kişiler, sağlık, finans, fotoğraf: **toplanmaz**. Kariyer kayıtları yalnızca cihazda durur.

## 7. Yaş derecelendirmesi

Apple 2025'te yeni yaş sistemine geçti (4+, 9+, 13+, 16+, 18+). Ankete dürüst cevap ver; tahmini sonuç **13+ ya da 16+**:

- **Şiddet:** Dövüş oyunun merkezinde → "Çizgi film veya fantastik şiddet" / "Gerçekçi şiddet" için **Sık/Yoğun değil, Seyrek/Hafif** (stilize karakterler, kan damlası var, vahşet yok). Emin olamazsan bir üst kademeyi seç; düşük beyan red sebebidir.
- **Alkol, tütün veya uyuşturucu referansları:** **Seyrek/Hafif** (gece kulübü metinleri; doping teması ceza olarak geçiyor).
- **Simüle kumar:** **Hayır** (Oyun Salonu bahissiz; para kazanılmaz/kaybedilmez).
- **Cinsel içerik/çıplaklık:** Hayır. (Oyun içi flört uygulaması gerçek kişilerle eşleştirmez; içerik yok.)
- **Kontrolsüz web erişimi, kullanıcı içeriği, sohbet:** Hayır.
- **Uygulama içi kontroller (ebeveyn kontrolü, yaş doğrulama):** Yok.
- **Reklam:** Var.

## 8. İnceleme bilgileri (App Review Information)

- **Giriş gerekli mi:** Hayır (demo hesap gerekmez).
- **İletişim:** adın, telefon, e-posta.
- **Notlar** kutusuna (İngilizce):

> All organizations, people and brands in the game are fictional. No login or account is required. Rewarded ads only grant in-game cash or hints; purchases are cosmetic packs or ad removal, and no gameplay power is sold. "Restore Purchases" is in the Locker screen. The App Tracking Transparency prompt appears on first launch (after a short explanation screen) before ads are requested. Career saves are stored only on the device.

## 9. Gönderim ve sonrası

1. Sürüm sayfasında her şey dolunca → **İncelemeye Ekle → İncelemeye Gönder**.
2. İnceleme genelde **24-48 saat** sürer.
3. "Yayın" seçeneği: **El ile yayınla** önerilir (onay gelince düğmeye basıp yayınlarsın).
4. Reddedilirse e-postada kural numarası yazar; **Resolution Center**'dan cevap verilir. Ekran görüntüsünü bana at, birlikte çözeriz.

## Sık red nedenleri ve durumumuz

| Kural | Ne | Durum |
|---|---|---|
| 2.1 Uygulama eksiksizliği | Çökme, çalışmayan satın alma | TestFlight'ta dene; satın almaları sürümle birlikte gönder |
| 2.3.10 Başka platform adı | Uygulamada/metinlerde "Google Play", "Android" | Paylaşım kartları iOS'ta "App Store"; metinlerde yok |
| 3.1.1 Uygulama içi satın alma | Dijital içerik Apple dışından satılamaz | Tüm satışlar Apple satın almasıyla |
| 3.1.1 Geri yükleme | Tüketilmeyen ürünler geri yüklenebilmeli | Dolap'ta "Satın alımları geri yükle" |
| 5.1.1 Gizlilik politikası | Mağazada ve uygulamada bağlantı | Menüde ve mağaza sayfasında |
| 5.1.2 Takip izni (ATT) | İzleme öncesi Apple izni | AdMob IDFA mesajı yayınlanmalı (3. bölüm) |
| 5.2 Fikri mülkiyet | Gerçek kişi/marka adları | Gerçek dövüşçüleri çağrıştıran isimler kurgusal isimlerle değiştirildi |
| 4.2 Asgari işlevsellik | Web sitesi sarmalayıcısı gibi görünen uygulamalar | Yerel uygulama, sorun yok |
