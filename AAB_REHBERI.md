# Android App Bundle (.aab) Alma Rehberi

Bu proje, Google Play Store için **Android App Bundle (.aab)** üretmeye hazır şekilde yapılandırılmıştır.

Paket Kimliği (App ID): `com.olcico.ekransuresi`  
Uygulama Adı: `Haftalık Ekran Süresi`

---

## 1. Yöntem: Android Studio ile Tek Tıkla AAB Alma (Önerilen)

1. Projeyi sağ üstteki menüden **Export to ZIP** veya **Export to GitHub** seçeneğiyle bilgisayarınıza indirin.
2. Bilgisayarınızda terminali açıp proje dizininde bağımlılıkları yükleyin ve derleyin:
   ```bash
   npm install
   npm run build
   npx cap sync android
   ```
3. **Android Studio** programını açın ve proje içerisindeki **`android`** klasörünü seçerek projeyi açın.
4. Üst menüden sırasıyla:
   - **Build** > **Generate Signed Bundle / APK...**
   - **Android App Bundle** seçeneğini işaretleyip **Next** deyin.
   - Kendi anahtarınızı (keystore) seçin veya "Create new..." diyerek yeni bir imzalama anahtarı oluşturun.
   - **release** modunu seçip **Create** butonuna tıklayın.
5. Derleme tamamlandığında sağ altta çıkan bildirimden **"locate"** butonuna basarak `.aab` dosyanızı doğrudan alabilir ve Google Play Console'a yükleyebilirsiniz.

---

## 2. Yöntem: Komut Satırından Hızlı AAB Derleme

Bilgisayarınızda Java (JDK 21) ve Android SDK yüklüyse:

```bash
cd android
./gradlew bundleRelease
```
Oluşan `.aab` dosyasının konumu:
`android/app/build/outputs/bundle/release/app-release.aab`

---

## 3. Yöntem: GitHub Actions ile Otomatik AAB Alma

Projenize hazır `.github/workflows/build-aab.yml` dosyası eklenmiştir:
1. Projeyi **Export to GitHub** yaparak kendi GitHub reponuza aktarın.
2. Reponuzda **Actions** sekmesine gidin.
3. **Build Android App Bundle (AAB)** iş akışını seçip **Run workflow** butonuna basın.
4. İşlem bittiğinde AAB dosyanız doğrudan "Artifacts" bölümünden indirilebilir olacaktır.
