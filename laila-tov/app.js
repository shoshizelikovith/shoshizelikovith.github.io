(() => {
'use strict';

// ---------- צבעי המצעים ----------
const C = { rust:'#B5552B', charcoal:'#363B3F', taupe:'#9C8F82', taupeL:'#CDC3B7', cream:'#F3EEE6',
            plate:'#D9D1C6', empty:'#ECE6DC', emptyStud:'#E2DBCF', ghost:'#B8AE9F' };
const NIGHTS = 6;                                   // מוצ״ש עד חמישי. ליל שישי לא נספר
const DAYNAME = ['מוצ״ש','ראשון','שני','שלישי','רביעי','חמישי'];
const DAYSHORT = ['מ״ש','א׳','ב׳','ג׳','ד׳','ה׳'];

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
  const qualifies = startOk && quietOk && n.routine !== false;
  return { ...n, startOk, quietOk, qualifies,
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
      earn.push({ date:n.date, amt:S.base, kind:'base', reason:'ערב מזכה' });
      if (n.momAway) earn.push({ date:n.date, amt:S.momAway, kind:'bonus', reason:'הסתדרתי גם בלי אמא' });
      if (n.alone && ++alone % S.surpriseEvery === 0) earn.push({ date:n.date, amt:S.surpriseIndep, kind:'surprise', reason:'בונוס הפתעה: ערבים שעשית הכל לבד' });
      if (n.exact && ++exact % S.surpriseEvery === 0) earn.push({ date:n.date, amt:S.surpriseExact, kind:'surprise', reason:'בונוס הפתעה: ערבים מדויקים' });
    }
    // רצפים - בתוך שבוע (מוצ״ש עד חמישי): כל 3 ברצף = בונוס, ו-6 = בונוס נוסף
    const weeks = [...new Set(list.map(n => weekOf(n.date)))];
    for (const ws of weeks){
      let run = 0;
      for (const d of nightsOf(ws)){
        const n = byDate[d];
        if (n && n.qualifies){
          run++;
          if (run === 3 || run === 6) earn.push({ date:d, amt:S.streak3, kind:'streak', reason:'רצף של 3 ערבים' });
          if (run === 6) earn.push({ date:d, amt:S.streak6, kind:'streak', reason:'שבוע מושלם: 6 ערבים' });
        } else run = 0;
      }
    }
    for (const b of D.bonuses.filter(b=>b.kid===k.id)) earn.push({ date:b.date, amt:b.amt, kind:'surprise', reason:b.reason });
    const total = earn.reduce((a,e)=>a+e.amt,0);
    // רצף נוכחי: מהערב האחרון שדווח, אחורה בתוך אותו שבוע
    let streak = 0;
    const lastN = list[list.length-1];
    if (lastN) for (const d of nightsOf(weekOf(lastN.date)).filter(d=>d<=lastN.date).reverse()){ if (byDate[d]?.qualifies) streak++; else break; }
    // חלון החסד - 30 הימים האחרונים, לכל יעד בנפרד
    const from = addDays(lastN ? lastN.date : today, -30);
    const recent = list.filter(n => n.date > from);
    const grace = { start: recent.filter(n=>n.graceStart).length, quiet: recent.filter(n=>n.graceQuiet).length };
    out[k.id] = { kid:k, byDate, earn, total, streak, grace };
  }
  return out;
}

