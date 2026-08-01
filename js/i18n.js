/* =========================================================================
   i18n.js — Arayüz dili (Türkçe / Arapça)

   KAPSAM — dürüstçe:
   Çevrilen şey ARAYÜZDÜR (düğmeler, ekran başlıkları, yönetici paneli).
   DERS İÇERİĞİ (harf adları "Elif/Be", kelimelerin Türkçe karşılıkları,
   yazım ipuçları) Türkçe kalır — çünkü öğrenci Türkçe konuşuyor ve bu
   metinler öğretimin kendisidir. Arapça seçeneği, uygulamayı yöneten
   Arapça konuşan öğretmen içindir.
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});
  const KEY = 'arapca-harfler-lang-v1';

  const AR = {
    /* kabuk */
    'Arapça Yazı Atölyesi': 'ورشة الخط العربي',
    'Adım adım: öğren · çalış · sınav ol': 'خطوة بخطوة: تعلّم · تدرّب · اختبر',
    '↺ Sıfırla': '↺ تصفير',
    'Yönetici modu (öğretmen)': 'وضع المشرف (المعلّم)',
    'Tüm ilerlemeyi sıfırla': 'تصفير كل التقدّم',

    /* harita */
    'Hoş geldin! 👋': 'أهلًا بك! 👋',
    'Kaldığın yerden devam et': 'تابع من حيث توقفت',
    'Derse Başla ➜': 'ابدأ الدرس ➜',
    'Devam Et ➜': 'تابع ➜',
    'Harf Şekilleri': 'أشكال الحروف',
    'Çalışma Kâğıdı': 'ورقة تدريب',
    'Bugünün tekrarı': 'مراجعة اليوم',
    'Başla ➜': 'ابدأ ➜',
    'Rapor': 'تقرير',
    'Öğrenciler': 'الطلاب',
    'ünite': 'وحدة',
    'BURADASIN': 'أنت هنا',

    /* oynatıcı */
    'ÖĞREN': 'تعلّم',
    'İZLE': 'شاهد',
    'TAKİP': 'تتبّع',
    'YAZ': 'اكتب',
    'KUR': 'ركّب',
    'KONTROL': 'تحقّق',
    'SINAV': 'اختبار',
    'Devam ➜': 'تابع ➜',
    'Anladım, yazalım ➜': 'فهمت، لنكتب ➜',
    'Şimdi ben deneyeyim ➜': 'الآن أجرّب بنفسي ➜',
    'Şimdi kuralım ➜': 'لنركّبها الآن ➜',
    '✔ Kontrol Et': '✔ تحقّق',
    '▶ Tekrar izle': '▶ شاهد مرة أخرى',
    '▶ Göster': '▶ اعرض',
    '↶ Geri Al': '↶ تراجع',
    '🗑 Temizle': '🗑 امسح',
    'Derslere dön': 'العودة إلى الدروس',
    'Geri': 'رجوع',
    'Ders tamamlandı!': 'اكتمل الدرس!',
    'Sıradaki ders ➜': 'الدرس التالي ➜',
    'Hız': 'السرعة',
    'Normal': 'عادي',

    /* yönetici */
    'Yönetici Modu': 'وضع المشرف',
    'Kelimeler': 'الكلمات',
    'Harfler': 'الحروف',
    'Çizim Yolu': 'مسار الرسم',
    'Ses Kaydı': 'تسجيل الصوت',
    'Yedek': 'نسخة احتياطية',
    '✕ Kapat': '✕ إغلاق',
    'Kaydet': 'حفظ',
    'Vazgeç': 'إلغاء',
    'Sil': 'حذف',
    'Düzenle': 'تحرير',
    'Yolu kaydet': 'حفظ المسار',
    '⬇ Video indir': '⬇ تنزيل فيديو',
    '⬇⬇ Tüm biçimler': '⬇⬇ كل الأشكال',
    '🖨 Yazdır': '🖨 طباعة'
  };

  let lang = (function () {
    try { return localStorage.getItem(KEY) === 'ar' ? 'ar' : 'tr'; } catch (e) { return 'tr'; }
  })();

  function get() { return lang; }
  function isAr() { return lang === 'ar'; }

  function set(l) {
    lang = (l === 'ar') ? 'ar' : 'tr';
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    applyDocument();
  }
  function toggle() { set(lang === 'ar' ? 'tr' : 'ar'); }

  /** Arayüz metnini çevirir; karşılığı yoksa aynen bırakır. */
  function t(s) {
    if (lang !== 'ar') return s;
    return Object.prototype.hasOwnProperty.call(AR, s) ? AR[s] : s;
  }

  /** Sayfa yönü ve kabuk metinleri. */
  function applyDocument() {
    const html = document.documentElement;
    html.setAttribute('lang', lang === 'ar' ? 'ar' : 'tr');
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.body.classList.toggle('lang-ar', lang === 'ar');
    /* sabit kabuk metinleri */
    const map = [
      ['.brand h1', 'Arapça Yazı Atölyesi'],
      ['.brand p', 'Adım adım: öğren · çalış · sınav ol'],
      ['#reset-btn', '↺ Sıfırla']
    ];
    map.forEach(([sel, key]) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = t(key);
    });
    const lb = document.getElementById('lang-btn');
    if (lb) lb.textContent = lang === 'ar' ? 'TR' : 'ع';
  }

  AH.i18n = { t, get, set, toggle, isAr, applyDocument, DICT: AR };
})();
