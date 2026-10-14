// ---------------------------------------------------------------------------
// ЕГСВ: школы и стройки под наблюдением.
//
// Пульт дежурного: слева — две камеры. Двор школы с виртуальной оградой
// (периметр под охраной) и въезд на стройку: камера ночью в ИК читает
// госномер машины и сверяет его со списком подрядчиков. Справа — таймлапс
// стройки в виде цифровой модели корпуса: сменяются сутки (тень от здания
// обегает площадку, ночью загораются окна), этаж за этажом растёт каркас,
// за ним идёт остекление, работает башенный кран, к воротам подъезжает
// грузовик. Счётчики показывают день, этажи и отставание от графика.
// Когда корпус сдан, таймлапс отматывается к первому дню.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { clamp, easeInOut, lerp, smooth, useAwake, useBeats, useCanvasSize, useClock, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

const N = 12; // этажей
const BW = 8; // длина корпуса, ед.
const BD = 5; // глубина корпуса
const FH = 0.85; // высота этажа
const DAYS = 240; // срок по графику
const LOOP = 30000;
const T0 = 1400; // пустая площадка
const T1 = 25400; // каркас готов
const T2 = 28000; // перемотка к первому дню
const SUN = 4200; // одни «сутки» таймлапса
const CRANE = { x: 10.2, y: -1.2, h: N * FH + 3.8, jib: 9.5, back: 3 };
const GROUND = { x0: -2, x1: 11.6, y0: -2.4, y1: 7.6 };
const COS = Math.cos(Math.PI / 6);
const GATE = 2.6; // ворота на южной стороне, x

// Факт против плана: первые месяцы стройка чуть отстаёт, потом нагоняет.
const fact = (p) => clamp(p - 0.017 * Math.sin(Math.PI * 2 * p));

function timeline(t) {
  if (t < T0) return { built: 0, glass: 0, day: 1, lag: 0, phase: 'start' };
  if (t < T1) {
    const p = (t - T0) / (T1 - T0);
    const f = fact(p);
    const built = f * N;
    return { built, glass: Math.max(0, built - 2.6), day: 1 + Math.round(p * (DAYS - 1)), lag: Math.round((p - f) * DAYS), phase: 'build' };
  }
  if (t < T2) {
    const q = smooth((t - T1) / (T2 - T1) * 1.5);
    return { built: N, glass: N - 2.6 * (1 - q), day: DAYS, lag: 0, phase: 'done' };
  }
  const r = smooth((t - T2) / (LOOP - T2));
  const built = N * (1 - r);
  return { built, glass: Math.max(0, built - 2.6 * r), day: Math.max(1, Math.round(DAYS * (1 - r))), lag: 0, phase: 'rewind' };
}

