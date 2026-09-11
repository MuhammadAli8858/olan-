import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Кабинет менеджера и оператора. Запуск: npm run operator
// Все три приложения используют один общий node_modules в корне проекта.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // По умолчанию слушаем только localhost — тогда в терминале выводится
  // одна-единственная рабочая ссылка, без списка сетевых адресов.
  // Нужен доступ с телефона? Впишите в .env свой IP:
  //   VITE_HOST=192.168.1.65
  const host = env.VITE_HOST || 'localhost';

  return {
    root: 'apps/operator',
    envDir: '../../',
    plugins: [react(), tailwindcss()],
    server: { host, port: 9090, strictPort: false, allowedHosts: true },
    preview: { host, port: 9090, allowedHosts: true },
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
          manualChunks: {
            react: ['react', 'react-dom'],
            motion: ['motion/react'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  };
});
