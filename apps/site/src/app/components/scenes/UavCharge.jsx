// ---------------------------------------------------------------------------
// Полевое питание: защищённая зарядная станция в работе.
//
// Кейс станции из каталога стоит на «полу» студии. Индикатор заряда на
// нём набирается сегмент за сегментом, по кабелям к технике бегут
// импульсы энергии, а заряд аккумулятора дрона, рации и тепловизора растёт.
// Раз в цикл «пропадает сеть»: станция переходит на батарею за 10 мс —
// поток энергии не прерывается. Справа рисуется кривая ресурса
// LiFePO4: 80% ёмкости после 4000 циклов.
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { BatteryCharging, Plane, Radio, ScanEye, Zap } from 'lucide-react';
import { tr } from '../../lib/i18n.js';
import { easeInOut, groupNum, span, useAwake, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

const LOOP = 9000;
// y — центр карточки устройства, sy — точка кабеля на боку кейса (в % кадра).
const DEVICES = [
  { icon: Plane, label: () => tr('Аккумулятор БПЛА'), from: 38, y: 37, sy: 47 },
  { icon: Radio, label: () => tr('Рация'), from: 61, y: 55, sy: 56 },
  { icon: ScanEye, label: () => tr('Тепловизор'), from: 22, y: 73, sy: 65 },
];
// Кривая деградации: от 100% до 80% за 4000 циклов, мягкий изгиб.
const CURVE = 'M 15 8 C 38 12, 64 20, 96 40';

export default function UavCharge() {
  const root = useRef(null);
  const leds = useRef([]);
  const pct = useRef([]);
  const dot = useRef(null);
  const cycles = useRef(null);
  const curve = useRef(null);
  const clip = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const [outage, setOutage] = useState(false);
  const flags = useRef({ outage: false });

  useFrames(awake && !reduced, (time) => {
    const t = time % LOOP;
    // Индикатор: сегменты набираются по кругу, верхний мигает.
    const level = 1 + Math.floor(span(t, 0, LOOP * 0.9) * 5);
    leds.current.forEach((el, i) => {
      if (!el) return;
      const on = i < level - 1 || (i === level - 1 && Math.floor(time / 450) % 2 === 0);
      el.classList.toggle('is-on', on);
    });
    // Заряд техники.
    DEVICES.forEach((d, i) => {
      const el = pct.current[i];
      if (!el) return;
      const v = Math.min(100, Math.round(d.from + (100 - d.from) * easeInOut(span(t, 300 + i * 200, LOOP - 900))));
      const text = `${v}%`;
      if (el.textContent !== text) el.textContent = text;
    });
    // Кривая ресурса: точка едет по кривой, счётчик циклов растёт.
    const p = easeInOut(span(t, 400, LOOP - 1400));
    const path = curve.current;
    if (path && dot.current) {
      const L = path.getTotalLength();
      const pt = path.getPointAtLength(L * p);
      dot.current.style.left = `${pt.x.toFixed(2)}%`;
      dot.current.style.top = `${((pt.y / 48) * 100).toFixed(2)}%`;
      if (clip.current) clip.current.setAttribute('width', pt.x.toFixed(2));
    }
    if (cycles.current) {
      const text = groupNum(4000 * p);
      if (cycles.current.textContent !== text) cycles.current.textContent = text;
    }
    // «Пропала сеть» на 1,2 с в середине цикла.
    const out = t > 4200 && t < 5400;
    if (out !== flags.current.outage) { flags.current.outage = out; setOutage(out); }
  });

  return (
    <div ref={root} className={`o-scene o-scene--ch${outage ? ' is-out' : ''}`} data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <div className="o-ch__floor" />
      <div className="o-ch__case">
        <img src="/scenes/charge-case.webp" alt="" draggable="false" />
        <img src="/scenes/charge-case.webp" alt="" draggable="false" className="o-ch__mirror" />
        <div className="o-ch__panel">
          <div className="o-ch__leds">
            {[0, 1, 2, 3, 4].map((i) => <i key={i} ref={(el) => { leds.current[i] = el; }} className={reduced && i < 4 ? 'is-on' : ''} />)}
          </div>
          <span className="o-ch__src">{outage ? <><Zap /> 10 {tr('мс')}</> : 'AC'}</span>
        </div>
      </div>
      <svg className="o-ch__wires" viewBox="0 0 100 100" preserveAspectRatio="none">
        {DEVICES.map((d, i) => (
          <g key={i}>
            <path d={`M 30 ${d.sy} C 41 ${d.sy}, 41 ${d.y}, 52 ${d.y}`} className="o-ch__wire" />
            <path d={`M 30 ${d.sy} C 41 ${d.sy}, 41 ${d.y}, 52 ${d.y}`} className="o-ch__flow" />
          </g>
        ))}
      </svg>
      <div className="o-ch__devs">
        {DEVICES.map((d, i) => {
          const I = d.icon;
          return (
            <div key={i} className="o-ch__dev" style={{ top: `${d.y}%` }}>
              <span className="o-ch__ico"><I /></span>
              <span className="o-ch__name">{d.label()}</span>
              <b ref={(el) => { pct.current[i] = el; }}>{reduced ? '100%' : `${d.from}%`}</b>
              <BatteryCharging className="o-ch__bat" />
            </div>
          );
        })}
      </div>
      <div className="o-ch__chart">
        <div className="o-ch__ct"><span>LiFePO4</span><b><em ref={cycles}>{reduced ? '4 000' : '0'}</em> {tr('циклов')}</b></div>
        <div className="o-ch__plot">
          <svg viewBox="0 0 100 48" preserveAspectRatio="none">
            <line x1="15" y1="8" x2="96" y2="8" className="o-ch__grid" />
            <line x1="15" y1="40" x2="96" y2="40" className="o-ch__grid" />
            <defs><clipPath id="o-ch-clip"><rect ref={clip} x="0" y="0" width={reduced ? 100 : 15} height="48" /></clipPath></defs>
            <path d={CURVE} className="o-ch__curve-bg" />
            <path ref={curve} d={CURVE} className="o-ch__curve" clipPath="url(#o-ch-clip)" />
          </svg>
          <i ref={dot} className="o-ch__dot" style={reduced ? { left: '96%', top: '83.3%' } : { left: '15%', top: '16.7%' }} />
          <div className="o-ch__axis"><span>100%</span><span>80%</span></div>
        </div>
      </div>
      <div className="o-ch__specs">
        <span><b>IP67</b> {tr('погружение до 1 м')}</span>
        <span><b>−20…+40 °C</b></span>
        <span className={outage ? 'is-hot' : ''}><b>10 {tr('мс')}</b> {tr('на резерв')}</span>
      </div>
      {outage ? <div className="o-ch__alert" key="alert"><Zap /> {tr('Сеть отключена — питание без перерыва')}</div> : null}
    </div>
  );
}
