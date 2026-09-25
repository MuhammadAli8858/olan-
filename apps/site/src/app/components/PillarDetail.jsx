// ---------------------------------------------------------------------------
// Окно с подробностями поверх страницы.
//
// Используется карточками «Практическое подтверждение» на главной и опорами
// компании на странице «О компании».
//
// Важная деталь про полноэкранный просмотр: он выводится порталом прямо
// в body. Анимация окна задаётся через transform, а элемент с transform
// становится точкой отсчёта для вложенных fixed-элементов — из-за этого
// снимок раньше считал размеры от карточки, а не от экрана, и вылезал
// за его пределы.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Icons } from '../lib/icons.jsx';
import { X, ChevronLeft, ChevronRight, ImageOff, Expand } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { localize } from '../data/siteData.js';
import { tr } from '../lib/i18n.js';

function Icon({ name, className }) {
  const Component = Icons[name] || Icons.Circle;
  return <Component className={className} />;
}

function Picture({ src, alt, className }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (!src || broken) {
    return (
      <div className={`flex items-center justify-center bg-slate-200 text-slate-400 dark:bg-slate-800 ${className}`}>
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }
  return <img src={src} alt={alt || ''} onError={() => setBroken(true)} className={className} />;
}

// ─────────────────────── просмотр во весь экран ───────────────────────

function Lightbox({ images, index, onClose, onPrev, onNext, alt }) {
  const handleKey = useCallback((event) => {
    if (event.key === 'Escape') onClose();
    if (event.key === 'ArrowLeft') onPrev();
    if (event.key === 'ArrowRight') onNext();
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      onClick={onClose}
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <span className="text-sm text-white/70">
          {images.length > 1 ? `${index + 1} из ${images.length}` : ''}
        </span>
        <button type="button" onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
          aria-label={tr("Закрыть")}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Снимок вписывается в свободное место: и по ширине, и по высоте.
          object-contain не обрежет кадр, а h-full/w-full не дадут вылезти. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-16">
        {images.length > 1 && (
          <button type="button"
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-2 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition hover:bg-white/10 sm:left-4"
            aria-label={tr("Предыдущее фото")}>
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <motion.img
          key={index}
          src={images[index]}
          alt={alt || ''}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded-2xl object-contain"
        />

        {images.length > 1 && (
          <button type="button"
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-2 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition hover:bg-white/10 sm:right-4"
            aria-label={tr("Следующее фото")}>
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
    </motion.div>,
    document.body,
  );
}

// ───────────────────────── стопка снимков ─────────────────────────

function PhotoStack({ images, alt, onOpen }) {
  if (!images || images.length === 0) return null;

  // Больше трёх снимков позади стопку не украшают, а превращают в кашу.
  const behind = images.slice(1, 4);

  return (
    <div className="relative" style={{ paddingBottom: `${behind.length * 18 + 8}px` }}>
      {behind.map((src, index) => {
        const step = index + 1;
        return (
          <div
            key={src + index}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden rounded-3xl border border-slate-200 shadow-xl dark:border-slate-700"
            style={{
              // Точка отсчёта сверху: снимок сжимается вниз, а не к центру,
              // поэтому нижний край действительно выглядывает из-под главного.
              transformOrigin: 'top center',
              transform: `translateY(${step * 26}px) scale(${1 - step * 0.05})`,
              zIndex: behind.length - index,
              filter: `brightness(${0.62 - index * 0.12}) saturate(0.8)`,
              aspectRatio: '4 / 3',
            }}
          >
            <img src={src} alt="" className="h-full w-full object-cover" />
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onOpen(0)}
        className="group relative z-10 block w-full overflow-hidden rounded-3xl border border-slate-200 shadow-2xl ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 dark:border-cyan-500/25 dark:ring-white/5"
      >
        <Picture src={images[0]} alt={alt} className="aspect-[4/3] w-full object-cover" />

        {/* Затемнение снизу, чтобы подписи читались на любом снимке */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition group-hover:opacity-100" />

        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
          <Expand className="h-3.5 w-3.5" /> {tr("Открыть")}
        </span>

        {images.length > 1 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
            ещё {images.length - 1}
          </span>
        )}
      </button>
    </div>
  );
}

// ──────────────────────────── само окно ────────────────────────────

export function PillarDetail({ pillar, onClose }) {
  const { language } = useSite();
  const [lightbox, setLightbox] = useState(-1);

  // Пока окно открыто, страница под ним не прокручивается.
  useEffect(() => {
    if (!pillar) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [pillar]);

  useEffect(() => {
    if (!pillar) return undefined;
    const onKey = (event) => { if (event.key === 'Escape' && lightbox < 0) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pillar, onClose, lightbox]);

  useEffect(() => { setLightbox(-1); }, [pillar]);

  if (!pillar || typeof document === 'undefined') return null;

  const gallery = pillar.gallery || (pillar.image ? [pillar.image] : []);
  const title = localize(pillar.title, language);
  const caption = localize(pillar.imageCaption, language);

  // Всё окно тоже выводится порталом: так на него не влияют ни фон секции,
  // ни её обрезка по краям.
  return createPortal(
    <>
      <AnimatePresence>
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] overflow-y-auto overscroll-contain bg-slate-950/80 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Пока окно ниже экрана — стоит по центру. Стало выше — страница
              прокручивается, и верх с заголовком остаётся доступен. */}
          <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-cyan-500/20 dark:bg-slate-950"
            >
              <div className="flex items-start gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:p-7">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 sm:h-14 sm:w-14">
                  <Icon name={pillar.icon} className="h-6 w-6 text-white sm:h-7 sm:w-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-h2 font-black text-slate-900 dark:text-white">{title}</h2>
                  <p className="mt-1.5 leading-7 text-slate-600 dark:text-slate-400">
                    {localize(pillar.text, language)}
                  </p>
                </div>
                <button type="button" onClick={onClose}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                  aria-label={tr("Закрыть")}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
                <div className="space-y-4">
                  {(pillar.details || []).map((paragraph, index) => (
                    <p key={index} className="max-w-none leading-8 text-slate-700 dark:text-slate-300">
                      {localize(paragraph, language)}
                    </p>
                  ))}
                </div>

                <div>
                  <PhotoStack images={gallery} alt={title} onOpen={setLightbox} />
                  {caption && (
                    <p className="mt-3 max-w-none text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {caption}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {lightbox >= 0 && (
          <Lightbox
            images={gallery}
            index={lightbox}
            alt={title}
            onClose={() => setLightbox(-1)}
            onPrev={() => setLightbox((i) => (i - 1 + gallery.length) % gallery.length)}
            onNext={() => setLightbox((i) => (i + 1) % gallery.length)}
          />
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
