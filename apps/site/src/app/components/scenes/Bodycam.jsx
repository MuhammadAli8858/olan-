// ---------------------------------------------------------------------------
// ЕГСВ: носимый видеорегистратор на смене.
//
// Слева — смарт-жетон, который сотрудник носит на груди: дышит ИК-подсветка,
// мигает огонёк записи. Справа — пульт дежурного: в окне видео идёт
// трансляция с жетона — кадр снят с груди патрульного (лица на записи
// скрыты), картинка чуть покачивается в такт шагу, по краям — служебные
// подписи регистратора: запись, номер жетона, время и координаты.
// Сюжет идёт по шагам: онлайн-видео → распознавание лиц в кадре →
// геопозиция и маршрут патруля → тревожная кнопка SOS (пульт краснеет,
// тревога уходит дежурному).
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { useAwake, useBeats, useClock, useReducedMotion } from './engine.js';
import './scenes.css';

const STEPS = ['stream', 'face', 'gps', 'sos'];
const ROUTE = 'M10 88 C 20 74, 28 70, 36 62 S 50 40, 58 44 S 76 30, 88 14';
// Лица в кадре (центр и ширина рамки в % кадра) — по самой записи.
const FACES = [
  { x: 9.8, y: 37, w: 13 },
  { x: 30.3, y: 39, w: 9.5 },
  { x: 56.7, y: 31.5, w: 14.5, main: true },
  { x: 67.8, y: 40, w: 10 },
  { x: 92.5, y: 36.5, w: 11 },
];
const GPS = '41.3111° N · 69.2797° E';

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
  const beat = useBeats(awake, [3600, 3800, 3600, 4000], { reduced, still: 1 });
  const step = STEPS[beat % STEPS.length];
  const idx = STEPS.indexOf(step);
  const rec = useRecTimer(awake && !reduced);
  const clock = useClock(awake && !reduced);

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

  const rows = [
    { id: 'stream', k: tr('Онлайн-видео'), v: '1080p · 25 fps' },
    { id: 'face', k: tr('Распознавание лиц'), v: `${tr('Совпадение')} 97%` },
    { id: 'gps', k: tr('Геопозиция'), v: GPS },
    { id: 'sos', k: 'SOS', v: tr('Передано дежурному') },
  ];

  return (
    <div ref={root} className={`o-scene o-scene--bc is-${step}`} data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <div className="o-bc__spot" />

      <div className="o-bc__dev">
        <div className="o-bc__float">
          <img src="/scenes/bodycam.webp" alt="" draggable="false" />
          <span className="o-bc__ir" />
          <span className="o-bc__led" />
        </div>
        <div className="o-bc__shadow" />
      </div>
      <div className="o-bc__worn">{tr('Жетон на груди сотрудника')}</div>

      <div className="o-bc__waves">{[0, 1, 2, 3].map((i) => <i key={i} style={{ '--i': i }} />)}</div>
      <div className="o-bc__packet" key={beat}>
        <b>{packet.icon}</b><span>{packet.text}</span>
      </div>

      <div className="o-bc__stat">
        <b>10&nbsp;000+</b>
        <span>{tr('смарт-жетонов на службе')}</span>
      </div>

      <div className="o-bc__con">
        <div className="o-bc__bar">
          <span className="o-bc__live"><i /> {tr('Жетон')} BC-0471</span>
          <span className="o-bc__unit">{tr('Патруль')} 12</span>
          <em>{clock.hms}</em>
        </div>

        <div className="o-bc__vid">
          <div className="o-bc__walk">
            <img src="/scenes/bodycam-chest.webp" alt="" draggable="false" />
          </div>
          <div className="o-bc__faces">
            {FACES.map((f, i) => (
              <span key={i} className={`o-bc__fbox${f.main ? ' is-main' : ''}`} style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%`, '--d': `${i * 0.12}s` }}>
                {f.main ? <em>97%</em> : null}
              </span>
            ))}
          </div>
          <div className="o-bc__osd">
            <span className="o-bc__osd-rec"><i /> REC {rec}</span>
            <span className="o-bc__osd-id">BC-0471</span>
            <span className="o-bc__osd-time">{clock.date} {clock.hms}</span>
            <span className="o-bc__osd-gps">{GPS}</span>
          </div>
          <div className="o-bc__alarm"><span>SOS</span></div>
        </div>

        <div className="o-bc__low">
          <svg ref={map} className="o-bc__map" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
            <rect width="100" height="100" className="o-bc__land" />
            {[18, 40, 63, 84].map((x) => <line key={`v${x}`} x1={x} y1="0" x2={x - 6} y2="100" className="o-bc__road" />)}
            {[22, 48, 74].map((y) => <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y + 5} className="o-bc__road" />)}
            <path d={ROUTE} className="o-bc__route" pathLength="100" />
            <g className="o-bc__me" transform={reduced ? 'translate(58 44)' : undefined}>
              <circle r="7" className="o-bc__me-halo" />
              <circle r="3.2" className="o-bc__me-dot" />
              {reduced ? null : <animateMotion dur="11s" repeatCount="indefinite" path={ROUTE} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".45 0 .55 1" />}
            </g>
          </svg>
          <div className="o-bc__rows">
            {rows.map((r, i) => (
              <div key={r.id} className={`o-bc__row${i === idx ? ' is-on' : ''}${i < idx ? ' is-done' : ''}`} data-id={r.id}>
                <b>{r.k}</b>
                <span>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
