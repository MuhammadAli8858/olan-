// ---------------------------------------------------------------------------
// Панорамный экран Wider: изогнутая поверхность 123″, на которой несколько
// человек работают одновременно.
//
// Интерфейс рисуется на плоском холсте, затем раскладывается вертикальными
// полосками по дуге: края экрана ближе к зрителю, поэтому они выше и сжаты
// по ширине — как у настоящего изогнутого экрана. Три «пользователя» живут
// по своим таймингам: касание и щипок на карте, перетаскивание по графику,
// пролистывание слайдов. Анимация идёт 30 кадров в секунду и только когда
// экран виден; при «меньше движения» в системе показывается один кадр.
// ---------------------------------------------------------------------------
import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../lib/fx.jsx';

const CURVE = 0.11;
const THETA = 0.55;
const FPS = 30;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));

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

const ROADS = [
  [[0.02, 0.72], [0.25, 0.6], [0.48, 0.64], [0.7, 0.42], [0.98, 0.36]],
  [[0.12, 0.02], [0.2, 0.3], [0.32, 0.55], [0.36, 0.98]],
  [[0.55, 0.98], [0.6, 0.7], [0.74, 0.52], [0.9, 0.12]],
];

function pointOn(path, t) {
  const n = path.length - 1;
  const f = Math.min(n - 1e-6, t * n);
  const i = Math.floor(f);
  const k = f - i;
  return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k];
}

