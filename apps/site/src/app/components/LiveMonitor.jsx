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
import { Activity } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { localize, MONITOR, PROJECTS, VIOLATION_SOLUTIONS } from '../data/siteData.js';
import { tr } from '../lib/i18n.js';

// Подписи блока берутся из контента — раздел «Мониторинг» в админ-панели.
// Если поля пусты (например, контент старой версии), подставляем прежний
// текст из общего словаря, чтобы блок не остался с пустыми заголовками.
function labelsFor(language) {
  const pick = (field, fallback) => localize(MONITOR[field], language) || tr(fallback);
  return {
    tag: pick('tag', "Мониторинг"),
    title: pick('title', "Комплексы на связи"),
    lead: pick('lead', "Так выглядит работа системы: комплексы фиксируют нарушения и передают материал в центр обработки."),
    feed: pick('feedTitle', "Лента фиксаций"),
    demo: pick('demoLabel', "демонстрация работы"),
    active: pick('activeLabel', "В РАБОТЕ"),
    live: pick('liveLabel', "ЭФИР"),
  };
}

// Четыре плитки с показателями. Их состав и значения тоже правятся
// в админ-панели, поэтому здесь только чтение.
function statsFor(language) {
  const list = Array.isArray(MONITOR.stats) ? MONITOR.stats : [];
  return list
    .map((item) => ({
      key: localize(item.label, language),
      value: localize(item.value, language),
      note: localize(item.note, language),
    }))
    .filter((item) => item.key || item.value);
}


// Номер для строки ленты.
//
// Сначала смотрим список, вписанный в админ-панели: если он есть, берём
// номера только оттуда. Списка нет — собираем по шаблону, где # это цифра,
// L это буква, а остальные знаки остаются как есть. По умолчанию выходит
// узбекский вид: 01 A 123 AA.
function makePlate() {
  const setup = MONITOR.plate || {};

  const own = (Array.isArray(setup.list) ? setup.list : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  if (own.length) return own[Math.floor(Math.random() * own.length)];

  const letters = String(setup.letters || 'ABCEHKMPTX');
  const pattern = String(setup.pattern || '## L ### LL');
  return pattern.replace(/[#L]/g, (ch) => (ch === '#'
    ? String(Math.floor(Math.random() * 10))
    : letters[Math.floor(Math.random() * letters.length)] || 'A'));
}

function formatClock(date) {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Положение отметок и момент вспышки. Задержка подобрана так, чтобы
// точка загоралась ровно тогда, когда луч проходит через её сектор:
// полный оборот — 4 секунды, значит каждая четверть круга это 1 секунда.
// Полный оборот луча.
const SWEEP_SECONDS = 4;

// Отметки целей заданы в процентах от размера радара (центр — 50/50).
const BLIP_POSITIONS = [
  { top: 25, left: 62 },
  { top: 64, left: 68 },
  { top: 70, left: 34 },
  { top: 38, left: 26 },
];

// Момент вспышки считается из положения точки, а не подбирается на глаз.
// Луч стартует направленным вправо и идёт по часовой стрелке, значит
// точка загорается, когда он доходит до её угла.
const BLIPS = BLIP_POSITIONS.map((blip) => {
  const dx = blip.left - 50;
  const dy = blip.top - 50;
  // Угол по часовой стрелке от направления «вверх», 0…360.
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const clockwise = (angle + 360) % 360;
  // Луч в начале смотрит вправо — это 90 градусов от «вверх».
  const fromStart = (clockwise - 90 + 360) % 360;
  return { ...blip, delay: (fromStart / 360) * SWEEP_SECONDS };
});

export function LiveMonitor() {
  const { language } = useSite();
  const t = labelsFor(language);
  const stats = statsFor(language);

  // Виды нарушений и участки берём из контента сайта — тогда лента
  // автоматически переводится вместе с ним.
  const kinds = useMemo(() => {
    // Список задаётся в админ-панели. Если он пуст, берём заголовки
    // из раздела «Задачи» — так лента не окажется пустой на старом контенте.
    const own = (MONITOR.kinds || []).map((item) => localize(item, language)).filter(Boolean);
    if (own.length) return own;
    return VIOLATION_SOLUTIONS.map((item) => localize(item.title, language)).filter(Boolean);
  }, [language]);
  const places = useMemo(() => {
    const own = (MONITOR.places || []).map((item) => localize(item, language)).filter(Boolean);
    if (own.length) return own;
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
              {stats.map((item) => (
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
          {/* Рисуем через SVG, а не градиентами: здесь угол сектора задаётся
              числом, а не подбирается на глаз, и картинка одинаково выглядит
              во всех браузерах. */}
          <div className="flex justify-center">
            <div className="relative aspect-square w-full max-w-[20rem]">
              <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
                <defs>
                  {/* Шлейф: у линии яркий, к хвосту сходит на нет */}
                  <linearGradient id="olan-radar-trail" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgb(34,211,238)" stopOpacity="0" />
                    <stop offset="100%" stopColor="rgb(34,211,238)" stopOpacity="0.30" />
                  </linearGradient>
                  <radialGradient id="olan-radar-fade">
                    <stop offset="55%" stopColor="#fff" stopOpacity="1" />
                    <stop offset="100%" stopColor="#fff" stopOpacity="0.25" />
                  </radialGradient>
                  <mask id="olan-radar-mask">
                    <circle cx="100" cy="100" r="92" fill="url(#olan-radar-fade)" />
                  </mask>
                </defs>

                {/* Кольца дальности */}
                {[92, 69, 46, 23].map((r) => (
                  <circle key={r} cx="100" cy="100" r={r} fill="none"
                    stroke="rgb(34,211,238)" strokeOpacity="0.18" strokeWidth="1" />
                ))}
                <line x1="100" y1="8" x2="100" y2="192" stroke="rgb(34,211,238)" strokeOpacity="0.10" strokeWidth="1" />
                <line x1="8" y1="100" x2="192" y2="100" stroke="rgb(34,211,238)" strokeOpacity="0.10" strokeWidth="1" />

                {/* Луч со шлейфом. Сектор в 70 градусов идёт ПОЗАДИ линии:
                    дуга начинается на 70° раньше и приходит точно к ней. */}
                <g className="olan-radar-rotate" style={{ transformOrigin: '100px 100px' }} mask="url(#olan-radar-mask)">
                  <path
                    d="M100,100 L131.5,13.5 A92,92 0 0,1 192,100 Z"
                    fill="url(#olan-radar-trail)"
                  />
                  <line x1="100" y1="100" x2="192" y2="100"
                    stroke="rgb(34,211,238)" strokeWidth="1.5" strokeOpacity="0.95" />
                  <circle cx="192" cy="100" r="2.5" fill="rgb(34,211,238)" opacity="0.9" />
                </g>

                {/* Отметки целей */}
                {BLIPS.map((blip, index) => (
                  <circle
                    key={index}
                    cx={blip.left * 2}
                    cy={blip.top * 2}
                    r="3"
                    fill="rgb(103,232,249)"
                    className="olan-radar-blip"
                    style={{ animationDelay: `${blip.delay}s` }}
                  />
                ))}

                <circle cx="100" cy="100" r="2" fill="rgb(34,211,238)" opacity="0.6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
