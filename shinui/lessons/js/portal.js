// פורטל השיעורים של אשה רוצה עושה. שני מסכים: כל השיעורים (#/) ושיעור (#/l/9).
import { PCONFIG } from './config.js';
import { T } from './content.js';
import { LESSONS, STAGES, stageOf, lesson } from './lessons.js';
import { store } from './store.js';

const root = document.getElementById('portal');
const qs = new URLSearchParams(location.search);
const STYLE = ['a', 'b', 'c'].includes(qs.get('style')) ? qs.get('style') : PCONFIG.STYLE;
document.body.classList.add('st-' + STYLE);

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dm = (iso) => { const [, m, d] = iso.split('-'); return `${+d}.${+m}`; };
const $ = (s) => root.querySelector(s);

// אייקונים: סימן אחד מלא, בלי קווים דקים
const IC = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.6 17.2 4.4 12l2.1-2.1 3.1 3.1 7.9-7.9 2.1 2.1z" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="currentColor"/><path d="M19 15v18l15-9z" fill="var(--cream)"/></svg>',
  workbook: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 10c6-2 13-2 19 2v28c-6-4-13-4-19-2z" fill="currentColor"/><path d="M44 10c-6-2-13-2-19 2v28c6-4 13-4 19-2z" fill="currentColor" opacity=".72"/></svg>',
  slides: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="7" width="40" height="27" rx="5" fill="currentColor"/><rect x="21" y="34" width="6" height="7" fill="currentColor" opacity=".72"/><rect x="13" y="40" width="22" height="4" rx="2" fill="currentColor" opacity=".72"/></svg>',
  summary: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 4h20l10 10v26a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" fill="currentColor"/><path d="M30 4v8a2 2 0 0 0 2 2h8z" fill="var(--cream)" opacity=".55"/></svg>',
  arrowR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrowL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const logo = `<img class="logo" src="img/aro-wide-400.png" width="400" height="106" alt="אשה רוצה עושה">`;

function header(on) {
  return `<header class="bar"><div class="bar-in">
    <a class="brand" href="#/" aria-label="${esc(T.navLessons)}">${logo}</a>
    <nav class="nav">
      <a href="#/" class="${on === 'list' ? 'on' : ''}">${esc(T.navLessons)}</a>
      ${store.me() && store.me().is_admin ? `<a href="#/admin" class="adm-link${on === 'admin' ? ' on' : ''}">${esc(T.navAdmin)}</a>` : ''}
      <a href="${PCONFIG.APP_URL}" class="app-link">${esc(T.navApp)}</a>
    </nav>
  </div></header>
  ${store.demo ? `<div class="demo-note">${esc(T.demo)}</div>` : ''}`;
}

const nextLesson = () => LESSONS.find((l) => !store.isWatched(l.n));

function card(l, cur) {
  const w = store.isWatched(l.n);
  return `<a class="lc${w ? ' w' : ''}${cur ? ' cur' : ''}" href="#/l/${l.n}">
    <span class="num">${l.n}</span>
    <span class="lt"><small>${dm(l.date)}</small><b>${esc(l.title)}</b></span>
    <span class="chk" ${w ? '' : 'hidden'} title="${esc(T.watched)}">${IC.check}<i>${esc(T.watched)}</i></span>
  </a>`;
}

function stages(curN, compact) {
  return STAGES.map((s) => `<section class="stage">
    <div class="stage-h"><span class="over">${esc(T.stageLabel(s))}</span><h2>${esc(s.name)}</h2></div>
    <div class="grid${compact ? ' compact' : ''}">${LESSONS.filter((l) => l.n >= s.from && l.n <= s.to).map((l) => card(l, l.n === curN)).join('')}</div>
  </section>`).join('');
}

