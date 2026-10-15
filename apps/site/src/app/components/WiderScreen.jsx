// ---------------------------------------------------------------------------
// Wider: сенсорный экран 123″ на подсвеченном подиуме — живая сцена из
// фотографии с сайта производителя.
//
// Основа — та самая фотография, увеличенная в два раза, очищенная от шума
// и надписей (на экране и на панели корпуса). Всё живое рисуется поверх
// неё точно по геометрии кадра:
//   • экран показывает свой контент (холст), по стеклу пробегает блик;
//   • неоновый контур подиума дышит, по нему бежит световая волна;
//   • свет экрана ложится на подиум, в лучах парят пылинки;
//   • камера медленно «наезжает», а курсор наклоняет сцену и сдвигает свет —
//     как и раньше, картинка движется вслед за мышью.
//
// Режимы (mode) — один и тот же экспонат в разных ролях:
//   show    — главная сцена: заставка, касание, затем несколько человек
//             одновременно работают с картой, графиком, видеосвязью, слайдами;
//   touch   — мультитач: участники рисуют на экране одновременно;
//   audio   — эффект присутствия: видео на экране, звук 400 Вт из корпуса;
//   battery — мобильность: работа от батареи до 16 часов;
//   brand   — фирменный стиль: логотип и цвета клиента на экране и корпусе.
// Анимация идёт, только когда сцена видна; при «меньше движения» — стоп-кадр.
// ---------------------------------------------------------------------------
import { useEffect, useRef } from 'react';
import { tr } from '../lib/i18n.js';
import { prefersReducedMotion } from '../lib/fx.jsx';

// Геометрия исходного кадра (1147 × 626): всё в его пикселях.
const PW = 1147;
const PH = 626;
const AR = PW / PH;
const SCREEN = { x: 230.5, y: 41, w: 594, h: 218.5 };
const CAB = { x: 228, y: 261, w: 598, h: 148 };
const RIM = 'M228 356 L91 392 L523 509 L961 406 L826 378';
const RIM_LEN = 141 + 448 + 450 + 138;
const FPS = 30;
// Что держать в кадре в каждом режиме: [x0, y0, x1, y1] в долях фото.
const FOCUS = {
  show: [0.055, 0.03, 0.875, 0.885],
  touch: [0.17, 0.03, 0.745, 0.5],
  audio: [0.1, 0.03, 0.82, 0.86],
  battery: [0.06, 0.03, 0.88, 0.885],
  brand: [0.14, 0.03, 0.78, 0.74],
};
const THEMES = [
  { a: '#2563eb', b: '#60a5fa' },
  { a: '#ea580c', b: '#fdba74' },
  { a: '#059669', b: '#6ee7b7' },
];

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const font = (px, w = 600) => `${w} ${Math.max(6, Math.round(px))}px Onest, system-ui, sans-serif`;

