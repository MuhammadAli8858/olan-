// ---------------------------------------------------------------------------
// ЕГСВ: стройка под наблюдением — таймлапс.
//
// Камера стройплощадки снимает таймлапс: день сменяется ночью за пару
// секунд, солнце и луна проходят по небу, а здание растёт этаж за этажом.
// Кран поднимает груз, у въезда камера ГРНЗ читает номер грузовика.
// Окна готовых этажей ночью зажигаются. Когда здание достроено —
// таймлапс отматывается к первому дню и начинается заново.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { clamp, easeInOut, lerp, rng, smooth, span, useAwake, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

const DAY = 2600; // один «день» таймлапса, мс
const FLOORS = 13;
const REWIND = 1600;
const LOOP = DAY * (FLOORS + 1) + REWIND;
const BASE_Y = 252;
const FH = 12; // высота этажа
const BX = 214;
const BW = 116;
// Палитры неба: день, закат, ночь, рассвет — [верх, низ].
const SKY = [
  [[110, 168, 245], [205, 226, 250]],
  [[48, 50, 104], [240, 162, 110]],
  [[5, 10, 24], [20, 36, 72]],
  [[44, 60, 128], [246, 196, 140]],
];
const STARS = Array.from({ length: 34 }, (_, i) => {
  const r = rng(i + 3);
  return [r() * 400, r() * 150, 0.4 + r() * 0.9];
});
const SKYLINE = 'M0 196 L0 172 L16 172 L16 160 L30 160 L30 176 L44 176 L44 150 L52 146 L60 150 L60 178 L78 178 L78 164 L92 164 L92 140 L100 136 L108 140 L108 182 L124 182 L124 170 L140 170 L140 158 L152 158 L152 186 L170 186 L170 176 L186 176 L186 196 Z M 344 196 L 344 168 L 356 168 L 356 150 L 370 150 L 370 172 L 384 172 L 384 160 L 400 160 L 400 196 Z';
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

function skyAt(phase) {
  // phase 0..1 внутри суток: 0–0.5 день, 0.5–0.62 закат, 0.62–0.9 ночь, 0.9–1 рассвет
  const k = [[0, 0], [0.48, 0], [0.58, 1], [0.66, 2], [0.88, 2], [0.96, 3], [1, 0]];
  for (let i = 0; i < k.length - 1; i++) {
    if (phase >= k[i][0] && phase <= k[i + 1][0]) {
      const t = smooth((phase - k[i][0]) / (k[i + 1][0] - k[i][0] || 1));
      const a = SKY[k[i][1]]; const b = SKY[k[i + 1][1]];
      return [mix(a[0], b[0], t), mix(a[1], b[1], t)];
    }
  }
  return SKY[0];
}
const darkAt = (phase) => (phase < 0.5 ? 0 : phase < 0.64 ? smooth((phase - 0.5) / 0.14) : phase < 0.88 ? 1 : 1 - smooth((phase - 0.88) / 0.12));