function viewList() {
  document.title = T.siteTitle;
  const nx = nextLesson();
  const w = store.count();
  root.innerHTML = `${header('list')}<main class="wrap list">
    <section class="intro">
      <span class="over">${esc(T.listOver)}</span>
      <h1>${esc(T.listTitle)}</h1>
      <p class="prog-t">${esc(T.progress(w, LESSONS.length))}</p>
      <div class="prog"><i style="width:${Math.round((w / LESSONS.length) * 100)}%"></i></div>
      ${store.me() && store.me().is_admin ? `<a class="btn2 adm-in" href="#/admin">${esc(T.navAdmin)}</a>` : ''}
    </section>
    ${nx ? `<a class="next" href="#/l/${nx.n}">
      <span class="next-num">${nx.n}</span>
      <span class="next-t"><span class="over">${esc(w ? T.nextOver : T.startOver)}</span><b>${esc(nx.title)}</b><small>${esc(stageOf(nx.n).name)}</small></span>
      <span class="next-go">${esc(T.toLesson)} ${IC.arrowL}</span>
    </a>` : `<p class="done">${esc(T.allDone)}</p>`}
    ${stages(nx && nx.n)}
  </main>`;
}

function player(l) {
  if (PCONFIG.SHOW_MEDIA && l.vimeo) {
    const src = `https://player.vimeo.com/video/${l.vimeo}${l.vimeo.includes('?') ? '&' : '?'}dnt=1&title=0&byline=0&portrait=0`;
    return `<div class="player"><iframe id="vp" src="${esc(src)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${esc(l.title)}"></iframe></div>`;
  }
  return `<div class="player ph"><span class="ph-in">${IC.play}<span>${esc(T.videoSoon)}</span></span></div>`;
}

function dlCard(kind, href) {
  const has = PCONFIG.SHOW_MEDIA && href;
  const inner = `<span class="dl-ic">${IC[kind]}</span><span class="dl-t"><b>${esc(T[kind])}</b><small>${esc(has ? T.pdf : T.soon)}</small></span>`;
  return has ? `<a class="dl" data-kind="${kind}" href="${esc(href)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="dl off" aria-disabled="true">${inner}</div>`;
}

function practice(l) {
  if (!l.level) return `<section class="practice muted"><span class="over">${esc(T.practiceOver)}</span><p>${esc(T.practiceLater)}</p></section>`;
  // המקום השמור לסרטון ההסבר מוצג רק לשושי, עד שיש סרטון (בדיקת דף 16.11)
  const exp = l.explainer && (typeof l.explainer === 'string' || (store.me() && store.me().is_admin)) ? (PCONFIG.SHOW_MEDIA && typeof l.explainer === 'string'
    ? `<div class="player sm"><iframe src="https://player.vimeo.com/video/${esc(l.explainer)}" allow="fullscreen" allowfullscreen title="${esc(T.practiceTitle)}"></iframe></div>`
    : `<div class="player sm ph"><span class="ph-in">${IC.play}<span>${esc(T.explainerSoon)}</span></span></div>`) : '';
  return `<section class="practice">
    <span class="over">${esc(T.practiceOver)}</span>
    <h2>${esc(T.practiceTitle)}</h2>
    <p>${esc(l.level === 'full' ? T.practiceFull : T.practiceBeing)}</p>
    ${exp}
    <a class="btn" data-kind="app" href="${PCONFIG.APP_URL}?level=${l.level}">${esc(T.practiceBtn)}</a>
  </section>`;
}

function watchRow(n) {
  const w = store.isWatched(n);
  return w
    ? `<div class="watch on"><span class="chk">${IC.check}</span><b>${esc(T.isWatched)}</b><button class="lnk" data-unwatch>${esc(T.unmark)}</button></div>`
    : `<div class="watch"><button class="btn2" data-watch>${IC.check}${esc(T.markWatched)}</button></div>`;
}

