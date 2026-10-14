// ---------------------------------------------------------------------------
// ЕГСВ: комплексы фиксации нарушений ПДД — «умный» пешеходный переход.
//
// Ночная улица сверху, как с камеры над перекрёстком. Пешеход подходит
// к переходу — комплекс его распознаёт, включает направленную подсветку
// зебры, мигающий знак и звуковое оповещение. Первая машина тормозит и
// пропускает человека — комплекс отмечает это зелёной рамкой. Вторая
// пролетает переход, когда на нём уже стоит пешеход: вспышка камеры,
// номер распознан, нарушение с фото и видео уходит в ЕГСВ.
// Внизу — линейка комплексов, подсвечен тот, что работает сейчас.
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { randomPlate } from '../../lib/plates.js';
import { clamp, groupNum, lerp, rng, span, useAwake, useCanvasSize, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

// Сцена рисуется в «виртуальном» кадре 800×600 и масштабируется под рамку.
const VW = 800;
const VH = 600;
const LOOP = 19000;
const STILL = 5300;
const ROAD = { top: 214, bottom: 386, mid: 300 };
const LANE = { farOut: 235.5, farIn: 278.5, nearIn: 321.5, nearOut: 364.5 };
const ZEBRA = { x0: 470, x1: 530 };
const STOP = { near: 446, far: 554 };
const POLE = { top: [500, 196], bottom: [500, 404] };
const SIGN = { top: [540, 198], bottom: [460, 402] };
const CAM = [624, 176];
const CAR = { l: 74, w: 34 };

// Сколько раз пешеходов и нарушений уже было до начала сцены.
const BASE = { peds: 1248, viol: 7 };

// ── движение ────────────────────────────────────────────────────────────────
// Каждая машина — функция времени цикла: где она и тормозит ли.
const off = { x: -200, y: 0, dir: 1, on: false };
function carAt(id, t) {
  switch (id) {
    case 'a': { // дальняя полоса, проезжает до появления пешеходов
      if (t > 3200) return off;
      return { x: 860 - 306 * (t / 1000), y: LANE.farOut, dir: -1, on: true };
    }
    case 'b': { // пропускает пешехода
      if (t < 2200 || t > 8800) return off;
      let x;
      let brake = 0;
      if (t < 3646) x = -60 + 240 * ((t - 2200) / 1000);
      else if (t < 4646) { const k = (t - 3646) / 1000; x = 287 + 240 * k - 120 * k * k; brake = 1; }
      else if (t < 6300) { x = 407; brake = 1; }
      else {
        const k = (t - 6300) / 1000;
        x = k < 1.6 ? 407 + 100 * k * k : 663 + 320 * (k - 1.6);
        brake = clamp(1 - k * 3);
      }
      return { x, y: LANE.nearIn, dir: 1, on: true, brake };
    }
    case 'e': { // фон: ближняя полоса после первого пешехода
      if (t < 8600 || t > 11500) return off;
      return { x: -60 + 340 * ((t - 8600) / 1000), y: LANE.nearOut, dir: 1, on: true };
    }
    case 'f': { // фон: дальняя полоса
      if (t < 8000 || t > 11100) return off;
      return { x: 860 - 320 * ((t - 8000) / 1000), y: LANE.farOut, dir: -1, on: true };
    }
    case 'c': { // не пропускает пешехода
      if (t < 10700 || t > 13900) return off;
      return { x: 860 - 300 * ((t - 10700) / 1000), y: LANE.farIn, dir: -1, on: true };
    }
    case 'd': { // фон: ближняя полоса в конце цикла
      if (t < 16100) return off;
      return { x: -60 + 345 * ((t - 16100) / 1000), y: LANE.nearIn, dir: 1, on: true };
    }
    default: return off;
  }
}
const CARS = [
  { id: 'a', color: '#aab3c2' },
  { id: 'b', color: '#2f6fd6' },
  { id: 'e', color: '#e9ebef' },
  { id: 'f', color: '#c69434' },
  { id: 'c', color: '#d24a43' },
  { id: 'd', color: '#2b2f37' },
];

// Пешеход: отрезки пути [начало, конец, из, в]. Между отрезками стоит.
const WALKS = {
  one: [
    [600, 2600, [380, 420], [500, 420]],
    [2600, 3000, [500, 420], [500, 396]],
    [4000, 8000, [500, 396], [500, 206]],
    [8000, 8350, [500, 206], [500, 188]],
    [8350, 10300, [500, 188], [356, 188]],
  ],
  two: [
    [8600, 10600, [646, 186], [500, 186]],
    [10600, 10950, [500, 186], [500, 205]],
    [11400, 11740, [500, 205], [500, 221]],
    [11740, 11900, [500, 221], [500, 216]],
    [12300, 15750, [500, 216], [500, 388]],
    [15750, 16100, [500, 388], [500, 412]],
    [16100, 18200, [500, 412], [648, 412]],
  ],
};
const FADE = { one: [600, 900, 9800, 10300], two: [8600, 8900, 17700, 18200] };

function pedAt(id, t) {
  const path = WALKS[id];
  const [in0, in1, out0, out1] = FADE[id];
  if (t < in0 || t > out1) return null;
  let pos = path[0][2];
  let heading = 0;
  let moving = false;
  for (const [a, b, from, to] of path) {
    heading = Math.atan2(to[1] - from[1], to[0] - from[0]);
    // короткий шаг назад при опасности: человек пятится, не разворачиваясь
    if (to[1] < from[1] && from[1] - to[1] < 10) heading += Math.PI;
    if (t < a) break;
    if (t <= b) {
      const k = (t - a) / (b - a);
      pos = [lerp(from[0], to[0], k), lerp(from[1], to[1], k)];
      moving = true;
      break;
    }
    pos = to;
  }
  const alpha = Math.min(span(t, in0, in1), 1 - span(t, out0, out1));
  return { x: pos[0], y: pos[1], heading, moving, alpha };
}

// Подсветка перехода: включается, когда пешеход у перехода или на нём.
function lightAt(t) {
  return Math.max(Math.min(span(t, 3300, 3800), 1 - span(t, 8000, 8600)), Math.min(span(t, 11000, 11500), 1 - span(t, 15800, 16400)));
}

// ── рисование ──────────────────────────────────────────────────────────────
function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function ellipse(g, x, y, rx, ry) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.round(clamp(k < 0 ? v * (1 + k) : v + (255 - v) * k, 0, 255));
  return `rgb(${ch(n >> 16)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`;
}