export default function EgsvSites() {
  const root = useRef(null);
  const r = useRef({});
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const [hud, setHud] = useState({ day: 1, floors: 0, plate: false });
  const last = useRef('');

  const set = (k, attr, v) => { const el = r.current[k]; if (el) el.setAttribute(attr, v); };

  const frame = (time) => {
    const t = reduced ? DAY * 9.3 : time % LOOP;
    const rewinding = t > DAY * (FLOORS + 1);
    const rw = rewinding ? span(t, DAY * (FLOORS + 1), LOOP) : 0;
    const dayF = rewinding ? (FLOORS + 1) * (1 - easeInOut(rw)) : t / DAY;
    const day = Math.floor(dayF);
    const phase = rewinding ? 0.2 : dayF - day;
    // небо
    const [top, bot] = skyAt(phase);
    set('s0', 'stop-color', rgb(top));
    set('s1', 'stop-color', rgb(bot));
    const dark = rewinding ? 0 : darkAt(phase);
    set('stars', 'opacity', (dark * 0.9).toFixed(2));
    // солнце и луна идут по дуге
    const sunP = clamp(phase / 0.58);
    const ang = Math.PI * (1 - sunP);
    set('sun', 'cx', (200 + Math.cos(ang) * 190).toFixed(1));
    set('sun', 'cy', (205 - Math.sin(ang) * 150).toFixed(1));
    set('sun', 'opacity', (1 - dark).toFixed(2));
    const moonP = clamp((phase - 0.6) / 0.38);
    const mang = Math.PI * (1 - moonP);
    set('moon', 'cx', (200 + Math.cos(mang) * 170).toFixed(1));
    set('moon', 'cy', (200 - Math.sin(mang) * 130).toFixed(1));
    set('moon', 'opacity', (dark * 0.95).toFixed(2));
    const land = mix([92, 78, 60], [26, 26, 38], dark);
    set('ground', 'fill', rgb(land));
    set('skyline', 'fill', rgb(mix([120, 145, 185], [12, 18, 34], dark)));
    // этажи
    const built = Math.min(FLOORS, rewinding ? dayF : dayF + 0.0001);
    for (let i = 0; i < FLOORS; i++) {
      const g = r.current[`f${i}`];
      if (!g) continue;
      const p = clamp(built - i);
      g.setAttribute('opacity', p > 0 ? Math.min(1, p * 3).toFixed(2) : '0');
      g.setAttribute('transform', `translate(0 ${((1 - Math.min(1, p * 2.4)) * -6).toFixed(1)})`);
      const lit = i < built - 2 && dark > 0.4;
      g.classList.toggle('is-lit', lit && (i * 7 + day) % 5 !== 0);
      g.classList.toggle('is-glass', i < built - 2);
    }
    const topY = BASE_Y - Math.max(1, Math.min(FLOORS, Math.ceil(built))) * FH;
    // кран растёт вместе со зданием
    const mastTop = Math.min(BASE_Y - 60, topY - 30);
    set('mast', 'y', mastTop.toFixed(1));
    set('mast', 'height', (BASE_Y - mastTop).toFixed(1));
    set('jib', 'transform', `translate(0 ${mastTop.toFixed(1)})`);
    const trolley = 250 + Math.sin(time / 1300) * 60;
    set('trolley', 'transform', `translate(${trolley.toFixed(1)} 0)`);
    const hookY = 18 + (0.5 + 0.5 * Math.sin(time / 900)) * Math.max(10, topY - mastTop - 26);
    set('cable', 'y2', hookY.toFixed(1));
    set('load', 'transform', `translate(0 ${hookY.toFixed(1)})`);
    set('crane-light', 'opacity', dark > 0.3 ? (0.6 + 0.4 * Math.sin(time / 300)).toFixed(2) : '0');
    // грузовик проезжает ворота раз в два «дня»
    const truckT = (time % (DAY * 2)) / (DAY * 2);
    const tx = lerp(-70, 430, easeInOut(truckT));
    set('truck', 'transform', `translate(${tx.toFixed(1)} 0)`);
    const atGate = tx > 40 && tx < 140;
    set('scan', 'opacity', atGate ? '0.9' : '0');
    set('headl', 'opacity', dark > 0.35 ? '0.9' : '0');
    // мерцание экспозиции, как у настоящего таймлапса
    set('flicker', 'opacity', rewinding ? '0.12' : (0.02 + 0.03 * Math.abs(Math.sin(day * 12.9))).toFixed(3));
    const floors = Math.min(FLOORS, Math.ceil(built));
    const key = `${day}|${floors}|${atGate}`;
    if (key !== last.current) { last.current = key; setHud({ day: rewinding ? Math.max(1, day * 18) : day * 18 + 1, floors, plate: atGate, rewinding }); }
  };
  useFrames(awake && !reduced, frame);
  useEffect(() => { if (reduced) frame(0); }, [reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  const ref = (k) => (el) => { r.current[k] = el; };

  return (
    <div ref={root} className="o-scene o-scene--st" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <svg className="o-st__svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
            <stop ref={ref('s0')} offset="0" stopColor="rgb(110,168,245)" />
            <stop ref={ref('s1')} offset="1" stopColor="rgb(205,226,250)" />
          </linearGradient>
          <radialGradient id="st-sun"><stop offset="0" stopColor="#fff7d6" /><stop offset=".35" stopColor="#ffd88a" /><stop offset="1" stopColor="#ffd88a" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="400" height="300" fill="url(#st-sky)" />
        <g ref={ref('stars')} opacity="0">
          {STARS.map(([x, y, s], i) => <circle key={i} cx={x} cy={y} r={s} fill="#fff" />)}
        </g>
        <circle ref={ref('sun')} r="26" fill="url(#st-sun)" />
        <circle ref={ref('moon')} r="7" fill="#e8eefc" opacity="0" />
        <path ref={ref('skyline')} d={SKYLINE} fill="rgb(120,145,185)" />
        <rect ref={ref('ground')} x="0" y="196" width="400" height="104" fill="rgb(92,78,60)" />
        <rect x="0" y="270" width="400" height="30" fill="rgba(20,22,30,.55)" />
        {/* здание */}
        <rect x={BX - 6} y={BASE_Y} width={BW + 12} height="5" fill="#6b6f78" />
        {Array.from({ length: FLOORS }, (_, i) => {
          const y = BASE_Y - (i + 1) * FH;
          return (
            <g key={i} ref={ref(`f${i}`)} className="o-st__floor" opacity="0">
              <rect x={BX} y={y + FH - 2.4} width={BW} height="2.4" className="o-st__slab" />
              {[0, 1, 2, 3, 4].map((c) => <rect key={c} x={BX + 2 + c * ((BW - 7) / 4)} y={y} width="3" height={FH - 2.4} className="o-st__col" />)}
              {[0, 1, 2, 3, 4, 5, 6, 7].map((w) => <rect key={`w${w}`} x={BX + 7 + w * 13.6} y={y + 2.4} width="9" height={FH - 6} className="o-st__win" />)}
            </g>
          );
        })}
        {/* кран */}
        <rect ref={ref('mast')} x="186" y="140" width="7" height="112" className="o-st__mast" />
        <g ref={ref('jib')}>
          <rect x="150" y="-4" width="225" height="5" className="o-st__jibbar" />
          <rect x="150" y="1" width="26" height="9" fill="#3b4250" />
          <path d="M186 -4 L189.5 -22 L193 -4 Z" className="o-st__jibbar" />
          <line x1="189.5" y1="-22" x2="372" y2="-3" className="o-st__tie" />
          <line x1="189.5" y1="-22" x2="152" y2="-3" className="o-st__tie" />
          <circle ref={ref('crane-light')} cx="189.5" cy="-23" r="2.2" fill="#ff4d3d" opacity="0" />
          <g ref={ref('trolley')}>
            <rect x="-5" y="1" width="10" height="4" fill="#2d333f" />
            <line ref={ref('cable')} x1="0" y1="5" x2="0" y2="40" className="o-st__cable" />
            <g ref={ref('load')}>
              <path d="M-3 0 L3 0 L0 4 Z" fill="#2d333f" />
              <rect x="-11" y="4" width="22" height="7" rx="1" fill="#c26b2b" />
            </g>
          </g>
        </g>
        {/* забор, ворота, камера ГРНЗ */}
        {Array.from({ length: 22 }, (_, i) => (i > 2 && i < 7 ? null : <rect key={i} x={i * 19} y="252" width="18" height="16" className="o-st__fence" />))}
        <rect x="134" y="226" width="2.4" height="42" fill="#3b4250" />
        <rect x="127" y="224" width="13" height="6" rx="1.5" fill="#1f2530" />
        <circle cx="129" cy="227" r="1.4" fill="#ff4d3d" />
        <path ref={ref('scan')} d="M128 229 L60 268 L112 272 Z" className="o-st__scan" opacity="0" />
        {/* грузовик */}
        <g ref={ref('truck')}>
          <rect x="0" y="260" width="44" height="14" rx="2" fill="#e5e7eb" />
          <ellipse cx="22" cy="262" rx="16" ry="7" fill="#9ca3af" />
          <rect x="44" y="262" width="14" height="12" rx="2" fill="#f59e0b" />
          <rect x="49" y="264" width="7" height="5" rx="1" fill="#1f2937" />
          <circle cx="10" cy="276" r="3.6" fill="#111827" />
          <circle cx="32" cy="276" r="3.6" fill="#111827" />
          <circle cx="51" cy="276" r="3.6" fill="#111827" />
          <path ref={ref('headl')} d="M58 268 L96 262 L96 276 Z" fill="rgba(255,240,200,.45)" opacity="0" />
        </g>
        <rect ref={ref('flicker')} width="400" height="300" fill="#fff" opacity="0.03" />
      </svg>
      <div className="o-st__hud">
        <div className="o-st__rec"><i /> REC · {tr('Таймлапс')}</div>
        <div className="o-st__day">{hud.rewinding ? '◀◀ ' : ''}{tr('День {n}').replace('{n}', hud.day)}</div>
        <div className="o-st__stats">
          <div><b>846</b><span>{tr('камер на 106 стройках')}</span></div>
          <div><b>5&nbsp;435</b><span>{tr('камер в 234 школах Астаны')}</span></div>
        </div>
        <div className="o-st__progress">
          <span>{tr('Этаж {n} / {m}').replace('{n}', hud.floors).replace('{m}', FLOORS)}</span>
          <div className="o-st__bar"><i style={{ transform: `scaleX(${hud.floors / FLOORS})` }} /></div>
        </div>
      </div>
      {hud.plate && !reduced ? <div className="o-st__plate" key={hud.day}>017 ABK 01 · {tr('въезд')}</div> : null}
    </div>
  );
}
