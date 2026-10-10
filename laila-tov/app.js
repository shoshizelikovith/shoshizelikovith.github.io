(() => {
'use strict';

// ---------- צבעי המצעים ----------
const C = { rust:'#B5552B', charcoal:'#363B3F', taupe:'#9C8F82', taupeL:'#CDC3B7', cream:'#F3EEE6',
            plate:'#D9D1C6', empty:'#ECE6DC', emptyStud:'#E2DBCF', ghost:'#B8AE9F' };
const NIGHTS = 6;                                   // מוצ״ש עד חמישי. ליל שישי לא נספר
const DAYNAME = ['מוצ״ש','ראשון','שני','שלישי','רביעי','חמישי'];
const DAYSHORT = ['מ״ש','א׳','ב׳','ג׳','ד׳','ה׳'];
const STEP_ICON = { 'סידור חדר':'🧹', 'ארוחת ערב':'🍽️', 'סיום ארוחה וברכת המזון':'🙏', 'מקלחת':'🚿',
  'צחצוח שיניים':'🪥', 'בגדים למחר':'👕', 'נכנסים למיטה':'🛏️', 'קריאת שמע שעל המיטה':'📖', 'שקט':'🌙' };
const TABS = [['', '🏠', 'הבית שלי'], ['evening', '🌙', 'הערב שלי'], ['vault', '💰', 'הכספת'], ['words', '💬', 'המשפטים שלי'], ['tips', '💡', 'טיפים']];

// ---------- helpers ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2,'0');
const iso = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const addDays = (s,n) => { const d = parse(s); d.setDate(d.getDate()+n); return iso(d); };
const weekOf = s => { const d = parse(s); d.setDate(d.getDate() - (d.getDay()+1)%7); return iso(d); };
const mins = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
const dm = s => { const d = parse(s); return d.getDate()+'.'+(d.getMonth()+1); };
const dayName = s => DAYNAME[(parse(s).getDay()+1)%7] || 'שישי';
const nightsOf = ws => Array.from({length:NIGHTS}, (_,i) => addDays(ws,i));
const today = iso(new Date());

function shade(hex, amt){
  const n = parseInt(hex.slice(1),16);
  const f = v => Math.max(0, Math.min(255, Math.round(amt<0 ? v*(1+amt) : v+(255-v)*amt)));
  return '#'+[n>>16,(n>>8)&255,n&255].map(v=>f(v).toString(16).padStart(2,'0')).join('');
}
const b64d = s => { s = s.replace(/-/g,'+').replace(/_/g,'/'); while (s.length%4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };

// ---------- החוקים (כפי שנסגרו עם GPT, עם הדילול של 9.10) ----------
function evalNight(n, kid, S){
  const t = n.special || kid.targets;
  const late = (a, b) => mins(a) - mins(b);
  const ds = n.start ? late(n.start, t.start) : 999, dq = n.quiet ? late(n.quiet, t.quiet) : 999;
  const startOk = ds <= S.graceMinutes, quietOk = dq <= S.graceMinutes;
  // הסדר: שלוש תיבות בדף (צחצוח, בגדים למחר, קריאת שמע). כולן חייבות להיות מסומנות
  const routineOk = n.done ? !!(n.done.teeth && n.done.clothes && n.done.shema) : n.routine !== false;
  const qualifies = startOk && quietOk && routineOk;
  return { ...n, routineOk, startOk, quietOk, qualifies,
    exact: qualifies && ds <= 0 && dq <= 0,
    alone: qualifies && n.indep === 'לבד',
    graceStart: ds > 0 && ds <= S.graceMinutes, graceQuiet: dq > 0 && dq <= S.graceMinutes };
}

function build(D){
  const S = D.settings, out = {};
  for (const k of D.kids){
    const byDate = {}, earn = [];
    const list = D.nights.filter(n => n.kid===k.id).map(n => evalNight(n,k,S)).sort((a,b)=>a.date.localeCompare(b.date));
    for (const n of list) byDate[n.date] = n;
    let alone = 0, exact = 0;
    for (const n of list){
      if (!n.qualifies) continue;
      earn.push({ date:n.date, amt:S.base, kind:'base', reason:'ערב מנצח' });
      if (n.momAway) earn.push({ date:n.date, amt:S.momAway, kind:'bonus', reason:'הסתדרתי גם בלי אמא' });
      if (n.alone && ++alone % S.surpriseEvery === 0) earn.push({ date:n.date, amt:S.surpriseIndep, kind:'surprise', reason:'הפתעה: ערבים שעשית הכל לבד' });
      if (n.exact && ++exact % S.surpriseEvery === 0) earn.push({ date:n.date, amt:S.surpriseExact, kind:'surprise', reason:'הפתעה: ערבים מדויקים' });
    }
    // רצפים - בתוך שבוע (מוצ״ש עד חמישי): כל 3 ברצף = בונוס, ו-6 = בונוס נוסף
    for (const ws of [...new Set(list.map(n => weekOf(n.date)))]){
      let run = 0;
      for (const d of nightsOf(ws)){
        if (byDate[d]?.qualifies){
          run++;
          if (run === 3 || run === 6) earn.push({ date:d, amt:S.streak3, kind:'streak', reason:'3 ערבים מנצחים ברצף' });
          if (run === 6) earn.push({ date:d, amt:S.streak6, kind:'streak', reason:'שבוע מושלם: 6 ערבים' });
        } else run = 0;
      }
    }
    for (const b of D.bonuses.filter(b=>b.kid===k.id)) earn.push({ date:b.date, amt:b.amt, kind:'surprise', reason:b.reason });
    earn.sort((a,b)=>b.date.localeCompare(a.date));
    const total = earn.reduce((a,e)=>a+e.amt,0);
    const buys = (D.spent||[]).filter(s=>s.kid===k.id);
    const spent = buys.reduce((a,s)=>a+s.amt,0);
    const share = D.goal.shares?.[k.id] ?? D.goal.price;
    const balance = total - spent;
    let streak = 0;
    const lastN = list[list.length-1];
    if (lastN) for (const d of nightsOf(weekOf(lastN.date)).filter(d=>d<=lastN.date).reverse()){ if (byDate[d]?.qualifies) streak++; else break; }
    const from = addDays(lastN ? lastN.date : today, -30);
    const recent = list.filter(n => n.date > from);
    const grace = { start: recent.filter(n=>n.graceStart).length, quiet: recent.filter(n=>n.graceQuiet).length };
    out[k.id] = { kid:k, list, byDate, earn, buys, total, spent, balance, share,
                  toGoal: Math.max(0, share - balance), goalP: Math.min(1, balance/share), streak, grace };
  }
  return out;
}

// ---------- SVG ----------
function brickSVG(i, color, W, BH, H, outline){
  const y = H - (i+1)*BH, ST = 5;
  if (outline) return `<rect x="2" y="${y+1}" width="${W-4}" height="${BH-3}" rx="3" fill="none" stroke="${C.ghost}" stroke-width="1.6" stroke-dasharray="4 3"/>`;
  const hi = shade(color, .2), sh = shade(color, -.25);
  let s = '';
  for (const cx of [W*0.28, W*0.72]) s += `<rect x="${cx-7}" y="${y-ST}" width="14" height="${ST+2}" rx="2" fill="${color}"/><rect x="${cx-7}" y="${y-ST}" width="14" height="2" rx="1" fill="${hi}"/>`;
  return s + `<rect x="1" y="${y}" width="${W-2}" height="${BH}" rx="3" fill="${color}"/>`
           + `<rect x="1" y="${y+BH-4}" width="${W-2}" height="4" rx="2" fill="${sh}"/>`
           + `<rect x="3" y="${y+1}" width="${W-6}" height="2" rx="1" fill="${hi}"/>`;
}
function towerSVG(n, isFuture){
  const W = 56, BH = 20, H = 3*BH + 7;
  let s = '';
  if (!n){
    if (!isFuture) s = `<rect x="2" y="${H-BH}" width="${W-4}" height="${BH-2}" rx="3" fill="none" stroke="${C.ghost}" stroke-width="2" stroke-dasharray="4 3"/><text x="${W/2}" y="${H-BH+14}" text-anchor="middle" font-size="12" font-weight="700" fill="${C.ghost}">?</text>`;
  } else {
    const mid = !n.routineOk ? null : n.indep === 'לבד' ? C.taupe : n.indep === 'תזכורת אחת' ? C.taupeL : null;
    s += brickSVG(0, C.rust, W, BH, H, !n.startOk);
    s += brickSVG(1, mid || C.taupe, W, BH, H, !mid);
    s += brickSVG(2, C.charcoal, W, BH, H, !n.quietOk);
  }
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${s}</svg>`;
}
const DRONE = [
  'PPPPPPPP..........PPPPPPPP',
  '...MM................MM...',
  '...AAAAAABBBBBBBBAAAAAA...',
  '.........BBBYYBBB.........',
  '.........BBBBBBBB.........',
  '..........BBBBBB..........',
  '...........CCCC...........',
  '.......LL...CC...LL.......',
  '......LL..........LL......',
  '.....LLLL........LLLL.....'
];
const DRONE_COL = { P:C.taupeL, M:C.charcoal, A:C.taupe, B:C.rust, Y:C.cream, C:C.charcoal, L:C.taupe };
// כל ילד בונה חצי: הימני לילד הראשון, השמאלי לשני. הרחפן שלם רק כששני החצאים מלאים
function mosaicSVG(progRight, progLeft, dimLeft, dimRight){
  const cs = 22, rows = DRONE.length, cols = DRONE[0].length, mid = cols/2;
  const half = (from, to, p, dim) => {
    const cells = [];
    for (let r=rows-1; r>=0; r--) for (let c=to-1; c>=from; c--) if (DRONE[r][c] !== '.') cells.push([r,c,DRONE[r][c]]);
    const filled = Math.round(cells.length * Math.min(1, p));
    return cells.map((x,i) => [...x, i < filled, dim]);
  };
  const cells = [...half(mid, cols, progRight, dimRight), ...half(0, mid, progLeft, dimLeft)];
  let s = `<line x1="${mid*cs}" y1="0" x2="${mid*cs}" y2="${rows*cs}" stroke="#D9D1C6" stroke-width="2" stroke-dasharray="5 5"/>`;
  cells.forEach(([r,c,ch,on,dim]) => {
    const x = c*cs, y = r*cs, col = on ? DRONE_COL[ch] : C.empty;
    s += `<g${dim?' opacity=".35"':''}><rect x="${x+1}" y="${y+1}" width="${cs-2}" height="${cs-2}" rx="3" fill="${col}"/>`
       + `<rect x="${x+1}" y="${y+cs-5}" width="${cs-2}" height="4" rx="2" fill="${on ? shade(col,-.22) : '#E2DBCF'}"/>`
       + `<circle cx="${x+cs/2}" cy="${y+cs/2-1}" r="5.5" fill="${on ? shade(col,.18) : C.emptyStud}"/></g>`;
  });
  return `<svg class="mosaic" viewBox="0 0 ${cols*cs} ${rows*cs}" role="img" aria-label="רחפן מלבנים">${s}</svg>`;
}

// ---------- state ----------
let DATA, M, weeks, wi;
const money = n => n + ' ' + DATA.settings.currency;
const kidImg = (k, cls='') => `<img class="${cls}" src="${esc(k.img)}" width="${k.w}" height="${k.h}" alt="${esc(k.name)}">`;
const sampleNote = () => DATA.sample ? `<p class="sample">אלה נתוני דוגמה. הם יוחלפו בנתונים האמיתיים מהדף הראשון שתצלמו.</p>` : '';
const goalHalfLine = st => st.toGoal ? `עוד <b>${money(st.toGoal)}</b> לחצי שלך ב${esc(DATA.goal.name)}` : `<b>החצי שלך ב${esc(DATA.goal.name)} מוכן!</b>`;

// ---------- מי נכנס? ----------
function viewEntry(){
  const D = DATA, K = D.kids.map(k => M[k.id]), ready = K.every(k => k.toGoal === 0);
  let h = sampleNote() + `<h2 class="page-title">מי נכנס?</h2><div class="pick">`;
  for (const st of K) h += `<a class="pick-kid" href="#/${st.kid.id}">
      ${kidImg(st.kid)}<span class="pick-name">${esc(st.kid.name)}</span>
      <span class="pick-money">בכספת ${money(st.balance)}</span></a>`;
  if (D.view === 'parent') h += `<a class="pick-kid mom" href="#/mom"><span class="pick-icon">🔒</span><span class="pick-name">האזור של אמא</span><span class="pick-money">רק בקישור שלך</span></a>`;
  h += `</div>
  <section class="card goal">
    <div class="goal-head"><h2>הרחפן המשותף · ${money(D.goal.price)}</h2>
      <div class="goal-num">${ready ? 'שניכם הגעתם. אפשר לקנות!' : 'כל אחד בונה את החצי שלו'}</div></div>
    ${mosaicSVG(K[0].goalP, K[1]?.goalP ?? 0)}
    <div class="halves">${K.map(k => `<div class="half">
        <div class="half-top"><b>${esc(k.kid.name)}</b><span>${money(Math.min(k.balance,k.share))} מתוך ${money(k.share)}</span></div>
        <div class="bar" aria-hidden="true"><i style="width:${(k.goalP*100).toFixed(1)}%"></i></div>
        <div class="half-left">${k.toGoal ? `עוד <b>${money(k.toGoal)}</b>` : `<b>החצי שלו מוכן</b>`}</div></div>`).join('')}</div>
    ${!ready && K.some(k=>k.toGoal===0) ? `<p class="wait">${esc(K.find(k=>k.toGoal===0).kid.name)} כבר הגיע לחצי שלו. מחכים ש${esc(K.find(k=>k.toGoal>0).kid.name)} יגיע, ואז קונים יחד.</p>` : ''}
  </section>`;
  return h;
}

// ---------- הבית שלי ----------
function viewHome(st){
  const D = DATA, S = D.settings, k = st.kid, ws = weeks[wi], dates = nightsOf(ws);
  const ns = dates.map(d => st.byDate[d]), rep = ns.filter(Boolean), cnt = f => rep.filter(f).length;
  const wEarn = st.earn.filter(e => e.date >= dates[0] && e.date <= dates[5]);
  const wSum = wEarn.reduce((a,e)=>a+e.amt,0);
  const nightSum = d => st.earn.filter(e => e.date===d && e.kind==='base').reduce((a,e)=>a+e.amt,0);
  const fb = D.weeks.filter(w => w.kid===k.id).sort((a,b)=>b.week.localeCompare(a.week))[0];
  const graceMsg = st.grace.quiet >= S.graceNotice ? 'שמנו לב שאתה כמעט תמיד מגיע לשקט, אבל הרבה פעמים ממש על הקצה. בוא ננסה 3 ערבים להתחיל 5 דקות קודם.'
                 : st.grace.start >= S.graceNotice ? 'שמנו לב שאתה הרבה פעמים מתחיל ממש על הקצה. בוא ננסה 3 ערבים להתחיל 5 דקות קודם.' : '';
  return sampleNote() + `
  <section class="hero">
    ${kidImg(k, 'hero-img')}
    <div class="hero-txt"><h2>היי ${esc(k.name)}!</h2>
      <div class="hero-money"><span>בכספת שלך</span><b>${money(st.balance)}</b></div>
      ${st.streak>1?`<div class="hero-streak">🔥 ${st.streak} ערבים מנצחים ברצף</div>`:''}</div>
  </section>
  <a class="card tonight" href="#/${k.id}/evening">
    <span class="t-icon">🌙</span>
    <span class="t-txt"><b>הערב:</b> מתחילים ב-<b>${k.targets.start}</b><br>שקט במיטה ב-<b>${k.targets.quiet}</b></span>
    <span class="t-go">למסלול שלי ‹</span></a>
  <section class="card">
    <div class="week-head"><h2>השבוע שלי</h2>
      <div class="weeknav"><button type="button" data-w="-1" aria-label="שבוע קודם" ${wi===0?'disabled':''}>›</button>
        <span>${dm(dates[0])} עד ${dm(dates[5])}</span>
        <button type="button" data-w="1" aria-label="שבוע הבא" ${wi===weeks.length-1?'disabled':''}>‹</button></div></div>
    <p class="week-sum">${money(wSum)} השבוע</p>
    <div class="tower">${ns.map((n,i)=>`<div class="night">${towerSVG(n, dates[i]>=today)}</div>`).join('')}</div>
    <div class="dlabel">${dates.map((d,i)=>{ const n = ns[i], v = nightSum(d);
      return `<span><b>${DAYSHORT[i]}</b>${dm(d)}<em class="${v?'won':''}">${n ? (v ? money(v) : '-') : (d < today ? 'חסר' : '')}</em>${n&&n.special?'<i class="sp">חריג</i>':''}</span>`; }).join('')}</div>
    <div class="legend">
      <span><i style="background:${C.rust}"></i>התחלתי בזמן</span>
      <span><i style="background:${C.taupe}"></i>עשיתי לבד</span>
      <span><i style="background:${C.taupeL}"></i>עם תזכורת</span>
      <span><i style="background:${C.charcoal}"></i>שקט בזמן</span></div>
    <div class="chips">
      <span class="chip">🌙 שקט בזמן: ${cnt(n=>n.quietOk)} מתוך ${rep.length}</span>
      <span class="chip">🧹 התחלתי בזמן: ${cnt(n=>n.startOk)} מתוך ${rep.length}</span>
      <span class="chip">💪 לבד: ${cnt(n=>n.indep==='לבד')} מתוך ${rep.length}</span></div>
    ${wEarn.filter(e=>e.kind!=='base').map(b=>`<p class="bonus ${b.kind}">+${money(b.amt)} · ${esc(b.reason)}</p>`).join('')}
    ${graceMsg?`<p class="nudge">${esc(graceMsg)}</p>`:''}
  </section>
  ${fb ? `<section class="booklet"><div class="booklet-head"><span class="step">שבוע ${dm(fb.week)}</span><h2>המשוב שלי</h2></div>
    <div class="fb"><p>${esc(fb.feedback)}</p>${fb.next?`<p class="try"><b>האתגר שלי לשבוע הבא:</b> ${esc(fb.next)}</p>`:''}</div></section>` : ''}
  <a class="card goal-mini" href="#/${k.id}/vault"><span>🚁</span><div><div>${goalHalfLine(st)}</div>
    <div class="bar" aria-hidden="true"><i style="width:${(st.goalP*100).toFixed(1)}%"></i></div></div></a>`;
}

// ---------- הערב שלי ----------
function viewEvening(st){
  const S = DATA.settings, k = st.kid;
  const goals = [k.targets.start, k.targets.quiet];
  return `<h2 class="page-title">הערב שלי</h2>
  <p class="lead">שתי השעות הכי חשובות בערב:</p>
  <div class="big-goals">
    <div class="big-goal"><span class="bg-icon">🧹</span><span class="bg-label">מתחילים להתארגן</span><b>${k.targets.start}</b></div>
    <div class="big-goal night"><span class="bg-icon">🌙</span><span class="bg-label">שקט במיטה</span><b>${k.targets.quiet}</b></div>
  </div>
  <section class="card"><h2>המסלול שלי</h2><p class="sub">צעד אחרי צעד, כל ערב.</p>
    <ol class="steps">${k.route.map(([name, t]) => {
      const key = (name==='סידור חדר' && t===goals[0]) || (name==='שקט' && t===goals[1]);
      return `<li class="${key?'key':''}"><span class="s-icon">${STEP_ICON[name]||'⭐'}</span><span class="s-name">${esc(name)}</span><b class="s-time">${t}</b></li>`; }).join('')}</ol>
    <p class="sub">צחצוח, בגדים למחר וקריאת שמע: רק לסמן ✓ בדף. העיקר שעשית.</p></section>
  <section class="card how"><h2>איך מרוויחים</h2>
    <div class="earn"><span>🏆</span><p><b>ערב מנצח</b> = התחלתי בזמן + שקט בזמן + עשיתי צחצוח, בגדים וקריאת שמע<br><b class="amt">${money(S.base)}</b></p></div>
    <div class="earn"><span>🔥</span><p><b>3 ערבים מנצחים ברצף</b><br>עוד <b class="amt">${money(S.streak3)}</b> (אפשר פעמיים בשבוע)</p></div>
    <div class="earn"><span>⭐</span><p><b>שבוע שלם, 6 ערבים</b><br>עוד <b class="amt">${money(S.streak6)}</b></p></div>
    <div class="earn"><span>🎁</span><p><b>ויש גם הפתעות</b><br>על דברים שהופכים אותך למנהל ערב אלוף...</p></div>
    <p class="sub">יש לך ${S.graceMinutes} דקות חסד. אבל הכי טוב להגיע בזמן.</p></section>`;
}

// ---------- הכספת ----------
function viewVault(st){
  const D = DATA, k = st.kid, idx = D.kids.indexOf(k);
  const K = D.kids.map(x => M[x.id]);
  return `<h2 class="page-title">הכספת שלי</h2>
  <div class="coin"><span>יש לי</span><b>${money(st.balance)}</b></div>
  <section class="card goal"><h2>החצי שלי ברחפן</h2>
    ${mosaicSVG(K[0].goalP, K[1]?.goalP ?? 0, idx===0, idx===1)}
    <p class="goal-line">${goalHalfLine(st)}</p>
    <div class="bar" aria-hidden="true"><i style="width:${(st.goalP*100).toFixed(1)}%"></i></div>
    <p class="sub">הרחפן עולה ${money(D.goal.price)}. כל אחד אוסף ${money(st.share)}, וקונים רק כששניכם מגיעים.</p></section>
  <section class="card"><h2>מאיפה הכסף?</h2>
    ${st.earn.length ? `<ul class="ledger">${st.earn.map(e=>`<li><span>${dayName(e.date)} ${dm(e.date)}</span><span>${esc(e.reason)}</span><b>+${money(e.amt)}</b></li>`).join('')}</ul>` : '<p class="sub">עוד אין. הערב המנצח הראשון כבר בדרך.</p>'}</section>
  ${st.buys.length ? `<section class="card"><h2>מה קניתי</h2><ul class="ledger">${st.buys.map(b=>`<li><span>${dm(b.date)}</span><span>${esc(b.what)}</span><b>-${money(b.amt)}</b></li>`).join('')}</ul></section>` : ''}`;
}

// ---------- המשפטים שלי ----------
function viewWords(st){
  const k = st.kid, ws = DATA.weeks.filter(w => w.kid===k.id).sort((a,b)=>b.week.localeCompare(a.week));
  const rem = ws.filter(w => w.remember), worked = ws.filter(w => w.worked);
  return `<h2 class="page-title">המשפטים שלי</h2>
  <section class="card"><h2>משפטים שאני רוצה לזכור</h2>
    ${rem.length ? `<div class="tiles">${rem.map(w=>`<div class="tile k${DATA.kids.indexOf(k)+1}">״${esc(w.remember)}״<small>שבוע ${dm(w.week)}</small></div>`).join('')}</div>` : '<p class="sub">כאן יופיעו המשפטים שתכתוב בסוף השבוע.</p>'}</section>
  ${worked.length ? `<section class="card"><h2>מה עבד לי</h2><ul class="plain">${worked.map(w=>`<li>${esc(w.worked)} <span class="sub">· שבוע ${dm(w.week)}</span></li>`).join('')}</ul></section>` : ''}`;
}

// ---------- טיפים ----------
function viewTips(st){
  const k = st.kid, last = DATA.weeks.filter(w => w.kid===k.id).sort((a,b)=>b.week.localeCompare(a.week))[0];
  return `<h2 class="page-title">טיפים</h2>
  ${last && (last.next || last.tryNext) ? `<section class="card exp"><h2>🧪 הניסוי שלי השבוע</h2><p class="big">${esc(last.next || last.tryNext)}</p>
    ${last.tryNext && last.next && last.tryNext!==last.next ? `<p class="sub">מה אני כתבתי: ${esc(last.tryNext)}</p>`:''}</section>` : ''}
  <section class="card"><h2>טיפים שיכולים לעזור לי</h2>
    <ul class="tips">${(k.tips||[]).map(t=>`<li><span>💡</span><p>${esc(t)}</p></li>`).join('')}</ul></section>`;
}

// ---------- האזור של אמא ----------
function viewMom(){
  const D = DATA, S = D.settings;
  const last = addDays(today, -1), missing = [];
  for (const k of D.kids)
    for (let w = weekOf(D.trackingFrom); w <= last; w = addDays(w,7))
      nightsOf(w).forEach((d,i) => { if (d >= D.trackingFrom && d <= last && !M[k.id].byDate[d]) missing.push(`${DAYNAME[i]} ${dm(d)} · ${k.name}`); });
  const month = today.slice(0,7);
  const kname = id => D.kids.find(k=>k.id===id)?.name || id;
  const notes = D.nights.filter(n => n.note).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12);
  const reps = (D.momReports||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,14);
  return sampleNote() + `<h2 class="page-title">האזור של אמא</h2>
  <p class="lead">רק בקישור שלך. הילדים לא רואים את האזור הזה, וגם לא יכולים לפתוח אותו.</p>
  <section class="card parents">
    <div class="p-sec first"><h3>ערבים שחסר עליהם דיווח</h3>${missing.length?`<ul>${missing.map(m=>`<li>${esc(m)}</li>`).join('')}</ul>`:'<p class="sub">אין. הכל מעודכן.</p>'}
      <p class="sub">ערב בלי דיווח לא נחשב כישלון. אפשר להשלים אותו בכל זמן, והוא מקבל ניקוד מלא גם בדיעבד.</p></div>
    <div class="p-sec"><h3>הדיווח שלי</h3>${reps.length?`<table class="rules">${reps.map(r=>`<tr class="long"><td>${dm(r.date)} · ${esc(kname(r.kid))}</td><td>${[r.wet===true?'הרטבה':r.wet===false?'בלי הרטבה':'', r.wake&&('קימה '+r.wake), r.tired&&('עייפות '+r.tired), r.calm&&('רוגע '+r.calm), r.focus&&('ריכוז '+r.focus), r.mood&&('מצב רוח '+r.mood)].filter(Boolean).map(esc).join(' · ')}${r.note?`<br><span class="sub">${esc(r.note)}</span>`:''}</td></tr>`).join('')}</table>`:'<p class="sub">עוד אין דיווחים.</p>'}
      <p class="sub">שולחים לקלוד במילים, למשל: ״דיווח אמא, איתמר: בלי הרטבה, קם בקלות, רגוע״.</p></div>
    ${notes.length?`<div class="p-sec"><h3>הערות מהערבים</h3><ul>${notes.map(n=>`<li>${dm(n.date)} · ${esc(kname(n.kid))}: ${esc(n.note)}</li>`).join('')}</ul></div>`:''}
    <div class="p-sec"><h3>החודש</h3><table class="rules">
      ${D.kids.map(k=>{ const m = M[k.id].earn.filter(e=>e.date.startsWith(month)).reduce((a,e)=>a+e.amt,0);
        return `<tr><td>${esc(k.name)}</td><td>${money(m)} מתוך יעד של ${money(S.monthlyBudget)}</td></tr>`; }).join('')}
      ${D.kids.map(k=>`<tr><td>שולם ל${esc(k.name)} עד היום</td><td>${money(M[k.id].spent)}</td></tr>`).join('')}
      ${D.kids.map(k=>`<tr><td>חלון החסד של ${esc(k.name)} (30 יום)</td><td>התחלה ${M[k.id].grace.start} · שקט ${M[k.id].grace.quiet}</td></tr>`).join('')}
    </table></div>
    <div class="p-sec"><h3>החוקים</h3><table class="rules">
      <tr><td>ערב מנצח: התחלה ושקט בזמן (עם ${S.graceMinutes} דקות חסד), והסדר בוצע</td><td>${money(S.base)}</td></tr>
      <tr><td>3 ערבים מנצחים ברצף (אפשר פעמיים בשבוע)</td><td>+${money(S.streak3)}</td></tr>
      <tr><td>שבוע מושלם: 6 ערבים</td><td>+${money(S.streak6)}</td></tr>
      <tr><td>ערב שאמא לא בבית ועמדו בהכל</td><td>+${money(S.momAway)}</td></tr>
      <tr><td>כל 3 ערבים שהכל נעשה לבד (הפתעה)</td><td>+${money(S.surpriseIndep)}</td></tr>
      <tr><td>כל 3 ערבים מדויקים, בלי חלון החסד (הפתעה)</td><td>+${money(S.surpriseExact)}</td></tr>
      <tr><td>ערב חריג שאישרת וקבעת לו זמנים</td><td>כמו ערב רגיל</td></tr>
      <tr><td>ליל שישי</td><td>לא נספר</td></tr>
      <tr><td>${esc(D.goal.name)}: ${D.kids.map(k=>`${esc(k.name)} ${money(M[k.id].share)}`).join(', ')}</td><td>קונים רק כששניהם הגיעו</td></tr>
    </table>
    <p class="sub">בונוסי ההפתעה לא מופיעים לילדים כנוסחה. ההתבוננות מחוץ לתגמולים כרגע.</p></div>
    <div class="p-sec"><h3>איך מעדכנים</h3><p>מצלמים את הדף השבועי ושולחים לקלוד. הוא קורא, מעדכן כאן ומחזיר שורה אחת של מה שהבין.</p></div>
  </section>`;
}

// ---------- router ----------
function render(){
  const [who, page] = location.hash.replace(/^#\/?/, '').split('/');
  const st = M[who];
  let h;
  if (who === 'mom' && DATA.view === 'parent') h = viewMom();
  else if (!st) h = viewEntry();
  else h = ({ evening:viewEvening, vault:viewVault, words:viewWords, tips:viewTips }[page] || viewHome)(st);
  h += `<footer class="foot">עודכן ${esc((DATA.updated||'').replace('T',' '))}</footer>`;
  $('#app').innerHTML = h;
  $('#who').hidden = !st && who !== 'mom';
  const tabs = $('#tabs');
  if (st){
    tabs.hidden = false;
    tabs.innerHTML = TABS.map(([p, ic, label]) => `<a href="#/${who}${p?'/'+p:''}" class="${(page||'')===p?'on':''}"><span>${ic}</span>${label}</a>`).join('');
  } else tabs.hidden = true;
  document.body.classList.toggle('has-tabs', !!st);
  $('#app').querySelectorAll('[data-w]').forEach(b => b.onclick = () => { wi = Math.max(0, Math.min(weeks.length-1, wi + +b.dataset.w)); render(); });
  window.scrollTo(0, 0);
}

function lock(msg){
  $('#app').innerHTML = `<div class="lock card"><h2>צריך את הקישור המשפחתי</h2><p class="sub">${esc(msg)}</p></div>`;
}

// ---------- load ----------
// הקישור של הילדים (#k=) נשמר במכשיר. הקישור של אמא (#p=) נשמר רק עד שסוגרים את הכרטיסייה,
// כדי שבמחשב המשותף הילדים לא יגיעו אליו. אחרי הקריאה המפתח יורד מהכתובת והניווט עובר לעמודים.
async function load(){
  const hp = new URLSearchParams(location.hash.slice(1));
  let p = hp.get('p'), k = hp.get('k');
  try {
    if (p) sessionStorage.setItem('lt-pkey', p); else p = sessionStorage.getItem('lt-pkey');
    if (k) localStorage.setItem('lt-key', k); else k = localStorage.getItem('lt-key');
  } catch(e){}
  if (hp.get('p') || hp.get('k')) history.replaceState(null, '', location.pathname + '#/' + (hp.get('r') || ''));
  if (!p && !k) return lock('פתחו את הקישור המלא פעם אחת במכשיר הזה, ומאז הדף ייפתח לבד.');
  let payload;
  try { payload = await (await fetch((p ? 'parent.enc' : 'data.enc')+'?t='+Date.now(), {cache:'no-store'})).json(); }
  catch(e){ $('#status').textContent = 'אין חיבור כרגע. נסו שוב בעוד רגע.'; return; }
  try {
    const key = await crypto.subtle.importKey('raw', b64d(p || k), 'AES-GCM', false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv:b64d(payload.iv) }, key, b64d(payload.ct));
    DATA = JSON.parse(new TextDecoder().decode(pt));
  } catch(e){
    try { if (p) sessionStorage.removeItem('lt-pkey'); else localStorage.removeItem('lt-key'); } catch(_){}
    return lock('המפתח בקישור לא מתאים. פתחו שוב את הקישור המלא.');
  }
  if (DATA.view === 'parent'){ document.title = 'הבנאים האלופים · אמא'; $('#title').textContent = 'הבנאים האלופים · אמא'; }
  M = build(DATA);
  weeks = [];
  const lastWeek = [weekOf(today), ...DATA.nights.map(n=>weekOf(n.date))].sort().pop();
  for (let w = weekOf(DATA.trackingFrom); w <= lastWeek; w = addDays(w,7)) weeks.push(w);
  const lastData = DATA.nights.map(n=>n.date).sort().pop();
  wi = weeks.indexOf(weekOf(lastData || today));
  window.addEventListener('hashchange', render);
  render();
}
load();
})();
