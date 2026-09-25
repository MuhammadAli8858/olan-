// ---------------------------------------------------------------------------
// Разделы главной ниже ленты продуктов, в порядке hikvision.com:
// решения → направления → компания в цифрах → проекты → почему мы.
// Загружаются отдельным файлом, когда человек до них долистывает.
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { BENEFITS, COMPANY, COMPANY_STATS, DIRECTIONS, localize, PROJECTS, VIOLATION_SOLUTIONS } from '../data/siteData.js';
import { tr } from '../lib/i18n.js';
import { Icon } from '../lib/icons.jsx';
import { Img } from '../lib/img.jsx';
import { CountUp, oneLine, Reveal, toList, useParallaxVar } from '../lib/fx.jsx';
import { ProjectCard } from './Projects.jsx';
import { ProjectLightbox } from './ProjectLightbox.jsx';

// Фото по умолчанию для решений. Если в админке у решения указано своё
// изображение (поле image), берётся оно.
const SOLUTION_IMAGES = {
  speed: '/products/w-space-tip3.png',
  trafficLight: '/products/TRC2.png',
  parking: '/products/w-space-tip1.png',
  railwayCrossings: '/products/comoto4.png',
  buss: '/products/w-space a3.png',
};

const firstSentence = (value) => {
  const s = oneLine(value);
  const cut = s.search(/[.!?。]\s/);
  return cut > 40 ? s.slice(0, cut + 1) : s;
};