// Детерминированный «шум» для окон.
const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const mixc = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function fit({ cssW, cssH, dpr }) {
  const pts = [];
  const add = (x, y, z) => pts.push([(x - y) * COS, (x + y) * 0.5 - z]);
  [[GROUND.x0, GROUND.y0], [GROUND.x1, GROUND.y0], [GROUND.x1, GROUND.y1], [GROUND.x0, GROUND.y1]].forEach(([x, y]) => add(x, y, 0));
  add(CRANE.x, CRANE.y, CRANE.h + 1.2);
  // стрела ходит в пределах ±0,5 рад от направления на корпус
  for (let a = -0.5; a <= 0.5; a += 0.05) {
    const th = jibBase() + a;
    add(CRANE.x + Math.cos(th) * CRANE.jib, CRANE.y + Math.sin(th) * CRANE.jib, CRANE.h);
    add(CRANE.x - Math.cos(th) * CRANE.back, CRANE.y - Math.sin(th) * CRANE.back, CRANE.h);
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // снизу — место под подписи панели
  const padT = cssH * 0.1;
  const padB = cssH * 0.23;
  const k = Math.min((cssW * 1.02) / (x1 - x0), (cssH - padT - padB) / (y1 - y0));
  const ox = (cssW - (x1 - x0) * k) / 2 - x0 * k;
  const oy = padT + (cssH - padT - padB - (y1 - y0) * k) / 2 - y0 * k;
  return { k: k * dpr, ox: ox * dpr, oy: oy * dpr };
}

function jibBase() {
  // стрела смотрит на середину корпуса
  return Math.atan2(BD / 2 - CRANE.y, BW / 2 - CRANE.x);
}

function draw(ctx, st, t) {
  const { w, h, k, ox, oy, dpr } = st;
  const P = (x, y, z) => [ox + (x - y) * COS * k, oy + ((x + y) * 0.5 - z) * k];
  const poly = (pts) => { ctx.beginPath(); pts.forEach(([x, y, z], i) => { const [a, b] = P(x, y, z); if (i) ctx.lineTo(a, b); else ctx.moveTo(a, b); }); ctx.closePath(); };
  const line = (x1, y1, z1, x2, y2, z2) => { const [a, b] = P(x1, y1, z1); const [c, d] = P(x2, y2, z2); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };
  const tl = timeline(t % LOOP);
  // сутки: 0…0.72 — день (солнце с востока на запад), дальше ночь
  const ph = (t % SUN) / SUN;
  const day = ph < 0.72 ? smooth(clamp(ph / 0.08)) * smooth(clamp((0.72 - ph) / 0.08)) : 0;
  const night = 1 - day;
  ctx.clearRect(0, 0, w, h);

  // площадка и сетка цифровой модели
  ctx.lineWidth = 1 * dpr;
  poly([[GROUND.x0, GROUND.y0, 0], [GROUND.x1, GROUND.y0, 0], [GROUND.x1, GROUND.y1, 0], [GROUND.x0, GROUND.y1, 0]]);
  ctx.fillStyle = rgba(mixc([14, 22, 38], [24, 36, 58], day));
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 155, 210, 0.08)';
  for (let x = Math.ceil(GROUND.x0); x <= GROUND.x1; x++) line(x, GROUND.y0, 0, x, GROUND.y1, 0);
  for (let y = Math.ceil(GROUND.y0); y <= GROUND.y1; y++) line(GROUND.x0, y, 0, GROUND.x1, y, 0);
  // ограждение с воротами
  ctx.setLineDash([4 * dpr, 3 * dpr]);
  ctx.strokeStyle = 'rgba(150, 185, 235, 0.45)';
  ctx.beginPath();
  const fence = [[GATE + 1.6, GROUND.y1], [GROUND.x1, GROUND.y1], [GROUND.x1, GROUND.y0], [GROUND.x0, GROUND.y0], [GROUND.x0, GROUND.y1], [GATE, GROUND.y1]];
  fence.forEach(([x, y], i) => { const [a, b] = P(x, y, 0); if (i) ctx.lineTo(a, b); else ctx.moveTo(a, b); });
  ctx.stroke();
  ctx.setLineDash([]);
  // будка охраны у ворот и камера КПП
  box(ctx, P, GATE - 1.3, GROUND.y1 - 1.1, 0, 0.9, 0.8, 0.75, [96, 112, 138], day);
  ctx.strokeStyle = 'rgba(190, 210, 240, 0.8)';
  ctx.lineWidth = 1.2 * dpr;
  line(GATE + 1.9, GROUND.y1 - 0.1, 0, GATE + 1.9, GROUND.y1 - 0.1, 1.6);
  const [cx0, cy0] = P(GATE + 1.9, GROUND.y1 - 0.1, 1.6);
  ctx.fillStyle = '#dfe9f7';
  ctx.fillRect(cx0 - 2.5 * dpr, cy0 - 1.5 * dpr, 5 * dpr, 3 * dpr);
  ctx.fillStyle = (t % 1400) < 700 ? '#ff5b57' : 'rgba(255, 91, 87, .35)';
  ctx.beginPath(); ctx.arc(cx0 + 2.5 * dpr, cy0, 1 * dpr, 0, Math.PI * 2); ctx.fill();

  // грузовик заезжает на площадку и разгружается
  const tt = t % 9000;
  if (tt < 6200 && tl.phase === 'build') {
    const yIn = tt < 2200 ? lerp(GROUND.y1 + 3.2, 6.1, easeInOut(tt / 2200)) : tt < 4400 ? 6.1 : lerp(6.1, GROUND.y1 + 3.2, easeInOut((tt - 4400) / 1800));
    const back = tt >= 4400;
    truck(ctx, P, GATE + 0.8, yIn, back, day, dpr);
  }

  // тень корпуса — обходит площадку вместе с солнцем
  const H = tl.built * FH;
  if (H > 0.05 && day > 0.02) {
    const a = lerp(-0.55, Math.PI + 0.55, clamp(ph / 0.72));
    const len = H * (0.55 + 0.75 * Math.abs(Math.cos(a)));
    const dx = Math.cos(a) * len;
    const dy = Math.sin(a) * len * 0.6 + len * 0.35;
    const foot = [[0, 0], [BW, 0], [BW, BD], [0, BD]];
    const pts = foot.concat(foot.map(([x, y]) => [x + dx, y + dy])).map(([x, y]) => P(x, y, 0));
    const hull = convexHull(pts);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.32 * day})`;
    ctx.beginPath(); hull.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
  }

  // корпус: этаж за этажом
  const conc = mixc([58, 66, 84], [176, 186, 202], day);
  const concR = mixc([44, 50, 66], [134, 145, 164], day);
  const full = Math.floor(tl.built + 1e-6);
  const part = tl.built - full;
  for (let i = 0; i < Math.min(N, full); i++) {
    const z0 = i * FH;
    const z1 = z0 + FH;
    const g = clamp(tl.glass - i);
    floorFaces(ctx, P, poly, line, i, z0, z1, g, day, night, conc, concR, dpr, t);
  }
  // перекрытие верхнего готового этажа
  if (full > 0) {
    const z = Math.min(N, full) * FH;
    poly([[0, 0, z], [BW, 0, z], [BW, BD, z], [0, BD, z]]);
    ctx.fillStyle = rgba(mixc([52, 60, 78], [150, 162, 182], day));
    ctx.fill();
    ctx.strokeStyle = 'rgba(220, 232, 250, 0.25)';
    ctx.lineWidth = 0.8 * dpr;
    ctx.stroke();
  }
  // растущий этаж: колонны и опалубка
  if (full < N && part > 0.02) {
    const z0 = full * FH;
    const zt = z0 + FH * part;
    ctx.strokeStyle = rgba(conc);
    ctx.lineWidth = 2 * dpr;
    for (let x = 0; x <= BW; x += 2) line(x, BD, z0, x, BD, zt);
    for (let y = 0; y < BD; y += 2.5) line(BW, y, z0, BW, y, zt);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.3 * dpr;
    poly([[0, 0, zt], [BW, 0, zt], [BW, BD, zt], [0, BD, zt]]);
    ctx.stroke();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // башенный кран
  crane(ctx, P, line, t, tl, day, night, dpr);
}

function floorFaces(ctx, P, poly, line, i, z0, z1, g, day, night, conc, concR, dpr, t) {
  const slab = 0.14;
  // торец перекрытия
  ctx.fillStyle = rgba(conc);
  poly([[0, BD, z0], [BW, BD, z0], [BW, BD, z0 + slab], [0, BD, z0 + slab]]); ctx.fill();
  ctx.fillStyle = rgba(concR);
  poly([[BW, 0, z0], [BW, BD, z0], [BW, BD, z0 + slab], [BW, 0, z0 + slab]]); ctx.fill();
  const zb = z0 + slab;
  // каркас без стекла: тёмная глубина и колонны
  ctx.fillStyle = `rgba(8, 13, 24, ${0.82 - 0.2 * day})`;
  poly([[0, BD, zb], [BW, BD, zb], [BW, BD, z1], [0, BD, z1]]); ctx.fill();
  poly([[BW, 0, zb], [BW, BD, zb], [BW, BD, z1], [BW, 0, z1]]); ctx.fill();
  // остекление: слева направо по фасаду
  if (g > 0) {
    const gl = mixc([34, 66, 122], [96, 150, 232], day);
    const gr = mixc([24, 50, 96], [66, 112, 192], day);
    const xg = BW * Math.min(1, g * 1.2);
    const yg = BD * clamp(g * 1.2 - 0.2);
    ctx.fillStyle = rgba(gl, 0.95);
    poly([[0, BD, zb], [xg, BD, zb], [xg, BD, z1], [0, BD, z1]]); ctx.fill();
    if (yg > 0) { ctx.fillStyle = rgba(gr, 0.95); poly([[BW, BD - yg, zb], [BW, BD, zb], [BW, BD, z1], [BW, BD - yg, z1]]); ctx.fill(); }
    // окна, горящие ночью
    if (night > 0.05 && g >= 1) {
      for (let j = 0; j < BW; j++) {
        if (hash(i, j) < 0.45) continue;
        ctx.fillStyle = `rgba(255, 214, 140, ${0.85 * night * (0.6 + 0.4 * hash(j, i))})`;
        poly([[j + 0.18, BD, zb + 0.12], [j + 0.82, BD, zb + 0.12], [j + 0.82, BD, z1 - 0.06], [j + 0.18, BD, z1 - 0.06]]); ctx.fill();
      }
      for (let j = 0; j < BD; j++) {
        if (hash(j + 9, i) < 0.5) continue;
        ctx.fillStyle = `rgba(255, 204, 128, ${0.7 * night})`;
        poly([[BW, j + 0.18, zb + 0.12], [BW, j + 0.82, zb + 0.12], [BW, j + 0.82, z1 - 0.06], [BW, j + 0.18, z1 - 0.06]]); ctx.fill();
      }
    }
    // блик солнца бежит по стеклу
    if (day > 0.1) {
      const sx = ((t / 1400 + i * 0.13) % 3) * BW / 2 - 1;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.16 * day})`;
      const a = clamp(sx, 0, xg);
      const b = clamp(sx + 0.9, 0, xg);
      if (b > a) { poly([[a, BD, zb], [b, BD, zb], [b, BD, z1], [a, BD, z1]]); ctx.fill(); }
    }
  }
  // колонны и импосты
  ctx.lineWidth = 1 * dpr;
  ctx.strokeStyle = g > 0 ? `rgba(210, 228, 255, ${0.35 + 0.2 * day})` : rgba(conc, 0.95);
  for (let x = 0; x <= BW; x += g > 0 ? 1 : 2) line(x, BD, zb, x, BD, z1);
  ctx.strokeStyle = g > 0 ? `rgba(190, 210, 245, ${0.3 + 0.15 * day})` : rgba(concR, 0.95);
  for (let y = 0; y <= BD; y += g > 0 ? 1 : 2.5) line(BW, y, zb, BW, y, z1);
}

