// ---------------------------------------------------------------------------
// Платный проезд в масштабе сети дорог.
//
// Схема трасс: на загруженных участках стоят порталы свободного потока,
// на остальной сети работают виртуальные рубежи GNSS. Грузовик с бортовым
// устройством идёт по маршруту, спутники ведут его, и на каждом виртуальном
// рубеже в карточке поездки появляется новый участок с километрами.
// По главной трассе тем временем проезжает легковая машина — портал читает
// её номер. Обе системы сходятся в одном бэк-офисе.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { easeInOut, useAwake, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

const ROADS = [
  'M -10 210 C 60 200, 110 220, 170 196 S 286 172, 410 182',
  'M 138 -10 C 156 62, 138 132, 170 196 S 206 264, 190 310',
  'M 170 196 C 214 176, 262 154, 330 144 S 392 130, 412 128',
  'M 170 196 C 122 238, 74 262, -10 282',
  'M 330 144 C 340 196, 362 236, 410 256',
];
const ROUTE = 'M -10 282 C 74 262, 122 238, 170 196 C 214 176, 262 154, 330 144 S 392 130, 412 128';
const MAIN = ROADS[0];
const CITIES = [[170, 196, 7], [330, 144, 5], [62, 206, 4], [190, 282, 4], [146, 70, 4]];
const GATES = [0.13, 0.25, 0.37, 0.5, 0.62, 0.74, 0.86];
const PORTALS = [0.3, 0.7];
const TRIP_KM = 486;
const T_TRUCK = 17000;
const T_CAR = 8600;

