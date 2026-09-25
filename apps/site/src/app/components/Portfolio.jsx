// ---------------------------------------------------------------------------
// Продукты группы: сетка карточек и отдельная страница продукта.
//
// Страница продукта устроена как у Hikvision: крупный первый экран,
// липкое меню разделов, цифры, возможности, блоки «картинка + текст»,
// таблица характеристик и финальный призыв. Все блоки необязательные —
// страница собирается из тех полей, что заполнены в админке.
// Если у продукта есть ссылка (поле link), в конце стоит кнопка на сайт
// продукта — так у Wider есть переход на touchwider.com.
// ---------------------------------------------------------------------------
import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, ExternalLink, Info } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { FORM_FACTORS, localize, PORTFOLIO, SOFTWARE_FEATURES } from '../data/siteData.js';
import { tr } from '../lib/i18n.js';
import { Icon } from '../lib/icons.jsx';
import { Img, isStudio } from '../lib/img.jsx';
import { CountUp, oneLine, Reveal, toList } from '../lib/fx.jsx';

const WiderScreen = lazy(() => import('./WiderScreen.jsx').then((m) => ({ default: m.WiderScreen })));

const hasStage = (p) => p && p.id === 'wider' && !p.image;

function ProductCard({ product, language, onOpen }) {
  const iconCard = (
    <span className="o-card__media is-icon" style={{ position: 'absolute', inset: 0 }}><Icon name={product.icon} /></span>
  );
  const badge = localize(product.badge, language);
  let media;
  if (hasStage(product)) {
    media = <span className="o-card__media" style={{ background: '#06080c' }}><Suspense fallback={null}><WiderScreen align="center" /></Suspense></span>;
  } else if (product.image) {
    media = (
      <span className={`o-card__media${isStudio(product.image) ? ' is-studio' : ''}`}>
        <span className="o-zoom"><Img src={product.image} alt="" sizes="(max-width: 640px) 100vw, 30vw" fallback={iconCard} /></span>
      </span>
    );
  } else {
    media = <span className="o-card__media is-icon"><Icon name={product.icon} /></span>;
  }
  return (
    <button type="button" className="o-card" onClick={() => onOpen(product.id)}>
      {media}
      {badge ? <span className="o-card__badge">{badge}</span> : null}
      <span className="o-card__body">
        <span className="o-card__cat">{oneLine(localize(product.subtitle, language))}</span>
        <span className="o-card__name">{localize(product.title, language)}</span>
        <span className="o-card__text">{oneLine(localize(product.description, language))}</span>
        <span className="o-more">{tr('Подробнее')} <ArrowRight className="o-arrow" /></span>
      </span>
    </button>
  );
}

export function Portfolio({ onOpen }) {
  const { language } = useSite();
  return (
    <section className="o-section">
      <div className="o-wrap">
        <div className="o-grid-cards">
          {(PORTFOLIO || []).map((p) => <ProductCard key={p.id} product={p} language={language} onOpen={onOpen} />)}
        </div>
      </div>
    </section>
  );
}

// Живые иллюстрации для разделов страницы (поле visual у раздела).
function Vignette({ kind }) {
  if (kind === 'touch') {
    return (
      <div className="o-vg">
        <div className="o-vg__screen">
          {[[22, 42, '0s'], [50, 64, '.85s'], [77, 36, '1.7s']].map(([x, y, d]) => (
            <span key={x} className="o-vg__tap" style={{ '--x': `${x}%`, '--y': `${y}%`, '--d': d }} />
          ))}
        </div>
      </div>
    );
  }
  if (kind === 'audio') {
    return (
      <div className="o-vg">
        <div className="o-vg__eq">
          {Array.from({ length: 28 }, (_, i) => (
            <i key={i} style={{ '--t': `${0.45 + ((i * 37) % 9) / 10}s`, '--d': `${-(i * 0.13).toFixed(2)}s`,
              '--h1': (0.35 + ((i * 53) % 65) / 100).toFixed(2), '--h2': (0.2 + ((i * 29) % 60) / 100).toFixed(2) }} />
          ))}
        </div>
      </div>
    );
  }
  if (kind === 'battery') return <div className="o-vg"><div className="o-vg__batt"><i /></div></div>;
  if (kind === 'brand') return <div className="o-vg"><div className="o-vg__brand"><span>{tr('Ваш логотип')}</span></div></div>;
  return null;
}

