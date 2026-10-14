// ---------------------------------------------------------------------------
// Нейросеть на видео с борта.
//
// Кадр из презентации (облёт района, город и железная дорога); старые
// рамки распознавания с фото убраны. По кадру проходит луч анализа, и
// там, где он прошёл, нейросеть одна за другой «находит» машины, автобус
// и поезд. Затем оператор берёт одну машину на сопровождение: вокруг неё
// встаёт прицел, а вперёд по дороге тянется прогноз траектории.
// ---------------------------------------------------------------------------
import { useRef } from 'react';
import { tr } from '../../lib/i18n.js';
import { useAwake, useBeats, useReducedMotion } from './engine.js';
import './scenes.css';

const BOXES = [
  { b: [47.3, 68.2, 4.8, 6], l: () => tr('Автомобиль'), p: 97 },
  { b: [35.3, 80.8, 5, 6.4], l: () => tr('Автомобиль'), p: 95 },
  { b: [38.3, 85.2, 5.4, 6.6], l: () => tr('Автомобиль'), p: 96 },
  { b: [56.8, 47.6, 4, 5], l: () => tr('Автомобиль'), p: 93 },
  { b: [47.6, 36.4, 6.6, 6.8], l: () => tr('Автобус'), p: 91 },
  { b: [67.4, 27.6, 7.8, 19], l: () => tr('Поезд'), p: 99 },
  { b: [44.2, 28, 6.4, 7.4], l: () => tr('Парковка'), p: 88 },
  { b: [88.2, 27.8, 2.8, 2.8] }, { b: [81.6, 32.6, 2.6, 2.4] }, { b: [86.4, 34.6, 2.4, 2.4] }, { b: [78.6, 43, 2.8, 2.8] },
];

export default function UavDetect() {
  const root = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const beat = useBeats(awake, [2600, 2400, 3600, 1600], { reduced, still: 2 });
  const step = beat % 4;
  const cycle = Math.floor(beat / 4);
  const boxes = step >= 1 || reduced;
  const lock = step === 2 || reduced;
  const leaving = step === 3;

  return (
    <div ref={root} className={`o-scene o-scene--dt is-s${step}`} data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <div className="o-dt__stage">
        <div className="o-dt__drift">
          <img src="/scenes/ai-clean.webp" alt="" draggable="false" className="o-dt__img" />
          {boxes ? BOXES.map((x, i) => (
            <span key={`${cycle}-${i}`} className={`o-dt__box${x.l ? '' : ' is-small'}${leaving ? ' is-out' : ''}`}
              style={{ left: `${x.b[0]}%`, top: `${x.b[1]}%`, width: `${x.b[2]}%`, height: `${x.b[3]}%`, '--d': `${(x.b[0] / 100) * 0.9 + (i % 3) * 0.08}s` }}>
              {x.l ? <em>{x.l()} {x.p}%</em> : null}
            </span>
          )) : null}
          {lock ? (
            <>
              <svg className="o-dt__track" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M 49.7 71.2 C 52.4 67.6, 55.4 63.9, 58.6 60.4" /></svg>
              <span className="o-dt__lock" style={{ left: '49.7%', top: '71.2%' }} key={`l${cycle}`}>
                <i /><b>ID 0417 · {tr('сопровождение')}</b>
              </span>
            </>
          ) : null}
        </div>
      </div>
      {step === 0 && !reduced ? <div className="o-dt__sweep" key={`s${cycle}`} /> : null}
      <div className="o-dt__hud">
        <div className="o-dt__live"><i /> LIVE · {tr('ИИ на видео с БПЛА')}</div>
        <div className="o-dt__stats">
          <div><b>{boxes ? 23 : 0}</b><span>{tr('объектов')}</span></div>
          <div><b>{boxes ? 19 : 0}</b><span>{tr('авто')}</span></div>
          <div><b>{lock ? 1 : 0}</b><span>{tr('на сопровождении')}</span></div>
        </div>
        <div className="o-dt__data"><i>+</i> {tr('12 кадров размечено для обучения')}</div>
      </div>
    </div>
  );
}
