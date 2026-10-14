// ---------------------------------------------------------------------------
// Мультикоптер для наблюдения: зависание над ночным городом.
//
// Шестироторный аппарат из каталога: с фото убраны неподвижные лопасти, а
// поверх моторов крутятся «размытые диски» винтов — как на настоящей съёмке
// с короткой выдержкой. Аппарат держит точку, слегка покачиваясь; камера
// под ним ведёт луч наблюдения по земле, антенна ретранслятора расходится
// кольцами, а рядом по очереди подсвечиваются ключевые характеристики.
// ---------------------------------------------------------------------------
import { useRef } from 'react';
import { tr } from '../../lib/i18n.js';
import { useAwake, useBeats, useReducedMotion } from './engine.js';
import './scenes.css';

// Моторы на снимке (в % кадра снимка) и размер диска винта.
const ROTORS = [
  [51.3, 3.4, 9.5], [19.8, 14.4, 10], [85.1, 18.8, 10],
  [2.8, 51.4, 11.5], [96.3, 61.8, 12], [47.6, 92.4, 14.5],
];
const FACTS = [
  { v: '60', u: () => tr('мин'), l: () => tr('в воздухе при полной загрузке') },
  { v: '12', u: () => tr('км'), l: () => tr('радиус управления') },
  { v: '70', u: () => tr('км/ч'), l: () => tr('максимальная скорость') },
  { v: '30–1000', u: () => tr('м'), l: () => tr('рабочая высота') },
];
const LIGHTS = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 37) % 100, y: 74 + ((i * 53) % 24), r: 0.6 + ((i * 7) % 5) * 0.35, d: (i * 0.37) % 4, c: i % 4 === 0 ? 'w' : i % 3 === 0 ? 'b' : 'a',
}));

export default function UavHover() {
  const root = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const beat = useBeats(awake, [2600], { reduced, still: 0 });
  const fact = beat % FACTS.length;

  return (
    <div ref={root} className="o-scene o-scene--hv" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <div className="o-hv__city">
        {LIGHTS.map((l, i) => (
          <i key={i} className={`is-${l.c}`} style={{ left: `${l.x}%`, top: `${l.y}%`, width: `${l.r}%`, '--d': `${l.d}s` }} />
        ))}
      </div>
      <div className="o-hv__beam" />
      <div className="o-hv__craft">
        <div className="o-hv__float">
          <span className="o-hv__relay"><i /><i /><i /></span>
          <img src="/scenes/hover-copter.webp" alt="" draggable="false" />
          {ROTORS.map(([x, y, r], i) => (
            <span key={i} className={`o-hv__rotor${i % 2 ? ' is-ccw' : ''}`} style={{ left: `${x}%`, top: `${y}%`, width: `${r * 2}%`, '--d': `${-(i * 0.037).toFixed(3)}s` }}>
              <i />
            </span>
          ))}
          <span className="o-hv__nav is-l" />
          <span className="o-hv__nav is-r" />
        </div>
      </div>
      <div className="o-hv__facts">
        {FACTS.map((f, i) => (
          <div key={f.v} className={`o-hv__fact${i === fact ? ' is-on' : ''}`}>
            <b>{f.v}<small> {f.u()}</small></b>
            <span>{f.l()}</span>
          </div>
        ))}
      </div>
      <div className="o-hv__tag"><i /> {tr('Видеонаблюдение и ретрансляция')}</div>
    </div>
  );
}
