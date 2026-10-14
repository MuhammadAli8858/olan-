// ---------------------------------------------------------------------------
// Движок живых сцен на страницах продуктов.
//
// Сцена — это анимированная иллюстрация раздела: видеостена, карта, портал
// над дорогой, полёт дрона. Чтобы страница не тормозила, каждая сцена
//   • оживает, только когда видна на экране и вкладка открыта;
//   • ставит свои CSS-анимации на паузу, как только уходит из вида;
//   • показывает спокойный «стоп-кадр», если в системе отключены анимации.
// Время внутри сцены идёт только пока она видна — поэтому после прокрутки
// назад история продолжается с того же места, а не начинается рывком.
// ---------------------------------------------------------------------------
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const REDUCE = '(prefers-reduced-motion: reduce)';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REDUCE).matches);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(REDUCE);
    const on = () => setReduced(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', on);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', on); };
  }, []);
  return reduced;
}

// awake — сцена на экране (хотя бы на 15%) и вкладка не свёрнута.
// seen  — сцену уже показывали хоть раз: можно начинать вступление.
export function useAwake(ref, threshold = 0.15) {
  const [state, setState] = useState({ awake: false, seen: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let visible = false;
    const update = () => {
      const awake = visible && (typeof document === 'undefined' || document.visibilityState !== 'hidden');
      setState((s) => (s.awake === awake && (s.seen || !visible) ? s : { awake, seen: s.seen || visible }));
    };
    if (typeof IntersectionObserver === 'undefined') { visible = true; update(); return undefined; }
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold });
    io.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, [ref, threshold]);
  return state;
}

// Покадровый цикл. Время сцены (мс) растёт только пока awake.
export function useFrames(awake, onFrame) {
  const cb = useRef(onFrame);
  cb.current = onFrame;
  const time = useRef(0);
  // При уходе со страницы React сначала отвязывает ссылки на элементы и лишь
  // потом останавливает эффекты: кадр, пришедший в этот промежуток, пропускаем.
  const gone = useRef(false);
  useLayoutEffect(() => { gone.current = false; return () => { gone.current = true; }; }, []);
  useEffect(() => {
    if (!awake) return undefined;
    let raf = 0;
    let last = 0;
    const tick = (now) => {
      if (gone.current) return;
      const dt = last ? Math.min(50, now - last) : 16;
      last = now;
      time.current += dt;
      cb.current(time.current, dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [awake]);
  return time;
}

// Сюжет по шагам: шаг сменяется через заданные паузы, пока сцена видна.
// Уход с экрана ставит таймер на паузу, остаток времени сохраняется.
export function useBeats(awake, durations, { still = 0, reduced = false } = {}) {
  const [beat, setBeat] = useState(0);
  const left = useRef(null);
  const list = useRef(durations);
  list.current = durations;
  useEffect(() => {
    if (!awake || reduced) return undefined;
    const d = left.current ?? list.current[beat % list.current.length];
    const t0 = performance.now();
    let fired = false;
    const id = setTimeout(() => { fired = true; left.current = null; setBeat((b) => b + 1); }, d);
    return () => {
      clearTimeout(id);
      if (!fired) left.current = Math.max(0, d - (performance.now() - t0));
    };
  }, [awake, beat, reduced]);
  return reduced ? still : beat;
}

// Часы для подписей на кадрах: обновляются раз в секунду, пока сцена видна.
export function useClock(awake, offsetSec = 0) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!awake) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [awake]);
  const d = new Date(now + offsetSec * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return { hms: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`, date: `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}` };
}

// Холст под размер элемента с учётом плотности пикселей экрана.
export function useCanvasSize(ref, onResize) {
  const cb = useRef(onResize);
  cb.current = onResize;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const apply = () => {
      // Размер без учёта transform: сцены сами плавно масштабируют кадр.
      const r = { width: canvas.clientWidth, height: canvas.clientHeight };
      if (!r.width || !r.height) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(r.width * dpr);
      const h = Math.round(r.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        cb.current({ w, h, dpr, cssW: r.width, cssH: r.height });
      }
    };
    apply();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(apply);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [ref]);
}

// Воспроизводимый случайный генератор: одинаковая «случайность» при каждом
// показе, без подёргиваний при повторном рендере.
export function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { const x = clamp(t); return x * x * (3 - 2 * x); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeOutQuint = (t) => 1 - Math.pow(1 - clamp(t), 5);
export const easeInOut = (t) => { const x = clamp(t); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
// Отрезок [a, b] внутри общего времени t → 0…1.
export const span = (t, a, b) => clamp((t - a) / (b - a));

// Число с пробелом-разделителем тысяч: 45 983.
export function groupNum(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