function viewLesson(n) {
  const l = lesson(n);
  if (!l) return go('#/');
  const s = stageOf(n);
  const prev = lesson(n - 1), next = lesson(n + 1);
  document.title = `שיעור ${n} · ${l.title}`;
  const side = STYLE === 'b' ? `<aside class="side" aria-label="${esc(T.navLessons)}">${stages(n, true)}</aside>` : '';
  root.innerHTML = `${header('lesson')}<main class="lesson">
    ${side}
    <div class="lmain">
      <div class="wrap lhd">
        <a class="back" href="#/">${IC.arrowR}${esc(T.backToList)}</a>
        <span class="over">${esc(T.lessonOver(n, dm(l.date)))} · ${esc(s.name)}</span>
        <h1>${esc(l.title)}</h1>
      </div>
      <div class="screen"><div class="screen-in">${player(l)}${l.part2 && PCONFIG.SHOW_MEDIA ? `<div class="part2"><span class="over">${esc(l.part2.label)}</span><div class="player"><iframe src="${esc(`https://player.vimeo.com/video/${l.part2.vimeo}&dnt=1&title=0&byline=0&portrait=0`)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${esc(l.part2.label)}"></iframe></div></div>` : ''}</div></div>
      <div class="wrap below">
        <div id="watch">${watchRow(n)}</div>
        <div class="cols">
          <section class="dls">
            <h2 class="h2">${esc(T.downloads)}</h2>
            <div class="dl-row">${dlCard('workbook', l.workbook)}${l.slides === null ? '' : dlCard('slides', l.slides)}${dlCard('summary', l.summary)}</div>
          </section>
          ${practice(l)}
        </div>
        <nav class="pn">
          ${prev ? `<a class="pn-a prev" href="#/l/${prev.n}">${IC.arrowR}<span><small>${esc(T.prev)}</small><b>${prev.n}. ${esc(prev.title)}</b></span></a>` : '<span></span>'}
          ${next ? `<a class="pn-a nxt" href="#/l/${next.n}"><span><small>${esc(T.next)}</small><b>${next.n}. ${esc(next.title)}</b></span>${IC.arrowL}</a>` : '<span></span>'}
        </nav>
      </div>
    </div>
  </main>`;
  if (STYLE === 'b') { const c = root.querySelector('.side .lc.cur'); if (c) c.scrollIntoView({ block: 'center' }); }
  store.opened(n);
  root.querySelector('.below').addEventListener('click', (e) => { const a = e.target.closest('a[data-kind]'); if (a) store.click(n, a.dataset.kind); });
  bindWatch(n);
  watchVimeo(n);
}

function bindWatch(n) {
  const box = $('#watch');
  box.onclick = (e) => {
    if (e.target.closest('[data-watch]')) store.setWatched(n, true);
    else if (e.target.closest('[data-unwatch]')) store.setWatched(n, false);
    else return;
    box.innerHTML = watchRow(n);
    root.querySelectorAll(`.side a[href="#/l/${n}"] .chk`).forEach((c) => { c.hidden = !store.isWatched(n); });
  };
}

