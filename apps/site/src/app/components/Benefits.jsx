import { motion } from 'motion/react';
import { BadgeCheck, Cpu, Headphones, Radar, Shield } from 'lucide-react';
import { BENEFITS, localize } from '../data/siteData.js';
import { useSite } from '../context/SiteContext.jsx';

const iconMap = { Radar, Cpu, Shield, Headphones, BadgeCheck };

export function Benefits() {
  const { language, text } = useSite();

  return (
    <section id="benefits" className="relative overflow-hidden bg-gradient-to-b from-slate-100 via-white to-slate-50 py-24 transition-colors dark:from-black dark:via-slate-950 dark:to-black">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <span className="inline-flex rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white px-4 py-2 text-sm font-medium text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
            {text.benefits.tag}
          </span>
          <h2 className="mt-6 text-4xl font-bold text-slate-900 dark:text-white md:text-5xl">{text.benefits.title}</h2>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">{text.benefits.description}</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {BENEFITS.map((benefit, index) => {
            const Icon = iconMap[benefit.icon];
            return (
              <motion.div
                key={benefit.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                viewport={{ once: true }}
                className="olan-card rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white p-8 shadow-lg shadow-slate-900/5 transition hover:border-cyan-500/35 dark:bg-slate-950/65"
              >
                <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{localize(benefit.title, language)}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{localize(benefit.description, language)}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
