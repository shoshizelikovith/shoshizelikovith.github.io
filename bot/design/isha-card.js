/* כרטיס ״התובנה שלי״ של הבוטית - אשה ללא מאמץ. 1080x1350 (מתאים גם לסטטוס).
 * נבנה 10.11.2026 כתחליף לכרטיס הפשוט ב-saveInsight של בוט-ענן/index.html.
 *
 * drawIshaCard(canvas, {text, title, logoImg, footer, decoImg})
 *   text    - התובנה. כל אורך. פסקאות מופרדות בשורה ריקה. ** של הדגשה מוסרים.
 *             פסקה אחרונה שהיא שאלה (נגמרת ב-?) יורדת, כמו ב-saveInsight הישן.
 *             טקסט ארוך מוקטן עד 34px, ומעבר לזה נחתך בסוף משפט ומקבל ״...״.
 *   title   - הכותרת הקטנה. ברירת מחדל ״התובנה שלי״.
 *   logoImg - Image טעון של img/logo.png (הלוגו הראשי, כחול לילה על שקוף).
 *   footer  - שורת התחתית. ברירת מחדל ״המאמנת הדיגיטלית · אשה ללא מאמץ״.
 *   decoImg - לא חובה. Image טעון של אלמנט מהמאגר (למשל img/heart-layers.png),
 *             נכנס קטן בפינה השמאלית התחתונה, על רצועות הנייר.
 * מחזיר את ה-canvas.
 *
 * לפני הציור: הפונט Assistant (fonts/) טעון, והתמונות טעונות. ראו IshaDesign.ready().
 * בלי פונט טעון canvas נופל בשקט לפונט מערכת - לכן מחכים.
 *
 * שאר הקוד (נייר, שבירת שורות) חשוף ב-window.IshaDesign ומשמש גם את story.html.
 */
