// פתק בוקר וסטיקר תובנה: נוצרים בקוד, בטלפון, בלי AI. מוחזרים כ-canvas.
import { CONFIG } from './config.js';
const C = { navy: '#0D122C', mag: '#DF1767', plum: '#A62F7D', orange: '#F36E21', cream: '#F2EEE3' };
const F = (w, s) => `${w} ${s}px Assistant, sans-serif`;
// ארבעה רקעים לבחירה. בכל רקע: צבע טקסט, צבע הדגשה, שלוש נקודות, ואיזה לוגו
export const THEMES = {
  cream: { bg: C.cream, ink: C.navy, soft: 'rgba(13,18,44,.72)', acc: C.plum, dots: [C.mag, C.plum, C.orange], neg: false, line: 'rgba(13,18,44,.10)', frame: 'rgba(166,47,125,.35)' },
  pink: { bg: C.mag, ink: C.cream, soft: 'rgba(242,238,227,.85)', acc: C.cream, dots: [C.cream, C.plum, C.orange], neg: true, line: 'rgba(242,238,227,.25)', frame: 'rgba(242,238,227,.45)' },
  navy: { bg: C.navy, ink: C.cream, soft: 'rgba(242,238,227,.8)', acc: '#F08AB5', dots: [C.mag, C.plum, C.orange], neg: true, line: 'rgba(242,238,227,.18)', frame: 'rgba(242,238,227,.35)' },
  plum: { bg: C.plum, ink: C.cream, soft: 'rgba(242,238,227,.85)', acc: C.cream, dots: [C.mag, C.cream, C.orange], neg: true, line: 'rgba(242,238,227,.25)', frame: 'rgba(242,238,227,.45)' },
};
const TH = (k, def) => THEMES[k] || THEMES[def];

let logo, logoNeg;
function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
async function ready() {
  try { await Promise.all([document.fonts.load(F(700, 40), 'אבג'), document.fonts.load(F(600, 40), 'אבג'), document.fonts.load(F(400, 40), 'אבג')]); } catch {}
  if (!logo) [logo, logoNeg] = await Promise.all([loadImg(CONFIG.NOTE_LOGO || 'img/aro-wide.png'), loadImg(CONFIG.NOTE_LOGO_NEG || 'img/aro-wide-neg.png')]);
}

