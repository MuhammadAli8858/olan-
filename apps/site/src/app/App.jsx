import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { BaseModal } from './components/BaseModal.jsx';
import { Header } from './components/Header.jsx';
import { Hero } from './components/Hero.jsx';
import { SiteProvider, useSite } from './context/SiteContext.jsx';
import { Reveal } from './components/Reveal.jsx';
import { localize } from './data/siteData.js';

// Первый экран (шапка и Hero) грузится сразу, всё остальное — отдельными
// файлами по мере надобности. Так страница появляется заметно быстрее
// и в памяти не висит то, до чего пользователь ещё не долистал.
const Solutions = lazy(() => import('./components/Solutions.jsx').then((m) => ({ default: m.Solutions })));
const Catalog = lazy(() => import('./components/Catalog.jsx').then((m) => ({ default: m.Catalog })));
const Benefits = lazy(() => import('./components/Benefits.jsx').then((m) => ({ default: m.Benefits })));
const Process = lazy(() => import('./components/Process.jsx').then((m) => ({ default: m.Process })));
const Projects = lazy(() => import('./components/Projects.jsx').then((m) => ({ default: m.Projects })));
const FAQ = lazy(() => import('./components/FAQ.jsx').then((m) => ({ default: m.FAQ })));
const Contact = lazy(() => import('./components/Contact.jsx').then((m) => ({ default: m.Contact })));
const Footer = lazy(() => import('./components/Footer.jsx').then((m) => ({ default: m.Footer })));
const AboutPage = lazy(() => import('./components/AboutPage.jsx').then((m) => ({ default: m.AboutPage })));
const SolutionPage = lazy(() => import('./components/SolutionPage.jsx').then((m) => ({ default: m.SolutionPage })));
const LiveMonitor = lazy(() => import('./components/LiveMonitor.jsx').then((m) => ({ default: m.LiveMonitor })));
const Company = lazy(() => import('./components/Company.jsx').then((m) => ({ default: m.Company })));
const Directions = lazy(() => import('./components/Directions.jsx').then((m) => ({ default: m.Directions })));
const Portfolio = lazy(() => import('./components/Portfolio.jsx').then((m) => ({ default: m.Portfolio })));
const ProductPage = lazy(() => import('./components/Portfolio.jsx').then((m) => ({ default: m.ProductPage })));
const Engagement = lazy(() => import('./components/CompanySections.jsx').then((m) => ({ default: m.Engagement })));
const Workflow = lazy(() => import('./components/CompanySections.jsx').then((m) => ({ default: m.Workflow })));
const Team = lazy(() => import('./components/CompanySections.jsx').then((m) => ({ default: m.Team })));
const PartnerValue = lazy(() => import('./components/CompanySections.jsx').then((m) => ({ default: m.PartnerValue })));
const CardPage = lazy(() => import('./components/CardPage.jsx').then((m) => ({ default: m.CardPage })));
const ServiceCases = lazy(() => import('./components/ServiceCases.jsx').then((m) => ({ default: m.ServiceCases })));
const AboutCompany = lazy(() => import('./components/AboutCompany.jsx').then((m) => ({ default: m.AboutCompany })));
const ChatWidget = lazy(() => import('./components/ChatWidget.jsx').then((m) => ({ default: m.ChatWidget })));

// Пока кусок подгружается, оставляем пустое место — без прыжков вёрстки.
function Deferred({ children, minHeight = 0 }) {
  return <Suspense fallback={<div style={{ minHeight }} />}>{children}</Suspense>;
}

