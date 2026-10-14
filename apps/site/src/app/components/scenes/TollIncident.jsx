// ---------------------------------------------------------------------------
// Платная магистраль: управление движением и обнаружение инцидентов.
//
// Цифровой двойник участка трассы: поток машин в обе стороны, камеры
// на разделительной полосе, табло и сигналы над полосами. Машина
// останавливается в левом ряду — камера замечает остановку, и система
// сама запускает сценарий: табло предупреждает о ДТП, скорость снижается
// до 70, левый ряд закрывается, диспетчер и аварийная служба получают
// вызов. Поток перестраивается, служба приезжает, инцидент закрыт — и
// знаки возвращаются в обычный режим. Под дорогой — скорость потока
// по участкам, она проседает у места происшествия.
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { clamp, groupNum, rng, span, useAwake, useCanvasSize, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

const VW = 800;
const VH = 600;
const LOOP = 20000;
const STILL = 9200;
const STEP = 1000 / 60;
// Полосы: на восток (вправо) — нижняя проезжая часть, на запад — верхняя.
// Номер 0 — левая полоса, у разделителя.
const EAST = [327.5, 362.5, 397.5];
const WEST = [257.5, 222.5, 187.5];
const MEDIAN = [275, 310];
const EDGE = { top: 170, bottom: 415 };
const INC_X = 540;
const SIGNS_X = 330;
const VMS_X = 172;
const CAMS = [[138, 292.5], [600, 292.5]];
const KMH = 0.66; // единицы сцены в секунду → км/ч на подписи
const LIMIT = { free: 160, slow: 106 };
const SCENARIO = { detect: 4600, vms: 5200, speed: 5700, lane: 6200, call: 6700, ems: 10200, clear: 15000, calm: 18000 };
const COLORS = ['#e5e7eb', '#cbd5e1', '#94a3b8', '#60a5fa', '#f1f5f9', '#1f2937', '#fca5a5', '#fde68a'];

function closureOn(L) {
  return L >= SCENARIO.lane && L < SCENARIO.clear;
}
function limitAt(L, x, dir) {
  if (dir > 0 && L >= SCENARIO.speed && L < SCENARIO.clear + 500 && x > VMS_X && x < INC_X + 120) return LIMIT.slow;
  return LIMIT.free;
}

// ── модель потока ────────────────────────────────────────────────────────────
// Поток идёт непрерывно, а сценарий происшествия повторяется по кругу:
// время сценария — это время модели по модулю LOOP. До нуля модель
// прогревается, чтобы дорога с первого кадра была не пустой.
const WARMUP = 6000;
const localOf = (t) => (t < 0 ? -1 : t % LOOP);

function createSim(seed) {
  return { t: -WARMUP, cars: [], rand: rng(seed), next: [-5800, -5200, -5500, -5900, -5300, -5600], id: 0, passed: 0, inc: null, ems: null, loop: -1 };
}

// Ближайшая машина впереди по полосе и расстояние до неё.
function leaderOf(sim, car, lane = car.lane) {
  let best = null;
  let gap = Infinity;
  for (const o of sim.cars) {
    if (o === car || o.dir !== car.dir || o.lane !== lane) continue;
    const d = (o.x - car.x) * car.dir - (o.len + car.len) / 2;
    if (d > -2 && d < gap) { gap = d; best = o; }
  }
  return { leader: best, gap };
}

function freeAround(sim, car, lane, back = 34, ahead = 40) {
  return !sim.cars.some((o) => o !== car && o.dir === car.dir && o.lane === lane
    && (o.x - car.x) * car.dir > -back - (o.len + car.len) / 2 && (o.x - car.x) * car.dir < ahead + (o.len + car.len) / 2);
}

function spawn(sim, dir, lane, kind = 'car') {
  const r = sim.rand;
  const truck = kind === 'car' && r() < 0.18;
  const len = kind === 'ems' ? 33 : truck ? 46 : 27 + r() * 4;
  const car = {
    id: sim.id++, dir, lane, y: (dir > 0 ? EAST : WEST)[lane], x: dir > 0 ? -30 : VW + 30,
    v: kind === 'ems' ? 190 : truck ? 115 : 150, vmax: kind === 'ems' ? 200 : truck ? 120 : 150 + r() * 22,
    len, wid: truck ? 16 : 14, color: kind === 'ems' ? '#f8fafc' : truck ? '#cbd5e1' : COLORS[Math.floor(r() * COLORS.length)],
    kind, truck,
  };
  if (!freeAround(sim, car, lane, 0, 56)) return null;
  sim.cars.push(car);
  return car;
}

function stepSim(sim, dt) {
  const t = sim.t;
  const L = localOf(t);
  const loop = t < 0 ? -1 : Math.floor(t / LOOP);
  if (loop !== sim.loop) { sim.loop = loop; sim.inc = null; sim.ems = null; }
  const r = sim.rand;
  const k = dt / 1000;
  // появление машин: по своему таймеру на каждую полосу
  for (let i = 0; i < 6; i++) {
    if (t < sim.next[i]) continue;
    const dir = i < 3 ? 1 : -1;
    const lane = i % 3;
    // левый ряд на восток держим свободным: перед машиной, которая
    // остановится, и пока ряд закрыт — табло заранее уводит поток правее
    const blocked = dir > 0 && lane === 0 && L >= 0 && ((L >= 700 && L < 1650) || (L >= SCENARIO.vms - 1500 && L < SCENARIO.clear + 800));
    if (!blocked) spawn(sim, dir, lane);
    sim.next[i] = t + (lane === 2 ? 1500 : 1100) + r() * 1900;
  }
  // машина, которая остановится в левом ряду
  if (!sim.inc && L >= 1650 && L < 2400) {
    const c = spawn(sim, 1, 0);
    if (c) { c.kind = 'inc'; c.color = '#f97316'; c.vmax = 150; sim.inc = c; }
  }
  // аварийная служба
  if (!sim.ems && L >= SCENARIO.ems && L < SCENARIO.ems + 800) {
    const c = spawn(sim, 1, 0, 'ems');
    if (c) sim.ems = c;
  }
  for (const car of sim.cars) {
    let target = Math.min(car.vmax, limitAt(L, car.x, car.dir));
    const hold = L >= 0 && L < SCENARIO.clear - 400;
    if (car.kind === 'inc' && hold) {
      const d = INC_X - car.x;
      if (d < 150) target = Math.max(0, Math.min(target, Math.sqrt(Math.max(0, d) * 2 * 120)));
      if (d < 1) target = 0;
    }
    if (car.kind === 'ems' && hold) {
      const d = INC_X - 44 - car.x;
      if (d < 220) target = Math.max(0, Math.min(target, Math.sqrt(Math.max(0, d) * 2 * 140)));
      if (d < 1) target = 0;
    }
    const { leader, gap } = leaderOf(sim, car);
    // закрытый ряд — как неподвижное препятствие для всех, кроме службы
    let wall = Infinity;
    if (car.dir > 0 && car.lane === 0 && closureOn(L) && car.kind === 'car' && car.x < INC_X) wall = INC_X - 150 - car.x;
    const room = Math.min(gap, wall);
    const safe = 12 + car.v * 0.35;
    if (room < safe) target = Math.min(target, Math.max(0, (room - 6) * 2.2));
    if (leader && gap < 60 && leader.v < car.v) target = Math.min(target, leader.v + gap);
    const acc = target > car.v ? 90 : 420;
    car.v += clamp(target - car.v, -acc * k, acc * k);
    car.x += car.dir * car.v * k;
    // перестроение: из закрытого ряда и от стоящей впереди машины
    if (car.dir > 0 && car.lane === 0 && car.kind === 'car') {
      const needs = (closureOn(L) && car.x > SIGNS_X - 120 && car.x < INC_X - 20) || (leader && leader.v < 30 && gap < 120);
      if (needs && freeAround(sim, car, 1)) car.lane = 1;
    }
    const ty = (car.dir > 0 ? EAST : WEST)[car.lane];
    car.y += clamp(ty - car.y, -70 * k, 70 * k);
  }
  const before = sim.cars.length;
  sim.cars = sim.cars.filter((c) => c.x > -60 && c.x < VW + 60);
  sim.passed += before - sim.cars.length;
  sim.t += dt;
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

function paintStatic(g, km) {
  const r = rng(5);
  g.fillStyle = '#0b1018';
  g.fillRect(0, 0, VW, VH);
  // поля: крупные мягкие пятна
  for (let i = 0; i < 14; i++) {
    const x = r() * VW;
    const y = r() < 0.5 ? 40 + r() * 100 : 470 + r() * 110;
    g.fillStyle = r() < 0.5 ? 'rgba(28, 52, 40, .32)' : 'rgba(34, 44, 62, .3)';
    g.beginPath(); g.ellipse(x, y, 70 + r() * 80, 22 + r() * 24, r() * 0.4 - 0.2, 0, Math.PI * 2); g.fill();
  }
  // лесополосы вдоль трассы
  const trees = (y0, n) => {
    for (let i = 0; i < n; i++) {
      const x = r() * VW;
      const y = y0 + r() * 22;
      const rad = 7 + r() * 6;
      g.fillStyle = 'rgba(0, 0, 0, .4)';
      g.beginPath(); g.arc(x + 3, y + 4, rad, 0, Math.PI * 2); g.fill();
      const crown = g.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 1, x, y, rad);
      crown.addColorStop(0, '#24543f');
      crown.addColorStop(1, '#132f23');
      g.fillStyle = crown;
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
  };
  trees(128, 26);
  // съезд к развязке
  g.strokeStyle = '#171d28';
  g.lineWidth = 18;
  g.beginPath(); g.moveTo(650, EDGE.bottom); g.bezierCurveTo(700, 470, 730, 520, 820, 560); g.stroke();
  // проезжие части
  const road = (y0, y1) => {
    const grad = g.createLinearGradient(0, y0, 0, y1);
    grad.addColorStop(0, '#171d27');
    grad.addColorStop(1, '#141923');
    g.fillStyle = grad;
    g.fillRect(0, y0, VW, y1 - y0);
    for (let k = 0; k < 900; k++) {
      g.fillStyle = r() < 0.5 ? 'rgba(255, 255, 255, .03)' : 'rgba(0, 0, 0, .16)';
      g.fillRect(r() * VW, y0 + r() * (y1 - y0), 1.4, 1.4);
    }
    g.fillStyle = 'rgba(214, 222, 236, .5)';
    g.fillRect(0, y0 + 2, VW, 1.8);
    g.fillRect(0, y1 - 3.8, VW, 1.8);
  };
  road(EDGE.top, MEDIAN[0]);
  road(MEDIAN[1], EDGE.bottom);
  // разделительная полоса с ограждением
  g.fillStyle = '#122119';
  g.fillRect(0, MEDIAN[0], VW, MEDIAN[1] - MEDIAN[0]);
  g.fillStyle = 'rgba(190, 200, 215, .35)';
  g.fillRect(0, (MEDIAN[0] + MEDIAN[1]) / 2 - 1, VW, 2);
  // прерывистая разметка
  g.fillStyle = 'rgba(214, 222, 236, .34)';
  for (const y of [205, 240, 345, 380]) for (let x = 0; x < VW; x += 44) g.fillRect(x, y - 0.9, 22, 1.8);
  // километровые столбики
  g.font = '600 11px ui-monospace, Menlo, Consolas, monospace';
  g.fillStyle = 'rgba(200, 215, 240, .5)';
  [46, 47, 48].forEach((n, i) => {
    const x = 100 + i * 280;
    g.fillRect(x, EDGE.bottom + 5, 2, 8);
    g.fillText(`${km} ${n}`, x + 6, EDGE.bottom + 14);
  });
}

function drawCar(g, c, t) {
  g.save();
  g.translate(c.x, c.y);
  g.scale(c.dir, 1);
  const L = c.len;
  const W = c.wid;
  g.fillStyle = 'rgba(0, 0, 0, .5)';
  rr(g, -L / 2 + 2, -W / 2 + 3, L, W, 3);
  g.fill();
  g.fillStyle = c.color;
  rr(g, -L / 2, -W / 2, L, W, c.truck ? 2 : 3.5);
  g.fill();
  if (c.truck) {
    g.fillStyle = '#334155';
    g.fillRect(L / 2 - 9, -W / 2 + 1, 2, W - 2);
  } else {
    g.fillStyle = 'rgba(10, 16, 26, .85)';
    g.fillRect(L / 2 - 8, -W / 2 + 1.5, 3.4, W - 3);
    g.fillRect(-L / 2 + 3, -W / 2 + 1.5, 2.6, W - 3);
  }
  // фары и фонари
  g.fillStyle = '#fff7df';
  g.fillRect(L / 2 - 1.2, -W / 2 + 1, 1.2, 2.4);
  g.fillRect(L / 2 - 1.2, W / 2 - 3.4, 1.2, 2.4);
  const braking = c.v < 60;
  g.fillStyle = braking ? '#ff5b4a' : '#a32b22';
  g.fillRect(-L / 2, -W / 2 + 1, 1.2, 2.4);
  g.fillRect(-L / 2, W / 2 - 3.4, 1.2, 2.4);
  g.restore();
  // аварийка и маячки
  if (c.kind === 'inc' && c.v < 5) {
    const on = Math.floor(t / 380) % 2 === 0;
    if (on) {
      g.globalCompositeOperation = 'lighter';
      for (const [dx, dy] of [[-c.len / 2, -c.wid / 2], [-c.len / 2, c.wid / 2], [c.len / 2, -c.wid / 2], [c.len / 2, c.wid / 2]]) {
        const glow = g.createRadialGradient(c.x + dx, c.y + dy, 0, c.x + dx, c.y + dy, 12);
        glow.addColorStop(0, 'rgba(255, 176, 46, .95)');
        glow.addColorStop(1, 'rgba(255, 176, 46, 0)');
        g.fillStyle = glow;
        g.fillRect(c.x + dx - 12, c.y + dy - 12, 24, 24);
      }
      g.globalCompositeOperation = 'source-over';
    }
  }
  if (c.kind === 'ems') {
    const ph = Math.floor(t / 160) % 2;
    g.globalCompositeOperation = 'lighter';
    const glow = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, 26);
    glow.addColorStop(0, ph ? 'rgba(255, 70, 70, .9)' : 'rgba(80, 140, 255, .9)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = glow;
    g.fillRect(c.x - 26, c.y - 26, 52, 52);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#ef4444';
    g.fillRect(c.x - 2, c.y - c.wid / 2, 4, c.wid);
  }
}

// Скорость потока на восток по восьми участкам дороги.
function speedProfile(sim) {
  const bins = new Array(8).fill(null).map(() => ({ s: 0, n: 0 }));
  for (const c of sim.cars) {
    if (c.dir < 0 || c.kind === 'ems') continue;
    const i = Math.floor(clamp(c.x / VW, 0, 0.999) * 8);
    bins[i].s += c.v;
    bins[i].n += 1;
  }
  return bins.map((b) => (b.n ? b.s / b.n : null));
}

const STEPS = [
  { at: SCENARIO.vms, text: () => tr('Табло: «ДТП через 2 км»') },
  { at: SCENARIO.speed, text: () => tr('Ограничение скорости 70 км/ч') },
  { at: SCENARIO.lane, text: () => tr('Левый ряд закрыт') },
  { at: SCENARIO.call, text: () => tr('Вызов диспетчеру и аварийной службе') },
];

export default function TollIncident() {
  const root = useRef(null);
  const canvas = useRef(null);
  const st = useRef({ sim: createSim(31), size: null, bg: null });
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const [ui, setUi] = useState({ phase: 'calm', steps: 0, speed: 104, flow: 1840 });
  const last = useRef('');

  const draw = (time) => {
    const c = canvas.current;
    const s = st.current;
    if (!c || !s.size) return;
    // модель идёт непрерывно; без анимации — стоп-кадр в середине сценария
    const target = reduced ? STILL : time;
    if (target < s.sim.t - 1) s.sim = createSim(31);
    let guard = 0;
    while (s.sim.t + STEP <= target && guard++ < 2400) stepSim(s.sim, STEP);
    const sim = s.sim;
    const t = Math.max(0, localOf(sim.t));
    const loop = Math.max(0, sim.loop);

    const g = c.getContext('2d');
    const { w, h } = s.size;
    const S = Math.max(w / VW, h / VH);
    const OX = (w - VW * S) / 2;
    const OY = (h - VH * S) / 2;
    // фон рисуется один раз на размер кадра и язык подписей
    const km = tr('км');
    if (!s.bg || s.bgKey !== `${w}x${h}|${km}`) {
      const bg = document.createElement('canvas');
      bg.width = w;
      bg.height = h;
      const bgc = bg.getContext('2d');
      bgc.setTransform(S, 0, 0, S, OX, OY);
      paintStatic(bgc, km);
      s.bg = bg;
      s.bgKey = `${w}x${h}|${km}`;
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.drawImage(s.bg, 0, 0);
    g.setTransform(S, 0, 0, S, OX, OY);

    // скорость по участкам — полоса под дорогой
    const prof = speedProfile(sim);
    prof.forEach((v, i) => {
      const x0 = (i / 8) * VW;
      const val = v == null ? LIMIT.free : v;
      const q = clamp(val / LIMIT.free);
      const col = q > 0.8 ? '74, 222, 128' : q > 0.5 ? '251, 191, 36' : '255, 91, 87';
      g.fillStyle = `rgba(${col}, .75)`;
      g.fillRect(x0 + 2, EDGE.bottom + 22, VW / 8 - 4, 4);
    });

    // камеры на разделителе и сектор обзора
    const detect = t >= SCENARIO.detect && t < SCENARIO.clear;
    for (const [x, y] of CAMS) {
      const hot = detect && x === CAMS[1][0];
      const sector = g.createRadialGradient(x, y, 2, x, y, 150);
      sector.addColorStop(0, hot ? 'rgba(255, 91, 87, .28)' : 'rgba(125, 211, 252, .16)');
      sector.addColorStop(1, 'rgba(125, 211, 252, 0)');
      g.fillStyle = sector;
      g.beginPath(); g.moveTo(x, y); g.arc(x, y, 150, Math.PI * 0.62, Math.PI * 0.98); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x, y); g.arc(x, y, 150, Math.PI * 1.02, Math.PI * 1.38); g.closePath(); g.fill();
      g.fillStyle = '#273041';
      rr(g, x - 7, y - 5, 14, 10, 2.5);
      g.fill();
      g.fillStyle = hot ? '#ff5b57' : '#7dd3fc';
      g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill();
    }

    // порталы: табло и сигналы над полосами
    const vmsOn = t >= SCENARIO.vms && t < SCENARIO.clear;
    const laneOff = closureOn(t);
    for (const [x, kind] of [[VMS_X, 'vms'], [SIGNS_X, 'lcs']]) {
      g.fillStyle = 'rgba(0, 0, 0, .45)';
      g.fillRect(x + 3, MEDIAN[1] - 2, 6, EDGE.bottom + 6 - MEDIAN[1]);
      g.fillStyle = '#3b4557';
      g.fillRect(x, MEDIAN[1] - 4, 5, EDGE.bottom + 6 - MEDIAN[1]);
      if (kind === 'vms') {
        g.fillStyle = vmsOn ? '#3a2a08' : '#111827';
        rr(g, x - 7, EAST[1] - 14, 19, 28, 2.5);
        g.fill();
        g.strokeStyle = vmsOn ? 'rgba(251, 191, 36, .9)' : 'rgba(148, 163, 184, .45)';
        g.lineWidth = 1.4;
        g.stroke();
      } else {
        EAST.forEach((y, i) => {
          const off = laneOff && i === 0;
          g.fillStyle = '#0b0f17';
          rr(g, x - 7, y - 8, 19, 16, 2.5);
          g.fill();
          g.strokeStyle = off ? '#ff5b57' : '#4ade80';
          g.lineWidth = 2;
          g.beginPath();
          if (off) { g.moveTo(x - 2, y - 4); g.lineTo(x + 7, y + 4); g.moveTo(x + 7, y - 4); g.lineTo(x - 2, y + 4); }
          else { g.moveTo(x - 1, y); g.lineTo(x + 7, y); g.moveTo(x + 4, y - 3); g.lineTo(x + 7, y); g.lineTo(x + 4, y + 3); }
          g.stroke();
        });
      }
    }
    // конусы закрытого ряда
    if (laneOff) {
      const k = span(t, SCENARIO.lane, SCENARIO.lane + 1200);
      for (let i = 0; i < 6; i++) {
        if (i / 6 > k) break;
        const x = INC_X - 150 + i * 24;
        const y = MEDIAN[1] + 4 + i * 6.2;
        g.fillStyle = '#fb923c';
        g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 4, y + 3); g.lineTo(x - 4, y + 3); g.closePath(); g.fill();
      }
    }

    for (const car of sim.cars) drawCar(g, car, t);

    // место происшествия
    const inc = sim.inc;
    if (inc && detect) {
      const ph = ((t - SCENARIO.detect) % 1400) / 1400;
      g.strokeStyle = `rgba(255, 91, 87, ${0.9 * (1 - ph)})`;
      g.lineWidth = 2;
      g.beginPath(); g.arc(inc.x, inc.y, 10 + ph * 26, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(255, 91, 87, .95)';
      g.lineWidth = 1.6;
      const bx = inc.x - inc.len / 2 - 5;
      const by = inc.y - inc.wid / 2 - 5;
      g.strokeRect(bx, by, inc.len + 10, inc.wid + 10);
      // линия от камеры к инциденту
      g.setLineDash([3, 4]);
      g.strokeStyle = 'rgba(255, 91, 87, .55)';
      g.beginPath(); g.moveTo(CAMS[1][0], CAMS[1][1]); g.lineTo(inc.x, inc.y); g.stroke();
      g.setLineDash([]);
    }

    // сводка
    const east = sim.cars.filter((k) => k.dir > 0 && k.kind !== 'ems');
    const avg = east.length ? east.reduce((a, k) => a + k.v, 0) / east.length : LIMIT.free;
    const phase = t < SCENARIO.detect ? 'calm' : t < SCENARIO.clear ? 'incident' : t < SCENARIO.calm ? 'closed' : 'calm';
    const steps = STEPS.filter((x) => t >= x.at).length;
    const state = {
      phase,
      steps: phase === 'incident' ? steps : phase === 'closed' ? STEPS.length : 0,
      speed: Math.round((avg * KMH) / 2) * 2,
      flow: 1840 + loop * 24 + Math.floor(sim.passed / 3),
      ems: t >= SCENARIO.ems + 2600 && t < SCENARIO.clear,
      vms: vmsOn,
      limit: t >= SCENARIO.speed && t < SCENARIO.clear + 500 ? 70 : 110,
    };
    const key = JSON.stringify(state);
    if (key !== last.current) { last.current = key; setUi(state); }
  };

  const time = useFrames(awake && !reduced, draw);
  useCanvasSize(canvas, (size) => {
    st.current.size = size;
    draw(time.current);
  });

  const left = (x) => `${(x / VW) * 100}%`;
  const top = (y) => `${(y / VH) * 100}%`;

  return (
    <div ref={root} className="o-scene o-scene--inc" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <canvas ref={canvas} />
      <div className="o-inc__top">
        <div className="o-inc__chip"><i /> {tr('Управление движением')} · {tr('км')} 44–52</div>
        <div className="o-inc__kpi">
          <div className={ui.phase === 'incident' ? 'is-warn' : ''}><b>{ui.speed}</b><span>{tr('км/ч, средняя скорость')}</span></div>
          <div><b>{groupNum(ui.flow)}</b><span>{tr('авт/ч, поток')}</span></div>
        </div>
      </div>
      <div className={`o-inc__card is-${ui.phase}`}>
        {ui.phase === 'calm' ? (
          <div className="o-inc__calm"><i>✓</i> {tr('Происшествий нет')}</div>
        ) : (
          <>
            <div className="o-inc__ct"><i /> {ui.phase === 'closed' ? tr('Инцидент закрыт за 11 минут') : tr('Остановка в левом ряду')}</div>
            <div className="o-inc__cs">{tr('км')} 47+300 · {tr('камера')} 2</div>
          </>
        )}
      </div>
      <div className={`o-inc__steps${ui.phase === 'calm' ? ' is-idle' : ''}`}>
        {STEPS.map((x, i) => (
          <div key={i} className={i < ui.steps ? 'is-on' : ''}><i>✓</i>{x.text()}</div>
        ))}
        <div className={ui.ems || ui.phase === 'closed' ? 'is-on is-ems' : ''}><i>✓</i>{tr('Аварийная служба на месте')}</div>
      </div>
      <div className={`o-inc__vms${ui.vms ? ' is-on' : ''}`} style={{ left: left(VMS_X + 3), top: top(EDGE.bottom + 36) }}>
        {ui.vms ? <><b>{tr('ДТП через 2 км')}</b><span>{tr('Левый ряд закрыт')}</span></> : <><b>{tr('Км 52')} · 6 {tr('мин')}</b><span>{tr('Свободно')}</span></>}
      </div>
      <div className={`o-inc__limit${ui.limit === 70 ? ' is-low' : ''}`} style={{ left: left(SIGNS_X + 3), top: top(EDGE.bottom + 38) }} key={ui.limit}>{ui.limit}</div>
    </div>
  );
}
