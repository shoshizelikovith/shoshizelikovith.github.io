/*
  זרימת האבחון: נחיתה, 8 שאלות, (שאלת הכרעה בתיקו), הרשמה, תוצאה + סרטון + הצעה.
  מסך אחד בכל פעם. כפתור "חזרה" של הדפדפן עובד (היסטוריה עם state).
*/
(function () {
  "use strict";
  var MG = window.MG, CFG = MG.cfg, DATA = window.QUIZ_DATA;
  var STYLE_KEYS = Object.keys(DATA.styles);
  var TOTAL = DATA.questions.length;
  var KEY_RESULT = "mg_result", KEY_USER = "mg_user", KEY_PENDING = "mg_pending";

  var $ = function (id) { return document.getElementById(id); };

  /* טקסט מהנתונים: **הדגשה** הופכת ל-strong, ומותרים <br> ו-<span style>.
     הנתונים הם קובץ שלנו (quiz-data.js) ולא קלט של משתמשת. כך צבע, גודל ושורות חדשות
     שנערכו בעורך נשמרים גם בטקסט שנוצר כאן. */
  function rich(el, t) {
    el.innerHTML = String(t).replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
  }
  var screens = {};
  ["landing", "quiz", "signup", "result"].forEach(function (n) { screens[n] = document.querySelector('[data-screen="' + n + '"]'); });

  var testMode = false;       // ?style=...: בלי שליחה ובלי שמירה
  var lockUntil = 0;          // הגנה מלחיצה כפולה
  var vimeoHandler = null;
  var stickyStyle = "";       // הסגנון שהפס הצף שולח עם cta_click

  /* ---------- ניקוד ---------- */
  function scoreOf(answers) {
    var s = {};
    STYLE_KEYS.forEach(function (k) { s[k] = 0; });
    answers.forEach(function (k) { if (k in s) s[k] += 2; });
    return s;
  }
  function topStyles(answers) {
    var s = scoreOf(answers), max = Math.max.apply(null, STYLE_KEYS.map(function (k) { return s[k]; }));
    return STYLE_KEYS.filter(function (k) { return s[k] === max; });
  }

  /* ---------- היסטוריה ---------- */
  function validState(st) {
    if (!st || typeof st !== "object") return false;
    if (["landing", "quiz", "signup", "result"].indexOf(st.screen) < 0) return false;
    if (st.answers && (!Array.isArray(st.answers) || st.answers.length > TOTAL + 1 ||
        st.answers.some(function (a) { return STYLE_KEYS.indexOf(a) < 0; }))) return false;
    if ((st.screen === "signup" || st.screen === "result") && STYLE_KEYS.indexOf(st.style) < 0) return false;
    return true;
  }
  function pushState(st, replace) {
    try { replace ? history.replaceState(st, "") : history.pushState(st, ""); } catch (e) {}
  }

  /* ---------- הצגת מסך ---------- */
  // תנועה: רק למי שלא ביקשה להפחית תנועה במכשיר
  var animateNext = false;
  function calm() { return !window.matchMedia || window.matchMedia("(prefers-reduced-motion:reduce)").matches; }
  function playEnter(el) {
    el.classList.remove("enter");
    if (!animateNext) return;
    animateNext = false;
    if (calm()) return;
    void el.offsetWidth;
    el.classList.add("enter");
  }
  // חלקי הדף עולים בעדינות כשמגיעים אליהם. בלי תמיכה, או במצב עריכה, הכול פשוט גלוי.
  var rvSeen = null;
  function scrollReveal(root) {
    if (calm() || !window.IntersectionObserver) return;
    if (!rvSeen) rvSeen = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("rv-in"); rvSeen.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    Array.prototype.forEach.call(root.querySelectorAll(".block .narrow > *, .focus-grid > *, .trust-grid > *, .result-text > p, .not-one, .gift, .offer"), function (el) {
      if (el.classList.contains("rv")) return;
      if (el.getBoundingClientRect().top < window.innerHeight * .9) return;
      el.classList.add("rv");
      rvSeen.observe(el);
    });
  }

  function show(name) {
    Object.keys(screens).forEach(function (n) { screens[n].hidden = n !== name; });
    var inFlow = name !== "landing" && name !== "result";
    document.body.classList.toggle("in-flow", inFlow);
    var br = document.querySelector(".site-header .brand"); if (br) br.tabIndex = inFlow ? -1 : 0;
    document.body.classList.toggle("on-result", name === "result");
    if (name !== "result") setSticky(false);
    try { window.scrollTo({ top: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, 0); }
  }
  function focusHeading(id) {
    var h = $(id); if (h) { try { h.focus({ preventScroll: true }); } catch (e) {} }
  }

  /* ---------- שאלות ---------- */
  // איור קטן בצד הריק של המסך: רק במחשב רחב. בטלפון התמונות לא נטענות בכלל.
  var artWide = window.matchMedia ? window.matchMedia("(min-width:1240px)") : { matches: false };
  var artLoaded = false;
  function renderArt(q) {
    var el = $("q-art");
    if (!artWide.matches || !q.art) { el.hidden = true; el.removeAttribute("src"); return; }
    if (!artLoaded) {
      artLoaded = true;
      DATA.questions.forEach(function (x) { if (x.art) new Image().src = "../assets/img/" + x.art; });
    }
    el.src = "../assets/img/" + q.art;
    el.hidden = false;
  }

  function renderQuestion(answers) {
    var i = answers.length; // 0..TOTAL-1 שאלה רגילה; TOTAL = שאלת הכרעה
    var isTie = i === TOTAL;
    var q, tied = null;
    if (isTie) {
      tied = topStyles(answers);
      q = {
        q: DATA.tiebreak.q,
        help: tied.length > 2 ? (DATA.tiebreak.helpMany || DATA.tiebreak.help) : DATA.tiebreak.help,
        answers: DATA.tiebreak.answers.filter(function (a) { return tied.indexOf(a.style) >= 0; })
      };
    } else {
      q = DATA.questions[i];
    }
    show("quiz");
    renderArt(q);
    $("q-intro").hidden = i !== 0;
    rich($("q-title"), q.q);
    rich($("q-help"), q.help);
    // בשאלת ההכרעה אין מונה (לא ״9 מתוך 8״): תווית בלבד, והפס מלא
    if (isTie) rich($("q-count"), DATA.tiebreak.label || ""); else $("q-count").textContent = "שאלה " + (i + 1) + " מתוך " + TOTAL;
    var pct = isTie ? 100 : Math.round((i + 1) / TOTAL * 100);
    var pg = $("progress");
    pg.firstElementChild.style.width = pct + "%";
    pg.setAttribute("aria-valuenow", String(isTie ? TOTAL : i + 1));
    if (isTie) pg.setAttribute("aria-valuetext", DATA.tiebreak.label || ""); else pg.removeAttribute("aria-valuetext");

    var box = $("q-options");
    box.classList.remove("leaving");
    box.textContent = "";
    q.answers.forEach(function (a) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "opt";
      b.dataset.style = a.style;
      var t = document.createElement("span"); rich(t, a.text);
      var ar = document.createElement("i"); ar.setAttribute("aria-hidden", "true"); ar.textContent = "←";
      b.appendChild(t); b.appendChild(ar);
      b.addEventListener("click", function () { onAnswer(answers, a.style, b); });
      box.appendChild(b);
    });
    lockUntil = Date.now() + 250;
    playEnter($("screen-quiz"));
    focusHeading("q-title");
    if (!isTie) MG.track("q" + (i + 1));
  }

  function openQuestion(answers, replace) {
    pushState({ screen: "quiz", answers: answers.slice() }, replace);
    renderQuestion(answers);
  }

  function onAnswer(answers, style, btn) {
    if (Date.now() < lockUntil) return;
    lockUntil = Date.now() + 600;
    var next = answers.concat(style);
    var go = function () {
      animateNext = true;
      if (next.length < TOTAL) return openQuestion(next);
      var top = topStyles(next);
      if (next.length === TOTAL && top.length > 1) return openQuestion(next); // תיקו: שאלת הכרעה
      animateNext = false;
      gatherAnswers(top[0], function () { openSignup(next, top[0]); });
    };
    if (calm() || !btn) return go();
    // התשובה שנבחרה נצבעת לרגע, ורק אז עוברים הלאה
    btn.classList.add("picked");
    $("q-options").classList.add("leaving");
    setTimeout(go, 260);
  }

  /* ---------- הרשמה ---------- */
  function openSignup(answers, style, replace) {
    pushState({ screen: "signup", answers: answers.slice(), style: style }, replace);
    renderSignup(style);
  }
  function renderSignup(style) {
    show("signup");
    var S = DATA.styles[style];
    if (S) $("s-img").src = "../assets/img/" + S.image;
    var u = readJson(KEY_USER) || {};
    if (!$("f-name").value) $("f-name").value = u.name || "";
    if (!$("f-email").value) $("f-email").value = u.email || "";
    if (!$("f-phone").value) $("f-phone").value = u.phone || "";
    clearErrors();
    $("s-submit").disabled = false;
    focusHeading("s-title");
  }
  function clearErrors() {
    ["name", "email", "phone", "consent"].forEach(function (k) {
      $("f-" + k + "-err").textContent = "";
      var el = $("f-" + k); el.removeAttribute("aria-invalid");
    });
    $("form-err").hidden = true;
  }
  function fieldError(k, msg) {
    $("f-" + k + "-err").textContent = msg;
    $("f-" + k).setAttribute("aria-invalid", "true");
  }
  function validate(v) {
    var bad = null;
    clearErrors();
    function mark(k, m) { fieldError(k, m); if (!bad) bad = k; }
    if (!v.name) mark("name", "כתבי כאן את שמך הפרטי.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) mark("email", "כתבי כתובת מייל תקינה, כדי שאוכל לשלוח לך את התוצאה.");
    if (v.phone && v.phone.replace(/\D/g, "").length < 9) mark("phone", "אם בחרת להשאיר מספר, כתבי מספר טלפון תקין.");
    if (!v.consent) mark("consent", "כדי להמשיך, סמני שאת מאשרת לקבל תכנים ועדכונים במייל.");
    if (bad) $("f-" + bad).focus();
    return !bad;
  }

  function onSubmit(ev) {
    ev.preventDefault();
    var st = history.state;
    if (!validState(st) || st.screen !== "signup") return;
    var v = {
      name: $("f-name").value.trim(),
      email: $("f-email").value.trim(),
      phone: $("f-phone").value.trim(),
      consent: $("f-consent").checked
    };
    if (!validate(v)) return;
    $("s-submit").disabled = true;

    var style = st.style;
    writeJson(KEY_USER, { name: v.name, email: v.email, phone: v.phone });
    MG.track("signup", { style: style });
    sendSignup({
      event: "signup", sid: MG.getSid(), name: v.name, email: v.email, phone: v.phone,
      style: style, consent: true, utm: MG.utm || {}, ref: MG.ref || ""
    });
    // התוצאה לא מחכה לשרת
    writeJson(KEY_RESULT, { style: style, ts: Date.now(), answers: st.answers || [] });
    revealResult(style, v.name, function () { openResult(style, true, true); });
  }

  /* שליחת הרשמה: נשמרת מקומית עד שהשרת מאשר, ונשלחת שוב בכניסה הבאה אם נכשלה */
  function sendSignup(payload, attempts) {
    if (!CFG.APPS_URL) return;
    attempts = attempts || 0;
    writeJson(KEY_PENDING, { payload: payload, attempts: attempts + 1 });
    var done = false;
    function fail() { /* נשאר ב-pending */ }
    try {
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
      // גוף טקסט בלי content-type: בקשה פשוטה, בלי preflight
      window.fetch(CFG.APPS_URL, { method: "POST", body: JSON.stringify(payload), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.json(); })
        .then(function (j) { clearTimeout(timer); if (j && j.ok === true && !done) { done = true; MG.ls.del(KEY_PENDING); } else fail(); })
        .catch(function () { clearTimeout(timer); fail(); });
    } catch (e) { fail(); }
  }
  function flushPending() {
    if (testMode || !CFG.APPS_URL) return;
    var p = readJson(KEY_PENDING);
    if (!p || !p.payload) return;
    if ((p.attempts || 0) >= 5) { MG.ls.del(KEY_PENDING); return; }
    sendSignup(p.payload, p.attempts || 0);
  }

  /* ---------- תוצאה ---------- */
  function vimeoSrc(id) {
    return "https://player.vimeo.com/video/" + id + "?dnt=1&title=0&byline=0&portrait=0&playsinline=1";
  }
  function renderResult(style, fresh) {
    var S = DATA.styles[style];
    show("result");
    $("r-name").textContent = S.name;
    renderPersonal(style);
    var img = $("r-img");
    img.src = "../assets/img/" + S.image;
    img.alt = "איור סגנון המאמץ: " + S.name;
    var tx = $("r-text"); tx.textContent = "";
    S.result.forEach(function (t) {
      var p = document.createElement("p");
      rich(p, t);
      tx.appendChild(p);
    });
    rich($("r-intro"), S.videoIntro);

    // סרטון
    var shell = $("r-video");
    shell.textContent = "";
    if (vimeoHandler) { window.removeEventListener("message", vimeoHandler); vimeoHandler = null; }
    var id = String((CFG.VIMEO_IDS || {})[style] || "").trim();
    // ה-placeholder תמיד מתחת: נראה כשאין מזהה, וגם בזמן שהנגן נטען
    shell.innerHTML = '<div class="video-ph" role="img" aria-label="הסרטון יופיע כאן"><span class="play" aria-hidden="true"></span><p>הסרטון שלך יופיע כאן</p></div>';
    if (/^\d{6,12}$/.test(id)) {
      var f = document.createElement("iframe");
      f.src = vimeoSrc(id);
      f.title = "סרטון מתנה: " + S.name;
      f.allow = "autoplay; fullscreen; picture-in-picture";
      f.loading = "lazy";
      shell.appendChild(f);
      var listen = function () { try { f.contentWindow.postMessage(JSON.stringify({ method: "addEventListener", value: "play" }), "https://player.vimeo.com"); } catch (e) {} };
      f.addEventListener("load", listen);
      vimeoHandler = function (e) {
        if (e.origin !== "https://player.vimeo.com") return;
        var d = e.data; if (typeof d === "string") { try { d = JSON.parse(d); } catch (x) { return; } }
        if (!d) return;
        if (d.event === "ready") listen();
        if (d.event === "play") MG.track("video_play", { style: style });
      };
      window.addEventListener("message", vimeoHandler);
    }

    // הצעה לפי הסגנון
    var oc = $("o-copy"); oc.textContent = "";
    var p1 = document.createElement("p"); rich(p1, S.offer.join(" "));
    oc.appendChild(p1);

    var cta = $("cta");
    if (CFG.CARDCOM_URL) cta.href = CFG.CARDCOM_URL;
    cta.onclick = function () { MG.track("cta_click", { style: style }); };
    var sl = $("sticky-cta-link");
    if (CFG.CARDCOM_URL) sl.href = CFG.CARDCOM_URL;
    stickyStyle = style;

    focusHeading("r-title");
    if (fresh) MG.track("result", { style: style });
    scrollReveal(screens.result);
    updateSticky();
  }

  /* ---------- פס כפתור צף במובייל ----------
     מופיע אחרי שגוללים מעבר לסרטון, ונעלם כשהכפתור הראשי של ההצעה בתצוגה. */
  var stickyOn = false;
  var mqMobile = window.matchMedia ? window.matchMedia("(max-width: 800px)") : null;
  function setSticky(on) {
    if (on === stickyOn) return;
    stickyOn = on;
    var bar = $("sticky-cta");
    bar.classList.toggle("show", on);
    bar.setAttribute("aria-hidden", on ? "false" : "true");
    $("sticky-cta-link").tabIndex = on ? 0 : -1;
  }
  function updateSticky() {
    if (screens.result.hidden || !(mqMobile && mqMobile.matches)) return setSticky(false);
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var v = $("r-video").getBoundingClientRect();
    var c = $("cta").getBoundingClientRect();
    var pastVideo = v.bottom < 0;
    var ctaInView = c.top < vh && c.bottom > 0;
    setSticky(pastVideo && !ctaInView);
  }

  function openResult(style, fresh, replace) {
    pushState({ screen: "result", style: style }, replace);
    renderResult(style, fresh);
  }

  /* התוצאה בנויה ממה שהיא עצמה ענתה: השם שלה, המשפט שבחרה, ואיך הסגנונות התחלקו אצלה */
  function plain(t) { return String(t).replace(/\*\*/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }
  function pickMirror(own, style) {
    var order = [5]; // ״מה הכי כואב לך״ קודם, ואם שם בחרה אחרת - התשובה הראשונה בסגנון שלה
    for (var i = 0; i < TOTAL; i++) if (i !== 5) order.push(i);
    for (var k = 0; k < order.length; k++) {
      var q = DATA.questions[order[k]];
      if (own[order[k]] !== style || !q) continue;
      for (var j = 0; j < q.answers.length; j++) if (q.answers[j].style === style) return plain(q.answers[j].text);
    }
    return "";
  }
  function renderPersonal(style) {
    var saved = readJson(KEY_RESULT) || {}, u = readJson(KEY_USER) || {};
    var own = saved.style === style && Array.isArray(saved.answers) && saved.answers.length >= TOTAL ? saved.answers : null;
    var hello = $("r-hello"), mirror = $("r-mirror"), mix = $("r-mix");
    hello.hidden = mirror.hidden = mix.hidden = true;
    if (!own) return;
    if (u.name) { hello.textContent = u.name + ","; hello.hidden = false; }
    var line = pickMirror(own, style);
    if (line) {
      mirror.textContent = "";
      var l = document.createElement("span"); l.className = "r-mirror-l"; l.textContent = "ענית כאן:";
      var t = document.createElement("span"); t.className = "r-mirror-t"; t.textContent = "״" + line + "״";
      mirror.appendChild(l); mirror.appendChild(t);
      mirror.hidden = false;
    }
    var n = {}, total = own.length;
    STYLE_KEYS.forEach(function (k) { n[k] = 0; });
    own.forEach(function (k) { if (k in n) n[k]++; });
    var rows = STYLE_KEYS.slice().sort(function (a, b) { return (b === style) - (a === style) || n[b] - n[a]; });
    mix.textContent = "";
    var head = document.createElement("p"); head.className = "r-mix-t"; head.textContent = "כך זה התחלק אצלך:";
    mix.appendChild(head);
    rows.forEach(function (k, i) {
      var row = document.createElement("div"); row.className = "r-mix-row";
      var nm = document.createElement("span"); nm.className = "r-mix-n"; nm.textContent = DATA.styles[k].name;
      var tr = document.createElement("span"); tr.className = "r-mix-tr";
      tr.setAttribute("role", "img"); tr.setAttribute("aria-label", n[k] + " מתוך " + total);
      var b = document.createElement("i"); b.className = "r-mix-b c" + i;
      b.style.setProperty("--w", Math.max(n[k] ? 8 : 2, Math.round(n[k] / total * 100)) + "%");
      tr.appendChild(b); row.appendChild(nm); row.appendChild(tr); mix.appendChild(row);
    });
    mix.hidden = false;
    if (window.IntersectionObserver && !calm()) {
      var ob = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { mix.classList.add("in"); ob.disconnect(); }
      }, { threshold: .4 });
      mix.classList.remove("in");
      ob.observe(mix);
    } else mix.classList.add("in");
  }

  /* אחרי התשובה האחרונה, לפני ההרשמה: רגע שבו התשובות נאספות. התמונה נשארת מטושטשת עד אחרי ההרשמה. */
  function gatherAnswers(style, done) {
    if (calm()) return done();
    var o = document.createElement("div");
    o.className = "reveal gather";
    o.setAttribute("role", "status");
    var img = document.createElement("img");
    img.src = "../assets/img/" + DATA.styles[style].image; img.alt = ""; img.width = 880; img.height = 880;
    var bar = document.createElement("span"); bar.className = "gather-bar"; bar.appendChild(document.createElement("i"));
    var t = document.createElement("p");
    t.textContent = "רגע, אוספת את התשובות שלך...";
    o.appendChild(img); o.appendChild(bar); o.appendChild(t);
    document.body.appendChild(o);
    void o.offsetWidth;
    o.classList.add("on");
    var ended = false;
    var fin = function () {
      if (ended) return; ended = true;
      done();
      o.classList.add("out");
      setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 450);
    };
    setTimeout(function () { if (!ended) { t.textContent = "התוצאה שלך מוכנה"; o.classList.add("ready"); } }, 1300);
    setTimeout(fin, 2100);
    o.addEventListener("click", fin);
  }

  /* רגע הגילוי: התמונה המטושטשת ממסך ההרשמה מתבהרת, ואז התוצאה. לחיצה מדלגת. */
  function revealResult(style, name, done) {
    if (calm()) return done();
    var S = DATA.styles[style];
    var o = document.createElement("div");
    o.className = "reveal";
    o.setAttribute("role", "status");
    var img = document.createElement("img");
    img.src = "../assets/img/" + S.image; img.alt = ""; img.width = 880; img.height = 880;
    var t = document.createElement("p");
    t.textContent = name ? name + ", הנה התוצאה שלך" : "הנה התוצאה שלך";
    o.appendChild(img); o.appendChild(t);
    document.body.appendChild(o);
    void o.offsetWidth;
    o.classList.add("on");
    var ended = false;
    var fin = function () {
      if (ended) return; ended = true;
      done();
      o.classList.add("out");
      setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 450);
    };
    setTimeout(fin, 1700);
    o.addEventListener("click", fin);
  }

  /* ---------- נחיתה ---------- */
  function renderLanding() { show("landing"); scrollReveal(screens.landing); }

  /* ---------- שחזור מצב ---------- */
  function renderState(st) {
    if (!validState(st)) return renderLanding();
    if (st.screen === "quiz") {
      var a = st.answers || [];
      if (a.length > TOTAL || (a.length === TOTAL && topStyles(a).length < 2)) return renderLanding();
      return renderQuestion(a);
    }
    if (st.screen === "signup") return renderSignup(st.style);
    if (st.screen === "result") return renderResult(st.style, false);
    return renderLanding();
  }

  /* ---------- עזרים ---------- */
  function readJson(k) { try { return JSON.parse(MG.ls.get(k) || "null"); } catch (e) { return null; } }
  function writeJson(k, v) { MG.ls.set(k, JSON.stringify(v)); }

  function back() {
    var st = history.state;
    if (validState(st) && history.length > 1) { history.back(); return; }
    renderLanding(); pushState({ screen: "landing" }, true);
  }

  function startOver() {
    MG.ls.del(KEY_RESULT);
    MG.resetSid();
    pushState({ screen: "landing" }, true);
    renderLanding();
    MG.track("view");
  }

  /* ---------- אתחול ---------- */
  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-start]"), function (b) {
      b.addEventListener("click", function () { animateNext = true; openQuestion([]); });
    });
    $("q-back").addEventListener("click", back);
    $("s-back").addEventListener("click", back);
    $("signup-form").addEventListener("submit", onSubmit);
    $("restart").addEventListener("click", startOver);
    $("sticky-cta-link").addEventListener("click", function () { MG.track("cta_click", { style: stickyStyle }); });
    // קישורי ההמשך (מגנטית, אשה ללא מאמץ, קבוצת הווטסאפ, מעקב בסטטוס): step לפי data-nav
    var NAV_STEPS = { magnetit: "nav_magnetit", isha: "nav_isha", group: "nav_group", status: "nav_status" };
    Array.prototype.forEach.call(document.querySelectorAll("[data-nav]"), function (a) {
      var step = NAV_STEPS[a.getAttribute("data-nav")];
      if (!step) return;
      a.addEventListener("click", function () {
        var st = history.state;
        MG.track(step, { style: (st && (st.screen === "result" || st.screen === "signup") && st.style) || stickyStyle || "" });
      });
    });
    // בדיקה זולה (שתי מדידות) ישירות על הגלילה, בלי requestAnimationFrame שנעצר בלשונית ברקע
    window.addEventListener("scroll", updateSticky, { passive: true });
    window.addEventListener("resize", updateSticky);
    window.addEventListener("popstate", function (e) { renderState(e.state); });

    // מצב בדיקה
    var qs = new URLSearchParams(window.location.search);
    var forced = qs.get("style");
    var host = window.location.hostname;
    var local = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
    if (forced && STYLE_KEYS.indexOf(forced) >= 0 && (local || CFG.ALLOW_STYLE_PARAM === true)) {
      testMode = true; MG.disable();
      $("test-flag").hidden = false;
      renderResult(forced, false);
      return;
    }

    // לבדיקות בלבד: ?fresh=1 ב-localhost מתחיל מהעמוד הראשון, כאילו זו כניסה ראשונה
    if (qs.get("fresh") && local) { MG.ls.del(KEY_RESULT); MG.ls.del(KEY_PENDING); }

    // הכפתור במייל התוצאה: ?r=<סגנון> פותח את התוצאה שלה גם במכשיר אחר (נשמר כמו תוצאה רגילה)
    var fromMail = qs.get("r");
    if (fromMail && STYLE_KEYS.indexOf(fromMail) >= 0) {
      var prev = readJson(KEY_RESULT);
      if (!prev || prev.style !== fromMail) writeJson(KEY_RESULT, { style: fromMail, ts: Date.now(), answers: [] });
      history.replaceState(null, "", window.location.pathname);
    }

    var st = history.state;
    var saved = readJson(KEY_RESULT);
    MG.track("view");
    if (validState(st)) renderState(st);
    else if (saved && STYLE_KEYS.indexOf(saved.style) >= 0) { pushState({ screen: "result", style: saved.style }, true); renderResult(saved.style, false); }
    else { pushState({ screen: "landing" }, true); renderLanding(); }
    flushPending();
  }

  boot();
})();
