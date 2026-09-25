import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Сведения из контента, которые нужны при сборке:
//  • отпечаток контента — сайт пришлёт его серверу, и если контент не менялся
//    после сборки, сервер ответит «всё актуально» вместо 550 КБ текстов;
//  • размытое превью первого баннера — для заставки, которую видно ещё до
//    загрузки скриптов.
async function buildFacts() {
  try {
    const load = (file) => import(pathToFileURL(path.resolve(file)).href);
    const { SiteDataFile } = await load('server/siteDataFile.js');
    const { contentHash } = await load('server/compress.js');
    const content = await new SiteDataFile(path.resolve('apps/site/src/app/data/siteData.js')).read();
    const images = JSON.parse(readFileSync(path.resolve('apps/site/src/app/data/images.json'), 'utf8'));
    const first = (content.HERO_SLIDES || []).find((s) => s && s.image);
    const info = first ? images[first.image] : null;
    return { hash: contentHash(content), shellBg: info && info.q ? info.q : '' };
  } catch (error) {
    console.warn('[olan] Отпечаток контента не посчитан, сайт будет скачивать контент всегда:', error.message);
    return { hash: '', shellBg: '' };
  }
}

function olanShell(shellBg) {
  return {
    name: 'olan-shell',
    transformIndexHtml(html) {
      return html.replace('__OLAN_SHELL_BG__', shellBg ? `url(${shellBg})` : 'none');
    },
  };
}

// Основной сайт. Запуск: npm run site
// Все три приложения используют один общий node_modules в корне проекта.
export default defineConfig(async ({ mode }) => {
  const facts = await buildFacts();
  const env = loadEnv(mode, process.cwd(), '');

  // По умолчанию слушаем только localhost — тогда в терминале выводится
  // одна-единственная рабочая ссылка, без списка сетевых адресов.
  // Нужен доступ с телефона? Впишите в .env свой IP:
  //   VITE_HOST=192.168.1.65
  const host = env.VITE_HOST || 'localhost';

  return {
    root: 'apps/site',
    envDir: '../../',
    plugins: [react(), tailwindcss(), olanShell(facts.shellBg)],
    define: { __OLAN_CONTENT_HASH__: JSON.stringify(facts.hash) },
    server: { host, port: 5173, strictPort: false, allowedHosts: true },
    preview: { host, port: 5173, allowedHosts: true },
    // Заранее готовим тяжёлые пакеты — иначе первый запуск dev-сервера
    // тратит время на их разбор прямо во время открытия страницы.
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'lucide-react', 'motion/react'],
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      // Библиотеки отдельным файлом: браузер закеширует их один раз
      // и не будет перекачивать при каждом обновлении сайта.
      rollupOptions: {
        output: {
          manualChunks(id) {
            // React целиком (включая jsx-runtime) — в один файл, анимации —
            // в другой: так стартовая страница не тянет библиотеку анимаций.
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
            if (/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion';
            return undefined;
          },
        },
      },
    },
  };
});
