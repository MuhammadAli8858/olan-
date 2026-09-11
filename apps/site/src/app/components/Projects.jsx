import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import { PROJECTS, localize } from '../data/siteData.js';
import { useSite } from '../context/SiteContext.jsx';

export function Projects() {
  const { language, text } = useSite();
  const [activeIndex, setActiveIndex] = useState(null);
  const isOpen = activeIndex !== null;

  const open = (index) => setActiveIndex(index);
  const close = () => setActiveIndex(null);
  const prev = () => setActiveIndex((i) => (i === null ? null : (i - 1 + PROJECTS.length) % PROJECTS.length));
  const next = () => setActiveIndex((i) => (i === null ? null : (i + 1) % PROJECTS.length));

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') close();
      else if (event.key === 'ArrowLeft') prev();
      else if (event.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const activeProject = isOpen ? PROJECTS[activeIndex] : null;

  return (
    <section id="projects" className="relative overflow-hidden bg-slate-50 py-24 transition-colors dark:bg-black">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <span className="inline-flex rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white px-4 py-2 text-sm font-medium text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
            {text.projects.tag}
          </span>
          <h2 className="mt-6 text-4xl font-bold text-slate-900 dark:text-white md:text-5xl">{text.projects.title}</h2>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">{text.projects.description}</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((project, index) => (
            <motion.button
              key={project.id}
              type="button"
              onClick={() => open(index)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
              viewport={{ once: true }}
              className="olan-card group relative overflow-hidden rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white text-left shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 hover:border-cyan-500/40 dark:bg-slate-950/65"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={project.image}
                  alt={localize(project.title, language)}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-5">
                <h3 className="text-lg font-bold text-white">{localize(project.title, language)}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-cyan-200">
                  <MapPin className="h-4 w-4" />
                  {localize(project.location, language)}
                </div>
              </div>
              <div className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                Открыть фото
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && activeProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm md:p-8"
            onClick={close}
          >
            <button
              type="button"
              onClick={close}
              aria-label={text.projects.close}
              className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:right-6 md:top-6"
            >
              <X className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); prev(); }}
              aria-label={text.projects.prev}
              className="absolute left-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:left-6"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); next(); }}
              aria-label={text.projects.next}
              className="absolute right-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:right-6"
            >
              <ArrowRight className="h-6 w-6" />
            </button>

            <motion.figure
              key={activeProject.id}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex max-h-[92vh] max-w-[95vw] flex-col items-center"
              onClick={(event) => event.stopPropagation()}
            >
              <img
                src={activeProject.image}
                alt={localize(activeProject.title, language)}
                className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
              />
              <figcaption className="mt-4 text-center">
                <div className="text-lg font-semibold text-white">{localize(activeProject.title, language)}</div>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-cyan-200">
                  <MapPin className="h-4 w-4" />
                  {localize(activeProject.location, language)}
                </div>
              </figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
