// ---------------------------------------------------------------------------
// Подробности об опоре компании — окно поверх страницы «О компании».
//
// Слева текст, справа галерея: одно фото крупно, остальные лежат за ним
// со сдвигом и затемнением, как стопка снимков. По клику снимок
// раскрывается на весь экран, там его можно листать стрелками.
//
// Листать можно и с клавиатуры: стрелки влево-вправо, Esc закрывает.
// ---------------------------------------------------------------------------

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from 'lucide-react';
import { X, ChevronLeft, ChevronRight, ImageOff, Expand } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { localize } from '../data/siteData.js';

function Icon({ name, className }) {
  const Component = Icons[name] || Icons.Circle;
  return <Component className={className} />;
}

function Picture({ src, alt, className, onError }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (!src || broken) {
    return (
      <div className={`flex items-center justify-center bg-slate-200 text-slate-400 dark:bg-slate-800 ${className}`}>
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }
  return <img src={src} alt={alt || ''} onError={() => { setBroken(true); if (onError) onError(); }} className={className} />;
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

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <button type="button" onClick={onClose}
        className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
        aria-label="Закрыть">
        <X className="h-5 w-5" />
      </button>

      {images.length > 1 && (
        <button type="button"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-3 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10 md:left-8"
          aria-label="Предыдущее фото">
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-5xl"
      >
        <Picture src={images[index]} alt={alt} className="max-h-[85vh] w-full rounded-2xl object-contain" />
        {images.length > 1 && (
          <div className="mt-4 text-center text-sm text-white/70">{index + 1} / {images.length}</div>
        )}
      </motion.div>

      {images.length > 1 && (
        <button type="button"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-3 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10 md:right-8"
          aria-label="Следующее фото">
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </motion.div>
  );
}

// ───────────────────────── стопка снимков ─────────────────────────

function PhotoStack({ images, alt, onOpen }) {
  if (!images || images.length === 0) return null;

  // Показываем не больше трёх снимков позади: дальше стопка становится
  // мешаниной и перестаёт читаться как стопка.
  const behind = images.slice(1, 4);

  return (
    <div className="relative">
      {/* Снимки позади выглядывают из-под главного нижним краем.
          Каждый следующий чуть уже, ниже и темнее — получается стопка,
          а не отдельный ряд миниатюр. */}
      <div className="relative" style={{ paddingBottom: `${behind.length * 14}px` }}>
        {behind.map((src, index) => {
          const step = index + 1;
          return (
            <div
              key={src + index}
              className="absolute inset-x-0 top-0 overflow-hidden rounded-3xl border border-slate-200 shadow-lg dark:border-slate-800"
              style={{
                transform: `translateY(${step * 14}px) scale(${1 - step * 0.045})`,
                zIndex: behind.length - index,
                filter: `brightness(${0.7 - index * 0.14})`,
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
          className="group relative z-10 block w-full overflow-hidden rounded-3xl border border-slate-200 shadow-2xl transition hover:-translate-y-1 dark:border-cyan-500/25"
        >
          <Picture src={images[0]} alt={alt} className="aspect-[4/3] w-full object-cover" />
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white opacity-0 transition group-hover:opacity-100">
            <Expand className="h-3.5 w-3.5" /> Открыть
          </span>
          {images.length > 1 && (
            <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white">
              ещё {images.length - 1}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────── само окно ────────────────────────────

export function PillarDetail({ pillar, onClose }) {
  const { language } = useSite();
  const [lightbox, setLightbox] = useState(-1);

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

  if (!pillar) return null;

  const gallery = pillar.gallery || (pillar.image ? [pillar.image] : []);
  const title = localize(pillar.title, language);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] overflow-y-auto bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto my-8 w-[min(1100px,94vw)] rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-cyan-500/20 dark:bg-slate-950 md:p-10"
        >
          <div className="flex items-start gap-4">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
              <Icon name={pillar.icon} className="h-7 w-7 text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-black text-slate-900 dark:text-white">{title}</h2>
              <p className="mt-2 leading-7 text-slate-700 dark:text-slate-400">{localize(pillar.text, language)}</p>
            </div>
            <button type="button" onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white"
              aria-label="Закрыть">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_1fr]">
            <div className="space-y-5">
              {(pillar.details || []).map((paragraph, index) => (
                <p key={index} className="leading-8 text-slate-800 dark:text-slate-300">
                  {localize(paragraph, language)}
                </p>
              ))}
            </div>

            <PhotoStack images={gallery} alt={title} onOpen={setLightbox} />
          </div>
        </motion.div>

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
      </motion.div>
    </AnimatePresence>
  );
}