// נתוני צפייה מהנגן (Vimeo player API דרך postMessage): זמן צפייה בפועל, אחוז, איפה עצרה, וסימון ״צפיתי״ ב-90%.
// ובפתיחה חוזרת - ממשיכים מאיפה שעצרה.
let vimeoOff = null;
function watchVimeo(n) {
  if (vimeoOff) vimeoOff();
  vimeoOff = null;
  const f = document.getElementById('vp');
  if (!f) return;
  const send = (m) => f.contentWindow && f.contentWindow.postMessage(JSON.stringify(m), 'https://player.vimeo.com');
  let last = null, pend = 0, pct = 0, pos = 0;
  const flush = () => { if (pend > 0) { store.flush(n, pend, pct, pos); pend = 0; } };
  const timer = setInterval(flush, 20000);
  const onMsg = (e) => {
    if (e.origin !== 'https://player.vimeo.com') return;
    let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
    if (d.event === 'ready') {
      ['timeupdate', 'ended', 'pause'].forEach((v) => send({ method: 'addEventListener', value: v }));
      const at = store.position(n);
      if (at > 30 && !store.isWatched(n)) send({ method: 'setCurrentTime', value: at - 5 });
    }
    if (d.event === 'timeupdate' && d.data) {
      const t = d.data.seconds;
      if (last !== null && t > last && t - last < 2) { pend += t - last; store.tick(n, t - last, d.data.percent, t); }
      last = t; pct = Math.max(pct, d.data.percent); pos = t;
    }
    if (d.event === 'pause') flush();
    const done = d.event === 'ended' || (d.event === 'timeupdate' && d.data && d.data.percent >= PCONFIG.WATCHED_AT);
    if (done && !store.isWatched(n)) { store.setWatched(n, true); $('#watch').innerHTML = watchRow(n); }
  };
  const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
  window.addEventListener('message', onMsg);
  document.addEventListener('visibilitychange', onHide);
  vimeoOff = () => { flush(); clearInterval(timer); window.removeEventListener('message', onMsg); document.removeEventListener('visibilitychange', onHide); };
}

// ===== מסך הנתונים של שושי =====
const hm = (sec) => { const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? `${h} שע׳${m ? ' ' + m + ' דק׳' : ''}` : `${m} דק׳`; };
const ago = (iso) => { if (!iso) return '-'; const d = Math.floor((Date.now() - new Date(iso)) / 864e5); return d <= 0 ? 'היום' : d === 1 ? 'אתמול' : `לפני ${d} ימים`; };
async function viewAdmin() {
  if (!store.me() || !store.me().is_admin) return go('#/');
  document.title = T.adminTitle;
  root.innerHTML = `${header('admin')}<main class="wrap admin"><section class="intro"><span class="over">${esc(T.adminOver)}</span><h1>${esc(T.adminTitle)}</h1></section><p>${esc(T.loading)}</p></main>`;
  let data;
  try { data = await store.adminOverview(); } catch { $('.admin p').textContent = T.adminError; return; }
  const W = data.women || [];
  const per = LESSONS.map((l) => {
    const rows = W.map((w) => w.lessons[l.n]).filter(Boolean);
    return { l, opened: rows.length, watched: rows.filter((r) => r.watched).length, avg: rows.length ? rows.reduce((a, r) => a + +r.max_percent, 0) / rows.length : 0 };
  });
  const maxO = Math.max(1, ...per.map((p) => p.opened));
  const totalSec = W.reduce((a, w) => a + Object.values(w.lessons).reduce((b, r) => b + r.seconds, 0), 0);
  const active7 = W.filter((w) => w.last_open && Date.now() - new Date(w.last_open) < 7 * 864e5).length;
  $('.admin').innerHTML = `<section class="intro"><span class="over">${esc(T.adminOver)}</span><h1>${esc(T.adminTitle)}</h1>${store.demo ? `<p class="prog-t">${esc(T.adminDemo)}</p>` : ''}</section>
    <div class="kpis">
      <div class="kpi"><b>${W.length}</b><span>${esc(T.kWomen)}</span></div>
      <div class="kpi"><b>${active7}</b><span>${esc(T.kActive)}</span></div>
      <div class="kpi"><b>${hm(totalSec)}</b><span>${esc(T.kHours)}</span></div>
      <div class="kpi"><b>${per.reduce((a, p) => a + p.watched, 0)}</b><span>${esc(T.kWatched)}</span></div>
    </div>
    <section class="panel"><h2 class="h2">${esc(T.byLesson)}</h2>
      <div class="bars">${per.map((p) => `<div class="brow" title="${esc(p.l.title)}"><span class="bn">${p.l.n}</span><span class="bt">${esc(p.l.title)}</span>
        <span class="bb"><i class="o" style="width:${(p.opened / maxO) * 100}%"></i><i class="w" style="width:${(p.watched / maxO) * 100}%"></i></span>
        <span class="bv">${p.watched}/${p.opened}${p.opened ? ` · ${Math.round(p.avg * 100)}%` : ''}</span></div>`).join('')}</div>
      <p class="legend"><i class="o"></i>${esc(T.legOpened)} <i class="w"></i>${esc(T.legWatched)}</p>
    </section>
    <section class="panel"><h2 class="h2">${esc(T.byWoman)}</h2>
      <div class="scrollx"><table class="tbl"><thead><tr><th>${esc(T.thName)}</th><th>${esc(T.thWatched)}</th><th>${esc(T.thLast)}</th><th>${esc(T.thTime)}</th><th>${esc(T.thLessons)}</th></tr></thead><tbody>
      ${W.map((w) => { const ls = w.lessons; const sec = Object.values(ls).reduce((b, r) => b + r.seconds, 0); const lastN = Math.max(0, ...Object.keys(ls).map(Number));
        return `<tr><td><b>${esc(w.full_name || w.email)}</b></td><td>${Object.values(ls).filter((r) => r.watched).length}/25</td><td>${ago(w.last_open)}${lastN ? ` · שיעור ${lastN}` : ''}</td><td>${hm(sec)}</td>
        <td><span class="dots">${LESSONS.map((l) => { const r = ls[l.n]; const c = !r ? '' : r.watched ? 'w' : 'o'; return `<i class="${c}" title="${l.n}${r ? ' · ' + Math.round(r.max_percent * 100) + '%' + (r.downloads ? ' · הורדות ' + r.downloads : '') + (r.app ? ' · לאפליקציה' : '') : ''}"></i>`; }).join('')}</span></td></tr>`; }).join('') || `<tr><td colspan="5">${esc(T.noData)}</td></tr>`}
      </tbody></table></div>
    </section>`;
}

