// ---------------------------------------------------------------------------
// Единый бэк-офис: проезды с порталов и бортовых устройств в одном окне.
//
// Окно бэк-офиса живёт в реальном времени, и все цифры в нём согласованы:
//   • часы идут посекундно, проезды приходят с тем же темпом, что и на
//     графике (вечерний час пик — примерно один проезд в 2–3 секунды);
//   • у каждого проезда своё устройство и свой путь оплаты: DSRC и RFID —
//     списание со счёта, ANPR — оплата картой, абонемент или счёт
//     пользователю, GNSS — списание по пройденному пути, иностранный
//     транзит с бортовым устройством — взаиморасчёт с оператором (EETS);
//   • тариф зависит от класса машины, сумма в ленте — по тарифу;
//   • каждый проезд прибавляется к счётчикам: проезды, выручка (только
//     реально списанные деньги), выставленные счета, доля автоматической
//     оплаты; столбец текущего часа на графике растёт на тот же проезд;
//   • в нижней строке подсвечивается модуль, который обработал проезд.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from 'react';
import { tr, uiLanguage } from '../../lib/i18n.js';
import { groupNum, useAwake, useReducedMotion } from './engine.js';
import './scenes.css';

// Суточный поток (машин в час) на участке: утренний и вечерний пик.
const FLOW = [180, 120, 95, 90, 120, 260, 640, 1180, 1420, 1210, 980, 920, 960, 1010, 1060, 1140, 1320, 1560, 1480, 1120, 820, 610, 420, 300];
const START = 17 * 3600 + 41 * 60 + 20; // 17:41:20 — вечерний час пик
// Тарифы по классам, сум. GNSS — по пройденному пути (46 км участка).
const TARIFF = { 1: 5000, 2: 10000, 3: 15000, 4: 25000 };
const GNSS_RATE = { 3: 410, 4: 550 };
const KM = 46;
// Пути оплаты: модуль бэк-офиса, тон строки и что попадает в выручку.
const PAY = {
  account: { m: 'billing', tone: 'green', label: () => tr('Списано со счёта'), paid: true },
  card: { m: 'gateway', tone: 'green', label: () => tr('Оплачено картой'), paid: true },
  sub: { m: 'crm', tone: 'green', label: () => tr('Абонемент'), paid: false },
  invoice: { m: 'invoice', tone: 'amber', label: () => tr('Счёт выставлен'), paid: false },
  obu: { m: 'obu', tone: 'green', label: () => tr('Списано по GNSS'), paid: true },
  eets: { m: 'eets', tone: 'sky', label: () => tr('Взаиморасчёт'), paid: true },
};
const MODULES = [
  { id: 'billing', label: () => tr('Биллинг') },
  { id: 'gateway', label: () => tr('Платёжный шлюз') },
  { id: 'crm', label: () => 'CRM' },
  { id: 'invoice', label: () => tr('Выставление счетов') },
  { id: 'collect', label: () => tr('Взыскание') },
  { id: 'obu', label: () => tr('Управление OBU') },
  { id: 'eets', label: () => 'EETS' },
];
// Лента проездов: номер, класс, устройство, путь оплаты. Узбекские номера —
// частные «01 A 482 KB» и служебные «30 712 SAA»; транзит — KZ и RU.
const FEED = [
  ['01 A 482 KB', 1, 'DSRC', 'account'],
  ['10 B 917 CA', 1, 'ANPR', 'card'],
  ['30 712 SAA', 4, 'GNSS', 'obu'],
  ['01 R 205 MA', 1, 'RFID', 'account'],
  ['40 K 337 HA', 2, 'ANPR', 'invoice'],
  ['486 FTG 04 KZ', 4, 'OBU', 'eets'],
  ['01 S 774 TA', 1, 'ANPR', 'sub'],
  ['80 621 BAA', 3, 'DSRC', 'account'],
  ['10 L 058 OA', 1, 'RFID', 'account'],
  ['01 D 903 EA', 1, 'ANPR', 'card'],
  ['20 418 AAA', 4, 'GNSS', 'obu'],
  ['70 Y 146 PA', 2, 'ANPR', 'invoice'],
  ['01 M 530 NA', 1, 'DSRC', 'account'],
  ['X280KE 116 RUS', 4, 'OBU', 'eets'],
  ['25 Q 712 LA', 1, 'ANPR', 'card'],
  ['01 B 266 AB', 1, 'RFID', 'account'],
  ['60 389 FAA', 3, 'GNSS', 'obu'],
  ['10 Z 641 UA', 1, 'ANPR', 'sub'],
  ['01 V 087 GA', 1, 'DSRC', 'account'],
  ['95 N 452 CA', 2, 'ANPR', 'invoice'],
  ['50 T 718 KA', 1, 'ANPR', 'card'],
  ['01 E 349 RA', 1, 'DSRC', 'account'],
  ['90 507 OAA', 4, 'GNSS', 'obu'],
  ['01 J 615 DA', 1, 'RFID', 'account'],
];
// Интервалы между проездами, с: в среднем 2,4 с — это 1 500 машин в час.
const GAPS = [2, 3, 2, 2, 3, 2, 3, 2, 3, 2];

function amountOf(cls, pay) {
  if (pay === 'sub') return 0;
  if (pay === 'obu') return Math.round((GNSS_RATE[cls] || 550) * KM / 100) * 100;
  return TARIFF[cls];
}

// Номер для n-го проезда: на втором круге ленты цифры другие.
function plateOf(n) {
  const base = FEED[n % FEED.length][0];
  const round = Math.floor(n / FEED.length);
  if (!round) return base;
  return base.replace(/\b(\d{3})\b/, (d) => String((Number(d) + 137 * round) % 1000).padStart(3, '0'));
}

