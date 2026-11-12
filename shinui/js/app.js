// לשחק את השינוי - האפליקציה. ניתוב לפי # בכתובת, מסך אחד בכל פעם.
import { api } from './api.js';
import { T } from './content.js';
import { CONFIG } from './config.js';
import { morningNote, sticker, wallpaper, saveCanvas } from './img.js';
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
const dayLabel = (s) => { const d = parse(s); return `יום ${T.dayNames[d.getDay()]} · ${d.getDate()}.${d.getMonth() + 1}`; };
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
const channelsDone = () => ['physical', 'cognitive', 'spiritual', 'emotional'].every((k) => (F().channels || {})[k] && filled(F().channels[k].score));
const futureDone = () => filled(F().future_general) || filled(F().future_specific);
const firstName = () => (P().full_name || '').split(' ')[0];
const weekNumber = (ws) => { const start = weekStart(iso(new Date(P().created_at || Date.now()))); return Math.max(1, Math.floor(daysBetween(start, ws) / 7) + 1); };
const kindOf = () => (P().kind && P().kind !== 'other' ? P().kind : P().self_kind || 'other');

// ===== הודעה קטנה =====
let toastT;
function toast(msg) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2600);
}
api.on((e) => { if (e === 'offline') toast(T.offline); if (e === 'save-error') toast(T.saveError); if (e === 'logout') go('#/'); });