// ---------- SVG: הערב כמגדל של 3 לבנים ----------
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
    const mid = n.routine === false ? null : n.indep === 'לבד' ? C.taupe : n.indep === 'תזכורת אחת' ? C.taupeL : null;
    s += brickSVG(0, C.rust, W, BH, H, !n.startOk);
    s += brickSVG(1, mid || C.taupe, W, BH, H, !mid);
    s += brickSVG(2, C.charcoal, W, BH, H, !n.quietOk);
  }
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${s}</svg>`;
}

// ---------- SVG: הרחפן נבנה לבנה אחרי לבנה ----------
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
function mosaicSVG(progress){
  const cs = 22, rows = DRONE.length, cols = DRONE[0].length, cells = [];
  for (let r=rows-1; r>=0; r--) for (let c=cols-1; c>=0; c--) if (DRONE[r][c] !== '.') cells.push([r,c,DRONE[r][c]]);
  const filled = Math.round(cells.length * Math.min(1, progress));
  let s = '';
  cells.forEach(([r,c,ch], i) => {
    const x = c*cs, y = r*cs, on = i < filled, col = on ? DRONE_COL[ch] : C.empty;
    s += `<rect x="${x+1}" y="${y+1}" width="${cs-2}" height="${cs-2}" rx="3" fill="${col}"/>`
       + `<rect x="${x+1}" y="${y+cs-5}" width="${cs-2}" height="4" rx="2" fill="${on ? shade(col,-.22) : '#E2DBCF'}"/>`
       + `<circle cx="${x+cs/2}" cy="${y+cs/2-1}" r="5.5" fill="${on ? shade(col,.18) : C.emptyStud}"/>`;
  });
  return `<svg class="mosaic" viewBox="0 0 ${cols*cs} ${rows*cs}" role="img" aria-label="רחפן מלבנים">${s}</svg>`;
}

// ---------- render ----------
let DATA, M, weeks, wi;
const money = n => n + ' ' + DATA.settings.currency;

function render(){
  const D = DATA, S = D.settings, ws = weeks[wi], dates = nightsOf(ws);
  $('#weeklabel').textContent = dm(dates[0]) + ' עד ' + dm(dates[5]);
  $('#prev').disabled = wi === 0;
  $('#next').disabled = wi === weeks.length-1;
  $('#weeknav').hidden = false;

  let h = '';
  if (D.sample) h += `<p class="sample">אלה נתוני דוגמה. הם יוחלפו בנתונים האמיתיים מהדף הראשון שתצלמו.</p>`;

  // המטרה המשותפת
  const g = D.goal, sum = Object.values(M).reduce((a,k)=>a+k.total,0);
  h += `<section class="card goal">
    <div class="goal-head"><h2>חוסכים יחד ל${esc(g.name)}</h2>
      <div class="goal-num">${money(sum)} <small>מתוך ${money(g.price)}</small></div></div>
    ${mosaicSVG(sum / g.price)}
    <div class="bar" aria-hidden="true"><i style="width:${Math.min(100, sum/g.price*100).toFixed(1)}%"></i></div>
    <div class="contrib">${Object.values(M).map(k=>`<span>${esc(k.kid.name)}: <b>${money(k.total)}</b></span>`).join('')}
      <span>עוד <b>${money(Math.max(0,g.price-sum))}</b> ל${esc(g.name)}</span></div>
  </section>`;

  // הילדים
  h += `<div class="kids">`;
  for (const k of D.kids){
    const st = M[k.id], ns = dates.map(d => st.byDate[d]);
    const wEarn = st.earn.filter(e => e.date >= dates[0] && e.date <= dates[5]);
    const wSum = wEarn.reduce((a,e)=>a+e.amt,0);
    const nightSum = d => st.earn.filter(e => e.date===d && e.kind==='base').reduce((a,e)=>a+e.amt,0);
    const rep = ns.filter(Boolean), cnt = f => rep.filter(f).length;
    const bonuses = wEarn.filter(e => e.kind !== 'base');
    const graceMsg = st.grace.quiet >= S.graceNotice ? 'שמנו לב שאתה כמעט תמיד מגיע לשקט, אבל הרבה פעמים ממש על הקצה. בוא ננסה 3 ערבים להתחיל 5 דקות קודם ולראות אם זה נהיה קל יותר.'
                   : st.grace.start >= S.graceNotice ? 'שמנו לב שאתה הרבה פעמים מתחיל ממש על הקצה. בוא ננסה 3 ערבים להתחיל 5 דקות קודם.' : '';
    h += `<section class="card kid">
      <div class="kid-head">
        <img src="${esc(k.img)}" width="${k.w}" height="${k.h}" alt="${esc(k.name)}">
        <div class="kid-id"><h2>${esc(k.name)}</h2>
          <div class="kid-week">${money(wSum)} השבוע</div>
          <div class="kid-sub">בכספת ${money(st.total)}${st.streak>1?` · רצף של ${st.streak} ערבים`:''}</div></div>
      </div>
      <div class="times"><span>מתחילים <b>${k.targets.start}</b></span><span>שקט <b>${k.targets.quiet}</b></span></div>
      <div class="tower">${ns.map((n,i)=>`<div class="night">${towerSVG(n, dates[i]>=today)}</div>`).join('')}</div>
      <div class="dlabel">${dates.map((d,i)=>{ const n = ns[i], v = nightSum(d);
        return `<span><b>${DAYSHORT[i]}</b>${dm(d)}<em class="${v?'won':''}">${n ? (v ? money(v) : '-') : (d < today ? 'חסר' : '')}</em>${n&&n.special?'<i class="sp">חריג</i>':''}</span>`; }).join('')}</div>
      <div class="chips">
        <span class="chip"><i style="background:${C.charcoal}"></i>שקט בזמן ${cnt(n=>n.quietOk)} מתוך ${rep.length}</span>
        <span class="chip"><i style="background:${C.rust}"></i>התחלה בזמן ${cnt(n=>n.startOk)} מתוך ${rep.length}</span>
        <span class="chip"><i style="background:${C.taupe}"></i>לבד ${cnt(n=>n.indep==='לבד')} מתוך ${rep.length}</span>
      </div>
      ${bonuses.map(b=>`<p class="bonus ${b.kind}">+${money(b.amt)} · ${esc(b.reason)}</p>`).join('')}
      ${graceMsg?`<p class="nudge">${esc(graceMsg)}</p>`:''}
    </section>`;
  }
  h += `</div>`;
  h += `<div class="legend" aria-label="מקרא">
    <span><i style="background:${C.rust}"></i>התחלתי בזמן</span>
    <span><i style="background:${C.taupe}"></i>הסדר שלי: לבד</span>
    <span><i style="background:${C.taupeL}"></i>עם תזכורת אחת</span>
    <span><i style="background:${C.charcoal}"></i>שקט בזמן</span>
    <span><i class="dash"></i>עוד לא</span>
  </div>`;

  // משוב השבוע - בעיצוב חוברת הוראות
  const fw = D.weeks.filter(w => w.week === ws);
  if (fw.length){
    h += `<section class="booklet">
      <div class="booklet-head"><span class="step">שלב ${weeks.indexOf(ws)+1}</span><h2>המשוב של השבוע</h2></div>
      <div class="fbs">${fw.map(w => { const k = D.kids.find(x=>x.id===w.kid); return `
        <div class="fb"><img src="${esc(k.img)}" width="${k.w}" height="${k.h}" alt="" loading="lazy">
          <div><h3>${esc(k.name)}</h3><p>${esc(w.feedback)}</p>
          ${w.next?`<p class="try"><b>בשבוע הבא ננסה:</b> ${esc(w.next)}</p>`:''}</div></div>`; }).join('')}</div>
    </section>`;
  }

  // משפטים ששמרנו
  const rem = D.weeks.filter(w => w.remember);
  if (rem.length){
    h += `<section class="card"><h2>משפטים ששמרנו</h2>
      <div class="tiles">${rem.map(w => { const k = D.kids.find(x=>x.id===w.kid); return `<div class="tile k${D.kids.indexOf(k)+1}">״${esc(w.remember)}״<small>${esc(k.name)} · שבוע ${dm(w.week)}</small></div>`; }).join('')}</div>
    </section>`;
  }

  // להורים
  const last = addDays(today, -1), missing = [];
  for (const k of D.kids)
    for (let w = weekOf(D.trackingFrom); w <= last; w = addDays(w,7))
      nightsOf(w).forEach((d,i) => { if (d >= D.trackingFrom && d <= last && !M[k.id].byDate[d]) missing.push(`${DAYNAME[i]} ${dm(d)} · ${k.name}`); });
  const month = today.slice(0,7);
  h += `<details class="parents"><summary>להורים</summary>
    <div class="p-sec"><h3>ערבים שחסר עליהם דיווח</h3>${missing.length?`<ul>${missing.map(m=>`<li>${esc(m)}</li>`).join('')}</ul>`:'<p class="sub">אין. הכל מעודכן.</p>'}
      <p class="sub">ערב בלי דיווח לא נחשב כישלון. אפשר להשלים אותו בכל זמן, והוא מקבל ניקוד מלא גם בדיעבד.</p></div>
    <div class="p-sec"><h3>החודש</h3><table class="rules">
      ${D.kids.map(k=>{ const m = M[k.id].earn.filter(e=>e.date.startsWith(month)).reduce((a,e)=>a+e.amt,0);
        return `<tr><td>${esc(k.name)}</td><td>${money(m)} מתוך יעד של ${money(S.monthlyBudget)}</td></tr>`; }).join('')}
      ${D.kids.map(k=>`<tr><td>חלון החסד של ${esc(k.name)} (30 יום)</td><td>התחלה ${M[k.id].grace.start} · שקט ${M[k.id].grace.quiet}</td></tr>`).join('')}
    </table></div>
    <div class="p-sec"><h3>החוקים</h3><table class="rules">
      <tr><td>ערב מזכה: התחלה ושקט בזמן (עם ${S.graceMinutes} דקות חסד), והסדר בוצע</td><td>${money(S.base)}</td></tr>
      <tr><td>3 ערבים מזכים ברצף (אפשר פעמיים בשבוע)</td><td>+${money(S.streak3)}</td></tr>
      <tr><td>שבוע מושלם: 6 ערבים</td><td>+${money(S.streak6)}</td></tr>
      <tr><td>ערב שאמא לא בבית ועמדו בהכל</td><td>+${money(S.momAway)}</td></tr>
      <tr><td>כל 3 ערבים שהכל נעשה לבד (הפתעה)</td><td>+${money(S.surpriseIndep)}</td></tr>
      <tr><td>כל 3 ערבים מדויקים, בלי חלון החסד (הפתעה)</td><td>+${money(S.surpriseExact)}</td></tr>
      <tr><td>ערב חריג שאישרת וקבעת לו זמנים</td><td>כמו ערב רגיל</td></tr>
      <tr><td>ליל שישי</td><td>לא נספר</td></tr>
    </table>
    <p class="sub">בונוסי ההפתעה לא מופיעים לילדים כנוסחה. ההתבוננות מחוץ לתגמולים כרגע.</p></div>
    <div class="p-sec"><h3>המסלול של כל ילד</h3>${D.kids.map(k=>`<p class="route"><b>${esc(k.name)}:</b> ${k.route.map(r=>`${esc(r[0])} ${r[1]}`).join(' · ')}</p>`).join('')}</div>
    <div class="p-sec"><h3>איך מעדכנים</h3><p>מצלמים את הדף השבועי ושולחים לקלוד. הוא קורא, מעדכן כאן ומחזיר שורה אחת של מה שהבין.</p></div>
  </details>`;

  h += `<footer class="foot">עודכן ${esc((D.updated||'').replace('T',' '))}</footer>`;
  $('#app').innerHTML = h;
}

function lock(msg){
  $('#app').innerHTML = `<div class="lock card"><h2>צריך את הקישור המשפחתי</h2><p class="sub">${esc(msg)}</p></div>`;
}

// ---------- load ----------
async function load(){
  const hp = new URLSearchParams(location.hash.slice(1));
  let k = hp.get('k');
  try { if (k) localStorage.setItem('lt-key', k); else k = localStorage.getItem('lt-key'); } catch(e){}
  if (!k) return lock('פתחו את הקישור המלא פעם אחת במכשיר הזה, ומאז הדף ייפתח לבד.');
  let payload;
  try { payload = await (await fetch('data.enc?t='+Date.now(), {cache:'no-store'})).json(); }
  catch(e){ $('#status').textContent = 'אין חיבור כרגע. נסו שוב בעוד רגע.'; return; }
  try {
    const key = await crypto.subtle.importKey('raw', b64d(k), 'AES-GCM', false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv:b64d(payload.iv) }, key, b64d(payload.ct));
    DATA = JSON.parse(new TextDecoder().decode(pt));
  } catch(e){
    try { localStorage.removeItem('lt-key'); } catch(_){}
    return lock('המפתח בקישור לא מתאים. פתחו שוב את הקישור המלא.');
  }
  M = build(DATA);
  weeks = [];
  const lastWeek = [weekOf(today), ...DATA.nights.map(n=>weekOf(n.date))].sort().pop();
  for (let w = weekOf(DATA.trackingFrom); w <= lastWeek; w = addDays(w,7)) weeks.push(w);
  const lastData = DATA.nights.map(n=>n.date).sort().pop();
  wi = weeks.indexOf(weekOf(lastData || today));
  $('#prev').onclick = () => { if (wi>0){ wi--; render(); } };
  $('#next').onclick = () => { if (wi<weeks.length-1){ wi++; render(); } };
  render();
}
load();
})();
