// ---------------------------------------------------------------------------
// «Направления деятельности» — семь направлений группы из презентации.
// Даёт заказчику быстро понять, что компания закрывает не одну задачу,
// а весь контур: от фиксации нарушений до локализации производства.
// ---------------------------------------------------------------------------

import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { localize, DIRECTIONS } from '../data/siteData.js';
import { tr } from '../lib/i18n.js';

function DirectionIcon({ name, className }) {
  const Component = Icons[name] || Icons.Circle;
  return <Component className={className} />;
}

export function Directions({ onOpenCard }) {
  const { language } = useSite();
  const items = DIRECTIONS || [];

  return (
    <section id="directions" className="relative overflow-hidden bg-slate-100 py-24 transition-colors dark:bg-slate-950">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-400">
            {tr("Что мы делаем")}
          </div>
          <h2 className="mt-4 text-4xl font-black text-slate-900 dark:text-white md:text-5xl">
            {tr("Основные направления деятельности")}
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item, index) => (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => onOpenCard && onOpenCard(item.id)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
              className="olan-card flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 text-left dark:border-cyan-500/15 dark:bg-black"
            >
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                <DirectionIcon name={item.icon} className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-base font-bold leading-6 text-slate-900 dark:text-white">
                {localize(item.title, language)}
              </h3>
              <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-700 dark:text-slate-400">
                {localize(item.text, language)}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 dark:text-cyan-400">
                {tr("Подробнее")} <ArrowRight className="h-4 w-4" />
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