// Неподвижный фон: дома, деревья, тротуары, разметка, фонари.
function paintStatic(g) {
  const r = rng(7);
  g.fillStyle = '#0b0f17';
  g.fillRect(0, 0, VW, VH);

  // крыши домов сверху
  const roofs = [[-10, 18, 170, 112], [176, 30, 132, 100], [318, 6, 118, 124], [600, 24, 112, 106], [720, 10, 100, 120]];
  roofs.forEach(([x, y, w, h], i) => {
    g.fillStyle = 'rgba(0, 0, 0, .55)';
    g.fillRect(x + 6, y + 8, w, h);
    g.fillStyle = i % 2 ? '#141a25' : '#121822';
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(150, 170, 210, .12)';
    g.lineWidth = 2;
    g.strokeRect(x + 3, y + 3, w - 6, h - 6);
    for (let k = 0; k < 3; k++) {
      const ux = x + 14 + r() * (w - 40);
      const uy = y + 14 + r() * (h - 40);
      g.fillStyle = '#1b2230';
      g.fillRect(ux, uy, 14 + r() * 10, 10 + r() * 8);
    }
    // тёплые окна-фонари на крышах
    if (i !== 2) {
      g.fillStyle = 'rgba(255, 190, 110, .35)';
      g.fillRect(x + w * 0.62, y + h * 0.3, 8, 8);
    }
  });
  // двор: тёмная зелень
  g.fillStyle = '#0d1a15';
  g.fillRect(440, 0, 160, 150);

  // тротуары
  const walk = (y0, y1) => {
    g.fillStyle = '#1f2530';
    g.fillRect(0, y0, VW, y1 - y0);
    g.strokeStyle = 'rgba(160, 180, 220, .06)';
    g.lineWidth = 1;
    for (let x = 0; x <= VW; x += 16) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); }
    for (let y = y0; y <= y1; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(VW, y); g.stroke(); }
  };
  walk(150, 214);
  walk(386, 452);

  // парк снизу
  const park = g.createLinearGradient(0, 452, 0, VH);
  park.addColorStop(0, '#0d1b16');
  park.addColorStop(1, '#09130f');
  g.fillStyle = park;
  g.fillRect(0, 452, VW, VH - 452);
  g.strokeStyle = 'rgba(120, 130, 150, .18)';
  g.lineWidth = 16;
  g.beginPath(); g.moveTo(-20, 560); g.bezierCurveTo(200, 520, 420, 600, 820, 530); g.stroke();

  // дорога
  const asphalt = g.createLinearGradient(0, ROAD.top, 0, ROAD.bottom);
  asphalt.addColorStop(0, '#151a23');
  asphalt.addColorStop(0.5, '#181e28');
  asphalt.addColorStop(1, '#141922');
  g.fillStyle = asphalt;
  g.fillRect(0, ROAD.top, VW, ROAD.bottom - ROAD.top);
  for (let k = 0; k < 2600; k++) {
    g.fillStyle = r() < 0.5 ? 'rgba(255, 255, 255, .035)' : 'rgba(0, 0, 0, .18)';
    g.fillRect(r() * VW, ROAD.top + r() * (ROAD.bottom - ROAD.top), 1.4, 1.4);
  }
  // бордюры
  g.fillStyle = '#3a4252';
  g.fillRect(0, ROAD.top - 3, VW, 3);
  g.fillRect(0, ROAD.bottom, VW, 3);

  // разметка
  g.fillStyle = 'rgba(214, 222, 236, .55)';
  g.fillRect(0, ROAD.mid - 3.5, VW, 2.2);
  g.fillRect(0, ROAD.mid + 1.3, VW, 2.2);
  g.fillStyle = 'rgba(214, 222, 236, .38)';
  for (const y of [257, 343]) for (let x = -10; x < VW; x += 48) g.fillRect(x, y - 1, 26, 2);
  // стоп-линии
  g.fillStyle = 'rgba(232, 237, 245, .7)';
  g.fillRect(STOP.near - 2, ROAD.mid + 4, 4, ROAD.bottom - ROAD.mid - 4);
  g.fillRect(STOP.far - 2, ROAD.top, 4, ROAD.mid - 4 - ROAD.top);
  // зебра
  const bars = 8;
  const bar = 12;
  const gap = ((ROAD.bottom - ROAD.top - 8) - bars * bar) / (bars - 1);
  for (let k = 0; k < bars; k++) {
    const y = ROAD.top + 4 + k * (bar + gap);
    g.fillStyle = 'rgba(236, 240, 247, .74)';
    g.fillRect(ZEBRA.x0, y, ZEBRA.x1 - ZEBRA.x0, bar);
    g.fillStyle = 'rgba(0, 0, 0, .12)';
    for (let n = 0; n < 6; n++) g.fillRect(ZEBRA.x0 + r() * 56, y + r() * 9, 3 + r() * 5, 2);
  }

  // деревья
  const tree = (x, y, rad) => {
    g.fillStyle = 'rgba(0, 0, 0, .45)';
    ellipse(g, x + 7, y + 9, rad, rad * 0.92);
    const crown = g.createRadialGradient(x - rad * 0.35, y - rad * 0.4, rad * 0.1, x, y, rad);
    crown.addColorStop(0, '#2b5a45');
    crown.addColorStop(0.6, '#173a2c');
    crown.addColorStop(1, '#0f271e');
    g.fillStyle = crown;
    ellipse(g, x, y, rad, rad);
  };
  [[40, 140, 22], [236, 144, 20], [418, 136, 24], [690, 142, 21], [470, 70, 30], [560, 96, 26]].forEach(([x, y, rad]) => tree(x, y, rad));
  [[80, 496, 30], [250, 520, 26], [640, 500, 32], [760, 560, 28], [400, 574, 24]].forEach(([x, y, rad]) => tree(x, y, rad));

  // уличные фонари: тёплые пятна света
  g.globalCompositeOperation = 'lighter';
  const lamps = [[110, 160], [320, 160], [714, 160], [200, 440], [660, 440]];
  lamps.forEach(([x, y]) => {
    const pool = g.createRadialGradient(x, y + (y < 300 ? 40 : -40), 6, x, y + (y < 300 ? 40 : -40), 130);
    pool.addColorStop(0, 'rgba(255, 176, 96, .2)');
    pool.addColorStop(1, 'rgba(255, 176, 96, 0)');
    g.fillStyle = pool;
    g.fillRect(x - 140, y - 140, 280, 280);
  });
  g.globalCompositeOperation = 'source-over';
  lamps.forEach(([x, y]) => {
    g.fillStyle = '#ffd9a8';
    ellipse(g, x, y, 3.2, 3.2);
  });

  // опоры комплекса и камера
  for (const [x, y] of [POLE.top, POLE.bottom, CAM]) {
    g.fillStyle = '#2c3442';
    ellipse(g, x, y, 6, 6);
    g.strokeStyle = 'rgba(190, 205, 230, .35)';
    g.lineWidth = 1.5;
    g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.stroke();
  }
  // кронштейны прожекторов над зеброй
  g.strokeStyle = '#3b4557';
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(POLE.top[0], POLE.top[1]); g.lineTo(POLE.top[0], ROAD.top + 6); g.stroke();
  g.beginPath(); g.moveTo(POLE.bottom[0], POLE.bottom[1]); g.lineTo(POLE.bottom[0], ROAD.bottom - 6); g.stroke();
}

