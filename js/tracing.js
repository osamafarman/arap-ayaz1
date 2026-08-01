/* =========================================================================
   tracing.js — Yazma tuvali + "kalem gösterisi" (animasyon) motoru

   Kaynak: "كراسة خط النسخ للمبتدئين" (منصة الخطاط — الخطاط مختار عالم)
   Kitapçıktaki her harf, yönü oklarla ve aşamaları numaralarla gösterilen
   TEK sürekli kalem hareketiyle yazılır; noktalar en sona bırakılır.
   Bu modül aynı mantığı uygular:

   • Harfin gerçek yazı tipi görüntüsü, yol boyunca AÇILARAK çizilir
     (maskeleme) — yani öğrenci harfin gerçek biçimini, doğru sırayla
     ve doğru yönde yazılırken izler.
   • Başlangıç noktası yeşil halka + numara ile işaretlenir.
   • Öğrencinin çizgileri saklanır; strokecheck.js bunları referans
     yol ile karşılaştırır (nereden başladı, hangi yöne gitti, noktalar).

   Koordinat sistemi (letterforms.js ile ortak):
     u : harfin SAĞ kenarından sola doğru, harf genişliğinin oranı (0…1)
     v : satır çizgisinden (baseline) aşağı, font boyunun oranı
         (negatif = satırın üstü)
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  /* fonts/naskh.woff2 varsa o kullanılır (bkz. fonts/README-FONT.md),
     yoksa sistemdeki Arapça yazı tipine düşer. */
  const ARABIC_FONT =
    '"AtolyeNaskh","Traditional Arabic","Arabic Typesetting","Amiri","Scheherazade New",' +
    '"Noto Naskh Arabic","Segoe UI","Tahoma",sans-serif';

  /* ---------------------------------------------------------------------
     SATIR HİZASI DÜZELTMESİ
     Yazı tiplerinin "alphabetic" taban çizgisi, Arapça harflerin gerçekte
     OTURDUĞU satır değildir: ölçtüğümüzde ا د ط ك ه gibi düz tabanlı harfler
     satırın ~0,06 em ÜSTÜNDE havada kalıyordu. Bu yüzden metni çizerken
     ölçülen fark kadar aşağı kaydırıyoruz; böylece harfler kırmızı satıra
     gerçekten oturuyor.
     Ölçüm yazı tipine ve boyuta göre bir kez yapılıp önbelleğe alınır.
     --------------------------------------------------------------------- */
  const BASELINE_REF = 'ادطكه';      /* hepsi noktasız ve düz tabanlı */
  const fixCache = {};

  function baselineFix(fontSize) {
    const key = fontSize + '|' + ARABIC_FONT;
    if (fixCache[key] != null) return fixCache[key];
    const pad = Math.ceil(fontSize * 1.4);
    const c = document.createElement('canvas');
    c.width = Math.ceil(fontSize * BASELINE_REF.length * 1.2);
    c.height = pad * 2;
    const g = c.getContext('2d');
    const base = pad;
    g.font = fontSize + 'px ' + ARABIC_FONT;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#000';
    g.fillText(BASELINE_REF, c.width / 2, base);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let maxy = -1;
    for (let y = c.height - 1; y >= 0 && maxy < 0; y--) {
      for (let x = 0; x < c.width; x++) {
        if (d[(y * c.width + x) * 4 + 3] > 60) { maxy = y; break; }
      }
    }
    /* mürekkebin altı satırın ne kadar üstünde kaldıysa o kadar aşağı in */
    const fix = maxy < 0 ? 0 : (base - maxy);
    fixCache[key] = fix;
    return fix;
  }

  /** Yazı tipi parmak izi — kaydedilen yollar hangi yazı tipiyle çizildi? */
  function fontFingerprint() {
    const c = document.createElement('canvas').getContext('2d');
    c.font = '100px ' + ARABIC_FONT;
    return ['أبجد', 'حطي', 'كلمن'].map((s) => Math.round(c.measureText(s).width)).join('-');
  }

  /* Animasyonda "boyanan alan"ın varsayılan genişliği (font boyu oranı). */
  const DEFAULT_BRUSH = 0.08;

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  /** Yönetici görünüm ayarı (yoksa varsayılan). */
  function adminUI(key, def) {
    return AH.admin && AH.admin.getUI ? AH.admin.getUI(key, def) : def;
  }

  function create(canvasEl, options) {
    const opts = Object.assign(
      { penColor: '#1d4ed8', penWidth: 9, tolerance: 30 },
      options || {}
    );

    const ctx = canvasEl.getContext('2d');
    let strokes = [];      /* [[{x,y},…], …] öğrencinin çizgileri */
    let active = null;
    let word = '';
    let ghost = true;
    let layout = null;
    let cssW = 0, cssH = 0;
    let drawing = false;
    let form = null;       /* letterforms kaydı (yol + noktalar) */
    let showStart = false; /* başlangıç işaretini göster */
    let demo = null;       /* çalışan animasyon durumu */

    /* ---------------- boyutlandırma / yerleşim ---------------- */
    function resize() {
      const rect = canvasEl.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cssW = Math.max(1, Math.round(rect.width));
      cssH = Math.max(1, Math.round(rect.height));
      canvasEl.width = Math.round(cssW * dpr);
      canvasEl.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      computeLayout();
      render();
    }

    /* Görüntü ayarı: yol düzenleyicide büyüterek/kaydırarak nokta koymak için. */
    let vZoom = 1, vPanX = 0, vPanY = 0;

    function computeLayout() {
      const baselineY = Math.round(cssH * 0.62) + vPanY;
      let fontSize = Math.round(cssH * 0.50 * vZoom);
      let width = 0;
      if (word) {
        const maxW = cssW * 0.78 * vZoom;
        for (let i = 0; i < 26; i++) {
          ctx.font = fontSize + 'px ' + ARABIC_FONT;
          width = ctx.measureText(word).width;
          if (width <= maxW || fontSize <= 24) break;
          fontSize = Math.round(fontSize * 0.92);
        }
      }
      const cx = cssW / 2 + vPanX;
      layout = {
        fontSize,
        font: fontSize + 'px ' + ARABIC_FONT,
        x: cx,
        baselineY,                                   /* kırmızı satır çizgisi */
        textY: baselineY + baselineFix(fontSize),    /* metnin çizim tabanı */
        width,
        right: cx + width / 2,
        left: cx - width / 2,
        zoom: vZoom
      };
    }

    /* --- referans yol: harfin gerçek orta ekseni (skeleton.js) --- */
    let auto = null;        /* {path:[{x,y}], dots:[{x,y,r}], thickness} */
    let autoKey = '';

    /* Yöneticinin elle çizdiği yollar bu ölçüde saklanır (tuval boyutundan
       bağımsız):  u = sağ kenardan sola / harf genişliği
                   v = satır çizgisinden aşağı / font boyu */
    function toNorm(p) {
      if (!layout || !layout.width) return [0, 0];
      return [(layout.right - p.x) / layout.width,
              (p.y - layout.textY) / layout.fontSize];
    }
    function fromNorm(u) {
      return { x: layout.right - u[0] * layout.width,
               y: layout.textY + u[1] * layout.fontSize };
    }

    /** Elle çizilen yolda kalem kalınlığını ölçer (animasyonun açılma genişliği). */
    function estimateThickness(path) {
      let len = 0;
      for (let i = 1; i < path.length; i++) len += dist(path[i - 1], path[i]);
      if (len < 1) return layout.fontSize * 0.12;
      const m = glyphMask();
      let ink = 0;
      for (let i = 3; i < m.data.length; i += 4) if (m.data[i] > 60) ink++;
      return Math.max(4, ink / len);
    }

    function ensureAuto() {
      if (!word || !form || !AH.skeleton) { auto = null; return null; }
      const key = word + '|' + layout.fontSize + '|' + layout.x + '|' + layout.baselineY +
                  '|' + form.startRule + '|' + (form.isWord ? 'w' : 'l');
      if (auto && autoKey === key) return auto;

      /* 1) Yönetici bu harf/kelime için yolu elle çizdiyse o kullanılır.
         Yol birden çok HAMLEDEN oluşabilir (ayrı yazılan harfler için). */
      const ov = AH.admin && AH.admin.getPath ? AH.admin.getPath(word) : null;
      const ovStrokes = ov ? (ov.strokes || (ov.path ? [ov.path] : null)) : null;
      if (ovStrokes && ovStrokes.some((s) => s && s.length > 1)) {
        const parts = ovStrokes
          .filter((s) => s && s.length > 1)
          .map((s) => ({ path: s.map(fromNorm) }));
        const path = parts.reduce((a, p) => a.concat(p.path), []);
        parts.forEach((p) => { p.thickness = estimateThickness(p.path); });
        auto = {
          parts,
          path,
          dots: (ov.dots || []).map((u) => {
            const p = fromNorm(u);
            p.r = (u.length > 2 ? u[2] : 0.06) * layout.fontSize;
            return p;
          }),
          thickness: estimateThickness(path),
          /* boyanan bandın genişliği (font boyu oranı); yoksa otomatik */
          brush: typeof ov.brush === 'number' ? ov.brush : null,
          custom: true
        };
        autoKey = key;
        return auto;
      }

      /* 2) Aksi hâlde iskelet yazı tipinden hesaplanır. */
      const m = glyphMask();
      const input = {
        data: m.data, w: m.w, h: m.h,
        fontSize: layout.fontSize,
        expectedDots: form.dots ? form.dots.count : 0
      };
      auto = form.isWord
        ? AH.skeleton.analyzeWord(input, form.startRule)
        : AH.skeleton.analyze(input, form.startRule);
      autoKey = key;
      return auto;
    }

    /** Kelimelerde her bitişik parçanın kendi yolu (parça sınırları). */
    function refParts() {
      const a = ensureAuto();
      if (!a) return [];
      return a.parts || [{ path: a.path }];
    }

    function refPath() {
      const a = ensureAuto();
      return a ? a.path : [];
    }
    function refDots() {
      const a = ensureAuto();
      return a ? a.dots : [];
    }
    function refThickness() {
      const a = ensureAuto();
      return a ? a.thickness : layout.fontSize * 0.12;
    }

    /** Animasyonda harfi açan (boyanan) bandın genişliği.
        Varsayılan %8'dir (font boyuna oranla); harf/kelime bazında
        yönetici panelinden değiştirilebilir. */
    function refBrush() {
      const a = ensureAuto();
      if (a && typeof a.brush === 'number' && a.brush > 0) return a.brush * layout.fontSize;
      return layout.fontSize * DEFAULT_BRUSH;
    }

    /* ---------------- arka plan ---------------- */
    function drawGuides(c) {
      const y = layout.baselineY;
      c.save();
      c.strokeStyle = 'rgba(99,102,241,0.26)';
      c.lineWidth = 1;
      c.setLineDash([7, 9]);
      /* خط القمة — üst (tepe) çizgisi */
      c.beginPath();
      c.moveTo(12, Math.round(y - layout.fontSize * 0.72) + 0.5);
      c.lineTo(cssW - 12, Math.round(y - layout.fontSize * 0.72) + 0.5);
      c.stroke();
      /* alt sınır */
      c.beginPath();
      c.moveTo(12, Math.round(y + layout.fontSize * 0.45) + 0.5);
      c.lineTo(cssW - 12, Math.round(y + layout.fontSize * 0.45) + 0.5);
      c.stroke();
      c.restore();

      /* خط الأساس — satır çizgisi */
      c.save();
      c.strokeStyle = 'rgba(220,38,38,0.45)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(8, y + 0.5);
      c.lineTo(cssW - 8, y + 0.5);
      c.stroke();
      c.restore();
    }

    function drawGlyph(c, alpha) {
      if (!word) return;
      c.save();
      c.font = layout.font;
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      c.fillStyle = 'rgba(15,23,42,' + alpha + ')';
      c.fillText(word, layout.x, layout.textY);
      c.restore();
    }

    /** Başlangıç halkası + ilk yön oku (küçük ve göze batmayan). */
    function drawStartMarker(c) {
      const path = refPath();
      if (path.length < 2) return;
      const s = path[0];
      const n = path[Math.min(3, path.length - 1)];
      const ang = Math.atan2(n.y - s.y, n.x - s.x);
      /* Halkanın boyu yönetici ayarıyla ölçeklenir (varsayılan 1×). */
      const r = Math.max(4, layout.fontSize * 0.045 * adminUI('markerScale', 1));

      c.save();
      c.beginPath();
      c.arc(s.x, s.y, r, 0, Math.PI * 2);
      c.fillStyle = 'rgba(5,150,105,0.22)';
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = '#059669';
      c.stroke();
      /* yön oku — halkanın hemen dışından başlar */
      const a0 = r * 1.5, a1 = r * 3.1;
      const ax = s.x + Math.cos(ang) * a1, ay = s.y + Math.sin(ang) * a1;
      c.beginPath();
      c.moveTo(s.x + Math.cos(ang) * a0, s.y + Math.sin(ang) * a0);
      c.lineTo(ax, ay);
      c.lineWidth = 2;
      c.stroke();
      c.beginPath();
      c.moveTo(ax, ay);
      c.lineTo(ax - Math.cos(ang - 0.5) * r, ay - Math.sin(ang - 0.5) * r);
      c.lineTo(ax - Math.cos(ang + 0.5) * r, ay - Math.sin(ang + 0.5) * r);
      c.closePath();
      c.fillStyle = '#059669';
      c.fill();
      c.restore();
    }

    /* Kontrolden sonra: öğrencinin GERÇEK başlangıç/bitiş yeri. */
    let marks = null;   /* {start:{x,y}, end:{x,y}, ok:boolean} */

    function drawUserMarks(c) {
      if (!marks) return;
      const r = Math.max(7, layout.fontSize * 0.05);
      const col = marks.ok ? '#059669' : '#dc2626';

      /* doğru başlangıçtan öğrencinin başlangıcına ince kılavuz */
      const ref = refPath();
      if (!marks.ok && ref.length) {
        c.save();
        c.setLineDash([4, 5]);
        c.strokeStyle = 'rgba(220,38,38,0.55)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(marks.start.x, marks.start.y);
        c.lineTo(ref[0].x, ref[0].y);
        c.stroke();
        c.restore();
      }

      const tag = (p, text, color) => {
        c.save();
        c.beginPath();
        c.arc(p.x, p.y, r, 0, Math.PI * 2);
        c.fillStyle = '#fff';
        c.fill();
        c.lineWidth = 3;
        c.strokeStyle = color;
        c.stroke();
        c.font = 'bold ' + Math.round(r * 1.5) + 'px "Segoe UI", sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = color;
        c.fillText(text, p.x, p.y - r * 2.0);
        c.restore();
      };
      tag(marks.start, 'başladın', col);
      if (marks.end) tag(marks.end, 'bitirdin', '#6366f1');
    }

    /** Nokta konumları (hedef) — kesik halkalar. */
    function drawDotTargets(c) {
      const dots = refDots();
      if (!dots.length) return;
      const r = Math.max(6, layout.fontSize * 0.09 * adminUI('markerScale', 1));
      c.save();
      c.setLineDash([4, 4]);
      c.lineWidth = 2;
      c.strokeStyle = 'rgba(217,119,6,0.75)';
      dots.forEach((d) => {
        c.beginPath();
        c.arc(d.x, d.y, r, 0, Math.PI * 2);
        c.stroke();
      });
      c.restore();
    }

    function strokePath(c, pts, color, width) {
      if (!pts.length) return;
      c.save();
      c.strokeStyle = color;
      c.fillStyle = color;
      c.lineWidth = width;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      if (pts.length === 1) {
        c.beginPath();
        c.arc(pts[0].x, pts[0].y, width / 2, 0, Math.PI * 2);
        c.fill();
        c.restore();
        return;
      }
      c.beginPath();
      c.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        c.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      const last = pts[pts.length - 1];
      c.lineTo(last.x, last.y);
      c.stroke();
      c.restore();
    }

    function render() {
      if (!layout) computeLayout();
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cssW, cssH);
      drawGuides(ctx);
      if (ghost) drawGlyph(ctx, 0.13);
      if (showStart && !demo) {
        drawDotTargets(ctx);
        drawStartMarker(ctx);
      }
      for (const s of strokes) strokePath(ctx, s, opts.penColor, opts.penWidth);
      if (active) strokePath(ctx, active, opts.penColor, opts.penWidth);
      if (!demo) drawUserMarks(ctx);
      if (overlay) overlay(ctx, layout, api);   /* yönetici yol düzenleyicisi */
    }

    /* Dışarıdan ek çizim (yol düzenleyici gibi) yapılabilsin diye kanca. */
    let overlay = null;

    /* ---------------- KALEM GÖSTERİSİ (animasyon) ----------------
       buildDemo(cfg) → { paint(t) }  : t = 0…1 ilerleme.
       Hem canlı animasyon (playDemo) hem de video dışa aktarımı
       aynı kareyi çizen bu işlevi kullanır. */
    function buildDemo(o) {
      const cfg = Object.assign({ duration: 2600, hold: 900 }, o || {});
      const path = refPath();
      if (path.length < 2) return null;

      const dots = refDots();
      /* Yol birden çok HAMLEDEN oluşabilir (ayrı yazılan harfler).
         Her hamle kendi içinde sürekli; hamleler arasında kalem kalkar. */
      const parts = refParts().map((p) => p.path).filter((p) => p && p.length > 1);
      const segs = parts.map((p) => {
        const s = [];
        let t = 0;
        for (let i = 1; i < p.length; i++) { const d = dist(p[i - 1], p[i]); s.push(d); t += d; }
        return { seg: s, total: t };
      });
      const total = segs.reduce((a, s) => a + s.total, 0) || 1;

      const tmp = document.createElement('canvas');
      tmp.width = cssW; tmp.height = cssH;
      const tc = tmp.getContext('2d');
      /* açılma genişliği: yönetici belirlediyse o, yoksa ölçülen kalınlıktan */
      const revealW = (typeof cfg.brush === 'number' && cfg.brush > 0)
        ? cfg.brush * layout.fontSize
        : refBrush();
      const dotPhase = dots.length ? 0.22 : 0;   /* noktalar için ek süre */

      function paint(tRaw) {
        const t = Math.max(0, Math.min(1, tRaw));
        const bodyT = Math.min(1, t / (1 - dotPhase));

        /* 1) her hamlenin ne kadarının yazıldığını hesapla */
        let want = total * bodyT;
        const drawn = [];        /* [[{x,y}…], …] yazılmış kısımlar */
        let cur = parts[0][0];
        for (let pi = 0; pi < parts.length; pi++) {
          const p = parts[pi], s = segs[pi];
          if (want <= 0) break;
          if (want >= s.total) {                 /* bu hamle tamamen bitti */
            drawn.push(p);
            cur = p[p.length - 1];
            want -= s.total;
            continue;
          }
          const upto = [p[0]];
          let acc = 0;
          for (let i = 1; i < p.length; i++) {
            if (acc + s.seg[i - 1] <= want) {
              upto.push(p[i]); acc += s.seg[i - 1]; cur = p[i];
            } else {
              const k = (want - acc) / s.seg[i - 1];
              cur = {
                x: p[i - 1].x + (p[i].x - p[i - 1].x) * k,
                y: p[i - 1].y + (p[i].y - p[i - 1].y) * k
              };
              upto.push(cur);
              break;
            }
          }
          drawn.push(upto);
          want = 0;
        }

        /* 2) maske: yazılan kısımlar boyunca kalın çizgi → harfi bununla kes.
              Hamleler arasında moveTo yapılır ki kalem "havada" iz bırakmasın. */
        tc.clearRect(0, 0, cssW, cssH);
        tc.save();
        tc.lineCap = 'round';
        tc.lineJoin = 'round';
        tc.lineWidth = revealW;
        tc.strokeStyle = '#000';
        tc.fillStyle = '#000';
        tc.beginPath();
        drawn.forEach((seq) => {
          if (!seq.length) return;
          if (seq.length === 1) {
            tc.moveTo(seq[0].x + revealW / 2, seq[0].y);
            tc.arc(seq[0].x, seq[0].y, revealW / 2, 0, Math.PI * 2);
            return;
          }
          tc.moveTo(seq[0].x, seq[0].y);
          for (let i = 1; i < seq.length; i++) tc.lineTo(seq[i].x, seq[i].y);
        });
        tc.stroke();
        tc.fill();
        tc.restore();
        tc.save();
        tc.globalCompositeOperation = 'source-in';
        tc.font = layout.font;
        tc.textAlign = 'center';
        tc.textBaseline = 'alphabetic';
        tc.fillStyle = '#1d4ed8';
        tc.fillText(word, layout.x, layout.textY);
        tc.restore();

        /* 3) sahneyi çiz */
        ctx.clearRect(0, 0, cssW, cssH);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, cssW, cssH);
        drawGuides(ctx);
        drawGlyph(ctx, 0.10);                 /* soluk hedef */
        ctx.drawImage(tmp, 0, 0);             /* açılan kısım */

        /* Noktalar (ve ك'nin içteki işareti gibi ek parçalar) gövdeden
           SONRA, sırayla belirir. Yapay daire değil, harfin gerçek
           mürekkebi o bölgeye kırpılarak gösterilir. */
        if (dots.length && t > 1 - dotPhase) {
          const dp = (t - (1 - dotPhase)) / dotPhase;
          const shown = Math.ceil(dp * dots.length);
          ctx.save();
          ctx.beginPath();
          for (let i = 0; i < shown && i < dots.length; i++) {
            const rr = Math.max(dots[i].r * 2.0, layout.fontSize * 0.09);
            ctx.moveTo(dots[i].x + rr, dots[i].y);
            ctx.arc(dots[i].x, dots[i].y, rr, 0, Math.PI * 2);
          }
          ctx.clip();
          ctx.font = layout.font;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = '#1d4ed8';
          ctx.fillText(word, layout.x, layout.textY);
          ctx.restore();
        }

        /* Kalem ucu — yazarken hareket eden yeşil nokta.
           Boyu yönetici ayarıyla ölçeklenir (varsayılan 1×). */
        if (bodyT < 1) {
          const pr = Math.max(2.5, layout.fontSize * 0.07 * adminUI('penSize', 1));
          ctx.save();
          ctx.beginPath();
          ctx.arc(cur.x, cur.y, pr, 0, Math.PI * 2);
          ctx.fillStyle = '#059669';
          ctx.fill();
          ctx.lineWidth = Math.max(1, pr * 0.28);
          ctx.strokeStyle = '#fff';
          ctx.stroke();
          ctx.restore();
        }
      }

      return { paint, dotPhase, duration: cfg.duration, hold: cfg.hold };
    }

    function playDemo(o) {
      const cfg = Object.assign({ duration: 2600, hold: 900 }, o || {});
      stopDemo();
      const d = buildDemo(cfg);
      if (!d) { if (cfg.onDone) cfg.onDone(); return; }

      const start = performance.now();
      demo = { rafId: 0, holdId: 0, safetyId: 0, cancelled: false, finished: false };

      /* Güvenlik ağı: sekme arka plandayken requestAnimationFrame durur.
         Animasyon takılırsa öğrenci "Devam" düğmesine ulaşamaz kalmasın. */
      demo.safetyId = setTimeout(finish, cfg.duration + cfg.hold + 800);

      function finish() {
        if (!demo || demo.finished || demo.cancelled) return;
        demo.finished = true;
        clearTimeout(demo.safetyId);
        clearTimeout(demo.holdId);
        cancelAnimationFrame(demo.rafId);
        demo = null;
        render();
        if (cfg.onDone) cfg.onDone();
      }

      function frame(now) {
        if (!demo || demo.cancelled || demo.finished) return;
        const t = Math.min(1, (now - start) / cfg.duration);
        d.paint(t);
        if (t < 1) demo.rafId = requestAnimationFrame(frame);
        else demo.holdId = setTimeout(finish, cfg.hold);
      }
      demo.rafId = requestAnimationFrame(frame);
    }

    function stopDemo() {
      if (demo) {
        demo.cancelled = true;
        cancelAnimationFrame(demo.rafId);
        clearTimeout(demo.holdId);
        clearTimeout(demo.safetyId);
        demo = null;
      }
    }

    /* ---------------- girdi (fare + dokunmatik) ---------------- */
    function pointFromEvent(e) {
      const r = canvasEl.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * cssW,
        y: ((e.clientY - r.top) / r.height) * cssH
      };
    }
    function onDown(e) {
      if (canvasEl.dataset.locked === 'true' || demo) return;
      e.preventDefault();
      drawing = true;
      try { canvasEl.setPointerCapture(e.pointerId); } catch (_) {}
      active = [pointFromEvent(e)];
      render();
    }
    function onMove(e) {
      if (!drawing || !active) return;
      e.preventDefault();
      const p = pointFromEvent(e);
      const last = active[active.length - 1];
      if (Math.abs(p.x - last.x) + Math.abs(p.y - last.y) < 1.2) return;
      active.push(p);
      render();
    }
    function onUp(e) {
      if (!drawing) return;
      e.preventDefault();
      drawing = false;
      if (active && active.length) strokes.push(active);
      active = null;
      try { canvasEl.releasePointerCapture(e.pointerId); } catch (_) {}
      render();
      if (opts.onStroke) opts.onStroke(strokes.length);
    }

    canvasEl.style.touchAction = 'none';
    canvasEl.addEventListener('pointerdown', onDown);
    canvasEl.addEventListener('pointermove', onMove);
    canvasEl.addEventListener('pointerup', onUp);
    canvasEl.addEventListener('pointercancel', onUp);
    canvasEl.addEventListener('pointerleave', onUp);

    /* ---------------- biçim değerlendirmesi (kapsama/doğruluk) -------- */
    function scratch() {
      const c = document.createElement('canvas');
      c.width = cssW; c.height = cssH;
      return c;
    }

    /** Harfin çekirdek maskesi — hem puanlama hem geliştirme kontrolü için. */
    function glyphMask() {
      const c = scratch();
      const g = c.getContext('2d');
      g.font = layout.font;
      g.textAlign = 'center';
      g.textBaseline = 'alphabetic';
      g.fillStyle = '#000';
      g.fillText(word, layout.x, layout.textY);
      return { ctx: g, data: g.getImageData(0, 0, cssW, cssH).data, w: cssW, h: cssH };
    }

    /** Hedef harfin mürekkep kutusu — oran ve satır denetimi için. */
    function inkBox() {
      const m = glyphMask();
      let minx = m.w, maxx = -1, miny = m.h, maxy = -1;
      for (let y = 0; y < m.h; y++) {
        for (let x = 0; x < m.w; x++) {
          if (m.data[(y * m.w + x) * 4 + 3] > 40) {
            if (x < minx) minx = x; if (x > maxx) maxx = x;
            if (y < miny) miny = y; if (y > maxy) maxy = y;
          }
        }
      }
      if (maxx < 0) return null;
      return { minx, maxx, miny, maxy, w: maxx - minx, h: maxy - miny };
    }

    function evaluate() {
      const inkPoints = strokes.reduce((n, s) => n + s.length, 0);
      if (!inkPoints) return { ok: false, score: 0, coverage: 0, precision: 0, empty: true };
      if (!word) return { ok: true, score: 100, coverage: 1, precision: 1, empty: false };

      const coreC = scratch(), fatC = scratch(), inkC = scratch();
      const core = coreC.getContext('2d'), fat = fatC.getContext('2d'), ink = inkC.getContext('2d');
      [core, fat].forEach((c) => {
        c.font = layout.font;
        c.textAlign = 'center';
        c.textBaseline = 'alphabetic';
        c.fillStyle = '#000';
        c.strokeStyle = '#000';
        c.lineJoin = 'round';
        c.lineCap = 'round';
      });
      core.fillText(word, layout.x, layout.textY);
      fat.lineWidth = opts.tolerance;
      fat.strokeText(word, layout.x, layout.textY);
      fat.fillText(word, layout.x, layout.textY);
      for (const s of strokes) strokePath(ink, s, '#000', opts.penWidth + 12);

      const A = core.getImageData(0, 0, cssW, cssH).data;
      const B = fat.getImageData(0, 0, cssW, cssH).data;
      const C = ink.getImageData(0, 0, cssW, cssH).data;

      let coreTotal = 0, coreHit = 0, inkTotal = 0, inkInside = 0;
      for (let y = 0; y < cssH; y += 2) {
        for (let x = 0; x < cssW; x += 2) {
          const i = (y * cssW + x) * 4 + 3;
          const isCore = A[i] > 40, isFat = B[i] > 40, isInk = C[i] > 40;
          if (isCore) { coreTotal++; if (isInk) coreHit++; }
          if (isInk) { inkTotal++; if (isFat) inkInside++; }
        }
      }
      const coverage = coreTotal ? coreHit / coreTotal : 0;
      const precision = inkTotal ? inkInside / inkTotal : 0;
      return {
        ok: coverage >= 0.5 && precision >= 0.55,
        score: Math.round((coverage * 0.62 + precision * 0.38) * 100),
        coverage, precision, empty: false
      };
    }

    /* ---------------- genel API ---------------- */
    const api = {
      canvas: canvasEl,
      setWord(w) { word = String(w || ''); auto = null; computeLayout(); render(); },
      getWord() { return word; },
      setForm(f) { form = f || null; auto = null; render(); },
      getForm() { return form; },
      setShowStart(v) { showStart = !!v; render(); },
      setGhost(on) { ghost = !!on; render(); },
      toggleGhost() { ghost = !ghost; render(); return ghost; },
      isGhost() { return ghost; },
      undo() { strokes.pop(); marks = null; render(); },
      clear() { strokes = []; active = null; marks = null; render(); },
      /** Kontrol sonrası öğrencinin gerçek başlangıç/bitiş yerini işaretler. */
      setMarks(m) { marks = m || null; render(); },
      clearMarks() { marks = null; render(); },
      hasInk() { return strokes.length > 0; },
      getStrokes() { return strokes; },
      strokeCount() { return strokes.length; },
      evaluate,
      glyphMask, inkBox,
      refPath, refDots, refThickness, refParts, refBrush,
      toNorm, fromNorm,
      /** Yol düzenleyicide büyütme/kaydırma (kaydedilen yolu etkilemez). */
      setView(v) {
        if (!v) return;
        if (typeof v.zoom === 'number') vZoom = Math.max(0.5, Math.min(6, v.zoom));
        if (typeof v.panX === 'number') vPanX = v.panX;
        if (typeof v.panY === 'number') vPanY = v.panY;
        auto = null; autoKey = '';
        computeLayout();
        render();
      },
      getView() { return { zoom: vZoom, panX: vPanX, panY: vPanY }; },
      /** Yol düzenleyici için: her render sonunda çağrılan çizim kancası. */
      setOverlay(fn) { overlay = fn || null; render(); },
      /** Önbelleği boşaltır (yol elle değiştirildiğinde). */
      invalidate() { auto = null; autoKey = ''; render(); },
      getLayout() { return layout; },
      playDemo, stopDemo,
      /** Video dışa aktarımı için: kareyi elle çizen nesne ({paint(t)}). */
      buildDemo,
      isDemoRunning() { return !!demo; },
      resize,
      setLocked(v) { canvasEl.dataset.locked = v ? 'true' : 'false'; },
      destroy() {
        stopDemo();
        canvasEl.removeEventListener('pointerdown', onDown);
        canvasEl.removeEventListener('pointermove', onMove);
        canvasEl.removeEventListener('pointerup', onUp);
        canvasEl.removeEventListener('pointercancel', onUp);
        canvasEl.removeEventListener('pointerleave', onUp);
      }
    };

    resize();
    return api;
  }

  AH.tracing = { create, ARABIC_FONT, fontFingerprint, DEFAULT_BRUSH };
})();
