// ---------------------------------------------------------------------------
// «Задачи заказчика» — проблема и услуга, которая её закрывает.
//
// Компания занимается не только фиксацией нарушений: городской
// видеомониторинг, платформы данных, связь, взимание платы за проезд,
// мониторинг с БПЛА, блокчейн-инфраструктура и биржа реальных активов.
// Этот раздел показывает весь спектр через боль заказчика, а не через
// список технологий: человек находит свою ситуацию и видит, чем закрыть.
// ---------------------------------------------------------------------------

import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { localize, SERVICE_CASES } from '../data/siteData.js';

function CaseIcon({ name, className }) {
  const Component = Icons[name] || Icons.Circle;
  return <Component className={className} />;
}

export function ServiceCases({ onOpen, compact }) {
  const { language } = useSite();
  const items = SERVICE_CASES || [];

  return (
    <section id="services" className="relative overflow-hidden bg-white py-24 transition-colors dark:bg-black">
      <div className="container mx-auto px-4">
        {!compact && (
          <div className="mb-12 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-400">
              Задачи заказчика
            </div>
            <h2 className="mt-4 text-4xl font-black text-slate-900 dark:text-white md:text-5xl">
              С чем к нам приходят
            </h2>
            <p className="mx-auto mt-4 max-w-3xl leading-8 text-slate-700 dark:text-slate-400">
              Найдите свою ситуацию — рядом стоит услуга, которая её закрывает.
              Фиксация нарушений это только одно из направлений.
            </p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.25) }}
              className="olan-card flex h-full flex-col rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-cyan-500/15 dark:bg-slate-950/70"
            >
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                  <CaseIcon name={item.icon} className="h-6 w-6 text-white" />
                </span>
                <h3 className="text-xl font-bold leading-7 text-slate-900 dark:text-white">
                  {localize(item.title, language)}
                </h3>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-cyan-500/15 dark:bg-black">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400">
                  <ShieldAlert className="h-3.5 w-3.5" /> Проблема
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-300">
                  {localize(item.problem, language)}
                </p>
              </div>

              <div className="mt-3 flex-1 rounded-2xl border border-cyan-600/20 bg-cyan-50 p-4 dark:border-cyan-500/20 dark:bg-cyan-500/5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-cyan-800 dark:text-cyan-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Решение
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-800 dark:text-slate-200">
                  {localize(item.solution, language)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpen && onOpen(item.link)}
                className="mt-5 inline-flex items-center gap-2 self-start text-sm font-semibold text-cyan-700 transition-all hover:gap-3 dark:text-cyan-400"
              >
                {localize(item.linkLabel, language)} <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
