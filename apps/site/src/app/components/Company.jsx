// ---------------------------------------------------------------------------
// «Кто мы» — блок о компании на главной странице.
//
// Отвечает на два вопроса, которые задаёт любой серьёзный заказчик в первые
// секунды: что это за компания и к чему она стремится. Дальше идут три опоры
// группы и цифры, подтверждающие масштаб.
// ---------------------------------------------------------------------------

import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { Quote, ArrowRight } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { localize, COMPANY, COMPANY_STATS } from '../data/siteData.js';
import { AnimatedNumber } from './AnimatedNumber.jsx';

function PillarIcon({ name, className }) {
  const Component = Icons[name] || Icons.Circle;
  return <Component className={className} />;
}

export function Company({ onAbout }) {
  const { language } = useSite();
  const company = COMPANY || {};
  const pillars = company.pillars || [];

  return (
    <section id="company" className="relative overflow-hidden bg-white py-24 transition-colors dark:bg-black">
      <div className="container mx-auto px-4">
        <div className="mb-14 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-400">
            О компании
          </div>
          <h2 className="mt-4 text-4xl font-black text-slate-900 dark:text-white md:text-5xl">
            Кто мы
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-700 dark:text-slate-300">
            {localize(company.tagline, language)}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {(company.badges || []).map((badge, index) => (
              <span key={index}
                className="rounded-full border border-slate-300 bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-700 dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-200">
                {localize(badge, language)}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="space-y-5"
          >
            <p className="text-lg leading-8 text-slate-800 dark:text-slate-200">{localize(company.intro, language)}</p>
            <p className="leading-8 text-slate-700 dark:text-slate-300">{localize(company.what, language)}</p>
            <p className="leading-8 text-slate-700 dark:text-slate-300">{localize(company.how, language)}</p>

            {/* К чему стремимся */}
            <div className="olan-card relative overflow-hidden rounded-3xl border border-cyan-600/25 bg-gradient-to-br from-cyan-50 to-blue-50 p-6 dark:border-cyan-500/25 dark:from-slate-950 dark:to-slate-900">
              <Quote className="absolute right-5 top-5 h-8 w-8 text-cyan-600/20 dark:text-cyan-400/20" />
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800 dark:text-cyan-300">
                К чему стремимся
              </div>
              <p className="mt-3 text-lg font-medium leading-8 text-slate-900 dark:text-white">
                {localize(company.mission, language)}
              </p>
            </div>

            <div className="rounded-2xl border-l-4 border-cyan-600 bg-slate-100 p-5 text-sm leading-7 text-slate-800 dark:border-cyan-500 dark:bg-slate-900 dark:text-slate-300">
              {localize(company.focus, language)}
            </div>

            {onAbout && (
              <button type="button" onClick={onAbout}
                className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition-all hover:gap-3 dark:text-cyan-400">
                Подробнее о компании <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            {pillars.map((pillar) => (
              <div key={pillar.id}
                className="olan-card flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-cyan-500/15 dark:bg-slate-950/70">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                  <PillarIcon name={pillar.icon} className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{localize(pillar.title, language)}</div>
                  <div className="mt-1.5 leading-7 text-slate-700 dark:text-slate-400">{localize(pillar.text, language)}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Цифры группы */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>
    </section>
  );
}