export default function TollGnss() {
  const root = useRef(null);
  const svg = useRef(null);
  const route = useRef(null);
  const main = useRef(null);
  const truck = useRef(null);
  const car = useRef(null);
  const sats = useRef([]);
  const links = useRef([]);
  const ticks = useRef([]);
  const portals = useRef([]);
  const geo = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const [rows, setRows] = useState([]);
  const [gates, setGates] = useState([]);
  const st = useRef({ lap: -1, passed: 0, carLap: -1, carPassed: 0 });

  useEffect(() => {
    const r = route.current;
    const m = main.current;
    if (!r || !m) return;
    const len = r.getTotalLength();
    const mlen = m.getTotalLength();
    const g = GATES.map((f) => {
      const p = r.getPointAtLength(len * f);
      const q = r.getPointAtLength(Math.min(len, len * f + 1));
      const ang = Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2;
      return { f, x: p.x, y: p.y, dx: Math.cos(ang) * 6, dy: Math.sin(ang) * 6 };
    });
    const pr = PORTALS.map((f) => {
      const p = m.getPointAtLength(mlen * f);
      const q = m.getPointAtLength(Math.min(mlen, mlen * f + 1));
      return { f, x: p.x, y: p.y, ang: (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI };
    });
    geo.current = { len, mlen, g, pr };
    setGates({ g, pr });
  }, []);

  const place = (el, p, ang) => { if (el) el.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${ang.toFixed(1)})`); };

  const frame = (t) => {
    const G = geo.current;
    // после ухода со страницы ссылки обнуляются раньше, чем останавливается цикл
    if (!G || !route.current || !main.current) return;
    const s = st.current;
    // Грузовик по маршруту с GNSS.
    const lap = Math.floor(t / T_TRUCK);
    const pt = reduced ? 0.58 : easeInOut((t % T_TRUCK) / T_TRUCK);
    if (lap !== s.lap) { s.lap = lap; s.passed = 0; setRows([]); ticks.current.forEach((el) => el && el.classList.remove('is-on')); }
    const L = pt * G.len;
    const p = route.current.getPointAtLength(L);
    const q = route.current.getPointAtLength(Math.min(G.len, L + 1.5));
    place(truck.current, p, (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI);
    while (s.passed < GATES.length && pt >= GATES[s.passed]) {
      const i = s.passed;
      const prev = i ? GATES[i - 1] : 0;
      const km = Math.round((GATES[i] - prev) * TRIP_KM);
      const total = Math.round(GATES[i] * TRIP_KM);
      ticks.current[i] && ticks.current[i].classList.add('is-on');
      if (!reduced) setRows((list) => [{ id: `${lap}-${i}`, n: i + 1, km, total }, ...list].slice(0, 3));
      s.passed += 1;
    }
    // Спутники медленно плывут, линии связи тянутся к грузовику.
    sats.current.forEach((el, i) => {
      if (!el) return;
      const sx = 46 + i * 92 + Math.sin(t / 5200 + i * 2) * 20;
      const sy = 26 + Math.cos(t / 4300 + i) * 6;
      el.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
      const ln = links.current[i];
      if (ln) {
        ln.setAttribute('x1', sx.toFixed(1)); ln.setAttribute('y1', (sy + 6).toFixed(1));
        ln.setAttribute('x2', p.x.toFixed(1)); ln.setAttribute('y2', p.y.toFixed(1));
        ln.style.opacity = String(0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t / 300 + i * 2.1)));
      }
    });
    // Легковая по главной трассе через порталы.
    const carLap = Math.floor(t / T_CAR);
    const pc = reduced ? 0.31 : (t % T_CAR) / T_CAR;
    if (carLap !== s.carLap) { s.carLap = carLap; s.carPassed = 0; }
    const cp = main.current.getPointAtLength(pc * G.mlen);
    const cq = main.current.getPointAtLength(Math.min(G.mlen, pc * G.mlen + 1.5));
    place(car.current, cp, (Math.atan2(cq.y - cp.y, cq.x - cp.x) * 180) / Math.PI);
    while (s.carPassed < PORTALS.length && pc >= PORTALS[s.carPassed]) {
      const el = portals.current[s.carPassed];
      if (el) { el.classList.remove('is-hit'); void el.getBBox(); el.classList.add('is-hit'); }
      s.carPassed += 1;
    }
  };
  useFrames(awake && !reduced, frame);
  useEffect(() => { if (reduced) frame(0); }, [reduced, gates]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = rows.length ? rows[0].total : 0;
  return (
    <div ref={root} className="o-scene o-scene--gn" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <svg ref={svg} className="o-gn__map" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="gn-glow"><stop offset="0" stopColor="#3b82f6" stopOpacity=".35" /><stop offset="1" stopColor="#3b82f6" stopOpacity="0" /></radialGradient>
        </defs>
        <g className="o-gn__grid">
          {Array.from({ length: 17 }, (_, i) => <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="300" />)}
          {Array.from({ length: 13 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 25} x2="400" y2={i * 25} />)}
        </g>
        {ROADS.map((d, i) => <path key={i} d={d} className="o-gn__road" />)}
        <path ref={main} d={MAIN} className="o-gn__main" />
        <path ref={route} d={ROUTE} className="o-gn__route" pathLength={undefined} />
        {CITIES.map(([x, y, r]) => (
          <g key={`${x}${y}`} transform={`translate(${x} ${y})`}>
            <circle r={r * 3} fill="url(#gn-glow)" />
            <circle r={r} className="o-gn__city" />
          </g>
        ))}
        {(gates.g || []).map((g, i) => (
          <g key={`g${i}`} ref={(el) => { ticks.current[i] = el; }} className={`o-gn__gate${reduced && g.f < 0.58 ? ' is-on' : ''}`}>
            <line x1={g.x - g.dx} y1={g.y - g.dy} x2={g.x + g.dx} y2={g.y + g.dy} />
            <circle cx={g.x} cy={g.y} r="7" />
          </g>
        ))}
        {(gates.pr || []).map((p, i) => (
          <g key={`p${i}`} ref={(el) => { portals.current[i] = el; }} className="o-gn__portal" transform={`translate(${p.x} ${p.y}) rotate(${p.ang + 90})`}>
            <rect x="-9" y="-2" width="18" height="4" rx="1" />
            <circle r="11" className="o-gn__ping" />
          </g>
        ))}
        {[0, 1, 2].map((i) => <line key={`l${i}`} ref={(el) => { links.current[i] = el; }} className="o-gn__link" />)}
        {[0, 1, 2].map((i) => (
          <g key={`s${i}`} ref={(el) => { sats.current[i] = el; }} className="o-gn__sat">
            <rect x="-3" y="-3" width="6" height="6" rx="1" />
            <rect x="-11" y="-1.6" width="7" height="3.2" />
            <rect x="4" y="-1.6" width="7" height="3.2" />
          </g>
        ))}
        <g ref={car} className="o-gn__car"><rect x="-4.5" y="-2.3" width="9" height="4.6" rx="1.6" /></g>
        <g ref={truck} className="o-gn__truck">
          <circle r="11" className="o-gn__halo" />
          <rect x="-8" y="-3.2" width="11" height="6.4" rx="1" />
          <rect x="3.6" y="-3" width="4.6" height="6" rx="1.2" className="o-gn__cab" />
        </g>
      </svg>
      <div className="o-gn__card">
        <div className="o-gn__head">
          <span className="o-gn__obu"><i /> OBU · GNSS</span>
          <span className="o-gn__sats">{tr('спутников')}: 14</span>
        </div>
        <div className="o-gn__total"><b>{reduced ? Math.round(0.5 * TRIP_KM) : total}</b> {tr('км')}<span>{tr('пройдено по платной сети')}</span></div>
        <div className="o-gn__rows">
          {rows.map((r) => (
            <div key={r.id} className="o-gn__row">
              <i>✓</i><span>{tr('Участок')} {r.n}</span><b>+{r.km} {tr('км')}</b>
            </div>
          ))}
        </div>
      </div>
      <div className="o-gn__legend">
        <span><i className="is-portal" />{tr('Портал MLFF')}</span>
        <span><i className="is-gate" />{tr('Виртуальный рубеж GNSS')}</span>
      </div>
    </div>
  );
}