function drawCar(g, car, color) {
  const { x, y, dir, brake = 0 } = car;
  const L = CAR.l;
  const W = CAR.w;
  g.save();
  g.translate(x, y);
  g.scale(dir, 1);
  // тень
  g.fillStyle = 'rgba(0, 0, 0, .5)';
  rr(g, -L / 2 + 3, -W / 2 + 5, L, W, 10);
  g.fill();
  // кузов
  const body = g.createLinearGradient(0, -W / 2, 0, W / 2);
  body.addColorStop(0, shade(color, -0.45));
  body.addColorStop(0.28, shade(color, 0.1));
  body.addColorStop(0.5, shade(color, 0.22));
  body.addColorStop(0.72, shade(color, 0.1));
  body.addColorStop(1, shade(color, -0.45));
  g.fillStyle = body;
  rr(g, -L / 2, -W / 2, L, W, 10);
  g.fill();
  // лобовое стекло, крыша, заднее стекло
  g.fillStyle = '#0a1019';
  g.beginPath();
  g.moveTo(L / 2 - 28, -W / 2 + 4.5); g.lineTo(L / 2 - 15, -W / 2 + 6.5); g.lineTo(L / 2 - 15, W / 2 - 6.5); g.lineTo(L / 2 - 28, W / 2 - 4.5);
  g.closePath(); g.fill();
  g.beginPath();
  g.moveTo(-L / 2 + 9, -W / 2 + 6.5); g.lineTo(-L / 2 + 19, -W / 2 + 4.5); g.lineTo(-L / 2 + 19, W / 2 - 4.5); g.lineTo(-L / 2 + 9, W / 2 - 6.5);
  g.closePath(); g.fill();
  const roof = g.createLinearGradient(-L / 2 + 19, 0, L / 2 - 28, 0);
  roof.addColorStop(0, shade(color, 0.05));
  roof.addColorStop(1, shade(color, 0.3));
  g.fillStyle = roof;
  rr(g, -L / 2 + 19, -W / 2 + 4.5, L - 47, W - 9, 4);
  g.fill();
  // блик на стекле
  g.fillStyle = 'rgba(160, 200, 255, .16)';
  g.fillRect(L / 2 - 25, -W / 2 + 7, 3, W - 14);
  // зеркала
  g.fillStyle = shade(color, -0.3);
  rr(g, L / 2 - 27, -W / 2 - 3, 5, 4, 1.5); g.fill();
  rr(g, L / 2 - 27, W / 2 - 1, 5, 4, 1.5); g.fill();
  // фары и фонари
  g.fillStyle = '#fff7df';
  rr(g, L / 2 - 4, -W / 2 + 4, 3.5, 7, 1.5); g.fill();
  rr(g, L / 2 - 4, W / 2 - 11, 3.5, 7, 1.5); g.fill();
  g.fillStyle = brake ? '#ff4d3d' : '#b3261e';
  rr(g, -L / 2 + 0.5, -W / 2 + 4, 3, 7, 1.2); g.fill();
  rr(g, -L / 2 + 0.5, W / 2 - 11, 3, 7, 1.2); g.fill();
  g.restore();
}

