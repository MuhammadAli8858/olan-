// ---------------------------------------------------------------------------
// Первый экран: баннеры во всю высоту, как на hikvision.com.
//
// Слайды берутся из HERO_SLIDES (админка → «Баннеры на главной»).
// Каждый кадр «снят камерой»: медленный наезд, лёгкий параллакс от мыши
// и прокрутки, зерно плёнки. Эффекты привязаны к предметам на самом фото —
// вспышка идёт из объектива камеры, рамка ложится на конкретную машину.
// Координаты пересчитываются под любой экран, включая вертикальный кадр
// на телефоне. Для нового фото из админки эффекты просто не рисуются.
// ---------------------------------------------------------------------------
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { HERO_SLIDES, localize } from '../data/siteData.js';
import { tr } from '../lib/i18n.js';
import { HeroPicture, imgInfo, PORTRAIT_QUERY } from '../lib/img.jsx';
import { prefersReducedMotion, slowNetwork } from '../lib/fx.jsx';

const WiderScreen = lazy(() => import('./WiderScreen.jsx').then((m) => ({ default: m.WiderScreen })));

const DURATION = 7000;

// Точки на исходных фото, в долях ширины и высоты кадра.
const SCENES = {
  '/products/TRC2.png': { kb: ['-2%', '1%'], origin: '38% 48%', lens: [0.37, 0.48], target: [0.575, 0.685, 0.125, 0.12], bloom: [0.753, 0.205] },
  '/products/w-space-tip3.png': { kb: ['2%', '-1%'], origin: '64% 30%', lens: [0.66, 0.285], cars: [[0.32, 0.8, 76], [0.63, 0.78, 81], [0.18, 0.68, 112]] },
  '/products/uralan-p2.png': { kb: ['1%', '1%'], origin: '24% 42%', led: [0.302, 0.352], car: [0.735, 0.215, 92] },
  '/products/w-space a3.png': { kb: ['-1.5%', '0%'], origin: '55% 50%', glass: [0.405, 0.305, 0.31, 0.39] },
};

const pct = (v) => `${(v * 100).toFixed(3)}%`;
const clock = () => new Date().toTimeString().slice(0, 8);

// Где на экране оказалось фото при object-fit: cover.
function useCoverRect(ref, src, enabled) {
  const [state, setState] = useState({ rect: null, portrait: false });
  useEffect(() => {
    const el = ref.current;
    const info = imgInfo(src);
    if (!el || !info || !enabled) return undefined;
    const mq = window.matchMedia(PORTRAIT_QUERY);
    const calc = () => {
      const portrait = Boolean(info.p) && mq.matches;
      const iw = portrait ? info.pw : info.w;
      const ih = portrait ? info.ph : info.h;
      const W = el.clientWidth;
      const H = el.clientHeight;
      const s = Math.max(W / iw, H / ih);
      setState({ portrait, rect: { left: (W - iw * s) / 2, top: (H - ih * s) / 2, width: iw * s, height: ih * s } });
    };
    calc();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(calc) : null;
    if (ro) ro.observe(el);
    if (mq.addEventListener) mq.addEventListener('change', calc);
    return () => { if (ro) ro.disconnect(); if (mq.removeEventListener) mq.removeEventListener('change', calc); };
  }, [ref, src, enabled]);
  return state;
}

// Повторяющийся сценарий эффекта: список [мс, фаза], цикл заданной длины.
function useCycle(live, steps, period) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!live || prefersReducedMotion()) { setPhase(0); return undefined; }
    const timers = [];
    const run = () => steps.forEach(([at, value]) => timers.push(setTimeout(() => setPhase(value), at)));
    run();
    const iv = setInterval(run, period);
    return () => { timers.forEach(clearTimeout); clearInterval(iv); };
  }, [live]); // eslint-disable-line react-hooks/exhaustive-deps
  return phase;
}