function roundRect(c, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

// Строка, которая не помещается, ужимается по ширине.
function fitText(c, text, x, y, maxW, px, weight = 600) {
  let size = px;
  c.font = font(size, weight);
  const w = c.measureText(text).width;
  if (w > maxW) { size = Math.max(6, px * (maxW / w)); c.font = font(size, weight); }
  c.fillText(text, x, y);
}

function screenBg(c, w, h) {
  const g = c.createLinearGradient(0, 0, w * 0.9, h);
  g.addColorStop(0, '#16486c');
  g.addColorStop(0.55, '#0b2b47');
  g.addColorStop(1, '#03142a');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

function finger(c, x, y, r, press) {
  c.save();
  c.fillStyle = `rgba(255,255,255,${0.16 + 0.24 * press})`;
  c.strokeStyle = 'rgba(255,255,255,0.8)';
  c.lineWidth = Math.max(1, r * 0.12);
  c.beginPath();
  c.arc(x, y, r * (1 - 0.12 * press), 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.restore();
}

function ripple(c, x, y, r, p, color = '170,212,255') {
  if (p <= 0 || p >= 1) return;
  c.save();
  c.strokeStyle = `rgba(${color},${(1 - p) * 0.9})`;
  c.lineWidth = Math.max(1, r * 0.1);
  c.beginPath();
  c.arc(x, y, r * (0.6 + p * 2.6), 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

// ── Заставка: подпись, крупно «123″», касание пальцем ──────────────────────
function drawIntro(c, w, h, t) {
  screenBg(c, w, h);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = 'rgba(255,255,255,0.86)';
  fitText(c, tr('Всё-в-одном для визуализации'), w / 2, h * 0.19, w * 0.8, h * 0.074, 500);
  // крупные цифры с холодным градиентом, как фирменная надпись на экране
  const size = h * 0.42;
  c.font = font(size, 700);
  const g = c.createLinearGradient(0, h * 0.3, 0, h * 0.7);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#cbe8ff');
  g.addColorStop(1, '#4aa8f0');
  c.fillStyle = g;
  c.fillText('123″', w / 2, h * 0.5);
  // блик пробегает по цифрам
  const sweep = ((t * 0.32) % 1.6) - 0.3;
  c.save();
  c.globalCompositeOperation = 'source-atop';
  const s = c.createLinearGradient(w * (sweep - 0.12), 0, w * (sweep + 0.12), h);
  s.addColorStop(0, 'rgba(255,255,255,0)');
  s.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  s.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = s;
  c.fillText('123″', w / 2, h * 0.5);
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.8)';
  fitText(c, tr('Сенсорный экран для выставок, переговоров и мероприятий'), w / 2, h * 0.81, w * 0.86, h * 0.062, 500);
  const R = h * 0.04;
  ripple(c, w * 0.66, h * 0.56, R, seg(t, 2.4, 3.3));
  if (t > 2.3 && t < 2.8) finger(c, w * 0.66, h * 0.56, R, 1);
  ripple(c, w * 0.34, h * 0.62, R, seg(t, 3.2, 4.1));
  if (t > 3.1 && t < 3.6) finger(c, w * 0.34, h * 0.62, R, 1);
}

// ── Рабочий стол: несколько человек работают одновременно ──────────────────
const ROADS = [
  [[0.02, 0.72], [0.25, 0.6], [0.48, 0.64], [0.7, 0.42], [0.98, 0.36]],
  [[0.12, 0.02], [0.2, 0.3], [0.32, 0.55], [0.36, 0.98]],
  [[0.55, 0.98], [0.6, 0.7], [0.74, 0.52], [0.9, 0.12]],
];

function pointOn(path, t) {
  const n = path.length - 1;
  const u = ((t % 1) + 1) % 1;
  const f = Math.min(n - 1e-6, u * n);
  const i = Math.max(0, Math.floor(f));
  const k = f - i;
  return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k];
}

function drawDesk(c, cw, ch, t) {
  const R = ch * 0.038;
  const bg = c.createLinearGradient(0, 0, 0, ch);
  bg.addColorStop(0, '#10233d');
  bg.addColorStop(1, '#081426');
  c.fillStyle = bg;
  c.fillRect(0, 0, cw, ch);
  c.strokeStyle = 'rgba(255,255,255,0.035)';
  c.lineWidth = 1;
  for (let x = cw / 64; x < cw; x += cw / 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, ch); c.stroke(); }
  const pad = ch * 0.07;
  const gap = ch * 0.05;
  const radius = ch * 0.03;
  const panel = (x, y, w, h) => {
    roundRect(c, x, y, w, h, radius);
    c.fillStyle = 'rgba(255,255,255,0.05)';
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.1)';
    c.lineWidth = 1;
    c.stroke();
  };
  // 1. Карта — касание, затем щипок-приближение.
  const mx = pad; const my = pad; const mw = cw * 0.4 - pad; const mh = ch - pad * 2;
  panel(mx, my, mw, mh);
  const pA = t % 4.6;
  const pinch = ease(seg(pA, 1.6, 2.6)) * (1 - ease(seg(pA, 3.4, 4.3)));
  const zx = mx + mw * 0.55; const zy = my + mh * 0.5;
  c.save();
  roundRect(c, mx, my, mw, mh, radius);
  c.clip();
  c.translate(zx, zy);
  c.scale(1 + 0.18 * pinch, 1 + 0.18 * pinch);
  c.translate(-zx, -zy);
  c.fillStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 18; i++) c.fillRect(mx + (((i * 37) % 97) / 100) * mw, my + (((i * 61) % 89) / 100) * mh, mw * 0.08, mh * 0.1);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  ROADS.forEach((road, ri) => {
    c.strokeStyle = 'rgba(110,160,255,0.38)';
    c.lineWidth = ch * 0.018;
    c.beginPath();
    road.forEach(([x, y], i) => { const px = mx + x * mw; const py = my + y * mh; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
    c.stroke();
    for (let k = 0; k < 3; k++) {
      const [x, y] = pointOn(road, (t * (0.07 + ri * 0.02) + k / 3) % 1);
      const px = mx + x * mw; const py = my + y * mh; const gr = ch * 0.04;
      const g = c.createRadialGradient(px, py, 0, px, py, gr);
      g.addColorStop(0, 'rgba(255,214,120,0.95)');
      g.addColorStop(1, 'rgba(255,214,120,0)');
      c.fillStyle = g;
      c.fillRect(px - gr, py - gr, gr * 2, gr * 2);
    }
  });
  const pulse = (t % 1.8) / 1.8; const ox = mx + mw * 0.62; const oy = my + mh * 0.44;
  c.fillStyle = '#3b82f6';
  c.beginPath(); c.arc(ox, oy, ch * 0.018, 0, Math.PI * 2); c.fill();
  c.strokeStyle = `rgba(59,130,246,${1 - pulse})`;
  c.lineWidth = 2;
  c.beginPath(); c.arc(ox, oy, ch * (0.02 + 0.06 * pulse), 0, Math.PI * 2); c.stroke();
  c.restore();
  if (pA < 1.1) { const fx = mx + mw * 0.3; const fy = my + mh * 0.62; ripple(c, fx, fy, R, seg(pA, 0.2, 1.0)); finger(c, fx, fy, R, pA < 0.45 ? 1 : 0); }
  if (pA > 1.4 && pA < 4.4) { const d = mw * (0.06 + 0.1 * pinch); finger(c, zx - d, zy + d * 0.3, R, 1); finger(c, zx + d, zy - d * 0.3, R, 1); }
  // 2. График — палец ведёт по столбцам, подсказка показывает значение.
  const gx = cw * 0.4 + gap * 0.5; const gy = pad; const gw = cw * 0.28; const gh = (ch - pad * 2 - gap) * 0.56;
  panel(gx, gy, gw, gh);
  const bars = 14; const bw = (gw - pad * 2) / bars;
  for (let i = 0; i < bars; i++) {
    const v = 0.35 + 0.28 * Math.sin(i * 0.9 + t * 0.8) + 0.18 * Math.sin(i * 2.1 - t * 0.5);
    const bh = (gh - pad * 2.2) * clamp01(v);
    c.fillStyle = i === 9 ? 'rgba(96,165,250,0.95)' : 'rgba(96,165,250,0.45)';
    roundRect(c, gx + pad + i * bw + bw * 0.18, gy + gh - pad - bh, bw * 0.64, bh, bw * 0.12);
    c.fill();
  }
  const pB = t % 3.8; const drag = ease(seg(pB, 0.3, 2.6));
  if (pB > 0.2 && pB < 3.0) {
    const fx = gx + pad + (gw - pad * 2) * (0.1 + 0.8 * drag);
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(fx, gy + pad * 0.6); c.lineTo(fx, gy + gh - pad * 0.6); c.stroke();
    const tipW = gw * 0.2; const tipH = gh * 0.16;
    roundRect(c, fx - tipW / 2, gy + pad * 0.7, tipW, tipH, tipH * 0.3);
    c.fillStyle = 'rgba(8,14,26,0.92)';
    c.fill();
    c.fillStyle = '#fff';
    c.font = font(tipH * 0.55);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(`${Math.round(40 + 55 * drag)}%`, fx, gy + pad * 0.7 + tipH / 2);
    finger(c, fx, gy + gh * 0.72, R, 1);
  }
  // 3. Видеосвязь — четыре окна, говорящий подсвечен.
  const vx = gx; const vy = gy + gh + gap; const vw = gw; const vh = ch - pad - vy;
  const tiles = [['#36507d', '#1c2c4a'], ['#5b3f6e', '#2b1d3a'], ['#2f5e57', '#173430'], ['#6b5433', '#35291a']];
  const speaking = Math.floor(t / 2.4) % 4;
  tiles.forEach(([a, b], i) => {
    const tw = (vw - gap) / 2; const th = (vh - gap) / 2;
    const x = vx + (i % 2) * (tw + gap); const y = vy + Math.floor(i / 2) * (th + gap);
    const g = c.createLinearGradient(x, y, x, y + th);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    roundRect(c, x, y, tw, th, ch * 0.02);
    c.fillStyle = g;
    c.fill();
    c.save();
    roundRect(c, x, y, tw, th, ch * 0.02);
    c.clip();
    c.fillStyle = 'rgba(255,255,255,0.26)';
    c.beginPath(); c.arc(x + tw / 2, y + th * 0.42, th * 0.16, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(x + tw / 2, y + th * 1.02, tw * 0.24, th * 0.36, 0, Math.PI, 0); c.fill();
    c.restore();
    if (i === speaking) { roundRect(c, x, y, tw, th, ch * 0.02); c.strokeStyle = 'rgba(96,165,250,0.95)'; c.lineWidth = 2.5; c.stroke(); }
  });
  // 4. Показатели.
  const kx = cw * 0.68 + gap * 0.5; const ky = pad; const kw = cw - pad - kx; const kh = (ch - pad * 2 - gap) * 0.42;
  panel(kx, ky, kw, kh);
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.font = font(kh * 0.13, 500);
  c.fillText('LIVE', kx + pad * 0.8, ky + kh * 0.3);
  c.fillStyle = '#34d399';
  c.beginPath(); c.arc(kx + pad * 0.8 + kh * 0.4, ky + kh * 0.255, kh * 0.035, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff';
  c.font = font(kh * 0.36, 650);
  c.fillText(String(1284 + (Math.floor(t * 3) % 60)), kx + pad * 0.8, ky + kh * 0.74);
  c.fillStyle = '#60a5fa';
  c.font = font(kh * 0.16, 600);
  c.fillText('+24%', kx + kw * 0.64, ky + kh * 0.74);
  // 5. Слайды — третий участник листает.
  const sx = kx; const sy = ky + kh + gap; const sw = kw; const sh = ch - pad - sy;
  panel(sx, sy, sw, sh);
  const pC = t % 3.4; const shift = ease(seg(pC, 0.5, 1.3)); const base = Math.floor(t / 3.4);
  const hues = ['#1d4ed8', '#0891b2', '#7c3aed', '#059669', '#ea580c'];
  c.save();
  roundRect(c, sx, sy, sw, sh, radius);
  c.clip();
  for (let i = 0; i < 3; i++) {
    const cardW = sw * 0.62; const x = sx + pad * 0.8 + (i - shift) * (cardW + gap); const y = sy + pad * 0.8; const hg = sh - pad * 1.6;
    const g = c.createLinearGradient(x, y, x + cardW, y + hg);
    g.addColorStop(0, hues[(base + i) % hues.length]);
    g.addColorStop(1, '#0b1220');
    roundRect(c, x, y, cardW, hg, ch * 0.025);
    c.fillStyle = g;
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.fillRect(x + cardW * 0.1, y + hg * 0.68, cardW * 0.5, hg * 0.07);
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.fillRect(x + cardW * 0.1, y + hg * 0.8, cardW * 0.32, hg * 0.06);
  }
  c.restore();
  if (pC > 0.35 && pC < 1.5) finger(c, sx + sw * (0.82 - 0.5 * shift), sy + sh * 0.55, R, 1);
}

// Главная сцена: заставка → рабочий стол → снова заставка.
const SHOW = 21;
function drawShow(c, w, h, t) {
  const u = t % SHOW;
  const a = seg(u, 4.6, 5.6); // заставка уходит
  const b = seg(u, 19.8, 21); // заставка возвращается
  if (u < 4.6 || u >= 21) { drawIntro(c, w, h, u); return; }
  if (u < 5.6) {
    drawDesk(c, w, h, u - 4.6);
    c.save(); c.globalAlpha = 1 - ease(a); drawIntro(c, w, h, u); c.restore();
    return;
  }
  drawDesk(c, w, h, u - 4.6);
  if (b > 0) { c.save(); c.globalAlpha = ease(b); drawIntro(c, w, h, 0); c.restore(); }
}

// ── Мультитач: три участника рисуют одновременно ───────────────────────────
const PENS = [
  { color: '125,211,252', cx: 0.2, cy: 0.52, ax: 0.13, ay: 0.3, f: [1, 2], ph: 0.3 },
  { color: '251,191,36', cx: 0.5, cy: 0.5, ax: 0.14, ay: 0.32, f: [2, 1], ph: 1.7 },
  { color: '244,114,182', cx: 0.8, cy: 0.5, ax: 0.13, ay: 0.3, f: [1, 3], ph: 2.9 },
];
function drawBoard(c, w, h, t) {
  c.fillStyle = '#0a1a2e';
  c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(160,200,255,0.12)';
  const step = h / 12;
  for (let y = step / 2; y < h; y += step) for (let x = step / 2; x < w; x += step) c.fillRect(x, y, 1.2, 1.2);
  const R = h * 0.04;
  let touches = 0;
  PENS.forEach((p, i) => {
    const cyc = 5.2;
    const local = (t + i * 1.1) % cyc;
    const round = Math.floor((t + i * 1.1) / cyc);
    const grow = ease(seg(local, 0.2, 3.2));
    const fade = 1 - seg(local, 4.2, 5.0);
    const ph = p.ph + round * 0.9;
    const P = (s) => [w * (p.cx + p.ax * Math.sin(s * Math.PI * 2 * p.f[0] + ph)), h * (p.cy + p.ay * Math.sin(s * Math.PI * 2 * p.f[1] + ph * 1.3))];
    if (grow > 0 && fade > 0) {
      c.save();
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.strokeStyle = `rgba(${p.color},${0.9 * fade})`;
      c.shadowColor = `rgba(${p.color},0.8)`;
      c.shadowBlur = h * 0.04;
      c.lineWidth = h * 0.022;
      c.beginPath();
      const n = Math.max(2, Math.round(70 * grow));
      for (let k = 0; k <= n; k++) { const [x, y] = P((k / 70) * 0.8); if (k) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
      c.restore();
    }
    if (local > 0.15 && local < 3.25) {
      touches += 1;
      const [fx, fy] = P(grow * 0.8);
      finger(c, fx, fy, R, 1);
    }
    ripple(c, w * (p.cx + 0.05), h * 0.3, R, seg(local, 3.6, 4.4), p.color);
    if (local > 3.55 && local < 3.8) touches += 1;
  });
  // мягкий экран гасит удар: волна по поверхности
  const hit = t % 7.5;
  if (hit > 5.6 && hit < 6.9) {
    const p = seg(hit, 5.6, 6.9);
    c.save();
    c.strokeStyle = `rgba(255,255,255,${0.35 * (1 - p)})`;
    c.lineWidth = h * 0.012;
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.ellipse(w * 0.62, h * 0.4, w * (0.04 + p * 0.3 + k * 0.05), h * (0.06 + p * 0.5 + k * 0.08), 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
  }
  // счётчик касаний
  const label = `${tr('Касаний сейчас')}: ${Math.max(1, touches)}`;
  c.font = font(h * 0.06, 600);
  const tw = c.measureText(label).width + h * 0.08;
  roundRect(c, h * 0.06, h * 0.06, tw, h * 0.11, h * 0.03);
  c.fillStyle = 'rgba(6,12,24,0.75)';
  c.fill();
  c.fillStyle = '#e2f2ff';
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText(label, h * 0.1, h * 0.115);
}

// ── Эффект присутствия: видео на экране ────────────────────────────────────
function drawCinema(c, w, h, t) {
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#081530');
  sky.addColorStop(0.55, '#1c2f6b');
  sky.addColorStop(1, '#3a2457');
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  // северное сияние
  for (let k = 0; k < 3; k++) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(0, 0, 0, h * 0.7);
    const col = ['56,189,248', '74,222,128', '167,139,250'][k];
    g.addColorStop(0, `rgba(${col},0)`);
    g.addColorStop(0.5, `rgba(${col},0.22)`);
    g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, h * 0.7);
    for (let x = 0; x <= w; x += w / 40) c.lineTo(x, h * (0.3 + 0.12 * Math.sin(x / w * 6 + t * (0.5 + k * 0.2) + k * 2) + 0.05 * Math.sin(x / w * 17 - t)));
    c.lineTo(w, h * 0.7);
    c.closePath();
    c.fill();
    c.restore();
  }
  // горы в несколько планов
  const layers = [['#1a1f45', 0.62, 0.05], ['#11163a', 0.7, 0.08], ['#090c22', 0.8, 0.12]];
  layers.forEach(([col, base, amp], k) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 60) {
      const s = x / w + t * 0.01 * (k + 1);
      c.lineTo(x, h * (base - amp * Math.abs(Math.sin(s * 9 + k)) - amp * 0.5 * Math.sin(s * 23 + k * 3)));
    }
    c.lineTo(w, h);
    c.closePath();
    c.fill();
  });
  // эквалайзер и строка плеера
  const bars = 24;
  for (let i = 0; i < bars; i++) {
    const v = 0.25 + 0.5 * Math.abs(Math.sin(t * (2 + (i % 5) * 0.4) + i * 0.7)) * (0.6 + 0.4 * Math.sin(t * 1.3 + i));
    const bw = (w * 0.3) / bars;
    c.fillStyle = 'rgba(125,211,252,0.85)';
    c.fillRect(w * 0.66 + i * bw, h * 0.92 - v * h * 0.16, bw * 0.6, v * h * 0.16);
  }
  c.fillStyle = 'rgba(255,255,255,0.25)';
  c.fillRect(w * 0.05, h * 0.9, w * 0.55, h * 0.012);
  c.fillStyle = '#7dd3fc';
  c.fillRect(w * 0.05, h * 0.9, w * 0.55 * ((t % 30) / 30), h * 0.012);
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  fitText(c, `4K · ${tr('стерео 400 Вт')}`, w * 0.05, h * 0.84, w * 0.5, h * 0.06, 600);
}

// ── Мобильность: работа от батареи ─────────────────────────────────────────
function drawBattery(c, w, h, t) {
  screenBg(c, w, h);
  const level = 0.96 - ((t % 40) / 40) * 0.3;
  const cx = w * 0.24; const cy = h * 0.5; const r = h * 0.3;
  c.lineCap = 'round';
  c.lineWidth = h * 0.05;
  c.strokeStyle = 'rgba(255,255,255,0.12)';
  c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, Math.PI * 1.5); c.stroke();
  const g = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, '#4ade80');
  g.addColorStop(1, '#22d3ee');
  c.strokeStyle = g;
  c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * level); c.stroke();
  c.fillStyle = '#fff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = font(h * 0.17, 700);
  // время считаем от тех же процентов, что на экране: 93% от 16 ч = 14 ч 53 мин
  const pctNow = Math.round(level * 100);
  c.fillText(`${pctNow}%`, cx, cy);
  const minutes = Math.round((pctNow / 100) * 16 * 60);
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  c.textAlign = 'left';
  c.fillStyle = 'rgba(255,255,255,0.6)';
  fitText(c, tr('Работа от батареи'), w * 0.46, h * 0.26, w * 0.5, h * 0.065, 500);
  c.fillStyle = '#fff';
  fitText(c, `${hh} ${tr('ч')} ${String(mm).padStart(2, '0')} ${tr('мин')}`, w * 0.46, h * 0.42, w * 0.5, h * 0.14, 700);
  c.fillStyle = 'rgba(255,255,255,0.6)';
  fitText(c, tr('осталось без розетки'), w * 0.46, h * 0.56, w * 0.5, h * 0.06, 500);
  // плашки: кейс, быстрая сборка, до 16 часов
  const chips = [tr('до 16 ч от батареи'), tr('кейс для перевозки'), tr('быстрая сборка')];
  let x = w * 0.46;
  chips.forEach((txt, i) => {
    c.font = font(h * 0.05, 600);
    const tw = c.measureText(txt).width + h * 0.08;
    if (x + tw > w * 0.97) return;
    const on = Math.floor(t / 1.6) % 3 === i;
    roundRect(c, x, h * 0.68, tw, h * 0.1, h * 0.05);
    c.fillStyle = on ? 'rgba(74,222,128,0.22)' : 'rgba(255,255,255,0.07)';
    c.fill();
    c.strokeStyle = on ? 'rgba(74,222,128,0.7)' : 'rgba(255,255,255,0.15)';
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = on ? '#bbf7d0' : 'rgba(255,255,255,0.75)';
    c.textBaseline = 'middle';
    c.fillText(txt, x + h * 0.04, h * 0.73);
    x += tw + h * 0.03;
  });
}