export function SolutionsPanels({ onNavigate }) {
  const { language } = useSite();
  const list = VIOLATION_SOLUTIONS || [];
  const [active, setActive] = useState(0);
  if (!list.length) return null;
  const hoverable = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  return (
    <section className="o-section" id="solutions">
      <div className="o-wrap">
        <Reveal className="o-head o-head--split">
          <div>
            <h2 className="o-h2">{tr('Решения по задачам')}</h2>
          </div>
          <button type="button" className="o-btn o-btn--line" onClick={() => onNavigate('cases')}>
            {tr('Все решения')} <ArrowRight className="o-arrow" />
          </button>
        </Reveal>
        <div className="o-panels">
          {list.map((s, i) => (
            <div key={s.id} className={`o-panel${i === active ? ' is-active' : ''}`}
              onMouseEnter={hoverable ? () => setActive(i) : undefined} onClick={() => setActive(i)} onFocus={() => setActive(i)}>
              <span className="o-panel__img">
                <Img src={s.image || SOLUTION_IMAGES[s.id]} alt="" sizes="(max-width: 900px) 100vw, 60vw" />
              </span>
              <div className="o-panel__body">
                <span className="o-panel__icon"><Icon name={s.icon} /></span>
                <h3 className="o-panel__title">{localize(s.title, language)}</h3>
                <div className="o-panel__more">
                  <p className="o-panel__text">{oneLine(localize(s.solution || s.problem, language))}</p>
                  <button type="button" className="o-more" onClick={(e) => { e.stopPropagation(); onNavigate(`solution-${s.id}`); }}>
                    {tr('Подробнее')} <ArrowRight className="o-arrow" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DirectionsTabs({ onNavigate }) {
  const { language } = useSite();
  const list = DIRECTIONS || [];
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState(() => new Set([0]));
  if (!list.length) return null;
  const select = (i) => {
    setActive(i);
    setSeen((s) => (s.has(i) ? s : new Set([...s, i])));
  };

  return (
    <section className="o-section o-section--tint" id="directions">
      <div className="o-wrap">
        <Reveal className="o-head o-head--split">
          <div>
            <h2 className="o-h2">{tr('Направления деятельности')}</h2>
            <p className="o-lead">{tr('Семь направлений: от фиксации нарушений и видеоаналитики до городских платформ, связи и локализации производства.')}</p>
          </div>
          <button type="button" className="o-btn o-btn--line" onClick={() => onNavigate('directions')}>
            {tr('Все услуги')} <ArrowRight className="o-arrow" />
          </button>
        </Reveal>
        <div className="o-dir">
          <div className="o-dir__list" role="tablist">
            {list.map((d, i) => (
              <button key={d.id} type="button" role="tab" aria-selected={i === active}
                className={`o-dir__tab${i === active ? ' is-active' : ''}`} onClick={() => select(i)}>
                <Icon name={d.icon} />
                <span>{localize(d.title, language)}</span>
                <ArrowRight className="o-arrow" />
              </button>
            ))}
          </div>
          <div className="o-dir__stage">
            {list.map((d, i) => {
              const points = toList(d.points, language).filter((p) => p.length <= 48).slice(0, 3);
              return (
                <div key={d.id} className={`o-dir__slide${i === active ? ' is-active' : ''}`} aria-hidden={i !== active}>
                  {seen.has(i) ? <Img src={d.image} alt="" sizes="(max-width: 900px) 100vw, 62vw" /> : null}
                  <div className="o-dir__cap">
                    <h3>{localize(d.title, language)}</h3>
                    <p>{oneLine(localize(d.text, language))}</p>
                    {points.length ? <ul>{points.map((p) => <li key={p}>{p}</li>)}</ul> : null}
                    <button type="button" className="o-btn o-btn--light o-btn--sm" tabIndex={i === active ? 0 : -1}
                      onClick={() => onNavigate(`card-directions-${d.id}`)}>
                      {tr('Подробнее')} <ArrowRight className="o-arrow" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function StatsBand({ onNavigate }) {
  const { language } = useSite();
  const ref = useRef(null);
  useParallaxVar(ref, 0.14);
  const stats = COMPANY_STATS || [];
  if (!stats.length) return null;
  return (
    <section ref={ref} className="o-stats" id="stats">
      <div className="o-stats__bg"><Img src="/products/uralan-p.png" alt="" sizes="100vw" /></div>
      <div className="o-wrap o-stats__in">
        <Reveal>
          <h2 className="o-h2">{tr('OLAN в цифрах')}</h2>
          <p className="o-lead">{firstSentence(localize(COMPANY && COMPANY.intro, language))}</p>
          <button type="button" className="o-btn o-btn--light" onClick={() => onNavigate('about')}>
            {tr('О компании')} <ArrowRight className="o-arrow" />
          </button>
        </Reveal>
        <div className="o-stats__grid">
          {stats.map((s) => (
            <div className="o-stat" key={s.id}>
              <div className="o-stat__v"><CountUp value={s.value} /></div>
              <div className="o-stat__l">{localize(s.label, language)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Нажатие на карточку открывает само фото на весь экран; листать можно
// все проекты, а не только пять с главной.
export function ProjectsShowcase({ onNavigate }) {
  const { language } = useSite();
  const [open, setOpen] = useState(null);
  const all = PROJECTS || [];
  const list = all.slice(0, 5);
  if (!list.length) return null;
  return (
    <section className="o-section" id="projects-home">
      <div className="o-wrap">
        <Reveal className="o-head o-head--split">
          <h2 className="o-h2">{tr('Проекты')}</h2>
          <button type="button" className="o-btn o-btn--line" onClick={() => onNavigate('projects')}>
            {tr('Все проекты')} <ArrowRight className="o-arrow" />
          </button>
        </Reveal>
        <div className="o-projects">
          {list.map((p, i) => <ProjectCard key={p.id || i} project={p} index={i} big={i === 0} language={language} onOpen={setOpen} />)}
        </div>
      </div>
      {open !== null && all[open] ? (
        <ProjectLightbox items={all} index={open} language={language} onClose={() => setOpen(null)} onChange={setOpen} />
      ) : null}
    </section>
  );
}

export function WhyOlan() {
  const { language } = useSite();
  const list = BENEFITS || [];
  if (!list.length) return null;
  return (
    <section className="o-section o-section--tint" id="why">
      <div className="o-wrap">
        <Reveal className="o-head"><h2 className="o-h2">{tr('Почему OLAN')}</h2></Reveal>
        <div className="o-why">
          {list.map((b, i) => (
            <Reveal key={b.id} className="o-why__item" delay={i * 90}>
              <span className="o-why__icon"><Icon name={b.icon} /></span>
              <h3>{localize(b.title, language)}</h3>
              <p>{localize(b.description, language)}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomeSections({ onNavigate }) {
  return (
    <>
      <SolutionsPanels onNavigate={onNavigate} />
      <DirectionsTabs onNavigate={onNavigate} />
      <StatsBand onNavigate={onNavigate} />
      <ProjectsShowcase onNavigate={onNavigate} />
      <WhyOlan />
    </>
  );
}
