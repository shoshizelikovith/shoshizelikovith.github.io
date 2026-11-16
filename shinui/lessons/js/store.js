// כניסה, הרשאה ונתוני צפייה.
// באתר: שכבת הכניסה של ״לשחק את השינוי״ (../../js/api.js) - אותה כניסה ואותו מכשיר זוכר.
// בתצוגה מקומית (127.0.0.1): מצב הדגמה, בלי שרת. ?live=1 מכריח חיבור אמיתי.
// נתוני הצפייה (פתיחות, זמן צפייה, אחוז, מיקום, הורדות, כפתור האפליקציה) נשמרים ב-Supabase (supabase-lessons.sql).
// כל עוד הטבלאות לא קיימות - במכשיר בלבד.

const local = ['127.0.0.1', 'localhost'].includes(location.hostname);
export const DEMO = local && !new URLSearchParams(location.search).has('live');

const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const KP = 'lp.progress';   // { [n]: { opens, seconds, pct, pos, watched } }

let api = null, CONFIG = null;
let me = null;
let prog = LS.get(KP, {});
let remote = false;
let loginErr = '';
const P = (n) => (prog[n] = prog[n] || { opens: 0, seconds: 0, pct: 0, pos: 0, watched: false });
const save = () => LS.set(KP, prog);

