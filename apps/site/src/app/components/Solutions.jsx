import { motion } from 'motion/react';
import {
  Gauge,
  CircleDot,
  SquareParking,
  TrainFront,
  BusFront,
  BadgeCheck,
  ShieldCheck,
  Factory,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { VIOLATION_SOLUTIONS, localize } from '../data/siteData.js';
import { useSite } from '../context/SiteContext.jsx';

const iconMap = {
  Gauge,
  CircleDot,
  SquareParking,
  TrainFront,
  BusFront,
  BadgeCheck,
  ShieldCheck,
  Factory,
  Truck,
};

export function Solutions({ onSelectCategory, onContact }) {
  const { language, text } = useSite();
  const s = text.solutions;

  return (
    <section id="solutions" className="relative overflow-hidden bg-gradient-to-b from-slate-100 via-white to-slate-50 py-24 transition-colors dark:from-black dark:via-slate-950 dark:to-black">
      <div className="absolute inset-0 opacity-60 dark:opacity-100">
        <div className="absolute left-1/4 top-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <span className="inline-flex rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white px-4 py-2 text-sm font-medium text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
            {s.tag}
          </span>
          <h2 className="mt-6 text-4xl font-bold text-slate-900 dark:text-white md:text-5xl">{s.title}</h2>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">{s.description}</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {VIOLATION_SOLUTIONS.map((item, index) => {
            const Icon = iconMap[item.icon] || Gauge;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07 }}
                viewport={{ once: true }}
                className="olan-card flex flex-col rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white p-8 shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 hover:border-cyan-500/40 dark:bg-slate-950/65"
              >
                <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{localize(item.title, language)}</h3>

                <div className="mt-5 space-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-500">{s.problemLabel}</div>
                    <p className="mt-1 line-clamp-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{localize(item.problem, language)}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">{s.solutionLabel}</div>
                    <p className="mt-1 line-clamp-3 text-sm leading-7 text-slate-700 dark:text-slate-200">{localize(item.solution, language)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCategory(item.id)}
                  className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/40"
                >
                  {s.cta}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </div>

        

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {s.guarantees.map((g, index) => {
            const Icon = iconMap[g.icon] || BadgeCheck;
            return (
              <motion.div
                key={g.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                viewport={{ once: true }}
                className="olan-card flex items-start gap-4 rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white p-5 shadow-lg shadow-slate-900/5 dark:bg-slate-950/60"
              >
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{g.title}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{g.text}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-600 dark:text-slate-300">{s.footnote}</p>
          <button
            type="button"
            onClick={onContact}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white px-6 py-3 font-medium text-slate-700 transition hover:border-cyan-500/40 hover:text-cyan-600 dark:bg-slate-950 dark:text-slate-100"
          >
            {s.footCta}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
