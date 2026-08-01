/* =========================================================================
   speech.js — Web Speech API (ar-SA) ile telaffuz
   Arapça ses yoksa kullanıcıya dürüst bir uyarı gösterilir.
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  const supported = typeof window.speechSynthesis !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance !== 'undefined';

  let voices = [];
  let warned = false;

  function refreshVoices() {
    if (!supported) return;
    try {
      voices = window.speechSynthesis.getVoices() || [];
    } catch (e) {
      voices = [];
    }
  }

  if (supported) {
    refreshVoices();
    // Chrome sesleri asenkron yükler
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }

  function arabicVoice() {
    if (!voices.length) refreshVoices();
    return (
      voices.find((v) => (v.lang || '').toLowerCase() === 'ar-sa') ||
      voices.find((v) => (v.lang || '').toLowerCase().indexOf('ar') === 0) ||
      null
    );
  }

  function hasArabicVoice() {
    return !!arabicVoice();
  }

  /**
   * Metni Arapça olarak seslendirir.
   * @param {string} text
   * @param {number} rate 0.5–1 arası yavaşlatma (öğrenci için varsayılan 0.8)
   */
  function speak(text, rate) {
    const clean = String(text || '').trim();
    if (!clean) return;

    /* 1) Öğretmenin kendi kaydı varsa ONU çal — en doğru telaffuz budur. */
    if (AH.audio && AH.audio.has(clean)) {
      AH.audio.play(clean).then((ok) => { if (!ok) tts(clean, rate); });
      return;
    }
    /* 2) Yoksa cihazın Arapça sesine düş. */
    tts(clean, rate);
  }

  function tts(clean, rate) {
    if (!supported) {
      AH.ui && AH.ui.toast('Bu tarayıcı sesli okumayı desteklemiyor.', 'warn');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      const v = arabicVoice();
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      } else {
        u.lang = 'ar-SA';
        if (!warned) {
          warned = true;
          AH.ui &&
            AH.ui.toast(
              'Cihazında yüklü Arapça ses bulunamadı; telaffuz yanlış duyulabilir. ' +
                'Windows: Ayarlar → Saat ve Dil → Dil → Arapça konuşma paketi.',
              'warn',
              6000
            );
        }
      }
      u.rate = typeof rate === 'number' ? rate : 0.8;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('Seslendirme hatası', e);
    }
  }

  AH.speech = { supported, speak, hasArabicVoice, refreshVoices };
})();