function scrollToId(id) {
  const target = document.getElementById(id);
  if (!target) return;
  // Страховка: если прокрутка почему-то недоступна, переход не должен
  // падать с ошибкой и обрывать работу кнопки.
  if (typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (typeof window !== 'undefined' && window.scrollTo) {
    window.scrollTo({ top: target.offsetTop || 0, behavior: 'smooth' });
  }
}

function ProductModal({ product, onClose }) {
  const { language, text } = useSite();
  const [activeImage, setActiveImage] = useState(0);

  const gallery = useMemo(() => (product ? product.images : []), [product]);

  useEffect(() => {
    setActiveImage(0);
  }, [product]);

  return (
    <BaseModal isOpen={Boolean(product)} onClose={onClose} title={product ? localize(product.name, language) : ''} wide>
      {product ? (
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.95fr]">
          <div>
            <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-slate-100 dark:bg-slate-900">
              <img src={gallery[activeImage]} alt={localize(product.name, language)} className="h-[320px] w-full object-cover md:h-full" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {gallery.map((image, index) => (
                <button
                  key={`${product.id}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`overflow-hidden rounded-2xl border ${activeImage === index ? 'border-cyan-500' : 'border-slate-200 dark:border-cyan-500/15'}`}
                >
                  <img src={image} alt={`${localize(product.name, language)} ${index + 1}`} className="h-24 w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-slate-50 p-5 dark:bg-slate-900">
              <div className="text-sm text-slate-600 dark:text-slate-400">{text.catalog.priceLabel}</div>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{localize(product.price, language)}</div>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{localize(product.description, language)}</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">{text.catalog.specsTitle}</h4>
              <div className="mt-3 space-y-3">
                {localize(product.specs, language).map((spec) => (
                  <div key={spec} className="rounded-2xl border border-slate-200 dark:border-cyan-500/15 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                    {spec}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">{text.catalog.appsTitle}</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {localize(product.applications, language).map((app) => (
                  <span key={app} className="rounded-full border border-slate-200 dark:border-cyan-500/20 bg-cyan-500/5 px-4 py-2 text-sm text-cyan-700 dark:text-cyan-300">
                    {app}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                setTimeout(() => scrollToId('contact'), 60);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:scale-[1.02]"
            >
              {text.actions.buy}
            </button>
          </div>
        </div>
      ) : null}
    </BaseModal>
  );
}

// Маршрут читается из адреса: #about — о компании,
// #solution-speed — отдельная страница решения.
// Разделы, у которых своя страница, а не блок на главной.
const PAGES = ['about', 'directions', 'engagement', 'portfolio', 'catalog', 'workflow', 'projects', 'team', 'faq', 'cases'];

function routeFromHash() {
  if (typeof window === 'undefined') return { name: 'home', id: '' };
  const h = window.location.hash.replace(/^#/, '');
  if (!h) return { name: 'home', id: '' };

  // Страница одной карточки: card-<раздел>-<ключ>
  if (h.startsWith('card-')) {
    const rest = h.slice('card-'.length);
    const cut = rest.indexOf('-');
    if (cut > 0) return { name: 'card', id: rest.slice(cut + 1), collection: rest.slice(0, cut) };
  }
  if (h.startsWith('solution-')) return { name: 'solution', id: h.slice('solution-'.length) };
  if (h.startsWith('product-')) return { name: 'product', id: h.slice('product-'.length) };

  // Отдельные страницы разделов
  if (PAGES.includes(h)) return { name: h, id: '' };

  return { name: 'home', id: h };
}


// Заголовок раздела для отдельных страниц.
function PageHead({ tag, title, lead }) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 pt-24 dark:border-slate-800 dark:bg-slate-950">
      <div className="container mx-auto px-4 py-12 text-center">
        {tag && (
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-400">{tag}</div>
        )}
        <h1 className="mt-3 font-black text-slate-900 dark:text-white">{title}</h1>
        {lead && <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-slate-700 dark:text-slate-300">{lead}</p>}
      </div>
    </div>
  );
}

function AppContent() {
  const [routeState, setRouteState] = useState(routeFromHash);
  const route = routeState.name;
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [catalogCategory, setCatalogCategory] = useState('all');

  useEffect(() => {
    const onHash = () => setRouteState(routeFromHash());
    window.addEventListener('hashchange', onHash);
    const onOpenSolution = (event) => { window.location.hash = `solution-${event.detail}`; };
    window.addEventListener('olan:open-solution', onOpenSolution);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('olan:open-solution', onOpenSolution);
    };
  }, []);

  // При переходе на другую страницу всегда начинаем сверху.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route, routeState.id]);

  // Переход: отдельные разделы открываются страницей, якоря — прокруткой.
  const navigate = (target) => {
    const value = String(target);
    const isPage = PAGES.includes(value)
      || value.startsWith('solution-') || value.startsWith('product-') || value.startsWith('card-');

    if (isPage) {
      const hash = `#${value}`;
      if (window.location.hash !== hash) window.location.hash = value;
      else setRouteState(routeFromHash());
      return;
    }

    // Якорь на главной: если мы на другой странице — сначала возвращаемся.
    if (route !== 'home') {
      window.location.hash = '';
      setRouteState({ name: 'home', id: '' });
      setTimeout(() => scrollToId(value), 80);
      return;
    }
    scrollToId(value);
  };

  // «Назад» возвращает на предыдущую страницу. Если человек попал сюда
  // по прямой ссылке и истории нет — уводим на главную, чтобы кнопка
  // никогда не оказалась бесполезной.
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    goHome();
  };

  const goHome = () => {
    if (window.location.hash) window.location.hash = '';
    setRouteState({ name: 'home', id: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goSection = (id) => navigate(id);
  const goContact = () => navigate('contact');
  const openSolution = (solutionId) => navigate(`solution-${solutionId}`);
  // Каталог открывается сразу оборудованием, а не описанием продукта.
  const openProduct = (productId) => navigate(productId === 'catalog' ? 'catalog' : `product-${productId}`);
  const openCard = (collection, cardKey) => navigate(`card-${collection}-${cardKey}`);
  const selectViolation = (catId) => { setCatalogCategory(catId || 'all'); navigate('catalog'); };

  return (
    <div className="min-h-screen bg-white text-slate-900 transition-colors duration-300 dark:bg-black dark:text-white">
      <Header route={route} onNavigate={navigate} onSection={goSection} onHome={goHome} />

      {/* ─────────────────────────── Отдельные страницы ─────────────────────────── */}

      {route === 'card' ? (
        <Deferred minHeight={600}>
          <CardPage
            collection={routeState.collection}
            cardKey={routeState.id}
            onBack={goBack}
            onContact={goContact}
            onSection={goSection}
          />
        </Deferred>
      ) : route === 'product' ? (
        <Deferred minHeight={600}>
          <ProductPage productId={routeState.id} onBack={goBack} onContact={goContact} />
        </Deferred>
      ) : route === 'solution' ? (
        <Deferred minHeight={600}>
          <SolutionPage solutionId={routeState.id} onBack={goBack} onOpenProduct={setSelectedProduct} onContact={goContact} />
        </Deferred>
      ) : route === 'about' ? (
        <Deferred minHeight={600}>
          <AboutCompany onNavigate={navigate} />
        </Deferred>
      ) : route === 'engagement' ? (
        <Deferred minHeight={600}>
          <PageHead
            tag="Модели сотрудничества"
            title="Роль OLAN в проектах партнёров"
            lead="В какой роли компания входит в проект и что получает партнёр в каждом случае."
          />
          <Engagement bare />
        </Deferred>
      ) : route === 'cases' ? (
        <Deferred minHeight={600}>
          <PageHead
            tag="Задачи заказчика"
            title="С чем к нам приходят"
            lead="Найдите свою ситуацию — рядом стоит услуга, которая её закрывает. Фиксация нарушений это только одно из направлений."
          />
          <ServiceCases onOpen={navigate} compact />
        </Deferred>
      ) : route === 'directions' ? (
        <Deferred minHeight={600}>
          <PageHead
            tag="Что мы делаем"
            title="Услуги и направления деятельности"
            lead="Компания закрывает не одну задачу, а весь контур: фиксация нарушений, видеоаналитика, городские платформы, связь, взимание платы за проезд, мониторинг с БПЛА и локализация производства."
          />
          <Directions onOpenCard={(id) => openCard('directions', id)} />
        </Deferred>
      ) : route === 'portfolio' ? (
        <Deferred minHeight={600}>
          <PageHead
            tag="Продуктовая линейка"
            title="Продукты компании"
            lead="Собственная разработка — от библиотеки распознавания номеров до городских платформ данных. Нажмите на карточку, чтобы посмотреть состав продукта."
          />
          <Portfolio onOpen={openProduct} bare />
        </Deferred>
      ) : route === 'catalog' ? (
        <Deferred minHeight={600}>
          <Catalog onOpenProduct={setSelectedProduct} category={catalogCategory} onCategoryChange={setCatalogCategory} />
        </Deferred>
      ) : route === 'workflow' ? (
        <Deferred minHeight={600}><Workflow /></Deferred>
      ) : route === 'projects' ? (
        <Deferred minHeight={600}>
          <div className="dark"><Projects /></div>
        </Deferred>
      ) : route === 'team' ? (
        <Deferred minHeight={600}>
          <PageHead
            tag="Команда"
            title="Компетенции команды"
            lead="Все ключевые компетенции собраны в едином контуре ответственности. Нажмите на карточку — откроется подробное описание."
          />
          <Team onOpenCard={openCard} />
        </Deferred>
      ) : route === 'faq' ? (
        <Deferred minHeight={600}><FAQ onContact={goContact} /></Deferred>
      ) : (
        /* ──────────────────────────── Главная страница ──────────────────────────── */
        <>
          <div className="dark">
            <Hero onCatalog={() => navigate('catalog')} onContact={goContact} />
            <Deferred minHeight={500}><LiveMonitor /></Deferred>
          </div>

          <Deferred minHeight={400}>
            {/* Какое нарушение нужно фиксировать */}
            <Reveal><Solutions onSelectCategory={openSolution} onContact={goContact} /></Reveal>
            {/* Почему покупают именно у нас */}
            <Reveal><Benefits /></Reveal>
            {/* Как оформить заказ */}
            <Reveal><Process onCatalog={() => navigate('catalog')} /></Reveal>
            {/* Практическое подтверждение и что это значит для партнёра */}
            <Reveal><PartnerValue /></Reveal>
            {/* Контакты живут на главной — отдельной страницы им не нужно */}
            <Reveal><Contact /></Reveal>
          </Deferred>
        </>
      )}

      <Deferred minHeight={200}><Footer onNavigate={navigate} onSection={goSection} /></Deferred>
      <Deferred><ChatWidget /></Deferred>
      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}

export default function App() {
  return (
    <SiteProvider>
      <AppContent />
    </SiteProvider>
  );
}
