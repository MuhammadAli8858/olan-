// ---------------------------------------------------------------------------
// Все продукты компании в одной ленте.
//
// Раздел «прилипает» к экрану, и прокрутка страницы вниз двигает ленту
// вправо: человек листает колесом или пальцем как обычно, а видит всю
// линейку, от комплексов фиксации до продуктов группы. Движение ленты
// сглажено (она догоняет прокрутку с лёгкой инерцией), фото в карточках
// смещаются чуть медленнее самих карточек — появляется глубина.
//
// Если в системе включено «уменьшение движения» или экран очень низкий,
// лента становится обычной горизонтальной прокруткой пальцем.
// Карточки строятся из PRODUCTS и PORTFOLIO — новый продукт из админки
// появляется в ленте сам.
// ---------------------------------------------------------------------------
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { COMPANY, HOME_RAIL, localize, PORTFOLIO, PRODUCTS } from '../data/siteData.js';
import { tr } from '../lib/i18n.js';
import { Icon } from '../lib/icons.jsx';
import { Img, isStudio } from '../lib/img.jsx';
import { oneLine, prefersReducedMotion } from '../lib/fx.jsx';

const WiderScreen = lazy(() => import('./WiderScreen.jsx').then((m) => ({ default: m.WiderScreen })));

function buildItems(language) {
  const devices = (PRODUCTS || []).map((p) => {
    const full = oneLine(localize(p.name, language));
    return {
      key: `d-${p.id}`, group: 'devices', device: p.id,
      name: p.brand || full,
      cat: p.brand ? full.replace(p.brand, '').trim() : tr('Комплексы фиксации'),
      text: oneLine(localize(p.short || p.description, language)),
      image: Array.isArray(p.images) ? p.images[0] : p.image,
      icon: 'Camera', badge: localize(p.badge, language),
    };
  });
  const platforms = (PORTFOLIO || []).filter((p) => p.id !== 'catalog').map((p) => ({
    key: `p-${p.id}`, group: 'platforms', product: p.id,
    name: localize(p.title, language),
    cat: oneLine(localize(p.subtitle, language)) || tr('Продукты группы'),
    text: oneLine(localize(p.description, language)),
    image: p.image, icon: p.icon, badge: localize(p.badge, language),
    stage: p.id === 'wider' && !p.image,
  }));
  return orderRail([...devices, ...platforms]);
}

// Порядок из админки («Порядок продуктов»): сначала сохранённый список,
// скрытые карточки пропускаем, новые — которых в списке ещё нет — в конец.
function orderRail(all) {
  const saved = Array.isArray(HOME_RAIL) ? HOME_RAIL : [];
  if (!saved.length) return all;
  const keyOf = (it) => (it.device ? `device:${it.device}` : `product:${it.product}`);
  const byKey = new Map(all.map((it) => [keyOf(it), it]));
  const out = [];
  const seen = new Set();
  saved.forEach((entry) => {
    const key = entry && entry.key;
    if (!key || seen.has(key) || !byKey.has(key)) return;
    seen.add(key);
    if (!entry.hidden) out.push(byKey.get(key));
  });
  all.forEach((it) => { if (!seen.has(keyOf(it))) out.push(it); });
  return out;
}

function CardMedia({ item, eager }) {
  if (item.stage) {
    return (
      <span className="o-card__media" style={{ background: '#06080c' }}>
        <Suspense fallback={null}><WiderScreen align="center" /></Suspense>
      </span>
    );
  }
  const iconCard = (
    <span className="o-card__media is-icon" style={{ position: 'absolute', inset: 0 }}><Icon name={item.icon} /></span>
  );
  return (
    <span className={`o-card__media${isStudio(item.image) ? ' is-studio' : ''}${item.image ? '' : ' is-icon'}`}>
      {item.image ? (
        <span className="o-zoom">
          <Img src={item.image} alt={item.name} sizes="(max-width: 640px) 78vw, 24vw" loading={eager ? 'eager' : 'lazy'} fallback={iconCard} />
        </span>
      ) : <Icon name={item.icon} />}
    </span>
  );
}

