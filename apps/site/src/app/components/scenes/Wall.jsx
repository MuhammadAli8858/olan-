// ---------------------------------------------------------------------------
// ЕГСВ: живая видеостена оператора.
//
// Кадры — настоящие камеры из презентации: дворы, парковка, улица, ночная
// трасса, камера ГРНЗ и портал над магистралью. Каждая камера медленно
// «дышит» (лёгкий наезд, у всех разный ритм), часы идут, а аналитика по
// очереди находит события: человека, номер, долгую стоянку, скорость,
// выезд в зону. Камера с событием приближает кадр, рамка цели собирается
// из уголков, внизу появляется строка журнала.
// ---------------------------------------------------------------------------
import { useMemo, useRef } from 'react';
import { tr } from '../../lib/i18n.js';
import { useAwake, useBeats, useClock, useReducedMotion } from './engine.js';
import './scenes.css';

const TILES = [
  { id: 'street', src: '/scenes/wall-street.webp', a: 720 / 512, cam: 'CAM 0217', kb: 'a', big: true },
  { id: 'anpr', src: '/scenes/wall-anpr.webp', a: 520 / 324, cam: 'CAM 1142 · ANPR', kb: 'b' },
  { id: 'parking', src: '/scenes/wall-parking.webp', a: 520 / 370, cam: 'CAM 0388', kb: 'c' },
  { id: 'night', src: '/scenes/wall-night.webp', a: 520 / 188, cam: 'CAM 2051', kb: 'd' },
  { id: 'yard', src: '/scenes/wall-yard.webp', a: 520 / 370, cam: 'CAM 0402', kb: 'e' },
  { id: 'highway', src: '/scenes/wall-highway.webp', a: 520 / 375, cam: 'CAM 3007', kb: 'f' },
];

// Коробки целей — в процентах кадра. Подписи строятся на лету: язык мог смениться.
const EVENTS = [
  { tile: 'street', tone: 'green', kind: () => tr('Распознавание людей'), box: [64.6, 33, 5, 15.5], focus: [67, 42], text: () => `${tr('Человек')} · 94%` },
  { tile: 'anpr', tone: 'amber', kind: () => tr('Распознавание номеров'), box: [29.5, 72, 15.5, 9.5], focus: [37, 62], text: () => '245 AXK 01 · 98%' },
  { tile: 'parking', tone: 'orange', kind: () => tr('Нарушение стоянки'), box: [17, 62, 40, 33], focus: [38, 74], text: () => `${tr('Стоянка')} 3:12` },
  { tile: 'night', tone: 'amber', kind: () => tr('Контроль скорости'), box: [53.6, 19, 11.4, 31], focus: [59, 36], text: () => `64 ${tr('км/ч')}` },
  { tile: 'street', tone: 'sky', kind: () => tr('Детектор транспорта'), box: [54.6, 23.5, 11.6, 10.5], focus: [60, 30], text: () => `${tr('Автомобиль')} · 97%` },
  { tile: 'highway', tone: 'sky', kind: () => tr('Интенсивность потока'), zone: '2,99 26,86 55,77 80,71 96,68 100,70 100,99', focus: [60, 80], text: () => `1\u00a0240 ${tr('авт/ч')}` },
];

function Tile({ tile, event, clock, still }) {
  const on = Boolean(event);
  return (
    <div className={`o-wall__tile${tile.big ? ' is-big' : ''}${on ? ' is-ev' : ''}`} data-tone={on ? event.tone : undefined}>
      <div className="o-wall__cam" style={{ '--a': tile.a }}>
        <div className="o-wall__zoom" style={on ? { transformOrigin: `${event.focus[0]}% ${event.focus[1]}%` } : undefined}>
          <div className={`o-wall__kb o-wall__kb--${tile.kb}${still ? ' is-still' : ''}`}>
            <img src={tile.src} alt="" decoding="async" loading="lazy" draggable="false" />
            {on && event.box ? (
              <span className="o-wall__box" style={{ left: `${event.box[0]}%`, top: `${event.box[1]}%`, width: `${event.box[2]}%`, height: `${event.box[3]}%` }}>
                <i /><i /><i /><i />
                <em>{event.text()}</em>
              </span>
            ) : null}
            {on && event.zone ? (
              <svg className="o-wall__zone" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polygon points={event.zone} pathLength="100" />
              </svg>
            ) : null}
          </div>
        </div>
      </div>
      <div className="o-wall__grain" />
      <div className="o-wall__hud">
        <span>{tile.cam}</span>
        <i className="o-wall__rec" />
      </div>
      <div className="o-wall__ts">{clock.date} {clock.hms}</div>
      {on && event.zone ? <em className="o-wall__tag">{event.text()}</em> : null}
    </div>
  );
}

export default function Wall() {
  const root = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const beat = useBeats(awake, [3800], { reduced, still: 0 });
  const clock = useClock(awake && !reduced);
  const event = EVENTS[beat % EVENTS.length];
  const log = useMemo(() => {
    const rows = [];
    for (let k = 0; k < 3; k++) {
      const n = beat - k;
      if (n < 0) break;
      const e = EVENTS[n % EVENTS.length];
      const tile = TILES.find((t) => t.id === e.tile);
      rows.push({ n, e, cam: tile.cam.split(' · ')[0], ago: k * 4 });
    }
    return rows;
  }, [beat]);

  const fmt = (sec) => {
    const d = new Date(Date.now() - sec * 1000);
    const p = (x) => String(x).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  return (
    <div ref={root} className="o-scene o-scene--wall" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <div className="o-wall">
        <div className="o-wall__bar">
          <div className="o-wall__brand"><b>{tr('ЕГСВ 2.0')}</b><span>{tr('Видеостена')}</span></div>
          <div className="o-wall__status">
            <span className="o-wall__online"><i /> 45&nbsp;983 {tr('онлайн')}</span>
            <span className="o-wall__clock">{clock.hms}</span>
          </div>
        </div>
        <div className="o-wall__grid">
          {TILES.map((t) => <Tile key={t.id} tile={t} event={t.id === event.tile ? event : null} clock={clock} still={reduced} />)}
        </div>
        <div className="o-wall__log">
          {log.map(({ n, e, cam, ago }, i) => (
            <div key={n} className={`o-wall__row${i ? ' is-old' : ''}`} data-tone={e.tone} style={{ '--i': i }}>
              <i />
              <span className="o-wall__t">{fmt(ago)}</span>
              <span className="o-wall__what">{e.kind()}</span>
              <span className="o-wall__res">{e.text()}</span>
              <span className="o-wall__src">{cam}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
