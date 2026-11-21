// לשחק את השינוי - האפליקציה. ניתוב לפי # בכתובת, מסך אחד בכל פעם.
import { api } from './api.js';
import { T } from './content.js';
import { TM } from './content-m.js';
import { CONFIG } from './config.js';

// לשון פנייה (שושי 20.11): ברירת המחדל נקבה. מי שבחר בהגדרות ״בלשון זכר״ מקבל את TM מעל T, רק אצלו.
// content-m.js מחזיק רק את המפתחות ששונים בזכר. כל שינוי טקסט ב-content.js צריך גם גרסת זכר שם.
const TF = { ...T };
let curG = 'f';
function applyGender(g) {
  g = g === 'm' ? 'm' : 'f';
  if (g === curG) return;
  for (const k of Object.keys(T)) if (!(k in TF)) delete T[k];
  for (const k of Object.keys(TF)) T[k] = TF[k];
  if (g === 'm') Object.assign(T, TM);
  curG = g;
  try { localStorage.setItem('ls-g', g); } catch {}
}
try { applyGender(localStorage.getItem('ls-g')); } catch {}
import { morningNote, sticker, wallpaper, quoteCard, giftNote, saveCanvas, journalPages } from './img.js';
import { renderAdmin } from './admin.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const root = $('#app');

// ===== תאריכים (לפי השעון המקומי) =====
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const today = () => iso(new Date());
const weekStart = (s) => { const d = parse(s); d.setDate(d.getDate() - d.getDay()); return iso(d); };
// תאריך עברי: ה׳ בכסלו. הספרות באותיות, החודש מהלוח העברי של הדפדפן
const GEM = (n) => { const o = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], t = ['', 'י', 'כ', 'ל']; const s = n === 15 ? 'טו' : n === 16 ? 'טז' : t[Math.floor(n / 10)] + o[n % 10]; return s.length > 1 ? s.slice(0, -1) + '״' + s.slice(-1) : s + '׳'; };
let HEB; try { HEB = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long' }); } catch { HEB = null; }
const hebDate = (s) => { try { const p = HEB.formatToParts(parse(s)); const dv = p.find((x) => x.type === 'day').value; const n = parseInt(dv, 10); return `${isNaN(n) ? dv : GEM(n)} ב${p.find((x) => x.type === 'month').value}`; } catch { return ''; } };
const dayLabel = (s) => { const d = parse(s); const h = hebDate(s); return `יום ${T.dayNames[d.getDay()]} · ${h ? h + ' · ' : ''}${d.getDate()}.${d.getMonth() + 1}`; };
const hebShort = (s) => { const h = hebDate(s); return h ? `${h} · ${shortDate(s)}` : shortDate(s); };
// סגירת יום: אפשר עד חצות של היום שאחריו (למשל יום שישי נסגר עד סוף מוצאי שבת)
const closeDeadline = (day) => parse(addDays(day, 2)).getTime();
const canStillClose = (day) => Date.now() < closeDeadline(day);
const closedLate = (d) => !!d.closed_at && iso(new Date(d.closed_at)) > d.day;
const shortDate = (s) => { const d = parse(s); return `${d.getDate()}.${d.getMonth() + 1}`; };
const hhmm = (ts) => { if (!ts) return ''; const d = new Date(ts); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
const minutesOf = (ts) => { const d = new Date(ts); return d.getHours() * 60 + d.getMinutes(); };
const fmtMin = (m) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')}`;
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);

// ===== מצב =====
let D = null; // הנתונים
const P = () => D.profile || {};
const F = () => D.foundation || {};
const filled = (v) => v != null && String(v).trim() !== '';
const hasAchievement = () => filled(F().achievement);
const hasPlan = () => (F().plan_once || []).some((x) => filled(x.text)) || (F().plan_habits || []).some((x) => filled(x.text));
const hasBase = () => hasAchievement() && hasPlan();
// שתי רמות תרגול (שושי 12.11): ״הוויה״ (כמו שיעורים 6-12) או היומן המלא מול הישג המפתח. היומן המלא פעיל רק כשיש בסיס
const levelOf = () => P().level || (P().kind === 'graduate' ? 'full' : 'being');
const fullMode = () => levelOf() === 'full' && hasBase();
const channelsDone = () => ['physical', 'cognitive', 'spiritual', 'emotional'].every((k) => (F().channels || {})[k] && filled(F().channels[k].score));
const futureDone = () => filled(F().future_general) || filled(F().future_specific);
const firstName = () => (P().full_name || '').split(' ')[0];
const weekNumber = (ws) => { const start = weekStart(iso(new Date(P().created_at || Date.now()))); return Math.max(1, Math.floor(daysBetween(start, ws) / 7) + 1); };
const kindOf = () => (P().kind && P().kind !== 'other' ? P().kind : P().self_kind || 'other');

// ===== הודעה קטנה =====
let toastT;
// אייקון לכל לשונית בסרגל התחתון
const TAB_ICON = { today: 'open', week: 'week', progress: 'data', collection: 'collection', base: 'achievement' };
// רגע של הצלחה: אייקון שקופץ עם הודעה חמה, בסגירת יום ובסגירה ופתיחה של שבוע
function celebrate(icon, msg) {
  const c = document.createElement('div'); c.className = 'cele'; c.setAttribute('role', 'status');
  c.innerHTML = `<div class="cele-in"><img src="img/icons/${icon}.png" width="120" height="120" alt="" aria-hidden="true"><p>${esc(msg)}</p></div>`;
  document.body.appendChild(c); setTimeout(() => c.classList.add('out'), 1700); setTimeout(() => c.remove(), 2200);
}
function toast(msg) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2600);
}
api.on((e) => { if (e === 'offline') toast(T.offline); if (e === 'save-error') toast(T.saveError); if (e === 'logout') go('#/'); });

// ===== שלד =====
const logoImg = (cls = 'lg') => `<img class="${cls}" src="img/aro-wide.png" width="1269" height="338" alt="אשה רוצה עושה">`;
function shell(body, tab, { wide = false } = {}) {
  root.classList.toggle('wide-root', !!wide); // במחשב: הדשבורד רחב, כל השאר בצורת טלפון
  const tabs = Object.entries(T.tabs).map(([k, v]) => `<a href="#/${k}" class="${tab === k ? 'on' : ''}" ${tab === k ? 'aria-current="page"' : ''}><img class="tab-ico" src="img/icons/${TAB_ICON[k]}.png" width="30" height="30" alt="" aria-hidden="true">${v}</a>`).join('');
  root.innerHTML = `
    <div class="tabs"><nav aria-label="ניווט">${tabs}</nav></div>
    <main class="app${wide ? ' wide' : ''}">
      ${api.live ? '' : `<div class="banner demo">${T.demoBanner}</div>`}
      <div class="top">${logoImg()}<a class="gear" href="#/settings" aria-label="${T.settingsTitle}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></a></div>
      ${body}
    </main>`;
  $$('input[data-k],textarea[data-k]', root).forEach((el) => {
    if (el.getAttribute('aria-label')) return;
    let q = el.previousElementSibling; while (q && !q.matches('.q')) q = q.previousElementSibling;
    const ct = el.closest('.card')?.querySelector('.ct');
    const lab = [q ? q.textContent : ct ? ct.textContent : '', el.placeholder && el.placeholder !== T.writeHere ? el.placeholder : ''].map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean).join(': ');
    if (lab) el.setAttribute('aria-label', lab);
  });
  $$('.err', root).forEach((e) => e.setAttribute('role', 'alert'));
  if (location.hash !== shell.last) {
    shell.last = location.hash; window.scrollTo(0, 0); root.scrollTop = 0;
    const h = $('h1', root); if (h) { h.tabIndex = -1; h.style.outline = 'none'; h.focus({ preventScroll: true }); }
  }
}
// כותרת מסך, עם אייקון נייר שמבדיל בין המסכים (12.11, לאישור שושי)
const hd = (small, title, icon = '') => `<header class="hd${icon ? ' has-ico' : ''}"><div class="hd-tx">${small ? `<small>${esc(small)}</small>` : ''}<h1>${esc(title)}</h1></div>${icon ? `<img class="hd-ico" src="img/icons/${icon}.png" width="84" height="84" alt="" aria-hidden="true">` : ''}</header>`;
const tag = (req) => `<span class="tag ${req ? 'm' : 'o'}">${req ? T.required : T.optional}</span>`;
// כפתור ״מה זה?״ ליד כל חלק. מופיע רק כשיש לחלק כרטיס הסבר
const helpRow = (k) => (T.help[k] ? `<div class="hrow">${helpBtn(k)}</div>` : '');
const helpBtn = (k) => (T.help[k] ? `<button type="button" class="help" data-help="${k}" aria-haspopup="dialog">${T.helpOpen}</button>` : '');
// ציטוט מתחלף: בכל פתיחה של כרטיס הסבר הציטוט הבא בתור
function inspireHtml() {
  const list = T.inspire || []; if (!list.length) return '';
  let i = 0; try { i = (+localStorage.getItem('ls-insp') || 0) % list.length; localStorage.setItem('ls-insp', i + 1); } catch { i = Math.floor(Math.random() * list.length); }
  return `<figure class="insp"><img src="img/icons/reflect.png" width="40" height="40" alt="" aria-hidden="true"><blockquote>״${esc(list[i])}״</blockquote><figcaption>${esc(T.inspireBy)}</figcaption></figure>`;
}
function openHelp(k) {
  const h = T.help[k]; if (!h) return;
  const video = (CONFIG.HELP_VIDEOS || {})[k];
  const opener = document.activeElement;
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="sheet help-card" role="dialog" aria-modal="true" aria-labelledby="hlt">
    <button class="close" type="button" aria-label="${T.helpBack}">×</button>
    ${h.lesson ? `<small class="over">${esc(h.lesson)}</small>` : ''}<h2 id="hlt">${esc(h.title)}</h2>
    ${h.what ? `<p class="hq">${T.helpWhat}</p><p>${esc(h.what)}</p>` : ''}
    ${h.why ? `<p class="hq">${T.helpWhy}</p><p>${esc(h.why)}</p>` : ''}
    ${h.how ? `<p class="hq">${T.helpHow}</p><p>${esc(h.how)}</p>` : ''}
    ${h.quote ? `<blockquote>${esc(h.quote)}${h.quoteSrc ? `<small>${esc(h.quoteSrc.replace(/,?\s*\d{1,2}:\d\d(:\d\d)?/g, ''))}</small>` : ''}</blockquote>` : ''}
    ${video ? `<a class="btn2" href="${esc(video)}" target="_blank" rel="noopener">${T.helpVideo}</a>` : ''}
    ${inspireHtml()}
    <button class="btn" type="button" id="hback">${T.helpBack}</button></div>`;
  const close = () => { document.removeEventListener('keydown', onKey); m.remove(); opener?.focus?.({ preventScroll: true }); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('.close') || e.target.id === 'hback') close(); });
  document.body.appendChild(m); $('#hback', m).focus();
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-help]'); if (b) { e.preventDefault(); openHelp(b.dataset.help); } });

// ===== רכיבי טופס. כל שדה נושא data-k, והשמירה אוטומטית =====
const inp = (k, v, ph = '', type = 'text', extra = '') => `<input type="${type}" data-k="${k}" value="${esc(v)}" placeholder="${esc(ph)}" ${extra}>`;
const ta = (k, v, ph = T.writeHere, rows = 2) => `<textarea data-k="${k}" rows="${rows}" placeholder="${esc(ph)}">${esc(v)}</textarea>`;
const seg = (k, v, opts) => `<div class="seg" role="radiogroup" data-seg="${k}">${opts.map(([val, lab]) => `<button type="button" role="radio" aria-checked="${v === val}" class="${v === val ? 'on' : ''}" data-v="${esc(val)}">${esc(lab)}</button>`).join('')}</div>`;
const scale = (k, v, label) => `<div class="scale" role="radiogroup" aria-label="${esc(label || '')}" data-seg="${k}" data-num="1">${[0, 1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="${v === n}" class="${v === n ? 'on' : ''}" data-v="${n}">${n}</button>`).join('')}</div>`;
// בחירת שעה מרשימה, כל רבע שעה (בטלפון נפתח גלגל בחירה). ערך ישן כמו 0830 מוצג כ-8:30
const normTime = (v) => { const s = String(v || '').trim(); const m = s.match(/^(\d{1,2})[:.]?(\d{2})$/); return m && +m[1] < 24 && +m[2] < 60 ? `${+m[1]}:${m[2]}` : s; };
const TIMES = Array.from({ length: (24 - 5) * 4 }, (_, i) => { const t = 5 * 60 + i * 15; return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; });
const timeSel = (k, v, label = T.openTomorrowQ) => { const cur = normTime(v); const opts = cur && !TIMES.includes(cur) ? [cur, ...TIMES] : TIMES;
  return `<select data-k="${k}" class="tsel" aria-label="${esc(label)}"><option value="">${T.pickTime}</option>${opts.map((t) => `<option value="${t}"${t === cur ? ' selected' : ''}>${t}</option>`).join('')}</select>`; };
const hb = (fn, b) => { const k = '\u0001'; return `<span>${filled(b) ? esc(fn(k)).replace(k, `<b class="bword">${esc(String(b).trim())}</b>`) : esc(fn(b))}</span>`; }; // ההוויה שלה מודגשת בוורוד בתוך השאלה (שושי 18.11)
const card = (inner, cls = '', key = '') => `<section class="card ${cls}" ${key ? `data-req="${key}"` : ''}>${inner}</section>`;

// קישור שדות למודל. path כמו "sub_beings.2" או "habits.0.text"
function setPath(obj, path, val) {
  const ks = path.split('.'); let o = obj;
  for (let i = 0; i < ks.length - 1; i++) { const k = isNaN(ks[i]) ? ks[i] : +ks[i]; if (o[k] == null) o[k] = isNaN(ks[i + 1]) ? {} : []; o = o[k]; }
  const last = isNaN(ks.at(-1)) ? ks.at(-1) : +ks.at(-1); o[last] = val;
}
function bindForm(model, save) {
  let t;
  const later = () => { clearTimeout(t); t = setTimeout(() => save(model), 700); };
  window.onpagehide = () => { clearTimeout(t); save(model); };
  $$('[data-k]', root).forEach((el) => el.addEventListener('input', () => { setPath(model, el.dataset.k, el.value); later(); el.closest('.miss')?.classList.remove('miss'); }));
  $$('[data-seg]', root).forEach((g) => g.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const v = g.dataset.num ? +b.dataset.v : b.dataset.v;
    $$('button', g).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
    setPath(model, g.dataset.seg, v); save(model); g.closest('.miss')?.classList.remove('miss');
    g.dispatchEvent(new CustomEvent('pick', { detail: v, bubbles: true }));
  }));
  return () => { clearTimeout(t); save(model); };
}
function markMissing(list) {
  $$('.miss', root).forEach((x) => x.classList.remove('miss'));
  list.forEach((k) => $(`[data-req="${k}"]`, root)?.classList.add('miss'));
  const first = $('.miss', root); if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ===== ניתוב =====
function go(h) { if (location.hash === h) render(); else location.hash = h; }
window.addEventListener('hashchange', render);

let linkChecked = false, linkErr = false;
async function render() {
  if (!linkChecked) {
    linkChecked = true;
    const th = new URLSearchParams(location.hash.slice(1)).get('th');
    if (th && api.live) { history.replaceState(null, '', location.pathname + '#/today'); return renderTapIn(th); }
    if (/error_code=|error=/.test(location.hash + location.search)) { linkErr = true; history.replaceState(null, '', location.pathname + '#/today'); }
    else if (await api.fromLink()) { D = null; setUnlocked(true); }
  }
  const user = api.user();
  root.classList.remove('wide-root');
  if (!user) { const n = linkErr; linkErr = false; return renderLogin('email', '', n ? T.linkExpired : ''); }
  linkErr = false;
  if (!D) {
    root.innerHTML = `<main class="app"><div class="top">${logoImg()}</div></main>`;
    try { D = await api.load(); } catch (e) { root.innerHTML = `<main class="app"><p class="err">${esc(e.message)}</p><button class="btn" onclick="location.reload()">לנסות שוב</button></main>`; return; }
  }
  applyGender(P().gender);
  // קישור משיעור: ?level=being או ?level=full
  const qLevel = new URLSearchParams(location.search).get('level');
  if ((qLevel === 'being' || qLevel === 'full') && P().level !== qLevel) api.saveProfile({ level: qLevel });
  if (P().pin_hash && !isUnlocked()) return renderLock();
  if (!P().terms_at) return renderTerms();
  const [, r1, r2] = (location.hash || '#/today').split('?')[0].split('/');
  // המסך האחרון שבו היא עבדה (פתיחה, סגירה, פתק שבועי, תחקיר), כדי שמסכי הדיוק יחזירו אליו
  const work = r1 === 'open' ? 'open' : r1 === 'close' ? 'close' : r1 === 'week' && r2 === 'open' ? 'weekOpen' : r1 === 'week' && r2 === 'close' ? 'debrief' : (r1 === 'today' || !r1) && !(D.days[today()] || {}).opened_at ? 'open' : null;
  if (work) { try { sessionStorage.setItem('ls-work', JSON.stringify([location.hash || '#/today', work])); } catch {} }
  // אחרי ההתנסות הגישה נסגרת: רק מסך ההצעה והגדרות (ליציאה)
  if (offerActive() && r1 !== 'offer' && r1 !== 'settings' && r1 !== 'summary') return go('#/offer');
  // מסך קופץ פעם ביום בזמן ההתנסות: כמה ימים נשארו ואיך ממשיכים (שושי 21.11)
  if (!offerActive() && r1 !== 'summary') maybeTrialPop();
  switch (r1) {
    case 'week': return r2 === 'open' ? renderWeekOpen() : r2 === 'close' ? renderWeekClose() : renderWeek();
    case 'progress': return renderProgress();
    case 'collection': return renderCollection(T.collectionFilters[r2] ? r2 : 'all');
    case 'base': return r2 ? renderBasePart(r2) : renderBase();
    case 'note': return renderNote(r2 || today());
    case 'sticker': return renderSticker(r2 || today());
    case 'close': return renderClose(r2 || today());
    case 'open': return renderOpen(r2 || today());
    case 'refine': return renderRefine(r2 || 'open');
    case 'settings': return r2 === 'pin' ? renderPinSet() : renderSettings();
    case 'feedback': return renderFeedback();
    case 'reflect': return WFB_ON ? renderWeeklyFb() : go('#/today');
    case 'offer': return renderOffer();
    case 'summary': return renderSummary();
    case 'admin': return P().is_admin ? renderAdmin({ root, api, T, esc, shell, toast, CONFIG, mdLite }) : go('#/today');
    default: return renderToday();
  }
}

// ===== קוד נעילה (רשות). נשמר כגיבוב בפרופיל, ולכן חל בטלפון, במחשב ובכל מכשיר =====
const pinHash = async (pin) => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode((api.user() || {}).id + ':' + pin)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); };
const isUnlocked = () => { try { return sessionStorage.getItem('ls-unlocked') === '1'; } catch { return true; } };
const setUnlocked = (v) => { try { if (v) sessionStorage.setItem('ls-unlocked', '1'); else sessionStorage.removeItem('ls-unlocked'); } catch {} };
function renderLock() {
  root.innerHTML = `<main class="app"><div class="login">${logoImg()}${hd(T.loginSub, T.lockTitle)}
    <form id="f" class="card" novalidate><label class="q" for="pin">${T.lockHint}</label>
      <input id="pin" class="code" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="6" dir="ltr">
      <p class="err" id="er" role="alert" hidden></p><button class="btn" type="submit">${T.enter}</button>
      <button class="lnk" type="button" id="forgot">${T.lockForgot}</button></form></div></main>`;
  setTimeout(() => $('#pin')?.focus(), 50);
  $('#f').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await pinHash($('#pin').value.trim()) === P().pin_hash) { setUnlocked(true); render(); }
    else { const er = $('#er'); er.textContent = T.lockWrong; er.hidden = false; $('#pin').value = ''; $('#pin').focus(); }
  });
  $('#forgot').addEventListener('click', async () => { if (!confirm(T.lockForgotHint)) return; await api.logout(); setUnlocked(false); D = null; go('#/'); });
}
// הגדרת קוד: פעמיים, לאישור
function renderPinSet(step = 1, first = '') {
  shell(`${hd('', T.pinTitle, 'settings')}
    <form id="pf" class="card" novalidate><label class="q" for="np">${step === 1 ? T.pinNew : T.pinAgain}</label>
      <input id="np" class="code" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="6" dir="ltr">
      <p class="err" id="er" role="alert" hidden></p><button class="btn" type="submit">${T.pinNext}</button></form>
    <a class="btn2" href="#/settings">${T.back}</a>`, '');
  setTimeout(() => $('#np')?.focus(), 50);
  $('#pf').addEventListener('submit', async (e) => {
    e.preventDefault(); const v = $('#np').value.trim(); const er = $('#er');
    if (!/^\d{4,6}$/.test(v)) { er.textContent = T.pinDigits; er.hidden = false; return; }
    if (step === 1) return renderPinSet(2, v);
    if (v !== first) { toast(T.pinMismatch); return renderPinSet(1); }
    api.saveProfile({ pin_hash: await pinHash(v) }); setUnlocked(true); toast(T.pinSaved); go('#/settings');
  });
}
// חוזרים לאפליקציה אחרי זמן: נועלים שוב (אם יש קוד), וטוענים מחדש את מה שנשמר במכשיר אחר
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); try { window.onpagehide && window.onpagehide(); } catch {} return; }
  if (!hiddenAt || !api.user()) return;
  const away = Date.now() - hiddenAt; hiddenAt = 0;
  if (away > 3 * 60e3 && D && P().pin_hash) setUnlocked(false);
  if (away > 30e3) { D = null; render(); }
  else if (D && P().pin_hash && !isUnlocked()) render();
});

