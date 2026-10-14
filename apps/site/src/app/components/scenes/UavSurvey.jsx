// ---------------------------------------------------------------------------
// Платформа мониторинга: задание, облёт, ортофотоплан, инциденты.
//
// На карте платформы диспетчер очертил зону интереса. Дрон проходит её
// «змейкой», и за ним полоса за полосой проявляется ортофотоплан —
// настоящий мультиспектральный снимок из презентации. Затем нейросеть
// проходит по снимку, на местах аномалий падают отметки, открывается
// карточка инцидента с координатами и фото, и платформа сама собирает отчёт.
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { clamp, easeInOut, easeOut, rng, span, useAwake, useCanvasSize, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

const IMG = '/scenes/survey-ms.webp';
const IMG_A = 1100 / 900;
const ZONE = [[12, 20], [56, 13], [69, 38], [64, 80], [22, 85], [7, 53]];
const BOX = { x: 6, y: 12, w: 64, h: 74 };
const STRIPS = 7;
// Аномалии на снимке (в процентах кадра снимка) — найдены по красным пятнам.
const HOT = [[44.1, 51.7, 92], [38.4, 58.5, 87], [67.0, 17.1, 74]];
const T = { zone: 900, fly: 9600, sweep: 1500, pins: 900, card: 3600, report: 2400, fade: 900 };
const START = { fly: T.zone, sweep: T.zone + T.fly };
START.pins = START.sweep + T.sweep;
START.card = START.pins + T.pins;
START.report = START.card + T.card;
START.fade = START.report + T.report;
const LOOP = START.fade + T.fade;

function imgRect() {
  // снимок накрывает рамку зоны (как object-fit: cover)
  const bw = BOX.w; const bh = BOX.h;
  return { x: BOX.x, y: BOX.y, w: bw, h: bh };
}

function hotPos(size) {
  const r = imgRect();
  // пересчёт с учётом обрезки cover: сравниваем пропорции рамки и снимка в пикселях
  const boxA = (r.w * size.w) / (r.h * size.h);
  let sx = 1; let sy = 1; let ox = 0; let oy = 0;
  if (boxA > IMG_A) { sy = boxA / IMG_A; oy = (1 - sy) / 2; } else { sx = IMG_A / boxA; ox = (1 - sx) / 2; }
  return HOT.map(([x, y, p]) => ({ x: r.x + (ox + (x / 100) * sx) * r.w, y: r.y + (oy + (y / 100) * sy) * r.h, p }));
}

function buildPath() {
  const pts = [];
  const sw = BOX.w / STRIPS;
  const y0 = BOX.y + 3; const y1 = BOX.y + BOX.h - 3;
  for (let i = 0; i < STRIPS; i++) {
    const x = BOX.x + (i + 0.5) * sw;
    const up = i % 2 === 0;
    const a = up ? y1 : y0; const b = up ? y0 : y1;
    for (let k = 0; k <= 24; k++) pts.push([x, a + ((b - a) * k) / 24, i]);
    if (i < STRIPS - 1) {
      const cx = x + sw / 2; const cy = b;
      for (let k = 1; k < 12; k++) {
        const ang = Math.PI - (Math.PI * k) / 12;
        pts.push([cx + Math.cos(ang) * (sw / 2), cy + (up ? -1 : 1) * Math.sin(ang) * (sw / 2) * 0.9, i + 0.5]);
      }
    }
  }
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], (pts[i][1] - pts[i - 1][1]) * 0.75));
  return { pts, len, total: len[len.length - 1] };
}
const PATH = buildPath();
function at(p) {
  const L = p * PATH.total;
  let i = 1;
  while (i < PATH.len.length - 1 && PATH.len[i] < L) i++;
  const a = PATH.pts[i - 1]; const b = PATH.pts[i];
  const f = clamp((L - PATH.len[i - 1]) / ((PATH.len[i] - PATH.len[i - 1]) || 1));
  // На развороте между полосами strip дробный: предыдущая полоса уже снята целиком.
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, strip: b[2], dx: b[0] - a[0], dy: (b[1] - a[1]) * 0.75, i };
}

