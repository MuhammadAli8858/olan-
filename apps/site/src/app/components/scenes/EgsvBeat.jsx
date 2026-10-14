// ---------------------------------------------------------------------------
// ЕГСВ: модуль «Цифровой участковый».
//
// Рабочее место участкового на карте его участка. Смена начинается с
// приёма участка — подпись рисуется прямо на экране. Затем включаются
// слои карты: камеры видеонаблюдения, дома с числом жителей, задания на
// день. Участковый идёт по маршруту к следующему адресу; на месте
// открывается план здания с камерами, задание закрывается, сводка
// справа обновляется.
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { easeInOut, groupNum, span, useAwake, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

const LOOP = 16000;
const STILL = 11600;

// Карта участка в координатах 360×400.
const STREETS = [
  'M -10 92 L 370 84', 'M -10 214 L 370 222', 'M -10 336 L 370 330',
  'M 72 -10 L 64 410', 'M 192 -10 L 196 410', 'M 300 -10 L 310 410',
  'M -10 300 L 150 150 L 260 40',
];
const BLOCKS = [
  [12, 14, 44, 64], [84, 12, 96, 30], [84, 50, 44, 30], [138, 50, 42, 30], [208, 10, 80, 64], [322, 12, 40, 60],
  [12, 108, 42, 92], [86, 104, 94, 46], [86, 160, 40, 44], [140, 160, 42, 44], [210, 98, 80, 46], [210, 156, 82, 52], [324, 96, 40, 112],
  [12, 230, 44, 94], [84, 232, 98, 40], [84, 282, 46, 40], [208, 234, 84, 86], [326, 234, 40, 84],
  [12, 352, 46, 50], [84, 350, 100, 52], [210, 346, 88, 56], [324, 344, 44, 56],
];
const DISTRICT = 'M 30 34 L 288 26 L 300 196 L 312 324 L 168 340 L 36 326 Z';
const CAMERAS = [[100, 92, 0.3], [192, 140, 1.6], [196, 250, -1.4], [72, 260, 0.1], [300, 120, 2.9], [150, 214, 1.5], [250, 222, -1.6], [64, 170, 0.2], [230, 84, 1.7], [310, 300, 3.1]];
const HOUSES = [[106, 120, 124], [160, 176, 86], [236, 116, 212], [104, 248, 57], [248, 270, 143], [34, 150, 96]];
// Задания: координаты метки, номер.
const TASKS = [[150, 66], [250, 180], [110, 300], [262, 300]];
// Маршрут участкового: от опорного пункта к заданию 2, затем к заданию 3.
const ROUTE_A = [[40, 92], [72, 92], [192, 88], [194, 150], [194, 218], [250, 220], [250, 186]];
const ROUTE_B = [[250, 186], [250, 220], [196, 222], [194, 300], [120, 304], [112, 300]];

function along(points, k) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    segs.push(d);
    total += d;
  }
  let left = Math.max(0, Math.min(1, k)) * total;
  for (let i = 0; i < segs.length; i++) {
    if (left <= segs[i] || i === segs.length - 1) {
      const f = segs[i] ? Math.min(1, left / segs[i]) : 0;
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f];
    }
    left -= segs[i];
  }
  return points[points.length - 1];
}

const pathOf = (points) => points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');

// Календарь заданий на неделю: сколько заданий в каждый день, сегодня — среда.
const WEEK = [
  { d: () => tr('Пн'), n: 5 }, { d: () => tr('Вт'), n: 4 }, { d: () => tr('Ср'), n: 4, today: true }, { d: () => tr('Чт'), n: 6 },
  { d: () => tr('Пт'), n: 3 }, { d: () => tr('Сб'), n: 2 }, { d: () => tr('Вс'), n: 0 },
];

const TASK_LIST = [
  { time: '09:30', title: () => tr('Обход дома № 12') },
  { time: '11:00', title: () => tr('Проверка подучётного лица') },
  { time: '14:30', title: () => tr('Встреча с жителями') },
  { time: '16:00', title: () => tr('Профилактическая беседа') },
];