function drawLights(g, car) {
  const { x, y, dir, brake = 0 } = car;
  // свет фар
  for (const side of [-1, 1]) {
    const hx = x + dir * (CAR.l / 2 - 1);
    const hy = y + side * (CAR.w / 2 - 7.5);
    const len = 190;
    const beam = g.createLinearGradient(hx, hy, hx + dir * len, hy);
    beam.addColorStop(0, 'rgba(255, 238, 200, .32)');
    beam.addColorStop(0.35, 'rgba(255, 238, 200, .12)');
    beam.addColorStop(1, 'rgba(255, 238, 200, 0)');
    g.fillStyle = beam;
    g.beginPath();
    g.moveTo(hx, hy - 3);
    g.lineTo(hx + dir * len, hy - 16 + side * 18);
    g.lineTo(hx + dir * len, hy + 16 + side * 18);
    g.lineTo(hx, hy + 3);
    g.closePath();
    g.fill();
  }
  // красное свечение стоп-сигналов
  const tail = g.createRadialGradient(x - dir * CAR.l / 2, y, 2, x - dir * CAR.l / 2, y, 34 + 26 * brake);
  tail.addColorStop(0, `rgba(255, 60, 45, ${0.28 + 0.4 * brake})`);
  tail.addColorStop(1, 'rgba(255, 60, 45, 0)');
  g.fillStyle = tail;
  g.fillRect(x - dir * CAR.l / 2 - 70, y - 70, 140, 140);
}