// שבירת שורות מימין לשמאל
function wrap(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/).filter(Boolean); const lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
function text(ctx, s, x, y, font, color) { ctx.font = font; ctx.fillStyle = color; ctx.fillText(s, x, y); }
function round(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// פתק פתיחת היום 1080x1350 (מתארך בגרסה המלאה): תווית, תאריך, איור החלון, ״היום אני״ וההוויה, פעולת המפתח, המשפט, חתימה. עיצוב 15.11
export async function morningNote(d, { full = false, dateLabel = '', bg = 'cream', art = true } = {}) {
  const th = TH(bg, 'cream');
  await ready();
  const W = 1080, P = 90, maxW = W - P * 2 - 60, cx = W / 2;
  const pic = art ? await loadImg(CONFIG.MORNING_ART || 'img/note/art-morning-window.png') : null;
  const cv = document.createElement('canvas'); const ctx = cv.getContext('2d');
  ctx.direction = 'rtl'; ctx.textAlign = 'center';
  // בלוקים
  const rows = [];
  if (full && (d.sub_beings || []).filter(Boolean).length) rows.push(['בארבע הוויות משנה', d.sub_beings.filter(Boolean).join(' · ')]);
  const st = (d.steps || []).map((x) => x && x.text).filter(Boolean);
  if (full && st.length) rows.push(['מה צריך לקרות כדי שזה יקרה', st.join(' · ')]);
  if (full && d.being_sign) rows.push(['הסימן שלי להוויה', d.being_sign]);
  if (full && d.where_needed) rows.push(['איפה ההוויה תידרש', d.where_needed]);
  if (full && d.recover) rows.push(['מה יעזור לי להתאושש', d.recover]);
  // מדידה
  const L = [];
  const add = (kind, t, font, lh, gapBefore = 0) => { ctx.font = font; const lines = kind === 'one' ? [t] : wrap(ctx, t, maxW); L.push({ lines, font, lh, gapBefore, kind }); };
  const artH = pic ? 150 + 26 : 0;
  add('one', 'היום אני', F(600, 40), 52, 0);
  add('w', d.being || '', F(700, 92), 100, 6);
  if (d.key_action) {
    add('lab', d.hasBase === false ? 'הפעולה שלי' : 'פעולת המפתח', F(700, 32), 44, 56);
    add('w', d.key_action, F(600, 46), 60, 4);
    const sub = [d.key_amount, d.key_when].filter(Boolean).join(' · ');
    if (sub) add('sub', sub, F(400, 36), 48, 2);
  }
  rows.forEach(([l, t]) => { add('lab', l, F(700, 30), 42, 34); add('w', t, F(500, 40), 54, 2); });
  if (d.win_belief) { add('glyph', '”', '700 170px Georgia, "Times New Roman", serif', 64, 44); add('bel', '״' + d.win_belief + '״', F(700, 54), 70, 18); }
  const body = artH + L.reduce((s, b) => s + b.gapBefore + b.lines.length * b.lh, 0);
  const top = 190, footer = 250;
  const H = Math.max(1350, Math.ceil(top + body + 80 + footer));
  cv.width = W; cv.height = H;
  ctx.direction = 'rtl'; ctx.textAlign = 'center';
  ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = th.frame; ctx.lineWidth = 3; round(ctx, 44, 44, W - 88, H - 88, 44); ctx.stroke();
  // למעלה: תווית מימין, תאריך משמאל
  const label = 'פתיחת היום שלי';
  const [pb, pi] = PILL[bg] || PILL.cream;
  ctx.font = F(700, 34); const lw = ctx.measureText(label).width + 56;
  ctx.fillStyle = pb; round(ctx, W - P - lw, 92, lw, 64, 32); ctx.fill();
  text(ctx, label, W - P - lw / 2, 136, F(700, 34), pi);
  if (dateLabel) { ctx.textAlign = 'left'; text(ctx, dateLabel, P, 136, F(600, 32), th.soft); ctx.textAlign = 'center'; }
  // תוכן ממורכז בין התווית לחתימה
  let y = top + Math.max(0, (H - footer - top - body) / 2);
  if (pic) {
    const rr = 75; ctx.fillStyle = bg === 'cream' ? 'rgba(166,47,125,.10)' : C.cream;
    ctx.beginPath(); ctx.arc(cx, y + rr, rr, 0, 7); ctx.fill();
    const pw = 120, ph = pw * pic.height / pic.width; ctx.drawImage(pic, cx - pw / 2, y + rr - ph / 2 + 2, pw, ph);
    y += artH;
  }
  for (const b of L) {
    y += b.gapBefore;
    const col = b.kind === 'lab' || b.kind === 'glyph' ? th.acc : b.kind === 'sub' || b.kind === 'one' ? th.soft : th.ink;
    b.lines.forEach((l) => { y += b.lh; text(ctx, l, cx, b.kind === 'glyph' ? y + 70 : y - b.lh * .22, b.font, col); });
  }
  // חתימה כמו בפתק התובנה
  const lg = th.neg ? logoNeg : logo;
  ctx.fillStyle = th.line; ctx.fillRect(P + 20, H - 225, W - P * 2 - 40, 3);
  if (lg) { const w2 = 290, h2 = w2 * lg.height / lg.width; ctx.drawImage(lg, W - P - 10 - w2, H - 150 - h2 / 2, w2, h2); }
  ctx.textAlign = 'left';
  text(ctx, CONFIG.NOTE_APP_NAME || 'לשחק את השינוי', P + 10, H - 158, F(700, 36), th.acc);
  text(ctx, 'עם ' + (CONFIG.NOTE_SIGNATURE || 'שושי זליקוביץ׳'), P + 10, H - 112, F(600, 30), th.soft);
  return cv;
}

// שומר מסך לטלפון 1080x1920: המילים מהשיחה של הבוקר. הטקסט מתחת לאזור השעון
export async function wallpaper(words, { head = '', bg = 'cream' } = {}) {
  const th = TH(bg, 'cream');
  await ready();
  const W = 1080, H = 1920, P = 110, maxW = W - P * 2;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); ctx.direction = 'rtl'; ctx.textAlign = 'center';
  ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
  // מסגרת דקה ונקודות המותג
  ctx.strokeStyle = th.frame; ctx.lineWidth = 3; round(ctx, 60, 60, W - 120, H - 120, 48); ctx.stroke();
  const top = 640, bottom = H - 360;
  let size = 64, lines;
  for (; size >= 36; size -= 2) { ctx.font = F(700, size); lines = wrap(ctx, words, maxW); if (lines.length * size * 1.45 <= bottom - top - 120) break; }
  const lh = size * 1.45, total = lines.length * lh + (head ? 110 : 0);
  let y = top + Math.max(0, (bottom - top - total) / 2);
  if (head) {
    th.dots.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(W / 2 + (i - 1) * 36, y, 11, 0, 7); ctx.fill(); });
    text(ctx, head, W / 2, y + 66, F(700, 38), th.acc); y += 110;
  }
  lines.forEach((l) => { text(ctx, l, W / 2, y + size, F(700, size), th.ink); y += lh; });
  ctx.textAlign = 'right';
  const lg = th.neg ? logoNeg : logo;
  if (lg) { const lw = 260, lhh = lw * lg.height / lg.width; ctx.drawImage(lg, (W - lw) / 2, H - 200 - lhh, lw, lhh); }
  return cv;
}