function CaptureFX({ scene, live, mx, sx, inFrame }) {
  const phase = useCycle(live, [[1300, 1], [1650, 2], [4600, 0]], 5800);
  const stamp = useMemo(clock, [phase === 2]); // eslint-disable-line react-hooks/exhaustive-deps
  const [lx, ly] = scene.lens;
  const [tx, ty, tw, th] = scene.target;
  return (
    <>
      <span className="o-fx-bloom" style={{ left: pct(mx(scene.bloom[0])), top: pct(scene.bloom[1]) }} />
      <span className={`o-fx-flash${phase ? ' is-on' : ''}`} style={{ left: pct(mx(lx)), top: pct(ly) }} />
      <span className={`o-fx-box is-alert${phase ? ' is-on' : ''}`} style={{ left: pct(mx(tx)), top: pct(ty), width: pct(sx(tw)), height: pct(th) }} />
      {inFrame(tx + tw / 2) ? (
        <span className={`o-fx-tag is-alert${phase === 2 ? ' is-on' : ''}`} style={{ left: pct(mx(tx + tw / 2)), top: pct(ty) }}>
          <i /> 01 A 777 AA · <b>{tr('Проезд на красный')}</b> · {stamp}
        </span>
      ) : null}
    </>
  );
}

function RadarFX({ scene, live, mx, inFrame }) {
  const shown = useCycle(live, [[0, 0], [900, 1], [1700, 2], [2500, 3], [5600, 0]], 6400);
  const [lx, ly] = scene.lens;
  const cx = mx(lx) * 100;
  const cy = ly * 100;
  const cone = `${cx},${cy} ${cx - 80},100 ${cx + 24},100`;
  return (
    <>
      <svg className="o-fx-radar" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <clipPath id="o-radar-cone"><polygon points={cone} /></clipPath>
          <linearGradient id="o-radar-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(140,190,255)" stopOpacity=".2" />
            <stop offset="1" stopColor="rgb(140,190,255)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={cone} fill="url(#o-radar-fill)" />
        <g clipPath="url(#o-radar-cone)">
          {[0, 1, 2].map((i) => <ellipse key={i} cx={cx} cy={cy} rx="95" ry="70" style={{ '--i': i }} />)}
        </g>
      </svg>
      {scene.cars.map(([x, y, speed], i) => {
        const alert = speed > 90;
        const on = shown > i;
        if (!inFrame(x)) return null;
        return (
          <span key={i}>
            {alert ? <span className={`o-fx-box is-alert${on ? ' is-on' : ''}`} style={{ left: pct(mx(x) - 0.045), top: pct(y - 0.05), width: '9%', height: '10%' }} /> : null}
            <span className={`o-fx-tag${alert ? ' is-alert' : ''}${on ? ' is-on' : ''}`} style={{ left: pct(mx(x)), top: pct(y - 0.05) }}>
              <i /> {alert ? <b>{speed} {tr('км/ч')}</b> : `${speed} ${tr('км/ч')}`}{alert ? ` · ${tr('Превышение скорости')}` : ''}
            </span>
          </span>
        );
      })}
    </>
  );
}

function SunAnchoredFX({ scene, live, mx, inFrame }) {
  const phase = useCycle(live, [[1800, 1], [5200, 0]], 6200);
  const [x, y, speed] = scene.car;
  return (
    <>
      <span className="o-fx-led" style={{ left: pct(mx(scene.led[0])), top: pct(scene.led[1]) }} />
      {inFrame(x) ? <span className={`o-fx-tag${phase ? ' is-on' : ''}`} style={{ left: pct(mx(x)), top: pct(y - 0.06) }}><i /> {speed} {tr('км/ч')}</span> : null}
    </>
  );
}

// Блики объектива: ядро, анаморфный штрих и «зайчики» вдоль линии через центр.
const GHOSTS = [[0.34, 5, 'rgba(255,196,130,.16)'], [0.5, 2.2, 'rgba(140,200,255,.2)'], [0.63, 9, 'rgba(255,160,90,.08)'], [0.86, 3.4, 'rgba(170,255,214,.13)'], [1.02, 15, 'rgba(255,205,150,.06)']];

function SunFX() {
  const motes = useMemo(() => Array.from({ length: 16 }, (_, i) => ({
    left: 4 + ((i * 37) % 58), top: 8 + ((i * 53) % 62), s: 2 + (i % 3), t: 11 + (i % 5) * 2.2, dl: -((i * 1.7) % 12),
    dx: 30 + (i % 4) * 18, dy: -(40 + (i % 5) * 16),
  })), []);
  return (
    <div className="o-fx-sun" aria-hidden="true">
      <span className="o-fx-sun__core" />
      <span className="o-fx-sun__streak" />
      {GHOSTS.map(([t, size, color], i) => (
        <span key={i} className="o-fx-ghost" style={{ left: `${3 + (47 * 2) * t}%`, top: `${-6 + (56 * 2) * t}%`, width: `${size}vmax`, height: `${size}vmax`,
          background: `radial-gradient(circle, ${color} 0%, ${color} 55%, transparent 72%)` }} />
      ))}
      {motes.map((m, i) => (
        <span key={i} className="o-fx-mote" style={{ left: `${m.left}%`, top: `${m.top}%`, '--s': `${m.s}px`, '--t': `${m.t}s`, '--dl': `${m.dl}s`, '--dx': `${m.dx}px`, '--dy': `${m.dy}px` }} />
      ))}
    </div>
  );
}

function Slide({ slide, index, state, armed, eager, language, onNavigate, onLoaded }) {
  const imgBox = useRef(null);
  const scene = SCENES[slide.image] || null;
  const live = state !== 'idle';
  const { rect, portrait } = useCoverRect(imgBox, slide.image, armed && Boolean(scene));
  const info = imgInfo(slide.image);
  const mx = (x) => (portrait && info && info.p ? (x - info.pl) / info.pf : x);
  // Метка видна, только если её точка внутри видимой части кадра с запасом
  // на ширину подписи — иначе на узком экране она торчала бы у края.
  const inFrame = (x) => {
    if (!rect) return false;
    const W = rect.width + 2 * rect.left;
    const px = rect.left + mx(x) * rect.width;
    const margin = Math.max(W * 0.12, 110);
    return px > margin && px < W - margin;
  };
  const sx = (w) => (portrait && info && info.p ? w / info.pf : w);
  const title = String(localize(slide.title, language) || '');
  const text = localize(slide.text, language);
  const badge = localize(slide.badge, language);
  const cta = localize(slide.cta, language) || tr('Подробнее');
  const Heading = index === 0 ? 'h1' : 'h2';
  let w = 0;

  return (
    <div className={`o-hero__slide${state === 'active' ? ' is-active' : ''}${state === 'leaving' ? ' is-leaving' : ''}`}
      data-align={slide.align === 'right' ? 'right' : 'left'} aria-hidden={state !== 'active'}>
      <div className="o-hero__depth">
        {slide.effect === 'wider' ? (
          <div className="o-hero__stage">
            {armed ? <Suspense fallback={null}><WiderScreen active={live} align={slide.align === 'right' ? 'left' : 'right'} /></Suspense> : null}
          </div>
        ) : (
          <div className="o-hero__kb" style={{ '--kb-o': (scene && scene.origin) || '50% 50%', '--kb-x': scene ? scene.kb[0] : '0%', '--kb-y': scene ? scene.kb[1] : '0%' }}>
            <div className="o-hero__img" ref={imgBox}>
              {armed && slide.image ? <HeroPicture src={slide.image} alt={title} eager={eager} onLoad={onLoaded} /> : null}
              {scene && rect && live ? (
                <div className="o-hero__anchor" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}>
                  {slide.effect === 'capture' && scene.lens && scene.target ? <CaptureFX scene={scene} live={live} mx={mx} sx={sx} inFrame={inFrame} /> : null}
                  {slide.effect === 'radar' && scene.cars ? <RadarFX scene={scene} live={live} mx={mx} inFrame={inFrame} /> : null}
                  {slide.effect === 'sun' && scene.led ? <SunAnchoredFX scene={scene} live={live} mx={mx} inFrame={inFrame} /> : null}
                  {slide.effect === 'glint' && scene.glass ? (
                    <span className="o-fx-glass" style={{ left: pct(mx(scene.glass[0])), top: pct(scene.glass[1]), width: pct(sx(scene.glass[2])), height: pct(scene.glass[3]) }} />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
      {slide.effect === 'sun' && live ? <SunFX /> : null}
      <div className="o-hero__shade" />
      <div className="o-hero__content" style={{ opacity: 'var(--fade, 1)' }}>
        <div className="o-wrap">
          <div className="o-hero__text">
            {badge ? <div className="o-hero__badge o-fade" style={{ '--d': '250ms' }}>{badge}</div> : null}
            <Heading className="o-hero__title">
              {title.split(/(\s+)/).map((part, i) => (/^\s+$/.test(part) || !part ? part : (
                <span className="o-w" key={i}><span style={{ '--i': w++ }}>{part}</span></span>
              )))}
            </Heading>
            {text ? <p className="o-hero__desc o-fade">{text}</p> : null}
            <div className="o-hero__actions o-fade" style={{ '--d': '880ms' }}>
              {slide.link ? (
                <button type="button" className="o-btn o-btn--primary" tabIndex={state === 'active' ? 0 : -1} onClick={() => onNavigate(slide.link)}>
                  {cta} <ArrowRight className="o-arrow" />
                </button>
              ) : null}
              <button type="button" className="o-btn o-btn--light" tabIndex={state === 'active' ? 0 : -1} onClick={() => onNavigate('contact')}>{tr('Связаться')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSlider({ onNavigate }) {
  const { language } = useSite();
  const slides = (HERO_SLIDES || []).filter((s) => s && (s.image || s.effect === 'wider'));
  const n = slides.length;
  const rootRef = useRef(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState(-1);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(true);
  const [armed, setArmed] = useState(() => new Set([0]));
  const reduced = useMemo(prefersReducedMotion, []);
  const slow = useMemo(slowNetwork, []);

  const arm = useCallback((i) => {
    setArmed((s) => (s.has(i) ? s : new Set([...s, i])));
  }, []);

  const goTo = useCallback((next) => {
    if (!n) return;
    const cur = indexRef.current;
    const target = ((next % n) + n) % n;
    if (target === cur) return;
    indexRef.current = target;
    arm(target);
    setPrev(cur);
    setIndex(target);
  }, [n, arm]);

  // Первый кадр проявляется из темноты, а не появляется рывком.
  useEffect(() => {
    let r2 = 0;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setReady(true)); });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, []);

  useEffect(() => {
    if (prev < 0) return undefined;
    const t = setTimeout(() => setPrev(-1), 1500);
    return () => clearTimeout(t);
  }, [prev, index]);

  // Следующий слайд готовим заранее, на медленном интернете — впритык.
  useEffect(() => {
    if (n < 2) return undefined;
    const t = setTimeout(() => arm((index + 1) % n), slow ? DURATION - 2500 : 1500);
    return () => clearTimeout(t);
  }, [index, n, slow, arm]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    let inView = true;
    const sync = () => setVisible(inView && !document.hidden);
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { threshold: 0.2 });
    io.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, []);

  // Автопрокрутка с учётом паузы: после паузы досчитывается остаток времени.
  const running = ready && !paused && !hover && visible && n > 1 && !reduced;
  const remain = useRef(DURATION);
  const startedAt = useRef(0);
  useEffect(() => { remain.current = DURATION; }, [index]);
  useEffect(() => {
    if (!running) return undefined;
    startedAt.current = performance.now();
    const t = setTimeout(() => goTo(indexRef.current + 1), remain.current);
    return () => {
      clearTimeout(t);
      remain.current = Math.max(500, remain.current - (performance.now() - startedAt.current));
    };
  }, [running, index, goTo]);

  // Параллакс: мышь сдвигает кадр как подвес камеры, прокрутка уводит его вниз.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return undefined;
    const fine = window.matchMedia('(pointer: fine)').matches;
    let tx = 0; let ty = 0; let x = 0; let y = 0; let raf = 0;
    const step = () => {
      raf = 0;
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      const h = root.offsetHeight || 1;
      const sy = Math.min(Math.max(window.scrollY, 0), h);
      root.style.setProperty('--mx', `${(-x * 14).toFixed(2)}px`);
      root.style.setProperty('--my', `${(-y * 9).toFixed(2)}px`);
      root.style.setProperty('--sy', `${(sy * 0.3).toFixed(1)}px`);
      root.style.setProperty('--tx', `${(x * 6).toFixed(2)}px`);
      root.style.setProperty('--ty', `${(y * 4 - sy * 0.12).toFixed(2)}px`);
      root.style.setProperty('--fade', `${Math.max(0, 1 - (sy / h) * 1.35).toFixed(3)}`);
      if (Math.abs(tx - x) > 0.003 || Math.abs(ty - y) > 0.003) raf = requestAnimationFrame(step);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
    const onMove = (e) => {
      const r = root.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      kick();
    };
    const onLeave = () => { tx = 0; ty = 0; kick(); };
    if (fine) { root.addEventListener('pointermove', onMove); root.addEventListener('pointerleave', onLeave); }
    window.addEventListener('scroll', kick, { passive: true });
    kick();
    return () => {
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', kick);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const swipe = useRef(null);
  const onPointerDown = (e) => { if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY }; };
  const onPointerUp = (e) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) goTo(indexRef.current + (dx < 0 ? 1 : -1));
  };

  if (!n) {
    return (
      <section className="o-hero" style={{ height: '70vh' }}>
        <div className="o-hero__content"><div className="o-wrap"><h1 className="o-hero__title">OLAN HIGH TECH</h1></div></div>
      </section>
    );
  }

  return (
    <section ref={rootRef} className={`o-hero${running ? '' : ' is-paused'}`} aria-roledescription="carousel"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onPointerDown={onPointerDown} onPointerUp={onPointerUp}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') goTo(index + 1); if (e.key === 'ArrowLeft') goTo(index - 1); }}>
      {slides.map((slide, i) => (
        <Slide key={slide.id || i} slide={slide} index={i} language={language} onNavigate={onNavigate}
          state={ready && i === index ? 'active' : i === prev ? 'leaving' : 'idle'}
          armed={armed.has(i)} eager={i === 0} onLoaded={i === index ? () => arm((i + 1) % n) : undefined} />
      ))}
      <div className="o-hero__grain" aria-hidden="true" />
      {n > 1 ? (
        <div className="o-hero__nav">
          <div className="o-wrap o-hero__bar">
            <div className="o-hero__tabs" style={{ '--n': n }} role="tablist">
              {slides.map((s, i) => (
                <button key={s.id || i} type="button" role="tab" aria-selected={i === index}
                  className={`o-hero__tab${i === index ? ' is-active' : ''}`} style={{ '--dur': `${DURATION}ms` }} onClick={() => goTo(i)}>
                  {localize(s.short, language) || String(i + 1).padStart(2, '0')}
                  <i />
                </button>
              ))}
            </div>
            <div className="o-hero__ctrl">
              <button type="button" onClick={() => goTo(index - 1)} aria-label={tr('Предыдущий слайд')}><ChevronLeft /></button>
              <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? tr('Продолжить показ') : tr('Остановить показ')}>
                {paused ? <Play /> : <Pause />}
              </button>
              <button type="button" onClick={() => goTo(index + 1)} aria-label={tr('Следующий слайд')}><ChevronRight /></button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
