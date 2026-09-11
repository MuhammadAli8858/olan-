// ---------------------------------------------------------------------------
// Плавное появление блока при прокрутке.
//
// Оборачивает любой кусок страницы: пока он ниже экрана — прозрачный
// и слегка смещён вниз, как только доходит до вида — проявляется.
// Срабатывает один раз, обратно блок не прячется.
//
// Если в системе включён запрет анимаций, содержимое показывается сразу
// (за это отвечает правило prefers-reduced-motion в index.css).
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';

export function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return undefined; }

    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`olan-reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