function box(ctx, P, x, y, z, w, d, hgt, col, day) {
  const c = mixc(col.map((v) => v * 0.45), col, day);
  const face = (pts, k) => {
    ctx.beginPath();
    pts.forEach(([a, b, cc], i) => { const [u, v] = P(a, b, cc); if (i) ctx.lineTo(u, v); else ctx.moveTo(u, v); });
    ctx.closePath();
    ctx.fillStyle = rgba(c.map((v) => Math.round(v * k)));
    ctx.fill();
  };
  face([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + hgt], [x, y + d, z + hgt]], 0.92);
  face([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + hgt], [x + w, y, z + hgt]], 0.72);
  face([[x, y, z + hgt], [x + w, y, z + hgt], [x + w, y + d, z + hgt], [x, y + d, z + hgt]], 1.12);
}

function truck(ctx, P, x, y, back, day, dpr) {
  // кузов позади кабины по ходу движения (машина едет на север)
  box(ctx, P, x - 0.45, y + 0.3, 0.15, 0.9, 1.9, 0.75, [150, 158, 172], day);
  box(ctx, P, x - 0.45, y - 0.5, 0.15, 0.9, 0.75, 0.8, [226, 160, 40], day);
  if (day < 0.6 && !back) {
    const [a, b] = P(x, y - 0.5, 0.45);
    ctx.fillStyle = `rgba(255, 238, 190, ${0.5 * (1 - day)})`;
    ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + 18 * dpr, b - 14 * dpr); ctx.lineTo(a - 4 * dpr, b - 20 * dpr); ctx.closePath(); ctx.fill();
  }
}

