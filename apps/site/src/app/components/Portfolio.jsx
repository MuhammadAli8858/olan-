// ---------------------------------------------------------------------------
// Продуктовая линейка: девять продуктов группы.
//
// На главной — сетка карточек с номером, названием и коротким описанием.
// По клику открывается отдельная страница продукта с полным составом
// возможностей, областями применения и референсами.
// ---------------------------------------------------------------------------

import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { ArrowRight, ArrowLeft, CheckCircle2, Info, ImageOff, Expand } from 'lucide-react';
import { useState } from 'react';
import { useSite } from '../context/SiteContext.jsx';
import { localize, PORTFOLIO, SOFTWARE_FEATURES, FORM_FACTORS } from '../data/siteData.js';

function ProductIcon({ name, className }) {
  const Component = Icons[name] || Icons.Package;
  return <Component className={className} />;
}

// ───────────────────────── сетка на главной ─────────────────────────

export function Portfolio({ onOpen, bare }) {
  const { language } = useSite();
  const items = PORTFOLIO || [];

  return (
    <section id="portfolio" className="relative overflow-hidden bg-white py-24 transition-colors dark:bg-black">
      <div className="container mx-auto px-4">
        {!bare && (
          <div className="mb-12 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-400">
              Продуктовая линейка
            </div>
            <h2 className="mt-4 font-black text-slate-900 dark:text-white">Продукты компании</h2>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => onOpen(item.id)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.25) }}
              className="olan-card group flex h-full flex-col rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left dark:border-cyan-500/15 dark:bg-slate-950/70"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                  <ProductIcon name={item.icon} className="h-5 w-5 text-white" />
                </span>
                <span className="font-mono text-sm font-bold text-slate-500 dark:text-slate-600">{item.number}</span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                {localize(item.title, language)}
              </h3>
              <div className="mt-1 text-sm font-medium text-cyan-700 dark:text-cyan-400">
                {localize(item.subtitle, language)}
              </div>
              <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-700 dark:text-slate-400">
                {localize(item.description, language)}
              </p>

              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 transition-all group-hover:gap-3 dark:text-cyan-400">
                Подробнее <ArrowRight className="h-4 w-4" />
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────── страница продукта ─────────────────────────

// Снимок продукта. Если файла нет — показываем заглушку, а не пустоту,
// чтобы сразу было видно, куда поставить фотографию.
function ProductPhoto({ src, alt, onOpen }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-900">
        <div className="text-center">
          <ImageOff className="mx-auto h-9 w-9" />
          <div className="mt-2 text-sm">Фотография не задана</div>
        </div>
      </div>
    );
  }
  return (
    <button type="button" onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-3xl border border-slate-200 dark:border-cyan-500/20">
      <img src={src} alt={alt || ''} onError={() => setBroken(true)}
        className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" />
      <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white opacity-0 transition group-hover:opacity-100">
        <Expand className="h-3.5 w-3.5" /> Открыть
      </span>
    </button>
  );
}

