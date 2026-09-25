import { lazy, Suspense, useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Header } from './components/Header.jsx';
import { HeroSlider } from './components/HeroSlider.jsx';
import { ProductRail } from './components/ProductRail.jsx';
import { LazyMount } from './components/LazyMount.jsx';
import { SiteProvider, useSite } from './context/SiteContext.jsx';
import { PRODUCTS } from './data/siteData.js';
import { tr } from './lib/i18n.js';
import { slowNetwork } from './lib/fx.jsx';

// Всё, что ниже первого экрана и на отдельных страницах, грузится отдельными
// файлами: первый экран не ждёт кода, который ещё не нужен.
const HomeSections = lazy(() => import('./components/HomeSections.jsx'));
const Catalog = lazy(() => import('./components/Catalog.jsx').then((m) => ({ default: m.Catalog })));
const Projects = lazy(() => import('./components/Projects.jsx').then((m) => ({ default: m.Projects })));
const FAQ = lazy(() => import('./components/FAQ.jsx').then((m) => ({ default: m.FAQ })));
const Contact = lazy(() => import('./components/Contact.jsx').then((m) => ({ default: m.Contact })));
const Footer = lazy(() => import('./components/Footer.jsx').then((m) => ({ default: m.Footer })));
const SolutionPage = lazy(() => import('./components/SolutionPage.jsx').then((m) => ({ default: m.SolutionPage })));
const Directions = lazy(() => import('./components/Directions.jsx').then((m) => ({ default: m.Directions })));
const Portfolio = lazy(() => import('./components/Portfolio.jsx').then((m) => ({ default: m.Portfolio })));
const ProductPage = lazy(() => import('./components/Portfolio.jsx').then((m) => ({ default: m.ProductPage })));
const Engagement = lazy(() => import('./components/CompanySections.jsx').then((m) => ({ default: m.Engagement })));
const Workflow = lazy(() => import('./components/CompanySections.jsx').then((m) => ({ default: m.Workflow })));
const Team = lazy(() => import('./components/CompanySections.jsx').then((m) => ({ default: m.Team })));
const CardPage = lazy(() => import('./components/CardPage.jsx').then((m) => ({ default: m.CardPage })));
const ServiceCases = lazy(() => import('./components/ServiceCases.jsx').then((m) => ({ default: m.ServiceCases })));
const AboutCompany = lazy(() => import('./components/AboutCompany.jsx').then((m) => ({ default: m.AboutCompany })));
const ProductModal = lazy(() => import('./components/ProductModal.jsx').then((m) => ({ default: m.ProductModal })));
const ChatWidget = lazy(() => import('./components/ChatWidget.jsx').then((m) => ({ default: m.ChatWidget })));

function Deferred({ children, minHeight = 0 }) {
  return <Suspense fallback={<div style={{ minHeight }} />}>{children}</Suspense>;
}

// Прокрутка к блоку, которого ещё может не быть: разделы главной
// монтируются по мере прокрутки, поэтому ждём появления элемента.
function scrollToId(id, tries = 40) {
  const target = document.getElementById(id);
  if (target) {
    if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: target.offsetTop || 0, behavior: 'smooth' });
    return;
  }
  if (tries > 0) setTimeout(() => scrollToId(id, tries - 1), 100);
}

// Чат не нужен в первые секунды — он подключается после первого действия
// человека или когда страница уже спокойно загрузилась.
function useIdleMount() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let done = false;
    const events = ['pointerdown', 'keydown', 'touchstart'];
    const cleanup = () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, go)); };
    const go = () => { if (done) return; done = true; cleanup(); setOn(true); };
    const timer = setTimeout(go, slowNetwork() ? 9000 : 3500);
    events.forEach((e) => window.addEventListener(e, go, { passive: true }));
    return cleanup;
  }, []);
  return on;
}

// Маршрут читается из адреса: #about — о компании, #solution-speed — страница
// решения, #product-wider — страница продукта, #card-<раздел>-<ключ> — карточка.
const PAGES = ['about', 'directions', 'engagement', 'portfolio', 'catalog', 'workflow', 'projects', 'team', 'faq', 'cases'];

