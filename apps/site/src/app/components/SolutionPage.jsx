// ---------------------------------------------------------------------------
// Страница одного решения.
//
// Слева — сама задача: в чём проблема и как она закрывается.
// Справа — комплексы, которые эту задачу решают: те, у кого в категориях
// стоит категория этого решения.
//
// На узком экране колонки становятся друг под другом: сначала задача,
// потом подходящие комплексы.
// ---------------------------------------------------------------------------

import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CheckCircle2, Gauge, ShieldAlert, Tag } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { localize, PRODUCTS, VIOLATION_SOLUTIONS, UI_TEXT } from '../data/siteData.js';

// Иконки решений хранятся строкой, поэтому берём их по имени.
import * as Icons from 'lucide-react';

function SolutionIcon({ name, className }) {
  const Component = Icons[name] || Gauge;
  return <Component className={className} />;
}

export function SolutionPage({ solutionId, onBack, onOpenProduct, onContact }) {
  const { language, text } = useSite();

  const solution = VIOLATION_SOLUTIONS.find((item) => item.id === solutionId)
    || VIOLATION_SOLUTIONS.find((item) => item.category === solutionId);

  if (!solution) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-32 text-center">
        <p className="text-lg text-slate-600 dark:text-slate-400">Решение не найдено.</p>
        <button type="button" onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 px-5 py-2.5 text-sm text-cyan-600 transition hover:bg-cyan-500/10 dark:text-cyan-300">
          <ArrowLeft className="h-4 w-4" /> На главную
        </button>
      </div>
    );
  }

  // Комплексы, закрывающие эту задачу.
  const products = PRODUCTS.filter((product) => {
    const categories = Array.isArray(product.category) ? product.category : [product.category];
    return categories.includes(solution.category);
  });

  const categories = (UI_TEXT[language] || UI_TEXT.ru).categories || {};
  const actions = (UI_TEXT[language] || UI_TEXT.ru).actions || {};

  return (
    <div className="bg-slate-50 pt-24 transition-colors dark:bg-black">
      <div className="container mx-auto px-4 pb-20">
        <button type="button" onClick={onBack}
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-cyan-600 dark:text-slate-600 dark:hover:text-cyan-300">
          <ArrowLeft className="h-4 w-4" /> Назад
        </button>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          {/* ------------------------- Слева: задача ------------------------- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
              <span className="h-px w-8 bg-cyan-500" />
              Наше решение
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight text-slate-900 dark:text-white md:text-5xl">
              {localize(solution.title, language)}
            </h1>

            <div className="mt-8 space-y-5">
              <div className="rounded-3xl border border-cyan-500/20 bg-slate-100 dark:bg-slate-900/60 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                  <ShieldAlert className="h-4 w-4" /> Проблема
                </div>
                <p className="mt-2.5 leading-7 text-slate-700 dark:text-slate-300">
                  {localize(solution.problem, language)}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 dark:border-cyan-500/20 bg-cyan-500/5 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                  <CheckCircle2 className="h-4 w-4" /> Решение
                </div>
                <p className="mt-2.5 leading-7 text-slate-700 dark:text-slate-300">
                  {localize(solution.solution, language)}
                </p>
              </div>
            </div>

            <div className="olan-card mt-8 flex items-center gap-4 rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white p-5 dark:bg-slate-950/50">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                <SolutionIcon name={solution.icon} className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Подходящих комплексов</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{products.length}</div>
              </div>
              <button type="button" onClick={onContact}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-105">
                {actions.consultation || 'Получить консультацию'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>

          {/* --------------------- Справа: комплексы --------------------- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
              <span className="h-px w-8 bg-cyan-500" />
              Наши комплексы для этого решения
            </div>

            <p className="mt-4 leading-7 text-slate-600 dark:text-slate-400">
              Нажмите на карточку — откроется полная характеристика, техпаспорт и фотографии.
            </p>

            {products.length === 0 ? (
              <div className="mt-8 rounded-3xl border border-slate-200 p-8 text-center text-slate-600 dark:border-slate-800 dark:text-slate-400">
                Для этой задачи комплексы пока не добавлены.
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {products.map((product) => {
                  const image = (product.images && product.images[0]) || '';
                  const specs = localize(product.specs, language);
                  const chips = Array.isArray(specs) ? specs.slice(0, 3) : [];

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => onOpenProduct(product)}
                      className="olan-card group flex flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white text-left transition hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 dark:bg-slate-950/60"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
                        {image && (
                          <img src={image} alt={localize(product.name, language)} loading="lazy"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                        )}
                        {product.badge && (
                          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                            {localize(product.badge, language)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <div className="text-lg font-bold text-slate-900 dark:text-white">
                          {product.brand || localize(product.name, language)}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          {localize(product.name, language)}
                        </div>

                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                          {localize(product.short, language) || localize(product.description, language)}
                        </p>

                        {chips.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {chips.map((chip, index) => (
                              <span key={index} className="rounded-full border border-cyan-500/25 px-2.5 py-1 text-[11px] text-cyan-700 dark:text-cyan-300">
                                {String(chip).length > 28 ? `${String(chip).slice(0, 27)}…` : chip}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <Tag className="h-3.5 w-3.5" />
                            {localize(product.price, language) || 'цена по запросу'}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-600 transition group-hover:gap-2.5 dark:text-cyan-400">
                            Открыть карточку <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Другие задачи — чтобы можно было перейти, не возвращаясь назад */}
            <div className="mt-10">
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Другие задачи</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {VIOLATION_SOLUTIONS.filter((item) => item.id !== solution.id).map((item) => (
                  <a key={item.id} href={`#solution-${item.id}`}
                    onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('olan:open-solution', { detail: item.id })); }}
                    className="rounded-full border border-slate-200 dark:border-cyan-500/20 px-3.5 py-1.5 text-xs text-slate-600 transition hover:border-cyan-500/50 hover:text-cyan-600 dark:text-slate-300 dark:hover:text-cyan-300">
                    {localize(item.title, language)}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