function finger(c, x, y, r, press) {
  c.save();
  c.fillStyle = `rgba(255,255,255,${0.16 + 0.24 * press})`;
  c.strokeStyle = 'rgba(255,255,255,0.78)';
  c.lineWidth = Math.max(1, r * 0.12);
  c.beginPath();
  c.arc(x, y, r * (1 - 0.12 * press), 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.restore();
}

function ripple(c, x, y, r, p) {
  if (p <= 0 || p >= 1) return;
  c.save();
  c.strokeStyle = `rgba(170,212,255,${(1 - p) * 0.85})`;
  c.lineWidth = Math.max(1, r * 0.1);
  c.beginPath();
  c.arc(x, y, r * (0.6 + p * 2.4), 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

function drawUI(c, cw, ch, t) {
  const R = ch * 0.036;
  const bg = c.createLinearGradient(0, 0, 0, ch);
  bg.addColorStop(0, '#10203a');
  bg.addColorStop(1, '#091425');
  c.fillStyle = bg;
  c.fillRect(0, 0, cw, ch);
  c.strokeStyle = 'rgba(255,255,255,0.04)';
  c.lineWidth = 1;
  for (let x = cw / 64; x < cw; x += cw / 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, ch); c.stroke(); }

  const pad = ch * 0.07;
  const gap = ch * 0.05;
  const radius = ch * 0.03;
  const panel = (x, y, w, h) => {
    roundRect(c, x, y, w, h, radius);
    c.fillStyle = 'rgba(255,255,255,0.045)';
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.09)';
    c.lineWidth = 1;
    c.stroke();
  };
  const font = (px, w = 600) => `${w} ${Math.max(6, Math.round(px))}px Onest, system-ui, sans-serif`;

  // 1. Карта — пользователь A: касание, затем щипок-приближение.
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
  c.fillStyle = 'rgba(255,255,255,0.035)';
  for (let i = 0; i < 18; i++) c.fillRect(mx + (((i * 37) % 97) / 100) * mw, my + (((i * 61) % 89) / 100) * mh, mw * 0.08, mh * 0.1);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  ROADS.forEach((road, ri) => {
    c.strokeStyle = 'rgba(110,160,255,0.35)';
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

  // 2. График — пользователь B ведёт пальцем, подсказка показывает значение.
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

  // 5. Слайды — пользователь C листает.
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

function drawStage(ctx, W, H, s, content, t) {
  ctx.clearRect(0, 0, W, H);
  const cx = s.x + s.w / 2;
  const midY = s.y + s.h / 2;
  const half = (u) => (s.h * (1 + CURVE * u * u)) / 2;
  const X = (u) => cx + (s.w / 2) * (Math.sin(u * THETA) / Math.sin(THETA));
  const floorY = midY + half(1) + s.h * 0.22;

  // Свет экрана на глянцевом полу и ореол за ним.
  const halo = ctx.createRadialGradient(cx, midY, s.h * 0.3, cx, midY, s.w * 0.62);
  halo.addColorStop(0, 'rgba(60,110,230,0.2)');
  halo.addColorStop(1, 'rgba(60,110,230,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(cx, floorY);
  ctx.scale(1, 0.14);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, s.w * 0.6);
  glow.addColorStop(0, 'rgba(80,140,255,0.32)');
  glow.addColorStop(1, 'rgba(80,140,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, s.w * 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Опоры и основание.
  ctx.fillStyle = '#0c0f15';
  [-0.5, 0.5].forEach((u) => { const x = X(u); const top = midY + half(u) - 2; ctx.fillRect(x - s.h * 0.022, top, s.h * 0.044, floorY - top); });
  ctx.fillStyle = '#121720';
  ctx.fillRect(X(-0.64), floorY - s.h * 0.028, X(0.64) - X(-0.64), s.h * 0.028);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(X(-0.64), floorY - s.h * 0.028, X(0.64) - X(-0.64), 1);

  // Экран полосками по дуге.
  const N = Math.max(48, Math.min(180, Math.round(s.w / 5)));
  const cw = content.width; const chh = content.height;
  for (let i = 0; i < N; i++) {
    const u0 = (i / N) * 2 - 1; const u1 = ((i + 1) / N) * 2 - 1;
    const x0 = X(u0); const x1 = X(u1); const hh = half((u0 + u1) / 2);
    ctx.drawImage(content, (i / N) * cw, 0, cw / N, chh, x0, midY - hh, x1 - x0 + 0.7, hh * 2);
  }

  ctx.beginPath();
  for (let i = 0; i <= N; i++) { const u = (i / N) * 2 - 1; if (i) ctx.lineTo(X(u), midY - half(u)); else ctx.moveTo(X(u), midY - half(u)); }
  for (let i = N; i >= 0; i--) { const u = (i / N) * 2 - 1; ctx.lineTo(X(u), midY + half(u)); }
  ctx.closePath();
  ctx.save();
  ctx.clip();
  const edge = ctx.createLinearGradient(s.x, 0, s.x + s.w, 0);
  edge.addColorStop(0, 'rgba(0,0,0,0.4)');
  edge.addColorStop(0.18, 'rgba(0,0,0,0)');
  edge.addColorStop(0.82, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = edge;
  ctx.fillRect(s.x - 10, s.y - s.h, s.w + 20, s.h * 3);
  const gl = ((t * 0.035) % 1.6) - 0.3;
  const glare = ctx.createLinearGradient(s.x + s.w * gl - s.w * 0.25, s.y, s.x + s.w * gl + s.w * 0.25, s.y + s.h);
  glare.addColorStop(0, 'rgba(255,255,255,0)');
  glare.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  glare.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glare;
  ctx.fillRect(s.x - 10, s.y - s.h, s.w + 20, s.h * 3);
  ctx.restore();
  ctx.lineWidth = Math.max(3, s.h * 0.028);
  ctx.strokeStyle = '#07090d';
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.stroke();
}

export function WiderScreen({ active = true, align = 'center', className = 'o-stage' }) {
  const ref = useRef(null);
  const activeRef = useRef(active);
  const syncRef = useRef(() => {});

  useEffect(() => { activeRef.current = active; syncRef.current(); }, [active]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const content = document.createElement('canvas');
    const cctx = content.getContext('2d');
    const reduced = prefersReducedMotion();
    const t0 = performance.now();
    let W = 1; let H = 1; let dpr = 1; let s = null; let raf = 0; let last = 0; let inView = true;

    const layout = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const narrow = W < 760;
      const sw = narrow ? W * 0.9 : Math.min(W * (align === 'center' ? 0.84 : 0.58), H * 2.1);
      const sh = sw / 3.1;
      const cx = narrow || align === 'center' ? W / 2 : W * (align === 'right' ? 0.66 : 0.34);
      const cy = H * (narrow && align !== 'center' ? 0.3 : align === 'center' ? 0.46 : 0.4);
      s = { x: cx - sw / 2, y: cy - sh / 2, w: sw, h: sh };
      content.width = Math.max(2, Math.round(sw * dpr));
      content.height = Math.max(2, Math.round(sh * dpr));
    };
    const frame = (now) => {
      const t = reduced ? 2.2 : (now - t0) / 1000;
      drawUI(cctx, content.width, content.height, t);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStage(ctx, W, H, s, content, t);
    };
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 1000 / FPS) return;
      last = now;
      frame(now);
    };
    const sync = () => {
      const go = !reduced && activeRef.current && inView && !document.hidden;
      if (go && !raf) raf = requestAnimationFrame(loop);
      if (!go && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    syncRef.current = sync;

    layout();
    frame(performance.now());
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { layout(); frame(performance.now()); }) : null;
    if (ro) ro.observe(canvas);
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }) : null;
    if (io) io.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', sync);
      syncRef.current = () => {};
    };
  }, [align]);

  return <div className={className}><canvas ref={ref} aria-hidden="true" /></div>;
}
