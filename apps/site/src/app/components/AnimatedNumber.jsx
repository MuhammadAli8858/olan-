// ---------------------------------------------------------------------------
// Число, которое «набегает» при появлении на экране.
//
// Значения в контенте записаны строками: «15+», «3000+», «12 мес», «99,4%».
// Компонент сам находит в строке число, а всё остальное (плюс, проценты,
// «мес», «лет») оставляет на своих местах. Поэтому переводить или менять
// подписи в админке можно как угодно — анимация не сломается.
//
// Считает только один раз, когда блок доходит до экрана. Если человек
// попросил в системе отключить анимации, число показывается сразу.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';

// Разбирает «3000+» на { prefix: '', number: 3000, suffix: '+' }.
// Возвращает null, если числа в строке нет.
function parseValue(raw) {
  const text = String(raw ?? '');
  const match = text.match(/-?\d[\d\s.,]*/);
  if (!match) return null;

  // Хвостовые пробелы, точки и запятые в совпадение попадать не должны:
  // иначе «12 мес» превратилось бы в «12мес».
  const rawNumber = match[0].replace(/[\s.,]+$/, '');
  const start = match.index;
  const end = start + rawNumber.length;
  // Отделяем разделитель дробной части от разделителя тысяч.
  const normalized = rawNumber.replace(/\s/g, '').replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  const decimals = (normalized.split('.')[1] || '').length;

  return {
    prefix: text.slice(0, start),
    suffix: text.slice(end),
    value,
    decimals,
    // Запоминаем, каким разделителем пользовались, чтобы вернуть его обратно.
    comma: rawNumber.includes(','),
    grouped: /\s/.test(rawNumber),
  };
}

function formatNumber(value, parsed) {
  let text = parsed.decimals > 0 ? value.toFixed(parsed.decimals) : String(Math.round(value));
  if (parsed.comma) text = text.replace('.', ',');
  if (parsed.grouped) {
    const [whole, fraction] = text.split(/[.,]/);
    const spaced = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    text = fraction ? `${spaced}${parsed.comma ? ',' : '.'}${fraction}` : spaced;
  }
  return text;
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

export function AnimatedNumber({ value, duration = 1400, className }) {
  const parsed = parseValue(value);
  const [display, setDisplay] = useState(() => (parsed ? `${parsed.prefix}0${parsed.suffix}` : value));
  const ref = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    // В строке нет числа — показываем как есть.
    if (!parsed) { setDisplay(value); return undefined; }

    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setDisplay(String(value));
      return undefined;
    }

    startedRef.current = false;
    setDisplay(`${parsed.prefix}0${parsed.suffix}`);

    const node = ref.current;
    if (!node) return undefined;

    let frame = 0;

    const run = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const startedAt = performance.now();

      const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        // Замедление к концу: цифры быстро набегают и мягко останавливаются.
        const eased = 1 - (1 - progress) ** 3;
        setDisplay(`${parsed.prefix}${formatNumber(parsed.value * eased, parsed)}${parsed.suffix}`);
        if (progress < 1) frame = requestAnimationFrame(tick);
        else setDisplay(String(value));
      };

      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) run(); });
    }, { threshold: 0.35 });

    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span ref={ref} className={className}>{display}</span>;
}

export { parseValue };
