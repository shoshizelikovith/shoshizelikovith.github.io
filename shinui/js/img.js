// פתק בוקר וסטיקר תובנה: נוצרים בקוד, בטלפון, בלי AI. מוחזרים כ-canvas.
import { CONFIG } from './config.js';
const C = { navy: '#0D122C', mag: '#DF1767', plum: '#A62F7D', orange: '#F36E21', cream: '#F2EEE3' };
const F = (w, s) => `${w} ${s}px Assistant, sans-serif`;

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
export async function morningNote(d, { full = false, dateLabel = '' } = {}) {
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
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  // שלוש נקודות המותג
  [C.mag, C.plum, C.orange].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(P + 14 + i * 40, P + 10, 13, 0, 7); ctx.fill(); });
  const R = W - P;
  const off = Math.max(0, (H - h) / 2);
  ctx.translate(0, off);
  for (const b of lay) {
    if (b.k === 'date') text(ctx, b.lines[0], R, b.y0 + 30, F(700, 38), 'rgba(13,18,44,.7)');
    else if (b.k === 'h') b.lines.forEach((l, i) => text(ctx, l, R, b.y0 + 96 + i * b.lh, F(700, 104), C.navy));
    else if (b.k === 'row') {
      text(ctx, b.l, R, b.y0 - 6, F(700, 34), C.plum);
      b.lines.forEach((l, i) => text(ctx, l, R, b.y0 + 44 + i * b.lh, F(600, 46), C.navy));
    } else {
      ctx.fillStyle = 'rgba(13,18,44,.10)'; ctx.fillRect(P, b.y0 - 34, maxW, 4);
      b.lines.forEach((l, i) => text(ctx, l, R, b.y0 + 50 + i * b.lh, F(700, 52), C.navy));
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const credit = CONFIG.NOTE_CREDIT || '';
  if (logo) { const lw = 300, lh = lw * logo.height / logo.width; ctx.drawImage(logo, R - lw, H - P - lh - (credit ? 44 : 0), lw, lh); }
  if (credit) text(ctx, credit, R, H - P, F(600, 28), 'rgba(13,18,44,.75)');
  return cv;
}

// שומר מסך לטלפון 1080x1920: המילים מהשיחה של הבוקר. הטקסט מתחת לאזור השעון
export async function wallpaper(words, { head = '' } = {}) {
  await ready();
  const W = 1080, H = 1920, P = 110, maxW = W - P * 2;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); ctx.direction = 'rtl'; ctx.textAlign = 'center';
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  // מסגרת דקה ונקודות המותג
  ctx.strokeStyle = 'rgba(166,47,125,.35)'; ctx.lineWidth = 3; round(ctx, 60, 60, W - 120, H - 120, 48); ctx.stroke();
  const top = 640, bottom = H - 360;
  let size = 64, lines;
  for (; size >= 36; size -= 2) { ctx.font = F(700, size); lines = wrap(ctx, words, maxW); if (lines.length * size * 1.45 <= bottom - top - 120) break; }
  const lh = size * 1.45, total = lines.length * lh + (head ? 110 : 0);
  let y = top + Math.max(0, (bottom - top - total) / 2);
  if (head) {
    [C.mag, C.plum, C.orange].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(W / 2 + (i - 1) * 36, y, 11, 0, 7); ctx.fill(); });
    text(ctx, head, W / 2, y + 66, F(700, 38), C.plum); y += 110;
  }
  lines.forEach((l) => { text(ctx, l, W / 2, y + size, F(700, size), C.navy); y += lh; });
  ctx.textAlign = 'right';
  if (logo) { const lw = 260, lhh = lw * logo.height / logo.width; ctx.drawImage(logo, (W - lw) / 2, H - 200 - lhh, lw, lhh); }
  return cv;
}

// סטיקר תובנה 1080x1080
export async function sticker(insight, { name = '', dateLabel = '' } = {}) {
  await ready();
  const W = 1080, P = 90, maxW = W - P * 2;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = W;
  const ctx = cv.getContext('2d'); ctx.direction = 'rtl'; ctx.textAlign = 'right';
  ctx.fillStyle = C.navy; ctx.fillRect(0, 0, W, W);
  [C.mag, C.plum, C.orange].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(W - P - 14 - i * 40, P + 10, 13, 0, 7); ctx.fill(); });
  // גודל טקסט שנכנס
  let size = 84, lines;
  for (; size >= 44; size -= 4) { ctx.font = F(700, size); lines = wrap(ctx, insight, maxW); if (lines.length * size * 1.22 < W - P * 2 - 220) break; }
  const lh = size * 1.22; const total = lines.length * lh;
  let y = (W - total) / 2 + size * .8 - 20;
  lines.forEach((l) => { text(ctx, l, W - P, y, F(700, size), C.cream); y += lh; });
  const foot = [name, dateLabel].filter(Boolean).join(' · ');
  if (foot) text(ctx, foot, W - P, W - P, F(600, 34), C.cream);
  const credit = CONFIG.NOTE_CREDIT || '';
  if (logoNeg) { const lw = 260, lhh = lw * logoNeg.height / logoNeg.width; ctx.drawImage(logoNeg, P, W - P - lhh + 8 - (credit ? 40 : 0), lw, lhh); }
  if (credit) { ctx.textAlign = 'left'; text(ctx, credit, P, W - P + 4, F(600, 24), 'rgba(242,238,227,.8)'); ctx.textAlign = 'right'; }
  return cv;
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