function drawPed(g, p, coat, t) {
  const phase = p.moving ? t / 105 : 0;
  const sw = Math.sin(phase);
  g.save();
  g.globalAlpha = p.alpha;
  g.translate(p.x, p.y);
  g.scale(1.3, 1.3);
  g.fillStyle = 'rgba(0, 0, 0, .45)';
  ellipse(g, 3, 4, 10, 8);
  g.rotate(p.heading);
  g.fillStyle = '#1a202b';
  ellipse(g, sw * 5, -3.3, 4.4, 2.5);
  ellipse(g, -sw * 5, 3.3, 4.4, 2.5);
  g.fillStyle = shade(coat, -0.25);
  ellipse(g, -sw * 4, -8, 3.8, 2.4);
  ellipse(g, sw * 4, 8, 3.8, 2.4);
  const torso = g.createLinearGradient(0, -8, 0, 8);
  torso.addColorStop(0, shade(coat, -0.2));
  torso.addColorStop(0.5, shade(coat, 0.15));
  torso.addColorStop(1, shade(coat, -0.2));
  g.fillStyle = torso;
  ellipse(g, 0, 0, 5.4, 8.6);
  g.fillStyle = '#2a1e16';
  ellipse(g, 0.8, 0, 4.4, 4.4);
  g.fillStyle = 'rgba(255, 255, 255, .14)';
  ellipse(g, 1.6, -1.4, 1.6, 1.4);
  g.restore();
}

