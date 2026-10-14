// ---------------------------------------------------------------------------
// ЕГСВ: носимый видеорегистратор на смене.
//
// Жетон из презентации мягко покачивается, ИК-подсветка вокруг объектива
// дышит. От жетона к приложению дежурного идут волны связи, и по ним по
// очереди уходят посылки: видеопоток, распознанное лицо, геопозиция и,
// наконец, тревожная кнопка SOS — тогда волны краснеют, а в приложении
// загорается тревога.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { useAwake, useBeats, useReducedMotion } from './engine.js';
import './scenes.css';

const STEPS = ['stream', 'face', 'gps', 'sos'];
const ROUTE = 'M14 92 C 22 74, 30 70, 38 62 S 52 40, 60 44 S 78 30, 86 14';

function useRecTimer(awake, base = 166) {
  const [sec, setSec] = useState(base);
  useEffect(() => {
    if (!awake) return undefined;
    const id = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [awake]);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(sec / 3600))}:${p(Math.floor(sec / 60) % 60)}:${p(sec % 60)}`;
}

export default function Bodycam() {
  const root = useRef(null);
  const map = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const beat = useBeats(awake, [3400, 3400, 3400, 3800], { reduced, still: 1 });
  const step = STEPS[beat % STEPS.length];
  const rec = useRecTimer(awake && !reduced);

  useEffect(() => {
    const svg = map.current;
    if (!svg || !svg.pauseAnimations) return;
    if (awake && !reduced) svg.unpauseAnimations(); else svg.pauseAnimations();
  }, [awake, reduced]);

  const packet = {
    stream: { icon: '▶', text: tr('Онлайн-видео') },
    face: { icon: '◉', text: tr('Распознавание лиц') },
    gps: { icon: '⌖', text: tr('Геопозиция') },
    sos: { icon: '!', text: 'SOS' },
  }[step];

  return (
    <div ref={root} className={`o-scene o-scene--bc is-${step}`} data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <div className="o-bc__spot" />
      <div className="o-bc__waves">{[0, 1, 2, 3].map((i) => <i key={i} style={{ '--i': i }} />)}</div>

      <div className="o-bc__dev">
        <div className="o-bc__float">
          <img src="/scenes/bodycam.webp" alt="" draggable="false" />
          <span className="o-bc__ir" />
          <span className="o-bc__led" />
        </div>
        <div className="o-bc__shadow" />
      </div>

      <div className="o-bc__packet" key={beat}>
        <b>{packet.icon}</b><span>{packet.text}</span>
      </div>

      <div className="o-bc__stat">
        <b>10&nbsp;000+</b>
        <span>{tr('смарт-жетонов на службе')}</span>
      </div>

      <div className="o-bc__phone">
        <div className="o-bc__screen">
          <div className="o-bc__sys"><span>{rec.slice(3, 8)}</span><span>LTE ▮▮▮</span></div>
          <div className="o-bc__head">
            <b>{tr('Видеопоток')}</b>
            <span className="o-bc__rec"><i /> {rec}</span>
          </div>
          <div className="o-bc__stream">
            <div className="o-bc__zoom">
              <img src="/scenes/wall-street.webp" alt="" draggable="false" />
              <span className="o-bc__face"><i /><i /><i /><i /></span>
            </div>
            <em className="o-bc__match">{tr('Совпадение')} 97%</em>
          </div>
          <div className="o-bc__card">
            <span className="o-bc__k">{step === 'gps' ? tr('Местоположение') : step === 'sos' ? tr('Тревога') : step === 'face' ? tr('Распознавание лиц') : tr('Запись')}</span>
            <span className="o-bc__v">{step === 'gps' ? '51.1283° N · 71.4305° E' : step === 'sos' ? tr('Передано дежурному') : step === 'face' ? `${tr('Совпадение')} 97%` : '1080p · 25 fps'}</span>
          </div>
          <svg ref={map} className="o-bc__map" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
            <rect width="100" height="100" className="o-bc__land" />
            {[18, 40, 63, 84].map((x) => <line key={`v${x}`} x1={x} y1="0" x2={x - 6} y2="100" className="o-bc__road" />)}
            {[22, 48, 74].map((y) => <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y + 5} className="o-bc__road" />)}
            <path d={ROUTE} className="o-bc__route" pathLength="100" />
            <g className="o-bc__me" transform={reduced ? 'translate(60 44)' : undefined}>
              <circle r="7" className="o-bc__me-halo" />
              <circle r="3.2" className="o-bc__me-dot" />
              {reduced ? null : <animateMotion dur="11s" repeatCount="indefinite" path={ROUTE} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".45 0 .55 1" />}
            </g>
          </svg>
          <div className="o-bc__sos"><span>SOS</span></div>
        </div>
      </div>
    </div>
  );
}