// ── Фирменный стиль клиента ────────────────────────────────────────────────
function drawBrand(c, w, h, t) {
  const k = Math.floor(t / 4) % THEMES.length;
  const th = THEMES[k];
  const mix = seg(t % 4, 0, 0.6);
  c.fillStyle = '#0b1220';
  c.fillRect(0, 0, w, h);
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, th.a);
  g.addColorStop(1, '#0b1220');
  c.globalAlpha = 0.35 + 0.65 * mix;
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.globalAlpha = 1;
  // шапка в цветах бренда
  c.fillStyle = th.a;
  c.fillRect(0, 0, w, h * 0.12);
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.fillRect(w * 0.04, h * 0.045, w * 0.08, h * 0.03);
  // место под логотип
  const lx = w * 0.06; const ly = h * 0.24; const lw = w * 0.36; const lh = h * 0.56;
  c.save();
  c.setLineDash([h * 0.03, h * 0.02]);
  c.strokeStyle = 'rgba(255,255,255,0.75)';
  c.lineWidth = Math.max(1, h * 0.008);
  roundRect(c, lx, ly, lw, lh, h * 0.04);
  c.stroke();
  c.restore();
  c.fillStyle = '#fff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  fitText(c, tr('Ваш логотип'), lx + lw / 2, ly + lh / 2, lw * 0.85, h * 0.1, 700);
  // слайды и плашки бренда справа
  for (let i = 0; i < 3; i++) {
    const y = h * (0.24 + i * 0.2);
    roundRect(c, w * 0.48, y, w * 0.46, h * 0.15, h * 0.03);
    c.fillStyle = i === Math.floor(t / 1.3) % 3 ? th.b : 'rgba(255,255,255,0.12)';
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.fillRect(w * 0.51, y + h * 0.05, w * 0.22, h * 0.025);
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.fillRect(w * 0.51, y + h * 0.09, w * 0.14, h * 0.02);
  }
  return k;
}

