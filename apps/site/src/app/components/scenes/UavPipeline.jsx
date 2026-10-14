// ---------------------------------------------------------------------------
// Трубопроводы: облёт трассы и три типичные находки.
//
// Все кадры — настоящие снимки из презентации по нефтегазу. Дрон идёт
// вдоль трубы, и платформа по очереди показывает находки:
//   1. скрытый отвод от нелегальной врезки — камера ведёт вдоль шланга,
//      нейросеть прорисовывает его трассу до места врезки;
//   2. выброс продукта на месте разрушенной врезки — над полем живёт
//      облако брызг, инцидент сразу уходит диспетчеру как срочный;
//   3. коррозийная протечка на тепловизоре — по кадру проходит скан и
//      обводит холодный шлейф утечки.
// Справа — журнал находок и километраж облёта.
// ---------------------------------------------------------------------------
import { useRef } from 'react';
import { tr } from '../../lib/i18n.js';
import { clamp, rng, useAwake, useBeats, useCanvasSize, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

const SLIDES = [
  { id: 'tap', img: '/scenes/pipe-tap.webp', a: 1200 / 684, km: 12.4, kind: () => tr('Нелегальная врезка'), note: () => tr('Скрытый отвод трубы'), tone: 'red' },
  { id: 'geyser', img: '/scenes/pipe-geyser.webp', a: 1031 / 842, km: 37.9, kind: () => tr('Выброс продукта'), note: () => tr('Срочно · эскалация диспетчеру'), tone: 'amber' },
  { id: 'leak', img: '/scenes/pipe-leak.webp', a: 1034 / 744, km: 61.2, kind: () => tr('Коррозийная протечка'), note: () => tr('Тепловизор · −6 °C к фону'), tone: 'sky' },
];
const HOSE = 'M 45.6 93 C 46.6 78, 47.8 62, 48.7 50 S 50 26, 50.5 3';
const LEAK = '0,48.5 25,48 45,49 58,51 63,53.4 58,56 45,57.5 25,60 0,62';
const SOURCE = [64, 63];

function Spray({ on }) {
  const canvas = useRef(null);
  const st = useRef({ parts: [], rand: rng(9), next: 0 });
  const reduced = useReducedMotion();
  const draw = (t, dt) => {
    const c = canvas.current;
    const s = st.current;
    if (!c || !s.size) return;
    const ctx = c.getContext('2d');
    const { w, h, dpr } = s.size;
    ctx.clearRect(0, 0, w, h);
    const R = s.rand;
    while (s.next < t) {
      const ang = (-128 - R() * 38) * (Math.PI / 180);
      const sp = 0.09 + R() * 0.16;
      s.parts.push({ x: SOURCE[0], y: SOURCE[1], vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: 1600 + R() * 2200, r: 0.4 + R() * 1.6 });
      s.next += 9;
    }
    s.parts = s.parts.filter((p) => {
      p.life += dt;
      if (p.life > p.max) return false;
      p.vx -= 0.000032 * dt; // ветер сносит влево
      p.vy += 0.00003 * dt; // тяжёлые капли оседают
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      const k = p.life / p.max;
      ctx.globalAlpha = Math.sin(Math.PI * clamp(k * 1.1)) * 0.32;
      ctx.fillStyle = k < 0.3 ? 'rgb(236, 205, 160)' : 'rgb(214, 178, 132)';
      ctx.beginPath();
      ctx.arc((p.x / 100) * w, (p.y / 100) * h, (p.r + k * 2.4) * dpr, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });
    ctx.globalAlpha = 1;
  };
  const time = useFrames(on && !reduced, draw);
  useCanvasSize(canvas, (size) => { st.current.size = size; st.current.next = time.current; });
  return <canvas ref={canvas} className="o-pl__spray" />;
}

export default function UavPipeline() {
  const root = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const beat = useBeats(awake, [6200, 5600, 5600], { reduced, still: 0 });
  const cur = beat % SLIDES.length;
  const cycle = Math.floor(beat / SLIDES.length);
  const found = reduced ? SLIDES.length : cur + 1;

  return (
    <div ref={root} className="o-scene o-scene--pl" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      {SLIDES.map((s, i) => (
        <div key={s.id} className={`o-pl__slide is-${s.id}${i === cur ? ' is-on' : ''}`}>
          <div className="o-pl__stage" style={{ '--a': s.a }}>
            <div className="o-pl__kb" key={i === cur ? `${cycle}` : 'idle'}>
              <img src={s.img} alt="" draggable="false" loading="lazy" decoding="async" />
              {s.id === 'tap' ? (
                <svg className="o-pl__over" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d={HOSE} className="o-pl__hose" pathLength="100" />
                  <rect x="42" y="86.5" width="7.5" height="11" className="o-pl__mark" />
                  <rect x="46.6" y="41.5" width="4.6" height="8" className="o-pl__mark is-b" />
                </svg>
              ) : null}
              {s.id === 'geyser' ? (
                <>
                  <Spray on={awake && i === cur} />
                  <svg className="o-pl__over" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <rect x="58" y="55" width="11" height="12" className="o-pl__mark is-amber" />
                  </svg>
                </>
              ) : null}
              {s.id === 'leak' ? (
                <svg className="o-pl__over" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polygon points={LEAK} className="o-pl__leak" pathLength="100" />
                </svg>
              ) : null}
            </div>
          </div>
          {s.id === 'leak' && i === cur && !reduced ? <div className="o-pl__scan" key={`scan${cycle}`} /> : null}
          <div className="o-pl__tag" key={`tag${i === cur ? cycle : 'x'}`} data-tone={s.tone}>
            <b>{s.kind()}</b><span>{s.note()}</span>
          </div>
        </div>
      ))}
      <div className="o-pl__side">
        <div className="o-pl__head">
          <span><i /> {tr('Облёт трубопровода')}</span>
          <b>{SLIDES[cur].km.toFixed(1).replace('.', ',')} / 86 {tr('км')}</b>
        </div>
        <div className="o-pl__bar">
          <i style={{ transform: `scaleX(${SLIDES[cur].km / 86})` }} />
          {SLIDES.map((s, i) => <em key={s.id} className={i < found ? 'is-on' : ''} style={{ left: `${(s.km / 86) * 100}%` }} />)}
        </div>
        <div className="o-pl__list">
          {SLIDES.map((s, i) => (
            <div key={s.id} className={`o-pl__item${i === cur ? ' is-cur' : ''}${i < found ? ' is-found' : ''}`} data-tone={s.tone}>
              <i>{i + 1}</i>
              <span>{s.kind()}</span>
              <em>{tr('КМ')} {s.km.toFixed(1).replace('.', ',')}</em>
            </div>
          ))}
        </div>
        {cur === 0 ? (
          <div className="o-pl__ground" key={`g${cycle}`}>
            <img src="/scenes/pipe-ground.webp" alt="" draggable="false" loading="lazy" />
            <span><i>✓</i> {tr('Подтверждено наземной группой')}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