// שבירת שורות ששומרת על ירידות שורה שהיא כתבה
function wrapKeep(ctx, t, maxW) { return String(t || '').trim().split(/\n+/).flatMap((para) => wrap(ctx, para.trim(), maxW)); }
// צבע התווית בכל רקע
const PILL = { cream: [C.plum, C.cream], pink: [C.cream, C.mag], navy: [C.mag, C.cream], plum: [C.cream, C.plum] };

// פתק ציטוט 1080x1350: תווית בצד, תאריך, איור קבוע, סימן ציטוט, המשפט במרכאות, השם, ולמטה החתימה.
// kind: insight (תובנת ההתבוננות, סגירת יום) או morning (המילים משיחת הבוקר)
const arts = {};
export async function quoteCard(words, { kind = 'insight', label = '', name = '', dateLabel = '', bg = 'navy', art = '', head = '' } = {}) {
  await ready();
  const th = TH(bg, 'navy');
  art = art || (kind === 'morning' ? (CONFIG.MORNING_ART || 'img/note/art-morning-window.png') : (CONFIG.NOTE_ART || 'img/note/art-book.png'));
  if (!(art in arts)) arts[art] = await loadImg(art);
  const pic = arts[art];
  const W = 1080, P = 90, maxW = W - P * 2 - 40;
  const cv = document.createElement('canvas'); cv.width = W;
  const ctx = cv.getContext('2d'); ctx.direction = 'rtl';
  // מדידה לפני הציור: פסקה ארוכה מאריכה את הפתק
  const rr = head ? 110 : 135, headH = head ? 76 : 0, q0 = String(words || '').trim();
  let size = 64, lines;
  for (; size >= 40; size -= 2) { ctx.font = F(700, size); lines = wrapKeep(ctx, q0, maxW); if (rr * 2 + 150 + headH + lines.length * size * 1.32 + 70 <= 1350 - 250 - 190) break; }
  if (size < 40) { size = 40; ctx.font = F(700, size); lines = wrapKeep(ctx, q0, maxW); }
  const H = Math.max(1350, Math.ceil(190 + rr * 2 + 150 + headH + lines.length * size * 1.32 + (name ? 64 : 0) + 60 + 250));
  cv.height = H; ctx.direction = 'rtl';
  ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = th.frame; ctx.lineWidth = 3; round(ctx, 44, 44, W - 88, H - 88, 44); ctx.stroke();
  // למעלה: התווית מימין, התאריך משמאל
  const [pb, pi] = PILL[bg] || PILL.navy;
  ctx.font = F(700, 34); const lw = ctx.measureText(label).width + 56;
  ctx.fillStyle = pb; round(ctx, W - P - lw, 92, lw, 64, 32); ctx.fill();
  ctx.textAlign = 'center'; text(ctx, label, W - P - lw / 2, 136, F(700, 34), pi);
  if (dateLabel) { ctx.textAlign = 'left'; ctx.direction = 'rtl'; text(ctx, dateLabel, P, 136, F(600, 32), th.soft); }
  ctx.textAlign = 'center';
  // מודדים את המשפט ומרכזים איור, סימן ציטוט, משפט ושם בשטח שבין התווית לחתימה
  const areaTop = 190, areaBot = H - 250;
  // מרכאות: פותחות בתחילת השורה הראשונה, סוגרות בסוף האחרונה
  lines[0] = '״' + lines[0]; lines[lines.length - 1] = lines[lines.length - 1] + '״';
  const lh = size * 1.32;
  const groupH = rr * 2 + 150 + headH + lines.length * lh + (name ? 64 : 0);
  const g0 = areaTop + Math.max(0, (areaBot - areaTop - groupH) / 2);
  const cx = W / 2, cy = g0 + rr;
  ctx.fillStyle = bg === 'cream' ? 'rgba(166,47,125,.10)' : C.cream;
  ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.fill();
  if (pic) { const pw = rr * 1.63, ph = pw * pic.height / pic.width; ctx.drawImage(pic, cx - pw / 2, cy - ph / 2 + 4, pw, ph); }
  // כותרת: מאיפה המילים (למשל מהשיחה עם האני העתידית)
  if (head) text(ctx, head, cx, cy + rr + 62, F(700, 40), th.acc);
  // סימן ציטוט גדול
  text(ctx, '”', cx, cy + rr + 172 + headH, '700 190px Georgia, "Times New Roman", serif', th.acc);
  let y = cy + rr + 150 + headH + size * .85;
  lines.forEach((l) => { text(ctx, l, cx, y, F(700, size), th.ink); y += lh; });
  if (name) text(ctx, name, cx, y + 20, F(700, 36), th.acc);
  // חתימה: הלוגו מצד אחד, ״לשחק את השינוי עם שושי זליקוביץ׳״ מהצד השני
  const lg = th.neg ? logoNeg : logo;
  ctx.fillStyle = th.line; ctx.fillRect(P + 20, H - 225, W - P * 2 - 40, 3);
  if (lg) { const w2 = 290, h2 = w2 * lg.height / lg.width; ctx.drawImage(lg, W - P - 10 - w2, H - 150 - h2 / 2, w2, h2); }
  ctx.textAlign = 'left';
  text(ctx, CONFIG.NOTE_APP_NAME || 'לשחק את השינוי', P + 10, H - 158, F(700, 36), th.acc);
  text(ctx, 'עם ' + (CONFIG.NOTE_SIGNATURE || 'שושי זליקוביץ׳'), P + 10, H - 112, F(600, 30), th.soft);
  return cv;
}
// פתק ״מתנות מההתבוננות שלי היום״: גילוי להיות איתו וחיזוק ללכת איתו, בפתק אחד (ניסוי 18.11)
export async function giftNote(blocksIn, { label = 'מתנות מההתבוננות שלי היום', name = '', dateLabel = '', bg = 'navy' } = {}) {
  await ready();
  const th = TH(bg, 'navy');
  const art = CONFIG.NOTE_ART || 'img/note/art-book.png';
  if (!(art in arts)) arts[art] = await loadImg(art);
  const pic = arts[art];
  const W = 1080, P = 90, maxW = W - P * 2 - 40, cx = W / 2;
  const cv = document.createElement('canvas'); cv.width = W;
  const ctx = cv.getContext('2d'); ctx.direction = 'rtl';
  const blocks = blocksIn.filter(([, t]) => String(t || '').trim());
  const rr = 95, headH = 66, gap = 80;
  let size = 56, sets, groupH;
  const measure = () => { ctx.font = F(700, size); sets = blocks.map(([, t]) => wrapKeep(ctx, t, maxW)); return rr * 2 + 50 + sets.reduce((s, ls) => s + headH + ls.length * size * 1.32, 0) + gap * (blocks.length - 1) + (name ? 70 : 0); };
  for (; size >= 38; size -= 2) { groupH = measure(); if (groupH <= 1350 - 250 - 190 - 40) break; }
  if (size < 38) { size = 38; groupH = measure(); }
  const H = Math.max(1350, Math.ceil(190 + groupH + 60 + 250));
  cv.height = H; ctx.direction = 'rtl';
  ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = th.frame; ctx.lineWidth = 3; round(ctx, 44, 44, W - 88, H - 88, 44); ctx.stroke();
  const [pb, pi] = PILL[bg] || PILL.navy;
  ctx.font = F(700, 34); const lw = ctx.measureText(label).width + 56;
  ctx.fillStyle = pb; round(ctx, W - P - lw, 92, lw, 64, 32); ctx.fill();
  ctx.textAlign = 'center'; text(ctx, label, W - P - lw / 2, 136, F(700, 34), pi);
  if (dateLabel) { ctx.textAlign = 'left'; text(ctx, dateLabel, P, 136, F(600, 32), th.soft); }
  ctx.textAlign = 'center';
  const areaTop = 190, areaBot = H - 250;
  let y = areaTop + Math.max(0, (areaBot - areaTop - groupH) / 2);
  ctx.fillStyle = bg === 'cream' ? 'rgba(166,47,125,.10)' : C.cream;
  ctx.beginPath(); ctx.arc(cx, y + rr, rr, 0, 7); ctx.fill();
  if (pic) { const pw = rr * 1.63, ph = pw * pic.height / pic.width; ctx.drawImage(pic, cx - pw / 2, y + rr - ph / 2 + 4, pw, ph); }
  y += rr * 2 + 50;
  const lh = size * 1.32;
  blocks.forEach(([h], i) => {
    if (i) { th.dots.forEach((c, k) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + (k - 1) * 30, y + gap / 2, 8, 0, 7); ctx.fill(); }); y += gap; }
    text(ctx, h, cx, y + 46, F(700, 40), th.acc); y += headH;
    sets[i].forEach((l) => { y += lh; text(ctx, l, cx, y - lh * .22, F(700, size), th.ink); });
  });
  if (name) text(ctx, name, cx, y + 56, F(700, 36), th.acc);
  const lg = th.neg ? logoNeg : logo;
  ctx.fillStyle = th.line; ctx.fillRect(P + 20, H - 225, W - P * 2 - 40, 3);
  if (lg) { const w2 = 290, h2 = w2 * lg.height / lg.width; ctx.drawImage(lg, W - P - 10 - w2, H - 150 - h2 / 2, w2, h2); }
  ctx.textAlign = 'left';
  text(ctx, CONFIG.NOTE_APP_NAME || 'לשחק את השינוי', P + 10, H - 158, F(700, 36), th.acc);
  text(ctx, 'עם ' + (CONFIG.NOTE_SIGNATURE || 'שושי זליקוביץ׳'), P + 10, H - 112, F(600, 30), th.soft);
  return cv;
}
export const sticker = (insight, o = {}) => quoteCard(insight, { kind: 'insight', label: 'תובנת ההתבוננות שלי', ...o });