// Время появления n-го проезда (секунды от полуночи).
const timeOf = (n) => {
  let s = START + 2;
  for (let i = 0; i < n; i++) s += GAPS[i % GAPS.length];
  return s;
};

// Что было до начала сцены: всё за прошедшие часы и минуты текущего часа.
const BASE_PASSES = FLOW.slice(0, Math.floor(START / 3600)).reduce((a, b) => a + b, 0) + Math.round(FLOW[Math.floor(START / 3600)] * ((START % 3600) / 3600));
const START_H = Math.floor(START / 3600);
const BASE_HOUR = Math.round(FLOW[START_H] * ((START % 3600) / 3600));
const BASE_INVOICES = Math.round(BASE_PASSES * 0.021);
const BASE_REVENUE = BASE_PASSES * 7400;

const p2 = (x) => String(x).padStart(2, '0');
const hms = (s) => `${p2(Math.floor(s / 3600) % 24)}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}`;

function useSceneClock(awake, still) {
  const [sec, setSec] = useState(still ? START + 40 : START);
  useEffect(() => {
    if (!awake || still) return undefined;
    const id = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [awake, still]);
  return sec;
}

export default function TollBackoffice() {
  const root = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const sec = useSceneClock(awake, reduced);

  // Сколько проездов уже пришло к этой секунде.
  const count = useMemo(() => {
    let n = 0;
    while (timeOf(n) <= sec) n += 1;
    return n;
  }, [sec]);

  // Счётчики — сумма того, что было до начала сцены, и пришедших проездов.
  const stats = useMemo(() => {
    let passes = BASE_PASSES;
    let invoices = BASE_INVOICES;
    let revenue = BASE_REVENUE;
    const hours = { [START_H]: BASE_HOUR };
    for (let n = 0; n < count; n++) {
      const [, cls, , pay] = FEED[n % FEED.length];
      const h = Math.floor(timeOf(n) / 3600) % 24;
      hours[h] = (hours[h] || 0) + 1;
      passes += 1;
      if (pay === 'invoice') invoices += 1;
      if (PAY[pay].paid) revenue += amountOf(cls, pay);
    }
    return { passes, invoices, revenue, hours, auto: ((passes - invoices) / passes) * 100 };
  }, [count]);

  // четыре последних проезда, новый — сверху
  const rows = [0, 1, 2, 3].map((k) => count - 1 - k).filter((n) => n >= 0).map((n) => {
    const [, cls, src, pay] = FEED[n % FEED.length];
    return { n, plate: plateOf(n), cls, src, pay, t: timeOf(n), amount: amountOf(cls, pay) };
  });
  const active = rows[0] ? PAY[rows[0].pay].m : '';
  const curH = Math.floor(sec / 3600) % 24;
  const hourNow = stats.hours[curH] || 0;
  // столбцы: прошедшие часы — по суточному потоку, часы сцены — по факту,
  // будущие — бледным прогнозом
  const barOf = (h) => (h < START_H ? FLOW[h] : h <= curH ? stats.hours[h] || 0 : FLOW[h]);
  const dot = ['en', 'zh'].includes(uiLanguage()) ? '.' : ',';
  const dec = (v, d) => v.toFixed(d).replace('.', dot);

  return (
    <div ref={root} className="o-scene o-scene--bo" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <div className="o-bo__win">
        <div className="o-bo__bar">
          <b>{tr('Бэк-офис')}</b>
          <span>{tr('Проезды')} · {tr('сегодня')}</span>
          <em><i /> {hms(sec)}</em>
        </div>
        <div className="o-bo__kpi">
          <div><span>{tr('Проезды')}</span><b>{groupNum(stats.passes)}</b></div>
          <div><span>{tr('Оплачено автоматически')}</span><b>{dec(stats.auto, 1)}%</b></div>
          <div><span>{tr('Выручка')}</span><b>{dec(stats.revenue / 1e6, 2)} <small>{tr('млн сум')}</small></b></div>
          <div className="is-amber"><span>{tr('Счета выставлены')}</span><b>{groupNum(stats.invoices)}</b></div>
        </div>
        <div className="o-bo__body">
          <div className="o-bo__chart">
            <div className="o-bo__ct">{tr('Поток по часам')}</div>
            <div className="o-bo__plot">
              {FLOW.map((v, h) => {
                const now = h === curH;
                const val = barOf(h);
                return (
                  <i key={h} className={now ? 'is-now' : h > curH ? 'is-next' : ''} style={{ height: `${(val / 1600) * 100}%` }}>
                    {now ? <em>{p2(h)}:00 · {groupNum(hourNow)}</em> : null}
                  </i>
                );
              })}
            </div>
            <div className="o-bo__hours"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
          </div>
          <div className="o-bo__feed">
            {rows.map((r, i) => (
              <div key={r.n} className={`o-bo__row${i ? ' is-old' : ''}`} data-tone={PAY[r.pay].tone} style={{ '--i': i }}>
                <div className="o-bo__l1">
                  <b>{r.plate}</b>
                  <span className="o-bo__src">{r.src}</span>
                  <time>{hms(r.t)}</time>
                </div>
                <div className="o-bo__l2">
                  <span className="o-bo__pay">{PAY[r.pay].label()}</span>
                  <span className="o-bo__cls">{tr('Кл.')}&nbsp;{r.cls}{r.pay === 'obu' ? ` · ${KM} ${tr('км')}` : ''}</span>
                  <span className="o-bo__sum">{r.amount ? `${groupNum(r.amount)} ${tr('сум')}` : '—'}</span>
                </div>
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
