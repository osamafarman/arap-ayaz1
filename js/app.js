/* =========================================================================
   app.js — Doğrusal ders oynatıcısı
   İki ekran vardır:
     'map'  → yol haritası (nerede olduğunu görür, ileri atlayamaz)
     'unit' → ders oynatıcı (ekranda TEK adım, tek büyük düğme)
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});
  const D = AH.data;
  const C = AH.course;
  const S = AH.storage;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* Arayüz metni çevirisi (ders içeriği Türkçe kalır — bkz. js/i18n.js) */
  const t = (s) => (AH.i18n ? AH.i18n.t(s) : s);

  const ui = (AH.ui = {
    toast(msg, kind, ms) {
      const host = $('#toast-host');
      if (!host) return;
      const el = document.createElement('div');
      el.className = 'toast ' + (kind || 'info');
      el.textContent = msg;
      host.appendChild(el);
      setTimeout(() => el.classList.add('show'), 10);
      setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
      }, ms || 3200);
    }
  });

  /* Kullanıcı tercihleri (animasyon hızı vb.) */
  const PREF_KEY = 'arapca-harfler-prefs-v2';
  const prefs = (function () {
    let p = { demoSpeed: 1 };
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) p = Object.assign(p, JSON.parse(raw));
    } catch (e) {}
    return {
      get: (k) => p[k],
      set(k, v) {
        p[k] = v;
        try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (e) {}
      }
    };
  })();

  /* ------------------------------------------------------------------ */
  /* Durum                                                               */
  /* ------------------------------------------------------------------ */
  const view = {
    screen: 'map',
    unit: null,
    stepIndex: 0,
    attempts: 0,        /* aktif adımdaki deneme sayısı */
    examRun: null,      /* sınav sırasında {items:[{id, ok}]} */
    refLetter: null,    /* "Harf Şekilleri" ekranında seçili harf */
    refForm: 'isolated',
    openStages: {}      /* haritada hangi aşama açık */
  };

  let pad = null;       /* aktif tuval */

  /* --- yazım animasyonu hızı (0.5× yavaş … 2× hızlı) --- */
  const SPEEDS = [0.5, 0.75, 1, 1.5, 2];
  const DEMO_BASE_MS = 2600;

  function demoSpeed() {
    const v = Number(prefs.get('demoSpeed'));
    return SPEEDS.indexOf(v) >= 0 ? v : 1;
  }
  function demoDuration() {
    return Math.round(DEMO_BASE_MS / demoSpeed());
  }
  function speedBarHTML() {
    const cur = demoSpeed();
    return '<div class="speed-bar"><span>' + t('Hız') + '</span>' +
      SPEEDS.map((s) =>
        '<button type="button" class="speed-btn' + (s === cur ? ' on' : '') +
        '" data-speed="' + s + '">' + (s === 1 ? t('Normal') : s + '×') + '</button>'
      ).join('') + '</div>';
  }
  /** Hız düğmelerini bağlar; değişince onChange ile animasyon yeniden oynatılır. */
  function wireSpeed(root, onChange) {
    $$('.speed-btn', root).forEach((b) =>
      b.addEventListener('click', () => {
        prefs.set('demoSpeed', Number(b.dataset.speed));
        $$('.speed-btn', root).forEach((x) => x.classList.toggle('on', x === b));
        if (onChange) onChange();
      })
    );
  }

  /* ------------------------------------------------------------------ */
  /* Ekran 1 — YOL HARİTASI                                              */
  /* ------------------------------------------------------------------ */
  /**
   * Tuvali büyütme/küçültme. Özellikle telefonda parmakla yazarken
   * alan dar kalıyordu; bu düğme yazı alanını ekranı kaplayacak
   * şekilde genişletir.
   */
  function wireExpand() {
    const btn = $('[data-act="expand"]');
    const stage = $('#write-stage');
    if (!btn || !stage) return;
    btn.addEventListener('click', () => {
      const on = stage.classList.toggle('expanded');
      document.body.classList.toggle('canvas-expanded', on);
      btn.textContent = on ? '⤡' : '⛶';
      btn.title = on ? 'Küçült' : 'Büyüt';
      /* tuval yeni ölçüsüne göre yeniden hesaplansın */
      setTimeout(() => { if (pad) pad.resize(); }, 30);
    });
  }

  /* Kompakt hız şeridi (yan araç çubuğu için) */
  function speedRailHTML() {
    const cur = demoSpeed();
    return '<div class="speed-rail">' +
      SPEEDS.map((s) =>
        '<button type="button" class="speed-btn mini' + (s === cur ? ' on' : '') +
        '" data-speed="' + s + '">' + (s === 1 ? '1×' : s + '×') + '</button>'
      ).join('') + '</div>';
  }

  /* --- öğrenci profili şeridi --- */
  function profileBarHTML() {
    const me = S.activeProfile();
    const list = S.listProfiles();
    const st = S.streak();
    const stars = S.totalStars();
    return [
      '<div class="profile-bar">',
      '  <button type="button" class="profile-chip" data-act="profiles">',
      '    <span class="pf-avatar">' + me.avatar + '</span>',
      '    <span class="pf-name">' + esc(me.name) + '</span>',
      list.length > 1 ? '<span class="pf-count">' + list.length + ' öğrenci</span>' : '',
      '  </button>',
      '  <span class="reward-chip" title="Kazanılan yıldız">⭐ ' + stars + '</span>',
      '  <span class="reward-chip' + (st.count > 0 ? ' hot' : '') + '" title="Üst üste çalışılan gün">🔥 ' +
        st.count + ' gün</span>',
      '  <button type="button" class="reward-chip link" data-act="report">📊 ' + t('Rapor') + '</button>',
      '</div>'
    ].join('');
  }

  function reviewCardHTML() {
    const due = S.dueSteps(30);
    if (!due.length) return '';
    return [
      '<button type="button" class="review-card" data-act="review">',
      '  <span class="rv-icon">🔁</span>',
      '  <span class="rv-text"><b>Bugünün tekrarı</b>',
      '    <i>' + due.length + ' harf/kelime tekrar zamanı geldi — unutmadan çalış</i></span>',
      '  <span class="rv-go">' + t('Başla ➜') + '</span>',
      '</button>'
    ].join('');
  }

  function renderMap() {
    const o = S.overall();
    const next = S.nextUnit();
    const started = S.hasStarted();

    const stagesHTML = C.COURSE.map((stage) => {
      const unlocked = S.isStageUnlocked(stage.stageId);
      const p = S.stageProgress(stage);
      let lastGroup = null;

      const unitsHTML = stage.units
        .map((u) => {
          const uUnlocked = S.isUnitUnlocked(u);
          const done = S.isUnitComplete(u);
          const isNext = next && u.id === next.id;
          const up = S.unitProgress(u);
          let head = '';
          if (u.group !== lastGroup) {
            lastGroup = u.group;
            head = '<li class="path-group"><span>' + esc(u.group) + '</span></li>';
          }
          return (
            head +
            '<li class="path-item' + (done ? ' done' : '') + (uUnlocked ? '' : ' locked') +
              (isNext ? ' current' : '') + '">' +
            '<button type="button" class="unit-btn" data-unit="' + u.id + '"' +
              (uUnlocked ? '' : ' aria-disabled="true"') + '>' +
            '  <span class="unit-icon' + (u.iconArabic ? ' ar' : '') + '"' +
                (u.iconArabic ? ' dir="rtl"' : '') + '>' +
                (uUnlocked ? (done ? '✓' : esc(u.icon)) : '🔒') + '</span>' +
            '  <span class="unit-text">' +
            '    <b>' + esc(u.title) + '</b>' +
            '    <i>' + esc(u.subtitle || '') + (u.tag ? ' · ' + esc(u.tag) : '') + '</i>' +
            '  </span>' +
            (done
              ? '<span class="unit-stars">' + '★'.repeat(S.unitStars(u)) +
                '<i>' + '★'.repeat(3 - S.unitStars(u)) + '</i></span>'
              : up.done > 0
                ? '<span class="unit-mini">' + up.done + '/' + up.total + '</span>'
                : '') +
            (isNext ? '<span class="unit-now">' + t('BURADASIN') + '</span>' : '') +
            '</button></li>'
          );
        })
        .join('');

      /* 7 aşama × ~25 ünite çok uzun bir liste yapıyor:
         yalnızca çalışılan aşama açık gelir, diğerleri katlanır. */
      const isOpen = view.openStages[stage.stageId] != null
        ? view.openStages[stage.stageId]
        : (next && next.stageId === stage.stageId);

      return [
        '<section class="stage-block' + (isOpen ? '' : ' collapsed') + '">',
        '  <button type="button" class="stage-block-head" data-stage="' + stage.stageId + '">',
        '    <div>',
        '      <h2>' + esc(stage.title) + ' <span dir="rtl" class="stage-letters">' + esc(stage.lettersLabel) + '</span></h2>',
        '      <p>' + esc(stage.subtitle) + '</p>',
        '    </div>',
        '    <div class="stage-block-meta">' +
          '<b>' + p.unitsDone + '/' + p.unitsTotal + '</b><span>' + t('ünite') + '</span>' +
          (p.stars ? '<span class="stage-stars">⭐ ' + p.stars + '</span>' : '') +
          '</div>',
        '    <span class="stage-caret">' + (isOpen ? '▾' : '▸') + '</span>',
        '  </button>',
        '  <div class="mini-bar stage-mini"><span style="width:' + p.pct + '%"></span></div>',
        isOpen ? '<ol class="path">' + unitsHTML + '</ol>' : '',
        '</section>'
      ].join('');
    }).join('');

    $('#app').innerHTML = [
      '<div class="map-screen">',
      profileBarHTML(),
      reviewCardHTML(),
      '  <div class="map-hero">',
      '    <div>',
      '      <h1>' + (started ? t('Kaldığın yerden devam et') : t('Hoş geldin! 👋')) + '</h1>',
      '      <p>' + (started
          ? 'Sıradaki dersin: <b>' + esc(next.title) + '</b>'
          : 'Hiç Arapça bilmiyorsan tam doğru yerdesin. Seni harf harf, adım adım götüreceğim.') + '</p>',
      '    </div>',
      '    <button type="button" class="btn btn-primary btn-xl" data-act="continue">' +
        (started ? t('Devam Et ➜') : t('Derse Başla ➜')) + '</button>',
      '  </div>',
      '  <div class="map-progress">',
      '    <div class="overall-bar"><span style="width:' + o.pct + '%"></span></div>',
      '    <span>' + o.done + ' / ' + o.total + ' adım tamamlandı · %' + o.pct + '</span>',
      '  </div>',

      /* Başvuru bölümü — derslerden bağımsız, her zaman açık */
      '  <button type="button" class="alpha-entry" data-act="alphabet">',
      '    <span class="alpha-entry-icon">📖</span>',
      '    <span class="alpha-entry-text">',
      '      <b>' + t('Harf Şekilleri') + '</b>',
      '      <i>28 harfin yazılışı — animasyonlu, hızı ayarlanabilir</i>',
      '    </span>',
      '    <span class="alpha-entry-preview" dir="rtl">ا ب ج د</span>',
      '  </button>',
      '  <button type="button" class="alpha-entry sheet" data-act="worksheet">',
      '    <span class="alpha-entry-icon">🖨</span>',
      '    <span class="alpha-entry-text">',
      '      <b>' + t('Çalışma Kâğıdı') + '</b>',
      '      <i>Kâğıda yazdır — kalemle çalışmak için kılavuzlu sayfa</i>',
      '    </span>',
      '    <span class="alpha-entry-preview">A4</span>',
      '  </button>',

      stagesHTML,
      '</div>'
    ].join('');

    $('[data-act="continue"]').addEventListener('click', () => openUnit(next));
    $('[data-act="alphabet"]').addEventListener('click', () => openAlphabet());
    $('[data-act="worksheet"]').addEventListener('click', () => openWorksheet());
    $('[data-act="profiles"]').addEventListener('click', openProfiles);
    $('[data-act="report"]').addEventListener('click', openReport);
    const rv = $('[data-act="review"]');
    if (rv) rv.addEventListener('click', startReview);

    $$('.stage-block-head').forEach((h) =>
      h.addEventListener('click', () => {
        const id = Number(h.dataset.stage);
        const cur = view.openStages[id] != null
          ? view.openStages[id]
          : (next && next.stageId === id);
        view.openStages[id] = !cur;
        renderMap();
      })
    );

    $$('.unit-btn').forEach((b) =>
      b.addEventListener('click', () => {
        const u = C.getUnit(b.dataset.unit);
        if (!S.isUnitUnlocked(u)) {
          ui.toast('🔒 Sırası gelmedi. Önce bir önceki dersi bitir.', 'warn');
          return;
        }
        openUnit(u);
      })
    );
  }

  /* ------------------------------------------------------------------ */
  /* ÇALIŞMA KÂĞIDI — kâğıt üstünde kalemle çalışmak için                */
  /* ------------------------------------------------------------------ */
  function openWorksheet(preset) {
    const letters = D.ALPHABET;
    const sel = view.wsSel || (preset ? [preset] : [letters[0].forms.isolated]);
    view.wsSel = sel;
    const rows = view.wsRows || 4;

    /* Bir satır: solmuş örnekler + boş kutular */
    function rowHTML(glyph) {
      const faded = 3, empty = 6;
      let cells = '';
      for (let i = 0; i < faded; i++) cells += '<span class="ws-cell faded" dir="rtl">' + esc(glyph) + '</span>';
      for (let i = 0; i < empty; i++) cells += '<span class="ws-cell"></span>';
      return '<div class="ws-row"><span class="ws-tag" dir="rtl">' + esc(glyph) + '</span>' +
             '<div class="ws-line">' + cells + '</div></div>';
    }

    $('#app').innerHTML = [
      '<div class="sub-screen ws-screen">',
      '  <header class="sub-head no-print">',
      '    <button type="button" class="round-btn" data-act="back">‹</button>',
      '    <div><h1>Çalışma Kâğıdı</h1><p>Seçtiğin harfleri kâğıda yazdır; ' +
      'çocuk kalemle solmuş örneklerin üstünden geçip boş kutuları doldursun.</p></div>',
      '  </header>',

      '  <div class="ws-picker no-print">',
      letters.map((L) =>
        ['isolated', 'initial', 'medial', 'final']
          .filter((k, i, arr) => arr.indexOf(arr.find((x) => L.forms[x] === L.forms[k])) === i)
          .map((k) => {
            const g = L.forms[k];
            return '<button type="button" class="ws-pick' + (sel.indexOf(g) >= 0 ? ' on' : '') +
              '" data-g="' + esc(g) + '"><span dir="rtl">' + esc(g) + '</span></button>';
          }).join('')
      ).join(''),
      '  </div>',
      '  <div class="ws-tools no-print">',
      '    <label>Satır sayısı <input type="number" id="ws-rows" min="1" max="12" value="' + rows + '"></label>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="clear">Seçimi temizle</button>',
      '    <button type="button" class="btn btn-primary" data-act="print">🖨 Yazdır</button>',
      '  </div>',

      '  <div class="ws-sheet" id="ws-sheet">',
      '    <div class="ws-head"><b>Arapça Yazı Atölyesi</b><span>Ad: ______________  Tarih: ____________</span></div>',
      sel.length
        ? sel.map((g) => new Array(rows).fill(0).map(() => rowHTML(g)).join('')).join('')
        : '<p class="empty">Yukarıdan en az bir harf seç.</p>',
      '  </div>',
      '</div>'
    ].join('');

    $('[data-act="back"]').addEventListener('click', exitToMap);
    $('[data-act="print"]').addEventListener('click', () => window.print());
    $('[data-act="clear"]').addEventListener('click', () => { view.wsSel = []; openWorksheet(); });
    $('#ws-rows').addEventListener('change', (e) => {
      view.wsRows = Math.max(1, Math.min(12, Number(e.target.value) || 4));
      openWorksheet();
    });
    $$('.ws-pick').forEach((b) => b.addEventListener('click', () => {
      const g = b.dataset.g;
      const i = view.wsSel.indexOf(g);
      if (i >= 0) view.wsSel.splice(i, 1); else view.wsSel.push(g);
      openWorksheet();
    }));
  }

  /* ------------------------------------------------------------------ */
  /* TEKRAR — aralıklı tekrar oturumu                                    */
  /* ------------------------------------------------------------------ */
  function startReview() {
    const due = S.dueSteps(12);
    if (!due.length) { ui.toast('Şu an tekrar edilecek bir şey yok.', 'info'); return; }
    /* Mevcut oynatıcıyı yeniden kullanmak için sanal bir ünite kur */
    openUnit({
      id: 'REVIEW',
      title: 'Bugünün tekrarı',
      group: 'Tekrar',
      icon: '🔁',
      stageId: due[0].step.letter ? 1 : 1,
      index: 0,
      isReview: true,
      steps: due.map((d) => d.step)
    });
    ui.toast('Tekrar oturumu: ' + due.length + ' alıştırma.', 'info');
  }

  /* ------------------------------------------------------------------ */
  /* PROFİLLER — birden çok öğrenci                                      */
  /* ------------------------------------------------------------------ */
  function openProfiles() {
    const list = S.listProfiles();
    const active = S.activeProfile();
    $('#app').innerHTML = [
      '<div class="sub-screen">',
      '  <header class="sub-head">',
      '    <button type="button" class="round-btn" data-act="back">‹</button>',
      '    <div><h1>Öğrenciler</h1><p>Aynı cihazı birden çok öğrenci kullanabilir; ' +
      'her birinin ilerlemesi ayrı tutulur.</p></div>',
      '  </header>',
      '  <div class="pf-list">',
      list.map((p) => {
        const isMe = p.id === active.id;
        return '<div class="pf-row' + (isMe ? ' on' : '') + '">' +
          '<span class="pf-avatar big">' + p.avatar + '</span>' +
          '<span class="pf-row-name">' + esc(p.name) + (isMe ? ' <i>(seçili)</i>' : '') + '</span>' +
          (isMe ? '' : '<button type="button" class="btn btn-ghost btn-sm" data-use="' + p.id + '">Seç</button>') +
          '<button type="button" class="btn btn-ghost btn-sm" data-rename="' + p.id + '">Adı değiştir</button>' +
          (list.length > 1 ? '<button type="button" class="btn btn-ghost btn-sm danger" data-del="' + p.id + '">Sil</button>' : '') +
          '</div>';
      }).join(''),
      '  </div>',
      '  <div class="admin-actions">',
      '    <button type="button" class="btn btn-primary" data-act="add">+ Yeni öğrenci</button>',
      '  </div>',
      '</div>'
    ].join('');

    $('[data-act="back"]').addEventListener('click', exitToMap);
    $('[data-act="add"]').addEventListener('click', () => {
      const n = prompt('Öğrencinin adı:');
      if (n === null) return;
      S.addProfile(n.trim() || 'Öğrenci');
      openProfiles();
    });
    $$('[data-use]').forEach((b) => b.addEventListener('click', () => {
      S.switchProfile(b.dataset.use);
      ui.toast('Öğrenci değiştirildi.', 'good');
      exitToMap();
    }));
    $$('[data-rename]').forEach((b) => b.addEventListener('click', () => {
      const p = S.listProfiles().find((x) => x.id === b.dataset.rename);
      const n = prompt('Yeni ad:', p ? p.name : '');
      if (n === null) return;
      S.renameProfile(b.dataset.rename, n.trim());
      openProfiles();
    }));
    $$('[data-del]').forEach((b) => b.addEventListener('click', () => {
      if (!confirm('Bu öğrenci ve tüm ilerlemesi silinecek. Emin misin?')) return;
      S.removeProfile(b.dataset.del);
      openProfiles();
    }));
  }

  /* ------------------------------------------------------------------ */
  /* RAPOR — öğretmen/veli için zayıf nokta özeti                        */
  /* ------------------------------------------------------------------ */
  const CODE_LABEL = {
    start: 'Yanlış yerden başlama',
    reverse: 'Ters yönde yazma',
    wander: 'Kalemi gezdirme',
    short: 'Harfi tamamlamama',
    'dots-missing': 'Nokta eksik / yanlış yerde',
    'dots-extra': 'Fazla nokta',
    'dots-none': 'Olmayan nokta koyma',
    coverage: 'Harfin bir kısmını boş bırakma',
    precision: 'Çizgiyi dışarı taşırma',
    proportion: 'Harfi çok büyük/küçük yazma',
    baseline: 'Satıra oturmama',
    'no-body': 'Gövdeyi çizmeme'
  };

  function openReport() {
    const r = S.report();
    const me = S.activeProfile();
    const o = S.overall();
    const st = S.streak();
    const metric = (label, v) => v == null ? '' :
      '<div class="mini-metric"><span>' + label + '</span>' +
      '<i class="' + (v >= 80 ? 'ok' : v >= 55 ? 'mid' : 'no') + '">' +
      '<b style="width:' + Math.max(3, v) + '%"></b></i><em>%' + v + '</em></div>';

    const codes = Object.keys(r.codes).sort((a, b) => r.codes[b] - r.codes[a]);

    $('#app').innerHTML = [
      '<div class="sub-screen">',
      '  <header class="sub-head">',
      '    <button type="button" class="round-btn" data-act="back">‹</button>',
      '    <div><h1>Rapor — ' + esc(me.name) + '</h1>',
      '    <p>Yazma denemelerinden çıkarılan özet. Öğretmen/veli içindir.</p></div>',
      '  </header>',

      '  <div class="rep-grid">',
      '    <div class="rep-card"><b>' + o.done + '/' + o.total + '</b><span>adım</span></div>',
      '    <div class="rep-card"><b>⭐ ' + S.totalStars() + '</b><span>yıldız</span></div>',
      '    <div class="rep-card"><b>🔥 ' + st.count + '</b><span>günlük seri (en iyi ' + st.best + ')</span></div>',
      '    <div class="rep-card"><b>' + r.attempts + '</b><span>yazma denemesi</span></div>',
      '    <div class="rep-card"><b>%' + r.passRate + '</b><span>ilk seferde geçme</span></div>',
      '  </div>',

      r.attempts
        ? '<section class="rep-sec"><h2>Beceri ortalamaları</h2><div class="write-metrics">' +
          metric('Şekil', r.avg.shape) + metric('Başlangıç', r.avg.start) +
          metric('Yön', r.avg.direction) + metric('Noktalar', r.avg.dots) +
          metric('Büyüklük', r.avg.proportion) + metric('Satıra oturma', r.avg.baseline) +
          '</div></section>'
        : '<p class="empty">Henüz yazma denemesi yok. Birkaç harf yazınca rapor dolmaya başlar.</p>',

      codes.length
        ? '<section class="rep-sec"><h2>En sık yapılan hatalar</h2><ul class="rep-list">' +
          codes.slice(0, 6).map((c) =>
            '<li><span>' + esc(CODE_LABEL[c] || c) + '</span><b>' + r.codes[c] + ' kez</b></li>').join('') +
          '</ul></section>'
        : '',

      r.weakest.length
        ? '<section class="rep-sec"><h2>En çok zorlanılan alıştırmalar</h2><ul class="rep-list">' +
          r.weakest.map((w) => {
            const stp = AH.course.allSteps().find((s) => s.id === w.id);
            const name = stp ? (stp.glyph || stp.target || stp.title) : w.id;
            return '<li><span class="ar-mini" dir="rtl">' + esc(name) + '</span>' +
              '<b>' + w.fails + '/' + w.tries + ' başarısız</b></li>';
          }).join('') + '</ul></section>'
        : '',

      '  <div class="admin-actions">',
      '    <button type="button" class="btn btn-ghost" data-act="print">🖨 Yazdır</button>',
      '  </div>',
      '</div>'
    ].join('');

    $('[data-act="back"]').addEventListener('click', exitToMap);
    $('[data-act="print"]').addEventListener('click', () => window.print());
  }

  /* ------------------------------------------------------------------ */
  /* Ekran 0 — HARF ŞEKİLLERİ (başvuru: 28 harfin yazılışı)              */
  /* ------------------------------------------------------------------ */
  /** Bir harfin tekrar etmeyen biçimlerini etiketleriyle döndürür. */
  function distinctForms(L) {
    const order = [
      ['isolated', 'Yalın'], ['initial', 'Başta'],
      ['medial', 'Ortada'], ['final', 'Sonda']
    ];
    const out = [];
    order.forEach(([key, label]) => {
      const g = L.forms[key];
      const hit = out.find((o) => o.glyph === g);
      if (hit) hit.label += ' / ' + label;
      else out.push({ key, label, glyph: g });
    });
    return out;
  }

  function openAlphabet(char) {
    if (pad) { pad.destroy(); pad = null; }
    view.screen = 'alphabet';
    view.refLetter = char || view.refLetter || D.ALPHABET[0].char;
    view.refForm = 'isolated';
    renderAlphabet();
    window.scrollTo(0, 0);
  }

  function renderAlphabet() {
    const L = D.getLetter(view.refLetter) || D.ALPHABET[0];
    const forms = distinctForms(L);
    if (!forms.some((f) => f.key === view.refForm)) view.refForm = forms[0].key;
    const active = forms.find((f) => f.key === view.refForm) || forms[0];
    const rule = AH.letterforms.get(L.char, active.key);

    $('#app').innerHTML = [
      '<div class="alpha-screen">',
      '  <header class="alpha-head">',
      '    <button type="button" class="round-btn" data-act="back" title="Derslere dön">‹</button>',
      '    <div><h1>Harf Şekilleri</h1><p>28 harfin yazılışı — nereden başlanır, nasıl çizilir</p></div>',
      '  </header>',

      '  <div class="alpha-grid">',
      D.ALPHABET.map((x) =>
        '<button type="button" class="alpha-chip' + (x.char === L.char ? ' on' : '') +
        '" data-char="' + x.char + '">' +
        '<span class="alpha-glyph" dir="rtl">' + x.char + '</span>' +
        '<span class="alpha-name">' + esc(x.name) + '</span></button>'
      ).join(''),
      '  </div>',

      '  <section class="alpha-detail">',
      '    <div class="alpha-detail-head">',
      '      <div>',
      '        <h2>' + esc(L.name) + ' <span dir="rtl">' + L.char + '</span></h2>',
      '        <p>' + esc(L.sound) + '</p>',
      '      </div>',
      '      <button type="button" class="icon-btn" data-act="say" title="Dinle">🔊</button>',
      '    </div>',

      '    <div class="form-tabs" role="tablist">',
      forms.map((f) =>
        '<button type="button" class="form-tab' + (f.key === active.key ? ' on' : '') +
        '" data-form="' + f.key + '">' +
        '<span dir="rtl">' + f.glyph + '</span><i>' + esc(f.label) + '</i></button>'
      ).join(''),
      '    </div>',

      '    <div class="canvas-frame"><canvas class="pad" aria-label="Yazım gösterimi"></canvas></div>',
      '    <div class="watch-bar">',
      '      <button type="button" class="btn btn-sound btn-lg" data-act="replay">' + t('▶ Tekrar izle') + '</button>',
      '    </div>',
      speedBarHTML(),

      rule ? '<ol class="phase-list">' + rule.phases.map((p) => '<li>' + esc(p) + '</li>').join('') + '</ol>' : '',
      rule ? '<p class="trace-help">🟢 ' + esc(rule.startTip) + ' ' + esc(rule.dirTip) + '</p>' : '',
      L.dots
        ? '<p class="trace-help dots-tip">🟠 ' + L.dots + ' nokta, harfin ' + esc(L.dotSide) +
          '. Noktalar EN SONA yazılır.</p>'
        : '<p class="trace-help">Bu harfin noktası yoktur.' +
          (rule && rule.extra ? ' ' + esc(rule.extra) : '') + '</p>',
      !L.joinsForward
        ? '<p class="trace-help">⛓️‍💥 Bu harf kendinden SONRAKİ harfe bağlanmaz.</p>'
        : '',
      rule && rule.source === 'family'
        ? '<p class="alpha-src">Bu harf, kitapçıkta <b>' + esc(rule.familyLabel) +
          '</b> ailesiyle aynı iskeleti paylaşır; yazım yönü o aileden alınmıştır.</p>'
        : (rule && rule.page
            ? '<p class="alpha-src">Yazım yönü: kitapçık s.' + rule.page + '</p>'
            : ''),
      '  </section>',
      '</div>'
    ].join('');

    $('[data-act="back"]').addEventListener('click', exitToMap);
    $('[data-act="say"]').addEventListener('click', () => AH.speech.speak(L.char));
    $$('.alpha-chip').forEach((b) =>
      b.addEventListener('click', () => {
        view.refLetter = b.dataset.char;
        view.refForm = 'isolated';
        renderAlphabet();
      })
    );
    $$('.form-tab').forEach((b) =>
      b.addEventListener('click', () => {
        view.refForm = b.dataset.form;
        renderAlphabet();
      })
    );

    pad = AH.tracing.create($('canvas.pad'), {});
    pad.setForm(rule);
    pad.setWord(active.glyph);
    pad.setGhost(true);
    pad.setLocked(true);

    function play() {
      pad.clear();
      pad.playDemo({ duration: demoDuration(), onDone() { pad.setShowStart(true); } });
    }
    $('[data-act="replay"]').addEventListener('click', play);
    wireSpeed(document, play);
    setTimeout(play, 250);
  }

  /* ------------------------------------------------------------------ */
  /* Ekran 2 — DERS OYNATICI                                             */
  /* ------------------------------------------------------------------ */
  function openUnit(unit) {
    view.screen = 'unit';
    view.unit = unit;
    view.stepIndex = S.unitCursor(unit);
    view.attempts = 0;
    view.examRun = null;
    S.setLast(unit.id);
    renderStep();
  }

  function exitToMap() {
    if (pad) { pad.destroy(); pad = null; }
    view.screen = 'map';
    view.unit = null;
    renderMap();
    window.scrollTo(0, 0);
  }

  function currentStep() {
    return view.unit.steps[view.stepIndex];
  }

  /** Adımı tamamla ve ilerle. */
  function completeStep(score) {
    const step = currentStep();
    S.markStep(step.id, score == null ? 100 : score);
    goNext();
  }

  function goNext() {
    if (pad) { pad.destroy(); pad = null; }
    view.attempts = 0;
    if (view.stepIndex < view.unit.steps.length - 1) {
      view.stepIndex++;
      renderStep();
    } else {
      renderUnitComplete();
    }
  }

  function goPrev() {
    if (view.stepIndex === 0) return exitToMap();
    if (pad) { pad.destroy(); pad = null; }
    view.stepIndex--;
    view.attempts = 0;
    renderStep();
  }

  /* ---- oynatıcı çerçevesi ---- */
  /* Türkçe büyük harfler (İ, Ö) küçültülünce CSS sınıfı bozulduğu için
     faz adları sabit sınıflara eşlenir. */
  const PHASE_CLASS = {
    'ÖĞREN': 'ogren', 'İZLE': 'izle', 'TAKİP': 'takip',
    'YAZ': 'yaz', 'KUR': 'kur', 'KONTROL': 'kontrol', 'SINAV': 'sinav'
  };

  function playerFrame(step, bodyHTML, footHTML) {
    const dots = view.unit.steps
      .map((st, i) => {
        const cls = i < view.stepIndex ? 'done' : i === view.stepIndex ? 'now' : '';
        return '<i class="' + cls + '"></i>';
      })
      .join('');

    $('#app').innerHTML = [
      '<div class="player">',
      '  <header class="player-bar">',
      '    <button type="button" class="round-btn" data-act="back" title="Geri">‹</button>',
      '    <div class="step-dots">' + dots + '</div>',
      '    <span class="phase-chip phase-' + (PHASE_CLASS[step.phase] || 'ogren') + '">' + t(step.phase) + '</span>',
      '    <button type="button" class="round-btn" data-act="exit" title="Derslere dön">✕</button>',
      '  </header>',
      '  <main class="step-body" id="step-body">' + bodyHTML + '</main>',
      '  <footer class="step-foot" id="step-foot">' + (footHTML || '') + '</footer>',
      '</div>'
    ].join('');

    $('[data-act="back"]').addEventListener('click', goPrev);
    $('[data-act="exit"]').addEventListener('click', exitToMap);
  }

  function ctaHTML(label, opts) {
    const o = opts || {};
    return (
      '<button type="button" class="btn btn-primary btn-xl cta"' +
      (o.disabled ? ' disabled' : '') +
      ' data-act="cta">' + label + '</button>' +
      (o.extra || '')
    );
  }

  function onCTA(fn) {
    const b = $('[data-act="cta"]');
    if (b) b.addEventListener('click', fn);
  }

  /* ------------------------------------------------------------------ */
  /* Adım tipleri                                                        */
  /* ------------------------------------------------------------------ */
  function renderStep() {
    const step = currentStep();
    window.scrollTo(0, 0);
    switch (step.type) {
      case 'teach-letter': return renderTeachLetter(step);
      case 'teach-forms':  return renderTeachForms(step);
      case 'teach-word':   return renderTeachWord(step);
      case 'watch':        return renderWatch(step);
      case 'letter-write': return renderLetterWrite(step);
      case 'trace':        return renderTrace(step);
      case 'assemble':     return renderAssemble(step);
      case 'quiz':         return renderQuiz(step);
      case 'exam-intro':   return renderExamIntro(step);
      case 'exam-result':  return renderExamResult(step);
      default:             return exitToMap();
    }
  }

  /* ---- ÖĞREN: harf ---- */
  function renderTeachLetter(step) {
    const L = step.letter;
    playerFrame(
      step,
      [
        '<div class="teach">',
        '  <p class="step-kicker">Yeni harf</p>',
        '  <div class="hero-glyph-card">',
        '    <div class="ruled">',
        '      <span class="hero-glyph" dir="rtl">' + esc(L.char) + '</span>',
        '    </div>',
        '    <button type="button" class="btn btn-sound btn-lg" data-act="say">🔊 Dinle</button>',
        '  </div>',
        '  <h2 class="teach-name">' + esc(L.name) + '</h2>',
        '  <p class="teach-sound">' + esc(L.sound) + '</p>',
        '  <div class="fact-row">',
        '    <div class="fact"><span>Nokta</span><b>' + esc(L.dotsText || L.dots) + '</b></div>',
        '    <div class="fact"><span>Bağlanma</span><b>' +
            (L.forms.initial === L.forms.isolated ? 'Sonrakine bağlanmaz' : 'Her iki yana bağlanır') + '</b></div>',
        '  </div>',
        '  <div class="how-to"><span class="how-to-title">✍️ Nasıl yazılır?</span><p>' + esc(L.write) + '</p></div>',
        '</div>'
      ].join(''),
      ctaHTML(t('Anladım, yazalım ➜'))
    );

    $('[data-act="say"]').addEventListener('click', () => AH.speech.speak(L.char));
    setTimeout(() => AH.speech.speak(L.char), 350);
    onCTA(() => completeStep(100));
  }

  /* ---- ÖĞREN: formlar (hepsine dokunmadan geçilemez) ---- */
  function renderTeachForms(step) {
    const L = step.letter;
    const keys = ['isolated', 'initial', 'medial', 'final'];
    const labels = D.FORM_LABELS;
    const explain = {
      isolated: 'Tek başına, komşusu yokken.',
      initial: 'Kelimenin başında — soldan devam eder.',
      medial: 'İki harfin arasında — iki yandan bağlı.',
      final: 'Kelimenin sonunda — sağdan bağlanır, kuyruğu geri gelir.'
    };

    playerFrame(
      step,
      [
        '<div class="teach">',
        '  <p class="step-kicker">Aynı harf, dört farklı yüz</p>',
        '  <h2 class="teach-name">' + esc(L.name) + ' nasıl değişir?</h2>',
        '  <p class="teach-sound">Her kutuya dokun ve şeklin nasıl değiştiğine bak.</p>',
        '  <div class="forms-row big" dir="rtl">',
        keys.map((k) =>
          '<button type="button" class="form-box" data-key="' + k + '" data-form="' + esc(L.forms[k]) + '">' +
          '<span class="form-glyph">' + esc(L.forms[k]) + '</span>' +
          '<span class="form-label">' + labels[k] + '</span></button>'
        ).join(''),
        '  </div>',
        '  <div class="form-explain" id="form-explain">Bir kutuya dokun…</div>',
        '</div>'
      ].join(''),
      ctaHTML(t('Devam ➜'), { disabled: true })
    );

    const touched = {};
    const total = keys.length;
    $$('.form-box').forEach((b) =>
      b.addEventListener('click', () => {
        const k = b.dataset.key;
        touched[k] = true;
        b.classList.add('seen');
        $$('.form-box').forEach((x) => x.classList.remove('picked'));
        b.classList.add('picked');
        $('#form-explain').innerHTML =
          '<b>' + labels[k] + ':</b> ' + explain[k] +
          ' <span class="mini-glyph" dir="rtl">' + esc(L.forms[k]) + '</span>';
        AH.speech.speak(L.char);
        if (Object.keys(touched).length === total) {
          const cta = $('[data-act="cta"]');
          cta.disabled = false;
          cta.classList.add('ready');
        }
      })
    );

    onCTA(() => completeStep(100));
  }

  /* ---- ÖĞREN: kelime ---- */
  function renderTeachWord(step) {
    const ex = step.ex;
    playerFrame(
      step,
      [
        '<div class="teach">',
        '  <p class="step-kicker">Yeni kelime</p>',
        '  <div class="hero-glyph-card">',
        '    <div class="ruled"><span class="hero-glyph word" dir="rtl">' + esc(ex.vowelled) + '</span></div>',
        '    <button type="button" class="btn btn-sound btn-lg" data-act="say">🔊 Dinle</button>',
        '  </div>',
        '  <h2 class="teach-name">' + esc(ex.tr) + '</h2>',
        ex.tag ? '<p class="teach-tag">' + esc(ex.tag) + '</p>' : '',
        '  <div class="equation" dir="rtl">' +
          ex.equation.map((f) => '<span class="eq-part">' + esc(f) + '</span>').join('<span class="eq-op">+</span>') +
          '<span class="eq-op">=</span><span class="eq-result">' + esc(ex.result) + '</span></div>',
        ex.note ? '<div class="how-to"><span class="how-to-title">💡 Dikkat</span><p>' + esc(ex.note) + '</p></div>' : '',
        '</div>'
      ].join(''),
      ctaHTML(t('Şimdi kuralım ➜'))
    );
    $('[data-act="say"]').addEventListener('click', () => AH.speech.speak(ex.vowelled));
    setTimeout(() => AH.speech.speak(ex.vowelled), 350);
    onCTA(() => completeStep(100));
  }

  /* ---- KUR: sürükle-bırak ---- */
  function renderAssemble(step) {
    const ex = step.ex;
    playerFrame(
      step,
      [
        '<div class="teach">',
        '  <p class="step-kicker">Parçaları yerine koy</p>',
        '  <h2 class="teach-name" dir="rtl">' + esc(ex.result) + '</h2>',
        '  <p class="teach-sound">' + esc(ex.tr) + '</p>',
        '  <div id="assembly-host"></div>',
        '</div>'
      ].join(''),
      ctaHTML(t('Devam ➜'), { disabled: true })
    );

    AH.assembly.mount($('#assembly-host'), ex, function onSolved() {
      const cta = $('[data-act="cta"]');
      cta.disabled = false;
      cta.classList.add('ready');
      AH.confetti.fire(cta, 60);
    }, false);

    onCTA(() => completeStep(100));
  }

  /* ---- İZLE: kalem gösterisi ---- */
  function renderWatch(step) {
    const L = step.letter;
    const form = AH.letterforms.get(L.char, step.formKey);
    const phases = (form && form.phases) || [];

    playerFrame(
      step,
      [
        '<div class="trace-step">',
        '  <div class="step-topline">',
        '    <h2 class="watch-title">' + esc(step.title) + '</h2>',
        '    <span class="aid-flag">Önce izle</span>',
        '  </div>',
        '  <div class="write-stage" id="write-stage">',
        '    <div class="canvas-frame"><canvas class="pad" aria-label="Yazım gösterimi"></canvas></div>',
        '    <div class="side-tools">',
        '      <button type="button" class="tool-btn primary" data-act="replay" title="Tekrar izle">▶</button>',
        '      <button type="button" class="tool-btn" data-act="say" title="Dinle">🔊</button>',
        '      <button type="button" class="tool-btn" data-act="expand" title="Büyüt / küçült">⛶</button>',
        speedRailHTML(),
        '    </div>',
        '  </div>',
        '  <ol class="phase-list">',
        phases.map((p) => '<li>' + esc(p) + '</li>').join(''),
        '  </ol>',
        form ? '<p class="trace-help">🟢 ' + esc(form.startTip) + ' ' + esc(form.dirTip) + '</p>' : '',
        form && form.dots.count
          ? '<p class="trace-help dots-tip">🟠 ' + form.dots.count + ' nokta, harfin ' +
            esc(form.dots.side) + '. Noktalar EN SONA yazılır.</p>'
          : '',
        '</div>'
      ].join(''),
      ctaHTML(t('Şimdi ben deneyeyim ➜'), { disabled: true })
    );

    pad = AH.tracing.create($('canvas.pad'), {});
    pad.setForm(form);
    pad.setWord(step.glyph);
    pad.setGhost(true);
    pad.setLocked(true);
    wireExpand();

    const cta = $('[data-act="cta"]');
    function play() {
      pad.clear();
      pad.playDemo({
        duration: demoDuration(),
        onDone() {
          cta.disabled = false;
          cta.classList.add('ready');
          pad.setShowStart(true);
        }
      });
    }
    $('[data-act="replay"]').addEventListener('click', play);
    $('[data-act="say"]').addEventListener('click', () => AH.speech.speak(L.char));
    wireSpeed(document, play);
    setTimeout(play, 260);
    onCTA(() => completeStep(100));
  }

  /* ---- TAKİP / YAZ: harfi yazma + yazım denetimi ---- */
  function renderLetterWrite(step) {
    const L = step.letter;
    const form = AH.letterforms.get(L.char, step.formKey);
    const guided = !!step.guided;

    playerFrame(
      step,
      [
        '<div class="trace-step">',
        '  <div class="step-topline">',
        '    <h2 class="watch-title">' + esc(step.title) + '</h2>',
        guided
          ? '<span class="aid-flag on">Yardımlar açık</span>'
          : '<span class="aid-flag">Yardımsız · %' + AH.strokecheck.PASS + '</span>',
        '  </div>',
        /* Tuval + YAN ARAÇ ÇUBUĞU: düğmeler yazı alanının yanında,
           sayfayı aşağı yukarı kaydırmadan ulaşılabilir. */
        '  <div class="write-stage" id="write-stage">',
        '    <div class="canvas-frame"><canvas class="pad" aria-label="Yazma tuvali"></canvas></div>',
        '    <div class="side-tools">',
        '      <button type="button" class="tool-btn" data-act="demo" title="Göster">▶</button>',
        '      <button type="button" class="tool-btn" data-act="undo" title="Geri al">↶</button>',
        '      <button type="button" class="tool-btn" data-act="clear" title="Temizle">🗑</button>',
        '      <button type="button" class="tool-btn" data-act="expand" title="Büyüt / küçült">⛶</button>',
        '    </div>',
        '  </div>',
        form
          ? '<p class="trace-help">🟢 ' + esc(form.startTip) +
            (form.dots.count ? ' · 🟠 Noktaları en sona bırak.' : '') + '</p>'
          : '',
        '  <div id="score-host" class="score-host"></div>',
        '</div>'
      ].join(''),
      ctaHTML(t('✔ Kontrol Et'))
    );

    pad = AH.tracing.create($('canvas.pad'), {});
    pad.setForm(form);
    pad.setWord(step.glyph);
    pad.setGhost(guided);
    pad.setShowStart(true);
    wireExpand();

    $('[data-act="undo"]').addEventListener('click', () => pad.undo());
    $('[data-act="clear"]').addEventListener('click', () => {
      pad.clear();
      $('#score-host').innerHTML = '';
    });
    $('[data-act="demo"]').addEventListener('click', () => {
      pad.clear();
      pad.playDemo({ duration: demoDuration(), onDone() { pad.setShowStart(true); } });
    });

    onCTA(() => {
      const shape = pad.evaluate();
      if (shape.empty) {
        ui.toast('Önce harfi tuvale yaz.', 'warn');
        return;
      }
      const res = AH.strokecheck.check({
        strokes: pad.getStrokes(),
        refPath: pad.refPath(),
        refDots: pad.refDots(),
        shape,
        targetBox: pad.inkBox(),
        baselineY: pad.getLayout().baselineY,
        fontSize: pad.getLayout().fontSize,
        dotsInfo: form ? form.dots : null
      });

      $('#score-host').innerHTML = writeScoreHTML(res);
      markWhereStudentStarted(res);
      S.logAttempt(step.id, res);     /* öğretmen raporu için kayıt */

      if (res.pass) {
        AH.confetti.fire($('[data-act="cta"]'), 130);
        $('#score-host').innerHTML += '<p class="score-msg good">🎉 Doğru yazdın! (%' + res.score + ')</p>';
        setTimeout(() => completeStep(res.score), 1000);
        return;
      }

      view.attempts++;
      const list = res.problems.slice(0, 2)
        .map((p) => '<li>' + esc(p.msg) + '</li>').join('');
      $('#score-host').innerHTML +=
        '<p class="score-msg bad">%' + res.score + ' — geçmek için %' + AH.strokecheck.PASS + ' gerekiyor.</p>' +
        (list ? '<ul class="problem-list">' + list + '</ul>' : '');

      /* iki denemeden sonra yardımları aç */
      if (view.attempts >= 2 && !pad.isGhost()) {
        pad.setGhost(true);
        ui.toast('Yardım açıldı: harfin soluk hâli göründü. Üstünden geç.', 'info', 4000);
      }
      if (view.attempts >= 3) {
        pad.clear();
        pad.playDemo({ duration: demoDuration(), onDone() { pad.setShowStart(true); } });
      }
    });
  }

  /**
   * Kontrolden sonra tuvalde "sen burada başladın / burada bitirdin"
   * işaretlerini gösterir. Yanlışsa yeşil doğru başlangıca kesik çizgi çeker.
   */
  function markWhereStudentStarted(res) {
    if (!pad || !res || !res.trace) return;
    pad.setMarks({ start: res.trace.start, end: res.trace.end, ok: res.trace.startOK });
  }

  function writeScoreHTML(res) {
    const bar = (label, val) =>
      '<div class="mini-metric"><span>' + label + '</span>' +
      '<i class="' + (val >= 80 ? 'ok' : val >= 55 ? 'mid' : 'no') + '">' +
      '<b style="width:' + Math.max(3, val) + '%"></b></i><em>%' + val + '</em></div>';
    const p = res.parts || {};
    return [
      '<div class="write-score ' + (res.pass ? 'good' : 'bad') + '">',
      '  <div class="write-total">%' + res.score + '</div>',
      '  <div class="write-metrics">',
      bar('Şekil', p.shape || 0),
      bar('Başlangıç', p.start || 0),
      bar('Yön', p.direction || 0),
      res.dotsExpected ? bar('Noktalar', p.dots || 0) : '',
      typeof p.proportion === 'number' ? bar('Büyüklük', p.proportion) : '',
      typeof p.baseline === 'number' ? bar('Satıra oturma', p.baseline) : '',
      '  </div>',
      '</div>'
    ].join('');
  }

  /* ---- YAZ / SINAV: kelime tuvali ---- */
  function renderTrace(step) {
    const isExam = !!step.exam;
    playerFrame(
      step,
      [
        '<div class="trace-step">',
        '  <div class="step-topline">',
        isExam
          ? '<span class="trace-prompt">' + esc(step.prompt || '') + '</span>'
          : '<span class="trace-glyph" dir="rtl">' + esc(step.target) + '</span>',
        isExam
          ? '<span class="exam-flag">👻 Hayalet kapalı</span>'
          : '<span class="aid-flag">Şimdi sen yaz</span>',
        '  </div>',
        '  <div class="write-stage" id="write-stage">',
        '    <div class="canvas-frame"><canvas class="pad" aria-label="Yazma tuvali"></canvas></div>',
        '    <div class="side-tools">',
        '      <button type="button" class="tool-btn" data-act="say" title="Dinle">🔊</button>',
        step.ghost
          ? '<button type="button" class="tool-btn on" data-act="ghost" title="Hayaleti aç/kapat">👻</button>'
          : '',
        '      <button type="button" class="tool-btn" data-act="undo" title="Geri al">↶</button>',
        '      <button type="button" class="tool-btn" data-act="clear" title="Temizle">🗑</button>',
        '      <button type="button" class="tool-btn" data-act="expand" title="Büyüt / küçült">⛶</button>',
        '    </div>',
        '  </div>',
        step.help ? '<p class="trace-help">💡 ' + esc(step.help) + '</p>' : '',
        '  <div id="score-host" class="score-host"></div>',
        '</div>'
      ].join(''),
      ctaHTML(t('✔ Kontrol Et'))
    );

    pad = AH.tracing.create($('canvas.pad'), {});
    pad.setGhost(!!step.ghost);
    /* Kelimenin yazım referansı: hangi uçtan başlanır, kaç nokta var.
       İlk (en sağdaki) harfin biçimine göre başlangıç kuralı seçilir. */
    const wordForm = wordFormOf(step);
    pad.setForm(wordForm);
    pad.setWord(step.target);
    pad.setShowStart(!isExam);       /* sınavda ipucu yok */

    $('[data-act="say"]').addEventListener('click', () =>
      AH.speech.speak(step.ex ? step.ex.vowelled : step.target.replace(/ـ/g, ''))
    );
    $('[data-act="undo"]').addEventListener('click', () => pad.undo());
    $('[data-act="clear"]').addEventListener('click', () => {
      pad.clear();
      $('#score-host').innerHTML = '';
    });
    wireExpand();
    const gb = $('[data-act="ghost"]');
    if (gb) {
      gb.addEventListener('click', () => {
        const on = pad.toggleGhost();
        gb.classList.toggle('on', on);
        gb.title = on ? 'Hayalet açık' : 'Hayalet kapalı';
      });
    }

    onCTA(() => {
      const shape = pad.evaluate();
      if (shape.empty) {
        ui.toast('Önce tuvale yaz, sonra kontrol et.', 'warn');
        return;
      }
      /* Kelimede de yazım denetimi: nereden başladı, hangi yöne gitti,
         noktalar yerinde mi? (Öğrenci soldan ya da son harften başlayabilir.) */
      const res = AH.strokecheck.check({
        strokes: pad.getStrokes(),
        refPath: pad.refPath(),
        refParts: pad.refParts().map((p) => p.path),
        refDots: pad.refDots(),
        shape,
        targetBox: pad.inkBox(),
        baselineY: pad.getLayout().baselineY,
        fontSize: pad.getLayout().fontSize,
        dotsInfo: wordForm.dots
      });

      $('#score-host').innerHTML = writeScoreHTML(res);
      markWhereStudentStarted(res);
      S.logAttempt(step.id, res);     /* öğretmen raporu için kayıt */

      if (res.pass) {
        AH.confetti.fire($('[data-act="cta"]'), 110);
        $('#score-host').innerHTML +=
          '<p class="score-msg good">🎉 Çok güzel! Doğru yerden başladın. (%' + res.score + ')</p>';
        if (isExam) recordExam(step.id, true);
        setTimeout(() => completeStep(res.score), 1000);
        return;
      }

      view.attempts++;
      const list = res.problems.slice(0, 2).map((p) => '<li>' + esc(p.msg) + '</li>').join('');
      const detail =
        '<p class="score-msg bad">%' + res.score + ' — geçmek için %' + AH.strokecheck.PASS + ' gerekiyor.</p>' +
        (list ? '<ul class="problem-list">' + list + '</ul>' : '') +
        (res.trace && !res.trace.startOK
          ? '<p class="mark-hint">Tuvalde <b>kırmızı</b> halka senin başladığın yeri, ' +
            '<b>yeşil</b> halka başlaman gereken yeri gösteriyor.</p>'
          : '');

      if (isExam) {
        if (view.attempts >= 2) {
          $('#score-host').innerHTML += detail +
            '<p class="score-msg bad">Bu soruda olmadı. Sınav devam ediyor.</p>';
          recordExam(step.id, false);
          const cta = $('[data-act="cta"]');
          cta.textContent = 'Devam ➜';
          cta.replaceWith(cta.cloneNode(true));   /* eski dinleyiciyi at */
          onCTA(() => completeStep(res.score));
        } else {
          $('#score-host').innerHTML += detail + '<p class="score-msg bad">1 hakkın kaldı.</p>';
        }
        return;
      }

      $('#score-host').innerHTML += detail +
        (view.attempts >= 2
          ? '<button type="button" class="btn btn-ghost btn-sm" data-act="skip">Şimdilik geç ➜</button>'
          : '');
      const sk = $('[data-act="skip"]');
      if (sk) sk.addEventListener('click', () => completeStep(res.score));
    });
  }

  /**
   * Kelimenin yazım referansını kurar.
   * Arapça sağdan sola yazıldığı için kalem EN SAĞDAKİ harften başlar;
   * o harfin biçimi (yalın/başta) başlangıç ucunu belirler.
   */
  function wordFormOf(step) {
    const word = step.target || '';
    let startRule = 'right';
    let firstTip = '';
    const eq = step.ex && step.ex.equation;
    if (eq && eq.length) {
      const info = AH.letterforms.parseFragment(eq[0]);   /* en sağdaki parça */
      const f = AH.letterforms.get(info.char, info.formKey);
      if (f) { startRule = f.startRule; firstTip = f.startTip; }
    }
    return {
      isWord: true,
      startRule,
      firstTip,
      dots: { count: D.dotsInWord(word), side: null }
    };
  }

  /* ---- KONTROL / SINAV: çoktan seçmeli ---- */
  function renderQuiz(step) {
    const isExam = !!step.exam;
    const noVoice = step.listen && !AH.speech.hasArabicVoice();

    playerFrame(
      step,
      [
        '<div class="quiz">',
        '  <p class="step-kicker">' + (isExam ? 'Sınav sorusu' : 'Kontrol') + '</p>',
        '  <h2 class="quiz-q">' + step.question + '</h2>',
        step.listen
          ? '<button type="button" class="btn btn-sound btn-xl listen" data-act="listen">🔊 Sesi dinle</button>' +
            (noVoice ? '<p class="quiz-fallback">Cihazında Arapça ses yok — ipucu: <b>' + esc(step.hint) + '</b></p>' : '')
          : '',
        '  <div class="options ' + (step.display === 'glyph' ? 'glyphs' : 'texts') + '">',
        step.options.map((op, i) =>
          '<button type="button" class="option" data-i="' + i + '"' +
          (step.display === 'glyph' ? ' dir="rtl"' : '') + '>' +
          '<span>' + esc(op.text) + '</span></button>'
        ).join(''),
        '  </div>',
        '  <div id="quiz-msg" class="quiz-msg"></div>',
        '</div>'
      ].join(''),
      ''
    );

    if (step.listen) {
      const play = () => AH.speech.speak(step.listen);
      $('[data-act="listen"]').addEventListener('click', play);
      setTimeout(play, 400);
    }

    let answered = false;
    let wrongCount = 0;

    $$('.option').forEach((b) =>
      b.addEventListener('click', () => {
        if (answered) return;
        const op = step.options[Number(b.dataset.i)];

        if (op.correct) {
          answered = true;
          b.classList.add('right');
          $$('.option').forEach((x) => (x.disabled = true));
          $('#quiz-msg').innerHTML = '<span class="good">✓ Doğru!</span>';
          AH.confetti.fire(b, 50);
          if (isExam) recordExam(step.id, wrongCount === 0);
          setTimeout(() => completeStep(wrongCount === 0 ? 100 : 70), 850);
          return;
        }

        b.classList.add('wrong');
        b.disabled = true;
        wrongCount++;

        if (isExam) {
          answered = true;
          $$('.option').forEach((x, i) => {
            x.disabled = true;
            if (step.options[i].correct) x.classList.add('right');
          });
          $('#quiz-msg').innerHTML = '<span class="bad">Doğrusu yukarıda işaretli.</span>';
          recordExam(step.id, false);
          $('#step-foot').innerHTML = ctaHTML(t('Devam ➜'));
          onCTA(() => completeStep(0));
        } else {
          $('#quiz-msg').innerHTML = '<span class="bad">Olmadı, tekrar dene.</span>';
        }
      })
    );
  }

  /* ---- SINAV çerçevesi ---- */
  function recordExam(stepId, ok) {
    if (!view.examRun) view.examRun = { items: [] };
    if (!view.examRun.items.some((x) => x.id === stepId)) {
      view.examRun.items.push({ id: stepId, ok: !!ok });
    }
  }

  function renderExamIntro(step) {
    const stage = step.stage;
    /* Sınav tek oturumda verilir; sayaç her girişte sıfırlanır. */
    view.examRun = { items: [] };

    const items = view.unit.steps.filter((s) => s.exam).length;
    playerFrame(
      step,
      [
        '<div class="teach exam-intro">',
        '  <div class="exam-seal">🎓</div>',
        '  <h2 class="teach-name">' + esc(stage.title) + ' Sınavı</h2>',
        '  <p class="teach-sound">Öğrendiklerini ölçelim. Hazırsan başlayalım.</p>',
        '  <ul class="exam-rules">',
        '    <li><b>' + items + ' soru</b> var: tanıma, anlam ve yazma.</li>',
        '    <li>Yazma sorularında <b>hayalet kapalı</b> — kelimeyi kendin yazacaksın.</li>',
        '    <li>Her soruda <b>2 hakkın</b> var, ipucu yok.</li>',
        '    <li>Geçme notu <b>%' + S.PASS + '</b>. Geçemezsen tekrar deneyebilirsin.</li>',
        '  </ul>',
        '</div>'
      ].join(''),
      ctaHTML('Sınavı Başlat ➜')
    );
    onCTA(() => completeStep(100));
  }

  function renderExamResult(step) {
    const run = view.examRun || { items: [] };
    const total = run.items.length || 1;
    const right = run.items.filter((x) => x.ok).length;
    const score = Math.round((right / total) * 100);
    const passed = score >= S.PASS;

    if (passed) S.setExamScore(step.stage.stageId, score);

    const nextStage = C.COURSE.find((s) => s.stageId === step.stage.stageId + 1);

    playerFrame(
      step,
      [
        '<div class="teach exam-result ' + (passed ? 'pass' : 'fail') + '">',
        '  <div class="exam-seal">' + (passed ? '🏅' : '💪') + '</div>',
        '  <h2 class="teach-name">' + (passed ? 'Tebrikler, geçtin!' : 'Az kaldı!') + '</h2>',
        '  <div class="exam-score">%' + score + '</div>',
        '  <p class="teach-sound">' + right + ' / ' + total + ' doğru · geçme notu %' + S.PASS + '</p>',
        passed
          ? '<p class="exam-note">' +
            (nextStage
              ? '<b>' + esc(nextStage.title) + '</b> kilidi açıldı: ' +
                '<span dir="rtl">' + esc(nextStage.lettersLabel) + '</span>'
              : 'Müfredatın sonuna geldin. Harikasın!') +
            '</p>'
          : '<p class="exam-note">Endişelenme — dersleri tekrar edip sınava yeniden girebilirsin.</p>',
        '</div>'
      ].join(''),
      ctaHTML(passed ? 'Devam ➜' : 'Tekrar dene ➜')
    );

    if (passed) AH.confetti.fire($('.exam-seal'), 200);

    onCTA(() => {
      if (passed) {
        S.markStep(step.id, score);
        renderStageComplete(step.stage, nextStage);
      } else {
        S.resetUnit(view.unit);      /* sınavı baştan alsın */
        view.examRun = null;
        exitToMap();
      }
    });
  }

  /* ---- ÜNİTE / AŞAMA bitiş ekranları ---- */
  function renderUnitComplete() {
    const unit = view.unit;
    const next = S.nextUnit();
    const sameStage = next && next.stageId === unit.stageId && next.id !== unit.id;

    $('#app').innerHTML = [
      '<div class="player">',
      '  <main class="step-body">',
      '    <div class="teach done-screen">',
      '      <div class="done-seal">✓</div>',
      '      <h2 class="teach-name">' + t('Ders tamamlandı!') + '</h2>',
      '      <p class="teach-sound">' + esc(unit.title) + '</p>',
      '    </div>',
      '  </main>',
      '  <footer class="step-foot">',
      sameStage
        ? '<button type="button" class="btn btn-primary btn-xl" data-act="next-unit">' + t('Sıradaki ders ➜') + '</button>'
        : '',
      '    <button type="button" class="btn btn-ghost btn-lg" data-act="to-map">' + t('Derslere dön') + '</button>',
      '  </footer>',
      '</div>'
    ].join('');

    AH.confetti.fire($('.done-seal'), 120);

    const nu = $('[data-act="next-unit"]');
    if (nu) nu.addEventListener('click', () => openUnit(next));
    $('[data-act="to-map"]').addEventListener('click', exitToMap);
  }

  function renderStageComplete(stage, nextStage) {
    $('#app').innerHTML = [
      '<div class="player">',
      '  <main class="step-body">',
      '    <div class="teach done-screen stage-done">',
      '      <div class="done-seal gold">🏆</div>',
      '      <h2 class="teach-name">' + esc(stage.title) + ' bitti!</h2>',
      '      <p class="teach-sound">' + esc(stage.lettersLabel) + ' harflerini artık yazabiliyorsun.</p>',
      nextStage
        ? '<p class="exam-note">Sırada: <b>' + esc(nextStage.title) + '</b> — <span dir="rtl">' +
          esc(nextStage.lettersLabel) + '</span></p>'
        : '<p class="exam-note">Tüm müfredatı tamamladın. 🎉</p>',
      '    </div>',
      '  </main>',
      '  <footer class="step-foot">',
      '    <button type="button" class="btn btn-primary btn-xl" data-act="to-map">Devam ➜</button>',
      '  </footer>',
      '</div>'
    ].join('');
    AH.confetti.fire($('.done-seal'), 220);
    $('[data-act="to-map"]').addEventListener('click', exitToMap);
  }

  /* ------------------------------------------------------------------ */
  /* Başlangıç                                                           */
  /* ------------------------------------------------------------------ */
  function init() {
    /* Arayüz dili (Türkçe / Arapça) — ders içeriği Türkçe kalır */
    if (AH.i18n) {
      AH.i18n.applyDocument();
      const lb = $('#lang-btn');
      if (lb) lb.addEventListener('click', () => {
        AH.i18n.toggle();
        /* Açık olan ekranı yeni dille yeniden çiz */
        if (view.screen === 'unit' && view.unit) renderStep();
        else if (view.screen === 'alphabet') renderAlphabet();
        else exitToMap();
        ui.toast(AH.i18n.isAr() ? 'واجهة عربية — محتوى الدرس يبقى بالتركية'
                                : 'Arayüz Türkçe.', 'info');
      });
    }

    /* Yönetici modu (öğretmen) */
    const ab = $('#admin-btn');
    if (ab && AH.admin) ab.addEventListener('click', () => AH.admin.requestAccess());

    $('#reset-btn').addEventListener('click', () => {
      if (confirm('Tüm ilerleme silinecek. Emin misin?')) {
        S.reset();
        exitToMap();
        ui.toast('İlerleme sıfırlandı. Baştan başlıyoruz.', 'info');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && pad) {
        e.preventDefault();
        pad.undo();
      }
      if (e.key === 'Escape' && view.screen === 'unit') exitToMap();
    });

    let rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (pad) pad.resize(); }, 120);
    });

    /* Başlık çubuğu: aşağı kaydırınca gizlen, yukarı kaydırınca geri gel.
       Küçük ekranda yazı alanına yer açar. */
    const header = document.querySelector('.app-header');
    if (header) {
      let lastY = 0;
      /* Sadece sınıf değiştirdiği için requestAnimationFrame'e gerek yok;
         rAF arka planda kısıtlandığında çalışmama riskini de ortadan kaldırır. */
      window.addEventListener('scroll', () => {
        const y = window.scrollY || 0;
        if (y > 70 && y > lastY + 4) header.classList.add('hide');
        else if (y < lastY - 4 || y <= 70) header.classList.remove('hide');
        lastY = y;
      }, { passive: true });
    }

    renderMap();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
