// שכבת הנתונים. שני מצבים עם אותו ממשק:
// live - Supabase (כניסה בקוד למייל, הרשאות שורה במסד)
// demo - הכל נשמר במכשיר בלבד (כל עוד אין חיבור מוגדר)
// בשני המצבים: כל כתיבה נשמרת קודם במכשיר, ואז נשלחת. אם אין חיבור, היא מחכה בתור ונשלחת אחר כך.
import { CONFIG } from './config.js';

const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

const LIVE = !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
const K = { session: 'ls.session', cache: 'ls.cache', queue: 'ls.queue', demo: 'ls.demo' };

let session = LS.get(K.session, null);
const listeners = new Set();
const emit = (e) => listeners.forEach((f) => f(e));

// ===== Supabase דרך HTTP, בלי ספריות =====
async function http(path, { method = 'GET', body, auth = true, prefer } = {}) {
  const h = { apikey: CONFIG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  if (auth && session) h.Authorization = 'Bearer ' + session.access_token;
  if (prefer) h.Prefer = prefer;
  let r = await fetch(CONFIG.SUPABASE_URL + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  if (r.status === 401 && auth && session) {
    await refresh();
    h.Authorization = 'Bearer ' + session.access_token;
    r = await fetch(CONFIG.SUPABASE_URL + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  }
  const txt = await r.text();
  const data = txt ? JSON.parse(txt) : null;
  if (!r.ok) { const e = new Error((data && (data.msg || data.message || data.error_description)) || r.statusText); e.status = r.status; throw e; }
  return data;
}

function keepSession(d) {
  session = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in || 3600) * 1000, user: { id: d.user.id, email: d.user.email } };
  LS.set(K.session, session);
}

let refreshing = null;
async function refresh() {
  if (!session) throw new Error('no session');
  if (!refreshing) refreshing = (async () => {
    try {
      const d = await http('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: session.refresh_token } });
      keepSession(d);
    } catch (e) {
      if (e.status === 400 || e.status === 401) { session = null; LS.del(K.session); emit('logout'); }
      throw e;
    } finally { refreshing = null; }
  })();
  return refreshing;
}

async function ensureFresh() {
  if (session && session.expires_at - Date.now() < 60000) await refresh();
}

// ===== תור כתיבה =====
let queue = LS.get(K.queue, []);
let flushing = false;
function enqueue(op) {
  // פעולה חדשה לאותו מפתח מחליפה פעולה ישנה שעוד לא נשלחה
  queue = queue.filter((q) => q.key !== op.key);
  queue.push(op);
  LS.set(K.queue, queue);
  flush();
}
async function flush() {
  if (!LIVE || flushing || !queue.length || !session) return;
  flushing = true;
  try {
    while (queue.length) {
      const op = queue[0];
      await ensureFresh();
      if (op.kind === 'upsert') {
        await http(`/rest/v1/${op.table}?on_conflict=${op.conflict}`, { method: 'POST', body: op.row, prefer: 'resolution=merge-duplicates,return=minimal' });
      } else if (op.kind === 'patch') {
        await http(`/rest/v1/${op.table}?${op.filter}`, { method: 'PATCH', body: op.row, prefer: 'return=minimal' });
      } else if (op.kind === 'insert') {
        await http(`/rest/v1/${op.table}`, { method: 'POST', body: op.row, prefer: 'return=minimal' });
      }
      // מוחקים בדיוק את הפעולה שנשלחה. אם בינתיים נכנסה פעולה חדשה לאותו מפתח (למשל סגירת יום מיד אחרי שמירה), היא נשארת בתור ונשלחת (תיקון 12.11)
      const at = queue.indexOf(op); if (at >= 0) queue.splice(at, 1);
      LS.set(K.queue, queue);
    }
    emit('synced');
  } catch (e) {
    emit(navigator.onLine === false ? 'offline' : 'save-error');
    setTimeout(() => { flushing = false; flush(); }, 15000);
    return;
  }
  flushing = false;
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flush());
  setInterval(() => flush(), 60000);
}

// ===== מטמון מקומי =====
let cache = LS.get(K.cache, null);
const saveCache = () => LS.set(K.cache, cache);
const emptyData = () => ({ profile: null, foundation: {}, days: {}, weeks: {}, settings: {} });

const stripKeys = (o) => { const r = { ...o }; delete r.user_id; delete r.updated_at; return r; };

export const api = {
  live: LIVE,
  on(f) { listeners.add(f); return () => listeners.delete(f); },
  pending() { return queue.length; },

  // לחיצה על הקישור במייל מחזירה לכאן עם #access_token=... בכתובת
  async fromLink() {
    if (!LIVE || !location.hash.includes('access_token=')) return false;
    const q = new URLSearchParams(location.hash.slice(1));
    const tmp = { access_token: q.get('access_token'), refresh_token: q.get('refresh_token'), expires_in: +q.get('expires_in') || 3600 };
    session = { ...tmp, expires_at: Date.now() + tmp.expires_in * 1000, user: null };
    try { const u = await http('/auth/v1/user'); keepSession({ ...tmp, user: u }); } catch { session = null; }
    history.replaceState(null, '', location.pathname + '#/today');
    return !!session;
  },

  user() {
    if (!LIVE) return LS.get(K.demo, null) ? { id: 'demo', email: (LS.get(K.demo).email) } : null;
    return session ? session.user : null;
  },

  async sendCode(email) {
    email = email.trim().toLowerCase();
    if (!LIVE) return true;
    try {
      await http('/auth/v1/otp', { method: 'POST', auth: false, body: { email, create_user: true, options: { email_redirect_to: location.origin + location.pathname } } });
    } catch (e) {
      // המסד מסרב ליצור משתמשת שלא נמצאת ברשימת המוזמנות (בוגרות וחברות מועדון)
      if (/database error|not_invited|saving new user/i.test(e.message)) { const x = new Error('not_invited'); x.code = 'not_invited'; throw x; }
      throw e;
    }
    return true;
  },

  async verify(email, code) {
    email = email.trim().toLowerCase();
    if (!LIVE) {
      LS.set(K.demo, { email });
      cache = emptyData();
      cache.profile = { id: 'demo', email, full_name: '', kind: 'graduate', share_journal: false, terms_at: null, beings: [], is_admin: true, created_at: new Date().toISOString() };
      saveCache();
      return true;
    }
    const d = await http('/auth/v1/verify', { method: 'POST', auth: false, body: { type: 'email', email, token: code.trim() } });
    keepSession(d);
    return true;
  },

  async logout() {
    if (LIVE && session) { try { await http('/auth/v1/logout', { method: 'POST' }); } catch {} }
    session = null; cache = null; queue = [];
    [K.session, K.cache, K.queue, K.demo].forEach(LS.del);
  },

  // טוען הכל פעם אחת. אם אין חיבור, עובדים מהמטמון.
  async load() {
    if (!LIVE) { cache = cache || emptyData(); return cache; }
    const uid = session.user.id;
    try {
      await ensureFresh();
      const [pr, fo, ds, ws, st] = await Promise.all([
        http(`/rest/v1/profiles?id=eq.${uid}&select=*`),
        http(`/rest/v1/foundation?user_id=eq.${uid}&select=*`),
        http(`/rest/v1/days?user_id=eq.${uid}&select=*&order=day.desc&limit=400`),
        http(`/rest/v1/weeks?user_id=eq.${uid}&select=*&order=week_start.desc&limit=60`),
        http(`/rest/v1/settings?select=*`),
      ]);
      const fresh = emptyData();
      fresh.profile = pr[0] || null;
      fresh.foundation = fo[0] ? stripKeys(fo[0]) : {};
      ds.forEach((d) => { fresh.days[d.day] = stripKeys(d); });
      ws.forEach((w) => { fresh.weeks[w.week_start] = stripKeys(w); });
      fresh.settings = st[0] || {};
      // מה שעוד מחכה בתור גובר על מה שבשרת
      queue.forEach((q) => {
        if (q.table === 'days') fresh.days[q.row.day] = { ...(fresh.days[q.row.day] || {}), ...q.row };
        if (q.table === 'weeks') fresh.weeks[q.row.week_start] = { ...(fresh.weeks[q.row.week_start] || {}), ...q.row };
        if (q.table === 'foundation') fresh.foundation = { ...fresh.foundation, ...q.row };
        if (q.table === 'profiles') fresh.profile = { ...fresh.profile, ...q.row };
      });
      cache = fresh; saveCache();
      http(`/rest/v1/profiles?id=eq.${uid}`, { method: 'PATCH', body: { last_seen_at: new Date().toISOString() }, prefer: 'return=minimal' }).catch(() => {});
      flush();
    } catch (e) {
      if (!cache) throw e;
      emit('offline');
    }
    return cache;
  },

  data() { return cache; },

  saveProfile(patch) {
    cache.profile = { ...cache.profile, ...patch }; saveCache();
    if (LIVE) enqueue({ key: 'profile', kind: 'patch', table: 'profiles', filter: `id=eq.${session.user.id}`, row: { ...(queue.find((q) => q.key === 'profile') || {}).row, ...patch } });
  },
  saveFoundation(obj) {
    cache.foundation = { ...cache.foundation, ...obj }; saveCache();
    if (LIVE) enqueue({ key: 'foundation', kind: 'upsert', table: 'foundation', conflict: 'user_id', row: { ...cache.foundation, user_id: session.user.id } });
  },
  saveDay(day, obj) {
    cache.days[day] = { ...(cache.days[day] || {}), ...obj, day }; saveCache();
    if (LIVE) enqueue({ key: 'day:' + day, kind: 'upsert', table: 'days', conflict: 'user_id,day', row: { ...cache.days[day], user_id: session.user.id } });
  },
  saveWeek(ws, obj) {
    cache.weeks[ws] = { ...(cache.weeks[ws] || {}), ...obj, week_start: ws }; saveCache();
    if (LIVE) enqueue({ key: 'week:' + ws, kind: 'upsert', table: 'weeks', conflict: 'user_id,week_start', row: { ...cache.weeks[ws], user_id: session.user.id } });
  },
  feedbackState() { return LS.get('ls.fb', null); },          // null | 'sent' | 'later:<תאריך>'
  setFeedbackState(v) { LS.set('ls.fb', v); },
  sendFeedback(answers) {
    LS.set('ls.fb', 'sent');
    if (LIVE) enqueue({ key: 'feedback', kind: 'insert', table: 'feedback', row: { answers, user_id: session.user.id } });
    else LS.set('ls.demo.feedback', answers);
  },

  // ===== שושי בלבד. המסד בודק הרשאה בכל קריאה =====
  admin: {
    async overview(week) {
      if (!LIVE) return demoOverview(week);
      await ensureFresh();
      return http('/rest/v1/rpc/admin_overview', { method: 'POST', body: { p_week: week } });
    },
    async user(id) {
      if (!LIVE) return demoUser(id);
      await ensureFresh();
      return http('/rest/v1/rpc/admin_user', { method: 'POST', body: { p_id: id } });
    },
    async addInvites(rows) {
      if (!LIVE) return rows.length;
      await ensureFresh();
      return http('/rest/v1/rpc/admin_add_invites', { method: 'POST', body: { p_rows: rows } });
    },
    async update(id, patch) {
      if (!LIVE) return true;
      await ensureFresh();
      return http('/rest/v1/rpc/admin_update', { method: 'POST', body: { p_id: id, p_kind: patch.kind ?? null, p_member: patch.member ?? null, p_trial_end: patch.trial_end ?? null } });
    },
    async feedback() {
      if (!LIVE) { const f = LS.get('ls.demo.feedback', null); return f ? [{ full_name: 'את (הדגמה)', email: '', answers: f, created_at: new Date().toISOString() }] : []; }
      await ensureFresh();
      return http('/rest/v1/rpc/admin_feedback', { method: 'POST', body: {} });
    },
  },
};

// ===== נתוני הדגמה לדשבורד של שושי (רק במצב הדגמה, מסומן בבירור) =====
const DEMO_WOMEN = [
  ['נועה', 'n', [1,1,1,1,1,0,0], [1,1,0,1,1,0,0], 48, 'ב-10.1.2027 אני רצה 5 ק״מ ברצף', 3, 'סלחנית'],
  ['אילנה', 'y', [1,1,1,1,1,1,0], [1,1,1,1,1,1,0], 71, 'עד 1.2.2027 נצברו 8 ייעוצים בתשלום', 4, 'נוכחת'],
  ['רחל', 'n', [1,0,0,0,0,0,0], [0,0,0,0,0,0,0], 15, 'ב-15.1.2027 המטבח מסודר לפי התוכנית', 4, 'סלחנית'],
  ['שירה', 'n', [0,0,0,0,0,0,0], [0,0,0,0,0,0,0], null, null, 1, null],
  ['מיכל', 'y', [1,1,0,1,1,0,0], [1,1,0,1,0,0,0], 33, 'עד 20.1.2027 סיימתי לכתוב 12 פרקים', 4, 'רגועה'],
  ['דבורה', 'n', [1,1,0,0,0,0,0], [1,0,0,0,0,0,0], 22, 'ב-1.2.2027 אני שוקלת 64', 4, 'סלחנית'],
];
function demoOverview() {
  const today = new Date();
  return DEMO_WOMEN.map(([n, s, wo, wc, depth, ach, parts, low], i) => {
    const lastIdx = wo.lastIndexOf(1);
    const dso = lastIdx < 0 ? null : (today.getDay() - lastIdx);
    return {
      id: 'demo-' + i, full_name: n + ' (הדגמה)', email: '', kind: i === 3 ? 'other' : 'graduate', self_kind: i === 3 ? 'club' : null, member: i === 1, share_journal: s === 'y',
      trial_end: null, created_at: new Date(today - (20 + i) * 864e5).toISOString(),
      achievement: ach, achievement_date: null, plan_count: ach ? 5 : 0, foundation_parts: parts,
      last_open: null, days_since_open: dso === null ? 12 : Math.max(dso, 0) + (i === 2 ? 4 : 0) + (i === 5 ? 3 : 0),
      days_since_join: 20 + i, week_open: wo, week_close: wc, depth,
      key_done: wc.filter(Boolean).length, key_total: wo.filter(Boolean).length, low_sub: low,
    };
  });
}
function demoUser(id) {
  const i = +id.split('-')[1]; const w = DEMO_WOMEN[i];
  return { profile: { full_name: w[0] + ' (הדגמה)', share_journal: w[1] === 'y' }, foundation: { achievement: w[5], plan_habits: [{ text: 'ריצה והליכה', amount: '25 דק׳', freq: '3', days: 'א׳ ג׳ ה׳' }] }, days: w[1] === 'y' ? [] : undefined };
}