(function (global) {
  'use strict';

  var C = {
    cream: '#F2EEE3', soft: '#F8F5EE', deep: '#E7E0CF', deeper: '#DDD4C0',
    ink: '#0D122C', purple: '#A62F7D', pink: '#DF1767', orange: '#F36E21'
  };
  var FAMILY = 'Assistant';

  function font(weight, size) { return weight + ' ' + size + 'px ' + FAMILY + ', sans-serif'; }

  /* ---------- טעינה ---------- */

  function loadImg(src) {
    return new Promise(function (res) {
      if (!src) return res(null);
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = src;
    });
  }

  // מחכה לפונט בכל המשקלים שבשימוש, עם תווים עבריים כדי שה-unicode-range העברי ייטען
  function ready() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var probe = 'אבגדה abc';
    return Promise.all([400, 600, 700, 800].map(function (w) {
      return document.fonts.load(w + ' 40px ' + FAMILY, probe).catch(function () {});
    })).then(function () { return document.fonts.ready; });
  }

  /* ---------- טקסט ---------- */

  function cleanText(t, dropQuestion) {
    var s = String(t == null ? '' : t).replace(/\r/g, '').replace(/\*\*?|__/g, '');
    var paras = s.split(/\n\s*\n/).map(function (p) {
      return p.replace(/^\s*[-•·]\s+/gm, '').replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
    if (dropQuestion !== false && paras.length > 1 && /\?\s*$/.test(paras[paras.length - 1])) paras.pop();
    return paras;
  }

  // מילים שלא נעים לסיים בהן שורה
  var WEAK = {};
  ('אני את אתה הוא היא של על אל עם גם לא כי או אם רק זה זו מה מי כל עד בלי יש אין ' +
    'ואני ואת וגם ולא כדי אלא אבל בין לפני אחרי כמו שלי לו לה לי').split(' ').forEach(function (w) { WEAK[w] = 1; });

  function greedy(ctx, words, maxW) {
    var lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var tryL = cur ? cur + ' ' + words[i] : words[i];
      if (cur && ctx.measureText(tryL).width > maxW) { lines.push(cur); cur = words[i]; }
      else cur = tryL;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // שבירה מאוזנת: אותו מספר שורות כמו החמדני, אבל באורכים דומים, ובלי מילת קישור בסוף שורה
  function wrapBalanced(ctx, text, maxW) {
    var words = text.split(' ').filter(Boolean);
    if (!words.length) return [];
    var base = greedy(ctx, words, maxW);
    if (base.length < 2) return base;
    var lo = maxW * 0.45, hi = maxW;
    for (var it = 0; it < 14; it++) {
      var mid = (lo + hi) / 2;
      if (greedy(ctx, words, mid).length <= base.length) hi = mid; else lo = mid;
    }
    var lines = greedy(ctx, words, hi);
    // אם שורה נגמרת במילת קישור, מחפשים רוחב קרוב (עד המקסימום) עם אותו מספר שורות שבו זה לא קורה
    function weakEnd(ls) { return ls.slice(0, -1).some(function (l) { var w = l.split(' '); return w.length > 1 && WEAK[w[w.length - 1]]; }); }
    if (weakEnd(lines)) {
      for (var ww = hi; ww <= maxW + 0.5; ww += maxW * 0.015) {
        var alt = greedy(ctx, words, Math.min(ww, maxW));
        if (alt.length === base.length && !weakEnd(alt)) { lines = alt; break; }
      }
    }
    // מילה חלשה בסוף שורה עוברת לשורה הבאה, אם יש שם מקום
    for (var i = 0; i < lines.length - 1; i++) {
      var ws = lines[i].split(' ');
      var last = ws[ws.length - 1];
      if (ws.length > 1 && WEAK[last]) {
        var next = last + ' ' + lines[i + 1];
        if (ctx.measureText(next).width <= maxW) { ws.pop(); lines[i] = ws.join(' '); lines[i + 1] = next; }
      }
    }
    return lines;
  }

  /* מתאים גודל לבלוק פסקאות בתוך תיבה. מחזיר {size, lh, paraGap, paras:[[lines]], height}.
   * o: {w, h, weight, max, min, lh(יחס), paraGap(יחס)} */
  function fitParas(ctx, paras, o) {
    var lhR = o.lh || 1.38, gapR = o.paraGap == null ? 0.55 : o.paraGap;
    function layout(ps, size) {
      ctx.font = font(o.weight, size);
      var out = ps.map(function (p) { return wrapBalanced(ctx, p, o.w); });
      var n = 0; out.forEach(function (l) { n += l.length; });
      var h = n * size * lhR + (out.length - 1) * size * gapR;
      return { size: size, lh: size * lhR, paraGap: size * gapR, paras: out, height: h };
    }
    for (var s = o.max; s >= o.min; s -= 2) {
      var L = layout(paras, s);
      if (L.height <= o.h) return L;
    }
    // לא נכנס גם בגודל המינימלי: חותכים בסוף משפט ומוסיפים ״...״
    var flat = paras.join('\n\n'), lo = 20, hi = flat.length, best = null;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var L2 = layout(trimToSentence(flat.slice(0, mid)).split('\n\n'), o.min);
      if (L2.height <= o.h) { best = L2; lo = mid + 1; } else hi = mid - 1;
    }
    best = best || layout([flat.slice(0, 40) + '...'], o.min);
    best.truncated = true;
    return best;
  }

  function trimToSentence(s) {
    s = s.replace(/\s+\S*$/, '');
    var m = s.match(/^([\s\S]*[.!?])\s[^.!?]*$/);
    var base = (m && m[1].length > s.length * 0.6) ? m[1] : s;
    return base.replace(/[\s,;:.]+$/, '') + '...';
  }

  // מצייר בלוק פסקאות. x = מרכז (align 'center') או קצה ימני (align 'right'). y = ראש הבלוק. מחזיר את התחתית.
  function drawParas(ctx, L, cx, y, color, weight, align) {
    ctx.save();
    ctx.font = font(weight, L.size); ctx.fillStyle = color;
    ctx.direction = 'rtl'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'alphabetic';
    var asc = L.size * 0.80, pad = (L.lh - L.size) / 2;
    L.paras.forEach(function (lines, pi) {
      if (pi) y += L.paraGap;
      lines.forEach(function (line) { ctx.fillText(line, cx, y + pad + asc); y += L.lh; });
    });
    ctx.restore();
    return y;
  }

  function text(ctx, str, x, y, weight, size, color, align, spacing) {
    ctx.save();
    ctx.font = font(weight, size); ctx.fillStyle = color;
    ctx.direction = 'rtl'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'alphabetic';
    if (spacing && 'letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  /* ---------- נייר ---------- */

  // מסלול חלק דרך נקודות (קשתות ריבועיות בין נקודות האמצע)
  function smoothPath(ctx, pts, move) {
    if (move) ctx.moveTo(pts[0][0], pts[0][1]); else ctx.lineTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    var l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]);
  }

  /* יריעת נייר: הקצה העליון הוא עקומה, והיא נסגרת דרך פינות הפריים (close = רשימת נקודות).
   * עומק מגיע מצל רך ומעובי קצה - בלי מרקם, בלי קווים. */
  function sheet(ctx, edge, close, fill, depth) {
    depth = depth == null ? 1 : depth;
    ctx.save();
    ctx.beginPath(); smoothPath(ctx, edge, true);
    close.forEach(function (p) { ctx.lineTo(p[0], p[1]); });
    ctx.closePath();
    if (depth) {
      ctx.shadowColor = 'rgba(13,18,44,' + (0.16 * depth) + ')';
      ctx.shadowBlur = 34 * depth; ctx.shadowOffsetY = -6 * depth;
    }
    ctx.fillStyle = fill; ctx.fill();
    ctx.restore();
    // עובי הקצה: פס בהיר דק לאורך החיתוך, כמו קצה של דף
    if (depth) {
      ctx.save();
      ctx.beginPath(); smoothPath(ctx, edge, true);
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
  }

  function wave(x0, x1, yAt, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) { var x = x0 + (x1 - x0) * i / n; pts.push([x, yAt(x)]); }
    return pts;
  }

  /* רצועות הנייר בתחתית: נכנסות משמאל, עולות ויוצאות מימין. קרם על קרם, ושכבת סגול אחת מציצה.
   * base = גובה הקצה של היריעה העליונה (המשטח החלק שעליו יושבת שורת התחתית). */
  function bottomBands(ctx, W, H, base) {
    var close = [[W + 40, H + 40], [-40, H + 40]];
    var S = W / 1080;
    function edge(off, amp, ph, tilt) {
      return wave(-40, W + 40, function (x) {
        return base + off * S - tilt * S * (x / W) + Math.sin(x / W * Math.PI * 1.25 + ph) * amp * S;
      }, 24);
    }
    // היריעה הגבוהה ביותר מגיעה לכל היותר ל-base-200 (בקנה מידה של 1080)
    sheet(ctx, edge(-122, 30, 0.2, 48), close, C.deeper, 0.7);
    sheet(ctx, edge(-108, 30, 0.6, 46), close, C.purple, 0.8);
    sheet(ctx, edge(-78, 30, 0.6, 46), close, C.deep, 0.9);
    sheet(ctx, edge(-34, 26, 1.3, 36), close, C.cream, 1);
    sheet(ctx, edge(0, 18, 2.1, 20), close, C.soft, 1);
  }

  /* רצועה רחבה בפינה העליונה השמאלית: נכנסת מהצד ויוצאת מלמעלה */
  function cornerRibbon(ctx, W, scale) {
    var s = scale || 1;
    function band(w0, w1, fill, depth) {
      var outer = [[-40, (430 + w1) * s], [120 * s, (250 + w1 * 0.7) * s], [300 * s, (110 + w1 * 0.4) * s], [(470 + w1) * s, -40]];
      ctx.save();
      ctx.beginPath();
      smoothPath(ctx, outer, true);
      ctx.lineTo(-40, -40);
      ctx.closePath();
      ctx.shadowColor = 'rgba(13,18,44,' + (0.15 * depth) + ')';
      ctx.shadowBlur = 30 * depth; ctx.shadowOffsetY = 8 * depth; ctx.shadowOffsetX = 4 * depth;
      ctx.fillStyle = fill; ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.beginPath(); smoothPath(ctx, outer, true);
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
    band(0, 96, C.deep, 0.8);
    band(0, 62, C.purple, 0.8);
    band(0, 24, C.cream, 0.9);
    band(0, -40, C.soft, 1);
  }

  /* ---------- תמונות ---------- */

  function inkBox(img) {
    if (img.__ink) return img.__ink;
    var nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
    var box = { x: 0, y: 0, w: nw, h: nh };
    try {
      var s = Math.min(1, 600 / nw), w = Math.max(1, Math.round(nw * s)), h = Math.max(1, Math.round(nh * s));
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
      var d = x.getImageData(0, 0, w, h).data, a = w, e = -1, t = h, b = -1;
      for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
        if (d[(yy * w + xx) * 4 + 3] > 10) {
          if (xx < a) a = xx; if (xx > e) e = xx; if (yy < t) t = yy; if (yy > b) b = yy;
        }
      }
      if (e >= 0) box = { x: a / s, y: t / s, w: (e - a + 1) / s, h: (b - t + 1) / s };
    } catch (err) { /* בלי גישה לפיקסלים (file://) מציירים את הקובץ כולו */ }
    img.__ink = box;
    return box;
  }

  // מצייר תמונה ממורכזת ב-cx, מלמעלה ב-y, בתוך maxW x maxH. מחזיר את המלבן.
  function placeCenter(ctx, img, cx, y, maxW, maxH) {
    if (!img) return { x: cx, y: y, w: 0, h: 0 };
    var b = inkBox(img), s = Math.min(maxW / b.w, maxH / b.h), w = b.w * s, h = b.h * s;
    ctx.drawImage(img, b.x, b.y, b.w, b.h, cx - w / 2, y, w, h);
    return { x: cx - w / 2, y: y, w: w, h: h };
  }

  function roundRect(ctx, x, y, w, h, r) {
    var rr = typeof r === 'number' ? [r, r, r, r] : r; // [tl, tr, br, bl]
    ctx.beginPath();
    ctx.moveTo(x + rr[0], y);
    ctx.lineTo(x + w - rr[1], y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr[1]);
    ctx.lineTo(x + w, y + h - rr[2]); ctx.quadraticCurveTo(x + w, y + h, x + w - rr[2], y + h);
    ctx.lineTo(x + rr[3], y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rr[3]);
    ctx.lineTo(x, y + rr[0]); ctx.quadraticCurveTo(x, y, x + rr[0], y);
    ctx.closePath();
  }

  function prepare(canvas, W, H) {
    canvas.width = W; canvas.height = H;
    if (canvas.setAttribute) canvas.setAttribute('dir', 'rtl');
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    return ctx;
  }

  /* ---------- הכרטיס ---------- */

  function drawIshaCard(canvas, o) {
    o = o || {};
    var W = 1080, H = 1350, cx = W / 2;
    var ctx = prepare(canvas, W, H);
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);

    cornerRibbon(ctx, W, 0.8);
    bottomBands(ctx, W, H, 1214);

    // לוגו
    var logo = placeCenter(ctx, o.logoImg, cx, 78, 300, 200);
    var y = logo.y + (logo.h || 160) + 70;

    // כותרת קטנה, ונקודה כתומה אחת כמו הנקודה של ה-שׁ
    var title = o.title || 'תובנה מהמסע שלי';
    text(ctx, title, cx, y, 700, 44, C.purple, 'center', 1);
    ctx.save(); ctx.font = font(700, 44);
    var tw = ctx.measureText(title).width; ctx.restore();
    ctx.fillStyle = C.orange;
    ctx.beginPath(); ctx.arc(cx + tw / 2 + 24, y - 15, 8, 0, Math.PI * 2); ctx.fill();

    // איפה היא בדרך: ״שבוע 2 בממגנטת״ - כדי שיהיה ברור שזו תובנה מתוך מסע
    if (o.journey) { text(ctx, o.journey, cx, y + 56, 600, 32, C.ink, 'center', 0.62); y += 40; }

    // הטקסט
    var top = y + 64, bottom = 990;
    var paras = cleanText(o.text, o.dropQuestion);
    if (!paras.length) paras = [' '];
    var L = fitParas(ctx, paras, { w: 830, h: bottom - top, weight: 700, max: 84, min: 34, lh: 1.36, paraGap: 0.5 });
    var ty = top + Math.max(0, (bottom - top - L.height) / 2) * 0.85;
    drawParas(ctx, L, cx, ty, C.ink, 700);

    // אלמנט מהמאגר, אם נשלח
    if (o.decoImg) {
      ctx.save();
      ctx.translate(150, 1150); ctx.rotate(-0.12);
      ctx.shadowColor = 'rgba(13,18,44,.18)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
      placeCenter(ctx, o.decoImg, 0, -80, 190, 160);
      ctx.restore();
    }

    // שורת תחתית, על המשטח החלק של היריעה העליונה
    text(ctx, o.footer || 'מתוך ההתכתבות שלי עם המאמנת הדיגיטלית · אשה ללא מאמץ', cx, 1290, 600, 32, C.purple, 'center', 0.5);
    canvas.__layout = { size: L.size, lines: L.paras.reduce(function (n, p) { return n + p.length; }, 0), truncated: !!L.truncated, textTop: ty, textBottom: ty + L.height };
    return canvas;
  }

  global.drawIshaCard = drawIshaCard;
  global.IshaDesign = {
    C: C, font: font, ready: ready, loadImg: loadImg, cleanText: cleanText,
    wrapBalanced: wrapBalanced, fitParas: fitParas, drawParas: drawParas, text: text,
    sheet: sheet, wave: wave, bottomBands: bottomBands, cornerRibbon: cornerRibbon,
    inkBox: inkBox, placeCenter: placeCenter, roundRect: roundRect, prepare: prepare
  };
})(window);
