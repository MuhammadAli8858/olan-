// ---------------------------------------------------------------------------
// Экстренные службы: тепловизор над местом аварии.
//
// Снимок из презентации — ночной прорыв газопровода, люди и техника в
// тепловом спектре. Кадр чуть «плавает», как с зависшего дрона. Нейросеть
// по очереди находит людей и технику, на очаге загорается температура,
// а режим тепловизора время от времени сменяется на «белый — горячее»:
// по кадру проходит шторка, рамки остаются на местах.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { Img } from '../../lib/img.jsx';
import { useAwake, useBeats, useReducedMotion } from './engine.js';
import './scenes.css';

const DEFAULT_IMAGE = '/products/uav-thermal.jpg';
const PEOPLE = [[48.2, 22.8, 3, 8.5], [52, 22.6, 3.2, 8], [59.8, 25.8, 3.4, 9.5], [53.4, 30.2, 3.8, 9.2], [44.2, 37.8, 3.2, 8.6], [28, 37, 3.4, 9.4], [15.8, 46, 3.4, 9.4]];
const MACHINES = [
  { box: [64, 9.6, 27.5, 18], label: () => tr('Пожарная машина'), below: true },
  { box: [42, 52, 25.5, 38.5], label: () => tr('Спецтехника') },
];
const HOT = [24, 63];

export default function UavThermal({ image = DEFAULT_IMAGE }) {
  const root = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const beat = useBeats(awake, [1600, 2600, 2400, 2800, 3400], { reduced, still: 3 });
  const step = beat % 5;
  // Своё фото не загрузилось — показываем снимок из презентации.
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [image]);
  const photo = !image || failed ? DEFAULT_IMAGE : image;
  const own = photo === DEFAULT_IMAGE;
  const cycle = Math.floor(beat / 5);
  const people = step >= 1 || reduced;
  const machines = step >= 2 || reduced;
  const hot = step >= 3 || reduced;
  const white = step === 4 && !reduced;

  return (
    <div ref={root} className={`o-scene o-scene--th${white ? ' is-white' : ''}`} data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <div className="o-th__stage">
        <div className="o-th__hover">
          <Img src={photo} alt="" sizes="(max-width: 900px) 100vw, 50vw" className="o-th__img" lqip={false}
            {...(own ? null : { onError: () => setFailed(true) })} />
          {own ? <img className="o-th__wh" src="/scenes/thermal-wh.webp" alt="" draggable="false" /> : null}
          {own && people ? PEOPLE.map(([x, y, w, h], i) => (
            <span key={`p${cycle}-${i}`} className="o-th__box is-person" style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, '--i': i }} />
          )) : null}
          {own && machines ? MACHINES.map((m, i) => (
            <span key={`m${cycle}-${i}`} className={`o-th__box is-machine${m.below ? ' is-below' : ''}`} style={{ left: `${m.box[0]}%`, top: `${m.box[1]}%`, width: `${m.box[2]}%`, height: `${m.box[3]}%`, '--i': i }}>
              <em>{m.label()}</em>
            </span>
          )) : null}
          {own && hot ? (
            <span className="o-th__hot" style={{ left: `${HOT[0]}%`, top: `${HOT[1]}%` }} key={`h${cycle}`}>
              <i /><em>+412&nbsp;°C</em>
            </span>
          ) : null}
        </div>
      </div>
      <div className="o-th__cross" />
      <div className="o-th__hud">
        <div className="o-th__mode"><i /> IR · {white ? 'White Hot' : 'Ironbow'}</div>
        <div className="o-th__count">
          <div><b>{people && own ? PEOPLE.length : 0}</b><span>{tr('людей')}</span></div>
          <div><b>{machines && own ? MACHINES.length : 0}</b><span>{tr('единицы техники')}</span></div>
        </div>
        <div className="o-th__scale"><span>+412°</span><i /><span>−4°</span></div>
        <div className="o-th__dfr">
          <span className="is-done">{tr('Вызов 112')}</span>
          <span className="is-done">{tr('Вылет')} 00:40</span>
          <span className={hot ? 'is-done' : ''}>{tr('На месте')} 03:12</span>
        </div>
      </div>
    </div>
  );
}
