import { motion } from 'motion/react';
import { Filter, Image as ImageIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PRODUCTS, localize } from '../data/siteData.js';
import { useSite } from '../context/SiteContext.jsx';

export function Catalog({ onOpenProduct, category, onCategoryChange }) {
  const { language, text } = useSite();
  const [internalCategory, setInternalCategory] = useState('all');
  const selectedCategory = category ?? internalCategory;
  const setSelectedCategory = onCategoryChange ?? setInternalCategory;

  const categories = useMemo(() => ([
    { id: 'all', label: text.catalog.all },
    { id: 'speed', label: text.catalog.categories.speed },
    { id: 'roadside', label: text.catalog.categories.roadside },
    { id: 'lane', label: text.catalog.categories.lane },
    { id: 'beltPhone', label: text.catalog.categories.beltPhone },
    { id: 'video', label: text.catalog.categories.video },
    { id: 'trafficLight', label: text.catalog.categories.trafficLight },
    { id: 'buss', label: text.catalog.categories.buss },
    { id: 'parking', label: text.catalog.categories.parking },
    { id: 'pedestrianCrossing', label: text.catalog.categories.pedestrianCrossing },
    { id: 'railwayCrossings', label: text.catalog.categories.railwayCrossings },
  ]), [text]);

  // const filtered = PRODUCTS.filter((product) => selectedCategory === 'all' || product.category === selectedCategory);

  const filtered = PRODUCTS.filter((product) => {
  // Если выбрано "Все", показываем всё
  if (selectedCategory === 'all') return true;

  // Если category у товара — это массив, проверяем, есть ли в нем выбранный ID
  if (Array.isArray(product.category)) {
    return product.category.includes(selectedCategory);
  }

  // На всякий случай оставляем проверку для строк (если не все товары еще переделаны)
  return product.category === selectedCategory;
});

  return (
    <section id="catalog" className="relative overflow-hidden bg-slate-50 py-24 transition-colors dark:bg-black">
      <div className="absolute inset-0 opacity-50 dark:opacity-100">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.08) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }} />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          <span className="inline-flex rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white px-4 py-2 text-sm font-medium text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
            {text.catalog.tag}
          </span>
          <h2 className="mt-6 text-4xl font-bold text-slate-900 dark:text-white md:text-5xl">{text.catalog.title}</h2>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">{text.catalog.description}</p>
        </motion.div>

        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
            {/* <Filter className="h-5 w-5" /> */}
            {/* <span className="font-medium">{text.catalog.filters}</span> */}
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`rounded-full px-4 py-3 text-sm font-medium transition-all duration-300 ${selectedCategory === category.id  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20' : 'border border-slate-200 dark:border-cyan-500/15 bg-white text-slate-600  hover:bg-cyan-200 hover:text-black hover:border-cyan-500  hover:shadow-md hover:shadow-cyan-500/20 dark:bg-slate-950 dark:text-slate-300'}`}
                // className={`rounded-full px-4 py-4 text-sm font-medium transition ${selectedCategory === category.id ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20' : 'border border-slate-200 dark:border-cyan-500/15 bg-white text-slate-600 hover:border-cyan-500/40 dark:bg-slate-950 dark:text-slate-300'}`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
          {filtered.map((product, index) => (
            <motion.button
              key={product.id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              viewport={{ once: true }}
              onClick={() => onOpenProduct(product)}
              className="group overflow-hidden rounded-3x1 border border-slate-200 dark:border-cyan-500/15 rounded-2xl bg-white text-left shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 hover:border-cyan-500/40 dark:bg-slate-950/70"
            >
              <div className="relative h-60 overflow-hidden">
                <img
                  src={product.images[0]}
                  alt={localize(product.name, language)}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
                <div className="absolute left-4 top-4 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white">
                  {product.inStock ? text.catalog.stockYes : text.catalog.stockNo}
                </div>
                <div className="absolute right-4 top-4 rounded-full bg-cyan-500/90 px-3 py-1 text-xs font-semibold text-white">
                  {localize(product.badge, language)}
                </div>
                <div className="absolute bottom-4 right-4 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {product.images.length}
                </div>
              </div>
              <div className="p-6">
                <div className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400">{product.brand}</div>
                <h3 className="mt-2 whitespace-pre-line text-2xl font-bold text-slate-900 dark:text-white">{localize(product.name, language)}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{localize(product.short, language)}</p>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">{text.catalog.priceLabel}</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">{localize(product.price, language)}</div>
                  </div>
                  <span className="rounded-full border border-slate-200 dark:border-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-300">
                    {text.actions.details}
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* <div className="mt-10 rounded-3xl border border-dashed border-cyan-500/25 bg-white p-5 text-sm text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
          {text.catalog.addHint}
        </div> */}
      </div>
    </section>
  );
}
