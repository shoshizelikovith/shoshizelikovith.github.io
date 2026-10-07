/**
 * הבוט של "אשה ללא מאמץ" - ממגנטת ויודעת.
 * רץ על Google Apps Script, בחשבון של שושי, בלי שרת ובלי תלות במחשב שלה.
 *
 * מה שצריך להיות מוגדר פעם אחת ב-Script Properties:
 *   ANTHROPIC_API_KEY - המפתח של הבוט
 *   SHEET_ID          - נוצר לבד בהרצה הראשונה
 *   MAIL_TO           - למי שולחים התראות (ברירת מחדל: הבעלים)
 */

var CODE_BUILD = 'CODE-1007-2033';    // מתעדכן לבד ב-bot code
var PER_PART = 297;          // כמה קטעי ידע יושבים בכל קובץ ידע*.js
var PRICE = {light: 0.022, normal: 0.173, deep: 0.248};   // שקלים להודעה

// ---------- הדף ----------

function doGet(e) {
  try { ensureTrigger_(); } catch (e2) { /* הדף נפתח גם בלי הטריגר */ }
  if (e && e.parameter && e.parameter.refresh) {
    try { CacheService.getScriptCache().remove('cfg_n'); CFG_ = null; fetchConfig_(); } catch (e3) {}
  }
  if (e && e.parameter && e.parameter.diag) {
    return ContentService.createTextOutput(JSON.stringify(diag_()))
        .setMimeType(ContentService.MimeType.JSON);
  }
  var cfg = config_(), out;
  if (cfg && cfg.page && String(cfg.page).indexOf('<!DOCTYPE') === 0) {
    out = HtmlService.createHtmlOutput(cfg.page);
  } else {
    out = HtmlService.createHtmlOutputFromFile('index');
  }
  return out
    .setTitle('המאמנת האישית שלך')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * תמונת מצב של הבוט החי, בלי להיכנס לעורך של גוגל.
 * נקראת מ-`bot check`. לא מחזירה שום מידע על תלמידות ולא את המפתח.
 */
function diag_() {
  var o = {code: CODE_BUILD, time: Utilities.formatDate(
      new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd HH:mm')};
  try { var cfg = config_();
        o.config = cfg && cfg['גרסה'] ? cfg['גרסה'] : 'אין';
        o.system = cfg && cfg.system ? cfg.system.length : 0; } catch (e) { o.config = 'שגיאה'; }
  try { o.instructions = stableText_().length; } catch (e) { o.instructions = 'שגיאה'; }
  try { o.key = props_().getProperty('ANTHROPIC_API_KEY') ? true : false; } catch (e) { o.key = 'שגיאה'; }
  try { var t = new Date().getTime();
        var r = retrieve_('איך אני מפסיקה להתאמץ', null, 3, 'magnetit');
        o.retrieve = r.length; o.retrieve_ms = new Date().getTime() - t;
        o.sources = r.map(function (c) { return c.src; }); } catch (e) {
        o.retrieve = 'שגיאה'; o.retrieve_err = String(e).slice(0, 200); }
  try { o.sheet = props_().getProperty('SHEET_ID') ? true : false; } catch (e) { o.sheet = 'שגיאה'; }
  o.last_error = props_().getProperty('LAST_ERROR') || 'אין';
  return o;
}

/**
 * אותה תשובה בדיוק, רק מכתובת אחרת.
 * הדף שיושב על shoshizelikovith.com פונה לכאן ישירות, ולא דרך iframe של גוגל.
 * כך גוגל לא מפנה את התלמידה לנתיב של חשבון מסוים והדף לא נשבר לה.
 */
function doPost(e) {
  var out;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    out = ask(req);
  } catch (err) {
    out = {a: 'משהו נתקע רגע. נסי שוב.', lesson: null};
    try {
      props_().setProperty('LAST_ERROR', Utilities.formatDate(
          new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd HH:mm') + ' | doPost | ' +
          String(err && err.message ? err.message : err).slice(0, 300));
    } catch (e2) { /* לא מפיל תשובה */ }
  }
  return ContentService.createTextOutput(JSON.stringify(out))
      .setMimeType(ContentService.MimeType.JSON);
}

// ---------- ההגדרות החיות, מגיטהאב ----------
/**
 * ההוראות, הסגנון והדף נמשכים מקובץ הגדרות בגיטהאב ולא צרובים כאן.
 * כך כל שינוי תוכן הוא דחיפה אחת לגיטהאב, בלי לגעת בקוד ובלי אישורים.
 * אם גיטהאב לא זמין - נופלים בחזרה למה שצרוב, ושום דבר לא נשבר.
 */
var CONFIG_URL = 'https://raw.githubusercontent.com/shoshizelikovith/' +
                 'shoshizelikovith.github.io/main/cfg-736cd465d7b8d3f4/config.json';
var CFG_ = null;

function config_() {
  if (CFG_) return CFG_;
  var c = CacheService.getScriptCache();
  try {
    var n = Number(c.get('cfg_n') || 0), out = '';
    for (var i = 0; i < n; i++) out += (c.get('cfg_' + i) || '');
    if (out) { CFG_ = JSON.parse(out); return CFG_; }
  } catch (e) { /* נמשוך מחדש */ }
  CFG_ = fetchConfig_();
  return CFG_;
}

/** מושך מגיטהאב ושומר בזיכרון לחצי שעה. */
function fetchConfig_() {
  try {
    var res = UrlFetchApp.fetch(CONFIG_URL + '?t=' + new Date().getTime(),
                                {muteHttpExceptions: true});
    if (res.getResponseCode() !== 200) return {};
    var txt = res.getContentText();
    var obj = JSON.parse(txt);          // נזרק אם לא תקין, ואז נשארים עם הצרוב
    // המטמון של גוגל מוגבל ל-100KB לכל מפתח, ועברית היא שני בתים לתו.
    // 30,000 תווים הם כ-43KB, מרחק בטוח מהתקרה.
    try {
      var c = CacheService.getScriptCache(), parts = [], i;
      for (i = 0; i < txt.length; i += 30000) parts.push(txt.slice(i, i + 30000));
      var map = {cfg_n: String(parts.length)};
      for (i = 0; i < parts.length; i++) map['cfg_' + i] = parts[i];
      c.putAll(map, 1800);
    } catch (eCache) {
      // המטמון נכשל, ההגדרות עדיין טובות. פשוט נמשוך שוב בפעם הבאה.
    }
    return obj;
  } catch (e) {
    return {};
  }
}

/** החבילות: מגיטהאב אם יש, ואחרת מה שצרוב ב-texts. */
function pkgs_() {
  var cfg = config_();
  if (cfg && cfg.packages && cfg.packages.magnetit) return cfg.packages;
  return PACKAGES_();
}

/** ההנחיות הקבועות: מגיטהאב אם יש, ואחרת מה שצרוב בקוד. */
function stableText_() {
  var cfg = config_();
  if (cfg && cfg.system && String(cfg.system).length > 2000) return cfg.system;
  return INSTRUCTIONS_() +
         '\n\n=== איך שושי מדברת. זו השפה שלך ===\n' + STYLE_() +
         '\n\nוכתבי עברית זורמת וטבעית, כמו שמדברים. לא תרגומית, ' +
         'לא מליצית, ולא משפטים שמורכבים נכון אבל נשמעים זרים. ' +
         'אם משפט לא נשמע כמו משהו ששושי הייתה אומרת בקול - נסחי מחדש.\n' +
         RULES_();
}

// ---------- אחסון ----------

function props_() { return PropertiesService.getScriptProperties(); }

/** פותח את גיליון הנתונים, ויוצר אותו בפעם הראשונה. */
var BOOK_ = null, TABS_ = {};
function book_() {
  if (BOOK_) return BOOK_;                 // פתיחה אחת לכל תשובה, לא שבע
  var p = props_(), id = p.getProperty('SHEET_ID'), ss;
  if (id) {
    try { BOOK_ = SpreadsheetApp.openById(id); return BOOK_; } catch (e) { /* נוצר מחדש */ }
  }
  ss = SpreadsheetApp.create('בוט אשה ללא מאמץ - נתונים');
  BOOK_ = ss;
  p.setProperty('SHEET_ID', ss.getId());
  var s = ss.getSheets()[0];
  s.setName('תלמידות');
  s.appendRow(['מייל', 'שם', 'קורס', 'שבוע', 'נוצל', 'הודעות', 'התחילה',
               'מה ידוע עליה', 'נתונים']);
  ss.insertSheet('שיחות').appendRow(
      ['זמן', 'תלמידה', 'מייל', 'קורס', 'שבוע', 'שאלה', 'תשובה']);
  ss.insertSheet('התראות').appendRow(
      ['זמן', 'תלמידה', 'מייל', 'המנוי שלה', 'תקציב', 'נוצל', 'כמה התכתבה',
       'התחילה', 'ימים שנשארו', 'מה הבוט יודע עליה']);
  return ss;
}

function tab_(name) {
  if (TABS_[name]) return TABS_[name];
  var ss = book_(), s = ss.getSheetByName(name) || ss.insertSheet(name);
  TABS_[name] = s;
  return s;
}

/** שורה בגיליון -> רשומת תלמידה. */
function parseRow_(v) {
  var rec = {};
  try { rec = JSON.parse(v[8] || '{}'); } catch (e) { rec = {}; }
  rec.name = v[1] || rec.name || '';
  rec.lesson = v[3] === '' ? rec.lesson : Number(v[3]);
  rec.spent = Number(v[4]) || 0;
  rec.msgs = Number(v[5]) || 0;
  rec.started = v[6] ? String(v[6]) : rec.started;
  rec.profile = v[7] || '';
  return rec;
}

/** שולף את הרשומה של תלמידה אחת לפי מייל. מחזיר גם את מספר השורה. */
function getRec_(mail) {
  // סריקת כל הגיליון בכל הודעה היא בזבוז. שומרים את מספר השורה בזיכרון.
  var c = CacheService.getScriptCache(), key = 'row:' + mail;
  var row = Number(c.get(key) || 0);
  if (row) {
    try {
      var sh = tab_('תלמידות');
      var vv = sh.getRange(row, 1, 1, 9).getValues()[0];
      if (String(vv[0]).trim().toLowerCase() === mail) return {rec: parseRow_(vv), row: row};
    } catch (e) { /* נופלים חזרה לסריקה */ }
  }
  var s = tab_('תלמידות'), last = s.getLastRow();
  if (last < 2) return {rec: {}, row: 0};
  var mails = s.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < mails.length; i++) {
    if (String(mails[i][0]).trim().toLowerCase() === mail) {
      var v = s.getRange(i + 2, 1, 1, 9).getValues()[0];
      try { c.put(key, String(i + 2), 1800); } catch (e) { /* בלי מטמון */ }
      return {rec: parseRow_(v), row: i + 2};
    }
  }
  return {rec: {}, row: 0};
}

function putRec_(mail, rec, row) {
  var s = tab_('תלמידות');
  var extra = {};
  for (var k in rec) {
    if (['name', 'lesson', 'spent', 'msgs', 'started', 'profile'].indexOf(k) < 0) {
      extra[k] = rec[k];
    }
  }
  var line = [mail, rec.name || '', rec.label || '',
              rec.lesson === undefined || rec.lesson === null ? '' : rec.lesson,
              Number(rec.spent || 0), Number(rec.msgs || 0), rec.started || '',
              rec.profile || '', JSON.stringify(extra)];
  if (row) {
    s.getRange(row, 1, 1, 9).setValues([line]);
  } else {
    s.appendRow(line);
  }
  return row || s.getLastRow();
}

// ---------- תקציב ----------

function budgetState_(rec) {
  var pkgs = pkgs_();
  var pk = pkgs[rec.package || rec.course || ''] || {};
  var cap = pk['תקציב'] || 0;
  var used = Number(rec.spent || 0);
  var daysLeft = null;
  if (rec.started && pk['חודשים']) {
    var st = new Date(rec.started + 'T00:00:00');
    if (!isNaN(st.getTime())) {
      var end = new Date(st.getTime() + pk['חודשים'] * 30.5 * 86400000);
      daysLeft = Math.ceil((end - new Date()) / 86400000);
    }
  }
  var overMoney = cap && used >= cap;
  var overTime = daysLeft !== null && daysLeft <= 0;
  var pct = cap ? (used / cap * 100) : 0;
  return {cap: cap, used: used, pct: pct, daysLeft: daysLeft,
          ended: !!(overMoney || overTime),
          why: overTime ? 'זמן' : (overMoney ? 'תקציב' : null),
          tight: pct >= 90};
}

// ---------- שליפת חומר ----------

var STOP_ = ('של על את זה היא הוא אני לא כן מה איך למה אם כי גם רק עם אבל או יש אין ' +
             'הזה הזו שלי שלך שלה אותי אותה אותו להיות יותר כל כך ככה עוד אז מאוד').split(' ');

function words_(s) {
  var out = [], m = String(s || '').match(/[֐-׿]{2,}/g) || [];
  for (var i = 0; i < m.length; i++) {
    if (STOP_.indexOf(m[i]) < 0) out.push(m[i]);
  }
  return out;
}

/** מביא את הטקסט של קטעי ידע לפי המספרים שלהם, בלי לטעון את כל הידע. */
function texts_(ids) {
  var byPart = {}, i;
  for (i = 0; i < ids.length; i++) {
    var p = Math.floor(ids[i] / PER_PART);
    (byPart[p] = byPart[p] || []).push(ids[i]);
  }
  var loaders = [null, KB1_, KB2_, KB3_, KB4_, KB5_, KB6_, KB7_];
  var out = {};
  for (var p in byPart) {
    var arr = loaders[Number(p) + 1]();
    var list = byPart[p];
    for (i = 0; i < list.length; i++) {
      out[list[i]] = arr[list[i] - Number(p) * PER_PART];
    }
  }
  return out;
}

/**
 * מדרג את קטעי הידע מול השאלה, בדיוק לפי אותה נוסחה של השרת המקורי:
 * חפיפת מילים, פלוס העדפה לשיעור שהתלמידה נמצאת בו.
 */
function retrieve_(question, lesson, k, course) {
  var meta = META_();
  var qs = words_(question), seen = {}, score = {}, i, j;
  for (i = 0; i < qs.length; i++) {
    if (seen[qs[i]]) continue;
    seen[qs[i]] = 1;
    var post = postings_(qs[i]);
    if (!post) continue;
    for (j = 0; j < post.length; j++) {
      score[post[j]] = (score[post[j]] || 0) + 1;
    }
  }
  var ids = [];
  for (var id in score) {
    var n = Number(id), ls = meta[n][1];
    if (String(meta[n][0]).indexOf('שפת שושי') >= 0) continue;   // כבר בהוראות
    if (course === 'magnetit' && ls !== -1) continue;
    var sc = score[id];
    if (lesson) {
      if (ls === lesson) sc += 6;
      else if (ls === 0) sc += 2;
      else if (Math.abs(ls - lesson) <= 1) sc += 2;
    }
    ids.push([sc, n]);
  }
  ids.sort(function (a, b) { return b[0] - a[0]; });
  ids = ids.slice(0, k);
  var want = [];
  for (i = 0; i < ids.length; i++) want.push(ids[i][1]);
  var txt = texts_(want), out = [];
  for (i = 0; i < want.length; i++) {
    if (txt[want[i]]) out.push(txt[want[i]]);
  }
  return out;
}

// ---------- כמה כבד המענה ----------

var ADMIN_ = ['באיזה שבוע אני', 'איזה שבוע אני', 'תודה', 'היי', 'שלום', 'אוקיי',
              'או קיי', 'בסדר', 'הבנתי', 'ביי', 'להתראות', 'מה שלומך', 'קוד',
              'מייל', 'בוקר טוב', 'ערב טוב', 'לילה טוב', 'סבבה', 'מעולה', 'יופי'];

var HEAVY_ = ['מרגיש', 'כואב', 'קשה', 'בוכ', 'פוחד', 'פחד', 'חרד', 'כעס', 'עצוב',
              'בודד', 'חוסר', 'תקוע', 'מתאמצ', 'נעלב', 'פגוע', 'אשמ', 'מבולבל',
              'לא יודעת', 'נמאס', 'בעל', 'הוא ', 'איתו', 'בינינו', 'זוגי', 'ריב',
              'שתק', 'מתעלם', 'צועק', 'רוצה', 'צריכה', 'למה', 'איך', 'מה לעשות',
              'עזרי', 'עזור'];

function has_(q, list) {
  for (var i = 0; i < list.length; i++) if (q.indexOf(list[i]) >= 0) return true;
  return false;
}

function weigh_(question, history) {
  var q = String(question || '').trim(), n = q.length;
  if (has_(q, HEAVY_)) return (n > 200 || history.length >= 4) ? 'deep' : 'normal';
  if (n < 35 && has_(q, ADMIN_)) return 'light';
  if (n < 25) return 'light';
  if (n > 200 || history.length >= 4) return 'deep';
  return 'normal';
}

// ---------- המודל ----------

/**
 * המפתח יושב ב-Script Properties. בהתקנה הראשונה הוא מגיע מקובץ secret.js
 * ומועתר לשם פעם אחת, ואז הקובץ מתרוקן.
 */
function apiKey_() {
  var k = props_().getProperty('ANTHROPIC_API_KEY');
  if (k) return k;
  try {
    k = SECRET_KEY_();
    if (k) { props_().setProperty('ANTHROPIC_API_KEY', k); return k; }
  } catch (e) { /* אין קובץ סוד */ }
  return '';
}

function askModel_(system, messages, mode) {
  var key = apiKey_();
  if (!key) return '[חסר מפתח] המפתח לא הוגדר.';
  // ההוראות הקבועות זהות בכל פנייה. מסמנים אותן לשמירה אצל אנתרופיק,
  // וכך הן לא מעובדות מחדש בכל תשובה - חוסך זמן וגם כסף.
  var sys;
  if (typeof system === 'string') {
    sys = system;
  } else {
    sys = [{type: 'text', text: system.stable,
            cache_control: {type: 'ephemeral'}},
           {type: 'text', text: system.dyn}];
  }
  var body = {
    model: 'claude-sonnet-5',
    max_tokens: mode === 'light' ? 900 : 1400,
    system: sys,
    messages: messages
  };
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {'x-api-key': key, 'anthropic-version': '2023-06-01'},
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    return '[שגיאה מהמודל] ' + res.getContentText().slice(0, 400);
  }
  var r = JSON.parse(res.getContentText()), out = '';
  for (var i = 0; i < (r.content || []).length; i++) {
    out += r.content[i].text || '';
  }
  return out;
}

// ---------- יומן והתראות ----------

function logTurn_(mail, rec, question, answer) {
  try {
    tab_('שיחות').appendRow([
      Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd HH:mm'),
      rec.name || mail, mail, rec.label || '',
      rec.lesson === undefined ? '' : rec.lesson, question, answer]);
  } catch (e) { /* יומן לא מפיל תשובה */ }
}

function alertShoshi_(mail, rec, bs) {
  if (rec.alerted) return;
  rec.alerted = true;
  var pk = pkgs_()[rec.package || rec.course || ''] || {};
  var when = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd HH:mm');
  var row = [when, rec.name || '', mail, pk.label || rec.label || '',
             bs.cap, Math.round(bs.used * 10) / 10, rec.msgs || 0,
             rec.started || '', bs.daysLeft, (rec.profile || '').trim()];
  try { tab_('התראות').appendRow(row); } catch (e) { /* ממשיכים למייל */ }
  try {
    var to = props_().getProperty('MAIL_TO') || Session.getEffectiveUser().getEmail();
    var body = 'תלמידה הגיעה לתקרת התקציב ועצרתי אותה.\n\n' +
      'תלמידה: ' + (rec.name || '') + '\n' +
      'מייל: ' + mail + '\n' +
      'המנוי שלה: ' + (pk.label || rec.label || '') + '\n' +
      'תקציב: ' + bs.cap + '\n' +
      'נוצל: ' + (Math.round(bs.used * 10) / 10) + '\n' +
      'כמה התכתבה: ' + (rec.msgs || 0) + '\n' +
      'התחילה: ' + (rec.started || '') + '\n' +
      'ימים שנשארו: ' + bs.daysLeft + '\n';
    if ((rec.profile || '').trim()) {
      body += '\nמה שידוע עליה משיחות קודמות:\n' + rec.profile.trim();
    }
    body += '\n\nכדי לפתוח לה תקופה נוספת - לפתוח את גיליון הנתונים, ' +
            'למצוא אותה בלשונית "תלמידות", ולאפס את העמודה "נוצל" ל-0.';
    MailApp.sendEmail(to, 'הבוט עצר תלמידה - ' + (rec.name || mail), body);
  } catch (e) { /* בלי מייל, ההתראה עדיין בגיליון */ }
}

// ---------- פרופיל התלמידה ----------

var PROFILE_PROMPT_ =
  'לפנייך קטע משיחה בין מאמנת לתלמידה, ולפנייך מה שכבר ידוע על התלמידה.\n' +
  'כתבי מחדש את מה שידוע עליה, עד 8 שורות קצרות, בגוף שלישי.\n' +
  'לכללי מה שחוזר על עצמו ומה שיעזור ללוות אותה בפעם הבאה: המצב הזוגי שלה, ' +
  'מה מעסיק אותה, מה כבר ניסתה, מה נשאר פתוח, ואיפה היא בקורס.\n' +
  'אל תמציאי. אם משהו לא נאמר, אל תכתבי אותו. בלי כותרות ובלי הקדמה, ' +
  'רק השורות עצמן. מקף קצר בלבד.';

function updateProfile_(rec, history, question, answer) {
  rec.turns = (rec.turns || 0) + 1;
  if (rec.turns % 3 !== 0) return;
  var recent = history.slice(-4).concat(
      [{role: 'user', content: question}, {role: 'assistant', content: answer}]);
  var convo = recent.map(function (m) {
    return (m.role === 'user' ? 'התלמידה: ' : 'המאמנת: ') +
           String(m.content).slice(0, 700);
  }).join('\n');
  var prev = (rec.profile || '').trim() || '(עדיין לא ידוע כלום)';
  try {
    var out = askModel_(PROFILE_PROMPT_, [{role: 'user',
        content: 'מה שידוע עד כה:\n' + prev + '\n\n=== קטע השיחה ===\n' + convo}],
        'light');
    if (out && out.charAt(0) !== '[') rec.profile = out.trim().slice(0, 1500);
  } catch (e) { /* פרופיל לא מפיל תשובה */ }
}

// ---------- הוראות גוברות ----------

function overrideProgress_(done, total) {
  return '!!! הוראה גוברת לתשובה הזו בלבד !!!\n\n' +
'באתר הקורס רשום שהיא סימנה **' + done + ' מתוך ' + total + ' שיעורים**.\n\n' +
'זו השיחה הראשונה איתה. **חובה עליך להגיד לה את המספר הזה ולשאול אותה בכנות ' +
'אם היא באמת שם** - כי סימון זה לא למידה. אפשר לפתוח שיעור, לשמוע ברקע, ' +
'ולא באמת להיות שם ולא לתרגל.\n\n' +
'נסחי בשפה שלך, בערך: "אני רואה שסימנת ' + done + ' שיעורים - את באמת שם, ' +
'או שעברת עליהם ועדיין לא התעמקת ותרגלת?"\n\n' +
'**חשוב איך את מנמקת את השאלה.** אל תאמרי לה שסימון זה לא למידה, ואל ' +
'תסבירי שזה כדי שהתהליך יעמוד על משהו אמיתי - זה נשמע כמו בדיקה.\n' +
'הנימוק הנכון הוא פשוט ומשרת אותה: **אני שואלת כי אני רוצה לדעת איפה את ' +
'נמצאת באמת במסע הלימוד שלך, כדי שאוכל לענות לך בהתאמה אישית לשלב שלך.**\n' +
'בלי שיפוט, בלי האשמה, ובלי להתנצל על השאלה.\n\n' +
'אם היא אומרת שעברה בלי להתעמק: זה מצוין שאמרה. הציעי לה לחזור לשיעור אחד ' +
'מרכזי ולתרגל אותו באמת לפני שממשיכים.\n' +
'אם היא אומרת שהיא באמת שם: יופי, המשיכו הלאה.\n\n' +
'אפשר גם לענות לתוכן שהיא הביאה, אבל השאלה הזו חייבת להופיע בתשובה.\n' +
'!!! סוף ההוראה הגוברת !!!\n\n';
}

var OVERRIDE_MAG_ =
'!!! הוראה גוברת לתשובה הזו בלבד !!!\n\n' +
'התלמידה בדיוק נכנסה ליודעת, ושאלת אותה אם עברה את כל התהליך בממגנטת.\n' +
'היא עונה עכשיו. **זה חריג מפורש לכלל המיקרו-צעדים - כאן את מסבירה לפני ששואלת.**\n\n' +
'אם היא אומרת שדילגה, לא הספיקה, או עשתה חלקית - **חובה עליך להסביר לה למה\n' +
'זה משנה, בשני-שלושה משפטים, לפני כל שאלה.** אסור לך לומר לה שזה לא נורא,\n' +
'שלא חסר לה כלום, או שהתכנים ייפגשו איתה ממילא. זה בדיוק מה שיגרום לה להמשיך\n' +
'הלאה ולשלם על זה אחר כך.\n\n' +
'מה שחייב להיאמר, בשפה שלך ובחום, בלי דרמה ובלי שיפוט:\n' +
'- ממגנטת היא לא ידע שאפשר להשלים בקריאה. היא תרגול שמשנה משהו בפנים -\n' +
'  באופן שבו היא מגיבה, נושמת, ורואה את עצמה מול בן הזוג.\n' +
'- השינוי הזה נרכש בגוף ובחוויה, לא בהבנה.\n' +
'- **יודעת בנויה על גבי השינוי הזה** ומניחה שהוא כבר קרה. מי שדילגה תבין\n' +
'  את יודעת בשכל אבל לא תחיה אותה, ותתאמץ פי כמה על דברים שהיו אמורים\n' +
'  לבוא לה בטבעיות.\n' +
'- לכן לחזור עכשיו לחלק שנשאר **חוסך לה זמן וכאב** - זה לא צעד אחורה,\n' +
'  זה מה שיגרום לכל השאר לעבוד.\n\n' +
'רק אחרי ההסבר - שאלה אחת, והצעה קונקרטית לחזור לחלק הספציפי.\n\n' +
'אם היא אומרת שעשתה הכל - יופי. שאלי שאלה אחת שמאמתת בעדינות, למשל מה הכי\n' +
'נשאר איתה משם, ואל תסבירי את מה שלמעלה.\n\n' +
'אחרי התשובה הזו אל תחזרי לנושא שוב.\n' +
'!!! סוף ההוראה הגוברת !!!\n\n';


/** שלושת התורים האחרונים של התלמידה, מתוך לשונית "שיחות". */
function recentTurns_(mail, n) {
  try {
    var s = tab_('שיחות'), last = s.getLastRow();
    if (last < 2) return [];
    var from = Math.max(2, last - 200);
    var v = s.getRange(from, 3, last - from + 1, 5).getValues();
    var out = [];
    for (var i = v.length - 1; i >= 0 && out.length < n * 2; i--) {
      if (String(v[i][0]).trim().toLowerCase() !== mail) continue;
      var ans = String(v[i][4]);
      // תשובות שבהן הבוט טען שאין לו זיכרון מרעילות את ההיסטוריה,
      // כי הוא קורא אותן ומשכפל אותן. הן לא חוזרות פנימה.
      if (/לא זוכרת|אין לי זיכרון|מתחילות מחדש|מתחילה מחדש|לא רואה שיחות/.test(ans)) continue;
      out.unshift({role: 'assistant', content: ans.slice(0, 1200)});
      out.unshift({role: 'user', content: String(v[i][3]).slice(0, 1200)});
    }
    return out;
  } catch (e) {
    return [];
  }
}

/** כל ההנחיות הקבועות. מיוצר גם לקובץ ההגדרות שבגיטהאב. */
function RULES_() {
  return '\n\n=== יעילות, לא קיצור ===\n' +
      'תני לתשובה את האורך שהיא צריכה. מה שמיותר הוא לא האורך אלא המילוי: ' +
      'בלי הקדמות, בלי לחזור על מה שהיא כתבה במילים אחרות, בלי לסכם לה את ' +
      'עצמה, ובלי משפטי חימום. כל שורה צריכה להוסיף לה משהו.\n' +
      '\n\n=== מהלך השיחה ===\n' +
      'זה לא מענה לשאלה, זה תהליך. הוא נע בשלושה מהלכים, ולא חייבים את ' +
      'כולם בכל תשובה - אבל זו הדרך.\n\n' +
      '**1. קודם בהירות, בעדינות.** לעזור לה לראות מה עובר עליה. בעדינות ' +
      'ובכבוד גדול, ובלי להפיל עליה הכל בבת אחת. מעט בכל פעם, לפי מה שהיא ' +
      'מסוגלת לקבל עכשיו.\n\n' +
      '**2. ואז שאלות, הרבה שאלות. זה עיקר העבודה.** שאלות שמאפשרות לה ' +
      'לפרוק ולשים את החוויה על השולחן, שאלות שמרגיעות, ושאלות שפותחות לה ' +
      'מבט אחר ורחב יותר - עליו, על הקשר, ועל עצמה. ממשיכות לשאול עד שמשהו ' +
      'בה נרגע. לא ממהרות לפתרון.\n' +
      '**שאלה אחת בכל תשובה. אחת, לא שתיים.** הרבה שאלות זה לאורך השיחה, ' +
      'לא בתוך הודעה אחת. אם עולות לך שלוש שאלות טובות - תשאלי את זו שהיא ' +
      'יכולה לענות עליה עכשיו, ותשמרי את השאר לתשובות הבאות. הן לא ילכו לשום מקום.\n\n' +
      '**ואל תצרפי לשאלה פסקת פרשנות.** לא להסביר לה מה באמת קורה לה, לא ' +
      'לפרש מה הכאב שלה אומר, ולא להניח על השולחן תובנה גדולה ואז לשאול. ' +
      'משפט אחד קצר שמראה לה שאת איתה, ואז השאלה. זהו.\n' +
      'ככל שהיא יותר כבדה, כך תני לה פחות בבת אחת. כשהיא אומרת שכבד ועמוס - ' +
      'זה בדיוק הרגע לתת מעט, לא להוסיף עוד שכבה.\n\n' +
      '**ובלי תאוריה.** אל תסבירי לה למה זה קורה, מה המנגנון, ואיך זה עובד ' +
      'בדרך כלל. גם לא ״זה בדיוק מה שאת לומדת בשבוע הזה״. הסבר כזה הוא שיעור, ' +
      'והיא כבר קיבלה שיעור. היא באה לדבר.\n' +
      'לכן התשובה הרגילה שלך קצרה: **משפט או שניים של הזדהות, ואז שאלה אחת.** ' +
      'זה הכל, וזה מספיק. לא שלוש פסקאות ולא ארבע.\n' +
      'התשובה מתארכת רק כשאת באמת מאמנת אותה בתרגיל בזמן אמת, או כשהיא ביקשה ' +
      'ממך במפורש להסביר לה משהו. אז מותר, ואז זה במקום. בכל מקרה אחר - ' +
      'מעט הזדהות, ושאלה.\n\n' +
      '**והחלק האמוני הוא מהותי כאן, לא קישוט בסוף:** החיבור לנשמה שלה, ' +
      'למשמעות של הנישואין, ולהשם. זה חלק מהמבט הרחב שאת פותחת לה.\n\n' +
      '**3. ואז להזכיר לה את מה שהיא כבר למדה.** אם היא למדה על הדינמיקה ' +
      'של חלוקת האחריות בזוגיות, או על איך לבטא רצון, ציפייה או כאב - ' +
      'להזכיר לה את זה בשמו, ולוודא שהיא זוכרת. היא לא צריכה רק מקום לכאב. ' +
      'היא צריכה גם את הידע שמאפשר לה להבין מה לעשות ואיך דברים עובדים. ' +
      'זה בולט במיוחד ביודעת.\n\n' +
      'ושני אלה הולכים תמיד יחד: גם לתת מקום לכאב ולשנות דרכו את המבט, ' +
      'וגם להחזיר לה לידיים את הכלים שכבר יש לה.\n\n' +
      '**וזה פאזל, לא מפתח אחד.** כמעט אף פעם אין חלק אחד שפותר. מרכיבות ' +
      'כמה חלקים יחד - מה שהיא מרגישה, מה שהיא למדה, המבט האמוני, והצעד ' +
      'המעשי - לפי מה שמתאים לה עכשיו.\n\n' +
      '**והכל לפי השלב שבו היא נמצאת.** מה שמתאים למי שבתחילת הדרך לא ' +
      'מתאים למי שכבר עברה את רוב הקורס. אל תביאי לה חלק שעוד לא למדה.\n\n' +
      'והשאלות הן כלי להרגעה, לא לבדיקה. שאלה טובה עוזרת לה להרפות, מורידה ' +
      'מתח, מבהירה לה מה באמת קורה, ומובילה אותה למצוא את התשובה בתוך עצמה ' +
      'לפי מה שכבר למדה. את לא חוקרת אותה ולא בוחנת אותה.\n\n' +
      'מה שלא עושים: לא לדקלם את השיעור האחרון, לא לפרוס רשימת כלים, לא ' +
      'להעמיס יותר משאלה אחת, ולא לנתח לה את עצמה לפני שהיא ביקשה.\n\n' +
      'מה שהיא צריכה להרגיש כשהיא סוגרת את החלון: שהיא לא לבד, שהיא מבינה ' +
      'מה קורה לה, ושיש לה מה לעשות עם זה.\n' +
      '\n\n=== אימון בזמן אמת, לא הדרכה ===\n' +
      'כשמתגלה שורש - פחד, תבנית, חלק צעיר שקופץ, תחושה שחוזרת - **אל תתני ' +
      'לה נוהל לביצוע עצמי בפעם הבאה.** ״בפעם הבאה שזה עולה, תנשמי ותגידי ' +
      'לעצמך״ זה דף הוראות, לא ליווי. היא קיבלה דפים כאלה בקורס. היא באה ' +
      'אלייך בשביל משהו אחר.\n\n' +
      'במקום זה, שלושה צעדים:\n' +
      '1. **להסביר קצר מה יכול לעזור לה כאן**, ולמה דווקא זה. משפט או שניים.\n' +
      '2. **להציע לעשות את זה ביחד, עכשיו.** ממש לשאול: ״רוצה שנעשה את זה ' +
      'ביחד עכשיו?״ ואם היא לא פנויה - ״נחזור לזה כשתהיי פנויה, תגידי לי מתי״. ' +
      'הבחירה שלה, ומכבדים אותה.\n' +
      '3. **ואם היא אמרה כן - עושות את זה באמת.** לא לשפוך את כל התרגיל ' +
      'בהודעה אחת. **הנחיה אחת קטנה, ואז עוצרות ושואלות מה קורה.** היא עונה, ' +
      'את מקשיבה ומשקפת, ורק אז ההנחיה הבאה. ככה זה נמשך כמה הודעות, וזה בסדר ' +
      'גמור. זה הליווי עצמו.\n\n' +
      '**והמרחב הרגיש נשאר פתוח.** כשעולה חלק צעיר - ילדה קטנה, פחד ישן, ' +
      'תבנית מהבית - נשארות שם. שואלות עליה, מקשיבות לה, נותנות לה מקום לכמה ' +
      'הודעות. לא עוברות הלאה אחרי משפט אחד.\n' +
      '**וחלק כזה הוא היא, לא הוא.** אם זו ילדה קטנה - ״היא״, ״אותה״, ' +
      '״להגיד לה״. לא לערבב זכר ונקבה באותו משפט.\n\n' +
      '**הידע של הקורס הוא החומר של התרגול, לא ההרצאה.** לא לחזור על השיעור ' +
      'ולא לסכם אותו. לקחת ממנו את התרגיל ולהריץ אותו איתה, חיה, כאן.\n' +
      '\n\n=== עקרונות ליבה שאסור לסטות מהם ===\n' +
      'אם החומר המצורף לא עונה על השאלה, **אל תמציאי ואל תשלימי מהידע הכללי ' +
      'שלך.** עדיף לומר שזה לא משהו שנלמד ככה בקורס, ולשאול אותה שאלה שמחזירה ' +
      'אתכן למה שכן נלמד.\n\n' +
      'ובמיוחד בנושא **חוויית החוסר**, שהוא יסוד בקורס ונוטים לעוות אותו:\n' +
      'מה שנלמד בפועל - המיומנות הראשונה היא **לזהות** שהיא בתוך חוויית חוסר, ' +
      'ו**לעצור** לפני שהיא פועלת מתוך הדחיפות הזו. אחר כך **לא להילחם בחוסר ' +
      'ולא לברוח ממנו** אלא להרפות אליו ולהתמסר למה שיש ברגע הזה, בלי לרוץ ' +
      'למלא אותו. התרגול הוא **נשימה אל תוך החוסר**, וכשעולה התנגדות - נשימה ' +
      'אל תוך ההתנגדות, ואמירה לעצמה שהיא מסוגלת ושזה לא מסוכן. אפשר גם לדמיין ' +
      'את החוסר כישות, לאפשר לו להיות נוכח ולדבר איתו. מתוך ההתמסרות הזו נולד ' +
      'העונג העמוק, החוסן והשלמות.\n' +
      '**ומה שלא נלמד, ואסור לך לומר:** לא לומר לה לתת לעצמה את מה שחסר, לא ' +
      'לומר לה להישען על עצמה, ולא לומר לה שהביטחון שלה צריך לבוא ממנה ולא ' +
      'ממנו. זו לא התורה הזו. וגם לא לומר לה לכבות או להקטין את הרצון - ' +
      'הרצונות נשארים, רק מפסיקים להילחם.\n' +
      'וגם לא בניסוח מרוכך. ״שהשווי שלך יישען גם על עוד משהו״, ״שתהיי פחות ' +
      'תלויה בו״, ״שתמצאי את זה בתוכך״ - כל אלה הם אותו דבר בדיוק, רק בעדינות. ' +
      'זה שהיא מושפעת ממנו הוא לא הבעיה שצריך לפתור. מה שמשתנה הוא היחס שלה ' +
      'לרגע שבו עולה החוסר, לא מאיפה היא ״אמורה״ לקחת כוח.\n' +
      '\n**וכשאת מזכירה לה משהו שהיא למדה - דייקי מאיפה.** אם זה מיודעת, ' +
      'אפשר לומר ״בקורס הזה״. אם זה מממגנטת או מהשלב הקודם, אומרים את זה ' +
      'במפורש: ״מממגנטת״, ״מהשלב הקודם״. היא זוכרת איפה למדה כל דבר, ' +
      'וייחוס לא נכון שובר לה את האמון בך.\n' +
      '\n\n=== הזיכרון שלך ===\n' +
      'יש לך זיכרון. את זוכרת את התלמידה ואת מה שדיברתן עליו בפעמים קודמות, ' +
      'וזה מצורף לך למטה כשיש מה לזכור.\n' +
      '**לעולם אל תגידי לה שאת לא זוכרת, שאין לך זיכרון, או שכל שיחה מתחילה ' +
      'מחדש. זה לא נכון.** אם באמת אין לך מידע קודם עליה, פשוט שאלי אותה מה ' +
      'מביא אותה היום, בלי להתנצל ובלי להסביר על עצמך.\n' +
      '\n\n=== לשון הפנייה ===\n' +
      'התלמידה היא אשה אחת, ואת פונה אליה בנקבה יחידה.\n' +
      'הצורות הנכונות: את. שלך. אותך. לך. איתך.\n' +
      'פעלים: את מרגישה, את יודעת, את רוצה, את נמצאת, את מתארת.\n' +
      'ציווי: ספרי, כתבי, נסי, בדקי, שימי לב, תגידי לי, בואי (ולא בוא), ' +
      'תעצמי, חזרי, המשיכי.\n' +
      'חלק מקטעי החומר למטה כתובים בלשון זכר או ברבים. זו לשון הכתיבה של ' +
      'המקור, לא לשון הפנייה אליה. כשאת מצטטת או מסכמת, נסחי מחדש בנקבה יחידה.\n' +
      'וכשאת מתקנת לנקבה - כתבי את המילה התקינה המלאה. המילה היא "את", ' +
      'ולא גרסה מקוצרת או משובשת שלה.\n' +
      '\n=== איך התשובה נראית ===\n' +
      'טקסט רץ בלבד, בלי כוכביות, בלי סימני עיצוב ובלי כותרות. ' +
      'הדגשה נעשית במילים עצמן, לא בסימנים. בלי מקף ארוך - רק מקף קצר.\n';
}

// ---------- התשובה ----------

/** נקראת מהדף דרך google.script.run */
function ask(req) {
  req = req || {};
  var who = String(req.who || '').trim().slice(0, 40);
  var mail = String(req.mail || '').trim().toLowerCase().slice(0, 120);
  var question = String(req.q || '').trim();
  var history = req.history || [];

  if (!mail) {
    return {a: 'כדי שאוכל לזכור אותך ולא להתבלבל בין תלמידות, ' +
               'כתבי בבקשה את המייל שלך בשדה למעלה.', lesson: null};
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (e) { /* ממשיכים בלי נעילה */ }

  try {
    var got = getRec_(mail), rec = got.rec, row = got.row;
    var lesson = rec.lesson || null;

    rec['private'] = !!req['private'];   // לפי הבחירה הנוכחית, לא נדבק מפעם קודמת

    // זיהוי: קודם הרשימה מסקולר, ואז מי שהצטרפה אחר כך דרך רב מסר
    if (!rec.course) {
      var hit = ROSTER_()[mail] || rosterExtra_()[mail];
      // לא מוכרת? אולי היא רכשה לפני דקה. שואלים את רב מסר עכשיו ולא בעוד שעה.
      if (!hit && liveSync_()) hit = rosterExtra_()[mail];
      if (hit) {
        rec.known = true;
        rec.name = who || hit.name || '';
        rec.schooler_done = hit.done || 0;
        rec.schooler_total = hit.total || 0;
        row = putRec_(mail, rec, row);
      }
    }

    // בקשה מפורשת לעבור בין הקורסים. מי שעברה את ממגנטת ונמצאת ביודעת
    // לפעמים רוצה לחזור ולשאול על החומר הישן, וצריך לתת לה.
    if (/(לעבור|תעבר|עברי|להחליף|תחליפ|נחזור)\s*(ל|את ה)?\s*(קורס|ממגנטת|יודעת)/.test(question) ||
        /(קורס|חומר)\s*(אחר|שני|הראשון)/.test(question)) {
      var want = null;
      if (question.indexOf('ממגנטת') >= 0 || question.indexOf('הראשון') >= 0) want = 'magnetit';
      else if (question.indexOf('יודעת') >= 0) want = 'yodaat';
      if (want && want !== rec.course) {
        rec.course = want;
        rec.label = (want === 'magnetit') ? 'ממגנטת' : 'יודעת';
        if (want === 'yodaat') rec.done_magnetit = true;
        rec.lesson = null; lesson = null;
        putRec_(mail, rec, row);
        return {a: 'עברנו ל' + rec.label + '. ספרי לי מה עולה בך, ואם תגידי לי ' +
                   'באיזה שבוע את בתהליך אוכל ללוות אותך מדויק יותר.',
                lesson: null, course: rec.label};
      }
      if (!want) {
        rec.course = ''; rec.known = true;
        putRec_(mail, rec, row);
        return {a: 'בשמחה. לאיזה קורס לעבור?\n\n**ממגנטת** (הקורס הראשון)\n' +
                   '**יודעת** (קורס ההמשך)\n\nכתבי לי את השם.', lesson: null};
      }
    }

    // באיזה קורס ללוות אותה
    if (rec.known && !rec.course) {
      var q = question.replace(/[״"]/g, '');
      if (q.indexOf('יודעת') >= 0 || q.indexOf('להיות אשה') >= 0 || q.indexOf('המשך') >= 0) {
        rec.course = 'yodaat'; rec.label = 'יודעת';
        rec.done_magnetit = true; rec.mag_check = 'open';
        row = putRec_(mail, rec, row);
      } else if (q.indexOf('ממגנטת') >= 0 || q.indexOf('מגנטת') >= 0 || q.indexOf('ראשון') >= 0) {
        rec.course = 'magnetit'; rec.label = 'ממגנטת';
        row = putRec_(mail, rec, row);
      } else {
        return {a: 'נעים מאוד, ' + who + '. מצאתי אותך.\n\n' +
                   'באיזה קורס את רוצה שאלווה אותך עכשיו?\n\n' +
                   '**ממגנטת** (הקורס הראשון)\n' +
                   '**יודעת** (קורס ההמשך, שבעבר נקרא "להיות אשה")\n\n' +
                   'פשוט כתבי לי את השם.', lesson: null};
      }
    }

    if (!rec.course) {
      logUnknown_(mail, who);
      return {a: 'היי. לא מצאתי את המייל הזה ברשימת התלמידות.\n\n' +
                 '**כתבי בבקשה את אותו מייל שאיתו נרשמת לקורס** - זה שאליו ' +
                 'מגיעים המיילים שלו. לפעמים נרשמים עם מייל אחד ומשתמשים באחר.\n\n' +
                 'אם ניסית והמייל הנכון עדיין לא עובד, כתבי לשושי והיא תסדר את זה.',
              lesson: null};
    }

    // באיזה שבוע היא
    var m = question.match(/(?:שבוע|שיעור)\s*(\d{1,2})/);
    if (m && question.indexOf('ממגנטת') < 0 && question.indexOf('מגנטית') < 0) {
      var v = Number(m[1]);
      if (v >= 1 && v <= 16) { lesson = v; rec.lesson = v; row = putRec_(mail, rec, row); }
    }

    // תקציב
    var bs = budgetState_(rec);
    if (bs.ended) {
      var nm = who || rec.name || '';
      var msg;
      if (bs.why === 'זמן') {
        msg = nm + ', הגענו לסוף תקופת הליווי שלך כאן.\n\n' +
          'ליוויתי אותך לאורך הדרך ואני שמחה על כל שיחה שהיתה בינינו. ' +
          'כל מה שעבדנו עליו נשאר איתך - הוא בתוכך, לא כאן.\n\n' +
          '**כתבי לשושי במייל והיא תעדכן אותך בפרטים על חבילות הליווי ' +
          'האפשריות לך להמשך.**\n\n' +
          'בהצלחה, ושיהיה לך קל ומלא אהבה.';
      } else {
        alertShoshi_(mail, rec, bs);
        putRec_(mail, rec, row);
        msg = nm + ', אני צריכה לעצור כאן לרגע.\n\n' +
          'שלחתי לשושי הודעה שתעבור על הליווי שלנו. ' +
          'היא תחזור אלייך בהקדם ותעדכן אותך איך ממשיכים.\n\n' +
          'זה לא קשור לשום דבר שעשית - פשוט הגענו לנקודה שבה היא ' +
          'רוצה להסתכל על זה בעצמה.\n\n' +
          'אני כאן, ונתראה בקרוב.';
      }
      return {a: msg, lesson: lesson, ended: true};
    }

    // כמה כבד, וכמה חומר מצרפים
    var mode = weigh_(question, history);
    if (bs.tight && mode === 'deep') mode = 'normal';
    var k = {light: 3, normal: 7, deep: 10}[mode];
    var t0 = new Date().getTime();
    var ctx = retrieve_(question, lesson, k, rec.course);
    var tRet = new Date().getTime();
    var kb = ctx.map(function (c) { return '[' + c.src + ']\n' + c.t; }).join('\n\n');

    var where;
    if (rec.course === 'magnetit') {
      where = '\n\n=== התלמידה נמצאת בקורס ממגנטת (אשה ללא מאמץ) ===' +
        '\nעני לפי חומרי ממגנטת בלבד. אל תשתמשי במספור השבועות של יודעת.' +
        '\nהחומר הרלוונטי מצורף למטה.';
    } else {
      where = '\n\n=== התלמידה נמצאת בקורס יודעת ===';
      if (rec.done_magnetit) {
        where += '\nהיא כבר עברה את ממגנטת. אם משהו משם רלוונטי, אפשר להזכיר לה ' +
                 'אותו כמשהו שהיא כבר עברה - לא כשיעור חדש.';
      }
    }

    if (lesson) {
      where += '\nהיא נמצאת כרגע ב**שבוע ' + lesson + '** של ' + (rec.label || 'הקורס') +
               '. את יודעת את זה בוודאות. **אל תשאלי אותה שוב באיזה שבוע היא** ' +
               'ואל תגידי שאינך רואה את זה. עני לפי השבוע הזה.\n';
    }

    var override = '';
    if (rec.schooler_total && !rec.progress_checked) {
      override = overrideProgress_(rec.schooler_done || 0, rec.schooler_total);
    }
    if (rec.course === 'yodaat' && rec.mag_check === 'open') {
      override = OVERRIDE_MAG_ + '=== חומרי ממגנטת לעיון ===' + MAG_() + '\n\n';
    }

    // החומר של הקורס כתוב לא פעם בלשון זכר או ברבים, וזה דלף לתשובות.
    // התלמידה היא אשה אחת, ומדברים אליה כך תמיד.
    // מה שהבוט למד עליה בשיחות קודמות. בלי זה היא מתחילה מאפס בכל פעם.
    var known = '';
    if (!rec['private'] && String(rec.profile || '').trim()) {
      known = '\n\n=== מה שאת כבר יודעת עליה משיחות קודמות ===\n' +
              String(rec.profile).trim() +
              '\n\nהיא כבר סיפרה לך את זה. אל תשאלי אותה שוב על מה שכתוב כאן, ' +
              'ואל תגידי לה שאין לך זיכרון. המשיכי מאיפה שעצרתם.\n';
    }
    if (rec.msgs) {
      known += '\nזו לא השיחה הראשונה שלכן. התכתבתן כבר ' + rec.msgs + ' פעמים.\n';
    }

    var system = {
      stable: stableText_(),
      dyn: override + where + known +
           '\n\n=== קטעים מתוך חומרי הקורס, עני רק מתוכם ===\n' + kb
    };

    // דף שנטען מחדש מגיע בלי היסטוריה. מביאים אותה מהגיליון, אחרת
    // התלמידה פותחת את הבוט ומגלה שהוא לא זוכר כלום.
    if (!history.length && !rec['private']) {
      history = recentTurns_(mail, 3);
    }
    var msgs = history.slice(-8).map(function (h) {
      return {role: h.role, content: String(h.content)};
    });
    msgs.push({role: 'user', content: question});

    var tPre = new Date().getTime();
    var answer = askModel_(system, msgs, mode);
    // הכוכביות של ההדגשה לא מעוצבות בדף ולא קריאות ביומן. מנקים כאן, פעם אחת.
    if (answer && answer.charAt(0) !== '[') {
      answer = answer.replace(/\*\*(.+?)\*\*/g, '$1')
                     .replace(/__(.+?)__/g, '$1')
                     .replace(/[\u2013\u2014]/g, '-');
    }
    var tAns = new Date().getTime();
    Logger.log('זמנים: שליפה ' + (tRet - t0) + ' | הכנה ' + (tPre - tRet) +
               ' | מודל ' + (tAns - tPre) + ' | מצב ' + mode);

    rec.spent = Math.round((Number(rec.spent || 0) + (PRICE[mode] || 0.173)) * 10000) / 10000;
    rec.msgs = (rec.msgs || 0) + 1;
    if (!rec.started) {
      rec.started = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd');
    }
    if (rec.schooler_total && !rec.progress_checked) rec.progress_checked = true;
    if (rec.mag_check === 'open') rec.mag_check = 'done';

    // הפרופיל מתעדכן ברקע בטריגר השעתי. אסור שקריאה שנייה למודל
    // תעכב את התלמידה שמחכה לתשובה.
    if (who && answer.charAt(0) !== '[' && !rec['private']) {
      rec.turns = (rec.turns || 0) + 1;
      rec.profile_due = true;
    }
    putRec_(mail, rec, row);
    if (!rec['private']) logTurn_(mail, rec, question, answer);

    return {a: answer, lesson: lesson};
  } catch (err) {
    // שגיאה לא נעלמת. היא נרשמת, כדי שאפשר יהיה לראות אותה מבחוץ
    // דרך ?diag=1 בלי להיכנס לעורך של גוגל.
    try {
      props_().setProperty('LAST_ERROR', Utilities.formatDate(
          new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd HH:mm') + ' | ' +
          String(err && err.message ? err.message : err).slice(0, 300) + ' | ' +
          String(err && err.stack ? err.stack : '').slice(0, 400));
    } catch (e2) { /* גם רישום שגיאה לא מפיל תשובה */ }
    return {a: 'משהו נתקע רגע. נסי שוב.', lesson: null};
  } finally {
    try { lock.releaseLock(); } catch (e) { /* כבר שוחרר */ }
  }
}

// ---------- בדיקה ידנית מתוך העורך ----------

function בדיקה() {
  var t = new Date().getTime();
  var r = retrieve_('אני מרגישה תקועה מול בעלי, מה לעשות', 3, 9, 'yodaat');
  Logger.log('שליפה: ' + r.length + ' קטעים ב-' + (new Date().getTime() - t) + ' מילישניות');
  Logger.log('מקורות: ' + r.map(function (c) { return c.src; }).join(' | '));
  Logger.log('מפתח מוגדר: ' + (props_().getProperty('ANTHROPIC_API_KEY') ? 'כן' : 'לא'));
  Logger.log('גיליון: ' + book_().getUrl());
}
