// ---------------------------------------------------------------------------
// Шапка в духе hikvision.com.
//
// На главной поверх баннера она прозрачная с белым текстом, при прокрутке
// становится белой. При движении вниз уезжает, при движении вверх
// возвращается — читать длинные страницы ничто не мешает.
// «Продукты» и «Решения» раскрываются мега-меню во всю ширину с фотографиями.
// Всё собирается из контента: добавили продукт в админке — он уже в меню.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Globe, Menu, Moon, Sun, X } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { localize, PORTFOLIO, PRODUCTS, VIOLATION_SOLUTIONS, DIRECTIONS } from '../data/siteData.js';
import { tr } from '../lib/i18n.js';
import { Icon } from '../lib/icons.jsx';
import { Img, isStudio } from '../lib/img.jsx';
import { oneLine } from '../lib/fx.jsx';

function Thumb({ src, icon }) {
  return (
    <span className={`o-thumb${isStudio(src) ? ' is-studio' : ''}`}>
      <Img src={src} sizes="72px" fallback={<Icon name={icon} />} />
    </span>
  );
}

export function Header({ route, onNavigate, onSection, onHome, onOpenDevice }) {
  const { text, theme, toggleTheme, language, setLanguage, languageOptions } = useSite();
  const [open, setOpen] = useState('');
  const [productsTab, setProductsTab] = useState('devices');
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const closeTimer = useRef(0);
  const openTimer = useRef(0);

  // Прокрутка: прозрачность над баннером и «уезжающая» шапка.
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 24);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 520);
        last = y;
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  const isHidden = hidden && !open && !drawer && !langOpen;
  useEffect(() => {
    document.documentElement.style.setProperty('--o-sticky-top', isHidden ? '0px' : 'var(--o-header)');
  }, [isHidden]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(''); setLangOpen(false); setDrawer(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { document.body.style.overflow = drawer ? 'hidden' : ''; }, [drawer]);
  useEffect(() => { setOpen(''); setDrawer(false); }, [route]);

  // Небольшая задержка при наведении: меню не вспыхивает, если курсор
  // просто пролетел над шапкой по пути к странице.
  const enter = (id) => {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setOpen(id), open ? 0 : 90);
  };
  const leave = () => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(''), 160);
  };

  const go = (target) => { setOpen(''); setDrawer(false); onNavigate(target); };
  const goSection = (id) => { setOpen(''); setDrawer(false); onSection(id); };
  const openDevice = (id) => { setOpen(''); setDrawer(false); onOpenDevice(id); };

  const devices = (PRODUCTS || []).map((p) => {
    const full = oneLine(localize(p.name, language));
    return {
      key: p.id, name: p.brand || full, sub: p.brand ? full.replace(p.brand, '').trim() : '',
      image: p.images && p.images[0], icon: 'Camera', onClick: () => openDevice(p.id),
    };
  });
  const platforms = (PORTFOLIO || []).filter((p) => p.id !== 'catalog').map((p) => ({
    key: p.id, name: localize(p.title, language), sub: localize(p.subtitle, language), image: p.image, icon: p.icon,
    onClick: () => go(`product-${p.id}`),
  }));
  const productTabs = [
    { id: 'devices', label: tr('Комплексы фиксации'), items: devices },
    { id: 'platforms', label: tr('Продукты группы'), items: platforms },
  ];
  const activeProducts = productTabs.find((t) => t.id === productsTab) || productTabs[0];

  const solutions = (VIOLATION_SOLUTIONS || []).map((s) => ({ key: s.id, icon: s.icon, name: localize(s.title, language), onClick: () => go(`solution-${s.id}`) }));
  const directions = (DIRECTIONS || []).map((d) => ({ key: d.id, icon: d.icon, name: localize(d.title, language), onClick: () => go(`card-directions-${d.id}`) }));
  const company = [
    { key: 'about', name: tr('О компании'), onClick: () => go('about') },
    { key: 'team', name: tr('Команда'), onClick: () => go('team') },
    { key: 'engagement', name: tr('Модели работы'), onClick: () => go('engagement') },
    { key: 'workflow', name: tr('Этапы и SLA'), onClick: () => go('workflow') },
    { key: 'faq', name: tr('Частые вопросы'), onClick: () => go('faq') },
  ];

  const over = route === 'home' && !scrolled && !open && !drawer;
  const current = (ids) => ids.includes(route);

  const navButton = (id, label, ids = []) => (
    <button type="button" className={`o-nav__btn${current(ids) ? ' is-current' : ''}`} aria-expanded={open === id}
      onClick={() => setOpen((v) => (v === id ? '' : id))} onFocus={() => enter(id)}>
      {label} <ChevronDown />
    </button>
  );

  return (
    <>
      <header className={`o-header${over ? ' is-over' : ''}${isHidden ? ' is-hidden' : ''}`} onMouseLeave={leave}>
        <div className="o-wrap o-header__row">
          <button type="button" className="o-logo" onClick={onHome} aria-label={text.brand}>
            <img src="/logo-mark.webp" alt="" width="38" height="38" />
            <span>{text.brand}</span>
          </button>

          <nav className="o-nav">
            <div className={`o-nav__item${open === 'products' ? ' is-open' : ''}`} onMouseEnter={() => enter('products')}>
              {navButton('products', tr('Продукты'), ['portfolio', 'catalog', 'product'])}
              <div className="o-mega" onMouseEnter={() => enter('products')}>
                <div className="o-wrap o-mega__in">
                  <div className="o-mega__side">
                    {productTabs.map((t) => (
                      <button key={t.id} type="button" className={`o-mega__tab${t.id === activeProducts.id ? ' is-active' : ''}`}
                        onMouseEnter={() => setProductsTab(t.id)} onFocus={() => setProductsTab(t.id)} onClick={() => setProductsTab(t.id)}>
                        {t.label} <ArrowRight className="o-arrow" />
                      </button>
                    ))}
                    <button type="button" className="o-mega__tab" onClick={() => go('catalog')}>
                      {tr('Каталог оборудования')} <ArrowRight className="o-arrow" />
                    </button>
                  </div>
                  <div className="o-mega__main">
                    <div className="o-mega__grid" key={activeProducts.id}>
                      {activeProducts.items.map((item, i) => (
                        <button key={item.key} type="button" className="o-mega__card" style={{ '--i': i }} onClick={item.onClick}>
                          <Thumb src={item.image} icon={item.icon} />
                          <span>
                            <span className="o-mega__name">{item.name}</span>
                            {item.sub ? <span className="o-mega__sub">{item.sub}</span> : null}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="o-mega__foot">
                      <button type="button" className="o-more" onClick={() => go('portfolio')}>{tr('Все продукты')} <ArrowRight className="o-arrow" /></button>
                      <button type="button" className="o-more" onClick={() => go('catalog')}>{tr('Каталог оборудования')} <ArrowRight className="o-arrow" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`o-nav__item${open === 'solutions' ? ' is-open' : ''}`} onMouseEnter={() => enter('solutions')}>
              {navButton('solutions', tr('Решения'), ['solution', 'cases', 'directions', 'card'])}
              <div className="o-mega" onMouseEnter={() => enter('solutions')}>
                <div className="o-wrap">
                  <div className="o-mega__cols">
                    <div>
                      <div className="o-mega__title">{tr('Решения по задачам')}</div>
                      <div className="o-mega__list">
                        {solutions.map((s, i) => (
                          <button key={s.key} type="button" style={{ '--i': i }} onClick={s.onClick}><Icon name={s.icon} /> {s.name}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="o-mega__title">{tr('Направления деятельности')}</div>
                      <div className="o-mega__list">
                        {directions.map((d, i) => (
                          <button key={d.key} type="button" style={{ '--i': i + 3 }} onClick={d.onClick}><Icon name={d.icon} /> {d.name}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="o-mega__foot" style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                    <button type="button" className="o-more" onClick={() => go('cases')}>{tr('Задачи заказчика')} <ArrowRight className="o-arrow" /></button>
                    <button type="button" className="o-more" onClick={() => go('directions')}>{tr('Все услуги')} <ArrowRight className="o-arrow" /></button>
                  </div>
                </div>
              </div>
            </div>

            <div className="o-nav__item">
              <button type="button" className={`o-nav__btn${current(['projects']) ? ' is-current' : ''}`} onClick={() => go('projects')} onMouseEnter={leave}>
                {tr('Проекты')}
              </button>
            </div>

            <div className={`o-nav__item${open === 'company' ? ' is-open' : ''}`} onMouseEnter={() => enter('company')}>
              {navButton('company', tr('О компании'), ['about', 'team', 'engagement', 'workflow', 'faq'])}
              <div className="o-mega" onMouseEnter={() => enter('company')}>
                <div className="o-wrap" style={{ paddingBlock: '1.5rem' }}>
                  <div className="o-mega__list" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))' }}>
                    {company.map((c, i) => (
                      <button key={c.key} type="button" style={{ '--i': i }} onClick={c.onClick}>{c.name}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="o-nav__item">
              <button type="button" className="o-nav__btn" onClick={() => goSection('contact')} onMouseEnter={leave}>{tr('Контакты')}</button>
            </div>
          </nav>

          <div className="o-tools">
            <div style={{ position: 'relative' }} className="o-hide-m">
              <button type="button" className="o-icon-btn" aria-label={text.actions.language} aria-expanded={langOpen}
                onClick={() => setLangOpen((v) => !v)}>
                <Globe /> <span>{(languageOptions.find((o) => o.code === language) || {}).short || language.toUpperCase()}</span>
              </button>
              {langOpen ? (
                <>
                  <button type="button" aria-hidden="true" tabIndex={-1} onClick={() => setLangOpen(false)}
                    style={{ position: 'fixed', inset: 0, background: 'transparent', border: 0, cursor: 'default', zIndex: 4 }} />
                  <div className="o-pop" role="menu">
                    {languageOptions.map((o) => (
                      <button key={o.code} type="button" role="menuitem" aria-current={o.code === language}
                        onClick={() => { setLanguage(o.code); setLangOpen(false); }}>{o.label}</button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
            <button type="button" className="o-icon-btn o-hide-m" onClick={toggleTheme}
              aria-label={theme === 'dark' ? text.actions.themeLight : text.actions.themeDark}>
              {theme === 'dark' ? <Sun /> : <Moon />}
            </button>
            <button type="button" className="o-btn o-btn--primary o-btn--sm o-hide-m" onClick={() => goSection('contact')}>
              {tr('Связаться')}
            </button>
            <button type="button" className="o-icon-btn o-burger" aria-expanded={drawer}
              aria-label={drawer ? tr('Закрыть меню') : tr('Открыть меню')} onClick={() => setDrawer((v) => !v)}>
              {drawer ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      <div className={`o-veil${open ? ' is-on' : ''}`} aria-hidden="true" />

      <div className={`o-drawer${drawer ? ' is-open' : ''}`} aria-hidden={!drawer}>
        <details>
          <summary>{tr('Комплексы фиксации')} <ChevronDown /></summary>
          <div className="o-drawer__links">{devices.map((d) => <button key={d.key} type="button" onClick={d.onClick}>{d.name}</button>)}</div>
        </details>
        <details>
          <summary>{tr('Продукты группы')} <ChevronDown /></summary>
          <div className="o-drawer__links">
            {platforms.map((p) => <button key={p.key} type="button" onClick={p.onClick}>{p.name}</button>)}
            <button type="button" onClick={() => go('catalog')}>{tr('Каталог оборудования')}</button>
          </div>
        </details>
        <details>
          <summary>{tr('Решения')} <ChevronDown /></summary>
          <div className="o-drawer__links">
            {solutions.map((s) => <button key={s.key} type="button" onClick={s.onClick}>{s.name}</button>)}
            {directions.map((d) => <button key={d.key} type="button" onClick={d.onClick}>{d.name}</button>)}
          </div>
        </details>
        <details>
          <summary>{tr('О компании')} <ChevronDown /></summary>
          <div className="o-drawer__links">{company.map((c) => <button key={c.key} type="button" onClick={c.onClick}>{c.name}</button>)}</div>
        </details>
        <button type="button" className="o-drawer__plain" onClick={() => go('projects')}>{tr('Проекты')}</button>
        <button type="button" className="o-drawer__plain" onClick={() => goSection('contact')}>{tr('Контакты')}</button>
        <div className="o-drawer__langs">
          {languageOptions.map((o) => (
            <button key={o.code} type="button" aria-current={o.code === language} onClick={() => setLanguage(o.code)}>{o.label}</button>
          ))}
        </div>
        <button type="button" className="o-btn o-btn--line" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun /> : <Moon />} {theme === 'dark' ? text.actions.themeLight : text.actions.themeDark}
        </button>
        <button type="button" className="o-btn o-btn--primary" onClick={() => goSection('contact')}>{tr('Связаться')}</button>
      </div>
    </>
  );
}
