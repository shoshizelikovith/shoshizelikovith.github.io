/* כרטיס ״התובנה שלי״ של הבוטית - אשה ללא מאמץ. 1080x1350 (מתאים גם לסטטוס).
 * נבנה 10.11.2026 כתחליף לכרטיס הפשוט ב-saveInsight של בוט-ענן/index.html.
 *
 * drawIshaCard(canvas, {text, title, journey, logoImg, courseLogoImg, avatarImg, decoImg, variant, footer})
 *   text    - התובנה. כל אורך. פסקאות מופרדות בשורה ריקה. ** של הדגשה מוסרים.
 *             פסקה אחרונה שהיא שאלה (נגמרת ב-?) יורדת, כמו ב-saveInsight הישן.
 *             טקסט ארוך מוקטן עד 34px, ומעבר לזה נחתך בסוף משפט ומקבל ״...״.
 *   title   - הכותרת הקטנה. ברירת מחדל ״התובנה שלי״.
 *   logoImg - Image טעון של img/logo.png (הלוגו הראשי, כחול לילה על שקוף).
 *   journey - לא חובה. איפה היא בדרך, למשל ״שבוע 2 בממגנטת״.
 *   courseLogoImg - לא חובה. Image טעון של img/course-logo.png (הכיתוב ממגנטת, מג׳נטה על שקוף).
 *   courseBannerImg - לא חובה. Image טעון של img/course-banner.jpg (הבאנר של ממגנטת עם האיור, 1920x1080).
 *             כשהוא קיים הוא מחליף את הכיתוב ממגנטת: בגרסה א הוא ראש הכרטיס ברוחב מלא והכרטיס ״נחתך״ ממנו
 *             באלכסון (הלוגו הראשי כבר בתוך הבאנר, לכן לא מצויר שוב); בגרסה ב הוא גלויה מונחת בזווית
 *             משמאל לצד הלוגו הראשי. היחס נשמר תמיד, בלי מתיחה. בלעדיו - הכרטיס כמו קודם.
 *   avatarImg - לא חובה. Image טעון של img/coach-avatar.jpg (המאמנת הדיגיטלית).
 *   variant - 'a' (ברירת מחדל): התובנה בבועת נייר, המאמנת ״מקלידה״ לידה, ממגנטת כחותם בתחתית.
 *             'b': חותם משותף למעלה, והתובנה בתוך מסך שיחה עם המאמנת, כמו בבוטית.
 *   footer  - לא חובה. שורת טקסט בתחתית - רק אם נשלחה (בגרסה א רק כשאין courseLogoImg).
 *   בלי courseLogoImg/avatarImg הכרטיס עדיין מצויר, פשוט בלי החלקים האלה.
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
    if (base !== s && /[?!]$/.test(base)) return base; // נגמר בשאלה או קריאה - בלי ״...״ אחריהן
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

  /* ---------- באנר הקורס ---------- */

  /* באנר הקורס כראש הכרטיס: ברוחב מלא, ביחס המקורי (רק חיתוך שורות מלמעלה ומלמטה, בלי מתיחה),
   * ויריעת נייר קרם עולה עליו בקצה אלכסוני-גלי - כאילו הכרטיס נחתך מתוך הבאנר.
   * srcTop/srcBot - איזה חלק מגובה הבאנר נכנס (0-1). yL/yR - גובה הקצה בשמאל ובימין.
   * מחזיר את גובה הקצה הנמוך ביותר. */
  function bannerHeader(ctx, img, W, H, srcTop, srcBot, yL, yR) {
    var nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
    var sy = nh * srcTop, sh = nh * (srcBot - srcTop), s = W / nw;
    ctx.drawImage(img, 0, sy, nw, sh, 0, 0, W, sh * s);
    // האלכסון עולה בצד שמאל (על האיור), ומתיישר בימין כדי לא לחתוך את שורות הכיתוב של הבאנר
    var edge = wave(-40, W + 40, function (x) {
      var t = Math.max(0, Math.min(1, x / (W * 0.55))), ss = t * t * (3 - 2 * t);
      return yL + (yR - yL) * ss + Math.sin(x / W * Math.PI * 1.6 + 0.4) * 9 * (1 - ss * 0.8);
    }, 24);
    var close = [[W + 40, H + 40], [-40, H + 40]];
    // שכבת עומק דקה מתחת ליריעה, ואז היריעה עצמה
    sheet(ctx, edge.map(function (p) { return [p[0], p[1] - 12]; }), close, C.deep, 0.6);
    sheet(ctx, edge, close, C.cream, 1);
    return Math.max(yL, yR) + 10;
  }

  /* באנר הקורס כגלויה מונחת בזווית: מסגרת נייר לבנה דקה, צל רך, יחס מקורי.
   * cx/cy - מרכז, w - רוחב הגלויה. */
  function bannerCard(ctx, img, cx, cy, w, rot) {
    var nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
    var h = w * nh / nw, f = Math.round(w * 0.022);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot || 0);
    roundRect(ctx, -w / 2 - f, -h / 2 - f, w + 2 * f, h + 2 * f, 14);
    ctx.save();
    ctx.shadowColor = 'rgba(13,18,44,.22)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.fillStyle = C.soft; ctx.fill();
    ctx.restore();
    roundRect(ctx, -w / 2, -h / 2, w, h, 8);
    ctx.save(); ctx.clip();
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.restore();
    return { w: w + 2 * f, h: h + 2 * f };
  }

  function prepare(canvas, W, H) {
    canvas.width = W; canvas.height = H;
    if (canvas.setAttribute) canvas.setAttribute('dir', 'rtl');
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    return ctx;
  }

  /* ---------- הכרטיס ---------- */

  // אווטאר עגול עם טבעת קרם. בלי תמונה - עיגול קרם ריק.
  function circleImg(ctx, img, cx, cy, r, ring) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath();
    ctx.shadowColor = 'rgba(13,18,44,.18)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
    ctx.fillStyle = C.soft; ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    if (img) {
      var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      var s = Math.max(2 * r / iw, 2 * r / ih);
      ctx.drawImage(img, cx - iw * s / 2, cy - ih * s / 2, iw * s, ih * s);
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = ring || 'rgba(248,245,238,.95)'; ctx.lineWidth = Math.max(3, r * 0.09); ctx.stroke();
  }

  // שלוש נקודות ״מקלידה...״ בסגול, דועכות
  function typingDots(ctx, cx, cy, r, gap, color) {
    [1, 0.62, 0.32].forEach(function (a, i) {
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color || C.purple;
      ctx.beginPath(); ctx.arc(cx + (i - 1) * gap, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  // בועה: מלבן מעוגל, הפינה התחתונה בצד הדוברת חדה יותר
  function bubbleShape(ctx, x, y, w, h, side, r, fill, shadow, border) {
    var k = Math.round(r * 0.28);
    roundRect(ctx, x, y, w, h, side === 'right' ? [r, r, k, r] : [r, r, r, k]);
    ctx.save();
    if (shadow) { ctx.shadowColor = 'rgba(13,18,44,' + shadow + ')'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14; }
    ctx.fillStyle = fill; ctx.fill();
    ctx.restore();
    if (border) { ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.stroke(); }
  }

  // כותרת קטנה עם נקודה כתומה (כמו הנקודה של ה-שׁ), ומתחתיה שורת המסע. מחזיר את התחתית.
  function titleBlock(ctx, o, cx, y) {
    var title = o.title || 'תובנה מהמסע שלי';
    text(ctx, title, cx, y, 700, 44, C.purple, 'center', 1);
    ctx.save(); ctx.font = font(700, 44);
    var tw = ctx.measureText(title).width; ctx.restore();
    ctx.fillStyle = C.orange;
    ctx.beginPath(); ctx.arc(cx + tw / 2 + 24, y - 15, 8, 0, Math.PI * 2); ctx.fill();
    if (o.journey) { text(ctx, o.journey, cx, y + 54, 600, 32, C.ink, 'center', 0.62); return y + 64; }
    return y + 12;
  }

  function textWidth(ctx, L, weight) {
    ctx.save(); ctx.font = font(weight, L.size);
    var w = 0;
    L.paras.forEach(function (ls) { ls.forEach(function (l) { w = Math.max(w, ctx.measureText(l).width); }); });
    ctx.restore();
    return w;
  }

  function drawDeco(ctx, img, x, y, rot, mw, mh) {
    if (!img) return;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.shadowColor = 'rgba(13,18,44,.18)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
    placeCenter(ctx, img, 0, -mh / 2, mw, mh);
    ctx.restore();
  }

  /* גרסה א - ״בועת השיחה״: התובנה יושבת בבועת נייר גדולה (שלה, מימין),
   * ולידה מציצה המאמנת הדיגיטלית - אווטאר ובועה קטנה ״מקלידה...״. ממגנטת כחותם בתחתית. */
  function cardA(ctx, o, W, H, cx) {
    var banner = o.courseBannerImg, y;
    if (banner) {
      // באנר ממגנטת בראש הכרטיס (הלוגו כבר בתוכו), והכרטיס ״נחתך״ ממנו באלכסון
      var hb = bannerHeader(ctx, banner, W, H, 0.035, 0.70, 300, 382);
      bottomBands(ctx, W, H, 1300);
      y = titleBlock(ctx, o, cx, hb + 64);
    } else {
      cornerRibbon(ctx, W, 0.8);
      bottomBands(ctx, W, H, 1220);
      var logo = placeCenter(ctx, o.logoImg, cx, 70, 260, 170);
      y = titleBlock(ctx, o, cx, logo.y + (logo.h || 150) + 62);
    }

    var paras = cleanText(o.text, o.dropQuestion);
    if (!paras.length) paras = [' '];
    var hasCoach = !!o.avatarImg;
    var BX = 96, BWmax = W - 2 * BX, PX = 58, PY = 50;
    var coachH = hasCoach ? 128 : 0;
    var areaTop = y + (banner ? 36 : 44), areaBottom = banner ? 1150 : 1060;
    var L = fitParas(ctx, paras, { w: BWmax - 2 * PX, h: areaBottom - areaTop - coachH - 2 * PY, weight: 700, max: 78, min: 32, lh: 1.34, paraGap: 0.5 });
    var tW = textWidth(ctx, L, 700);
    var bw = Math.min(BWmax, Math.max(tW + 2 * PX, 560)), bh = L.height + 2 * PY;
    var groupH = bh + coachH;
    var by = areaTop + Math.max(0, (areaBottom - areaTop - groupH) / 2) * 0.8;
    var bx = cx - bw / 2;
    bubbleShape(ctx, bx, by, bw, bh, 'right', 54, C.soft, 0.16, 'rgba(13,18,44,.05)');
    drawParas(ctx, L, cx, by + PY, C.ink, 700);

    if (hasCoach) {
      // המאמנת: אווטאר משמאל, מתחת לבועה, ובועה קטנה ״מקלידה...״
      var ar = 50, ax = bx + ar + 6, ay = by + bh + 26 + ar;
      circleImg(ctx, o.avatarImg, ax, ay, ar);
      ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(ax + ar * 0.72, ay + ar * 0.72, 9, 0, Math.PI * 2); ctx.fill();
      var tx = ax + ar + 20, tw2 = 112, th = 62, ty2 = ay - ar + 2;
      bubbleShape(ctx, tx, ty2, tw2, th, 'left', 30, C.soft, 0.10, 'rgba(13,18,44,.07)');
      typingDots(ctx, tx + tw2 / 2, ty2 + th / 2, 7.5, 24);
      ctx.save(); ctx.direction = 'rtl'; ctx.textAlign = 'left'; ctx.font = font(700, 30); ctx.fillStyle = C.purple;
      ctx.fillText('המאמנת הדיגיטלית', tx + 4, ay + ar - 6);
      ctx.restore();
    }

    // אלמנט מהמאגר - בצד ימין למטה, כדי לא להתנגש במאמנת
    drawDeco(ctx, o.decoImg, W - 150, banner ? 1200 : 1130, 0.12, 170, 145);

    // ממגנטת - חותם על המשטח החלק של היריעה העליונה (רק כשאין באנר: הבאנר כבר אומר ממגנטת)
    if (banner) { if (o.footer) text(ctx, o.footer, cx, 1310, 600, 32, C.purple, 'center', 0.5); }
    else if (o.courseLogoImg) placeCenter(ctx, o.courseLogoImg, cx, 1258, 250, 54);
    else if (o.footer) text(ctx, o.footer, cx, 1290, 600, 32, C.purple, 'center', 0.5);
    return { L: L, top: by + PY, bottom: by + PY + L.height, bubble: [bx, by, bw, bh] };
  }

  /* גרסה ב - ״מסך השיחה״: חותם משותף למעלה (אשה ללא מאמץ + ממגנטת), ומתחת מסך שיחה
   * עם המאמנת הדיגיטלית - כותרת כחול לילה עם האווטאר, והתובנה בבועה הסגולה שלה, כמו בבוטית. */
  function cardB(ctx, o, W, H, cx) {
    bottomBands(ctx, W, H, 1236);
    // יריעת נייר עליונה רחבה במקום רצועת הפינה, כדי שיהיה מקום לשני הלוגואים
    sheet(ctx, wave(-40, W + 40, function (x) { return 300 + Math.sin(x / W * Math.PI * 1.1 + 2.4) * 26 - 30 * (x / W); }, 24), [[W + 40, -40], [-40, -40]], C.deep, 0.0);
    ctx.save();
    ctx.beginPath(); smoothPath(ctx, wave(-40, W + 40, function (x) { return 286 + Math.sin(x / W * Math.PI * 1.1 + 2.4) * 26 - 30 * (x / W); }, 24), true);
    ctx.lineTo(W + 40, -40); ctx.lineTo(-40, -40); ctx.closePath();
    ctx.shadowColor = 'rgba(13,18,44,.14)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
    ctx.fillStyle = C.soft; ctx.fill();
    ctx.restore();

    // חותם משותף: הלוגו הראשי מימין, ממגנטת משמאל, ונקודה כתומה ביניהם
    var hasCourse = !!o.courseLogoImg;
    var lr = { x: 0, y: 0, w: 0, h: 0 };
    if (o.courseBannerImg) {
      // באנר ממגנטת כגלויה מונחת באלכסון משמאל, והלוגו הראשי מימין
      lr = placeCenter(ctx, o.logoImg, 830, 62, 220, 150);
      bannerCard(ctx, o.courseBannerImg, 320, 160, 420, -0.05);
    } else if (hasCourse) {
      lr = placeCenter(ctx, o.logoImg, 712, 58, 230, 160);
      var midY = lr.y + (lr.h || 150) * 0.56;
      ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(lr.x - 46, midY, 8, 0, Math.PI * 2); ctx.fill();
      var cb = inkBox(o.courseLogoImg), cs = Math.min(290 / cb.w, 60 / cb.h);
      placeCenter(ctx, o.courseLogoImg, lr.x - 92 - cb.w * cs / 2, midY - cb.h * cs / 2, 290, 60);
    } else {
      lr = placeCenter(ctx, o.logoImg, cx, 58, 250, 165);
    }

    var y = titleBlock(ctx, o, cx, 362);

    // מסך השיחה
    var FX = 92, FW = W - 2 * FX, HEAD = 124, PAD = 36;
    var areaTop = y + 34, areaBottom = 1190;
    var paras = cleanText(o.text, o.dropQuestion);
    if (!paras.length) paras = [' '];
    var hasCoach = !!o.avatarImg;
    var replyH = 66, QPX = 42, QPY = 34;
    var qMaxH = areaBottom - areaTop - HEAD - 2 * PAD - replyH - 30 - 2 * QPY;
    var L = fitParas(ctx, paras, { w: FW - 2 * PAD - 2 * QPX - 10, h: qMaxH, weight: 700, max: 66, min: 28, lh: 1.36, paraGap: 0.5 });
    var tW = textWidth(ctx, L, 700);
    var qw = tW + 2 * QPX, qh = L.height + 2 * QPY;
    var FH = HEAD + PAD + qh + 26 + replyH + PAD;
    var FY = areaTop + Math.max(0, (areaBottom - areaTop - FH) / 2) * 0.7;

    ctx.save();
    ctx.translate(cx, FY + FH / 2); ctx.rotate(-0.012); ctx.translate(-cx, -(FY + FH / 2));
    roundRect(ctx, FX, FY, FW, FH, 50);
    ctx.save();
    ctx.shadowColor = 'rgba(13,18,44,.20)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
    ctx.fillStyle = C.soft; ctx.fill();
    ctx.restore();
    ctx.save(); ctx.clip();
    ctx.fillStyle = C.ink; ctx.fillRect(FX, FY, FW, HEAD);
    var avR = 40, avX = FX + FW - PAD - avR, avY = FY + HEAD / 2;
    var nameX = hasCoach ? avX - avR - 22 : FX + FW - PAD;
    if (hasCoach) {
      circleImg(ctx, o.avatarImg, avX, avY, avR);
      ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(avX - avR * 0.72, avY + avR * 0.72, 9, 0, Math.PI * 2); ctx.fill();
    }
    text(ctx, 'המאמנת הדיגיטלית', nameX, avY + 13, 700, 38, C.cream, 'right');

    // התובנה: הבועה שלה, מימין, סגול
    var qy = FY + HEAD + PAD, qx = FX + FW - PAD - qw;
    bubbleShape(ctx, qx, qy, qw, qh, 'right', 40, C.purple, 0.12);
    drawParas(ctx, L, qx + qw - QPX, qy + QPY, C.cream, 700, 'right');

    // המאמנת ״מקלידה...״ - משמאל
    var ry = qy + qh + 26, rr = 26, rx = FX + PAD;
    if (hasCoach) { circleImg(ctx, o.avatarImg, rx + rr, ry + replyH - rr, rr); rx += 2 * rr + 14; }
    bubbleShape(ctx, rx, ry, 124, replyH, 'left', 32, C.cream, 0, 'rgba(13,18,44,.09)');
    typingDots(ctx, rx + 62, ry + replyH / 2, 8, 26);
    ctx.restore();
    ctx.restore();

    drawDeco(ctx, o.decoImg, 150, 1180, -0.12, 180, 150);
    if (o.footer) text(ctx, o.footer, cx, 1300, 600, 32, C.purple, 'center', 0.5);
    return { L: L, top: qy + QPY, bottom: qy + QPY + L.height, frame: [FX, FY, FW, FH] };
  }

  function drawIshaCard(canvas, o) {
    o = o || {};
    var W = 1080, H = 1350, cx = W / 2;
    var ctx = prepare(canvas, W, H);
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
    var R = (o.variant === 'b' ? cardB : cardA)(ctx, o, W, H, cx);
    var L = R.L;
    canvas.__layout = { variant: o.variant === 'b' ? 'b' : 'a', size: L.size, lines: L.paras.reduce(function (n, p) { return n + p.length; }, 0), truncated: !!L.truncated, textTop: R.top, textBottom: R.bottom, bubble: R.bubble, frame: R.frame };
    return canvas;
  }

  global.drawIshaCard = drawIshaCard;
  global.IshaDesign = {
    C: C, font: font, ready: ready, loadImg: loadImg, cleanText: cleanText,
    wrapBalanced: wrapBalanced, fitParas: fitParas, drawParas: drawParas, text: text,
    sheet: sheet, wave: wave, smoothPath: smoothPath, bottomBands: bottomBands, cornerRibbon: cornerRibbon,
    inkBox: inkBox, placeCenter: placeCenter, roundRect: roundRect, prepare: prepare,
    circleImg: circleImg, typingDots: typingDots, bubbleShape: bubbleShape,
    bannerHeader: bannerHeader, bannerCard: bannerCard
  };
})(window);