// סיכום שבוע ההתנסות כעמודי A4 (1240x1754), מצויר בקוד כמו הפתקים, כי עברית בהמרת HTML מאבדת רווחים (שושי 21.11)
// sections: [{ head, rows: [[label, value], ...] }]. מחזיר מערך של canvas, עמוד לכל אחד
export async function journalPages({ title = '', sub = '', sections = [], footer = '' } = {}) {
  await ready();
  const art = await loadImg(CONFIG.NOTE_ART || 'img/note/art-book.png');
  const W = 1240, H = 1754, M = 90, PAD = 44, CW = W - 2 * M, TW = CW - 2 * PAD, BOTTOM = H - 130;
  const meas = document.createElement('canvas').getContext('2d');
  const ops = []; const cards = []; let page = 0; let y = 0;
  const newPage = () => { page++; y = M + 40; };
  // עמוד ראשון: כותרת
  page = 1; y = M;
  ops.push({ page, t: 'head' });
  y = M + 330;
  const push = (h, op) => { ops.push({ page, y, ...op }); y += h; };
  for (const sec of sections) {
    const items = [];
    meas.font = F(800, 44); items.push({ h: 70, op: { t: 'txt', s: sec.head, f: F(800, 44), c: C.plum } });
    for (const [label, value] of sec.rows) {
      meas.font = F(400, 34); const lines = wrapKeep(meas, value, TW);
      items.push({ h: 46, op: { t: 'txt', s: label, f: F(700, 26), c: 'rgba(13,18,44,.55)' }, keep: true });
      lines.forEach((ln, i) => items.push({ h: i === lines.length - 1 ? 64 : 50, op: { t: 'txt', s: ln, f: F(400, 34), c: C.navy } }));
    }
    // כרטיס שלא נכנס כולו ומתחיל בתחתית: עובר לעמוד חדש
    const total = items.reduce((a, b) => a + b.h, 0) + 2 * PAD;
    if (y + Math.min(total, 400) > BOTTOM) newPage();
    let cardTop = y; y += PAD;
    for (let i = 0; i < items.length; i++) {
      const it = items[i]; const nextH = it.keep && items[i + 1] ? items[i + 1].h : 0;
      if (y + it.h + nextH > BOTTOM) { cards.push({ page, y0: cardTop, y1: y + PAD / 2 }); newPage(); cardTop = y; y += PAD; }
      push(it.h, it.op);
    }
    y += PAD - 14; cards.push({ page, y0: cardTop, y1: y }); y += 28;
  }
  const pages = [];
  for (let pg = 1; pg <= page; pg++) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
    ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    for (const c of cards.filter((x) => x.page === pg)) { ctx.fillStyle = '#fff'; round(ctx, M, c.y0, CW, c.y1 - c.y0, 28); ctx.fill(); }
    for (const o of ops.filter((x) => x.page === pg)) {
      if (o.t === 'head') {
        if (logo) { const lw = 380, lh = lw * logo.height / logo.width; ctx.drawImage(logo, W - M - lw, M + 10, lw, lh); }
        if (art) { const aw = 210, ah = aw * art.height / art.width; ctx.drawImage(art, M, M - 10, aw, ah); }
        text(ctx, title, W - M, M + 220, F(800, 66), C.plum);
        text(ctx, sub, W - M, M + 278, F(400, 32), 'rgba(13,18,44,.6)');
      } else text(ctx, o.s, W - M - PAD, o.y + 38, o.f, o.c);
    }
    // נקודות המותג ושורת סיום
    ctx.textAlign = 'center'; text(ctx, `${footer}${page > 1 ? ' · ' + pg + '/' + page : ''}`, W / 2, H - 60, F(600, 24), 'rgba(13,18,44,.5)');
    [C.mag, C.plum, C.orange].forEach((col, i) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(W / 2 - 24 + i * 24, H - 100, 6, 0, Math.PI * 2); ctx.fill(); });
    pages.push(cv);
  }
  return pages;
}

// שמירה או שיתוף
export async function saveCanvas(cv, filename, share = false) {
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  const file = new File([blob], filename, { type: 'image/png' });
  if (share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  }
  // בטלפון: שיתוף הוא הדרך לשמור לגלריה. במחשב: הורדה.
  if (!share && /iPhone|iPad|Android/i.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
