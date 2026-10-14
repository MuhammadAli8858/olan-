// ---------------------------------------------------------------------------
// Аэрофотосъёмка: самолётный БПЛА в полёте.
//
// Фон и аппарат — с обложки каталога: косая аэросъёмка полей и посёлков,
// над ними самолёт-беспилотник. Камера медленно «летит» вслед за ним к
// горизонту, у горизонта тянутся дальние облака, а ближние перистые
// проносятся мимо. Аппарат мягко покачивается на потоке, каждые полторы
// секунды на земле вспыхивает рамка кадра — и счётчик снимков растёт.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { groupNum, useAwake, useBeats, useReducedMotion } from './engine.js';
import './scenes.css';

const SHOT_MS = 1500;

function useFlightClock(awake, start = 4350) {
  const [sec, setSec] = useState(start);
  useEffect(() => {
    if (!awake) return undefined;
    const id = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [awake]);
  const p = (n) => String(n).padStart(2, '0');
  return { sec, text: `${Math.floor(sec / 3600)}:${p(Math.floor(sec / 60) % 60)}:${p(sec % 60)}` };
}

export default function UavFlight() {
  const root = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const shot = useBeats(awake, [SHOT_MS], { reduced, still: 0 });
  const clock = useFlightClock(awake && !reduced);
  const photos = 1284 + shot;
  const km = Math.min(200, 118 + (clock.sec - 4350) * 0.0256);

  return (
    <div ref={root} className="o-scene o-scene--fl" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <div className="o-fl__bg"><img src="/scenes/flight-bg.webp" alt="" draggable="false" /></div>
      <img className="o-fl__cloud o-fl__cloud--far" src="/scenes/flight-cloud-b.webp" alt="" draggable="false" />
      <div className="o-fl__haze" />
      <svg className="o-fl__shot" viewBox="0 0 100 100" preserveAspectRatio="none" key={shot}>
        <polygon points="47,67 69,61.5 80,70.5 52,79" />
      </svg>
      <div className="o-fl__drone">
        <div className="o-fl__bob">
          <img src="/scenes/flight-drone.webp" alt="" draggable="false" />
          <span className="o-fl__flash" key={shot} />
        </div>
      </div>
      <img className="o-fl__cloud o-fl__cloud--near" src="/scenes/flight-cloud-a.webp" alt="" draggable="false" />
      <div className="o-fl__hud">
        <div className="o-fl__mission"><i /> REC · {tr('Аэрофотосъёмка')}</div>
        <dl className="o-fl__tele">
          <div><dt>{tr('Высота полёта')}</dt><dd>350 {tr('м')}</dd></div>
          <div><dt>{tr('Скорость')}</dt><dd>92 {tr('км/ч')}</dd></div>
          <div><dt>{tr('В полёте')}</dt><dd>{clock.text}</dd></div>
        </dl>
        <div className="o-fl__foot">
          <div className="o-fl__photos"><b>{groupNum(photos)}</b><span>{tr('снимков в миссии')}</span></div>
          <div className="o-fl__route">
            <div className="o-fl__bar"><i style={{ transform: `scaleX(${km / 200})` }} /></div>
            <span>{Math.round(km)} / 200 {tr('км')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
