# Yazı tipi (isteğe bağlı ama ÖNEMLİ)

Uygulama harflerin **orta eksenini ve nokta yerlerini ekrandaki gerçek yazı
tipinden** hesaplar. Yazı tipi cihazdan cihaza değişirse:

* harf şekilleri değişir,
* yönetici olarak **elle çizdiğin yollar kayabilir**,
* bazı yazı tiplerinde ت / ث noktaları birleşik çizildiği için nokta
  algılaması farklı çalışır.

Bunu ortadan kaldırmak için uygulamayla birlikte tek bir nesih yazı tipi
dağıtman yeterlidir.

## Nasıl eklenir (tek adım)

1. Ücretsiz ve dağıtım izni olan bir nesih yazı tipi indir. Önerilenler:
   * **Amiri** — <https://github.com/aliftype/amiri/releases> (OFL lisans)
   * **Scheherazade New** — <https://software.sil.org/scheherazade/> (OFL lisans)
2. İndirdiğin `.woff2` (yoksa `.ttf`) dosyasını bu klasöre koy ve adını
   **`naskh.woff2`** (ya da `naskh.ttf`) yap.
3. Tarayıcıyı yenile. Uygulama dosyayı kendiliğinden kullanır —
   `css/style.css` içindeki `@font-face` zaten hazır bekliyor.

Dosya yoksa uygulama sorunsuz çalışmaya devam eder; sistemdeki Arapça yazı
tipine (Windows’ta genelde *Traditional Arabic*) düşer.

## Yazı tipi değişirse ne olur?

Yönetici panelinde bir yol kaydettiğinde, o anki yazı tipinin **parmak izi**
de kaydedilir. Daha sonra farklı bir yazı tipiyle açılırsa çizim
düzenleyicide uyarı çıkar — çünkü kaydettiğin yol o harfin eski şekline
göre çizilmişti.
