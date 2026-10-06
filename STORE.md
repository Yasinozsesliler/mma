# Google Play'e Yayın Rehberi — YOL: Kafesten Kemere

Kod tarafı hazır. Aşağıdaki adımlar hesaplar açıldıktan sonra sırayla yapılır. Komutlar proje klasöründe çalıştırılır.

## Hazır olanlar

| Ne | Nerede |
|---|---|
| Uygulama kimliği (paket adı) | `com.yolmma.game` — `app.json` (Play'de bir kez yüklendikten sonra **değiştirilemez**) |
| İkon, uyarlanabilir ikon, açılış ekranı | `assets/` (`node scripts/make-icons.mjs` ile yeniden üretilir) |
| Derleme profilleri | `eas.json` (preview = test APK, production = Play için AAB) |
| Reklam (AdMob) + izin formu (AB) | `src/monetization/` — şimdilik Google **test** reklamları |
| Şampiyon Paketi satın alma | `src/monetization/` — ürün kimliği `sampiyon_paketi` |
| Android sesleri | `assets/sounds/` (`node scripts/render-sounds.mjs` ile yeniden üretilir) |
| Mağaza metinleri (5 dil) | `store/listing.json` |
| Ekran görüntüleri + tanıtım görseli | `store/graphics/<dil>` · tr, en, es, pt, ru, pl (`node scripts/store-shots.mjs <dil>`) |
| Tanıtım videosu (YouTube'a yüklenir) | `store/video/yol-tanitim-<dil>.mp4` (`node scripts/promo-video.mjs <ffmpeg.exe> <dil>`) |
| Gizlilik politikası | `public/gizlilik.html` → web sitesinde `/gizlilik.html` |

## 1. Doldurulması gereken 3 yer

1. **`src/appConfig.ts` › `WEB_URL`**: oyunun web adresi (Vercel), örn. `https://yol-mma.vercel.app`.
2. **`public/gizlilik.html`**: `[İLETİŞİM E-POSTASI]` ve `[CONTACT EMAIL]` yerine iletişim e-postası.
3. **AdMob kimlikleri** (adım 4'te): `src/monetization/ids.ts` ve `app.json`.

Değişiklikten sonra web'i yayınla (git push → Vercel); gizlilik sayfası `WEB_URL/gizlilik.html` adresinde açılmalı.

## 2. Expo hesabı ve ilk test sürümü (ücretsiz)

```bash
npx eas-cli@latest login          # expo.dev hesabınla
npx eas-cli@latest init           # projeyi bağlar (app.json'a projectId ekler)
npx eas-cli@latest build -p android --profile preview
```

Derleme bulutta ~15 dk sürer, sonunda bir bağlantı verir. Telefondan açıp APK'yı kur ("bilinmeyen kaynaklara izin ver" istenebilir).
Kontrol listesi: ses ve müzik, dil seçimi (değiştirince uygulama yeniden başlar), paylaşım kartı → Instagram, geri tuşu, test reklamı (kulüpte "+1 gelişim puanı").

## 3. Google Play Console (25 $, tek sefer)

1. play.google.com/console → **Uygulama oluştur**: ad "YOL: MMA Kariyer Simülasyonu", varsayılan dil Türkçe, **Oyun**, **Ücretsiz**.
2. **Önemli:** 2023'ten sonra açılan kişisel hesaplarda, üretime çıkmadan önce **en az 12 test kullanıcısıyla 14 gün kapalı test** zorunludur. Test kullanıcılarını (arkadaşlar, aile) erkenden topla.

## 4. AdMob (ücretsiz)

1. admob.google.com → Uygulamalar → **Uygulama ekle** → Android → (Play'de yayındaysa bağla, değilse "listelenmemiş").
2. **Uygulama kimliğini** (`ca-app-pub-…~…`) `app.json` › `react-native-google-mobile-ads` › `androidAppId` alanına yaz.
3. **Reklam birimi** oluştur: "Ödüllü" ve "Geçiş" → kimlikleri `src/monetization/ids.ts` › `REAL` içine yaz.
4. AdMob › Gizlilik ve mesajlaşma → **GDPR mesajı** oluştur ve yayınla (AB kullanıcıları için izin formu buradan gelir).
5. Kendi reklamlarına asla tıklama; testte test cihazı ya da test sürümü kullan (hesap askıya alınabilir).

## 5. Üretim derlemesi ve ilk yükleme

```bash
npx eas-cli@latest build -p android --profile production   # .aab üretir, sürüm kodu otomatik artar
```

Play Console → Test → **Dahili test** → Yeni sürüm → .aab dosyasını yükle (ilk seferde elle yüklemek en kolayı).
İmza anahtarını EAS yönetir; Play "Play Uygulama İmzalama"yı önerecek, kabul et.

## 6. Uygulama içi ürünler

Play, ürün oluşturmadan önce satın alma izni olan bir sürümün yüklenmiş olmasını ister (adım 5).
Para kazanma › Ürünler › **Uygulama içi ürünler** → her satır için "Ürün oluştur" (kimlikler kodla birebir aynı olmalı, `src/monetization/skus.ts`):

| Ürün kimliği | Ad | Açıklama | Öneri fiyat |
|---|---|---|---|
| `sampiyon_paketi` | Şampiyon Paketi | Reklamsız oyun, anında ödüller, 5 kariyer yuvası, Şampiyon çerçevesi | 2,99 $ |
| `reklamsiz` | Reklamsız Paket | Geçiş reklamlarını kaldırır | 1,49 $ |
| `paket_altin` | Altın Seri | Altın şort, eldiven, çerçeve, Kraliyet kemeri, Epik giriş müziği | 0,99 $ |
| `paket_sokak` | Sokak Dövüşçüsü | Kamuflaj şort, neon eldiven ve çerçeve, Karbon kemer, Trap giriş müziği | 0,99 $ |
| `paket_sultan` | Sultan | Bordo-altın şort, bordo eldiven, Sultan çerçevesi ve kemeri, Mehter giriş müziği | 1,49 $ |
| `paket_gece` | Gece Yarısı (epik) | Yıldız desenli mor şort, mor neon eldiven, Gece Yarısı çerçevesi ve kemeri, Şimşek giriş efekti | 1,49 $ |
| `paket_ejder` | Ejderha (efsanevi) | Alev desenli şort, ateş eldiveni, Ejderha çerçevesi ve kemeri, Ateş giriş efekti | 2,49 $ |
| `paket_buz` | Buz Kralı (efsanevi) | Şimşek desenli buz şortu, buz eldiveni, Buz Kralı çerçevesi ve kemeri, Kar Fırtınası giriş efekti | 2,49 $ |
| `paket_efsane` | Efsane Koleksiyonu | Bütün kozmetik paketleri (6 paket) tek alımda | 5,99 $ |

Hepsi tek seferlik (tüketilmeyen) ürün. Play ülkelere göre yerel fiyat önerir → her birini **Etkinleştir**.
Kozmetikler yalnızca görünümdür; oyun gücü vermez (Play'in "kazanmak için öde" algısından da uzak durur).

Lisans testi: Ayarlar › Lisans testi → kendi Gmail adresini ekle; böylece satın almayı ücret ödemeden deneyebilirsin.

## 7. Mağaza girişi

Büyüme › Mağazada görünüm › **Ana mağaza girişi**:
- Metinler: `store/listing.json` (tr-TR varsayılan; en-US, es-ES, pt-BR, ru-RU, pl-PL için "Çeviri ekle" → kendi metnini gir).
- Uygulama ikonu 512×512: `public/icon-512.png`
- Tanıtım görseli 1024×500: `store/graphics/<dil>/tanitim-1024x500.png`
- Telefon ekran görüntüleri (başlıklı, 1080×1920): `store/graphics/<dil>/01…08`. Her dilin çevirisine kendi klasöründekileri yükle.
- Tanıtım videosu: Play video dosyası kabul etmez; `store/video/yol-tanitim-tr.mp4`'ü (diğer diller için kendi dosyası) YouTube'a **Liste dışı** ya da herkese açık yükle, bağlantıyı "Video" alanına yapıştır. Reklamsız olsun diye YouTube'da para kazanmayı kapat.

## 8. Uygulama içeriği (Politika bölümü)

- **Gizlilik politikası:** `WEB_URL/gizlilik.html`
- **Reklamlar:** Evet, uygulama reklam içerir.
- **Uygulama erişimi:** Tüm işlevler kısıtlama olmadan kullanılabilir.
- **Hedef kitle:** **18 ve üzeri** seç. Oyunda sanal kumar (kumarhane), gece hayatı ve cinsel sağlık temaları var; çocuklara yönelik değil (Aileler politikasının dışında kalır).
- **İçerik derecelendirmesi (IARC anketi)** — dürüst yanıtlar:
  - Şiddet: gerçekçi olmayan (çizgi/animasyon) dövüş sporu şiddeti, kan az.
  - Cinsellik: cinsel temalara/mekânlara yazılı atıflar (striptiz kulübü, randevu, cinsel yolla bulaşan hastalık) — açık cinsel içerik yok.
  - Kumar: **sanal kumar var** (gerçek para yok). Bu genelde 16+/18+ derecelendirme getirir.
  - Uyuşturucu: doping (performans artırıcı) teması var.
  - Kullanıcı etkileşimi / sohbet: yok. Konum paylaşımı: yok. Dijital satın alma: var.
- **Veri güvenliği formu:**
  - Geliştirici veri toplamıyor; ancak **AdMob SDK'sı** topluyor → şunları işaretle: *Konum › Yaklaşık konum*, *Uygulama etkinliği › Uygulama etkileşimleri*, *Uygulama bilgileri ve performans › Kilitlenme günlükleri, Teşhis*, *Cihaz veya diğer kimlikler*. Amaç: Reklam veya pazarlama, Analiz, Dolandırıcılığı önleme. Üçüncü tarafla paylaşılıyor: Evet (Google). Aktarımda şifreli: Evet. Kullanıcı silme talebi: veriler geliştiricide tutulmuyor.
  - Satın almalar Google Play Faturalandırma ile yapılır (ödeme bilgisi geliştiriciye gelmez).
  - Google'ın güncel rehberini de kontrol et: support.google.com/admob/answer/10838479
- **Sağlık / Finans / Haber** uygulaması: Hayır. **Devlet uygulaması**: Hayır.

## 9. Kapalı test → üretim

1. Test › **Kapalı test** → parça oluştur → e-posta listesine 12+ test kullanıcısı ekle → sürümü (aynı .aab) yayınla → katılım bağlantısını paylaş.
2. 14 gün boyunca testçilerin uygulamayı yüklü tutması gerekir. Geri bildirimleri topla, düzeltmeleri `production` profiliyle yeni sürüm olarak yükle.
3. 14 gün sonra Kontrol paneli › **Üretime erişim başvurusu**.
4. Üretim → Ülkeler: önce **Türkiye ve Brezilya** (deneme yayını), veriler iyiyse tüm dünya.

## Sonraki sürümler

```bash
npx eas-cli@latest build -p android --profile production
npx eas-cli@latest submit -p android     # (isteğe bağlı) Google hizmet hesabı JSON'u ile otomatik yükleme
```

Ses motoru değişirse `node scripts/render-sounds.mjs`, ikon değişirse `node scripts/make-icons.mjs`, arayüz değişirse `node scripts/store-shots.mjs <dil>` ve `node scripts/promo-video.mjs <ffmpeg.exe> <dil>` yeniden çalıştırılır (ffmpeg: `npm i ffmpeg-static` ile geçici bir klasöre kurulabilir).