// ===== כניסה =====
// שושי, 14.11: נכנסים מהקישור שבמייל, ובוחרים: חשבון גוגל (רק המייל שרשום אצלנו), או מייל וסיסמה.
// פעם ראשונה או ששכחת סיסמה: קוד למייל, ואחריו בוחרים סיסמה לפעם הבאה.
function viewLogin(step = 'start', email = '', err = '') {
  document.title = T.loginTitle;
  const errP = err ? `<p class="err" role="alert">${esc(err)}</p>` : '';
  let body = '';
  if (step === 'start') body = `
    <button class="btn google" id="g" type="button">${esc(T.withGoogle)}</button>
    <p class="or"><span>${esc(T.or)}</span></p>
    <form id="f" class="form">
      <label class="lbl" for="em">${esc(T.email)}</label><input id="em" type="email" autocomplete="email" inputmode="email" required value="${esc(email)}" dir="ltr">
      <label class="lbl" for="pw">${esc(T.password)}</label><input id="pw" type="password" autocomplete="current-password" required dir="ltr">
      ${errP}
      <button class="btn" type="submit">${esc(T.enter)}</button>
    </form>
    <button class="lnk" id="code" type="button">${esc(T.firstTimeCode)}</button>`;
  else if (step === 'email') body = `
    <form id="f" class="form">
      <label class="lbl" for="em">${esc(T.email)}</label><input id="em" type="email" autocomplete="email" inputmode="email" required value="${esc(email)}" dir="ltr">
      ${errP}<button class="btn" type="submit">${esc(T.sendCode)}</button>
    </form><button class="lnk" id="back" type="button">${esc(T.backToLogin)}</button>`;
  else if (step === 'code') body = `
    <form id="f" class="form">
      <label class="lbl" for="cd">${esc(T.code)}</label><input id="cd" class="code" inputmode="numeric" autocomplete="one-time-code" required maxlength="10" dir="ltr">
      ${errP}<button class="btn" type="submit">${esc(T.enter)}</button>
    </form><button class="lnk" id="back" type="button">${esc(T.otherEmail)}</button>`;
  else if (step === 'setpw') body = `
    <form id="f" class="form">
      <label class="lbl" for="pw">${esc(T.newPassword)}</label><input id="pw" type="password" autocomplete="new-password" required minlength="8" dir="ltr">
      ${errP}<button class="btn" type="submit">${esc(T.savePassword)}</button>
    </form><button class="lnk" id="skip" type="button">${esc(T.notNow)}</button>`;
  const sub = step === 'code' ? T.codeSent(email) : step === 'email' ? T.codeSub : step === 'setpw' ? T.setPwSub : T.loginSub;
  root.innerHTML = `<main class="login">${logo}<h1>${esc(step === 'setpw' ? T.setPwTitle : T.loginTitle)}</h1><p class="sub">${esc(sub)}</p>${body}</main>`;

  const on = (id, f) => { const el = $('#' + id); if (el) el.onclick = f; };
  on('g', () => store.google());
  on('code', () => viewLogin('email', ($('#em') && $('#em').value) || email));
  on('back', () => viewLogin(step === 'code' ? 'email' : 'start', email));
  on('skip', () => boot());
  const f = $('#f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const b = f.querySelector('.btn'); b.disabled = true;
    try {
      if (step === 'start') { await store.password($('#em').value, $('#pw').value); return boot(); }
      if (step === 'email') { const em = $('#em').value.trim(); await store.sendCode(em); return viewLogin('code', em); }
      if (step === 'code') { await store.verify(email, $('#cd').value); return viewLogin('setpw', email); }
      if (step === 'setpw') { await store.setPassword($('#pw').value); return boot(); }
    } catch (x) {
      const msg = x.code === 'not_invited' ? T.notInvited : x.code === 'bad_password' ? T.badPassword
        : x.code === 'weak_password' ? T.weakPassword : step === 'code' ? T.badCode : T.netError;
      viewLogin(step, email || ($('#em') && $('#em').value) || '', msg);
    }
  };
}

