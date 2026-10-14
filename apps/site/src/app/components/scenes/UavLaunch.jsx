// ---------------------------------------------------------------------------
// Два самолёта для аэрофотосъёмки: старт с катапульты и с руки.
//
// Долина из каталога, на переднем плане — направляющая катапульты.
// Старшая модель стоит на ней, идёт отсчёт, аппарат разгоняется по
// направляющей и уходит в небо, уменьшаясь к горизонту. Затем облегчённая
// модель стартует «с руки» — по дуге броска — и тоже уходит в долину.
// Карточки внизу показывают характеристики той модели, что сейчас в кадре.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { easeInOut, easeOut, lerp, span, useAwake, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

const LOOP = 13200;
// Направляющая: от точки A до точки B (в % кадра).
const RAIL = { a: [7, 69], b: [33, 55] };

function bez(p0, p1, p2, t) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

export default function UavLaunch() {
  const root = useRef(null);
  const big = useRef(null);
  const lite = useRef(null);
  const rail = useRef(null);
  const bg = useRef(null);
  const trail = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const [ui, setUi] = useState({ model: 0, count: '' });
  const last = useRef('');

  // flip: снимок старшей модели смотрит носом влево — разворачиваем.
  const place = (el, x, y, s, r, o, flip = 1) => {
    if (!el) return;
    el.style.transform = `translate(${x.toFixed(2)}cqw, ${y.toFixed(2)}cqh) translate(-50%, -50%) rotate(${r.toFixed(2)}deg) scale(${(s * flip).toFixed(3)}, ${s.toFixed(3)})`;
    el.style.opacity = String(o.toFixed(3));
  };

  const frame = (time) => {
    const t = reduced ? 1200 : time % LOOP;
    let model = 0;
    let count = '';
    // Модель 1: катапульта.
    if (t < 7000) {
      model = 0;
      const ready = easeOut(span(t, 0, 700));
      if (!reduced && t > 900 && t < 2700) count = String(3 - Math.floor((t - 900) / 600));
      if (t >= 2700 && t < 3300) count = tr('Старт');
      let x; let y; let s = 1; let r = -29; let o = ready;
      const go = span(t, 2700, 3400);
      if (t < 2700) { [x, y] = RAIL.a.map((v, i) => lerp(v, RAIL.b[i], 0.3)); y -= 3; }
      else if (t < 3400) {
        const e = go * go * go;
        [x, y] = RAIL.a.map((v, i) => lerp(v, RAIL.b[i], lerp(0.3, 1, e)));
        y -= 3;
      } else {
        const p = easeInOut(span(t, 3400, 6900));
        [x, y] = bez([RAIL.b[0], RAIL.b[1] - 3], [56, 36], [80, 30], p);
        s = lerp(1, 0.14, Math.pow(p, 0.8));
        r = lerp(-29, -8, easeOut(p)) + Math.sin(t / 380) * 2.2 * (1 - p);
        o = 1 - span(p, 0.82, 1);
      }
      place(big.current, x, y, s, r, o, -1);
      place(lite.current, 0, 0, 1, 0, 0);
      if (trail.current) {
        const k = t >= 2700 && t < 4200 ? Math.sin(Math.PI * span(t, 2700, 4200)) : 0;
        trail.current.style.opacity = String((k * 0.85).toFixed(3));
      }
      if (rail.current) rail.current.style.opacity = String(Math.min(ready, 1 - span(t, 6300, 7000)).toFixed(3));
    } else {
      // Модель 2: с руки.
      model = 1;
      const l = t - 7000;
      const thrown = easeOut(span(l, 0, 900));
      const away = easeInOut(span(l, 700, 5600));
      let [x, y] = bez([8, 76], [14, 58], [28, 52], thrown);
      let s = lerp(0.95, 0.82, thrown);
      let r = lerp(14, 6, thrown);
      if (l > 700) {
        [x, y] = bez([28, 52], [50, 38], [74, 32], away);
        s = lerp(0.82, 0.12, Math.pow(away, 0.8));
        r = lerp(6, 2, away) + Math.sin(l / 420) * 2.4 * (1 - away);
      }
      const o = Math.min(span(l, 0, 350), 1 - span(away, 0.84, 1));
      place(lite.current, x, y, s, r, o);
      place(big.current, 0, 0, 1, 0, 0);
      if (trail.current) trail.current.style.opacity = '0';
      if (rail.current) rail.current.style.opacity = String(span(l, 5600, 6200).toFixed(3));
    }
    if (bg.current) bg.current.style.transform = `translate(${(-2.2 * Math.sin((t / LOOP) * Math.PI * 2)).toFixed(2)}%, 0) scale(1.08)`;
    const key = `${model}|${count}`;
    if (key !== last.current) { last.current = key; setUi({ model, count }); }
  };
  useFrames(awake && !reduced, frame);
  useEffect(() => { if (reduced) frame(0); }, [reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  const models = [
    { name: tr('Старт с катапульты'), rows: [['3', tr('ч в воздухе')], ['200', tr('км за полёт')], ['2', tr('кг нагрузки')]], crew: `${tr('экипаж')} 2 · 20 ${tr('мин')}` },
    { name: tr('Старт с руки'), rows: [['2,5', tr('ч в воздухе')], ['140', tr('км за полёт')], ['1', tr('кг нагрузки')]], crew: `${tr('1 оператор')} · 15 ${tr('мин')}` },
  ];

  return (
    <div ref={root} className="o-scene o-scene--ln" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <div className="o-ln__bg" ref={bg}><img src="/scenes/launch-bg.webp" alt="" draggable="false" /></div>
      <div className="o-ln__sky" />
      <svg ref={rail} className="o-ln__rail" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1={RAIL.a[0] - 2} y1={RAIL.a[1] + 1.2} x2={RAIL.b[0] + 1} y2={RAIL.b[1] + 0.6} className="o-ln__beam" />
        <line x1={RAIL.a[0] - 2} y1={RAIL.a[1] + 2.6} x2={RAIL.b[0] + 1} y2={RAIL.b[1] + 2} className="o-ln__beam is-low" />
        {[0.12, 0.36, 0.6, 0.84].map((k) => {
          const x = lerp(RAIL.a[0], RAIL.b[0], k);
          const y = lerp(RAIL.a[1], RAIL.b[1], k);
          return <line key={k} x1={x} y1={y + 1.2} x2={x - 0.6} y2={y + 2.7} className="o-ln__rung" />;
        })}
        <line x1={lerp(RAIL.a[0], RAIL.b[0], 0.3)} y1={lerp(RAIL.a[1], RAIL.b[1], 0.3) + 2.6} x2={lerp(RAIL.a[0], RAIL.b[0], 0.25)} y2="80" className="o-ln__leg" />
        <line x1={lerp(RAIL.a[0], RAIL.b[0], 0.72)} y1={lerp(RAIL.a[1], RAIL.b[1], 0.72) + 2.2} x2={lerp(RAIL.a[0], RAIL.b[0], 0.8)} y2="80" className="o-ln__leg" />
        <ellipse cx={lerp(RAIL.a[0], RAIL.b[0], 0.52)} cy="80.5" rx="15" ry="1.2" className="o-ln__shadow" />
      </svg>
      <div className="o-ln__trail" ref={trail} style={{ left: `${RAIL.a[0]}cqw`, top: `${RAIL.a[1]}cqh` }} />
      <img ref={big} className="o-ln__craft is-big" src="/scenes/launch-photo.webp" alt="" draggable="false" />
      <img ref={lite} className="o-ln__craft is-lite" src="/scenes/launch-lite.webp" alt="" draggable="false" />
      {ui.count ? <div className="o-ln__count" key={ui.count}>{ui.count}</div> : null}
      <div className="o-ln__cards">
        {models.map((m, i) => (
          <div key={i} className={`o-ln__card${ui.model === i ? ' is-on' : ''}`}>
            <div className="o-ln__name">{m.name}</div>
            <div className="o-ln__rows">
              {m.rows.map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}
            </div>
            <div className="o-ln__crew">{m.crew}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