export function ProductPage({ productId, onBack, onContact }) {
  const { language } = useSite();
  const [zoom, setZoom] = useState(false);
  const product = (PORTFOLIO || []).find((item) => item.id === productId);

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-32 text-center">
        <p className="text-lg text-slate-700 dark:text-slate-400">Продукт не найден.</p>
        <button type="button" onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-600/40 px-5 py-2.5 text-sm text-cyan-700 transition hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-500/10">
          <ArrowLeft className="h-4 w-4" /> На главную
        </button>
      </div>
    );
  }

  const tags = product.tags || [];
  const tagsTitle = localize(product.tagsTitle, language);
  const meta = localize(product.meta, language);
  const note = localize(product.note, language);

  return (
    <div className="bg-white pt-24 transition-colors dark:bg-black">
      <div className="container mx-auto px-4 pb-20">
        <button type="button" onClick={onBack}
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300">
          <ArrowLeft className="h-4 w-4" /> Назад
        </button>

        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
            <ProductIcon name={product.icon} className="h-7 w-7 text-white" />
          </span>
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-600">
              Продукт {product.number}
            </div>
            <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white md:text-4xl">
              {localize(product.title, language)}
            </h1>
          </div>
        </div>

        <div className="mt-2 text-lg font-medium text-cyan-700 dark:text-cyan-400">
          {localize(product.subtitle, language)}
        </div>

        <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-800 dark:text-slate-300">
          {localize(product.description, language)}
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">
              Что входит
            </h2>
            <ul className="mt-5 space-y-3">
              {(product.features || []).map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700 dark:text-cyan-400" />
                  <span className="leading-7 text-slate-800 dark:text-slate-300">{localize(feature, language)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5">
            {/* Снимок продукта. Загружается в админ-панели,
                раздел «Продукты группы», поле «Картинка». */}
            <ProductPhoto
              src={product.image}
              alt={localize(product.title, language)}
              onOpen={() => setZoom(true)}
            />
            {product.imageCaption && (
              <div className="-mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {localize(product.imageCaption, language)}
              </div>
            )}

            {tags.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-cyan-500/15 dark:bg-slate-950/70">
                {tagsTitle && (
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800 dark:text-cyan-300">
                    {tagsTitle}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span key={index}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 dark:border-cyan-500/25 dark:bg-black dark:text-slate-200">
                      {localize(tag, language)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {meta && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-800 dark:border-cyan-500/15 dark:bg-slate-950/70 dark:text-slate-200">
                {meta}
              </div>
            )}

            <button type="button" onClick={onContact}
              className="olan-sweep inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-3.5 font-semibold text-white transition hover:scale-[1.02]">
              Обсудить проект <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Для комплексов показываем варианты исполнения и особенности ПО —
            это отдельные развороты презентации, им нужно место на странице. */}
        {product.id === 'complexes' && (
          <>
            <div className="mt-14">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {localize(FORM_FACTORS.title, language)}
              </h2>
              <p className="mt-2 text-slate-700 dark:text-slate-400">{localize(FORM_FACTORS.note, language)}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {(FORM_FACTORS.items || []).map((item, index) => (
                  <div key={index}
                    className="olan-card rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-cyan-500/15 dark:bg-slate-950/70">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                      <ProductIcon name={item.icon} className="h-6 w-6 text-white" />
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white">{localize(item.title, language)}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-400">{localize(item.text, language)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-14">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {localize(SOFTWARE_FEATURES.title, language)}
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(SOFTWARE_FEATURES.items || []).map((item, index) => (
                  <div key={index}
                    className="olan-card flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-cyan-500/15 dark:bg-slate-950/70">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                      <ProductIcon name={item.icon} className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{localize(item.title, language)}</div>
                      <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-400">{localize(item.text, language)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {zoom && product.image && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-4"
            onClick={() => setZoom(false)}
          >
            <img src={product.image} alt={localize(product.title, language)}
              className="max-h-[88vh] w-auto max-w-full rounded-2xl object-contain" />
          </div>
        )}

        {note && (
          <div className="mt-10 flex items-start gap-3 rounded-3xl bg-slate-900 p-6 text-slate-100 dark:bg-slate-950 dark:text-slate-200">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
            <span className="leading-7">{note}</span>
          </div>
        )}

        <div className="mt-12">
          <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Другие продукты</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(PORTFOLIO || []).filter((item) => item.id !== product.id).map((item) => (
              <button key={item.id} type="button"
                onClick={() => { if (typeof window !== 'undefined') window.location.hash = `product-${item.id}`; }}
                className="rounded-full border border-slate-300 px-3.5 py-1.5 text-xs text-slate-700 transition hover:border-cyan-600/50 hover:text-cyan-700 dark:border-cyan-500/20 dark:text-slate-300 dark:hover:text-cyan-300">
                {localize(item.title, language)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
