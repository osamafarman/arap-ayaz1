/* =========================================================================
   custom-paths.js — YÖNETİCİNİN ÇİZDİĞİ, UYGULAMAYA KALICI OLARAK
   KAYDEDİLMİŞ YAZIM YOLLARI

   Bu dosya, yönetici panelinde elle çizilen harf/kelime yollarının
   tarayıcıdan bağımsız, uygulamanın kendi içinde saklanan kopyasıdır.
   Tarayıcı verisi silinse bile buradaki yollar kaybolmaz.

   ⚠ KURAL: Bu dosyanın içeriği, yöneticinin AÇIK ONAYI olmadan
   değiştirilmez veya silinmez. Müfredat/veri güncellemeleri bu yolları
   ETKİLEMEZ — anahtarlar harfin/kelimenin kendisidir (ör. "ب", "باب").

   Nasıl güncellenir:
     Yönetici paneli → Çizim Yolu → "💾 Uygulamaya kaydet"
     düğmesi bu dosyanın yeni içeriğini üretir; indirilen dosyayı
     js/custom-paths.js ile değiştirmek yeterlidir.

   Öncelik sırası (tracing.js):
     1) tarayıcıdaki taze düzenleme (localStorage)
     2) BU DOSYA
     3) yazı tipinden otomatik hesaplanan yol
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  /* Biçim:
     "<harf ya da kelime>": {
       strokes: [ [[u,v], …], … ],   // her hamle ayrı dizi
       dots:    [ [u,v,r], … ],      // r = yarıçap (font boyu oranı)
       brush:   0.08,                // boyanan alan (isteğe bağlı)
       font:    "…"                  // çizildiği yazı tipinin parmak izi
     }
     u = sağ kenardan sola / harf genişliği,  v = satırdan aşağı / font boyu
  */
  AH.customPaths = {
    /* Henüz uygulamaya kaydedilmiş özel yol yok.
       Yönetici panelinden "💾 Uygulamaya kaydet" ile doldurulur. */
  };

  AH.customPathsMeta = {
    savedAt: null,
    count: 0
  };
})();