// Кадр без текста: экспонат по центру (карточка — чуть ниже, чтобы бейдж
// в углу не ложился на экран) или сбоку.
function place(W, H, align, mode) {
  const [x0, y0, x1, y1] = FOCUS[mode] || FOCUS.show;
  const card = align === 'card';
  const center = align === 'center' || card;
  const side = !center && W >= 760;
  const top = !center && !side;
  const areaW = side ? W * 0.6 : W * 0.97;
  const areaH = side ? H * 0.84 : top ? H * 0.5 : card ? H * 0.86 : H * 0.96;
  const cx = side ? (align === 'right' ? W * 0.68 : W * 0.32) : W / 2;
  const cy = side ? H * 0.53 : top ? H * 0.3 : card ? H * 0.56 : H / 2;
  const pw = Math.min(areaW / (x1 - x0), (areaH * AR) / (y1 - y0));
  const ph = pw / AR;
  return { left: cx - ((x0 + x1) / 2) * pw, top: cy - ((y0 + y1) / 2) * ph, width: pw, height: ph };
}

// Кадр с текстом (слайд на главной). Корпус с экраном не заходит под текст,
// светящийся подиум — под заголовок. Экспонат ставим туда, где свободно:
// на широком экране — в колонку рядом с текстом, на высоком — над текстом,
// и выбираем между «крупнее» и «ровнее по центру свободного места».
// Геометрия — в пикселях исходного кадра: корпус и выпуклый контур подиума,
// сразу с учётом «наезда» камеры (o-wd-push: до 1.045 вокруг 46% × 52%).
const PUSH = 1.045;
const pushX = (x) => PW * 0.46 + (x - PW * 0.46) * PUSH;
const pushY = (y) => PH * 0.52 + (y - PH * 0.52) * PUSH;
const BODY_PX = [pushX(228), pushY(41), pushX(826), pushY(409)];
const HULL = [[91, 392], [228, 356], [826, 378], [961, 406], [523, 509]].map(([x, y]) => [pushX(x), pushY(y)]);
const HULL_BOX = [pushX(91), pushY(356), pushX(961), pushY(509)];
const AXES = HULL.map((p, i) => {
  const q = HULL[(i + 1) % HULL.length];
  const nx = q[1] - p[1];
  const ny = p[0] - q[0];
  const pr = HULL.map(([x, y]) => x * nx + y * ny);
  return [nx, ny, Math.min(...pr), Math.max(...pr)];
});
// середина экспоната (корпус и подиум вместе) и его размеры
const MID_X = (HULL_BOX[0] + HULL_BOX[2]) / 2;
const MID_Y = (BODY_PX[1] + HULL_BOX[3]) / 2;
const SPAN_X = HULL_BOX[2] - HULL_BOX[0];
const SPAN_Y = HULL_BOX[3] - BODY_PX[1];

