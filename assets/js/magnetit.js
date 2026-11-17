/*
  דף ההצעה של מגנטית:
  - m_view בכניסה (עם מקור הכניסה, דרך track.js)
  - קישור לתשלום מתוך config.js, ו-cta_click עם הסגנון
*/
(function () {
  "use strict";
  var MG = window.MG, CFG = MG.cfg, DATA = window.QUIZ_DATA || null;
  var KEY_RESULT = "mg_result"; // אותו מפתח שדף האבחון שומר בו את התוצאה

  /* **הדגשה** הופכת ל-strong, ומותרים <br> ו-<span style>; הנתונים הם קובץ שלנו (כמו בדף האבחון) */
  function rich(el, t) {
    el.innerHTML = String(t).replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
  }

  function savedStyle() {
    try {
      var r = JSON.parse(MG.ls.get(KEY_RESULT) || "null");
      if (r && DATA && DATA.styles && DATA.styles[r.style]) return r.style;
    } catch (e) {}
    return "";
  }
  var style = savedStyle();
  MG.track("m_view", { style: style });

  var links = document.querySelectorAll("a[data-cta]");
  Array.prototype.forEach.call(links, function (a) {
    if (CFG.CARDCOM_URL) a.href = CFG.CARDCOM_URL;
    a.addEventListener("click", function () { MG.track("cta_click", { style: style }); });
  });

  /* פס רכישה בטלפון: מהרגע שהגיעה ל״מה מחכה לך״, ולא כשכפתור תשלום או סוף הדף על המסך */
  var bar = document.getElementById("mn-sticky"), from = document.getElementById("inside");
  if (bar && from && "IntersectionObserver" in window) {
    var hide = document.querySelectorAll(".mnPrice, .mnClosing .mnButton, .mnDisclaimer"), seen = 0;
    var sync = function () {
      var on = from.getBoundingClientRect().top < window.innerHeight && !seen;
      bar.classList.toggle("show", on);
      bar.setAttribute("aria-hidden", on ? "false" : "true");
      bar.firstElementChild.tabIndex = on ? 0 : -1;
    };
    window.addEventListener("scroll", sync, { passive: true });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { seen += e.isIntersecting ? 1 : (e.target.mnSeen ? -1 : 0); e.target.mnSeen = e.isIntersecting; });
      sync();
    });
    Array.prototype.forEach.call(hide, function (el) { io.observe(el); });
  }
})();