function brackets(g, x, y, w, h, color, a, lw) {
  const c = Math.min(w, h) * 0.32;
  g.strokeStyle = color;
  g.globalAlpha = a;
  g.lineWidth = lw;
  g.beginPath();
  g.moveTo(x, y + c); g.lineTo(x, y); g.lineTo(x + c, y);
  g.moveTo(x + w - c, y); g.lineTo(x + w, y); g.lineTo(x + w, y + c);
  g.moveTo(x + w, y + h - c); g.lineTo(x + w, y + h); g.lineTo(x + w - c, y + h);
  g.moveTo(x + c, y + h); g.lineTo(x, y + h); g.lineTo(x, y + h - c);
  g.stroke();
  g.globalAlpha = 1;
}

const TYPES = [
  { id: 'line', label: () => tr('Рубеж') },
  { id: 'ped', label: () => tr('Пешеходный переход') },
  { id: 'smart', label: () => tr('Умный переход') },
  { id: 'cross', label: () => tr('Перекрёсток') },
  { id: 'avg', label: () => tr('Средняя скорость') },
  { id: 'rail', label: () => tr('Ж/д переезд') },
];

export default function EgsvCrossing() {
  const root = useRef(null);
  const canvas = useRef(null);
  const tagRef = useRef(null);
  const yieldRef = useRef(null);
  const st = useRef({ bg: null, size: null, plates: new Map() });
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const [ui, setUi] = useState({ tag: false, yielded: false, viol: false, active: 'smart', peds: BASE.peds, count: BASE.viol, plate: '' });
  const last = useRef('');

  const plateFor = (loop) => {
    const m = st.current.plates;
    if (!m.has(loop)) { m.set(loop, randomPlate()); if (m.size > 4) m.delete(m.keys().next().value); }
    return m.get(loop);
  };

  const draw = (time) => {
    const c = canvas.current;
    const s = st.current;
    if (!c || !s.size) return;
    const t = reduced ? STILL : time % LOOP;
    const loop = reduced ? 0 : Math.floor(time / LOOP);
    const g = c.getContext('2d');
    const { w, h, dpr } = s.size;
    const S = Math.max(w / VW, h / VH);
    const OX = (w - VW * S) / 2;
    const OY = (h - VH * S) / 2;
    if (!s.bg || s.bgKey !== `${w}x${h}`) {
      const bg = document.createElement('canvas');
      bg.width = w;
      bg.height = h;
      const bgc = bg.getContext('2d');
      bgc.setTransform(S, 0, 0, S, OX, OY);
      paintStatic(bgc);
      s.bg = bg;
      s.bgKey = `${w}x${h}`;
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.drawImage(s.bg, 0, 0);
    g.setTransform(S, 0, 0, S, OX, OY);

    const L = lightAt(t);
    const blink = L > 0.4 && Math.floor(t / 420) % 2 === 0 ? 1 : 0;
    const cars = CARS.map((k) => ({ ...k, ...carAt(k.id, t) })).filter((k) => k.on && k.x > -120 && k.x < VW + 120);
    // пешеходы и время, когда комплекс их «видит»
    const peds = [
      { id: 'one', coat: '#e2725b', seen: [3100, 8000] },
      { id: 'two', coat: '#5aa9e6', seen: [10950, 15800] },
    ].map((k) => ({ ...k, p: pedAt(k.id, t) })).filter((k) => k.p);

    // свет: прожекторы зебры, знаки, фары
    g.globalCompositeOperation = 'lighter';
    if (L > 0) {
      for (const [cy, py] of [[257, POLE.top[1]], [343, POLE.bottom[1]]]) {
        const pool = g.createRadialGradient(500, cy, 6, 500, cy, 92);
        pool.addColorStop(0, `rgba(205, 228, 255, ${0.5 * L})`);
        pool.addColorStop(0.55, `rgba(160, 205, 255, ${0.2 * L})`);
        pool.addColorStop(1, 'rgba(160, 205, 255, 0)');
        g.fillStyle = pool;
        g.fillRect(400, cy - 100, 200, 200);
        const cone = g.createLinearGradient(500, py, 500, cy);
        cone.addColorStop(0, `rgba(220, 236, 255, ${0.35 * L})`);
        cone.addColorStop(1, 'rgba(220, 236, 255, 0)');
        g.fillStyle = cone;
        g.beginPath();
        g.moveTo(496, py); g.lineTo(504, py); g.lineTo(540, cy); g.lineTo(460, cy);
        g.closePath(); g.fill();
      }
      for (const [x, y] of [SIGN.top, SIGN.bottom]) {
        const glow = g.createRadialGradient(x, y, 1, x, y, 30);
        glow.addColorStop(0, `rgba(255, 186, 60, ${0.75 * blink * L})`);
        glow.addColorStop(1, 'rgba(255, 186, 60, 0)');
        g.fillStyle = glow;
        g.fillRect(x - 30, y - 30, 60, 60);
      }
    }
    for (const car of cars) drawLights(g, car);
    g.globalCompositeOperation = 'source-over';

    // звуковое оповещение: волны от опор
    if (L > 0.5) {
      for (const [x, y, up] of [[POLE.top[0], POLE.top[1], -1], [POLE.bottom[0], POLE.bottom[1], 1]]) {
        for (let k = 0; k < 2; k++) {
          const ph = ((t / 900) + k * 0.5) % 1;
          g.strokeStyle = `rgba(143, 216, 255, ${0.5 * (1 - ph) * L})`;
          g.lineWidth = 1.6;
          g.beginPath();
          g.arc(x, y, 10 + ph * 34, up > 0 ? 0.15 * Math.PI : 1.15 * Math.PI, up > 0 ? 0.85 * Math.PI : 1.85 * Math.PI);
          g.stroke();
        }
      }
    }

    // знаки «Пешеходный переход»
    for (const [x, y] of [SIGN.top, SIGN.bottom]) {
      g.fillStyle = blink ? '#ffb02e' : '#1e5bd6';
      rr(g, x - 7, y - 7, 14, 14, 2.5);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.moveTo(x - 4, y + 4); g.lineTo(x, y - 4.5); g.lineTo(x + 4, y + 4); g.closePath(); g.fill();
    }
    // лампы прожекторов
    for (const [x, y] of [[500, ROAD.top + 6], [500, ROAD.bottom - 6]]) {
      g.fillStyle = L > 0.1 ? `rgba(235, 245, 255, ${0.35 + 0.65 * L})` : '#59657a';
      rr(g, x - 7, y - 3, 14, 6, 2);
      g.fill();
    }

    // машины и люди
    for (const car of cars) drawCar(g, car, car.color);
    for (const k of peds) drawPed(g, k.p, k.coat, t);

    // рамки распознавания
    const lw = 2;
    const seen = peds.find((k) => t >= k.seen[0] && t < k.seen[1]);
    if (seen) brackets(g, seen.p.x - 18, seen.p.y - 18, 36, 36, '#8fd8ff', span(t, seen.seen[0], seen.seen[0] + 250), lw);
    const b = cars.find((k) => k.id === 'b');
    const yielded = Boolean(b) && t >= 4700 && t < 6500;
    if (yielded) brackets(g, b.x - CAR.l / 2 - 6, b.y - CAR.w / 2 - 6, CAR.l + 12, CAR.w + 12, '#4ade80', span(t, 4700, 5000), lw);
    const cc = cars.find((k) => k.id === 'c');
    const caught = Boolean(cc) && t >= 11650 && t < 12900;
    if (caught) brackets(g, cc.x - CAR.l / 2 - 6, cc.y - CAR.w / 2 - 6, CAR.l + 12, CAR.w + 12, '#ff5b57', 1 - span(t, 12500, 12900), lw);

    // камера фиксации: сектор обзора и вспышка
    const flash = 1 - span(t, 11660, 12060);
    const fov = 0.07 + 0.25 * (t >= 11660 && t < 12060 ? flash : 0);
    const sector = g.createRadialGradient(CAM[0], CAM[1], 4, CAM[0], CAM[1], 150);
    sector.addColorStop(0, `rgba(255, 255, 255, ${fov})`);
    sector.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = sector;
    g.beginPath();
    g.moveTo(CAM[0], CAM[1]);
    g.arc(CAM[0], CAM[1], 150, 1.55, 2.55);
    g.closePath();
    g.fill();
    g.save();
    g.translate(CAM[0], CAM[1]);
    g.rotate(2.05);
    g.fillStyle = '#273041';
    rr(g, -6, -6, 20, 12, 3);
    g.fill();
    g.strokeStyle = 'rgba(190, 210, 240, .45)';
    g.lineWidth = 1.2;
    g.stroke();
    g.fillStyle = t >= 11660 && t < 11900 ? '#ffffff' : '#7dd3fc';
    ellipse(g, 14, 0, 3.4, 3.4);
    g.restore();
    if (t >= 11660 && t < 12060) {
      g.globalCompositeOperation = 'lighter';
      const burst = g.createRadialGradient(CAM[0], CAM[1], 0, CAM[0], CAM[1], 120);
      burst.addColorStop(0, `rgba(255, 255, 255, ${0.9 * flash})`);
      burst.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = burst;
      g.fillRect(CAM[0] - 120, CAM[1] - 120, 240, 240);
      g.globalCompositeOperation = 'source-over';
    }

    // подписи над картинкой: переводим виртуальные координаты в CSS-пиксели
    const css = (x, y) => [(x * S + OX) / dpr, (y * S + OY) / dpr];
    if (tagRef.current && seen) {
      const [x, y] = css(seen.p.x + 20, seen.p.y - 20);
      tagRef.current.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
    if (yieldRef.current && b) {
      const [x, y] = css(b.x, b.y - CAR.w / 2 - 10);
      yieldRef.current.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }

    const pedsDone = BASE.peds + loop * 2 + (t > 8000 ? 1 : 0) + (t > 15750 ? 1 : 0);
    const viol = BASE.viol + loop + (t > 11900 ? 1 : 0);
    const vCard = t >= 11900 && t < 15600;
    const active = vCard ? 'ped' : L > 0.3 ? 'smart' : 'line';
    const state = {
      tag: Boolean(seen),
      yielded,
      viol: vCard,
      active,
      peds: pedsDone,
      count: viol,
      plate: vCard ? plateFor(loop) : '',
    };
    const key = JSON.stringify(state);
    if (key !== last.current) { last.current = key; setUi(state); }
  };

  const time = useFrames(awake && !reduced, draw);
  useCanvasSize(canvas, (size) => {
    st.current.size = size;
    draw(time.current);
  });

  return (
    <div ref={root} className="o-scene o-scene--cr" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <canvas ref={canvas} />
      <div className="o-cr__vignette" />
      <div className="o-cr__top">
        <div className="o-cr__chip"><i /> {tr('ЕГСВ')} · {tr('комплексы ПДД')}</div>
        <div className="o-cr__kpi">
          <div><b>{groupNum(ui.peds)}</b><span>{tr('пешеходов за сутки')}</span></div>
          <div className={ui.viol ? 'is-hot' : ''}><b>{ui.count}</b><span>{tr('нарушений')}</span></div>
        </div>
      </div>
      <div ref={tagRef} className={`o-cr__tag${ui.tag ? ' is-on' : ''}`}>{tr('Пешеход')} · 97%</div>
      <div ref={yieldRef} className={`o-cr__yield${ui.yielded ? ' is-on' : ''}`}><i>✓</i> {tr('Пропустил пешехода')}</div>
      {ui.viol ? (
        <div className="o-cr__viol" key={ui.plate}>
          <div className="o-cr__vt"><i /> {tr('Нарушение ПДД')}</div>
          <div className="o-cr__vk">{tr('Непредоставление преимущества пешеходу')}</div>
          <div className="o-cr__vp">{ui.plate}</div>
          <div className="o-cr__vs">{tr('Фото и видео отправлены в ЕГСВ')}</div>
        </div>
      ) : null}
      <div className="o-cr__types">
        {TYPES.map((k) => <span key={k.id} className={k.id === ui.active ? 'is-on' : ''}>{k.label()}</span>)}
      </div>
    </div>
  );
}
