/* תמונת ״המשפט שלי לדרך״ של הבוטית: כיוון ״הרצועות״ שבחרה שושי, 5.11.2026. 1080x1920.
 *
 * drawCard_2(canvas, {text, step, title, sigImg, logoImg});
 *   text    - המשפט של האשה. כל אורך, לא נחתך.
 *   step    - מספר הצעד מהשיחה, או null ואז כתוב ״בהשראת מגנטית״.
 *   title   - הכותרת שמעל המשפט (T.sentence_image_title בדף).
 *   sigImg  - img/sig-im.png, החתימה בכתב יד. מרונדרת מראש, הפונט לא מוטמע באתר.
 *   logoImg - img/magnetit-temp.svg. קובץ אחד, תמיד על קרם, לכן אין צורך בנגטיב.
 *
 * להחלפת לוגו: מחליפים את הקובץ ובודקים בעין. הקוד חותך לבד שוליים שקופים
 * ושומר על יחס הגובה-רוחב, כך שקובץ במידות אחרות נכנס לאותו מקום.
 *
 * לפני הציור: Assistant במשקלים 600, 700, 800 טעון, ושתי התמונות טעונות מאותו מקור כמו הדף
 * (ראו prepareCard ב-index.html). מקור הכיוונים והגיליון: תצוגות/כרטיס-משפט/.
 */