function routeFromHash() {
  if (typeof window === 'undefined') return { name: 'home', id: '' };
  const h = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  if (!h) return { name: 'home', id: '' };
  if (h.startsWith('card-')) {
    const rest = h.slice('card-'.length);
    const cut = rest.indexOf('-');
    if (cut > 0) return { name: 'card', id: rest.slice(cut + 1), collection: rest.slice(0, cut) };
  }
  if (h.startsWith('solution-')) return { name: 'solution', id: h.slice('solution-'.length) };
  if (h.startsWith('product-')) return { name: 'product', id: h.slice('product-'.length) };
  if (PAGES.includes(h)) return { name: h, id: '' };
  return { name: 'home', id: h };
}

function PageHead({ tag, title, lead, onHome }) {
  return (
    <div className="o-pagehead">
      <div className="o-wrap">
        <nav className="o-crumbs">
          <button type="button" onClick={onHome}>{tr('Главная')}</button>
          {tag ? <><ChevronRight /><span>{tag}</span></> : null}
        </nav>
        <h1>{title}</h1>
        {lead ? <p>{lead}</p> : null}
      </div>
    </div>
  );
}

function AppContent() {
  const [routeState, setRouteState] = useState(routeFromHash);
  const route = routeState.name;
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [catalogCategory, setCatalogCategory] = useState('all');
  const chatReady = useIdleMount();
  // Окно карточки подключается при первом открытии и дальше остаётся,
  // чтобы анимация закрытия успевала отыграть.
  const [modalUsed, setModalUsed] = useState(false);
  useEffect(() => { if (selectedProduct) setModalUsed(true); }, [selectedProduct]);

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

  // На другой странице начинаем сверху; якорь на главной (#contact) — докручиваем.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (route === 'home' && routeState.id) {
      window.dispatchEvent(new Event('olan:mount-all'));
      scrollToId(routeState.id);
    }
  }, [route, routeState.id]);

  const goHome = () => {
    if (window.location.hash) window.location.hash = '';
    setRouteState({ name: 'home', id: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDevice = (id) => {
    const found = (PRODUCTS || []).find((p) => p.id === id);
    if (found) setSelectedProduct(found);
  };

  const navigate = (target) => {
    const value = String(target || '');
    if (!value || value === 'home') { goHome(); return; }
    if (value.startsWith('device-')) { openDevice(value.slice('device-'.length)); return; }
    const isPage = PAGES.includes(value)
      || value.startsWith('solution-') || value.startsWith('product-') || value.startsWith('card-');
    if (isPage) {
      if (window.location.hash !== `#${value}`) window.location.hash = value;
      else setRouteState(routeFromHash());
      return;
    }
    // Якорь на главной: разделы включаются сразу, затем прокрутка.
    window.dispatchEvent(new Event('olan:mount-all'));
    if (route !== 'home') {
      window.location.hash = '';
      setRouteState({ name: 'home', id: '' });
      setTimeout(() => scrollToId(value), 120);
      return;
    }
    scrollToId(value);
  };

  const goBack = () => {
    if (window.history.length > 1) { window.history.back(); return; }
    goHome();
  };
  const goSection = (id) => navigate(id);
  const goContact = () => navigate('contact');
  const openProduct = (productId) => navigate(productId === 'catalog' ? 'catalog' : `product-${productId}`);
  const openCard = (collection, cardKey) => navigate(`card-${collection}-${cardKey}`);

  return (
    <div className="o-app" style={{ overflowX: 'clip' }}>
      <Header route={route} onNavigate={navigate} onSection={goSection} onHome={goHome} onOpenDevice={openDevice} />

      <main>
        {route === 'card' ? (
          <Deferred minHeight={600}>
            <CardPage collection={routeState.collection} cardKey={routeState.id} onBack={goBack} onContact={goContact} onSection={goSection} />
          </Deferred>
        ) : route === 'product' ? (
          <Deferred minHeight={600}>
            <ProductPage productId={routeState.id} onBack={goBack} onContact={goContact} onNavigate={navigate} />
          </Deferred>
        ) : route === 'solution' ? (
          <Deferred minHeight={600}>
            <SolutionPage solutionId={routeState.id} onBack={goBack} onOpenProduct={setSelectedProduct} onContact={goContact} />
          </Deferred>
        ) : route === 'about' ? (
          <Deferred minHeight={600}><AboutCompany onNavigate={navigate} /></Deferred>
        ) : route === 'engagement' ? (
          <Deferred minHeight={600}>
            <PageHead onHome={goHome} tag={tr('Модели сотрудничества')} title={tr('Роль OLAN в проектах партнёров')}
              lead={tr('В какой роли компания входит в проект и что получает партнёр в каждом случае.')} />
            <Engagement bare />
          </Deferred>
        ) : route === 'cases' ? (
          <Deferred minHeight={600}>
            <PageHead onHome={goHome} tag={tr('Задачи заказчика')} title={tr('С чем к нам приходят')}
              lead={tr('Найдите свою ситуацию — рядом стоит услуга, которая её закрывает. Фиксация нарушений это только одно из направлений.')} />
            <ServiceCases onOpen={navigate} compact />
          </Deferred>
        ) : route === 'directions' ? (
          <Deferred minHeight={600}>
            <PageHead onHome={goHome} tag={tr('Что мы делаем')} title={tr('Услуги и направления деятельности')}
              lead={tr('Компания закрывает не одну задачу, а весь контур: фиксация нарушений, видеоаналитика, городские платформы, связь, взимание платы за проезд, мониторинг с БПЛА и локализация производства.')} />
            <Directions onOpenCard={(id) => openCard('directions', id)} />
          </Deferred>
        ) : route === 'portfolio' ? (
          <Deferred minHeight={600}>
            <PageHead onHome={goHome} tag={tr('Продуктовая линейка')} title={tr('Продукты компании')}
              lead={tr('Собственная разработка — от библиотеки распознавания номеров до городских платформ данных. Нажмите на карточку, чтобы посмотреть состав продукта.')} />
            <Portfolio onOpen={openProduct} bare />
          </Deferred>
        ) : route === 'catalog' ? (
          <Deferred minHeight={600}>
            <Catalog onOpenProduct={setSelectedProduct} category={catalogCategory} onCategoryChange={setCatalogCategory} />
          </Deferred>
        ) : route === 'workflow' ? (
          <Deferred minHeight={600}><Workflow /></Deferred>
        ) : route === 'projects' ? (
          <Deferred minHeight={600}><div className="dark"><Projects /></div></Deferred>
        ) : route === 'team' ? (
          <Deferred minHeight={600}>
            <PageHead onHome={goHome} tag={tr('Команда')} title={tr('Компетенции команды')}
              lead={tr('Все ключевые компетенции собраны в едином контуре ответственности. Нажмите на карточку — откроется подробное описание.')} />
            <Team onOpenCard={openCard} />
          </Deferred>
        ) : route === 'faq' ? (
          <Deferred minHeight={600}><FAQ onContact={goContact} /></Deferred>
        ) : (
          <>
            <HeroSlider onNavigate={navigate} />
            <ProductRail onOpenDevice={openDevice} onOpenProduct={openProduct} onNavigate={navigate} />
            <LazyMount minHeight={900}>
              <HomeSections onNavigate={navigate} />
              <Contact />
            </LazyMount>
          </>
        )}
      </main>

      <LazyMount minHeight={320} rootMargin="600px 0px">
        <Footer onNavigate={navigate} onSection={goSection} onOpenDevice={openDevice} onHome={goHome} />
      </LazyMount>
      {chatReady ? <Deferred><ChatWidget /></Deferred> : null}
      {modalUsed ? (
        <Deferred><ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onContact={goContact} /></Deferred>
      ) : null}
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