// ===== כניסה =====
// מסך ״לחצי כדי להיכנס״ אחרי הכפתור במייל
function renderTapIn(th) {
  root.innerHTML = `<main class="app"><div class="login">${logoImg()}${hd(T.loginSub, T.tapInTitle)}
    <div class="card"><p class="hint">${T.tapInHint}</p><p class="err" id="er" role="alert" hidden></p>
    <button class="btn" type="button" id="tapin">${T.tapInBtn}</button></div></div></main>`;
  $('#tapin').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try { await api.verifyHash(th); D = null; setUnlocked(true); render(); }
    catch { renderLogin('email', '', T.linkExpired); }
  });
}
function renderLogin(step = 'email', email = '', note = '') {
  root.innerHTML = `<main class="app"><div class="login">
    ${logoImg()}
    ${hd(T.loginSub, T.loginTitle)}
    ${api.live ? '' : `<div class="banner demo">${T.demoBanner}</div>`}
    ${note ? `<div class="banner" role="alert">${note}</div>` : ''}
    <form id="f" class="card" novalidate>
      ${step === 'email'
        ? `<label class="q" for="em">${T.emailLabel}</label><input id="em" type="email" inputmode="email" autocomplete="email" dir="ltr" value="${esc(email)}" required>
           <p class="err" id="er" role="alert" hidden></p><button class="btn" type="submit">${T.sendCode}</button>`
        : `<p class="hint">${T.codeSent}</p><label class="q" for="cd">${T.codeLabel}</label>
           <input id="cd" class="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" ${api.live ? '' : 'placeholder="כל קוד בהדגמה"'}>
           <p class="err" id="er" role="alert" hidden></p><button class="btn" type="submit">${T.enter}</button>
           <button class="lnk" type="button" id="back">${T.otherEmail}</button>`}
    </form>
    <p class="fine">${T.rememberNote}</p></div></main>`;
  const f = $('#f'), er = $('#er');
  $('#back')?.addEventListener('click', () => renderLogin('email', email));
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); er.hidden = true; const b = $('button[type=submit]', f); b.disabled = true;
    try {
      if (step === 'email') {
        const em = $('#em').value.trim(); if (!/^\S+@\S+\.\S+$/.test(em)) throw new Error(T.badEmail);
        await api.sendCode(em); renderLogin('code', em); setTimeout(() => $('#cd')?.focus(), 50);
      } else {
        await api.verify(email, $('#cd').value || '000000'); D = null; setUnlocked(true); go('#/today');
      }
    } catch (x) { er.textContent = step === 'code' ? T.badCode : x.code === 'not_invited' ? T.notInvited : x.message === T.badEmail ? T.badEmail : T.genericError; er.hidden = false; b.disabled = false; }
  });
}

// ===== תקנון ופרטיות (פעם אחת) =====
function renderTerms() {
  const m = { full_name: P().full_name || '', share: null, kind: P().self_kind || (P().kind !== 'other' ? P().kind : null), level: levelOf() };
  root.innerHTML = `<main class="app"><div class="login">${logoImg()}${hd('', T.termsTitle)}
    <section class="card">
      <ul class="lstx">${T.termsLines.map((l) => `<li class="it" style="margin-bottom:8px">${l}</li>`).join('')}</ul>
      <label class="q" for="nm">${T.nameLabel}</label><input id="nm" type="text" autocomplete="name" value="${esc(m.full_name)}">
      <p class="q">${T.kindQ}</p>${seg('kind', m.kind, Object.entries(T.kinds))}
      <p class="q">${T.levelQ}</p>${seg('level', m.level, [['being', T.levelBeing], ['full', T.levelFull]])}
      <p class="hint" id="lvh">${m.level === 'full' ? T.levelFullSub : T.levelBeingSub}</p>
      <p class="q">${T.shareQ}</p>${seg('share', null, [['yes', T.shareYes], ['no', T.shareNo]])}
      <p class="hint">${T.shareNote}</p>
      <label class="agree"><input type="checkbox" id="ag"> ${T.termsAgree}</label>
      ${CONFIG.TERMS_LINK ? `<a href="${esc(CONFIG.TERMS_LINK)}" target="_blank" rel="noopener">${T.termsLink}</a>` : ''}
      <p class="err" id="er" role="alert" hidden></p>
      <button class="btn" id="go">${T.enter}</button>
    </section></div></main>`;
  bindForm(m, () => {});
  $('[data-seg="level"]').addEventListener('pick', (e) => { $('#lvh').textContent = e.detail === 'full' ? T.levelFullSub : T.levelBeingSub; });
  $('#go').addEventListener('click', () => {
    const er = $('#er');
    if (!$('#ag').checked) { er.textContent = T.mustAgree; er.hidden = false; return; }
    api.saveProfile({ full_name: $('#nm').value.trim(), share_journal: m.share === 'yes', self_kind: m.kind || null, level: m.level || 'being', terms_at: new Date().toISOString() });
    go(m.level === 'full' ? '#/base' : '#/today');
  });
}

// ===== פסים בראש ״היום״ =====
// סוף ההתנסות: 7 ימים מההרשמה ולא אחרי 27.11 14:00 (trial_ends_at מהשרת). השרת גם חוסם שמירה וקריאה אחרי הזמן הזה
function trialEndsMs() { const p = P(); if (p.member || p.is_admin) return null; if (p.trial_ends_at) return Date.parse(p.trial_ends_at); return p.trial_end ? Date.parse(p.trial_end + 'T23:59:59') : null; }
// ימים שנשארו לפי תאריך (כולל היום). ההתנסות נגמרת בסוף היום השביעי, אז היום הראשון הוא בונוס ולא נספר מעבר ל-7
function trialLeft() { const e = trialEndsMs(); if (e === null) return null; if (Date.now() >= e) return 0; return Math.min(7, daysBetween(today(), iso(new Date(e - 1000))) + 1); }
function offerActive() { const e = trialEndsMs(); return e !== null && Date.now() >= e; }
function banners() {
  const out = []; const t = today();
  // משוב שבועי (20.11): משוב חדש שלא נקרא, ושאלת ההסכמה למי שלא שיתפה יומן
  if (WFB().some((f) => !f.seen_at)) out.push(`<a class="banner soft" href="#/reflect" style="display:block;text-decoration:none;color:inherit"><b>${T.fbBanner}</b></a>`);
  const left = trialLeft();
  if (left && left > 0) out.push(`<div class="banner soft">${T.trialBanner(left)}</div>`);
  // שאלת משוב ביום 5 או 6 של ההתנסות
  const st = api.feedbackState();
  if (P().trial_start && left !== null && left > 0 && daysBetween(P().trial_start, t) >= 4 && st !== 'sent' && st !== 'later:' + t)
    out.push(`<div class="banner soft"><b>${T.feedbackTitle}</b><a class="lnk" href="#/feedback">${T.feedbackOpen}</a></div>`);
  const y = addDays(t, -1); const yd = D.days[y];
  if (yd && yd.opened_at && !yd.closed_at && canStillClose(y)) { const yn = T.dayNames[parse(y).getDay()];
    out.push(`<div class="banner">${T.closeYesterday(yn)} <a class="lnk" href="#/close/${y}">${T.closeYesterdayCta(yn)}</a></div>`); }
  if (hasAchievement() && F().achievement_date && F().achievement_date < t) out.push(`<div class="banner">${T.achievementPassedBanner} <a class="lnk" href="#/base/achievement">${T.achievementPassedCta}</a></div>`);
  if (levelOf() === 'being') { if (hasBase()) out.push(`<div class="banner soft">${T.levelUpBanner} <a class="lnk" href="#/settings">${T.levelUpCta}</a></div>`); }
  else if (!hasBase()) out.push(`<div class="banner"><b>${T.baseTitle}</b>${T.needBaseBanner} <a class="lnk" href="#/base">${T.baseGo}</a></div>`);
  else {
    const w = D.weeks[weekStart(t)];
    if (!w || !w.opened_at) out.push(`<div class="banner soft">${T.weekNoteReminder} <a class="lnk" href="#/week/open">${T.weekNoteCta}</a></div>`);
  }
  return out.join('');
}

