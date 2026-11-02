/**
 * סנכרון חי מול רב מסר.
 *
 * הגישה לקורס נולדת ברשימת "לימוד הקורס" ברב מסר, ומשם רב מסר יוצר את
 * התלמידה בסקולר. לכן הרשימה הזו היא מקור האמת, והבוט שואל אותה ישירות.
 *
 * רץ על טריגר של גוגל כל שעה, בלי קשר למחשב של שושי.
 * שלושת הערכים שצריכים לשבת ב-Script Properties:
 *   RM_CLIENT_ID, RM_CLIENT_SECRET, RM_USER_TOKEN
 */

var RM_BASE = 'https://graph.responder.live/v2';
var RM_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/140.0 Safari/537.36';

/** רשימות הגישה. "לימוד הקורס" היא מפתח הגישה בפועל. */
var RM_LISTS = [
  {id: 120938, course: 'magnetit', label: 'ממגנטת'},
  {id: 120940, course: 'yodaat',   label: 'יודעת'},
  {id: 120942, course: 'yodaat',   label: 'המסע המלא', full: true}
];

/** טוקן של רב מסר, נשמר עד שהוא פג. */
function rmToken_() {
  var p = props_();
  var tok = p.getProperty('RM_TOKEN');
  var exp = Number(p.getProperty('RM_TOKEN_EXP') || 0);
  if (tok && exp > (new Date().getTime() / 1000) + 120) return tok;

  var id = p.getProperty('RM_CLIENT_ID'),
      secret = p.getProperty('RM_CLIENT_SECRET'),
      user = p.getProperty('RM_USER_TOKEN');
  if (!id || !secret || !user) return '';

  var res = UrlFetchApp.fetch(RM_BASE + '/oauth/token', {
    method: 'post', contentType: 'application/json',
    headers: {'User-Agent': RM_UA},
    payload: JSON.stringify({grant_type: 'client_credentials', scope: '*',
                             client_id: id, client_secret: secret, user_token: user}),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return '';
  var d = JSON.parse(res.getContentText());
  // מלכודת: השדה הוא token ולא access_token, והתפוגה היא expire ולא expires_in
  if (!d.token) return '';
  p.setProperty('RM_TOKEN', d.token);
  p.setProperty('RM_TOKEN_EXP', String(d.expire || 0));
  return d.token;
}

function rmGet_(path, params) {
  var tok = rmToken_();
  if (!tok) return null;
  var url = RM_BASE + path;
  if (params) {
    var q = [];
    for (var k in params) q.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    url += '?' + q.join('&');
  }
  var res = UrlFetchApp.fetch(url, {
    headers: {'Authorization': 'Bearer ' + tok, 'User-Agent': RM_UA},
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return null;
  return JSON.parse(res.getContentText());
}

/**
 * מושך את כל מי שיש לה גישה לפי רב מסר, וכותב לגיליון.
 * נקרא מטריגר שעתי. לא מוחק אף אחת - רק מוסיף ומעדכן.
 */
function syncRoster_() {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { return 0; }
  try {
    var s = tab_('רשימה');
    if (s.getLastRow() < 1) {
      s.appendRow(['מייל', 'שם', 'קורס', 'תווית', 'מאיזו רשימה', 'עודכן']);
    }
    var have = {}, last = s.getLastRow();
    if (last > 1) {
      var cur = s.getRange(2, 1, last - 1, 1).getValues();
      for (var i = 0; i < cur.length; i++) {
        have[String(cur[i][0]).trim().toLowerCase()] = i + 2;
      }
    }

    var when = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd HH:mm');
    var added = 0, rows = [];

    for (var L = 0; L < RM_LISTS.length; L++) {
      var cfg = RM_LISTS[L], offset = 0;
      while (true) {
        var d = rmGet_('/lists/' + cfg.id + '/subscribers', {limit: 500, offset: offset});
        if (!d || !d.data || !d.data.length) break;
        for (var j = 0; j < d.data.length; j++) {
          var sub = d.data[j];
          var mail = String(sub.email || '').trim().toLowerCase();
          if (!mail) continue;
          // מי שהוסרה מהרשימה איבדה גישה, ולכן לא נכנסת
          if (sub.unsubscribed || sub.blocked || sub.inactive) continue;
          if (have[mail]) continue;
          var nm = (sub.first || '') + (sub.last ? ' ' + sub.last : '');
          rows.push([mail, (nm || sub.name || '').trim(), cfg.course, cfg.label,
                     cfg.id, when]);
          have[mail] = -1;
          added++;
        }
        if (d.data.length < 500) break;
        offset += 500;
      }
    }

    if (rows.length) s.getRange(s.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
    props_().setProperty('ROSTER_SYNCED', when);
    CacheService.getScriptCache().remove('roster_extra');
    return added;
  } finally {
    try { lock.releaseLock(); } catch (e) { /* כבר שוחרר */ }
  }
}

/**
 * תלמידה שרכשה לפני רגע ורצה לבוט לא יכולה לחכות לטריגר השעתי.
 * כשמייל לא מוכר, שואלים את רב מסר מיד - אבל לא יותר מפעם בדקה,
 * כדי שרצף של מיילים שגויים לא יציף את ה-API.
 */
function liveSync_() {
  var c = CacheService.getScriptCache();
  if (c.get('live_sync_recent')) return false;
  try { c.put('live_sync_recent', '1', 60); } catch (e) { /* ממשיכים */ }
  try { syncRoster_(); return true; } catch (e) { return false; }
}

/** מה שהסנכרון הוסיף, מעל הרשימה הצרובה. נשמר בזיכרון לשעה. */
function rosterExtra_() {
  var c = CacheService.getScriptCache(), hit = c.get('roster_extra');
  if (hit) {
    try { return JSON.parse(hit); } catch (e) { /* נקרא מחדש */ }
  }
  var out = {};
  try {
    var s = tab_('רשימה'), last = s.getLastRow();
    if (last > 1) {
      var v = s.getRange(2, 1, last - 1, 4).getValues();
      for (var i = 0; i < v.length; i++) {
        var mail = String(v[i][0]).trim().toLowerCase();
        if (mail) out[mail] = {name: v[i][1] || '', course: v[i][2] || '',
                               label: v[i][3] || '', done: 0, total: 0};
      }
    }
  } catch (e) { /* בלי הגיליון נשארת הרשימה הצרובה */ }
  try { c.put('roster_extra', JSON.stringify(out), 3600); } catch (e) { /* גדול מדי */ }
  return out;
}

/**
 * מי שלא נמצאה בשום מקום. נרשמת בגיליון ושושי מקבלת מייל פעם אחת,
 * כדי שלא תאבד אף תלמידה בשקט.
 */
function logUnknown_(mail, who) {
  try {
    var s = tab_('לא זוהו'), last = s.getLastRow();
    if (last < 1) { s.appendRow(['זמן', 'שם', 'מייל', 'טופל']); last = 1; }
    if (last > 1) {
      var seen = s.getRange(2, 3, last - 1, 1).getValues();
      for (var i = 0; i < seen.length; i++) {
        if (String(seen[i][0]).trim().toLowerCase() === mail) return;
      }
    }
    s.appendRow([Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd HH:mm'),
                 who || '', mail, '']);
    var to = props_().getProperty('MAIL_TO') || Session.getEffectiveUser().getEmail();
    MailApp.sendEmail(to, 'מישהי ניסתה להיכנס לבוט ולא זוהתה',
      'שם: ' + (who || '(לא נכתב)') + '\nמייל: ' + mail + '\n\n' +
      'היא לא נמצאה ברשימת התלמידות ולא ברשימות הגישה ברב מסר.\n\n' +
      'אם היא באמת רכשה - צריך לבדוק באיזה מייל היא רשומה שם.\n' +
      'הרשימה המלאה נמצאת בגיליון, בלשונית "לא זוהו".');
  } catch (e) { /* התראה לא מפילה תשובה */ }
}

// ---------- הטריגר ----------

/**
 * דואג שהטריגר השעתי קיים. נקרא בכל טעינה של הדף, ועולה רק בפעם הראשונה -
 * אחר כך זה רק קריאת מאפיין אחת.
 */
function ensureTrigger_() {
  var p = props_();
  if (p.getProperty('TRIGGER_OK')) return;
  var all = ScriptApp.getProjectTriggers();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getHandlerFunction() === 'סנכרון_שעתי') {
      p.setProperty('TRIGGER_OK', '1');
      return;
    }
  }
  ScriptApp.newTrigger('סנכרון_שעתי').timeBased().everyHours(1).create();
  p.setProperty('TRIGGER_OK', '1');
}

/** מתקינים פעם אחת. אחרי זה גוגל מריץ לבד כל שעה. */
function התקנת_סנכרון() {
  var all = ScriptApp.getProjectTriggers();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getHandlerFunction() === 'סנכרון_שעתי') ScriptApp.deleteTrigger(all[i]);
  }
  ScriptApp.newTrigger('סנכרון_שעתי').timeBased().everyHours(1).create();
  var n = syncRoster_();
  Logger.log('הטריגר הותקן. בסנכרון הראשון נוספו ' + n + ' תלמידות.');
  Logger.log('רב מסר מוגדר: ' + (rmToken_() ? 'כן' : 'לא - חסרים המפתחות'));
}

/**
 * עדכון הפרופילים, ברקע. רץ בטריגר השעתי ולא בזמן שהתלמידה ממתינה.
 * עובר על מי שסומנה profile_due, קורא את השיחות האחרונות שלה מהגיליון,
 * ומבקש מהמודל לכתוב מחדש מה ידוע עליה.
 */
function updateProfiles_() {
  var st = tab_('תלמידות'), last = st.getLastRow();
  if (last < 2) return 0;
  var rows = st.getRange(2, 1, last - 1, 9).getValues();

  var due = [];
  for (var i = 0; i < rows.length; i++) {
    var extra = {};
    try { extra = JSON.parse(rows[i][8] || '{}'); } catch (e) { continue; }
    if (extra.profile_due && !extra['private']) {
      due.push({row: i + 2, mail: String(rows[i][0]).trim().toLowerCase(),
                profile: rows[i][7] || '', extra: extra, line: rows[i]});
    }
  }
  if (!due.length) return 0;
  if (due.length > 12) due = due.slice(0, 12);   // לא לחרוג מזמן הריצה

  // כל השיחות בקריאה אחת, ואז מסננים בזיכרון
  var sc = tab_('שיחות'), slast = sc.getLastRow();
  var talks = slast > 1 ? sc.getRange(2, 3, slast - 1, 5).getValues() : [];

  var done = 0;
  for (var d = 0; d < due.length; d++) {
    var who = due[d], recent = [];
    for (var j = talks.length - 1; j >= 0 && recent.length < 6; j--) {
      if (String(talks[j][0]).trim().toLowerCase() === who.mail) {
        recent.unshift('התלמידה: ' + String(talks[j][3]).slice(0, 700) +
                       '\nהמאמנת: ' + String(talks[j][4]).slice(0, 700));
      }
    }
    if (!recent.length) continue;

    var prev = String(who.profile).trim() || '(עדיין לא ידוע כלום)';
    var out = '';
    try {
      out = askModel_(PROFILE_PROMPT_, [{role: 'user',
        content: 'מה שידוע עד כה:\n' + prev + '\n\n=== קטעי שיחה ===\n' +
                 recent.join('\n\n')}], 'light');
    } catch (e) { continue; }
    if (!out || out.charAt(0) === '[') continue;

    delete who.extra.profile_due;
    var line = who.line;
    line[7] = out.trim().slice(0, 1500);
    line[8] = JSON.stringify(who.extra);
    st.getRange(who.row, 1, 1, 9).setValues([line]);
    done++;
  }
  return done;
}

function סנכרון_שעתי() {
  var note = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd HH:mm');
  try { syncRoster_(); } catch (e) { note += ' | רשימה: ' + String(e).slice(0, 120); }
  try { note += ' | פרופילים: ' + updateProfiles_(); } catch (e) { note += ' | פרופילים: ' + String(e).slice(0, 120); }
  props_().setProperty('LAST_HOURLY', note);
}
