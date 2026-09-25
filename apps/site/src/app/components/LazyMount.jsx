// Раздел ниже первого экрана монтируется, только когда до него остаётся
// меньше пары экранов. На медленном интернете первый экран не делит канал
// с тем, до чего человек ещё не долистал. Событие 'olan:mount-all' включает
// все разделы сразу — нужно для перехода по якорю, например к контактам.
import { Suspense, useEffect, useRef, useState } from 'react';

export function LazyMount({ children, minHeight = 400, rootMargin = '1000px 0px' }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (on) return undefined;
    const el = ref.current;
    const force = () => setOn(true);
    window.addEventListener('olan:mount-all', force);
    let io = null;
    if (typeof IntersectionObserver === 'undefined') setOn(true);
    else if (el) {
      io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) setOn(true); }, { rootMargin });
      io.observe(el);
    }
    return () => { window.removeEventListener('olan:mount-all', force); if (io) io.disconnect(); };
  }, [on, rootMargin]);
  return (
    <div ref={ref} style={on ? undefined : { minHeight }}>
      {on ? <Suspense fallback={<div style={{ minHeight }} />}>{children}</Suspense> : null}
    </div>
  );
}