export function ProductRail({ onOpenDevice, onOpenProduct, onNavigate }) {
  const { language } = useSite();
  // Без кеширования: после загрузки правок из админки лента перестраивается.
  const items = buildItems(language);
  const total = items.length;
  const orderSig = items.map((it) => it.key).join('|');
  const kinds = useRef([]);
  kinds.current = items.map((it) => it.group);
  const groups = [
    { id: 'devices', label: tr('Комплексы фиксации'), start: items.findIndex((it) => it.group === 'devices') },
    { id: 'platforms', label: tr('Продукты группы'), start: items.findIndex((it) => it.group === 'platforms') },
  ].filter((gr) => gr.start >= 0).sort((a, b) => a.start - b.start);

  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const barRef = useRef(null);
  const countRef = useRef(null);
  const geo = useRef({ x: 0, target: 0, distance: 0, lefts: [], centers: [], edge: 0, vw: 1 });
  const [swipe, setSwipe] = useState(false);
  const [group, setGroup] = useState('devices');
  const [reach, setReach] = useState(5);

  useEffect(() => {
    const decide = () => setSwipe(prefersReducedMotion() || window.innerHeight < 460);
    decide();
    window.addEventListener('resize', decide);
    return () => window.removeEventListener('resize', decide);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!section || !pin || !viewport || !track) return undefined;
    const g = geo.current;
    let raf = 0;
    let lastGroup = '';
    let lastReach = 0;

    const cards = () => Array.from(track.children);
    const readTarget = () => {
      if (swipe) return viewport.scrollLeft;
      return Math.max(0, Math.min(g.distance, -section.getBoundingClientRect().top));
    };
    const apply = () => {
      if (!swipe) track.style.transform = `translate3d(${(-g.x).toFixed(2)}px,0,0)`;
      const prog = g.distance > 0 ? g.x / g.distance : 0;
      if (barRef.current) barRef.current.style.setProperty('--prog', prog.toFixed(4));
      if (countRef.current) countRef.current.textContent = String(Math.min(total, Math.max(1, Math.round(prog * (total - 1)) + 1))).padStart(2, '0');
      const list = cards();
      for (let i = 0; i < list.length; i++) {
        const p = ((g.centers[i] || 0) - g.x - g.vw / 2) / g.vw;
        list[i].style.setProperty('--p', Math.max(-1.2, Math.min(1.2, p)).toFixed(3));
      }
      const probe = g.x + g.vw * 0.4;
      let at = 0;
      for (let i = 0; i < g.lefts.length; i += 1) if (g.lefts[i] <= probe) at = i;
      const nextGroup = kinds.current[Math.min(at, kinds.current.length - 1)] || 'devices';
      if (nextGroup !== lastGroup) { lastGroup = nextGroup; setGroup(nextGroup); }
      // Фото подгружаем чуть впереди видимой части, а не все шестнадцать сразу.
      let visibleEnd = 0;
      for (let i = 0; i < g.lefts.length; i++) if (g.lefts[i] - g.x < g.vw * 1.8) visibleEnd = i;
      if (visibleEnd > lastReach) { lastReach = visibleEnd; setReach(visibleEnd); }
    };
    const tick = () => {
      raf = 0;
      g.target = readTarget();
      const d = g.target - g.x;
      g.x = swipe || Math.abs(d) < 0.4 ? g.target : g.x + d * 0.14;
      apply();
      if (g.x !== g.target) raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const measure = () => {
      const list = cards();
      g.vw = viewport.clientWidth || 1;
      g.lefts = list.map((el) => el.offsetLeft);
      g.centers = list.map((el) => el.offsetLeft + el.offsetWidth / 2);
      g.edge = g.lefts[0] || 0;
      g.distance = Math.max(0, track.scrollWidth - g.vw);
      section.style.height = swipe ? '' : `${Math.round(g.distance + pin.offsetHeight)}px`;
      if (swipe) track.style.transform = '';
      g.target = readTarget();
      g.x = g.target;
      apply();
    };

    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) { ro.observe(track); ro.observe(pin); }
    window.addEventListener('scroll', kick, { passive: true });
    viewport.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      window.removeEventListener('scroll', kick);
      viewport.removeEventListener('scroll', kick);
      window.removeEventListener('resize', measure);
    };
  }, [swipe, total, orderSig, language]);

  // Переход к группе или к карточке: прокручиваем страницу ровно настолько,
  // чтобы лента встала на нужное место.
  const jumpTo = (index) => {
    const g = geo.current;
    const section = sectionRef.current;
    if (!section) return;
    const x = Math.max(0, Math.min(g.distance, (g.lefts[index] || 0) - g.edge));
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    if (swipe) { viewportRef.current.scrollTo({ left: x, behavior }); return; }
    window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY + x, behavior });
  };

  const onCardFocus = (e, index) => {
    if (!e.target.matches(':focus-visible')) return;
    const g = geo.current;
    const left = (g.lefts[index] || 0) - g.x;
    const right = left + e.target.offsetWidth;
    if (left < 0 || right > g.vw) jumpTo(index);
  };

  const open = (item) => {
    if (item.device) onOpenDevice(item.device);
    else if (item.product) onOpenProduct(item.product);
  };

  return (
    <section ref={sectionRef} className={`o-rail${swipe ? ' is-swipe' : ''}`} id="products" aria-label={tr('Продукты OLAN')}>
      <div ref={pinRef} className="o-rail__pin">
        <div className="o-wrap o-rail__top">
          <div>
            <h2 className="o-h2">{tr('Продукты OLAN')}</h2>
            <p className="o-lead">{localize(COMPANY && COMPANY.tagline, language)}</p>
          </div>
          <div className="o-rail__tabs">
            {groups.map((gr) => (
              <button key={gr.id} type="button" className={`o-chip${group === gr.id ? ' is-active' : ''}`} onClick={() => jumpTo(gr.start)}>{gr.label}</button>
            ))}
          </div>
        </div>

        <div ref={viewportRef} className="o-rail__viewport">
          <div ref={trackRef} className="o-rail__track">
            {items.map((item, i) => (
              <button key={item.key} type="button" className="o-card" onClick={() => open(item)} onFocus={(e) => onCardFocus(e, i)}>
                <CardMedia item={item} eager={i <= reach} />
                {item.badge ? <span className="o-card__badge">{item.badge}</span> : null}
                <span className="o-card__body">
                  <span className="o-card__cat">{item.cat}</span>
                  <span className="o-card__name">{item.name}</span>
                  {item.text ? <span className="o-card__text">{item.text}</span> : null}
                  <span className="o-more">{tr('Подробнее')} <ArrowRight className="o-arrow" /></span>
                </span>
              </button>
            ))}
            <div className="o-card o-card--end">
              <span className="o-card__name">{tr('Все продукты')}</span>
              <p>{tr('Расскажите о задаче — подберём оборудование и подготовим предложение.')}</p>
              <button type="button" className="o-btn o-btn--primary" onClick={() => onNavigate('portfolio')}>{tr('Все продукты')} <ArrowRight className="o-arrow" /></button>
              <button type="button" className="o-btn o-btn--light" onClick={() => onNavigate('catalog')}>{tr('Каталог оборудования')}</button>
            </div>
          </div>
        </div>

        <div className="o-wrap o-rail__foot">
          <span className="o-rail__count"><b ref={countRef}>01</b> / {String(total).padStart(2, '0')}</span>
          <span ref={barRef} className="o-rail__bar"><i /></span>
          {!swipe ? <span className="o-rail__hint"><ArrowDown /> {tr('Прокрутите, чтобы посмотреть все продукты')}</span> : null}
        </div>
      </div>
    </section>
  );
}
