// ---------------------------------------------------------------------------
// Единый бэк-офис: проезды с порталов и бортовых устройств в одном окне.
//
// Окно бэк-офиса живёт в реальном времени: в ленту приходят проезды —
// с ANPR-камер, DSRC-транспондеров и GNSS-устройств, у каждого свой путь
// оплаты (списание со счёта, абонемент, счёт пользователю). Модуль, который
// обрабатывает проезд, подсвечивается в нижней строке. Счётчики растут,
// а график суточного потока дорисовывается час за часом.
// ---------------------------------------------------------------------------
import { useMemo, useRef } from 'react';
import { tr } from '../../lib/i18n.js';
import { randomPlate } from '../../lib/plates.js';
import { groupNum, rng, useAwake, useBeats, useReducedMotion } from './engine.js';
import './scenes.css';

// Суточный поток (машин в час): утренний и вечерний пик.
const FLOW = [210, 140, 110, 100, 130, 260, 640, 1180, 1420, 1210, 980, 920, 960, 1010, 1060, 1140, 1320, 1560, 1480, 1120, 820, 610, 420, 300];
const MAX = 1600;
const SOURCES = ['ANPR', 'DSRC', 'GNSS', 'RFID'];
const PAY = [
  { k: () => tr('Списано со счёта'), m: 'billing', tone: 'green' },
  { k: () => tr('Абонемент'), m: 'crm', tone: 'green' },
  { k: () => tr('Оплата картой'), m: 'gateway', tone: 'green' },
  { k: () => tr('Счёт отправлен'), m: 'invoice', tone: 'amber' },
  { k: () => tr('Взаиморасчёт'), m: 'eets', tone: 'sky' },
];
const MODULES = [
  { id: 'billing', label: () => tr('Биллинг') },
  { id: 'gateway', label: () => tr('Платёжный шлюз') },
  { id: 'crm', label: () => 'CRM' },
  { id: 'invoice', label: () => tr('Выставление счетов') },
  { id: 'collect', label: () => tr('Взыскание') },
  { id: 'obu', label: () => tr('Управление OBU') },
  { id: 'eets', label: () => 'EETS' },
];

function area(upto) {
  const pts = FLOW.slice(0, upto + 1).map((v, i) => [(i / (FLOW.length - 1)) * 100, 100 - (v / MAX) * 92]);
  if (pts.length < 2) return { line: '', fill: '' };
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  const last = pts[pts.length - 1];
  return { line: d, fill: `${d} L ${last[0]} 100 L 0 100 Z`, x: last[0], y: last[1] };
}

export default function TollBackoffice() {
  const root = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const beat = useBeats(awake, [1300], { reduced, still: 14 });
  // номер для проезда n запоминаем, чтобы строки ленты не менялись на ходу
  const plates = useRef(new Map());
  const plateOf = (n) => {
    const m = plates.current;
    if (!m.has(n)) { m.set(n, randomPlate()); if (m.size > 12) m.delete(m.keys().next().value); }
    return m.get(n);
  };
  const hour = reduced ? 14 : 6 + (beat % 18);
  const day = Math.floor(beat / 18);
  const rows = useMemo(() => {
    const out = [];
    for (let k = 0; k < 4; k++) {
      const n = beat - k;
      if (n < 0) break;
      const r = rng(Math.imul(n + 11, 2654435761) >>> 0);
      r(); r();
      const pay = PAY[Math.floor(r() * PAY.length)];
      out.push({ n, plate: plateOf(n), src: SOURCES[Math.floor(r() * SOURCES.length)], pay, min: Math.floor(r() * 50) + 10 });
    }
    return out;
  }, [beat]); // eslint-disable-line react-hooks/exhaustive-deps
  const passes = FLOW.slice(0, hour + 1).reduce((a, b) => a + b, 0);
  const g = area(hour);
  const active = rows[0] ? rows[0].pay.m : '';
  const p = (x) => String(x).padStart(2, '0');

  return (
    <div ref={root} className="o-scene o-scene--bo" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <div className="o-bo__win">
        <div className="o-bo__bar">
          <b>{tr('Бэк-офис')}</b>
          <span>{tr('Проезды')} · {tr('сегодня')}</span>
          <em><i /> {p(hour)}:{p(rows[0] ? rows[0].min : 0)}</em>
        </div>
        <div className="o-bo__kpi">
          <div><span>{tr('Проезды')}</span><b>{groupNum(passes)}</b></div>
          <div><span>{tr('Оплачено автоматически')}</span><b>97,8%</b></div>
          <div><span>{tr('Счета пользователям')}</span><b>{groupNum(Math.round(passes * 0.021))}</b></div>
          <div className="is-amber"><span>{tr('В работе взыскания')}</span><b>{Math.round(passes * 0.0016)}</b></div>
        </div>
        <div className="o-bo__body">
          <div className="o-bo__chart">
            <div className="o-bo__ct">{tr('Поток по часам')}</div>
            <div className="o-bo__plot" key={day}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="o-bo-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b82f6" stopOpacity=".45" /><stop offset="1" stopColor="#3b82f6" stopOpacity="0" /></linearGradient>
                </defs>
                {[25, 50, 75].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} className="o-bo__grid" />)}
                <path d={g.fill} fill="url(#o-bo-fill)" className="o-bo__area" />
                <path d={g.line} className="o-bo__line" />
                <line x1={g.x} y1="0" x2={g.x} y2="100" className="o-bo__now" />
              </svg>
              <i className="o-bo__dot" style={{ left: `${g.x}%`, top: `${g.y}%` }} />
              <span className="o-bo__tip" style={{ left: `${Math.min(g.x, 78)}%` }}>{p(hour)}:00 · {groupNum(FLOW[hour])} {tr('в час')}</span>
            </div>
            <div className="o-bo__hours"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
          </div>
          <div className="o-bo__feed">
            {rows.map((r, i) => (
              <div key={r.n} className={`o-bo__row${i ? ' is-old' : ''}`} data-tone={r.pay.tone} style={{ '--i': i }}>
                <b>{r.plate}</b>
                <span className="o-bo__src">{r.src}</span>
                <span className="o-bo__pay">{r.pay.k()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="o-bo__mods">
          {MODULES.map((m) => <span key={m.id} className={m.id === active ? 'is-on' : ''}>{m.label()}</span>)}
        </div>
      </div>
    </div>
  );
}
