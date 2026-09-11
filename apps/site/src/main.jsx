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