function crane(ctx, P, line, t, tl, day, night, dpr) {
  const { x, y, h } = CRANE;
  const yel = mixc([150, 112, 30], [246, 196, 69], day);
  ctx.strokeStyle = rgba(yel, 0.95);
  // решётчатая мачта
  const s = 0.32;
  ctx.lineWidth = 1 * dpr;
  line(x - s, y, 0, x - s, y, h);
  line(x + s, y, 0, x + s, y, h);
  ctx.lineWidth = 0.6 * dpr;
  for (let z = 0; z < h - 0.3; z += 0.7) line(x - s, y, z, x + s, y, z + 0.7);
  // стрела поворачивается над корпусом
  const th = jibBase() + 0.42 * Math.sin(t / 3300) + (tl.phase === 'rewind' ? 0 : 0.06 * Math.sin(t / 900));
  const ex = x + Math.cos(th) * CRANE.jib;
  const ey = y + Math.sin(th) * CRANE.jib;
  const bx = x - Math.cos(th) * CRANE.back;
  const by = y - Math.sin(th) * CRANE.back;
  ctx.lineWidth = 1.6 * dpr;
  line(bx, by, h, ex, ey, h);
  ctx.lineWidth = 0.8 * dpr;
  line(x, y, h + 1.1, ex, ey, h + 0.05);
  line(x, y, h + 1.1, bx, by, h + 0.05);
  // противовес и кабина
  ctx.fillStyle = rgba(mixc([40, 46, 58], [92, 100, 116], day));
  const [qx, qy] = P(bx, by, h);
  ctx.fillRect(qx - 4 * dpr, qy - 1 * dpr, 8 * dpr, 6 * dpr);
  const [kx, ky] = P(x, y, h);
  ctx.fillStyle = rgba(yel);
  ctx.fillRect(kx - 3 * dpr, ky - 1 * dpr, 6 * dpr, 4.5 * dpr);
  // каретка, трос и груз
  const r = CRANE.jib * (0.45 + 0.28 * Math.sin(t / 2100 + 1.3));
  const tx = x + Math.cos(th) * r;
  const ty = y + Math.sin(th) * r;
  const top = tl.built * FH;
  const lz = Math.max(0.3, top + 0.6 + 0.9 * (0.5 + 0.5 * Math.sin(t / 1700)));
  ctx.strokeStyle = 'rgba(220, 230, 245, 0.7)';
  ctx.lineWidth = 0.7 * dpr;
  line(tx, ty, h, tx, ty, lz + 0.35);
  const [lx, ly] = P(tx, ty, lz);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(lx - 4 * dpr, ly - 2.5 * dpr, 8 * dpr, 5 * dpr);
  // заградительный огонь на вершине — ночью
  if (night > 0.3) {
    const [ax, ay] = P(x, y, h + 1.15);
    ctx.fillStyle = `rgba(255, 70, 60, ${night * (0.4 + 0.6 * ((t % 1200) < 600))})`;
    ctx.beginPath(); ctx.arc(ax, ay, 1.8 * dpr, 0, Math.PI * 2); ctx.fill();
  }
}

