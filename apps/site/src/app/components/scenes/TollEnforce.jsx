// ---------------------------------------------------------------------------
// Платный проезд: контроль и антифрод.
//
// Вид сверху, как на схеме из презентации: две полосы и обочина. Портал
// свободного потока проверяет каждую машину — оплаченные проходят
// зелёными. Машина без оплаты помечается жёлтым, а дальше её встречает
// мобильный экипаж на обочине: камера ALPR сканирует поток, нарушитель
// становится красным, и событие уходит в антифрод-платформу. Справа
// сверху — журнал платформы, снизу — сводка за сутки.
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { randomPlate } from '../../lib/plates.js';
import { clamp, groupNum, rng, useAwake, useCanvasSize, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

const ROAD = { top: 40, bottom: 79 };
const LANES = [46.2, 58.6];
const SHOULDER = 71.5;
const GX = 27;
const MX = 70;
const KINDS = { unpaid: () => tr('Неоплаченный проезд'), clone: () => tr('Подмена номера') };
const COLORS = ['#e5e7eb', '#cbd5e1', '#94a3b8', '#f1f5f9', '#1f2937', '#9ca3af', '#dbeafe'];

export default function TollEnforce() {
  const root = useRef(null);
  const canvas = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const st = useRef({ cars: [], next: 200, rand: rng(21), n: 0, checked: 18342, caught: 37 });
  const [log, setLog] = useState(() => [
    { id: -1, plate: '01 A 452 KA UZ', kind: 'unpaid' },
    { id: -2, plate: '486 FTG 04 KZ', kind: 'clone' },
  ]);
  const [stats, setStats] = useState({ checked: 18342, caught: 37 });
  const tags = useRef([]);

  const push = (row) => setLog((list) => [row, ...list].slice(0, 3));

  const draw = (t, dt) => {
    const c = canvas.current;
    const s = st.current;
    if (!c || !s.size) return;
    const ctx = c.getContext('2d');
    const { w, h, dpr } = s.size;
    const X = (v) => (v / 100) * w;
    const Y = (v) => (v / 100) * h;
    ctx.clearRect(0, 0, w, h);
    // земля и дорога
    ctx.fillStyle = '#0e1626';
    ctx.fillRect(0, 0, w, h);
    const road = ctx.createLinearGradient(0, Y(ROAD.top), 0, Y(ROAD.bottom));
    road.addColorStop(0, '#1f2633');
    road.addColorStop(1, '#171d29');
    ctx.fillStyle = road;
    ctx.fillRect(0, Y(ROAD.top), w, Y(ROAD.bottom) - Y(ROAD.top));
    ctx.strokeStyle = 'rgba(226, 232, 240, .55)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath(); ctx.moveTo(0, Y(ROAD.top + 0.6)); ctx.lineTo(w, Y(ROAD.top + 0.6)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, Y(65)); ctx.lineTo(w, Y(65)); ctx.stroke();
    ctx.setLineDash([X(3.2), X(2.4)]);
    ctx.strokeStyle = 'rgba(226, 232, 240, .4)';
    ctx.beginPath(); ctx.moveTo(0, Y(52.4)); ctx.lineTo(w, Y(52.4)); ctx.stroke();
    ctx.setLineDash([]);
    // портал: балка над всеми полосами
    const gp = 0.5 + 0.5 * Math.sin(t / 500);
    ctx.fillStyle = 'rgba(148, 163, 184, .55)';
    ctx.fillRect(X(GX) - 3 * dpr, Y(ROAD.top - 3), 6 * dpr, Y(ROAD.bottom + 3) - Y(ROAD.top - 3));
    [LANES[0], LANES[1], SHOULDER].forEach((ly) => {
      ctx.fillStyle = `rgba(255, 107, 94, ${0.55 + 0.45 * gp})`;
      ctx.beginPath(); ctx.arc(X(GX), Y(ly), 2.6 * dpr, 0, Math.PI * 2); ctx.fill();
    });
    // мобильный экипаж на обочине и его конус сканирования
    const scanA = 0.18 + 0.1 * Math.sin(t / 350);
    const cone = ctx.createLinearGradient(X(MX), Y(SHOULDER), X(MX - 9), Y(LANES[0]));
    cone.addColorStop(0, `rgba(125, 211, 252, ${scanA + 0.2})`);
    cone.addColorStop(1, 'rgba(125, 211, 252, 0)');
    ctx.fillStyle = cone;
    ctx.beginPath(); ctx.moveTo(X(MX - 1), Y(SHOULDER - 1.5)); ctx.lineTo(X(MX - 12), Y(ROAD.top + 1)); ctx.lineTo(X(MX - 1), Y(ROAD.top + 1)); ctx.closePath(); ctx.fill();
    car(ctx, X(MX + 2.5), Y(SHOULDER), X(7.4), Y(4.9), '#1e3a8a', dpr, true, t);
    // машины
    const R = s.rand;
    if (!reduced && t >= s.next) {
      const lane = R() < 0.5 ? 0 : 1;
      const busy = s.cars.some((v) => v.lane === lane && v.x < 8);
      if (!busy) {
        const truck = R() < 0.18;
        const unpaid = R() < 0.24;
        s.cars.push({ lane, x: -10, v: (truck ? 0.0105 : 0.0135) + R() * 0.004, len: truck ? 13 : 7.4, wid: truck ? 6.2 : 4.7, col: truck ? '#e2e8f0' : COLORS[Math.floor(R() * COLORS.length)], unpaid, state: 'new', plate: randomPlate(), id: s.n++ });
      }
      s.next = t + 380 + R() * 900;
    }
    s.cars = s.cars.filter((v) => {
      v.x += v.v * dt;
      if (v.x > 112) return false;
      const y = LANES[v.lane];
      // портал
      if (v.state === 'new' && v.x >= GX) {
        v.state = v.unpaid ? 'flag' : 'paid';
        v.flash = t;
        s.checked += 1;
        if (v.unpaid) { s.dataT = t; }
      }
      // мобильный контроль
      if (v.state === 'flag' && v.x >= MX - 9) {
        v.state = 'caught';
        v.flash = t;
        s.caught += 1;
        s.mobT = t;
        push({ id: v.id, plate: v.plate, kind: v.id % 3 === 0 ? 'clone' : 'unpaid' });
        setStats({ checked: s.checked, caught: s.caught });
      }
      const tone = v.state === 'paid' ? [74, 222, 128] : v.state === 'flag' ? [251, 191, 36] : v.state === 'caught' ? [255, 91, 87] : null;
      if (tone) {
        const k = v.flash ? clamp(1 - (t - v.flash) / 900) : 0;
        ctx.fillStyle = `rgba(${tone.join(',')}, ${0.16 + 0.3 * k})`;
        ctx.beginPath(); ctx.ellipse(X(v.x), Y(y), X(v.len * 0.75), Y(v.wid * 0.8), 0, 0, Math.PI * 2); ctx.fill();
        if (v.state !== 'paid' || k > 0) {
          ctx.strokeStyle = `rgba(${tone.join(',')}, ${v.state === 'paid' ? k : 0.95})`;
          ctx.lineWidth = 1.6 * dpr;
          ctx.strokeRect(X(v.x - v.len / 2 - 0.8), Y(y - v.wid / 2 - 1), X(v.len + 1.6), Y(v.wid + 2));
        }
      }
      car(ctx, X(v.x), Y(y), X(v.len), Y(v.wid), v.col, dpr, false, t);
      return true;
    });
    // данные уходят в антифрод-платформу (вверх, к журналу)
    [[s.dataT, GX], [s.mobT, MX]].forEach(([t0, x0]) => {
      if (!t0) return;
      const p = (t - t0) / 900;
      if (p < 0 || p > 1) return;
      const x = X(x0 + (82 - x0) * p);
      const y = Y(ROAD.top - 2 - (ROAD.top - 18) * p);
      ctx.fillStyle = '#fbbf24';
      ctx.globalAlpha = Math.sin(Math.PI * p);
      ctx.beginPath(); ctx.arc(x, y, 3 * dpr, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });
    // подписи над машинами — HTML-элементы, двигаем без перерисовки React
    tags.current.forEach((el, i) => {
      if (!el) return;
      const v = s.cars.filter((x) => x.state === 'caught' || x.state === 'flag')[i];
      if (!v) { el.style.opacity = '0'; return; }
      el.style.opacity = '1';
      el.style.left = `${v.x}%`;
      el.style.top = `${LANES[v.lane] - v.wid / 2 - 2}%`;
      el.dataset.state = v.state;
      el.textContent = v.state === 'caught' ? `${v.plate} · ${tr('нарушитель')}` : tr('нет оплаты');
    });
  };

  const time = useFrames(awake && !reduced, draw);
  useCanvasSize(canvas, (size) => {
    st.current.size = size;
    if (reduced && !st.current.cars.length) {
      const mk = (lane, x, state, col, unpaid) => ({ lane, x, v: 0, len: 7.4, wid: 4.7, col, unpaid, state, plate: '01 A 452 KA UZ', id: -x });
      st.current.cars.push(mk(0, 14, 'new', '#cbd5e1', false), mk(1, 44, 'paid', '#e5e7eb', false), mk(0, 52, 'flag', '#94a3b8', true), mk(1, 80, 'caught', '#f1f5f9', true));
    }
    draw(time.current, 0);
  });

  return (
    <div ref={root} className="o-scene o-scene--en" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <canvas ref={canvas} />
      {[0, 1].map((i) => <span key={i} ref={(el) => { tags.current[i] = el; }} className="o-en__tag" />)}
      <div className="o-en__labels">
        <span style={{ left: `${GX}%` }}>{tr('Портал MLFF')}</span>
        <span style={{ left: `${MX + 2.5}%` }}>{tr('Мобильный контроль')}</span>
      </div>
      <div className="o-en__panel">
        <div className="o-en__head"><i /> {tr('Антифрод-платформа')}</div>
        <div className="o-en__list">
          {log.length ? log.map((r, i) => (
            <div key={r.id} className={`o-en__row${i ? ' is-old' : ''}`}>
              <b>{r.plate}</b><span>{KINDS[r.kind]()}</span>
            </div>
          )) : <div className="o-en__empty">{tr('Ожидание событий')}</div>}
        </div>
      </div>
      <div className="o-en__stats">
        <div><b>{groupNum(stats.checked)}</b><span>{tr('проездов проверено')}</span></div>
        <div className="is-red"><b>{stats.caught}</b><span>{tr('нарушителей выявлено')}</span></div>
        <div className="is-green"><b>99,6%</b><span>{tr('проездов оплачено')}</span></div>
      </div>
    </div>
  );
}

// Машина сверху: кузов, стекла, фары и стоп-сигналы.
function car(ctx, x, y, len, wid, color, dpr, patrol, t) {
  const r = Math.min(len, wid) * 0.28;
  const x0 = x - len / 2;
  const y0 = y - wid / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, .45)';
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0 + 1.5 * dpr, y0 + 2 * dpr, len, wid, r) : ctx.rect(x0, y0, len, wid); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, len, wid, r) : ctx.rect(x0, y0, len, wid); ctx.fill();
  ctx.fillStyle = 'rgba(15, 23, 42, .78)';
  ctx.fillRect(x0 + len * 0.58, y0 + wid * 0.14, len * 0.16, wid * 0.72);
  ctx.fillRect(x0 + len * 0.16, y0 + wid * 0.18, len * 0.1, wid * 0.64);
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(x0 + len - 2 * dpr, y0 + wid * 0.12, 2 * dpr, wid * 0.18);
  ctx.fillRect(x0 + len - 2 * dpr, y0 + wid * 0.7, 2 * dpr, wid * 0.18);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(x0, y0 + wid * 0.12, 1.6 * dpr, wid * 0.18);
  ctx.fillRect(x0, y0 + wid * 0.7, 1.6 * dpr, wid * 0.18);
  if (patrol) {
    const blink = Math.floor(t / 280) % 2;
    ctx.fillStyle = blink ? '#60a5fa' : '#ef4444';
    ctx.fillRect(x0 + len * 0.38, y0 + wid * 0.2, len * 0.12, wid * 0.6);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.arc(x0 + len * 0.1, y0 + wid * 0.5, Math.min(len, wid) * 0.12, 0, Math.PI * 2); ctx.fill();
  }
}