// ===== שלד =====
const logoImg = (cls = 'lg') => `<img class="${cls}" src="img/aro-wide.png" width="1269" height="338" alt="אשה רוצה עושה">`;
function shell(body, tab, { wide = false } = {}) {
  root.classList.toggle('wide-root', !!wide); // במחשב: הדשבורד רחב, כל השאר בצורת טלפון
  const tabs = Object.entries(T.tabs).map(([k, v]) => `<a href="#/${k}" class="${tab === k ? 'on' : ''}" ${tab === k ? 'aria-current="page"' : ''}>${v}</a>`).join('');
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
const hd = (small, title) => `<header class="hd">${small ? `<small>${esc(small)}</small>` : ''}<h1>${esc(title)}</h1></header>`;
const tag = (req) => `<span class="tag ${req ? 'm' : 'o'}">${req ? T.required : T.optional}</span>`;
// כפתור ״מה זה?״ ליד כל חלק. מופיע רק כשיש לחלק כרטיס הסבר
const helpRow = (k) => (T.help[k] ? `<div class="hrow">${helpBtn(k)}</div>` : '');
const helpBtn = (k) => (T.help[k] ? `<button type="button" class="help" data-help="${k}" aria-haspopup="dialog">${T.helpOpen}</button>` : '');
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

let linkChecked = false;
async function render() {
  if (!linkChecked) { linkChecked = true; if (await api.fromLink()) D = null; }
  const user = api.user();
  root.classList.remove('wide-root');
  if (!user) return renderLogin();
  if (!D) {
    root.innerHTML = `<main class="app"><div class="top">${logoImg()}</div></main>`;
    try { D = await api.load(); } catch (e) { root.innerHTML = `<main class="app"><p class="err">${esc(e.message)}</p><button class="btn" onclick="location.reload()">לנסות שוב</button></main>`; return; }
  }
  if (!P().terms_at) return renderTerms();
  const [, r1, r2] = (location.hash || '#/today').split('?')[0].split('/');
  // אחרי ההתנסות: מסך ההצעה פעם ביום
  if (offerActive() && r1 !== 'offer' && r1 !== 'settings' && sessionStorage.getItem('offerSeen') !== today()) return go('#/offer');
  switch (r1) {
    case 'week': return r2 === 'open' ? renderWeekOpen() : r2 === 'close' ? renderWeekClose() : renderWeek();
    case 'progress': return renderProgress();
    case 'collection': return renderCollection();
    case 'base': return r2 ? renderBasePart(r2) : renderBase();
    case 'note': return renderNote(r2 || today());
    case 'sticker': return renderSticker(r2 || today());
    case 'close': return renderClose(r2 || today());
    case 'open': return renderOpen(r2 || today());
    case 'refine': return renderRefine(r2 || 'open');
    case 'settings': return renderSettings();
    case 'feedback': return renderFeedback();
    case 'offer': return renderOffer();
    case 'admin': return P().is_admin ? renderAdmin({ root, api, T, esc, shell, toast, CONFIG }) : go('#/today');
    default: return renderToday();
  }
}

// ===== כניסה =====
function renderLogin(step = 'email', email = '') {
  root.innerHTML = `<main class="app"><div class="login">
    ${logoImg()}
    ${hd(T.loginSub, T.loginTitle)}
    ${api.live ? '' : `<div class="banner demo">${T.demoBanner}</div>`}
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
        await api.verify(email, $('#cd').value || '000000'); D = null; go('#/today');
      }
    } catch (x) { er.textContent = step === 'code' ? T.badCode : x.code === 'not_invited' ? T.notInvited : x.message === T.badEmail ? T.badEmail : T.genericError; er.hidden = false; b.disabled = false; }
  });
}

// ===== תקנון ופרטיות (פעם אחת) =====
function renderTerms() {
  const m = { full_name: P().full_name || '', share: null, kind: P().self_kind || (P().kind !== 'other' ? P().kind : null) };
  root.innerHTML = `<main class="app"><div class="login">${logoImg()}${hd('', T.termsTitle)}
    <section class="card">
      <ul class="lstx">${T.termsLines.map((l) => `<li class="it" style="margin-bottom:8px">${l}</li>`).join('')}</ul>
      <label class="q" for="nm">${T.nameLabel}</label><input id="nm" type="text" autocomplete="name" value="${esc(m.full_name)}">
      <p class="q">${T.kindQ}</p>${seg('kind', m.kind, Object.entries(T.kinds))}
      <p class="q">${T.shareQ}</p>${seg('share', null, [['yes', T.shareYes], ['no', T.shareNo]])}
      <p class="hint">${T.shareNote}</p>
      <label class="agree"><input type="checkbox" id="ag"> ${T.termsAgree}</label>
      ${CONFIG.TERMS_LINK ? `<a href="${esc(CONFIG.TERMS_LINK)}" target="_blank" rel="noopener">${T.termsLink}</a>` : ''}
      <p class="err" id="er" role="alert" hidden></p>
      <button class="btn" id="go">${T.enter}</button>
    </section></div></main>`;
  bindForm(m, () => {});
  $('#go').addEventListener('click', () => {
    const er = $('#er');
    if (!$('#ag').checked) { er.textContent = T.mustAgree; er.hidden = false; return; }
    api.saveProfile({ full_name: $('#nm').value.trim(), share_journal: m.share === 'yes', self_kind: m.kind || null, terms_at: new Date().toISOString() });
    go('#/base');
  });
}

// ===== פסים בראש ״היום״ =====
function trialLeft() { const e = P().trial_end; if (!e || P().member) return null; return daysBetween(today(), e) + 1; }
function offerActive() { const left = trialLeft(); return left !== null && left <= 0; }
function banners() {
  const out = []; const t = today();
  const left = trialLeft();
  if (left && left > 0) out.push(`<div class="banner soft">${T.trialBanner(left)}</div>`);
  // שאלת משוב ביום 5 או 6 של ההתנסות
  const st = api.feedbackState();
  if (P().trial_start && left !== null && left > 0 && daysBetween(P().trial_start, t) >= 4 && st !== 'sent' && st !== 'later:' + t)
    out.push(`<div class="banner soft"><b>${T.feedbackTitle}</b><a class="lnk" href="#/feedback">${T.feedbackOpen}</a></div>`);
  const y = addDays(t, -1); const yd = D.days[y];
  if (yd && yd.opened_at && !yd.closed_at && new Date().getHours() < 14)
    out.push(`<div class="banner">${T.closeYesterday} <a class="lnk" href="#/close/${y}">${T.closeYesterdayCta}</a></div>`);
  if (hasAchievement() && F().achievement_date && F().achievement_date < t) out.push(`<div class="banner">${T.achievementPassedBanner} <a class="lnk" href="#/base/achievement">${T.achievementPassedCta}</a></div>`);
  if (!hasBase()) out.push(`<div class="banner"><b>${T.baseTitle}</b>${T.needBaseBanner} <a class="lnk" href="#/base">${T.baseGo}</a></div>`);
  else {
    const w = D.weeks[weekStart(t)];
    if (!w || !w.opened_at) out.push(`<div class="banner soft">${T.weekNoteReminder} <a class="lnk" href="#/week/open">${T.weekNoteCta}</a></div>`);
  }
  return out.join('');
}

// ===== היום =====
function renderToday() {
  const t = today(); const d = D.days[t] || {};
  if (!d.opened_at) return renderOpen(t, true);
  if (!d.closed_at) {
    shell(`${banners()}${hd(dayLabel(t), T.dayOpenedTitle)}
      ${card(`<p class="ach">${esc(T.noteToday)} ${esc(d.being)}.</p>
        ${(d.sub_beings || []).filter(Boolean).length ? `<p class="hint">${esc(d.sub_beings.filter(Boolean).join(' · '))}</p>` : ''}
        <p class="q">${hasBase() ? T.keyAction : T.keyActionSmall}</p><p class="it">${esc([d.key_action, d.key_amount, d.key_when].filter(Boolean).join(' · '))}</p>
        ${d.win_belief ? `<p class="hint" style="margin-top:8px">״${esc(d.win_belief)}״</p>` : ''}`)}
      <p class="hint">${T.dayOpenedSub}</p>
      <a class="btn" href="#/close/${t}">${T.toClose}</a>
      <div class="btnrow"><a class="btn2" href="#/note/${t}">${T.toMorningNote}</a><a class="btn2" href="#/open/${t}">${T.editOpening}</a></div>`, 'today');
    return;
  }
  shell(`${banners()}${hd(dayLabel(t), T.dayClosedTitle)}
    ${card(`<p class="q">${T.insightQ}</p><p class="ins">${esc(d.insight)}</p>`)}
    <a class="btn" href="#/sticker/${t}">${T.toSticker}</a>
    <div class="btnrow"><a class="btn2" href="#/close/${t}">${T.editClosing}</a><a class="btn2" href="#/progress">${T.tabs.progress}</a></div>
    ${card(`<p class="it" style="text-align:center">${T.dayClosedQuote}<small style="color:inherit;font-weight:400">${T.dayClosedQuoteBy}</small></p>`, 'flat')}`, 'today');
}

// ===== פתיחת יום =====
// כפתורי הוויות: כל הרשימה מהיומן, ובסוף הוויות שהיא כתבה בעצמה
const allBeings = () => [...new Set([...T.beingsAll, ...(P().beings || [])].filter(Boolean))];
const beingChips = (id, isOn) => `<div class="chips bgrid" id="${id}">${allBeings().map((b) => `<button type="button" aria-pressed="${isOn(b)}" class="${isOn(b) ? 'on' : ''}" data-b="${esc(b)}">${esc(b)}</button>`).join('')}</div>`;
function renderOpen(day, isToday = false) {
  const prev = Object.keys(D.days).filter((k) => k < day && D.days[k].being).sort().pop();
  const pd = prev ? D.days[prev] : {};
  const m = { being: '', sub_beings: ['', '', '', ''], steps: [{}, {}, {}], ...(D.days[day] || {}) };
  if (!m.sub_beings || m.sub_beings.length < 4) m.sub_beings = [...(m.sub_beings || []), '', '', '', ''].slice(0, 4);
  m.steps = [0, 1, 2].map((i) => ({ ...((m.steps || [])[i] || {}) }));
  const base = hasBase();
  let openMain = !m.being, openSub = false;
  const draw = () => {
    const ach = hasAchievement() ? card(`<div class="ct">${T.achievementTop} ${helpBtn('achievement')}</div><p class="ach">${esc(F().achievement)}</p>${F().achievement_date ? `<p class="hint">${esc(T.achievementDate)}: ${esc(shortDate(F().achievement_date))}</p>` : ''}`, 'flat') : '';
    shell(`${isToday ? banners() : ''}${hd(dayLabel(day), isToday ? T.goodMorning(firstName()) : T.openDayTitle)}
    ${ach}
    ${card(`<div class="ct">${base ? T.keyActionToday : T.keyActionSmall} ${tag(1)} ${helpBtn('key_action')}</div><p class="hint">${T.keyActionHint}</p>
      ${ta('key_action', m.key_action, T.keyActionPh, 2)}
      <div class="row2" style="margin-top:8px">${inp('key_amount', m.key_amount, T.keyAmount)}${inp('key_when', m.key_when, T.keyWhen)}</div>`, '', 'key')}
    ${card(`<div class="ct">${T.stepsTitle} ${tag(0)} ${helpBtn('steps')}</div><p class="hint">${T.stepsHint}</p>
      <div class="steps">${[0, 1, 2].map((i) => `<div class="stp"><b aria-hidden="true">${i + 1}</b>${inp(`steps.${i}.text`, m.steps[i].text, T.stepPh(i + 1))}</div>`).join('')}</div>`)}
    ${card(`<small class="over">${T.beingSub}</small><div class="ct">${T.beingTitle} ${tag(1)} ${helpBtn('being')}</div>
      ${openMain ? `<p class="hint">${T.beingsPickHint}</p>${beingChips('bmain', (b) => b === m.being)}${inp('being', m.being, T.beingPlaceholder)}`
        : `<div class="chips"><button type="button" class="on" disabled>${esc(m.being)}</button><button type="button" class="more" id="chg">${T.beingsChange}</button></div>`}`, '', 'being')}
    ${card(`<div class="ct"><span id="bm">${esc(T.beingMeaning(m.being))}</span> ${tag(1)} ${helpBtn('sub_beings')}</div><p class="hint">${T.subBeingsHint}</p>
      ${pd.sub_beings && pd.being === m.being && !m.sub_beings.some(Boolean) ? `<button type="button" class="more" id="lastsub">${T.useLastSub}</button>` : ''}
      <div class="row2">${[0, 1, 2, 3].map((i) => inp('sub_beings.' + i, m.sub_beings[i], T.subBeingPh(i + 1))).join('')}</div>
      <button type="button" class="more" id="subtog" aria-expanded="${openSub}">${openSub ? T.beingsHide : T.beingsShowAll}</button>
      ${openSub ? beingChips('bsub', (b) => m.sub_beings.includes(b)) : ''}`, '', 'sub')}
    ${card(`<div class="ct">${T.beingSign} ${tag(0)} ${helpBtn('being_sign')}</div><p class="hint">${T.beingSignHint}</p>
      ${ta('being_sign', m.being_sign, T.writeHere, 2)}
      <details class="qs"><summary>${T.beingSignExamplesTitle}</summary><ul>${T.beingSignExamples.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`)}
    ${card(`<div class="ct">${T.optionalMore} ${tag(0)}</div>
      <p class="q">${T.mayDerail}</p>${ta('may_derail', m.may_derail)}
      <p class="q">${T.recover}</p>${ta('recover', m.recover)}
      <p class="q">${T.whereNeeded}</p>${ta('where_needed', m.where_needed)}`)}
    ${card(`<div class="ct">${T.convTitle} ${tag(0)} ${helpBtn('future_talk')}</div>
      <p class="q">${T.convPickQ}</p>${seg('voice', m.voice || 'future', Object.entries(T.convPick))}
      <p class="guide" id="cg">${m.voice === 'god' ? T.convGuideGod : T.convGuideFuture}</p>
      <p class="q" id="cf">${m.voice === 'god' ? T.convFieldGod : T.convFieldFuture}</p><p class="hint">${T.convHint}</p>
      ${ta('win_belief', m.win_belief, T.writeHere, 5)}`, 'conv')}
    <p class="err" id="er" role="alert" hidden></p>
    <button class="btn" id="done">${m.opened_at ? T.saveBase : T.openedDay}</button>
    <a class="btn2" href="#/refine/open">${T.howToRefine}</a>`, isToday ? 'today' : '');
    wire();
  };
  const save = (x) => api.saveDay(day, { being: x.being, sub_beings: x.sub_beings, key_action: x.key_action, key_amount: x.key_amount, key_when: x.key_when, steps: x.steps.some((st) => filled(st.text)) ? x.steps : [], being_sign: x.being_sign, where_needed: x.where_needed, may_derail: x.may_derail, recover: x.recover, win_belief: x.win_belief, voice: x.voice || 'future' });
  const wire = () => {
    const flushNow = bindForm(m, save);
    const beingInput = $('[data-k="being"]');
    beingInput?.addEventListener('input', () => { $('#bm').textContent = T.beingMeaning(m.being); $$('#bmain button').forEach((b) => { b.classList.toggle('on', b.dataset.b === m.being); b.setAttribute('aria-pressed', b.dataset.b === m.being); }); });
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
      if (!filled(m.key_action)) miss.push('key');
      if (!filled(m.being)) miss.push('being');
      if (m.sub_beings.filter(filled).length < 4) miss.push('sub');
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
  const subs = (d.sub_beings || []).map((s) => s || '');
  const m = { sub_presence: [], ...d, deep: { ...(d.deep || {}) }, steps: (d.steps || []).map((x) => ({ ...x })) };
  m.sub_presence = [0, 1, 2, 3].map((i) => (d.sub_presence || [])[i] ?? null);
  const steps = m.steps.map((x, i) => [x, i]).filter(([x]) => filled(x.text));
  const deepCount = Object.values(m.deep).filter(filled).length;
  shell(`${hd(dayLabel(day) + ' · ' + T.closeDayLabel, T.closeDayTitle)}
    ${card(`<div class="ct">${esc(T.presenceQ(d.being))} ${tag(1)} ${helpBtn('presence')}</div>${scale('presence', m.presence, T.presenceQ(d.being))}`, '', 'presence')}
    ${subs.some(Boolean) ? card(`<div class="ct">${T.subPresenceQ} ${tag(1)}</div>
      ${subs.map((s, i) => s ? `<div class="rt"><span>${esc(s)}</span>${scale('sub_presence.' + i, m.sub_presence[i], s)}</div>` : '').join('')}`, '', 'subp') : ''}
    ${card(`<div class="ct">${hasBase() ? T.keyAction : T.keyActionSmall} ${tag(1)}</div>
      <p class="hint">${esc([d.key_action, d.key_amount].filter(Boolean).join(' · '))}</p>
      ${seg('key_status', m.key_status, Object.entries(T.keyStatus))}
      ${inp('key_of', m.key_of, T.keyOfPh)}
      <p class="q">${T.keyReflectQ} ${tag(0)}</p>${ta('key_reflect', m.key_reflect, T.keyReflectPh, 2)}`, '', 'keys')}
    ${steps.length ? card(`<div class="ct">${T.stepsCloseQ} ${tag(0)}</div>
      ${steps.map(([x, i]) => `<p class="q">${esc(x.text)}</p>${seg(`steps.${i}.status`, x.status, Object.entries(T.stepStatus))}`).join('')}
      <p class="q">${T.stepsReflectQ}</p>${ta('steps_reflect', m.steps_reflect, T.writeHere, 2)}`) : ''}
    ${filled(d.being_sign) ? card(`<div class="ct">${T.signCloseQ} ${tag(0)}</div><p class="hint">${esc(d.being_sign)}</p>
      ${seg('sign_status', m.sign_status, Object.entries(T.signStatus))}`) : ''}
    ${card(`<div class="ct">${T.generalTitle}</div>
      <p class="q">${T.dayHowQ} ${tag(0)}</p>${ta('day_how', m.day_how, T.writeHere, 2)}
      <div data-req="insight"><p class="q">${T.insightQ} ${tag(1)} ${helpBtn('insight')}</p>${ta('insight', m.insight, T.writeHere, 3)}</div>
      <p class="q">${T.thanksQ} ${tag(0)}</p>${ta('thanks', m.thanks)}`)}
    ${card(`<div class="ct">${T.optionalMore} ${tag(0)}</div>
      <p class="q">${T.gapQ}</p>${ta('gap_moment', m.gap_moment)}
      <p class="q">${T.extraCloseQ}</p>${ta('extra_close', m.extra_close)}
      <p class="q">${T.openTomorrowQ}</p>${inp('open_tomorrow', m.open_tomorrow, '7:00', 'text', 'inputmode="numeric"')}`)}
    <section class="card deep"><details ${deepCount ? 'open' : ''}><summary><span class="ct" style="margin:0">${T.deepTitle} ${tag(0)}</span></summary>
      <div class="ct" style="justify-content:flex-start">${helpBtn('deep')}</div>
      <p class="hint">${T.deepIntro}</p>
      ${T.deep.map((g) => `<h3 class="dh">${esc(g.h)}</h3>${g.sub ? `<p class="hint">${esc(g.sub)}</p>` : ''}
        ${g.qs.map(([k, q]) => `${q && k !== 'g0' ? `<p class="q">${esc(q)}</p>` : ''}${ta('deep.' + k, m.deep[k], T.writeHere, 2)}`).join('')}`).join('')}
    </details></section>
    <p class="err" id="er" role="alert" hidden></p>
    <button class="btn" id="done">${d.closed_at ? T.saveBase : T.closedDay}</button>
    <a class="btn2" href="#/refine/close">${T.howToRefineClose}</a>`, day === today() ? 'today' : '');
  const save = (x) => api.saveDay(day, { presence: x.presence, sub_presence: x.sub_presence, key_status: x.key_status, key_of: x.key_of, key_reflect: x.key_reflect, steps: x.steps, steps_reflect: x.steps_reflect, day_how: x.day_how, sign_status: x.sign_status || null, insight: x.insight, gap_moment: x.gap_moment, thanks: x.thanks, extra_close: x.extra_close, open_tomorrow: x.open_tomorrow, deep: x.deep });
  const flushNow = bindForm(m, save);
  $('#done').addEventListener('click', () => {
    flushNow();
    const miss = [];
    if (m.presence == null) miss.push('presence');
    if (subs.some((s, i) => s && m.sub_presence[i] == null)) miss.push('subp');
    if (!m.key_status) miss.push('keys');
    if (!filled(m.insight)) miss.push('insight');
    if (miss.length) { const er = $('#er'); er.textContent = T.missingRequired + ' ' + miss.map((k) => T.reqNames[k]).join(', '); er.hidden = false; return markMissing(miss); }
    api.saveDay(day, { closed_at: D.days[day].closed_at || new Date().toISOString() });
    toast(T.dayClosedToast);
    go('#/today');
  });
}

// ===== פתק בוקר =====
async function renderNote(day) {
  const d = D.days[day]; if (!d || !d.opened_at) return go('#/today');
  let full = false, wall = false;
  shell(`${hd(T.noteSub, T.noteTitle)}${helpRow('morning_note')}
    <div class="seg" role="radiogroup" id="kind"><button type="button" class="on" role="radio" aria-checked="true" data-v="0">${T.noteShort}</button><button type="button" role="radio" aria-checked="false" data-v="1">${T.noteFull}</button>${filled(d.win_belief) ? `<button type="button" role="radio" aria-checked="false" data-v="2">${T.noteWall}</button>` : ''}</div>
    <p class="hint" id="wh" hidden>${T.wallpaperHint}</p>
    <div class="preview" id="pv" aria-live="polite"></div>
    <button class="btn" id="save">${T.saveImage}</button>
    <button class="btn2" id="share">${T.shareImage}</button>
    <a class="btn2" href="#/today">${T.backToday}</a>`, 'today');
  let cv;
  const draw = async () => { cv = wall ? await wallpaper(d.win_belief, { head: d.voice === 'god' ? T.wallHeadGod : T.wallHeadFuture }) : await morningNote({ ...d, hasBase: hasBase() }, { full, dateLabel: dayLabel(day) }); const pv = $('#pv'); if (!pv) return; pv.innerHTML = ''; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', T.noteTitle); pv.appendChild(cv); };
  await draw();
  $('#kind').addEventListener('click', async (e) => { const b = e.target.closest('button'); if (!b) return; full = b.dataset.v === '1'; wall = b.dataset.v === '2'; $('#wh').hidden = !wall; $$('#kind button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); await draw(); });
  const fname = () => `${wall ? 'שומר-מסך' : 'פתק-בוקר'}-${day}.png`;
  $('#save').addEventListener('click', async () => { if ((await saveCanvas(cv, fname())) !== 'cancel') toast(T.saved); });
  $('#share').addEventListener('click', () => saveCanvas(cv, fname(), true));
}

// ===== סטיקר תובנה =====
async function renderSticker(day) {
  const d = D.days[day]; if (!d || !filled(d.insight)) return go('#/today');
  let withName = true;
  shell(`${hd(T.stickerSub, T.stickerTitle)}${helpRow('sticker')}
    <div class="seg" id="nm" role="radiogroup" aria-label="שם בסטיקר"><button type="button" role="radio" aria-checked="true" class="on" data-v="1">${T.withName}</button><button type="button" role="radio" aria-checked="false" data-v="0">${T.noName}</button></div>
    <div class="preview" id="pv"></div>
    <button class="btn" id="save">${T.saveImage}</button>
    <button class="btn2" id="share">${T.shareImageGroup}</button>
    <p class="hint" style="text-align:center">${T.stickerSaved}</p>`, 'today');
  let cv;
  const draw = async () => { cv = await sticker(d.insight, { name: withName ? firstName() : '', dateLabel: shortDate(day) }); cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', d.insight); const pv = $('#pv'); if (!pv) return; pv.innerHTML = ''; pv.appendChild(cv); };
  await draw();
  if (!d.sticker) api.saveDay(day, { sticker: true });
  $('#nm').addEventListener('click', async (e) => { const b = e.target.closest('button'); if (!b) return; withName = b.dataset.v === '1'; $$('#nm button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); await draw(); });
  $('#save').addEventListener('click', async () => { if ((await saveCanvas(cv, `גילוי-${day}.png`)) !== 'cancel') toast(T.saved); });
  $('#share').addEventListener('click', () => saveCanvas(cv, `גילוי-${day}.png`, true));
}

// ===== שבוע =====
function renderWeek() {
  const ws = weekStart(today()); const w = D.weeks[ws] || {};
  const prevWs = addDays(ws, -7); const pw = D.weeks[prevWs];
  const dow = new Date().getDay();
  // סגירת השבוע הקודם, אם נפתח ולא נסגר
  const prevOpen = pw && pw.opened_at && !pw.closed_at;
  let body = `${hd(T.weekNum(weekNumber(ws)), w.opened_at ? T.weekOpened : T.weekOpenTitle)}`;
  if (!hasBase()) body += `<div class="banner">${T.needBaseWeek} <a class="lnk" href="#/base">${T.baseGo}</a></div>`;
  if (prevOpen) body += `<div class="banner soft"><b>${T.prevWeekOpen}</b><a class="lnk" href="#/week/close?${prevWs}">${T.weekCloseTitle}</a></div>`;
  if (w.opened_at) {
    body += card(`<p class="q">${T.weekResult}</p><p class="ach">${esc(w.result)}</p>
      ${(w.habits || []).filter((h) => filled(h.text)).length ? `<p class="q">${T.weekHabits}</p>${w.habits.filter((h) => filled(h.text)).map((h) => `<p class="it">${esc([h.text, h.amount, h.freq && h.freq + ' ' + T.times, h.days].filter(Boolean).join(' · '))}</p>`).join('')}` : ''}
      ${(w.onetime || []).filter((h) => filled(h.text)).length ? `<p class="q">${T.weekOnce}</p>${w.onetime.filter((h) => filled(h.text)).map((h) => `<p class="it">${esc([h.day, h.text].filter(Boolean).join(' · '))}</p>`).join('')}` : ''}
      ${w.win_belief ? `<p class="hint" style="margin-top:8px">״${esc(w.win_belief)}״</p>` : ''}`);
    body += w.closed_at
      ? `<div class="banner soft"><b>${T.weekClosed}</b></div><a class="btn2" href="#/week/close?${ws}">${T.weekCloseTitle}</a>`
      : `${dow >= 4 ? `<a class="btn" href="#/week/close?${ws}">${T.weekCloseTitle}</a>` : `<p class="hint">${T.weekCloseWhen}</p><a class="btn2" href="#/week/close?${ws}">${T.weekCloseTitle}</a>`}`;
    body += `<a class="btn2" href="#/week/open">${T.editWeek}</a>`;
  } else {
    body += `<p class="hint">${T.weekOpenWhen}</p><a class="btn" href="#/week/open">${T.weekNoteCta}</a>`;
  }
  shell(body, 'week');
}

function renderWeekOpen() {
  const ws = weekStart(today());
  const m = { habits: [], onetime: [], channels: {}, ...(D.weeks[ws] || {}) };
  if (!m.habits.length) m.habits = (F().plan_habits || []).filter((h) => filled(h.text)).map((h) => ({ ...h })).slice(0, 3);
  if (!m.habits.length) m.habits = [{}];
  if (!m.onetime.length) m.onetime = [{}];
  const habitRow = (h, i) => `<div class="rowi">${i ? `<button type="button" class="x" data-del="habits.${i}" aria-label="להסיר">×</button>` : ''}
      ${inp(`habits.${i}.text`, h.text, T.habitText)}<div class="row3" style="margin-top:8px">${inp(`habits.${i}.amount`, h.amount, T.habitAmount)}${inp(`habits.${i}.freq`, h.freq, T.habitFreq, 'text', 'inputmode="numeric"')}${inp(`habits.${i}.days`, h.days, T.habitDays)}</div></div>`;
  const onceRow = (h, i) => `<div class="rowi">${i ? `<button type="button" class="x" data-del="onetime.${i}" aria-label="להסיר">×</button>` : ''}
      <div class="row3" style="grid-template-columns:2fr 1fr">${inp(`onetime.${i}.text`, h.text, T.onceText)}${inp(`onetime.${i}.day`, h.day, T.onceDay)}</div></div>`;
  const draw = () => {
    shell(`${hd(T.weekNum(weekNumber(ws)), T.weekOpenTitle)}${helpRow('week_note')}
      ${!hasBase() ? `<div class="banner">${T.needBaseWeek} <a class="lnk" href="#/base">${T.baseGo}</a></div>` : ''}
      ${card(`<div class="ct">${T.weekResult} ${tag(1)}</div><p class="hint">${T.weekResultHint}</p>${ta('result', m.result, '', 2)}
        ${hasAchievement() ? `<p class="hint" style="margin-top:8px"><b>${T.achievementCard}:</b> ${esc(F().achievement)}</p>` : ''}`, '', 'result')}
      ${card(`<div class="ct">${T.weekHabits} ${tag(1)} <span class="hint" style="margin:0">${T.weekHabitsHint}</span></div>
        <div class="rows">${m.habits.map(habitRow).join('')}</div><button type="button" class="more" data-add="habits">${T.addRow}</button>`, '', 'habits')}
      ${card(`<div class="ct">${T.weekOnce} ${tag(1)} <span class="hint" style="margin:0">${T.weekOnceHint}</span></div>
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
      if (!m.onetime.some((h) => filled(h.text) && filled(h.day))) miss.push('once');
      if (miss.length) { const er = $('#er'); er.textContent = T.missingRequired + ' ' + miss.map((k) => T.reqNames[k]).join(', '); er.hidden = false; return markMissing(miss); }
      api.saveWeek(ws, { opened_at: (D.weeks[ws] || {}).opened_at || new Date().toISOString() });
      toast(T.weekOpenedToast); go('#/week');
    });
  };
  draw();
}

function renderWeekClose() {
  const q = (location.hash.split('?')[1] || '');
  const ws = /^\d{4}-\d\d-\d\d$/.test(q) ? q : weekStart(today());
  const m = { ...(D.weeks[ws] || {}) };
  shell(`${hd(T.weekNum(weekNumber(ws)), T.weekCloseTitle)}${helpRow('debrief')}
    <p class="hint">${T.weekNoClose}</p>
    ${card(`<div class="ct">${T.progressQ} ${tag(1)}</div>
      ${hasAchievement() ? `<p class="hint">${esc(F().achievement)}</p>` : ''}
      ${ta('progress', m.progress, T.progressPh, 2)}
      <p class="q">${T.progressPct}</p>${inp('progress_pct', m.progress_pct, '0-100', 'number', 'min="0" max="100" inputmode="numeric"')}`, '', 'progress')}
    ${card(`<div class="ct">${T.noteTypeQ} ${tag(1)}</div>${seg('note_type', m.note_type, Object.entries(T.noteType))}
      <details class="qs"><summary>${T.noteTypeRemind}</summary><p class="hint">${T.noteTypeExplain}</p></details>`, '', 'note_type')}
    ${card(`<div class="ct">${T.successGap} ${tag(1)}</div>${ta('success', m.success, T.successPh, 2)}<div style="height:8px"></div>${ta('gap', m.gap, T.gapPh, 2)}`, '', 'sg')}
    ${card(`<div class="ct">${T.heart} ${tag(1)}</div><p class="hint">${T.heartHint}</p>${ta('heart', m.heart, T.writeHere, 3)}`, '', 'heart')}
    ${card(`<div class="ct">${T.eyes} ${tag(1)}</div><p class="hint">${T.eyesHint}</p>${ta('eyes', m.eyes, T.writeHere, 3)}`, '', 'eyes')}
    ${card(`<div class="ct">${T.hands} ${tag(1)}</div><p class="hint">${T.handsHint}</p>${ta('hands', m.hands, T.writeHere, 3)}`, '', 'hands')}
    <p class="err" id="er" role="alert" hidden></p>
    <button class="btn" id="done">${m.closed_at ? T.saveBase : T.closeWeek}</button>`, 'week');
  const save = (x) => api.saveWeek(ws, { progress: x.progress, progress_pct: filled(x.progress_pct) ? Math.max(0, Math.min(100, +x.progress_pct)) : null, note_type: x.note_type, success: x.success, gap: x.gap, heart: x.heart, eyes: x.eyes, hands: x.hands });
  const flushNow = bindForm(m, save);
  $('#done').addEventListener('click', () => {
    flushNow();
    const miss = [];
    if (!filled(m.progress)) miss.push('progress');
    if (!m.note_type) miss.push('note_type');
    if (!filled(m.success) || !filled(m.gap)) miss.push('sg');
    ['heart', 'eyes', 'hands'].forEach((k) => { if (!filled(m[k])) miss.push(k); });
    if (miss.length) { const er = $('#er'); er.textContent = T.missingRequired + ' ' + miss.map((k) => T.reqNames[k]).join(', '); er.hidden = false; return markMissing(miss); }
    api.saveWeek(ws, { closed_at: (D.weeks[ws] || {}).closed_at || new Date().toISOString() });
    toast(T.weekClosedToast);
    // ״ומכאן לפתק החדש״: אם סגרה את השבוע הנוכחי בסופו, הפתק הבא נפתח ביום ראשון
    go(ws === weekStart(today()) ? '#/week' : '#/week/open');
  });
}

// ===== התקדמות =====
function stats() {
  const t = today(); const ws = weekStart(t);
  const wk = [0, 1, 2, 3, 4, 5, 6].map((i) => { const k = addDays(ws, i); return { k, d: D.days[k] || {} }; });
  const both = wk.filter((x) => x.d.opened_at && x.d.closed_at).length;
  const openOnly = wk.filter((x) => x.d.opened_at && !x.d.closed_at && x.k < t).pop();
  const keyDone = wk.filter((x) => x.d.key_status === 'done').length;
  const keyTotal = wk.filter((x) => x.d.key_status).length;
  const OPT = ['where_needed', 'may_derail', 'recover', 'win_belief', 'being_sign', 'key_reflect', 'day_how', 'gap_moment', 'thanks', 'extra_close', 'open_tomorrow'];
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
  return { ws, wk, both, openOnly, keyDone, keyTotal, depth, observations, openAvg, closeAvg, streak, recent };
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
function renderProgress() {
  const s = stats(); const t = today();
  const last = Object.keys(D.weeks).sort().reverse().find((k) => D.weeks[k].progress_pct != null);
  const pct = last ? D.weeks[last].progress_pct : null;
  const ad = F().achievement_date;
  const ins = dataInsight(s);
  shell(`${hd(T.weekNum(weekNumber(s.ws)), T.progressTitle)}
    ${card(`<div class="ct">${T.openedClosedWeek}</div><p class="kpi">${s.both} <small>${T.ofDays(s.both).replace(/^\d+ /, '')}</small></p>
      <div class="week" role="img" aria-label="${T.openedClosedWeek}: ${s.both}">${s.wk.map((x, i) => `<span class="${x.k === t ? 't' : ''}"><i class="${x.d.opened_at && x.d.closed_at ? 'f' : x.d.opened_at ? 'h' : ''}"></i>${T.days[i]}</span>`).join('')}</div>
      ${s.openOnly ? `<p class="hint">${T.openedNotClosed(T.dayNames[parse(s.openOnly.k).getDay()])} <a class="lnk" href="#/close/${s.openOnly.k}">${T.closeNow}</a></p>` : ''}`)}
    ${hasAchievement() ? card(`<div class="ct">${T.achievementCard}</div><p class="it">${esc(F().achievement)}</p>
      ${pct != null ? `<div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div><p class="hint">${T.lastWeekPct(pct)}${ad ? ' · ' + T.daysLeft(daysBetween(t, ad)) : ''}</p>` : ad ? `<p class="hint">${T.daysLeft(daysBetween(t, ad))}</p>` : ''}`)
      : `<div class="banner">${T.needBaseBanner} <a class="lnk" href="#/base">${T.baseGo}</a></div>`}
    <div class="cols">
      ${card(`<p class="mini">${s.keyTotal ? `${s.keyDone}/${s.keyTotal}` : '-'}</p><span class="lbl">${T.keyDoneLbl}</span>`)}
      ${card(`<p class="mini">${s.depth != null ? s.depth + '%' : '-'}</p><span class="lbl">${T.depthLbl}</span>`)}
      ${card(`<p class="mini">${s.observations}</p><span class="lbl">${T.observationsLbl}</span>`)}
      ${card(`<p class="mini">${s.openAvg != null ? fmtMin(s.openAvg) : '-'}</p><span class="lbl">${T.avgOpenLbl(s.closeAvg != null ? fmtMin(s.closeAvg) : '')}</span>`)}
    </div>
    ${card(`<div class="ct">${T.dataShows}</div><p class="ins">${esc(ins || T.noDataYet)}</p>`)}
    ${card(`<div class="ct">${T.nextLive}</div><p class="it">${esc(CONFIG.ZOOM_WHEN)}</p>
      <div class="lessons">${CONFIG.ZOOM_LINK ? `<a class="clip" href="${esc(CONFIG.ZOOM_LINK)}" target="_blank" rel="noopener"><i></i>${T.toZoom}</a>` : ''}
      ${CONFIG.RECORDINGS_LINK ? `<a class="clip" href="${esc(CONFIG.RECORDINGS_LINK)}" target="_blank" rel="noopener"><i></i>${T.recordings}</a>` : ''}</div>`)}`, 'progress');
}

// ===== אוסף =====
function collectionItems() {
  const items = [];
  Object.entries(D.days).forEach(([k, d]) => {
    if (filled(d.insight)) items.push({ kind: d.sticker ? 'sticker' : 'insight', also: d.sticker ? 'insight' : null, text: d.insight, when: shortDate(k), sort: k, link: d.sticker ? '#/sticker/' + k : null });
    if (filled(d.win_belief)) items.push({ kind: 'belief', text: d.win_belief, when: shortDate(k), sort: k });
  });
  Object.entries(D.weeks).forEach(([k, w]) => {
    if (filled(w.hands) && w.closed_at) items.push({ kind: 'debrief', text: w.hands, when: T.weekNum(weekNumber(k)), sort: k + 'z' });
    if (filled(w.win_belief)) items.push({ kind: 'belief', text: w.win_belief, when: T.weekNum(weekNumber(k)), sort: k + 'z' });
  });
  return items.sort((a, b) => (a.sort < b.sort ? 1 : -1));
}
function renderCollection(filter = 'all', query = '') {
  const items = collectionItems();
  const show = items.filter((x) => (filter === 'all' || x.kind === filter || x.also === filter) && (!query || x.text.includes(query)));
  shell(`${hd(T.collectionSub, T.collectionTitle)}
    <div class="chips" id="flt">${Object.entries(T.collectionFilters).map(([k, v]) => `<button type="button" class="${k === filter ? 'on' : ''}" data-f="${k}">${v}</button>`).join('')}</div>
    ${items.length > 6 ? `<input class="search" type="search" id="sq" placeholder="${T.searchPh}" value="${esc(query)}" aria-label="${T.searchPh}">` : ''}
    ${show.length ? show.map((x) => card(`<p class="it"><small>${T.collectionKinds[x.kind]} · ${esc(x.when)}</small>${esc(x.text)}</p>${x.link ? `<a class="lnk" href="${x.link}">${T.openSticker}</a>` : ''}`)).join('') : `<p class="hint">${T.collectionEmpty}</p>`}`, 'collection');
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
    ${card(parts.map(([k, ok]) => `<a class="check" href="#/base/${k}"><span>${T.baseParts[k]}</span><i role="img" class="${ok ? 'ok' : 'no'}" aria-label="${ok ? 'מלא' : 'חסר'}"></i></a>`).join(''))}
    ${hasAchievement() ? card(`<div class="ct">${T.achievementLabel}</div><p class="ach">${esc(f.achievement)}</p>
      <div class="chips" style="margin-top:10px">${Object.entries(T.achievementChecks).map(([k, v]) => `<button type="button" disabled class="${(f.achievement_checks || {})[k] ? 'on' : ''}">${v}</button>`).join('')}</div>
      <a class="lnk" href="#/base/achievement">${T.edit}</a>`) : ''}
    ${hasPlan() ? card(`<div class="ct">${T.planTitle}</div>
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
    shell(`${hd(T.baseTitle, T.baseParts[part] || '')}${body}
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
  shell(`${hd(T.refineSub, T.refineTitle)}
    <div class="chips">${Object.entries(T.refineTabs).map(([k, v]) => `<a class="btn2" style="width:auto;margin:0;${k === tab ? 'background:var(--plum);color:var(--cream)' : ''}" href="#/refine/${k}">${v}</a>`).join('')}</div>
    ${(T.refine[tab] || []).map((x) => card(`<p class="it"><small>${esc(x.l)}</small>${esc(x.t)}</p>`)).join('')}
    <button class="btn2" onclick="history.back()">${T.back}</button>`, 'today');
}

// ===== הגדרות =====
function renderSettings() {
  const p = P();
  shell(`${hd('', T.settingsTitle)}
    ${card(`<label class="q" for="nm">${T.myName}</label><input id="nm" type="text" value="${esc(p.full_name)}">`)}
    ${card(`<div class="ct">${p.share_journal ? T.shareStatusOn : T.shareStatusOff}</div><button class="btn2" id="sh">${p.share_journal ? T.shareToggleOn : T.shareToggleOff}</button>`)}
    ${card(`<div class="ct">${T.installTitle}</div><p class="hint">${T.installIos}</p><p class="hint">${T.installAndroid}</p>`)}
    ${p.is_admin ? `<a class="btn dark" href="#/admin">${T.adminLink}</a>` : ''}
    <button class="btn2" id="out">${T.logout}</button>
    <p class="hint" style="text-align:center">${esc(p.email || '')}</p>`, '');
  let t; $('#nm').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => api.saveProfile({ full_name: e.target.value.trim() }), 700); });
  $('#sh').addEventListener('click', () => { api.saveProfile({ share_journal: !p.share_journal }); toast(T.saved); renderSettings(); });
  $('#out').addEventListener('click', async () => { await api.logout(); D = null; go('#/'); });
}

// ===== משוב בהתנסות =====
function renderFeedback() {
  const m = {};
  shell(`${hd('', T.feedbackTitle)}
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
  const link = CONFIG.OFFER_LINK[kindOf()] || CONFIG.OFFER_LINK.graduate;
  const dl = CONFIG.OFFER_DEADLINE && CONFIG.OFFER_DEADLINE >= today() ? shortDate(CONFIG.OFFER_DEADLINE) : '';
  shell(`${hd('', T.offerTitle)}
    ${card(`<p class="ins">${T.offerSub}</p>
      ${dl ? `<p class="q" style="margin-top:12px">${T.offerDeadline(dl)}</p>` : ''}
      ${link ? `<a class="btn" href="${esc(link)}" target="_blank" rel="noopener">${T.offerCta}</a>` : ''}`)}
    <a class="btn2" href="#/today">${T.backToday}</a>`, '');
}

// ===== התקנה כאפליקציה =====
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
render();
