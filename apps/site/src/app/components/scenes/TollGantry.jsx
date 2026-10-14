// ---------------------------------------------------------------------------
// Взимание платы: портал свободного потока на фото из презентации.
//
// Поверх настоящего снимка магистрали идёт «цифровой двойник» движения:
// машины уходят к горизонту по своим полосам — в перспективе, быстрее у
// камеры и медленнее вдали. Когда машина проходит под порталом, датчики
// на балке «стреляют» лучами, по дороге пробегает световая завеса, а над
// машиной всплывает карточка проезда: номер, класс, скорость и оплата.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { randomPlate } from '../../lib/plates.js';
import { Img } from '../../lib/img.jsx';
import { clamp, groupNum, rng, useAwake, useCanvasSize, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

const DEFAULT_IMAGE = '/products/toll-gantry.jpg';
const ASPECT = 827 / 620;
// Геометрия снимка (в процентах кадра): точка схода, две полосы нашей
// проезжей части и линия под порталом, где машину «видят» датчики.
const VP = [96, 61];
const LANES = [
  { e: [-2, 86.5], zc: 3.0 },
  { e: [36, 105], zc: 3.5 },
];
const SENSORS = [[62.5, 44.5], [77.5, 41.5], [91.5, 38]];
const CURTAIN = [[44, 64.2], [100, 79]];
const TYPES = [
  { k: 'car', w: 21, h: 15, cls: 1, label: () => tr('легковой'), p: 0.62 },
  { k: 'van', w: 22, h: 19.5, cls: 2, label: () => tr('фургон'), p: 0.2 },
  { k: 'truck', w: 24, h: 27, cls: 4, label: () => tr('грузовой, 5 осей'), p: 0.18 },
];

function laneAt(lane, z) {
  return [VP[0] + (lane.e[0] - VP[0]) / z, VP[1] + (lane.e[1] - VP[1]) / z];
}

export default function TollGantry({ image = DEFAULT_IMAGE }) {
  const root = useRef(null);
  const canvas = useRef(null);
  const st = useRef({ cars: [], next: 300, rand: rng(11), count: 18342 });
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const [card, setCard] = useState(null);
  const countRef = useRef(null);
  // Своё фото не загрузилось (например, в старом контенте осталась ссылка
  // на удалённую картинку) — показываем снимок портала, а не чёрный кадр.
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [image]);
  const photo = !image || failed ? DEFAULT_IMAGE : image;
  const own = photo === DEFAULT_IMAGE;

  const draw = (t, dt) => {
    const c = canvas.current;
    const s = st.current;
    if (!c || !s.size) return;
    const ctx = c.getContext('2d');
    const { w, h, dpr } = s.size;
    const X = (x) => (x / 100) * w;
    const Y = (y) => (y / 100) * h;
    ctx.clearRect(0, 0, w, h);
    if (!own) return;
    // Поток: новые машины появляются с разными интервалами и скоростью.
    if (!reduced && t >= s.next) {
      let pick = s.rand();
      const type = TYPES.find((ty) => (pick -= ty.p) <= 0) || TYPES[0];
      const lane = type.k === 'truck' ? LANES[1] : LANES[s.rand() < 0.5 ? 0 : 1];
      const busy = s.cars.some((car) => car.lane === lane && car.z < 2.6);
      if (!busy) s.cars.push({ lane, type, z: 1.35, v: (type.k === 'truck' ? 1.15 : 1.5) + s.rand() * 0.6, hit: false, born: t, plate: randomPlate(), kmh: type.k === 'truck' ? 78 + Math.round(s.rand() * 14) : 96 + Math.round(s.rand() * 34) });
      s.next = t + 700 + s.rand() * 1500;
    }
    // Световая завеса под порталом.
    const lastHit = s.lastHit ? clamp(1 - (t - s.lastHit) / 900) : 0;
    const [a, b] = CURTAIN;
    const g = ctx.createLinearGradient(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]));
    g.addColorStop(0, 'rgba(125, 211, 252, 0)');
    g.addColorStop(0.25, `rgba(125, 211, 252, ${0.22 + 0.5 * lastHit})`);
    g.addColorStop(1, `rgba(125, 211, 252, ${0.3 + 0.6 * lastHit})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = (1.4 + 2.5 * lastHit) * dpr;
    ctx.shadowColor = 'rgba(125, 211, 252, .9)';
    ctx.shadowBlur = (6 + 14 * lastHit) * dpr;
    ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(b[0]), Y(b[1])); ctx.stroke();
    ctx.shadowBlur = 0;
    // Датчики на балке.
    SENSORS.forEach(([x, y], i) => {
      const pulse = 0.5 + 0.5 * Math.sin(t / 420 + i * 1.7);
      ctx.fillStyle = `rgba(255, 90, 80, ${0.45 + 0.4 * pulse})`;
      ctx.beginPath(); ctx.arc(X(x), Y(y), (1.6 + 1.2 * lastHit) * dpr, 0, Math.PI * 2); ctx.fill();
    });
    // Машины — от дальних к ближним, чтобы ближние перекрывали дальние.
    s.cars.sort((p, q) => q.z - p.z);
    s.cars = s.cars.filter((car) => {
      car.z += (car.v * dt) / 1000;
      if (car.z > 20) return false;
      const [x, y] = laneAt(car.lane, car.z);
      const k = 1 / car.z;
      const bw = car.type.w * k;
      const bh = car.type.h * k;
      const appear = clamp((t - car.born) / 500);
      const fade = clamp((20 - car.z) / 8);
      const alpha = appear * fade;
      // Проезд под порталом: лучи датчиков и карточка.
      if (!car.hit && car.z >= car.lane.zc) {
        car.hit = true;
        car.hitT = t;
        s.lastHit = t;
        s.count += 1;
        if (countRef.current) countRef.current.textContent = groupNum(s.count);
        setCard({ id: t, plate: car.plate, cls: car.type.cls, label: car.type.label, kmh: car.kmh, x, y: y - bh });
      }
      const flash = car.hitT ? clamp(1 - (t - car.hitT) / 650) : 0;
      if (flash > 0) {
        SENSORS.forEach(([sx, sy]) => {
          const grad = ctx.createLinearGradient(X(sx), Y(sy), X(x), Y(y - bh));
          grad.addColorStop(0, `rgba(255, 110, 100, ${0.85 * flash})`);
          grad.addColorStop(1, `rgba(125, 211, 252, ${0.65 * flash})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.2 * dpr;
          ctx.beginPath(); ctx.moveTo(X(sx), Y(sy)); ctx.lineTo(X(x - bw * 0.35), Y(y - bh)); ctx.moveTo(X(sx), Y(sy)); ctx.lineTo(X(x + bw * 0.35), Y(y - bh)); ctx.stroke();
        });
      }
      // След движения к камере.
      const [tx, ty] = laneAt(car.lane, Math.max(1.05, car.z * 0.72));
      const trail = ctx.createLinearGradient(X(x), Y(y), X(tx), Y(ty));
      trail.addColorStop(0, `rgba(125, 211, 252, ${0.5 * alpha})`);
      trail.addColorStop(1, 'rgba(125, 211, 252, 0)');
      ctx.strokeStyle = trail;
      ctx.lineWidth = Math.max(1, bw * 0.55 / 100 * w);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(X(x), Y(y - bh * 0.15)); ctx.lineTo(X(tx), Y(ty)); ctx.stroke();
      // Рамка машины: полупрозрачный объём, уголки и задние фонари.
      const hot = car.hit ? 1 : 0;
      const rgb = hot ? '74, 222, 128' : '125, 211, 252';
      const x0 = X(x - bw / 2); const y0 = Y(y - bh); const x1 = X(x + bw / 2); const y1 = Y(y);
      const fill = ctx.createLinearGradient(0, y0, 0, y1);
      fill.addColorStop(0, `rgba(${rgb}, ${0.05 * alpha})`);
      fill.addColorStop(1, `rgba(${rgb}, ${(0.22 + 0.3 * flash) * alpha})`);
      ctx.fillStyle = fill;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      const cl = Math.min(x1 - x0, y1 - y0) * 0.3;
      ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
      ctx.lineWidth = Math.max(1.2 * dpr, 2.4 * dpr * Math.min(1, k * 2.2));
      ctx.shadowColor = `rgba(${rgb}, .9)`;
      ctx.shadowBlur = 6 * dpr;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + cl); ctx.lineTo(x0, y0); ctx.lineTo(x0 + cl, y0);
      ctx.moveTo(x1 - cl, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + cl);
      ctx.moveTo(x1, y1 - cl); ctx.lineTo(x1, y1); ctx.lineTo(x1 - cl, y1);
      ctx.moveTo(x0 + cl, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - cl);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // задние фонари
      const lr = Math.max(1.2 * dpr, (bw / 100) * w * 0.055);
      ctx.fillStyle = `rgba(255, 70, 60, ${0.95 * alpha})`;
      ctx.shadowColor = 'rgba(255, 60, 50, .95)';
      ctx.shadowBlur = 8 * dpr;
      ctx.beginPath();
      ctx.arc(x0 + (x1 - x0) * 0.16, y1 - (y1 - y0) * 0.3, lr, 0, Math.PI * 2);
      ctx.arc(x1 - (x1 - x0) * 0.16, y1 - (y1 - y0) * 0.3, lr, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Пятно на дороге под машиной.
      ctx.fillStyle = `rgba(${rgb}, ${0.22 * alpha})`;
      ctx.beginPath(); ctx.ellipse(X(x), Y(y), (bw / 100) * w * 0.66, (bh / 100) * h * 0.1, -0.12, 0, Math.PI * 2); ctx.fill();
      return true;
    });
  };

  const time = useFrames(awake && !reduced, draw);
  useCanvasSize(canvas, (size) => {
    st.current.size = size;
    if (reduced && !st.current.cars.length) {
      const lane = LANES[1];
      st.current.cars.push({ lane, type: TYPES[0], z: lane.zc + 0.6, v: 0, hit: true, hitT: -1e9, born: -1e9, plate: '01 A 452 KA UZ', kmh: 112 });
      const [x, y] = laneAt(lane, lane.zc + 0.6);
      setCard({ id: 1, plate: '01 A 452 KA UZ', cls: 1, label: TYPES[0].label, kmh: 112, x, y: y - TYPES[0].h / (lane.zc + 0.6) });
    }
    draw(time.current, 0);
  });

  return (
    <div ref={root} className="o-scene o-scene--gt" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <div className="o-gt__stage" style={{ '--a': ASPECT }}>
        <div className="o-gt__kb">
          <Img src={photo} alt="" sizes="(max-width: 900px) 100vw, 55vw" eager className="o-gt__photo" lqip={false}
            {...(own ? null : { onError: () => setFailed(true) })} />
          <canvas ref={canvas} className="o-gt__canvas" />
          {card && own ? (
            <div key={card.id} className="o-gt__card" style={{ left: `${card.x}%`, top: `${card.y}%` }}>
              <div className="o-gt__plate">{card.plate}</div>
              <div className="o-gt__meta">
                <span>{tr('Класс')} {card.cls} · {card.label()}</span>
                <span>{card.kmh} {tr('км/ч')}</span>
              </div>
              <div className="o-gt__paid"><i>✓</i> {tr('Проезд оплачен')}</div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="o-gt__tint" />
      <div className="o-gt__hud">
        <div className="o-gt__chip"><i /> MLFF · {tr('свободный поток')}</div>
        <div className="o-gt__count"><b ref={countRef}>{groupNum(18342)}</b><span>{tr('проездов за сутки')}</span></div>
      </div>
    </div>
  );
}