function convexHull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

const ANPR = ['scan', 'read', 'ok'];

export default function EgsvSites() {
  const root = useRef(null);
  const canvas = useRef(null);
  const st = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const clock = useClock(awake && !reduced);
  const gate = ANPR[useBeats(awake, [1500, 1700, 3200], { reduced, still: 2 }) % ANPR.length];
  const [hud, setHud] = useState({ day: 1, built: 0, glass: 0, lag: 0, phase: 'start' });
  const last = useRef('');

  const render = (time) => {
    const s = st.current;
    const c = canvas.current;
    if (!s || !c) return;
    const t = reduced ? T2 - 200 : time;
    draw(c.getContext('2d'), s, t);
    const tl = timeline(t % LOOP);
    const next = { day: tl.day, built: Math.min(N, Math.floor(tl.built + 1e-6)), glass: Math.min(N, Math.floor(tl.glass + 1e-6)), lag: tl.lag, phase: tl.phase };
    const key = `${next.day}|${next.built}|${next.glass}|${next.lag}|${next.phase}`;
    if (key !== last.current) { last.current = key; setHud(next); }
  };
  const time = useFrames(awake && !reduced, render);
  useCanvasSize(canvas, (size) => {
    st.current = { ...size, ...fit(size) };
    render(time.current);
  });
  useEffect(() => { if (reduced) render(0); }, [reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  const lag = hud.phase === 'build' ? hud.lag : 0;
  const sched = lag >= 1
    ? { tone: 'amber', text: tr('Отставание {n} дн.').replace('{n}', lag) }
    : lag <= -1 ? { tone: 'green', text: tr('Опережение {n} дн.').replace('{n}', -lag) } : { tone: 'green', text: tr('По графику') };

  return (
    <div ref={root} className="o-scene o-scene--st" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <div className="o-st__top">
        <b>{tr('Школы и стройки')}</b>
        <span className="o-st__on"><i /> {tr('3 камеры онлайн')}</span>
        <em>{clock.hms}</em>
      </div>

      <div className="o-st__cams">
        <div className="o-st__tile">
          <img src="/scenes/wall-yard.webp" alt="" draggable="false" />
          <svg className="o-st__fence" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points="3,37 12,22 26,12 44,7 62,7 78,11 90,19 97,30" />
          </svg>
          <span className="o-st__cap">{tr('Школа № 21 · двор')}</span>
          <span className="o-st__rec"><i /> {clock.hms}</span>
          <span className="o-st__chip is-green">{tr('Периметр под охраной')}</span>
        </div>
        <div className={`o-st__tile is-${gate}`}>
          <img src="/scenes/wall-anpr.webp" alt="" draggable="false" />
          <span className="o-st__plate"><i /></span>
          <span className="o-st__read">01 784 KAA</span>
          <span className="o-st__cap">{tr('Стройка · КПП')}</span>
          <span className="o-st__rec"><i /> {clock.hms}</span>
          <span className={`o-st__chip ${gate === 'ok' ? 'is-green' : 'is-sky'}`}>
            {gate === 'scan' ? tr('Распознаю номер…') : gate === 'read' ? tr('Сверка со списком подрядчиков') : tr('Подрядчик · въезд разрешён')}
          </span>
        </div>
      </div>

      <div className={`o-st__tl is-${hud.phase}`}>
        <canvas ref={canvas} />
        <div className="o-st__tlhead">
          <span className="o-st__tlname"><i /> {tr('Таймлапс')} · {tr('корпус 2')}</span>
          <b>{hud.phase === 'rewind' ? '◀◀ ' : ''}{tr('День {n}').replace('{n}', hud.day)} <small>/ {DAYS}</small></b>
        </div>
        <div className="o-st__tlfoot">
          <div className="o-st__row">
            <span>{tr('Каркас')}</span>
            <div className="o-st__meter"><i style={{ transform: `scaleX(${hud.built / N})` }} /></div>
            <em>{hud.built}/{N}</em>
          </div>
          <div className="o-st__row is-glass">
            <span>{tr('Остекление')}</span>
            <div className="o-st__meter"><i style={{ transform: `scaleX(${hud.glass / N})` }} /></div>
            <em>{hud.glass}/{N}</em>
          </div>
          <span className={`o-st__sched is-${hud.phase === 'done' ? 'green' : sched.tone}`}>{hud.phase === 'done' ? tr('Каркас готов в срок') : sched.text}</span>
        </div>
      </div>
    </div>
  );
}