const scrollToBlock = (e, id) => {
  e.preventDefault();
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export function ProductPage({ productId, onBack, onContact, onNavigate }) {
  const { language } = useSite();
  const product = (PORTFOLIO || []).find((p) => p.id === productId);
  const [zoom, setZoom] = useState(false);
  const [current, setCurrent] = useState('pp-overview');

  const blocks = product ? [
    { id: 'pp-overview', label: tr('Обзор'), on: true },
    { id: 'pp-features', label: tr('Возможности'), on: toList(product.features, language).length > 0 || product.id === 'complexes' },
    { id: 'pp-use', label: tr('Применение'), on: (product.sections || []).length > 0 },
    { id: 'pp-specs', label: tr('Характеристики'), on: (product.specs || []).length > 0 },
  ].filter((b) => b.on) : [];

  useEffect(() => {
    if (!product || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setCurrent(e.target.id); });
    }, { rootMargin: '-35% 0px -55% 0px' });
    blocks.forEach((b) => { const el = document.getElementById(b.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [productId, language]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!product) {
    return (
      <section className="o-pagehead">
        <div className="o-wrap">
          <h1>{tr('Продукт')}</h1>
          <button type="button" className="o-btn o-btn--line" style={{ marginTop: '1.5rem' }} onClick={onBack}><ArrowLeft /> {tr('Все продукты')}</button>
        </div>
      </section>
    );
  }

  const title = localize(product.title, language);
  const features = toList(product.features, language);
  const tags = toList(product.tags, language);
  const clients = toList(product.clients, language);
  const highlights = (product.highlights || []).map((h) => ({ value: localize(h.value, language), label: localize(h.label, language) }));
  const sections = (product.sections || []).map((s) => ({ visual: s.visual, image: s.image, title: localize(s.title, language), text: localize(s.text, language) }));
  const specs = (product.specs || []).map((s) => ({ label: localize(s.label, language), value: localize(s.value, language) }));
  const link = product.link;
  const linkLabel = localize(product.linkLabel, language) || tr('Перейти на сайт');
  const related = (PORTFOLIO || []).filter((p) => p.id !== product.id && p.id !== 'catalog').slice(0, 3);
  const blockStyle = { scrollMarginTop: 'calc(var(--o-header) + 70px)' };
  const external = link ? (
    <a className="o-btn o-btn--line" href={link} target="_blank" rel="noopener noreferrer">{linkLabel} <ExternalLink /></a>
  ) : null;

  let visual;
  if (hasStage(product)) {
    visual = <div className="o-pp-visual o-pp-visual--stage"><Suspense fallback={null}><WiderScreen align="center" /></Suspense></div>;
  } else if (product.image) {
    visual = (
      <button type="button" className={`o-pp-visual${isStudio(product.image) ? ' is-studio' : ''}`} onClick={() => setZoom(true)} style={{ cursor: 'zoom-in' }}>
        <Img src={product.image} alt={title} eager sizes="(max-width: 900px) 100vw, 55vw"
          fallback={<span className="o-pp-visual is-icon" style={{ position: 'absolute', inset: 0 }}><Icon name={product.icon} /></span>} />
      </button>
    );
  } else {
    visual = <div className="o-pp-visual is-icon"><Icon name={product.icon} /></div>;
  }

  return (
    <>
      <section className="o-pp-hero">
        <div className="o-wrap o-pp-hero__grid">
          <div>
            <nav className="o-crumbs">
              <button type="button" onClick={() => onNavigate('home')}>{tr('Главная')}</button><ChevronRight />
              <button type="button" onClick={() => onNavigate('portfolio')}>{tr('Продукты группы')}</button><ChevronRight />
              <span>{title}</span>
            </nav>
            {localize(product.badge, language) ? <div className="o-hero__badge" style={{ marginTop: '1.25rem', marginBottom: 0 }}>{localize(product.badge, language)}</div> : null}
            <h1>{title}</h1>
            <p className="o-pp-hero__sub">{localize(product.subtitle, language)}</p>
            <p className="o-pp-hero__desc">{localize(product.description, language)}</p>
            <div className="o-pp-hero__actions">
              <button type="button" className="o-btn o-btn--primary" onClick={onContact}>{tr('Связаться')} <ArrowRight className="o-arrow" /></button>
              {external}
            </div>
          </div>
          <div>
            {visual}
            {product.imageCaption ? <p style={{ marginTop: '.75rem', fontSize: '.85rem', color: 'var(--o-muted)' }}>{localize(product.imageCaption, language)}</p> : null}
          </div>
        </div>
      </section>

      {blocks.length > 1 ? (
        <nav className="o-subnav">
          <div className="o-wrap o-subnav__in">
            {blocks.map((b) => (
              <a key={b.id} href={`#${b.id}`} className={current === b.id ? 'is-active' : ''} onClick={(e) => scrollToBlock(e, b.id)}>{b.label}</a>
            ))}
          </div>
        </nav>
      ) : null}

      <section className="o-section">
        <div className="o-wrap">
          <div id="pp-overview" className="o-pp-block" style={blockStyle}>
            {highlights.length ? (
              <div className="o-highlights">
                {highlights.map((h, i) => (
                  <Reveal key={i} className="o-hl" delay={i * 80}>
                    <div className="o-hl__v"><CountUp value={h.value} /></div>
                    <div className="o-hl__l">{h.label}</div>
                  </Reveal>
                ))}
              </div>
            ) : (
              <p className="o-lead" style={{ margin: 0, color: 'var(--o-text)' }}>{localize(product.description, language)}</p>
            )}
          </div>

          {features.length || product.id === 'complexes' ? (
            <div id="pp-features" className="o-pp-block" style={blockStyle}>
              {features.length ? (
                <>
                  <h2 className="o-h2">{tr('Возможности')}</h2>
                  <div className="o-features">
                    {features.map((f) => <div key={f} className="o-feature"><CheckCircle2 /> <span>{f}</span></div>)}
                  </div>
                </>
              ) : null}
              {product.id === 'complexes' && FORM_FACTORS ? (
                <div style={{ marginTop: features.length ? 'clamp(3rem, 6vw, 5rem)' : 0 }}>
                  <h2 className="o-h2">{localize(FORM_FACTORS.title, language)}</h2>
                  {FORM_FACTORS.note ? <p className="o-lead" style={{ marginTop: '-1rem', marginBottom: '1.5rem' }}>{localize(FORM_FACTORS.note, language)}</p> : null}
                  <div className="o-features">
                    {(FORM_FACTORS.items || []).map((item, i) => (
                      <div key={i} className="o-feature"><Icon name={item.icon} /><span><b>{localize(item.title, language)}</b>{localize(item.text, language)}</span></div>
                    ))}
                  </div>
                </div>
              ) : null}
              {product.id === 'complexes' && SOFTWARE_FEATURES ? (
                <div style={{ marginTop: 'clamp(3rem, 6vw, 5rem)' }}>
                  <h2 className="o-h2">{localize(SOFTWARE_FEATURES.title, language)}</h2>
                  <div className="o-features">
                    {(SOFTWARE_FEATURES.items || []).map((item, i) => (
                      <div key={i} className="o-feature"><Icon name={item.icon} /><span><b>{localize(item.title, language)}</b>{localize(item.text, language)}</span></div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {sections.length ? (
            <div id="pp-use" className="o-pp-block" style={blockStyle}>
              {sections.map((s, i) => (
                <div key={i} className="o-split">
                  <Reveal className="o-split__media" variant="unmask">
                    {s.image ? <Img src={s.image} alt="" sizes="(max-width: 900px) 100vw, 50vw" /> : <Vignette kind={s.visual} />}
                  </Reveal>
                  <Reveal>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </Reveal>
                </div>
              ))}
            </div>
          ) : null}

          {specs.length ? (
            <div id="pp-specs" className="o-pp-block" style={blockStyle}>
              <h2 className="o-h2">{tr('Характеристики')}</h2>
              <dl className="o-specs">
                {specs.map((s, i) => <div key={i} className="o-specs__row"><dt>{s.label}</dt><dd>{s.value}</dd></div>)}
              </dl>
            </div>
          ) : null}

          {tags.length ? (
            <div className="o-pp-block">
              <h2 className="o-h2">{localize(product.tagsTitle, language) || tr('Применение')}</h2>
              <div className="o-tags">{tags.map((t) => <span key={t} className="o-tag">{t}</span>)}</div>
            </div>
          ) : null}

          {clients.length ? (
            <div className="o-pp-block">
              <h2 className="o-h2">{localize(product.clientsTitle, language)}</h2>
              <div className="o-clients">{clients.map((c) => <div key={c} className="o-client">{c}</div>)}</div>
            </div>
          ) : null}

          {localize(product.note, language) || localize(product.meta, language) ? (
            <div className="o-pp-block" style={{ display: 'grid', gap: '1rem' }}>
              {localize(product.note, language) ? <div className="o-note"><Info /> <span>{localize(product.note, language)}</span></div> : null}
              {localize(product.meta, language) ? <p style={{ color: 'var(--o-muted)', fontSize: '.9rem' }}>{localize(product.meta, language)}</p> : null}
            </div>
          ) : null}

          {related.length ? (
            <div className="o-pp-block">
              <div className="o-head o-head--split" style={{ marginBottom: '1.75rem' }}>
                <h2 className="o-h2" style={{ margin: 0 }}>{tr('Продукты группы')}</h2>
                <button type="button" className="o-more" onClick={() => onNavigate('portfolio')}>{tr('Все продукты')} <ArrowRight className="o-arrow" /></button>
              </div>
              <div className="o-grid-cards">
                {related.map((p) => <ProductCard key={p.id} product={p} language={language} onOpen={(id) => onNavigate(`product-${id}`)} />)}
              </div>
            </div>
          ) : null}

          <div className="o-pp-block">
            <div className="o-cta">
              <div>
                <h2>{tr('Остались вопросы?')}</h2>
                <p>{tr('Расскажите о задаче — подберём оборудование и подготовим предложение.')}</p>
              </div>
              <div className="o-cta__actions">
                <button type="button" className="o-btn o-btn--primary" onClick={onContact}>{tr('Связаться')} <ArrowRight className="o-arrow" /></button>
                {link ? (
                  <a className="o-btn o-btn--light" href={link} target="_blank" rel="noopener noreferrer">{linkLabel} <ExternalLink /></a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {zoom && product.image ? (
        <div className="o-lightbox" role="dialog" aria-label={title} onClick={() => setZoom(false)}>
          <Img src={product.image} alt={title} sizes="100vw" />
        </div>
      ) : null}
    </>
  );
}
