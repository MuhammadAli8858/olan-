// ---------------------------------------------------------------------------
// Просмотр фото проекта на весь экран — общий для главной и страницы
// «Проекты». Листается стрелками на экране, клавишами ← → и свайпом,
// закрывается крестиком, клавишей Esc или нажатием на тёмный фон.
// ---------------------------------------------------------------------------
import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';
import { localize } from '../data/siteData.js';
import { tr } from '../lib/i18n.js';
import { Img } from '../lib/img.jsx';

export function ProjectLightbox({ items, index, language, onClose, onChange }) {
  const count = items.length;
  const item = items[index];
  const closeRef = useRef(null);
  const swipe = useRef(null);
  const go = (step) => onChange((index + step + count) % count);

  // Фокус внутрь окна, прокрутка страницы на паузе; при закрытии всё
  // возвращается как было, фокус — на карточку, с которой открыли.
  useEffect(() => {
    const before = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (closeRef.current) closeRef.current.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (before && typeof before.focus === 'function') before.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') go(-1);
      else if (event.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!item) return null;
  const title = localize(item.title, language);
  const location = localize(item.location, language);

  return (
    <div className="o-lb" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}
      onPointerDown={(e) => { swipe.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={(e) => {
        const s = swipe.current;
        swipe.current = null;
        if (!s || count < 2) return;
        const dx = e.clientX - s.x;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.3) go(dx < 0 ? 1 : -1);
      }}>
      <div className="o-lb__top">
        <span>{String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</span>
        <button ref={closeRef} type="button" className="o-lb__btn" aria-label={tr('Закрыть')} onClick={onClose}><X /></button>
      </div>
      <div className="o-lb__stage">
        <Img key={item.image} src={item.image} alt={title} sizes="100vw" eager onClick={(e) => e.stopPropagation()} />
        {count > 1 ? (
          <>
            <button type="button" className="o-lb__btn o-lb__nav o-lb__nav--prev" aria-label={tr('Предыдущий слайд')}
              onClick={(e) => { e.stopPropagation(); go(-1); }}><ChevronLeft /></button>
            <button type="button" className="o-lb__btn o-lb__nav o-lb__nav--next" aria-label={tr('Следующий слайд')}
              onClick={(e) => { e.stopPropagation(); go(1); }}><ChevronRight /></button>
          </>
        ) : null}
      </div>
      <div className="o-lb__cap" onClick={(e) => e.stopPropagation()}>
        {location ? <span><MapPin /> {location}</span> : null}
        <strong>{title}</strong>
      </div>
    </div>
  );
}
