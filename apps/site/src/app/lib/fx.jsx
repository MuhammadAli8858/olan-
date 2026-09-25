// Небольшие помощники для движения: без внешних библиотек, чтобы первый экран
// не ждал загрузки пакета анимаций.
import { useEffect, useRef, useState } from 'react';
import { localize } from '../data/siteData.js';

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Медленная сеть или режим экономии трафика — тогда не предзагружаем лишнего.
export function slowNetwork() {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null;
  return Boolean(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
}

export function useInView({ rootMargin = '0px 0px -12% 0px', once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return undefined; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); if (once) io.disconnect(); } else if (!once) setInView(false);
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, once]);
  return [ref, inView];
}

export function Reveal({ as: Tag = 'div', variant = 'rise', delay = 0, className = '', children, ...rest }) {
  const [ref, inView] = useInView();
  const cls = `${variant === 'unmask' ? 'o-unmask' : 'o-reveal'}${inView ? ' is-in' : ''}${className ? ` ${className}` : ''}`;
  return <Tag ref={ref} className={cls} style={delay ? { '--delay': `${delay}ms` } : undefined} {...rest}>{children}</Tag>;
}

// Число набегает с замедлением к концу, как стрелка прибора.
export function CountUp({ value, duration = 1900 }) {
  const [ref, inView] = useInView({ rootMargin: '0px 0px -8% 0px' });
  const text = String(value ?? '');
  // Анимируем только значения, которые начинаются с числа: «123″», «400 Вт».
  // «RTX 3060» или «до 16 ч» — это названия и формулировки, их не трогаем.
  const match = text.match(/^([+~≈]?)(\d[\d\s\u00a0.,]*\d|\d)(.*)$/);
  const [shown, setShown] = useState(match ? `${match[1]}0${match[3]}` : text);
  useEffect(() => {
    if (!match) { setShown(text); return undefined; }
    if (!inView) return undefined;
    if (prefersReducedMotion()) { setShown(text); return undefined; }
    const raw = match[2].replace(/[\s\u00a0]/g, '').replace(',', '.');
    const target = parseFloat(raw) || 0;
    const decimals = (raw.split('.')[1] || '').length;
    const grouped = /[\s\u00a0]/.test(match[2]);
    const fmt = (v) => {
      let s = v.toFixed(decimals);
      if (grouped) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
      return `${match[1]}${s}${match[3]}`;
    };
    let raf = 0;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      if (p < 1) { setShown(fmt(target * eased)); raf = requestAnimationFrame(tick); } else setShown(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, text]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref}>{shown}</span>;
}

// Фон секции смещается медленнее страницы — ощущение глубины.
export function useParallaxVar(ref, factor = 0.12, name = '--py') {
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -200 || r.top > vh + 200) return;
      el.style.setProperty(name, `${(-(r.top + r.height / 2 - vh / 2) * factor).toFixed(1)}px`);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, [ref, factor, name]);
}

// Списки в контенте бывают разной формы: массив строк, массив
// многоязычных объектов или многоязычный объект с массивами.
export function toList(value, language) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v : localize(v, language))).filter(Boolean);
  const v = localize(value, language);
  if (Array.isArray(v)) return v.filter(Boolean);
  return v ? [v] : [];
}

export function oneLine(value) {
  return String(value || '').replace(/\s*\n\s*/g, ' ').trim();
}
