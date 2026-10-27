# Saklambaç

**Kardiyo odaklı, gerçek zamanlı saklambaç.** Mahalleyi oyun alanına çevir. Kaçaklar saklanır, avcılar koşarak kovalar, telefon da hakemlik yapar.

Oyunu ekran başında değil, sokakta ve yürüyerek oynarsın. Avcılar kaçakları haritada canlı göremez. Birkaç dakikada bir gelen **ping**, kaçakların o anki yerini gösterir; gerisi tahmin, taktik ve kondisyon işi.

## Nasıl oynanır

1. **Kur:** Bir kişi haritada oyun alanını (400 m – 3 km) seçer. Süreyi, ping aralığını ve avansı ayarlar, 6 haneli kodu paylaşır.
2. **Katıl:** Arkadaşların kodla katılır ve Avcı, Kaçak ya da Rastgele seçer. Takımlar dengesizse oyun başlamaz. En az 3 oyuncu gerekir.
3. **Kaç:** Kaçaklar avans süresinde dağılıp alan içinde saklanır. Avcılar bekler.
4. **Avla:** Her pingte avcılar kaçakların konumunu görür. Kaçaklar yüz yüze yakalanır, yakalanan kaçak uygulamadan onaylar.
5. **Kazan:** Bütün kaçaklar yakalanırsa avcılar kazanır. Süre biterken serbest kalan varsa kaçaklar kazanır.

## Özellikler

- **Görünürlük kuralları:**
  - Takım arkadaşlarını canlı görürsün.
  - Avcılar kaçakları sadece pinglerde görür.
  - Kaçaklar avcıları hiç görmez.
  - Alanın dışında 30 saniyeden fazla kalan kaçak, avcılara canlı görünür.
- **Telsiz:** Takım içi sohbet, küfür filtresiyle.
- **Bildirimler:** Ping, yakalanma ve tur sonu bildirimleri. Sessiz ve sadece titreşimli, saklandığın yer ele verilmesin diye.
- **Arka planda konum:** Telefon cepteyken ve kilitliyken de konum gönderilir.
- **Karakterli tanıtım:** Doğan (avcı), Çevik (kaçak) ve Düdük (hakem).
- **Puan ve sıralama:** Haftalık ve tüm zamanlar; en iyi avcılar, en iyi kaçaklar, en çok oynayanlar.
- **Profil:** Fotoğraf, istatistikler ve son oyunlar.

## Teknoloji

| Katman | Kullanılan |
|---|---|
| Mobil | Expo SDK 58, React Native, Expo Router, react-native-maps, react-native-svg |
| Backend | Convex (gerçek zamanlı veritabanı, zamanlanmış işler, dosya depolama) |
| Giriş | @convex-dev/auth, e-posta ile tek kullanımlık kod (Resend) |
| Konum ve bildirim | expo-location + expo-task-manager, expo-notifications (Expo Push) |
| Oyun kuralları | `src/engine`: saf TypeScript, Vitest testleri |

## Geliştirme

```bash
npm install
CONVEX_AGENT_MODE=anonymous npx convex dev   # yerel backend (http://127.0.0.1:3211)
npx expo start                               # Expo geliştirme sunucusu
npm test                                     # oyun motoru testleri
```

- **Telefonda denemek:** `.env.development.local` dosyasına `EXPO_PUBLIC_CONVEX_URL=http://<Mac'in LAN IP'si>:3211` yaz.
- **Giriş kodları:** `AUTH_RESEND_KEY` tanımlı değilse kodlar e-postayla gitmez, Convex loguna yazılır.
- **Expo Go'nun sınırları:** Arka planda konum ve uzaktan push Expo Go'da çalışmaz. Bunlar için bir development build gerekir (`npx expo run:ios` / `run:android` ya da EAS).

Mimari ve API sözleşmesi: [CONTRACT.md](CONTRACT.md). v2 tasarımı ve benchmark: [docs/DESIGN-v2.md](docs/DESIGN-v2.md).