async function rest(path, body) {
  const s = LS.get('ls.session', null);
  if (!s) throw new Error('no session');
  const r = await fetch(CONFIG.SUPABASE_URL + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) { const e = new Error(r.statusText); e.status = r.status; throw e; }
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const rpc = (fn, args) => rest('/rest/v1/rpc/' + fn, args || {});
const fire = (fn, args) => { if (remote) rpc(fn, args).catch(() => {}); };

export const store = {
  demo: DEMO,

  // מחזיר: 'in' | 'login' | 'terms' | 'noaccess'
  async start(access) {
    if (DEMO) { me = { email: 'demo', name: 'שושי', kind: 'graduate', is_admin: true, terms: true }; return 'in'; }
    ({ api } = await import('../../js/api.js'));
    ({ CONFIG } = await import('../../js/config.js'));
    // חזרה מגוגל עם שגיאה (למשל מייל שלא רשום אצלנו)
    if (/error=|error_description=/.test(location.hash + location.search)) {
      const q = new URLSearchParams((location.hash || '').replace(/^#/, '') + '&' + location.search.slice(1));
      loginErr = /database error|not_invited|saving new user/i.test(q.get('error_description') || '') ? 'not_invited' : 'error';
      history.replaceState(null, '', location.pathname);
    }
    await api.fromLink();
    if (!api.user()) return 'login';
    let d;
    try { d = await api.load(); } catch { return 'login'; }
    const p = d.profile || {};
    me = { email: p.email, name: p.full_name || '', kind: p.kind, is_admin: !!p.is_admin, terms: !!p.terms_at };
    if (!me.terms) return 'terms';
    // שושי, 14.11: נכנסות רק רוכשות תוכנית ההמשך (טבלת purchasers, מסונכרנת מרב מסר), ורק כשהפורטל פתוח להן
    // (portal_settings.open_to_purchasers - כבוי עד שהשיעורים החדשים מוכנים). שושי תמיד. המסד מחליט, לא הדפדפן.
    if (access === 'server') {
      let ok = false;
      try { ok = await rpc('portal_access'); } catch { ok = false; }
      if (!ok) return 'noaccess';
    } else if (!me.is_admin && !(access === 'all' || (access === 'graduate' && me.kind === 'graduate'))) return 'noaccess';
    try {
      const rows = await rest('/rest/v1/lesson_progress?select=lesson,opens,seconds,max_percent,position,watched_at');
      prog = {};
      rows.forEach((r) => { prog[r.lesson] = { opens: r.opens, seconds: r.seconds, pct: +r.max_percent, pos: r.position, watched: !!r.watched_at }; });
      save(); remote = true;
    } catch { remote = false; }
    return 'in';
  },

  me() { return me; },

  // קישורי הסרטונים והחומרים: מהמסד, רק למי שיש לה גישה. בתצוגה מקומית מ-data/media.json (לא עולה לאתר).
  async media() {
    try {
      if (DEMO) return await (await fetch('data/media.json', { cache: 'no-store' })).json();
      return await rest('/rest/v1/portal_lessons?select=n,vimeo,workbook,slides,summary,part2&order=n');
    } catch { return null; }
  },
  loginError() { return loginErr; },
  sendCode(email) { return api.sendCode(email); },
  verify(email, code) { return api.verify(email, code); },

  // כניסה עם גוגל: רק מי שהמייל שלה בגוגל רשום אצלנו (המסד מסרב ליצור משתמשת שלא ברשימה)
  google() {
    const back = location.origin + location.pathname;
    location.href = `${CONFIG.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(back)}`;
  },
  // כניסה במייל וסיסמה
  async password(email, pw) {
    const r = await fetch(CONFIG.SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { apikey: CONFIG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password: pw }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error('login'); e.code = r.status === 400 ? 'bad_password' : 'net'; throw e; }
    // אותו מבנה בדיוק כמו keepSession באפליקציה, כדי שגם האפליקציה תזהה את הכניסה
    LS.set('ls.session', { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in || 3600) * 1000, user: { id: d.user.id, email: d.user.email } });
    location.reload();
    await new Promise(() => {});
  },
  // אחרי כניסה בקוד: בוחרים סיסמה לפעם הבאה
  async setPassword(pw) {
    const s = LS.get('ls.session', null);
    const r = await fetch(CONFIG.SUPABASE_URL + '/auth/v1/user', {
      method: 'PUT', headers: { apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    if (!r.ok) { const t = await r.text(); const e = new Error('pw'); e.code = /weak|short|least/i.test(t) ? 'weak_password' : 'net'; throw e; }
  },
  async logout() { if (api) await api.logout(); },

  isWatched(n) { return !!(prog[n] && prog[n].watched); },
  count() { return Object.values(prog).filter((p) => p.watched).length; },
  position(n) { return (prog[n] && prog[n].pos) || 0; },

  opened(n) { P(n).opens++; save(); fire('lesson_open', { p_lesson: n }); },
  setWatched(n, on) { P(n).watched = on; save(); fire('lesson_mark', { p_lesson: n, p_on: on }); },
  // זמן צפייה: נצבר במכשיר ונשלח בכל 20 שניות, ביציאה מהשיעור ובסגירת הדף
  tick(n, secs, pct, pos) { const p = P(n); p.seconds += secs; p.pct = Math.max(p.pct, pct); p.pos = pos; save(); },
  flush(n, secs, pct, pos) { if (secs > 0 || pct > 0) fire('lesson_tick', { p_lesson: n, p_seconds: Math.round(secs), p_percent: +pct.toFixed(3), p_position: Math.round(pos) }); },
  click(n, kind) { fire('lesson_click', { p_lesson: n, p_kind: kind }); },

  // ===== שושי בלבד. המסד בודק הרשאה בכל קריאה =====
  async adminOverview() {
    if (DEMO) return demoOverview();
    return rpc('admin_lessons');
  },
};

// ===== נתוני הדגמה למסך הנתונים (רק בתצוגה מקומית, מסומן בבירור) =====
function demoOverview() {
  const names = ['נועה', 'אילנה', 'רחל', 'מיכל', 'דבורה', 'שירה'];
  const reach = [14, 25, 3, 9, 6, 0];
  const today = Date.now();
  const women = names.map((nm, i) => {
    const lessons = {};
    for (let n = 1; n <= reach[i]; n++) {
      const pct = n === reach[i] ? 0.35 + (i % 3) * 0.2 : 0.92 + (n % 3) * 0.03;
      lessons[n] = { opens: 1 + (n % 3 === 0 ? 1 : 0), seconds: Math.round(4600 * Math.min(pct, 1)), max_percent: Math.min(pct, 1), watched: pct >= 0.9, downloads: n % 2, app: n >= 6 && n % 3 === 0 ? 1 : 0 };
    }
    return { id: 'demo-' + i, full_name: nm + ' (הדגמה)', email: '', last_open: reach[i] ? new Date(today - (i * 2 + 1) * 864e5).toISOString() : null, lessons };
  });
  return { women };
}