(function (global) {
  'use strict';

  var W = 1080, H = 1920;
  var CREAM = '#F2EEE3', NAVY = '#0D122C', MAG = '#DF1767';
  var TAGLINE = 'צעדים ראשונים לנשיות ללא מאמץ';
  var CARD_TITLE = 'המשפט שלי לדרך';

  function font(weight, size) { return weight + ' ' + size + 'px Assistant'; }

  function clean(t) {
    return String(t == null ? '' : t)
      .replace(/\s+/g, ' ')
      .replace(/^[\s"״“”]+|[\s"״“”]+$/g, '')
      .replace(/([^.])\.$/, '$1')
      .trim();
  }

  function inspiration(step) {
    return step ? 'בהשראת צעד ' + step + ' במגנטית' : 'בהשראת מגנטית';
  }

  /* ---------- שבירת שורות ---------- */

  // מילים שלא נעים לסיים בהן שורה
  var WEAK = {};
  ('אני את אתה הוא היא של על אל עם גם לא כי או אם רק זה זו מה מי כל עד בלי יש אין ' +
    'ואני ואת וגם ולא כדי אלא אבל בין לפני אחרי כמו שלי').split(' ').forEach(function (w) { WEAK[w] = 1; });

  function widthsAt100(ctx, words, weight) {
    ctx.font = font(weight, 100);
    var out = words.map(function (w) { return ctx.measureText(w).width; });
    return { w: out, space: ctx.measureText(' ').width };
  }

  /* בלוק של פוסטר: כל שורה מקבלת גודל משלה ומגיעה בדיוק לאותו רוחב */
  function fitPoster(ctx, text, o) {
    var words = clean(text).split(' ');
    var weight = o.weight || 800, n = words.length;
    var m = widthsAt100(ctx, words, weight);
    var cap = o.maxSize || 400, floorRatio = o.maxRatio || 2.1;
    var candidates = [];

    function nat(i, j) { var r = 0; for (var q = i; q < j; q++) r += m.w[q] + (q > i ? m.space : 0); return r; }
    function inkOf(i, j) {
      ctx.font = font(weight, 100);
      // הזנב של פסיק בסוף שורה נחשב רק חצי, כדי שלא יפתח רווח גדול אבל גם לא ייגע בשורה הבאה
      var txt = words.slice(i, j).join(' ');
      var t = ctx.measureText(txt), bare = ctx.measureText(txt.replace(/[,;]$/, ''));
      return { a: t.actualBoundingBoxAscent, d: bare.actualBoundingBoxDescent + (t.actualBoundingBoxDescent - bare.actualBoundingBoxDescent) * 0.6 };
    }

    // לכל מספר שורות שתי חלוקות: אחת לפי פסיקים ואחת לפי אורך אחיד. הבחירה ביניהן בהמשך.
    function split(k, commaWeight) {
      var ideal = (nat(0, n) - m.space * (k - 1)) / k;
      var dp = [], back = [], i, j, kk;
      for (kk = 0; kk <= k; kk++) { dp[kk] = []; back[kk] = []; for (j = 0; j <= n; j++) dp[kk][j] = Infinity; }
      dp[0][0] = 0;
      for (kk = 1; kk <= k; kk++) {
        for (j = kk; j <= n; j++) {
          for (i = kk - 1; i < j; i++) {
            if (dp[kk - 1][i] === Infinity) continue;
            var r = Math.log(nat(i, j) / ideal);
            var c = r * r * 10;
            var end = words[j - 1];
            if (j < n && /[,;:]$/.test(end)) c -= commaWeight;
            for (var q = i; q < j - 1; q++) if (/[,;:]$/.test(words[q])) c += commaWeight * 0.6;
            if (j < n && WEAK[end]) c += 0.8;
            if (dp[kk - 1][i] + c < dp[kk][j]) { dp[kk][j] = dp[kk - 1][i] + c; back[kk][j] = i; }
          }
        }
      }
      if (dp[k][n] === Infinity) return;
      var cuts = [], e = n;
      for (kk = k; kk > 0; kk--) { cuts.unshift([back[kk][e], e]); e = back[kk][e]; }
      var lines = cuts.map(function (cc) {
        var nw = Math.max(nat(cc[0], cc[1]), 1);
        var ink = inkOf(cc[0], cc[1]);
        return {
          words: words.slice(cc[0], cc[1]), wid: m.w.slice(cc[0], cc[1]), nat: nw,
          size: Math.min(o.w / nw * 100, cap), inkA: ink.a, inkD: ink.d
        };
      });
      var sizes = lines.map(function (l) { return l.size; });
      candidates.push({
        lines: lines, k: k, cost: dp[k][n],
        ratio: Math.max.apply(null, sizes) / Math.min.apply(null, sizes),
        height: blockInkHeight(lines, o.gap || 0.13)
      });
    }
    for (var kn = 1; kn <= Math.min(n, 14); kn++) { split(kn, 1.1); split(kn, 0.2); }

    // משפט ארוך נשאר רגוע. במשפט קצר מותר לשורה אחת להיות ענקית.
    var limit = n <= 7 ? Math.max(floorRatio, 2.4) : floorRatio;
    var okOnes = candidates.filter(function (c) { return c.ratio <= limit; });
    if (!okOnes.length) okOnes = candidates;
    var best = null, bestScore = -Infinity;
    okOnes.forEach(function (cand) {
      var scale = cand.height > o.h ? o.h / cand.height : 1;
      var fill = (cand.height * scale) / o.h;
      var score = fill * scale * scale - cand.cost * 0.012;
      if (score > bestScore) { bestScore = score; best = cand; }
    });
    var sc = best.height > o.h ? o.h / best.height : 1;
    best.lines.forEach(function (l) { l.size *= sc; });
    best.height = blockInkHeight(best.lines, o.gap || 0.13);
    best.weight = weight;
    best.width = o.w * sc;
    return best;
  }

  function blockInkHeight(lines, gapRatio) {
    var sum = 0, avg = 0;
    lines.forEach(function (l) { sum += (l.inkA + l.inkD) / 100 * l.size; avg += l.size; });
    avg /= lines.length;
    return sum + (lines.length - 1) * avg * gapRatio;
  }

  /* ---------- צורות מהלוגו ---------- */

  // ראשי ה-ט מהלוגו, באותן פרופורציות: ראש צר עם צד נוטה, ראש רחב ישר. יורדים מקצה הפריים.
  function letterHeads(ctx, x, bottom, s, color) {
    ctx.fillStyle = color;
    var lw = 191 * s, g = 65 * s, rw = 283 * s, slope = 0.115;
    ctx.beginPath();
    ctx.moveTo(x - slope * bottom, 0); ctx.lineTo(x + lw - slope * bottom, 0);
    ctx.lineTo(x + lw, bottom); ctx.lineTo(x, bottom); ctx.closePath(); ctx.fill();
    ctx.fillRect(x + lw + g, 0, rw, bottom);
    return { gapX: x + lw + g / 2, right: x + lw + g + rw };
  }

  /* ---------- תמונות ---------- */

  // חותך שוליים שקופים. כך קובץ לוגו אחר, עם שוליים אחרים, עדיין נכנס נכון.
  function inkBox(img) {
    if (img.__ink) return img.__ink;
    var nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
    var s = Math.min(1, 900 / nw), w = Math.round(nw * s), h = Math.round(nh * s);
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
    var box = { x: 0, y: 0, w: nw, h: nh };
    try {
      var d = x.getImageData(0, 0, w, h).data, a = w, e = -1, t = h, b = -1;
      for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
        if (d[(yy * w + xx) * 4 + 3] > 10) {
          if (xx < a) a = xx; if (xx > e) e = xx;
          if (yy < t) t = yy; if (yy > b) b = yy;
        }
      }
      if (e >= 0) box = { x: a / s, y: t / s, w: (e - a + 1) / s, h: (b - t + 1) / s };
    } catch (err) { /* אם אין גישה לפיקסלים, מציירים את הקובץ במלואו */ }
    img.__ink = box;
    return box;
  }

  // מצייר תמונה לפי רוחב או גובה מקסימליים, בלי לעוות. מיושר לפי align.
  function placeImg(ctx, img, xRight, yTop, maxW, maxH, align, tint) {
    if (!img) return { x: xRight, y: yTop, w: 0, h: 0 };
    var box = inkBox(img);
    var s = Math.min(maxW / box.w, maxH / box.h);
    var w = box.w * s, h = box.h * s;
    var x = align === 'center' ? xRight - maxW / 2 - w / 2 : (align === 'left' ? xRight - maxW : xRight - w);
    if (tint) {
      var c = document.createElement('canvas'); c.width = Math.ceil(w * 2); c.height = Math.ceil(h * 2);
      var t = c.getContext('2d');
      t.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, c.width, c.height);
      t.globalCompositeOperation = 'source-in'; t.fillStyle = tint; t.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(c, x, yTop, w, h);
    } else {
      ctx.drawImage(img, box.x, box.y, box.w, box.h, x, yTop, w, h);
    }
    return { x: x, y: yTop, w: w, h: h };
  }

  function setText(ctx, weight, size, color, align) {
    ctx.font = font(weight, size); ctx.fillStyle = color;
    ctx.direction = 'rtl'; ctx.textAlign = align || 'right'; ctx.textBaseline = 'alphabetic';
  }

  // חתימת המותג בעמודה: לוגו, משפט וכתב יד באותו רוחב בדיוק
  function signatureStack(ctx, o, centerX, top, w, sigTint) {
    var right = centerX + w / 2, y = top;
    var logoBox = inkBox(o.logoImg || { naturalWidth: 4, naturalHeight: 1, width: 4, height: 1, __ink: { x: 0, y: 0, w: 4, h: 1 } });
    var logoH = w * logoBox.h / logoBox.w;
    placeImg(ctx, o.logoImg, right, y, w, logoH, 'right');
    y += logoH + 18;
    var size = 60;
    setText(ctx, 600, size, NAVY);
    size = size * w / ctx.measureText(TAGLINE).width;
    setText(ctx, 600, size, NAVY);
    ctx.fillText(TAGLINE, right, y + size * 0.82);
    y += size + 12;
    var r = placeImg(ctx, o.sigImg, right, y, w, 200, 'center', sigTint);
    return y + r.h - top;
  }

  function prepare(canvas) {
    canvas.width = W; canvas.height = H;
    canvas.setAttribute && canvas.setAttribute('dir', 'rtl');
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    return ctx;
  }

  /* ---------- כיוון 2: הרצועות ---------- */
  /* לילה מלא. כל שורה במשפט היא רצועת נייר משלה, נוטה ויוצאת מהפריים. סרט מג׳נטה נושא את ״בהשראת״. */
  function drawCard_2(canvas, o) {
    var ctx = prepare(canvas), M = 96, R = W - M, TW = W - 2 * M - 12;
    ctx.fillStyle = NAVY; ctx.fillRect(0, 0, W, H);

    var title = o.title || CARD_TITLE;
    setText(ctx, 700, 72, CREAM);
    ctx.fillText(title, R, 164);
    letterHeads(ctx, 96, 150, 0.42, MAG);

    var top = 236, bottom = 1210, gap = 0.5;
    var block = fitPoster(ctx, o.text, { w: TW, h: bottom - top, maxSize: 320, maxRatio: 1.5, gap: gap });
    var avg = 0; block.lines.forEach(function (l) { avg += l.size; }); avg /= block.lines.length;
    var pad = avg * 0.19, extra = Math.max(0, (bottom - top) - block.height);
    var y = top + extra * 0.42;
    var ang = 0.04;

    ctx.save();
    ctx.translate(W / 2, (top + bottom) / 2);
    ctx.rotate(ang);
    ctx.translate(-W / 2, -(top + bottom) / 2);
    block.lines.forEach(function (l, i) {
      var k = l.size / 100, h = (l.inkA + l.inkD) * k;
      var left = M - 34 - (i % 2 ? 0 : 18);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 7;
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.moveTo(left + 10, y - pad); ctx.lineTo(W + 60, y - pad);
      ctx.lineTo(W + 60, y + h + pad); ctx.lineTo(left, y + h + pad);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      setText(ctx, 800, l.size, NAVY);
      ctx.fillText(l.words.join(' '), R, y + l.inkA * k);
      y += h + avg * gap;
    });
    ctx.restore();

    // יריעת הקרם של המותג
    var yL = 1382, yR = yL + W * Math.tan(ang);
    ctx.fillStyle = CREAM;
    ctx.beginPath(); ctx.moveTo(0, yL); ctx.lineTo(W, yR); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

    // הסרט: בהשראת
    var band = 104;
    setText(ctx, 700, 62, CREAM);
    var tw = ctx.measureText(inspiration(o.step)).width;
    var bl = R - tw - 74;
    var yAt = function (x) { return yL + x * Math.tan(ang); };
    ctx.fillStyle = MAG;
    ctx.beginPath();
    ctx.moveTo(bl + 14, yAt(bl) - band + 2); ctx.lineTo(W, yAt(W) - band); ctx.lineTo(W, yAt(W) + 2); ctx.lineTo(bl, yAt(bl) + 2);
    ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.translate(R, yAt(R) - band / 2);
    ctx.rotate(ang);
    setText(ctx, 700, 62, CREAM);
    ctx.fillText(inspiration(o.step), 0, 21);
    ctx.restore();

    signatureStack(ctx, o, W / 2, 1490, 560);
    return canvas;
  }

  global.drawCard_2 = drawCard_2;
})(window);
