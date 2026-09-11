// Раздача собранных фронтендов (npm run build) прямо этим же сервером.
// Нужна только для продакшена: один процесс отдаёт сайт, админку и оператора.
//
//   http://ваш-домен/           → apps/site/dist
//   http://ваш-домен/admin/     → apps/admin/dist
//   http://ваш-домен/operator/  → apps/operator/dist
//
// В режиме разработки этим занимается Vite, и раздача просто не включается.

import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
};

export function createStaticHandler(rootDir) {
  const mounts = [
    { prefix: '/admin', dir: path.join(rootDir, 'apps', 'admin', 'dist') },
    { prefix: '/operator', dir: path.join(rootDir, 'apps', 'operator', 'dist') },
    { prefix: '/', dir: path.join(rootDir, 'apps', 'site', 'dist') },
  ].filter((m) => existsSync(m.dir));

  if (mounts.length === 0) return null;

  function send(response, filePath, status = 200) {
    const ext = path.extname(filePath).toLowerCase();
    const immutable = filePath.includes(`${path.sep}assets${path.sep}`);
    response.writeHead(status, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    createReadStream(filePath).pipe(response);
  }

  return function handleStatic(request, response, pathname) {
    const mount = mounts.find((m) => m.prefix === '/' || pathname === m.prefix || pathname.startsWith(`${m.prefix}/`));
    if (!mount) return false;

    let rel;
    try {
      rel = decodeURIComponent(mount.prefix === '/' ? pathname : pathname.slice(mount.prefix.length));
    } catch {
      response.writeHead(400).end();
      return true;
    }
    rel = rel.replace(/^\/+/, '');

    // Защита: никаких выходов вверх по дереву и байтов \0 в пути.
    if (rel.includes('\0') || rel.split(/[/\\]/).includes('..')) {
      response.writeHead(403).end();
      return true;
    }

    const target = path.normalize(path.join(mount.dir, rel));
    if (target !== mount.dir && !target.startsWith(mount.dir + path.sep)) {
      response.writeHead(403).end();
      return true;
    }

    if (existsSync(target) && statSync(target).isFile()) { send(response, target); return true; }

    // Запрос конкретного файла (есть расширение), которого нет — честная 404,
    // а не index.html. Иначе битые картинки и скрипты выглядят как «страница».
    if (path.extname(rel)) return false;

    // SPA: маршруты без расширения отдаём как index.html
    const indexFile = path.join(mount.dir, 'index.html');
    if (existsSync(indexFile)) { send(response, indexFile); return true; }
    return false;
  };
}

export { MIME };
