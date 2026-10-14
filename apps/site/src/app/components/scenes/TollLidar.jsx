// ---------------------------------------------------------------------------
// Рубеж свободного потока в разрезе: как портал «видит» машину.
//
// Вид сбоку, как на схеме из презентации. Под порталом проезжают машины
// разных классов. Два луча LIDAR ощупывают кузов — на нём срез за срезом
// проступает облако точек. Камера ANPR вспыхивает и читает номер. Когда
// машина целиком прошла рубеж, появляются размерные линии, а карточка
// справа собирает класс: длину, высоту, число осей и скорость.
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { clamp, easeInOut, easeOut, lerp, smooth, useAwake, useCanvasSize, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

const ROAD_M = 34; // ширина сцены в метрах
const GX = 9.5; // портал
const BEAMS = [GX - 2.1, GX + 2.1];
const HEAD = 6.3;

// Профили кузовов: точки контура (м), колёса, размеры для карточки.
const VEHICLES = [
  { k: 'truck', label: () => tr('грузовой, 5 осей'), cls: 4, L: 16.5, H: 4.0, kmh: 84, plate: '01 A 452 KA UZ',
    body: [[0, 1.1], [0, 4.0], [13.4, 4.0], [13.4, 1.1]], cab: [[13.0, 0.45], [13.0, 3.55], [13.6, 3.7], [15.6, 3.72], [16.2, 2.9], [16.5, 2.4], [16.5, 0.45]],
    wheels: [[1.0, 0.52], [2.25, 0.52], [3.5, 0.52], [12.1, 0.52], [15.3, 0.52]] },
  { k: 'car', label: () => tr('легковой'), cls: 1, L: 4.7, H: 1.46, kmh: 112, plate: '10 R 784 BC UZ',
    body: [[0, 0.32], [0, 0.88], [0.45, 0.98], [1.25, 1.05], [1.85, 1.43], [3.05, 1.46], [3.72, 1.02], [4.52, 0.9], [4.7, 0.62], [4.7, 0.32]],
    wheels: [[0.98, 0.33], [3.7, 0.33]] },
  { k: 'bus', label: () => tr('автобус'), cls: 3, L: 12.0, H: 3.25, kmh: 92, plate: '30 B 221 AA UZ',
    body: [[0, 0.35], [0, 3.0], [0.25, 3.25], [11.55, 3.25], [12.0, 2.95], [12.0, 0.35]],
    wheels: [[2.7, 0.5], [9.5, 0.5]] },
  { k: 'van', label: () => tr('фургон'), cls: 2, L: 5.6, H: 2.55, kmh: 101, plate: '40 X 318 MA UZ',
    body: [[0, 0.36], [0, 2.4], [0.22, 2.55], [4.25, 2.55], [4.95, 1.62], [5.6, 1.4], [5.6, 0.36]],
    wheels: [[1.15, 0.37], [4.45, 0.37]] },
];
const SPEED = 6.2; // м/с в «замедленной съёмке»

// Верхняя точка кузова на расстоянии x от задней части.
function topAt(v, x) {
  let best = 0;
  for (const poly of [v.body, v.cab].filter(Boolean)) {
    for (let i = 0; i < poly.length - 1; i++) {
      const [x1, y1] = poly[i]; const [x2, y2] = poly[i + 1];
      if ((x >= x1 && x <= x2) || (x >= x2 && x <= x1)) {
        const y = x1 === x2 ? Math.max(y1, y2) : y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
        if (y > best) best = y;
      }
    }
  }
  return best;
}
function bottomAt(v, x) {
  if (v.cab && x >= v.cab[0][0]) return v.k === 'truck' && x < 13.4 ? 1.1 : 0.45;
  return v.body[0][1];
}

export default function TollLidar() {
  const root = useRef(null);
  const canvas = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const st = useRef({ n: 0, x: -VEHICLES[0].L - 2, cloud: [], done: false, flash: -1e9, lastScan: {} });
  const [card, setCard] = useState({ n: 0, ready: false });
  const words = { m: tr('м') };

  const draw = (t, dt) => {
    const c = canvas.current;
    const s = st.current;
    if (!c || !s.size) return;
    const ctx = c.getContext('2d');
    const { w, h, dpr } = s.size;
    const k = w / ROAD_M;
    const ground = h * 0.8;
    const X = (m) => m * k;
    const Y = (m) => ground - m * k;
    const v = VEHICLES[s.n % VEHICLES.length];
    // Движение машины; в «стоп-кадре» — машина целиком прошла рубеж.
    if (reduced) {
      s.x = BEAMS[1] + 0.6;
      if (!s.cloud.length) {
        for (let x = 0; x <= v.L; x += 0.22) {
          const top = topAt(v, x);
          for (let y = top; y >= bottomAt(v, x); y -= 0.24) s.cloud.push({ x, y, a: y === top ? 1 : 0.55, t: -1e9 });
        }
      }
    } else {
      // После замера машина «замирает» на пару секунд — показать размеры, — и уезжает.
      let mult = 1;
      if (s.done) {
        const e = t - s.doneT;
        mult = e < 2600 ? lerp(1, 0.16, smooth(e / 700)) : lerp(0.16, 1.7, smooth((e - 2600) / 1100));
      }
      s.x += (SPEED * mult * dt) / 1000;
    }
    const rear = s.x;
    const front = s.x + v.L;
    // Новая машина, когда прежняя уехала за край.
    if (!reduced && rear > ROAD_M + 1) {
      s.n += 1;
      const nv = VEHICLES[s.n % VEHICLES.length];
      s.x = -nv.L - 3;
      s.cloud = [];
      s.lastScan = {};
      s.done = false;
      s.plate = false;
      setCard({ n: s.n, ready: false });
      return;
    }
    ctx.clearRect(0, 0, w, h);
    // Сетка-чертёж.
    ctx.strokeStyle = 'rgba(120, 160, 230, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let m = 0; m <= ROAD_M; m += 1) { ctx.moveTo(X(m), 0); ctx.lineTo(X(m), h); }
    for (let m = -4; m <= 12; m += 1) { ctx.moveTo(0, Y(m)); ctx.lineTo(w, Y(m)); }
    ctx.stroke();
    // Дорога.
    const road = ctx.createLinearGradient(0, ground, 0, h);
    road.addColorStop(0, 'rgba(70, 90, 130, 0.45)');
    road.addColorStop(1, 'rgba(20, 28, 45, 0)');
    ctx.fillStyle = road;
    ctx.fillRect(0, ground, w, h - ground);
    ctx.strokeStyle = 'rgba(160, 190, 240, 0.55)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath(); ctx.moveTo(0, ground); ctx.lineTo(w, ground); ctx.stroke();
    ctx.setLineDash([X(1.6), X(1.4)]);
    ctx.strokeStyle = 'rgba(220, 230, 250, 0.25)';
    ctx.beginPath(); ctx.moveTo(0, ground + X(0.55)); ctx.lineTo(w, ground + X(0.55)); ctx.stroke();
    ctx.setLineDash([]);
    // Портал: стойка и голова с датчиками.
    ctx.fillStyle = 'rgba(150, 175, 215, 0.22)';
    ctx.fillRect(X(GX) - X(0.18), Y(HEAD + 0.4), X(0.36), ground - Y(HEAD + 0.4));
    ctx.fillStyle = 'rgba(150, 175, 215, 0.34)';
    ctx.fillRect(X(GX - 2.9), Y(HEAD + 0.75), X(5.8), X(0.45));
    // Лучи LIDAR: веер и бегущая линия, которая упирается в кузов.
    BEAMS.forEach((bx, i) => {
      const hx = X(GX + (i ? 0.55 : -0.55));
      const hy = Y(HEAD);
      const sweep = Math.sin(t / 260 + i * 1.3) * 0.38;
      const fan = ctx.createLinearGradient(hx, hy, X(bx), ground);
      fan.addColorStop(0, 'rgba(125, 211, 252, 0.35)');
      fan.addColorStop(1, 'rgba(125, 211, 252, 0.03)');
      ctx.fillStyle = fan;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(X(bx - 0.55), ground); ctx.lineTo(X(bx + 0.55), ground); ctx.closePath(); ctx.fill();
      const lx = bx + sweep;
      const local = lx - rear;
      const hit = local >= 0 && local <= v.L ? topAt(v, local) : 0;
      ctx.strokeStyle = 'rgba(170, 230, 255, 0.95)';
      ctx.lineWidth = 1.4 * dpr;
      ctx.shadowColor = 'rgba(125, 211, 252, 1)';
      ctx.shadowBlur = 8 * dpr;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(X(lx), Y(hit)); ctx.stroke();
      ctx.beginPath(); ctx.arc(X(lx), Y(hit), 2.4 * dpr, 0, Math.PI * 2); ctx.fillStyle = '#e0f6ff'; ctx.fill();
      ctx.shadowBlur = 0;
      // Срез кузова в облако точек.
      if (hit > 0) {
        const slot = Math.round(local / 0.22);
        const key = `${i}:${slot}`;
        if (!reduced && !s.lastScan[key]) {
          s.lastScan[key] = 1;
          const bottom = bottomAt(v, local);
          for (let y = hit; y >= bottom; y -= 0.24) s.cloud.push({ x: slot * 0.22, y, a: y === hit ? 1 : 0.55, t });
        }
      }
    });
    // Головы датчиков.
    [[-0.55, '#7dd3fc'], [0.55, '#7dd3fc'], [0, '#ff6b5e']].forEach(([dx, col]) => {
      ctx.fillStyle = '#18233a';
      ctx.fillRect(X(GX + dx) - X(0.22), Y(HEAD + 0.32), X(0.44), X(0.36));
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(X(GX + dx), Y(HEAD + 0.05), 1.8 * dpr, 0, Math.PI * 2); ctx.fill();
    });
    // Машина.
    const shape = (poly) => {
      ctx.beginPath();
      poly.forEach(([px, py], j) => (j ? ctx.lineTo(X(rear + px), Y(py)) : ctx.moveTo(X(rear + px), Y(py))));
      ctx.closePath();
    };
    [v.body, v.cab].filter(Boolean).forEach((poly) => {
      shape(poly);
      const body = ctx.createLinearGradient(0, Y(v.H), 0, ground);
      body.addColorStop(0, 'rgba(46, 60, 88, 0.95)');
      body.addColorStop(1, 'rgba(22, 30, 46, 0.95)');
      ctx.fillStyle = body;
      ctx.fill();
      ctx.strokeStyle = 'rgba(160, 190, 240, 0.35)';
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();
    });
    const spin = (rear * 2.4) % (Math.PI * 2);
    v.wheels.forEach(([wx, r]) => {
      const cx = X(rear + wx); const cy = Y(r);
      ctx.fillStyle = '#0b1019'; ctx.beginPath(); ctx.arc(cx, cy, X(r), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(160, 190, 240, 0.5)'; ctx.lineWidth = 1 * dpr; ctx.stroke();
      ctx.strokeStyle = 'rgba(160, 190, 240, 0.35)';
      ctx.beginPath();
      for (let a = 0; a < 3; a++) {
        const ang = spin + (a * Math.PI * 2) / 3;
        ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * X(r * 0.75), cy + Math.sin(ang) * X(r * 0.75));
      }
      ctx.stroke();
    });
    // Облако точек на кузове.
    ctx.globalCompositeOperation = 'lighter';
    s.cloud.forEach((p) => {
      const age = clamp((t - p.t) / 500);
      ctx.globalAlpha = p.a * (0.35 + 0.65 * easeOut(age));
      ctx.fillStyle = p.a === 1 ? '#c6f0ff' : '#5fb8ff';
      ctx.beginPath(); ctx.arc(X(rear + p.x), Y(p.y), (p.a === 1 ? 1.7 : 1.15) * dpr, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Камера ANPR читает номер, когда перед машины подходит к порталу.
    if (!s.plate && front >= GX - 1.2) { s.plate = true; s.flash = t; }
    const fl = clamp(1 - (t - s.flash) / 450);
    if (fl > 0) {
      const g = ctx.createRadialGradient(X(GX), Y(HEAD), 0, X(GX), Y(HEAD), X(4.5));
      g.addColorStop(0, `rgba(255, 255, 255, ${0.7 * fl})`);
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(X(GX - 4.5), Y(HEAD + 4.5), X(9), X(9));
    }
    // Машина прошла оба луча — показываем размеры и класс.
    if (!s.done && rear > BEAMS[1] + 0.4) { s.done = true; s.doneT = t; setCard({ n: s.n, ready: true }); }
    if (s.done || reduced) {
      const p = reduced ? 1 : easeInOut(clamp((t - s.doneT) / 900));
      const top = Y(v.H + 0.55);
      ctx.strokeStyle = `rgba(251, 191, 36, ${0.9 * p})`;
      ctx.fillStyle = `rgba(251, 191, 36, ${0.9 * p})`;
      ctx.lineWidth = 1.2 * dpr;
      const x0 = X(rear); const x1 = X(rear + v.L * p);
      ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x1, top); ctx.moveTo(x0, top - 5 * dpr); ctx.lineTo(x0, top + 5 * dpr);
      if (p > 0.98) { ctx.moveTo(x1, top - 5 * dpr); ctx.lineTo(x1, top + 5 * dpr); }
      ctx.stroke();
      const hx = X(front + 0.6);
      ctx.beginPath(); ctx.moveTo(hx, ground); ctx.lineTo(hx, ground - (ground - Y(v.H)) * p); ctx.moveTo(hx - 5 * dpr, Y(v.H)); ctx.lineTo(hx + 5 * dpr, Y(v.H)); ctx.stroke();
      ctx.font = `600 ${Math.round(11 * dpr)}px Onest, system-ui, sans-serif`;
      ctx.globalAlpha = p;
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${v.L.toFixed(1).replace('.', ',')} ${words.m}`, (x0 + X(rear + v.L)) / 2 - 18 * dpr, top - 4 * dpr);
      ctx.textBaseline = 'middle';
      ctx.fillText(`${v.H.toFixed(1).replace('.', ',')} ${words.m}`, hx + 7 * dpr, (ground + Y(v.H)) / 2);
      ctx.globalAlpha = 1;
      // Номера осей под колёсами.
      v.wheels.forEach(([wx], j) => {
        ctx.globalAlpha = clamp(p * 1.4 - j * 0.12);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.arc(X(rear + wx), ground + 9 * dpr, 6.5 * dpr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1205';
        ctx.textAlign = 'center';
        ctx.font = `700 ${Math.round(8.5 * dpr)}px Onest, system-ui, sans-serif`;
        ctx.fillText(String(j + 1), X(rear + wx), ground + 9.5 * dpr);
        ctx.textAlign = 'start';
      });
      ctx.globalAlpha = 1;
    }
  };

  const time = useFrames(awake && !reduced, draw);
  useCanvasSize(canvas, (size) => { st.current.size = size; draw(time.current, 0); });
  const v = VEHICLES[card.n % VEHICLES.length];
  const ready = card.ready || reduced;

  return (
    <div ref={root} className="o-scene o-scene--ld" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <canvas ref={canvas} />
      <div className="o-ld__tags">
        <span><i className="is-l" /> {tr('LIDAR · 2 луча')}</span>
        <span><i className="is-a" /> ANPR</span>
        <span><i className="is-r" /> DSRC / RFID</span>
      </div>
      <div className={`o-ld__card${ready ? ' is-ready' : ''}`} key={card.n}>
        <div className="o-ld__title">{tr('Классификация ТС')}</div>
        <div className="o-ld__plate">{v.plate}</div>
        <dl>
          <div><dt>{tr('Длина')}</dt><dd>{v.L.toFixed(1).replace('.', ',')} {tr('м')}</dd></div>
          <div><dt>{tr('Высота')}</dt><dd>{v.H.toFixed(1).replace('.', ',')} {tr('м')}</dd></div>
          <div><dt>{tr('Оси')}</dt><dd>{v.wheels.length}</dd></div>
          <div><dt>{tr('Скорость')}</dt><dd>{v.kmh} {tr('км/ч')}</dd></div>
        </dl>
        <div className="o-ld__class"><b>{tr('Класс')} {v.cls}</b><span>{v.label()}</span></div>
      </div>
    </div>
  );
}
