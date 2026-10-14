// ---------------------------------------------------------------------------
// БПЛА: отчёт по миссии и учёт парка.
//
// Платформа сама собирает отчёт после полёта: сведения о миссии, карта
// обследованного участка с маршрутом и находками, реестр инцидентов по
// статусам — и заверяет его электронной подписью. Справа — парк: налёт
// каждого аппарата и сколько осталось до планового ТО. После миссии
// налёт самолёта растёт, а отчёт уходит диспетчеру и руководителю.
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { span, useAwake, useClock, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

const LOOP = 15000;
const STILL = 11200;
// Шаги сюжета: [время, номер шага]
const MARKS = [0, 500, 900, 1300, 1700, 2100, 2700, 3300, 3900, 4500, 5100, 5700, 6300, 6900, 7500, 8100, 8700, 9500, 10200, 13600];
// Маршрут облёта «змейкой» и находки на карте отчёта (координаты 200×110).
const AREA = 'M 18 20 L 176 12 L 186 92 L 30 100 Z';
const ROUTE = 'M 26 26 L 174 18 L 176 32 L 28 40 L 30 54 L 178 46 L 180 60 L 30 68 L 32 82 L 182 74 L 184 88 L 34 96';
const FINDS = [
  { x: 64, y: 30, s: 'ok', type: () => tr('Врезка'), at: '41.3123, 69.2797' },
  { x: 132, y: 47, s: 'check', type: () => tr('Земляные работы'), at: '41.3109, 69.2884' },
  { x: 92, y: 64, s: 'fixed', type: () => tr('Протечка'), at: '41.3098, 69.2831' },
  { x: 154, y: 80, s: 'ok', type: () => tr('Следы техники'), at: '41.3081, 69.2915' },
  { x: 48, y: 88, s: 'check', type: () => tr('Возгорание'), at: '41.3074, 69.2766' },
];
const STATUS = { ok: () => tr('Подтверждён'), check: () => tr('На проверке'), fixed: () => tr('Устранён') };
const FLEET = [
  { name: () => tr('Самолёт, катапульта'), hours: 186.4, add: 2.8, service: 200 },
  { name: () => tr('Самолёт, с руки'), hours: 141.2, add: 0, service: 150 },
  { name: () => tr('Мультикоптер'), hours: 77.5, add: 0, service: 100 },
];

const stepOf = (t) => {
  let s = 0;
  while (s + 1 < MARKS.length && t >= MARKS[s + 1]) s += 1;
  return s;
};

export default function UavReport() {
  const root = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const clock = useClock(awake);
  const [step, setStep] = useState(0);
  const last = useRef(-1);
  useFrames(awake && !reduced, (time) => {
    const s = stepOf(time % LOOP);
    if (s !== last.current) { last.current = s; setStep(s); }
  });
  const k = reduced ? stepOf(STILL) : step;
  // что уже на странице
  const page = k >= 1 && k < 19;
  const info = Math.max(0, Math.min(4, k - 1));
  const route = k >= 6;
  const finds = Math.max(0, Math.min(FINDS.length, k - 6));
  const rows = Math.max(0, Math.min(FINDS.length, k - 11));
  const signed = k >= 17;
  const sent = k >= 18;
  const fields = [
    [tr('БПЛА'), tr('самолёт, старт с катапульты')],
    [tr('Длительность'), `2 ${tr('ч')} 46 ${tr('мин')}`],
    [tr('Высота полёта'), `350 ${tr('м')}`],
    [tr('Взлёты / посадки'), '1 / 1'],
  ];
  const counts = FINDS.slice(0, rows).reduce((m, f) => ({ ...m, [f.s]: (m[f.s] || 0) + 1 }), {});

  return (
    <div ref={root} className="o-scene o-scene--rep" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <div className={`o-rep__doc${page ? ' is-on' : ''}`}>
        <div className="o-rep__head">
          <div>
            <small>OLAN · {tr('мониторинг инфраструктуры')}</small>
            <b>{tr('Отчёт по миссии')} № 0427</b>
          </div>
          <em>{clock.date}</em>
        </div>
        <div className="o-rep__info">
          {fields.map(([label, value], i) => (
            <div key={label} className={i < info ? 'is-on' : ''}><span>{label}</span><b>{value}</b></div>
          ))}
        </div>
        <div className="o-rep__map">
          <svg viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice">
            <rect width="200" height="110" className="o-rep__land" />
            <path d="M -5 70 C 40 60, 80 84, 120 66 S 180 40, 210 48" className="o-rep__pipe" />
            <path d={AREA} className="o-rep__area" />
            <path d={ROUTE} className={`o-rep__route${route ? ' is-on' : ''}`} pathLength="1" />
            {FINDS.map((f, i) => (
              <g key={i} transform={`translate(${f.x} ${f.y})`}>
                <g className={`o-rep__find is-${f.s}${i < finds ? ' is-on' : ''}`}>
                  <circle r="6" />
                  <text y="2.4">{i + 1}</text>
                </g>
              </g>
            ))}
          </svg>
        </div>
        <div className="o-rep__table">
          <div className="o-rep__th"><span>№</span><span>{tr('Инцидент')}</span><span>{tr('Координаты')}</span><span>{tr('Статус')}</span></div>
          {FINDS.map((f, i) => (
            <div key={i} className={`o-rep__tr is-${f.s}${i < rows ? ' is-on' : ''}`}>
              <span>{i + 1}</span><span>{f.type()}</span><span>{f.at}</span><span><i />{STATUS[f.s]()}</span>
            </div>
          ))}
        </div>
        <div className="o-rep__foot">
          <span>{tr('Подтверждено')} {counts.ok || 0} · {tr('на проверке')} {counts.check || 0} · {tr('устранено')} {counts.fixed || 0}</span>
          <div className={`o-rep__stamp${signed ? ' is-on' : ''}`}><b>{tr('ЭЦП')}</b><span>{tr('подписано')}</span></div>
        </div>
      </div>
      <div className="o-rep__side">
        <div className="o-rep__st">{tr('Парк БПЛА')}</div>
        {FLEET.map((a, i) => {
          const hours = a.hours + (sent ? a.add : 0);
          const left = Math.max(0, a.service - hours);
          return (
            <div key={i} className={`o-rep__craft${i === 0 && sent ? ' is-hot' : ''}${left < 12 ? ' is-soon' : ''}`}>
              <b>{a.name()}</b>
              <div className="o-rep__bar"><i style={{ '--k': Math.min(1, hours / a.service) }} /></div>
              <span>{hours.toFixed(1).replace('.', ',')} {tr('ч налёта')} · {tr('ТО через')} {left.toFixed(0)} {tr('ч')}</span>
            </div>
          );
        })}
        <div className={`o-rep__sent${sent ? ' is-on' : ''}`}>
          <div className="o-rep__st">{tr('Отчёт отправлен')}</div>
          <span><i>✓</i> {tr('Диспетчер')}</span>
          <span><i>✓</i> {tr('Руководитель проекта')}</span>
          <span><i>✓</i> {tr('Наземная группа')}</span>
        </div>
      </div>
      <i className="o-rep__progress" style={{ '--p': span(k, 0, 18) }} />
    </div>
  );
}
