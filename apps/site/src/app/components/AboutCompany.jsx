// ---------------------------------------------------------------------------
// «О компании» — единственная страница, с которой начинается знакомство.
//
// Сначала кто мы и к чему стремимся: производитель комплексов и
// технологический партнёр полного цикла — раньше это были два разных
// блока, теперь один связный текст.
//
// Ниже — карточки разделов. Раньше они висели подменю в шапке, что для
// незнакомого посетителя выглядело как список без объяснений. Карточкой
// понятнее: видно название, короткое пояснение и куда ведёт.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { ArrowRight, Quote } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { localize, COMPANY, COMPANY_STATS } from '../data/siteData.js';
import { AnimatedNumber } from './AnimatedNumber.jsx';
import { PillarDetail } from './PillarDetail.jsx';

function Icon({ name, className }) {
  const Component = Icons[name] || Icons.Circle;
  return <Component className={className} />;
}

// Разделы, которые раньше были подпунктами меню.
const SECTIONS = [
  {
    id: 'directions', icon: 'Layers', target: 'directions',
    title: 'Направления деятельности',
    text: 'Семь направлений: от фиксации нарушений и видеоаналитики до городских платформ, связи и локализации производства.',
  },
  {
    id: 'engagement', icon: 'Route', target: 'engagement',
    title: 'Модели сотрудничества',
    text: 'В какой роли компания входит в проект: разработчик, производитель, интегратор, оператор или технологический партнёр.',
  },
  {
    id: 'workflow', icon: 'Workflow', target: 'workflow',
    title: 'Как мы работаем',
    text: 'Десять этапов инфраструктурного проекта — от обследования площадки до интеграции с государственными системами и сервиса по SLA.',
  },
  {
    id: 'team', icon: 'UsersRound', target: 'team',
    title: 'Команда и компетенции',
    text: 'Разработка, электроника, метрология, полевая инфраструктура, проектный офис и коммерциализация в одном контуре ответственности.',
  },
  {
    id: 'projects', icon: 'Building2', target: 'projects',
    title: 'Реализованные проекты',
    text: 'Объекты, где комплексы уже работают: магистрали, перекрёстки, выделенные полосы и железнодорожные переезды.',
  },
  {
    id: 'cases', icon: 'Lightbulb', target: 'cases',
    title: 'Задачи заказчика',
    text: 'Десять типичных ситуаций и услуга, которая закрывает каждую. Найдите свою — рядом будет решение.',
  },
];

export function AboutCompany({ onNavigate }) {
  const { language } = useSite();
  const company = COMPANY || {};
  const pillars = company.pillars || [];
  // Какая опора раскрыта поверх страницы.
  const [openPillar, setOpenPillar] = useState(null);

  return (
    <div className="bg-white pt-24 transition-colors dark:bg-black">
      <PillarDetail pillar={openPillar} onClose={() => setOpenPillar(null)} />
      {/* ─────────────────────────── Кто мы ─────────────────────────── */}
      <section className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        <div className="container mx-auto px-4 py-14">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-400">
            О компании
          </div>
          <h1 className="mt-3 font-black text-slate-900 dark:text-white">
            Производитель комплексов и технологический партнёр полного цикла
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-700 dark:text-slate-300">
            {localize(company.tagline, language)}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {(company.badges || []).map((badge, index) => (
              <span key={index}
                className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-200">
                {localize(badge, language)}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5 }}
            className="space-y-5"
          >
            {/* Объединённый текст: кто мы и что именно производим */}
            <p className="text-lg leading-8 text-slate-800 dark:text-slate-200">
              {localize(company.intro, language)}
            </p>
            <p className="leading-8 text-slate-700 dark:text-slate-300">
              Мы производим программно-аппаратные комплексы фиксации нарушений ПДД — от схемотехники
              и встроенного программного обеспечения до серийной сборки и выпускного контроля качества.
              Это собственная разработка, а не перепродажа чужого оборудования под своей маркой.
            </p>
            <p className="leading-8 text-slate-700 dark:text-slate-300">
              {localize(company.what, language)}
            </p>
            <p className="leading-8 text-slate-700 dark:text-slate-300">
              {localize(company.how, language)}
            </p>

            <div className="olan-card relative overflow-hidden rounded-3xl border border-cyan-600/25 bg-gradient-to-br from-cyan-50 to-blue-50 p-6 dark:border-cyan-500/25 dark:from-slate-950 dark:to-slate-900">
              <Quote className="absolute right-5 top-5 h-8 w-8 text-cyan-600/20 dark:text-cyan-400/20" />
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800 dark:text-cyan-300">
                К чему стремимся
              </div>
              <p className="mt-3 text-lg font-medium leading-8 text-slate-900 dark:text-white">
                {localize(company.mission, language)}
              </p>
            </div>

            <div className="rounded-2xl border-l-4 border-cyan-600 bg-slate-100 p-5 leading-7 text-slate-800 dark:border-cyan-500 dark:bg-slate-900 dark:text-slate-300">
              {localize(company.focus, language)}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            {pillars.map((pillar) => (
              <button key={pillar.id} type="button"
                onClick={() => setOpenPillar(pillar)}
                className="olan-card flex w-full items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left dark:border-cyan-500/15 dark:bg-slate-950/70">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                  <Icon name={pillar.icon} className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{localize(pillar.title, language)}</div>
                  <div className="mt-1.5 leading-7 text-slate-700 dark:text-slate-400">{localize(pillar.text, language)}</div>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 dark:text-cyan-400">
                    Подробнее <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </button>
            ))}
          </motion.div>
        </div>

        {/* Цифры группы */}
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(COMPANY_STATS || []).map((stat) => (
            <div key={stat.id}
              className="olan-card rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-cyan-500/15 dark:bg-slate-950/70">
              <AnimatedNumber
                value={stat.value}
                className="block bg-gradient-to-r from-cyan-600 to-blue-700 bg-clip-text text-4xl font-black text-transparent dark:from-cyan-400 dark:to-blue-500"
              />
              <div className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-400">
                {localize(stat.label, language)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ────────────────── Разделы о компании карточками ────────────────── */}
      <section className="bg-slate-100 py-16 transition-colors dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <h2 className="font-black text-slate-900 dark:text-white">Подробнее о компании</h2>
          <p className="mt-3 max-w-3xl leading-8 text-slate-700 dark:text-slate-400">
            Шесть разделов с деталями. Нажмите на карточку — откроется отдельная страница.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SECTIONS.map((section, index) => (
              <motion.button
                key={section.id}
                type="button"
                onClick={() => onNavigate(section.target)}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.25) }}
                className="olan-card flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 text-left dark:border-cyan-500/15 dark:bg-black"
              >
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                  <Icon name={section.icon} className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{section.title}</h3>
                <p className="mt-3 flex-1 leading-7 text-slate-700 dark:text-slate-400">{section.text}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-cyan-700 dark:text-cyan-400">
                  Открыть <ArrowRight className="h-4 w-4" />
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
