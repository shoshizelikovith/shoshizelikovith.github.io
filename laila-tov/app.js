(() => {
'use strict';

// ---------- constants ----------
const C = { red:'#C91A09', yellow:'#F2CD37', blue:'#0A5BC4', green:'#237841', black:'#1B2A34',
            lgray:'#A0A5A9', dgray:'#6C6E68', plate:'#C9C4B8', empty:'#ECE8DF', emptyStud:'#E1DBCF' };
const NIGHTS = [0,1,2,3,4,5];               // offsets from Saturday: מוצ״ש..חמישי (שישי בחוץ)
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
const today = iso(new Date());

function shade(hex, amt){
  const n = parseInt(hex.slice(1),16);
  let r = n>>16, g = (n>>8)&255, b = n&255;
  const f = v => Math.max(0, Math.min(255, Math.round(amt<0 ? v*(1+amt) : v+(255-v)*amt)));
  return '#'+[f(r),f(g),f(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
const b64d = s => { s = s.replace(/-/g,'+').replace(/_/g,'/'); while (s.length%4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };

// ---------- scoring ----------
function score(n, kid, S){
  const g = S.graceMinutes || 0;
  const startOk = !!(n.start && mins(n.start) <= mins(kid.targets.start)+g);
  const quietOk = !!(n.quiet && mins(n.quiet) <= mins(kid.targets.quiet)+g);
  const ind = S.points.indep[n.indep] ?? 0;
  return { startOk, quietOk, ind, bricks: (startOk?S.points.start:0) + (quietOk?S.points.quiet:0) + ind };
}

function build(D){
  const S = D.settings;
  const kids = {};
  for (const k of D.kids){
    const nights = D.nights.filter(n => n.kid===k.id).sort((a,b)=>a.date.localeCompare(b.date));
    const byDate = {};
    let run = 0;
    const streaks = [];
    for (const n of nights){
      const s = score(n, k, S);
      byDate[n.date] = { ...n, ...s };
      if (s.quietOk){ run++; if (run === S.streak.nights){ streaks.push({date:n.date, bricks:S.streak.bonus, reason:'בונוס רצף: '+S.streak.nights+' ערבים ברצף שקט בזמן'}); run = 0; } }
      else run = 0;                               // ערב שדווח ולא עמד - שובר רצף. ערב חסר לא נספר ולא שובר
    }
    const bonuses = D.bonuses.filter(b=>b.kid===k.id).concat(streaks);
    const total = Object.values(byDate).reduce((a,n)=>a+n.bricks,0) + bonuses.reduce((a,b)=>a+b.bricks,0);
    kids[k.id] = { kid:k, byDate, bonuses, total };
  }
  return { S, kids };
}

function weekNights(ws){ return NIGHTS.map(o => addDays(ws,o)); }

// ---------- SVG: tower column ----------
function towerSVG(n, isFuture){
  const W = 56, BH = 18, ST = 5, MAX = 5, H = MAX*BH + ST + 2;
  let out = '';
  const brick = (i, color) => {
    const y = H - (i+1)*BH;
    const hi = shade(color, .22), sh = shade(color, -.28);
    let s = '';
    for (const cx of [W*0.28, W*0.72]) s += `<rect x="${cx-7}" y="${y-ST}" width="14" height="${ST+2}" rx="2" fill="${color}"/><rect x="${cx-7}" y="${y-ST}" width="14" height="2" rx="1" fill="${hi}"/>`;
    s += `<rect x="1" y="${y}" width="${W-2}" height="${BH}" rx="3" fill="${color}"/>`;
    s += `<rect x="1" y="${y+BH-4}" width="${W-2}" height="4" rx="2" fill="${sh}"/>`;
    s += `<rect x="3" y="${y+1}" width="${W-6}" height="2" rx="1" fill="${hi}"/>`;
    return s;
  };
  if (!n){
    if (!isFuture){
      const y = H - BH;
      out = `<rect x="2" y="${y}" width="${W-4}" height="${BH-2}" rx="3" fill="none" stroke="#B9B2A3" stroke-width="2" stroke-dasharray="4 3"/><text x="${W/2}" y="${y+13}" text-anchor="middle" font-size="12" font-weight="700" fill="#9A9284">?</text>`;
    }
  } else {
    const stack = [];
    if (n.startOk) stack.push(C.yellow);
    for (let i=0;i<n.ind;i++) stack.push(C.green);
    if (n.quietOk){ stack.push(C.blue); stack.push(C.blue); }
    if (!stack.length){
      const y = H - 7;
      out = `<rect x="1" y="${y}" width="${W-2}" height="6" rx="2" fill="${C.plate}"/>`;
    } else stack.forEach((c,i) => out += brick(i,c));
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true">${out}</svg>`;
}

// ---------- SVG: drone mosaic ----------
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
const DRONE_COL = { P:C.lgray, M:C.black, A:C.dgray, B:C.red, Y:C.yellow, C:C.black, L:C.dgray };

function mosaicSVG(progress){
  const cs = 22, rows = DRONE.length, cols = DRONE[0].length;
  const cells = [];
  for (let r=rows-1; r>=0; r--)                    // נבנה מלמטה למעלה
    for (let c=cols-1; c>=0; c--)                  // ומימין לשמאל
      if (DRONE[r][c] !== '.') cells.push([r,c,DRONE[r][c]]);
  const filled = Math.round(cells.length * Math.min(1, progress));
  let s = '';
  cells.forEach(([r,c,ch], i) => {
    const x = c*cs, y = r*cs, on = i < filled;
    const col = on ? DRONE_COL[ch] : C.empty;
    const stud = on ? shade(DRONE_COL[ch], .2) : C.emptyStud;
    const edge = on ? shade(DRONE_COL[ch], -.25) : '#E3DED3';
    s += `<rect x="${x+1}" y="${y+1}" width="${cs-2}" height="${cs-2}" rx="3" fill="${col}"/>`
       + `<rect x="${x+1}" y="${y+cs-5}" width="${cs-2}" height="4" rx="2" fill="${edge}"/>`
       + `<circle cx="${x+cs/2}" cy="${y+cs/2-1}" r="5.5" fill="${stud}"/>`;
  });
  return { svg:`<svg class="mosaic" viewBox="0 0 ${cols*cs} ${rows*cs}" role="img" aria-label="רחפן מלבנים">${s}</svg>`, cells:cells.length, filled };
}

// ---------- render ----------
let DATA, M, weeks, wi;

function render(){
  const D = DATA, S = M.S, ws = weeks[wi];
  const dates = weekNights(ws);
  $('#weeklabel').textContent = dm(dates[0]) + ' עד ' + dm(dates[5]);
  $('#prev').disabled = wi === 0;
  $('#next').disabled = wi === weeks.length-1;
  $('#weeknav').hidden = false;

  let h = '';
  if (D.sample) h += `<p class="sample">אלה נתוני דוגמה. הם יוחלפו בנתונים האמיתיים מהדף הראשון שתצלמו.</p>`;

  // goal
  const g = D.goal, sum = Object.values(M.kids).reduce((a,k)=>a+k.total,0);
  const mo = mosaicSVG(sum / g.price);
  h += `<section class="card goal">
    <div class="goal-head"><h2>בונים יחד: ${esc(g.name)}</h2>
      <div class="goal-num">${sum} <small>מתוך ${g.price} לבנים</small></div></div>
    ${mo.svg}
    <div class="bar" aria-hidden="true"><i style="width:${Math.min(100, sum/g.price*100).toFixed(1)}%"></i></div>
    <div class="contrib">${Object.values(M.kids).map(k=>`<span>${esc(k.kid.name)}: <b>${k.total}</b> לבנים</span>`).join('')}
      <span>עוד <b>${Math.max(0,g.price-sum)}</b> לבנים לרחפן</span></div>
  </section>`;

  // kids
  h += `<div class="kids">`;
  for (const k of D.kids){
    const st = M.kids[k.id];
    const ns = dates.map(d => st.byDate[d]);
    const wk = ns.reduce((a,n)=>a+(n?n.bricks:0),0);
    const wb = st.bonuses.filter(b => b.date>=ws && b.date<=addDays(ws,6));
    const wbS = wb.reduce((a,b)=>a+b.bricks,0);
    const rep = ns.filter(Boolean);
    const cnt = f => rep.filter(f).length;
    h += `<section class="card kid">
      <div class="kid-head">
        <img src="${esc(k.img)}" width="${k.w}" height="${k.h}" alt="${esc(k.name)}">
        <div><h2>${esc(k.name)}</h2>
          <div class="kid-week">${wk+wbS} לבנים השבוע <span>· ${(wk+wbS)*S.brickValue} ${S.currency}</span></div></div>
      </div>
      <div class="tower">${ns.map((n,i)=>`<div class="night">${towerSVG(n, dates[i]>=today)}</div>`).join('')}</div>
      <div class="dlabel">${dates.map((d,i)=>`<span><b>${DAYSHORT[i]}</b>${dm(d)}</span>`).join('')}</div>
      <div class="chips">
        <span class="chip"><i style="background:${C.blue}"></i>שקט בזמן ${cnt(n=>n.quietOk)} מתוך ${rep.length}</span>
        <span class="chip"><i style="background:${C.yellow}"></i>התחלה בזמן ${cnt(n=>n.startOk)} מתוך ${rep.length}</span>
        <span class="chip"><i style="background:${C.green}"></i>לבד ${cnt(n=>n.indep==='לבד')} מתוך ${rep.length}</span>
      </div>
      ${wb.map(b=>`<p class="bonus">+${b.bricks} לבנים · ${esc(b.reason)}</p>`).join('')}
    </section>`;
  }
  h += `</div>`;
  h += `<div class="legend" aria-label="מקרא">
    <span><i style="background:${C.yellow}"></i>התחיל להתארגן בזמן = ${S.points.start}</span>
    <span><i style="background:${C.blue}"></i>שקט במיטה בזמן = ${S.points.quiet}</span>
    <span><i style="background:${C.green}"></i>לבד = ${S.points.indep['לבד']}, תזכורת אחת = ${S.points.indep['תזכורת אחת']}</span>
    <span><i style="background:${C.plate}"></i>ערב שדווח</span>
    <span><i style="border:2px dashed #B9B2A3;width:14px;height:9px"></i>חסר דיווח</span>
  </div>`;

  // feedback booklet
  const fw = D.weeks.filter(w => w.week === ws);
  const stepNo = weeks.indexOf(ws) + 1;
  if (fw.length){
    h += `<section class="booklet">
      <div class="booklet-head"><span class="step">שלב ${stepNo}</span><h2>המשוב של השבוע</h2></div>
      <div class="fbs">${fw.map(w => { const k = D.kids.find(x=>x.id===w.kid); return `
        <div class="fb"><img src="${esc(k.img)}" width="${k.w}" height="${k.h}" alt="" loading="lazy">
          <div><h3>${esc(k.name)}</h3><p>${esc(w.feedback)}</p>
          ${w.next?`<p class="try"><b>בשבוע הבא ננסה:</b> ${esc(w.next)}</p>`:''}</div></div>`; }).join('')}</div>
    </section>`;
  }

  // sentences
  const rem = D.weeks.filter(w => w.remember);
  if (rem.length){
    h += `<section class="card"><h2>משפטים ששמרנו</h2>
      <div class="tiles">${rem.map(w => { const k = D.kids.find(x=>x.id===w.kid); return `<div class="tile k${D.kids.indexOf(k)+1}">״${esc(w.remember)}״<small>${esc(k.name)} · שבוע ${dm(w.week)}</small></div>`; }).join('')}</div>
    </section>`;
  }

  // parents
  const missing = [];
  const last = addDays(today, -1);
  for (const k of D.kids){
    for (let ws2 = weekOf(D.trackingFrom); ws2 <= last; ws2 = addDays(ws2,7))
      for (const d of weekNights(ws2))
        if (d >= D.trackingFrom && d <= last && !M.kids[k.id].byDate[d]) missing.push(`${DAYNAME[NIGHTS[weekNights(ws2).indexOf(d)]]} ${dm(d)} · ${k.name}`);
  }
  h += `<details class="parents"><summary>להורים</summary>
    <div class="p-sec"><h3>ערבים שחסר עליהם דיווח</h3>${missing.length?`<ul>${missing.map(m=>`<li>${esc(m)}</li>`).join('')}</ul>`:'<p class="sub">אין. הכל מעודכן.</p>'}
      <p class="sub">ערב בלי דיווח לא נחשב כישלון. אפשר להשלים אותו בכל זמן, והלבנים נספרות גם בדיעבד.</p></div>
    <div class="p-sec"><h3>החוקים</h3><table class="rules">
      <tr><td>התחיל להתארגן עד שעת היעד</td><td>${S.points.start} לבנה</td></tr>
      <tr><td>שקט במיטה עד שעת היעד</td><td>${S.points.quiet} לבנים</td></tr>
      <tr><td>עשה הכל לבד / תזכורת אחת</td><td>${S.points.indep['לבד']} / ${S.points.indep['תזכורת אחת']} לבנים</td></tr>
      <tr><td>${S.streak.nights} ערבים ברצף שקט בזמן</td><td>+${S.streak.bonus} לבנים</td></tr>
      <tr><td>שווי לבנה</td><td>${S.brickValue} ${S.currency}</td></tr>
      ${D.kids.map(k=>`<tr><td>שעות היעד של ${esc(k.name)}</td><td>${k.targets.start} · ${k.targets.quiet}</td></tr>`).join('')}
    </table></div>
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