export default function EgsvBeat() {
  const root = useRef(null);
  const cop = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const [ui, setUi] = useState({ step: 0 });
  const last = useRef(-1);

  // Сюжет по шагам:
  // 0 — приём участка, 1 — камеры, 2 — дома, 3 — задания, 4 — идёт к адресу,
  // 5 — на месте: план здания, 6 — задание выполнено, 7 — идёт дальше, 8 — затухание
  const stepAt = (t) => (t < 2500 ? 0 : t < 3200 ? 1 : t < 4000 ? 2 : t < 4800 ? 3 : t < 9800 ? 4 : t < 11000 ? 5 : t < 12000 ? 6 : t < 15300 ? 7 : 8);

  const frame = (time) => {
    const t = reduced ? STILL : time % LOOP;
    let pos;
    if (t < 4800) pos = ROUTE_A[0];
    else if (t < 9800) pos = along(ROUTE_A, easeInOut(span(t, 4800, 9800)));
    else if (t < 12000) pos = ROUTE_A[ROUTE_A.length - 1];
    else pos = along(ROUTE_B, easeInOut(span(t, 12000, 15600)) * 0.85);
    if (cop.current) cop.current.setAttribute('transform', `translate(${pos[0].toFixed(1)} ${pos[1].toFixed(1)})`);
    const step = stepAt(t);
    if (step !== last.current) { last.current = step; setUi({ step }); }
  };
  useFrames(awake && !reduced, frame);

  // Без анимации — спокойный стоп-кадр: участковый на адресе, план здания открыт.
  const step = reduced ? stepAt(STILL) : ui.step;
  const start = reduced ? ROUTE_A[ROUTE_A.length - 1] : ROUTE_A[0];
  const layers = { cams: step >= 1 && step < 8, houses: step >= 2 && step < 8, tasks: step >= 3 && step < 8 };
  const status = (i) => {
    if (i === 0) return 'done';
    if (i === 1) return step >= 6 && step < 8 ? 'done' : step >= 4 && step < 8 ? 'work' : 'plan';
    if (i === 2) return step === 7 ? 'go' : 'plan';
    return 'plan';
  };
  const label = { done: tr('Выполнено'), work: tr('В работе'), go: tr('В пути'), plan: tr('Запланировано') };
  const doneCount = TASK_LIST.reduce((n, _, i) => n + (status(i) === 'done' ? 1 : 0), 0);
  const routeA = pathOf(ROUTE_A);
  const routeB = pathOf(ROUTE_B);

  return (
    <div ref={root} className="o-scene o-scene--beat" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <div className="o-beat__win">
        <div className="o-beat__bar">
          <b>{tr('Цифровой участковый')}</b>
          <span>{tr('Участок №')} 14</span>
          <em className={step >= 4 && step < 8 ? 'is-move' : ''}><i /> {step === 5 || step === 6 ? tr('На адресе') : step >= 4 && step < 8 ? tr('На маршруте') : tr('Опорный пункт')}</em>
        </div>
        <div className="o-beat__body">
          <div className="o-beat__map">
            <div className="o-beat__stage">
              <svg viewBox="0 0 360 400">
                <defs>
                  <radialGradient id="o-beat-park" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#1d4a37" /><stop offset="1" stopColor="#123226" /></radialGradient>
                </defs>
                <rect width="360" height="400" className="o-beat__ground" />
                <path d="M -20 30 C 60 60, 120 -10, 210 -20" className="o-beat__river" />
                <ellipse cx="300" cy="380" rx="70" ry="44" fill="url(#o-beat-park)" opacity=".75" />
                {BLOCKS.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx="5" className="o-beat__block" />)}
                {STREETS.map((d, i) => <path key={i} d={d} className={`o-beat__street${i === 6 ? ' is-ave' : ''}`} />)}
                <path d={DISTRICT} className="o-beat__district" />
                <g className={`o-beat__layer${layers.cams ? ' is-on' : ''}`}>
                  {CAMERAS.map(([x, y, a], i) => (
                    <g key={i} transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI})`}>
                      <g className="o-beat__cam" style={{ '--i': i }}>
                        <path d="M 0 0 L 26 -9 A 28 28 0 0 1 26 9 Z" className="o-beat__cone" />
                        <circle r="3.6" />
                      </g>
                    </g>
                  ))}
                </g>
                <g className={`o-beat__layer${layers.houses ? ' is-on' : ''}`}>
                  {HOUSES.map(([x, y, n], i) => (
                    <g key={i} transform={`translate(${x} ${y})`}>
                      <g className="o-beat__house" style={{ '--i': i }}>
                        <rect x="-15" y="-9" width="30" height="16" rx="8" />
                        <text y="3.2">{n}</text>
                      </g>
                    </g>
                  ))}
                </g>
                <g className={`o-beat__layer${layers.tasks ? ' is-on' : ''}`}>
                  <path d={routeA} className={`o-beat__route${step === 4 ? ' is-on' : ''}`} />
                  <path d={routeB} className={`o-beat__route${step === 7 ? ' is-on' : ''}`} />
                  {TASKS.map(([x, y], i) => (
                    <g key={i} transform={`translate(${x} ${y})`}>
                      <g className={`o-beat__pin is-${status(i)}`} style={{ '--i': i }}>
                        <path d="M 0 0 C -6 -8, -10 -12, -10 -18 A 10 10 0 1 1 10 -18 C 10 -12, 6 -8, 0 0 Z" />
                        <text y="-14.5">{i + 1}</text>
                      </g>
                    </g>
                  ))}
                </g>
                <g ref={cop} transform={`translate(${start[0]} ${start[1]})`} className="o-beat__cop">
                  <circle r="14" className="o-beat__pulse" />
                  <circle r="7.5" />
                  <path d="M 0 -3.6 L 3 -2.4 L 2.6 1.4 L 0 3.4 L -2.6 1.4 L -3 -2.4 Z" />
                </g>
              </svg>
              {step === 5 || step === 6 ? (
                <div className="o-beat__plan" style={{ left: `${(TASKS[1][0] / 360) * 100}%`, top: `${(TASKS[1][1] / 400) * 100}%` }}>
                  <div className="o-beat__pt">{tr('План здания')}</div>
                  <svg viewBox="0 0 120 70">
                    <rect x="2" y="2" width="116" height="66" rx="4" className="o-beat__fp" />
                    <path d="M 40 2 V 40 M 2 40 H 70 M 70 2 V 68 M 70 30 H 118 M 94 30 V 68" className="o-beat__fp" />
                    {[[20, 20, 0.7], [56, 52, -0.6], [100, 14, 2.3]].map(([x, y, a], i) => (
                      <g key={i} transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI})`} className="o-beat__fcam" style={{ '--i': i }}>
                        <path d="M 0 0 L 20 -8 A 22 22 0 0 1 20 8 Z" />
                        <circle r="3" />
                      </g>
                    ))}
                  </svg>
                  <div className="o-beat__ps">{tr('Подъезд 2')} · 3 {tr('камеры')}</div>
                </div>
              ) : null}
            </div>
            <div className="o-beat__chips">
              <span className={layers.cams ? 'is-on' : ''}>{tr('Камеры')}</span>
              <span className={layers.houses ? 'is-on' : ''}>{tr('Жители')}</span>
              <span className={layers.tasks ? 'is-on' : ''}>{tr('Задания')}</span>
            </div>
            {step === 0 ? (
              <div className="o-beat__sign">
                <div className="o-beat__st">{tr('Приём участка')}</div>
                <div className="o-beat__ss">{tr('Смена')} 09:00 · {tr('участковый инспектор')}</div>
                <svg viewBox="0 0 200 60" className="o-beat__pad">
                  <path d="M 10 42 C 22 18, 30 14, 34 30 C 37 44, 42 46, 50 26 C 56 12, 60 16, 62 34 C 64 48, 72 44, 80 30 C 86 20, 92 22, 96 32 C 100 42, 108 40, 116 28 C 122 20, 130 24, 136 34 L 190 30" />
                </svg>
                <div className="o-beat__ok"><i>✓</i> {tr('Подписано')}</div>
              </div>
            ) : null}
          </div>
          <div className="o-beat__side">
            <div className="o-beat__kpi">
              <div><span>{tr('Жители')}</span><b>{groupNum(3214)}</b></div>
              <div><span>{tr('Камеры')}</span><b>48</b></div>
              <div className="is-done"><span>{tr('Выполнено')}</span><b>{doneCount} / {TASK_LIST.length}</b><i style={{ '--k': doneCount / TASK_LIST.length }} /></div>
            </div>
            <div className="o-beat__lt">{tr('Задания на сегодня')}</div>
            <div className="o-beat__tasks">
              {TASK_LIST.map((task, i) => {
                const st = status(i);
                return (
                  <div key={i} className={`o-beat__task is-${st}`}>
                    <span className="o-beat__n">{i + 1}</span>
                    <div><b>{task.title()}</b><em>{task.time} · {label[st]}</em></div>
                  </div>
                );
              })}
            </div>
            <div className="o-beat__week">
              {WEEK.map((day, i) => (
                <div key={i} className={day.today ? 'is-today' : ''}>
                  <span>{day.d()}</span>
                  <i style={{ '--n': day.n / 6, '--k': day.today ? doneCount / TASK_LIST.length : i < 2 ? 1 : 0 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