// Пересекает ли подиум (масштаб k, сдвиг L,T) прямоугольник r — теорема
// о разделяющей оси: подиум выпуклый, прямоугольник тоже.
function hullHits(L, T, k, r) {
  if (L + HULL_BOX[2] * k <= r.l || L + HULL_BOX[0] * k >= r.r || T + HULL_BOX[3] * k <= r.t || T + HULL_BOX[1] * k >= r.b) return false;
  for (let i = 0; i < AXES.length; i++) {
    const [nx, ny, a, b] = AXES[i];
    const o = L * nx + T * ny;
    const c1 = r.l * nx + r.t * ny; const c2 = r.r * nx + r.t * ny; const c3 = r.r * nx + r.b * ny; const c4 = r.l * nx + r.b * ny;
    if (o + b * k <= Math.min(c1, c2, c3, c4) || Math.max(c1, c2, c3, c4) <= o + a * k) return false;
  }
  return true;
}

const grow = (r, m) => ({ l: r.l - m, t: r.t - m, r: r.r + m, b: r.b + m });

function placeClear(clear) {
  const f = clear.frame;
  const fw = f.r - f.l;
  const fh = f.b - f.t;
  if (!(fw > 160 && fh > 160)) return null;
  const m = Math.max(14, Math.min(34, fw * 0.022));
  const mf = Math.max(10, Math.min(24, Math.min(fw, fh) * 0.02));
  const mt = Math.max(mf, fh * 0.03);
  const bleed = fw * (fw < 760 ? 0.1 : 0.035);
  const title = clear.title || [];
  const text = clear.text || [];
  const all = [...title, ...text];
  const bodyObs = all.map((r) => grow(r, m));
  // свечение подиума выходит за линию на ~10 px — отступ от текста больше
  const hullObs = [...title.map((r) => grow(r, Math.max(14, m * 0.7))), ...text.map((r) => grow(r, Math.max(12, m * 0.5)))];
  const bounds = (k) => {
    const L0 = Math.max(f.l + mf - BODY_PX[0] * k, f.l - bleed - HULL_BOX[0] * k);
    const L1 = Math.min(f.r - mf - BODY_PX[2] * k, f.r + bleed - HULL_BOX[2] * k);
    const T0 = f.t + mt - BODY_PX[1] * k;
    const T1 = f.b - 4 - HULL_BOX[3] * k;
    return L1 >= L0 && T1 >= T0 ? [L0, L1, T0, T1] : null;
  };
  const fits = (L, T, k) => {
    const bl = L + BODY_PX[0] * k; const bt = T + BODY_PX[1] * k; const br = L + BODY_PX[2] * k; const bb = T + BODY_PX[3] * k;
    for (let i = 0; i < bodyObs.length; i++) { const r = bodyObs[i]; if (bl < r.r && br > r.l && bt < r.b && bb > r.t) return false; }
    for (let i = 0; i < hullObs.length; i++) if (hullHits(L, T, k, hullObs[i])) return false;
    return true;
  };
  const step = Math.max(3, Math.min(fw, fh) / 70);
  // Обход положений на сетке: visit(L, T) для каждого подходящего;
  // если visit вернёт true — обход прекращается.
  const scan = (k, visit) => {
    const b = bounds(k);
    if (!b) return false;
    for (let T = b[2]; T <= b[3]; T += step) {
      for (let L = b[0]; L <= b[1]; L += step) if (fits(L, T, k) && visit(L, T)) return true;
    }
    return false;
  };
  const any = (k) => scan(k, () => true);
  // самый крупный экспонат, который вообще помещается
  let hi = Math.min((fw - 2 * mf) / (BODY_PX[2] - BODY_PX[0]), (fw + 2 * bleed) / SPAN_X, (fh - mt - 4) / SPAN_Y);
  let lo = hi * 0.22;
  if (!any(lo)) return null;
  if (any(hi)) lo = hi;
  else for (let it = 0; it < 12; it++) { const mid = (lo + hi) / 2; if (any(mid)) lo = mid; else hi = mid; }
  const kMax = lo;
  // куда тянуть: в колонку рядом с текстом или в полосу над ним — где
  // поместится экспонат крупнее (колонке чуть отдаём предпочтение)
  let P = [(f.l + f.r) / 2, (f.t + f.b) / 2];
  if (all.length) {
    const tb = all.reduce((a, r) => ({ l: Math.min(a.l, r.l), t: Math.min(a.t, r.t), r: Math.max(a.r, r.r), b: Math.max(a.b, r.b) }), { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity });
    const onLeft = tb.l + tb.r < f.l + f.r;
    const c0 = onLeft ? Math.max(f.l, tb.r) : f.l;
    const c1 = onLeft ? f.r : Math.min(f.r, tb.l);
    const kSide = Math.min((c1 - c0) / SPAN_X, fh / SPAN_Y);
    const kTop = Math.min(fw / SPAN_X, (tb.t - f.t) / SPAN_Y);
    P = kSide >= kTop * 0.85 ? [(c0 + c1) / 2, (f.t + f.b) / 2] : [(f.l + f.r) / 2, (f.t + Math.max(f.t, tb.t)) / 2];
  }
  // Крупнее или ровнее: 10% размера стоят столько же, сколько сдвиг
  // середины экспоната на 10% кадра от желаемой точки.
  let best = null;
  for (const share of [1, 0.96, 0.92, 0.88, 0.84, 0.8, 0.76, 0.72, 0.68]) {
    const k = kMax * share;
    let d2 = Infinity; let at = null;
    scan(k, (L, T) => {
      const dx = (L + MID_X * k - P[0]) / fw;
      const dy = (T + MID_Y * k - P[1]) / fh;
      const d = dx * dx + dy * dy;
      if (d < d2) { d2 = d; at = [L, T]; }
      return false;
    });
    if (!at) continue;
    const score = share - Math.sqrt(d2);
    if (!best || score > best.score) best = { score, k, at };
  }
  if (!best) return null;
  return { left: best.at[0], top: best.at[1], width: PW * best.k, height: PH * best.k };
}