// ===== היום =====
// ===== משוב שבועי (שושי 20.11) =====
// נכתב במוצאי שבת לכל מי שסגרה לפחות שני ימים, אלא אם כיבתה. שיתפה יומן: שושי רואה. לא שיתפה: רק היא, ויכולה לאשר לשושי סיכום מסוים (21.11).
// שושי 21.11: ״המשוב השבועי כרגע מיותר״. כבוי עד שתחליט. הדלקה: WFB_ON = true
const WFB_ON = false;
const WFB = () => (WFB_ON && D && D.wfb) || [];
const fbActive = () => P().weekly_fb !== 'off';
// עיצוב קל לטקסט המשוב: ## כותרת, - נקודה, **מודגש**, *נטוי*. הכל עובר esc קודם.
function mdLite(src) {
  const inl = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
  const out = []; let para = []; let list = []; let ord = false;
  const endPara = () => { if (para.length) out.push(`<p>${para.map(inl).join('<br>')}</p>`); para = []; };
  const endList = () => { if (list.length) out.push(`<${ord ? 'ol' : 'ul'}>${list.map((x) => `<li>${inl(x)}</li>`).join('')}</${ord ? 'ol' : 'ul'}>`); list = []; };
  String(src || '').split('\n').forEach((raw) => { const l = raw.trim();
    if (!l) { endPara(); endList(); return; }
    if (/^#{1,3} /.test(l)) { endPara(); endList(); out.push(`<h3>${inl(l.replace(/^#+ /, ''))}</h3>`); return; }
    if (/^[-•] /.test(l)) { endPara(); if (ord) endList(); ord = false; list.push(l.slice(2)); return; }
    if (/^\d+\. /.test(l)) { endPara(); if (!ord) endList(); ord = true; list.push(l.replace(/^\d+\. /, '')); return; }
    endList(); para.push(l); });
  endPara(); endList();
  return out.join('');
}
const dm = (s) => { const d = parse(s); return `${d.getDate()}.${d.getMonth() + 1}`; };
function renderWeeklyFb() {
  const list = WFB();
  let body = `${hd('', T.fbTitle, 'week')}<p class="hint">${T.fbSub}</p>`;
  if (!list.length) body += card(`<p class="it">${esc(fbActive() ? T.fbEmpty : T.fbEmptyOff)}</p>`);
  const priv = (f) => P().share_journal ? `<p class="hint">${T.fbPrivShared}</p>`
    : f.shared ? `<p class="hint">${T.fbSharedNow}</p>`
    : `<p class="hint">${T.fbPrivOnly}</p><button type="button" class="btn2" data-fbshare="${esc(f.week_start)}">${T.fbShareBtn}</button>`;
  list.forEach((f) => { body += card(`<div class="ct">${esc(T.fbWeekOf(dm(f.week_start), dm(addDays(f.week_start, 6))))}</div><div class="fbbody">${mdLite(f.body)}</div>${priv(f)}`); });
  shell(body, 'week');
  list.forEach((f) => api.seenWeeklyFb(f.week_start));
}
root.addEventListener('click', (e) => { const b = e.target.closest('[data-fbshare]'); if (!b) return; api.shareWeeklyFb(b.dataset.fbshare); toast(T.saved); renderWeeklyFb(); });

function renderToday() {
  const t = today(); const d = D.days[t] || {};
  if (!d.opened_at) return renderOpen(t, true);
  if (!d.closed_at) {
    shell(`${banners()}${hd(dayLabel(t), T.dayOpenedTitle, 'open')}
      ${card(`<p class="ach">${esc(T.noteToday)} ${esc(d.being)}.</p>
        ${(d.sub_beings || []).filter(Boolean).length ? `<p class="hint">${esc(d.sub_beings.filter(Boolean).join(' · '))}</p>` : ''}
        ${filled(d.why_today) ? `<p class="it">${esc(d.why_today)}</p>` : ''}
        ${filled(d.key_action) ? `<p class="q">${fullMode() ? T.keyAction : T.keyActionSmall}</p><p class="it">${esc([d.key_action, d.key_amount, d.key_when].filter(Boolean).join(' · '))}</p>` : ''}
        ${d.win_belief ? `<p class="hint" style="margin-top:8px">״${esc(d.win_belief)}״</p>` : ''}`)}
      <p class="hint">${filled(d.close_plan) ? T.closeAt(normTime(d.close_plan)) : T.dayOpenedSub}</p>
      <a class="btn" href="#/close/${t}">${T.toClose}</a>
      <div class="btnrow"><a class="btn2" href="#/note/${t}">${T.toMorningNote}</a><a class="btn2" href="#/open/${t}">${T.editOpening}</a></div>`, 'today');
    return;
  }
  shell(`${banners()}${hd(dayLabel(t), T.dayClosedTitle, 'close')}
    ${filled(d.hug_find) || filled(d.strength_find) ? card(`${filled(d.hug_find) ? `<p class="q">${T.giftHugHead}</p><p class="ins">${esc(d.hug_find)}</p>` : ''}${filled(d.strength_find) ? `<p class="q">${T.giftStrHead}</p><p class="ins">${esc(d.strength_find)}</p>` : ''}`) : filled(d.insight) ? card(`<p class="q">${T.insightQ}</p><p class="ins">${esc(d.insight)}</p>`) : filled(d.day_how) ? card(`<p class="q">${T.helloQ}</p><p class="ins">${esc(d.day_how)}</p>`) : ''}
    ${filled(d.hug_find) || filled(d.strength_find) || filled(d.insight) ? `<a class="btn" href="#/sticker/${t}">${filled(d.hug_find) || filled(d.strength_find) ? T.toGifts : T.toSticker}</a>` : ''}
    <div class="btnrow"><a class="btn2" href="#/close/${t}">${T.editClosing}</a><a class="btn2" href="#/progress">${T.tabs.progress}</a></div>
    ${card(`<p class="it" style="text-align:center">${T.dayClosedQuote}<small style="color:inherit;font-weight:400">${T.dayClosedQuoteBy}</small></p>`, 'flat')}`, 'today');
}

// ===== פתיחת יום =====
// כפתורי הוויות: כל הרשימה מהיומן, ובסוף הוויות שהיא כתבה בעצמה
const allBeings = () => [...new Set([...T.beingsAll, ...((D.settings || {}).shared_beings || []).map((b) => (T.beingsMasc || {})[b] || b), ...(P().beings || [])].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he')); // לפי א-ב (שושי 15.11, תוקן 17.11). כולל כל הוויה ששושי הוסיפה (settings.shared_beings, 16.11)
const beingChips = (id, isOn) => `<div class="chips bgrid" id="${id}">${allBeings().map((b) => `<button type="button" aria-pressed="${isOn(b)}" class="${isOn(b) ? 'on' : ''}" data-b="${esc(b)}">${esc(b)}</button>`).join('')}</div>`;
function renderOpen(day, isToday = false) {
  const prev = Object.keys(D.days).filter((k) => k < day && D.days[k].being).sort().pop();
  const pd = prev ? D.days[prev] : {};
  const m = { being: '', sub_beings: ['', '', '', ''], steps: [{}, {}, {}], ...(D.days[day] || {}) };
  if (!m.sub_beings || m.sub_beings.length < 4) m.sub_beings = [...(m.sub_beings || []), '', '', '', ''].slice(0, 4);
  m.steps = [0, 1, 2].map((i) => ({ ...((m.steps || [])[i] || {}) }));
  const base = fullMode();
  let openMain = !m.being, openSub = false;
  const draw = () => {
    const ach = hasAchievement() ? card(`<div class="ct">${T.achievementTop} ${helpBtn('achievement')}</div><p class="ach">${esc(F().achievement)}</p>${F().achievement_date ? `<p class="hint">${esc(T.achievementDate)}: ${esc(shortDate(F().achievement_date))}</p>` : ''}`, 'flat') : '';
    shell(`${isToday ? banners() : ''}${hd(dayLabel(day), isToday || day === today() ? T.goodMorning(firstName()) : T.openDayTitle, 'open')}
    ${card(`<small class="over">${T.beingSub}</small><div class="ct">${T.beingTitle} ${tag(1)} ${helpBtn('being')}</div>
      ${openMain ? `<p class="hint">${T.beingsPickHint}</p>${beingChips('bmain', (b) => b === m.being)}${inp('being', m.being, T.beingPlaceholder)}`
        : `<div class="chips"><button type="button" class="on" disabled>${esc(m.being)}</button><button type="button" class="more" id="chg">${T.beingsChange}</button></div>`}`, '', 'being')}
    ${card(`<div class="ct"><span id="bm">${hb(T.beingMeaning, m.being)}</span> ${tag(1)} ${helpBtn('sub_beings')}</div><p class="hint">${T.subBeingsHint}</p>
      ${pd.sub_beings && pd.being === m.being && !m.sub_beings.some(Boolean) ? `<button type="button" class="more" id="lastsub">${T.useLastSub}</button>` : ''}
      <div class="row2">${[0, 1, 2, 3].map((i) => inp('sub_beings.' + i, m.sub_beings[i], T.subBeingPh(i + 1))).join('')}</div>
      <button type="button" class="more" id="subtog" aria-expanded="${openSub}">${openSub ? T.beingsHide : T.beingsShowAll}</button>
      ${openSub ? beingChips('bsub', (b) => m.sub_beings.includes(b)) : ''}`, '', 'sub')}
    ${card(`<div class="ct"><span id="bw">${hb(T.whyTodayQ, m.being)}</span> ${tag(1)} ${helpBtn('why_today')}</div><p class="hint">${T.whyTodayHint}</p>
      ${inp('why_today', m.why_today, T.whyTodayPh)}`, '', 'why')}
    ${card(`<div class="ct">${T.beingSign} ${tag(1)} ${helpBtn('being_sign')}</div><p class="hint">${T.beingSignHint}</p>
      ${ta('being_sign', m.being_sign, T.writeHere, 2)}
      <details class="qs"><summary>${T.beingSignExamplesTitle}</summary><ul>${T.beingSignExamples.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`, '', 'sign')}
    ${card(`<div class="ct"><span id="bwh">${hb(T.whereNeeded, m.being)}</span> ${tag(0)}</div><p class="hint">${T.whereNeededHint}</p>${ta('where_needed', m.where_needed, T.writeHere, 2)}`)}
    ${base ? ach : ''}
    ${base ? card(`<div class="ct">${T.keyActionToday} ${tag(1)} ${helpBtn('key_action')}</div><p class="hint">${T.keyActionHint}</p>
      ${ta('key_action', m.key_action, T.keyActionPh, 2)}
      <div class="row2" style="margin-top:8px">${inp('key_amount', m.key_amount, T.keyAmount)}${inp('key_when', m.key_when, T.keyWhen)}</div>`, '', 'key') : ''}
    ${base ? card(`<div class="ct">${T.stepsTitle} ${tag(0)} ${helpBtn('steps')}</div><p class="hint">${T.stepsHint}</p>
      <div class="steps">${[0, 1, 2].map((i) => `<div class="stp"><b aria-hidden="true">${i + 1}</b>${inp(`steps.${i}.text`, m.steps[i].text, T.stepPh(i + 1))}</div>`).join('')}</div>`) : ''}
    ${card(`<div class="ct"><span id="bmd">${hb(T.mayDerail, m.being)}</span> ${tag(1)} ${helpBtn('may_derail')}</div><p class="hint">${T.mayDerailHint}</p>${ta('may_derail', m.may_derail, T.mayDerailPh, 2)}`, '', 'derail')}
    ${card(`<div class="ct">${T.recover} ${tag(1)}</div><p class="hint">${T.recoverHint}</p>${ta('recover', m.recover, T.writeHere, 2)}
      ${helpsBank(day)}`, '', 'recover')}
    ${card(`<div class="ct"><img class="ct-ico" src="img/icons/future.png" width="34" height="34" alt="" aria-hidden="true">${T.convTitle} ${tag(0)} ${helpBtn('future_talk')}</div>
      <p class="q">${T.convPickQ}</p>${seg('voice', m.voice || 'future', Object.entries(T.convPick))}
      <p class="guide" id="cg">${m.voice === 'god' ? T.convGuideGod : T.convGuideFuture}</p>
      <p class="q" id="cf">${m.voice === 'god' ? T.convFieldGod : T.convFieldFuture}</p><p class="hint">${T.convHint} ${T.convNoteHint}</p>
      ${ta('win_belief', m.win_belief, T.writeHere, 5)}`, 'conv')}
    ${card(`<div class="ct">${T.closePlanQ} ${tag(1)}</div><p class="hint">${T.closePlanHint}</p>${timeSel('close_plan', m.close_plan, T.closePlanQ)}`, '', 'closeplan')}
    <p class="err" id="er" role="alert" hidden></p>
    <button class="btn" id="done">${m.opened_at ? T.saveBase : T.openedDay}</button>
    <a class="btn2" href="#/refine/open">${T.howToRefine}</a>`, isToday ? 'today' : '');
    wire();
  };
  const save = (x) => api.saveDay(day, { being: x.being, sub_beings: x.sub_beings, key_action: x.key_action, key_amount: x.key_amount, key_when: x.key_when, steps: x.steps.some((st) => filled(st.text)) ? x.steps : [], being_sign: x.being_sign, why_today: x.why_today, where_needed: x.where_needed, may_derail: x.may_derail, recover: x.recover, win_belief: x.win_belief, close_plan: x.close_plan, voice: x.voice || 'future' });
  const wire = () => {
    const flushNow = bindForm(m, save);
    const beingInput = $('[data-k="being"]');
    beingInput?.addEventListener('input', () => { $('#bm').innerHTML = hb(T.beingMeaning, m.being); $('#bw').innerHTML = hb(T.whyTodayQ, m.being); $('#bwh').innerHTML = hb(T.whereNeeded, m.being); $('#bmd').innerHTML = hb(T.mayDerail, m.being); $$('#bmain button').forEach((b) => { b.classList.toggle('on', b.dataset.b === m.being); b.setAttribute('aria-pressed', b.dataset.b === m.being); }); });
    $('#bmain')?.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; flushNow(); m.being = b.dataset.b; openMain = false; save(m); draw(); $('[data-req="sub"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    $('#chg')?.addEventListener('click', () => { flushNow(); openMain = true; draw(); $('[data-req="being"]')?.scrollIntoView({ block: 'center' }); });
    $('#subtog').addEventListener('click', () => { flushNow(); openSub = !openSub; draw(); $('#subtog')?.focus({ preventScroll: true }); });
    $('#bsub')?.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return; flushNow();
      const v = b.dataset.b; const at = m.sub_beings.indexOf(v);
      if (at >= 0) m.sub_beings[at] = '';
      else { const free = m.sub_beings.findIndex((x) => !filled(x)); if (free < 0) return toast(T.subBeingsFull); m.sub_beings[free] = v; }
      const y = window.scrollY, ry = root.scrollTop; save(m); draw(); window.scrollTo(0, y); root.scrollTop = ry;
    });
    $('#lastsub')?.addEventListener('click', () => { m.sub_beings = [...pd.sub_beings]; save(m); draw(); });
    $('[data-seg="voice"]').addEventListener('pick', (e) => { const g = e.detail === 'god'; $('#cg').textContent = g ? T.convGuideGod : T.convGuideFuture; $('#cf').textContent = g ? T.convFieldGod : T.convFieldFuture; });
    $('#done').addEventListener('click', () => {
      flushNow();
      const miss = [];
      if (base && !filled(m.key_action)) miss.push('key');
      if (!filled(m.being)) miss.push('being');
      if (m.sub_beings.filter(filled).length < 4) miss.push('sub');
      if (!filled(m.why_today)) miss.push('why'); // חובה, שורה אחת (שושי 18.11)
      if (!filled(m.being_sign)) miss.push('sign'); // הסימן חובה (שושי 18.11)
      if (!filled(m.may_derail)) miss.push('derail'); // חובה (שושי 18.11)
      if (!filled(m.recover)) miss.push('recover');
      if (!filled(m.close_plan)) miss.push('closeplan'); // נכנס לעמידה במילה
      if (miss.length) { const er = $('#er'); er.textContent = T.missingRequired + ' ' + miss.map((k) => T.reqNames[k]).join(', '); er.hidden = false; return markMissing(miss); }
      const first = !D.days[day].opened_at;
      api.saveDay(day, { opened_at: D.days[day].opened_at || new Date().toISOString() });
      // הוויה שכתבה בעצמה נשמרת אצלה, כדי שתופיע ככפתור בפעם הבאה
      const own = [m.being, ...m.sub_beings].filter((b) => filled(b) && !T.beingsAll.includes(b.trim())).map((b) => b.trim());
      const bs = [...new Set([...own, ...(P().beings || [])])].slice(0, 12);
      if (JSON.stringify(bs) !== JSON.stringify(P().beings || [])) api.saveProfile({ beings: bs });
      go(first ? '#/note/' + day : '#/today');
    });
  };
  draw();
}

// ===== סגירת יום =====
function renderClose(day) {
  const d = D.days[day] || {};
  if (!d.opened_at) { toast(T.openFirst); return go('#/open/' + day); }
  if (!d.closed_at && !canStillClose(day)) { toast(T.closeTooLate); return go('#/today'); }
  if (!d.closed_at && (!d.close_started_at || Date.now() - Date.parse(d.close_started_at) > 3 * 3600e3)) api.saveDay(day, { close_started_at: new Date().toISOString() }); // מודדים מהכניסה הראשונה בישיבה
  const subs = (d.sub_beings || []).map((s) => s || '');
  const m = { sub_presence: [], ...d, deep: { ...(d.deep || {}) }, steps: (d.steps || []).map((x) => ({ ...x })) };
  m.sub_presence = [0, 1, 2, 3].map((i) => (d.sub_presence || [])[i] ?? null);
  const steps = m.steps.map((x, i) => [x, i]).filter(([x]) => filled(x.text));
  const deepCount = Object.values(m.deep).filter(filled).length;
  const full = fullMode(); // ההתבוננות העמוקה ושאלות הפעולה רק ביומן המלא (שושי 12.11)
  shell(`${hd(dayLabel(day) + ' · ' + T.closeDayLabel, T.goodEvening(firstName()), 'close')}
    ${card(`<div class="ct">${T.helloQ} ${tag(1)}</div><p class="hint">${T.helloHint}</p>${ta('day_how', m.day_how, T.writeHere, 2)}`, '', 'hello')}
    ${card(`<div class="ct">${hb(T.presenceQ2, d.being)} ${tag(1)} ${helpBtn('presence')}</div>${scale('presence', m.presence, T.presenceQ2(d.being))}`, '', 'presence')}
    ${subs.some(Boolean) ? card(`<div class="ct">${T.subPresenceQ2} ${tag(1)}</div>
      ${subs.map((s, i) => s ? `<div class="rt"><span>${esc(s)}</span>${scale('sub_presence.' + i, m.sub_presence[i], s)}</div>` : '').join('')}`, '', 'subp') : ''}
    ${card(`<div class="ct">${hb(T.foundQ, d.being)} ${tag(1)}</div>${ta('being_found', m.being_found, T.foundPh, 2)}`, '', 'found')}
    ${card(`<div class="ct"><span><img class="ct-ico" src="img/icons/reflect.png" width="34" height="34" alt="" aria-hidden="true">${T.out2Title}</span> ${tag(1)} ${helpBtn('out')}</div>
      <p class="q">${T.out2SitQ}</p>${ta('out_situation', m.out_situation, T.outSitPh, 2)}
      <p class="q">${T.out2InnerQ}</p>${ta('out_inner', m.out_inner, T.outInnerPh, 2)}
      <p class="q">${T.out2ThoughtQ}</p>${ta('out_thought', m.out_thought, T.outThoughtPh, 2)}
      <p class="q">${T.out2BackQ}</p>${ta('back_help', m.back_help, T.backHelpPh, 2)}`, 'outc', 'out')}
    ${filled(d.being_sign) ? card(`<div class="ct">${hb(T.signCloseQ2, d.being)} ${tag(1)}</div><p class="it">${esc(d.being_sign)}</p>
      <p class="q">${T.signMarkQ}</p>${seg('sign_status', m.sign_status, Object.entries(T.signStatus2))}`, '', 'signc') : ''}
    ${full && (filled(d.key_action) || steps.length) ? `<p class="sech">${T.actTitle}</p>` : ''}
    ${full && filled(d.key_action) ? card(`<div class="ct">${T.actKeyTitle} ${tag(1)}</div>
      <p class="it">${esc([d.key_action, d.key_amount].filter(Boolean).join(' · '))}</p>
      <p class="q">${T.actKeyMark}</p>${seg('key_status', m.key_status, Object.entries(T.actKeyStatus))}
      <div id="kof"${m.key_status === 'partial' ? '' : ' hidden'}><p class="q">${T.actKeyOfQ}</p>${inp('key_of', m.key_of, T.keyOfPh)}</div>
      <p class="q">${T.actKeyReflectQ} ${tag(0)}</p>${ta('key_reflect', m.key_reflect, T.writeHere, 2)}`, '', 'keys') : ''}
    ${full && steps.length ? card(`<div class="ct">${T.actStepsQ} ${tag(0)}</div>
      ${steps.map(([x, i]) => `<p class="q">${esc(x.text)}</p>${seg(`steps.${i}.status`, x.status, Object.entries(T.actStepStatus))}`).join('')}
      <p class="q">${T.stepsReflectQ}</p>${ta('steps_reflect', m.steps_reflect, T.writeHere, 2)}`) : ''}
    ${full ? `<details class="card deepbox"${T.deep2.some((g) => g.qs.some(([k]) => filled(m.deep[k]))) ? ' open' : ''}><summary><span><img class="ct-ico" src="img/icons/channels.png" width="34" height="34" alt="" aria-hidden="true">${T.deep2Btn}<small class="dsub">${T.deep2BtnSub}</small></span></summary>
      <p class="hint">${T.deep2Intro} ${helpBtn('deep')}</p>
      ${T.deep2.map((g) => { const has = g.qs.some(([k]) => filled(m.deep[k])); return `${g.before ? `<p class="q dhead">${g.before}</p>` : ''}<details class="card chcard"${has ? ' open' : ''}><summary>${esc(g.h)}</summary>
        ${g.sub ? `<p class="hint">${esc(g.sub)}</p>` : ''}
        ${g.qs.map(([k, q, h]) => `${q && k !== 'g0' ? `<p class="q">${esc(q)}</p>` : ''}${h ? `<p class="hint">${esc(h)}</p>` : ''}${ta('deep.' + k, m.deep[k], T.writeHere, 2)}`).join('')}</details>`; }).join('')}
    </details>` : ''}
    <p class="sech">${T.thanksHead}</p>
    ${card(`<div class="ct">${T.thanksQ2} ${tag(0)}</div><p class="hint">${T.thanksHint2}</p>${ta('thanks', m.thanks, T.writeHere, 2)}`)}
    ${card(`<div class="ct">${T.openTomorrowQ2} ${tag(1)}</div>${timeSel('open_tomorrow', m.open_tomorrow, T.openTomorrowQ2)}`, '', 'tomorrow')}
    <p class="sech">${T.giftsTitle} ${tag(0)}</p>
    ${card(`<p class="hint">${T.giftsHint}</p>
      <p class="q">${T.hugQ} ${helpBtn('hug_find')}</p>${ta('hug_find', m.hug_find, T.writeHere, 2)}
      <p class="q">${T.strengthQ} ${helpBtn('strength_find')}</p>${ta('strength_find', m.strength_find, T.writeHere, 2)}`)}
    <p class="err" id="er" role="alert" hidden></p>
    <button class="btn" id="done">${d.closed_at ? T.saveBase : T.closedDay}</button>
    <a class="btn2" href="#/refine/close">${T.howToRefineClose}</a>`, day === today() ? 'today' : '');
  const save = (x) => api.saveDay(day, { presence: x.presence, sub_presence: x.sub_presence, key_status: x.key_status, key_of: x.key_of, key_reflect: x.key_reflect, steps: x.steps, steps_reflect: x.steps_reflect, day_how: x.day_how, sign_status: x.sign_status || null, insight: x.insight, gap_moment: x.gap_moment, out_situation: x.out_situation, out_inner: x.out_inner, out_thought: x.out_thought, back_help: x.back_help, thanks: x.thanks, extra_close: x.extra_close, open_tomorrow: x.open_tomorrow, deep: x.deep, being_found: x.being_found, hug_find: x.hug_find, strength_find: x.strength_find });
  const flushNow = bindForm(m, save);
  $('[data-seg="key_status"]')?.addEventListener('pick', (e) => { const k = $('#kof'); if (k) k.hidden = e.detail !== 'partial'; }); // ״כמה מתוך״ רק אחרי ״חלקית״
  $('#done').addEventListener('click', () => {
    flushNow();
    const miss = [];
    if (!filled(m.day_how)) miss.push('hello');
    if (m.presence == null) miss.push('presence');
    if (subs.some((s, i) => s && m.sub_presence[i] == null)) miss.push('subp');
    if (full && filled(d.key_action) && !m.key_status) miss.push('keys');
    if (!filled(m.being_found)) miss.push('found');
    if (m.presence !== 5 && !(filled(m.out_situation) && filled(m.out_inner) && filled(m.out_thought))) miss.push('out');
    if (filled(d.being_sign) && !m.sign_status) miss.push('signc');
    if (!filled(m.open_tomorrow)) miss.push('tomorrow');
    if (miss.length) { const er = $('#er'); er.textContent = T.missingRequired + ' ' + miss.map((k) => T.reqNames[k]).join(', '); er.hidden = false; return markMissing(miss); }
    const first = !D.days[day].closed_at;
    api.saveDay(day, { closed_at: D.days[day].closed_at || new Date().toISOString() });
    celebrate('close', T.dayClosedToast);
    go(first && (filled(m.hug_find) || filled(m.strength_find)) ? '#/sticker/' + day : '#/today');
  });
}

// ===== בחירת צבע רקע לפתקים. נשמר במכשיר =====
const BGS = [['cream', 'קרם', '#F2EEE3'], ['pink', 'ורוד', '#DF1767'], ['navy', 'כחול', '#0D122C'], ['plum', 'סגול', '#A62F7D']];
const getBg = (k, def) => { try { return localStorage.getItem('ls-bg-' + k) || def; } catch { return def; } };
const setBg = (k, v) => { try { localStorage.setItem('ls-bg-' + k, v); } catch {} };
const bgPicker = (cur) => `<div class="bgs" role="radiogroup" aria-label="${T.bgPick}"><span>${T.bgPick}</span>${BGS.map(([v, l, c]) => `<button type="button" role="radio" aria-checked="${v === cur}" class="${v === cur ? 'on' : ''}" data-bg="${v}" style="--c:${c}"><i aria-hidden="true"></i><b>${l}</b></button>`).join('')}</div>`;
function wireBg(k, onPick) {
  $('.bgs').addEventListener('click', async (e) => { const b = e.target.closest('[data-bg]'); if (!b) return; setBg(k, b.dataset.bg);
    $$('.bgs [data-bg]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); await onPick(b.dataset.bg); });
}

// ===== פתק בוקר =====
async function renderNote(day) {
  const d = D.days[day]; if (!d || !d.opened_at) return go('#/today');
  let full = false, wall = false, insp = false, bg = getBg('note', 'cream');
  shell(`${hd(T.noteSub, T.noteTitle, 'open')}${helpRow('morning_note')}
    <div class="seg${filled(d.win_belief) ? ' four' : ''}" role="radiogroup" id="kind"><button type="button" class="on" role="radio" aria-checked="true" data-v="0">${T.noteShort}</button><button type="button" role="radio" aria-checked="false" data-v="1">${T.noteFull}</button>${filled(d.win_belief) ? `<button type="button" role="radio" aria-checked="false" data-v="3">${T.noteMorning}</button><button type="button" role="radio" aria-checked="false" data-v="2">${T.noteWall}</button>` : ''}</div>
    <p class="hint" id="wh" hidden>${T.wallpaperHint}</p>
    ${bgPicker(bg)}
    <div class="preview" id="pv" aria-live="polite"></div>
    <button class="btn" id="save">${T.saveImage}</button>
    <button class="btn2" id="share">${T.shareImage}</button>
    <a class="btn2" href="#/today">${T.backToday}</a>`, 'today');
  let cv;
  const draw = async () => { cv = insp ? await quoteCard(d.win_belief, { kind: 'morning', label: T.morningLabel, name: firstName(), dateLabel: hebShort(day), bg }) : wall ? await wallpaper(d.win_belief, { head: d.voice === 'god' ? T.wallHeadGod : T.wallHeadFuture, bg }) : await morningNote({ ...d, hasBase: fullMode() }, { full, dateLabel: hebShort(day), bg }); const pv = $('#pv'); if (!pv) return; pv.innerHTML = ''; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', T.noteTitle); pv.appendChild(cv); };
  await draw();
  wireBg('note', async (v) => { bg = v; await draw(); });
  $('#kind').addEventListener('click', async (e) => { const b = e.target.closest('button'); if (!b) return; full = b.dataset.v === '1'; wall = b.dataset.v === '2'; insp = b.dataset.v === '3'; $('#wh').hidden = !wall; $$('#kind button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); await draw(); });
  const fname = () => `${wall ? 'שומר-מסך' : insp ? 'השראת-הבוקר' : 'פתק-בוקר'}-${day}.png`;
  $('#save').addEventListener('click', async () => { if ((await saveCanvas(cv, fname())) !== 'cancel') toast(T.saved); });
  $('#share').addEventListener('click', () => saveCanvas(cv, fname(), true));
}

// ===== סטיקר תובנה =====
async function renderGifts(day) {
  const d = D.days[day];
  const has = { both: filled(d.hug_find) && filled(d.strength_find), hug: filled(d.hug_find), str: filled(d.strength_find) };
  const opts = [['both', T.giftBoth], ['hug', T.giftHugOnly], ['str', T.giftStrOnly]].filter(([k]) => has[k]);
  let which = opts[0][0], withName = true, bg = getBg('sticker', 'navy');
  shell(`${hd(T.giftsNoteSub, T.giftsNoteTitle, 'reflect')}
    ${opts.length > 1 ? `<div class="seg" id="gk" role="radiogroup" aria-label="${T.giftsNoteTitle}">${opts.map(([v, l], i) => `<button type="button" role="radio" aria-checked="${!i}" class="${i ? '' : 'on'}" data-v="${v}">${l}</button>`).join('')}</div>` : ''}
    <div class="seg" id="nm" role="radiogroup" aria-label="שם בפתק"><button type="button" role="radio" aria-checked="true" class="on" data-v="1">${T.withName}</button><button type="button" role="radio" aria-checked="false" data-v="0">${T.noName}</button></div>
    ${bgPicker(bg)}
    <div class="preview" id="pv"></div>
    <button class="btn" id="save">${T.saveImage}</button>
    <button class="btn2" id="share">${T.shareImageGroup}</button>
    <a class="btn2" href="#/today">${T.backToday}</a>`, 'today');
  let cv;
  const o = () => ({ name: withName ? firstName() : '', dateLabel: hebShort(day), bg });
  const draw = async () => {
    cv = which === 'both' ? await giftNote([[T.giftHugHead, d.hug_find], [T.giftStrHead, d.strength_find]], { label: T.giftsNoteTitle, ...o() })
      : await quoteCard(which === 'hug' ? d.hug_find : d.strength_find, { kind: 'insight', label: T.giftsNoteTitle, head: which === 'hug' ? T.giftHugHead : T.giftStrHead, ...o() });
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', T.giftsNoteTitle); const pv = $('#pv'); if (!pv) return; pv.innerHTML = ''; pv.appendChild(cv);
  };
  await draw();
  if (!d.sticker) api.saveDay(day, { sticker: true });
  wireBg('sticker', async (v) => { bg = v; await draw(); });
  const pick = (id, f) => $(id)?.addEventListener('click', async (e) => { const b = e.target.closest('button'); if (!b) return; f(b.dataset.v); $$(id + ' button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); await draw(); });
  pick('#gk', (v) => { which = v; });
  pick('#nm', (v) => { withName = v === '1'; });
  $('#save').addEventListener('click', async () => { if ((await saveCanvas(cv, `מתנות-${day}.png`)) !== 'cancel') toast(T.saved); });
  $('#share').addEventListener('click', () => saveCanvas(cv, `מתנות-${day}.png`, true));
}

async function renderSticker(day) {
  const d0 = D.days[day]; if (d0 && (filled(d0.hug_find) || filled(d0.strength_find))) return renderGifts(day);
  const d = D.days[day]; if (!d || !filled(d.insight)) return go('#/today');
  let withName = true, bg = getBg('sticker', 'navy');
  shell(`${hd(T.stickerSub, T.stickerTitle, 'reflect')}${helpRow('sticker')}
    <div class="seg" id="nm" role="radiogroup" aria-label="שם בסטיקר"><button type="button" role="radio" aria-checked="true" class="on" data-v="1">${T.withName}</button><button type="button" role="radio" aria-checked="false" data-v="0">${T.noName}</button></div>
    ${bgPicker(bg)}
    <div class="preview" id="pv"></div>
    <button class="btn" id="save">${T.saveImage}</button>
    <button class="btn2" id="share">${T.shareImageGroup}</button>
    <p class="hint" style="text-align:center">${T.stickerSaved}</p>
    <a class="btn2" href="#/today">${T.backToday}</a>`, 'today');
  let cv;
  const draw = async () => { cv = await sticker(d.insight, { name: withName ? firstName() : '', dateLabel: hebShort(day), bg }); cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', d.insight); const pv = $('#pv'); if (!pv) return; pv.innerHTML = ''; pv.appendChild(cv); };
  await draw();
  if (!d.sticker) api.saveDay(day, { sticker: true });
  wireBg('sticker', async (v) => { bg = v; await draw(); });
  $('#nm').addEventListener('click', async (e) => { const b = e.target.closest('button'); if (!b) return; withName = b.dataset.v === '1'; $$('#nm button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); await draw(); });
  $('#save').addEventListener('click', async () => { if ((await saveCanvas(cv, `גילוי-${day}.png`)) !== 'cancel') toast(T.saved); });
  $('#share').addEventListener('click', () => saveCanvas(cv, `גילוי-${day}.png`, true));
}

// ===== שבוע =====
// שבוע לפי ?YYYY-MM-DD בכתובת, אחרת השבוע הנוכחי
const wsFromHash = () => { const q = (location.hash.split('?')[1] || ''); return /^\d{4}-\d\d-\d\d$/.test(q) ? q : weekStart(today()); };
const noteItems = (w) => {
  const out = [];
  if (filled(w.result)) out.push({ id: 'r', kind: 'result', text: w.result });
  (w.habits || []).forEach((h, i) => { if (filled(h.text)) out.push({ id: 'h' + i, kind: 'habit', text: h.text, chips: [h.amount, h.freq && h.freq + ' ' + T.times, h.days].filter(filled) }); });
  (w.onetime || []).forEach((h, i) => { if (filled(h.text)) out.push({ id: 'o' + i, kind: 'once', text: h.text, day: h.day }); });
  String(w.beings || '').split(/[,،·\n/]/).map((s) => s.trim()).filter(Boolean).forEach((b, i) => out.push({ id: 'b' + i, kind: 'being', text: b }));
  if (filled(w.win_belief)) out.push({ id: 'wb', kind: 'belief', text: w.win_belief });
  return out;
};

// פתק המטרות המעוצב (שושי 21.11): כותרת עם השם והתאריך, כל חלק בצבע משלו. במצב תחקיר: סימון ליד כל דבר
function goalNote(w, ws, debrief = null) {
  const items = noteItems(w);
  const mark = (it) => {
    if (!debrief) return '';
    const opts = it.kind === 'being' ? T.chkBeing : it.kind === 'belief' ? T.chkBelief : T.chk;
    return `${it.kind === 'belief' ? `<p class="gn-ask">${T.chkBeliefQ}</p>` : ''}${seg('checks.' + it.id, (debrief.checks || {})[it.id], Object.entries(opts))}`;
  };
  const by = (k) => items.filter((it) => it.kind === k);
  const sec = (cls, label, inner) => inner ? `<div class="gn-sec ${cls}"><span class="gn-lab">${label}</span>${inner}</div>` : '';
  const r = by('result')[0];
  return `<article class="gnote${debrief ? ' dbm' : ''}">
    <header class="gn-top"><small>${esc(T.gnFrom(shortDate(ws)))}</small><h2>${esc(T.gnTitle(firstName()))}</h2></header>
    ${sec('c-mag', T.gnResult, r ? `<p class="gn-big">${esc(r.text)}</p>${mark(r)}` : '')}
    ${sec('c-plum', T.gnHabits, by('habit').map((it) => `<div class="gn-it"><p>${esc(it.text)}</p>${it.chips.length ? `<div class="gn-chips">${it.chips.map((c) => `<i>${esc(c)}</i>`).join('')}</div>` : ''}${mark(it)}</div>`).join(''))}
    ${sec('c-orange', T.gnOnce, by('once').map((it) => `<div class="gn-it"><p>${filled(it.day) ? `<i class="gn-day">${esc(it.day)}</i>` : ''}${esc(it.text)}</p>${mark(it)}</div>`).join(''))}
    ${sec('c-navy', T.gnBeings, debrief
      ? by('being').map((it) => `<div class="gn-it"><p class="gn-pill1">${esc(it.text)}</p>${mark(it)}</div>`).join('')
      : by('being').length ? `<div class="gn-pills">${by('being').map((it) => `<span>${esc(it.text)}</span>`).join('')}</div>` : '')}
    ${by('belief').length ? `<div class="gn-belief"><span class="gn-lab">${T.gnBelief}</span><p>״${esc(by('belief')[0].text)}״</p>${mark(by('belief')[0])}</div>` : ''}
    ${debrief ? '' : `<p class="gn-foot">${T.gnFoot}</p>`}
  </article>`;
}

function renderWeek() {
  const ws = weekStart(today()); const w = D.weeks[ws] || {};
  const prevWs = addDays(ws, -7); const pw = D.weeks[prevWs];
  const nextWs = addDays(ws, 7); const nw = D.weeks[nextWs] || {};
  const dow = new Date().getDay();
  // סגירת השבוע הקודם, אם נפתח ולא נסגר
  const prevOpen = pw && pw.opened_at && !pw.closed_at;
  let body = `${hd(T.weekNum(weekNumber(ws)), w.opened_at ? T.weekOpened : T.weekOpenTitle, 'week')}`;
  if (!hasBase()) body += `<div class="banner">${T.needBaseWeek} <a class="lnk" href="#/base">${T.baseGo}</a></div>`;
  if (prevOpen) body += `<div class="banner soft"><b>${T.prevWeekOpen}</b><a class="lnk" href="#/week/close?${prevWs}">${T.weekCloseTitle}</a></div>`;
  // הפתק לשבוע הבא, אם כבר נכתב אחרי התחקיר
  if (nw.opened_at) body += `<p class="q">${T.nextNoteTitle}</p>${goalNote(nw, nextWs)}<a class="btn2" href="#/week/open?${nextWs}">${T.editWeek}</a>`;
  if (w.opened_at) {
    if (nw.opened_at) body += `<p class="q">${T.thisNoteTitle}</p>`;
    body += goalNote(w, ws);
    body += w.closed_at
      ? `<div class="banner soft"><b>${T.weekClosed}</b></div>${nw.opened_at ? '' : `<a class="btn" href="#/week/open?${nextWs}">${T.nextNoteCta}</a>`}<a class="btn2" href="#/week/close?${ws}">${T.weekCloseTitle}</a>`
      : `${dow >= 4 ? `<a class="btn" href="#/week/close?${ws}">${T.weekCloseTitle}</a>` : `<p class="hint">${T.weekCloseWhen}</p><a class="btn2" href="#/week/close?${ws}">${T.weekCloseTitle}</a>`}`;
    body += `<a class="btn2" href="#/week/open?${ws}">${T.editWeek}</a>`;
  } else {
    body += `<p class="hint">${T.weekOpenWhen}</p><a class="btn" href="#/week/open">${T.weekNoteCta}</a>`;
  }
  if (WFB().length) body += `<a class="btn2" href="#/reflect">${T.fbNav}</a>`;
  shell(body, 'week');
}

function renderWeekOpen() {
  const ws = wsFromHash();
  const prev = D.weeks[addDays(ws, -7)] || {};
  const m = { habits: [], onetime: [], channels: {}, ...(D.weeks[ws] || {}) };
  // פתק חדש לא נכתב מדף ריק: ההרגלים וההוויות של השבוע שעבר, ואז מתאימות (שיעור 13)
  if (!m.opened_at && !m.habits.length && (prev.habits || []).some((h) => filled(h.text))) m.habits = prev.habits.filter((h) => filled(h.text)).map((h) => ({ ...h }));
  if (!m.opened_at && !filled(m.beings) && filled(prev.beings)) m.beings = prev.beings;
  if (!m.habits.length) m.habits = (F().plan_habits || []).filter((h) => filled(h.text)).map((h) => ({ ...h })).slice(0, 3);
  if (!m.habits.length) m.habits = [{}];
  if (!m.onetime.length) m.onetime = [{}];
  const lessons = [[T.dbKeep, prev.keep_it], [T.dbDrop, prev.drop_it], [T.dbAdd, prev.add_it], [T.dbChange, prev.change_it], [T.dbTry, prev.next_try]].filter(([, v]) => filled(v));
  const habitRow = (h, i) => `<div class="rowi">${i ? `<button type="button" class="x" data-del="habits.${i}" aria-label="להסיר">×</button>` : ''}
      ${inp(`habits.${i}.text`, h.text, T.habitText)}<div class="row3" style="margin-top:8px">${inp(`habits.${i}.amount`, h.amount, T.habitAmount)}${inp(`habits.${i}.freq`, h.freq, T.habitFreq, 'text', 'inputmode="numeric"')}${inp(`habits.${i}.days`, h.days, T.habitDays)}</div></div>`;
  const onceRow = (h, i) => `<div class="rowi">${i ? `<button type="button" class="x" data-del="onetime.${i}" aria-label="להסיר">×</button>` : ''}
      <div class="row3" style="grid-template-columns:2fr 1fr">${inp(`onetime.${i}.text`, h.text, T.onceText)}${inp(`onetime.${i}.day`, h.day, T.onceDay)}</div></div>`;
  const draw = () => {
    shell(`${hd(T.weekNum(weekNumber(ws)) + ' · ' + T.weekFrom(shortDate(ws)), T.gnTitle(firstName()), 'week')}${helpRow('week_note')}
      ${!hasBase() ? `<div class="banner">${T.needBaseWeek} <a class="lnk" href="#/base">${T.baseGo}</a></div>` : ''}
      ${lessons.length ? card(`<div class="ct">${T.fromDebrief}</div>${lessons.map(([l, v]) => `<p class="it"><b>${l}</b> ${esc(v)}</p>`).join('')}`, 'flat') : ''}
      ${card(`<div class="ct">${T.weekResult} ${tag(1)}</div><p class="hint">${T.weekResultHint}</p>${ta('result', m.result, '', 2)}
        ${hasAchievement() ? `<p class="hint" style="margin-top:8px"><b>${T.achievementCard}:</b> ${esc(F().achievement)}</p>` : ''}`, '', 'result')}
      ${card(`<div class="ct">${T.weekHabits} ${tag(1)} <span class="hint" style="margin:0">${T.weekHabitsHint}</span></div>
        <div class="rows">${m.habits.map(habitRow).join('')}</div><button type="button" class="more" data-add="habits">${T.addRow}</button>`, '', 'habits')}
      ${card(`<div class="ct">${T.weekOnce} ${tag(0)} <span class="hint" style="margin:0">${T.weekOnceHint}</span></div>
        <div class="rows">${m.onetime.map(onceRow).join('')}</div><button type="button" class="more" data-add="onetime">${T.addRow}</button>`, '', 'once')}
      ${card(`<div class="ct">${T.optionalMore} ${tag(0)}</div>
        <p class="q">${T.winBeliefWeek}</p>${ta('win_belief', m.win_belief)}
        <p class="q">${T.weekBeings}</p>${inp('beings', m.beings, T.weekBeingsPh)}
        <p class="q">${T.weekChannels}</p>
        ${Object.entries(T.channels).map(([k, c]) => `<p class="hint" style="margin-top:6px"><b>${c.name}:</b> ${c.q}</p>${inp('channels.' + k, (m.channels || {})[k])}`).join('')}`)}
      <p class="err" id="er" role="alert" hidden></p>
      <button class="btn" id="done">${m.opened_at ? T.saveBase : T.openWeek}</button>`, 'week');
    const save = (x) => api.saveWeek(ws, { result: x.result, habits: x.habits, onetime: x.onetime, win_belief: x.win_belief, beings: x.beings, channels: x.channels });
    const flushNow = bindForm(m, save);
    $$('[data-add]').forEach((b) => b.addEventListener('click', () => { flushNow(); const k = b.dataset.add; m[k].push({}); draw(); $(`[data-k="${k}.${m[k].length - 1}.text"]`)?.focus(); }));
    $$('[data-del]').forEach((b) => b.addEventListener('click', () => { flushNow(); const [k, i] = b.dataset.del.split('.'); m[k].splice(+i, 1); save(m); draw(); }));
    $('#done').addEventListener('click', () => {
      flushNow();
      const miss = [];
      if (!filled(m.result)) miss.push('result');
      if (!m.habits.some((h) => filled(h.text))) miss.push('habits');
      if (miss.length) { const er = $('#er'); er.textContent = T.missingRequired + ' ' + miss.map((k) => T.reqNames[k]).join(', '); er.hidden = false; return markMissing(miss); }
      api.saveWeek(ws, { opened_at: (D.weeks[ws] || {}).opened_at || new Date().toISOString() });
      celebrate('week', T.weekOpenedToast); go('#/week');
    });
  };
  draw();
}

// סיכום השבוע מתוך היומן היומי: כדי שהתחקיר יישען על נתונים ולא על הזיכרון (שושי 12.11)
function weekSummaryHtml(ws) {
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(ws, i)).map((k) => ({ k, d: D.days[k] })).filter((x) => x.d && x.d.opened_at);
  if (!days.length) return `<p class="hint">${T.sumEmpty}</p>`;
  const closed = days.filter((x) => x.d.closed_at).length;
  const keys = days.filter((x) => filled(x.d.key_action));
  const cnt = (st) => keys.filter((x) => x.d.key_status === st).length;
  const signs = days.filter((x) => filled(x.d.being_sign));
  const insTx = (d) => [d.insight, d.hug_find, d.strength_find].filter(filled).join(' · ');
  const ins = days.filter((x) => insTx(x.d));
  const lab = (k) => esc(dayLabel(k));
  return `<p class="it"><b>${T.sumDays(days.length, closed)}</b></p>
    <p class="q">${T.sumBeings}</p>${days.map((x) => `<p class="it">${lab(x.k)} · ${esc(x.d.being || '')}${x.d.presence != null ? ` · ${x.d.presence}/5` : ''}</p>`).join('')}
    ${keys.length ? `<p class="q">${T.sumKey}</p><p class="hint">${T.sumKeyCounts(cnt('done'), cnt('partial'), cnt('no'))}</p>
      ${keys.map((x) => `<p class="it">${lab(x.k)} · ${esc(x.d.key_action)}${x.d.key_status ? ` · <b>${esc(T.keyStatus[x.d.key_status])}</b>` : ''}</p>`).join('')}` : ''}
    ${signs.length ? `<p class="q">${T.sumSigns}</p>${signs.map((x) => `<p class="it">${lab(x.k)} · ${esc(x.d.being_sign)}${x.d.sign_status ? ` · <b>${esc(T.signStatus[x.d.sign_status])}</b>` : ''}</p>`).join('')}` : ''}
    ${ins.length ? `<p class="q">${T.sumInsights}</p>${ins.map((x) => `<p class="it">${lab(x.k)} · ${esc(insTx(x.d))}</p>`).join('')}` : ''}`;
}

// התחקיר של השבוע (שושי 21.11): כמו ביומן האימון המנטלי. מסמנות מול הפתק מה בוצע, ואז ארבע שאלות קצרות
function renderWeekClose() {
  const ws = wsFromHash();
  const w = D.weeks[ws] || {};
  const m = { checks: {}, gap_ch: {}, ...w };
  if (!filled(m.progress_goal)) { const pk = Object.keys(D.weeks).filter((k) => k < ws && D.weeks[k].progress_goal != null).sort().pop(); if (pk) m.progress_goal = D.weeks[pk].progress_goal; }
  const items = w.opened_at ? noteItems(w) : [];
  shell(`${hd(T.weekNum(weekNumber(ws)) + ' · ' + T.weekFrom(shortDate(ws)), T.weekCloseTitle, 'debrief')}${helpRow('debrief')}
    <p class="db-heart">${T.dbHeart}</p>
    ${items.length
      ? `<section class="db-what" data-req="checks"><div class="ct">${T.dbWhatTitle} ${tag(1)}</div><p class="hint">${T.dbWhatHint}</p>${goalNote(w, ws, m)}</section>`
      : `<p class="hint">${T.dbNoNote}</p>`}
    <details class="qs db-peek"><summary>${T.dbDaysPeek}</summary>${weekSummaryHtml(ws)}</details>
    ${card(`<div class="ct">${T.progressQ} ${tag(1)}</div>
      ${hasAchievement() ? `<p class="db-ach">${esc(F().achievement)}</p>` : ''}
      ${ta('progress', m.progress, T.dbProgressHint, 2)}
      <p class="hint" style="margin-top:10px">${T.dbNumQ}</p>
      <div class="db-num"><span>${T.dbNumAt}</span>${inp('progress_at', m.progress_at, '', 'text', 'inputmode="decimal"')}<span>${T.dbNumOf}</span>${inp('progress_goal', m.progress_goal, '', 'text', 'inputmode="decimal"')}</div>`, '', 'progress')}
    ${card(`<div class="ct">${T.dbWorked} ${tag(1)}</div><p class="hint">${T.dbWorkedHint}</p>${ta('success', m.success, T.writeHere, 2)}`, '', 'worked')}
    ${card(`<div class="ct">${T.dbGap} ${tag(1)}</div><p class="hint">${T.dbGapHint}</p>
      ${Object.entries(T.dbGapCh).map(([k, c]) => `<p class="q db-ch"><b>${c.name}</b> ${c.q}</p>${ta('gap_ch.' + k, (m.gap_ch || {})[k], T.writeHere, 2)}`).join('')}`, '', 'gapq')}
    ${card(`<div class="ct">${T.noteTypeQ} ${tag(1)}</div>${seg('note_type', m.note_type, Object.entries(T.noteType))}
      <details class="qs"><summary>${T.noteTypeRemind}</summary><p class="hint">${T.noteTypeExplain}</p></details>`, '', 'note_type')}
    ${card(`<div class="ct">${T.dbNext} ${tag(1)}</div><p class="hint">${T.dbNextHint}</p>
      <p class="q">${T.dbKeep}</p>${inp('keep_it', m.keep_it)}
      <p class="q">${T.dbDrop}</p>${inp('drop_it', m.drop_it)}
      <p class="q">${T.dbAdd}</p>${inp('add_it', m.add_it)}`, '', 'next')}
    ${card(`<div class="ct">${T.dbLearn} ${tag(0)}</div><p class="hint">${T.dbLearnHint}</p>${ta('learn', m.learn, T.writeHere, 2)}`)}
    <p class="err" id="er" role="alert" hidden></p>
    <button class="btn" id="done">${m.closed_at ? T.saveBase : T.closeWeek}</button>`, 'week');
  const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const save = (x) => api.saveWeek(ws, { checks: x.checks, progress: x.progress, progress_at: num(x.progress_at), progress_goal: num(x.progress_goal), success: x.success, gap_ch: x.gap_ch, gap: Object.keys(T.dbGapCh).map((k) => (x.gap_ch || {})[k]).filter(filled).join('\n') || null, learn: x.learn, keep_it: x.keep_it, drop_it: x.drop_it, add_it: x.add_it, note_type: x.note_type,
    hands: [x.keep_it, x.drop_it, x.add_it].filter(filled).join(' · ') || null });
  const flushNow = bindForm(m, save);
  $('#done').addEventListener('click', () => {
    flushNow();
    const miss = [];
    if (items.some((it) => !(m.checks || {})[it.id])) miss.push('checks');
    if (!filled(m.progress)) miss.push('progress');
    if (!filled(m.success)) miss.push('worked');
    if (!Object.values(m.gap_ch || {}).some(filled)) miss.push('gapq');
    if (!m.note_type) miss.push('note_type');
    if (![m.keep_it, m.drop_it, m.add_it].some(filled)) miss.push('next');
    if (miss.length) { const er = $('#er'); er.textContent = T.missingRequired + ' ' + miss.map((k) => T.reqNames[k]).join(', '); er.hidden = false; return markMissing(miss); }
    api.saveWeek(ws, { closed_at: (D.weeks[ws] || {}).closed_at || new Date().toISOString() });
    celebrate('debrief', T.weekClosedToast);
    // ״ומכאן לפתק החדש״: פתק חדש עם תאריך לשבוע שאחרי, בלי לדרוס את הפתק שנסגר (שושי 21.11)
    const nextWs = addDays(ws, 7);
    go((D.weeks[nextWs] || {}).opened_at ? '#/week' : '#/week/open?' + nextWs);
  });
}

// ===== התקדמות =====
function stats() {
  const t = today(); const ws = weekStart(t);
  const wk = [0, 1, 2, 3, 4, 5, 6].map((i) => { const k = addDays(ws, i); return { k, d: D.days[k] || {} }; });
  const both = wk.filter((x) => x.d.opened_at && x.d.closed_at).length;
  const openOnly = wk.filter((x) => x.d.opened_at && !x.d.closed_at && x.k < t && canStillClose(x.k)).pop();
  const keyDone = wk.filter((x) => x.d.key_status === 'done').length;
  const keyTotal = wk.filter((x) => x.d.key_status).length;
  const OPT = ['where_needed', 'may_derail', 'recover', 'win_belief', 'being_sign', 'key_reflect', 'day_how', 'out_inner', 'out_thought', 'thanks', 'back_help', 'open_tomorrow'];
  const opened = wk.filter((x) => x.d.opened_at);
  const depth = opened.length ? Math.round(100 * opened.reduce((a, x) => a + OPT.filter((k) => filled(x.d[k])).length / OPT.length, 0) / opened.length) : null;
  const all = Object.values(D.days);
  const observations = all.filter((d) => d.closed_at).length + Object.values(D.weeks).filter((w) => w.closed_at).length;
  const recent = Object.keys(D.days).filter((k) => k > addDays(t, -14)).map((k) => D.days[k]);
  const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const openAvg = avg(recent.filter((d) => d.opened_at).map((d) => minutesOf(d.opened_at)));
  const closeAvg = avg(recent.filter((d) => d.closed_at).map((d) => minutesOf(d.closed_at)));
  // רצף ימים שנפתחו ונסגרו
  let streak = 0; for (let k = D.days[t]?.closed_at ? t : addDays(t, -1); D.days[k]?.opened_at && D.days[k]?.closed_at; k = addDays(k, -1)) streak++;
  // כמה זמן לוקחת סגירת היום, ומה חריג
  const closes = Object.keys(D.days).filter((k) => k > addDays(t, -14) && D.days[k].closed_at).sort().map((k) => {
    const d = D.days[k]; const m = d.close_started_at ? (Date.parse(d.closed_at) - Date.parse(d.close_started_at)) / 6e4 : null;
    return { k, late: closedLate({ ...d, day: k }), min: m != null && m > 0 && m < 360 ? Math.max(1, Math.round(m)) : null, at: d.closed_at };
  });
  const fills = closes.filter((c) => c.min != null).map((c) => c.min);
  const fillAvg = fills.length ? Math.round(avg(fills)) : null;
  const odd = closes.filter((c) => c.late || (fillAvg != null && c.min != null && fills.length >= 3 && c.min > Math.max(fillAvg * 2, fillAvg + 15)));
  return { ws, wk, both, openOnly, keyDone, keyTotal, depth, observations, openAvg, closeAvg, streak, recent, closes, fillAvg, odd };
}
// עמידה במילה (שושי 18.11): לכל יום ולכל סעיף ציון 0-100, ואחוז = ממוצע. אותו חישוב כמו word_scores בשרת
const WORD_KEYS = ['being', 'subs', 'sign', 'open', 'close', 'key', 'steps'];
const tmin = (s) => { const m = String(s || '').match(/^(\d{1,2}):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : null; };
function wordDay(k, d) {
  const t = today(); const r = {};
  if (!d || !d.opened_at) return r;
  if (d.closed_at && d.presence != null) r.being = d.presence * 20;
  const sp = (d.sub_presence || []).filter((v) => v != null); if (d.closed_at && sp.length) r.subs = sp.reduce((a, b) => a + b, 0) / sp.length * 20;
  if (d.sign_status) r.sign = d.sign_status === 'done' ? 100 : d.sign_status === 'partial' ? 50 : 0;
  if (d.key_status) r.key = { done: 100, partial: 50, no: 0 }[d.key_status];
  const st = (d.steps || []).filter((x) => x && x.status); if (st.length) r.steps = st.reduce((a, x) => a + ({ done: 100, partial: 50, no: 0 }[x.status] ?? 0), 0) / st.length;
  const cp = tmin(normTime(d.close_plan));
  if (cp != null) { if (d.closed_at && iso(new Date(d.closed_at)) === k) r.close = minutesOf(d.closed_at) <= cp + 30 ? 100 : 0; else if (d.closed_at || k < t) r.close = 0; }
  const op = tmin(normTime((D.days[addDays(k, -1)] || {}).open_tomorrow));
  if (op != null) r.open = iso(new Date(d.opened_at)) === k && minutesOf(d.opened_at) <= op + 30 ? 100 : 0;
  return r;
}
function wordScores(from, to) {
  const pool = {}; WORD_KEYS.forEach((x) => { pool[x] = []; });
  Object.keys(D.days).filter((k) => k >= from && k <= to).forEach((k) => { const r = wordDay(k, D.days[k]); Object.entries(r).forEach(([x, v]) => pool[x].push(v)); });
  const avg = (a) => (a.length ? Math.round(a.reduce((p, q) => p + q, 0) / a.length) : null);
  const out = { all: avg(Object.values(pool).flat()) }; WORD_KEYS.forEach((x) => { out[x] = avg(pool[x]); });
  return out;
}
function dataInsight(s) {
  const days = Object.entries(D.days).filter(([, d]) => d.opened_at && d.key_status).slice(-28);
  if (days.length >= 4) {
    const mins = days.map(([, d]) => minutesOf(d.opened_at)).sort((a, b) => a - b);
    const cut = Math.ceil(mins[Math.floor(mins.length / 2)] / 30) * 30;
    const early = days.filter(([, d]) => minutesOf(d.opened_at) < cut);
    const late = days.filter(([, d]) => minutesOf(d.opened_at) >= cut);
    const r = (a) => a.filter(([, d]) => d.key_status === 'done').length;
    if (early.length >= 2 && late.length >= 2 && r(early) / early.length > r(late) / late.length)
      return T.insEarly(fmtMin(cut), r(early), early.length);
  }
  const subs = {};
  Object.values(D.days).filter((d) => d.closed_at && d.sub_beings).slice(-14).forEach((d) => d.sub_beings.forEach((s, i) => { const v = (d.sub_presence || [])[i]; if (s && v != null) (subs[s] = subs[s] || []).push(v); }));
  const ranked = Object.entries(subs).filter(([, v]) => v.length >= 3).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => a[1] - b[1]);
  if (ranked.length >= 2) return T.insLowSub(ranked[0][0], ranked.at(-1)[0]);
  if (s.streak >= 3) return T.insStreak(s.streak);
  return null;
}
// הדרך להישג: נקודות עד 20 צעדים, אחרת פס בלי אחוזים
function achPath(at, goal) {
  const a = Math.max(0, Math.min(+at, +goal)); const g = +goal;
  const vis = g <= 20 && Number.isInteger(g)
    ? `<div class="apath" aria-hidden="true">${Array.from({ length: g }, (_, i) => `<i class="${i < a ? 'f' : ''}"></i>`).join('')}</div>`
    : `<div class="bar" aria-hidden="true"><i style="width:${Math.round((a / g) * 100)}%"></i></div>`;
  return `<p class="kpi" style="margin-top:6px">${esc(String(+at))} <small>${esc(T.achOf(String(g)))}</small></p>${vis}`;
}
function renderProgress() {
  const s = stats(); const t = today();
  // ההתקדמות להישג המפתח במילים שלה ובמספר שבחרה, בלי אחוזים (שושי 21.11)
  const wk = Object.keys(D.weeks).sort().reverse();
  const lastNum = wk.find((k) => D.weeks[k].progress_at != null && D.weeks[k].progress_goal);
  const words = wk.filter((k) => filled(D.weeks[k].progress) && D.weeks[k].closed_at).slice(0, 3);
  const ad = F().achievement_date;
  const ins = dataInsight(s);
  shell(`${hd(T.weekNum(weekNumber(s.ws)), T.progressTitle, 'data')}
    ${card(`<div class="ct">${T.openedClosedWeek}</div><p class="kpi">${s.both} <small>${T.ofDays(s.both).replace(/^\d+ /, '')}</small></p>
      <div class="week" role="img" aria-label="${T.openedClosedWeek}: ${s.both}">${s.wk.map((x, i) => `<span class="${x.k === t ? 't' : ''}"><i class="${x.d.opened_at && x.d.closed_at ? 'f' : x.d.opened_at ? 'h' : ''}"></i>${T.days[i]}</span>`).join('')}</div>
      ${s.openOnly ? `<p class="hint">${T.openedNotClosed(T.dayNames[parse(s.openOnly.k).getDay()])} <a class="lnk" href="#/close/${s.openOnly.k}">${T.closeNow}</a></p>` : ''}`)}
    ${hasAchievement() ? card(`<div class="ct">${T.achievementCard}</div><p class="it">${esc(F().achievement)}</p>
      ${lastNum ? achPath(D.weeks[lastNum].progress_at, D.weeks[lastNum].progress_goal) : ''}
      ${words.length ? `<p class="q">${T.achWordsTitle}</p>${words.map((k) => `<p class="it"><b>${esc(T.weekNum(weekNumber(k)))}:</b> ${esc(D.weeks[k].progress)}</p>`).join('')}` : ''}
      ${ad ? `<p class="hint">${T.daysLeft(daysBetween(t, ad))}</p>` : ''}`)
      : `<div class="banner">${T.needBaseBanner} <a class="lnk" href="#/base">${T.baseGo}</a></div>`}
    <div class="cols">
      ${card(`<p class="mini">${s.keyTotal ? `${s.keyDone}/${s.keyTotal}` : '-'}</p><span class="lbl">${T.keyDoneLbl}</span>`)}
      ${card(`<p class="mini">${s.depth != null ? s.depth + '%' : '-'}</p><span class="lbl">${T.depthLbl}</span>`)}
      ${card(`<p class="mini">${s.observations}</p><span class="lbl">${T.observationsLbl}</span>`)}
      ${card(`<p class="mini">${s.openAvg != null ? fmtMin(s.openAvg) : '-'}</p><span class="lbl">${T.avgOpenLbl(s.closeAvg != null ? fmtMin(s.closeAvg) : '')}</span>`)}
    </div>
    ${(() => { const w = wordScores(s.ws, t); const a = wordScores('0000', t); return a.all == null ? '' : card(`<div class="ct">${T.wordTitle} ${helpBtn('word')}</div>
      <p class="kpi">${w.all != null ? w.all + '%' : '-'} <small>${T.wordWeek}</small></p><p class="hint">${T.wordAll(a.all)}</p>
      <table class="wtbl"><thead><tr><th></th><th>${T.wordColWeek}</th><th>${T.wordColAll}</th></tr></thead><tbody>
      ${WORD_KEYS.filter((x) => a[x] != null).map((x) => `<tr><td>${T.wordItems[x]}</td><td>${w[x] != null ? w[x] + '%' : '-'}</td><td>${a[x]}%</td></tr>`).join('')}</tbody></table>`); })()}
    ${card(`<div class="ct">${T.dataShows}</div><p class="ins">${esc(ins || T.noDataYet)}</p>`)}
    ${s.closes.length ? card(`<div class="ct">${T.closeTimeTitle}</div>
      <p class="it">${s.fillAvg != null ? esc(T.closeTimeAvg(s.fillAvg)) : ''}</p>
      <p class="hint">${esc(T.closeTimeLate(s.closes.filter((c) => c.late).length, s.closes.length))}</p>
      ${s.odd.length ? `<p class="q">${T.closeTimeOdd}</p>${s.odd.map((c) => `<p class="hint">${esc(dayLabel(c.k))} · ${esc(c.late ? T.closedNextDay(T.dayNames[new Date(c.at).getDay()], hhmm(c.at)) : T.closeMinutes(c.min))}</p>`).join('')}` : ''}`) : ''}
    ${card(`<div class="ct">${T.nextLive}</div><p class="it">${esc(CONFIG.ZOOM_WHEN)}</p>
      <div class="lessons">${CONFIG.ZOOM_LINK ? `<a class="clip" href="${esc(CONFIG.ZOOM_LINK)}" target="_blank" rel="noopener"><i></i>${T.toZoom}</a>` : ''}
      ${CONFIG.RECORDINGS_LINK ? `<a class="clip" href="${esc(CONFIG.RECORDINGS_LINK)}" target="_blank" rel="noopener"><i></i>${T.recordings}</a>` : ''}</div>`)}`, 'progress');
}

// ===== אוסף =====
// מה עזר לי לחזור להוויה: מה שתכננה בבוקר (recover) ומה שעזר בפועל בערב (back_help). שושי 18.11
const helpsEntries = (before = '9999') => Object.keys(D.days).filter((k) => k < before).sort().reverse()
  .map((k) => ({ k, d: D.days[k] })).filter((x) => filled(x.d.recover) || filled(x.d.back_help));
function helpsBank(day) {
  const list = helpsEntries(day);
  const lines = [...new Set(list.flatMap((x) => [x.d.back_help, x.d.recover]).filter(filled).map((s) => s.trim()))];
  return `<details class="qs"><summary>${esc(T.helpsBankTitle(lines.length))}</summary>
    ${lines.length ? `<ul>${lines.slice(0, 8).map((s) => `<li>${esc(s)}</li>`).join('')}</ul><a class="lnk" href="#/collection/helps">${T.helpsBankAll}</a>` : `<p class="hint">${T.helpsBankEmpty}</p>`}</details>`;
}
function collectionItems() {
  const items = [];
  Object.entries(D.days).forEach(([k, d]) => {
    if (filled(d.hug_find) || filled(d.strength_find)) items.push({ kind: d.sticker ? 'sticker' : 'insight', also: d.sticker ? 'insight' : null, parts: [d.hug_find, d.strength_find], labels: [T.giftHugHead.replace(':', ''), T.giftStrHead.replace(':', '')], text: [d.hug_find, d.strength_find].filter(Boolean).join(' '), when: shortDate(k), sort: k, link: d.sticker ? '#/sticker/' + k : null });
    if (filled(d.insight)) items.push({ kind: d.sticker ? 'sticker' : 'insight', also: d.sticker ? 'insight' : null, text: d.insight, when: shortDate(k), sort: k, link: d.sticker ? '#/sticker/' + k : null });
    if (filled(d.win_belief)) items.push({ kind: 'belief', text: d.win_belief, when: shortDate(k), sort: k });
    if (filled(d.out_situation) || filled(d.out_inner) || filled(d.out_thought) || filled(d.back_help)) items.push({ kind: 'bank', parts: [d.out_situation, d.out_inner, d.out_thought, d.back_help], text: [d.out_situation, d.out_inner, d.out_thought, d.back_help].filter(Boolean).join(' '), when: shortDate(k), sort: k + 'b' });
    if (filled(d.recover) || filled(d.back_help)) items.push({ kind: 'helps', parts: [d.recover, d.back_help], labels: T.helpsLabels, text: [d.recover, d.back_help].filter(Boolean).join(' '), when: shortDate(k), sort: k + 'c' });
  });
  Object.entries(D.weeks).forEach(([k, w]) => {
    if (filled(w.hands) && w.closed_at) items.push({ kind: 'debrief', text: w.hands, when: T.weekNum(weekNumber(k)), sort: k + 'z' });
    if (filled(w.win_belief)) items.push({ kind: 'belief', text: w.win_belief, when: T.weekNum(weekNumber(k)), sort: k + 'z' });
  });
  return items.sort((a, b) => (a.sort < b.sort ? 1 : -1));
}
// כרטיסי האוסף המאוירים: לכל סוג צבע, אייקון נייר ומירכאה גדולה (12.11)
// לכל אייקון תפקיד אחד (שושי 12.11): גילוי = התבוננות, מילים שנותנות כוח = השיחה עם האני העתידית, תחקיר = תחקיר. לסטיקר אין אייקון משלו
const COLL_ICON = { insight: 'reflect', belief: 'future', debrief: 'debrief' };
const collCard = (x) => `<article class="ccard k-${x.kind}">
  <div class="ccard-top">${COLL_ICON[x.kind] ? `<img class="ccard-ico" src="img/icons/${COLL_ICON[x.kind]}.png" width="44" height="44" alt="" aria-hidden="true">` : ''}
    <span class="ccard-kind">${T.collectionKinds[x.kind]}</span><span class="ccard-when">${esc(x.when)}</span></div>
  ${x.parts ? `<dl class="ccard-bank">${x.parts.map((p, i) => filled(p) ? `<dt>${esc((x.labels || T.bankLabels)[i])}</dt><dd>${esc(p)}</dd>` : '').join('')}</dl>` : `<p class="ccard-tx">${esc(x.text)}</p>`}
  ${x.link ? `<a class="lnk" href="${x.link}">${T.openSticker}</a>` : ''}
</article>`;
function renderCollection(filter = 'all', query = '') {
  const items = collectionItems();
  const show = items.filter((x) => (filter === 'all' || x.kind === filter || x.also === filter) && (!query || x.text.includes(query)));
  shell(`${hd(T.collectionSub, T.collectionTitle, 'collection')}
    <div class="chips cflt" id="flt">${Object.entries(T.collectionFilters).map(([k, v]) => `<button type="button" class="${k === filter ? 'on' : ''}" data-f="${k}">${COLL_ICON[k] ? `<img src="img/icons/${COLL_ICON[k]}.png" width="22" height="22" alt="" aria-hidden="true">` : ''}${v}</button>`).join('')}</div>
    ${items.length > 6 ? `<input class="search" type="search" id="sq" placeholder="${T.searchPh}" value="${esc(query)}" aria-label="${T.searchPh}">` : ''}
    ${show.length ? `<div class="cgrid">${show.map((x) => collCard(x)).join('')}</div>` : `<div class="cempty"><img src="img/icons/collection.png" width="120" height="120" alt="" aria-hidden="true"><p class="hint">${T.collectionEmpty}</p></div>`}`, 'collection');
  $('#flt').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) renderCollection(b.dataset.f, $('#sq')?.value || ''); });
  const sq = $('#sq'); if (sq) { sq.addEventListener('input', () => { const v = sq.value; clearTimeout(sq._t); sq._t = setTimeout(() => { renderCollection(filter, v); const n = $('#sq'); n.focus(); n.setSelectionRange(v.length, v.length); }, 300); }); }
}

// ===== הבסיס =====
const lessonLinks = (part) => {
  const L = CONFIG.LESSON_LINKS[part] || {};
  return `<div class="lessons">
    ${L.video ? `<a class="clip" href="${esc(L.video)}" target="_blank" rel="noopener"><i></i>${T.lessonLink}: ${esc(L.lesson)}</a>` : `<span class="clip off"><i></i>${esc(L.lesson || '')}</span>`}
    ${L.workbook ? `<a class="clip" href="${esc(L.workbook)}" target="_blank" rel="noopener"><i></i>${T.workbookLink}</a>` : ''}</div>`;
};
function renderBase() {
  const parts = [['future', futureDone()], ['achievement', hasAchievement()], ['plan', hasPlan()], ['channels', channelsDone()]];
  const missing = parts.filter(([, ok]) => !ok);
  const f = F();
  const habits = (f.plan_habits || []).filter((h) => filled(h.text)); const once = (f.plan_once || []).filter((h) => filled(h.text));
  shell(`${hd(firstName(), T.baseTitle)}
    ${missing.length === 1 ? `<div class="banner"><b>${T.missingOneTitle}</b>${T.baseMissingOne(T.baseParts[missing[0][0]])}</div>` : missing.length ? `<div class="banner">${T.baseMissingMany}</div>` : `<div class="banner soft">${T.baseFull}</div>`}
    ${card(parts.map(([k, ok]) => `<a class="check" href="#/base/${k}"><img class="ct-ico" src="img/icons/${k}.png" width="34" height="34" alt="" aria-hidden="true"><span>${T.baseParts[k]}</span><i role="img" class="${ok ? 'ok' : 'no'}" aria-label="${ok ? 'מלא' : 'חסר'}"></i></a>`).join(''))}
    ${hasAchievement() ? card(`<div class="ct">${T.achievementLabel}</div><p class="ach">${esc(f.achievement)}</p>
      <div class="chips" style="margin-top:10px">${Object.entries(T.achievementChecks).map(([k, v]) => `<button type="button" disabled class="${(f.achievement_checks || {})[k] ? 'on' : ''}">${v}</button>`).join('')}</div>
      <a class="lnk" href="#/base/achievement">${T.edit}</a>`) : ''}
    ${hasPlan() ? card(`<div class="ct">${T.basePlanTitle}</div>
      ${habits.map((h) => `<p class="it">${esc([h.text, h.amount, h.freq && h.freq + ' ' + T.times, h.days].filter(Boolean).join(' · '))}</p>`).join('')}
      ${once.map((h) => `<p class="it">${esc([h.date && shortDate(h.date), h.text].filter(Boolean).join(' · '))}</p>`).join('')}
      <a class="lnk" href="#/base/plan">${T.edit}</a>`) : ''}`, 'base');
}
function renderBasePart(part) {
  const m = JSON.parse(JSON.stringify(F()));
  ['plan_once', 'plan_habits', 'plan_support'].forEach((k) => { if (!m[k] || !m[k].length) m[k] = [{}]; });
  m.channels = m.channels || {}; m.achievement_checks = m.achievement_checks || {};
  const save = (x) => api.saveFoundation(x);
  const draw = () => {
    let body = '';
    if (part === 'future') body = card(`<div class="ct">${T.futureGeneral} ${helpBtn('future')}</div><p class="hint">${T.futureGeneralHint}</p>${ta('future_general', m.future_general, T.writeHere, 6)}`)
      + card(`<div class="ct">${T.futureArea}</div>${inp('future_area', m.future_area, T.futureAreaPh)}
        <div class="ct" style="margin-top:14px">${T.futureSpecific}</div><p class="hint">${T.futureSpecificHint}</p>${ta('future_specific', m.future_specific, T.writeHere, 6)}`) + lessonLinks('future');
    if (part === 'achievement') body = card(`<div class="ct">${T.achievementLabel} ${tag(1)} ${helpBtn('achievement')}</div><p class="hint">${T.achievementHint}</p>${ta('achievement', m.achievement, '', 3)}
        <p class="q">${T.achievementDate}</p><p class="hint ${m.achievement_date && m.achievement_date < today() ? 'warn' : ''}">${T.achievementDateHint}</p>${inp('achievement_date', m.achievement_date, '', 'date')}`, '', 'ach')
      + card(`<div class="ct">${T.achievementChecksTitle}</div><p class="hint">${T.checksHint}</p>
        <div class="chips" id="chk">${Object.entries(T.achievementChecks).map(([k, v]) => `<button type="button" aria-pressed="${!!m.achievement_checks[k]}" class="${m.achievement_checks[k] ? 'on' : ''}" data-c="${k}">${v}</button>`).join('')}</div>
        <details class="qs"><summary>${T.achievementQuestionsTitle}</summary><ol>${T.achievementQuestions.map((q) => `<li>${q}</li>`).join('')}</ol></details>`) + lessonLinks('achievement');
    if (part === 'plan') {
      const rowsOf = (key, cols) => `<div class="rows">${m[key].map((h, i) => `<div class="rowi">${i ? `<button type="button" class="x" data-del="${key}.${i}" aria-label="להסיר">×</button>` : ''}${cols(h, i)}</div>`).join('')}</div><button type="button" class="more" data-add="${key}">${T.addRow}</button>`;
      body = `<p class="hint">${T.planHint} ${helpBtn('plan')}</p>`
        + card(`<div class="ct">${T.planHabits}</div>${rowsOf('plan_habits', (h, i) => `${inp(`plan_habits.${i}.text`, h.text, T.habitText)}<div class="row3" style="margin-top:8px">${inp(`plan_habits.${i}.amount`, h.amount, T.habitAmount)}${inp(`plan_habits.${i}.freq`, h.freq, T.habitFreq)}${inp(`plan_habits.${i}.days`, h.days, T.habitDays)}</div>`)}`, '', 'plan')
        + card(`<div class="ct">${T.planOnce}</div>${rowsOf('plan_once', (h, i) => `<div class="row3" style="grid-template-columns:2fr 1fr">${inp(`plan_once.${i}.text`, h.text, T.onceText)}${inp(`plan_once.${i}.date`, h.date, '', 'date')}</div>`)}`)
        + card(`<div class="ct">${T.planSupport}</div>${rowsOf('plan_support', (h, i) => inp(`plan_support.${i}.text`, h.text, T.onceText))}`) + lessonLinks('plan');
    }
    if (part === 'channels') body = `<p class="hint">${T.channelsHint} ${helpBtn('channels')}</p>` + Object.entries(T.channels).map(([k, c]) => card(`<div class="ct">${c.name}</div><p class="hint">${c.q}</p>
        <div class="row3" style="grid-template-columns:1fr 3fr">${inp(`channels.${k}.score`, (m.channels[k] || {}).score, '1-10', 'number', 'min="1" max="10" inputmode="numeric"')}${inp(`channels.${k}.note`, (m.channels[k] || {}).note, T.channelNotePh)}</div>`)).join('') + lessonLinks('channels');
    shell(`${hd(T.baseTitle, T.baseParts[part] || '', ['future', 'achievement', 'plan', 'channels'].includes(part) ? part : '')}${body}
      <button class="btn" id="done">${T.saveBase}</button><a class="btn2" href="#/base">${T.backBase}</a>`, 'base');
    const flushNow = bindForm(m, save);
    $$('[data-add]').forEach((b) => b.addEventListener('click', () => { flushNow(); const k = b.dataset.add; m[k].push({}); draw(); $(`[data-k="${k}.${m[k].length - 1}.text"]`)?.focus(); }));
    $$('[data-del]').forEach((b) => b.addEventListener('click', () => { flushNow(); const [k, i] = b.dataset.del.split('.'); m[k].splice(+i, 1); save(m); draw(); }));
    $('#chk')?.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.c; m.achievement_checks[k] = !m.achievement_checks[k]; b.classList.toggle('on'); b.setAttribute('aria-pressed', m.achievement_checks[k]); save(m); });
    $('#done').addEventListener('click', () => { flushNow(); toast(T.saved); go('#/base'); });
  };
  if (!T.baseParts[part]) return go('#/base');
  draw();
}

// ===== איך לדייק =====
function renderRefine(tab) {
  let back = ['#/today', ''];
  try { back = JSON.parse(sessionStorage.getItem('ls-work')) || back; } catch {}
  const backBtn = `<a class="btn" href="${esc(back[0])}">${T.backTo[back[1]] || T.backToday}</a>`;
  shell(`${hd(T.refineSub, T.refineTitle)}
    <div class="chips">${Object.entries(T.refineTabs).map(([k, v]) => `<a class="btn2" style="width:auto;margin:0;${k === tab ? 'background:var(--plum);color:var(--cream)' : ''}" href="#/refine/${k}">${v}</a>`).join('')}</div>
    ${(T.refine[tab] || []).map((x) => card(`<p class="it"><small>${esc(x.l)}</small>${esc(x.t)}</p>`)).join('')}
    ${backBtn}`, 'today');
}

// ===== הגדרות =====
function renderSettings() {
  const p = P();
  shell(`${hd('', T.settingsTitle, 'settings')}
    ${card(`<label class="q" for="nm">${T.myName}</label><input id="nm" type="text" value="${esc(p.full_name)}">`)}
    ${card(`<div class="ct">${p.share_journal ? T.shareStatusOn : T.shareStatusOff}</div><button class="btn2" id="sh">${p.share_journal ? T.shareToggleOn : T.shareToggleOff}</button>`)}
    ${card(`<div class="ct">${T.levelSettingsTitle}</div>${seg('level', levelOf(), [['being', T.levelBeing], ['full', T.levelFull]])}<p class="hint" id="lvh">${levelOf() === 'full' ? T.levelFullSub : T.levelBeingSub}</p><p class="hint">${T.levelSettingsHint}</p>`)}
    ${WFB_ON ? card(`<div class="ct">${T.fbSettingsTitle}</div><p class="hint">${fbActive() ? T.fbOnStatus : T.fbOffStatus}</p><div class="btnrow"><button class="btn2" id="wfb">${fbActive() ? T.fbTurnOff : T.fbTurnOn}</button>${WFB().length ? `<a class="btn2" href="#/reflect">${T.fbNav}</a>` : ''}</div>`) : ''}
    ${card(`<div class="ct">${T.genderTitle}</div>${seg('gender', p.gender === 'm' ? 'm' : 'f', [['f', T.genderF], ['m', T.genderM]])}`)}
    ${card(`<div class="ct">${T.pinTitle} ${tag(0)}</div><p class="hint">${p.pin_hash ? T.pinOnHint : T.pinOffHint}</p>
      <div class="btnrow"><a class="btn2" href="#/settings/pin">${p.pin_hash ? T.pinChange : T.pinSet}</a>${p.pin_hash ? `<button class="btn2" id="pinoff">${T.pinRemove}</button>` : ''}</div>`)}
    ${card(`<div class="ct">${T.installTitle}</div><p class="hint">${T.installIos}</p><p class="hint">${T.installAndroid}</p>`)}
    <a class="btn2" href="#/summary">${T.journalPdf}</a>
    ${p.is_admin ? `<a class="btn dark" href="#/admin">${T.adminLink}</a>` : ''}
    <button class="btn2" id="out">${T.logout}</button>
    <p class="hint" style="text-align:center">${esc(p.email || '')}</p>`, '');
  let t; $('#nm').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => api.saveProfile({ full_name: e.target.value.trim() }), 700); });
  $('#sh').addEventListener('click', () => { api.saveProfile({ share_journal: !p.share_journal }); toast(T.saved); renderSettings(); });
  const lv = { level: levelOf(), gender: p.gender === 'm' ? 'm' : 'f' }; bindForm(lv, () => {});
  $('#wfb')?.addEventListener('click', () => { api.saveProfile({ weekly_fb: fbActive() ? 'off' : 'on' }); toast(T.saved); renderSettings(); });
  $('[data-seg="gender"]').addEventListener('pick', (e) => { api.saveProfile({ gender: e.detail }); applyGender(e.detail); renderSettings(); toast(T.saved); });
  $('[data-seg="level"]').addEventListener('pick', (e) => { api.saveProfile({ level: e.detail }); $('#lvh').textContent = e.detail === 'full' ? T.levelFullSub : T.levelBeingSub; toast(T.saved); });
  $('#pinoff')?.addEventListener('click', () => { if (!confirm(T.pinRemoveQ)) return; api.saveProfile({ pin_hash: null }); toast(T.pinRemoved); renderSettings(); });
  $('#out').addEventListener('click', async () => { await api.logout(); setUnlocked(false); D = null; go('#/'); });
}

// ===== משוב בהתנסות =====
function renderFeedback() {
  const m = {};
  shell(`${hd('', T.feedbackTitle, 'feedback')}
    ${T.feedbackQs.map((q, i) => card(`<p class="q">${q}</p>${ta('q' + i, '', T.writeHere, 3)}`)).join('')}
    <button class="btn" id="send">${T.feedbackSend}</button><button class="btn2" id="later">${T.feedbackLater}</button>`, 'today');
  bindForm(m, () => {});
  $('#send').addEventListener('click', () => {
    const answers = T.feedbackQs.map((q, i) => ({ q, a: m['q' + i] || '' }));
    if (!answers.some((x) => filled(x.a))) return toast(T.feedbackEmpty);
    api.sendFeedback(answers); toast(T.feedbackThanks); go('#/today');
  });
  $('#later').addEventListener('click', () => { api.setFeedbackState('later:' + today()); go('#/today'); });
}

// ===== הצעה בסוף ההתנסות =====
// אחרי ההתנסות: הודעה עם קישור לדף ההצעה. בלי שעון אישי, התאריך למחיר המוזל אחד לכולן (CONFIG.OFFER_DEADLINE)
function renderOffer() {
  sessionStorage.setItem('offerSeen', today());
  const link = offerLink();
  const dl = CONFIG.OFFER_DEADLINE && CONFIG.OFFER_DEADLINE >= today() ? `${T.dayNames[parse(CONFIG.OFFER_DEADLINE).getDay()]} ${shortDate(CONFIG.OFFER_DEADLINE)}` : '';
  shell(`${hd('', T.offerTitle, 'club')}
    ${card(`<p class="ins">${T.offerSub}</p>
      ${dl ? `<p class="q" style="margin-top:12px">${T.offerDeadline(dl)}</p>` : ''}
      ${link ? `<a class="btn" href="${esc(link)}" target="_blank" rel="noopener">${T.offerCta}</a>` : ''}
      ${offerPdfLink()}`)}
    <a class="btn2" href="#/summary">${T.journalPdf}</a>
    ${offerActive() ? `<a class="btn2" href="#/settings">${T.settingsTitle}</a>` : `<a class="btn2" href="#/today">${T.backToday}</a>`}`, offerActive() ? 'locked' : '');
}

// ===== התנסות: מסך קופץ יומי, קובץ הדף, וסיכום מעוצב להורדה (שושי 21.11) =====
const offerLink = () => CONFIG.OFFER_LINK[kindOf()] || CONFIG.OFFER_LINK.graduate;
const offerPdfLink = () => { const f = (CONFIG.OFFER_PDF || {})[kindOf()] || (CONFIG.OFFER_PDF || {}).graduate; return f ? `<p class="hint" style="margin-top:10px;text-align:center"><a class="lnk" href="${esc(f)}" target="_blank" rel="noopener" download>${T.offerPdf}</a></p>` : ''; };
function maybeTrialPop() {
  const left = trialLeft(); if (!left || left < 1) return;
  let seen = null; try { seen = localStorage.getItem('ls-pop'); } catch {}
  if (seen === today() || document.querySelector('.modal.trialpop')) return;
  try { localStorage.setItem('ls-pop', today()); } catch {}
  const opener = document.activeElement;
  const m = document.createElement('div'); m.className = 'modal trialpop';
  m.innerHTML = `<div class="sheet help-card" role="dialog" aria-modal="true" aria-labelledby="tpt">
    <button class="close" type="button" aria-label="${T.trialPopStay}">×</button>
    <img src="${esc(CONFIG.MORNING_ART || 'img/note/art-morning-window.png')}" alt="" aria-hidden="true" style="display:block;width:120px;height:auto;margin:0 auto 8px">
    <h2 id="tpt">${esc(T.trialPopTitle(left))}</h2>
    <p>${esc(T.trialPopBody)}</p>
    <a class="btn" href="${esc(offerLink())}" target="_blank" rel="noopener">${T.trialPopCta}</a>
    ${offerPdfLink()}
    <button class="btn2" type="button" id="tpstay">${T.trialPopStay}</button></div>`;
  const close = () => { document.removeEventListener('keydown', onKey); m.remove(); opener?.focus?.({ preventScroll: true }); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('.close') || e.target.id === 'tpstay') close(); });
  document.body.appendChild(m); $('#tpstay', m).focus();
}
// סיכום מעוצב של כל מה שכתבה בשבוע ההתנסות, עם כפתור להורדה כ-PDF
function journalData() {
  const f = F(); const p = P();
  const ks = Object.keys(D.days).sort().filter((k) => { const d = D.days[k]; return d.opened_at || d.closed_at; });
  const st = { done: 'בוצע', partial: 'חלקית', no: 'לא הפעם' };
  const rows = (list) => list.filter(([, v]) => filled(v)).map(([l, v]) => [l, String(v).trim()]);
  const sections = [];
  const base = rows([[T.convPick.future, f.future_general], ['בתחום שבחרתי', f.future_specific],
    ['הישג המפתח', f.achievement ? f.achievement + (f.achievement_date ? ' · עד ' + shortDate(f.achievement_date) : '') : '']]);
  if (base.length) sections.push({ head: T.baseTitle, rows: base });
  ks.forEach((k) => { const d = D.days[k];
    const r = rows([
      ['ההוויה של היום', d.being ? d.being + ((d.sub_beings || []).filter(Boolean).length ? ' · ' + d.sub_beings.filter(Boolean).join(', ') : '') : ''],
      ['למה זה חשוב לי היום', d.why_today],
      ['הסימן שלי להוויה', d.being_sign ? d.being_sign + (d.sign_status ? ' · ' + (st[d.sign_status] || '') : '') : ''],
      ['פעולת המפתח', d.key_action ? d.key_action + (d.key_status ? ' · ' + (st[d.key_status] || '') : '') : ''],
      ['מה עלול להוציא אותי', d.may_derail], ['מה יעזור לי לחזור', d.recover],
      ['רגע של שיחה', d.win_belief], ['איך עבר עליי היום', d.day_how],
      ['איפה מצאתי את עצמי בהוויה', d.being_found],
      ['מה הוציא אותי', [d.out_situation, d.out_inner, d.out_thought].filter(filled).join('\n')],
      ['מה עזר לי לחזור', d.back_help], ['תודה', d.thanks],
      ['גילוי', d.insight], ['גילוי להיות איתו', d.hug_find], ['חיזוק ללכת איתו', d.strength_find]]);
    if (r.length) sections.push({ head: dayLabel(k), rows: r }); });
  const sub = (p.full_name || '') + (ks.length ? ' · ' + shortDate(ks[0]) + ' - ' + shortDate(ks[ks.length - 1]) : '');
  return { title: T.journalTitle, sub, sections, footer: (CONFIG.NOTE_APP_NAME || T.appName) + ' · עם ' + (CONFIG.NOTE_SIGNATURE || 'שושי זליקוביץ׳') };
}
function journalHtml() {
  const j = journalData();
  return `<div class="journal" id="journal">
    <header class="jhd"><img src="${esc(CONFIG.NOTE_LOGO || 'img/aro-wide.png')}" alt="${esc(T.appName)}" width="260" height="70"><img class="jart" src="${esc(CONFIG.NOTE_ART || 'img/note/art-book.png')}" alt="" aria-hidden="true" width="150" height="150"></header>
    <h1>${esc(j.title)}</h1><p class="jsub">${esc(j.sub)}</p>
    ${j.sections.map((sec) => `<section class="jsec"><h2>${esc(sec.head)}</h2>${sec.rows.map(([l, v]) => `<div class="jrow"><span class="jl">${esc(l)}</span><p>${esc(v).replace(/\n/g, '<br>')}</p></div>`).join('')}</section>`).join('') || `<p class="hint">${esc(T.noDataYet)}</p>`}
    <footer class="jft">${esc(j.footer)}</footer>
  </div>`;
}
async function journalPdfBlob() {
  if (!window.jspdf) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const pages = await journalPages(journalData());
  const pdf = new window.jspdf.jsPDF({ unit: 'px', format: [1240, 1754], hotfixes: ['px_scaling'] });
  pages.forEach((cv, i) => { if (i) pdf.addPage([1240, 1754]); pdf.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 1240, 1754); });
  return pdf.output('blob');
}
function renderSummary() {
  shell(`${journalHtml()}
    <button class="btn" type="button" id="jpdf">${T.journalPdf}</button>
    <a class="btn2" href="${offerActive() ? '#/offer' : '#/today'}">${offerActive() ? T.offerCta : T.backToday}</a>`, offerActive() ? 'locked' : '');
  $('#jpdf').addEventListener('click', async (e) => {
    const b = e.currentTarget; const label = b.textContent; b.disabled = true; b.textContent = T.journalSaving;
    try {
      const blob = await journalPdfBlob();
      const file = new File([blob], 'שבוע-ההתנסות-שלי.pdf', { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); } catch {} }
      else { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
    } catch { toast(T.saveFailed || 'לא הצלחנו ליצור את הקובץ. נסי שוב בעוד רגע.'); }
    b.disabled = false; b.textContent = label;
  });
}

// ===== התקנה כאפליקציה =====
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
render();
