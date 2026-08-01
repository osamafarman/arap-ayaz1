/* =========================================================================
   audio.js — Öğretmenin kendi sesiyle kaydettiği telaffuzlar

   Neden: Web Speech API cihazda Arapça ses paketi yoksa hiç çalışmıyor ya da
   yanlış okuyor. Öğretmen kendi sesini kaydederse doğru telaffuz garanti olur
   ve çocuk tanıdığı bir sesi duyar.

   Ses dosyaları IndexedDB'de saklanır (localStorage'a sığmazlar).
   Anahtar = okunacak metin (ör. "ب", "بَاب").
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  const DB = 'arapca-harfler-audio';
  const STORE = 'clips';
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) { rej(new Error('IndexedDB yok')); return; }
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => {
        const d = rq.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    return dbp;
  }

  function tx(mode) {
    return open().then((d) => d.transaction(STORE, mode).objectStore(STORE));
  }

  function put(key, blob) {
    return tx('readwrite').then((s) => new Promise((res, rej) => {
      const r = s.put(blob, key);
      r.onsuccess = () => res(true);
      r.onerror = () => rej(r.error);
    })).then(() => { cache[key] = true; return true; });
  }

  function get(key) {
    return tx('readonly').then((s) => new Promise((res, rej) => {
      const r = s.get(key);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => rej(r.error);
    }));
  }

  function del(key) {
    return tx('readwrite').then((s) => new Promise((res, rej) => {
      const r = s.delete(key);
      r.onsuccess = () => res(true);
      r.onerror = () => rej(r.error);
    })).then(() => { delete cache[key]; return true; });
  }

  function keys() {
    return tx('readonly').then((s) => new Promise((res, rej) => {
      const r = s.getAllKeys();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    }));
  }

  /* Hangi metinlerin kaydı var? — arayüzde işaret göstermek için önbellek */
  const cache = {};
  let ready = false;
  function warm() {
    return keys().then((ks) => {
      ks.forEach((k) => { cache[k] = true; });
      ready = true;
      return ks;
    }).catch(() => { ready = true; return []; });
  }
  function has(key) { return !!cache[key]; }
  function isReady() { return ready; }

  /** Kayıtlı ses varsa çalar; yoksa false döner (çağıran TTS'e düşer). */
  function play(key) {
    if (!cache[key]) return Promise.resolve(false);
    return get(key).then((blob) => {
      if (!blob) return false;
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      a.onended = a.onerror = () => setTimeout(() => URL.revokeObjectURL(url), 500);
      return a.play().then(() => true).catch(() => false);
    }).catch(() => false);
  }

  /* --- kayıt --- */
  function mimeType() {
    const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    for (const m of cands) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
    }
    return null;
  }

  /**
   * Mikrofondan kayıt başlatır. Döndürdüğü nesnenin stop() metodu
   * kaydı bitirip Blob döndürür.
   */
  function record() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error('Bu tarayıcı mikrofon erişimini desteklemiyor.'));
    }
    const mime = mimeType();
    if (!mime) return Promise.reject(new Error('Uygun ses biçimi bulunamadı.'));
    return navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      const stopped = new Promise((res) => { rec.onstop = res; });
      rec.start();
      return {
        stop() {
          rec.stop();
          return stopped.then(() => {
            stream.getTracks().forEach((t) => t.stop());
            return new Blob(chunks, { type: mime });
          });
        },
        cancel() {
          try { rec.stop(); } catch (e) {}
          stream.getTracks().forEach((t) => t.stop());
        }
      };
    });
  }

  warm();

  AH.audio = { put, get, del, keys, has, play, record, warm, isReady, supported: !!window.indexedDB };
})();
