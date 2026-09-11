// ---------------------------------------------------------------------------
// Блок мониторинга на главной странице.
//
// Слева — характеристики комплексов и лента фиксаций, которая обновляется
// каждую секунду. Справа — радар с разворачивающимся лучом.
//
// ВАЖНО про ленту: это демонстрация работы системы, а не реальные данные
// с комплексов. Номера, скорости и участки генерируются на стороне браузера
// из уже имеющегося контента сайта — списка решений и списка проектов.
// Когда появится настоящий поток фиксаций, достаточно заменить функцию
// makeEvent на запрос к серверу — вся остальная разметка останется прежней.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Radio } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { localize, PROJECTS, VIOLATION_SOLUTIONS } from '../data/siteData.js';

// Подписи блока на языках сайта. В контенте их нет, поэтому держим рядом.
const LABELS = {
  ru: {
    tag: 'Мониторинг',
    title: 'Комплексы на связи',
    lead: 'Так выглядит работа системы: комплексы фиксируют нарушения и передают материал в центр обработки.',
    feed: 'Лента фиксаций',
    demo: 'демонстрация работы',
    active: 'В РАБОТЕ',
    live: 'ЭФИР',
    speed: 'Скорость обработки',
    speedNote: 'от момента фиксации',
    uptime: 'Доступность',
    uptimeNote: 'работа без простоев',
    resolution: 'Разрешение',
    resolutionNote: 'съёмка в любую погоду',
    channel: 'Канал передачи',
    channelNote: 'защищённое соединение',
  },
  uz: {
    tag: 'Monitoring', title: 'Majmualar aloqada',
    lead: 'Tizim shunday ishlaydi: majmualar qoidabuzarliklarni qayd etadi va materialni markazga uzatadi.',
    feed: 'Qayd etish lentasi', demo: 'namoyish', active: 'ISHLAMOQDA', live: 'EFIR',
    speed: 'Qayta ishlash tezligi', speedNote: 'qayd etilgan paytdan',
    uptime: 'Ishonchlilik', uptimeNote: 'uzluksiz ishlash',
    resolution: 'Aniqlik', resolutionNote: 'har qanday ob-havoda',
    channel: 'Uzatish kanali', channelNote: 'himoyalangan ulanish',
  },
  en: {
    tag: 'Monitoring', title: 'Systems online',
    lead: 'This is how the system works: units record violations and send the evidence to the processing centre.',
    feed: 'Detection feed', demo: 'demo data', active: 'ACTIVE', live: 'LIVE',
    speed: 'Processing speed', speedNote: 'from the moment of capture',
    uptime: 'Uptime', uptimeNote: 'continuous operation',
    resolution: 'Resolution', resolutionNote: 'capture in any weather',
    channel: 'Data channel', channelNote: 'encrypted connection',
  },
};

function labelsFor(language) {
  return LABELS[language] || LABELS.ru;
}

const TECH = (t) => ([
  { key: t.speed, value: '< 80 мс', note: t.speedNote },
  { key: t.uptime, value: '99,97%', note: t.uptimeNote },
  { key: t.resolution, value: '4K HDR', note: t.resolutionNote },
  { key: t.channel, value: 'AES-256', note: t.channelNote },
]);

// Номер в узбекском формате: 01 A 123 AA
function makePlate() {
  const letters = 'ABCEHKMPTX';
  const pick = () => letters[Math.floor(Math.random() * letters.length)];
  const region = String(Math.floor(Math.random() * 90) + 10);
  return `${region} ${pick()} ${String(Math.floor(Math.random() * 900) + 100)} ${pick()}${pick()}`;
}

