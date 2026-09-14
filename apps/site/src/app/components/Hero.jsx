import { motion } from 'motion/react';
import { ArrowRight, Search } from 'lucide-react';
import { RadarAnimation } from './RadarAnimation.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { AnimatedNumber } from './AnimatedNumber.jsx';

function scrollToId(id) {
  const target = document.getElementById(id);
  if (!target) return;
  // Страховка: если прокрутка почему-то недоступна, переход не должен
  // падать с ошибкой и обрывать работу кнопки.
  if (typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (typeof window !== 'undefined' && window.scrollTo) {
    window.scrollTo({ top: target.offsetTop || 0, behavior: 'smooth' });
  }
}

export function Hero({ onCatalog, onContact }) {
  const { text } = useSite();

  return (
    <section
      id="hero"
      className="olan-hero relative flex flex-col overflow-hidden bg-slate-50 transition-colors dark:bg-black"
    >
      <div className="absolute inset-0 z-0">
        <img
          src="/products/w-space.png"
          alt="Traffic technology"
          className="h-full w-full object-cover opacity-15 dark:opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-50/80 to-slate-100 dark:from-black dark:via-black/65 dark:to-black" />
      </div>

      <RadarAnimation />

      <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

    
      {/* <div className="absolute left-10 top-28 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="absolute bottom-16 right-10 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" /> */}

      <div className="container relative z-20 mx-auto flex flex-1 items-center px-4">
        <div className="w-full py-[clamp(1rem,3vh,2.5rem)]">
        <div className="mx-auto max-w-5xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="olan-neon inline-flex rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white px-4 py-2 text-sm font-medium text-cyan-700 backdrop-blur dark:bg-cyan-500/10 dark:text-cyan-300"
          >
            {text.hero.badge}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-h1 mt-[clamp(1rem,2.5vh,1.5rem)] font-black"
          >
            <span className="block bg-gradient-to-r from-slate-900 via-cyan-700 to-slate-900 bg-clip-text text-transparent dark:from-white dark:via-cyan-100 dark:to-white">
              {text.hero.title1}
            </span>
            <span className="block bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {text.hero.title2}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lead mx-auto mt-[clamp(0.75rem,2vh,1.5rem)] text-slate-600 dark:text-slate-300"
          >
            {text.hero.description}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lead mx-auto max-w-3xl text-slate-600 dark:text-slate-300"
          >
            {text.hero.descriptionLine2}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-[clamp(1.25rem,3.5vh,2.5rem)] flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <button
              type="button"
              onClick={() => (onCatalog ? onCatalog() : scrollToId('catalog'))}
            className="olan-sweep inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-medium text-lg hover:shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105"
              // className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-7 py-3.5 text-lg font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:translate-y-[-1px]"
            >
              {text.actions.openCatalog}
              <Search className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => (onContact ? onContact() : scrollToId('contact'))}
              className="olan-sweep inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white px-7 py-3.5 text-lg font-semibold text-slate-700 hover:shadow-2xl hover:shadow-cyan-500/35 backdrop-blur transition hover:border-cyan-500/50 hover:text-cyan-600 hover:scale-105 dark:bg-white/5 dark:text-white"
            >
              {text.actions.consultation}
              <ArrowRight className="h-5 w-5" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mx-auto mt-[clamp(1.25rem,3.5vh,3rem)] grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
          >
            {text.hero.stats.map((stat) => (
              <div key={stat.label} className="olan-card rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white p-5 backdrop-blur dark:bg-slate-950/50">
                <AnimatedNumber
                  value={stat.value}
                  className="block bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-3xl font-bold text-transparent md:text-4xl"
                />
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

        </div>
      {/* Индикатор прокрутки — последним элементом в потоке.
          Раньше он был абсолютным и на невысоких экранах ноутбука
          наезжал на строку с цифрами. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="relative z-20 flex shrink-0 justify-center pb-[clamp(0.75rem,2.5vh,2rem)]"
      >
        <div className="flex animate-bounce flex-col items-center gap-1.5">
          <span className="text-sm text-cyan-600 dark:text-cyan-400">Прокрутите вниз</span>
          <div className="flex h-9 w-6 justify-center rounded-full border-2 border-cyan-500/50 pt-2">
            <div className="h-2 w-1 rounded-full bg-cyan-500 dark:bg-cyan-400" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
