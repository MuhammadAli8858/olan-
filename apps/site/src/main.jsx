import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import { loadContent } from './app/data/contentStore.js';
import './styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

const root = createRoot(rootElement);

function render() {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Рисуем сайт СРАЗУ, со встроенным контентом из siteData.js.
// Раньше рендер ждал ответа сервера, и пока сервер не отвечал,
// страница оставалась белой. Теперь ожидания нет.
render();

// Затем подтягиваем контент с сервера (то, что задано в админ-панели)
// и перерисовываем, если он отличается.
loadContent()
  .then((changed) => { if (changed) render(); })
  .catch(() => { /* сервер недоступен — остаётся встроенный контент */ });

// Офлайн-кеш: повторный визит открывается мгновенно и даже без связи.
// Только в собранной версии и только там, где браузер его поддерживает.
const isProduction = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;
if (isProduction && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        const urls = ['/', ...performance.getEntriesByType('resource').map((entry) => entry.name)];
        if (registration.active) registration.active.postMessage({ type: 'warm', urls });
      })
      .catch(() => {});
  });
}

// Если после обновления сайта в браузере осталась старая страница и она
// просит уже удалённый файл — один раз перезагружаемся на свежую версию.
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    try {
      if (sessionStorage.getItem('olan-reloaded')) return;
      sessionStorage.setItem('olan-reloaded', '1');
    } catch { /* без sessionStorage просто перезагружаемся */ }
    if (event && event.preventDefault) event.preventDefault();
    window.location.reload();
  });
}
