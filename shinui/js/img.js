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

// פתק בוקר 1080x1350 (מתאים לגלריה ולסטטוס). קצר: הוויה, פעולת מפתח, אמונה. מלא: גם הוויות משנה ומה יעזור.
export async function morningNote(d, { full = false, dateLabel = '', bg = 'cream' } = {}) {
  const th = TH(bg, 'cream');
  await ready();
  const W = 1080, P = 96, maxW = W - P * 2;
  const cv = document.createElement('canvas'); const ctx = cv.getContext('2d');
  // מדידה ראשונה לגובה
  const blocks = [];
  blocks.push({ k: 'date', t: dateLabel });
  blocks.push({ k: 'h', t: d.being || '' });
  if (full && (d.sub_beings || []).filter(Boolean).length) blocks.push({ k: 'row', l: 'בארבע הוויות משנה', t: d.sub_beings.filter(Boolean).join(' · ') });
  if (d.key_action) blocks.push({ k: 'row', l: d.hasBase === false ? 'הפעולה שלי' : 'פעולת המפתח', t: [d.key_action, d.key_amount, d.key_when].filter(Boolean).join(' · ') });
  const st = (d.steps || []).map((x) => x && x.text).filter(Boolean);
  if (full && st.length) blocks.push({ k: 'row', l: 'מה צריך לקרות כדי שזה יקרה', t: st.join(' · ') });
  if (full && d.being_sign) blocks.push({ k: 'row', l: 'הסימן שלי להוויה', t: d.being_sign });
  if (full && d.where_needed) blocks.push({ k: 'row', l: 'איפה ההוויה תידרש', t: d.where_needed });
  if (full && d.recover) blocks.push({ k: 'row', l: 'מה יעזור לי להתאושש', t: d.recover });
  if (d.win_belief) blocks.push({ k: 'bel', t: '״' + d.win_belief + '״' });

  ctx.direction = 'rtl'; ctx.textAlign = 'right';
  let h = P;
  const lay = blocks.map((b) => {
    let lines, lh, gap;
    if (b.k === 'date') { ctx.font = F(700, 38); lines = [b.t]; lh = 50; gap = 10; }
    else if (b.k === 'h') { ctx.font = F(700, 104); lines = wrap(ctx, 'היום אני ' + b.t + '.', maxW); lh = 112; gap = 30; }
    else if (b.k === 'row') { ctx.font = F(600, 46); lines = wrap(ctx, b.t, maxW); lh = 60; gap = 34; h += 46; }
    else { ctx.font = F(700, 52); lines = wrap(ctx, b.t, maxW); lh = 68; gap = 40; h += 40; }
    const y0 = h; h += lines.length * lh + gap; return { ...b, lines, lh, y0 };
  });
  h += 150 + P;
  const H = Math.max(1350, Math.ceil(h));
  cv.width = W; cv.height = H;
  ctx.direction = 'rtl'; ctx.textAlign = 'right';
  ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
  // שלוש נקודות המותג
  th.dots.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(P + 14 + i * 40, P + 10, 13, 0, 7); ctx.fill(); });
  const R = W - P;
  const off = Math.max(0, (H - h) / 2);
  ctx.translate(0, off);
  for (const b of lay) {
    if (b.k === 'date') text(ctx, b.lines[0], R, b.y0 + 30, F(700, 38), th.soft);
    else if (b.k === 'h') b.lines.forEach((l, i) => text(ctx, l, R, b.y0 + 96 + i * b.lh, F(700, 104), th.ink));
    else if (b.k === 'row') {
      text(ctx, b.l, R, b.y0 - 6, F(700, 34), th.acc);
      b.lines.forEach((l, i) => text(ctx, l, R, b.y0 + 44 + i * b.lh, F(600, 46), th.ink));
    } else {
      ctx.fillStyle = th.line; ctx.fillRect(P, b.y0 - 34, maxW, 4);
      b.lines.forEach((l, i) => text(ctx, l, R, b.y0 + 50 + i * b.lh, F(700, 52), th.ink));
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const credit = CONFIG.NOTE_CREDIT || '';
  const lg = th.neg ? logoNeg : logo;
  if (lg) { const lw = 300, lh = lw * lg.height / lg.width; ctx.drawImage(lg, R - lw, H - P - lh - (credit ? 44 : 0), lw, lh); }
  if (credit) text(ctx, credit, R, H - P, F(600, 28), th.soft);
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
export async function quoteCard(words, { kind = 'insight', label = '', name = '', dateLabel = '', bg = 'navy', art = '' } = {}) {
  await ready();
  const th = TH(bg, 'navy');
  art = art || (kind === 'morning' ? (CONFIG.MORNING_ART || 'img/note/art-morning-window.png') : (CONFIG.NOTE_ART || 'img/note/art-book.png'));
  if (!(art in arts)) arts[art] = await loadImg(art);
  const pic = arts[art];
  const W = 1080, H = 1350, P = 90, maxW = W - P * 2 - 40;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); ctx.direction = 'rtl';
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
  const rr = 135, areaTop = 190, areaBot = H - 250;
  const q = String(words || '').trim();
  let size = 64, lines;
  for (; size >= 30; size -= 2) { ctx.font = F(700, size); lines = wrapKeep(ctx, q, maxW); if (rr * 2 + 150 + lines.length * size * 1.32 + 70 <= areaBot - areaTop) break; }
  // מרכאות: פותחות בתחילת השורה הראשונה, סוגרות בסוף האחרונה
  lines[0] = '״' + lines[0]; lines[lines.length - 1] = lines[lines.length - 1] + '״';
  const lh = size * 1.32;
  const groupH = rr * 2 + 150 + lines.length * lh + (name ? 64 : 0);
  const g0 = areaTop + Math.max(0, (areaBot - areaTop - groupH) / 2);
  const cx = W / 2, cy = g0 + rr;
  ctx.fillStyle = bg === 'cream' ? 'rgba(166,47,125,.10)' : C.cream;
  ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.fill();
  if (pic) { const pw = 220, ph = pw * pic.height / pic.width; ctx.drawImage(pic, cx - pw / 2, cy - ph / 2 + 4, pw, ph); }
  // סימן ציטוט גדול
  text(ctx, '”', cx, cy + rr + 172, '700 190px Georgia, "Times New Roman", serif', th.acc);
  let y = cy + rr + 150 + size * .85;
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
export const sticker = (insight, o = {}) => quoteCard(insight, { kind: 'insight', label: 'תובנת ההתבוננות שלי', ...o });

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
