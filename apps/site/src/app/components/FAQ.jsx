import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { FAQ_ITEMS, localize } from '../data/siteData.js';
import { useSite } from '../context/SiteContext.jsx';

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

export function FAQ({ onContact }) {
  const { language, text } = useSite();
  const [openId, setOpenId] = useState(FAQ_ITEMS[0]?.id ?? null);

  return (
    <section id="faq" className="relative overflow-hidden bg-slate-50 py-24 transition-colors dark:bg-black">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <span className="inline-flex rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white px-4 py-2 text-sm font-medium text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
            {text.faq.tag}
          </span>
          <h2 className="mt-6 text-4xl font-bold text-slate-900 dark:text-white md:text-5xl">{text.faq.title}</h2>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">{text.faq.description}</p>
        </motion.div>

        <div className="mx-auto max-w-4xl space-y-4">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div key={item.id} className="olan-card overflow-hidden rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white shadow-lg shadow-slate-900/5 dark:bg-slate-950/65">
                <button
                  type="button"
                  onClick={() => setOpenId((prev) => (prev === item.id ? null : item.id))}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">{localize(item.question, language)}</span>
                  <ChevronDown className={`h-5 w-5 text-cyan-600 transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 text-sm leading-7 text-slate-600 dark:text-slate-300">
                        {localize(item.answer, language)}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => (onContact ? onContact() : scrollToId('contact'))}
            className="rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white px-6 py-3 font-medium text-slate-700 transition hover:border-cyan-500/40 hover:text-cyan-600 dark:bg-slate-950 dark:text-slate-100"
          >
            {text.actions.contact}
          </button>
        </div>
      </div>
    </section>
  );
}