const pct = (v, total) => `${((v / total) * 100).toFixed(3)}%`;
// Пылинки в свете подиума — по бокам от корпуса, чтобы не «пачкать» его.
const MOTES = Array.from({ length: 12 }, (_, i) => ({
  x: i % 2 ? 74 + ((i * 37) % 17) : 5 + ((i * 41) % 14), y: 62 + ((i * 29) % 22), s: 1.3 + ((i * 7) % 5) * 0.4, d: -((i * 1.37) % 9), t: 7 + ((i * 3) % 6),
}));

// avoid(root) — для кадра с текстом: { frame, title, text, watch } в
// координатах сцены (что закрывать нельзя и за чем следить при перестройке).
export function WiderScreen({ active = true, align = 'center', mode = 'show', className = 'o-stage', avoid = null }) {
  const rootRef = useRef(null);
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const activeRef = useRef(active);
  const wasActive = useRef(active);
  const syncRef = useRef(() => {});
  const restartRef = useRef(() => {});

  useEffect(() => {
    activeRef.current = active;
    // слайд снова на экране — ролик на экране начинается с заставки
    if (active && !wasActive.current) restartRef.current();
    wasActive.current = active;
    syncRef.current();
  }, [active]);

  // Кадр, экран и анимация.
  useEffect(() => {
    const root = rootRef.current;
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!root || !box || !canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const reduced = prefersReducedMotion();
    let t0 = performance.now();
    let raf = 0; let last = 0; let inView = true; let theme = -1; let alive = true; let pending = 0;
    let ro = null;
    const watched = new Set();

    const layout = () => {
      const W = root.clientWidth;
      const H = root.clientHeight;
      if (!W || !H) return;
      const clear = avoid ? avoid(root) : null;
      if (clear && ro) for (const el of clear.watch || []) if (el && !watched.has(el)) { watched.add(el); ro.observe(el); }
      const p = (clear && placeClear(clear)) || place(W, H, align, mode);
      box.style.left = `${p.left}px`;
      box.style.top = `${p.top}px`;
      box.style.width = `${p.width}px`;
      box.style.height = `${p.height}px`;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.max(2, Math.round((p.width * SCREEN.w / PW) * dpr));
      const ch = Math.max(2, Math.round((p.height * SCREEN.h / PH) * dpr));
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    };
    const draw = (now) => {
      const t = reduced ? 9 : Math.max(0, now - t0) / 1000;
      const w = canvas.width; const h = canvas.height;
      if (mode === 'touch') drawBoard(ctx, w, h, t);
      else if (mode === 'audio') drawCinema(ctx, w, h, t);
      else if (mode === 'battery') drawBattery(ctx, w, h, t);
      else if (mode === 'brand') {
        const k = drawBrand(ctx, w, h, t);
        if (k !== theme) { theme = k; root.style.setProperty('--wd-a', THEMES[k].a); root.style.setProperty('--wd-b', THEMES[k].b); }
      } else drawShow(ctx, w, h, reduced ? 9 : t);
    };
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 1000 / FPS) return;
      last = now;
      draw(now);
    };
    const sync = () => {
      const go = !reduced && activeRef.current && inView && !document.hidden;
      if (go) root.setAttribute('data-awake', ''); else root.removeAttribute('data-awake');
      if (go && !raf) raf = requestAnimationFrame(loop);
      if (!go && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    syncRef.current = sync;
    restartRef.current = () => { t0 = performance.now(); };
    // перестройка не чаще раза за кадр: при перетаскивании окна событий много
    const relayout = () => {
      if (pending || !alive) return;
      pending = requestAnimationFrame(() => { pending = 0; if (alive) { layout(); draw(performance.now()); } });
    };
    ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(relayout) : null;
    layout();
    draw(performance.now());
    if (ro) ro.observe(root);
    // шрифт текста догрузился — строки стали другой длины
    if (avoid && document.fonts && document.fonts.ready) document.fonts.ready.then(relayout, () => {});
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }) : null;
    if (io) io.observe(root);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pending);
      raf = 0;
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', sync);
      syncRef.current = () => {};
      restartRef.current = () => {};
    };
  }, [align, mode, avoid]);

  // Курсор наклоняет сцену и сдвигает свет — плавно, с инерцией.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion() || !window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return undefined;
    let tx = 0; let ty = 0; let x = 0; let y = 0; let raf = 0;
    const step = () => {
      raf = 0;
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;
      root.style.setProperty('--wx', x.toFixed(4));
      root.style.setProperty('--wy', y.toFixed(4));
      if (Math.abs(tx - x) > 0.002 || Math.abs(ty - y) > 0.002) raf = requestAnimationFrame(step);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
    const onMove = (e) => {
      const r = root.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      const nx = inside ? Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)) : 0;
      const ny = inside ? Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2)) : 0;
      if (nx !== tx || ny !== ty) { tx = nx; ty = ny; kick(); }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, []);

  const sw = pct(SCREEN.w, PW);
  return (
    <div ref={rootRef} className={`${className} o-wd is-${mode}`} aria-hidden="true">
      <div ref={boxRef} className="o-wd__box">
        <div className="o-wd__aura" />
        <div className="o-wd__tilt">
          <div className="o-wd__push">
            <img className="o-wd__img" src="/scenes/wider-stage-1200.webp" srcSet="/scenes/wider-stage-1200.webp 1200w, /scenes/wider-stage.webp 2294w"
              sizes={align === 'center' || align === 'card' ? '(max-width: 760px) 150vw, 70vw' : '(max-width: 760px) 170vw, 100vw'} alt="" draggable="false" decoding="async" />
            <span className="o-wd__spill" />
            <canvas ref={canvasRef} className="o-wd__screen" style={{ left: pct(SCREEN.x, PW), top: pct(SCREEN.y, PH), width: sw, height: pct(SCREEN.h, PH) }} />
            <span className="o-wd__gloss" style={{ left: pct(SCREEN.x, PW), top: pct(SCREEN.y, PH), width: sw, height: pct(SCREEN.h, PH) }} />
            {mode === 'brand' ? (
              <span className="o-wd__wrap" style={{ left: pct(CAB.x, PW), top: pct(CAB.y, PH), width: pct(CAB.w, PW), height: pct(CAB.h, PH) }}>
                <b>{tr('Ваш логотип')}</b>
              </span>
            ) : null}
            <svg className="o-wd__fx" viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="none">
              <rect className="o-wd__frame" x="229" y="40" width="596" height="220" />
              <path className="o-wd__rim-glow" d={RIM} />
              <path className="o-wd__rim" d={RIM} />
              <path className="o-wd__comet" d={RIM} style={{ '--len': RIM_LEN }} />
              <circle className="o-wd__led" cx="527" cy="299" r="2.4" />
              {mode === 'audio' ? [0, 1, 2].map((i) => (
                <g key={i} style={{ '--i': i }}>
                  <path className="o-wd__sound is-l" d="M300 306 a30 30 0 0 0 0 60" />
                  <path className="o-wd__sound is-r" d="M754 306 a30 30 0 0 1 0 60" />
                </g>
              )) : null}
            </svg>
            <span className="o-wd__motes">
              {MOTES.map((m, i) => <i key={i} style={{ left: `${m.x}%`, top: `${m.y}%`, '--s': `${m.s}px`, '--d': `${m.d}s`, '--t': `${m.t}s` }} />)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
