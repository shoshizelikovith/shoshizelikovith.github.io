// הדשבורד של שושי. רק מי שמסומנת מנהלת במסד מקבלת נתונים (המסד בודק בכל קריאה).
// שושי רואה: מספרים והבסיס של כל אחת. היומן רק של מי שבחרה לשתף.
const KIND = { graduate: 'בוגרת', club: 'מועדון', other: 'אחר' };
const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export async function renderAdmin({ root, api, esc, shell, toast }) {
  shell(`<div class="adm-h"><h1>הדשבורד שלך</h1></div><p class="hint">טוען...</p>`, '', { wide: true });
  let rows;
  try { rows = await api.admin.overview(null); } catch (e) {
    shell(`<div class="adm-h"><h1>הדשבורד שלך</h1></div><p class="err">${esc(e.message)}</p>`, '', { wide: true }); return;
  }
  if (!location.hash.startsWith('#/admin')) return; // יצאה מהדשבורד בזמן הטעינה
  const t = new Date(); const ws = new Date(t); ws.setDate(t.getDate() - t.getDay());
  const weekLabel = `${ws.getDate()}.${ws.getMonth() + 1}`;

  // חישובים
  const both = (r) => (r.week_open || []).filter((v, i) => v && (r.week_close || [])[i]).length;
  const noBase = (r) => !r.achievement || !r.plan_count;
  const silent = (r) => (r.days_since_open == null ? (r.days_since_join ?? 0) >= 4 : r.days_since_open >= 4);
  const needTouch = rows.filter((r) => silent(r) || (noBase(r) && (r.days_since_join ?? 0) >= 10));
  const opened = rows.reduce((a, r) => a + (r.week_open || []).filter(Boolean).length, 0);
  const closed = rows.reduce((a, r) => a + (r.week_close || []).filter(Boolean).length, 0);
  const steady = rows.filter((r) => both(r) >= 4).length;
  const lows = {}; rows.forEach((r) => { if (r.low_sub) lows[r.low_sub] = (lows[r.low_sub] || 0) + 1; });
  const topLow = Object.entries(lows).sort((a, b) => b[1] - a[1])[0];
  const reason = (r) => silent(r)
    ? (r.days_since_open == null ? `עוד לא פתחה · הצטרפה לפני ${r.days_since_join} ימים` : `לא פתחה ${r.days_since_open} ימים`)
    : `${r.days_since_join} ימים בלי הישג ותוכנית`;
  const groupMsg = `השבוע נפתחו ${opened} ימים ונסגרו ${closed}. ${steady} מכן פתחו וסגרו 4 ימים ומעלה.`;

  let filter = 'all';
  const dots = (r) => `<span class="wd" role="img" aria-label="${both(r)} ימים פתחה וסגרה">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<i class="${r.week_open?.[i] && r.week_close?.[i] ? 'f' : r.week_open?.[i] ? 'h' : ''}"></i>`).join('')}</span>`;
  const table = () => {
    const list = filter === 'touch' ? needTouch : filter === 'nobase' ? rows.filter(noBase) : rows;
    if (!list.length) return `<p class="hint">אין כאן אף אחת כרגע.</p>`;
    return `<div class="scrollx"><table class="tbl"><thead><tr><th>שם</th><th>השבוע</th><th>פעולות מפתח</th><th>עומק</th><th>הישג מפתח</th><th>בסיס</th><th>יומן</th><th>סוג</th></tr></thead><tbody>
      ${list.map((r) => `<tr class="click" data-id="${esc(r.id)}" tabindex="0"><td>${esc(r.full_name || r.email)}</td><td>${dots(r)}</td>
        <td>${r.key_total ? `${r.key_done}/${r.key_total}` : '-'}</td><td>${r.depth != null ? r.depth + '%' : '-'}</td>
        <td>${r.achievement ? esc(r.achievement.length > 34 ? r.achievement.slice(0, 34) + '…' : r.achievement) : '<span class="pill w">חסר הישג</span>'}</td>
        <td>${r.foundation_parts === 4 ? 'מלא' : `${r.foundation_parts || 0} מתוך 4`}</td>
        <td><span class="pill">${r.share_journal ? 'משותף' : 'פרטי'}</span></td>
        <td>${KIND[r.kind !== 'other' ? r.kind : r.self_kind || 'other']}${r.member ? ' · מצטרפת' : r.trial_end ? ' · התנסות' : ''}</td></tr>`).join('')}
      </tbody></table></div>`;
  };

  const draw = () => {
    shell(`<div class="adm-h"><h1>הדשבורד שלך</h1><span class="hint" style="margin:0">שבוע שמתחיל ב-${weekLabel}</span></div>
      <div class="kpis">
        <section class="card"><p class="mini">${rows.length}</p><span class="lbl">נשים במערכת</span></section>
        <section class="card"><p class="mini">${steady}</p><span class="lbl">פתחו וסגרו 4 ימים ומעלה</span></section>
        <section class="card"><p class="mini">${rows.filter(silent).length}</p><span class="lbl">לא פתחו 4 ימים ומעלה</span></section>
        <section class="card"><p class="mini">${rows.filter(noBase).length}</p><span class="lbl">בלי הישג ותוכנית</span></section>
      </div>
      <div>
        <section class="card">
          <div class="filters chips" id="flt">
            <button type="button" data-f="all" class="${filter === 'all' ? 'on' : ''}">כולן</button>
            <button type="button" data-f="touch" class="${filter === 'touch' ? 'on' : ''}">צריכות מגע (${needTouch.length})</button>
            <button type="button" data-f="nobase" class="${filter === 'nobase' ? 'on' : ''}">בלי בסיס</button>
          </div>
          ${table()}
          <button class="btn2" id="csv" style="margin-top:12px">ייצוא לאקסל</button>
        </section>
        <div class="side">
          <section class="card"><div class="ct">צריכות מגע השבוע</div>
            ${needTouch.length ? needTouch.slice(0, 8).map((r) => `<p class="it">${esc(r.full_name || r.email)} <small style="display:inline;color:inherit;font-weight:600;font-size:16px">· ${esc(reason(r))}</small></p>`).join('') : '<p class="hint">כולן בתנועה.</p>'}
          </section>
          <section class="card"><div class="ct">לקבוצה השבוע, בלי שמות</div><pre class="copy" id="gm">${esc(groupMsg)}</pre><button class="btn2" id="cp">להעתיק</button></section>
          <section class="card"><div class="ct">נושא לזום</div><p class="it">${topLow ? `ל-${topLow[1]} מכן הוויית המשנה הכי נמוכה השבוע היא ״${esc(topLow[0])}״.` : 'יופיע כשיהיו מספיק סגירות השבוע.'}</p></section>
          <section class="card"><div class="ct">להוסיף מוזמנות</div>
            <p class="hint">שורה לכל אחת: שם, מייל</p>
            <textarea id="inv" rows="4" aria-label="מוזמנות: שם ומייל" placeholder="רחל כהן, rachel@example.com" dir="auto"></textarea>
            <div class="seg" id="ik" style="margin-top:8px"><button type="button" class="on" data-v="graduate">בוגרות</button><button type="button" data-v="club">חברות מועדון</button></div>
            <button class="btn2" id="addinv">להוסיף</button></section>
          <section class="card"><div class="ct">משובים מההתנסות</div><div id="fb"><p class="hint">טוען...</p></div></section>
        </div>
      </div>`, '', { wide: true });

    root.querySelector('#flt').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { filter = b.dataset.f; draw(); } });
    root.querySelectorAll('tr.click').forEach((tr) => {
      const open = () => showUser(tr.dataset.id);
      tr.addEventListener('click', open); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    });
    root.querySelector('#cp').addEventListener('click', async () => { try { await navigator.clipboard.writeText(groupMsg); toast('הועתק'); } catch { toast('לא הצלחתי להעתיק'); } });
    root.querySelector('#csv').addEventListener('click', () => exportCsv(rows));
    let kind = 'graduate';
    root.querySelector('#ik').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; kind = b.dataset.v; root.querySelectorAll('#ik button').forEach((x) => x.classList.toggle('on', x === b)); });
    root.querySelector('#addinv').addEventListener('click', async () => {
      const list = root.querySelector('#inv').value.split('\n').map((l) => l.split(/[,\t]/).map((x) => x.trim())).filter((p) => p.some((x) => x.includes('@')))
        .map((p) => ({ email: p.find((x) => x.includes('@')), full_name: p.find((x) => !x.includes('@')) || '', kind }));
      if (!list.length) return toast('לא מצאתי מיילים ברשימה');
      try { const n = await api.admin.addInvites(list); toast(`נוספו ${n}`); root.querySelector('#inv').value = ''; } catch (e) { toast(e.message); }
    });
    api.admin.feedback().then((fb) => {
      root.querySelector('#fb').innerHTML = fb.length ? fb.map((f) => `<div style="margin-bottom:12px"><p class="it"><small>${esc(f.full_name || f.email)} · ${new Date(f.created_at).toLocaleDateString('he-IL')}</small></p>
        ${(f.answers || []).filter((a) => a.a).map((a) => `<p class="hint" style="margin:2px 0"><b>${esc(a.q)}</b> ${esc(a.a)}</p>`).join('')}</div>`).join('') : '<p class="hint">עוד אין משובים.</p>';
    }).catch(() => { root.querySelector('#fb').innerHTML = '<p class="hint">לא הצלחתי לטעון.</p>'; });
  };

  async function showUser(id) {
    const r = rows.find((x) => x.id === id);
    const m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = `<div class="sheet"><button class="close" aria-label="סגירה">×</button><h2 style="font-size:24px">${esc(r.full_name || r.email)}</h2><p class="hint">טוען...</p></div>`;
    document.body.appendChild(m);
    const opener = document.activeElement; const onKey = (e) => { if (e.key === 'Escape') close(); }; const close = () => { document.removeEventListener('keydown', onKey); m.remove(); opener?.focus?.(); }; document.addEventListener('keydown', onKey);
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('.close')) close(); });
    let u; try { u = await api.admin.user(id); } catch (e) { m.querySelector('.hint').textContent = e.message; return; }
    const f = u.foundation || {};
    const line = (h) => [h.text, h.amount, h.freq && h.freq + ' פעמים', h.days, h.date].filter(Boolean).join(' · ');
    const journal = u.days === undefined ? `<p class="hint">היומן פרטי. היא לא בחרה לשתף.</p>`
      : (u.days || []).length ? u.days.slice(0, 14).map((d) => `<section class="card flat"><p class="it"><small>${esc(d.day)} · ${esc(d.being || '')}${d.presence != null ? ' · נוכחות ' + d.presence : ''}</small>
          ${esc(d.key_action || '')}${d.key_status ? ` (${{ done: 'בוצע', partial: 'חלקית', no: 'לא' }[d.key_status]})` : ''}</p>
          ${d.insight ? `<p class="hint" style="margin-top:4px"><b>גילוי:</b> ${esc(d.insight)}</p>` : ''}</section>`).join('') : '<p class="hint">עוד אין ימים ביומן.</p>';
    m.querySelector('.sheet').innerHTML = `<button class="close" aria-label="סגירה">×</button><h2 style="font-size:24px">${esc(r.full_name || r.email)}</h2>
      <p class="hint">${esc(r.email || '')}</p>
      <section class="card"><div class="ct">הישג מפתח</div><p class="it">${esc(f.achievement || 'חסר')}${f.achievement_date ? ` · עד ${esc(f.achievement_date)}` : ''}</p></section>
      <section class="card"><div class="ct">תוכנית פעולה</div>
        ${[...(f.plan_habits || []), ...(f.plan_once || []), ...(f.plan_support || [])].filter((h) => h && h.text).map((h) => `<p class="it">${esc(line(h))}</p>`).join('') || '<p class="hint">חסרה</p>'}</section>
      <section class="card"><div class="ct">סטטוס</div>
        <div class="seg" id="mk"><button type="button" class="${r.member ? 'on' : ''}" data-v="1">מצטרפת</button><button type="button" class="${!r.member ? 'on' : ''}" data-v="0">עוד לא</button></div>
        <div class="seg" id="kd">${Object.entries(KIND).map(([k, v]) => `<button type="button" class="${r.kind === k ? 'on' : ''}" data-v="${k}">${v}</button>`).join('')}</div>
        ${r.self_kind && r.self_kind !== r.kind ? `<p class="hint">היא סימנה בכניסה: ${KIND[r.self_kind]}</p>` : ''}</section>
      <h3 style="margin:16px 0 8px">היומן</h3>${journal}`;
    m.querySelector('#mk').addEventListener('click', async (e) => { const b = e.target.closest('button'); if (!b) return; try { await api.admin.update(id, { member: b.dataset.v === '1' }); r.member = b.dataset.v === '1'; m.querySelectorAll('#mk button').forEach((x) => x.classList.toggle('on', x === b)); toast('נשמר'); } catch (x) { toast(x.message); } });
    m.querySelector('#kd').addEventListener('click', async (e) => { const b = e.target.closest('button'); if (!b) return; try { await api.admin.update(id, { kind: b.dataset.v }); r.kind = b.dataset.v; m.querySelectorAll('#kd button').forEach((x) => x.classList.toggle('on', x === b)); toast('נשמר'); } catch (x) { toast(x.message); } });
    m.querySelector('.close').focus();
  }

  draw();
}

function exportCsv(rows) {
  const head = ['שם', 'מייל', 'סוג', 'מצטרפת', 'סוף התנסות', 'ימים שפתחה השבוע', 'ימים שסגרה השבוע', 'ימים מאז פתיחה אחרונה', 'פעולות מפתח שבוצעו', 'עומק %', 'הישג מפתח', 'חלקי בסיס מתוך 4', 'יומן משותף'];
  const q = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  const lines = rows.map((r) => [r.full_name, r.email, r.kind, r.member ? 'כן' : 'לא', r.trial_end, (r.week_open || []).filter(Boolean).length, (r.week_close || []).filter(Boolean).length,
    r.days_since_open, r.key_total ? `${r.key_done}/${r.key_total}` : '', r.depth, r.achievement, r.foundation_parts, r.share_journal ? 'כן' : 'לא'].map(q).join(','));
  const blob = new Blob(['﻿' + [head.map(q).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `בוגרות-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
}