function drawBase(ctx, w, h) {
  const R = rng(4);
  ctx.fillStyle = '#0c1422';
  ctx.fillRect(0, 0, w, h);
  // поля-лоскуты
  const cols = 9; const rows = 7;
  const P = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) P.push([((i + (i && i < cols ? (R() - 0.5) * 0.5 : 0)) / cols) * w, ((j + (j && j < rows ? (R() - 0.5) * 0.5 : 0)) / rows) * h]);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const p = (a, b) => P[(j + b) * (cols + 1) + i + a];
      ctx.beginPath(); ctx.moveTo(...p(0, 0)); ctx.lineTo(...p(1, 0)); ctx.lineTo(...p(1, 1)); ctx.lineTo(...p(0, 1)); ctx.closePath();
      const v = 18 + Math.floor(R() * 9);
      ctx.fillStyle = `rgb(${v - 4}, ${v + 10}, ${v + 30})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 160, 230, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  // река
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.55)';
  ctx.lineWidth = w * 0.014;
  ctx.beginPath(); ctx.moveTo(w * 0.62, -10); ctx.bezierCurveTo(w * 0.78, h * 0.25, w * 0.7, h * 0.5, w * 0.86, h * 0.7); ctx.bezierCurveTo(w * 0.94, h * 0.82, w * 0.9, h * 0.95, w * 1.02, h * 1.02); ctx.stroke();
  ctx.strokeStyle = 'rgba(120, 170, 255, 0.35)';
  ctx.lineWidth = w * 0.004;
  ctx.stroke();
  // дороги
  ctx.strokeStyle = 'rgba(200, 210, 230, 0.22)';
  ctx.lineWidth = w * 0.006;
  ctx.beginPath(); ctx.moveTo(-10, h * 0.9); ctx.bezierCurveTo(w * 0.3, h * 0.88, w * 0.55, h * 0.95, w * 1.02, h * 0.86); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w * 0.78, -10); ctx.bezierCurveTo(w * 0.8, h * 0.3, w * 0.74, h * 0.6, w * 0.82, h * 1.02); ctx.stroke();
  // трубопровод
  ctx.setLineDash([w * 0.012, w * 0.008]);
  ctx.strokeStyle = 'rgba(251, 146, 60, 0.6)';
  ctx.lineWidth = w * 0.003;
  ctx.beginPath(); ctx.moveTo(-10, h * 0.3); ctx.bezierCurveTo(w * 0.3, h * 0.38, w * 0.5, h * 0.62, w * 1.02, h * 0.58); ctx.stroke();
  ctx.setLineDash([]);
}

function plane(ctx, x, y, ang, s) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(6, 0); ctx.lineTo(1.2, -0.9); ctx.lineTo(0.6, -7); ctx.lineTo(-0.8, -7); ctx.lineTo(-1.2, -0.9); ctx.lineTo(-4.8, -0.7); ctx.lineTo(-5.4, -2.6);
  ctx.lineTo(-6.2, -2.6); ctx.lineTo(-6, 0); ctx.lineTo(-6.2, 2.6); ctx.lineTo(-5.4, 2.6); ctx.lineTo(-4.8, 0.7); ctx.lineTo(-1.2, 0.9); ctx.lineTo(-0.8, 7); ctx.lineTo(0.6, 7); ctx.lineTo(1.2, 0.9); ctx.closePath();
  ctx.fillStyle = '#f8fbff';
  ctx.shadowColor = 'rgba(0, 0, 0, .5)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
  ctx.fill();
  ctx.restore();
}

export default function UavSurvey() {
  const root = useRef(null);
  const canvas = useRef(null);
  const st = useRef({ img: null, base: null, prints: [], lastPrint: -1, loop: -1 });
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const [phase, setPhase] = useState(reduced ? 'card' : 'zone');
  const phaseRef = useRef(phase);
  const hot = useRef(HOT.map(([x, y, p]) => ({ x, y, p })));

  if (!st.current.img && typeof Image !== 'undefined') {
    const im = new Image();
    im.decoding = 'async';
    im.src = IMG;
    im.onload = () => { st.current.ready = true; if (st.current.redraw) st.current.redraw(); };
    st.current.img = im;
  }

  const setP = (p) => { if (phaseRef.current !== p) { phaseRef.current = p; setPhase(p); } };

  const draw = (time) => {
    const c = canvas.current;
    const s = st.current;
    if (!c || !s.size) return;
    const ctx = c.getContext('2d');
    const { w, h, dpr } = s.size;
    const X = (v) => (v / 100) * w;
    const Y = (v) => (v / 100) * h;
    const t = reduced ? START.report + 100 : time % LOOP;
    const loop = Math.floor(time / LOOP);
    if (loop !== s.loop) { s.loop = loop; s.prints = []; s.lastPrint = -1; }
    if (!s.base || s.base.width !== w) {
      s.base = document.createElement('canvas'); s.base.width = w; s.base.height = h;
      drawBase(s.base.getContext('2d'), w, h);
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(s.base, 0, 0);
    const zone = new Path2D();
    ZONE.forEach(([x, y], i) => (i ? zone.lineTo(X(x), Y(y)) : zone.moveTo(X(x), Y(y))));
    zone.closePath();
    const fadeOut = 1 - span(t, START.fade, LOOP);
    // фазы для подписей
    if (t < START.fly) setP('zone');
    else if (t < START.sweep) setP('fly');
    else if (t < START.pins) setP('sweep');
    else if (t < START.card) setP('pins');
    else if (t < START.report) setP('card');
    else if (t < START.fade) setP('report');
    else setP('fade');
    // 1. Ортофотоплан проявляется полосами за дроном.
    const fly = easeInOut(span(t, START.fly, START.sweep));
    const pos = at(fly);
    if (s.ready && t >= START.fly) {
      ctx.save();
      ctx.clip(zone);
      ctx.beginPath();
      const sw = BOX.w / STRIPS;
      for (let i = 0; i < STRIPS; i++) {
        const x0 = X(BOX.x + i * sw);
        if (fly >= 1 || i < pos.strip) ctx.rect(x0, Y(BOX.y), X(sw) + 1, Y(BOX.h));
        else if (i === pos.strip) {
          const up = i % 2 === 0;
          if (up) ctx.rect(x0, Y(pos.y), X(sw) + 1, Y(BOX.y + BOX.h) - Y(pos.y));
          else ctx.rect(x0, Y(BOX.y), X(sw) + 1, Y(pos.y) - Y(BOX.y));
        }
      }
      ctx.clip();
      ctx.globalAlpha = fadeOut;
      // cover
      const bw = X(BOX.w); const bh = Y(BOX.h);
      let dw = bw; let dh = bw / IMG_A;
      if (dh < bh) { dh = bh; dw = bh * IMG_A; }
      ctx.drawImage(s.img, X(BOX.x) + (bw - dw) / 2, Y(BOX.y) + (bh - dh) / 2, dw, dh);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    // 2. Контур зоны интереса.
    const zp = easeOut(span(t, 0, T.zone));
    ctx.save();
    ctx.setLineDash([X(1.2), X(0.8)]);
    ctx.lineDashOffset = -time / 60;
    ctx.strokeStyle = `rgba(125, 211, 252, ${0.9 * zp})`;
    ctx.lineWidth = 1.6 * dpr;
    ctx.stroke(zone);
    ctx.fillStyle = `rgba(59, 130, 246, ${0.07 * zp})`;
    ctx.fill(zone);
    ctx.restore();
    // 3. Кадры аэрофотосъёмки: рамки вспыхивают и гаснут.
    if (!reduced && t >= START.fly && fly < 1) {
      const step = Math.floor(fly * 46);
      if (step !== s.lastPrint) { s.lastPrint = step; s.prints.push({ x: pos.x, y: pos.y, t: time }); }
    }
    s.prints.forEach((p) => {
      const a = clamp(1 - (time - p.t) / 1300) * 0.75 + 0.035;
      ctx.strokeStyle = `rgba(255, 255, 255, ${a * fadeOut})`;
      ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(X(p.x - 4.4), Y(p.y - 3.4), X(8.8), Y(6.8));
    });
    // 4. Дрон.
    if (t >= START.fly - 300 && fly < 1) {
      const a = clamp((t - START.fly + 300) / 300) * clamp((1 - fly) * 30);
      ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(X(pos.x), Y(pos.y), 0, X(pos.x), Y(pos.y), X(5));
      g.addColorStop(0, 'rgba(125, 211, 252, .35)'); g.addColorStop(1, 'rgba(125, 211, 252, 0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X(pos.x), Y(pos.y), X(5), 0, Math.PI * 2); ctx.fill();
      plane(ctx, X(pos.x), Y(pos.y), Math.atan2(pos.dy * h, pos.dx * w), (w / 640) * 1.9);
      ctx.globalAlpha = 1;
    }
    // 5. Нейросеть проходит по снимку.
    const sweep = span(t, START.sweep, START.pins);
    if (sweep > 0 && sweep < 1) {
      const sx = X(BOX.x + BOX.w * easeInOut(sweep));
      ctx.save(); ctx.clip(zone);
      const g = ctx.createLinearGradient(sx - X(8), 0, sx + X(1), 0);
      g.addColorStop(0, 'rgba(125, 211, 252, 0)'); g.addColorStop(0.85, 'rgba(125, 211, 252, .32)'); g.addColorStop(1, 'rgba(220, 245, 255, .9)');
      ctx.fillStyle = g; ctx.fillRect(sx - X(8), Y(BOX.y), X(9), Y(BOX.h));
      ctx.restore();
    }
    // 6. Кольца вокруг найденных аномалий.
    if (s.hot) {
      s.hot.forEach((hp, i) => {
        const found = START.sweep + T.sweep * ((hp.x - BOX.x) / BOX.w);
        if (t < found) return;
        const k = ((time - found) % 1800) / 1800;
        ctx.strokeStyle = `rgba(255, 91, 87, ${(1 - k) * 0.85 * fadeOut})`;
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath(); ctx.arc(X(hp.x), Y(hp.y), X(1.2 + 3.6 * easeOut(k)), 0, Math.PI * 2); ctx.stroke();
        if (i === 0 && t > START.card) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * fadeOut})`;
          ctx.strokeRect(X(hp.x - 3), Y(hp.y - 3.6), X(6), Y(7.2));
        }
      });
    }
  };

  const time = useFrames(awake && !reduced, draw);
  st.current.redraw = () => draw(time.current);
  useCanvasSize(canvas, (size) => {
    st.current.size = size;
    st.current.base = null;
    st.current.hot = hotPos(size);
    hot.current = st.current.hot;
    draw(time.current);
  });
  const H = hot.current;
  const shown = ['pins', 'card', 'report'].includes(phase);

  return (
    <div ref={root} className={`o-scene o-scene--sv is-${phase}`} data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <canvas ref={canvas} />
      <div className="o-sv__zone" style={{ left: `${ZONE[0][0] + 2}%`, top: `${ZONE[1][1] - 4.5}%` }}>{tr('Зона интереса')} · 12,4 {tr('км²')}</div>
      {shown ? H.map((p, i) => (
        <span key={i} className="o-sv__pin" style={{ left: `${p.x}%`, top: `${p.y}%`, '--i': i }}><b><span>{i + 1}</span></b></span>
      )) : null}
      <div className="o-sv__side">
        <div className="o-sv__task">
          <span className="o-sv__k">{tr('Задание № {n}').replace('{n}', '27')}</span>
          <span className="o-sv__st">{phase === 'zone' ? tr('Назначено') : phase === 'fly' ? tr('Облёт') : phase === 'sweep' ? tr('Анализ ИИ') : tr('Проверка')}</span>
        </div>
        <div className="o-sv__card">
          <div className="o-sv__thumb" style={{ backgroundImage: `url(${IMG})`, backgroundPosition: `${HOT[0][0]}% ${HOT[0][1]}%` }} />
          <div className="o-sv__info">
            <b>{tr('Инцидент № {n}').replace('{n}', '1')}</b>
            <span>{tr('Возможный очаг возгорания')}</span>
            <em>41.4721° N · 69.5934° E</em>
            <i>{tr('Совпадение')} 92%</i>
          </div>
        </div>
        <div className="o-sv__report"><i>✓</i> {tr('Отчёт готов')}: 1&nbsp;846 {tr('снимков')}, 3 {tr('инцидента')}</div>
      </div>
    </div>
  );
}