function viewGate(title, sub, btn) {
  root.innerHTML = `<main class="login">${logo}<h1>${esc(title)}</h1><p class="sub">${esc(sub)}</p>
    ${btn ? `<a class="btn" href="${PCONFIG.APP_URL}">${esc(btn)}</a>` : ''}
    <button class="lnk" id="out">${esc(T.logout)}</button></main>`;
  $('#out').onclick = async () => { await store.logout(); viewLogin(); };
}

// ===== ניתוב =====
function go(h) { location.hash = h; }
function route() {
  if (vimeoOff) { vimeoOff(); vimeoOff = null; }
  const m = location.hash.match(/^#\/l\/(\d+)/);
  if (m) viewLesson(+m[1]); else if (location.hash.startsWith('#/admin')) viewAdmin(); else viewList();
  window.scrollTo(0, 0);
}

async function boot() {
  const st = await store.start(PCONFIG.ACCESS);
  if (st === 'login') return viewLogin('start', '', store.loginError() === 'not_invited' ? T.notInvitedGoogle : store.loginError() ? T.netError : '');
  if (st === 'terms') return viewGate(T.firstTime, T.firstTimeSub, T.firstTimeBtn);
  if (st === 'noaccess') return viewGate(T.noAccess, T.noAccessSub);
  // הסרטונים והחומרים מגיעים מהמסד רק אחרי בדיקת הגישה
  const media = await store.media();
  if (!media) return viewGate(T.netError, '');
  media.forEach((m) => { const l = lesson(m.n); if (!l) return;
    l.vimeo = m.vimeo || ''; l.workbook = m.workbook || ''; l.summary = m.summary || ''; l.part2 = m.part2 || null;
    if (l.slides !== null) l.slides = m.slides || ''; });
  window.onhashchange = route;
  route();
}
boot();
