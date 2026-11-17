/*
  מעקב משותף לדף האבחון ולדף מגנטית.
  - sid אקראי ב-localStorage
  - track(step, extra): sendBeacon ל-APPS_URL (רק אם מוגדר), ובנוסף fbq/gtag אם יש מזהים
  - כל שלב נשלח פעם אחת לכל sid (חוץ מ-force)
  אם localStorage חסום, הכול ממשיך לעבוד בלי שמירה.
*/
(function () {
  var CFG = window.SITE_CONFIG || {};
  var K = { sid: "mg_sid", sent: "mg_sent", utm: "mg_utm", ref: "mg_ref" };

  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) {} }
  function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }

  function newSid() {
    var a = "";
    try {
      var b = new Uint8Array(12);
      (window.crypto || window.msCrypto).getRandomValues(b);
      for (var i = 0; i < b.length; i++) a += ("0" + b[i].toString(16)).slice(-2);
    } catch (e) {
      for (var j = 0; j < 24; j++) a += Math.floor(Math.random() * 16).toString(16);
    }
    return a;
  }

  var memSid = null;
  function getSid() {
    var s = lsGet(K.sid);
    if (!s) { s = memSid || newSid(); memSid = s; lsSet(K.sid, s); }
    return s;
  }
  function resetSid() { lsDel(K.sid); lsDel(K.sent); memSid = newSid(); lsSet(K.sid, memSid); return memSid; }

  var sentMem = {};
  function wasSent(step) {
    if (sentMem[getSid() + step]) return true;
    try { var o = JSON.parse(lsGet(K.sent) || "{}"); return !!o[step]; } catch (e) { return false; }
  }
  function markSent(step) {
    sentMem[getSid() + step] = 1;
    try { var o = JSON.parse(lsGet(K.sent) || "{}"); o[step] = 1; lsSet(K.sent, JSON.stringify(o)); } catch (e) {}
  }

  /*
    מקור הכניסה: כל פרמטרי utm_* מהכתובת ו-document.referrer.
    נשמרים ב-sessionStorage מהכניסה הראשונה בביקור, כך שמעבר מהאבחון למגנטית
    (או רענון) לא דורס את המקור האמיתי. אם sessionStorage חסום - נקרא מהכתובת הנוכחית בלבד.
  */
  function captureUtm() {
    var stored = ssGet(K.utm);
    if (stored) { try { return JSON.parse(stored) || {}; } catch (e) {} }
    var got = {}, any = false;
    try {
      var q = new URLSearchParams(window.location.search);
      q.forEach(function (v, k) {
        if (/^utm_[a-z0-9_]{1,30}$/i.test(k) && v && Object.keys(got).length < 10) { got[k.toLowerCase()] = String(v).slice(0, 200); any = true; }
      });
    } catch (e) {}
    if (any) ssSet(K.utm, JSON.stringify(got));
    return got;
  }
  function captureRef() {
    var stored = ssGet(K.ref);
    if (stored !== null) return stored;
    var r = String(document.referrer || "").slice(0, 300);
    ssSet(K.ref, r);
    return r;
  }
  var utm = captureUtm();
  var ref = captureRef();

  // ---- פיקסל ואנליטיקס (נטענים רק אם יש מזהה) ----
  var pixelOn = false, gaOn = false;
  var PIXEL = /^\d{5,20}$/.test(String(CFG.PIXEL_ID || "")) ? String(CFG.PIXEL_ID) : "";
  var GA = /^[A-Za-z0-9-]{4,30}$/.test(String(CFG.GA_ID || "")) ? String(CFG.GA_ID) : "";

  if (PIXEL) {
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    window.fbq("init", PIXEL);
    window.fbq("track", "PageView");
    pixelOn = true;
  }
  if (GA) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    var gs = document.createElement("script");
    gs.async = true; gs.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA);
    document.head.appendChild(gs);
    window.gtag("js", new Date());
    window.gtag("config", GA);
    gaOn = true;
  }

  var FB_STD = { signup: "Lead", result: "ViewContent", cta_click: "InitiateCheckout" };
  var GA_STD = { signup: "generate_lead", result: "view_item", cta_click: "begin_checkout" };

  var disabled = false; // מצב בדיקה (?style=): בלי שליחה בכלל

  // אירועי כניסה: אליהם מצורף מקור הכניסה (utm ו-ref)
  var WITH_SOURCE = { view: 1, m_view: 1 };

  /*
    track("q3", {style:"bohelet"})
    style נשלח בגוף. step אחד נשלח פעם אחת לכל sid, אלא אם extra.force
  */
  function track(step, extra) {
    if (disabled) return false;
    // בדיקות מקומיות לא נרשמות בגיליון המשפך
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return false;
    extra = extra || {};
    var force = !!extra.force;
    if (!force && wasSent(step)) return false;
    markSent(step);
    var sid = getSid();

    if (CFG.APPS_URL) {
      var body = { event: "step", step: step, sid: sid, style: extra.style || "" };
      if (WITH_SOURCE[step]) { body.utm = utm; body.ref = ref; }
      try {
        var ok = navigator.sendBeacon && navigator.sendBeacon(CFG.APPS_URL, JSON.stringify(body));
        if (!ok && window.fetch) {
          window.fetch(CFG.APPS_URL, { method: "POST", body: JSON.stringify(body), keepalive: true }).catch(function () {});
        }
      } catch (e) {}
    }
    try {
      if (pixelOn) {
        if (FB_STD[step]) window.fbq("track", FB_STD[step], extra.style ? { content_name: extra.style } : {});
        else window.fbq("trackCustom", "diag_" + step, extra.style ? { content_name: extra.style } : {});
      }
      if (gaOn) {
        window.gtag("event", GA_STD[step] || "diag_" + step, extra.style ? { style: extra.style } : {});
      }
    } catch (e) {}
    return true;
  }

  window.MG = {
    cfg: CFG, track: track, getSid: getSid, resetSid: resetSid, utm: utm, ref: ref,
    ls: { get: lsGet, set: lsSet, del: lsDel },
    disable: function () { disabled = true; }
  };
})();