function formatClock(date) {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Положение отметок и момент вспышки. Задержка подобрана так, чтобы
// точка загоралась ровно тогда, когда луч проходит через её сектор:
// полный оборот — 4 секунды, значит каждая четверть круга это 1 секунда.
const BLIPS = [
  { top: '25%', left: '62%', delay: 0.6 },
  { top: '64%', left: '68%', delay: 1.7 },
  { top: '70%', left: '34%', delay: 2.6 },
  { top: '38%', left: '26%', delay: 3.4 },
];

export function LiveMonitor() {
  const { language } = useSite();
  const t = labelsFor(language);

  // Виды нарушений и участки берём из контента сайта — тогда лента
  // автоматически переводится вместе с ним.
  const kinds = useMemo(
    () => VIOLATION_SOLUTIONS.map((item) => localize(item.title, language)).filter(Boolean),
    [language],
  );
  const places = useMemo(() => {
    const list = PROJECTS.map((p) => localize(p.location, language) || localize(p.title, language)).filter(Boolean);
    return list.length ? list : ['—'];
  }, [language]);

  const [events, setEvents] = useState([]);
  const counterRef = useRef(0);

  useEffect(() => {
    if (!kinds.length) return undefined;

    const makeEvent = () => {
      counterRef.current += 1;
      return {
        id: counterRef.current,
        at: formatClock(new Date()),
        plate: makePlate(),
        kind: kinds[Math.floor(Math.random() * kinds.length)],
        place: places[Math.floor(Math.random() * places.length)],
        speed: Math.floor(Math.random() * 70) + 65,
      };
    };

    // Заполняем ленту сразу, чтобы блок не выглядел пустым.
    setEvents(Array.from({ length: 5 }, makeEvent).reverse());

    // Новая строка раз в секунду, храним последние шесть.
    const timer = setInterval(() => {
      setEvents((list) => [makeEvent(), ...list].slice(0, 6));
    }, 1000);

    return () => clearInterval(timer);
  }, [kinds, places]);

  return (
    <section id="monitoring" className="relative overflow-hidden bg-slate-50 py-20 transition-colors dark:bg-[#040c1a]">
      <div className="olan-grid absolute inset-0 opacity-60 dark:opacity-100" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-50 to-transparent dark:from-black" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mb-10 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-600 dark:text-cyan-400">
            // {t.tag}
          </div>
          <h2 className="mt-3 text-3xl font-black text-slate-900 dark:text-white md:text-4xl">
            {t.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-600 dark:text-slate-400">
            {t.lead}
          </p>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* ------------------------- Слева ------------------------- */}
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {TECH(t).map((item) => (
                <div key={item.key}
                  className="olan-card rounded-2xl border border-slate-200 dark:border-cyan-500/20 bg-white p-5 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-600/70 dark:text-cyan-400/60">
                    {item.key}
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">{item.value}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.note}</div>
                </div>
              ))}
            </div>

            {/* Лента фиксаций */}
            <div className="olan-card mt-4 rounded-2xl border border-slate-200 dark:border-cyan-500/20 bg-white p-5 dark:bg-slate-950/70">
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
                  <Activity className="h-3.5 w-3.5" /> {t.feed}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="olan-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  {t.demo}
                </span>
              </div>

              <div className="space-y-0.5">
                {events.map((event) => (
                  <div key={event.id}
                    className="olan-row-in flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-200 dark:border-cyan-500/10 py-2 text-sm last:border-0">
                    <span className="font-mono text-xs text-cyan-600 dark:text-cyan-400">{event.at}</span>
                    <span className="rounded border border-slate-300 px-1.5 py-0.5 font-mono text-xs tracking-wider text-slate-700 dark:border-slate-700 dark:text-slate-200">
                      {event.plate}
                    </span>
                    <span className="truncate text-slate-600 dark:text-slate-300">{event.kind}</span>
                    <span className="ml-auto whitespace-nowrap text-xs text-slate-600 dark:text-slate-500">
                      {event.place}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ------------------------- Справа: радар ------------------------- */}
          <div className="flex justify-center">
            <div className="relative h-72 w-72 md:h-80 md:w-80">
              {[1, 0.75, 0.5, 0.25].map((scale, index) => (
                <div key={index}
                  className="absolute rounded-full border border-slate-200 dark:border-cyan-500/20"
                  style={{
                    width: `${scale * 100}%`, height: `${scale * 100}%`,
                    top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  }}
                />
              ))}

              <div className="absolute bottom-0 left-1/2 top-0 w-px bg-cyan-500/10" />
              <div className="absolute left-0 right-0 top-1/2 h-px bg-cyan-500/10" />

              {/* Луч радара.
                  Линия смотрит вправо, вращение идёт по часовой стрелке.
                  Шлейф в conic-gradient отсчитывается от верха элемента,
                  поэтому сектор 0…90 градусов — это ровно то, что луч
                  уже прошёл. Так хвост оказывается позади линии, а не
                  впереди неё, как было раньше. */}
              <div className="olan-sweep-line absolute inset-0">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: [
                      'conic-gradient(from 0deg,',
                      'rgba(34,211,238,0) 0deg,',
                      'rgba(34,211,238,0.03) 30deg,',
                      'rgba(34,211,238,0.10) 60deg,',
                      'rgba(34,211,238,0.22) 80deg,',
                      'rgba(34,211,238,0.34) 89deg,',
                      'rgba(34,211,238,0) 90deg)',
                    ].join(' '),
                    // К краю свечение слабеет — как на настоящем экране,
                    // где сигнал у центра плотнее.
                    maskImage: 'radial-gradient(circle at center, #000 25%, rgba(0,0,0,0.55) 75%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(circle at center, #000 25%, rgba(0,0,0,0.55) 75%, transparent 100%)',
                  }}
                />
                <div
                  className="absolute left-1/2 top-1/2 h-px w-1/2 origin-left"
                  style={{
                    background: 'linear-gradient(90deg, rgba(34,211,238,0.95), rgba(34,211,238,0.15))',
                    boxShadow: '0 0 10px rgba(34,211,238,0.7)',
                  }}
                />
              </div>

              {/* Отметки целей. Луч делает круг за 4 секунды, поэтому каждая
                  точка вспыхивает в тот момент, когда он до неё доходит,
                  и затем медленно гаснет — как на настоящем радаре. */}
              {BLIPS.map((blip, index) => (
                <span
                  key={index}
                  className="absolute"
                  style={{ top: blip.top, left: blip.left }}
                >
                  <span
                    className="olan-blip relative block h-2 w-2 rounded-full bg-cyan-300"
                    style={{ animationDelay: `${blip.delay}s` }}
                  />
                </span>
              ))}

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
